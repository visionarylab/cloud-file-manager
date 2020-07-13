import iframePhone from "iframe-phone"
import $ from "jquery"
import { fullscreenSupport } from "./fullscreen"
import { Base64 } from "js-base64"
import queryString from "query-string"

// TODO: Maybe we can remove this now that we are using queryString
function getURLParam (name) {
  const url = window.location.href;
  try {
    name = name.replace(/[[]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null
    if (!results[2]) return true
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
  }
  catch(e) {
    console.error(`couldn't find query param ${name}`)
    return null
  }
}

// Adds query params to CODAP urls
// this was taken from the document server `documents_v2_helper.rb`
// We could also add documentServer parameter, or check query params
export function codap_v2_link(codapServer) {
  const defaultCodapUrl = "https://codap.concord.org/releases/latest/"
  const extraData = {}
  // Default production pathname would be just: "/autolaunch/autolaunch.html".
  // Custom version example: "/branch/master/autolaunch/autolaunch.html".
  const customCfmVersion = window.location.pathname.replace("/autolaunch/autolaunch.html", "")
  if (customCfmVersion) {
    // define cfmBaseUrl for CODAP ONLY if we're using custom CFM version. Otherwise, let CODAP use its own CFM.
    const CFMOrigin = window.location.origin
    extraData.cfmBaseUrl = `${CFMOrigin + customCfmVersion}/js`
  }
  const baseUrl = codapServer || defaultCodapUrl
  const {url, query, fragmentIdentifier} = queryString.parseUrl(baseUrl, {fragmentIdentifier: true})
  return queryString.stringifyUrl({
    url: url,
    query: Object.assign({}, extraData, query),
    fragmentIdentifier: fragmentIdentifier
  })
}

export default function autolaunchInteractive() {

  // DOCUMENT-STORE ID, or NEW URL
  const documentId = getURLParam("documentId")

  // CODAP SERVER:
  const server = getURLParam("server")
  const launchUrl = codap_v2_link(server)

  var fullscreenScaling = getURLParam('scaling');

  var CURRENT_VS_LINKED = "Another page contains more recent data. Which would you like to use?";
  var LINKED_VS_LINKED = "There are two possibilities for continuing your work. Which version would you like to use?";

  // Update the loading message after 10 seconds
  var showTimeoutId = setTimeout(function() {
    $('#loading-text').html("Still loading!  You may want to reload this page to try again.")
  }, 10000);



  var phone = iframePhone.getIFrameEndpoint();
  // Variables below are set in `initInteractive` handler.
  var interactiveData = null;
  var directlyLinkedState = null;
  var mostRecentLinkedState = null;
  var interactiveStateAvailable = false;

  function stateValid (state) {
    return !!(state && state.docStore && state.docStore.recordid && state.docStore.accessKeys && state.docStore.accessKeys.readOnly);
  }

  function showDataSelectDialog (twoLinkedStates) {
    function showPreview (element) {
      $(element).addClass('preview-active');
      $('.overlay').show();
    }
    function hidePreview () {
      $('.preview-active').removeClass('preview-active');
      $('.overlay').hide();
    }
    function launchInt () {
      launchInteractive();
      $('.data-select-dialog').remove();
    }

    // There are two supported cases. It's either the choice between most recent linked data and the current data.
    // Or between the most recent data and data which is directly linked if given interactive doesn't have its own
    // state yet.
    if (!twoLinkedStates) {
      $('#question').text(CURRENT_VS_LINKED);
    } else {
      $('#question').text(LINKED_VS_LINKED);
    }
    var state1 = mostRecentLinkedState;
    var state2 = twoLinkedStates ? directlyLinkedState : interactiveData;

    $('.data-select-dialog').show()
    $('#state1-time').text((new Date(state1.updatedAt)).toLocaleString());
    $('#state2-time').text((new Date(state2.updatedAt)).toLocaleString());
    $('#state1-page-idx').text(state1.pageNumber);
    $('#state2-page-idx').text(state2.pageNumber);
    if (state1.pageName) {
      $('#state1-page-name').text(' - ' + state1.pageName);
    }
    if (state2.pageName) {
      $('#state2-page-name').text(' - ' + state2.pageName);
    }
    $('#state1-activity-name').text(state1.activityName);
    $('#state2-activity-name').text(state2.activityName);

    var src1 = state1.interactiveState.lara_options.reporting_url;
    var src2 = state2.interactiveState.lara_options.reporting_url;
    $('#state1-preview').attr('src', src1);
    $('#state2-preview').attr('src', src2);

    $('.overlay').on('click', hidePreview);
    $('.preview').on('click', function () {
      // eslint-disable-next-line babel/no-invalid-this
      if ($(this).hasClass('preview-active')) {
        hidePreview();
      } else {
        // eslint-disable-next-line babel/no-invalid-this
        showPreview(this);
      }
    });
    $('.preview-label').on('click', function () {
      // eslint-disable-next-line babel/no-invalid-this
      showPreview($(this).closest('.version-info').find('.preview')[0]);
    });
    $('#state1-button').on('click', function () {
      if (twoLinkedStates) {
        mostRecentLinkedState = state1;
      } else {
        // Remove existing interactive state, so the interactive will be initialized from the linked state.
        phone.post('interactiveState', null);
        interactiveStateAvailable = false;
      }
      launchInt();
    });
    $('#state2-button').on('click', function () {
      if (twoLinkedStates) {
        mostRecentLinkedState = state2;
      } else {
        // Update current state timestamp, so it will be considered to be the most recent one.
        phone.post('interactiveState', 'touch');
        mostRecentLinkedState = null;
      }
      launchInt();
    });
  }

  function sendSupportedFeaturesMsg () {
    var info = {
      apiVersion: 1,
      features: {
        interactiveState: true,
        reset: true
      }
    };
    if (fullscreenScaling) {
      info.features.aspectRatio = screen.width / screen.height;
    }
    phone.post('supportedFeatures', info);
  }

  function launchInteractive () {
    var linkedState = mostRecentLinkedState && mostRecentLinkedState.interactiveState;
    var launchParams = {url: interactiveData.interactiveStateUrl, source: documentId, collaboratorUrls: interactiveData.collaboratorUrls};
    // If there is a linked state and no interactive state then change the source document to point to the linked recordid and add the access key.
    if (stateValid(linkedState) && !interactiveStateAvailable) {
      launchParams.source = linkedState.docStore.recordid;
      launchParams.readOnlyKey = linkedState.docStore.accessKeys.readOnly;
    }
    // Interactive state saves are supported by autolaunch currently only when the app iframed by autolaunch uses
    // the Cloud File Manager (CFM).  The CFM in the iframed app handles all the state saving -- Lara only receives
    // 'nochange' or 'touch' as the state. 'touch' notifies LARA that state has been updated.
    //
    // 1. Autolaunch informs Lara that interactive state is supported using the supportedFeatures message
    // 2. Once the iframed app loads autolaunch sends a cfm::getCommands message to the iframed app and sets a
    //    iframeCanAutosave flag when a cfm::commands is received from the iframed app and the app supports cfm::autosave
    // 3. When autolaunch gets an getInteractiveState request from Lara it either
    //    a. immedatiely returns 'nochange' to Lara when the iframeCanAutosave flag isn't set
    //    b. sends a 'cfm::autosave' message to the app and then sends 'nochange' when the app returns 'cfm::autosaved'
    sendSupportedFeaturesMsg();
    var iframeCanAutosave = false;
    var iframeLoaded = function () {
      $(window).on('message', function (e) {
        var data = e.originalEvent.data
        if (data) {
          switch (data.type) {
            case 'cfm::commands':
              iframeCanAutosave = data.commands && data.commands.indexOf('cfm::autosave') !== -1;
              break;
            case 'cfm::autosaved':
              phone.post('interactiveState', data.saved ? 'touch' : 'nochange');
              break;
          }
        }
      })
      iframe.postMessage({type: 'cfm::getCommands'}, '*');

      // Hide help message that points fullscreen button when CODAP is loaded and user starts using it (mouse enter).
      // Note that there's some CSS delay, so message will actually fade out after a few seconds.
      $(window).on('mouseenter', function () {
        $('#fullscreen-help').addClass('hidden');
      });
    };

    phone.addListener('getInteractiveState', function () {
      if (iframeCanAutosave) {
        iframe.postMessage({type: 'cfm::autosave'}, '*');
      }
      else {
        phone.post('interactiveState', 'nochange');
      }
    });


    // var src = $.param.querystring(launchUrl, {launchFromLara: Base64.encode(JSON.stringify(launchParams))});
    var src = queryString.stringifyUrl({
      url: launchUrl,
      query: {
        launchFromLara: Base64.encode(JSON.stringify(launchParams))
      }
    })
    var iframe = $("#autolaunch_iframe").on('load', iframeLoaded).attr("src", src).show()[0].contentWindow;
  }

  phone.addListener('initInteractive', function (_interactiveData) {
    clearTimeout(showTimeoutId);

    interactiveData = _interactiveData;
    interactiveStateAvailable = stateValid(interactiveData.interactiveState);
    var linkedStates = interactiveData.allLinkedStates && interactiveData.allLinkedStates.filter(function (el) {
      return stateValid(el.interactiveState);
    });
    // Find linked state which is directly linked to this one. In fact it's a state which is the closest to given one
    // if there are some "gaps".
    directlyLinkedState = linkedStates && linkedStates[0];
    // Find the most recent linked state.
    mostRecentLinkedState = linkedStates && linkedStates.slice().sort(function (a, b) {
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })[0];

    // There are a few possible cases now:
    var currentDataTimestamp = interactiveStateAvailable && new Date(interactiveData.updatedAt);
    var mostRecentLinkedStateTimestamp = stateValid(mostRecentLinkedState && mostRecentLinkedState.interactiveState) && new Date(mostRecentLinkedState.updatedAt);
    var directlyLinkedStateTimestamp = stateValid(directlyLinkedState && directlyLinkedState.interactiveState) && new Date(directlyLinkedState.updatedAt);

    // Current state is available, but there's most recent data in one of the linked states. Ask user.
    if (interactiveStateAvailable && mostRecentLinkedStateTimestamp && mostRecentLinkedStateTimestamp > currentDataTimestamp) {
      showDataSelectDialog(false);
      return;
    }

    // There's no current state and directly linked interactive isn't the most recent one. Aks user.
    if (!interactiveStateAvailable &&
        directlyLinkedState !== mostRecentLinkedState &&
        directlyLinkedStateTimestamp && mostRecentLinkedStateTimestamp &&
        mostRecentLinkedStateTimestamp > directlyLinkedStateTimestamp) {
      showDataSelectDialog(true);
      return;
    }

    // Current state is available and it's the most recent one. Or there's no current state, but the directly linked
    // state is the most recent one.
    if (!interactiveStateAvailable && directlyLinkedState) {
      // Show "Copying work from..." message when it actually happens and keep it visible for 3 seconds.
      $('#copy-page-idx').text(directlyLinkedState.pageNumber);
      if (directlyLinkedState.pageName) {
        $('#copy-page-name').text(' - ' + directlyLinkedState.pageName);
      }
      $('#copy-activity-name').text(directlyLinkedState.activityName);
      $('#copy-overlay').show();
      setTimeout(function () {
        $('#copy-overlay').hide();
      }, 3000);
    }

    launchInteractive();
  });

  // TODO: there seems to be a race condition between when the page loads and when initialize can be called
  setTimeout(function () {
    phone.addListener('getInteractiveState', function () {
      // Temporary listener used only before CODAP document is loaded.
      // It always return "nochange" response. If LARA establishes connection with iframe that saves state,
      // it will block page navigation until it gets response for `getInteractiveState`. This handler ensures that
      // a response will be always delivered, even if user is stuck at data selector dialog.
      // When CODAP document is loaded, this listener will be overwritten.
      phone.post('interactiveState', 'nochange');
    });
    // Initialize connection after all message listeners are added!
    phone.initialize();
    sendSupportedFeaturesMsg();
  }, 1000);

  if (fullscreenScaling) {
    fullscreenSupport($('#autolaunch_iframe'));
  }
}

window.autolaunchInteractive = autolaunchInteractive;
