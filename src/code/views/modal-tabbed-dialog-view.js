// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import modalDialogView from './modal-dialog-view'
import tabbedPanelView from './tabbed-panel-view'

const ModalDialog = createReactFactory(modalDialogView)
const TabbedPanel = createReactFactory(tabbedPanelView)

export default createReactClass({

  displayName: 'ModalTabbedDialogView',

  render() {
    return (ModalDialog({title: this.props.title, close: this.props.close},
      (TabbedPanel({tabs: this.props.tabs, selectedTabIndex: this.props.selectedTabIndex}))
    ))
  }
})
