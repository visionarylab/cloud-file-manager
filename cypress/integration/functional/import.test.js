import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject()
const docArea = new DocumentObject()
const filename = 'Local_File_Save'

before(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Import from different providers',()=>{
    describe('import from Local File',()=>{
        it('verify import from Local File',()=>{
            cfm.importFromLocal(filename)
            docArea.getTextArea().should('contain','name": "Local_File_Save",')
        })
    })
    describe('import from URL',()=>{
        it('verify import from URL',()=>{
            var importURL ='https://data.cityofnewyork.us/api/views/25th-nujf/rows.csv'
            var text = '"url": "https://data.cityofnewyork.us/api/views/25th-nujf/rows.csv",'
            cfm.importFromURL(importURL)
            docArea.getTextArea().should('contain',text)
        })
    })
    //there's a WIP in main code line that's causing this to fail
    describe.skip('import from button',()=>{//not working. doesn't show the content in the textarea
        before(()=>{
            cy.visit('http://127.0.0.1:8080/examples/example-app/index.html')
            cy.get('[data-test="document-content').clear()
        //     docArea.getTextArea().clear()
        })
        it('import from button',()=>{
         //If using the iframed version, use cy.iframeUploadFile('[data-test="import-button"]',filename,'text')
            cy.uploadFile('[data-test="import-button"]',filename,'text')
            // cy.get('[data-test="document-content').should('contain','"content":"saving to Local File')

            // docArea.getTextArea().should('contain','name": "Local_File_Save",')
        })
    })
})