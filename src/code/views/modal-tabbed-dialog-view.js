let ModalDialog = React.createFactory(require('./modal-dialog-view'));
let TabbedPanel = React.createFactory(require('./tabbed-panel-view'));

export default React.createClass({

  displayName: 'ModalTabbedDialogView',

  render() {
    return (ModalDialog({title: this.props.title, close: this.props.close},
      (TabbedPanel({tabs: this.props.tabs, selectedTabIndex: this.props.selectedTabIndex}))
    ));
  }
});
