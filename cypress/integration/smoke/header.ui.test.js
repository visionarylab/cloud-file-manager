import CfmObject from "../../support/elements/CfmObject"

const cfm = new CfmObject;

context('Header UI',()=>{
    describe('left side ui',()=>{
        before(()=>{
            cy.visit('/examples/all-providers.html')
        })
        it('verify hamburger menu',()=>{
            cfm.getCFMMenu().should('be.visible');
            cfm.getCFMMenuPanel('hidden').should('exist')
            cfm.openCFMMenu();
            cfm.getCFMMenuPanel('showing').should('exist')
        })
        it('verify document title',()=>{
            cfm.getDocumentTitle().should('be.visible');
            cfm.getDocumentTitle().click();
            cfm.getDocumentTitle().find('input').should('exist').type('new title{enter}');
            cfm.getDocumentTitle().should('be.visible').and('contain','new title');
        })
    })
    describe('right side ui',()=>{
        it('verify help icon',()=>{
            cfm.getHelpIcon().should('be.visible')
        })
    })
    describe('language dropdown',()=>{
        before(()=>{
            cy.visit('/examples/no-flag-language-menu.html')
        })
        it('verify language dropdown is visible',()=>{
            cfm.getLanguageDropDown().should('be.visible')
        })
    })
})