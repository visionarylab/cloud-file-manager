import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const ext = '.txt';
const cfm = new CfmObject;
const docArea = new DocumentObject;

beforeEach(()=>{
    cy.visit('/examples/all-providers.html')
})
context('Import from different providers',()=>{
    describe('import from Local File',()=>{
        it('verify import from Local File',()=>{
            cfm.importFromLocal('Local_File_Save')
            docArea.getTextArea().should('contain',"Imported data")
        })
    })
    describe('import from URL',()=>{
        it('verify import from URL',()=>{
            var importURL ='https://data.cityofnewyork.us/api/views/25th-nujf/rows.csv'
            var text = 'Imported data: {"url": "https://data.cityofnewyork.us/api/views/25th-nujf/rows.csv","via": "select"}'
            cfm.importFromURL(importURL)
            docArea.getTextArea().should('contain',text)
        })
    })
})