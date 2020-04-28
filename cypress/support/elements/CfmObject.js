class CfmObject{
    //header
    getCFMMenu(){
        return cy.get('.cfm-menu.menu-anchor')
    }
    getDocumentTitle(){
        return cy.get('.menu-bar-content-filename')
    }
    getFileStatusInfo(){
        return cy.get('.menu-bar-file-status-info')
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
    selectCFMMenuItem(item){ 
        //['New','Open ...','Import data...','Close','Revert to...', 'Save','Share...']
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

    //Modal Tabs
    getTab(tab){['Example Documents','Google Drive','Local Storage','Local File','URL', 'Read Only']
        return cy.get('.workspace-tabs').contains(tab)
    }


    // Open modal
    getFileSelectionDropArea(){
        return ('.dropArea > input');
    }
    openExampleDoc(document){
        this.getTab('Example Documents').click();
        cy.get('.filelist .selectable').contains(document).click();
        this.getOpenDialogOpenButton();
    }
    openReadOnlyDoc(document){
        this.getTab('Read Only').click();
        cy.get('.filelist .selectable').contains(document).click();
        this.getOpenDialogOpenButton();
    }
    getOpenDialogOpenButton(){
        //('.buttons button').contains('Open') yields an array of buttons from all the tabs that remains visible to the DOM 
        //even though it has been styled display: none, so had to use xpath to select the one that is actionable
        cy.xpath('//div[@class="workspace-tab-component"]/div[contains(@style,"display: block")]/div/div[@class="buttons"]/button[contains(text(),"Open")]').click();
    }
    openGoogleDriveDoc(filename){
        this.getTab('Google Drive').click();
        cy.wait(2000)
        cy.get('.filelist .selectable').contains(filename).click({force:true});
        this.getOpenDialogOpenButton();
    }    
    openLocalDoc(filename,type=''){
        this.getTab('Local File').click();
        cy.uploadFile(this.getFileSelectionDropArea(), filename, type);
        cy.get(this.getFileSelectionDropArea())
            .trigger('drop')
        cy.wait(3000)
    }
    openLocalStorageDoc(filename){
        this.getTab('Local Storage').click();
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
    getCancelButton(){
        return cy.get('.dialogTab button').contains('Cancel')
    }
    saveToGoogleDrive(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save');
        this.getTab('Google Drive').click()
        this.getSaveButton().click()
    }
    saveToLocalDrive(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save');
        this.getTab('Local File').click();
        cy.get('.modal-dialog-workspace .dialogTab.localFileSave input').click().clear().type(filename);
        cy.get('.buttons a').contains('Download').click();
    }
    saveToLocalStorage(filename){
        this.openCFMMenu();
        this.selectCFMMenuItem('Save')
        this.getTab('Local Storage').click();
        cy.get('.modal-dialog-workspace .dialogTab input').first().click().clear().type(filename);
        this.getSaveButton().click()
    }

    //import modal
    importFromLocal(filename,type=''){
        this.openCFMMenu();
        this.selectCFMMenuItem('Import data...')
        this.getTab('Local File').click();
        cy.uploadFile(this.getFileSelectionDropArea(), filename, type);
        cy.get(this.getFileSelectionDropArea())
            .trigger('drop')
        cy.wait(3000)
    }
    importFromURL(url){
        this.openCFMMenu();
        this.selectCFMMenuItem('Import data...')
        this.getTab('URL').click();
        cy.get('.urlImport input').clear().type(url)
        cy.get('.urlImport button').contains('Import').click()
    }

    //share modal
    getShareStatus(){
        return cy.get('.share-dialog .share-status strong').text()
    }
    getShareButton(text){//['Enable Sharing','Update shared view']
        return cy.get('.share-dialog button').contains(text)
    }
    getCloseButton(){
        return cy.get('.share-dialog button').contains('Close')
    }
    getUnshareLink(){
        return cy.get('.share-dialog  .share-status a')
    }
    getPreviewLink(){
        return cy.get('.share-button-help-sharing a')
    }
    getShareTabs(tab){ //["Link","Embed"]
        return cy.get('.share-dialog .sharing-tabs').contains(tab)
    }
    getShareLink(){
        return cy.get('.share-dialog .sharing-tab-contents input')
    }
    getCopyLink(){
        return cy.get('.share-dialog .sharing-tab-contents .copy-link')
    }
    getEmbedText(){
        return cy.get('.share-dialog .sharing-tab-contents textarea')
    }
    getSocialIcons(){
        return cy.get('.share-dialog .sharing-tab-contents .social-icon')
    }
    shareDocument(){
        this.openCFMMenu();
        this.selectCFMMenuItem('Share')
        this.selectCFMMenuItem('Get link to shared view')
        this.getSharingButton().click();
    }


    //Rename modal
    getRenameInputTextField(){
        return cy.get('.rename-dialog input');
    }
    getRenameButton(){
        return cy.get('.rename-dialog button').contains('Rename')
    }

    //Google Drive - not sure yet how to do this. It opens a new popup window
    //Once I logged in manually in cypress runner, it never asked to be logged in again
    loginToGoogle(user){
        //https://accounts.google.com/signin/oauth/identifier
        // ?response_type=permission%20id_token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.install%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&openid.realm
        //&redirect_uri=storagerelay%3A%2F%2Fhttp%2Flocalhost%3A8080%3Fid%3Dauth382299&client_id=1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com
        //&ss_domain=http%3A%2F%2Flocalhost%3A8080&gsiwebsdk=shim&o2v=1&as=YqVf37GwUvUNK1LOLRAmYA&flowName=GeneralOAuthFlow
        //https://accounts.google.com/signin/oauth/identifier?response_type=permission%20id_token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.install%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&openid.realm&redirect_uri=storagerelay%3A%2F%2Fhttp%2Fconcord-consortium.github.io%3Fid%3Dauth892717&client_id=1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com&ss_domain=http%3A%2F%2Fconcord-consortium.github.io&gsiwebsdk=shim&o2v=1&as=RsVkg4YHV_NwB2SkafuS3g&flowName=GeneralOAuthFlow
        cy.get('.button').contains('Login to Google').click();
    }

    getModalDialogTitle(){
        return cy.get('.modal-dialog-title')
    }
    getDialogMessage(){
        return cy.get('.modal-dialog-workspace .alert-dialog-message')
    }
    getDialogCloseButton(){
        return cy.get('.modal-dialog-workspace .alert-dialog button').contains('Close')
    }
}
export default CfmObject;