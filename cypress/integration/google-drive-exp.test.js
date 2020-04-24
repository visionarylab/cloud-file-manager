import CfmObject from "../support/elements/CfmObject";

const cfm = new CfmObject;

context('experiment saving to google drive',()=>{
    it('experiment Google Drive',()=>{
        var document = 'aaaaa';
        cy.visit('/examples/all-providers.html');
        cfm.openDocFromFileMenu();
        cfm.getTab('Google Drive').click();
        cy.get('.google-drive-auth button').contains('Login to Google').click(); 
        //https://accounts.google.com/signin/oauth/error
        //?authError=Cg9pbnZhbGlkX3JlcXVlc3QSO1Blcm1pc3Npb24gZGVuaWVkIHRvIGdlbmVyYXRlIGxvZ2luIGhpbnQgZm9yIHRhcmdldCBkb21haW4uIJAD
        //&client_id=1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com
        //Permission denied to generate login hint for target domain.
//   https://accounts.google.com/signin/oauth/identifier?response_type=permission%20id_token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.install%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&openid.realm&redirect_uri=storagerelay%3A%2F%2Fhttp%2Flocalhost%3A8080%3Fid%3Dauth920178&client_id=1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com&ss_domain=http%3A%2F%2Flocalhost%3A8080&gsiwebsdk=shim&o2v=1&as=dn3sXt_2Y21uz_jBufwBWg&flowName=GeneralOAuthFlow
//   https://accounts.google.com/signin/v2/challenge/pwd?response_type=permission%20id_token&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.install%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&openid.realm&redirect_uri=storagerelay%3A%2F%2Fhttp%2Flocalhost%3A8080%3Fid%3Dauth447121&client_id=1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com&ss_domain=http%3A%2F%2Flocalhost%3A8080&gsiwebsdk=shim&o2v=1&as=BE6hlvOEX85AazB12cZdQg&flowName=GeneralOAuthFlow&cid=1&navigationDirection=forward&TL=AM3QAYb_veDaqFrgWjw9nUk18s-54N6AUoebTXznX0EPTBvuW16biMGRN44Bk7Kr
//  https://accounts.google.com/signin/oauth/consent?authuser=0&part=AJi8hANzfC6XYODJPYLfyBGVEU6odDZ7gQgiPFCIuG-osFkBjZXheDYDUUSbUz04gffnhPazMr7WT_XBO1KVREXWvS2XK7jEzd7JPamvXHPYvjqwpkWQfzmz5ESs-se2Fkll-UL89SJPsPtz4GGjfctvFloIDBiWZvTIMroBcGM5Q5L_wnwe0oqgFtt92YHI5JC3q01JeiTXM9Dk-vB_aMdymLXejFRQ_cossQ7qKAhVzgqJabGv-2F3bykV3Z9ELiPdhBrqRSuPaRGDYx2ZcuQD4Pro0z1ZYLXOs6oaRb5jr9wnVGab7JrJc4C3WK1d7man56JZPrHUZCIDSf0v4WX3_nLXCTQZ0DbOxnW9BYvIxR8hsNFi6255mHUUdhxwrGrBlYddAqhBkRxGeLYWsmKEvp7BwIhUo8kDm5LyzDZIAa2WQ2QnLRE&as=BE6hlvOEX85AazB12cZdQg&rapt=AEjHL4MAgrTk8ONXO4lYdMvbf4fzCpXRpzCRlV9LI17PqPe0tjV_DdljAlDKx921oOU7fPzIcnM3EjAGyKRw03OcZelQSIXGtA#  

        
        // cfm.openGoogleDriveDoc(document);
    })
    it.skip('experiment open new',()=>{
        let body
        cy.visit('/examples/all-providers.html');
        cfm.getCFMMenu().click();
        cfm.selectCFMMenuItem('New');
        // cy.request('/examples/all-providers.html').then(($body)=>{
        //     console.log($body)
        // })
        //newFileDialog:
        // if @newFileOpensInNewTab
        // window.open @getCurrentUrl(if @newFileAddsNewToQuery then "#new" else null), '_blank'
    })
})