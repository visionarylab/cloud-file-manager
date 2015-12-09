(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu, getQueryParam;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

getQueryParam = require('./utils/get-query-param');

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
    var openSavedParams, openSharedContentId;
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    this.client.listen(eventCallback);
    this.client.connect();
    openSharedContentId = getQueryParam("openShared");
    openSavedParams = getQueryParam("openSaved");
    if (openSharedContentId) {
      return this.client.openSharedContent(openSharedContentId);
    } else if (openSavedParams) {
      return this.client.openSaved(openSavedParams);
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



},{"./client":31,"./ui":37,"./utils/get-query-param":38,"./views/app-view":42}],2:[function(require,module,exports){
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
var CloudContent, CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, DocumentStoreProvider, GoogleDriveProvider, LocalStorageProvider, ReadOnlyProvider, cloudContentFactory, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUI = (require('./ui')).CloudFileManagerUI;

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

cloudContentFactory = (require('./providers/provider-interface')).cloudContentFactory;

CloudContent = (require('./providers/provider-interface')).CloudContent;

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
    var Provider, allProviders, availableProviders, i, j, k, len, len1, len2, provider, providerName, providerOptions, ref, ref1, ref2, ref3, ref4, ref5;
    this.appOptions = appOptions1 != null ? appOptions1 : {};
    allProviders = {};
    ref = [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider];
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
          });
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

  CloudFileManagerClient.prototype.openSaved = function(params) {
    var provider, providerName, providerParams, ref;
    ref = params.split(':'), providerName = ref[0], providerParams = ref[1];
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
              });
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
          });
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
            window.open(_this._getCurrentUrl("openSaved=" + metadata.provider.name + ":" + (encodeURIComponent(metadata.provider.getOpenSavedParams(metadata)))));
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
        return _this._ui.shareUrlDialog(_this._getCurrentUrl("openShared=" + sharedDocumentId));
      };
    })(this);
    sharedDocumentId = (ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0;
    if (sharedDocumentId) {
      return showShareDialog(sharedDocumentId);
    } else {
      return this.share(function(sharedDocumentId) {
        return showShareDialog(sharedDocumentId);
      });
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
        return _this._ui.downloadDialog((ref = _this.state.metadata) != null ? ref.name : void 0, _this.appOptions.mimeType, content, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.rename = function(metadata, newName, callback) {
    if (newName !== this.state.metadata.name) {
      return this.state.metadata.provider.rename(this.state.metadata, newName, (function(_this) {
        return function(err, metadata) {
          var ref;
          if (err) {
            return _this._error(err);
          }
          if ((ref = _this.state.currentContent) != null) {
            ref.addMetadata({
              docName: metadata.name
            });
          }
          _this._fileChanged('renamedFile', _this.state.currentContent, metadata);
          return typeof callback === "function" ? callback(newName) : void 0;
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype.renameDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this._ui.renameDialog(this.state.metadata.name, (function(_this) {
        return function(newName) {
          return _this.rename(_this.state.metadata, newName, callback);
        };
      })(this));
    } else {
      return typeof callback === "function" ? callback('No currently active file') : void 0;
    }
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

  CloudFileManagerClient.prototype._fileChanged = function(type, content, metadata, additionalState) {
    var key, state, value;
    if (additionalState == null) {
      additionalState = {};
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
    this._setState(state);
    return this._event(type, {
      content: content.getText()
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

  return CloudFileManagerClient;

})();

module.exports = {
  CloudFileManagerClientEvent: CloudFileManagerClientEvent,
  CloudFileManagerClient: CloudFileManagerClient
};



},{"./providers/document-store-provider":32,"./providers/google-drive-provider":33,"./providers/localstorage-provider":34,"./providers/provider-interface":35,"./providers/readonly-provider":36,"./ui":37,"./utils/is-string":39,"./utils/translate":41}],32:[function(require,module,exports){
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
    return div({}, this.state.docStoreAvailable ? button({
      onClick: this.authenticate
    }, 'Authorization Needed') : 'Trying to log into the Document Store...');
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
    var diff, error, opts;
    try {
      opts = typeof this.options.patchObjectHash === "function" ? {
        hash: this.options.patchObjectHash
      } : void 0;
      [obj1, obj2].map(function(content) {
        var key, results;
        results = [];
        for (key in content) {
          if (content[key] == null) {
            results.push(delete content[key]);
          } else {
            results.push(void 0);
          }
        }
        return results;
      });
      diff = jiff.diff(obj1, obj2, opts);
      return diff;
    } catch (error) {
      return null;
    }
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":39,"../utils/translate":41,"./provider-interface":35,"jiff":17}],33:[function(require,module,exports){
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
    return div({}, this.state.loadedGAPI ? button({
      onClick: this.authenticate
    }, 'Authorization Needed') : 'Waiting for the Google Client API to load...');
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



},{"../utils/is-string":39,"../utils/translate":41,"./provider-interface":35,"diff":11}],34:[function(require,module,exports){
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

  LocalStorageProvider.prototype.getOpenSavedParams = function(clientMetadata, savedMetadata) {
    return savedMetadata.name;
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



},{"../utils/translate":41,"./provider-interface":35}],35:[function(require,module,exports){
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



},{"../utils/is-string":39}],36:[function(require,module,exports){
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



},{"../utils/is-string":39,"../utils/translate":41,"./provider-interface":35}],37:[function(require,module,exports){
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
        case 'renameDialog':
          return function() {
            var ref, ref1;
            return (ref = client.state.metadata) != null ? (ref1 = ref.provider) != null ? ref1.can('rename') : void 0 : void 0;
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

  CloudFileManagerUI.prototype.downloadDialog = function(filename, mimeType, content, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showDownloadDialog', {
      filename: filename,
      mimeType: mimeType,
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



},{"./utils/is-string":39,"./utils/translate":41}],38:[function(require,module,exports){
module.exports = function(param) {
  var ret;
  ret = null;
  location.search.substr(1).split("&").some(function(pair) {
    return pair.split("=")[0] === param && (ret = pair.split("=")[1]);
  });
  return ret;
};



},{}],39:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],40:[function(require,module,exports){
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
  "~CONFIRM.REVERT_TO_SHARED_VIEW": "Are you sure you want revert the file to currently shared view?"
};



},{}],41:[function(require,module,exports){
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



},{"./lang/en-us":40}],42:[function(require,module,exports){
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
  getFilename: function() {
    var ref1, ref2;
    if (((ref1 = this.props.client.state.metadata) != null ? ref1.hasOwnProperty('name') : void 0) && ((ref2 = this.props.client.state.metadata.name) != null ? ref2.length : void 0) > 0) {
      return this.props.client.state.metadata.name;
    } else {
      return tr("~MENUBAR.UNTITLED_DOCUMENT");
    }
  },
  getProvider: function() {
    var ref1;
    return (ref1 = this.props.client.state.metadata) != null ? ref1.provider : void 0;
  },
  getInitialState: function() {
    var ref1, ref2;
    return {
      filename: this.getFilename(),
      provider: this.getProvider(),
      menuItems: ((ref1 = this.props.client._ui.menu) != null ? ref1.items : void 0) || [],
      menuOptions: ((ref2 = this.props.ui) != null ? ref2.menuBar : void 0) || {},
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
        var fileStatus, ref1;
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
          filename: _this.getFilename(),
          provider: _this.getProvider(),
          fileStatus: fileStatus
        });
        switch (event.type) {
          case 'connected':
            return _this.setState({
              menuItems: ((ref1 = _this.props.client._ui.menu) != null ? ref1.items : void 0) || []
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



},{"../utils/is-string":39,"../utils/translate":41,"./blocking-modal-view":44,"./download-dialog-view":45,"./menu-bar-view":48,"./provider-tabbed-dialog-view":52,"./rename-dialog-view":53,"./share-url-dialog-view":55}],43:[function(require,module,exports){
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



},{}],44:[function(require,module,exports){
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



},{"./modal-view":51}],45:[function(require,module,exports){
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'DownloadDialogView',
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
  download: function(e) {
    if (this.state.trimmedFilename.length > 0) {
      e.target.setAttribute('href', "data:" + this.props.mimeType + "," + (encodeURIComponent(this.props.content.getText())));
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



},{"../utils/translate":41,"./modal-dialog-view":49}],46:[function(require,module,exports){
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



},{}],47:[function(require,module,exports){
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



},{"../providers/provider-interface":35,"../utils/translate":41,"./authorize-mixin":43}],48:[function(require,module,exports){
var Dropdown, div, i, input, ref, span;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, input = ref.input;

Dropdown = React.createFactory(require('./dropdown-view'));

module.exports = React.createClass({
  displayName: 'MenuBar',
  getInitialState: function() {
    return {
      editingFilename: false,
      filename: this.props.filename
    };
  },
  componentWillReceiveProps: function(nextProps) {
    return this.setState({
      filename: nextProps.filename
    });
  },
  filenameClicked: function(e) {
    var now, ref1, ref2;
    e.preventDefault();
    e.stopPropagation();
    now = (new Date()).getTime();
    if (now - this.lastClick <= 250) {
      if ((ref1 = this.props.client.state.metadata) != null ? (ref2 = ref1.provider) != null ? ref2.can('rename') : void 0 : void 0) {
        this.setState({
          editingFilename: true
        });
        setTimeout(((function(_this) {
          return function() {
            return _this.focusFilename();
          };
        })(this)), 10);
      } else {
        this.props.client.saveFileDialog();
      }
    }
    return this.lastClick = now;
  },
  filenameChanged: function() {
    return this.setState({
      filename: this.filename().value
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
    filename = this.state.filename.replace(/^\s+|\s+$/, '');
    if (filename.length > 0) {
      this.props.client.rename(this.props.client.state.metadata, filename);
    }
    return this.setState({
      editingFilename: false
    });
  },
  watchForEnter: function(e) {
    if (e.keyCode === 13) {
      return this.rename();
    } else if (e.keyCode === 27) {
      return this.setState({
        filename: this.props.filename,
        editingFilename: false
      });
    }
  },
  help: function() {
    return window.open(this.props.options.help, '_blank');
  },
  render: function() {
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
      value: this.state.filename,
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
    }, this.props.options.info) : void 0, this.props.provider && this.props.provider.authorized() ? this.props.provider.renderUser() : void 0, this.props.options.help ? i({
      style: {
        fontSize: "13px"
      },
      className: 'clickable icon-help',
      onClick: this.help
    }) : void 0));
  }
});



},{"./dropdown-view":46}],49:[function(require,module,exports){
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



},{"./modal-view":51}],50:[function(require,module,exports){
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



},{"./modal-dialog-view":49,"./tabbed-panel-view":56}],51:[function(require,module,exports){
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



},{}],52:[function(require,module,exports){
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
    var TabComponent, capability, component, i, j, len, provider, ref, ref1, ref2, selectedTabIndex, tabs;
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
        component = TabComponent({
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
        if (provider === ((ref2 = this.props.client.state.metadata) != null ? ref2.provider : void 0)) {
          selectedTabIndex = i;
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



},{"../providers/provider-interface":35,"../utils/translate":41,"./file-dialog-tab-view":47,"./modal-tabbed-dialog-view":50,"./select-provider-dialog-tab-view":54,"./tabbed-panel-view":56}],53:[function(require,module,exports){
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



},{"../utils/translate":41,"./modal-dialog-view":49}],54:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],55:[function(require,module,exports){
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



},{"../utils/translate":41,"./modal-dialog-view":49}],56:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL2NsaWVudC5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3VpLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2dldC1xdWVyeS1wYXJhbS5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy9pcy1zdHJpbmcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvbGFuZy9lbi11cy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy90cmFuc2xhdGUuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvYXBwLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2Jsb2NraW5nLW1vZGFsLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZG93bmxvYWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZHJvcGRvd24tdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9maWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tZW51LWJhci12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9yZW5hbWUtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3Mvc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9zaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvdGFiYmVkLXBhbmVsLXZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBQTs7QUFBQSxPQUFBLEdBQVUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLGtCQUFSLENBQXBCOztBQUVWLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLE1BQVIsQ0FBRCxDQUFnQixDQUFDOztBQUMxQyxzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxVQUFSLENBQUQsQ0FBb0IsQ0FBQzs7QUFFOUMsYUFBQSxHQUFnQixPQUFBLENBQVEseUJBQVI7O0FBRVY7RUFF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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25YQSxJQUFBLDRNQUFBO0VBQUE7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxtQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG1CQUFSOztBQUVYLGtCQUFB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LEtBRlA7TUFHQSxRQUFBLEVBQVcsS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBSDNCO01BSUEsVUFBQSxFQUFZLElBQUMsQ0FBQSxXQUpiO0tBREQ7RUFEUSxDQVhYO0VBb0JBLFVBQUEsRUFBWSxTQUFBO0FBQ1YsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxnQkFBWjtLQUFKOztBQUNFO0FBQUE7V0FBQSxzREFBQTs7cUJBQUEsRUFBQSxDQUFHO1VBQUMsR0FBQSxFQUFLLEtBQU47U0FBSCxFQUFpQixJQUFDLENBQUEsU0FBRCxDQUFXLEdBQVgsRUFBZ0IsS0FBaEIsQ0FBakI7QUFBQTs7aUJBREY7RUFEUyxDQXBCWjtFQXlCQSxtQkFBQSxFQUFxQixTQUFBO0FBQ25CLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcseUJBQVo7S0FBSjs7QUFDQztBQUFBO1dBQUEsc0RBQUE7O3FCQUNHLEdBQUEsQ0FBSTtVQUNILEdBQUEsRUFBSyxLQURGO1VBRUgsS0FBQSxFQUNFO1lBQUEsT0FBQSxFQUFZLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFuQixHQUF5QyxPQUF6QyxHQUFzRCxNQUEvRDtXQUhDO1NBQUosRUFLQyxHQUFHLENBQUMsU0FMTDtBQURIOztpQkFERDtFQURrQixDQXpCckI7RUFxQ0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxjQUE3QjtLQUFKLEVBQ0MsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcblxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcblxuZ2V0UXVlcnlQYXJhbSA9IHJlcXVpcmUgJy4vdXRpbHMvZ2V0LXF1ZXJ5LXBhcmFtJ1xuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcblxuICAgIEBjbGllbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudCgpXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxuXG4gIGluaXQ6IChAYXBwT3B0aW9ucywgdXNpbmdJZnJhbWUgPSBmYWxzZSkgLT5cbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXG5cbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkLCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAaW5pdCBAYXBwT3B0aW9ucywgdHJ1ZVxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXG5cbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xuICAgIEBjbGllbnQuY29ubmVjdCgpXG5cbiAgICBvcGVuU2hhcmVkQ29udGVudElkID0gZ2V0UXVlcnlQYXJhbSBcIm9wZW5TaGFyZWRcIlxuICAgIG9wZW5TYXZlZFBhcmFtcyA9IGdldFF1ZXJ5UGFyYW0gXCJvcGVuU2F2ZWRcIlxuICAgIGlmIG9wZW5TaGFyZWRDb250ZW50SWRcbiAgICAgIEBjbGllbnQub3BlblNoYXJlZENvbnRlbnQgb3BlblNoYXJlZENvbnRlbnRJZFxuICAgIGVsc2UgaWYgb3BlblNhdmVkUGFyYW1zXG4gICAgICBAY2xpZW50Lm9wZW5TYXZlZCBvcGVuU2F2ZWRQYXJhbXNcblxuICBfY3JlYXRlSGlkZGVuQXBwOiAtPlxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcbiAgICBAX3JlbmRlckFwcCBhbmNob3JcblxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxuICAgIEBhcHBPcHRpb25zLmNsaWVudCA9IEBjbGllbnRcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlcigpXG4iLCIvLyBTZWU6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC93aWtpL0FQSVxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9ETVAoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW10sXG4gICAgICBjaGFuZ2UsXG4gICAgICBvcGVyYXRpb247XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgb3BlcmF0aW9uID0gMTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3BlcmF0aW9uID0gMDtcbiAgICB9XG5cbiAgICByZXQucHVzaChbb3BlcmF0aW9uLCBjaGFuZ2UudmFsdWVdKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9YTUwoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8aW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8ZGVsPicpO1xuICAgIH1cblxuICAgIHJldC5wdXNoKGVzY2FwZUhUTUwoY2hhbmdlLnZhbHVlKSk7XG5cbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPC9pbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzwvZGVsPicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHMpIHtcbiAgbGV0IG4gPSBzO1xuICBuID0gbi5yZXBsYWNlKC8mL2csICcmYW1wOycpO1xuICBuID0gbi5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuXG4gIHJldHVybiBuO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGlmZigpIHt9XG5cbkRpZmYucHJvdG90eXBlID0ge1xuICBkaWZmKG9sZFN0cmluZywgbmV3U3RyaW5nLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY2FsbGJhY2sgPSBvcHRpb25zLmNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gZG9uZSh2YWx1ZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKHVuZGVmaW5lZCwgdmFsdWUpOyB9LCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgc3ViY2xhc3NlcyB0byBtYXNzYWdlIHRoZSBpbnB1dCBwcmlvciB0byBydW5uaW5nXG4gICAgb2xkU3RyaW5nID0gdGhpcy5jYXN0SW5wdXQob2xkU3RyaW5nKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChuZXdTdHJpbmcpO1xuXG4gICAgb2xkU3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG9sZFN0cmluZykpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShuZXdTdHJpbmcpKTtcblxuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLCBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoO1xuICAgIGxldCBlZGl0TGVuZ3RoID0gMTtcbiAgICBsZXQgbWF4RWRpdExlbmd0aCA9IG5ld0xlbiArIG9sZExlbjtcbiAgICBsZXQgYmVzdFBhdGggPSBbeyBuZXdQb3M6IC0xLCBjb21wb25lbnRzOiBbXSB9XTtcblxuICAgIC8vIFNlZWQgZWRpdExlbmd0aCA9IDAsIGkuZS4gdGhlIGNvbnRlbnQgc3RhcnRzIHdpdGggdGhlIHNhbWUgdmFsdWVzXG4gICAgbGV0IG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuICAgIGlmIChiZXN0UGF0aFswXS5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgLy8gSWRlbnRpdHkgcGVyIHRoZSBlcXVhbGl0eSBhbmQgdG9rZW5pemVyXG4gICAgICByZXR1cm4gZG9uZShbe3ZhbHVlOiBuZXdTdHJpbmcuam9pbignJyksIGNvdW50OiBuZXdTdHJpbmcubGVuZ3RofV0pO1xuICAgIH1cblxuICAgIC8vIE1haW4gd29ya2VyIG1ldGhvZC4gY2hlY2tzIGFsbCBwZXJtdXRhdGlvbnMgb2YgYSBnaXZlbiBlZGl0IGxlbmd0aCBmb3IgYWNjZXB0YW5jZS5cbiAgICBmdW5jdGlvbiBleGVjRWRpdExlbmd0aCgpIHtcbiAgICAgIGZvciAobGV0IGRpYWdvbmFsUGF0aCA9IC0xICogZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoIDw9IGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCArPSAyKSB7XG4gICAgICAgIGxldCBiYXNlUGF0aDtcbiAgICAgICAgbGV0IGFkZFBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSxcbiAgICAgICAgICAgIHJlbW92ZVBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggKyAxXSxcbiAgICAgICAgICAgIG9sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgaWYgKGFkZFBhdGgpIHtcbiAgICAgICAgICAvLyBObyBvbmUgZWxzZSBpcyBnb2luZyB0byBhdHRlbXB0IHRvIHVzZSB0aGlzIHZhbHVlLCBjbGVhciBpdFxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MgKyAxIDwgbmV3TGVuLFxuICAgICAgICAgICAgY2FuUmVtb3ZlID0gcmVtb3ZlUGF0aCAmJiAwIDw9IG9sZFBvcyAmJiBvbGRQb3MgPCBvbGRMZW47XG4gICAgICAgIGlmICghY2FuQWRkICYmICFjYW5SZW1vdmUpIHtcbiAgICAgICAgICAvLyBJZiB0aGlzIHBhdGggaXMgYSB0ZXJtaW5hbCB0aGVuIHBydW5lXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgZGlhZ29uYWwgdGhhdCB3ZSB3YW50IHRvIGJyYW5jaCBmcm9tLiBXZSBzZWxlY3QgdGhlIHByaW9yXG4gICAgICAgIC8vIHBhdGggd2hvc2UgcG9zaXRpb24gaW4gdGhlIG5ldyBzdHJpbmcgaXMgdGhlIGZhcnRoZXN0IGZyb20gdGhlIG9yaWdpblxuICAgICAgICAvLyBhbmQgZG9lcyBub3QgcGFzcyB0aGUgYm91bmRzIG9mIHRoZSBkaWZmIGdyYXBoXG4gICAgICAgIGlmICghY2FuQWRkIHx8IChjYW5SZW1vdmUgJiYgYWRkUGF0aC5uZXdQb3MgPCByZW1vdmVQYXRoLm5ld1BvcykpIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGNsb25lUGF0aChyZW1vdmVQYXRoKTtcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGFkZFBhdGg7ICAgLy8gTm8gbmVlZCB0byBjbG9uZSwgd2UndmUgcHVsbGVkIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICBiYXNlUGF0aC5uZXdQb3MrKztcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdHJ1ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9sZFBvcyA9IHNlbGYuZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCk7XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBoaXQgdGhlIGVuZCBvZiBib3RoIHN0cmluZ3MsIHRoZW4gd2UgYXJlIGRvbmVcbiAgICAgICAgaWYgKGJhc2VQYXRoLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoYnVpbGRWYWx1ZXMoc2VsZiwgYmFzZVBhdGguY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHNlbGYudXNlTG9uZ2VzdFRva2VuKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRyYWNrIHRoaXMgcGF0aCBhcyBhIHBvdGVudGlhbCBjYW5kaWRhdGUgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSBiYXNlUGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlZGl0TGVuZ3RoKys7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybXMgdGhlIGxlbmd0aCBvZiBlZGl0IGl0ZXJhdGlvbi4gSXMgYSBiaXQgZnVnbHkgYXMgdGhpcyBoYXMgdG8gc3VwcG9ydCB0aGVcbiAgICAvLyBzeW5jIGFuZCBhc3luYyBtb2RlIHdoaWNoIGlzIG5ldmVyIGZ1bi4gTG9vcHMgb3ZlciBleGVjRWRpdExlbmd0aCB1bnRpbCBhIHZhbHVlXG4gICAgLy8gaXMgcHJvZHVjZWQuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAoZnVuY3Rpb24gZXhlYygpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBUaGlzIHNob3VsZCBub3QgaGFwcGVuLCBidXQgd2Ugd2FudCB0byBiZSBzYWZlLlxuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgaWYgKGVkaXRMZW5ndGggPiBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWV4ZWNFZGl0TGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIGV4ZWMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKGVkaXRMZW5ndGggPD0gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICBsZXQgcmV0ID0gZXhlY0VkaXRMZW5ndGgoKTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgcHVzaENvbXBvbmVudChjb21wb25lbnRzLCBhZGRlZCwgcmVtb3ZlZCkge1xuICAgIGxldCBsYXN0ID0gY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0ICYmIGxhc3QuYWRkZWQgPT09IGFkZGVkICYmIGxhc3QucmVtb3ZlZCA9PT0gcmVtb3ZlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBjbG9uZSBoZXJlIGFzIHRoZSBjb21wb25lbnQgY2xvbmUgb3BlcmF0aW9uIGlzIGp1c3RcbiAgICAgIC8vIGFzIHNoYWxsb3cgYXJyYXkgY2xvbmVcbiAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXSA9IHtjb3VudDogbGFzdC5jb3VudCArIDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzLnB1c2goe2NvdW50OiAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfSk7XG4gICAgfVxuICB9LFxuICBleHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsXG4gICAgICAgIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGgsXG4gICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgb2xkUG9zID0gbmV3UG9zIC0gZGlhZ29uYWxQYXRoLFxuXG4gICAgICAgIGNvbW1vbkNvdW50ID0gMDtcbiAgICB3aGlsZSAobmV3UG9zICsgMSA8IG5ld0xlbiAmJiBvbGRQb3MgKyAxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MgKyAxXSwgb2xkU3RyaW5nW29sZFBvcyArIDFdKSkge1xuICAgICAgbmV3UG9zKys7XG4gICAgICBvbGRQb3MrKztcbiAgICAgIGNvbW1vbkNvdW50Kys7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkNvdW50KSB7XG4gICAgICBiYXNlUGF0aC5jb21wb25lbnRzLnB1c2goe2NvdW50OiBjb21tb25Db3VudH0pO1xuICAgIH1cblxuICAgIGJhc2VQYXRoLm5ld1BvcyA9IG5ld1BvcztcbiAgICByZXR1cm4gb2xkUG9zO1xuICB9LFxuXG4gIGVxdWFscyhsZWZ0LCByaWdodCkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgfSxcbiAgcmVtb3ZlRW1wdHkoYXJyYXkpIHtcbiAgICBsZXQgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycmF5W2ldKSB7XG4gICAgICAgIHJldC5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgY2FzdElucHV0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICB0b2tlbml6ZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zcGxpdCgnJyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJ1aWxkVmFsdWVzKGRpZmYsIGNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCB1c2VMb25nZXN0VG9rZW4pIHtcbiAgbGV0IGNvbXBvbmVudFBvcyA9IDAsXG4gICAgICBjb21wb25lbnRMZW4gPSBjb21wb25lbnRzLmxlbmd0aCxcbiAgICAgIG5ld1BvcyA9IDAsXG4gICAgICBvbGRQb3MgPSAwO1xuXG4gIGZvciAoOyBjb21wb25lbnRQb3MgPCBjb21wb25lbnRMZW47IGNvbXBvbmVudFBvcysrKSB7XG4gICAgbGV0IGNvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICBpZiAoIWNvbXBvbmVudC5yZW1vdmVkKSB7XG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCAmJiB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICAgICAgbGV0IHZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KTtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUsIGkpIHtcbiAgICAgICAgICBsZXQgb2xkVmFsdWUgPSBvbGRTdHJpbmdbb2xkUG9zICsgaV07XG4gICAgICAgICAgcmV0dXJuIG9sZFZhbHVlLmxlbmd0aCA+IHZhbHVlLmxlbmd0aCA/IG9sZFZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IHZhbHVlLmpvaW4oJycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG5ld1BvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIENvbW1vbiBjYXNlXG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCkge1xuICAgICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnQudmFsdWUgPSBvbGRTdHJpbmcuc2xpY2Uob2xkUG9zLCBvbGRQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gUmV2ZXJzZSBhZGQgYW5kIHJlbW92ZSBzbyByZW1vdmVzIGFyZSBvdXRwdXQgZmlyc3QgdG8gbWF0Y2ggY29tbW9uIGNvbnZlbnRpb25cbiAgICAgIC8vIFRoZSBkaWZmaW5nIGFsZ29yaXRobSBpcyB0aWVkIHRvIGFkZCB0aGVuIHJlbW92ZSBvdXRwdXQgYW5kIHRoaXMgaXMgdGhlIHNpbXBsZXN0XG4gICAgICAvLyByb3V0ZSB0byBnZXQgdGhlIGRlc2lyZWQgb3V0cHV0IHdpdGggbWluaW1hbCBvdmVyaGVhZC5cbiAgICAgIGlmIChjb21wb25lbnRQb3MgJiYgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXS5hZGRlZCkge1xuICAgICAgICBsZXQgdG1wID0gY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXSA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3NdID0gdG1wO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNwZWNpYWwgY2FzZSBoYW5kbGUgZm9yIHdoZW4gb25lIHRlcm1pbmFsIGlzIGlnbm9yZWQuIEZvciB0aGlzIGNhc2Ugd2UgbWVyZ2UgdGhlXG4gIC8vIHRlcm1pbmFsIGludG8gdGhlIHByaW9yIHN0cmluZyBhbmQgZHJvcCB0aGUgY2hhbmdlLlxuICBsZXQgbGFzdENvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMV07XG4gIGlmICgobGFzdENvbXBvbmVudC5hZGRlZCB8fCBsYXN0Q29tcG9uZW50LnJlbW92ZWQpICYmIGRpZmYuZXF1YWxzKCcnLCBsYXN0Q29tcG9uZW50LnZhbHVlKSkge1xuICAgIGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMl0udmFsdWUgKz0gbGFzdENvbXBvbmVudC52YWx1ZTtcbiAgICBjb21wb25lbnRzLnBvcCgpO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGF0aChwYXRoKSB7XG4gIHJldHVybiB7IG5ld1BvczogcGF0aC5uZXdQb3MsIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKSB9O1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNoYXJhY3RlckRpZmYgPSBuZXcgRGlmZigpO1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDaGFycyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNoYXJhY3RlckRpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY3NzRGlmZiA9IG5ldyBEaWZmKCk7XG5jc3NEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oW3t9OjssXXxcXHMrKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDc3Mob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7bGluZURpZmZ9IGZyb20gJy4vbGluZSc7XG5cbmNvbnN0IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuXG5leHBvcnQgY29uc3QganNvbkRpZmYgPSBuZXcgRGlmZigpO1xuLy8gRGlzY3JpbWluYXRlIGJldHdlZW4gdHdvIGxpbmVzIG9mIHByZXR0eS1wcmludGVkLCBzZXJpYWxpemVkIEpTT04gd2hlcmUgb25lIG9mIHRoZW0gaGFzIGFcbi8vIGRhbmdsaW5nIGNvbW1hIGFuZCB0aGUgb3RoZXIgZG9lc24ndC4gVHVybnMgb3V0IGluY2x1ZGluZyB0aGUgZGFuZ2xpbmcgY29tbWEgeWllbGRzIHRoZSBuaWNlc3Qgb3V0cHV0OlxuanNvbkRpZmYudXNlTG9uZ2VzdFRva2VuID0gdHJ1ZTtcblxuanNvbkRpZmYudG9rZW5pemUgPSBsaW5lRGlmZi50b2tlbml6ZTtcbmpzb25EaWZmLmNhc3RJbnB1dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeShjYW5vbmljYWxpemUodmFsdWUpLCB1bmRlZmluZWQsICcgICcpO1xufTtcbmpzb25EaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBEaWZmLnByb3RvdHlwZS5lcXVhbHMobGVmdC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSwgcmlnaHQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJykpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZKc29uKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjaykgeyByZXR1cm4ganNvbkRpZmYuZGlmZihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spOyB9XG5cblxuLy8gVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBwcmVzZW5jZSBvZiBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGJhaWxpbmcgb3V0IHdoZW4gZW5jb3VudGVyaW5nIGFuXG4vLyBvYmplY3QgdGhhdCBpcyBhbHJlYWR5IG9uIHRoZSBcInN0YWNrXCIgb2YgaXRlbXMgYmVpbmcgcHJvY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZShvYmosIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKSB7XG4gIHN0YWNrID0gc3RhY2sgfHwgW107XG4gIHJlcGxhY2VtZW50U3RhY2sgPSByZXBsYWNlbWVudFN0YWNrIHx8IFtdO1xuXG4gIGxldCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChzdGFja1tpXSA9PT0gb2JqKSB7XG4gICAgICByZXR1cm4gcmVwbGFjZW1lbnRTdGFja1tpXTtcbiAgICB9XG4gIH1cblxuICBsZXQgY2Fub25pY2FsaXplZE9iajtcblxuICBpZiAoJ1tvYmplY3QgQXJyYXldJyA9PT0gb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcuY2FsbChvYmopKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpbaV0gPSBjYW5vbmljYWxpemUob2JqW2ldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSB7fTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgbGV0IHNvcnRlZEtleXMgPSBbXSxcbiAgICAgICAga2V5O1xuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzb3J0ZWRLZXlzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGVkS2V5cy5zb3J0KCk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNvcnRlZEtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGtleSA9IHNvcnRlZEtleXNbaV07XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2tleV0gPSBjYW5vbmljYWxpemUob2JqW2tleV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gb2JqO1xuICB9XG4gIHJldHVybiBjYW5vbmljYWxpemVkT2JqO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbmV4cG9ydCBjb25zdCBsaW5lRGlmZiA9IG5ldyBEaWZmKCk7XG5saW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCByZXRMaW5lcyA9IFtdLFxuICAgICAgbGluZXNBbmROZXdsaW5lcyA9IHZhbHVlLnNwbGl0KC8oXFxufFxcclxcbikvKTtcblxuICAvLyBJZ25vcmUgdGhlIGZpbmFsIGVtcHR5IHRva2VuIHRoYXQgb2NjdXJzIGlmIHRoZSBzdHJpbmcgZW5kcyB3aXRoIGEgbmV3IGxpbmVcbiAgaWYgKCFsaW5lc0FuZE5ld2xpbmVzW2xpbmVzQW5kTmV3bGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICBsaW5lc0FuZE5ld2xpbmVzLnBvcCgpO1xuICB9XG5cbiAgLy8gTWVyZ2UgdGhlIGNvbnRlbnQgYW5kIGxpbmUgc2VwYXJhdG9ycyBpbnRvIHNpbmdsZSB0b2tlbnNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGxpbmUgPSBsaW5lc0FuZE5ld2xpbmVzW2ldO1xuXG4gICAgaWYgKGkgJSAyICYmICF0aGlzLm9wdGlvbnMubmV3bGluZUlzVG9rZW4pIHtcbiAgICAgIHJldExpbmVzW3JldExpbmVzLmxlbmd0aCAtIDFdICs9IGxpbmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSkge1xuICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICB9XG4gICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXRMaW5lcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmVHJpbW1lZExpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuXG5leHBvcnQgY29uc3Qgc2VudGVuY2VEaWZmID0gbmV3IERpZmYoKTtcbnNlbnRlbmNlRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFxcUy4rP1suIT9dKSg/PVxccyt8JCkvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmU2VudGVuY2VzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gc2VudGVuY2VEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbi8vIEJhc2VkIG9uIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xhdGluX3NjcmlwdF9pbl9Vbmljb2RlXG4vL1xuLy8gUmFuZ2VzIGFuZCBleGNlcHRpb25zOlxuLy8gTGF0aW4tMSBTdXBwbGVtZW50LCAwMDgw4oCTMDBGRlxuLy8gIC0gVSswMEQ3ICDDlyBNdWx0aXBsaWNhdGlvbiBzaWduXG4vLyAgLSBVKzAwRjcgIMO3IERpdmlzaW9uIHNpZ25cbi8vIExhdGluIEV4dGVuZGVkLUEsIDAxMDDigJMwMTdGXG4vLyBMYXRpbiBFeHRlbmRlZC1CLCAwMTgw4oCTMDI0RlxuLy8gSVBBIEV4dGVuc2lvbnMsIDAyNTDigJMwMkFGXG4vLyBTcGFjaW5nIE1vZGlmaWVyIExldHRlcnMsIDAyQjDigJMwMkZGXG4vLyAgLSBVKzAyQzcgIMuHICYjNzExOyAgQ2Fyb25cbi8vICAtIFUrMDJEOCAgy5ggJiM3Mjg7ICBCcmV2ZVxuLy8gIC0gVSswMkQ5ICDLmSAmIzcyOTsgIERvdCBBYm92ZVxuLy8gIC0gVSswMkRBICDLmiAmIzczMDsgIFJpbmcgQWJvdmVcbi8vICAtIFUrMDJEQiAgy5sgJiM3MzE7ICBPZ29uZWtcbi8vICAtIFUrMDJEQyAgy5wgJiM3MzI7ICBTbWFsbCBUaWxkZVxuLy8gIC0gVSswMkREICDLnSAmIzczMzsgIERvdWJsZSBBY3V0ZSBBY2NlbnRcbi8vIExhdGluIEV4dGVuZGVkIEFkZGl0aW9uYWwsIDFFMDDigJMxRUZGXG5jb25zdCBleHRlbmRlZFdvcmRDaGFycyA9IC9eW2EtekEtWlxcdXtDMH0tXFx1e0ZGfVxcdXtEOH0tXFx1e0Y2fVxcdXtGOH0tXFx1ezJDNn1cXHV7MkM4fS1cXHV7MkQ3fVxcdXsyREV9LVxcdXsyRkZ9XFx1ezFFMDB9LVxcdXsxRUZGfV0rJC91O1xuXG5jb25zdCByZVdoaXRlc3BhY2UgPSAvXFxTLztcblxuZXhwb3J0IGNvbnN0IHdvcmREaWZmID0gbmV3IERpZmYoKTtcbndvcmREaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBsZWZ0ID09PSByaWdodCB8fCAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KGxlZnQpICYmICFyZVdoaXRlc3BhY2UudGVzdChyaWdodCkpO1xufTtcbndvcmREaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHRva2VucyA9IHZhbHVlLnNwbGl0KC8oXFxzK3xcXGIpLyk7XG5cbiAgLy8gSm9pbiB0aGUgYm91bmRhcnkgc3BsaXRzIHRoYXQgd2UgZG8gbm90IGNvbnNpZGVyIHRvIGJlIGJvdW5kYXJpZXMuIFRoaXMgaXMgcHJpbWFyaWx5IHRoZSBleHRlbmRlZCBMYXRpbiBjaGFyYWN0ZXIgc2V0LlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGFuIGVtcHR5IHN0cmluZyBpbiB0aGUgbmV4dCBmaWVsZCBhbmQgd2UgaGF2ZSBvbmx5IHdvcmQgY2hhcnMgYmVmb3JlIGFuZCBhZnRlciwgbWVyZ2VcbiAgICBpZiAoIXRva2Vuc1tpICsgMV0gJiYgdG9rZW5zW2kgKyAyXVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2ldKVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2kgKyAyXSkpIHtcbiAgICAgIHRva2Vuc1tpXSArPSB0b2tlbnNbaSArIDJdO1xuICAgICAgdG9rZW5zLnNwbGljZShpICsgMSwgMik7XG4gICAgICBpLS07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRva2Vucztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzV2l0aFNwYWNlKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spO1xufVxuIiwiLyogU2VlIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMgb2YgdXNlICovXG5cbi8qXG4gKiBUZXh0IGRpZmYgaW1wbGVtZW50YXRpb24uXG4gKlxuICogVGhpcyBsaWJyYXJ5IHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgQVBJUzpcbiAqIEpzRGlmZi5kaWZmQ2hhcnM6IENoYXJhY3RlciBieSBjaGFyYWN0ZXIgZGlmZlxuICogSnNEaWZmLmRpZmZXb3JkczogV29yZCAoYXMgZGVmaW5lZCBieSBcXGIgcmVnZXgpIGRpZmYgd2hpY2ggaWdub3JlcyB3aGl0ZXNwYWNlXG4gKiBKc0RpZmYuZGlmZkxpbmVzOiBMaW5lIGJhc2VkIGRpZmZcbiAqXG4gKiBKc0RpZmYuZGlmZkNzczogRGlmZiB0YXJnZXRlZCBhdCBDU1MgY29udGVudFxuICpcbiAqIFRoZXNlIG1ldGhvZHMgYXJlIGJhc2VkIG9uIHRoZSBpbXBsZW1lbnRhdGlvbiBwcm9wb3NlZCBpblxuICogXCJBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgaXRzIFZhcmlhdGlvbnNcIiAoTXllcnMsIDE5ODYpLlxuICogaHR0cDovL2NpdGVzZWVyeC5pc3QucHN1LmVkdS92aWV3ZG9jL3N1bW1hcnk/ZG9pPTEwLjEuMS40LjY5MjdcbiAqL1xuaW1wb3J0IERpZmYgZnJvbSAnLi9kaWZmL2Jhc2UnO1xuaW1wb3J0IHtkaWZmQ2hhcnN9IGZyb20gJy4vZGlmZi9jaGFyYWN0ZXInO1xuaW1wb3J0IHtkaWZmV29yZHMsIGRpZmZXb3Jkc1dpdGhTcGFjZX0gZnJvbSAnLi9kaWZmL3dvcmQnO1xuaW1wb3J0IHtkaWZmTGluZXMsIGRpZmZUcmltbWVkTGluZXN9IGZyb20gJy4vZGlmZi9saW5lJztcbmltcG9ydCB7ZGlmZlNlbnRlbmNlc30gZnJvbSAnLi9kaWZmL3NlbnRlbmNlJztcblxuaW1wb3J0IHtkaWZmQ3NzfSBmcm9tICcuL2RpZmYvY3NzJztcbmltcG9ydCB7ZGlmZkpzb24sIGNhbm9uaWNhbGl6ZX0gZnJvbSAnLi9kaWZmL2pzb24nO1xuXG5pbXBvcnQge2FwcGx5UGF0Y2gsIGFwcGx5UGF0Y2hlc30gZnJvbSAnLi9wYXRjaC9hcHBseSc7XG5pbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvcGFyc2UnO1xuaW1wb3J0IHtzdHJ1Y3R1cmVkUGF0Y2gsIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsIGNyZWF0ZVBhdGNofSBmcm9tICcuL3BhdGNoL2NyZWF0ZSc7XG5cbmltcG9ydCB7Y29udmVydENoYW5nZXNUb0RNUH0gZnJvbSAnLi9jb252ZXJ0L2RtcCc7XG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9YTUx9IGZyb20gJy4vY29udmVydC94bWwnO1xuXG5leHBvcnQge1xuICBEaWZmLFxuXG4gIGRpZmZDaGFycyxcbiAgZGlmZldvcmRzLFxuICBkaWZmV29yZHNXaXRoU3BhY2UsXG4gIGRpZmZMaW5lcyxcbiAgZGlmZlRyaW1tZWRMaW5lcyxcbiAgZGlmZlNlbnRlbmNlcyxcblxuICBkaWZmQ3NzLFxuICBkaWZmSnNvbixcblxuICBzdHJ1Y3R1cmVkUGF0Y2gsXG4gIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsXG4gIGNyZWF0ZVBhdGNoLFxuICBhcHBseVBhdGNoLFxuICBhcHBseVBhdGNoZXMsXG4gIHBhcnNlUGF0Y2gsXG4gIGNvbnZlcnRDaGFuZ2VzVG9ETVAsXG4gIGNvbnZlcnRDaGFuZ2VzVG9YTUwsXG4gIGNhbm9uaWNhbGl6ZVxufTtcbiIsImltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgZGlzdGFuY2VJdGVyYXRvciBmcm9tICcuLi91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2goc291cmNlLCB1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodW5pRGlmZikpIHtcbiAgICBpZiAodW5pRGlmZi5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwcGx5UGF0Y2ggb25seSB3b3JrcyB3aXRoIGEgc2luZ2xlIGlucHV0LicpO1xuICAgIH1cblxuICAgIHVuaURpZmYgPSB1bmlEaWZmWzBdO1xuICB9XG5cbiAgLy8gQXBwbHkgdGhlIGRpZmYgdG8gdGhlIGlucHV0XG4gIGxldCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyksXG4gICAgICBodW5rcyA9IHVuaURpZmYuaHVua3MsXG5cbiAgICAgIGNvbXBhcmVMaW5lID0gb3B0aW9ucy5jb21wYXJlTGluZSB8fCAoKGxpbmVOdW1iZXIsIGxpbmUsIG9wZXJhdGlvbiwgcGF0Y2hDb250ZW50KSA9PiBsaW5lID09PSBwYXRjaENvbnRlbnQpLFxuICAgICAgZXJyb3JDb3VudCA9IDAsXG4gICAgICBmdXp6RmFjdG9yID0gb3B0aW9ucy5mdXp6RmFjdG9yIHx8IDAsXG4gICAgICBtaW5MaW5lID0gMCxcbiAgICAgIG9mZnNldCA9IDAsXG5cbiAgICAgIHJlbW92ZUVPRk5MLFxuICAgICAgYWRkRU9GTkw7XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgaHVuayBleGFjdGx5IGZpdHMgb24gdGhlIHByb3ZpZGVkIGxvY2F0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBodW5rRml0cyhodW5rLCB0b1Bvcykge1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgLy8gQ29udGV4dCBzYW5pdHkgY2hlY2tcbiAgICAgICAgaWYgKCFjb21wYXJlTGluZSh0b1BvcyArIDEsIGxpbmVzW3RvUG9zXSwgb3BlcmF0aW9uLCBjb250ZW50KSkge1xuICAgICAgICAgIGVycm9yQ291bnQrKztcblxuICAgICAgICAgIGlmIChlcnJvckNvdW50ID4gZnV6ekZhY3Rvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0b1BvcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU2VhcmNoIGJlc3QgZml0IG9mZnNldHMgZm9yIGVhY2ggaHVuayBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgbWF4TGluZSA9IGxpbmVzLmxlbmd0aCAtIGh1bmsub2xkTGluZXMsXG4gICAgICAgIGxvY2FsT2Zmc2V0ID0gMCxcbiAgICAgICAgdG9Qb3MgPSBvZmZzZXQgKyBodW5rLm9sZFN0YXJ0IC0gMTtcblxuICAgIGxldCBpdGVyYXRvciA9IGRpc3RhbmNlSXRlcmF0b3IodG9Qb3MsIG1pbkxpbmUsIG1heExpbmUpO1xuXG4gICAgZm9yICg7IGxvY2FsT2Zmc2V0ICE9PSB1bmRlZmluZWQ7IGxvY2FsT2Zmc2V0ID0gaXRlcmF0b3IoKSkge1xuICAgICAgaWYgKGh1bmtGaXRzKGh1bmssIHRvUG9zICsgbG9jYWxPZmZzZXQpKSB7XG4gICAgICAgIGh1bmsub2Zmc2V0ID0gb2Zmc2V0ICs9IGxvY2FsT2Zmc2V0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxPZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNldCBsb3dlciB0ZXh0IGxpbWl0IHRvIGVuZCBvZiB0aGUgY3VycmVudCBodW5rLCBzbyBuZXh0IG9uZXMgZG9uJ3QgdHJ5XG4gICAgLy8gdG8gZml0IG92ZXIgYWxyZWFkeSBwYXRjaGVkIHRleHRcbiAgICBtaW5MaW5lID0gaHVuay5vZmZzZXQgKyBodW5rLm9sZFN0YXJ0ICsgaHVuay5vbGRMaW5lcztcbiAgfVxuXG4gIC8vIEFwcGx5IHBhdGNoIGh1bmtzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICB0b1BvcyA9IGh1bmsub2Zmc2V0ICsgaHVuay5uZXdTdGFydCAtIDE7XG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMSk7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDAsIGNvbnRlbnQpO1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBsZXQgcHJldmlvdXNPcGVyYXRpb24gPSBodW5rLmxpbmVzW2ogLSAxXSA/IGh1bmsubGluZXNbaiAtIDFdWzBdIDogbnVsbDtcbiAgICAgICAgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICByZW1vdmVFT0ZOTCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIGFkZEVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBFT0ZOTCBpbnNlcnRpb24vcmVtb3ZhbFxuICBpZiAocmVtb3ZlRU9GTkwpIHtcbiAgICB3aGlsZSAoIWxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICBsaW5lcy5wb3AoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYWRkRU9GTkwpIHtcbiAgICBsaW5lcy5wdXNoKCcnKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbi8vIFdyYXBwZXIgdGhhdCBzdXBwb3J0cyBtdWx0aXBsZSBmaWxlIHBhdGNoZXMgdmlhIGNhbGxiYWNrcy5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoZXModW5pRGlmZiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgZnVuY3Rpb24gcHJvY2Vzc0luZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHVuaURpZmZbY3VycmVudEluZGV4KytdO1xuICAgIGlmICghaW5kZXgpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5sb2FkRmlsZShpbmRleCwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKGVycik7XG4gICAgICB9XG5cbiAgICAgIGxldCB1cGRhdGVkQ29udGVudCA9IGFwcGx5UGF0Y2goZGF0YSwgaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5wYXRjaGVkKGluZGV4LCB1cGRhdGVkQ29udGVudCk7XG5cbiAgICAgIHNldFRpbWVvdXQocHJvY2Vzc0luZGV4LCAwKTtcbiAgICB9KTtcbiAgfVxuICBwcm9jZXNzSW5kZXgoKTtcbn1cbiIsImltcG9ydCB7ZGlmZkxpbmVzfSBmcm9tICcuLi9kaWZmL2xpbmUnO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7IGNvbnRleHQ6IDQgfTtcbiAgfVxuXG4gIGNvbnN0IGRpZmYgPSBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIpO1xuICBkaWZmLnB1c2goe3ZhbHVlOiAnJywgbGluZXM6IFtdfSk7ICAgLy8gQXBwZW5kIGFuIGVtcHR5IHZhbHVlIHRvIG1ha2UgY2xlYW51cCBlYXNpZXJcblxuICBmdW5jdGlvbiBjb250ZXh0TGluZXMobGluZXMpIHtcbiAgICByZXR1cm4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7IHJldHVybiAnICcgKyBlbnRyeTsgfSk7XG4gIH1cblxuICBsZXQgaHVua3MgPSBbXTtcbiAgbGV0IG9sZFJhbmdlU3RhcnQgPSAwLCBuZXdSYW5nZVN0YXJ0ID0gMCwgY3VyUmFuZ2UgPSBbXSxcbiAgICAgIG9sZExpbmUgPSAxLCBuZXdMaW5lID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGRpZmZbaV0sXG4gICAgICAgICAgbGluZXMgPSBjdXJyZW50LmxpbmVzIHx8IGN1cnJlbnQudmFsdWUucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJyk7XG4gICAgY3VycmVudC5saW5lcyA9IGxpbmVzO1xuXG4gICAgaWYgKGN1cnJlbnQuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHByZXZpb3VzIGNvbnRleHQsIHN0YXJ0IHdpdGggdGhhdFxuICAgICAgaWYgKCFvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBkaWZmW2kgLSAxXTtcbiAgICAgICAgb2xkUmFuZ2VTdGFydCA9IG9sZExpbmU7XG4gICAgICAgIG5ld1JhbmdlU3RhcnQgPSBuZXdMaW5lO1xuXG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBvcHRpb25zLmNvbnRleHQgPiAwID8gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLW9wdGlvbnMuY29udGV4dCkpIDogW107XG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3V0cHV0IG91ciBjaGFuZ2VzXG4gICAgICBjdXJSYW5nZS5wdXNoKC4uLiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIChjdXJyZW50LmFkZGVkID8gJysnIDogJy0nKSArIGVudHJ5O1xuICAgICAgfSkpO1xuXG4gICAgICAvLyBUcmFjayB0aGUgdXBkYXRlZCBmaWxlIHBvc2l0aW9uXG4gICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZGVudGljYWwgY29udGV4dCBsaW5lcy4gVHJhY2sgbGluZSBjaGFuZ2VzXG4gICAgICBpZiAob2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAvLyBDbG9zZSBvdXQgYW55IGNoYW5nZXMgdGhhdCBoYXZlIGJlZW4gb3V0cHV0IChvciBqb2luIG92ZXJsYXBwaW5nKVxuICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCAqIDIgJiYgaSA8IGRpZmYubGVuZ3RoIC0gMikge1xuICAgICAgICAgIC8vIE92ZXJsYXBwaW5nXG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZW5kIHRoZSByYW5nZSBhbmQgb3V0cHV0XG4gICAgICAgICAgbGV0IGNvbnRleHRTaXplID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBvcHRpb25zLmNvbnRleHQpO1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcy5zbGljZSgwLCBjb250ZXh0U2l6ZSkpKTtcblxuICAgICAgICAgIGxldCBodW5rID0ge1xuICAgICAgICAgICAgb2xkU3RhcnQ6IG9sZFJhbmdlU3RhcnQsXG4gICAgICAgICAgICBvbGRMaW5lczogKG9sZExpbmUgLSBvbGRSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbmV3U3RhcnQ6IG5ld1JhbmdlU3RhcnQsXG4gICAgICAgICAgICBuZXdMaW5lczogKG5ld0xpbmUgLSBuZXdSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbGluZXM6IGN1clJhbmdlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoaSA+PSBkaWZmLmxlbmd0aCAtIDIgJiYgbGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gRU9GIGlzIGluc2lkZSB0aGlzIGh1bmtcbiAgICAgICAgICAgIGxldCBvbGRFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG9sZFN0cikpO1xuICAgICAgICAgICAgbGV0IG5ld0VPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3QobmV3U3RyKSk7XG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09IDAgJiYgIW9sZEVPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlOiBvbGQgaGFzIG5vIGVvbCBhbmQgbm8gdHJhaWxpbmcgY29udGV4dDsgbm8tbmwgY2FuIGVuZCB1cCBiZWZvcmUgYWRkc1xuICAgICAgICAgICAgICBjdXJSYW5nZS5zcGxpY2UoaHVuay5vbGRMaW5lcywgMCwgJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb2xkRU9GTmV3bGluZSB8fCAhbmV3RU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICBjdXJSYW5nZS5wdXNoKCdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaHVua3MucHVzaChodW5rKTtcblxuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIGN1clJhbmdlID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBvbGRGaWxlTmFtZTogb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lOiBuZXdGaWxlTmFtZSxcbiAgICBvbGRIZWFkZXI6IG9sZEhlYWRlciwgbmV3SGVhZGVyOiBuZXdIZWFkZXIsXG4gICAgaHVua3M6IGh1bmtzXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUd29GaWxlc1BhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGNvbnN0IGRpZmYgPSBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IHJldCA9IFtdO1xuICBpZiAob2xkRmlsZU5hbWUgPT0gbmV3RmlsZU5hbWUpIHtcbiAgICByZXQucHVzaCgnSW5kZXg6ICcgKyBvbGRGaWxlTmFtZSk7XG4gIH1cbiAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgcmV0LnB1c2goJy0tLSAnICsgZGlmZi5vbGRGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5vbGRIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYub2xkSGVhZGVyKSk7XG4gIHJldC5wdXNoKCcrKysgJyArIGRpZmYubmV3RmlsZU5hbWUgKyAodHlwZW9mIGRpZmYubmV3SGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm5ld0hlYWRlcikpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5odW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGh1bmsgPSBkaWZmLmh1bmtzW2ldO1xuICAgIHJldC5wdXNoKFxuICAgICAgJ0BAIC0nICsgaHVuay5vbGRTdGFydCArICcsJyArIGh1bmsub2xkTGluZXNcbiAgICAgICsgJyArJyArIGh1bmsubmV3U3RhcnQgKyAnLCcgKyBodW5rLm5ld0xpbmVzXG4gICAgICArICcgQEAnXG4gICAgKTtcbiAgICByZXQucHVzaC5hcHBseShyZXQsIGh1bmsubGluZXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldC5qb2luKCdcXG4nKSArICdcXG4nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGF0Y2goZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICByZXR1cm4gY3JlYXRlVHdvRmlsZXNQYXRjaChmaWxlTmFtZSwgZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VQYXRjaCh1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IGRpZmZzdHIgPSB1bmlEaWZmLnNwbGl0KCdcXG4nKSxcbiAgICAgIGxpc3QgPSBbXSxcbiAgICAgIGkgPSAwO1xuXG4gIGZ1bmN0aW9uIHBhcnNlSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0ge307XG4gICAgbGlzdC5wdXNoKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGRpZmYgbWV0YWRhdGFcbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIC8vIEZpbGUgaGVhZGVyIGZvdW5kLCBlbmQgcGFyc2luZyBkaWZmIG1ldGFkYXRhXG4gICAgICBpZiAoL14oXFwtXFwtXFwtfFxcK1xcK1xcK3xAQClcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIERpZmYgaW5kZXhcbiAgICAgIGxldCBoZWFkZXIgPSAoL14oPzpJbmRleDp8ZGlmZig/OiAtciBcXHcrKSspXFxzKyguKz8pXFxzKiQvKS5leGVjKGxpbmUpO1xuICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICBpbmRleC5pbmRleCA9IGhlYWRlclsxXTtcbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIGZpbGUgaGVhZGVycyBpZiB0aGV5IGFyZSBkZWZpbmVkLiBVbmlmaWVkIGRpZmYgcmVxdWlyZXMgdGhlbSwgYnV0XG4gICAgLy8gdGhlcmUncyBubyB0ZWNobmljYWwgaXNzdWVzIHRvIGhhdmUgYW4gaXNvbGF0ZWQgaHVuayB3aXRob3V0IGZpbGUgaGVhZGVyXG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgaHVua3NcbiAgICBpbmRleC5odW5rcyA9IFtdO1xuXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICBpZiAoL14oSW5kZXg6fGRpZmZ8XFwtXFwtXFwtfFxcK1xcK1xcKylcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKC9eQEAvLnRlc3QobGluZSkpIHtcbiAgICAgICAgaW5kZXguaHVua3MucHVzaChwYXJzZUh1bmsoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpbmUgJiYgb3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgICAgLy8gSWdub3JlIHVuZXhwZWN0ZWQgY29udGVudCB1bmxlc3MgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpbmUgJyArIChpICsgMSkgKyAnICcgKyBKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIHRoZSAtLS0gYW5kICsrKyBoZWFkZXJzLCBpZiBub25lIGFyZSBmb3VuZCwgbm8gbGluZXNcbiAgLy8gYXJlIGNvbnN1bWVkLlxuICBmdW5jdGlvbiBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpIHtcbiAgICBsZXQgZmlsZUhlYWRlciA9ICgvXihcXC1cXC1cXC18XFwrXFwrXFwrKVxccysoXFxTKylcXHM/KC4rPylcXHMqJC8pLmV4ZWMoZGlmZnN0cltpXSk7XG4gICAgaWYgKGZpbGVIZWFkZXIpIHtcbiAgICAgIGxldCBrZXlQcmVmaXggPSBmaWxlSGVhZGVyWzFdID09PSAnLS0tJyA/ICdvbGQnIDogJ25ldyc7XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnRmlsZU5hbWUnXSA9IGZpbGVIZWFkZXJbMl07XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnSGVhZGVyJ10gPSBmaWxlSGVhZGVyWzNdO1xuXG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIGEgaHVua1xuICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB3ZSBhcmUgYXQgdGhlIHN0YXJ0IG9mIGEgaHVuay5cbiAgZnVuY3Rpb24gcGFyc2VIdW5rKCkge1xuICAgIGxldCBjaHVua0hlYWRlckluZGV4ID0gaSxcbiAgICAgICAgY2h1bmtIZWFkZXJMaW5lID0gZGlmZnN0cltpKytdLFxuICAgICAgICBjaHVua0hlYWRlciA9IGNodW5rSGVhZGVyTGluZS5zcGxpdCgvQEAgLShcXGQrKSg/OiwoXFxkKykpPyBcXCsoXFxkKykoPzosKFxcZCspKT8gQEAvKTtcblxuICAgIGxldCBodW5rID0ge1xuICAgICAgb2xkU3RhcnQ6ICtjaHVua0hlYWRlclsxXSxcbiAgICAgIG9sZExpbmVzOiArY2h1bmtIZWFkZXJbMl0gfHwgMSxcbiAgICAgIG5ld1N0YXJ0OiArY2h1bmtIZWFkZXJbM10sXG4gICAgICBuZXdMaW5lczogK2NodW5rSGVhZGVyWzRdIHx8IDEsXG4gICAgICBsaW5lczogW11cbiAgICB9O1xuXG4gICAgbGV0IGFkZENvdW50ID0gMCxcbiAgICAgICAgcmVtb3ZlQ291bnQgPSAwO1xuICAgIGZvciAoOyBpIDwgZGlmZnN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9wZXJhdGlvbiA9IGRpZmZzdHJbaV1bMF07XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJyB8fCBvcGVyYXRpb24gPT09ICctJyB8fCBvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBodW5rLmxpbmVzLnB1c2goZGlmZnN0cltpXSk7XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSB0aGUgZW1wdHkgYmxvY2sgY291bnQgY2FzZVxuICAgIGlmICghYWRkQ291bnQgJiYgaHVuay5uZXdMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5uZXdMaW5lcyA9IDA7XG4gICAgfVxuICAgIGlmICghcmVtb3ZlQ291bnQgJiYgaHVuay5vbGRMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5vbGRMaW5lcyA9IDA7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBvcHRpb25hbCBzYW5pdHkgY2hlY2tpbmdcbiAgICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGlmIChhZGRDb3VudCAhPT0gaHVuay5uZXdMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZW1vdmVDb3VudCAhPT0gaHVuay5vbGRMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlbW92ZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBodW5rO1xuICB9XG5cbiAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgIHBhcnNlSW5kZXgoKTtcbiAgfVxuXG4gIHJldHVybiBsaXN0O1xufVxuIiwiLy8gSXRlcmF0b3IgdGhhdCB0cmF2ZXJzZXMgaW4gdGhlIHJhbmdlIG9mIFttaW4sIG1heF0sIHN0ZXBwaW5nXG4vLyBieSBkaXN0YW5jZSBmcm9tIGEgZ2l2ZW4gc3RhcnQgcG9zaXRpb24uIEkuZS4gZm9yIFswLCA0XSwgd2l0aFxuLy8gc3RhcnQgb2YgMiwgdGhpcyB3aWxsIGl0ZXJhdGUgMiwgMywgMSwgNCwgMC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBtaW5MaW5lLCBtYXhMaW5lKSB7XG4gIGxldCB3YW50Rm9yd2FyZCA9IHRydWUsXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgbG9jYWxPZmZzZXQgPSAxO1xuXG4gIHJldHVybiBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICBpZiAod2FudEZvcndhcmQgJiYgIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmIChiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICBsb2NhbE9mZnNldCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZXlvbmQgdGV4dCBsZW5ndGgsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGFmdGVyIG9mZnNldCBsb2NhdGlvbiAob3IgZGVzaXJlZCBsb2NhdGlvbiBvbiBmaXJzdCBpdGVyYXRpb24pXG4gICAgICBpZiAoc3RhcnQgKyBsb2NhbE9mZnNldCA8PSBtYXhMaW5lKSB7XG4gICAgICAgIHJldHVybiBsb2NhbE9mZnNldDtcbiAgICAgIH1cblxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKCFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZWZvcmUgdGV4dCBiZWdpbm5pbmcsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGJlZm9yZSBvZmZzZXQgbG9jYXRpb25cbiAgICAgIGlmIChtaW5MaW5lIDw9IHN0YXJ0IC0gbG9jYWxPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIC1sb2NhbE9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICB9XG5cbiAgICAvLyBXZSB0cmllZCB0byBmaXQgaHVuayBiZWZvcmUgdGV4dCBiZWdpbm5pbmcgYW5kIGJleW9uZCB0ZXh0IGxlbmdodCwgdGhlblxuICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG4gIH07XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGRlZmF1bHRzLmNhbGxiYWNrID0gb3B0aW9ucztcbiAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgZm9yIChsZXQgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdHM7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIGxjcyA9IHJlcXVpcmUoJy4vbGliL2xjcycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9saWIvYXJyYXknKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJy4vbGliL2pzb25QYXRjaCcpO1xudmFyIGludmVyc2UgPSByZXF1aXJlKCcuL2xpYi9pbnZlcnNlJyk7XG52YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2xpYi9qc29uUG9pbnRlcicpO1xudmFyIGVuY29kZVNlZ21lbnQgPSBqc29uUG9pbnRlci5lbmNvZGVTZWdtZW50O1xuXG5leHBvcnRzLmRpZmYgPSBkaWZmO1xuZXhwb3J0cy5wYXRjaCA9IHBhdGNoLmFwcGx5O1xuZXhwb3J0cy5wYXRjaEluUGxhY2UgPSBwYXRjaC5hcHBseUluUGxhY2U7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5jbG9uZSA9IHBhdGNoLmNsb25lO1xuXG4vLyBFcnJvcnNcbmV4cG9ydHMuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuZXhwb3J0cy5UZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9UZXN0RmFpbGVkRXJyb3InKTtcbmV4cG9ydHMuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgaXNWYWxpZE9iamVjdCA9IHBhdGNoLmlzVmFsaWRPYmplY3Q7XG52YXIgZGVmYXVsdEhhc2ggPSBwYXRjaC5kZWZhdWx0SGFzaDtcblxuLyoqXG4gKiBDb21wdXRlIGEgSlNPTiBQYXRjaCByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYSBhbmQgYi5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIGlmIGEgZnVuY3Rpb24sIHNlZSBvcHRpb25zLmhhc2hcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKHg6Kik6U3RyaW5nfE51bWJlcn0gb3B0aW9ucy5oYXNoIHVzZWQgdG8gaGFzaCBhcnJheSBpdGVtc1xuICogIGluIG9yZGVyIHRvIHJlY29nbml6ZSBpZGVudGljYWwgb2JqZWN0cywgZGVmYXVsdHMgdG8gSlNPTi5zdHJpbmdpZnlcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXkpOm9iamVjdH0gb3B0aW9ucy5tYWtlQ29udGV4dFxuICogIHVzZWQgdG8gZ2VuZXJhdGUgcGF0Y2ggY29udGV4dC4gSWYgbm90IHByb3ZpZGVkLCBjb250ZXh0IHdpbGwgbm90IGJlIGdlbmVyYXRlZFxuICogQHJldHVybnMge2FycmF5fSBKU09OIFBhdGNoIHN1Y2ggdGhhdCBwYXRjaChkaWZmKGEsIGIpLCBhKSB+IGJcbiAqL1xuZnVuY3Rpb24gZGlmZihhLCBiLCBvcHRpb25zKSB7XG5cdHJldHVybiBhcHBlbmRDaGFuZ2VzKGEsIGIsICcnLCBpbml0U3RhdGUob3B0aW9ucywgW10pKS5wYXRjaDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgaW5pdGlhbCBkaWZmIHN0YXRlIGZyb20gdGhlIHByb3ZpZGVkIG9wdGlvbnNcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgQHNlZSBkaWZmIG9wdGlvbnMgYWJvdmVcbiAqIEBwYXJhbSB7YXJyYXl9IHBhdGNoIGFuIGVtcHR5IG9yIGV4aXN0aW5nIEpTT04gUGF0Y2ggYXJyYXkgaW50byB3aGljaFxuICogIHRoZSBkaWZmIHNob3VsZCBnZW5lcmF0ZSBuZXcgcGF0Y2ggb3BlcmF0aW9uc1xuICogQHJldHVybnMge29iamVjdH0gaW5pdGlhbGl6ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBpbml0U3RhdGUob3B0aW9ucywgcGF0Y2gpIHtcblx0aWYodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLmhhc2gsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5tYWtlQ29udGV4dCwgZGVmYXVsdENvbnRleHQpLFxuXHRcdFx0aW52ZXJ0aWJsZTogIShvcHRpb25zLmludmVydGlibGUgPT09IGZhbHNlKVxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogZGVmYXVsdENvbnRleHQsXG5cdFx0XHRpbnZlcnRpYmxlOiB0cnVlXG5cdFx0fTtcblx0fVxufVxuXG4vKipcbiAqIEdpdmVuIHR3byBKU09OIHZhbHVlcyAob2JqZWN0LCBhcnJheSwgbnVtYmVyLCBzdHJpbmcsIGV0Yy4pLCBmaW5kIHRoZWlyXG4gKiBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kQXJyYXlDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdGlmKGlzVmFsaWRPYmplY3QoYSkgJiYgaXNWYWxpZE9iamVjdChiKSkge1xuXHRcdHJldHVybiBhcHBlbmRPYmplY3RDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdHJldHVybiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBvYmplY3RzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IG8xXG4gKiBAcGFyYW0ge29iamVjdH0gbzJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRPYmplY3RDaGFuZ2VzKG8xLCBvMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhvMik7XG5cdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHR2YXIgaSwga2V5O1xuXG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0dmFyIGtleVBhdGggPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdGlmKG8xW2tleV0gIT09IHZvaWQgMCkge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhvMVtrZXldLCBvMltrZXldLCBrZXlQYXRoLCBzdGF0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IGtleVBhdGgsIHZhbHVlOiBvMltrZXldIH0pO1xuXHRcdH1cblx0fVxuXG5cdGtleXMgPSBPYmplY3Qua2V5cyhvMSk7XG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0aWYobzJba2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogbzFba2V5XSB9KTtcblx0XHRcdH1cblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBhcnJheXMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRBcnJheUNoYW5nZXMoYTEsIGEyLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIgYTFoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGExKTtcblx0dmFyIGEyaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMik7XG5cblx0dmFyIGxjc01hdHJpeCA9IGxjcy5jb21wYXJlKGExaGFzaCwgYTJoYXNoKTtcblxuXHRyZXR1cm4gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4gbGNzTWF0cml4IGludG8gSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFuZCBhcHBlbmRcbiAqIHRoZW0gdG8gc3RhdGUucGF0Y2gsIHJlY3Vyc2luZyBpbnRvIGFycmF5IGVsZW1lbnRzIGFzIG5lY2Vzc2FyeVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzTWF0cml4XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBuZXcgc3RhdGUgd2l0aCBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYWRkZWQgYmFzZWRcbiAqICBvbiB0aGUgcHJvdmlkZWQgbGNzTWF0cml4XG4gKi9cbmZ1bmN0aW9uIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCkge1xuXHR2YXIgb2Zmc2V0ID0gMDtcblx0cmV0dXJuIGxjcy5yZWR1Y2UoZnVuY3Rpb24oc3RhdGUsIG9wLCBpLCBqKSB7XG5cdFx0dmFyIGxhc3QsIGNvbnRleHQ7XG5cdFx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgKGogKyBvZmZzZXQpO1xuXG5cdFx0aWYgKG9wID09PSBsY3MuUkVNT1ZFKSB7XG5cdFx0XHQvLyBDb2FsZXNjZSBhZGphY2VudCByZW1vdmUgKyBhZGQgaW50byByZXBsYWNlXG5cdFx0XHRsYXN0ID0gcGF0Y2hbcGF0Y2gubGVuZ3RoLTFdO1xuXHRcdFx0Y29udGV4dCA9IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKTtcblxuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IGExW2pdLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihsYXN0ICE9PSB2b2lkIDAgJiYgbGFzdC5vcCA9PT0gJ2FkZCcgJiYgbGFzdC5wYXRoID09PSBwKSB7XG5cdFx0XHRcdGxhc3Qub3AgPSAncmVwbGFjZSc7XG5cdFx0XHRcdGxhc3QuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRvZmZzZXQgLT0gMTtcblxuXHRcdH0gZWxzZSBpZiAob3AgPT09IGxjcy5BREQpIHtcblx0XHRcdC8vIFNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMiNzZWN0aW9uLTQuMVxuXHRcdFx0Ly8gTWF5IHVzZSBlaXRoZXIgaW5kZXg9PT1sZW5ndGggKm9yKiAnLScgdG8gaW5kaWNhdGUgYXBwZW5kaW5nIHRvIGFycmF5XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwLCB2YWx1ZTogYTJbaV0sXG5cdFx0XHRcdGNvbnRleHQ6IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKVxuXHRcdFx0fSk7XG5cblx0XHRcdG9mZnNldCArPSAxO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGFwcGVuZENoYW5nZXMoYTFbal0sIGEyW2ldLCBwLCBzdGF0ZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0YXRlO1xuXG5cdH0sIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBudW1iZXJ8c3RyaW5nfG51bGwgdmFsdWVzLCBpZiB0aGV5IGRpZmZlciwgYXBwZW5kIHRvIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge29iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihhICE9PSBiKSB7XG5cdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHBhdGgsIHZhbHVlOiBhIH0pO1xuXHRcdH1cblxuXHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYiB9KTtcblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGVcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHsqfSB5XG4gKiBAcmV0dXJucyB7Kn0geCBpZiBwcmVkaWNhdGUoeCkgaXMgdHJ1dGh5LCBvdGhlcndpc2UgeVxuICovXG5mdW5jdGlvbiBvckVsc2UocHJlZGljYXRlLCB4LCB5KSB7XG5cdHJldHVybiBwcmVkaWNhdGUoeCkgPyB4IDogeTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHBhdGNoIGNvbnRleHQgZ2VuZXJhdG9yXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSB1bmRlZmluZWQgY29udGV4dFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Q29udGV4dCgpIHtcblx0cmV0dXJuIHZvaWQgMDtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHggaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yO1xuXG5mdW5jdGlvbiBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjtcblxuZnVuY3Rpb24gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gVGVzdEZhaWxlZEVycm9yO1xuXG5mdW5jdGlvbiBUZXN0RmFpbGVkRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVGVzdEZhaWxlZEVycm9yOyIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbnMgPSBjb25zO1xuZXhwb3J0cy50YWlsID0gdGFpbDtcbmV4cG9ydHMubWFwID0gbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgeCB0byBhLCB3aXRob3V0IG11dGF0aW5nIGEuIEZhc3RlciB0aGFuIGEudW5zaGlmdCh4KVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IHdpdGggeCBwcmVwZW5kZWRcbiAqL1xuZnVuY3Rpb24gY29ucyh4LCBhKSB7XG5cdHZhciBsID0gYS5sZW5ndGg7XG5cdHZhciBiID0gbmV3IEFycmF5KGwrMSk7XG5cdGJbMF0gPSB4O1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2krMV0gPSBhW2ldO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IEFycmF5IGNvbnRhaW5pbmcgYWxsIGVsZW1lbnRzIGluIGEsIGV4Y2VwdCB0aGUgZmlyc3QuXG4gKiAgRmFzdGVyIHRoYW4gYS5zbGljZSgxKVxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSwgdGhlIGVxdWl2YWxlbnQgb2YgYS5zbGljZSgxKVxuICovXG5mdW5jdGlvbiB0YWlsKGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aC0xO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKTtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpXSA9IGFbaSsxXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIE1hcCBhbnkgYXJyYXktbGlrZS4gRmFzdGVyIHRoYW4gQXJyYXkucHJvdG90eXBlLm1hcFxuICogQHBhcmFtIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSBtYXBwZWQgYnkgZlxuICovXG5mdW5jdGlvbiBtYXAoZiwgYSkge1xuXHR2YXIgYiA9IG5ldyBBcnJheShhLmxlbmd0aCk7XG5cdGZvcih2YXIgaT0wOyBpPCBhLmxlbmd0aDsgKytpKSB7XG5cdFx0YltpXSA9IGYoYVtpXSk7XG5cdH1cblx0cmV0dXJuIGI7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qKlxuICogQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHggd2hpY2ggbXVzdCBiZSBhIGxlZ2FsIEpTT04gb2JqZWN0L2FycmF5L3ZhbHVlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIGNsb25lXG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gY2xvbmUgb2YgeFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5mdW5jdGlvbiBjbG9uZSh4KSB7XG5cdGlmKHggPT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRyZXR1cm4gY2xvbmVBcnJheSh4KTtcblx0fVxuXG5cdHJldHVybiBjbG9uZU9iamVjdCh4KTtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoeCkge1xuXHR2YXIgbCA9IHgubGVuZ3RoO1xuXHR2YXIgeSA9IG5ldyBBcnJheShsKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuXHRcdHlbaV0gPSBjbG9uZSh4W2ldKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAoeCkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHgpO1xuXHR2YXIgeSA9IHt9O1xuXG5cdGZvciAodmFyIGssIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRrID0ga2V5c1tpXTtcblx0XHR5W2tdID0gY2xvbmUoeFtrXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcblxuLyoqXG4gKiBjb21tdXRlIHRoZSBwYXRjaCBzZXF1ZW5jZSBhLGIgdG8gYixhXG4gKiBAcGFyYW0ge29iamVjdH0gYSBwYXRjaCBvcGVyYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBiIHBhdGNoIG9wZXJhdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbW11dGVQYXRocyhhLCBiKSB7XG5cdC8vIFRPRE86IGNhc2VzIGZvciBzcGVjaWFsIHBhdGhzOiAnJyBhbmQgJy8nXG5cdHZhciBsZWZ0ID0ganNvblBvaW50ZXIucGFyc2UoYS5wYXRoKTtcblx0dmFyIHJpZ2h0ID0ganNvblBvaW50ZXIucGFyc2UoYi5wYXRoKTtcblx0dmFyIHByZWZpeCA9IGdldENvbW1vblBhdGhQcmVmaXgobGVmdCwgcmlnaHQpO1xuXHR2YXIgaXNBcnJheSA9IGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBwcmVmaXgubGVuZ3RoKTtcblxuXHQvLyBOZXZlciBtdXRhdGUgdGhlIG9yaWdpbmFsc1xuXHR2YXIgYWMgPSBjb3B5UGF0Y2goYSk7XG5cdHZhciBiYyA9IGNvcHlQYXRjaChiKTtcblxuXHRpZihwcmVmaXgubGVuZ3RoID09PSAwICYmICFpc0FycmF5KSB7XG5cdFx0Ly8gUGF0aHMgc2hhcmUgbm8gY29tbW9uIGFuY2VzdG9yLCBzaW1wbGUgc3dhcFxuXHRcdHJldHVybiBbYmMsIGFjXTtcblx0fVxuXG5cdGlmKGlzQXJyYXkpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5UGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGNvbW11dGVUcmVlUGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGNvbW11dGVUcmVlUGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYoYS5wYXRoID09PSBiLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3QgY29tbXV0ZSAnICsgYS5vcCArICcsJyArIGIub3AgKyAnIHdpdGggaWRlbnRpY2FsIG9iamVjdCBwYXRocycpO1xuXHR9XG5cdC8vIEZJWE1FOiBJbXBsZW1lbnQgdHJlZSBwYXRoIGNvbW11dGF0aW9uXG5cdHJldHVybiBbYiwgYV07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aG9zZSBjb21tb24gYW5jZXN0b3IgKHdoaWNoIG1heSBiZSB0aGUgaW1tZWRpYXRlIHBhcmVudClcbiAqIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gYVxuICogQHBhcmFtIGxlZnRcbiAqIEBwYXJhbSBiXG4gKiBAcGFyYW0gcmlnaHRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihsZWZ0Lmxlbmd0aCA9PT0gcmlnaHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVNpYmxpbmdzKGEsIGxlZnQsIGIsIHJpZ2h0KTtcblx0fVxuXG5cdGlmIChsZWZ0Lmxlbmd0aCA+IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdC8vIGxlZnQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIHJpZ2h0XG5cdFx0bGVmdCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGIsIHJpZ2h0LCBhLCBsZWZ0LCAtMSk7XG5cdFx0YS5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihsZWZ0KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gcmlnaHQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIGxlZnRcblx0XHRyaWdodCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGEsIGxlZnQsIGIsIHJpZ2h0LCAxKTtcblx0XHRiLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKHJpZ2h0KSk7XG5cdH1cblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgaW5kZXgpIHtcblx0cmV0dXJuIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KGxlZnRbaW5kZXhdKVxuXHRcdCYmIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KHJpZ2h0W2luZGV4XSk7XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyByZWZlcnJpbmcgdG8gaXRlbXMgaW4gdGhlIHNhbWUgYXJyYXlcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEByZXR1cm5zIHsqW119XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVNpYmxpbmdzKGwsIGxwYXRoLCByLCBycGF0aCkge1xuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0dmFyIGNvbW11dGVkO1xuXG5cdGlmKGxpbmRleCA8IHJpbmRleCkge1xuXHRcdC8vIEFkanVzdCByaWdodCBwYXRoXG5cdFx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gMSk7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gcmluZGV4ICsgMTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9XG5cdH0gZWxzZSBpZihyLm9wID09PSAnYWRkJyB8fCByLm9wID09PSAnY29weScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoXG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBsaW5kZXggKyAxO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fSBlbHNlIGlmIChsaW5kZXggPiByaW5kZXggJiYgci5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoIG9ubHkgaWYgcmVtb3ZlIHdhcyBhdCBhIChzdHJpY3RseSkgbG93ZXIgaW5kZXhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIGxpbmRleCAtIDEpO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fVxuXG5cdHJldHVybiBbciwgbF07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aXRoIGEgY29tbW9uIGFycmF5IGFuY2VzdG9yXG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcGFyYW0gZGlyZWN0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5QW5jZXN0b3IobCwgbHBhdGgsIHIsIHJwYXRoLCBkaXJlY3Rpb24pIHtcblx0Ly8gcnBhdGggaXMgbG9uZ2VyIG9yIHNhbWUgbGVuZ3RoXG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHQvLyBDb3B5IHJwYXRoLCB0aGVuIGFkanVzdCBpdHMgYXJyYXkgaW5kZXhcblx0dmFyIHJjID0gcnBhdGguc2xpY2UoKTtcblxuXHRpZihsaW5kZXggPiByaW5kZXgpIHtcblx0XHRyZXR1cm4gcmM7XG5cdH1cblxuXHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gZGlyZWN0aW9uKTtcblx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCArIGRpcmVjdGlvbik7XG5cdH1cblxuXHRyZXR1cm4gcmM7XG59XG5cbmZ1bmN0aW9uIGdldENvbW1vblBhdGhQcmVmaXgocDEsIHAyKSB7XG5cdHZhciBwMWwgPSBwMS5sZW5ndGg7XG5cdHZhciBwMmwgPSBwMi5sZW5ndGg7XG5cdGlmKHAxbCA9PT0gMCB8fCBwMmwgPT09IDAgfHwgKHAxbCA8IDIgJiYgcDJsIDwgMikpIHtcblx0XHRyZXR1cm4gW107XG5cdH1cblxuXHQvLyBJZiBwYXRocyBhcmUgc2FtZSBsZW5ndGgsIHRoZSBsYXN0IHNlZ21lbnQgY2Fubm90IGJlIHBhcnRcblx0Ly8gb2YgYSBjb21tb24gcHJlZml4LiAgSWYgbm90IHRoZSBzYW1lIGxlbmd0aCwgdGhlIHByZWZpeCBjYW5ub3Rcblx0Ly8gYmUgbG9uZ2VyIHRoYW4gdGhlIHNob3J0ZXIgcGF0aC5cblx0dmFyIGwgPSBwMWwgPT09IHAybFxuXHRcdD8gcDFsIC0gMVxuXHRcdDogTWF0aC5taW4ocDFsLCBwMmwpO1xuXG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgcDFbaV0gPT09IHAyW2ldKSB7XG5cdFx0KytpXG5cdH1cblxuXHRyZXR1cm4gcDEuc2xpY2UoMCwgaSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlQYXRjaChwKSB7XG5cdGlmKHAub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCB9O1xuXHR9XG5cblx0aWYocC5vcCA9PT0gJ2NvcHknIHx8IHAub3AgPT09ICdtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIGZyb206IHAuZnJvbSB9O1xuXHR9XG5cblx0Ly8gdGVzdCwgYWRkLCByZXBsYWNlXG5cdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIHZhbHVlOiBwLnZhbHVlIH07XG59IiwibW9kdWxlLmV4cG9ydHMgPSBkZWVwRXF1YWxzO1xuXG4vKipcbiAqIENvbXBhcmUgMiBKU09OIHZhbHVlcywgb3IgcmVjdXJzaXZlbHkgY29tcGFyZSAyIEpTT04gb2JqZWN0cyBvciBhcnJheXNcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYlxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIGEgYW5kIGIgYXJlIHJlY3Vyc2l2ZWx5IGVxdWFsXG4gKi9cbmZ1bmN0aW9uIGRlZXBFcXVhbHMoYSwgYikge1xuXHRpZihhID09PSBiKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gY29tcGFyZUFycmF5cyhhLCBiKTtcblx0fVxuXG5cdGlmKHR5cGVvZiBhID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gY29tcGFyZU9iamVjdHMoYSwgYik7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYSwgYikge1xuXHRpZihhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwOyBpPGEubGVuZ3RoOyArK2kpIHtcblx0XHRpZighZGVlcEVxdWFscyhhW2ldLCBiW2ldKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlT2JqZWN0cyhhLCBiKSB7XG5cdGlmKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGFrZXlzID0gT2JqZWN0LmtleXMoYSk7XG5cdHZhciBia2V5cyA9IE9iamVjdC5rZXlzKGIpO1xuXG5cdGlmKGFrZXlzLmxlbmd0aCAhPT0gYmtleXMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMCwgazsgaTxha2V5cy5sZW5ndGg7ICsraSkge1xuXHRcdGsgPSBha2V5c1tpXTtcblx0XHRpZighKGsgaW4gYiAmJiBkZWVwRXF1YWxzKGFba10sIGJba10pKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufSIsInZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW52ZXJzZShwKSB7XG5cdHZhciBwciA9IFtdO1xuXHR2YXIgaSwgc2tpcDtcblx0Zm9yKGkgPSBwLmxlbmd0aC0xOyBpPj0gMDsgaSAtPSBza2lwKSB7XG5cdFx0c2tpcCA9IGludmVydE9wKHByLCBwW2ldLCBpLCBwKTtcblx0fVxuXG5cdHJldHVybiBwcjtcbn07XG5cbmZ1bmN0aW9uIGludmVydE9wKHBhdGNoLCBjLCBpLCBjb250ZXh0KSB7XG5cdHZhciBvcCA9IHBhdGNoZXNbYy5vcF07XG5cdHJldHVybiBvcCAhPT0gdm9pZCAwICYmIHR5cGVvZiBvcC5pbnZlcnNlID09PSAnZnVuY3Rpb24nXG5cdFx0PyBvcC5pbnZlcnNlKHBhdGNoLCBjLCBpLCBjb250ZXh0KVxuXHRcdDogMTtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuXG5leHBvcnRzLmFwcGx5ID0gcGF0Y2g7XG5leHBvcnRzLmFwcGx5SW5QbGFjZSA9IHBhdGNoSW5QbGFjZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuaXNWYWxpZE9iamVjdCA9IGlzVmFsaWRPYmplY3Q7XG5leHBvcnRzLmRlZmF1bHRIYXNoID0gZGVmYXVsdEhhc2g7XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuXG4vKipcbiAqIEFwcGx5IHRoZSBzdXBwbGllZCBKU09OIFBhdGNoIHRvIHhcbiAqIEBwYXJhbSB7YXJyYXl9IGNoYW5nZXMgSlNPTiBQYXRjaFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IG9wdGlvbnMuZmluZENvbnRleHRcbiAqICBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0XG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHBhdGNoZWQgdmVyc2lvbiBvZiB4LiBJZiB4IGlzXG4gKiAgYW4gYXJyYXkgb3Igb2JqZWN0LCBpdCB3aWxsIGJlIG11dGF0ZWQgYW5kIHJldHVybmVkLiBPdGhlcndpc2UsIGlmXG4gKiAgeCBpcyBhIHZhbHVlLCB0aGUgbmV3IHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIHBhdGNoKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0cmV0dXJuIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCBjbG9uZSh4KSwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdGlmKCFvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXHR9XG5cblx0Ly8gVE9ETzogQ29uc2lkZXIgdGhyb3dpbmcgaWYgY2hhbmdlcyBpcyBub3QgYW4gYXJyYXlcblx0aWYoIUFycmF5LmlzQXJyYXkoY2hhbmdlcykpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdHZhciBwYXRjaCwgcDtcblx0Zm9yKHZhciBpPTA7IGk8Y2hhbmdlcy5sZW5ndGg7ICsraSkge1xuXHRcdHAgPSBjaGFuZ2VzW2ldO1xuXHRcdHBhdGNoID0gcGF0Y2hlc1twLm9wXTtcblxuXHRcdGlmKHBhdGNoID09PSB2b2lkIDApIHtcblx0XHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignaW52YWxpZCBvcCAnICsgSlNPTi5zdHJpbmdpZnkocCkpO1xuXHRcdH1cblxuXHRcdHggPSBwYXRjaC5hcHBseSh4LCBwLCBvcHRpb25zKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0SGFzaCh4KSB7XG5cdHJldHVybiBpc1ZhbGlkT2JqZWN0KHgpID8gSlNPTi5zdHJpbmdpZnkoeCkgOiB4O1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIF9wYXJzZSA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXJQYXJzZScpO1xuXG5leHBvcnRzLmZpbmQgPSBmaW5kO1xuZXhwb3J0cy5qb2luID0gam9pbjtcbmV4cG9ydHMuYWJzb2x1dGUgPSBhYnNvbHV0ZTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMuZW5jb2RlU2VnbWVudCA9IGVuY29kZVNlZ21lbnQ7XG5leHBvcnRzLmRlY29kZVNlZ21lbnQgPSBkZWNvZGVTZWdtZW50O1xuZXhwb3J0cy5wYXJzZUFycmF5SW5kZXggPSBwYXJzZUFycmF5SW5kZXg7XG5leHBvcnRzLmlzVmFsaWRBcnJheUluZGV4ID0gaXNWYWxpZEFycmF5SW5kZXg7XG5cbi8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0yXG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIHNlcGFyYXRvclJ4ID0gL1xcLy9nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xudmFyIGVuY29kZWRTZXBhcmF0b3JSeCA9IC9+MS9nO1xuXG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlc2NhcGVSeCA9IC9+L2c7XG52YXIgZW5jb2RlZEVzY2FwZSA9ICd+MCc7XG52YXIgZW5jb2RlZEVzY2FwZVJ4ID0gL34wL2c7XG5cbi8qKlxuICogRmluZCB0aGUgcGFyZW50IG9mIHRoZSBzcGVjaWZpZWQgcGF0aCBpbiB4IGFuZCByZXR1cm4gYSBkZXNjcmlwdG9yXG4gKiBjb250YWluaW5nIHRoZSBwYXJlbnQgYW5kIGEga2V5LiAgSWYgdGhlIHBhcmVudCBkb2VzIG5vdCBleGlzdCBpbiB4LFxuICogcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZC5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4IG9iamVjdCBvciBhcnJheSBpbiB3aGljaCB0byBzZWFyY2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEpTT04gUG9pbnRlciBzdHJpbmcgKGVuY29kZWQpXG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBmaW5kQ29udGV4dFxuICogIG9wdGlvbmFsIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHQuICBJZiBwcm92aWRlZCwgY29udGV4dCBNVVNUIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcGFyYW0gez97YmVmb3JlOkFycmF5LCBhZnRlcjpBcnJheX19IGNvbnRleHQgb3B0aW9uYWwgcGF0Y2ggY29udGV4dCBmb3JcbiAqICBmaW5kQ29udGV4dCB0byB1c2UgdG8gYWRqdXN0IGFycmF5IGluZGljZXMuICBJZiBwcm92aWRlZCwgZmluZENvbnRleHQgTVVTVFxuICogIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcmV0dXJucyB7e3RhcmdldDpvYmplY3R8YXJyYXl8bnVtYmVyfHN0cmluZywga2V5OnN0cmluZ318dW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kKHgsIHBhdGgsIGZpbmRDb250ZXh0LCBjb250ZXh0KSB7XG5cdGlmKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmKHBhdGggPT09ICcnKSB7XG5cdFx0Ly8gd2hvbGUgZG9jdW1lbnRcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogdm9pZCAwIH07XG5cdH1cblxuXHRpZihwYXRoID09PSBzZXBhcmF0b3IpIHtcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogJycgfTtcblx0fVxuXG5cdHZhciBwYXJlbnQgPSB4LCBrZXk7XG5cdHZhciBoYXNDb250ZXh0ID0gY29udGV4dCAhPT0gdm9pZCAwO1xuXG5cdF9wYXJzZShwYXRoLCBmdW5jdGlvbihzZWdtZW50KSB7XG5cdFx0Ly8gaG0uLi4gdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBiZSBpZih0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0aWYoeCA9PSBudWxsKSB7XG5cdFx0XHQvLyBTaWduYWwgdGhhdCB3ZSBwcmVtYXR1cmVseSBoaXQgdGhlIGVuZCBvZiB0aGUgcGF0aCBoaWVyYXJjaHkuXG5cdFx0XHRwYXJlbnQgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRcdGtleSA9IGhhc0NvbnRleHRcblx0XHRcdFx0PyBmaW5kSW5kZXgoZmluZENvbnRleHQsIHBhcnNlQXJyYXlJbmRleChzZWdtZW50KSwgeCwgY29udGV4dClcblx0XHRcdFx0OiBzZWdtZW50ID09PSAnLScgPyBzZWdtZW50IDogcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXkgPSBzZWdtZW50O1xuXHRcdH1cblxuXHRcdHBhcmVudCA9IHg7XG5cdFx0eCA9IHhba2V5XTtcblx0fSk7XG5cblx0cmV0dXJuIHBhcmVudCA9PT0gbnVsbFxuXHRcdD8gdm9pZCAwXG5cdFx0OiB7IHRhcmdldDogcGFyZW50LCBrZXk6IGtleSB9O1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZShwYXRoKSB7XG5cdHJldHVybiBwYXRoWzBdID09PSBzZXBhcmF0b3IgPyBwYXRoIDogc2VwYXJhdG9yICsgcGF0aDtcbn1cblxuZnVuY3Rpb24gam9pbihzZWdtZW50cykge1xuXHRyZXR1cm4gc2VnbWVudHMuam9pbihzZXBhcmF0b3IpO1xufVxuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG5cdHZhciBzZWdtZW50cyA9IFtdO1xuXHRfcGFyc2UocGF0aCwgc2VnbWVudHMucHVzaC5iaW5kKHNlZ21lbnRzKSk7XG5cdHJldHVybiBzZWdtZW50cztcbn1cblxuZnVuY3Rpb24gY29udGFpbnMoYSwgYikge1xuXHRyZXR1cm4gYi5pbmRleE9mKGEpID09PSAwICYmIGJbYS5sZW5ndGhdID09PSBzZXBhcmF0b3I7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZW5jb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBkZWNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZGVjb2RlU2VnbWVudChzKSB7XG5cdC8vIFNlZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcblx0cmV0dXJuIHMucmVwbGFjZShlbmNvZGVkU2VwYXJhdG9yUngsIHNlcGFyYXRvcikucmVwbGFjZShlbmNvZGVkRXNjYXBlUngsIGVzY2FwZUNoYXIpO1xufVxuXG4vKipcbiAqIEVuY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGRlY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZW5jb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGVuY29kZVNlZ21lbnQocykge1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVzY2FwZVJ4LCBlbmNvZGVkRXNjYXBlKS5yZXBsYWNlKHNlcGFyYXRvclJ4LCBlbmNvZGVkU2VwYXJhdG9yKTtcbn1cblxudmFyIGFycmF5SW5kZXhSeCA9IC9eKDB8WzEtOV1cXGQqKSQvO1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHMgaXMgYSB2YWxpZCBKU09OIFBvaW50ZXIgYXJyYXkgaW5kZXhcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXgocykge1xuXHRyZXR1cm4gYXJyYXlJbmRleFJ4LnRlc3Qocyk7XG59XG5cbi8qKlxuICogU2FmZWx5IHBhcnNlIGEgc3RyaW5nIGludG8gYSBudW1iZXIgPj0gMC4gRG9lcyBub3QgY2hlY2sgZm9yIGRlY2ltYWwgbnVtYmVyc1xuICogQHBhcmFtIHtzdHJpbmd9IHMgbnVtZXJpYyBzdHJpbmdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IG51bWJlciA+PSAwXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleCAocykge1xuXHRpZihpc1ZhbGlkQXJyYXlJbmRleChzKSkge1xuXHRcdHJldHVybiArcztcblx0fVxuXG5cdHRocm93IG5ldyBTeW50YXhFcnJvcignaW52YWxpZCBhcnJheSBpbmRleCAnICsgcyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbmRleCAoZmluZENvbnRleHQsIHN0YXJ0LCBhcnJheSwgY29udGV4dCkge1xuXHR2YXIgaW5kZXggPSBzdGFydDtcblxuXHRpZihpbmRleCA8IDApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2FycmF5IGluZGV4IG91dCBvZiBib3VuZHMgJyArIGluZGV4KTtcblx0fVxuXG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCAmJiB0eXBlb2YgZmluZENvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRpbmRleCA9IGZpbmRDb250ZXh0KHN0YXJ0LCBhcnJheSwgY29udGV4dCk7XG5cdFx0aWYoaW5kZXggPCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIHBhdGNoIGNvbnRleHQgJyArIGNvbnRleHQpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBpbmRleDtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uUG9pbnRlclBhcnNlO1xuXG52YXIgcGFyc2VSeCA9IC9cXC98fjF8fjAvZztcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcblxuLyoqXG4gKiBQYXJzZSB0aHJvdWdoIGFuIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZywgZGVjb2RpbmcgZWFjaCBwYXRoIHNlZ21lbnRcbiAqIGFuZCBwYXNzaW5nIGl0IHRvIGFuIG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjc2VjdGlvbi00XG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmdcbiAqIEBwYXJhbSB7e2Z1bmN0aW9uKHNlZ21lbnQ6c3RyaW5nKTpib29sZWFufX0gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBvcmlnaW5hbCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGpzb25Qb2ludGVyUGFyc2UocGF0aCwgb25TZWdtZW50KSB7XG5cdHZhciBwb3MsIGFjY3VtLCBtYXRjaGVzLCBtYXRjaDtcblxuXHRwb3MgPSBwYXRoLmNoYXJBdCgwKSA9PT0gc2VwYXJhdG9yID8gMSA6IDA7XG5cdGFjY3VtID0gJyc7XG5cdHBhcnNlUngubGFzdEluZGV4ID0gcG9zO1xuXG5cdHdoaWxlKG1hdGNoZXMgPSBwYXJzZVJ4LmV4ZWMocGF0aCkpIHtcblxuXHRcdG1hdGNoID0gbWF0Y2hlc1swXTtcblx0XHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcywgcGFyc2VSeC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuXHRcdHBvcyA9IHBhcnNlUngubGFzdEluZGV4O1xuXG5cdFx0aWYobWF0Y2ggPT09IHNlcGFyYXRvcikge1xuXHRcdFx0aWYgKG9uU2VnbWVudChhY2N1bSkgPT09IGZhbHNlKSByZXR1cm4gcGF0aDtcblx0XHRcdGFjY3VtID0gJyc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFjY3VtICs9IG1hdGNoID09PSBlbmNvZGVkU2VwYXJhdG9yID8gc2VwYXJhdG9yIDogZXNjYXBlQ2hhcjtcblx0XHR9XG5cdH1cblxuXHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcyk7XG5cdG9uU2VnbWVudChhY2N1bSk7XG5cblx0cmV0dXJuIHBhdGg7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb21wYXJlID0gY29tcGFyZTtcbmV4cG9ydHMucmVkdWNlID0gcmVkdWNlO1xuXG52YXIgUkVNT1ZFLCBSSUdIVCwgQURELCBET1dOLCBTS0lQO1xuXG5leHBvcnRzLlJFTU9WRSA9IFJFTU9WRSA9IFJJR0hUID0gLTE7XG5leHBvcnRzLkFERCAgICA9IEFERCAgICA9IERPV04gID0gIDE7XG5leHBvcnRzLkVRVUFMICA9IFNLSVAgICA9IDA7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGxjcyBjb21wYXJpc29uIG1hdHJpeCBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlc1xuICogYmV0d2VlbiB0d28gYXJyYXktbGlrZSBzZXF1ZW5jZXNcbiAqIEBwYXJhbSB7YXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHBhcmFtIHthcnJheX0gYiBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBsY3MgZGVzY3JpcHRvciwgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcmVkdWNlKClcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG5cdHZhciBjb2xzID0gYS5sZW5ndGg7XG5cdHZhciByb3dzID0gYi5sZW5ndGg7XG5cblx0dmFyIHByZWZpeCA9IGZpbmRQcmVmaXgoYSwgYik7XG5cdHZhciBzdWZmaXggPSBwcmVmaXggPCBjb2xzICYmIHByZWZpeCA8IHJvd3Ncblx0XHQ/IGZpbmRTdWZmaXgoYSwgYiwgcHJlZml4KVxuXHRcdDogMDtcblxuXHR2YXIgcmVtb3ZlID0gc3VmZml4ICsgcHJlZml4IC0gMTtcblx0Y29scyAtPSByZW1vdmU7XG5cdHJvd3MgLT0gcmVtb3ZlO1xuXHR2YXIgbWF0cml4ID0gY3JlYXRlTWF0cml4KGNvbHMsIHJvd3MpO1xuXG5cdGZvciAodmFyIGogPSBjb2xzIC0gMTsgaiA+PSAwOyAtLWopIHtcblx0XHRmb3IgKHZhciBpID0gcm93cyAtIDE7IGkgPj0gMDsgLS1pKSB7XG5cdFx0XHRtYXRyaXhbaV1bal0gPSBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBwcmVmaXgsIGosIGkpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0cHJlZml4OiBwcmVmaXgsXG5cdFx0bWF0cml4OiBtYXRyaXgsXG5cdFx0c3VmZml4OiBzdWZmaXhcblx0fTtcbn1cblxuLyoqXG4gKiBSZWR1Y2UgYSBzZXQgb2YgbGNzIGNoYW5nZXMgcHJldmlvdXNseSBjcmVhdGVkIHVzaW5nIGNvbXBhcmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24ocmVzdWx0OiosIHR5cGU6bnVtYmVyLCBpOm51bWJlciwgajpudW1iZXIpfSBmXG4gKiAgcmVkdWNlciBmdW5jdGlvbiwgd2hlcmU6XG4gKiAgLSByZXN1bHQgaXMgdGhlIGN1cnJlbnQgcmVkdWNlIHZhbHVlLFxuICogIC0gdHlwZSBpcyB0aGUgdHlwZSBvZiBjaGFuZ2U6IEFERCwgUkVNT1ZFLCBvciBTS0lQXG4gKiAgLSBpIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGJcbiAqICAtIGogaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYVxuICogQHBhcmFtIHsqfSByIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3MgcmVzdWx0cyByZXR1cm5lZCBieSBjb21wYXJlKClcbiAqIEByZXR1cm5zIHsqfSB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuICovXG5mdW5jdGlvbiByZWR1Y2UoZiwgciwgbGNzKSB7XG5cdHZhciBpLCBqLCBrLCBvcDtcblxuXHR2YXIgbSA9IGxjcy5tYXRyaXg7XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBwcmVmaXhcblx0dmFyIGwgPSBsY3MucHJlZml4O1xuXHRmb3IoaSA9IDA7aSA8IGw7ICsraSkge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGksIGkpO1xuXHR9XG5cblx0Ly8gUmVkdWNlIGxvbmdlc3QgY2hhbmdlIHNwYW5cblx0ayA9IGk7XG5cdGwgPSBtLmxlbmd0aDtcblx0aSA9IDA7XG5cdGogPSAwO1xuXHR3aGlsZShpIDwgbCkge1xuXHRcdG9wID0gbVtpXVtqXS50eXBlO1xuXHRcdHIgPSBmKHIsIG9wLCBpK2ssIGorayk7XG5cblx0XHRzd2l0Y2gob3ApIHtcblx0XHRcdGNhc2UgU0tJUDogICsraTsgKytqOyBicmVhaztcblx0XHRcdGNhc2UgUklHSFQ6ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIERPV046ICArK2k7IGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlZHVjZSBzaGFyZWQgc3VmZml4XG5cdGkgKz0gaztcblx0aiArPSBrO1xuXHRsID0gbGNzLnN1ZmZpeDtcblx0Zm9yKGsgPSAwO2sgPCBsOyArK2spIHtcblx0XHRyID0gZihyLCBTS0lQLCBpK2ssIGorayk7XG5cdH1cblxuXHRyZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gZmluZFByZWZpeChhLCBiKSB7XG5cdHZhciBpID0gMDtcblx0dmFyIGwgPSBNYXRoLm1pbihhLmxlbmd0aCwgYi5sZW5ndGgpO1xuXHR3aGlsZShpIDwgbCAmJiBhW2ldID09PSBiW2ldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBmaW5kU3VmZml4KGEsIGIpIHtcblx0dmFyIGFsID0gYS5sZW5ndGggLSAxO1xuXHR2YXIgYmwgPSBiLmxlbmd0aCAtIDE7XG5cdHZhciBsID0gTWF0aC5taW4oYWwsIGJsKTtcblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBhW2FsLWldID09PSBiW2JsLWldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBzdGFydCwgaiwgaSkge1xuXHRpZiAoYVtqK3N0YXJ0XSA9PT0gYltpK3N0YXJ0XSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2ogKyAxXS52YWx1ZSwgdHlwZTogU0tJUCB9O1xuXHR9XG5cdGlmIChtYXRyaXhbaV1baiArIDFdLnZhbHVlIDwgbWF0cml4W2kgKyAxXVtqXS52YWx1ZSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaV1baiArIDFdLnZhbHVlICsgMSwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2pdLnZhbHVlICsgMSwgdHlwZTogRE9XTiB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYXRyaXggKGNvbHMsIHJvd3MpIHtcblx0dmFyIG0gPSBbXSwgaSwgaiwgbGFzdHJvdztcblxuXHQvLyBGaWxsIHRoZSBsYXN0IHJvd1xuXHRsYXN0cm93ID0gbVtyb3dzXSA9IFtdO1xuXHRmb3IgKGogPSAwOyBqPGNvbHM7ICsraikge1xuXHRcdGxhc3Ryb3dbal0gPSB7IHZhbHVlOiBjb2xzIC0gaiwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY29sXG5cdGZvciAoaSA9IDA7IGk8cm93czsgKytpKSB7XG5cdFx0bVtpXSA9IFtdO1xuXHRcdG1baV1bY29sc10gPSB7IHZhbHVlOiByb3dzIC0gaSwgdHlwZTogRE9XTiB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjZWxsXG5cdG1bcm93c11bY29sc10gPSB7IHZhbHVlOiAwLCB0eXBlOiBTS0lQIH07XG5cblx0cmV0dXJuIG07XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgZGVlcEVxdWFscyA9IHJlcXVpcmUoJy4vZGVlcEVxdWFscycpO1xudmFyIGNvbW11dGVQYXRocyA9IHJlcXVpcmUoJy4vY29tbXV0ZVBhdGhzJyk7XG5cbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxudmFyIFRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vVGVzdEZhaWxlZEVycm9yJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG52YXIgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBmaW5kID0ganNvblBvaW50ZXIuZmluZDtcbnZhciBwYXJzZUFycmF5SW5kZXggPSBqc29uUG9pbnRlci5wYXJzZUFycmF5SW5kZXg7XG5cbmV4cG9ydHMudGVzdCA9IHtcblx0YXBwbHk6IGFwcGx5VGVzdCxcblx0aW52ZXJzZTogaW52ZXJ0VGVzdCxcblx0Y29tbXV0ZTogY29tbXV0ZVRlc3Rcbn07XG5cbmV4cG9ydHMuYWRkID0ge1xuXHRhcHBseTogYXBwbHlBZGQsXG5cdGludmVyc2U6IGludmVydEFkZCxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuZXhwb3J0cy5yZW1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseVJlbW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVtb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVtb3ZlXG59O1xuXG5leHBvcnRzLnJlcGxhY2UgPSB7XG5cdGFwcGx5OiBhcHBseVJlcGxhY2UsXG5cdGludmVyc2U6IGludmVydFJlcGxhY2UsXG5cdGNvbW11dGU6IGNvbW11dGVSZXBsYWNlXG59O1xuXG5leHBvcnRzLm1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseU1vdmUsXG5cdGludmVyc2U6IGludmVydE1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVNb3ZlXG59O1xuXG5leHBvcnRzLmNvcHkgPSB7XG5cdGFwcGx5OiBhcHBseUNvcHksXG5cdGludmVyc2U6IG5vdEludmVydGlibGUsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbi8qKlxuICogQXBwbHkgYSB0ZXN0IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IHRlc3QgdGVzdCBvcGVyYXRpb25cbiAqIEB0aHJvd3Mge1Rlc3RGYWlsZWRFcnJvcn0gaWYgdGhlIHRlc3Qgb3BlcmF0aW9uIGZhaWxzXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlUZXN0KHgsIHRlc3QsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIHRlc3QucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgdGVzdC5jb250ZXh0KTtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXHR2YXIgaW5kZXgsIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdGluZGV4ID0gcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KTtcblx0XHQvL2luZGV4ID0gZmluZEluZGV4KG9wdGlvbnMuZmluZENvbnRleHQsIGluZGV4LCB0YXJnZXQsIHRlc3QuY29udGV4dCk7XG5cdFx0dmFsdWUgPSB0YXJnZXRbaW5kZXhdO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gcG9pbnRlci5rZXkgPT09IHZvaWQgMCA/IHBvaW50ZXIudGFyZ2V0IDogcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldO1xuXHR9XG5cblx0aWYoIWRlZXBFcXVhbHModmFsdWUsIHRlc3QudmFsdWUpKSB7XG5cdFx0dGhyb3cgbmV3IFRlc3RGYWlsZWRFcnJvcigndGVzdCBmYWlsZWQgJyArIEpTT04uc3RyaW5naWZ5KHRlc3QpKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG4vKipcbiAqIEludmVydCB0aGUgcHJvdmlkZWQgdGVzdCBhbmQgYWRkIGl0IHRvIHRoZSBpbnZlcnRlZCBwYXRjaCBzZXF1ZW5jZVxuICogQHBhcmFtIHByXG4gKiBAcGFyYW0gdGVzdFxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gaW52ZXJ0VGVzdChwciwgdGVzdCkge1xuXHRwci5wdXNoKHRlc3QpO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVRlc3QodGVzdCwgYikge1xuXHRpZih0ZXN0LnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSB0ZXN0LHJlbW92ZSAtPiByZW1vdmUsdGVzdCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCB0ZXN0XTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHModGVzdCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYW4gYWRkIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBhZGQgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5QWRkKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbCA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWw7XG5cdH1cblxuXHRfYWRkKHBvaW50ZXIsIHZhbCk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfYWRkKHBvaW50ZXIsIHZhbHVlKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHQvLyAnLScgaW5kaWNhdGVzICdhcHBlbmQnIHRvIGFycmF5XG5cdFx0aWYocG9pbnRlci5rZXkgPT09ICctJykge1xuXHRcdFx0dGFyZ2V0LnB1c2godmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuc3BsaWNlKHBvaW50ZXIua2V5LCAwLCB2YWx1ZSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIGFkZCBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheSAnICsgcG9pbnRlci5rZXkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydEFkZChwciwgYWRkKSB7XG5cdHZhciBjb250ZXh0ID0gYWRkLmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMoYWRkLnZhbHVlLCBjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogYWRkLnBhdGgsIHZhbHVlOiBhZGQudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IGFkZC5wYXRoLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZUFkZE9yQ29weShhZGQsIGIpIHtcblx0aWYoYWRkLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBhZGQscmVtb3ZlIC0+IHJlbW92ZSxhZGQgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhhZGQsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVwbGFjZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVwbGFjZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZXBsYWNlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBtaXNzaW5nVmFsdWUocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWx1ZSA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVwbGFjZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlcGxhY2Ugdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKHByZXYudmFsdWUsIGFycmF5LnRhaWwoY29udGV4dC5hZnRlcikpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IGMudmFsdWUgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlIH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlcGxhY2UocmVwbGFjZSwgYikge1xuXHRpZihyZXBsYWNlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSByZXBsYWNlLHJlbW92ZSAtPiByZW1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCByZXBsYWNlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVwbGFjZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZW1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZW1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdC8vIGtleSBtdXN0IGV4aXN0IGZvciByZW1vdmVcblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDApIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdF9yZW1vdmUocG9pbnRlcik7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlIChwb2ludGVyKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHR2YXIgcmVtb3ZlZDtcblx0aWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXQuc3BsaWNlKHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSksIDEpO1xuXHRcdHJldHVybiByZW1vdmVkWzBdO1xuXG5cdH0gZWxzZSBpZiAoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0ZGVsZXRlIHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0cmV0dXJuIHJlbW92ZWQ7XG5cblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiByZW1vdmUgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXknKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRSZW1vdmUocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZW1vdmUgdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZW1vdmUocmVtb3ZlLCBiKSB7XG5cdGlmKHJlbW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlbW92ZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlbW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseU1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdGlmKGpzb25Qb2ludGVyLmNvbnRhaW5zKGNoYW5nZS5wYXRoLCBjaGFuZ2UuZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ21vdmUuZnJvbSBjYW5ub3QgYmUgYW5jZXN0b3Igb2YgbW92ZS5wYXRoJyk7XG5cdH1cblxuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdF9hZGQocHRvLCBfcmVtb3ZlKHBmcm9tKSk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRNb3ZlKHByLCBjKSB7XG5cdHByLnB1c2goeyBvcDogJ21vdmUnLFxuXHRcdHBhdGg6IGMuZnJvbSwgY29udGV4dDogYy5mcm9tQ29udGV4dCxcblx0XHRmcm9tOiBjLnBhdGgsIGZyb21Db250ZXh0OiBjLmNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlTW92ZShtb3ZlLCBiKSB7XG5cdGlmKG1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIG1vdmUscmVtb3ZlIC0+IG1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKG1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgY29weSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgY29weSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlDb3B5KHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBmcm9tKSB8fCBtaXNzaW5nVmFsdWUocGZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdjb3B5LmZyb20gbXVzdCBleGlzdCcpO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBmcm9tLnRhcmdldDtcblx0dmFyIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwZnJvbS5rZXkpXTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwZnJvbS5rZXldO1xuXHR9XG5cblx0X2FkZChwdG8sIGNsb25lKHZhbHVlKSk7XG5cdHJldHVybiB4O1xufVxuXG4vLyBOT1RFOiBDb3B5IGlzIG5vdCBpbnZlcnRpYmxlXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy9qaWZmL2lzc3Vlcy85XG4vLyBUaGlzIG5lZWRzIG1vcmUgdGhvdWdodC4gV2UgbWF5IGhhdmUgdG8gZXh0ZW5kL2FtZW5kIEpTT04gUGF0Y2guXG4vLyBBdCBmaXJzdCBnbGFuY2UsIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQganVzdCBiZSBhIHJlbW92ZS5cbi8vIEhvd2V2ZXIsIHRoYXQncyBub3QgY29ycmVjdC4gIEl0IHZpb2xhdGVzIHRoZSBpbnZvbHV0aW9uOlxuLy8gaW52ZXJ0KGludmVydChwKSkgfj0gcC4gIEZvciBleGFtcGxlOlxuLy8gaW52ZXJ0KGNvcHkpIC0+IHJlbW92ZVxuLy8gaW52ZXJ0KHJlbW92ZSkgLT4gYWRkXG4vLyB0aHVzOiBpbnZlcnQoaW52ZXJ0KGNvcHkpKSAtPiBhZGQgKERPSCEgdGhpcyBzaG91bGQgYmUgY29weSEpXG5cbmZ1bmN0aW9uIG5vdEludmVydGlibGUoXywgYykge1xuXHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgJyArIGMub3ApO1xufVxuXG5mdW5jdGlvbiBub3RGb3VuZCAocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlciA9PT0gdm9pZCAwIHx8IChwb2ludGVyLnRhcmdldCA9PSBudWxsICYmIHBvaW50ZXIua2V5ICE9PSB2b2lkIDApO1xufVxuXG5mdW5jdGlvbiBtaXNzaW5nVmFsdWUocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlci5rZXkgIT09IHZvaWQgMCAmJiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB4IGlzIGEgbm9uLW51bGwgb2JqZWN0XG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0Jztcbn1cbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xuXG5DbG91ZEZpbGVNYW5hZ2VyVUkgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSVxuXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcblJlYWRPbmx5UHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlcidcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcblxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XG5DbG91ZENvbnRlbnQgPSAocmVxdWlyZSAnLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRDb250ZW50XG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIEBzdGF0ZSA9XG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXG4gICAgQF9saXN0ZW5lcnMgPSBbXVxuICAgIEBfcmVzZXRTdGF0ZSgpXG4gICAgQF91aSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUkgQFxuICAgIEBwcm92aWRlcnMgPSB7fVxuXG4gIHNldEFwcE9wdGlvbnM6IChAYXBwT3B0aW9ucyA9IHt9KS0+XG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xuICAgIGFsbFByb3ZpZGVycyA9IHt9XG4gICAgZm9yIFByb3ZpZGVyIGluIFtSZWFkT25seVByb3ZpZGVyLCBMb2NhbFN0b3JhZ2VQcm92aWRlciwgR29vZ2xlRHJpdmVQcm92aWRlciwgRG9jdW1lbnRTdG9yZVByb3ZpZGVyXVxuICAgICAgaWYgUHJvdmlkZXIuQXZhaWxhYmxlKClcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcblxuICAgICMgZGVmYXVsdCB0byBhbGwgcHJvdmlkZXJzIGlmIG5vbiBzcGVjaWZpZWRcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXG4gICAgICBAYXBwT3B0aW9ucy5wcm92aWRlcnMgPSBbXVxuICAgICAgZm9yIG93biBwcm92aWRlck5hbWUgb2YgYWxsUHJvdmlkZXJzXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXG5cbiAgICAjIGNoZWNrIHRoZSBwcm92aWRlcnNcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxuICAgIGZvciBwcm92aWRlciBpbiBAYXBwT3B0aW9ucy5wcm92aWRlcnNcbiAgICAgIFtwcm92aWRlck5hbWUsIHByb3ZpZGVyT3B0aW9uc10gPSBpZiBpc1N0cmluZyBwcm92aWRlciB0aGVuIFtwcm92aWRlciwge31dIGVsc2UgW3Byb3ZpZGVyLm5hbWUsIHByb3ZpZGVyXVxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxuICAgICAgcHJvdmlkZXJPcHRpb25zLm1pbWVUeXBlID89IEBhcHBPcHRpb25zLm1pbWVUeXBlXG4gICAgICBpZiBub3QgcHJvdmlkZXJOYW1lXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXG4gICAgICBlbHNlXG4gICAgICAgIGlmIGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxuICAgICAgICAgIHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9ucywgQFxuICAgICAgICAgIEBwcm92aWRlcnNbcHJvdmlkZXJOYW1lXSA9IHByb3ZpZGVyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEBfZXJyb3IgXCJVbmtub3duIHByb3ZpZGVyOiAje3Byb3ZpZGVyTmFtZX1cIlxuICAgIEBfc2V0U3RhdGUgYXZhaWxhYmxlUHJvdmlkZXJzOiBhdmFpbGFibGVQcm92aWRlcnNcblxuICAgICMgYWRkIHNpbmdsZXRvbiBzaGFyZVByb3ZpZGVyLCBpZiBpdCBleGlzdHNcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgcHJvdmlkZXIuY2FuICdzaGFyZSdcbiAgICAgICAgQF9zZXRTdGF0ZSBzaGFyZVByb3ZpZGVyOiBwcm92aWRlclxuICAgICAgICBicmVha1xuXG4gICAgQF91aS5pbml0IEBhcHBPcHRpb25zLnVpXG5cbiAgICAjIGNoZWNrIGZvciBhdXRvc2F2ZVxuICAgIGlmIEBhcHBPcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcbiAgICAgIEBhdXRvU2F2ZSBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXG5cbiAgICAjIGluaXRpYWxpemUgdGhlIGNsb3VkQ29udGVudEZhY3Rvcnkgd2l0aCBhbGwgZGF0YSB3ZSB3YW50IGluIHRoZSBlbnZlbG9wZVxuICAgIGNsb3VkQ29udGVudEZhY3Rvcnkuc2V0RW52ZWxvcGVNZXRhZGF0YVxuICAgICAgYXBwTmFtZTogQGFwcE9wdGlvbnMuYXBwTmFtZSBvciBcIlwiXG4gICAgICBhcHBWZXJzaW9uOiBAYXBwT3B0aW9ucy5hcHBWZXJzaW9uIG9yIFwiXCJcbiAgICAgIGFwcEJ1aWxkTnVtOiBAYXBwT3B0aW9ucy5hcHBCdWlsZE51bSBvciBcIlwiXG5cbiAgICBAbmV3RmlsZU9wZW5zSW5OZXdUYWIgPSBpZiBAYXBwT3B0aW9ucy51aT8uaGFzT3duUHJvcGVydHkoJ25ld0ZpbGVPcGVuc0luTmV3VGFiJykgdGhlbiBAYXBwT3B0aW9ucy51aS5uZXdGaWxlT3BlbnNJbk5ld1RhYiBlbHNlIHRydWVcbiAgICBAc2F2ZUNvcHlPcGVuc0luTmV3VGFiID0gaWYgQGFwcE9wdGlvbnMudWk/Lmhhc093blByb3BlcnR5KCdzYXZlQ29weU9wZW5zSW5OZXdUYWInKSB0aGVuIEBhcHBPcHRpb25zLnVpLnNhdmVDb3B5T3BlbnNJbk5ld1RhYiBlbHNlIHRydWVcblxuICBzZXRQcm92aWRlck9wdGlvbnM6IChuYW1lLCBuZXdPcHRpb25zKSAtPlxuICAgIGZvciBwcm92aWRlciBpbiBAc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXG4gICAgICBpZiBwcm92aWRlci5uYW1lIGlzIG5hbWVcbiAgICAgICAgcHJvdmlkZXIub3B0aW9ucyA/PSB7fVxuICAgICAgICBmb3Iga2V5IG9mIG5ld09wdGlvbnNcbiAgICAgICAgICBwcm92aWRlci5vcHRpb25zW2tleV0gPSBuZXdPcHRpb25zW2tleV1cbiAgICAgICAgYnJlYWtcblxuICBjb25uZWN0OiAtPlxuICAgIEBfZXZlbnQgJ2Nvbm5lY3RlZCcsIHtjbGllbnQ6IEB9XG5cbiAgbGlzdGVuOiAobGlzdGVuZXIpIC0+XG4gICAgaWYgbGlzdGVuZXJcbiAgICAgIEBfbGlzdGVuZXJzLnB1c2ggbGlzdGVuZXJcblxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XG4gICAgQF91aS5hcHBlbmRNZW51SXRlbSBpdGVtOyBAXG5cbiAgcHJlcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cbiAgICBAX3VpLnByZXBlbmRNZW51SXRlbSBpdGVtOyBAXG5cbiAgcmVwbGFjZU1lbnVJdGVtOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBfdWkucmVwbGFjZU1lbnVJdGVtIGtleSwgaXRlbTsgQFxuXG4gIGluc2VydE1lbnVJdGVtQmVmb3JlOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBfdWkuaW5zZXJ0TWVudUl0ZW1CZWZvcmUga2V5LCBpdGVtOyBAXG5cbiAgaW5zZXJ0TWVudUl0ZW1BZnRlcjogKGtleSwgaXRlbSkgLT5cbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQWZ0ZXIga2V5LCBpdGVtOyBAXG5cbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxuICAgIEBfdWkuc2V0TWVudUJhckluZm8gaW5mb1xuXG4gIG5ld0ZpbGU6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcbiAgICBAX3Jlc2V0U3RhdGUoKVxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZScsIHtjb250ZW50OiBcIlwifVxuXG4gIG5ld0ZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQG5ld0ZpbGVPcGVuc0luTmV3VGFiXG4gICAgICB3aW5kb3cub3BlbiBAX2dldEN1cnJlbnRVcmwoKSwgJ19ibGFuaydcbiAgICBlbHNlIGlmIEBzdGF0ZS5kaXJ0eVxuICAgICAgaWYgQF9hdXRvU2F2ZUludGVydmFsIGFuZCBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgQHNhdmUoKVxuICAgICAgICBAbmV3RmlsZSgpXG4gICAgICBlbHNlIGlmIGNvbmZpcm0gdHIgJ35DT05GSVJNLk5FV19GSUxFJ1xuICAgICAgICBAbmV3RmlsZSgpXG4gICAgZWxzZVxuICAgICAgQG5ld0ZpbGUoKVxuXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnbG9hZCdcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXG4gICAgZWxzZVxuICAgICAgQG9wZW5GaWxlRGlhbG9nIGNhbGxiYWNrXG5cbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgKG5vdCBAc3RhdGUuZGlydHkpIG9yIChjb25maXJtIHRyICd+Q09ORklSTS5PUEVOX0ZJTEUnKVxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICAgIEBvcGVuRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBvcGVuU2hhcmVkQ29udGVudDogKGlkKSAtPlxuICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPy5sb2FkU2hhcmVkQ29udGVudCBpZCwgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XG4gICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3ZlcndyaXRhYmxlOiBmYWxzZSwgb3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxuXG4gIG9wZW5TYXZlZDogKHBhcmFtcykgLT5cbiAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlclBhcmFtc10gPSBwYXJhbXMuc3BsaXQgJzonXG4gICAgcHJvdmlkZXIgPSBAcHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cbiAgICBpZiBwcm92aWRlclxuICAgICAgcHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cbiAgICAgICAgaWYgYXV0aG9yaXplZFxuICAgICAgICAgIHByb3ZpZGVyLm9wZW5TYXZlZCBwcm92aWRlclBhcmFtcywgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxuXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cbiAgICAgIEBzYXZlQ29udGVudCBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xuXG4gIHNhdmVDb250ZW50OiAoc3RyaW5nQ29udGVudCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlRmlsZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXG4gICAgICBAX3NldFN0YXRlXG4gICAgICAgIHNhdmluZzogbWV0YWRhdGFcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgaWYgQHN0YXRlLm1ldGFkYXRhIGlzbnQgbWV0YWRhdGFcbiAgICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIHtzYXZlZDogdHJ1ZX1cbiAgICAgICAgY2FsbGJhY2s/IGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xuXG4gIHNhdmVGaWxlRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX3VpLnNhdmVGaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBfZGlhbG9nU2F2ZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBzYXZlRmlsZUFzRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX3VpLnNhdmVGaWxlQXNEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIHNhdmVDb3B5RGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBzYXZlQ29weSA9IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSkgPT5cbiAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBzdHJpbmdDb250ZW50XG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBpZiBAc2F2ZUNvcHlPcGVuc0luTmV3VGFiXG4gICAgICAgICAgd2luZG93Lm9wZW4gQF9nZXRDdXJyZW50VXJsIFwib3BlblNhdmVkPSN7bWV0YWRhdGEucHJvdmlkZXIubmFtZX06I3tlbmNvZGVVUklDb21wb25lbnQgbWV0YWRhdGEucHJvdmlkZXIuZ2V0T3BlblNhdmVkUGFyYW1zIG1ldGFkYXRhfVwiXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxuICAgIEBfdWkuc2F2ZUNvcHlEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgaWYgc3RyaW5nQ29udGVudCBpcyBudWxsXG4gICAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpIC0+XG4gICAgICAgICAgc2F2ZUNvcHkgc3RyaW5nQ29udGVudCwgbWV0YWRhdGFcbiAgICAgIGVsc2VcbiAgICAgICAgc2F2ZUNvcHkgc3RyaW5nQ29udGVudCwgbWV0YWRhdGFcblxuICBzaGFyZUdldExpbms6IC0+XG4gICAgc2hvd1NoYXJlRGlhbG9nID0gKHNoYXJlZERvY3VtZW50SWQpID0+XG4gICAgICBAX3VpLnNoYXJlVXJsRGlhbG9nIEBfZ2V0Q3VycmVudFVybCBcIm9wZW5TaGFyZWQ9I3tzaGFyZWREb2N1bWVudElkfVwiXG5cbiAgICBzaGFyZWREb2N1bWVudElkID0gQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQgXCJzaGFyZWREb2N1bWVudElkXCJcbiAgICBpZiBzaGFyZWREb2N1bWVudElkXG4gICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxuICAgIGVsc2VcbiAgICAgIEBzaGFyZSAoc2hhcmVkRG9jdW1lbnRJZCkgLT5cbiAgICAgICAgc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcblxuICBzaGFyZVVwZGF0ZTogLT5cbiAgICBAc2hhcmUoKVxuXG4gIHNoYXJlOiAoY2FsbGJhY2spIC0+XG4gICAgaWYgQHN0YXRlLnNoYXJlUHJvdmlkZXJcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpID0+XG4gICAgICAgIEBfc2V0U3RhdGVcbiAgICAgICAgICBzaGFyaW5nOiB0cnVlXG4gICAgICAgIGN1cnJlbnRDb250ZW50ID0gQF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50IHN0cmluZ0NvbnRlbnRcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2hhcmUgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxuICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2hhcmVkRmlsZScsIGN1cnJlbnRDb250ZW50LCBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgICBjYWxsYmFjaz8gc2hhcmVkQ29udGVudElkXG5cbiAgcmV2ZXJ0VG9TaGFyZWQ6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcbiAgICBpZiBpZCBhbmQgQHN0YXRlLnNoYXJlUHJvdmlkZXI/XG4gICAgICBAc3RhdGUuc2hhcmVQcm92aWRlci5sb2FkU2hhcmVkQ29udGVudCBpZCwgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudC5jb3B5TWV0YWRhdGFUbyBjb250ZW50XG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cbiAgICAgICAgY2FsbGJhY2s/IG51bGxcblxuICByZXZlcnRUb1NoYXJlZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIikgYW5kIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPyBhbmQgY29uZmlybSB0ciBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXG4gICAgICBAcmV2ZXJ0VG9TaGFyZWQgY2FsbGJhY2tcblxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxuICAgICAgQF91aS5kb3dubG9hZERpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIEBhcHBPcHRpb25zLm1pbWVUeXBlLCBjb250ZW50LCBjYWxsYmFja1xuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICBpZiBuZXdOYW1lIGlzbnQgQHN0YXRlLm1ldGFkYXRhLm5hbWVcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5yZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCAoZXJyLCBtZXRhZGF0YSkgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgQHN0YXRlLmN1cnJlbnRDb250ZW50Py5hZGRNZXRhZGF0YSBkb2NOYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ3JlbmFtZWRGaWxlJywgQHN0YXRlLmN1cnJlbnRDb250ZW50LCBtZXRhZGF0YVxuICAgICAgICBjYWxsYmFjaz8gbmV3TmFtZVxuXG4gIHJlbmFtZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcbiAgICAgIEBfdWkucmVuYW1lRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YS5uYW1lLCAobmV3TmFtZSkgPT5cbiAgICAgICAgQHJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgY2FsbGJhY2s/ICdObyBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXG5cbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgQHN0YXRlLm9wZW5lZENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IEBzdGF0ZS5vcGVuZWRDb250ZW50LmNsb25lKCl9XG5cbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBpZiBjb25maXJtIHRyICd+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORUQnXG4gICAgICAgIEByZXZlcnRUb0xhc3RPcGVuZWQgY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xuXG4gIGRpcnR5OiAoaXNEaXJ0eSA9IHRydWUpLT5cbiAgICBAX3NldFN0YXRlXG4gICAgICBkaXJ0eTogaXNEaXJ0eVxuICAgICAgc2F2ZWQ6IGZhbHNlIGlmIGlzRGlydHlcblxuICBhdXRvU2F2ZTogKGludGVydmFsKSAtPlxuICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbFxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcblxuICAgICMgaW4gY2FzZSB0aGUgY2FsbGVyIHVzZXMgbWlsbGlzZWNvbmRzXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXG4gICAgICBpbnRlcnZhbCA9IE1hdGgucm91bmQoaW50ZXJ2YWwgLyAxMDAwKVxuICAgIGlmIGludGVydmFsID4gMFxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcblxuICBpc0F1dG9TYXZpbmc6IC0+XG4gICAgQF9hdXRvU2F2ZUludGVydmFsP1xuXG4gIHNob3dCbG9ja2luZ01vZGFsOiAobW9kYWxQcm9wcykgLT5cbiAgICBAX3VpLmJsb2NraW5nTW9kYWwgbW9kYWxQcm9wc1xuXG4gIF9kaWFsb2dTYXZlOiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXG4gICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cbiAgICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XG4gICAgIyBmb3Igbm93IGFuIGFsZXJ0XG4gICAgYWxlcnQgbWVzc2FnZVxuXG4gIF9maWxlQ2hhbmdlZDogKHR5cGUsIGNvbnRlbnQsIG1ldGFkYXRhLCBhZGRpdGlvbmFsU3RhdGU9e30pIC0+XG4gICAgbWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSA/PSB0cnVlXG4gICAgc3RhdGUgPVxuICAgICAgY3VycmVudENvbnRlbnQ6IGNvbnRlbnRcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgICAgc2F2aW5nOiBudWxsXG4gICAgICBzYXZlZDogZmFsc2VcbiAgICAgIGRpcnR5OiBmYWxzZVxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBhZGRpdGlvbmFsU3RhdGVcbiAgICAgIHN0YXRlW2tleV0gPSB2YWx1ZVxuICAgIEBfc2V0U3RhdGUgc3RhdGVcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LmdldFRleHQoKX1cblxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcbiAgICBmb3IgbGlzdGVuZXIgaW4gQF9saXN0ZW5lcnNcbiAgICAgIGxpc3RlbmVyIGV2ZW50XG5cbiAgX3NldFN0YXRlOiAob3B0aW9ucykgLT5cbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxuICAgIEBfZXZlbnQgJ3N0YXRlQ2hhbmdlZCdcblxuICBfcmVzZXRTdGF0ZTogLT5cbiAgICBAX3NldFN0YXRlXG4gICAgICBvcGVuZWRDb250ZW50OiBudWxsXG4gICAgICBjdXJyZW50Q29udGVudDogbnVsbFxuICAgICAgbWV0YWRhdGE6IG51bGxcbiAgICAgIGRpcnR5OiBmYWxzZVxuICAgICAgc2F2aW5nOiBudWxsXG4gICAgICBzYXZlZDogZmFsc2VcblxuICBfY2xvc2VDdXJyZW50RmlsZTogLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2Nsb3NlJ1xuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmNsb3NlIEBzdGF0ZS5tZXRhZGF0YVxuXG4gIF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50OiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5jdXJyZW50Q29udGVudD9cbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQHN0YXRlLmN1cnJlbnRDb250ZW50XG4gICAgICBjdXJyZW50Q29udGVudC5zZXRUZXh0IHN0cmluZ0NvbnRlbnRcbiAgICBlbHNlXG4gICAgICBjdXJyZW50Q29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHN0cmluZ0NvbnRlbnRcbiAgICBpZiBtZXRhZGF0YT9cbiAgICAgIGN1cnJlbnRDb250ZW50LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICBjdXJyZW50Q29udGVudFxuXG4gIF9nZXRDdXJyZW50VXJsOiAocXVlcnlTdHJpbmcgPSBudWxsKSAtPlxuICAgIHN1ZmZpeCA9IGlmIHF1ZXJ5U3RyaW5nPyB0aGVuIFwiPyN7cXVlcnlTdHJpbmd9XCIgZWxzZSBcIlwiXG4gICAgXCIje2RvY3VtZW50LmxvY2F0aW9uLm9yaWdpbn0je2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSN7c3VmZml4fVwiXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxuXG5kb2N1bWVudFN0b3JlID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbVwiXG5hdXRob3JpemVVcmwgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2F1dGhlbnRpY2F0ZVwiXG5jaGVja0xvZ2luVXJsICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2luZm9cIlxubGlzdFVybCAgICAgICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvYWxsXCJcbmxvYWREb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L29wZW5cIlxuc2F2ZURvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvc2F2ZVwiXG5wYXRjaERvY3VtZW50VXJsICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9wYXRjaFwiXG5yZW1vdmVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9kZWxldGVcIlxucmVuYW1lRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcmVuYW1lXCJcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcbmppZmYgPSByZXF1aXJlICdqaWZmJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGRvY1N0b3JlQXZhaWxhYmxlOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX29uRG9jU3RvcmVMb2FkZWQgPT5cbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxuXG4gIGF1dGhlbnRpY2F0ZTogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSxcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXG4gICAgKVxuXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcbiAgICAgICAgc2hhcmU6IHRydWVcbiAgICAgICAgY2xvc2U6IGZhbHNlXG5cbiAgICBAdXNlciA9IG51bGxcblxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXG5cbiAgcHJldmlvdXNseVNhdmVkQ29udGVudDogbnVsbFxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEB1c2VyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICBAX2NoZWNrTG9naW4oKVxuICAgIGVsc2VcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogLT5cbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXG5cbiAgX29uRG9jU3RvcmVMb2FkZWQ6IChAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaykgLT5cbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXG4gICAgICBAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXG5cbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxuICAgIEBfbG9naW5XaW5kb3c/LmNsb3NlKClcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcblxuICBfY2hlY2tMb2dpbjogLT5cbiAgICBwcm92aWRlciA9IEBcbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxuXG4gIF9sb2dpbldpbmRvdzogbnVsbFxuXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcbiAgICBlbHNlXG5cbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcblxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cblxuICAgICAgd2lkdGggPSAxMDAwXG4gICAgICBoZWlnaHQgPSA0ODBcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxuICAgICAgICAnZGVwZW5kZW50PXllcydcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xuICAgICAgICAnZGlhbG9nPXllcydcbiAgICAgICAgJ21lbnViYXI9bm8nXG4gICAgICBdXG5cbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxuXG4gICAgICBwb2xsQWN0aW9uID0gPT5cbiAgICAgICAgdHJ5XG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXG4gICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAjIGNvbnNvbGUubG9nIGVcblxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcblxuICByZW5kZXJVc2VyOiAtPlxuICAgIGlmIEB1c2VyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWljb24nfSksIEB1c2VyLm5hbWUpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgJC5hamF4XG4gICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICB1cmw6IGxpc3RVcmxcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZVxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxuXG4gIGxvYWRTaGFyZWRDb250ZW50OiAoaWQsIGNhbGxiYWNrKSAtPlxuICAgIHNoYXJlZE1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgIHNoYXJlZENvbnRlbnRJZDogaWRcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgb3ZlcndyaXRhYmxlOiBmYWxzZVxuICAgIEBsb2FkIHNoYXJlZE1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBzaGFyZWRNZXRhZGF0YVxuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgd2l0aENyZWRlbnRpYWxzID0gdW5sZXNzIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZCB0aGVuIHRydWUgZWxzZSBmYWxzZVxuICAgICQuYWpheFxuICAgICAgdXJsOiBsb2FkRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB7d2l0aENyZWRlbnRpYWxzfVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBkYXRhXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjb250ZW50LmNsb25lKClcbiAgICAgICAgbWV0YWRhdGEubmFtZSA/PSBkYXRhLmRvY05hbWVcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIG1lc3NhZ2UgPSBpZiBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkIGRvY3VtZW50ICcje21ldGFkYXRhLnNoYXJlZENvbnRlbnRJZH0nLiBQZXJoYXBzIHRoZSBmaWxlIHdhcyBub3Qgc2hhcmVkP1wiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkICN7bWV0YWRhdGEubmFtZSBvciBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yICdmaWxlJ31cIlxuICAgICAgICBjYWxsYmFjayBtZXNzYWdlXG5cbiAgc2hhcmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgcnVuS2V5ID0gY29udGVudC5nZXQoXCJzaGFyZUVkaXRLZXlcIikgb3IgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpXG5cbiAgICBwYXJhbXMgPVxuICAgICAgcnVuS2V5OiBydW5LZXlcblxuICAgIGlmIGNvbnRlbnQuZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxuICAgICAgcGFyYW1zLnJlY29yZGlkID0gY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXG5cbiAgICBjb250ZW50LmFkZE1ldGFkYXRhXG4gICAgICBfcGVybWlzc2lvbnM6IDFcbiAgICAgIHNoYXJlRWRpdEtleTogbnVsbCAgICAgICAgICAgICMgc3RyaXAgdGhlc2Ugb3V0IG9mIHRoZSBzaGFyZWQgZGF0YSBpZiB0aGV5XG4gICAgICBzaGFyZWREb2N1bWVudElkOiBudWxsICAgICAgICAjIGV4aXN0ICh0aGV5J2xsIGJlIHJlLWFkZGVkIG9uIHN1Y2Nlc3MpXG5cbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhzYXZlRG9jdW1lbnRVcmwsIHBhcmFtcylcblxuICAgICQuYWpheFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgIHVybDogdXJsXG4gICAgICBkYXRhOiBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgY29udGVudC5hZGRNZXRhZGF0YVxuICAgICAgICAgIHNoYXJlZERvY3VtZW50SWQ6IGRhdGEuaWRcbiAgICAgICAgICBzaGFyZUVkaXRLZXk6IHJ1bktleVxuICAgICAgICAgIF9wZXJtaXNzaW9uczogMFxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhLmlkXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXG5cbiAgc2F2ZTogKGNsb3VkQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnQuZ2V0Q29udGVudCgpXG5cbiAgICBwYXJhbXMgPSB7fVxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXG4gICAgY2FuT3ZlcndyaXRlID0gbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudD9cbiAgICBpZiBjYW5PdmVyd3JpdGUgYW5kIGRpZmYgPSBAX2NyZWF0ZURpZmYgQHByZXZpb3VzbHlTYXZlZENvbnRlbnQuZ2V0Q29udGVudCgpLCBjb250ZW50XG4gICAgICBzZW5kQ29udGVudCA9IGRpZmZcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcbiAgICBlbHNlXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIHRoZW4gcGFyYW1zLnJlY29yZG5hbWUgPSBtZXRhZGF0YS5uYW1lXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcbiAgICAgIHNlbmRDb250ZW50ID0gY29udGVudFxuXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXG5cbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICB1cmw6IHVybFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkgc2VuZENvbnRlbnRcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNsb3VkQ29udGVudC5jbG9uZSgpXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXG5cbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmUgXCIrbWV0YWRhdGEubmFtZVxuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZG5hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHJlbmFtZSBcIittZXRhZGF0YS5uYW1lXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHByb3ZpZGVyOiBAXG4gICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcblxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XG4gICAgcmV0dXJuIHVybCB1bmxlc3MgcGFyYW1zXG4gICAga3ZwID0gW11cbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcbiAgICAgIGt2cC5wdXNoIFtrZXksIHZhbHVlXS5tYXAoZW5jb2RlVVJJKS5qb2luIFwiPVwiXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcblxuICBfY3JlYXRlRGlmZjogKG9iajEsIG9iajIpIC0+XG4gICAgdHJ5XG4gICAgICBvcHRzID1cbiAgICAgICAgaGFzaDogQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlmIHR5cGVvZiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaXMgXCJmdW5jdGlvblwiXG4gICAgICAjIGNsZWFuIG9iamVjdHMgYmVmb3JlIGRpZmZpbmdcbiAgICAgIFtvYmoxLG9iajJdLm1hcCAoY29udGVudCkgLT5cbiAgICAgICAgZm9yIGtleSBvZiBjb250ZW50XG4gICAgICAgICAgZGVsZXRlIGNvbnRlbnRba2V5XSB1bmxlc3MgY29udGVudFtrZXldP1xuICAgICAgZGlmZiA9IGppZmYuZGlmZihvYmoxLCBvYmoyLCBvcHRzKVxuICAgICAgcmV0dXJuIGRpZmZcbiAgICBjYXRjaFxuICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcbmpzZGlmZiA9IHJlcXVpcmUgJ2RpZmYnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXG5cbiAgYXV0aGVudGljYXRlOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xuICAgIClcblxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgIGNsb3NlOiB0cnVlXG5cbiAgICBAYXV0aFRva2VuID0gbnVsbFxuICAgIEB1c2VyID0gbnVsbFxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXG4gICAgaWYgbm90IEBjbGllbnRJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsZURyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcbiAgICBAdXNlUmVhbFRpbWVBUEkgPSBAb3B0aW9ucy51c2VSZWFsVGltZUFQSSBvciBmYWxzZVxuICAgIGlmIEB1c2VSZWFsVGltZUFQSVxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xuICAgIEBfbG9hZEdBUEkoKVxuXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXG5cbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcbiAgQElNTUVESUFURSA9IHRydWVcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEBhdXRoVG9rZW5cbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcbiAgICBlbHNlXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIGFyZ3MgPVxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXG4gICAgICAgIEB1c2VyID0gbnVsbFxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxuICAgIGlmIEBfYXV0b1JlbmV3VGltZW91dFxuICAgICAgY2xlYXJUaW1lb3V0IEBfYXV0b1JlbmV3VGltZW91dFxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxuICAgICAgQF9hdXRvUmVuZXdUaW1lb3V0ID0gc2V0VGltZW91dCAoPT4gQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURSksIChwYXJzZUludChhdXRoVG9rZW4uZXhwaXJlc19pbiwgMTApICogMC43NSkgKiAxMDAwXG5cbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cbiAgICAoR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQH0pXG5cbiAgcmVuZGVyVXNlcjogLT5cbiAgICBpZiBAdXNlclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdnZHJpdmUtaWNvbid9KSwgQHVzZXIubmFtZSlcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJID0+XG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgICAgZWxzZVxuICAgICAgICBAX3NhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJID0+XG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcbiAgICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgICBlbHNlXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XG4gICAgICAgIHE6IHF1ZXJ5ID0gXCIoKG1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfScpIG9yIChtaW1lVHlwZSA9ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykpIGFuZCAnI3tpZiBtZXRhZGF0YSB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J30nIGluIHBhcmVudHNcIlxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XG4gICAgICAgIHJldHVybiBjYWxsYmFjaygnVW5hYmxlIHRvIGxpc3QgZmlsZXMnKSBpZiBub3QgcmVzdWx0XG4gICAgICAgIGxpc3QgPSBbXVxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwYXJlbnQ6IG1ldGFkYXRhXG4gICAgICAgICAgICBvdmVyd3JpdGFibGU6IGl0ZW0uZWRpdGFibGVcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgICAgICAgIGlkOiBpdGVtLmlkXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxuICAgICAgICAgIHJldHVybiAwXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJIC0+XG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgLT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5wYXRjaFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgICAgICByZXNvdXJjZTpcbiAgICAgICAgICB0aXRsZTogbmV3TmFtZVxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XG4gICAgICAgIGlmIHJlc3VsdD8uZXJyb3JcbiAgICAgICAgICBjYWxsYmFjaz8gcmVzdWx0LmVycm9yXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXG5cbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5yZWFsVGltZT8uZG9jP1xuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHByb3ZpZGVyOiBAXG4gICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcblxuICBfbG9hZEdBUEk6IC0+XG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXG4gICAgICB3aW5kb3cuX0dBUElPbkxvYWQgPSAtPlxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xuICAgICAgc2NyaXB0LnNyYyA9ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQuanM/b25sb2FkPV9HQVBJT25Mb2FkJ1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcblxuICBfbG9hZGVkR0FQSTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcbiAgICAgIGNhbGxiYWNrKClcbiAgICBlbHNlXG4gICAgICBzZWxmID0gQFxuICAgICAgY2hlY2sgPSAtPlxuICAgICAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxuICAgICAgICAgICAgICBnYXBpLmxvYWQgJ2RyaXZlLXJlYWx0aW1lJywgLT5cbiAgICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcbiAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXG5cbiAgX2xvYWRGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcbiAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IGZpbGUudGl0bGVcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxuICAgICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgICB4aHIub3BlbiAnR0VUJywgZmlsZS5kb3dubG9hZFVybFxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje0BhdXRoVG9rZW4uYWNjZXNzX3Rva2VufVwiXG4gICAgICAgIHhoci5vbmxvYWQgPSAtPlxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgeGhyLm9uZXJyb3IgPSAtPlxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXG4gICAgICAgIHhoci5zZW5kKClcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXG5cbiAgX3NhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnlcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXG4gICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXG5cbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxuICAgIGVsc2VcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cblxuICAgIGJvZHkgPSBbXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50LmdldENvbnRlbnRBc0pTT04oKX1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcbiAgICBdLmpvaW4gJydcblxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XG4gICAgICBwYXRoOiBwYXRoXG4gICAgICBtZXRob2Q6IG1ldGhvZFxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxuICAgICAgYm9keTogYm9keVxuXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgaWYgY2FsbGJhY2tcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXG4gICAgICAgIGVsc2UgaWYgZmlsZVxuICAgICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcblxuICBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHNlbGYgPSBAXG4gICAgZmlsZUxvYWRlZCA9IChkb2MpIC0+XG4gICAgICBjb250ZW50ID0gZG9jLmdldE1vZGVsKCkuZ2V0Um9vdCgpLmdldCAnY29udGVudCdcbiAgICAgIGlmIG1ldGFkYXRhLm92ZXJ3cml0YWJsZVxuICAgICAgICB0aHJvd0Vycm9yID0gKGUpIC0+XG4gICAgICAgICAgaWYgbm90IGUuaXNMb2NhbCBhbmQgZS5zZXNzaW9uSWQgaXNudCBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuc2Vzc2lvbklkXG4gICAgICAgICAgICBzZWxmLmNsaWVudC5zaG93QmxvY2tpbmdNb2RhbFxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbmN1cnJlbnQgRWRpdCBMb2NrJ1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQW4gZWRpdCB3YXMgbWFkZSB0byB0aGlzIGZpbGUgZnJvbSBhbm90aGVyIGJyb3dzZXIgd2luZG93LiBUaGlzIGFwcCBpcyBub3cgbG9ja2VkIGZvciBpbnB1dC4nXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0lOU0VSVEVELCB0aHJvd0Vycm9yXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0RFTEVURUQsIHRocm93RXJyb3JcbiAgICAgIGZvciBjb2xsYWJvcmF0b3IgaW4gZG9jLmdldENvbGxhYm9yYXRvcnMoKVxuICAgICAgICBzZXNzaW9uSWQgPSBjb2xsYWJvcmF0b3Iuc2Vzc2lvbklkIGlmIGNvbGxhYm9yYXRvci5pc01lXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxuICAgICAgICBkb2M6IGRvY1xuICAgICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICAgIHNlc3Npb25JZDogc2Vzc2lvbklkXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBjb250ZW50LmdldFRleHQoKVxuXG4gICAgaW5pdCA9IChtb2RlbCkgLT5cbiAgICAgIGNvbnRlbnQgPSBtb2RlbC5jcmVhdGVTdHJpbmcgJydcbiAgICAgIG1vZGVsLmdldFJvb3QoKS5zZXQgJ2NvbnRlbnQnLCBjb250ZW50XG5cbiAgICBlcnJvciA9IChlcnIpID0+XG4gICAgICBpZiBlcnIudHlwZSBpcyAnVE9LRU5fUkVGUkVTSF9SRVFVSVJFRCdcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxuICAgICAgZWxzZVxuICAgICAgICBhbGVydCBlcnIubWVzc2FnZVxuXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgIGVsc2VcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5pbnNlcnRcbiAgICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcbiAgICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxuICAgICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXG5cbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XG4gICAgICBpZiBmaWxlPy5pZFxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gZmlsZS50aXRsZVxuICAgICAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSBmaWxlLmVkaXRhYmxlXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXG4gICAgICAgIGdhcGkuZHJpdmUucmVhbHRpbWUubG9hZCBmaWxlLmlkLCBmaWxlTG9hZGVkLCBpbml0LCBlcnJvclxuICAgICAgZWxzZVxuICAgICAgICBjYWxsYmFjayBAX2FwaUVycm9yIGZpbGUsICdVbmFibGUgdG8gbG9hZCBmaWxlJ1xuXG4gIF9zYXZlUmVhbFRpbWVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ubW9kZWxcbiAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIChlcnIpID0+XG4gICAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGluZGV4ID0gMFxuICAgIHJlYWxUaW1lQ29udGVudCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5jb250ZW50XG4gICAgZGlmZnMgPSBqc2RpZmYuZGlmZkNoYXJzIHJlYWxUaW1lQ29udGVudC5nZXRUZXh0KCksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXG4gICAgZm9yIGRpZmYgaW4gZGlmZnNcbiAgICAgIGlmIGRpZmYucmVtb3ZlZFxuICAgICAgICByZWFsVGltZUNvbnRlbnQucmVtb3ZlUmFuZ2UgaW5kZXgsIGluZGV4ICsgZGlmZi52YWx1ZS5sZW5ndGhcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgZGlmZi5hZGRlZFxuICAgICAgICAgIHJlYWxUaW1lQ29udGVudC5pbnNlcnRTdHJpbmcgaW5kZXgsIGRpZmYudmFsdWVcbiAgICAgICAgaW5kZXggKz0gZGlmZi5jb3VudFxuICAgIGNhbGxiYWNrIG51bGxcblxuICBfYXBpRXJyb3I6IChyZXN1bHQsIHByZWZpeCkgLT5cbiAgICBpZiByZXN1bHQ/Lm1lc3NhZ2U/XG4gICAgICBcIiN7cHJlZml4fTogI3tyZXN1bHQubWVzc2FnZX1cIlxuICAgIGVsc2VcbiAgICAgIHByZWZpeFxuXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgIGNsb3NlOiBmYWxzZVxuXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xuICBAQXZhaWxhYmxlOiAtPlxuICAgIHJlc3VsdCA9IHRyeVxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXG4gICAgICB0cnVlXG4gICAgY2F0Y2hcbiAgICAgIGZhbHNlXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGZpbGVLZXkgPSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXG4gICAgICBjYWxsYmFjaz8gbnVsbFxuICAgIGNhdGNoIGVcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXG4gICAgY2F0Y2ggZVxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcblxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGxpc3QgPSBbXVxuICAgIHByZWZpeCA9IEBfZ2V0S2V5IChtZXRhZGF0YT8ucGF0aCgpIG9yIFtdKS5qb2luICcvJ1xuICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XG4gICAgICAgIFtmaWxlbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxuICAgICAgICBuYW1lID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICBuYW1lOiBuYW1lXG4gICAgICAgICAgdHlwZTogaWYgcmVtYWluZGVyLmxlbmd0aCA+IDAgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcbiAgICAgICAgICBwcm92aWRlcjogQFxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcbiAgICAgIGNhbGxiYWNrPyBudWxsXG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcblxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShuZXdOYW1lKSwgY29udGVudFxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXG4gICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcbiAgICBjYXRjaFxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gcmVuYW1lJ1xuXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XG4gICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgbmFtZTogb3BlblNhdmVkUGFyYW1zXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHBhcmVudDogbnVsbFxuICAgICAgcHJvdmlkZXI6IEBcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChjbGllbnRNZXRhZGF0YSwgc2F2ZWRNZXRhZGF0YSkgLT5cbiAgICBzYXZlZE1ldGFkYXRhLm5hbWVcblxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RvcmFnZVByb3ZpZGVyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuY2xhc3MgQ2xvdWRGaWxlXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXG5cbmNsYXNzIENsb3VkTWV0YWRhdGFcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQHR5cGUsIEBwcm92aWRlciA9IG51bGwsIEBwYXJlbnQgPSBudWxsLCBAcHJvdmlkZXJEYXRhPXt9LCBAb3ZlcndyaXRhYmxlLCBAc2hhcmVkQ29udGVudElkLCBAc2hhcmVkQ29udGVudFNlY3JldEtleX0gPSBvcHRpb25zXG4gIEBGb2xkZXI6ICdmb2xkZXInXG4gIEBGaWxlOiAnZmlsZSdcblxuICBwYXRoOiAtPlxuICAgIF9wYXRoID0gW11cbiAgICBwYXJlbnQgPSBAcGFyZW50XG4gICAgd2hpbGUgcGFyZW50IGlzbnQgbnVsbFxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRcbiAgICBfcGF0aFxuXG4jIHNpbmdsZXRvbiB0aGF0IGNhbiBjcmVhdGUgQ2xvdWRDb250ZW50IHdyYXBwZWQgd2l0aCBnbG9iYWwgb3B0aW9uc1xuY2xhc3MgQ2xvdWRDb250ZW50RmFjdG9yeVxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAZW52ZWxvcGVNZXRhZGF0YSA9IHt9XG5cbiAgIyBzZXQgaW5pdGlhbCBlbnZlbG9wZU1ldGFkYXRhIG9yIHVwZGF0ZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcbiAgc2V0RW52ZWxvcGVNZXRhZGF0YTogKGVudmVsb3BlTWV0YWRhdGEpIC0+XG4gICAgZm9yIGtleSBvZiBlbnZlbG9wZU1ldGFkYXRhXG4gICAgICBAZW52ZWxvcGVNZXRhZGF0YVtrZXldID0gZW52ZWxvcGVNZXRhZGF0YVtrZXldXG5cbiAgIyByZXR1cm5zIG5ldyBDbG91ZENvbnRlbnQgY29udGFpbmluZyBlbnZlbG9wZWQgZGF0YVxuICBjcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgIG5ldyBDbG91ZENvbnRlbnQgQGVudmVsb3BDb250ZW50IGNvbnRlbnRcblxuICAjIGVudmVsb3BzIGNvbnRlbnQgd2l0aCBtZXRhZGF0YSwgcmV0dXJucyBhbiBvYmplY3QuXG4gICMgSWYgY29udGVudCB3YXMgYWxyZWFkeSBhbiBvYmplY3QgKE9iamVjdCBvciBKU09OKSB3aXRoIG1ldGFkYXRhLFxuICAjIGFueSBleGlzdGluZyBtZXRhZGF0YSB3aWxsIGJlIHJldGFpbmVkLlxuICAjIE5vdGU6IGNhbGxpbmcgYGVudmVsb3BDb250ZW50YCBtYXkgYmUgc2FmZWx5IGNhbGxlZCBvbiBzb21ldGhpbmcgdGhhdFxuICAjIGhhcyBhbHJlYWR5IGhhZCBgZW52ZWxvcENvbnRlbnRgIGNhbGxlZCBvbiBpdCwgYW5kIHdpbGwgYmUgYSBuby1vcC5cbiAgZW52ZWxvcENvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgIGVudmVsb3BlZENsb3VkQ29udGVudCA9IEBfd3JhcElmTmVlZGVkIGNvbnRlbnRcbiAgICBmb3Iga2V5IG9mIEBlbnZlbG9wZU1ldGFkYXRhXG4gICAgICBlbnZlbG9wZWRDbG91ZENvbnRlbnRba2V5XSA/PSBAZW52ZWxvcGVNZXRhZGF0YVtrZXldXG4gICAgcmV0dXJuIGVudmVsb3BlZENsb3VkQ29udGVudFxuXG4gICMgZW52ZWxvcHMgY29udGVudCBpbiB7Y29udGVudDogY29udGVudH0gaWYgbmVlZGVkLCByZXR1cm5zIGFuIG9iamVjdFxuICBfd3JhcElmTmVlZGVkOiAoY29udGVudCkgLT5cbiAgICBpZiBpc1N0cmluZyBjb250ZW50XG4gICAgICB0cnkgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxuICAgIGlmIGNvbnRlbnQuY29udGVudD9cbiAgICAgIHJldHVybiBjb250ZW50XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHtjb250ZW50fVxuXG5jbGFzcyBDbG91ZENvbnRlbnRcbiAgY29uc3RydWN0b3I6IChAXyA9IHt9KSAtPlxuXG4gIGdldENvbnRlbnQ6IC0+IEBfXG4gIGdldENvbnRlbnRBc0pTT046ICAtPiBKU09OLnN0cmluZ2lmeSBAX1xuXG4gIGNsb25lOiAtPiBuZXcgQ2xvdWRDb250ZW50IF8uY2xvbmVEZWVwIEBfXG5cbiAgc2V0VGV4dDogKHRleHQpIC0+IEBfLmNvbnRlbnQgPSB0ZXh0XG4gIGdldFRleHQ6IC0+IGlmIEBfLmNvbnRlbnQgaXMgbnVsbCB0aGVuICcnIGVsc2UgaWYgaXNTdHJpbmcoQF8uY29udGVudCkgdGhlbiBAXy5jb250ZW50IGVsc2UgSlNPTi5zdHJpbmdpZnkgQF8uY29udGVudFxuXG4gIGFkZE1ldGFkYXRhOiAobWV0YWRhdGEpIC0+IEBfW2tleV0gPSBtZXRhZGF0YVtrZXldIGZvciBrZXkgb2YgbWV0YWRhdGFcbiAgZ2V0OiAocHJvcCkgLT4gQF9bcHJvcF1cblxuICBjb3B5TWV0YWRhdGFUbzogKHRvKSAtPlxuICAgIG1ldGFkYXRhID0ge31cbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgQF9cbiAgICAgIGlmIGtleSBpc250ICdjb250ZW50J1xuICAgICAgICBtZXRhZGF0YVtrZXldID0gdmFsdWVcbiAgICB0by5hZGRNZXRhZGF0YSBtZXRhZGF0YVxuXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXG5cbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxuXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBpZiBjYWxsYmFja1xuICAgICAgY2FsbGJhY2sgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxuICAgIChBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cge3Byb3ZpZGVyOiBAfSlcblxuICByZW5kZXJVc2VyOiAtPlxuICAgIG51bGxcblxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdkaWFsb2cnXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdzYXZlJ1xuXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdsb2FkJ1xuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbGlzdCdcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVtb3ZlJ1xuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdyZW5hbWUnXG5cbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnY2xvc2UnXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdvcGVuU2F2ZWQnXG5cbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZ2V0T3BlblNhdmVkUGFyYW1zJ1xuXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXG4gIENsb3VkTWV0YWRhdGE6IENsb3VkTWV0YWRhdGFcbiAgQ2xvdWRDb250ZW50OiBDbG91ZENvbnRlbnRcbiAgY2xvdWRDb250ZW50RmFjdG9yeTogbmV3IENsb3VkQ29udGVudEZhY3RvcnkoKVxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IFJlYWRPbmx5UHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IGZhbHNlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IGZhbHNlXG4gICAgICAgIHJlbmFtZTogZmFsc2VcbiAgICAgICAgY2xvc2U6IGZhbHNlXG4gICAgQHRyZWUgPSBudWxsXG5cbiAgQE5hbWU6ICdyZWFkT25seSdcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICBzdWJUcmVlID0gQF9maW5kU3ViVHJlZSBtZXRhZGF0YVxuICAgICAgaWYgc3ViVHJlZVxuICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdXG4gICAgICAgICAgaWYgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIGxpc3QgPSBbXVxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcbiAgICAgIGlmIHN1YlRyZWVcbiAgICAgICAgbGlzdC5wdXNoIGZpbGUubWV0YWRhdGEgZm9yIG93biBmaWxlbmFtZSwgZmlsZSBvZiBzdWJUcmVlXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XG5cbiAgX2ZpbmRTdWJUcmVlOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlblxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnBhcmVudFxuICAgICAgbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5jaGlsZHJlblxuICAgIGVsc2VcbiAgICAgIEB0cmVlXG5cbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XG4gICAgaWYgQHRyZWUgaXNudCBudWxsXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxuICAgICAgICBlbHNlXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcbiAgICAgICQuYWpheFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXG4gICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PlxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgICAgICBlcnJvcjogLT4gY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBqc29uIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxuICAgICAgY2FsbGJhY2sgbnVsbCwge31cblxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhcmVudCA9IG51bGwpIC0+XG4gICAgdHJlZSA9IHt9XG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgIHBhcmVudDogcGFyZW50XG4gICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIHByb3ZpZGVyRGF0YTpcbiAgICAgICAgICBjaGlsZHJlbjogbnVsbFxuICAgICAgaWYgdHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW4gPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIG1ldGFkYXRhXG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQganNvbltmaWxlbmFtZV1cbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cbiAgICAgICAgY29udGVudDogY29udGVudFxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICB0cmVlXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhZE9ubHlQcm92aWRlclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XG5cbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSkgLT5cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3JldmVydFN1Yk1lbnUnLCAnc2VwYXJhdG9yJywgJ3NhdmUnLCAnc2F2ZUNvcHlEaWFsb2cnLCAnc2hhcmVTdWJNZW51JywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XG4gICAgQGl0ZW1zID0gQHBhcnNlTWVudUl0ZW1zIG9wdGlvbnMubWVudSwgY2xpZW50XG4gICAgY29uc29sZS5kaXIgQGl0ZW1zXG5cbiAgcGFyc2VNZW51SXRlbXM6IChtZW51SXRlbXMsIGNsaWVudCkgLT5cbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXG5cbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cbiAgICAgIHN3aXRjaCBhY3Rpb25cbiAgICAgICAgd2hlbiAncmV2ZXJ0U3ViTWVudSdcbiAgICAgICAgICAtPiAoY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/KSBvciBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJ1xuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xuICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXG4gICAgICAgIHdoZW4gJ3NoYXJlR2V0TGluaycsICdzaGFyZVN1Yk1lbnUnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XG4gICAgICAgIHdoZW4gJ3JldmVydFRvU2hhcmVkRGlhbG9nJ1xuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRydWVcblxuICAgIGdldEl0ZW1zID0gKHN1Yk1lbnVJdGVtcykgPT5cbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xuICAgICAgICBAcGFyc2VNZW51SXRlbXMgc3ViTWVudUl0ZW1zLCBjbGllbnRcbiAgICAgIGVsc2VcbiAgICAgICAgbnVsbFxuXG4gICAgbmFtZXMgPVxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxuICAgICAgb3BlbkZpbGVEaWFsb2c6IHRyIFwifk1FTlUuT1BFTlwiXG4gICAgICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXG4gICAgICBzYXZlOiB0ciBcIn5NRU5VLlNBVkVcIlxuICAgICAgc2F2ZUZpbGVBc0RpYWxvZzogdHIgXCJ+TUVOVS5TQVZFX0FTXCJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXG4gICAgICBzaGFyZUdldExpbms6IHRyIFwifk1FTlUuU0hBUkVfR0VUX0xJTktcIlxuICAgICAgc2hhcmVVcGRhdGU6IHRyIFwifk1FTlUuU0hBUkVfVVBEQVRFXCJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcbiAgICAgIHJlbmFtZURpYWxvZzogdHIgXCJ+TUVOVS5SRU5BTUVcIlxuICAgICAgcmV2ZXJ0U3ViTWVudTogdHIgXCJ+TUVOVS5SRVZFUlRfVE9cIlxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcblxuICAgIHN1Yk1lbnVzID1cbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cbiAgICAgIHNoYXJlU3ViTWVudTogWydzaGFyZUdldExpbmsnLCAnc2hhcmVVcGRhdGUnXVxuXG4gICAgaXRlbXMgPSBbXVxuICAgIGZvciBpdGVtLCBpIGluIG1lbnVJdGVtc1xuICAgICAgaWYgaXRlbSBpcyAnc2VwYXJhdG9yJ1xuICAgICAgICBtZW51SXRlbSA9XG4gICAgICAgICAga2V5OiBcInNlcGVyYXRvciN7aX1cIlxuICAgICAgICAgIHNlcGFyYXRvcjogdHJ1ZVxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXG4gICAgICAgIG1lbnVJdGVtID1cbiAgICAgICAgICBrZXk6IGl0ZW1cbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxuICAgICAgICAgIGVuYWJsZWQ6IHNldEVuYWJsZWQgaXRlbVxuICAgICAgICAgIGl0ZW1zOiBnZXRJdGVtcyBzdWJNZW51c1tpdGVtXVxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cbiAgICAgIGVsc2VcbiAgICAgICAgbWVudUl0ZW0gPSBpdGVtXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxuICAgICAgICAgIG1lbnVJdGVtLmtleSA9IGl0ZW0uYWN0aW9uXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbS5hY3Rpb25cbiAgICAgICAgZWxzZVxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcbiAgICAgICAgbWVudUl0ZW0uaXRlbXMgPSBpdGVtLml0ZW1zIG9yIGdldEl0ZW1zIGl0ZW0ubmFtZVxuICAgICAgaXRlbXMucHVzaCBtZW51SXRlbVxuICAgIGl0ZW1zXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxuXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxuICAgIEBtZW51ID0gbnVsbFxuXG4gIGluaXQ6IChvcHRpb25zKSAtPlxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XG5cbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cblxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cblxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncHJlcGVuZE1lbnVJdGVtJywgaXRlbVxuXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3JlcGxhY2VNZW51SXRlbScsXG4gICAgICBrZXk6IGtleVxuICAgICAgaXRlbTogaXRlbVxuXG4gIGluc2VydE1lbnVJdGVtQmVmb3JlOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxuICAgICAga2V5OiBrZXlcbiAgICAgIGl0ZW06IGl0ZW1cblxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1BZnRlcicsXG4gICAgICBrZXk6IGtleVxuICAgICAgaXRlbTogaXRlbVxuXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xuXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcblxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xuXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQ29weScsICh0ciAnfkRJQUxPRy5TQVZFX0NPUFknKSwgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXG5cbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgbWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd0Rvd25sb2FkRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgbWltZVR5cGU6IG1pbWVUeXBlXG4gICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgc2hhcmVVcmxEaWFsb2c6ICh1cmwpIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93U2hhcmVVcmxEaWFsb2cnLFxuICAgICAgdXJsOiB1cmxcblxuICBibG9ja2luZ01vZGFsOiAobW9kYWxQcm9wcykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dCbG9ja2luZ01vZGFsJywgbW9kYWxQcm9wc1xuXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXG4gICAgICBhY3Rpb246IGFjdGlvblxuICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcbiAgQ2xvdWRGaWxlTWFuYWdlclVJOiBDbG91ZEZpbGVNYW5hZ2VyVUlcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+XG4gIHJldCA9IG51bGxcbiAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuc29tZSAocGFpcikgLT5cbiAgICBwYWlyLnNwbGl0KFwiPVwiKVswXSBpcyBwYXJhbSBhbmQgKHJldCA9IHBhaXIuc3BsaXQoXCI9XCIpWzFdKVxuICByZXRcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXG4iLCJtb2R1bGUuZXhwb3J0cyA9XG4gIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXG5cbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG4gIFwifk1FTlUuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcbiAgXCJ+TUVOVS5TSEFSRVwiOiBcIlNoYXJlLi4uXCJcbiAgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiOiBcIkdldCBsaW5rIHRvIHNoYXJlZCB2aWV3XCJcbiAgXCJ+TUVOVS5TSEFSRV9VUERBVEVcIjogXCJVcGRhdGUgc2hhcmVkIHZpZXdcIlxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXG4gIFwifk1FTlUuUkVWRVJUX1RPXCI6IFwiUmV2ZXJ0IHRvLi4uXCJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJSZWNlbnRseSBvcGVuZWQgc3RhdGVcIlxuICBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIlNoYXJlZCB2aWV3XCJcblxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcbiAgXCJ+RElBTE9HLlNBVkVfQ09QWVwiOiBcIlNhdmUgQSBDb3B5IC4uLlwiXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcbiAgXCJ+RElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXG4gIFwifkRJQUxPRy5TSEFSRURcIjogXCJTaGFyZWQgRG9jdW1lbnRcIlxuXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXG5cbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxuXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlcIjogXCJDb3B5XCJcbiAgXCJ+U0hBUkVfRElBTE9HLlZJRVdcIjogXCJWaWV3XCJcbiAgXCJ+U0hBUkVfRElBTE9HLkNMT1NFXCI6IFwiQ2xvc2VcIlxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9TVUNDRVNTXCI6IFwiVGhlIHNoYXJlIHVybCBoYXMgYmVlbiBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9FUlJPUlwiOiBcIlNvcnJ5LCB0aGUgc2hhcmUgdXJsIHdhcyBub3QgYWJsZSB0byBiZSBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxuXG4gIFwifkNPTkZJUk0uT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IG9wZW4gYSBuZXcgZmlsZT9cIlxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcbiAgXCJ+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgcmV2ZXJ0IHRoZSBmaWxlIHRvIGl0cyBtb3N0IHJlY2VudGx5IG9wZW5lZCBzdGF0ZT9cIlxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gY3VycmVudGx5IHNoYXJlZCB2aWV3P1wiXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcbmRlZmF1bHRMYW5nID0gJ2VuJ1xudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xuXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcblxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcblNoYXJlVXJsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NoYXJlLXVybC1kaWFsb2ctdmlldydcbkJsb2NraW5nTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vYmxvY2tpbmctbW9kYWwtdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxuXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcblxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXG4gICAgKVxuXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcblxuICBnZXRGaWxlbmFtZTogLT5cbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIGFuZCBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWU/Lmxlbmd0aCA+IDBcbiAgICAgIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZVxuICAgIGVsc2VcbiAgICAgICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpXG5cbiAgZ2V0UHJvdmlkZXI6IC0+XG4gICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXG4gICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cbiAgICBwcm92aWRlckRpYWxvZzogbnVsbFxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXG4gICAgc2hhcmVVcmxEaWFsb2c6IG51bGxcbiAgICBkaXJ0eTogZmFsc2VcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XG4gICAgICBlbHNlXG4gICAgICAgIG51bGxcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICAgICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcblxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG5cbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdzaG93U2hhcmVVcmxEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlVXJsRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dCbG9ja2luZ01vZGFsJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBibG9ja2luZ01vZGFsUHJvcHM6IGV2ZW50LmRhdGFcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YVxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXG4gICAgICAgICAgICBpZiBpbmRleCBpcyAwXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXgsIDAsIGV2ZW50LmRhdGEuaXRlbVxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUFmdGVyJ1xuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxuICAgICAgICAgICAgaWYgaW5kZXggaXMgQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXggKyAxLCAwLCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcblxuICBfZ2V0TWVudUl0ZW1JbmRleDogKGtleSkgLT5cbiAgICBpZiBpc1N0cmluZyBrZXlcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXG4gICAgICAgIHJldHVybiBpbmRleCBpZiBpdGVtLmtleSBpcyBrZXlcbiAgICAgIC0xXG4gICAgZWxzZVxuICAgICAgaW5kZXggPSBwYXJzZUludCBrZXksIDEwXG4gICAgICBpZiBpc05hTihpbmRleCkgb3IgaW5kZXggPCAwIG9yIGluZGV4ID4gQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXG4gICAgICAgIC0xXG4gICAgICBlbHNlXG4gICAgICAgIGluZGV4XG5cbiAgY2xvc2VEaWFsb2dzOiAtPlxuICAgIEBzZXRTdGF0ZVxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcbiAgICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXG4gICAgICByZW5hbWVEaWFsb2c6IG51bGxcbiAgICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXG5cbiAgcmVuZGVyRGlhbG9nczogLT5cbiAgICBpZiBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzXG4gICAgICAoQmxvY2tpbmdNb2RhbCBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzKVxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBtaW1lVHlwZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLm1pbWVUeXBlLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG4gICAgZWxzZSBpZiBAc3RhdGUuc2hhcmVVcmxEaWFsb2dcbiAgICAgIChTaGFyZVVybERpYWxvZyB7dXJsOiBAc3RhdGUuc2hhcmVVcmxEaWFsb2cudXJsLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG5cbiAgcmVuZGVyOiAtPlxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXG4gICAgICAgIChNZW51QmFyIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXG4gICAgICApXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkF1dGhvcml6ZU1peGluID1cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcblxuICByZW5kZXI6IC0+XG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXG4gICAgZWxzZVxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQmxvY2tpbmdNb2RhbCdcblxuICBjbG9zZTogLT5cbiAgICBAcHJvcHMuY2xvc2U/KClcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXG4gICAgICAgICAgKVxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSxcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy1ibG9ja2luZy1tZXNzYWdlJ30sIEBwcm9wcy5tZXNzYWdlKVxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXG5cbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xuICAgIHN0YXRlID1cbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXG4gICAgQGZpbGVuYW1lLmZvY3VzKClcblxuICB1cGRhdGVGaWxlbmFtZTogLT5cbiAgICBmaWxlbmFtZSA9IEBmaWxlbmFtZS52YWx1ZVxuICAgIEBzZXRTdGF0ZVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgdHJpbTogKHMpIC0+XG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXG5cbiAgZG93bmxvYWQ6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgZS50YXJnZXQuc2V0QXR0cmlidXRlICdocmVmJywgXCJkYXRhOiN7QHByb3BzLm1pbWVUeXBlfSwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudC5nZXRUZXh0KCkpfVwiXG4gICAgICBAcHJvcHMuY2xvc2UoKVxuICAgIGVsc2VcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxuICAgICAgICApXG4gICAgICApXG4gICAgKVxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpLCBzdmcsIGcsIHJlY3R9ID0gUmVhY3QuRE9NXG5cbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcblxuICBjbGlja2VkOiAtPlxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cblxuICBtb3VzZUVudGVyOiAtPlxuICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXG4gICAgICBtZW51SXRlbSA9ICQgUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuaXRlbVxuICAgICAgbWVudSA9IG1lbnVJdGVtLnBhcmVudCgpLnBhcmVudCgpXG5cbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51XG4gICAgICAgIHN0eWxlOlxuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnXG4gICAgICAgICAgbGVmdDogbWVudS53aWR0aCgpXG4gICAgICAgICAgdG9wOiBtZW51SXRlbS5wb3NpdGlvbigpLnRvcCAtIHBhcnNlSW50KG1lbnVJdGVtLmNzcygncGFkZGluZy10b3AnKSlcbiAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtLml0ZW1zXG4gICAgZWxzZVxuICAgICAgQHByb3BzLnNldFN1Yk1lbnU/IG51bGxcblxuICByZW5kZXI6IC0+XG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkKClcbiAgICAgIGVsc2VcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICAgIGNsYXNzZXMgPSBbJ21lbnVJdGVtJ11cbiAgICBpZiBAcHJvcHMuaXRlbS5zZXBhcmF0b3JcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpfSwgJycpXG4gICAgZWxzZVxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3Igbm90IChAcHJvcHMuaXRlbS5hY3Rpb24gb3IgQHByb3BzLml0ZW0uaXRlbXMpXG4gICAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxuICAgICAgKGxpIHtyZWY6ICdpdGVtJywgY2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKSwgb25DbGljazogQGNsaWNrZWQsIG9uTW91c2VFbnRlcjogQG1vdXNlRW50ZXIgfSxcbiAgICAgICAgbmFtZVxuICAgICAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xuICAgICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWluc3BlY3RvckFycm93LWNvbGxhcHNlJ30pXG4gICAgICApXG5cbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBzaG93aW5nTWVudTogZmFsc2VcbiAgICB0aW1lb3V0OiBudWxsXG4gICAgc3ViTWVudTogbnVsbFxuXG4gIGJsdXI6IC0+XG4gICAgQHVuYmx1cigpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZSwgc3ViTWVudTogZmFsc2V9ICksIDUwMFxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cblxuICB1bmJsdXI6IC0+XG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XG5cbiAgc2V0U3ViTWVudTogKHN1Yk1lbnUpIC0+XG4gICAgQHNldFN0YXRlIHN1Yk1lbnU6IHN1Yk1lbnVcblxuICBzZWxlY3Q6IChpdGVtKSAtPlxuICAgIHJldHVybiBpZiBpdGVtPy5pdGVtc1xuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cbiAgICBpdGVtLmFjdGlvbj8oKVxuXG4gIHJlbmRlcjogLT5cbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxuICAgICAgICAoc3ZnIHt2ZXJzaW9uOiAnMS4xJywgd2lkdGg6IDE2LCBoZWlnaHQ6IDE2LCB2aWV3Qm94OiAnMCAwIDE2IDE2JywgZW5hYmxlQmFja2dyb3VuZDogJ25ldyAwIDAgMTYgMTYnfSxcbiAgICAgICAgICAoZyB7fSxcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXG4gICAgICAgICAgICAocmVjdCB7eTogNywgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxuICAgICAgICAgICAgKHJlY3Qge3k6IDEyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXG4gICAgICAgICAgKHVsIHt9LFxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBzZXRTdWJNZW51OiBAc2V0U3ViTWVudX0pIGZvciBpdGVtLCBpbmRleCBpbiBAcHJvcHMuaXRlbXNcbiAgICAgICAgICApXG4gICAgICAgICAgaWYgQHN0YXRlLnN1Yk1lbnVcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBzdHlsZTogQHN0YXRlLnN1Yk1lbnUuc3R5bGV9LFxuICAgICAgICAgICAgICAodWwge30sXG4gICAgICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBzdGF0ZS5zdWJNZW51Lml0ZW1zXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQGxhc3RDbGljayA9IDBcblxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcbiAgICBAbGFzdENsaWNrID0gbm93XG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sXG4gICAgICAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogaWYgQHByb3BzLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgdGhlbiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZScgZWxzZSAnaWNvbi1ub3RlVG9vbCd9KVxuICAgICAgQHByb3BzLm1ldGFkYXRhLm5hbWVcbiAgICApXG5cbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkaW5nOiB0cnVlXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGxvYWQgQHByb3BzLmZvbGRlclxuXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XG4gICAgaWYgbmV4dFByb3BzLmZvbGRlciBpc250IEBwcm9wcy5mb2xkZXJcbiAgICAgIEBsb2FkIG5leHRQcm9wcy5mb2xkZXJcblxuICBsb2FkOiAoZm9sZGVyKSAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IGZvbGRlciwgKGVyciwgbGlzdCkgPT5cbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxuICAgICAgQHNldFN0YXRlXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XG5cbiAgcGFyZW50U2VsZWN0ZWQ6IChlKSAtPlxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLmZvbGRlcj8ucGFyZW50XG5cbiAgcmVuZGVyOiAtPlxuICAgIGxpc3QgPSBbXVxuICAgIGlmIEBwcm9wcy5mb2xkZXIgaXNudCBudWxsXG4gICAgICBsaXN0LnB1c2ggKGRpdiB7a2V5OiAncGFyZW50Jywgb25DbGljazogQHBhcmVudFNlbGVjdGVkfSwgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6ICdpY29uLXBhbGV0dGVBcnJvdy1jb2xsYXBzZSd9KSwgJ1BhcmVudCBGb2xkZXInKVxuICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxuICAgICAgbGlzdC5wdXNoIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXG5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXG4gICAgICBlbHNlXG4gICAgICAgIGxpc3RcbiAgICApXG5cbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXG5cbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIEBnZXRTdGF0ZUZvckZvbGRlciBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAaXNPcGVuID0gQHByb3BzLmRpYWxvZy5hY3Rpb24gaXMgJ29wZW5GaWxlJ1xuXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcbiAgICBAc2V0U3RhdGVcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXG5cbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XG4gICAgQHNldFN0YXRlXG4gICAgICBsaXN0OiBsaXN0XG4gICAgICBtZXRhZGF0YTogQGZpbmRNZXRhZGF0YSAkLnRyaW0oQHN0YXRlLmZpbGVuYW1lKSwgbGlzdFxuXG4gIGdldFN0YXRlRm9yRm9sZGVyOiAoZm9sZGVyKSAtPlxuICAgIGZvbGRlcjogZm9sZGVyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xuICAgIGxpc3Q6IFtdXG5cbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbWV0YWRhdGFcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgQHNldFN0YXRlXG4gICAgICAgIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbnVsbFxuXG4gIGNvbmZpcm06IC0+XG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICBpZiBAaXNPcGVuXG4gICAgICAgICAgYWxlcnQgXCIje0BzdGF0ZS5maWxlbmFtZX0gbm90IGZvdW5kXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgICBuYW1lOiBmaWxlbmFtZVxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwYXJlbnQ6IEBzdGF0ZS5mb2xkZXIgb3IgbnVsbFxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAcHJvcHMuY2xvc2UoKVxuXG4gIHJlbW92ZTogLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XG4gICAgICAgIGlmIG5vdCBlcnJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXG4gICAgICAgICAgQHNldFN0YXRlXG4gICAgICAgICAgICBsaXN0OiBsaXN0XG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXG5cbiAgY2FuY2VsOiAtPlxuICAgIEBwcm9wcy5jbG9zZSgpXG5cbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUsIGxpc3QpIC0+XG4gICAgZm9yIG1ldGFkYXRhIGluIGxpc3RcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXG4gICAgbnVsbFxuXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxuICAgICAgQGNvbmZpcm0oKVxuXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcblxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxuXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxuICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpLCBzcGFuLCBpbnB1dH0gPSBSZWFjdC5ET01cblxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxuICAgIGZpbGVuYW1lOiBAcHJvcHMuZmlsZW5hbWVcblxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxuICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogbmV4dFByb3BzLmZpbGVuYW1lXG5cbiAgZmlsZW5hbWVDbGlja2VkOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIGlmIG5vdyAtIEBsYXN0Q2xpY2sgPD0gMjUwXG4gICAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXG4gICAgICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IHRydWVcbiAgICAgICAgc2V0VGltZW91dCAoPT4gQGZvY3VzRmlsZW5hbWUoKSksIDEwXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9wcy5jbGllbnQuc2F2ZUZpbGVEaWFsb2coKVxuICAgIEBsYXN0Q2xpY2sgPSBub3dcblxuICBmaWxlbmFtZUNoYW5nZWQ6IC0+XG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZmlsZW5hbWUoKS52YWx1ZVxuXG4gIGZpbGVuYW1lQmx1cnJlZDogLT5cbiAgICBAcmVuYW1lKClcblxuICBmaWxlbmFtZTogLT5cbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy5maWxlbmFtZSlcblxuICBmb2N1c0ZpbGVuYW1lOiAtPlxuICAgIGVsID0gQGZpbGVuYW1lKClcbiAgICBlbC5mb2N1cygpXG4gICAgaWYgdHlwZW9mIGVsLnNlbGVjdGlvblN0YXJ0IGlzICdudW1iZXInXG4gICAgICBlbC5zZWxlY3Rpb25TdGFydCA9IGVsLnNlbGVjdGlvbkVuZCA9IGVsLnZhbHVlLmxlbmd0aFxuICAgIGVsc2UgaWYgdHlwZW9mIGVsLmNyZWF0ZVRleHRSYW5nZSBpc250ICd1bmRlZmluZWQnXG4gICAgICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpXG4gICAgICByYW5nZS5jb2xsYXBzZSBmYWxzZVxuICAgICAgcmFuZ2Uuc2VsZWN0KClcblxuICByZW5hbWU6IC0+XG4gICAgZmlsZW5hbWUgPSBAc3RhdGUuZmlsZW5hbWUucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xuICAgIGlmIGZpbGVuYW1lLmxlbmd0aCA+IDBcbiAgICAgIEBwcm9wcy5jbGllbnQucmVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEsIGZpbGVuYW1lXG4gICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcblxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cbiAgICBpZiBlLmtleUNvZGUgaXMgMTNcbiAgICAgIEByZW5hbWUoKVxuICAgIGVsc2UgaWYgZS5rZXlDb2RlIGlzIDI3XG4gICAgICBAc2V0U3RhdGVcbiAgICAgICAgZmlsZW5hbWU6IEBwcm9wcy5maWxlbmFtZVxuICAgICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXG5cbiAgaGVscDogLT5cbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxuICAgICAgICAoRHJvcGRvd24ge2l0ZW1zOiBAcHJvcHMuaXRlbXN9KVxuICAgICAgICBpZiBAc3RhdGUuZWRpdGluZ0ZpbGVuYW1lXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30sXG4gICAgICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uQmx1cjogQGZpbGVuYW1lQmx1cnJlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXG4gICAgICAgICAgKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJywgb25DbGljazogQGZpbGVuYW1lQ2xpY2tlZH0sIEBzdGF0ZS5maWxlbmFtZSlcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXG4gICAgICApXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyIGFuZCBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCgpXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXG4gICAgICAgICAgKGkge3N0eWxlOiB7Zm9udFNpemU6IFwiMTNweFwifSwgY2xhc3NOYW1lOiAnY2xpY2thYmxlIGljb24taGVscCcsIG9uQ2xpY2s6IEBoZWxwfSlcbiAgICAgIClcbiAgICApXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXG5cbiAgY2xvc2U6IC0+XG4gICAgQHByb3BzLmNsb3NlPygpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tZXhcIiwgb25DbGljazogQGNsb3NlfSlcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xuICAgICAgICAgIClcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcbiAgICApXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcblxuICB3YXRjaEZvckVzY2FwZTogKGUpIC0+XG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XG4gICAgICBAcHJvcHMuY2xvc2U/KClcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXG5cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWJhY2tncm91bmQnfSlcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxuICAgIClcbiIsIk1vZGFsVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldydcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZmlsZS1kaWFsb2ctdGFiLXZpZXcnXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1Byb3ZpZGVyVGFiYmVkRGlhbG9nJ1xuXG4gIHJlbmRlcjogIC0+XG4gICAgW2NhcGFiaWxpdHksIFRhYkNvbXBvbmVudF0gPSBzd2l0Y2ggQHByb3BzLmRpYWxvZy5hY3Rpb25cbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZUNvcHknLCAnc2F2ZUZpbGVDb3B5JyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXG5cbiAgICB0YWJzID0gW11cbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcblxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXG4gICAgc3RhdGUgPVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcblxuICB0cmltOiAocykgLT5cbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcblxuICByZW5hbWU6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgQHByb3BzLmNhbGxiYWNrPyBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflJFTkFNRV9ESUFMT0cuQ0FOQ0VMJylcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1NoYXJlVXJsRGlhbG9nVmlldydcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy51cmwpPy5zZWxlY3QoKVxuXG4gIHZpZXc6IC0+XG4gICAgd2luZG93Lm9wZW4gQHByb3BzLnVybFxuXG4gICMgYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zdWRvZG9raS9jb3B5LXRvLWNsaXBib2FyZC9ibG9iL21hc3Rlci9pbmRleC5qc1xuICBjb3B5OiAtPlxuICAgIGNvcGllZCA9IHRydWVcbiAgICB0cnlcbiAgICAgIG1hcmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdtYXJrJ1xuICAgICAgbWFyay5pbm5lckhUTUwgPSBAcHJvcHMudXJsXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkIG1hcmtcblxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKClcbiAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxuXG4gICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICAgIHJhbmdlLnNlbGVjdE5vZGUgbWFya1xuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlIHJhbmdlXG5cbiAgICAgIGNvcGllZCA9IGRvY3VtZW50LmV4ZWNDb21tYW5kICdjb3B5J1xuICAgIGNhdGNoXG4gICAgICB0cnlcbiAgICAgICAgd2luZG93LmNsaXBib2FyZERhdGEuc2V0RGF0YSAndGV4dCcsIEBwcm9wcy51cmxcbiAgICAgIGNhdGNoXG4gICAgICAgIGNvcGllZCA9IGZhbHNlXG4gICAgZmluYWxseVxuICAgICAgaWYgc2VsZWN0aW9uXG4gICAgICAgIGlmIHR5cGVvZiBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSByYW5nZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXG4gICAgICBpZiBtYXJrXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQgbWFya1xuICAgICAgYWxlcnQgdHIgKGlmIGNvcGllZCB0aGVuIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIiBlbHNlIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCIpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5TSEFSRUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1kaWFsb2cnfSxcbiAgICAgICAgKGlucHV0IHtyZWY6ICd1cmwnLCB2YWx1ZTogQHByb3BzLnVybCwgcmVhZE9ubHk6IHRydWV9KVxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgICAgaWYgZG9jdW1lbnQuZXhlY0NvbW1hbmQgb3Igd2luZG93LmNsaXBib2FyZERhdGFcbiAgICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb3B5fSwgdHIgJ35TSEFSRV9ESUFMT0cuQ09QWScpXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHZpZXd9LCB0ciAnflNIQVJFX0RJQUxPRy5WSUVXJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflNIQVJFX0RJQUxPRy5DTE9TRScpXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXG5cbmNsYXNzIFRhYkluZm9cbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXG5cblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xuXG4gIGNsaWNrZWQ6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxuXG4gIHJlbmRlcjogLT5cbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxuXG4gIHN0YXRpY3M6XG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXG5cbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcblxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxuICAgIChUYWJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcbiAgICAgIGtleTogaW5kZXhcbiAgICAgIGluZGV4OiBpbmRleFxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxuICAgIClcblxuICByZW5kZXJUYWJzOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxuICAgIClcblxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xuICAgICAgICAoZGl2IHtcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgICAgc3R5bGU6XG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRhYi5jb21wb25lbnRcbiAgICAgICAgKVxuICAgIClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxuICAgICAgQHJlbmRlclRhYnMoKVxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxuICAgIClcbiJdfQ==
