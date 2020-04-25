import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const ext = '.txt';
const cfm = new CfmObject;
const docArea = new DocumentObject;

// Cypress.config('fixturesFolder', dir)

var sharedText = 'will share this document'
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
    }) 
    describe('visit shared link',function(){
        it('verify shared link is accessible',function(){
            cy.visit(this.sharedURL);
            docArea.getTextArea().should('contain', sharedText)
        })
    })
    describe('Update shared view',function(){
        before(function(){
            cy.visit('/examples/all-providers.html')
            //need to actually have some kind of message in the document that gets updated at update
        })

        it('verify confirmation dialog comes up',function(){
            cfm.getShareButton('Update shared view').click();
            cfm.getModalDialogTitle().should('contain','Shared View Updated')
            cfm.getDialogMessage().should('contain','The shared view was updated successfully.')
            cfm.getDialogCloseButton().click({force:true});
            cfm.getModalDialogTitle().contains('Shared View Updated').should('not.exist')
        })
    })
})

context('unshare document',()=>{
    before(function(){
        cfm.getPreviewLink().attribute('href').as('sharedURL')
        cy.log(this.sharedURL)
    })
    describe('unshare document',()=>{
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