// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, input, a, button, strong, textarea, svg, g, path, circle, ul, li} = ReactDOMFactories

const SHOW_LONGEVITY_WARNING = false

import modalDialogView from './modal-dialog-view'
const ModalDialog = createReactFactory(modalDialogView)
import {ShareLoadingView} from './share-loading-view'

// This function is named "tr" elsewhere in this codeline.
// Using the fullname, "translate" here, to avoid the potential overloading
// of the react function, "tr".
import translate  from '../utils/translate'
import socialIcons  from 'svg-social-icons/lib/icons.json'
import { getLegacyUrl } from '../utils/s3-share-provider-token-service-helper'
const SocialIcon = createReactClassFactory({

  displayName: 'SocialIcon',

  getInitialState() {
    return {data: socialIcons[this.props.icon]}
  },

  clicked() {
    return window.open(this.props.url)
  },

  render() {
    return (a({className: 'social-icon', href: this.props.url, target: '_blank'},
      (div({className: 'social-container'},
        (svg({className: 'social-svg', viewBox: '0 0 64 64'},
          (g({className: 'social-svg-background'},
            (circle({cx: 32, cy: 32, r: 31}))
          )),
          (g({className: 'social-svg-icon'},
            (path({d: this.state.data.icon}))
          )),
          (g({className: 'social-svg-mask', style: {fill: this.state.data.color}},
            (path({d: this.state.data.mask}))
          ))
        ))
      ))
    ))
  }
})

const CFM_PRODUCTION = "https://cloud-file-manager.concord.org"

