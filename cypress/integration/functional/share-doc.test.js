import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject;
const docArea = new DocumentObject;
var sharedDocTitle = 'Share me'
var sharedText = 'will share this document'
var updateTextCFMMenu = ' Update from CFM menu'
var updateTextShareDialog = ' Update from Share dialog'


context('before share',()=>{
    before(()=>{
        cy.visit('/examples/all-providers.html')
        docArea.getTextArea().type(sharedText)
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('Share...');
        cfm.selectCFMMenuItem('Get link to shared view')
    })
    describe('shared state',()=>{
        it('verify shared state',()=>{
            cfm.getShareStatus().should('contain','disabled');
            cfm.getShareButton('Enable sharing').should('be.visible')
            cfm.getUnshareLink().should('not.exist')
            cfm.getPreviewLink().should('not.exist')
            cfm.getCloseButton().should('be.visible')
        })
        it('verify close button does not alter shared state',()=>{
            cfm.getCloseButton().click();
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Share...');
            cfm.selectCFMMenuItem('Get link to shared view')
            cfm.getShareStatus().should('contain','disabled');
        })
    })
})
context('after shared',function(){
    before(function(){
        cfm.getShareButton('Enable sharing').click();
        cfm.getPreviewLink().attribute('href').as('sharedURL')
    })
    describe('get share link',function(){
        it('verify shared state after enabling sharing',function(){
            cfm.getShareStatus().should('contain','enabled');
            cfm.getShareButton('Update shared view').should('be.visible')
            cfm.getUnshareLink().should('be.visible')
            cfm.getPreviewLink().should('be.visible').and('have.attr','href')
            cfm.getShareTabs('Link').should('be.visible')
            cfm.getShareTabs('Embed').should('be.visible')
        })
        it('verify share link is generated',function(){
            cfm.getShareLink().should('have.attr','readonly')
            cfm.getShareLink().attribute('value').should('contain',this.sharedURL)
            cfm.getCopyLink().attribute('href').should('contain','#')
        })
    })
    describe('get embed link',function(){
        it('verify embed link is generated',function(){
            cfm.getShareTabs('Embed').click();
            cfm.getEmbedText().should('have.attr','readonly');
            cfm.getEmbedText().should('contain','<iframe width="398px" height="313px" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="'+this.sharedURL+'"></iframe>')
        })
        after(function(){ //save to local storage to verify if share state is restored and verify update of shared doc is propagated
            cfm.getCloseButton().click();
            cfm.saveToLocalStorage(sharedDocTitle)
            cy.saveLocalStorageCache()
        })
    })   
    //putting these tests here so it has access to the sharedURL
    context('Shared document',function(){
        describe('visit shared link',function(){
            it('verify shared link is accessible',function(){
                cy.visit(this.sharedURL);
                docArea.getTextArea().should('contain', sharedText)
            })
            it('verify shared document is not shared',function(){
                cfm.openCFMMenu()
                cfm.selectCFMMenuItem('Share...')
                cfm.selectCFMMenuItem('Get link to shared view')
                cfm.getShareStatus().should('contain','disabled');
                cfm.getShareButton('Enable sharing').should('be.visible')
            })
        })
    })
    context('Restore original document',function(){
    //restore saved shared doc
        before(function(){
            cy.visit('/examples/all-providers.html');
            cy.restoreLocalStorageCache();
            cfm.openDocFromFileMenu();
            cfm.openLocalStorageDoc(sharedDocTitle)
        })
        it('verify shared state is restored',function(){
            cfm.openCFMMenu()
            cfm.selectCFMMenuItem('Share...')
            cfm.selectCFMMenuItem('Get link to shared view')
            cfm.getShareStatus().should('contain','enabled');
            cfm.getShareButton('Update shared view').should('be.visible')
            cfm.getCloseButton().click();
        })
    })
    context('Update shared view',function(){
        describe('update from share dialog',function(){
            it('verify confirmation dialog comes up',function(){
                docArea.getTextArea().type(updateTextShareDialog);
                cfm.openCFMMenu();
                cfm.selectCFMMenuItem('Share')
                cfm.selectCFMMenuItem('Get link to shared view')    
                cfm.getShareButton('Update shared view').click();
                cfm.getModalDialogTitle().should('contain','Shared View Updated')
                cfm.getDialogMessage().should('contain','The shared view was updated successfully.')
                cfm.getDialogCloseButton().click({force:true});
                cfm.getModalDialogTitle().contains('Shared View Updated').should('not.exist')
                cfm.getCloseButton().click();
                cfm.openCFMMenu();
                cfm.selectCFMMenuItem('Save')
                // cfm.saveToLocalStorage(sharedDocTitle)
                cy.saveLocalStorageCache()
            })
            it('verify shared document is updated',function(){
                cy.visit(this.sharedURL)
                docArea.getTextArea().should('contain',updateTextShareDialog);
            })
        })
        describe('update from CFM menu',function(){
            it('update text area',function(){
                cy.visit('/examples/all-providers.html');
                cy.restoreLocalStorageCache();
                cfm.openCFMMenu();
                cfm.selectCFMMenuItem('Open')
                cfm.openLocalStorageDoc(sharedDocTitle);
                docArea.getTextArea().type(updateTextCFMMenu);
                cfm.openCFMMenu();
                cfm.selectCFMMenuItem('Share...');
                cfm.selectCFMMenuItem('Update shared view')
                cfm.openCFMMenu();
                cfm.selectCFMMenuItem('Save')
                cy.saveLocalStorageCache()
            })
            it('verify update in shared document',function(){
                cy.visit(this.sharedURL);
                docArea.getTextArea().should('contain',updateTextCFMMenu)
            })
        })
    })
})
context('unshare document',()=>{
    before(function(){
        cy.url().as('sharedURL')
    })
    describe('unshare document',()=>{
        before(function(){
            cy.visit('/examples/all-providers.html');
            cy.restoreLocalStorageCache();
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Open ...')
            cfm.openLocalStorageDoc(sharedDocTitle)
            cfm.openCFMMenu()
            cfm.selectCFMMenuItem('Share...');
            cfm.selectCFMMenuItem('Get link to shared view')
        })
        it('verify unshare of document',function(){
            cfm.getUnshareLink().click();
            cfm.getShareStatus().should('contain','disabled');
            cfm.getShareButton('Enable sharing').should('be.visible')
            cfm.getPreviewLink().should('not.exist')
        })
        it('verify notification when trying to access unshared document',function(){
            cy.visit(this.sharedURL);
            cfm.getModalDialogTitle().should('contain',"Error");
            cfm.getDialogMessage().should('contain',"You don't have permission to load the file.");
            cfm.getDialogCloseButton().click();
        })
    })
})