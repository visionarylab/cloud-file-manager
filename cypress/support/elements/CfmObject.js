class CfmObject{
    //header
    getCFMMenu(){
        return cy.get('.cfm-menu.menu-anchor')
    }
    getDocumentTitle(){
        return cy.get('.menu-bar-content-filename')
    }
    getVersionNumber(){
        return cy.get('.menu-bar-info')
    }
    getHelpIcon(){
        return cy.get('.menu-bar-right .icon-help')
    }
    getLanguageDropDown(){
        return cy.get('.lang-menu')
    }

    //File menu 
    openCFMMenu(){
        this.getCFMMenu().click();
    }
    getCFMMenuPanel(state){
        return cy.get('.cfm-menu.menu-'+state)
    }
    selectCFMMenuItem(item){ //['New','Open ...','Import data...','Close','Revert to...', 'Save']
        cy.get('.cfm-menu .menuItem').contains(item).click();
    }
    openDocFromFileMenu(){
        this.openCFMMenu();
        this.selectCFMMenuItem('Open ...');
    }
    closeDocFromFileMenu(){
        this.openCFMMenu();
        this.selectCFMMenuItem('Close')
    }
    closeConfirmDialogMessage(){
        cy.get('.confirm-dialog button').contains('Yes').click();
    }

    //What would you like to do? modal
    getOpenDocButton(){
        return cy.get('button').contains("Open Document");
    }
    getCreateNewDocButton(){
        return cy.get('button').contains("Create New Document");
    }
    createNewDocument(){
        this.getCreateNewDocButton().click();
    }
    openDocFromModal(){
        this.getOpenDocButton().click();
    }

    // Open modal
    getOpenExampleTab(){
        return cy.get('.workspace-tabs').contains('Example Documents')
    }
    getGoogleDocTab(){
        return cy.get('.workspace-tabs').contains('Google Drive')
    }
    getLocalFileTab(){
        return cy.get('.workspace-tabs').contains('Local File')
    }
    getLocalStorageTab(){
        return cy.get('.workspace-tabs').contains('Local Storage')
    }
    getReadOnlyTab(){
        return cy.get('.workspace-tabs').contains('Read Only')
    }
    getFileSelectionDropArea(){
        return ('.dropArea > input');
    }
    openExampleDoc(document){
        this.getOpenExampleTab().click();
        cy.get('.filelist .selectable').contains(document).click();
        this.getOpenDialogOpenButton();
    }
    getOpenDialogOpenButton(){
        //('.buttons button').contains('Open') yields an array of buttons from all the tabs that remains visible to the DOM 
        //even though it has been styled display: none, so had to use xpath to select the one that is actionable
        cy.xpath('//div[@class="workspace-tab-component"]/div[contains(@style,"display: block")]/div/div[@class="buttons"]/button[contains(text(),"Open")]').click();
    }
    openGoogleDriveDoc(filename){
        this.getGoogleDocTab().click();
        cy.wait(2000)
        cy.get('.filelist .selectable').contains(filename).click({force:true});
        this.getOpenDialogOpenButton();
    }    
    openLocalDoc(filename){
        this.getLocalFileTab().click();
        cy.uploadFile(this.getFileSelectionDropArea(), filename, 'application/json');
        cy.get(this.getFileSelectionDropArea())
            .trigger('drop')
        cy.wait(3000)
    }
    openLocalStorageDoc(filename){
        this.getLocalStorageTab().click();
        cy.get('.filelist .selectable').contains(filename).click({force:true});
        this.getOpenDialogOpenButton();
    }

    //Save Modal
    getDocumentSaveFilenameField(){
        return cy.get('.dialogTab input')
    }
    getSaveButton(){
        return cy.get('.dialogTab button').contains('Save')
    }
    saveToGoogleDrive(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save');
        this.getGoogleDocTab().click()
    }
    saveToLocalDrive(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save');
        this.getLocalFileTab().click();
        cy.get('.modal-dialog-workspace .dialogTab.localFileSave input').click().clear().type(filename);
        cy.get('.buttons a').contains('Download').click();
    }
    saveToLocalStorage(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save')
        this.getLocalStorageTab().click();
        this.getSaveButton().click()
    }

    //Google Drive - not sure yet how to do this. Once I logged in manually in cypress runner, it never asked to be logged in again
    loginToGoogle(user){
        cy.get('.button').contains('Login to Google').click();

    }
}
export default CfmObject;