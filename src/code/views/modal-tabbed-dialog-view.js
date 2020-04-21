// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ModalDialog = createReactFactory(require('./modal-dialog-view'));
const TabbedPanel = createReactFactory(require('./tabbed-panel-view'));

module.exports = createReactClass({

  displayName: 'ModalTabbedDialogView',

  render() {
    return (ModalDialog({title: this.props.title, close: this.props.close},
      (TabbedPanel({tabs: this.props.tabs, selectedTabIndex: this.props.selectedTabIndex}))
    ));
  }
});
