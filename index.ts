import {Context, Probot} from 'probot'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import {fortyFiveMinutesInMilliseconds, getScanResults, ScanResult, triggerPrScan} from "./scan"
import {Etcd3} from 'etcd3'
import {WebhookEvent} from '@octokit/webhooks'
import {TTLCache} from '@brokerloop/ttlcache'
import {Router, Response} from 'express'

axiosRetry(axios, {retries: 3, retryDelay: axiosRetry.exponentialDelay})
export = (app: Probot, {getRouter}: { getRouter: (path?: string) => Router }) => {
    const router: Router = getRouter()
    router.get('/healthcheck', (_, response: Response) => {
        response.status(200).send("OK")
    })
    app.onAny(pipeAllWebhooks)
    app.on(["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"], handlePullRequest)
    const apiiroDefaultUrl = process.env.APIIRO_URL || ""
    const apiiroDefaultToken = process.env.APIIRO_TOKEN || ""
    const etcdUrl = process.env.ETCD_URL || "localhost"
    const etcdUser = process.env.ETCD_USERNAME || "root"
    const etcdPassword = process.env.ETCD_PASSWORD || ""
    const etcdClient = new Etcd3({hosts: etcdUrl, auth: {username: etcdUser, password: etcdPassword}})

    const installationConfigurationCache = new TTLCache<string, object>({
        ttl: 1000 * 60 * 60 * 24, // 24 hours
        max: Infinity,
        clock: Date
    });

    async function handlePullRequest(context: Context) {
        const repositoryName = context.repo().repo
        let checkRunId = 0
        try {
            app.log(`Got a new PR from repository ${repositoryName}`)
            const pullRequestEvent = context.payload || ""
            const headSha = pullRequestEvent.pull_request.head.sha
            const baselineSha = pullRequestEvent.pull_request.base.sha
            const pullRequestId = context.pullRequest().pull_number
            const {apiiroUrl, apiiroToken} = await getInstallationConfigurationById(pullRequestEvent.installation.id)

            if (!apiiroUrl || !apiiroToken) {
                return
            }

            const checkRun = await context.octokit.checks.create(context.repo({
                name: "Apiiro",
                head_sha: headSha,
                status: "in_progress"
            }))
            checkRunId = checkRun.data.id

            const repositoryKey = await getRepositoryKey(apiiroUrl, repositoryName, apiiroToken, 'github')
            const compare = await context.octokit.repos.compareCommits(context.repo({
                    base: baselineSha,
                    head: headSha
                }
            ))
            const mergeBase = compare.data.merge_base_commit.sha
            await triggerPrScan(apiiroUrl,
                repositoryKey,
                pullRequestEvent.pull_request.head.ref,
                pullRequestEvent.pull_request.head.sha,
                pullRequestEvent.pull_request.base.ref,
                mergeBase,
                pullRequestId,
                pullRequestEvent.pull_request.title,
                apiiroToken)

            const startTime = new Date().getTime()
            let scanResults: ScanResult = {scanFinished: false}
            while (!scanResults.scanFinished) {
                if (new Date().getTime() - startTime > fortyFiveMinutesInMilliseconds) {
                    await context.octokit.checks.update(context.repo({
                        check_run_id: checkRunId,
                        conclusion: "failure",
                    }))
                    app.log.error(
                        `PR scan is taking more than 45 minutes, returning (pr id ${pullRequestId}, repository ${repositoryKey})`
                    )
                    return
                }
                await delay(30000)
                scanResults = await getScanResults(apiiroUrl, repositoryKey, pullRequestId.toString(), apiiroToken)
            }
            app.log(`PR scan ${pullRequestId} of repository ${repositoryName} has just finished`)
            if (scanResults.commentContent) {
                if (await alreadyHasSameComment(scanResults.commentContent, context)) { // Currently broken
                    app.log(`PR ${pullRequestId} of repository ${repositoryName} was re-scanned without new results. Skipping comment`)
                } else {
                    app.log(`Adding a comment on PR ${context.pullRequest().pull_number} in repository ${repositoryName}`)
                    const comment = context.issue({body: scanResults.commentContent})
                    await context.octokit.issues.createComment(comment)
                }
            }

            if (scanResults.assignees && scanResults.assignees.length > 0) {
                app.log(`Assigning ${scanResults.assignees} to PR ${context.pullRequest().pull_number} in repository ${repositoryName}`)
                const issue = context.issue({assignees: scanResults.assignees})
                await context.octokit.issues.addAssignees(issue)
            }

            await context.octokit.checks.update(context.repo({
                check_run_id: checkRunId,
                conclusion: "success",
            }))
        } catch (exception) {
            app.log.error(`Failed scanning pull request ${context.pullRequest().pull_number} in repository ${repositoryName}, exception:\n${exception.stack}`)
            try {
                if (checkRunId > 0) {
                    await context.octokit.checks.update(context.repo({
                        check_run_id: checkRunId,
                        conclusion: "failure",
                    }))
                }
            } catch {
            }
        }
    }

    async function pipeAllWebhooks(context: WebhookEvent<any>) {
        try {
            app.log(`Got a new webhook event of type ${context.name}`)
            const {apiiroUrl, apiiroToken} = await getInstallationConfigurationById(context.payload.installation.id);

            if (!apiiroUrl || !apiiroToken) {
                return
            }

            const webhookUrl = `${apiiroUrl}/api/webhooks/github`
            app.log(`Sending the webhook to ${webhookUrl}, of event ${context.name}`)

            const response = await axios.post(
                webhookUrl,
                context.payload,
                {
                  headers:
                  {
                    Authorization: apiiroToken,
                    "X-Github-Event": context.name
                  }
                }
              ).catch(error => {
                  if (!error.response) {
                      app.log.error(`Something has gone seriously wrong, the response is undefined or empty. Error message:\n${error.message}.\nCall stack:\n${error.stack}`)
                  }
                  else if (error.response.status === 400) {
                    app.log(`We received a bad response (code: ${error.response.status}) from webhook event of type ${context.name}, response data:\n${JSON.stringify(error.response.data)}`)
                  }
                  else {
                    app.log.error(`Error: Unexpected response status: ${error.response.status} from webhook event of type ${context.name}, response data:\n${JSON.stringify(error.response.data)}`)
                  }
              }
            )

            if (response) {
                app.log(`We received a response (code: ${response.status}) from webhook event of type ${context.name}, response:\n${JSON.stringify(response.data)}`);
            }
        }
        catch(exception) {
            app.log.error(`Failed to pipe webhook of type ${context.name}, exception:\n${exception.stack}`)
        }
    }

    async function getInstallationConfigurationById(installationId: string): Promise<InstallationConfiguration> {
        let installationParams = null
        try {
            if (!installationConfigurationCache.has(installationId)) {
                app.log(`fetching etcd key ${JSON.stringify(installationId)}`)
                installationParams = <InstallationConfiguration>await etcdClient.get(installationId).json()
                if (!installationParams.apiiroUrl) {
                    app.log("Could not fetch apiiroUrl for installation", installationId)
                }
                installationConfigurationCache.set(installationId, {
                    apiiroUrl: installationParams?.apiiroUrl ?? apiiroDefaultUrl,
                    apiiroToken: installationParams?.apiiroToken ?? apiiroDefaultToken
                })
            }
        } catch (exception) {
            app.log(`Failed reading etcd, ${exception}`)
            return {} as InstallationConfiguration
        }

        return installationConfigurationCache.get(installationId) as InstallationConfiguration
    }

    async function alreadyHasSameComment(commentContent: string, context: Context) {
        const commentUniquePart = getCommentMaterialChangesPortion(commentContent)
        const comments = await context.octokit.issues.listComments(context.issue())
        return comments.data.some(comment => {
            return getCommentMaterialChangesPortion(comment.body ?? "") === commentUniquePart;
        })
    }

    const commentSeparator = "View in Apiiro"

    function getCommentMaterialChangesPortion(comment: string) {
        return comment.split(commentSeparator)[0]
    }
}

async function getRepositoryKey(
    apiiroUrl: string,
    repositoryName: string,
    jwtToken: string,
    provider: string
): Promise<string> {
    const response = await axios.get(
        `${apiiroUrl}/api/pullRequestScans/repositoryKey?provider=${provider}&repositoryName=${repositoryName}`,
        {headers: {Authorization: jwtToken}}
    )
    if (response.status !== 200) {
        throw new Error(
            `couldn't get repository key for repository name '${repositoryName}'. Got staus code ${response.status} as result`
        )
    }

    return response.data
}

const delay = function (ms: number) {
    return new Promise(function (res) {
        return setTimeout(res, ms)
    })
}

interface InstallationConfiguration {
    apiiroUrl: string
    apiiroToken: string
}