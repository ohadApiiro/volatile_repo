package com.dchealth.service.rare;

import com.dchealth.VO.*;
import com.dchealth.entity.common.YunDictitem;
import com.dchealth.entity.common.YunUsers;
import com.dchealth.entity.rare.*;
import com.dchealth.facade.common.BaseFacade;
import com.dchealth.util.JSONUtil;
import com.dchealth.util.StringUtils;
import com.dchealth.util.UserUtils;
import com.amazonaws.services.s3;
import org.codehaus.jettison.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import java.sql.Timestamp;
import java.util.*;

import ExampleCostsClass;


/**
 * Created by Administrator on 2017/6/21.
 */
@Controller
@Produces("application/json")
@Path("template")
public class TemplateService {

    @Autowired
    private BaseFacade baseFacade ;


    /**
     * 获取工作流列表
     * @param dcode
     * @param doctorId
     * @param title
     * @param mblx
     * @return
     */
    @GET
    @Path("list")
    public List<YunDisTemplet> getDisTemplate(@QueryParam("dcode") String dcode,@QueryParam("doctorId") String doctorId,
                                              @QueryParam("title")String title,@QueryParam("mblx")String mblx,
                                              @QueryParam("deptId")String deptId,
                                              @QueryParam("pubFlag") String pubFlag) throws Exception {
        String hql = "from YunDisTemplet as t where 1=1 and mblx<>'WORK'" ;
        //所属疾病
        if(!"".equals(dcode)&&dcode!=null){
            hql+=" and t.dcode='"+dcode+"'" ;
        }
        //标题
        if(!"".equals(title)&&title!=null){
            hql+=" and t.title='"+title+"'" ;
        }
        //模板类型
        if(!"".equals(mblx)&&mblx!=null){
            hql+=" and t.mblx='"+mblx+"'" ;
        }


        if("".equals(pubFlag)||pubFlag==null){
            throw  new Exception("缺少pubFlag，公共私有数据标识。0表示私有数据，1表示公共数据");
        }

        if("1".equals(pubFlag)){
            hql += " and t.doctorId='0'" ;
        }

        if("0".equals(pubFlag)){
            if(doctorId==null||"".equals(doctorId)){
                throw  new Exception("缺少doctorId，用户标识");
            }
//            if(deptId==null||"".equals(deptId)){
//                throw  new Exception("缺少deptId，科室标识");
//            }
            hql+=" and t.doctorId='"+doctorId+"' " ;//or (t.deptId='"+deptId+"' and t.deptId <>'0') 只能看自己的，同一科室的也看不到
        }

        List<YunDisTemplet> yunDisTemplets = baseFacade.createQuery(YunDisTemplet.class, hql, new ArrayList<Object>()).getResultList();
        return yunDisTemplets;
    }


    /**
     * 添加或者修改表单模板
     * @param yunDisTemplet
     * @return
     */
    @POST
    @Path("merge")
    @Transactional
    public Response mergeYunDisTemplate(YunDisTemplet yunDisTemplet) throws Exception{
        if(yunDisTemplet.getId()!=null && !"".equals(yunDisTemplet.getId())){//修改表单模板 则将关联的病例数据进行更新
            String hql = " from YunDisTemplet where id = '"+yunDisTemplet.getId()+"'";
            List<YunDisTemplet> yunDisTempletList = baseFacade.createQuery(YunDisTemplet.class,hql,new ArrayList<Object>()).getResultList();
            if(yunDisTempletList!=null && !yunDisTempletList.isEmpty()){
                YunDisTemplet yunDisTempletQ = yunDisTempletList.get(0);
                if(yunDisTempletQ.getTitle()!=null && !yunDisTempletQ.getTitle().equals(yunDisTemplet.getTitle())){
                    String folderHql = "select d from YunRecordDocment as d,YunFolder as f,YunPatient as p where d.folderId = f.id" +
                            " and f.patientId = p.id and d.category = 'W' and f.diagnosisCode = '"+yunDisTemplet.getDcode()+"'" +
                            " and p.doctorId = '"+yunDisTemplet.getDoctorId()+"'";
                    List<YunRecordDocment> yunRecordDocmentList = baseFacade.createQuery(YunRecordDocment.class,folderHql,new ArrayList<Object>()).getResultList();
                    //changeRecordDocmentContent(yunRecordDocmentList,yunDisTempletQ,yunDisTemplet);
                }
            }
        }
        YunDisTemplet merge = baseFacade.merge(yunDisTemplet);
        return Response.status(Response.Status.OK).entity(merge).build();
    }

    public void changeRecordDocmentContent(List<YunRecordDocment> yunRecordDocmentList,YunDisTemplet dbtemplet,YunDisTemplet cmttemplet) throws Exception{
        if(yunRecordDocmentList!=null && !yunRecordDocmentList.isEmpty()){
            for(int i=0;i<yunRecordDocmentList.size();i++){
                YunRecordDocment yunRecordDocment = yunRecordDocmentList.get(i);
                DocumentData documentData = (DocumentData)JSONUtil.JSONToObj(yunRecordDocment.getContent(),DocumentData.class);
                List<DocumentDataElement> documentDataElements = documentData.getData();
                for(int k=0;k<documentDataElements.size();k++){
                    DocumentDataElement documentDataElement =  documentDataElements.get(k);
                    if(documentDataElement.getName()!=null && documentDataElement.getName().equals(dbtemplet.getTitle())){
                        documentDataElement.setName(cmttemplet.getTitle());
                    }
                }
                documentData.setData(documentDataElements);
                yunRecordDocment.setContent(JSONUtil.objectToJsonString(documentData));
                baseFacade.merge(yunRecordDocment);
            }
        }
    }
    /**
     * 删除模板
     * @param templateId
     * @return
     */
    @POST
    @Path("test_aws")
    @Transactional
    public Response aws_testTemplate(@QueryParam("templateId") String templateId){
        client.copyObject();
        client.getBucketAcl();
        s3.listObjects("Bucket1");
        return Response.status(Response.Status.OK);
    }

    @POST
    @Path("test_aws_caller")
    @Transactional
    public Response aws_test_caller(@QueryParam("templateId") String templateId){
        String name = "Bucket2";
        NewService.aws_test_other_callee(name);
        return NewService.aws_test_callee();
    }

    @POST
    @Path("test_aws_caller_of_two")
    @Transactional
    public Response aws_test_caller_of_two(@QueryParam("templateId") String templateId){
        NewService.aws_test_other_callee();
        return NewService.aws_test_callee();
    }


    /**
     * 删除模板
     * @param templateId
     * @return
     */
    @POST
    @Path("new_test")
    @Transactional
    public Response new_testTemplate(@QueryParam("templateId") String templateId){
        YunDisTemplet templet = baseFacade.get(YunDisTemplet.class, templateId);
        baseFacade.remove(templet);
        return Response.status(Response.Status.OK).entity(templet).build();
    }

    @POST
    @Path("/example/{username}")
    @Transactional
    public Response new_jaxWithParamTemplate(@QueryParam("templateId") String templateId){
        YunDisTemplet templet = baseFacade.get(YunDisTemplet.class, templateId);
        baseFacade.remove(templet);
        return Response.status(Response.Status.OK).entity(templet).build();
    }


    @GET
    @Path(ExampleCostsClass.PATH1)
    @Transactional
    public Response pathFromClassConst(@QueryParam("templateId") String templateId){
        YunDisTemplet templet = baseFacade.get(YunDisTemplet.class, templateId);
        baseFacade.remove(templet);
        return Response.status(Response.Status.OK).entity(templet).build();
    }

}