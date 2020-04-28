import CfmObject from "../../support/elements/CfmObject";
import DocumentObject from "../../support/elements/DocumentObject";

const cfm = new CfmObject;
const docArea = new DocumentObject;

beforeEach(()=>{
    cy.visit('/examples/all-providers.html');
    cy.window().then((win)=>{
        cy.spy(win,"open").as('newFileEvt')
    })
})
context('Create a new file',()=>{
    it('Create new file from file menu',()=>{
        cfm.openCFMMenu();
        cfm.selectCFMMenuItem('New');
        cy.get('@newFileEvt').should('be.called')
    })
    it('Create new file from New button',()=>{
        docArea.getNewButton().click()
        cy.get('@newFileEvt').should('be.called')
    })
})