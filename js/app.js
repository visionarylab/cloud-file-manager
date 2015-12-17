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
    var Provider, allProviders, availableProviders, base, base1, base2, i, j, k, len, len1, len2, provider, providerName, providerOptions, ref, ref1, ref2, ref3, ref4, ref5;
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
    this._setWindowTitle(metadata != null ? metadata.name : void 0);
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

  CloudFileManagerClient.prototype._setWindowTitle = function(name) {
    var ref, ref1;
    if ((ref = this.appOptions) != null ? (ref1 = ref.ui) != null ? ref1.windowTitleSuffix : void 0 : void 0) {
      return document.title = "" + ((name != null ? name.length : void 0) > 0 ? name : tr("~MENUBAR.UNTITLED_DOCUMENT")) + this.appOptions.ui.windowTitleSeparator + this.appOptions.ui.windowTitleSuffix;
    }
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
      e.target.setAttribute('href', "data:" + this.props.mimeType + "," + (encodeURIComponent(this.props.content)));
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
    var ref1, ref2;
    e.preventDefault();
    e.stopPropagation();
    if ((ref1 = this.props.client.state.metadata) != null ? (ref2 = ref1.provider) != null ? ref2.can('rename') : void 0 : void 0) {
      this.setState({
        editingFilename: true
      });
      return setTimeout(((function(_this) {
        return function() {
          return _this.focusFilename();
        };
      })(this)), 10);
    } else {
      return this.props.client.saveFileDialog();
    }
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
    var TabComponent, capability, component, i, j, len, provider, ref, ref1, ref2, ref3, selectedTabIndex, tabs;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdWkuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGdldC1xdWVyeS1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxibG9ja2luZy1tb2RhbC12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxrQkFBUixDQUFwQjs7QUFFVixzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFDMUMsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsVUFBUixDQUFELENBQW9CLENBQUM7O0FBRTlDLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLHlCQUFSOztBQUVWO0VBRVMsMEJBQUMsT0FBRDtJQUVYLElBQUMsQ0FBQSxXQUFELEdBQWUsc0JBQXNCLENBQUM7SUFFdEMsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLHNCQUFBLENBQUE7SUFDZCxJQUFDLENBQUEsVUFBRCxHQUFjO0VBTEg7OzZCQU9iLElBQUEsR0FBTSxTQUFDLFVBQUQsRUFBYyxXQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7O01BQWEsY0FBYzs7SUFDaEMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLEdBQTBCO1dBQzFCLElBQUMsQ0FBQSxNQUFNLENBQUMsYUFBUixDQUFzQixJQUFDLENBQUEsVUFBdkI7RUFGSTs7NkJBSU4sV0FBQSxHQUFhLFNBQUMsVUFBRCxFQUFjLE1BQWQsRUFBc0IsYUFBdEI7SUFBQyxJQUFDLENBQUEsYUFBRDs7TUFBcUIsZ0JBQWdCOztJQUNqRCxJQUFDLENBQUEsSUFBRCxDQUFNLElBQUMsQ0FBQSxVQUFQLEVBQW1CLElBQW5CO0lBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLENBQWUsYUFBZjtXQUNBLElBQUMsQ0FBQSxVQUFELENBQVksUUFBUSxDQUFDLGNBQVQsQ0FBd0IsTUFBeEIsQ0FBWjtFQUhXOzs2QkFLYixhQUFBLEdBQWUsU0FBQyxhQUFEO0FBQ2IsUUFB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEEsSUFBQSw0TUFBQTtFQUFBOztBQUFBLEVBQUEsR0FBSyxPQUFBLENBQVEsbUJBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxtQkFBUjs7QUFFWCxrQkFBQSxHQUFxQixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFFdEMsb0JBQUEsR0FBdUIsT0FBQSxDQUFRLG1DQUFSOztBQUN2QixnQkFBQSxHQUFtQixPQUFBLENBQVEsK0JBQVI7O0FBQ25CLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDdEIscUJBQUEsR0FBd0IsT0FBQSxDQUFRLHFDQUFSOztBQUV4QixtQkFBQSxHQUFzQixDQUFDLE9BQUEsQ0FBUSxnQ0FBUixDQUFELENBQTBDLENBQUM7O0FBQ2pFLFlBQUEsR0FBZSxDQUFDLE9BQUEsQ0FBUSxnQ0FBUixDQUFELENBQTBDLENBQUM7O0FBRXBEO0VBRVMscUNBQUMsS0FBRCxFQUFRLEtBQVIsRUFBb0IsU0FBcEIsRUFBc0MsTUFBdEM7SUFBQyxJQUFDLENBQUEsT0FBRDtJQUFPLElBQUMsQ0FBQSx1QkFBRCxRQUFRO0lBQUksSUFBQyxDQUFBLCtCQUFELFlBQVk7SUFBTSxJQUFDLENBQUEseUJBQUQsU0FBUztFQUEvQzs7Ozs7O0FBRVQ7RUFFUyxnQ0FBQyxPQUFEO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FDRTtNQUFBLGtCQUFBLEVBQW9CLEVBQXBCOztJQUNGLElBQUMsQ0FBQSxVQUFELEdBQWM7SUFDZCxJQUFDLENBQUEsV0FBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLEdBQUQsR0FBVyxJQUFBLGtCQUFBLENBQW1CLElBQW5CO0lBQ1gsSUFBQyxDQUFBLFNBQUQsR0FBYTtFQU5GOzttQ0FRYixhQUFBLEdBQWUsU0FBQyxXQUFEO0FBRWIsUUFBQTtJQUZjLElBQUMsQ0FBQSxtQ0FBRCxjQUFjO0lBRTVCLFlBQUEsR0FBZTtBQUNmO0FBQUEsU0FBQSxxQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxTQUFULENBQUEsQ0FBSDtRQUNFLFlBQWEsQ0FBQSxRQUFRLENBQUMsSUFBVCxDQUFiLEdBQThCLFNBRGhDOztBQURGO0lBS0EsSUFBRyxDQUFJLElBQUMsQ0FBQSxVQUFVLENBQUMsU0FBbkI7TUFDRSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosR0FBd0I7QUFDeEIsV0FBQSw0QkFBQTs7UUFDRSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQXJCLENBQTBCLFlBQTFCO0FBREYsT0FGRjs7SUFNQSxrQkFBQSxHQUFxQjtBQUNyQjtBQUFBLFNBQUEsd0NBQUE7O01BQ0UsT0FBcUMsUUFBQSxDQUFTLFFBQVQsQ0FBSCxHQUEwQixDQUFDLFFBQUQsRUFBVyxFQUFYLENBQTFCLEdBQThDLENBQUMsUUFBUSxDQUFDLElBQVYsRUFBZ0IsUUFBaEIsQ0FBaEYsRUFBQyxzQkFBRCxFQUFlOztRQUVmLGVBQWUsQ0FBQyxXQUFZLElBQUMsQ0FBQSxVQUFVLENBQUM7O01BQ3hDLElBQUcsQ0FBSSxZQUFQO1FBQ0UsSUFBQyxDQUFBLE1BQUQsQ0FBUSw0RUFBUixFQURGO09BQUEsTUFBQTtRQUdFLElBQUcsWUFBYSxDQUFBLFlBQUEsQ0FBaEI7VUFDRSxRQUFBLEdBQVcsWUFBYSxDQUFBLFlBQUE7VUFDeEIsUUFBQSxHQUFlLElBQUEsUUFBQSxDQUFTLGVBQVQsRUFBMEIsSUFBMUI7VUFDZixJQUFDLENBQUEsU0FBVSxDQUFBLFlBQUEsQ0FBWCxHQUEyQjtVQUMzQixrQkFBa0IsQ0FBQyxJQUFuQixDQUF3QixRQUF4QixFQUpGO1NBQUEsTUFBQTtVQU1FLElBQUMsQ0FBQSxNQUFELENBQVEsb0JBQUEsR0FBcUIsWUFBN0IsRUFORjtTQUhGOztBQUpGO0lBY0EsSUFBQyxDQUFBLFNBQUQsQ0FBVztNQUFBLGtCQUFBLEVBQW9CLGtCQUFwQjtLQUFYO0FBR0E7QUFBQSxTQUFBLHdDQUFBOztNQUNFLElBQUcsUUFBUSxDQUFDLEdBQVQsQ0FBYSxPQUFiLENBQUg7UUFDRSxJQUFDLENBQUEsU0FBRCxDQUFXO1VBQUEsYUFBQSxFQUFlLFFBQWY7U0FBWDtBQUNBLGNBRkY7O0FBREY7WUFLQSxJQUFDLENBQUEsV0FBVSxDQUFDLFdBQUQsQ0FBQyxLQUFPO2FBQ25CLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBRSxDQUFDLDJCQUFELENBQUMsb0JBQXNCLFFBQVEsQ0FBQzthQUM5QyxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQUUsQ0FBQyw4QkFBRCxDQUFDLHVCQUF5QjtJQUN4QyxJQUFDLENBQUEsZUFBRCxDQUFBO0lBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUF0QjtJQUdBLElBQUcsSUFBQyxDQUFBLFVBQVUsQ0FBQyxnQkFBZjtNQUNFLElBQUMsQ0FBQSxRQUFELENBQVUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxnQkFBdEIsRUFERjs7SUFJQSxtQkFBbUIsQ0FBQyxtQkFBcEIsQ0FDRTtNQUFBLE9BQUEsRUFBUyxJQUFDLENBQUEsVUFBVSxDQUFDLE9BQVosSUFBdUIsRUFBaEM7TUFDQSxVQUFBLEVBQVksSUFBQyxDQUFBLFVBQVUsQ0FBQyxVQUFaLElBQTBCLEVBRHRDO01BRUEsV0FBQSxFQUFhLElBQUMsQ0FBQSxVQUFVLENBQUMsV0FBWixJQUEyQixFQUZ4QztLQURGO0lBS0EsSUFBQyxDQUFBLG9CQUFELDhDQUF5QyxDQUFFLGNBQWhCLENBQStCLHNCQUEvQixXQUFILEdBQStELElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBRSxDQUFDLG9CQUE5RSxHQUF3RztXQUNoSSxJQUFDLENBQUEscUJBQUQsOENBQTBDLENBQUUsY0FBaEIsQ0FBK0IsdUJBQS9CLFdBQUgsR0FBZ0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUFFLENBQUMscUJBQS9FLEdBQTBHO0VBdkR0SDs7bUNBeURmLGtCQUFBLEdBQW9CLFNBQUMsSUFBRCxFQUFPLFVBQVA7QUFDbEIsUUFBQTtBQUFBO0FBQUE7U0FBQSxxQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQWlCLElBQXBCOztVQUNFLFFBQVEsQ0FBQyxVQUFXOztBQUNwQixhQUFBLGlCQUFBO1VBQ0UsUUFBUSxDQUFDLE9BQVEsQ0FBQSxHQUFBLENBQWpCLEdBQXdCLFVBQVcsQ0FBQSxHQUFBO0FBRHJDO0FBRUEsY0FKRjtPQUFBLE1BQUE7NkJBQUE7O0FBREY7O0VBRGtCOzttQ0FRcEIsT0FBQSxHQUFTLFNBQUE7V0FDUCxJQUFDLENBQUEsTUFBRCxDQUFRLFdBQVIsRUFBcUI7TUFBQyxNQUFBLEVBQVEsSUFBVDtLQUFyQjtFQURPOzttQ0FHVCxNQUFBLEdBQVEsU0FBQyxRQUFEO0lBQ04sSUFBRyxRQUFIO2FBQ0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxJQUFaLENBQWlCLFFBQWpCLEVBREY7O0VBRE07O21DQUlSLGNBQUEsR0FBZ0IsU0FBQyxJQUFEO0lBQ2QsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLElBQXBCO1dBQTBCO0VBRFo7O21DQUdoQixlQUFBLEdBQWlCLFNBQUMsSUFBRDtJQUNmLElBQUMsQ0FBQSxHQUFHLENBQUMsZUFBTCxDQUFxQixJQUFyQjtXQUEyQjtFQURaOzttQ0FHakIsZUFBQSxHQUFpQixTQUFDLEdBQUQsRUFBTSxJQUFOO0lBQ2YsSUFBQyxDQUFBLEdBQUcsQ0FBQyxlQUFMLENBQXFCLEdBQXJCLEVBQTBCLElBQTFCO1dBQWdDO0VBRGpCOzttQ0FHakIsb0JBQUEsR0FBc0IsU0FBQyxHQUFELEVBQU0sSUFBTjtJQUNwQixJQUFDLENBQUEsR0FBRyxDQUFDLG9CQUFMLENBQTBCLEdBQTFCLEVBQStCLElBQS9CO1dBQXFDO0VBRGpCOzttQ0FHdEIsbUJBQUEsR0FBcUIsU0FBQyxHQUFELEVBQU0sSUFBTjtJQUNuQixJQUFDLENBQUEsR0FBRyxDQUFDLG1CQUFMLENBQXlCLEdBQXpCLEVBQThCLElBQTlCO1dBQW9DO0VBRGpCOzttQ0FHckIsY0FBQSxHQUFnQixTQUFDLElBQUQ7V0FDZCxJQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsQ0FBb0IsSUFBcEI7RUFEYzs7bUNBR2hCLE9BQUEsR0FBUyxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7SUFDbkIsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFDQSxJQUFDLENBQUEsV0FBRCxDQUFBO1dBQ0EsSUFBQyxDQUFBLE1BQUQsQ0FBUSxXQUFSLEVBQXFCO01BQUMsT0FBQSxFQUFTLEVBQVY7S0FBckI7RUFITzs7bUNBS1QsYUFBQSxHQUFlLFNBQUMsUUFBRDs7TUFBQyxXQUFXOztJQUN6QixJQUFHLElBQUMsQ0FBQSxvQkFBSjthQUNFLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBQyxDQUFBLGNBQUQsQ0FBQSxDQUFaLEVBQStCLFFBQS9CLEVBREY7S0FBQSxNQUVLLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFWO01BQ0gsSUFBRyxJQUFDLENBQUEsaUJBQUQsSUFBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFqQztRQUNFLElBQUMsQ0FBQSxJQUFELENBQUE7ZUFDQSxJQUFDLENBQUEsT0FBRCxDQUFBLEVBRkY7T0FBQSxNQUdLLElBQUcsT0FBQSxDQUFRLEVBQUEsQ0FBRyxtQkFBSCxDQUFSLENBQUg7ZUFDSCxJQUFDLENBQUEsT0FBRCxDQUFBLEVBREc7T0FKRjtLQUFBLE1BQUE7YUFPSCxJQUFDLENBQUEsT0FBRCxDQUFBLEVBUEc7O0VBSFE7O21DQVlmLFFBQUEsR0FBVSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ1IsUUFBQTs7TUFEbUIsV0FBVzs7SUFDOUIsOERBQXFCLENBQUUsR0FBcEIsQ0FBd0IsTUFBeEIsbUJBQUg7YUFDRSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQWxCLENBQXVCLFFBQXZCLEVBQWlDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxHQUFELEVBQU0sT0FBTjtVQUMvQixJQUF1QixHQUF2QjtBQUFBLG1CQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztVQUNBLEtBQUMsQ0FBQSxpQkFBRCxDQUFBO1VBQ0EsS0FBQyxDQUFBLFlBQUQsQ0FBYyxZQUFkLEVBQTRCLE9BQTVCLEVBQXFDLFFBQXJDLEVBQStDO1lBQUMsYUFBQSxFQUFlLE9BQU8sQ0FBQyxLQUFSLENBQUEsQ0FBaEI7V0FBL0M7a0RBQ0EsU0FBVSxTQUFTO1FBSlk7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWpDLEVBREY7S0FBQSxNQUFBO2FBT0UsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsUUFBaEIsRUFQRjs7RUFEUTs7bUNBVVYsY0FBQSxHQUFnQixTQUFDLFFBQUQ7O01BQUMsV0FBVzs7SUFDMUIsSUFBRyxDQUFDLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFaLENBQUEsSUFBc0IsQ0FBQyxPQUFBLENBQVEsRUFBQSxDQUFHLG9CQUFILENBQVIsQ0FBRCxDQUF6QjthQUNFLElBQUMsQ0FBQSxHQUFHLENBQUMsY0FBTCxDQUFvQixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsUUFBRDtpQkFDbEIsS0FBQyxDQUFBLFFBQUQsQ0FBVSxRQUFWLEVBQW9CLFFBQXBCO1FBRGtCO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFwQixFQURGOztFQURjOzttQ0FLaEIsaUJBQUEsR0FBbUIsU0FBQyxFQUFEO0FBQ2pCLFFBQUE7eURBQW9CLENBQUUsaUJBQXRCLENBQXdDLEVBQXhDLEVBQTRDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxHQUFELEVBQU0sT0FBTixFQUFlLFFBQWY7UUFDMUMsSUFBdUIsR0FBdkI7QUFBQSxpQkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7ZUFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLFlBQWQsRUFBNEIsT0FBNUIsRUFBcUMsUUFBckMsRUFBK0M7VUFBQyxZQUFBLEVBQWMsS0FBZjtVQUFzQixhQUFBLEVBQWUsT0FBTyxDQUFDLEtBQVIsQ0FBQSxDQUFyQztTQUEvQztNQUYwQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBNUM7RUFEaUI7O21DQUtuQixTQUFBLEdBQVcsU0FBQyxNQUFEO0FBQ1QsUUFBQTtJQUFBLE1BQWlDLE1BQU0sQ0FBQyxLQUFQLENBQWEsR0FBYixDQUFqQyxFQUFDLHFCQUFELEVBQWU7SUFDZixRQUFBLEdBQVcsSUFBQyxDQUFBLFNBQVUsQ0FBQSxZQUFBO0lBQ3RCLElBQUcsUUFBSDthQUNFLFFBQVEsQ0FBQyxVQUFULENBQW9CLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxVQUFEO1VBQ2xCLElBQUcsVUFBSDttQkFDRSxRQUFRLENBQUMsU0FBVCxDQUFtQixjQUFuQixFQUFtQyxTQUFDLEdBQUQsRUFBTSxPQUFOLEVBQWUsUUFBZjtjQUNqQyxJQUF1QixHQUF2QjtBQUFBLHVCQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztxQkFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLFlBQWQsRUFBNEIsT0FBNUIsRUFBcUMsUUFBckMsRUFBK0M7Z0JBQUMsYUFBQSxFQUFlLE9BQU8sQ0FBQyxLQUFSLENBQUEsQ0FBaEI7ZUFBL0M7WUFGaUMsQ0FBbkMsRUFERjs7UUFEa0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCLEVBREY7O0VBSFM7O21DQVVYLElBQUEsR0FBTSxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDaEIsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxhQUFEO2VBQ3hCLEtBQUMsQ0FBQSxXQUFELENBQWEsYUFBYixFQUE0QixRQUE1QjtNQUR3QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7RUFESTs7bUNBSU4sV0FBQSxHQUFhLFNBQUMsYUFBRCxFQUFnQixRQUFoQjs7TUFBZ0IsV0FBVzs7SUFDdEMsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVY7YUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVLGFBQVYsRUFBeUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFoQyxFQUEwQyxRQUExQyxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxjQUFELENBQWdCLGFBQWhCLEVBQStCLFFBQS9CLEVBSEY7O0VBRFc7O21DQU1iLFFBQUEsR0FBVSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsUUFBMUI7QUFDUixRQUFBOztNQURrQyxXQUFXOztJQUM3Qyw4REFBcUIsQ0FBRSxHQUFwQixDQUF3QixNQUF4QixtQkFBSDtNQUNFLElBQUMsQ0FBQSxTQUFELENBQ0U7UUFBQSxNQUFBLEVBQVEsUUFBUjtPQURGO01BRUEsY0FBQSxHQUFpQixJQUFDLENBQUEsNkJBQUQsQ0FBK0IsYUFBL0IsRUFBOEMsUUFBOUM7YUFDakIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFsQixDQUF1QixjQUF2QixFQUF1QyxRQUF2QyxFQUFpRCxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRDtVQUMvQyxJQUF1QixHQUF2QjtBQUFBLG1CQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztVQUNBLElBQUcsS0FBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLEtBQXFCLFFBQXhCO1lBQ0UsS0FBQyxDQUFBLGlCQUFELENBQUEsRUFERjs7VUFFQSxLQUFDLENBQUEsWUFBRCxDQUFjLFdBQWQsRUFBMkIsY0FBM0IsRUFBMkMsUUFBM0MsRUFBcUQ7WUFBQyxLQUFBLEVBQU8sSUFBUjtXQUFyRDtrREFDQSxTQUFVLGdCQUFnQjtRQUxxQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBakQsRUFKRjtLQUFBLE1BQUE7YUFXRSxJQUFDLENBQUEsY0FBRCxDQUFnQixhQUFoQixFQUErQixRQUEvQixFQVhGOztFQURROzttQ0FjVixjQUFBLEdBQWdCLFNBQUMsYUFBRCxFQUF1QixRQUF2Qjs7TUFBQyxnQkFBZ0I7OztNQUFNLFdBQVc7O1dBQ2hELElBQUMsQ0FBQSxHQUFHLENBQUMsY0FBTCxDQUFvQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsUUFBRDtlQUNsQixLQUFDLENBQUEsV0FBRCxDQUFhLGFBQWIsRUFBNEIsUUFBNUIsRUFBc0MsUUFBdEM7TUFEa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCO0VBRGM7O21DQUloQixnQkFBQSxHQUFrQixTQUFDLGFBQUQsRUFBdUIsUUFBdkI7O01BQUMsZ0JBQWdCOzs7TUFBTSxXQUFXOztXQUNsRCxJQUFDLENBQUEsR0FBRyxDQUFDLGdCQUFMLENBQXNCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxRQUFEO2VBQ3BCLEtBQUMsQ0FBQSxXQUFELENBQWEsYUFBYixFQUE0QixRQUE1QixFQUFzQyxRQUF0QztNQURvQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEI7RUFEZ0I7O21DQUlsQixjQUFBLEdBQWdCLFNBQUMsYUFBRCxFQUF1QixRQUF2QjtBQUNkLFFBQUE7O01BRGUsZ0JBQWdCOzs7TUFBTSxXQUFXOztJQUNoRCxRQUFBLEdBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEI7QUFDVCxZQUFBO1FBQUEsT0FBQSxHQUFVLG1CQUFtQixDQUFDLDJCQUFwQixDQUFnRCxhQUFoRDtlQUNWLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBbEIsQ0FBdUIsT0FBdkIsRUFBZ0MsUUFBaEMsRUFBMEMsU0FBQyxHQUFEO1VBQ3hDLElBQXVCLEdBQXZCO0FBQUEsbUJBQU8sS0FBQyxDQUFBLE1BQUQsQ0FBUSxHQUFSLEVBQVA7O1VBQ0EsSUFBRyxLQUFDLENBQUEscUJBQUo7WUFDRSxNQUFNLENBQUMsSUFBUCxDQUFZLEtBQUMsQ0FBQSxjQUFELENBQWdCLFlBQUEsR0FBYSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQS9CLEdBQW9DLEdBQXBDLEdBQXNDLENBQUMsa0JBQUEsQ0FBbUIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxrQkFBbEIsQ0FBcUMsUUFBckMsQ0FBbkIsQ0FBRCxDQUF0RCxDQUFaLEVBREY7O2tEQUVBLFNBQVUsU0FBUztRQUpxQixDQUExQztNQUZTO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtXQU9YLElBQUMsQ0FBQSxHQUFHLENBQUMsY0FBTCxDQUFvQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsUUFBRDtRQUNsQixJQUFHLGFBQUEsS0FBaUIsSUFBcEI7aUJBQ0UsS0FBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLFNBQUMsYUFBRDttQkFDeEIsUUFBQSxDQUFTLGFBQVQsRUFBd0IsUUFBeEI7VUFEd0IsQ0FBMUIsRUFERjtTQUFBLE1BQUE7aUJBSUUsUUFBQSxDQUFTLGFBQVQsRUFBd0IsUUFBeEIsRUFKRjs7TUFEa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCO0VBUmM7O21DQWVoQixZQUFBLEdBQWMsU0FBQTtBQUNaLFFBQUE7SUFBQSxlQUFBLEdBQWtCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxnQkFBRDtlQUNoQixLQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsQ0FBb0IsS0FBQyxDQUFBLGNBQUQsQ0FBZ0IsYUFBQSxHQUFjLGdCQUE5QixDQUFwQjtNQURnQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7SUFHbEIsZ0JBQUEsa0RBQXdDLENBQUUsR0FBdkIsQ0FBMkIsa0JBQTNCO0lBQ25CLElBQUcsZ0JBQUg7YUFDRSxlQUFBLENBQWdCLGdCQUFoQixFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxLQUFELENBQU8sQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLGdCQUFEO1VBQ0wsS0FBQyxDQUFBLEtBQUQsQ0FBQTtpQkFDQSxlQUFBLENBQWdCLGdCQUFoQjtRQUZLO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFQLEVBSEY7O0VBTFk7O21DQVlkLFdBQUEsR0FBYSxTQUFBO1dBQ1gsSUFBQyxDQUFBLEtBQUQsQ0FBQTtFQURXOzttQ0FHYixLQUFBLEdBQU8sU0FBQyxRQUFEO0lBQ0wsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGFBQVY7YUFDRSxJQUFDLENBQUEsTUFBRCxDQUFRLFlBQVIsRUFBc0IsRUFBdEIsRUFBMEIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLGFBQUQ7QUFDeEIsY0FBQTtVQUFBLEtBQUMsQ0FBQSxTQUFELENBQ0U7WUFBQSxPQUFBLEVBQVMsSUFBVDtXQURGO1VBRUEsY0FBQSxHQUFpQixLQUFDLENBQUEsNkJBQUQsQ0FBK0IsYUFBL0I7aUJBQ2pCLEtBQUMsQ0FBQSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQXJCLENBQTJCLGNBQTNCLEVBQTJDLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBbEQsRUFBNEQsU0FBQyxHQUFELEVBQU0sZUFBTjtZQUMxRCxJQUF1QixHQUF2QjtBQUFBLHFCQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztZQUNBLEtBQUMsQ0FBQSxZQUFELENBQWMsWUFBZCxFQUE0QixjQUE1QixFQUE0QyxLQUFDLENBQUEsS0FBSyxDQUFDLFFBQW5EO29EQUNBLFNBQVU7VUFIZ0QsQ0FBNUQ7UUFKd0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCLEVBREY7O0VBREs7O21DQVdQLGNBQUEsR0FBZ0IsU0FBQyxRQUFEO0FBQ2QsUUFBQTs7TUFEZSxXQUFXOztJQUMxQixFQUFBLGtEQUEwQixDQUFFLEdBQXZCLENBQTJCLGtCQUEzQjtJQUNMLElBQUcsRUFBQSxJQUFPLGtDQUFWO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFhLENBQUMsaUJBQXJCLENBQXVDLEVBQXZDLEVBQTJDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxHQUFELEVBQU0sT0FBTixFQUFlLFFBQWY7VUFDekMsSUFBdUIsR0FBdkI7QUFBQSxtQkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7VUFDQSxLQUFDLENBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUF0QixDQUFxQyxPQUFyQztVQUNBLEtBQUMsQ0FBQSxZQUFELENBQWMsWUFBZCxFQUE0QixPQUE1QixFQUFxQyxRQUFyQyxFQUErQztZQUFDLGFBQUEsRUFBZSxPQUFPLENBQUMsS0FBUixDQUFBLENBQWhCO1dBQS9DO2tEQUNBLFNBQVU7UUFKK0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTNDLEVBREY7O0VBRmM7O21DQVNoQixvQkFBQSxHQUFzQixTQUFDLFFBQUQ7QUFDcEIsUUFBQTs7TUFEcUIsV0FBVzs7SUFDaEMsb0RBQXdCLENBQUUsR0FBdkIsQ0FBMkIsa0JBQTNCLFdBQUEsSUFBbUQsa0NBQW5ELElBQTZFLE9BQUEsQ0FBUSxFQUFBLENBQUcsZ0NBQUgsQ0FBUixDQUFoRjthQUNFLElBQUMsQ0FBQSxjQUFELENBQWdCLFFBQWhCLEVBREY7O0VBRG9COzttQ0FJdEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDMUIsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxPQUFEO0FBQ3hCLFlBQUE7ZUFBQSxLQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsMkNBQW1DLENBQUUsYUFBckMsRUFBMkMsS0FBQyxDQUFBLFVBQVUsQ0FBQyxRQUF2RCxFQUFpRSxPQUFqRSxFQUEwRSxRQUExRTtNQUR3QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7RUFEYzs7bUNBSWhCLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFFBQXBCO0lBQ04sSUFBRyxPQUFBLEtBQWEsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEM7YUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBekIsQ0FBZ0MsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUF2QyxFQUFpRCxPQUFqRCxFQUEwRCxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRCxFQUFNLFFBQU47QUFDeEQsY0FBQTtVQUFBLElBQXVCLEdBQXZCO0FBQUEsbUJBQU8sS0FBQyxDQUFBLE1BQUQsQ0FBUSxHQUFSLEVBQVA7OztlQUNxQixDQUFFLFdBQXZCLENBQW1DO2NBQUEsT0FBQSxFQUFTLFFBQVEsQ0FBQyxJQUFsQjthQUFuQzs7VUFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLGFBQWQsRUFBNkIsS0FBQyxDQUFBLEtBQUssQ0FBQyxjQUFwQyxFQUFvRCxRQUFwRDtrREFDQSxTQUFVO1FBSjhDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExRCxFQURGOztFQURNOzttQ0FRUixZQUFBLEdBQWMsU0FBQyxRQUFEOztNQUFDLFdBQVc7O0lBQ3hCLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFWO2FBQ0UsSUFBQyxDQUFBLEdBQUcsQ0FBQyxZQUFMLENBQWtCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWxDLEVBQXdDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxPQUFEO2lCQUN0QyxLQUFDLENBQUEsTUFBRCxDQUFRLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZixFQUF5QixPQUF6QixFQUFrQyxRQUFsQztRQURzQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEMsRUFERjtLQUFBLE1BQUE7OENBSUUsU0FBVSxxQ0FKWjs7RUFEWTs7bUNBT2Qsa0JBQUEsR0FBb0IsU0FBQyxRQUFEOztNQUFDLFdBQVc7O0lBQzlCLElBQUcsa0NBQUEsSUFBMEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFwQzthQUNFLElBQUMsQ0FBQSxZQUFELENBQWMsWUFBZCxFQUE0QixJQUFDLENBQUEsS0FBSyxDQUFDLGFBQW5DLEVBQWtELElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBekQsRUFBbUU7UUFBQyxhQUFBLEVBQWUsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBckIsQ0FBQSxDQUFoQjtPQUFuRSxFQURGOztFQURrQjs7bUNBSXBCLHdCQUFBLEdBQTBCLFNBQUMsUUFBRDs7TUFBQyxXQUFXOztJQUNwQyxJQUFHLGtDQUFBLElBQTBCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBcEM7TUFDRSxJQUFHLE9BQUEsQ0FBUSxFQUFBLENBQUcsZ0NBQUgsQ0FBUixDQUFIO2VBQ0UsSUFBQyxDQUFBLGtCQUFELENBQW9CLFFBQXBCLEVBREY7T0FERjtLQUFBLE1BQUE7OENBSUUsU0FBVSw4RUFKWjs7RUFEd0I7O21DQU8xQixLQUFBLEdBQU8sU0FBQyxPQUFEOztNQUFDLFVBQVU7O1dBQ2hCLElBQUMsQ0FBQSxTQUFELENBQ0U7TUFBQSxLQUFBLEVBQU8sT0FBUDtNQUNBLEtBQUEsRUFBZ0IsT0FBVCxHQUFBLEtBQUEsR0FBQSxNQURQO0tBREY7RUFESzs7bUNBS1AsUUFBQSxHQUFVLFNBQUMsUUFBRDtJQUNSLElBQUcsSUFBQyxDQUFBLGlCQUFKO01BQ0UsYUFBQSxDQUFjLElBQUMsQ0FBQSxpQkFBZixFQURGOztJQUlBLElBQUcsUUFBQSxHQUFXLElBQWQ7TUFDRSxRQUFBLEdBQVcsSUFBSSxDQUFDLEtBQUwsQ0FBVyxRQUFBLEdBQVcsSUFBdEIsRUFEYjs7SUFFQSxJQUFHLFFBQUEsR0FBVyxDQUFkO2FBQ0UsSUFBQyxDQUFBLGlCQUFELEdBQXFCLFdBQUEsQ0FBWSxDQUFDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUFHLGNBQUE7VUFBQSxJQUFXLEtBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxnRkFBMEMsQ0FBRSxHQUEzQixDQUErQixNQUEvQixvQkFBNUI7bUJBQUEsS0FBQyxDQUFBLElBQUQsQ0FBQSxFQUFBOztRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFELENBQVosRUFBcUYsUUFBQSxHQUFXLElBQWhHLEVBRHZCOztFQVBROzttQ0FVVixZQUFBLEdBQWMsU0FBQTtXQUNaO0VBRFk7O21DQUdkLGlCQUFBLEdBQW1CLFNBQUMsVUFBRDtXQUNqQixJQUFDLENBQUEsR0FBRyxDQUFDLGFBQUwsQ0FBbUIsVUFBbkI7RUFEaUI7O21DQUduQixXQUFBLEdBQWEsU0FBQyxhQUFELEVBQWdCLFFBQWhCLEVBQTBCLFFBQTFCO0lBQ1gsSUFBRyxhQUFBLEtBQW1CLElBQXRCO2FBQ0UsSUFBQyxDQUFBLFFBQUQsQ0FBVSxhQUFWLEVBQXlCLFFBQXpCLEVBQW1DLFFBQW5DLEVBREY7S0FBQSxNQUFBO2FBR0UsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxhQUFEO2lCQUN4QixLQUFDLENBQUEsUUFBRCxDQUFVLGFBQVYsRUFBeUIsUUFBekIsRUFBbUMsUUFBbkM7UUFEd0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCLEVBSEY7O0VBRFc7O21DQU9iLE1BQUEsR0FBUSxTQUFDLE9BQUQ7V0FFTixLQUFBLENBQU0sT0FBTjtFQUZNOzttQ0FJUixZQUFBLEdBQWMsU0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixRQUFoQixFQUEwQixlQUExQjtBQUNaLFFBQUE7O01BRHNDLGtCQUFnQjs7OztRQUN0RCxRQUFRLENBQUUsZUFBZ0I7OztJQUMxQixLQUFBLEdBQ0U7TUFBQSxjQUFBLEVBQWdCLE9BQWhCO01BQ0EsUUFBQSxFQUFVLFFBRFY7TUFFQSxNQUFBLEVBQVEsSUFGUjtNQUdBLEtBQUEsRUFBTyxLQUhQO01BSUEsS0FBQSxFQUFPLEtBSlA7O0FBS0YsU0FBQSxzQkFBQTs7O01BQ0UsS0FBTSxDQUFBLEdBQUEsQ0FBTixHQUFhO0FBRGY7SUFFQSxJQUFDLENBQUEsZUFBRCxvQkFBaUIsUUFBUSxDQUFFLGFBQTNCO0lBQ0EsSUFBQyxDQUFBLFNBQUQsQ0FBVyxLQUFYO1dBQ0EsSUFBQyxDQUFBLE1BQUQsQ0FBUSxJQUFSLEVBQWM7TUFBQyxPQUFBLEVBQVMsT0FBTyxDQUFDLE9BQVIsQ0FBQSxDQUFWO0tBQWQ7RUFaWTs7bUNBY2QsTUFBQSxHQUFRLFNBQUMsSUFBRCxFQUFPLElBQVAsRUFBa0IsYUFBbEI7QUFDTixRQUFBOztNQURhLE9BQU87OztNQUFJLGdCQUFnQjs7SUFDeEMsS0FBQSxHQUFZLElBQUEsMkJBQUEsQ0FBNEIsSUFBNUIsRUFBa0MsSUFBbEMsRUFBd0MsYUFBeEMsRUFBdUQsSUFBQyxDQUFBLEtBQXhEO0FBQ1o7QUFBQTtTQUFBLHFDQUFBOzttQkFDRSxRQUFBLENBQVMsS0FBVDtBQURGOztFQUZNOzttQ0FLUixTQUFBLEdBQVcsU0FBQyxPQUFEO0FBQ1QsUUFBQTtBQUFBLFNBQUEsY0FBQTs7O01BQ0UsSUFBQyxDQUFBLEtBQU0sQ0FBQSxHQUFBLENBQVAsR0FBYztBQURoQjtXQUVBLElBQUMsQ0FBQSxNQUFELENBQVEsY0FBUjtFQUhTOzttQ0FLWCxXQUFBLEdBQWEsU0FBQTtXQUNYLElBQUMsQ0FBQSxTQUFELENBQ0U7TUFBQSxhQUFBLEVBQWUsSUFBZjtNQUNBLGNBQUEsRUFBZ0IsSUFEaEI7TUFFQSxRQUFBLEVBQVUsSUFGVjtNQUdBLEtBQUEsRUFBTyxLQUhQO01BSUEsTUFBQSxFQUFRLElBSlI7TUFLQSxLQUFBLEVBQU8sS0FMUDtLQURGO0VBRFc7O21DQVNiLGlCQUFBLEdBQW1CLFNBQUE7QUFDakIsUUFBQTtJQUFBLDhFQUE0QixDQUFFLEdBQTNCLENBQStCLE9BQS9CLG1CQUFIO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQXpCLENBQStCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBdEMsRUFERjs7RUFEaUI7O21DQUluQiw2QkFBQSxHQUErQixTQUFDLGFBQUQsRUFBZ0IsUUFBaEI7QUFDN0IsUUFBQTs7TUFENkMsV0FBVzs7SUFDeEQsSUFBRyxpQ0FBSDtNQUNFLGNBQUEsR0FBaUIsSUFBQyxDQUFBLEtBQUssQ0FBQztNQUN4QixjQUFjLENBQUMsT0FBZixDQUF1QixhQUF2QixFQUZGO0tBQUEsTUFBQTtNQUlFLGNBQUEsR0FBaUIsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELGFBQWhELEVBSm5COztJQUtBLElBQUcsZ0JBQUg7TUFDRSxjQUFjLENBQUMsV0FBZixDQUEyQjtRQUFBLE9BQUEsRUFBUyxRQUFRLENBQUMsSUFBbEI7T0FBM0IsRUFERjs7V0FFQTtFQVI2Qjs7bUNBVS9CLGNBQUEsR0FBZ0IsU0FBQyxXQUFEO0FBQ2QsUUFBQTs7TUFEZSxjQUFjOztJQUM3QixNQUFBLEdBQVksbUJBQUgsR0FBcUIsR0FBQSxHQUFJLFdBQXpCLEdBQTRDO1dBQ3JELEVBQUEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQXJCLEdBQThCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBaEQsR0FBMkQ7RUFGN0M7O21DQUloQixlQUFBLEdBQWlCLFNBQUMsSUFBRDtBQUNmLFFBQUE7SUFBQSxvRUFBa0IsQ0FBRSxtQ0FBcEI7YUFDRSxRQUFRLENBQUMsS0FBVCxHQUFpQixFQUFBLEdBQUUsaUJBQUksSUFBSSxDQUFFLGdCQUFOLEdBQWUsQ0FBbEIsR0FBeUIsSUFBekIsR0FBb0MsRUFBQSxDQUFHLDRCQUFILENBQXJDLENBQUYsR0FBMEUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUFFLENBQUMsb0JBQXpGLEdBQWdILElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBRSxDQUFDLGtCQURsSjs7RUFEZTs7Ozs7O0FBSW5CLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSwyQkFBQSxFQUE2QiwyQkFBN0I7RUFDQSxzQkFBQSxFQUF3QixzQkFEeEI7Ozs7OztBQ2hYRixJQUFBLHlTQUFBO0VBQUE7OztBQUFBLE1BQXNCLEtBQUssQ0FBQyxHQUE1QixFQUFDLFVBQUEsR0FBRCxFQUFNLGFBQUEsTUFBTixFQUFjLFdBQUE7O0FBRWQsYUFBQSxHQUFnQjs7QUFDaEIsWUFBQSxHQUF1QixhQUFELEdBQWU7O0FBQ3JDLGFBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUNyQyxPQUFBLEdBQXVCLGFBQUQsR0FBZTs7QUFDckMsZUFBQSxHQUF1QixhQUFELEdBQWU7O0FBQ3JDLGVBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUNyQyxnQkFBQSxHQUF1QixhQUFELEdBQWU7O0FBQ3JDLGlCQUFBLEdBQXVCLGFBQUQsR0FBZTs7QUFDckMsaUJBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUVyQyxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBQ1gsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztBQUVQLGlCQUFBLEdBQW9CLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDckQsbUJBQUEsR0FBc0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUN2RCxhQUFBLEdBQWdCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFFakQsZ0NBQUEsR0FBbUMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FDckQ7RUFBQSxXQUFBLEVBQWEsa0NBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLGlCQUFBLEVBQW1CLEtBQW5COztFQURlLENBRmpCO0VBS0Esa0JBQUEsRUFBb0IsU0FBQTtXQUNsQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaEIsQ0FBa0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ2hDLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxpQkFBQSxFQUFtQixJQUFuQjtTQUFWO01BRGdDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsQztFQURrQixDQUxwQjtFQVNBLFlBQUEsRUFBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBaEIsQ0FBQTtFQURZLENBVGQ7RUFZQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxxQkFBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLDZCQUFaO0tBQUosRUFBZ0QsRUFBaEQsQ0FERixFQUVFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx1QkFBWjtLQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxpQkFBVixHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsWUFBWDtLQUFQLEVBQWlDLGtCQUFqQyxDQURILEdBR0UsK0JBSkgsQ0FGRjtFQURLLENBWlI7Q0FEcUQsQ0FBcEI7O0FBd0I3Qjs7O0VBRVMsK0JBQUMsT0FBRCxFQUFnQixNQUFoQjtJQUFDLElBQUMsQ0FBQSw0QkFBRCxVQUFXO0lBQUksSUFBQyxDQUFBLFNBQUQ7SUFDM0IsdURBQ0U7TUFBQSxJQUFBLEVBQU0scUJBQXFCLENBQUMsSUFBNUI7TUFDQSxXQUFBLEVBQWEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxXQUFULElBQXdCLENBQUMsRUFBQSxDQUFHLDBCQUFILENBQUQsQ0FEckM7TUFFQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sSUFBTjtRQUNBLElBQUEsRUFBTSxJQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsSUFIUjtRQUlBLE1BQUEsRUFBUSxJQUpSO1FBS0EsS0FBQSxFQUFPLElBTFA7UUFNQSxLQUFBLEVBQU8sS0FOUDtPQUhGO0tBREY7SUFZQSxJQUFDLENBQUEsSUFBRCxHQUFRO0VBYkc7O0VBZWIscUJBQUMsQ0FBQSxJQUFELEdBQU87O2tDQUVQLHNCQUFBLEdBQXdCOztrQ0FFeEIsVUFBQSxHQUFZLFNBQUMsWUFBRDtJQUFDLElBQUMsQ0FBQSxlQUFEO0lBQ1gsSUFBRyxJQUFDLENBQUEsWUFBSjtNQUNFLElBQUcsSUFBQyxDQUFBLElBQUo7ZUFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsRUFERjtPQUFBLE1BQUE7ZUFHRSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBSEY7T0FERjtLQUFBLE1BQUE7YUFNRSxJQUFDLENBQUEsSUFBRCxLQUFXLEtBTmI7O0VBRFU7O2tDQVNaLFNBQUEsR0FBVyxTQUFBO1dBQ1QsSUFBQyxDQUFBLGdCQUFELENBQUE7RUFEUzs7a0NBR1gsaUJBQUEsR0FBbUIsU0FBQyxzQkFBRDtJQUFDLElBQUMsQ0FBQSx5QkFBRDtJQUNsQixJQUFHLElBQUMsQ0FBQSxlQUFKO2FBQ0UsSUFBQyxDQUFBLHNCQUFELENBQUEsRUFERjs7RUFEaUI7O2tDQUluQixnQkFBQSxHQUFrQixTQUFDLElBQUQ7QUFDaEIsUUFBQTtJQURpQixJQUFDLENBQUEsT0FBRDs7VUFDSixDQUFFLEtBQWYsQ0FBQTs7V0FDQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQ7RUFGZ0I7O2tDQUlsQixXQUFBLEdBQWEsU0FBQTtBQUNYLFFBQUE7SUFBQSxRQUFBLEdBQVc7V0FDWCxDQUFDLENBQUMsSUFBRixDQUNFO01BQUEsUUFBQSxFQUFVLE1BQVY7TUFDQSxHQUFBLEVBQUssYUFETDtNQUVBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FIRjtNQUlBLE9BQUEsRUFBUyxTQUFDLElBQUQ7UUFDUCxRQUFRLENBQUMsc0JBQVQsQ0FBQTtlQUNBLFFBQVEsQ0FBQyxnQkFBVCxDQUEwQixJQUExQjtNQUZPLENBSlQ7TUFPQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQVEsQ0FBQyxzQkFBVCxDQUFBO01BREssQ0FQUDtLQURGO0VBRlc7O2tDQWFiLFlBQUEsR0FBYzs7a0NBRWQsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixRQUFBO0lBQUEsSUFBRyxJQUFDLENBQUEsWUFBRCxJQUFrQixDQUFJLElBQUMsQ0FBQSxZQUFZLENBQUMsTUFBdkM7YUFDRSxJQUFDLENBQUEsWUFBWSxDQUFDLEtBQWQsQ0FBQSxFQURGO0tBQUEsTUFBQTtNQUlFLHFCQUFBLEdBQXdCLFNBQUMsQ0FBRCxFQUFJLENBQUo7QUFDdEIsWUFBQTtRQUFBLFVBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxJQUFxQixNQUFNLENBQUM7UUFDekMsU0FBQSxHQUFhLE1BQU0sQ0FBQyxTQUFQLElBQXFCLE1BQU0sQ0FBQztRQUN6QyxLQUFBLEdBQVMsTUFBTSxDQUFDLFVBQVAsSUFBc0IsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUEvQyxJQUErRCxNQUFNLENBQUM7UUFDL0UsTUFBQSxHQUFTLE1BQU0sQ0FBQyxXQUFQLElBQXNCLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBL0MsSUFBK0QsTUFBTSxDQUFDO1FBRS9FLElBQUEsR0FBTyxDQUFDLENBQUMsS0FBQSxHQUFRLENBQVQsQ0FBQSxHQUFjLENBQUMsQ0FBQSxHQUFJLENBQUwsQ0FBZixDQUFBLEdBQTBCO1FBQ2pDLEdBQUEsR0FBTSxDQUFDLENBQUMsTUFBQSxHQUFTLENBQVYsQ0FBQSxHQUFlLENBQUMsQ0FBQSxHQUFJLENBQUwsQ0FBaEIsQ0FBQSxHQUEyQjtBQUNqQyxlQUFPO1VBQUMsTUFBQSxJQUFEO1VBQU8sS0FBQSxHQUFQOztNQVJlO01BVXhCLEtBQUEsR0FBUTtNQUNSLE1BQUEsR0FBUztNQUNULFFBQUEsR0FBVyxxQkFBQSxDQUFzQixLQUF0QixFQUE2QixNQUE3QjtNQUNYLGNBQUEsR0FBaUIsQ0FDZixRQUFBLEdBQVcsS0FESSxFQUVmLFNBQUEsR0FBWSxNQUZHLEVBR2YsTUFBQSxHQUFTLFFBQVEsQ0FBQyxHQUFsQixJQUF5QixHQUhWLEVBSWYsT0FBQSxHQUFVLFFBQVEsQ0FBQyxJQUFuQixJQUEyQixHQUpaLEVBS2YsZUFMZSxFQU1mLGNBTmUsRUFPZixhQVBlLEVBUWYsWUFSZSxFQVNmLFlBVGU7TUFZakIsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsTUFBTSxDQUFDLElBQVAsQ0FBWSxZQUFaLEVBQTBCLE1BQTFCLEVBQWtDLGNBQWMsQ0FBQyxJQUFmLENBQUEsQ0FBbEM7TUFFaEIsVUFBQSxHQUFhLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUNYLGNBQUE7QUFBQTtZQUNFLElBQUEsR0FBTyxLQUFDLENBQUEsWUFBWSxDQUFDLFFBQVEsQ0FBQztZQUM5QixJQUFJLElBQUEsS0FBUSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQTVCO2NBQ0UsYUFBQSxDQUFjLElBQWQ7Y0FDQSxLQUFDLENBQUEsWUFBWSxDQUFDLEtBQWQsQ0FBQTtxQkFDQSxLQUFDLENBQUEsV0FBRCxDQUFBLEVBSEY7YUFGRjtXQUFBLGFBQUE7WUFNTSxVQU5OOztRQURXO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTthQVViLElBQUEsR0FBTyxXQUFBLENBQVksVUFBWixFQUF3QixHQUF4QixFQXpDVDs7RUFEZ0I7O2tDQTRDbEIseUJBQUEsR0FBMkIsU0FBQTtXQUN4QixnQ0FBQSxDQUFpQztNQUFDLFFBQUEsRUFBVSxJQUFYO01BQWMsWUFBQSxFQUFjLElBQUMsQ0FBQSxZQUE3QjtLQUFqQztFQUR3Qjs7a0NBRzNCLFVBQUEsR0FBWSxTQUFBO0lBQ1YsSUFBRyxJQUFDLENBQUEsSUFBSjthQUNHLElBQUEsQ0FBSyxFQUFMLEVBQVUsSUFBQSxDQUFLO1FBQUMsU0FBQSxFQUFXLHFCQUFaO09BQUwsQ0FBVixFQUFvRCxJQUFDLENBQUEsSUFBSSxDQUFDLElBQTFELEVBREg7S0FBQSxNQUFBO2FBR0UsS0FIRjs7RUFEVTs7a0NBTVosSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDSixDQUFDLENBQUMsSUFBRixDQUNFO01BQUEsUUFBQSxFQUFVLE1BQVY7TUFDQSxHQUFBLEVBQUssT0FETDtNQUVBLE9BQUEsRUFBUyxJQUZUO01BR0EsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQUpGO01BS0EsT0FBQSxFQUFTLFNBQUMsSUFBRDtBQUNQLFlBQUE7UUFBQSxJQUFBLEdBQU87QUFDUCxhQUFBLFdBQUE7OztVQUNFLElBQUksQ0FBQyxJQUFMLENBQWMsSUFBQSxhQUFBLENBQ1o7WUFBQSxJQUFBLEVBQU0sSUFBSSxDQUFDLElBQVg7WUFDQSxZQUFBLEVBQWM7Y0FBQyxFQUFBLEVBQUksSUFBSSxDQUFDLEVBQVY7YUFEZDtZQUVBLElBQUEsRUFBTSxhQUFhLENBQUMsSUFGcEI7WUFHQSxRQUFBLEVBQVUsSUFIVjtXQURZLENBQWQ7QUFERjtlQU1BLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQVJPLENBTFQ7TUFjQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxJQUFULEVBQWUsRUFBZjtNQURLLENBZFA7S0FERjtFQURJOztrQ0FtQk4saUJBQUEsR0FBbUIsU0FBQyxFQUFELEVBQUssUUFBTDtBQUNqQixRQUFBO0lBQUEsY0FBQSxHQUFxQixJQUFBLGFBQUEsQ0FDbkI7TUFBQSxlQUFBLEVBQWlCLEVBQWpCO01BQ0EsSUFBQSxFQUFNLGFBQWEsQ0FBQyxJQURwQjtNQUVBLFlBQUEsRUFBYyxLQUZkO0tBRG1CO1dBSXJCLElBQUMsQ0FBQSxJQUFELENBQU0sY0FBTixFQUFzQixTQUFDLEdBQUQsRUFBTSxPQUFOO2FBQ3BCLFFBQUEsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QixjQUF2QjtJQURvQixDQUF0QjtFQUxpQjs7a0NBUW5CLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ0osUUFBQTtJQUFBLGVBQUEsR0FBa0IsQ0FBTyxRQUFRLENBQUMsZUFBaEIsR0FBcUMsSUFBckMsR0FBK0M7V0FDakUsQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLEdBQUEsRUFBSyxlQUFMO01BQ0EsSUFBQSxFQUNFO1FBQUEsUUFBQSxnREFBK0IsQ0FBRSxZQUF2QixJQUE2QixRQUFRLENBQUMsZUFBaEQ7T0FGRjtNQUdBLE9BQUEsRUFBUyxJQUhUO01BSUEsU0FBQSxFQUNFO1FBQUMsaUJBQUEsZUFBRDtPQUxGO01BTUEsT0FBQSxFQUFTLFNBQUMsSUFBRDtBQUNQLFlBQUE7UUFBQSxPQUFBLEdBQVUsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELElBQWhEO1FBQ1YsSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQVo7VUFBdUIsSUFBQyxDQUFBLHNCQUFELEdBQTBCLE9BQU8sQ0FBQyxLQUFSLENBQUEsRUFBakQ7OztVQUNBLFFBQVEsQ0FBQyxPQUFRLElBQUksQ0FBQzs7ZUFDdEIsUUFBQSxDQUFTLElBQVQsRUFBZSxPQUFmO01BSk8sQ0FOVDtNQVdBLEtBQUEsRUFBTyxTQUFBO0FBQ0wsWUFBQTtRQUFBLE9BQUEsR0FBYSxRQUFRLENBQUMsZUFBWixHQUNSLDJCQUFBLEdBQTRCLFFBQVEsQ0FBQyxlQUFyQyxHQUFxRCxxQ0FEN0MsR0FHUixpQkFBQSxHQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFULGtEQUFzQyxDQUFFLFlBQXhDLElBQThDLE1BQS9DO2VBQ25CLFFBQUEsQ0FBUyxPQUFUO01BTEssQ0FYUDtLQURGO0VBRkk7O2tDQXFCTixLQUFBLEdBQU8sU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtBQUNMLFFBQUE7SUFBQSxNQUFBLEdBQVMsT0FBTyxDQUFDLEdBQVIsQ0FBWSxjQUFaLENBQUEsSUFBK0IsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFhLENBQUMsUUFBZCxDQUF1QixFQUF2QixDQUEwQixDQUFDLFNBQTNCLENBQXFDLENBQXJDO0lBRXhDLE1BQUEsR0FDRTtNQUFBLE1BQUEsRUFBUSxNQUFSOztJQUVGLElBQUcsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWixDQUFIO01BQ0UsTUFBTSxDQUFDLFFBQVAsR0FBa0IsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWixFQURwQjs7SUFHQSxPQUFPLENBQUMsV0FBUixDQUNFO01BQUEsWUFBQSxFQUFjLENBQWQ7TUFDQSxZQUFBLEVBQWMsSUFEZDtNQUVBLGdCQUFBLEVBQWtCLElBRmxCO0tBREY7SUFLQSxHQUFBLEdBQU0sSUFBQyxDQUFBLFVBQUQsQ0FBWSxlQUFaLEVBQTZCLE1BQTdCO1dBRU4sQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLFFBQUEsRUFBVSxNQUFWO01BQ0EsTUFBQSxFQUFRLE1BRFI7TUFFQSxHQUFBLEVBQUssR0FGTDtNQUdBLElBQUEsRUFBTSxPQUFPLENBQUMsZ0JBQVIsQ0FBQSxDQUhOO01BSUEsT0FBQSxFQUFTLElBSlQ7TUFLQSxTQUFBLEVBQ0U7UUFBQSxlQUFBLEVBQWlCLEtBQWpCO09BTkY7TUFPQSxPQUFBLEVBQVMsU0FBQyxJQUFEO1FBQ1AsT0FBTyxDQUFDLFdBQVIsQ0FDRTtVQUFBLGdCQUFBLEVBQWtCLElBQUksQ0FBQyxFQUF2QjtVQUNBLFlBQUEsRUFBYyxNQURkO1VBRUEsWUFBQSxFQUFjLENBRmQ7U0FERjtlQUlBLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBSSxDQUFDLEVBQXBCO01BTE8sQ0FQVDtNQWFBLEtBQUEsRUFBTyxTQUFBO2VBQ0wsUUFBQSxDQUFTLGlCQUFBLEdBQWtCLFFBQVEsQ0FBQyxJQUFwQztNQURLLENBYlA7S0FERjtFQWhCSzs7a0NBaUNQLElBQUEsR0FBTSxTQUFDLFlBQUQsRUFBZSxRQUFmLEVBQXlCLFFBQXpCO0FBQ0osUUFBQTtJQUFBLE9BQUEsR0FBVSxZQUFZLENBQUMsVUFBYixDQUFBO0lBRVYsTUFBQSxHQUFTO0lBQ1QsSUFBRyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQXpCO01BQWlDLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBekU7O0lBR0EsWUFBQSxHQUFlLFFBQVEsQ0FBQyxZQUFULElBQTBCO0lBQ3pDLElBQUcsWUFBQSxJQUFpQixDQUFBLElBQUEsR0FBTyxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxzQkFBc0IsQ0FBQyxVQUF4QixDQUFBLENBQWIsRUFBbUQsT0FBbkQsQ0FBUCxDQUFwQjtNQUNFLFdBQUEsR0FBYztNQUNkLEdBQUEsR0FBTSxpQkFGUjtLQUFBLE1BQUE7TUFJRSxJQUFHLFFBQVEsQ0FBQyxJQUFaO1FBQXNCLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFFBQVEsQ0FBQyxLQUFuRDs7TUFDQSxHQUFBLEdBQU07TUFDTixXQUFBLEdBQWMsUUFOaEI7O0lBUUEsR0FBQSxHQUFNLElBQUMsQ0FBQSxVQUFELENBQVksR0FBWixFQUFpQixNQUFqQjtXQUVOLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxRQUFBLEVBQVUsTUFBVjtNQUNBLE1BQUEsRUFBUSxNQURSO01BRUEsR0FBQSxFQUFLLEdBRkw7TUFHQSxJQUFBLEVBQU0sSUFBSSxDQUFDLFNBQUwsQ0FBZSxXQUFmLENBSE47TUFJQSxPQUFBLEVBQVMsSUFKVDtNQUtBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FORjtNQU9BLE9BQUEsRUFBUyxTQUFDLElBQUQ7UUFDUCxJQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBWjtVQUF1QixJQUFDLENBQUEsc0JBQUQsR0FBMEIsWUFBWSxDQUFDLEtBQWIsQ0FBQSxFQUFqRDs7UUFDQSxJQUFHLElBQUksQ0FBQyxFQUFSO1VBQWdCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBdEIsR0FBMkIsSUFBSSxDQUFDLEdBQWhEOztlQUVBLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQUpPLENBUFQ7TUFZQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxpQkFBQSxHQUFrQixRQUFRLENBQUMsSUFBcEM7TUFESyxDQVpQO0tBREY7RUFsQkk7O2tDQWtDTixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNOLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxHQUFBLEVBQUssaUJBQUw7TUFDQSxJQUFBLEVBQ0U7UUFBQSxVQUFBLEVBQVksUUFBUSxDQUFDLElBQXJCO09BRkY7TUFHQSxPQUFBLEVBQVMsSUFIVDtNQUlBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FMRjtNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7ZUFDUCxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7TUFETyxDQU5UO01BUUEsS0FBQSxFQUFPLFNBQUE7ZUFDTCxRQUFBLENBQVMsaUJBQUEsR0FBa0IsUUFBUSxDQUFDLElBQXBDO01BREssQ0FSUDtLQURGO0VBRE07O2tDQWFSLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFFBQXBCO1dBQ04sQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLEdBQUEsRUFBSyxpQkFBTDtNQUNBLElBQUEsRUFDRTtRQUFBLFFBQUEsRUFBVSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQWhDO1FBQ0EsYUFBQSxFQUFlLE9BRGY7T0FGRjtNQUlBLE9BQUEsRUFBUyxJQUpUO01BS0EsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQU5GO01BT0EsT0FBQSxFQUFTLFNBQUMsSUFBRDtRQUNQLFFBQVEsQ0FBQyxJQUFULEdBQWdCO2VBQ2hCLFFBQUEsQ0FBUyxJQUFULEVBQWUsUUFBZjtNQUZPLENBUFQ7TUFVQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxtQkFBQSxHQUFvQixRQUFRLENBQUMsSUFBdEM7TUFESyxDQVZQO0tBREY7RUFETTs7a0NBZVIsU0FBQSxHQUFXLFNBQUMsZUFBRCxFQUFrQixRQUFsQjtBQUNULFFBQUE7SUFBQSxRQUFBLEdBQWUsSUFBQSxhQUFBLENBQ2I7TUFBQSxJQUFBLEVBQU0sYUFBYSxDQUFDLElBQXBCO01BQ0EsUUFBQSxFQUFVLElBRFY7TUFFQSxZQUFBLEVBQ0U7UUFBQSxFQUFBLEVBQUksZUFBSjtPQUhGO0tBRGE7V0FLZixJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU4sRUFBZ0IsU0FBQyxHQUFELEVBQU0sT0FBTjthQUNkLFFBQUEsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QixRQUF2QjtJQURjLENBQWhCO0VBTlM7O2tDQVNYLGtCQUFBLEdBQW9CLFNBQUMsUUFBRDtXQUNsQixRQUFRLENBQUMsWUFBWSxDQUFDO0VBREo7O2tDQUdwQixVQUFBLEdBQVksU0FBQyxHQUFELEVBQU0sTUFBTjtBQUNWLFFBQUE7SUFBQSxJQUFBLENBQWtCLE1BQWxCO0FBQUEsYUFBTyxJQUFQOztJQUNBLEdBQUEsR0FBTTtBQUNOLFNBQUEsYUFBQTs7TUFDRSxHQUFHLENBQUMsSUFBSixDQUFTLENBQUMsR0FBRCxFQUFNLEtBQU4sQ0FBWSxDQUFDLEdBQWIsQ0FBaUIsU0FBakIsQ0FBMkIsQ0FBQyxJQUE1QixDQUFpQyxHQUFqQyxDQUFUO0FBREY7QUFFQSxXQUFPLEdBQUEsR0FBTSxHQUFOLEdBQVksR0FBRyxDQUFDLElBQUosQ0FBUyxHQUFUO0VBTFQ7O2tDQU9aLFdBQUEsR0FBYSxTQUFDLElBQUQsRUFBTyxJQUFQO0FBQ1gsUUFBQTtBQUFBO01BQ0UsSUFBQSxHQUNvQyxPQUFPLElBQUMsQ0FBQSxPQUFPLENBQUMsZUFBaEIsS0FBbUMsVUFBckUsR0FBQTtRQUFBLElBQUEsRUFBTSxJQUFDLENBQUEsT0FBTyxDQUFDLGVBQWY7T0FBQSxHQUFBO01BRUYsV0FBQSxHQUFjLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLFNBQUwsQ0FBZSxJQUFmLENBQVg7TUFDZCxXQUFBLEdBQWMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFJLENBQUMsU0FBTCxDQUFlLElBQWYsQ0FBWDtNQUNkLElBQUEsR0FBTyxJQUFJLENBQUMsSUFBTCxDQUFVLFdBQVYsRUFBdUIsV0FBdkIsRUFBb0MsSUFBcEM7QUFDUCxhQUFPLEtBUFQ7S0FBQSxhQUFBO0FBU0UsYUFBTyxLQVRUOztFQURXOzs7O0dBL1FxQjs7QUEyUnBDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3ZVakIsSUFBQSx3SkFBQTtFQUFBOzs7QUFBQSxNQUFzQixLQUFLLENBQUMsR0FBNUIsRUFBQyxVQUFBLEdBQUQsRUFBTSxhQUFBLE1BQU4sRUFBYyxXQUFBOztBQUVkLEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxvQkFBUjs7QUFDWCxNQUFBLEdBQVMsT0FBQSxDQUFRLE1BQVI7O0FBRVQsaUJBQUEsR0FBb0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUNyRCxtQkFBQSxHQUFzQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3ZELGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUVqRCw4QkFBQSxHQUFpQyxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUNuRDtFQUFBLFdBQUEsRUFBYSxnQ0FBYjtFQUVBLGVBQUEsRUFBaUIsU0FBQTtXQUNmO01BQUEsVUFBQSxFQUFZLEtBQVo7O0VBRGUsQ0FGakI7RUFLQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQWhCLENBQTRCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUMxQixLQUFDLENBQUEsUUFBRCxDQUFVO1VBQUEsVUFBQSxFQUFZLElBQVo7U0FBVjtNQUQwQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBNUI7RUFEa0IsQ0FMcEI7RUFTQSxZQUFBLEVBQWMsU0FBQTtXQUNaLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQWhCLENBQTBCLG1CQUFtQixDQUFDLFVBQTlDO0VBRFksQ0FUZDtFQVlBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLG1CQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsMkJBQVo7S0FBSixFQUE4QyxFQUE5QyxDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHFCQUFaO0tBQUosRUFDSSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVYsR0FDRyxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLFlBQVg7S0FBUCxFQUFpQyxpQkFBakMsQ0FESCxHQUdFLDhCQUpILENBRkY7RUFESyxDQVpSO0NBRG1ELENBQXBCOztBQXdCM0I7OztFQUVTLDZCQUFDLE9BQUQsRUFBZ0IsTUFBaEI7SUFBQyxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUFJLElBQUMsQ0FBQSxTQUFEO0lBQzNCLHFEQUNFO01BQUEsSUFBQSxFQUFNLG1CQUFtQixDQUFDLElBQTFCO01BQ0EsV0FBQSxFQUFhLElBQUMsQ0FBQSxPQUFPLENBQUMsV0FBVCxJQUF3QixDQUFDLEVBQUEsQ0FBRyx3QkFBSCxDQUFELENBRHJDO01BRUEsWUFBQSxFQUNFO1FBQUEsSUFBQSxFQUFNLElBQU47UUFDQSxJQUFBLEVBQU0sSUFETjtRQUVBLElBQUEsRUFBTSxJQUZOO1FBR0EsTUFBQSxFQUFRLElBSFI7UUFJQSxNQUFBLEVBQVEsSUFKUjtRQUtBLEtBQUEsRUFBTyxJQUxQO09BSEY7S0FERjtJQVdBLElBQUMsQ0FBQSxTQUFELEdBQWE7SUFDYixJQUFDLENBQUEsSUFBRCxHQUFRO0lBQ1IsSUFBQyxDQUFBLFFBQUQsR0FBWSxJQUFDLENBQUEsT0FBTyxDQUFDO0lBQ3JCLElBQUcsQ0FBSSxJQUFDLENBQUEsUUFBUjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0sMkRBQU4sRUFEWjs7SUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUFPLENBQUMsUUFBVCxJQUFxQjtJQUNqQyxJQUFDLENBQUEsY0FBRCxHQUFrQixJQUFDLENBQUEsT0FBTyxDQUFDLGNBQVQsSUFBMkI7SUFDN0MsSUFBRyxJQUFDLENBQUEsY0FBSjtNQUNFLElBQUMsQ0FBQSxRQUFELElBQWEsZ0JBRGY7O0lBRUEsSUFBQyxDQUFBLFNBQUQsQ0FBQTtFQXJCVzs7RUF1QmIsbUJBQUMsQ0FBQSxJQUFELEdBQU87O0VBR1AsbUJBQUMsQ0FBQSxTQUFELEdBQWE7O0VBQ2IsbUJBQUMsQ0FBQSxVQUFELEdBQWM7O2dDQUVkLFVBQUEsR0FBWSxTQUFDLFlBQUQ7SUFBQyxJQUFDLENBQUEsZUFBRDtJQUNYLElBQUcsSUFBQyxDQUFBLFlBQUo7TUFDRSxJQUFHLElBQUMsQ0FBQSxTQUFKO2VBQ0UsSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFkLEVBREY7T0FBQSxNQUFBO2VBR0UsSUFBQyxDQUFBLFNBQUQsQ0FBVyxtQkFBbUIsQ0FBQyxTQUEvQixFQUhGO09BREY7S0FBQSxNQUFBO2FBTUUsSUFBQyxDQUFBLFNBQUQsS0FBZ0IsS0FObEI7O0VBRFU7O2dDQVNaLFNBQUEsR0FBVyxTQUFDLFNBQUQ7V0FDVCxJQUFDLENBQUEsV0FBRCxDQUFhLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtBQUNYLFlBQUE7UUFBQSxJQUFBLEdBQ0U7VUFBQSxTQUFBLEVBQVcsS0FBQyxDQUFBLFFBQVo7VUFDQSxLQUFBLEVBQU8sQ0FBQyx1Q0FBRCxFQUEwQyxrREFBMUMsQ0FEUDtVQUVBLFNBQUEsRUFBVyxTQUZYOztlQUdGLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBVixDQUFvQixJQUFwQixFQUEwQixTQUFDLFNBQUQ7VUFDeEIsS0FBQyxDQUFBLFNBQUQsR0FBZ0IsU0FBQSxJQUFjLENBQUksU0FBUyxDQUFDLEtBQS9CLEdBQTBDLFNBQTFDLEdBQXlEO1VBQ3RFLEtBQUMsQ0FBQSxJQUFELEdBQVE7VUFDUixLQUFDLENBQUEsY0FBRCxDQUFnQixLQUFDLENBQUEsU0FBakI7VUFDQSxJQUFHLEtBQUMsQ0FBQSxTQUFKO1lBQ0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQTVCLENBQUEsQ0FBaUMsQ0FBQyxPQUFsQyxDQUEwQyxTQUFDLElBQUQ7cUJBQ3hDLEtBQUMsQ0FBQSxJQUFELEdBQVE7WUFEZ0MsQ0FBMUMsRUFERjs7aUJBR0EsS0FBQyxDQUFBLFlBQUQsQ0FBYyxLQUFDLENBQUEsU0FBRCxLQUFnQixJQUE5QjtRQVB3QixDQUExQjtNQUxXO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiO0VBRFM7O2dDQWVYLGNBQUEsR0FBZ0IsU0FBQyxTQUFEO0lBQ2QsSUFBRyxJQUFDLENBQUEsaUJBQUo7TUFDRSxZQUFBLENBQWEsSUFBQyxDQUFBLGlCQUFkLEVBREY7O0lBRUEsSUFBRyxTQUFBLElBQWMsQ0FBSSxTQUFTLENBQUMsS0FBL0I7YUFDRSxJQUFDLENBQUEsaUJBQUQsR0FBcUIsVUFBQSxDQUFXLENBQUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxTQUFELENBQVcsbUJBQW1CLENBQUMsU0FBL0I7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBRCxDQUFYLEVBQTBELENBQUMsUUFBQSxDQUFTLFNBQVMsQ0FBQyxVQUFuQixFQUErQixFQUEvQixDQUFBLEdBQXFDLElBQXRDLENBQUEsR0FBOEMsSUFBeEcsRUFEdkI7O0VBSGM7O2dDQU1oQix5QkFBQSxHQUEyQixTQUFBO1dBQ3hCLDhCQUFBLENBQStCO01BQUMsUUFBQSxFQUFVLElBQVg7S0FBL0I7RUFEd0I7O2dDQUczQixVQUFBLEdBQVksU0FBQTtJQUNWLElBQUcsSUFBQyxDQUFBLElBQUo7YUFDRyxJQUFBLENBQUssRUFBTCxFQUFVLElBQUEsQ0FBSztRQUFDLFNBQUEsRUFBVyxhQUFaO09BQUwsQ0FBVixFQUE0QyxJQUFDLENBQUEsSUFBSSxDQUFDLElBQWxELEVBREg7S0FBQSxNQUFBO2FBR0UsS0FIRjs7RUFEVTs7Z0NBTVosSUFBQSxHQUFPLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7V0FDTCxJQUFDLENBQUEsV0FBRCxDQUFhLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtRQUNYLElBQUcsS0FBQyxDQUFBLGNBQUo7aUJBQ0UsS0FBQyxDQUFBLGlCQUFELENBQW1CLE9BQW5CLEVBQTRCLFFBQTVCLEVBQXNDLFFBQXRDLEVBREY7U0FBQSxNQUFBO2lCQUdFLEtBQUMsQ0FBQSxTQUFELENBQVcsT0FBWCxFQUFvQixRQUFwQixFQUE4QixRQUE5QixFQUhGOztNQURXO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiO0VBREs7O2dDQU9QLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7UUFDWCxJQUFHLEtBQUMsQ0FBQSxjQUFKO2lCQUNFLEtBQUMsQ0FBQSx5QkFBRCxDQUEyQixRQUEzQixFQUFxQyxRQUFyQyxFQURGO1NBQUEsTUFBQTtpQkFHRSxLQUFDLENBQUEsU0FBRCxDQUFXLFFBQVgsRUFBcUIsUUFBckIsRUFIRjs7TUFEVztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYjtFQURJOztnQ0FPTixJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxXQUFELENBQWEsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO0FBQ1gsWUFBQTtRQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBeEIsQ0FDUjtVQUFBLENBQUEsRUFBRyxLQUFBLEdBQVEsZ0JBQUEsR0FBaUIsS0FBQyxDQUFBLFFBQWxCLEdBQTJCLGdFQUEzQixHQUEwRixDQUFJLFFBQUgsR0FBaUIsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUF2QyxHQUErQyxNQUFoRCxDQUExRixHQUFpSixjQUE1SjtTQURRO2VBRVYsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxNQUFEO0FBQ2QsY0FBQTtVQUFBLElBQTJDLENBQUksTUFBL0M7QUFBQSxtQkFBTyxRQUFBLENBQVMsc0JBQVQsRUFBUDs7VUFDQSxJQUFBLEdBQU87QUFDUDtBQUFBLGVBQUEsc0NBQUE7O1lBQ0UsSUFBSSxDQUFDLElBQUwsQ0FBYyxJQUFBLGFBQUEsQ0FDWjtjQUFBLElBQUEsRUFBTSxJQUFJLENBQUMsS0FBWDtjQUNBLElBQUEsRUFBUyxJQUFJLENBQUMsUUFBTCxLQUFpQixvQ0FBcEIsR0FBOEQsYUFBYSxDQUFDLE1BQTVFLEdBQXdGLGFBQWEsQ0FBQyxJQUQ1RztjQUVBLE1BQUEsRUFBUSxRQUZSO2NBR0EsWUFBQSxFQUFjLElBQUksQ0FBQyxRQUhuQjtjQUlBLFFBQUEsRUFBVSxLQUpWO2NBS0EsWUFBQSxFQUNFO2dCQUFBLEVBQUEsRUFBSSxJQUFJLENBQUMsRUFBVDtlQU5GO2FBRFksQ0FBZDtBQURGO1VBU0EsSUFBSSxDQUFDLElBQUwsQ0FBVSxTQUFDLENBQUQsRUFBSSxDQUFKO0FBQ1IsZ0JBQUE7WUFBQSxNQUFBLEdBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFQLENBQUE7WUFDVCxNQUFBLEdBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFQLENBQUE7WUFDVCxJQUFhLE1BQUEsR0FBUyxNQUF0QjtBQUFBLHFCQUFPLENBQUMsRUFBUjs7WUFDQSxJQUFZLE1BQUEsR0FBUyxNQUFyQjtBQUFBLHFCQUFPLEVBQVA7O0FBQ0EsbUJBQU87VUFMQyxDQUFWO2lCQU1BLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtRQWxCYyxDQUFoQjtNQUhXO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiO0VBREk7O2dDQXdCTixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNOLElBQUMsQ0FBQSxXQUFELENBQWEsU0FBQTtBQUNYLFVBQUE7TUFBQSxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQUQsQ0FBdkIsQ0FDUjtRQUFBLE1BQUEsRUFBUSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQTlCO09BRFE7YUFFVixPQUFPLENBQUMsT0FBUixDQUFnQixTQUFDLE1BQUQ7Z0RBQ2QsMkJBQVUsTUFBTSxDQUFFLGVBQVIsSUFBaUI7TUFEYixDQUFoQjtJQUhXLENBQWI7RUFETTs7Z0NBT1IsTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLE9BQVgsRUFBb0IsUUFBcEI7V0FDTixJQUFDLENBQUEsV0FBRCxDQUFhLFNBQUE7QUFDWCxVQUFBO01BQUEsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUF4QixDQUNSO1FBQUEsTUFBQSxFQUFRLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBOUI7UUFDQSxRQUFBLEVBQ0U7VUFBQSxLQUFBLEVBQU8sT0FBUDtTQUZGO09BRFE7YUFJVixPQUFPLENBQUMsT0FBUixDQUFnQixTQUFDLE1BQUQ7UUFDZCxxQkFBRyxNQUFNLENBQUUsY0FBWDtrREFDRSxTQUFVLE1BQU0sQ0FBQyxnQkFEbkI7U0FBQSxNQUFBO1VBR0UsUUFBUSxDQUFDLElBQVQsR0FBZ0I7aUJBQ2hCLFFBQUEsQ0FBUyxJQUFULEVBQWUsUUFBZixFQUpGOztNQURjLENBQWhCO0lBTFcsQ0FBYjtFQURNOztnQ0FhUixLQUFBLEdBQU8sU0FBQyxRQUFELEVBQVcsUUFBWDtBQUNMLFFBQUE7SUFBQSxJQUFHLDhHQUFIO2FBQ0UsUUFBUSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQW5DLENBQUEsRUFERjs7RUFESzs7Z0NBSVAsU0FBQSxHQUFXLFNBQUMsZUFBRCxFQUFrQixRQUFsQjtBQUNULFFBQUE7SUFBQSxRQUFBLEdBQWUsSUFBQSxhQUFBLENBQ2I7TUFBQSxJQUFBLEVBQU0sYUFBYSxDQUFDLElBQXBCO01BQ0EsUUFBQSxFQUFVLElBRFY7TUFFQSxZQUFBLEVBQ0U7UUFBQSxFQUFBLEVBQUksZUFBSjtPQUhGO0tBRGE7V0FLZixJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU4sRUFBZ0IsU0FBQyxHQUFELEVBQU0sT0FBTjthQUNkLFFBQUEsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QixRQUF2QjtJQURjLENBQWhCO0VBTlM7O2dDQVNYLGtCQUFBLEdBQW9CLFNBQUMsUUFBRDtXQUNsQixRQUFRLENBQUMsWUFBWSxDQUFDO0VBREo7O2dDQUdwQixTQUFBLEdBQVcsU0FBQTtBQUNULFFBQUE7SUFBQSxJQUFHLENBQUksTUFBTSxDQUFDLFlBQWQ7TUFDRSxNQUFNLENBQUMsWUFBUCxHQUFzQjtNQUN0QixNQUFNLENBQUMsV0FBUCxHQUFxQixTQUFBO2VBQ25CLElBQUMsQ0FBQSxNQUFNLENBQUMsV0FBUixHQUFzQjtNQURIO01BRXJCLE1BQUEsR0FBUyxRQUFRLENBQUMsYUFBVCxDQUF1QixRQUF2QjtNQUNULE1BQU0sQ0FBQyxHQUFQLEdBQWE7YUFDYixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQWQsQ0FBMEIsTUFBMUIsRUFORjs7RUFEUzs7Z0NBU1gsV0FBQSxHQUFhLFNBQUMsUUFBRDtBQUNYLFFBQUE7SUFBQSxJQUFHLE1BQU0sQ0FBQyxrQkFBVjthQUNFLFFBQUEsQ0FBQSxFQURGO0tBQUEsTUFBQTtNQUdFLElBQUEsR0FBTztNQUNQLEtBQUEsR0FBUSxTQUFBO1FBQ04sSUFBRyxNQUFNLENBQUMsV0FBVjtpQkFDRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQVosQ0FBaUIsT0FBakIsRUFBMEIsSUFBMUIsRUFBZ0MsU0FBQTttQkFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFaLENBQWlCLFFBQWpCLEVBQTJCLElBQTNCLEVBQWlDLFNBQUE7cUJBQy9CLElBQUksQ0FBQyxJQUFMLENBQVUsZ0JBQVYsRUFBNEIsU0FBQTtnQkFDMUIsTUFBTSxDQUFDLGtCQUFQLEdBQTRCO3VCQUM1QixRQUFRLENBQUMsSUFBVCxDQUFjLElBQWQ7Y0FGMEIsQ0FBNUI7WUFEK0IsQ0FBakM7VUFEOEIsQ0FBaEMsRUFERjtTQUFBLE1BQUE7aUJBT0UsVUFBQSxDQUFXLEtBQVgsRUFBa0IsRUFBbEIsRUFQRjs7TUFETTthQVNSLFVBQUEsQ0FBVyxLQUFYLEVBQWtCLEVBQWxCLEVBYkY7O0VBRFc7O2dDQWdCYixTQUFBLEdBQVcsU0FBQyxRQUFELEVBQVcsUUFBWDtBQUNULFFBQUE7SUFBQSxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQXhCLENBQ1I7TUFBQSxNQUFBLEVBQVEsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUE5QjtLQURRO1dBRVYsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLElBQUQ7QUFDZCxZQUFBO1FBQUEsbUJBQUcsSUFBSSxDQUFFLG9CQUFUO1VBQ0UsUUFBUSxDQUFDLElBQVQsR0FBZ0IsSUFBSSxDQUFDO1VBQ3JCLFFBQVEsQ0FBQyxZQUFULEdBQXdCLElBQUksQ0FBQztVQUM3QixRQUFRLENBQUMsWUFBVCxHQUF3QjtZQUFBLEVBQUEsRUFBSSxJQUFJLENBQUMsRUFBVDs7VUFDeEIsR0FBQSxHQUFVLElBQUEsY0FBQSxDQUFBO1VBQ1YsR0FBRyxDQUFDLElBQUosQ0FBUyxLQUFULEVBQWdCLElBQUksQ0FBQyxXQUFyQjtVQUNBLElBQUcsS0FBQyxDQUFBLFNBQUo7WUFDRSxHQUFHLENBQUMsZ0JBQUosQ0FBcUIsZUFBckIsRUFBc0MsU0FBQSxHQUFVLEtBQUMsQ0FBQSxTQUFTLENBQUMsWUFBM0QsRUFERjs7VUFFQSxHQUFHLENBQUMsTUFBSixHQUFhLFNBQUE7bUJBQ1gsUUFBQSxDQUFTLElBQVQsRUFBZSxtQkFBbUIsQ0FBQywyQkFBcEIsQ0FBZ0QsR0FBRyxDQUFDLFlBQXBELENBQWY7VUFEVztVQUViLEdBQUcsQ0FBQyxPQUFKLEdBQWMsU0FBQTttQkFDWixRQUFBLENBQVMscUJBQUEsR0FBc0IsR0FBL0I7VUFEWTtpQkFFZCxHQUFHLENBQUMsSUFBSixDQUFBLEVBWkY7U0FBQSxNQUFBO2lCQWNFLFFBQUEsQ0FBUyxLQUFDLENBQUEsU0FBRCxDQUFXLElBQVgsRUFBaUIsNEJBQWpCLENBQVQsRUFkRjs7TUFEYztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEI7RUFIUzs7Z0NBb0JYLFNBQUEsR0FBVyxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQ1QsUUFBQTtJQUFBLFFBQUEsR0FBVztJQUNYLE1BQUEsR0FBUyxJQUFJLENBQUMsU0FBTCxDQUNQO01BQUEsS0FBQSxFQUFPLFFBQVEsQ0FBQyxJQUFoQjtNQUNBLFFBQUEsRUFBVSxJQUFDLENBQUEsUUFEWDtNQUVBLE9BQUEsRUFBUztRQUFDO1VBQUMsRUFBQSxFQUFPLDJHQUFILEdBQTJDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQXhFLEdBQWdGLE1BQXJGO1NBQUQ7T0FGVDtLQURPO0lBS1QscURBQXlDLENBQUUsWUFBMUIsR0FDZixDQUFDLEtBQUQsRUFBUSx5QkFBQSxHQUEwQixRQUFRLENBQUMsWUFBWSxDQUFDLEVBQXhELENBRGUsR0FHZixDQUFDLE1BQUQsRUFBUyx3QkFBVCxDQUhGLEVBQUMsZ0JBQUQsRUFBUztJQUtULElBQUEsR0FBTyxDQUNMLFFBQUEsR0FBUyxRQUFULEdBQWtCLDRDQUFsQixHQUE4RCxNQUR6RCxFQUVMLFFBQUEsR0FBUyxRQUFULEdBQWtCLG9CQUFsQixHQUFzQyxJQUFDLENBQUEsUUFBdkMsR0FBZ0QsVUFBaEQsR0FBeUQsQ0FBQyxPQUFPLENBQUMsZ0JBQVIsQ0FBQSxDQUFELENBRnBELEVBR0wsUUFBQSxHQUFTLFFBQVQsR0FBa0IsSUFIYixDQUlOLENBQUMsSUFKSyxDQUlBLEVBSkE7SUFNUCxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFaLENBQ1I7TUFBQSxJQUFBLEVBQU0sSUFBTjtNQUNBLE1BQUEsRUFBUSxNQURSO01BRUEsTUFBQSxFQUFRO1FBQUMsVUFBQSxFQUFZLFdBQWI7T0FGUjtNQUdBLE9BQUEsRUFBUztRQUFDLGNBQUEsRUFBZ0IsK0JBQUEsR0FBa0MsUUFBbEMsR0FBNkMsR0FBOUQ7T0FIVDtNQUlBLElBQUEsRUFBTSxJQUpOO0tBRFE7V0FPVixPQUFPLENBQUMsT0FBUixDQUFnQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsSUFBRDtRQUNkLElBQUcsUUFBSDtVQUNFLG1CQUFHLElBQUksQ0FBRSxjQUFUO21CQUNFLFFBQUEsQ0FBUywwQkFBQSxHQUEyQixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQS9DLEVBREY7V0FBQSxNQUVLLElBQUcsSUFBSDtZQUNILFFBQVEsQ0FBQyxZQUFULEdBQXdCO2NBQUEsRUFBQSxFQUFJLElBQUksQ0FBQyxFQUFUOzttQkFDeEIsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFmLEVBRkc7V0FBQSxNQUFBO21CQUlILFFBQUEsQ0FBUyxLQUFDLENBQUEsU0FBRCxDQUFXLElBQVgsRUFBaUIsd0JBQWpCLENBQVQsRUFKRztXQUhQOztNQURjO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFoQjtFQXpCUzs7Z0NBbUNYLHlCQUFBLEdBQTJCLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDekIsUUFBQTtJQUFBLElBQUEsR0FBTztJQUNQLFVBQUEsR0FBYSxTQUFDLEdBQUQ7QUFDWCxVQUFBO01BQUEsT0FBQSxHQUFVLEdBQUcsQ0FBQyxRQUFKLENBQUEsQ0FBYyxDQUFDLE9BQWYsQ0FBQSxDQUF3QixDQUFDLEdBQXpCLENBQTZCLFNBQTdCO01BQ1YsSUFBRyxRQUFRLENBQUMsWUFBWjtRQUNFLFVBQUEsR0FBYSxTQUFDLENBQUQ7VUFDWCxJQUFHLENBQUksQ0FBQyxDQUFDLE9BQU4sSUFBa0IsQ0FBQyxDQUFDLFNBQUYsS0FBaUIsUUFBUSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBckU7bUJBQ0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBWixDQUNFO2NBQUEsS0FBQSxFQUFPLHNCQUFQO2NBQ0EsT0FBQSxFQUFTLDhGQURUO2FBREYsRUFERjs7UUFEVztRQUtiLE9BQU8sQ0FBQyxnQkFBUixDQUF5QixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsYUFBdkQsRUFBc0UsVUFBdEU7UUFDQSxPQUFPLENBQUMsZ0JBQVIsQ0FBeUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQXZELEVBQXFFLFVBQXJFLEVBUEY7O0FBUUE7QUFBQSxXQUFBLHNDQUFBOztRQUNFLElBQXNDLFlBQVksQ0FBQyxJQUFuRDtVQUFBLFNBQUEsR0FBWSxZQUFZLENBQUMsVUFBekI7O0FBREY7TUFFQSxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQXRCLEdBQ0U7UUFBQSxHQUFBLEVBQUssR0FBTDtRQUNBLE9BQUEsRUFBUyxPQURUO1FBRUEsU0FBQSxFQUFXLFNBRlg7O2FBR0YsUUFBQSxDQUFTLElBQVQsRUFBZSxtQkFBbUIsQ0FBQywyQkFBcEIsQ0FBZ0QsT0FBTyxDQUFDLE9BQVIsQ0FBQSxDQUFoRCxDQUFmO0lBaEJXO0lBa0JiLElBQUEsR0FBTyxTQUFDLEtBQUQ7QUFDTCxVQUFBO01BQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxZQUFOLENBQW1CLEVBQW5CO2FBQ1YsS0FBSyxDQUFDLE9BQU4sQ0FBQSxDQUFlLENBQUMsR0FBaEIsQ0FBb0IsU0FBcEIsRUFBK0IsT0FBL0I7SUFGSztJQUlQLEtBQUEsR0FBUSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsR0FBRDtRQUNOLElBQUcsR0FBRyxDQUFDLElBQUosS0FBWSx3QkFBZjtpQkFDRSxLQUFDLENBQUEsU0FBRCxDQUFXLG1CQUFtQixDQUFDLFNBQS9CLEVBREY7U0FBQSxNQUFBO2lCQUdFLEtBQUEsQ0FBTSxHQUFHLENBQUMsT0FBVixFQUhGOztNQURNO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtJQU1SLGlEQUF3QixDQUFFLFdBQTFCO01BQ0UsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUF4QixDQUNSO1FBQUEsTUFBQSxFQUFRLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBOUI7T0FEUSxFQURaO0tBQUEsTUFBQTtNQUlFLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBeEIsQ0FDUjtRQUFBLEtBQUEsRUFBTyxRQUFRLENBQUMsSUFBaEI7UUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFFBRFg7UUFFQSxPQUFBLEVBQVM7VUFBQztZQUFDLEVBQUEsRUFBTywyR0FBSCxHQUEyQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUF4RSxHQUFnRixNQUFyRjtXQUFEO1NBRlQ7T0FEUSxFQUpaOztXQVNBLE9BQU8sQ0FBQyxPQUFSLENBQWdCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxJQUFEO1FBQ2QsbUJBQUcsSUFBSSxDQUFFLFdBQVQ7VUFDRSxRQUFRLENBQUMsSUFBVCxHQUFnQixJQUFJLENBQUM7VUFDckIsUUFBUSxDQUFDLFlBQVQsR0FBd0IsSUFBSSxDQUFDO1VBQzdCLFFBQVEsQ0FBQyxZQUFULEdBQXdCO1lBQUEsRUFBQSxFQUFJLElBQUksQ0FBQyxFQUFUOztpQkFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBcEIsQ0FBeUIsSUFBSSxDQUFDLEVBQTlCLEVBQWtDLFVBQWxDLEVBQThDLElBQTlDLEVBQW9ELEtBQXBELEVBSkY7U0FBQSxNQUFBO2lCQU1FLFFBQUEsQ0FBUyxLQUFDLENBQUEsU0FBRCxDQUFXLElBQVgsRUFBaUIscUJBQWpCLENBQVQsRUFORjs7TUFEYztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEI7RUF2Q3lCOztnQ0FnRDNCLGlCQUFBLEdBQW1CLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7QUFDakIsUUFBQTtJQUFBLGlEQUF3QixDQUFFLGNBQTFCO2FBQ0UsSUFBQyxDQUFBLDJCQUFELENBQTZCLE9BQTdCLEVBQXNDLFFBQXRDLEVBQWdELFFBQWhELEVBREY7S0FBQSxNQUFBO2FBR0UsSUFBQyxDQUFBLHlCQUFELENBQTJCLFFBQTNCLEVBQXFDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxHQUFEO1VBQ25DLElBQXVCLEdBQXZCO0FBQUEsbUJBQU8sUUFBQSxDQUFTLEdBQVQsRUFBUDs7aUJBQ0EsS0FBQyxDQUFBLDJCQUFELENBQTZCLE9BQTdCLEVBQXNDLFFBQXRDLEVBQWdELFFBQWhEO1FBRm1DO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyQyxFQUhGOztFQURpQjs7Z0NBUW5CLDJCQUFBLEdBQTZCLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7QUFDM0IsUUFBQTtJQUFBLEtBQUEsR0FBUTtJQUNSLGVBQUEsR0FBa0IsUUFBUSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUM7SUFDakQsS0FBQSxHQUFRLE1BQU0sQ0FBQyxTQUFQLENBQWlCLGVBQWUsQ0FBQyxPQUFoQixDQUFBLENBQWpCLEVBQTRDLE9BQU8sQ0FBQyxnQkFBUixDQUFBLENBQTVDO0FBQ1IsU0FBQSx1Q0FBQTs7TUFDRSxJQUFHLElBQUksQ0FBQyxPQUFSO1FBQ0UsZUFBZSxDQUFDLFdBQWhCLENBQTRCLEtBQTVCLEVBQW1DLEtBQUEsR0FBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQXRELEVBREY7T0FBQSxNQUFBO1FBR0UsSUFBRyxJQUFJLENBQUMsS0FBUjtVQUNFLGVBQWUsQ0FBQyxZQUFoQixDQUE2QixLQUE3QixFQUFvQyxJQUFJLENBQUMsS0FBekMsRUFERjs7UUFFQSxLQUFBLElBQVMsSUFBSSxDQUFDLE1BTGhCOztBQURGO1dBT0EsUUFBQSxDQUFTLElBQVQ7RUFYMkI7O2dDQWE3QixTQUFBLEdBQVcsU0FBQyxNQUFELEVBQVMsTUFBVDtJQUNULElBQUcsa0RBQUg7YUFDSyxNQUFELEdBQVEsSUFBUixHQUFZLE1BQU0sQ0FBQyxRQUR2QjtLQUFBLE1BQUE7YUFHRSxPQUhGOztFQURTOzs7O0dBclNxQjs7QUEyU2xDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQzdVakIsSUFBQSwrRUFBQTtFQUFBOzs7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxpQkFBQSxHQUFvQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3JELG1CQUFBLEdBQXNCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDdkQsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBRTNDOzs7RUFFUyw4QkFBQyxPQUFELEVBQWdCLE1BQWhCO0lBQUMsSUFBQyxDQUFBLDRCQUFELFVBQVc7SUFBSSxJQUFDLENBQUEsU0FBRDtJQUMzQixzREFDRTtNQUFBLElBQUEsRUFBTSxvQkFBb0IsQ0FBQyxJQUEzQjtNQUNBLFdBQUEsRUFBYSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsSUFBd0IsQ0FBQyxFQUFBLENBQUcseUJBQUgsQ0FBRCxDQURyQztNQUVBLFlBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxJQUFOO1FBQ0EsSUFBQSxFQUFNLElBRE47UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLE1BQUEsRUFBUSxJQUhSO1FBSUEsTUFBQSxFQUFRLElBSlI7UUFLQSxLQUFBLEVBQU8sS0FMUDtPQUhGO0tBREY7RUFEVzs7RUFZYixvQkFBQyxDQUFBLElBQUQsR0FBTzs7RUFDUCxvQkFBQyxDQUFBLFNBQUQsR0FBWSxTQUFBO0FBQ1YsUUFBQTtXQUFBLE1BQUE7O0FBQVM7UUFDUCxJQUFBLEdBQU87UUFDUCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQXBCLENBQTRCLElBQTVCLEVBQWtDLElBQWxDO1FBQ0EsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFwQixDQUErQixJQUEvQjtlQUNBLEtBSk87T0FBQSxhQUFBO2VBTVAsTUFOTzs7O0VBREM7O2lDQVNaLElBQUEsR0FBTSxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQ0osUUFBQTtBQUFBO01BQ0UsT0FBQSxHQUFVLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCO01BQ1YsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixPQUE1QixFQUFxQyxPQUFPLENBQUMsZ0JBQVIsQ0FBQSxDQUFyQzs4Q0FDQSxTQUFVLGVBSFo7S0FBQSxhQUFBO01BSU07YUFDSixRQUFBLENBQVMsa0JBQUEsR0FBbUIsQ0FBQyxDQUFDLE9BQTlCLEVBTEY7O0VBREk7O2lDQVFOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ0osUUFBQTtBQUFBO2FBQ0UsUUFBQSxDQUFTLElBQVQsRUFBZSxtQkFBbUIsQ0FBQywyQkFBcEIsQ0FBZ0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixJQUFDLENBQUEsT0FBRCxDQUFTLFFBQVEsQ0FBQyxJQUFsQixDQUE1QixDQUFoRCxDQUFmLEVBREY7S0FBQSxhQUFBO01BRU07YUFDSixRQUFBLENBQVMsa0JBQUEsR0FBbUIsQ0FBQyxDQUFDLE9BQTlCLEVBSEY7O0VBREk7O2lDQU1OLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ0osUUFBQTtJQUFBLElBQUEsR0FBTztJQUNQLE1BQUEsR0FBUyxJQUFDLENBQUEsT0FBRCxDQUFTLHFCQUFDLFFBQVEsQ0FBRSxJQUFWLENBQUEsV0FBQSxJQUFvQixFQUFyQixDQUF3QixDQUFDLElBQXpCLENBQThCLEdBQTlCLENBQVQ7QUFDVDtBQUFBLFNBQUEsVUFBQTs7TUFDRSxJQUFHLEdBQUcsQ0FBQyxNQUFKLENBQVcsQ0FBWCxFQUFjLE1BQU0sQ0FBQyxNQUFyQixDQUFBLEtBQWdDLE1BQW5DO1FBQ0UsT0FBMkIsR0FBRyxDQUFDLE1BQUosQ0FBVyxNQUFNLENBQUMsTUFBbEIsQ0FBeUIsQ0FBQyxLQUExQixDQUFnQyxHQUFoQyxDQUEzQixFQUFDLGtCQUFELEVBQVc7UUFDWCxJQUFBLEdBQU8sR0FBRyxDQUFDLE1BQUosQ0FBVyxNQUFNLENBQUMsTUFBbEI7UUFDUCxJQUFJLENBQUMsSUFBTCxDQUFjLElBQUEsYUFBQSxDQUNaO1VBQUEsSUFBQSxFQUFNLElBQU47VUFDQSxJQUFBLEVBQVMsU0FBUyxDQUFDLE1BQVYsR0FBbUIsQ0FBdEIsR0FBNkIsYUFBYSxDQUFDLE1BQTNDLEdBQXVELGFBQWEsQ0FBQyxJQUQzRTtVQUVBLE1BQUEsRUFBUSxRQUZSO1VBR0EsUUFBQSxFQUFVLElBSFY7U0FEWSxDQUFkLEVBSEY7O0FBREY7V0FTQSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7RUFaSTs7aUNBY04sTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDTixRQUFBO0FBQUE7TUFDRSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQXBCLENBQStCLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCLENBQS9COzhDQUNBLFNBQVUsZUFGWjtLQUFBLGFBQUE7OENBSUUsU0FBVSw2QkFKWjs7RUFETTs7aUNBT1IsTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLE9BQVgsRUFBb0IsUUFBcEI7QUFDTixRQUFBO0FBQUE7TUFDRSxPQUFBLEdBQVUsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixJQUFDLENBQUEsT0FBRCxDQUFTLFFBQVEsQ0FBQyxJQUFsQixDQUE1QjtNQUNWLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBcEIsQ0FBNEIsSUFBQyxDQUFBLE9BQUQsQ0FBUyxPQUFULENBQTVCLEVBQStDLE9BQS9DO01BQ0EsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFwQixDQUErQixJQUFDLENBQUEsT0FBRCxDQUFTLFFBQVEsQ0FBQyxJQUFsQixDQUEvQjtNQUNBLFFBQVEsQ0FBQyxJQUFULEdBQWdCO2FBQ2hCLFFBQUEsQ0FBUyxJQUFULEVBQWUsUUFBZixFQUxGO0tBQUEsYUFBQTs4Q0FPRSxTQUFVLDZCQVBaOztFQURNOztpQ0FVUixTQUFBLEdBQVcsU0FBQyxlQUFELEVBQWtCLFFBQWxCO0FBQ1QsUUFBQTtJQUFBLFFBQUEsR0FBZSxJQUFBLGFBQUEsQ0FDYjtNQUFBLElBQUEsRUFBTSxlQUFOO01BQ0EsSUFBQSxFQUFNLGFBQWEsQ0FBQyxJQURwQjtNQUVBLE1BQUEsRUFBUSxJQUZSO01BR0EsUUFBQSxFQUFVLElBSFY7S0FEYTtXQUtmLElBQUMsQ0FBQSxJQUFELENBQU0sUUFBTixFQUFnQixTQUFDLEdBQUQsRUFBTSxPQUFOO2FBQ2QsUUFBQSxDQUFTLEdBQVQsRUFBYyxPQUFkLEVBQXVCLFFBQXZCO0lBRGMsQ0FBaEI7RUFOUzs7aUNBU1gsa0JBQUEsR0FBb0IsU0FBQyxjQUFELEVBQWlCLGFBQWpCO1dBQ2xCLGFBQWEsQ0FBQztFQURJOztpQ0FHcEIsT0FBQSxHQUFTLFNBQUMsSUFBRDs7TUFBQyxPQUFPOztXQUNmLE9BQUEsR0FBTyxDQUFDLElBQUksQ0FBQyxPQUFMLENBQWEsS0FBYixFQUFvQixHQUFwQixDQUFEO0VBREE7Ozs7R0FqRndCOztBQW9GbkMsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDMUZqQixJQUFBLDZGQUFBO0VBQUE7O0FBQUMsTUFBTyxLQUFLLENBQUMsSUFBYjs7QUFFRCxRQUFBLEdBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUVMO0VBQ1MsbUJBQUMsT0FBRDtJQUNWLElBQUMsQ0FBQSxrQkFBQSxPQUFGLEVBQVcsSUFBQyxDQUFBLG1CQUFBO0VBREQ7Ozs7OztBQUdUO0VBQ1MsdUJBQUMsT0FBRDtBQUNYLFFBQUE7SUFBQyxJQUFDLENBQUEsZUFBQSxJQUFGLEVBQVEsSUFBQyxDQUFBLGVBQUEsSUFBVCxFQUFlLElBQUMsQ0FBQSxvREFBVyxJQUEzQixFQUFpQyxJQUFDLENBQUEsa0RBQVMsSUFBM0MsRUFBaUQsSUFBQyxDQUFBLDhEQUFhLEVBQS9ELEVBQW1FLElBQUMsQ0FBQSx1QkFBQSxZQUFwRSxFQUFrRixJQUFDLENBQUEsMEJBQUEsZUFBbkYsRUFBb0csSUFBQyxDQUFBLGlDQUFBO0VBRDFGOztFQUViLGFBQUMsQ0FBQSxNQUFELEdBQVM7O0VBQ1QsYUFBQyxDQUFBLElBQUQsR0FBTzs7MEJBRVAsSUFBQSxHQUFNLFNBQUE7QUFDSixRQUFBO0lBQUEsS0FBQSxHQUFRO0lBQ1IsTUFBQSxHQUFTLElBQUMsQ0FBQTtBQUNWLFdBQU0sTUFBQSxLQUFZLElBQWxCO01BQ0UsS0FBSyxDQUFDLE9BQU4sQ0FBYyxNQUFkO01BQ0EsTUFBQSxHQUFTLE1BQU0sQ0FBQztJQUZsQjtXQUdBO0VBTkk7Ozs7OztBQVNGO0VBQ1MsNkJBQUE7SUFDWCxJQUFDLENBQUEsZ0JBQUQsR0FBb0I7RUFEVDs7Z0NBSWIsbUJBQUEsR0FBcUIsU0FBQyxnQkFBRDtBQUNuQixRQUFBO0FBQUE7U0FBQSx1QkFBQTttQkFDRSxJQUFDLENBQUEsZ0JBQWlCLENBQUEsR0FBQSxDQUFsQixHQUF5QixnQkFBaUIsQ0FBQSxHQUFBO0FBRDVDOztFQURtQjs7Z0NBS3JCLDJCQUFBLEdBQTZCLFNBQUMsT0FBRDtXQUN2QixJQUFBLFlBQUEsQ0FBYSxJQUFDLENBQUEsY0FBRCxDQUFnQixPQUFoQixDQUFiO0VBRHVCOztnQ0FRN0IsY0FBQSxHQUFnQixTQUFDLE9BQUQ7QUFDZCxRQUFBO0lBQUEscUJBQUEsR0FBd0IsSUFBQyxDQUFBLGFBQUQsQ0FBZSxPQUFmO0FBQ3hCLFNBQUEsNEJBQUE7O1FBQ0UscUJBQXNCLENBQUEsR0FBQSxJQUFRLElBQUMsQ0FBQSxnQkFBaUIsQ0FBQSxHQUFBOztBQURsRDtBQUVBLFdBQU87RUFKTzs7Z0NBT2hCLGFBQUEsR0FBZSxTQUFDLE9BQUQ7SUFDYixJQUFHLFFBQUEsQ0FBUyxPQUFULENBQUg7QUFDRTtRQUFJLE9BQUEsR0FBVSxJQUFJLENBQUMsS0FBTCxDQUFXLE9BQVgsRUFBZDtPQUFBLHFCQURGOztJQUVBLElBQUcsdUJBQUg7QUFDRSxhQUFPLFFBRFQ7S0FBQSxNQUFBO0FBR0UsYUFBTztRQUFDLFNBQUEsT0FBRDtRQUhUOztFQUhhOzs7Ozs7QUFRWDtFQUNTLHNCQUFDLEVBQUQ7SUFBQyxJQUFDLENBQUEsaUJBQUQsS0FBSztFQUFOOzt5QkFFYixVQUFBLEdBQVksU0FBQTtXQUFHLElBQUMsQ0FBQTtFQUFKOzt5QkFDWixnQkFBQSxHQUFtQixTQUFBO1dBQUcsSUFBSSxDQUFDLFNBQUwsQ0FBZSxJQUFDLENBQUEsQ0FBaEI7RUFBSDs7eUJBRW5CLEtBQUEsR0FBTyxTQUFBO1dBQU8sSUFBQSxZQUFBLENBQWEsQ0FBQyxDQUFDLFNBQUYsQ0FBWSxJQUFDLENBQUEsQ0FBYixDQUFiO0VBQVA7O3lCQUVQLE9BQUEsR0FBUyxTQUFDLElBQUQ7V0FBVSxJQUFDLENBQUEsQ0FBQyxDQUFDLE9BQUgsR0FBYTtFQUF2Qjs7eUJBQ1QsT0FBQSxHQUFTLFNBQUE7SUFBRyxJQUFHLElBQUMsQ0FBQSxDQUFDLENBQUMsT0FBSCxLQUFjLElBQWpCO2FBQTJCLEdBQTNCO0tBQUEsTUFBbUMsSUFBRyxRQUFBLENBQVMsSUFBQyxDQUFBLENBQUMsQ0FBQyxPQUFaLENBQUg7YUFBNkIsSUFBQyxDQUFBLENBQUMsQ0FBQyxRQUFoQztLQUFBLE1BQUE7YUFBNkMsSUFBSSxDQUFDLFNBQUwsQ0FBZSxJQUFDLENBQUEsQ0FBQyxDQUFDLE9BQWxCLEVBQTdDOztFQUF0Qzs7eUJBRVQsV0FBQSxHQUFhLFNBQUMsUUFBRDtBQUFjLFFBQUE7QUFBQTtTQUFBLGVBQUE7bUJBQUEsSUFBQyxDQUFBLENBQUUsQ0FBQSxHQUFBLENBQUgsR0FBVSxRQUFTLENBQUEsR0FBQTtBQUFuQjs7RUFBZDs7eUJBQ2IsR0FBQSxHQUFLLFNBQUMsSUFBRDtXQUFVLElBQUMsQ0FBQSxDQUFFLENBQUEsSUFBQTtFQUFiOzt5QkFFTCxjQUFBLEdBQWdCLFNBQUMsRUFBRDtBQUNkLFFBQUE7SUFBQSxRQUFBLEdBQVc7QUFDWDtBQUFBLFNBQUEsVUFBQTs7O01BQ0UsSUFBRyxHQUFBLEtBQVMsU0FBWjtRQUNFLFFBQVMsQ0FBQSxHQUFBLENBQVQsR0FBZ0IsTUFEbEI7O0FBREY7V0FHQSxFQUFFLENBQUMsV0FBSCxDQUFlLFFBQWY7RUFMYzs7Ozs7O0FBT1o7RUFFUywyQkFBQyxPQUFEO0lBQ1YsSUFBQyxDQUFBLGVBQUEsSUFBRixFQUFRLElBQUMsQ0FBQSxzQkFBQSxXQUFULEVBQXNCLElBQUMsQ0FBQSx1QkFBQTtFQURaOztFQUdiLGlCQUFDLENBQUEsU0FBRCxHQUFZLFNBQUE7V0FBRztFQUFIOzs4QkFFWixHQUFBLEdBQUssU0FBQyxVQUFEO1dBQ0gsSUFBQyxDQUFBLFlBQWEsQ0FBQSxVQUFBO0VBRFg7OzhCQUdMLFVBQUEsR0FBWSxTQUFDLFFBQUQ7SUFDVixJQUFHLFFBQUg7YUFDRSxRQUFBLENBQVMsSUFBVCxFQURGO0tBQUEsTUFBQTthQUdFLEtBSEY7O0VBRFU7OzhCQU1aLHlCQUFBLEdBQTJCLFNBQUE7V0FDeEIsaUNBQUEsQ0FBa0M7TUFBQyxRQUFBLEVBQVUsSUFBWDtLQUFsQztFQUR3Qjs7OEJBRzNCLFVBQUEsR0FBWSxTQUFBO1dBQ1Y7RUFEVTs7OEJBR1osTUFBQSxHQUFRLFNBQUMsUUFBRDtXQUNOLElBQUMsQ0FBQSxlQUFELENBQWlCLFFBQWpCO0VBRE07OzhCQUdSLElBQUEsR0FBTSxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO1dBQ0osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsTUFBakI7RUFESTs7OEJBR04sSUFBQSxHQUFNLFNBQUMsUUFBRDtXQUNKLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCO0VBREk7OzhCQUdOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsTUFBakI7RUFESTs7OEJBR04sTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDTixJQUFDLENBQUEsZUFBRCxDQUFpQixRQUFqQjtFQURNOzs4QkFHUixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsT0FBWCxFQUFvQixRQUFwQjtXQUNOLElBQUMsQ0FBQSxlQUFELENBQWlCLFFBQWpCO0VBRE07OzhCQUdSLEtBQUEsR0FBTyxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0wsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsT0FBakI7RUFESzs7OEJBR1AsU0FBQSxHQUFXLFNBQUMsZUFBRCxFQUFrQixRQUFsQjtXQUNULElBQUMsQ0FBQSxlQUFELENBQWlCLFdBQWpCO0VBRFM7OzhCQUdYLGtCQUFBLEdBQW9CLFNBQUMsUUFBRDtXQUNsQixJQUFDLENBQUEsZUFBRCxDQUFpQixvQkFBakI7RUFEa0I7OzhCQUdwQixlQUFBLEdBQWlCLFNBQUMsVUFBRDtXQUNmLEtBQUEsQ0FBUyxVQUFELEdBQVksdUJBQVosR0FBbUMsSUFBQyxDQUFBLElBQXBDLEdBQXlDLFdBQWpEO0VBRGU7Ozs7OztBQUduQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsU0FBQSxFQUFXLFNBQVg7RUFDQSxhQUFBLEVBQWUsYUFEZjtFQUVBLFlBQUEsRUFBYyxZQUZkO0VBR0EsbUJBQUEsRUFBeUIsSUFBQSxtQkFBQSxDQUFBLENBSHpCO0VBSUEsaUJBQUEsRUFBbUIsaUJBSm5COzs7Ozs7QUNsSUYsSUFBQSxxRkFBQTtFQUFBOzs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBRVgsaUJBQUEsR0FBb0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUNyRCxtQkFBQSxHQUFzQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3ZELGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUUzQzs7O0VBRVMsMEJBQUMsT0FBRCxFQUFnQixNQUFoQjtJQUFDLElBQUMsQ0FBQSw0QkFBRCxVQUFXO0lBQUksSUFBQyxDQUFBLFNBQUQ7SUFDM0Isa0RBQ0U7TUFBQSxJQUFBLEVBQU0sZ0JBQWdCLENBQUMsSUFBdkI7TUFDQSxXQUFBLEVBQWEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxXQUFULElBQXdCLENBQUMsRUFBQSxDQUFHLHFCQUFILENBQUQsQ0FEckM7TUFFQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sS0FBTjtRQUNBLElBQUEsRUFBTSxJQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsS0FIUjtRQUlBLE1BQUEsRUFBUSxLQUpSO1FBS0EsS0FBQSxFQUFPLEtBTFA7T0FIRjtLQURGO0lBVUEsSUFBQyxDQUFBLElBQUQsR0FBUTtFQVhHOztFQWFiLGdCQUFDLENBQUEsSUFBRCxHQUFPOzs2QkFFUCxJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxTQUFELENBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO0FBQ1QsWUFBQTtRQUFBLElBQXVCLEdBQXZCO0FBQUEsaUJBQU8sUUFBQSxDQUFTLEdBQVQsRUFBUDs7UUFDQSxPQUFBLEdBQVUsS0FBQyxDQUFBLFlBQUQsQ0FBYyxRQUFkO1FBQ1YsSUFBRyxPQUFIO1VBQ0UsSUFBRyxPQUFRLENBQUEsUUFBUSxDQUFDLElBQVQsQ0FBWDtZQUNFLElBQUcsT0FBUSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxRQUFRLENBQUMsSUFBaEMsS0FBd0MsYUFBYSxDQUFDLElBQXpEO3FCQUNFLFFBQUEsQ0FBUyxJQUFULEVBQWUsT0FBUSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxPQUF0QyxFQURGO2FBQUEsTUFBQTtxQkFHRSxRQUFBLENBQVksUUFBUSxDQUFDLElBQVYsR0FBZSxjQUExQixFQUhGO2FBREY7V0FBQSxNQUFBO21CQU1FLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLHNCQUExQixFQU5GO1dBREY7U0FBQSxNQUFBO2lCQVNFLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLG1CQUExQixFQVRGOztNQUhTO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYO0VBREk7OzZCQWVOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFNBQUQsQ0FBVyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsR0FBRCxFQUFNLElBQU47QUFDVCxZQUFBO1FBQUEsSUFBdUIsR0FBdkI7QUFBQSxpQkFBTyxRQUFBLENBQVMsR0FBVCxFQUFQOztRQUNBLElBQUEsR0FBTztRQUNQLE9BQUEsR0FBVSxLQUFDLENBQUEsWUFBRCxDQUFjLFFBQWQ7UUFDVixJQUFHLE9BQUg7QUFDRSxlQUFBLG1CQUFBOzs7WUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxRQUFmO0FBQUEsV0FERjs7ZUFFQSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7TUFOUztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWDtFQURJOzs2QkFTTixZQUFBLEdBQWMsU0FBQyxRQUFEO0lBQ1osd0JBQUcsUUFBUSxDQUFFLGNBQVYsS0FBa0IsYUFBYSxDQUFDLE1BQW5DO2FBQ0UsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUR4QjtLQUFBLE1BRUssdUJBQUcsUUFBUSxDQUFFLGVBQWI7YUFDSCxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUQxQjtLQUFBLE1BQUE7YUFHSCxJQUFDLENBQUEsS0FIRTs7RUFITzs7NkJBUWQsU0FBQSxHQUFXLFNBQUMsUUFBRDtJQUNULElBQUcsSUFBQyxDQUFBLElBQUQsS0FBVyxJQUFkO2FBQ0UsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFDLENBQUEsSUFBaEIsRUFERjtLQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVo7TUFDSCxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUFDLENBQUEsT0FBTyxDQUFDLElBQXJDO2FBQ1IsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFDLENBQUEsSUFBaEIsRUFGRztLQUFBLE1BR0EsSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLFlBQVo7YUFDSCxJQUFDLENBQUEsT0FBTyxDQUFDLFlBQVQsQ0FBc0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO1VBQ3BCLElBQUcsR0FBSDttQkFDRSxRQUFBLENBQVMsR0FBVCxFQURGO1dBQUEsTUFBQTtZQUdFLEtBQUMsQ0FBQSxJQUFELEdBQVEsS0FBQyxDQUFBLDBCQUFELENBQTRCLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBckM7bUJBQ1IsUUFBQSxDQUFTLElBQVQsRUFBZSxLQUFDLENBQUEsSUFBaEIsRUFKRjs7UUFEb0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRCLEVBREc7S0FBQSxNQU9BLElBQUcsSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQUFaO2FBQ0gsQ0FBQyxDQUFDLElBQUYsQ0FDRTtRQUFBLFFBQUEsRUFBVSxNQUFWO1FBQ0EsR0FBQSxFQUFLLElBQUMsQ0FBQSxPQUFPLENBQUMsR0FEZDtRQUVBLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLElBQUQ7WUFDUCxLQUFDLENBQUEsSUFBRCxHQUFRLEtBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUE1QjttQkFDUixRQUFBLENBQVMsSUFBVCxFQUFlLEtBQUMsQ0FBQSxJQUFoQjtVQUZPO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUZUO1FBS0EsS0FBQSxFQUFPLFNBQUE7aUJBQUcsUUFBQSxDQUFTLDBCQUFBLEdBQTJCLElBQUMsQ0FBQSxXQUE1QixHQUF3QyxXQUFqRDtRQUFILENBTFA7T0FERixFQURHO0tBQUEsTUFBQTs7UUFTSCxPQUFPLENBQUMsTUFBTyxrQ0FBQSxHQUFtQyxJQUFDLENBQUEsV0FBcEMsR0FBZ0Q7O2FBQy9ELFFBQUEsQ0FBUyxJQUFULEVBQWUsRUFBZixFQVZHOztFQWJJOzs2QkF5QlgsMEJBQUEsR0FBNEIsU0FBQyxJQUFELEVBQU8sTUFBUDtBQUMxQixRQUFBOztNQURpQyxTQUFTOztJQUMxQyxJQUFBLEdBQU87QUFDUCxTQUFBLGdCQUFBOztNQUNFLElBQUEsR0FBVSxRQUFBLENBQVMsSUFBSyxDQUFBLFFBQUEsQ0FBZCxDQUFILEdBQWdDLGFBQWEsQ0FBQyxJQUE5QyxHQUF3RCxhQUFhLENBQUM7TUFDN0UsUUFBQSxHQUFlLElBQUEsYUFBQSxDQUNiO1FBQUEsSUFBQSxFQUFNLFFBQU47UUFDQSxJQUFBLEVBQU0sSUFETjtRQUVBLE1BQUEsRUFBUSxNQUZSO1FBR0EsUUFBQSxFQUFVLElBSFY7UUFJQSxZQUFBLEVBQ0U7VUFBQSxRQUFBLEVBQVUsSUFBVjtTQUxGO09BRGE7TUFPZixJQUFHLElBQUEsS0FBUSxhQUFhLENBQUMsTUFBekI7UUFDRSxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQXRCLEdBQWlDLElBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUFLLENBQUEsUUFBQSxDQUFqQyxFQUE0QyxRQUE1QyxFQURuQzs7TUFFQSxPQUFBLEdBQVUsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELElBQUssQ0FBQSxRQUFBLENBQXJEO01BQ1YsSUFBSyxDQUFBLFFBQUEsQ0FBTCxHQUNFO1FBQUEsT0FBQSxFQUFTLE9BQVQ7UUFDQSxRQUFBLEVBQVUsUUFEVjs7QUFiSjtXQWVBO0VBakIwQjs7OztHQTFFQzs7QUE2Ri9CLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3BHakIsSUFBQTs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLG1CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsbUJBQVI7O0FBRUw7RUFFUyxpQ0FBQyxJQUFELEVBQVEsSUFBUjtJQUFDLElBQUMsQ0FBQSxPQUFEO0lBQU8sSUFBQyxDQUFBLHNCQUFELE9BQVE7RUFBaEI7Ozs7OztBQUVUO0VBRUosc0JBQUMsQ0FBQSxXQUFELEdBQWMsQ0FBQyxlQUFELEVBQWtCLGdCQUFsQixFQUFvQyxlQUFwQyxFQUFxRCxXQUFyRCxFQUFrRSxNQUFsRSxFQUEwRSxnQkFBMUUsRUFBNEYsY0FBNUYsRUFBNEcsZ0JBQTVHLEVBQThILGNBQTlIOztFQUVELGdDQUFDLE9BQUQsRUFBVSxNQUFWO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FBUyxJQUFDLENBQUEsY0FBRCxDQUFnQixPQUFPLENBQUMsSUFBeEIsRUFBOEIsTUFBOUI7SUFDVCxPQUFPLENBQUMsR0FBUixDQUFZLElBQUMsQ0FBQSxLQUFiO0VBRlc7O21DQUliLGNBQUEsR0FBZ0IsU0FBQyxTQUFELEVBQVksTUFBWjtBQUNkLFFBQUE7SUFBQSxTQUFBLEdBQVksU0FBQyxNQUFEO0FBQ1YsVUFBQTtrREFBYyxDQUFFLElBQWhCLENBQXFCLE1BQXJCLFdBQUEsSUFBZ0MsQ0FBQyxTQUFBO2VBQUcsS0FBQSxDQUFNLEtBQUEsR0FBTSxNQUFOLEdBQWEsb0NBQW5CO01BQUgsQ0FBRDtJQUR0QjtJQUdaLFVBQUEsR0FBYSxTQUFDLE1BQUQ7QUFDWCxjQUFPLE1BQVA7QUFBQSxhQUNPLGVBRFA7aUJBRUksU0FBQTtBQUFHLGdCQUFBO21CQUFBLENBQUMsb0NBQUEsSUFBZ0MsK0JBQWpDLENBQUEsSUFBNEQ7VUFBL0Q7QUFGSixhQUdPLDBCQUhQO2lCQUlJLFNBQUE7bUJBQUcsb0NBQUEsSUFBZ0M7VUFBbkM7QUFKSixhQUtPLGNBTFA7aUJBTUksU0FBQTtBQUFHLGdCQUFBOytGQUErQixDQUFFLEdBQWpDLENBQXFDLFFBQXJDO1VBQUg7QUFOSixhQU9PLGNBUFA7QUFBQSxhQU91QixjQVB2QjtpQkFRSSxTQUFBO21CQUFHO1VBQUg7QUFSSixhQVNPLHNCQVRQO2lCQVVJLFNBQUE7QUFBRyxnQkFBQTtvRUFBMkIsQ0FBRSxHQUE3QixDQUFpQyxrQkFBakM7VUFBSDtBQVZKLGFBV08sYUFYUDtpQkFZSSxTQUFBO0FBQUcsZ0JBQUE7bUJBQUE7VUFBSDtBQVpKO2lCQWNJO0FBZEo7SUFEVztJQWlCYixRQUFBLEdBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLFlBQUQ7UUFDVCxJQUFHLFlBQUg7aUJBQ0UsS0FBQyxDQUFBLGNBQUQsQ0FBZ0IsWUFBaEIsRUFBOEIsTUFBOUIsRUFERjtTQUFBLE1BQUE7aUJBR0UsS0FIRjs7TUFEUztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7SUFNWCxLQUFBLEdBQ0U7TUFBQSxhQUFBLEVBQWUsRUFBQSxDQUFHLFdBQUgsQ0FBZjtNQUNBLGNBQUEsRUFBZ0IsRUFBQSxDQUFHLFlBQUgsQ0FEaEI7TUFFQSx3QkFBQSxFQUEwQixFQUFBLENBQUcsNkJBQUgsQ0FGMUI7TUFHQSxvQkFBQSxFQUFzQixFQUFBLENBQUcsNkJBQUgsQ0FIdEI7TUFJQSxJQUFBLEVBQU0sRUFBQSxDQUFHLFlBQUgsQ0FKTjtNQUtBLGdCQUFBLEVBQWtCLEVBQUEsQ0FBRyxlQUFILENBTGxCO01BTUEsY0FBQSxFQUFnQixFQUFBLENBQUcsaUJBQUgsQ0FOaEI7TUFPQSxZQUFBLEVBQWMsRUFBQSxDQUFHLHNCQUFILENBUGQ7TUFRQSxXQUFBLEVBQWEsRUFBQSxDQUFHLG9CQUFILENBUmI7TUFTQSxjQUFBLEVBQWdCLEVBQUEsQ0FBRyxnQkFBSCxDQVRoQjtNQVVBLFlBQUEsRUFBYyxFQUFBLENBQUcsY0FBSCxDQVZkO01BV0EsYUFBQSxFQUFlLEVBQUEsQ0FBRyxpQkFBSCxDQVhmO01BWUEsWUFBQSxFQUFjLEVBQUEsQ0FBRyxhQUFILENBWmQ7O0lBY0YsUUFBQSxHQUNFO01BQUEsYUFBQSxFQUFlLENBQUMsMEJBQUQsRUFBNkIsc0JBQTdCLENBQWY7TUFDQSxZQUFBLEVBQWMsQ0FBQyxjQUFELEVBQWlCLGFBQWpCLENBRGQ7O0lBR0YsS0FBQSxHQUFRO0FBQ1IsU0FBQSxtREFBQTs7TUFDRSxJQUFHLElBQUEsS0FBUSxXQUFYO1FBQ0UsUUFBQSxHQUNFO1VBQUEsR0FBQSxFQUFLLFdBQUEsR0FBWSxDQUFqQjtVQUNBLFNBQUEsRUFBVyxJQURYO1VBRko7T0FBQSxNQUlLLElBQUcsUUFBQSxDQUFTLElBQVQsQ0FBSDtRQUNILFFBQUEsR0FDRTtVQUFBLEdBQUEsRUFBSyxJQUFMO1VBQ0EsSUFBQSwwQ0FBeUIsQ0FBQSxJQUFBLFdBQW5CLElBQTRCLEtBQU0sQ0FBQSxJQUFBLENBQWxDLElBQTJDLENBQUEsZ0JBQUEsR0FBaUIsSUFBakIsQ0FEakQ7VUFFQSxPQUFBLEVBQVMsVUFBQSxDQUFXLElBQVgsQ0FGVDtVQUdBLEtBQUEsRUFBTyxRQUFBLENBQVMsUUFBUyxDQUFBLElBQUEsQ0FBbEIsQ0FIUDtVQUlBLE1BQUEsRUFBUSxTQUFBLENBQVUsSUFBVixDQUpSO1VBRkM7T0FBQSxNQUFBO1FBUUgsUUFBQSxHQUFXO1FBRVgsSUFBRyxRQUFBLENBQVMsSUFBSSxDQUFDLE1BQWQsQ0FBSDtVQUNFLFFBQVEsQ0FBQyxHQUFULEdBQWUsSUFBSSxDQUFDO1VBQ3BCLFFBQVEsQ0FBQyxPQUFULEdBQW1CLFVBQUEsQ0FBVyxJQUFJLENBQUMsTUFBaEI7VUFDbkIsUUFBUSxDQUFDLE1BQVQsR0FBa0IsU0FBQSxDQUFVLElBQUksQ0FBQyxNQUFmLEVBSHBCO1NBQUEsTUFBQTtVQUtFLFFBQVEsQ0FBQyxZQUFULFFBQVEsQ0FBQyxVQUFZLE1BTHZCOztRQU1BLFFBQVEsQ0FBQyxLQUFULEdBQWlCLElBQUksQ0FBQyxLQUFMLElBQWMsUUFBQSxDQUFTLElBQUksQ0FBQyxJQUFkLEVBaEI1Qjs7TUFpQkwsS0FBSyxDQUFDLElBQU4sQ0FBVyxRQUFYO0FBdEJGO1dBdUJBO0VBdEVjOzs7Ozs7QUF3RVo7RUFFUyw0QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFNBQUQ7SUFDWixJQUFDLENBQUEsSUFBRCxHQUFRO0VBREc7OytCQUdiLElBQUEsR0FBTSxTQUFDLE9BQUQ7SUFDSixPQUFBLEdBQVUsT0FBQSxJQUFXO0lBRXJCLElBQUcsT0FBTyxDQUFDLElBQVIsS0FBa0IsSUFBckI7TUFDRSxJQUFHLE9BQU8sT0FBTyxDQUFDLElBQWYsS0FBdUIsV0FBMUI7UUFDRSxPQUFPLENBQUMsSUFBUixHQUFlLHNCQUFzQixDQUFDLFlBRHhDOzthQUVBLElBQUMsQ0FBQSxJQUFELEdBQVksSUFBQSxzQkFBQSxDQUF1QixPQUF2QixFQUFnQyxJQUFDLENBQUEsTUFBakMsRUFIZDs7RUFISTs7K0JBU04sTUFBQSxHQUFRLFNBQUMsZ0JBQUQ7SUFBQyxJQUFDLENBQUEsbUJBQUQ7RUFBRDs7K0JBRVIsY0FBQSxHQUFnQixTQUFDLElBQUQ7V0FDZCxJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixnQkFBeEIsRUFBMEMsSUFBMUMsQ0FBdEI7RUFEYzs7K0JBR2hCLGVBQUEsR0FBaUIsU0FBQyxJQUFEO1dBQ2YsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0IsaUJBQXhCLEVBQTJDLElBQTNDLENBQXRCO0VBRGU7OytCQUdqQixlQUFBLEdBQWlCLFNBQUMsR0FBRCxFQUFNLElBQU47V0FDZixJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixpQkFBeEIsRUFDcEI7TUFBQSxHQUFBLEVBQUssR0FBTDtNQUNBLElBQUEsRUFBTSxJQUROO0tBRG9CLENBQXRCO0VBRGU7OytCQUtqQixvQkFBQSxHQUFzQixTQUFDLEdBQUQsRUFBTSxJQUFOO1dBQ3BCLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLHNCQUF4QixFQUNwQjtNQUFBLEdBQUEsRUFBSyxHQUFMO01BQ0EsSUFBQSxFQUFNLElBRE47S0FEb0IsQ0FBdEI7RUFEb0I7OytCQUt0QixtQkFBQSxHQUFxQixTQUFDLEdBQUQsRUFBTSxJQUFOO1dBQ25CLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLHFCQUF4QixFQUNwQjtNQUFBLEdBQUEsRUFBSyxHQUFMO01BQ0EsSUFBQSxFQUFNLElBRE47S0FEb0IsQ0FBdEI7RUFEbUI7OytCQUtyQixjQUFBLEdBQWdCLFNBQUMsSUFBRDtXQUNkLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLGdCQUF4QixFQUEwQyxJQUExQyxDQUF0QjtFQURjOzsrQkFHaEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7V0FDZCxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsVUFBckIsRUFBa0MsRUFBQSxDQUFHLGNBQUgsQ0FBbEMsRUFBc0QsUUFBdEQ7RUFEYzs7K0JBR2hCLGdCQUFBLEdBQWtCLFNBQUMsUUFBRDtXQUNoQixJQUFDLENBQUEsbUJBQUQsQ0FBcUIsWUFBckIsRUFBb0MsRUFBQSxDQUFHLGlCQUFILENBQXBDLEVBQTJELFFBQTNEO0VBRGdCOzsrQkFHbEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7V0FDZCxJQUFDLENBQUEsbUJBQUQsQ0FBcUIsY0FBckIsRUFBc0MsRUFBQSxDQUFHLG1CQUFILENBQXRDLEVBQStELFFBQS9EO0VBRGM7OytCQUdoQixjQUFBLEdBQWdCLFNBQUMsUUFBRDtXQUNkLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixVQUFyQixFQUFrQyxFQUFBLENBQUcsY0FBSCxDQUFsQyxFQUFzRCxRQUF0RDtFQURjOzsrQkFHaEIsY0FBQSxHQUFnQixTQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXFCLE9BQXJCLEVBQThCLFFBQTlCO1dBQ2QsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isb0JBQXhCLEVBQ3BCO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxRQUFBLEVBQVUsUUFEVjtNQUVBLE9BQUEsRUFBUyxPQUZUO01BR0EsUUFBQSxFQUFVLFFBSFY7S0FEb0IsQ0FBdEI7RUFEYzs7K0JBT2hCLFlBQUEsR0FBYyxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ1osSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isa0JBQXhCLEVBQ3BCO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxRQUFBLEVBQVUsUUFEVjtLQURvQixDQUF0QjtFQURZOzsrQkFLZCxjQUFBLEdBQWdCLFNBQUMsR0FBRDtXQUNkLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLG9CQUF4QixFQUNwQjtNQUFBLEdBQUEsRUFBSyxHQUFMO0tBRG9CLENBQXRCO0VBRGM7OytCQUloQixhQUFBLEdBQWUsU0FBQyxVQUFEO1dBQ2IsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0IsbUJBQXhCLEVBQTZDLFVBQTdDLENBQXRCO0VBRGE7OytCQUdmLG1CQUFBLEdBQXFCLFNBQUMsTUFBRCxFQUFTLEtBQVQsRUFBZ0IsUUFBaEI7V0FDbkIsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isb0JBQXhCLEVBQ3BCO01BQUEsTUFBQSxFQUFRLE1BQVI7TUFDQSxLQUFBLEVBQU8sS0FEUDtNQUVBLFFBQUEsRUFBVSxRQUZWO0tBRG9CLENBQXRCO0VBRG1COzs7Ozs7QUFNdkIsTUFBTSxDQUFDLE9BQVAsR0FDRTtFQUFBLHVCQUFBLEVBQXlCLHVCQUF6QjtFQUNBLGtCQUFBLEVBQW9CLGtCQURwQjtFQUVBLHNCQUFBLEVBQXdCLHNCQUZ4Qjs7Ozs7O0FDcktGLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUMsS0FBRDtBQUNmLE1BQUE7RUFBQSxHQUFBLEdBQU07RUFDTixRQUFRLENBQUMsTUFBTSxDQUFDLE1BQWhCLENBQXVCLENBQXZCLENBQXlCLENBQUMsS0FBMUIsQ0FBZ0MsR0FBaEMsQ0FBb0MsQ0FBQyxJQUFyQyxDQUEwQyxTQUFDLElBQUQ7V0FDeEMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYLENBQWdCLENBQUEsQ0FBQSxDQUFoQixLQUFzQixLQUF0QixJQUFnQyxDQUFDLEdBQUEsR0FBTSxJQUFJLENBQUMsS0FBTCxDQUFXLEdBQVgsQ0FBZ0IsQ0FBQSxDQUFBLENBQXZCO0VBRFEsQ0FBMUM7U0FFQTtBQUplOzs7OztBQ0FqQixNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFDLEtBQUQ7U0FBVyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUExQixDQUErQixLQUEvQixDQUFBLEtBQXlDO0FBQXBEOzs7OztBQ0FqQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsNEJBQUEsRUFBOEIsbUJBQTlCO0VBRUEsV0FBQSxFQUFhLEtBRmI7RUFHQSxZQUFBLEVBQWMsVUFIZDtFQUlBLFlBQUEsRUFBYyxNQUpkO0VBS0EsZUFBQSxFQUFpQixhQUxqQjtFQU1BLGlCQUFBLEVBQW1CLGlCQU5uQjtFQU9BLGFBQUEsRUFBZSxVQVBmO0VBUUEsc0JBQUEsRUFBd0IseUJBUnhCO0VBU0Esb0JBQUEsRUFBc0Isb0JBVHRCO0VBVUEsZ0JBQUEsRUFBa0IsVUFWbEI7RUFXQSxjQUFBLEVBQWdCLFFBWGhCO0VBWUEsaUJBQUEsRUFBbUIsY0FabkI7RUFhQSw2QkFBQSxFQUErQix1QkFiL0I7RUFjQSw2QkFBQSxFQUErQixhQWQvQjtFQWdCQSxjQUFBLEVBQWdCLE1BaEJoQjtFQWlCQSxpQkFBQSxFQUFtQixhQWpCbkI7RUFrQkEsbUJBQUEsRUFBcUIsaUJBbEJyQjtFQW1CQSxjQUFBLEVBQWdCLE1BbkJoQjtFQW9CQSxrQkFBQSxFQUFvQixVQXBCcEI7RUFxQkEsZ0JBQUEsRUFBa0IsUUFyQmxCO0VBc0JBLGdCQUFBLEVBQWtCLGlCQXRCbEI7RUF3QkEseUJBQUEsRUFBMkIsZUF4QjNCO0VBeUJBLHFCQUFBLEVBQXVCLFdBekJ2QjtFQTBCQSx3QkFBQSxFQUEwQixjQTFCMUI7RUEyQkEsMEJBQUEsRUFBNEIsZ0JBM0I1QjtFQTZCQSx1QkFBQSxFQUF5QixVQTdCekI7RUE4QkEsbUJBQUEsRUFBcUIsTUE5QnJCO0VBK0JBLG1CQUFBLEVBQXFCLE1BL0JyQjtFQWdDQSxxQkFBQSxFQUF1QixRQWhDdkI7RUFpQ0EscUJBQUEsRUFBdUIsUUFqQ3ZCO0VBa0NBLDZCQUFBLEVBQStCLDhDQWxDL0I7RUFtQ0Esc0JBQUEsRUFBd0IsWUFuQ3hCO0VBcUNBLDJCQUFBLEVBQTZCLFVBckM3QjtFQXNDQSx5QkFBQSxFQUEyQixRQXRDM0I7RUF3Q0EsdUJBQUEsRUFBeUIsUUF4Q3pCO0VBeUNBLHVCQUFBLEVBQXlCLFFBekN6QjtFQTJDQSxvQkFBQSxFQUFzQixNQTNDdEI7RUE0Q0Esb0JBQUEsRUFBc0IsTUE1Q3RCO0VBNkNBLHFCQUFBLEVBQXVCLE9BN0N2QjtFQThDQSw0QkFBQSxFQUE4QixpREE5QzlCO0VBK0NBLDBCQUFBLEVBQTRCLGtFQS9DNUI7RUFpREEsb0JBQUEsRUFBc0IsbUVBakR0QjtFQWtEQSxtQkFBQSxFQUFxQiw4REFsRHJCO0VBbURBLGdDQUFBLEVBQWtDLDBFQW5EbEM7RUFvREEsZ0NBQUEsRUFBa0MsaUVBcERsQzs7Ozs7O0FDREYsSUFBQTs7QUFBQSxZQUFBLEdBQWdCOztBQUNoQixZQUFhLENBQUEsSUFBQSxDQUFiLEdBQXFCLE9BQUEsQ0FBUSxjQUFSOztBQUNyQixXQUFBLEdBQWM7O0FBQ2QsU0FBQSxHQUFZOztBQUVaLFNBQUEsR0FBWSxTQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWUsSUFBZjtBQUNWLE1BQUE7O0lBRGdCLE9BQUs7OztJQUFJLE9BQUs7O0VBQzlCLFdBQUEsNENBQWtDLENBQUEsR0FBQSxXQUFwQixJQUE0QjtTQUMxQyxXQUFXLENBQUMsT0FBWixDQUFvQixTQUFwQixFQUErQixTQUFDLEtBQUQsRUFBUSxHQUFSO0lBQzdCLElBQUcsSUFBSSxDQUFDLGNBQUwsQ0FBb0IsR0FBcEIsQ0FBSDthQUFnQyxJQUFLLENBQUEsR0FBQSxFQUFyQztLQUFBLE1BQUE7YUFBK0Msa0JBQUEsR0FBbUIsR0FBbkIsR0FBdUIsTUFBdEU7O0VBRDZCLENBQS9CO0FBRlU7O0FBS1osTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDVmpCLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxpQkFBUixDQUFwQjs7QUFDVixvQkFBQSxHQUF1QixLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsK0JBQVIsQ0FBcEI7O0FBQ3ZCLGNBQUEsR0FBaUIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHdCQUFSLENBQXBCOztBQUNqQixZQUFBLEdBQWUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHNCQUFSLENBQXBCOztBQUNmLGNBQUEsR0FBaUIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHlCQUFSLENBQXBCOztBQUNqQixhQUFBLEdBQWdCLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSx1QkFBUixDQUFwQjs7QUFFaEIsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUVYLE1BQWdCLEtBQUssQ0FBQyxHQUF0QixFQUFDLFVBQUEsR0FBRCxFQUFNLGFBQUE7O0FBRU4sUUFBQSxHQUFXLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBRTdCO0VBQUEsV0FBQSxFQUFhLDBCQUFiO0VBRUEscUJBQUEsRUFBdUIsU0FBQyxTQUFEO1dBQ3JCLFNBQVMsQ0FBQyxHQUFWLEtBQW1CLElBQUMsQ0FBQSxLQUFLLENBQUM7RUFETCxDQUZ2QjtFQUtBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLFVBQVo7S0FBSixFQUNFLE1BQUEsQ0FBTztNQUFDLEdBQUEsRUFBSyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQWI7S0FBUCxDQURGO0VBREssQ0FMUjtDQUY2QixDQUFwQjs7QUFZWCxHQUFBLEdBQU0sS0FBSyxDQUFDLFdBQU4sQ0FFSjtFQUFBLFdBQUEsRUFBYSxrQkFBYjtFQUVBLFdBQUEsRUFBYSxTQUFBO0FBQ1gsUUFBQTtJQUFBLDZEQUErQixDQUFFLGNBQTlCLENBQTZDLE1BQTdDLFdBQUEsa0VBQTBGLENBQUUsZ0JBQW5DLEdBQTRDLENBQXhHO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUQvQjtLQUFBLE1BQUE7YUFHRyxFQUFBLENBQUcsNEJBQUgsRUFISDs7RUFEVyxDQUZiO0VBUUEsV0FBQSxFQUFhLFNBQUE7QUFDWCxRQUFBO21FQUE0QixDQUFFO0VBRG5CLENBUmI7RUFXQSxlQUFBLEVBQWlCLFNBQUE7QUFDZixRQUFBO1dBQUE7TUFBQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQUFWO01BQ0EsUUFBQSxFQUFVLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FEVjtNQUVBLFNBQUEscURBQWlDLENBQUUsZUFBeEIsSUFBaUMsRUFGNUM7TUFHQSxXQUFBLHdDQUFzQixDQUFFLGlCQUFYLElBQXNCLEVBSG5DO01BSUEsY0FBQSxFQUFnQixJQUpoQjtNQUtBLGNBQUEsRUFBZ0IsSUFMaEI7TUFNQSxZQUFBLEVBQWMsSUFOZDtNQU9BLGNBQUEsRUFBZ0IsSUFQaEI7TUFRQSxLQUFBLEVBQU8sS0FSUDs7RUFEZSxDQVhqQjtFQXNCQSxrQkFBQSxFQUFvQixTQUFBO0lBQ2xCLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQWQsQ0FBcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEtBQUQ7QUFDbkIsWUFBQTtRQUFBLFVBQUEsR0FBZ0IsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFmLEdBQ1g7VUFBQyxPQUFBLEVBQVMsV0FBVjtVQUF1QixJQUFBLEVBQU0sTUFBN0I7U0FEVyxHQUVMLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBZixHQUNIO1VBQUMsT0FBQSxFQUFTLHVCQUFBLEdBQXdCLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFoRTtVQUErRSxJQUFBLEVBQU0sTUFBckY7U0FERyxHQUVHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBZixHQUNIO1VBQUMsT0FBQSxFQUFTLFNBQVY7VUFBcUIsSUFBQSxFQUFNLE9BQTNCO1NBREcsR0FHSDtRQUNGLEtBQUMsQ0FBQSxRQUFELENBQ0U7VUFBQSxRQUFBLEVBQVUsS0FBQyxDQUFBLFdBQUQsQ0FBQSxDQUFWO1VBQ0EsUUFBQSxFQUFVLEtBQUMsQ0FBQSxXQUFELENBQUEsQ0FEVjtVQUVBLFVBQUEsRUFBWSxVQUZaO1NBREY7QUFLQSxnQkFBTyxLQUFLLENBQUMsSUFBYjtBQUFBLGVBQ08sV0FEUDttQkFFSSxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsU0FBQSxzREFBaUMsQ0FBRSxlQUF4QixJQUFpQyxFQUE1QzthQUFWO0FBRko7TUFkbUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXJCO1dBa0JBLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFsQixDQUF5QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsS0FBRDtBQUN2QixZQUFBO0FBQUEsZ0JBQU8sS0FBSyxDQUFDLElBQWI7QUFBQSxlQUNPLG9CQURQO21CQUVJLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxjQUFBLEVBQWdCLEtBQUssQ0FBQyxJQUF0QjthQUFWO0FBRkosZUFHTyxvQkFIUDttQkFJSSxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsY0FBQSxFQUFnQixLQUFLLENBQUMsSUFBdEI7YUFBVjtBQUpKLGVBS08sa0JBTFA7bUJBTUksS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFlBQUEsRUFBYyxLQUFLLENBQUMsSUFBcEI7YUFBVjtBQU5KLGVBT08sb0JBUFA7bUJBUUksS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLGNBQUEsRUFBZ0IsS0FBSyxDQUFDLElBQXRCO2FBQVY7QUFSSixlQVNPLG1CQVRQO21CQVVJLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxrQkFBQSxFQUFvQixLQUFLLENBQUMsSUFBMUI7YUFBVjtBQVZKLGVBV08sZ0JBWFA7WUFZSSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFqQixDQUFzQixLQUFLLENBQUMsSUFBNUI7bUJBQ0EsS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFNBQUEsRUFBVyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQWxCO2FBQVY7QUFiSixlQWNPLGlCQWRQO1lBZUksS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBakIsQ0FBeUIsS0FBSyxDQUFDLElBQS9CO21CQUNBLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxTQUFBLEVBQVcsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFsQjthQUFWO0FBaEJKLGVBaUJPLGlCQWpCUDtZQWtCSSxLQUFBLEdBQVEsS0FBQyxDQUFBLGlCQUFELENBQW1CLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBOUI7WUFDUixJQUFHLEtBQUEsS0FBVyxDQUFDLENBQWY7Y0FDRSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVUsQ0FBQSxLQUFBLENBQWpCLEdBQTBCLEtBQUssQ0FBQyxJQUFJLENBQUM7cUJBQ3JDLEtBQUMsQ0FBQSxRQUFELENBQVU7Z0JBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBbEI7ZUFBVixFQUZGOztBQUZHO0FBakJQLGVBc0JPLHNCQXRCUDtZQXVCSSxLQUFBLEdBQVEsS0FBQyxDQUFBLGlCQUFELENBQW1CLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBOUI7WUFDUixJQUFHLEtBQUEsS0FBVyxDQUFDLENBQWY7Y0FDRSxJQUFHLEtBQUEsS0FBUyxDQUFaO2dCQUNFLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQWpCLENBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBcEMsRUFERjtlQUFBLE1BQUE7Z0JBR0UsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBakIsQ0FBd0IsS0FBeEIsRUFBK0IsQ0FBL0IsRUFBa0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUE3QyxFQUhGOztxQkFJQSxLQUFDLENBQUEsUUFBRCxDQUFVO2dCQUFBLFNBQUEsRUFBVyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQWxCO2VBQVYsRUFMRjs7QUFGRztBQXRCUCxlQThCTyxxQkE5QlA7WUErQkksS0FBQSxHQUFRLEtBQUMsQ0FBQSxpQkFBRCxDQUFtQixLQUFLLENBQUMsSUFBSSxDQUFDLEdBQTlCO1lBQ1IsSUFBRyxLQUFBLEtBQVcsQ0FBQyxDQUFmO2NBQ0UsSUFBRyxLQUFBLEtBQVMsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBakIsR0FBMEIsQ0FBdEM7Z0JBQ0UsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBakIsQ0FBc0IsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFqQyxFQURGO2VBQUEsTUFBQTtnQkFHRSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFqQixDQUF3QixLQUFBLEdBQVEsQ0FBaEMsRUFBbUMsQ0FBbkMsRUFBc0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFqRCxFQUhGOztxQkFJQSxLQUFDLENBQUEsUUFBRCxDQUFVO2dCQUFBLFNBQUEsRUFBVyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQWxCO2VBQVYsRUFMRjs7QUFGRztBQTlCUCxlQXNDTyxnQkF0Q1A7WUF1Q0ksS0FBQyxDQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBbkIsR0FBMEIsS0FBSyxDQUFDO21CQUNoQyxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsV0FBQSxFQUFhLEtBQUMsQ0FBQSxLQUFLLENBQUMsV0FBcEI7YUFBVjtBQXhDSjtNQUR1QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekI7RUFuQmtCLENBdEJwQjtFQW9GQSxpQkFBQSxFQUFtQixTQUFDLEdBQUQ7QUFDakIsUUFBQTtJQUFBLElBQUcsUUFBQSxDQUFTLEdBQVQsQ0FBSDtBQUNFO0FBQUEsV0FBQSxzREFBQTs7UUFDRSxJQUFnQixJQUFJLENBQUMsR0FBTCxLQUFZLEdBQTVCO0FBQUEsaUJBQU8sTUFBUDs7QUFERjthQUVBLENBQUMsRUFISDtLQUFBLE1BQUE7TUFLRSxLQUFBLEdBQVEsUUFBQSxDQUFTLEdBQVQsRUFBYyxFQUFkO01BQ1IsSUFBRyxLQUFBLENBQU0sS0FBTixDQUFBLElBQWdCLEtBQUEsR0FBUSxDQUF4QixJQUE2QixLQUFBLEdBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBakIsR0FBMEIsQ0FBbEU7ZUFDRSxDQUFDLEVBREg7T0FBQSxNQUFBO2VBR0UsTUFIRjtPQU5GOztFQURpQixDQXBGbkI7RUFnR0EsWUFBQSxFQUFjLFNBQUE7V0FDWixJQUFDLENBQUEsUUFBRCxDQUNFO01BQUEsY0FBQSxFQUFnQixJQUFoQjtNQUNBLGNBQUEsRUFBZ0IsSUFEaEI7TUFFQSxZQUFBLEVBQWMsSUFGZDtNQUdBLGNBQUEsRUFBZ0IsSUFIaEI7S0FERjtFQURZLENBaEdkO0VBdUdBLGFBQUEsRUFBZSxTQUFBO0lBQ2IsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGtCQUFWO2FBQ0csYUFBQSxDQUFjLElBQUMsQ0FBQSxLQUFLLENBQUMsa0JBQXJCLEVBREg7S0FBQSxNQUVLLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFWO2FBQ0Ysb0JBQUEsQ0FBcUI7UUFBQyxNQUFBLEVBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFoQjtRQUF3QixNQUFBLEVBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUF2QztRQUF1RCxLQUFBLEVBQU8sSUFBQyxDQUFBLFlBQS9EO09BQXJCLEVBREU7S0FBQSxNQUVBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFWO2FBQ0YsY0FBQSxDQUFlO1FBQUMsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQWpDO1FBQTJDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUEzRTtRQUFxRixPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBcEg7UUFBNkgsS0FBQSxFQUFPLElBQUMsQ0FBQSxZQUFySTtPQUFmLEVBREU7S0FBQSxNQUVBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFWO2FBQ0YsWUFBQSxDQUFhO1FBQUMsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQS9CO1FBQXlDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUF2RTtRQUFpRixLQUFBLEVBQU8sSUFBQyxDQUFBLFlBQXpGO09BQWIsRUFERTtLQUFBLE1BRUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQVY7YUFDRixjQUFBLENBQWU7UUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBNUI7UUFBaUMsS0FBQSxFQUFPLElBQUMsQ0FBQSxZQUF6QztPQUFmLEVBREU7O0VBVFEsQ0F2R2Y7RUFtSEEsTUFBQSxFQUFRLFNBQUE7SUFDTixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBVjthQUNHLEdBQUEsQ0FBSTtRQUFDLFNBQUEsRUFBVyxLQUFaO09BQUosRUFDRSxPQUFBLENBQVE7UUFBQyxNQUFBLEVBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFoQjtRQUF3QixRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUF6QztRQUFtRCxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFwRTtRQUE4RSxVQUFBLEVBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFqRztRQUE2RyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxTQUEzSDtRQUFzSSxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxXQUF0SjtPQUFSLENBREYsRUFFRSxRQUFBLENBQVM7UUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO09BQVQsQ0FGRixFQUdDLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FIRCxFQURIO0tBQUEsTUFNSyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBUCxJQUF5QixJQUFDLENBQUEsS0FBSyxDQUFDLGNBQW5DO2FBQ0YsR0FBQSxDQUFJO1FBQUMsU0FBQSxFQUFXLEtBQVo7T0FBSixFQUNDLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FERCxFQURFO0tBQUEsTUFBQTthQUtILEtBTEc7O0VBUEMsQ0FuSFI7Q0FGSTs7QUFtSU4sTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDM0pqQixJQUFBOztBQUFBLGNBQUEsR0FDRTtFQUFBLGVBQUEsRUFBaUIsU0FBQTtXQUNmO01BQUEsVUFBQSxFQUFZLEtBQVo7O0VBRGUsQ0FBakI7RUFHQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQWhCLENBQTJCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxVQUFEO2VBQ3pCLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxVQUFBLEVBQVksVUFBWjtTQUFWO01BRHlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUEzQjtFQURrQixDQUhwQjtFQU9BLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVY7YUFDRSxJQUFDLENBQUEsb0JBQUQsQ0FBQSxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLHlCQUFoQixDQUFBLEVBSEY7O0VBRE0sQ0FQUjs7O0FBYUYsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDZGpCLElBQUE7O0FBQUEsS0FBQSxHQUFRLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxjQUFSLENBQXBCOztBQUNSLE1BQVcsS0FBSyxDQUFDLEdBQWpCLEVBQUMsVUFBQSxHQUFELEVBQU0sUUFBQTs7QUFFTixNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLGVBQWI7RUFFQSxLQUFBLEVBQU8sU0FBQTtBQUNMLFFBQUE7aUVBQU0sQ0FBQztFQURGLENBRlA7RUFLQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEtBQUEsQ0FBTTtNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7S0FBTixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxjQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsc0JBQVo7S0FBSixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxvQkFBWjtLQUFKLEVBQ0MsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLElBQWdCLGlCQURqQixDQURGLEVBSUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHdCQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsK0JBQVo7S0FBSixFQUFrRCxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQXpELENBREYsQ0FKRixDQURGLENBREY7RUFESyxDQUxSO0NBRmU7Ozs7O0FDSGpCLElBQUE7O0FBQUEsTUFBMEIsS0FBSyxDQUFDLEdBQWhDLEVBQUMsVUFBQSxHQUFELEVBQU0sWUFBQSxLQUFOLEVBQWEsUUFBQSxDQUFiLEVBQWdCLGFBQUE7O0FBRWhCLFdBQUEsR0FBYyxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEI7O0FBRWQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLG9CQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO0FBQ2YsUUFBQTtJQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsSUFBbUI7V0FDOUIsS0FBQSxHQUNFO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxlQUFBLEVBQWlCLElBQUMsQ0FBQSxJQUFELENBQU0sUUFBTixDQURqQjs7RUFIYSxDQUZqQjtFQVFBLGlCQUFBLEVBQW1CLFNBQUE7SUFDakIsSUFBQyxDQUFBLFFBQUQsR0FBWSxLQUFLLENBQUMsV0FBTixDQUFrQixJQUFDLENBQUEsSUFBSSxDQUFDLFFBQXhCO1dBQ1osSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUE7RUFGaUIsQ0FSbkI7RUFZQSxjQUFBLEVBQWdCLFNBQUE7QUFDZCxRQUFBO0lBQUEsUUFBQSxHQUFXLElBQUMsQ0FBQSxRQUFRLENBQUM7V0FDckIsSUFBQyxDQUFBLFFBQUQsQ0FDRTtNQUFBLFFBQUEsRUFBVSxRQUFWO01BQ0EsZUFBQSxFQUFpQixJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU4sQ0FEakI7S0FERjtFQUZjLENBWmhCO0VBa0JBLElBQUEsRUFBTSxTQUFDLENBQUQ7V0FDSixDQUFDLENBQUMsT0FBRixDQUFVLFdBQVYsRUFBdUIsRUFBdkI7RUFESSxDQWxCTjtFQXFCQSxRQUFBLEVBQVUsU0FBQyxDQUFEO0lBQ1IsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUF2QixHQUFnQyxDQUFuQztNQUNFLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBVCxDQUFzQixNQUF0QixFQUE4QixPQUFBLEdBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFmLEdBQXdCLEdBQXhCLEdBQTBCLENBQUMsa0JBQUEsQ0FBbUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUExQixDQUFELENBQXhEO2FBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUEsRUFGRjtLQUFBLE1BQUE7TUFJRSxDQUFDLENBQUMsY0FBRixDQUFBO2FBQ0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUEsRUFMRjs7RUFEUSxDQXJCVjtFQTZCQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBUSxFQUFBLENBQUcsa0JBQUgsQ0FBVDtNQUFpQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUEvQztLQUFaLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGlCQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssVUFBTjtNQUFrQixXQUFBLEVBQWEsVUFBL0I7TUFBMkMsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBekQ7TUFBbUUsUUFBQSxFQUFVLElBQUMsQ0FBQSxjQUE5RTtLQUFOLENBREYsRUFFRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtLQUFKLEVBQ0UsQ0FBQSxDQUFFO01BQUMsSUFBQSxFQUFNLEdBQVA7TUFBWSxTQUFBLEVBQVcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUF2QixLQUFpQyxDQUFwQyxHQUEyQyxVQUEzQyxHQUEyRCxFQUE1RCxDQUF2QjtNQUF3RixRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUF6RztNQUEwSCxPQUFBLEVBQVMsSUFBQyxDQUFBLFFBQXBJO0tBQUYsRUFBaUosRUFBQSxDQUFHLDJCQUFILENBQWpKLENBREYsRUFFRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFqQjtLQUFQLEVBQWdDLEVBQUEsQ0FBRyx5QkFBSCxDQUFoQyxDQUZGLENBRkYsQ0FERjtFQURLLENBN0JSO0NBRmU7Ozs7O0FDTmpCLElBQUE7O0FBQUEsTUFBdUMsS0FBSyxDQUFDLEdBQTdDLEVBQUMsVUFBQSxHQUFELEVBQU0sUUFBQSxDQUFOLEVBQVMsV0FBQSxJQUFULEVBQWUsU0FBQSxFQUFmLEVBQW1CLFNBQUEsRUFBbkIsRUFBdUIsVUFBQSxHQUF2QixFQUE0QixRQUFBLENBQTVCLEVBQStCLFdBQUE7O0FBRS9CLFlBQUEsR0FBZSxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUVqQztFQUFBLFdBQUEsRUFBYSxjQUFiO0VBRUEsT0FBQSxFQUFTLFNBQUE7V0FDUCxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBYyxJQUFDLENBQUEsS0FBSyxDQUFDLElBQXJCO0VBRE8sQ0FGVDtFQUtBLFVBQUEsRUFBWSxTQUFBO0FBQ1YsUUFBQTtJQUFBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZjtNQUNFLFFBQUEsR0FBVyxDQUFBLENBQUUsS0FBSyxDQUFDLFdBQU4sQ0FBa0IsSUFBQyxDQUFBLElBQUksQ0FBQyxJQUF4QixDQUFGO01BQ1gsSUFBQSxHQUFPLFFBQVEsQ0FBQyxNQUFULENBQUEsQ0FBaUIsQ0FBQyxNQUFsQixDQUFBO2FBRVAsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFQLENBQ0U7UUFBQSxLQUFBLEVBQ0U7VUFBQSxRQUFBLEVBQVUsVUFBVjtVQUNBLElBQUEsRUFBTSxJQUFJLENBQUMsS0FBTCxDQUFBLENBRE47VUFFQSxHQUFBLEVBQUssUUFBUSxDQUFDLFFBQVQsQ0FBQSxDQUFtQixDQUFDLEdBQXBCLEdBQTBCLFFBQUEsQ0FBUyxRQUFRLENBQUMsR0FBVCxDQUFhLGFBQWIsQ0FBVCxDQUYvQjtTQURGO1FBSUEsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBSm5CO09BREYsRUFKRjtLQUFBLE1BQUE7d0VBV1EsQ0FBQyxXQUFZLGVBWHJCOztFQURVLENBTFo7RUFtQkEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsT0FBQSxHQUFhLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQVosQ0FBMkIsU0FBM0IsQ0FBSCxHQUNMLE9BQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBbkIsS0FBOEIsVUFBakMsR0FDRSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFaLENBQUEsQ0FERixHQUdFLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BSk4sR0FNUjtJQUVGLE9BQUEsR0FBVSxDQUFDLFVBQUQ7SUFDVixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWY7TUFDRSxPQUFPLENBQUMsSUFBUixDQUFhLFdBQWI7YUFDQyxFQUFBLENBQUc7UUFBQyxTQUFBLEVBQVcsT0FBTyxDQUFDLElBQVIsQ0FBYSxHQUFiLENBQVo7T0FBSCxFQUFtQyxFQUFuQyxFQUZIO0tBQUEsTUFBQTtNQUlFLElBQTJCLENBQUksT0FBSixJQUFlLENBQUksQ0FBQyxJQUFDLENBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFaLElBQXNCLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQW5DLENBQTlDO1FBQUEsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQUE7O01BQ0EsSUFBQSxHQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVosSUFBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQzthQUNqQyxFQUFBLENBQUc7UUFBQyxHQUFBLEVBQUssTUFBTjtRQUFjLFNBQUEsRUFBVyxPQUFPLENBQUMsSUFBUixDQUFhLEdBQWIsQ0FBekI7UUFBNEMsT0FBQSxFQUFTLElBQUMsQ0FBQSxPQUF0RDtRQUErRCxZQUFBLEVBQWMsSUFBQyxDQUFBLFVBQTlFO09BQUgsRUFDQyxJQURELEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZixHQUNHLENBQUEsQ0FBRTtRQUFDLFNBQUEsRUFBVyw4QkFBWjtPQUFGLENBREgsR0FBQSxNQUZELEVBTkg7O0VBVk0sQ0FuQlI7Q0FGaUMsQ0FBcEI7O0FBMkNmLFFBQUEsR0FBVyxLQUFLLENBQUMsV0FBTixDQUVUO0VBQUEsV0FBQSxFQUFhLFVBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLFdBQUEsRUFBYSxLQUFiO01BQ0EsT0FBQSxFQUFTLElBRFQ7TUFFQSxPQUFBLEVBQVMsSUFGVDs7RUFEZSxDQUZqQjtFQU9BLElBQUEsRUFBTSxTQUFBO0FBQ0osUUFBQTtJQUFBLElBQUMsQ0FBQSxNQUFELENBQUE7SUFDQSxPQUFBLEdBQVUsVUFBQSxDQUFXLENBQUUsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQUcsS0FBQyxDQUFBLFFBQUQsQ0FBVTtVQUFDLFdBQUEsRUFBYSxLQUFkO1VBQXFCLE9BQUEsRUFBUyxLQUE5QjtTQUFWO01BQUg7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUYsQ0FBWCxFQUFrRSxHQUFsRTtXQUNWLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQyxPQUFBLEVBQVMsT0FBVjtLQUFWO0VBSEksQ0FQTjtFQVlBLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQVY7TUFDRSxZQUFBLENBQWEsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFwQixFQURGOztXQUVBLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQyxPQUFBLEVBQVMsSUFBVjtLQUFWO0VBSE0sQ0FaUjtFQWlCQSxVQUFBLEVBQVksU0FBQyxPQUFEO1dBQ1YsSUFBQyxDQUFBLFFBQUQsQ0FBVTtNQUFBLE9BQUEsRUFBUyxPQUFUO0tBQVY7RUFEVSxDQWpCWjtFQW9CQSxNQUFBLEVBQVEsU0FBQyxJQUFEO0FBQ04sUUFBQTtJQUFBLG1CQUFVLElBQUksQ0FBRSxjQUFoQjtBQUFBLGFBQUE7O0lBQ0EsU0FBQSxHQUFhLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQztJQUN4QixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUMsV0FBQSxFQUFhLFNBQWQ7S0FBVjtJQUNBLElBQUEsQ0FBYyxJQUFkO0FBQUEsYUFBQTs7K0NBQ0EsSUFBSSxDQUFDO0VBTEMsQ0FwQlI7RUEyQkEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsU0FBQSxHQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBVixHQUEyQixjQUEzQixHQUErQztJQUMzRCxNQUFBLEdBQVMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLElBQUQ7ZUFDTCxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxNQUFELENBQVEsSUFBUjtRQUFIO01BREs7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1dBRVIsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLE1BQVo7S0FBSixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxhQUFaO01BQTJCLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLE1BQUQsQ0FBUSxJQUFSO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBDO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxPQUFBLEVBQVMsS0FBVjtNQUFpQixLQUFBLEVBQU8sRUFBeEI7TUFBNEIsTUFBQSxFQUFRLEVBQXBDO01BQXdDLE9BQUEsRUFBUyxXQUFqRDtNQUE4RCxnQkFBQSxFQUFrQixlQUFoRjtLQUFKLEVBQ0UsQ0FBQSxDQUFFLEVBQUYsRUFDRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsQ0FBSjtNQUFPLEtBQUEsRUFBTyxFQUFkO01BQWtCLE1BQUEsRUFBUSxDQUExQjtLQUFMLENBREYsRUFFRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsQ0FBSjtNQUFPLEtBQUEsRUFBTyxFQUFkO01BQWtCLE1BQUEsRUFBUSxDQUExQjtLQUFMLENBRkYsRUFHRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsRUFBSjtNQUFRLEtBQUEsRUFBTyxFQUFmO01BQW1CLE1BQUEsRUFBUSxDQUEzQjtLQUFMLENBSEYsQ0FERixDQURGLENBREYsMkNBVWdCLENBQUUsZ0JBQWQsR0FBdUIsQ0FBMUIsR0FDRyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtNQUF1QixZQUFBLEVBQWMsSUFBQyxDQUFBLElBQXRDO01BQTRDLFlBQUEsRUFBYyxJQUFDLENBQUEsTUFBM0Q7S0FBSixFQUNFLEVBQUEsQ0FBRyxFQUFIOztBQUNDO0FBQUE7V0FBQSxzREFBQTs7cUJBQUMsWUFBQSxDQUFhO1VBQUMsR0FBQSxFQUFLLEtBQU47VUFBYSxJQUFBLEVBQU0sSUFBbkI7VUFBeUIsTUFBQSxFQUFRLElBQUMsQ0FBQSxNQUFsQztVQUEwQyxVQUFBLEVBQVksSUFBQyxDQUFBLFVBQXZEO1NBQWI7QUFBRDs7aUJBREQsQ0FERixFQUlJLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBVixHQUNHLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO01BQXVCLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUE3QztLQUFKLEVBQ0UsRUFBQSxDQUFHLEVBQUg7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFBQyxZQUFBLENBQWE7VUFBQyxHQUFBLEVBQUssS0FBTjtVQUFhLElBQUEsRUFBTSxJQUFuQjtVQUF5QixNQUFBLEVBQVEsSUFBQyxDQUFBLE1BQWxDO1NBQWI7QUFBRDs7aUJBREQsQ0FERixDQURILEdBQUEsTUFKRCxDQURILEdBQUEsTUFWRDtFQUpLLENBM0JSO0NBRlM7O0FBeURYLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3RHakIsSUFBQTs7QUFBQSxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxtQkFBUjs7QUFDakIsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxpQ0FBUixDQUFELENBQTJDLENBQUM7O0FBRTVELEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBRUwsTUFBcUMsS0FBSyxDQUFDLEdBQTNDLEVBQUMsVUFBQSxHQUFELEVBQU0sVUFBQSxHQUFOLEVBQVcsUUFBQSxDQUFYLEVBQWMsV0FBQSxJQUFkLEVBQW9CLFlBQUEsS0FBcEIsRUFBMkIsYUFBQTs7QUFFM0IsWUFBQSxHQUFlLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ2pDO0VBQUEsV0FBQSxFQUFhLGNBQWI7RUFFQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxTQUFELEdBQWE7RUFESyxDQUZwQjtFQUtBLFlBQUEsRUFBZSxTQUFDLENBQUQ7QUFDYixRQUFBO0lBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtJQUNBLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFDQSxHQUFBLEdBQU0sQ0FBSyxJQUFBLElBQUEsQ0FBQSxDQUFMLENBQVksQ0FBQyxPQUFiLENBQUE7SUFDTixJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUEzQjtJQUNBLElBQUcsR0FBQSxHQUFNLElBQUMsQ0FBQSxTQUFQLElBQW9CLEdBQXZCO01BQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFQLENBQUEsRUFERjs7V0FFQSxJQUFDLENBQUEsU0FBRCxHQUFhO0VBUEEsQ0FMZjtFQWNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVYsR0FBd0IsVUFBeEIsR0FBd0MsRUFBekMsQ0FBN0I7TUFBMkUsT0FBQSxFQUFTLElBQUMsQ0FBQSxZQUFyRjtLQUFKLEVBQ0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFWLENBQVk7TUFBQyxTQUFBLEVBQWMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsYUFBYSxDQUFDLE1BQXpDLEdBQXFELDhCQUFyRCxHQUF5RixlQUFyRztLQUFaLENBREYsRUFFQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUZqQjtFQURLLENBZFI7Q0FEaUMsQ0FBcEI7O0FBcUJmLFFBQUEsR0FBVyxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUM3QjtFQUFBLFdBQUEsRUFBYSxVQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxPQUFBLEVBQVMsSUFBVDs7RUFEZSxDQUZqQjtFQUtBLGlCQUFBLEVBQW1CLFNBQUE7V0FDakIsSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWI7RUFEaUIsQ0FMbkI7RUFRQSx5QkFBQSxFQUEyQixTQUFDLFNBQUQ7SUFDekIsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFzQixJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWhDO2FBQ0UsSUFBQyxDQUFBLElBQUQsQ0FBTSxTQUFTLENBQUMsTUFBaEIsRUFERjs7RUFEeUIsQ0FSM0I7RUFZQSxJQUFBLEVBQU0sU0FBQyxNQUFEO1dBQ0osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsQ0FBcUIsTUFBckIsRUFBNkIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO1FBQzNCLElBQXFCLEdBQXJCO0FBQUEsaUJBQU8sS0FBQSxDQUFNLEdBQU4sRUFBUDs7UUFDQSxLQUFDLENBQUEsUUFBRCxDQUNFO1VBQUEsT0FBQSxFQUFTLEtBQVQ7U0FERjtlQUVBLEtBQUMsQ0FBQSxLQUFLLENBQUMsVUFBUCxDQUFrQixJQUFsQjtNQUoyQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBN0I7RUFESSxDQVpOO0VBbUJBLGNBQUEsRUFBZ0IsU0FBQyxDQUFEO0FBQ2QsUUFBQTtXQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCwwQ0FBaUMsQ0FBRSxlQUFuQztFQURjLENBbkJoQjtFQXNCQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxJQUFBLEdBQU87SUFDUCxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBUCxLQUFtQixJQUF0QjtNQUNFLElBQUksQ0FBQyxJQUFMLENBQVcsR0FBQSxDQUFJO1FBQUMsR0FBQSxFQUFLLFFBQU47UUFBZ0IsT0FBQSxFQUFTLElBQUMsQ0FBQSxjQUExQjtPQUFKLEVBQWdELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBVixDQUFZO1FBQUMsU0FBQSxFQUFXLDRCQUFaO09BQVosQ0FBaEQsRUFBd0csZUFBeEcsQ0FBWCxFQURGOztBQUVBO0FBQUEsU0FBQSw4Q0FBQTs7TUFDRSxJQUFJLENBQUMsSUFBTCxDQUFXLFlBQUEsQ0FBYTtRQUFDLEdBQUEsRUFBSyxDQUFOO1FBQVMsUUFBQSxFQUFVLFFBQW5CO1FBQTZCLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsS0FBdUIsUUFBOUQ7UUFBd0UsWUFBQSxFQUFjLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBN0Y7UUFBMkcsYUFBQSxFQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsYUFBakk7T0FBYixDQUFYO0FBREY7V0FHQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFWLEdBQ0UsRUFBQSxDQUFHLHNCQUFILENBREYsR0FHRSxJQUpIO0VBUEssQ0F0QlI7Q0FENkIsQ0FBcEI7O0FBcUNYLGFBQUEsR0FBZ0IsS0FBSyxDQUFDLFdBQU4sQ0FDZDtFQUFBLFdBQUEsRUFBYSxlQUFiO0VBRUEsTUFBQSxFQUFRLENBQUMsY0FBRCxDQUZSO0VBSUEsZUFBQSxFQUFpQixTQUFBO0FBQ2YsUUFBQTtXQUFBLElBQUMsQ0FBQSxpQkFBRCwwREFBK0MsQ0FBRSxnQkFBOUIsSUFBd0MsSUFBM0Q7RUFEZSxDQUpqQjtFQU9BLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFkLEtBQXdCO0VBRGhCLENBUHBCO0VBVUEsZUFBQSxFQUFpQixTQUFDLENBQUQ7QUFDZixRQUFBO0lBQUEsUUFBQSxHQUFXLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDcEIsUUFBQSxHQUFXLElBQUMsQ0FBQSxZQUFELENBQWMsUUFBZCxFQUF3QixJQUFDLENBQUEsS0FBSyxDQUFDLElBQS9CO1dBQ1gsSUFBQyxDQUFBLFFBQUQsQ0FDRTtNQUFBLFFBQUEsRUFBVSxRQUFWO01BQ0EsUUFBQSxFQUFVLFFBRFY7S0FERjtFQUhlLENBVmpCO0VBaUJBLFVBQUEsRUFBWSxTQUFDLElBQUQ7V0FDVixJQUFDLENBQUEsUUFBRCxDQUNFO01BQUEsSUFBQSxFQUFNLElBQU47TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFlBQUQsQ0FBYyxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZCxDQUFkLEVBQXVDLElBQXZDLENBRFY7S0FERjtFQURVLENBakJaO0VBc0JBLGlCQUFBLEVBQW1CLFNBQUMsTUFBRDtBQUNqQixRQUFBO1dBQUE7TUFBQSxNQUFBLEVBQVEsTUFBUjtNQUNBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFEOUI7TUFFQSxRQUFBLDJEQUFzQyxDQUFFLGNBQTlCLElBQXNDLEVBRmhEO01BR0EsSUFBQSxFQUFNLEVBSE47O0VBRGlCLENBdEJuQjtFQTRCQSxZQUFBLEVBQWMsU0FBQyxRQUFEO0lBQ1osd0JBQUcsUUFBUSxDQUFFLGNBQVYsS0FBa0IsYUFBYSxDQUFDLE1BQW5DO2FBQ0UsSUFBQyxDQUFBLFFBQUQsQ0FBVSxJQUFDLENBQUEsaUJBQUQsQ0FBbUIsUUFBbkIsQ0FBVixFQURGO0tBQUEsTUFFSyx3QkFBRyxRQUFRLENBQUUsY0FBVixLQUFrQixhQUFhLENBQUMsSUFBbkM7YUFDSCxJQUFDLENBQUEsUUFBRCxDQUNFO1FBQUEsUUFBQSxFQUFVLFFBQVEsQ0FBQyxJQUFuQjtRQUNBLFFBQUEsRUFBVSxRQURWO09BREYsRUFERztLQUFBLE1BQUE7YUFLSCxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixJQUFuQixDQUFWLEVBTEc7O0VBSE8sQ0E1QmQ7RUFzQ0EsT0FBQSxFQUFTLFNBQUE7QUFDUCxRQUFBO0lBQUEsSUFBRyxDQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZDtNQUNFLFFBQUEsR0FBVyxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZDtNQUNYLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxHQUFrQixJQUFDLENBQUEsWUFBRCxDQUFjLFFBQWQsRUFBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUEvQjtNQUNsQixJQUFHLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFkO1FBQ0UsSUFBRyxJQUFDLENBQUEsTUFBSjtVQUNFLEtBQUEsQ0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVIsR0FBaUIsWUFBekIsRUFERjtTQUFBLE1BQUE7VUFHRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsR0FBc0IsSUFBQSxhQUFBLENBQ3BCO1lBQUEsSUFBQSxFQUFNLFFBQU47WUFDQSxJQUFBLEVBQU0sYUFBYSxDQUFDLElBRHBCO1lBRUEsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBUCxJQUFpQixJQUZ6QjtZQUdBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBSGpCO1dBRG9CLEVBSHhCO1NBREY7T0FIRjs7SUFZQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBVjtNQUVFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWhCLEdBQTJCLElBQUMsQ0FBQSxLQUFLLENBQUM7O1lBQ3JCLENBQUMsU0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDOzthQUMvQixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsQ0FBQSxFQUpGOztFQWJPLENBdENUO0VBeURBLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsSUFBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBMEIsYUFBYSxDQUFDLE1BQTVELElBQXVFLE9BQUEsQ0FBUSxFQUFBLENBQUcsNkJBQUgsRUFBa0M7TUFBQyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBM0I7S0FBbEMsQ0FBUixDQUExRTthQUNFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWhCLENBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBOUIsRUFBd0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQ7QUFDdEMsY0FBQTtVQUFBLElBQUcsQ0FBSSxHQUFQO1lBQ0UsSUFBQSxHQUFPLEtBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVosQ0FBa0IsQ0FBbEI7WUFDUCxLQUFBLEdBQVEsSUFBSSxDQUFDLE9BQUwsQ0FBYSxLQUFDLENBQUEsS0FBSyxDQUFDLFFBQXBCO1lBQ1IsSUFBSSxDQUFDLE1BQUwsQ0FBWSxLQUFaLEVBQW1CLENBQW5CO21CQUNBLEtBQUMsQ0FBQSxRQUFELENBQ0U7Y0FBQSxJQUFBLEVBQU0sSUFBTjtjQUNBLFFBQUEsRUFBVSxJQURWO2NBRUEsUUFBQSxFQUFVLEVBRlY7YUFERixFQUpGOztRQURzQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEMsRUFERjs7RUFETSxDQXpEUjtFQXFFQSxNQUFBLEVBQVEsU0FBQTtXQUNOLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxDQUFBO0VBRE0sQ0FyRVI7RUF3RUEsWUFBQSxFQUFjLFNBQUMsUUFBRCxFQUFXLElBQVg7QUFDWixRQUFBO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQWlCLFFBQXBCO0FBQ0UsZUFBTyxTQURUOztBQURGO1dBR0E7RUFKWSxDQXhFZDtFQThFQSxhQUFBLEVBQWUsU0FBQyxDQUFEO0lBQ2IsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWIsSUFBb0IsQ0FBSSxJQUFDLENBQUEsZUFBRCxDQUFBLENBQTNCO2FBQ0UsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQURGOztFQURhLENBOUVmO0VBa0ZBLGVBQUEsRUFBaUIsU0FBQTtXQUNmLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsS0FBMEIsQ0FBM0IsQ0FBQSxJQUFpQyxDQUFDLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhCO0VBRGxCLENBbEZqQjtFQXFGQSxvQkFBQSxFQUFzQixTQUFBO0FBQ3BCLFFBQUE7SUFBQSxlQUFBLEdBQWtCLElBQUMsQ0FBQSxlQUFELENBQUE7SUFDbEIsY0FBQSxHQUFpQixDQUFDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxLQUFtQixJQUFwQixDQUFBLElBQTZCLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsYUFBYSxDQUFDLE1BQXZDO1dBRTdDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxXQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxJQUFBLEVBQU0sTUFBUDtNQUFlLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQTdCO01BQXVDLFdBQUEsRUFBYyxFQUFBLENBQUcsdUJBQUgsQ0FBckQ7TUFBa0YsUUFBQSxFQUFVLElBQUMsQ0FBQSxlQUE3RjtNQUE4RyxTQUFBLEVBQVcsSUFBQyxDQUFBLGFBQTFIO0tBQU4sQ0FERixFQUVFLFFBQUEsQ0FBUztNQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWxCO01BQTRCLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQTNDO01BQW1ELFlBQUEsRUFBYyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhFO01BQWtGLFlBQUEsRUFBYyxJQUFDLENBQUEsWUFBakc7TUFBK0csYUFBQSxFQUFlLElBQUMsQ0FBQSxPQUEvSDtNQUF3SSxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFySjtNQUEySixVQUFBLEVBQVksSUFBQyxDQUFBLFVBQXhLO0tBQVQsQ0FGRixFQUdFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQUosRUFDRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE9BQVg7TUFBb0IsUUFBQSxFQUFVLGVBQTlCO01BQStDLFNBQUEsRUFBYyxlQUFILEdBQXdCLFVBQXhCLEdBQXdDLEVBQWxHO0tBQVAsRUFBaUgsSUFBQyxDQUFBLE1BQUosR0FBaUIsRUFBQSxDQUFHLG1CQUFILENBQWpCLEdBQStDLEVBQUEsQ0FBRyxtQkFBSCxDQUE3SixDQURGLEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBaEIsQ0FBb0IsUUFBcEIsQ0FBSCxHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsTUFBWDtNQUFtQixRQUFBLEVBQVUsY0FBN0I7TUFBNkMsU0FBQSxFQUFjLGNBQUgsR0FBdUIsVUFBdkIsR0FBdUMsRUFBL0Y7S0FBUCxFQUE0RyxFQUFBLENBQUcscUJBQUgsQ0FBNUcsQ0FESCxHQUFBLE1BRkQsRUFJRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE1BQVg7S0FBUCxFQUE0QixFQUFBLENBQUcscUJBQUgsQ0FBNUIsQ0FKRixDQUhGO0VBSm1CLENBckZ0QjtDQURjOztBQXFHaEIsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDdEtqQixJQUFBOztBQUFBLE1BQXdCLEtBQUssQ0FBQyxHQUE5QixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUEsQ0FBTixFQUFTLFdBQUEsSUFBVCxFQUFlLFlBQUE7O0FBRWYsUUFBQSxHQUFXLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxpQkFBUixDQUFwQjs7QUFFWCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLFNBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLGVBQUEsRUFBaUIsS0FBakI7TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQURqQjs7RUFEZSxDQUZqQjtFQU1BLHlCQUFBLEVBQTJCLFNBQUMsU0FBRDtXQUN6QixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLFNBQVMsQ0FBQyxRQUFwQjtLQUFWO0VBRHlCLENBTjNCO0VBU0EsZUFBQSxFQUFpQixTQUFDLENBQUQ7QUFDZixRQUFBO0lBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtJQUNBLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFDQSw2RkFBeUMsQ0FBRSxHQUF4QyxDQUE0QyxRQUE1QyxtQkFBSDtNQUNFLElBQUMsQ0FBQSxRQUFELENBQVU7UUFBQSxlQUFBLEVBQWlCLElBQWpCO09BQVY7YUFDQSxVQUFBLENBQVcsQ0FBQyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLGFBQUQsQ0FBQTtRQUFIO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFELENBQVgsRUFBa0MsRUFBbEMsRUFGRjtLQUFBLE1BQUE7YUFJRSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFkLENBQUEsRUFKRjs7RUFIZSxDQVRqQjtFQWtCQSxlQUFBLEVBQWlCLFNBQUE7V0FDZixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FBVyxDQUFDLEtBQXRCO0tBQVY7RUFEZSxDQWxCakI7RUFxQkEsZUFBQSxFQUFpQixTQUFBO1dBQ2YsSUFBQyxDQUFBLE1BQUQsQ0FBQTtFQURlLENBckJqQjtFQXdCQSxRQUFBLEVBQVUsU0FBQTtXQUNSLEtBQUssQ0FBQyxXQUFOLENBQWtCLElBQUMsQ0FBQSxJQUFJLENBQUMsUUFBeEI7RUFEUSxDQXhCVjtFQTJCQSxhQUFBLEVBQWUsU0FBQTtBQUNiLFFBQUE7SUFBQSxFQUFBLEdBQUssSUFBQyxDQUFBLFFBQUQsQ0FBQTtJQUNMLEVBQUUsQ0FBQyxLQUFILENBQUE7SUFDQSxJQUFHLE9BQU8sRUFBRSxDQUFDLGNBQVYsS0FBNEIsUUFBL0I7YUFDRSxFQUFFLENBQUMsY0FBSCxHQUFvQixFQUFFLENBQUMsWUFBSCxHQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDLE9BRGpEO0tBQUEsTUFFSyxJQUFHLE9BQU8sRUFBRSxDQUFDLGVBQVYsS0FBK0IsV0FBbEM7TUFDSCxLQUFBLEdBQVEsRUFBRSxDQUFDLGVBQUgsQ0FBQTtNQUNSLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBZjthQUNBLEtBQUssQ0FBQyxNQUFOLENBQUEsRUFIRzs7RUFMUSxDQTNCZjtFQXFDQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxRQUFBLEdBQVcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBaEIsQ0FBd0IsV0FBeEIsRUFBcUMsRUFBckM7SUFDWCxJQUFHLFFBQVEsQ0FBQyxNQUFULEdBQWtCLENBQXJCO01BQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBZCxDQUFxQixJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBekMsRUFBbUQsUUFBbkQsRUFERjs7V0FFQSxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsZUFBQSxFQUFpQixLQUFqQjtLQUFWO0VBSk0sQ0FyQ1I7RUEyQ0EsYUFBQSxFQUFlLFNBQUMsQ0FBRDtJQUNiLElBQUcsQ0FBQyxDQUFDLE9BQUYsS0FBYSxFQUFoQjthQUNFLElBQUMsQ0FBQSxNQUFELENBQUEsRUFERjtLQUFBLE1BRUssSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO2FBQ0gsSUFBQyxDQUFBLFFBQUQsQ0FDRTtRQUFBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWpCO1FBQ0EsZUFBQSxFQUFpQixLQURqQjtPQURGLEVBREc7O0VBSFEsQ0EzQ2Y7RUFtREEsSUFBQSxFQUFNLFNBQUE7V0FDSixNQUFNLENBQUMsSUFBUCxDQUFZLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQTNCLEVBQWlDLFFBQWpDO0VBREksQ0FuRE47RUFzREEsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUNFLFFBQUEsQ0FBUztNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7S0FBVCxDQURGLEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUFWLEdBQ0csR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFVLDJCQUFYO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssVUFBTjtNQUFrQixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFoQztNQUEwQyxRQUFBLEVBQVUsSUFBQyxDQUFBLGVBQXJEO01BQXNFLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFBL0U7TUFBZ0csU0FBQSxFQUFXLElBQUMsQ0FBQSxhQUE1RztLQUFOLENBREYsQ0FESCxHQUtHLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVSwyQkFBWDtNQUF3QyxPQUFBLEVBQVMsSUFBQyxDQUFBLGVBQWxEO0tBQUosRUFBd0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUEvRSxDQVBKLEVBUUksSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFWLEdBQ0csSUFBQSxDQUFLO01BQUMsU0FBQSxFQUFXLHVCQUFBLEdBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQXREO0tBQUwsRUFBb0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBdEYsQ0FESCxHQUFBLE1BUkQsQ0FERixFQVlFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxnQkFBWjtLQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBbEIsR0FDRyxJQUFBLENBQUs7TUFBQyxTQUFBLEVBQVcsZUFBWjtLQUFMLEVBQW1DLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQWxELENBREgsR0FBQSxNQURELEVBR0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLElBQW9CLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQWhCLENBQUEsQ0FBdkIsR0FDRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFoQixDQUFBLENBREYsR0FBQSxNQUhELEVBS0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBbEIsR0FDRyxDQUFBLENBQUU7TUFBQyxLQUFBLEVBQU87UUFBQyxRQUFBLEVBQVUsTUFBWDtPQUFSO01BQTRCLFNBQUEsRUFBVyxxQkFBdkM7TUFBOEQsT0FBQSxFQUFTLElBQUMsQ0FBQSxJQUF4RTtLQUFGLENBREgsR0FBQSxNQUxELENBWkY7RUFESyxDQXREUjtDQUZlOzs7OztBQ0pqQixJQUFBOztBQUFBLEtBQUEsR0FBUSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsY0FBUixDQUFwQjs7QUFDUixNQUFXLEtBQUssQ0FBQyxHQUFqQixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUE7O0FBRU4sTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxhQUFiO0VBRUEsS0FBQSxFQUFPLFNBQUE7QUFDTCxRQUFBO2lFQUFNLENBQUM7RUFERixDQUZQO0VBS0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxLQUFBLENBQU07TUFBQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFmO0tBQU4sRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsY0FBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHNCQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsb0JBQVo7S0FBSixFQUNFLENBQUEsQ0FBRTtNQUFDLFNBQUEsRUFBVyxrQ0FBWjtNQUFnRCxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQTFEO0tBQUYsQ0FERixFQUVDLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxJQUFnQixpQkFGakIsQ0FERixFQUtFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx3QkFBWjtLQUFKLEVBQTJDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBbEQsQ0FMRixDQURGLENBREY7RUFESyxDQUxSO0NBRmU7Ozs7O0FDSGpCLElBQUE7O0FBQUEsV0FBQSxHQUFjLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxxQkFBUixDQUFwQjs7QUFDZCxXQUFBLEdBQWMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCOztBQUVkLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsdUJBQWI7RUFFQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7TUFBc0IsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBcEM7S0FBWixFQUNFLFdBQUEsQ0FBWTtNQUFDLElBQUEsRUFBTSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQWQ7TUFBb0IsZ0JBQUEsRUFBa0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBN0M7S0FBWixDQURGO0VBREssQ0FGUjtDQUZlOzs7OztBQ0hqQixJQUFBOztBQUFDLE1BQU8sS0FBSyxDQUFDLElBQWI7O0FBRUQsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxPQUFiO0VBRUEsY0FBQSxFQUFnQixTQUFDLENBQUQ7QUFDZCxRQUFBO0lBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO21FQUNRLENBQUMsaUJBRFQ7O0VBRGMsQ0FGaEI7RUFNQSxpQkFBQSxFQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixJQUFDLENBQUEsY0FBdkI7RUFEaUIsQ0FObkI7RUFTQSxvQkFBQSxFQUFzQixTQUFBO1dBQ3BCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxHQUFWLENBQWMsT0FBZCxFQUF1QixJQUFDLENBQUEsY0FBeEI7RUFEb0IsQ0FUdEI7RUFZQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxPQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsa0JBQVo7S0FBSixDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUFrQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpDLENBRkY7RUFESyxDQVpSO0NBRmU7Ozs7O0FDRmpCLElBQUE7O0FBQUEsaUJBQUEsR0FBb0IsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLDRCQUFSLENBQXBCOztBQUNwQixXQUFBLEdBQWMsT0FBQSxDQUFRLHFCQUFSOztBQUNkLGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsaUNBQVIsQ0FBRCxDQUEyQyxDQUFDOztBQUM1RCxhQUFBLEdBQWdCLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSx3QkFBUixDQUFwQjs7QUFDaEIsdUJBQUEsR0FBMEIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLG1DQUFSLENBQXBCOztBQUUxQixFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBQ2Y7RUFBQSxXQUFBLEVBQWEsc0JBQWI7RUFFQSxNQUFBLEVBQVMsU0FBQTtBQUNQLFFBQUE7SUFBQTtBQUE2QixjQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQXJCO0FBQUEsYUFDdEIsVUFEc0I7aUJBQ04sQ0FBQyxNQUFELEVBQVMsYUFBVDtBQURNLGFBRXRCLFVBRnNCO0FBQUEsYUFFVixZQUZVO2lCQUVRLENBQUMsTUFBRCxFQUFTLGFBQVQ7QUFGUixhQUd0QixjQUhzQjtBQUFBLGFBR04sY0FITTtpQkFHYyxDQUFDLE1BQUQsRUFBUyxhQUFUO0FBSGQsYUFJdEIsWUFKc0I7QUFBQSxhQUlSLFlBSlE7aUJBSVUsQ0FBQyxNQUFELEVBQVMsYUFBVDtBQUpWLGFBS3RCLGdCQUxzQjtpQkFLQSxDQUFDLElBQUQsRUFBTyx1QkFBUDtBQUxBO2lCQUE3QixFQUFDLG1CQUFELEVBQWE7SUFPYixJQUFBLEdBQU87SUFDUCxnQkFBQSxHQUFtQjtBQUNuQjtBQUFBLFNBQUEsOENBQUE7O01BQ0UsSUFBRyxDQUFJLFVBQUosSUFBa0IsUUFBUSxDQUFDLFlBQWEsQ0FBQSxVQUFBLENBQTNDO1FBQ0UsU0FBQSxHQUFZLFlBQUEsQ0FDVjtVQUFBLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWY7VUFDQSxNQUFBLEVBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQURmO1VBRUEsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FGZDtVQUdBLFFBQUEsRUFBVSxRQUhWO1NBRFU7UUFLWixJQUFJLENBQUMsSUFBTCxDQUFVLFdBQVcsQ0FBQyxHQUFaLENBQWdCO1VBQUMsR0FBQSxFQUFLLENBQU47VUFBUyxLQUFBLEVBQVEsRUFBQSxDQUFHLFFBQVEsQ0FBQyxXQUFaLENBQWpCO1VBQTJDLFNBQUEsRUFBVyxTQUF0RDtTQUFoQixDQUFWO1FBQ0EsSUFBRyxRQUFRLENBQUMsSUFBVCwrRkFBdUQsQ0FBRSx1QkFBNUQ7VUFDRSxnQkFBQSxHQUFtQixJQUFJLENBQUMsTUFBTCxHQUFjLEVBRG5DO1NBUEY7O0FBREY7V0FXQyxpQkFBQSxDQUFrQjtNQUFDLEtBQUEsRUFBUSxFQUFBLENBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBakIsQ0FBVDtNQUFrQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFoRDtNQUF1RCxJQUFBLEVBQU0sSUFBN0Q7TUFBbUUsZ0JBQUEsRUFBa0IsZ0JBQXJGO0tBQWxCO0VBckJNLENBRlQ7Q0FEZTs7Ozs7QUNSakIsSUFBQTs7QUFBQSxNQUEwQixLQUFLLENBQUMsR0FBaEMsRUFBQyxVQUFBLEdBQUQsRUFBTSxZQUFBLEtBQU4sRUFBYSxRQUFBLENBQWIsRUFBZ0IsYUFBQTs7QUFFaEIsV0FBQSxHQUFjLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxxQkFBUixDQUFwQjs7QUFFZCxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsa0JBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7QUFDZixRQUFBO0lBQUEsUUFBQSxHQUFXLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxJQUFtQjtXQUM5QixLQUFBLEdBQ0U7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLGVBQUEsRUFBaUIsSUFBQyxDQUFBLElBQUQsQ0FBTSxRQUFOLENBRGpCOztFQUhhLENBRmpCO0VBUUEsaUJBQUEsRUFBbUIsU0FBQTtJQUNqQixJQUFDLENBQUEsUUFBRCxHQUFZLEtBQUssQ0FBQyxXQUFOLENBQWtCLElBQUMsQ0FBQSxJQUFJLENBQUMsUUFBeEI7V0FDWixJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsQ0FBQTtFQUZpQixDQVJuQjtFQVlBLGNBQUEsRUFBZ0IsU0FBQTtBQUNkLFFBQUE7SUFBQSxRQUFBLEdBQVcsSUFBQyxDQUFBLFFBQVEsQ0FBQztXQUNyQixJQUFDLENBQUEsUUFBRCxDQUNFO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxlQUFBLEVBQWlCLElBQUMsQ0FBQSxJQUFELENBQU0sUUFBTixDQURqQjtLQURGO0VBRmMsQ0FaaEI7RUFrQkEsSUFBQSxFQUFNLFNBQUMsQ0FBRDtXQUNKLENBQUMsQ0FBQyxPQUFGLENBQVUsV0FBVixFQUF1QixFQUF2QjtFQURJLENBbEJOO0VBcUJBLE1BQUEsRUFBUSxTQUFDLENBQUQ7QUFDTixRQUFBO0lBQUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUF2QixHQUFnQyxDQUFuQzs7WUFDUSxDQUFDLFNBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQzs7YUFDeEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUEsRUFGRjtLQUFBLE1BQUE7TUFJRSxDQUFDLENBQUMsY0FBRixDQUFBO2FBQ0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUEsRUFMRjs7RUFETSxDQXJCUjtFQTZCQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBUSxFQUFBLENBQUcsZ0JBQUgsQ0FBVDtNQUErQixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUE3QztLQUFaLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUNFLEtBQUEsQ0FBTTtNQUFDLEdBQUEsRUFBSyxVQUFOO01BQWtCLFdBQUEsRUFBYSxVQUEvQjtNQUEyQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUF6RDtNQUFtRSxRQUFBLEVBQVUsSUFBQyxDQUFBLGNBQTlFO0tBQU4sQ0FERixFQUVFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQUosRUFDRSxNQUFBLENBQU87TUFBQyxTQUFBLEVBQVcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUF2QixLQUFpQyxDQUFwQyxHQUEyQyxVQUEzQyxHQUEyRCxFQUE1RCxDQUFaO01BQTZFLE9BQUEsRUFBUyxJQUFDLENBQUEsTUFBdkY7S0FBUCxFQUF1RyxFQUFBLENBQUcsdUJBQUgsQ0FBdkcsQ0FERixFQUVFLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWpCO0tBQVAsRUFBZ0MsRUFBQSxDQUFHLHVCQUFILENBQWhDLENBRkYsQ0FGRixDQURGO0VBREssQ0E3QlI7Q0FGZTs7Ozs7QUNOakIsSUFBQTs7QUFBQyxNQUFPLEtBQUssQ0FBQyxJQUFiOztBQUVELHVCQUFBLEdBQTBCLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQzVDO0VBQUEsV0FBQSxFQUFhLHlCQUFiO0VBQ0EsTUFBQSxFQUFRLFNBQUE7V0FBSSxHQUFBLENBQUksRUFBSixFQUFRLGlDQUFBLEdBQWtDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQTFEO0VBQUosQ0FEUjtDQUQ0QyxDQUFwQjs7QUFJMUIsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDTmpCLElBQUE7O0FBQUEsTUFBMEIsS0FBSyxDQUFDLEdBQWhDLEVBQUMsVUFBQSxHQUFELEVBQU0sWUFBQSxLQUFOLEVBQWEsUUFBQSxDQUFiLEVBQWdCLGFBQUE7O0FBRWhCLFdBQUEsR0FBYyxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEI7O0FBRWQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLG9CQUFiO0VBRUEsaUJBQUEsRUFBbUIsU0FBQTtBQUNqQixRQUFBO21FQUE0QixDQUFFLE1BQTlCLENBQUE7RUFEaUIsQ0FGbkI7RUFLQSxJQUFBLEVBQU0sU0FBQTtXQUNKLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFuQjtFQURJLENBTE47RUFTQSxJQUFBLEVBQU0sU0FBQTtBQUNKLFFBQUE7SUFBQSxNQUFBLEdBQVM7QUFDVDtNQUNFLElBQUEsR0FBTyxRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QjtNQUNQLElBQUksQ0FBQyxTQUFMLEdBQWlCLElBQUMsQ0FBQSxLQUFLLENBQUM7TUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLElBQTFCO01BRUEsU0FBQSxHQUFZLFFBQVEsQ0FBQyxZQUFULENBQUE7TUFDWixTQUFTLENBQUMsZUFBVixDQUFBO01BRUEsS0FBQSxHQUFRLFFBQVEsQ0FBQyxXQUFULENBQUE7TUFDUixLQUFLLENBQUMsVUFBTixDQUFpQixJQUFqQjtNQUNBLFNBQVMsQ0FBQyxRQUFWLENBQW1CLEtBQW5CO2FBRUEsTUFBQSxHQUFTLFFBQVEsQ0FBQyxXQUFULENBQXFCLE1BQXJCLEVBWlg7S0FBQSxhQUFBO0FBY0U7ZUFDRSxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQXJCLENBQTZCLE1BQTdCLEVBQXFDLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBNUMsRUFERjtPQUFBLGNBQUE7ZUFHRSxNQUFBLEdBQVMsTUFIWDtPQWRGO0tBQUE7TUFtQkUsSUFBRyxTQUFIO1FBQ0UsSUFBRyxPQUFPLFNBQVMsQ0FBQyxXQUFqQixLQUFnQyxVQUFuQztVQUNFLFNBQVMsQ0FBQyxXQUFWLENBQXNCLEtBQXRCLEVBREY7U0FBQSxNQUFBO1VBR0UsU0FBUyxDQUFDLGVBQVYsQ0FBQSxFQUhGO1NBREY7O01BS0EsSUFBRyxJQUFIO1FBQ0UsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLElBQTFCLEVBREY7O01BRUEsS0FBQSxDQUFNLEVBQUEsQ0FBRyxDQUFJLE1BQUgsR0FBZSw0QkFBZixHQUFpRCwwQkFBbEQsQ0FBSCxDQUFOLEVBMUJGOztFQUZJLENBVE47RUF1Q0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxXQUFBLENBQVk7TUFBQyxLQUFBLEVBQVEsRUFBQSxDQUFHLGdCQUFILENBQVQ7TUFBK0IsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBN0M7S0FBWixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxjQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssS0FBTjtNQUFhLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQTNCO01BQWdDLFFBQUEsRUFBVSxJQUExQztLQUFOLENBREYsRUFFRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtLQUFKLEVBQ0ksUUFBUSxDQUFDLFdBQVQsSUFBd0IsTUFBTSxDQUFDLGFBQWxDLEdBQ0csTUFBQSxDQUFPO01BQUMsT0FBQSxFQUFTLElBQUMsQ0FBQSxJQUFYO0tBQVAsRUFBeUIsRUFBQSxDQUFHLG9CQUFILENBQXpCLENBREgsR0FBQSxNQURELEVBR0UsTUFBQSxDQUFPO01BQUMsT0FBQSxFQUFTLElBQUMsQ0FBQSxJQUFYO0tBQVAsRUFBeUIsRUFBQSxDQUFHLG9CQUFILENBQXpCLENBSEYsRUFJRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFqQjtLQUFQLEVBQWdDLEVBQUEsQ0FBRyxxQkFBSCxDQUFoQyxDQUpGLENBRkYsQ0FERjtFQURLLENBdkNSO0NBRmU7Ozs7O0FDTmpCLElBQUE7O0FBQUEsTUFBbUIsS0FBSyxDQUFDLEdBQXpCLEVBQUMsVUFBQSxHQUFELEVBQU0sU0FBQSxFQUFOLEVBQVUsU0FBQSxFQUFWLEVBQWMsUUFBQTs7QUFFUjtFQUNTLGlCQUFDLFFBQUQ7O01BQUMsV0FBUzs7SUFDcEIsSUFBQyxDQUFBLGlCQUFBLEtBQUYsRUFBUyxJQUFDLENBQUEscUJBQUE7RUFEQzs7Ozs7O0FBR2YsR0FBQSxHQUFNLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBRXhCO0VBQUEsV0FBQSxFQUFhLGdCQUFiO0VBRUEsT0FBQSxFQUFTLFNBQUMsQ0FBRDtJQUNQLENBQUMsQ0FBQyxjQUFGLENBQUE7V0FDQSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVAsQ0FBa0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUF6QjtFQUZPLENBRlQ7RUFNQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxTQUFBLEdBQWUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFWLEdBQXdCLGNBQXhCLEdBQTRDO1dBQ3ZELEVBQUEsQ0FBRztNQUFDLFNBQUEsRUFBVyxTQUFaO01BQXVCLE9BQUEsRUFBUyxJQUFDLENBQUEsT0FBakM7S0FBSCxFQUE4QyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQXJEO0VBRkssQ0FOUjtDQUZ3QixDQUFwQjs7QUFZTixNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLGlCQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxnQkFBQSxFQUFrQixJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFQLElBQTJCLENBQTdDOztFQURlLENBRmpCO0VBS0EsT0FBQSxFQUNFO0lBQUEsR0FBQSxFQUFLLFNBQUMsUUFBRDthQUFrQixJQUFBLE9BQUEsQ0FBUSxRQUFSO0lBQWxCLENBQUw7R0FORjtFQVFBLFdBQUEsRUFBYSxTQUFDLEtBQUQ7V0FDWCxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsZ0JBQUEsRUFBa0IsS0FBbEI7S0FBVjtFQURXLENBUmI7RUFXQSxTQUFBLEVBQVcsU0FBQyxHQUFELEVBQU0sS0FBTjtXQUNSLEdBQUEsQ0FDQztNQUFBLEtBQUEsRUFBTyxHQUFHLENBQUMsS0FBWDtNQUNBLEdBQUEsRUFBSyxLQURMO01BRUEsS0FBQSxFQUFPLEtBRlA7TUFHQSxRQUFBLEVBQVcsS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBSDNCO01BSUEsVUFBQSxFQUFZLElBQUMsQ0FBQSxXQUpiO0tBREQ7RUFEUSxDQVhYO0VBb0JBLFVBQUEsRUFBWSxTQUFBO0FBQ1YsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxnQkFBWjtLQUFKOztBQUNFO0FBQUE7V0FBQSxzREFBQTs7cUJBQUEsRUFBQSxDQUFHO1VBQUMsR0FBQSxFQUFLLEtBQU47U0FBSCxFQUFpQixJQUFDLENBQUEsU0FBRCxDQUFXLEdBQVgsRUFBZ0IsS0FBaEIsQ0FBakI7QUFBQTs7aUJBREY7RUFEUyxDQXBCWjtFQXlCQSxtQkFBQSxFQUFxQixTQUFBO0FBQ25CLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcseUJBQVo7S0FBSjs7QUFDQztBQUFBO1dBQUEsc0RBQUE7O3FCQUNHLEdBQUEsQ0FBSTtVQUNILEdBQUEsRUFBSyxLQURGO1VBRUgsS0FBQSxFQUNFO1lBQUEsT0FBQSxFQUFZLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFuQixHQUF5QyxPQUF6QyxHQUFzRCxNQUEvRDtXQUhDO1NBQUosRUFLQyxHQUFHLENBQUMsU0FMTDtBQURIOztpQkFERDtFQURrQixDQXpCckI7RUFxQ0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxjQUE3QjtLQUFKLEVBQ0MsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbmdldFF1ZXJ5UGFyYW0gPSByZXF1aXJlICcuL3V0aWxzL2dldC1xdWVyeS1wYXJhbSdcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgIyBzaW5jZSB0aGUgbW9kdWxlIGV4cG9ydHMgYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIHdlIG5lZWQgdG8gZmFrZSBhIGNsYXNzIHZhcmlhYmxlIGFzIGFuIGluc3RhbmNlIHZhcmlhYmxlXHJcbiAgICBARGVmYXVsdE1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAaW5pdCBAYXBwT3B0aW9ucywgdHJ1ZVxyXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xyXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxyXG5cclxuICBjbGllbnRDb25uZWN0OiAoZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxyXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXHJcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXHJcbiAgICBAY2xpZW50LmNvbm5lY3QoKVxyXG5cclxuICAgIG9wZW5TaGFyZWRDb250ZW50SWQgPSBnZXRRdWVyeVBhcmFtIFwib3BlblNoYXJlZFwiXHJcbiAgICBvcGVuU2F2ZWRQYXJhbXMgPSBnZXRRdWVyeVBhcmFtIFwib3BlblNhdmVkXCJcclxuICAgIGlmIG9wZW5TaGFyZWRDb250ZW50SWRcclxuICAgICAgQGNsaWVudC5vcGVuU2hhcmVkQ29udGVudCBvcGVuU2hhcmVkQ29udGVudElkXHJcbiAgICBlbHNlIGlmIG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgICBAY2xpZW50Lm9wZW5TYXZlZCBvcGVuU2F2ZWRQYXJhbXNcclxuXHJcbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cclxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYW5jaG9yKVxyXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXHJcblxyXG4gIF9yZW5kZXJBcHA6IChhbmNob3IpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XHJcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxyXG4iLCIvLyBTZWU6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC93aWtpL0FQSVxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9ETVAoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW10sXG4gICAgICBjaGFuZ2UsXG4gICAgICBvcGVyYXRpb247XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgb3BlcmF0aW9uID0gMTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3BlcmF0aW9uID0gMDtcbiAgICB9XG5cbiAgICByZXQucHVzaChbb3BlcmF0aW9uLCBjaGFuZ2UudmFsdWVdKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9YTUwoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8aW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8ZGVsPicpO1xuICAgIH1cblxuICAgIHJldC5wdXNoKGVzY2FwZUhUTUwoY2hhbmdlLnZhbHVlKSk7XG5cbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPC9pbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzwvZGVsPicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHMpIHtcbiAgbGV0IG4gPSBzO1xuICBuID0gbi5yZXBsYWNlKC8mL2csICcmYW1wOycpO1xuICBuID0gbi5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuXG4gIHJldHVybiBuO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGlmZigpIHt9XG5cbkRpZmYucHJvdG90eXBlID0ge1xuICBkaWZmKG9sZFN0cmluZywgbmV3U3RyaW5nLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY2FsbGJhY2sgPSBvcHRpb25zLmNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gZG9uZSh2YWx1ZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKHVuZGVmaW5lZCwgdmFsdWUpOyB9LCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgc3ViY2xhc3NlcyB0byBtYXNzYWdlIHRoZSBpbnB1dCBwcmlvciB0byBydW5uaW5nXG4gICAgb2xkU3RyaW5nID0gdGhpcy5jYXN0SW5wdXQob2xkU3RyaW5nKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChuZXdTdHJpbmcpO1xuXG4gICAgb2xkU3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG9sZFN0cmluZykpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShuZXdTdHJpbmcpKTtcblxuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLCBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoO1xuICAgIGxldCBlZGl0TGVuZ3RoID0gMTtcbiAgICBsZXQgbWF4RWRpdExlbmd0aCA9IG5ld0xlbiArIG9sZExlbjtcbiAgICBsZXQgYmVzdFBhdGggPSBbeyBuZXdQb3M6IC0xLCBjb21wb25lbnRzOiBbXSB9XTtcblxuICAgIC8vIFNlZWQgZWRpdExlbmd0aCA9IDAsIGkuZS4gdGhlIGNvbnRlbnQgc3RhcnRzIHdpdGggdGhlIHNhbWUgdmFsdWVzXG4gICAgbGV0IG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuICAgIGlmIChiZXN0UGF0aFswXS5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgLy8gSWRlbnRpdHkgcGVyIHRoZSBlcXVhbGl0eSBhbmQgdG9rZW5pemVyXG4gICAgICByZXR1cm4gZG9uZShbe3ZhbHVlOiBuZXdTdHJpbmcuam9pbignJyksIGNvdW50OiBuZXdTdHJpbmcubGVuZ3RofV0pO1xuICAgIH1cblxuICAgIC8vIE1haW4gd29ya2VyIG1ldGhvZC4gY2hlY2tzIGFsbCBwZXJtdXRhdGlvbnMgb2YgYSBnaXZlbiBlZGl0IGxlbmd0aCBmb3IgYWNjZXB0YW5jZS5cbiAgICBmdW5jdGlvbiBleGVjRWRpdExlbmd0aCgpIHtcbiAgICAgIGZvciAobGV0IGRpYWdvbmFsUGF0aCA9IC0xICogZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoIDw9IGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCArPSAyKSB7XG4gICAgICAgIGxldCBiYXNlUGF0aDtcbiAgICAgICAgbGV0IGFkZFBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSxcbiAgICAgICAgICAgIHJlbW92ZVBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggKyAxXSxcbiAgICAgICAgICAgIG9sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgaWYgKGFkZFBhdGgpIHtcbiAgICAgICAgICAvLyBObyBvbmUgZWxzZSBpcyBnb2luZyB0byBhdHRlbXB0IHRvIHVzZSB0aGlzIHZhbHVlLCBjbGVhciBpdFxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MgKyAxIDwgbmV3TGVuLFxuICAgICAgICAgICAgY2FuUmVtb3ZlID0gcmVtb3ZlUGF0aCAmJiAwIDw9IG9sZFBvcyAmJiBvbGRQb3MgPCBvbGRMZW47XG4gICAgICAgIGlmICghY2FuQWRkICYmICFjYW5SZW1vdmUpIHtcbiAgICAgICAgICAvLyBJZiB0aGlzIHBhdGggaXMgYSB0ZXJtaW5hbCB0aGVuIHBydW5lXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgZGlhZ29uYWwgdGhhdCB3ZSB3YW50IHRvIGJyYW5jaCBmcm9tLiBXZSBzZWxlY3QgdGhlIHByaW9yXG4gICAgICAgIC8vIHBhdGggd2hvc2UgcG9zaXRpb24gaW4gdGhlIG5ldyBzdHJpbmcgaXMgdGhlIGZhcnRoZXN0IGZyb20gdGhlIG9yaWdpblxuICAgICAgICAvLyBhbmQgZG9lcyBub3QgcGFzcyB0aGUgYm91bmRzIG9mIHRoZSBkaWZmIGdyYXBoXG4gICAgICAgIGlmICghY2FuQWRkIHx8IChjYW5SZW1vdmUgJiYgYWRkUGF0aC5uZXdQb3MgPCByZW1vdmVQYXRoLm5ld1BvcykpIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGNsb25lUGF0aChyZW1vdmVQYXRoKTtcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGFkZFBhdGg7ICAgLy8gTm8gbmVlZCB0byBjbG9uZSwgd2UndmUgcHVsbGVkIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICBiYXNlUGF0aC5uZXdQb3MrKztcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdHJ1ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9sZFBvcyA9IHNlbGYuZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCk7XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBoaXQgdGhlIGVuZCBvZiBib3RoIHN0cmluZ3MsIHRoZW4gd2UgYXJlIGRvbmVcbiAgICAgICAgaWYgKGJhc2VQYXRoLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoYnVpbGRWYWx1ZXMoc2VsZiwgYmFzZVBhdGguY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHNlbGYudXNlTG9uZ2VzdFRva2VuKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRyYWNrIHRoaXMgcGF0aCBhcyBhIHBvdGVudGlhbCBjYW5kaWRhdGUgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSBiYXNlUGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlZGl0TGVuZ3RoKys7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybXMgdGhlIGxlbmd0aCBvZiBlZGl0IGl0ZXJhdGlvbi4gSXMgYSBiaXQgZnVnbHkgYXMgdGhpcyBoYXMgdG8gc3VwcG9ydCB0aGVcbiAgICAvLyBzeW5jIGFuZCBhc3luYyBtb2RlIHdoaWNoIGlzIG5ldmVyIGZ1bi4gTG9vcHMgb3ZlciBleGVjRWRpdExlbmd0aCB1bnRpbCBhIHZhbHVlXG4gICAgLy8gaXMgcHJvZHVjZWQuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAoZnVuY3Rpb24gZXhlYygpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBUaGlzIHNob3VsZCBub3QgaGFwcGVuLCBidXQgd2Ugd2FudCB0byBiZSBzYWZlLlxuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgaWYgKGVkaXRMZW5ndGggPiBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWV4ZWNFZGl0TGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIGV4ZWMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKGVkaXRMZW5ndGggPD0gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICBsZXQgcmV0ID0gZXhlY0VkaXRMZW5ndGgoKTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgcHVzaENvbXBvbmVudChjb21wb25lbnRzLCBhZGRlZCwgcmVtb3ZlZCkge1xuICAgIGxldCBsYXN0ID0gY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0ICYmIGxhc3QuYWRkZWQgPT09IGFkZGVkICYmIGxhc3QucmVtb3ZlZCA9PT0gcmVtb3ZlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBjbG9uZSBoZXJlIGFzIHRoZSBjb21wb25lbnQgY2xvbmUgb3BlcmF0aW9uIGlzIGp1c3RcbiAgICAgIC8vIGFzIHNoYWxsb3cgYXJyYXkgY2xvbmVcbiAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXSA9IHtjb3VudDogbGFzdC5jb3VudCArIDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzLnB1c2goe2NvdW50OiAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfSk7XG4gICAgfVxuICB9LFxuICBleHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsXG4gICAgICAgIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGgsXG4gICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgb2xkUG9zID0gbmV3UG9zIC0gZGlhZ29uYWxQYXRoLFxuXG4gICAgICAgIGNvbW1vbkNvdW50ID0gMDtcbiAgICB3aGlsZSAobmV3UG9zICsgMSA8IG5ld0xlbiAmJiBvbGRQb3MgKyAxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MgKyAxXSwgb2xkU3RyaW5nW29sZFBvcyArIDFdKSkge1xuICAgICAgbmV3UG9zKys7XG4gICAgICBvbGRQb3MrKztcbiAgICAgIGNvbW1vbkNvdW50Kys7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkNvdW50KSB7XG4gICAgICBiYXNlUGF0aC5jb21wb25lbnRzLnB1c2goe2NvdW50OiBjb21tb25Db3VudH0pO1xuICAgIH1cblxuICAgIGJhc2VQYXRoLm5ld1BvcyA9IG5ld1BvcztcbiAgICByZXR1cm4gb2xkUG9zO1xuICB9LFxuXG4gIGVxdWFscyhsZWZ0LCByaWdodCkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgfSxcbiAgcmVtb3ZlRW1wdHkoYXJyYXkpIHtcbiAgICBsZXQgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycmF5W2ldKSB7XG4gICAgICAgIHJldC5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgY2FzdElucHV0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICB0b2tlbml6ZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zcGxpdCgnJyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJ1aWxkVmFsdWVzKGRpZmYsIGNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCB1c2VMb25nZXN0VG9rZW4pIHtcbiAgbGV0IGNvbXBvbmVudFBvcyA9IDAsXG4gICAgICBjb21wb25lbnRMZW4gPSBjb21wb25lbnRzLmxlbmd0aCxcbiAgICAgIG5ld1BvcyA9IDAsXG4gICAgICBvbGRQb3MgPSAwO1xuXG4gIGZvciAoOyBjb21wb25lbnRQb3MgPCBjb21wb25lbnRMZW47IGNvbXBvbmVudFBvcysrKSB7XG4gICAgbGV0IGNvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICBpZiAoIWNvbXBvbmVudC5yZW1vdmVkKSB7XG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCAmJiB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICAgICAgbGV0IHZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KTtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUsIGkpIHtcbiAgICAgICAgICBsZXQgb2xkVmFsdWUgPSBvbGRTdHJpbmdbb2xkUG9zICsgaV07XG4gICAgICAgICAgcmV0dXJuIG9sZFZhbHVlLmxlbmd0aCA+IHZhbHVlLmxlbmd0aCA/IG9sZFZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IHZhbHVlLmpvaW4oJycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG5ld1BvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIENvbW1vbiBjYXNlXG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCkge1xuICAgICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnQudmFsdWUgPSBvbGRTdHJpbmcuc2xpY2Uob2xkUG9zLCBvbGRQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gUmV2ZXJzZSBhZGQgYW5kIHJlbW92ZSBzbyByZW1vdmVzIGFyZSBvdXRwdXQgZmlyc3QgdG8gbWF0Y2ggY29tbW9uIGNvbnZlbnRpb25cbiAgICAgIC8vIFRoZSBkaWZmaW5nIGFsZ29yaXRobSBpcyB0aWVkIHRvIGFkZCB0aGVuIHJlbW92ZSBvdXRwdXQgYW5kIHRoaXMgaXMgdGhlIHNpbXBsZXN0XG4gICAgICAvLyByb3V0ZSB0byBnZXQgdGhlIGRlc2lyZWQgb3V0cHV0IHdpdGggbWluaW1hbCBvdmVyaGVhZC5cbiAgICAgIGlmIChjb21wb25lbnRQb3MgJiYgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXS5hZGRlZCkge1xuICAgICAgICBsZXQgdG1wID0gY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXSA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3NdID0gdG1wO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNwZWNpYWwgY2FzZSBoYW5kbGUgZm9yIHdoZW4gb25lIHRlcm1pbmFsIGlzIGlnbm9yZWQuIEZvciB0aGlzIGNhc2Ugd2UgbWVyZ2UgdGhlXG4gIC8vIHRlcm1pbmFsIGludG8gdGhlIHByaW9yIHN0cmluZyBhbmQgZHJvcCB0aGUgY2hhbmdlLlxuICBsZXQgbGFzdENvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMV07XG4gIGlmICgobGFzdENvbXBvbmVudC5hZGRlZCB8fCBsYXN0Q29tcG9uZW50LnJlbW92ZWQpICYmIGRpZmYuZXF1YWxzKCcnLCBsYXN0Q29tcG9uZW50LnZhbHVlKSkge1xuICAgIGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMl0udmFsdWUgKz0gbGFzdENvbXBvbmVudC52YWx1ZTtcbiAgICBjb21wb25lbnRzLnBvcCgpO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGF0aChwYXRoKSB7XG4gIHJldHVybiB7IG5ld1BvczogcGF0aC5uZXdQb3MsIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKSB9O1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNoYXJhY3RlckRpZmYgPSBuZXcgRGlmZigpO1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDaGFycyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNoYXJhY3RlckRpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY3NzRGlmZiA9IG5ldyBEaWZmKCk7XG5jc3NEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oW3t9OjssXXxcXHMrKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDc3Mob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7bGluZURpZmZ9IGZyb20gJy4vbGluZSc7XG5cbmNvbnN0IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuXG5leHBvcnQgY29uc3QganNvbkRpZmYgPSBuZXcgRGlmZigpO1xuLy8gRGlzY3JpbWluYXRlIGJldHdlZW4gdHdvIGxpbmVzIG9mIHByZXR0eS1wcmludGVkLCBzZXJpYWxpemVkIEpTT04gd2hlcmUgb25lIG9mIHRoZW0gaGFzIGFcbi8vIGRhbmdsaW5nIGNvbW1hIGFuZCB0aGUgb3RoZXIgZG9lc24ndC4gVHVybnMgb3V0IGluY2x1ZGluZyB0aGUgZGFuZ2xpbmcgY29tbWEgeWllbGRzIHRoZSBuaWNlc3Qgb3V0cHV0OlxuanNvbkRpZmYudXNlTG9uZ2VzdFRva2VuID0gdHJ1ZTtcblxuanNvbkRpZmYudG9rZW5pemUgPSBsaW5lRGlmZi50b2tlbml6ZTtcbmpzb25EaWZmLmNhc3RJbnB1dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeShjYW5vbmljYWxpemUodmFsdWUpLCB1bmRlZmluZWQsICcgICcpO1xufTtcbmpzb25EaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBEaWZmLnByb3RvdHlwZS5lcXVhbHMobGVmdC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSwgcmlnaHQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJykpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZKc29uKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjaykgeyByZXR1cm4ganNvbkRpZmYuZGlmZihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spOyB9XG5cblxuLy8gVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBwcmVzZW5jZSBvZiBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGJhaWxpbmcgb3V0IHdoZW4gZW5jb3VudGVyaW5nIGFuXG4vLyBvYmplY3QgdGhhdCBpcyBhbHJlYWR5IG9uIHRoZSBcInN0YWNrXCIgb2YgaXRlbXMgYmVpbmcgcHJvY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZShvYmosIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKSB7XG4gIHN0YWNrID0gc3RhY2sgfHwgW107XG4gIHJlcGxhY2VtZW50U3RhY2sgPSByZXBsYWNlbWVudFN0YWNrIHx8IFtdO1xuXG4gIGxldCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChzdGFja1tpXSA9PT0gb2JqKSB7XG4gICAgICByZXR1cm4gcmVwbGFjZW1lbnRTdGFja1tpXTtcbiAgICB9XG4gIH1cblxuICBsZXQgY2Fub25pY2FsaXplZE9iajtcblxuICBpZiAoJ1tvYmplY3QgQXJyYXldJyA9PT0gb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcuY2FsbChvYmopKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpbaV0gPSBjYW5vbmljYWxpemUob2JqW2ldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSB7fTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgbGV0IHNvcnRlZEtleXMgPSBbXSxcbiAgICAgICAga2V5O1xuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzb3J0ZWRLZXlzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGVkS2V5cy5zb3J0KCk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNvcnRlZEtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGtleSA9IHNvcnRlZEtleXNbaV07XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2tleV0gPSBjYW5vbmljYWxpemUob2JqW2tleV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gb2JqO1xuICB9XG4gIHJldHVybiBjYW5vbmljYWxpemVkT2JqO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbmV4cG9ydCBjb25zdCBsaW5lRGlmZiA9IG5ldyBEaWZmKCk7XG5saW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCByZXRMaW5lcyA9IFtdLFxuICAgICAgbGluZXNBbmROZXdsaW5lcyA9IHZhbHVlLnNwbGl0KC8oXFxufFxcclxcbikvKTtcblxuICAvLyBJZ25vcmUgdGhlIGZpbmFsIGVtcHR5IHRva2VuIHRoYXQgb2NjdXJzIGlmIHRoZSBzdHJpbmcgZW5kcyB3aXRoIGEgbmV3IGxpbmVcbiAgaWYgKCFsaW5lc0FuZE5ld2xpbmVzW2xpbmVzQW5kTmV3bGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICBsaW5lc0FuZE5ld2xpbmVzLnBvcCgpO1xuICB9XG5cbiAgLy8gTWVyZ2UgdGhlIGNvbnRlbnQgYW5kIGxpbmUgc2VwYXJhdG9ycyBpbnRvIHNpbmdsZSB0b2tlbnNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGxpbmUgPSBsaW5lc0FuZE5ld2xpbmVzW2ldO1xuXG4gICAgaWYgKGkgJSAyICYmICF0aGlzLm9wdGlvbnMubmV3bGluZUlzVG9rZW4pIHtcbiAgICAgIHJldExpbmVzW3JldExpbmVzLmxlbmd0aCAtIDFdICs9IGxpbmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSkge1xuICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICB9XG4gICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXRMaW5lcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmVHJpbW1lZExpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuXG5leHBvcnQgY29uc3Qgc2VudGVuY2VEaWZmID0gbmV3IERpZmYoKTtcbnNlbnRlbmNlRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFxcUy4rP1suIT9dKSg/PVxccyt8JCkvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmU2VudGVuY2VzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gc2VudGVuY2VEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbi8vIEJhc2VkIG9uIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xhdGluX3NjcmlwdF9pbl9Vbmljb2RlXG4vL1xuLy8gUmFuZ2VzIGFuZCBleGNlcHRpb25zOlxuLy8gTGF0aW4tMSBTdXBwbGVtZW50LCAwMDgw4oCTMDBGRlxuLy8gIC0gVSswMEQ3ICDDlyBNdWx0aXBsaWNhdGlvbiBzaWduXG4vLyAgLSBVKzAwRjcgIMO3IERpdmlzaW9uIHNpZ25cbi8vIExhdGluIEV4dGVuZGVkLUEsIDAxMDDigJMwMTdGXG4vLyBMYXRpbiBFeHRlbmRlZC1CLCAwMTgw4oCTMDI0RlxuLy8gSVBBIEV4dGVuc2lvbnMsIDAyNTDigJMwMkFGXG4vLyBTcGFjaW5nIE1vZGlmaWVyIExldHRlcnMsIDAyQjDigJMwMkZGXG4vLyAgLSBVKzAyQzcgIMuHICYjNzExOyAgQ2Fyb25cbi8vICAtIFUrMDJEOCAgy5ggJiM3Mjg7ICBCcmV2ZVxuLy8gIC0gVSswMkQ5ICDLmSAmIzcyOTsgIERvdCBBYm92ZVxuLy8gIC0gVSswMkRBICDLmiAmIzczMDsgIFJpbmcgQWJvdmVcbi8vICAtIFUrMDJEQiAgy5sgJiM3MzE7ICBPZ29uZWtcbi8vICAtIFUrMDJEQyAgy5wgJiM3MzI7ICBTbWFsbCBUaWxkZVxuLy8gIC0gVSswMkREICDLnSAmIzczMzsgIERvdWJsZSBBY3V0ZSBBY2NlbnRcbi8vIExhdGluIEV4dGVuZGVkIEFkZGl0aW9uYWwsIDFFMDDigJMxRUZGXG5jb25zdCBleHRlbmRlZFdvcmRDaGFycyA9IC9eW2EtekEtWlxcdXtDMH0tXFx1e0ZGfVxcdXtEOH0tXFx1e0Y2fVxcdXtGOH0tXFx1ezJDNn1cXHV7MkM4fS1cXHV7MkQ3fVxcdXsyREV9LVxcdXsyRkZ9XFx1ezFFMDB9LVxcdXsxRUZGfV0rJC91O1xuXG5jb25zdCByZVdoaXRlc3BhY2UgPSAvXFxTLztcblxuZXhwb3J0IGNvbnN0IHdvcmREaWZmID0gbmV3IERpZmYoKTtcbndvcmREaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBsZWZ0ID09PSByaWdodCB8fCAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KGxlZnQpICYmICFyZVdoaXRlc3BhY2UudGVzdChyaWdodCkpO1xufTtcbndvcmREaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHRva2VucyA9IHZhbHVlLnNwbGl0KC8oXFxzK3xcXGIpLyk7XG5cbiAgLy8gSm9pbiB0aGUgYm91bmRhcnkgc3BsaXRzIHRoYXQgd2UgZG8gbm90IGNvbnNpZGVyIHRvIGJlIGJvdW5kYXJpZXMuIFRoaXMgaXMgcHJpbWFyaWx5IHRoZSBleHRlbmRlZCBMYXRpbiBjaGFyYWN0ZXIgc2V0LlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGFuIGVtcHR5IHN0cmluZyBpbiB0aGUgbmV4dCBmaWVsZCBhbmQgd2UgaGF2ZSBvbmx5IHdvcmQgY2hhcnMgYmVmb3JlIGFuZCBhZnRlciwgbWVyZ2VcbiAgICBpZiAoIXRva2Vuc1tpICsgMV0gJiYgdG9rZW5zW2kgKyAyXVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2ldKVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2kgKyAyXSkpIHtcbiAgICAgIHRva2Vuc1tpXSArPSB0b2tlbnNbaSArIDJdO1xuICAgICAgdG9rZW5zLnNwbGljZShpICsgMSwgMik7XG4gICAgICBpLS07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRva2Vucztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzV2l0aFNwYWNlKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spO1xufVxuIiwiLyogU2VlIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMgb2YgdXNlICovXG5cbi8qXG4gKiBUZXh0IGRpZmYgaW1wbGVtZW50YXRpb24uXG4gKlxuICogVGhpcyBsaWJyYXJ5IHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgQVBJUzpcbiAqIEpzRGlmZi5kaWZmQ2hhcnM6IENoYXJhY3RlciBieSBjaGFyYWN0ZXIgZGlmZlxuICogSnNEaWZmLmRpZmZXb3JkczogV29yZCAoYXMgZGVmaW5lZCBieSBcXGIgcmVnZXgpIGRpZmYgd2hpY2ggaWdub3JlcyB3aGl0ZXNwYWNlXG4gKiBKc0RpZmYuZGlmZkxpbmVzOiBMaW5lIGJhc2VkIGRpZmZcbiAqXG4gKiBKc0RpZmYuZGlmZkNzczogRGlmZiB0YXJnZXRlZCBhdCBDU1MgY29udGVudFxuICpcbiAqIFRoZXNlIG1ldGhvZHMgYXJlIGJhc2VkIG9uIHRoZSBpbXBsZW1lbnRhdGlvbiBwcm9wb3NlZCBpblxuICogXCJBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgaXRzIFZhcmlhdGlvbnNcIiAoTXllcnMsIDE5ODYpLlxuICogaHR0cDovL2NpdGVzZWVyeC5pc3QucHN1LmVkdS92aWV3ZG9jL3N1bW1hcnk/ZG9pPTEwLjEuMS40LjY5MjdcbiAqL1xuaW1wb3J0IERpZmYgZnJvbSAnLi9kaWZmL2Jhc2UnO1xuaW1wb3J0IHtkaWZmQ2hhcnN9IGZyb20gJy4vZGlmZi9jaGFyYWN0ZXInO1xuaW1wb3J0IHtkaWZmV29yZHMsIGRpZmZXb3Jkc1dpdGhTcGFjZX0gZnJvbSAnLi9kaWZmL3dvcmQnO1xuaW1wb3J0IHtkaWZmTGluZXMsIGRpZmZUcmltbWVkTGluZXN9IGZyb20gJy4vZGlmZi9saW5lJztcbmltcG9ydCB7ZGlmZlNlbnRlbmNlc30gZnJvbSAnLi9kaWZmL3NlbnRlbmNlJztcblxuaW1wb3J0IHtkaWZmQ3NzfSBmcm9tICcuL2RpZmYvY3NzJztcbmltcG9ydCB7ZGlmZkpzb24sIGNhbm9uaWNhbGl6ZX0gZnJvbSAnLi9kaWZmL2pzb24nO1xuXG5pbXBvcnQge2FwcGx5UGF0Y2gsIGFwcGx5UGF0Y2hlc30gZnJvbSAnLi9wYXRjaC9hcHBseSc7XG5pbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvcGFyc2UnO1xuaW1wb3J0IHtzdHJ1Y3R1cmVkUGF0Y2gsIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsIGNyZWF0ZVBhdGNofSBmcm9tICcuL3BhdGNoL2NyZWF0ZSc7XG5cbmltcG9ydCB7Y29udmVydENoYW5nZXNUb0RNUH0gZnJvbSAnLi9jb252ZXJ0L2RtcCc7XG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9YTUx9IGZyb20gJy4vY29udmVydC94bWwnO1xuXG5leHBvcnQge1xuICBEaWZmLFxuXG4gIGRpZmZDaGFycyxcbiAgZGlmZldvcmRzLFxuICBkaWZmV29yZHNXaXRoU3BhY2UsXG4gIGRpZmZMaW5lcyxcbiAgZGlmZlRyaW1tZWRMaW5lcyxcbiAgZGlmZlNlbnRlbmNlcyxcblxuICBkaWZmQ3NzLFxuICBkaWZmSnNvbixcblxuICBzdHJ1Y3R1cmVkUGF0Y2gsXG4gIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsXG4gIGNyZWF0ZVBhdGNoLFxuICBhcHBseVBhdGNoLFxuICBhcHBseVBhdGNoZXMsXG4gIHBhcnNlUGF0Y2gsXG4gIGNvbnZlcnRDaGFuZ2VzVG9ETVAsXG4gIGNvbnZlcnRDaGFuZ2VzVG9YTUwsXG4gIGNhbm9uaWNhbGl6ZVxufTtcbiIsImltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgZGlzdGFuY2VJdGVyYXRvciBmcm9tICcuLi91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2goc291cmNlLCB1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodW5pRGlmZikpIHtcbiAgICBpZiAodW5pRGlmZi5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwcGx5UGF0Y2ggb25seSB3b3JrcyB3aXRoIGEgc2luZ2xlIGlucHV0LicpO1xuICAgIH1cblxuICAgIHVuaURpZmYgPSB1bmlEaWZmWzBdO1xuICB9XG5cbiAgLy8gQXBwbHkgdGhlIGRpZmYgdG8gdGhlIGlucHV0XG4gIGxldCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyksXG4gICAgICBodW5rcyA9IHVuaURpZmYuaHVua3MsXG5cbiAgICAgIGNvbXBhcmVMaW5lID0gb3B0aW9ucy5jb21wYXJlTGluZSB8fCAoKGxpbmVOdW1iZXIsIGxpbmUsIG9wZXJhdGlvbiwgcGF0Y2hDb250ZW50KSA9PiBsaW5lID09PSBwYXRjaENvbnRlbnQpLFxuICAgICAgZXJyb3JDb3VudCA9IDAsXG4gICAgICBmdXp6RmFjdG9yID0gb3B0aW9ucy5mdXp6RmFjdG9yIHx8IDAsXG4gICAgICBtaW5MaW5lID0gMCxcbiAgICAgIG9mZnNldCA9IDAsXG5cbiAgICAgIHJlbW92ZUVPRk5MLFxuICAgICAgYWRkRU9GTkw7XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgaHVuayBleGFjdGx5IGZpdHMgb24gdGhlIHByb3ZpZGVkIGxvY2F0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBodW5rRml0cyhodW5rLCB0b1Bvcykge1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgLy8gQ29udGV4dCBzYW5pdHkgY2hlY2tcbiAgICAgICAgaWYgKCFjb21wYXJlTGluZSh0b1BvcyArIDEsIGxpbmVzW3RvUG9zXSwgb3BlcmF0aW9uLCBjb250ZW50KSkge1xuICAgICAgICAgIGVycm9yQ291bnQrKztcblxuICAgICAgICAgIGlmIChlcnJvckNvdW50ID4gZnV6ekZhY3Rvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0b1BvcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU2VhcmNoIGJlc3QgZml0IG9mZnNldHMgZm9yIGVhY2ggaHVuayBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgbWF4TGluZSA9IGxpbmVzLmxlbmd0aCAtIGh1bmsub2xkTGluZXMsXG4gICAgICAgIGxvY2FsT2Zmc2V0ID0gMCxcbiAgICAgICAgdG9Qb3MgPSBvZmZzZXQgKyBodW5rLm9sZFN0YXJ0IC0gMTtcblxuICAgIGxldCBpdGVyYXRvciA9IGRpc3RhbmNlSXRlcmF0b3IodG9Qb3MsIG1pbkxpbmUsIG1heExpbmUpO1xuXG4gICAgZm9yICg7IGxvY2FsT2Zmc2V0ICE9PSB1bmRlZmluZWQ7IGxvY2FsT2Zmc2V0ID0gaXRlcmF0b3IoKSkge1xuICAgICAgaWYgKGh1bmtGaXRzKGh1bmssIHRvUG9zICsgbG9jYWxPZmZzZXQpKSB7XG4gICAgICAgIGh1bmsub2Zmc2V0ID0gb2Zmc2V0ICs9IGxvY2FsT2Zmc2V0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxPZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNldCBsb3dlciB0ZXh0IGxpbWl0IHRvIGVuZCBvZiB0aGUgY3VycmVudCBodW5rLCBzbyBuZXh0IG9uZXMgZG9uJ3QgdHJ5XG4gICAgLy8gdG8gZml0IG92ZXIgYWxyZWFkeSBwYXRjaGVkIHRleHRcbiAgICBtaW5MaW5lID0gaHVuay5vZmZzZXQgKyBodW5rLm9sZFN0YXJ0ICsgaHVuay5vbGRMaW5lcztcbiAgfVxuXG4gIC8vIEFwcGx5IHBhdGNoIGh1bmtzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICB0b1BvcyA9IGh1bmsub2Zmc2V0ICsgaHVuay5uZXdTdGFydCAtIDE7XG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMSk7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDAsIGNvbnRlbnQpO1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBsZXQgcHJldmlvdXNPcGVyYXRpb24gPSBodW5rLmxpbmVzW2ogLSAxXSA/IGh1bmsubGluZXNbaiAtIDFdWzBdIDogbnVsbDtcbiAgICAgICAgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICByZW1vdmVFT0ZOTCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIGFkZEVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBFT0ZOTCBpbnNlcnRpb24vcmVtb3ZhbFxuICBpZiAocmVtb3ZlRU9GTkwpIHtcbiAgICB3aGlsZSAoIWxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICBsaW5lcy5wb3AoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYWRkRU9GTkwpIHtcbiAgICBsaW5lcy5wdXNoKCcnKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbi8vIFdyYXBwZXIgdGhhdCBzdXBwb3J0cyBtdWx0aXBsZSBmaWxlIHBhdGNoZXMgdmlhIGNhbGxiYWNrcy5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoZXModW5pRGlmZiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgZnVuY3Rpb24gcHJvY2Vzc0luZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHVuaURpZmZbY3VycmVudEluZGV4KytdO1xuICAgIGlmICghaW5kZXgpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5sb2FkRmlsZShpbmRleCwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKGVycik7XG4gICAgICB9XG5cbiAgICAgIGxldCB1cGRhdGVkQ29udGVudCA9IGFwcGx5UGF0Y2goZGF0YSwgaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5wYXRjaGVkKGluZGV4LCB1cGRhdGVkQ29udGVudCk7XG5cbiAgICAgIHNldFRpbWVvdXQocHJvY2Vzc0luZGV4LCAwKTtcbiAgICB9KTtcbiAgfVxuICBwcm9jZXNzSW5kZXgoKTtcbn1cbiIsImltcG9ydCB7ZGlmZkxpbmVzfSBmcm9tICcuLi9kaWZmL2xpbmUnO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7IGNvbnRleHQ6IDQgfTtcbiAgfVxuXG4gIGNvbnN0IGRpZmYgPSBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIpO1xuICBkaWZmLnB1c2goe3ZhbHVlOiAnJywgbGluZXM6IFtdfSk7ICAgLy8gQXBwZW5kIGFuIGVtcHR5IHZhbHVlIHRvIG1ha2UgY2xlYW51cCBlYXNpZXJcblxuICBmdW5jdGlvbiBjb250ZXh0TGluZXMobGluZXMpIHtcbiAgICByZXR1cm4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7IHJldHVybiAnICcgKyBlbnRyeTsgfSk7XG4gIH1cblxuICBsZXQgaHVua3MgPSBbXTtcbiAgbGV0IG9sZFJhbmdlU3RhcnQgPSAwLCBuZXdSYW5nZVN0YXJ0ID0gMCwgY3VyUmFuZ2UgPSBbXSxcbiAgICAgIG9sZExpbmUgPSAxLCBuZXdMaW5lID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGRpZmZbaV0sXG4gICAgICAgICAgbGluZXMgPSBjdXJyZW50LmxpbmVzIHx8IGN1cnJlbnQudmFsdWUucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJyk7XG4gICAgY3VycmVudC5saW5lcyA9IGxpbmVzO1xuXG4gICAgaWYgKGN1cnJlbnQuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHByZXZpb3VzIGNvbnRleHQsIHN0YXJ0IHdpdGggdGhhdFxuICAgICAgaWYgKCFvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBkaWZmW2kgLSAxXTtcbiAgICAgICAgb2xkUmFuZ2VTdGFydCA9IG9sZExpbmU7XG4gICAgICAgIG5ld1JhbmdlU3RhcnQgPSBuZXdMaW5lO1xuXG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBvcHRpb25zLmNvbnRleHQgPiAwID8gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLW9wdGlvbnMuY29udGV4dCkpIDogW107XG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3V0cHV0IG91ciBjaGFuZ2VzXG4gICAgICBjdXJSYW5nZS5wdXNoKC4uLiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIChjdXJyZW50LmFkZGVkID8gJysnIDogJy0nKSArIGVudHJ5O1xuICAgICAgfSkpO1xuXG4gICAgICAvLyBUcmFjayB0aGUgdXBkYXRlZCBmaWxlIHBvc2l0aW9uXG4gICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZGVudGljYWwgY29udGV4dCBsaW5lcy4gVHJhY2sgbGluZSBjaGFuZ2VzXG4gICAgICBpZiAob2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAvLyBDbG9zZSBvdXQgYW55IGNoYW5nZXMgdGhhdCBoYXZlIGJlZW4gb3V0cHV0IChvciBqb2luIG92ZXJsYXBwaW5nKVxuICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCAqIDIgJiYgaSA8IGRpZmYubGVuZ3RoIC0gMikge1xuICAgICAgICAgIC8vIE92ZXJsYXBwaW5nXG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZW5kIHRoZSByYW5nZSBhbmQgb3V0cHV0XG4gICAgICAgICAgbGV0IGNvbnRleHRTaXplID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBvcHRpb25zLmNvbnRleHQpO1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcy5zbGljZSgwLCBjb250ZXh0U2l6ZSkpKTtcblxuICAgICAgICAgIGxldCBodW5rID0ge1xuICAgICAgICAgICAgb2xkU3RhcnQ6IG9sZFJhbmdlU3RhcnQsXG4gICAgICAgICAgICBvbGRMaW5lczogKG9sZExpbmUgLSBvbGRSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbmV3U3RhcnQ6IG5ld1JhbmdlU3RhcnQsXG4gICAgICAgICAgICBuZXdMaW5lczogKG5ld0xpbmUgLSBuZXdSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbGluZXM6IGN1clJhbmdlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoaSA+PSBkaWZmLmxlbmd0aCAtIDIgJiYgbGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gRU9GIGlzIGluc2lkZSB0aGlzIGh1bmtcbiAgICAgICAgICAgIGxldCBvbGRFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG9sZFN0cikpO1xuICAgICAgICAgICAgbGV0IG5ld0VPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3QobmV3U3RyKSk7XG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09IDAgJiYgIW9sZEVPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlOiBvbGQgaGFzIG5vIGVvbCBhbmQgbm8gdHJhaWxpbmcgY29udGV4dDsgbm8tbmwgY2FuIGVuZCB1cCBiZWZvcmUgYWRkc1xuICAgICAgICAgICAgICBjdXJSYW5nZS5zcGxpY2UoaHVuay5vbGRMaW5lcywgMCwgJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb2xkRU9GTmV3bGluZSB8fCAhbmV3RU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICBjdXJSYW5nZS5wdXNoKCdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaHVua3MucHVzaChodW5rKTtcblxuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIGN1clJhbmdlID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBvbGRGaWxlTmFtZTogb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lOiBuZXdGaWxlTmFtZSxcbiAgICBvbGRIZWFkZXI6IG9sZEhlYWRlciwgbmV3SGVhZGVyOiBuZXdIZWFkZXIsXG4gICAgaHVua3M6IGh1bmtzXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUd29GaWxlc1BhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGNvbnN0IGRpZmYgPSBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IHJldCA9IFtdO1xuICBpZiAob2xkRmlsZU5hbWUgPT0gbmV3RmlsZU5hbWUpIHtcbiAgICByZXQucHVzaCgnSW5kZXg6ICcgKyBvbGRGaWxlTmFtZSk7XG4gIH1cbiAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgcmV0LnB1c2goJy0tLSAnICsgZGlmZi5vbGRGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5vbGRIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYub2xkSGVhZGVyKSk7XG4gIHJldC5wdXNoKCcrKysgJyArIGRpZmYubmV3RmlsZU5hbWUgKyAodHlwZW9mIGRpZmYubmV3SGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm5ld0hlYWRlcikpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5odW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGh1bmsgPSBkaWZmLmh1bmtzW2ldO1xuICAgIHJldC5wdXNoKFxuICAgICAgJ0BAIC0nICsgaHVuay5vbGRTdGFydCArICcsJyArIGh1bmsub2xkTGluZXNcbiAgICAgICsgJyArJyArIGh1bmsubmV3U3RhcnQgKyAnLCcgKyBodW5rLm5ld0xpbmVzXG4gICAgICArICcgQEAnXG4gICAgKTtcbiAgICByZXQucHVzaC5hcHBseShyZXQsIGh1bmsubGluZXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldC5qb2luKCdcXG4nKSArICdcXG4nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGF0Y2goZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICByZXR1cm4gY3JlYXRlVHdvRmlsZXNQYXRjaChmaWxlTmFtZSwgZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VQYXRjaCh1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IGRpZmZzdHIgPSB1bmlEaWZmLnNwbGl0KCdcXG4nKSxcbiAgICAgIGxpc3QgPSBbXSxcbiAgICAgIGkgPSAwO1xuXG4gIGZ1bmN0aW9uIHBhcnNlSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0ge307XG4gICAgbGlzdC5wdXNoKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGRpZmYgbWV0YWRhdGFcbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIC8vIEZpbGUgaGVhZGVyIGZvdW5kLCBlbmQgcGFyc2luZyBkaWZmIG1ldGFkYXRhXG4gICAgICBpZiAoL14oXFwtXFwtXFwtfFxcK1xcK1xcK3xAQClcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIERpZmYgaW5kZXhcbiAgICAgIGxldCBoZWFkZXIgPSAoL14oPzpJbmRleDp8ZGlmZig/OiAtciBcXHcrKSspXFxzKyguKz8pXFxzKiQvKS5leGVjKGxpbmUpO1xuICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICBpbmRleC5pbmRleCA9IGhlYWRlclsxXTtcbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIGZpbGUgaGVhZGVycyBpZiB0aGV5IGFyZSBkZWZpbmVkLiBVbmlmaWVkIGRpZmYgcmVxdWlyZXMgdGhlbSwgYnV0XG4gICAgLy8gdGhlcmUncyBubyB0ZWNobmljYWwgaXNzdWVzIHRvIGhhdmUgYW4gaXNvbGF0ZWQgaHVuayB3aXRob3V0IGZpbGUgaGVhZGVyXG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgaHVua3NcbiAgICBpbmRleC5odW5rcyA9IFtdO1xuXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICBpZiAoL14oSW5kZXg6fGRpZmZ8XFwtXFwtXFwtfFxcK1xcK1xcKylcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKC9eQEAvLnRlc3QobGluZSkpIHtcbiAgICAgICAgaW5kZXguaHVua3MucHVzaChwYXJzZUh1bmsoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpbmUgJiYgb3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgICAgLy8gSWdub3JlIHVuZXhwZWN0ZWQgY29udGVudCB1bmxlc3MgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpbmUgJyArIChpICsgMSkgKyAnICcgKyBKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIHRoZSAtLS0gYW5kICsrKyBoZWFkZXJzLCBpZiBub25lIGFyZSBmb3VuZCwgbm8gbGluZXNcbiAgLy8gYXJlIGNvbnN1bWVkLlxuICBmdW5jdGlvbiBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpIHtcbiAgICBsZXQgZmlsZUhlYWRlciA9ICgvXihcXC1cXC1cXC18XFwrXFwrXFwrKVxccysoXFxTKylcXHM/KC4rPylcXHMqJC8pLmV4ZWMoZGlmZnN0cltpXSk7XG4gICAgaWYgKGZpbGVIZWFkZXIpIHtcbiAgICAgIGxldCBrZXlQcmVmaXggPSBmaWxlSGVhZGVyWzFdID09PSAnLS0tJyA/ICdvbGQnIDogJ25ldyc7XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnRmlsZU5hbWUnXSA9IGZpbGVIZWFkZXJbMl07XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnSGVhZGVyJ10gPSBmaWxlSGVhZGVyWzNdO1xuXG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIGEgaHVua1xuICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB3ZSBhcmUgYXQgdGhlIHN0YXJ0IG9mIGEgaHVuay5cbiAgZnVuY3Rpb24gcGFyc2VIdW5rKCkge1xuICAgIGxldCBjaHVua0hlYWRlckluZGV4ID0gaSxcbiAgICAgICAgY2h1bmtIZWFkZXJMaW5lID0gZGlmZnN0cltpKytdLFxuICAgICAgICBjaHVua0hlYWRlciA9IGNodW5rSGVhZGVyTGluZS5zcGxpdCgvQEAgLShcXGQrKSg/OiwoXFxkKykpPyBcXCsoXFxkKykoPzosKFxcZCspKT8gQEAvKTtcblxuICAgIGxldCBodW5rID0ge1xuICAgICAgb2xkU3RhcnQ6ICtjaHVua0hlYWRlclsxXSxcbiAgICAgIG9sZExpbmVzOiArY2h1bmtIZWFkZXJbMl0gfHwgMSxcbiAgICAgIG5ld1N0YXJ0OiArY2h1bmtIZWFkZXJbM10sXG4gICAgICBuZXdMaW5lczogK2NodW5rSGVhZGVyWzRdIHx8IDEsXG4gICAgICBsaW5lczogW11cbiAgICB9O1xuXG4gICAgbGV0IGFkZENvdW50ID0gMCxcbiAgICAgICAgcmVtb3ZlQ291bnQgPSAwO1xuICAgIGZvciAoOyBpIDwgZGlmZnN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9wZXJhdGlvbiA9IGRpZmZzdHJbaV1bMF07XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJyB8fCBvcGVyYXRpb24gPT09ICctJyB8fCBvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBodW5rLmxpbmVzLnB1c2goZGlmZnN0cltpXSk7XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSB0aGUgZW1wdHkgYmxvY2sgY291bnQgY2FzZVxuICAgIGlmICghYWRkQ291bnQgJiYgaHVuay5uZXdMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5uZXdMaW5lcyA9IDA7XG4gICAgfVxuICAgIGlmICghcmVtb3ZlQ291bnQgJiYgaHVuay5vbGRMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5vbGRMaW5lcyA9IDA7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBvcHRpb25hbCBzYW5pdHkgY2hlY2tpbmdcbiAgICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGlmIChhZGRDb3VudCAhPT0gaHVuay5uZXdMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZW1vdmVDb3VudCAhPT0gaHVuay5vbGRMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlbW92ZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBodW5rO1xuICB9XG5cbiAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgIHBhcnNlSW5kZXgoKTtcbiAgfVxuXG4gIHJldHVybiBsaXN0O1xufVxuIiwiLy8gSXRlcmF0b3IgdGhhdCB0cmF2ZXJzZXMgaW4gdGhlIHJhbmdlIG9mIFttaW4sIG1heF0sIHN0ZXBwaW5nXG4vLyBieSBkaXN0YW5jZSBmcm9tIGEgZ2l2ZW4gc3RhcnQgcG9zaXRpb24uIEkuZS4gZm9yIFswLCA0XSwgd2l0aFxuLy8gc3RhcnQgb2YgMiwgdGhpcyB3aWxsIGl0ZXJhdGUgMiwgMywgMSwgNCwgMC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBtaW5MaW5lLCBtYXhMaW5lKSB7XG4gIGxldCB3YW50Rm9yd2FyZCA9IHRydWUsXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgbG9jYWxPZmZzZXQgPSAxO1xuXG4gIHJldHVybiBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICBpZiAod2FudEZvcndhcmQgJiYgIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmIChiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICBsb2NhbE9mZnNldCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZXlvbmQgdGV4dCBsZW5ndGgsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGFmdGVyIG9mZnNldCBsb2NhdGlvbiAob3IgZGVzaXJlZCBsb2NhdGlvbiBvbiBmaXJzdCBpdGVyYXRpb24pXG4gICAgICBpZiAoc3RhcnQgKyBsb2NhbE9mZnNldCA8PSBtYXhMaW5lKSB7XG4gICAgICAgIHJldHVybiBsb2NhbE9mZnNldDtcbiAgICAgIH1cblxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKCFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZWZvcmUgdGV4dCBiZWdpbm5pbmcsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGJlZm9yZSBvZmZzZXQgbG9jYXRpb25cbiAgICAgIGlmIChtaW5MaW5lIDw9IHN0YXJ0IC0gbG9jYWxPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIC1sb2NhbE9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICB9XG5cbiAgICAvLyBXZSB0cmllZCB0byBmaXQgaHVuayBiZWZvcmUgdGV4dCBiZWdpbm5pbmcgYW5kIGJleW9uZCB0ZXh0IGxlbmdodCwgdGhlblxuICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG4gIH07XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGRlZmF1bHRzLmNhbGxiYWNrID0gb3B0aW9ucztcbiAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgZm9yIChsZXQgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdHM7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIGxjcyA9IHJlcXVpcmUoJy4vbGliL2xjcycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9saWIvYXJyYXknKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJy4vbGliL2pzb25QYXRjaCcpO1xudmFyIGludmVyc2UgPSByZXF1aXJlKCcuL2xpYi9pbnZlcnNlJyk7XG52YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2xpYi9qc29uUG9pbnRlcicpO1xudmFyIGVuY29kZVNlZ21lbnQgPSBqc29uUG9pbnRlci5lbmNvZGVTZWdtZW50O1xuXG5leHBvcnRzLmRpZmYgPSBkaWZmO1xuZXhwb3J0cy5wYXRjaCA9IHBhdGNoLmFwcGx5O1xuZXhwb3J0cy5wYXRjaEluUGxhY2UgPSBwYXRjaC5hcHBseUluUGxhY2U7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5jbG9uZSA9IHBhdGNoLmNsb25lO1xuXG4vLyBFcnJvcnNcbmV4cG9ydHMuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuZXhwb3J0cy5UZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9UZXN0RmFpbGVkRXJyb3InKTtcbmV4cG9ydHMuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgaXNWYWxpZE9iamVjdCA9IHBhdGNoLmlzVmFsaWRPYmplY3Q7XG52YXIgZGVmYXVsdEhhc2ggPSBwYXRjaC5kZWZhdWx0SGFzaDtcblxuLyoqXG4gKiBDb21wdXRlIGEgSlNPTiBQYXRjaCByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYSBhbmQgYi5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIGlmIGEgZnVuY3Rpb24sIHNlZSBvcHRpb25zLmhhc2hcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKHg6Kik6U3RyaW5nfE51bWJlcn0gb3B0aW9ucy5oYXNoIHVzZWQgdG8gaGFzaCBhcnJheSBpdGVtc1xuICogIGluIG9yZGVyIHRvIHJlY29nbml6ZSBpZGVudGljYWwgb2JqZWN0cywgZGVmYXVsdHMgdG8gSlNPTi5zdHJpbmdpZnlcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXkpOm9iamVjdH0gb3B0aW9ucy5tYWtlQ29udGV4dFxuICogIHVzZWQgdG8gZ2VuZXJhdGUgcGF0Y2ggY29udGV4dC4gSWYgbm90IHByb3ZpZGVkLCBjb250ZXh0IHdpbGwgbm90IGJlIGdlbmVyYXRlZFxuICogQHJldHVybnMge2FycmF5fSBKU09OIFBhdGNoIHN1Y2ggdGhhdCBwYXRjaChkaWZmKGEsIGIpLCBhKSB+IGJcbiAqL1xuZnVuY3Rpb24gZGlmZihhLCBiLCBvcHRpb25zKSB7XG5cdHJldHVybiBhcHBlbmRDaGFuZ2VzKGEsIGIsICcnLCBpbml0U3RhdGUob3B0aW9ucywgW10pKS5wYXRjaDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgaW5pdGlhbCBkaWZmIHN0YXRlIGZyb20gdGhlIHByb3ZpZGVkIG9wdGlvbnNcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgQHNlZSBkaWZmIG9wdGlvbnMgYWJvdmVcbiAqIEBwYXJhbSB7YXJyYXl9IHBhdGNoIGFuIGVtcHR5IG9yIGV4aXN0aW5nIEpTT04gUGF0Y2ggYXJyYXkgaW50byB3aGljaFxuICogIHRoZSBkaWZmIHNob3VsZCBnZW5lcmF0ZSBuZXcgcGF0Y2ggb3BlcmF0aW9uc1xuICogQHJldHVybnMge29iamVjdH0gaW5pdGlhbGl6ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBpbml0U3RhdGUob3B0aW9ucywgcGF0Y2gpIHtcblx0aWYodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLmhhc2gsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5tYWtlQ29udGV4dCwgZGVmYXVsdENvbnRleHQpLFxuXHRcdFx0aW52ZXJ0aWJsZTogIShvcHRpb25zLmludmVydGlibGUgPT09IGZhbHNlKVxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogZGVmYXVsdENvbnRleHQsXG5cdFx0XHRpbnZlcnRpYmxlOiB0cnVlXG5cdFx0fTtcblx0fVxufVxuXG4vKipcbiAqIEdpdmVuIHR3byBKU09OIHZhbHVlcyAob2JqZWN0LCBhcnJheSwgbnVtYmVyLCBzdHJpbmcsIGV0Yy4pLCBmaW5kIHRoZWlyXG4gKiBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kQXJyYXlDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdGlmKGlzVmFsaWRPYmplY3QoYSkgJiYgaXNWYWxpZE9iamVjdChiKSkge1xuXHRcdHJldHVybiBhcHBlbmRPYmplY3RDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdHJldHVybiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBvYmplY3RzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IG8xXG4gKiBAcGFyYW0ge29iamVjdH0gbzJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRPYmplY3RDaGFuZ2VzKG8xLCBvMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhvMik7XG5cdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHR2YXIgaSwga2V5O1xuXG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0dmFyIGtleVBhdGggPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdGlmKG8xW2tleV0gIT09IHZvaWQgMCkge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhvMVtrZXldLCBvMltrZXldLCBrZXlQYXRoLCBzdGF0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IGtleVBhdGgsIHZhbHVlOiBvMltrZXldIH0pO1xuXHRcdH1cblx0fVxuXG5cdGtleXMgPSBPYmplY3Qua2V5cyhvMSk7XG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0aWYobzJba2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogbzFba2V5XSB9KTtcblx0XHRcdH1cblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBhcnJheXMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRBcnJheUNoYW5nZXMoYTEsIGEyLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIgYTFoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGExKTtcblx0dmFyIGEyaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMik7XG5cblx0dmFyIGxjc01hdHJpeCA9IGxjcy5jb21wYXJlKGExaGFzaCwgYTJoYXNoKTtcblxuXHRyZXR1cm4gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4gbGNzTWF0cml4IGludG8gSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFuZCBhcHBlbmRcbiAqIHRoZW0gdG8gc3RhdGUucGF0Y2gsIHJlY3Vyc2luZyBpbnRvIGFycmF5IGVsZW1lbnRzIGFzIG5lY2Vzc2FyeVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzTWF0cml4XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBuZXcgc3RhdGUgd2l0aCBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYWRkZWQgYmFzZWRcbiAqICBvbiB0aGUgcHJvdmlkZWQgbGNzTWF0cml4XG4gKi9cbmZ1bmN0aW9uIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCkge1xuXHR2YXIgb2Zmc2V0ID0gMDtcblx0cmV0dXJuIGxjcy5yZWR1Y2UoZnVuY3Rpb24oc3RhdGUsIG9wLCBpLCBqKSB7XG5cdFx0dmFyIGxhc3QsIGNvbnRleHQ7XG5cdFx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgKGogKyBvZmZzZXQpO1xuXG5cdFx0aWYgKG9wID09PSBsY3MuUkVNT1ZFKSB7XG5cdFx0XHQvLyBDb2FsZXNjZSBhZGphY2VudCByZW1vdmUgKyBhZGQgaW50byByZXBsYWNlXG5cdFx0XHRsYXN0ID0gcGF0Y2hbcGF0Y2gubGVuZ3RoLTFdO1xuXHRcdFx0Y29udGV4dCA9IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKTtcblxuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IGExW2pdLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihsYXN0ICE9PSB2b2lkIDAgJiYgbGFzdC5vcCA9PT0gJ2FkZCcgJiYgbGFzdC5wYXRoID09PSBwKSB7XG5cdFx0XHRcdGxhc3Qub3AgPSAncmVwbGFjZSc7XG5cdFx0XHRcdGxhc3QuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRvZmZzZXQgLT0gMTtcblxuXHRcdH0gZWxzZSBpZiAob3AgPT09IGxjcy5BREQpIHtcblx0XHRcdC8vIFNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMiNzZWN0aW9uLTQuMVxuXHRcdFx0Ly8gTWF5IHVzZSBlaXRoZXIgaW5kZXg9PT1sZW5ndGggKm9yKiAnLScgdG8gaW5kaWNhdGUgYXBwZW5kaW5nIHRvIGFycmF5XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwLCB2YWx1ZTogYTJbaV0sXG5cdFx0XHRcdGNvbnRleHQ6IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKVxuXHRcdFx0fSk7XG5cblx0XHRcdG9mZnNldCArPSAxO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGFwcGVuZENoYW5nZXMoYTFbal0sIGEyW2ldLCBwLCBzdGF0ZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0YXRlO1xuXG5cdH0sIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBudW1iZXJ8c3RyaW5nfG51bGwgdmFsdWVzLCBpZiB0aGV5IGRpZmZlciwgYXBwZW5kIHRvIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge29iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihhICE9PSBiKSB7XG5cdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHBhdGgsIHZhbHVlOiBhIH0pO1xuXHRcdH1cblxuXHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYiB9KTtcblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGVcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHsqfSB5XG4gKiBAcmV0dXJucyB7Kn0geCBpZiBwcmVkaWNhdGUoeCkgaXMgdHJ1dGh5LCBvdGhlcndpc2UgeVxuICovXG5mdW5jdGlvbiBvckVsc2UocHJlZGljYXRlLCB4LCB5KSB7XG5cdHJldHVybiBwcmVkaWNhdGUoeCkgPyB4IDogeTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHBhdGNoIGNvbnRleHQgZ2VuZXJhdG9yXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSB1bmRlZmluZWQgY29udGV4dFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Q29udGV4dCgpIHtcblx0cmV0dXJuIHZvaWQgMDtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHggaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yO1xuXG5mdW5jdGlvbiBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjtcblxuZnVuY3Rpb24gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gVGVzdEZhaWxlZEVycm9yO1xuXG5mdW5jdGlvbiBUZXN0RmFpbGVkRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVGVzdEZhaWxlZEVycm9yOyIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbnMgPSBjb25zO1xuZXhwb3J0cy50YWlsID0gdGFpbDtcbmV4cG9ydHMubWFwID0gbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgeCB0byBhLCB3aXRob3V0IG11dGF0aW5nIGEuIEZhc3RlciB0aGFuIGEudW5zaGlmdCh4KVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IHdpdGggeCBwcmVwZW5kZWRcbiAqL1xuZnVuY3Rpb24gY29ucyh4LCBhKSB7XG5cdHZhciBsID0gYS5sZW5ndGg7XG5cdHZhciBiID0gbmV3IEFycmF5KGwrMSk7XG5cdGJbMF0gPSB4O1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2krMV0gPSBhW2ldO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IEFycmF5IGNvbnRhaW5pbmcgYWxsIGVsZW1lbnRzIGluIGEsIGV4Y2VwdCB0aGUgZmlyc3QuXG4gKiAgRmFzdGVyIHRoYW4gYS5zbGljZSgxKVxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSwgdGhlIGVxdWl2YWxlbnQgb2YgYS5zbGljZSgxKVxuICovXG5mdW5jdGlvbiB0YWlsKGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aC0xO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKTtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpXSA9IGFbaSsxXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIE1hcCBhbnkgYXJyYXktbGlrZS4gRmFzdGVyIHRoYW4gQXJyYXkucHJvdG90eXBlLm1hcFxuICogQHBhcmFtIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSBtYXBwZWQgYnkgZlxuICovXG5mdW5jdGlvbiBtYXAoZiwgYSkge1xuXHR2YXIgYiA9IG5ldyBBcnJheShhLmxlbmd0aCk7XG5cdGZvcih2YXIgaT0wOyBpPCBhLmxlbmd0aDsgKytpKSB7XG5cdFx0YltpXSA9IGYoYVtpXSk7XG5cdH1cblx0cmV0dXJuIGI7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qKlxuICogQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHggd2hpY2ggbXVzdCBiZSBhIGxlZ2FsIEpTT04gb2JqZWN0L2FycmF5L3ZhbHVlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIGNsb25lXG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gY2xvbmUgb2YgeFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5mdW5jdGlvbiBjbG9uZSh4KSB7XG5cdGlmKHggPT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRyZXR1cm4gY2xvbmVBcnJheSh4KTtcblx0fVxuXG5cdHJldHVybiBjbG9uZU9iamVjdCh4KTtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoeCkge1xuXHR2YXIgbCA9IHgubGVuZ3RoO1xuXHR2YXIgeSA9IG5ldyBBcnJheShsKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuXHRcdHlbaV0gPSBjbG9uZSh4W2ldKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAoeCkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHgpO1xuXHR2YXIgeSA9IHt9O1xuXG5cdGZvciAodmFyIGssIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRrID0ga2V5c1tpXTtcblx0XHR5W2tdID0gY2xvbmUoeFtrXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcblxuLyoqXG4gKiBjb21tdXRlIHRoZSBwYXRjaCBzZXF1ZW5jZSBhLGIgdG8gYixhXG4gKiBAcGFyYW0ge29iamVjdH0gYSBwYXRjaCBvcGVyYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBiIHBhdGNoIG9wZXJhdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbW11dGVQYXRocyhhLCBiKSB7XG5cdC8vIFRPRE86IGNhc2VzIGZvciBzcGVjaWFsIHBhdGhzOiAnJyBhbmQgJy8nXG5cdHZhciBsZWZ0ID0ganNvblBvaW50ZXIucGFyc2UoYS5wYXRoKTtcblx0dmFyIHJpZ2h0ID0ganNvblBvaW50ZXIucGFyc2UoYi5wYXRoKTtcblx0dmFyIHByZWZpeCA9IGdldENvbW1vblBhdGhQcmVmaXgobGVmdCwgcmlnaHQpO1xuXHR2YXIgaXNBcnJheSA9IGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBwcmVmaXgubGVuZ3RoKTtcblxuXHQvLyBOZXZlciBtdXRhdGUgdGhlIG9yaWdpbmFsc1xuXHR2YXIgYWMgPSBjb3B5UGF0Y2goYSk7XG5cdHZhciBiYyA9IGNvcHlQYXRjaChiKTtcblxuXHRpZihwcmVmaXgubGVuZ3RoID09PSAwICYmICFpc0FycmF5KSB7XG5cdFx0Ly8gUGF0aHMgc2hhcmUgbm8gY29tbW9uIGFuY2VzdG9yLCBzaW1wbGUgc3dhcFxuXHRcdHJldHVybiBbYmMsIGFjXTtcblx0fVxuXG5cdGlmKGlzQXJyYXkpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5UGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGNvbW11dGVUcmVlUGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGNvbW11dGVUcmVlUGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYoYS5wYXRoID09PSBiLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3QgY29tbXV0ZSAnICsgYS5vcCArICcsJyArIGIub3AgKyAnIHdpdGggaWRlbnRpY2FsIG9iamVjdCBwYXRocycpO1xuXHR9XG5cdC8vIEZJWE1FOiBJbXBsZW1lbnQgdHJlZSBwYXRoIGNvbW11dGF0aW9uXG5cdHJldHVybiBbYiwgYV07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aG9zZSBjb21tb24gYW5jZXN0b3IgKHdoaWNoIG1heSBiZSB0aGUgaW1tZWRpYXRlIHBhcmVudClcbiAqIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gYVxuICogQHBhcmFtIGxlZnRcbiAqIEBwYXJhbSBiXG4gKiBAcGFyYW0gcmlnaHRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihsZWZ0Lmxlbmd0aCA9PT0gcmlnaHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVNpYmxpbmdzKGEsIGxlZnQsIGIsIHJpZ2h0KTtcblx0fVxuXG5cdGlmIChsZWZ0Lmxlbmd0aCA+IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdC8vIGxlZnQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIHJpZ2h0XG5cdFx0bGVmdCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGIsIHJpZ2h0LCBhLCBsZWZ0LCAtMSk7XG5cdFx0YS5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihsZWZ0KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gcmlnaHQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIGxlZnRcblx0XHRyaWdodCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGEsIGxlZnQsIGIsIHJpZ2h0LCAxKTtcblx0XHRiLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKHJpZ2h0KSk7XG5cdH1cblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgaW5kZXgpIHtcblx0cmV0dXJuIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KGxlZnRbaW5kZXhdKVxuXHRcdCYmIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KHJpZ2h0W2luZGV4XSk7XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyByZWZlcnJpbmcgdG8gaXRlbXMgaW4gdGhlIHNhbWUgYXJyYXlcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEByZXR1cm5zIHsqW119XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVNpYmxpbmdzKGwsIGxwYXRoLCByLCBycGF0aCkge1xuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0dmFyIGNvbW11dGVkO1xuXG5cdGlmKGxpbmRleCA8IHJpbmRleCkge1xuXHRcdC8vIEFkanVzdCByaWdodCBwYXRoXG5cdFx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gMSk7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gcmluZGV4ICsgMTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9XG5cdH0gZWxzZSBpZihyLm9wID09PSAnYWRkJyB8fCByLm9wID09PSAnY29weScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoXG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBsaW5kZXggKyAxO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fSBlbHNlIGlmIChsaW5kZXggPiByaW5kZXggJiYgci5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoIG9ubHkgaWYgcmVtb3ZlIHdhcyBhdCBhIChzdHJpY3RseSkgbG93ZXIgaW5kZXhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIGxpbmRleCAtIDEpO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fVxuXG5cdHJldHVybiBbciwgbF07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aXRoIGEgY29tbW9uIGFycmF5IGFuY2VzdG9yXG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcGFyYW0gZGlyZWN0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5QW5jZXN0b3IobCwgbHBhdGgsIHIsIHJwYXRoLCBkaXJlY3Rpb24pIHtcblx0Ly8gcnBhdGggaXMgbG9uZ2VyIG9yIHNhbWUgbGVuZ3RoXG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHQvLyBDb3B5IHJwYXRoLCB0aGVuIGFkanVzdCBpdHMgYXJyYXkgaW5kZXhcblx0dmFyIHJjID0gcnBhdGguc2xpY2UoKTtcblxuXHRpZihsaW5kZXggPiByaW5kZXgpIHtcblx0XHRyZXR1cm4gcmM7XG5cdH1cblxuXHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gZGlyZWN0aW9uKTtcblx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCArIGRpcmVjdGlvbik7XG5cdH1cblxuXHRyZXR1cm4gcmM7XG59XG5cbmZ1bmN0aW9uIGdldENvbW1vblBhdGhQcmVmaXgocDEsIHAyKSB7XG5cdHZhciBwMWwgPSBwMS5sZW5ndGg7XG5cdHZhciBwMmwgPSBwMi5sZW5ndGg7XG5cdGlmKHAxbCA9PT0gMCB8fCBwMmwgPT09IDAgfHwgKHAxbCA8IDIgJiYgcDJsIDwgMikpIHtcblx0XHRyZXR1cm4gW107XG5cdH1cblxuXHQvLyBJZiBwYXRocyBhcmUgc2FtZSBsZW5ndGgsIHRoZSBsYXN0IHNlZ21lbnQgY2Fubm90IGJlIHBhcnRcblx0Ly8gb2YgYSBjb21tb24gcHJlZml4LiAgSWYgbm90IHRoZSBzYW1lIGxlbmd0aCwgdGhlIHByZWZpeCBjYW5ub3Rcblx0Ly8gYmUgbG9uZ2VyIHRoYW4gdGhlIHNob3J0ZXIgcGF0aC5cblx0dmFyIGwgPSBwMWwgPT09IHAybFxuXHRcdD8gcDFsIC0gMVxuXHRcdDogTWF0aC5taW4ocDFsLCBwMmwpO1xuXG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgcDFbaV0gPT09IHAyW2ldKSB7XG5cdFx0KytpXG5cdH1cblxuXHRyZXR1cm4gcDEuc2xpY2UoMCwgaSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlQYXRjaChwKSB7XG5cdGlmKHAub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCB9O1xuXHR9XG5cblx0aWYocC5vcCA9PT0gJ2NvcHknIHx8IHAub3AgPT09ICdtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIGZyb206IHAuZnJvbSB9O1xuXHR9XG5cblx0Ly8gdGVzdCwgYWRkLCByZXBsYWNlXG5cdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIHZhbHVlOiBwLnZhbHVlIH07XG59IiwibW9kdWxlLmV4cG9ydHMgPSBkZWVwRXF1YWxzO1xuXG4vKipcbiAqIENvbXBhcmUgMiBKU09OIHZhbHVlcywgb3IgcmVjdXJzaXZlbHkgY29tcGFyZSAyIEpTT04gb2JqZWN0cyBvciBhcnJheXNcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYlxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIGEgYW5kIGIgYXJlIHJlY3Vyc2l2ZWx5IGVxdWFsXG4gKi9cbmZ1bmN0aW9uIGRlZXBFcXVhbHMoYSwgYikge1xuXHRpZihhID09PSBiKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gY29tcGFyZUFycmF5cyhhLCBiKTtcblx0fVxuXG5cdGlmKHR5cGVvZiBhID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gY29tcGFyZU9iamVjdHMoYSwgYik7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYSwgYikge1xuXHRpZihhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwOyBpPGEubGVuZ3RoOyArK2kpIHtcblx0XHRpZighZGVlcEVxdWFscyhhW2ldLCBiW2ldKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlT2JqZWN0cyhhLCBiKSB7XG5cdGlmKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGFrZXlzID0gT2JqZWN0LmtleXMoYSk7XG5cdHZhciBia2V5cyA9IE9iamVjdC5rZXlzKGIpO1xuXG5cdGlmKGFrZXlzLmxlbmd0aCAhPT0gYmtleXMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMCwgazsgaTxha2V5cy5sZW5ndGg7ICsraSkge1xuXHRcdGsgPSBha2V5c1tpXTtcblx0XHRpZighKGsgaW4gYiAmJiBkZWVwRXF1YWxzKGFba10sIGJba10pKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufSIsInZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW52ZXJzZShwKSB7XG5cdHZhciBwciA9IFtdO1xuXHR2YXIgaSwgc2tpcDtcblx0Zm9yKGkgPSBwLmxlbmd0aC0xOyBpPj0gMDsgaSAtPSBza2lwKSB7XG5cdFx0c2tpcCA9IGludmVydE9wKHByLCBwW2ldLCBpLCBwKTtcblx0fVxuXG5cdHJldHVybiBwcjtcbn07XG5cbmZ1bmN0aW9uIGludmVydE9wKHBhdGNoLCBjLCBpLCBjb250ZXh0KSB7XG5cdHZhciBvcCA9IHBhdGNoZXNbYy5vcF07XG5cdHJldHVybiBvcCAhPT0gdm9pZCAwICYmIHR5cGVvZiBvcC5pbnZlcnNlID09PSAnZnVuY3Rpb24nXG5cdFx0PyBvcC5pbnZlcnNlKHBhdGNoLCBjLCBpLCBjb250ZXh0KVxuXHRcdDogMTtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuXG5leHBvcnRzLmFwcGx5ID0gcGF0Y2g7XG5leHBvcnRzLmFwcGx5SW5QbGFjZSA9IHBhdGNoSW5QbGFjZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuaXNWYWxpZE9iamVjdCA9IGlzVmFsaWRPYmplY3Q7XG5leHBvcnRzLmRlZmF1bHRIYXNoID0gZGVmYXVsdEhhc2g7XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuXG4vKipcbiAqIEFwcGx5IHRoZSBzdXBwbGllZCBKU09OIFBhdGNoIHRvIHhcbiAqIEBwYXJhbSB7YXJyYXl9IGNoYW5nZXMgSlNPTiBQYXRjaFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IG9wdGlvbnMuZmluZENvbnRleHRcbiAqICBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0XG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHBhdGNoZWQgdmVyc2lvbiBvZiB4LiBJZiB4IGlzXG4gKiAgYW4gYXJyYXkgb3Igb2JqZWN0LCBpdCB3aWxsIGJlIG11dGF0ZWQgYW5kIHJldHVybmVkLiBPdGhlcndpc2UsIGlmXG4gKiAgeCBpcyBhIHZhbHVlLCB0aGUgbmV3IHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIHBhdGNoKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0cmV0dXJuIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCBjbG9uZSh4KSwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdGlmKCFvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXHR9XG5cblx0Ly8gVE9ETzogQ29uc2lkZXIgdGhyb3dpbmcgaWYgY2hhbmdlcyBpcyBub3QgYW4gYXJyYXlcblx0aWYoIUFycmF5LmlzQXJyYXkoY2hhbmdlcykpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdHZhciBwYXRjaCwgcDtcblx0Zm9yKHZhciBpPTA7IGk8Y2hhbmdlcy5sZW5ndGg7ICsraSkge1xuXHRcdHAgPSBjaGFuZ2VzW2ldO1xuXHRcdHBhdGNoID0gcGF0Y2hlc1twLm9wXTtcblxuXHRcdGlmKHBhdGNoID09PSB2b2lkIDApIHtcblx0XHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignaW52YWxpZCBvcCAnICsgSlNPTi5zdHJpbmdpZnkocCkpO1xuXHRcdH1cblxuXHRcdHggPSBwYXRjaC5hcHBseSh4LCBwLCBvcHRpb25zKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0SGFzaCh4KSB7XG5cdHJldHVybiBpc1ZhbGlkT2JqZWN0KHgpID8gSlNPTi5zdHJpbmdpZnkoeCkgOiB4O1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIF9wYXJzZSA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXJQYXJzZScpO1xuXG5leHBvcnRzLmZpbmQgPSBmaW5kO1xuZXhwb3J0cy5qb2luID0gam9pbjtcbmV4cG9ydHMuYWJzb2x1dGUgPSBhYnNvbHV0ZTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMuZW5jb2RlU2VnbWVudCA9IGVuY29kZVNlZ21lbnQ7XG5leHBvcnRzLmRlY29kZVNlZ21lbnQgPSBkZWNvZGVTZWdtZW50O1xuZXhwb3J0cy5wYXJzZUFycmF5SW5kZXggPSBwYXJzZUFycmF5SW5kZXg7XG5leHBvcnRzLmlzVmFsaWRBcnJheUluZGV4ID0gaXNWYWxpZEFycmF5SW5kZXg7XG5cbi8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0yXG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIHNlcGFyYXRvclJ4ID0gL1xcLy9nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xudmFyIGVuY29kZWRTZXBhcmF0b3JSeCA9IC9+MS9nO1xuXG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlc2NhcGVSeCA9IC9+L2c7XG52YXIgZW5jb2RlZEVzY2FwZSA9ICd+MCc7XG52YXIgZW5jb2RlZEVzY2FwZVJ4ID0gL34wL2c7XG5cbi8qKlxuICogRmluZCB0aGUgcGFyZW50IG9mIHRoZSBzcGVjaWZpZWQgcGF0aCBpbiB4IGFuZCByZXR1cm4gYSBkZXNjcmlwdG9yXG4gKiBjb250YWluaW5nIHRoZSBwYXJlbnQgYW5kIGEga2V5LiAgSWYgdGhlIHBhcmVudCBkb2VzIG5vdCBleGlzdCBpbiB4LFxuICogcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZC5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4IG9iamVjdCBvciBhcnJheSBpbiB3aGljaCB0byBzZWFyY2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEpTT04gUG9pbnRlciBzdHJpbmcgKGVuY29kZWQpXG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBmaW5kQ29udGV4dFxuICogIG9wdGlvbmFsIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHQuICBJZiBwcm92aWRlZCwgY29udGV4dCBNVVNUIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcGFyYW0gez97YmVmb3JlOkFycmF5LCBhZnRlcjpBcnJheX19IGNvbnRleHQgb3B0aW9uYWwgcGF0Y2ggY29udGV4dCBmb3JcbiAqICBmaW5kQ29udGV4dCB0byB1c2UgdG8gYWRqdXN0IGFycmF5IGluZGljZXMuICBJZiBwcm92aWRlZCwgZmluZENvbnRleHQgTVVTVFxuICogIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcmV0dXJucyB7e3RhcmdldDpvYmplY3R8YXJyYXl8bnVtYmVyfHN0cmluZywga2V5OnN0cmluZ318dW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kKHgsIHBhdGgsIGZpbmRDb250ZXh0LCBjb250ZXh0KSB7XG5cdGlmKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmKHBhdGggPT09ICcnKSB7XG5cdFx0Ly8gd2hvbGUgZG9jdW1lbnRcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogdm9pZCAwIH07XG5cdH1cblxuXHRpZihwYXRoID09PSBzZXBhcmF0b3IpIHtcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogJycgfTtcblx0fVxuXG5cdHZhciBwYXJlbnQgPSB4LCBrZXk7XG5cdHZhciBoYXNDb250ZXh0ID0gY29udGV4dCAhPT0gdm9pZCAwO1xuXG5cdF9wYXJzZShwYXRoLCBmdW5jdGlvbihzZWdtZW50KSB7XG5cdFx0Ly8gaG0uLi4gdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBiZSBpZih0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0aWYoeCA9PSBudWxsKSB7XG5cdFx0XHQvLyBTaWduYWwgdGhhdCB3ZSBwcmVtYXR1cmVseSBoaXQgdGhlIGVuZCBvZiB0aGUgcGF0aCBoaWVyYXJjaHkuXG5cdFx0XHRwYXJlbnQgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRcdGtleSA9IGhhc0NvbnRleHRcblx0XHRcdFx0PyBmaW5kSW5kZXgoZmluZENvbnRleHQsIHBhcnNlQXJyYXlJbmRleChzZWdtZW50KSwgeCwgY29udGV4dClcblx0XHRcdFx0OiBzZWdtZW50ID09PSAnLScgPyBzZWdtZW50IDogcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXkgPSBzZWdtZW50O1xuXHRcdH1cblxuXHRcdHBhcmVudCA9IHg7XG5cdFx0eCA9IHhba2V5XTtcblx0fSk7XG5cblx0cmV0dXJuIHBhcmVudCA9PT0gbnVsbFxuXHRcdD8gdm9pZCAwXG5cdFx0OiB7IHRhcmdldDogcGFyZW50LCBrZXk6IGtleSB9O1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZShwYXRoKSB7XG5cdHJldHVybiBwYXRoWzBdID09PSBzZXBhcmF0b3IgPyBwYXRoIDogc2VwYXJhdG9yICsgcGF0aDtcbn1cblxuZnVuY3Rpb24gam9pbihzZWdtZW50cykge1xuXHRyZXR1cm4gc2VnbWVudHMuam9pbihzZXBhcmF0b3IpO1xufVxuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG5cdHZhciBzZWdtZW50cyA9IFtdO1xuXHRfcGFyc2UocGF0aCwgc2VnbWVudHMucHVzaC5iaW5kKHNlZ21lbnRzKSk7XG5cdHJldHVybiBzZWdtZW50cztcbn1cblxuZnVuY3Rpb24gY29udGFpbnMoYSwgYikge1xuXHRyZXR1cm4gYi5pbmRleE9mKGEpID09PSAwICYmIGJbYS5sZW5ndGhdID09PSBzZXBhcmF0b3I7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZW5jb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBkZWNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZGVjb2RlU2VnbWVudChzKSB7XG5cdC8vIFNlZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcblx0cmV0dXJuIHMucmVwbGFjZShlbmNvZGVkU2VwYXJhdG9yUngsIHNlcGFyYXRvcikucmVwbGFjZShlbmNvZGVkRXNjYXBlUngsIGVzY2FwZUNoYXIpO1xufVxuXG4vKipcbiAqIEVuY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGRlY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZW5jb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGVuY29kZVNlZ21lbnQocykge1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVzY2FwZVJ4LCBlbmNvZGVkRXNjYXBlKS5yZXBsYWNlKHNlcGFyYXRvclJ4LCBlbmNvZGVkU2VwYXJhdG9yKTtcbn1cblxudmFyIGFycmF5SW5kZXhSeCA9IC9eKDB8WzEtOV1cXGQqKSQvO1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHMgaXMgYSB2YWxpZCBKU09OIFBvaW50ZXIgYXJyYXkgaW5kZXhcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXgocykge1xuXHRyZXR1cm4gYXJyYXlJbmRleFJ4LnRlc3Qocyk7XG59XG5cbi8qKlxuICogU2FmZWx5IHBhcnNlIGEgc3RyaW5nIGludG8gYSBudW1iZXIgPj0gMC4gRG9lcyBub3QgY2hlY2sgZm9yIGRlY2ltYWwgbnVtYmVyc1xuICogQHBhcmFtIHtzdHJpbmd9IHMgbnVtZXJpYyBzdHJpbmdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IG51bWJlciA+PSAwXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleCAocykge1xuXHRpZihpc1ZhbGlkQXJyYXlJbmRleChzKSkge1xuXHRcdHJldHVybiArcztcblx0fVxuXG5cdHRocm93IG5ldyBTeW50YXhFcnJvcignaW52YWxpZCBhcnJheSBpbmRleCAnICsgcyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbmRleCAoZmluZENvbnRleHQsIHN0YXJ0LCBhcnJheSwgY29udGV4dCkge1xuXHR2YXIgaW5kZXggPSBzdGFydDtcblxuXHRpZihpbmRleCA8IDApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2FycmF5IGluZGV4IG91dCBvZiBib3VuZHMgJyArIGluZGV4KTtcblx0fVxuXG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCAmJiB0eXBlb2YgZmluZENvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRpbmRleCA9IGZpbmRDb250ZXh0KHN0YXJ0LCBhcnJheSwgY29udGV4dCk7XG5cdFx0aWYoaW5kZXggPCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIHBhdGNoIGNvbnRleHQgJyArIGNvbnRleHQpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBpbmRleDtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uUG9pbnRlclBhcnNlO1xuXG52YXIgcGFyc2VSeCA9IC9cXC98fjF8fjAvZztcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcblxuLyoqXG4gKiBQYXJzZSB0aHJvdWdoIGFuIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZywgZGVjb2RpbmcgZWFjaCBwYXRoIHNlZ21lbnRcbiAqIGFuZCBwYXNzaW5nIGl0IHRvIGFuIG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjc2VjdGlvbi00XG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmdcbiAqIEBwYXJhbSB7e2Z1bmN0aW9uKHNlZ21lbnQ6c3RyaW5nKTpib29sZWFufX0gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBvcmlnaW5hbCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGpzb25Qb2ludGVyUGFyc2UocGF0aCwgb25TZWdtZW50KSB7XG5cdHZhciBwb3MsIGFjY3VtLCBtYXRjaGVzLCBtYXRjaDtcblxuXHRwb3MgPSBwYXRoLmNoYXJBdCgwKSA9PT0gc2VwYXJhdG9yID8gMSA6IDA7XG5cdGFjY3VtID0gJyc7XG5cdHBhcnNlUngubGFzdEluZGV4ID0gcG9zO1xuXG5cdHdoaWxlKG1hdGNoZXMgPSBwYXJzZVJ4LmV4ZWMocGF0aCkpIHtcblxuXHRcdG1hdGNoID0gbWF0Y2hlc1swXTtcblx0XHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcywgcGFyc2VSeC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuXHRcdHBvcyA9IHBhcnNlUngubGFzdEluZGV4O1xuXG5cdFx0aWYobWF0Y2ggPT09IHNlcGFyYXRvcikge1xuXHRcdFx0aWYgKG9uU2VnbWVudChhY2N1bSkgPT09IGZhbHNlKSByZXR1cm4gcGF0aDtcblx0XHRcdGFjY3VtID0gJyc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFjY3VtICs9IG1hdGNoID09PSBlbmNvZGVkU2VwYXJhdG9yID8gc2VwYXJhdG9yIDogZXNjYXBlQ2hhcjtcblx0XHR9XG5cdH1cblxuXHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcyk7XG5cdG9uU2VnbWVudChhY2N1bSk7XG5cblx0cmV0dXJuIHBhdGg7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb21wYXJlID0gY29tcGFyZTtcbmV4cG9ydHMucmVkdWNlID0gcmVkdWNlO1xuXG52YXIgUkVNT1ZFLCBSSUdIVCwgQURELCBET1dOLCBTS0lQO1xuXG5leHBvcnRzLlJFTU9WRSA9IFJFTU9WRSA9IFJJR0hUID0gLTE7XG5leHBvcnRzLkFERCAgICA9IEFERCAgICA9IERPV04gID0gIDE7XG5leHBvcnRzLkVRVUFMICA9IFNLSVAgICA9IDA7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGxjcyBjb21wYXJpc29uIG1hdHJpeCBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlc1xuICogYmV0d2VlbiB0d28gYXJyYXktbGlrZSBzZXF1ZW5jZXNcbiAqIEBwYXJhbSB7YXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHBhcmFtIHthcnJheX0gYiBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBsY3MgZGVzY3JpcHRvciwgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcmVkdWNlKClcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG5cdHZhciBjb2xzID0gYS5sZW5ndGg7XG5cdHZhciByb3dzID0gYi5sZW5ndGg7XG5cblx0dmFyIHByZWZpeCA9IGZpbmRQcmVmaXgoYSwgYik7XG5cdHZhciBzdWZmaXggPSBwcmVmaXggPCBjb2xzICYmIHByZWZpeCA8IHJvd3Ncblx0XHQ/IGZpbmRTdWZmaXgoYSwgYiwgcHJlZml4KVxuXHRcdDogMDtcblxuXHR2YXIgcmVtb3ZlID0gc3VmZml4ICsgcHJlZml4IC0gMTtcblx0Y29scyAtPSByZW1vdmU7XG5cdHJvd3MgLT0gcmVtb3ZlO1xuXHR2YXIgbWF0cml4ID0gY3JlYXRlTWF0cml4KGNvbHMsIHJvd3MpO1xuXG5cdGZvciAodmFyIGogPSBjb2xzIC0gMTsgaiA+PSAwOyAtLWopIHtcblx0XHRmb3IgKHZhciBpID0gcm93cyAtIDE7IGkgPj0gMDsgLS1pKSB7XG5cdFx0XHRtYXRyaXhbaV1bal0gPSBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBwcmVmaXgsIGosIGkpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0cHJlZml4OiBwcmVmaXgsXG5cdFx0bWF0cml4OiBtYXRyaXgsXG5cdFx0c3VmZml4OiBzdWZmaXhcblx0fTtcbn1cblxuLyoqXG4gKiBSZWR1Y2UgYSBzZXQgb2YgbGNzIGNoYW5nZXMgcHJldmlvdXNseSBjcmVhdGVkIHVzaW5nIGNvbXBhcmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24ocmVzdWx0OiosIHR5cGU6bnVtYmVyLCBpOm51bWJlciwgajpudW1iZXIpfSBmXG4gKiAgcmVkdWNlciBmdW5jdGlvbiwgd2hlcmU6XG4gKiAgLSByZXN1bHQgaXMgdGhlIGN1cnJlbnQgcmVkdWNlIHZhbHVlLFxuICogIC0gdHlwZSBpcyB0aGUgdHlwZSBvZiBjaGFuZ2U6IEFERCwgUkVNT1ZFLCBvciBTS0lQXG4gKiAgLSBpIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGJcbiAqICAtIGogaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYVxuICogQHBhcmFtIHsqfSByIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3MgcmVzdWx0cyByZXR1cm5lZCBieSBjb21wYXJlKClcbiAqIEByZXR1cm5zIHsqfSB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuICovXG5mdW5jdGlvbiByZWR1Y2UoZiwgciwgbGNzKSB7XG5cdHZhciBpLCBqLCBrLCBvcDtcblxuXHR2YXIgbSA9IGxjcy5tYXRyaXg7XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBwcmVmaXhcblx0dmFyIGwgPSBsY3MucHJlZml4O1xuXHRmb3IoaSA9IDA7aSA8IGw7ICsraSkge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGksIGkpO1xuXHR9XG5cblx0Ly8gUmVkdWNlIGxvbmdlc3QgY2hhbmdlIHNwYW5cblx0ayA9IGk7XG5cdGwgPSBtLmxlbmd0aDtcblx0aSA9IDA7XG5cdGogPSAwO1xuXHR3aGlsZShpIDwgbCkge1xuXHRcdG9wID0gbVtpXVtqXS50eXBlO1xuXHRcdHIgPSBmKHIsIG9wLCBpK2ssIGorayk7XG5cblx0XHRzd2l0Y2gob3ApIHtcblx0XHRcdGNhc2UgU0tJUDogICsraTsgKytqOyBicmVhaztcblx0XHRcdGNhc2UgUklHSFQ6ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIERPV046ICArK2k7IGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlZHVjZSBzaGFyZWQgc3VmZml4XG5cdGkgKz0gaztcblx0aiArPSBrO1xuXHRsID0gbGNzLnN1ZmZpeDtcblx0Zm9yKGsgPSAwO2sgPCBsOyArK2spIHtcblx0XHRyID0gZihyLCBTS0lQLCBpK2ssIGorayk7XG5cdH1cblxuXHRyZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gZmluZFByZWZpeChhLCBiKSB7XG5cdHZhciBpID0gMDtcblx0dmFyIGwgPSBNYXRoLm1pbihhLmxlbmd0aCwgYi5sZW5ndGgpO1xuXHR3aGlsZShpIDwgbCAmJiBhW2ldID09PSBiW2ldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBmaW5kU3VmZml4KGEsIGIpIHtcblx0dmFyIGFsID0gYS5sZW5ndGggLSAxO1xuXHR2YXIgYmwgPSBiLmxlbmd0aCAtIDE7XG5cdHZhciBsID0gTWF0aC5taW4oYWwsIGJsKTtcblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBhW2FsLWldID09PSBiW2JsLWldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBzdGFydCwgaiwgaSkge1xuXHRpZiAoYVtqK3N0YXJ0XSA9PT0gYltpK3N0YXJ0XSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2ogKyAxXS52YWx1ZSwgdHlwZTogU0tJUCB9O1xuXHR9XG5cdGlmIChtYXRyaXhbaV1baiArIDFdLnZhbHVlIDwgbWF0cml4W2kgKyAxXVtqXS52YWx1ZSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaV1baiArIDFdLnZhbHVlICsgMSwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2pdLnZhbHVlICsgMSwgdHlwZTogRE9XTiB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYXRyaXggKGNvbHMsIHJvd3MpIHtcblx0dmFyIG0gPSBbXSwgaSwgaiwgbGFzdHJvdztcblxuXHQvLyBGaWxsIHRoZSBsYXN0IHJvd1xuXHRsYXN0cm93ID0gbVtyb3dzXSA9IFtdO1xuXHRmb3IgKGogPSAwOyBqPGNvbHM7ICsraikge1xuXHRcdGxhc3Ryb3dbal0gPSB7IHZhbHVlOiBjb2xzIC0gaiwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY29sXG5cdGZvciAoaSA9IDA7IGk8cm93czsgKytpKSB7XG5cdFx0bVtpXSA9IFtdO1xuXHRcdG1baV1bY29sc10gPSB7IHZhbHVlOiByb3dzIC0gaSwgdHlwZTogRE9XTiB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjZWxsXG5cdG1bcm93c11bY29sc10gPSB7IHZhbHVlOiAwLCB0eXBlOiBTS0lQIH07XG5cblx0cmV0dXJuIG07XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgZGVlcEVxdWFscyA9IHJlcXVpcmUoJy4vZGVlcEVxdWFscycpO1xudmFyIGNvbW11dGVQYXRocyA9IHJlcXVpcmUoJy4vY29tbXV0ZVBhdGhzJyk7XG5cbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxudmFyIFRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vVGVzdEZhaWxlZEVycm9yJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG52YXIgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBmaW5kID0ganNvblBvaW50ZXIuZmluZDtcbnZhciBwYXJzZUFycmF5SW5kZXggPSBqc29uUG9pbnRlci5wYXJzZUFycmF5SW5kZXg7XG5cbmV4cG9ydHMudGVzdCA9IHtcblx0YXBwbHk6IGFwcGx5VGVzdCxcblx0aW52ZXJzZTogaW52ZXJ0VGVzdCxcblx0Y29tbXV0ZTogY29tbXV0ZVRlc3Rcbn07XG5cbmV4cG9ydHMuYWRkID0ge1xuXHRhcHBseTogYXBwbHlBZGQsXG5cdGludmVyc2U6IGludmVydEFkZCxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuZXhwb3J0cy5yZW1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseVJlbW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVtb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVtb3ZlXG59O1xuXG5leHBvcnRzLnJlcGxhY2UgPSB7XG5cdGFwcGx5OiBhcHBseVJlcGxhY2UsXG5cdGludmVyc2U6IGludmVydFJlcGxhY2UsXG5cdGNvbW11dGU6IGNvbW11dGVSZXBsYWNlXG59O1xuXG5leHBvcnRzLm1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseU1vdmUsXG5cdGludmVyc2U6IGludmVydE1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVNb3ZlXG59O1xuXG5leHBvcnRzLmNvcHkgPSB7XG5cdGFwcGx5OiBhcHBseUNvcHksXG5cdGludmVyc2U6IG5vdEludmVydGlibGUsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbi8qKlxuICogQXBwbHkgYSB0ZXN0IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IHRlc3QgdGVzdCBvcGVyYXRpb25cbiAqIEB0aHJvd3Mge1Rlc3RGYWlsZWRFcnJvcn0gaWYgdGhlIHRlc3Qgb3BlcmF0aW9uIGZhaWxzXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlUZXN0KHgsIHRlc3QsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIHRlc3QucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgdGVzdC5jb250ZXh0KTtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXHR2YXIgaW5kZXgsIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdGluZGV4ID0gcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KTtcblx0XHQvL2luZGV4ID0gZmluZEluZGV4KG9wdGlvbnMuZmluZENvbnRleHQsIGluZGV4LCB0YXJnZXQsIHRlc3QuY29udGV4dCk7XG5cdFx0dmFsdWUgPSB0YXJnZXRbaW5kZXhdO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gcG9pbnRlci5rZXkgPT09IHZvaWQgMCA/IHBvaW50ZXIudGFyZ2V0IDogcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldO1xuXHR9XG5cblx0aWYoIWRlZXBFcXVhbHModmFsdWUsIHRlc3QudmFsdWUpKSB7XG5cdFx0dGhyb3cgbmV3IFRlc3RGYWlsZWRFcnJvcigndGVzdCBmYWlsZWQgJyArIEpTT04uc3RyaW5naWZ5KHRlc3QpKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG4vKipcbiAqIEludmVydCB0aGUgcHJvdmlkZWQgdGVzdCBhbmQgYWRkIGl0IHRvIHRoZSBpbnZlcnRlZCBwYXRjaCBzZXF1ZW5jZVxuICogQHBhcmFtIHByXG4gKiBAcGFyYW0gdGVzdFxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gaW52ZXJ0VGVzdChwciwgdGVzdCkge1xuXHRwci5wdXNoKHRlc3QpO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVRlc3QodGVzdCwgYikge1xuXHRpZih0ZXN0LnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSB0ZXN0LHJlbW92ZSAtPiByZW1vdmUsdGVzdCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCB0ZXN0XTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHModGVzdCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYW4gYWRkIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBhZGQgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5QWRkKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbCA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWw7XG5cdH1cblxuXHRfYWRkKHBvaW50ZXIsIHZhbCk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfYWRkKHBvaW50ZXIsIHZhbHVlKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHQvLyAnLScgaW5kaWNhdGVzICdhcHBlbmQnIHRvIGFycmF5XG5cdFx0aWYocG9pbnRlci5rZXkgPT09ICctJykge1xuXHRcdFx0dGFyZ2V0LnB1c2godmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuc3BsaWNlKHBvaW50ZXIua2V5LCAwLCB2YWx1ZSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIGFkZCBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheSAnICsgcG9pbnRlci5rZXkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydEFkZChwciwgYWRkKSB7XG5cdHZhciBjb250ZXh0ID0gYWRkLmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMoYWRkLnZhbHVlLCBjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogYWRkLnBhdGgsIHZhbHVlOiBhZGQudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IGFkZC5wYXRoLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZUFkZE9yQ29weShhZGQsIGIpIHtcblx0aWYoYWRkLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBhZGQscmVtb3ZlIC0+IHJlbW92ZSxhZGQgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhhZGQsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVwbGFjZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVwbGFjZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZXBsYWNlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBtaXNzaW5nVmFsdWUocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWx1ZSA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVwbGFjZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlcGxhY2Ugdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKHByZXYudmFsdWUsIGFycmF5LnRhaWwoY29udGV4dC5hZnRlcikpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IGMudmFsdWUgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlIH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlcGxhY2UocmVwbGFjZSwgYikge1xuXHRpZihyZXBsYWNlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSByZXBsYWNlLHJlbW92ZSAtPiByZW1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCByZXBsYWNlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVwbGFjZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZW1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZW1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdC8vIGtleSBtdXN0IGV4aXN0IGZvciByZW1vdmVcblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDApIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdF9yZW1vdmUocG9pbnRlcik7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlIChwb2ludGVyKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHR2YXIgcmVtb3ZlZDtcblx0aWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXQuc3BsaWNlKHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSksIDEpO1xuXHRcdHJldHVybiByZW1vdmVkWzBdO1xuXG5cdH0gZWxzZSBpZiAoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0ZGVsZXRlIHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0cmV0dXJuIHJlbW92ZWQ7XG5cblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiByZW1vdmUgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXknKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRSZW1vdmUocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZW1vdmUgdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZW1vdmUocmVtb3ZlLCBiKSB7XG5cdGlmKHJlbW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlbW92ZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlbW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseU1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdGlmKGpzb25Qb2ludGVyLmNvbnRhaW5zKGNoYW5nZS5wYXRoLCBjaGFuZ2UuZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ21vdmUuZnJvbSBjYW5ub3QgYmUgYW5jZXN0b3Igb2YgbW92ZS5wYXRoJyk7XG5cdH1cblxuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdF9hZGQocHRvLCBfcmVtb3ZlKHBmcm9tKSk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRNb3ZlKHByLCBjKSB7XG5cdHByLnB1c2goeyBvcDogJ21vdmUnLFxuXHRcdHBhdGg6IGMuZnJvbSwgY29udGV4dDogYy5mcm9tQ29udGV4dCxcblx0XHRmcm9tOiBjLnBhdGgsIGZyb21Db250ZXh0OiBjLmNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlTW92ZShtb3ZlLCBiKSB7XG5cdGlmKG1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIG1vdmUscmVtb3ZlIC0+IG1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKG1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgY29weSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgY29weSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlDb3B5KHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBmcm9tKSB8fCBtaXNzaW5nVmFsdWUocGZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdjb3B5LmZyb20gbXVzdCBleGlzdCcpO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBmcm9tLnRhcmdldDtcblx0dmFyIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwZnJvbS5rZXkpXTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwZnJvbS5rZXldO1xuXHR9XG5cblx0X2FkZChwdG8sIGNsb25lKHZhbHVlKSk7XG5cdHJldHVybiB4O1xufVxuXG4vLyBOT1RFOiBDb3B5IGlzIG5vdCBpbnZlcnRpYmxlXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy9qaWZmL2lzc3Vlcy85XG4vLyBUaGlzIG5lZWRzIG1vcmUgdGhvdWdodC4gV2UgbWF5IGhhdmUgdG8gZXh0ZW5kL2FtZW5kIEpTT04gUGF0Y2guXG4vLyBBdCBmaXJzdCBnbGFuY2UsIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQganVzdCBiZSBhIHJlbW92ZS5cbi8vIEhvd2V2ZXIsIHRoYXQncyBub3QgY29ycmVjdC4gIEl0IHZpb2xhdGVzIHRoZSBpbnZvbHV0aW9uOlxuLy8gaW52ZXJ0KGludmVydChwKSkgfj0gcC4gIEZvciBleGFtcGxlOlxuLy8gaW52ZXJ0KGNvcHkpIC0+IHJlbW92ZVxuLy8gaW52ZXJ0KHJlbW92ZSkgLT4gYWRkXG4vLyB0aHVzOiBpbnZlcnQoaW52ZXJ0KGNvcHkpKSAtPiBhZGQgKERPSCEgdGhpcyBzaG91bGQgYmUgY29weSEpXG5cbmZ1bmN0aW9uIG5vdEludmVydGlibGUoXywgYykge1xuXHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgJyArIGMub3ApO1xufVxuXG5mdW5jdGlvbiBub3RGb3VuZCAocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlciA9PT0gdm9pZCAwIHx8IChwb2ludGVyLnRhcmdldCA9PSBudWxsICYmIHBvaW50ZXIua2V5ICE9PSB2b2lkIDApO1xufVxuXG5mdW5jdGlvbiBtaXNzaW5nVmFsdWUocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlci5rZXkgIT09IHZvaWQgMCAmJiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB4IGlzIGEgbm9uLW51bGwgb2JqZWN0XG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0Jztcbn1cbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUkgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSVxyXG5cclxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXHJcblJlYWRPbmx5UHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlcidcclxuR29vZ2xlRHJpdmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlcidcclxuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXHJcblxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkQ29udGVudFxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICBAc3RhdGUgPVxyXG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXHJcbiAgICBAX2xpc3RlbmVycyA9IFtdXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF91aSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUkgQFxyXG4gICAgQHByb3ZpZGVycyA9IHt9XHJcblxyXG4gIHNldEFwcE9wdGlvbnM6IChAYXBwT3B0aW9ucyA9IHt9KS0+XHJcbiAgICAjIGZsdGVyIGZvciBhdmFpbGFibGUgcHJvdmlkZXJzXHJcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxyXG4gICAgZm9yIFByb3ZpZGVyIGluIFtSZWFkT25seVByb3ZpZGVyLCBMb2NhbFN0b3JhZ2VQcm92aWRlciwgR29vZ2xlRHJpdmVQcm92aWRlciwgRG9jdW1lbnRTdG9yZVByb3ZpZGVyXVxyXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxyXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXHJcblxyXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBAYXBwT3B0aW9ucy5wcm92aWRlcnMgPSBbXVxyXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcclxuICAgICAgICBhcHBPcHRpb25zLnByb3ZpZGVycy5wdXNoIHByb3ZpZGVyTmFtZVxyXG5cclxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xyXG4gICAgYXZhaWxhYmxlUHJvdmlkZXJzID0gW11cclxuICAgIGZvciBwcm92aWRlciBpbiBAYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXHJcbiAgICAgICMgbWVyZ2UgaW4gb3RoZXIgb3B0aW9ucyBhcyBuZWVkZWRcclxuICAgICAgcHJvdmlkZXJPcHRpb25zLm1pbWVUeXBlID89IEBhcHBPcHRpb25zLm1pbWVUeXBlXHJcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcclxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9ucywgQFxyXG4gICAgICAgICAgQHByb3ZpZGVyc1twcm92aWRlck5hbWVdID0gcHJvdmlkZXJcclxuICAgICAgICAgIGF2YWlsYWJsZVByb3ZpZGVycy5wdXNoIHByb3ZpZGVyXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXHJcbiAgICBAX3NldFN0YXRlIGF2YWlsYWJsZVByb3ZpZGVyczogYXZhaWxhYmxlUHJvdmlkZXJzXHJcblxyXG4gICAgIyBhZGQgc2luZ2xldG9uIHNoYXJlUHJvdmlkZXIsIGlmIGl0IGV4aXN0c1xyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgcHJvdmlkZXIuY2FuICdzaGFyZSdcclxuICAgICAgICBAX3NldFN0YXRlIHNoYXJlUHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgYnJlYWtcclxuXHJcbiAgICBAYXBwT3B0aW9ucy51aSBvcj0ge31cclxuICAgIEBhcHBPcHRpb25zLnVpLndpbmRvd1RpdGxlU3VmZml4IG9yPSBkb2N1bWVudC50aXRsZVxyXG4gICAgQGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTZXBhcmF0b3Igb3I9ICcgLSAnXHJcbiAgICBAX3NldFdpbmRvd1RpdGxlKClcclxuXHJcbiAgICBAX3VpLmluaXQgQGFwcE9wdGlvbnMudWlcclxuXHJcbiAgICAjIGNoZWNrIGZvciBhdXRvc2F2ZVxyXG4gICAgaWYgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW5pdGlhbGl6ZSB0aGUgY2xvdWRDb250ZW50RmFjdG9yeSB3aXRoIGFsbCBkYXRhIHdlIHdhbnQgaW4gdGhlIGVudmVsb3BlXHJcbiAgICBjbG91ZENvbnRlbnRGYWN0b3J5LnNldEVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgYXBwTmFtZTogQGFwcE9wdGlvbnMuYXBwTmFtZSBvciBcIlwiXHJcbiAgICAgIGFwcFZlcnNpb246IEBhcHBPcHRpb25zLmFwcFZlcnNpb24gb3IgXCJcIlxyXG4gICAgICBhcHBCdWlsZE51bTogQGFwcE9wdGlvbnMuYXBwQnVpbGROdW0gb3IgXCJcIlxyXG5cclxuICAgIEBuZXdGaWxlT3BlbnNJbk5ld1RhYiA9IGlmIEBhcHBPcHRpb25zLnVpPy5oYXNPd25Qcm9wZXJ0eSgnbmV3RmlsZU9wZW5zSW5OZXdUYWInKSB0aGVuIEBhcHBPcHRpb25zLnVpLm5ld0ZpbGVPcGVuc0luTmV3VGFiIGVsc2UgdHJ1ZVxyXG4gICAgQHNhdmVDb3B5T3BlbnNJbk5ld1RhYiA9IGlmIEBhcHBPcHRpb25zLnVpPy5oYXNPd25Qcm9wZXJ0eSgnc2F2ZUNvcHlPcGVuc0luTmV3VGFiJykgdGhlbiBAYXBwT3B0aW9ucy51aS5zYXZlQ29weU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXHJcblxyXG4gIHNldFByb3ZpZGVyT3B0aW9uczogKG5hbWUsIG5ld09wdGlvbnMpIC0+XHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5uYW1lIGlzIG5hbWVcclxuICAgICAgICBwcm92aWRlci5vcHRpb25zID89IHt9XHJcbiAgICAgICAgZm9yIGtleSBvZiBuZXdPcHRpb25zXHJcbiAgICAgICAgICBwcm92aWRlci5vcHRpb25zW2tleV0gPSBuZXdPcHRpb25zW2tleV1cclxuICAgICAgICBicmVha1xyXG5cclxuICBjb25uZWN0OiAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgbGlzdGVuOiAobGlzdGVuZXIpIC0+XHJcbiAgICBpZiBsaXN0ZW5lclxyXG4gICAgICBAX2xpc3RlbmVycy5wdXNoIGxpc3RlbmVyXHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5wcmVwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLnJlcGxhY2VNZW51SXRlbSBrZXksIGl0ZW07IEBcclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQmVmb3JlIGtleSwgaXRlbTsgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUFmdGVyIGtleSwgaXRlbTsgQFxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJywge2NvbnRlbnQ6IFwiXCJ9XHJcblxyXG4gIG5ld0ZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAbmV3RmlsZU9wZW5zSW5OZXdUYWJcclxuICAgICAgd2luZG93Lm9wZW4gQF9nZXRDdXJyZW50VXJsKCksICdfYmxhbmsnXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kaXJ0eVxyXG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIEBzYXZlKClcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uTkVXX0ZJTEUnXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcclxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBvcGVuU2hhcmVkQ29udGVudDogKGlkKSAtPlxyXG4gICAgQHN0YXRlLnNoYXJlUHJvdmlkZXI/LmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3ZlcndyaXRhYmxlOiBmYWxzZSwgb3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG5cclxuICBvcGVuU2F2ZWQ6IChwYXJhbXMpIC0+XHJcbiAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlclBhcmFtc10gPSBwYXJhbXMuc3BsaXQgJzonXHJcbiAgICBwcm92aWRlciA9IEBwcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgaWYgcHJvdmlkZXJcclxuICAgICAgcHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgICBpZiBhdXRob3JpemVkXHJcbiAgICAgICAgICBwcm92aWRlci5vcGVuU2F2ZWQgcHJvdmlkZXJQYXJhbXMsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICBAc2F2ZUNvbnRlbnQgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvbnRlbnQ6IChzdHJpbmdDb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlOiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgc2F2aW5nOiBtZXRhZGF0YVxyXG4gICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBpc250IG1ldGFkYXRhXHJcbiAgICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NhdmVkRmlsZScsIGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YSwge3NhdmVkOiB0cnVlfVxyXG4gICAgICAgIGNhbGxiYWNrPyBjdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChzdHJpbmdDb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29weURpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBzYXZlQ29weSA9IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgY29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHN0cmluZ0NvbnRlbnRcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIGlmIEBzYXZlQ29weU9wZW5zSW5OZXdUYWJcclxuICAgICAgICAgIHdpbmRvdy5vcGVuIEBfZ2V0Q3VycmVudFVybCBcIm9wZW5TYXZlZD0je21ldGFkYXRhLnByb3ZpZGVyLm5hbWV9OiN7ZW5jb2RlVVJJQ29tcG9uZW50IG1ldGFkYXRhLnByb3ZpZGVyLmdldE9wZW5TYXZlZFBhcmFtcyBtZXRhZGF0YX1cIlxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgQF91aS5zYXZlQ29weURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIGlmIHN0cmluZ0NvbnRlbnQgaXMgbnVsbFxyXG4gICAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpIC0+XHJcbiAgICAgICAgICBzYXZlQ29weSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgc2F2ZUNvcHkgc3RyaW5nQ29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgc2hhcmVHZXRMaW5rOiAtPlxyXG4gICAgc2hvd1NoYXJlRGlhbG9nID0gKHNoYXJlZERvY3VtZW50SWQpID0+XHJcbiAgICAgIEBfdWkuc2hhcmVVcmxEaWFsb2cgQF9nZXRDdXJyZW50VXJsIFwib3BlblNoYXJlZD0je3NoYXJlZERvY3VtZW50SWR9XCJcclxuXHJcbiAgICBzaGFyZWREb2N1bWVudElkID0gQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQgXCJzaGFyZWREb2N1bWVudElkXCJcclxuICAgIGlmIHNoYXJlZERvY3VtZW50SWRcclxuICAgICAgc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcclxuICAgIGVsc2VcclxuICAgICAgQHNoYXJlIChzaGFyZWREb2N1bWVudElkKSA9PlxyXG4gICAgICAgIEBkaXJ0eSgpXHJcbiAgICAgICAgc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcclxuXHJcbiAgc2hhcmVVcGRhdGU6IC0+XHJcbiAgICBAc2hhcmUoKVxyXG5cclxuICBzaGFyZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHN0YXRlLnNoYXJlUHJvdmlkZXJcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICBzaGFyaW5nOiB0cnVlXHJcbiAgICAgICAgY3VycmVudENvbnRlbnQgPSBAX2NyZWF0ZU9yVXBkYXRlQ3VycmVudENvbnRlbnQgc3RyaW5nQ29udGVudFxyXG4gICAgICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyLnNoYXJlIGN1cnJlbnRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIChlcnIsIHNoYXJlZENvbnRlbnRJZCkgPT5cclxuICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzaGFyZWRGaWxlJywgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgY2FsbGJhY2s/IHNoYXJlZENvbnRlbnRJZFxyXG5cclxuICByZXZlcnRUb1NoYXJlZDogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlkID0gQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcbiAgICBpZiBpZCBhbmQgQHN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyLmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudC5jb3B5TWV0YWRhdGFUbyBjb250ZW50XHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG4gICAgICAgIGNhbGxiYWNrPyBudWxsXHJcblxyXG4gIHJldmVydFRvU2hhcmVkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj8gYW5kIGNvbmZpcm0gdHIgXCJ+Q09ORklSTS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIlxyXG4gICAgICBAcmV2ZXJ0VG9TaGFyZWQgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICBAX3VpLmRvd25sb2FkRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgQGFwcE9wdGlvbnMubWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKGVyciwgbWV0YWRhdGEpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdyZW5hbWVkRmlsZScsIEBzdGF0ZS5jdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gbmV3TmFtZVxyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF91aS5yZW5hbWVEaWFsb2cgQHN0YXRlLm1ldGFkYXRhLm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICAgIEByZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGN1cnJlbnRseSBhY3RpdmUgZmlsZSdcclxuXHJcbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIEBzdGF0ZS5vcGVuZWRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBAc3RhdGUub3BlbmVkQ29udGVudC5jbG9uZSgpfVxyXG5cclxuICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBpZiBjb25maXJtIHRyICd+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORUQnXHJcbiAgICAgICAgQHJldmVydFRvTGFzdE9wZW5lZCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsP1xyXG5cclxuICBzaG93QmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XHJcbiAgICBAX3VpLmJsb2NraW5nTW9kYWwgbW9kYWxQcm9wc1xyXG5cclxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEsIGFkZGl0aW9uYWxTdGF0ZT17fSkgLT5cclxuICAgIG1ldGFkYXRhPy5vdmVyd3JpdGFibGUgPz0gdHJ1ZVxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBjdXJyZW50Q29udGVudDogY29udGVudFxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBhZGRpdGlvbmFsU3RhdGVcclxuICAgICAgc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX3NldFdpbmRvd1RpdGxlIG1ldGFkYXRhPy5uYW1lXHJcbiAgICBAX3NldFN0YXRlIHN0YXRlXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LmdldFRleHQoKX1cclxuXHJcbiAgX2V2ZW50OiAodHlwZSwgZGF0YSA9IHt9LCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcclxuICAgIGZvciBsaXN0ZW5lciBpbiBAX2xpc3RlbmVyc1xyXG4gICAgICBsaXN0ZW5lciBldmVudFxyXG5cclxuICBfc2V0U3RhdGU6IChvcHRpb25zKSAtPlxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcclxuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9ldmVudCAnc3RhdGVDaGFuZ2VkJ1xyXG5cclxuICBfcmVzZXRTdGF0ZTogLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgb3BlbmVkQ29udGVudDogbnVsbFxyXG4gICAgICBjdXJyZW50Q29udGVudDogbnVsbFxyXG4gICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG5cclxuICBfY2xvc2VDdXJyZW50RmlsZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnY2xvc2UnXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5jbG9zZSBAc3RhdGUubWV0YWRhdGFcclxuXHJcbiAgX2NyZWF0ZU9yVXBkYXRlQ3VycmVudENvbnRlbnQ6IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/XHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQHN0YXRlLmN1cnJlbnRDb250ZW50XHJcbiAgICAgIGN1cnJlbnRDb250ZW50LnNldFRleHQgc3RyaW5nQ29udGVudFxyXG4gICAgZWxzZVxyXG4gICAgICBjdXJyZW50Q29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHN0cmluZ0NvbnRlbnRcclxuICAgIGlmIG1ldGFkYXRhP1xyXG4gICAgICBjdXJyZW50Q29udGVudC5hZGRNZXRhZGF0YSBkb2NOYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICBjdXJyZW50Q29udGVudFxyXG5cclxuICBfZ2V0Q3VycmVudFVybDogKHF1ZXJ5U3RyaW5nID0gbnVsbCkgLT5cclxuICAgIHN1ZmZpeCA9IGlmIHF1ZXJ5U3RyaW5nPyB0aGVuIFwiPyN7cXVlcnlTdHJpbmd9XCIgZWxzZSBcIlwiXHJcbiAgICBcIiN7ZG9jdW1lbnQubG9jYXRpb24ub3JpZ2lufSN7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9I3tzdWZmaXh9XCJcclxuXHJcbiAgX3NldFdpbmRvd1RpdGxlOiAobmFtZSkgLT5cclxuICAgIGlmIEBhcHBPcHRpb25zPy51aT8ud2luZG93VGl0bGVTdWZmaXhcclxuICAgICAgZG9jdW1lbnQudGl0bGUgPSBcIiN7aWYgbmFtZT8ubGVuZ3RoID4gMCB0aGVuIG5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiKX0je0BhcHBPcHRpb25zLnVpLndpbmRvd1RpdGxlU2VwYXJhdG9yfSN7QGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTdWZmaXh9XCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxuZG9jdW1lbnRTdG9yZSA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb21cIlxyXG5hdXRob3JpemVVcmwgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2F1dGhlbnRpY2F0ZVwiXHJcbmNoZWNrTG9naW5VcmwgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvaW5mb1wiXHJcbmxpc3RVcmwgICAgICAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2FsbFwiXHJcbmxvYWREb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L29wZW5cIlxyXG5zYXZlRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9zYXZlXCJcclxucGF0Y2hEb2N1bWVudFVybCAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcGF0Y2hcIlxyXG5yZW1vdmVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9kZWxldGVcIlxyXG5yZW5hbWVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9yZW5hbWVcIlxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5qaWZmID0gcmVxdWlyZSAnamlmZidcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkRvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGRvY1N0b3JlQXZhaWxhYmxlOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX29uRG9jU3RvcmVMb2FkZWQgPT5cclxuICAgICAgQHNldFN0YXRlIGRvY1N0b3JlQXZhaWxhYmxlOiB0cnVlXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1hdXRoJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWNvbmNvcmQtbG9nbyd9LCAnJylcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtZm9vdGVyJ30sXHJcbiAgICAgICAgaWYgQHN0YXRlLmRvY1N0b3JlQXZhaWxhYmxlXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0xvZ2luIHRvIENvbmNvcmQnKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICdUcnlpbmcgdG8gbG9nIGludG8gQ29uY29yZC4uLidcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxuY2xhc3MgRG9jdW1lbnRTdG9yZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIHNoYXJlOiB0cnVlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gICAgQHVzZXIgPSBudWxsXHJcblxyXG4gIEBOYW1lOiAnZG9jdW1lbnRTdG9yZSdcclxuXHJcbiAgcHJldmlvdXNseVNhdmVkQ29udGVudDogbnVsbFxyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICBlbHNlXHJcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IC0+XHJcbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXHJcblxyXG4gIF9vbkRvY1N0b3JlTG9hZGVkOiAoQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXHJcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxyXG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxyXG4gICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcblxyXG4gIF9jaGVja0xvZ2luOiAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGNoZWNrTG9naW5VcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5XaW5kb3c6IG51bGxcclxuXHJcbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgYW5kIG5vdCBAX2xvZ2luV2luZG93LmNsb3NlZFxyXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcclxuICAgIGVsc2VcclxuXHJcbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxyXG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxyXG4gICAgICAgIHNjcmVlblRvcCAgPSB3aW5kb3cuc2NyZWVuVG9wICBvciBzY3JlZW4udG9wXHJcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxyXG5cclxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XHJcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXHJcbiAgICAgICAgcmV0dXJuIHtsZWZ0LCB0b3B9XHJcblxyXG4gICAgICB3aWR0aCA9IDEwMDBcclxuICAgICAgaGVpZ2h0ID0gNDgwXHJcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcclxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXHJcbiAgICAgICAgJ3dpZHRoPScgKyB3aWR0aFxyXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxyXG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcclxuICAgICAgICAnbGVmdD0nICsgcG9zaXRpb24ubGVmdCBvciAyMDBcclxuICAgICAgICAnZGVwZW5kZW50PXllcydcclxuICAgICAgICAncmVzaXphYmxlPW5vJ1xyXG4gICAgICAgICdsb2NhdGlvbj1ubydcclxuICAgICAgICAnZGlhbG9nPXllcydcclxuICAgICAgICAnbWVudWJhcj1ubydcclxuICAgICAgXVxyXG5cclxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXHJcblxyXG4gICAgICBwb2xsQWN0aW9uID0gPT5cclxuICAgICAgICB0cnlcclxuICAgICAgICAgIGhyZWYgPSBAX2xvZ2luV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxyXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcclxuICAgICAgICAgICAgQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICAgICAgY2F0Y2ggZVxyXG4gICAgICAgICAgIyBjb25zb2xlLmxvZyBlXHJcblxyXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGxpc3RVcmxcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWVcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgW11cclxuXHJcbiAgbG9hZFNoYXJlZENvbnRlbnQ6IChpZCwgY2FsbGJhY2spIC0+XHJcbiAgICBzaGFyZWRNZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIHNoYXJlZENvbnRlbnRJZDogaWRcclxuICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIG92ZXJ3cml0YWJsZTogZmFsc2VcclxuICAgIEBsb2FkIHNoYXJlZE1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxyXG4gICAgICBjYWxsYmFjayBlcnIsIGNvbnRlbnQsIHNoYXJlZE1ldGFkYXRhXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB3aXRoQ3JlZGVudGlhbHMgPSB1bmxlc3MgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlXHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiBsb2FkRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZCBvciBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAge3dpdGhDcmVkZW50aWFsc31cclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGRhdGFcclxuICAgICAgICBpZiBAb3B0aW9ucy5wYXRjaCB0aGVuIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50ID0gY29udGVudC5jbG9uZSgpXHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA/PSBkYXRhLmRvY05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBjb250ZW50XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIG1lc3NhZ2UgPSBpZiBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcclxuICAgICAgICAgIFwiVW5hYmxlIHRvIGxvYWQgZG9jdW1lbnQgJyN7bWV0YWRhdGEuc2hhcmVkQ29udGVudElkfScuIFBlcmhhcHMgdGhlIGZpbGUgd2FzIG5vdCBzaGFyZWQ/XCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkICN7bWV0YWRhdGEubmFtZSBvciBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yICdmaWxlJ31cIlxyXG4gICAgICAgIGNhbGxiYWNrIG1lc3NhZ2VcclxuXHJcbiAgc2hhcmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBydW5LZXkgPSBjb250ZW50LmdldChcInNoYXJlRWRpdEtleVwiKSBvciBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMilcclxuXHJcbiAgICBwYXJhbXMgPVxyXG4gICAgICBydW5LZXk6IHJ1bktleVxyXG5cclxuICAgIGlmIGNvbnRlbnQuZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxyXG4gICAgICBwYXJhbXMucmVjb3JkaWQgPSBjb250ZW50LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuXHJcbiAgICBjb250ZW50LmFkZE1ldGFkYXRhXHJcbiAgICAgIF9wZXJtaXNzaW9uczogMVxyXG4gICAgICBzaGFyZUVkaXRLZXk6IG51bGwgICAgICAgICAgICAjIHN0cmlwIHRoZXNlIG91dCBvZiB0aGUgc2hhcmVkIGRhdGEgaWYgdGhleVxyXG4gICAgICBzaGFyZWREb2N1bWVudElkOiBudWxsICAgICAgICAjIGV4aXN0ICh0aGV5J2xsIGJlIHJlLWFkZGVkIG9uIHN1Y2Nlc3MpXHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXMoc2F2ZURvY3VtZW50VXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogY29udGVudC5nZXRDb250ZW50QXNKU09OKClcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiBmYWxzZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjb250ZW50LmFkZE1ldGFkYXRhXHJcbiAgICAgICAgICBzaGFyZWREb2N1bWVudElkOiBkYXRhLmlkXHJcbiAgICAgICAgICBzaGFyZUVkaXRLZXk6IHJ1bktleVxyXG4gICAgICAgICAgX3Blcm1pc3Npb25zOiAwXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YS5pZFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBzYXZlIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgc2F2ZTogKGNsb3VkQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgY29udGVudCA9IGNsb3VkQ29udGVudC5nZXRDb250ZW50KClcclxuXHJcbiAgICBwYXJhbXMgPSB7fVxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkIHRoZW4gcGFyYW1zLnJlY29yZGlkID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcblxyXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXHJcbiAgICBjYW5PdmVyd3JpdGUgPSBtZXRhZGF0YS5vdmVyd3JpdGFibGUgYW5kIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50P1xyXG4gICAgaWYgY2FuT3ZlcndyaXRlIGFuZCBkaWZmID0gQF9jcmVhdGVEaWZmIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50LmdldENvbnRlbnQoKSwgY29udGVudFxyXG4gICAgICBzZW5kQ29udGVudCA9IGRpZmZcclxuICAgICAgdXJsID0gcGF0Y2hEb2N1bWVudFVybFxyXG4gICAgZWxzZVxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIHRoZW4gcGFyYW1zLnJlY29yZG5hbWUgPSBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIHVybCA9IHNhdmVEb2N1bWVudFVybFxyXG4gICAgICBzZW5kQ29udGVudCA9IGNvbnRlbnRcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyh1cmwsIHBhcmFtcylcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSBzZW5kQ29udGVudFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNsb3VkQ29udGVudC5jbG9uZSgpXHJcbiAgICAgICAgaWYgZGF0YS5pZCB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCA9IGRhdGEuaWRcclxuXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBzYXZlIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiByZW5hbWVEb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICBuZXdSZWNvcmRuYW1lOiBuZXdOYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHJlbmFtZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwcm92aWRlcjogQFxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgaWQ6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgQGxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpIC0+XHJcbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XHJcbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuXHJcbiAgX2FkZFBhcmFtczogKHVybCwgcGFyYW1zKSAtPlxyXG4gICAgcmV0dXJuIHVybCB1bmxlc3MgcGFyYW1zXHJcbiAgICBrdnAgPSBbXVxyXG4gICAgZm9yIGtleSwgdmFsdWUgb2YgcGFyYW1zXHJcbiAgICAgIGt2cC5wdXNoIFtrZXksIHZhbHVlXS5tYXAoZW5jb2RlVVJJKS5qb2luIFwiPVwiXHJcbiAgICByZXR1cm4gdXJsICsgXCI/XCIgKyBrdnAuam9pbiBcIiZcIlxyXG5cclxuICBfY3JlYXRlRGlmZjogKG9iajEsIG9iajIpIC0+XHJcbiAgICB0cnlcclxuICAgICAgb3B0cyA9XHJcbiAgICAgICAgaGFzaDogQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlmIHR5cGVvZiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaXMgXCJmdW5jdGlvblwiXHJcbiAgICAgICMgY2xlYW4gb2JqZWN0cyBiZWZvcmUgZGlmZmluZ1xyXG4gICAgICBjbGVhbmVkT2JqMSA9IEpTT04ucGFyc2UgSlNPTi5zdHJpbmdpZnkgb2JqMVxyXG4gICAgICBjbGVhbmVkT2JqMiA9IEpTT04ucGFyc2UgSlNPTi5zdHJpbmdpZnkgb2JqMlxyXG4gICAgICBkaWZmID0gamlmZi5kaWZmKGNsZWFuZWRPYmoxLCBjbGVhbmVkT2JqMiwgb3B0cylcclxuICAgICAgcmV0dXJuIGRpZmZcclxuICAgIGNhdGNoXHJcbiAgICAgIHJldHVybiBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50U3RvcmVQcm92aWRlclxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcbmpzZGlmZiA9IHJlcXVpcmUgJ2RpZmYnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAc2V0U3RhdGUgbG9hZGVkR0FQSTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuU0hPV19QT1BVUFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdnb29nbGUtZHJpdmUtYXV0aCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdnb29nbGUtZHJpdmUtY29uY29yZC1sb2dvJ30sICcnKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdnb29nbGUtZHJpdmUtZm9vdGVyJ30sXHJcbiAgICAgICAgaWYgQHN0YXRlLmxvYWRlZEdBUElcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnTG9naW4gdG8gR29vZ2xlJylcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAnVHJ5aW5nIHRvIGxvZyBpbnRvIEdvb2dsZS4uLidcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuR09PR0xFX0RSSVZFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiB0cnVlXHJcblxyXG4gICAgQGF1dGhUb2tlbiA9IG51bGxcclxuICAgIEB1c2VyID0gbnVsbFxyXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcclxuICAgIGlmIG5vdCBAY2xpZW50SWRcclxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsZURyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXHJcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxyXG4gICAgQHVzZVJlYWxUaW1lQVBJID0gQG9wdGlvbnMudXNlUmVhbFRpbWVBUEkgb3IgZmFsc2VcclxuICAgIGlmIEB1c2VSZWFsVGltZUFQSVxyXG4gICAgICBAbWltZVR5cGUgKz0gJytjZm1fcmVhbHRpbWUnXHJcbiAgICBAX2xvYWRHQVBJKClcclxuXHJcbiAgQE5hbWU6ICdnb29nbGVEcml2ZSdcclxuXHJcbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcclxuICBASU1NRURJQVRFID0gdHJ1ZVxyXG4gIEBTSE9XX1BPUFVQID0gZmFsc2VcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuICAgIGVsc2VcclxuICAgICAgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAoaW1tZWRpYXRlKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGFyZ3MgPVxyXG4gICAgICAgIGNsaWVudF9pZDogQGNsaWVudElkXHJcbiAgICAgICAgc2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZScsICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLnByb2ZpbGUnXVxyXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXHJcbiAgICAgIGdhcGkuYXV0aC5hdXRob3JpemUgYXJncywgKGF1dGhUb2tlbikgPT5cclxuICAgICAgICBAYXV0aFRva2VuID0gaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yIHRoZW4gYXV0aFRva2VuIGVsc2UgbnVsbFxyXG4gICAgICAgIEB1c2VyID0gbnVsbFxyXG4gICAgICAgIEBhdXRvUmVuZXdUb2tlbiBAYXV0aFRva2VuXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XHJcbiAgICAgICAgICAgIEB1c2VyID0gdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgYXV0b1JlbmV3VG9rZW46IChhdXRoVG9rZW4pIC0+XHJcbiAgICBpZiBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0IEBfYXV0b1JlbmV3VGltZW91dFxyXG4gICAgaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yXHJcbiAgICAgIEBfYXV0b1JlbmV3VGltZW91dCA9IHNldFRpbWVvdXQgKD0+IEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEUpLCAocGFyc2VJbnQoYXV0aFRva2VuLmV4cGlyZXNfaW4sIDEwKSAqIDAuNzUpICogMTAwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdnZHJpdmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBzYXZlOiAgKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX3NhdmVSZWFsVGltZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX3NhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGlmIEB1c2VSZWFsVGltZUFQSVxyXG4gICAgICAgIEBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9sb2FkRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMubGlzdFxyXG4gICAgICAgIHE6IHF1ZXJ5ID0gXCIoKG1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfScpIG9yIChtaW1lVHlwZSA9ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykpIGFuZCAnI3tpZiBtZXRhZGF0YSB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J30nIGluIHBhcmVudHNcIlxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1VuYWJsZSB0byBsaXN0IGZpbGVzJykgaWYgbm90IHJlc3VsdFxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXHJcbiAgICAgICAgICAgIHR5cGU6IGlmIGl0ZW0ubWltZVR5cGUgaXMgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcGFyZW50OiBtZXRhZGF0YVxyXG4gICAgICAgICAgICBvdmVyd3JpdGFibGU6IGl0ZW0uZWRpdGFibGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgICAgIGlkOiBpdGVtLmlkXHJcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxyXG4gICAgICAgICAgbG93ZXJBID0gYS5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMSBpZiBsb3dlckEgPiBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAwXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmRlbGV0ZVxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGNhbGxiYWNrPyByZXN1bHQ/LmVycm9yIG9yIG51bGxcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5wYXRjaFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgcmVzb3VyY2U6XHJcbiAgICAgICAgICB0aXRsZTogbmV3TmFtZVxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBpZiByZXN1bHQ/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjaz8gcmVzdWx0LmVycm9yXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcblxyXG4gIGNsb3NlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5yZWFsVGltZT8uZG9jP1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuZG9jLmNsb3NlKClcclxuXHJcbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cclxuICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICBpZDogb3BlblNhdmVkUGFyYW1zXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG5cclxuICBfbG9hZEdBUEk6IC0+XHJcbiAgICBpZiBub3Qgd2luZG93Ll9Mb2FkaW5nR0FQSVxyXG4gICAgICB3aW5kb3cuX0xvYWRpbmdHQVBJID0gdHJ1ZVxyXG4gICAgICB3aW5kb3cuX0dBUElPbkxvYWQgPSAtPlxyXG4gICAgICAgIEB3aW5kb3cuX0xvYWRlZEdBUEkgPSB0cnVlXHJcbiAgICAgIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ3NjcmlwdCdcclxuICAgICAgc2NyaXB0LnNyYyA9ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQuanM/b25sb2FkPV9HQVBJT25Mb2FkJ1xyXG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkIHNjcmlwdFxyXG5cclxuICBfbG9hZGVkR0FQSTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50c1xyXG4gICAgICBjYWxsYmFjaygpXHJcbiAgICBlbHNlXHJcbiAgICAgIHNlbGYgPSBAXHJcbiAgICAgIGNoZWNrID0gLT5cclxuICAgICAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElcclxuICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ2RyaXZlJywgJ3YyJywgLT5cclxuICAgICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnb2F1dGgyJywgJ3YyJywgLT5cclxuICAgICAgICAgICAgICBnYXBpLmxvYWQgJ2RyaXZlLXJlYWx0aW1lJywgLT5cclxuICAgICAgICAgICAgICAgIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHMgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsIHNlbGZcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG4gICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG5cclxuICBfbG9hZEZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZ2V0XHJcbiAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XHJcbiAgICAgIGlmIGZpbGU/LmRvd25sb2FkVXJsXHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IGZpbGUudGl0bGVcclxuICAgICAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSBmaWxlLmVkaXRhYmxlXHJcbiAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhID0gaWQ6IGZpbGUuaWRcclxuICAgICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICAgIHhoci5vcGVuICdHRVQnLCBmaWxlLmRvd25sb2FkVXJsXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje0BhdXRoVG9rZW4uYWNjZXNzX3Rva2VufVwiXHJcbiAgICAgICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCB4aHIucmVzcG9uc2VUZXh0XHJcbiAgICAgICAgeGhyLm9uZXJyb3IgPSAtPlxyXG4gICAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcclxuICAgICAgICB4aHIuc2VuZCgpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBAX2FwaUVycm9yIGZpbGUsICdVbmFibGUgdG8gZ2V0IGRvd25sb2FkIHVybCdcclxuXHJcbiAgX3NhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG5cclxuICAgIFttZXRob2QsIHBhdGhdID0gaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICBbJ1BVVCcsIFwiL3VwbG9hZC9kcml2ZS92Mi9maWxlcy8je21ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH1cIl1cclxuICAgIGVsc2VcclxuICAgICAgWydQT1NUJywgJy91cGxvYWQvZHJpdmUvdjIvZmlsZXMnXVxyXG5cclxuICAgIGJvZHkgPSBbXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxcclxcblxcclxcbiN7aGVhZGVyfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICN7QG1pbWVUeXBlfVxcclxcblxcclxcbiN7Y29udGVudC5nZXRDb250ZW50QXNKU09OKCl9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBmaWxlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbiAgX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHNlbGYgPSBAXHJcbiAgICBmaWxlTG9hZGVkID0gKGRvYykgLT5cclxuICAgICAgY29udGVudCA9IGRvYy5nZXRNb2RlbCgpLmdldFJvb3QoKS5nZXQgJ2NvbnRlbnQnXHJcbiAgICAgIGlmIG1ldGFkYXRhLm92ZXJ3cml0YWJsZVxyXG4gICAgICAgIHRocm93RXJyb3IgPSAoZSkgLT5cclxuICAgICAgICAgIGlmIG5vdCBlLmlzTG9jYWwgYW5kIGUuc2Vzc2lvbklkIGlzbnQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLnNlc3Npb25JZFxyXG4gICAgICAgICAgICBzZWxmLmNsaWVudC5zaG93QmxvY2tpbmdNb2RhbFxyXG4gICAgICAgICAgICAgIHRpdGxlOiAnQ29uY3VycmVudCBFZGl0IExvY2snXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0FuIGVkaXQgd2FzIG1hZGUgdG8gdGhpcyBmaWxlIGZyb20gYW5vdGhlciBicm93c2VyIHdpbmRvdy4gVGhpcyBhcHAgaXMgbm93IGxvY2tlZCBmb3IgaW5wdXQuJ1xyXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0lOU0VSVEVELCB0aHJvd0Vycm9yXHJcbiAgICAgICAgY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfREVMRVRFRCwgdGhyb3dFcnJvclxyXG4gICAgICBmb3IgY29sbGFib3JhdG9yIGluIGRvYy5nZXRDb2xsYWJvcmF0b3JzKClcclxuICAgICAgICBzZXNzaW9uSWQgPSBjb2xsYWJvcmF0b3Iuc2Vzc2lvbklkIGlmIGNvbGxhYm9yYXRvci5pc01lXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZSA9XHJcbiAgICAgICAgZG9jOiBkb2NcclxuICAgICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgICAgc2Vzc2lvbklkOiBzZXNzaW9uSWRcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgY29udGVudC5nZXRUZXh0KClcclxuXHJcbiAgICBpbml0ID0gKG1vZGVsKSAtPlxyXG4gICAgICBjb250ZW50ID0gbW9kZWwuY3JlYXRlU3RyaW5nICcnXHJcbiAgICAgIG1vZGVsLmdldFJvb3QoKS5zZXQgJ2NvbnRlbnQnLCBjb250ZW50XHJcblxyXG4gICAgZXJyb3IgPSAoZXJyKSA9PlxyXG4gICAgICBpZiBlcnIudHlwZSBpcyAnVE9LRU5fUkVGUkVTSF9SRVFVSVJFRCdcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBhbGVydCBlcnIubWVzc2FnZVxyXG5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICBlbHNlXHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5pbnNlcnRcclxuICAgICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuICAgICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBmaWxlPy5pZFxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPSBmaWxlLnRpdGxlXHJcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXHJcbiAgICAgICAgZ2FwaS5kcml2ZS5yZWFsdGltZS5sb2FkIGZpbGUuaWQsIGZpbGVMb2FkZWQsIGluaXQsIGVycm9yXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBAX2FwaUVycm9yIGZpbGUsICdVbmFibGUgdG8gbG9hZCBmaWxlJ1xyXG5cclxuICBfc2F2ZVJlYWxUaW1lRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ubW9kZWxcclxuICAgICAgQF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbCBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgICBAX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWw6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpbmRleCA9IDBcclxuICAgIHJlYWxUaW1lQ29udGVudCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5jb250ZW50XHJcbiAgICBkaWZmcyA9IGpzZGlmZi5kaWZmQ2hhcnMgcmVhbFRpbWVDb250ZW50LmdldFRleHQoKSwgY29udGVudC5nZXRDb250ZW50QXNKU09OKClcclxuICAgIGZvciBkaWZmIGluIGRpZmZzXHJcbiAgICAgIGlmIGRpZmYucmVtb3ZlZFxyXG4gICAgICAgIHJlYWxUaW1lQ29udGVudC5yZW1vdmVSYW5nZSBpbmRleCwgaW5kZXggKyBkaWZmLnZhbHVlLmxlbmd0aFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgZGlmZi5hZGRlZFxyXG4gICAgICAgICAgcmVhbFRpbWVDb250ZW50Lmluc2VydFN0cmluZyBpbmRleCwgZGlmZi52YWx1ZVxyXG4gICAgICAgIGluZGV4ICs9IGRpZmYuY291bnRcclxuICAgIGNhbGxiYWNrIG51bGxcclxuXHJcbiAgX2FwaUVycm9yOiAocmVzdWx0LCBwcmVmaXgpIC0+XHJcbiAgICBpZiByZXN1bHQ/Lm1lc3NhZ2U/XHJcbiAgICAgIFwiI3twcmVmaXh9OiAje3Jlc3VsdC5tZXNzYWdlfVwiXHJcbiAgICBlbHNlXHJcbiAgICAgIHByZWZpeFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVEcml2ZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBmaWxlS2V5ID0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgIGNhdGNoIGVcclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgKG1ldGFkYXRhPy5wYXRoKCkgb3IgW10pLmpvaW4gJy8nXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW2ZpbGVuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbmFtZSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IG5hbWVcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byByZW5hbWUnXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcGFyZW50OiBudWxsXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChjbGllbnRNZXRhZGF0YSwgc2F2ZWRNZXRhZGF0YSkgLT5cclxuICAgIHNhdmVkTWV0YWRhdGEubmFtZVxyXG5cclxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxyXG4gICAgXCJjZm06OiN7bmFtZS5yZXBsYWNlIC9cXHQvZywgJyAnfVwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RvcmFnZVByb3ZpZGVyXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZVxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAY29udGVudCwgQG1ldGFkYXRhfSA9IG9wdGlvbnNcclxuXHJcbmNsYXNzIENsb3VkTWV0YWRhdGFcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEB0eXBlLCBAcHJvdmlkZXIgPSBudWxsLCBAcGFyZW50ID0gbnVsbCwgQHByb3ZpZGVyRGF0YT17fSwgQG92ZXJ3cml0YWJsZSwgQHNoYXJlZENvbnRlbnRJZCwgQHNoYXJlZENvbnRlbnRTZWNyZXRLZXl9ID0gb3B0aW9uc1xyXG4gIEBGb2xkZXI6ICdmb2xkZXInXHJcbiAgQEZpbGU6ICdmaWxlJ1xyXG5cclxuICBwYXRoOiAtPlxyXG4gICAgX3BhdGggPSBbXVxyXG4gICAgcGFyZW50ID0gQHBhcmVudFxyXG4gICAgd2hpbGUgcGFyZW50IGlzbnQgbnVsbFxyXG4gICAgICBfcGF0aC51bnNoaWZ0IHBhcmVudFxyXG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50XHJcbiAgICBfcGF0aFxyXG5cclxuIyBzaW5nbGV0b24gdGhhdCBjYW4gY3JlYXRlIENsb3VkQ29udGVudCB3cmFwcGVkIHdpdGggZ2xvYmFsIG9wdGlvbnNcclxuY2xhc3MgQ2xvdWRDb250ZW50RmFjdG9yeVxyXG4gIGNvbnN0cnVjdG9yOiAtPlxyXG4gICAgQGVudmVsb3BlTWV0YWRhdGEgPSB7fVxyXG5cclxuICAjIHNldCBpbml0aWFsIGVudmVsb3BlTWV0YWRhdGEgb3IgdXBkYXRlIGluZGl2aWR1YWwgcHJvcGVydGllc1xyXG4gIHNldEVudmVsb3BlTWV0YWRhdGE6IChlbnZlbG9wZU1ldGFkYXRhKSAtPlxyXG4gICAgZm9yIGtleSBvZiBlbnZlbG9wZU1ldGFkYXRhXHJcbiAgICAgIEBlbnZlbG9wZU1ldGFkYXRhW2tleV0gPSBlbnZlbG9wZU1ldGFkYXRhW2tleV1cclxuXHJcbiAgIyByZXR1cm5zIG5ldyBDbG91ZENvbnRlbnQgY29udGFpbmluZyBlbnZlbG9wZWQgZGF0YVxyXG4gIGNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudDogKGNvbnRlbnQpIC0+XHJcbiAgICBuZXcgQ2xvdWRDb250ZW50IEBlbnZlbG9wQ29udGVudCBjb250ZW50XHJcblxyXG4gICMgZW52ZWxvcHMgY29udGVudCB3aXRoIG1ldGFkYXRhLCByZXR1cm5zIGFuIG9iamVjdC5cclxuICAjIElmIGNvbnRlbnQgd2FzIGFscmVhZHkgYW4gb2JqZWN0IChPYmplY3Qgb3IgSlNPTikgd2l0aCBtZXRhZGF0YSxcclxuICAjIGFueSBleGlzdGluZyBtZXRhZGF0YSB3aWxsIGJlIHJldGFpbmVkLlxyXG4gICMgTm90ZTogY2FsbGluZyBgZW52ZWxvcENvbnRlbnRgIG1heSBiZSBzYWZlbHkgY2FsbGVkIG9uIHNvbWV0aGluZyB0aGF0XHJcbiAgIyBoYXMgYWxyZWFkeSBoYWQgYGVudmVsb3BDb250ZW50YCBjYWxsZWQgb24gaXQsIGFuZCB3aWxsIGJlIGEgbm8tb3AuXHJcbiAgZW52ZWxvcENvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgZW52ZWxvcGVkQ2xvdWRDb250ZW50ID0gQF93cmFwSWZOZWVkZWQgY29udGVudFxyXG4gICAgZm9yIGtleSBvZiBAZW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBlbnZlbG9wZWRDbG91ZENvbnRlbnRba2V5XSA/PSBAZW52ZWxvcGVNZXRhZGF0YVtrZXldXHJcbiAgICByZXR1cm4gZW52ZWxvcGVkQ2xvdWRDb250ZW50XHJcblxyXG4gICMgZW52ZWxvcHMgY29udGVudCBpbiB7Y29udGVudDogY29udGVudH0gaWYgbmVlZGVkLCByZXR1cm5zIGFuIG9iamVjdFxyXG4gIF93cmFwSWZOZWVkZWQ6IChjb250ZW50KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcgY29udGVudFxyXG4gICAgICB0cnkgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxyXG4gICAgaWYgY29udGVudC5jb250ZW50P1xyXG4gICAgICByZXR1cm4gY29udGVudFxyXG4gICAgZWxzZVxyXG4gICAgICByZXR1cm4ge2NvbnRlbnR9XHJcblxyXG5jbGFzcyBDbG91ZENvbnRlbnRcclxuICBjb25zdHJ1Y3RvcjogKEBfID0ge30pIC0+XHJcblxyXG4gIGdldENvbnRlbnQ6IC0+IEBfXHJcbiAgZ2V0Q29udGVudEFzSlNPTjogIC0+IEpTT04uc3RyaW5naWZ5IEBfXHJcblxyXG4gIGNsb25lOiAtPiBuZXcgQ2xvdWRDb250ZW50IF8uY2xvbmVEZWVwIEBfXHJcblxyXG4gIHNldFRleHQ6ICh0ZXh0KSAtPiBAXy5jb250ZW50ID0gdGV4dFxyXG4gIGdldFRleHQ6IC0+IGlmIEBfLmNvbnRlbnQgaXMgbnVsbCB0aGVuICcnIGVsc2UgaWYgaXNTdHJpbmcoQF8uY29udGVudCkgdGhlbiBAXy5jb250ZW50IGVsc2UgSlNPTi5zdHJpbmdpZnkgQF8uY29udGVudFxyXG5cclxuICBhZGRNZXRhZGF0YTogKG1ldGFkYXRhKSAtPiBAX1trZXldID0gbWV0YWRhdGFba2V5XSBmb3Iga2V5IG9mIG1ldGFkYXRhXHJcbiAgZ2V0OiAocHJvcCkgLT4gQF9bcHJvcF1cclxuXHJcbiAgY29weU1ldGFkYXRhVG86ICh0bykgLT5cclxuICAgIG1ldGFkYXRhID0ge31cclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBAX1xyXG4gICAgICBpZiBrZXkgaXNudCAnY29udGVudCdcclxuICAgICAgICBtZXRhZGF0YVtrZXldID0gdmFsdWVcclxuICAgIHRvLmFkZE1ldGFkYXRhIG1ldGFkYXRhXHJcblxyXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXHJcblxyXG4gIEBBdmFpbGFibGU6IC0+IHRydWVcclxuXHJcbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cclxuICAgIEBjYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuXHJcbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY2FsbGJhY2tcclxuICAgICAgY2FsbGJhY2sgdHJ1ZVxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBudWxsXHJcblxyXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcclxuXHJcbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbW92ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVuYW1lJ1xyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2Nsb3NlJ1xyXG5cclxuICBvcGVuU2F2ZWQ6IChvcGVuU2F2ZWRQYXJhbXMsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnb3BlblNhdmVkJ1xyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2dldE9wZW5TYXZlZFBhcmFtcydcclxuXHJcbiAgX25vdEltcGxlbWVudGVkOiAobWV0aG9kTmFtZSkgLT5cclxuICAgIGFsZXJ0IFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxyXG4gIENsb3VkTWV0YWRhdGE6IENsb3VkTWV0YWRhdGFcclxuICBDbG91ZENvbnRlbnQ6IENsb3VkQ29udGVudFxyXG4gIGNsb3VkQ29udGVudEZhY3Rvcnk6IG5ldyBDbG91ZENvbnRlbnRGYWN0b3J5KClcclxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IFJlYWRPbmx5UHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuUkVBRF9PTkxZJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IGZhbHNlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IGZhbHNlXHJcbiAgICAgICAgcmVuYW1lOiBmYWxzZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG4gICAgQHRyZWUgPSBudWxsXHJcblxyXG4gIEBOYW1lOiAncmVhZE9ubHknXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHN1YlRyZWUgPSBAX2ZpbmRTdWJUcmVlIG1ldGFkYXRhXHJcbiAgICAgIGlmIHN1YlRyZWVcclxuICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdXHJcbiAgICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0uY29udGVudFxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gaXMgYSBmb2xkZXJcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgbGlzdCA9IFtdXHJcbiAgICAgIHN1YlRyZWUgPSBAX2ZpbmRTdWJUcmVlIG1ldGFkYXRhXHJcbiAgICAgIGlmIHN1YlRyZWVcclxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHN1YlRyZWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICBfZmluZFN1YlRyZWU6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlblxyXG4gICAgZWxzZSBpZiBtZXRhZGF0YT8ucGFyZW50XHJcbiAgICAgIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuY2hpbGRyZW5cclxuICAgIGVsc2VcclxuICAgICAgQHRyZWVcclxuXHJcbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAdHJlZSBpc250IG51bGxcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxyXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xyXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xyXG4gICAgICAkLmFqYXhcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcclxuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgIGVsc2VcclxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XHJcblxyXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGFyZW50ID0gbnVsbCkgLT5cclxuICAgIHRyZWUgPSB7fVxyXG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXHJcbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgIHR5cGU6IHR5cGVcclxuICAgICAgICBwYXJlbnQ6IHBhcmVudFxyXG4gICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgY2hpbGRyZW46IG51bGxcclxuICAgICAgaWYgdHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlbiA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgbWV0YWRhdGFcclxuICAgICAgY29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGpzb25bZmlsZW5hbWVdXHJcbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cclxuICAgICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICB0cmVlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcblxyXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3JldmVydFN1Yk1lbnUnLCAnc2VwYXJhdG9yJywgJ3NhdmUnLCAnc2F2ZUNvcHlEaWFsb2cnLCAnc2hhcmVTdWJNZW51JywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxyXG4gICAgQGl0ZW1zID0gQHBhcnNlTWVudUl0ZW1zIG9wdGlvbnMubWVudSwgY2xpZW50XHJcbiAgICBjb25zb2xlLmRpciBAaXRlbXNcclxuXHJcbiAgcGFyc2VNZW51SXRlbXM6IChtZW51SXRlbXMsIGNsaWVudCkgLT5cclxuICAgIHNldEFjdGlvbiA9IChhY3Rpb24pIC0+XHJcbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxyXG5cclxuICAgIHNldEVuYWJsZWQgPSAoYWN0aW9uKSAtPlxyXG4gICAgICBzd2l0Y2ggYWN0aW9uXHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0U3ViTWVudSdcclxuICAgICAgICAgIC0+IChjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8pIG9yIGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIHdoZW4gJ3JldmVydFRvTGFzdE9wZW5lZERpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xyXG4gICAgICAgIHdoZW4gJ3JlbmFtZURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAncmVuYW1lJ1xyXG4gICAgICAgIHdoZW4gJ3NoYXJlR2V0TGluaycsICdzaGFyZVN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgICB3aGVuICdyZXZlcnRUb1NoYXJlZERpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxyXG4gICAgICAgIHdoZW4gJ3NoYXJlVXBkYXRlJ1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZUVkaXRLZXlcIik/XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdHJ1ZVxyXG5cclxuICAgIGdldEl0ZW1zID0gKHN1Yk1lbnVJdGVtcykgPT5cclxuICAgICAgaWYgc3ViTWVudUl0ZW1zXHJcbiAgICAgICAgQHBhcnNlTWVudUl0ZW1zIHN1Yk1lbnVJdGVtcywgY2xpZW50XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcblxyXG4gICAgbmFtZXMgPVxyXG4gICAgICBuZXdGaWxlRGlhbG9nOiB0ciBcIn5NRU5VLk5FV1wiXHJcbiAgICAgIG9wZW5GaWxlRGlhbG9nOiB0ciBcIn5NRU5VLk9QRU5cIlxyXG4gICAgICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCJcclxuICAgICAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX1NIQVJFRF9WSUVXXCJcclxuICAgICAgc2F2ZTogdHIgXCJ+TUVOVS5TQVZFXCJcclxuICAgICAgc2F2ZUZpbGVBc0RpYWxvZzogdHIgXCJ+TUVOVS5TQVZFX0FTXCJcclxuICAgICAgc2F2ZUNvcHlEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9DT1BZXCJcclxuICAgICAgc2hhcmVHZXRMaW5rOiB0ciBcIn5NRU5VLlNIQVJFX0dFVF9MSU5LXCJcclxuICAgICAgc2hhcmVVcGRhdGU6IHRyIFwifk1FTlUuU0hBUkVfVVBEQVRFXCJcclxuICAgICAgZG93bmxvYWREaWFsb2c6IHRyIFwifk1FTlUuRE9XTkxPQURcIlxyXG4gICAgICByZW5hbWVEaWFsb2c6IHRyIFwifk1FTlUuUkVOQU1FXCJcclxuICAgICAgcmV2ZXJ0U3ViTWVudTogdHIgXCJ+TUVOVS5SRVZFUlRfVE9cIlxyXG4gICAgICBzaGFyZVN1Yk1lbnU6IHRyIFwifk1FTlUuU0hBUkVcIlxyXG5cclxuICAgIHN1Yk1lbnVzID1cclxuICAgICAgcmV2ZXJ0U3ViTWVudTogWydyZXZlcnRUb0xhc3RPcGVuZWREaWFsb2cnLCAncmV2ZXJ0VG9TaGFyZWREaWFsb2cnXVxyXG4gICAgICBzaGFyZVN1Yk1lbnU6IFsnc2hhcmVHZXRMaW5rJywgJ3NoYXJlVXBkYXRlJ11cclxuXHJcbiAgICBpdGVtcyA9IFtdXHJcbiAgICBmb3IgaXRlbSwgaSBpbiBtZW51SXRlbXNcclxuICAgICAgaWYgaXRlbSBpcyAnc2VwYXJhdG9yJ1xyXG4gICAgICAgIG1lbnVJdGVtID1cclxuICAgICAgICAgIGtleTogXCJzZXBlcmF0b3Ije2l9XCJcclxuICAgICAgICAgIHNlcGFyYXRvcjogdHJ1ZVxyXG4gICAgICBlbHNlIGlmIGlzU3RyaW5nIGl0ZW1cclxuICAgICAgICBtZW51SXRlbSA9XHJcbiAgICAgICAgICBrZXk6IGl0ZW1cclxuICAgICAgICAgIG5hbWU6IG9wdGlvbnMubWVudU5hbWVzP1tpdGVtXSBvciBuYW1lc1tpdGVtXSBvciBcIlVua25vd24gaXRlbTogI3tpdGVtfVwiXHJcbiAgICAgICAgICBlbmFibGVkOiBzZXRFbmFibGVkIGl0ZW1cclxuICAgICAgICAgIGl0ZW1zOiBnZXRJdGVtcyBzdWJNZW51c1tpdGVtXVxyXG4gICAgICAgICAgYWN0aW9uOiBzZXRBY3Rpb24gaXRlbVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbWVudUl0ZW0gPSBpdGVtXHJcbiAgICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIG90aGVyd2lzZSBpdCBpcyBhc3N1bWVkIGFjdGlvbiBpcyBhIGZ1bmN0aW9uXHJcbiAgICAgICAgaWYgaXNTdHJpbmcgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmtleSA9IGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5lbmFibGVkID0gc2V0RW5hYmxlZCBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCBvcj0gdHJ1ZVxyXG4gICAgICAgIG1lbnVJdGVtLml0ZW1zID0gaXRlbS5pdGVtcyBvciBnZXRJdGVtcyBpdGVtLm5hbWVcclxuICAgICAgaXRlbXMucHVzaCBtZW51SXRlbVxyXG4gICAgaXRlbXNcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBjbGllbnQpLT5cclxuICAgIEBtZW51ID0gbnVsbFxyXG5cclxuICBpbml0OiAob3B0aW9ucykgLT5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XHJcbiAgICAjIHNraXAgdGhlIG1lbnUgaWYgZXhwbGljaXR5IHNldCB0byBudWxsIChtZWFuaW5nIG5vIG1lbnUpXHJcbiAgICBpZiBvcHRpb25zLm1lbnUgaXNudCBudWxsXHJcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcclxuICAgICAgICBvcHRpb25zLm1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcbiAgICAgIEBtZW51ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUgb3B0aW9ucywgQGNsaWVudFxyXG5cclxuICAjIGZvciBSZWFjdCB0byBsaXN0ZW4gZm9yIGRpYWxvZyBjaGFuZ2VzXHJcbiAgbGlzdGVuOiAoQGxpc3RlbmVyQ2FsbGJhY2spIC0+XHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnYXBwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHByZXBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3ByZXBlbmRNZW51SXRlbScsIGl0ZW1cclxuXHJcbiAgcmVwbGFjZU1lbnVJdGVtOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdyZXBsYWNlTWVudUl0ZW0nLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQmVmb3JlOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdpbnNlcnRNZW51SXRlbUJlZm9yZScsXHJcbiAgICAgIGtleToga2V5XHJcbiAgICAgIGl0ZW06IGl0ZW1cclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1BZnRlcjogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1BZnRlcicsXHJcbiAgICAgIGtleToga2V5XHJcbiAgICAgIGl0ZW06IGl0ZW1cclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzZXRNZW51QmFySW5mbycsIGluZm9cclxuXHJcbiAgc2F2ZUZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZScsICh0ciAnfkRJQUxPRy5TQVZFJyksIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZUFzJywgKHRyICd+RElBTE9HLlNBVkVfQVMnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvcHlEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZUNvcHknLCAodHIgJ35ESUFMT0cuU0FWRV9DT1BZJyksIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnb3BlbkZpbGUnLCAodHIgJ35ESUFMT0cuT1BFTicpLCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGZpbGVuYW1lLCBtaW1lVHlwZSwgY29udGVudCwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dEb3dubG9hZERpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBtaW1lVHlwZTogbWltZVR5cGVcclxuICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgcmVuYW1lRGlhbG9nOiAoZmlsZW5hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICBzaGFyZVVybERpYWxvZzogKHVybCkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1NoYXJlVXJsRGlhbG9nJyxcclxuICAgICAgdXJsOiB1cmxcclxuXHJcbiAgYmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dCbG9ja2luZ01vZGFsJywgbW9kYWxQcm9wc1xyXG5cclxuICBfc2hvd1Byb3ZpZGVyRGlhbG9nOiAoYWN0aW9uLCB0aXRsZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXHJcbiAgICAgIGFjdGlvbjogYWN0aW9uXHJcbiAgICAgIHRpdGxlOiB0aXRsZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSU1lbnU6IENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+XHJcbiAgcmV0ID0gbnVsbFxyXG4gIGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoXCImXCIpLnNvbWUgKHBhaXIpIC0+XHJcbiAgICBwYWlyLnNwbGl0KFwiPVwiKVswXSBpcyBwYXJhbSBhbmQgKHJldCA9IHBhaXIuc3BsaXQoXCI9XCIpWzFdKVxyXG4gIHJldFxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiOiBcIlVudGl0bGVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxyXG4gIFwifk1FTlUuT1BFTlwiOiBcIk9wZW4gLi4uXCJcclxuICBcIn5NRU5VLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+TUVOVS5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxyXG4gIFwifk1FTlUuU0hBUkVcIjogXCJTaGFyZS4uLlwiXHJcbiAgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiOiBcIkdldCBsaW5rIHRvIHNoYXJlZCB2aWV3XCJcclxuICBcIn5NRU5VLlNIQVJFX1VQREFURVwiOiBcIlVwZGF0ZSBzaGFyZWQgdmlld1wiXHJcbiAgXCJ+TUVOVS5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9cIjogXCJSZXZlcnQgdG8uLi5cIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCI6IFwiUmVjZW50bHkgb3BlbmVkIHN0YXRlXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIlNoYXJlZCB2aWV3XCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5ESUFMT0cuU0hBUkVEXCI6IFwiU2hhcmVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxyXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXHJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcclxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcclxuXHJcbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiOiBcIkRlbGV0ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXHJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxyXG5cclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflJFTkFNRV9ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZXCI6IFwiQ29weVwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLlZJRVdcIjogXCJWaWV3XCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ0xPU0VcIjogXCJDbG9zZVwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlfU1VDQ0VTU1wiOiBcIlRoZSBzaGFyZSB1cmwgaGFzIGJlZW4gY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuXCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9FUlJPUlwiOiBcIlNvcnJ5LCB0aGUgc2hhcmUgdXJsIHdhcyBub3QgYWJsZSB0byBiZSBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxyXG5cclxuICBcIn5DT05GSVJNLk9QRU5fRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBvcGVuIGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gaXRzIG1vc3QgcmVjZW50bHkgb3BlbmVkIHN0YXRlP1wiXHJcbiAgXCJ+Q09ORklSTS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgcmV2ZXJ0IHRoZSBmaWxlIHRvIGN1cnJlbnRseSBzaGFyZWQgdmlldz9cIlxyXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cclxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xyXG5kZWZhdWx0TGFuZyA9ICdlbidcclxudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xyXG5cclxudHJhbnNsYXRlID0gKGtleSwgdmFycz17fSwgbGFuZz1kZWZhdWx0TGFuZykgLT5cclxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcclxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XHJcbiAgICBpZiB2YXJzLmhhc093blByb3BlcnR5IGtleSB0aGVuIHZhcnNba2V5XSBlbHNlIFwiJyoqIFVLTk9XTiBLRVk6ICN7a2V5fSAqKlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxyXG4iLCJNZW51QmFyID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21lbnUtYmFyLXZpZXcnXHJcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcclxuRG93bmxvYWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZG93bmxvYWQtZGlhbG9nLXZpZXcnXHJcblJlbmFtZURpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9yZW5hbWUtZGlhbG9nLXZpZXcnXHJcblNoYXJlVXJsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NoYXJlLXVybC1kaWFsb2ctdmlldydcclxuQmxvY2tpbmdNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9ibG9ja2luZy1tb2RhbC12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogLT5cclxuICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lmhhc093blByb3BlcnR5KCduYW1lJykgYW5kIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZT8ubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWVcclxuICAgIGVsc2VcclxuICAgICAgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0UHJvdmlkZXI6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcbiAgICBkaXJ0eTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBmaWxlU3RhdHVzID0gaWYgZXZlbnQuc3RhdGUuc2F2aW5nXHJcbiAgICAgICAge21lc3NhZ2U6IFwiU2F2aW5nLi4uXCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxyXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dEb3dubG9hZERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBkb3dubG9hZERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcmVuYW1lRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1NoYXJlVXJsRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlVXJsRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Jsb2NraW5nTW9kYWwnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgYmxvY2tpbmdNb2RhbFByb3BzOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQmVmb3JlJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgMFxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMuc3BsaWNlIGluZGV4LCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQWZ0ZXInXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBpZiBpbmRleCBpcyBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCArIDEsIDAsIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIF9nZXRNZW51SXRlbUluZGV4OiAoa2V5KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcga2V5XHJcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgcmV0dXJuIGluZGV4IGlmIGl0ZW0ua2V5IGlzIGtleVxyXG4gICAgICAtMVxyXG4gICAgZWxzZVxyXG4gICAgICBpbmRleCA9IHBhcnNlSW50IGtleSwgMTBcclxuICAgICAgaWYgaXNOYU4oaW5kZXgpIG9yIGluZGV4IDwgMCBvciBpbmRleCA+IEBzdGF0ZS5tZW51SXRlbXMubGVuZ3RoIC0gMVxyXG4gICAgICAgIC0xXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpbmRleFxyXG5cclxuICBjbG9zZURpYWxvZ3M6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcblxyXG4gIHJlbmRlckRpYWxvZ3M6IC0+XHJcbiAgICBpZiBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzXHJcbiAgICAgIChCbG9ja2luZ01vZGFsIEBzdGF0ZS5ibG9ja2luZ01vZGFsUHJvcHMpXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChEb3dubG9hZERpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5maWxlbmFtZSwgbWltZVR5cGU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5taW1lVHlwZSwgY29udGVudDogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmNvbnRlbnQsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xyXG4gICAgICAoUmVuYW1lRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLnJlbmFtZURpYWxvZy5maWxlbmFtZSwgY2FsbGJhY2s6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuY2FsbGJhY2ssIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnNoYXJlVXJsRGlhbG9nXHJcbiAgICAgIChTaGFyZVVybERpYWxvZyB7dXJsOiBAc3RhdGUuc2hhcmVVcmxEaWFsb2cudXJsLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICAoTWVudUJhciB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxyXG4iLCJBdXRob3JpemVNaXhpbiA9XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgYXV0aG9yaXplZDogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXHJcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdCbG9ja2luZ01vZGFsJ1xyXG5cclxuICBjbG9zZTogLT5cclxuICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LFxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctYmxvY2tpbmctbWVzc2FnZSd9LCBAcHJvcHMubWVzc2FnZSlcclxuICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgZG93bmxvYWQ6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIGUudGFyZ2V0LnNldEF0dHJpYnV0ZSAnaHJlZicsIFwiZGF0YToje0Bwcm9wcy5taW1lVHlwZX0sI3tlbmNvZGVVUklDb21wb25lbnQoQHByb3BzLmNvbnRlbnQpfVwiXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2Rvd25sb2FkLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGEge2hyZWY6ICcjJywgY2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIGRvd25sb2FkOiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLCBvbkNsaWNrOiBAZG93bmxvYWR9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRCcpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCB1bCwgbGksIHN2ZywgZywgcmVjdH0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIG1vdXNlRW50ZXI6IC0+XHJcbiAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgICBtZW51SXRlbSA9ICQgUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuaXRlbVxyXG4gICAgICBtZW51ID0gbWVudUl0ZW0ucGFyZW50KCkucGFyZW50KClcclxuXHJcbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51XHJcbiAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJ1xyXG4gICAgICAgICAgbGVmdDogbWVudS53aWR0aCgpXHJcbiAgICAgICAgICB0b3A6IG1lbnVJdGVtLnBvc2l0aW9uKCkudG9wIC0gcGFyc2VJbnQobWVudUl0ZW0uY3NzKCdwYWRkaW5nLXRvcCcpKVxyXG4gICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMuc2V0U3ViTWVudT8gbnVsbFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBlbmFibGVkID0gaWYgQHByb3BzLml0ZW0uaGFzT3duUHJvcGVydHkgJ2VuYWJsZWQnXHJcbiAgICAgIGlmIHR5cGVvZiBAcHJvcHMuaXRlbS5lbmFibGVkIGlzICdmdW5jdGlvbidcclxuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWRcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICAgIGNsYXNzZXMgPSBbJ21lbnVJdGVtJ11cclxuICAgIGlmIEBwcm9wcy5pdGVtLnNlcGFyYXRvclxyXG4gICAgICBjbGFzc2VzLnB1c2ggJ3NlcGFyYXRvcidcclxuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpfSwgJycpXHJcbiAgICBlbHNlXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnZGlzYWJsZWQnIGlmIG5vdCBlbmFibGVkIG9yIG5vdCAoQHByb3BzLml0ZW0uYWN0aW9uIG9yIEBwcm9wcy5pdGVtLml0ZW1zKVxyXG4gICAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxyXG4gICAgICAobGkge3JlZjogJ2l0ZW0nLCBjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpLCBvbkNsaWNrOiBAY2xpY2tlZCwgb25Nb3VzZUVudGVyOiBAbW91c2VFbnRlciB9LFxyXG4gICAgICAgIG5hbWVcclxuICAgICAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24taW5zcGVjdG9yQXJyb3ctY29sbGFwc2UnfSlcclxuICAgICAgKVxyXG5cclxuRHJvcERvd24gPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzaG93aW5nTWVudTogZmFsc2VcclxuICAgIHRpbWVvdXQ6IG51bGxcclxuICAgIHN1Yk1lbnU6IG51bGxcclxuXHJcbiAgYmx1cjogLT5cclxuICAgIEB1bmJsdXIoKVxyXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZSwgc3ViTWVudTogZmFsc2V9ICksIDUwMFxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiB0aW1lb3V0fVxyXG5cclxuICB1bmJsdXI6IC0+XHJcbiAgICBpZiBAc3RhdGUudGltZW91dFxyXG4gICAgICBjbGVhclRpbWVvdXQoQHN0YXRlLnRpbWVvdXQpXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XHJcblxyXG4gIHNldFN1Yk1lbnU6IChzdWJNZW51KSAtPlxyXG4gICAgQHNldFN0YXRlIHN1Yk1lbnU6IHN1Yk1lbnVcclxuXHJcbiAgc2VsZWN0OiAoaXRlbSkgLT5cclxuICAgIHJldHVybiBpZiBpdGVtPy5pdGVtc1xyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGl0ZW0uYWN0aW9uPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIG1lbnVDbGFzcyA9IGlmIEBzdGF0ZS5zaG93aW5nTWVudSB0aGVuICdtZW51LXNob3dpbmcnIGVsc2UgJ21lbnUtaGlkZGVuJ1xyXG4gICAgc2VsZWN0ID0gKGl0ZW0pID0+XHJcbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICAoc3ZnIHt2ZXJzaW9uOiAnMS4xJywgd2lkdGg6IDE2LCBoZWlnaHQ6IDE2LCB2aWV3Qm94OiAnMCAwIDE2IDE2JywgZW5hYmxlQmFja2dyb3VuZDogJ25ldyAwIDAgMTYgMTYnfSxcclxuICAgICAgICAgIChnIHt9LFxyXG4gICAgICAgICAgICAocmVjdCB7eTogMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgICAocmVjdCB7eTogNywgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgICAocmVjdCB7eTogMTIsIHdpZHRoOiAxNiwgaGVpZ2h0OiAyfSlcclxuICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgc2V0U3ViTWVudTogQHNldFN1Yk1lbnV9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICBpZiBAc3RhdGUuc3ViTWVudVxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgc3R5bGU6IEBzdGF0ZS5zdWJNZW51LnN0eWxlfSxcclxuICAgICAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGluZGV4LCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3R9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHN0YXRlLnN1Yk1lbnUuaXRlbXNcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERyb3BEb3duXHJcbiIsIkF1dGhvcml6ZU1peGluID0gcmVxdWlyZSAnLi9hdXRob3JpemUtbWl4aW4nXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxue2RpdiwgaW1nLCBpLCBzcGFuLCBpbnB1dCwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3RGaWxlJ1xyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAbGFzdENsaWNrID0gMFxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxyXG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMubWV0YWRhdGFcclxuICAgIGlmIG5vdyAtIEBsYXN0Q2xpY2sgPD0gMjUwXHJcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcclxuICAgIEBsYXN0Q2xpY2sgPSBub3dcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IChpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAnc2VsZWN0ZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAZmlsZVNlbGVjdGVkfSxcclxuICAgICAgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6IGlmIEBwcm9wcy5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyIHRoZW4gJ2ljb24taW5zcGVjdG9yQXJyb3ctY29sbGFwc2UnIGVsc2UgJ2ljb24tbm90ZVRvb2wnfSlcclxuICAgICAgQHByb3BzLm1ldGFkYXRhLm5hbWVcclxuICAgIClcclxuXHJcbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRpbmc6IHRydWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAbG9hZCBAcHJvcHMuZm9sZGVyXHJcblxyXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBpZiBuZXh0UHJvcHMuZm9sZGVyIGlzbnQgQHByb3BzLmZvbGRlclxyXG4gICAgICBAbG9hZCBuZXh0UHJvcHMuZm9sZGVyXHJcblxyXG4gIGxvYWQ6IChmb2xkZXIpIC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBmb2xkZXIsIChlcnIsIGxpc3QpID0+XHJcbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxyXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XHJcblxyXG4gIHBhcmVudFNlbGVjdGVkOiAoZSkgLT5cclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLmZvbGRlcj8ucGFyZW50XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgaWYgQHByb3BzLmZvbGRlciBpc250IG51bGxcclxuICAgICAgbGlzdC5wdXNoIChkaXYge2tleTogJ3BhcmVudCcsIG9uQ2xpY2s6IEBwYXJlbnRTZWxlY3RlZH0sIChSZWFjdC5ET00uaSB7Y2xhc3NOYW1lOiAnaWNvbi1wYWxldHRlQXJyb3ctY29sbGFwc2UnfSksICdQYXJlbnQgRm9sZGVyJylcclxuICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxyXG4gICAgICBsaXN0LnB1c2ggKEZpbGVMaXN0RmlsZSB7a2V5OiBpLCBtZXRhZGF0YTogbWV0YWRhdGEsIHNlbGVjdGVkOiBAcHJvcHMuc2VsZWN0ZWRGaWxlIGlzIG1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBwcm9wcy5maWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBwcm9wcy5maWxlQ29uZmlybWVkfSlcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xyXG4gICAgICAgIHRyIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbGlzdFxyXG4gICAgKVxyXG5cclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlRGlhbG9nVGFiJ1xyXG5cclxuICBtaXhpbnM6IFtBdXRob3JpemVNaXhpbl1cclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgQGdldFN0YXRlRm9yRm9sZGVyIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XHJcbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICBtZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWUsIEBzdGF0ZS5saXN0XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG5cclxuICBsaXN0TG9hZGVkOiAobGlzdCkgLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBsaXN0OiBsaXN0XHJcbiAgICAgIG1ldGFkYXRhOiBAZmluZE1ldGFkYXRhICQudHJpbShAc3RhdGUuZmlsZW5hbWUpLCBsaXN0XHJcblxyXG4gIGdldFN0YXRlRm9yRm9sZGVyOiAoZm9sZGVyKSAtPlxyXG4gICAgZm9sZGVyOiBmb2xkZXJcclxuICAgIG1ldGFkYXRhOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xyXG4gICAgbGlzdDogW11cclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBAc2V0U3RhdGUgQGdldFN0YXRlRm9yRm9sZGVyIG1ldGFkYXRhXHJcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2V0U3RhdGUgQGdldFN0YXRlRm9yRm9sZGVyIG51bGxcclxuXHJcbiAgY29uZmlybTogLT5cclxuICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWUsIEBzdGF0ZS5saXN0XHJcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBpZiBAaXNPcGVuXHJcbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwYXJlbnQ6IEBzdGF0ZS5mb2xkZXIgb3IgbnVsbFxyXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXHJcbiAgICAgIEBwcm9wcy5kaWFsb2cuY2FsbGJhY2s/IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICByZW1vdmU6IC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVtb3ZlIEBzdGF0ZS5tZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICBpZiBub3QgZXJyXHJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxyXG4gICAgICAgICAgaW5kZXggPSBsaXN0LmluZGV4T2YgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBsaXN0LnNwbGljZSBpbmRleCwgMVxyXG4gICAgICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGZpbmRNZXRhZGF0YTogKGZpbGVuYW1lLCBsaXN0KSAtPlxyXG4gICAgZm9yIG1ldGFkYXRhIGluIGxpc3RcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxyXG4gICAgICAgIHJldHVybiBtZXRhZGF0YVxyXG4gICAgbnVsbFxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgICBAY29uZmlybSgpXHJcblxyXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cclxuICAgIChAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDApIG9yIChAaXNPcGVuIGFuZCBub3QgQHN0YXRlLm1ldGFkYXRhKVxyXG5cclxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cclxuICAgIGNvbmZpcm1EaXNhYmxlZCA9IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgcmVtb3ZlRGlzYWJsZWQgPSAoQHN0YXRlLm1ldGFkYXRhIGlzIG51bGwpIG9yIChAc3RhdGUubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlcilcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcclxuICAgICAgKGlucHV0IHt0eXBlOiAndGV4dCcsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIHBsYWNlaG9sZGVyOiAodHIgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIiksIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbktleURvd246IEB3YXRjaEZvckVudGVyfSlcclxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNvbmZpcm0sIGRpc2FibGVkOiBjb25maXJtRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgY29uZmlybURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgaWYgQGlzT3BlbiB0aGVuICh0ciBcIn5GSUxFX0RJQUxPRy5PUEVOXCIpIGVsc2UgKHRyIFwifkZJTEVfRElBTE9HLlNBVkVcIikpXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHJlbW92ZSwgZGlzYWJsZWQ6IHJlbW92ZURpc2FibGVkLCBjbGFzc05hbWU6IGlmIHJlbW92ZURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgKHRyIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiKSlcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY2FuY2VsfSwgKHRyIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiKSlcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXHJcbiIsIntkaXYsIGksIHNwYW4sIGlucHV0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG5leHRQcm9wcy5maWxlbmFtZVxyXG5cclxuICBmaWxlbmFtZUNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXHJcbiAgICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IHRydWVcclxuICAgICAgc2V0VGltZW91dCAoPT4gQGZvY3VzRmlsZW5hbWUoKSksIDEwXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5jbGllbnQuc2F2ZUZpbGVEaWFsb2coKVxyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IC0+XHJcbiAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IEBmaWxlbmFtZSgpLnZhbHVlXHJcblxyXG4gIGZpbGVuYW1lQmx1cnJlZDogLT5cclxuICAgIEByZW5hbWUoKVxyXG5cclxuICBmaWxlbmFtZTogLT5cclxuICAgIFJlYWN0LmZpbmRET01Ob2RlKEByZWZzLmZpbGVuYW1lKVxyXG5cclxuICBmb2N1c0ZpbGVuYW1lOiAtPlxyXG4gICAgZWwgPSBAZmlsZW5hbWUoKVxyXG4gICAgZWwuZm9jdXMoKVxyXG4gICAgaWYgdHlwZW9mIGVsLnNlbGVjdGlvblN0YXJ0IGlzICdudW1iZXInXHJcbiAgICAgIGVsLnNlbGVjdGlvblN0YXJ0ID0gZWwuc2VsZWN0aW9uRW5kID0gZWwudmFsdWUubGVuZ3RoXHJcbiAgICBlbHNlIGlmIHR5cGVvZiBlbC5jcmVhdGVUZXh0UmFuZ2UgaXNudCAndW5kZWZpbmVkJ1xyXG4gICAgICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpXHJcbiAgICAgIHJhbmdlLmNvbGxhcHNlIGZhbHNlXHJcbiAgICAgIHJhbmdlLnNlbGVjdCgpXHJcblxyXG4gIHJlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHN0YXRlLmZpbGVuYW1lLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuICAgIGlmIGZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgQHByb3BzLmNsaWVudC5yZW5hbWUgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YSwgZmlsZW5hbWVcclxuICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzXHJcbiAgICAgIEByZW5hbWUoKVxyXG4gICAgZWxzZSBpZiBlLmtleUNvZGUgaXMgMjdcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IEBwcm9wcy5maWxlbmFtZVxyXG4gICAgICAgIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge2l0ZW1zOiBAcHJvcHMuaXRlbXN9KVxyXG4gICAgICAgIGlmIEBzdGF0ZS5lZGl0aW5nRmlsZW5hbWVcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9LFxyXG4gICAgICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uQmx1cjogQGZpbGVuYW1lQmx1cnJlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJywgb25DbGljazogQGZpbGVuYW1lQ2xpY2tlZH0sIEBzdGF0ZS5maWxlbmFtZSlcclxuICAgICAgICBpZiBAcHJvcHMuZmlsZVN0YXR1c1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogXCJtZW51LWJhci1maWxlLXN0YXR1cy0je0Bwcm9wcy5maWxlU3RhdHVzLnR5cGV9XCJ9LCBAcHJvcHMuZmlsZVN0YXR1cy5tZXNzYWdlKVxyXG4gICAgICApXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLXJpZ2h0J30sXHJcbiAgICAgICAgaWYgQHByb3BzLm9wdGlvbnMuaW5mb1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIgYW5kIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkKClcclxuICAgICAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJVc2VyKClcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXHJcbiAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlQ29weScsICdzYXZlRmlsZUNvcHknIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGVBcycsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cclxuXHJcbiAgICB0YWJzID0gW11cclxuICAgIHNlbGVjdGVkVGFiSW5kZXggPSAwXHJcbiAgICBmb3IgcHJvdmlkZXIsIGkgaW4gQHByb3BzLmNsaWVudC5zdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcbiAgICAgICAgY29tcG9uZW50ID0gVGFiQ29tcG9uZW50XHJcbiAgICAgICAgICBjbGllbnQ6IEBwcm9wcy5jbGllbnRcclxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xyXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XHJcbiAgICAgICAgaWYgcHJvdmlkZXIubmFtZSBpcyBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8ubmFtZVxyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IHRhYnMubGVuZ3RoIC0gMVxyXG5cclxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICByZW5hbWU6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jYWxsYmFjaz8gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdyZW5hbWUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYnV0dG9uIHtjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgb25DbGljazogQHJlbmFtZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5SRU5BTUUnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35SRU5BTUVfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xyXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1NoYXJlVXJsRGlhbG9nVmlldydcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy51cmwpPy5zZWxlY3QoKVxyXG5cclxuICB2aWV3OiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLnVybFxyXG5cclxuICAjIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vc3Vkb2Rva2kvY29weS10by1jbGlwYm9hcmQvYmxvYi9tYXN0ZXIvaW5kZXguanNcclxuICBjb3B5OiAtPlxyXG4gICAgY29waWVkID0gdHJ1ZVxyXG4gICAgdHJ5XHJcbiAgICAgIG1hcmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdtYXJrJ1xyXG4gICAgICBtYXJrLmlubmVySFRNTCA9IEBwcm9wcy51cmxcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCBtYXJrXHJcblxyXG4gICAgICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKVxyXG4gICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuXHJcbiAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxyXG4gICAgICByYW5nZS5zZWxlY3ROb2RlIG1hcmtcclxuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlIHJhbmdlXHJcblxyXG4gICAgICBjb3BpZWQgPSBkb2N1bWVudC5leGVjQ29tbWFuZCAnY29weSdcclxuICAgIGNhdGNoXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIHdpbmRvdy5jbGlwYm9hcmREYXRhLnNldERhdGEgJ3RleHQnLCBAcHJvcHMudXJsXHJcbiAgICAgIGNhdGNoXHJcbiAgICAgICAgY29waWVkID0gZmFsc2VcclxuICAgIGZpbmFsbHlcclxuICAgICAgaWYgc2VsZWN0aW9uXHJcbiAgICAgICAgaWYgdHlwZW9mIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgcmFuZ2VcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuICAgICAgaWYgbWFya1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQgbWFya1xyXG4gICAgICBhbGVydCB0ciAoaWYgY29waWVkIHRoZW4gXCJ+U0hBUkVfRElBTE9HLkNPUFlfU1VDQ0VTU1wiIGVsc2UgXCJ+U0hBUkVfRElBTE9HLkNPUFlfRVJST1JcIilcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlNIQVJFRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc2hhcmUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICd1cmwnLCB2YWx1ZTogQHByb3BzLnVybCwgcmVhZE9ubHk6IHRydWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIGlmIGRvY3VtZW50LmV4ZWNDb21tYW5kIG9yIHdpbmRvdy5jbGlwYm9hcmREYXRhXHJcbiAgICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb3B5fSwgdHIgJ35TSEFSRV9ESUFMT0cuQ09QWScpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAdmlld30sIHRyICd+U0hBUkVfRElBTE9HLlZJRVcnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35TSEFSRV9ESUFMT0cuQ0xPU0UnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXHJcblxyXG5jbGFzcyBUYWJJbmZvXHJcbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cclxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcclxuXHJcblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFRhYidcclxuXHJcbiAgY2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXHJcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4IG9yIDBcclxuXHJcbiAgc3RhdGljczpcclxuICAgIFRhYjogKHNldHRpbmdzKSAtPiBuZXcgVGFiSW5mbyBzZXR0aW5nc1xyXG5cclxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxyXG4gICAgQHNldFN0YXRlIHNlbGVjdGVkVGFiSW5kZXg6IGluZGV4XHJcblxyXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XHJcbiAgICAoVGFiXHJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcclxuICAgICAga2V5OiBpbmRleFxyXG4gICAgICBpbmRleDogaW5kZXhcclxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcclxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclRhYnM6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFicyd9LFxyXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYi1jb21wb25lbnQnfSxcclxuICAgICAgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnNcclxuICAgICAgICAoZGl2IHtcclxuICAgICAgICAgIGtleTogaW5kZXhcclxuICAgICAgICAgIHN0eWxlOlxyXG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0YWIuY29tcG9uZW50XHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogXCJ0YWJiZWQtcGFuZWxcIn0sXHJcbiAgICAgIEByZW5kZXJUYWJzKClcclxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxyXG4gICAgKVxyXG4iXX0=
