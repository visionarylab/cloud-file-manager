{div, input, a, button, strong, textarea, svg, g, path, span, circle, ul, li} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

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
    linkTabSelected: true

  getSharedDocumentId: ->
    @props.client.state.currentContent?.get "sharedDocumentId"

  getShareLink: ->
    sharedDocumentId = @getSharedDocumentId()
    if sharedDocumentId
      "#{@props.client.getCurrentUrl()}#shared=#{sharedDocumentId}"
    else
      null

  getEmbed: ->
    if @getShareLink()
      """<iframe width="398px" height="313px" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="#{@getShareLink()}"></iframe>"""
    else
      null

  # adapted from https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js
  copy: (e) ->
    e.preventDefault()
    copied = true
    try
      mark = document.createElement 'mark'
      mark.innerHTML = @props.url
      document.body.appendChild mark

      selection = document.getSelection()
      selection.removeAllRanges()

      range = document.createRange()
      range.selectNode mark
      selection.addRange range

      copied = document.execCommand 'copy'
    catch
      try
        window.clipboardData.setData 'text', @props.url
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
      alert tr (if copied then "~SHARE_DIALOG.COPY_SUCCESS" else "~SHARE_DIALOG.COPY_ERROR")

  updateShare: ->
    @props.client.shareUpdate()

  toggleShare: (e) ->
    e.preventDefault()
    @props.client.toggleShare =>
      @setState
        link: @getShareLink()
        embed: @getEmbed()

  selectLinkTab: ->
    @setState linkTabSelected: true

  selectEmbedTab: ->
    @setState linkTabSelected: false

  render: ->
    sharing = @state.link isnt null

    (ModalDialog {title: (tr '~DIALOG.SHARED'), close: @props.close},
      (div {className: 'share-dialog'},
        (div {className: 'share-top-dialog'},
          if sharing
            (div {},
              (div {className: 'share-status'},
                "Shared view is ", (strong {}, "enabled")
                (a {href: '#', onClick: @toggleShare}, 'Stop sharing')
              )
              (div {className: 'share-button'},
                (button {onClick: @updateShare}, "Update shared view")
                (div {className: 'share-button-help-sharing'},
                  (a {href: @state.link, target: '_blank'}, 'Preview shared view')
                )
              )
            )
          else
            (div {},
              (div {className: 'share-status'},
                "Shared view is ", (strong {}, "disabled")
              )
              (div {className: 'share-button'},
                (button {onClick: @toggleShare}, "Enable sharing")
                (div {className: 'share-button-help-not-sharing'}, "When sharing is enabled, a copy of the current view is created.  This copy can be shared.")
              )
            )
        )
        if sharing
          (div {},
            (ul {className: 'sharing-tabs'},
              (li {className: "sharing-tab#{if @state.linkTabSelected then ' sharing-tab-selected' else ''}", style: {marginLeft: 10}, onClick: @selectLinkTab}, 'Link')
              (li {className: "sharing-tab sharing-tab-embed#{if not @state.linkTabSelected then ' sharing-tab-selected' else ''}", onClick: @selectEmbedTab}, 'Embed')
            )
            (div {className: 'sharing-tab-contents'},
              if @state.linkTabSelected
                (div {},
                  "Paste this into an email or text message ",
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
              else
                (div {},
                  "Embed code for including in webpages or other web-based content",
                  (div {},
                    (textarea {value: @state.embed, readOnly: true})
                  )
                )
            )
          )

        (div {className: 'buttons'},
          (button {onClick: @props.close}, tr '~SHARE_DIALOG.CLOSE')
        )
      )
    )
