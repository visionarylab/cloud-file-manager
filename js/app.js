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
    var openSharedContentId;
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    this.client.listen(eventCallback);
    this.client.connect();
    openSharedContentId = getQueryParam("openShared");
    if (openSharedContentId) {
      return this.client.openSharedContent(openSharedContentId);
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
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions1) {
    var Provider, allProviders, availableProviders, i, j, k, len, len1, len2, provider, providerName, providerOptions, ref, ref1, ref2, ref3;
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
          availableProviders.push(new Provider(providerOptions));
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
    return cloudContentFactory.setEnvelopeMetadata({
      appName: this.appOptions.appName || "",
      appVersion: this.appOptions.appVersion || "",
      appBuildNum: this.appOptions.appBuildNum || ""
    });
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
    var ref;
    if (callback == null) {
      callback = null;
    }
    if ((ref = this.appOptions.ui) != null ? ref.newFileOpensInNewTab : void 0) {
      return window.open(window.location, '_blank');
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

  CloudFileManagerClient.prototype.saveCopyDialog = function(content, callback) {
    var saveCopy;
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    saveCopy = (function(_this) {
      return function(content, metadata) {
        return metadata.provider.save(content, metadata, function(err) {
          if (err) {
            return _this._error(err);
          }
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        });
      };
    })(this);
    return this._ui.saveCopyDialog((function(_this) {
      return function(metadata) {
        if (content === null) {
          return _this._event('getContent', {}, function(content) {
            return saveCopy(content, metadata);
          });
        } else {
          return saveCopy(content, metadata);
        }
      };
    })(this));
  };

  CloudFileManagerClient.prototype.shareGetLink = function() {
    var ref, sharedDocumentId, showShareDialog;
    showShareDialog = (function(_this) {
      return function(sharedDocumentId) {
        return _this._ui.shareUrlDialog("" + document.location.origin + document.location.pathname + "?openShared=" + sharedDocumentId);
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

  function DocumentStoreProvider(options) {
    this.options = options != null ? options : {};
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
        if (metadata != null) {
          metadata.name = data.docName;
        }
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
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, RealTimeError, RealTimeInfo, button, cloudContentFactory, div, isString, jsdiff, ref, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

tr = require('../utils/translate');

isString = require('../utils/is-string');

jsdiff = require('diff');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

RealTimeInfo = (function(superClass) {
  extend(RealTimeInfo, superClass);

  function RealTimeInfo() {
    this.name = 'RealTimeInfo';
  }

  return RealTimeInfo;

})(Error);

RealTimeError = (function(superClass) {
  extend(RealTimeError, superClass);

  function RealTimeError() {
    this.name = 'RealTimeError';
  }

  return RealTimeError;

})(Error);

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

  function GoogleDriveProvider(options) {
    this.options = options != null ? options : {};
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
          return callback('Unable to get download url');
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
    return request.execute(function(file) {
      if (callback) {
        if (file != null ? file.error : void 0) {
          return callback("Unabled to upload file: " + file.error.message);
        } else if (file) {
          return callback(null, file);
        } else {
          return callback('Unabled to upload file');
        }
      }
    });
  };

  GoogleDriveProvider.prototype._loadOrCreateRealTimeFile = function(metadata, callback) {
    var error, fileLoaded, init, ref1, ref2, ref3, request;
    fileLoaded = function(doc) {
      var content, throwError;
      content = doc.getModel().getRoot().get('content');
      if (metadata.overwritable) {
        throwError = function(e) {
          if (!e.isLocal) {
            throw new RealTimeError('Another user has made edits to this file');
          }
        };
      }
      metadata.providerData.realTime = {
        doc: doc,
        content: content
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
    return request.execute(function(file) {
      if (file != null ? file.id : void 0) {
        metadata.overwritable = file.editable;
        metadata.providerData = {
          id: file.id
        };
        return gapi.drive.realtime.load(file.id, fileLoaded, init, error);
      } else {
        return callback('Unable to load file');
      }
    });
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
    diffs = jsdiff.diffChars(realTimeContent.getContentAsJSON(), content.getContentAsJSON());
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

  function LocalStorageProvider(options) {
    this.options = options != null ? options : {};
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
    var error, fileKey;
    try {
      fileKey = this._getKey(metadata.name);
      window.localStorage.setItem(fileKey, content.getContentAsJSON());
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
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

  function ReadOnlyProvider(options) {
    this.options = options != null ? options : {};
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'revertSubMenu', 'separator', 'save', 'saveFileAsDialog', 'shareSubMenu', 'downloadDialog', 'renameDialog'];

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
        case 'saveCopyDialog':
          return function() {
            return client.state.metadata != null;
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
var App, DownloadDialog, InnerApp, MenuBar, ProviderTabbedDialog, RenameDialog, ShareUrlDialog, div, iframe, isString, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

DownloadDialog = React.createFactory(require('./download-dialog-view'));

RenameDialog = React.createFactory(require('./rename-dialog-view'));

ShareUrlDialog = React.createFactory(require('./share-url-dialog-view'));

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
    if (this.state.providerDialog) {
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



},{"../utils/is-string":39,"../utils/translate":41,"./download-dialog-view":44,"./menu-bar-view":47,"./provider-tabbed-dialog-view":51,"./rename-dialog-view":52,"./share-url-dialog-view":54}],43:[function(require,module,exports){
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



},{"../utils/translate":41,"./modal-dialog-view":48}],45:[function(require,module,exports){
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



},{}],46:[function(require,module,exports){
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



},{"../providers/provider-interface":35,"../utils/translate":41,"./authorize-mixin":43}],47:[function(require,module,exports){
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



},{"./dropdown-view":45}],48:[function(require,module,exports){
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



},{"./modal-view":50}],49:[function(require,module,exports){
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



},{"./modal-dialog-view":48,"./tabbed-panel-view":55}],50:[function(require,module,exports){
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



},{}],51:[function(require,module,exports){
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



},{"../providers/provider-interface":35,"../utils/translate":41,"./file-dialog-tab-view":46,"./modal-tabbed-dialog-view":49,"./select-provider-dialog-tab-view":53,"./tabbed-panel-view":55}],52:[function(require,module,exports){
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



},{"../utils/translate":41,"./modal-dialog-view":48}],53:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],54:[function(require,module,exports){
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



},{"../utils/translate":41,"./modal-dialog-view":48}],55:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdWkuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGdldC1xdWVyeS1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEs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O0dBQ0Y7QUFDRCxTQUFPLFFBQVEsQ0FBQztDQUNqQjs7OztBQ1pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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RyxDQUFDLEtBQVg7TUFDQSxHQUFBLEVBQUssS0FETDtNQUVBLEtBQUEsRUFBTyxLQUZQO01BR0EsUUFBQSxFQUFXLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUgzQjtNQUlBLFVBQUEsRUFBWSxJQUFDLENBQUEsV0FKYjtLQUREO0VBRFEsQ0FYWDtFQW9CQSxVQUFBLEVBQVksU0FBQTtBQUNWLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsZ0JBQVo7S0FBSjs7QUFDRTtBQUFBO1dBQUEsc0RBQUE7O3FCQUFBLEVBQUEsQ0FBRztVQUFDLEdBQUEsRUFBSyxLQUFOO1NBQUgsRUFBaUIsSUFBQyxDQUFBLFNBQUQsQ0FBVyxHQUFYLEVBQWdCLEtBQWhCLENBQWpCO0FBQUE7O2lCQURGO0VBRFMsQ0FwQlo7RUF5QkEsbUJBQUEsRUFBcUIsU0FBQTtBQUNuQixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHlCQUFaO0tBQUo7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFDRyxHQUFBLENBQUk7VUFDSCxHQUFBLEVBQUssS0FERjtVQUVILEtBQUEsRUFDRTtZQUFBLE9BQUEsRUFBWSxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBbkIsR0FBeUMsT0FBekMsR0FBc0QsTUFBL0Q7V0FIQztTQUFKLEVBS0MsR0FBRyxDQUFDLFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG5nZXRRdWVyeVBhcmFtID0gcmVxdWlyZSAnLi91dGlscy9nZXQtcXVlcnktcGFyYW0nXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxyXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG5cclxuICAgIEBjbGllbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudCgpXHJcbiAgICBAYXBwT3B0aW9ucyA9IHt9XHJcblxyXG4gIGluaXQ6IChAYXBwT3B0aW9ucywgdXNpbmdJZnJhbWUgPSBmYWxzZSkgLT5cclxuICAgIEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lID0gdXNpbmdJZnJhbWVcclxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBAYXBwT3B0aW9uc1xyXG5cclxuICBjcmVhdGVGcmFtZTogKEBhcHBPcHRpb25zLCBlbGVtSWQsIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcclxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcclxuICAgIEBfcmVuZGVyQXBwIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1JZClcclxuXHJcbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWVcclxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxyXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xyXG4gICAgQGNsaWVudC5jb25uZWN0KClcclxuXHJcbiAgICBvcGVuU2hhcmVkQ29udGVudElkID0gZ2V0UXVlcnlQYXJhbSBcIm9wZW5TaGFyZWRcIlxyXG4gICAgaWYgb3BlblNoYXJlZENvbnRlbnRJZFxyXG4gICAgICBAY2xpZW50Lm9wZW5TaGFyZWRDb250ZW50IG9wZW5TaGFyZWRDb250ZW50SWRcclxuXHJcbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cclxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYW5jaG9yKVxyXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXHJcblxyXG4gIF9yZW5kZXJBcHA6IChhbmNob3IpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XHJcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxyXG4iLCIvLyBTZWU6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC93aWtpL0FQSVxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9ETVAoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW10sXG4gICAgICBjaGFuZ2UsXG4gICAgICBvcGVyYXRpb247XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgb3BlcmF0aW9uID0gMTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3BlcmF0aW9uID0gMDtcbiAgICB9XG5cbiAgICByZXQucHVzaChbb3BlcmF0aW9uLCBjaGFuZ2UudmFsdWVdKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9YTUwoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8aW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8ZGVsPicpO1xuICAgIH1cblxuICAgIHJldC5wdXNoKGVzY2FwZUhUTUwoY2hhbmdlLnZhbHVlKSk7XG5cbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPC9pbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzwvZGVsPicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHMpIHtcbiAgbGV0IG4gPSBzO1xuICBuID0gbi5yZXBsYWNlKC8mL2csICcmYW1wOycpO1xuICBuID0gbi5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuXG4gIHJldHVybiBuO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGlmZigpIHt9XG5cbkRpZmYucHJvdG90eXBlID0ge1xuICBkaWZmKG9sZFN0cmluZywgbmV3U3RyaW5nLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY2FsbGJhY2sgPSBvcHRpb25zLmNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gZG9uZSh2YWx1ZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKHVuZGVmaW5lZCwgdmFsdWUpOyB9LCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgc3ViY2xhc3NlcyB0byBtYXNzYWdlIHRoZSBpbnB1dCBwcmlvciB0byBydW5uaW5nXG4gICAgb2xkU3RyaW5nID0gdGhpcy5jYXN0SW5wdXQob2xkU3RyaW5nKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChuZXdTdHJpbmcpO1xuXG4gICAgb2xkU3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG9sZFN0cmluZykpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShuZXdTdHJpbmcpKTtcblxuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLCBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoO1xuICAgIGxldCBlZGl0TGVuZ3RoID0gMTtcbiAgICBsZXQgbWF4RWRpdExlbmd0aCA9IG5ld0xlbiArIG9sZExlbjtcbiAgICBsZXQgYmVzdFBhdGggPSBbeyBuZXdQb3M6IC0xLCBjb21wb25lbnRzOiBbXSB9XTtcblxuICAgIC8vIFNlZWQgZWRpdExlbmd0aCA9IDAsIGkuZS4gdGhlIGNvbnRlbnQgc3RhcnRzIHdpdGggdGhlIHNhbWUgdmFsdWVzXG4gICAgbGV0IG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuICAgIGlmIChiZXN0UGF0aFswXS5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgLy8gSWRlbnRpdHkgcGVyIHRoZSBlcXVhbGl0eSBhbmQgdG9rZW5pemVyXG4gICAgICByZXR1cm4gZG9uZShbe3ZhbHVlOiBuZXdTdHJpbmcuam9pbignJyksIGNvdW50OiBuZXdTdHJpbmcubGVuZ3RofV0pO1xuICAgIH1cblxuICAgIC8vIE1haW4gd29ya2VyIG1ldGhvZC4gY2hlY2tzIGFsbCBwZXJtdXRhdGlvbnMgb2YgYSBnaXZlbiBlZGl0IGxlbmd0aCBmb3IgYWNjZXB0YW5jZS5cbiAgICBmdW5jdGlvbiBleGVjRWRpdExlbmd0aCgpIHtcbiAgICAgIGZvciAobGV0IGRpYWdvbmFsUGF0aCA9IC0xICogZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoIDw9IGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCArPSAyKSB7XG4gICAgICAgIGxldCBiYXNlUGF0aDtcbiAgICAgICAgbGV0IGFkZFBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSxcbiAgICAgICAgICAgIHJlbW92ZVBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggKyAxXSxcbiAgICAgICAgICAgIG9sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgaWYgKGFkZFBhdGgpIHtcbiAgICAgICAgICAvLyBObyBvbmUgZWxzZSBpcyBnb2luZyB0byBhdHRlbXB0IHRvIHVzZSB0aGlzIHZhbHVlLCBjbGVhciBpdFxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MgKyAxIDwgbmV3TGVuLFxuICAgICAgICAgICAgY2FuUmVtb3ZlID0gcmVtb3ZlUGF0aCAmJiAwIDw9IG9sZFBvcyAmJiBvbGRQb3MgPCBvbGRMZW47XG4gICAgICAgIGlmICghY2FuQWRkICYmICFjYW5SZW1vdmUpIHtcbiAgICAgICAgICAvLyBJZiB0aGlzIHBhdGggaXMgYSB0ZXJtaW5hbCB0aGVuIHBydW5lXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgZGlhZ29uYWwgdGhhdCB3ZSB3YW50IHRvIGJyYW5jaCBmcm9tLiBXZSBzZWxlY3QgdGhlIHByaW9yXG4gICAgICAgIC8vIHBhdGggd2hvc2UgcG9zaXRpb24gaW4gdGhlIG5ldyBzdHJpbmcgaXMgdGhlIGZhcnRoZXN0IGZyb20gdGhlIG9yaWdpblxuICAgICAgICAvLyBhbmQgZG9lcyBub3QgcGFzcyB0aGUgYm91bmRzIG9mIHRoZSBkaWZmIGdyYXBoXG4gICAgICAgIGlmICghY2FuQWRkIHx8IChjYW5SZW1vdmUgJiYgYWRkUGF0aC5uZXdQb3MgPCByZW1vdmVQYXRoLm5ld1BvcykpIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGNsb25lUGF0aChyZW1vdmVQYXRoKTtcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGFkZFBhdGg7ICAgLy8gTm8gbmVlZCB0byBjbG9uZSwgd2UndmUgcHVsbGVkIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICBiYXNlUGF0aC5uZXdQb3MrKztcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdHJ1ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9sZFBvcyA9IHNlbGYuZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCk7XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBoaXQgdGhlIGVuZCBvZiBib3RoIHN0cmluZ3MsIHRoZW4gd2UgYXJlIGRvbmVcbiAgICAgICAgaWYgKGJhc2VQYXRoLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoYnVpbGRWYWx1ZXMoc2VsZiwgYmFzZVBhdGguY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHNlbGYudXNlTG9uZ2VzdFRva2VuKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRyYWNrIHRoaXMgcGF0aCBhcyBhIHBvdGVudGlhbCBjYW5kaWRhdGUgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSBiYXNlUGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlZGl0TGVuZ3RoKys7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybXMgdGhlIGxlbmd0aCBvZiBlZGl0IGl0ZXJhdGlvbi4gSXMgYSBiaXQgZnVnbHkgYXMgdGhpcyBoYXMgdG8gc3VwcG9ydCB0aGVcbiAgICAvLyBzeW5jIGFuZCBhc3luYyBtb2RlIHdoaWNoIGlzIG5ldmVyIGZ1bi4gTG9vcHMgb3ZlciBleGVjRWRpdExlbmd0aCB1bnRpbCBhIHZhbHVlXG4gICAgLy8gaXMgcHJvZHVjZWQuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAoZnVuY3Rpb24gZXhlYygpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBUaGlzIHNob3VsZCBub3QgaGFwcGVuLCBidXQgd2Ugd2FudCB0byBiZSBzYWZlLlxuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgaWYgKGVkaXRMZW5ndGggPiBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWV4ZWNFZGl0TGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIGV4ZWMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKGVkaXRMZW5ndGggPD0gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICBsZXQgcmV0ID0gZXhlY0VkaXRMZW5ndGgoKTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgcHVzaENvbXBvbmVudChjb21wb25lbnRzLCBhZGRlZCwgcmVtb3ZlZCkge1xuICAgIGxldCBsYXN0ID0gY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0ICYmIGxhc3QuYWRkZWQgPT09IGFkZGVkICYmIGxhc3QucmVtb3ZlZCA9PT0gcmVtb3ZlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBjbG9uZSBoZXJlIGFzIHRoZSBjb21wb25lbnQgY2xvbmUgb3BlcmF0aW9uIGlzIGp1c3RcbiAgICAgIC8vIGFzIHNoYWxsb3cgYXJyYXkgY2xvbmVcbiAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXSA9IHtjb3VudDogbGFzdC5jb3VudCArIDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzLnB1c2goe2NvdW50OiAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfSk7XG4gICAgfVxuICB9LFxuICBleHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsXG4gICAgICAgIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGgsXG4gICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgb2xkUG9zID0gbmV3UG9zIC0gZGlhZ29uYWxQYXRoLFxuXG4gICAgICAgIGNvbW1vbkNvdW50ID0gMDtcbiAgICB3aGlsZSAobmV3UG9zICsgMSA8IG5ld0xlbiAmJiBvbGRQb3MgKyAxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MgKyAxXSwgb2xkU3RyaW5nW29sZFBvcyArIDFdKSkge1xuICAgICAgbmV3UG9zKys7XG4gICAgICBvbGRQb3MrKztcbiAgICAgIGNvbW1vbkNvdW50Kys7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkNvdW50KSB7XG4gICAgICBiYXNlUGF0aC5jb21wb25lbnRzLnB1c2goe2NvdW50OiBjb21tb25Db3VudH0pO1xuICAgIH1cblxuICAgIGJhc2VQYXRoLm5ld1BvcyA9IG5ld1BvcztcbiAgICByZXR1cm4gb2xkUG9zO1xuICB9LFxuXG4gIGVxdWFscyhsZWZ0LCByaWdodCkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgfSxcbiAgcmVtb3ZlRW1wdHkoYXJyYXkpIHtcbiAgICBsZXQgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycmF5W2ldKSB7XG4gICAgICAgIHJldC5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgY2FzdElucHV0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICB0b2tlbml6ZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zcGxpdCgnJyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJ1aWxkVmFsdWVzKGRpZmYsIGNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCB1c2VMb25nZXN0VG9rZW4pIHtcbiAgbGV0IGNvbXBvbmVudFBvcyA9IDAsXG4gICAgICBjb21wb25lbnRMZW4gPSBjb21wb25lbnRzLmxlbmd0aCxcbiAgICAgIG5ld1BvcyA9IDAsXG4gICAgICBvbGRQb3MgPSAwO1xuXG4gIGZvciAoOyBjb21wb25lbnRQb3MgPCBjb21wb25lbnRMZW47IGNvbXBvbmVudFBvcysrKSB7XG4gICAgbGV0IGNvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICBpZiAoIWNvbXBvbmVudC5yZW1vdmVkKSB7XG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCAmJiB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICAgICAgbGV0IHZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KTtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUsIGkpIHtcbiAgICAgICAgICBsZXQgb2xkVmFsdWUgPSBvbGRTdHJpbmdbb2xkUG9zICsgaV07XG4gICAgICAgICAgcmV0dXJuIG9sZFZhbHVlLmxlbmd0aCA+IHZhbHVlLmxlbmd0aCA/IG9sZFZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IHZhbHVlLmpvaW4oJycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG5ld1BvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIENvbW1vbiBjYXNlXG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCkge1xuICAgICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnQudmFsdWUgPSBvbGRTdHJpbmcuc2xpY2Uob2xkUG9zLCBvbGRQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gUmV2ZXJzZSBhZGQgYW5kIHJlbW92ZSBzbyByZW1vdmVzIGFyZSBvdXRwdXQgZmlyc3QgdG8gbWF0Y2ggY29tbW9uIGNvbnZlbnRpb25cbiAgICAgIC8vIFRoZSBkaWZmaW5nIGFsZ29yaXRobSBpcyB0aWVkIHRvIGFkZCB0aGVuIHJlbW92ZSBvdXRwdXQgYW5kIHRoaXMgaXMgdGhlIHNpbXBsZXN0XG4gICAgICAvLyByb3V0ZSB0byBnZXQgdGhlIGRlc2lyZWQgb3V0cHV0IHdpdGggbWluaW1hbCBvdmVyaGVhZC5cbiAgICAgIGlmIChjb21wb25lbnRQb3MgJiYgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXS5hZGRlZCkge1xuICAgICAgICBsZXQgdG1wID0gY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXSA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3NdID0gdG1wO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNwZWNpYWwgY2FzZSBoYW5kbGUgZm9yIHdoZW4gb25lIHRlcm1pbmFsIGlzIGlnbm9yZWQuIEZvciB0aGlzIGNhc2Ugd2UgbWVyZ2UgdGhlXG4gIC8vIHRlcm1pbmFsIGludG8gdGhlIHByaW9yIHN0cmluZyBhbmQgZHJvcCB0aGUgY2hhbmdlLlxuICBsZXQgbGFzdENvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMV07XG4gIGlmICgobGFzdENvbXBvbmVudC5hZGRlZCB8fCBsYXN0Q29tcG9uZW50LnJlbW92ZWQpICYmIGRpZmYuZXF1YWxzKCcnLCBsYXN0Q29tcG9uZW50LnZhbHVlKSkge1xuICAgIGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMl0udmFsdWUgKz0gbGFzdENvbXBvbmVudC52YWx1ZTtcbiAgICBjb21wb25lbnRzLnBvcCgpO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGF0aChwYXRoKSB7XG4gIHJldHVybiB7IG5ld1BvczogcGF0aC5uZXdQb3MsIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKSB9O1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNoYXJhY3RlckRpZmYgPSBuZXcgRGlmZigpO1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDaGFycyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNoYXJhY3RlckRpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY3NzRGlmZiA9IG5ldyBEaWZmKCk7XG5jc3NEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oW3t9OjssXXxcXHMrKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDc3Mob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7bGluZURpZmZ9IGZyb20gJy4vbGluZSc7XG5cbmNvbnN0IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuXG5leHBvcnQgY29uc3QganNvbkRpZmYgPSBuZXcgRGlmZigpO1xuLy8gRGlzY3JpbWluYXRlIGJldHdlZW4gdHdvIGxpbmVzIG9mIHByZXR0eS1wcmludGVkLCBzZXJpYWxpemVkIEpTT04gd2hlcmUgb25lIG9mIHRoZW0gaGFzIGFcbi8vIGRhbmdsaW5nIGNvbW1hIGFuZCB0aGUgb3RoZXIgZG9lc24ndC4gVHVybnMgb3V0IGluY2x1ZGluZyB0aGUgZGFuZ2xpbmcgY29tbWEgeWllbGRzIHRoZSBuaWNlc3Qgb3V0cHV0OlxuanNvbkRpZmYudXNlTG9uZ2VzdFRva2VuID0gdHJ1ZTtcblxuanNvbkRpZmYudG9rZW5pemUgPSBsaW5lRGlmZi50b2tlbml6ZTtcbmpzb25EaWZmLmNhc3RJbnB1dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeShjYW5vbmljYWxpemUodmFsdWUpLCB1bmRlZmluZWQsICcgICcpO1xufTtcbmpzb25EaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBEaWZmLnByb3RvdHlwZS5lcXVhbHMobGVmdC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSwgcmlnaHQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJykpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZKc29uKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjaykgeyByZXR1cm4ganNvbkRpZmYuZGlmZihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spOyB9XG5cblxuLy8gVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBwcmVzZW5jZSBvZiBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGJhaWxpbmcgb3V0IHdoZW4gZW5jb3VudGVyaW5nIGFuXG4vLyBvYmplY3QgdGhhdCBpcyBhbHJlYWR5IG9uIHRoZSBcInN0YWNrXCIgb2YgaXRlbXMgYmVpbmcgcHJvY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZShvYmosIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKSB7XG4gIHN0YWNrID0gc3RhY2sgfHwgW107XG4gIHJlcGxhY2VtZW50U3RhY2sgPSByZXBsYWNlbWVudFN0YWNrIHx8IFtdO1xuXG4gIGxldCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChzdGFja1tpXSA9PT0gb2JqKSB7XG4gICAgICByZXR1cm4gcmVwbGFjZW1lbnRTdGFja1tpXTtcbiAgICB9XG4gIH1cblxuICBsZXQgY2Fub25pY2FsaXplZE9iajtcblxuICBpZiAoJ1tvYmplY3QgQXJyYXldJyA9PT0gb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcuY2FsbChvYmopKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpbaV0gPSBjYW5vbmljYWxpemUob2JqW2ldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSB7fTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgbGV0IHNvcnRlZEtleXMgPSBbXSxcbiAgICAgICAga2V5O1xuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzb3J0ZWRLZXlzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGVkS2V5cy5zb3J0KCk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNvcnRlZEtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGtleSA9IHNvcnRlZEtleXNbaV07XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2tleV0gPSBjYW5vbmljYWxpemUob2JqW2tleV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gb2JqO1xuICB9XG4gIHJldHVybiBjYW5vbmljYWxpemVkT2JqO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbmV4cG9ydCBjb25zdCBsaW5lRGlmZiA9IG5ldyBEaWZmKCk7XG5saW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCByZXRMaW5lcyA9IFtdLFxuICAgICAgbGluZXNBbmROZXdsaW5lcyA9IHZhbHVlLnNwbGl0KC8oXFxufFxcclxcbikvKTtcblxuICAvLyBJZ25vcmUgdGhlIGZpbmFsIGVtcHR5IHRva2VuIHRoYXQgb2NjdXJzIGlmIHRoZSBzdHJpbmcgZW5kcyB3aXRoIGEgbmV3IGxpbmVcbiAgaWYgKCFsaW5lc0FuZE5ld2xpbmVzW2xpbmVzQW5kTmV3bGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICBsaW5lc0FuZE5ld2xpbmVzLnBvcCgpO1xuICB9XG5cbiAgLy8gTWVyZ2UgdGhlIGNvbnRlbnQgYW5kIGxpbmUgc2VwYXJhdG9ycyBpbnRvIHNpbmdsZSB0b2tlbnNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGxpbmUgPSBsaW5lc0FuZE5ld2xpbmVzW2ldO1xuXG4gICAgaWYgKGkgJSAyICYmICF0aGlzLm9wdGlvbnMubmV3bGluZUlzVG9rZW4pIHtcbiAgICAgIHJldExpbmVzW3JldExpbmVzLmxlbmd0aCAtIDFdICs9IGxpbmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSkge1xuICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICB9XG4gICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXRMaW5lcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmVHJpbW1lZExpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuXG5leHBvcnQgY29uc3Qgc2VudGVuY2VEaWZmID0gbmV3IERpZmYoKTtcbnNlbnRlbmNlRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFxcUy4rP1suIT9dKSg/PVxccyt8JCkvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmU2VudGVuY2VzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gc2VudGVuY2VEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbi8vIEJhc2VkIG9uIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xhdGluX3NjcmlwdF9pbl9Vbmljb2RlXG4vL1xuLy8gUmFuZ2VzIGFuZCBleGNlcHRpb25zOlxuLy8gTGF0aW4tMSBTdXBwbGVtZW50LCAwMDgw4oCTMDBGRlxuLy8gIC0gVSswMEQ3ICDDlyBNdWx0aXBsaWNhdGlvbiBzaWduXG4vLyAgLSBVKzAwRjcgIMO3IERpdmlzaW9uIHNpZ25cbi8vIExhdGluIEV4dGVuZGVkLUEsIDAxMDDigJMwMTdGXG4vLyBMYXRpbiBFeHRlbmRlZC1CLCAwMTgw4oCTMDI0RlxuLy8gSVBBIEV4dGVuc2lvbnMsIDAyNTDigJMwMkFGXG4vLyBTcGFjaW5nIE1vZGlmaWVyIExldHRlcnMsIDAyQjDigJMwMkZGXG4vLyAgLSBVKzAyQzcgIMuHICYjNzExOyAgQ2Fyb25cbi8vICAtIFUrMDJEOCAgy5ggJiM3Mjg7ICBCcmV2ZVxuLy8gIC0gVSswMkQ5ICDLmSAmIzcyOTsgIERvdCBBYm92ZVxuLy8gIC0gVSswMkRBICDLmiAmIzczMDsgIFJpbmcgQWJvdmVcbi8vICAtIFUrMDJEQiAgy5sgJiM3MzE7ICBPZ29uZWtcbi8vICAtIFUrMDJEQyAgy5wgJiM3MzI7ICBTbWFsbCBUaWxkZVxuLy8gIC0gVSswMkREICDLnSAmIzczMzsgIERvdWJsZSBBY3V0ZSBBY2NlbnRcbi8vIExhdGluIEV4dGVuZGVkIEFkZGl0aW9uYWwsIDFFMDDigJMxRUZGXG5jb25zdCBleHRlbmRlZFdvcmRDaGFycyA9IC9eW2EtekEtWlxcdXtDMH0tXFx1e0ZGfVxcdXtEOH0tXFx1e0Y2fVxcdXtGOH0tXFx1ezJDNn1cXHV7MkM4fS1cXHV7MkQ3fVxcdXsyREV9LVxcdXsyRkZ9XFx1ezFFMDB9LVxcdXsxRUZGfV0rJC91O1xuXG5jb25zdCByZVdoaXRlc3BhY2UgPSAvXFxTLztcblxuZXhwb3J0IGNvbnN0IHdvcmREaWZmID0gbmV3IERpZmYoKTtcbndvcmREaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBsZWZ0ID09PSByaWdodCB8fCAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KGxlZnQpICYmICFyZVdoaXRlc3BhY2UudGVzdChyaWdodCkpO1xufTtcbndvcmREaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHRva2VucyA9IHZhbHVlLnNwbGl0KC8oXFxzK3xcXGIpLyk7XG5cbiAgLy8gSm9pbiB0aGUgYm91bmRhcnkgc3BsaXRzIHRoYXQgd2UgZG8gbm90IGNvbnNpZGVyIHRvIGJlIGJvdW5kYXJpZXMuIFRoaXMgaXMgcHJpbWFyaWx5IHRoZSBleHRlbmRlZCBMYXRpbiBjaGFyYWN0ZXIgc2V0LlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGFuIGVtcHR5IHN0cmluZyBpbiB0aGUgbmV4dCBmaWVsZCBhbmQgd2UgaGF2ZSBvbmx5IHdvcmQgY2hhcnMgYmVmb3JlIGFuZCBhZnRlciwgbWVyZ2VcbiAgICBpZiAoIXRva2Vuc1tpICsgMV0gJiYgdG9rZW5zW2kgKyAyXVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2ldKVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2kgKyAyXSkpIHtcbiAgICAgIHRva2Vuc1tpXSArPSB0b2tlbnNbaSArIDJdO1xuICAgICAgdG9rZW5zLnNwbGljZShpICsgMSwgMik7XG4gICAgICBpLS07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRva2Vucztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzV2l0aFNwYWNlKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spO1xufVxuIiwiLyogU2VlIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMgb2YgdXNlICovXG5cbi8qXG4gKiBUZXh0IGRpZmYgaW1wbGVtZW50YXRpb24uXG4gKlxuICogVGhpcyBsaWJyYXJ5IHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgQVBJUzpcbiAqIEpzRGlmZi5kaWZmQ2hhcnM6IENoYXJhY3RlciBieSBjaGFyYWN0ZXIgZGlmZlxuICogSnNEaWZmLmRpZmZXb3JkczogV29yZCAoYXMgZGVmaW5lZCBieSBcXGIgcmVnZXgpIGRpZmYgd2hpY2ggaWdub3JlcyB3aGl0ZXNwYWNlXG4gKiBKc0RpZmYuZGlmZkxpbmVzOiBMaW5lIGJhc2VkIGRpZmZcbiAqXG4gKiBKc0RpZmYuZGlmZkNzczogRGlmZiB0YXJnZXRlZCBhdCBDU1MgY29udGVudFxuICpcbiAqIFRoZXNlIG1ldGhvZHMgYXJlIGJhc2VkIG9uIHRoZSBpbXBsZW1lbnRhdGlvbiBwcm9wb3NlZCBpblxuICogXCJBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgaXRzIFZhcmlhdGlvbnNcIiAoTXllcnMsIDE5ODYpLlxuICogaHR0cDovL2NpdGVzZWVyeC5pc3QucHN1LmVkdS92aWV3ZG9jL3N1bW1hcnk/ZG9pPTEwLjEuMS40LjY5MjdcbiAqL1xuaW1wb3J0IERpZmYgZnJvbSAnLi9kaWZmL2Jhc2UnO1xuaW1wb3J0IHtkaWZmQ2hhcnN9IGZyb20gJy4vZGlmZi9jaGFyYWN0ZXInO1xuaW1wb3J0IHtkaWZmV29yZHMsIGRpZmZXb3Jkc1dpdGhTcGFjZX0gZnJvbSAnLi9kaWZmL3dvcmQnO1xuaW1wb3J0IHtkaWZmTGluZXMsIGRpZmZUcmltbWVkTGluZXN9IGZyb20gJy4vZGlmZi9saW5lJztcbmltcG9ydCB7ZGlmZlNlbnRlbmNlc30gZnJvbSAnLi9kaWZmL3NlbnRlbmNlJztcblxuaW1wb3J0IHtkaWZmQ3NzfSBmcm9tICcuL2RpZmYvY3NzJztcbmltcG9ydCB7ZGlmZkpzb24sIGNhbm9uaWNhbGl6ZX0gZnJvbSAnLi9kaWZmL2pzb24nO1xuXG5pbXBvcnQge2FwcGx5UGF0Y2gsIGFwcGx5UGF0Y2hlc30gZnJvbSAnLi9wYXRjaC9hcHBseSc7XG5pbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvcGFyc2UnO1xuaW1wb3J0IHtzdHJ1Y3R1cmVkUGF0Y2gsIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsIGNyZWF0ZVBhdGNofSBmcm9tICcuL3BhdGNoL2NyZWF0ZSc7XG5cbmltcG9ydCB7Y29udmVydENoYW5nZXNUb0RNUH0gZnJvbSAnLi9jb252ZXJ0L2RtcCc7XG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9YTUx9IGZyb20gJy4vY29udmVydC94bWwnO1xuXG5leHBvcnQge1xuICBEaWZmLFxuXG4gIGRpZmZDaGFycyxcbiAgZGlmZldvcmRzLFxuICBkaWZmV29yZHNXaXRoU3BhY2UsXG4gIGRpZmZMaW5lcyxcbiAgZGlmZlRyaW1tZWRMaW5lcyxcbiAgZGlmZlNlbnRlbmNlcyxcblxuICBkaWZmQ3NzLFxuICBkaWZmSnNvbixcblxuICBzdHJ1Y3R1cmVkUGF0Y2gsXG4gIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsXG4gIGNyZWF0ZVBhdGNoLFxuICBhcHBseVBhdGNoLFxuICBhcHBseVBhdGNoZXMsXG4gIHBhcnNlUGF0Y2gsXG4gIGNvbnZlcnRDaGFuZ2VzVG9ETVAsXG4gIGNvbnZlcnRDaGFuZ2VzVG9YTUwsXG4gIGNhbm9uaWNhbGl6ZVxufTtcbiIsImltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgZGlzdGFuY2VJdGVyYXRvciBmcm9tICcuLi91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2goc291cmNlLCB1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodW5pRGlmZikpIHtcbiAgICBpZiAodW5pRGlmZi5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwcGx5UGF0Y2ggb25seSB3b3JrcyB3aXRoIGEgc2luZ2xlIGlucHV0LicpO1xuICAgIH1cblxuICAgIHVuaURpZmYgPSB1bmlEaWZmWzBdO1xuICB9XG5cbiAgLy8gQXBwbHkgdGhlIGRpZmYgdG8gdGhlIGlucHV0XG4gIGxldCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyksXG4gICAgICBodW5rcyA9IHVuaURpZmYuaHVua3MsXG5cbiAgICAgIGNvbXBhcmVMaW5lID0gb3B0aW9ucy5jb21wYXJlTGluZSB8fCAoKGxpbmVOdW1iZXIsIGxpbmUsIG9wZXJhdGlvbiwgcGF0Y2hDb250ZW50KSA9PiBsaW5lID09PSBwYXRjaENvbnRlbnQpLFxuICAgICAgZXJyb3JDb3VudCA9IDAsXG4gICAgICBmdXp6RmFjdG9yID0gb3B0aW9ucy5mdXp6RmFjdG9yIHx8IDAsXG4gICAgICBtaW5MaW5lID0gMCxcbiAgICAgIG9mZnNldCA9IDAsXG5cbiAgICAgIHJlbW92ZUVPRk5MLFxuICAgICAgYWRkRU9GTkw7XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgaHVuayBleGFjdGx5IGZpdHMgb24gdGhlIHByb3ZpZGVkIGxvY2F0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBodW5rRml0cyhodW5rLCB0b1Bvcykge1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgLy8gQ29udGV4dCBzYW5pdHkgY2hlY2tcbiAgICAgICAgaWYgKCFjb21wYXJlTGluZSh0b1BvcyArIDEsIGxpbmVzW3RvUG9zXSwgb3BlcmF0aW9uLCBjb250ZW50KSkge1xuICAgICAgICAgIGVycm9yQ291bnQrKztcblxuICAgICAgICAgIGlmIChlcnJvckNvdW50ID4gZnV6ekZhY3Rvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0b1BvcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU2VhcmNoIGJlc3QgZml0IG9mZnNldHMgZm9yIGVhY2ggaHVuayBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgbWF4TGluZSA9IGxpbmVzLmxlbmd0aCAtIGh1bmsub2xkTGluZXMsXG4gICAgICAgIGxvY2FsT2Zmc2V0ID0gMCxcbiAgICAgICAgdG9Qb3MgPSBvZmZzZXQgKyBodW5rLm9sZFN0YXJ0IC0gMTtcblxuICAgIGxldCBpdGVyYXRvciA9IGRpc3RhbmNlSXRlcmF0b3IodG9Qb3MsIG1pbkxpbmUsIG1heExpbmUpO1xuXG4gICAgZm9yICg7IGxvY2FsT2Zmc2V0ICE9PSB1bmRlZmluZWQ7IGxvY2FsT2Zmc2V0ID0gaXRlcmF0b3IoKSkge1xuICAgICAgaWYgKGh1bmtGaXRzKGh1bmssIHRvUG9zICsgbG9jYWxPZmZzZXQpKSB7XG4gICAgICAgIGh1bmsub2Zmc2V0ID0gb2Zmc2V0ICs9IGxvY2FsT2Zmc2V0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxPZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNldCBsb3dlciB0ZXh0IGxpbWl0IHRvIGVuZCBvZiB0aGUgY3VycmVudCBodW5rLCBzbyBuZXh0IG9uZXMgZG9uJ3QgdHJ5XG4gICAgLy8gdG8gZml0IG92ZXIgYWxyZWFkeSBwYXRjaGVkIHRleHRcbiAgICBtaW5MaW5lID0gaHVuay5vZmZzZXQgKyBodW5rLm9sZFN0YXJ0ICsgaHVuay5vbGRMaW5lcztcbiAgfVxuXG4gIC8vIEFwcGx5IHBhdGNoIGh1bmtzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICB0b1BvcyA9IGh1bmsub2Zmc2V0ICsgaHVuay5uZXdTdGFydCAtIDE7XG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMSk7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDAsIGNvbnRlbnQpO1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBsZXQgcHJldmlvdXNPcGVyYXRpb24gPSBodW5rLmxpbmVzW2ogLSAxXSA/IGh1bmsubGluZXNbaiAtIDFdWzBdIDogbnVsbDtcbiAgICAgICAgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICByZW1vdmVFT0ZOTCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIGFkZEVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBFT0ZOTCBpbnNlcnRpb24vcmVtb3ZhbFxuICBpZiAocmVtb3ZlRU9GTkwpIHtcbiAgICB3aGlsZSAoIWxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICBsaW5lcy5wb3AoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYWRkRU9GTkwpIHtcbiAgICBsaW5lcy5wdXNoKCcnKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbi8vIFdyYXBwZXIgdGhhdCBzdXBwb3J0cyBtdWx0aXBsZSBmaWxlIHBhdGNoZXMgdmlhIGNhbGxiYWNrcy5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoZXModW5pRGlmZiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgZnVuY3Rpb24gcHJvY2Vzc0luZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHVuaURpZmZbY3VycmVudEluZGV4KytdO1xuICAgIGlmICghaW5kZXgpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5sb2FkRmlsZShpbmRleCwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKGVycik7XG4gICAgICB9XG5cbiAgICAgIGxldCB1cGRhdGVkQ29udGVudCA9IGFwcGx5UGF0Y2goZGF0YSwgaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5wYXRjaGVkKGluZGV4LCB1cGRhdGVkQ29udGVudCk7XG5cbiAgICAgIHNldFRpbWVvdXQocHJvY2Vzc0luZGV4LCAwKTtcbiAgICB9KTtcbiAgfVxuICBwcm9jZXNzSW5kZXgoKTtcbn1cbiIsImltcG9ydCB7ZGlmZkxpbmVzfSBmcm9tICcuLi9kaWZmL2xpbmUnO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7IGNvbnRleHQ6IDQgfTtcbiAgfVxuXG4gIGNvbnN0IGRpZmYgPSBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIpO1xuICBkaWZmLnB1c2goe3ZhbHVlOiAnJywgbGluZXM6IFtdfSk7ICAgLy8gQXBwZW5kIGFuIGVtcHR5IHZhbHVlIHRvIG1ha2UgY2xlYW51cCBlYXNpZXJcblxuICBmdW5jdGlvbiBjb250ZXh0TGluZXMobGluZXMpIHtcbiAgICByZXR1cm4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7IHJldHVybiAnICcgKyBlbnRyeTsgfSk7XG4gIH1cblxuICBsZXQgaHVua3MgPSBbXTtcbiAgbGV0IG9sZFJhbmdlU3RhcnQgPSAwLCBuZXdSYW5nZVN0YXJ0ID0gMCwgY3VyUmFuZ2UgPSBbXSxcbiAgICAgIG9sZExpbmUgPSAxLCBuZXdMaW5lID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGRpZmZbaV0sXG4gICAgICAgICAgbGluZXMgPSBjdXJyZW50LmxpbmVzIHx8IGN1cnJlbnQudmFsdWUucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJyk7XG4gICAgY3VycmVudC5saW5lcyA9IGxpbmVzO1xuXG4gICAgaWYgKGN1cnJlbnQuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHByZXZpb3VzIGNvbnRleHQsIHN0YXJ0IHdpdGggdGhhdFxuICAgICAgaWYgKCFvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBkaWZmW2kgLSAxXTtcbiAgICAgICAgb2xkUmFuZ2VTdGFydCA9IG9sZExpbmU7XG4gICAgICAgIG5ld1JhbmdlU3RhcnQgPSBuZXdMaW5lO1xuXG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBvcHRpb25zLmNvbnRleHQgPiAwID8gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLW9wdGlvbnMuY29udGV4dCkpIDogW107XG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3V0cHV0IG91ciBjaGFuZ2VzXG4gICAgICBjdXJSYW5nZS5wdXNoKC4uLiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIChjdXJyZW50LmFkZGVkID8gJysnIDogJy0nKSArIGVudHJ5O1xuICAgICAgfSkpO1xuXG4gICAgICAvLyBUcmFjayB0aGUgdXBkYXRlZCBmaWxlIHBvc2l0aW9uXG4gICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZGVudGljYWwgY29udGV4dCBsaW5lcy4gVHJhY2sgbGluZSBjaGFuZ2VzXG4gICAgICBpZiAob2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAvLyBDbG9zZSBvdXQgYW55IGNoYW5nZXMgdGhhdCBoYXZlIGJlZW4gb3V0cHV0IChvciBqb2luIG92ZXJsYXBwaW5nKVxuICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCAqIDIgJiYgaSA8IGRpZmYubGVuZ3RoIC0gMikge1xuICAgICAgICAgIC8vIE92ZXJsYXBwaW5nXG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZW5kIHRoZSByYW5nZSBhbmQgb3V0cHV0XG4gICAgICAgICAgbGV0IGNvbnRleHRTaXplID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBvcHRpb25zLmNvbnRleHQpO1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcy5zbGljZSgwLCBjb250ZXh0U2l6ZSkpKTtcblxuICAgICAgICAgIGxldCBodW5rID0ge1xuICAgICAgICAgICAgb2xkU3RhcnQ6IG9sZFJhbmdlU3RhcnQsXG4gICAgICAgICAgICBvbGRMaW5lczogKG9sZExpbmUgLSBvbGRSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbmV3U3RhcnQ6IG5ld1JhbmdlU3RhcnQsXG4gICAgICAgICAgICBuZXdMaW5lczogKG5ld0xpbmUgLSBuZXdSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbGluZXM6IGN1clJhbmdlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoaSA+PSBkaWZmLmxlbmd0aCAtIDIgJiYgbGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gRU9GIGlzIGluc2lkZSB0aGlzIGh1bmtcbiAgICAgICAgICAgIGxldCBvbGRFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG9sZFN0cikpO1xuICAgICAgICAgICAgbGV0IG5ld0VPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3QobmV3U3RyKSk7XG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09IDAgJiYgIW9sZEVPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlOiBvbGQgaGFzIG5vIGVvbCBhbmQgbm8gdHJhaWxpbmcgY29udGV4dDsgbm8tbmwgY2FuIGVuZCB1cCBiZWZvcmUgYWRkc1xuICAgICAgICAgICAgICBjdXJSYW5nZS5zcGxpY2UoaHVuay5vbGRMaW5lcywgMCwgJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb2xkRU9GTmV3bGluZSB8fCAhbmV3RU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICBjdXJSYW5nZS5wdXNoKCdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaHVua3MucHVzaChodW5rKTtcblxuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIGN1clJhbmdlID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBvbGRGaWxlTmFtZTogb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lOiBuZXdGaWxlTmFtZSxcbiAgICBvbGRIZWFkZXI6IG9sZEhlYWRlciwgbmV3SGVhZGVyOiBuZXdIZWFkZXIsXG4gICAgaHVua3M6IGh1bmtzXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUd29GaWxlc1BhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGNvbnN0IGRpZmYgPSBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IHJldCA9IFtdO1xuICBpZiAob2xkRmlsZU5hbWUgPT0gbmV3RmlsZU5hbWUpIHtcbiAgICByZXQucHVzaCgnSW5kZXg6ICcgKyBvbGRGaWxlTmFtZSk7XG4gIH1cbiAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgcmV0LnB1c2goJy0tLSAnICsgZGlmZi5vbGRGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5vbGRIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYub2xkSGVhZGVyKSk7XG4gIHJldC5wdXNoKCcrKysgJyArIGRpZmYubmV3RmlsZU5hbWUgKyAodHlwZW9mIGRpZmYubmV3SGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm5ld0hlYWRlcikpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5odW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGh1bmsgPSBkaWZmLmh1bmtzW2ldO1xuICAgIHJldC5wdXNoKFxuICAgICAgJ0BAIC0nICsgaHVuay5vbGRTdGFydCArICcsJyArIGh1bmsub2xkTGluZXNcbiAgICAgICsgJyArJyArIGh1bmsubmV3U3RhcnQgKyAnLCcgKyBodW5rLm5ld0xpbmVzXG4gICAgICArICcgQEAnXG4gICAgKTtcbiAgICByZXQucHVzaC5hcHBseShyZXQsIGh1bmsubGluZXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldC5qb2luKCdcXG4nKSArICdcXG4nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGF0Y2goZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICByZXR1cm4gY3JlYXRlVHdvRmlsZXNQYXRjaChmaWxlTmFtZSwgZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VQYXRjaCh1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IGRpZmZzdHIgPSB1bmlEaWZmLnNwbGl0KCdcXG4nKSxcbiAgICAgIGxpc3QgPSBbXSxcbiAgICAgIGkgPSAwO1xuXG4gIGZ1bmN0aW9uIHBhcnNlSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0ge307XG4gICAgbGlzdC5wdXNoKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGRpZmYgbWV0YWRhdGFcbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIC8vIEZpbGUgaGVhZGVyIGZvdW5kLCBlbmQgcGFyc2luZyBkaWZmIG1ldGFkYXRhXG4gICAgICBpZiAoL14oXFwtXFwtXFwtfFxcK1xcK1xcK3xAQClcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIERpZmYgaW5kZXhcbiAgICAgIGxldCBoZWFkZXIgPSAoL14oPzpJbmRleDp8ZGlmZig/OiAtciBcXHcrKSspXFxzKyguKz8pXFxzKiQvKS5leGVjKGxpbmUpO1xuICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICBpbmRleC5pbmRleCA9IGhlYWRlclsxXTtcbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIGZpbGUgaGVhZGVycyBpZiB0aGV5IGFyZSBkZWZpbmVkLiBVbmlmaWVkIGRpZmYgcmVxdWlyZXMgdGhlbSwgYnV0XG4gICAgLy8gdGhlcmUncyBubyB0ZWNobmljYWwgaXNzdWVzIHRvIGhhdmUgYW4gaXNvbGF0ZWQgaHVuayB3aXRob3V0IGZpbGUgaGVhZGVyXG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgaHVua3NcbiAgICBpbmRleC5odW5rcyA9IFtdO1xuXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICBpZiAoL14oSW5kZXg6fGRpZmZ8XFwtXFwtXFwtfFxcK1xcK1xcKylcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKC9eQEAvLnRlc3QobGluZSkpIHtcbiAgICAgICAgaW5kZXguaHVua3MucHVzaChwYXJzZUh1bmsoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpbmUgJiYgb3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgICAgLy8gSWdub3JlIHVuZXhwZWN0ZWQgY29udGVudCB1bmxlc3MgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpbmUgJyArIChpICsgMSkgKyAnICcgKyBKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIHRoZSAtLS0gYW5kICsrKyBoZWFkZXJzLCBpZiBub25lIGFyZSBmb3VuZCwgbm8gbGluZXNcbiAgLy8gYXJlIGNvbnN1bWVkLlxuICBmdW5jdGlvbiBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpIHtcbiAgICBsZXQgZmlsZUhlYWRlciA9ICgvXihcXC1cXC1cXC18XFwrXFwrXFwrKVxccysoXFxTKylcXHM/KC4rPylcXHMqJC8pLmV4ZWMoZGlmZnN0cltpXSk7XG4gICAgaWYgKGZpbGVIZWFkZXIpIHtcbiAgICAgIGxldCBrZXlQcmVmaXggPSBmaWxlSGVhZGVyWzFdID09PSAnLS0tJyA/ICdvbGQnIDogJ25ldyc7XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnRmlsZU5hbWUnXSA9IGZpbGVIZWFkZXJbMl07XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnSGVhZGVyJ10gPSBmaWxlSGVhZGVyWzNdO1xuXG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIGEgaHVua1xuICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB3ZSBhcmUgYXQgdGhlIHN0YXJ0IG9mIGEgaHVuay5cbiAgZnVuY3Rpb24gcGFyc2VIdW5rKCkge1xuICAgIGxldCBjaHVua0hlYWRlckluZGV4ID0gaSxcbiAgICAgICAgY2h1bmtIZWFkZXJMaW5lID0gZGlmZnN0cltpKytdLFxuICAgICAgICBjaHVua0hlYWRlciA9IGNodW5rSGVhZGVyTGluZS5zcGxpdCgvQEAgLShcXGQrKSg/OiwoXFxkKykpPyBcXCsoXFxkKykoPzosKFxcZCspKT8gQEAvKTtcblxuICAgIGxldCBodW5rID0ge1xuICAgICAgb2xkU3RhcnQ6ICtjaHVua0hlYWRlclsxXSxcbiAgICAgIG9sZExpbmVzOiArY2h1bmtIZWFkZXJbMl0gfHwgMSxcbiAgICAgIG5ld1N0YXJ0OiArY2h1bmtIZWFkZXJbM10sXG4gICAgICBuZXdMaW5lczogK2NodW5rSGVhZGVyWzRdIHx8IDEsXG4gICAgICBsaW5lczogW11cbiAgICB9O1xuXG4gICAgbGV0IGFkZENvdW50ID0gMCxcbiAgICAgICAgcmVtb3ZlQ291bnQgPSAwO1xuICAgIGZvciAoOyBpIDwgZGlmZnN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9wZXJhdGlvbiA9IGRpZmZzdHJbaV1bMF07XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJyB8fCBvcGVyYXRpb24gPT09ICctJyB8fCBvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBodW5rLmxpbmVzLnB1c2goZGlmZnN0cltpXSk7XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSB0aGUgZW1wdHkgYmxvY2sgY291bnQgY2FzZVxuICAgIGlmICghYWRkQ291bnQgJiYgaHVuay5uZXdMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5uZXdMaW5lcyA9IDA7XG4gICAgfVxuICAgIGlmICghcmVtb3ZlQ291bnQgJiYgaHVuay5vbGRMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5vbGRMaW5lcyA9IDA7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBvcHRpb25hbCBzYW5pdHkgY2hlY2tpbmdcbiAgICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGlmIChhZGRDb3VudCAhPT0gaHVuay5uZXdMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZW1vdmVDb3VudCAhPT0gaHVuay5vbGRMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlbW92ZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBodW5rO1xuICB9XG5cbiAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgIHBhcnNlSW5kZXgoKTtcbiAgfVxuXG4gIHJldHVybiBsaXN0O1xufVxuIiwiLy8gSXRlcmF0b3IgdGhhdCB0cmF2ZXJzZXMgaW4gdGhlIHJhbmdlIG9mIFttaW4sIG1heF0sIHN0ZXBwaW5nXG4vLyBieSBkaXN0YW5jZSBmcm9tIGEgZ2l2ZW4gc3RhcnQgcG9zaXRpb24uIEkuZS4gZm9yIFswLCA0XSwgd2l0aFxuLy8gc3RhcnQgb2YgMiwgdGhpcyB3aWxsIGl0ZXJhdGUgMiwgMywgMSwgNCwgMC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBtaW5MaW5lLCBtYXhMaW5lKSB7XG4gIGxldCB3YW50Rm9yd2FyZCA9IHRydWUsXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgbG9jYWxPZmZzZXQgPSAxO1xuXG4gIHJldHVybiBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICBpZiAod2FudEZvcndhcmQgJiYgIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmIChiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICBsb2NhbE9mZnNldCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZXlvbmQgdGV4dCBsZW5ndGgsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGFmdGVyIG9mZnNldCBsb2NhdGlvbiAob3IgZGVzaXJlZCBsb2NhdGlvbiBvbiBmaXJzdCBpdGVyYXRpb24pXG4gICAgICBpZiAoc3RhcnQgKyBsb2NhbE9mZnNldCA8PSBtYXhMaW5lKSB7XG4gICAgICAgIHJldHVybiBsb2NhbE9mZnNldDtcbiAgICAgIH1cblxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKCFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZWZvcmUgdGV4dCBiZWdpbm5pbmcsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGJlZm9yZSBvZmZzZXQgbG9jYXRpb25cbiAgICAgIGlmIChtaW5MaW5lIDw9IHN0YXJ0IC0gbG9jYWxPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIC1sb2NhbE9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICB9XG5cbiAgICAvLyBXZSB0cmllZCB0byBmaXQgaHVuayBiZWZvcmUgdGV4dCBiZWdpbm5pbmcgYW5kIGJleW9uZCB0ZXh0IGxlbmdodCwgdGhlblxuICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG4gIH07XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGRlZmF1bHRzLmNhbGxiYWNrID0gb3B0aW9ucztcbiAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgZm9yIChsZXQgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdHM7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIGxjcyA9IHJlcXVpcmUoJy4vbGliL2xjcycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9saWIvYXJyYXknKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJy4vbGliL2pzb25QYXRjaCcpO1xudmFyIGludmVyc2UgPSByZXF1aXJlKCcuL2xpYi9pbnZlcnNlJyk7XG52YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2xpYi9qc29uUG9pbnRlcicpO1xudmFyIGVuY29kZVNlZ21lbnQgPSBqc29uUG9pbnRlci5lbmNvZGVTZWdtZW50O1xuXG5leHBvcnRzLmRpZmYgPSBkaWZmO1xuZXhwb3J0cy5wYXRjaCA9IHBhdGNoLmFwcGx5O1xuZXhwb3J0cy5wYXRjaEluUGxhY2UgPSBwYXRjaC5hcHBseUluUGxhY2U7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5jbG9uZSA9IHBhdGNoLmNsb25lO1xuXG4vLyBFcnJvcnNcbmV4cG9ydHMuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuZXhwb3J0cy5UZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9UZXN0RmFpbGVkRXJyb3InKTtcbmV4cG9ydHMuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgaXNWYWxpZE9iamVjdCA9IHBhdGNoLmlzVmFsaWRPYmplY3Q7XG52YXIgZGVmYXVsdEhhc2ggPSBwYXRjaC5kZWZhdWx0SGFzaDtcblxuLyoqXG4gKiBDb21wdXRlIGEgSlNPTiBQYXRjaCByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYSBhbmQgYi5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIGlmIGEgZnVuY3Rpb24sIHNlZSBvcHRpb25zLmhhc2hcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKHg6Kik6U3RyaW5nfE51bWJlcn0gb3B0aW9ucy5oYXNoIHVzZWQgdG8gaGFzaCBhcnJheSBpdGVtc1xuICogIGluIG9yZGVyIHRvIHJlY29nbml6ZSBpZGVudGljYWwgb2JqZWN0cywgZGVmYXVsdHMgdG8gSlNPTi5zdHJpbmdpZnlcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXkpOm9iamVjdH0gb3B0aW9ucy5tYWtlQ29udGV4dFxuICogIHVzZWQgdG8gZ2VuZXJhdGUgcGF0Y2ggY29udGV4dC4gSWYgbm90IHByb3ZpZGVkLCBjb250ZXh0IHdpbGwgbm90IGJlIGdlbmVyYXRlZFxuICogQHJldHVybnMge2FycmF5fSBKU09OIFBhdGNoIHN1Y2ggdGhhdCBwYXRjaChkaWZmKGEsIGIpLCBhKSB+IGJcbiAqL1xuZnVuY3Rpb24gZGlmZihhLCBiLCBvcHRpb25zKSB7XG5cdHJldHVybiBhcHBlbmRDaGFuZ2VzKGEsIGIsICcnLCBpbml0U3RhdGUob3B0aW9ucywgW10pKS5wYXRjaDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgaW5pdGlhbCBkaWZmIHN0YXRlIGZyb20gdGhlIHByb3ZpZGVkIG9wdGlvbnNcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgQHNlZSBkaWZmIG9wdGlvbnMgYWJvdmVcbiAqIEBwYXJhbSB7YXJyYXl9IHBhdGNoIGFuIGVtcHR5IG9yIGV4aXN0aW5nIEpTT04gUGF0Y2ggYXJyYXkgaW50byB3aGljaFxuICogIHRoZSBkaWZmIHNob3VsZCBnZW5lcmF0ZSBuZXcgcGF0Y2ggb3BlcmF0aW9uc1xuICogQHJldHVybnMge29iamVjdH0gaW5pdGlhbGl6ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBpbml0U3RhdGUob3B0aW9ucywgcGF0Y2gpIHtcblx0aWYodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLmhhc2gsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5tYWtlQ29udGV4dCwgZGVmYXVsdENvbnRleHQpLFxuXHRcdFx0aW52ZXJ0aWJsZTogIShvcHRpb25zLmludmVydGlibGUgPT09IGZhbHNlKVxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogZGVmYXVsdENvbnRleHQsXG5cdFx0XHRpbnZlcnRpYmxlOiB0cnVlXG5cdFx0fTtcblx0fVxufVxuXG4vKipcbiAqIEdpdmVuIHR3byBKU09OIHZhbHVlcyAob2JqZWN0LCBhcnJheSwgbnVtYmVyLCBzdHJpbmcsIGV0Yy4pLCBmaW5kIHRoZWlyXG4gKiBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kQXJyYXlDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdGlmKGlzVmFsaWRPYmplY3QoYSkgJiYgaXNWYWxpZE9iamVjdChiKSkge1xuXHRcdHJldHVybiBhcHBlbmRPYmplY3RDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdHJldHVybiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBvYmplY3RzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IG8xXG4gKiBAcGFyYW0ge29iamVjdH0gbzJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRPYmplY3RDaGFuZ2VzKG8xLCBvMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhvMik7XG5cdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHR2YXIgaSwga2V5O1xuXG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0dmFyIGtleVBhdGggPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdGlmKG8xW2tleV0gIT09IHZvaWQgMCkge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhvMVtrZXldLCBvMltrZXldLCBrZXlQYXRoLCBzdGF0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IGtleVBhdGgsIHZhbHVlOiBvMltrZXldIH0pO1xuXHRcdH1cblx0fVxuXG5cdGtleXMgPSBPYmplY3Qua2V5cyhvMSk7XG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0aWYobzJba2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogbzFba2V5XSB9KTtcblx0XHRcdH1cblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBhcnJheXMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRBcnJheUNoYW5nZXMoYTEsIGEyLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIgYTFoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGExKTtcblx0dmFyIGEyaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMik7XG5cblx0dmFyIGxjc01hdHJpeCA9IGxjcy5jb21wYXJlKGExaGFzaCwgYTJoYXNoKTtcblxuXHRyZXR1cm4gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4gbGNzTWF0cml4IGludG8gSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFuZCBhcHBlbmRcbiAqIHRoZW0gdG8gc3RhdGUucGF0Y2gsIHJlY3Vyc2luZyBpbnRvIGFycmF5IGVsZW1lbnRzIGFzIG5lY2Vzc2FyeVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzTWF0cml4XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBuZXcgc3RhdGUgd2l0aCBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYWRkZWQgYmFzZWRcbiAqICBvbiB0aGUgcHJvdmlkZWQgbGNzTWF0cml4XG4gKi9cbmZ1bmN0aW9uIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCkge1xuXHR2YXIgb2Zmc2V0ID0gMDtcblx0cmV0dXJuIGxjcy5yZWR1Y2UoZnVuY3Rpb24oc3RhdGUsIG9wLCBpLCBqKSB7XG5cdFx0dmFyIGxhc3QsIGNvbnRleHQ7XG5cdFx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgKGogKyBvZmZzZXQpO1xuXG5cdFx0aWYgKG9wID09PSBsY3MuUkVNT1ZFKSB7XG5cdFx0XHQvLyBDb2FsZXNjZSBhZGphY2VudCByZW1vdmUgKyBhZGQgaW50byByZXBsYWNlXG5cdFx0XHRsYXN0ID0gcGF0Y2hbcGF0Y2gubGVuZ3RoLTFdO1xuXHRcdFx0Y29udGV4dCA9IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKTtcblxuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IGExW2pdLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihsYXN0ICE9PSB2b2lkIDAgJiYgbGFzdC5vcCA9PT0gJ2FkZCcgJiYgbGFzdC5wYXRoID09PSBwKSB7XG5cdFx0XHRcdGxhc3Qub3AgPSAncmVwbGFjZSc7XG5cdFx0XHRcdGxhc3QuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRvZmZzZXQgLT0gMTtcblxuXHRcdH0gZWxzZSBpZiAob3AgPT09IGxjcy5BREQpIHtcblx0XHRcdC8vIFNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMiNzZWN0aW9uLTQuMVxuXHRcdFx0Ly8gTWF5IHVzZSBlaXRoZXIgaW5kZXg9PT1sZW5ndGggKm9yKiAnLScgdG8gaW5kaWNhdGUgYXBwZW5kaW5nIHRvIGFycmF5XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwLCB2YWx1ZTogYTJbaV0sXG5cdFx0XHRcdGNvbnRleHQ6IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKVxuXHRcdFx0fSk7XG5cblx0XHRcdG9mZnNldCArPSAxO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGFwcGVuZENoYW5nZXMoYTFbal0sIGEyW2ldLCBwLCBzdGF0ZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0YXRlO1xuXG5cdH0sIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBudW1iZXJ8c3RyaW5nfG51bGwgdmFsdWVzLCBpZiB0aGV5IGRpZmZlciwgYXBwZW5kIHRvIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge29iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihhICE9PSBiKSB7XG5cdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHBhdGgsIHZhbHVlOiBhIH0pO1xuXHRcdH1cblxuXHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYiB9KTtcblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGVcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHsqfSB5XG4gKiBAcmV0dXJucyB7Kn0geCBpZiBwcmVkaWNhdGUoeCkgaXMgdHJ1dGh5LCBvdGhlcndpc2UgeVxuICovXG5mdW5jdGlvbiBvckVsc2UocHJlZGljYXRlLCB4LCB5KSB7XG5cdHJldHVybiBwcmVkaWNhdGUoeCkgPyB4IDogeTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHBhdGNoIGNvbnRleHQgZ2VuZXJhdG9yXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSB1bmRlZmluZWQgY29udGV4dFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Q29udGV4dCgpIHtcblx0cmV0dXJuIHZvaWQgMDtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHggaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yO1xuXG5mdW5jdGlvbiBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjtcblxuZnVuY3Rpb24gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gVGVzdEZhaWxlZEVycm9yO1xuXG5mdW5jdGlvbiBUZXN0RmFpbGVkRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVGVzdEZhaWxlZEVycm9yOyIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbnMgPSBjb25zO1xuZXhwb3J0cy50YWlsID0gdGFpbDtcbmV4cG9ydHMubWFwID0gbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgeCB0byBhLCB3aXRob3V0IG11dGF0aW5nIGEuIEZhc3RlciB0aGFuIGEudW5zaGlmdCh4KVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IHdpdGggeCBwcmVwZW5kZWRcbiAqL1xuZnVuY3Rpb24gY29ucyh4LCBhKSB7XG5cdHZhciBsID0gYS5sZW5ndGg7XG5cdHZhciBiID0gbmV3IEFycmF5KGwrMSk7XG5cdGJbMF0gPSB4O1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2krMV0gPSBhW2ldO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IEFycmF5IGNvbnRhaW5pbmcgYWxsIGVsZW1lbnRzIGluIGEsIGV4Y2VwdCB0aGUgZmlyc3QuXG4gKiAgRmFzdGVyIHRoYW4gYS5zbGljZSgxKVxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSwgdGhlIGVxdWl2YWxlbnQgb2YgYS5zbGljZSgxKVxuICovXG5mdW5jdGlvbiB0YWlsKGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aC0xO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKTtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpXSA9IGFbaSsxXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIE1hcCBhbnkgYXJyYXktbGlrZS4gRmFzdGVyIHRoYW4gQXJyYXkucHJvdG90eXBlLm1hcFxuICogQHBhcmFtIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSBtYXBwZWQgYnkgZlxuICovXG5mdW5jdGlvbiBtYXAoZiwgYSkge1xuXHR2YXIgYiA9IG5ldyBBcnJheShhLmxlbmd0aCk7XG5cdGZvcih2YXIgaT0wOyBpPCBhLmxlbmd0aDsgKytpKSB7XG5cdFx0YltpXSA9IGYoYVtpXSk7XG5cdH1cblx0cmV0dXJuIGI7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qKlxuICogQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHggd2hpY2ggbXVzdCBiZSBhIGxlZ2FsIEpTT04gb2JqZWN0L2FycmF5L3ZhbHVlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIGNsb25lXG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gY2xvbmUgb2YgeFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5mdW5jdGlvbiBjbG9uZSh4KSB7XG5cdGlmKHggPT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRyZXR1cm4gY2xvbmVBcnJheSh4KTtcblx0fVxuXG5cdHJldHVybiBjbG9uZU9iamVjdCh4KTtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoeCkge1xuXHR2YXIgbCA9IHgubGVuZ3RoO1xuXHR2YXIgeSA9IG5ldyBBcnJheShsKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuXHRcdHlbaV0gPSBjbG9uZSh4W2ldKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAoeCkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHgpO1xuXHR2YXIgeSA9IHt9O1xuXG5cdGZvciAodmFyIGssIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRrID0ga2V5c1tpXTtcblx0XHR5W2tdID0gY2xvbmUoeFtrXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcblxuLyoqXG4gKiBjb21tdXRlIHRoZSBwYXRjaCBzZXF1ZW5jZSBhLGIgdG8gYixhXG4gKiBAcGFyYW0ge29iamVjdH0gYSBwYXRjaCBvcGVyYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBiIHBhdGNoIG9wZXJhdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbW11dGVQYXRocyhhLCBiKSB7XG5cdC8vIFRPRE86IGNhc2VzIGZvciBzcGVjaWFsIHBhdGhzOiAnJyBhbmQgJy8nXG5cdHZhciBsZWZ0ID0ganNvblBvaW50ZXIucGFyc2UoYS5wYXRoKTtcblx0dmFyIHJpZ2h0ID0ganNvblBvaW50ZXIucGFyc2UoYi5wYXRoKTtcblx0dmFyIHByZWZpeCA9IGdldENvbW1vblBhdGhQcmVmaXgobGVmdCwgcmlnaHQpO1xuXHR2YXIgaXNBcnJheSA9IGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBwcmVmaXgubGVuZ3RoKTtcblxuXHQvLyBOZXZlciBtdXRhdGUgdGhlIG9yaWdpbmFsc1xuXHR2YXIgYWMgPSBjb3B5UGF0Y2goYSk7XG5cdHZhciBiYyA9IGNvcHlQYXRjaChiKTtcblxuXHRpZihwcmVmaXgubGVuZ3RoID09PSAwICYmICFpc0FycmF5KSB7XG5cdFx0Ly8gUGF0aHMgc2hhcmUgbm8gY29tbW9uIGFuY2VzdG9yLCBzaW1wbGUgc3dhcFxuXHRcdHJldHVybiBbYmMsIGFjXTtcblx0fVxuXG5cdGlmKGlzQXJyYXkpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5UGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGNvbW11dGVUcmVlUGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGNvbW11dGVUcmVlUGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYoYS5wYXRoID09PSBiLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3QgY29tbXV0ZSAnICsgYS5vcCArICcsJyArIGIub3AgKyAnIHdpdGggaWRlbnRpY2FsIG9iamVjdCBwYXRocycpO1xuXHR9XG5cdC8vIEZJWE1FOiBJbXBsZW1lbnQgdHJlZSBwYXRoIGNvbW11dGF0aW9uXG5cdHJldHVybiBbYiwgYV07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aG9zZSBjb21tb24gYW5jZXN0b3IgKHdoaWNoIG1heSBiZSB0aGUgaW1tZWRpYXRlIHBhcmVudClcbiAqIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gYVxuICogQHBhcmFtIGxlZnRcbiAqIEBwYXJhbSBiXG4gKiBAcGFyYW0gcmlnaHRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihsZWZ0Lmxlbmd0aCA9PT0gcmlnaHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVNpYmxpbmdzKGEsIGxlZnQsIGIsIHJpZ2h0KTtcblx0fVxuXG5cdGlmIChsZWZ0Lmxlbmd0aCA+IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdC8vIGxlZnQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIHJpZ2h0XG5cdFx0bGVmdCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGIsIHJpZ2h0LCBhLCBsZWZ0LCAtMSk7XG5cdFx0YS5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihsZWZ0KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gcmlnaHQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIGxlZnRcblx0XHRyaWdodCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGEsIGxlZnQsIGIsIHJpZ2h0LCAxKTtcblx0XHRiLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKHJpZ2h0KSk7XG5cdH1cblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgaW5kZXgpIHtcblx0cmV0dXJuIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KGxlZnRbaW5kZXhdKVxuXHRcdCYmIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KHJpZ2h0W2luZGV4XSk7XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyByZWZlcnJpbmcgdG8gaXRlbXMgaW4gdGhlIHNhbWUgYXJyYXlcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEByZXR1cm5zIHsqW119XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVNpYmxpbmdzKGwsIGxwYXRoLCByLCBycGF0aCkge1xuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0dmFyIGNvbW11dGVkO1xuXG5cdGlmKGxpbmRleCA8IHJpbmRleCkge1xuXHRcdC8vIEFkanVzdCByaWdodCBwYXRoXG5cdFx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gMSk7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gcmluZGV4ICsgMTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9XG5cdH0gZWxzZSBpZihyLm9wID09PSAnYWRkJyB8fCByLm9wID09PSAnY29weScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoXG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBsaW5kZXggKyAxO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fSBlbHNlIGlmIChsaW5kZXggPiByaW5kZXggJiYgci5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoIG9ubHkgaWYgcmVtb3ZlIHdhcyBhdCBhIChzdHJpY3RseSkgbG93ZXIgaW5kZXhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIGxpbmRleCAtIDEpO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fVxuXG5cdHJldHVybiBbciwgbF07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aXRoIGEgY29tbW9uIGFycmF5IGFuY2VzdG9yXG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcGFyYW0gZGlyZWN0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5QW5jZXN0b3IobCwgbHBhdGgsIHIsIHJwYXRoLCBkaXJlY3Rpb24pIHtcblx0Ly8gcnBhdGggaXMgbG9uZ2VyIG9yIHNhbWUgbGVuZ3RoXG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHQvLyBDb3B5IHJwYXRoLCB0aGVuIGFkanVzdCBpdHMgYXJyYXkgaW5kZXhcblx0dmFyIHJjID0gcnBhdGguc2xpY2UoKTtcblxuXHRpZihsaW5kZXggPiByaW5kZXgpIHtcblx0XHRyZXR1cm4gcmM7XG5cdH1cblxuXHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gZGlyZWN0aW9uKTtcblx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCArIGRpcmVjdGlvbik7XG5cdH1cblxuXHRyZXR1cm4gcmM7XG59XG5cbmZ1bmN0aW9uIGdldENvbW1vblBhdGhQcmVmaXgocDEsIHAyKSB7XG5cdHZhciBwMWwgPSBwMS5sZW5ndGg7XG5cdHZhciBwMmwgPSBwMi5sZW5ndGg7XG5cdGlmKHAxbCA9PT0gMCB8fCBwMmwgPT09IDAgfHwgKHAxbCA8IDIgJiYgcDJsIDwgMikpIHtcblx0XHRyZXR1cm4gW107XG5cdH1cblxuXHQvLyBJZiBwYXRocyBhcmUgc2FtZSBsZW5ndGgsIHRoZSBsYXN0IHNlZ21lbnQgY2Fubm90IGJlIHBhcnRcblx0Ly8gb2YgYSBjb21tb24gcHJlZml4LiAgSWYgbm90IHRoZSBzYW1lIGxlbmd0aCwgdGhlIHByZWZpeCBjYW5ub3Rcblx0Ly8gYmUgbG9uZ2VyIHRoYW4gdGhlIHNob3J0ZXIgcGF0aC5cblx0dmFyIGwgPSBwMWwgPT09IHAybFxuXHRcdD8gcDFsIC0gMVxuXHRcdDogTWF0aC5taW4ocDFsLCBwMmwpO1xuXG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgcDFbaV0gPT09IHAyW2ldKSB7XG5cdFx0KytpXG5cdH1cblxuXHRyZXR1cm4gcDEuc2xpY2UoMCwgaSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlQYXRjaChwKSB7XG5cdGlmKHAub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCB9O1xuXHR9XG5cblx0aWYocC5vcCA9PT0gJ2NvcHknIHx8IHAub3AgPT09ICdtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIGZyb206IHAuZnJvbSB9O1xuXHR9XG5cblx0Ly8gdGVzdCwgYWRkLCByZXBsYWNlXG5cdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIHZhbHVlOiBwLnZhbHVlIH07XG59IiwibW9kdWxlLmV4cG9ydHMgPSBkZWVwRXF1YWxzO1xuXG4vKipcbiAqIENvbXBhcmUgMiBKU09OIHZhbHVlcywgb3IgcmVjdXJzaXZlbHkgY29tcGFyZSAyIEpTT04gb2JqZWN0cyBvciBhcnJheXNcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYlxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIGEgYW5kIGIgYXJlIHJlY3Vyc2l2ZWx5IGVxdWFsXG4gKi9cbmZ1bmN0aW9uIGRlZXBFcXVhbHMoYSwgYikge1xuXHRpZihhID09PSBiKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gY29tcGFyZUFycmF5cyhhLCBiKTtcblx0fVxuXG5cdGlmKHR5cGVvZiBhID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gY29tcGFyZU9iamVjdHMoYSwgYik7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYSwgYikge1xuXHRpZihhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwOyBpPGEubGVuZ3RoOyArK2kpIHtcblx0XHRpZighZGVlcEVxdWFscyhhW2ldLCBiW2ldKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlT2JqZWN0cyhhLCBiKSB7XG5cdGlmKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGFrZXlzID0gT2JqZWN0LmtleXMoYSk7XG5cdHZhciBia2V5cyA9IE9iamVjdC5rZXlzKGIpO1xuXG5cdGlmKGFrZXlzLmxlbmd0aCAhPT0gYmtleXMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMCwgazsgaTxha2V5cy5sZW5ndGg7ICsraSkge1xuXHRcdGsgPSBha2V5c1tpXTtcblx0XHRpZighKGsgaW4gYiAmJiBkZWVwRXF1YWxzKGFba10sIGJba10pKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufSIsInZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW52ZXJzZShwKSB7XG5cdHZhciBwciA9IFtdO1xuXHR2YXIgaSwgc2tpcDtcblx0Zm9yKGkgPSBwLmxlbmd0aC0xOyBpPj0gMDsgaSAtPSBza2lwKSB7XG5cdFx0c2tpcCA9IGludmVydE9wKHByLCBwW2ldLCBpLCBwKTtcblx0fVxuXG5cdHJldHVybiBwcjtcbn07XG5cbmZ1bmN0aW9uIGludmVydE9wKHBhdGNoLCBjLCBpLCBjb250ZXh0KSB7XG5cdHZhciBvcCA9IHBhdGNoZXNbYy5vcF07XG5cdHJldHVybiBvcCAhPT0gdm9pZCAwICYmIHR5cGVvZiBvcC5pbnZlcnNlID09PSAnZnVuY3Rpb24nXG5cdFx0PyBvcC5pbnZlcnNlKHBhdGNoLCBjLCBpLCBjb250ZXh0KVxuXHRcdDogMTtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuXG5leHBvcnRzLmFwcGx5ID0gcGF0Y2g7XG5leHBvcnRzLmFwcGx5SW5QbGFjZSA9IHBhdGNoSW5QbGFjZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuaXNWYWxpZE9iamVjdCA9IGlzVmFsaWRPYmplY3Q7XG5leHBvcnRzLmRlZmF1bHRIYXNoID0gZGVmYXVsdEhhc2g7XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuXG4vKipcbiAqIEFwcGx5IHRoZSBzdXBwbGllZCBKU09OIFBhdGNoIHRvIHhcbiAqIEBwYXJhbSB7YXJyYXl9IGNoYW5nZXMgSlNPTiBQYXRjaFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IG9wdGlvbnMuZmluZENvbnRleHRcbiAqICBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0XG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHBhdGNoZWQgdmVyc2lvbiBvZiB4LiBJZiB4IGlzXG4gKiAgYW4gYXJyYXkgb3Igb2JqZWN0LCBpdCB3aWxsIGJlIG11dGF0ZWQgYW5kIHJldHVybmVkLiBPdGhlcndpc2UsIGlmXG4gKiAgeCBpcyBhIHZhbHVlLCB0aGUgbmV3IHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIHBhdGNoKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0cmV0dXJuIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCBjbG9uZSh4KSwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdGlmKCFvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXHR9XG5cblx0Ly8gVE9ETzogQ29uc2lkZXIgdGhyb3dpbmcgaWYgY2hhbmdlcyBpcyBub3QgYW4gYXJyYXlcblx0aWYoIUFycmF5LmlzQXJyYXkoY2hhbmdlcykpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdHZhciBwYXRjaCwgcDtcblx0Zm9yKHZhciBpPTA7IGk8Y2hhbmdlcy5sZW5ndGg7ICsraSkge1xuXHRcdHAgPSBjaGFuZ2VzW2ldO1xuXHRcdHBhdGNoID0gcGF0Y2hlc1twLm9wXTtcblxuXHRcdGlmKHBhdGNoID09PSB2b2lkIDApIHtcblx0XHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignaW52YWxpZCBvcCAnICsgSlNPTi5zdHJpbmdpZnkocCkpO1xuXHRcdH1cblxuXHRcdHggPSBwYXRjaC5hcHBseSh4LCBwLCBvcHRpb25zKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0SGFzaCh4KSB7XG5cdHJldHVybiBpc1ZhbGlkT2JqZWN0KHgpID8gSlNPTi5zdHJpbmdpZnkoeCkgOiB4O1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIF9wYXJzZSA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXJQYXJzZScpO1xuXG5leHBvcnRzLmZpbmQgPSBmaW5kO1xuZXhwb3J0cy5qb2luID0gam9pbjtcbmV4cG9ydHMuYWJzb2x1dGUgPSBhYnNvbHV0ZTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMuZW5jb2RlU2VnbWVudCA9IGVuY29kZVNlZ21lbnQ7XG5leHBvcnRzLmRlY29kZVNlZ21lbnQgPSBkZWNvZGVTZWdtZW50O1xuZXhwb3J0cy5wYXJzZUFycmF5SW5kZXggPSBwYXJzZUFycmF5SW5kZXg7XG5leHBvcnRzLmlzVmFsaWRBcnJheUluZGV4ID0gaXNWYWxpZEFycmF5SW5kZXg7XG5cbi8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0yXG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIHNlcGFyYXRvclJ4ID0gL1xcLy9nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xudmFyIGVuY29kZWRTZXBhcmF0b3JSeCA9IC9+MS9nO1xuXG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlc2NhcGVSeCA9IC9+L2c7XG52YXIgZW5jb2RlZEVzY2FwZSA9ICd+MCc7XG52YXIgZW5jb2RlZEVzY2FwZVJ4ID0gL34wL2c7XG5cbi8qKlxuICogRmluZCB0aGUgcGFyZW50IG9mIHRoZSBzcGVjaWZpZWQgcGF0aCBpbiB4IGFuZCByZXR1cm4gYSBkZXNjcmlwdG9yXG4gKiBjb250YWluaW5nIHRoZSBwYXJlbnQgYW5kIGEga2V5LiAgSWYgdGhlIHBhcmVudCBkb2VzIG5vdCBleGlzdCBpbiB4LFxuICogcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZC5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4IG9iamVjdCBvciBhcnJheSBpbiB3aGljaCB0byBzZWFyY2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEpTT04gUG9pbnRlciBzdHJpbmcgKGVuY29kZWQpXG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBmaW5kQ29udGV4dFxuICogIG9wdGlvbmFsIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHQuICBJZiBwcm92aWRlZCwgY29udGV4dCBNVVNUIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcGFyYW0gez97YmVmb3JlOkFycmF5LCBhZnRlcjpBcnJheX19IGNvbnRleHQgb3B0aW9uYWwgcGF0Y2ggY29udGV4dCBmb3JcbiAqICBmaW5kQ29udGV4dCB0byB1c2UgdG8gYWRqdXN0IGFycmF5IGluZGljZXMuICBJZiBwcm92aWRlZCwgZmluZENvbnRleHQgTVVTVFxuICogIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcmV0dXJucyB7e3RhcmdldDpvYmplY3R8YXJyYXl8bnVtYmVyfHN0cmluZywga2V5OnN0cmluZ318dW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kKHgsIHBhdGgsIGZpbmRDb250ZXh0LCBjb250ZXh0KSB7XG5cdGlmKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmKHBhdGggPT09ICcnKSB7XG5cdFx0Ly8gd2hvbGUgZG9jdW1lbnRcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogdm9pZCAwIH07XG5cdH1cblxuXHRpZihwYXRoID09PSBzZXBhcmF0b3IpIHtcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogJycgfTtcblx0fVxuXG5cdHZhciBwYXJlbnQgPSB4LCBrZXk7XG5cdHZhciBoYXNDb250ZXh0ID0gY29udGV4dCAhPT0gdm9pZCAwO1xuXG5cdF9wYXJzZShwYXRoLCBmdW5jdGlvbihzZWdtZW50KSB7XG5cdFx0Ly8gaG0uLi4gdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBiZSBpZih0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0aWYoeCA9PSBudWxsKSB7XG5cdFx0XHQvLyBTaWduYWwgdGhhdCB3ZSBwcmVtYXR1cmVseSBoaXQgdGhlIGVuZCBvZiB0aGUgcGF0aCBoaWVyYXJjaHkuXG5cdFx0XHRwYXJlbnQgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRcdGtleSA9IGhhc0NvbnRleHRcblx0XHRcdFx0PyBmaW5kSW5kZXgoZmluZENvbnRleHQsIHBhcnNlQXJyYXlJbmRleChzZWdtZW50KSwgeCwgY29udGV4dClcblx0XHRcdFx0OiBzZWdtZW50ID09PSAnLScgPyBzZWdtZW50IDogcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXkgPSBzZWdtZW50O1xuXHRcdH1cblxuXHRcdHBhcmVudCA9IHg7XG5cdFx0eCA9IHhba2V5XTtcblx0fSk7XG5cblx0cmV0dXJuIHBhcmVudCA9PT0gbnVsbFxuXHRcdD8gdm9pZCAwXG5cdFx0OiB7IHRhcmdldDogcGFyZW50LCBrZXk6IGtleSB9O1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZShwYXRoKSB7XG5cdHJldHVybiBwYXRoWzBdID09PSBzZXBhcmF0b3IgPyBwYXRoIDogc2VwYXJhdG9yICsgcGF0aDtcbn1cblxuZnVuY3Rpb24gam9pbihzZWdtZW50cykge1xuXHRyZXR1cm4gc2VnbWVudHMuam9pbihzZXBhcmF0b3IpO1xufVxuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG5cdHZhciBzZWdtZW50cyA9IFtdO1xuXHRfcGFyc2UocGF0aCwgc2VnbWVudHMucHVzaC5iaW5kKHNlZ21lbnRzKSk7XG5cdHJldHVybiBzZWdtZW50cztcbn1cblxuZnVuY3Rpb24gY29udGFpbnMoYSwgYikge1xuXHRyZXR1cm4gYi5pbmRleE9mKGEpID09PSAwICYmIGJbYS5sZW5ndGhdID09PSBzZXBhcmF0b3I7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZW5jb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBkZWNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZGVjb2RlU2VnbWVudChzKSB7XG5cdC8vIFNlZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcblx0cmV0dXJuIHMucmVwbGFjZShlbmNvZGVkU2VwYXJhdG9yUngsIHNlcGFyYXRvcikucmVwbGFjZShlbmNvZGVkRXNjYXBlUngsIGVzY2FwZUNoYXIpO1xufVxuXG4vKipcbiAqIEVuY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGRlY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZW5jb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGVuY29kZVNlZ21lbnQocykge1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVzY2FwZVJ4LCBlbmNvZGVkRXNjYXBlKS5yZXBsYWNlKHNlcGFyYXRvclJ4LCBlbmNvZGVkU2VwYXJhdG9yKTtcbn1cblxudmFyIGFycmF5SW5kZXhSeCA9IC9eKDB8WzEtOV1cXGQqKSQvO1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHMgaXMgYSB2YWxpZCBKU09OIFBvaW50ZXIgYXJyYXkgaW5kZXhcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXgocykge1xuXHRyZXR1cm4gYXJyYXlJbmRleFJ4LnRlc3Qocyk7XG59XG5cbi8qKlxuICogU2FmZWx5IHBhcnNlIGEgc3RyaW5nIGludG8gYSBudW1iZXIgPj0gMC4gRG9lcyBub3QgY2hlY2sgZm9yIGRlY2ltYWwgbnVtYmVyc1xuICogQHBhcmFtIHtzdHJpbmd9IHMgbnVtZXJpYyBzdHJpbmdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IG51bWJlciA+PSAwXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleCAocykge1xuXHRpZihpc1ZhbGlkQXJyYXlJbmRleChzKSkge1xuXHRcdHJldHVybiArcztcblx0fVxuXG5cdHRocm93IG5ldyBTeW50YXhFcnJvcignaW52YWxpZCBhcnJheSBpbmRleCAnICsgcyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbmRleCAoZmluZENvbnRleHQsIHN0YXJ0LCBhcnJheSwgY29udGV4dCkge1xuXHR2YXIgaW5kZXggPSBzdGFydDtcblxuXHRpZihpbmRleCA8IDApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2FycmF5IGluZGV4IG91dCBvZiBib3VuZHMgJyArIGluZGV4KTtcblx0fVxuXG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCAmJiB0eXBlb2YgZmluZENvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRpbmRleCA9IGZpbmRDb250ZXh0KHN0YXJ0LCBhcnJheSwgY29udGV4dCk7XG5cdFx0aWYoaW5kZXggPCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIHBhdGNoIGNvbnRleHQgJyArIGNvbnRleHQpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBpbmRleDtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uUG9pbnRlclBhcnNlO1xuXG52YXIgcGFyc2VSeCA9IC9cXC98fjF8fjAvZztcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcblxuLyoqXG4gKiBQYXJzZSB0aHJvdWdoIGFuIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZywgZGVjb2RpbmcgZWFjaCBwYXRoIHNlZ21lbnRcbiAqIGFuZCBwYXNzaW5nIGl0IHRvIGFuIG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjc2VjdGlvbi00XG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmdcbiAqIEBwYXJhbSB7e2Z1bmN0aW9uKHNlZ21lbnQ6c3RyaW5nKTpib29sZWFufX0gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBvcmlnaW5hbCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGpzb25Qb2ludGVyUGFyc2UocGF0aCwgb25TZWdtZW50KSB7XG5cdHZhciBwb3MsIGFjY3VtLCBtYXRjaGVzLCBtYXRjaDtcblxuXHRwb3MgPSBwYXRoLmNoYXJBdCgwKSA9PT0gc2VwYXJhdG9yID8gMSA6IDA7XG5cdGFjY3VtID0gJyc7XG5cdHBhcnNlUngubGFzdEluZGV4ID0gcG9zO1xuXG5cdHdoaWxlKG1hdGNoZXMgPSBwYXJzZVJ4LmV4ZWMocGF0aCkpIHtcblxuXHRcdG1hdGNoID0gbWF0Y2hlc1swXTtcblx0XHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcywgcGFyc2VSeC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuXHRcdHBvcyA9IHBhcnNlUngubGFzdEluZGV4O1xuXG5cdFx0aWYobWF0Y2ggPT09IHNlcGFyYXRvcikge1xuXHRcdFx0aWYgKG9uU2VnbWVudChhY2N1bSkgPT09IGZhbHNlKSByZXR1cm4gcGF0aDtcblx0XHRcdGFjY3VtID0gJyc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFjY3VtICs9IG1hdGNoID09PSBlbmNvZGVkU2VwYXJhdG9yID8gc2VwYXJhdG9yIDogZXNjYXBlQ2hhcjtcblx0XHR9XG5cdH1cblxuXHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcyk7XG5cdG9uU2VnbWVudChhY2N1bSk7XG5cblx0cmV0dXJuIHBhdGg7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb21wYXJlID0gY29tcGFyZTtcbmV4cG9ydHMucmVkdWNlID0gcmVkdWNlO1xuXG52YXIgUkVNT1ZFLCBSSUdIVCwgQURELCBET1dOLCBTS0lQO1xuXG5leHBvcnRzLlJFTU9WRSA9IFJFTU9WRSA9IFJJR0hUID0gLTE7XG5leHBvcnRzLkFERCAgICA9IEFERCAgICA9IERPV04gID0gIDE7XG5leHBvcnRzLkVRVUFMICA9IFNLSVAgICA9IDA7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGxjcyBjb21wYXJpc29uIG1hdHJpeCBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlc1xuICogYmV0d2VlbiB0d28gYXJyYXktbGlrZSBzZXF1ZW5jZXNcbiAqIEBwYXJhbSB7YXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHBhcmFtIHthcnJheX0gYiBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBsY3MgZGVzY3JpcHRvciwgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcmVkdWNlKClcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG5cdHZhciBjb2xzID0gYS5sZW5ndGg7XG5cdHZhciByb3dzID0gYi5sZW5ndGg7XG5cblx0dmFyIHByZWZpeCA9IGZpbmRQcmVmaXgoYSwgYik7XG5cdHZhciBzdWZmaXggPSBwcmVmaXggPCBjb2xzICYmIHByZWZpeCA8IHJvd3Ncblx0XHQ/IGZpbmRTdWZmaXgoYSwgYiwgcHJlZml4KVxuXHRcdDogMDtcblxuXHR2YXIgcmVtb3ZlID0gc3VmZml4ICsgcHJlZml4IC0gMTtcblx0Y29scyAtPSByZW1vdmU7XG5cdHJvd3MgLT0gcmVtb3ZlO1xuXHR2YXIgbWF0cml4ID0gY3JlYXRlTWF0cml4KGNvbHMsIHJvd3MpO1xuXG5cdGZvciAodmFyIGogPSBjb2xzIC0gMTsgaiA+PSAwOyAtLWopIHtcblx0XHRmb3IgKHZhciBpID0gcm93cyAtIDE7IGkgPj0gMDsgLS1pKSB7XG5cdFx0XHRtYXRyaXhbaV1bal0gPSBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBwcmVmaXgsIGosIGkpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0cHJlZml4OiBwcmVmaXgsXG5cdFx0bWF0cml4OiBtYXRyaXgsXG5cdFx0c3VmZml4OiBzdWZmaXhcblx0fTtcbn1cblxuLyoqXG4gKiBSZWR1Y2UgYSBzZXQgb2YgbGNzIGNoYW5nZXMgcHJldmlvdXNseSBjcmVhdGVkIHVzaW5nIGNvbXBhcmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24ocmVzdWx0OiosIHR5cGU6bnVtYmVyLCBpOm51bWJlciwgajpudW1iZXIpfSBmXG4gKiAgcmVkdWNlciBmdW5jdGlvbiwgd2hlcmU6XG4gKiAgLSByZXN1bHQgaXMgdGhlIGN1cnJlbnQgcmVkdWNlIHZhbHVlLFxuICogIC0gdHlwZSBpcyB0aGUgdHlwZSBvZiBjaGFuZ2U6IEFERCwgUkVNT1ZFLCBvciBTS0lQXG4gKiAgLSBpIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGJcbiAqICAtIGogaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYVxuICogQHBhcmFtIHsqfSByIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3MgcmVzdWx0cyByZXR1cm5lZCBieSBjb21wYXJlKClcbiAqIEByZXR1cm5zIHsqfSB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuICovXG5mdW5jdGlvbiByZWR1Y2UoZiwgciwgbGNzKSB7XG5cdHZhciBpLCBqLCBrLCBvcDtcblxuXHR2YXIgbSA9IGxjcy5tYXRyaXg7XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBwcmVmaXhcblx0dmFyIGwgPSBsY3MucHJlZml4O1xuXHRmb3IoaSA9IDA7aSA8IGw7ICsraSkge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGksIGkpO1xuXHR9XG5cblx0Ly8gUmVkdWNlIGxvbmdlc3QgY2hhbmdlIHNwYW5cblx0ayA9IGk7XG5cdGwgPSBtLmxlbmd0aDtcblx0aSA9IDA7XG5cdGogPSAwO1xuXHR3aGlsZShpIDwgbCkge1xuXHRcdG9wID0gbVtpXVtqXS50eXBlO1xuXHRcdHIgPSBmKHIsIG9wLCBpK2ssIGorayk7XG5cblx0XHRzd2l0Y2gob3ApIHtcblx0XHRcdGNhc2UgU0tJUDogICsraTsgKytqOyBicmVhaztcblx0XHRcdGNhc2UgUklHSFQ6ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIERPV046ICArK2k7IGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlZHVjZSBzaGFyZWQgc3VmZml4XG5cdGkgKz0gaztcblx0aiArPSBrO1xuXHRsID0gbGNzLnN1ZmZpeDtcblx0Zm9yKGsgPSAwO2sgPCBsOyArK2spIHtcblx0XHRyID0gZihyLCBTS0lQLCBpK2ssIGorayk7XG5cdH1cblxuXHRyZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gZmluZFByZWZpeChhLCBiKSB7XG5cdHZhciBpID0gMDtcblx0dmFyIGwgPSBNYXRoLm1pbihhLmxlbmd0aCwgYi5sZW5ndGgpO1xuXHR3aGlsZShpIDwgbCAmJiBhW2ldID09PSBiW2ldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBmaW5kU3VmZml4KGEsIGIpIHtcblx0dmFyIGFsID0gYS5sZW5ndGggLSAxO1xuXHR2YXIgYmwgPSBiLmxlbmd0aCAtIDE7XG5cdHZhciBsID0gTWF0aC5taW4oYWwsIGJsKTtcblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBhW2FsLWldID09PSBiW2JsLWldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBzdGFydCwgaiwgaSkge1xuXHRpZiAoYVtqK3N0YXJ0XSA9PT0gYltpK3N0YXJ0XSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2ogKyAxXS52YWx1ZSwgdHlwZTogU0tJUCB9O1xuXHR9XG5cdGlmIChtYXRyaXhbaV1baiArIDFdLnZhbHVlIDwgbWF0cml4W2kgKyAxXVtqXS52YWx1ZSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaV1baiArIDFdLnZhbHVlICsgMSwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2pdLnZhbHVlICsgMSwgdHlwZTogRE9XTiB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYXRyaXggKGNvbHMsIHJvd3MpIHtcblx0dmFyIG0gPSBbXSwgaSwgaiwgbGFzdHJvdztcblxuXHQvLyBGaWxsIHRoZSBsYXN0IHJvd1xuXHRsYXN0cm93ID0gbVtyb3dzXSA9IFtdO1xuXHRmb3IgKGogPSAwOyBqPGNvbHM7ICsraikge1xuXHRcdGxhc3Ryb3dbal0gPSB7IHZhbHVlOiBjb2xzIC0gaiwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY29sXG5cdGZvciAoaSA9IDA7IGk8cm93czsgKytpKSB7XG5cdFx0bVtpXSA9IFtdO1xuXHRcdG1baV1bY29sc10gPSB7IHZhbHVlOiByb3dzIC0gaSwgdHlwZTogRE9XTiB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjZWxsXG5cdG1bcm93c11bY29sc10gPSB7IHZhbHVlOiAwLCB0eXBlOiBTS0lQIH07XG5cblx0cmV0dXJuIG07XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgZGVlcEVxdWFscyA9IHJlcXVpcmUoJy4vZGVlcEVxdWFscycpO1xudmFyIGNvbW11dGVQYXRocyA9IHJlcXVpcmUoJy4vY29tbXV0ZVBhdGhzJyk7XG5cbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxudmFyIFRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vVGVzdEZhaWxlZEVycm9yJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG52YXIgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBmaW5kID0ganNvblBvaW50ZXIuZmluZDtcbnZhciBwYXJzZUFycmF5SW5kZXggPSBqc29uUG9pbnRlci5wYXJzZUFycmF5SW5kZXg7XG5cbmV4cG9ydHMudGVzdCA9IHtcblx0YXBwbHk6IGFwcGx5VGVzdCxcblx0aW52ZXJzZTogaW52ZXJ0VGVzdCxcblx0Y29tbXV0ZTogY29tbXV0ZVRlc3Rcbn07XG5cbmV4cG9ydHMuYWRkID0ge1xuXHRhcHBseTogYXBwbHlBZGQsXG5cdGludmVyc2U6IGludmVydEFkZCxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuZXhwb3J0cy5yZW1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseVJlbW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVtb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVtb3ZlXG59O1xuXG5leHBvcnRzLnJlcGxhY2UgPSB7XG5cdGFwcGx5OiBhcHBseVJlcGxhY2UsXG5cdGludmVyc2U6IGludmVydFJlcGxhY2UsXG5cdGNvbW11dGU6IGNvbW11dGVSZXBsYWNlXG59O1xuXG5leHBvcnRzLm1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseU1vdmUsXG5cdGludmVyc2U6IGludmVydE1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVNb3ZlXG59O1xuXG5leHBvcnRzLmNvcHkgPSB7XG5cdGFwcGx5OiBhcHBseUNvcHksXG5cdGludmVyc2U6IG5vdEludmVydGlibGUsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbi8qKlxuICogQXBwbHkgYSB0ZXN0IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IHRlc3QgdGVzdCBvcGVyYXRpb25cbiAqIEB0aHJvd3Mge1Rlc3RGYWlsZWRFcnJvcn0gaWYgdGhlIHRlc3Qgb3BlcmF0aW9uIGZhaWxzXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlUZXN0KHgsIHRlc3QsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIHRlc3QucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgdGVzdC5jb250ZXh0KTtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXHR2YXIgaW5kZXgsIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdGluZGV4ID0gcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KTtcblx0XHQvL2luZGV4ID0gZmluZEluZGV4KG9wdGlvbnMuZmluZENvbnRleHQsIGluZGV4LCB0YXJnZXQsIHRlc3QuY29udGV4dCk7XG5cdFx0dmFsdWUgPSB0YXJnZXRbaW5kZXhdO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gcG9pbnRlci5rZXkgPT09IHZvaWQgMCA/IHBvaW50ZXIudGFyZ2V0IDogcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldO1xuXHR9XG5cblx0aWYoIWRlZXBFcXVhbHModmFsdWUsIHRlc3QudmFsdWUpKSB7XG5cdFx0dGhyb3cgbmV3IFRlc3RGYWlsZWRFcnJvcigndGVzdCBmYWlsZWQgJyArIEpTT04uc3RyaW5naWZ5KHRlc3QpKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG4vKipcbiAqIEludmVydCB0aGUgcHJvdmlkZWQgdGVzdCBhbmQgYWRkIGl0IHRvIHRoZSBpbnZlcnRlZCBwYXRjaCBzZXF1ZW5jZVxuICogQHBhcmFtIHByXG4gKiBAcGFyYW0gdGVzdFxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gaW52ZXJ0VGVzdChwciwgdGVzdCkge1xuXHRwci5wdXNoKHRlc3QpO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVRlc3QodGVzdCwgYikge1xuXHRpZih0ZXN0LnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSB0ZXN0LHJlbW92ZSAtPiByZW1vdmUsdGVzdCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCB0ZXN0XTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHModGVzdCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYW4gYWRkIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBhZGQgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5QWRkKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbCA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWw7XG5cdH1cblxuXHRfYWRkKHBvaW50ZXIsIHZhbCk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfYWRkKHBvaW50ZXIsIHZhbHVlKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHQvLyAnLScgaW5kaWNhdGVzICdhcHBlbmQnIHRvIGFycmF5XG5cdFx0aWYocG9pbnRlci5rZXkgPT09ICctJykge1xuXHRcdFx0dGFyZ2V0LnB1c2godmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuc3BsaWNlKHBvaW50ZXIua2V5LCAwLCB2YWx1ZSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIGFkZCBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheSAnICsgcG9pbnRlci5rZXkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydEFkZChwciwgYWRkKSB7XG5cdHZhciBjb250ZXh0ID0gYWRkLmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMoYWRkLnZhbHVlLCBjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogYWRkLnBhdGgsIHZhbHVlOiBhZGQudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IGFkZC5wYXRoLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZUFkZE9yQ29weShhZGQsIGIpIHtcblx0aWYoYWRkLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBhZGQscmVtb3ZlIC0+IHJlbW92ZSxhZGQgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhhZGQsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVwbGFjZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVwbGFjZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZXBsYWNlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBtaXNzaW5nVmFsdWUocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWx1ZSA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVwbGFjZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlcGxhY2Ugdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKHByZXYudmFsdWUsIGFycmF5LnRhaWwoY29udGV4dC5hZnRlcikpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IGMudmFsdWUgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlIH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlcGxhY2UocmVwbGFjZSwgYikge1xuXHRpZihyZXBsYWNlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSByZXBsYWNlLHJlbW92ZSAtPiByZW1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCByZXBsYWNlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVwbGFjZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZW1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZW1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdC8vIGtleSBtdXN0IGV4aXN0IGZvciByZW1vdmVcblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDApIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdF9yZW1vdmUocG9pbnRlcik7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlIChwb2ludGVyKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHR2YXIgcmVtb3ZlZDtcblx0aWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXQuc3BsaWNlKHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSksIDEpO1xuXHRcdHJldHVybiByZW1vdmVkWzBdO1xuXG5cdH0gZWxzZSBpZiAoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0ZGVsZXRlIHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0cmV0dXJuIHJlbW92ZWQ7XG5cblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiByZW1vdmUgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXknKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRSZW1vdmUocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZW1vdmUgdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZW1vdmUocmVtb3ZlLCBiKSB7XG5cdGlmKHJlbW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlbW92ZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlbW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseU1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdGlmKGpzb25Qb2ludGVyLmNvbnRhaW5zKGNoYW5nZS5wYXRoLCBjaGFuZ2UuZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ21vdmUuZnJvbSBjYW5ub3QgYmUgYW5jZXN0b3Igb2YgbW92ZS5wYXRoJyk7XG5cdH1cblxuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdF9hZGQocHRvLCBfcmVtb3ZlKHBmcm9tKSk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRNb3ZlKHByLCBjKSB7XG5cdHByLnB1c2goeyBvcDogJ21vdmUnLFxuXHRcdHBhdGg6IGMuZnJvbSwgY29udGV4dDogYy5mcm9tQ29udGV4dCxcblx0XHRmcm9tOiBjLnBhdGgsIGZyb21Db250ZXh0OiBjLmNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlTW92ZShtb3ZlLCBiKSB7XG5cdGlmKG1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIG1vdmUscmVtb3ZlIC0+IG1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKG1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgY29weSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgY29weSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlDb3B5KHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBmcm9tKSB8fCBtaXNzaW5nVmFsdWUocGZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdjb3B5LmZyb20gbXVzdCBleGlzdCcpO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBmcm9tLnRhcmdldDtcblx0dmFyIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwZnJvbS5rZXkpXTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwZnJvbS5rZXldO1xuXHR9XG5cblx0X2FkZChwdG8sIGNsb25lKHZhbHVlKSk7XG5cdHJldHVybiB4O1xufVxuXG4vLyBOT1RFOiBDb3B5IGlzIG5vdCBpbnZlcnRpYmxlXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy9qaWZmL2lzc3Vlcy85XG4vLyBUaGlzIG5lZWRzIG1vcmUgdGhvdWdodC4gV2UgbWF5IGhhdmUgdG8gZXh0ZW5kL2FtZW5kIEpTT04gUGF0Y2guXG4vLyBBdCBmaXJzdCBnbGFuY2UsIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQganVzdCBiZSBhIHJlbW92ZS5cbi8vIEhvd2V2ZXIsIHRoYXQncyBub3QgY29ycmVjdC4gIEl0IHZpb2xhdGVzIHRoZSBpbnZvbHV0aW9uOlxuLy8gaW52ZXJ0KGludmVydChwKSkgfj0gcC4gIEZvciBleGFtcGxlOlxuLy8gaW52ZXJ0KGNvcHkpIC0+IHJlbW92ZVxuLy8gaW52ZXJ0KHJlbW92ZSkgLT4gYWRkXG4vLyB0aHVzOiBpbnZlcnQoaW52ZXJ0KGNvcHkpKSAtPiBhZGQgKERPSCEgdGhpcyBzaG91bGQgYmUgY29weSEpXG5cbmZ1bmN0aW9uIG5vdEludmVydGlibGUoXywgYykge1xuXHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgJyArIGMub3ApO1xufVxuXG5mdW5jdGlvbiBub3RGb3VuZCAocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlciA9PT0gdm9pZCAwIHx8IChwb2ludGVyLnRhcmdldCA9PSBudWxsICYmIHBvaW50ZXIua2V5ICE9PSB2b2lkIDApO1xufVxuXG5mdW5jdGlvbiBtaXNzaW5nVmFsdWUocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlci5rZXkgIT09IHZvaWQgMCAmJiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB4IGlzIGEgbm9uLW51bGwgb2JqZWN0XG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0Jztcbn1cbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUkgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSVxyXG5cclxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXHJcblJlYWRPbmx5UHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlcidcclxuR29vZ2xlRHJpdmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlcidcclxuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXHJcblxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkQ29udGVudFxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICBAc3RhdGUgPVxyXG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXHJcbiAgICBAX2xpc3RlbmVycyA9IFtdXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF91aSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUkgQFxyXG5cclxuICBzZXRBcHBPcHRpb25zOiAoQGFwcE9wdGlvbnMgPSB7fSktPlxyXG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xyXG4gICAgYWxsUHJvdmlkZXJzID0ge31cclxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cclxuICAgICAgaWYgUHJvdmlkZXIuQXZhaWxhYmxlKClcclxuICAgICAgICBhbGxQcm92aWRlcnNbUHJvdmlkZXIuTmFtZV0gPSBQcm92aWRlclxyXG5cclxuICAgICMgZGVmYXVsdCB0byBhbGwgcHJvdmlkZXJzIGlmIG5vbiBzcGVjaWZpZWRcclxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgQGFwcE9wdGlvbnMucHJvdmlkZXJzID0gW11cclxuICAgICAgZm9yIG93biBwcm92aWRlck5hbWUgb2YgYWxsUHJvdmlkZXJzXHJcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcclxuXHJcbiAgICAjIGNoZWNrIHRoZSBwcm92aWRlcnNcclxuICAgIGF2YWlsYWJsZVByb3ZpZGVycyA9IFtdXHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIFtwcm92aWRlck5hbWUsIHByb3ZpZGVyT3B0aW9uc10gPSBpZiBpc1N0cmluZyBwcm92aWRlciB0aGVuIFtwcm92aWRlciwge31dIGVsc2UgW3Byb3ZpZGVyLm5hbWUsIHByb3ZpZGVyXVxyXG4gICAgICAjIG1lcmdlIGluIG90aGVyIG9wdGlvbnMgYXMgbmVlZGVkXHJcbiAgICAgIHByb3ZpZGVyT3B0aW9ucy5taW1lVHlwZSA/PSBAYXBwT3B0aW9ucy5taW1lVHlwZVxyXG4gICAgICBpZiBub3QgcHJvdmlkZXJOYW1lXHJcbiAgICAgICAgQF9lcnJvciBcIkludmFsaWQgcHJvdmlkZXIgc3BlYyAtIG11c3QgZWl0aGVyIGJlIHN0cmluZyBvciBvYmplY3Qgd2l0aCBuYW1lIHByb3BlcnR5XCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXHJcbiAgICAgICAgICBQcm92aWRlciA9IGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXHJcbiAgICAgICAgICBhdmFpbGFibGVQcm92aWRlcnMucHVzaCBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXHJcbiAgICBAX3NldFN0YXRlIGF2YWlsYWJsZVByb3ZpZGVyczogYXZhaWxhYmxlUHJvdmlkZXJzXHJcblxyXG4gICAgIyBhZGQgc2luZ2xldG9uIHNoYXJlUHJvdmlkZXIsIGlmIGl0IGV4aXN0c1xyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgcHJvdmlkZXIuY2FuICdzaGFyZSdcclxuICAgICAgICBAX3NldFN0YXRlIHNoYXJlUHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgYnJlYWtcclxuXHJcbiAgICBAX3VpLmluaXQgQGFwcE9wdGlvbnMudWlcclxuXHJcbiAgICAjIGNoZWNrIGZvciBhdXRvc2F2ZVxyXG4gICAgaWYgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW5pdGlhbGl6ZSB0aGUgY2xvdWRDb250ZW50RmFjdG9yeSB3aXRoIGFsbCBkYXRhIHdlIHdhbnQgaW4gdGhlIGVudmVsb3BlXHJcbiAgICBjbG91ZENvbnRlbnRGYWN0b3J5LnNldEVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgYXBwTmFtZTogQGFwcE9wdGlvbnMuYXBwTmFtZSBvciBcIlwiXHJcbiAgICAgIGFwcFZlcnNpb246IEBhcHBPcHRpb25zLmFwcFZlcnNpb24gb3IgXCJcIlxyXG4gICAgICBhcHBCdWlsZE51bTogQGFwcE9wdGlvbnMuYXBwQnVpbGROdW0gb3IgXCJcIlxyXG5cclxuICBzZXRQcm92aWRlck9wdGlvbnM6IChuYW1lLCBuZXdPcHRpb25zKSAtPlxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgcHJvdmlkZXIubmFtZSBpcyBuYW1lXHJcbiAgICAgICAgcHJvdmlkZXIub3B0aW9ucyA/PSB7fVxyXG4gICAgICAgIGZvciBrZXkgb2YgbmV3T3B0aW9uc1xyXG4gICAgICAgICAgcHJvdmlkZXIub3B0aW9uc1trZXldID0gbmV3T3B0aW9uc1trZXldXHJcbiAgICAgICAgYnJlYWtcclxuXHJcbiAgY29ubmVjdDogLT5cclxuICAgIEBfZXZlbnQgJ2Nvbm5lY3RlZCcsIHtjbGllbnQ6IEB9XHJcblxyXG4gIGxpc3RlbjogKGxpc3RlbmVyKSAtPlxyXG4gICAgaWYgbGlzdGVuZXJcclxuICAgICAgQF9saXN0ZW5lcnMucHVzaCBsaXN0ZW5lclxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW07IEBcclxuXHJcbiAgcHJlcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkucHJlcGVuZE1lbnVJdGVtIGl0ZW07IEBcclxuXHJcbiAgcmVwbGFjZU1lbnVJdGVtOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5yZXBsYWNlTWVudUl0ZW0ga2V5LCBpdGVtOyBAXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQmVmb3JlOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUJlZm9yZSBrZXksIGl0ZW07IEBcclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1BZnRlcjogKGtleSwgaXRlbSkgLT5cclxuICAgIEBfdWkuaW5zZXJ0TWVudUl0ZW1BZnRlciBrZXksIGl0ZW07IEBcclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXHJcblxyXG4gIG5ld0ZpbGU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZScsIHtjb250ZW50OiBcIlwifVxyXG5cclxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQGFwcE9wdGlvbnMudWk/Lm5ld0ZpbGVPcGVuc0luTmV3VGFiXHJcbiAgICAgIHdpbmRvdy5vcGVuIHdpbmRvdy5sb2NhdGlvbiwgJ19ibGFuaydcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XHJcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgQHNhdmUoKVxyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5ORVdfRklMRSdcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBuZXdGaWxlKClcclxuXHJcbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2xvYWQnXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cclxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQG9wZW5GaWxlRGlhbG9nIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgKG5vdCBAc3RhdGUuZGlydHkpIG9yIChjb25maXJtIHRyICd+Q09ORklSTS5PUEVOX0ZJTEUnKVxyXG4gICAgICBAX3VpLm9wZW5GaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5TaGFyZWRDb250ZW50OiAoaWQpIC0+XHJcbiAgICBAc3RhdGUuc2hhcmVQcm92aWRlcj8ubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvdmVyd3JpdGFibGU6IGZhbHNlLCBvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICBAc2F2ZUNvbnRlbnQgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvbnRlbnQ6IChzdHJpbmdDb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlOiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgc2F2aW5nOiBtZXRhZGF0YVxyXG4gICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBpc250IG1ldGFkYXRhXHJcbiAgICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NhdmVkRmlsZScsIGN1cnJlbnRDb250ZW50LCBtZXRhZGF0YSwge3NhdmVkOiB0cnVlfVxyXG4gICAgICAgIGNhbGxiYWNrPyBjdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChzdHJpbmdDb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29weURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBzYXZlQ29weSA9IChjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgQF91aS5zYXZlQ29weURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIGlmIGNvbnRlbnQgaXMgbnVsbFxyXG4gICAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpIC0+XHJcbiAgICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgc2F2ZUNvcHkgY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgc2hhcmVHZXRMaW5rOiAtPlxyXG4gICAgc2hvd1NoYXJlRGlhbG9nID0gKHNoYXJlZERvY3VtZW50SWQpID0+XHJcbiAgICAgIEBfdWkuc2hhcmVVcmxEaWFsb2cgXCIje2RvY3VtZW50LmxvY2F0aW9uLm9yaWdpbn0je2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfT9vcGVuU2hhcmVkPSN7c2hhcmVkRG9jdW1lbnRJZH1cIlxyXG5cclxuICAgIHNoYXJlZERvY3VtZW50SWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldCBcInNoYXJlZERvY3VtZW50SWRcIlxyXG4gICAgaWYgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgICBzaG93U2hhcmVEaWFsb2cgc2hhcmVkRG9jdW1lbnRJZFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2hhcmUgKHNoYXJlZERvY3VtZW50SWQpIC0+XHJcbiAgICAgICAgc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcclxuXHJcbiAgc2hhcmVVcGRhdGU6IC0+XHJcbiAgICBAc2hhcmUoKVxyXG5cclxuICBzaGFyZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHN0YXRlLnNoYXJlUHJvdmlkZXJcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICBzaGFyaW5nOiB0cnVlXHJcbiAgICAgICAgY3VycmVudENvbnRlbnQgPSBAX2NyZWF0ZU9yVXBkYXRlQ3VycmVudENvbnRlbnQgc3RyaW5nQ29udGVudFxyXG4gICAgICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyLnNoYXJlIGN1cnJlbnRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIChlcnIsIHNoYXJlZENvbnRlbnRJZCkgPT5cclxuICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzaGFyZWRGaWxlJywgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgY2FsbGJhY2s/IHNoYXJlZENvbnRlbnRJZFxyXG5cclxuICByZXZlcnRUb1NoYXJlZDogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlkID0gQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcbiAgICBpZiBpZCBhbmQgQHN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyLmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudC5jb3B5TWV0YWRhdGFUbyBjb250ZW50XHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG4gICAgICAgIGNhbGxiYWNrPyBudWxsXHJcblxyXG4gIHJldmVydFRvU2hhcmVkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj8gYW5kIGNvbmZpcm0gdHIgXCJ+Q09ORklSTS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIlxyXG4gICAgICBAcmV2ZXJ0VG9TaGFyZWQgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICBAX3VpLmRvd25sb2FkRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgQGFwcE9wdGlvbnMubWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKGVyciwgbWV0YWRhdGEpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdyZW5hbWVkRmlsZScsIEBzdGF0ZS5jdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gbmV3TmFtZVxyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF91aS5yZW5hbWVEaWFsb2cgQHN0YXRlLm1ldGFkYXRhLm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICAgIEByZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGN1cnJlbnRseSBhY3RpdmUgZmlsZSdcclxuXHJcbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIEBzdGF0ZS5vcGVuZWRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBAc3RhdGUub3BlbmVkQ29udGVudC5jbG9uZSgpfVxyXG5cclxuICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBpZiBjb25maXJtIHRyICd+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORUQnXHJcbiAgICAgICAgQHJldmVydFRvTGFzdE9wZW5lZCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsP1xyXG5cclxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEsIGFkZGl0aW9uYWxTdGF0ZT17fSkgLT5cclxuICAgIG1ldGFkYXRhPy5vdmVyd3JpdGFibGUgPz0gdHJ1ZVxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBjdXJyZW50Q29udGVudDogY29udGVudFxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBhZGRpdGlvbmFsU3RhdGVcclxuICAgICAgc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX3NldFN0YXRlIHN0YXRlXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LmdldFRleHQoKX1cclxuXHJcbiAgX2V2ZW50OiAodHlwZSwgZGF0YSA9IHt9LCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcclxuICAgIGZvciBsaXN0ZW5lciBpbiBAX2xpc3RlbmVyc1xyXG4gICAgICBsaXN0ZW5lciBldmVudFxyXG5cclxuICBfc2V0U3RhdGU6IChvcHRpb25zKSAtPlxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcclxuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9ldmVudCAnc3RhdGVDaGFuZ2VkJ1xyXG5cclxuICBfcmVzZXRTdGF0ZTogLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgb3BlbmVkQ29udGVudDogbnVsbFxyXG4gICAgICBjdXJyZW50Q29udGVudDogbnVsbFxyXG4gICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG5cclxuICBfY2xvc2VDdXJyZW50RmlsZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnY2xvc2UnXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5jbG9zZSBAc3RhdGUubWV0YWRhdGFcclxuXHJcbiAgX2NyZWF0ZU9yVXBkYXRlQ3VycmVudENvbnRlbnQ6IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/XHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQHN0YXRlLmN1cnJlbnRDb250ZW50XHJcbiAgICAgIGN1cnJlbnRDb250ZW50LnNldFRleHQgc3RyaW5nQ29udGVudFxyXG4gICAgZWxzZVxyXG4gICAgICBjdXJyZW50Q29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHN0cmluZ0NvbnRlbnRcclxuICAgIGlmIG1ldGFkYXRhP1xyXG4gICAgICBjdXJyZW50Q29udGVudC5hZGRNZXRhZGF0YSBkb2NOYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICBjdXJyZW50Q29udGVudFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5kb2N1bWVudFN0b3JlID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbVwiXHJcbmF1dGhvcml6ZVVybCAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvYXV0aGVudGljYXRlXCJcclxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcclxubGlzdFVybCAgICAgICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvYWxsXCJcclxubG9hZERvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvb3BlblwiXHJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxyXG5wYXRjaERvY3VtZW50VXJsICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9wYXRjaFwiXHJcbnJlbW92ZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2RlbGV0ZVwiXHJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcbmppZmYgPSByZXF1aXJlICdqaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZG9jU3RvcmVBdmFpbGFibGU6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fb25Eb2NTdG9yZUxvYWRlZCA9PlxyXG4gICAgICBAc2V0U3RhdGUgZG9jU3RvcmVBdmFpbGFibGU6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXHJcbiAgICApXHJcblxyXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgc2hhcmU6IHRydWVcclxuICAgICAgICBjbG9zZTogZmFsc2VcclxuXHJcbiAgICBAdXNlciA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xyXG5cclxuICBwcmV2aW91c2x5U2F2ZWRDb250ZW50OiBudWxsXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgIGVsc2VcclxuICAgICAgQHVzZXIgaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogLT5cclxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcclxuXHJcbiAgX29uRG9jU3RvcmVMb2FkZWQ6IChAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaykgLT5cclxuICAgIGlmIEBfZG9jU3RvcmVMb2FkZWRcclxuICAgICAgQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5TdWNjZXNzZnVsOiAoQHVzZXIpIC0+XHJcbiAgICBAX2xvZ2luV2luZG93Py5jbG9zZSgpXHJcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuXHJcbiAgX2NoZWNrTG9naW46IC0+XHJcbiAgICBwcm92aWRlciA9IEBcclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG4gICAgICAgIHByb3ZpZGVyLl9sb2dpblN1Y2Nlc3NmdWwoZGF0YSlcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpbldpbmRvdzogbnVsbFxyXG5cclxuICBfc2hvd0xvZ2luV2luZG93OiAtPlxyXG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXHJcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxyXG4gICAgZWxzZVxyXG5cclxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XHJcbiAgICAgICAgc2NyZWVuTGVmdCA9IHdpbmRvdy5zY3JlZW5MZWZ0IG9yIHNjcmVlbi5sZWZ0XHJcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcclxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcclxuICAgICAgICBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBzY3JlZW4uaGVpZ2h0XHJcblxyXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcclxuICAgICAgICB0b3AgPSAoKGhlaWdodCAvIDIpIC0gKGggLyAyKSkgKyBzY3JlZW5Ub3BcclxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cclxuXHJcbiAgICAgIHdpZHRoID0gMTAwMFxyXG4gICAgICBoZWlnaHQgPSA0ODBcclxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxyXG4gICAgICB3aW5kb3dGZWF0dXJlcyA9IFtcclxuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXHJcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XHJcbiAgICAgICAgJ3RvcD0nICsgcG9zaXRpb24udG9wIG9yIDIwMFxyXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxyXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xyXG4gICAgICAgICdyZXNpemFibGU9bm8nXHJcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xyXG4gICAgICAgICdkaWFsb2c9eWVzJ1xyXG4gICAgICAgICdtZW51YmFyPW5vJ1xyXG4gICAgICBdXHJcblxyXG4gICAgICBAX2xvZ2luV2luZG93ID0gd2luZG93Lm9wZW4oYXV0aG9yaXplVXJsLCAnYXV0aCcsIHdpbmRvd0ZlYXR1cmVzLmpvaW4oKSlcclxuXHJcbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxyXG4gICAgICAgIHRyeVxyXG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwgcG9sbFxyXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcclxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgICAgICBjYXRjaCBlXHJcbiAgICAgICAgICAjIGNvbnNvbGUubG9nIGVcclxuXHJcbiAgICAgIHBvbGwgPSBzZXRJbnRlcnZhbCBwb2xsQWN0aW9uLCAyMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEAsIGF1dGhDYWxsYmFjazogQGF1dGhDYWxsYmFja30pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBpZiBAdXNlclxyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogbGlzdFVybFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIG93biBrZXksIGZpbGUgb2YgZGF0YVxyXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZVxyXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6IHtpZDogZmlsZS5pZH1cclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxyXG5cclxuICBsb2FkU2hhcmVkQ29udGVudDogKGlkLCBjYWxsYmFjaykgLT5cclxuICAgIHNoYXJlZE1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgc2hhcmVkQ29udGVudElkOiBpZFxyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgb3ZlcndyaXRhYmxlOiBmYWxzZVxyXG4gICAgQGxvYWQgc2hhcmVkTWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpIC0+XHJcbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgc2hhcmVkTWV0YWRhdGFcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHdpdGhDcmVkZW50aWFscyA9IHVubGVzcyBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWQgdGhlbiB0cnVlIGVsc2UgZmFsc2VcclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IGxvYWREb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB7d2l0aENyZWRlbnRpYWxzfVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgZGF0YVxyXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjb250ZW50LmNsb25lKClcclxuICAgICAgICBtZXRhZGF0YS5uYW1lID89IGRhdGEuZG9jTmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGNvbnRlbnRcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgbWVzc2FnZSA9IGlmIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxyXG4gICAgICAgICAgXCJVbmFibGUgdG8gbG9hZCBkb2N1bWVudCAnI3ttZXRhZGF0YS5zaGFyZWRDb250ZW50SWR9Jy4gUGVyaGFwcyB0aGUgZmlsZSB3YXMgbm90IHNoYXJlZD9cIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIFwiVW5hYmxlIHRvIGxvYWQgI3ttZXRhZGF0YS5uYW1lIG9yIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWQgb3IgJ2ZpbGUnfVwiXHJcbiAgICAgICAgY2FsbGJhY2sgbWVzc2FnZVxyXG5cclxuICBzaGFyZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJ1bktleSA9IGNvbnRlbnQuZ2V0KFwic2hhcmVFZGl0S2V5XCIpIG9yIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygyKVxyXG5cclxuICAgIHBhcmFtcyA9XHJcbiAgICAgIHJ1bktleTogcnVuS2V5XHJcblxyXG4gICAgaWYgY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcbiAgICAgIHBhcmFtcy5yZWNvcmRpZCA9IGNvbnRlbnQuZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxyXG5cclxuICAgIGNvbnRlbnQuYWRkTWV0YWRhdGFcclxuICAgICAgX3Blcm1pc3Npb25zOiAxXHJcbiAgICAgIHNoYXJlRWRpdEtleTogbnVsbCAgICAgICAgICAgICMgc3RyaXAgdGhlc2Ugb3V0IG9mIHRoZSBzaGFyZWQgZGF0YSBpZiB0aGV5XHJcbiAgICAgIHNoYXJlZERvY3VtZW50SWQ6IG51bGwgICAgICAgICMgZXhpc3QgKHRoZXknbGwgYmUgcmUtYWRkZWQgb24gc3VjY2VzcylcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhzYXZlRG9jdW1lbnRVcmwsIHBhcmFtcylcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNvbnRlbnQuYWRkTWV0YWRhdGFcclxuICAgICAgICAgIHNoYXJlZERvY3VtZW50SWQ6IGRhdGEuaWRcclxuICAgICAgICAgIHNoYXJlRWRpdEtleTogcnVuS2V5XHJcbiAgICAgICAgICBfcGVybWlzc2lvbnM6IDBcclxuICAgICAgICBtZXRhZGF0YT8ubmFtZSA9IGRhdGEuZG9jTmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGEuaWRcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHNhdmU6IChjbG91ZENvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnQuZ2V0Q29udGVudCgpXHJcblxyXG4gICAgcGFyYW1zID0ge31cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG5cclxuICAgICMgU2VlIGlmIHdlIGNhbiBwYXRjaFxyXG4gICAgY2FuT3ZlcndyaXRlID0gbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudD9cclxuICAgIGlmIGNhbk92ZXJ3cml0ZSBhbmQgZGlmZiA9IEBfY3JlYXRlRGlmZiBAcHJldmlvdXNseVNhdmVkQ29udGVudC5nZXRDb250ZW50KCksIGNvbnRlbnRcclxuICAgICAgc2VuZENvbnRlbnQgPSBkaWZmXHJcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcclxuICAgIGVsc2VcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxyXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcclxuICAgICAgc2VuZENvbnRlbnQgPSBjb250ZW50XHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkgc2VuZENvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjbG91ZENvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXHJcblxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XHJcbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcclxuICAgIGt2cCA9IFtdXHJcbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcclxuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcclxuICAgIHJldHVybiB1cmwgKyBcIj9cIiArIGt2cC5qb2luIFwiJlwiXHJcblxyXG4gIF9jcmVhdGVEaWZmOiAob2JqMSwgb2JqMikgLT5cclxuICAgIHRyeVxyXG4gICAgICBvcHRzID1cclxuICAgICAgICBoYXNoOiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaWYgdHlwZW9mIEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpcyBcImZ1bmN0aW9uXCJcclxuICAgICAgZGlmZiA9IGppZmYuZGlmZihvYmoxLCBvYmoyLCBvcHRzKVxyXG4gICAgICByZXR1cm4gZGlmZlxyXG4gICAgY2F0Y2hcclxuICAgICAgcmV0dXJuIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuanNkaWZmID0gcmVxdWlyZSAnZGlmZidcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWxUaW1lSW5mbyBleHRlbmRzIEVycm9yXHJcbiAgY29uc3RydWN0b3I6IC0+IEBuYW1lID0gJ1JlYWxUaW1lSW5mbydcclxuXHJcbmNsYXNzIFJlYWxUaW1lRXJyb3IgZXh0ZW5kcyBFcnJvclxyXG4gIGNvbnN0cnVjdG9yOiAtPiBAbmFtZSA9ICdSZWFsVGltZUVycm9yJ1xyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRlZEdBUElcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgICAgZWxzZVxyXG4gICAgICAgICdXYWl0aW5nIGZvciB0aGUgR29vZ2xlIENsaWVudCBBUEkgdG8gbG9hZC4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBjbG9zZTogdHJ1ZVxyXG5cclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAdXNlciA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbGVEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEB1c2VSZWFsVGltZUFQSSA9IEBvcHRpb25zLnVzZVJlYWxUaW1lQVBJIG9yIGZhbHNlXHJcbiAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnLCAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJ11cclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAdXNlciA9IG51bGxcclxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIGdhcGkuY2xpZW50Lm9hdXRoMi51c2VyaW5mby5nZXQoKS5leGVjdXRlICh1c2VyKSA9PlxyXG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxyXG4gICAgaWYgQF9hdXRvUmVuZXdUaW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dCBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxyXG4gICAgICBAX2F1dG9SZW5ld1RpbWVvdXQgPSBzZXRUaW1lb3V0ICg9PiBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFKSwgKHBhcnNlSW50KGF1dGhUb2tlbi5leHBpcmVzX2luLCAxMCkgKiAwLjc1KSAqIDEwMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9zYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBxdWVyeSA9IFwiKChtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nKSBvciAobWltZVR5cGUgPSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicpKSBhbmQgJyN7aWYgbWV0YWRhdGEgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9JyBpbiBwYXJlbnRzXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgICAgb3ZlcndyaXRhYmxlOiBpdGVtLmVkaXRhYmxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICBpZDogaXRlbS5pZFxyXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cclxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBsb3dlckIgPSBiLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMucGF0Y2hcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIHJlc291cmNlOlxyXG4gICAgICAgICAgdGl0bGU6IG5ld05hbWVcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgaWYgcmVzdWx0Py5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2s/IHJlc3VsdC5lcnJvclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ucmVhbFRpbWU/LmRvYz9cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXHJcblxyXG4gIF9sb2FkR0FQSTogLT5cclxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXHJcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXHJcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XHJcbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcclxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xyXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXHJcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XHJcblxyXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzXHJcbiAgICAgIGNhbGxiYWNrKClcclxuICAgIGVsc2VcclxuICAgICAgc2VsZiA9IEBcclxuICAgICAgY2hlY2sgPSAtPlxyXG4gICAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnZHJpdmUnLCAndjInLCAtPlxyXG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxyXG4gICAgICAgICAgICAgIGdhcGkubG9hZCAnZHJpdmUtcmVhbHRpbWUnLCAtPlxyXG4gICAgICAgICAgICAgICAgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50cyA9IHRydWVcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcbiAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcblxyXG4gIF9sb2FkRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcclxuICAgICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICAgIHhoci5vcGVuICdHRVQnLCBmaWxlLmRvd25sb2FkVXJsXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje0BhdXRoVG9rZW4uYWNjZXNzX3Rva2VufVwiXHJcbiAgICAgICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCB4aHIucmVzcG9uc2VUZXh0XHJcbiAgICAgICAgeGhyLm9uZXJyb3IgPSAtPlxyXG4gICAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcclxuICAgICAgICB4aHIuc2VuZCgpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXHJcblxyXG4gIF9zYXZlRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXHJcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxyXG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgIHBhcmVudHM6IFt7aWQ6IGlmIG1ldGFkYXRhLnBhcmVudD8ucHJvdmlkZXJEYXRhPy5pZD8gdGhlbiBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfV1cclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXHJcbiAgICBdLmpvaW4gJydcclxuXHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxyXG4gICAgICBwYXRoOiBwYXRoXHJcbiAgICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxyXG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxyXG4gICAgICBib2R5OiBib2R5XHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSAtPlxyXG4gICAgICBpZiBjYWxsYmFja1xyXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXHJcbiAgICAgICAgZWxzZSBpZiBmaWxlXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBmaWxlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXHJcblxyXG4gIF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBmaWxlTG9hZGVkID0gKGRvYykgLT5cclxuICAgICAgY29udGVudCA9IGRvYy5nZXRNb2RlbCgpLmdldFJvb3QoKS5nZXQgJ2NvbnRlbnQnXHJcbiAgICAgIGlmIG1ldGFkYXRhLm92ZXJ3cml0YWJsZVxyXG4gICAgICAgIHRocm93RXJyb3IgPSAoZSkgLT5cclxuICAgICAgICAgIGlmIG5vdCBlLmlzTG9jYWxcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFJlYWxUaW1lRXJyb3IgJ0Fub3RoZXIgdXNlciBoYXMgbWFkZSBlZGl0cyB0byB0aGlzIGZpbGUnXHJcbiAgICAgICAgI2NvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0lOU0VSVEVELCB0aHJvd0Vycm9yXHJcbiAgICAgICAgI2NvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0RFTEVURUQsIHRocm93RXJyb3JcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lID1cclxuICAgICAgICBkb2M6IGRvY1xyXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgY29udGVudC5nZXRUZXh0KClcclxuXHJcbiAgICBpbml0ID0gKG1vZGVsKSAtPlxyXG4gICAgICBjb250ZW50ID0gbW9kZWwuY3JlYXRlU3RyaW5nICcnXHJcbiAgICAgIG1vZGVsLmdldFJvb3QoKS5zZXQgJ2NvbnRlbnQnLCBjb250ZW50XHJcblxyXG4gICAgZXJyb3IgPSAoZXJyKSA9PlxyXG4gICAgICBpZiBlcnIudHlwZSBpcyAnVE9LRU5fUkVGUkVTSF9SRVFVSVJFRCdcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBhbGVydCBlcnIubWVzc2FnZVxyXG5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICBlbHNlXHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5pbnNlcnRcclxuICAgICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuICAgICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSAtPlxyXG4gICAgICBpZiBmaWxlPy5pZFxyXG4gICAgICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IGZpbGUuZWRpdGFibGVcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgIGdhcGkuZHJpdmUucmVhbHRpbWUubG9hZCBmaWxlLmlkLCBmaWxlTG9hZGVkLCBpbml0LCBlcnJvclxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBsb2FkIGZpbGUnXHJcblxyXG4gIF9zYXZlUmVhbFRpbWVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5tb2RlbFxyXG4gICAgICBAX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbDogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGluZGV4ID0gMFxyXG4gICAgcmVhbFRpbWVDb250ZW50ID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmNvbnRlbnRcclxuICAgIGRpZmZzID0ganNkaWZmLmRpZmZDaGFycyByZWFsVGltZUNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpLCBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxyXG4gICAgZm9yIGRpZmYgaW4gZGlmZnNcclxuICAgICAgaWYgZGlmZi5yZW1vdmVkXHJcbiAgICAgICAgcmVhbFRpbWVDb250ZW50LnJlbW92ZVJhbmdlIGluZGV4LCBpbmRleCArIGRpZmYudmFsdWUubGVuZ3RoXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBkaWZmLmFkZGVkXHJcbiAgICAgICAgICByZWFsVGltZUNvbnRlbnQuaW5zZXJ0U3RyaW5nIGluZGV4LCBkaWZmLnZhbHVlXHJcbiAgICAgICAgaW5kZXggKz0gZGlmZi5jb3VudFxyXG4gICAgY2FsbGJhY2sgbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVEcml2ZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBmaWxlS2V5ID0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBzYXZlOiAje2UubWVzc2FnZX1cIlxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQ6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgIHByZWZpeCA9IEBfZ2V0S2V5IChtZXRhZGF0YT8ucGF0aCgpIG9yIFtdKS5qb2luICcvJ1xyXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxyXG4gICAgICAgIFtmaWxlbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxyXG4gICAgICAgIG5hbWUgPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpXHJcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICBuYW1lOiBuYW1lXHJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICBwYXJlbnQ6IG1ldGFkYXRhXHJcbiAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBkZWxldGUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG5ld05hbWUpLCBjb250ZW50XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gcmVuYW1lJ1xyXG5cclxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxyXG4gICAgXCJjZm06OiN7bmFtZS5yZXBsYWNlIC9cXHQvZywgJyAnfVwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RvcmFnZVByb3ZpZGVyXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZVxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAY29udGVudCwgQG1ldGFkYXRhfSA9IG9wdGlvbnNcclxuXHJcbmNsYXNzIENsb3VkTWV0YWRhdGFcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEB0eXBlLCBAcHJvdmlkZXIgPSBudWxsLCBAcGFyZW50ID0gbnVsbCwgQHByb3ZpZGVyRGF0YT17fSwgQG92ZXJ3cml0YWJsZSwgQHNoYXJlZENvbnRlbnRJZCwgQHNoYXJlZENvbnRlbnRTZWNyZXRLZXl9ID0gb3B0aW9uc1xyXG4gIEBGb2xkZXI6ICdmb2xkZXInXHJcbiAgQEZpbGU6ICdmaWxlJ1xyXG5cclxuICBwYXRoOiAtPlxyXG4gICAgX3BhdGggPSBbXVxyXG4gICAgcGFyZW50ID0gQHBhcmVudFxyXG4gICAgd2hpbGUgcGFyZW50IGlzbnQgbnVsbFxyXG4gICAgICBfcGF0aC51bnNoaWZ0IHBhcmVudFxyXG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50XHJcbiAgICBfcGF0aFxyXG5cclxuIyBzaW5nbGV0b24gdGhhdCBjYW4gY3JlYXRlIENsb3VkQ29udGVudCB3cmFwcGVkIHdpdGggZ2xvYmFsIG9wdGlvbnNcclxuY2xhc3MgQ2xvdWRDb250ZW50RmFjdG9yeVxyXG4gIGNvbnN0cnVjdG9yOiAtPlxyXG4gICAgQGVudmVsb3BlTWV0YWRhdGEgPSB7fVxyXG5cclxuICAjIHNldCBpbml0aWFsIGVudmVsb3BlTWV0YWRhdGEgb3IgdXBkYXRlIGluZGl2aWR1YWwgcHJvcGVydGllc1xyXG4gIHNldEVudmVsb3BlTWV0YWRhdGE6IChlbnZlbG9wZU1ldGFkYXRhKSAtPlxyXG4gICAgZm9yIGtleSBvZiBlbnZlbG9wZU1ldGFkYXRhXHJcbiAgICAgIEBlbnZlbG9wZU1ldGFkYXRhW2tleV0gPSBlbnZlbG9wZU1ldGFkYXRhW2tleV1cclxuXHJcbiAgIyByZXR1cm5zIG5ldyBDbG91ZENvbnRlbnQgY29udGFpbmluZyBlbnZlbG9wZWQgZGF0YVxyXG4gIGNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudDogKGNvbnRlbnQpIC0+XHJcbiAgICBuZXcgQ2xvdWRDb250ZW50IEBlbnZlbG9wQ29udGVudCBjb250ZW50XHJcblxyXG4gICMgZW52ZWxvcHMgY29udGVudCB3aXRoIG1ldGFkYXRhLCByZXR1cm5zIGFuIG9iamVjdC5cclxuICAjIElmIGNvbnRlbnQgd2FzIGFscmVhZHkgYW4gb2JqZWN0IChPYmplY3Qgb3IgSlNPTikgd2l0aCBtZXRhZGF0YSxcclxuICAjIGFueSBleGlzdGluZyBtZXRhZGF0YSB3aWxsIGJlIHJldGFpbmVkLlxyXG4gICMgTm90ZTogY2FsbGluZyBgZW52ZWxvcENvbnRlbnRgIG1heSBiZSBzYWZlbHkgY2FsbGVkIG9uIHNvbWV0aGluZyB0aGF0XHJcbiAgIyBoYXMgYWxyZWFkeSBoYWQgYGVudmVsb3BDb250ZW50YCBjYWxsZWQgb24gaXQsIGFuZCB3aWxsIGJlIGEgbm8tb3AuXHJcbiAgZW52ZWxvcENvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgZW52ZWxvcGVkQ2xvdWRDb250ZW50ID0gQF93cmFwSWZOZWVkZWQgY29udGVudFxyXG4gICAgZm9yIGtleSBvZiBAZW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBlbnZlbG9wZWRDbG91ZENvbnRlbnRba2V5XSA/PSBAZW52ZWxvcGVNZXRhZGF0YVtrZXldXHJcbiAgICByZXR1cm4gZW52ZWxvcGVkQ2xvdWRDb250ZW50XHJcblxyXG4gICMgZW52ZWxvcHMgY29udGVudCBpbiB7Y29udGVudDogY29udGVudH0gaWYgbmVlZGVkLCByZXR1cm5zIGFuIG9iamVjdFxyXG4gIF93cmFwSWZOZWVkZWQ6IChjb250ZW50KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcgY29udGVudFxyXG4gICAgICB0cnkgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxyXG4gICAgaWYgY29udGVudC5jb250ZW50P1xyXG4gICAgICByZXR1cm4gY29udGVudFxyXG4gICAgZWxzZVxyXG4gICAgICByZXR1cm4ge2NvbnRlbnR9XHJcblxyXG5jbGFzcyBDbG91ZENvbnRlbnRcclxuICBjb25zdHJ1Y3RvcjogKEBfID0ge30pIC0+XHJcblxyXG4gIGdldENvbnRlbnQ6IC0+IEBfXHJcbiAgZ2V0Q29udGVudEFzSlNPTjogIC0+IEpTT04uc3RyaW5naWZ5IEBfXHJcblxyXG4gIGNsb25lOiAtPiBuZXcgQ2xvdWRDb250ZW50IF8uY2xvbmVEZWVwIEBfXHJcblxyXG4gIHNldFRleHQ6ICh0ZXh0KSAtPiBAXy5jb250ZW50ID0gdGV4dFxyXG4gIGdldFRleHQ6IC0+IGlmIEBfLmNvbnRlbnQgaXMgbnVsbCB0aGVuICcnIGVsc2UgaWYgaXNTdHJpbmcoQF8uY29udGVudCkgdGhlbiBAXy5jb250ZW50IGVsc2UgSlNPTi5zdHJpbmdpZnkgQF8uY29udGVudFxyXG5cclxuICBhZGRNZXRhZGF0YTogKG1ldGFkYXRhKSAtPiBAX1trZXldID0gbWV0YWRhdGFba2V5XSBmb3Iga2V5IG9mIG1ldGFkYXRhXHJcbiAgZ2V0OiAocHJvcCkgLT4gQF9bcHJvcF1cclxuXHJcbiAgY29weU1ldGFkYXRhVG86ICh0bykgLT5cclxuICAgIG1ldGFkYXRhID0ge31cclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBAX1xyXG4gICAgICBpZiBrZXkgaXNudCAnY29udGVudCdcclxuICAgICAgICBtZXRhZGF0YVtrZXldID0gdmFsdWVcclxuICAgIHRvLmFkZE1ldGFkYXRhIG1ldGFkYXRhXHJcblxyXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXHJcblxyXG4gIEBBdmFpbGFibGU6IC0+IHRydWVcclxuXHJcbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cclxuICAgIEBjYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuXHJcbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY2FsbGJhY2tcclxuICAgICAgY2FsbGJhY2sgdHJ1ZVxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBudWxsXHJcblxyXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcclxuXHJcbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbW92ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVuYW1lJ1xyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2Nsb3NlJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIENsb3VkQ29udGVudDogQ2xvdWRDb250ZW50XHJcbiAgY2xvdWRDb250ZW50RmFjdG9yeTogbmV3IENsb3VkQ29udGVudEZhY3RvcnkoKVxyXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV1cclxuICAgICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBsaXN0ID0gW11cclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2Ygc3ViVHJlZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIF9maW5kU3ViVHJlZTogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmNoaWxkcmVuXHJcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy5wYXJlbnRcclxuICAgICAgbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5jaGlsZHJlblxyXG4gICAgZWxzZVxyXG4gICAgICBAdHJlZVxyXG5cclxuICBfbG9hZFRyZWU6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIEB0cmVlIGlzbnQgbnVsbFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uXHJcbiAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvbkNhbGxiYWNrXHJcbiAgICAgIEBvcHRpb25zLmpzb25DYWxsYmFjayAoZXJyLCBqc29uKSA9PlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgY2FsbGJhY2sgZXJyXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuc3JjXHJcbiAgICAgICQuYWpheFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgICB1cmw6IEBvcHRpb25zLnNyY1xyXG4gICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PlxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgZGF0YVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgICAgICBlcnJvcjogLT4gY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBqc29uIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgZWxzZVxyXG4gICAgICBjb25zb2xlLmVycm9yPyBcIk5vIGpzb24gb3Igc3JjIG9wdGlvbiBmb3VuZCBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgICAgY2FsbGJhY2sgbnVsbCwge31cclxuXHJcbiAgX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWU6IChqc29uLCBwYXJlbnQgPSBudWxsKSAtPlxyXG4gICAgdHJlZSA9IHt9XHJcbiAgICBmb3Igb3duIGZpbGVuYW1lIG9mIGpzb25cclxuICAgICAgdHlwZSA9IGlmIGlzU3RyaW5nIGpzb25bZmlsZW5hbWVdIHRoZW4gQ2xvdWRNZXRhZGF0YS5GaWxlIGVsc2UgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgdHlwZTogdHlwZVxyXG4gICAgICAgIHBhcmVudDogcGFyZW50XHJcbiAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgICBjaGlsZHJlbjogbnVsbFxyXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmNoaWxkcmVuID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGpzb25bZmlsZW5hbWVdLCBtZXRhZGF0YVxyXG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQganNvbltmaWxlbmFtZV1cclxuICAgICAgdHJlZVtmaWxlbmFtZV0gPVxyXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgIHRyZWVcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhZE9ubHlQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuXHJcbiAgQERlZmF1bHRNZW51OiBbJ25ld0ZpbGVEaWFsb2cnLCAnb3BlbkZpbGVEaWFsb2cnLCAncmV2ZXJ0U3ViTWVudScsICdzZXBhcmF0b3InLCAnc2F2ZScsICdzYXZlRmlsZUFzRGlhbG9nJywgJ3NoYXJlU3ViTWVudScsICdkb3dubG9hZERpYWxvZycsICdyZW5hbWVEaWFsb2cnXVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMsIGNsaWVudCkgLT5cclxuICAgIEBpdGVtcyA9IEBwYXJzZU1lbnVJdGVtcyBvcHRpb25zLm1lbnUsIGNsaWVudFxyXG4gICAgY29uc29sZS5kaXIgQGl0ZW1zXHJcblxyXG4gIHBhcnNlTWVudUl0ZW1zOiAobWVudUl0ZW1zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cclxuICAgICAgc3dpdGNoIGFjdGlvblxyXG4gICAgICAgIHdoZW4gJ3JldmVydFN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiAoY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/KSBvciBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cclxuICAgICAgICB3aGVuICdyZXZlcnRUb0xhc3RPcGVuZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3JlbmFtZSdcclxuICAgICAgICB3aGVuICdzYXZlQ29weURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdzaGFyZUdldExpbmsnLCAnc2hhcmVTdWJNZW51J1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9TaGFyZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRydWVcclxuXHJcbiAgICBnZXRJdGVtcyA9IChzdWJNZW51SXRlbXMpID0+XHJcbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xyXG4gICAgICAgIEBwYXJzZU1lbnVJdGVtcyBzdWJNZW51SXRlbXMsIGNsaWVudFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiXHJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXHJcbiAgICAgIHNoYXJlR2V0TGluazogdHIgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiXHJcbiAgICAgIHNoYXJlVXBkYXRlOiB0ciBcIn5NRU5VLlNIQVJFX1VQREFURVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IHRyIFwifk1FTlUuUkVWRVJUX1RPXCJcclxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcclxuXHJcbiAgICBzdWJNZW51cyA9XHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cclxuICAgICAgc2hhcmVTdWJNZW51OiBbJ3NoYXJlR2V0TGluaycsICdzaGFyZVVwZGF0ZSddXHJcblxyXG4gICAgaXRlbXMgPSBbXVxyXG4gICAgZm9yIGl0ZW0sIGkgaW4gbWVudUl0ZW1zXHJcbiAgICAgIGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBtZW51SXRlbSA9XHJcbiAgICAgICAgICBrZXk6IFwic2VwZXJhdG9yI3tpfVwiXHJcbiAgICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbWVudUl0ZW0gPVxyXG4gICAgICAgICAga2V5OiBpdGVtXHJcbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgICAgZW5hYmxlZDogc2V0RW5hYmxlZCBpdGVtXHJcbiAgICAgICAgICBpdGVtczogZ2V0SXRlbXMgc3ViTWVudXNbaXRlbV1cclxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG1lbnVJdGVtID0gaXRlbVxyXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5rZXkgPSBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcclxuICAgICAgICBtZW51SXRlbS5pdGVtcyA9IGl0ZW0uaXRlbXMgb3IgZ2V0SXRlbXMgaXRlbS5uYW1lXHJcbiAgICAgIGl0ZW1zLnB1c2ggbWVudUl0ZW1cclxuICAgIGl0ZW1zXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdwcmVwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncmVwbGFjZU1lbnVJdGVtJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQWZ0ZXInLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2V0TWVudUJhckluZm8nLCBpbmZvXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVDb3B5JywgKHRyICd+RElBTE9HLlNBVkVfQ09QWScpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgbWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWltZVR5cGU6IG1pbWVUeXBlXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGZpbGVuYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1JlbmFtZURpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgc2hhcmVVcmxEaWFsb2c6ICh1cmwpIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dTaGFyZVVybERpYWxvZycsXHJcbiAgICAgIHVybDogdXJsXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT5cclxuICByZXQgPSBudWxsXHJcbiAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuc29tZSAocGFpcikgLT5cclxuICAgIHBhaXIuc3BsaXQoXCI9XCIpWzBdIGlzIHBhcmFtIGFuZCAocmV0ID0gcGFpci5zcGxpdChcIj1cIilbMV0pXHJcbiAgcmV0XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXHJcbiIsIm1vZHVsZS5leHBvcnRzID1cclxuICBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5NRU5VLlNBVkVfQ09QWVwiOiBcIlNhdmUgQSBDb3B5IC4uLlwiXHJcbiAgXCJ+TUVOVS5TSEFSRVwiOiBcIlNoYXJlLi4uXCJcclxuICBcIn5NRU5VLlNIQVJFX0dFVF9MSU5LXCI6IFwiR2V0IGxpbmsgdG8gc2hhcmVkIHZpZXdcIlxyXG4gIFwifk1FTlUuU0hBUkVfVVBEQVRFXCI6IFwiVXBkYXRlIHNoYXJlZCB2aWV3XCJcclxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifk1FTlUuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT1wiOiBcIlJldmVydCB0by4uLlwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJSZWNlbnRseSBvcGVuZWQgc3RhdGVcIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPX1NIQVJFRF9WSUVXXCI6IFwiU2hhcmVkIHZpZXdcIlxyXG5cclxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkRJQUxPRy5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifkRJQUxPRy5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxyXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwifkRJQUxPRy5TSEFSRURcIjogXCJTaGFyZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5QUk9WSURFUi5MT0NBTF9TVE9SQUdFXCI6IFwiTG9jYWwgU3RvcmFnZVwiXHJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcclxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxyXG4gIFwiflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFXCI6IFwiRG9jdW1lbnQgU3RvcmVcIlxyXG5cclxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcclxuICBcIn5GSUxFX0RJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCI6IFwiRGVsZXRlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcclxuICBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCI6IFwiTG9hZGluZy4uLlwiXHJcblxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwiflJFTkFNRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlcIjogXCJDb3B5XCJcclxuICBcIn5TSEFSRV9ESUFMT0cuVklFV1wiOiBcIlZpZXdcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DTE9TRVwiOiBcIkNsb3NlXCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9TVUNDRVNTXCI6IFwiVGhlIHNoYXJlIHVybCBoYXMgYmVlbiBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCI6IFwiU29ycnksIHRoZSBzaGFyZSB1cmwgd2FzIG5vdCBhYmxlIHRvIGJlIGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlwiXHJcblxyXG4gIFwifkNPTkZJUk0uT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IG9wZW4gYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uTkVXX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJldmVydCB0aGUgZmlsZSB0byBpdHMgbW9zdCByZWNlbnRseSBvcGVuZWQgc3RhdGU/XCJcclxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gY3VycmVudGx5IHNoYXJlZCB2aWV3P1wiXHJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxyXG50cmFuc2xhdGlvbnNbJ2VuJ10gPSByZXF1aXJlICcuL2xhbmcvZW4tdXMnXHJcbmRlZmF1bHRMYW5nID0gJ2VuJ1xyXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXHJcblxyXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxyXG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxyXG4gIHRyYW5zbGF0aW9uLnJlcGxhY2UgdmFyUmVnRXhwLCAobWF0Y2gsIGtleSkgLT5cclxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRlXHJcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcclxuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5Eb3dubG9hZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kb3dubG9hZC1kaWFsb2ctdmlldydcclxuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcclxuU2hhcmVVcmxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2hhcmUtdXJsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogLT5cclxuICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lmhhc093blByb3BlcnR5KCduYW1lJykgYW5kIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZT8ubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWVcclxuICAgIGVsc2VcclxuICAgICAgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0UHJvdmlkZXI6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcbiAgICBkaXJ0eTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBmaWxlU3RhdHVzID0gaWYgZXZlbnQuc3RhdGUuc2F2aW5nXHJcbiAgICAgICAge21lc3NhZ2U6IFwiU2F2aW5nLi4uXCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxyXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dEb3dubG9hZERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBkb3dubG9hZERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcmVuYW1lRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1NoYXJlVXJsRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlVXJsRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQmVmb3JlJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgMFxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMuc3BsaWNlIGluZGV4LCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQWZ0ZXInXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBpZiBpbmRleCBpcyBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCArIDEsIDAsIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIF9nZXRNZW51SXRlbUluZGV4OiAoa2V5KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcga2V5XHJcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgcmV0dXJuIGluZGV4IGlmIGl0ZW0ua2V5IGlzIGtleVxyXG4gICAgICAtMVxyXG4gICAgZWxzZVxyXG4gICAgICBpbmRleCA9IHBhcnNlSW50IGtleSwgMTBcclxuICAgICAgaWYgaXNOYU4oaW5kZXgpIG9yIGluZGV4IDwgMCBvciBpbmRleCA+IEBzdGF0ZS5tZW51SXRlbXMubGVuZ3RoIC0gMVxyXG4gICAgICAgIC0xXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpbmRleFxyXG5cclxuICBjbG9zZURpYWxvZ3M6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXHJcblxyXG4gIHJlbmRlckRpYWxvZ3M6IC0+XHJcbiAgICBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2dcclxuICAgICAgKFByb3ZpZGVyVGFiYmVkRGlhbG9nIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGRpYWxvZzogQHN0YXRlLnByb3ZpZGVyRGlhbG9nLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xyXG4gICAgICAoRG93bmxvYWREaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUuZG93bmxvYWREaWFsb2cuZmlsZW5hbWUsIG1pbWVUeXBlOiBAc3RhdGUuZG93bmxvYWREaWFsb2cubWltZVR5cGUsIGNvbnRlbnQ6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5jb250ZW50LCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5yZW5hbWVEaWFsb2dcclxuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5zaGFyZVVybERpYWxvZ1xyXG4gICAgICAoU2hhcmVVcmxEaWFsb2cge3VybDogQHN0YXRlLnNoYXJlVXJsRGlhbG9nLnVybCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAcHJvcHMudXNpbmdJZnJhbWVcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgKE1lbnVCYXIge2NsaWVudDogQHByb3BzLmNsaWVudCwgZmlsZW5hbWU6IEBzdGF0ZS5maWxlbmFtZSwgcHJvdmlkZXI6IEBzdGF0ZS5wcm92aWRlciwgZmlsZVN0YXR1czogQHN0YXRlLmZpbGVTdGF0dXMsIGl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zLCBvcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnN9KVxyXG4gICAgICAgIChJbm5lckFwcCB7YXBwOiBAcHJvcHMuYXBwfSlcclxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXHJcbiAgICAgIClcclxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nIG9yIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXHJcbiAgICAgIClcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcHBcclxuIiwiQXV0aG9yaXplTWl4aW4gPVxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxyXG4gICAgICBAc2V0U3RhdGUgYXV0aG9yaXplZDogYXV0aG9yaXplZFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAc3RhdGUuYXV0aG9yaXplZFxyXG4gICAgICBAcmVuZGVyV2hlbkF1dGhvcml6ZWQoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZygpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Rvd25sb2FkRGlhbG9nVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAcHJvcHMuZmlsZW5hbWUgb3IgJydcclxuICAgIHN0YXRlID1cclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAZmlsZW5hbWUgPSBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5maWxlbmFtZVxyXG4gICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgdXBkYXRlRmlsZW5hbWU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBmaWxlbmFtZS52YWx1ZVxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIHRyaW06IChzKSAtPlxyXG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcblxyXG4gIGRvd25sb2FkOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBlLnRhcmdldC5zZXRBdHRyaWJ1dGUgJ2hyZWYnLCBcImRhdGE6I3tAcHJvcHMubWltZVR5cGV9LCN7ZW5jb2RlVVJJQ29tcG9uZW50KEBwcm9wcy5jb250ZW50LmdldFRleHQoKSl9XCJcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuICAgIGVsc2VcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5ET1dOTE9BRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+RE9XTkxPQURfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaSwgc3ZnLCBnLCByZWN0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cclxuXHJcbiAgbW91c2VFbnRlcjogLT5cclxuICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgIG1lbnVJdGVtID0gJCBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5pdGVtXHJcbiAgICAgIG1lbnUgPSBtZW51SXRlbS5wYXJlbnQoKS5wYXJlbnQoKVxyXG5cclxuICAgICAgQHByb3BzLnNldFN1Yk1lbnVcclxuICAgICAgICBzdHlsZTpcclxuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnXHJcbiAgICAgICAgICBsZWZ0OiBtZW51LndpZHRoKClcclxuICAgICAgICAgIHRvcDogbWVudUl0ZW0ucG9zaXRpb24oKS50b3AgLSBwYXJzZUludChtZW51SXRlbS5jc3MoJ3BhZGRpbmctdG9wJykpXHJcbiAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51PyBudWxsXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcclxuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gICAgY2xhc3NlcyA9IFsnbWVudUl0ZW0nXVxyXG4gICAgaWYgQHByb3BzLml0ZW0uc2VwYXJhdG9yXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xyXG4gICAgICAobGkge2NsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyl9LCAnJylcclxuICAgIGVsc2VcclxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3Igbm90IChAcHJvcHMuaXRlbS5hY3Rpb24gb3IgQHByb3BzLml0ZW0uaXRlbXMpXHJcbiAgICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXHJcbiAgICAgIChsaSB7cmVmOiAnaXRlbScsIGNsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyksIG9uQ2xpY2s6IEBjbGlja2VkLCBvbk1vdXNlRW50ZXI6IEBtb3VzZUVudGVyIH0sXHJcbiAgICAgICAgbmFtZVxyXG4gICAgICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZSd9KVxyXG4gICAgICApXHJcblxyXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG4gICAgc3ViTWVudTogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlLCBzdWJNZW51OiBmYWxzZX0gKSwgNTAwXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IHRpbWVvdXR9XHJcblxyXG4gIHVuYmx1cjogLT5cclxuICAgIGlmIEBzdGF0ZS50aW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cclxuXHJcbiAgc2V0U3ViTWVudTogKHN1Yk1lbnUpIC0+XHJcbiAgICBAc2V0U3RhdGUgc3ViTWVudTogc3ViTWVudVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgcmV0dXJuIGlmIGl0ZW0/Lml0ZW1zXHJcbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcclxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cclxuICAgIHJldHVybiB1bmxlc3MgaXRlbVxyXG4gICAgaXRlbS5hY3Rpb24/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxyXG4gICAgICAgIChzdmcge3ZlcnNpb246ICcxLjEnLCB3aWR0aDogMTYsIGhlaWdodDogMTYsIHZpZXdCb3g6ICcwIDAgMTYgMTYnLCBlbmFibGVCYWNrZ3JvdW5kOiAnbmV3IDAgMCAxNiAxNid9LFxyXG4gICAgICAgICAgKGcge30sXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiA3LCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAxMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcclxuICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBzZXRTdWJNZW51OiBAc2V0U3ViTWVudX0pIGZvciBpdGVtLCBpbmRleCBpbiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIClcclxuICAgICAgICAgIGlmIEBzdGF0ZS5zdWJNZW51XHJcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBzdHlsZTogQHN0YXRlLnN1Yk1lbnUuc3R5bGV9LFxyXG4gICAgICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdH0pIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUuc3ViTWVudS5pdGVtc1xyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRHJvcERvd25cclxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpbWcsIGksIHNwYW4sIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdEZpbGUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBsYXN0Q2xpY2sgPSAwXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgQHByb3BzLmZpbGVDb25maXJtZWQoKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LFxyXG4gICAgICAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogaWYgQHByb3BzLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgdGhlbiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZScgZWxzZSAnaWNvbi1ub3RlVG9vbCd9KVxyXG4gICAgICBAcHJvcHMubWV0YWRhdGEubmFtZVxyXG4gICAgKVxyXG5cclxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGluZzogdHJ1ZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBsb2FkIEBwcm9wcy5mb2xkZXJcclxuXHJcbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogKG5leHRQcm9wcykgLT5cclxuICAgIGlmIG5leHRQcm9wcy5mb2xkZXIgaXNudCBAcHJvcHMuZm9sZGVyXHJcbiAgICAgIEBsb2FkIG5leHRQcm9wcy5mb2xkZXJcclxuXHJcbiAgbG9hZDogKGZvbGRlcikgLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IGZvbGRlciwgKGVyciwgbGlzdCkgPT5cclxuICAgICAgcmV0dXJuIGFsZXJ0KGVycikgaWYgZXJyXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXHJcbiAgICAgIEBwcm9wcy5saXN0TG9hZGVkIGxpc3RcclxuXHJcbiAgcGFyZW50U2VsZWN0ZWQ6IChlKSAtPlxyXG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMuZm9sZGVyPy5wYXJlbnRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBpZiBAcHJvcHMuZm9sZGVyIGlzbnQgbnVsbFxyXG4gICAgICBsaXN0LnB1c2ggKGRpdiB7a2V5OiAncGFyZW50Jywgb25DbGljazogQHBhcmVudFNlbGVjdGVkfSwgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6ICdpY29uLXBhbGV0dGVBcnJvdy1jb2xsYXBzZSd9KSwgJ1BhcmVudCBGb2xkZXInKVxyXG4gICAgZm9yIG1ldGFkYXRhLCBpIGluIEBwcm9wcy5saXN0XHJcbiAgICAgIGxpc3QucHVzaCAoRmlsZUxpc3RGaWxlIHtrZXk6IGksIG1ldGFkYXRhOiBtZXRhZGF0YSwgc2VsZWN0ZWQ6IEBwcm9wcy5zZWxlY3RlZEZpbGUgaXMgbWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQHByb3BzLmZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQHByb3BzLmZpbGVDb25maXJtZWR9KVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkaW5nXHJcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBsaXN0XHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBAZ2V0U3RhdGVGb3JGb2xkZXIgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cclxuICAgIGZpbGVuYW1lID0gZS50YXJnZXQudmFsdWVcclxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgbWV0YWRhdGE6IEBmaW5kTWV0YWRhdGEgJC50cmltKEBzdGF0ZS5maWxlbmFtZSksIGxpc3RcclxuXHJcbiAgZ2V0U3RhdGVGb3JGb2xkZXI6IChmb2xkZXIpIC0+XHJcbiAgICBmb2xkZXI6IGZvbGRlclxyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcclxuICAgIGZpbGVuYW1lOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5uYW1lIG9yICcnXHJcbiAgICBsaXN0OiBbXVxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbWV0YWRhdGFcclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbnVsbFxyXG5cclxuICBjb25maXJtOiAtPlxyXG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIGlmIEBpc09wZW5cclxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogQHN0YXRlLmZvbGRlciBvciBudWxsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXJcclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIgPSBAcHJvcHMucHJvdmlkZXJcclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIHJlbW92ZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIGlmIG5vdCBlcnJcclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXHJcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXHJcbiAgICAgICAgICBAc2V0U3RhdGVcclxuICAgICAgICAgICAgbGlzdDogbGlzdFxyXG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcclxuXHJcbiAgY2FuY2VsOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUsIGxpc3QpIC0+XHJcbiAgICBmb3IgbWV0YWRhdGEgaW4gbGlzdFxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIGlzIGZpbGVuYW1lXHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXHJcbiAgICBudWxsXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICAgIEBjb25maXJtKClcclxuXHJcbiAgY29uZmlybURpc2FibGVkOiAtPlxyXG4gICAgKEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCkgb3IgKEBpc09wZW4gYW5kIG5vdCBAc3RhdGUubWV0YWRhdGEpXHJcblxyXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxyXG4gICAgY29uZmlybURpc2FibGVkID0gQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RpYWxvZ1RhYid9LFxyXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcmVtb3ZlLCBkaXNhYmxlZDogcmVtb3ZlRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgcmVtb3ZlRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCAodHIgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCIpKVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcclxuIiwie2RpdiwgaSwgc3BhbiwgaW5wdXR9ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01lbnVCYXInXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuICAgIGZpbGVuYW1lOiBAcHJvcHMuZmlsZW5hbWVcclxuXHJcbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogKG5leHRQcm9wcykgLT5cclxuICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogbmV4dFByb3BzLmZpbGVuYW1lXHJcblxyXG4gIGZpbGVuYW1lQ2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIGlmIG5vdyAtIEBsYXN0Q2xpY2sgPD0gMjUwXHJcbiAgICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3JlbmFtZSdcclxuICAgICAgICBAc2V0U3RhdGUgZWRpdGluZ0ZpbGVuYW1lOiB0cnVlXHJcbiAgICAgICAgc2V0VGltZW91dCAoPT4gQGZvY3VzRmlsZW5hbWUoKSksIDEwXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAcHJvcHMuY2xpZW50LnNhdmVGaWxlRGlhbG9nKClcclxuICAgIEBsYXN0Q2xpY2sgPSBub3dcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAtPlxyXG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZmlsZW5hbWUoKS52YWx1ZVxyXG5cclxuICBmaWxlbmFtZUJsdXJyZWQ6IC0+XHJcbiAgICBAcmVuYW1lKClcclxuXHJcbiAgZmlsZW5hbWU6IC0+XHJcbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy5maWxlbmFtZSlcclxuXHJcbiAgZm9jdXNGaWxlbmFtZTogLT5cclxuICAgIGVsID0gQGZpbGVuYW1lKClcclxuICAgIGVsLmZvY3VzKClcclxuICAgIGlmIHR5cGVvZiBlbC5zZWxlY3Rpb25TdGFydCBpcyAnbnVtYmVyJ1xyXG4gICAgICBlbC5zZWxlY3Rpb25TdGFydCA9IGVsLnNlbGVjdGlvbkVuZCA9IGVsLnZhbHVlLmxlbmd0aFxyXG4gICAgZWxzZSBpZiB0eXBlb2YgZWwuY3JlYXRlVGV4dFJhbmdlIGlzbnQgJ3VuZGVmaW5lZCdcclxuICAgICAgcmFuZ2UgPSBlbC5jcmVhdGVUZXh0UmFuZ2UoKVxyXG4gICAgICByYW5nZS5jb2xsYXBzZSBmYWxzZVxyXG4gICAgICByYW5nZS5zZWxlY3QoKVxyXG5cclxuICByZW5hbWU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBzdGF0ZS5maWxlbmFtZS5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcbiAgICBpZiBmaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jbGllbnQucmVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEsIGZpbGVuYW1lXHJcbiAgICBAc2V0U3RhdGUgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxM1xyXG4gICAgICBAcmVuYW1lKClcclxuICAgIGVsc2UgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAcHJvcHMuZmlsZW5hbWVcclxuICAgICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcblxyXG4gIGhlbHA6IC0+XHJcbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1sZWZ0J30sXHJcbiAgICAgICAgKERyb3Bkb3duIHtpdGVtczogQHByb3BzLml0ZW1zfSlcclxuICAgICAgICBpZiBAc3RhdGUuZWRpdGluZ0ZpbGVuYW1lXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnfSxcclxuICAgICAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbkJsdXI6IEBmaWxlbmFtZUJsdXJyZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZScsIG9uQ2xpY2s6IEBmaWxlbmFtZUNsaWNrZWR9LCBAc3RhdGUuZmlsZW5hbWUpXHJcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6IFwibWVudS1iYXItZmlsZS1zdGF0dXMtI3tAcHJvcHMuZmlsZVN0YXR1cy50eXBlfVwifSwgQHByb3BzLmZpbGVTdGF0dXMubWVzc2FnZSlcclxuICAgICAgKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmluZm9cclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWJhci1pbmZvJ30sIEBwcm9wcy5vcHRpb25zLmluZm8pXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyIGFuZCBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCgpXHJcbiAgICAgICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyVXNlcigpXHJcbiAgICAgICAgaWYgQHByb3BzLm9wdGlvbnMuaGVscFxyXG4gICAgICAgICAgKGkge3N0eWxlOiB7Zm9udFNpemU6IFwiMTNweFwifSwgY2xhc3NOYW1lOiAnY2xpY2thYmxlIGljb24taGVscCcsIG9uQ2xpY2s6IEBoZWxwfSlcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xyXG57ZGl2LCBpfSA9IFJlYWN0LkRPTVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsRGlhbG9nJ1xyXG5cclxuICBjbG9zZTogLT5cclxuICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXHJcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tZXhcIiwgb25DbGljazogQGNsb3NlfSlcclxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKFRhYmJlZFBhbmVsIHt0YWJzOiBAcHJvcHMudGFicywgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXh9KVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsJ1xyXG5cclxuICB3YXRjaEZvckVzY2FwZTogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMjdcclxuICAgICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9uICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICBjb21wb25lbnRXaWxsVW5tb3VudDogLT5cclxuICAgICQod2luZG93KS5vZmYgJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWJhY2tncm91bmQnfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtY29udGVudCd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICApXHJcbiIsIk1vZGFsVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZmlsZS1kaWFsb2ctdGFiLXZpZXcnXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1Byb3ZpZGVyVGFiYmVkRGlhbG9nJ1xyXG5cclxuICByZW5kZXI6ICAtPlxyXG4gICAgW2NhcGFiaWxpdHksIFRhYkNvbXBvbmVudF0gPSBzd2l0Y2ggQHByb3BzLmRpYWxvZy5hY3Rpb25cclxuICAgICAgd2hlbiAnb3BlbkZpbGUnIHRoZW4gWydsaXN0JywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGUnLCAnc2F2ZUZpbGVBcycgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZUNvcHknLCAnc2F2ZUZpbGVDb3B5JyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cclxuXHJcbiAgICB0YWJzID0gW11cclxuICAgIHNlbGVjdGVkVGFiSW5kZXggPSAwXHJcbiAgICBmb3IgcHJvdmlkZXIsIGkgaW4gQHByb3BzLmNsaWVudC5zdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcbiAgICAgICAgY29tcG9uZW50ID0gVGFiQ29tcG9uZW50XHJcbiAgICAgICAgICBjbGllbnQ6IEBwcm9wcy5jbGllbnRcclxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xyXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XHJcbiAgICAgICAgaWYgcHJvdmlkZXIgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSBpXHJcblxyXG4gICAgKE1vZGFsVGFiYmVkRGlhbG9nIHt0aXRsZTogKHRyIEBwcm9wcy5kaWFsb2cudGl0bGUpLCBjbG9zZTogQHByb3BzLmNsb3NlLCB0YWJzOiB0YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBzZWxlY3RlZFRhYkluZGV4fSlcclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnUmVuYW1lRGlhbG9nVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAcHJvcHMuZmlsZW5hbWUgb3IgJydcclxuICAgIHN0YXRlID1cclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAZmlsZW5hbWUgPSBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5maWxlbmFtZVxyXG4gICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgdXBkYXRlRmlsZW5hbWU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBmaWxlbmFtZS52YWx1ZVxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIHRyaW06IChzKSAtPlxyXG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcblxyXG4gIHJlbmFtZTogKGUpIC0+XHJcbiAgICBpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgQHByb3BzLmNhbGxiYWNrPyBAc3RhdGUuZmlsZW5hbWVcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuICAgIGVsc2VcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5SRU5BTUUnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ3JlbmFtZS1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChidXR0b24ge2NsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAcmVuYW1lfSwgdHIgJ35SRU5BTUVfRElBTE9HLlJFTkFNRScpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflJFTkFNRV9ESUFMT0cuQ0FOQ0VMJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXHJcbiAgcmVuZGVyOiAtPiAoZGl2IHt9LCBcIlRPRE86IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiOiAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnU2hhcmVVcmxEaWFsb2dWaWV3J1xyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIFJlYWN0LmZpbmRET01Ob2RlKEByZWZzLnVybCk/LnNlbGVjdCgpXHJcblxyXG4gIHZpZXc6IC0+XHJcbiAgICB3aW5kb3cub3BlbiBAcHJvcHMudXJsXHJcblxyXG4gICMgYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zdWRvZG9raS9jb3B5LXRvLWNsaXBib2FyZC9ibG9iL21hc3Rlci9pbmRleC5qc1xyXG4gIGNvcHk6IC0+XHJcbiAgICBjb3BpZWQgPSB0cnVlXHJcbiAgICB0cnlcclxuICAgICAgbWFyayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ21hcmsnXHJcbiAgICAgIG1hcmsuaW5uZXJIVE1MID0gQHByb3BzLnVybFxyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkIG1hcmtcclxuXHJcbiAgICAgIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldFNlbGVjdGlvbigpXHJcbiAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxyXG5cclxuICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpXHJcbiAgICAgIHJhbmdlLnNlbGVjdE5vZGUgbWFya1xyXG4gICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UgcmFuZ2VcclxuXHJcbiAgICAgIGNvcGllZCA9IGRvY3VtZW50LmV4ZWNDb21tYW5kICdjb3B5J1xyXG4gICAgY2F0Y2hcclxuICAgICAgdHJ5XHJcbiAgICAgICAgd2luZG93LmNsaXBib2FyZERhdGEuc2V0RGF0YSAndGV4dCcsIEBwcm9wcy51cmxcclxuICAgICAgY2F0Y2hcclxuICAgICAgICBjb3BpZWQgPSBmYWxzZVxyXG4gICAgZmluYWxseVxyXG4gICAgICBpZiBzZWxlY3Rpb25cclxuICAgICAgICBpZiB0eXBlb2Ygc2VsZWN0aW9uLnJlbW92ZVJhbmdlIGlzICdmdW5jdGlvbidcclxuICAgICAgICAgIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSByYW5nZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxyXG4gICAgICBpZiBtYXJrXHJcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCBtYXJrXHJcbiAgICAgIGFsZXJ0IHRyIChpZiBjb3BpZWQgdGhlbiBcIn5TSEFSRV9ESUFMT0cuQ09QWV9TVUNDRVNTXCIgZWxzZSBcIn5TSEFSRV9ESUFMT0cuQ09QWV9FUlJPUlwiKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuU0hBUkVEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ3VybCcsIHZhbHVlOiBAcHJvcHMudXJsLCByZWFkT25seTogdHJ1ZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgaWYgZG9jdW1lbnQuZXhlY0NvbW1hbmQgb3Igd2luZG93LmNsaXBib2FyZERhdGFcclxuICAgICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNvcHl9LCB0ciAnflNIQVJFX0RJQUxPRy5DT1BZJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEB2aWV3fSwgdHIgJ35TSEFSRV9ESUFMT0cuVklFVycpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflNIQVJFX0RJQUxPRy5DTE9TRScpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIHVsLCBsaSwgYX0gPSBSZWFjdC5ET01cclxuXHJcbmNsYXNzIFRhYkluZm9cclxuICBjb25zdHJ1Y3RvcjogKHNldHRpbmdzPXt9KSAtPlxyXG4gICAge0BsYWJlbCwgQGNvbXBvbmVudH0gPSBzZXR0aW5nc1xyXG5cclxuVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xyXG5cclxuICBjbGlja2VkOiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgQHByb3BzLm9uU2VsZWN0ZWQgQHByb3BzLmluZGV4XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGNsYXNzbmFtZSA9IGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICd0YWItc2VsZWN0ZWQnIGVsc2UgJydcclxuICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc25hbWUsIG9uQ2xpY2s6IEBjbGlja2VkfSwgQHByb3BzLmxhYmVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxyXG5cclxuICBzdGF0aWNzOlxyXG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXHJcblxyXG4gIHNlbGVjdGVkVGFiOiAoaW5kZXgpIC0+XHJcbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcclxuXHJcbiAgcmVuZGVyVGFiOiAodGFiLCBpbmRleCkgLT5cclxuICAgIChUYWJcclxuICAgICAgbGFiZWw6IHRhYi5sYWJlbFxyXG4gICAgICBrZXk6IGluZGV4XHJcbiAgICAgIGluZGV4OiBpbmRleFxyXG4gICAgICBzZWxlY3RlZDogKGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4KVxyXG4gICAgICBvblNlbGVjdGVkOiBAc2VsZWN0ZWRUYWJcclxuICAgIClcclxuXHJcbiAgcmVuZGVyVGFiczogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXHJcbiAgICAgICh1bCB7a2V5OiBpbmRleH0sIEByZW5kZXJUYWIodGFiLCBpbmRleCkgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnMpXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclNlbGVjdGVkUGFuZWw6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxyXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xyXG4gICAgICAgIChkaXYge1xyXG4gICAgICAgICAga2V5OiBpbmRleFxyXG4gICAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICAgIGRpc3BsYXk6IGlmIGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4IHRoZW4gJ2Jsb2NrJyBlbHNlICdub25lJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRhYi5jb21wb25lbnRcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcclxuICAgICAgQHJlbmRlclRhYnMoKVxyXG4gICAgICBAcmVuZGVyU2VsZWN0ZWRQYW5lbCgpXHJcbiAgICApXHJcbiJdfQ==
