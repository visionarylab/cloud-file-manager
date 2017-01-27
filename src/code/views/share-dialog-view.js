let {div, input, a, button, strong, textarea, svg, g, path, span, circle, ul, li} = React.DOM;

let SHOW_LONGEVITY_WARNING = false;

let ModalDialog = React.createFactory(require('./modal-dialog-view'));
import getQueryParam from '../utils/get-query-param';

import tr from '../utils/translate';
import socialIcons from 'svg-social-icons/lib/icons.json';

let SocialIcon = React.createFactory(React.createClass({

  displayName: 'SocialIcon',

  getInitialState() {
    return {data: socialIcons[this.props.icon]};
  },

  clicked() {
    return window.open(this.props.url);
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
    ));
  }
})
);

export default React.createClass({

  displayName: 'ShareDialogView',

  getInitialState() {
    return {
      link: this.getShareLink(),
      embed: this.getEmbed(),
      lara: this.getLara({
        codapServerUrl: "https://codap.concord.org/releases/latest/",
        launchButtonText: "Launch"
      }),
      codapServerUrl: "https://codap.concord.org/releases/latest/",
      launchButtonText: "Launch",
      tabSelected: 'link'
    };
  },

  getSharedDocumentId() {
    // extract sharedDocumentId from CloudContent
    if (this.props.client.isShared()) {
      return __guard__(this.props.client.state.currentContent, x => x.get("sharedDocumentId"));
    } else {
      return null;
    }
  },

  getShareLink() {
    let sharedDocumentId = this.getSharedDocumentId();
    if (sharedDocumentId) {
      // share link combines document URL with sharedDocumentId
      return `${this.props.client.getCurrentUrl()}#shared=${sharedDocumentId}`;
    } else {
      return null;
    }
  },

  getEmbed() {
    if (this.getShareLink()) {
      return `<iframe width="398px" height="313px" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="${this.getShareLink()}"></iframe>`;
    } else {
      return null;
    }
  },

  getLara(options) {
    if (options == null) { options = null; }
    let sharedDocumentId = this.getSharedDocumentId();
    if (sharedDocumentId) {
      let documentServer = getQueryParam('documentServer') || 'https://document-store.concord.org';
      while (documentServer.substr(-1) === '/') { documentServer = documentServer.slice(0, -1); }  // remove trailing slash
      let server = encodeURIComponent((__guard__(options, x => x.hasOwnProperty('codapServerUrl')) ? options.codapServerUrl : this.state.codapServerUrl));
      let buttonText = encodeURIComponent((__guard__(options, x1 => x1.hasOwnProperty('launchButtonText')) ? options.launchButtonText : this.state.launchButtonText));
      return `${documentServer}/v2/documents/${sharedDocumentId}/launch?server=${server}&buttonText=${buttonText}`;
    } else {
      return null;
    }
  },

  // adapted from https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js
  copy(e) {
    let mark, range, selection;
    e.preventDefault();
    let copied = false;
    let toCopy = this.state[this.state.tabSelected];
    try {
      mark = document.createElement('mark');
      mark.innerText = toCopy;
      document.body.appendChild(mark);

      selection = document.getSelection();
      selection.removeAllRanges();

      range = document.createRange();
      range.selectNode(mark);
      selection.addRange(range);

      return copied = document.execCommand('copy');
    } catch (error) {
      try {
        window.clipboardData.setData('text', toCopy);
        return copied = true;
      } catch (error1) {
        return copied = false;
      }
    }
    finally {
      if (selection) {
        if (typeof selection.removeRange === 'function') {
          selection.removeRange(range);
        } else {
          selection.removeAllRanges();
        }
      }
      if (mark) {
        document.body.removeChild(mark);
      }
      this.props.client.alert(tr(copied ? "~SHARE_DIALOG.COPY_SUCCESS" : "~SHARE_DIALOG.COPY_ERROR"), (tr("~SHARE_DIALOG.COPY_TITLE")));
    }
  },

  updateShare() {
    return this.props.client.shareUpdate();
  },

  toggleShare(e) {
    e.preventDefault();
    return this.props.client.toggleShare(() => {
      return this.setState({
        link: this.getShareLink(),
        embed: this.getEmbed(),
        lara: this.getLara()
      });
    }
    );
  },

  selectLinkTab() {
    return this.setState({tabSelected: 'link'});
  },

  selectEmbedTab() {
    return this.setState({tabSelected: 'embed'});
  },

  selectLaraTab() {
    return this.setState({tabSelected: 'lara'});
  },

  changedCodapServerUrl() {
    let codapServerUrl = ReactDOM.findDOMNode(this.refs.codapServerUrl).value;
    return this.setState({
      codapServerUrl,
      lara: this.getLara({codapServerUrl})
    });
  },

  changedLaunchButtonText() {
    let launchButtonText = ReactDOM.findDOMNode(this.refs.launchButtonText).value;
    return this.setState({
      launchButtonText,
      lara: this.getLara({launchButtonText})
    });
  },

  render() {
    let sharing = this.state.link !== null;

    return (ModalDialog({title: (tr('~DIALOG.SHARED')), close: this.props.close},
      (div({className: 'share-dialog'},
        (div({className: 'share-top-dialog'},
          sharing ?
            (div({},
              (div({className: 'share-status'},
                "Shared view is ", (strong({}, "enabled")),
                (a({href: '#', onClick: this.toggleShare}, 'Stop sharing'))
              )),
              (div({className: 'share-button'},
                (button({onClick: this.updateShare}, "Update shared view")),
                (div({className: 'share-button-help-sharing'},
                  (a({href: this.state.link, target: '_blank'}, 'Preview shared view'))
                ))
              ))
            ))
          :
            (div({},
              (div({className: 'share-status'},
                "Shared view is ", (strong({}, "disabled"))
              )),
              (div({className: 'share-button'},
                (button({onClick: this.toggleShare}, "Enable sharing")),
                (div({className: 'share-button-help-not-sharing'}, "When sharing is enabled, a copy of the current view is created.  This copy can be shared."))
              ))
            ))
        )),
        sharing ?
          (div({},
            (ul({className: 'sharing-tabs'},
              (li({className: `sharing-tab${this.state.tabSelected === 'link' ? ' sharing-tab-selected' : ''}`, style: {marginLeft: 10}, onClick: this.selectLinkTab}, 'Link')),
              (li({className: `sharing-tab sharing-tab-embed${this.state.tabSelected === 'embed' ? ' sharing-tab-selected' : ''}`, onClick: this.selectEmbedTab}, 'Embed')),
              this.props.enableLaraSharing ?
                (li({className: `sharing-tab sharing-tab-lara${this.state.tabSelected === 'lara' ? ' sharing-tab-selected' : ''}`, onClick: this.selectLaraTab}, 'LARA')) : undefined
            )),
            (div({className: 'sharing-tab-contents'},
              (() => { switch (this.state.tabSelected) {
                case 'embed':
                  return (div({},
                    "Embed code for including in webpages or other web-based content",
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, tr('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (textarea({value: this.state.embed, readOnly: true}))
                    ))
                  ));
                case 'lara':
                  return (div({},
                    "Use this link when creating an activity in LARA",
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, tr('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (input({value: this.state.lara, readOnly: true}))
                    )),
                    (div({className: 'lara-settings'},
                      (div({className: 'codap-server-url'},
                        "CODAP Server URL:",
                        (div({},
                          (input({value: this.state.codapServerUrl, ref: 'codapServerUrl', onChange: this.changedCodapServerUrl}))
                        ))
                      )),
                      (div({className: 'launch-button-text'},
                        "Launch Button Text:",
                        (div({},
                          (input({value: this.state.launchButtonText, ref: 'launchButtonText', onChange: this.changedLaunchButtonText}))
                        ))
                      ))
                    ))
                  ));
                default:
                  return (div({},
                    "Paste this into an email or text message ",
                    document.execCommand || window.clipboardData ?
                      (a({className: 'copy-link', href: '#', onClick: this.copy}, tr('~SHARE_DIALOG.COPY'))) : undefined,
                    (div({},
                      (input({value: this.state.link, readOnly: true}))
                    )),
                    (div({className: 'social-icons'},
                      (SocialIcon({icon: 'facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.state.link)}`})),
                      (SocialIcon({icon: 'twitter', url: `https://twitter.com/home?status=${encodeURIComponent(this.state.link)}`})))
                      // not working with url parameter: (SocialIcon {icon: 'google', url: "https://plus.google.com/share?url=#{encodeURIComponent @state.link}"})
                    )
                  ));
              } })()
            ))
          )) : undefined,

        (div({className: 'buttons'},
          (button({onClick: this.props.close}, tr('~SHARE_DIALOG.CLOSE')))
        )),
        SHOW_LONGEVITY_WARNING ? (div({className: 'longevity-warning'}, tr('~SHARE_DIALOG.LONGEVITY_WARNING'))) : undefined
      ))
    ));
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}