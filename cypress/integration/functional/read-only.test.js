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
        
    })
})