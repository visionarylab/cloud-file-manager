/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { ProviderInterface } = (require('./provider-interface'));
const { cloudContentFactory } = (require('./provider-interface'));
const { CloudMetadata } = (require('./provider-interface'));

// This provider gets created by the client when needed to open a url directly.
// It cannot be added as one of the app's list of providers

class URLProvider extends ProviderInterface {

  constructor(options, client) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('return') + 6 + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    this.options = options;
    this.client = client;
    super({
      capabilities: {
        save: false,
        resave: false,
        export: false,
        load: false,
        list: false,
        remove: false,
        rename: false,
        close: false
      }
    });
  }

  canOpenSaved() { return false; }

  openFileFromUrl(url, callback) {
    const metadata = new CloudMetadata({
      type: CloudMetadata.File,
      url,
      parent: null,
      provider: this
    });

    return $.ajax({
      dataType: 'json',
      url: metadata.url,
      success(data) {
        return callback(null, cloudContentFactory.createEnvelopedCloudContent(data), metadata);
      },
      error() { return callback(`Unable to load document from '${metadata.url}'`); }
    });
  }
}

module.exports = URLProvider;
