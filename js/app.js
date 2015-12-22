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
    var fileParams, providerName, providerParams, ref, sharedContentId;
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    this.client.listen(eventCallback);
    this.client.connect();
    sharedContentId = getHashParam("shared");
    fileParams = getHashParam("file");
    if (sharedContentId) {
      return this.client.openSharedContent(sharedContentId);
    } else if (fileParams) {
      ref = fileParams.split(':'), providerName = ref[0], providerParams = ref[1];
      return this.client.openProviderFile(providerName, providerParams);
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
    var Provider, allProviders, availableProviders, base, base1, base2, i, j, k, len, len1, len2, provider, providerName, providerOptions, ref, ref1, ref2, ref3, ref4, ref5;
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
    this.newFileOpensInNewTab = ((ref4 = this.appOptions.ui) != null ? ref4.hasOwnProperty('newFileOpensInNewTab') : void 0) ? this.appOptions.ui.newFileOpensInNewTab : true;
    return this.saveCopyOpensInNewTab = ((ref5 = this.appOptions.ui) != null ? ref5.hasOwnProperty('saveCopyOpensInNewTab') : void 0) ? this.appOptions.ui.saveCopyOpensInNewTab : true;
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

  CloudFileManagerClient.prototype.saveCopyDialog = function(stringContent, callback) {
    var saveCopy;
    if (stringContent == null) {
      stringContent = null;
    }
    if (callback == null) {
      callback = null;
    }
    saveCopy = (function(_this) {
      return function(stringContent, metadata) {
        var content;
        content = cloudContentFactory.createEnvelopedCloudContent(stringContent);
        return metadata.provider.save(content, metadata, function(err) {
          if (err) {
            return _this._error(err);
          }
          if (_this.saveCopyOpensInNewTab) {
            window.open(_this._getCurrentUrl(_this._getHashParams(metadata)));
          }
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        });
      };
    })(this);
    return this._ui.saveCopyDialog((function(_this) {
      return function(metadata) {
        if (stringContent === null) {
          return _this._event('getContent', {}, function(stringContent) {
            return saveCopy(stringContent, metadata);
          });
        } else {
          return saveCopy(stringContent, metadata);
        }
      };
    })(this));
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'revertSubMenu', 'separator', 'save', 'saveCopyDialog', 'shareSubMenu', 'downloadDialog', 'renameDialog'];

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
      saveCopyDialog: tr("~MENU.SAVE_COPY"),
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

  CloudFileManagerUI.prototype.saveCopyDialog = function(callback) {
    return this._showProviderDialog('saveFileCopy', tr('~DIALOG.SAVE_COPY'), callback);
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
  "~MENU.SAVE_COPY": "Save A Copy ...",
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
  "~DIALOG.SAVE_COPY": "Save A Copy ...",
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
        case 'saveFileCopy':
        case 'saveFileCopy':
          return ['save', FileDialogTab];
        case 'saveFileAs':
        case 'saveFileAs':
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWwtZmlsZS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGxvY2Fsc3RvcmFnZS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXHByb3ZpZGVyLWludGVyZmFjZS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXHJlYWRvbmx5LXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHVpLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxnZXQtaGFzaC1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxibG9ja2luZy1tb2RhbC12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxrQkFBUixDQUFwQjs7QUFFVixzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFDMUMsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsVUFBUixDQUFELENBQW9CLENBQUM7O0FBRTlDLFlBQUEsR0FBZSxPQUFBLENBQVEsd0JBQVI7O0FBRVQ7RUFFUywwQkFBQyxPQUFEO0lBRVgsSUFBQyxDQUFBLFdBQUQsR0FBZSxzQkFBc0IsQ0FBQztJQUV0QyxJQUFDLENBQUEsTUFBRCxHQUFjLElBQUEsc0JBQUEsQ0FBQTtJQUNkLElBQUMsQ0FBQSxVQUFELEdBQWM7RUFMSDs7NkJBT2IsSUFBQSxHQUFNLFNBQUMsVUFBRCxFQUFjLFdBQWQ7SUFBQyxJQUFDLENBQUEsYUFBRDs7TUFBYSxjQUFjOztJQUNoQyxJQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosR0FBMEI7V0FDMUIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxhQUFSLENBQXNCLElBQUMsQ0FBQSxVQUF2QjtFQUZJOzs2QkFJTixXQUFBLEdBQWEsU0FBQyxVQUFELEVBQWMsTUFBZCxFQUFzQixhQUF0QjtJQUFDLElBQUMsQ0FBQSxhQUFEOztNQUFxQixnQkFBZ0I7O0lBQ2pELElBQUMsQ0FBQSxJQUFELENBQU0sSUFBQyxDQUFBLFVBQVAsRUFBbUIsSUFBbkI7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QUFHLENBQUMsSUFBSSxDQUFDLHFFQUFxRSxDQUFDLENBQUM7QUFDaEYsS0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQSxBQUFDLENBQUMsQ0FBQztBQUMzRyxLQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQyxDQUFDOztBQUUzRyxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDMUMsUUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixPQUFHLENBQUMsSUFBSSxDQUNOLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUMxQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FDMUMsS0FBSyxDQUNSLENBQUM7QUFDRixPQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ2pDOztBQUVELFNBQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDOUI7O0FBRU0sU0FBUyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7QUFDbkYsU0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFF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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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bUJBQUQsQ0FBQSxDQUZEO0VBREssQ0FyQ1I7Q0FGZSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50ID0gKHJlcXVpcmUgJy4vY2xpZW50JykuQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuZ2V0SGFzaFBhcmFtID0gcmVxdWlyZSAnLi91dGlscy9nZXQtaGFzaC1wYXJhbSdcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgIyBzaW5jZSB0aGUgbW9kdWxlIGV4cG9ydHMgYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIHdlIG5lZWQgdG8gZmFrZSBhIGNsYXNzIHZhcmlhYmxlIGFzIGFuIGluc3RhbmNlIHZhcmlhYmxlXHJcbiAgICBARGVmYXVsdE1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAaW5pdCBAYXBwT3B0aW9ucywgdHJ1ZVxyXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xyXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxyXG5cclxuICBjbGllbnRDb25uZWN0OiAoZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxyXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXHJcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXHJcbiAgICBAY2xpZW50LmNvbm5lY3QoKVxyXG5cclxuICAgIHNoYXJlZENvbnRlbnRJZCA9IGdldEhhc2hQYXJhbSBcInNoYXJlZFwiXHJcbiAgICBmaWxlUGFyYW1zID0gZ2V0SGFzaFBhcmFtIFwiZmlsZVwiXHJcbiAgICBpZiBzaGFyZWRDb250ZW50SWRcclxuICAgICAgQGNsaWVudC5vcGVuU2hhcmVkQ29udGVudCBzaGFyZWRDb250ZW50SWRcclxuICAgIGVsc2UgaWYgZmlsZVBhcmFtc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlclBhcmFtc10gPSBmaWxlUGFyYW1zLnNwbGl0ICc6J1xyXG4gICAgICBAY2xpZW50Lm9wZW5Qcm92aWRlckZpbGUgcHJvdmlkZXJOYW1lLCBwcm92aWRlclBhcmFtc1xyXG5cclxuICBfY3JlYXRlSGlkZGVuQXBwOiAtPlxyXG4gICAgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpXHJcbiAgICBAX3JlbmRlckFwcCBhbmNob3JcclxuXHJcbiAgX3JlbmRlckFwcDogKGFuY2hvcikgLT5cclxuICAgIEBhcHBPcHRpb25zLmNsaWVudCA9IEBjbGllbnRcclxuICAgIFJlYWN0LnJlbmRlciAoQXBwVmlldyBAYXBwT3B0aW9ucyksIGFuY2hvclxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlcigpXHJcbiIsIi8vIFNlZTogaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL3dpa2kvQVBJXG5leHBvcnQgZnVuY3Rpb24gY29udmVydENoYW5nZXNUb0RNUChjaGFuZ2VzKSB7XG4gIGxldCByZXQgPSBbXSxcbiAgICAgIGNoYW5nZSxcbiAgICAgIG9wZXJhdGlvbjtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAxO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcGVyYXRpb24gPSAwO1xuICAgIH1cblxuICAgIHJldC5wdXNoKFtvcGVyYXRpb24sIGNoYW5nZS52YWx1ZV0pO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gY29udmVydENoYW5nZXNUb1hNTChjaGFuZ2VzKSB7XG4gIGxldCByZXQgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgcmV0LnB1c2goJzxpbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzxkZWw+Jyk7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goZXNjYXBlSFRNTChjaGFuZ2UudmFsdWUpKTtcblxuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8L2lucz4nKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICByZXQucHVzaCgnPC9kZWw+Jyk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXQuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUhUTUwocykge1xuICBsZXQgbiA9IHM7XG4gIG4gPSBuLnJlcGxhY2UoLyYvZywgJyZhbXA7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLzwvZywgJyZsdDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICBuID0gbi5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG5cbiAgcmV0dXJuIG47XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBEaWZmKCkge31cblxuRGlmZi5wcm90b3R5cGUgPSB7XG4gIGRpZmYob2xkU3RyaW5nLCBuZXdTdHJpbmcsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBjYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICBsZXQgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBkb25lKHZhbHVlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sodW5kZWZpbmVkLCB2YWx1ZSk7IH0sIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGxvdyBzdWJjbGFzc2VzIHRvIG1hc3NhZ2UgdGhlIGlucHV0IHByaW9yIHRvIHJ1bm5pbmdcbiAgICBvbGRTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChvbGRTdHJpbmcpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMuY2FzdElucHV0KG5ld1N0cmluZyk7XG5cbiAgICBvbGRTdHJpbmcgPSB0aGlzLnJlbW92ZUVtcHR5KHRoaXMudG9rZW5pemUob2xkU3RyaW5nKSk7XG4gICAgbmV3U3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG5ld1N0cmluZykpO1xuXG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGg7XG4gICAgbGV0IGVkaXRMZW5ndGggPSAxO1xuICAgIGxldCBtYXhFZGl0TGVuZ3RoID0gbmV3TGVuICsgb2xkTGVuO1xuICAgIGxldCBiZXN0UGF0aCA9IFt7IG5ld1BvczogLTEsIGNvbXBvbmVudHM6IFtdIH1dO1xuXG4gICAgLy8gU2VlZCBlZGl0TGVuZ3RoID0gMCwgaS5lLiB0aGUgY29udGVudCBzdGFydHMgd2l0aCB0aGUgc2FtZSB2YWx1ZXNcbiAgICBsZXQgb2xkUG9zID0gdGhpcy5leHRyYWN0Q29tbW9uKGJlc3RQYXRoWzBdLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgMCk7XG4gICAgaWYgKGJlc3RQYXRoWzBdLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAvLyBJZGVudGl0eSBwZXIgdGhlIGVxdWFsaXR5IGFuZCB0b2tlbml6ZXJcbiAgICAgIHJldHVybiBkb25lKFt7dmFsdWU6IG5ld1N0cmluZy5qb2luKCcnKSwgY291bnQ6IG5ld1N0cmluZy5sZW5ndGh9XSk7XG4gICAgfVxuXG4gICAgLy8gTWFpbiB3b3JrZXIgbWV0aG9kLiBjaGVja3MgYWxsIHBlcm11dGF0aW9ucyBvZiBhIGdpdmVuIGVkaXQgbGVuZ3RoIGZvciBhY2NlcHRhbmNlLlxuICAgIGZ1bmN0aW9uIGV4ZWNFZGl0TGVuZ3RoKCkge1xuICAgICAgZm9yIChsZXQgZGlhZ29uYWxQYXRoID0gLTEgKiBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggPD0gZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoICs9IDIpIHtcbiAgICAgICAgbGV0IGJhc2VQYXRoO1xuICAgICAgICBsZXQgYWRkUGF0aCA9IGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdLFxuICAgICAgICAgICAgcmVtb3ZlUGF0aCA9IGJlc3RQYXRoW2RpYWdvbmFsUGF0aCArIDFdLFxuICAgICAgICAgICAgb2xkUG9zID0gKHJlbW92ZVBhdGggPyByZW1vdmVQYXRoLm5ld1BvcyA6IDApIC0gZGlhZ29uYWxQYXRoO1xuICAgICAgICBpZiAoYWRkUGF0aCkge1xuICAgICAgICAgIC8vIE5vIG9uZSBlbHNlIGlzIGdvaW5nIHRvIGF0dGVtcHQgdG8gdXNlIHRoaXMgdmFsdWUsIGNsZWFyIGl0XG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2FuQWRkID0gYWRkUGF0aCAmJiBhZGRQYXRoLm5ld1BvcyArIDEgPCBuZXdMZW4sXG4gICAgICAgICAgICBjYW5SZW1vdmUgPSByZW1vdmVQYXRoICYmIDAgPD0gb2xkUG9zICYmIG9sZFBvcyA8IG9sZExlbjtcbiAgICAgICAgaWYgKCFjYW5BZGQgJiYgIWNhblJlbW92ZSkge1xuICAgICAgICAgIC8vIElmIHRoaXMgcGF0aCBpcyBhIHRlcm1pbmFsIHRoZW4gcHJ1bmVcbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSBkaWFnb25hbCB0aGF0IHdlIHdhbnQgdG8gYnJhbmNoIGZyb20uIFdlIHNlbGVjdCB0aGUgcHJpb3JcbiAgICAgICAgLy8gcGF0aCB3aG9zZSBwb3NpdGlvbiBpbiB0aGUgbmV3IHN0cmluZyBpcyB0aGUgZmFydGhlc3QgZnJvbSB0aGUgb3JpZ2luXG4gICAgICAgIC8vIGFuZCBkb2VzIG5vdCBwYXNzIHRoZSBib3VuZHMgb2YgdGhlIGRpZmYgZ3JhcGhcbiAgICAgICAgaWYgKCFjYW5BZGQgfHwgKGNhblJlbW92ZSAmJiBhZGRQYXRoLm5ld1BvcyA8IHJlbW92ZVBhdGgubmV3UG9zKSkge1xuICAgICAgICAgIGJhc2VQYXRoID0gY2xvbmVQYXRoKHJlbW92ZVBhdGgpO1xuICAgICAgICAgIHNlbGYucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCB1bmRlZmluZWQsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJhc2VQYXRoID0gYWRkUGF0aDsgICAvLyBObyBuZWVkIHRvIGNsb25lLCB3ZSd2ZSBwdWxsZWQgaXQgZnJvbSB0aGUgbGlzdFxuICAgICAgICAgIGJhc2VQYXRoLm5ld1BvcysrO1xuICAgICAgICAgIHNlbGYucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCB0cnVlLCB1bmRlZmluZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgb2xkUG9zID0gc2VsZi5leHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGhpdCB0aGUgZW5kIG9mIGJvdGggc3RyaW5ncywgdGhlbiB3ZSBhcmUgZG9uZVxuICAgICAgICBpZiAoYmFzZVBhdGgubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgICAgICByZXR1cm4gZG9uZShidWlsZFZhbHVlcyhzZWxmLCBiYXNlUGF0aC5jb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgc2VsZi51c2VMb25nZXN0VG9rZW4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgdHJhY2sgdGhpcyBwYXRoIGFzIGEgcG90ZW50aWFsIGNhbmRpZGF0ZSBhbmQgY29udGludWUuXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IGJhc2VQYXRoO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVkaXRMZW5ndGgrKztcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtcyB0aGUgbGVuZ3RoIG9mIGVkaXQgaXRlcmF0aW9uLiBJcyBhIGJpdCBmdWdseSBhcyB0aGlzIGhhcyB0byBzdXBwb3J0IHRoZVxuICAgIC8vIHN5bmMgYW5kIGFzeW5jIG1vZGUgd2hpY2ggaXMgbmV2ZXIgZnVuLiBMb29wcyBvdmVyIGV4ZWNFZGl0TGVuZ3RoIHVudGlsIGEgdmFsdWVcbiAgICAvLyBpcyBwcm9kdWNlZC5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIChmdW5jdGlvbiBleGVjKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIG5vdCBoYXBwZW4sIGJ1dCB3ZSB3YW50IHRvIGJlIHNhZmUuXG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICBpZiAoZWRpdExlbmd0aCA+IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZXhlY0VkaXRMZW5ndGgoKSkge1xuICAgICAgICAgICAgZXhlYygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgICB9KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAoZWRpdExlbmd0aCA8PSBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgIGxldCByZXQgPSBleGVjRWRpdExlbmd0aCgpO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwdXNoQ29tcG9uZW50KGNvbXBvbmVudHMsIGFkZGVkLCByZW1vdmVkKSB7XG4gICAgbGV0IGxhc3QgPSBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKGxhc3QgJiYgbGFzdC5hZGRlZCA9PT0gYWRkZWQgJiYgbGFzdC5yZW1vdmVkID09PSByZW1vdmVkKSB7XG4gICAgICAvLyBXZSBuZWVkIHRvIGNsb25lIGhlcmUgYXMgdGhlIGNvbXBvbmVudCBjbG9uZSBvcGVyYXRpb24gaXMganVzdFxuICAgICAgLy8gYXMgc2hhbGxvdyBhcnJheSBjbG9uZVxuICAgICAgY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdID0ge2NvdW50OiBsYXN0LmNvdW50ICsgMSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudHMucHVzaCh7Y291bnQ6IDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9KTtcbiAgICB9XG4gIH0sXG4gIGV4dHJhY3RDb21tb24oYmFzZVBhdGgsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBkaWFnb25hbFBhdGgpIHtcbiAgICBsZXQgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCxcbiAgICAgICAgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aCxcbiAgICAgICAgbmV3UG9zID0gYmFzZVBhdGgubmV3UG9zLFxuICAgICAgICBvbGRQb3MgPSBuZXdQb3MgLSBkaWFnb25hbFBhdGgsXG5cbiAgICAgICAgY29tbW9uQ291bnQgPSAwO1xuICAgIHdoaWxlIChuZXdQb3MgKyAxIDwgbmV3TGVuICYmIG9sZFBvcyArIDEgPCBvbGRMZW4gJiYgdGhpcy5lcXVhbHMobmV3U3RyaW5nW25ld1BvcyArIDFdLCBvbGRTdHJpbmdbb2xkUG9zICsgMV0pKSB7XG4gICAgICBuZXdQb3MrKztcbiAgICAgIG9sZFBvcysrO1xuICAgICAgY29tbW9uQ291bnQrKztcbiAgICB9XG5cbiAgICBpZiAoY29tbW9uQ291bnQpIHtcbiAgICAgIGJhc2VQYXRoLmNvbXBvbmVudHMucHVzaCh7Y291bnQ6IGNvbW1vbkNvdW50fSk7XG4gICAgfVxuXG4gICAgYmFzZVBhdGgubmV3UG9zID0gbmV3UG9zO1xuICAgIHJldHVybiBvbGRQb3M7XG4gIH0sXG5cbiAgZXF1YWxzKGxlZnQsIHJpZ2h0KSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0O1xuICB9LFxuICByZW1vdmVFbXB0eShhcnJheSkge1xuICAgIGxldCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyYXlbaV0pIHtcbiAgICAgICAgcmV0LnB1c2goYXJyYXlbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuICBjYXN0SW5wdXQodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG4gIHRva2VuaXplKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnNwbGl0KCcnKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYnVpbGRWYWx1ZXMoZGlmZiwgY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHVzZUxvbmdlc3RUb2tlbikge1xuICBsZXQgY29tcG9uZW50UG9zID0gMCxcbiAgICAgIGNvbXBvbmVudExlbiA9IGNvbXBvbmVudHMubGVuZ3RoLFxuICAgICAgbmV3UG9zID0gMCxcbiAgICAgIG9sZFBvcyA9IDA7XG5cbiAgZm9yICg7IGNvbXBvbmVudFBvcyA8IGNvbXBvbmVudExlbjsgY29tcG9uZW50UG9zKyspIHtcbiAgICBsZXQgY29tcG9uZW50ID0gY29tcG9uZW50c1tjb21wb25lbnRQb3NdO1xuICAgIGlmICghY29tcG9uZW50LnJlbW92ZWQpIHtcbiAgICAgIGlmICghY29tcG9uZW50LmFkZGVkICYmIHVzZUxvbmdlc3RUb2tlbikge1xuICAgICAgICBsZXQgdmFsdWUgPSBuZXdTdHJpbmcuc2xpY2UobmV3UG9zLCBuZXdQb3MgKyBjb21wb25lbnQuY291bnQpO1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLm1hcChmdW5jdGlvbih2YWx1ZSwgaSkge1xuICAgICAgICAgIGxldCBvbGRWYWx1ZSA9IG9sZFN0cmluZ1tvbGRQb3MgKyBpXTtcbiAgICAgICAgICByZXR1cm4gb2xkVmFsdWUubGVuZ3RoID4gdmFsdWUubGVuZ3RoID8gb2xkVmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gdmFsdWUuam9pbignJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wb25lbnQudmFsdWUgPSBuZXdTdHJpbmcuc2xpY2UobmV3UG9zLCBuZXdQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgbmV3UG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gQ29tbW9uIGNhc2VcbiAgICAgIGlmICghY29tcG9uZW50LmFkZGVkKSB7XG4gICAgICAgIG9sZFBvcyArPSBjb21wb25lbnQuY291bnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudC52YWx1ZSA9IG9sZFN0cmluZy5zbGljZShvbGRQb3MsIG9sZFBvcyArIGNvbXBvbmVudC5jb3VudCkuam9pbignJyk7XG4gICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuXG4gICAgICAvLyBSZXZlcnNlIGFkZCBhbmQgcmVtb3ZlIHNvIHJlbW92ZXMgYXJlIG91dHB1dCBmaXJzdCB0byBtYXRjaCBjb21tb24gY29udmVudGlvblxuICAgICAgLy8gVGhlIGRpZmZpbmcgYWxnb3JpdGhtIGlzIHRpZWQgdG8gYWRkIHRoZW4gcmVtb3ZlIG91dHB1dCBhbmQgdGhpcyBpcyB0aGUgc2ltcGxlc3RcbiAgICAgIC8vIHJvdXRlIHRvIGdldCB0aGUgZGVzaXJlZCBvdXRwdXQgd2l0aCBtaW5pbWFsIG92ZXJoZWFkLlxuICAgICAgaWYgKGNvbXBvbmVudFBvcyAmJiBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdLmFkZGVkKSB7XG4gICAgICAgIGxldCB0bXAgPSBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdO1xuICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdID0gY29tcG9uZW50c1tjb21wb25lbnRQb3NdO1xuICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudFBvc10gPSB0bXA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGhhbmRsZSBmb3Igd2hlbiBvbmUgdGVybWluYWwgaXMgaWdub3JlZC4gRm9yIHRoaXMgY2FzZSB3ZSBtZXJnZSB0aGVcbiAgLy8gdGVybWluYWwgaW50byB0aGUgcHJpb3Igc3RyaW5nIGFuZCBkcm9wIHRoZSBjaGFuZ2UuXG4gIGxldCBsYXN0Q29tcG9uZW50ID0gY29tcG9uZW50c1tjb21wb25lbnRMZW4gLSAxXTtcbiAgaWYgKChsYXN0Q29tcG9uZW50LmFkZGVkIHx8IGxhc3RDb21wb25lbnQucmVtb3ZlZCkgJiYgZGlmZi5lcXVhbHMoJycsIGxhc3RDb21wb25lbnQudmFsdWUpKSB7XG4gICAgY29tcG9uZW50c1tjb21wb25lbnRMZW4gLSAyXS52YWx1ZSArPSBsYXN0Q29tcG9uZW50LnZhbHVlO1xuICAgIGNvbXBvbmVudHMucG9wKCk7XG4gIH1cblxuICByZXR1cm4gY29tcG9uZW50cztcbn1cblxuZnVuY3Rpb24gY2xvbmVQYXRoKHBhdGgpIHtcbiAgcmV0dXJuIHsgbmV3UG9zOiBwYXRoLm5ld1BvcywgY29tcG9uZW50czogcGF0aC5jb21wb25lbnRzLnNsaWNlKDApIH07XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY2hhcmFjdGVyRGlmZiA9IG5ldyBEaWZmKCk7XG5leHBvcnQgZnVuY3Rpb24gZGlmZkNoYXJzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gY2hhcmFjdGVyRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBjb25zdCBjc3NEaWZmID0gbmV3IERpZmYoKTtcbmNzc0RpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhbe306OyxdfFxccyspLyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkNzcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNzc0RpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtsaW5lRGlmZn0gZnJvbSAnLi9saW5lJztcblxuY29uc3Qgb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5cbmV4cG9ydCBjb25zdCBqc29uRGlmZiA9IG5ldyBEaWZmKCk7XG4vLyBEaXNjcmltaW5hdGUgYmV0d2VlbiB0d28gbGluZXMgb2YgcHJldHR5LXByaW50ZWQsIHNlcmlhbGl6ZWQgSlNPTiB3aGVyZSBvbmUgb2YgdGhlbSBoYXMgYVxuLy8gZGFuZ2xpbmcgY29tbWEgYW5kIHRoZSBvdGhlciBkb2Vzbid0LiBUdXJucyBvdXQgaW5jbHVkaW5nIHRoZSBkYW5nbGluZyBjb21tYSB5aWVsZHMgdGhlIG5pY2VzdCBvdXRwdXQ6XG5qc29uRGlmZi51c2VMb25nZXN0VG9rZW4gPSB0cnVlO1xuXG5qc29uRGlmZi50b2tlbml6ZSA9IGxpbmVEaWZmLnRva2VuaXplO1xuanNvbkRpZmYuY2FzdElucHV0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IEpTT04uc3RyaW5naWZ5KGNhbm9uaWNhbGl6ZSh2YWx1ZSksIHVuZGVmaW5lZCwgJyAgJyk7XG59O1xuanNvbkRpZmYuZXF1YWxzID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIERpZmYucHJvdG90eXBlLmVxdWFscyhsZWZ0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpLCByaWdodC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkpzb24ob2xkT2JqLCBuZXdPYmosIGNhbGxiYWNrKSB7IHJldHVybiBqc29uRGlmZi5kaWZmKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjayk7IH1cblxuXG4vLyBUaGlzIGZ1bmN0aW9uIGhhbmRsZXMgdGhlIHByZXNlbmNlIG9mIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgYmFpbGluZyBvdXQgd2hlbiBlbmNvdW50ZXJpbmcgYW5cbi8vIG9iamVjdCB0aGF0IGlzIGFscmVhZHkgb24gdGhlIFwic3RhY2tcIiBvZiBpdGVtcyBiZWluZyBwcm9jZXNzZWQuXG5leHBvcnQgZnVuY3Rpb24gY2Fub25pY2FsaXplKG9iaiwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spIHtcbiAgc3RhY2sgPSBzdGFjayB8fCBbXTtcbiAgcmVwbGFjZW1lbnRTdGFjayA9IHJlcGxhY2VtZW50U3RhY2sgfHwgW107XG5cbiAgbGV0IGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHN0YWNrW2ldID09PSBvYmopIHtcbiAgICAgIHJldHVybiByZXBsYWNlbWVudFN0YWNrW2ldO1xuICAgIH1cbiAgfVxuXG4gIGxldCBjYW5vbmljYWxpemVkT2JqO1xuXG4gIGlmICgnW29iamVjdCBBcnJheV0nID09PSBvYmplY3RQcm90b3R5cGVUb1N0cmluZy5jYWxsKG9iaikpIHtcbiAgICBzdGFjay5wdXNoKG9iaik7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IG5ldyBBcnJheShvYmoubGVuZ3RoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgZm9yIChpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgY2Fub25pY2FsaXplZE9ialtpXSA9IGNhbm9uaWNhbGl6ZShvYmpbaV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogIT09IG51bGwpIHtcbiAgICBzdGFjay5wdXNoKG9iaik7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IHt9O1xuICAgIHJlcGxhY2VtZW50U3RhY2sucHVzaChjYW5vbmljYWxpemVkT2JqKTtcbiAgICBsZXQgc29ydGVkS2V5cyA9IFtdLFxuICAgICAgICBrZXk7XG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNvcnRlZEtleXMucHVzaChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3J0ZWRLZXlzLnNvcnQoKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc29ydGVkS2V5cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAga2V5ID0gc29ydGVkS2V5c1tpXTtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpba2V5XSA9IGNhbm9uaWNhbGl6ZShvYmpba2V5XSwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spO1xuICAgIH1cbiAgICBzdGFjay5wb3AoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICB9IGVsc2Uge1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBvYmo7XG4gIH1cbiAgcmV0dXJuIGNhbm9uaWNhbGl6ZWRPYmo7XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtnZW5lcmF0ZU9wdGlvbnN9IGZyb20gJy4uL3V0aWwvcGFyYW1zJztcblxuZXhwb3J0IGNvbnN0IGxpbmVEaWZmID0gbmV3IERpZmYoKTtcbmxpbmVEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHJldExpbmVzID0gW10sXG4gICAgICBsaW5lc0FuZE5ld2xpbmVzID0gdmFsdWUuc3BsaXQoLyhcXG58XFxyXFxuKS8pO1xuXG4gIC8vIElnbm9yZSB0aGUgZmluYWwgZW1wdHkgdG9rZW4gdGhhdCBvY2N1cnMgaWYgdGhlIHN0cmluZyBlbmRzIHdpdGggYSBuZXcgbGluZVxuICBpZiAoIWxpbmVzQW5kTmV3bGluZXNbbGluZXNBbmROZXdsaW5lcy5sZW5ndGggLSAxXSkge1xuICAgIGxpbmVzQW5kTmV3bGluZXMucG9wKCk7XG4gIH1cblxuICAvLyBNZXJnZSB0aGUgY29udGVudCBhbmQgbGluZSBzZXBhcmF0b3JzIGludG8gc2luZ2xlIHRva2Vuc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzQW5kTmV3bGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgbGluZSA9IGxpbmVzQW5kTmV3bGluZXNbaV07XG5cbiAgICBpZiAoaSAlIDIgJiYgIXRoaXMub3B0aW9ucy5uZXdsaW5lSXNUb2tlbikge1xuICAgICAgcmV0TGluZXNbcmV0TGluZXMubGVuZ3RoIC0gMV0gKz0gbGluZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlKSB7XG4gICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgIH1cbiAgICAgIHJldExpbmVzLnB1c2gobGluZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldExpbmVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZMaW5lcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZUcmltbWVkTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gbGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5cbmV4cG9ydCBjb25zdCBzZW50ZW5jZURpZmYgPSBuZXcgRGlmZigpO1xuc2VudGVuY2VEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oXFxTLis/Wy4hP10pKD89XFxzK3wkKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZTZW50ZW5jZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBzZW50ZW5jZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtnZW5lcmF0ZU9wdGlvbnN9IGZyb20gJy4uL3V0aWwvcGFyYW1zJztcblxuLy8gQmFzZWQgb24gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGF0aW5fc2NyaXB0X2luX1VuaWNvZGVcbi8vXG4vLyBSYW5nZXMgYW5kIGV4Y2VwdGlvbnM6XG4vLyBMYXRpbi0xIFN1cHBsZW1lbnQsIDAwODDigJMwMEZGXG4vLyAgLSBVKzAwRDcgIMOXIE11bHRpcGxpY2F0aW9uIHNpZ25cbi8vICAtIFUrMDBGNyAgw7cgRGl2aXNpb24gc2lnblxuLy8gTGF0aW4gRXh0ZW5kZWQtQSwgMDEwMOKAkzAxN0Zcbi8vIExhdGluIEV4dGVuZGVkLUIsIDAxODDigJMwMjRGXG4vLyBJUEEgRXh0ZW5zaW9ucywgMDI1MOKAkzAyQUZcbi8vIFNwYWNpbmcgTW9kaWZpZXIgTGV0dGVycywgMDJCMOKAkzAyRkZcbi8vICAtIFUrMDJDNyAgy4cgJiM3MTE7ICBDYXJvblxuLy8gIC0gVSswMkQ4ICDLmCAmIzcyODsgIEJyZXZlXG4vLyAgLSBVKzAyRDkgIMuZICYjNzI5OyAgRG90IEFib3ZlXG4vLyAgLSBVKzAyREEgIMuaICYjNzMwOyAgUmluZyBBYm92ZVxuLy8gIC0gVSswMkRCICDLmyAmIzczMTsgIE9nb25la1xuLy8gIC0gVSswMkRDICDLnCAmIzczMjsgIFNtYWxsIFRpbGRlXG4vLyAgLSBVKzAyREQgIMudICYjNzMzOyAgRG91YmxlIEFjdXRlIEFjY2VudFxuLy8gTGF0aW4gRXh0ZW5kZWQgQWRkaXRpb25hbCwgMUUwMOKAkzFFRkZcbmNvbnN0IGV4dGVuZGVkV29yZENoYXJzID0gL15bYS16QS1aXFx1e0MwfS1cXHV7RkZ9XFx1e0Q4fS1cXHV7RjZ9XFx1e0Y4fS1cXHV7MkM2fVxcdXsyQzh9LVxcdXsyRDd9XFx1ezJERX0tXFx1ezJGRn1cXHV7MUUwMH0tXFx1ezFFRkZ9XSskL3U7XG5cbmNvbnN0IHJlV2hpdGVzcGFjZSA9IC9cXFMvO1xuXG5leHBvcnQgY29uc3Qgd29yZERpZmYgPSBuZXcgRGlmZigpO1xud29yZERpZmYuZXF1YWxzID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0IHx8ICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QobGVmdCkgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KHJpZ2h0KSk7XG59O1xud29yZERpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBsZXQgdG9rZW5zID0gdmFsdWUuc3BsaXQoLyhcXHMrfFxcYikvKTtcblxuICAvLyBKb2luIHRoZSBib3VuZGFyeSBzcGxpdHMgdGhhdCB3ZSBkbyBub3QgY29uc2lkZXIgdG8gYmUgYm91bmRhcmllcy4gVGhpcyBpcyBwcmltYXJpbHkgdGhlIGV4dGVuZGVkIExhdGluIGNoYXJhY3RlciBzZXQuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIC8vIElmIHdlIGhhdmUgYW4gZW1wdHkgc3RyaW5nIGluIHRoZSBuZXh0IGZpZWxkIGFuZCB3ZSBoYXZlIG9ubHkgd29yZCBjaGFycyBiZWZvcmUgYW5kIGFmdGVyLCBtZXJnZVxuICAgIGlmICghdG9rZW5zW2kgKyAxXSAmJiB0b2tlbnNbaSArIDJdXG4gICAgICAgICAgJiYgZXh0ZW5kZWRXb3JkQ2hhcnMudGVzdCh0b2tlbnNbaV0pXG4gICAgICAgICAgJiYgZXh0ZW5kZWRXb3JkQ2hhcnMudGVzdCh0b2tlbnNbaSArIDJdKSkge1xuICAgICAgdG9rZW5zW2ldICs9IHRva2Vuc1tpICsgMl07XG4gICAgICB0b2tlbnMuc3BsaWNlKGkgKyAxLCAyKTtcbiAgICAgIGktLTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9rZW5zO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZXb3JkcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgbGV0IG9wdGlvbnMgPSBnZW5lcmF0ZU9wdGlvbnMoY2FsbGJhY2ssIHtpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlfSk7XG4gIHJldHVybiB3b3JkRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHNXaXRoU3BhY2Uob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB3b3JkRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7XG59XG4iLCIvKiBTZWUgTElDRU5TRSBmaWxlIGZvciB0ZXJtcyBvZiB1c2UgKi9cblxuLypcbiAqIFRleHQgZGlmZiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBUaGlzIGxpYnJhcnkgc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBBUElTOlxuICogSnNEaWZmLmRpZmZDaGFyczogQ2hhcmFjdGVyIGJ5IGNoYXJhY3RlciBkaWZmXG4gKiBKc0RpZmYuZGlmZldvcmRzOiBXb3JkIChhcyBkZWZpbmVkIGJ5IFxcYiByZWdleCkgZGlmZiB3aGljaCBpZ25vcmVzIHdoaXRlc3BhY2VcbiAqIEpzRGlmZi5kaWZmTGluZXM6IExpbmUgYmFzZWQgZGlmZlxuICpcbiAqIEpzRGlmZi5kaWZmQ3NzOiBEaWZmIHRhcmdldGVkIGF0IENTUyBjb250ZW50XG4gKlxuICogVGhlc2UgbWV0aG9kcyBhcmUgYmFzZWQgb24gdGhlIGltcGxlbWVudGF0aW9uIHByb3Bvc2VkIGluXG4gKiBcIkFuIE8oTkQpIERpZmZlcmVuY2UgQWxnb3JpdGhtIGFuZCBpdHMgVmFyaWF0aW9uc1wiIChNeWVycywgMTk4NikuXG4gKiBodHRwOi8vY2l0ZXNlZXJ4LmlzdC5wc3UuZWR1L3ZpZXdkb2Mvc3VtbWFyeT9kb2k9MTAuMS4xLjQuNjkyN1xuICovXG5pbXBvcnQgRGlmZiBmcm9tICcuL2RpZmYvYmFzZSc7XG5pbXBvcnQge2RpZmZDaGFyc30gZnJvbSAnLi9kaWZmL2NoYXJhY3Rlcic7XG5pbXBvcnQge2RpZmZXb3JkcywgZGlmZldvcmRzV2l0aFNwYWNlfSBmcm9tICcuL2RpZmYvd29yZCc7XG5pbXBvcnQge2RpZmZMaW5lcywgZGlmZlRyaW1tZWRMaW5lc30gZnJvbSAnLi9kaWZmL2xpbmUnO1xuaW1wb3J0IHtkaWZmU2VudGVuY2VzfSBmcm9tICcuL2RpZmYvc2VudGVuY2UnO1xuXG5pbXBvcnQge2RpZmZDc3N9IGZyb20gJy4vZGlmZi9jc3MnO1xuaW1wb3J0IHtkaWZmSnNvbiwgY2Fub25pY2FsaXplfSBmcm9tICcuL2RpZmYvanNvbic7XG5cbmltcG9ydCB7YXBwbHlQYXRjaCwgYXBwbHlQYXRjaGVzfSBmcm9tICcuL3BhdGNoL2FwcGx5JztcbmltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXRjaC9wYXJzZSc7XG5pbXBvcnQge3N0cnVjdHVyZWRQYXRjaCwgY3JlYXRlVHdvRmlsZXNQYXRjaCwgY3JlYXRlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvY3JlYXRlJztcblxuaW1wb3J0IHtjb252ZXJ0Q2hhbmdlc1RvRE1QfSBmcm9tICcuL2NvbnZlcnQvZG1wJztcbmltcG9ydCB7Y29udmVydENoYW5nZXNUb1hNTH0gZnJvbSAnLi9jb252ZXJ0L3htbCc7XG5cbmV4cG9ydCB7XG4gIERpZmYsXG5cbiAgZGlmZkNoYXJzLFxuICBkaWZmV29yZHMsXG4gIGRpZmZXb3Jkc1dpdGhTcGFjZSxcbiAgZGlmZkxpbmVzLFxuICBkaWZmVHJpbW1lZExpbmVzLFxuICBkaWZmU2VudGVuY2VzLFxuXG4gIGRpZmZDc3MsXG4gIGRpZmZKc29uLFxuXG4gIHN0cnVjdHVyZWRQYXRjaCxcbiAgY3JlYXRlVHdvRmlsZXNQYXRjaCxcbiAgY3JlYXRlUGF0Y2gsXG4gIGFwcGx5UGF0Y2gsXG4gIGFwcGx5UGF0Y2hlcyxcbiAgcGFyc2VQYXRjaCxcbiAgY29udmVydENoYW5nZXNUb0RNUCxcbiAgY29udmVydENoYW5nZXNUb1hNTCxcbiAgY2Fub25pY2FsaXplXG59O1xuIiwiaW1wb3J0IHtwYXJzZVBhdGNofSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCBkaXN0YW5jZUl0ZXJhdG9yIGZyb20gJy4uL3V0aWwvZGlzdGFuY2UtaXRlcmF0b3InO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaChzb3VyY2UsIHVuaURpZmYsIG9wdGlvbnMgPSB7fSkge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh1bmlEaWZmKSkge1xuICAgIGlmICh1bmlEaWZmLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXBwbHlQYXRjaCBvbmx5IHdvcmtzIHdpdGggYSBzaW5nbGUgaW5wdXQuJyk7XG4gICAgfVxuXG4gICAgdW5pRGlmZiA9IHVuaURpZmZbMF07XG4gIH1cblxuICAvLyBBcHBseSB0aGUgZGlmZiB0byB0aGUgaW5wdXRcbiAgbGV0IGxpbmVzID0gc291cmNlLnNwbGl0KCdcXG4nKSxcbiAgICAgIGh1bmtzID0gdW5pRGlmZi5odW5rcyxcblxuICAgICAgY29tcGFyZUxpbmUgPSBvcHRpb25zLmNvbXBhcmVMaW5lIHx8ICgobGluZU51bWJlciwgbGluZSwgb3BlcmF0aW9uLCBwYXRjaENvbnRlbnQpID0+IGxpbmUgPT09IHBhdGNoQ29udGVudCksXG4gICAgICBlcnJvckNvdW50ID0gMCxcbiAgICAgIGZ1enpGYWN0b3IgPSBvcHRpb25zLmZ1enpGYWN0b3IgfHwgMCxcbiAgICAgIG1pbkxpbmUgPSAwLFxuICAgICAgb2Zmc2V0ID0gMCxcblxuICAgICAgcmVtb3ZlRU9GTkwsXG4gICAgICBhZGRFT0ZOTDtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBodW5rIGV4YWN0bHkgZml0cyBvbiB0aGUgcHJvdmlkZWQgbG9jYXRpb25cbiAgICovXG4gIGZ1bmN0aW9uIGh1bmtGaXRzKGh1bmssIHRvUG9zKSB7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBsZXQgbGluZSA9IGh1bmsubGluZXNbal0sXG4gICAgICAgICAgb3BlcmF0aW9uID0gbGluZVswXSxcbiAgICAgICAgICBjb250ZW50ID0gbGluZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAvLyBDb250ZXh0IHNhbml0eSBjaGVja1xuICAgICAgICBpZiAoIWNvbXBhcmVMaW5lKHRvUG9zICsgMSwgbGluZXNbdG9Qb3NdLCBvcGVyYXRpb24sIGNvbnRlbnQpKSB7XG4gICAgICAgICAgZXJyb3JDb3VudCsrO1xuXG4gICAgICAgICAgaWYgKGVycm9yQ291bnQgPiBmdXp6RmFjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBTZWFyY2ggYmVzdCBmaXQgb2Zmc2V0cyBmb3IgZWFjaCBodW5rIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBvbmVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICBtYXhMaW5lID0gbGluZXMubGVuZ3RoIC0gaHVuay5vbGRMaW5lcyxcbiAgICAgICAgbG9jYWxPZmZzZXQgPSAwLFxuICAgICAgICB0b1BvcyA9IG9mZnNldCArIGh1bmsub2xkU3RhcnQgLSAxO1xuXG4gICAgbGV0IGl0ZXJhdG9yID0gZGlzdGFuY2VJdGVyYXRvcih0b1BvcywgbWluTGluZSwgbWF4TGluZSk7XG5cbiAgICBmb3IgKDsgbG9jYWxPZmZzZXQgIT09IHVuZGVmaW5lZDsgbG9jYWxPZmZzZXQgPSBpdGVyYXRvcigpKSB7XG4gICAgICBpZiAoaHVua0ZpdHMoaHVuaywgdG9Qb3MgKyBsb2NhbE9mZnNldCkpIHtcbiAgICAgICAgaHVuay5vZmZzZXQgPSBvZmZzZXQgKz0gbG9jYWxPZmZzZXQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsb2NhbE9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvd2VyIHRleHQgbGltaXQgdG8gZW5kIG9mIHRoZSBjdXJyZW50IGh1bmssIHNvIG5leHQgb25lcyBkb24ndCB0cnlcbiAgICAvLyB0byBmaXQgb3ZlciBhbHJlYWR5IHBhdGNoZWQgdGV4dFxuICAgIG1pbkxpbmUgPSBodW5rLm9mZnNldCArIGh1bmsub2xkU3RhcnQgKyBodW5rLm9sZExpbmVzO1xuICB9XG5cbiAgLy8gQXBwbHkgcGF0Y2ggaHVua3NcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBodW5rID0gaHVua3NbaV0sXG4gICAgICAgIHRvUG9zID0gaHVuay5vZmZzZXQgKyBodW5rLm5ld1N0YXJ0IC0gMTtcblxuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgbGluZXMuc3BsaWNlKHRvUG9zLCAxKTtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMCwgY29udGVudCk7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIGxldCBwcmV2aW91c09wZXJhdGlvbiA9IGh1bmsubGluZXNbaiAtIDFdID8gaHVuay5saW5lc1tqIC0gMV1bMF0gOiBudWxsO1xuICAgICAgICBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICAgIHJlbW92ZUVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgYWRkRU9GTkwgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIEVPRk5MIGluc2VydGlvbi9yZW1vdmFsXG4gIGlmIChyZW1vdmVFT0ZOTCkge1xuICAgIHdoaWxlICghbGluZXNbbGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICAgIGxpbmVzLnBvcCgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChhZGRFT0ZOTCkge1xuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuLy8gV3JhcHBlciB0aGF0IHN1cHBvcnRzIG11bHRpcGxlIGZpbGUgcGF0Y2hlcyB2aWEgY2FsbGJhY2tzLlxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2hlcyh1bmlEaWZmLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgfVxuXG4gIGxldCBjdXJyZW50SW5kZXggPSAwO1xuICBmdW5jdGlvbiBwcm9jZXNzSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0gdW5pRGlmZltjdXJyZW50SW5kZXgrK107XG4gICAgaWYgKCFpbmRleCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmxvYWRGaWxlKGluZGV4LCBmdW5jdGlvbihlcnIsIGRhdGEpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoZXJyKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHVwZGF0ZWRDb250ZW50ID0gYXBwbHlQYXRjaChkYXRhLCBpbmRleCwgb3B0aW9ucyk7XG4gICAgICBvcHRpb25zLnBhdGNoZWQoaW5kZXgsIHVwZGF0ZWRDb250ZW50KTtcblxuICAgICAgc2V0VGltZW91dChwcm9jZXNzSW5kZXgsIDApO1xuICAgIH0pO1xuICB9XG4gIHByb2Nlc3NJbmRleCgpO1xufVxuIiwiaW1wb3J0IHtkaWZmTGluZXN9IGZyb20gJy4uL2RpZmYvbGluZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHsgY29udGV4dDogNCB9O1xuICB9XG5cbiAgY29uc3QgZGlmZiA9IGRpZmZMaW5lcyhvbGRTdHIsIG5ld1N0cik7XG4gIGRpZmYucHVzaCh7dmFsdWU6ICcnLCBsaW5lczogW119KTsgICAvLyBBcHBlbmQgYW4gZW1wdHkgdmFsdWUgdG8gbWFrZSBjbGVhbnVwIGVhc2llclxuXG4gIGZ1bmN0aW9uIGNvbnRleHRMaW5lcyhsaW5lcykge1xuICAgIHJldHVybiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHsgcmV0dXJuICcgJyArIGVudHJ5OyB9KTtcbiAgfVxuXG4gIGxldCBodW5rcyA9IFtdO1xuICBsZXQgb2xkUmFuZ2VTdGFydCA9IDAsIG5ld1JhbmdlU3RhcnQgPSAwLCBjdXJSYW5nZSA9IFtdLFxuICAgICAgb2xkTGluZSA9IDEsIG5ld0xpbmUgPSAxO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjdXJyZW50ID0gZGlmZltpXSxcbiAgICAgICAgICBsaW5lcyA9IGN1cnJlbnQubGluZXMgfHwgY3VycmVudC52YWx1ZS5yZXBsYWNlKC9cXG4kLywgJycpLnNwbGl0KCdcXG4nKTtcbiAgICBjdXJyZW50LmxpbmVzID0gbGluZXM7XG5cbiAgICBpZiAoY3VycmVudC5hZGRlZCB8fCBjdXJyZW50LnJlbW92ZWQpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgcHJldmlvdXMgY29udGV4dCwgc3RhcnQgd2l0aCB0aGF0XG4gICAgICBpZiAoIW9sZFJhbmdlU3RhcnQpIHtcbiAgICAgICAgY29uc3QgcHJldiA9IGRpZmZbaSAtIDFdO1xuICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gb2xkTGluZTtcbiAgICAgICAgbmV3UmFuZ2VTdGFydCA9IG5ld0xpbmU7XG5cbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICBjdXJSYW5nZSA9IG9wdGlvbnMuY29udGV4dCA+IDAgPyBjb250ZXh0TGluZXMocHJldi5saW5lcy5zbGljZSgtb3B0aW9ucy5jb250ZXh0KSkgOiBbXTtcbiAgICAgICAgICBvbGRSYW5nZVN0YXJ0IC09IGN1clJhbmdlLmxlbmd0aDtcbiAgICAgICAgICBuZXdSYW5nZVN0YXJ0IC09IGN1clJhbmdlLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPdXRwdXQgb3VyIGNoYW5nZXNcbiAgICAgIGN1clJhbmdlLnB1c2goLi4uIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkge1xuICAgICAgICByZXR1cm4gKGN1cnJlbnQuYWRkZWQgPyAnKycgOiAnLScpICsgZW50cnk7XG4gICAgICB9KSk7XG5cbiAgICAgIC8vIFRyYWNrIHRoZSB1cGRhdGVkIGZpbGUgcG9zaXRpb25cbiAgICAgIGlmIChjdXJyZW50LmFkZGVkKSB7XG4gICAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2xkTGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElkZW50aWNhbCBjb250ZXh0IGxpbmVzLiBUcmFjayBsaW5lIGNoYW5nZXNcbiAgICAgIGlmIChvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIC8vIENsb3NlIG91dCBhbnkgY2hhbmdlcyB0aGF0IGhhdmUgYmVlbiBvdXRwdXQgKG9yIGpvaW4gb3ZlcmxhcHBpbmcpXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggPD0gb3B0aW9ucy5jb250ZXh0ICogMiAmJiBpIDwgZGlmZi5sZW5ndGggLSAyKSB7XG4gICAgICAgICAgLy8gT3ZlcmxhcHBpbmdcbiAgICAgICAgICBjdXJSYW5nZS5wdXNoKC4uLiBjb250ZXh0TGluZXMobGluZXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlbmQgdGhlIHJhbmdlIGFuZCBvdXRwdXRcbiAgICAgICAgICBsZXQgY29udGV4dFNpemUgPSBNYXRoLm1pbihsaW5lcy5sZW5ndGgsIG9wdGlvbnMuY29udGV4dCk7XG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzLnNsaWNlKDAsIGNvbnRleHRTaXplKSkpO1xuXG4gICAgICAgICAgbGV0IGh1bmsgPSB7XG4gICAgICAgICAgICBvbGRTdGFydDogb2xkUmFuZ2VTdGFydCxcbiAgICAgICAgICAgIG9sZExpbmVzOiAob2xkTGluZSAtIG9sZFJhbmdlU3RhcnQgKyBjb250ZXh0U2l6ZSksXG4gICAgICAgICAgICBuZXdTdGFydDogbmV3UmFuZ2VTdGFydCxcbiAgICAgICAgICAgIG5ld0xpbmVzOiAobmV3TGluZSAtIG5ld1JhbmdlU3RhcnQgKyBjb250ZXh0U2l6ZSksXG4gICAgICAgICAgICBsaW5lczogY3VyUmFuZ2VcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChpID49IGRpZmYubGVuZ3RoIC0gMiAmJiBsaW5lcy5sZW5ndGggPD0gb3B0aW9ucy5jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBFT0YgaXMgaW5zaWRlIHRoaXMgaHVua1xuICAgICAgICAgICAgbGV0IG9sZEVPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3Qob2xkU3RyKSk7XG4gICAgICAgICAgICBsZXQgbmV3RU9GTmV3bGluZSA9ICgvXFxuJC8udGVzdChuZXdTdHIpKTtcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPT0gMCAmJiAhb2xkRU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICAvLyBzcGVjaWFsIGNhc2U6IG9sZCBoYXMgbm8gZW9sIGFuZCBubyB0cmFpbGluZyBjb250ZXh0OyBuby1ubCBjYW4gZW5kIHVwIGJlZm9yZSBhZGRzXG4gICAgICAgICAgICAgIGN1clJhbmdlLnNwbGljZShodW5rLm9sZExpbmVzLCAwLCAnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFvbGRFT0ZOZXdsaW5lIHx8ICFuZXdFT0ZOZXdsaW5lKSB7XG4gICAgICAgICAgICAgIGN1clJhbmdlLnB1c2goJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBodW5rcy5wdXNoKGh1bmspO1xuXG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCA9IDA7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCA9IDA7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb2xkTGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG9sZEZpbGVOYW1lOiBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWU6IG5ld0ZpbGVOYW1lLFxuICAgIG9sZEhlYWRlcjogb2xkSGVhZGVyLCBuZXdIZWFkZXI6IG5ld0hlYWRlcixcbiAgICBodW5rczogaHVua3NcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgY29uc3QgZGlmZiA9IHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG5cbiAgY29uc3QgcmV0ID0gW107XG4gIGlmIChvbGRGaWxlTmFtZSA9PSBuZXdGaWxlTmFtZSkge1xuICAgIHJldC5wdXNoKCdJbmRleDogJyArIG9sZEZpbGVOYW1lKTtcbiAgfVxuICByZXQucHVzaCgnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpO1xuICByZXQucHVzaCgnLS0tICcgKyBkaWZmLm9sZEZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm9sZEhlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5vbGRIZWFkZXIpKTtcbiAgcmV0LnB1c2goJysrKyAnICsgZGlmZi5uZXdGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5uZXdIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYubmV3SGVhZGVyKSk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgaHVuayA9IGRpZmYuaHVua3NbaV07XG4gICAgcmV0LnB1c2goXG4gICAgICAnQEAgLScgKyBodW5rLm9sZFN0YXJ0ICsgJywnICsgaHVuay5vbGRMaW5lc1xuICAgICAgKyAnICsnICsgaHVuay5uZXdTdGFydCArICcsJyArIGh1bmsubmV3TGluZXNcbiAgICAgICsgJyBAQCdcbiAgICApO1xuICAgIHJldC5wdXNoLmFwcGx5KHJldCwgaHVuay5saW5lcyk7XG4gIH1cblxuICByZXR1cm4gcmV0LmpvaW4oJ1xcbicpICsgJ1xcbic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYXRjaChmaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIHJldHVybiBjcmVhdGVUd29GaWxlc1BhdGNoKGZpbGVOYW1lLCBmaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBwYXJzZVBhdGNoKHVuaURpZmYsIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgZGlmZnN0ciA9IHVuaURpZmYuc3BsaXQoJ1xcbicpLFxuICAgICAgbGlzdCA9IFtdLFxuICAgICAgaSA9IDA7XG5cbiAgZnVuY3Rpb24gcGFyc2VJbmRleCgpIHtcbiAgICBsZXQgaW5kZXggPSB7fTtcbiAgICBsaXN0LnB1c2goaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgZGlmZiBtZXRhZGF0YVxuICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgIGxldCBsaW5lID0gZGlmZnN0cltpXTtcblxuICAgICAgLy8gRmlsZSBoZWFkZXIgZm91bmQsIGVuZCBwYXJzaW5nIGRpZmYgbWV0YWRhdGFcbiAgICAgIGlmICgvXihcXC1cXC1cXC18XFwrXFwrXFwrfEBAKVxccy8udGVzdChsaW5lKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gRGlmZiBpbmRleFxuICAgICAgbGV0IGhlYWRlciA9ICgvXig/OkluZGV4OnxkaWZmKD86IC1yIFxcdyspKylcXHMrKC4rPylcXHMqJC8pLmV4ZWMobGluZSk7XG4gICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgIGluZGV4LmluZGV4ID0gaGVhZGVyWzFdO1xuICAgICAgfVxuXG4gICAgICBpKys7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgZmlsZSBoZWFkZXJzIGlmIHRoZXkgYXJlIGRlZmluZWQuIFVuaWZpZWQgZGlmZiByZXF1aXJlcyB0aGVtLCBidXRcbiAgICAvLyB0aGVyZSdzIG5vIHRlY2huaWNhbCBpc3N1ZXMgdG8gaGF2ZSBhbiBpc29sYXRlZCBodW5rIHdpdGhvdXQgZmlsZSBoZWFkZXJcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuICAgIHBhcnNlRmlsZUhlYWRlcihpbmRleCk7XG5cbiAgICAvLyBQYXJzZSBodW5rc1xuICAgIGluZGV4Lmh1bmtzID0gW107XG5cbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIGlmICgvXihJbmRleDp8ZGlmZnxcXC1cXC1cXC18XFwrXFwrXFwrKVxccy8udGVzdChsaW5lKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoL15AQC8udGVzdChsaW5lKSkge1xuICAgICAgICBpbmRleC5odW5rcy5wdXNoKHBhcnNlSHVuaygpKTtcbiAgICAgIH0gZWxzZSBpZiAobGluZSAmJiBvcHRpb25zLnN0cmljdCkge1xuICAgICAgICAvLyBJZ25vcmUgdW5leHBlY3RlZCBjb250ZW50IHVubGVzcyBpbiBzdHJpY3QgbW9kZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGluZSAnICsgKGkgKyAxKSArICcgJyArIEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZXMgdGhlIC0tLSBhbmQgKysrIGhlYWRlcnMsIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBsaW5lc1xuICAvLyBhcmUgY29uc3VtZWQuXG4gIGZ1bmN0aW9uIHBhcnNlRmlsZUhlYWRlcihpbmRleCkge1xuICAgIGxldCBmaWxlSGVhZGVyID0gKC9eKFxcLVxcLVxcLXxcXCtcXCtcXCspXFxzKyhcXFMrKVxccz8oLis/KVxccyokLykuZXhlYyhkaWZmc3RyW2ldKTtcbiAgICBpZiAoZmlsZUhlYWRlcikge1xuICAgICAgbGV0IGtleVByZWZpeCA9IGZpbGVIZWFkZXJbMV0gPT09ICctLS0nID8gJ29sZCcgOiAnbmV3JztcbiAgICAgIGluZGV4W2tleVByZWZpeCArICdGaWxlTmFtZSddID0gZmlsZUhlYWRlclsyXTtcbiAgICAgIGluZGV4W2tleVByZWZpeCArICdIZWFkZXInXSA9IGZpbGVIZWFkZXJbM107XG5cbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZXMgYSBodW5rXG4gIC8vIFRoaXMgYXNzdW1lcyB0aGF0IHdlIGFyZSBhdCB0aGUgc3RhcnQgb2YgYSBodW5rLlxuICBmdW5jdGlvbiBwYXJzZUh1bmsoKSB7XG4gICAgbGV0IGNodW5rSGVhZGVySW5kZXggPSBpLFxuICAgICAgICBjaHVua0hlYWRlckxpbmUgPSBkaWZmc3RyW2krK10sXG4gICAgICAgIGNodW5rSGVhZGVyID0gY2h1bmtIZWFkZXJMaW5lLnNwbGl0KC9AQCAtKFxcZCspKD86LChcXGQrKSk/IFxcKyhcXGQrKSg/OiwoXFxkKykpPyBAQC8pO1xuXG4gICAgbGV0IGh1bmsgPSB7XG4gICAgICBvbGRTdGFydDogK2NodW5rSGVhZGVyWzFdLFxuICAgICAgb2xkTGluZXM6ICtjaHVua0hlYWRlclsyXSB8fCAxLFxuICAgICAgbmV3U3RhcnQ6ICtjaHVua0hlYWRlclszXSxcbiAgICAgIG5ld0xpbmVzOiArY2h1bmtIZWFkZXJbNF0gfHwgMSxcbiAgICAgIGxpbmVzOiBbXVxuICAgIH07XG5cbiAgICBsZXQgYWRkQ291bnQgPSAwLFxuICAgICAgICByZW1vdmVDb3VudCA9IDA7XG4gICAgZm9yICg7IGkgPCBkaWZmc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgb3BlcmF0aW9uID0gZGlmZnN0cltpXVswXTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnIHx8IG9wZXJhdGlvbiA9PT0gJy0nIHx8IG9wZXJhdGlvbiA9PT0gJyAnIHx8IG9wZXJhdGlvbiA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIGh1bmsubGluZXMucHVzaChkaWZmc3RyW2ldKTtcblxuICAgICAgICBpZiAob3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgcmVtb3ZlQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICAgIGFkZENvdW50Kys7XG4gICAgICAgICAgcmVtb3ZlQ291bnQrKztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHRoZSBlbXB0eSBibG9jayBjb3VudCBjYXNlXG4gICAgaWYgKCFhZGRDb3VudCAmJiBodW5rLm5ld0xpbmVzID09PSAxKSB7XG4gICAgICBodW5rLm5ld0xpbmVzID0gMDtcbiAgICB9XG4gICAgaWYgKCFyZW1vdmVDb3VudCAmJiBodW5rLm9sZExpbmVzID09PSAxKSB7XG4gICAgICBodW5rLm9sZExpbmVzID0gMDtcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtIG9wdGlvbmFsIHNhbml0eSBjaGVja2luZ1xuICAgIGlmIChvcHRpb25zLnN0cmljdCkge1xuICAgICAgaWYgKGFkZENvdW50ICE9PSBodW5rLm5ld0xpbmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQWRkZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgICAgaWYgKHJlbW92ZUNvdW50ICE9PSBodW5rLm9sZExpbmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVtb3ZlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGh1bms7XG4gIH1cblxuICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgcGFyc2VJbmRleCgpO1xuICB9XG5cbiAgcmV0dXJuIGxpc3Q7XG59XG4iLCIvLyBJdGVyYXRvciB0aGF0IHRyYXZlcnNlcyBpbiB0aGUgcmFuZ2Ugb2YgW21pbiwgbWF4XSwgc3RlcHBpbmdcbi8vIGJ5IGRpc3RhbmNlIGZyb20gYSBnaXZlbiBzdGFydCBwb3NpdGlvbi4gSS5lLiBmb3IgWzAsIDRdLCB3aXRoXG4vLyBzdGFydCBvZiAyLCB0aGlzIHdpbGwgaXRlcmF0ZSAyLCAzLCAxLCA0LCAwLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RhcnQsIG1pbkxpbmUsIG1heExpbmUpIHtcbiAgbGV0IHdhbnRGb3J3YXJkID0gdHJ1ZSxcbiAgICAgIGJhY2t3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBsb2NhbE9mZnNldCA9IDE7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgIGlmICh3YW50Rm9yd2FyZCAmJiAhZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKGJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIGxvY2FsT2Zmc2V0Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJleW9uZCB0ZXh0IGxlbmd0aCwgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYWZ0ZXIgb2Zmc2V0IGxvY2F0aW9uIChvciBkZXNpcmVkIGxvY2F0aW9uIG9uIGZpcnN0IGl0ZXJhdGlvbilcbiAgICAgIGlmIChzdGFydCArIGxvY2FsT2Zmc2V0IDw9IG1heExpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsT2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIWJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJlZm9yZSB0ZXh0IGJlZ2lubmluZywgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYmVmb3JlIG9mZnNldCBsb2NhdGlvblxuICAgICAgaWYgKG1pbkxpbmUgPD0gc3RhcnQgLSBsb2NhbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gLWxvY2FsT2Zmc2V0Kys7XG4gICAgICB9XG5cbiAgICAgIGJhY2t3YXJkRXhoYXVzdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBpdGVyYXRvcigpO1xuICAgIH1cblxuICAgIC8vIFdlIHRyaWVkIHRvIGZpdCBodW5rIGJlZm9yZSB0ZXh0IGJlZ2lubmluZyBhbmQgYmV5b25kIHRleHQgbGVuZ2h0LCB0aGVuXG4gICAgLy8gaHVuayBjYW4ndCBmaXQgb24gdGhlIHRleHQuIFJldHVybiB1bmRlZmluZWRcbiAgfTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZU9wdGlvbnMob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZGVmYXVsdHMuY2FsbGJhY2sgPSBvcHRpb25zO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMpIHtcbiAgICBmb3IgKGxldCBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0cztcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgbGNzID0gcmVxdWlyZSgnLi9saWIvbGNzJyk7XG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2xpYi9hcnJheScpO1xudmFyIHBhdGNoID0gcmVxdWlyZSgnLi9saWIvanNvblBhdGNoJyk7XG52YXIgaW52ZXJzZSA9IHJlcXVpcmUoJy4vbGliL2ludmVyc2UnKTtcbnZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vbGliL2pzb25Qb2ludGVyJyk7XG52YXIgZW5jb2RlU2VnbWVudCA9IGpzb25Qb2ludGVyLmVuY29kZVNlZ21lbnQ7XG5cbmV4cG9ydHMuZGlmZiA9IGRpZmY7XG5leHBvcnRzLnBhdGNoID0gcGF0Y2guYXBwbHk7XG5leHBvcnRzLnBhdGNoSW5QbGFjZSA9IHBhdGNoLmFwcGx5SW5QbGFjZTtcbmV4cG9ydHMuaW52ZXJzZSA9IGludmVyc2U7XG5leHBvcnRzLmNsb25lID0gcGF0Y2guY2xvbmU7XG5cbi8vIEVycm9yc1xuZXhwb3J0cy5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vbGliL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG5leHBvcnRzLlRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vbGliL1Rlc3RGYWlsZWRFcnJvcicpO1xuZXhwb3J0cy5QYXRjaE5vdEludmVydGlibGVFcnJvciA9IHJlcXVpcmUoJy4vbGliL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBpc1ZhbGlkT2JqZWN0ID0gcGF0Y2guaXNWYWxpZE9iamVjdDtcbnZhciBkZWZhdWx0SGFzaCA9IHBhdGNoLmRlZmF1bHRIYXNoO1xuXG4vKipcbiAqIENvbXB1dGUgYSBKU09OIFBhdGNoIHJlcHJlc2VudGluZyB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBhIGFuZCBiLlxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgaWYgYSBmdW5jdGlvbiwgc2VlIG9wdGlvbnMuaGFzaFxuICogQHBhcmFtIHs/ZnVuY3Rpb24oeDoqKTpTdHJpbmd8TnVtYmVyfSBvcHRpb25zLmhhc2ggdXNlZCB0byBoYXNoIGFycmF5IGl0ZW1zXG4gKiAgaW4gb3JkZXIgdG8gcmVjb2duaXplIGlkZW50aWNhbCBvYmplY3RzLCBkZWZhdWx0cyB0byBKU09OLnN0cmluZ2lmeVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSk6b2JqZWN0fSBvcHRpb25zLm1ha2VDb250ZXh0XG4gKiAgdXNlZCB0byBnZW5lcmF0ZSBwYXRjaCBjb250ZXh0LiBJZiBub3QgcHJvdmlkZWQsIGNvbnRleHQgd2lsbCBub3QgYmUgZ2VuZXJhdGVkXG4gKiBAcmV0dXJucyB7YXJyYXl9IEpTT04gUGF0Y2ggc3VjaCB0aGF0IHBhdGNoKGRpZmYoYSwgYiksIGEpIH4gYlxuICovXG5mdW5jdGlvbiBkaWZmKGEsIGIsIG9wdGlvbnMpIHtcblx0cmV0dXJuIGFwcGVuZENoYW5nZXMoYSwgYiwgJycsIGluaXRTdGF0ZShvcHRpb25zLCBbXSkpLnBhdGNoO1xufVxuXG4vKipcbiAqIENyZWF0ZSBpbml0aWFsIGRpZmYgc3RhdGUgZnJvbSB0aGUgcHJvdmlkZWQgb3B0aW9uc1xuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBAc2VlIGRpZmYgb3B0aW9ucyBhYm92ZVxuICogQHBhcmFtIHthcnJheX0gcGF0Y2ggYW4gZW1wdHkgb3IgZXhpc3RpbmcgSlNPTiBQYXRjaCBhcnJheSBpbnRvIHdoaWNoXG4gKiAgdGhlIGRpZmYgc2hvdWxkIGdlbmVyYXRlIG5ldyBwYXRjaCBvcGVyYXRpb25zXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBpbml0aWFsaXplZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXRTdGF0ZShvcHRpb25zLCBwYXRjaCkge1xuXHRpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0Y2g6IHBhdGNoLFxuXHRcdFx0aGFzaDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMuaGFzaCwgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLm1ha2VDb250ZXh0LCBkZWZhdWx0Q29udGV4dCksXG5cdFx0XHRpbnZlcnRpYmxlOiAhKG9wdGlvbnMuaW52ZXJ0aWJsZSA9PT0gZmFsc2UpXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0Y2g6IHBhdGNoLFxuXHRcdFx0aGFzaDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBkZWZhdWx0Q29udGV4dCxcblx0XHRcdGludmVydGlibGU6IHRydWVcblx0XHR9O1xuXHR9XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIEpTT04gdmFsdWVzIChvYmplY3QsIGFycmF5LCBudW1iZXIsIHN0cmluZywgZXRjLiksIGZpbmQgdGhlaXJcbiAqIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKSB7XG5cdGlmKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuXHRcdHJldHVybiBhcHBlbmRBcnJheUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xuXHR9XG5cblx0aWYoaXNWYWxpZE9iamVjdChhKSAmJiBpc1ZhbGlkT2JqZWN0KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZE9iamVjdENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xuXHR9XG5cblx0cmV0dXJuIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIG9iamVjdHMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbzFcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE9iamVjdENoYW5nZXMobzEsIG8yLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG8yKTtcblx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdHZhciBpLCBrZXk7XG5cblx0Zm9yKGk9a2V5cy5sZW5ndGgtMTsgaT49MDsgLS1pKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHR2YXIga2V5UGF0aCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0aWYobzFba2V5XSAhPT0gdm9pZCAwKSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKG8xW2tleV0sIG8yW2tleV0sIGtleVBhdGgsIHN0YXRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDoga2V5UGF0aCwgdmFsdWU6IG8yW2tleV0gfSk7XG5cdFx0fVxuXHR9XG5cblx0a2V5cyA9IE9iamVjdC5rZXlzKG8xKTtcblx0Zm9yKGk9a2V5cy5sZW5ndGgtMTsgaT49MDsgLS1pKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHRpZihvMltrZXldID09PSB2b2lkIDApIHtcblx0XHRcdHZhciBwID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBvMVtrZXldIH0pO1xuXHRcdFx0fVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIGFycmF5cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZEFycmF5Q2hhbmdlcyhhMSwgYTIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBhMWhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTEpO1xuXHR2YXIgYTJoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGEyKTtcblxuXHR2YXIgbGNzTWF0cml4ID0gbGNzLmNvbXBhcmUoYTFoYXNoLCBhMmhhc2gpO1xuXG5cdHJldHVybiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBsY3NNYXRyaXggaW50byBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYW5kIGFwcGVuZFxuICogdGhlbSB0byBzdGF0ZS5wYXRjaCwgcmVjdXJzaW5nIGludG8gYXJyYXkgZWxlbWVudHMgYXMgbmVjZXNzYXJ5XG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3NNYXRyaXhcbiAqIEByZXR1cm5zIHtvYmplY3R9IG5ldyBzdGF0ZSB3aXRoIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhZGRlZCBiYXNlZFxuICogIG9uIHRoZSBwcm92aWRlZCBsY3NNYXRyaXhcbiAqL1xuZnVuY3Rpb24gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KSB7XG5cdHZhciBvZmZzZXQgPSAwO1xuXHRyZXR1cm4gbGNzLnJlZHVjZShmdW5jdGlvbihzdGF0ZSwgb3AsIGksIGopIHtcblx0XHR2YXIgbGFzdCwgY29udGV4dDtcblx0XHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyAoaiArIG9mZnNldCk7XG5cblx0XHRpZiAob3AgPT09IGxjcy5SRU1PVkUpIHtcblx0XHRcdC8vIENvYWxlc2NlIGFkamFjZW50IHJlbW92ZSArIGFkZCBpbnRvIHJlcGxhY2Vcblx0XHRcdGxhc3QgPSBwYXRjaFtwYXRjaC5sZW5ndGgtMV07XG5cdFx0XHRjb250ZXh0ID0gc3RhdGUubWFrZUNvbnRleHQoaiwgYTEpO1xuXG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogYTFbal0sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGxhc3QgIT09IHZvaWQgMCAmJiBsYXN0Lm9wID09PSAnYWRkJyAmJiBsYXN0LnBhdGggPT09IHApIHtcblx0XHRcdFx0bGFzdC5vcCA9ICdyZXBsYWNlJztcblx0XHRcdFx0bGFzdC5jb250ZXh0ID0gY29udGV4dDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdFx0XHR9XG5cblx0XHRcdG9mZnNldCAtPSAxO1xuXG5cdFx0fSBlbHNlIGlmIChvcCA9PT0gbGNzLkFERCkge1xuXHRcdFx0Ly8gU2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAyI3NlY3Rpb24tNC4xXG5cdFx0XHQvLyBNYXkgdXNlIGVpdGhlciBpbmRleD09PWxlbmd0aCAqb3IqICctJyB0byBpbmRpY2F0ZSBhcHBlbmRpbmcgdG8gYXJyYXlcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHAsIHZhbHVlOiBhMltpXSxcblx0XHRcdFx0Y29udGV4dDogc3RhdGUubWFrZUNvbnRleHQoaiwgYTEpXG5cdFx0XHR9KTtcblxuXHRcdFx0b2Zmc2V0ICs9IDE7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhhMVtqXSwgYTJbaV0sIHAsIHN0YXRlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gc3RhdGU7XG5cblx0fSwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIG51bWJlcnxzdHJpbmd8bnVsbCB2YWx1ZXMsIGlmIHRoZXkgZGlmZmVyLCBhcHBlbmQgdG8gZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKSB7XG5cdGlmKGEgIT09IGIpIHtcblx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcGF0aCwgdmFsdWU6IGEgfSk7XG5cdFx0fVxuXG5cdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAncmVwbGFjZScsIHBhdGg6IHBhdGgsIHZhbHVlOiBiIH0pO1xuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHByZWRpY2F0ZVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0geyp9IHlcbiAqIEByZXR1cm5zIHsqfSB4IGlmIHByZWRpY2F0ZSh4KSBpcyB0cnV0aHksIG90aGVyd2lzZSB5XG4gKi9cbmZ1bmN0aW9uIG9yRWxzZShwcmVkaWNhdGUsIHgsIHkpIHtcblx0cmV0dXJuIHByZWRpY2F0ZSh4KSA/IHggOiB5O1xufVxuXG4vKipcbiAqIERlZmF1bHQgcGF0Y2ggY29udGV4dCBnZW5lcmF0b3JcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9IHVuZGVmaW5lZCBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRDb250ZXh0KCkge1xuXHRyZXR1cm4gdm9pZCAwO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0geFxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgeCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG5cdHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7XG5cbmZ1bmN0aW9uIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yO1xuXG5mdW5jdGlvbiBQYXRjaE5vdEludmVydGlibGVFcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBUZXN0RmFpbGVkRXJyb3I7XG5cbmZ1bmN0aW9uIFRlc3RGYWlsZWRFcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUZXN0RmFpbGVkRXJyb3I7IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29ucyA9IGNvbnM7XG5leHBvcnRzLnRhaWwgPSB0YWlsO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5cbi8qKlxuICogUHJlcGVuZCB4IHRvIGEsIHdpdGhvdXQgbXV0YXRpbmcgYS4gRmFzdGVyIHRoYW4gYS51bnNoaWZ0KHgpXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgd2l0aCB4IHByZXBlbmRlZFxuICovXG5mdW5jdGlvbiBjb25zKHgsIGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aDtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCsxKTtcblx0YlswXSA9IHg7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaSsxXSA9IGFbaV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgQXJyYXkgY29udGFpbmluZyBhbGwgZWxlbWVudHMgaW4gYSwgZXhjZXB0IHRoZSBmaXJzdC5cbiAqICBGYXN0ZXIgdGhhbiBhLnNsaWNlKDEpXG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5LCB0aGUgZXF1aXZhbGVudCBvZiBhLnNsaWNlKDEpXG4gKi9cbmZ1bmN0aW9uIHRhaWwoYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoLTE7XG5cdHZhciBiID0gbmV3IEFycmF5KGwpO1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2ldID0gYVtpKzFdO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogTWFwIGFueSBhcnJheS1saWtlLiBGYXN0ZXIgdGhhbiBBcnJheS5wcm90b3R5cGUubWFwXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IG1hcHBlZCBieSBmXG4gKi9cbmZ1bmN0aW9uIG1hcChmLCBhKSB7XG5cdHZhciBiID0gbmV3IEFycmF5KGEubGVuZ3RoKTtcblx0Zm9yKHZhciBpPTA7IGk8IGEubGVuZ3RoOyArK2kpIHtcblx0XHRiW2ldID0gZihhW2ldKTtcblx0fVxuXHRyZXR1cm4gYjtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWVwIGNvcHkgb2YgeCB3aGljaCBtdXN0IGJlIGEgbGVnYWwgSlNPTiBvYmplY3QvYXJyYXkvdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gY2xvbmVcbiAqIEByZXR1cm5zIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBjbG9uZSBvZiB4XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG5cbmZ1bmN0aW9uIGNsb25lKHgpIHtcblx0aWYoeCA9PSBudWxsIHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB4O1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheSh4KSkge1xuXHRcdHJldHVybiBjbG9uZUFycmF5KHgpO1xuXHR9XG5cblx0cmV0dXJuIGNsb25lT2JqZWN0KHgpO1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5ICh4KSB7XG5cdHZhciBsID0geC5sZW5ndGg7XG5cdHZhciB5ID0gbmV3IEFycmF5KGwpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbDsgKytpKSB7XG5cdFx0eVtpXSA9IGNsb25lKHhbaV0pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG5cbmZ1bmN0aW9uIGNsb25lT2JqZWN0ICh4KSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMoeCk7XG5cdHZhciB5ID0ge307XG5cblx0Zm9yICh2YXIgaywgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuXHRcdGsgPSBrZXlzW2ldO1xuXHRcdHlba10gPSBjbG9uZSh4W2tdKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xuXG4vKipcbiAqIGNvbW11dGUgdGhlIHBhdGNoIHNlcXVlbmNlIGEsYiB0byBiLGFcbiAqIEBwYXJhbSB7b2JqZWN0fSBhIHBhdGNoIG9wZXJhdGlvblxuICogQHBhcmFtIHtvYmplY3R9IGIgcGF0Y2ggb3BlcmF0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tbXV0ZVBhdGhzKGEsIGIpIHtcblx0Ly8gVE9ETzogY2FzZXMgZm9yIHNwZWNpYWwgcGF0aHM6ICcnIGFuZCAnLydcblx0dmFyIGxlZnQgPSBqc29uUG9pbnRlci5wYXJzZShhLnBhdGgpO1xuXHR2YXIgcmlnaHQgPSBqc29uUG9pbnRlci5wYXJzZShiLnBhdGgpO1xuXHR2YXIgcHJlZml4ID0gZ2V0Q29tbW9uUGF0aFByZWZpeChsZWZ0LCByaWdodCk7XG5cdHZhciBpc0FycmF5ID0gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIHByZWZpeC5sZW5ndGgpO1xuXG5cdC8vIE5ldmVyIG11dGF0ZSB0aGUgb3JpZ2luYWxzXG5cdHZhciBhYyA9IGNvcHlQYXRjaChhKTtcblx0dmFyIGJjID0gY29weVBhdGNoKGIpO1xuXG5cdGlmKHByZWZpeC5sZW5ndGggPT09IDAgJiYgIWlzQXJyYXkpIHtcblx0XHQvLyBQYXRocyBzaGFyZSBubyBjb21tb24gYW5jZXN0b3IsIHNpbXBsZSBzd2FwXG5cdFx0cmV0dXJuIFtiYywgYWNdO1xuXHR9XG5cblx0aWYoaXNBcnJheSkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlQYXRocyhhYywgbGVmdCwgYmMsIHJpZ2h0KTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gY29tbXV0ZVRyZWVQYXRocyhhYywgbGVmdCwgYmMsIHJpZ2h0KTtcblx0fVxufTtcblxuZnVuY3Rpb24gY29tbXV0ZVRyZWVQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihhLnBhdGggPT09IGIucGF0aCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2Nhbm5vdCBjb21tdXRlICcgKyBhLm9wICsgJywnICsgYi5vcCArICcgd2l0aCBpZGVudGljYWwgb2JqZWN0IHBhdGhzJyk7XG5cdH1cblx0Ly8gRklYTUU6IEltcGxlbWVudCB0cmVlIHBhdGggY29tbXV0YXRpb25cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHdob3NlIGNvbW1vbiBhbmNlc3RvciAod2hpY2ggbWF5IGJlIHRoZSBpbW1lZGlhdGUgcGFyZW50KVxuICogaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSBhXG4gKiBAcGFyYW0gbGVmdFxuICogQHBhcmFtIGJcbiAqIEBwYXJhbSByaWdodFxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGxlZnQubGVuZ3RoID09PSByaWdodC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5U2libGluZ3MoYSwgbGVmdCwgYiwgcmlnaHQpO1xuXHR9XG5cblx0aWYgKGxlZnQubGVuZ3RoID4gcmlnaHQubGVuZ3RoKSB7XG5cdFx0Ly8gbGVmdCBpcyBsb25nZXIsIGNvbW11dGUgYnkgXCJtb3ZpbmdcIiBpdCB0byB0aGUgcmlnaHRcblx0XHRsZWZ0ID0gY29tbXV0ZUFycmF5QW5jZXN0b3IoYiwgcmlnaHQsIGEsIGxlZnQsIC0xKTtcblx0XHRhLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGxlZnQpKTtcblx0fSBlbHNlIHtcblx0XHQvLyByaWdodCBpcyBsb25nZXIsIGNvbW11dGUgYnkgXCJtb3ZpbmdcIiBpdCB0byB0aGUgbGVmdFxuXHRcdHJpZ2h0ID0gY29tbXV0ZUFycmF5QW5jZXN0b3IoYSwgbGVmdCwgYiwgcmlnaHQsIDEpO1xuXHRcdGIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4ocmlnaHQpKTtcblx0fVxuXG5cdHJldHVybiBbYiwgYV07XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBpbmRleCkge1xuXHRyZXR1cm4ganNvblBvaW50ZXIuaXNWYWxpZEFycmF5SW5kZXgobGVmdFtpbmRleF0pXG5cdFx0JiYganNvblBvaW50ZXIuaXNWYWxpZEFycmF5SW5kZXgocmlnaHRbaW5kZXhdKTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHJlZmVycmluZyB0byBpdGVtcyBpbiB0aGUgc2FtZSBhcnJheVxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHJldHVybnMgeypbXX1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5U2libGluZ3MobCwgbHBhdGgsIHIsIHJwYXRoKSB7XG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHR2YXIgY29tbXV0ZWQ7XG5cblx0aWYobGluZGV4IDwgcmluZGV4KSB7XG5cdFx0Ly8gQWRqdXN0IHJpZ2h0IHBhdGhcblx0XHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRcdGNvbW11dGVkID0gcnBhdGguc2xpY2UoKTtcblx0XHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggLSAxKTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9IGVsc2UgaWYobC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRcdGNvbW11dGVkID0gcnBhdGguc2xpY2UoKTtcblx0XHRcdGNvbW11dGVkW3RhcmdldF0gPSByaW5kZXggKyAxO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH1cblx0fSBlbHNlIGlmKHIub3AgPT09ICdhZGQnIHx8IHIub3AgPT09ICdjb3B5Jykge1xuXHRcdC8vIEFkanVzdCBsZWZ0IHBhdGhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IGxpbmRleCArIDE7XG5cdFx0bC5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHR9IGVsc2UgaWYgKGxpbmRleCA+IHJpbmRleCAmJiByLm9wID09PSAncmVtb3ZlJykge1xuXHRcdC8vIEFkanVzdCBsZWZ0IHBhdGggb25seSBpZiByZW1vdmUgd2FzIGF0IGEgKHN0cmljdGx5KSBsb3dlciBpbmRleFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgbGluZGV4IC0gMSk7XG5cdFx0bC5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHR9XG5cblx0cmV0dXJuIFtyLCBsXTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHdpdGggYSBjb21tb24gYXJyYXkgYW5jZXN0b3JcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEBwYXJhbSBkaXJlY3Rpb25cbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlBbmNlc3RvcihsLCBscGF0aCwgciwgcnBhdGgsIGRpcmVjdGlvbikge1xuXHQvLyBycGF0aCBpcyBsb25nZXIgb3Igc2FtZSBsZW5ndGhcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdC8vIENvcHkgcnBhdGgsIHRoZW4gYWRqdXN0IGl0cyBhcnJheSBpbmRleFxuXHR2YXIgcmMgPSBycGF0aC5zbGljZSgpO1xuXG5cdGlmKGxpbmRleCA+IHJpbmRleCkge1xuXHRcdHJldHVybiByYztcblx0fVxuXG5cdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggLSBkaXJlY3Rpb24pO1xuXHR9IGVsc2UgaWYobC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4ICsgZGlyZWN0aW9uKTtcblx0fVxuXG5cdHJldHVybiByYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29tbW9uUGF0aFByZWZpeChwMSwgcDIpIHtcblx0dmFyIHAxbCA9IHAxLmxlbmd0aDtcblx0dmFyIHAybCA9IHAyLmxlbmd0aDtcblx0aWYocDFsID09PSAwIHx8IHAybCA9PT0gMCB8fCAocDFsIDwgMiAmJiBwMmwgPCAyKSkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdC8vIElmIHBhdGhzIGFyZSBzYW1lIGxlbmd0aCwgdGhlIGxhc3Qgc2VnbWVudCBjYW5ub3QgYmUgcGFydFxuXHQvLyBvZiBhIGNvbW1vbiBwcmVmaXguICBJZiBub3QgdGhlIHNhbWUgbGVuZ3RoLCB0aGUgcHJlZml4IGNhbm5vdFxuXHQvLyBiZSBsb25nZXIgdGhhbiB0aGUgc2hvcnRlciBwYXRoLlxuXHR2YXIgbCA9IHAxbCA9PT0gcDJsXG5cdFx0PyBwMWwgLSAxXG5cdFx0OiBNYXRoLm1pbihwMWwsIHAybCk7XG5cblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBwMVtpXSA9PT0gcDJbaV0pIHtcblx0XHQrK2lcblx0fVxuXG5cdHJldHVybiBwMS5zbGljZSgwLCBpKTtcbn1cblxuZnVuY3Rpb24gY29weVBhdGNoKHApIHtcblx0aWYocC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoIH07XG5cdH1cblxuXHRpZihwLm9wID09PSAnY29weScgfHwgcC5vcCA9PT0gJ21vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCwgZnJvbTogcC5mcm9tIH07XG5cdH1cblxuXHQvLyB0ZXN0LCBhZGQsIHJlcGxhY2Vcblx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCwgdmFsdWU6IHAudmFsdWUgfTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGRlZXBFcXVhbHM7XG5cbi8qKlxuICogQ29tcGFyZSAyIEpTT04gdmFsdWVzLCBvciByZWN1cnNpdmVseSBjb21wYXJlIDIgSlNPTiBvYmplY3RzIG9yIGFycmF5c1xuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgYSBhbmQgYiBhcmUgcmVjdXJzaXZlbHkgZXF1YWxcbiAqL1xuZnVuY3Rpb24gZGVlcEVxdWFscyhhLCBiKSB7XG5cdGlmKGEgPT09IGIpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuXHRcdHJldHVybiBjb21wYXJlQXJyYXlzKGEsIGIpO1xuXHR9XG5cblx0aWYodHlwZW9mIGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBiID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBjb21wYXJlT2JqZWN0cyhhLCBiKTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhLCBiKSB7XG5cdGlmKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDA7IGk8YS5sZW5ndGg7ICsraSkge1xuXHRcdGlmKCFkZWVwRXF1YWxzKGFbaV0sIGJbaV0pKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVPYmplY3RzKGEsIGIpIHtcblx0aWYoKGEgPT09IG51bGwgJiYgYiAhPT0gbnVsbCkgfHwgKGEgIT09IG51bGwgJiYgYiA9PT0gbnVsbCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgYWtleXMgPSBPYmplY3Qua2V5cyhhKTtcblx0dmFyIGJrZXlzID0gT2JqZWN0LmtleXMoYik7XG5cblx0aWYoYWtleXMubGVuZ3RoICE9PSBia2V5cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwLCBrOyBpPGFrZXlzLmxlbmd0aDsgKytpKSB7XG5cdFx0ayA9IGFrZXlzW2ldO1xuXHRcdGlmKCEoayBpbiBiICYmIGRlZXBFcXVhbHMoYVtrXSwgYltrXSkpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59IiwidmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbnZlcnNlKHApIHtcblx0dmFyIHByID0gW107XG5cdHZhciBpLCBza2lwO1xuXHRmb3IoaSA9IHAubGVuZ3RoLTE7IGk+PSAwOyBpIC09IHNraXApIHtcblx0XHRza2lwID0gaW52ZXJ0T3AocHIsIHBbaV0sIGksIHApO1xuXHR9XG5cblx0cmV0dXJuIHByO1xufTtcblxuZnVuY3Rpb24gaW52ZXJ0T3AocGF0Y2gsIGMsIGksIGNvbnRleHQpIHtcblx0dmFyIG9wID0gcGF0Y2hlc1tjLm9wXTtcblx0cmV0dXJuIG9wICE9PSB2b2lkIDAgJiYgdHlwZW9mIG9wLmludmVyc2UgPT09ICdmdW5jdGlvbidcblx0XHQ/IG9wLmludmVyc2UocGF0Y2gsIGMsIGksIGNvbnRleHQpXG5cdFx0OiAxO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG5cbmV4cG9ydHMuYXBwbHkgPSBwYXRjaDtcbmV4cG9ydHMuYXBwbHlJblBsYWNlID0gcGF0Y2hJblBsYWNlO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5pc1ZhbGlkT2JqZWN0ID0gaXNWYWxpZE9iamVjdDtcbmV4cG9ydHMuZGVmYXVsdEhhc2ggPSBkZWZhdWx0SGFzaDtcblxudmFyIGRlZmF1bHRPcHRpb25zID0ge307XG5cbi8qKlxuICogQXBwbHkgdGhlIHN1cHBsaWVkIEpTT04gUGF0Y2ggdG8geFxuICogQHBhcmFtIHthcnJheX0gY2hhbmdlcyBKU09OIFBhdGNoXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBwYXRjaFxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gb3B0aW9ucy5maW5kQ29udGV4dFxuICogIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHRcbiAqIEByZXR1cm5zIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0gcGF0Y2hlZCB2ZXJzaW9uIG9mIHguIElmIHggaXNcbiAqICBhbiBhcnJheSBvciBvYmplY3QsIGl0IHdpbGwgYmUgbXV0YXRlZCBhbmQgcmV0dXJuZWQuIE90aGVyd2lzZSwgaWZcbiAqICB4IGlzIGEgdmFsdWUsIHRoZSBuZXcgdmFsdWUgd2lsbCBiZSByZXR1cm5lZC5cbiAqL1xuZnVuY3Rpb24gcGF0Y2goY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRyZXR1cm4gcGF0Y2hJblBsYWNlKGNoYW5nZXMsIGNsb25lKHgpLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcGF0Y2hJblBsYWNlKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0aWYoIW9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gZGVmYXVsdE9wdGlvbnM7XG5cdH1cblxuXHQvLyBUT0RPOiBDb25zaWRlciB0aHJvd2luZyBpZiBjaGFuZ2VzIGlzIG5vdCBhbiBhcnJheVxuXHRpZighQXJyYXkuaXNBcnJheShjaGFuZ2VzKSkge1xuXHRcdHJldHVybiB4O1xuXHR9XG5cblx0dmFyIHBhdGNoLCBwO1xuXHRmb3IodmFyIGk9MDsgaTxjaGFuZ2VzLmxlbmd0aDsgKytpKSB7XG5cdFx0cCA9IGNoYW5nZXNbaV07XG5cdFx0cGF0Y2ggPSBwYXRjaGVzW3Aub3BdO1xuXG5cdFx0aWYocGF0Y2ggPT09IHZvaWQgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdpbnZhbGlkIG9wICcgKyBKU09OLnN0cmluZ2lmeShwKSk7XG5cdFx0fVxuXG5cdFx0eCA9IHBhdGNoLmFwcGx5KHgsIHAsIG9wdGlvbnMpO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRIYXNoKHgpIHtcblx0cmV0dXJuIGlzVmFsaWRPYmplY3QoeCkgPyBKU09OLnN0cmluZ2lmeSh4KSA6IHg7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRPYmplY3QgKHgpIHtcblx0cmV0dXJuIHggIT09IG51bGwgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBPYmplY3RdJztcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgX3BhcnNlID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlclBhcnNlJyk7XG5cbmV4cG9ydHMuZmluZCA9IGZpbmQ7XG5leHBvcnRzLmpvaW4gPSBqb2luO1xuZXhwb3J0cy5hYnNvbHV0ZSA9IGFic29sdXRlO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuZXhwb3J0cy5jb250YWlucyA9IGNvbnRhaW5zO1xuZXhwb3J0cy5lbmNvZGVTZWdtZW50ID0gZW5jb2RlU2VnbWVudDtcbmV4cG9ydHMuZGVjb2RlU2VnbWVudCA9IGRlY29kZVNlZ21lbnQ7XG5leHBvcnRzLnBhcnNlQXJyYXlJbmRleCA9IHBhcnNlQXJyYXlJbmRleDtcbmV4cG9ydHMuaXNWYWxpZEFycmF5SW5kZXggPSBpc1ZhbGlkQXJyYXlJbmRleDtcblxuLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTJcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgc2VwYXJhdG9yUnggPSAvXFwvL2c7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG52YXIgZW5jb2RlZFNlcGFyYXRvclJ4ID0gL34xL2c7XG5cbnZhciBlc2NhcGVDaGFyID0gJ34nO1xudmFyIGVzY2FwZVJ4ID0gL34vZztcbnZhciBlbmNvZGVkRXNjYXBlID0gJ34wJztcbnZhciBlbmNvZGVkRXNjYXBlUnggPSAvfjAvZztcblxuLyoqXG4gKiBGaW5kIHRoZSBwYXJlbnQgb2YgdGhlIHNwZWNpZmllZCBwYXRoIGluIHggYW5kIHJldHVybiBhIGRlc2NyaXB0b3JcbiAqIGNvbnRhaW5pbmcgdGhlIHBhcmVudCBhbmQgYSBrZXkuICBJZiB0aGUgcGFyZW50IGRvZXMgbm90IGV4aXN0IGluIHgsXG4gKiByZXR1cm4gdW5kZWZpbmVkLCBpbnN0ZWFkLlxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHggb2JqZWN0IG9yIGFycmF5IGluIHdoaWNoIHRvIHNlYXJjaFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggSlNPTiBQb2ludGVyIHN0cmluZyAoZW5jb2RlZClcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IGZpbmRDb250ZXh0XG4gKiAgb3B0aW9uYWwgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dC4gIElmIHByb3ZpZGVkLCBjb250ZXh0IE1VU1QgYWxzbyBiZSBwcm92aWRlZC5cbiAqIEBwYXJhbSB7P3tiZWZvcmU6QXJyYXksIGFmdGVyOkFycmF5fX0gY29udGV4dCBvcHRpb25hbCBwYXRjaCBjb250ZXh0IGZvclxuICogIGZpbmRDb250ZXh0IHRvIHVzZSB0byBhZGp1c3QgYXJyYXkgaW5kaWNlcy4gIElmIHByb3ZpZGVkLCBmaW5kQ29udGV4dCBNVVNUXG4gKiAgYWxzbyBiZSBwcm92aWRlZC5cbiAqIEByZXR1cm5zIHt7dGFyZ2V0Om9iamVjdHxhcnJheXxudW1iZXJ8c3RyaW5nLCBrZXk6c3RyaW5nfXx1bmRlZmluZWR9XG4gKi9cbmZ1bmN0aW9uIGZpbmQoeCwgcGF0aCwgZmluZENvbnRleHQsIGNvbnRleHQpIHtcblx0aWYodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYocGF0aCA9PT0gJycpIHtcblx0XHQvLyB3aG9sZSBkb2N1bWVudFxuXHRcdHJldHVybiB7IHRhcmdldDogeCwga2V5OiB2b2lkIDAgfTtcblx0fVxuXG5cdGlmKHBhdGggPT09IHNlcGFyYXRvcikge1xuXHRcdHJldHVybiB7IHRhcmdldDogeCwga2V5OiAnJyB9O1xuXHR9XG5cblx0dmFyIHBhcmVudCA9IHgsIGtleTtcblx0dmFyIGhhc0NvbnRleHQgPSBjb250ZXh0ICE9PSB2b2lkIDA7XG5cblx0X3BhcnNlKHBhdGgsIGZ1bmN0aW9uKHNlZ21lbnQpIHtcblx0XHQvLyBobS4uLiB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGJlIGlmKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJylcblx0XHRpZih4ID09IG51bGwpIHtcblx0XHRcdC8vIFNpZ25hbCB0aGF0IHdlIHByZW1hdHVyZWx5IGhpdCB0aGUgZW5kIG9mIHRoZSBwYXRoIGhpZXJhcmNoeS5cblx0XHRcdHBhcmVudCA9IG51bGw7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYoQXJyYXkuaXNBcnJheSh4KSkge1xuXHRcdFx0a2V5ID0gaGFzQ29udGV4dFxuXHRcdFx0XHQ/IGZpbmRJbmRleChmaW5kQ29udGV4dCwgcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpLCB4LCBjb250ZXh0KVxuXHRcdFx0XHQ6IHNlZ21lbnQgPT09ICctJyA/IHNlZ21lbnQgOiBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGtleSA9IHNlZ21lbnQ7XG5cdFx0fVxuXG5cdFx0cGFyZW50ID0geDtcblx0XHR4ID0geFtrZXldO1xuXHR9KTtcblxuXHRyZXR1cm4gcGFyZW50ID09PSBudWxsXG5cdFx0PyB2b2lkIDBcblx0XHQ6IHsgdGFyZ2V0OiBwYXJlbnQsIGtleToga2V5IH07XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlKHBhdGgpIHtcblx0cmV0dXJuIHBhdGhbMF0gPT09IHNlcGFyYXRvciA/IHBhdGggOiBzZXBhcmF0b3IgKyBwYXRoO1xufVxuXG5mdW5jdGlvbiBqb2luKHNlZ21lbnRzKSB7XG5cdHJldHVybiBzZWdtZW50cy5qb2luKHNlcGFyYXRvcik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcblx0dmFyIHNlZ21lbnRzID0gW107XG5cdF9wYXJzZShwYXRoLCBzZWdtZW50cy5wdXNoLmJpbmQoc2VnbWVudHMpKTtcblx0cmV0dXJuIHNlZ21lbnRzO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyhhLCBiKSB7XG5cdHJldHVybiBiLmluZGV4T2YoYSkgPT09IDAgJiYgYlthLmxlbmd0aF0gPT09IHNlcGFyYXRvcjtcbn1cblxuLyoqXG4gKiBEZWNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBlbmNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGRlY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBkZWNvZGVTZWdtZW50KHMpIHtcblx0Ly8gU2VlOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVuY29kZWRTZXBhcmF0b3JSeCwgc2VwYXJhdG9yKS5yZXBsYWNlKGVuY29kZWRFc2NhcGVSeCwgZXNjYXBlQ2hhcik7XG59XG5cbi8qKlxuICogRW5jb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZGVjb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBlbmNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZW5jb2RlU2VnbWVudChzKSB7XG5cdHJldHVybiBzLnJlcGxhY2UoZXNjYXBlUngsIGVuY29kZWRFc2NhcGUpLnJlcGxhY2Uoc2VwYXJhdG9yUngsIGVuY29kZWRTZXBhcmF0b3IpO1xufVxuXG52YXIgYXJyYXlJbmRleFJ4ID0gL14oMHxbMS05XVxcZCopJC87XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgcyBpcyBhIHZhbGlkIEpTT04gUG9pbnRlciBhcnJheSBpbmRleFxuICogQHBhcmFtIHtTdHJpbmd9IHNcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQXJyYXlJbmRleChzKSB7XG5cdHJldHVybiBhcnJheUluZGV4UngudGVzdChzKTtcbn1cblxuLyoqXG4gKiBTYWZlbHkgcGFyc2UgYSBzdHJpbmcgaW50byBhIG51bWJlciA+PSAwLiBEb2VzIG5vdCBjaGVjayBmb3IgZGVjaW1hbCBudW1iZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBudW1lcmljIHN0cmluZ1xuICogQHJldHVybnMge251bWJlcn0gbnVtYmVyID49IDBcbiAqL1xuZnVuY3Rpb24gcGFyc2VBcnJheUluZGV4IChzKSB7XG5cdGlmKGlzVmFsaWRBcnJheUluZGV4KHMpKSB7XG5cdFx0cmV0dXJuICtzO1xuXHR9XG5cblx0dGhyb3cgbmV3IFN5bnRheEVycm9yKCdpbnZhbGlkIGFycmF5IGluZGV4ICcgKyBzKTtcbn1cblxuZnVuY3Rpb24gZmluZEluZGV4IChmaW5kQ29udGV4dCwgc3RhcnQsIGFycmF5LCBjb250ZXh0KSB7XG5cdHZhciBpbmRleCA9IHN0YXJ0O1xuXG5cdGlmKGluZGV4IDwgMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignYXJyYXkgaW5kZXggb3V0IG9mIGJvdW5kcyAnICsgaW5kZXgpO1xuXHR9XG5cblx0aWYoY29udGV4dCAhPT0gdm9pZCAwICYmIHR5cGVvZiBmaW5kQ29udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGluZGV4ID0gZmluZENvbnRleHQoc3RhcnQsIGFycmF5LCBjb250ZXh0KTtcblx0XHRpZihpbmRleCA8IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgcGF0Y2ggY29udGV4dCAnICsgY29udGV4dCk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGluZGV4O1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGpzb25Qb2ludGVyUGFyc2U7XG5cbnZhciBwYXJzZVJ4ID0gL1xcL3x+MXx+MC9nO1xudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBlc2NhcGVDaGFyID0gJ34nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xuXG4vKipcbiAqIFBhcnNlIHRocm91Z2ggYW4gZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nLCBkZWNvZGluZyBlYWNoIHBhdGggc2VnbWVudFxuICogYW5kIHBhc3NpbmcgaXQgdG8gYW4gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNzZWN0aW9uLTRcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZ1xuICogQHBhcmFtIHt7ZnVuY3Rpb24oc2VnbWVudDpzdHJpbmcpOmJvb2xlYW59fSBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHtzdHJpbmd9IG9yaWdpbmFsIHBhdGhcbiAqL1xuZnVuY3Rpb24ganNvblBvaW50ZXJQYXJzZShwYXRoLCBvblNlZ21lbnQpIHtcblx0dmFyIHBvcywgYWNjdW0sIG1hdGNoZXMsIG1hdGNoO1xuXG5cdHBvcyA9IHBhdGguY2hhckF0KDApID09PSBzZXBhcmF0b3IgPyAxIDogMDtcblx0YWNjdW0gPSAnJztcblx0cGFyc2VSeC5sYXN0SW5kZXggPSBwb3M7XG5cblx0d2hpbGUobWF0Y2hlcyA9IHBhcnNlUnguZXhlYyhwYXRoKSkge1xuXG5cdFx0bWF0Y2ggPSBtYXRjaGVzWzBdO1xuXHRcdGFjY3VtICs9IHBhdGguc2xpY2UocG9zLCBwYXJzZVJ4Lmxhc3RJbmRleCAtIG1hdGNoLmxlbmd0aCk7XG5cdFx0cG9zID0gcGFyc2VSeC5sYXN0SW5kZXg7XG5cblx0XHRpZihtYXRjaCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0XHRpZiAob25TZWdtZW50KGFjY3VtKSA9PT0gZmFsc2UpIHJldHVybiBwYXRoO1xuXHRcdFx0YWNjdW0gPSAnJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0YWNjdW0gKz0gbWF0Y2ggPT09IGVuY29kZWRTZXBhcmF0b3IgPyBzZXBhcmF0b3IgOiBlc2NhcGVDaGFyO1xuXHRcdH1cblx0fVxuXG5cdGFjY3VtICs9IHBhdGguc2xpY2UocG9zKTtcblx0b25TZWdtZW50KGFjY3VtKTtcblxuXHRyZXR1cm4gcGF0aDtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbXBhcmUgPSBjb21wYXJlO1xuZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2U7XG5cbnZhciBSRU1PVkUsIFJJR0hULCBBREQsIERPV04sIFNLSVA7XG5cbmV4cG9ydHMuUkVNT1ZFID0gUkVNT1ZFID0gUklHSFQgPSAtMTtcbmV4cG9ydHMuQUREICAgID0gQUREICAgID0gRE9XTiAgPSAgMTtcbmV4cG9ydHMuRVFVQUwgID0gU0tJUCAgID0gMDtcblxuLyoqXG4gKiBDcmVhdGUgYW4gbGNzIGNvbXBhcmlzb24gbWF0cml4IGRlc2NyaWJpbmcgdGhlIGRpZmZlcmVuY2VzXG4gKiBiZXR3ZWVuIHR3byBhcnJheS1saWtlIHNlcXVlbmNlc1xuICogQHBhcmFtIHthcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcGFyYW0ge2FycmF5fSBiIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtvYmplY3R9IGxjcyBkZXNjcmlwdG9yLCBzdWl0YWJsZSBmb3IgcGFzc2luZyB0byByZWR1Y2UoKVxuICovXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcblx0dmFyIGNvbHMgPSBhLmxlbmd0aDtcblx0dmFyIHJvd3MgPSBiLmxlbmd0aDtcblxuXHR2YXIgcHJlZml4ID0gZmluZFByZWZpeChhLCBiKTtcblx0dmFyIHN1ZmZpeCA9IHByZWZpeCA8IGNvbHMgJiYgcHJlZml4IDwgcm93c1xuXHRcdD8gZmluZFN1ZmZpeChhLCBiLCBwcmVmaXgpXG5cdFx0OiAwO1xuXG5cdHZhciByZW1vdmUgPSBzdWZmaXggKyBwcmVmaXggLSAxO1xuXHRjb2xzIC09IHJlbW92ZTtcblx0cm93cyAtPSByZW1vdmU7XG5cdHZhciBtYXRyaXggPSBjcmVhdGVNYXRyaXgoY29scywgcm93cyk7XG5cblx0Zm9yICh2YXIgaiA9IGNvbHMgLSAxOyBqID49IDA7IC0taikge1xuXHRcdGZvciAodmFyIGkgPSByb3dzIC0gMTsgaSA+PSAwOyAtLWkpIHtcblx0XHRcdG1hdHJpeFtpXVtqXSA9IGJhY2t0cmFjayhtYXRyaXgsIGEsIGIsIHByZWZpeCwgaiwgaSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRwcmVmaXg6IHByZWZpeCxcblx0XHRtYXRyaXg6IG1hdHJpeCxcblx0XHRzdWZmaXg6IHN1ZmZpeFxuXHR9O1xufVxuXG4vKipcbiAqIFJlZHVjZSBhIHNldCBvZiBsY3MgY2hhbmdlcyBwcmV2aW91c2x5IGNyZWF0ZWQgdXNpbmcgY29tcGFyZVxuICogQHBhcmFtIHtmdW5jdGlvbihyZXN1bHQ6KiwgdHlwZTpudW1iZXIsIGk6bnVtYmVyLCBqOm51bWJlcil9IGZcbiAqICByZWR1Y2VyIGZ1bmN0aW9uLCB3aGVyZTpcbiAqICAtIHJlc3VsdCBpcyB0aGUgY3VycmVudCByZWR1Y2UgdmFsdWUsXG4gKiAgLSB0eXBlIGlzIHRoZSB0eXBlIG9mIGNoYW5nZTogQURELCBSRU1PVkUsIG9yIFNLSVBcbiAqICAtIGkgaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYlxuICogIC0gaiBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBhXG4gKiBAcGFyYW0geyp9IHIgaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjcyByZXN1bHRzIHJldHVybmVkIGJ5IGNvbXBhcmUoKVxuICogQHJldHVybnMgeyp9IHRoZSBmaW5hbCByZWR1Y2VkIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIHJlZHVjZShmLCByLCBsY3MpIHtcblx0dmFyIGksIGosIGssIG9wO1xuXG5cdHZhciBtID0gbGNzLm1hdHJpeDtcblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHByZWZpeFxuXHR2YXIgbCA9IGxjcy5wcmVmaXg7XG5cdGZvcihpID0gMDtpIDwgbDsgKytpKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaSwgaSk7XG5cdH1cblxuXHQvLyBSZWR1Y2UgbG9uZ2VzdCBjaGFuZ2Ugc3BhblxuXHRrID0gaTtcblx0bCA9IG0ubGVuZ3RoO1xuXHRpID0gMDtcblx0aiA9IDA7XG5cdHdoaWxlKGkgPCBsKSB7XG5cdFx0b3AgPSBtW2ldW2pdLnR5cGU7XG5cdFx0ciA9IGYociwgb3AsIGkraywgaitrKTtcblxuXHRcdHN3aXRjaChvcCkge1xuXHRcdFx0Y2FzZSBTS0lQOiAgKytpOyArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBSSUdIVDogKytqOyBicmVhaztcblx0XHRcdGNhc2UgRE9XTjogICsraTsgYnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBzdWZmaXhcblx0aSArPSBrO1xuXHRqICs9IGs7XG5cdGwgPSBsY3Muc3VmZml4O1xuXHRmb3IoayA9IDA7ayA8IGw7ICsraykge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGkraywgaitrKTtcblx0fVxuXG5cdHJldHVybiByO1xufVxuXG5mdW5jdGlvbiBmaW5kUHJlZml4KGEsIGIpIHtcblx0dmFyIGkgPSAwO1xuXHR2YXIgbCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XG5cdHdoaWxlKGkgPCBsICYmIGFbaV0gPT09IGJbaV0pIHtcblx0XHQrK2k7XG5cdH1cblx0cmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGZpbmRTdWZmaXgoYSwgYikge1xuXHR2YXIgYWwgPSBhLmxlbmd0aCAtIDE7XG5cdHZhciBibCA9IGIubGVuZ3RoIC0gMTtcblx0dmFyIGwgPSBNYXRoLm1pbihhbCwgYmwpO1xuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIGFbYWwtaV0gPT09IGJbYmwtaV0pIHtcblx0XHQrK2k7XG5cdH1cblx0cmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGJhY2t0cmFjayhtYXRyaXgsIGEsIGIsIHN0YXJ0LCBqLCBpKSB7XG5cdGlmIChhW2orc3RhcnRdID09PSBiW2krc3RhcnRdKSB7XG5cdFx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpICsgMV1baiArIDFdLnZhbHVlLCB0eXBlOiBTS0lQIH07XG5cdH1cblx0aWYgKG1hdHJpeFtpXVtqICsgMV0udmFsdWUgPCBtYXRyaXhbaSArIDFdW2pdLnZhbHVlKSB7XG5cdFx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpXVtqICsgMV0udmFsdWUgKyAxLCB0eXBlOiBSSUdIVCB9O1xuXHR9XG5cblx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpICsgMV1bal0udmFsdWUgKyAxLCB0eXBlOiBET1dOIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hdHJpeCAoY29scywgcm93cykge1xuXHR2YXIgbSA9IFtdLCBpLCBqLCBsYXN0cm93O1xuXG5cdC8vIEZpbGwgdGhlIGxhc3Qgcm93XG5cdGxhc3Ryb3cgPSBtW3Jvd3NdID0gW107XG5cdGZvciAoaiA9IDA7IGo8Y29sczsgKytqKSB7XG5cdFx0bGFzdHJvd1tqXSA9IHsgdmFsdWU6IGNvbHMgLSBqLCB0eXBlOiBSSUdIVCB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjb2xcblx0Zm9yIChpID0gMDsgaTxyb3dzOyArK2kpIHtcblx0XHRtW2ldID0gW107XG5cdFx0bVtpXVtjb2xzXSA9IHsgdmFsdWU6IHJvd3MgLSBpLCB0eXBlOiBET1dOIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNlbGxcblx0bVtyb3dzXVtjb2xzXSA9IHsgdmFsdWU6IDAsIHR5cGU6IFNLSVAgfTtcblxuXHRyZXR1cm4gbTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBkZWVwRXF1YWxzID0gcmVxdWlyZSgnLi9kZWVwRXF1YWxzJyk7XG52YXIgY29tbXV0ZVBhdGhzID0gcmVxdWlyZSgnLi9jb21tdXRlUGF0aHMnKTtcblxudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG52YXIgVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9UZXN0RmFpbGVkRXJyb3InKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbnZhciBQYXRjaE5vdEludmVydGlibGVFcnJvciA9IHJlcXVpcmUoJy4vUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGZpbmQgPSBqc29uUG9pbnRlci5maW5kO1xudmFyIHBhcnNlQXJyYXlJbmRleCA9IGpzb25Qb2ludGVyLnBhcnNlQXJyYXlJbmRleDtcblxuZXhwb3J0cy50ZXN0ID0ge1xuXHRhcHBseTogYXBwbHlUZXN0LFxuXHRpbnZlcnNlOiBpbnZlcnRUZXN0LFxuXHRjb21tdXRlOiBjb21tdXRlVGVzdFxufTtcblxuZXhwb3J0cy5hZGQgPSB7XG5cdGFwcGx5OiBhcHBseUFkZCxcblx0aW52ZXJzZTogaW52ZXJ0QWRkLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG5leHBvcnRzLnJlbW92ZSA9IHtcblx0YXBwbHk6IGFwcGx5UmVtb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZW1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVSZW1vdmVcbn07XG5cbmV4cG9ydHMucmVwbGFjZSA9IHtcblx0YXBwbHk6IGFwcGx5UmVwbGFjZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVwbGFjZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlcGxhY2Vcbn07XG5cbmV4cG9ydHMubW92ZSA9IHtcblx0YXBwbHk6IGFwcGx5TW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0TW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZU1vdmVcbn07XG5cbmV4cG9ydHMuY29weSA9IHtcblx0YXBwbHk6IGFwcGx5Q29weSxcblx0aW52ZXJzZTogbm90SW52ZXJ0aWJsZSxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuLyoqXG4gKiBBcHBseSBhIHRlc3Qgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdCB0ZXN0IG9wZXJhdGlvblxuICogQHRocm93cyB7VGVzdEZhaWxlZEVycm9yfSBpZiB0aGUgdGVzdCBvcGVyYXRpb24gZmFpbHNcbiAqL1xuXG5mdW5jdGlvbiBhcHBseVRlc3QoeCwgdGVzdCwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgdGVzdC5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCB0ZXN0LmNvbnRleHQpO1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cdHZhciBpbmRleCwgdmFsdWU7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0aW5kZXggPSBwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpO1xuXHRcdC8vaW5kZXggPSBmaW5kSW5kZXgob3B0aW9ucy5maW5kQ29udGV4dCwgaW5kZXgsIHRhcmdldCwgdGVzdC5jb250ZXh0KTtcblx0XHR2YWx1ZSA9IHRhcmdldFtpbmRleF07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSBwb2ludGVyLmtleSA9PT0gdm9pZCAwID8gcG9pbnRlci50YXJnZXQgOiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV07XG5cdH1cblxuXHRpZighZGVlcEVxdWFscyh2YWx1ZSwgdGVzdC52YWx1ZSkpIHtcblx0XHR0aHJvdyBuZXcgVGVzdEZhaWxlZEVycm9yKCd0ZXN0IGZhaWxlZCAnICsgSlNPTi5zdHJpbmdpZnkodGVzdCkpO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbi8qKlxuICogSW52ZXJ0IHRoZSBwcm92aWRlZCB0ZXN0IGFuZCBhZGQgaXQgdG8gdGhlIGludmVydGVkIHBhdGNoIHNlcXVlbmNlXG4gKiBAcGFyYW0gcHJcbiAqIEBwYXJhbSB0ZXN0XG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiBpbnZlcnRUZXN0KHByLCB0ZXN0KSB7XG5cdHByLnB1c2godGVzdCk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlVGVzdCh0ZXN0LCBiKSB7XG5cdGlmKHRlc3QucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIHRlc3QscmVtb3ZlIC0+IHJlbW92ZSx0ZXN0IGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdGlmKGIub3AgPT09ICd0ZXN0JyB8fCBiLm9wID09PSAncmVwbGFjZScpIHtcblx0XHRyZXR1cm4gW2IsIHRlc3RdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyh0ZXN0LCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhbiBhZGQgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGFkZCBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlBZGQoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsID0gY2xvbmUoY2hhbmdlLnZhbHVlKTtcblxuXHQvLyBJZiBwb2ludGVyIHJlZmVycyB0byB3aG9sZSBkb2N1bWVudCwgcmVwbGFjZSB3aG9sZSBkb2N1bWVudFxuXHRpZihwb2ludGVyLmtleSA9PT0gdm9pZCAwKSB7XG5cdFx0cmV0dXJuIHZhbDtcblx0fVxuXG5cdF9hZGQocG9pbnRlciwgdmFsKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIF9hZGQocG9pbnRlciwgdmFsdWUpIHtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdC8vICctJyBpbmRpY2F0ZXMgJ2FwcGVuZCcgdG8gYXJyYXlcblx0XHRpZihwb2ludGVyLmtleSA9PT0gJy0nKSB7XG5cdFx0XHR0YXJnZXQucHVzaCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRhcmdldC5zcGxpY2UocG9pbnRlci5rZXksIDAsIHZhbHVlKTtcblx0XHR9XG5cdH0gZWxzZSBpZihpc1ZhbGlkT2JqZWN0KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgYWRkIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5ICcgKyBwb2ludGVyLmtleSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0QWRkKHByLCBhZGQpIHtcblx0dmFyIGNvbnRleHQgPSBhZGQuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhhZGQudmFsdWUsIGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBhZGQucGF0aCwgdmFsdWU6IGFkZC52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cHIucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogYWRkLnBhdGgsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlQWRkT3JDb3B5KGFkZCwgYikge1xuXHRpZihhZGQucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIGFkZCxyZW1vdmUgLT4gcmVtb3ZlLGFkZCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKGFkZCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZXBsYWNlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZXBsYWNlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseVJlcGxhY2UoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IG1pc3NpbmdWYWx1ZShwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbHVlID0gY2xvbmUoY2hhbmdlLnZhbHVlKTtcblxuXHQvLyBJZiBwb2ludGVyIHJlZmVycyB0byB3aG9sZSBkb2N1bWVudCwgcmVwbGFjZSB3aG9sZSBkb2N1bWVudFxuXHRpZihwb2ludGVyLmtleSA9PT0gdm9pZCAwKSB7XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpXSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRSZXBsYWNlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVwbGFjZSB3L28gdGVzdCcpO1xuXHR9XG5cblx0dmFyIGNvbnRleHQgPSBwcmV2LmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMocHJldi52YWx1ZSwgYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKSlcblx0XHR9XG5cdH1cblxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogYy52YWx1ZSB9KTtcblx0cHIucHVzaCh7IG9wOiAncmVwbGFjZScsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVwbGFjZShyZXBsYWNlLCBiKSB7XG5cdGlmKHJlcGxhY2UucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIHJlcGxhY2UscmVtb3ZlIC0+IHJlbW92ZSxyZXBsYWNlIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdGlmKGIub3AgPT09ICd0ZXN0JyB8fCBiLm9wID09PSAncmVwbGFjZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlcGxhY2VdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZXBsYWNlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseVJlbW92ZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0Ly8ga2V5IG11c3QgZXhpc3QgZm9yIHJlbW92ZVxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMCkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0X3JlbW92ZShwb2ludGVyKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIF9yZW1vdmUgKHBvaW50ZXIpIHtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdHZhciByZW1vdmVkO1xuXHRpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldC5zcGxpY2UocGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KSwgMSk7XG5cdFx0cmV0dXJuIHJlbW92ZWRbMF07XG5cblx0fSBlbHNlIGlmIChpc1ZhbGlkT2JqZWN0KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0XHRkZWxldGUgdGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0XHRyZXR1cm4gcmVtb3ZlZDtcblxuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIHJlbW92ZSBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheScpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydFJlbW92ZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlbW92ZSB3L28gdGVzdCcpO1xuXHR9XG5cblx0dmFyIGNvbnRleHQgPSBwcmV2LmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LnRhaWwoY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblxuXHRwci5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlbW92ZShyZW1vdmUsIGIpIHtcblx0aWYocmVtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiBbYiwgcmVtb3ZlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIG1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIG1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5TW92ZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0aWYoanNvblBvaW50ZXIuY29udGFpbnMoY2hhbmdlLnBhdGgsIGNoYW5nZS5mcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignbW92ZS5mcm9tIGNhbm5vdCBiZSBhbmNlc3RvciBvZiBtb3ZlLnBhdGgnKTtcblx0fVxuXG5cdHZhciBwdG8gPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cdHZhciBwZnJvbSA9IGZpbmQoeCwgY2hhbmdlLmZyb20sIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5mcm9tQ29udGV4dCk7XG5cblx0X2FkZChwdG8sIF9yZW1vdmUocGZyb20pKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydE1vdmUocHIsIGMpIHtcblx0cHIucHVzaCh7IG9wOiAnbW92ZScsXG5cdFx0cGF0aDogYy5mcm9tLCBjb250ZXh0OiBjLmZyb21Db250ZXh0LFxuXHRcdGZyb206IGMucGF0aCwgZnJvbUNvbnRleHQ6IGMuY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVNb3ZlKG1vdmUsIGIpIHtcblx0aWYobW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgbW92ZSxyZW1vdmUgLT4gbW92ZSxyZXBsYWNlIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMobW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBjb3B5IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBjb3B5IG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUNvcHkoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwdG8gPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cdHZhciBwZnJvbSA9IGZpbmQoeCwgY2hhbmdlLmZyb20sIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5mcm9tQ29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocGZyb20pIHx8IG1pc3NpbmdWYWx1ZShwZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2NvcHkuZnJvbSBtdXN0IGV4aXN0Jyk7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcGZyb20udGFyZ2V0O1xuXHR2YXIgdmFsdWU7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBmcm9tLmtleSldO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3Bmcm9tLmtleV07XG5cdH1cblxuXHRfYWRkKHB0bywgY2xvbmUodmFsdWUpKTtcblx0cmV0dXJuIHg7XG59XG5cbi8vIE5PVEU6IENvcHkgaXMgbm90IGludmVydGlibGVcbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL2ppZmYvaXNzdWVzLzlcbi8vIFRoaXMgbmVlZHMgbW9yZSB0aG91Z2h0LiBXZSBtYXkgaGF2ZSB0byBleHRlbmQvYW1lbmQgSlNPTiBQYXRjaC5cbi8vIEF0IGZpcnN0IGdsYW5jZSwgdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBqdXN0IGJlIGEgcmVtb3ZlLlxuLy8gSG93ZXZlciwgdGhhdCdzIG5vdCBjb3JyZWN0LiAgSXQgdmlvbGF0ZXMgdGhlIGludm9sdXRpb246XG4vLyBpbnZlcnQoaW52ZXJ0KHApKSB+PSBwLiAgRm9yIGV4YW1wbGU6XG4vLyBpbnZlcnQoY29weSkgLT4gcmVtb3ZlXG4vLyBpbnZlcnQocmVtb3ZlKSAtPiBhZGRcbi8vIHRodXM6IGludmVydChpbnZlcnQoY29weSkpIC0+IGFkZCAoRE9IISB0aGlzIHNob3VsZCBiZSBjb3B5ISlcblxuZnVuY3Rpb24gbm90SW52ZXJ0aWJsZShfLCBjKSB7XG5cdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCAnICsgYy5vcCk7XG59XG5cbmZ1bmN0aW9uIG5vdEZvdW5kIChwb2ludGVyKSB7XG5cdHJldHVybiBwb2ludGVyID09PSB2b2lkIDAgfHwgKHBvaW50ZXIudGFyZ2V0ID09IG51bGwgJiYgcG9pbnRlci5rZXkgIT09IHZvaWQgMCk7XG59XG5cbmZ1bmN0aW9uIG1pc3NpbmdWYWx1ZShwb2ludGVyKSB7XG5cdHJldHVybiBwb2ludGVyLmtleSAhPT0gdm9pZCAwICYmIHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHggaXMgYSBub24tbnVsbCBvYmplY3RcbiAqIEBwYXJhbSB7Kn0geFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRPYmplY3QgKHgpIHtcblx0cmV0dXJuIHggIT09IG51bGwgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnO1xufVxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcclxuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xyXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xyXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcclxuTG9jYWxGaWxlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbC1maWxlLXByb3ZpZGVyJ1xyXG5cclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkQ29udGVudCA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZENvbnRlbnRcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSwgQGNhbGxiYWNrID0gbnVsbCwgQHN0YXRlID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIEBzdGF0ZSA9XHJcbiAgICAgIGF2YWlsYWJsZVByb3ZpZGVyczogW11cclxuICAgIEBfbGlzdGVuZXJzID0gW11cclxuICAgIEBfcmVzZXRTdGF0ZSgpXHJcbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXHJcbiAgICBAcHJvdmlkZXJzID0ge31cclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cclxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcclxuICAgIGFsbFByb3ZpZGVycyA9IHt9XHJcbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXIsIExvY2FsRmlsZVByb3ZpZGVyXVxyXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxyXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXHJcblxyXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBAYXBwT3B0aW9ucy5wcm92aWRlcnMgPSBbXVxyXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcclxuICAgICAgICBhcHBPcHRpb25zLnByb3ZpZGVycy5wdXNoIHByb3ZpZGVyTmFtZVxyXG5cclxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xyXG4gICAgYXZhaWxhYmxlUHJvdmlkZXJzID0gW11cclxuICAgIGZvciBwcm92aWRlciBpbiBAYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXHJcbiAgICAgICMgbWVyZ2UgaW4gb3RoZXIgb3B0aW9ucyBhcyBuZWVkZWRcclxuICAgICAgcHJvdmlkZXJPcHRpb25zLm1pbWVUeXBlID89IEBhcHBPcHRpb25zLm1pbWVUeXBlXHJcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcclxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9ucywgQFxyXG4gICAgICAgICAgQHByb3ZpZGVyc1twcm92aWRlck5hbWVdID0gcHJvdmlkZXJcclxuICAgICAgICAgIGF2YWlsYWJsZVByb3ZpZGVycy5wdXNoIHByb3ZpZGVyXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXHJcbiAgICBAX3NldFN0YXRlIGF2YWlsYWJsZVByb3ZpZGVyczogYXZhaWxhYmxlUHJvdmlkZXJzXHJcblxyXG4gICAgIyBhZGQgc2luZ2xldG9uIHNoYXJlUHJvdmlkZXIsIGlmIGl0IGV4aXN0c1xyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgcHJvdmlkZXIuY2FuICdzaGFyZSdcclxuICAgICAgICBAX3NldFN0YXRlIHNoYXJlUHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgYnJlYWtcclxuXHJcbiAgICBAYXBwT3B0aW9ucy51aSBvcj0ge31cclxuICAgIEBhcHBPcHRpb25zLnVpLndpbmRvd1RpdGxlU3VmZml4IG9yPSBkb2N1bWVudC50aXRsZVxyXG4gICAgQGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTZXBhcmF0b3Igb3I9ICcgLSAnXHJcbiAgICBAX3NldFdpbmRvd1RpdGxlKClcclxuXHJcbiAgICBAX3VpLmluaXQgQGFwcE9wdGlvbnMudWlcclxuXHJcbiAgICAjIGNoZWNrIGZvciBhdXRvc2F2ZVxyXG4gICAgaWYgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW5pdGlhbGl6ZSB0aGUgY2xvdWRDb250ZW50RmFjdG9yeSB3aXRoIGFsbCBkYXRhIHdlIHdhbnQgaW4gdGhlIGVudmVsb3BlXHJcbiAgICBjbG91ZENvbnRlbnRGYWN0b3J5LnNldEVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgYXBwTmFtZTogQGFwcE9wdGlvbnMuYXBwTmFtZSBvciBcIlwiXHJcbiAgICAgIGFwcFZlcnNpb246IEBhcHBPcHRpb25zLmFwcFZlcnNpb24gb3IgXCJcIlxyXG4gICAgICBhcHBCdWlsZE51bTogQGFwcE9wdGlvbnMuYXBwQnVpbGROdW0gb3IgXCJcIlxyXG5cclxuICAgIEBuZXdGaWxlT3BlbnNJbk5ld1RhYiA9IGlmIEBhcHBPcHRpb25zLnVpPy5oYXNPd25Qcm9wZXJ0eSgnbmV3RmlsZU9wZW5zSW5OZXdUYWInKSB0aGVuIEBhcHBPcHRpb25zLnVpLm5ld0ZpbGVPcGVuc0luTmV3VGFiIGVsc2UgdHJ1ZVxyXG4gICAgQHNhdmVDb3B5T3BlbnNJbk5ld1RhYiA9IGlmIEBhcHBPcHRpb25zLnVpPy5oYXNPd25Qcm9wZXJ0eSgnc2F2ZUNvcHlPcGVuc0luTmV3VGFiJykgdGhlbiBAYXBwT3B0aW9ucy51aS5zYXZlQ29weU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXHJcblxyXG4gIHNldFByb3ZpZGVyT3B0aW9uczogKG5hbWUsIG5ld09wdGlvbnMpIC0+XHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5uYW1lIGlzIG5hbWVcclxuICAgICAgICBwcm92aWRlci5vcHRpb25zID89IHt9XHJcbiAgICAgICAgZm9yIGtleSBvZiBuZXdPcHRpb25zXHJcbiAgICAgICAgICBwcm92aWRlci5vcHRpb25zW2tleV0gPSBuZXdPcHRpb25zW2tleV1cclxuICAgICAgICBicmVha1xyXG5cclxuICBjb25uZWN0OiAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgbGlzdGVuOiAobGlzdGVuZXIpIC0+XHJcbiAgICBpZiBsaXN0ZW5lclxyXG4gICAgICBAX2xpc3RlbmVycy5wdXNoIGxpc3RlbmVyXHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5wcmVwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLnJlcGxhY2VNZW51SXRlbSBrZXksIGl0ZW07IEBcclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQmVmb3JlIGtleSwgaXRlbTsgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUFmdGVyIGtleSwgaXRlbTsgQFxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBcIlwiXHJcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnLCB7Y29udGVudDogXCJcIn1cclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBuZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiBAX2dldEN1cnJlbnRVcmwoKSwgJ19ibGFuaydcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XHJcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgQHNhdmUoKVxyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5ORVdfRklMRSdcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBuZXdGaWxlKClcclxuXHJcbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2xvYWQnXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX0sIEBfZ2V0SGFzaFBhcmFtcyBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAb3BlbkZpbGVEaWFsb2cgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiAobm90IEBzdGF0ZS5kaXJ0eSkgb3IgKGNvbmZpcm0gdHIgJ35DT05GSVJNLk9QRU5fRklMRScpXHJcbiAgICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIEBvcGVuRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgb3BlblNoYXJlZENvbnRlbnQ6IChpZCkgLT5cclxuICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPy5sb2FkU2hhcmVkQ29udGVudCBpZCwgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XHJcbiAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge292ZXJ3cml0YWJsZTogZmFsc2UsIG9wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cclxuXHJcbiAgb3BlblByb3ZpZGVyRmlsZTogKHByb3ZpZGVyTmFtZSwgcHJvdmlkZXJQYXJhbXMpIC0+XHJcbiAgICBwcm92aWRlciA9IEBwcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgaWYgcHJvdmlkZXJcclxuICAgICAgcHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgICBpZiBhdXRob3JpemVkXHJcbiAgICAgICAgICBwcm92aWRlci5vcGVuU2F2ZWQgcHJvdmlkZXJQYXJhbXMsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9LCBAX2dldEhhc2hQYXJhbXMgbWV0YWRhdGFcclxuXHJcbiAgc2F2ZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpID0+XHJcbiAgICAgIEBzYXZlQ29udGVudCBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29udGVudDogKHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGU6IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXHJcbiAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLnNhdmUgY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgaWYgQHN0YXRlLm1ldGFkYXRhIGlzbnQgbWV0YWRhdGFcclxuICAgICAgICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCB7c2F2ZWQ6IHRydWV9LCBAX2dldEhhc2hQYXJhbXMgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY3VycmVudENvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVBc0RpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvcHlEaWFsb2c6IChzdHJpbmdDb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgc2F2ZUNvcHkgPSAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEpID0+XHJcbiAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLnNhdmUgY29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBpZiBAc2F2ZUNvcHlPcGVuc0luTmV3VGFiXHJcbiAgICAgICAgICB3aW5kb3cub3BlbiBAX2dldEN1cnJlbnRVcmwgQF9nZXRIYXNoUGFyYW1zIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBAX3VpLnNhdmVDb3B5RGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgaWYgc3RyaW5nQ29udGVudCBpcyBudWxsXHJcbiAgICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgLT5cclxuICAgICAgICAgIHNhdmVDb3B5IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBzYXZlQ29weSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBzaGFyZUdldExpbms6IC0+XHJcbiAgICBzaG93U2hhcmVEaWFsb2cgPSAoc2hhcmVkRG9jdW1lbnRJZCkgPT5cclxuICAgICAgQF91aS5zaGFyZVVybERpYWxvZyBAX2dldEN1cnJlbnRVcmwgXCIjc2hhcmVkPSN7c2hhcmVkRG9jdW1lbnRJZH1cIlxyXG5cclxuICAgIHNoYXJlZERvY3VtZW50SWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldCBcInNoYXJlZERvY3VtZW50SWRcIlxyXG4gICAgaWYgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2hhcmUgKHNoYXJlZERvY3VtZW50SWQpID0+XHJcbiAgICAgICAgQGRpcnR5KClcclxuICAgICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxyXG5cclxuICBzaGFyZVVwZGF0ZTogLT5cclxuICAgIEBzaGFyZSgpXHJcblxyXG4gIHNoYXJlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAc3RhdGUuc2hhcmVQcm92aWRlclxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICAgIHNoYXJpbmc6IHRydWVcclxuICAgICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2hhcmUgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxyXG4gICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NoYXJlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjaz8gc2hhcmVkQ29udGVudElkXHJcblxyXG4gIHJldmVydFRvU2hhcmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgIGlmIGlkIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQHN0YXRlLmN1cnJlbnRDb250ZW50LmNvcHlNZXRhZGF0YVRvIGNvbnRlbnRcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IG51bGxcclxuXHJcbiAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIikgYW5kIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPyBhbmQgY29uZmlybSB0ciBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIEByZXZlcnRUb1NoYXJlZCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIEBfdWkuZG93bmxvYWREaWFsb2cgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCAoY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgY29udGVudCksIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIGRpcnR5ID0gQHN0YXRlLmRpcnR5XHJcbiAgICBfcmVuYW1lID0gKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgQF9maWxlQ2hhbmdlZCAncmVuYW1lZEZpbGUnLCBAc3RhdGUuY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCB7ZGlydHk6IGRpcnR5fSwgQF9nZXRIYXNoUGFyYW1zIG1ldGFkYXRhXHJcbiAgICAgIGNhbGxiYWNrPyBuZXdOYW1lXHJcbiAgICBpZiBuZXdOYW1lIGlzbnQgQHN0YXRlLm1ldGFkYXRhPy5uYW1lXHJcbiAgICAgIGlmIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAncmVuYW1lJ1xyXG4gICAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5yZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCAoZXJyLCBtZXRhZGF0YSkgPT5cclxuICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICBfcmVuYW1lIG1ldGFkYXRhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBtZXRhZGF0YVxyXG4gICAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IG5ld05hbWVcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgX3JlbmFtZSBtZXRhZGF0YVxyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICBAcmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2tcclxuXHJcbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIEBzdGF0ZS5vcGVuZWRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBAc3RhdGUub3BlbmVkQ29udGVudC5jbG9uZSgpfVxyXG5cclxuICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBpZiBjb25maXJtIHRyICd+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORUQnXHJcbiAgICAgICAgQHJldmVydFRvTGFzdE9wZW5lZCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsP1xyXG5cclxuICBzaG93QmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XHJcbiAgICBAX3VpLmJsb2NraW5nTW9kYWwgbW9kYWxQcm9wc1xyXG5cclxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEsIGFkZGl0aW9uYWxTdGF0ZT17fSwgaGFzaFBhcmFtcz1udWxsKSAtPlxyXG4gICAgbWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSA/PSB0cnVlXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGN1cnJlbnRDb250ZW50OiBjb250ZW50XHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIGFkZGl0aW9uYWxTdGF0ZVxyXG4gICAgICBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfc2V0V2luZG93VGl0bGUgbWV0YWRhdGE/Lm5hbWVcclxuICAgIGlmIGhhc2hQYXJhbXMgaXNudCBudWxsXHJcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaFBhcmFtc1xyXG4gICAgQF9zZXRTdGF0ZSBzdGF0ZVxyXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudD8uZ2V0VGV4dCgpfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgZm9yIGxpc3RlbmVyIGluIEBfbGlzdGVuZXJzXHJcbiAgICAgIGxpc3RlbmVyIGV2ZW50XHJcblxyXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xyXG4gICAgICBAc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXHJcblxyXG4gIF9yZXNldFN0YXRlOiAtPlxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBvcGVuZWRDb250ZW50OiBudWxsXHJcbiAgICAgIGN1cnJlbnRDb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG4gIF9jbG9zZUN1cnJlbnRGaWxlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdjbG9zZSdcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmNsb3NlIEBzdGF0ZS5tZXRhZGF0YVxyXG5cclxuICBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudDogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5jdXJyZW50Q29udGVudD9cclxuICAgICAgY3VycmVudENvbnRlbnQgPSBAc3RhdGUuY3VycmVudENvbnRlbnRcclxuICAgICAgY3VycmVudENvbnRlbnQuc2V0VGV4dCBzdHJpbmdDb250ZW50XHJcbiAgICBlbHNlXHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgc3RyaW5nQ29udGVudFxyXG4gICAgaWYgbWV0YWRhdGE/XHJcbiAgICAgIGN1cnJlbnRDb250ZW50LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgIGN1cnJlbnRDb250ZW50XHJcblxyXG4gIF9nZXRDdXJyZW50VXJsOiAocXVlcnlTdHJpbmcgPSBudWxsKSAtPlxyXG4gICAgc3VmZml4ID0gaWYgcXVlcnlTdHJpbmc/IHRoZW4gXCI/I3txdWVyeVN0cmluZ31cIiBlbHNlIFwiXCJcclxuICAgIFwiI3tkb2N1bWVudC5sb2NhdGlvbi5vcmlnaW59I3tkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0je3N1ZmZpeH1cIlxyXG5cclxuICBfc2V0V2luZG93VGl0bGU6IChuYW1lKSAtPlxyXG4gICAgaWYgQGFwcE9wdGlvbnM/LnVpPy53aW5kb3dUaXRsZVN1ZmZpeFxyXG4gICAgICBkb2N1bWVudC50aXRsZSA9IFwiI3tpZiBuYW1lPy5sZW5ndGggPiAwIHRoZW4gbmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpfSN7QGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTZXBhcmF0b3J9I3tAYXBwT3B0aW9ucy51aS53aW5kb3dUaXRsZVN1ZmZpeH1cIlxyXG5cclxuICBfZ2V0SGFzaFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW5PcGVuU2F2ZWQoKSB0aGVuIFwiI2ZpbGU9I3ttZXRhZGF0YS5wcm92aWRlci5uYW1lfToje2VuY29kZVVSSUNvbXBvbmVudCBtZXRhZGF0YS5wcm92aWRlci5nZXRPcGVuU2F2ZWRQYXJhbXMgbWV0YWRhdGF9XCIgZWxzZSBcIlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbmRvY3VtZW50U3RvcmUgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tXCJcclxuYXV0aG9yaXplVXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxyXG5jaGVja0xvZ2luVXJsICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2luZm9cIlxyXG5saXN0VXJsICAgICAgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9hbGxcIlxyXG5sb2FkRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9vcGVuXCJcclxuc2F2ZURvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvc2F2ZVwiXHJcbnBhdGNoRG9jdW1lbnRVcmwgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3BhdGNoXCJcclxucmVtb3ZlRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvZGVsZXRlXCJcclxucmVuYW1lRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcmVuYW1lXCJcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuamlmZiA9IHJlcXVpcmUgJ2ppZmYnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBkb2NTdG9yZUF2YWlsYWJsZTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9vbkRvY1N0b3JlTG9hZGVkID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtYXV0aCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1jb25jb3JkLWxvZ28nfSwgJycpXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWZvb3Rlcid9LFxyXG4gICAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdMb2dpbiB0byBDb25jb3JkJylcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAnVHJ5aW5nIHRvIGxvZyBpbnRvIENvbmNvcmQuLi4nXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBzaGFyZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICAgIEB1c2VyID0gbnVsbFxyXG5cclxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXHJcblxyXG4gIHByZXZpb3VzbHlTYXZlZENvbnRlbnQ6IG51bGxcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEB1c2VyXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgZWxzZVxyXG4gICAgICBAdXNlciBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAtPlxyXG4gICAgQF9zaG93TG9naW5XaW5kb3coKVxyXG5cclxuICBfb25Eb2NTdG9yZUxvYWRlZDogKEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQF9kb2NTdG9yZUxvYWRlZFxyXG4gICAgICBAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpblN1Y2Nlc3NmdWw6IChAdXNlcikgLT5cclxuICAgIEBfbG9naW5XaW5kb3c/LmNsb3NlKClcclxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG5cclxuICBfY2hlY2tMb2dpbjogLT5cclxuICAgIHByb3ZpZGVyID0gQFxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luV2luZG93OiBudWxsXHJcblxyXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XHJcbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcclxuICAgICAgQF9sb2dpbldpbmRvdy5mb2N1cygpXHJcbiAgICBlbHNlXHJcblxyXG4gICAgICBjb21wdXRlU2NyZWVuTG9jYXRpb24gPSAodywgaCkgLT5cclxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcclxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxyXG4gICAgICAgIHdpZHRoICA9IHdpbmRvdy5pbm5lcldpZHRoICBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIG9yIHNjcmVlbi53aWR0aFxyXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcclxuXHJcbiAgICAgICAgbGVmdCA9ICgod2lkdGggLyAyKSAtICh3IC8gMikpICsgc2NyZWVuTGVmdFxyXG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxyXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxyXG5cclxuICAgICAgd2lkdGggPSAxMDAwXHJcbiAgICAgIGhlaWdodCA9IDQ4MFxyXG4gICAgICBwb3NpdGlvbiA9IGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiB3aWR0aCwgaGVpZ2h0XHJcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xyXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcclxuICAgICAgICAnaGVpZ2h0PScgKyBoZWlnaHRcclxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXHJcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXHJcbiAgICAgICAgJ2RlcGVuZGVudD15ZXMnXHJcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcclxuICAgICAgICAnbG9jYXRpb249bm8nXHJcbiAgICAgICAgJ2RpYWxvZz15ZXMnXHJcbiAgICAgICAgJ21lbnViYXI9bm8nXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxyXG5cclxuICAgICAgcG9sbEFjdGlvbiA9ID0+XHJcbiAgICAgICAgdHJ5XHJcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICAgICAgICBpZiAoaHJlZiBpcyB3aW5kb3cubG9jYXRpb24uaHJlZilcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXHJcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxyXG4gICAgICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgICAgIGNhdGNoIGVcclxuICAgICAgICAgICMgY29uc29sZS5sb2cgZVxyXG5cclxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBsaXN0VXJsXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3Igb3duIGtleSwgZmlsZSBvZiBkYXRhXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YToge2lkOiBmaWxlLmlkfVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXHJcblxyXG4gIGxvYWRTaGFyZWRDb250ZW50OiAoaWQsIGNhbGxiYWNrKSAtPlxyXG4gICAgc2hhcmVkTWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICBzaGFyZWRDb250ZW50SWQ6IGlkXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBvdmVyd3JpdGFibGU6IGZhbHNlXHJcbiAgICBAbG9hZCBzaGFyZWRNZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBzaGFyZWRNZXRhZGF0YVxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgd2l0aENyZWRlbnRpYWxzID0gdW5sZXNzIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZCB0aGVuIHRydWUgZWxzZSBmYWxzZVxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWQgb3IgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHt3aXRoQ3JlZGVudGlhbHN9XHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBkYXRhXHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPz0gZGF0YS5kb2NOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBtZXNzYWdlID0gaWYgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkIGRvY3VtZW50ICcje21ldGFkYXRhLnNoYXJlZENvbnRlbnRJZH0nLiBQZXJoYXBzIHRoZSBmaWxlIHdhcyBub3Qgc2hhcmVkP1wiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgXCJVbmFibGUgdG8gbG9hZCAje21ldGFkYXRhLm5hbWUgb3IgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZCBvciAnZmlsZSd9XCJcclxuICAgICAgICBjYWxsYmFjayBtZXNzYWdlXHJcblxyXG4gIHNoYXJlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcnVuS2V5ID0gY29udGVudC5nZXQoXCJzaGFyZUVkaXRLZXlcIikgb3IgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpXHJcblxyXG4gICAgcGFyYW1zID1cclxuICAgICAgcnVuS2V5OiBydW5LZXlcclxuXHJcbiAgICBpZiBjb250ZW50LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgcGFyYW1zLnJlY29yZGlkID0gY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcblxyXG4gICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICBfcGVybWlzc2lvbnM6IDFcclxuICAgICAgc2hhcmVFZGl0S2V5OiBudWxsICAgICAgICAgICAgIyBzdHJpcCB0aGVzZSBvdXQgb2YgdGhlIHNoYXJlZCBkYXRhIGlmIHRoZXlcclxuICAgICAgc2hhcmVkRG9jdW1lbnRJZDogbnVsbCAgICAgICAgIyBleGlzdCAodGhleSdsbCBiZSByZS1hZGRlZCBvbiBzdWNjZXNzKVxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHNhdmVEb2N1bWVudFVybCwgcGFyYW1zKVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICAgICAgc2hhcmVkRG9jdW1lbnRJZDogZGF0YS5pZFxyXG4gICAgICAgICAgc2hhcmVFZGl0S2V5OiBydW5LZXlcclxuICAgICAgICAgIF9wZXJtaXNzaW9uczogMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGEuaWRcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHNhdmU6IChjbG91ZENvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnQuZ2V0Q29udGVudCgpXHJcblxyXG4gICAgcGFyYW1zID0ge31cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG5cclxuICAgICMgU2VlIGlmIHdlIGNhbiBwYXRjaFxyXG4gICAgY2FuT3ZlcndyaXRlID0gbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudD9cclxuICAgIGlmIGNhbk92ZXJ3cml0ZSBhbmQgZGlmZiA9IEBfY3JlYXRlRGlmZiBAcHJldmlvdXNseVNhdmVkQ29udGVudC5nZXRDb250ZW50KCksIGNvbnRlbnRcclxuICAgICAgc2VuZENvbnRlbnQgPSBkaWZmXHJcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcclxuICAgIGVsc2VcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxyXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcclxuICAgICAgc2VuZENvbnRlbnQgPSBjb250ZW50XHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkgc2VuZENvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjbG91ZENvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXHJcblxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBvcGVuU2F2ZWQ6IChvcGVuU2F2ZWRQYXJhbXMsIGNhbGxiYWNrKSAtPlxyXG4gICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcclxuICAgIEBsb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxyXG4gICAgICBjYWxsYmFjayBlcnIsIGNvbnRlbnQsIG1ldGFkYXRhXHJcblxyXG4gIGdldE9wZW5TYXZlZFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcblxyXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cclxuICAgIHJldHVybiB1cmwgdW5sZXNzIHBhcmFtc1xyXG4gICAga3ZwID0gW11cclxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xyXG4gICAgICBrdnAucHVzaCBba2V5LCB2YWx1ZV0ubWFwKGVuY29kZVVSSSkuam9pbiBcIj1cIlxyXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcclxuXHJcbiAgX2NyZWF0ZURpZmY6IChvYmoxLCBvYmoyKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIG9wdHMgPVxyXG4gICAgICAgIGhhc2g6IEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpZiB0eXBlb2YgQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlzIFwiZnVuY3Rpb25cIlxyXG4gICAgICAjIGNsZWFuIG9iamVjdHMgYmVmb3JlIGRpZmZpbmdcclxuICAgICAgY2xlYW5lZE9iajEgPSBKU09OLnBhcnNlIEpTT04uc3RyaW5naWZ5IG9iajFcclxuICAgICAgY2xlYW5lZE9iajIgPSBKU09OLnBhcnNlIEpTT04uc3RyaW5naWZ5IG9iajJcclxuICAgICAgZGlmZiA9IGppZmYuZGlmZihjbGVhbmVkT2JqMSwgY2xlYW5lZE9iajIsIG9wdHMpXHJcbiAgICAgIHJldHVybiBkaWZmXHJcbiAgICBjYXRjaFxyXG4gICAgICByZXR1cm4gbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5qc2RpZmYgPSByZXF1aXJlICdkaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWF1dGgnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWNvbmNvcmQtbG9nbyd9LCAnJylcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZ29vZ2xlLWRyaXZlLWZvb3Rlcid9LFxyXG4gICAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0xvZ2luIHRvIEdvb2dsZScpXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byBHb29nbGUuLi4nXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBjbG9zZTogdHJ1ZVxyXG5cclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAdXNlciA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbGVEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEB1c2VSZWFsVGltZUFQSSA9IEBvcHRpb25zLnVzZVJlYWxUaW1lQVBJIG9yIGZhbHNlXHJcbiAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnLCAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJ11cclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAdXNlciA9IG51bGxcclxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIGdhcGkuY2xpZW50Lm9hdXRoMi51c2VyaW5mby5nZXQoKS5leGVjdXRlICh1c2VyKSA9PlxyXG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxyXG4gICAgaWYgQF9hdXRvUmVuZXdUaW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dCBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxyXG4gICAgICBAX2F1dG9SZW5ld1RpbWVvdXQgPSBzZXRUaW1lb3V0ICg9PiBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFKSwgKHBhcnNlSW50KGF1dGhUb2tlbi5leHBpcmVzX2luLCAxMCkgKiAwLjc1KSAqIDEwMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9zYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBxdWVyeSA9IFwiKChtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nKSBvciAobWltZVR5cGUgPSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicpKSBhbmQgJyN7aWYgbWV0YWRhdGEgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9JyBpbiBwYXJlbnRzXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgICAgb3ZlcndyaXRhYmxlOiBpdGVtLmVkaXRhYmxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICBpZDogaXRlbS5pZFxyXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cclxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBsb3dlckIgPSBiLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMucGF0Y2hcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIHJlc291cmNlOlxyXG4gICAgICAgICAgdGl0bGU6IG5ld05hbWVcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgaWYgcmVzdWx0Py5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2s/IHJlc3VsdC5lcnJvclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ucmVhbFRpbWU/LmRvYz9cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwcm92aWRlcjogQFxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgaWQ6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgQGxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpIC0+XHJcbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XHJcbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcclxuICAgICAgY2FsbGJhY2soKVxyXG4gICAgZWxzZVxyXG4gICAgICBzZWxmID0gQFxyXG4gICAgICBjaGVjayA9IC0+XHJcbiAgICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ29hdXRoMicsICd2MicsIC0+XHJcbiAgICAgICAgICAgICAgZ2FwaS5sb2FkICdkcml2ZS1yZWFsdGltZScsIC0+XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCBzZWxmXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuXHJcbiAgX2xvYWRGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPSBmaWxlLnRpdGxlXHJcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXHJcbiAgICAgICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcclxuICAgICAgICB4aHIub3BlbiAnR0VUJywgZmlsZS5kb3dubG9hZFVybFxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICdBdXRob3JpemF0aW9uJywgXCJCZWFyZXIgI3tAYXV0aFRva2VuLmFjY2Vzc190b2tlbn1cIlxyXG4gICAgICAgIHhoci5vbmxvYWQgPSAtPlxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgeGhyLnJlc3BvbnNlVGV4dFxyXG4gICAgICAgIHhoci5vbmVycm9yID0gLT5cclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXHJcbiAgICAgICAgeGhyLnNlbmQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXHJcblxyXG4gIF9zYXZlRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXHJcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxyXG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgIHBhcmVudHM6IFt7aWQ6IGlmIG1ldGFkYXRhLnBhcmVudD8ucHJvdmlkZXJEYXRhPy5pZD8gdGhlbiBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfV1cclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXHJcbiAgICBdLmpvaW4gJydcclxuXHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxyXG4gICAgICBwYXRoOiBwYXRoXHJcbiAgICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxyXG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxyXG4gICAgICBib2R5OiBib2R5XHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBjYWxsYmFja1xyXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXHJcbiAgICAgICAgZWxzZSBpZiBmaWxlXHJcbiAgICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrIEBfYXBpRXJyb3IgZmlsZSwgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXHJcblxyXG4gIF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBzZWxmID0gQFxyXG4gICAgZmlsZUxvYWRlZCA9IChkb2MpIC0+XHJcbiAgICAgIGNvbnRlbnQgPSBkb2MuZ2V0TW9kZWwoKS5nZXRSb290KCkuZ2V0ICdjb250ZW50J1xyXG4gICAgICBpZiBtZXRhZGF0YS5vdmVyd3JpdGFibGVcclxuICAgICAgICB0aHJvd0Vycm9yID0gKGUpIC0+XHJcbiAgICAgICAgICBpZiBub3QgZS5pc0xvY2FsIGFuZCBlLnNlc3Npb25JZCBpc250IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5zZXNzaW9uSWRcclxuICAgICAgICAgICAgc2VsZi5jbGllbnQuc2hvd0Jsb2NraW5nTW9kYWxcclxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbmN1cnJlbnQgRWRpdCBMb2NrJ1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBbiBlZGl0IHdhcyBtYWRlIHRvIHRoaXMgZmlsZSBmcm9tIGFub3RoZXIgYnJvd3NlciB3aW5kb3cuIFRoaXMgYXBwIGlzIG5vdyBsb2NrZWQgZm9yIGlucHV0LidcclxuICAgICAgICBjb250ZW50LmFkZEV2ZW50TGlzdGVuZXIgZ2FwaS5kcml2ZS5yZWFsdGltZS5FdmVudFR5cGUuVEVYVF9JTlNFUlRFRCwgdGhyb3dFcnJvclxyXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0RFTEVURUQsIHRocm93RXJyb3JcclxuICAgICAgZm9yIGNvbGxhYm9yYXRvciBpbiBkb2MuZ2V0Q29sbGFib3JhdG9ycygpXHJcbiAgICAgICAgc2Vzc2lvbklkID0gY29sbGFib3JhdG9yLnNlc3Npb25JZCBpZiBjb2xsYWJvcmF0b3IuaXNNZVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxyXG4gICAgICAgIGRvYzogZG9jXHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIHNlc3Npb25JZDogc2Vzc2lvbklkXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGNvbnRlbnQuZ2V0VGV4dCgpXHJcblxyXG4gICAgaW5pdCA9IChtb2RlbCkgLT5cclxuICAgICAgY29udGVudCA9IG1vZGVsLmNyZWF0ZVN0cmluZyAnJ1xyXG4gICAgICBtb2RlbC5nZXRSb290KCkuc2V0ICdjb250ZW50JywgY29udGVudFxyXG5cclxuICAgIGVycm9yID0gKGVycikgPT5cclxuICAgICAgaWYgZXJyLnR5cGUgaXMgJ1RPS0VOX1JFRlJFU0hfUkVRVUlSRUQnXHJcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgYWxlcnQgZXJyLm1lc3NhZ2VcclxuXHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgZWxzZVxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuaW5zZXJ0XHJcbiAgICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG5cclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgZmlsZT8uaWRcclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gZmlsZS50aXRsZVxyXG4gICAgICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IGZpbGUuZWRpdGFibGVcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgIGdhcGkuZHJpdmUucmVhbHRpbWUubG9hZCBmaWxlLmlkLCBmaWxlTG9hZGVkLCBpbml0LCBlcnJvclxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGxvYWQgZmlsZSdcclxuXHJcbiAgX3NhdmVSZWFsVGltZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/Lm1vZGVsXHJcbiAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgICAgQF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbCBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaW5kZXggPSAwXHJcbiAgICByZWFsVGltZUNvbnRlbnQgPSBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuY29udGVudFxyXG4gICAgZGlmZnMgPSBqc2RpZmYuZGlmZkNoYXJzIHJlYWxUaW1lQ29udGVudC5nZXRUZXh0KCksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICBmb3IgZGlmZiBpbiBkaWZmc1xyXG4gICAgICBpZiBkaWZmLnJlbW92ZWRcclxuICAgICAgICByZWFsVGltZUNvbnRlbnQucmVtb3ZlUmFuZ2UgaW5kZXgsIGluZGV4ICsgZGlmZi52YWx1ZS5sZW5ndGhcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIGRpZmYuYWRkZWRcclxuICAgICAgICAgIHJlYWxUaW1lQ29udGVudC5pbnNlcnRTdHJpbmcgaW5kZXgsIGRpZmYudmFsdWVcclxuICAgICAgICBpbmRleCArPSBkaWZmLmNvdW50XHJcbiAgICBjYWxsYmFjayBudWxsXHJcblxyXG4gIF9hcGlFcnJvcjogKHJlc3VsdCwgcHJlZml4KSAtPlxyXG4gICAgaWYgcmVzdWx0Py5tZXNzYWdlP1xyXG4gICAgICBcIiN7cHJlZml4fTogI3tyZXN1bHQubWVzc2FnZX1cIlxyXG4gICAgZWxzZVxyXG4gICAgICBwcmVmaXhcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ7ZGl2LCBpbnB1dCwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkxvY2FsRmlsZUxpc3RUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTG9jYWxGaWxlTGlzdFRhYidcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZXMgPSBlLnRhcmdldC5maWxlc1xyXG4gICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICBhbGVydCB0ciBcIn5MT0NBTF9GSUxFX0RJQUxPRy5NVUxUSVBMRV9GSUxFU19TRUxFQ1RFRFwiXHJcbiAgICBlbHNlIGlmIGZpbGVzLmxlbmd0aCBpcyAxXHJcbiAgICAgIEBvcGVuRmlsZSBmaWxlc1swXVxyXG5cclxuICBvcGVuRmlsZTogKGZpbGUpIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IGZpbGUubmFtZS5zcGxpdCgnLicpWzBdXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwYXJlbnQ6IG51bGxcclxuICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgZmlsZTogZmlsZVxyXG4gICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gbWV0YWRhdGFcclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGRyYWdFbnRlcjogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBzZXRTdGF0ZSBob3ZlcjogdHJ1ZVxyXG5cclxuICBkcmFnTGVhdmU6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAc2V0U3RhdGUgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGRyb3A6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBkcm9wcGVkRmlsZXMgPSBpZiBlLmRhdGFUcmFuc2ZlciB0aGVuIGUuZGF0YVRyYW5zZmVyLmZpbGVzIGVsc2UgZS50YXJnZXQuZmlsZXNcclxuICAgIGlmIGRyb3BwZWRGaWxlcy5sZW5ndGggPiAxXHJcbiAgICAgIGFsZXJ0IFwifkxPQ0FMX0ZJTEVfRElBTE9HLk1VTFRJUExFX0ZJTEVTX0RST1BQRURcIlxyXG4gICAgZWxzZSBpZiBkcm9wcGVkRmlsZXMubGVuZ3RoIGlzIDFcclxuICAgICAgQG9wZW5GaWxlIGRyb3BwZWRGaWxlc1swXVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBkcm9wQ2xhc3MgPSBcImRyb3BBcmVhI3tpZiBAc3RhdGUuaG92ZXIgdGhlbiAnIGRyb3BIb3ZlcicgZWxzZSAnJ31cIlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiIGxvY2FsRmlsZUxvYWQnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBkcm9wQ2xhc3MsIG9uRHJhZ0VudGVyOiBAZHJhZ0VudGVyLCBvbkRyYWdMZWF2ZTogQGRyYWdMZWF2ZSwgb25Ecm9wOiBAZHJvcH0sXHJcbiAgICAgICAgKHRyIFwifkxPQ0FMX0ZJTEVfRElBTE9HLkRST1BfRklMRV9IRVJFXCIpXHJcbiAgICAgICAgKGlucHV0IHt0eXBlOiAnZmlsZScsIG9uQ2hhbmdlOiBAY2hhbmdlZH0pXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5jbGFzcyBMb2NhbEZpbGVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsRmlsZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX0ZJTEUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxGaWxlJ1xyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgaWYgY2FwYWJpbGl0eSBpcyAnbGlzdCdcclxuICAgICAgTG9jYWxGaWxlTGlzdFRhYlxyXG4gICAgZWxzZVxyXG4gICAgICBkZWZhdWx0Q29tcG9uZW50XHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAjIG5vIHJlYWxseSBpbXBsZW1lbnRlZCAtIHdlIGZsYWcgaXQgYXMgaW1wbGVtZW50ZWQgc28gd2Ugc2hvdyBpbiB0aGUgbGlzdCBkaWFsb2dcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgIHJlYWRlci5vbmxvYWQgPSAobG9hZGVkKSAtPlxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBsb2FkZWQudGFyZ2V0LnJlc3VsdFxyXG4gICAgcmVhZGVyLnJlYWRBc1RleHQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmZpbGVcclxuXHJcbiAgY2FuT3BlblNhdmVkOiAtPlxyXG4gICAgIyB0aGlzIHByZXZlbnRzIHRoZSBoYXNoIHRvIGJlIHVwZGF0ZWRcclxuICAgIGZhbHNlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsRmlsZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBmaWxlS2V5ID0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgIGNhdGNoIGVcclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgKG1ldGFkYXRhPy5wYXRoKCkgb3IgW10pLmpvaW4gJy8nXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW2ZpbGVuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbmFtZSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IG5hbWVcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byByZW5hbWUnXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcGFyZW50OiBudWxsXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLm5hbWVcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAdHlwZSwgQHByb3ZpZGVyID0gbnVsbCwgQHBhcmVudCA9IG51bGwsIEBwcm92aWRlckRhdGE9e30sIEBvdmVyd3JpdGFibGUsIEBzaGFyZWRDb250ZW50SWQsIEBzaGFyZWRDb250ZW50U2VjcmV0S2V5fSA9IG9wdGlvbnNcclxuICBARm9sZGVyOiAnZm9sZGVyJ1xyXG4gIEBGaWxlOiAnZmlsZSdcclxuXHJcbiAgcGF0aDogLT5cclxuICAgIF9wYXRoID0gW11cclxuICAgIHBhcmVudCA9IEBwYXJlbnRcclxuICAgIHdoaWxlIHBhcmVudCBpc250IG51bGxcclxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcclxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudFxyXG4gICAgX3BhdGhcclxuXHJcbiMgc2luZ2xldG9uIHRoYXQgY2FuIGNyZWF0ZSBDbG91ZENvbnRlbnQgd3JhcHBlZCB3aXRoIGdsb2JhbCBvcHRpb25zXHJcbmNsYXNzIENsb3VkQ29udGVudEZhY3RvcnlcclxuICBjb25zdHJ1Y3RvcjogLT5cclxuICAgIEBlbnZlbG9wZU1ldGFkYXRhID0ge31cclxuXHJcbiAgIyBzZXQgaW5pdGlhbCBlbnZlbG9wZU1ldGFkYXRhIG9yIHVwZGF0ZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcclxuICBzZXRFbnZlbG9wZU1ldGFkYXRhOiAoZW52ZWxvcGVNZXRhZGF0YSkgLT5cclxuICAgIGZvciBrZXkgb2YgZW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBAZW52ZWxvcGVNZXRhZGF0YVtrZXldID0gZW52ZWxvcGVNZXRhZGF0YVtrZXldXHJcblxyXG4gICMgcmV0dXJucyBuZXcgQ2xvdWRDb250ZW50IGNvbnRhaW5pbmcgZW52ZWxvcGVkIGRhdGFcclxuICBjcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgbmV3IENsb3VkQ29udGVudCBAZW52ZWxvcENvbnRlbnQgY29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgd2l0aCBtZXRhZGF0YSwgcmV0dXJucyBhbiBvYmplY3QuXHJcbiAgIyBJZiBjb250ZW50IHdhcyBhbHJlYWR5IGFuIG9iamVjdCAoT2JqZWN0IG9yIEpTT04pIHdpdGggbWV0YWRhdGEsXHJcbiAgIyBhbnkgZXhpc3RpbmcgbWV0YWRhdGEgd2lsbCBiZSByZXRhaW5lZC5cclxuICAjIE5vdGU6IGNhbGxpbmcgYGVudmVsb3BDb250ZW50YCBtYXkgYmUgc2FmZWx5IGNhbGxlZCBvbiBzb21ldGhpbmcgdGhhdFxyXG4gICMgaGFzIGFscmVhZHkgaGFkIGBlbnZlbG9wQ29udGVudGAgY2FsbGVkIG9uIGl0LCBhbmQgd2lsbCBiZSBhIG5vLW9wLlxyXG4gIGVudmVsb3BDb250ZW50OiAoY29udGVudCkgLT5cclxuICAgIGVudmVsb3BlZENsb3VkQ29udGVudCA9IEBfd3JhcElmTmVlZGVkIGNvbnRlbnRcclxuICAgIGZvciBrZXkgb2YgQGVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgZW52ZWxvcGVkQ2xvdWRDb250ZW50W2tleV0gPz0gQGVudmVsb3BlTWV0YWRhdGFba2V5XVxyXG4gICAgcmV0dXJuIGVudmVsb3BlZENsb3VkQ29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgaW4ge2NvbnRlbnQ6IGNvbnRlbnR9IGlmIG5lZWRlZCwgcmV0dXJucyBhbiBvYmplY3RcclxuICBfd3JhcElmTmVlZGVkOiAoY29udGVudCkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGNvbnRlbnRcclxuICAgICAgdHJ5IGNvbnRlbnQgPSBKU09OLnBhcnNlIGNvbnRlbnRcclxuICAgIGlmIGNvbnRlbnQuY29udGVudD9cclxuICAgICAgcmV0dXJuIGNvbnRlbnRcclxuICAgIGVsc2VcclxuICAgICAgcmV0dXJuIHtjb250ZW50fVxyXG5cclxuY2xhc3MgQ2xvdWRDb250ZW50XHJcbiAgY29uc3RydWN0b3I6IChAXyA9IHt9KSAtPlxyXG5cclxuICBnZXRDb250ZW50OiAtPiBAX1xyXG4gIGdldENvbnRlbnRBc0pTT046ICAtPiBKU09OLnN0cmluZ2lmeSBAX1xyXG5cclxuICBjbG9uZTogLT4gbmV3IENsb3VkQ29udGVudCBfLmNsb25lRGVlcCBAX1xyXG5cclxuICBzZXRUZXh0OiAodGV4dCkgLT4gQF8uY29udGVudCA9IHRleHRcclxuICBnZXRUZXh0OiAtPiBpZiBAXy5jb250ZW50IGlzIG51bGwgdGhlbiAnJyBlbHNlIGlmIGlzU3RyaW5nKEBfLmNvbnRlbnQpIHRoZW4gQF8uY29udGVudCBlbHNlIEpTT04uc3RyaW5naWZ5IEBfLmNvbnRlbnRcclxuXHJcbiAgYWRkTWV0YWRhdGE6IChtZXRhZGF0YSkgLT4gQF9ba2V5XSA9IG1ldGFkYXRhW2tleV0gZm9yIGtleSBvZiBtZXRhZGF0YVxyXG4gIGdldDogKHByb3ApIC0+IEBfW3Byb3BdXHJcblxyXG4gIGNvcHlNZXRhZGF0YVRvOiAodG8pIC0+XHJcbiAgICBtZXRhZGF0YSA9IHt9XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgQF9cclxuICAgICAgaWYga2V5IGlzbnQgJ2NvbnRlbnQnXHJcbiAgICAgICAgbWV0YWRhdGFba2V5XSA9IHZhbHVlXHJcbiAgICB0by5hZGRNZXRhZGF0YSBtZXRhZGF0YVxyXG5cclxuY2xhc3MgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAZGlzcGxheU5hbWUsIEBjYXBhYmlsaXRpZXN9ID0gb3B0aW9uc1xyXG5cclxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXHJcblxyXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XHJcbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgIGNhbGxiYWNrIHRydWVcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgbnVsbFxyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgZGVmYXVsdENvbXBvbmVudFxyXG5cclxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXHJcblxyXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcclxuXHJcbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdjbG9zZSdcclxuXHJcbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ29wZW5TYXZlZCdcclxuXHJcbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdnZXRPcGVuU2F2ZWRQYXJhbXMnXHJcblxyXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XHJcbiAgICBhbGVydCBcIiN7bWV0aG9kTmFtZX0gbm90IGltcGxlbWVudGVkIGZvciAje0BuYW1lfSBwcm92aWRlclwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlOiBDbG91ZEZpbGVcclxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXHJcbiAgQ2xvdWRDb250ZW50OiBDbG91ZENvbnRlbnRcclxuICBjbG91ZENvbnRlbnRGYWN0b3J5OiBuZXcgQ2xvdWRDb250ZW50RmFjdG9yeSgpXHJcbiAgUHJvdmlkZXJJbnRlcmZhY2U6IFByb3ZpZGVySW50ZXJmYWNlXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWRPbmx5UHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiBmYWxzZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxyXG4gICAgICAgIHJlbmFtZTogZmFsc2VcclxuICAgICAgICBjbG9zZTogZmFsc2VcclxuICAgIEB0cmVlID0gbnVsbFxyXG5cclxuICBATmFtZTogJ3JlYWRPbmx5J1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBzdWJUcmVlID0gQF9maW5kU3ViVHJlZSBtZXRhZGF0YVxyXG4gICAgICBpZiBzdWJUcmVlXHJcbiAgICAgICAgaWYgc3ViVHJlZVttZXRhZGF0YS5uYW1lXVxyXG4gICAgICAgICAgaWYgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBjYWxsYmFjayBudWxsLCBzdWJUcmVlW21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gbm90IGZvdW5kIGluIGZvbGRlclwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIGxpc3QgPSBbXVxyXG4gICAgICBzdWJUcmVlID0gQF9maW5kU3ViVHJlZSBtZXRhZGF0YVxyXG4gICAgICBpZiBzdWJUcmVlXHJcbiAgICAgICAgbGlzdC5wdXNoIGZpbGUubWV0YWRhdGEgZm9yIG93biBmaWxlbmFtZSwgZmlsZSBvZiBzdWJUcmVlXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgX2ZpbmRTdWJUcmVlOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW5cclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnBhcmVudFxyXG4gICAgICBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmNoaWxkcmVuXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHRyZWUgaXNudCBudWxsXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cclxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcclxuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcclxuICAgICAgJC5hamF4XHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXHJcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxyXG5cclxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhcmVudCA9IG51bGwpIC0+XHJcbiAgICB0cmVlID0ge31cclxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxyXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcGFyZW50OiBwYXJlbnRcclxuICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgIGNoaWxkcmVuOiBudWxsXHJcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW4gPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIG1ldGFkYXRhXHJcbiAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5cclxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdyZXZlcnRTdWJNZW51JywgJ3NlcGFyYXRvcicsICdzYXZlJywgJ3NhdmVDb3B5RGlhbG9nJywgJ3NoYXJlU3ViTWVudScsICdkb3dubG9hZERpYWxvZycsICdyZW5hbWVEaWFsb2cnXVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMsIGNsaWVudCkgLT5cclxuICAgIEBpdGVtcyA9IEBwYXJzZU1lbnVJdGVtcyBvcHRpb25zLm1lbnUsIGNsaWVudFxyXG4gICAgY29uc29sZS5kaXIgQGl0ZW1zXHJcblxyXG4gIHBhcnNlTWVudUl0ZW1zOiAobWVudUl0ZW1zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cclxuICAgICAgc3dpdGNoIGFjdGlvblxyXG4gICAgICAgIHdoZW4gJ3JldmVydFN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiAoY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/KSBvciBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cclxuICAgICAgICB3aGVuICdyZXZlcnRUb0xhc3RPcGVuZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdzaGFyZUdldExpbmsnLCAnc2hhcmVTdWJNZW51J1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9TaGFyZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRydWVcclxuXHJcbiAgICBnZXRJdGVtcyA9IChzdWJNZW51SXRlbXMpID0+XHJcbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xyXG4gICAgICAgIEBwYXJzZU1lbnVJdGVtcyBzdWJNZW51SXRlbXMsIGNsaWVudFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiXHJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXHJcbiAgICAgIHNoYXJlR2V0TGluazogdHIgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiXHJcbiAgICAgIHNoYXJlVXBkYXRlOiB0ciBcIn5NRU5VLlNIQVJFX1VQREFURVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IHRyIFwifk1FTlUuUkVWRVJUX1RPXCJcclxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcclxuXHJcbiAgICBzdWJNZW51cyA9XHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cclxuICAgICAgc2hhcmVTdWJNZW51OiBbJ3NoYXJlR2V0TGluaycsICdzaGFyZVVwZGF0ZSddXHJcblxyXG4gICAgaXRlbXMgPSBbXVxyXG4gICAgZm9yIGl0ZW0sIGkgaW4gbWVudUl0ZW1zXHJcbiAgICAgIGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBtZW51SXRlbSA9XHJcbiAgICAgICAgICBrZXk6IFwic2VwZXJhdG9yI3tpfVwiXHJcbiAgICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbWVudUl0ZW0gPVxyXG4gICAgICAgICAga2V5OiBpdGVtXHJcbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgICAgZW5hYmxlZDogc2V0RW5hYmxlZCBpdGVtXHJcbiAgICAgICAgICBpdGVtczogZ2V0SXRlbXMgc3ViTWVudXNbaXRlbV1cclxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG1lbnVJdGVtID0gaXRlbVxyXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5rZXkgPSBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcclxuICAgICAgICBtZW51SXRlbS5pdGVtcyA9IGl0ZW0uaXRlbXMgb3IgZ2V0SXRlbXMgaXRlbS5uYW1lXHJcbiAgICAgIGl0ZW1zLnB1c2ggbWVudUl0ZW1cclxuICAgIGl0ZW1zXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdwcmVwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncmVwbGFjZU1lbnVJdGVtJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQWZ0ZXInLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2V0TWVudUJhckluZm8nLCBpbmZvXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVDb3B5JywgKHRyICd+RElBTE9HLlNBVkVfQ09QWScpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dEb3dubG9hZERpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dSZW5hbWVEaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIHNoYXJlVXJsRGlhbG9nOiAodXJsKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93U2hhcmVVcmxEaWFsb2cnLFxyXG4gICAgICB1cmw6IHVybFxyXG5cclxuICBibG9ja2luZ01vZGFsOiAobW9kYWxQcm9wcykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd0Jsb2NraW5nTW9kYWwnLCBtb2RhbFByb3BzXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT5cclxuICByZXQgPSBudWxsXHJcbiAgbG9jYXRpb24uaGFzaC5zdWJzdHIoMSkuc3BsaXQoXCImXCIpLnNvbWUgKHBhaXIpIC0+XHJcbiAgICBwYWlyLnNwbGl0KFwiPVwiKVswXSBpcyBwYXJhbSBhbmQgKHJldCA9IHBhaXIuc3BsaXQoXCI9XCIpWzFdKVxyXG4gIHJldFxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiOiBcIlVudGl0bGVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxyXG4gIFwifk1FTlUuT1BFTlwiOiBcIk9wZW4gLi4uXCJcclxuICBcIn5NRU5VLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+TUVOVS5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxyXG4gIFwifk1FTlUuU0hBUkVcIjogXCJTaGFyZS4uLlwiXHJcbiAgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiOiBcIkdldCBsaW5rIHRvIHNoYXJlZCB2aWV3XCJcclxuICBcIn5NRU5VLlNIQVJFX1VQREFURVwiOiBcIlVwZGF0ZSBzaGFyZWQgdmlld1wiXHJcbiAgXCJ+TUVOVS5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9cIjogXCJSZXZlcnQgdG8uLi5cIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCI6IFwiUmVjZW50bHkgb3BlbmVkIHN0YXRlXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIlNoYXJlZCB2aWV3XCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5ESUFMT0cuU0hBUkVEXCI6IFwiU2hhcmVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxyXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXHJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcclxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcclxuICBcIn5QUk9WSURFUi5MT0NBTF9GSUxFXCI6IFwiTG9jYWwgRmlsZVwiXHJcblxyXG4gIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCI6IFwiRmlsZW5hbWVcIlxyXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSAle2ZpbGVuYW1lfT9cIlxyXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcclxuXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5SRU5BTUVfRElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWVwiOiBcIkNvcHlcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5WSUVXXCI6IFwiVmlld1wiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNMT1NFXCI6IFwiQ2xvc2VcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIjogXCJUaGUgc2hhcmUgdXJsIGhhcyBiZWVuIGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlfRVJST1JcIjogXCJTb3JyeSwgdGhlIHNoYXJlIHVybCB3YXMgbm90IGFibGUgdG8gYmUgY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuXCJcclxuXHJcbiAgXCJ+Q09ORklSTS5PUEVOX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgb3BlbiBhIG5ldyBmaWxlP1wiXHJcbiAgXCJ+Q09ORklSTS5ORVdfRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBhIG5ldyBmaWxlP1wiXHJcbiAgXCJ+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgcmV2ZXJ0IHRoZSBmaWxlIHRvIGl0cyBtb3N0IHJlY2VudGx5IG9wZW5lZCBzdGF0ZT9cIlxyXG4gIFwifkNPTkZJUk0uUkVWRVJUX1RPX1NIQVJFRF9WSUVXXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJldmVydCB0aGUgZmlsZSB0byBjdXJyZW50bHkgc2hhcmVkIHZpZXc/XCJcclxuXHJcbiAgXCJ+TE9DQUxfRklMRV9ESUFMT0cuRFJPUF9GSUxFX0hFUkVcIjogXCJEcm9wIGZpbGUgaGVyZSBvciBjbGljayBoZXJlIHRvIHNlbGVjdCBmaWxlLlwiXHJcbiAgXCJ+TE9DQUxfRklMRV9ESUFMT0cuTVVMVElQTEVfRklMRVNfU0VMRUNURURcIjogXCJTb3JyeSwgeW91IGNhbiBjaG9vc2Ugb25seSBvbmUgZmlsZSB0byBvcGVuLlwiXHJcbiAgXCJ+TE9DQUxfRklMRV9ESUFMT0cuTVVMVElQTEVfRklMRVNfRFJPUFBFRFwiOiBcIlNvcnJ5LCB5b3UgY2FuJ3QgZHJvcCBtb3JlIHRoYW4gb25lIGZpbGUuXCJcclxuIiwidHJhbnNsYXRpb25zID0gIHt9XHJcbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcclxuZGVmYXVsdExhbmcgPSAnZW4nXHJcbnZhclJlZ0V4cCA9IC8lXFx7XFxzKihbXn1cXHNdKilcXHMqXFx9L2dcclxuXHJcbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XHJcbiAgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnNbbGFuZ10/W2tleV0gb3Iga2V5XHJcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxyXG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcclxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xyXG5Qcm92aWRlclRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcnXHJcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xyXG5SZW5hbWVEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcmVuYW1lLWRpYWxvZy12aWV3J1xyXG5TaGFyZVVybERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zaGFyZS11cmwtZGlhbG9nLXZpZXcnXHJcbkJsb2NraW5nTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vYmxvY2tpbmctbW9kYWwtdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbntkaXYsIGlmcmFtZX0gPSBSZWFjdC5ET01cclxuXHJcbklubmVyQXBwID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcclxuXHJcbiAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiAobmV4dFByb3BzKSAtPlxyXG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcclxuICAgICAgKGlmcmFtZSB7c3JjOiBAcHJvcHMuYXBwfSlcclxuICAgIClcclxuXHJcbkFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcclxuXHJcbiAgZ2V0RmlsZW5hbWU6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eShcIm5hbWVcIikgYW5kIG1ldGFkYXRhLm5hbWU/Lmxlbmd0aCA+IDAgdGhlbiBtZXRhZGF0YS5uYW1lIGVsc2UgbnVsbFxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcclxuICAgIHByb3ZpZGVyOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcbiAgICBkaXJ0eTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBmaWxlU3RhdHVzID0gaWYgZXZlbnQuc3RhdGUuc2F2aW5nXHJcbiAgICAgICAge21lc3NhZ2U6IFwiU2F2aW5nLi4uXCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxyXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUgZXZlbnQuc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBwcm92aWRlcjogZXZlbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXHJcbiAgICAgICAgZmlsZVN0YXR1czogZmlsZVN0YXR1c1xyXG5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG5cclxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Rvd25sb2FkRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1JlbmFtZURpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSByZW5hbWVEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93U2hhcmVVcmxEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgc2hhcmVVcmxEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93QmxvY2tpbmdNb2RhbCdcclxuICAgICAgICAgIEBzZXRTdGF0ZSBibG9ja2luZ01vZGFsUHJvcHM6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdhcHBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAncHJlcGVuZE1lbnVJdGVtJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy51bnNoaWZ0IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdyZXBsYWNlTWVudUl0ZW0nXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zW2luZGV4XSA9IGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBpZiBpbmRleCBpcyAwXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy51bnNoaWZ0IGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXgsIDAsIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnaW5zZXJ0TWVudUl0ZW1BZnRlcidcclxuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XHJcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXHJcbiAgICAgICAgICAgIGlmIGluZGV4IGlzIEBzdGF0ZS5tZW51SXRlbXMubGVuZ3RoIC0gMVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMuc3BsaWNlIGluZGV4ICsgMSwgMCwgZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdzZXRNZW51QmFySW5mbydcclxuICAgICAgICAgIEBzdGF0ZS5tZW51T3B0aW9ucy5pbmZvID0gZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcclxuXHJcbiAgX2dldE1lbnVJdGVtSW5kZXg6IChrZXkpIC0+XHJcbiAgICBpZiBpc1N0cmluZyBrZXlcclxuICAgICAgZm9yIGl0ZW0sIGluZGV4IGluIEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICByZXR1cm4gaW5kZXggaWYgaXRlbS5rZXkgaXMga2V5XHJcbiAgICAgIC0xXHJcbiAgICBlbHNlXHJcbiAgICAgIGluZGV4ID0gcGFyc2VJbnQga2V5LCAxMFxyXG4gICAgICBpZiBpc05hTihpbmRleCkgb3IgaW5kZXggPCAwIG9yIGluZGV4ID4gQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXHJcbiAgICAgICAgLTFcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGluZGV4XHJcblxyXG4gIGNsb3NlRGlhbG9nczogLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBwcm92aWRlckRpYWxvZzogbnVsbFxyXG4gICAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgICAgc2hhcmVVcmxEaWFsb2c6IG51bGxcclxuXHJcbiAgcmVuZGVyRGlhbG9nczogLT5cclxuICAgIGlmIEBzdGF0ZS5ibG9ja2luZ01vZGFsUHJvcHNcclxuICAgICAgKEJsb2NraW5nTW9kYWwgQHN0YXRlLmJsb2NraW5nTW9kYWxQcm9wcylcclxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgIChQcm92aWRlclRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5wcm92aWRlckRpYWxvZywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBtaW1lVHlwZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLm1pbWVUeXBlLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucmVuYW1lRGlhbG9nXHJcbiAgICAgIChSZW5hbWVEaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUucmVuYW1lRGlhbG9nLmZpbGVuYW1lLCBjYWxsYmFjazogQHN0YXRlLnJlbmFtZURpYWxvZy5jYWxsYmFjaywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuc2hhcmVVcmxEaWFsb2dcclxuICAgICAgKFNoYXJlVXJsRGlhbG9nIHt1cmw6IEBzdGF0ZS5zaGFyZVVybERpYWxvZy51cmwsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIChNZW51QmFyIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcclxuICAgICAgICAoSW5uZXJBcHAge2FwcDogQHByb3BzLmFwcH0pXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZyBvciBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXBwXHJcbiIsIkF1dGhvcml6ZU1peGluID1cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBhdXRob3JpemVkOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcclxuICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxyXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xyXG57ZGl2LCBpfSA9IFJlYWN0LkRPTVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Jsb2NraW5nTW9kYWwnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sXHJcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy1ibG9ja2luZy1tZXNzYWdlJ30sIEBwcm9wcy5tZXNzYWdlKVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEb3dubG9hZERpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gXCIje0Bwcm9wcy5maWxlbmFtZSBvciAodHIgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiKX0uanNvblwiXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICBkb3dubG9hZDogKGUpIC0+XHJcbiAgICBpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgZS50YXJnZXQuc2V0QXR0cmlidXRlICdocmVmJywgXCJkYXRhOmFwcGxpY2F0aW9uL2pzb24sI3tlbmNvZGVVUklDb21wb25lbnQoQHByb3BzLmNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpKX1cIlxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb3dubG9hZC1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChhIHtocmVmOiAnIycsIGNsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBkb3dubG9hZDogQHN0YXRlLnRyaW1tZWRGaWxlbmFtZSwgb25DbGljazogQGRvd25sb2FkfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQUQnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpLCBzdmcsIGcsIHJlY3R9ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93bkl0ZW0gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd25JdGVtJ1xyXG5cclxuICBjbGlja2VkOiAtPlxyXG4gICAgQHByb3BzLnNlbGVjdCBAcHJvcHMuaXRlbVxyXG5cclxuICBtb3VzZUVudGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLml0ZW0uaXRlbXNcclxuICAgICAgbWVudUl0ZW0gPSAkIFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLml0ZW1cclxuICAgICAgbWVudSA9IG1lbnVJdGVtLnBhcmVudCgpLnBhcmVudCgpXHJcblxyXG4gICAgICBAcHJvcHMuc2V0U3ViTWVudVxyXG4gICAgICAgIHN0eWxlOlxyXG4gICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZSdcclxuICAgICAgICAgIGxlZnQ6IG1lbnUud2lkdGgoKVxyXG4gICAgICAgICAgdG9wOiBtZW51SXRlbS5wb3NpdGlvbigpLnRvcCAtIHBhcnNlSW50KG1lbnVJdGVtLmNzcygncGFkZGluZy10b3AnKSlcclxuICAgICAgICBpdGVtczogQHByb3BzLml0ZW0uaXRlbXNcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLnNldFN1Yk1lbnU/IG51bGxcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xyXG4gICAgICBpZiB0eXBlb2YgQHByb3BzLml0ZW0uZW5hYmxlZCBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZCgpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkXHJcbiAgICBlbHNlXHJcbiAgICAgIHRydWVcclxuXHJcbiAgICBjbGFzc2VzID0gWydtZW51SXRlbSddXHJcbiAgICBpZiBAcHJvcHMuaXRlbS5zZXBhcmF0b3JcclxuICAgICAgY2xhc3Nlcy5wdXNoICdzZXBhcmF0b3InXHJcbiAgICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKX0sICcnKVxyXG4gICAgZWxzZVxyXG4gICAgICBjbGFzc2VzLnB1c2ggJ2Rpc2FibGVkJyBpZiBub3QgZW5hYmxlZCBvciBub3QgKEBwcm9wcy5pdGVtLmFjdGlvbiBvciBAcHJvcHMuaXRlbS5pdGVtcylcclxuICAgICAgbmFtZSA9IEBwcm9wcy5pdGVtLm5hbWUgb3IgQHByb3BzLml0ZW1cclxuICAgICAgKGxpIHtyZWY6ICdpdGVtJywgY2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKSwgb25DbGljazogQGNsaWNrZWQsIG9uTW91c2VFbnRlcjogQG1vdXNlRW50ZXIgfSxcclxuICAgICAgICBuYW1lXHJcbiAgICAgICAgaWYgQHByb3BzLml0ZW0uaXRlbXNcclxuICAgICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWluc3BlY3RvckFycm93LWNvbGxhcHNlJ30pXHJcbiAgICAgIClcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc2hvd2luZ01lbnU6IGZhbHNlXHJcbiAgICB0aW1lb3V0OiBudWxsXHJcbiAgICBzdWJNZW51OiBudWxsXHJcblxyXG4gIGJsdXI6IC0+XHJcbiAgICBAdW5ibHVyKClcclxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0ICggPT4gQHNldFN0YXRlIHtzaG93aW5nTWVudTogZmFsc2UsIHN1Yk1lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZXRTdWJNZW51OiAoc3ViTWVudSkgLT5cclxuICAgIEBzZXRTdGF0ZSBzdWJNZW51OiBzdWJNZW51XHJcblxyXG4gIHNlbGVjdDogKGl0ZW0pIC0+XHJcbiAgICByZXR1cm4gaWYgaXRlbT8uaXRlbXNcclxuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxyXG4gICAgQHNldFN0YXRlIHtzaG93aW5nTWVudTogbmV4dFN0YXRlfVxyXG4gICAgcmV0dXJuIHVubGVzcyBpdGVtXHJcbiAgICBpdGVtLmFjdGlvbj8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcclxuICAgIHNlbGVjdCA9IChpdGVtKSA9PlxyXG4gICAgICAoID0+IEBzZWxlY3QoaXRlbSkpXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYW5jaG9yJywgb25DbGljazogPT4gQHNlbGVjdChudWxsKX0sXHJcbiAgICAgICAgKHN2ZyB7dmVyc2lvbjogJzEuMScsIHdpZHRoOiAxNiwgaGVpZ2h0OiAxNiwgdmlld0JveDogJzAgMCAxNiAxNicsIGVuYWJsZUJhY2tncm91bmQ6ICduZXcgMCAwIDE2IDE2J30sXHJcbiAgICAgICAgICAoZyB7fSxcclxuICAgICAgICAgICAgKHJlY3Qge3k6IDIsIHdpZHRoOiAxNiwgaGVpZ2h0OiAyfSlcclxuICAgICAgICAgICAgKHJlY3Qge3k6IDcsIHdpZHRoOiAxNiwgaGVpZ2h0OiAyfSlcclxuICAgICAgICAgICAgKHJlY3Qge3k6IDEyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICAgIGlmIEBwcm9wcy5pdGVtcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBvbk1vdXNlTGVhdmU6IEBibHVyLCBvbk1vdXNlRW50ZXI6IEB1bmJsdXJ9LFxyXG4gICAgICAgICAgKHVsIHt9LFxyXG4gICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGluZGV4LCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3QsIHNldFN1Yk1lbnU6IEBzZXRTdWJNZW51fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBwcm9wcy5pdGVtc1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgaWYgQHN0YXRlLnN1Yk1lbnVcclxuICAgICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIHN0eWxlOiBAc3RhdGUuc3ViTWVudS5zdHlsZX0sXHJcbiAgICAgICAgICAgICAgKHVsIHt9LFxyXG4gICAgICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBzdGF0ZS5zdWJNZW51Lml0ZW1zXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sXHJcbiAgICAgIChSZWFjdC5ET00uaSB7Y2xhc3NOYW1lOiBpZiBAcHJvcHMubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlciB0aGVuICdpY29uLWluc3BlY3RvckFycm93LWNvbGxhcHNlJyBlbHNlICdpY29uLW5vdGVUb29sJ30pXHJcbiAgICAgIEBwcm9wcy5tZXRhZGF0YS5uYW1lXHJcbiAgICApXHJcblxyXG5GaWxlTGlzdCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkaW5nOiB0cnVlXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGxvYWQgQHByb3BzLmZvbGRlclxyXG5cclxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxyXG4gICAgaWYgbmV4dFByb3BzLmZvbGRlciBpc250IEBwcm9wcy5mb2xkZXJcclxuICAgICAgQGxvYWQgbmV4dFByb3BzLmZvbGRlclxyXG5cclxuICBsb2FkOiAoZm9sZGVyKSAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmxpc3QgZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxyXG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxyXG5cclxuICBwYXJlbnRTZWxlY3RlZDogKGUpIC0+XHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5mb2xkZXI/LnBhcmVudFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgIGlmIEBwcm9wcy5mb2xkZXIgaXNudCBudWxsXHJcbiAgICAgIGxpc3QucHVzaCAoZGl2IHtrZXk6ICdwYXJlbnQnLCBvbkNsaWNrOiBAcGFyZW50U2VsZWN0ZWR9LCAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogJ2ljb24tcGFsZXR0ZUFycm93LWNvbGxhcHNlJ30pLCAnUGFyZW50IEZvbGRlcicpXHJcbiAgICBmb3IgbWV0YWRhdGEsIGkgaW4gQHByb3BzLmxpc3RcclxuICAgICAgbGlzdC5wdXNoIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZmlsZWxpc3QnfSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcclxuICAgICAgICB0ciBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGxpc3RcclxuICAgIClcclxuXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZURpYWxvZ1RhYidcclxuXHJcbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIEBnZXRTdGF0ZUZvckZvbGRlciBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAaXNPcGVuID0gQHByb3BzLmRpYWxvZy5hY3Rpb24gaXMgJ29wZW5GaWxlJ1xyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxyXG4gICAgbWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgbGlzdDogbGlzdFxyXG4gICAgICBtZXRhZGF0YTogQGZpbmRNZXRhZGF0YSAkLnRyaW0oQHN0YXRlLmZpbGVuYW1lKSwgbGlzdFxyXG5cclxuICBnZXRTdGF0ZUZvckZvbGRlcjogKGZvbGRlcikgLT5cclxuICAgIGZvbGRlcjogZm9sZGVyXHJcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcclxuICAgIGxpc3Q6IFtdXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgQHNldFN0YXRlIEBnZXRTdGF0ZUZvckZvbGRlciBtZXRhZGF0YVxyXG4gICAgZWxzZSBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNldFN0YXRlIEBnZXRTdGF0ZUZvckZvbGRlciBudWxsXHJcblxyXG4gIGNvbmZpcm06IC0+XHJcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGZpbGVuYW1lID0gJC50cmltIEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxyXG4gICAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgaWYgQGlzT3BlblxyXG4gICAgICAgICAgYWxlcnQgXCIje0BzdGF0ZS5maWxlbmFtZX0gbm90IGZvdW5kXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcGFyZW50OiBAc3RhdGUuZm9sZGVyIG9yIG51bGxcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICMgZW5zdXJlIHRoZSBtZXRhZGF0YSBwcm92aWRlciBpcyB0aGUgY3VycmVudGx5LXNob3dpbmcgdGFiXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrPyBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgcmVtb3ZlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhIGFuZCBAc3RhdGUubWV0YWRhdGEudHlwZSBpc250IENsb3VkTWV0YWRhdGEuRm9sZGVyIGFuZCBjb25maXJtKHRyKFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCIsIHtmaWxlbmFtZTogQHN0YXRlLm1ldGFkYXRhLm5hbWV9KSlcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgaWYgbm90IGVyclxyXG4gICAgICAgICAgbGlzdCA9IEBzdGF0ZS5saXN0LnNsaWNlIDBcclxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgbGlzdC5zcGxpY2UgaW5kZXgsIDFcclxuICAgICAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgICAgICBsaXN0OiBsaXN0XHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnJ1xyXG5cclxuICBjYW5jZWw6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICBmaW5kTWV0YWRhdGE6IChmaWxlbmFtZSwgbGlzdCkgLT5cclxuICAgIGZvciBtZXRhZGF0YSBpbiBsaXN0XHJcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcclxuICAgICAgICByZXR1cm4gbWV0YWRhdGFcclxuICAgIG51bGxcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTMgYW5kIG5vdCBAY29uZmlybURpc2FibGVkKClcclxuICAgICAgQGNvbmZpcm0oKVxyXG5cclxuICBjb25maXJtRGlzYWJsZWQ6IC0+XHJcbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcclxuXHJcbiAgcmVuZGVyV2hlbkF1dGhvcml6ZWQ6IC0+XHJcbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcclxuICAgIHJlbW92ZURpc2FibGVkID0gKEBzdGF0ZS5tZXRhZGF0YSBpcyBudWxsKSBvciAoQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIpXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXHJcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgIChGaWxlTGlzdCB7cHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlciwgZm9sZGVyOiBAc3RhdGUuZm9sZGVyLCBzZWxlY3RlZEZpbGU6IEBzdGF0ZS5tZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAY29uZmlybSwgbGlzdDogQHN0YXRlLmxpc3QsIGxpc3RMb2FkZWQ6IEBsaXN0TG9hZGVkfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogY29uZmlybURpc2FibGVkLCBjbGFzc05hbWU6IGlmIGNvbmZpcm1EaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlci5jYW4gJ3JlbW92ZSdcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNhbmNlbH0sICh0ciBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIikpXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZURpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCBpbnB1dH0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Ryb3Bkb3duLXZpZXcnXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01lbnVCYXInXHJcblxyXG4gIGdldEZpbGVuYW1lOiAocHJvcHMpIC0+XHJcbiAgICBpZiBwcm9wcy5maWxlbmFtZT8ubGVuZ3RoID4gMCB0aGVuIHByb3BzLmZpbGVuYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0RWRpdGFibGVGaWxlbmFtZTogKHByb3BzKSAtPlxyXG4gICAgaWYgcHJvcHMuZmlsZW5hbWU/Lmxlbmd0aCA+IDAgdGhlbiBwcm9wcy5maWxlbmFtZSBlbHNlIFwiXCJcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcbiAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUgQHByb3BzXHJcbiAgICAgIGVkaXRhYmxlRmlsZW5hbWU6IEBnZXRFZGl0YWJsZUZpbGVuYW1lIEBwcm9wc1xyXG5cclxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUgbmV4dFByb3BzXHJcbiAgICAgIGVkaXRhYmxlRmlsZW5hbWU6IEBnZXRFZGl0YWJsZUZpbGVuYW1lIG5leHRQcm9wc1xyXG4gICAgICBwcm92aWRlcjogbmV4dFByb3BzLnByb3ZpZGVyXHJcblxyXG4gIGZpbGVuYW1lQ2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IHRydWVcclxuICAgIHNldFRpbWVvdXQgKD0+IEBmb2N1c0ZpbGVuYW1lKCkpLCAxMFxyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZWRpdGFibGVGaWxlbmFtZTogQGZpbGVuYW1lKCkudmFsdWVcclxuXHJcbiAgZmlsZW5hbWVCbHVycmVkOiAtPlxyXG4gICAgQHJlbmFtZSgpXHJcblxyXG4gIGZpbGVuYW1lOiAtPlxyXG4gICAgUmVhY3QuZmluZERPTU5vZGUoQHJlZnMuZmlsZW5hbWUpXHJcblxyXG4gIGZvY3VzRmlsZW5hbWU6IC0+XHJcbiAgICBlbCA9IEBmaWxlbmFtZSgpXHJcbiAgICBlbC5mb2N1cygpXHJcbiAgICBpZiB0eXBlb2YgZWwuc2VsZWN0aW9uU3RhcnQgaXMgJ251bWJlcidcclxuICAgICAgZWwuc2VsZWN0aW9uU3RhcnQgPSBlbC5zZWxlY3Rpb25FbmQgPSBlbC52YWx1ZS5sZW5ndGhcclxuICAgIGVsc2UgaWYgdHlwZW9mIGVsLmNyZWF0ZVRleHRSYW5nZSBpc250ICd1bmRlZmluZWQnXHJcbiAgICAgIHJhbmdlID0gZWwuY3JlYXRlVGV4dFJhbmdlKClcclxuICAgICAgcmFuZ2UuY29sbGFwc2UgZmFsc2VcclxuICAgICAgcmFuZ2Uuc2VsZWN0KClcclxuXHJcbiAgcmVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAc3RhdGUuZWRpdGFibGVGaWxlbmFtZS5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcbiAgICBpZiBmaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jbGllbnQucmVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEsIGZpbGVuYW1lXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgICBlZGl0YWJsZUZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2V0U3RhdGUgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxM1xyXG4gICAgICBAcmVuYW1lKClcclxuICAgIGVsc2UgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcblxyXG4gIGhlbHA6IC0+XHJcbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1sZWZ0J30sXHJcbiAgICAgICAgKERyb3Bkb3duIHtpdGVtczogQHByb3BzLml0ZW1zfSlcclxuICAgICAgICBpZiBAc3RhdGUuZWRpdGluZ0ZpbGVuYW1lXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnfSxcclxuICAgICAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZWRpdGFibGVGaWxlbmFtZSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uQmx1cjogQGZpbGVuYW1lQmx1cnJlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJywgb25DbGljazogQGZpbGVuYW1lQ2xpY2tlZH0sIEBzdGF0ZS5maWxlbmFtZSlcclxuICAgICAgICBpZiBAcHJvcHMuZmlsZVN0YXR1c1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogXCJtZW51LWJhci1maWxlLXN0YXR1cy0je0Bwcm9wcy5maWxlU3RhdHVzLnR5cGV9XCJ9LCBAcHJvcHMuZmlsZVN0YXR1cy5tZXNzYWdlKVxyXG4gICAgICApXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLXJpZ2h0J30sXHJcbiAgICAgICAgaWYgQHByb3BzLm9wdGlvbnMuaW5mb1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXI/LmF1dGhvcml6ZWQoKVxyXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmhlbHBcclxuICAgICAgICAgIChpIHtzdHlsZToge2ZvbnRTaXplOiBcIjEzcHhcIn0sIGNsYXNzTmFtZTogJ2NsaWNrYWJsZSBpY29uLWhlbHAnLCBvbkNsaWNrOiBAaGVscH0pXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcclxuXHJcbiAgY2xvc2U6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxyXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcclxuXHJcbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgKVxyXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXHJcbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGVDb3B5JywgJ3NhdmVGaWxlQ29weScgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZUFzJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBmaWx0ZXJlZFRhYkNvbXBvbmVudCA9IHByb3ZpZGVyLmZpbHRlclRhYkNvbXBvbmVudCBjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRcclxuICAgICAgICBjb21wb25lbnQgPSBmaWx0ZXJlZFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyLm5hbWUgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/Lm5hbWVcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSB0YWJzLmxlbmd0aCAtIDFcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdSZW5hbWVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgcmVuYW1lOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2FsbGJhY2s/IEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlJFTkFNRScpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcclxuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdTaGFyZVVybERpYWxvZ1ZpZXcnXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgUmVhY3QuZmluZERPTU5vZGUoQHJlZnMudXJsKT8uc2VsZWN0KClcclxuXHJcbiAgdmlldzogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy51cmxcclxuXHJcbiAgIyBhZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL3N1ZG9kb2tpL2NvcHktdG8tY2xpcGJvYXJkL2Jsb2IvbWFzdGVyL2luZGV4LmpzXHJcbiAgY29weTogLT5cclxuICAgIGNvcGllZCA9IHRydWVcclxuICAgIHRyeVxyXG4gICAgICBtYXJrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnbWFyaydcclxuICAgICAgbWFyay5pbm5lckhUTUwgPSBAcHJvcHMudXJsXHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQgbWFya1xyXG5cclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKClcclxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXHJcblxyXG4gICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcclxuICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZSBtYXJrXHJcbiAgICAgIHNlbGVjdGlvbi5hZGRSYW5nZSByYW5nZVxyXG5cclxuICAgICAgY29waWVkID0gZG9jdW1lbnQuZXhlY0NvbW1hbmQgJ2NvcHknXHJcbiAgICBjYXRjaFxyXG4gICAgICB0cnlcclxuICAgICAgICB3aW5kb3cuY2xpcGJvYXJkRGF0YS5zZXREYXRhICd0ZXh0JywgQHByb3BzLnVybFxyXG4gICAgICBjYXRjaFxyXG4gICAgICAgIGNvcGllZCA9IGZhbHNlXHJcbiAgICBmaW5hbGx5XHJcbiAgICAgIGlmIHNlbGVjdGlvblxyXG4gICAgICAgIGlmIHR5cGVvZiBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZVJhbmdlIHJhbmdlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXHJcbiAgICAgIGlmIG1hcmtcclxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkIG1hcmtcclxuICAgICAgYWxlcnQgdHIgKGlmIGNvcGllZCB0aGVuIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIiBlbHNlIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCIpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5TSEFSRUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ3NoYXJlLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAndXJsJywgdmFsdWU6IEBwcm9wcy51cmwsIHJlYWRPbmx5OiB0cnVlfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICBpZiBkb2N1bWVudC5leGVjQ29tbWFuZCBvciB3aW5kb3cuY2xpcGJvYXJkRGF0YVxyXG4gICAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29weX0sIHRyICd+U0hBUkVfRElBTE9HLkNPUFknKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHZpZXd9LCB0ciAnflNIQVJFX0RJQUxPRy5WSUVXJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+U0hBUkVfRElBTE9HLkNMT1NFJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHtrZXk6IGluZGV4fSwgQHJlbmRlclRhYih0YWIsIGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcclxuICAgIClcclxuXHJcbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXHJcbiAgICAgIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzXHJcbiAgICAgICAgKGRpdiB7XHJcbiAgICAgICAgICBrZXk6IGluZGV4XHJcbiAgICAgICAgICBzdHlsZTpcclxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGFiLmNvbXBvbmVudFxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxyXG4gICAgICBAcmVuZGVyVGFicygpXHJcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcclxuICAgIClcclxuIl19
