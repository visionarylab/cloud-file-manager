{div, input, a, button, strong, textarea, svg, g, path, span, circle, ul, li} = React.DOM

SHOW_LONGEVITY_WARNING = false

ModalDialog = React.createFactory require './modal-dialog-view'
getQueryParam = require '../utils/get-query-param'

tr = require '../utils/translate'
socialIcons = require 'svg-social-icons/lib/icons.json'

SocialIcon = React.createFactory React.createClass

  displayName: 'SocialIcon'

  getInitialState: ->
    data: socialIcons[@props.icon]

  clicked: ->
    window.open @props.url

  render: ->
    (a {className: 'social-icon', href: @props.url, target: '_blank'},
      (div {className: 'social-container'},
        (svg {className: 'social-svg', viewBox: '0 0 64 64'},
          (g {className: 'social-svg-background'},
            (circle {cx: 32, cy: 32, r: 31})
          )
          (g {className: 'social-svg-icon'},
            (path {d: @state.data.icon})
          )
          (g {className: 'social-svg-mask', style: {fill: @state.data.color}},
            (path {d: @state.data.mask})
          )
        )
      )
    )

module.exports = React.createClass

  displayName: 'ShareDialogView'

  getInitialState: ->
    link: @getShareLink()
    embed: @getEmbed()
    pageType: "autolaunch"
    codapServerUrl: "https://codap.concord.org/releases/latest/"
    launchButtonText: "Launch"
    fullscreenScaling: true
    graphVisToggles: false
    tabSelected: 'link'

  getSharedDocumentId: ->
    # extract sharedDocumentId from CloudContent
    if @props.client.isShared()
      @props.client.state.currentContent?.get "sharedDocumentId"
    else
      null

  getShareLink: ->
    sharedDocumentId = @getSharedDocumentId()
    if sharedDocumentId
      # share link combines document URL with sharedDocumentId
      "#{@props.client.getCurrentUrl()}#shared=#{sharedDocumentId}"
    else
      null

  getEmbed: ->
    if @getShareLink()
      """<iframe width="398px" height="313px" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="#{@getShareLink()}"></iframe>"""
    else
      null

  getLara: ->
    sharedDocumentId = @getSharedDocumentId()
    if sharedDocumentId
      documentServer = getQueryParam('documentServer') or 'https://document-store.concord.org'
      documentServer = documentServer.slice(0, -1) while documentServer.substr(-1) is '/'  # remove trailing slash
      graphVisToggles = if @state.graphVisToggles then '?app=is' else ''
      # graphVisToggles is a parameter handled by CODAP, so it needs to be added to its URL.
      server = encodeURIComponent(@state.codapServerUrl + graphVisToggles)
      # Other params are handled by document server itself:
      buttonText = if @state.pageType is 'launch' then "&buttonText=#{encodeURIComponent(@state.launchButtonText)}" else ''
      fullscreenScaling = if @state.pageType is 'autolaunch' and @state.fullscreenScaling then '&scaling' else ''
      "#{documentServer}/v2/documents/#{sharedDocumentId}/#{@state.pageType}?server=#{server}#{buttonText}#{fullscreenScaling}"
    else
      null

  # adapted from https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js
  copy: (e) ->
    e.preventDefault()
    copied = false
    toCopy = switch @state.tabSelected
      when 'embed' then @getEmbed()
      when 'link' then @getShareLink()
      when 'lara' then @getLara()
    try
      mark = document.createElement 'mark'
      mark.innerText = toCopy
      document.body.appendChild mark

      selection = document.getSelection()
      selection.removeAllRanges()

      range = document.createRange()
      range.selectNode mark
      selection.addRange range

      copied = document.execCommand 'copy'
    catch
      try
        window.clipboardData.setData 'text', toCopy
        copied = true
      catch
        copied = false
    finally
      if selection
        if typeof selection.removeRange is 'function'
          selection.removeRange range
        else
          selection.removeAllRanges()
      if mark
        document.body.removeChild mark
      @props.client.alert tr(if copied then "~SHARE_DIALOG.COPY_SUCCESS" else "~SHARE_DIALOG.COPY_ERROR"), (tr "~SHARE_DIALOG.COPY_TITLE")

  updateShare: ->
    @props.client.shareUpdate()

  toggleShare: (e) ->
    e.preventDefault()
    @props.client.toggleShare =>
      @setState
        link: @getShareLink()
        embed: @getEmbed()

  selectLinkTab: ->
    @setState tabSelected: 'link'

  selectEmbedTab: ->
    @setState tabSelected: 'embed'

  selectLaraTab: ->
    @setState tabSelected: 'lara'

  changedCodapServerUrl: (event) ->
    @setState
      codapServerUrl: event.target.value

  changedLaunchButtonText: (event) ->
    @setState
      launchButtonText: event.target.value

  changedAutoscalingPage: (event) ->
    @setState
      pageType: if event.target.checked then 'autolaunch' else 'launch'

  changedFullscreenScaling: (event) ->
    @setState
      fullscreenScaling: event.target.checked

  changedGraphVisToggles: (event) ->
    @setState
      graphVisToggles: event.target.checked

  render: ->
    sharing = @state.link isnt null

    (ModalDialog {title: (tr '~DIALOG.SHARED'), close: @props.close},
      (div {className: 'share-dialog'},
        (div {className: 'share-top-dialog'},
          if sharing
            (div {},
              (div {className: 'share-status'},
                (tr "~SHARE_DIALOG.SHARE_STATE"), (strong {}, tr "~SHARE_DIALOG.SHARE_STATE_ENABLED")
                (a {href: '#', onClick: @toggleShare}, tr "~SHARE_DIALOG.STOP_SHARING")
              )
              (div {className: 'share-button'},
                (button {onClick: @updateShare}, tr "~SHARE_DIALOG.UPDATE_SHARING")
                (div {className: 'share-button-help-sharing'},
                  (a {href: @state.link, target: '_blank'}, tr "~SHARE_DIALOG.PREVIEW_SHARING")
                )
              )
            )
          else
            (div {},
              (div {className: 'share-status'},
                (tr "~SHARE_DIALOG.SHARE_STATE"), (strong {}, tr "~SHARE_DIALOG.SHARE_STATE_DISABLED")
              )
              (div {className: 'share-button'},
                (button {onClick: @toggleShare}, tr "~SHARE_DIALOG.ENABLE_SHARING")
                (div {className: 'share-button-help-not-sharing'}, tr "~SHARE_DIALOG.ENABLE_SHARING_MESSAGE")
              )
            )
        )
        if sharing
          (div {},
            (ul {className: 'sharing-tabs'},
              (li {className: "sharing-tab#{if @state.tabSelected is 'link' then ' sharing-tab-selected' else ''}", style: {marginLeft: 10}, onClick: @selectLinkTab}, tr "~SHARE_DIALOG.LINK_TAB")
              (li {className: "sharing-tab sharing-tab-embed#{if @state.tabSelected is 'embed' then ' sharing-tab-selected' else ''}", onClick: @selectEmbedTab}, tr "~SHARE_DIALOG.EMBED_TAB")
              if @props.enableLaraSharing
                (li {className: "sharing-tab sharing-tab-lara#{if @state.tabSelected is 'lara' then ' sharing-tab-selected' else ''}", onClick: @selectLaraTab}, "LARA")
            )
            (div {className: 'sharing-tab-contents'},
              switch @state.tabSelected
                when 'embed'
                  (div {},
                    tr "~SHARE_DIALOG.EMBED_MESSAGE",
                    if document.execCommand or window.clipboardData
                      (a {className: 'copy-link', href: '#', onClick: @copy}, tr '~SHARE_DIALOG.COPY')
                    (div {},
                      (textarea {value: @state.embed, readOnly: true})
                    )
                  )
                when 'lara'
                  (div {},
                    "Use this link when creating an activity in LARA",
                    if document.execCommand or window.clipboardData
                      (a {className: 'copy-link', href: '#', onClick: @copy}, tr '~SHARE_DIALOG.COPY')
                    (div {},
                      (input {value: @getLara(), readOnly: true})
                    )
                    (div {className: 'lara-settings'},
                      (div {className: 'codap-server-url'},
                        tr "~SHARE_DIALOG.LARA_CODAP_URL"
                        (div {},
                          (input {value: @state.codapServerUrl, onChange: @changedCodapServerUrl})
                        )
                      )
                      (div {className: 'autolaunch'},
                        (input {type: 'checkbox', checked: @state.pageType is 'autolaunch', onChange: @changedAutoscalingPage})
                        tr "~SHARE_DIALOG.LARA_AUTOLAUNCH_PAGE"
                      )
                      if @state.pageType is 'autolaunch'
                        (div {className: 'fullsceen-scaling'},
                          (input {type: 'checkbox', checked: @state.fullscreenScaling, onChange: @changedFullscreenScaling})
                          tr "~SHARE_DIALOG.LARA_FULLSCREEN_BUTTON_AND_SCALING"
                        )
                      if @state.pageType is 'launch'
                        (div {className: 'launch-button-text'},
                          tr "~SHARE_DIALOG.LARA_LAUNCH_BUTTON_TEXT"
                          (input {value: @state.launchButtonText, onChange: @changedLaunchButtonText})
                        )
                      (div {},
                        (input {type: 'checkbox', checked: @state.graphVisToggles, onChange: @changedGraphVisToggles})
                        tr "~SHARE_DIALOG.LARA_DISPLAY_VISIBILITY_TOGGLES"
                      )
                    )
                  )
                else
                  (div {},
                    tr "~SHARE_DIALOG.LINK_MESSAGE",
                    if document.execCommand or window.clipboardData
                      (a {className: 'copy-link', href: '#', onClick: @copy}, tr '~SHARE_DIALOG.COPY')
                    (div {},
                      (input {value: @state.link, readOnly: true})
                    )
                    (div {className: 'social-icons'},
                      (SocialIcon {icon: 'facebook', url: "https://www.facebook.com/sharer/sharer.php?u=#{encodeURIComponent @state.link}"})
                      (SocialIcon {icon: 'twitter', url: "https://twitter.com/home?status=#{encodeURIComponent @state.link}"})
                      # not working with url parameter: (SocialIcon {icon: 'google', url: "https://plus.google.com/share?url=#{encodeURIComponent @state.link}"})
                    )
                  )
            )
          )

        (div {className: 'buttons'},
          (button {onClick: @props.close}, tr '~SHARE_DIALOG.CLOSE')
        )
        (div {className: 'longevity-warning'}, tr '~SHARE_DIALOG.LONGEVITY_WARNING') if SHOW_LONGEVITY_WARNING
      )
    )
