class DocumentObject{
    getTextArea(){
        return cy.getAppIframe().find('#text')
    }
    getImportButton(){
        return '[data-test=import-button]'
    }
    getNewButton(){
        return cy.getAppIframe().find('#buttons button').contains('New')
    }
    getSaveButton(){
        return cy.getAppIframe().find('#buttons button').contains(/^Save/)
    }
    getSaveAsButton(){
        return cy.getAppIframe().find('#buttons button').contains('Save As')
    }
    getExportButton(){
        return cy.getAppIframe().find('#buttons button').contains('Export')
    }
    getOpenButton(){
        return cy.getAppIframe().find('#buttons button').contains('Open')
    }
    getOpenLocalFileButton(){
        return '[data-test="open-local-button"]'
    }
}
export default DocumentObject