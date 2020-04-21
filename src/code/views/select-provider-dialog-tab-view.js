const {div} = ReactDOMFactories;

const SelectProviderDialogTab = createReactClassFactory({
  displayName: 'SelectProviderDialogTab',
  render() { return (div({}, `TODO: SelectProviderDialogTab: ${this.props.provider.displayName}`)); }
});

module.exports = SelectProviderDialogTab;
