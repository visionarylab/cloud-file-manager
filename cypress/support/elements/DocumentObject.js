class DocumentObject{
    getTextArea(){
        return cy.getAppIframe().find('#text')
    }
}
export default DocumentObject;