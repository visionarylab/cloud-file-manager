// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
import 'cypress-commands';
let LOCAL_STORAGE_MEMORY = {};

Cypress.Commands.add("getAppIframe", () => {
    return cy.get(".innerApp iframe").iframe()
  });
  
  Cypress.Commands.add("iframe", { prevSubject: "element" }, $iframe => {
    Cypress.log({
        name: "iframe",
        consoleProps() {
            return {
                iframe: $iframe,
            };
        },
    });
    return new Cypress.Promise(resolve => {
        onIframeReady(
            $iframe,
            () => {
                resolve($iframe.contents().find("body"));
            },
            () => {
                $iframe.on("load", () => {
                    resolve($iframe.contents().find("body"));
                });
            }
        );
    });
  });
  
  function onIframeReady($iframe, successFn, errorFn) {
    try {
        const iCon = $iframe.first()[0].contentWindow,
            bl = "about:blank",
            compl = "complete";
        const callCallback = () => {
            try {
                const $con = $iframe.contents();
                if ($con.length === 0) {
                    // https://git.io/vV8yU
                    throw new Error("iframe inaccessible");
                }
                successFn($con);
            } catch (e) {
                // accessing contents failed
                errorFn();
            }
        };
        const observeOnload = () => {
            $iframe.on("load.jqueryMark", () => {
                try {
                    const src = $iframe.attr("src").trim(),
                        href = iCon.location.href;
                    if (href !== bl || src === bl || src === "") {
                        $iframe.off("load.jqueryMark");
                        callCallback();
                    }
                } catch (e) {
                    errorFn();
                }
            });
        };
        if (iCon.document.readyState === compl) {
            const src = $iframe.attr("src").trim(),
                href = iCon.location.href;
            if (href === bl && src !== bl && src !== "") {
                observeOnload();
            } else {
                callCallback();
            }
        } else {
            observeOnload();
        }
    } catch (e) {
        // accessing contentWindow failed
        errorFn();
    }
  }
  
  Cypress.Commands.add("uploadFile",(selector, filename, type="")=>{
      // cy.fixture(filename).as("file");
  
      return cy.get(selector).then((subject) => {
          return cy.fixture(filename)
              .then((blob) => {
                console.log(blob)
                const el = subject[0]
                const testFile = new File([blob], filename, { type })
                const dataTransfer = new DataTransfer()
                console.log(testFile)
                dataTransfer.items.add(testFile)
                // dataTransfer.items.add(blob);
                console.log(dataTransfer)
                el.files = dataTransfer.files
                console.log(subject)
                return subject
            })
        })
    })

    Cypress.Commands.add("iframeUploadFile",(selector, filename, type="")=>{
        // cy.fixture(filename).as("file");
    
        return cy.getAppIframe().find(selector).then((subject) => {
            return cy.fixture(filename)
                .then((blob) => {
                  console.log(blob)
                  const el = subject[0]
                  const testFile = new File([blob], filename, { type })
                  const dataTransfer = new DataTransfer();
                  console.log(testFile)
                  dataTransfer.items.add(testFile);
                  // dataTransfer.items.add(blob);
                  console.log(dataTransfer)
                  el.files = dataTransfer.files;
                  console.log(subject)
                  return subject;
              })
          })
      })    

Cypress.Commands.add("saveLocalStorageCache", () => {
  Object.keys(localStorage).forEach(key => {
    LOCAL_STORAGE_MEMORY[key] = localStorage[key];
  });
});

Cypress.Commands.add("restoreLocalStorageCache", () => {
  Object.keys(LOCAL_STORAGE_MEMORY).forEach(key => {
    localStorage.setItem(key, LOCAL_STORAGE_MEMORY[key]);
  });
});

Cypress.Commands.add('loginToGoogle', (overrides = {}) => {

    const options = {
      method: 'POST',
      url: 'http://auth.corp.com:7075/login',
      qs: {
        // use qs to set query string to the url that creates
        // http://auth.corp.com:8080?redirectTo=http://localhost:7074/set_token
        redirectTo: 'http://localhost:8080/set_token',
      },
      form: true, // we are submitting a regular form body
      body: {
        username: 'jane.lane',
        password: 'password123',
      },
    }

    // allow us to override defaults with passed in overrides
    _.extend(options, overrides)

    cy.request(options)
  })