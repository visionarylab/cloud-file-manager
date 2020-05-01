import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const dir = '../../../../../Downloads/'
const ext = '.txt';
const cfm = new CfmObject;
const docArea = new DocumentObject;

// Cypress.config('fixturesFolder', dir)

before(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Save and Restore from different providers from CFM menu',()=>{
    describe('from local storage',()=>{
        var text = "Save and restore me",
            title = "saved document"
        var titleURI = encodeURIComponent(title)

        it('save a doc',()=>{
            docArea.getTextArea().type(text+"{enter}")
            cfm.getDocumentTitle().click().find('input').type(title+"{enter}");
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Save')
            cfm.getTab('Local Storage').click();
            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cfm.getSaveButton().click();
            docArea.getTextArea('{clear}')
            cy.saveLocalStorageCache()
        })
        it('verify file name is appended to URL',()=>{
            cy.url().should('contain','#file=localStorage:'+titleURI)
        })
        it('verify status info',()=>{
            cfm.getFileStatusInfo().should('contain', 'All changes saved to Local Storage')
        })
        it('verify restore',()=>{
            //Cypress clears local storage between tests so have to restore within the same test
            cy.visit('/examples/all-providers.html')
            cy.restoreLocalStorageCache();
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Open ...')
            cfm.openLocalStorageDoc(title);
            cy.wait(2000)
            cy.url().should('contain','#file=localStorage:'+titleURI)
            cfm.getDocumentTitle().should('contain',title);
            docArea.getTextArea().should('contain',text)
        })
    })
    describe('from local file',()=>{
        var text = "saving to Local File",
            title = "Local_File_Save"
        before(()=>{
            cy.visit('/examples/all-providers.html')
        })    
        it('save a doc',()=>{
            docArea.getTextArea().type(text+"{enter}")
            cfm.getDocumentTitle().click().find('input').type(title+"{enter}");
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Save')
            cfm.getTab('Local File').click();
            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cy.get('.modal-dialog-workspace .dialogTab.localFileSave input').click().clear().type(title);
            cy.get('.buttons a').contains('Download').click();
        })
        it('verify file name is appended to URL',()=>{
            cy.url().should('not.contain','#file=')
        })
        it('verify status info',()=>{
            cfm.getFileStatusInfo().should('contain', 'All changes saved to Local File')
        })
        it('verify restore',()=>{
            //Restore is coming from fixture file. 
            //Ideally, needs to come from Downloads folder to verify the save.
            cy.visit('/examples/all-providers.html')
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Open ...')
            // cfm.openLocalDoc(dir+title);
            cfm.openLocalDoc(title+'.txt')
            cy.wait(2000)
            cfm.getDocumentTitle().should('contain',title);
            docArea.getTextArea().should('contain',text)
        })
    })
    describe.skip('from Google Docs',()=>{ //Need to figure out how the oauth works
        var text = "saving to Google Docs",
            title = "Google_Save"
        before(()=>{
            cy.visit('/examples/all-providers.html')
        })    
        it('save a doc',()=>{
            docArea.getTextArea().type(text+"{enter}")
            cfm.getDocumentTitle().click().find('input').type(title+"{enter}");
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Save')
            cfm.getTab('Google Drive').click();

            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cfm.getSaveButton().click()
        })
        it('verify file name is appended to URL',()=>{
            cy.url().should('contain','#file=')
        })
        it('verify status info',()=>{
            cfm.getFileStatusInfo().should('contain', 'All changes saved to Google Docs')
        })
        it('verify restore',()=>{
            //Restore is coming from fixture file. 
            //Ideally, needs to come from Downloads folder to verify the save.
            cy.visit('/examples/all-providers.html')
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Open ...')
            // cfm.openLocalDoc(dir+title);
            this.getTab('Google Drive').click();
            cy.wait(2000)
            cy.get('.filelist .selectable').contains(filename).click({force:true});
            this.getOpenDialogOpenButton();
        })
    })
}) 
context('Save and Restore from buttons',()=>{
    describe('Save',function(){
        //Only verify that dialog comes up since actual Save is tested from CFM menu
        it('verify Save buttton opens Save dialog', function(){
            docArea.getSaveButton().click()
            cfm.getModalDialogTitle().should('contain','Save')
            cy.get('.dialogTab.localfileSave button').contains('Cancel').click()
        })
    })
    describe('Save As',()=>{
        var text = "Save as and restore me from buttons",
            title = "button saved document"
        var titleURI = encodeURIComponent(title)

        it('save as a doc', function(){ //Save as is not accessible from menu so testing it here
            docArea.getTextArea().type(text+"{enter}")
            cfm.getDocumentTitle().click().find('input').type(title+"{enter}")
            docArea.getSaveAsButton().click()
            cfm.getTab('Local Storage').click()
            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cfm.getSaveButton().click()
            docArea.getTextArea('{clear}')
            cy.saveLocalStorageCache()
        })
        it('verify file name is appended to URL',()=>{
            cy.url().should('contain','#file=localStorage:'+titleURI)
        })
        it('verify status info',()=>{
            cfm.getFileStatusInfo().should('contain', 'All changes saved to Local Storage')
        })
        it.skip('verify restore',()=>{ //there's a WIP in main code line that's causing this to fail
            //Cypress clears local storage between tests so have to restore within the same test
            cy.visit('/examples/all-providers.html')
            cy.restoreLocalStorageCache();
            docArea.getOpenButton().click()
            cfm.openLocalStorageDoc(title);
            cy.wait(2000)
            cy.url().should('contain','#file=localStorage:'+titleURI)
            cfm.getDocumentTitle().should('contain',title);
            docArea.getTextArea().should('contain',text)
        })
    })
    describe('Export Separate File',()=>{
        var text = "Export and restore me from buttons",
            title = "button export document"
        var titleURI = encodeURIComponent(title)

        it('Export a doc', function(){ //Save as is not accessible from menu so testing it here
            docArea.getTextArea().type(text+"{enter}")
            cfm.getDocumentTitle().click().find('input').clear().type(title+"{enter}");
            docArea.getExportButton().click();
            cfm.getTab('Local File').click();//Exporting to Local Storage does not work
            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cy.get('.buttons a').contains('Download').click();
            docArea.getTextArea('{clear}')
        })
        it.skip('verify restore',()=>{ //there's a WIP in main code line that's causing this to fail
            //Cypress clears local storage between tests so have to restore within the same test
            cy.visit('/examples/all-providers.html')
            docArea.getOpenLocalFileButton()
            cy.iframeUploadFile('[data-test="open-local-button"]',filename,'text')
            cy.wait(2000)
            cfm.getDocumentTitle().should('contain',title);
            docArea.getTextArea().should('contain',text)
        })
    })    
})   