export default createReactClass({

  displayName: 'ShareDialogView',

  getInitialState() {
    return {
      link: this.getShareLink(),
      embed: this.getEmbed(),
      serverUrl: this.props.settings.serverUrl || "https://codap.concord.org/releases/latest/",
      serverUrlLabel: this.props.settings.serverUrlLabel || translate("~SHARE_DIALOG.LARA_CODAP_URL"),
      fullscreenScaling: true,
      graphVisToggles: false,
      tabSelected: 'link',
      isLoadingShared: false
    }
  },

  // To support legacy shares:
  getSharedDocumentId() {
    const { client } = this.props
    return client.state?.currentContent?.get("sharedDocumentId")
  },

  // New S3ShareProvider saves shareDocumentUrl
  getShareLink() {
    const { client } = this.props
    const shared = client.isShared()
    const sharedDocumentUrl = client.state?.currentContent?.get("sharedDocumentUrl")
    const sharedDocumentId = this.getSharedDocumentId()
    const useInternalLink = true
    if (shared) {
      if(sharedDocumentUrl) {
        return `${this.props.client.getCurrentUrl()}#shared=${encodeURI(sharedDocumentUrl)}`
      }
      if(sharedDocumentId) {
        if(useInternalLink) {
          return `${this.props.client.getCurrentUrl()}#shared=${sharedDocumentId}`
        }
        return getLegacyUrl(sharedDocumentId)
      }
    }
    return null
  },

  getEmbed() {
    if (this.getShareLink()) {
      return `<iframe width="398px" height="313px" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${this.getShareLink()}"></iframe>`
    } else {
      return null
    }
  },

  getLara() {
    // Update the LARA share link as per this story:
    // https://www.pivotaltracker.com/story/show/172302663
    //
    // General form of the link is:
    //  `<AutoLaunchPageUrl>?documentId=<XX>&server=<CODAP SERVER>&scaling`
    // <AutoLaunchPageUrl> expects a `documentId` param (was a path in DocStore)
    //    and a `server` param, that points usually to some CODAP release.
    // <CODAP SERVER> can have url encoded params too such as `FcfmBaseUrl=`
    // where URL is the url to the /js folder for CFM
    //
    // It will point to SPA hosted in this repo -- NP 2020-06-29
    //  1: Get the resource URL (S3 shared document public URL)
    //  2: Get the URL for the autoLauch page (hosted here ...)
    //  3: Construct a URL to <AutlaunchPage
    const autoLaunchpage = `${CFM_PRODUCTION}/autolaunch/autolaunch.html`
    const documentServer = encodeURIComponent(this.getShareLink())
    const graphVisToggles = this.state.graphVisToggles ? '?app=is' : ''
    // graphVisToggles is a parameter handled by CODAP, so it needs to be added to its URL.
    const server = encodeURIComponent(`${this.state.serverUrl}${graphVisToggles}`)
    // Other params are handled by document server itself:
    const fullscreenScaling = this.state.fullscreenScaling ? '&scaling' : ''

    return `${autoLaunchpage}?documentId=${documentServer}&server=${server}${fullscreenScaling}`
  },
  // TODO: Consider using queryparams to make URL construction less janky⬆

  // adapted from https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js
  copy(e) {
    let mark, range, selection
    e.preventDefault()
    let copied = false
    const toCopy = (() => { switch (this.state.tabSelected) {
      case 'embed': return this.getEmbed()
      case 'link': return this.getShareLink()
      case 'lara': return this.getLara()
    } })()
    try {
      mark = document.createElement('mark')
      mark.textContent = toCopy
      // reset user styles for span element
      mark.style.all = 'unset'
      // prevents scrolling to the end of the page
      mark.style.position = 'fixed'
      mark.style.top = 0
      mark.style.clip = 'rect(0, 0, 0, 0)'
      // used to preserve spaces and line breaks
      mark.style.whiteSpace = 'pre'
      // do not inherit user-select (it may be `none`)
      mark.style.webkitUserSelect = 'text'
      mark.style.MozUserSelect = 'text'
      mark.style.msUserSelect = 'text'
      mark.style.userSelect = 'text'
      document.body.appendChild(mark)

      selection = document.getSelection()
      selection.removeAllRanges()

      range = document.createRange()
      range.selectNode(mark)
      selection.addRange(range)

      return copied = document.execCommand('copy')
    } catch (error) {
      try {
        window.clipboardData.setData('text', toCopy)
        return copied = true
      } catch (error1) {
        return copied = false
      }
    }
    finally {
      if (selection) {
        if (typeof selection.removeRange === 'function') {
          selection.removeRange(range)
        } else {
          selection.removeAllRanges()
        }
      }
      if (mark) {
        document.body.removeChild(mark)
      }
      this.props.client.alert(translate(copied ? "~SHARE_DIALOG.COPY_SUCCESS" : "~SHARE_DIALOG.COPY_ERROR"), (translate("~SHARE_DIALOG.COPY_TITLE")))
    }
  },

  updateShare() {
    return this.props.client.shareUpdate()
  },

  toggleShare(e) {
    e.preventDefault()
    this.setState({
      isLoadingShared: true
    })
    return this.props.client.toggleShare(() => {
      return this.setState({
        link: this.getShareLink(),
        embed: this.getEmbed(),
        isLoadingShared: false
      })
    })
  },

  selectLinkTab() {
    return this.setState({tabSelected: 'link'})
  },

  selectEmbedTab() {
    return this.setState({tabSelected: 'embed'})
  },

  selectLaraTab() {
    return this.setState({tabSelected: 'lara'})
  },

  changedServerUrl(event) {
    return this.setState({serverUrl: event.target.value})
  },

  changedFullscreenScaling(event) {
    return this.setState({
      fullscreenScaling: event.target.checked})
  },

  changedGraphVisToggles(event) {
    return this.setState({
      graphVisToggles: event.target.checked})
  },

  render() {

    const { isLoadingShared, link } = this.state
    const sharing = link !== null

    return (ModalDialog({title: (translate('~DIALOG.SHARED')), close: this.props.close},
      (div({className: 'share-dialog'},
        (div({className: 'share-top-dialog'},
          isLoadingShared
          ? ShareLoadingView({})
          : sharing ?
            (div({},
              (div({className: 'share-status'},
                (translate("~SHARE_DIALOG.SHARE_STATE")), (strong({}, translate("~SHARE_DIALOG.SHARE_STATE_ENABLED"))),
                (a({href: '#', onClick: this.toggleShare}, translate("~SHARE_DIALOG.STOP_SHARING")))
              )),
              (div({className: 'share-button'},
                (button({onClick: this.updateShare}, translate("~SHARE_DIALOG.UPDATE_SHARING"))),
                (div({className: 'share-button-help-sharing'},
                  (a({href: this.state.link, target: '_blank'}, translate("~SHARE_DIALOG.PREVIEW_SHARING")))
                ))
              ))
            ))
          :
            (div({},
              (div({className: 'share-status'},
                (translate("~SHARE_DIALOG.SHARE_STATE")), (strong({}, translate("~SHARE_DIALOG.SHARE_STATE_DISABLED")))
              )),
              (div({className: 'share-button'},
                (button({onClick: this.toggleShare}, translate("~SHARE_DIALOG.ENABLE_SHARING"))),
                (div({className: 'share-button-help-not-sharing'}, translate("~SHARE_DIALOG.ENABLE_SHARING_MESSAGE")))
              ))
            ))
        )),
        sharing ?
          (div({},
            (ul({className: 'sharing-tabs'},
              (li({className: `sharing-tab${this.state.tabSelected === 'link' ? ' sharing-tab-selected' : ''}`, style: {marginLeft: 10}, onClick: this.selectLinkTab}, translate("~SHARE_DIALOG.LINK_TAB"))),
              (li({className: `sharing-tab sharing-tab-embed${this.state.tabSelected === 'embed' ? ' sharing-tab-selected' : ''}`, onClick: this.selectEmbedTab}, translate("~SHARE_DIALOG.EMBED_TAB"))),
              this.props.enableLaraSharing ?
                (li({className: `sharing-tab sharing-tab-lara${this.state.tabSelected === 'lara' ? ' sharing-tab-selected' : ''}`, onClick: this.selectLaraTab}, "LARA")) : undefined
            )),
            (div({className: 'sharing-tab-contents'},
              (() => { switch (this.state.tabSelected) {
                case 'embed':
                  return (div({},
                    translate("~SHARE_DIALOG.EMBED_MESSAGE"),
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, translate('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (textarea({value: this.state.embed, readOnly: true}))
                    ))
                  ))
                case 'lara':
                  return (div({},
                    translate("~SHARE_DIALOG.LARA_MESSAGE"),
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, translate('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (input({value: this.getLara(), readOnly: true}))
                    )),
                    (div({className: 'lara-settings'},
                      (div({className: 'codap-server-url'},
                        this.state.serverUrlLabel,
                        (div({},
                          (input({value: this.state.serverUrl, onChange: this.changedServerUrl}))
                        ))
                      )),
                      (div({className: 'fullsceen-scaling'},
                        (input({type: 'checkbox', checked: this.state.fullscreenScaling, onChange: this.changedFullscreenScaling})),
                        translate("~SHARE_DIALOG.LARA_FULLSCREEN_BUTTON_AND_SCALING")
                      )),
                      (div({},
                        (input({type: 'checkbox', checked: this.state.graphVisToggles, onChange: this.changedGraphVisToggles})),
                        translate("~SHARE_DIALOG.LARA_DISPLAY_VISIBILITY_TOGGLES")
                      ))
                    ))
                  ))
                default:
                  return (div({},
                    translate("~SHARE_DIALOG.LINK_MESSAGE"),
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, translate('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (input({value: this.state.link, readOnly: true}))
                    )),
                    (div({className: 'social-icons'},
                      (SocialIcon({icon: 'facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.state.link)}`})),
                      (SocialIcon({icon: 'twitter', url: `https://twitter.com/home?status=${encodeURIComponent(this.state.link)}`})))
                      // not working with url parameter: (SocialIcon {icon: 'google', url: "https://plus.google.com/share?url=#{encodeURIComponent @state.link}"})
                    )
                  ))
              } })()
            ))
          )) : undefined,

        (div({className: 'buttons'},
          (button({onClick: this.props.close}, translate('~SHARE_DIALOG.CLOSE')))
        )),
        SHOW_LONGEVITY_WARNING ? (div({className: 'longevity-warning'}, translate('~SHARE_DIALOG.LONGEVITY_WARNING'))) : undefined
      ))
    ))
  }
})
