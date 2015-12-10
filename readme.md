# Cloud File Manager

The Cloud File Manager is a Javascript library that enables applications to save and load files from various file systems using a simple consistent API.  Currently the following file system providers are supported:

* [Concord Document Store](https://github.com/concord-consortium/document-store)
* Google Drive (both normal files and realtime models backed by empty normal files)
* Local and remote read-only files
* Browser LocalStorage (used mostly for development/testing)

## Development Setup

    npm install
    gulp default
    live-server

and navigate to http://localhost:8080/demo/

## Deployment

    gulp deploy

This will clean and re-build the `dist/` folder, and push the result to [http://concord-consortium.github.io/cloud-file-manager/](http://concord-consortium.github.io/cloud-file-manager/).  The examples directory highlighting the different ways Cloud File Manager can be configurated will then be available at [http://concord-consortium.github.io/cloud-file-manager/examples/](http://concord-consortium.github.io/cloud-file-manager/examples/).

## Integrating Cloud File Manager

There are two ways to integrate Cloud File Manager into an application

* Have Cloud File Manager create an iframe that wraps an application on the *same* domain - cross-domain frames are not supported by design.
* Embed Cloud File Manager into the application and use as a library

### Iframe Integration

On the same domain as your main application create an html file with the following structure:

```
<html>
  <head>
    <script type="text/javascript" src="/path/to/cloud-file-manager/js/globals.js"></script>
    <script type="text/javascript" src="/path/to/cloud-file-manager/js/app.js"></script>
    <link rel="stylesheet" href="/path/to/cloud-file-manager/css/app.css">
  </head>
  <body>
    <div id="wrapper">
    </div>
    <script>
      var options = {...};  // see below
      CloudFileManager.createFrame(options, "wrapper", function (event) {
        ... // optional event listener, see below
      });
    </script>
  </body>
</html>
```

where the options variable has the following optional or required settings:

```
var options = {
  app: "example-app", // required when iframing - relative path to the app to wrap
  mimeType: "application/json", // optional - defaults to text/plain
  appName: "CFM_Demo", // document store app name - required for sharing
  appVersion: "0.1", // document store app version - required for sharing
  appBuildNum: "1", // document store app build number - required for sharing
  providers: [...] // see below
  ui: {
    menu: CloudFileManager.DefaultMenu, // required - an array of string menu item names
    menuBar: {
      info: "Version 1.0.0", // optional - displayed on the right side of menubar when iframing
      help: "http://lmgtfy.com/" // optional - displayed on the right side of menubar with a ? icon when iframing
    }
  }
}
 ```

# TBD:

* Document provider options (see examples or look at code to see how they are configured for now)
* Document using as a library
* Draw a simple architecture diagram of how the client connects to the React UI using http://asciiflow.com/
* Document how to add another provider
* Document the event listenter functions in both createFrame and clientConnect and how each can talk to each other
