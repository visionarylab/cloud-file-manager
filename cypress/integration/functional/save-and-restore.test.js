import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"


const cfm = new CfmObject;
const docArea = new DocumentObject;

before(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Save and Restore from different providers',()=>{
    describe('from local storage',()=>{
        var text1 = "Save and restore me",
            title = "saved document"
        var titleURI = encodeURIComponent(title)

        it('save a doc',()=>{
            docArea.getTextArea().type(text1+"{enter}")
            cfm.getDocumentTitle().click().find('input').type(title+"{enter}");
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Save')
            cfm.getLocalStorageTab().click();
            cfm.getDocumentSaveFilenameField().should('have.value',title)
            cfm.getSaveButton().click();
            docArea.getTextArea('{clear}')
            cy.saveLocalStorageCache()
        })
        it('verify file name is appended to URL',()=>{
            //http://127.0.0.1:8080/examples/all-providers.html#file=localStorage:saved%20document
            cy.url().should('contain','#file=localStorage:'+titleURI)
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
            docArea.getTextArea().should('contain',text1)
        })
    })
})    