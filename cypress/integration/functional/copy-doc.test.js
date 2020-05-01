import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject()
const docArea = new DocumentObject()
const filename = 'Create Copy Doc'
const text = "Making a copy of this document"

before(function(){
    cy.visit('/examples/all-providers.html')
    cy.window().then((win)=>{
        cy.spy(win,"open").as('newFileEvt')
        cy.spy(win.console,"log").as('consoleLog')
    })
    // Cypress.on('window:before:load', win=>{ 
    //     cy.stub(win.console, 'log', (msg, args)=>{return console.log(msg,args)}).as('consoleLog')
    // })
    // cy.window().then((win) => { cy.spy(win.console, "log").as('console.log') })
    cfm.getDocumentTitle().click().type(filename)
    docArea.getTextArea().type(text)
})
context('Make a copy of document',function(){
    describe('make a copy',function(){
        it('verify getContent is invoked',function(){
            cfm.openCFMMenu();
            cfm.selectCFMMenuItem('Create a copy')
            cy.get('@newFileEvt').should('be.called')
            //Need to figure out how to capture the log message to verify that the right function was called
            // cy.get('@consoleLog').should('be.called').then(function(log){
            //     cy.log('log: '+log)
            // })
            //be.calledWith
            // cy.get('@consoleLog').should('contain', 'CloudFileManagerClientEvent {type: "getContent"')
            // cy.get('@consoleLog').then(function(log){
            //     cy.log("log: "+'@consoleLog')
            //     // expect(log).to.contain('CloudFileManagerClientEvent {type: "getContent"')
            })
        })
    })
})