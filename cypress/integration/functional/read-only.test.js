import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject;
const docArea = new DocumentObject;

// Cypress.config('fixturesFolder', dir)

before(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Read only or examples doc',()=>{
    describe('open read only documents',()=>{
        it('verify open read only document',()=>{
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Open ...')
            cfm.openReadOnlyDoc('second-example');
            docArea.getTextArea().should('contain','This is the second readonly example')
        })
        it('verify save is not and option in Save menu',()=>{
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Save')
            cfm.getTab('Read Only').should('not.exist')
            // cfm.getTab().find('li').should('not.be.visible','Read Only')
        })
    })
})