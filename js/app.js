(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu, getHashParam;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

getHashParam = require('./utils/get-hash-param');

CloudFileManager = (function() {
  function CloudFileManager(options) {
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;
    this.client = new CloudFileManagerClient();
    this.appOptions = {};
  }

  CloudFileManager.prototype.init = function(appOptions, usingIframe) {
    this.appOptions = appOptions;
    if (usingIframe == null) {
      usingIframe = false;
    }
    this.appOptions.usingIframe = usingIframe;
    return this.client.setAppOptions(this.appOptions);
  };

  CloudFileManager.prototype.createFrame = function(appOptions, elemId, eventCallback) {
    this.appOptions = appOptions;
    if (eventCallback == null) {
      eventCallback = null;
    }
    this.init(this.appOptions, true);
    this.client.listen(eventCallback);
    return this._renderApp(document.getElementById(elemId));
  };

  CloudFileManager.prototype.clientConnect = function(eventCallback) {
    var copyParams, fileParams, providerName, providerParams, ref, sharedContentId;
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    this.client.listen(eventCallback);
    this.client.connect();
    sharedContentId = getHashParam("shared");
    fileParams = getHashParam("file");
    copyParams = getHashParam("copy");
    if (sharedContentId) {
      return this.client.openSharedContent(sharedContentId);
    } else if (fileParams) {
      ref = fileParams.split(':'), providerName = ref[0], providerParams = ref[1];
      return this.client.openProviderFile(providerName, providerParams);
    } else if (copyParams) {
      return this.client.openCopiedFile(copyParams);
    }
  };

  CloudFileManager.prototype._createHiddenApp = function() {
    var anchor;
    anchor = document.createElement("div");
    document.body.appendChild(anchor);
    return this._renderApp(anchor);
  };

  CloudFileManager.prototype._renderApp = function(anchor) {
    this.appOptions.client = this.client;
    return React.render(AppView(this.appOptions), anchor);
  };

  return CloudFileManager;

})();

module.exports = new CloudFileManager();



},{"./client":31,"./ui":38,"./utils/get-hash-param":39,"./views/app-view":43}],2:[function(require,module,exports){
// See: http://code.google.com/p/google-diff-match-patch/wiki/API
"use strict";

exports.__esModule = true;
exports.convertChangesToDMP = convertChangesToDMP;

function convertChangesToDMP(changes) {
  var ret = [],
      change = undefined,
      operation = undefined;
  for (var i = 0; i < changes.length; i++) {
    change = changes[i];
    if (change.added) {
      operation = 1;
    } else if (change.removed) {
      operation = -1;
    } else {
      operation = 0;
    }

    ret.push([operation, change.value]);
  }
  return ret;
}


},{}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.convertChangesToXML = convertChangesToXML;

function convertChangesToXML(changes) {
  var ret = [];
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    if (change.added) {
      ret.push('<ins>');
    } else if (change.removed) {
      ret.push('<del>');
    }

    ret.push(escapeHTML(change.value));

    if (change.added) {
      ret.push('</ins>');
    } else if (change.removed) {
      ret.push('</del>');
    }
  }
  return ret.join('');
}

function escapeHTML(s) {
  var n = s;
  n = n.replace(/&/g, '&amp;');
  n = n.replace(/</g, '&lt;');
  n = n.replace(/>/g, '&gt;');
  n = n.replace(/"/g, '&quot;');

  return n;
}


},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = Diff;

function Diff() {}

Diff.prototype = {
  diff: function diff(oldString, newString) {
    var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var callback = options.callback;
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    this.options = options;

    var self = this;

    function done(value) {
      if (callback) {
        setTimeout(function () {
          callback(undefined, value);
        }, 0);
        return true;
      } else {
        return value;
      }
    }

    // Allow subclasses to massage the input prior to running
    oldString = this.castInput(oldString);
    newString = this.castInput(newString);

    oldString = this.removeEmpty(this.tokenize(oldString));
    newString = this.removeEmpty(this.tokenize(newString));

    var newLen = newString.length,
        oldLen = oldString.length;
    var editLength = 1;
    var maxEditLength = newLen + oldLen;
    var bestPath = [{ newPos: -1, components: [] }];

    // Seed editLength = 0, i.e. the content starts with the same values
    var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
      // Identity per the equality and tokenizer
      return done([{ value: newString.join(''), count: newString.length }]);
    }

    // Main worker method. checks all permutations of a given edit length for acceptance.
    function execEditLength() {
      for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
        var basePath = undefined;
        var addPath = bestPath[diagonalPath - 1],
            removePath = bestPath[diagonalPath + 1],
            _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
        if (addPath) {
          // No one else is going to attempt to use this value, clear it
          bestPath[diagonalPath - 1] = undefined;
        }

        var canAdd = addPath && addPath.newPos + 1 < newLen,
            canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;
        if (!canAdd && !canRemove) {
          // If this path is a terminal then prune
          bestPath[diagonalPath] = undefined;
          continue;
        }

        // Select the diagonal that we want to branch from. We select the prior
        // path whose position in the new string is the farthest from the origin
        // and does not pass the bounds of the diff graph
        if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
          basePath = clonePath(removePath);
          self.pushComponent(basePath.components, undefined, true);
        } else {
          basePath = addPath; // No need to clone, we've pulled it from the list
          basePath.newPos++;
          self.pushComponent(basePath.components, true, undefined);
        }

        _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath);

        // If we have hit the end of both strings, then we are done
        if (basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) {
          return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
        } else {
          // Otherwise track this path as a potential candidate and continue.
          bestPath[diagonalPath] = basePath;
        }
      }

      editLength++;
    }

    // Performs the length of edit iteration. Is a bit fugly as this has to support the
    // sync and async mode which is never fun. Loops over execEditLength until a value
    // is produced.
    if (callback) {
      (function exec() {
        setTimeout(function () {
          // This should not happen, but we want to be safe.
          /* istanbul ignore next */
          if (editLength > maxEditLength) {
            return callback();
          }

          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength) {
        var ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  },

  pushComponent: function pushComponent(components, added, removed) {
    var last = components[components.length - 1];
    if (last && last.added === added && last.removed === removed) {
      // We need to clone here as the component clone operation is just
      // as shallow array clone
      components[components.length - 1] = { count: last.count + 1, added: added, removed: removed };
    } else {
      components.push({ count: 1, added: added, removed: removed });
    }
  },
  extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
    var newLen = newString.length,
        oldLen = oldString.length,
        newPos = basePath.newPos,
        oldPos = newPos - diagonalPath,
        commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
      newPos++;
      oldPos++;
      commonCount++;
    }

    if (commonCount) {
      basePath.components.push({ count: commonCount });
    }

    basePath.newPos = newPos;
    return oldPos;
  },

  equals: function equals(left, right) {
    return left === right;
  },
  removeEmpty: function removeEmpty(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  },
  castInput: function castInput(value) {
    return value;
  },
  tokenize: function tokenize(value) {
    return value.split('');
  }
};

function buildValues(diff, components, newString, oldString, useLongestToken) {
  var componentPos = 0,
      componentLen = components.length,
      newPos = 0,
      oldPos = 0;

  for (; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (!component.removed) {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function (value, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value.length ? oldValue : value;
        });

        component.value = value.join('');
      } else {
        component.value = newString.slice(newPos, newPos + component.count).join('');
      }
      newPos += component.count;

      // Common case
      if (!component.added) {
        oldPos += component.count;
      }
    } else {
      component.value = oldString.slice(oldPos, oldPos + component.count).join('');
      oldPos += component.count;

      // Reverse add and remove so removes are output first to match common convention
      // The diffing algorithm is tied to add then remove output and this is the simplest
      // route to get the desired output with minimal overhead.
      if (componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos];
        components[componentPos] = tmp;
      }
    }
  }

  // Special case handle for when one terminal is ignored. For this case we merge the
  // terminal into the prior string and drop the change.
  var lastComponent = components[componentLen - 1];
  if ((lastComponent.added || lastComponent.removed) && diff.equals('', lastComponent.value)) {
    components[componentLen - 2].value += lastComponent.value;
    components.pop();
  }

  return components;
}

function clonePath(path) {
  return { newPos: path.newPos, components: path.components.slice(0) };
}
module.exports = exports['default'];


},{}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffChars = diffChars;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var characterDiff = new _base2['default']();
exports.characterDiff = characterDiff;

function diffChars(oldStr, newStr, callback) {
  return characterDiff.diff(oldStr, newStr, callback);
}


},{"./base":4}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffCss = diffCss;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var cssDiff = new _base2['default']();
exports.cssDiff = cssDiff;
cssDiff.tokenize = function (value) {
  return value.split(/([{}:;,]|\s+)/);
};

function diffCss(oldStr, newStr, callback) {
  return cssDiff.diff(oldStr, newStr, callback);
}


},{"./base":4}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffJson = diffJson;
exports.canonicalize = canonicalize;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _line = require('./line');

var objectPrototypeToString = Object.prototype.toString;

var jsonDiff = new _base2['default']();
exports.jsonDiff = jsonDiff;
// Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
// dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
jsonDiff.useLongestToken = true;

jsonDiff.tokenize = _line.lineDiff.tokenize;
jsonDiff.castInput = function (value) {
  return typeof value === 'string' ? value : JSON.stringify(canonicalize(value), undefined, '  ');
};
jsonDiff.equals = function (left, right) {
  return _base2['default'].prototype.equals(left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'));
};

function diffJson(oldObj, newObj, callback) {
  return jsonDiff.diff(oldObj, newObj, callback);
}

// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed.

function canonicalize(obj, stack, replacementStack) {
  stack = stack || [];
  replacementStack = replacementStack || [];

  var i = undefined;

  for (i = 0; i < stack.length; i += 1) {
    if (stack[i] === obj) {
      return replacementStack[i];
    }
  }

  var canonicalizedObj = undefined;

  if ('[object Array]' === objectPrototypeToString.call(obj)) {
    stack.push(obj);
    canonicalizedObj = new Array(obj.length);
    replacementStack.push(canonicalizedObj);
    for (i = 0; i < obj.length; i += 1) {
      canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
  } else if (typeof obj === 'object' && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    replacementStack.push(canonicalizedObj);
    var sortedKeys = [],
        key = undefined;
    for (key in obj) {
      /* istanbul ignore else */
      if (obj.hasOwnProperty(key)) {
        sortedKeys.push(key);
      }
    }
    sortedKeys.sort();
    for (i = 0; i < sortedKeys.length; i += 1) {
      key = sortedKeys[i];
      canonicalizedObj[key] = canonicalize(obj[key], stack, replacementStack);
    }
    stack.pop();
    replacementStack.pop();
  } else {
    canonicalizedObj = obj;
  }
  return canonicalizedObj;
}


},{"./base":4,"./line":8}],8:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffLines = diffLines;
exports.diffTrimmedLines = diffTrimmedLines;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _utilParams = require('../util/params');

var lineDiff = new _base2['default']();
exports.lineDiff = lineDiff;
lineDiff.tokenize = function (value) {
  var retLines = [],
      linesAndNewlines = value.split(/(\n|\r\n)/);

  // Ignore the final empty token that occurs if the string ends with a new line
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }

  // Merge the content and line separators into single tokens
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line = linesAndNewlines[i];

    if (i % 2 && !this.options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      if (this.options.ignoreWhitespace) {
        line = line.trim();
      }
      retLines.push(line);
    }
  }

  return retLines;
};

function diffLines(oldStr, newStr, callback) {
  return lineDiff.diff(oldStr, newStr, callback);
}

function diffTrimmedLines(oldStr, newStr, callback) {
  var options = _utilParams.generateOptions(callback, { ignoreWhitespace: true });
  return lineDiff.diff(oldStr, newStr, options);
}


},{"../util/params":16,"./base":4}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffSentences = diffSentences;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var sentenceDiff = new _base2['default']();
exports.sentenceDiff = sentenceDiff;
sentenceDiff.tokenize = function (value) {
  return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};

function diffSentences(oldStr, newStr, callback) {
  return sentenceDiff.diff(oldStr, newStr, callback);
}


},{"./base":4}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.diffWords = diffWords;
exports.diffWordsWithSpace = diffWordsWithSpace;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _utilParams = require('../util/params');

// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Ranges and exceptions:
// Latin-1 Supplement, 0080–00FF
//  - U+00D7  × Multiplication sign
//  - U+00F7  ÷ Division sign
// Latin Extended-A, 0100–017F
// Latin Extended-B, 0180–024F
// IPA Extensions, 0250–02AF
// Spacing Modifier Letters, 02B0–02FF
//  - U+02C7  ˇ &#711;  Caron
//  - U+02D8  ˘ &#728;  Breve
//  - U+02D9  ˙ &#729;  Dot Above
//  - U+02DA  ˚ &#730;  Ring Above
//  - U+02DB  ˛ &#731;  Ogonek
//  - U+02DC  ˜ &#732;  Small Tilde
//  - U+02DD  ˝ &#733;  Double Acute Accent
// Latin Extended Additional, 1E00–1EFF
var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;

var reWhitespace = /\S/;

var wordDiff = new _base2['default']();
exports.wordDiff = wordDiff;
wordDiff.equals = function (left, right) {
  return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
};
wordDiff.tokenize = function (value) {
  var tokens = value.split(/(\s+|\b)/);

  // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.
  for (var i = 0; i < tokens.length - 1; i++) {
    // If we have an empty string in the next field and we have only word chars before and after, merge
    if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
      tokens[i] += tokens[i + 2];
      tokens.splice(i + 1, 2);
      i--;
    }
  }

  return tokens;
};

function diffWords(oldStr, newStr, callback) {
  var options = _utilParams.generateOptions(callback, { ignoreWhitespace: true });
  return wordDiff.diff(oldStr, newStr, options);
}

function diffWordsWithSpace(oldStr, newStr, callback) {
  return wordDiff.diff(oldStr, newStr, callback);
}


},{"../util/params":16,"./base":4}],11:[function(require,module,exports){
/* See LICENSE file for terms of use */

/*
 * Text diff implementation.
 *
 * This library supports the following APIS:
 * JsDiff.diffChars: Character by character diff
 * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
 * JsDiff.diffLines: Line based diff
 *
 * JsDiff.diffCss: Diff targeted at CSS content
 *
 * These methods are based on the implementation proposed in
 * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
 */
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _diffBase = require('./diff/base');

var _diffBase2 = _interopRequireDefault(_diffBase);

var _diffCharacter = require('./diff/character');

var _diffWord = require('./diff/word');

var _diffLine = require('./diff/line');

var _diffSentence = require('./diff/sentence');

var _diffCss = require('./diff/css');

var _diffJson = require('./diff/json');

var _patchApply = require('./patch/apply');

var _patchParse = require('./patch/parse');

var _patchCreate = require('./patch/create');

var _convertDmp = require('./convert/dmp');

var _convertXml = require('./convert/xml');

exports.Diff = _diffBase2['default'];
exports.diffChars = _diffCharacter.diffChars;
exports.diffWords = _diffWord.diffWords;
exports.diffWordsWithSpace = _diffWord.diffWordsWithSpace;
exports.diffLines = _diffLine.diffLines;
exports.diffTrimmedLines = _diffLine.diffTrimmedLines;
exports.diffSentences = _diffSentence.diffSentences;
exports.diffCss = _diffCss.diffCss;
exports.diffJson = _diffJson.diffJson;
exports.structuredPatch = _patchCreate.structuredPatch;
exports.createTwoFilesPatch = _patchCreate.createTwoFilesPatch;
exports.createPatch = _patchCreate.createPatch;
exports.applyPatch = _patchApply.applyPatch;
exports.applyPatches = _patchApply.applyPatches;
exports.parsePatch = _patchParse.parsePatch;
exports.convertChangesToDMP = _convertDmp.convertChangesToDMP;
exports.convertChangesToXML = _convertXml.convertChangesToXML;
exports.canonicalize = _diffJson.canonicalize;


},{"./convert/dmp":2,"./convert/xml":3,"./diff/base":4,"./diff/character":5,"./diff/css":6,"./diff/json":7,"./diff/line":8,"./diff/sentence":9,"./diff/word":10,"./patch/apply":12,"./patch/create":13,"./patch/parse":14}],12:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.applyPatch = applyPatch;
exports.applyPatches = applyPatches;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parse = require('./parse');

var _utilDistanceIterator = require('../util/distance-iterator');

var _utilDistanceIterator2 = _interopRequireDefault(_utilDistanceIterator);

function applyPatch(source, uniDiff) {
  var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  if (typeof uniDiff === 'string') {
    uniDiff = _parse.parsePatch(uniDiff);
  }

  if (Array.isArray(uniDiff)) {
    if (uniDiff.length > 1) {
      throw new Error('applyPatch only works with a single input.');
    }

    uniDiff = uniDiff[0];
  }

  // Apply the diff to the input
  var lines = source.split('\n'),
      hunks = uniDiff.hunks,
      compareLine = options.compareLine || function (lineNumber, line, operation, patchContent) {
    return line === patchContent;
  },
      errorCount = 0,
      fuzzFactor = options.fuzzFactor || 0,
      minLine = 0,
      offset = 0,
      removeEOFNL = undefined,
      addEOFNL = undefined;

  /**
   * Checks if the hunk exactly fits on the provided location
   */
  function hunkFits(hunk, toPos) {
    for (var j = 0; j < hunk.lines.length; j++) {
      var line = hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ' || operation === '-') {
        // Context sanity check
        if (!compareLine(toPos + 1, lines[toPos], operation, content)) {
          errorCount++;

          if (errorCount > fuzzFactor) {
            return false;
          }
        }
        toPos++;
      }
    }

    return true;
  }

  // Search best fit offsets for each hunk based on the previous ones
  for (var i = 0; i < hunks.length; i++) {
    var hunk = hunks[i],
        maxLine = lines.length - hunk.oldLines,
        localOffset = 0,
        toPos = offset + hunk.oldStart - 1;

    var iterator = _utilDistanceIterator2['default'](toPos, minLine, maxLine);

    for (; localOffset !== undefined; localOffset = iterator()) {
      if (hunkFits(hunk, toPos + localOffset)) {
        hunk.offset = offset += localOffset;
        break;
      }
    }

    if (localOffset === undefined) {
      return false;
    }

    // Set lower text limit to end of the current hunk, so next ones don't try
    // to fit over already patched text
    minLine = hunk.offset + hunk.oldStart + hunk.oldLines;
  }

  // Apply patch hunks
  for (var i = 0; i < hunks.length; i++) {
    var hunk = hunks[i],
        toPos = hunk.offset + hunk.newStart - 1;

    for (var j = 0; j < hunk.lines.length; j++) {
      var line = hunk.lines[j],
          operation = line[0],
          content = line.substr(1);

      if (operation === ' ') {
        toPos++;
      } else if (operation === '-') {
        lines.splice(toPos, 1);
        /* istanbul ignore else */
      } else if (operation === '+') {
          lines.splice(toPos, 0, content);
          toPos++;
        } else if (operation === '\\') {
          var previousOperation = hunk.lines[j - 1] ? hunk.lines[j - 1][0] : null;
          if (previousOperation === '+') {
            removeEOFNL = true;
          } else if (previousOperation === '-') {
            addEOFNL = true;
          }
        }
    }
  }

  // Handle EOFNL insertion/removal
  if (removeEOFNL) {
    while (!lines[lines.length - 1]) {
      lines.pop();
    }
  } else if (addEOFNL) {
    lines.push('');
  }
  return lines.join('\n');
}

// Wrapper that supports multiple file patches via callbacks.

function applyPatches(uniDiff, options) {
  if (typeof uniDiff === 'string') {
    uniDiff = _parse.parsePatch(uniDiff);
  }

  var currentIndex = 0;
  function processIndex() {
    var index = uniDiff[currentIndex++];
    if (!index) {
      return options.complete();
    }

    options.loadFile(index, function (err, data) {
      if (err) {
        return options.complete(err);
      }

      var updatedContent = applyPatch(data, index, options);
      options.patched(index, updatedContent);

      setTimeout(processIndex, 0);
    });
  }
  processIndex();
}


},{"../util/distance-iterator":15,"./parse":14}],13:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.structuredPatch = structuredPatch;
exports.createTwoFilesPatch = createTwoFilesPatch;
exports.createPatch = createPatch;
// istanbul ignore next

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _diffLine = require('../diff/line');

function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (!options) {
    options = { context: 4 };
  }

  var diff = _diffLine.diffLines(oldStr, newStr);
  diff.push({ value: '', lines: [] }); // Append an empty value to make cleanup easier

  function contextLines(lines) {
    return lines.map(function (entry) {
      return ' ' + entry;
    });
  }

  var hunks = [];
  var oldRangeStart = 0,
      newRangeStart = 0,
      curRange = [],
      oldLine = 1,
      newLine = 1;

  var _loop = function (i) {
    var current = diff[i],
        lines = current.lines || current.value.replace(/\n$/, '').split('\n');
    current.lines = lines;

    if (current.added || current.removed) {
      // istanbul ignore next

      var _curRange;

      // If we have previous context, start with that
      if (!oldRangeStart) {
        var prev = diff[i - 1];
        oldRangeStart = oldLine;
        newRangeStart = newLine;

        if (prev) {
          curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [];
          oldRangeStart -= curRange.length;
          newRangeStart -= curRange.length;
        }
      }

      // Output our changes
      (_curRange = curRange).push.apply(_curRange, _toConsumableArray(lines.map(function (entry) {
        return (current.added ? '+' : '-') + entry;
      })));

      // Track the updated file position
      if (current.added) {
        newLine += lines.length;
      } else {
        oldLine += lines.length;
      }
    } else {
      // Identical context lines. Track line changes
      if (oldRangeStart) {
        // Close out any changes that have been output (or join overlapping)
        if (lines.length <= options.context * 2 && i < diff.length - 2) {
          // istanbul ignore next

          var _curRange2;

          // Overlapping
          (_curRange2 = curRange).push.apply(_curRange2, _toConsumableArray(contextLines(lines)));
        } else {
          // istanbul ignore next

          var _curRange3;

          // end the range and output
          var contextSize = Math.min(lines.length, options.context);
          (_curRange3 = curRange).push.apply(_curRange3, _toConsumableArray(contextLines(lines.slice(0, contextSize))));

          var hunk = {
            oldStart: oldRangeStart,
            oldLines: oldLine - oldRangeStart + contextSize,
            newStart: newRangeStart,
            newLines: newLine - newRangeStart + contextSize,
            lines: curRange
          };
          if (i >= diff.length - 2 && lines.length <= options.context) {
            // EOF is inside this hunk
            var oldEOFNewline = /\n$/.test(oldStr);
            var newEOFNewline = /\n$/.test(newStr);
            if (lines.length == 0 && !oldEOFNewline) {
              // special case: old has no eol and no trailing context; no-nl can end up before adds
              curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file');
            } else if (!oldEOFNewline || !newEOFNewline) {
              curRange.push('\\ No newline at end of file');
            }
          }
          hunks.push(hunk);

          oldRangeStart = 0;
          newRangeStart = 0;
          curRange = [];
        }
      }
      oldLine += lines.length;
      newLine += lines.length;
    }
  };

  for (var i = 0; i < diff.length; i++) {
    _loop(i);
  }

  return {
    oldFileName: oldFileName, newFileName: newFileName,
    oldHeader: oldHeader, newHeader: newHeader,
    hunks: hunks
  };
}

function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  var diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);

  var ret = [];
  if (oldFileName == newFileName) {
    ret.push('Index: ' + oldFileName);
  }
  ret.push('===================================================================');
  ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader));
  ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader));

  for (var i = 0; i < diff.hunks.length; i++) {
    var hunk = diff.hunks[i];
    ret.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
    ret.push.apply(ret, hunk.lines);
  }

  return ret.join('\n') + '\n';
}

function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
  return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
}


},{"../diff/line":8}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.parsePatch = parsePatch;

function parsePatch(uniDiff) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var diffstr = uniDiff.split('\n'),
      list = [],
      i = 0;

  function parseIndex() {
    var index = {};
    list.push(index);

    // Parse diff metadata
    while (i < diffstr.length) {
      var line = diffstr[i];

      // File header found, end parsing diff metadata
      if (/^(\-\-\-|\+\+\+|@@)\s/.test(line)) {
        break;
      }

      // Diff index
      var header = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(line);
      if (header) {
        index.index = header[1];
      }

      i++;
    }

    // Parse file headers if they are defined. Unified diff requires them, but
    // there's no technical issues to have an isolated hunk without file header
    parseFileHeader(index);
    parseFileHeader(index);

    // Parse hunks
    index.hunks = [];

    while (i < diffstr.length) {
      var line = diffstr[i];

      if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(line)) {
        break;
      } else if (/^@@/.test(line)) {
        index.hunks.push(parseHunk());
      } else if (line && options.strict) {
        // Ignore unexpected content unless in strict mode
        throw new Error('Unknown line ' + (i + 1) + ' ' + JSON.stringify(line));
      } else {
        i++;
      }
    }
  }

  // Parses the --- and +++ headers, if none are found, no lines
  // are consumed.
  function parseFileHeader(index) {
    var fileHeader = /^(\-\-\-|\+\+\+)\s+(\S+)\s?(.+?)\s*$/.exec(diffstr[i]);
    if (fileHeader) {
      var keyPrefix = fileHeader[1] === '---' ? 'old' : 'new';
      index[keyPrefix + 'FileName'] = fileHeader[2];
      index[keyPrefix + 'Header'] = fileHeader[3];

      i++;
    }
  }

  // Parses a hunk
  // This assumes that we are at the start of a hunk.
  function parseHunk() {
    var chunkHeaderIndex = i,
        chunkHeaderLine = diffstr[i++],
        chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    var hunk = {
      oldStart: +chunkHeader[1],
      oldLines: +chunkHeader[2] || 1,
      newStart: +chunkHeader[3],
      newLines: +chunkHeader[4] || 1,
      lines: []
    };

    var addCount = 0,
        removeCount = 0;
    for (; i < diffstr.length; i++) {
      var operation = diffstr[i][0];

      if (operation === '+' || operation === '-' || operation === ' ' || operation === '\\') {
        hunk.lines.push(diffstr[i]);

        if (operation === '+') {
          addCount++;
        } else if (operation === '-') {
          removeCount++;
        } else if (operation === ' ') {
          addCount++;
          removeCount++;
        }
      } else {
        break;
      }
    }

    // Handle the empty block count case
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }

    // Perform optional sanity checking
    if (options.strict) {
      if (addCount !== hunk.newLines) {
        throw new Error('Added line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
      if (removeCount !== hunk.oldLines) {
        throw new Error('Removed line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
      }
    }

    return hunk;
  }

  while (i < diffstr.length) {
    parseIndex();
  }

  return list;
}


},{}],15:[function(require,module,exports){
// Iterator that traverses in the range of [min, max], stepping
// by distance from a given start position. I.e. for [0, 4], with
"use strict";

exports.__esModule = true;

exports["default"] = function (start, minLine, maxLine) {
  var wantForward = true,
      backwardExhausted = false,
      forwardExhausted = false,
      localOffset = 1;

  return function iterator() {
    var _again = true;

    _function: while (_again) {
      _again = false;

      if (wantForward && !forwardExhausted) {
        if (backwardExhausted) {
          localOffset++;
        } else {
          wantForward = false;
        }

        // Check if trying to fit beyond text length, and if not, check it fits
        // after offset location (or desired location on first iteration)
        if (start + localOffset <= maxLine) {
          return localOffset;
        }

        forwardExhausted = true;
      }

      if (!backwardExhausted) {
        if (!forwardExhausted) {
          wantForward = true;
        }

        // Check if trying to fit before text beginning, and if not, check it fits
        // before offset location
        if (minLine <= start - localOffset) {
          return - localOffset++;
        }

        backwardExhausted = true;
        _again = true;
        continue _function;
      }

      // We tried to fit hunk before text beginning and beyond text lenght, then
      // hunk can't fit on the text. Return undefined
    }
  };
};

module.exports = exports["default"];
// start of 2, this will iterate 2, 3, 1, 4, 0.


},{}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.generateOptions = generateOptions;

function generateOptions(options, defaults) {
  if (typeof options === 'function') {
    defaults.callback = options;
  } else if (options) {
    for (var _name in options) {
      /* istanbul ignore else */
      if (options.hasOwnProperty(_name)) {
        defaults[_name] = options[_name];
      }
    }
  }
  return defaults;
}


},{}],17:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var lcs = require('./lib/lcs');
var array = require('./lib/array');
var patch = require('./lib/jsonPatch');
var inverse = require('./lib/inverse');
var jsonPointer = require('./lib/jsonPointer');
var encodeSegment = jsonPointer.encodeSegment;

exports.diff = diff;
exports.patch = patch.apply;
exports.patchInPlace = patch.applyInPlace;
exports.inverse = inverse;
exports.clone = patch.clone;

// Errors
exports.InvalidPatchOperationError = require('./lib/InvalidPatchOperationError');
exports.TestFailedError = require('./lib/TestFailedError');
exports.PatchNotInvertibleError = require('./lib/PatchNotInvertibleError');

var isValidObject = patch.isValidObject;
var defaultHash = patch.defaultHash;

/**
 * Compute a JSON Patch representing the differences between a and b.
 * @param {object|array|string|number|null} a
 * @param {object|array|string|number|null} b
 * @param {?function|?object} options if a function, see options.hash
 * @param {?function(x:*):String|Number} options.hash used to hash array items
 *  in order to recognize identical objects, defaults to JSON.stringify
 * @param {?function(index:Number, array:Array):object} options.makeContext
 *  used to generate patch context. If not provided, context will not be generated
 * @returns {array} JSON Patch such that patch(diff(a, b), a) ~ b
 */
function diff(a, b, options) {
	return appendChanges(a, b, '', initState(options, [])).patch;
}

/**
 * Create initial diff state from the provided options
 * @param {?function|?object} options @see diff options above
 * @param {array} patch an empty or existing JSON Patch array into which
 *  the diff should generate new patch operations
 * @returns {object} initialized diff state
 */
function initState(options, patch) {
	if(typeof options === 'object') {
		return {
			patch: patch,
			hash: orElse(isFunction, options.hash, defaultHash),
			makeContext: orElse(isFunction, options.makeContext, defaultContext),
			invertible: !(options.invertible === false)
		};
	} else {
		return {
			patch: patch,
			hash: orElse(isFunction, options, defaultHash),
			makeContext: defaultContext,
			invertible: true
		};
	}
}

/**
 * Given two JSON values (object, array, number, string, etc.), find their
 * differences and append them to the diff state
 * @param {object|array|string|number|null} a
 * @param {object|array|string|number|null} b
 * @param {string} path
 * @param {object} state
 * @returns {Object} updated diff state
 */
function appendChanges(a, b, path, state) {
	if(Array.isArray(a) && Array.isArray(b)) {
		return appendArrayChanges(a, b, path, state);
	}

	if(isValidObject(a) && isValidObject(b)) {
		return appendObjectChanges(a, b, path, state);
	}

	return appendValueChanges(a, b, path, state);
}

/**
 * Given two objects, find their differences and append them to the diff state
 * @param {object} o1
 * @param {object} o2
 * @param {string} path
 * @param {object} state
 * @returns {Object} updated diff state
 */
function appendObjectChanges(o1, o2, path, state) {
	var keys = Object.keys(o2);
	var patch = state.patch;
	var i, key;

	for(i=keys.length-1; i>=0; --i) {
		key = keys[i];
		var keyPath = path + '/' + encodeSegment(key);
		if(o1[key] !== void 0) {
			appendChanges(o1[key], o2[key], keyPath, state);
		} else {
			patch.push({ op: 'add', path: keyPath, value: o2[key] });
		}
	}

	keys = Object.keys(o1);
	for(i=keys.length-1; i>=0; --i) {
		key = keys[i];
		if(o2[key] === void 0) {
			var p = path + '/' + encodeSegment(key);
			if(state.invertible) {
				patch.push({ op: 'test', path: p, value: o1[key] });
			}
			patch.push({ op: 'remove', path: p });
		}
	}

	return state;
}

/**
 * Given two arrays, find their differences and append them to the diff state
 * @param {array} a1
 * @param {array} a2
 * @param {string} path
 * @param {object} state
 * @returns {Object} updated diff state
 */
function appendArrayChanges(a1, a2, path, state) {
	var a1hash = array.map(state.hash, a1);
	var a2hash = array.map(state.hash, a2);

	var lcsMatrix = lcs.compare(a1hash, a2hash);

	return lcsToJsonPatch(a1, a2, path, state, lcsMatrix);
}

/**
 * Transform an lcsMatrix into JSON Patch operations and append
 * them to state.patch, recursing into array elements as necessary
 * @param {array} a1
 * @param {array} a2
 * @param {string} path
 * @param {object} state
 * @param {object} lcsMatrix
 * @returns {object} new state with JSON Patch operations added based
 *  on the provided lcsMatrix
 */
function lcsToJsonPatch(a1, a2, path, state, lcsMatrix) {
	var offset = 0;
	return lcs.reduce(function(state, op, i, j) {
		var last, context;
		var patch = state.patch;
		var p = path + '/' + (j + offset);

		if (op === lcs.REMOVE) {
			// Coalesce adjacent remove + add into replace
			last = patch[patch.length-1];
			context = state.makeContext(j, a1);

			if(state.invertible) {
				patch.push({ op: 'test', path: p, value: a1[j], context: context });
			}

			if(last !== void 0 && last.op === 'add' && last.path === p) {
				last.op = 'replace';
				last.context = context;
			} else {
				patch.push({ op: 'remove', path: p, context: context });
			}

			offset -= 1;

		} else if (op === lcs.ADD) {
			// See https://tools.ietf.org/html/rfc6902#section-4.1
			// May use either index===length *or* '-' to indicate appending to array
			patch.push({ op: 'add', path: p, value: a2[i],
				context: state.makeContext(j, a1)
			});

			offset += 1;

		} else {
			appendChanges(a1[j], a2[i], p, state);
		}

		return state;

	}, state, lcsMatrix);
}

/**
 * Given two number|string|null values, if they differ, append to diff state
 * @param {string|number|null} a
 * @param {string|number|null} b
 * @param {string} path
 * @param {object} state
 * @returns {object} updated diff state
 */
function appendValueChanges(a, b, path, state) {
	if(a !== b) {
		if(state.invertible) {
			state.patch.push({ op: 'test', path: path, value: a });
		}

		state.patch.push({ op: 'replace', path: path, value: b });
	}

	return state;
}

/**
 * @param {function} predicate
 * @param {*} x
 * @param {*} y
 * @returns {*} x if predicate(x) is truthy, otherwise y
 */
function orElse(predicate, x, y) {
	return predicate(x) ? x : y;
}

/**
 * Default patch context generator
 * @returns {undefined} undefined context
 */
function defaultContext() {
	return void 0;
}

/**
 * @param {*} x
 * @returns {boolean} true if x is a function, false otherwise
 */
function isFunction(x) {
	return typeof x === 'function';
}

},{"./lib/InvalidPatchOperationError":18,"./lib/PatchNotInvertibleError":19,"./lib/TestFailedError":20,"./lib/array":21,"./lib/inverse":25,"./lib/jsonPatch":26,"./lib/jsonPointer":27,"./lib/lcs":29}],18:[function(require,module,exports){
module.exports = InvalidPatchOperationError;

function InvalidPatchOperationError(message) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = message;
	if(typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, this.constructor);
	}
}

InvalidPatchOperationError.prototype = Object.create(Error.prototype);
InvalidPatchOperationError.prototype.constructor = InvalidPatchOperationError;
},{}],19:[function(require,module,exports){
module.exports = PatchNotInvertibleError;

function PatchNotInvertibleError(message) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = message;
	if(typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, this.constructor);
	}
}

PatchNotInvertibleError.prototype = Object.create(Error.prototype);
PatchNotInvertibleError.prototype.constructor = PatchNotInvertibleError;
},{}],20:[function(require,module,exports){
module.exports = TestFailedError;

function TestFailedError(message) {
	Error.call(this);
	this.name = this.constructor.name;
	this.message = message;
	if(typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, this.constructor);
	}
}

TestFailedError.prototype = Object.create(Error.prototype);
TestFailedError.prototype.constructor = TestFailedError;
},{}],21:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.cons = cons;
exports.tail = tail;
exports.map = map;

/**
 * Prepend x to a, without mutating a. Faster than a.unshift(x)
 * @param {*} x
 * @param {Array} a array-like
 * @returns {Array} new Array with x prepended
 */
function cons(x, a) {
	var l = a.length;
	var b = new Array(l+1);
	b[0] = x;
	for(var i=0; i<l; ++i) {
		b[i+1] = a[i];
	}

	return b;
}

/**
 * Create a new Array containing all elements in a, except the first.
 *  Faster than a.slice(1)
 * @param {Array} a array-like
 * @returns {Array} new Array, the equivalent of a.slice(1)
 */
function tail(a) {
	var l = a.length-1;
	var b = new Array(l);
	for(var i=0; i<l; ++i) {
		b[i] = a[i+1];
	}

	return b;
}

/**
 * Map any array-like. Faster than Array.prototype.map
 * @param {function} f
 * @param {Array} a array-like
 * @returns {Array} new Array mapped by f
 */
function map(f, a) {
	var b = new Array(a.length);
	for(var i=0; i< a.length; ++i) {
		b[i] = f(a[i]);
	}
	return b;
}
},{}],22:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Create a deep copy of x which must be a legal JSON object/array/value
 * @param {object|array|string|number|null} x object/array/value to clone
 * @returns {object|array|string|number|null} clone of x
 */
module.exports = clone;

function clone(x) {
	if(x == null || typeof x !== 'object') {
		return x;
	}

	if(Array.isArray(x)) {
		return cloneArray(x);
	}

	return cloneObject(x);
}

function cloneArray (x) {
	var l = x.length;
	var y = new Array(l);

	for (var i = 0; i < l; ++i) {
		y[i] = clone(x[i]);
	}

	return y;
}

function cloneObject (x) {
	var keys = Object.keys(x);
	var y = {};

	for (var k, i = 0, l = keys.length; i < l; ++i) {
		k = keys[i];
		y[k] = clone(x[k]);
	}

	return y;
}

},{}],23:[function(require,module,exports){
var jsonPointer = require('./jsonPointer');

/**
 * commute the patch sequence a,b to b,a
 * @param {object} a patch operation
 * @param {object} b patch operation
 */
module.exports = function commutePaths(a, b) {
	// TODO: cases for special paths: '' and '/'
	var left = jsonPointer.parse(a.path);
	var right = jsonPointer.parse(b.path);
	var prefix = getCommonPathPrefix(left, right);
	var isArray = isArrayPath(left, right, prefix.length);

	// Never mutate the originals
	var ac = copyPatch(a);
	var bc = copyPatch(b);

	if(prefix.length === 0 && !isArray) {
		// Paths share no common ancestor, simple swap
		return [bc, ac];
	}

	if(isArray) {
		return commuteArrayPaths(ac, left, bc, right);
	} else {
		return commuteTreePaths(ac, left, bc, right);
	}
};

function commuteTreePaths(a, left, b, right) {
	if(a.path === b.path) {
		throw new TypeError('cannot commute ' + a.op + ',' + b.op + ' with identical object paths');
	}
	// FIXME: Implement tree path commutation
	return [b, a];
}

/**
 * Commute two patches whose common ancestor (which may be the immediate parent)
 * is an array
 * @param a
 * @param left
 * @param b
 * @param right
 * @returns {*}
 */
function commuteArrayPaths(a, left, b, right) {
	if(left.length === right.length) {
		return commuteArraySiblings(a, left, b, right);
	}

	if (left.length > right.length) {
		// left is longer, commute by "moving" it to the right
		left = commuteArrayAncestor(b, right, a, left, -1);
		a.path = jsonPointer.absolute(jsonPointer.join(left));
	} else {
		// right is longer, commute by "moving" it to the left
		right = commuteArrayAncestor(a, left, b, right, 1);
		b.path = jsonPointer.absolute(jsonPointer.join(right));
	}

	return [b, a];
}

function isArrayPath(left, right, index) {
	return jsonPointer.isValidArrayIndex(left[index])
		&& jsonPointer.isValidArrayIndex(right[index]);
}

/**
 * Commute two patches referring to items in the same array
 * @param l
 * @param lpath
 * @param r
 * @param rpath
 * @returns {*[]}
 */
function commuteArraySiblings(l, lpath, r, rpath) {

	var target = lpath.length-1;
	var lindex = +lpath[target];
	var rindex = +rpath[target];

	var commuted;

	if(lindex < rindex) {
		// Adjust right path
		if(l.op === 'add' || l.op === 'copy') {
			commuted = rpath.slice();
			commuted[target] = Math.max(0, rindex - 1);
			r.path = jsonPointer.absolute(jsonPointer.join(commuted));
		} else if(l.op === 'remove') {
			commuted = rpath.slice();
			commuted[target] = rindex + 1;
			r.path = jsonPointer.absolute(jsonPointer.join(commuted));
		}
	} else if(r.op === 'add' || r.op === 'copy') {
		// Adjust left path
		commuted = lpath.slice();
		commuted[target] = lindex + 1;
		l.path = jsonPointer.absolute(jsonPointer.join(commuted));
	} else if (lindex > rindex && r.op === 'remove') {
		// Adjust left path only if remove was at a (strictly) lower index
		commuted = lpath.slice();
		commuted[target] = Math.max(0, lindex - 1);
		l.path = jsonPointer.absolute(jsonPointer.join(commuted));
	}

	return [r, l];
}

/**
 * Commute two patches with a common array ancestor
 * @param l
 * @param lpath
 * @param r
 * @param rpath
 * @param direction
 * @returns {*}
 */
function commuteArrayAncestor(l, lpath, r, rpath, direction) {
	// rpath is longer or same length

	var target = lpath.length-1;
	var lindex = +lpath[target];
	var rindex = +rpath[target];

	// Copy rpath, then adjust its array index
	var rc = rpath.slice();

	if(lindex > rindex) {
		return rc;
	}

	if(l.op === 'add' || l.op === 'copy') {
		rc[target] = Math.max(0, rindex - direction);
	} else if(l.op === 'remove') {
		rc[target] = Math.max(0, rindex + direction);
	}

	return rc;
}

function getCommonPathPrefix(p1, p2) {
	var p1l = p1.length;
	var p2l = p2.length;
	if(p1l === 0 || p2l === 0 || (p1l < 2 && p2l < 2)) {
		return [];
	}

	// If paths are same length, the last segment cannot be part
	// of a common prefix.  If not the same length, the prefix cannot
	// be longer than the shorter path.
	var l = p1l === p2l
		? p1l - 1
		: Math.min(p1l, p2l);

	var i = 0;
	while(i < l && p1[i] === p2[i]) {
		++i
	}

	return p1.slice(0, i);
}

function copyPatch(p) {
	if(p.op === 'remove') {
		return { op: p.op, path: p.path };
	}

	if(p.op === 'copy' || p.op === 'move') {
		return { op: p.op, path: p.path, from: p.from };
	}

	// test, add, replace
	return { op: p.op, path: p.path, value: p.value };
}
},{"./jsonPointer":27}],24:[function(require,module,exports){
module.exports = deepEquals;

/**
 * Compare 2 JSON values, or recursively compare 2 JSON objects or arrays
 * @param {object|array|string|number|boolean|null} a
 * @param {object|array|string|number|boolean|null} b
 * @returns {boolean} true iff a and b are recursively equal
 */
function deepEquals(a, b) {
	if(a === b) {
		return true;
	}

	if(Array.isArray(a) && Array.isArray(b)) {
		return compareArrays(a, b);
	}

	if(typeof a === 'object' && typeof b === 'object') {
		return compareObjects(a, b);
	}

	return false;
}

function compareArrays(a, b) {
	if(a.length !== b.length) {
		return false;
	}

	for(var i = 0; i<a.length; ++i) {
		if(!deepEquals(a[i], b[i])) {
			return false;
		}
	}

	return true;
}

function compareObjects(a, b) {
	if((a === null && b !== null) || (a !== null && b === null)) {
		return false;
	}

	var akeys = Object.keys(a);
	var bkeys = Object.keys(b);

	if(akeys.length !== bkeys.length) {
		return false;
	}

	for(var i = 0, k; i<akeys.length; ++i) {
		k = akeys[i];
		if(!(k in b && deepEquals(a[k], b[k]))) {
			return false;
		}
	}

	return true;
}
},{}],25:[function(require,module,exports){
var patches = require('./patches');

module.exports = function inverse(p) {
	var pr = [];
	var i, skip;
	for(i = p.length-1; i>= 0; i -= skip) {
		skip = invertOp(pr, p[i], i, p);
	}

	return pr;
};

function invertOp(patch, c, i, context) {
	var op = patches[c.op];
	return op !== void 0 && typeof op.inverse === 'function'
		? op.inverse(patch, c, i, context)
		: 1;
}

},{"./patches":30}],26:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var patches = require('./patches');
var clone = require('./clone');
var InvalidPatchOperationError = require('./InvalidPatchOperationError');

exports.apply = patch;
exports.applyInPlace = patchInPlace;
exports.clone = clone;
exports.isValidObject = isValidObject;
exports.defaultHash = defaultHash;

var defaultOptions = {};

/**
 * Apply the supplied JSON Patch to x
 * @param {array} changes JSON Patch
 * @param {object|array|string|number} x object/array/value to patch
 * @param {object} options
 * @param {function(index:Number, array:Array, context:object):Number} options.findContext
 *  function used adjust array indexes for smarty/fuzzy patching, for
 *  patches containing context
 * @returns {object|array|string|number} patched version of x. If x is
 *  an array or object, it will be mutated and returned. Otherwise, if
 *  x is a value, the new value will be returned.
 */
function patch(changes, x, options) {
	return patchInPlace(changes, clone(x), options);
}

function patchInPlace(changes, x, options) {
	if(!options) {
		options = defaultOptions;
	}

	// TODO: Consider throwing if changes is not an array
	if(!Array.isArray(changes)) {
		return x;
	}

	var patch, p;
	for(var i=0; i<changes.length; ++i) {
		p = changes[i];
		patch = patches[p.op];

		if(patch === void 0) {
			throw new InvalidPatchOperationError('invalid op ' + JSON.stringify(p));
		}

		x = patch.apply(x, p, options);
	}

	return x;
}

function defaultHash(x) {
	return isValidObject(x) ? JSON.stringify(x) : x;
}

function isValidObject (x) {
	return x !== null && Object.prototype.toString.call(x) === '[object Object]';
}

},{"./InvalidPatchOperationError":18,"./clone":22,"./patches":30}],27:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var _parse = require('./jsonPointerParse');

exports.find = find;
exports.join = join;
exports.absolute = absolute;
exports.parse = parse;
exports.contains = contains;
exports.encodeSegment = encodeSegment;
exports.decodeSegment = decodeSegment;
exports.parseArrayIndex = parseArrayIndex;
exports.isValidArrayIndex = isValidArrayIndex;

// http://tools.ietf.org/html/rfc6901#page-2
var separator = '/';
var separatorRx = /\//g;
var encodedSeparator = '~1';
var encodedSeparatorRx = /~1/g;

var escapeChar = '~';
var escapeRx = /~/g;
var encodedEscape = '~0';
var encodedEscapeRx = /~0/g;

/**
 * Find the parent of the specified path in x and return a descriptor
 * containing the parent and a key.  If the parent does not exist in x,
 * return undefined, instead.
 * @param {object|array} x object or array in which to search
 * @param {string} path JSON Pointer string (encoded)
 * @param {?function(index:Number, array:Array, context:object):Number} findContext
 *  optional function used adjust array indexes for smarty/fuzzy patching, for
 *  patches containing context.  If provided, context MUST also be provided.
 * @param {?{before:Array, after:Array}} context optional patch context for
 *  findContext to use to adjust array indices.  If provided, findContext MUST
 *  also be provided.
 * @returns {{target:object|array|number|string, key:string}|undefined}
 */
function find(x, path, findContext, context) {
	if(typeof path !== 'string') {
		return;
	}

	if(path === '') {
		// whole document
		return { target: x, key: void 0 };
	}

	if(path === separator) {
		return { target: x, key: '' };
	}

	var parent = x, key;
	var hasContext = context !== void 0;

	_parse(path, function(segment) {
		// hm... this seems like it should be if(typeof x === 'undefined')
		if(x == null) {
			// Signal that we prematurely hit the end of the path hierarchy.
			parent = null;
			return false;
		}

		if(Array.isArray(x)) {
			key = hasContext
				? findIndex(findContext, parseArrayIndex(segment), x, context)
				: segment === '-' ? segment : parseArrayIndex(segment);
		} else {
			key = segment;
		}

		parent = x;
		x = x[key];
	});

	return parent === null
		? void 0
		: { target: parent, key: key };
}

function absolute(path) {
	return path[0] === separator ? path : separator + path;
}

function join(segments) {
	return segments.join(separator);
}

function parse(path) {
	var segments = [];
	_parse(path, segments.push.bind(segments));
	return segments;
}

function contains(a, b) {
	return b.indexOf(a) === 0 && b[a.length] === separator;
}

/**
 * Decode a JSON Pointer path segment
 * @see http://tools.ietf.org/html/rfc6901#page-3
 * @param {string} s encoded segment
 * @returns {string} decoded segment
 */
function decodeSegment(s) {
	// See: http://tools.ietf.org/html/rfc6901#page-3
	return s.replace(encodedSeparatorRx, separator).replace(encodedEscapeRx, escapeChar);
}

/**
 * Encode a JSON Pointer path segment
 * @see http://tools.ietf.org/html/rfc6901#page-3
 * @param {string} s decoded segment
 * @returns {string} encoded segment
 */
function encodeSegment(s) {
	return s.replace(escapeRx, encodedEscape).replace(separatorRx, encodedSeparator);
}

var arrayIndexRx = /^(0|[1-9]\d*)$/;

/**
 * Return true if s is a valid JSON Pointer array index
 * @param {String} s
 * @returns {boolean}
 */
function isValidArrayIndex(s) {
	return arrayIndexRx.test(s);
}

/**
 * Safely parse a string into a number >= 0. Does not check for decimal numbers
 * @param {string} s numeric string
 * @returns {number} number >= 0
 */
function parseArrayIndex (s) {
	if(isValidArrayIndex(s)) {
		return +s;
	}

	throw new SyntaxError('invalid array index ' + s);
}

function findIndex (findContext, start, array, context) {
	var index = start;

	if(index < 0) {
		throw new Error('array index out of bounds ' + index);
	}

	if(context !== void 0 && typeof findContext === 'function') {
		index = findContext(start, array, context);
		if(index < 0) {
			throw new Error('could not find patch context ' + context);
		}
	}

	return index;
}
},{"./jsonPointerParse":28}],28:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = jsonPointerParse;

var parseRx = /\/|~1|~0/g;
var separator = '/';
var escapeChar = '~';
var encodedSeparator = '~1';

/**
 * Parse through an encoded JSON Pointer string, decoding each path segment
 * and passing it to an onSegment callback function.
 * @see https://tools.ietf.org/html/rfc6901#section-4
 * @param {string} path encoded JSON Pointer string
 * @param {{function(segment:string):boolean}} onSegment callback function
 * @returns {string} original path
 */
function jsonPointerParse(path, onSegment) {
	var pos, accum, matches, match;

	pos = path.charAt(0) === separator ? 1 : 0;
	accum = '';
	parseRx.lastIndex = pos;

	while(matches = parseRx.exec(path)) {

		match = matches[0];
		accum += path.slice(pos, parseRx.lastIndex - match.length);
		pos = parseRx.lastIndex;

		if(match === separator) {
			if (onSegment(accum) === false) return path;
			accum = '';
		} else {
			accum += match === encodedSeparator ? separator : escapeChar;
		}
	}

	accum += path.slice(pos);
	onSegment(accum);

	return path;
}

},{}],29:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.compare = compare;
exports.reduce = reduce;

var REMOVE, RIGHT, ADD, DOWN, SKIP;

exports.REMOVE = REMOVE = RIGHT = -1;
exports.ADD    = ADD    = DOWN  =  1;
exports.EQUAL  = SKIP   = 0;

/**
 * Create an lcs comparison matrix describing the differences
 * between two array-like sequences
 * @param {array} a array-like
 * @param {array} b array-like
 * @returns {object} lcs descriptor, suitable for passing to reduce()
 */
function compare(a, b) {
	var cols = a.length;
	var rows = b.length;

	var prefix = findPrefix(a, b);
	var suffix = prefix < cols && prefix < rows
		? findSuffix(a, b, prefix)
		: 0;

	var remove = suffix + prefix - 1;
	cols -= remove;
	rows -= remove;
	var matrix = createMatrix(cols, rows);

	for (var j = cols - 1; j >= 0; --j) {
		for (var i = rows - 1; i >= 0; --i) {
			matrix[i][j] = backtrack(matrix, a, b, prefix, j, i);
		}
	}

	return {
		prefix: prefix,
		matrix: matrix,
		suffix: suffix
	};
}

/**
 * Reduce a set of lcs changes previously created using compare
 * @param {function(result:*, type:number, i:number, j:number)} f
 *  reducer function, where:
 *  - result is the current reduce value,
 *  - type is the type of change: ADD, REMOVE, or SKIP
 *  - i is the index of the change location in b
 *  - j is the index of the change location in a
 * @param {*} r initial value
 * @param {object} lcs results returned by compare()
 * @returns {*} the final reduced value
 */
function reduce(f, r, lcs) {
	var i, j, k, op;

	var m = lcs.matrix;

	// Reduce shared prefix
	var l = lcs.prefix;
	for(i = 0;i < l; ++i) {
		r = f(r, SKIP, i, i);
	}

	// Reduce longest change span
	k = i;
	l = m.length;
	i = 0;
	j = 0;
	while(i < l) {
		op = m[i][j].type;
		r = f(r, op, i+k, j+k);

		switch(op) {
			case SKIP:  ++i; ++j; break;
			case RIGHT: ++j; break;
			case DOWN:  ++i; break;
		}
	}

	// Reduce shared suffix
	i += k;
	j += k;
	l = lcs.suffix;
	for(k = 0;k < l; ++k) {
		r = f(r, SKIP, i+k, j+k);
	}

	return r;
}

function findPrefix(a, b) {
	var i = 0;
	var l = Math.min(a.length, b.length);
	while(i < l && a[i] === b[i]) {
		++i;
	}
	return i;
}

function findSuffix(a, b) {
	var al = a.length - 1;
	var bl = b.length - 1;
	var l = Math.min(al, bl);
	var i = 0;
	while(i < l && a[al-i] === b[bl-i]) {
		++i;
	}
	return i;
}

function backtrack(matrix, a, b, start, j, i) {
	if (a[j+start] === b[i+start]) {
		return { value: matrix[i + 1][j + 1].value, type: SKIP };
	}
	if (matrix[i][j + 1].value < matrix[i + 1][j].value) {
		return { value: matrix[i][j + 1].value + 1, type: RIGHT };
	}

	return { value: matrix[i + 1][j].value + 1, type: DOWN };
}

function createMatrix (cols, rows) {
	var m = [], i, j, lastrow;

	// Fill the last row
	lastrow = m[rows] = [];
	for (j = 0; j<cols; ++j) {
		lastrow[j] = { value: cols - j, type: RIGHT };
	}

	// Fill the last col
	for (i = 0; i<rows; ++i) {
		m[i] = [];
		m[i][cols] = { value: rows - i, type: DOWN };
	}

	// Fill the last cell
	m[rows][cols] = { value: 0, type: SKIP };

	return m;
}

},{}],30:[function(require,module,exports){
var jsonPointer = require('./jsonPointer');
var clone = require('./clone');
var deepEquals = require('./deepEquals');
var commutePaths = require('./commutePaths');

var array = require('./array');

var TestFailedError = require('./TestFailedError');
var InvalidPatchOperationError = require('./InvalidPatchOperationError');
var PatchNotInvertibleError = require('./PatchNotInvertibleError');

var find = jsonPointer.find;
var parseArrayIndex = jsonPointer.parseArrayIndex;

exports.test = {
	apply: applyTest,
	inverse: invertTest,
	commute: commuteTest
};

exports.add = {
	apply: applyAdd,
	inverse: invertAdd,
	commute: commuteAddOrCopy
};

exports.remove = {
	apply: applyRemove,
	inverse: invertRemove,
	commute: commuteRemove
};

exports.replace = {
	apply: applyReplace,
	inverse: invertReplace,
	commute: commuteReplace
};

exports.move = {
	apply: applyMove,
	inverse: invertMove,
	commute: commuteMove
};

exports.copy = {
	apply: applyCopy,
	inverse: notInvertible,
	commute: commuteAddOrCopy
};

/**
 * Apply a test operation to x
 * @param {object|array} x
 * @param {object} test test operation
 * @throws {TestFailedError} if the test operation fails
 */

function applyTest(x, test, options) {
	var pointer = find(x, test.path, options.findContext, test.context);
	var target = pointer.target;
	var index, value;

	if(Array.isArray(target)) {
		index = parseArrayIndex(pointer.key);
		//index = findIndex(options.findContext, index, target, test.context);
		value = target[index];
	} else {
		value = pointer.key === void 0 ? pointer.target : pointer.target[pointer.key];
	}

	if(!deepEquals(value, test.value)) {
		throw new TestFailedError('test failed ' + JSON.stringify(test));
	}

	return x;
}

/**
 * Invert the provided test and add it to the inverted patch sequence
 * @param pr
 * @param test
 * @returns {number}
 */
function invertTest(pr, test) {
	pr.push(test);
	return 1;
}

function commuteTest(test, b) {
	if(test.path === b.path && b.op === 'remove') {
		throw new TypeError('Can\'t commute test,remove -> remove,test for same path');
	}

	if(b.op === 'test' || b.op === 'replace') {
		return [b, test];
	}

	return commutePaths(test, b);
}

/**
 * Apply an add operation to x
 * @param {object|array} x
 * @param {object} change add operation
 */
function applyAdd(x, change, options) {
	var pointer = find(x, change.path, options.findContext, change.context);

	if(notFound(pointer)) {
		throw new InvalidPatchOperationError('path does not exist ' + change.path);
	}

	var val = clone(change.value);

	// If pointer refers to whole document, replace whole document
	if(pointer.key === void 0) {
		return val;
	}

	_add(pointer, val);
	return x;
}

function _add(pointer, value) {
	var target = pointer.target;

	if(Array.isArray(target)) {
		// '-' indicates 'append' to array
		if(pointer.key === '-') {
			target.push(value);
		} else {
			target.splice(pointer.key, 0, value);
		}
	} else if(isValidObject(target)) {
		target[pointer.key] = value;
	} else {
		throw new InvalidPatchOperationError('target of add must be an object or array ' + pointer.key);
	}
}

function invertAdd(pr, add) {
	var context = add.context;
	if(context !== void 0) {
		context = {
			before: context.before,
			after: array.cons(add.value, context.after)
		}
	}
	pr.push({ op: 'test', path: add.path, value: add.value, context: context });
	pr.push({ op: 'remove', path: add.path, context: context });
	return 1;
}

function commuteAddOrCopy(add, b) {
	if(add.path === b.path && b.op === 'remove') {
		throw new TypeError('Can\'t commute add,remove -> remove,add for same path');
	}

	return commutePaths(add, b);
}

/**
 * Apply a replace operation to x
 * @param {object|array} x
 * @param {object} change replace operation
 */
function applyReplace(x, change, options) {
	var pointer = find(x, change.path, options.findContext, change.context);

	if(notFound(pointer) || missingValue(pointer)) {
		throw new InvalidPatchOperationError('path does not exist ' + change.path);
	}

	var value = clone(change.value);

	// If pointer refers to whole document, replace whole document
	if(pointer.key === void 0) {
		return value;
	}

	var target = pointer.target;

	if(Array.isArray(target)) {
		target[parseArrayIndex(pointer.key)] = value;
	} else {
		target[pointer.key] = value;
	}

	return x;
}

function invertReplace(pr, c, i, patch) {
	var prev = patch[i-1];
	if(prev === void 0 || prev.op !== 'test' || prev.path !== c.path) {
		throw new PatchNotInvertibleError('cannot invert replace w/o test');
	}

	var context = prev.context;
	if(context !== void 0) {
		context = {
			before: context.before,
			after: array.cons(prev.value, array.tail(context.after))
		}
	}

	pr.push({ op: 'test', path: prev.path, value: c.value });
	pr.push({ op: 'replace', path: prev.path, value: prev.value });
	return 2;
}

function commuteReplace(replace, b) {
	if(replace.path === b.path && b.op === 'remove') {
		throw new TypeError('Can\'t commute replace,remove -> remove,replace for same path');
	}

	if(b.op === 'test' || b.op === 'replace') {
		return [b, replace];
	}

	return commutePaths(replace, b);
}

/**
 * Apply a remove operation to x
 * @param {object|array} x
 * @param {object} change remove operation
 */
function applyRemove(x, change, options) {
	var pointer = find(x, change.path, options.findContext, change.context);

	// key must exist for remove
	if(notFound(pointer) || pointer.target[pointer.key] === void 0) {
		throw new InvalidPatchOperationError('path does not exist ' + change.path);
	}

	_remove(pointer);
	return x;
}

function _remove (pointer) {
	var target = pointer.target;

	var removed;
	if (Array.isArray(target)) {
		removed = target.splice(parseArrayIndex(pointer.key), 1);
		return removed[0];

	} else if (isValidObject(target)) {
		removed = target[pointer.key];
		delete target[pointer.key];
		return removed;

	} else {
		throw new InvalidPatchOperationError('target of remove must be an object or array');
	}
}

function invertRemove(pr, c, i, patch) {
	var prev = patch[i-1];
	if(prev === void 0 || prev.op !== 'test' || prev.path !== c.path) {
		throw new PatchNotInvertibleError('cannot invert remove w/o test');
	}

	var context = prev.context;
	if(context !== void 0) {
		context = {
			before: context.before,
			after: array.tail(context.after)
		}
	}

	pr.push({ op: 'add', path: prev.path, value: prev.value, context: context });
	return 2;
}

function commuteRemove(remove, b) {
	if(remove.path === b.path && b.op === 'remove') {
		return [b, remove];
	}

	return commutePaths(remove, b);
}

/**
 * Apply a move operation to x
 * @param {object|array} x
 * @param {object} change move operation
 */
function applyMove(x, change, options) {
	if(jsonPointer.contains(change.path, change.from)) {
		throw new InvalidPatchOperationError('move.from cannot be ancestor of move.path');
	}

	var pto = find(x, change.path, options.findContext, change.context);
	var pfrom = find(x, change.from, options.findContext, change.fromContext);

	_add(pto, _remove(pfrom));
	return x;
}

function invertMove(pr, c) {
	pr.push({ op: 'move',
		path: c.from, context: c.fromContext,
		from: c.path, fromContext: c.context });
	return 1;
}

function commuteMove(move, b) {
	if(move.path === b.path && b.op === 'remove') {
		throw new TypeError('Can\'t commute move,remove -> move,replace for same path');
	}

	return commutePaths(move, b);
}

/**
 * Apply a copy operation to x
 * @param {object|array} x
 * @param {object} change copy operation
 */
function applyCopy(x, change, options) {
	var pto = find(x, change.path, options.findContext, change.context);
	var pfrom = find(x, change.from, options.findContext, change.fromContext);

	if(notFound(pfrom) || missingValue(pfrom)) {
		throw new InvalidPatchOperationError('copy.from must exist');
	}

	var target = pfrom.target;
	var value;

	if(Array.isArray(target)) {
		value = target[parseArrayIndex(pfrom.key)];
	} else {
		value = target[pfrom.key];
	}

	_add(pto, clone(value));
	return x;
}

// NOTE: Copy is not invertible
// See https://github.com/cujojs/jiff/issues/9
// This needs more thought. We may have to extend/amend JSON Patch.
// At first glance, this seems like it should just be a remove.
// However, that's not correct.  It violates the involution:
// invert(invert(p)) ~= p.  For example:
// invert(copy) -> remove
// invert(remove) -> add
// thus: invert(invert(copy)) -> add (DOH! this should be copy!)

function notInvertible(_, c) {
	throw new PatchNotInvertibleError('cannot invert ' + c.op);
}

function notFound (pointer) {
	return pointer === void 0 || (pointer.target == null && pointer.key !== void 0);
}

function missingValue(pointer) {
	return pointer.key !== void 0 && pointer.target[pointer.key] === void 0;
}

/**
 * Return true if x is a non-null object
 * @param {*} x
 * @returns {boolean}
 */
function isValidObject (x) {
	return x !== null && typeof x === 'object';
}

},{"./InvalidPatchOperationError":18,"./PatchNotInvertibleError":19,"./TestFailedError":20,"./array":21,"./clone":22,"./commutePaths":23,"./deepEquals":24,"./jsonPointer":27}],31:[function(require,module,exports){
var CloudContent, CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, CloudMetadata, DocumentStoreProvider, GoogleDriveProvider, LocalFileProvider, LocalStorageProvider, ReadOnlyProvider, cloudContentFactory, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUI = (require('./ui')).CloudFileManagerUI;

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

LocalFileProvider = require('./providers/local-file-provider');

cloudContentFactory = (require('./providers/provider-interface')).cloudContentFactory;

CloudContent = (require('./providers/provider-interface')).CloudContent;

CloudMetadata = (require('./providers/provider-interface')).CloudMetadata;

CloudFileManagerClientEvent = (function() {
  function CloudFileManagerClientEvent(type1, data1, callback1, state1) {
    this.type = type1;
    this.data = data1 != null ? data1 : {};
    this.callback = callback1 != null ? callback1 : null;
    this.state = state1 != null ? state1 : {};
  }

  return CloudFileManagerClientEvent;

})();

CloudFileManagerClient = (function() {
  function CloudFileManagerClient(options) {
    this.state = {
      availableProviders: []
    };
    this._listeners = [];
    this._resetState();
    this._ui = new CloudFileManagerUI(this);
    this.providers = {};
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions1) {
    var Provider, allProviders, availableProviders, base, base1, base2, i, j, k, len, len1, len2, provider, providerName, providerOptions, ref, ref1, ref2, ref3, ref4;
    this.appOptions = appOptions1 != null ? appOptions1 : {};
    allProviders = {};
    ref = [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider, LocalFileProvider];
    for (i = 0, len = ref.length; i < len; i++) {
      Provider = ref[i];
      if (Provider.Available()) {
        allProviders[Provider.Name] = Provider;
      }
    }
    if (!this.appOptions.providers) {
      this.appOptions.providers = [];
      for (providerName in allProviders) {
        if (!hasProp.call(allProviders, providerName)) continue;
        appOptions.providers.push(providerName);
      }
    }
    availableProviders = [];
    ref1 = this.appOptions.providers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      provider = ref1[j];
      ref2 = isString(provider) ? [provider, {}] : [provider.name, provider], providerName = ref2[0], providerOptions = ref2[1];
      if (providerOptions.mimeType == null) {
        providerOptions.mimeType = this.appOptions.mimeType;
      }
      if (!providerName) {
        this._error("Invalid provider spec - must either be string or object with name property");
      } else {
        if (allProviders[providerName]) {
          Provider = allProviders[providerName];
          provider = new Provider(providerOptions, this);
          this.providers[providerName] = provider;
          availableProviders.push(provider);
        } else {
          this._error("Unknown provider: " + providerName);
        }
      }
    }
    this._setState({
      availableProviders: availableProviders
    });
    ref3 = this.state.availableProviders;
    for (k = 0, len2 = ref3.length; k < len2; k++) {
      provider = ref3[k];
      if (provider.can('share')) {
        this._setState({
          shareProvider: provider
        });
        break;
      }
    }
    (base = this.appOptions).ui || (base.ui = {});
    (base1 = this.appOptions.ui).windowTitleSuffix || (base1.windowTitleSuffix = document.title);
    (base2 = this.appOptions.ui).windowTitleSeparator || (base2.windowTitleSeparator = ' - ');
    this._setWindowTitle();
    this._ui.init(this.appOptions.ui);
    if (this.appOptions.autoSaveInterval) {
      this.autoSave(this.appOptions.autoSaveInterval);
    }
    cloudContentFactory.setEnvelopeMetadata({
      appName: this.appOptions.appName || "",
      appVersion: this.appOptions.appVersion || "",
      appBuildNum: this.appOptions.appBuildNum || ""
    });
    return this.newFileOpensInNewTab = ((ref4 = this.appOptions.ui) != null ? ref4.hasOwnProperty('newFileOpensInNewTab') : void 0) ? this.appOptions.ui.newFileOpensInNewTab : true;
  };

  CloudFileManagerClient.prototype.setProviderOptions = function(name, newOptions) {
    var i, key, len, provider, ref, results;
    ref = this.state.availableProviders;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      provider = ref[i];
      if (provider.name === name) {
        if (provider.options == null) {
          provider.options = {};
        }
        for (key in newOptions) {
          provider.options[key] = newOptions[key];
        }
        break;
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  CloudFileManagerClient.prototype.connect = function() {
    return this._event('connected', {
      client: this
    });
  };

  CloudFileManagerClient.prototype.listen = function(listener) {
    if (listener) {
      return this._listeners.push(listener);
    }
  };

  CloudFileManagerClient.prototype.appendMenuItem = function(item) {
    this._ui.appendMenuItem(item);
    return this;
  };

  CloudFileManagerClient.prototype.prependMenuItem = function(item) {
    this._ui.prependMenuItem(item);
    return this;
  };

  CloudFileManagerClient.prototype.replaceMenuItem = function(key, item) {
    this._ui.replaceMenuItem(key, item);
    return this;
  };

  CloudFileManagerClient.prototype.insertMenuItemBefore = function(key, item) {
    this._ui.insertMenuItemBefore(key, item);
    return this;
  };

  CloudFileManagerClient.prototype.insertMenuItemAfter = function(key, item) {
    this._ui.insertMenuItemAfter(key, item);
    return this;
  };

  CloudFileManagerClient.prototype.setMenuBarInfo = function(info) {
    return this._ui.setMenuBarInfo(info);
  };

  CloudFileManagerClient.prototype.newFile = function(callback) {
    if (callback == null) {
      callback = null;
    }
    this._closeCurrentFile();
    this._resetState();
    window.location.hash = "";
    return this._event('newedFile', {
      content: ""
    });
  };

  CloudFileManagerClient.prototype.newFileDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.newFileOpensInNewTab) {
      return window.open(this._getCurrentUrl(), '_blank');
    } else if (this.state.dirty) {
      if (this._autoSaveInterval && this.state.metadata) {
        this.save();
        return this.newFile();
      } else if (confirm(tr('~CONFIRM.NEW_FILE'))) {
        return this.newFile();
      }
    } else {
      return this.newFile();
    }
  };

  CloudFileManagerClient.prototype.openFile = function(metadata, callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    if (metadata != null ? (ref = metadata.provider) != null ? ref.can('load') : void 0 : void 0) {
      return metadata.provider.load(metadata, (function(_this) {
        return function(err, content) {
          if (err) {
            return _this._error(err);
          }
          _this._closeCurrentFile();
          _this._fileChanged('openedFile', content, metadata, {
            openedContent: content.clone()
          }, _this._getHashParams(metadata));
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        };
      })(this));
    } else {
      return this.openFileDialog(callback);
    }
  };

  CloudFileManagerClient.prototype.openFileDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if ((!this.state.dirty) || (confirm(tr('~CONFIRM.OPEN_FILE')))) {
      return this._ui.openFileDialog((function(_this) {
        return function(metadata) {
          return _this.openFile(metadata, callback);
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.openSharedContent = function(id) {
    var ref;
    return (ref = this.state.shareProvider) != null ? ref.loadSharedContent(id, (function(_this) {
      return function(err, content, metadata) {
        if (err) {
          return _this._error(err);
        }
        return _this._fileChanged('openedFile', content, metadata, {
          overwritable: false,
          openedContent: content.clone()
        });
      };
    })(this)) : void 0;
  };

  CloudFileManagerClient.prototype.openProviderFile = function(providerName, providerParams) {
    var provider;
    provider = this.providers[providerName];
    if (provider) {
      return provider.authorized((function(_this) {
        return function(authorized) {
          if (authorized) {
            return provider.openSaved(providerParams, function(err, content, metadata) {
              if (err) {
                return _this._error(err);
              }
              return _this._fileChanged('openedFile', content, metadata, {
                openedContent: content.clone()
              }, _this._getHashParams(metadata));
            });
          }
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.save = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._event('getContent', {}, (function(_this) {
      return function(stringContent) {
        return _this.saveContent(stringContent, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveContent = function(stringContent, callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this.saveFile(stringContent, this.state.metadata, callback);
    } else {
      return this.saveFileDialog(stringContent, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFile = function(stringContent, metadata, callback) {
    var currentContent, ref;
    if (callback == null) {
      callback = null;
    }
    if (metadata != null ? (ref = metadata.provider) != null ? ref.can('save') : void 0 : void 0) {
      this._setState({
        saving: metadata
      });
      currentContent = this._createOrUpdateCurrentContent(stringContent, metadata);
      return metadata.provider.save(currentContent, metadata, (function(_this) {
        return function(err) {
          if (err) {
            return _this._error(err);
          }
          if (_this.state.metadata !== metadata) {
            _this._closeCurrentFile();
          }
          _this._fileChanged('savedFile', currentContent, metadata, {
            saved: true
          }, _this._getHashParams(metadata));
          return typeof callback === "function" ? callback(currentContent, metadata) : void 0;
        };
      })(this));
    } else {
      return this.saveFileDialog(stringContent, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFileDialog = function(stringContent, callback) {
    if (stringContent == null) {
      stringContent = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(stringContent, metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveFileAsDialog = function(stringContent, callback) {
    if (stringContent == null) {
      stringContent = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileAsDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(stringContent, metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.createCopy = function(stringContent, callback) {
    var saveAndOpenCopy;
    if (stringContent == null) {
      stringContent = null;
    }
    if (callback == null) {
      callback = null;
    }
    saveAndOpenCopy = (function(_this) {
      return function(stringContent) {
        var ref;
        return _this.saveCopiedFile(stringContent, (ref = _this.state.metadata) != null ? ref.name : void 0, function(err, copyParams) {
          if (err) {
            return typeof callback === "function" ? callback(err) : void 0;
          }
          window.open(_this._getCurrentUrl("#copy=" + copyParams));
          return typeof callback === "function" ? callback(copyParams) : void 0;
        });
      };
    })(this);
    if (stringContent === null) {
      return this._event('getContent', {}, function(stringContent) {
        return saveAndOpenCopy(stringContent);
      });
    } else {
      return saveAndOpenCopy(stringContent);
    }
  };

  CloudFileManagerClient.prototype.saveCopiedFile = function(stringContent, name, callback) {
    var copyNumber, e, error, key, maxCopyNumber, prefix, ref, value;
    try {
      prefix = 'cfm-copy::';
      maxCopyNumber = 0;
      ref = window.localStorage;
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        if (key.substr(0, prefix.length) === prefix) {
          copyNumber = parseInt(key.substr(prefix.length), 10);
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
        }
      }
      maxCopyNumber++;
      value = JSON.stringify({
        name: (name != null ? name.length : void 0) > 0 ? "Copy of " + name : "Copy of Untitled Document",
        stringContent: stringContent
      });
      window.localStorage.setItem("" + prefix + maxCopyNumber, value);
      return typeof callback === "function" ? callback(null, maxCopyNumber) : void 0;
    } catch (error) {
      e = error;
      return callback("Unable to temporarily save copied file");
    }
  };

  CloudFileManagerClient.prototype.openCopiedFile = function(copyParams) {
    var content, copied, e, error, key, metadata;
    try {
      key = "cfm-copy::" + copyParams;
      copied = JSON.parse(window.localStorage.getItem(key));
      content = cloudContentFactory.createEnvelopedCloudContent(copied.stringContent);
      metadata = new CloudMetadata({
        name: copied.name,
        type: CloudMetadata.File
      });
      this._fileChanged('openedFile', content, metadata, {
        dirty: true,
        openedContent: content.clone()
      });
      window.location.hash = "";
      return window.localStorage.removeItem(key);
    } catch (error) {
      e = error;
      return callback("Unable to load copied file");
    }
  };

  CloudFileManagerClient.prototype.shareGetLink = function() {
    var ref, sharedDocumentId, showShareDialog;
    showShareDialog = (function(_this) {
      return function(sharedDocumentId) {
        return _this._ui.shareUrlDialog(_this._getCurrentUrl("#shared=" + sharedDocumentId));
      };
    })(this);
    sharedDocumentId = (ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0;
    if (sharedDocumentId) {
      return showShareDialog(sharedDocumentId);
    } else {
      return this.share((function(_this) {
        return function(sharedDocumentId) {
          _this.dirty();
          return showShareDialog(sharedDocumentId);
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.shareUpdate = function() {
    return this.share();
  };

  CloudFileManagerClient.prototype.share = function(callback) {
    if (this.state.shareProvider) {
      return this._event('getContent', {}, (function(_this) {
        return function(stringContent) {
          var currentContent;
          _this._setState({
            sharing: true
          });
          currentContent = _this._createOrUpdateCurrentContent(stringContent);
          return _this.state.shareProvider.share(currentContent, _this.state.metadata, function(err, sharedContentId) {
            if (err) {
              return _this._error(err);
            }
            _this._fileChanged('sharedFile', currentContent, _this.state.metadata);
            return typeof callback === "function" ? callback(sharedContentId) : void 0;
          });
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.revertToShared = function(callback) {
    var id, ref;
    if (callback == null) {
      callback = null;
    }
    id = (ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0;
    if (id && (this.state.shareProvider != null)) {
      return this.state.shareProvider.loadSharedContent(id, (function(_this) {
        return function(err, content, metadata) {
          if (err) {
            return _this._error(err);
          }
          _this.state.currentContent.copyMetadataTo(content);
          _this._fileChanged('openedFile', content, metadata, {
            openedContent: content.clone()
          });
          return typeof callback === "function" ? callback(null) : void 0;
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.revertToSharedDialog = function(callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    if (((ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0) && (this.state.shareProvider != null) && confirm(tr("~CONFIRM.REVERT_TO_SHARED_VIEW"))) {
      return this.revertToShared(callback);
    }
  };

  CloudFileManagerClient.prototype.downloadDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._event('getContent', {}, (function(_this) {
      return function(content) {
        var ref;
        return _this._ui.downloadDialog((ref = _this.state.metadata) != null ? ref.name : void 0, cloudContentFactory.createEnvelopedCloudContent(content), callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.rename = function(metadata, newName, callback) {
    var _rename, dirty, ref, ref1, ref2;
    dirty = this.state.dirty;
    _rename = (function(_this) {
      return function(metadata) {
        var ref;
        if ((ref = _this.state.currentContent) != null) {
          ref.addMetadata({
            docName: metadata.name
          });
        }
        _this._fileChanged('renamedFile', _this.state.currentContent, metadata, {
          dirty: dirty
        }, _this._getHashParams(metadata));
        return typeof callback === "function" ? callback(newName) : void 0;
      };
    })(this);
    if (newName !== ((ref = this.state.metadata) != null ? ref.name : void 0)) {
      if ((ref1 = this.state.metadata) != null ? (ref2 = ref1.provider) != null ? ref2.can('rename') : void 0 : void 0) {
        return this.state.metadata.provider.rename(this.state.metadata, newName, (function(_this) {
          return function(err, metadata) {
            if (err) {
              return _this._error(err);
            }
            return _rename(metadata);
          };
        })(this));
      } else {
        if (metadata) {
          metadata.name = newName;
        } else {
          metadata = new CloudMetadata({
            name: newName,
            type: CloudMetadata.File
          });
        }
        return _rename(metadata);
      }
    }
  };

  CloudFileManagerClient.prototype.renameDialog = function(callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    return this._ui.renameDialog((ref = this.state.metadata) != null ? ref.name : void 0, (function(_this) {
      return function(newName) {
        return _this.rename(_this.state.metadata, newName, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.revertToLastOpened = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if ((this.state.openedContent != null) && this.state.metadata) {
      return this._fileChanged('openedFile', this.state.openedContent, this.state.metadata, {
        openedContent: this.state.openedContent.clone()
      });
    }
  };

  CloudFileManagerClient.prototype.revertToLastOpenedDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if ((this.state.openedContent != null) && this.state.metadata) {
      if (confirm(tr('~CONFIRM.REVERT_TO_LAST_OPENED'))) {
        return this.revertToLastOpened(callback);
      }
    } else {
      return typeof callback === "function" ? callback('No initial opened version was found for the currently active file') : void 0;
    }
  };

  CloudFileManagerClient.prototype.dirty = function(isDirty) {
    if (isDirty == null) {
      isDirty = true;
    }
    return this._setState({
      dirty: isDirty,
      saved: isDirty ? false : void 0
    });
  };

  CloudFileManagerClient.prototype.autoSave = function(interval) {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
    }
    if (interval > 1000) {
      interval = Math.round(interval / 1000);
    }
    if (interval > 0) {
      return this._autoSaveInterval = setInterval(((function(_this) {
        return function() {
          var ref, ref1;
          if (_this.state.dirty && ((ref = _this.state.metadata) != null ? (ref1 = ref.provider) != null ? ref1.can('save') : void 0 : void 0)) {
            return _this.save();
          }
        };
      })(this)), interval * 1000);
    }
  };

  CloudFileManagerClient.prototype.isAutoSaving = function() {
    return this._autoSaveInterval != null;
  };

  CloudFileManagerClient.prototype.showBlockingModal = function(modalProps) {
    return this._ui.blockingModal(modalProps);
  };

  CloudFileManagerClient.prototype._dialogSave = function(stringContent, metadata, callback) {
    if (stringContent !== null) {
      return this.saveFile(stringContent, metadata, callback);
    } else {
      return this._event('getContent', {}, (function(_this) {
        return function(stringContent) {
          return _this.saveFile(stringContent, metadata, callback);
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype._error = function(message) {
    return alert(message);
  };

  CloudFileManagerClient.prototype._fileChanged = function(type, content, metadata, additionalState, hashParams) {
    var key, state, value;
    if (additionalState == null) {
      additionalState = {};
    }
    if (hashParams == null) {
      hashParams = null;
    }
    if (metadata != null) {
      if (metadata.overwritable == null) {
        metadata.overwritable = true;
      }
    }
    state = {
      currentContent: content,
      metadata: metadata,
      saving: null,
      saved: false,
      dirty: false
    };
    for (key in additionalState) {
      if (!hasProp.call(additionalState, key)) continue;
      value = additionalState[key];
      state[key] = value;
    }
    this._setWindowTitle(metadata != null ? metadata.name : void 0);
    if (hashParams !== null) {
      window.location.hash = hashParams;
    }
    this._setState(state);
    return this._event(type, {
      content: content != null ? content.getText() : void 0
    });
  };

  CloudFileManagerClient.prototype._event = function(type, data, eventCallback) {
    var event, i, len, listener, ref, results;
    if (data == null) {
      data = {};
    }
    if (eventCallback == null) {
      eventCallback = null;
    }
    event = new CloudFileManagerClientEvent(type, data, eventCallback, this.state);
    ref = this._listeners;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      listener = ref[i];
      results.push(listener(event));
    }
    return results;
  };

  CloudFileManagerClient.prototype._setState = function(options) {
    var key, value;
    for (key in options) {
      if (!hasProp.call(options, key)) continue;
      value = options[key];
      this.state[key] = value;
    }
    return this._event('stateChanged');
  };

  CloudFileManagerClient.prototype._resetState = function() {
    return this._setState({
      openedContent: null,
      currentContent: null,
      metadata: null,
      dirty: false,
      saving: null,
      saved: false
    });
  };

  CloudFileManagerClient.prototype._closeCurrentFile = function() {
    var ref, ref1;
    if ((ref = this.state.metadata) != null ? (ref1 = ref.provider) != null ? ref1.can('close') : void 0 : void 0) {
      return this.state.metadata.provider.close(this.state.metadata);
    }
  };

  CloudFileManagerClient.prototype._createOrUpdateCurrentContent = function(stringContent, metadata) {
    var currentContent;
    if (metadata == null) {
      metadata = null;
    }
    if (this.state.currentContent != null) {
      currentContent = this.state.currentContent;
      currentContent.setText(stringContent);
    } else {
      currentContent = cloudContentFactory.createEnvelopedCloudContent(stringContent);
    }
    if (metadata != null) {
      currentContent.addMetadata({
        docName: metadata.name
      });
    }
    return currentContent;
  };

  CloudFileManagerClient.prototype._getCurrentUrl = function(queryString) {
    var suffix;
    if (queryString == null) {
      queryString = null;
    }
    suffix = queryString != null ? "?" + queryString : "";
    return "" + document.location.origin + document.location.pathname + suffix;
  };

  CloudFileManagerClient.prototype._setWindowTitle = function(name) {
    var ref, ref1;
    if ((ref = this.appOptions) != null ? (ref1 = ref.ui) != null ? ref1.windowTitleSuffix : void 0 : void 0) {
      return document.title = "" + ((name != null ? name.length : void 0) > 0 ? name : tr("~MENUBAR.UNTITLED_DOCUMENT")) + this.appOptions.ui.windowTitleSeparator + this.appOptions.ui.windowTitleSuffix;
    }
  };

  CloudFileManagerClient.prototype._getHashParams = function(metadata) {
    var ref;
    if (metadata != null ? (ref = metadata.provider) != null ? ref.canOpenSaved() : void 0 : void 0) {
      return "#file=" + metadata.provider.name + ":" + (encodeURIComponent(metadata.provider.getOpenSavedParams(metadata)));
    } else {
      return "";
    }
  };

  return CloudFileManagerClient;

})();

module.exports = {
  CloudFileManagerClientEvent: CloudFileManagerClientEvent,
  CloudFileManagerClient: CloudFileManagerClient
};



},{"./providers/document-store-provider":32,"./providers/google-drive-provider":33,"./providers/local-file-provider":34,"./providers/localstorage-provider":35,"./providers/provider-interface":36,"./providers/readonly-provider":37,"./ui":38,"./utils/is-string":40,"./utils/translate":42}],32:[function(require,module,exports){
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, cloudContentFactory, div, documentStore, isString, jiff, listUrl, loadDocumentUrl, patchDocumentUrl, ref, removeDocumentUrl, renameDocumentUrl, saveDocumentUrl, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

documentStore = "http://document-store.herokuapp.com";

authorizeUrl = documentStore + "/user/authenticate";

checkLoginUrl = documentStore + "/user/info";

listUrl = documentStore + "/document/all";

loadDocumentUrl = documentStore + "/document/open";

saveDocumentUrl = documentStore + "/document/save";

patchDocumentUrl = documentStore + "/document/patch";

removeDocumentUrl = documentStore + "/document/delete";

renameDocumentUrl = documentStore + "/document/rename";

tr = require('../utils/translate');

isString = require('../utils/is-string');

jiff = require('jiff');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

DocumentStoreAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'DocumentStoreAuthorizationDialog',
  getInitialState: function() {
    return {
      docStoreAvailable: false
    };
  },
  componentWillMount: function() {
    return this.props.provider._onDocStoreLoaded((function(_this) {
      return function() {
        return _this.setState({
          docStoreAvailable: true
        });
      };
    })(this));
  },
  authenticate: function() {
    return this.props.provider.authorize();
  },
  render: function() {
    return div({
      className: 'document-store-auth'
    }, div({
      className: 'document-store-concord-logo'
    }, ''), div({
      className: 'document-store-footer'
    }, this.state.docStoreAvailable ? button({
      onClick: this.authenticate
    }, 'Login to Concord') : 'Trying to log into Concord...'));
  }
}));

DocumentStoreProvider = (function(superClass) {
  extend(DocumentStoreProvider, superClass);

  function DocumentStoreProvider(options, client) {
    this.options = options != null ? options : {};
    this.client = client;
    DocumentStoreProvider.__super__.constructor.call(this, {
      name: DocumentStoreProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.DOCUMENT_STORE')),
      capabilities: {
        save: true,
        load: true,
        list: true,
        remove: true,
        rename: true,
        share: true,
        close: false
      }
    });
    this.user = null;
  }

  DocumentStoreProvider.Name = 'documentStore';

  DocumentStoreProvider.prototype.previouslySavedContent = null;

  DocumentStoreProvider.prototype.authorized = function(authCallback) {
    this.authCallback = authCallback;
    if (this.authCallback) {
      if (this.user) {
        return this.authCallback(true);
      } else {
        return this._checkLogin();
      }
    } else {
      return this.user !== null;
    }
  };

  DocumentStoreProvider.prototype.authorize = function() {
    return this._showLoginWindow();
  };

  DocumentStoreProvider.prototype._onDocStoreLoaded = function(docStoreLoadedCallback) {
    this.docStoreLoadedCallback = docStoreLoadedCallback;
    if (this._docStoreLoaded) {
      return this.docStoreLoadedCallback();
    }
  };

  DocumentStoreProvider.prototype._loginSuccessful = function(user) {
    var ref1;
    this.user = user;
    if ((ref1 = this._loginWindow) != null) {
      ref1.close();
    }
    return this.authCallback(true);
  };

  DocumentStoreProvider.prototype._checkLogin = function() {
    var provider;
    provider = this;
    return $.ajax({
      dataType: 'json',
      url: checkLoginUrl,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        provider.docStoreLoadedCallback();
        return provider._loginSuccessful(data);
      },
      error: function() {
        return provider.docStoreLoadedCallback();
      }
    });
  };

  DocumentStoreProvider.prototype._loginWindow = null;

  DocumentStoreProvider.prototype._showLoginWindow = function() {
    var computeScreenLocation, height, poll, pollAction, position, width, windowFeatures;
    if (this._loginWindow && !this._loginWindow.closed) {
      return this._loginWindow.focus();
    } else {
      computeScreenLocation = function(w, h) {
        var height, left, screenLeft, screenTop, top, width;
        screenLeft = window.screenLeft || screen.left;
        screenTop = window.screenTop || screen.top;
        width = window.innerWidth || document.documentElement.clientWidth || screen.width;
        height = window.innerHeight || document.documentElement.clientHeight || screen.height;
        left = ((width / 2) - (w / 2)) + screenLeft;
        top = ((height / 2) - (h / 2)) + screenTop;
        return {
          left: left,
          top: top
        };
      };
      width = 1000;
      height = 480;
      position = computeScreenLocation(width, height);
      windowFeatures = ['width=' + width, 'height=' + height, 'top=' + position.top || 200, 'left=' + position.left || 200, 'dependent=yes', 'resizable=no', 'location=no', 'dialog=yes', 'menubar=no'];
      this._loginWindow = window.open(authorizeUrl, 'auth', windowFeatures.join());
      pollAction = (function(_this) {
        return function() {
          var e, error, href;
          try {
            href = _this._loginWindow.location.href;
            if (href === window.location.href) {
              clearInterval(poll);
              _this._loginWindow.close();
              return _this._checkLogin();
            }
          } catch (error) {
            e = error;
          }
        };
      })(this);
      return poll = setInterval(pollAction, 200);
    }
  };

  DocumentStoreProvider.prototype.renderAuthorizationDialog = function() {
    return DocumentStoreAuthorizationDialog({
      provider: this,
      authCallback: this.authCallback
    });
  };

  DocumentStoreProvider.prototype.renderUser = function() {
    if (this.user) {
      return span({}, span({
        className: 'document-store-icon'
      }), this.user.name);
    } else {
      return null;
    }
  };

  DocumentStoreProvider.prototype.list = function(metadata, callback) {
    return $.ajax({
      dataType: 'json',
      url: listUrl,
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        var file, key, list;
        list = [];
        for (key in data) {
          if (!hasProp.call(data, key)) continue;
          file = data[key];
          list.push(new CloudMetadata({
            name: file.name,
            providerData: {
              id: file.id
            },
            type: CloudMetadata.File,
            provider: this
          }));
        }
        return callback(null, list);
      },
      error: function() {
        return callback(null, []);
      }
    });
  };

  DocumentStoreProvider.prototype.loadSharedContent = function(id, callback) {
    var sharedMetadata;
    sharedMetadata = new CloudMetadata({
      sharedContentId: id,
      type: CloudMetadata.File,
      overwritable: false
    });
    return this.load(sharedMetadata, function(err, content) {
      return callback(err, content, sharedMetadata);
    });
  };

  DocumentStoreProvider.prototype.load = function(metadata, callback) {
    var ref1, withCredentials;
    withCredentials = !metadata.sharedContentId ? true : false;
    return $.ajax({
      url: loadDocumentUrl,
      data: {
        recordid: ((ref1 = metadata.providerData) != null ? ref1.id : void 0) || metadata.sharedContentId
      },
      context: this,
      xhrFields: {
        withCredentials: withCredentials
      },
      success: function(data) {
        var content;
        content = cloudContentFactory.createEnvelopedCloudContent(data);
        if (this.options.patch) {
          this.previouslySavedContent = content.clone();
        }
        if (metadata.name == null) {
          metadata.name = data.docName;
        }
        return callback(null, content);
      },
      error: function() {
        var message, ref2;
        message = metadata.sharedContentId ? "Unable to load document '" + metadata.sharedContentId + "'. Perhaps the file was not shared?" : "Unable to load " + (metadata.name || ((ref2 = metadata.providerData) != null ? ref2.id : void 0) || 'file');
        return callback(message);
      }
    });
  };

  DocumentStoreProvider.prototype.share = function(content, metadata, callback) {
    var params, runKey, url;
    runKey = content.get("shareEditKey") || Math.random().toString(16).substring(2);
    params = {
      runKey: runKey
    };
    if (content.get("sharedDocumentId")) {
      params.recordid = content.get("sharedDocumentId");
    }
    content.addMetadata({
      _permissions: 1,
      shareEditKey: null,
      sharedDocumentId: null
    });
    url = this._addParams(saveDocumentUrl, params);
    return $.ajax({
      dataType: 'json',
      method: 'POST',
      url: url,
      data: content.getContentAsJSON(),
      context: this,
      xhrFields: {
        withCredentials: false
      },
      success: function(data) {
        content.addMetadata({
          sharedDocumentId: data.id,
          shareEditKey: runKey,
          _permissions: 0
        });
        return callback(null, data.id);
      },
      error: function() {
        return callback("Unable to save " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.save = function(cloudContent, metadata, callback) {
    var canOverwrite, content, diff, params, sendContent, url;
    content = cloudContent.getContent();
    params = {};
    if (metadata.providerData.id) {
      params.recordid = metadata.providerData.id;
    }
    canOverwrite = metadata.overwritable && (this.previouslySavedContent != null);
    if (canOverwrite && (diff = this._createDiff(this.previouslySavedContent.getContent(), content))) {
      sendContent = diff;
      url = patchDocumentUrl;
    } else {
      if (metadata.name) {
        params.recordname = metadata.name;
      }
      url = saveDocumentUrl;
      sendContent = content;
    }
    url = this._addParams(url, params);
    return $.ajax({
      dataType: 'json',
      method: 'POST',
      url: url,
      data: JSON.stringify(sendContent),
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        if (this.options.patch) {
          this.previouslySavedContent = cloudContent.clone();
        }
        if (data.id) {
          metadata.providerData.id = data.id;
        }
        return callback(null, data);
      },
      error: function() {
        return callback("Unable to save " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.remove = function(metadata, callback) {
    return $.ajax({
      url: removeDocumentUrl,
      data: {
        recordname: metadata.name
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        return callback(null, data);
      },
      error: function() {
        return callback("Unable to load " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.rename = function(metadata, newName, callback) {
    return $.ajax({
      url: renameDocumentUrl,
      data: {
        recordid: metadata.providerData.id,
        newRecordname: newName
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        metadata.name = newName;
        return callback(null, metadata);
      },
      error: function() {
        return callback("Unable to rename " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.openSaved = function(openSavedParams, callback) {
    var metadata;
    metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData: {
        id: openSavedParams
      }
    });
    return this.load(metadata, function(err, content) {
      return callback(err, content, metadata);
    });
  };

  DocumentStoreProvider.prototype.getOpenSavedParams = function(metadata) {
    return metadata.providerData.id;
  };

  DocumentStoreProvider.prototype._addParams = function(url, params) {
    var key, kvp, value;
    if (!params) {
      return url;
    }
    kvp = [];
    for (key in params) {
      value = params[key];
      kvp.push([key, value].map(encodeURI).join("="));
    }
    return url + "?" + kvp.join("&");
  };

  DocumentStoreProvider.prototype._createDiff = function(obj1, obj2) {
    var cleanedObj1, cleanedObj2, diff, error, opts;
    try {
      opts = typeof this.options.patchObjectHash === "function" ? {
        hash: this.options.patchObjectHash
      } : void 0;
      cleanedObj1 = JSON.parse(JSON.stringify(obj1));
      cleanedObj2 = JSON.parse(JSON.stringify(obj2));
      diff = jiff.diff(cleanedObj1, cleanedObj2, opts);
      return diff;
    } catch (error) {
      return null;
    }
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":40,"../utils/translate":42,"./provider-interface":36,"jiff":17}],33:[function(require,module,exports){
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, button, cloudContentFactory, div, isString, jsdiff, ref, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

tr = require('../utils/translate');

isString = require('../utils/is-string');

jsdiff = require('diff');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

GoogleDriveAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'GoogleDriveAuthorizationDialog',
  getInitialState: function() {
    return {
      loadedGAPI: false
    };
  },
  componentWillMount: function() {
    return this.props.provider._loadedGAPI((function(_this) {
      return function() {
        return _this.setState({
          loadedGAPI: true
        });
      };
    })(this));
  },
  authenticate: function() {
    return this.props.provider.authorize(GoogleDriveProvider.SHOW_POPUP);
  },
  render: function() {
    return div({
      className: 'google-drive-auth'
    }, div({
      className: 'google-drive-concord-logo'
    }, ''), div({
      className: 'google-drive-footer'
    }, this.state.loadedGAPI ? button({
      onClick: this.authenticate
    }, 'Login to Google') : 'Trying to log into Google...'));
  }
}));

GoogleDriveProvider = (function(superClass) {
  extend(GoogleDriveProvider, superClass);

  function GoogleDriveProvider(options, client) {
    this.options = options != null ? options : {};
    this.client = client;
    GoogleDriveProvider.__super__.constructor.call(this, {
      name: GoogleDriveProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.GOOGLE_DRIVE')),
      capabilities: {
        save: true,
        load: true,
        list: true,
        remove: true,
        rename: true,
        close: true
      }
    });
    this.authToken = null;
    this.user = null;
    this.clientId = this.options.clientId;
    if (!this.clientId) {
      throw new Error('Missing required clientId in googleDrive provider options');
    }
    this.mimeType = this.options.mimeType || "text/plain";
    this.useRealTimeAPI = this.options.useRealTimeAPI || false;
    if (this.useRealTimeAPI) {
      this.mimeType += '+cfm_realtime';
    }
    this._loadGAPI();
  }

  GoogleDriveProvider.Name = 'googleDrive';

  GoogleDriveProvider.IMMEDIATE = true;

  GoogleDriveProvider.SHOW_POPUP = false;

  GoogleDriveProvider.prototype.authorized = function(authCallback) {
    this.authCallback = authCallback;
    if (this.authCallback) {
      if (this.authToken) {
        return this.authCallback(true);
      } else {
        return this.authorize(GoogleDriveProvider.IMMEDIATE);
      }
    } else {
      return this.authToken !== null;
    }
  };

  GoogleDriveProvider.prototype.authorize = function(immediate) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var args;
        args = {
          client_id: _this.clientId,
          scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.profile'],
          immediate: immediate
        };
        return gapi.auth.authorize(args, function(authToken) {
          _this.authToken = authToken && !authToken.error ? authToken : null;
          _this.user = null;
          _this.autoRenewToken(_this.authToken);
          if (_this.authToken) {
            gapi.client.oauth2.userinfo.get().execute(function(user) {
              return _this.user = user;
            });
          }
          return _this.authCallback(_this.authToken !== null);
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.autoRenewToken = function(authToken) {
    if (this._autoRenewTimeout) {
      clearTimeout(this._autoRenewTimeout);
    }
    if (authToken && !authToken.error) {
      return this._autoRenewTimeout = setTimeout(((function(_this) {
        return function() {
          return _this.authorize(GoogleDriveProvider.IMMEDIATE);
        };
      })(this)), (parseInt(authToken.expires_in, 10) * 0.75) * 1000);
    }
  };

  GoogleDriveProvider.prototype.renderAuthorizationDialog = function() {
    return GoogleDriveAuthorizationDialog({
      provider: this
    });
  };

  GoogleDriveProvider.prototype.renderUser = function() {
    if (this.user) {
      return span({}, span({
        className: 'gdrive-icon'
      }), this.user.name);
    } else {
      return null;
    }
  };

  GoogleDriveProvider.prototype.save = function(content, metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        if (_this.useRealTimeAPI) {
          return _this._saveRealTimeFile(content, metadata, callback);
        } else {
          return _this._saveFile(content, metadata, callback);
        }
      };
    })(this));
  };

  GoogleDriveProvider.prototype.load = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        if (_this.useRealTimeAPI) {
          return _this._loadOrCreateRealTimeFile(metadata, callback);
        } else {
          return _this._loadFile(metadata, callback);
        }
      };
    })(this));
  };

  GoogleDriveProvider.prototype.list = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var query, request;
        request = gapi.client.drive.files.list({
          q: query = "((mimeType = '" + _this.mimeType + "') or (mimeType = 'application/vnd.google-apps.folder')) and '" + (metadata ? metadata.providerData.id : 'root') + "' in parents"
        });
        return request.execute(function(result) {
          var i, item, len, list, ref1;
          if (!result) {
            return callback('Unable to list files');
          }
          list = [];
          ref1 = result != null ? result.items : void 0;
          for (i = 0, len = ref1.length; i < len; i++) {
            item = ref1[i];
            list.push(new CloudMetadata({
              name: item.title,
              type: item.mimeType === 'application/vnd.google-apps.folder' ? CloudMetadata.Folder : CloudMetadata.File,
              parent: metadata,
              overwritable: item.editable,
              provider: _this,
              providerData: {
                id: item.id
              }
            }));
          }
          list.sort(function(a, b) {
            var lowerA, lowerB;
            lowerA = a.name.toLowerCase();
            lowerB = b.name.toLowerCase();
            if (lowerA < lowerB) {
              return -1;
            }
            if (lowerA > lowerB) {
              return 1;
            }
            return 0;
          });
          return callback(null, list);
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.remove = function(metadata, callback) {
    return this._loadedGAPI(function() {
      var request;
      request = gapi.client.drive.files["delete"]({
        fileId: metadata.providerData.id
      });
      return request.execute(function(result) {
        return typeof callback === "function" ? callback((result != null ? result.error : void 0) || null) : void 0;
      });
    });
  };

  GoogleDriveProvider.prototype.rename = function(metadata, newName, callback) {
    return this._loadedGAPI(function() {
      var request;
      request = gapi.client.drive.files.patch({
        fileId: metadata.providerData.id,
        resource: {
          title: newName
        }
      });
      return request.execute(function(result) {
        if (result != null ? result.error : void 0) {
          return typeof callback === "function" ? callback(result.error) : void 0;
        } else {
          metadata.name = newName;
          return callback(null, metadata);
        }
      });
    });
  };

  GoogleDriveProvider.prototype.close = function(metadata, callback) {
    var ref1, ref2;
    if (((ref1 = metadata.providerData) != null ? (ref2 = ref1.realTime) != null ? ref2.doc : void 0 : void 0) != null) {
      return metadata.providerData.realTime.doc.close();
    }
  };

  GoogleDriveProvider.prototype.openSaved = function(openSavedParams, callback) {
    var metadata;
    metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData: {
        id: openSavedParams
      }
    });
    return this.load(metadata, function(err, content) {
      return callback(err, content, metadata);
    });
  };

  GoogleDriveProvider.prototype.getOpenSavedParams = function(metadata) {
    return metadata.providerData.id;
  };

  GoogleDriveProvider.prototype._loadGAPI = function() {
    var script;
    if (!window._LoadingGAPI) {
      window._LoadingGAPI = true;
      window._GAPIOnLoad = function() {
        return this.window._LoadedGAPI = true;
      };
      script = document.createElement('script');
      script.src = 'https://apis.google.com/js/client.js?onload=_GAPIOnLoad';
      return document.head.appendChild(script);
    }
  };

  GoogleDriveProvider.prototype._loadedGAPI = function(callback) {
    var check, self;
    if (window._LoadedGAPIClients) {
      return callback();
    } else {
      self = this;
      check = function() {
        if (window._LoadedGAPI) {
          return gapi.client.load('drive', 'v2', function() {
            return gapi.client.load('oauth2', 'v2', function() {
              return gapi.load('drive-realtime', function() {
                window._LoadedGAPIClients = true;
                return callback.call(self);
              });
            });
          });
        } else {
          return setTimeout(check, 10);
        }
      };
      return setTimeout(check, 10);
    }
  };

  GoogleDriveProvider.prototype._loadFile = function(metadata, callback) {
    var request;
    request = gapi.client.drive.files.get({
      fileId: metadata.providerData.id
    });
    return request.execute((function(_this) {
      return function(file) {
        var xhr;
        if (file != null ? file.downloadUrl : void 0) {
          metadata.name = file.title;
          metadata.overwritable = file.editable;
          metadata.providerData = {
            id: file.id
          };
          xhr = new XMLHttpRequest();
          xhr.open('GET', file.downloadUrl);
          if (_this.authToken) {
            xhr.setRequestHeader('Authorization', "Bearer " + _this.authToken.access_token);
          }
          xhr.onload = function() {
            return callback(null, cloudContentFactory.createEnvelopedCloudContent(xhr.responseText));
          };
          xhr.onerror = function() {
            return callback("Unable to download " + url);
          };
          return xhr.send();
        } else {
          return callback(_this._apiError(file, 'Unable to get download url'));
        }
      };
    })(this));
  };

  GoogleDriveProvider.prototype._saveFile = function(content, metadata, callback) {
    var body, boundary, header, method, path, ref1, ref2, ref3, ref4, request;
    boundary = '-------314159265358979323846';
    header = JSON.stringify({
      title: metadata.name,
      mimeType: this.mimeType,
      parents: [
        {
          id: ((ref1 = metadata.parent) != null ? (ref2 = ref1.providerData) != null ? ref2.id : void 0 : void 0) != null ? metadata.parent.providerData.id : 'root'
        }
      ]
    });
    ref4 = ((ref3 = metadata.providerData) != null ? ref3.id : void 0) ? ['PUT', "/upload/drive/v2/files/" + metadata.providerData.id] : ['POST', '/upload/drive/v2/files'], method = ref4[0], path = ref4[1];
    body = ["\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + header, "\r\n--" + boundary + "\r\nContent-Type: " + this.mimeType + "\r\n\r\n" + (content.getContentAsJSON()), "\r\n--" + boundary + "--"].join('');
    request = gapi.client.request({
      path: path,
      method: method,
      params: {
        uploadType: 'multipart'
      },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: body
    });
    return request.execute((function(_this) {
      return function(file) {
        if (callback) {
          if (file != null ? file.error : void 0) {
            return callback("Unabled to upload file: " + file.error.message);
          } else if (file) {
            metadata.providerData = {
              id: file.id
            };
            return callback(null, file);
          } else {
            return callback(_this._apiError(file, 'Unabled to upload file'));
          }
        }
      };
    })(this));
  };

  GoogleDriveProvider.prototype._loadOrCreateRealTimeFile = function(metadata, callback) {
    var error, fileLoaded, init, ref1, ref2, ref3, request, self;
    self = this;
    fileLoaded = function(doc) {
      var collaborator, content, i, len, ref1, sessionId, throwError;
      content = doc.getModel().getRoot().get('content');
      if (metadata.overwritable) {
        throwError = function(e) {
          if (!e.isLocal && e.sessionId !== metadata.providerData.realTime.sessionId) {
            return self.client.showBlockingModal({
              title: 'Concurrent Edit Lock',
              message: 'An edit was made to this file from another browser window. This app is now locked for input.'
            });
          }
        };
        content.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED, throwError);
        content.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED, throwError);
      }
      ref1 = doc.getCollaborators();
      for (i = 0, len = ref1.length; i < len; i++) {
        collaborator = ref1[i];
        if (collaborator.isMe) {
          sessionId = collaborator.sessionId;
        }
      }
      metadata.providerData.realTime = {
        doc: doc,
        content: content,
        sessionId: sessionId
      };
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(content.getText()));
    };
    init = function(model) {
      var content;
      content = model.createString('');
      return model.getRoot().set('content', content);
    };
    error = (function(_this) {
      return function(err) {
        if (err.type === 'TOKEN_REFRESH_REQUIRED') {
          return _this.authorize(GoogleDriveProvider.IMMEDIATE);
        } else {
          return alert(err.message);
        }
      };
    })(this);
    if ((ref1 = metadata.providerData) != null ? ref1.id : void 0) {
      request = gapi.client.drive.files.get({
        fileId: metadata.providerData.id
      });
    } else {
      request = gapi.client.drive.files.insert({
        title: metadata.name,
        mimeType: this.mimeType,
        parents: [
          {
            id: ((ref2 = metadata.parent) != null ? (ref3 = ref2.providerData) != null ? ref3.id : void 0 : void 0) != null ? metadata.parent.providerData.id : 'root'
          }
        ]
      });
    }
    return request.execute((function(_this) {
      return function(file) {
        if (file != null ? file.id : void 0) {
          metadata.name = file.title;
          metadata.overwritable = file.editable;
          metadata.providerData = {
            id: file.id
          };
          return gapi.drive.realtime.load(file.id, fileLoaded, init, error);
        } else {
          return callback(_this._apiError(file, 'Unable to load file'));
        }
      };
    })(this));
  };

  GoogleDriveProvider.prototype._saveRealTimeFile = function(content, metadata, callback) {
    var ref1;
    if ((ref1 = metadata.providerData) != null ? ref1.model : void 0) {
      return this._diffAndUpdateRealTimeModel(content, metadata, callback);
    } else {
      return this._loadOrCreateRealTimeFile(metadata, (function(_this) {
        return function(err) {
          if (err) {
            return callback(err);
          }
          return _this._diffAndUpdateRealTimeModel(content, metadata, callback);
        };
      })(this));
    }
  };

  GoogleDriveProvider.prototype._diffAndUpdateRealTimeModel = function(content, metadata, callback) {
    var diff, diffs, i, index, len, realTimeContent;
    index = 0;
    realTimeContent = metadata.providerData.realTime.content;
    diffs = jsdiff.diffChars(realTimeContent.getText(), content.getContentAsJSON());
    for (i = 0, len = diffs.length; i < len; i++) {
      diff = diffs[i];
      if (diff.removed) {
        realTimeContent.removeRange(index, index + diff.value.length);
      } else {
        if (diff.added) {
          realTimeContent.insertString(index, diff.value);
        }
        index += diff.count;
      }
    }
    return callback(null);
  };

  GoogleDriveProvider.prototype._apiError = function(result, prefix) {
    if ((result != null ? result.message : void 0) != null) {
      return prefix + ": " + result.message;
    } else {
      return prefix;
    }
  };

  return GoogleDriveProvider;

})(ProviderInterface);

module.exports = GoogleDriveProvider;



},{"../utils/is-string":40,"../utils/translate":42,"./provider-interface":36,"diff":11}],34:[function(require,module,exports){
var CloudMetadata, LocalFileListTab, LocalFileProvider, ProviderInterface, button, cloudContentFactory, div, input, ref, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, input = ref.input, button = ref.button;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

LocalFileListTab = React.createFactory(React.createClass({
  displayName: 'LocalFileListTab',
  getInitialState: function() {
    return {
      hover: false
    };
  },
  changed: function(e) {
    var files;
    files = e.target.files;
    if (files.length > 1) {
      return alert(tr("~LOCAL_FILE_DIALOG.MULTIPLE_FILES_SELECTED"));
    } else if (files.length === 1) {
      return this.openFile(files[0]);
    }
  },
  openFile: function(file) {
    var base, metadata;
    metadata = new CloudMetadata({
      name: file.name.split('.')[0],
      type: CloudMetadata.File,
      parent: null,
      provider: this.props.provider,
      providerData: {
        file: file
      }
    });
    if (typeof (base = this.props.dialog).callback === "function") {
      base.callback(metadata);
    }
    return this.props.close();
  },
  cancel: function() {
    return this.props.close();
  },
  dragEnter: function(e) {
    e.preventDefault();
    return this.setState({
      hover: true
    });
  },
  dragLeave: function(e) {
    e.preventDefault();
    return this.setState({
      hover: false
    });
  },
  drop: function(e) {
    var droppedFiles;
    e.preventDefault();
    droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (droppedFiles.length > 1) {
      return alert("~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED");
    } else if (droppedFiles.length === 1) {
      return this.openFile(droppedFiles[0]);
    }
  },
  render: function() {
    var dropClass;
    dropClass = "dropArea" + (this.state.hover ? ' dropHover' : '');
    return div({
      className: 'dialogTab localFileLoad'
    }, div({
      className: dropClass,
      onDragEnter: this.dragEnter,
      onDragLeave: this.dragLeave,
      onDrop: this.drop
    }, tr("~LOCAL_FILE_DIALOG.DROP_FILE_HERE"), input({
      type: 'file',
      onChange: this.changed
    })), div({
      className: 'buttons'
    }, button({
      onClick: this.cancel
    }, tr("~FILE_DIALOG.CANCEL"))));
  }
}));

LocalFileProvider = (function(superClass) {
  extend(LocalFileProvider, superClass);

  function LocalFileProvider(options, client) {
    this.options = options != null ? options : {};
    this.client = client;
    LocalFileProvider.__super__.constructor.call(this, {
      name: LocalFileProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      capabilities: {
        save: false,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    });
  }

  LocalFileProvider.Name = 'localFile';

  LocalFileProvider.prototype.filterTabComponent = function(capability, defaultComponent) {
    if (capability === 'list') {
      return LocalFileListTab;
    } else {
      return defaultComponent;
    }
  };

  LocalFileProvider.prototype.list = function(metadata, callback) {};

  LocalFileProvider.prototype.load = function(metadata, callback) {
    var reader;
    reader = new FileReader();
    reader.onload = function(loaded) {
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(loaded.target.result));
    };
    return reader.readAsText(metadata.providerData.file);
  };

  LocalFileProvider.prototype.canOpenSaved = function() {
    return false;
  };

  return LocalFileProvider;

})(ProviderInterface);

module.exports = LocalFileProvider;



},{"../utils/translate":42,"./provider-interface":36}],35:[function(require,module,exports){
var CloudMetadata, LocalStorageProvider, ProviderInterface, cloudContentFactory, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

LocalStorageProvider = (function(superClass) {
  extend(LocalStorageProvider, superClass);

  function LocalStorageProvider(options, client) {
    this.options = options != null ? options : {};
    this.client = client;
    LocalStorageProvider.__super__.constructor.call(this, {
      name: LocalStorageProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.LOCAL_STORAGE')),
      capabilities: {
        save: true,
        load: true,
        list: true,
        remove: true,
        rename: true,
        close: false
      }
    });
  }

  LocalStorageProvider.Name = 'localStorage';

  LocalStorageProvider.Available = function() {
    var result, test;
    return result = (function() {
      var error;
      try {
        test = 'LocalStorageProvider::auth';
        window.localStorage.setItem(test, test);
        window.localStorage.removeItem(test);
        return true;
      } catch (error) {
        return false;
      }
    })();
  };

  LocalStorageProvider.prototype.save = function(content, metadata, callback) {
    var e, error, fileKey;
    try {
      fileKey = this._getKey(metadata.name);
      window.localStorage.setItem(fileKey, content.getContentAsJSON());
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      e = error;
      return callback("Unable to save: " + e.message);
    }
  };

  LocalStorageProvider.prototype.load = function(metadata, callback) {
    var e, error;
    try {
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(window.localStorage.getItem(this._getKey(metadata.name))));
    } catch (error) {
      e = error;
      return callback("Unable to load: " + e.message);
    }
  };

  LocalStorageProvider.prototype.list = function(metadata, callback) {
    var filename, key, list, name, prefix, ref, ref1, remainder;
    list = [];
    prefix = this._getKey(((metadata != null ? metadata.path() : void 0) || []).join('/'));
    ref = window.localStorage;
    for (key in ref) {
      if (!hasProp.call(ref, key)) continue;
      if (key.substr(0, prefix.length) === prefix) {
        ref1 = key.substr(prefix.length).split('/'), filename = ref1[0], remainder = 2 <= ref1.length ? slice.call(ref1, 1) : [];
        name = key.substr(prefix.length);
        list.push(new CloudMetadata({
          name: name,
          type: remainder.length > 0 ? CloudMetadata.Folder : CloudMetadata.File,
          parent: metadata,
          provider: this
        }));
      }
    }
    return callback(null, list);
  };

  LocalStorageProvider.prototype.remove = function(metadata, callback) {
    var error;
    try {
      window.localStorage.removeItem(this._getKey(metadata.name));
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to delete') : void 0;
    }
  };

  LocalStorageProvider.prototype.rename = function(metadata, newName, callback) {
    var content, error;
    try {
      content = window.localStorage.getItem(this._getKey(metadata.name));
      window.localStorage.setItem(this._getKey(newName), content);
      window.localStorage.removeItem(this._getKey(metadata.name));
      metadata.name = newName;
      return callback(null, metadata);
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to rename') : void 0;
    }
  };

  LocalStorageProvider.prototype.openSaved = function(openSavedParams, callback) {
    var metadata;
    metadata = new CloudMetadata({
      name: openSavedParams,
      type: CloudMetadata.File,
      parent: null,
      provider: this
    });
    return this.load(metadata, function(err, content) {
      return callback(err, content, metadata);
    });
  };

  LocalStorageProvider.prototype.getOpenSavedParams = function(metadata) {
    return metadata.name;
  };

  LocalStorageProvider.prototype._getKey = function(name) {
    if (name == null) {
      name = '';
    }
    return "cfm::" + (name.replace(/\t/g, ' '));
  };

  return LocalStorageProvider;

})(ProviderInterface);

module.exports = LocalStorageProvider;



},{"../utils/translate":42,"./provider-interface":36}],36:[function(require,module,exports){
var CloudContent, CloudContentFactory, CloudFile, CloudMetadata, ProviderInterface, div, isString,
  hasProp = {}.hasOwnProperty;

div = React.DOM.div;

isString = require('../utils/is-string');

CloudFile = (function() {
  function CloudFile(options) {
    this.content = options.content, this.metadata = options.metadata;
  }

  return CloudFile;

})();

CloudMetadata = (function() {
  function CloudMetadata(options) {
    var ref, ref1, ref2;
    this.name = options.name, this.type = options.type, this.provider = (ref = options.provider) != null ? ref : null, this.parent = (ref1 = options.parent) != null ? ref1 : null, this.providerData = (ref2 = options.providerData) != null ? ref2 : {}, this.overwritable = options.overwritable, this.sharedContentId = options.sharedContentId, this.sharedContentSecretKey = options.sharedContentSecretKey;
  }

  CloudMetadata.Folder = 'folder';

  CloudMetadata.File = 'file';

  CloudMetadata.prototype.path = function() {
    var _path, parent;
    _path = [];
    parent = this.parent;
    while (parent !== null) {
      _path.unshift(parent);
      parent = parent.parent;
    }
    return _path;
  };

  return CloudMetadata;

})();

CloudContentFactory = (function() {
  function CloudContentFactory() {
    this.envelopeMetadata = {};
  }

  CloudContentFactory.prototype.setEnvelopeMetadata = function(envelopeMetadata) {
    var key, results;
    results = [];
    for (key in envelopeMetadata) {
      results.push(this.envelopeMetadata[key] = envelopeMetadata[key]);
    }
    return results;
  };

  CloudContentFactory.prototype.createEnvelopedCloudContent = function(content) {
    return new CloudContent(this.envelopContent(content));
  };

  CloudContentFactory.prototype.envelopContent = function(content) {
    var envelopedCloudContent, key;
    envelopedCloudContent = this._wrapIfNeeded(content);
    for (key in this.envelopeMetadata) {
      if (envelopedCloudContent[key] == null) {
        envelopedCloudContent[key] = this.envelopeMetadata[key];
      }
    }
    return envelopedCloudContent;
  };

  CloudContentFactory.prototype._wrapIfNeeded = function(content) {
    if (isString(content)) {
      try {
        content = JSON.parse(content);
      } catch (undefined) {}
    }
    if (content.content != null) {
      return content;
    } else {
      return {
        content: content
      };
    }
  };

  return CloudContentFactory;

})();

CloudContent = (function() {
  function CloudContent(_1) {
    this._ = _1 != null ? _1 : {};
  }

  CloudContent.prototype.getContent = function() {
    return this._;
  };

  CloudContent.prototype.getContentAsJSON = function() {
    return JSON.stringify(this._);
  };

  CloudContent.prototype.clone = function() {
    return new CloudContent(_.cloneDeep(this._));
  };

  CloudContent.prototype.setText = function(text) {
    return this._.content = text;
  };

  CloudContent.prototype.getText = function() {
    if (this._.content === null) {
      return '';
    } else if (isString(this._.content)) {
      return this._.content;
    } else {
      return JSON.stringify(this._.content);
    }
  };

  CloudContent.prototype.addMetadata = function(metadata) {
    var key, results;
    results = [];
    for (key in metadata) {
      results.push(this._[key] = metadata[key]);
    }
    return results;
  };

  CloudContent.prototype.get = function(prop) {
    return this._[prop];
  };

  CloudContent.prototype.copyMetadataTo = function(to) {
    var key, metadata, ref, value;
    metadata = {};
    ref = this._;
    for (key in ref) {
      if (!hasProp.call(ref, key)) continue;
      value = ref[key];
      if (key !== 'content') {
        metadata[key] = value;
      }
    }
    return to.addMetadata(metadata);
  };

  return CloudContent;

})();

ProviderInterface = (function() {
  function ProviderInterface(options) {
    this.name = options.name, this.displayName = options.displayName, this.capabilities = options.capabilities;
  }

  ProviderInterface.Available = function() {
    return true;
  };

  ProviderInterface.prototype.can = function(capability) {
    return this.capabilities[capability];
  };

  ProviderInterface.prototype.authorized = function(callback) {
    if (callback) {
      return callback(true);
    } else {
      return true;
    }
  };

  ProviderInterface.prototype.renderAuthorizationDialog = function() {
    return AuthorizationNotImplementedDialog({
      provider: this
    });
  };

  ProviderInterface.prototype.renderUser = function() {
    return null;
  };

  ProviderInterface.prototype.filterTabComponent = function(capability, defaultComponent) {
    return defaultComponent;
  };

  ProviderInterface.prototype.dialog = function(callback) {
    return this._notImplemented('dialog');
  };

  ProviderInterface.prototype.save = function(content, metadata, callback) {
    return this._notImplemented('save');
  };

  ProviderInterface.prototype.load = function(callback) {
    return this._notImplemented('load');
  };

  ProviderInterface.prototype.list = function(metadata, callback) {
    return this._notImplemented('list');
  };

  ProviderInterface.prototype.remove = function(metadata, callback) {
    return this._notImplemented('remove');
  };

  ProviderInterface.prototype.rename = function(metadata, newName, callback) {
    return this._notImplemented('rename');
  };

  ProviderInterface.prototype.close = function(metadata, callback) {
    return this._notImplemented('close');
  };

  ProviderInterface.prototype.canOpenSaved = function() {
    return true;
  };

  ProviderInterface.prototype.openSaved = function(openSavedParams, callback) {
    return this._notImplemented('openSaved');
  };

  ProviderInterface.prototype.getOpenSavedParams = function(metadata) {
    return this._notImplemented('getOpenSavedParams');
  };

  ProviderInterface.prototype._notImplemented = function(methodName) {
    return alert(methodName + " not implemented for " + this.name + " provider");
  };

  return ProviderInterface;

})();

module.exports = {
  CloudFile: CloudFile,
  CloudMetadata: CloudMetadata,
  CloudContent: CloudContent,
  cloudContentFactory: new CloudContentFactory(),
  ProviderInterface: ProviderInterface
};



},{"../utils/is-string":40}],37:[function(require,module,exports){
var CloudMetadata, ProviderInterface, ReadOnlyProvider, cloudContentFactory, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

ReadOnlyProvider = (function(superClass) {
  extend(ReadOnlyProvider, superClass);

  function ReadOnlyProvider(options, client) {
    this.options = options != null ? options : {};
    this.client = client;
    ReadOnlyProvider.__super__.constructor.call(this, {
      name: ReadOnlyProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.READ_ONLY')),
      capabilities: {
        save: false,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    });
    this.tree = null;
  }

  ReadOnlyProvider.Name = 'readOnly';

  ReadOnlyProvider.prototype.load = function(metadata, callback) {
    return this._loadTree((function(_this) {
      return function(err, tree) {
        var subTree;
        if (err) {
          return callback(err);
        }
        subTree = _this._findSubTree(metadata);
        if (subTree) {
          if (subTree[metadata.name]) {
            if (subTree[metadata.name].metadata.type === CloudMetadata.File) {
              return callback(null, subTree[metadata.name].content);
            } else {
              return callback(metadata.name + " is a folder");
            }
          } else {
            return callback(metadata.name + " not found in folder");
          }
        } else {
          return callback(metadata.name + " folder not found");
        }
      };
    })(this));
  };

  ReadOnlyProvider.prototype.list = function(metadata, callback) {
    return this._loadTree((function(_this) {
      return function(err, tree) {
        var file, filename, list, subTree;
        if (err) {
          return callback(err);
        }
        list = [];
        subTree = _this._findSubTree(metadata);
        if (subTree) {
          for (filename in subTree) {
            if (!hasProp.call(subTree, filename)) continue;
            file = subTree[filename];
            list.push(file.metadata);
          }
        }
        return callback(null, list);
      };
    })(this));
  };

  ReadOnlyProvider.prototype.canOpenSaved = function() {
    return false;
  };

  ReadOnlyProvider.prototype._findSubTree = function(metadata) {
    if ((metadata != null ? metadata.type : void 0) === CloudMetadata.Folder) {
      return metadata.providerData.children;
    } else if (metadata != null ? metadata.parent : void 0) {
      return metadata.parent.providerData.children;
    } else {
      return this.tree;
    }
  };

  ReadOnlyProvider.prototype._loadTree = function(callback) {
    if (this.tree !== null) {
      return callback(null, this.tree);
    } else if (this.options.json) {
      this.tree = this._convertJSONToMetadataTree(this.options.json);
      return callback(null, this.tree);
    } else if (this.options.jsonCallback) {
      return this.options.jsonCallback((function(_this) {
        return function(err, json) {
          if (err) {
            return callback(err);
          } else {
            _this.tree = _this._convertJSONToMetadataTree(_this.options.json);
            return callback(null, _this.tree);
          }
        };
      })(this));
    } else if (this.options.src) {
      return $.ajax({
        dataType: 'json',
        url: this.options.src,
        success: (function(_this) {
          return function(data) {
            _this.tree = _this._convertJSONToMetadataTree(data);
            return callback(null, _this.tree);
          };
        })(this),
        error: function() {
          return callback("Unable to load json for " + this.displayName + " provider");
        }
      });
    } else {
      if (typeof console.error === "function") {
        console.error("No json or src option found for " + this.displayName + " provider");
      }
      return callback(null, {});
    }
  };

  ReadOnlyProvider.prototype._convertJSONToMetadataTree = function(json, parent) {
    var content, filename, metadata, tree, type;
    if (parent == null) {
      parent = null;
    }
    tree = {};
    for (filename in json) {
      if (!hasProp.call(json, filename)) continue;
      type = isString(json[filename]) ? CloudMetadata.File : CloudMetadata.Folder;
      metadata = new CloudMetadata({
        name: filename,
        type: type,
        parent: parent,
        provider: this,
        providerData: {
          children: null
        }
      });
      if (type === CloudMetadata.Folder) {
        metadata.providerData.children = this._convertJSONToMetadataTree(json[filename], metadata);
      }
      content = cloudContentFactory.createEnvelopedCloudContent(json[filename]);
      tree[filename] = {
        content: content,
        metadata: metadata
      };
    }
    return tree;
  };

  return ReadOnlyProvider;

})(ProviderInterface);

module.exports = ReadOnlyProvider;



},{"../utils/is-string":40,"../utils/translate":42,"./provider-interface":36}],38:[function(require,module,exports){
var CloudFileManagerUI, CloudFileManagerUIEvent, CloudFileManagerUIMenu, isString, tr;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUIEvent = (function() {
  function CloudFileManagerUIEvent(type, data) {
    this.type = type;
    this.data = data != null ? data : {};
  }

  return CloudFileManagerUIEvent;

})();

CloudFileManagerUIMenu = (function() {
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'revertSubMenu', 'separator', 'save', 'createCopy', 'shareSubMenu', 'downloadDialog', 'renameDialog'];

  function CloudFileManagerUIMenu(options, client) {
    this.items = this.parseMenuItems(options.menu, client);
    console.dir(this.items);
  }

  CloudFileManagerUIMenu.prototype.parseMenuItems = function(menuItems, client) {
    var getItems, i, item, items, j, len, menuItem, names, ref, setAction, setEnabled, subMenus;
    setAction = function(action) {
      var ref;
      return ((ref = client[action]) != null ? ref.bind(client) : void 0) || (function() {
        return alert("No " + action + " action is available in the client");
      });
    };
    setEnabled = function(action) {
      switch (action) {
        case 'revertSubMenu':
          return function() {
            var ref;
            return ((client.state.openedContent != null) && (client.state.metadata != null)) || (((ref = client.state.currentContent) != null ? ref.get("shareEditKey") : void 0) != null);
          };
        case 'revertToLastOpenedDialog':
          return function() {
            return (client.state.openedContent != null) && (client.state.metadata != null);
          };
        case 'shareGetLink':
        case 'shareSubMenu':
          return function() {
            return client.state.shareProvider != null;
          };
        case 'revertToSharedDialog':
          return function() {
            var ref;
            return (ref = client.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0;
          };
        case 'shareUpdate':
          return function() {
            var ref;
            return ((ref = client.state.currentContent) != null ? ref.get("shareEditKey") : void 0) != null;
          };
        default:
          return true;
      }
    };
    getItems = (function(_this) {
      return function(subMenuItems) {
        if (subMenuItems) {
          return _this.parseMenuItems(subMenuItems, client);
        } else {
          return null;
        }
      };
    })(this);
    names = {
      newFileDialog: tr("~MENU.NEW"),
      openFileDialog: tr("~MENU.OPEN"),
      revertToLastOpenedDialog: tr("~MENU.REVERT_TO_LAST_OPENED"),
      revertToSharedDialog: tr("~MENU.REVERT_TO_SHARED_VIEW"),
      save: tr("~MENU.SAVE"),
      saveFileAsDialog: tr("~MENU.SAVE_AS"),
      createCopy: tr("~MENU.CREATE_COPY"),
      shareGetLink: tr("~MENU.SHARE_GET_LINK"),
      shareUpdate: tr("~MENU.SHARE_UPDATE"),
      downloadDialog: tr("~MENU.DOWNLOAD"),
      renameDialog: tr("~MENU.RENAME"),
      revertSubMenu: tr("~MENU.REVERT_TO"),
      shareSubMenu: tr("~MENU.SHARE")
    };
    subMenus = {
      revertSubMenu: ['revertToLastOpenedDialog', 'revertToSharedDialog'],
      shareSubMenu: ['shareGetLink', 'shareUpdate']
    };
    items = [];
    for (i = j = 0, len = menuItems.length; j < len; i = ++j) {
      item = menuItems[i];
      if (item === 'separator') {
        menuItem = {
          key: "seperator" + i,
          separator: true
        };
      } else if (isString(item)) {
        menuItem = {
          key: item,
          name: ((ref = options.menuNames) != null ? ref[item] : void 0) || names[item] || ("Unknown item: " + item),
          enabled: setEnabled(item),
          items: getItems(subMenus[item]),
          action: setAction(item)
        };
      } else {
        menuItem = item;
        if (isString(item.action)) {
          menuItem.key = item.action;
          menuItem.enabled = setEnabled(item.action);
          menuItem.action = setAction(item.action);
        } else {
          menuItem.enabled || (menuItem.enabled = true);
        }
        menuItem.items = item.items || getItems(item.name);
      }
      items.push(menuItem);
    }
    return items;
  };

  return CloudFileManagerUIMenu;

})();

CloudFileManagerUI = (function() {
  function CloudFileManagerUI(client1) {
    this.client = client1;
    this.menu = null;
  }

  CloudFileManagerUI.prototype.init = function(options) {
    options = options || {};
    if (options.menu !== null) {
      if (typeof options.menu === 'undefined') {
        options.menu = CloudFileManagerUIMenu.DefaultMenu;
      }
      return this.menu = new CloudFileManagerUIMenu(options, this.client);
    }
  };

  CloudFileManagerUI.prototype.listen = function(listenerCallback) {
    this.listenerCallback = listenerCallback;
  };

  CloudFileManagerUI.prototype.appendMenuItem = function(item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('appendMenuItem', item));
  };

  CloudFileManagerUI.prototype.prependMenuItem = function(item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('prependMenuItem', item));
  };

  CloudFileManagerUI.prototype.replaceMenuItem = function(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('replaceMenuItem', {
      key: key,
      item: item
    }));
  };

  CloudFileManagerUI.prototype.insertMenuItemBefore = function(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('insertMenuItemBefore', {
      key: key,
      item: item
    }));
  };

  CloudFileManagerUI.prototype.insertMenuItemAfter = function(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('insertMenuItemAfter', {
      key: key,
      item: item
    }));
  };

  CloudFileManagerUI.prototype.setMenuBarInfo = function(info) {
    return this.listenerCallback(new CloudFileManagerUIEvent('setMenuBarInfo', info));
  };

  CloudFileManagerUI.prototype.saveFileDialog = function(callback) {
    return this._showProviderDialog('saveFile', tr('~DIALOG.SAVE'), callback);
  };

  CloudFileManagerUI.prototype.saveFileAsDialog = function(callback) {
    return this._showProviderDialog('saveFileAs', tr('~DIALOG.SAVE_AS'), callback);
  };

  CloudFileManagerUI.prototype.openFileDialog = function(callback) {
    return this._showProviderDialog('openFile', tr('~DIALOG.OPEN'), callback);
  };

  CloudFileManagerUI.prototype.downloadDialog = function(filename, content, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showDownloadDialog', {
      filename: filename,
      content: content,
      callback: callback
    }));
  };

  CloudFileManagerUI.prototype.renameDialog = function(filename, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showRenameDialog', {
      filename: filename,
      callback: callback
    }));
  };

  CloudFileManagerUI.prototype.shareUrlDialog = function(url) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showShareUrlDialog', {
      url: url
    }));
  };

  CloudFileManagerUI.prototype.blockingModal = function(modalProps) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showBlockingModal', modalProps));
  };

  CloudFileManagerUI.prototype._showProviderDialog = function(action, title, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showProviderDialog', {
      action: action,
      title: title,
      callback: callback
    }));
  };

  return CloudFileManagerUI;

})();

module.exports = {
  CloudFileManagerUIEvent: CloudFileManagerUIEvent,
  CloudFileManagerUI: CloudFileManagerUI,
  CloudFileManagerUIMenu: CloudFileManagerUIMenu
};



},{"./utils/is-string":40,"./utils/translate":42}],39:[function(require,module,exports){
module.exports = function(param) {
  var ret;
  ret = null;
  location.hash.substr(1).split("&").some(function(pair) {
    return pair.split("=")[0] === param && (ret = pair.split("=")[1]);
  });
  return ret;
};



},{}],40:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],41:[function(require,module,exports){
module.exports = {
  "~MENUBAR.UNTITLED_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.SAVE": "Save",
  "~MENU.SAVE_AS": "Save As ...",
  "~MENU.CREATE_COPY": "Create A Copy ...",
  "~MENU.SHARE": "Share...",
  "~MENU.SHARE_GET_LINK": "Get link to shared view",
  "~MENU.SHARE_UPDATE": "Update shared view",
  "~MENU.DOWNLOAD": "Download",
  "~MENU.RENAME": "Rename",
  "~MENU.REVERT_TO": "Revert to...",
  "~MENU.REVERT_TO_LAST_OPENED": "Recently opened state",
  "~MENU.REVERT_TO_SHARED_VIEW": "Shared view",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.CREATE_COPY": "Create A Copy ...",
  "~DIALOG.OPEN": "Open",
  "~DIALOG.DOWNLOAD": "Download",
  "~DIALOG.RENAME": "Rename",
  "~DIALOG.SHARED": "Shared Document",
  "~PROVIDER.LOCAL_STORAGE": "Local Storage",
  "~PROVIDER.READ_ONLY": "Read Only",
  "~PROVIDER.GOOGLE_DRIVE": "Google Drive",
  "~PROVIDER.DOCUMENT_STORE": "Document Store",
  "~PROVIDER.LOCAL_FILE": "Local File",
  "~FILE_DIALOG.FILENAME": "Filename",
  "~FILE_DIALOG.OPEN": "Open",
  "~FILE_DIALOG.SAVE": "Save",
  "~FILE_DIALOG.CANCEL": "Cancel",
  "~FILE_DIALOG.REMOVE": "Delete",
  "~FILE_DIALOG.REMOVE_CONFIRM": "Are you sure you want to delete %{filename}?",
  "~FILE_DIALOG.LOADING": "Loading...",
  "~DOWNLOAD_DIALOG.DOWNLOAD": "Download",
  "~DOWNLOAD_DIALOG.CANCEL": "Cancel",
  "~RENAME_DIALOG.RENAME": "Rename",
  "~RENAME_DIALOG.CANCEL": "Cancel",
  "~SHARE_DIALOG.COPY": "Copy",
  "~SHARE_DIALOG.VIEW": "View",
  "~SHARE_DIALOG.CLOSE": "Close",
  "~SHARE_DIALOG.COPY_SUCCESS": "The share url has been copied to the clipboard.",
  "~SHARE_DIALOG.COPY_ERROR": "Sorry, the share url was not able to be copied to the clipboard.",
  "~CONFIRM.OPEN_FILE": "You have unsaved changes.  Are you sure you want open a new file?",
  "~CONFIRM.NEW_FILE": "You have unsaved changes.  Are you sure you want a new file?",
  "~CONFIRM.REVERT_TO_LAST_OPENED": "Are you sure you want revert the file to its most recently opened state?",
  "~CONFIRM.REVERT_TO_SHARED_VIEW": "Are you sure you want revert the file to currently shared view?",
  "~LOCAL_FILE_DIALOG.DROP_FILE_HERE": "Drop file here or click here to select file.",
  "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_SELECTED": "Sorry, you can choose only one file to open.",
  "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED": "Sorry, you can't drop more than one file."
};



},{}],42:[function(require,module,exports){
var defaultLang, translate, translations, varRegExp;

translations = {};

translations['en'] = require('./lang/en-us');

defaultLang = 'en';

varRegExp = /%\{\s*([^}\s]*)\s*\}/g;

translate = function(key, vars, lang) {
  var ref, translation;
  if (vars == null) {
    vars = {};
  }
  if (lang == null) {
    lang = defaultLang;
  }
  translation = ((ref = translations[lang]) != null ? ref[key] : void 0) || key;
  return translation.replace(varRegExp, function(match, key) {
    if (vars.hasOwnProperty(key)) {
      return vars[key];
    } else {
      return "'** UKNOWN KEY: " + key + " **";
    }
  });
};

module.exports = translate;



},{"./lang/en-us":41}],43:[function(require,module,exports){
var App, BlockingModal, DownloadDialog, InnerApp, MenuBar, ProviderTabbedDialog, RenameDialog, ShareUrlDialog, div, iframe, isString, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

DownloadDialog = React.createFactory(require('./download-dialog-view'));

RenameDialog = React.createFactory(require('./rename-dialog-view'));

ShareUrlDialog = React.createFactory(require('./share-url-dialog-view'));

BlockingModal = React.createFactory(require('./blocking-modal-view'));

tr = require('../utils/translate');

isString = require('../utils/is-string');

ref = React.DOM, div = ref.div, iframe = ref.iframe;

InnerApp = React.createFactory(React.createClass({
  displayName: 'CloudFileManagerInnerApp',
  shouldComponentUpdate: function(nextProps) {
    return nextProps.app !== this.props.app;
  },
  render: function() {
    return div({
      className: 'innerApp'
    }, iframe({
      src: this.props.app
    }));
  }
}));

App = React.createClass({
  displayName: 'CloudFileManager',
  getFilename: function(metadata) {
    var ref1;
    if ((metadata != null ? metadata.hasOwnProperty("name") : void 0) && ((ref1 = metadata.name) != null ? ref1.length : void 0) > 0) {
      return metadata.name;
    } else {
      return null;
    }
  },
  getInitialState: function() {
    var ref1, ref2, ref3;
    return {
      filename: this.getFilename(this.props.client.state.metadata),
      provider: (ref1 = this.props.client.state.metadata) != null ? ref1.provider : void 0,
      menuItems: ((ref2 = this.props.client._ui.menu) != null ? ref2.items : void 0) || [],
      menuOptions: ((ref3 = this.props.ui) != null ? ref3.menuBar : void 0) || {},
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null,
      shareUrlDialog: null,
      dirty: false
    };
  },
  componentWillMount: function() {
    this.props.client.listen((function(_this) {
      return function(event) {
        var fileStatus, ref1, ref2;
        fileStatus = event.state.saving ? {
          message: "Saving...",
          type: 'info'
        } : event.state.saved ? {
          message: "All changes saved to " + event.state.metadata.provider.displayName,
          type: 'info'
        } : event.state.dirty ? {
          message: 'Unsaved',
          type: 'alert'
        } : null;
        _this.setState({
          filename: _this.getFilename(event.state.metadata),
          provider: (ref1 = event.state.metadata) != null ? ref1.provider : void 0,
          fileStatus: fileStatus
        });
        switch (event.type) {
          case 'connected':
            return _this.setState({
              menuItems: ((ref2 = _this.props.client._ui.menu) != null ? ref2.items : void 0) || []
            });
        }
      };
    })(this));
    return this.props.client._ui.listen((function(_this) {
      return function(event) {
        var index;
        switch (event.type) {
          case 'showProviderDialog':
            return _this.setState({
              providerDialog: event.data
            });
          case 'showDownloadDialog':
            return _this.setState({
              downloadDialog: event.data
            });
          case 'showRenameDialog':
            return _this.setState({
              renameDialog: event.data
            });
          case 'showShareUrlDialog':
            return _this.setState({
              shareUrlDialog: event.data
            });
          case 'showBlockingModal':
            return _this.setState({
              blockingModalProps: event.data
            });
          case 'appendMenuItem':
            _this.state.menuItems.push(event.data);
            return _this.setState({
              menuItems: _this.state.menuItems
            });
          case 'prependMenuItem':
            _this.state.menuItems.unshift(event.data);
            return _this.setState({
              menuItems: _this.state.menuItems
            });
          case 'replaceMenuItem':
            index = _this._getMenuItemIndex(event.data.key);
            if (index !== -1) {
              _this.state.menuItems[index] = event.data.item;
              return _this.setState({
                menuItems: _this.state.menuItems
              });
            }
            break;
          case 'insertMenuItemBefore':
            index = _this._getMenuItemIndex(event.data.key);
            if (index !== -1) {
              if (index === 0) {
                _this.state.menuItems.unshift(event.data.item);
              } else {
                _this.state.menuItems.splice(index, 0, event.data.item);
              }
              return _this.setState({
                menuItems: _this.state.menuItems
              });
            }
            break;
          case 'insertMenuItemAfter':
            index = _this._getMenuItemIndex(event.data.key);
            if (index !== -1) {
              if (index === _this.state.menuItems.length - 1) {
                _this.state.menuItems.push(event.data.item);
              } else {
                _this.state.menuItems.splice(index + 1, 0, event.data.item);
              }
              return _this.setState({
                menuItems: _this.state.menuItems
              });
            }
            break;
          case 'setMenuBarInfo':
            _this.state.menuOptions.info = event.data;
            return _this.setState({
              menuOptions: _this.state.menuOptions
            });
        }
      };
    })(this));
  },
  _getMenuItemIndex: function(key) {
    var i, index, item, len, ref1;
    if (isString(key)) {
      ref1 = this.state.menuItems;
      for (index = i = 0, len = ref1.length; i < len; index = ++i) {
        item = ref1[index];
        if (item.key === key) {
          return index;
        }
      }
      return -1;
    } else {
      index = parseInt(key, 10);
      if (isNaN(index) || index < 0 || index > this.state.menuItems.length - 1) {
        return -1;
      } else {
        return index;
      }
    }
  },
  closeDialogs: function() {
    return this.setState({
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null,
      shareUrlDialog: null
    });
  },
  renderDialogs: function() {
    if (this.state.blockingModalProps) {
      return BlockingModal(this.state.blockingModalProps);
    } else if (this.state.providerDialog) {
      return ProviderTabbedDialog({
        client: this.props.client,
        dialog: this.state.providerDialog,
        close: this.closeDialogs
      });
    } else if (this.state.downloadDialog) {
      return DownloadDialog({
        filename: this.state.downloadDialog.filename,
        mimeType: this.state.downloadDialog.mimeType,
        content: this.state.downloadDialog.content,
        close: this.closeDialogs
      });
    } else if (this.state.renameDialog) {
      return RenameDialog({
        filename: this.state.renameDialog.filename,
        callback: this.state.renameDialog.callback,
        close: this.closeDialogs
      });
    } else if (this.state.shareUrlDialog) {
      return ShareUrlDialog({
        url: this.state.shareUrlDialog.url,
        close: this.closeDialogs
      });
    }
  },
  render: function() {
    if (this.props.usingIframe) {
      return div({
        className: 'app'
      }, MenuBar({
        client: this.props.client,
        filename: this.state.filename,
        provider: this.state.provider,
        fileStatus: this.state.fileStatus,
        items: this.state.menuItems,
        options: this.state.menuOptions
      }), InnerApp({
        app: this.props.app
      }), this.renderDialogs());
    } else if (this.state.providerDialog || this.state.downloadDialog) {
      return div({
        className: 'app'
      }, this.renderDialogs());
    } else {
      return null;
    }
  }
});

module.exports = App;



},{"../utils/is-string":40,"../utils/translate":42,"./blocking-modal-view":45,"./download-dialog-view":46,"./menu-bar-view":49,"./provider-tabbed-dialog-view":53,"./rename-dialog-view":54,"./share-url-dialog-view":56}],44:[function(require,module,exports){
var AuthorizeMixin;

AuthorizeMixin = {
  getInitialState: function() {
    return {
      authorized: false
    };
  },
  componentWillMount: function() {
    return this.props.provider.authorized((function(_this) {
      return function(authorized) {
        return _this.setState({
          authorized: authorized
        });
      };
    })(this));
  },
  render: function() {
    if (this.state.authorized) {
      return this.renderWhenAuthorized();
    } else {
      return this.props.provider.renderAuthorizationDialog();
    }
  }
};

module.exports = AuthorizeMixin;



},{}],45:[function(require,module,exports){
var Modal, div, i, ref;

Modal = React.createFactory(require('./modal-view'));

ref = React.DOM, div = ref.div, i = ref.i;

module.exports = React.createClass({
  displayName: 'BlockingModal',
  close: function() {
    var base;
    return typeof (base = this.props).close === "function" ? base.close() : void 0;
  },
  render: function() {
    return Modal({
      close: this.props.close
    }, div({
      className: 'modal-dialog'
    }, div({
      className: 'modal-dialog-wrapper'
    }, div({
      className: 'modal-dialog-title'
    }, this.props.title || 'Untitled Dialog'), div({
      className: 'modal-dialog-workspace'
    }, div({
      className: 'modal-dialog-blocking-message'
    }, this.props.message)))));
  }
});



},{"./modal-view":52}],46:[function(require,module,exports){
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'DownloadDialogView',
  getInitialState: function() {
    var filename, state;
    filename = (this.props.filename || (tr("~MENUBAR.UNTITLED_DOCUMENT"))) + ".json";
    return state = {
      filename: filename,
      trimmedFilename: this.trim(filename)
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    var filename;
    filename = this.filename.value;
    return this.setState({
      filename: filename,
      trimmedFilename: this.trim(filename)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  download: function(e) {
    if (this.state.trimmedFilename.length > 0) {
      e.target.setAttribute('href', "data:application/json," + (encodeURIComponent(this.props.content.getContentAsJSON())));
      return this.props.close();
    } else {
      e.preventDefault();
      return this.filename.focus();
    }
  },
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.DOWNLOAD'),
      close: this.props.close
    }, div({
      className: 'download-dialog'
    }, input({
      ref: 'filename',
      placeholder: 'Filename',
      value: this.state.filename,
      onChange: this.updateFilename
    }), div({
      className: 'buttons'
    }, a({
      href: '#',
      className: (this.state.trimmedFilename.length === 0 ? 'disabled' : ''),
      download: this.state.trimmedFilename,
      onClick: this.download
    }, tr('~DOWNLOAD_DIALOG.DOWNLOAD')), button({
      onClick: this.props.close
    }, tr('~DOWNLOAD_DIALOG.CANCEL')))));
  }
});



},{"../utils/translate":42,"./modal-dialog-view":50}],47:[function(require,module,exports){
var DropDown, DropdownItem, div, g, i, li, rect, ref, span, svg, ul;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, ul = ref.ul, li = ref.li, svg = ref.svg, g = ref.g, rect = ref.rect;

DropdownItem = React.createFactory(React.createClass({
  displayName: 'DropdownItem',
  clicked: function() {
    return this.props.select(this.props.item);
  },
  mouseEnter: function() {
    var base, menu, menuItem;
    if (this.props.item.items) {
      menuItem = $(React.findDOMNode(this.refs.item));
      menu = menuItem.parent().parent();
      return this.props.setSubMenu({
        style: {
          position: 'absolute',
          left: menu.width(),
          top: menuItem.position().top - parseInt(menuItem.css('padding-top'))
        },
        items: this.props.item.items
      });
    } else {
      return typeof (base = this.props).setSubMenu === "function" ? base.setSubMenu(null) : void 0;
    }
  },
  render: function() {
    var classes, enabled, name;
    enabled = this.props.item.hasOwnProperty('enabled') ? typeof this.props.item.enabled === 'function' ? this.props.item.enabled() : this.props.item.enabled : true;
    classes = ['menuItem'];
    if (this.props.item.separator) {
      classes.push('separator');
      return li({
        className: classes.join(' ')
      }, '');
    } else {
      if (!enabled || !(this.props.item.action || this.props.item.items)) {
        classes.push('disabled');
      }
      name = this.props.item.name || this.props.item;
      return li({
        ref: 'item',
        className: classes.join(' '),
        onClick: this.clicked,
        onMouseEnter: this.mouseEnter
      }, name, this.props.item.items ? i({
        className: 'icon-inspectorArrow-collapse'
      }) : void 0);
    }
  }
}));

DropDown = React.createClass({
  displayName: 'Dropdown',
  getInitialState: function() {
    return {
      showingMenu: false,
      timeout: null,
      subMenu: null
    };
  },
  blur: function() {
    var timeout;
    this.unblur();
    timeout = setTimeout(((function(_this) {
      return function() {
        return _this.setState({
          showingMenu: false,
          subMenu: false
        });
      };
    })(this)), 500);
    return this.setState({
      timeout: timeout
    });
  },
  unblur: function() {
    if (this.state.timeout) {
      clearTimeout(this.state.timeout);
    }
    return this.setState({
      timeout: null
    });
  },
  setSubMenu: function(subMenu) {
    return this.setState({
      subMenu: subMenu
    });
  },
  select: function(item) {
    var nextState;
    if (item != null ? item.items : void 0) {
      return;
    }
    nextState = !this.state.showingMenu;
    this.setState({
      showingMenu: nextState
    });
    if (!item) {
      return;
    }
    return typeof item.action === "function" ? item.action() : void 0;
  },
  render: function() {
    var index, item, menuClass, ref1, select;
    menuClass = this.state.showingMenu ? 'menu-showing' : 'menu-hidden';
    select = (function(_this) {
      return function(item) {
        return function() {
          return _this.select(item);
        };
      };
    })(this);
    return div({
      className: 'menu'
    }, div({
      className: 'menu-anchor',
      onClick: (function(_this) {
        return function() {
          return _this.select(null);
        };
      })(this)
    }, svg({
      version: '1.1',
      width: 16,
      height: 16,
      viewBox: '0 0 16 16',
      enableBackground: 'new 0 0 16 16'
    }, g({}, rect({
      y: 2,
      width: 16,
      height: 2
    }), rect({
      y: 7,
      width: 16,
      height: 2
    }), rect({
      y: 12,
      width: 16,
      height: 2
    })))), ((ref1 = this.props.items) != null ? ref1.length : void 0) > 0 ? div({
      className: menuClass,
      onMouseLeave: this.blur,
      onMouseEnter: this.unblur
    }, ul({}, (function() {
      var j, len, ref2, results;
      ref2 = this.props.items;
      results = [];
      for (index = j = 0, len = ref2.length; j < len; index = ++j) {
        item = ref2[index];
        results.push(DropdownItem({
          key: index,
          item: item,
          select: this.select,
          setSubMenu: this.setSubMenu
        }));
      }
      return results;
    }).call(this)), this.state.subMenu ? div({
      className: menuClass,
      style: this.state.subMenu.style
    }, ul({}, (function() {
      var j, len, ref2, results;
      ref2 = this.state.subMenu.items;
      results = [];
      for (index = j = 0, len = ref2.length; j < len; index = ++j) {
        item = ref2[index];
        results.push(DropdownItem({
          key: index,
          item: item,
          select: this.select
        }));
      }
      return results;
    }).call(this))) : void 0) : void 0);
  }
});

module.exports = DropDown;



},{}],48:[function(require,module,exports){
var AuthorizeMixin, CloudMetadata, FileDialogTab, FileList, FileListFile, button, div, i, img, input, ref, span, tr;

AuthorizeMixin = require('./authorize-mixin');

CloudMetadata = (require('../providers/provider-interface')).CloudMetadata;

tr = require('../utils/translate');

ref = React.DOM, div = ref.div, img = ref.img, i = ref.i, span = ref.span, input = ref.input, button = ref.button;

FileListFile = React.createFactory(React.createClass({
  displayName: 'FileListFile',
  componentWillMount: function() {
    return this.lastClick = 0;
  },
  fileSelected: function(e) {
    var now;
    e.preventDefault();
    e.stopPropagation();
    now = (new Date()).getTime();
    this.props.fileSelected(this.props.metadata);
    if (now - this.lastClick <= 250) {
      this.props.fileConfirmed();
    }
    return this.lastClick = now;
  },
  render: function() {
    return div({
      key: this.props.key,
      className: (this.props.selected ? 'selected' : ''),
      onClick: this.fileSelected
    }, React.DOM.i({
      className: this.props.metadata.type === CloudMetadata.Folder ? 'icon-inspectorArrow-collapse' : 'icon-noteTool'
    }), this.props.metadata.name);
  }
}));

FileList = React.createFactory(React.createClass({
  displayName: 'FileList',
  getInitialState: function() {
    return {
      loading: true
    };
  },
  componentDidMount: function() {
    return this.load(this.props.folder);
  },
  componentWillReceiveProps: function(nextProps) {
    if (nextProps.folder !== this.props.folder) {
      return this.load(nextProps.folder);
    }
  },
  load: function(folder) {
    return this.props.provider.list(folder, (function(_this) {
      return function(err, list) {
        if (err) {
          return alert(err);
        }
        _this.setState({
          loading: false
        });
        return _this.props.listLoaded(list);
      };
    })(this));
  },
  parentSelected: function(e) {
    var ref1;
    return this.props.fileSelected((ref1 = this.props.folder) != null ? ref1.parent : void 0);
  },
  render: function() {
    var j, len, list, metadata, ref1;
    list = [];
    if (this.props.folder !== null) {
      list.push(div({
        key: 'parent',
        onClick: this.parentSelected
      }, React.DOM.i({
        className: 'icon-paletteArrow-collapse'
      }), 'Parent Folder'));
    }
    ref1 = this.props.list;
    for (i = j = 0, len = ref1.length; j < len; i = ++j) {
      metadata = ref1[i];
      list.push(FileListFile({
        key: i,
        metadata: metadata,
        selected: this.props.selectedFile === metadata,
        fileSelected: this.props.fileSelected,
        fileConfirmed: this.props.fileConfirmed
      }));
    }
    return div({
      className: 'filelist'
    }, this.state.loading ? tr("~FILE_DIALOG.LOADING") : list);
  }
}));

FileDialogTab = React.createClass({
  displayName: 'FileDialogTab',
  mixins: [AuthorizeMixin],
  getInitialState: function() {
    var ref1;
    return this.getStateForFolder(((ref1 = this.props.client.state.metadata) != null ? ref1.parent : void 0) || null);
  },
  componentWillMount: function() {
    return this.isOpen = this.props.dialog.action === 'openFile';
  },
  filenameChanged: function(e) {
    var filename, metadata;
    filename = e.target.value;
    metadata = this.findMetadata(filename, this.state.list);
    return this.setState({
      filename: filename,
      metadata: metadata
    });
  },
  listLoaded: function(list) {
    return this.setState({
      list: list,
      metadata: this.findMetadata($.trim(this.state.filename), list)
    });
  },
  getStateForFolder: function(folder) {
    var ref1;
    return {
      folder: folder,
      metadata: this.props.client.state.metadata,
      filename: ((ref1 = this.props.client.state.metadata) != null ? ref1.name : void 0) || '',
      list: []
    };
  },
  fileSelected: function(metadata) {
    if ((metadata != null ? metadata.type : void 0) === CloudMetadata.Folder) {
      return this.setState(this.getStateForFolder(metadata));
    } else if ((metadata != null ? metadata.type : void 0) === CloudMetadata.File) {
      return this.setState({
        filename: metadata.name,
        metadata: metadata
      });
    } else {
      return this.setState(this.getStateForFolder(null));
    }
  },
  confirm: function() {
    var base, filename;
    if (!this.state.metadata) {
      filename = $.trim(this.state.filename);
      this.state.metadata = this.findMetadata(filename, this.state.list);
      if (!this.state.metadata) {
        if (this.isOpen) {
          alert(this.state.filename + " not found");
        } else {
          this.state.metadata = new CloudMetadata({
            name: filename,
            type: CloudMetadata.File,
            parent: this.state.folder || null,
            provider: this.props.provider
          });
        }
      }
    }
    if (this.state.metadata) {
      this.state.metadata.provider = this.props.provider;
      if (typeof (base = this.props.dialog).callback === "function") {
        base.callback(this.state.metadata);
      }
      return this.props.close();
    }
  },
  remove: function() {
    if (this.state.metadata && this.state.metadata.type !== CloudMetadata.Folder && confirm(tr("~FILE_DIALOG.REMOVE_CONFIRM", {
      filename: this.state.metadata.name
    }))) {
      return this.props.provider.remove(this.state.metadata, (function(_this) {
        return function(err) {
          var index, list;
          if (!err) {
            list = _this.state.list.slice(0);
            index = list.indexOf(_this.state.metadata);
            list.splice(index, 1);
            return _this.setState({
              list: list,
              metadata: null,
              filename: ''
            });
          }
        };
      })(this));
    }
  },
  cancel: function() {
    return this.props.close();
  },
  findMetadata: function(filename, list) {
    var j, len, metadata;
    for (j = 0, len = list.length; j < len; j++) {
      metadata = list[j];
      if (metadata.name === filename) {
        return metadata;
      }
    }
    return null;
  },
  watchForEnter: function(e) {
    if (e.keyCode === 13 && !this.confirmDisabled()) {
      return this.confirm();
    }
  },
  confirmDisabled: function() {
    return (this.state.filename.length === 0) || (this.isOpen && !this.state.metadata);
  },
  renderWhenAuthorized: function() {
    var confirmDisabled, removeDisabled;
    confirmDisabled = this.confirmDisabled();
    removeDisabled = (this.state.metadata === null) || (this.state.metadata.type === CloudMetadata.Folder);
    return div({
      className: 'dialogTab'
    }, input({
      type: 'text',
      value: this.state.filename,
      placeholder: tr("~FILE_DIALOG.FILENAME"),
      onChange: this.filenameChanged,
      onKeyDown: this.watchForEnter
    }), FileList({
      provider: this.props.provider,
      folder: this.state.folder,
      selectedFile: this.state.metadata,
      fileSelected: this.fileSelected,
      fileConfirmed: this.confirm,
      list: this.state.list,
      listLoaded: this.listLoaded
    }), div({
      className: 'buttons'
    }, button({
      onClick: this.confirm,
      disabled: confirmDisabled,
      className: confirmDisabled ? 'disabled' : ''
    }, this.isOpen ? tr("~FILE_DIALOG.OPEN") : tr("~FILE_DIALOG.SAVE")), this.props.provider.can('remove') ? button({
      onClick: this.remove,
      disabled: removeDisabled,
      className: removeDisabled ? 'disabled' : ''
    }, tr("~FILE_DIALOG.REMOVE")) : void 0, button({
      onClick: this.cancel
    }, tr("~FILE_DIALOG.CANCEL"))));
  }
});

module.exports = FileDialogTab;



},{"../providers/provider-interface":36,"../utils/translate":42,"./authorize-mixin":44}],49:[function(require,module,exports){
var Dropdown, div, i, input, ref, span, tr;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, input = ref.input;

Dropdown = React.createFactory(require('./dropdown-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'MenuBar',
  getFilename: function(props) {
    var ref1;
    if (((ref1 = props.filename) != null ? ref1.length : void 0) > 0) {
      return props.filename;
    } else {
      return tr("~MENUBAR.UNTITLED_DOCUMENT");
    }
  },
  getEditableFilename: function(props) {
    var ref1;
    if (((ref1 = props.filename) != null ? ref1.length : void 0) > 0) {
      return props.filename;
    } else {
      return "";
    }
  },
  getInitialState: function() {
    var state;
    return state = {
      editingFilename: false,
      filename: this.getFilename(this.props),
      editableFilename: this.getEditableFilename(this.props)
    };
  },
  componentWillReceiveProps: function(nextProps) {
    return this.setState({
      filename: this.getFilename(nextProps),
      editableFilename: this.getEditableFilename(nextProps),
      provider: nextProps.provider
    });
  },
  filenameClicked: function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      editingFilename: true
    });
    return setTimeout(((function(_this) {
      return function() {
        return _this.focusFilename();
      };
    })(this)), 10);
  },
  filenameChanged: function() {
    return this.setState({
      editableFilename: this.filename().value
    });
  },
  filenameBlurred: function() {
    return this.rename();
  },
  filename: function() {
    return React.findDOMNode(this.refs.filename);
  },
  focusFilename: function() {
    var el, range;
    el = this.filename();
    el.focus();
    if (typeof el.selectionStart === 'number') {
      return el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange !== 'undefined') {
      range = el.createTextRange();
      range.collapse(false);
      return range.select();
    }
  },
  rename: function() {
    var filename;
    filename = this.state.editableFilename.replace(/^\s+|\s+$/, '');
    if (filename.length > 0) {
      this.props.client.rename(this.props.client.state.metadata, filename);
      return this.setState({
        editingFilename: false,
        filename: filename,
        editableFilename: filename
      });
    } else {
      return this.setState({
        editingFilename: false
      });
    }
  },
  watchForEnter: function(e) {
    if (e.keyCode === 13) {
      return this.rename();
    } else if (e.keyCode === 27) {
      return this.setState({
        editingFilename: false
      });
    }
  },
  help: function() {
    return window.open(this.props.options.help, '_blank');
  },
  render: function() {
    var ref1;
    return div({
      className: 'menu-bar'
    }, div({
      className: 'menu-bar-left'
    }, Dropdown({
      items: this.props.items
    }), this.state.editingFilename ? div({
      className: 'menu-bar-content-filename'
    }, input({
      ref: 'filename',
      value: this.state.editableFilename,
      onChange: this.filenameChanged,
      onBlur: this.filenameBlurred,
      onKeyDown: this.watchForEnter
    })) : div({
      className: 'menu-bar-content-filename',
      onClick: this.filenameClicked
    }, this.state.filename), this.props.fileStatus ? span({
      className: "menu-bar-file-status-" + this.props.fileStatus.type
    }, this.props.fileStatus.message) : void 0), div({
      className: 'menu-bar-right'
    }, this.props.options.info ? span({
      className: 'menu-bar-info'
    }, this.props.options.info) : void 0, ((ref1 = this.props.provider) != null ? ref1.authorized() : void 0) ? this.props.provider.renderUser() : void 0, this.props.options.help ? i({
      style: {
        fontSize: "13px"
      },
      className: 'clickable icon-help',
      onClick: this.help
    }) : void 0));
  }
});



},{"../utils/translate":42,"./dropdown-view":47}],50:[function(require,module,exports){
var Modal, div, i, ref;

Modal = React.createFactory(require('./modal-view'));

ref = React.DOM, div = ref.div, i = ref.i;

module.exports = React.createClass({
  displayName: 'ModalDialog',
  close: function() {
    var base;
    return typeof (base = this.props).close === "function" ? base.close() : void 0;
  },
  render: function() {
    return Modal({
      close: this.props.close
    }, div({
      className: 'modal-dialog'
    }, div({
      className: 'modal-dialog-wrapper'
    }, div({
      className: 'modal-dialog-title'
    }, i({
      className: "modal-dialog-title-close icon-ex",
      onClick: this.close
    }), this.props.title || 'Untitled Dialog'), div({
      className: 'modal-dialog-workspace'
    }, this.props.children))));
  }
});



},{"./modal-view":52}],51:[function(require,module,exports){
var ModalDialog, TabbedPanel;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

TabbedPanel = React.createFactory(require('./tabbed-panel-view'));

module.exports = React.createClass({
  displayName: 'ModalTabbedDialogView',
  render: function() {
    return ModalDialog({
      title: this.props.title,
      close: this.props.close
    }, TabbedPanel({
      tabs: this.props.tabs,
      selectedTabIndex: this.props.selectedTabIndex
    }));
  }
});



},{"./modal-dialog-view":50,"./tabbed-panel-view":57}],52:[function(require,module,exports){
var div;

div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'Modal',
  watchForEscape: function(e) {
    var base;
    if (e.keyCode === 27) {
      return typeof (base = this.props).close === "function" ? base.close() : void 0;
    }
  },
  componentDidMount: function() {
    return $(window).on('keyup', this.watchForEscape);
  },
  componentWillUnmount: function() {
    return $(window).off('keyup', this.watchForEscape);
  },
  render: function() {
    return div({
      className: 'modal'
    }, div({
      className: 'modal-background'
    }), div({
      className: 'modal-content'
    }, this.props.children));
  }
});



},{}],53:[function(require,module,exports){
var CloudMetadata, FileDialogTab, ModalTabbedDialog, SelectProviderDialogTab, TabbedPanel, tr;

ModalTabbedDialog = React.createFactory(require('./modal-tabbed-dialog-view'));

TabbedPanel = require('./tabbed-panel-view');

CloudMetadata = (require('../providers/provider-interface')).CloudMetadata;

FileDialogTab = React.createFactory(require('./file-dialog-tab-view'));

SelectProviderDialogTab = React.createFactory(require('./select-provider-dialog-tab-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'ProviderTabbedDialog',
  render: function() {
    var TabComponent, capability, component, filteredTabComponent, i, j, len, provider, ref, ref1, ref2, ref3, selectedTabIndex, tabs;
    ref = (function() {
      switch (this.props.dialog.action) {
        case 'openFile':
          return ['list', FileDialogTab];
        case 'saveFile':
        case 'saveFileAs':
          return ['save', FileDialogTab];
        case 'createCopy':
          return ['save', FileDialogTab];
        case 'selectProvider':
          return [null, SelectProviderDialogTab];
      }
    }).call(this), capability = ref[0], TabComponent = ref[1];
    tabs = [];
    selectedTabIndex = 0;
    ref1 = this.props.client.state.availableProviders;
    for (i = j = 0, len = ref1.length; j < len; i = ++j) {
      provider = ref1[i];
      if (!capability || provider.capabilities[capability]) {
        filteredTabComponent = provider.filterTabComponent(capability, TabComponent);
        component = filteredTabComponent({
          client: this.props.client,
          dialog: this.props.dialog,
          close: this.props.close,
          provider: provider
        });
        tabs.push(TabbedPanel.Tab({
          key: i,
          label: tr(provider.displayName),
          component: component
        }));
        if (provider.name === ((ref2 = this.props.client.state.metadata) != null ? (ref3 = ref2.provider) != null ? ref3.name : void 0 : void 0)) {
          selectedTabIndex = tabs.length - 1;
        }
      }
    }
    return ModalTabbedDialog({
      title: tr(this.props.dialog.title),
      close: this.props.close,
      tabs: tabs,
      selectedTabIndex: selectedTabIndex
    });
  }
});



},{"../providers/provider-interface":36,"../utils/translate":42,"./file-dialog-tab-view":48,"./modal-tabbed-dialog-view":51,"./select-provider-dialog-tab-view":55,"./tabbed-panel-view":57}],54:[function(require,module,exports){
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'RenameDialogView',
  getInitialState: function() {
    var filename, state;
    filename = this.props.filename || '';
    return state = {
      filename: filename,
      trimmedFilename: this.trim(filename)
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    var filename;
    filename = this.filename.value;
    return this.setState({
      filename: filename,
      trimmedFilename: this.trim(filename)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  rename: function(e) {
    var base;
    if (this.state.trimmedFilename.length > 0) {
      if (typeof (base = this.props).callback === "function") {
        base.callback(this.state.filename);
      }
      return this.props.close();
    } else {
      e.preventDefault();
      return this.filename.focus();
    }
  },
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.RENAME'),
      close: this.props.close
    }, div({
      className: 'rename-dialog'
    }, input({
      ref: 'filename',
      placeholder: 'Filename',
      value: this.state.filename,
      onChange: this.updateFilename
    }), div({
      className: 'buttons'
    }, button({
      className: (this.state.trimmedFilename.length === 0 ? 'disabled' : ''),
      onClick: this.rename
    }, tr('~RENAME_DIALOG.RENAME')), button({
      onClick: this.props.close
    }, tr('~RENAME_DIALOG.CANCEL')))));
  }
});



},{"../utils/translate":42,"./modal-dialog-view":50}],55:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],56:[function(require,module,exports){
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'ShareUrlDialogView',
  componentDidMount: function() {
    var ref1;
    return (ref1 = React.findDOMNode(this.refs.url)) != null ? ref1.select() : void 0;
  },
  view: function() {
    return window.open(this.props.url);
  },
  copy: function() {
    var copied, error, error1, mark, range, selection;
    copied = true;
    try {
      mark = document.createElement('mark');
      mark.innerHTML = this.props.url;
      document.body.appendChild(mark);
      selection = document.getSelection();
      selection.removeAllRanges();
      range = document.createRange();
      range.selectNode(mark);
      selection.addRange(range);
      return copied = document.execCommand('copy');
    } catch (error) {
      try {
        return window.clipboardData.setData('text', this.props.url);
      } catch (error1) {
        return copied = false;
      }
    } finally {
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
      alert(tr((copied ? "~SHARE_DIALOG.COPY_SUCCESS" : "~SHARE_DIALOG.COPY_ERROR")));
    }
  },
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.SHARED'),
      close: this.props.close
    }, div({
      className: 'share-dialog'
    }, input({
      ref: 'url',
      value: this.props.url,
      readOnly: true
    }), div({
      className: 'buttons'
    }, document.execCommand || window.clipboardData ? button({
      onClick: this.copy
    }, tr('~SHARE_DIALOG.COPY')) : void 0, button({
      onClick: this.view
    }, tr('~SHARE_DIALOG.VIEW')), button({
      onClick: this.props.close
    }, tr('~SHARE_DIALOG.CLOSE')))));
  }
});



},{"../utils/translate":42,"./modal-dialog-view":50}],57:[function(require,module,exports){
var Tab, TabInfo, a, div, li, ref, ul;

ref = React.DOM, div = ref.div, ul = ref.ul, li = ref.li, a = ref.a;

TabInfo = (function() {
  function TabInfo(settings) {
    if (settings == null) {
      settings = {};
    }
    this.label = settings.label, this.component = settings.component;
  }

  return TabInfo;

})();

Tab = React.createFactory(React.createClass({
  displayName: 'TabbedPanelTab',
  clicked: function(e) {
    e.preventDefault();
    return this.props.onSelected(this.props.index);
  },
  render: function() {
    var classname;
    classname = this.props.selected ? 'tab-selected' : '';
    return li({
      className: classname,
      onClick: this.clicked
    }, this.props.label);
  }
}));

module.exports = React.createClass({
  displayName: 'TabbedPanelView',
  getInitialState: function() {
    return {
      selectedTabIndex: this.props.selectedTabIndex || 0
    };
  },
  statics: {
    Tab: function(settings) {
      return new TabInfo(settings);
    }
  },
  selectedTab: function(index) {
    return this.setState({
      selectedTabIndex: index
    });
  },
  renderTab: function(tab, index) {
    return Tab({
      label: tab.label,
      key: index,
      index: index,
      selected: index === this.state.selectedTabIndex,
      onSelected: this.selectedTab
    });
  },
  renderTabs: function() {
    var index, tab;
    return div({
      className: 'workspace-tabs'
    }, (function() {
      var i, len, ref1, results;
      ref1 = this.props.tabs;
      results = [];
      for (index = i = 0, len = ref1.length; i < len; index = ++i) {
        tab = ref1[index];
        results.push(ul({
          key: index
        }, this.renderTab(tab, index)));
      }
      return results;
    }).call(this));
  },
  renderSelectedPanel: function() {
    var index, tab;
    return div({
      className: 'workspace-tab-component'
    }, (function() {
      var i, len, ref1, results;
      ref1 = this.props.tabs;
      results = [];
      for (index = i = 0, len = ref1.length; i < len; index = ++i) {
        tab = ref1[index];
        results.push(div({
          key: index,
          style: {
            display: index === this.state.selectedTabIndex ? 'block' : 'none'
          }
        }, tab.component));
      }
      return results;
    }).call(this));
  },
  render: function() {
    return div({
      key: this.props.key,
      className: "tabbed-panel"
    }, this.renderTabs(), this.renderSelectedPanel());
  }
});



},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWwtZmlsZS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGxvY2Fsc3RvcmFnZS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXHByb3ZpZGVyLWludGVyZmFjZS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXHJlYWRvbmx5LXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHVpLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxnZXQtaGFzaC1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxibG9ja2luZy1tb2RhbC12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxrQkFBUixDQUFwQjs7QUFFVixzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFDMUMsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsVUFBUixDQUFELENBQW9CLENBQUM7O0FBRTlDLFlBQUEsR0FBZSxPQUFBLENBQVEsd0JBQVI7O0FBRVQ7RUFFUywwQkFBQyxPQUFEO0lBRVgsSUFBQyxDQUFBLFdBQUQsR0FBZSxzQkFBc0IsQ0FBQztJQUV0QyxJQUFDLENBQUEsTUFBRCxHQUFjLElBQUEsc0JBQUEsQ0FBQTtJQUNkLElBQUMsQ0FBQSxVQUFELEdBQWM7RUFMSDs7NkJBT2IsSUFBQSxHQUFNLFNBQUMsVUFBRCxFQUFjLFdBQWQ7SUFBQyxJQUFDLENBQUEsYUFBRDs7TUFBYSxjQUFjOztJQUNoQyxJQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosR0FBMEI7V0FDMUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxhQUFSLENBQXNCLElBQUMsQ0FBQSxVQUF2QjtFQUZJOzs2QkFJTixXQUFBLEdBQWEsU0FBQyxVQUFELEVBQWMsTUFBZCxFQUFzQixhQUF0QjtJQUFDLElBQUMsQ0FBQSxhQUFEOztNQUFxQixnQkFBZ0I7O0lBQ2pELElBQUMsQ0FBQSxJQUFELENBQU0sSUFBQyxDQUFBLFVBQVAsRUFBbUIsSUFBbkI7SUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsQ0FBZSxhQUFmO1dBQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBWSxRQUFRLENBQUMsY0FBVCxDQUF3QixNQUF4QixDQUFaO0VBSFc7OzZCQUtiLGFBQUEsR0FBZSxTQUFDLGFBQUQ7QUFDYixRQUFBO0lBQUEsSUFBRyxDQUFJLElBQUMsQ0FBQSxVQUFVLENBQUMsV0FBbkI7TUFDRSxJQUFDLENBQUEsZ0JBQUQsQ0FBQSxFQURGOztJQUVBLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBUixDQUFlLGFBQWY7SUFDQSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBQTtJQUVBLGVBQUEsR0FBa0IsWUFBQSxDQUFhLFFBQWI7SUFDbEIsVUFBQSxHQUFhLFlBQUEsQ0FBYSxNQUFiO0lBQ2IsVUFBQSxHQUFhLFlBQUEsQ0FBYSxNQUFiO0lBQ2IsSUFBRyxlQUFIO2FBQ0UsSUFBQyxDQUFBLE1BQU0sQ0FBQyxpQkFBUixDQUEwQixlQUExQixFQURGO0tBQUEsTUFFSyxJQUFHLFVBQUg7TUFDSCxNQUFpQyxVQUFVLENBQUMsS0FBWCxDQUFpQixHQUFqQixDQUFqQyxFQUFDLHFCQUFELEVBQWU7YUFDZixJQUFDLENBQUEsTUFBTSxDQUFDLGdCQUFSLENBQXlCLFlBQXpCLEVBQXVDLGNBQXZDLEVBRkc7S0FBQSxNQUdBLElBQUcsVUFBSDthQUNILElBQUMsQ0FBQSxNQUFNLENBQUMsY0FBUixDQUF1QixVQUF2QixFQURHOztFQWRROzs2QkFpQmYsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixRQUFBO0lBQUEsTUFBQSxHQUFTLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO0lBQ1QsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLE1BQTFCO1dBQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBWSxNQUFaO0VBSGdCOzs2QkFLbEIsVUFBQSxHQUFZLFNBQUMsTUFBRDtJQUNWLElBQUMsQ0FBQSxVQUFVLENBQUMsTUFBWixHQUFxQixJQUFDLENBQUE7V0FDdEIsS0FBSyxDQUFDLE1BQU4sQ0FBYyxPQUFBLENBQVEsSUFBQyxDQUFBLFVBQVQsQ0FBZCxFQUFvQyxNQUFwQztFQUZVOzs7Ozs7QUFJZCxNQUFNLENBQUMsT0FBUCxHQUFxQixJQUFBLGdCQUFBLENBQUE7Ozs7Ozs7Ozs7O0FDbERkLFNBQVMsbUJBQW1CLENBQUMsT0FBTyxFQUFFO0FBQzNDLE1BQUksR0FBRyxHQUFHLEVBQUU7TUFDUixNQUFNLFlBQUE7TUFDTixTQUFTLFlBQUEsQ0FBQztBQUNkLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFVBQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsUUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ2hCLGVBQVMsR0FBRyxDQUFDLENBQUM7S0FDZixNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtBQUN6QixlQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDaEIsTUFBTTtBQUNMLGVBQVMsR0FBRyxDQUFDLENBQUM7S0FDZjs7QUFFRCxPQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0dBQ3JDO0FBQ0QsU0FBTyxHQUFHLENBQUM7Q0FDWjs7Ozs7Ozs7O0FDbEJNLFNBQVMsbUJBQW1CLENBQUMsT0FBTyxFQUFFO0FBQzNDLE1BQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNiLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLFFBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixRQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7QUFDaEIsU0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNuQixNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtBQUN6QixTQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ25COztBQUVELE9BQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDOztBQUVuQyxRQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7QUFDaEIsU0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNwQixNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtBQUN6QixTQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3BCO0dBQ0Y7QUFDRCxTQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDckI7O0FBRUQsU0FBUyxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQ3JCLE1BQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNWLEdBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3QixHQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDNUIsR0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLEdBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzs7QUFFOUIsU0FBTyxDQUFDLENBQUM7Q0FDVjs7Ozs7OztxQkM3QnVCLElBQUk7O0FBQWIsU0FBUyxJQUFJLEdBQUcsRUFBRTs7QUFFakMsSUFBSSxDQUFDLFNBQVMsR0FBRztBQUNmLE1BQUksRUFBQSxjQUFDLFNBQVMsRUFBRSxTQUFTLEVBQWdCO1FBQWQsT0FBTyx5REFBRyxFQUFFOztBQUNyQyxRQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQ2hDLFFBQUksT0FBTyxPQUFPLEtBQUssVUFBVSxFQUFFO0FBQ2pDLGNBQVEsR0FBRyxPQUFPLENBQUM7QUFDbkIsYUFBTyxHQUFHLEVBQUUsQ0FBQztLQUNkO0FBQ0QsUUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7O0FBRXZCLFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQzs7QUFFaEIsYUFBUyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ25CLFVBQUksUUFBUSxFQUFFO0FBQ1osa0JBQVUsQ0FBQyxZQUFXO0FBQUUsa0JBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFELGVBQU8sSUFBSSxDQUFDO09BQ2IsTUFBTTtBQUNMLGVBQU8sS0FBSyxDQUFDO09BQ2Q7S0FDRjs7O0FBR0QsYUFBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEMsYUFBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7O0FBRXRDLGFBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUN2RCxhQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7O0FBRXZELFFBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNO1FBQUUsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFDekQsUUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLFFBQUksYUFBYSxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDcEMsUUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzs7O0FBR2hELFFBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdEUsUUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxNQUFNLElBQUksTUFBTSxHQUFHLENBQUMsSUFBSSxNQUFNLEVBQUU7O0FBRTVELGFBQU8sSUFBSSxDQUFDLENBQUMsRUFBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUMsQ0FBQztLQUNyRTs7O0FBR0QsYUFBUyxjQUFjLEdBQUc7QUFDeEIsV0FBSyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLEVBQUUsWUFBWSxJQUFJLFVBQVUsRUFBRSxZQUFZLElBQUksQ0FBQyxFQUFFO0FBQ3RGLFlBQUksUUFBUSxZQUFBLENBQUM7QUFDYixZQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNwQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7WUFDdkMsT0FBTSxHQUFHLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBLEdBQUksWUFBWSxDQUFDO0FBQ2pFLFlBQUksT0FBTyxFQUFFOztBQUVYLGtCQUFRLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQztTQUN4Qzs7QUFFRCxZQUFJLE1BQU0sR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTTtZQUMvQyxTQUFTLEdBQUcsVUFBVSxJQUFJLENBQUMsSUFBSSxPQUFNLElBQUksT0FBTSxHQUFHLE1BQU0sQ0FBQztBQUM3RCxZQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFOztBQUV6QixrQkFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLFNBQVMsQ0FBQztBQUNuQyxtQkFBUztTQUNWOzs7OztBQUtELFlBQUksQ0FBQyxNQUFNLElBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQUFBQyxFQUFFO0FBQ2hFLGtCQUFRLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLGNBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDMUQsTUFBTTtBQUNMLGtCQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ25CLGtCQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDbEIsY0FBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztTQUMxRDs7QUFFRCxlQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQzs7O0FBRzFFLFlBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxJQUFJLE9BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxFQUFFO0FBQ3pELGlCQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztTQUNqRyxNQUFNOztBQUVMLGtCQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsUUFBUSxDQUFDO1NBQ25DO09BQ0Y7O0FBRUQsZ0JBQVUsRUFBRSxDQUFDO0tBQ2Q7Ozs7O0FBS0QsUUFBSSxRQUFRLEVBQUU7QUFDWixBQUFDLE9BQUEsU0FBUyxJQUFJLEdBQUc7QUFDZixrQkFBVSxDQUFDLFlBQVc7OztBQUdwQixjQUFJLFVBQVUsR0FBRyxhQUFhLEVBQUU7QUFDOUIsbUJBQU8sUUFBUSxFQUFFLENBQUM7V0FDbkI7O0FBRUQsY0FBSSxDQUFDLGNBQWMsRUFBRSxFQUFFO0FBQ3JCLGdCQUFJLEVBQUUsQ0FBQztXQUNSO1NBQ0YsRUFBRSxDQUFDLENBQUMsQ0FBQztPQUNQLENBQUEsRUFBRSxDQUFFO0tBQ04sTUFBTTtBQUNMLGFBQU8sVUFBVSxJQUFJLGFBQWEsRUFBRTtBQUNsQyxZQUFJLEdBQUcsR0FBRyxjQUFjLEVBQUUsQ0FBQztBQUMzQixZQUFJLEdBQUcsRUFBRTtBQUNQLGlCQUFPLEdBQUcsQ0FBQztTQUNaO09BQ0Y7S0FDRjtHQUNGOztBQUVELGVBQWEsRUFBQSx1QkFBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTtBQUN4QyxRQUFJLElBQUksR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM3QyxRQUFJLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRTs7O0FBRzVELGdCQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztLQUM5RixNQUFNO0FBQ0wsZ0JBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7S0FDOUQ7R0FDRjtBQUNELGVBQWEsRUFBQSx1QkFBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUU7QUFDMUQsUUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU07UUFDekIsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNO1FBQ3pCLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTTtRQUN4QixNQUFNLEdBQUcsTUFBTSxHQUFHLFlBQVk7UUFFOUIsV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQixXQUFPLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDOUcsWUFBTSxFQUFFLENBQUM7QUFDVCxZQUFNLEVBQUUsQ0FBQztBQUNULGlCQUFXLEVBQUUsQ0FBQztLQUNmOztBQUVELFFBQUksV0FBVyxFQUFFO0FBQ2YsY0FBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsV0FBVyxFQUFDLENBQUMsQ0FBQztLQUNoRDs7QUFFRCxZQUFRLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN6QixXQUFPLE1BQU0sQ0FBQztHQUNmOztBQUVELFFBQU0sRUFBQSxnQkFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ2xCLFdBQU8sSUFBSSxLQUFLLEtBQUssQ0FBQztHQUN2QjtBQUNELGFBQVcsRUFBQSxxQkFBQyxLQUFLLEVBQUU7QUFDakIsUUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2IsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDckMsVUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDWixXQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3BCO0tBQ0Y7QUFDRCxXQUFPLEdBQUcsQ0FBQztHQUNaO0FBQ0QsV0FBUyxFQUFBLG1CQUFDLEtBQUssRUFBRTtBQUNmLFdBQU8sS0FBSyxDQUFDO0dBQ2Q7QUFDRCxVQUFRLEVBQUEsa0JBQUMsS0FBSyxFQUFFO0FBQ2QsV0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ3hCO0NBQ0YsQ0FBQzs7QUFFRixTQUFTLFdBQVcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFO0FBQzVFLE1BQUksWUFBWSxHQUFHLENBQUM7TUFDaEIsWUFBWSxHQUFHLFVBQVUsQ0FBQyxNQUFNO01BQ2hDLE1BQU0sR0FBRyxDQUFDO01BQ1YsTUFBTSxHQUFHLENBQUMsQ0FBQzs7QUFFZixTQUFPLFlBQVksR0FBRyxZQUFZLEVBQUUsWUFBWSxFQUFFLEVBQUU7QUFDbEQsUUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLFFBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFO0FBQ3RCLFVBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLGVBQWUsRUFBRTtBQUN2QyxZQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlELGFBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUNuQyxjQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLGlCQUFPLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLEdBQUcsS0FBSyxDQUFDO1NBQzFELENBQUMsQ0FBQzs7QUFFSCxpQkFBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO09BQ2xDLE1BQU07QUFDTCxpQkFBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztPQUM5RTtBQUNELFlBQU0sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDOzs7QUFHMUIsVUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUU7QUFDcEIsY0FBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUM7T0FDM0I7S0FDRixNQUFNO0FBQ0wsZUFBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3RSxZQUFNLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQzs7Ozs7QUFLMUIsVUFBSSxZQUFZLElBQUksVUFBVSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7QUFDdEQsWUFBSSxHQUFHLEdBQUcsVUFBVSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QyxrQkFBVSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDeEQsa0JBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLENBQUM7T0FDaEM7S0FDRjtHQUNGOzs7O0FBSUQsTUFBSSxhQUFhLEdBQUcsVUFBVSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNqRCxNQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFBLElBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzFGLGNBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUM7QUFDMUQsY0FBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ2xCOztBQUVELFNBQU8sVUFBVSxDQUFDO0NBQ25COztBQUVELFNBQVMsU0FBUyxDQUFDLElBQUksRUFBRTtBQUN2QixTQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDdEU7Ozs7Ozs7Ozs7Ozs7b0JDM05nQixRQUFROzs7O0FBRWxCLElBQU0sYUFBYSxHQUFHLHVCQUFVLENBQUM7OztBQUNqQyxTQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUFFLFNBQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0NBQUU7Ozs7Ozs7Ozs7OztvQkNIM0YsUUFBUTs7OztBQUVsQixJQUFNLE9BQU8sR0FBRyx1QkFBVSxDQUFDOztBQUNsQyxPQUFPLENBQUMsUUFBUSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ2pDLFNBQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztDQUNyQyxDQUFDOztBQUVLLFNBQVMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQUUsU0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Q0FBRTs7Ozs7Ozs7Ozs7OztvQkNQbkYsUUFBUTs7OztvQkFDRixRQUFROztBQUUvQixJQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDOztBQUduRCxJQUFNLFFBQVEsR0FBRyx1QkFBVSxDQUFDOzs7O0FBR25DLFFBQVEsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDOztBQUVoQyxRQUFRLENBQUMsUUFBUSxHQUFHLGVBQVMsUUFBUSxDQUFDO0FBQ3RDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsVUFBUyxLQUFLLEVBQUU7QUFDbkMsU0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztDQUNqRyxDQUFDO0FBQ0YsUUFBUSxDQUFDLE1BQU0sR0FBRyxVQUFTLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDdEMsU0FBTyxrQkFBSyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDbkcsQ0FBQzs7QUFFSyxTQUFTLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUFFLFNBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0NBQUU7Ozs7O0FBSy9GLFNBQVMsWUFBWSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7QUFDekQsT0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7QUFDcEIsa0JBQWdCLEdBQUcsZ0JBQWdCLElBQUksRUFBRSxDQUFDOztBQUUxQyxNQUFJLENBQUMsWUFBQSxDQUFDOztBQUVOLE9BQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3BDLFFBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtBQUNwQixhQUFPLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzVCO0dBQ0Y7O0FBRUQsTUFBSSxnQkFBZ0IsWUFBQSxDQUFDOztBQUVyQixNQUFJLGdCQUFnQixLQUFLLHVCQUF1QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUMxRCxTQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLG9CQUFnQixHQUFHLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxvQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN4QyxTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNsQyxzQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ3JFO0FBQ0QsU0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ1osb0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDeEIsTUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO0FBQ2xELFNBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEIsb0JBQWdCLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLG9CQUFnQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLFFBQUksVUFBVSxHQUFHLEVBQUU7UUFDZixHQUFHLFlBQUEsQ0FBQztBQUNSLFNBQUssR0FBRyxJQUFJLEdBQUcsRUFBRTs7QUFFZixVQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDM0Isa0JBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDdEI7S0FDRjtBQUNELGNBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNsQixTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN6QyxTQUFHLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLHNCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7S0FDekU7QUFDRCxTQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDWixvQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUN4QixNQUFNO0FBQ0wsb0JBQWdCLEdBQUcsR0FBRyxDQUFDO0dBQ3hCO0FBQ0QsU0FBTyxnQkFBZ0IsQ0FBQztDQUN6Qjs7Ozs7Ozs7Ozs7OztvQkN0RWdCLFFBQVE7Ozs7MEJBQ0ssZ0JBQWdCOztBQUV2QyxJQUFNLFFBQVEsR0FBRyx1QkFBVSxDQUFDOztBQUNuQyxRQUFRLENBQUMsUUFBUSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ2xDLE1BQUksUUFBUSxHQUFHLEVBQUU7TUFDYixnQkFBZ0IsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7QUFHaEQsTUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRTtBQUNsRCxvQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUN4Qjs7O0FBR0QsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxRQUFJLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFL0IsUUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUU7QUFDekMsY0FBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDO0tBQ3ZDLE1BQU07QUFDTCxVQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7QUFDakMsWUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztPQUNwQjtBQUNELGNBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDckI7R0FDRjs7QUFFRCxTQUFPLFFBQVEsQ0FBQztDQUNqQixDQUFDOztBQUVLLFNBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQUUsU0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Q0FBRTs7QUFDaEcsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUN6RCxNQUFJLE9BQU8sR0FBRyw0QkFBZ0IsUUFBUSxFQUFFLEVBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUNsRSxTQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztDQUMvQzs7Ozs7Ozs7Ozs7O29CQ2xDZ0IsUUFBUTs7OztBQUdsQixJQUFNLFlBQVksR0FBRyx1QkFBVSxDQUFDOztBQUN2QyxZQUFZLENBQUMsUUFBUSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ3RDLFNBQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0NBQzdDLENBQUM7O0FBRUssU0FBUyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFBRSxTQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztDQUFFOzs7Ozs7Ozs7Ozs7O29CQ1I5RixRQUFROzs7OzBCQUNLLGdCQUFnQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQjlDLElBQU0saUJBQWlCLEdBQUcsK0RBQXFHLENBQUM7O0FBRWhJLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQzs7QUFFbkIsSUFBTSxRQUFRLEdBQUcsdUJBQVUsQ0FBQzs7QUFDbkMsUUFBUSxDQUFDLE1BQU0sR0FBRyxVQUFTLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDdEMsU0FBTyxJQUFJLEtBQUssS0FBSyxJQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQUFBQyxDQUFDO0NBQ25ILENBQUM7QUFDRixRQUFRLENBQUMsUUFBUSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ2xDLE1BQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7OztBQUdyQyxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7O0FBRTFDLFFBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQzFCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFDakMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUM5QyxZQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMzQixZQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDeEIsT0FBQyxFQUFFLENBQUM7S0FDTDtHQUNGOztBQUVELFNBQU8sTUFBTSxDQUFDO0NBQ2YsQ0FBQzs7QUFFSyxTQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUNsRCxNQUFJLE9BQU8sR0FBRyw0QkFBZ0IsUUFBUSxFQUFFLEVBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUNsRSxTQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztDQUMvQzs7QUFDTSxTQUFTLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQzNELFNBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0NBQ2hEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7d0JDckNnQixhQUFhOzs7OzZCQUNOLGtCQUFrQjs7d0JBQ0UsYUFBYTs7d0JBQ2YsYUFBYTs7NEJBQzNCLGlCQUFpQjs7dUJBRXZCLFlBQVk7O3dCQUNHLGFBQWE7OzBCQUVYLGVBQWU7OzBCQUM3QixlQUFlOzsyQkFDd0IsZ0JBQWdCOzswQkFFOUMsZUFBZTs7MEJBQ2YsZUFBZTs7UUFHL0MsSUFBSTtRQUVKLFNBQVM7UUFDVCxTQUFTO1FBQ1Qsa0JBQWtCO1FBQ2xCLFNBQVM7UUFDVCxnQkFBZ0I7UUFDaEIsYUFBYTtRQUViLE9BQU87UUFDUCxRQUFRO1FBRVIsZUFBZTtRQUNmLG1CQUFtQjtRQUNuQixXQUFXO1FBQ1gsVUFBVTtRQUNWLFlBQVk7UUFDWixVQUFVO1FBQ1YsbUJBQW1CO1FBQ25CLG1CQUFtQjtRQUNuQixZQUFZOzs7Ozs7Ozs7Ozs7O3FCQ3JEVyxTQUFTOztvQ0FDTCwyQkFBMkI7Ozs7QUFFakQsU0FBUyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBZ0I7TUFBZCxPQUFPLHlEQUFHLEVBQUU7O0FBQ3RELE1BQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFO0FBQy9CLFdBQU8sR0FBRyxrQkFBVyxPQUFPLENBQUMsQ0FBQztHQUMvQjs7QUFFRCxNQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDMUIsUUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN0QixZQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7S0FDL0Q7O0FBRUQsV0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUN0Qjs7O0FBR0QsTUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDMUIsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLO01BRXJCLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFLLFVBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsWUFBWTtXQUFLLElBQUksS0FBSyxZQUFZO0dBQUEsQUFBQztNQUMzRyxVQUFVLEdBQUcsQ0FBQztNQUNkLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUM7TUFDcEMsT0FBTyxHQUFHLENBQUM7TUFDWCxNQUFNLEdBQUcsQ0FBQztNQUVWLFdBQVcsWUFBQTtNQUNYLFFBQVEsWUFBQSxDQUFDOzs7OztBQUtiLFdBQVMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDN0IsU0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzFDLFVBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1VBQ3BCLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1VBQ25CLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU3QixVQUFJLFNBQVMsS0FBSyxHQUFHLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTs7QUFFMUMsWUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQUU7QUFDN0Qsb0JBQVUsRUFBRSxDQUFDOztBQUViLGNBQUksVUFBVSxHQUFHLFVBQVUsRUFBRTtBQUMzQixtQkFBTyxLQUFLLENBQUM7V0FDZDtTQUNGO0FBQ0QsYUFBSyxFQUFFLENBQUM7T0FDVDtLQUNGOztBQUVELFdBQU8sSUFBSSxDQUFDO0dBQ2I7OztBQUdELE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3JDLFFBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDZixPQUFPLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUTtRQUN0QyxXQUFXLEdBQUcsQ0FBQztRQUNmLEtBQUssR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7O0FBRXZDLFFBQUksUUFBUSxHQUFHLGtDQUFpQixLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDOztBQUV6RCxXQUFPLFdBQVcsS0FBSyxTQUFTLEVBQUUsV0FBVyxHQUFHLFFBQVEsRUFBRSxFQUFFO0FBQzFELFVBQUksUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUcsV0FBVyxDQUFDLEVBQUU7QUFDdkMsWUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksV0FBVyxDQUFDO0FBQ3BDLGNBQU07T0FDUDtLQUNGOztBQUVELFFBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtBQUM3QixhQUFPLEtBQUssQ0FBQztLQUNkOzs7O0FBSUQsV0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0dBQ3ZEOzs7QUFHRCxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNyQyxRQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2YsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7O0FBRTVDLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxVQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUNwQixTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztVQUNuQixPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFN0IsVUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQ3JCLGFBQUssRUFBRSxDQUFDO09BQ1QsTUFBTSxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUU7QUFDNUIsYUFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7O09BRXhCLE1BQU0sSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQzVCLGVBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNoQyxlQUFLLEVBQUUsQ0FBQztTQUNULE1BQU0sSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFO0FBQzdCLGNBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ3hFLGNBQUksaUJBQWlCLEtBQUssR0FBRyxFQUFFO0FBQzdCLHVCQUFXLEdBQUcsSUFBSSxDQUFDO1dBQ3BCLE1BQU0sSUFBSSxpQkFBaUIsS0FBSyxHQUFHLEVBQUU7QUFDcEMsb0JBQVEsR0FBRyxJQUFJLENBQUM7V0FDakI7U0FDRjtLQUNGO0dBQ0Y7OztBQUdELE1BQUksV0FBVyxFQUFFO0FBQ2YsV0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQy9CLFdBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztLQUNiO0dBQ0YsTUFBTSxJQUFJLFFBQVEsRUFBRTtBQUNuQixTQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0dBQ2hCO0FBQ0QsU0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3pCOzs7O0FBR00sU0FBUyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUM3QyxNQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtBQUMvQixXQUFPLEdBQUcsa0JBQVcsT0FBTyxDQUFDLENBQUM7R0FDL0I7O0FBRUQsTUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLFdBQVMsWUFBWSxHQUFHO0FBQ3RCLFFBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLFFBQUksQ0FBQyxLQUFLLEVBQUU7QUFDVixhQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztLQUMzQjs7QUFFRCxXQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxVQUFTLEdBQUcsRUFBRSxJQUFJLEVBQUU7QUFDMUMsVUFBSSxHQUFHLEVBQUU7QUFDUCxlQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7T0FDOUI7O0FBRUQsVUFBSSxjQUFjLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDdEQsYUFBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7O0FBRXZDLGdCQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzdCLENBQUMsQ0FBQztHQUNKO0FBQ0QsY0FBWSxFQUFFLENBQUM7Q0FDaEI7Ozs7Ozs7Ozs7Ozs7O3dCQ2hKdUIsY0FBYzs7QUFFL0IsU0FBUyxlQUFlLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO0FBQ3ZHLE1BQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixXQUFPLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7R0FDMUI7O0FBRUQsTUFBTSxJQUFJLEdBQUcsb0JBQVUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLE1BQUksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDOztBQUVsQyxXQUFTLFlBQVksQ0FBQyxLQUFLLEVBQUU7QUFDM0IsV0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVMsS0FBSyxFQUFFO0FBQUUsYUFBTyxHQUFHLEdBQUcsS0FBSyxDQUFDO0tBQUUsQ0FBQyxDQUFDO0dBQzNEOztBQUVELE1BQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNmLE1BQUksYUFBYSxHQUFHLENBQUM7TUFBRSxhQUFhLEdBQUcsQ0FBQztNQUFFLFFBQVEsR0FBRyxFQUFFO01BQ25ELE9BQU8sR0FBRyxDQUFDO01BQUUsT0FBTyxHQUFHLENBQUMsQ0FBQzs7d0JBQ3BCLENBQUM7QUFDUixRQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUUsV0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7O0FBRXRCLFFBQUksT0FBTyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFOzs7Ozs7QUFFcEMsVUFBSSxDQUFDLGFBQWEsRUFBRTtBQUNsQixZQUFNLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLHFCQUFhLEdBQUcsT0FBTyxDQUFDO0FBQ3hCLHFCQUFhLEdBQUcsT0FBTyxDQUFDOztBQUV4QixZQUFJLElBQUksRUFBRTtBQUNSLGtCQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3ZGLHVCQUFhLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQztBQUNqQyx1QkFBYSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDbEM7T0FDRjs7O0FBR0QsbUJBQUEsUUFBUSxFQUFDLElBQUksTUFBQSwrQkFBSyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVMsS0FBSyxFQUFFO0FBQzFDLGVBQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUEsR0FBSSxLQUFLLENBQUM7T0FDNUMsQ0FBQyxFQUFDLENBQUM7OztBQUdKLFVBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtBQUNqQixlQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQztPQUN6QixNQUFNO0FBQ0wsZUFBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7T0FDekI7S0FDRixNQUFNOztBQUVMLFVBQUksYUFBYSxFQUFFOztBQUVqQixZQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOzs7Ozs7QUFFOUQsd0JBQUEsUUFBUSxFQUFDLElBQUksTUFBQSxnQ0FBSyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQztTQUN4QyxNQUFNOzs7Ozs7QUFFTCxjQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFELHdCQUFBLFFBQVEsRUFBQyxJQUFJLE1BQUEsZ0NBQUssWUFBWSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUMsQ0FBQzs7QUFFN0QsY0FBSSxJQUFJLEdBQUc7QUFDVCxvQkFBUSxFQUFFLGFBQWE7QUFDdkIsb0JBQVEsRUFBRyxPQUFPLEdBQUcsYUFBYSxHQUFHLFdBQVcsQUFBQztBQUNqRCxvQkFBUSxFQUFFLGFBQWE7QUFDdkIsb0JBQVEsRUFBRyxPQUFPLEdBQUcsYUFBYSxHQUFHLFdBQVcsQUFBQztBQUNqRCxpQkFBSyxFQUFFLFFBQVE7V0FDaEIsQ0FBQztBQUNGLGNBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTs7QUFFM0QsZ0JBQUksYUFBYSxHQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEFBQUMsQ0FBQztBQUN6QyxnQkFBSSxhQUFhLEdBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQUFBQyxDQUFDO0FBQ3pDLGdCQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFOztBQUV2QyxzQkFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO2FBQ25FLE1BQU0sSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsRUFBRTtBQUMzQyxzQkFBUSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2FBQy9DO1dBQ0Y7QUFDRCxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVqQix1QkFBYSxHQUFHLENBQUMsQ0FBQztBQUNsQix1QkFBYSxHQUFHLENBQUMsQ0FBQztBQUNsQixrQkFBUSxHQUFHLEVBQUUsQ0FBQztTQUNmO09BQ0Y7QUFDRCxhQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQztBQUN4QixhQUFPLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQztLQUN6Qjs7O0FBckVILE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1VBQTdCLENBQUM7R0FzRVQ7O0FBRUQsU0FBTztBQUNMLGVBQVcsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVc7QUFDbEQsYUFBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUztBQUMxQyxTQUFLLEVBQUUsS0FBSztHQUNiLENBQUM7Q0FDSDs7QUFFTSxTQUFTLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTtBQUMzRyxNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7O0FBRXRHLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNmLE1BQUksV0FBVyxJQUFJLFdBQVcsRUFBRTtBQUM5QixPQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQztHQUNuQztBQUNELEtBQUcsQ0FBQyxJQUFJLENBQUMscUVBQXFFLENBQUMsQ0FBQztBQUNoRixLQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQyxDQUFDO0FBQzNHLEtBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFdBQVcsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUEsQUFBQyxDQUFDLENBQUM7O0FBRTNHLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxRQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLE9BQUcsQ0FBQyxJQUFJLENBQ04sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQzFDLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUMxQyxLQUFLLENBQ1IsQ0FBQztBQUNGLE9BQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDakM7O0FBRUQsU0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztDQUM5Qjs7QUFFTSxTQUFTLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTtBQUNuRixTQUFPLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0NBQy9GOzs7Ozs7Ozs7QUMxSE0sU0FBUyxVQUFVLENBQUMsT0FBTyxFQUFnQjtNQUFkLE9BQU8seURBQUcsRUFBRTs7QUFDOUMsTUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDN0IsSUFBSSxHQUFHLEVBQUU7TUFDVCxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUVWLFdBQVMsVUFBVSxHQUFHO0FBQ3BCLFFBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNmLFFBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7OztBQUdqQixXQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3pCLFVBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7O0FBR3RCLFVBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3RDLGNBQU07T0FDUDs7O0FBR0QsVUFBSSxNQUFNLEdBQUcsQUFBQywwQ0FBMEMsQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckUsVUFBSSxNQUFNLEVBQUU7QUFDVixhQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUN6Qjs7QUFFRCxPQUFDLEVBQUUsQ0FBQztLQUNMOzs7O0FBSUQsbUJBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QixtQkFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7QUFHdkIsU0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7O0FBRWpCLFdBQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUU7QUFDekIsVUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV0QixVQUFJLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMvQyxjQUFNO09BQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDM0IsYUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztPQUMvQixNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7O0FBRWpDLGNBQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsQUFBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7T0FDekUsTUFBTTtBQUNMLFNBQUMsRUFBRSxDQUFDO09BQ0w7S0FDRjtHQUNGOzs7O0FBSUQsV0FBUyxlQUFlLENBQUMsS0FBSyxFQUFFO0FBQzlCLFFBQUksVUFBVSxHQUFHLEFBQUMsc0NBQXNDLENBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLFFBQUksVUFBVSxFQUFFO0FBQ2QsVUFBSSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3hELFdBQUssQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLFdBQUssQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU1QyxPQUFDLEVBQUUsQ0FBQztLQUNMO0dBQ0Y7Ozs7QUFJRCxXQUFTLFNBQVMsR0FBRztBQUNuQixRQUFJLGdCQUFnQixHQUFHLENBQUM7UUFDcEIsZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM5QixXQUFXLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDOztBQUV0RixRQUFJLElBQUksR0FBRztBQUNULGNBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDekIsY0FBUSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDOUIsY0FBUSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUN6QixjQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUM5QixXQUFLLEVBQUUsRUFBRTtLQUNWLENBQUM7O0FBRUYsUUFBSSxRQUFRLEdBQUcsQ0FBQztRQUNaLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDcEIsV0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUM5QixVQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTlCLFVBQUksU0FBUyxLQUFLLEdBQUcsSUFBSSxTQUFTLEtBQUssR0FBRyxJQUFJLFNBQVMsS0FBSyxHQUFHLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtBQUNyRixZQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFNUIsWUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQ3JCLGtCQUFRLEVBQUUsQ0FBQztTQUNaLE1BQU0sSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQzVCLHFCQUFXLEVBQUUsQ0FBQztTQUNmLE1BQU0sSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQzVCLGtCQUFRLEVBQUUsQ0FBQztBQUNYLHFCQUFXLEVBQUUsQ0FBQztTQUNmO09BQ0YsTUFBTTtBQUNMLGNBQU07T0FDUDtLQUNGOzs7QUFHRCxRQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFO0FBQ3BDLFVBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0tBQ25CO0FBQ0QsUUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsRUFBRTtBQUN2QyxVQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztLQUNuQjs7O0FBR0QsUUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ2xCLFVBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDOUIsY0FBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUM7T0FDOUY7QUFDRCxVQUFJLFdBQVcsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ2pDLGNBQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDO09BQ2hHO0tBQ0Y7O0FBRUQsV0FBTyxJQUFJLENBQUM7R0FDYjs7QUFFRCxTQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3pCLGNBQVUsRUFBRSxDQUFDO0dBQ2Q7O0FBRUQsU0FBTyxJQUFJLENBQUM7Q0FDYjs7Ozs7Ozs7OztxQkMzSGMsVUFBUyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUMvQyxNQUFJLFdBQVcsR0FBRyxJQUFJO01BQ2xCLGlCQUFpQixHQUFHLEtBQUs7TUFDekIsZ0JBQWdCLEdBQUcsS0FBSztNQUN4QixXQUFXLEdBQUcsQ0FBQyxDQUFDOztBQUVwQixTQUFPLFNBQVMsUUFBUTs7OzhCQUFHOzs7QUFDekIsVUFBSSxXQUFXLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtBQUNwQyxZQUFJLGlCQUFpQixFQUFFO0FBQ3JCLHFCQUFXLEVBQUUsQ0FBQztTQUNmLE1BQU07QUFDTCxxQkFBVyxHQUFHLEtBQUssQ0FBQztTQUNyQjs7OztBQUlELFlBQUksS0FBSyxHQUFHLFdBQVcsSUFBSSxPQUFPLEVBQUU7QUFDbEMsaUJBQU8sV0FBVyxDQUFDO1NBQ3BCOztBQUVELHdCQUFnQixHQUFHLElBQUksQ0FBQztPQUN6Qjs7QUFFRCxVQUFJLENBQUMsaUJBQWlCLEVBQUU7QUFDdEIsWUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3JCLHFCQUFXLEdBQUcsSUFBSSxDQUFDO1NBQ3BCOzs7O0FBSUQsWUFBSSxPQUFPLElBQUksS0FBSyxHQUFHLFdBQVcsRUFBRTtBQUNsQyxpQkFBTyxFQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ3ZCOztBQUVELHlCQUFpQixHQUFHLElBQUksQ0FBQzs7O09BRTFCOzs7O0tBSUY7R0FBQSxDQUFDO0NBQ0g7Ozs7Ozs7Ozs7OztBQzVDTSxTQUFTLGVBQWUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFO0FBQ2pELE1BQUksT0FBTyxPQUFPLEtBQUssVUFBVSxFQUFFO0FBQ2pDLFlBQVEsQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0dBQzdCLE1BQU0sSUFBSSxPQUFPLEVBQUU7QUFDbEIsU0FBSyxJQUFJLEtBQUksSUFBSSxPQUFPLEVBQUU7O0FBRXhCLFVBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsRUFBRTtBQUNoQyxnQkFBUSxDQUFDLEtBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFJLENBQUMsQ0FBQztPQUNoQztLQUNGO0dBQ0Y7QUFDRCxTQUFPLFFBQVEsQ0FBQztDQUNqQjs7OztBQ1pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG5nZXRIYXNoUGFyYW0gPSByZXF1aXJlICcuL3V0aWxzL2dldC1oYXNoLXBhcmFtJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICAjIHNpbmNlIHRoZSBtb2R1bGUgZXhwb3J0cyBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgd2UgbmVlZCB0byBmYWtlIGEgY2xhc3MgdmFyaWFibGUgYXMgYW4gaW5zdGFuY2UgdmFyaWFibGVcclxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuXHJcbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxyXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxyXG5cclxuICBpbml0OiAoQGFwcE9wdGlvbnMsIHVzaW5nSWZyYW1lID0gZmFsc2UpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXHJcbiAgICBAY2xpZW50LnNldEFwcE9wdGlvbnMgQGFwcE9wdGlvbnNcclxuXHJcbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkLCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXHJcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXHJcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXHJcblxyXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXHJcbiAgICAgIEBfY3JlYXRlSGlkZGVuQXBwKClcclxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcclxuICAgIEBjbGllbnQuY29ubmVjdCgpXHJcblxyXG4gICAgc2hhcmVkQ29udGVudElkID0gZ2V0SGFzaFBhcmFtIFwic2hhcmVkXCJcclxuICAgIGZpbGVQYXJhbXMgPSBnZXRIYXNoUGFyYW0gXCJmaWxlXCJcclxuICAgIGNvcHlQYXJhbXMgPSBnZXRIYXNoUGFyYW0gXCJjb3B5XCJcclxuICAgIGlmIHNoYXJlZENvbnRlbnRJZFxyXG4gICAgICBAY2xpZW50Lm9wZW5TaGFyZWRDb250ZW50IHNoYXJlZENvbnRlbnRJZFxyXG4gICAgZWxzZSBpZiBmaWxlUGFyYW1zXHJcbiAgICAgIFtwcm92aWRlck5hbWUsIHByb3ZpZGVyUGFyYW1zXSA9IGZpbGVQYXJhbXMuc3BsaXQgJzonXHJcbiAgICAgIEBjbGllbnQub3BlblByb3ZpZGVyRmlsZSBwcm92aWRlck5hbWUsIHByb3ZpZGVyUGFyYW1zXHJcbiAgICBlbHNlIGlmIGNvcHlQYXJhbXNcclxuICAgICAgQGNsaWVudC5vcGVuQ29waWVkRmlsZSBjb3B5UGFyYW1zXHJcblxyXG4gIF9jcmVhdGVIaWRkZW5BcHA6IC0+XHJcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcclxuICAgIEBfcmVuZGVyQXBwIGFuY2hvclxyXG5cclxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxyXG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcclxuIiwiLy8gU2VlOiBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvd2lraS9BUElcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvRE1QKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdLFxuICAgICAgY2hhbmdlLFxuICAgICAgb3BlcmF0aW9uO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IDE7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgb3BlcmF0aW9uID0gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wZXJhdGlvbiA9IDA7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goW29wZXJhdGlvbiwgY2hhbmdlLnZhbHVlXSk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvWE1MKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPGlucz4nKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICByZXQucHVzaCgnPGRlbD4nKTtcbiAgICB9XG5cbiAgICByZXQucHVzaChlc2NhcGVIVE1MKGNoYW5nZS52YWx1ZSkpO1xuXG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgcmV0LnB1c2goJzwvaW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8L2RlbD4nKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlSFRNTChzKSB7XG4gIGxldCBuID0gcztcbiAgbiA9IG4ucmVwbGFjZSgvJi9nLCAnJmFtcDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvPC9nLCAnJmx0OycpO1xuICBuID0gbi5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcblxuICByZXR1cm4gbjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERpZmYoKSB7fVxuXG5EaWZmLnByb3RvdHlwZSA9IHtcbiAgZGlmZihvbGRTdHJpbmcsIG5ld1N0cmluZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGNhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjaztcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGRvbmUodmFsdWUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayh1bmRlZmluZWQsIHZhbHVlKTsgfSwgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbG93IHN1YmNsYXNzZXMgdG8gbWFzc2FnZSB0aGUgaW5wdXQgcHJpb3IgdG8gcnVubmluZ1xuICAgIG9sZFN0cmluZyA9IHRoaXMuY2FzdElucHV0KG9sZFN0cmluZyk7XG4gICAgbmV3U3RyaW5nID0gdGhpcy5jYXN0SW5wdXQobmV3U3RyaW5nKTtcblxuICAgIG9sZFN0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShvbGRTdHJpbmcpKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLnJlbW92ZUVtcHR5KHRoaXMudG9rZW5pemUobmV3U3RyaW5nKSk7XG5cbiAgICBsZXQgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCwgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aDtcbiAgICBsZXQgZWRpdExlbmd0aCA9IDE7XG4gICAgbGV0IG1heEVkaXRMZW5ndGggPSBuZXdMZW4gKyBvbGRMZW47XG4gICAgbGV0IGJlc3RQYXRoID0gW3sgbmV3UG9zOiAtMSwgY29tcG9uZW50czogW10gfV07XG5cbiAgICAvLyBTZWVkIGVkaXRMZW5ndGggPSAwLCBpLmUuIHRoZSBjb250ZW50IHN0YXJ0cyB3aXRoIHRoZSBzYW1lIHZhbHVlc1xuICAgIGxldCBvbGRQb3MgPSB0aGlzLmV4dHJhY3RDb21tb24oYmVzdFBhdGhbMF0sIG5ld1N0cmluZywgb2xkU3RyaW5nLCAwKTtcbiAgICBpZiAoYmVzdFBhdGhbMF0ubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgIC8vIElkZW50aXR5IHBlciB0aGUgZXF1YWxpdHkgYW5kIHRva2VuaXplclxuICAgICAgcmV0dXJuIGRvbmUoW3t2YWx1ZTogbmV3U3RyaW5nLmpvaW4oJycpLCBjb3VudDogbmV3U3RyaW5nLmxlbmd0aH1dKTtcbiAgICB9XG5cbiAgICAvLyBNYWluIHdvcmtlciBtZXRob2QuIGNoZWNrcyBhbGwgcGVybXV0YXRpb25zIG9mIGEgZ2l2ZW4gZWRpdCBsZW5ndGggZm9yIGFjY2VwdGFuY2UuXG4gICAgZnVuY3Rpb24gZXhlY0VkaXRMZW5ndGgoKSB7XG4gICAgICBmb3IgKGxldCBkaWFnb25hbFBhdGggPSAtMSAqIGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCA8PSBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggKz0gMikge1xuICAgICAgICBsZXQgYmFzZVBhdGg7XG4gICAgICAgIGxldCBhZGRQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0sXG4gICAgICAgICAgICByZW1vdmVQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoICsgMV0sXG4gICAgICAgICAgICBvbGRQb3MgPSAocmVtb3ZlUGF0aCA/IHJlbW92ZVBhdGgubmV3UG9zIDogMCkgLSBkaWFnb25hbFBhdGg7XG4gICAgICAgIGlmIChhZGRQYXRoKSB7XG4gICAgICAgICAgLy8gTm8gb25lIGVsc2UgaXMgZ29pbmcgdG8gYXR0ZW1wdCB0byB1c2UgdGhpcyB2YWx1ZSwgY2xlYXIgaXRcbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjYW5BZGQgPSBhZGRQYXRoICYmIGFkZFBhdGgubmV3UG9zICsgMSA8IG5ld0xlbixcbiAgICAgICAgICAgIGNhblJlbW92ZSA9IHJlbW92ZVBhdGggJiYgMCA8PSBvbGRQb3MgJiYgb2xkUG9zIDwgb2xkTGVuO1xuICAgICAgICBpZiAoIWNhbkFkZCAmJiAhY2FuUmVtb3ZlKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBwYXRoIGlzIGEgdGVybWluYWwgdGhlbiBwcnVuZVxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWxlY3QgdGhlIGRpYWdvbmFsIHRoYXQgd2Ugd2FudCB0byBicmFuY2ggZnJvbS4gV2Ugc2VsZWN0IHRoZSBwcmlvclxuICAgICAgICAvLyBwYXRoIHdob3NlIHBvc2l0aW9uIGluIHRoZSBuZXcgc3RyaW5nIGlzIHRoZSBmYXJ0aGVzdCBmcm9tIHRoZSBvcmlnaW5cbiAgICAgICAgLy8gYW5kIGRvZXMgbm90IHBhc3MgdGhlIGJvdW5kcyBvZiB0aGUgZGlmZiBncmFwaFxuICAgICAgICBpZiAoIWNhbkFkZCB8fCAoY2FuUmVtb3ZlICYmIGFkZFBhdGgubmV3UG9zIDwgcmVtb3ZlUGF0aC5uZXdQb3MpKSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBjbG9uZVBhdGgocmVtb3ZlUGF0aCk7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBhZGRQYXRoOyAgIC8vIE5vIG5lZWQgdG8gY2xvbmUsIHdlJ3ZlIHB1bGxlZCBpdCBmcm9tIHRoZSBsaXN0XG4gICAgICAgICAgYmFzZVBhdGgubmV3UG9zKys7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHRydWUsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cblxuICAgICAgICBvbGRQb3MgPSBzZWxmLmV4dHJhY3RDb21tb24oYmFzZVBhdGgsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBkaWFnb25hbFBhdGgpO1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgaGl0IHRoZSBlbmQgb2YgYm90aCBzdHJpbmdzLCB0aGVuIHdlIGFyZSBkb25lXG4gICAgICAgIGlmIChiYXNlUGF0aC5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgICAgIHJldHVybiBkb25lKGJ1aWxkVmFsdWVzKHNlbGYsIGJhc2VQYXRoLmNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBzZWxmLnVzZUxvbmdlc3RUb2tlbikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSB0cmFjayB0aGlzIHBhdGggYXMgYSBwb3RlbnRpYWwgY2FuZGlkYXRlIGFuZCBjb250aW51ZS5cbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gYmFzZVBhdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWRpdExlbmd0aCsrO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm1zIHRoZSBsZW5ndGggb2YgZWRpdCBpdGVyYXRpb24uIElzIGEgYml0IGZ1Z2x5IGFzIHRoaXMgaGFzIHRvIHN1cHBvcnQgdGhlXG4gICAgLy8gc3luYyBhbmQgYXN5bmMgbW9kZSB3aGljaCBpcyBuZXZlciBmdW4uIExvb3BzIG92ZXIgZXhlY0VkaXRMZW5ndGggdW50aWwgYSB2YWx1ZVxuICAgIC8vIGlzIHByb2R1Y2VkLlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgKGZ1bmN0aW9uIGV4ZWMoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gVGhpcyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IHdlIHdhbnQgdG8gYmUgc2FmZS5cbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICAgIGlmIChlZGl0TGVuZ3RoID4gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFleGVjRWRpdExlbmd0aCgpKSB7XG4gICAgICAgICAgICBleGVjKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcbiAgICAgIH0oKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlIChlZGl0TGVuZ3RoIDw9IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgbGV0IHJldCA9IGV4ZWNFZGl0TGVuZ3RoKCk7XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHB1c2hDb21wb25lbnQoY29tcG9uZW50cywgYWRkZWQsIHJlbW92ZWQpIHtcbiAgICBsZXQgbGFzdCA9IGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdCAmJiBsYXN0LmFkZGVkID09PSBhZGRlZCAmJiBsYXN0LnJlbW92ZWQgPT09IHJlbW92ZWQpIHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gY2xvbmUgaGVyZSBhcyB0aGUgY29tcG9uZW50IGNsb25lIG9wZXJhdGlvbiBpcyBqdXN0XG4gICAgICAvLyBhcyBzaGFsbG93IGFycmF5IGNsb25lXG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV0gPSB7Y291bnQ6IGxhc3QuY291bnQgKyAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50cy5wdXNoKHtjb3VudDogMSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH0pO1xuICAgIH1cbiAgfSxcbiAgZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCkge1xuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLFxuICAgICAgICBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoLFxuICAgICAgICBuZXdQb3MgPSBiYXNlUGF0aC5uZXdQb3MsXG4gICAgICAgIG9sZFBvcyA9IG5ld1BvcyAtIGRpYWdvbmFsUGF0aCxcblxuICAgICAgICBjb21tb25Db3VudCA9IDA7XG4gICAgd2hpbGUgKG5ld1BvcyArIDEgPCBuZXdMZW4gJiYgb2xkUG9zICsgMSA8IG9sZExlbiAmJiB0aGlzLmVxdWFscyhuZXdTdHJpbmdbbmV3UG9zICsgMV0sIG9sZFN0cmluZ1tvbGRQb3MgKyAxXSkpIHtcbiAgICAgIG5ld1BvcysrO1xuICAgICAgb2xkUG9zKys7XG4gICAgICBjb21tb25Db3VudCsrO1xuICAgIH1cblxuICAgIGlmIChjb21tb25Db3VudCkge1xuICAgICAgYmFzZVBhdGguY29tcG9uZW50cy5wdXNoKHtjb3VudDogY29tbW9uQ291bnR9KTtcbiAgICB9XG5cbiAgICBiYXNlUGF0aC5uZXdQb3MgPSBuZXdQb3M7XG4gICAgcmV0dXJuIG9sZFBvcztcbiAgfSxcblxuICBlcXVhbHMobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XG4gIH0sXG4gIHJlbW92ZUVtcHR5KGFycmF5KSB7XG4gICAgbGV0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSkge1xuICAgICAgICByZXQucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGNhc3RJbnB1dCh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgdG9rZW5pemUodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUuc3BsaXQoJycpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBidWlsZFZhbHVlcyhkaWZmLCBjb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgdXNlTG9uZ2VzdFRva2VuKSB7XG4gIGxldCBjb21wb25lbnRQb3MgPSAwLFxuICAgICAgY29tcG9uZW50TGVuID0gY29tcG9uZW50cy5sZW5ndGgsXG4gICAgICBuZXdQb3MgPSAwLFxuICAgICAgb2xkUG9zID0gMDtcblxuICBmb3IgKDsgY29tcG9uZW50UG9zIDwgY29tcG9uZW50TGVuOyBjb21wb25lbnRQb3MrKykge1xuICAgIGxldCBjb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgaWYgKCFjb21wb25lbnQucmVtb3ZlZCkge1xuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQgJiYgdXNlTG9uZ2VzdFRva2VuKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCk7XG4gICAgICAgIHZhbHVlID0gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlLCBpKSB7XG4gICAgICAgICAgbGV0IG9sZFZhbHVlID0gb2xkU3RyaW5nW29sZFBvcyArIGldO1xuICAgICAgICAgIHJldHVybiBvbGRWYWx1ZS5sZW5ndGggPiB2YWx1ZS5sZW5ndGggPyBvbGRWYWx1ZSA6IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb21wb25lbnQudmFsdWUgPSB2YWx1ZS5qb2luKCcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCkuam9pbignJyk7XG4gICAgICB9XG4gICAgICBuZXdQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuXG4gICAgICAvLyBDb21tb24gY2FzZVxuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQpIHtcbiAgICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50LnZhbHVlID0gb2xkU3RyaW5nLnNsaWNlKG9sZFBvcywgb2xkUG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIG9sZFBvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIFJldmVyc2UgYWRkIGFuZCByZW1vdmUgc28gcmVtb3ZlcyBhcmUgb3V0cHV0IGZpcnN0IHRvIG1hdGNoIGNvbW1vbiBjb252ZW50aW9uXG4gICAgICAvLyBUaGUgZGlmZmluZyBhbGdvcml0aG0gaXMgdGllZCB0byBhZGQgdGhlbiByZW1vdmUgb3V0cHV0IGFuZCB0aGlzIGlzIHRoZSBzaW1wbGVzdFxuICAgICAgLy8gcm91dGUgdG8gZ2V0IHRoZSBkZXNpcmVkIG91dHB1dCB3aXRoIG1pbmltYWwgb3ZlcmhlYWQuXG4gICAgICBpZiAoY29tcG9uZW50UG9zICYmIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0uYWRkZWQpIHtcbiAgICAgICAgbGV0IHRtcCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV07XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0gPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zXSA9IHRtcDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgaGFuZGxlIGZvciB3aGVuIG9uZSB0ZXJtaW5hbCBpcyBpZ25vcmVkLiBGb3IgdGhpcyBjYXNlIHdlIG1lcmdlIHRoZVxuICAvLyB0ZXJtaW5hbCBpbnRvIHRoZSBwcmlvciBzdHJpbmcgYW5kIGRyb3AgdGhlIGNoYW5nZS5cbiAgbGV0IGxhc3RDb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDFdO1xuICBpZiAoKGxhc3RDb21wb25lbnQuYWRkZWQgfHwgbGFzdENvbXBvbmVudC5yZW1vdmVkKSAmJiBkaWZmLmVxdWFscygnJywgbGFzdENvbXBvbmVudC52YWx1ZSkpIHtcbiAgICBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDJdLnZhbHVlICs9IGxhc3RDb21wb25lbnQudmFsdWU7XG4gICAgY29tcG9uZW50cy5wb3AoKTtcbiAgfVxuXG4gIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZVBhdGgocGF0aCkge1xuICByZXR1cm4geyBuZXdQb3M6IHBhdGgubmV3UG9zLCBjb21wb25lbnRzOiBwYXRoLmNvbXBvbmVudHMuc2xpY2UoMCkgfTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBjb25zdCBjaGFyYWN0ZXJEaWZmID0gbmV3IERpZmYoKTtcbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ2hhcnMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjaGFyYWN0ZXJEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNzc0RpZmYgPSBuZXcgRGlmZigpO1xuY3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFt7fTo7LF18XFxzKykvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ3NzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gY3NzRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2xpbmVEaWZmfSBmcm9tICcuL2xpbmUnO1xuXG5jb25zdCBvYmplY3RQcm90b3R5cGVUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cblxuZXhwb3J0IGNvbnN0IGpzb25EaWZmID0gbmV3IERpZmYoKTtcbi8vIERpc2NyaW1pbmF0ZSBiZXR3ZWVuIHR3byBsaW5lcyBvZiBwcmV0dHktcHJpbnRlZCwgc2VyaWFsaXplZCBKU09OIHdoZXJlIG9uZSBvZiB0aGVtIGhhcyBhXG4vLyBkYW5nbGluZyBjb21tYSBhbmQgdGhlIG90aGVyIGRvZXNuJ3QuIFR1cm5zIG91dCBpbmNsdWRpbmcgdGhlIGRhbmdsaW5nIGNvbW1hIHlpZWxkcyB0aGUgbmljZXN0IG91dHB1dDpcbmpzb25EaWZmLnVzZUxvbmdlc3RUb2tlbiA9IHRydWU7XG5cbmpzb25EaWZmLnRva2VuaXplID0gbGluZURpZmYudG9rZW5pemU7XG5qc29uRGlmZi5jYXN0SW5wdXQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkoY2Fub25pY2FsaXplKHZhbHVlKSwgdW5kZWZpbmVkLCAnICAnKTtcbn07XG5qc29uRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gRGlmZi5wcm90b3R5cGUuZXF1YWxzKGxlZnQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJyksIHJpZ2h0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmSnNvbihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spIHsgcmV0dXJuIGpzb25EaWZmLmRpZmYob2xkT2JqLCBuZXdPYmosIGNhbGxiYWNrKTsgfVxuXG5cbi8vIFRoaXMgZnVuY3Rpb24gaGFuZGxlcyB0aGUgcHJlc2VuY2Ugb2YgY2lyY3VsYXIgcmVmZXJlbmNlcyBieSBiYWlsaW5nIG91dCB3aGVuIGVuY291bnRlcmluZyBhblxuLy8gb2JqZWN0IHRoYXQgaXMgYWxyZWFkeSBvbiB0aGUgXCJzdGFja1wiIG9mIGl0ZW1zIGJlaW5nIHByb2Nlc3NlZC5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemUob2JqLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjaykge1xuICBzdGFjayA9IHN0YWNrIHx8IFtdO1xuICByZXBsYWNlbWVudFN0YWNrID0gcmVwbGFjZW1lbnRTdGFjayB8fCBbXTtcblxuICBsZXQgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgc3RhY2subGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc3RhY2tbaV0gPT09IG9iaikge1xuICAgICAgcmV0dXJuIHJlcGxhY2VtZW50U3RhY2tbaV07XG4gICAgfVxuICB9XG5cbiAgbGV0IGNhbm9uaWNhbGl6ZWRPYmo7XG5cbiAgaWYgKCdbb2JqZWN0IEFycmF5XScgPT09IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nLmNhbGwob2JqKSkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gbmV3IEFycmF5KG9iai5sZW5ndGgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucHVzaChjYW5vbmljYWxpemVkT2JqKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2ldID0gY2Fub25pY2FsaXplKG9ialtpXSwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spO1xuICAgIH1cbiAgICBzdGFjay5wb3AoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiAhPT0gbnVsbCkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0ge307XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGxldCBzb3J0ZWRLZXlzID0gW10sXG4gICAgICAgIGtleTtcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc29ydGVkS2V5cy5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRlZEtleXMuc29ydCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBzb3J0ZWRLZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBrZXkgPSBzb3J0ZWRLZXlzW2ldO1xuICAgICAgY2Fub25pY2FsaXplZE9ialtrZXldID0gY2Fub25pY2FsaXplKG9ialtrZXldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IG9iajtcbiAgfVxuICByZXR1cm4gY2Fub25pY2FsaXplZE9iajtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG5leHBvcnQgY29uc3QgbGluZURpZmYgPSBuZXcgRGlmZigpO1xubGluZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBsZXQgcmV0TGluZXMgPSBbXSxcbiAgICAgIGxpbmVzQW5kTmV3bGluZXMgPSB2YWx1ZS5zcGxpdCgvKFxcbnxcXHJcXG4pLyk7XG5cbiAgLy8gSWdub3JlIHRoZSBmaW5hbCBlbXB0eSB0b2tlbiB0aGF0IG9jY3VycyBpZiB0aGUgc3RyaW5nIGVuZHMgd2l0aCBhIG5ldyBsaW5lXG4gIGlmICghbGluZXNBbmROZXdsaW5lc1tsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgbGluZXNBbmROZXdsaW5lcy5wb3AoKTtcbiAgfVxuXG4gIC8vIE1lcmdlIHRoZSBjb250ZW50IGFuZCBsaW5lIHNlcGFyYXRvcnMgaW50byBzaW5nbGUgdG9rZW5zXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXNBbmROZXdsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBsaW5lID0gbGluZXNBbmROZXdsaW5lc1tpXTtcblxuICAgIGlmIChpICUgMiAmJiAhdGhpcy5vcHRpb25zLm5ld2xpbmVJc1Rva2VuKSB7XG4gICAgICByZXRMaW5lc1tyZXRMaW5lcy5sZW5ndGggLSAxXSArPSBsaW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpIHtcbiAgICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgfVxuICAgICAgcmV0TGluZXMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0TGluZXM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gbGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG5leHBvcnQgZnVuY3Rpb24gZGlmZlRyaW1tZWRMaW5lcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgbGV0IG9wdGlvbnMgPSBnZW5lcmF0ZU9wdGlvbnMoY2FsbGJhY2ssIHtpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlfSk7XG4gIHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cblxuZXhwb3J0IGNvbnN0IHNlbnRlbmNlRGlmZiA9IG5ldyBEaWZmKCk7XG5zZW50ZW5jZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhcXFMuKz9bLiE/XSkoPz1cXHMrfCQpLyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZlNlbnRlbmNlcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIHNlbnRlbmNlRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG4vLyBCYXNlZCBvbiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MYXRpbl9zY3JpcHRfaW5fVW5pY29kZVxuLy9cbi8vIFJhbmdlcyBhbmQgZXhjZXB0aW9uczpcbi8vIExhdGluLTEgU3VwcGxlbWVudCwgMDA4MOKAkzAwRkZcbi8vICAtIFUrMDBENyAgw5cgTXVsdGlwbGljYXRpb24gc2lnblxuLy8gIC0gVSswMEY3ICDDtyBEaXZpc2lvbiBzaWduXG4vLyBMYXRpbiBFeHRlbmRlZC1BLCAwMTAw4oCTMDE3RlxuLy8gTGF0aW4gRXh0ZW5kZWQtQiwgMDE4MOKAkzAyNEZcbi8vIElQQSBFeHRlbnNpb25zLCAwMjUw4oCTMDJBRlxuLy8gU3BhY2luZyBNb2RpZmllciBMZXR0ZXJzLCAwMkIw4oCTMDJGRlxuLy8gIC0gVSswMkM3ICDLhyAmIzcxMTsgIENhcm9uXG4vLyAgLSBVKzAyRDggIMuYICYjNzI4OyAgQnJldmVcbi8vICAtIFUrMDJEOSAgy5kgJiM3Mjk7ICBEb3QgQWJvdmVcbi8vICAtIFUrMDJEQSAgy5ogJiM3MzA7ICBSaW5nIEFib3ZlXG4vLyAgLSBVKzAyREIgIMubICYjNzMxOyAgT2dvbmVrXG4vLyAgLSBVKzAyREMgIMucICYjNzMyOyAgU21hbGwgVGlsZGVcbi8vICAtIFUrMDJERCAgy50gJiM3MzM7ICBEb3VibGUgQWN1dGUgQWNjZW50XG4vLyBMYXRpbiBFeHRlbmRlZCBBZGRpdGlvbmFsLCAxRTAw4oCTMUVGRlxuY29uc3QgZXh0ZW5kZWRXb3JkQ2hhcnMgPSAvXlthLXpBLVpcXHV7QzB9LVxcdXtGRn1cXHV7RDh9LVxcdXtGNn1cXHV7Rjh9LVxcdXsyQzZ9XFx1ezJDOH0tXFx1ezJEN31cXHV7MkRFfS1cXHV7MkZGfVxcdXsxRTAwfS1cXHV7MUVGRn1dKyQvdTtcblxuY29uc3QgcmVXaGl0ZXNwYWNlID0gL1xcUy87XG5cbmV4cG9ydCBjb25zdCB3b3JkRGlmZiA9IG5ldyBEaWZmKCk7XG53b3JkRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgfHwgKHRoaXMub3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlICYmICFyZVdoaXRlc3BhY2UudGVzdChsZWZ0KSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QocmlnaHQpKTtcbn07XG53b3JkRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCB0b2tlbnMgPSB2YWx1ZS5zcGxpdCgvKFxccyt8XFxiKS8pO1xuXG4gIC8vIEpvaW4gdGhlIGJvdW5kYXJ5IHNwbGl0cyB0aGF0IHdlIGRvIG5vdCBjb25zaWRlciB0byBiZSBib3VuZGFyaWVzLiBUaGlzIGlzIHByaW1hcmlseSB0aGUgZXh0ZW5kZWQgTGF0aW4gY2hhcmFjdGVyIHNldC5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgLy8gSWYgd2UgaGF2ZSBhbiBlbXB0eSBzdHJpbmcgaW4gdGhlIG5leHQgZmllbGQgYW5kIHdlIGhhdmUgb25seSB3b3JkIGNoYXJzIGJlZm9yZSBhbmQgYWZ0ZXIsIG1lcmdlXG4gICAgaWYgKCF0b2tlbnNbaSArIDFdICYmIHRva2Vuc1tpICsgMl1cbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpXSlcbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpICsgMl0pKSB7XG4gICAgICB0b2tlbnNbaV0gKz0gdG9rZW5zW2kgKyAyXTtcbiAgICAgIHRva2Vucy5zcGxpY2UoaSArIDEsIDIpO1xuICAgICAgaS0tO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b2tlbnM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZXb3Jkc1dpdGhTcGFjZShvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTtcbn1cbiIsIi8qIFNlZSBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zIG9mIHVzZSAqL1xuXG4vKlxuICogVGV4dCBkaWZmIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIFRoaXMgbGlicmFyeSBzdXBwb3J0cyB0aGUgZm9sbG93aW5nIEFQSVM6XG4gKiBKc0RpZmYuZGlmZkNoYXJzOiBDaGFyYWN0ZXIgYnkgY2hhcmFjdGVyIGRpZmZcbiAqIEpzRGlmZi5kaWZmV29yZHM6IFdvcmQgKGFzIGRlZmluZWQgYnkgXFxiIHJlZ2V4KSBkaWZmIHdoaWNoIGlnbm9yZXMgd2hpdGVzcGFjZVxuICogSnNEaWZmLmRpZmZMaW5lczogTGluZSBiYXNlZCBkaWZmXG4gKlxuICogSnNEaWZmLmRpZmZDc3M6IERpZmYgdGFyZ2V0ZWQgYXQgQ1NTIGNvbnRlbnRcbiAqXG4gKiBUaGVzZSBtZXRob2RzIGFyZSBiYXNlZCBvbiB0aGUgaW1wbGVtZW50YXRpb24gcHJvcG9zZWQgaW5cbiAqIFwiQW4gTyhORCkgRGlmZmVyZW5jZSBBbGdvcml0aG0gYW5kIGl0cyBWYXJpYXRpb25zXCIgKE15ZXJzLCAxOTg2KS5cbiAqIGh0dHA6Ly9jaXRlc2VlcnguaXN0LnBzdS5lZHUvdmlld2RvYy9zdW1tYXJ5P2RvaT0xMC4xLjEuNC42OTI3XG4gKi9cbmltcG9ydCBEaWZmIGZyb20gJy4vZGlmZi9iYXNlJztcbmltcG9ydCB7ZGlmZkNoYXJzfSBmcm9tICcuL2RpZmYvY2hhcmFjdGVyJztcbmltcG9ydCB7ZGlmZldvcmRzLCBkaWZmV29yZHNXaXRoU3BhY2V9IGZyb20gJy4vZGlmZi93b3JkJztcbmltcG9ydCB7ZGlmZkxpbmVzLCBkaWZmVHJpbW1lZExpbmVzfSBmcm9tICcuL2RpZmYvbGluZSc7XG5pbXBvcnQge2RpZmZTZW50ZW5jZXN9IGZyb20gJy4vZGlmZi9zZW50ZW5jZSc7XG5cbmltcG9ydCB7ZGlmZkNzc30gZnJvbSAnLi9kaWZmL2Nzcyc7XG5pbXBvcnQge2RpZmZKc29uLCBjYW5vbmljYWxpemV9IGZyb20gJy4vZGlmZi9qc29uJztcblxuaW1wb3J0IHthcHBseVBhdGNoLCBhcHBseVBhdGNoZXN9IGZyb20gJy4vcGF0Y2gvYXBwbHknO1xuaW1wb3J0IHtwYXJzZVBhdGNofSBmcm9tICcuL3BhdGNoL3BhcnNlJztcbmltcG9ydCB7c3RydWN0dXJlZFBhdGNoLCBjcmVhdGVUd29GaWxlc1BhdGNoLCBjcmVhdGVQYXRjaH0gZnJvbSAnLi9wYXRjaC9jcmVhdGUnO1xuXG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9ETVB9IGZyb20gJy4vY29udmVydC9kbXAnO1xuaW1wb3J0IHtjb252ZXJ0Q2hhbmdlc1RvWE1MfSBmcm9tICcuL2NvbnZlcnQveG1sJztcblxuZXhwb3J0IHtcbiAgRGlmZixcblxuICBkaWZmQ2hhcnMsXG4gIGRpZmZXb3JkcyxcbiAgZGlmZldvcmRzV2l0aFNwYWNlLFxuICBkaWZmTGluZXMsXG4gIGRpZmZUcmltbWVkTGluZXMsXG4gIGRpZmZTZW50ZW5jZXMsXG5cbiAgZGlmZkNzcyxcbiAgZGlmZkpzb24sXG5cbiAgc3RydWN0dXJlZFBhdGNoLFxuICBjcmVhdGVUd29GaWxlc1BhdGNoLFxuICBjcmVhdGVQYXRjaCxcbiAgYXBwbHlQYXRjaCxcbiAgYXBwbHlQYXRjaGVzLFxuICBwYXJzZVBhdGNoLFxuICBjb252ZXJ0Q2hhbmdlc1RvRE1QLFxuICBjb252ZXJ0Q2hhbmdlc1RvWE1MLFxuICBjYW5vbmljYWxpemVcbn07XG4iLCJpbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGFyc2UnO1xuaW1wb3J0IGRpc3RhbmNlSXRlcmF0b3IgZnJvbSAnLi4vdXRpbC9kaXN0YW5jZS1pdGVyYXRvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoKHNvdXJjZSwgdW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHVuaURpZmYpKSB7XG4gICAgaWYgKHVuaURpZmYubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcHBseVBhdGNoIG9ubHkgd29ya3Mgd2l0aCBhIHNpbmdsZSBpbnB1dC4nKTtcbiAgICB9XG5cbiAgICB1bmlEaWZmID0gdW5pRGlmZlswXTtcbiAgfVxuXG4gIC8vIEFwcGx5IHRoZSBkaWZmIHRvIHRoZSBpbnB1dFxuICBsZXQgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpLFxuICAgICAgaHVua3MgPSB1bmlEaWZmLmh1bmtzLFxuXG4gICAgICBjb21wYXJlTGluZSA9IG9wdGlvbnMuY29tcGFyZUxpbmUgfHwgKChsaW5lTnVtYmVyLCBsaW5lLCBvcGVyYXRpb24sIHBhdGNoQ29udGVudCkgPT4gbGluZSA9PT0gcGF0Y2hDb250ZW50KSxcbiAgICAgIGVycm9yQ291bnQgPSAwLFxuICAgICAgZnV6ekZhY3RvciA9IG9wdGlvbnMuZnV6ekZhY3RvciB8fCAwLFxuICAgICAgbWluTGluZSA9IDAsXG4gICAgICBvZmZzZXQgPSAwLFxuXG4gICAgICByZW1vdmVFT0ZOTCxcbiAgICAgIGFkZEVPRk5MO1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGh1bmsgZXhhY3RseSBmaXRzIG9uIHRoZSBwcm92aWRlZCBsb2NhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gaHVua0ZpdHMoaHVuaywgdG9Qb3MpIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnIHx8IG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIC8vIENvbnRleHQgc2FuaXR5IGNoZWNrXG4gICAgICAgIGlmICghY29tcGFyZUxpbmUodG9Qb3MgKyAxLCBsaW5lc1t0b1Bvc10sIG9wZXJhdGlvbiwgY29udGVudCkpIHtcbiAgICAgICAgICBlcnJvckNvdW50Kys7XG5cbiAgICAgICAgICBpZiAoZXJyb3JDb3VudCA+IGZ1enpGYWN0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFNlYXJjaCBiZXN0IGZpdCBvZmZzZXRzIGZvciBlYWNoIGh1bmsgYmFzZWQgb24gdGhlIHByZXZpb3VzIG9uZXNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBodW5rID0gaHVua3NbaV0sXG4gICAgICAgIG1heExpbmUgPSBsaW5lcy5sZW5ndGggLSBodW5rLm9sZExpbmVzLFxuICAgICAgICBsb2NhbE9mZnNldCA9IDAsXG4gICAgICAgIHRvUG9zID0gb2Zmc2V0ICsgaHVuay5vbGRTdGFydCAtIDE7XG5cbiAgICBsZXQgaXRlcmF0b3IgPSBkaXN0YW5jZUl0ZXJhdG9yKHRvUG9zLCBtaW5MaW5lLCBtYXhMaW5lKTtcblxuICAgIGZvciAoOyBsb2NhbE9mZnNldCAhPT0gdW5kZWZpbmVkOyBsb2NhbE9mZnNldCA9IGl0ZXJhdG9yKCkpIHtcbiAgICAgIGlmIChodW5rRml0cyhodW5rLCB0b1BvcyArIGxvY2FsT2Zmc2V0KSkge1xuICAgICAgICBodW5rLm9mZnNldCA9IG9mZnNldCArPSBsb2NhbE9mZnNldDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxvY2FsT2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG93ZXIgdGV4dCBsaW1pdCB0byBlbmQgb2YgdGhlIGN1cnJlbnQgaHVuaywgc28gbmV4dCBvbmVzIGRvbid0IHRyeVxuICAgIC8vIHRvIGZpdCBvdmVyIGFscmVhZHkgcGF0Y2hlZCB0ZXh0XG4gICAgbWluTGluZSA9IGh1bmsub2Zmc2V0ICsgaHVuay5vbGRTdGFydCArIGh1bmsub2xkTGluZXM7XG4gIH1cblxuICAvLyBBcHBseSBwYXRjaCBodW5rc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgdG9Qb3MgPSBodW5rLm9mZnNldCArIGh1bmsubmV3U3RhcnQgLSAxO1xuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBsZXQgbGluZSA9IGh1bmsubGluZXNbal0sXG4gICAgICAgICAgb3BlcmF0aW9uID0gbGluZVswXSxcbiAgICAgICAgICBjb250ZW50ID0gbGluZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDEpO1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgbGluZXMuc3BsaWNlKHRvUG9zLCAwLCBjb250ZW50KTtcbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgbGV0IHByZXZpb3VzT3BlcmF0aW9uID0gaHVuay5saW5lc1tqIC0gMV0gPyBodW5rLmxpbmVzW2ogLSAxXVswXSA6IG51bGw7XG4gICAgICAgIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgcmVtb3ZlRU9GTkwgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICBhZGRFT0ZOTCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgRU9GTkwgaW5zZXJ0aW9uL3JlbW92YWxcbiAgaWYgKHJlbW92ZUVPRk5MKSB7XG4gICAgd2hpbGUgKCFsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSkge1xuICAgICAgbGluZXMucG9wKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFkZEVPRk5MKSB7XG4gICAgbGluZXMucHVzaCgnJyk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vLyBXcmFwcGVyIHRoYXQgc3VwcG9ydHMgbXVsdGlwbGUgZmlsZSBwYXRjaGVzIHZpYSBjYWxsYmFja3MuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzKHVuaURpZmYsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgbGV0IGN1cnJlbnRJbmRleCA9IDA7XG4gIGZ1bmN0aW9uIHByb2Nlc3NJbmRleCgpIHtcbiAgICBsZXQgaW5kZXggPSB1bmlEaWZmW2N1cnJlbnRJbmRleCsrXTtcbiAgICBpZiAoIWluZGV4KSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIG9wdGlvbnMubG9hZEZpbGUoaW5kZXgsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZShlcnIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgdXBkYXRlZENvbnRlbnQgPSBhcHBseVBhdGNoKGRhdGEsIGluZGV4LCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMucGF0Y2hlZChpbmRleCwgdXBkYXRlZENvbnRlbnQpO1xuXG4gICAgICBzZXRUaW1lb3V0KHByb2Nlc3NJbmRleCwgMCk7XG4gICAgfSk7XG4gIH1cbiAgcHJvY2Vzc0luZGV4KCk7XG59XG4iLCJpbXBvcnQge2RpZmZMaW5lc30gZnJvbSAnLi4vZGlmZi9saW5lJztcblxuZXhwb3J0IGZ1bmN0aW9uIHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0geyBjb250ZXh0OiA0IH07XG4gIH1cblxuICBjb25zdCBkaWZmID0gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyKTtcbiAgZGlmZi5wdXNoKHt2YWx1ZTogJycsIGxpbmVzOiBbXX0pOyAgIC8vIEFwcGVuZCBhbiBlbXB0eSB2YWx1ZSB0byBtYWtlIGNsZWFudXAgZWFzaWVyXG5cbiAgZnVuY3Rpb24gY29udGV4dExpbmVzKGxpbmVzKSB7XG4gICAgcmV0dXJuIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkgeyByZXR1cm4gJyAnICsgZW50cnk7IH0pO1xuICB9XG5cbiAgbGV0IGh1bmtzID0gW107XG4gIGxldCBvbGRSYW5nZVN0YXJ0ID0gMCwgbmV3UmFuZ2VTdGFydCA9IDAsIGN1clJhbmdlID0gW10sXG4gICAgICBvbGRMaW5lID0gMSwgbmV3TGluZSA9IDE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBkaWZmW2ldLFxuICAgICAgICAgIGxpbmVzID0gY3VycmVudC5saW5lcyB8fCBjdXJyZW50LnZhbHVlLnJlcGxhY2UoL1xcbiQvLCAnJykuc3BsaXQoJ1xcbicpO1xuICAgIGN1cnJlbnQubGluZXMgPSBsaW5lcztcblxuICAgIGlmIChjdXJyZW50LmFkZGVkIHx8IGN1cnJlbnQucmVtb3ZlZCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBwcmV2aW91cyBjb250ZXh0LCBzdGFydCB3aXRoIHRoYXRcbiAgICAgIGlmICghb2xkUmFuZ2VTdGFydCkge1xuICAgICAgICBjb25zdCBwcmV2ID0gZGlmZltpIC0gMV07XG4gICAgICAgIG9sZFJhbmdlU3RhcnQgPSBvbGRMaW5lO1xuICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gbmV3TGluZTtcblxuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgIGN1clJhbmdlID0gb3B0aW9ucy5jb250ZXh0ID4gMCA/IGNvbnRleHRMaW5lcyhwcmV2LmxpbmVzLnNsaWNlKC1vcHRpb25zLmNvbnRleHQpKSA6IFtdO1xuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE91dHB1dCBvdXIgY2hhbmdlc1xuICAgICAgY3VyUmFuZ2UucHVzaCguLi4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiAoY3VycmVudC5hZGRlZCA/ICcrJyA6ICctJykgKyBlbnRyeTtcbiAgICAgIH0pKTtcblxuICAgICAgLy8gVHJhY2sgdGhlIHVwZGF0ZWQgZmlsZSBwb3NpdGlvblxuICAgICAgaWYgKGN1cnJlbnQuYWRkZWQpIHtcbiAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWRlbnRpY2FsIGNvbnRleHQgbGluZXMuIFRyYWNrIGxpbmUgY2hhbmdlc1xuICAgICAgaWYgKG9sZFJhbmdlU3RhcnQpIHtcbiAgICAgICAgLy8gQ2xvc2Ugb3V0IGFueSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG91dHB1dCAob3Igam9pbiBvdmVybGFwcGluZylcbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQgKiAyICYmIGkgPCBkaWZmLmxlbmd0aCAtIDIpIHtcbiAgICAgICAgICAvLyBPdmVybGFwcGluZ1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGVuZCB0aGUgcmFuZ2UgYW5kIG91dHB1dFxuICAgICAgICAgIGxldCBjb250ZXh0U2l6ZSA9IE1hdGgubWluKGxpbmVzLmxlbmd0aCwgb3B0aW9ucy5jb250ZXh0KTtcbiAgICAgICAgICBjdXJSYW5nZS5wdXNoKC4uLiBjb250ZXh0TGluZXMobGluZXMuc2xpY2UoMCwgY29udGV4dFNpemUpKSk7XG5cbiAgICAgICAgICBsZXQgaHVuayA9IHtcbiAgICAgICAgICAgIG9sZFN0YXJ0OiBvbGRSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgb2xkTGluZXM6IChvbGRMaW5lIC0gb2xkUmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIG5ld1N0YXJ0OiBuZXdSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgbmV3TGluZXM6IChuZXdMaW5lIC0gbmV3UmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIGxpbmVzOiBjdXJSYW5nZVxuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGkgPj0gZGlmZi5sZW5ndGggLSAyICYmIGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIEVPRiBpcyBpbnNpZGUgdGhpcyBodW5rXG4gICAgICAgICAgICBsZXQgb2xkRU9GTmV3bGluZSA9ICgvXFxuJC8udGVzdChvbGRTdHIpKTtcbiAgICAgICAgICAgIGxldCBuZXdFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG5ld1N0cikpO1xuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PSAwICYmICFvbGRFT0ZOZXdsaW5lKSB7XG4gICAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZTogb2xkIGhhcyBubyBlb2wgYW5kIG5vIHRyYWlsaW5nIGNvbnRleHQ7IG5vLW5sIGNhbiBlbmQgdXAgYmVmb3JlIGFkZHNcbiAgICAgICAgICAgICAgY3VyUmFuZ2Uuc3BsaWNlKGh1bmsub2xkTGluZXMsIDAsICdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW9sZEVPRk5ld2xpbmUgfHwgIW5ld0VPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgY3VyUmFuZ2UucHVzaCgnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGh1bmtzLnB1c2goaHVuayk7XG5cbiAgICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBjdXJSYW5nZSA9IFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb2xkRmlsZU5hbWU6IG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZTogbmV3RmlsZU5hbWUsXG4gICAgb2xkSGVhZGVyOiBvbGRIZWFkZXIsIG5ld0hlYWRlcjogbmV3SGVhZGVyLFxuICAgIGh1bmtzOiBodW5rc1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHdvRmlsZXNQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBjb25zdCBkaWZmID0gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKTtcblxuICBjb25zdCByZXQgPSBbXTtcbiAgaWYgKG9sZEZpbGVOYW1lID09IG5ld0ZpbGVOYW1lKSB7XG4gICAgcmV0LnB1c2goJ0luZGV4OiAnICsgb2xkRmlsZU5hbWUpO1xuICB9XG4gIHJldC5wdXNoKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7XG4gIHJldC5wdXNoKCctLS0gJyArIGRpZmYub2xkRmlsZU5hbWUgKyAodHlwZW9mIGRpZmYub2xkSGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm9sZEhlYWRlcikpO1xuICByZXQucHVzaCgnKysrICcgKyBkaWZmLm5ld0ZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm5ld0hlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5uZXdIZWFkZXIpKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmYuaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBodW5rID0gZGlmZi5odW5rc1tpXTtcbiAgICByZXQucHVzaChcbiAgICAgICdAQCAtJyArIGh1bmsub2xkU3RhcnQgKyAnLCcgKyBodW5rLm9sZExpbmVzXG4gICAgICArICcgKycgKyBodW5rLm5ld1N0YXJ0ICsgJywnICsgaHVuay5uZXdMaW5lc1xuICAgICAgKyAnIEBAJ1xuICAgICk7XG4gICAgcmV0LnB1c2guYXBwbHkocmV0LCBodW5rLmxpbmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXQuam9pbignXFxuJykgKyAnXFxuJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGNyZWF0ZVR3b0ZpbGVzUGF0Y2goZmlsZU5hbWUsIGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUGF0Y2godW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCBkaWZmc3RyID0gdW5pRGlmZi5zcGxpdCgnXFxuJyksXG4gICAgICBsaXN0ID0gW10sXG4gICAgICBpID0gMDtcblxuICBmdW5jdGlvbiBwYXJzZUluZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHt9O1xuICAgIGxpc3QucHVzaChpbmRleCk7XG5cbiAgICAvLyBQYXJzZSBkaWZmIG1ldGFkYXRhXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICAvLyBGaWxlIGhlYWRlciBmb3VuZCwgZW5kIHBhcnNpbmcgZGlmZiBtZXRhZGF0YVxuICAgICAgaWYgKC9eKFxcLVxcLVxcLXxcXCtcXCtcXCt8QEApXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBEaWZmIGluZGV4XG4gICAgICBsZXQgaGVhZGVyID0gKC9eKD86SW5kZXg6fGRpZmYoPzogLXIgXFx3KykrKVxccysoLis/KVxccyokLykuZXhlYyhsaW5lKTtcbiAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgaW5kZXguaW5kZXggPSBoZWFkZXJbMV07XG4gICAgICB9XG5cbiAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBmaWxlIGhlYWRlcnMgaWYgdGhleSBhcmUgZGVmaW5lZC4gVW5pZmllZCBkaWZmIHJlcXVpcmVzIHRoZW0sIGJ1dFxuICAgIC8vIHRoZXJlJ3Mgbm8gdGVjaG5pY2FsIGlzc3VlcyB0byBoYXZlIGFuIGlzb2xhdGVkIGh1bmsgd2l0aG91dCBmaWxlIGhlYWRlclxuICAgIHBhcnNlRmlsZUhlYWRlcihpbmRleCk7XG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGh1bmtzXG4gICAgaW5kZXguaHVua3MgPSBbXTtcblxuICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgIGxldCBsaW5lID0gZGlmZnN0cltpXTtcblxuICAgICAgaWYgKC9eKEluZGV4OnxkaWZmfFxcLVxcLVxcLXxcXCtcXCtcXCspXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmICgvXkBALy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGluZGV4Lmh1bmtzLnB1c2gocGFyc2VIdW5rKCkpO1xuICAgICAgfSBlbHNlIGlmIChsaW5lICYmIG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICAgIC8vIElnbm9yZSB1bmV4cGVjdGVkIGNvbnRlbnQgdW5sZXNzIGluIHN0cmljdCBtb2RlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsaW5lICcgKyAoaSArIDEpICsgJyAnICsgSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyB0aGUgLS0tIGFuZCArKysgaGVhZGVycywgaWYgbm9uZSBhcmUgZm91bmQsIG5vIGxpbmVzXG4gIC8vIGFyZSBjb25zdW1lZC5cbiAgZnVuY3Rpb24gcGFyc2VGaWxlSGVhZGVyKGluZGV4KSB7XG4gICAgbGV0IGZpbGVIZWFkZXIgPSAoL14oXFwtXFwtXFwtfFxcK1xcK1xcKylcXHMrKFxcUyspXFxzPyguKz8pXFxzKiQvKS5leGVjKGRpZmZzdHJbaV0pO1xuICAgIGlmIChmaWxlSGVhZGVyKSB7XG4gICAgICBsZXQga2V5UHJlZml4ID0gZmlsZUhlYWRlclsxXSA9PT0gJy0tLScgPyAnb2xkJyA6ICduZXcnO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0ZpbGVOYW1lJ10gPSBmaWxlSGVhZGVyWzJdO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0hlYWRlciddID0gZmlsZUhlYWRlclszXTtcblxuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyBhIGh1bmtcbiAgLy8gVGhpcyBhc3N1bWVzIHRoYXQgd2UgYXJlIGF0IHRoZSBzdGFydCBvZiBhIGh1bmsuXG4gIGZ1bmN0aW9uIHBhcnNlSHVuaygpIHtcbiAgICBsZXQgY2h1bmtIZWFkZXJJbmRleCA9IGksXG4gICAgICAgIGNodW5rSGVhZGVyTGluZSA9IGRpZmZzdHJbaSsrXSxcbiAgICAgICAgY2h1bmtIZWFkZXIgPSBjaHVua0hlYWRlckxpbmUuc3BsaXQoL0BAIC0oXFxkKykoPzosKFxcZCspKT8gXFwrKFxcZCspKD86LChcXGQrKSk/IEBALyk7XG5cbiAgICBsZXQgaHVuayA9IHtcbiAgICAgIG9sZFN0YXJ0OiArY2h1bmtIZWFkZXJbMV0sXG4gICAgICBvbGRMaW5lczogK2NodW5rSGVhZGVyWzJdIHx8IDEsXG4gICAgICBuZXdTdGFydDogK2NodW5rSGVhZGVyWzNdLFxuICAgICAgbmV3TGluZXM6ICtjaHVua0hlYWRlcls0XSB8fCAxLFxuICAgICAgbGluZXM6IFtdXG4gICAgfTtcblxuICAgIGxldCBhZGRDb3VudCA9IDAsXG4gICAgICAgIHJlbW92ZUNvdW50ID0gMDtcbiAgICBmb3IgKDsgaSA8IGRpZmZzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBvcGVyYXRpb24gPSBkaWZmc3RyW2ldWzBdO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnKycgfHwgb3BlcmF0aW9uID09PSAnLScgfHwgb3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgaHVuay5saW5lcy5wdXNoKGRpZmZzdHJbaV0pO1xuXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICAgIGFkZENvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdGhlIGVtcHR5IGJsb2NrIGNvdW50IGNhc2VcbiAgICBpZiAoIWFkZENvdW50ICYmIGh1bmsubmV3TGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsubmV3TGluZXMgPSAwO1xuICAgIH1cbiAgICBpZiAoIXJlbW92ZUNvdW50ICYmIGh1bmsub2xkTGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsub2xkTGluZXMgPSAwO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gb3B0aW9uYWwgc2FuaXR5IGNoZWNraW5nXG4gICAgaWYgKG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICBpZiAoYWRkQ291bnQgIT09IGh1bmsubmV3TGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBZGRlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICB9XG4gICAgICBpZiAocmVtb3ZlQ291bnQgIT09IGh1bmsub2xkTGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZW1vdmVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaHVuaztcbiAgfVxuXG4gIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICBwYXJzZUluZGV4KCk7XG4gIH1cblxuICByZXR1cm4gbGlzdDtcbn1cbiIsIi8vIEl0ZXJhdG9yIHRoYXQgdHJhdmVyc2VzIGluIHRoZSByYW5nZSBvZiBbbWluLCBtYXhdLCBzdGVwcGluZ1xuLy8gYnkgZGlzdGFuY2UgZnJvbSBhIGdpdmVuIHN0YXJ0IHBvc2l0aW9uLiBJLmUuIGZvciBbMCwgNF0sIHdpdGhcbi8vIHN0YXJ0IG9mIDIsIHRoaXMgd2lsbCBpdGVyYXRlIDIsIDMsIDEsIDQsIDAuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgbWluTGluZSwgbWF4TGluZSkge1xuICBsZXQgd2FudEZvcndhcmQgPSB0cnVlLFxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGxvY2FsT2Zmc2V0ID0gMTtcblxuICByZXR1cm4gZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgaWYgKHdhbnRGb3J3YXJkICYmICFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgbG9jYWxPZmZzZXQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmV5b25kIHRleHQgbGVuZ3RoLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBhZnRlciBvZmZzZXQgbG9jYXRpb24gKG9yIGRlc2lyZWQgbG9jYXRpb24gb24gZmlyc3QgaXRlcmF0aW9uKVxuICAgICAgaWYgKHN0YXJ0ICsgbG9jYWxPZmZzZXQgPD0gbWF4TGluZSkge1xuICAgICAgICByZXR1cm4gbG9jYWxPZmZzZXQ7XG4gICAgICB9XG5cbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmICghZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmVmb3JlIHRleHQgYmVnaW5uaW5nLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBiZWZvcmUgb2Zmc2V0IGxvY2F0aW9uXG4gICAgICBpZiAobWluTGluZSA8PSBzdGFydCAtIGxvY2FsT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiAtbG9jYWxPZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yKCk7XG4gICAgfVxuXG4gICAgLy8gV2UgdHJpZWQgdG8gZml0IGh1bmsgYmVmb3JlIHRleHQgYmVnaW5uaW5nIGFuZCBiZXlvbmQgdGV4dCBsZW5naHQsIHRoZW5cbiAgICAvLyBodW5rIGNhbid0IGZpdCBvbiB0aGUgdGV4dC4gUmV0dXJuIHVuZGVmaW5lZFxuICB9O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0cykge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBkZWZhdWx0cy5jYWxsYmFjayA9IG9wdGlvbnM7XG4gIH0gZWxzZSBpZiAob3B0aW9ucykge1xuICAgIGZvciAobGV0IG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRzO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBsY3MgPSByZXF1aXJlKCcuL2xpYi9sY3MnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vbGliL2FycmF5Jyk7XG52YXIgcGF0Y2ggPSByZXF1aXJlKCcuL2xpYi9qc29uUGF0Y2gnKTtcbnZhciBpbnZlcnNlID0gcmVxdWlyZSgnLi9saWIvaW52ZXJzZScpO1xudmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9saWIvanNvblBvaW50ZXInKTtcbnZhciBlbmNvZGVTZWdtZW50ID0ganNvblBvaW50ZXIuZW5jb2RlU2VnbWVudDtcblxuZXhwb3J0cy5kaWZmID0gZGlmZjtcbmV4cG9ydHMucGF0Y2ggPSBwYXRjaC5hcHBseTtcbmV4cG9ydHMucGF0Y2hJblBsYWNlID0gcGF0Y2guYXBwbHlJblBsYWNlO1xuZXhwb3J0cy5pbnZlcnNlID0gaW52ZXJzZTtcbmV4cG9ydHMuY2xvbmUgPSBwYXRjaC5jbG9uZTtcblxuLy8gRXJyb3JzXG5leHBvcnRzLkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9saWIvSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbmV4cG9ydHMuVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9saWIvVGVzdEZhaWxlZEVycm9yJyk7XG5leHBvcnRzLlBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9saWIvUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGlzVmFsaWRPYmplY3QgPSBwYXRjaC5pc1ZhbGlkT2JqZWN0O1xudmFyIGRlZmF1bHRIYXNoID0gcGF0Y2guZGVmYXVsdEhhc2g7XG5cbi8qKlxuICogQ29tcHV0ZSBhIEpTT04gUGF0Y2ggcmVwcmVzZW50aW5nIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGEgYW5kIGIuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBpZiBhIGZ1bmN0aW9uLCBzZWUgb3B0aW9ucy5oYXNoXG4gKiBAcGFyYW0gez9mdW5jdGlvbih4OiopOlN0cmluZ3xOdW1iZXJ9IG9wdGlvbnMuaGFzaCB1c2VkIHRvIGhhc2ggYXJyYXkgaXRlbXNcbiAqICBpbiBvcmRlciB0byByZWNvZ25pemUgaWRlbnRpY2FsIG9iamVjdHMsIGRlZmF1bHRzIHRvIEpTT04uc3RyaW5naWZ5XG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5KTpvYmplY3R9IG9wdGlvbnMubWFrZUNvbnRleHRcbiAqICB1c2VkIHRvIGdlbmVyYXRlIHBhdGNoIGNvbnRleHQuIElmIG5vdCBwcm92aWRlZCwgY29udGV4dCB3aWxsIG5vdCBiZSBnZW5lcmF0ZWRcbiAqIEByZXR1cm5zIHthcnJheX0gSlNPTiBQYXRjaCBzdWNoIHRoYXQgcGF0Y2goZGlmZihhLCBiKSwgYSkgfiBiXG4gKi9cbmZ1bmN0aW9uIGRpZmYoYSwgYiwgb3B0aW9ucykge1xuXHRyZXR1cm4gYXBwZW5kQ2hhbmdlcyhhLCBiLCAnJywgaW5pdFN0YXRlKG9wdGlvbnMsIFtdKSkucGF0Y2g7XG59XG5cbi8qKlxuICogQ3JlYXRlIGluaXRpYWwgZGlmZiBzdGF0ZSBmcm9tIHRoZSBwcm92aWRlZCBvcHRpb25zXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIEBzZWUgZGlmZiBvcHRpb25zIGFib3ZlXG4gKiBAcGFyYW0ge2FycmF5fSBwYXRjaCBhbiBlbXB0eSBvciBleGlzdGluZyBKU09OIFBhdGNoIGFycmF5IGludG8gd2hpY2hcbiAqICB0aGUgZGlmZiBzaG91bGQgZ2VuZXJhdGUgbmV3IHBhdGNoIG9wZXJhdGlvbnNcbiAqIEByZXR1cm5zIHtvYmplY3R9IGluaXRpYWxpemVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gaW5pdFN0YXRlKG9wdGlvbnMsIHBhdGNoKSB7XG5cdGlmKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5oYXNoLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMubWFrZUNvbnRleHQsIGRlZmF1bHRDb250ZXh0KSxcblx0XHRcdGludmVydGlibGU6ICEob3B0aW9ucy5pbnZlcnRpYmxlID09PSBmYWxzZSlcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucywgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IGRlZmF1bHRDb250ZXh0LFxuXHRcdFx0aW52ZXJ0aWJsZTogdHJ1ZVxuXHRcdH07XG5cdH1cbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gSlNPTiB2YWx1ZXMgKG9iamVjdCwgYXJyYXksIG51bWJlciwgc3RyaW5nLCBldGMuKSwgZmluZCB0aGVpclxuICogZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZEFycmF5Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRpZihpc1ZhbGlkT2JqZWN0KGEpICYmIGlzVmFsaWRPYmplY3QoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kT2JqZWN0Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRyZXR1cm4gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gb2JqZWN0cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMVxuICogQHBhcmFtIHtvYmplY3R9IG8yXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kT2JqZWN0Q2hhbmdlcyhvMSwgbzIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMobzIpO1xuXHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0dmFyIGksIGtleTtcblxuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdHZhciBrZXlQYXRoID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRpZihvMVtrZXldICE9PSB2b2lkIDApIHtcblx0XHRcdGFwcGVuZENoYW5nZXMobzFba2V5XSwgbzJba2V5XSwga2V5UGF0aCwgc3RhdGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBrZXlQYXRoLCB2YWx1ZTogbzJba2V5XSB9KTtcblx0XHR9XG5cdH1cblxuXHRrZXlzID0gT2JqZWN0LmtleXMobzEpO1xuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdGlmKG8yW2tleV0gPT09IHZvaWQgMCkge1xuXHRcdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IG8xW2tleV0gfSk7XG5cdFx0XHR9XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwIH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYXJyYXlzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQXJyYXlDaGFuZ2VzKGExLCBhMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGExaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMSk7XG5cdHZhciBhMmhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTIpO1xuXG5cdHZhciBsY3NNYXRyaXggPSBsY3MuY29tcGFyZShhMWhhc2gsIGEyaGFzaCk7XG5cblx0cmV0dXJuIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGxjc01hdHJpeCBpbnRvIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhbmQgYXBwZW5kXG4gKiB0aGVtIHRvIHN0YXRlLnBhdGNoLCByZWN1cnNpbmcgaW50byBhcnJheSBlbGVtZW50cyBhcyBuZWNlc3NhcnlcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjc01hdHJpeFxuICogQHJldHVybnMge29iamVjdH0gbmV3IHN0YXRlIHdpdGggSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFkZGVkIGJhc2VkXG4gKiAgb24gdGhlIHByb3ZpZGVkIGxjc01hdHJpeFxuICovXG5mdW5jdGlvbiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpIHtcblx0dmFyIG9mZnNldCA9IDA7XG5cdHJldHVybiBsY3MucmVkdWNlKGZ1bmN0aW9uKHN0YXRlLCBvcCwgaSwgaikge1xuXHRcdHZhciBsYXN0LCBjb250ZXh0O1xuXHRcdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHRcdHZhciBwID0gcGF0aCArICcvJyArIChqICsgb2Zmc2V0KTtcblxuXHRcdGlmIChvcCA9PT0gbGNzLlJFTU9WRSkge1xuXHRcdFx0Ly8gQ29hbGVzY2UgYWRqYWNlbnQgcmVtb3ZlICsgYWRkIGludG8gcmVwbGFjZVxuXHRcdFx0bGFzdCA9IHBhdGNoW3BhdGNoLmxlbmd0aC0xXTtcblx0XHRcdGNvbnRleHQgPSBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSk7XG5cblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBhMVtqXSwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYobGFzdCAhPT0gdm9pZCAwICYmIGxhc3Qub3AgPT09ICdhZGQnICYmIGxhc3QucGF0aCA9PT0gcCkge1xuXHRcdFx0XHRsYXN0Lm9wID0gJ3JlcGxhY2UnO1xuXHRcdFx0XHRsYXN0LmNvbnRleHQgPSBjb250ZXh0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0b2Zmc2V0IC09IDE7XG5cblx0XHR9IGVsc2UgaWYgKG9wID09PSBsY3MuQUREKSB7XG5cdFx0XHQvLyBTZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDIjc2VjdGlvbi00LjFcblx0XHRcdC8vIE1heSB1c2UgZWl0aGVyIGluZGV4PT09bGVuZ3RoICpvciogJy0nIHRvIGluZGljYXRlIGFwcGVuZGluZyB0byBhcnJheVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcCwgdmFsdWU6IGEyW2ldLFxuXHRcdFx0XHRjb250ZXh0OiBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSlcblx0XHRcdH0pO1xuXG5cdFx0XHRvZmZzZXQgKz0gMTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKGExW2pdLCBhMltpXSwgcCwgc3RhdGUpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzdGF0ZTtcblxuXHR9LCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gbnVtYmVyfHN0cmluZ3xudWxsIHZhbHVlcywgaWYgdGhleSBkaWZmZXIsIGFwcGVuZCB0byBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtvYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoYSAhPT0gYikge1xuXHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYSB9KTtcblx0XHR9XG5cblx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcGF0aCwgdmFsdWU6IGIgfSk7XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7Kn0geVxuICogQHJldHVybnMgeyp9IHggaWYgcHJlZGljYXRlKHgpIGlzIHRydXRoeSwgb3RoZXJ3aXNlIHlcbiAqL1xuZnVuY3Rpb24gb3JFbHNlKHByZWRpY2F0ZSwgeCwgeSkge1xuXHRyZXR1cm4gcHJlZGljYXRlKHgpID8geCA6IHk7XG59XG5cbi8qKlxuICogRGVmYXVsdCBwYXRjaCBjb250ZXh0IGdlbmVyYXRvclxuICogQHJldHVybnMge3VuZGVmaW5lZH0gdW5kZWZpbmVkIGNvbnRleHRcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdENvbnRleHQoKSB7XG5cdHJldHVybiB2b2lkIDA7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcblx0cmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjtcblxuZnVuY3Rpb24gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7XG5cbmZ1bmN0aW9uIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFRlc3RGYWlsZWRFcnJvcjtcblxuZnVuY3Rpb24gVGVzdEZhaWxlZEVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRlc3RGYWlsZWRFcnJvcjsiLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb25zID0gY29ucztcbmV4cG9ydHMudGFpbCA9IHRhaWw7XG5leHBvcnRzLm1hcCA9IG1hcDtcblxuLyoqXG4gKiBQcmVwZW5kIHggdG8gYSwgd2l0aG91dCBtdXRhdGluZyBhLiBGYXN0ZXIgdGhhbiBhLnVuc2hpZnQoeClcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSB3aXRoIHggcHJlcGVuZGVkXG4gKi9cbmZ1bmN0aW9uIGNvbnMoeCwgYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKzEpO1xuXHRiWzBdID0geDtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpKzFdID0gYVtpXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBBcnJheSBjb250YWluaW5nIGFsbCBlbGVtZW50cyBpbiBhLCBleGNlcHQgdGhlIGZpcnN0LlxuICogIEZhc3RlciB0aGFuIGEuc2xpY2UoMSlcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXksIHRoZSBlcXVpdmFsZW50IG9mIGEuc2xpY2UoMSlcbiAqL1xuZnVuY3Rpb24gdGFpbChhKSB7XG5cdHZhciBsID0gYS5sZW5ndGgtMTtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCk7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaV0gPSBhW2krMV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBNYXAgYW55IGFycmF5LWxpa2UuIEZhc3RlciB0aGFuIEFycmF5LnByb3RvdHlwZS5tYXBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgbWFwcGVkIGJ5IGZcbiAqL1xuZnVuY3Rpb24gbWFwKGYsIGEpIHtcblx0dmFyIGIgPSBuZXcgQXJyYXkoYS5sZW5ndGgpO1xuXHRmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7ICsraSkge1xuXHRcdGJbaV0gPSBmKGFbaV0pO1xuXHR9XG5cdHJldHVybiBiO1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhIGRlZXAgY29weSBvZiB4IHdoaWNoIG11c3QgYmUgYSBsZWdhbCBKU09OIG9iamVjdC9hcnJheS92YWx1ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBjbG9uZVxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGNsb25lIG9mIHhcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcblxuZnVuY3Rpb24gY2xvbmUoeCkge1xuXHRpZih4ID09IG51bGwgfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0cmV0dXJuIGNsb25lQXJyYXkoeCk7XG5cdH1cblxuXHRyZXR1cm4gY2xvbmVPYmplY3QoeCk7XG59XG5cbmZ1bmN0aW9uIGNsb25lQXJyYXkgKHgpIHtcblx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0dmFyIHkgPSBuZXcgQXJyYXkobCk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHR5W2ldID0gY2xvbmUoeFtpXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cblxuZnVuY3Rpb24gY2xvbmVPYmplY3QgKHgpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh4KTtcblx0dmFyIHkgPSB7fTtcblxuXHRmb3IgKHZhciBrLCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0ayA9IGtleXNbaV07XG5cdFx0eVtrXSA9IGNsb25lKHhba10pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG5cbi8qKlxuICogY29tbXV0ZSB0aGUgcGF0Y2ggc2VxdWVuY2UgYSxiIHRvIGIsYVxuICogQHBhcmFtIHtvYmplY3R9IGEgcGF0Y2ggb3BlcmF0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gYiBwYXRjaCBvcGVyYXRpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21tdXRlUGF0aHMoYSwgYikge1xuXHQvLyBUT0RPOiBjYXNlcyBmb3Igc3BlY2lhbCBwYXRoczogJycgYW5kICcvJ1xuXHR2YXIgbGVmdCA9IGpzb25Qb2ludGVyLnBhcnNlKGEucGF0aCk7XG5cdHZhciByaWdodCA9IGpzb25Qb2ludGVyLnBhcnNlKGIucGF0aCk7XG5cdHZhciBwcmVmaXggPSBnZXRDb21tb25QYXRoUHJlZml4KGxlZnQsIHJpZ2h0KTtcblx0dmFyIGlzQXJyYXkgPSBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgcHJlZml4Lmxlbmd0aCk7XG5cblx0Ly8gTmV2ZXIgbXV0YXRlIHRoZSBvcmlnaW5hbHNcblx0dmFyIGFjID0gY29weVBhdGNoKGEpO1xuXHR2YXIgYmMgPSBjb3B5UGF0Y2goYik7XG5cblx0aWYocHJlZml4Lmxlbmd0aCA9PT0gMCAmJiAhaXNBcnJheSkge1xuXHRcdC8vIFBhdGhzIHNoYXJlIG5vIGNvbW1vbiBhbmNlc3Rvciwgc2ltcGxlIHN3YXBcblx0XHRyZXR1cm4gW2JjLCBhY107XG5cdH1cblxuXHRpZihpc0FycmF5KSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBjb21tdXRlVHJlZVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBjb21tdXRlVHJlZVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGEucGF0aCA9PT0gYi5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IGNvbW11dGUgJyArIGEub3AgKyAnLCcgKyBiLm9wICsgJyB3aXRoIGlkZW50aWNhbCBvYmplY3QgcGF0aHMnKTtcblx0fVxuXHQvLyBGSVhNRTogSW1wbGVtZW50IHRyZWUgcGF0aCBjb21tdXRhdGlvblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2hvc2UgY29tbW9uIGFuY2VzdG9yICh3aGljaCBtYXkgYmUgdGhlIGltbWVkaWF0ZSBwYXJlbnQpXG4gKiBpcyBhbiBhcnJheVxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBsZWZ0XG4gKiBAcGFyYW0gYlxuICogQHBhcmFtIHJpZ2h0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5UGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYobGVmdC5sZW5ndGggPT09IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlTaWJsaW5ncyhhLCBsZWZ0LCBiLCByaWdodCk7XG5cdH1cblxuXHRpZiAobGVmdC5sZW5ndGggPiByaWdodC5sZW5ndGgpIHtcblx0XHQvLyBsZWZ0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSByaWdodFxuXHRcdGxlZnQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihiLCByaWdodCwgYSwgbGVmdCwgLTEpO1xuXHRcdGEucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4obGVmdCkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIHJpZ2h0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSBsZWZ0XG5cdFx0cmlnaHQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihhLCBsZWZ0LCBiLCByaWdodCwgMSk7XG5cdFx0Yi5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihyaWdodCkpO1xuXHR9XG5cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIGluZGV4KSB7XG5cdHJldHVybiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChsZWZ0W2luZGV4XSlcblx0XHQmJiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChyaWdodFtpbmRleF0pO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgcmVmZXJyaW5nIHRvIGl0ZW1zIGluIHRoZSBzYW1lIGFycmF5XG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcmV0dXJucyB7KltdfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlTaWJsaW5ncyhsLCBscGF0aCwgciwgcnBhdGgpIHtcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdHZhciBjb21tdXRlZDtcblxuXHRpZihsaW5kZXggPCByaW5kZXgpIHtcblx0XHQvLyBBZGp1c3QgcmlnaHQgcGF0aFxuXHRcdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIDEpO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IHJpbmRleCArIDE7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoci5vcCA9PT0gJ2FkZCcgfHwgci5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gbGluZGV4ICsgMTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH0gZWxzZSBpZiAobGluZGV4ID4gcmluZGV4ICYmIHIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aCBvbmx5IGlmIHJlbW92ZSB3YXMgYXQgYSAoc3RyaWN0bHkpIGxvd2VyIGluZGV4XG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCBsaW5kZXggLSAxKTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH1cblxuXHRyZXR1cm4gW3IsIGxdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2l0aCBhIGNvbW1vbiBhcnJheSBhbmNlc3RvclxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHBhcmFtIGRpcmVjdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheUFuY2VzdG9yKGwsIGxwYXRoLCByLCBycGF0aCwgZGlyZWN0aW9uKSB7XG5cdC8vIHJwYXRoIGlzIGxvbmdlciBvciBzYW1lIGxlbmd0aFxuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0Ly8gQ29weSBycGF0aCwgdGhlbiBhZGp1c3QgaXRzIGFycmF5IGluZGV4XG5cdHZhciByYyA9IHJwYXRoLnNsaWNlKCk7XG5cblx0aWYobGluZGV4ID4gcmluZGV4KSB7XG5cdFx0cmV0dXJuIHJjO1xuXHR9XG5cblx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIGRpcmVjdGlvbik7XG5cdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggKyBkaXJlY3Rpb24pO1xuXHR9XG5cblx0cmV0dXJuIHJjO1xufVxuXG5mdW5jdGlvbiBnZXRDb21tb25QYXRoUHJlZml4KHAxLCBwMikge1xuXHR2YXIgcDFsID0gcDEubGVuZ3RoO1xuXHR2YXIgcDJsID0gcDIubGVuZ3RoO1xuXHRpZihwMWwgPT09IDAgfHwgcDJsID09PSAwIHx8IChwMWwgPCAyICYmIHAybCA8IDIpKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG5cblx0Ly8gSWYgcGF0aHMgYXJlIHNhbWUgbGVuZ3RoLCB0aGUgbGFzdCBzZWdtZW50IGNhbm5vdCBiZSBwYXJ0XG5cdC8vIG9mIGEgY29tbW9uIHByZWZpeC4gIElmIG5vdCB0aGUgc2FtZSBsZW5ndGgsIHRoZSBwcmVmaXggY2Fubm90XG5cdC8vIGJlIGxvbmdlciB0aGFuIHRoZSBzaG9ydGVyIHBhdGguXG5cdHZhciBsID0gcDFsID09PSBwMmxcblx0XHQ/IHAxbCAtIDFcblx0XHQ6IE1hdGgubWluKHAxbCwgcDJsKTtcblxuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIHAxW2ldID09PSBwMltpXSkge1xuXHRcdCsraVxuXHR9XG5cblx0cmV0dXJuIHAxLnNsaWNlKDAsIGkpO1xufVxuXG5mdW5jdGlvbiBjb3B5UGF0Y2gocCkge1xuXHRpZihwLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGggfTtcblx0fVxuXG5cdGlmKHAub3AgPT09ICdjb3B5JyB8fCBwLm9wID09PSAnbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCBmcm9tOiBwLmZyb20gfTtcblx0fVxuXG5cdC8vIHRlc3QsIGFkZCwgcmVwbGFjZVxuXHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCB2YWx1ZTogcC52YWx1ZSB9O1xufSIsIm1vZHVsZS5leHBvcnRzID0gZGVlcEVxdWFscztcblxuLyoqXG4gKiBDb21wYXJlIDIgSlNPTiB2YWx1ZXMsIG9yIHJlY3Vyc2l2ZWx5IGNvbXBhcmUgMiBKU09OIG9iamVjdHMgb3IgYXJyYXlzXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGJcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBhIGFuZCBiIGFyZSByZWN1cnNpdmVseSBlcXVhbFxuICovXG5mdW5jdGlvbiBkZWVwRXF1YWxzKGEsIGIpIHtcblx0aWYoYSA9PT0gYikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVBcnJheXMoYSwgYik7XG5cdH1cblxuXHRpZih0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVPYmplY3RzKGEsIGIpO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlQXJyYXlzKGEsIGIpIHtcblx0aWYoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMDsgaTxhLmxlbmd0aDsgKytpKSB7XG5cdFx0aWYoIWRlZXBFcXVhbHMoYVtpXSwgYltpXSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZU9iamVjdHMoYSwgYikge1xuXHRpZigoYSA9PT0gbnVsbCAmJiBiICE9PSBudWxsKSB8fCAoYSAhPT0gbnVsbCAmJiBiID09PSBudWxsKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBha2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuXHR2YXIgYmtleXMgPSBPYmplY3Qua2V5cyhiKTtcblxuXHRpZihha2V5cy5sZW5ndGggIT09IGJrZXlzLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDAsIGs7IGk8YWtleXMubGVuZ3RoOyArK2kpIHtcblx0XHRrID0gYWtleXNbaV07XG5cdFx0aWYoIShrIGluIGIgJiYgZGVlcEVxdWFscyhhW2tdLCBiW2tdKSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn0iLCJ2YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGludmVyc2UocCkge1xuXHR2YXIgcHIgPSBbXTtcblx0dmFyIGksIHNraXA7XG5cdGZvcihpID0gcC5sZW5ndGgtMTsgaT49IDA7IGkgLT0gc2tpcCkge1xuXHRcdHNraXAgPSBpbnZlcnRPcChwciwgcFtpXSwgaSwgcCk7XG5cdH1cblxuXHRyZXR1cm4gcHI7XG59O1xuXG5mdW5jdGlvbiBpbnZlcnRPcChwYXRjaCwgYywgaSwgY29udGV4dCkge1xuXHR2YXIgb3AgPSBwYXRjaGVzW2Mub3BdO1xuXHRyZXR1cm4gb3AgIT09IHZvaWQgMCAmJiB0eXBlb2Ygb3AuaW52ZXJzZSA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdD8gb3AuaW52ZXJzZShwYXRjaCwgYywgaSwgY29udGV4dClcblx0XHQ6IDE7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcblxuZXhwb3J0cy5hcHBseSA9IHBhdGNoO1xuZXhwb3J0cy5hcHBseUluUGxhY2UgPSBwYXRjaEluUGxhY2U7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmlzVmFsaWRPYmplY3QgPSBpc1ZhbGlkT2JqZWN0O1xuZXhwb3J0cy5kZWZhdWx0SGFzaCA9IGRlZmF1bHRIYXNoO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcblxuLyoqXG4gKiBBcHBseSB0aGUgc3VwcGxpZWQgSlNPTiBQYXRjaCB0byB4XG4gKiBAcGFyYW0ge2FycmF5fSBjaGFuZ2VzIEpTT04gUGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIHBhdGNoXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtmdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBvcHRpb25zLmZpbmRDb250ZXh0XG4gKiAgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dFxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSBwYXRjaGVkIHZlcnNpb24gb2YgeC4gSWYgeCBpc1xuICogIGFuIGFycmF5IG9yIG9iamVjdCwgaXQgd2lsbCBiZSBtdXRhdGVkIGFuZCByZXR1cm5lZC4gT3RoZXJ3aXNlLCBpZlxuICogIHggaXMgYSB2YWx1ZSwgdGhlIG5ldyB2YWx1ZSB3aWxsIGJlIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBwYXRjaChjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdHJldHVybiBwYXRjaEluUGxhY2UoY2hhbmdlcywgY2xvbmUoeCksIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwYXRjaEluUGxhY2UoY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRpZighb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblx0fVxuXG5cdC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGlmIGNoYW5nZXMgaXMgbm90IGFuIGFycmF5XG5cdGlmKCFBcnJheS5pc0FycmF5KGNoYW5nZXMpKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHR2YXIgcGF0Y2gsIHA7XG5cdGZvcih2YXIgaT0wOyBpPGNoYW5nZXMubGVuZ3RoOyArK2kpIHtcblx0XHRwID0gY2hhbmdlc1tpXTtcblx0XHRwYXRjaCA9IHBhdGNoZXNbcC5vcF07XG5cblx0XHRpZihwYXRjaCA9PT0gdm9pZCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2ludmFsaWQgb3AgJyArIEpTT04uc3RyaW5naWZ5KHApKTtcblx0XHR9XG5cblx0XHR4ID0gcGF0Y2guYXBwbHkoeCwgcCwgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEhhc2goeCkge1xuXHRyZXR1cm4gaXNWYWxpZE9iamVjdCh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogeDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBfcGFyc2UgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyUGFyc2UnKTtcblxuZXhwb3J0cy5maW5kID0gZmluZDtcbmV4cG9ydHMuam9pbiA9IGpvaW47XG5leHBvcnRzLmFic29sdXRlID0gYWJzb2x1dGU7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5leHBvcnRzLmNvbnRhaW5zID0gY29udGFpbnM7XG5leHBvcnRzLmVuY29kZVNlZ21lbnQgPSBlbmNvZGVTZWdtZW50O1xuZXhwb3J0cy5kZWNvZGVTZWdtZW50ID0gZGVjb2RlU2VnbWVudDtcbmV4cG9ydHMucGFyc2VBcnJheUluZGV4ID0gcGFyc2VBcnJheUluZGV4O1xuZXhwb3J0cy5pc1ZhbGlkQXJyYXlJbmRleCA9IGlzVmFsaWRBcnJheUluZGV4O1xuXG4vLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtMlxudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBzZXBhcmF0b3JSeCA9IC9cXC8vZztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcbnZhciBlbmNvZGVkU2VwYXJhdG9yUnggPSAvfjEvZztcblxudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZXNjYXBlUnggPSAvfi9nO1xudmFyIGVuY29kZWRFc2NhcGUgPSAnfjAnO1xudmFyIGVuY29kZWRFc2NhcGVSeCA9IC9+MC9nO1xuXG4vKipcbiAqIEZpbmQgdGhlIHBhcmVudCBvZiB0aGUgc3BlY2lmaWVkIHBhdGggaW4geCBhbmQgcmV0dXJuIGEgZGVzY3JpcHRvclxuICogY29udGFpbmluZyB0aGUgcGFyZW50IGFuZCBhIGtleS4gIElmIHRoZSBwYXJlbnQgZG9lcyBub3QgZXhpc3QgaW4geCxcbiAqIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geCBvYmplY3Qgb3IgYXJyYXkgaW4gd2hpY2ggdG8gc2VhcmNoXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBKU09OIFBvaW50ZXIgc3RyaW5nIChlbmNvZGVkKVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gZmluZENvbnRleHRcbiAqICBvcHRpb25hbCBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0LiAgSWYgcHJvdmlkZWQsIGNvbnRleHQgTVVTVCBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHBhcmFtIHs/e2JlZm9yZTpBcnJheSwgYWZ0ZXI6QXJyYXl9fSBjb250ZXh0IG9wdGlvbmFsIHBhdGNoIGNvbnRleHQgZm9yXG4gKiAgZmluZENvbnRleHQgdG8gdXNlIHRvIGFkanVzdCBhcnJheSBpbmRpY2VzLiAgSWYgcHJvdmlkZWQsIGZpbmRDb250ZXh0IE1VU1RcbiAqICBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHJldHVybnMge3t0YXJnZXQ6b2JqZWN0fGFycmF5fG51bWJlcnxzdHJpbmcsIGtleTpzdHJpbmd9fHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZCh4LCBwYXRoLCBmaW5kQ29udGV4dCwgY29udGV4dCkge1xuXHRpZih0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZihwYXRoID09PSAnJykge1xuXHRcdC8vIHdob2xlIGRvY3VtZW50XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6IHZvaWQgMCB9O1xuXHR9XG5cblx0aWYocGF0aCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6ICcnIH07XG5cdH1cblxuXHR2YXIgcGFyZW50ID0geCwga2V5O1xuXHR2YXIgaGFzQ29udGV4dCA9IGNvbnRleHQgIT09IHZvaWQgMDtcblxuXHRfcGFyc2UocGF0aCwgZnVuY3Rpb24oc2VnbWVudCkge1xuXHRcdC8vIGhtLi4uIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQgYmUgaWYodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKVxuXHRcdGlmKHggPT0gbnVsbCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRoYXQgd2UgcHJlbWF0dXJlbHkgaGl0IHRoZSBlbmQgb2YgdGhlIHBhdGggaGllcmFyY2h5LlxuXHRcdFx0cGFyZW50ID0gbnVsbDtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0XHRrZXkgPSBoYXNDb250ZXh0XG5cdFx0XHRcdD8gZmluZEluZGV4KGZpbmRDb250ZXh0LCBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCksIHgsIGNvbnRleHQpXG5cdFx0XHRcdDogc2VnbWVudCA9PT0gJy0nID8gc2VnbWVudCA6IHBhcnNlQXJyYXlJbmRleChzZWdtZW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0a2V5ID0gc2VnbWVudDtcblx0XHR9XG5cblx0XHRwYXJlbnQgPSB4O1xuXHRcdHggPSB4W2tleV07XG5cdH0pO1xuXG5cdHJldHVybiBwYXJlbnQgPT09IG51bGxcblx0XHQ/IHZvaWQgMFxuXHRcdDogeyB0YXJnZXQ6IHBhcmVudCwga2V5OiBrZXkgfTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGUocGF0aCkge1xuXHRyZXR1cm4gcGF0aFswXSA9PT0gc2VwYXJhdG9yID8gcGF0aCA6IHNlcGFyYXRvciArIHBhdGg7XG59XG5cbmZ1bmN0aW9uIGpvaW4oc2VnbWVudHMpIHtcblx0cmV0dXJuIHNlZ21lbnRzLmpvaW4oc2VwYXJhdG9yKTtcbn1cblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuXHR2YXIgc2VnbWVudHMgPSBbXTtcblx0X3BhcnNlKHBhdGgsIHNlZ21lbnRzLnB1c2guYmluZChzZWdtZW50cykpO1xuXHRyZXR1cm4gc2VnbWVudHM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKGEsIGIpIHtcblx0cmV0dXJuIGIuaW5kZXhPZihhKSA9PT0gMCAmJiBiW2EubGVuZ3RoXSA9PT0gc2VwYXJhdG9yO1xufVxuXG4vKipcbiAqIERlY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGVuY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZGVjb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGRlY29kZVNlZ21lbnQocykge1xuXHQvLyBTZWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG5cdHJldHVybiBzLnJlcGxhY2UoZW5jb2RlZFNlcGFyYXRvclJ4LCBzZXBhcmF0b3IpLnJlcGxhY2UoZW5jb2RlZEVzY2FwZVJ4LCBlc2NhcGVDaGFyKTtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBkZWNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGVuY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBlbmNvZGVTZWdtZW50KHMpIHtcblx0cmV0dXJuIHMucmVwbGFjZShlc2NhcGVSeCwgZW5jb2RlZEVzY2FwZSkucmVwbGFjZShzZXBhcmF0b3JSeCwgZW5jb2RlZFNlcGFyYXRvcik7XG59XG5cbnZhciBhcnJheUluZGV4UnggPSAvXigwfFsxLTldXFxkKikkLztcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiBzIGlzIGEgdmFsaWQgSlNPTiBQb2ludGVyIGFycmF5IGluZGV4XG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4KHMpIHtcblx0cmV0dXJuIGFycmF5SW5kZXhSeC50ZXN0KHMpO1xufVxuXG4vKipcbiAqIFNhZmVseSBwYXJzZSBhIHN0cmluZyBpbnRvIGEgbnVtYmVyID49IDAuIERvZXMgbm90IGNoZWNrIGZvciBkZWNpbWFsIG51bWJlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIG51bWVyaWMgc3RyaW5nXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBudW1iZXIgPj0gMFxuICovXG5mdW5jdGlvbiBwYXJzZUFycmF5SW5kZXggKHMpIHtcblx0aWYoaXNWYWxpZEFycmF5SW5kZXgocykpIHtcblx0XHRyZXR1cm4gK3M7XG5cdH1cblxuXHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2ludmFsaWQgYXJyYXkgaW5kZXggJyArIHMpO1xufVxuXG5mdW5jdGlvbiBmaW5kSW5kZXggKGZpbmRDb250ZXh0LCBzdGFydCwgYXJyYXksIGNvbnRleHQpIHtcblx0dmFyIGluZGV4ID0gc3RhcnQ7XG5cblx0aWYoaW5kZXggPCAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdhcnJheSBpbmRleCBvdXQgb2YgYm91bmRzICcgKyBpbmRleCk7XG5cdH1cblxuXHRpZihjb250ZXh0ICE9PSB2b2lkIDAgJiYgdHlwZW9mIGZpbmRDb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aW5kZXggPSBmaW5kQ29udGV4dChzdGFydCwgYXJyYXksIGNvbnRleHQpO1xuXHRcdGlmKGluZGV4IDwgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBwYXRjaCBjb250ZXh0ICcgKyBjb250ZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5kZXg7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbm1vZHVsZS5leHBvcnRzID0ganNvblBvaW50ZXJQYXJzZTtcblxudmFyIHBhcnNlUnggPSAvXFwvfH4xfH4wL2c7XG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG5cbi8qKlxuICogUGFyc2UgdGhyb3VnaCBhbiBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmcsIGRlY29kaW5nIGVhY2ggcGF0aCBzZWdtZW50XG4gKiBhbmQgcGFzc2luZyBpdCB0byBhbiBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3NlY3Rpb24tNFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nXG4gKiBAcGFyYW0ge3tmdW5jdGlvbihzZWdtZW50OnN0cmluZyk6Ym9vbGVhbn19IG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMge3N0cmluZ30gb3JpZ2luYWwgcGF0aFxuICovXG5mdW5jdGlvbiBqc29uUG9pbnRlclBhcnNlKHBhdGgsIG9uU2VnbWVudCkge1xuXHR2YXIgcG9zLCBhY2N1bSwgbWF0Y2hlcywgbWF0Y2g7XG5cblx0cG9zID0gcGF0aC5jaGFyQXQoMCkgPT09IHNlcGFyYXRvciA/IDEgOiAwO1xuXHRhY2N1bSA9ICcnO1xuXHRwYXJzZVJ4Lmxhc3RJbmRleCA9IHBvcztcblxuXHR3aGlsZShtYXRjaGVzID0gcGFyc2VSeC5leGVjKHBhdGgpKSB7XG5cblx0XHRtYXRjaCA9IG1hdGNoZXNbMF07XG5cdFx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MsIHBhcnNlUngubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcblx0XHRwb3MgPSBwYXJzZVJ4Lmxhc3RJbmRleDtcblxuXHRcdGlmKG1hdGNoID09PSBzZXBhcmF0b3IpIHtcblx0XHRcdGlmIChvblNlZ21lbnQoYWNjdW0pID09PSBmYWxzZSkgcmV0dXJuIHBhdGg7XG5cdFx0XHRhY2N1bSA9ICcnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhY2N1bSArPSBtYXRjaCA9PT0gZW5jb2RlZFNlcGFyYXRvciA/IHNlcGFyYXRvciA6IGVzY2FwZUNoYXI7XG5cdFx0fVxuXHR9XG5cblx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MpO1xuXHRvblNlZ21lbnQoYWNjdW0pO1xuXG5cdHJldHVybiBwYXRoO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29tcGFyZSA9IGNvbXBhcmU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcblxudmFyIFJFTU9WRSwgUklHSFQsIEFERCwgRE9XTiwgU0tJUDtcblxuZXhwb3J0cy5SRU1PVkUgPSBSRU1PVkUgPSBSSUdIVCA9IC0xO1xuZXhwb3J0cy5BREQgICAgPSBBREQgICAgPSBET1dOICA9ICAxO1xuZXhwb3J0cy5FUVVBTCAgPSBTS0lQICAgPSAwO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBsY3MgY29tcGFyaXNvbiBtYXRyaXggZGVzY3JpYmluZyB0aGUgZGlmZmVyZW5jZXNcbiAqIGJldHdlZW4gdHdvIGFycmF5LWxpa2Ugc2VxdWVuY2VzXG4gKiBAcGFyYW0ge2FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEBwYXJhbSB7YXJyYXl9IGIgYXJyYXktbGlrZVxuICogQHJldHVybnMge29iamVjdH0gbGNzIGRlc2NyaXB0b3IsIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHJlZHVjZSgpXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuXHR2YXIgY29scyA9IGEubGVuZ3RoO1xuXHR2YXIgcm93cyA9IGIubGVuZ3RoO1xuXG5cdHZhciBwcmVmaXggPSBmaW5kUHJlZml4KGEsIGIpO1xuXHR2YXIgc3VmZml4ID0gcHJlZml4IDwgY29scyAmJiBwcmVmaXggPCByb3dzXG5cdFx0PyBmaW5kU3VmZml4KGEsIGIsIHByZWZpeClcblx0XHQ6IDA7XG5cblx0dmFyIHJlbW92ZSA9IHN1ZmZpeCArIHByZWZpeCAtIDE7XG5cdGNvbHMgLT0gcmVtb3ZlO1xuXHRyb3dzIC09IHJlbW92ZTtcblx0dmFyIG1hdHJpeCA9IGNyZWF0ZU1hdHJpeChjb2xzLCByb3dzKTtcblxuXHRmb3IgKHZhciBqID0gY29scyAtIDE7IGogPj0gMDsgLS1qKSB7XG5cdFx0Zm9yICh2YXIgaSA9IHJvd3MgLSAxOyBpID49IDA7IC0taSkge1xuXHRcdFx0bWF0cml4W2ldW2pdID0gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgcHJlZml4LCBqLCBpKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHByZWZpeDogcHJlZml4LFxuXHRcdG1hdHJpeDogbWF0cml4LFxuXHRcdHN1ZmZpeDogc3VmZml4XG5cdH07XG59XG5cbi8qKlxuICogUmVkdWNlIGEgc2V0IG9mIGxjcyBjaGFuZ2VzIHByZXZpb3VzbHkgY3JlYXRlZCB1c2luZyBjb21wYXJlXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB0eXBlOm51bWJlciwgaTpudW1iZXIsIGo6bnVtYmVyKX0gZlxuICogIHJlZHVjZXIgZnVuY3Rpb24sIHdoZXJlOlxuICogIC0gcmVzdWx0IGlzIHRoZSBjdXJyZW50IHJlZHVjZSB2YWx1ZSxcbiAqICAtIHR5cGUgaXMgdGhlIHR5cGUgb2YgY2hhbmdlOiBBREQsIFJFTU9WRSwgb3IgU0tJUFxuICogIC0gaSBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBiXG4gKiAgLSBqIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGFcbiAqIEBwYXJhbSB7Kn0gciBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzIHJlc3VsdHMgcmV0dXJuZWQgYnkgY29tcGFyZSgpXG4gKiBAcmV0dXJucyB7Kn0gdGhlIGZpbmFsIHJlZHVjZWQgdmFsdWVcbiAqL1xuZnVuY3Rpb24gcmVkdWNlKGYsIHIsIGxjcykge1xuXHR2YXIgaSwgaiwgaywgb3A7XG5cblx0dmFyIG0gPSBsY3MubWF0cml4O1xuXG5cdC8vIFJlZHVjZSBzaGFyZWQgcHJlZml4XG5cdHZhciBsID0gbGNzLnByZWZpeDtcblx0Zm9yKGkgPSAwO2kgPCBsOyArK2kpIHtcblx0XHRyID0gZihyLCBTS0lQLCBpLCBpKTtcblx0fVxuXG5cdC8vIFJlZHVjZSBsb25nZXN0IGNoYW5nZSBzcGFuXG5cdGsgPSBpO1xuXHRsID0gbS5sZW5ndGg7XG5cdGkgPSAwO1xuXHRqID0gMDtcblx0d2hpbGUoaSA8IGwpIHtcblx0XHRvcCA9IG1baV1bal0udHlwZTtcblx0XHRyID0gZihyLCBvcCwgaStrLCBqK2spO1xuXG5cdFx0c3dpdGNoKG9wKSB7XG5cdFx0XHRjYXNlIFNLSVA6ICArK2k7ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIFJJR0hUOiArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBET1dOOiAgKytpOyBicmVhaztcblx0XHR9XG5cdH1cblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHN1ZmZpeFxuXHRpICs9IGs7XG5cdGogKz0gaztcblx0bCA9IGxjcy5zdWZmaXg7XG5cdGZvcihrID0gMDtrIDwgbDsgKytrKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaStrLCBqK2spO1xuXHR9XG5cblx0cmV0dXJuIHI7XG59XG5cbmZ1bmN0aW9uIGZpbmRQcmVmaXgoYSwgYikge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBsID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcblx0d2hpbGUoaSA8IGwgJiYgYVtpXSA9PT0gYltpXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZmluZFN1ZmZpeChhLCBiKSB7XG5cdHZhciBhbCA9IGEubGVuZ3RoIC0gMTtcblx0dmFyIGJsID0gYi5sZW5ndGggLSAxO1xuXHR2YXIgbCA9IE1hdGgubWluKGFsLCBibCk7XG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgYVthbC1pXSA9PT0gYltibC1pXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgc3RhcnQsIGosIGkpIHtcblx0aWYgKGFbaitzdGFydF0gPT09IGJbaStzdGFydF0pIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqICsgMV0udmFsdWUsIHR5cGU6IFNLSVAgfTtcblx0fVxuXHRpZiAobWF0cml4W2ldW2ogKyAxXS52YWx1ZSA8IG1hdHJpeFtpICsgMV1bal0udmFsdWUpIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2ldW2ogKyAxXS52YWx1ZSArIDEsIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqXS52YWx1ZSArIDEsIHR5cGU6IERPV04gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWF0cml4IChjb2xzLCByb3dzKSB7XG5cdHZhciBtID0gW10sIGksIGosIGxhc3Ryb3c7XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCByb3dcblx0bGFzdHJvdyA9IG1bcm93c10gPSBbXTtcblx0Zm9yIChqID0gMDsgajxjb2xzOyArK2opIHtcblx0XHRsYXN0cm93W2pdID0geyB2YWx1ZTogY29scyAtIGosIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNvbFxuXHRmb3IgKGkgPSAwOyBpPHJvd3M7ICsraSkge1xuXHRcdG1baV0gPSBbXTtcblx0XHRtW2ldW2NvbHNdID0geyB2YWx1ZTogcm93cyAtIGksIHR5cGU6IERPV04gfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY2VsbFxuXHRtW3Jvd3NdW2NvbHNdID0geyB2YWx1ZTogMCwgdHlwZTogU0tJUCB9O1xuXG5cdHJldHVybiBtO1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIGRlZXBFcXVhbHMgPSByZXF1aXJlKCcuL2RlZXBFcXVhbHMnKTtcbnZhciBjb21tdXRlUGF0aHMgPSByZXF1aXJlKCcuL2NvbW11dGVQYXRocycpO1xuXG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5cbnZhciBUZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL1Rlc3RGYWlsZWRFcnJvcicpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xudmFyIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgZmluZCA9IGpzb25Qb2ludGVyLmZpbmQ7XG52YXIgcGFyc2VBcnJheUluZGV4ID0ganNvblBvaW50ZXIucGFyc2VBcnJheUluZGV4O1xuXG5leHBvcnRzLnRlc3QgPSB7XG5cdGFwcGx5OiBhcHBseVRlc3QsXG5cdGludmVyc2U6IGludmVydFRlc3QsXG5cdGNvbW11dGU6IGNvbW11dGVUZXN0XG59O1xuXG5leHBvcnRzLmFkZCA9IHtcblx0YXBwbHk6IGFwcGx5QWRkLFxuXHRpbnZlcnNlOiBpbnZlcnRBZGQsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbmV4cG9ydHMucmVtb3ZlID0ge1xuXHRhcHBseTogYXBwbHlSZW1vdmUsXG5cdGludmVyc2U6IGludmVydFJlbW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlbW92ZVxufTtcblxuZXhwb3J0cy5yZXBsYWNlID0ge1xuXHRhcHBseTogYXBwbHlSZXBsYWNlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZXBsYWNlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVwbGFjZVxufTtcblxuZXhwb3J0cy5tb3ZlID0ge1xuXHRhcHBseTogYXBwbHlNb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRNb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlTW92ZVxufTtcblxuZXhwb3J0cy5jb3B5ID0ge1xuXHRhcHBseTogYXBwbHlDb3B5LFxuXHRpbnZlcnNlOiBub3RJbnZlcnRpYmxlLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgdGVzdCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0IHRlc3Qgb3BlcmF0aW9uXG4gKiBAdGhyb3dzIHtUZXN0RmFpbGVkRXJyb3J9IGlmIHRoZSB0ZXN0IG9wZXJhdGlvbiBmYWlsc1xuICovXG5cbmZ1bmN0aW9uIGFwcGx5VGVzdCh4LCB0ZXN0LCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCB0ZXN0LnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIHRlc3QuY29udGV4dCk7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblx0dmFyIGluZGV4LCB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRpbmRleCA9IHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSk7XG5cdFx0Ly9pbmRleCA9IGZpbmRJbmRleChvcHRpb25zLmZpbmRDb250ZXh0LCBpbmRleCwgdGFyZ2V0LCB0ZXN0LmNvbnRleHQpO1xuXHRcdHZhbHVlID0gdGFyZ2V0W2luZGV4XTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHBvaW50ZXIua2V5ID09PSB2b2lkIDAgPyBwb2ludGVyLnRhcmdldCA6IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0fVxuXG5cdGlmKCFkZWVwRXF1YWxzKHZhbHVlLCB0ZXN0LnZhbHVlKSkge1xuXHRcdHRocm93IG5ldyBUZXN0RmFpbGVkRXJyb3IoJ3Rlc3QgZmFpbGVkICcgKyBKU09OLnN0cmluZ2lmeSh0ZXN0KSk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuLyoqXG4gKiBJbnZlcnQgdGhlIHByb3ZpZGVkIHRlc3QgYW5kIGFkZCBpdCB0byB0aGUgaW52ZXJ0ZWQgcGF0Y2ggc2VxdWVuY2VcbiAqIEBwYXJhbSBwclxuICogQHBhcmFtIHRlc3RcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGludmVydFRlc3QocHIsIHRlc3QpIHtcblx0cHIucHVzaCh0ZXN0KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVUZXN0KHRlc3QsIGIpIHtcblx0aWYodGVzdC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgdGVzdCxyZW1vdmUgLT4gcmVtb3ZlLHRlc3QgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgdGVzdF07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHRlc3QsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGFuIGFkZCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgYWRkIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUFkZCh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWwgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsO1xuXHR9XG5cblx0X2FkZChwb2ludGVyLCB2YWwpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX2FkZChwb2ludGVyLCB2YWx1ZSkge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0Ly8gJy0nIGluZGljYXRlcyAnYXBwZW5kJyB0byBhcnJheVxuXHRcdGlmKHBvaW50ZXIua2V5ID09PSAnLScpIHtcblx0XHRcdHRhcmdldC5wdXNoKHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LnNwbGljZShwb2ludGVyLmtleSwgMCwgdmFsdWUpO1xuXHRcdH1cblx0fSBlbHNlIGlmKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiBhZGQgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXkgJyArIHBvaW50ZXIua2V5KTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRBZGQocHIsIGFkZCkge1xuXHR2YXIgY29udGV4dCA9IGFkZC5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKGFkZC52YWx1ZSwgY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IGFkZC5wYXRoLCB2YWx1ZTogYWRkLnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBhZGQucGF0aCwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVBZGRPckNvcHkoYWRkLCBiKSB7XG5cdGlmKGFkZC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgYWRkLHJlbW92ZSAtPiByZW1vdmUsYWRkIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMoYWRkLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlcGxhY2Ugb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlcGxhY2Ugb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVwbGFjZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgbWlzc2luZ1ZhbHVlKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsdWUgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydFJlcGxhY2UocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZXBsYWNlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhwcmV2LnZhbHVlLCBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBjLnZhbHVlIH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZXBsYWNlKHJlcGxhY2UsIGIpIHtcblx0aWYocmVwbGFjZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgcmVwbGFjZSxyZW1vdmUgLT4gcmVtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgcmVwbGFjZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlcGxhY2UsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZW1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHQvLyBrZXkgbXVzdCBleGlzdCBmb3IgcmVtb3ZlXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHRfcmVtb3ZlKHBvaW50ZXIpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZSAocG9pbnRlcikge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0dmFyIHJlbW92ZWQ7XG5cdGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0LnNwbGljZShwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpLCAxKTtcblx0XHRyZXR1cm4gcmVtb3ZlZFswXTtcblxuXHR9IGVsc2UgaWYgKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdGRlbGV0ZSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdHJldHVybiByZW1vdmVkO1xuXG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgcmVtb3ZlIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVtb3ZlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVtb3ZlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVtb3ZlKHJlbW92ZSwgYikge1xuXHRpZihyZW1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIFtiLCByZW1vdmVdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZW1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlNb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHRpZihqc29uUG9pbnRlci5jb250YWlucyhjaGFuZ2UucGF0aCwgY2hhbmdlLmZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdtb3ZlLmZyb20gY2Fubm90IGJlIGFuY2VzdG9yIG9mIG1vdmUucGF0aCcpO1xuXHR9XG5cblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRfYWRkKHB0bywgX3JlbW92ZShwZnJvbSkpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0TW92ZShwciwgYykge1xuXHRwci5wdXNoKHsgb3A6ICdtb3ZlJyxcblx0XHRwYXRoOiBjLmZyb20sIGNvbnRleHQ6IGMuZnJvbUNvbnRleHQsXG5cdFx0ZnJvbTogYy5wYXRoLCBmcm9tQ29udGV4dDogYy5jb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1vdmUobW92ZSwgYikge1xuXHRpZihtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBtb3ZlLHJlbW92ZSAtPiBtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIGNvcHkgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGNvcHkgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5Q29weSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwZnJvbSkgfHwgbWlzc2luZ1ZhbHVlKHBmcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignY29weS5mcm9tIG11c3QgZXhpc3QnKTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwZnJvbS50YXJnZXQ7XG5cdHZhciB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwYXJzZUFycmF5SW5kZXgocGZyb20ua2V5KV07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGZyb20ua2V5XTtcblx0fVxuXG5cdF9hZGQocHRvLCBjbG9uZSh2YWx1ZSkpO1xuXHRyZXR1cm4geDtcbn1cblxuLy8gTk9URTogQ29weSBpcyBub3QgaW52ZXJ0aWJsZVxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvamlmZi9pc3N1ZXMvOVxuLy8gVGhpcyBuZWVkcyBtb3JlIHRob3VnaHQuIFdlIG1heSBoYXZlIHRvIGV4dGVuZC9hbWVuZCBKU09OIFBhdGNoLlxuLy8gQXQgZmlyc3QgZ2xhbmNlLCB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGp1c3QgYmUgYSByZW1vdmUuXG4vLyBIb3dldmVyLCB0aGF0J3Mgbm90IGNvcnJlY3QuICBJdCB2aW9sYXRlcyB0aGUgaW52b2x1dGlvbjpcbi8vIGludmVydChpbnZlcnQocCkpIH49IHAuICBGb3IgZXhhbXBsZTpcbi8vIGludmVydChjb3B5KSAtPiByZW1vdmVcbi8vIGludmVydChyZW1vdmUpIC0+IGFkZFxuLy8gdGh1czogaW52ZXJ0KGludmVydChjb3B5KSkgLT4gYWRkIChET0ghIHRoaXMgc2hvdWxkIGJlIGNvcHkhKVxuXG5mdW5jdGlvbiBub3RJbnZlcnRpYmxlKF8sIGMpIHtcblx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0ICcgKyBjLm9wKTtcbn1cblxuZnVuY3Rpb24gbm90Rm91bmQgKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIgPT09IHZvaWQgMCB8fCAocG9pbnRlci50YXJnZXQgPT0gbnVsbCAmJiBwb2ludGVyLmtleSAhPT0gdm9pZCAwKTtcbn1cblxuZnVuY3Rpb24gbWlzc2luZ1ZhbHVlKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIua2V5ICE9PSB2b2lkIDAgJiYgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDA7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgeCBpcyBhIG5vbi1udWxsIG9iamVjdFxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59XG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xyXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXHJcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXHJcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xyXG5Mb2NhbEZpbGVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2FsLWZpbGUtcHJvdmlkZXInXHJcblxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkQ29udGVudFxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9saXN0ZW5lcnMgPSBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuICAgIEBwcm92aWRlcnMgPSB7fVxyXG5cclxuICBzZXRBcHBPcHRpb25zOiAoQGFwcE9wdGlvbnMgPSB7fSktPlxyXG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xyXG4gICAgYWxsUHJvdmlkZXJzID0ge31cclxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlciwgTG9jYWxGaWxlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zLCBAXHJcbiAgICAgICAgICBAcHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV0gPSBwcm92aWRlclxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcclxuICAgIEBfc2V0U3RhdGUgYXZhaWxhYmxlUHJvdmlkZXJzOiBhdmFpbGFibGVQcm92aWRlcnNcclxuXHJcbiAgICAjIGFkZCBzaW5nbGV0b24gc2hhcmVQcm92aWRlciwgaWYgaXQgZXhpc3RzXHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5jYW4gJ3NoYXJlJ1xyXG4gICAgICAgIEBfc2V0U3RhdGUgc2hhcmVQcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICBicmVha1xyXG5cclxuICAgIEBhcHBPcHRpb25zLnVpIG9yPSB7fVxyXG4gICAgQGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTdWZmaXggb3I9IGRvY3VtZW50LnRpdGxlXHJcbiAgICBAYXBwT3B0aW9ucy51aS53aW5kb3dUaXRsZVNlcGFyYXRvciBvcj0gJyAtICdcclxuICAgIEBfc2V0V2luZG93VGl0bGUoKVxyXG5cclxuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxyXG5cclxuICAgICMgY2hlY2sgZm9yIGF1dG9zYXZlXHJcbiAgICBpZiBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcbiAgICAgIEBhdXRvU2F2ZSBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcblxyXG4gICAgIyBpbml0aWFsaXplIHRoZSBjbG91ZENvbnRlbnRGYWN0b3J5IHdpdGggYWxsIGRhdGEgd2Ugd2FudCBpbiB0aGUgZW52ZWxvcGVcclxuICAgIGNsb3VkQ29udGVudEZhY3Rvcnkuc2V0RW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBhcHBOYW1lOiBAYXBwT3B0aW9ucy5hcHBOYW1lIG9yIFwiXCJcclxuICAgICAgYXBwVmVyc2lvbjogQGFwcE9wdGlvbnMuYXBwVmVyc2lvbiBvciBcIlwiXHJcbiAgICAgIGFwcEJ1aWxkTnVtOiBAYXBwT3B0aW9ucy5hcHBCdWlsZE51bSBvciBcIlwiXHJcblxyXG4gICAgQG5ld0ZpbGVPcGVuc0luTmV3VGFiID0gaWYgQGFwcE9wdGlvbnMudWk/Lmhhc093blByb3BlcnR5KCduZXdGaWxlT3BlbnNJbk5ld1RhYicpIHRoZW4gQGFwcE9wdGlvbnMudWkubmV3RmlsZU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXHJcblxyXG4gIHNldFByb3ZpZGVyT3B0aW9uczogKG5hbWUsIG5ld09wdGlvbnMpIC0+XHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5uYW1lIGlzIG5hbWVcclxuICAgICAgICBwcm92aWRlci5vcHRpb25zID89IHt9XHJcbiAgICAgICAgZm9yIGtleSBvZiBuZXdPcHRpb25zXHJcbiAgICAgICAgICBwcm92aWRlci5vcHRpb25zW2tleV0gPSBuZXdPcHRpb25zW2tleV1cclxuICAgICAgICBicmVha1xyXG5cclxuICBjb25uZWN0OiAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgbGlzdGVuOiAobGlzdGVuZXIpIC0+XHJcbiAgICBpZiBsaXN0ZW5lclxyXG4gICAgICBAX2xpc3RlbmVycy5wdXNoIGxpc3RlbmVyXHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5wcmVwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLnJlcGxhY2VNZW51SXRlbSBrZXksIGl0ZW07IEBcclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQmVmb3JlIGtleSwgaXRlbTsgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUFmdGVyIGtleSwgaXRlbTsgQFxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBcIlwiXHJcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnLCB7Y29udGVudDogXCJcIn1cclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBuZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiBAX2dldEN1cnJlbnRVcmwoKSwgJ19ibGFuaydcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XHJcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgQHNhdmUoKVxyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5ORVdfRklMRSdcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBuZXdGaWxlKClcclxuXHJcbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2xvYWQnXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX0sIEBfZ2V0SGFzaFBhcmFtcyBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAb3BlbkZpbGVEaWFsb2cgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiAobm90IEBzdGF0ZS5kaXJ0eSkgb3IgKGNvbmZpcm0gdHIgJ35DT05GSVJNLk9QRU5fRklMRScpXHJcbiAgICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIEBvcGVuRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgb3BlblNoYXJlZENvbnRlbnQ6IChpZCkgLT5cclxuICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPy5sb2FkU2hhcmVkQ29udGVudCBpZCwgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XHJcbiAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge292ZXJ3cml0YWJsZTogZmFsc2UsIG9wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cclxuXHJcbiAgb3BlblByb3ZpZGVyRmlsZTogKHByb3ZpZGVyTmFtZSwgcHJvdmlkZXJQYXJhbXMpIC0+XHJcbiAgICBwcm92aWRlciA9IEBwcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgaWYgcHJvdmlkZXJcclxuICAgICAgcHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgICBpZiBhdXRob3JpemVkXHJcbiAgICAgICAgICBwcm92aWRlci5vcGVuU2F2ZWQgcHJvdmlkZXJQYXJhbXMsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9LCBAX2dldEhhc2hQYXJhbXMgbWV0YWRhdGFcclxuXHJcbiAgc2F2ZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpID0+XHJcbiAgICAgIEBzYXZlQ29udGVudCBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29udGVudDogKHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGU6IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXHJcbiAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLnNhdmUgY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgaWYgQHN0YXRlLm1ldGFkYXRhIGlzbnQgbWV0YWRhdGFcclxuICAgICAgICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCB7c2F2ZWQ6IHRydWV9LCBAX2dldEhhc2hQYXJhbXMgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY3VycmVudENvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVBc0RpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgY3JlYXRlQ29weTogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBzYXZlQW5kT3BlbkNvcHkgPSAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgQHNhdmVDb3BpZWRGaWxlIHN0cmluZ0NvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgKGVyciwgY29weVBhcmFtcykgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2s/IGVyciBpZiBlcnJcclxuICAgICAgICB3aW5kb3cub3BlbiBAX2dldEN1cnJlbnRVcmwgXCIjY29weT0je2NvcHlQYXJhbXN9XCJcclxuICAgICAgICBjYWxsYmFjaz8gY29weVBhcmFtc1xyXG4gICAgaWYgc3RyaW5nQ29udGVudCBpcyBudWxsXHJcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpIC0+XHJcbiAgICAgICAgc2F2ZUFuZE9wZW5Db3B5IHN0cmluZ0NvbnRlbnRcclxuICAgIGVsc2VcclxuICAgICAgc2F2ZUFuZE9wZW5Db3B5IHN0cmluZ0NvbnRlbnRcclxuXHJcbiAgc2F2ZUNvcGllZEZpbGU6IChzdHJpbmdDb250ZW50LCBuYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBwcmVmaXggPSAnY2ZtLWNvcHk6OidcclxuICAgICAgbWF4Q29weU51bWJlciA9IDBcclxuICAgICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgICBjb3B5TnVtYmVyID0gcGFyc2VJbnQoa2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKSwgMTApXHJcbiAgICAgICAgICBtYXhDb3B5TnVtYmVyID0gTWF0aC5tYXgobWF4Q29weU51bWJlciwgY29weU51bWJlcilcclxuICAgICAgbWF4Q29weU51bWJlcisrXHJcbiAgICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnlcclxuICAgICAgICBuYW1lOiBpZiBuYW1lPy5sZW5ndGggPiAwIHRoZW4gXCJDb3B5IG9mICN7bmFtZX1cIiBlbHNlIFwiQ29weSBvZiBVbnRpdGxlZCBEb2N1bWVudFwiXHJcbiAgICAgICAgc3RyaW5nQ29udGVudDogc3RyaW5nQ29udGVudFxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gXCIje3ByZWZpeH0je21heENvcHlOdW1iZXJ9XCIsIHZhbHVlXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsLCBtYXhDb3B5TnVtYmVyXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHRlbXBvcmFyaWx5IHNhdmUgY29waWVkIGZpbGVcIlxyXG5cclxuICBvcGVuQ29waWVkRmlsZTogKGNvcHlQYXJhbXMpIC0+XHJcbiAgICB0cnlcclxuICAgICAga2V5ID0gXCJjZm0tY29weTo6I3tjb3B5UGFyYW1zfVwiXHJcbiAgICAgIGNvcGllZCA9IEpTT04ucGFyc2Ugd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIGtleVxyXG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgY29waWVkLnN0cmluZ0NvbnRlbnRcclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgIG5hbWU6IGNvcGllZC5uYW1lXHJcbiAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge2RpcnR5OiB0cnVlLCBvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gXCJcIlxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0ga2V5XHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgY29waWVkIGZpbGVcIlxyXG5cclxuICBzaGFyZUdldExpbms6IC0+XHJcbiAgICBzaG93U2hhcmVEaWFsb2cgPSAoc2hhcmVkRG9jdW1lbnRJZCkgPT5cclxuICAgICAgQF91aS5zaGFyZVVybERpYWxvZyBAX2dldEN1cnJlbnRVcmwgXCIjc2hhcmVkPSN7c2hhcmVkRG9jdW1lbnRJZH1cIlxyXG5cclxuICAgIHNoYXJlZERvY3VtZW50SWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldCBcInNoYXJlZERvY3VtZW50SWRcIlxyXG4gICAgaWYgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2hhcmUgKHNoYXJlZERvY3VtZW50SWQpID0+XHJcbiAgICAgICAgQGRpcnR5KClcclxuICAgICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxyXG5cclxuICBzaGFyZVVwZGF0ZTogLT5cclxuICAgIEBzaGFyZSgpXHJcblxyXG4gIHNoYXJlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAc3RhdGUuc2hhcmVQcm92aWRlclxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICAgIHNoYXJpbmc6IHRydWVcclxuICAgICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2hhcmUgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxyXG4gICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NoYXJlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjaz8gc2hhcmVkQ29udGVudElkXHJcblxyXG4gIHJldmVydFRvU2hhcmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgIGlmIGlkIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQHN0YXRlLmN1cnJlbnRDb250ZW50LmNvcHlNZXRhZGF0YVRvIGNvbnRlbnRcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IG51bGxcclxuXHJcbiAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIikgYW5kIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPyBhbmQgY29uZmlybSB0ciBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIEByZXZlcnRUb1NoYXJlZCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIEBfdWkuZG93bmxvYWREaWFsb2cgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCAoY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgY29udGVudCksIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIGRpcnR5ID0gQHN0YXRlLmRpcnR5XHJcbiAgICBfcmVuYW1lID0gKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgQF9maWxlQ2hhbmdlZCAncmVuYW1lZEZpbGUnLCBAc3RhdGUuY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCB7ZGlydHk6IGRpcnR5fSwgQF9nZXRIYXNoUGFyYW1zIG1ldGFkYXRhXHJcbiAgICAgIGNhbGxiYWNrPyBuZXdOYW1lXHJcbiAgICBpZiBuZXdOYW1lIGlzbnQgQHN0YXRlLm1ldGFkYXRhPy5uYW1lXHJcbiAgICAgIGlmIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAncmVuYW1lJ1xyXG4gICAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5yZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCAoZXJyLCBtZXRhZGF0YSkgPT5cclxuICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICBfcmVuYW1lIG1ldGFkYXRhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBtZXRhZGF0YVxyXG4gICAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IG5ld05hbWVcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgX3JlbmFtZSBtZXRhZGF0YVxyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICBAcmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2tcclxuXHJcbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIEBzdGF0ZS5vcGVuZWRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBAc3RhdGUub3BlbmVkQ29udGVudC5jbG9uZSgpfVxyXG5cclxuICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBpZiBjb25maXJtIHRyICd+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORUQnXHJcbiAgICAgICAgQHJldmVydFRvTGFzdE9wZW5lZCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsP1xyXG5cclxuICBzaG93QmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XHJcbiAgICBAX3VpLmJsb2NraW5nTW9kYWwgbW9kYWxQcm9wc1xyXG5cclxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEsIGFkZGl0aW9uYWxTdGF0ZT17fSwgaGFzaFBhcmFtcz1udWxsKSAtPlxyXG4gICAgbWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSA/PSB0cnVlXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGN1cnJlbnRDb250ZW50OiBjb250ZW50XHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIGFkZGl0aW9uYWxTdGF0ZVxyXG4gICAgICBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfc2V0V2luZG93VGl0bGUgbWV0YWRhdGE/Lm5hbWVcclxuICAgIGlmIGhhc2hQYXJhbXMgaXNudCBudWxsXHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaFBhcmFtc1xyXG4gICAgQF9zZXRTdGF0ZSBzdGF0ZVxyXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudD8uZ2V0VGV4dCgpfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgZm9yIGxpc3RlbmVyIGluIEBfbGlzdGVuZXJzXHJcbiAgICAgIGxpc3RlbmVyIGV2ZW50XHJcblxyXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xyXG4gICAgICBAc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXHJcblxyXG4gIF9yZXNldFN0YXRlOiAtPlxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBvcGVuZWRDb250ZW50OiBudWxsXHJcbiAgICAgIGN1cnJlbnRDb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG4gIF9jbG9zZUN1cnJlbnRGaWxlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdjbG9zZSdcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmNsb3NlIEBzdGF0ZS5tZXRhZGF0YVxyXG5cclxuICBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudDogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5jdXJyZW50Q29udGVudD9cclxuICAgICAgY3VycmVudENvbnRlbnQgPSBAc3RhdGUuY3VycmVudENvbnRlbnRcclxuICAgICAgY3VycmVudENvbnRlbnQuc2V0VGV4dCBzdHJpbmdDb250ZW50XHJcbiAgICBlbHNlXHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgc3RyaW5nQ29udGVudFxyXG4gICAgaWYgbWV0YWRhdGE/XHJcbiAgICAgIGN1cnJlbnRDb250ZW50LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgIGN1cnJlbnRDb250ZW50XHJcblxyXG4gIF9nZXRDdXJyZW50VXJsOiAocXVlcnlTdHJpbmcgPSBudWxsKSAtPlxyXG4gICAgc3VmZml4ID0gaWYgcXVlcnlTdHJpbmc/IHRoZW4gXCI/I3txdWVyeVN0cmluZ31cIiBlbHNlIFwiXCJcclxuICAgIFwiI3tkb2N1bWVudC5sb2NhdGlvbi5vcmlnaW59I3tkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0je3N1ZmZpeH1cIlxyXG5cclxuICBfc2V0V2luZG93VGl0bGU6IChuYW1lKSAtPlxyXG4gICAgaWYgQGFwcE9wdGlvbnM/LnVpPy53aW5kb3dUaXRsZVN1ZmZpeFxyXG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiI3tpZiBuYW1lPy5sZW5ndGggPiAwIHRoZW4gbmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpfSN7QGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTZXBhcmF0b3J9I3tAYXBwT3B0aW9ucy51aS53aW5kb3dUaXRsZVN1ZmZpeH1cIlxyXG5cclxuICBfZ2V0SGFzaFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW5PcGVuU2F2ZWQoKSB0aGVuIFwiI2ZpbGU9I3ttZXRhZGF0YS5wcm92aWRlci5uYW1lfToje2VuY29kZVVSSUNvbXBvbmVudCBtZXRhZGF0YS5wcm92aWRlci5nZXRPcGVuU2F2ZWRQYXJhbXMgbWV0YWRhdGF9XCIgZWxzZSBcIlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbmRvY3VtZW50U3RvcmUgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tXCJcclxuYXV0aG9yaXplVXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxyXG5jaGVja0xvZ2luVXJsICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2luZm9cIlxyXG5saXN0VXJsICAgICAgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9hbGxcIlxyXG5sb2FkRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9vcGVuXCJcclxuc2F2ZURvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvc2F2ZVwiXHJcbnBhdGNoRG9jdW1lbnRVcmwgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3BhdGNoXCJcclxucmVtb3ZlRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvZGVsZXRlXCJcclxucmVuYW1lRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcmVuYW1lXCJcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuamlmZiA9IHJlcXVpcmUgJ2ppZmYnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBkb2NTdG9yZUF2YWlsYWJsZTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9vbkRvY1N0b3JlTG9hZGVkID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtYXV0aCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1jb25jb3JkLWxvZ28nfSwgJycpXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWZvb3Rlcid9LFxyXG4gICAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdMb2dpbiB0byBDb25jb3JkJylcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAnVHJ5aW5nIHRvIGxvZyBpbnRvIENvbmNvcmQuLi4nXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBzaGFyZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICAgIEB1c2VyID0gbnVsbFxyXG5cclxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXHJcblxyXG4gIHByZXZpb3VzbHlTYXZlZENvbnRlbnQ6IG51bGxcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEB1c2VyXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgZWxzZVxyXG4gICAgICBAdXNlciBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAtPlxyXG4gICAgQF9zaG93TG9naW5XaW5kb3coKVxyXG5cclxuICBfb25Eb2NTdG9yZUxvYWRlZDogKEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQF9kb2NTdG9yZUxvYWRlZFxyXG4gICAgICBAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpblN1Y2Nlc3NmdWw6IChAdXNlcikgLT5cclxuICAgIEBfbG9naW5XaW5kb3c/LmNsb3NlKClcclxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG5cclxuICBfY2hlY2tMb2dpbjogLT5cclxuICAgIHByb3ZpZGVyID0gQFxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luV2luZG93OiBudWxsXHJcblxyXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XHJcbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcclxuICAgICAgQF9sb2dpbldpbmRvdy5mb2N1cygpXHJcbiAgICBlbHNlXHJcblxyXG4gICAgICBjb21wdXRlU2NyZWVuTG9jYXRpb24gPSAodywgaCkgLT5cclxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcclxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxyXG4gICAgICAgIHdpZHRoICA9IHdpbmRvdy5pbm5lcldpZHRoICBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIG9yIHNjcmVlbi53aWR0aFxyXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcclxuXHJcbiAgICAgICAgbGVmdCA9ICgod2lkdGggLyAyKSAtICh3IC8gMikpICsgc2NyZWVuTGVmdFxyXG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxyXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxyXG5cclxuICAgICAgd2lkdGggPSAxMDAwXHJcbiAgICAgIGhlaWdodCA9IDQ4MFxyXG4gICAgICBwb3NpdGlvbiA9IGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiB3aWR0aCwgaGVpZ2h0XHJcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xyXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcclxuICAgICAgICAnaGVpZ2h0PScgKyBoZWlnaHRcclxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXHJcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXHJcbiAgICAgICAgJ2RlcGVuZGVudD15ZXMnXHJcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcclxuICAgICAgICAnbG9jYXRpb249bm8nXHJcbiAgICAgICAgJ2RpYWxvZz15ZXMnXHJcbiAgICAgICAgJ21lbnViYXI9bm8nXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxyXG5cclxuICAgICAgcG9sbEFjdGlvbiA9ID0+XHJcbiAgICAgICAgdHJ5XHJcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICAgICAgICBpZiAoaHJlZiBpcyB3aW5kb3cubG9jYXRpb24uaHJlZilcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXHJcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxyXG4gICAgICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgICAgIGNhdGNoIGVcclxuICAgICAgICAgICMgY29uc29sZS5sb2cgZVxyXG5cclxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBsaXN0VXJsXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3Igb3duIGtleSwgZmlsZSBvZiBkYXRhXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YToge2lkOiBmaWxlLmlkfVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXHJcblxyXG4gIGxvYWRTaGFyZWRDb250ZW50OiAoaWQsIGNhbGxiYWNrKSAtPlxyXG4gICAgc2hhcmVkTWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICBzaGFyZWRDb250ZW50SWQ6IGlkXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBvdmVyd3JpdGFibGU6IGZhbHNlXHJcbiAgICBAbG9hZCBzaGFyZWRNZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBzaGFyZWRNZXRhZGF0YVxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgd2l0aENyZWRlbnRpYWxzID0gdW5sZXNzIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZCB0aGVuIHRydWUgZWxzZSBmYWxzZVxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWQgb3IgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHt3aXRoQ3JlZGVudGlhbHN9XHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBkYXRhXHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPz0gZGF0YS5kb2NOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBtZXNzYWdlID0gaWYgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkIGRvY3VtZW50ICcje21ldGFkYXRhLnNoYXJlZENvbnRlbnRJZH0nLiBQZXJoYXBzIHRoZSBmaWxlIHdhcyBub3Qgc2hhcmVkP1wiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgXCJVbmFibGUgdG8gbG9hZCAje21ldGFkYXRhLm5hbWUgb3IgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZCBvciAnZmlsZSd9XCJcclxuICAgICAgICBjYWxsYmFjayBtZXNzYWdlXHJcblxyXG4gIHNoYXJlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcnVuS2V5ID0gY29udGVudC5nZXQoXCJzaGFyZUVkaXRLZXlcIikgb3IgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpXHJcblxyXG4gICAgcGFyYW1zID1cclxuICAgICAgcnVuS2V5OiBydW5LZXlcclxuXHJcbiAgICBpZiBjb250ZW50LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgcGFyYW1zLnJlY29yZGlkID0gY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcblxyXG4gICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICBfcGVybWlzc2lvbnM6IDFcclxuICAgICAgc2hhcmVFZGl0S2V5OiBudWxsICAgICAgICAgICAgIyBzdHJpcCB0aGVzZSBvdXQgb2YgdGhlIHNoYXJlZCBkYXRhIGlmIHRoZXlcclxuICAgICAgc2hhcmVkRG9jdW1lbnRJZDogbnVsbCAgICAgICAgIyBleGlzdCAodGhleSdsbCBiZSByZS1hZGRlZCBvbiBzdWNjZXNzKVxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHNhdmVEb2N1bWVudFVybCwgcGFyYW1zKVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICAgICAgc2hhcmVkRG9jdW1lbnRJZDogZGF0YS5pZFxyXG4gICAgICAgICAgc2hhcmVFZGl0S2V5OiBydW5LZXlcclxuICAgICAgICAgIF9wZXJtaXNzaW9uczogMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGEuaWRcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHNhdmU6IChjbG91ZENvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnQuZ2V0Q29udGVudCgpXHJcblxyXG4gICAgcGFyYW1zID0ge31cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG5cclxuICAgICMgU2VlIGlmIHdlIGNhbiBwYXRjaFxyXG4gICAgY2FuT3ZlcndyaXRlID0gbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudD9cclxuICAgIGlmIGNhbk92ZXJ3cml0ZSBhbmQgZGlmZiA9IEBfY3JlYXRlRGlmZiBAcHJldmlvdXNseVNhdmVkQ29udGVudC5nZXRDb250ZW50KCksIGNvbnRlbnRcclxuICAgICAgc2VuZENvbnRlbnQgPSBkaWZmXHJcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcclxuICAgIGVsc2VcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxyXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcclxuICAgICAgc2VuZENvbnRlbnQgPSBjb250ZW50XHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkgc2VuZENvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjbG91ZENvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXHJcblxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBvcGVuU2F2ZWQ6IChvcGVuU2F2ZWRQYXJhbXMsIGNhbGxiYWNrKSAtPlxyXG4gICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcclxuICAgIEBsb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxyXG4gICAgICBjYWxsYmFjayBlcnIsIGNvbnRlbnQsIG1ldGFkYXRhXHJcblxyXG4gIGdldE9wZW5TYXZlZFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcblxyXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cclxuICAgIHJldHVybiB1cmwgdW5sZXNzIHBhcmFtc1xyXG4gICAga3ZwID0gW11cclxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xyXG4gICAgICBrdnAucHVzaCBba2V5LCB2YWx1ZV0ubWFwKGVuY29kZVVSSSkuam9pbiBcIj1cIlxyXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcclxuXHJcbiAgX2NyZWF0ZURpZmY6IChvYmoxLCBvYmoyKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIG9wdHMgPVxyXG4gICAgICAgIGhhc2g6IEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpZiB0eXBlb2YgQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlzIFwiZnVuY3Rpb25cIlxyXG4gICAgICAjIGNsZWFuIG9iamVjdHMgYmVmb3JlIGRpZmZpbmdcclxuICAgICAgY2xlYW5lZE9iajEgPSBKU09OLnBhcnNlIEpTT04uc3RyaW5naWZ5IG9iajFcclxuICAgICAgY2xlYW5lZE9iajIgPSBKU09OLnBhcnNlIEpTT04uc3RyaW5naWZ5IG9iajJcclxuICAgICAgZGlmZiA9IGppZmYuZGlmZihjbGVhbmVkT2JqMSwgY2xlYW5lZE9iajIsIG9wdHMpXHJcbiAgICAgIHJldHVybiBkaWZmXHJcbiAgICBjYXRjaFxyXG4gICAgICByZXR1cm4gbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5qc2RpZmYgPSByZXF1aXJlICdkaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWF1dGgnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWNvbmNvcmQtbG9nbyd9LCAnJylcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWZvb3Rlcid9LFxyXG4gICAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0xvZ2luIHRvIEdvb2dsZScpXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byBHb29nbGUuLi4nXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBjbG9zZTogdHJ1ZVxyXG5cclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAdXNlciA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbGVEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEB1c2VSZWFsVGltZUFQSSA9IEBvcHRpb25zLnVzZVJlYWxUaW1lQVBJIG9yIGZhbHNlXHJcbiAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnLCAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJ11cclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAdXNlciA9IG51bGxcclxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIGdhcGkuY2xpZW50Lm9hdXRoMi51c2VyaW5mby5nZXQoKS5leGVjdXRlICh1c2VyKSA9PlxyXG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxyXG4gICAgaWYgQF9hdXRvUmVuZXdUaW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dCBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxyXG4gICAgICBAX2F1dG9SZW5ld1RpbWVvdXQgPSBzZXRUaW1lb3V0ICg9PiBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFKSwgKHBhcnNlSW50KGF1dGhUb2tlbi5leHBpcmVzX2luLCAxMCkgKiAwLjc1KSAqIDEwMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9zYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBxdWVyeSA9IFwiKChtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nKSBvciAobWltZVR5cGUgPSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicpKSBhbmQgJyN7aWYgbWV0YWRhdGEgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9JyBpbiBwYXJlbnRzXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgICAgb3ZlcndyaXRhYmxlOiBpdGVtLmVkaXRhYmxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICBpZDogaXRlbS5pZFxyXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cclxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBsb3dlckIgPSBiLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMucGF0Y2hcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIHJlc291cmNlOlxyXG4gICAgICAgICAgdGl0bGU6IG5ld05hbWVcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgaWYgcmVzdWx0Py5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2s/IHJlc3VsdC5lcnJvclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ucmVhbFRpbWU/LmRvYz9cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwcm92aWRlcjogQFxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgaWQ6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgQGxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpIC0+XHJcbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XHJcbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcclxuICAgICAgY2FsbGJhY2soKVxyXG4gICAgZWxzZVxyXG4gICAgICBzZWxmID0gQFxyXG4gICAgICBjaGVjayA9IC0+XHJcbiAgICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ29hdXRoMicsICd2MicsIC0+XHJcbiAgICAgICAgICAgICAgZ2FwaS5sb2FkICdkcml2ZS1yZWFsdGltZScsIC0+XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCBzZWxmXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuXHJcbiAgX2xvYWRGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPSBmaWxlLnRpdGxlXHJcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXHJcbiAgICAgICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcclxuICAgICAgICB4aHIub3BlbiAnR0VUJywgZmlsZS5kb3dubG9hZFVybFxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICdBdXRob3JpemF0aW9uJywgXCJCZWFyZXIgI3tAYXV0aFRva2VuLmFjY2Vzc190b2tlbn1cIlxyXG4gICAgICAgIHhoci5vbmxvYWQgPSAtPlxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgeGhyLnJlc3BvbnNlVGV4dFxyXG4gICAgICAgIHhoci5vbmVycm9yID0gLT5cclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXHJcbiAgICAgICAgeGhyLnNlbmQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXHJcblxyXG4gIF9zYXZlRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXHJcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxyXG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgIHBhcmVudHM6IFt7aWQ6IGlmIG1ldGFkYXRhLnBhcmVudD8ucHJvdmlkZXJEYXRhPy5pZD8gdGhlbiBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfV1cclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXHJcbiAgICBdLmpvaW4gJydcclxuXHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxyXG4gICAgICBwYXRoOiBwYXRoXHJcbiAgICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxyXG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxyXG4gICAgICBib2R5OiBib2R5XHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBjYWxsYmFja1xyXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXHJcbiAgICAgICAgZWxzZSBpZiBmaWxlXHJcbiAgICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrIEBfYXBpRXJyb3IgZmlsZSwgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXHJcblxyXG4gIF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBzZWxmID0gQFxyXG4gICAgZmlsZUxvYWRlZCA9IChkb2MpIC0+XHJcbiAgICAgIGNvbnRlbnQgPSBkb2MuZ2V0TW9kZWwoKS5nZXRSb290KCkuZ2V0ICdjb250ZW50J1xyXG4gICAgICBpZiBtZXRhZGF0YS5vdmVyd3JpdGFibGVcclxuICAgICAgICB0aHJvd0Vycm9yID0gKGUpIC0+XHJcbiAgICAgICAgICBpZiBub3QgZS5pc0xvY2FsIGFuZCBlLnNlc3Npb25JZCBpc250IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5zZXNzaW9uSWRcclxuICAgICAgICAgICAgc2VsZi5jbGllbnQuc2hvd0Jsb2NraW5nTW9kYWxcclxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbmN1cnJlbnQgRWRpdCBMb2NrJ1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBbiBlZGl0IHdhcyBtYWRlIHRvIHRoaXMgZmlsZSBmcm9tIGFub3RoZXIgYnJvd3NlciB3aW5kb3cuIFRoaXMgYXBwIGlzIG5vdyBsb2NrZWQgZm9yIGlucHV0LidcclxuICAgICAgICBjb250ZW50LmFkZEV2ZW50TGlzdGVuZXIgZ2FwaS5kcml2ZS5yZWFsdGltZS5FdmVudFR5cGUuVEVYVF9JTlNFUlRFRCwgdGhyb3dFcnJvclxyXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0RFTEVURUQsIHRocm93RXJyb3JcclxuICAgICAgZm9yIGNvbGxhYm9yYXRvciBpbiBkb2MuZ2V0Q29sbGFib3JhdG9ycygpXHJcbiAgICAgICAgc2Vzc2lvbklkID0gY29sbGFib3JhdG9yLnNlc3Npb25JZCBpZiBjb2xsYWJvcmF0b3IuaXNNZVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxyXG4gICAgICAgIGRvYzogZG9jXHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIHNlc3Npb25JZDogc2Vzc2lvbklkXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGNvbnRlbnQuZ2V0VGV4dCgpXHJcblxyXG4gICAgaW5pdCA9IChtb2RlbCkgLT5cclxuICAgICAgY29udGVudCA9IG1vZGVsLmNyZWF0ZVN0cmluZyAnJ1xyXG4gICAgICBtb2RlbC5nZXRSb290KCkuc2V0ICdjb250ZW50JywgY29udGVudFxyXG5cclxuICAgIGVycm9yID0gKGVycikgPT5cclxuICAgICAgaWYgZXJyLnR5cGUgaXMgJ1RPS0VOX1JFRlJFU0hfUkVRVUlSRUQnXHJcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgYWxlcnQgZXJyLm1lc3NhZ2VcclxuXHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgZWxzZVxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuaW5zZXJ0XHJcbiAgICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG5cclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgZmlsZT8uaWRcclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gZmlsZS50aXRsZVxyXG4gICAgICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IGZpbGUuZWRpdGFibGVcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgIGdhcGkuZHJpdmUucmVhbHRpbWUubG9hZCBmaWxlLmlkLCBmaWxlTG9hZGVkLCBpbml0LCBlcnJvclxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGxvYWQgZmlsZSdcclxuXHJcbiAgX3NhdmVSZWFsVGltZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/Lm1vZGVsXHJcbiAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgICAgQF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbCBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaW5kZXggPSAwXHJcbiAgICByZWFsVGltZUNvbnRlbnQgPSBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuY29udGVudFxyXG4gICAgZGlmZnMgPSBqc2RpZmYuZGlmZkNoYXJzIHJlYWxUaW1lQ29udGVudC5nZXRUZXh0KCksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICBmb3IgZGlmZiBpbiBkaWZmc1xyXG4gICAgICBpZiBkaWZmLnJlbW92ZWRcclxuICAgICAgICByZWFsVGltZUNvbnRlbnQucmVtb3ZlUmFuZ2UgaW5kZXgsIGluZGV4ICsgZGlmZi52YWx1ZS5sZW5ndGhcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIGRpZmYuYWRkZWRcclxuICAgICAgICAgIHJlYWxUaW1lQ29udGVudC5pbnNlcnRTdHJpbmcgaW5kZXgsIGRpZmYudmFsdWVcclxuICAgICAgICBpbmRleCArPSBkaWZmLmNvdW50XHJcbiAgICBjYWxsYmFjayBudWxsXHJcblxyXG4gIF9hcGlFcnJvcjogKHJlc3VsdCwgcHJlZml4KSAtPlxyXG4gICAgaWYgcmVzdWx0Py5tZXNzYWdlP1xyXG4gICAgICBcIiN7cHJlZml4fTogI3tyZXN1bHQubWVzc2FnZX1cIlxyXG4gICAgZWxzZVxyXG4gICAgICBwcmVmaXhcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ7ZGl2LCBpbnB1dCwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkxvY2FsRmlsZUxpc3RUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTG9jYWxGaWxlTGlzdFRhYidcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZXMgPSBlLnRhcmdldC5maWxlc1xyXG4gICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICBhbGVydCB0ciBcIn5MT0NBTF9GSUxFX0RJQUxPRy5NVUxUSVBMRV9GSUxFU19TRUxFQ1RFRFwiXHJcbiAgICBlbHNlIGlmIGZpbGVzLmxlbmd0aCBpcyAxXHJcbiAgICAgIEBvcGVuRmlsZSBmaWxlc1swXVxyXG5cclxuICBvcGVuRmlsZTogKGZpbGUpIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IGZpbGUubmFtZS5zcGxpdCgnLicpWzBdXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwYXJlbnQ6IG51bGxcclxuICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgZmlsZTogZmlsZVxyXG4gICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gbWV0YWRhdGFcclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGRyYWdFbnRlcjogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBzZXRTdGF0ZSBob3ZlcjogdHJ1ZVxyXG5cclxuICBkcmFnTGVhdmU6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAc2V0U3RhdGUgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGRyb3A6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBkcm9wcGVkRmlsZXMgPSBpZiBlLmRhdGFUcmFuc2ZlciB0aGVuIGUuZGF0YVRyYW5zZmVyLmZpbGVzIGVsc2UgZS50YXJnZXQuZmlsZXNcclxuICAgIGlmIGRyb3BwZWRGaWxlcy5sZW5ndGggPiAxXHJcbiAgICAgIGFsZXJ0IFwifkxPQ0FMX0ZJTEVfRElBTE9HLk1VTFRJUExFX0ZJTEVTX0RST1BQRURcIlxyXG4gICAgZWxzZSBpZiBkcm9wcGVkRmlsZXMubGVuZ3RoIGlzIDFcclxuICAgICAgQG9wZW5GaWxlIGRyb3BwZWRGaWxlc1swXVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBkcm9wQ2xhc3MgPSBcImRyb3BBcmVhI3tpZiBAc3RhdGUuaG92ZXIgdGhlbiAnIGRyb3BIb3ZlcicgZWxzZSAnJ31cIlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiIGxvY2FsRmlsZUxvYWQnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBkcm9wQ2xhc3MsIG9uRHJhZ0VudGVyOiBAZHJhZ0VudGVyLCBvbkRyYWdMZWF2ZTogQGRyYWdMZWF2ZSwgb25Ecm9wOiBAZHJvcH0sXHJcbiAgICAgICAgKHRyIFwifkxPQ0FMX0ZJTEVfRElBTE9HLkRST1BfRklMRV9IRVJFXCIpXHJcbiAgICAgICAgKGlucHV0IHt0eXBlOiAnZmlsZScsIG9uQ2hhbmdlOiBAY2hhbmdlZH0pXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5jbGFzcyBMb2NhbEZpbGVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsRmlsZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX0ZJTEUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxGaWxlJ1xyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgaWYgY2FwYWJpbGl0eSBpcyAnbGlzdCdcclxuICAgICAgTG9jYWxGaWxlTGlzdFRhYlxyXG4gICAgZWxzZVxyXG4gICAgICBkZWZhdWx0Q29tcG9uZW50XHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAjIG5vIHJlYWxseSBpbXBsZW1lbnRlZCAtIHdlIGZsYWcgaXQgYXMgaW1wbGVtZW50ZWQgc28gd2Ugc2hvdyBpbiB0aGUgbGlzdCBkaWFsb2dcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgIHJlYWRlci5vbmxvYWQgPSAobG9hZGVkKSAtPlxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBsb2FkZWQudGFyZ2V0LnJlc3VsdFxyXG4gICAgcmVhZGVyLnJlYWRBc1RleHQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmZpbGVcclxuXHJcbiAgY2FuT3BlblNhdmVkOiAtPlxyXG4gICAgIyB0aGlzIHByZXZlbnRzIHRoZSBoYXNoIHRvIGJlIHVwZGF0ZWRcclxuICAgIGZhbHNlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsRmlsZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBmaWxlS2V5ID0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgIGNhdGNoIGVcclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgKG1ldGFkYXRhPy5wYXRoKCkgb3IgW10pLmpvaW4gJy8nXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW2ZpbGVuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbmFtZSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IG5hbWVcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byByZW5hbWUnXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcGFyZW50OiBudWxsXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLm5hbWVcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAdHlwZSwgQHByb3ZpZGVyID0gbnVsbCwgQHBhcmVudCA9IG51bGwsIEBwcm92aWRlckRhdGE9e30sIEBvdmVyd3JpdGFibGUsIEBzaGFyZWRDb250ZW50SWQsIEBzaGFyZWRDb250ZW50U2VjcmV0S2V5fSA9IG9wdGlvbnNcclxuICBARm9sZGVyOiAnZm9sZGVyJ1xyXG4gIEBGaWxlOiAnZmlsZSdcclxuXHJcbiAgcGF0aDogLT5cclxuICAgIF9wYXRoID0gW11cclxuICAgIHBhcmVudCA9IEBwYXJlbnRcclxuICAgIHdoaWxlIHBhcmVudCBpc250IG51bGxcclxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcclxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudFxyXG4gICAgX3BhdGhcclxuXHJcbiMgc2luZ2xldG9uIHRoYXQgY2FuIGNyZWF0ZSBDbG91ZENvbnRlbnQgd3JhcHBlZCB3aXRoIGdsb2JhbCBvcHRpb25zXHJcbmNsYXNzIENsb3VkQ29udGVudEZhY3RvcnlcclxuICBjb25zdHJ1Y3RvcjogLT5cclxuICAgIEBlbnZlbG9wZU1ldGFkYXRhID0ge31cclxuXHJcbiAgIyBzZXQgaW5pdGlhbCBlbnZlbG9wZU1ldGFkYXRhIG9yIHVwZGF0ZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcclxuICBzZXRFbnZlbG9wZU1ldGFkYXRhOiAoZW52ZWxvcGVNZXRhZGF0YSkgLT5cclxuICAgIGZvciBrZXkgb2YgZW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBAZW52ZWxvcGVNZXRhZGF0YVtrZXldID0gZW52ZWxvcGVNZXRhZGF0YVtrZXldXHJcblxyXG4gICMgcmV0dXJucyBuZXcgQ2xvdWRDb250ZW50IGNvbnRhaW5pbmcgZW52ZWxvcGVkIGRhdGFcclxuICBjcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgbmV3IENsb3VkQ29udGVudCBAZW52ZWxvcENvbnRlbnQgY29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgd2l0aCBtZXRhZGF0YSwgcmV0dXJucyBhbiBvYmplY3QuXHJcbiAgIyBJZiBjb250ZW50IHdhcyBhbHJlYWR5IGFuIG9iamVjdCAoT2JqZWN0IG9yIEpTT04pIHdpdGggbWV0YWRhdGEsXHJcbiAgIyBhbnkgZXhpc3RpbmcgbWV0YWRhdGEgd2lsbCBiZSByZXRhaW5lZC5cclxuICAjIE5vdGU6IGNhbGxpbmcgYGVudmVsb3BDb250ZW50YCBtYXkgYmUgc2FmZWx5IGNhbGxlZCBvbiBzb21ldGhpbmcgdGhhdFxyXG4gICMgaGFzIGFscmVhZHkgaGFkIGBlbnZlbG9wQ29udGVudGAgY2FsbGVkIG9uIGl0LCBhbmQgd2lsbCBiZSBhIG5vLW9wLlxyXG4gIGVudmVsb3BDb250ZW50OiAoY29udGVudCkgLT5cclxuICAgIGVudmVsb3BlZENsb3VkQ29udGVudCA9IEBfd3JhcElmTmVlZGVkIGNvbnRlbnRcclxuICAgIGZvciBrZXkgb2YgQGVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgZW52ZWxvcGVkQ2xvdWRDb250ZW50W2tleV0gPz0gQGVudmVsb3BlTWV0YWRhdGFba2V5XVxyXG4gICAgcmV0dXJuIGVudmVsb3BlZENsb3VkQ29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgaW4ge2NvbnRlbnQ6IGNvbnRlbnR9IGlmIG5lZWRlZCwgcmV0dXJucyBhbiBvYmplY3RcclxuICBfd3JhcElmTmVlZGVkOiAoY29udGVudCkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGNvbnRlbnRcclxuICAgICAgdHJ5IGNvbnRlbnQgPSBKU09OLnBhcnNlIGNvbnRlbnRcclxuICAgIGlmIGNvbnRlbnQuY29udGVudD9cclxuICAgICAgcmV0dXJuIGNvbnRlbnRcclxuICAgIGVsc2VcclxuICAgICAgcmV0dXJuIHtjb250ZW50fVxyXG5cclxuY2xhc3MgQ2xvdWRDb250ZW50XHJcbiAgY29uc3RydWN0b3I6IChAXyA9IHt9KSAtPlxyXG5cclxuICBnZXRDb250ZW50OiAtPiBAX1xyXG4gIGdldENvbnRlbnRBc0pTT046ICAtPiBKU09OLnN0cmluZ2lmeSBAX1xyXG5cclxuICBjbG9uZTogLT4gbmV3IENsb3VkQ29udGVudCBfLmNsb25lRGVlcCBAX1xyXG5cclxuICBzZXRUZXh0OiAodGV4dCkgLT4gQF8uY29udGVudCA9IHRleHRcclxuICBnZXRUZXh0OiAtPiBpZiBAXy5jb250ZW50IGlzIG51bGwgdGhlbiAnJyBlbHNlIGlmIGlzU3RyaW5nKEBfLmNvbnRlbnQpIHRoZW4gQF8uY29udGVudCBlbHNlIEpTT04uc3RyaW5naWZ5IEBfLmNvbnRlbnRcclxuXHJcbiAgYWRkTWV0YWRhdGE6IChtZXRhZGF0YSkgLT4gQF9ba2V5XSA9IG1ldGFkYXRhW2tleV0gZm9yIGtleSBvZiBtZXRhZGF0YVxyXG4gIGdldDogKHByb3ApIC0+IEBfW3Byb3BdXHJcblxyXG4gIGNvcHlNZXRhZGF0YVRvOiAodG8pIC0+XHJcbiAgICBtZXRhZGF0YSA9IHt9XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgQF9cclxuICAgICAgaWYga2V5IGlzbnQgJ2NvbnRlbnQnXHJcbiAgICAgICAgbWV0YWRhdGFba2V5XSA9IHZhbHVlXHJcbiAgICB0by5hZGRNZXRhZGF0YSBtZXRhZGF0YVxyXG5cclxuY2xhc3MgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAZGlzcGxheU5hbWUsIEBjYXBhYmlsaXRpZXN9ID0gb3B0aW9uc1xyXG5cclxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXHJcblxyXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XHJcbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgIGNhbGxiYWNrIHRydWVcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgbnVsbFxyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgZGVmYXVsdENvbXBvbmVudFxyXG5cclxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXHJcblxyXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcclxuXHJcbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdjbG9zZSdcclxuXHJcbiAgY2FuT3BlblNhdmVkOiAtPiB0cnVlXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdvcGVuU2F2ZWQnXHJcblxyXG4gIGdldE9wZW5TYXZlZFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZ2V0T3BlblNhdmVkUGFyYW1zJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIENsb3VkQ29udGVudDogQ2xvdWRDb250ZW50XHJcbiAgY2xvdWRDb250ZW50RmFjdG9yeTogbmV3IENsb3VkQ29udGVudEZhY3RvcnkoKVxyXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV1cclxuICAgICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBsaXN0ID0gW11cclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2Ygc3ViVHJlZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIGNhbk9wZW5TYXZlZDogLT4gZmFsc2VcclxuXHJcbiAgX2ZpbmRTdWJUcmVlOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW5cclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnBhcmVudFxyXG4gICAgICBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmNoaWxkcmVuXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHRyZWUgaXNudCBudWxsXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cclxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcclxuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcclxuICAgICAgJC5hamF4XHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXHJcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxyXG5cclxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhcmVudCA9IG51bGwpIC0+XHJcbiAgICB0cmVlID0ge31cclxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxyXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcGFyZW50OiBwYXJlbnRcclxuICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgIGNoaWxkcmVuOiBudWxsXHJcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW4gPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIG1ldGFkYXRhXHJcbiAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5cclxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdyZXZlcnRTdWJNZW51JywgJ3NlcGFyYXRvcicsICdzYXZlJywgJ2NyZWF0ZUNvcHknLCAnc2hhcmVTdWJNZW51JywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxyXG4gICAgQGl0ZW1zID0gQHBhcnNlTWVudUl0ZW1zIG9wdGlvbnMubWVudSwgY2xpZW50XHJcbiAgICBjb25zb2xlLmRpciBAaXRlbXNcclxuXHJcbiAgcGFyc2VNZW51SXRlbXM6IChtZW51SXRlbXMsIGNsaWVudCkgLT5cclxuICAgIHNldEFjdGlvbiA9IChhY3Rpb24pIC0+XHJcbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxyXG5cclxuICAgIHNldEVuYWJsZWQgPSAoYWN0aW9uKSAtPlxyXG4gICAgICBzd2l0Y2ggYWN0aW9uXHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0U3ViTWVudSdcclxuICAgICAgICAgIC0+IChjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8pIG9yIGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIHdoZW4gJ3JldmVydFRvTGFzdE9wZW5lZERpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xyXG4gICAgICAgIHdoZW4gJ3NoYXJlR2V0TGluaycsICdzaGFyZVN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgICB3aGVuICdyZXZlcnRUb1NoYXJlZERpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxyXG4gICAgICAgIHdoZW4gJ3NoYXJlVXBkYXRlJ1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZUVkaXRLZXlcIik/XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdHJ1ZVxyXG5cclxuICAgIGdldEl0ZW1zID0gKHN1Yk1lbnVJdGVtcykgPT5cclxuICAgICAgaWYgc3ViTWVudUl0ZW1zXHJcbiAgICAgICAgQHBhcnNlTWVudUl0ZW1zIHN1Yk1lbnVJdGVtcywgY2xpZW50XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcblxyXG4gICAgbmFtZXMgPVxyXG4gICAgICBuZXdGaWxlRGlhbG9nOiB0ciBcIn5NRU5VLk5FV1wiXHJcbiAgICAgIG9wZW5GaWxlRGlhbG9nOiB0ciBcIn5NRU5VLk9QRU5cIlxyXG4gICAgICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCJcclxuICAgICAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX1NIQVJFRF9WSUVXXCJcclxuICAgICAgc2F2ZTogdHIgXCJ+TUVOVS5TQVZFXCJcclxuICAgICAgc2F2ZUZpbGVBc0RpYWxvZzogdHIgXCJ+TUVOVS5TQVZFX0FTXCJcclxuICAgICAgY3JlYXRlQ29weTogdHIgXCJ+TUVOVS5DUkVBVEVfQ09QWVwiXHJcbiAgICAgIHNoYXJlR2V0TGluazogdHIgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiXHJcbiAgICAgIHNoYXJlVXBkYXRlOiB0ciBcIn5NRU5VLlNIQVJFX1VQREFURVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IHRyIFwifk1FTlUuUkVWRVJUX1RPXCJcclxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcclxuXHJcbiAgICBzdWJNZW51cyA9XHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cclxuICAgICAgc2hhcmVTdWJNZW51OiBbJ3NoYXJlR2V0TGluaycsICdzaGFyZVVwZGF0ZSddXHJcblxyXG4gICAgaXRlbXMgPSBbXVxyXG4gICAgZm9yIGl0ZW0sIGkgaW4gbWVudUl0ZW1zXHJcbiAgICAgIGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBtZW51SXRlbSA9XHJcbiAgICAgICAgICBrZXk6IFwic2VwZXJhdG9yI3tpfVwiXHJcbiAgICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbWVudUl0ZW0gPVxyXG4gICAgICAgICAga2V5OiBpdGVtXHJcbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgICAgZW5hYmxlZDogc2V0RW5hYmxlZCBpdGVtXHJcbiAgICAgICAgICBpdGVtczogZ2V0SXRlbXMgc3ViTWVudXNbaXRlbV1cclxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG1lbnVJdGVtID0gaXRlbVxyXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5rZXkgPSBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcclxuICAgICAgICBtZW51SXRlbS5pdGVtcyA9IGl0ZW0uaXRlbXMgb3IgZ2V0SXRlbXMgaXRlbS5uYW1lXHJcbiAgICAgIGl0ZW1zLnB1c2ggbWVudUl0ZW1cclxuICAgIGl0ZW1zXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdwcmVwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncmVwbGFjZU1lbnVJdGVtJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQWZ0ZXInLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2V0TWVudUJhckluZm8nLCBpbmZvXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnb3BlbkZpbGUnLCAodHIgJ35ESUFMT0cuT1BFTicpLCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGZpbGVuYW1lLCBjb250ZW50LCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd0Rvd25sb2FkRGlhbG9nJyxcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGZpbGVuYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1JlbmFtZURpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgc2hhcmVVcmxEaWFsb2c6ICh1cmwpIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dTaGFyZVVybERpYWxvZycsXHJcbiAgICAgIHVybDogdXJsXHJcblxyXG4gIGJsb2NraW5nTW9kYWw6IChtb2RhbFByb3BzKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93QmxvY2tpbmdNb2RhbCcsIG1vZGFsUHJvcHNcclxuXHJcbiAgX3Nob3dQcm92aWRlckRpYWxvZzogKGFjdGlvbiwgdGl0bGUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UHJvdmlkZXJEaWFsb2cnLFxyXG4gICAgICBhY3Rpb246IGFjdGlvblxyXG4gICAgICB0aXRsZTogdGl0bGVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJOiBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51OiBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPlxyXG4gIHJldCA9IG51bGxcclxuICBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuc29tZSAocGFpcikgLT5cclxuICAgIHBhaXIuc3BsaXQoXCI9XCIpWzBdIGlzIHBhcmFtIGFuZCAocmV0ID0gcGFpci5zcGxpdChcIj1cIilbMV0pXHJcbiAgcmV0XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXHJcbiIsIm1vZHVsZS5leHBvcnRzID1cclxuICBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5NRU5VLkNSRUFURV9DT1BZXCI6IFwiQ3JlYXRlIEEgQ29weSAuLi5cIlxyXG4gIFwifk1FTlUuU0hBUkVcIjogXCJTaGFyZS4uLlwiXHJcbiAgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiOiBcIkdldCBsaW5rIHRvIHNoYXJlZCB2aWV3XCJcclxuICBcIn5NRU5VLlNIQVJFX1VQREFURVwiOiBcIlVwZGF0ZSBzaGFyZWQgdmlld1wiXHJcbiAgXCJ+TUVOVS5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9cIjogXCJSZXZlcnQgdG8uLi5cIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCI6IFwiUmVjZW50bHkgb3BlbmVkIHN0YXRlXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIlNoYXJlZCB2aWV3XCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuQ1JFQVRFX0NPUFlcIjogXCJDcmVhdGUgQSBDb3B5IC4uLlwiXHJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+RElBTE9HLlNIQVJFRFwiOiBcIlNoYXJlZCBEb2N1bWVudFwiXHJcblxyXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcclxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxyXG4gIFwiflBST1ZJREVSLkdPT0dMRV9EUklWRVwiOiBcIkdvb2dsZSBEcml2ZVwiXHJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfRklMRVwiOiBcIkxvY2FsIEZpbGVcIlxyXG5cclxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcclxuICBcIn5GSUxFX0RJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCI6IFwiRGVsZXRlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcclxuICBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCI6IFwiTG9hZGluZy4uLlwiXHJcblxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwiflJFTkFNRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlcIjogXCJDb3B5XCJcclxuICBcIn5TSEFSRV9ESUFMT0cuVklFV1wiOiBcIlZpZXdcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DTE9TRVwiOiBcIkNsb3NlXCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9TVUNDRVNTXCI6IFwiVGhlIHNoYXJlIHVybCBoYXMgYmVlbiBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCI6IFwiU29ycnksIHRoZSBzaGFyZSB1cmwgd2FzIG5vdCBhYmxlIHRvIGJlIGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlwiXHJcblxyXG4gIFwifkNPTkZJUk0uT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IG9wZW4gYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uTkVXX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJldmVydCB0aGUgZmlsZSB0byBpdHMgbW9zdCByZWNlbnRseSBvcGVuZWQgc3RhdGU/XCJcclxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gY3VycmVudGx5IHNoYXJlZCB2aWV3P1wiXHJcblxyXG4gIFwifkxPQ0FMX0ZJTEVfRElBTE9HLkRST1BfRklMRV9IRVJFXCI6IFwiRHJvcCBmaWxlIGhlcmUgb3IgY2xpY2sgaGVyZSB0byBzZWxlY3QgZmlsZS5cIlxyXG4gIFwifkxPQ0FMX0ZJTEVfRElBTE9HLk1VTFRJUExFX0ZJTEVTX1NFTEVDVEVEXCI6IFwiU29ycnksIHlvdSBjYW4gY2hvb3NlIG9ubHkgb25lIGZpbGUgdG8gb3Blbi5cIlxyXG4gIFwifkxPQ0FMX0ZJTEVfRElBTE9HLk1VTFRJUExFX0ZJTEVTX0RST1BQRURcIjogXCJTb3JyeSwgeW91IGNhbid0IGRyb3AgbW9yZSB0aGFuIG9uZSBmaWxlLlwiXHJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxyXG50cmFuc2xhdGlvbnNbJ2VuJ10gPSByZXF1aXJlICcuL2xhbmcvZW4tdXMnXHJcbmRlZmF1bHRMYW5nID0gJ2VuJ1xyXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXHJcblxyXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxyXG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxyXG4gIHRyYW5zbGF0aW9uLnJlcGxhY2UgdmFyUmVnRXhwLCAobWF0Y2gsIGtleSkgLT5cclxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRlXHJcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcclxuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5Eb3dubG9hZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kb3dubG9hZC1kaWFsb2ctdmlldydcclxuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcclxuU2hhcmVVcmxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2hhcmUtdXJsLWRpYWxvZy12aWV3J1xyXG5CbG9ja2luZ01vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Jsb2NraW5nLW1vZGFsLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG57ZGl2LCBpZnJhbWV9ID0gUmVhY3QuRE9NXHJcblxyXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VySW5uZXJBcHAnXHJcblxyXG4gIHNob3VsZENvbXBvbmVudFVwZGF0ZTogKG5leHRQcm9wcykgLT5cclxuICAgIG5leHRQcm9wcy5hcHAgaXNudCBAcHJvcHMuYXBwXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2lubmVyQXBwJ30sXHJcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXHJcbiAgICApXHJcblxyXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXInXHJcblxyXG4gIGdldEZpbGVuYW1lOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8uaGFzT3duUHJvcGVydHkoXCJuYW1lXCIpIGFuZCBtZXRhZGF0YS5uYW1lPy5sZW5ndGggPiAwIHRoZW4gbWV0YWRhdGEubmFtZSBlbHNlIG51bGxcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICBwcm92aWRlcjogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cclxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICBzaGFyZVVybERpYWxvZzogbnVsbFxyXG4gICAgZGlydHk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5jbGllbnQubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xyXG4gICAgICAgIHttZXNzYWdlOiBcIlNhdmluZy4uLlwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuc2F2ZWRcclxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuZGlydHlcclxuICAgICAgICB7bWVzc2FnZTogJ1Vuc2F2ZWQnLCB0eXBlOiAnYWxlcnQnfVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lIGV2ZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgcHJvdmlkZXI6IGV2ZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dEb3dubG9hZERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBkb3dubG9hZERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcmVuYW1lRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1NoYXJlVXJsRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlVXJsRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Jsb2NraW5nTW9kYWwnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgYmxvY2tpbmdNb2RhbFByb3BzOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQmVmb3JlJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgMFxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMuc3BsaWNlIGluZGV4LCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQWZ0ZXInXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBpZiBpbmRleCBpcyBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCArIDEsIDAsIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIF9nZXRNZW51SXRlbUluZGV4OiAoa2V5KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcga2V5XHJcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgcmV0dXJuIGluZGV4IGlmIGl0ZW0ua2V5IGlzIGtleVxyXG4gICAgICAtMVxyXG4gICAgZWxzZVxyXG4gICAgICBpbmRleCA9IHBhcnNlSW50IGtleSwgMTBcclxuICAgICAgaWYgaXNOYU4oaW5kZXgpIG9yIGluZGV4IDwgMCBvciBpbmRleCA+IEBzdGF0ZS5tZW51SXRlbXMubGVuZ3RoIC0gMVxyXG4gICAgICAgIC0xXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpbmRleFxyXG5cclxuICBjbG9zZURpYWxvZ3M6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcblxyXG4gIHJlbmRlckRpYWxvZ3M6IC0+XHJcbiAgICBpZiBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzXHJcbiAgICAgIChCbG9ja2luZ01vZGFsIEBzdGF0ZS5ibG9ja2luZ01vZGFsUHJvcHMpXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChEb3dubG9hZERpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5maWxlbmFtZSwgbWltZVR5cGU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5taW1lVHlwZSwgY29udGVudDogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmNvbnRlbnQsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xyXG4gICAgICAoUmVuYW1lRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLnJlbmFtZURpYWxvZy5maWxlbmFtZSwgY2FsbGJhY2s6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuY2FsbGJhY2ssIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnNoYXJlVXJsRGlhbG9nXHJcbiAgICAgIChTaGFyZVVybERpYWxvZyB7dXJsOiBAc3RhdGUuc2hhcmVVcmxEaWFsb2cudXJsLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICAoTWVudUJhciB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxyXG4iLCJBdXRob3JpemVNaXhpbiA9XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgYXV0aG9yaXplZDogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXHJcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdCbG9ja2luZ01vZGFsJ1xyXG5cclxuICBjbG9zZTogLT5cclxuICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LFxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctYmxvY2tpbmctbWVzc2FnZSd9LCBAcHJvcHMubWVzc2FnZSlcclxuICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IFwiI3tAcHJvcHMuZmlsZW5hbWUgb3IgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIil9Lmpzb25cIlxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgZG93bmxvYWQ6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIGUudGFyZ2V0LnNldEF0dHJpYnV0ZSAnaHJlZicsIFwiZGF0YTphcHBsaWNhdGlvbi9qc29uLCN7ZW5jb2RlVVJJQ29tcG9uZW50KEBwcm9wcy5jb250ZW50LmdldENvbnRlbnRBc0pTT04oKSl9XCJcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuICAgIGVsc2VcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5ET1dOTE9BRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+RE9XTkxPQURfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaSwgc3ZnLCBnLCByZWN0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cclxuXHJcbiAgbW91c2VFbnRlcjogLT5cclxuICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgIG1lbnVJdGVtID0gJCBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5pdGVtXHJcbiAgICAgIG1lbnUgPSBtZW51SXRlbS5wYXJlbnQoKS5wYXJlbnQoKVxyXG5cclxuICAgICAgQHByb3BzLnNldFN1Yk1lbnVcclxuICAgICAgICBzdHlsZTpcclxuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnXHJcbiAgICAgICAgICBsZWZ0OiBtZW51LndpZHRoKClcclxuICAgICAgICAgIHRvcDogbWVudUl0ZW0ucG9zaXRpb24oKS50b3AgLSBwYXJzZUludChtZW51SXRlbS5jc3MoJ3BhZGRpbmctdG9wJykpXHJcbiAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51PyBudWxsXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcclxuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gICAgY2xhc3NlcyA9IFsnbWVudUl0ZW0nXVxyXG4gICAgaWYgQHByb3BzLml0ZW0uc2VwYXJhdG9yXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xyXG4gICAgICAobGkge2NsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyl9LCAnJylcclxuICAgIGVsc2VcclxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3Igbm90IChAcHJvcHMuaXRlbS5hY3Rpb24gb3IgQHByb3BzLml0ZW0uaXRlbXMpXHJcbiAgICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXHJcbiAgICAgIChsaSB7cmVmOiAnaXRlbScsIGNsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyksIG9uQ2xpY2s6IEBjbGlja2VkLCBvbk1vdXNlRW50ZXI6IEBtb3VzZUVudGVyIH0sXHJcbiAgICAgICAgbmFtZVxyXG4gICAgICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZSd9KVxyXG4gICAgICApXHJcblxyXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG4gICAgc3ViTWVudTogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlLCBzdWJNZW51OiBmYWxzZX0gKSwgNTAwXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IHRpbWVvdXR9XHJcblxyXG4gIHVuYmx1cjogLT5cclxuICAgIGlmIEBzdGF0ZS50aW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cclxuXHJcbiAgc2V0U3ViTWVudTogKHN1Yk1lbnUpIC0+XHJcbiAgICBAc2V0U3RhdGUgc3ViTWVudTogc3ViTWVudVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgcmV0dXJuIGlmIGl0ZW0/Lml0ZW1zXHJcbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcclxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cclxuICAgIHJldHVybiB1bmxlc3MgaXRlbVxyXG4gICAgaXRlbS5hY3Rpb24/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxyXG4gICAgICAgIChzdmcge3ZlcnNpb246ICcxLjEnLCB3aWR0aDogMTYsIGhlaWdodDogMTYsIHZpZXdCb3g6ICcwIDAgMTYgMTYnLCBlbmFibGVCYWNrZ3JvdW5kOiAnbmV3IDAgMCAxNiAxNid9LFxyXG4gICAgICAgICAgKGcge30sXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiA3LCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAxMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcclxuICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBzZXRTdWJNZW51OiBAc2V0U3ViTWVudX0pIGZvciBpdGVtLCBpbmRleCBpbiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIClcclxuICAgICAgICAgIGlmIEBzdGF0ZS5zdWJNZW51XHJcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBzdHlsZTogQHN0YXRlLnN1Yk1lbnUuc3R5bGV9LFxyXG4gICAgICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdH0pIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUuc3ViTWVudS5pdGVtc1xyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRHJvcERvd25cclxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpbWcsIGksIHNwYW4sIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdEZpbGUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBsYXN0Q2xpY2sgPSAwXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgQHByb3BzLmZpbGVDb25maXJtZWQoKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LFxyXG4gICAgICAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogaWYgQHByb3BzLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgdGhlbiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZScgZWxzZSAnaWNvbi1ub3RlVG9vbCd9KVxyXG4gICAgICBAcHJvcHMubWV0YWRhdGEubmFtZVxyXG4gICAgKVxyXG5cclxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGluZzogdHJ1ZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBsb2FkIEBwcm9wcy5mb2xkZXJcclxuXHJcbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogKG5leHRQcm9wcykgLT5cclxuICAgIGlmIG5leHRQcm9wcy5mb2xkZXIgaXNudCBAcHJvcHMuZm9sZGVyXHJcbiAgICAgIEBsb2FkIG5leHRQcm9wcy5mb2xkZXJcclxuXHJcbiAgbG9hZDogKGZvbGRlcikgLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IGZvbGRlciwgKGVyciwgbGlzdCkgPT5cclxuICAgICAgcmV0dXJuIGFsZXJ0KGVycikgaWYgZXJyXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXHJcbiAgICAgIEBwcm9wcy5saXN0TG9hZGVkIGxpc3RcclxuXHJcbiAgcGFyZW50U2VsZWN0ZWQ6IChlKSAtPlxyXG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMuZm9sZGVyPy5wYXJlbnRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBpZiBAcHJvcHMuZm9sZGVyIGlzbnQgbnVsbFxyXG4gICAgICBsaXN0LnB1c2ggKGRpdiB7a2V5OiAncGFyZW50Jywgb25DbGljazogQHBhcmVudFNlbGVjdGVkfSwgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6ICdpY29uLXBhbGV0dGVBcnJvdy1jb2xsYXBzZSd9KSwgJ1BhcmVudCBGb2xkZXInKVxyXG4gICAgZm9yIG1ldGFkYXRhLCBpIGluIEBwcm9wcy5saXN0XHJcbiAgICAgIGxpc3QucHVzaCAoRmlsZUxpc3RGaWxlIHtrZXk6IGksIG1ldGFkYXRhOiBtZXRhZGF0YSwgc2VsZWN0ZWQ6IEBwcm9wcy5zZWxlY3RlZEZpbGUgaXMgbWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQHByb3BzLmZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQHByb3BzLmZpbGVDb25maXJtZWR9KVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkaW5nXHJcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBsaXN0XHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBAZ2V0U3RhdGVGb3JGb2xkZXIgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cclxuICAgIGZpbGVuYW1lID0gZS50YXJnZXQudmFsdWVcclxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgbWV0YWRhdGE6IEBmaW5kTWV0YWRhdGEgJC50cmltKEBzdGF0ZS5maWxlbmFtZSksIGxpc3RcclxuXHJcbiAgZ2V0U3RhdGVGb3JGb2xkZXI6IChmb2xkZXIpIC0+XHJcbiAgICBmb2xkZXI6IGZvbGRlclxyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcclxuICAgIGZpbGVuYW1lOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5uYW1lIG9yICcnXHJcbiAgICBsaXN0OiBbXVxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbWV0YWRhdGFcclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbnVsbFxyXG5cclxuICBjb25maXJtOiAtPlxyXG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIGlmIEBpc09wZW5cclxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogQHN0YXRlLmZvbGRlciBvciBudWxsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXJcclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIgPSBAcHJvcHMucHJvdmlkZXJcclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIHJlbW92ZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIGlmIG5vdCBlcnJcclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXHJcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXHJcbiAgICAgICAgICBAc2V0U3RhdGVcclxuICAgICAgICAgICAgbGlzdDogbGlzdFxyXG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcclxuXHJcbiAgY2FuY2VsOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUsIGxpc3QpIC0+XHJcbiAgICBmb3IgbWV0YWRhdGEgaW4gbGlzdFxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIGlzIGZpbGVuYW1lXHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXHJcbiAgICBudWxsXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICAgIEBjb25maXJtKClcclxuXHJcbiAgY29uZmlybURpc2FibGVkOiAtPlxyXG4gICAgKEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCkgb3IgKEBpc09wZW4gYW5kIG5vdCBAc3RhdGUubWV0YWRhdGEpXHJcblxyXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxyXG4gICAgY29uZmlybURpc2FibGVkID0gQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RpYWxvZ1RhYid9LFxyXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcmVtb3ZlLCBkaXNhYmxlZDogcmVtb3ZlRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgcmVtb3ZlRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCAodHIgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCIpKVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcclxuIiwie2RpdiwgaSwgc3BhbiwgaW5wdXR9ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogKHByb3BzKSAtPlxyXG4gICAgaWYgcHJvcHMuZmlsZW5hbWU/Lmxlbmd0aCA+IDAgdGhlbiBwcm9wcy5maWxlbmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpXHJcblxyXG4gIGdldEVkaXRhYmxlRmlsZW5hbWU6IChwcm9wcykgLT5cclxuICAgIGlmIHByb3BzLmZpbGVuYW1lPy5sZW5ndGggPiAwIHRoZW4gcHJvcHMuZmlsZW5hbWUgZWxzZSBcIlwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHN0YXRlID1cclxuICAgICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG4gICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lIEBwcm9wc1xyXG4gICAgICBlZGl0YWJsZUZpbGVuYW1lOiBAZ2V0RWRpdGFibGVGaWxlbmFtZSBAcHJvcHNcclxuXHJcbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogKG5leHRQcm9wcykgLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lIG5leHRQcm9wc1xyXG4gICAgICBlZGl0YWJsZUZpbGVuYW1lOiBAZ2V0RWRpdGFibGVGaWxlbmFtZSBuZXh0UHJvcHNcclxuICAgICAgcHJvdmlkZXI6IG5leHRQcm9wcy5wcm92aWRlclxyXG5cclxuICBmaWxlbmFtZUNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBAc2V0U3RhdGUgZWRpdGluZ0ZpbGVuYW1lOiB0cnVlXHJcbiAgICBzZXRUaW1lb3V0ICg9PiBAZm9jdXNGaWxlbmFtZSgpKSwgMTBcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGVkaXRhYmxlRmlsZW5hbWU6IEBmaWxlbmFtZSgpLnZhbHVlXHJcblxyXG4gIGZpbGVuYW1lQmx1cnJlZDogLT5cclxuICAgIEByZW5hbWUoKVxyXG5cclxuICBmaWxlbmFtZTogLT5cclxuICAgIFJlYWN0LmZpbmRET01Ob2RlKEByZWZzLmZpbGVuYW1lKVxyXG5cclxuICBmb2N1c0ZpbGVuYW1lOiAtPlxyXG4gICAgZWwgPSBAZmlsZW5hbWUoKVxyXG4gICAgZWwuZm9jdXMoKVxyXG4gICAgaWYgdHlwZW9mIGVsLnNlbGVjdGlvblN0YXJ0IGlzICdudW1iZXInXHJcbiAgICAgIGVsLnNlbGVjdGlvblN0YXJ0ID0gZWwuc2VsZWN0aW9uRW5kID0gZWwudmFsdWUubGVuZ3RoXHJcbiAgICBlbHNlIGlmIHR5cGVvZiBlbC5jcmVhdGVUZXh0UmFuZ2UgaXNudCAndW5kZWZpbmVkJ1xyXG4gICAgICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpXHJcbiAgICAgIHJhbmdlLmNvbGxhcHNlIGZhbHNlXHJcbiAgICAgIHJhbmdlLnNlbGVjdCgpXHJcblxyXG4gIHJlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHN0YXRlLmVkaXRhYmxlRmlsZW5hbWUucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG4gICAgaWYgZmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2xpZW50LnJlbmFtZSBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLCBmaWxlbmFtZVxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgZWRpdGFibGVGaWxlbmFtZTogZmlsZW5hbWVcclxuICAgIGVsc2VcclxuICAgICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTNcclxuICAgICAgQHJlbmFtZSgpXHJcbiAgICBlbHNlIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAc2V0U3RhdGUgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG5cclxuICBoZWxwOiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLm9wdGlvbnMuaGVscCwgJ19ibGFuaydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxyXG4gICAgICAgIChEcm9wZG93biB7aXRlbXM6IEBwcm9wcy5pdGVtc30pXHJcbiAgICAgICAgaWYgQHN0YXRlLmVkaXRpbmdGaWxlbmFtZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30sXHJcbiAgICAgICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmVkaXRhYmxlRmlsZW5hbWUsIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbkJsdXI6IEBmaWxlbmFtZUJsdXJyZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZScsIG9uQ2xpY2s6IEBmaWxlbmFtZUNsaWNrZWR9LCBAc3RhdGUuZmlsZW5hbWUpXHJcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6IFwibWVudS1iYXItZmlsZS1zdGF0dXMtI3tAcHJvcHMuZmlsZVN0YXR1cy50eXBlfVwifSwgQHByb3BzLmZpbGVTdGF0dXMubWVzc2FnZSlcclxuICAgICAgKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmluZm9cclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWJhci1pbmZvJ30sIEBwcm9wcy5vcHRpb25zLmluZm8pXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyPy5hdXRob3JpemVkKClcclxuICAgICAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJVc2VyKClcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXHJcbiAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ2NyZWF0ZUNvcHknIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBmaWx0ZXJlZFRhYkNvbXBvbmVudCA9IHByb3ZpZGVyLmZpbHRlclRhYkNvbXBvbmVudCBjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRcclxuICAgICAgICBjb21wb25lbnQgPSBmaWx0ZXJlZFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyLm5hbWUgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/Lm5hbWVcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSB0YWJzLmxlbmd0aCAtIDFcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdSZW5hbWVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgcmVuYW1lOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2FsbGJhY2s/IEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlJFTkFNRScpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcclxuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdTaGFyZVVybERpYWxvZ1ZpZXcnXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgUmVhY3QuZmluZERPTU5vZGUoQHJlZnMudXJsKT8uc2VsZWN0KClcclxuXHJcbiAgdmlldzogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy51cmxcclxuXHJcbiAgIyBhZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3N1ZG9kb2tpL2NvcHktdG8tY2xpcGJvYXJkL2Jsb2IvbWFzdGVyL2luZGV4LmpzXHJcbiAgY29weTogLT5cclxuICAgIGNvcGllZCA9IHRydWVcclxuICAgIHRyeVxyXG4gICAgICBtYXJrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnbWFyaydcclxuICAgICAgbWFyay5pbm5lckhUTUwgPSBAcHJvcHMudXJsXHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQgbWFya1xyXG5cclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKClcclxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXHJcblxyXG4gICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcclxuICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZSBtYXJrXHJcbiAgICAgIHNlbGVjdGlvbi5hZGRSYW5nZSByYW5nZVxyXG5cclxuICAgICAgY29waWVkID0gZG9jdW1lbnQuZXhlY0NvbW1hbmQgJ2NvcHknXHJcbiAgICBjYXRjaFxyXG4gICAgICB0cnlcclxuICAgICAgICB3aW5kb3cuY2xpcGJvYXJkRGF0YS5zZXREYXRhICd0ZXh0JywgQHByb3BzLnVybFxyXG4gICAgICBjYXRjaFxyXG4gICAgICAgIGNvcGllZCA9IGZhbHNlXHJcbiAgICBmaW5hbGx5XHJcbiAgICAgIGlmIHNlbGVjdGlvblxyXG4gICAgICAgIGlmIHR5cGVvZiBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZVJhbmdlIHJhbmdlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXHJcbiAgICAgIGlmIG1hcmtcclxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkIG1hcmtcclxuICAgICAgYWxlcnQgdHIgKGlmIGNvcGllZCB0aGVuIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIiBlbHNlIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCIpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5TSEFSRUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ3NoYXJlLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAndXJsJywgdmFsdWU6IEBwcm9wcy51cmwsIHJlYWRPbmx5OiB0cnVlfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICBpZiBkb2N1bWVudC5leGVjQ29tbWFuZCBvciB3aW5kb3cuY2xpcGJvYXJkRGF0YVxyXG4gICAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29weX0sIHRyICd+U0hBUkVfRElBTE9HLkNPUFknKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHZpZXd9LCB0ciAnflNIQVJFX0RJQUxPRy5WSUVXJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+U0hBUkVfRElBTE9HLkNMT1NFJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHtrZXk6IGluZGV4fSwgQHJlbmRlclRhYih0YWIsIGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcclxuICAgIClcclxuXHJcbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXHJcbiAgICAgIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzXHJcbiAgICAgICAgKGRpdiB7XHJcbiAgICAgICAgICBrZXk6IGluZGV4XHJcbiAgICAgICAgICBzdHlsZTpcclxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGFiLmNvbXBvbmVudFxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxyXG4gICAgICBAcmVuZGVyVGFicygpXHJcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcclxuICAgIClcclxuIl19
