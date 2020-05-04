import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject;
const docArea = new DocumentObject;
let saveDocText = "Save me then close me"
let saveDocTitle = "Saved Close Doc"
let unsaveDocText = "DON'T save me"
// Cypress.config('fixturesFolder', dir)

before(()=>{
    cy.visit('/examples/close-file.html')
})
context('Close doc',()=>{
    describe('close saved document',()=>{
        let titleURI = encodeURIComponent(saveDocTitle)

        it('verify close after save document',()=>{
            docArea.getTextArea().type(saveDocText)
            cfm.saveToLocalStorage(saveDocTitle)
            cfm.getDocumentTitle().should('contain',saveDocTitle)
            cfm.getFileStatusInfo().should('contain', 'All changes saved to Local Storage')
            cy.url().should('contain','#file=localStorage:'+titleURI)
            cfm.closeDocFromFileMenu();
            cfm.getDocumentTitle().should('contain','Untitled Document')
            cfm.getFileStatusInfo().should('not.contain', 'All changes saved to Local Storage')
            cy.url().should('not.contain','#file=localStorage:'+titleURI)
        })
    })
    describe('close unsaved document',()=>{
        it('verify close confirmation dialog comes up',()=>{
            docArea.getTextArea().type(unsaveDocText)
            cfm.closeDocFromFileMenu()
            cfm.getModalDialogTitle().should('contain','Are you sure?')
            cfm.getConfirmDialogMessage().should('contain', 'You have unsaved changes. Are you sure you want to close the document?')
        })
        it('verify selecting NO does not close the document',function(){
            cy.get('.confirm-dialog button').contains('No').click()
            cfm.getFileStatusInfo().should('not.contain', 'Unsaved')
            cfm.getDialogMessage().should('not.exist')
            docArea.getTextArea().should('contain',unsaveDocText)
        })
        it('verify selecting YES closes document', function(){
            cfm.closeDocFromFileMenu()
            cfm.closeConfirmDialogMessage()
            cfm.getDialogMessage().should('not.exist')
            docArea.getTextArea().should('not.contain',unsaveDocText)
        })
    })
})