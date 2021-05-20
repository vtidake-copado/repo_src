public class VFFileUpload
{
    public Id recId
    {    get;set;    }
    
    public VFFileUpload(ApexPages.StandardController ctlr)
    {
       recId = ctlr.getRecord().Id;     
    }
    
    public string fileName 
    {    get;set;    }
    
    public Blob fileBody 
    {    get;set;    }
  
    public PageReference UploadFile()
    {
        PageReference pr;
        if(fileBody != null && fileName != null)
        {
          Attachment myAttachment  = new Attachment();
          myAttachment.Body = fileBody;
          myAttachment.Name = fileName;
          myAttachment.ParentId = recId;
          insert myAttachment;
           pr = new PageReference('/' + myAttachment.Id);
           pr.setRedirect(true);
           return pr;
        }
        return null;
    }    
}