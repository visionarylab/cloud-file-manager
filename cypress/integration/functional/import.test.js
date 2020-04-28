import CfmObject from "../../support/elements/CfmObject"
import DocumentObject from "../../support/elements/DocumentObject"

const cfm = new CfmObject;
const docArea = new DocumentObject;
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
    describe.skip('import from button',()=>{//not working. Can't interact with the element
        before(()=>{
            docArea.getTextArea().clear()
        })
        it('import from button',()=>{
            cy.uploadFile(docArea.getImportButton(),filename);
            docArea.getTextArea().should('contain','name": "Local_File_Save",')
        })
    })
})