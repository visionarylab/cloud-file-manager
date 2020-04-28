import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject;
const docArea = new DocumentObject;

before(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Import from different providers',()=>{
    describe('import from Local File',()=>{
        it('verify import from Local File',()=>{
            cfm.importFromLocal('Local_File_Save')
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
})