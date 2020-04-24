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
context('Sharing',()=>{
    describe('get share link',()=>{
        it('verify share link is generated',()=>{

        })
    })
    describe('get embed link',()=>{
        it('verify embed link is generated',()=>{
            var url //need a url for a csv
        })
    })
    describe('get LARA link',()=>{
        it('verify correct URL',()=>{
            
        })
    })
})