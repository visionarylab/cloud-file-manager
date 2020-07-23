// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { ProviderInterface }  from './provider-interface'
import { cloudContentFactory }  from './provider-interface'
import { CloudMetadata }  from './provider-interface'
import DocumentStoreUrl  from './document-store-url'
import PatchableContent  from './patchable-content'
import getQueryParam  from '../utils/get-query-param'
import queryString from "query-string"
import { Base64 }  from 'js-base64'
import pako  from 'pako'

// This provider supports the lara:... protocol used for documents launched
// from LARA. It looks up the document ID and access keys from the LARA
// interactive run state and then uses the V2 DocStore API to read/write
// documents from the Concord Document Store. It does not support arbitrary
// opening/saving of documents and so should not appear in the list of
// places users can choose to open/save files like Google Drive does.

class LaraProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'lara'
  }

  constructor(options, client) {
    const opts = options || {}

    super({
      name: LaraProvider.Name,
      capabilities: {
        save: true,
        resave: true,
        "export": false,
        load: true,
        list: false,
        remove: false,
        rename: false,
        close: false
      }
    })
    this.options = opts
    this.client = client
    this.urlParams = {
      documentServer: getQueryParam("documentServer"),
      launchFromLara: getQueryParam("launchFromLara")
    }
    this.removableQueryParams = ['launchFromLara', 'runAsGuest']

    this.laraParams = this.urlParams.launchFromLara ? this.decodeParams(this.urlParams.launchFromLara) : null
    this.openSavedParams = null
    this.collaboratorUrls = []

    this.docStoreUrl = new DocumentStoreUrl(this.urlParams.documentServer)

    this.savedContent = new PatchableContent(this.options.patchObjectHash)
  }

  encodeParams(params) {
    return Base64.encodeURI(JSON.stringify(params))
  }

  decodeParams(params) {
    let decoded
    try {
      decoded = JSON.parse(Base64.decode(params))
    } catch (e) {
      decoded = null
    }
    return decoded
  }

  handleUrlParams() {
    if (this.laraParams) {
      this.client.openProviderFile(this.name, this.laraParams)
      return true // signal that the provider is handling the params
    } else {
      return false
    }
  }

  logLaraData(laraData) {
    if (this.collaboratorUrls != null ? this.collaboratorUrls.length : undefined) { laraData.collaboratorUrls = this.collaboratorUrls }
    if (this.options.logLaraData) { this.options.logLaraData(laraData) }
    return this.client.log('logLaraData', laraData)
  }

  // don't show in provider open/save dialogs
  filterTabComponent(capability, defaultComponent) {
    return null
  }

  extractRawDataFromRunState(runState) {
    let rawData = (runState != null ? runState.raw_data : undefined) || {}
    if (typeof rawData === "string") {
      try {
        rawData = JSON.parse(rawData)
      } catch (e) {
        rawData = {}
      }
    }
    return rawData
  }

  can(capability, metadata) {
    const hasReadOnlyAccess = (__guard__(__guard__(metadata != null ? metadata.providerData : undefined, x1 => x1.accessKeys), x => x.readOnly) != null) &&
                        (__guard__(__guard__(metadata != null ? metadata.providerData : undefined, x3 => x3.accessKeys), x2 => x2.readWrite) == null)
    const requiresWriteAccess = ['save', 'resave', 'remove', 'rename'].indexOf(capability) >= 0
    return super.can(capability, metadata) && !(requiresWriteAccess && hasReadOnlyAccess)
  }

  load(metadata, callback) {
    let accessKey
    const {method, url} = this.docStoreUrl.v2LoadDocument(metadata.providerData != null ? metadata.providerData.recordid : undefined)

    if (__guard__(metadata.providerData != null ? metadata.providerData.accessKeys : undefined, x => x.readOnly)) {
      accessKey = `RO::${metadata.providerData.accessKeys.readOnly}`
    } else if (__guard__(metadata.providerData != null ? metadata.providerData.accessKeys : undefined, x1 => x1.readWrite)) {
      accessKey = `RW::${metadata.providerData.accessKeys.readWrite}`
    }

    return $.ajax({
      type: method,
      url,
      dataType: 'json',
      data: {
        accessKey
      },
      context: this,

      success: data => {
        this.logLaraData({
          operation: 'open',
          documentID: (metadata.providerData != null ? metadata.providerData.recordid : undefined),
          documentUrl: url
        })
        const content = cloudContentFactory.createEnvelopedCloudContent(data)

        // for documents loaded by id or other means (besides name),
        // capture the name for use in the CFM interface.
        // 'docName' at the top level for CFM-wrapped documents
        // 'name' at the top level for unwrapped documents (e.g. CODAP)
        // 'name' at the top level of 'content' for wrapped CODAP documents
        metadata.rename(metadata.name || data.docName || data.name || (data.content != null ? data.content.name : undefined))
        if (metadata.name) {
          content.addMetadata({docName: metadata.filename})
        }

        return callback(null, content)
      },

      error(jqXHR) {
        return callback(`Unable to load ${metadata.name || (metadata.providerData != null ? metadata.providerData.recordid : undefined) || 'file'}`)
      }
    })
  }

  save(cloudContent, metadata, callback, disablePatch) {
    const content = cloudContent.getContent()

    // See if we can patch
    const canPatch = this.options.patch && metadata.overwritable && !disablePatch
    const patchResults = this.savedContent.createPatch(content, canPatch)

    if (patchResults.shouldPatch && !patchResults.diffLength) {
      // no reason to patch if there are no diffs
      callback(null) // no error indicates success
      return
    }

    const params = {}
    if (!patchResults.shouldPatch && metadata.filename) {
      params.recordname = metadata.filename
    }

    if (__guard__(__guard__(metadata != null ? metadata.providerData : undefined, x1 => x1.accessKeys), x => x.readWrite) != null) {
      params.accessKey = `RW::${metadata.providerData.accessKeys.readWrite}`
    }

    const {method, url} = patchResults.shouldPatch 
                      ? this.docStoreUrl.v2PatchDocument(metadata.providerData.recordid, params) 
                      : this.docStoreUrl.v2SaveDocument(metadata.providerData.recordid, params)

    const logData = {
      operation: 'save',
      provider: 'LaraProvider',
      shouldPatch: patchResults.shouldPatch,
      method,
      // elide all but first two chars of accessKey
      url: url.substr(0, url.indexOf('accessKey') + 16) + '...',
      params: JSON.stringify({ recordname: params.recordname }),
      content: patchResults.sendContent.substr(0, 512)
    }
    this.client.log('save', logData)

    return $.ajax({
      dataType: 'json',
      type: method,
      url,
      data: pako.deflate(patchResults.sendContent),
      contentType: patchResults.mimeType,
      processData: false,
      beforeSend(xhr) {
        return xhr.setRequestHeader('Content-Encoding', 'deflate')
      },
      context: this,
      success(data) {
        this.savedContent.updateContent(this.options.patch ? _.cloneDeep(content) : null)
        if (data.recordid) { metadata.providerData.recordid = data.recordid }

        return callback(null, data)
      },

      error(jqXHR) {
        // if patch fails, try a full save
        if (patchResults.shouldPatch) {
          return this.save(cloudContent, metadata, callback, true)
        // if full save fails, return error message
        } else {
          try {
            const responseJson = JSON.parse(jqXHR.responseText)
            if (responseJson.message === 'error.duplicate') {
              return callback(`Unable to create ${metadata.name}. File already exists.`)
            } else {
              return callback(`Unable to save ${metadata.name}: [${responseJson.message}]`)
            }
          } catch (error) {
            return callback(`Unable to save ${metadata.name}`)
          }
        }
      }
    })
  }

  canOpenSaved() { return true }

  openSaved(openSavedParams, callback) {
    const metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this
    })

    if (typeof openSavedParams === "string") {
      openSavedParams = this.decodeParams(openSavedParams)
    }

    this.openSavedParams = openSavedParams
    this.collaboratorUrls = __guard__(openSavedParams != null ? openSavedParams.collaboratorUrls : undefined, x => x.length) > 0 ? openSavedParams.collaboratorUrls : []

    const loadProviderFile = (providerData, callback) => {
      metadata.providerData = providerData
      return this.load(metadata, (err, content) => {
        this.client.removeQueryParams(this.removableQueryParams)
        return callback(err, content, metadata)
      })
    }

    //
    // if we have a document ID we can just load the document
    //
    if (openSavedParams != null ? openSavedParams.recordid : undefined) { return loadProviderFile(openSavedParams, callback) }

    //
    // Process the initial run state response
    //
    const processInitialRunState = (runStateUrl, sourceID, readOnlyKey, runState) => {
      const existingRunState = this.extractRawDataFromRunState(runState)
      let { docStore } = existingRunState

      const haveCollaborators = this.collaboratorUrls.length > 0

      const updateInteractiveRunStates = function(urls, newDocStore, callback) {

        const newRunState = _.cloneDeep(existingRunState)
        newRunState.docStore = newDocStore

        const rawData = JSON.stringify(newRunState)
        const learnerUrl = (newRunState.learner_url != null) && (typeof newRunState.learner_url === "string") ? newRunState.learner_url : null
        const learnerParam = learnerUrl ? `&learner_url=${encodeURIComponent(learnerUrl)}` : ""

        const updateRunState = (url, done) =>
          $.ajax({
            type: 'PUT',
            url: `${url}?raw_data=${encodeURIComponent(rawData)}${learnerParam}`,
            dataType: 'json',
            xhrFields: {
              withCredentials: true
            }
          })
          .done(function(data, status, jqXHR) {
            if ((data != null ? data.success : undefined) === false) {
              return done(`Could not open the specified document because an error occurred [updateState] (${data.message})`)
            } else {
              return done(null)
            }}).fail((jqXHR, status, error) => done("Could not open the specified document because an error occurred [updateState]"))
        

        const urlQueue = urls.slice()
        var processQueue = function() {
          if (urlQueue.length === 0) {
            return callback(null)
          } else {
            const url = urlQueue.shift()
            return updateRunState(url, function(err) {
              if (err) {
                return callback(err)
              } else {
                return processQueue()
              }
            })
          }
        }
        return processQueue()
      }

      const processCreateResponse = createResponse => {
        docStore = {
          recordid: createResponse.id,
          accessKeys: {
            readOnly: createResponse.readAccessKey,
            readWrite: createResponse.readWriteAccessKey
          }
        }

        const codapUrl = window.location.origin 
                    ? `${window.location.origin}${window.location.pathname}` 
                    : `${window.location.protocol}//${window.location.host}${window.location.pathname}`
        const reportUrlLaraParams = {
          recordid: createResponse.id,
          accessKeys: {
            readOnly: createResponse.readAccessKey
          }
        }
        const encodedLaraParams = this.encodeParams(reportUrlLaraParams)
        if (existingRunState.lara_options == null) { existingRunState.lara_options = {} }
        return existingRunState.lara_options.reporting_url = `${codapUrl}?launchFromLara=${encodedLaraParams}`
      }

      // Check if we have a document associated with this run state already (2a) or not (2b)
      if (((docStore != null ? docStore.recordid : undefined) != null) && (((docStore.accessKeys != null ? docStore.accessKeys.readOnly : undefined) != null) || ((docStore.accessKeys != null ? docStore.accessKeys.readWrite : undefined) != null))) {

        const cloneDoc = callback => {
          const createParams = {
            source: docStore.recordid,
            accessKey: `RO::${docStore.accessKeys.readOnly}`
          }
          const {method, url} = this.docStoreUrl.v2CreateDocument(createParams)
          return $.ajax({
            type: method,
            url,
            dataType: 'json'
          })
          .done((createResponse, status, jqXHR) => {
            const laraData = {
              operation: 'clone',
              documentID: docStore.recordid,
              documentUrl: url
            }
            if ((existingRunState != null ? existingRunState.run_remote_endpoint : undefined) != null) { laraData.run_remote_endpoint = existingRunState.run_remote_endpoint }
            this.logLaraData(laraData)
            processCreateResponse(createResponse)
            return callback(null)
        }).fail((jqXHR, status, error) => callback("Could not open the specified document because an error occurred [createCopy]"))
        }

        const setFollowers = (err, callback) => {
          if (err) {
            return callback(err)
          } else {
            const collaboratorParams = _.cloneDeep(docStore)
            collaboratorParams.collaborator = 'follower'
            return updateInteractiveRunStates(this.collaboratorUrls, collaboratorParams, callback)
          }
        }

        const becomeLeader = function(err, callback) {
          if (err) {
            return callback(err)
          } else {
            docStore.collaborator = 'leader'
            return updateInteractiveRunStates([runStateUrl], docStore, callback)
          }
        }

        const removeCollaborator = function(err, callback) {
          if (err) {
            return callback(err)
          } else {
            delete docStore.collaborator
            return updateInteractiveRunStates([runStateUrl], docStore, callback)
          }
        }

        const finished = function(err) {
          if (err) {
            return callback(err)
          } else {
            return loadProviderFile(_.cloneDeep(docStore), callback)
          }
        }

        // is this an existing collaborated document?
        if (docStore.collaborator) {
          if (docStore.collaborator === 'leader') {
            if (haveCollaborators) {
              // the current user is still the leader so update the collaborator states to follow the leader (in case there are new collaborators) and load the existing document
              return setFollowers(null, finished)
            } else {
              // the current user has gone from leader to solo mode so clone the document to preserve the collaborated document and update the run state to remove collaborator
              return cloneDoc(err => removeCollaborator(err, finished))
            }
          } else {
            if (haveCollaborators) {
              // the current user has switched from follower to leader so clone the existing leader document, become the new leader and update the followers and load the new document
              return cloneDoc(err => becomeLeader(err, (err => setFollowers(err, finished))))
            } else {
              // the current user has switched from follower to solo mode so clone the existing leader document, update the run state to remove the collaborator and load the new document
              return cloneDoc(err => removeCollaborator(err, finished))
            }
          }
        } else {
          if (haveCollaborators) {
            // the current user has switched from solo mode to leader so update both the user's and the collaborators run states using the existing document
            return becomeLeader(null, err => setFollowers(err, finished))
          } else {
            // the current user has opened an existing solo mode file so just open it
            return finished()
          }
        }
      }

      // we need a sourceID to be able to create a copy
      if (!sourceID) {
        callback("Could not open the specified document because an error occurred [noSource]")
        return
      }

      // Called after docstore has created a document for us.
      const afterCreateCopy = (createResponse, status, jqXHR) => {
        processCreateResponse(createResponse)
        if (haveCollaborators) {
          docStore.collaborator = 'leader'
        }
        const providerData = _.merge({}, docStore, { url: runStateUrl })
        const updateFinished = () => loadProviderFile(providerData, callback)

        // update the owners interactive run state
        return updateInteractiveRunStates([runStateUrl], docStore, err => {
          if (err) {
            return callback(err)
          } else if (haveCollaborators) {
            docStore.collaborator = 'follower'
            return updateInteractiveRunStates(this.collaboratorUrls, docStore, function(err) {
              if (err) {
                return callback(err)
              } else {
                return updateFinished()
              }
            })
          } else {
            return updateFinished()
          }
        })
      }

      const onError = (jqXHR, status, error) => {
        callback("Could not open the specified document because an error occurred [createCopy]")
      }

      // NP 2020-06-29 Read the contents from a shared URL in the SourceID
      // This includes the CODAP part of the URL, (TBD: has this always been the case?)

      // See if the `#shared` hash parameter looks like a public URL:
      const S3MatchRegex = /^http?s/
      const sharedDocIsUrl = (typeof sourceID === "string") && sourceID.match(S3MatchRegex)

      // The `#shared` hash param is a public URL, just read the contents
      // and use that as the post body to v2CreateDocument.
      if (sharedDocIsUrl) {
        $.ajax({
          url: sourceID,
        })
        .done((data) => {
          const {method, url} = this.docStoreUrl.v2CreateDocument({})
          const dataJson = typeof(data) === "string" ? data : JSON.stringify(data)
          return $.ajax({
            type: method,
            dataType: 'json',
            contentType: 'application/json', // Document Store requires JSON currently
            processData: false, // https://api.jquery.com/jquery.ajax/
            data: pako.deflate(dataJson),
            beforeSend(xhr) {
              return xhr.setRequestHeader('Content-Encoding', 'deflate')
            },
            url
          })
          .done(afterCreateCopy)
          .fail(onError)
        })
        .fail(onError)
      }

      // The `#shared` hash-param is assumed to be docstore document ID.
      // Use the docstore server-side copy version of create, which expects
      // a `source` parameter.
      else {
        // (2b) request a copy of the shared document
        const createParams = { source: sourceID }
        // add a key if given (for copying linked run states)
        if (readOnlyKey) {
          createParams.accessKey = `RO::${readOnlyKey}`
        }
        const {method, url} = this.docStoreUrl.v2CreateDocument(createParams)
        return $.ajax({
          type: method,
          url,
          dataType: 'json'
        })
        .done(afterCreateCopy)
        .fail(onError)
      }
    }

    //
    // We have a run state URL and a source document. We must copy the source
    // document and update the run state before opening the copied document.
    //
    if (openSavedParams && openSavedParams.url) {
      // (1) request the interactive run state
      $.ajax({
        type: 'GET',
        url: openSavedParams.url,
        dataType: 'json',
        xhrFields: {
          withCredentials: true
        }
      })
      .done((data, status, jqXHR) => {
        const laraData = {
          operation: 'open',
          runStateUrl: openSavedParams.url,
          documentID: openSavedParams.source
        }
        if ((data != null ? data.run_remote_endpoint : undefined) != null) { laraData.run_remote_endpoint = data.run_remote_endpoint }
        this.logLaraData(laraData)
        return processInitialRunState(openSavedParams.url, openSavedParams.source, openSavedParams.readOnlyKey, data)
    }).fail((jqXHR, status, error) => callback("Could not open the specified document because an error occurred [getState]"))

      return
    }

    return callback("Cannot open the specified document")
  }

  getOpenSavedParams(metadata) {
    const params = this.openSavedParams ?
      this.openSavedParams
    : this.laraParams ?{
      url: this.laraParams.url,
      source: this.laraParams.source
    }
    :
      metadata
    return this.encodeParams(params)
  }
}
LaraProvider.initClass()

export default LaraProvider

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}