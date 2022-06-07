package test

import akka.http.scaladsl.server.Route

trait employeesController {
    lazy val employeeRoutes: Route = pathPrefix("employee") {
        get {
            path(Segment) { id =>
                onComplete(getEmployeeById(id)) {
                    _ match {
                        case Success(employee) =>  complete(StatusCodes.OK, employee)
                        case Failure(throwable) => complete(StatusCodes.InternalServerError, "Failed to get the employee.")
                    }
                }
            }
        } ~ post {
            path("query") {
                entity(as[QueryEmployee]) { q =>
                    onComplete(queryEmployee(q.id, q.firstName, q.lastName)) {
                        _ match {
                            case Success(employees) => complete(StatusCodes.OK, employees)
                            case Failure(throwable) => complete(StatusCodes.InternalServerError, "Failed to query the employees.")
                        }
                    }
                }
            }
        }
    }
}

trait apis {
    lazy val apiRoutes: Route = pathPrefix("api") {
        employeeRoutes
    }
}

trait creditcardPayments {
    lazy val balance: Route = pathPrefix("api") {
        employeeCreditcardPayments
    }
}

trait creditCardCvc {
    lazy val cvc: Route = pathPrefix("api") {
        employeeCreditcardPayments
    }
}

trait Account {
    lazy val balance = 1000
}

trait cvc {
    lazy val cvc = 123456789
}

trait shmig {
    lazy val shmig = 11122333
}