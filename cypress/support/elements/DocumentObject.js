class DocumentObject{
    getTextArea(){
        return cy.getAppIframe().find('#text')
    }
    getImportButton(){
        return cy.getAppIframe().find('[data-test=import-button]')
    }
    getNewButton(){
        return cy.getAppIframe().find('#buttons button').contains('New')
    }
    getSaveButton(){
        return cy.getAppIframe().find('#buttons button').contains('Save')
    }
    getOpenButton(){
        return cy.getAppIframe().find('#buttons button').contains('Open')
    }
}
export default DocumentObject;