import { ProviderInterface } from './provider-interface';
import { cloudContentFactory } from './provider-interface';
import { CloudMetadata } from './provider-interface';

// This provider gets created by the client when needed to open a url directly.
// It cannot be added as one of the app's list of providers

class URLProvider extends ProviderInterface {

  constructor(options, client) {
    if (options == null) { options = {}; }
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
    this.options = options;
    this.client = client;
  }

  canOpenSaved() { return false; }

  openFileFromUrl(url, callback) {
    let metadata = new CloudMetadata({
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

export default URLProvider;
