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
    var openSharedContentId;
    this.appOptions = appOptions;
    if (usingIframe == null) {
      usingIframe = false;
    }
    this.appOptions.usingIframe = usingIframe;
    this.client.setAppOptions(this.appOptions);
    openSharedContentId = getQueryParam("openShared");
    if (openSharedContentId) {
      return this.client.openSharedContent(openSharedContentId);
    }
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
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    this.client.listen(eventCallback);
    return this.client.connect();
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
      currentContent = this._createOrUpdateCurrentContent(stringContent);
      currentContent.addMetadata({
        docName: metadata.name
      });
      return metadata.provider.save(currentContent, metadata, (function(_this) {
        return function(err) {
          if (err) {
            return _this._error(err);
          }
          if (_this.state.metadata !== metadata) {
            _this._closeCurrentFile();
          }
          _this._fileChanged('savedFile', currentContent, metadata, {
            saved: true,
            currentContent: currentContent
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
    var ref, sharedDocumentId;
    sharedDocumentId = (ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0;
    if (sharedDocumentId) {
      return this._showShareDialog(sharedDocumentId);
    } else {
      return this.share((function(_this) {
        return function(sharedDocumentId) {
          return _this._showShareDialog(sharedDocumentId);
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
            saving: true
          });
          currentContent = _this._createOrUpdateCurrentContent(stringContent);
          return _this.state.shareProvider.share(currentContent, _this.state.metadata, function(err, sharedContentId) {
            _this._setState({
              saving: false,
              currentContent: currentContent
            });
            if (err) {
              return _this._error(err);
            }
            return typeof callback === "function" ? callback(sharedContentId) : void 0;
          });
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype._showShareDialog = function(sharedDocumentId) {
    var path, shareQuery;
    path = document.location.origin + document.location.pathname;
    shareQuery = "?openShared=" + sharedDocumentId;
    return this._ui.shareUrlDialog("" + path + shareQuery);
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
          _this._setState({
            metadata: metadata
          });
          if ((ref = _this.state.currentContent) != null) {
            ref.addMetadata({
              docName: metadata.name
            });
          }
          _this._event('renamedFile', {
            metadata: metadata
          });
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

  CloudFileManagerClient.prototype.reopen = function(callback) {
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
      if ((!this.state.dirty) || (confirm(tr('~CONFIRM.REOPEN_FILE')))) {
        return this.reopen(callback);
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
    return this._autoSaveInterval > 0;
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
    if (metadata.overwritable == null) {
      metadata.overwritable = true;
    }
    state = {
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

  CloudFileManagerClient.prototype._createOrUpdateCurrentContent = function(stringContent) {
    var currentContent;
    if (this.state.currentContent != null) {
      currentContent = this.state.currentContent;
      currentContent.setText(stringContent);
    } else {
      currentContent = cloudContentFactory.createEnvelopedCloudContent(stringContent);
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
var CloudContent, CloudContentFactory, CloudFile, CloudMetadata, ProviderInterface, div, isString;

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
            return ((client.state.openedContent != null) && (client.state.metadata != null)) || (client.state.shareProvider != null);
          };
        case 'revertToLastOpenedDialog':
          return function() {
            return (client.state.openedContent != null) && (client.state.metadata != null);
          };
        case 'revertSharedDialog':
          return function() {
            return true;
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
  "~MENU.REOPEN": "Revert to recently opened state",
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
  "~CONFIRM.REOPEN_FILE": "You have unsaved changes.  Are you sure you want reopen the file and return to its last saved state?"
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdWkuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGdldC1xdWVyeS1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEs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O0dBQ0Y7QUFDRCxTQUFPLFFBQVEsQ0FBQztDQUNqQjs7OztBQ1pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEEsSUFBQSw0TUFBQTtFQUFBOztBQUFBLEVBQUEsR0FBSyxPQUFBLENBQVEsbUJBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxtQkFBUjs7QUFFWCxrQkFBQSxHQUFxQixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFFdEMsb0JBQUEsR0FBdUIsT0FBQSxDQUFRLG1DQUFSOztBQUN2QixnQkFBQSxHQUFtQixPQUFBLENBQVEsK0JBQVI7O0FBQ25CLG1CQUFBLEdBQXNCLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDdEIscUJBQUEsR0FBd0IsT0FBQSxDQUFRLHFDQUFSOztBQUV4QixtQkFBQSxHQUFzQixDQUFDLE9BQUEsQ0FBUSxnQ0FBUixDQUFELENBQTBDLENBQUM7O0FBQ2pFLFlBQUEsR0FBZSxDQUFDLE9BQUEsQ0FBUSxnQ0FBUixDQUFELENBQTBDLENBQUM7O0FBRXBEO0VBRVMscUNBQUMsS0FBRCxFQUFRLEtBQVIsRUFBb0IsU0FBcEIsRUFBc0MsTUFBdEM7SUFBQyxJQUFDLENBQUEsT0FBRDtJQUFPLElBQUMsQ0FBQSx1QkFBRCxRQUFRO0lBQUksSUFBQyxDQUFBLCtCQUFELFlBQVk7SUFBTSxJQUFDLENBQUEseUJBQUQsU0FBUztFQUEvQzs7Ozs7O0FBRVQ7RUFFUyxnQ0FBQyxPQUFEO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FDRTtNQUFBLGtCQUFBLEVBQW9CLEVBQXBCOztJQUNGLElBQUMsQ0FBQSxVQUFELEdBQWM7SUFDZCxJQUFDLENBQUEsV0FBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLEdBQUQsR0FBVyxJQUFBLGtCQUFBLENBQW1CLElBQW5CO0VBTEE7O21DQU9iLGFBQUEsR0FBZSxTQUFDLFdBQUQ7QUFFYixRQUFBO0lBRmMsSUFBQyxDQUFBLG1DQUFELGNBQWM7SUFFNUIsWUFBQSxHQUFlO0FBQ2Y7QUFBQSxTQUFBLHFDQUFBOztNQUNFLElBQUcsUUFBUSxDQUFDLFNBQVQsQ0FBQSxDQUFIO1FBQ0UsWUFBYSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWIsR0FBOEIsU0FEaEM7O0FBREY7SUFLQSxJQUFHLENBQUksSUFBQyxDQUFBLFVBQVUsQ0FBQyxTQUFuQjtNQUNFLElBQUMsQ0FBQSxVQUFVLENBQUMsU0FBWixHQUF3QjtBQUN4QixXQUFBLDRCQUFBOztRQUNFLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBckIsQ0FBMEIsWUFBMUI7QUFERixPQUZGOztJQU1BLGtCQUFBLEdBQXFCO0FBQ3JCO0FBQUEsU0FBQSx3Q0FBQTs7TUFDRSxPQUFxQyxRQUFBLENBQVMsUUFBVCxDQUFILEdBQTBCLENBQUMsUUFBRCxFQUFXLEVBQVgsQ0FBMUIsR0FBOEMsQ0FBQyxRQUFRLENBQUMsSUFBVixFQUFnQixRQUFoQixDQUFoRixFQUFDLHNCQUFELEVBQWU7O1FBRWYsZUFBZSxDQUFDLFdBQVksSUFBQyxDQUFBLFVBQVUsQ0FBQzs7TUFDeEMsSUFBRyxDQUFJLFlBQVA7UUFDRSxJQUFDLENBQUEsTUFBRCxDQUFRLDRFQUFSLEVBREY7T0FBQSxNQUFBO1FBR0UsSUFBRyxZQUFhLENBQUEsWUFBQSxDQUFoQjtVQUNFLFFBQUEsR0FBVyxZQUFhLENBQUEsWUFBQTtVQUN4QixrQkFBa0IsQ0FBQyxJQUFuQixDQUE0QixJQUFBLFFBQUEsQ0FBUyxlQUFULENBQTVCLEVBRkY7U0FBQSxNQUFBO1VBSUUsSUFBQyxDQUFBLE1BQUQsQ0FBUSxvQkFBQSxHQUFxQixZQUE3QixFQUpGO1NBSEY7O0FBSkY7SUFZQSxJQUFDLENBQUEsU0FBRCxDQUFXO01BQUEsa0JBQUEsRUFBb0Isa0JBQXBCO0tBQVg7QUFHQTtBQUFBLFNBQUEsd0NBQUE7O01BQ0UsSUFBRyxRQUFRLENBQUMsR0FBVCxDQUFhLE9BQWIsQ0FBSDtRQUNFLElBQUMsQ0FBQSxTQUFELENBQVc7VUFBQSxhQUFBLEVBQWUsUUFBZjtTQUFYO0FBQ0EsY0FGRjs7QUFERjtJQUtBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBdEI7SUFHQSxJQUFHLElBQUMsQ0FBQSxVQUFVLENBQUMsZ0JBQWY7TUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUMsQ0FBQSxVQUFVLENBQUMsZ0JBQXRCLEVBREY7O1dBSUEsbUJBQW1CLENBQUMsbUJBQXBCLENBQ0U7TUFBQSxPQUFBLEVBQVMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxPQUFaLElBQXVCLEVBQWhDO01BQ0EsVUFBQSxFQUFZLElBQUMsQ0FBQSxVQUFVLENBQUMsVUFBWixJQUEwQixFQUR0QztNQUVBLFdBQUEsRUFBYSxJQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosSUFBMkIsRUFGeEM7S0FERjtFQTFDYTs7bUNBK0NmLGtCQUFBLEdBQW9CLFNBQUMsSUFBRCxFQUFPLFVBQVA7QUFDbEIsUUFBQTtBQUFBO0FBQUE7U0FBQSxxQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQWlCLElBQXBCOztVQUNFLFFBQVEsQ0FBQyxVQUFXOztBQUNwQixhQUFBLGlCQUFBO1VBQ0UsUUFBUSxDQUFDLE9BQVEsQ0FBQSxHQUFBLENBQWpCLEdBQXdCLFVBQVcsQ0FBQSxHQUFBO0FBRHJDO0FBRUEsY0FKRjtPQUFBLE1BQUE7NkJBQUE7O0FBREY7O0VBRGtCOzttQ0FRcEIsT0FBQSxHQUFTLFNBQUE7V0FDUCxJQUFDLENBQUEsTUFBRCxDQUFRLFdBQVIsRUFBcUI7TUFBQyxNQUFBLEVBQVEsSUFBVDtLQUFyQjtFQURPOzttQ0FHVCxNQUFBLEdBQVEsU0FBQyxRQUFEO0lBQ04sSUFBRyxRQUFIO2FBQ0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxJQUFaLENBQWlCLFFBQWpCLEVBREY7O0VBRE07O21DQUlSLGNBQUEsR0FBZ0IsU0FBQyxJQUFEO0lBQ2QsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLElBQXBCO1dBQTBCO0VBRFo7O21DQUdoQixlQUFBLEdBQWlCLFNBQUMsSUFBRDtJQUNmLElBQUMsQ0FBQSxHQUFHLENBQUMsZUFBTCxDQUFxQixJQUFyQjtXQUEyQjtFQURaOzttQ0FHakIsZUFBQSxHQUFpQixTQUFDLEdBQUQsRUFBTSxJQUFOO0lBQ2YsSUFBQyxDQUFBLEdBQUcsQ0FBQyxlQUFMLENBQXFCLEdBQXJCLEVBQTBCLElBQTFCO1dBQWdDO0VBRGpCOzttQ0FHakIsb0JBQUEsR0FBc0IsU0FBQyxHQUFELEVBQU0sSUFBTjtJQUNwQixJQUFDLENBQUEsR0FBRyxDQUFDLG9CQUFMLENBQTBCLEdBQTFCLEVBQStCLElBQS9CO1dBQXFDO0VBRGpCOzttQ0FHdEIsbUJBQUEsR0FBcUIsU0FBQyxHQUFELEVBQU0sSUFBTjtJQUNuQixJQUFDLENBQUEsR0FBRyxDQUFDLG1CQUFMLENBQXlCLEdBQXpCLEVBQThCLElBQTlCO1dBQW9DO0VBRGpCOzttQ0FHckIsY0FBQSxHQUFnQixTQUFDLElBQUQ7V0FDZCxJQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsQ0FBb0IsSUFBcEI7RUFEYzs7bUNBR2hCLE9BQUEsR0FBUyxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7SUFDbkIsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFDQSxJQUFDLENBQUEsV0FBRCxDQUFBO1dBQ0EsSUFBQyxDQUFBLE1BQUQsQ0FBUSxXQUFSLEVBQXFCO01BQUMsT0FBQSxFQUFTLEVBQVY7S0FBckI7RUFITzs7bUNBS1QsYUFBQSxHQUFlLFNBQUMsUUFBRDtBQUNiLFFBQUE7O01BRGMsV0FBVzs7SUFDekIsNENBQWlCLENBQUUsNkJBQW5CO2FBQ0UsTUFBTSxDQUFDLElBQVAsQ0FBWSxNQUFNLENBQUMsUUFBbkIsRUFBNkIsUUFBN0IsRUFERjtLQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVY7TUFDSCxJQUFHLElBQUMsQ0FBQSxpQkFBRCxJQUF1QixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWpDO1FBQ0UsSUFBQyxDQUFBLElBQUQsQ0FBQTtlQUNBLElBQUMsQ0FBQSxPQUFELENBQUEsRUFGRjtPQUFBLE1BR0ssSUFBRyxPQUFBLENBQVEsRUFBQSxDQUFHLG1CQUFILENBQVIsQ0FBSDtlQUNILElBQUMsQ0FBQSxPQUFELENBQUEsRUFERztPQUpGO0tBQUEsTUFBQTthQU9ILElBQUMsQ0FBQSxPQUFELENBQUEsRUFQRzs7RUFIUTs7bUNBWWYsUUFBQSxHQUFVLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDUixRQUFBOztNQURtQixXQUFXOztJQUM5Qiw4REFBcUIsQ0FBRSxHQUFwQixDQUF3QixNQUF4QixtQkFBSDthQUNFLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBbEIsQ0FBdUIsUUFBdkIsRUFBaUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQsRUFBTSxPQUFOO1VBQy9CLElBQXVCLEdBQXZCO0FBQUEsbUJBQU8sS0FBQyxDQUFBLE1BQUQsQ0FBUSxHQUFSLEVBQVA7O1VBQ0EsS0FBQyxDQUFBLGlCQUFELENBQUE7VUFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLFlBQWQsRUFBNEIsT0FBNUIsRUFBcUMsUUFBckMsRUFBK0M7WUFBQyxhQUFBLEVBQWUsT0FBTyxDQUFDLEtBQVIsQ0FBQSxDQUFoQjtXQUEvQztrREFDQSxTQUFVLFNBQVM7UUFKWTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBakMsRUFERjtLQUFBLE1BQUE7YUFPRSxJQUFDLENBQUEsY0FBRCxDQUFnQixRQUFoQixFQVBGOztFQURROzttQ0FVVixjQUFBLEdBQWdCLFNBQUMsUUFBRDs7TUFBQyxXQUFXOztJQUMxQixJQUFHLENBQUMsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVosQ0FBQSxJQUFzQixDQUFDLE9BQUEsQ0FBUSxFQUFBLENBQUcsb0JBQUgsQ0FBUixDQUFELENBQXpCO2FBQ0UsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxRQUFEO2lCQUNsQixLQUFDLENBQUEsUUFBRCxDQUFVLFFBQVYsRUFBb0IsUUFBcEI7UUFEa0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCLEVBREY7O0VBRGM7O21DQUtoQixpQkFBQSxHQUFtQixTQUFDLEVBQUQ7QUFDakIsUUFBQTt5REFBb0IsQ0FBRSxpQkFBdEIsQ0FBd0MsRUFBeEMsRUFBNEMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxPQUFOLEVBQWUsUUFBZjtRQUMxQyxJQUF1QixHQUF2QjtBQUFBLGlCQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztlQUNBLEtBQUMsQ0FBQSxZQUFELENBQWMsWUFBZCxFQUE0QixPQUE1QixFQUFxQyxRQUFyQyxFQUErQztVQUFDLFlBQUEsRUFBYyxLQUFmO1VBQXNCLGFBQUEsRUFBZSxPQUFPLENBQUMsS0FBUixDQUFBLENBQXJDO1NBQS9DO01BRjBDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE1QztFQURpQjs7bUNBS25CLElBQUEsR0FBTSxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDaEIsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxhQUFEO2VBQ3hCLEtBQUMsQ0FBQSxXQUFELENBQWEsYUFBYixFQUE0QixRQUE1QjtNQUR3QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7RUFESTs7bUNBSU4sV0FBQSxHQUFhLFNBQUMsYUFBRCxFQUFnQixRQUFoQjs7TUFBZ0IsV0FBVzs7SUFDdEMsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVY7YUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVLGFBQVYsRUFBeUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFoQyxFQUEwQyxRQUExQyxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxjQUFELENBQWdCLGFBQWhCLEVBQStCLFFBQS9CLEVBSEY7O0VBRFc7O21DQU1iLFFBQUEsR0FBVSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsUUFBMUI7QUFDUixRQUFBOztNQURrQyxXQUFXOztJQUM3Qyw4REFBcUIsQ0FBRSxHQUFwQixDQUF3QixNQUF4QixtQkFBSDtNQUNFLElBQUMsQ0FBQSxTQUFELENBQ0U7UUFBQSxNQUFBLEVBQVEsUUFBUjtPQURGO01BR0EsY0FBQSxHQUFpQixJQUFDLENBQUEsNkJBQUQsQ0FBK0IsYUFBL0I7TUFDakIsY0FBYyxDQUFDLFdBQWYsQ0FBMkI7UUFBQSxPQUFBLEVBQVMsUUFBUSxDQUFDLElBQWxCO09BQTNCO2FBRUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFsQixDQUF1QixjQUF2QixFQUF1QyxRQUF2QyxFQUFpRCxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRDtVQUMvQyxJQUF1QixHQUF2QjtBQUFBLG1CQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztVQUNBLElBQUcsS0FBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLEtBQXFCLFFBQXhCO1lBQ0UsS0FBQyxDQUFBLGlCQUFELENBQUEsRUFERjs7VUFFQSxLQUFDLENBQUEsWUFBRCxDQUFjLFdBQWQsRUFBMkIsY0FBM0IsRUFBMkMsUUFBM0MsRUFBcUQ7WUFBQyxLQUFBLEVBQU8sSUFBUjtZQUFjLGNBQUEsRUFBZ0IsY0FBOUI7V0FBckQ7a0RBQ0EsU0FBVSxnQkFBZ0I7UUFMcUI7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWpELEVBUEY7S0FBQSxNQUFBO2FBY0UsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsYUFBaEIsRUFBK0IsUUFBL0IsRUFkRjs7RUFEUTs7bUNBaUJWLGNBQUEsR0FBZ0IsU0FBQyxhQUFELEVBQXVCLFFBQXZCOztNQUFDLGdCQUFnQjs7O01BQU0sV0FBVzs7V0FDaEQsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxRQUFEO2VBQ2xCLEtBQUMsQ0FBQSxXQUFELENBQWEsYUFBYixFQUE0QixRQUE1QixFQUFzQyxRQUF0QztNQURrQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEI7RUFEYzs7bUNBSWhCLGdCQUFBLEdBQWtCLFNBQUMsYUFBRCxFQUF1QixRQUF2Qjs7TUFBQyxnQkFBZ0I7OztNQUFNLFdBQVc7O1dBQ2xELElBQUMsQ0FBQSxHQUFHLENBQUMsZ0JBQUwsQ0FBc0IsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLFFBQUQ7ZUFDcEIsS0FBQyxDQUFBLFdBQUQsQ0FBYSxhQUFiLEVBQTRCLFFBQTVCLEVBQXNDLFFBQXRDO01BRG9CO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QjtFQURnQjs7bUNBSWxCLGNBQUEsR0FBZ0IsU0FBQyxPQUFELEVBQWlCLFFBQWpCO0FBQ2QsUUFBQTs7TUFEZSxVQUFVOzs7TUFBTSxXQUFXOztJQUMxQyxRQUFBLEdBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLE9BQUQsRUFBVSxRQUFWO2VBQ1QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFsQixDQUF1QixPQUF2QixFQUFnQyxRQUFoQyxFQUEwQyxTQUFDLEdBQUQ7VUFDeEMsSUFBdUIsR0FBdkI7QUFBQSxtQkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7a0RBQ0EsU0FBVSxTQUFTO1FBRnFCLENBQTFDO01BRFM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1dBSVgsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxRQUFEO1FBQ2xCLElBQUcsT0FBQSxLQUFXLElBQWQ7aUJBQ0UsS0FBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLFNBQUMsT0FBRDttQkFDeEIsUUFBQSxDQUFTLE9BQVQsRUFBa0IsUUFBbEI7VUFEd0IsQ0FBMUIsRUFERjtTQUFBLE1BQUE7aUJBSUUsUUFBQSxDQUFTLE9BQVQsRUFBa0IsUUFBbEIsRUFKRjs7TUFEa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCO0VBTGM7O21DQVloQixZQUFBLEdBQWMsU0FBQTtBQUNaLFFBQUE7SUFBQSxnQkFBQSxrREFBd0MsQ0FBRSxHQUF2QixDQUEyQixrQkFBM0I7SUFDbkIsSUFBRyxnQkFBSDthQUNFLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixnQkFBbEIsRUFERjtLQUFBLE1BQUE7YUFHRSxJQUFDLENBQUEsS0FBRCxDQUFPLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxnQkFBRDtpQkFDTCxLQUFDLENBQUEsZ0JBQUQsQ0FBa0IsZ0JBQWxCO1FBREs7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVAsRUFIRjs7RUFGWTs7bUNBUWQsV0FBQSxHQUFhLFNBQUE7V0FDWCxJQUFDLENBQUEsS0FBRCxDQUFBO0VBRFc7O21DQUdiLEtBQUEsR0FBTyxTQUFDLFFBQUQ7SUFDTCxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsYUFBVjthQUNFLElBQUMsQ0FBQSxNQUFELENBQVEsWUFBUixFQUFzQixFQUF0QixFQUEwQixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsYUFBRDtBQUN4QixjQUFBO1VBQUEsS0FBQyxDQUFBLFNBQUQsQ0FDRTtZQUFBLE1BQUEsRUFBUSxJQUFSO1dBREY7VUFFQSxjQUFBLEdBQWlCLEtBQUMsQ0FBQSw2QkFBRCxDQUErQixhQUEvQjtpQkFDakIsS0FBQyxDQUFBLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBckIsQ0FBMkIsY0FBM0IsRUFBMkMsS0FBQyxDQUFBLEtBQUssQ0FBQyxRQUFsRCxFQUE0RCxTQUFDLEdBQUQsRUFBTSxlQUFOO1lBQzFELEtBQUMsQ0FBQSxTQUFELENBQ0U7Y0FBQSxNQUFBLEVBQVEsS0FBUjtjQUNBLGNBQUEsRUFBZ0IsY0FEaEI7YUFERjtZQUdBLElBQXVCLEdBQXZCO0FBQUEscUJBQU8sS0FBQyxDQUFBLE1BQUQsQ0FBUSxHQUFSLEVBQVA7O29EQUNBLFNBQVU7VUFMZ0QsQ0FBNUQ7UUFKd0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCLEVBREY7O0VBREs7O21DQWFQLGdCQUFBLEdBQWtCLFNBQUMsZ0JBQUQ7QUFDaEIsUUFBQTtJQUFBLElBQUEsR0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQWxCLEdBQTJCLFFBQVEsQ0FBQyxRQUFRLENBQUM7SUFDcEQsVUFBQSxHQUFhLGNBQUEsR0FBZTtXQUM1QixJQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsQ0FBb0IsRUFBQSxHQUFHLElBQUgsR0FBVSxVQUE5QjtFQUhnQjs7bUNBS2xCLGNBQUEsR0FBZ0IsU0FBQyxRQUFEOztNQUFDLFdBQVc7O1dBQzFCLElBQUMsQ0FBQSxNQUFELENBQVEsWUFBUixFQUFzQixFQUF0QixFQUEwQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsT0FBRDtBQUN4QixZQUFBO2VBQUEsS0FBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLDJDQUFtQyxDQUFFLGFBQXJDLEVBQTJDLEtBQUMsQ0FBQSxVQUFVLENBQUMsUUFBdkQsRUFBaUUsT0FBakUsRUFBMEUsUUFBMUU7TUFEd0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCO0VBRGM7O21DQUloQixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsT0FBWCxFQUFvQixRQUFwQjtJQUNOLElBQUcsT0FBQSxLQUFhLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWhDO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQXpCLENBQWdDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBdkMsRUFBaUQsT0FBakQsRUFBMEQsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQsRUFBTSxRQUFOO0FBQ3hELGNBQUE7VUFBQSxJQUF1QixHQUF2QjtBQUFBLG1CQUFPLEtBQUMsQ0FBQSxNQUFELENBQVEsR0FBUixFQUFQOztVQUNBLEtBQUMsQ0FBQSxTQUFELENBQ0U7WUFBQSxRQUFBLEVBQVUsUUFBVjtXQURGOztlQUVxQixDQUFFLFdBQXZCLENBQW1DO2NBQUEsT0FBQSxFQUFTLFFBQVEsQ0FBQyxJQUFsQjthQUFuQzs7VUFDQSxLQUFDLENBQUEsTUFBRCxDQUFRLGFBQVIsRUFBdUI7WUFBQyxRQUFBLEVBQVUsUUFBWDtXQUF2QjtrREFDQSxTQUFVO1FBTjhDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExRCxFQURGOztFQURNOzttQ0FVUixZQUFBLEdBQWMsU0FBQyxRQUFEOztNQUFDLFdBQVc7O0lBQ3hCLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFWO2FBQ0UsSUFBQyxDQUFBLEdBQUcsQ0FBQyxZQUFMLENBQWtCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWxDLEVBQXdDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxPQUFEO2lCQUN0QyxLQUFDLENBQUEsTUFBRCxDQUFRLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZixFQUF5QixPQUF6QixFQUFrQyxRQUFsQztRQURzQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEMsRUFERjtLQUFBLE1BQUE7OENBSUUsU0FBVSxxQ0FKWjs7RUFEWTs7bUNBT2QsTUFBQSxHQUFRLFNBQUMsUUFBRDs7TUFBQyxXQUFXOztJQUNsQixJQUFHLGtDQUFBLElBQTBCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBcEM7YUFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLFlBQWQsRUFBNEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFuQyxFQUFrRCxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpELEVBQW1FO1FBQUMsYUFBQSxFQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQXJCLENBQUEsQ0FBaEI7T0FBbkUsRUFERjs7RUFETTs7bUNBSVIsd0JBQUEsR0FBMEIsU0FBQyxRQUFEOztNQUFDLFdBQVc7O0lBQ3BDLElBQUcsa0NBQUEsSUFBMEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFwQztNQUNFLElBQUcsQ0FBQyxDQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBWixDQUFBLElBQXNCLENBQUMsT0FBQSxDQUFRLEVBQUEsQ0FBRyxzQkFBSCxDQUFSLENBQUQsQ0FBekI7ZUFDRSxJQUFDLENBQUEsTUFBRCxDQUFRLFFBQVIsRUFERjtPQURGO0tBQUEsTUFBQTs4Q0FJRSxTQUFVLDhFQUpaOztFQUR3Qjs7bUNBTzFCLEtBQUEsR0FBTyxTQUFDLE9BQUQ7O01BQUMsVUFBVTs7V0FDaEIsSUFBQyxDQUFBLFNBQUQsQ0FDRTtNQUFBLEtBQUEsRUFBTyxPQUFQO01BQ0EsS0FBQSxFQUFnQixPQUFULEdBQUEsS0FBQSxHQUFBLE1BRFA7S0FERjtFQURLOzttQ0FLUCxRQUFBLEdBQVUsU0FBQyxRQUFEO0lBQ1IsSUFBRyxJQUFDLENBQUEsaUJBQUo7TUFDRSxhQUFBLENBQWMsSUFBQyxDQUFBLGlCQUFmLEVBREY7O0lBSUEsSUFBRyxRQUFBLEdBQVcsSUFBZDtNQUNFLFFBQUEsR0FBVyxJQUFJLENBQUMsS0FBTCxDQUFXLFFBQUEsR0FBVyxJQUF0QixFQURiOztJQUVBLElBQUcsUUFBQSxHQUFXLENBQWQ7YUFDRSxJQUFDLENBQUEsaUJBQUQsR0FBcUIsV0FBQSxDQUFZLENBQUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO0FBQUcsY0FBQTtVQUFBLElBQVcsS0FBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLGdGQUEwQyxDQUFFLEdBQTNCLENBQStCLE1BQS9CLG9CQUE1QjttQkFBQSxLQUFDLENBQUEsSUFBRCxDQUFBLEVBQUE7O1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUQsQ0FBWixFQUFxRixRQUFBLEdBQVcsSUFBaEcsRUFEdkI7O0VBUFE7O21DQVVWLFlBQUEsR0FBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLGlCQUFELEdBQXFCO0VBRFQ7O21DQUdkLFdBQUEsR0FBYSxTQUFDLGFBQUQsRUFBZ0IsUUFBaEIsRUFBMEIsUUFBMUI7SUFDWCxJQUFHLGFBQUEsS0FBbUIsSUFBdEI7YUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVLGFBQVYsRUFBeUIsUUFBekIsRUFBbUMsUUFBbkMsRUFERjtLQUFBLE1BQUE7YUFHRSxJQUFDLENBQUEsTUFBRCxDQUFRLFlBQVIsRUFBc0IsRUFBdEIsRUFBMEIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLGFBQUQ7aUJBQ3hCLEtBQUMsQ0FBQSxRQUFELENBQVUsYUFBVixFQUF5QixRQUF6QixFQUFtQyxRQUFuQztRQUR3QjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUIsRUFIRjs7RUFEVzs7bUNBT2IsTUFBQSxHQUFRLFNBQUMsT0FBRDtXQUVOLEtBQUEsQ0FBTSxPQUFOO0VBRk07O21DQUlSLFlBQUEsR0FBYyxTQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLFFBQWhCLEVBQTBCLGVBQTFCO0FBQ1osUUFBQTs7TUFEc0Msa0JBQWdCOzs7TUFDdEQsUUFBUSxDQUFDLGVBQWdCOztJQUN6QixLQUFBLEdBQ0U7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLE1BQUEsRUFBUSxJQURSO01BRUEsS0FBQSxFQUFPLEtBRlA7TUFHQSxLQUFBLEVBQU8sS0FIUDs7QUFJRixTQUFBLHNCQUFBOzs7TUFDRSxLQUFNLENBQUEsR0FBQSxDQUFOLEdBQWE7QUFEZjtJQUVBLElBQUMsQ0FBQSxTQUFELENBQVcsS0FBWDtXQUNBLElBQUMsQ0FBQSxNQUFELENBQVEsSUFBUixFQUFjO01BQUMsT0FBQSxFQUFTLE9BQU8sQ0FBQyxPQUFSLENBQUEsQ0FBVjtLQUFkO0VBVlk7O21DQVlkLE1BQUEsR0FBUSxTQUFDLElBQUQsRUFBTyxJQUFQLEVBQWtCLGFBQWxCO0FBQ04sUUFBQTs7TUFEYSxPQUFPOzs7TUFBSSxnQkFBZ0I7O0lBQ3hDLEtBQUEsR0FBWSxJQUFBLDJCQUFBLENBQTRCLElBQTVCLEVBQWtDLElBQWxDLEVBQXdDLGFBQXhDLEVBQXVELElBQUMsQ0FBQSxLQUF4RDtBQUNaO0FBQUE7U0FBQSxxQ0FBQTs7bUJBQ0UsUUFBQSxDQUFTLEtBQVQ7QUFERjs7RUFGTTs7bUNBS1IsU0FBQSxHQUFXLFNBQUMsT0FBRDtBQUNULFFBQUE7QUFBQSxTQUFBLGNBQUE7OztNQUNFLElBQUMsQ0FBQSxLQUFNLENBQUEsR0FBQSxDQUFQLEdBQWM7QUFEaEI7V0FFQSxJQUFDLENBQUEsTUFBRCxDQUFRLGNBQVI7RUFIUzs7bUNBS1gsV0FBQSxHQUFhLFNBQUE7V0FDWCxJQUFDLENBQUEsU0FBRCxDQUNFO01BQUEsYUFBQSxFQUFlLElBQWY7TUFDQSxjQUFBLEVBQWdCLElBRGhCO01BRUEsUUFBQSxFQUFVLElBRlY7TUFHQSxLQUFBLEVBQU8sS0FIUDtNQUlBLE1BQUEsRUFBUSxJQUpSO01BS0EsS0FBQSxFQUFPLEtBTFA7S0FERjtFQURXOzttQ0FTYixpQkFBQSxHQUFtQixTQUFBO0FBQ2pCLFFBQUE7SUFBQSw4RUFBNEIsQ0FBRSxHQUEzQixDQUErQixPQUEvQixtQkFBSDthQUNFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUF6QixDQUErQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXRDLEVBREY7O0VBRGlCOzttQ0FJbkIsNkJBQUEsR0FBK0IsU0FBQyxhQUFEO0FBQzdCLFFBQUE7SUFBQSxJQUFHLGlDQUFIO01BQ0UsY0FBQSxHQUFpQixJQUFDLENBQUEsS0FBSyxDQUFDO01BQ3hCLGNBQWMsQ0FBQyxPQUFmLENBQXVCLGFBQXZCLEVBRkY7S0FBQSxNQUFBO01BSUUsY0FBQSxHQUFpQixtQkFBbUIsQ0FBQywyQkFBcEIsQ0FBZ0QsYUFBaEQsRUFKbkI7O1dBS0E7RUFONkI7Ozs7OztBQVFqQyxNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsMkJBQUEsRUFBNkIsMkJBQTdCO0VBQ0Esc0JBQUEsRUFBd0Isc0JBRHhCOzs7Ozs7QUNwVUYsSUFBQSx5U0FBQTtFQUFBOzs7QUFBQSxNQUFzQixLQUFLLENBQUMsR0FBNUIsRUFBQyxVQUFBLEdBQUQsRUFBTSxhQUFBLE1BQU4sRUFBYyxXQUFBOztBQUVkLGFBQUEsR0FBZ0I7O0FBQ2hCLFlBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUNyQyxhQUFBLEdBQXVCLGFBQUQsR0FBZTs7QUFDckMsT0FBQSxHQUF1QixhQUFELEdBQWU7O0FBQ3JDLGVBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUNyQyxlQUFBLEdBQXVCLGFBQUQsR0FBZTs7QUFDckMsZ0JBQUEsR0FBdUIsYUFBRCxHQUFlOztBQUNyQyxpQkFBQSxHQUF1QixhQUFELEdBQWU7O0FBQ3JDLGlCQUFBLEdBQXVCLGFBQUQsR0FBZTs7QUFFckMsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUNYLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7QUFFUCxpQkFBQSxHQUFvQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3JELG1CQUFBLEdBQXNCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDdkQsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBRWpELGdDQUFBLEdBQW1DLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ3JEO0VBQUEsV0FBQSxFQUFhLGtDQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxpQkFBQSxFQUFtQixLQUFuQjs7RUFEZSxDQUZqQjtFQUtBLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWhCLENBQWtDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNoQyxLQUFDLENBQUEsUUFBRCxDQUFVO1VBQUEsaUJBQUEsRUFBbUIsSUFBbkI7U0FBVjtNQURnQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbEM7RUFEa0IsQ0FMcEI7RUFTQSxZQUFBLEVBQWMsU0FBQTtXQUNaLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQWhCLENBQUE7RUFEWSxDQVRkO0VBWUEsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUksRUFBSixFQUNJLElBQUMsQ0FBQSxLQUFLLENBQUMsaUJBQVYsR0FDRyxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLFlBQVg7S0FBUCxFQUFpQyxzQkFBakMsQ0FESCxHQUdFLDBDQUpIO0VBREssQ0FaUjtDQURxRCxDQUFwQjs7QUFxQjdCOzs7RUFFUywrQkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLDRCQUFELFVBQVc7SUFDdkIsdURBQ0U7TUFBQSxJQUFBLEVBQU0scUJBQXFCLENBQUMsSUFBNUI7TUFDQSxXQUFBLEVBQWEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxXQUFULElBQXdCLENBQUMsRUFBQSxDQUFHLDBCQUFILENBQUQsQ0FEckM7TUFFQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sSUFBTjtRQUNBLElBQUEsRUFBTSxJQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsSUFIUjtRQUlBLE1BQUEsRUFBUSxJQUpSO1FBS0EsS0FBQSxFQUFPLElBTFA7UUFNQSxLQUFBLEVBQU8sS0FOUDtPQUhGO0tBREY7SUFZQSxJQUFDLENBQUEsSUFBRCxHQUFRO0VBYkc7O0VBZWIscUJBQUMsQ0FBQSxJQUFELEdBQU87O2tDQUVQLHNCQUFBLEdBQXdCOztrQ0FFeEIsVUFBQSxHQUFZLFNBQUMsWUFBRDtJQUFDLElBQUMsQ0FBQSxlQUFEO0lBQ1gsSUFBRyxJQUFDLENBQUEsWUFBSjtNQUNFLElBQUcsSUFBQyxDQUFBLElBQUo7ZUFDRSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQsRUFERjtPQUFBLE1BQUE7ZUFHRSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBSEY7T0FERjtLQUFBLE1BQUE7YUFNRSxJQUFDLENBQUEsSUFBRCxLQUFXLEtBTmI7O0VBRFU7O2tDQVNaLFNBQUEsR0FBVyxTQUFBO1dBQ1QsSUFBQyxDQUFBLGdCQUFELENBQUE7RUFEUzs7a0NBR1gsaUJBQUEsR0FBbUIsU0FBQyxzQkFBRDtJQUFDLElBQUMsQ0FBQSx5QkFBRDtJQUNsQixJQUFHLElBQUMsQ0FBQSxlQUFKO2FBQ0UsSUFBQyxDQUFBLHNCQUFELENBQUEsRUFERjs7RUFEaUI7O2tDQUluQixnQkFBQSxHQUFrQixTQUFDLElBQUQ7QUFDaEIsUUFBQTtJQURpQixJQUFDLENBQUEsT0FBRDs7VUFDSixDQUFFLEtBQWYsQ0FBQTs7V0FDQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQWQ7RUFGZ0I7O2tDQUlsQixXQUFBLEdBQWEsU0FBQTtBQUNYLFFBQUE7SUFBQSxRQUFBLEdBQVc7V0FDWCxDQUFDLENBQUMsSUFBRixDQUNFO01BQUEsUUFBQSxFQUFVLE1BQVY7TUFDQSxHQUFBLEVBQUssYUFETDtNQUVBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FIRjtNQUlBLE9BQUEsRUFBUyxTQUFDLElBQUQ7UUFDUCxRQUFRLENBQUMsc0JBQVQsQ0FBQTtlQUNBLFFBQVEsQ0FBQyxnQkFBVCxDQUEwQixJQUExQjtNQUZPLENBSlQ7TUFPQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQVEsQ0FBQyxzQkFBVCxDQUFBO01BREssQ0FQUDtLQURGO0VBRlc7O2tDQWFiLFlBQUEsR0FBYzs7a0NBRWQsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixRQUFBO0lBQUEsSUFBRyxJQUFDLENBQUEsWUFBRCxJQUFrQixDQUFJLElBQUMsQ0FBQSxZQUFZLENBQUMsTUFBdkM7YUFDRSxJQUFDLENBQUEsWUFBWSxDQUFDLEtBQWQsQ0FBQSxFQURGO0tBQUEsTUFBQTtNQUlFLHFCQUFBLEdBQXdCLFNBQUMsQ0FBRCxFQUFJLENBQUo7QUFDdEIsWUFBQTtRQUFBLFVBQUEsR0FBYSxNQUFNLENBQUMsVUFBUCxJQUFxQixNQUFNLENBQUM7UUFDekMsU0FBQSxHQUFhLE1BQU0sQ0FBQyxTQUFQLElBQXFCLE1BQU0sQ0FBQztRQUN6QyxLQUFBLEdBQVMsTUFBTSxDQUFDLFVBQVAsSUFBc0IsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUEvQyxJQUErRCxNQUFNLENBQUM7UUFDL0UsTUFBQSxHQUFTLE1BQU0sQ0FBQyxXQUFQLElBQXNCLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBL0MsSUFBK0QsTUFBTSxDQUFDO1FBRS9FLElBQUEsR0FBTyxDQUFDLENBQUMsS0FBQSxHQUFRLENBQVQsQ0FBQSxHQUFjLENBQUMsQ0FBQSxHQUFJLENBQUwsQ0FBZixDQUFBLEdBQTBCO1FBQ2pDLEdBQUEsR0FBTSxDQUFDLENBQUMsTUFBQSxHQUFTLENBQVYsQ0FBQSxHQUFlLENBQUMsQ0FBQSxHQUFJLENBQUwsQ0FBaEIsQ0FBQSxHQUEyQjtBQUNqQyxlQUFPO1VBQUMsTUFBQSxJQUFEO1VBQU8sS0FBQSxHQUFQOztNQVJlO01BVXhCLEtBQUEsR0FBUTtNQUNSLE1BQUEsR0FBUztNQUNULFFBQUEsR0FBVyxxQkFBQSxDQUFzQixLQUF0QixFQUE2QixNQUE3QjtNQUNYLGNBQUEsR0FBaUIsQ0FDZixRQUFBLEdBQVcsS0FESSxFQUVmLFNBQUEsR0FBWSxNQUZHLEVBR2YsTUFBQSxHQUFTLFFBQVEsQ0FBQyxHQUFsQixJQUF5QixHQUhWLEVBSWYsT0FBQSxHQUFVLFFBQVEsQ0FBQyxJQUFuQixJQUEyQixHQUpaLEVBS2YsZUFMZSxFQU1mLGNBTmUsRUFPZixhQVBlLEVBUWYsWUFSZSxFQVNmLFlBVGU7TUFZakIsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsTUFBTSxDQUFDLElBQVAsQ0FBWSxZQUFaLEVBQTBCLE1BQTFCLEVBQWtDLGNBQWMsQ0FBQyxJQUFmLENBQUEsQ0FBbEM7TUFFaEIsVUFBQSxHQUFhLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtBQUNYLGNBQUE7QUFBQTtZQUNFLElBQUEsR0FBTyxLQUFDLENBQUEsWUFBWSxDQUFDLFFBQVEsQ0FBQztZQUM5QixJQUFJLElBQUEsS0FBUSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQTVCO2NBQ0UsYUFBQSxDQUFjLElBQWQ7Y0FDQSxLQUFDLENBQUEsWUFBWSxDQUFDLEtBQWQsQ0FBQTtxQkFDQSxLQUFDLENBQUEsV0FBRCxDQUFBLEVBSEY7YUFGRjtXQUFBLGFBQUE7WUFNTSxVQU5OOztRQURXO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTthQVViLElBQUEsR0FBTyxXQUFBLENBQVksVUFBWixFQUF3QixHQUF4QixFQXpDVDs7RUFEZ0I7O2tDQTRDbEIseUJBQUEsR0FBMkIsU0FBQTtXQUN4QixnQ0FBQSxDQUFpQztNQUFDLFFBQUEsRUFBVSxJQUFYO01BQWMsWUFBQSxFQUFjLElBQUMsQ0FBQSxZQUE3QjtLQUFqQztFQUR3Qjs7a0NBRzNCLFVBQUEsR0FBWSxTQUFBO0lBQ1YsSUFBRyxJQUFDLENBQUEsSUFBSjthQUNHLElBQUEsQ0FBSyxFQUFMLEVBQVUsSUFBQSxDQUFLO1FBQUMsU0FBQSxFQUFXLHFCQUFaO09BQUwsQ0FBVixFQUFvRCxJQUFDLENBQUEsSUFBSSxDQUFDLElBQTFELEVBREg7S0FBQSxNQUFBO2FBR0UsS0FIRjs7RUFEVTs7a0NBTVosSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDSixDQUFDLENBQUMsSUFBRixDQUNFO01BQUEsUUFBQSxFQUFVLE1BQVY7TUFDQSxHQUFBLEVBQUssT0FETDtNQUVBLE9BQUEsRUFBUyxJQUZUO01BR0EsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQUpGO01BS0EsT0FBQSxFQUFTLFNBQUMsSUFBRDtBQUNQLFlBQUE7UUFBQSxJQUFBLEdBQU87QUFDUCxhQUFBLFdBQUE7OztVQUNFLElBQUksQ0FBQyxJQUFMLENBQWMsSUFBQSxhQUFBLENBQ1o7WUFBQSxJQUFBLEVBQU0sSUFBSSxDQUFDLElBQVg7WUFDQSxZQUFBLEVBQWM7Y0FBQyxFQUFBLEVBQUksSUFBSSxDQUFDLEVBQVY7YUFEZDtZQUVBLElBQUEsRUFBTSxhQUFhLENBQUMsSUFGcEI7WUFHQSxRQUFBLEVBQVUsSUFIVjtXQURZLENBQWQ7QUFERjtlQU1BLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQVJPLENBTFQ7TUFjQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxJQUFULEVBQWUsRUFBZjtNQURLLENBZFA7S0FERjtFQURJOztrQ0FtQk4saUJBQUEsR0FBbUIsU0FBQyxFQUFELEVBQUssUUFBTDtBQUNqQixRQUFBO0lBQUEsY0FBQSxHQUFxQixJQUFBLGFBQUEsQ0FDbkI7TUFBQSxlQUFBLEVBQWlCLEVBQWpCO01BQ0EsSUFBQSxFQUFNLGFBQWEsQ0FBQyxJQURwQjtNQUVBLFlBQUEsRUFBYyxLQUZkO0tBRG1CO1dBSXJCLElBQUMsQ0FBQSxJQUFELENBQU0sY0FBTixFQUFzQixTQUFDLEdBQUQsRUFBTSxPQUFOO2FBQ3BCLFFBQUEsQ0FBUyxHQUFULEVBQWMsT0FBZCxFQUF1QixjQUF2QjtJQURvQixDQUF0QjtFQUxpQjs7a0NBUW5CLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ0osUUFBQTtJQUFBLGVBQUEsR0FBa0IsQ0FBTyxRQUFRLENBQUMsZUFBaEIsR0FBcUMsSUFBckMsR0FBK0M7V0FDakUsQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLEdBQUEsRUFBSyxlQUFMO01BQ0EsSUFBQSxFQUNFO1FBQUEsUUFBQSxnREFBK0IsQ0FBRSxZQUF2QixJQUE2QixRQUFRLENBQUMsZUFBaEQ7T0FGRjtNQUdBLE9BQUEsRUFBUyxJQUhUO01BSUEsU0FBQSxFQUNFO1FBQUMsaUJBQUEsZUFBRDtPQUxGO01BTUEsT0FBQSxFQUFTLFNBQUMsSUFBRDtBQUNQLFlBQUE7UUFBQSxPQUFBLEdBQVUsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELElBQWhEO1FBQ1YsSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLEtBQVo7VUFBdUIsSUFBQyxDQUFBLHNCQUFELEdBQTBCLE9BQU8sQ0FBQyxLQUFSLENBQUEsRUFBakQ7OztVQUNBLFFBQVEsQ0FBQyxPQUFRLElBQUksQ0FBQzs7ZUFDdEIsUUFBQSxDQUFTLElBQVQsRUFBZSxPQUFmO01BSk8sQ0FOVDtNQVdBLEtBQUEsRUFBTyxTQUFBO0FBQ0wsWUFBQTtRQUFBLE9BQUEsR0FBYSxRQUFRLENBQUMsZUFBWixHQUNSLDJCQUFBLEdBQTRCLFFBQVEsQ0FBQyxlQUFyQyxHQUFxRCxxQ0FEN0MsR0FHUixpQkFBQSxHQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFULGtEQUFzQyxDQUFFLFlBQXhDLElBQThDLE1BQS9DO2VBQ25CLFFBQUEsQ0FBUyxPQUFUO01BTEssQ0FYUDtLQURGO0VBRkk7O2tDQXFCTixLQUFBLEdBQU8sU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtBQUNMLFFBQUE7SUFBQSxNQUFBLEdBQVMsT0FBTyxDQUFDLEdBQVIsQ0FBWSxjQUFaLENBQUEsSUFBK0IsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFhLENBQUMsUUFBZCxDQUF1QixFQUF2QixDQUEwQixDQUFDLFNBQTNCLENBQXFDLENBQXJDO0lBRXhDLE1BQUEsR0FDRTtNQUFBLE1BQUEsRUFBUSxNQUFSOztJQUVGLElBQUcsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWixDQUFIO01BQ0UsTUFBTSxDQUFDLFFBQVAsR0FBa0IsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWixFQURwQjs7SUFHQSxPQUFPLENBQUMsV0FBUixDQUNFO01BQUEsWUFBQSxFQUFjLENBQWQ7TUFDQSxZQUFBLEVBQWMsSUFEZDtNQUVBLGdCQUFBLEVBQWtCLElBRmxCO0tBREY7SUFLQSxHQUFBLEdBQU0sSUFBQyxDQUFBLFVBQUQsQ0FBWSxlQUFaLEVBQTZCLE1BQTdCO1dBRU4sQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLFFBQUEsRUFBVSxNQUFWO01BQ0EsTUFBQSxFQUFRLE1BRFI7TUFFQSxHQUFBLEVBQUssR0FGTDtNQUdBLElBQUEsRUFBTSxPQUFPLENBQUMsZ0JBQVIsQ0FBQSxDQUhOO01BSUEsT0FBQSxFQUFTLElBSlQ7TUFLQSxTQUFBLEVBQ0U7UUFBQSxlQUFBLEVBQWlCLEtBQWpCO09BTkY7TUFPQSxPQUFBLEVBQVMsU0FBQyxJQUFEO1FBQ1AsT0FBTyxDQUFDLFdBQVIsQ0FDRTtVQUFBLGdCQUFBLEVBQWtCLElBQUksQ0FBQyxFQUF2QjtVQUNBLFlBQUEsRUFBYyxNQURkO1VBRUEsWUFBQSxFQUFjLENBRmQ7U0FERjs7VUFJQSxRQUFRLENBQUUsSUFBVixHQUFpQixJQUFJLENBQUM7O2VBQ3RCLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBSSxDQUFDLEVBQXBCO01BTk8sQ0FQVDtNQWNBLEtBQUEsRUFBTyxTQUFBO2VBQ0wsUUFBQSxDQUFTLGlCQUFBLEdBQWtCLFFBQVEsQ0FBQyxJQUFwQztNQURLLENBZFA7S0FERjtFQWhCSzs7a0NBa0NQLElBQUEsR0FBTSxTQUFDLFlBQUQsRUFBZSxRQUFmLEVBQXlCLFFBQXpCO0FBQ0osUUFBQTtJQUFBLE9BQUEsR0FBVSxZQUFZLENBQUMsVUFBYixDQUFBO0lBRVYsTUFBQSxHQUFTO0lBQ1QsSUFBRyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQXpCO01BQWlDLE1BQU0sQ0FBQyxRQUFQLEdBQWtCLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBekU7O0lBR0EsWUFBQSxHQUFlLFFBQVEsQ0FBQyxZQUFULElBQTBCO0lBQ3pDLElBQUcsWUFBQSxJQUFpQixDQUFBLElBQUEsR0FBTyxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxzQkFBc0IsQ0FBQyxVQUF4QixDQUFBLENBQWIsRUFBbUQsT0FBbkQsQ0FBUCxDQUFwQjtNQUNFLFdBQUEsR0FBYztNQUNkLEdBQUEsR0FBTSxpQkFGUjtLQUFBLE1BQUE7TUFJRSxJQUFHLFFBQVEsQ0FBQyxJQUFaO1FBQXNCLE1BQU0sQ0FBQyxVQUFQLEdBQW9CLFFBQVEsQ0FBQyxLQUFuRDs7TUFDQSxHQUFBLEdBQU07TUFDTixXQUFBLEdBQWMsUUFOaEI7O0lBUUEsR0FBQSxHQUFNLElBQUMsQ0FBQSxVQUFELENBQVksR0FBWixFQUFpQixNQUFqQjtXQUVOLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxRQUFBLEVBQVUsTUFBVjtNQUNBLE1BQUEsRUFBUSxNQURSO01BRUEsR0FBQSxFQUFLLEdBRkw7TUFHQSxJQUFBLEVBQU0sSUFBSSxDQUFDLFNBQUwsQ0FBZSxXQUFmLENBSE47TUFJQSxPQUFBLEVBQVMsSUFKVDtNQUtBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FORjtNQU9BLE9BQUEsRUFBUyxTQUFDLElBQUQ7UUFDUCxJQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsS0FBWjtVQUF1QixJQUFDLENBQUEsc0JBQUQsR0FBMEIsWUFBWSxDQUFDLEtBQWIsQ0FBQSxFQUFqRDs7UUFDQSxJQUFHLElBQUksQ0FBQyxFQUFSO1VBQWdCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBdEIsR0FBMkIsSUFBSSxDQUFDLEdBQWhEOztlQUVBLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQUpPLENBUFQ7TUFZQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxpQkFBQSxHQUFrQixRQUFRLENBQUMsSUFBcEM7TUFESyxDQVpQO0tBREY7RUFsQkk7O2tDQWtDTixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNOLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxHQUFBLEVBQUssaUJBQUw7TUFDQSxJQUFBLEVBQ0U7UUFBQSxVQUFBLEVBQVksUUFBUSxDQUFDLElBQXJCO09BRkY7TUFHQSxPQUFBLEVBQVMsSUFIVDtNQUlBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FMRjtNQU1BLE9BQUEsRUFBUyxTQUFDLElBQUQ7ZUFDUCxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7TUFETyxDQU5UO01BUUEsS0FBQSxFQUFPLFNBQUE7ZUFDTCxRQUFBLENBQVMsaUJBQUEsR0FBa0IsUUFBUSxDQUFDLElBQXBDO01BREssQ0FSUDtLQURGO0VBRE07O2tDQWFSLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFFBQXBCO1dBQ04sQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLEdBQUEsRUFBSyxpQkFBTDtNQUNBLElBQUEsRUFDRTtRQUFBLFFBQUEsRUFBVSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQWhDO1FBQ0EsYUFBQSxFQUFlLE9BRGY7T0FGRjtNQUlBLE9BQUEsRUFBUyxJQUpUO01BS0EsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQU5GO01BT0EsT0FBQSxFQUFTLFNBQUMsSUFBRDtRQUNQLFFBQVEsQ0FBQyxJQUFULEdBQWdCO2VBQ2hCLFFBQUEsQ0FBUyxJQUFULEVBQWUsUUFBZjtNQUZPLENBUFQ7TUFVQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxtQkFBQSxHQUFvQixRQUFRLENBQUMsSUFBdEM7TUFESyxDQVZQO0tBREY7RUFETTs7a0NBZVIsVUFBQSxHQUFZLFNBQUMsR0FBRCxFQUFNLE1BQU47QUFDVixRQUFBO0lBQUEsSUFBQSxDQUFrQixNQUFsQjtBQUFBLGFBQU8sSUFBUDs7SUFDQSxHQUFBLEdBQU07QUFDTixTQUFBLGFBQUE7O01BQ0UsR0FBRyxDQUFDLElBQUosQ0FBUyxDQUFDLEdBQUQsRUFBTSxLQUFOLENBQVksQ0FBQyxHQUFiLENBQWlCLFNBQWpCLENBQTJCLENBQUMsSUFBNUIsQ0FBaUMsR0FBakMsQ0FBVDtBQURGO0FBRUEsV0FBTyxHQUFBLEdBQU0sR0FBTixHQUFZLEdBQUcsQ0FBQyxJQUFKLENBQVMsR0FBVDtFQUxUOztrQ0FPWixXQUFBLEdBQWEsU0FBQyxJQUFELEVBQU8sSUFBUDtBQUNYLFFBQUE7QUFBQTtNQUNFLElBQUEsR0FDb0MsT0FBTyxJQUFDLENBQUEsT0FBTyxDQUFDLGVBQWhCLEtBQW1DLFVBQXJFLEdBQUE7UUFBQSxJQUFBLEVBQU0sSUFBQyxDQUFBLE9BQU8sQ0FBQyxlQUFmO09BQUEsR0FBQTtNQUNGLElBQUEsR0FBTyxJQUFJLENBQUMsSUFBTCxDQUFVLElBQVYsRUFBZ0IsSUFBaEIsRUFBc0IsSUFBdEI7QUFDUCxhQUFPLEtBSlQ7S0FBQSxhQUFBO0FBTUUsYUFBTyxLQU5UOztFQURXOzs7O0dBcFFxQjs7QUE2UXBDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3RUakIsSUFBQSxxTEFBQTtFQUFBOzs7QUFBQSxNQUFzQixLQUFLLENBQUMsR0FBNUIsRUFBQyxVQUFBLEdBQUQsRUFBTSxhQUFBLE1BQU4sRUFBYyxXQUFBOztBQUVkLEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxvQkFBUjs7QUFDWCxNQUFBLEdBQVMsT0FBQSxDQUFRLE1BQVI7O0FBRVQsaUJBQUEsR0FBb0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUNyRCxtQkFBQSxHQUFzQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3ZELGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUUzQzs7O0VBQ1Msc0JBQUE7SUFBRyxJQUFDLENBQUEsSUFBRCxHQUFRO0VBQVg7Ozs7R0FEWTs7QUFHckI7OztFQUNTLHVCQUFBO0lBQUcsSUFBQyxDQUFBLElBQUQsR0FBUTtFQUFYOzs7O0dBRGE7O0FBRzVCLDhCQUFBLEdBQWlDLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ25EO0VBQUEsV0FBQSxFQUFhLGdDQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxVQUFBLEVBQVksS0FBWjs7RUFEZSxDQUZqQjtFQUtBLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBaEIsQ0FBNEIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQzFCLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxVQUFBLEVBQVksSUFBWjtTQUFWO01BRDBCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE1QjtFQURrQixDQUxwQjtFQVNBLFlBQUEsRUFBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBaEIsQ0FBMEIsbUJBQW1CLENBQUMsVUFBOUM7RUFEWSxDQVRkO0VBWUEsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUksRUFBSixFQUNJLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVixHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsWUFBWDtLQUFQLEVBQWlDLHNCQUFqQyxDQURILEdBR0UsOENBSkg7RUFESyxDQVpSO0NBRG1ELENBQXBCOztBQXFCM0I7OztFQUVTLDZCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUN2QixxREFDRTtNQUFBLElBQUEsRUFBTSxtQkFBbUIsQ0FBQyxJQUExQjtNQUNBLFdBQUEsRUFBYSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsSUFBd0IsQ0FBQyxFQUFBLENBQUcsd0JBQUgsQ0FBRCxDQURyQztNQUVBLFlBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxJQUFOO1FBQ0EsSUFBQSxFQUFNLElBRE47UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLE1BQUEsRUFBUSxJQUhSO1FBSUEsTUFBQSxFQUFRLElBSlI7UUFLQSxLQUFBLEVBQU8sSUFMUDtPQUhGO0tBREY7SUFXQSxJQUFDLENBQUEsU0FBRCxHQUFhO0lBQ2IsSUFBQyxDQUFBLElBQUQsR0FBUTtJQUNSLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBLE9BQU8sQ0FBQztJQUNyQixJQUFHLENBQUksSUFBQyxDQUFBLFFBQVI7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLDJEQUFOLEVBRFo7O0lBRUEsSUFBQyxDQUFBLFFBQUQsR0FBWSxJQUFDLENBQUEsT0FBTyxDQUFDLFFBQVQsSUFBcUI7SUFDakMsSUFBQyxDQUFBLGNBQUQsR0FBa0IsSUFBQyxDQUFBLE9BQU8sQ0FBQyxjQUFULElBQTJCO0lBQzdDLElBQUcsSUFBQyxDQUFBLGNBQUo7TUFDRSxJQUFDLENBQUEsUUFBRCxJQUFhLGdCQURmOztJQUVBLElBQUMsQ0FBQSxTQUFELENBQUE7RUFyQlc7O0VBdUJiLG1CQUFDLENBQUEsSUFBRCxHQUFPOztFQUdQLG1CQUFDLENBQUEsU0FBRCxHQUFhOztFQUNiLG1CQUFDLENBQUEsVUFBRCxHQUFjOztnQ0FFZCxVQUFBLEdBQVksU0FBQyxZQUFEO0lBQUMsSUFBQyxDQUFBLGVBQUQ7SUFDWCxJQUFHLElBQUMsQ0FBQSxZQUFKO01BQ0UsSUFBRyxJQUFDLENBQUEsU0FBSjtlQUNFLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQURGO09BQUEsTUFBQTtlQUdFLElBQUMsQ0FBQSxTQUFELENBQVcsbUJBQW1CLENBQUMsU0FBL0IsRUFIRjtPQURGO0tBQUEsTUFBQTthQU1FLElBQUMsQ0FBQSxTQUFELEtBQWdCLEtBTmxCOztFQURVOztnQ0FTWixTQUFBLEdBQVcsU0FBQyxTQUFEO1dBQ1QsSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFDWCxZQUFBO1FBQUEsSUFBQSxHQUNFO1VBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxRQUFaO1VBQ0EsS0FBQSxFQUFPLENBQUMsdUNBQUQsRUFBMEMsa0RBQTFDLENBRFA7VUFFQSxTQUFBLEVBQVcsU0FGWDs7ZUFHRixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVYsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQyxTQUFEO1VBQ3hCLEtBQUMsQ0FBQSxTQUFELEdBQWdCLFNBQUEsSUFBYyxDQUFJLFNBQVMsQ0FBQyxLQUEvQixHQUEwQyxTQUExQyxHQUF5RDtVQUN0RSxLQUFDLENBQUEsSUFBRCxHQUFRO1VBQ1IsS0FBQyxDQUFBLGNBQUQsQ0FBZ0IsS0FBQyxDQUFBLFNBQWpCO1VBQ0EsSUFBRyxLQUFDLENBQUEsU0FBSjtZQUNFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUE1QixDQUFBLENBQWlDLENBQUMsT0FBbEMsQ0FBMEMsU0FBQyxJQUFEO3FCQUN4QyxLQUFDLENBQUEsSUFBRCxHQUFRO1lBRGdDLENBQTFDLEVBREY7O2lCQUdBLEtBQUMsQ0FBQSxZQUFELENBQWMsS0FBQyxDQUFBLFNBQUQsS0FBZ0IsSUFBOUI7UUFQd0IsQ0FBMUI7TUFMVztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYjtFQURTOztnQ0FlWCxjQUFBLEdBQWdCLFNBQUMsU0FBRDtJQUNkLElBQUcsSUFBQyxDQUFBLGlCQUFKO01BQ0UsWUFBQSxDQUFhLElBQUMsQ0FBQSxpQkFBZCxFQURGOztJQUVBLElBQUcsU0FBQSxJQUFjLENBQUksU0FBUyxDQUFDLEtBQS9CO2FBQ0UsSUFBQyxDQUFBLGlCQUFELEdBQXFCLFVBQUEsQ0FBVyxDQUFDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsU0FBRCxDQUFXLG1CQUFtQixDQUFDLFNBQS9CO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUQsQ0FBWCxFQUEwRCxDQUFDLFFBQUEsQ0FBUyxTQUFTLENBQUMsVUFBbkIsRUFBK0IsRUFBL0IsQ0FBQSxHQUFxQyxJQUF0QyxDQUFBLEdBQThDLElBQXhHLEVBRHZCOztFQUhjOztnQ0FNaEIseUJBQUEsR0FBMkIsU0FBQTtXQUN4Qiw4QkFBQSxDQUErQjtNQUFDLFFBQUEsRUFBVSxJQUFYO0tBQS9CO0VBRHdCOztnQ0FHM0IsVUFBQSxHQUFZLFNBQUE7SUFDVixJQUFHLElBQUMsQ0FBQSxJQUFKO2FBQ0csSUFBQSxDQUFLLEVBQUwsRUFBVSxJQUFBLENBQUs7UUFBQyxTQUFBLEVBQVcsYUFBWjtPQUFMLENBQVYsRUFBNEMsSUFBQyxDQUFBLElBQUksQ0FBQyxJQUFsRCxFQURIO0tBQUEsTUFBQTthQUdFLEtBSEY7O0VBRFU7O2dDQU1aLElBQUEsR0FBTyxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO1dBQ0wsSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7UUFDWCxJQUFHLEtBQUMsQ0FBQSxjQUFKO2lCQUNFLEtBQUMsQ0FBQSxpQkFBRCxDQUFtQixPQUFuQixFQUE0QixRQUE1QixFQUFzQyxRQUF0QyxFQURGO1NBQUEsTUFBQTtpQkFHRSxLQUFDLENBQUEsU0FBRCxDQUFXLE9BQVgsRUFBb0IsUUFBcEIsRUFBOEIsUUFBOUIsRUFIRjs7TUFEVztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYjtFQURLOztnQ0FPUCxJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxXQUFELENBQWEsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO1FBQ1gsSUFBRyxLQUFDLENBQUEsY0FBSjtpQkFDRSxLQUFDLENBQUEseUJBQUQsQ0FBMkIsUUFBM0IsRUFBcUMsUUFBckMsRUFERjtTQUFBLE1BQUE7aUJBR0UsS0FBQyxDQUFBLFNBQUQsQ0FBVyxRQUFYLEVBQXFCLFFBQXJCLEVBSEY7O01BRFc7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWI7RUFESTs7Z0NBT04sSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDSixJQUFDLENBQUEsV0FBRCxDQUFhLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtBQUNYLFlBQUE7UUFBQSxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQXhCLENBQ1I7VUFBQSxDQUFBLEVBQUcsS0FBQSxHQUFRLGdCQUFBLEdBQWlCLEtBQUMsQ0FBQSxRQUFsQixHQUEyQixnRUFBM0IsR0FBMEYsQ0FBSSxRQUFILEdBQWlCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBdkMsR0FBK0MsTUFBaEQsQ0FBMUYsR0FBaUosY0FBNUo7U0FEUTtlQUVWLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsTUFBRDtBQUNkLGNBQUE7VUFBQSxJQUEyQyxDQUFJLE1BQS9DO0FBQUEsbUJBQU8sUUFBQSxDQUFTLHNCQUFULEVBQVA7O1VBQ0EsSUFBQSxHQUFPO0FBQ1A7QUFBQSxlQUFBLHNDQUFBOztZQUNFLElBQUksQ0FBQyxJQUFMLENBQWMsSUFBQSxhQUFBLENBQ1o7Y0FBQSxJQUFBLEVBQU0sSUFBSSxDQUFDLEtBQVg7Y0FDQSxJQUFBLEVBQVMsSUFBSSxDQUFDLFFBQUwsS0FBaUIsb0NBQXBCLEdBQThELGFBQWEsQ0FBQyxNQUE1RSxHQUF3RixhQUFhLENBQUMsSUFENUc7Y0FFQSxNQUFBLEVBQVEsUUFGUjtjQUdBLFlBQUEsRUFBYyxJQUFJLENBQUMsUUFIbkI7Y0FJQSxRQUFBLEVBQVUsS0FKVjtjQUtBLFlBQUEsRUFDRTtnQkFBQSxFQUFBLEVBQUksSUFBSSxDQUFDLEVBQVQ7ZUFORjthQURZLENBQWQ7QUFERjtVQVNBLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBQyxDQUFELEVBQUksQ0FBSjtBQUNSLGdCQUFBO1lBQUEsTUFBQSxHQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBUCxDQUFBO1lBQ1QsTUFBQSxHQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBUCxDQUFBO1lBQ1QsSUFBYSxNQUFBLEdBQVMsTUFBdEI7QUFBQSxxQkFBTyxDQUFDLEVBQVI7O1lBQ0EsSUFBWSxNQUFBLEdBQVMsTUFBckI7QUFBQSxxQkFBTyxFQUFQOztBQUNBLG1CQUFPO1VBTEMsQ0FBVjtpQkFNQSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7UUFsQmMsQ0FBaEI7TUFIVztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYjtFQURJOztnQ0F3Qk4sTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDTixJQUFDLENBQUEsV0FBRCxDQUFhLFNBQUE7QUFDWCxVQUFBO01BQUEsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFELENBQXZCLENBQ1I7UUFBQSxNQUFBLEVBQVEsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUE5QjtPQURRO2FBRVYsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxNQUFEO2dEQUNkLDJCQUFVLE1BQU0sQ0FBRSxlQUFSLElBQWlCO01BRGIsQ0FBaEI7SUFIVyxDQUFiO0VBRE07O2dDQU9SLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxPQUFYLEVBQW9CLFFBQXBCO1dBQ04sSUFBQyxDQUFBLFdBQUQsQ0FBYSxTQUFBO0FBQ1gsVUFBQTtNQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBeEIsQ0FDUjtRQUFBLE1BQUEsRUFBUSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQTlCO1FBQ0EsUUFBQSxFQUNFO1VBQUEsS0FBQSxFQUFPLE9BQVA7U0FGRjtPQURRO2FBSVYsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxNQUFEO1FBQ2QscUJBQUcsTUFBTSxDQUFFLGNBQVg7a0RBQ0UsU0FBVSxNQUFNLENBQUMsZ0JBRG5CO1NBQUEsTUFBQTtVQUdFLFFBQVEsQ0FBQyxJQUFULEdBQWdCO2lCQUNoQixRQUFBLENBQVMsSUFBVCxFQUFlLFFBQWYsRUFKRjs7TUFEYyxDQUFoQjtJQUxXLENBQWI7RUFETTs7Z0NBYVIsS0FBQSxHQUFPLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDTCxRQUFBO0lBQUEsSUFBRyw4R0FBSDthQUNFLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFuQyxDQUFBLEVBREY7O0VBREs7O2dDQUlQLFNBQUEsR0FBVyxTQUFBO0FBQ1QsUUFBQTtJQUFBLElBQUcsQ0FBSSxNQUFNLENBQUMsWUFBZDtNQUNFLE1BQU0sQ0FBQyxZQUFQLEdBQXNCO01BQ3RCLE1BQU0sQ0FBQyxXQUFQLEdBQXFCLFNBQUE7ZUFDbkIsSUFBQyxDQUFBLE1BQU0sQ0FBQyxXQUFSLEdBQXNCO01BREg7TUFFckIsTUFBQSxHQUFTLFFBQVEsQ0FBQyxhQUFULENBQXVCLFFBQXZCO01BQ1QsTUFBTSxDQUFDLEdBQVAsR0FBYTthQUNiLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBZCxDQUEwQixNQUExQixFQU5GOztFQURTOztnQ0FTWCxXQUFBLEdBQWEsU0FBQyxRQUFEO0FBQ1gsUUFBQTtJQUFBLElBQUcsTUFBTSxDQUFDLGtCQUFWO2FBQ0UsUUFBQSxDQUFBLEVBREY7S0FBQSxNQUFBO01BR0UsSUFBQSxHQUFPO01BQ1AsS0FBQSxHQUFRLFNBQUE7UUFDTixJQUFHLE1BQU0sQ0FBQyxXQUFWO2lCQUNFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBWixDQUFpQixPQUFqQixFQUEwQixJQUExQixFQUFnQyxTQUFBO21CQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQVosQ0FBaUIsUUFBakIsRUFBMkIsSUFBM0IsRUFBaUMsU0FBQTtxQkFDL0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxnQkFBVixFQUE0QixTQUFBO2dCQUMxQixNQUFNLENBQUMsa0JBQVAsR0FBNEI7dUJBQzVCLFFBQVEsQ0FBQyxJQUFULENBQWMsSUFBZDtjQUYwQixDQUE1QjtZQUQrQixDQUFqQztVQUQ4QixDQUFoQyxFQURGO1NBQUEsTUFBQTtpQkFPRSxVQUFBLENBQVcsS0FBWCxFQUFrQixFQUFsQixFQVBGOztNQURNO2FBU1IsVUFBQSxDQUFXLEtBQVgsRUFBa0IsRUFBbEIsRUFiRjs7RUFEVzs7Z0NBZ0JiLFNBQUEsR0FBVyxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ1QsUUFBQTtJQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBeEIsQ0FDUjtNQUFBLE1BQUEsRUFBUSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQTlCO0tBRFE7V0FFVixPQUFPLENBQUMsT0FBUixDQUFnQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsSUFBRDtBQUNkLFlBQUE7UUFBQSxtQkFBRyxJQUFJLENBQUUsb0JBQVQ7VUFDRSxHQUFBLEdBQVUsSUFBQSxjQUFBLENBQUE7VUFDVixHQUFHLENBQUMsSUFBSixDQUFTLEtBQVQsRUFBZ0IsSUFBSSxDQUFDLFdBQXJCO1VBQ0EsSUFBRyxLQUFDLENBQUEsU0FBSjtZQUNFLEdBQUcsQ0FBQyxnQkFBSixDQUFxQixlQUFyQixFQUFzQyxTQUFBLEdBQVUsS0FBQyxDQUFBLFNBQVMsQ0FBQyxZQUEzRCxFQURGOztVQUVBLEdBQUcsQ0FBQyxNQUFKLEdBQWEsU0FBQTttQkFDWCxRQUFBLENBQVMsSUFBVCxFQUFlLG1CQUFtQixDQUFDLDJCQUFwQixDQUFnRCxHQUFHLENBQUMsWUFBcEQsQ0FBZjtVQURXO1VBRWIsR0FBRyxDQUFDLE9BQUosR0FBYyxTQUFBO21CQUNaLFFBQUEsQ0FBUyxxQkFBQSxHQUFzQixHQUEvQjtVQURZO2lCQUVkLEdBQUcsQ0FBQyxJQUFKLENBQUEsRUFURjtTQUFBLE1BQUE7aUJBV0UsUUFBQSxDQUFTLDRCQUFULEVBWEY7O01BRGM7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWhCO0VBSFM7O2dDQWlCWCxTQUFBLEdBQVcsU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtBQUNULFFBQUE7SUFBQSxRQUFBLEdBQVc7SUFDWCxNQUFBLEdBQVMsSUFBSSxDQUFDLFNBQUwsQ0FDUDtNQUFBLEtBQUEsRUFBTyxRQUFRLENBQUMsSUFBaEI7TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFFBRFg7TUFFQSxPQUFBLEVBQVM7UUFBQztVQUFDLEVBQUEsRUFBTywyR0FBSCxHQUEyQyxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUF4RSxHQUFnRixNQUFyRjtTQUFEO09BRlQ7S0FETztJQUtULHFEQUF5QyxDQUFFLFlBQTFCLEdBQ2YsQ0FBQyxLQUFELEVBQVEseUJBQUEsR0FBMEIsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUF4RCxDQURlLEdBR2YsQ0FBQyxNQUFELEVBQVMsd0JBQVQsQ0FIRixFQUFDLGdCQUFELEVBQVM7SUFLVCxJQUFBLEdBQU8sQ0FDTCxRQUFBLEdBQVMsUUFBVCxHQUFrQiw0Q0FBbEIsR0FBOEQsTUFEekQsRUFFTCxRQUFBLEdBQVMsUUFBVCxHQUFrQixvQkFBbEIsR0FBc0MsSUFBQyxDQUFBLFFBQXZDLEdBQWdELFVBQWhELEdBQXlELENBQUMsT0FBTyxDQUFDLGdCQUFSLENBQUEsQ0FBRCxDQUZwRCxFQUdMLFFBQUEsR0FBUyxRQUFULEdBQWtCLElBSGIsQ0FJTixDQUFDLElBSkssQ0FJQSxFQUpBO0lBTVAsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBWixDQUNSO01BQUEsSUFBQSxFQUFNLElBQU47TUFDQSxNQUFBLEVBQVEsTUFEUjtNQUVBLE1BQUEsRUFBUTtRQUFDLFVBQUEsRUFBWSxXQUFiO09BRlI7TUFHQSxPQUFBLEVBQVM7UUFBQyxjQUFBLEVBQWdCLCtCQUFBLEdBQWtDLFFBQWxDLEdBQTZDLEdBQTlEO09BSFQ7TUFJQSxJQUFBLEVBQU0sSUFKTjtLQURRO1dBT1YsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxJQUFEO01BQ2QsSUFBRyxRQUFIO1FBQ0UsbUJBQUcsSUFBSSxDQUFFLGNBQVQ7aUJBQ0UsUUFBQSxDQUFTLDBCQUFBLEdBQTJCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBL0MsRUFERjtTQUFBLE1BRUssSUFBRyxJQUFIO2lCQUNILFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZixFQURHO1NBQUEsTUFBQTtpQkFHSCxRQUFBLENBQVMsd0JBQVQsRUFIRztTQUhQOztJQURjLENBQWhCO0VBekJTOztnQ0FrQ1gseUJBQUEsR0FBMkIsU0FBQyxRQUFELEVBQVcsUUFBWDtBQUN6QixRQUFBO0lBQUEsVUFBQSxHQUFhLFNBQUMsR0FBRDtBQUNYLFVBQUE7TUFBQSxPQUFBLEdBQVUsR0FBRyxDQUFDLFFBQUosQ0FBQSxDQUFjLENBQUMsT0FBZixDQUFBLENBQXdCLENBQUMsR0FBekIsQ0FBNkIsU0FBN0I7TUFDVixJQUFHLFFBQVEsQ0FBQyxZQUFaO1FBQ0UsVUFBQSxHQUFhLFNBQUMsQ0FBRDtVQUNYLElBQUcsQ0FBSSxDQUFDLENBQUMsT0FBVDtBQUNFLGtCQUFVLElBQUEsYUFBQSxDQUFjLDBDQUFkLEVBRFo7O1FBRFcsRUFEZjs7TUFNQSxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQXRCLEdBQ0U7UUFBQSxHQUFBLEVBQUssR0FBTDtRQUNBLE9BQUEsRUFBUyxPQURUOzthQUVGLFFBQUEsQ0FBUyxJQUFULEVBQWUsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELE9BQU8sQ0FBQyxPQUFSLENBQUEsQ0FBaEQsQ0FBZjtJQVhXO0lBYWIsSUFBQSxHQUFPLFNBQUMsS0FBRDtBQUNMLFVBQUE7TUFBQSxPQUFBLEdBQVUsS0FBSyxDQUFDLFlBQU4sQ0FBbUIsRUFBbkI7YUFDVixLQUFLLENBQUMsT0FBTixDQUFBLENBQWUsQ0FBQyxHQUFoQixDQUFvQixTQUFwQixFQUErQixPQUEvQjtJQUZLO0lBSVAsS0FBQSxHQUFRLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxHQUFEO1FBQ04sSUFBRyxHQUFHLENBQUMsSUFBSixLQUFZLHdCQUFmO2lCQUNFLEtBQUMsQ0FBQSxTQUFELENBQVcsbUJBQW1CLENBQUMsU0FBL0IsRUFERjtTQUFBLE1BQUE7aUJBR0UsS0FBQSxDQUFNLEdBQUcsQ0FBQyxPQUFWLEVBSEY7O01BRE07SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO0lBTVIsaURBQXdCLENBQUUsV0FBMUI7TUFDRSxPQUFBLEdBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQXhCLENBQ1I7UUFBQSxNQUFBLEVBQVEsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUE5QjtPQURRLEVBRFo7S0FBQSxNQUFBO01BSUUsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUF4QixDQUNSO1FBQUEsS0FBQSxFQUFPLFFBQVEsQ0FBQyxJQUFoQjtRQUNBLFFBQUEsRUFBVSxJQUFDLENBQUEsUUFEWDtRQUVBLE9BQUEsRUFBUztVQUFDO1lBQUMsRUFBQSxFQUFPLDJHQUFILEdBQTJDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQXhFLEdBQWdGLE1BQXJGO1dBQUQ7U0FGVDtPQURRLEVBSlo7O1dBU0EsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxJQUFEO01BQ2QsbUJBQUcsSUFBSSxDQUFFLFdBQVQ7UUFDRSxRQUFRLENBQUMsWUFBVCxHQUF3QixJQUFJLENBQUM7UUFDN0IsUUFBUSxDQUFDLFlBQVQsR0FBd0I7VUFBQSxFQUFBLEVBQUksSUFBSSxDQUFDLEVBQVQ7O2VBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQXBCLENBQXlCLElBQUksQ0FBQyxFQUE5QixFQUFrQyxVQUFsQyxFQUE4QyxJQUE5QyxFQUFvRCxLQUFwRCxFQUhGO09BQUEsTUFBQTtlQUtFLFFBQUEsQ0FBUyxxQkFBVCxFQUxGOztJQURjLENBQWhCO0VBakN5Qjs7Z0NBeUMzQixpQkFBQSxHQUFtQixTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQ2pCLFFBQUE7SUFBQSxpREFBd0IsQ0FBRSxjQUExQjthQUNFLElBQUMsQ0FBQSwyQkFBRCxDQUE2QixPQUE3QixFQUFzQyxRQUF0QyxFQUFnRCxRQUFoRCxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSx5QkFBRCxDQUEyQixRQUEzQixFQUFxQyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRDtVQUNuQyxJQUF1QixHQUF2QjtBQUFBLG1CQUFPLFFBQUEsQ0FBUyxHQUFULEVBQVA7O2lCQUNBLEtBQUMsQ0FBQSwyQkFBRCxDQUE2QixPQUE3QixFQUFzQyxRQUF0QyxFQUFnRCxRQUFoRDtRQUZtQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckMsRUFIRjs7RUFEaUI7O2dDQVFuQiwyQkFBQSxHQUE2QixTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQzNCLFFBQUE7SUFBQSxLQUFBLEdBQVE7SUFDUixlQUFBLEdBQWtCLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO0lBQ2pELEtBQUEsR0FBUSxNQUFNLENBQUMsU0FBUCxDQUFpQixlQUFlLENBQUMsZ0JBQWhCLENBQUEsQ0FBakIsRUFBcUQsT0FBTyxDQUFDLGdCQUFSLENBQUEsQ0FBckQ7QUFDUixTQUFBLHVDQUFBOztNQUNFLElBQUcsSUFBSSxDQUFDLE9BQVI7UUFDRSxlQUFlLENBQUMsV0FBaEIsQ0FBNEIsS0FBNUIsRUFBbUMsS0FBQSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBdEQsRUFERjtPQUFBLE1BQUE7UUFHRSxJQUFHLElBQUksQ0FBQyxLQUFSO1VBQ0UsZUFBZSxDQUFDLFlBQWhCLENBQTZCLEtBQTdCLEVBQW9DLElBQUksQ0FBQyxLQUF6QyxFQURGOztRQUVBLEtBQUEsSUFBUyxJQUFJLENBQUMsTUFMaEI7O0FBREY7V0FPQSxRQUFBLENBQVMsSUFBVDtFQVgyQjs7OztHQWpRRzs7QUE4UWxDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ25UakIsSUFBQSwrRUFBQTtFQUFBOzs7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxpQkFBQSxHQUFvQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3JELG1CQUFBLEdBQXNCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDdkQsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBRTNDOzs7RUFFUyw4QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLDRCQUFELFVBQVc7SUFDdkIsc0RBQ0U7TUFBQSxJQUFBLEVBQU0sb0JBQW9CLENBQUMsSUFBM0I7TUFDQSxXQUFBLEVBQWEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxXQUFULElBQXdCLENBQUMsRUFBQSxDQUFHLHlCQUFILENBQUQsQ0FEckM7TUFFQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sSUFBTjtRQUNBLElBQUEsRUFBTSxJQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsSUFIUjtRQUlBLE1BQUEsRUFBUSxJQUpSO1FBS0EsS0FBQSxFQUFPLEtBTFA7T0FIRjtLQURGO0VBRFc7O0VBWWIsb0JBQUMsQ0FBQSxJQUFELEdBQU87O0VBQ1Asb0JBQUMsQ0FBQSxTQUFELEdBQVksU0FBQTtBQUNWLFFBQUE7V0FBQSxNQUFBOztBQUFTO1FBQ1AsSUFBQSxHQUFPO1FBQ1AsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixJQUE1QixFQUFrQyxJQUFsQztRQUNBLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBcEIsQ0FBK0IsSUFBL0I7ZUFDQSxLQUpPO09BQUEsYUFBQTtlQU1QLE1BTk87OztFQURDOztpQ0FTWixJQUFBLEdBQU0sU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtBQUNKLFFBQUE7QUFBQTtNQUNFLE9BQUEsR0FBVSxJQUFDLENBQUEsT0FBRCxDQUFTLFFBQVEsQ0FBQyxJQUFsQjtNQUNWLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBcEIsQ0FBNEIsT0FBNUIsRUFBcUMsT0FBTyxDQUFDLGdCQUFSLENBQUEsQ0FBckM7OENBQ0EsU0FBVSxlQUhaO0tBQUEsYUFBQTthQUtFLFFBQUEsQ0FBUyxrQkFBQSxHQUFtQixDQUFDLENBQUMsT0FBOUIsRUFMRjs7RUFESTs7aUNBUU4sSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDSixRQUFBO0FBQUE7YUFDRSxRQUFBLENBQVMsSUFBVCxFQUFlLG1CQUFtQixDQUFDLDJCQUFwQixDQUFnRCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQXBCLENBQTRCLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCLENBQTVCLENBQWhELENBQWYsRUFERjtLQUFBLGFBQUE7TUFFTTthQUNKLFFBQUEsQ0FBUyxrQkFBQSxHQUFtQixDQUFDLENBQUMsT0FBOUIsRUFIRjs7RUFESTs7aUNBTU4sSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDSixRQUFBO0lBQUEsSUFBQSxHQUFPO0lBQ1AsTUFBQSxHQUFTLElBQUMsQ0FBQSxPQUFELENBQVMscUJBQUMsUUFBUSxDQUFFLElBQVYsQ0FBQSxXQUFBLElBQW9CLEVBQXJCLENBQXdCLENBQUMsSUFBekIsQ0FBOEIsR0FBOUIsQ0FBVDtBQUNUO0FBQUEsU0FBQSxVQUFBOztNQUNFLElBQUcsR0FBRyxDQUFDLE1BQUosQ0FBVyxDQUFYLEVBQWMsTUFBTSxDQUFDLE1BQXJCLENBQUEsS0FBZ0MsTUFBbkM7UUFDRSxPQUEyQixHQUFHLENBQUMsTUFBSixDQUFXLE1BQU0sQ0FBQyxNQUFsQixDQUF5QixDQUFDLEtBQTFCLENBQWdDLEdBQWhDLENBQTNCLEVBQUMsa0JBQUQsRUFBVztRQUNYLElBQUEsR0FBTyxHQUFHLENBQUMsTUFBSixDQUFXLE1BQU0sQ0FBQyxNQUFsQjtRQUNQLElBQUksQ0FBQyxJQUFMLENBQWMsSUFBQSxhQUFBLENBQ1o7VUFBQSxJQUFBLEVBQU0sSUFBTjtVQUNBLElBQUEsRUFBUyxTQUFTLENBQUMsTUFBVixHQUFtQixDQUF0QixHQUE2QixhQUFhLENBQUMsTUFBM0MsR0FBdUQsYUFBYSxDQUFDLElBRDNFO1VBRUEsTUFBQSxFQUFRLFFBRlI7VUFHQSxRQUFBLEVBQVUsSUFIVjtTQURZLENBQWQsRUFIRjs7QUFERjtXQVNBLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtFQVpJOztpQ0FjTixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsUUFBWDtBQUNOLFFBQUE7QUFBQTtNQUNFLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBcEIsQ0FBK0IsSUFBQyxDQUFBLE9BQUQsQ0FBUyxRQUFRLENBQUMsSUFBbEIsQ0FBL0I7OENBQ0EsU0FBVSxlQUZaO0tBQUEsYUFBQTs4Q0FJRSxTQUFVLDZCQUpaOztFQURNOztpQ0FPUixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsT0FBWCxFQUFvQixRQUFwQjtBQUNOLFFBQUE7QUFBQTtNQUNFLE9BQUEsR0FBVSxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQXBCLENBQTRCLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCLENBQTVCO01BQ1YsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixJQUFDLENBQUEsT0FBRCxDQUFTLE9BQVQsQ0FBNUIsRUFBK0MsT0FBL0M7TUFDQSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQXBCLENBQStCLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCLENBQS9CO01BQ0EsUUFBUSxDQUFDLElBQVQsR0FBZ0I7YUFDaEIsUUFBQSxDQUFTLElBQVQsRUFBZSxRQUFmLEVBTEY7S0FBQSxhQUFBOzhDQU9FLFNBQVUsNkJBUFo7O0VBRE07O2lDQVVSLE9BQUEsR0FBUyxTQUFDLElBQUQ7O01BQUMsT0FBTzs7V0FDZixPQUFBLEdBQU8sQ0FBQyxJQUFJLENBQUMsT0FBTCxDQUFhLEtBQWIsRUFBb0IsR0FBcEIsQ0FBRDtFQURBOzs7O0dBckV3Qjs7QUF3RW5DLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQzlFakIsSUFBQTs7QUFBQyxNQUFPLEtBQUssQ0FBQyxJQUFiOztBQUVELFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBRUw7RUFDUyxtQkFBQyxPQUFEO0lBQ1YsSUFBQyxDQUFBLGtCQUFBLE9BQUYsRUFBVyxJQUFDLENBQUEsbUJBQUE7RUFERDs7Ozs7O0FBR1Q7RUFDUyx1QkFBQyxPQUFEO0FBQ1gsUUFBQTtJQUFDLElBQUMsQ0FBQSxlQUFBLElBQUYsRUFBUSxJQUFDLENBQUEsZUFBQSxJQUFULEVBQWUsSUFBQyxDQUFBLG9EQUFXLElBQTNCLEVBQWlDLElBQUMsQ0FBQSxrREFBUyxJQUEzQyxFQUFpRCxJQUFDLENBQUEsOERBQWEsRUFBL0QsRUFBbUUsSUFBQyxDQUFBLHVCQUFBLFlBQXBFLEVBQWtGLElBQUMsQ0FBQSwwQkFBQSxlQUFuRixFQUFvRyxJQUFDLENBQUEsaUNBQUE7RUFEMUY7O0VBRWIsYUFBQyxDQUFBLE1BQUQsR0FBUzs7RUFDVCxhQUFDLENBQUEsSUFBRCxHQUFPOzswQkFFUCxJQUFBLEdBQU0sU0FBQTtBQUNKLFFBQUE7SUFBQSxLQUFBLEdBQVE7SUFDUixNQUFBLEdBQVMsSUFBQyxDQUFBO0FBQ1YsV0FBTSxNQUFBLEtBQVksSUFBbEI7TUFDRSxLQUFLLENBQUMsT0FBTixDQUFjLE1BQWQ7TUFDQSxNQUFBLEdBQVMsTUFBTSxDQUFDO0lBRmxCO1dBR0E7RUFOSTs7Ozs7O0FBU0Y7RUFDUyw2QkFBQTtJQUNYLElBQUMsQ0FBQSxnQkFBRCxHQUFvQjtFQURUOztnQ0FJYixtQkFBQSxHQUFxQixTQUFDLGdCQUFEO0FBQ25CLFFBQUE7QUFBQTtTQUFBLHVCQUFBO21CQUNFLElBQUMsQ0FBQSxnQkFBaUIsQ0FBQSxHQUFBLENBQWxCLEdBQXlCLGdCQUFpQixDQUFBLEdBQUE7QUFENUM7O0VBRG1COztnQ0FLckIsMkJBQUEsR0FBNkIsU0FBQyxPQUFEO1dBQ3ZCLElBQUEsWUFBQSxDQUFhLElBQUMsQ0FBQSxjQUFELENBQWdCLE9BQWhCLENBQWI7RUFEdUI7O2dDQVE3QixjQUFBLEdBQWdCLFNBQUMsT0FBRDtBQUNkLFFBQUE7SUFBQSxxQkFBQSxHQUF3QixJQUFDLENBQUEsYUFBRCxDQUFlLE9BQWY7QUFDeEIsU0FBQSw0QkFBQTs7UUFDRSxxQkFBc0IsQ0FBQSxHQUFBLElBQVEsSUFBQyxDQUFBLGdCQUFpQixDQUFBLEdBQUE7O0FBRGxEO0FBRUEsV0FBTztFQUpPOztnQ0FPaEIsYUFBQSxHQUFlLFNBQUMsT0FBRDtJQUNiLElBQUcsUUFBQSxDQUFTLE9BQVQsQ0FBSDtBQUNFO1FBQUksT0FBQSxHQUFVLElBQUksQ0FBQyxLQUFMLENBQVcsT0FBWCxFQUFkO09BQUEscUJBREY7O0lBRUEsSUFBRyx1QkFBSDtBQUNFLGFBQU8sUUFEVDtLQUFBLE1BQUE7QUFHRSxhQUFPO1FBQUMsU0FBQSxPQUFEO1FBSFQ7O0VBSGE7Ozs7OztBQVFYO0VBQ1Msc0JBQUMsRUFBRDtJQUFDLElBQUMsQ0FBQSxpQkFBRCxLQUFLO0VBQU47O3lCQUViLFVBQUEsR0FBWSxTQUFBO1dBQUcsSUFBQyxDQUFBO0VBQUo7O3lCQUNaLGdCQUFBLEdBQW1CLFNBQUE7V0FBRyxJQUFJLENBQUMsU0FBTCxDQUFlLElBQUMsQ0FBQSxDQUFoQjtFQUFIOzt5QkFFbkIsS0FBQSxHQUFPLFNBQUE7V0FBTyxJQUFBLFlBQUEsQ0FBYSxDQUFDLENBQUMsU0FBRixDQUFZLElBQUMsQ0FBQSxDQUFiLENBQWI7RUFBUDs7eUJBRVAsT0FBQSxHQUFTLFNBQUMsSUFBRDtXQUFVLElBQUMsQ0FBQSxDQUFDLENBQUMsT0FBSCxHQUFhO0VBQXZCOzt5QkFDVCxPQUFBLEdBQVMsU0FBQTtJQUFHLElBQUcsSUFBQyxDQUFBLENBQUMsQ0FBQyxPQUFILEtBQWMsSUFBakI7YUFBMkIsR0FBM0I7S0FBQSxNQUFtQyxJQUFHLFFBQUEsQ0FBUyxJQUFDLENBQUEsQ0FBQyxDQUFDLE9BQVosQ0FBSDthQUE2QixJQUFDLENBQUEsQ0FBQyxDQUFDLFFBQWhDO0tBQUEsTUFBQTthQUE2QyxJQUFJLENBQUMsU0FBTCxDQUFlLElBQUMsQ0FBQSxDQUFDLENBQUMsT0FBbEIsRUFBN0M7O0VBQXRDOzt5QkFFVCxXQUFBLEdBQWEsU0FBQyxRQUFEO0FBQWMsUUFBQTtBQUFBO1NBQUEsZUFBQTttQkFBQSxJQUFDLENBQUEsQ0FBRSxDQUFBLEdBQUEsQ0FBSCxHQUFVLFFBQVMsQ0FBQSxHQUFBO0FBQW5COztFQUFkOzt5QkFDYixHQUFBLEdBQUssU0FBQyxJQUFEO1dBQVUsSUFBQyxDQUFBLENBQUUsQ0FBQSxJQUFBO0VBQWI7Ozs7OztBQUVEO0VBRVMsMkJBQUMsT0FBRDtJQUNWLElBQUMsQ0FBQSxlQUFBLElBQUYsRUFBUSxJQUFDLENBQUEsc0JBQUEsV0FBVCxFQUFzQixJQUFDLENBQUEsdUJBQUE7RUFEWjs7RUFHYixpQkFBQyxDQUFBLFNBQUQsR0FBWSxTQUFBO1dBQUc7RUFBSDs7OEJBRVosR0FBQSxHQUFLLFNBQUMsVUFBRDtXQUNILElBQUMsQ0FBQSxZQUFhLENBQUEsVUFBQTtFQURYOzs4QkFHTCxVQUFBLEdBQVksU0FBQyxRQUFEO0lBQ1YsSUFBRyxRQUFIO2FBQ0UsUUFBQSxDQUFTLElBQVQsRUFERjtLQUFBLE1BQUE7YUFHRSxLQUhGOztFQURVOzs4QkFNWix5QkFBQSxHQUEyQixTQUFBO1dBQ3hCLGlDQUFBLENBQWtDO01BQUMsUUFBQSxFQUFVLElBQVg7S0FBbEM7RUFEd0I7OzhCQUczQixVQUFBLEdBQVksU0FBQTtXQUNWO0VBRFU7OzhCQUdaLE1BQUEsR0FBUSxTQUFDLFFBQUQ7V0FDTixJQUFDLENBQUEsZUFBRCxDQUFpQixRQUFqQjtFQURNOzs4QkFHUixJQUFBLEdBQU0sU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtXQUNKLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCO0VBREk7OzhCQUdOLElBQUEsR0FBTSxTQUFDLFFBQUQ7V0FDSixJQUFDLENBQUEsZUFBRCxDQUFpQixNQUFqQjtFQURJOzs4QkFHTixJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCO0VBREk7OzhCQUdOLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ04sSUFBQyxDQUFBLGVBQUQsQ0FBaUIsUUFBakI7RUFETTs7OEJBR1IsTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLE9BQVgsRUFBb0IsUUFBcEI7V0FDTixJQUFDLENBQUEsZUFBRCxDQUFpQixRQUFqQjtFQURNOzs4QkFHUixLQUFBLEdBQU8sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNMLElBQUMsQ0FBQSxlQUFELENBQWlCLE9BQWpCO0VBREs7OzhCQUdQLGVBQUEsR0FBaUIsU0FBQyxVQUFEO1dBQ2YsS0FBQSxDQUFTLFVBQUQsR0FBWSx1QkFBWixHQUFtQyxJQUFDLENBQUEsSUFBcEMsR0FBeUMsV0FBakQ7RUFEZTs7Ozs7O0FBR25CLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSxTQUFBLEVBQVcsU0FBWDtFQUNBLGFBQUEsRUFBZSxhQURmO0VBRUEsWUFBQSxFQUFjLFlBRmQ7RUFHQSxtQkFBQSxFQUF5QixJQUFBLG1CQUFBLENBQUEsQ0FIekI7RUFJQSxpQkFBQSxFQUFtQixpQkFKbkI7Ozs7OztBQ3JIRixJQUFBLHFGQUFBO0VBQUE7OztBQUFBLEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBQ0wsUUFBQSxHQUFXLE9BQUEsQ0FBUSxvQkFBUjs7QUFFWCxpQkFBQSxHQUFvQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3JELG1CQUFBLEdBQXNCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDdkQsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBRTNDOzs7RUFFUywwQkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLDRCQUFELFVBQVc7SUFDdkIsa0RBQ0U7TUFBQSxJQUFBLEVBQU0sZ0JBQWdCLENBQUMsSUFBdkI7TUFDQSxXQUFBLEVBQWEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxXQUFULElBQXdCLENBQUMsRUFBQSxDQUFHLHFCQUFILENBQUQsQ0FEckM7TUFFQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sS0FBTjtRQUNBLElBQUEsRUFBTSxJQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsS0FIUjtRQUlBLE1BQUEsRUFBUSxLQUpSO1FBS0EsS0FBQSxFQUFPLEtBTFA7T0FIRjtLQURGO0lBVUEsSUFBQyxDQUFBLElBQUQsR0FBUTtFQVhHOztFQWFiLGdCQUFDLENBQUEsSUFBRCxHQUFPOzs2QkFFUCxJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxTQUFELENBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO0FBQ1QsWUFBQTtRQUFBLElBQXVCLEdBQXZCO0FBQUEsaUJBQU8sUUFBQSxDQUFTLEdBQVQsRUFBUDs7UUFDQSxPQUFBLEdBQVUsS0FBQyxDQUFBLFlBQUQsQ0FBYyxRQUFkO1FBQ1YsSUFBRyxPQUFIO1VBQ0UsSUFBRyxPQUFRLENBQUEsUUFBUSxDQUFDLElBQVQsQ0FBWDtZQUNFLElBQUcsT0FBUSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxRQUFRLENBQUMsSUFBaEMsS0FBd0MsYUFBYSxDQUFDLElBQXpEO3FCQUNFLFFBQUEsQ0FBUyxJQUFULEVBQWUsT0FBUSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxPQUF0QyxFQURGO2FBQUEsTUFBQTtxQkFHRSxRQUFBLENBQVksUUFBUSxDQUFDLElBQVYsR0FBZSxjQUExQixFQUhGO2FBREY7V0FBQSxNQUFBO21CQU1FLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLHNCQUExQixFQU5GO1dBREY7U0FBQSxNQUFBO2lCQVNFLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLG1CQUExQixFQVRGOztNQUhTO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYO0VBREk7OzZCQWVOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFNBQUQsQ0FBVyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsR0FBRCxFQUFNLElBQU47QUFDVCxZQUFBO1FBQUEsSUFBdUIsR0FBdkI7QUFBQSxpQkFBTyxRQUFBLENBQVMsR0FBVCxFQUFQOztRQUNBLElBQUEsR0FBTztRQUNQLE9BQUEsR0FBVSxLQUFDLENBQUEsWUFBRCxDQUFjLFFBQWQ7UUFDVixJQUFHLE9BQUg7QUFDRSxlQUFBLG1CQUFBOzs7WUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxRQUFmO0FBQUEsV0FERjs7ZUFFQSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7TUFOUztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWDtFQURJOzs2QkFTTixZQUFBLEdBQWMsU0FBQyxRQUFEO0lBQ1osd0JBQUcsUUFBUSxDQUFFLGNBQVYsS0FBa0IsYUFBYSxDQUFDLE1BQW5DO2FBQ0UsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUR4QjtLQUFBLE1BRUssdUJBQUcsUUFBUSxDQUFFLGVBQWI7YUFDSCxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUQxQjtLQUFBLE1BQUE7YUFHSCxJQUFDLENBQUEsS0FIRTs7RUFITzs7NkJBUWQsU0FBQSxHQUFXLFNBQUMsUUFBRDtJQUNULElBQUcsSUFBQyxDQUFBLElBQUQsS0FBVyxJQUFkO2FBQ0UsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFDLENBQUEsSUFBaEIsRUFERjtLQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVo7TUFDSCxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUFDLENBQUEsT0FBTyxDQUFDLElBQXJDO2FBQ1IsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFDLENBQUEsSUFBaEIsRUFGRztLQUFBLE1BR0EsSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLFlBQVo7YUFDSCxJQUFDLENBQUEsT0FBTyxDQUFDLFlBQVQsQ0FBc0IsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO1VBQ3BCLElBQUcsR0FBSDttQkFDRSxRQUFBLENBQVMsR0FBVCxFQURGO1dBQUEsTUFBQTtZQUdFLEtBQUMsQ0FBQSxJQUFELEdBQVEsS0FBQyxDQUFBLDBCQUFELENBQTRCLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBckM7bUJBQ1IsUUFBQSxDQUFTLElBQVQsRUFBZSxLQUFDLENBQUEsSUFBaEIsRUFKRjs7UUFEb0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRCLEVBREc7S0FBQSxNQU9BLElBQUcsSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQUFaO2FBQ0gsQ0FBQyxDQUFDLElBQUYsQ0FDRTtRQUFBLFFBQUEsRUFBVSxNQUFWO1FBQ0EsR0FBQSxFQUFLLElBQUMsQ0FBQSxPQUFPLENBQUMsR0FEZDtRQUVBLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLElBQUQ7WUFDUCxLQUFDLENBQUEsSUFBRCxHQUFRLEtBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUE1QjttQkFDUixRQUFBLENBQVMsSUFBVCxFQUFlLEtBQUMsQ0FBQSxJQUFoQjtVQUZPO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUZUO1FBS0EsS0FBQSxFQUFPLFNBQUE7aUJBQUcsUUFBQSxDQUFTLDBCQUFBLEdBQTJCLElBQUMsQ0FBQSxXQUE1QixHQUF3QyxXQUFqRDtRQUFILENBTFA7T0FERixFQURHO0tBQUEsTUFBQTs7UUFTSCxPQUFPLENBQUMsTUFBTyxrQ0FBQSxHQUFtQyxJQUFDLENBQUEsV0FBcEMsR0FBZ0Q7O2FBQy9ELFFBQUEsQ0FBUyxJQUFULEVBQWUsRUFBZixFQVZHOztFQWJJOzs2QkF5QlgsMEJBQUEsR0FBNEIsU0FBQyxJQUFELEVBQU8sTUFBUDtBQUMxQixRQUFBOztNQURpQyxTQUFTOztJQUMxQyxJQUFBLEdBQU87QUFDUCxTQUFBLGdCQUFBOztNQUNFLElBQUEsR0FBVSxRQUFBLENBQVMsSUFBSyxDQUFBLFFBQUEsQ0FBZCxDQUFILEdBQWdDLGFBQWEsQ0FBQyxJQUE5QyxHQUF3RCxhQUFhLENBQUM7TUFDN0UsUUFBQSxHQUFlLElBQUEsYUFBQSxDQUNiO1FBQUEsSUFBQSxFQUFNLFFBQU47UUFDQSxJQUFBLEVBQU0sSUFETjtRQUVBLE1BQUEsRUFBUSxNQUZSO1FBR0EsUUFBQSxFQUFVLElBSFY7UUFJQSxZQUFBLEVBQ0U7VUFBQSxRQUFBLEVBQVUsSUFBVjtTQUxGO09BRGE7TUFPZixJQUFHLElBQUEsS0FBUSxhQUFhLENBQUMsTUFBekI7UUFDRSxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQXRCLEdBQWlDLElBQUMsQ0FBQSwwQkFBRCxDQUE0QixJQUFLLENBQUEsUUFBQSxDQUFqQyxFQUE0QyxRQUE1QyxFQURuQzs7TUFFQSxPQUFBLEdBQVUsbUJBQW1CLENBQUMsMkJBQXBCLENBQWdELElBQUssQ0FBQSxRQUFBLENBQXJEO01BQ1YsSUFBSyxDQUFBLFFBQUEsQ0FBTCxHQUNFO1FBQUEsT0FBQSxFQUFTLE9BQVQ7UUFDQSxRQUFBLEVBQVUsUUFEVjs7QUFiSjtXQWVBO0VBakIwQjs7OztHQTFFQzs7QUE2Ri9CLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3BHakIsSUFBQTs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLG1CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsbUJBQVI7O0FBRUw7RUFFUyxpQ0FBQyxJQUFELEVBQVEsSUFBUjtJQUFDLElBQUMsQ0FBQSxPQUFEO0lBQU8sSUFBQyxDQUFBLHNCQUFELE9BQVE7RUFBaEI7Ozs7OztBQUVUO0VBRUosc0JBQUMsQ0FBQSxXQUFELEdBQWMsQ0FBQyxlQUFELEVBQWtCLGdCQUFsQixFQUFvQyxlQUFwQyxFQUFxRCxXQUFyRCxFQUFrRSxNQUFsRSxFQUEwRSxrQkFBMUUsRUFBOEYsY0FBOUYsRUFBOEcsZ0JBQTlHLEVBQWdJLGNBQWhJOztFQUVELGdDQUFDLE9BQUQsRUFBVSxNQUFWO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FBUyxJQUFDLENBQUEsY0FBRCxDQUFnQixPQUFPLENBQUMsSUFBeEIsRUFBOEIsTUFBOUI7SUFDVCxPQUFPLENBQUMsR0FBUixDQUFZLElBQUMsQ0FBQSxLQUFiO0VBRlc7O21DQUliLGNBQUEsR0FBZ0IsU0FBQyxTQUFELEVBQVksTUFBWjtBQUNkLFFBQUE7SUFBQSxTQUFBLEdBQVksU0FBQyxNQUFEO0FBQ1YsVUFBQTtrREFBYyxDQUFFLElBQWhCLENBQXFCLE1BQXJCLFdBQUEsSUFBZ0MsQ0FBQyxTQUFBO2VBQUcsS0FBQSxDQUFNLEtBQUEsR0FBTSxNQUFOLEdBQWEsb0NBQW5CO01BQUgsQ0FBRDtJQUR0QjtJQUdaLFVBQUEsR0FBYSxTQUFDLE1BQUQ7QUFDWCxjQUFPLE1BQVA7QUFBQSxhQUNPLGVBRFA7aUJBRUksU0FBQTttQkFBRyxDQUFDLG9DQUFBLElBQWdDLCtCQUFqQyxDQUFBLElBQTREO1VBQS9EO0FBRkosYUFHTywwQkFIUDtpQkFJSSxTQUFBO21CQUFHLG9DQUFBLElBQWdDO1VBQW5DO0FBSkosYUFLTyxvQkFMUDtpQkFNSSxTQUFBO21CQUFHO1VBQUg7QUFOSixhQU9PLGNBUFA7aUJBUUksU0FBQTtBQUFHLGdCQUFBOytGQUErQixDQUFFLEdBQWpDLENBQXFDLFFBQXJDO1VBQUg7QUFSSixhQVNPLGdCQVRQO2lCQVVJLFNBQUE7bUJBQUc7VUFBSDtBQVZKLGFBV08sY0FYUDtBQUFBLGFBV3VCLGNBWHZCO2lCQVlJLFNBQUE7bUJBQUc7VUFBSDtBQVpKLGFBYU8sYUFiUDtpQkFjSSxTQUFBO0FBQUcsZ0JBQUE7bUJBQUE7VUFBSDtBQWRKO2lCQWdCSTtBQWhCSjtJQURXO0lBbUJiLFFBQUEsR0FBVyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsWUFBRDtRQUNULElBQUcsWUFBSDtpQkFDRSxLQUFDLENBQUEsY0FBRCxDQUFnQixZQUFoQixFQUE4QixNQUE5QixFQURGO1NBQUEsTUFBQTtpQkFHRSxLQUhGOztNQURTO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtJQU1YLEtBQUEsR0FDRTtNQUFBLGFBQUEsRUFBZSxFQUFBLENBQUcsV0FBSCxDQUFmO01BQ0EsY0FBQSxFQUFnQixFQUFBLENBQUcsWUFBSCxDQURoQjtNQUVBLHdCQUFBLEVBQTBCLEVBQUEsQ0FBRyw2QkFBSCxDQUYxQjtNQUdBLG9CQUFBLEVBQXNCLEVBQUEsQ0FBRyw2QkFBSCxDQUh0QjtNQUlBLElBQUEsRUFBTSxFQUFBLENBQUcsWUFBSCxDQUpOO01BS0EsZ0JBQUEsRUFBa0IsRUFBQSxDQUFHLGVBQUgsQ0FMbEI7TUFNQSxjQUFBLEVBQWdCLEVBQUEsQ0FBRyxpQkFBSCxDQU5oQjtNQU9BLFlBQUEsRUFBYyxFQUFBLENBQUcsc0JBQUgsQ0FQZDtNQVFBLFdBQUEsRUFBYSxFQUFBLENBQUcsb0JBQUgsQ0FSYjtNQVNBLGNBQUEsRUFBZ0IsRUFBQSxDQUFHLGdCQUFILENBVGhCO01BVUEsWUFBQSxFQUFjLEVBQUEsQ0FBRyxjQUFILENBVmQ7TUFXQSxhQUFBLEVBQWUsRUFBQSxDQUFHLGlCQUFILENBWGY7TUFZQSxZQUFBLEVBQWMsRUFBQSxDQUFHLGFBQUgsQ0FaZDs7SUFjRixRQUFBLEdBQ0U7TUFBQSxhQUFBLEVBQWUsQ0FBQywwQkFBRCxFQUE2QixzQkFBN0IsQ0FBZjtNQUNBLFlBQUEsRUFBYyxDQUFDLGNBQUQsRUFBaUIsYUFBakIsQ0FEZDs7SUFHRixLQUFBLEdBQVE7QUFDUixTQUFBLG1EQUFBOztNQUNFLElBQUcsSUFBQSxLQUFRLFdBQVg7UUFDRSxRQUFBLEdBQ0U7VUFBQSxHQUFBLEVBQUssV0FBQSxHQUFZLENBQWpCO1VBQ0EsU0FBQSxFQUFXLElBRFg7VUFGSjtPQUFBLE1BSUssSUFBRyxRQUFBLENBQVMsSUFBVCxDQUFIO1FBQ0gsUUFBQSxHQUNFO1VBQUEsR0FBQSxFQUFLLElBQUw7VUFDQSxJQUFBLDBDQUF5QixDQUFBLElBQUEsV0FBbkIsSUFBNEIsS0FBTSxDQUFBLElBQUEsQ0FBbEMsSUFBMkMsQ0FBQSxnQkFBQSxHQUFpQixJQUFqQixDQURqRDtVQUVBLE9BQUEsRUFBUyxVQUFBLENBQVcsSUFBWCxDQUZUO1VBR0EsS0FBQSxFQUFPLFFBQUEsQ0FBUyxRQUFTLENBQUEsSUFBQSxDQUFsQixDQUhQO1VBSUEsTUFBQSxFQUFRLFNBQUEsQ0FBVSxJQUFWLENBSlI7VUFGQztPQUFBLE1BQUE7UUFRSCxRQUFBLEdBQVc7UUFFWCxJQUFHLFFBQUEsQ0FBUyxJQUFJLENBQUMsTUFBZCxDQUFIO1VBQ0UsUUFBUSxDQUFDLEdBQVQsR0FBZSxJQUFJLENBQUM7VUFDcEIsUUFBUSxDQUFDLE9BQVQsR0FBbUIsVUFBQSxDQUFXLElBQUksQ0FBQyxNQUFoQjtVQUNuQixRQUFRLENBQUMsTUFBVCxHQUFrQixTQUFBLENBQVUsSUFBSSxDQUFDLE1BQWYsRUFIcEI7U0FBQSxNQUFBO1VBS0UsUUFBUSxDQUFDLFlBQVQsUUFBUSxDQUFDLFVBQVksTUFMdkI7O1FBTUEsUUFBUSxDQUFDLEtBQVQsR0FBaUIsSUFBSSxDQUFDLEtBQUwsSUFBYyxRQUFBLENBQVMsSUFBSSxDQUFDLElBQWQsRUFoQjVCOztNQWlCTCxLQUFLLENBQUMsSUFBTixDQUFXLFFBQVg7QUF0QkY7V0F1QkE7RUF4RWM7Ozs7OztBQTBFWjtFQUVTLDRCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsU0FBRDtJQUNaLElBQUMsQ0FBQSxJQUFELEdBQVE7RUFERzs7K0JBR2IsSUFBQSxHQUFNLFNBQUMsT0FBRDtJQUNKLE9BQUEsR0FBVSxPQUFBLElBQVc7SUFFckIsSUFBRyxPQUFPLENBQUMsSUFBUixLQUFrQixJQUFyQjtNQUNFLElBQUcsT0FBTyxPQUFPLENBQUMsSUFBZixLQUF1QixXQUExQjtRQUNFLE9BQU8sQ0FBQyxJQUFSLEdBQWUsc0JBQXNCLENBQUMsWUFEeEM7O2FBRUEsSUFBQyxDQUFBLElBQUQsR0FBWSxJQUFBLHNCQUFBLENBQXVCLE9BQXZCLEVBQWdDLElBQUMsQ0FBQSxNQUFqQyxFQUhkOztFQUhJOzsrQkFTTixNQUFBLEdBQVEsU0FBQyxnQkFBRDtJQUFDLElBQUMsQ0FBQSxtQkFBRDtFQUFEOzsrQkFFUixjQUFBLEdBQWdCLFNBQUMsSUFBRDtXQUNkLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLGdCQUF4QixFQUEwQyxJQUExQyxDQUF0QjtFQURjOzsrQkFHaEIsZUFBQSxHQUFpQixTQUFDLElBQUQ7V0FDZixJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixpQkFBeEIsRUFBMkMsSUFBM0MsQ0FBdEI7RUFEZTs7K0JBR2pCLGVBQUEsR0FBaUIsU0FBQyxHQUFELEVBQU0sSUFBTjtXQUNmLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLGlCQUF4QixFQUNwQjtNQUFBLEdBQUEsRUFBSyxHQUFMO01BQ0EsSUFBQSxFQUFNLElBRE47S0FEb0IsQ0FBdEI7RUFEZTs7K0JBS2pCLG9CQUFBLEdBQXNCLFNBQUMsR0FBRCxFQUFNLElBQU47V0FDcEIsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isc0JBQXhCLEVBQ3BCO01BQUEsR0FBQSxFQUFLLEdBQUw7TUFDQSxJQUFBLEVBQU0sSUFETjtLQURvQixDQUF0QjtFQURvQjs7K0JBS3RCLG1CQUFBLEdBQXFCLFNBQUMsR0FBRCxFQUFNLElBQU47V0FDbkIsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0IscUJBQXhCLEVBQ3BCO01BQUEsR0FBQSxFQUFLLEdBQUw7TUFDQSxJQUFBLEVBQU0sSUFETjtLQURvQixDQUF0QjtFQURtQjs7K0JBS3JCLGNBQUEsR0FBZ0IsU0FBQyxJQUFEO1dBQ2QsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0IsZ0JBQXhCLEVBQTBDLElBQTFDLENBQXRCO0VBRGM7OytCQUdoQixjQUFBLEdBQWdCLFNBQUMsUUFBRDtXQUNkLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixVQUFyQixFQUFrQyxFQUFBLENBQUcsY0FBSCxDQUFsQyxFQUFzRCxRQUF0RDtFQURjOzsrQkFHaEIsZ0JBQUEsR0FBa0IsU0FBQyxRQUFEO1dBQ2hCLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixZQUFyQixFQUFvQyxFQUFBLENBQUcsaUJBQUgsQ0FBcEMsRUFBMkQsUUFBM0Q7RUFEZ0I7OytCQUdsQixjQUFBLEdBQWdCLFNBQUMsUUFBRDtXQUNkLElBQUMsQ0FBQSxtQkFBRCxDQUFxQixjQUFyQixFQUFzQyxFQUFBLENBQUcsbUJBQUgsQ0FBdEMsRUFBK0QsUUFBL0Q7RUFEYzs7K0JBR2hCLGNBQUEsR0FBZ0IsU0FBQyxRQUFEO1dBQ2QsSUFBQyxDQUFBLG1CQUFELENBQXFCLFVBQXJCLEVBQWtDLEVBQUEsQ0FBRyxjQUFILENBQWxDLEVBQXNELFFBQXREO0VBRGM7OytCQUdoQixjQUFBLEdBQWdCLFNBQUMsUUFBRCxFQUFXLFFBQVgsRUFBcUIsT0FBckIsRUFBOEIsUUFBOUI7V0FDZCxJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixvQkFBeEIsRUFDcEI7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLFFBQUEsRUFBVSxRQURWO01BRUEsT0FBQSxFQUFTLE9BRlQ7TUFHQSxRQUFBLEVBQVUsUUFIVjtLQURvQixDQUF0QjtFQURjOzsrQkFPaEIsWUFBQSxHQUFjLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDWixJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixrQkFBeEIsRUFDcEI7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLFFBQUEsRUFBVSxRQURWO0tBRG9CLENBQXRCO0VBRFk7OytCQUtkLGNBQUEsR0FBZ0IsU0FBQyxHQUFEO1dBQ2QsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isb0JBQXhCLEVBQ3BCO01BQUEsR0FBQSxFQUFLLEdBQUw7S0FEb0IsQ0FBdEI7RUFEYzs7K0JBSWhCLG1CQUFBLEdBQXFCLFNBQUMsTUFBRCxFQUFTLEtBQVQsRUFBZ0IsUUFBaEI7V0FDbkIsSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isb0JBQXhCLEVBQ3BCO01BQUEsTUFBQSxFQUFRLE1BQVI7TUFDQSxLQUFBLEVBQU8sS0FEUDtNQUVBLFFBQUEsRUFBVSxRQUZWO0tBRG9CLENBQXRCO0VBRG1COzs7Ozs7QUFNdkIsTUFBTSxDQUFDLE9BQVAsR0FDRTtFQUFBLHVCQUFBLEVBQXlCLHVCQUF6QjtFQUNBLGtCQUFBLEVBQW9CLGtCQURwQjtFQUVBLHNCQUFBLEVBQXdCLHNCQUZ4Qjs7Ozs7O0FDcEtGLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUMsS0FBRDtBQUNmLE1BQUE7RUFBQSxHQUFBLEdBQU07RUFDTixRQUFRLENBQUMsTUFBTSxDQUFDLE1BQWhCLENBQXVCLENBQXZCLENBQXlCLENBQUMsS0FBMUIsQ0FBZ0MsR0FBaEMsQ0FBb0MsQ0FBQyxJQUFyQyxDQUEwQyxTQUFDLElBQUQ7V0FDeEMsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYLENBQWdCLENBQUEsQ0FBQSxDQUFoQixLQUFzQixLQUF0QixJQUFnQyxDQUFDLEdBQUEsR0FBTSxJQUFJLENBQUMsS0FBTCxDQUFXLEdBQVgsQ0FBZ0IsQ0FBQSxDQUFBLENBQXZCO0VBRFEsQ0FBMUM7U0FFQTtBQUplOzs7OztBQ0FqQixNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFDLEtBQUQ7U0FBVyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUExQixDQUErQixLQUEvQixDQUFBLEtBQXlDO0FBQXBEOzs7OztBQ0FqQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsNEJBQUEsRUFBOEIsbUJBQTlCO0VBRUEsV0FBQSxFQUFhLEtBRmI7RUFHQSxZQUFBLEVBQWMsVUFIZDtFQUlBLGNBQUEsRUFBZ0IsaUNBSmhCO0VBS0EsWUFBQSxFQUFjLE1BTGQ7RUFNQSxlQUFBLEVBQWlCLGFBTmpCO0VBT0EsaUJBQUEsRUFBbUIsaUJBUG5CO0VBUUEsYUFBQSxFQUFlLFVBUmY7RUFTQSxzQkFBQSxFQUF3Qix5QkFUeEI7RUFVQSxvQkFBQSxFQUFzQixvQkFWdEI7RUFXQSxnQkFBQSxFQUFrQixVQVhsQjtFQVlBLGNBQUEsRUFBZ0IsUUFaaEI7RUFhQSxpQkFBQSxFQUFtQixjQWJuQjtFQWNBLDZCQUFBLEVBQStCLHVCQWQvQjtFQWVBLDZCQUFBLEVBQStCLGFBZi9CO0VBaUJBLGNBQUEsRUFBZ0IsTUFqQmhCO0VBa0JBLGlCQUFBLEVBQW1CLGFBbEJuQjtFQW1CQSxtQkFBQSxFQUFxQixpQkFuQnJCO0VBb0JBLGNBQUEsRUFBZ0IsTUFwQmhCO0VBcUJBLGtCQUFBLEVBQW9CLFVBckJwQjtFQXNCQSxnQkFBQSxFQUFrQixRQXRCbEI7RUF1QkEsZ0JBQUEsRUFBa0IsaUJBdkJsQjtFQXlCQSx5QkFBQSxFQUEyQixlQXpCM0I7RUEwQkEscUJBQUEsRUFBdUIsV0ExQnZCO0VBMkJBLHdCQUFBLEVBQTBCLGNBM0IxQjtFQTRCQSwwQkFBQSxFQUE0QixnQkE1QjVCO0VBOEJBLHVCQUFBLEVBQXlCLFVBOUJ6QjtFQStCQSxtQkFBQSxFQUFxQixNQS9CckI7RUFnQ0EsbUJBQUEsRUFBcUIsTUFoQ3JCO0VBaUNBLHFCQUFBLEVBQXVCLFFBakN2QjtFQWtDQSxxQkFBQSxFQUF1QixRQWxDdkI7RUFtQ0EsNkJBQUEsRUFBK0IsOENBbkMvQjtFQW9DQSxzQkFBQSxFQUF3QixZQXBDeEI7RUFzQ0EsMkJBQUEsRUFBNkIsVUF0QzdCO0VBdUNBLHlCQUFBLEVBQTJCLFFBdkMzQjtFQXlDQSx1QkFBQSxFQUF5QixRQXpDekI7RUEwQ0EsdUJBQUEsRUFBeUIsUUExQ3pCO0VBNENBLG9CQUFBLEVBQXNCLE1BNUN0QjtFQTZDQSxvQkFBQSxFQUFzQixNQTdDdEI7RUE4Q0EscUJBQUEsRUFBdUIsT0E5Q3ZCO0VBK0NBLDRCQUFBLEVBQThCLGlEQS9DOUI7RUFnREEsMEJBQUEsRUFBNEIsa0VBaEQ1QjtFQWtEQSxvQkFBQSxFQUFzQixtRUFsRHRCO0VBbURBLG1CQUFBLEVBQXFCLDhEQW5EckI7RUFvREEsc0JBQUEsRUFBd0Isc0dBcER4Qjs7Ozs7O0FDREYsSUFBQTs7QUFBQSxZQUFBLEdBQWdCOztBQUNoQixZQUFhLENBQUEsSUFBQSxDQUFiLEdBQXFCLE9BQUEsQ0FBUSxjQUFSOztBQUNyQixXQUFBLEdBQWM7O0FBQ2QsU0FBQSxHQUFZOztBQUVaLFNBQUEsR0FBWSxTQUFDLEdBQUQsRUFBTSxJQUFOLEVBQWUsSUFBZjtBQUNWLE1BQUE7O0lBRGdCLE9BQUs7OztJQUFJLE9BQUs7O0VBQzlCLFdBQUEsNENBQWtDLENBQUEsR0FBQSxXQUFwQixJQUE0QjtTQUMxQyxXQUFXLENBQUMsT0FBWixDQUFvQixTQUFwQixFQUErQixTQUFDLEtBQUQsRUFBUSxHQUFSO0lBQzdCLElBQUcsSUFBSSxDQUFDLGNBQUwsQ0FBb0IsR0FBcEIsQ0FBSDthQUFnQyxJQUFLLENBQUEsR0FBQSxFQUFyQztLQUFBLE1BQUE7YUFBK0Msa0JBQUEsR0FBbUIsR0FBbkIsR0FBdUIsTUFBdEU7O0VBRDZCLENBQS9CO0FBRlU7O0FBS1osTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDVmpCLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxpQkFBUixDQUFwQjs7QUFDVixvQkFBQSxHQUF1QixLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsK0JBQVIsQ0FBcEI7O0FBQ3ZCLGNBQUEsR0FBaUIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHdCQUFSLENBQXBCOztBQUNqQixZQUFBLEdBQWUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHNCQUFSLENBQXBCOztBQUNmLGNBQUEsR0FBaUIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHlCQUFSLENBQXBCOztBQUVqQixFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBRVgsTUFBZ0IsS0FBSyxDQUFDLEdBQXRCLEVBQUMsVUFBQSxHQUFELEVBQU0sYUFBQTs7QUFFTixRQUFBLEdBQVcsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FFN0I7RUFBQSxXQUFBLEVBQWEsMEJBQWI7RUFFQSxxQkFBQSxFQUF1QixTQUFDLFNBQUQ7V0FDckIsU0FBUyxDQUFDLEdBQVYsS0FBbUIsSUFBQyxDQUFBLEtBQUssQ0FBQztFQURMLENBRnZCO0VBS0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0UsTUFBQSxDQUFPO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtLQUFQLENBREY7RUFESyxDQUxSO0NBRjZCLENBQXBCOztBQVlYLEdBQUEsR0FBTSxLQUFLLENBQUMsV0FBTixDQUVKO0VBQUEsV0FBQSxFQUFhLGtCQUFiO0VBRUEsV0FBQSxFQUFhLFNBQUE7QUFDWCxRQUFBO0lBQUEsNkRBQStCLENBQUUsY0FBOUIsQ0FBNkMsTUFBN0MsV0FBQSxrRUFBMEYsQ0FBRSxnQkFBbkMsR0FBNEMsQ0FBeEc7YUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBRC9CO0tBQUEsTUFBQTthQUdHLEVBQUEsQ0FBRyw0QkFBSCxFQUhIOztFQURXLENBRmI7RUFRQSxXQUFBLEVBQWEsU0FBQTtBQUNYLFFBQUE7bUVBQTRCLENBQUU7RUFEbkIsQ0FSYjtFQVdBLGVBQUEsRUFBaUIsU0FBQTtBQUNmLFFBQUE7V0FBQTtNQUFBLFFBQUEsRUFBVSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQVY7TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQURWO01BRUEsU0FBQSxxREFBaUMsQ0FBRSxlQUF4QixJQUFpQyxFQUY1QztNQUdBLFdBQUEsd0NBQXNCLENBQUUsaUJBQVgsSUFBc0IsRUFIbkM7TUFJQSxjQUFBLEVBQWdCLElBSmhCO01BS0EsY0FBQSxFQUFnQixJQUxoQjtNQU1BLFlBQUEsRUFBYyxJQU5kO01BT0EsY0FBQSxFQUFnQixJQVBoQjtNQVFBLEtBQUEsRUFBTyxLQVJQOztFQURlLENBWGpCO0VBc0JBLGtCQUFBLEVBQW9CLFNBQUE7SUFDbEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBZCxDQUFxQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsS0FBRDtBQUNuQixZQUFBO1FBQUEsVUFBQSxHQUFnQixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQWYsR0FDWDtVQUFDLE9BQUEsRUFBUyxXQUFWO1VBQXVCLElBQUEsRUFBTSxNQUE3QjtTQURXLEdBRUwsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFmLEdBQ0g7VUFBQyxPQUFBLEVBQVMsdUJBQUEsR0FBd0IsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQWhFO1VBQStFLElBQUEsRUFBTSxNQUFyRjtTQURHLEdBRUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFmLEdBQ0g7VUFBQyxPQUFBLEVBQVMsU0FBVjtVQUFxQixJQUFBLEVBQU0sT0FBM0I7U0FERyxHQUdIO1FBQ0YsS0FBQyxDQUFBLFFBQUQsQ0FDRTtVQUFBLFFBQUEsRUFBVSxLQUFDLENBQUEsV0FBRCxDQUFBLENBQVY7VUFDQSxRQUFBLEVBQVUsS0FBQyxDQUFBLFdBQUQsQ0FBQSxDQURWO1VBRUEsVUFBQSxFQUFZLFVBRlo7U0FERjtBQUtBLGdCQUFPLEtBQUssQ0FBQyxJQUFiO0FBQUEsZUFDTyxXQURQO21CQUVJLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxTQUFBLHNEQUFpQyxDQUFFLGVBQXhCLElBQWlDLEVBQTVDO2FBQVY7QUFGSjtNQWRtQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckI7V0FrQkEsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQWxCLENBQXlCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxLQUFEO0FBQ3ZCLFlBQUE7QUFBQSxnQkFBTyxLQUFLLENBQUMsSUFBYjtBQUFBLGVBQ08sb0JBRFA7bUJBRUksS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLGNBQUEsRUFBZ0IsS0FBSyxDQUFDLElBQXRCO2FBQVY7QUFGSixlQUdPLG9CQUhQO21CQUlJLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxjQUFBLEVBQWdCLEtBQUssQ0FBQyxJQUF0QjthQUFWO0FBSkosZUFLTyxrQkFMUDttQkFNSSxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsWUFBQSxFQUFjLEtBQUssQ0FBQyxJQUFwQjthQUFWO0FBTkosZUFPTyxvQkFQUDttQkFRSSxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsY0FBQSxFQUFnQixLQUFLLENBQUMsSUFBdEI7YUFBVjtBQVJKLGVBU08sZ0JBVFA7WUFVSSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFqQixDQUFzQixLQUFLLENBQUMsSUFBNUI7bUJBQ0EsS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFNBQUEsRUFBVyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQWxCO2FBQVY7QUFYSixlQVlPLGlCQVpQO1lBYUksS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBakIsQ0FBeUIsS0FBSyxDQUFDLElBQS9CO21CQUNBLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxTQUFBLEVBQVcsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFsQjthQUFWO0FBZEosZUFlTyxpQkFmUDtZQWdCSSxLQUFBLEdBQVEsS0FBQyxDQUFBLGlCQUFELENBQW1CLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBOUI7WUFDUixJQUFHLEtBQUEsS0FBVyxDQUFDLENBQWY7Y0FDRSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVUsQ0FBQSxLQUFBLENBQWpCLEdBQTBCLEtBQUssQ0FBQyxJQUFJLENBQUM7cUJBQ3JDLEtBQUMsQ0FBQSxRQUFELENBQVU7Z0JBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBbEI7ZUFBVixFQUZGOztBQUZHO0FBZlAsZUFvQk8sc0JBcEJQO1lBcUJJLEtBQUEsR0FBUSxLQUFDLENBQUEsaUJBQUQsQ0FBbUIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUE5QjtZQUNSLElBQUcsS0FBQSxLQUFXLENBQUMsQ0FBZjtjQUNFLElBQUcsS0FBQSxLQUFTLENBQVo7Z0JBQ0UsS0FBQyxDQUFBLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBakIsQ0FBeUIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFwQyxFQURGO2VBQUEsTUFBQTtnQkFHRSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFqQixDQUF3QixLQUF4QixFQUErQixDQUEvQixFQUFrQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQTdDLEVBSEY7O3FCQUlBLEtBQUMsQ0FBQSxRQUFELENBQVU7Z0JBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBbEI7ZUFBVixFQUxGOztBQUZHO0FBcEJQLGVBNEJPLHFCQTVCUDtZQTZCSSxLQUFBLEdBQVEsS0FBQyxDQUFBLGlCQUFELENBQW1CLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBOUI7WUFDUixJQUFHLEtBQUEsS0FBVyxDQUFDLENBQWY7Y0FDRSxJQUFHLEtBQUEsS0FBUyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFqQixHQUEwQixDQUF0QztnQkFDRSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFqQixDQUFzQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQWpDLEVBREY7ZUFBQSxNQUFBO2dCQUdFLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQWpCLENBQXdCLEtBQUEsR0FBUSxDQUFoQyxFQUFtQyxDQUFuQyxFQUFzQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQWpELEVBSEY7O3FCQUlBLEtBQUMsQ0FBQSxRQUFELENBQVU7Z0JBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxLQUFLLENBQUMsU0FBbEI7ZUFBVixFQUxGOztBQUZHO0FBNUJQLGVBb0NPLGdCQXBDUDtZQXFDSSxLQUFDLENBQUEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFuQixHQUEwQixLQUFLLENBQUM7bUJBQ2hDLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxXQUFBLEVBQWEsS0FBQyxDQUFBLEtBQUssQ0FBQyxXQUFwQjthQUFWO0FBdENKO01BRHVCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QjtFQW5Ca0IsQ0F0QnBCO0VBa0ZBLGlCQUFBLEVBQW1CLFNBQUMsR0FBRDtBQUNqQixRQUFBO0lBQUEsSUFBRyxRQUFBLENBQVMsR0FBVCxDQUFIO0FBQ0U7QUFBQSxXQUFBLHNEQUFBOztRQUNFLElBQWdCLElBQUksQ0FBQyxHQUFMLEtBQVksR0FBNUI7QUFBQSxpQkFBTyxNQUFQOztBQURGO2FBRUEsQ0FBQyxFQUhIO0tBQUEsTUFBQTtNQUtFLEtBQUEsR0FBUSxRQUFBLENBQVMsR0FBVCxFQUFjLEVBQWQ7TUFDUixJQUFHLEtBQUEsQ0FBTSxLQUFOLENBQUEsSUFBZ0IsS0FBQSxHQUFRLENBQXhCLElBQTZCLEtBQUEsR0FBUSxJQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFqQixHQUEwQixDQUFsRTtlQUNFLENBQUMsRUFESDtPQUFBLE1BQUE7ZUFHRSxNQUhGO09BTkY7O0VBRGlCLENBbEZuQjtFQThGQSxZQUFBLEVBQWMsU0FBQTtXQUNaLElBQUMsQ0FBQSxRQUFELENBQ0U7TUFBQSxjQUFBLEVBQWdCLElBQWhCO01BQ0EsY0FBQSxFQUFnQixJQURoQjtNQUVBLFlBQUEsRUFBYyxJQUZkO01BR0EsY0FBQSxFQUFnQixJQUhoQjtLQURGO0VBRFksQ0E5RmQ7RUFxR0EsYUFBQSxFQUFlLFNBQUE7SUFDYixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBVjthQUNHLG9CQUFBLENBQXFCO1FBQUMsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBaEI7UUFBd0IsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBdkM7UUFBdUQsS0FBQSxFQUFPLElBQUMsQ0FBQSxZQUEvRDtPQUFyQixFQURIO0tBQUEsTUFFSyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBVjthQUNGLGNBQUEsQ0FBZTtRQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFqQztRQUEyQyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBM0U7UUFBcUYsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQXBIO1FBQTZILEtBQUEsRUFBTyxJQUFDLENBQUEsWUFBckk7T0FBZixFQURFO0tBQUEsTUFFQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBVjthQUNGLFlBQUEsQ0FBYTtRQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUEvQjtRQUF5QyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBdkU7UUFBaUYsS0FBQSxFQUFPLElBQUMsQ0FBQSxZQUF6RjtPQUFiLEVBREU7S0FBQSxNQUVBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFWO2FBQ0YsY0FBQSxDQUFlO1FBQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQTVCO1FBQWlDLEtBQUEsRUFBTyxJQUFDLENBQUEsWUFBekM7T0FBZixFQURFOztFQVBRLENBckdmO0VBK0dBLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFdBQVY7YUFDRyxHQUFBLENBQUk7UUFBQyxTQUFBLEVBQVcsS0FBWjtPQUFKLEVBQ0UsT0FBQSxDQUFRO1FBQUMsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBaEI7UUFBd0IsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBekM7UUFBbUQsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBcEU7UUFBOEUsVUFBQSxFQUFZLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBakc7UUFBNkcsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsU0FBM0g7UUFBc0ksT0FBQSxFQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBdEo7T0FBUixDQURGLEVBRUUsUUFBQSxDQUFTO1FBQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtPQUFULENBRkYsRUFHQyxJQUFDLENBQUEsYUFBRCxDQUFBLENBSEQsRUFESDtLQUFBLE1BTUssSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQVAsSUFBeUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFuQzthQUNGLEdBQUEsQ0FBSTtRQUFDLFNBQUEsRUFBVyxLQUFaO09BQUosRUFDQyxJQUFDLENBQUEsYUFBRCxDQUFBLENBREQsRUFERTtLQUFBLE1BQUE7YUFLSCxLQUxHOztFQVBDLENBL0dSO0NBRkk7O0FBK0hOLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3RKakIsSUFBQTs7QUFBQSxjQUFBLEdBQ0U7RUFBQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLFVBQUEsRUFBWSxLQUFaOztFQURlLENBQWpCO0VBR0Esa0JBQUEsRUFBb0IsU0FBQTtXQUNsQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFoQixDQUEyQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsVUFBRDtlQUN6QixLQUFDLENBQUEsUUFBRCxDQUFVO1VBQUEsVUFBQSxFQUFZLFVBQVo7U0FBVjtNQUR5QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBM0I7RUFEa0IsQ0FIcEI7RUFPQSxNQUFBLEVBQVEsU0FBQTtJQUNOLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFWO2FBQ0UsSUFBQyxDQUFBLG9CQUFELENBQUEsRUFERjtLQUFBLE1BQUE7YUFHRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5QkFBaEIsQ0FBQSxFQUhGOztFQURNLENBUFI7OztBQWFGLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ2RqQixJQUFBOztBQUFBLE1BQTBCLEtBQUssQ0FBQyxHQUFoQyxFQUFDLFVBQUEsR0FBRCxFQUFNLFlBQUEsS0FBTixFQUFhLFFBQUEsQ0FBYixFQUFnQixhQUFBOztBQUVoQixXQUFBLEdBQWMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCOztBQUVkLEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBRUwsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxvQkFBYjtFQUVBLGVBQUEsRUFBaUIsU0FBQTtBQUNmLFFBQUE7SUFBQSxRQUFBLEdBQVcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLElBQW1CO1dBQzlCLEtBQUEsR0FDRTtNQUFBLFFBQUEsRUFBVSxRQUFWO01BQ0EsZUFBQSxFQUFpQixJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU4sQ0FEakI7O0VBSGEsQ0FGakI7RUFRQSxpQkFBQSxFQUFtQixTQUFBO0lBQ2pCLElBQUMsQ0FBQSxRQUFELEdBQVksS0FBSyxDQUFDLFdBQU4sQ0FBa0IsSUFBQyxDQUFBLElBQUksQ0FBQyxRQUF4QjtXQUNaLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixDQUFBO0VBRmlCLENBUm5CO0VBWUEsY0FBQSxFQUFnQixTQUFBO0FBQ2QsUUFBQTtJQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsUUFBUSxDQUFDO1dBQ3JCLElBQUMsQ0FBQSxRQUFELENBQ0U7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLGVBQUEsRUFBaUIsSUFBQyxDQUFBLElBQUQsQ0FBTSxRQUFOLENBRGpCO0tBREY7RUFGYyxDQVpoQjtFQWtCQSxJQUFBLEVBQU0sU0FBQyxDQUFEO1dBQ0osQ0FBQyxDQUFDLE9BQUYsQ0FBVSxXQUFWLEVBQXVCLEVBQXZCO0VBREksQ0FsQk47RUFxQkEsUUFBQSxFQUFVLFNBQUMsQ0FBRDtJQUNSLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBdkIsR0FBZ0MsQ0FBbkM7TUFDRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVQsQ0FBc0IsTUFBdEIsRUFBOEIsT0FBQSxHQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZixHQUF3QixHQUF4QixHQUEwQixDQUFDLGtCQUFBLENBQW1CLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQWYsQ0FBQSxDQUFuQixDQUFELENBQXhEO2FBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUEsRUFGRjtLQUFBLE1BQUE7TUFJRSxDQUFDLENBQUMsY0FBRixDQUFBO2FBQ0EsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUEsRUFMRjs7RUFEUSxDQXJCVjtFQTZCQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBUSxFQUFBLENBQUcsa0JBQUgsQ0FBVDtNQUFpQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUEvQztLQUFaLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGlCQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssVUFBTjtNQUFrQixXQUFBLEVBQWEsVUFBL0I7TUFBMkMsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBekQ7TUFBbUUsUUFBQSxFQUFVLElBQUMsQ0FBQSxjQUE5RTtLQUFOLENBREYsRUFFRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtLQUFKLEVBQ0UsQ0FBQSxDQUFFO01BQUMsSUFBQSxFQUFNLEdBQVA7TUFBWSxTQUFBLEVBQVcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUF2QixLQUFpQyxDQUFwQyxHQUEyQyxVQUEzQyxHQUEyRCxFQUE1RCxDQUF2QjtNQUF3RixRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUF6RztNQUEwSCxPQUFBLEVBQVMsSUFBQyxDQUFBLFFBQXBJO0tBQUYsRUFBaUosRUFBQSxDQUFHLDJCQUFILENBQWpKLENBREYsRUFFRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFqQjtLQUFQLEVBQWdDLEVBQUEsQ0FBRyx5QkFBSCxDQUFoQyxDQUZGLENBRkYsQ0FERjtFQURLLENBN0JSO0NBRmU7Ozs7O0FDTmpCLElBQUE7O0FBQUEsTUFBdUMsS0FBSyxDQUFDLEdBQTdDLEVBQUMsVUFBQSxHQUFELEVBQU0sUUFBQSxDQUFOLEVBQVMsV0FBQSxJQUFULEVBQWUsU0FBQSxFQUFmLEVBQW1CLFNBQUEsRUFBbkIsRUFBdUIsVUFBQSxHQUF2QixFQUE0QixRQUFBLENBQTVCLEVBQStCLFdBQUE7O0FBRS9CLFlBQUEsR0FBZSxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUVqQztFQUFBLFdBQUEsRUFBYSxjQUFiO0VBRUEsT0FBQSxFQUFTLFNBQUE7V0FDUCxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBYyxJQUFDLENBQUEsS0FBSyxDQUFDLElBQXJCO0VBRE8sQ0FGVDtFQUtBLFVBQUEsRUFBWSxTQUFBO0FBQ1YsUUFBQTtJQUFBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZjtNQUNFLFFBQUEsR0FBVyxDQUFBLENBQUUsS0FBSyxDQUFDLFdBQU4sQ0FBa0IsSUFBQyxDQUFBLElBQUksQ0FBQyxJQUF4QixDQUFGO01BQ1gsSUFBQSxHQUFPLFFBQVEsQ0FBQyxNQUFULENBQUEsQ0FBaUIsQ0FBQyxNQUFsQixDQUFBO2FBRVAsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFQLENBQ0U7UUFBQSxLQUFBLEVBQ0U7VUFBQSxRQUFBLEVBQVUsVUFBVjtVQUNBLElBQUEsRUFBTSxJQUFJLENBQUMsS0FBTCxDQUFBLENBRE47VUFFQSxHQUFBLEVBQUssUUFBUSxDQUFDLFFBQVQsQ0FBQSxDQUFtQixDQUFDLEdBQXBCLEdBQTBCLFFBQUEsQ0FBUyxRQUFRLENBQUMsR0FBVCxDQUFhLGFBQWIsQ0FBVCxDQUYvQjtTQURGO1FBSUEsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBSm5CO09BREYsRUFKRjtLQUFBLE1BQUE7d0VBV1EsQ0FBQyxXQUFZLGVBWHJCOztFQURVLENBTFo7RUFtQkEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsT0FBQSxHQUFhLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQVosQ0FBMkIsU0FBM0IsQ0FBSCxHQUNMLE9BQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBbkIsS0FBOEIsVUFBakMsR0FDRSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFaLENBQUEsQ0FERixHQUdFLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BSk4sR0FNUjtJQUVGLE9BQUEsR0FBVSxDQUFDLFVBQUQ7SUFDVixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWY7TUFDRSxPQUFPLENBQUMsSUFBUixDQUFhLFdBQWI7YUFDQyxFQUFBLENBQUc7UUFBQyxTQUFBLEVBQVcsT0FBTyxDQUFDLElBQVIsQ0FBYSxHQUFiLENBQVo7T0FBSCxFQUFtQyxFQUFuQyxFQUZIO0tBQUEsTUFBQTtNQUlFLElBQTJCLENBQUksT0FBSixJQUFlLENBQUksQ0FBQyxJQUFDLENBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFaLElBQXNCLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQW5DLENBQTlDO1FBQUEsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQUE7O01BQ0EsSUFBQSxHQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVosSUFBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQzthQUNqQyxFQUFBLENBQUc7UUFBQyxHQUFBLEVBQUssTUFBTjtRQUFjLFNBQUEsRUFBVyxPQUFPLENBQUMsSUFBUixDQUFhLEdBQWIsQ0FBekI7UUFBNEMsT0FBQSxFQUFTLElBQUMsQ0FBQSxPQUF0RDtRQUErRCxZQUFBLEVBQWMsSUFBQyxDQUFBLFVBQTlFO09BQUgsRUFDQyxJQURELEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBZixHQUNHLENBQUEsQ0FBRTtRQUFDLFNBQUEsRUFBVyw4QkFBWjtPQUFGLENBREgsR0FBQSxNQUZELEVBTkg7O0VBVk0sQ0FuQlI7Q0FGaUMsQ0FBcEI7O0FBMkNmLFFBQUEsR0FBVyxLQUFLLENBQUMsV0FBTixDQUVUO0VBQUEsV0FBQSxFQUFhLFVBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLFdBQUEsRUFBYSxLQUFiO01BQ0EsT0FBQSxFQUFTLElBRFQ7TUFFQSxPQUFBLEVBQVMsSUFGVDs7RUFEZSxDQUZqQjtFQU9BLElBQUEsRUFBTSxTQUFBO0FBQ0osUUFBQTtJQUFBLElBQUMsQ0FBQSxNQUFELENBQUE7SUFDQSxPQUFBLEdBQVUsVUFBQSxDQUFXLENBQUUsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQUcsS0FBQyxDQUFBLFFBQUQsQ0FBVTtVQUFDLFdBQUEsRUFBYSxLQUFkO1VBQXFCLE9BQUEsRUFBUyxLQUE5QjtTQUFWO01BQUg7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUYsQ0FBWCxFQUFrRSxHQUFsRTtXQUNWLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQyxPQUFBLEVBQVMsT0FBVjtLQUFWO0VBSEksQ0FQTjtFQVlBLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQVY7TUFDRSxZQUFBLENBQWEsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFwQixFQURGOztXQUVBLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQyxPQUFBLEVBQVMsSUFBVjtLQUFWO0VBSE0sQ0FaUjtFQWlCQSxVQUFBLEVBQVksU0FBQyxPQUFEO1dBQ1YsSUFBQyxDQUFBLFFBQUQsQ0FBVTtNQUFBLE9BQUEsRUFBUyxPQUFUO0tBQVY7RUFEVSxDQWpCWjtFQW9CQSxNQUFBLEVBQVEsU0FBQyxJQUFEO0FBQ04sUUFBQTtJQUFBLG1CQUFVLElBQUksQ0FBRSxjQUFoQjtBQUFBLGFBQUE7O0lBQ0EsU0FBQSxHQUFhLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQztJQUN4QixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUMsV0FBQSxFQUFhLFNBQWQ7S0FBVjtJQUNBLElBQUEsQ0FBYyxJQUFkO0FBQUEsYUFBQTs7K0NBQ0EsSUFBSSxDQUFDO0VBTEMsQ0FwQlI7RUEyQkEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsU0FBQSxHQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBVixHQUEyQixjQUEzQixHQUErQztJQUMzRCxNQUFBLEdBQVMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLElBQUQ7ZUFDTCxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxNQUFELENBQVEsSUFBUjtRQUFIO01BREs7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1dBRVIsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLE1BQVo7S0FBSixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxhQUFaO01BQTJCLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLE1BQUQsQ0FBUSxJQUFSO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBDO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxPQUFBLEVBQVMsS0FBVjtNQUFpQixLQUFBLEVBQU8sRUFBeEI7TUFBNEIsTUFBQSxFQUFRLEVBQXBDO01BQXdDLE9BQUEsRUFBUyxXQUFqRDtNQUE4RCxnQkFBQSxFQUFrQixlQUFoRjtLQUFKLEVBQ0UsQ0FBQSxDQUFFLEVBQUYsRUFDRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsQ0FBSjtNQUFPLEtBQUEsRUFBTyxFQUFkO01BQWtCLE1BQUEsRUFBUSxDQUExQjtLQUFMLENBREYsRUFFRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsQ0FBSjtNQUFPLEtBQUEsRUFBTyxFQUFkO01BQWtCLE1BQUEsRUFBUSxDQUExQjtLQUFMLENBRkYsRUFHRSxJQUFBLENBQUs7TUFBQyxDQUFBLEVBQUcsRUFBSjtNQUFRLEtBQUEsRUFBTyxFQUFmO01BQW1CLE1BQUEsRUFBUSxDQUEzQjtLQUFMLENBSEYsQ0FERixDQURGLENBREYsMkNBVWdCLENBQUUsZ0JBQWQsR0FBdUIsQ0FBMUIsR0FDRyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtNQUF1QixZQUFBLEVBQWMsSUFBQyxDQUFBLElBQXRDO01BQTRDLFlBQUEsRUFBYyxJQUFDLENBQUEsTUFBM0Q7S0FBSixFQUNFLEVBQUEsQ0FBRyxFQUFIOztBQUNDO0FBQUE7V0FBQSxzREFBQTs7cUJBQUMsWUFBQSxDQUFhO1VBQUMsR0FBQSxFQUFLLEtBQU47VUFBYSxJQUFBLEVBQU0sSUFBbkI7VUFBeUIsTUFBQSxFQUFRLElBQUMsQ0FBQSxNQUFsQztVQUEwQyxVQUFBLEVBQVksSUFBQyxDQUFBLFVBQXZEO1NBQWI7QUFBRDs7aUJBREQsQ0FERixFQUlJLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBVixHQUNHLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO01BQXVCLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUE3QztLQUFKLEVBQ0UsRUFBQSxDQUFHLEVBQUg7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFBQyxZQUFBLENBQWE7VUFBQyxHQUFBLEVBQUssS0FBTjtVQUFhLElBQUEsRUFBTSxJQUFuQjtVQUF5QixNQUFBLEVBQVEsSUFBQyxDQUFBLE1BQWxDO1NBQWI7QUFBRDs7aUJBREQsQ0FERixDQURILEdBQUEsTUFKRCxDQURILEdBQUEsTUFWRDtFQUpLLENBM0JSO0NBRlM7O0FBeURYLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3RHakIsSUFBQTs7QUFBQSxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxtQkFBUjs7QUFDakIsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxpQ0FBUixDQUFELENBQTJDLENBQUM7O0FBRTVELEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBRUwsTUFBcUMsS0FBSyxDQUFDLEdBQTNDLEVBQUMsVUFBQSxHQUFELEVBQU0sVUFBQSxHQUFOLEVBQVcsUUFBQSxDQUFYLEVBQWMsV0FBQSxJQUFkLEVBQW9CLFlBQUEsS0FBcEIsRUFBMkIsYUFBQTs7QUFFM0IsWUFBQSxHQUFlLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ2pDO0VBQUEsV0FBQSxFQUFhLGNBQWI7RUFFQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxTQUFELEdBQWE7RUFESyxDQUZwQjtFQUtBLFlBQUEsRUFBZSxTQUFDLENBQUQ7QUFDYixRQUFBO0lBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtJQUNBLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFDQSxHQUFBLEdBQU0sQ0FBSyxJQUFBLElBQUEsQ0FBQSxDQUFMLENBQVksQ0FBQyxPQUFiLENBQUE7SUFDTixJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsQ0FBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUEzQjtJQUNBLElBQUcsR0FBQSxHQUFNLElBQUMsQ0FBQSxTQUFQLElBQW9CLEdBQXZCO01BQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFQLENBQUEsRUFERjs7V0FFQSxJQUFDLENBQUEsU0FBRCxHQUFhO0VBUEEsQ0FMZjtFQWNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVYsR0FBd0IsVUFBeEIsR0FBd0MsRUFBekMsQ0FBN0I7TUFBMkUsT0FBQSxFQUFTLElBQUMsQ0FBQSxZQUFyRjtLQUFKLEVBQ0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFWLENBQVk7TUFBQyxTQUFBLEVBQWMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsYUFBYSxDQUFDLE1BQXpDLEdBQXFELDhCQUFyRCxHQUF5RixlQUFyRztLQUFaLENBREYsRUFFQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUZqQjtFQURLLENBZFI7Q0FEaUMsQ0FBcEI7O0FBcUJmLFFBQUEsR0FBVyxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUM3QjtFQUFBLFdBQUEsRUFBYSxVQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxPQUFBLEVBQVMsSUFBVDs7RUFEZSxDQUZqQjtFQUtBLGlCQUFBLEVBQW1CLFNBQUE7V0FDakIsSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWI7RUFEaUIsQ0FMbkI7RUFRQSx5QkFBQSxFQUEyQixTQUFDLFNBQUQ7SUFDekIsSUFBRyxTQUFTLENBQUMsTUFBVixLQUFzQixJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWhDO2FBQ0UsSUFBQyxDQUFBLElBQUQsQ0FBTSxTQUFTLENBQUMsTUFBaEIsRUFERjs7RUFEeUIsQ0FSM0I7RUFZQSxJQUFBLEVBQU0sU0FBQyxNQUFEO1dBQ0osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsQ0FBcUIsTUFBckIsRUFBNkIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO1FBQzNCLElBQXFCLEdBQXJCO0FBQUEsaUJBQU8sS0FBQSxDQUFNLEdBQU4sRUFBUDs7UUFDQSxLQUFDLENBQUEsUUFBRCxDQUNFO1VBQUEsT0FBQSxFQUFTLEtBQVQ7U0FERjtlQUVBLEtBQUMsQ0FBQSxLQUFLLENBQUMsVUFBUCxDQUFrQixJQUFsQjtNQUoyQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBN0I7RUFESSxDQVpOO0VBbUJBLGNBQUEsRUFBZ0IsU0FBQyxDQUFEO0FBQ2QsUUFBQTtXQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCwwQ0FBaUMsQ0FBRSxlQUFuQztFQURjLENBbkJoQjtFQXNCQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxJQUFBLEdBQU87SUFDUCxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBUCxLQUFtQixJQUF0QjtNQUNFLElBQUksQ0FBQyxJQUFMLENBQVcsR0FBQSxDQUFJO1FBQUMsR0FBQSxFQUFLLFFBQU47UUFBZ0IsT0FBQSxFQUFTLElBQUMsQ0FBQSxjQUExQjtPQUFKLEVBQWdELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBVixDQUFZO1FBQUMsU0FBQSxFQUFXLDRCQUFaO09BQVosQ0FBaEQsRUFBd0csZUFBeEcsQ0FBWCxFQURGOztBQUVBO0FBQUEsU0FBQSw4Q0FBQTs7TUFDRSxJQUFJLENBQUMsSUFBTCxDQUFXLFlBQUEsQ0FBYTtRQUFDLEdBQUEsRUFBSyxDQUFOO1FBQVMsUUFBQSxFQUFVLFFBQW5CO1FBQTZCLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVAsS0FBdUIsUUFBOUQ7UUFBd0UsWUFBQSxFQUFjLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBN0Y7UUFBMkcsYUFBQSxFQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsYUFBakk7T0FBYixDQUFYO0FBREY7V0FHQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFWLEdBQ0UsRUFBQSxDQUFHLHNCQUFILENBREYsR0FHRSxJQUpIO0VBUEssQ0F0QlI7Q0FENkIsQ0FBcEI7O0FBcUNYLGFBQUEsR0FBZ0IsS0FBSyxDQUFDLFdBQU4sQ0FDZDtFQUFBLFdBQUEsRUFBYSxlQUFiO0VBRUEsTUFBQSxFQUFRLENBQUMsY0FBRCxDQUZSO0VBSUEsZUFBQSxFQUFpQixTQUFBO0FBQ2YsUUFBQTtXQUFBLElBQUMsQ0FBQSxpQkFBRCwwREFBK0MsQ0FBRSxnQkFBOUIsSUFBd0MsSUFBM0Q7RUFEZSxDQUpqQjtFQU9BLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFkLEtBQXdCO0VBRGhCLENBUHBCO0VBVUEsZUFBQSxFQUFpQixTQUFDLENBQUQ7QUFDZixRQUFBO0lBQUEsUUFBQSxHQUFXLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDcEIsUUFBQSxHQUFXLElBQUMsQ0FBQSxZQUFELENBQWMsUUFBZCxFQUF3QixJQUFDLENBQUEsS0FBSyxDQUFDLElBQS9CO1dBQ1gsSUFBQyxDQUFBLFFBQUQsQ0FDRTtNQUFBLFFBQUEsRUFBVSxRQUFWO01BQ0EsUUFBQSxFQUFVLFFBRFY7S0FERjtFQUhlLENBVmpCO0VBaUJBLFVBQUEsRUFBWSxTQUFDLElBQUQ7V0FDVixJQUFDLENBQUEsUUFBRCxDQUNFO01BQUEsSUFBQSxFQUFNLElBQU47TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFlBQUQsQ0FBYyxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZCxDQUFkLEVBQXVDLElBQXZDLENBRFY7S0FERjtFQURVLENBakJaO0VBc0JBLGlCQUFBLEVBQW1CLFNBQUMsTUFBRDtBQUNqQixRQUFBO1dBQUE7TUFBQSxNQUFBLEVBQVEsTUFBUjtNQUNBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFEOUI7TUFFQSxRQUFBLDJEQUFzQyxDQUFFLGNBQTlCLElBQXNDLEVBRmhEO01BR0EsSUFBQSxFQUFNLEVBSE47O0VBRGlCLENBdEJuQjtFQTRCQSxZQUFBLEVBQWMsU0FBQyxRQUFEO0lBQ1osd0JBQUcsUUFBUSxDQUFFLGNBQVYsS0FBa0IsYUFBYSxDQUFDLE1BQW5DO2FBQ0UsSUFBQyxDQUFBLFFBQUQsQ0FBVSxJQUFDLENBQUEsaUJBQUQsQ0FBbUIsUUFBbkIsQ0FBVixFQURGO0tBQUEsTUFFSyx3QkFBRyxRQUFRLENBQUUsY0FBVixLQUFrQixhQUFhLENBQUMsSUFBbkM7YUFDSCxJQUFDLENBQUEsUUFBRCxDQUNFO1FBQUEsUUFBQSxFQUFVLFFBQVEsQ0FBQyxJQUFuQjtRQUNBLFFBQUEsRUFBVSxRQURWO09BREYsRUFERztLQUFBLE1BQUE7YUFLSCxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUMsQ0FBQSxpQkFBRCxDQUFtQixJQUFuQixDQUFWLEVBTEc7O0VBSE8sQ0E1QmQ7RUFzQ0EsT0FBQSxFQUFTLFNBQUE7QUFDUCxRQUFBO0lBQUEsSUFBRyxDQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZDtNQUNFLFFBQUEsR0FBVyxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBZDtNQUNYLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxHQUFrQixJQUFDLENBQUEsWUFBRCxDQUFjLFFBQWQsRUFBd0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUEvQjtNQUNsQixJQUFHLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFkO1FBQ0UsSUFBRyxJQUFDLENBQUEsTUFBSjtVQUNFLEtBQUEsQ0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVIsR0FBaUIsWUFBekIsRUFERjtTQUFBLE1BQUE7VUFHRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsR0FBc0IsSUFBQSxhQUFBLENBQ3BCO1lBQUEsSUFBQSxFQUFNLFFBQU47WUFDQSxJQUFBLEVBQU0sYUFBYSxDQUFDLElBRHBCO1lBRUEsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBUCxJQUFpQixJQUZ6QjtZQUdBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBSGpCO1dBRG9CLEVBSHhCO1NBREY7T0FIRjs7SUFZQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBVjtNQUVFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQWhCLEdBQTJCLElBQUMsQ0FBQSxLQUFLLENBQUM7O1lBQ3JCLENBQUMsU0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDOzthQUMvQixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsQ0FBQSxFQUpGOztFQWJPLENBdENUO0VBeURBLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsSUFBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBMEIsYUFBYSxDQUFDLE1BQTVELElBQXVFLE9BQUEsQ0FBUSxFQUFBLENBQUcsNkJBQUgsRUFBa0M7TUFBQyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBM0I7S0FBbEMsQ0FBUixDQUExRTthQUNFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWhCLENBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBOUIsRUFBd0MsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQ7QUFDdEMsY0FBQTtVQUFBLElBQUcsQ0FBSSxHQUFQO1lBQ0UsSUFBQSxHQUFPLEtBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVosQ0FBa0IsQ0FBbEI7WUFDUCxLQUFBLEdBQVEsSUFBSSxDQUFDLE9BQUwsQ0FBYSxLQUFDLENBQUEsS0FBSyxDQUFDLFFBQXBCO1lBQ1IsSUFBSSxDQUFDLE1BQUwsQ0FBWSxLQUFaLEVBQW1CLENBQW5CO21CQUNBLEtBQUMsQ0FBQSxRQUFELENBQ0U7Y0FBQSxJQUFBLEVBQU0sSUFBTjtjQUNBLFFBQUEsRUFBVSxJQURWO2NBRUEsUUFBQSxFQUFVLEVBRlY7YUFERixFQUpGOztRQURzQztNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEMsRUFERjs7RUFETSxDQXpEUjtFQXFFQSxNQUFBLEVBQVEsU0FBQTtXQUNOLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxDQUFBO0VBRE0sQ0FyRVI7RUF3RUEsWUFBQSxFQUFjLFNBQUMsUUFBRCxFQUFXLElBQVg7QUFDWixRQUFBO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQWlCLFFBQXBCO0FBQ0UsZUFBTyxTQURUOztBQURGO1dBR0E7RUFKWSxDQXhFZDtFQThFQSxhQUFBLEVBQWUsU0FBQyxDQUFEO0lBQ2IsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWIsSUFBb0IsQ0FBSSxJQUFDLENBQUEsZUFBRCxDQUFBLENBQTNCO2FBQ0UsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQURGOztFQURhLENBOUVmO0VBa0ZBLGVBQUEsRUFBaUIsU0FBQTtXQUNmLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsS0FBMEIsQ0FBM0IsQ0FBQSxJQUFpQyxDQUFDLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhCO0VBRGxCLENBbEZqQjtFQXFGQSxvQkFBQSxFQUFzQixTQUFBO0FBQ3BCLFFBQUE7SUFBQSxlQUFBLEdBQWtCLElBQUMsQ0FBQSxlQUFELENBQUE7SUFDbEIsY0FBQSxHQUFpQixDQUFDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxLQUFtQixJQUFwQixDQUFBLElBQTZCLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsYUFBYSxDQUFDLE1BQXZDO1dBRTdDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxXQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxJQUFBLEVBQU0sTUFBUDtNQUFlLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQTdCO01BQXVDLFdBQUEsRUFBYyxFQUFBLENBQUcsdUJBQUgsQ0FBckQ7TUFBa0YsUUFBQSxFQUFVLElBQUMsQ0FBQSxlQUE3RjtNQUE4RyxTQUFBLEVBQVcsSUFBQyxDQUFBLGFBQTFIO0tBQU4sQ0FERixFQUVFLFFBQUEsQ0FBUztNQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWxCO01BQTRCLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQTNDO01BQW1ELFlBQUEsRUFBYyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhFO01BQWtGLFlBQUEsRUFBYyxJQUFDLENBQUEsWUFBakc7TUFBK0csYUFBQSxFQUFlLElBQUMsQ0FBQSxPQUEvSDtNQUF3SSxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFySjtNQUEySixVQUFBLEVBQVksSUFBQyxDQUFBLFVBQXhLO0tBQVQsQ0FGRixFQUdFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQUosRUFDRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE9BQVg7TUFBb0IsUUFBQSxFQUFVLGVBQTlCO01BQStDLFNBQUEsRUFBYyxlQUFILEdBQXdCLFVBQXhCLEdBQXdDLEVBQWxHO0tBQVAsRUFBaUgsSUFBQyxDQUFBLE1BQUosR0FBaUIsRUFBQSxDQUFHLG1CQUFILENBQWpCLEdBQStDLEVBQUEsQ0FBRyxtQkFBSCxDQUE3SixDQURGLEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBaEIsQ0FBb0IsUUFBcEIsQ0FBSCxHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsTUFBWDtNQUFtQixRQUFBLEVBQVUsY0FBN0I7TUFBNkMsU0FBQSxFQUFjLGNBQUgsR0FBdUIsVUFBdkIsR0FBdUMsRUFBL0Y7S0FBUCxFQUE0RyxFQUFBLENBQUcscUJBQUgsQ0FBNUcsQ0FESCxHQUFBLE1BRkQsRUFJRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE1BQVg7S0FBUCxFQUE0QixFQUFBLENBQUcscUJBQUgsQ0FBNUIsQ0FKRixDQUhGO0VBSm1CLENBckZ0QjtDQURjOztBQXFHaEIsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDdEtqQixJQUFBOztBQUFBLE1BQXdCLEtBQUssQ0FBQyxHQUE5QixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUEsQ0FBTixFQUFTLFdBQUEsSUFBVCxFQUFlLFlBQUE7O0FBRWYsUUFBQSxHQUFXLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxpQkFBUixDQUFwQjs7QUFFWCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLFNBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLGVBQUEsRUFBaUIsS0FBakI7TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQURqQjs7RUFEZSxDQUZqQjtFQU1BLHlCQUFBLEVBQTJCLFNBQUMsU0FBRDtXQUN6QixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLFNBQVMsQ0FBQyxRQUFwQjtLQUFWO0VBRHlCLENBTjNCO0VBU0EsZUFBQSxFQUFpQixTQUFDLENBQUQ7QUFDZixRQUFBO0lBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtJQUNBLENBQUMsQ0FBQyxlQUFGLENBQUE7SUFDQSxHQUFBLEdBQU0sQ0FBSyxJQUFBLElBQUEsQ0FBQSxDQUFMLENBQVksQ0FBQyxPQUFiLENBQUE7SUFDTixJQUFHLEdBQUEsR0FBTSxJQUFDLENBQUEsU0FBUCxJQUFvQixHQUF2QjtNQUNFLDZGQUF5QyxDQUFFLEdBQXhDLENBQTRDLFFBQTVDLG1CQUFIO1FBQ0UsSUFBQyxDQUFBLFFBQUQsQ0FBVTtVQUFBLGVBQUEsRUFBaUIsSUFBakI7U0FBVjtRQUNBLFVBQUEsQ0FBVyxDQUFDLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUE7bUJBQUcsS0FBQyxDQUFBLGFBQUQsQ0FBQTtVQUFIO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFELENBQVgsRUFBa0MsRUFBbEMsRUFGRjtPQUFBLE1BQUE7UUFJRSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFkLENBQUEsRUFKRjtPQURGOztXQU1BLElBQUMsQ0FBQSxTQUFELEdBQWE7RUFWRSxDQVRqQjtFQXFCQSxlQUFBLEVBQWlCLFNBQUE7V0FDZixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLElBQUMsQ0FBQSxRQUFELENBQUEsQ0FBVyxDQUFDLEtBQXRCO0tBQVY7RUFEZSxDQXJCakI7RUF3QkEsZUFBQSxFQUFpQixTQUFBO1dBQ2YsSUFBQyxDQUFBLE1BQUQsQ0FBQTtFQURlLENBeEJqQjtFQTJCQSxRQUFBLEVBQVUsU0FBQTtXQUNSLEtBQUssQ0FBQyxXQUFOLENBQWtCLElBQUMsQ0FBQSxJQUFJLENBQUMsUUFBeEI7RUFEUSxDQTNCVjtFQThCQSxhQUFBLEVBQWUsU0FBQTtBQUNiLFFBQUE7SUFBQSxFQUFBLEdBQUssSUFBQyxDQUFBLFFBQUQsQ0FBQTtJQUNMLEVBQUUsQ0FBQyxLQUFILENBQUE7SUFDQSxJQUFHLE9BQU8sRUFBRSxDQUFDLGNBQVYsS0FBNEIsUUFBL0I7YUFDRSxFQUFFLENBQUMsY0FBSCxHQUFvQixFQUFFLENBQUMsWUFBSCxHQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDLE9BRGpEO0tBQUEsTUFFSyxJQUFHLE9BQU8sRUFBRSxDQUFDLGVBQVYsS0FBK0IsV0FBbEM7TUFDSCxLQUFBLEdBQVEsRUFBRSxDQUFDLGVBQUgsQ0FBQTtNQUNSLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBZjthQUNBLEtBQUssQ0FBQyxNQUFOLENBQUEsRUFIRzs7RUFMUSxDQTlCZjtFQXdDQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxRQUFBLEdBQVcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBaEIsQ0FBd0IsV0FBeEIsRUFBcUMsRUFBckM7SUFDWCxJQUFHLFFBQVEsQ0FBQyxNQUFULEdBQWtCLENBQXJCO01BQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBZCxDQUFxQixJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBekMsRUFBbUQsUUFBbkQsRUFERjs7V0FFQSxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsZUFBQSxFQUFpQixLQUFqQjtLQUFWO0VBSk0sQ0F4Q1I7RUE4Q0EsYUFBQSxFQUFlLFNBQUMsQ0FBRDtJQUNiLElBQUcsQ0FBQyxDQUFDLE9BQUYsS0FBYSxFQUFoQjthQUNFLElBQUMsQ0FBQSxNQUFELENBQUEsRUFERjtLQUFBLE1BRUssSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO2FBQ0gsSUFBQyxDQUFBLFFBQUQsQ0FDRTtRQUFBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWpCO1FBQ0EsZUFBQSxFQUFpQixLQURqQjtPQURGLEVBREc7O0VBSFEsQ0E5Q2Y7RUFzREEsSUFBQSxFQUFNLFNBQUE7V0FDSixNQUFNLENBQUMsSUFBUCxDQUFZLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQTNCLEVBQWlDLFFBQWpDO0VBREksQ0F0RE47RUF5REEsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUNFLFFBQUEsQ0FBUztNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7S0FBVCxDQURGLEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxlQUFWLEdBQ0csR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFVLDJCQUFYO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssVUFBTjtNQUFrQixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFoQztNQUEwQyxRQUFBLEVBQVUsSUFBQyxDQUFBLGVBQXJEO01BQXNFLE1BQUEsRUFBUSxJQUFDLENBQUEsZUFBL0U7TUFBZ0csU0FBQSxFQUFXLElBQUMsQ0FBQSxhQUE1RztLQUFOLENBREYsQ0FESCxHQUtHLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVSwyQkFBWDtNQUF3QyxPQUFBLEVBQVMsSUFBQyxDQUFBLGVBQWxEO0tBQUosRUFBd0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUEvRSxDQVBKLEVBUUksSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFWLEdBQ0csSUFBQSxDQUFLO01BQUMsU0FBQSxFQUFXLHVCQUFBLEdBQXdCLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQXREO0tBQUwsRUFBb0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBdEYsQ0FESCxHQUFBLE1BUkQsQ0FERixFQVlFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxnQkFBWjtLQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBbEIsR0FDRyxJQUFBLENBQUs7TUFBQyxTQUFBLEVBQVcsZUFBWjtLQUFMLEVBQW1DLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQWxELENBREgsR0FBQSxNQURELEVBR0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLElBQW9CLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQWhCLENBQUEsQ0FBdkIsR0FDRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFoQixDQUFBLENBREYsR0FBQSxNQUhELEVBS0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBbEIsR0FDRyxDQUFBLENBQUU7TUFBQyxLQUFBLEVBQU87UUFBQyxRQUFBLEVBQVUsTUFBWDtPQUFSO01BQTRCLFNBQUEsRUFBVyxxQkFBdkM7TUFBOEQsT0FBQSxFQUFTLElBQUMsQ0FBQSxJQUF4RTtLQUFGLENBREgsR0FBQSxNQUxELENBWkY7RUFESyxDQXpEUjtDQUZlOzs7OztBQ0pqQixJQUFBOztBQUFBLEtBQUEsR0FBUSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsY0FBUixDQUFwQjs7QUFDUixNQUFXLEtBQUssQ0FBQyxHQUFqQixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUE7O0FBRU4sTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxhQUFiO0VBRUEsS0FBQSxFQUFPLFNBQUE7QUFDTCxRQUFBO2lFQUFNLENBQUM7RUFERixDQUZQO0VBS0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxLQUFBLENBQU07TUFBQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFmO0tBQU4sRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsY0FBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHNCQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsb0JBQVo7S0FBSixFQUNFLENBQUEsQ0FBRTtNQUFDLFNBQUEsRUFBVyxrQ0FBWjtNQUFnRCxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQTFEO0tBQUYsQ0FERixFQUVDLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxJQUFnQixpQkFGakIsQ0FERixFQUtFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx3QkFBWjtLQUFKLEVBQTJDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBbEQsQ0FMRixDQURGLENBREY7RUFESyxDQUxSO0NBRmU7Ozs7O0FDSGpCLElBQUE7O0FBQUEsV0FBQSxHQUFjLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxxQkFBUixDQUFwQjs7QUFDZCxXQUFBLEdBQWMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCOztBQUVkLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsdUJBQWI7RUFFQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7TUFBc0IsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBcEM7S0FBWixFQUNFLFdBQUEsQ0FBWTtNQUFDLElBQUEsRUFBTSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQWQ7TUFBb0IsZ0JBQUEsRUFBa0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBN0M7S0FBWixDQURGO0VBREssQ0FGUjtDQUZlOzs7OztBQ0hqQixJQUFBOztBQUFDLE1BQU8sS0FBSyxDQUFDLElBQWI7O0FBRUQsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxPQUFiO0VBRUEsY0FBQSxFQUFnQixTQUFDLENBQUQ7QUFDZCxRQUFBO0lBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO21FQUNRLENBQUMsaUJBRFQ7O0VBRGMsQ0FGaEI7RUFNQSxpQkFBQSxFQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixJQUFDLENBQUEsY0FBdkI7RUFEaUIsQ0FObkI7RUFTQSxvQkFBQSxFQUFzQixTQUFBO1dBQ3BCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxHQUFWLENBQWMsT0FBZCxFQUF1QixJQUFDLENBQUEsY0FBeEI7RUFEb0IsQ0FUdEI7RUFZQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxPQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsa0JBQVo7S0FBSixDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUFrQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpDLENBRkY7RUFESyxDQVpSO0NBRmU7Ozs7O0FDRmpCLElBQUE7O0FBQUEsaUJBQUEsR0FBb0IsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLDRCQUFSLENBQXBCOztBQUNwQixXQUFBLEdBQWMsT0FBQSxDQUFRLHFCQUFSOztBQUNkLGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsaUNBQVIsQ0FBRCxDQUEyQyxDQUFDOztBQUM1RCxhQUFBLEdBQWdCLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSx3QkFBUixDQUFwQjs7QUFDaEIsdUJBQUEsR0FBMEIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLG1DQUFSLENBQXBCOztBQUUxQixFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBQ2Y7RUFBQSxXQUFBLEVBQWEsc0JBQWI7RUFFQSxNQUFBLEVBQVMsU0FBQTtBQUNQLFFBQUE7SUFBQTtBQUE2QixjQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQXJCO0FBQUEsYUFDdEIsVUFEc0I7aUJBQ04sQ0FBQyxNQUFELEVBQVMsYUFBVDtBQURNLGFBRXRCLFVBRnNCO0FBQUEsYUFFVixZQUZVO2lCQUVRLENBQUMsTUFBRCxFQUFTLGFBQVQ7QUFGUixhQUd0QixjQUhzQjtBQUFBLGFBR04sY0FITTtpQkFHYyxDQUFDLE1BQUQsRUFBUyxhQUFUO0FBSGQsYUFJdEIsZ0JBSnNCO2lCQUlBLENBQUMsSUFBRCxFQUFPLHVCQUFQO0FBSkE7aUJBQTdCLEVBQUMsbUJBQUQsRUFBYTtJQU1iLElBQUEsR0FBTztJQUNQLGdCQUFBLEdBQW1CO0FBQ25CO0FBQUEsU0FBQSw4Q0FBQTs7TUFDRSxJQUFHLENBQUksVUFBSixJQUFrQixRQUFRLENBQUMsWUFBYSxDQUFBLFVBQUEsQ0FBM0M7UUFDRSxTQUFBLEdBQVksWUFBQSxDQUNWO1VBQUEsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBZjtVQUNBLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BRGY7VUFFQSxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUZkO1VBR0EsUUFBQSxFQUFVLFFBSFY7U0FEVTtRQUtaLElBQUksQ0FBQyxJQUFMLENBQVUsV0FBVyxDQUFDLEdBQVosQ0FBZ0I7VUFBQyxHQUFBLEVBQUssQ0FBTjtVQUFTLEtBQUEsRUFBUSxFQUFBLENBQUcsUUFBUSxDQUFDLFdBQVosQ0FBakI7VUFBMkMsU0FBQSxFQUFXLFNBQXREO1NBQWhCLENBQVY7UUFDQSxJQUFHLFFBQUEsOERBQXdDLENBQUUsa0JBQTdDO1VBQ0UsZ0JBQUEsR0FBbUIsRUFEckI7U0FQRjs7QUFERjtXQVdDLGlCQUFBLENBQWtCO01BQUMsS0FBQSxFQUFRLEVBQUEsQ0FBRyxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFqQixDQUFUO01BQWtDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWhEO01BQXVELElBQUEsRUFBTSxJQUE3RDtNQUFtRSxnQkFBQSxFQUFrQixnQkFBckY7S0FBbEI7RUFwQk0sQ0FGVDtDQURlOzs7OztBQ1JqQixJQUFBOztBQUFBLE1BQTBCLEtBQUssQ0FBQyxHQUFoQyxFQUFDLFVBQUEsR0FBRCxFQUFNLFlBQUEsS0FBTixFQUFhLFFBQUEsQ0FBYixFQUFnQixhQUFBOztBQUVoQixXQUFBLEdBQWMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCOztBQUVkLEVBQUEsR0FBSyxPQUFBLENBQVEsb0JBQVI7O0FBRUwsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxrQkFBYjtFQUVBLGVBQUEsRUFBaUIsU0FBQTtBQUNmLFFBQUE7SUFBQSxRQUFBLEdBQVcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLElBQW1CO1dBQzlCLEtBQUEsR0FDRTtNQUFBLFFBQUEsRUFBVSxRQUFWO01BQ0EsZUFBQSxFQUFpQixJQUFDLENBQUEsSUFBRCxDQUFNLFFBQU4sQ0FEakI7O0VBSGEsQ0FGakI7RUFRQSxpQkFBQSxFQUFtQixTQUFBO0lBQ2pCLElBQUMsQ0FBQSxRQUFELEdBQVksS0FBSyxDQUFDLFdBQU4sQ0FBa0IsSUFBQyxDQUFBLElBQUksQ0FBQyxRQUF4QjtXQUNaLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixDQUFBO0VBRmlCLENBUm5CO0VBWUEsY0FBQSxFQUFnQixTQUFBO0FBQ2QsUUFBQTtJQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsUUFBUSxDQUFDO1dBQ3JCLElBQUMsQ0FBQSxRQUFELENBQ0U7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLGVBQUEsRUFBaUIsSUFBQyxDQUFBLElBQUQsQ0FBTSxRQUFOLENBRGpCO0tBREY7RUFGYyxDQVpoQjtFQWtCQSxJQUFBLEVBQU0sU0FBQyxDQUFEO1dBQ0osQ0FBQyxDQUFDLE9BQUYsQ0FBVSxXQUFWLEVBQXVCLEVBQXZCO0VBREksQ0FsQk47RUFxQkEsTUFBQSxFQUFRLFNBQUMsQ0FBRDtBQUNOLFFBQUE7SUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQXZCLEdBQWdDLENBQW5DOztZQUNRLENBQUMsU0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDOzthQUN4QixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsQ0FBQSxFQUZGO0tBQUEsTUFBQTtNQUlFLENBQUMsQ0FBQyxjQUFGLENBQUE7YUFDQSxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsQ0FBQSxFQUxGOztFQURNLENBckJSO0VBNkJBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsV0FBQSxDQUFZO01BQUMsS0FBQSxFQUFRLEVBQUEsQ0FBRyxnQkFBSCxDQUFUO01BQStCLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQTdDO0tBQVosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsZUFBWjtLQUFKLEVBQ0UsS0FBQSxDQUFNO01BQUMsR0FBQSxFQUFLLFVBQU47TUFBa0IsV0FBQSxFQUFhLFVBQS9CO01BQTJDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpEO01BQW1FLFFBQUEsRUFBVSxJQUFDLENBQUEsY0FBOUU7S0FBTixDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLFNBQVo7S0FBSixFQUNFLE1BQUEsQ0FBTztNQUFDLFNBQUEsRUFBVyxDQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQXZCLEtBQWlDLENBQXBDLEdBQTJDLFVBQTNDLEdBQTJELEVBQTVELENBQVo7TUFBNkUsT0FBQSxFQUFTLElBQUMsQ0FBQSxNQUF2RjtLQUFQLEVBQXVHLEVBQUEsQ0FBRyx1QkFBSCxDQUF2RyxDQURGLEVBRUUsTUFBQSxDQUFPO01BQUMsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBakI7S0FBUCxFQUFnQyxFQUFBLENBQUcsdUJBQUgsQ0FBaEMsQ0FGRixDQUZGLENBREY7RUFESyxDQTdCUjtDQUZlOzs7OztBQ05qQixJQUFBOztBQUFDLE1BQU8sS0FBSyxDQUFDLElBQWI7O0FBRUQsdUJBQUEsR0FBMEIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FDNUM7RUFBQSxXQUFBLEVBQWEseUJBQWI7RUFDQSxNQUFBLEVBQVEsU0FBQTtXQUFJLEdBQUEsQ0FBSSxFQUFKLEVBQVEsaUNBQUEsR0FBa0MsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBMUQ7RUFBSixDQURSO0NBRDRDLENBQXBCOztBQUkxQixNQUFNLENBQUMsT0FBUCxHQUFpQjs7Ozs7QUNOakIsSUFBQTs7QUFBQSxNQUEwQixLQUFLLENBQUMsR0FBaEMsRUFBQyxVQUFBLEdBQUQsRUFBTSxZQUFBLEtBQU4sRUFBYSxRQUFBLENBQWIsRUFBZ0IsYUFBQTs7QUFFaEIsV0FBQSxHQUFjLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxxQkFBUixDQUFwQjs7QUFFZCxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsb0JBQWI7RUFFQSxpQkFBQSxFQUFtQixTQUFBO0FBQ2pCLFFBQUE7bUVBQTRCLENBQUUsTUFBOUIsQ0FBQTtFQURpQixDQUZuQjtFQUtBLElBQUEsRUFBTSxTQUFBO1dBQ0osTUFBTSxDQUFDLElBQVAsQ0FBWSxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQW5CO0VBREksQ0FMTjtFQVNBLElBQUEsRUFBTSxTQUFBO0FBQ0osUUFBQTtJQUFBLE1BQUEsR0FBUztBQUNUO01BQ0UsSUFBQSxHQUFPLFFBQVEsQ0FBQyxhQUFULENBQXVCLE1BQXZCO01BQ1AsSUFBSSxDQUFDLFNBQUwsR0FBaUIsSUFBQyxDQUFBLEtBQUssQ0FBQztNQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQWQsQ0FBMEIsSUFBMUI7TUFFQSxTQUFBLEdBQVksUUFBUSxDQUFDLFlBQVQsQ0FBQTtNQUNaLFNBQVMsQ0FBQyxlQUFWLENBQUE7TUFFQSxLQUFBLEdBQVEsUUFBUSxDQUFDLFdBQVQsQ0FBQTtNQUNSLEtBQUssQ0FBQyxVQUFOLENBQWlCLElBQWpCO01BQ0EsU0FBUyxDQUFDLFFBQVYsQ0FBbUIsS0FBbkI7YUFFQSxNQUFBLEdBQVMsUUFBUSxDQUFDLFdBQVQsQ0FBcUIsTUFBckIsRUFaWDtLQUFBLGFBQUE7QUFjRTtlQUNFLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBckIsQ0FBNkIsTUFBN0IsRUFBcUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUE1QyxFQURGO09BQUEsY0FBQTtlQUdFLE1BQUEsR0FBUyxNQUhYO09BZEY7S0FBQTtNQW1CRSxJQUFHLFNBQUg7UUFDRSxJQUFHLE9BQU8sU0FBUyxDQUFDLFdBQWpCLEtBQWdDLFVBQW5DO1VBQ0UsU0FBUyxDQUFDLFdBQVYsQ0FBc0IsS0FBdEIsRUFERjtTQUFBLE1BQUE7VUFHRSxTQUFTLENBQUMsZUFBVixDQUFBLEVBSEY7U0FERjs7TUFLQSxJQUFHLElBQUg7UUFDRSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQWQsQ0FBMEIsSUFBMUIsRUFERjs7TUFFQSxLQUFBLENBQU0sRUFBQSxDQUFHLENBQUksTUFBSCxHQUFlLDRCQUFmLEdBQWlELDBCQUFsRCxDQUFILENBQU4sRUExQkY7O0VBRkksQ0FUTjtFQXVDQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBUSxFQUFBLENBQUcsZ0JBQUgsQ0FBVDtNQUErQixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUE3QztLQUFaLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGNBQVo7S0FBSixFQUNFLEtBQUEsQ0FBTTtNQUFDLEdBQUEsRUFBSyxLQUFOO01BQWEsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBM0I7TUFBZ0MsUUFBQSxFQUFVLElBQTFDO0tBQU4sQ0FERixFQUVFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQUosRUFDSSxRQUFRLENBQUMsV0FBVCxJQUF3QixNQUFNLENBQUMsYUFBbEMsR0FDRyxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLElBQVg7S0FBUCxFQUF5QixFQUFBLENBQUcsb0JBQUgsQ0FBekIsQ0FESCxHQUFBLE1BREQsRUFHRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLElBQVg7S0FBUCxFQUF5QixFQUFBLENBQUcsb0JBQUgsQ0FBekIsQ0FIRixFQUlFLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWpCO0tBQVAsRUFBZ0MsRUFBQSxDQUFHLHFCQUFILENBQWhDLENBSkYsQ0FGRixDQURGO0VBREssQ0F2Q1I7Q0FGZTs7Ozs7QUNOakIsSUFBQTs7QUFBQSxNQUFtQixLQUFLLENBQUMsR0FBekIsRUFBQyxVQUFBLEdBQUQsRUFBTSxTQUFBLEVBQU4sRUFBVSxTQUFBLEVBQVYsRUFBYyxRQUFBOztBQUVSO0VBQ1MsaUJBQUMsUUFBRDs7TUFBQyxXQUFTOztJQUNwQixJQUFDLENBQUEsaUJBQUEsS0FBRixFQUFTLElBQUMsQ0FBQSxxQkFBQTtFQURDOzs7Ozs7QUFHZixHQUFBLEdBQU0sS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FFeEI7RUFBQSxXQUFBLEVBQWEsZ0JBQWI7RUFFQSxPQUFBLEVBQVMsU0FBQyxDQUFEO0lBQ1AsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtXQUNBLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBUCxDQUFrQixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQXpCO0VBRk8sQ0FGVDtFQU1BLE1BQUEsRUFBUSxTQUFBO0FBQ04sUUFBQTtJQUFBLFNBQUEsR0FBZSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVYsR0FBd0IsY0FBeEIsR0FBNEM7V0FDdkQsRUFBQSxDQUFHO01BQUMsU0FBQSxFQUFXLFNBQVo7TUFBdUIsT0FBQSxFQUFTLElBQUMsQ0FBQSxPQUFqQztLQUFILEVBQThDLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBckQ7RUFGSyxDQU5SO0NBRndCLENBQXBCOztBQVlOLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsaUJBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLGdCQUFBLEVBQWtCLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBQVAsSUFBMkIsQ0FBN0M7O0VBRGUsQ0FGakI7RUFLQSxPQUFBLEVBQ0U7SUFBQSxHQUFBLEVBQUssU0FBQyxRQUFEO2FBQWtCLElBQUEsT0FBQSxDQUFRLFFBQVI7SUFBbEIsQ0FBTDtHQU5GO0VBUUEsV0FBQSxFQUFhLFNBQUMsS0FBRDtXQUNYLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQSxnQkFBQSxFQUFrQixLQUFsQjtLQUFWO0VBRFcsQ0FSYjtFQVdBLFNBQUEsRUFBVyxTQUFDLEdBQUQsRUFBTSxLQUFOO1dBQ1IsR0FBQSxDQUNDO01BQUEsS0FBQSxFQUFPLEdBQUcsQ0FBQyxLQUFYO01BQ0EsR0FBQSxFQUFLLEtBREw7TUFFQSxLQUFBLEVBQU8sS0FGUDtNQUdBLFFBQUEsRUFBVyxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFIM0I7TUFJQSxVQUFBLEVBQVksSUFBQyxDQUFBLFdBSmI7S0FERDtFQURRLENBWFg7RUFvQkEsVUFBQSxFQUFZLFNBQUE7QUFDVixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGdCQUFaO0tBQUo7O0FBQ0U7QUFBQTtXQUFBLHNEQUFBOztxQkFBQSxFQUFBLENBQUc7VUFBQyxHQUFBLEVBQUssS0FBTjtTQUFILEVBQWlCLElBQUMsQ0FBQSxTQUFELENBQVcsR0FBWCxFQUFnQixLQUFoQixDQUFqQjtBQUFBOztpQkFERjtFQURTLENBcEJaO0VBeUJBLG1CQUFBLEVBQXFCLFNBQUE7QUFDbkIsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx5QkFBWjtLQUFKOztBQUNDO0FBQUE7V0FBQSxzREFBQTs7cUJBQ0csR0FBQSxDQUFJO1VBQ0gsR0FBQSxFQUFLLEtBREY7VUFFSCxLQUFBLEVBQ0U7WUFBQSxPQUFBLEVBQVksS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBQW5CLEdBQXlDLE9BQXpDLEdBQXNELE1BQS9EO1dBSEM7U0FBSixFQUtDLEdBQUcsQ0FBQyxTQUxMO0FBREg7O2lCQUREO0VBRGtCLENBekJyQjtFQXFDQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLEdBQUEsRUFBSyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQWI7TUFBa0IsU0FBQSxFQUFXLGNBQTdCO0tBQUosRUFDQyxJQUFDLENBQUEsVUFBRCxDQUFBLENBREQsRUFFQyxJQUFDLENBQUEsbUJBQUQsQ0FBQSxDQUZEO0VBREssQ0FyQ1I7Q0FGZSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50ID0gKHJlcXVpcmUgJy4vY2xpZW50JykuQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuZ2V0UXVlcnlQYXJhbSA9IHJlcXVpcmUgJy4vdXRpbHMvZ2V0LXF1ZXJ5LXBhcmFtJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICAjIHNpbmNlIHRoZSBtb2R1bGUgZXhwb3J0cyBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgd2UgbmVlZCB0byBmYWtlIGEgY2xhc3MgdmFyaWFibGUgYXMgYW4gaW5zdGFuY2UgdmFyaWFibGVcclxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuXHJcbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxyXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxyXG5cclxuICBpbml0OiAoQGFwcE9wdGlvbnMsIHVzaW5nSWZyYW1lID0gZmFsc2UpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXHJcbiAgICBAY2xpZW50LnNldEFwcE9wdGlvbnMgQGFwcE9wdGlvbnNcclxuXHJcbiAgICBvcGVuU2hhcmVkQ29udGVudElkID0gZ2V0UXVlcnlQYXJhbSBcIm9wZW5TaGFyZWRcIlxyXG4gICAgaWYgb3BlblNoYXJlZENvbnRlbnRJZFxyXG4gICAgICBAY2xpZW50Lm9wZW5TaGFyZWRDb250ZW50IG9wZW5TaGFyZWRDb250ZW50SWRcclxuXHJcbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkLCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXHJcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXHJcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXHJcblxyXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXHJcbiAgICAgIEBfY3JlYXRlSGlkZGVuQXBwKClcclxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcclxuICAgIEBjbGllbnQuY29ubmVjdCgpXHJcblxyXG4gIF9jcmVhdGVIaWRkZW5BcHA6IC0+XHJcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcclxuICAgIEBfcmVuZGVyQXBwIGFuY2hvclxyXG5cclxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxyXG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcclxuIiwiLy8gU2VlOiBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvd2lraS9BUElcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvRE1QKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdLFxuICAgICAgY2hhbmdlLFxuICAgICAgb3BlcmF0aW9uO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IDE7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgb3BlcmF0aW9uID0gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wZXJhdGlvbiA9IDA7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goW29wZXJhdGlvbiwgY2hhbmdlLnZhbHVlXSk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvWE1MKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPGlucz4nKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICByZXQucHVzaCgnPGRlbD4nKTtcbiAgICB9XG5cbiAgICByZXQucHVzaChlc2NhcGVIVE1MKGNoYW5nZS52YWx1ZSkpO1xuXG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgcmV0LnB1c2goJzwvaW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8L2RlbD4nKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlSFRNTChzKSB7XG4gIGxldCBuID0gcztcbiAgbiA9IG4ucmVwbGFjZSgvJi9nLCAnJmFtcDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvPC9nLCAnJmx0OycpO1xuICBuID0gbi5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcblxuICByZXR1cm4gbjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERpZmYoKSB7fVxuXG5EaWZmLnByb3RvdHlwZSA9IHtcbiAgZGlmZihvbGRTdHJpbmcsIG5ld1N0cmluZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGNhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjaztcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGRvbmUodmFsdWUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayh1bmRlZmluZWQsIHZhbHVlKTsgfSwgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbG93IHN1YmNsYXNzZXMgdG8gbWFzc2FnZSB0aGUgaW5wdXQgcHJpb3IgdG8gcnVubmluZ1xuICAgIG9sZFN0cmluZyA9IHRoaXMuY2FzdElucHV0KG9sZFN0cmluZyk7XG4gICAgbmV3U3RyaW5nID0gdGhpcy5jYXN0SW5wdXQobmV3U3RyaW5nKTtcblxuICAgIG9sZFN0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShvbGRTdHJpbmcpKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLnJlbW92ZUVtcHR5KHRoaXMudG9rZW5pemUobmV3U3RyaW5nKSk7XG5cbiAgICBsZXQgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCwgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aDtcbiAgICBsZXQgZWRpdExlbmd0aCA9IDE7XG4gICAgbGV0IG1heEVkaXRMZW5ndGggPSBuZXdMZW4gKyBvbGRMZW47XG4gICAgbGV0IGJlc3RQYXRoID0gW3sgbmV3UG9zOiAtMSwgY29tcG9uZW50czogW10gfV07XG5cbiAgICAvLyBTZWVkIGVkaXRMZW5ndGggPSAwLCBpLmUuIHRoZSBjb250ZW50IHN0YXJ0cyB3aXRoIHRoZSBzYW1lIHZhbHVlc1xuICAgIGxldCBvbGRQb3MgPSB0aGlzLmV4dHJhY3RDb21tb24oYmVzdFBhdGhbMF0sIG5ld1N0cmluZywgb2xkU3RyaW5nLCAwKTtcbiAgICBpZiAoYmVzdFBhdGhbMF0ubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgIC8vIElkZW50aXR5IHBlciB0aGUgZXF1YWxpdHkgYW5kIHRva2VuaXplclxuICAgICAgcmV0dXJuIGRvbmUoW3t2YWx1ZTogbmV3U3RyaW5nLmpvaW4oJycpLCBjb3VudDogbmV3U3RyaW5nLmxlbmd0aH1dKTtcbiAgICB9XG5cbiAgICAvLyBNYWluIHdvcmtlciBtZXRob2QuIGNoZWNrcyBhbGwgcGVybXV0YXRpb25zIG9mIGEgZ2l2ZW4gZWRpdCBsZW5ndGggZm9yIGFjY2VwdGFuY2UuXG4gICAgZnVuY3Rpb24gZXhlY0VkaXRMZW5ndGgoKSB7XG4gICAgICBmb3IgKGxldCBkaWFnb25hbFBhdGggPSAtMSAqIGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCA8PSBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggKz0gMikge1xuICAgICAgICBsZXQgYmFzZVBhdGg7XG4gICAgICAgIGxldCBhZGRQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0sXG4gICAgICAgICAgICByZW1vdmVQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoICsgMV0sXG4gICAgICAgICAgICBvbGRQb3MgPSAocmVtb3ZlUGF0aCA/IHJlbW92ZVBhdGgubmV3UG9zIDogMCkgLSBkaWFnb25hbFBhdGg7XG4gICAgICAgIGlmIChhZGRQYXRoKSB7XG4gICAgICAgICAgLy8gTm8gb25lIGVsc2UgaXMgZ29pbmcgdG8gYXR0ZW1wdCB0byB1c2UgdGhpcyB2YWx1ZSwgY2xlYXIgaXRcbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjYW5BZGQgPSBhZGRQYXRoICYmIGFkZFBhdGgubmV3UG9zICsgMSA8IG5ld0xlbixcbiAgICAgICAgICAgIGNhblJlbW92ZSA9IHJlbW92ZVBhdGggJiYgMCA8PSBvbGRQb3MgJiYgb2xkUG9zIDwgb2xkTGVuO1xuICAgICAgICBpZiAoIWNhbkFkZCAmJiAhY2FuUmVtb3ZlKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBwYXRoIGlzIGEgdGVybWluYWwgdGhlbiBwcnVuZVxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWxlY3QgdGhlIGRpYWdvbmFsIHRoYXQgd2Ugd2FudCB0byBicmFuY2ggZnJvbS4gV2Ugc2VsZWN0IHRoZSBwcmlvclxuICAgICAgICAvLyBwYXRoIHdob3NlIHBvc2l0aW9uIGluIHRoZSBuZXcgc3RyaW5nIGlzIHRoZSBmYXJ0aGVzdCBmcm9tIHRoZSBvcmlnaW5cbiAgICAgICAgLy8gYW5kIGRvZXMgbm90IHBhc3MgdGhlIGJvdW5kcyBvZiB0aGUgZGlmZiBncmFwaFxuICAgICAgICBpZiAoIWNhbkFkZCB8fCAoY2FuUmVtb3ZlICYmIGFkZFBhdGgubmV3UG9zIDwgcmVtb3ZlUGF0aC5uZXdQb3MpKSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBjbG9uZVBhdGgocmVtb3ZlUGF0aCk7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBhZGRQYXRoOyAgIC8vIE5vIG5lZWQgdG8gY2xvbmUsIHdlJ3ZlIHB1bGxlZCBpdCBmcm9tIHRoZSBsaXN0XG4gICAgICAgICAgYmFzZVBhdGgubmV3UG9zKys7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHRydWUsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cblxuICAgICAgICBvbGRQb3MgPSBzZWxmLmV4dHJhY3RDb21tb24oYmFzZVBhdGgsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBkaWFnb25hbFBhdGgpO1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgaGl0IHRoZSBlbmQgb2YgYm90aCBzdHJpbmdzLCB0aGVuIHdlIGFyZSBkb25lXG4gICAgICAgIGlmIChiYXNlUGF0aC5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgICAgIHJldHVybiBkb25lKGJ1aWxkVmFsdWVzKHNlbGYsIGJhc2VQYXRoLmNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBzZWxmLnVzZUxvbmdlc3RUb2tlbikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSB0cmFjayB0aGlzIHBhdGggYXMgYSBwb3RlbnRpYWwgY2FuZGlkYXRlIGFuZCBjb250aW51ZS5cbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gYmFzZVBhdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWRpdExlbmd0aCsrO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm1zIHRoZSBsZW5ndGggb2YgZWRpdCBpdGVyYXRpb24uIElzIGEgYml0IGZ1Z2x5IGFzIHRoaXMgaGFzIHRvIHN1cHBvcnQgdGhlXG4gICAgLy8gc3luYyBhbmQgYXN5bmMgbW9kZSB3aGljaCBpcyBuZXZlciBmdW4uIExvb3BzIG92ZXIgZXhlY0VkaXRMZW5ndGggdW50aWwgYSB2YWx1ZVxuICAgIC8vIGlzIHByb2R1Y2VkLlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgKGZ1bmN0aW9uIGV4ZWMoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gVGhpcyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IHdlIHdhbnQgdG8gYmUgc2FmZS5cbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICAgIGlmIChlZGl0TGVuZ3RoID4gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFleGVjRWRpdExlbmd0aCgpKSB7XG4gICAgICAgICAgICBleGVjKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcbiAgICAgIH0oKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlIChlZGl0TGVuZ3RoIDw9IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgbGV0IHJldCA9IGV4ZWNFZGl0TGVuZ3RoKCk7XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHB1c2hDb21wb25lbnQoY29tcG9uZW50cywgYWRkZWQsIHJlbW92ZWQpIHtcbiAgICBsZXQgbGFzdCA9IGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdCAmJiBsYXN0LmFkZGVkID09PSBhZGRlZCAmJiBsYXN0LnJlbW92ZWQgPT09IHJlbW92ZWQpIHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gY2xvbmUgaGVyZSBhcyB0aGUgY29tcG9uZW50IGNsb25lIG9wZXJhdGlvbiBpcyBqdXN0XG4gICAgICAvLyBhcyBzaGFsbG93IGFycmF5IGNsb25lXG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV0gPSB7Y291bnQ6IGxhc3QuY291bnQgKyAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50cy5wdXNoKHtjb3VudDogMSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH0pO1xuICAgIH1cbiAgfSxcbiAgZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCkge1xuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLFxuICAgICAgICBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoLFxuICAgICAgICBuZXdQb3MgPSBiYXNlUGF0aC5uZXdQb3MsXG4gICAgICAgIG9sZFBvcyA9IG5ld1BvcyAtIGRpYWdvbmFsUGF0aCxcblxuICAgICAgICBjb21tb25Db3VudCA9IDA7XG4gICAgd2hpbGUgKG5ld1BvcyArIDEgPCBuZXdMZW4gJiYgb2xkUG9zICsgMSA8IG9sZExlbiAmJiB0aGlzLmVxdWFscyhuZXdTdHJpbmdbbmV3UG9zICsgMV0sIG9sZFN0cmluZ1tvbGRQb3MgKyAxXSkpIHtcbiAgICAgIG5ld1BvcysrO1xuICAgICAgb2xkUG9zKys7XG4gICAgICBjb21tb25Db3VudCsrO1xuICAgIH1cblxuICAgIGlmIChjb21tb25Db3VudCkge1xuICAgICAgYmFzZVBhdGguY29tcG9uZW50cy5wdXNoKHtjb3VudDogY29tbW9uQ291bnR9KTtcbiAgICB9XG5cbiAgICBiYXNlUGF0aC5uZXdQb3MgPSBuZXdQb3M7XG4gICAgcmV0dXJuIG9sZFBvcztcbiAgfSxcblxuICBlcXVhbHMobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XG4gIH0sXG4gIHJlbW92ZUVtcHR5KGFycmF5KSB7XG4gICAgbGV0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSkge1xuICAgICAgICByZXQucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGNhc3RJbnB1dCh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgdG9rZW5pemUodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUuc3BsaXQoJycpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBidWlsZFZhbHVlcyhkaWZmLCBjb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgdXNlTG9uZ2VzdFRva2VuKSB7XG4gIGxldCBjb21wb25lbnRQb3MgPSAwLFxuICAgICAgY29tcG9uZW50TGVuID0gY29tcG9uZW50cy5sZW5ndGgsXG4gICAgICBuZXdQb3MgPSAwLFxuICAgICAgb2xkUG9zID0gMDtcblxuICBmb3IgKDsgY29tcG9uZW50UG9zIDwgY29tcG9uZW50TGVuOyBjb21wb25lbnRQb3MrKykge1xuICAgIGxldCBjb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgaWYgKCFjb21wb25lbnQucmVtb3ZlZCkge1xuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQgJiYgdXNlTG9uZ2VzdFRva2VuKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCk7XG4gICAgICAgIHZhbHVlID0gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlLCBpKSB7XG4gICAgICAgICAgbGV0IG9sZFZhbHVlID0gb2xkU3RyaW5nW29sZFBvcyArIGldO1xuICAgICAgICAgIHJldHVybiBvbGRWYWx1ZS5sZW5ndGggPiB2YWx1ZS5sZW5ndGggPyBvbGRWYWx1ZSA6IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb21wb25lbnQudmFsdWUgPSB2YWx1ZS5qb2luKCcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCkuam9pbignJyk7XG4gICAgICB9XG4gICAgICBuZXdQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuXG4gICAgICAvLyBDb21tb24gY2FzZVxuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQpIHtcbiAgICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50LnZhbHVlID0gb2xkU3RyaW5nLnNsaWNlKG9sZFBvcywgb2xkUG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIG9sZFBvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIFJldmVyc2UgYWRkIGFuZCByZW1vdmUgc28gcmVtb3ZlcyBhcmUgb3V0cHV0IGZpcnN0IHRvIG1hdGNoIGNvbW1vbiBjb252ZW50aW9uXG4gICAgICAvLyBUaGUgZGlmZmluZyBhbGdvcml0aG0gaXMgdGllZCB0byBhZGQgdGhlbiByZW1vdmUgb3V0cHV0IGFuZCB0aGlzIGlzIHRoZSBzaW1wbGVzdFxuICAgICAgLy8gcm91dGUgdG8gZ2V0IHRoZSBkZXNpcmVkIG91dHB1dCB3aXRoIG1pbmltYWwgb3ZlcmhlYWQuXG4gICAgICBpZiAoY29tcG9uZW50UG9zICYmIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0uYWRkZWQpIHtcbiAgICAgICAgbGV0IHRtcCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV07XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0gPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zXSA9IHRtcDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgaGFuZGxlIGZvciB3aGVuIG9uZSB0ZXJtaW5hbCBpcyBpZ25vcmVkLiBGb3IgdGhpcyBjYXNlIHdlIG1lcmdlIHRoZVxuICAvLyB0ZXJtaW5hbCBpbnRvIHRoZSBwcmlvciBzdHJpbmcgYW5kIGRyb3AgdGhlIGNoYW5nZS5cbiAgbGV0IGxhc3RDb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDFdO1xuICBpZiAoKGxhc3RDb21wb25lbnQuYWRkZWQgfHwgbGFzdENvbXBvbmVudC5yZW1vdmVkKSAmJiBkaWZmLmVxdWFscygnJywgbGFzdENvbXBvbmVudC52YWx1ZSkpIHtcbiAgICBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDJdLnZhbHVlICs9IGxhc3RDb21wb25lbnQudmFsdWU7XG4gICAgY29tcG9uZW50cy5wb3AoKTtcbiAgfVxuXG4gIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZVBhdGgocGF0aCkge1xuICByZXR1cm4geyBuZXdQb3M6IHBhdGgubmV3UG9zLCBjb21wb25lbnRzOiBwYXRoLmNvbXBvbmVudHMuc2xpY2UoMCkgfTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBjb25zdCBjaGFyYWN0ZXJEaWZmID0gbmV3IERpZmYoKTtcbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ2hhcnMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjaGFyYWN0ZXJEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNzc0RpZmYgPSBuZXcgRGlmZigpO1xuY3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFt7fTo7LF18XFxzKykvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ3NzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gY3NzRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2xpbmVEaWZmfSBmcm9tICcuL2xpbmUnO1xuXG5jb25zdCBvYmplY3RQcm90b3R5cGVUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cblxuZXhwb3J0IGNvbnN0IGpzb25EaWZmID0gbmV3IERpZmYoKTtcbi8vIERpc2NyaW1pbmF0ZSBiZXR3ZWVuIHR3byBsaW5lcyBvZiBwcmV0dHktcHJpbnRlZCwgc2VyaWFsaXplZCBKU09OIHdoZXJlIG9uZSBvZiB0aGVtIGhhcyBhXG4vLyBkYW5nbGluZyBjb21tYSBhbmQgdGhlIG90aGVyIGRvZXNuJ3QuIFR1cm5zIG91dCBpbmNsdWRpbmcgdGhlIGRhbmdsaW5nIGNvbW1hIHlpZWxkcyB0aGUgbmljZXN0IG91dHB1dDpcbmpzb25EaWZmLnVzZUxvbmdlc3RUb2tlbiA9IHRydWU7XG5cbmpzb25EaWZmLnRva2VuaXplID0gbGluZURpZmYudG9rZW5pemU7XG5qc29uRGlmZi5jYXN0SW5wdXQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkoY2Fub25pY2FsaXplKHZhbHVlKSwgdW5kZWZpbmVkLCAnICAnKTtcbn07XG5qc29uRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gRGlmZi5wcm90b3R5cGUuZXF1YWxzKGxlZnQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJyksIHJpZ2h0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmSnNvbihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spIHsgcmV0dXJuIGpzb25EaWZmLmRpZmYob2xkT2JqLCBuZXdPYmosIGNhbGxiYWNrKTsgfVxuXG5cbi8vIFRoaXMgZnVuY3Rpb24gaGFuZGxlcyB0aGUgcHJlc2VuY2Ugb2YgY2lyY3VsYXIgcmVmZXJlbmNlcyBieSBiYWlsaW5nIG91dCB3aGVuIGVuY291bnRlcmluZyBhblxuLy8gb2JqZWN0IHRoYXQgaXMgYWxyZWFkeSBvbiB0aGUgXCJzdGFja1wiIG9mIGl0ZW1zIGJlaW5nIHByb2Nlc3NlZC5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemUob2JqLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjaykge1xuICBzdGFjayA9IHN0YWNrIHx8IFtdO1xuICByZXBsYWNlbWVudFN0YWNrID0gcmVwbGFjZW1lbnRTdGFjayB8fCBbXTtcblxuICBsZXQgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgc3RhY2subGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc3RhY2tbaV0gPT09IG9iaikge1xuICAgICAgcmV0dXJuIHJlcGxhY2VtZW50U3RhY2tbaV07XG4gICAgfVxuICB9XG5cbiAgbGV0IGNhbm9uaWNhbGl6ZWRPYmo7XG5cbiAgaWYgKCdbb2JqZWN0IEFycmF5XScgPT09IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nLmNhbGwob2JqKSkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gbmV3IEFycmF5KG9iai5sZW5ndGgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucHVzaChjYW5vbmljYWxpemVkT2JqKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2ldID0gY2Fub25pY2FsaXplKG9ialtpXSwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spO1xuICAgIH1cbiAgICBzdGFjay5wb3AoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiAhPT0gbnVsbCkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0ge307XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGxldCBzb3J0ZWRLZXlzID0gW10sXG4gICAgICAgIGtleTtcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc29ydGVkS2V5cy5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRlZEtleXMuc29ydCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBzb3J0ZWRLZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBrZXkgPSBzb3J0ZWRLZXlzW2ldO1xuICAgICAgY2Fub25pY2FsaXplZE9ialtrZXldID0gY2Fub25pY2FsaXplKG9ialtrZXldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IG9iajtcbiAgfVxuICByZXR1cm4gY2Fub25pY2FsaXplZE9iajtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG5leHBvcnQgY29uc3QgbGluZURpZmYgPSBuZXcgRGlmZigpO1xubGluZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBsZXQgcmV0TGluZXMgPSBbXSxcbiAgICAgIGxpbmVzQW5kTmV3bGluZXMgPSB2YWx1ZS5zcGxpdCgvKFxcbnxcXHJcXG4pLyk7XG5cbiAgLy8gSWdub3JlIHRoZSBmaW5hbCBlbXB0eSB0b2tlbiB0aGF0IG9jY3VycyBpZiB0aGUgc3RyaW5nIGVuZHMgd2l0aCBhIG5ldyBsaW5lXG4gIGlmICghbGluZXNBbmROZXdsaW5lc1tsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgbGluZXNBbmROZXdsaW5lcy5wb3AoKTtcbiAgfVxuXG4gIC8vIE1lcmdlIHRoZSBjb250ZW50IGFuZCBsaW5lIHNlcGFyYXRvcnMgaW50byBzaW5nbGUgdG9rZW5zXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXNBbmROZXdsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBsaW5lID0gbGluZXNBbmROZXdsaW5lc1tpXTtcblxuICAgIGlmIChpICUgMiAmJiAhdGhpcy5vcHRpb25zLm5ld2xpbmVJc1Rva2VuKSB7XG4gICAgICByZXRMaW5lc1tyZXRMaW5lcy5sZW5ndGggLSAxXSArPSBsaW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpIHtcbiAgICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgfVxuICAgICAgcmV0TGluZXMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0TGluZXM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gbGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG5leHBvcnQgZnVuY3Rpb24gZGlmZlRyaW1tZWRMaW5lcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgbGV0IG9wdGlvbnMgPSBnZW5lcmF0ZU9wdGlvbnMoY2FsbGJhY2ssIHtpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlfSk7XG4gIHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cblxuZXhwb3J0IGNvbnN0IHNlbnRlbmNlRGlmZiA9IG5ldyBEaWZmKCk7XG5zZW50ZW5jZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhcXFMuKz9bLiE/XSkoPz1cXHMrfCQpLyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZlNlbnRlbmNlcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIHNlbnRlbmNlRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG4vLyBCYXNlZCBvbiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MYXRpbl9zY3JpcHRfaW5fVW5pY29kZVxuLy9cbi8vIFJhbmdlcyBhbmQgZXhjZXB0aW9uczpcbi8vIExhdGluLTEgU3VwcGxlbWVudCwgMDA4MOKAkzAwRkZcbi8vICAtIFUrMDBENyAgw5cgTXVsdGlwbGljYXRpb24gc2lnblxuLy8gIC0gVSswMEY3ICDDtyBEaXZpc2lvbiBzaWduXG4vLyBMYXRpbiBFeHRlbmRlZC1BLCAwMTAw4oCTMDE3RlxuLy8gTGF0aW4gRXh0ZW5kZWQtQiwgMDE4MOKAkzAyNEZcbi8vIElQQSBFeHRlbnNpb25zLCAwMjUw4oCTMDJBRlxuLy8gU3BhY2luZyBNb2RpZmllciBMZXR0ZXJzLCAwMkIw4oCTMDJGRlxuLy8gIC0gVSswMkM3ICDLhyAmIzcxMTsgIENhcm9uXG4vLyAgLSBVKzAyRDggIMuYICYjNzI4OyAgQnJldmVcbi8vICAtIFUrMDJEOSAgy5kgJiM3Mjk7ICBEb3QgQWJvdmVcbi8vICAtIFUrMDJEQSAgy5ogJiM3MzA7ICBSaW5nIEFib3ZlXG4vLyAgLSBVKzAyREIgIMubICYjNzMxOyAgT2dvbmVrXG4vLyAgLSBVKzAyREMgIMucICYjNzMyOyAgU21hbGwgVGlsZGVcbi8vICAtIFUrMDJERCAgy50gJiM3MzM7ICBEb3VibGUgQWN1dGUgQWNjZW50XG4vLyBMYXRpbiBFeHRlbmRlZCBBZGRpdGlvbmFsLCAxRTAw4oCTMUVGRlxuY29uc3QgZXh0ZW5kZWRXb3JkQ2hhcnMgPSAvXlthLXpBLVpcXHV7QzB9LVxcdXtGRn1cXHV7RDh9LVxcdXtGNn1cXHV7Rjh9LVxcdXsyQzZ9XFx1ezJDOH0tXFx1ezJEN31cXHV7MkRFfS1cXHV7MkZGfVxcdXsxRTAwfS1cXHV7MUVGRn1dKyQvdTtcblxuY29uc3QgcmVXaGl0ZXNwYWNlID0gL1xcUy87XG5cbmV4cG9ydCBjb25zdCB3b3JkRGlmZiA9IG5ldyBEaWZmKCk7XG53b3JkRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgfHwgKHRoaXMub3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlICYmICFyZVdoaXRlc3BhY2UudGVzdChsZWZ0KSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QocmlnaHQpKTtcbn07XG53b3JkRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCB0b2tlbnMgPSB2YWx1ZS5zcGxpdCgvKFxccyt8XFxiKS8pO1xuXG4gIC8vIEpvaW4gdGhlIGJvdW5kYXJ5IHNwbGl0cyB0aGF0IHdlIGRvIG5vdCBjb25zaWRlciB0byBiZSBib3VuZGFyaWVzLiBUaGlzIGlzIHByaW1hcmlseSB0aGUgZXh0ZW5kZWQgTGF0aW4gY2hhcmFjdGVyIHNldC5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgLy8gSWYgd2UgaGF2ZSBhbiBlbXB0eSBzdHJpbmcgaW4gdGhlIG5leHQgZmllbGQgYW5kIHdlIGhhdmUgb25seSB3b3JkIGNoYXJzIGJlZm9yZSBhbmQgYWZ0ZXIsIG1lcmdlXG4gICAgaWYgKCF0b2tlbnNbaSArIDFdICYmIHRva2Vuc1tpICsgMl1cbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpXSlcbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpICsgMl0pKSB7XG4gICAgICB0b2tlbnNbaV0gKz0gdG9rZW5zW2kgKyAyXTtcbiAgICAgIHRva2Vucy5zcGxpY2UoaSArIDEsIDIpO1xuICAgICAgaS0tO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b2tlbnM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZXb3Jkc1dpdGhTcGFjZShvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTtcbn1cbiIsIi8qIFNlZSBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zIG9mIHVzZSAqL1xuXG4vKlxuICogVGV4dCBkaWZmIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIFRoaXMgbGlicmFyeSBzdXBwb3J0cyB0aGUgZm9sbG93aW5nIEFQSVM6XG4gKiBKc0RpZmYuZGlmZkNoYXJzOiBDaGFyYWN0ZXIgYnkgY2hhcmFjdGVyIGRpZmZcbiAqIEpzRGlmZi5kaWZmV29yZHM6IFdvcmQgKGFzIGRlZmluZWQgYnkgXFxiIHJlZ2V4KSBkaWZmIHdoaWNoIGlnbm9yZXMgd2hpdGVzcGFjZVxuICogSnNEaWZmLmRpZmZMaW5lczogTGluZSBiYXNlZCBkaWZmXG4gKlxuICogSnNEaWZmLmRpZmZDc3M6IERpZmYgdGFyZ2V0ZWQgYXQgQ1NTIGNvbnRlbnRcbiAqXG4gKiBUaGVzZSBtZXRob2RzIGFyZSBiYXNlZCBvbiB0aGUgaW1wbGVtZW50YXRpb24gcHJvcG9zZWQgaW5cbiAqIFwiQW4gTyhORCkgRGlmZmVyZW5jZSBBbGdvcml0aG0gYW5kIGl0cyBWYXJpYXRpb25zXCIgKE15ZXJzLCAxOTg2KS5cbiAqIGh0dHA6Ly9jaXRlc2VlcnguaXN0LnBzdS5lZHUvdmlld2RvYy9zdW1tYXJ5P2RvaT0xMC4xLjEuNC42OTI3XG4gKi9cbmltcG9ydCBEaWZmIGZyb20gJy4vZGlmZi9iYXNlJztcbmltcG9ydCB7ZGlmZkNoYXJzfSBmcm9tICcuL2RpZmYvY2hhcmFjdGVyJztcbmltcG9ydCB7ZGlmZldvcmRzLCBkaWZmV29yZHNXaXRoU3BhY2V9IGZyb20gJy4vZGlmZi93b3JkJztcbmltcG9ydCB7ZGlmZkxpbmVzLCBkaWZmVHJpbW1lZExpbmVzfSBmcm9tICcuL2RpZmYvbGluZSc7XG5pbXBvcnQge2RpZmZTZW50ZW5jZXN9IGZyb20gJy4vZGlmZi9zZW50ZW5jZSc7XG5cbmltcG9ydCB7ZGlmZkNzc30gZnJvbSAnLi9kaWZmL2Nzcyc7XG5pbXBvcnQge2RpZmZKc29uLCBjYW5vbmljYWxpemV9IGZyb20gJy4vZGlmZi9qc29uJztcblxuaW1wb3J0IHthcHBseVBhdGNoLCBhcHBseVBhdGNoZXN9IGZyb20gJy4vcGF0Y2gvYXBwbHknO1xuaW1wb3J0IHtwYXJzZVBhdGNofSBmcm9tICcuL3BhdGNoL3BhcnNlJztcbmltcG9ydCB7c3RydWN0dXJlZFBhdGNoLCBjcmVhdGVUd29GaWxlc1BhdGNoLCBjcmVhdGVQYXRjaH0gZnJvbSAnLi9wYXRjaC9jcmVhdGUnO1xuXG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9ETVB9IGZyb20gJy4vY29udmVydC9kbXAnO1xuaW1wb3J0IHtjb252ZXJ0Q2hhbmdlc1RvWE1MfSBmcm9tICcuL2NvbnZlcnQveG1sJztcblxuZXhwb3J0IHtcbiAgRGlmZixcblxuICBkaWZmQ2hhcnMsXG4gIGRpZmZXb3JkcyxcbiAgZGlmZldvcmRzV2l0aFNwYWNlLFxuICBkaWZmTGluZXMsXG4gIGRpZmZUcmltbWVkTGluZXMsXG4gIGRpZmZTZW50ZW5jZXMsXG5cbiAgZGlmZkNzcyxcbiAgZGlmZkpzb24sXG5cbiAgc3RydWN0dXJlZFBhdGNoLFxuICBjcmVhdGVUd29GaWxlc1BhdGNoLFxuICBjcmVhdGVQYXRjaCxcbiAgYXBwbHlQYXRjaCxcbiAgYXBwbHlQYXRjaGVzLFxuICBwYXJzZVBhdGNoLFxuICBjb252ZXJ0Q2hhbmdlc1RvRE1QLFxuICBjb252ZXJ0Q2hhbmdlc1RvWE1MLFxuICBjYW5vbmljYWxpemVcbn07XG4iLCJpbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGFyc2UnO1xuaW1wb3J0IGRpc3RhbmNlSXRlcmF0b3IgZnJvbSAnLi4vdXRpbC9kaXN0YW5jZS1pdGVyYXRvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoKHNvdXJjZSwgdW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHVuaURpZmYpKSB7XG4gICAgaWYgKHVuaURpZmYubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcHBseVBhdGNoIG9ubHkgd29ya3Mgd2l0aCBhIHNpbmdsZSBpbnB1dC4nKTtcbiAgICB9XG5cbiAgICB1bmlEaWZmID0gdW5pRGlmZlswXTtcbiAgfVxuXG4gIC8vIEFwcGx5IHRoZSBkaWZmIHRvIHRoZSBpbnB1dFxuICBsZXQgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpLFxuICAgICAgaHVua3MgPSB1bmlEaWZmLmh1bmtzLFxuXG4gICAgICBjb21wYXJlTGluZSA9IG9wdGlvbnMuY29tcGFyZUxpbmUgfHwgKChsaW5lTnVtYmVyLCBsaW5lLCBvcGVyYXRpb24sIHBhdGNoQ29udGVudCkgPT4gbGluZSA9PT0gcGF0Y2hDb250ZW50KSxcbiAgICAgIGVycm9yQ291bnQgPSAwLFxuICAgICAgZnV6ekZhY3RvciA9IG9wdGlvbnMuZnV6ekZhY3RvciB8fCAwLFxuICAgICAgbWluTGluZSA9IDAsXG4gICAgICBvZmZzZXQgPSAwLFxuXG4gICAgICByZW1vdmVFT0ZOTCxcbiAgICAgIGFkZEVPRk5MO1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGh1bmsgZXhhY3RseSBmaXRzIG9uIHRoZSBwcm92aWRlZCBsb2NhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gaHVua0ZpdHMoaHVuaywgdG9Qb3MpIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnIHx8IG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIC8vIENvbnRleHQgc2FuaXR5IGNoZWNrXG4gICAgICAgIGlmICghY29tcGFyZUxpbmUodG9Qb3MgKyAxLCBsaW5lc1t0b1Bvc10sIG9wZXJhdGlvbiwgY29udGVudCkpIHtcbiAgICAgICAgICBlcnJvckNvdW50Kys7XG5cbiAgICAgICAgICBpZiAoZXJyb3JDb3VudCA+IGZ1enpGYWN0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFNlYXJjaCBiZXN0IGZpdCBvZmZzZXRzIGZvciBlYWNoIGh1bmsgYmFzZWQgb24gdGhlIHByZXZpb3VzIG9uZXNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBodW5rID0gaHVua3NbaV0sXG4gICAgICAgIG1heExpbmUgPSBsaW5lcy5sZW5ndGggLSBodW5rLm9sZExpbmVzLFxuICAgICAgICBsb2NhbE9mZnNldCA9IDAsXG4gICAgICAgIHRvUG9zID0gb2Zmc2V0ICsgaHVuay5vbGRTdGFydCAtIDE7XG5cbiAgICBsZXQgaXRlcmF0b3IgPSBkaXN0YW5jZUl0ZXJhdG9yKHRvUG9zLCBtaW5MaW5lLCBtYXhMaW5lKTtcblxuICAgIGZvciAoOyBsb2NhbE9mZnNldCAhPT0gdW5kZWZpbmVkOyBsb2NhbE9mZnNldCA9IGl0ZXJhdG9yKCkpIHtcbiAgICAgIGlmIChodW5rRml0cyhodW5rLCB0b1BvcyArIGxvY2FsT2Zmc2V0KSkge1xuICAgICAgICBodW5rLm9mZnNldCA9IG9mZnNldCArPSBsb2NhbE9mZnNldDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxvY2FsT2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG93ZXIgdGV4dCBsaW1pdCB0byBlbmQgb2YgdGhlIGN1cnJlbnQgaHVuaywgc28gbmV4dCBvbmVzIGRvbid0IHRyeVxuICAgIC8vIHRvIGZpdCBvdmVyIGFscmVhZHkgcGF0Y2hlZCB0ZXh0XG4gICAgbWluTGluZSA9IGh1bmsub2Zmc2V0ICsgaHVuay5vbGRTdGFydCArIGh1bmsub2xkTGluZXM7XG4gIH1cblxuICAvLyBBcHBseSBwYXRjaCBodW5rc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgdG9Qb3MgPSBodW5rLm9mZnNldCArIGh1bmsubmV3U3RhcnQgLSAxO1xuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBsZXQgbGluZSA9IGh1bmsubGluZXNbal0sXG4gICAgICAgICAgb3BlcmF0aW9uID0gbGluZVswXSxcbiAgICAgICAgICBjb250ZW50ID0gbGluZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDEpO1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgbGluZXMuc3BsaWNlKHRvUG9zLCAwLCBjb250ZW50KTtcbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgbGV0IHByZXZpb3VzT3BlcmF0aW9uID0gaHVuay5saW5lc1tqIC0gMV0gPyBodW5rLmxpbmVzW2ogLSAxXVswXSA6IG51bGw7XG4gICAgICAgIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgcmVtb3ZlRU9GTkwgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICBhZGRFT0ZOTCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgRU9GTkwgaW5zZXJ0aW9uL3JlbW92YWxcbiAgaWYgKHJlbW92ZUVPRk5MKSB7XG4gICAgd2hpbGUgKCFsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSkge1xuICAgICAgbGluZXMucG9wKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFkZEVPRk5MKSB7XG4gICAgbGluZXMucHVzaCgnJyk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vLyBXcmFwcGVyIHRoYXQgc3VwcG9ydHMgbXVsdGlwbGUgZmlsZSBwYXRjaGVzIHZpYSBjYWxsYmFja3MuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzKHVuaURpZmYsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgbGV0IGN1cnJlbnRJbmRleCA9IDA7XG4gIGZ1bmN0aW9uIHByb2Nlc3NJbmRleCgpIHtcbiAgICBsZXQgaW5kZXggPSB1bmlEaWZmW2N1cnJlbnRJbmRleCsrXTtcbiAgICBpZiAoIWluZGV4KSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIG9wdGlvbnMubG9hZEZpbGUoaW5kZXgsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZShlcnIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgdXBkYXRlZENvbnRlbnQgPSBhcHBseVBhdGNoKGRhdGEsIGluZGV4LCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMucGF0Y2hlZChpbmRleCwgdXBkYXRlZENvbnRlbnQpO1xuXG4gICAgICBzZXRUaW1lb3V0KHByb2Nlc3NJbmRleCwgMCk7XG4gICAgfSk7XG4gIH1cbiAgcHJvY2Vzc0luZGV4KCk7XG59XG4iLCJpbXBvcnQge2RpZmZMaW5lc30gZnJvbSAnLi4vZGlmZi9saW5lJztcblxuZXhwb3J0IGZ1bmN0aW9uIHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0geyBjb250ZXh0OiA0IH07XG4gIH1cblxuICBjb25zdCBkaWZmID0gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyKTtcbiAgZGlmZi5wdXNoKHt2YWx1ZTogJycsIGxpbmVzOiBbXX0pOyAgIC8vIEFwcGVuZCBhbiBlbXB0eSB2YWx1ZSB0byBtYWtlIGNsZWFudXAgZWFzaWVyXG5cbiAgZnVuY3Rpb24gY29udGV4dExpbmVzKGxpbmVzKSB7XG4gICAgcmV0dXJuIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkgeyByZXR1cm4gJyAnICsgZW50cnk7IH0pO1xuICB9XG5cbiAgbGV0IGh1bmtzID0gW107XG4gIGxldCBvbGRSYW5nZVN0YXJ0ID0gMCwgbmV3UmFuZ2VTdGFydCA9IDAsIGN1clJhbmdlID0gW10sXG4gICAgICBvbGRMaW5lID0gMSwgbmV3TGluZSA9IDE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBkaWZmW2ldLFxuICAgICAgICAgIGxpbmVzID0gY3VycmVudC5saW5lcyB8fCBjdXJyZW50LnZhbHVlLnJlcGxhY2UoL1xcbiQvLCAnJykuc3BsaXQoJ1xcbicpO1xuICAgIGN1cnJlbnQubGluZXMgPSBsaW5lcztcblxuICAgIGlmIChjdXJyZW50LmFkZGVkIHx8IGN1cnJlbnQucmVtb3ZlZCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBwcmV2aW91cyBjb250ZXh0LCBzdGFydCB3aXRoIHRoYXRcbiAgICAgIGlmICghb2xkUmFuZ2VTdGFydCkge1xuICAgICAgICBjb25zdCBwcmV2ID0gZGlmZltpIC0gMV07XG4gICAgICAgIG9sZFJhbmdlU3RhcnQgPSBvbGRMaW5lO1xuICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gbmV3TGluZTtcblxuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgIGN1clJhbmdlID0gb3B0aW9ucy5jb250ZXh0ID4gMCA/IGNvbnRleHRMaW5lcyhwcmV2LmxpbmVzLnNsaWNlKC1vcHRpb25zLmNvbnRleHQpKSA6IFtdO1xuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE91dHB1dCBvdXIgY2hhbmdlc1xuICAgICAgY3VyUmFuZ2UucHVzaCguLi4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiAoY3VycmVudC5hZGRlZCA/ICcrJyA6ICctJykgKyBlbnRyeTtcbiAgICAgIH0pKTtcblxuICAgICAgLy8gVHJhY2sgdGhlIHVwZGF0ZWQgZmlsZSBwb3NpdGlvblxuICAgICAgaWYgKGN1cnJlbnQuYWRkZWQpIHtcbiAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWRlbnRpY2FsIGNvbnRleHQgbGluZXMuIFRyYWNrIGxpbmUgY2hhbmdlc1xuICAgICAgaWYgKG9sZFJhbmdlU3RhcnQpIHtcbiAgICAgICAgLy8gQ2xvc2Ugb3V0IGFueSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG91dHB1dCAob3Igam9pbiBvdmVybGFwcGluZylcbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQgKiAyICYmIGkgPCBkaWZmLmxlbmd0aCAtIDIpIHtcbiAgICAgICAgICAvLyBPdmVybGFwcGluZ1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGVuZCB0aGUgcmFuZ2UgYW5kIG91dHB1dFxuICAgICAgICAgIGxldCBjb250ZXh0U2l6ZSA9IE1hdGgubWluKGxpbmVzLmxlbmd0aCwgb3B0aW9ucy5jb250ZXh0KTtcbiAgICAgICAgICBjdXJSYW5nZS5wdXNoKC4uLiBjb250ZXh0TGluZXMobGluZXMuc2xpY2UoMCwgY29udGV4dFNpemUpKSk7XG5cbiAgICAgICAgICBsZXQgaHVuayA9IHtcbiAgICAgICAgICAgIG9sZFN0YXJ0OiBvbGRSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgb2xkTGluZXM6IChvbGRMaW5lIC0gb2xkUmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIG5ld1N0YXJ0OiBuZXdSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgbmV3TGluZXM6IChuZXdMaW5lIC0gbmV3UmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIGxpbmVzOiBjdXJSYW5nZVxuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGkgPj0gZGlmZi5sZW5ndGggLSAyICYmIGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIEVPRiBpcyBpbnNpZGUgdGhpcyBodW5rXG4gICAgICAgICAgICBsZXQgb2xkRU9GTmV3bGluZSA9ICgvXFxuJC8udGVzdChvbGRTdHIpKTtcbiAgICAgICAgICAgIGxldCBuZXdFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG5ld1N0cikpO1xuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PSAwICYmICFvbGRFT0ZOZXdsaW5lKSB7XG4gICAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZTogb2xkIGhhcyBubyBlb2wgYW5kIG5vIHRyYWlsaW5nIGNvbnRleHQ7IG5vLW5sIGNhbiBlbmQgdXAgYmVmb3JlIGFkZHNcbiAgICAgICAgICAgICAgY3VyUmFuZ2Uuc3BsaWNlKGh1bmsub2xkTGluZXMsIDAsICdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW9sZEVPRk5ld2xpbmUgfHwgIW5ld0VPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgY3VyUmFuZ2UucHVzaCgnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGh1bmtzLnB1c2goaHVuayk7XG5cbiAgICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBjdXJSYW5nZSA9IFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb2xkRmlsZU5hbWU6IG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZTogbmV3RmlsZU5hbWUsXG4gICAgb2xkSGVhZGVyOiBvbGRIZWFkZXIsIG5ld0hlYWRlcjogbmV3SGVhZGVyLFxuICAgIGh1bmtzOiBodW5rc1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHdvRmlsZXNQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBjb25zdCBkaWZmID0gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKTtcblxuICBjb25zdCByZXQgPSBbXTtcbiAgaWYgKG9sZEZpbGVOYW1lID09IG5ld0ZpbGVOYW1lKSB7XG4gICAgcmV0LnB1c2goJ0luZGV4OiAnICsgb2xkRmlsZU5hbWUpO1xuICB9XG4gIHJldC5wdXNoKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7XG4gIHJldC5wdXNoKCctLS0gJyArIGRpZmYub2xkRmlsZU5hbWUgKyAodHlwZW9mIGRpZmYub2xkSGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm9sZEhlYWRlcikpO1xuICByZXQucHVzaCgnKysrICcgKyBkaWZmLm5ld0ZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm5ld0hlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5uZXdIZWFkZXIpKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmYuaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBodW5rID0gZGlmZi5odW5rc1tpXTtcbiAgICByZXQucHVzaChcbiAgICAgICdAQCAtJyArIGh1bmsub2xkU3RhcnQgKyAnLCcgKyBodW5rLm9sZExpbmVzXG4gICAgICArICcgKycgKyBodW5rLm5ld1N0YXJ0ICsgJywnICsgaHVuay5uZXdMaW5lc1xuICAgICAgKyAnIEBAJ1xuICAgICk7XG4gICAgcmV0LnB1c2guYXBwbHkocmV0LCBodW5rLmxpbmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXQuam9pbignXFxuJykgKyAnXFxuJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGNyZWF0ZVR3b0ZpbGVzUGF0Y2goZmlsZU5hbWUsIGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUGF0Y2godW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCBkaWZmc3RyID0gdW5pRGlmZi5zcGxpdCgnXFxuJyksXG4gICAgICBsaXN0ID0gW10sXG4gICAgICBpID0gMDtcblxuICBmdW5jdGlvbiBwYXJzZUluZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHt9O1xuICAgIGxpc3QucHVzaChpbmRleCk7XG5cbiAgICAvLyBQYXJzZSBkaWZmIG1ldGFkYXRhXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICAvLyBGaWxlIGhlYWRlciBmb3VuZCwgZW5kIHBhcnNpbmcgZGlmZiBtZXRhZGF0YVxuICAgICAgaWYgKC9eKFxcLVxcLVxcLXxcXCtcXCtcXCt8QEApXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBEaWZmIGluZGV4XG4gICAgICBsZXQgaGVhZGVyID0gKC9eKD86SW5kZXg6fGRpZmYoPzogLXIgXFx3KykrKVxccysoLis/KVxccyokLykuZXhlYyhsaW5lKTtcbiAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgaW5kZXguaW5kZXggPSBoZWFkZXJbMV07XG4gICAgICB9XG5cbiAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBmaWxlIGhlYWRlcnMgaWYgdGhleSBhcmUgZGVmaW5lZC4gVW5pZmllZCBkaWZmIHJlcXVpcmVzIHRoZW0sIGJ1dFxuICAgIC8vIHRoZXJlJ3Mgbm8gdGVjaG5pY2FsIGlzc3VlcyB0byBoYXZlIGFuIGlzb2xhdGVkIGh1bmsgd2l0aG91dCBmaWxlIGhlYWRlclxuICAgIHBhcnNlRmlsZUhlYWRlcihpbmRleCk7XG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGh1bmtzXG4gICAgaW5kZXguaHVua3MgPSBbXTtcblxuICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgIGxldCBsaW5lID0gZGlmZnN0cltpXTtcblxuICAgICAgaWYgKC9eKEluZGV4OnxkaWZmfFxcLVxcLVxcLXxcXCtcXCtcXCspXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmICgvXkBALy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGluZGV4Lmh1bmtzLnB1c2gocGFyc2VIdW5rKCkpO1xuICAgICAgfSBlbHNlIGlmIChsaW5lICYmIG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICAgIC8vIElnbm9yZSB1bmV4cGVjdGVkIGNvbnRlbnQgdW5sZXNzIGluIHN0cmljdCBtb2RlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsaW5lICcgKyAoaSArIDEpICsgJyAnICsgSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyB0aGUgLS0tIGFuZCArKysgaGVhZGVycywgaWYgbm9uZSBhcmUgZm91bmQsIG5vIGxpbmVzXG4gIC8vIGFyZSBjb25zdW1lZC5cbiAgZnVuY3Rpb24gcGFyc2VGaWxlSGVhZGVyKGluZGV4KSB7XG4gICAgbGV0IGZpbGVIZWFkZXIgPSAoL14oXFwtXFwtXFwtfFxcK1xcK1xcKylcXHMrKFxcUyspXFxzPyguKz8pXFxzKiQvKS5leGVjKGRpZmZzdHJbaV0pO1xuICAgIGlmIChmaWxlSGVhZGVyKSB7XG4gICAgICBsZXQga2V5UHJlZml4ID0gZmlsZUhlYWRlclsxXSA9PT0gJy0tLScgPyAnb2xkJyA6ICduZXcnO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0ZpbGVOYW1lJ10gPSBmaWxlSGVhZGVyWzJdO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0hlYWRlciddID0gZmlsZUhlYWRlclszXTtcblxuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyBhIGh1bmtcbiAgLy8gVGhpcyBhc3N1bWVzIHRoYXQgd2UgYXJlIGF0IHRoZSBzdGFydCBvZiBhIGh1bmsuXG4gIGZ1bmN0aW9uIHBhcnNlSHVuaygpIHtcbiAgICBsZXQgY2h1bmtIZWFkZXJJbmRleCA9IGksXG4gICAgICAgIGNodW5rSGVhZGVyTGluZSA9IGRpZmZzdHJbaSsrXSxcbiAgICAgICAgY2h1bmtIZWFkZXIgPSBjaHVua0hlYWRlckxpbmUuc3BsaXQoL0BAIC0oXFxkKykoPzosKFxcZCspKT8gXFwrKFxcZCspKD86LChcXGQrKSk/IEBALyk7XG5cbiAgICBsZXQgaHVuayA9IHtcbiAgICAgIG9sZFN0YXJ0OiArY2h1bmtIZWFkZXJbMV0sXG4gICAgICBvbGRMaW5lczogK2NodW5rSGVhZGVyWzJdIHx8IDEsXG4gICAgICBuZXdTdGFydDogK2NodW5rSGVhZGVyWzNdLFxuICAgICAgbmV3TGluZXM6ICtjaHVua0hlYWRlcls0XSB8fCAxLFxuICAgICAgbGluZXM6IFtdXG4gICAgfTtcblxuICAgIGxldCBhZGRDb3VudCA9IDAsXG4gICAgICAgIHJlbW92ZUNvdW50ID0gMDtcbiAgICBmb3IgKDsgaSA8IGRpZmZzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBvcGVyYXRpb24gPSBkaWZmc3RyW2ldWzBdO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnKycgfHwgb3BlcmF0aW9uID09PSAnLScgfHwgb3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgaHVuay5saW5lcy5wdXNoKGRpZmZzdHJbaV0pO1xuXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICAgIGFkZENvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdGhlIGVtcHR5IGJsb2NrIGNvdW50IGNhc2VcbiAgICBpZiAoIWFkZENvdW50ICYmIGh1bmsubmV3TGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsubmV3TGluZXMgPSAwO1xuICAgIH1cbiAgICBpZiAoIXJlbW92ZUNvdW50ICYmIGh1bmsub2xkTGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsub2xkTGluZXMgPSAwO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gb3B0aW9uYWwgc2FuaXR5IGNoZWNraW5nXG4gICAgaWYgKG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICBpZiAoYWRkQ291bnQgIT09IGh1bmsubmV3TGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBZGRlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICB9XG4gICAgICBpZiAocmVtb3ZlQ291bnQgIT09IGh1bmsub2xkTGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZW1vdmVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaHVuaztcbiAgfVxuXG4gIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICBwYXJzZUluZGV4KCk7XG4gIH1cblxuICByZXR1cm4gbGlzdDtcbn1cbiIsIi8vIEl0ZXJhdG9yIHRoYXQgdHJhdmVyc2VzIGluIHRoZSByYW5nZSBvZiBbbWluLCBtYXhdLCBzdGVwcGluZ1xuLy8gYnkgZGlzdGFuY2UgZnJvbSBhIGdpdmVuIHN0YXJ0IHBvc2l0aW9uLiBJLmUuIGZvciBbMCwgNF0sIHdpdGhcbi8vIHN0YXJ0IG9mIDIsIHRoaXMgd2lsbCBpdGVyYXRlIDIsIDMsIDEsIDQsIDAuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgbWluTGluZSwgbWF4TGluZSkge1xuICBsZXQgd2FudEZvcndhcmQgPSB0cnVlLFxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGxvY2FsT2Zmc2V0ID0gMTtcblxuICByZXR1cm4gZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgaWYgKHdhbnRGb3J3YXJkICYmICFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgbG9jYWxPZmZzZXQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmV5b25kIHRleHQgbGVuZ3RoLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBhZnRlciBvZmZzZXQgbG9jYXRpb24gKG9yIGRlc2lyZWQgbG9jYXRpb24gb24gZmlyc3QgaXRlcmF0aW9uKVxuICAgICAgaWYgKHN0YXJ0ICsgbG9jYWxPZmZzZXQgPD0gbWF4TGluZSkge1xuICAgICAgICByZXR1cm4gbG9jYWxPZmZzZXQ7XG4gICAgICB9XG5cbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmICghZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmVmb3JlIHRleHQgYmVnaW5uaW5nLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBiZWZvcmUgb2Zmc2V0IGxvY2F0aW9uXG4gICAgICBpZiAobWluTGluZSA8PSBzdGFydCAtIGxvY2FsT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiAtbG9jYWxPZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yKCk7XG4gICAgfVxuXG4gICAgLy8gV2UgdHJpZWQgdG8gZml0IGh1bmsgYmVmb3JlIHRleHQgYmVnaW5uaW5nIGFuZCBiZXlvbmQgdGV4dCBsZW5naHQsIHRoZW5cbiAgICAvLyBodW5rIGNhbid0IGZpdCBvbiB0aGUgdGV4dC4gUmV0dXJuIHVuZGVmaW5lZFxuICB9O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0cykge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBkZWZhdWx0cy5jYWxsYmFjayA9IG9wdGlvbnM7XG4gIH0gZWxzZSBpZiAob3B0aW9ucykge1xuICAgIGZvciAobGV0IG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRzO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBsY3MgPSByZXF1aXJlKCcuL2xpYi9sY3MnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vbGliL2FycmF5Jyk7XG52YXIgcGF0Y2ggPSByZXF1aXJlKCcuL2xpYi9qc29uUGF0Y2gnKTtcbnZhciBpbnZlcnNlID0gcmVxdWlyZSgnLi9saWIvaW52ZXJzZScpO1xudmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9saWIvanNvblBvaW50ZXInKTtcbnZhciBlbmNvZGVTZWdtZW50ID0ganNvblBvaW50ZXIuZW5jb2RlU2VnbWVudDtcblxuZXhwb3J0cy5kaWZmID0gZGlmZjtcbmV4cG9ydHMucGF0Y2ggPSBwYXRjaC5hcHBseTtcbmV4cG9ydHMucGF0Y2hJblBsYWNlID0gcGF0Y2guYXBwbHlJblBsYWNlO1xuZXhwb3J0cy5pbnZlcnNlID0gaW52ZXJzZTtcbmV4cG9ydHMuY2xvbmUgPSBwYXRjaC5jbG9uZTtcblxuLy8gRXJyb3JzXG5leHBvcnRzLkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9saWIvSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbmV4cG9ydHMuVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9saWIvVGVzdEZhaWxlZEVycm9yJyk7XG5leHBvcnRzLlBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9saWIvUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGlzVmFsaWRPYmplY3QgPSBwYXRjaC5pc1ZhbGlkT2JqZWN0O1xudmFyIGRlZmF1bHRIYXNoID0gcGF0Y2guZGVmYXVsdEhhc2g7XG5cbi8qKlxuICogQ29tcHV0ZSBhIEpTT04gUGF0Y2ggcmVwcmVzZW50aW5nIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGEgYW5kIGIuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBpZiBhIGZ1bmN0aW9uLCBzZWUgb3B0aW9ucy5oYXNoXG4gKiBAcGFyYW0gez9mdW5jdGlvbih4OiopOlN0cmluZ3xOdW1iZXJ9IG9wdGlvbnMuaGFzaCB1c2VkIHRvIGhhc2ggYXJyYXkgaXRlbXNcbiAqICBpbiBvcmRlciB0byByZWNvZ25pemUgaWRlbnRpY2FsIG9iamVjdHMsIGRlZmF1bHRzIHRvIEpTT04uc3RyaW5naWZ5XG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5KTpvYmplY3R9IG9wdGlvbnMubWFrZUNvbnRleHRcbiAqICB1c2VkIHRvIGdlbmVyYXRlIHBhdGNoIGNvbnRleHQuIElmIG5vdCBwcm92aWRlZCwgY29udGV4dCB3aWxsIG5vdCBiZSBnZW5lcmF0ZWRcbiAqIEByZXR1cm5zIHthcnJheX0gSlNPTiBQYXRjaCBzdWNoIHRoYXQgcGF0Y2goZGlmZihhLCBiKSwgYSkgfiBiXG4gKi9cbmZ1bmN0aW9uIGRpZmYoYSwgYiwgb3B0aW9ucykge1xuXHRyZXR1cm4gYXBwZW5kQ2hhbmdlcyhhLCBiLCAnJywgaW5pdFN0YXRlKG9wdGlvbnMsIFtdKSkucGF0Y2g7XG59XG5cbi8qKlxuICogQ3JlYXRlIGluaXRpYWwgZGlmZiBzdGF0ZSBmcm9tIHRoZSBwcm92aWRlZCBvcHRpb25zXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIEBzZWUgZGlmZiBvcHRpb25zIGFib3ZlXG4gKiBAcGFyYW0ge2FycmF5fSBwYXRjaCBhbiBlbXB0eSBvciBleGlzdGluZyBKU09OIFBhdGNoIGFycmF5IGludG8gd2hpY2hcbiAqICB0aGUgZGlmZiBzaG91bGQgZ2VuZXJhdGUgbmV3IHBhdGNoIG9wZXJhdGlvbnNcbiAqIEByZXR1cm5zIHtvYmplY3R9IGluaXRpYWxpemVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gaW5pdFN0YXRlKG9wdGlvbnMsIHBhdGNoKSB7XG5cdGlmKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5oYXNoLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMubWFrZUNvbnRleHQsIGRlZmF1bHRDb250ZXh0KSxcblx0XHRcdGludmVydGlibGU6ICEob3B0aW9ucy5pbnZlcnRpYmxlID09PSBmYWxzZSlcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucywgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IGRlZmF1bHRDb250ZXh0LFxuXHRcdFx0aW52ZXJ0aWJsZTogdHJ1ZVxuXHRcdH07XG5cdH1cbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gSlNPTiB2YWx1ZXMgKG9iamVjdCwgYXJyYXksIG51bWJlciwgc3RyaW5nLCBldGMuKSwgZmluZCB0aGVpclxuICogZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZEFycmF5Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRpZihpc1ZhbGlkT2JqZWN0KGEpICYmIGlzVmFsaWRPYmplY3QoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kT2JqZWN0Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRyZXR1cm4gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gb2JqZWN0cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMVxuICogQHBhcmFtIHtvYmplY3R9IG8yXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kT2JqZWN0Q2hhbmdlcyhvMSwgbzIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMobzIpO1xuXHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0dmFyIGksIGtleTtcblxuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdHZhciBrZXlQYXRoID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRpZihvMVtrZXldICE9PSB2b2lkIDApIHtcblx0XHRcdGFwcGVuZENoYW5nZXMobzFba2V5XSwgbzJba2V5XSwga2V5UGF0aCwgc3RhdGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBrZXlQYXRoLCB2YWx1ZTogbzJba2V5XSB9KTtcblx0XHR9XG5cdH1cblxuXHRrZXlzID0gT2JqZWN0LmtleXMobzEpO1xuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdGlmKG8yW2tleV0gPT09IHZvaWQgMCkge1xuXHRcdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IG8xW2tleV0gfSk7XG5cdFx0XHR9XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwIH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYXJyYXlzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQXJyYXlDaGFuZ2VzKGExLCBhMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGExaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMSk7XG5cdHZhciBhMmhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTIpO1xuXG5cdHZhciBsY3NNYXRyaXggPSBsY3MuY29tcGFyZShhMWhhc2gsIGEyaGFzaCk7XG5cblx0cmV0dXJuIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGxjc01hdHJpeCBpbnRvIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhbmQgYXBwZW5kXG4gKiB0aGVtIHRvIHN0YXRlLnBhdGNoLCByZWN1cnNpbmcgaW50byBhcnJheSBlbGVtZW50cyBhcyBuZWNlc3NhcnlcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjc01hdHJpeFxuICogQHJldHVybnMge29iamVjdH0gbmV3IHN0YXRlIHdpdGggSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFkZGVkIGJhc2VkXG4gKiAgb24gdGhlIHByb3ZpZGVkIGxjc01hdHJpeFxuICovXG5mdW5jdGlvbiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpIHtcblx0dmFyIG9mZnNldCA9IDA7XG5cdHJldHVybiBsY3MucmVkdWNlKGZ1bmN0aW9uKHN0YXRlLCBvcCwgaSwgaikge1xuXHRcdHZhciBsYXN0LCBjb250ZXh0O1xuXHRcdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHRcdHZhciBwID0gcGF0aCArICcvJyArIChqICsgb2Zmc2V0KTtcblxuXHRcdGlmIChvcCA9PT0gbGNzLlJFTU9WRSkge1xuXHRcdFx0Ly8gQ29hbGVzY2UgYWRqYWNlbnQgcmVtb3ZlICsgYWRkIGludG8gcmVwbGFjZVxuXHRcdFx0bGFzdCA9IHBhdGNoW3BhdGNoLmxlbmd0aC0xXTtcblx0XHRcdGNvbnRleHQgPSBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSk7XG5cblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBhMVtqXSwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYobGFzdCAhPT0gdm9pZCAwICYmIGxhc3Qub3AgPT09ICdhZGQnICYmIGxhc3QucGF0aCA9PT0gcCkge1xuXHRcdFx0XHRsYXN0Lm9wID0gJ3JlcGxhY2UnO1xuXHRcdFx0XHRsYXN0LmNvbnRleHQgPSBjb250ZXh0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0b2Zmc2V0IC09IDE7XG5cblx0XHR9IGVsc2UgaWYgKG9wID09PSBsY3MuQUREKSB7XG5cdFx0XHQvLyBTZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDIjc2VjdGlvbi00LjFcblx0XHRcdC8vIE1heSB1c2UgZWl0aGVyIGluZGV4PT09bGVuZ3RoICpvciogJy0nIHRvIGluZGljYXRlIGFwcGVuZGluZyB0byBhcnJheVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcCwgdmFsdWU6IGEyW2ldLFxuXHRcdFx0XHRjb250ZXh0OiBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSlcblx0XHRcdH0pO1xuXG5cdFx0XHRvZmZzZXQgKz0gMTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKGExW2pdLCBhMltpXSwgcCwgc3RhdGUpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzdGF0ZTtcblxuXHR9LCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gbnVtYmVyfHN0cmluZ3xudWxsIHZhbHVlcywgaWYgdGhleSBkaWZmZXIsIGFwcGVuZCB0byBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtvYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoYSAhPT0gYikge1xuXHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYSB9KTtcblx0XHR9XG5cblx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcGF0aCwgdmFsdWU6IGIgfSk7XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7Kn0geVxuICogQHJldHVybnMgeyp9IHggaWYgcHJlZGljYXRlKHgpIGlzIHRydXRoeSwgb3RoZXJ3aXNlIHlcbiAqL1xuZnVuY3Rpb24gb3JFbHNlKHByZWRpY2F0ZSwgeCwgeSkge1xuXHRyZXR1cm4gcHJlZGljYXRlKHgpID8geCA6IHk7XG59XG5cbi8qKlxuICogRGVmYXVsdCBwYXRjaCBjb250ZXh0IGdlbmVyYXRvclxuICogQHJldHVybnMge3VuZGVmaW5lZH0gdW5kZWZpbmVkIGNvbnRleHRcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdENvbnRleHQoKSB7XG5cdHJldHVybiB2b2lkIDA7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcblx0cmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjtcblxuZnVuY3Rpb24gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7XG5cbmZ1bmN0aW9uIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFRlc3RGYWlsZWRFcnJvcjtcblxuZnVuY3Rpb24gVGVzdEZhaWxlZEVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRlc3RGYWlsZWRFcnJvcjsiLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb25zID0gY29ucztcbmV4cG9ydHMudGFpbCA9IHRhaWw7XG5leHBvcnRzLm1hcCA9IG1hcDtcblxuLyoqXG4gKiBQcmVwZW5kIHggdG8gYSwgd2l0aG91dCBtdXRhdGluZyBhLiBGYXN0ZXIgdGhhbiBhLnVuc2hpZnQoeClcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSB3aXRoIHggcHJlcGVuZGVkXG4gKi9cbmZ1bmN0aW9uIGNvbnMoeCwgYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKzEpO1xuXHRiWzBdID0geDtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpKzFdID0gYVtpXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBBcnJheSBjb250YWluaW5nIGFsbCBlbGVtZW50cyBpbiBhLCBleGNlcHQgdGhlIGZpcnN0LlxuICogIEZhc3RlciB0aGFuIGEuc2xpY2UoMSlcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXksIHRoZSBlcXVpdmFsZW50IG9mIGEuc2xpY2UoMSlcbiAqL1xuZnVuY3Rpb24gdGFpbChhKSB7XG5cdHZhciBsID0gYS5sZW5ndGgtMTtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCk7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaV0gPSBhW2krMV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBNYXAgYW55IGFycmF5LWxpa2UuIEZhc3RlciB0aGFuIEFycmF5LnByb3RvdHlwZS5tYXBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgbWFwcGVkIGJ5IGZcbiAqL1xuZnVuY3Rpb24gbWFwKGYsIGEpIHtcblx0dmFyIGIgPSBuZXcgQXJyYXkoYS5sZW5ndGgpO1xuXHRmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7ICsraSkge1xuXHRcdGJbaV0gPSBmKGFbaV0pO1xuXHR9XG5cdHJldHVybiBiO1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhIGRlZXAgY29weSBvZiB4IHdoaWNoIG11c3QgYmUgYSBsZWdhbCBKU09OIG9iamVjdC9hcnJheS92YWx1ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBjbG9uZVxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGNsb25lIG9mIHhcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcblxuZnVuY3Rpb24gY2xvbmUoeCkge1xuXHRpZih4ID09IG51bGwgfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0cmV0dXJuIGNsb25lQXJyYXkoeCk7XG5cdH1cblxuXHRyZXR1cm4gY2xvbmVPYmplY3QoeCk7XG59XG5cbmZ1bmN0aW9uIGNsb25lQXJyYXkgKHgpIHtcblx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0dmFyIHkgPSBuZXcgQXJyYXkobCk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHR5W2ldID0gY2xvbmUoeFtpXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cblxuZnVuY3Rpb24gY2xvbmVPYmplY3QgKHgpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh4KTtcblx0dmFyIHkgPSB7fTtcblxuXHRmb3IgKHZhciBrLCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0ayA9IGtleXNbaV07XG5cdFx0eVtrXSA9IGNsb25lKHhba10pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG5cbi8qKlxuICogY29tbXV0ZSB0aGUgcGF0Y2ggc2VxdWVuY2UgYSxiIHRvIGIsYVxuICogQHBhcmFtIHtvYmplY3R9IGEgcGF0Y2ggb3BlcmF0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gYiBwYXRjaCBvcGVyYXRpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21tdXRlUGF0aHMoYSwgYikge1xuXHQvLyBUT0RPOiBjYXNlcyBmb3Igc3BlY2lhbCBwYXRoczogJycgYW5kICcvJ1xuXHR2YXIgbGVmdCA9IGpzb25Qb2ludGVyLnBhcnNlKGEucGF0aCk7XG5cdHZhciByaWdodCA9IGpzb25Qb2ludGVyLnBhcnNlKGIucGF0aCk7XG5cdHZhciBwcmVmaXggPSBnZXRDb21tb25QYXRoUHJlZml4KGxlZnQsIHJpZ2h0KTtcblx0dmFyIGlzQXJyYXkgPSBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgcHJlZml4Lmxlbmd0aCk7XG5cblx0Ly8gTmV2ZXIgbXV0YXRlIHRoZSBvcmlnaW5hbHNcblx0dmFyIGFjID0gY29weVBhdGNoKGEpO1xuXHR2YXIgYmMgPSBjb3B5UGF0Y2goYik7XG5cblx0aWYocHJlZml4Lmxlbmd0aCA9PT0gMCAmJiAhaXNBcnJheSkge1xuXHRcdC8vIFBhdGhzIHNoYXJlIG5vIGNvbW1vbiBhbmNlc3Rvciwgc2ltcGxlIHN3YXBcblx0XHRyZXR1cm4gW2JjLCBhY107XG5cdH1cblxuXHRpZihpc0FycmF5KSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBjb21tdXRlVHJlZVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBjb21tdXRlVHJlZVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGEucGF0aCA9PT0gYi5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IGNvbW11dGUgJyArIGEub3AgKyAnLCcgKyBiLm9wICsgJyB3aXRoIGlkZW50aWNhbCBvYmplY3QgcGF0aHMnKTtcblx0fVxuXHQvLyBGSVhNRTogSW1wbGVtZW50IHRyZWUgcGF0aCBjb21tdXRhdGlvblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2hvc2UgY29tbW9uIGFuY2VzdG9yICh3aGljaCBtYXkgYmUgdGhlIGltbWVkaWF0ZSBwYXJlbnQpXG4gKiBpcyBhbiBhcnJheVxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBsZWZ0XG4gKiBAcGFyYW0gYlxuICogQHBhcmFtIHJpZ2h0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5UGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYobGVmdC5sZW5ndGggPT09IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlTaWJsaW5ncyhhLCBsZWZ0LCBiLCByaWdodCk7XG5cdH1cblxuXHRpZiAobGVmdC5sZW5ndGggPiByaWdodC5sZW5ndGgpIHtcblx0XHQvLyBsZWZ0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSByaWdodFxuXHRcdGxlZnQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihiLCByaWdodCwgYSwgbGVmdCwgLTEpO1xuXHRcdGEucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4obGVmdCkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIHJpZ2h0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSBsZWZ0XG5cdFx0cmlnaHQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihhLCBsZWZ0LCBiLCByaWdodCwgMSk7XG5cdFx0Yi5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihyaWdodCkpO1xuXHR9XG5cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIGluZGV4KSB7XG5cdHJldHVybiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChsZWZ0W2luZGV4XSlcblx0XHQmJiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChyaWdodFtpbmRleF0pO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgcmVmZXJyaW5nIHRvIGl0ZW1zIGluIHRoZSBzYW1lIGFycmF5XG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcmV0dXJucyB7KltdfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlTaWJsaW5ncyhsLCBscGF0aCwgciwgcnBhdGgpIHtcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdHZhciBjb21tdXRlZDtcblxuXHRpZihsaW5kZXggPCByaW5kZXgpIHtcblx0XHQvLyBBZGp1c3QgcmlnaHQgcGF0aFxuXHRcdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIDEpO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IHJpbmRleCArIDE7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoci5vcCA9PT0gJ2FkZCcgfHwgci5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gbGluZGV4ICsgMTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH0gZWxzZSBpZiAobGluZGV4ID4gcmluZGV4ICYmIHIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aCBvbmx5IGlmIHJlbW92ZSB3YXMgYXQgYSAoc3RyaWN0bHkpIGxvd2VyIGluZGV4XG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCBsaW5kZXggLSAxKTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH1cblxuXHRyZXR1cm4gW3IsIGxdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2l0aCBhIGNvbW1vbiBhcnJheSBhbmNlc3RvclxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHBhcmFtIGRpcmVjdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheUFuY2VzdG9yKGwsIGxwYXRoLCByLCBycGF0aCwgZGlyZWN0aW9uKSB7XG5cdC8vIHJwYXRoIGlzIGxvbmdlciBvciBzYW1lIGxlbmd0aFxuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0Ly8gQ29weSBycGF0aCwgdGhlbiBhZGp1c3QgaXRzIGFycmF5IGluZGV4XG5cdHZhciByYyA9IHJwYXRoLnNsaWNlKCk7XG5cblx0aWYobGluZGV4ID4gcmluZGV4KSB7XG5cdFx0cmV0dXJuIHJjO1xuXHR9XG5cblx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIGRpcmVjdGlvbik7XG5cdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggKyBkaXJlY3Rpb24pO1xuXHR9XG5cblx0cmV0dXJuIHJjO1xufVxuXG5mdW5jdGlvbiBnZXRDb21tb25QYXRoUHJlZml4KHAxLCBwMikge1xuXHR2YXIgcDFsID0gcDEubGVuZ3RoO1xuXHR2YXIgcDJsID0gcDIubGVuZ3RoO1xuXHRpZihwMWwgPT09IDAgfHwgcDJsID09PSAwIHx8IChwMWwgPCAyICYmIHAybCA8IDIpKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG5cblx0Ly8gSWYgcGF0aHMgYXJlIHNhbWUgbGVuZ3RoLCB0aGUgbGFzdCBzZWdtZW50IGNhbm5vdCBiZSBwYXJ0XG5cdC8vIG9mIGEgY29tbW9uIHByZWZpeC4gIElmIG5vdCB0aGUgc2FtZSBsZW5ndGgsIHRoZSBwcmVmaXggY2Fubm90XG5cdC8vIGJlIGxvbmdlciB0aGFuIHRoZSBzaG9ydGVyIHBhdGguXG5cdHZhciBsID0gcDFsID09PSBwMmxcblx0XHQ/IHAxbCAtIDFcblx0XHQ6IE1hdGgubWluKHAxbCwgcDJsKTtcblxuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIHAxW2ldID09PSBwMltpXSkge1xuXHRcdCsraVxuXHR9XG5cblx0cmV0dXJuIHAxLnNsaWNlKDAsIGkpO1xufVxuXG5mdW5jdGlvbiBjb3B5UGF0Y2gocCkge1xuXHRpZihwLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGggfTtcblx0fVxuXG5cdGlmKHAub3AgPT09ICdjb3B5JyB8fCBwLm9wID09PSAnbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCBmcm9tOiBwLmZyb20gfTtcblx0fVxuXG5cdC8vIHRlc3QsIGFkZCwgcmVwbGFjZVxuXHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCB2YWx1ZTogcC52YWx1ZSB9O1xufSIsIm1vZHVsZS5leHBvcnRzID0gZGVlcEVxdWFscztcblxuLyoqXG4gKiBDb21wYXJlIDIgSlNPTiB2YWx1ZXMsIG9yIHJlY3Vyc2l2ZWx5IGNvbXBhcmUgMiBKU09OIG9iamVjdHMgb3IgYXJyYXlzXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGJcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBhIGFuZCBiIGFyZSByZWN1cnNpdmVseSBlcXVhbFxuICovXG5mdW5jdGlvbiBkZWVwRXF1YWxzKGEsIGIpIHtcblx0aWYoYSA9PT0gYikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVBcnJheXMoYSwgYik7XG5cdH1cblxuXHRpZih0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVPYmplY3RzKGEsIGIpO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlQXJyYXlzKGEsIGIpIHtcblx0aWYoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMDsgaTxhLmxlbmd0aDsgKytpKSB7XG5cdFx0aWYoIWRlZXBFcXVhbHMoYVtpXSwgYltpXSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZU9iamVjdHMoYSwgYikge1xuXHRpZigoYSA9PT0gbnVsbCAmJiBiICE9PSBudWxsKSB8fCAoYSAhPT0gbnVsbCAmJiBiID09PSBudWxsKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBha2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuXHR2YXIgYmtleXMgPSBPYmplY3Qua2V5cyhiKTtcblxuXHRpZihha2V5cy5sZW5ndGggIT09IGJrZXlzLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDAsIGs7IGk8YWtleXMubGVuZ3RoOyArK2kpIHtcblx0XHRrID0gYWtleXNbaV07XG5cdFx0aWYoIShrIGluIGIgJiYgZGVlcEVxdWFscyhhW2tdLCBiW2tdKSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn0iLCJ2YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGludmVyc2UocCkge1xuXHR2YXIgcHIgPSBbXTtcblx0dmFyIGksIHNraXA7XG5cdGZvcihpID0gcC5sZW5ndGgtMTsgaT49IDA7IGkgLT0gc2tpcCkge1xuXHRcdHNraXAgPSBpbnZlcnRPcChwciwgcFtpXSwgaSwgcCk7XG5cdH1cblxuXHRyZXR1cm4gcHI7XG59O1xuXG5mdW5jdGlvbiBpbnZlcnRPcChwYXRjaCwgYywgaSwgY29udGV4dCkge1xuXHR2YXIgb3AgPSBwYXRjaGVzW2Mub3BdO1xuXHRyZXR1cm4gb3AgIT09IHZvaWQgMCAmJiB0eXBlb2Ygb3AuaW52ZXJzZSA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdD8gb3AuaW52ZXJzZShwYXRjaCwgYywgaSwgY29udGV4dClcblx0XHQ6IDE7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcblxuZXhwb3J0cy5hcHBseSA9IHBhdGNoO1xuZXhwb3J0cy5hcHBseUluUGxhY2UgPSBwYXRjaEluUGxhY2U7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmlzVmFsaWRPYmplY3QgPSBpc1ZhbGlkT2JqZWN0O1xuZXhwb3J0cy5kZWZhdWx0SGFzaCA9IGRlZmF1bHRIYXNoO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcblxuLyoqXG4gKiBBcHBseSB0aGUgc3VwcGxpZWQgSlNPTiBQYXRjaCB0byB4XG4gKiBAcGFyYW0ge2FycmF5fSBjaGFuZ2VzIEpTT04gUGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIHBhdGNoXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtmdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBvcHRpb25zLmZpbmRDb250ZXh0XG4gKiAgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dFxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSBwYXRjaGVkIHZlcnNpb24gb2YgeC4gSWYgeCBpc1xuICogIGFuIGFycmF5IG9yIG9iamVjdCwgaXQgd2lsbCBiZSBtdXRhdGVkIGFuZCByZXR1cm5lZC4gT3RoZXJ3aXNlLCBpZlxuICogIHggaXMgYSB2YWx1ZSwgdGhlIG5ldyB2YWx1ZSB3aWxsIGJlIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBwYXRjaChjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdHJldHVybiBwYXRjaEluUGxhY2UoY2hhbmdlcywgY2xvbmUoeCksIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwYXRjaEluUGxhY2UoY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRpZighb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblx0fVxuXG5cdC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGlmIGNoYW5nZXMgaXMgbm90IGFuIGFycmF5XG5cdGlmKCFBcnJheS5pc0FycmF5KGNoYW5nZXMpKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHR2YXIgcGF0Y2gsIHA7XG5cdGZvcih2YXIgaT0wOyBpPGNoYW5nZXMubGVuZ3RoOyArK2kpIHtcblx0XHRwID0gY2hhbmdlc1tpXTtcblx0XHRwYXRjaCA9IHBhdGNoZXNbcC5vcF07XG5cblx0XHRpZihwYXRjaCA9PT0gdm9pZCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2ludmFsaWQgb3AgJyArIEpTT04uc3RyaW5naWZ5KHApKTtcblx0XHR9XG5cblx0XHR4ID0gcGF0Y2guYXBwbHkoeCwgcCwgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEhhc2goeCkge1xuXHRyZXR1cm4gaXNWYWxpZE9iamVjdCh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogeDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBfcGFyc2UgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyUGFyc2UnKTtcblxuZXhwb3J0cy5maW5kID0gZmluZDtcbmV4cG9ydHMuam9pbiA9IGpvaW47XG5leHBvcnRzLmFic29sdXRlID0gYWJzb2x1dGU7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5leHBvcnRzLmNvbnRhaW5zID0gY29udGFpbnM7XG5leHBvcnRzLmVuY29kZVNlZ21lbnQgPSBlbmNvZGVTZWdtZW50O1xuZXhwb3J0cy5kZWNvZGVTZWdtZW50ID0gZGVjb2RlU2VnbWVudDtcbmV4cG9ydHMucGFyc2VBcnJheUluZGV4ID0gcGFyc2VBcnJheUluZGV4O1xuZXhwb3J0cy5pc1ZhbGlkQXJyYXlJbmRleCA9IGlzVmFsaWRBcnJheUluZGV4O1xuXG4vLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtMlxudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBzZXBhcmF0b3JSeCA9IC9cXC8vZztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcbnZhciBlbmNvZGVkU2VwYXJhdG9yUnggPSAvfjEvZztcblxudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZXNjYXBlUnggPSAvfi9nO1xudmFyIGVuY29kZWRFc2NhcGUgPSAnfjAnO1xudmFyIGVuY29kZWRFc2NhcGVSeCA9IC9+MC9nO1xuXG4vKipcbiAqIEZpbmQgdGhlIHBhcmVudCBvZiB0aGUgc3BlY2lmaWVkIHBhdGggaW4geCBhbmQgcmV0dXJuIGEgZGVzY3JpcHRvclxuICogY29udGFpbmluZyB0aGUgcGFyZW50IGFuZCBhIGtleS4gIElmIHRoZSBwYXJlbnQgZG9lcyBub3QgZXhpc3QgaW4geCxcbiAqIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geCBvYmplY3Qgb3IgYXJyYXkgaW4gd2hpY2ggdG8gc2VhcmNoXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBKU09OIFBvaW50ZXIgc3RyaW5nIChlbmNvZGVkKVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gZmluZENvbnRleHRcbiAqICBvcHRpb25hbCBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0LiAgSWYgcHJvdmlkZWQsIGNvbnRleHQgTVVTVCBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHBhcmFtIHs/e2JlZm9yZTpBcnJheSwgYWZ0ZXI6QXJyYXl9fSBjb250ZXh0IG9wdGlvbmFsIHBhdGNoIGNvbnRleHQgZm9yXG4gKiAgZmluZENvbnRleHQgdG8gdXNlIHRvIGFkanVzdCBhcnJheSBpbmRpY2VzLiAgSWYgcHJvdmlkZWQsIGZpbmRDb250ZXh0IE1VU1RcbiAqICBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHJldHVybnMge3t0YXJnZXQ6b2JqZWN0fGFycmF5fG51bWJlcnxzdHJpbmcsIGtleTpzdHJpbmd9fHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZCh4LCBwYXRoLCBmaW5kQ29udGV4dCwgY29udGV4dCkge1xuXHRpZih0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZihwYXRoID09PSAnJykge1xuXHRcdC8vIHdob2xlIGRvY3VtZW50XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6IHZvaWQgMCB9O1xuXHR9XG5cblx0aWYocGF0aCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6ICcnIH07XG5cdH1cblxuXHR2YXIgcGFyZW50ID0geCwga2V5O1xuXHR2YXIgaGFzQ29udGV4dCA9IGNvbnRleHQgIT09IHZvaWQgMDtcblxuXHRfcGFyc2UocGF0aCwgZnVuY3Rpb24oc2VnbWVudCkge1xuXHRcdC8vIGhtLi4uIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQgYmUgaWYodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKVxuXHRcdGlmKHggPT0gbnVsbCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRoYXQgd2UgcHJlbWF0dXJlbHkgaGl0IHRoZSBlbmQgb2YgdGhlIHBhdGggaGllcmFyY2h5LlxuXHRcdFx0cGFyZW50ID0gbnVsbDtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0XHRrZXkgPSBoYXNDb250ZXh0XG5cdFx0XHRcdD8gZmluZEluZGV4KGZpbmRDb250ZXh0LCBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCksIHgsIGNvbnRleHQpXG5cdFx0XHRcdDogc2VnbWVudCA9PT0gJy0nID8gc2VnbWVudCA6IHBhcnNlQXJyYXlJbmRleChzZWdtZW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0a2V5ID0gc2VnbWVudDtcblx0XHR9XG5cblx0XHRwYXJlbnQgPSB4O1xuXHRcdHggPSB4W2tleV07XG5cdH0pO1xuXG5cdHJldHVybiBwYXJlbnQgPT09IG51bGxcblx0XHQ/IHZvaWQgMFxuXHRcdDogeyB0YXJnZXQ6IHBhcmVudCwga2V5OiBrZXkgfTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGUocGF0aCkge1xuXHRyZXR1cm4gcGF0aFswXSA9PT0gc2VwYXJhdG9yID8gcGF0aCA6IHNlcGFyYXRvciArIHBhdGg7XG59XG5cbmZ1bmN0aW9uIGpvaW4oc2VnbWVudHMpIHtcblx0cmV0dXJuIHNlZ21lbnRzLmpvaW4oc2VwYXJhdG9yKTtcbn1cblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuXHR2YXIgc2VnbWVudHMgPSBbXTtcblx0X3BhcnNlKHBhdGgsIHNlZ21lbnRzLnB1c2guYmluZChzZWdtZW50cykpO1xuXHRyZXR1cm4gc2VnbWVudHM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKGEsIGIpIHtcblx0cmV0dXJuIGIuaW5kZXhPZihhKSA9PT0gMCAmJiBiW2EubGVuZ3RoXSA9PT0gc2VwYXJhdG9yO1xufVxuXG4vKipcbiAqIERlY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGVuY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZGVjb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGRlY29kZVNlZ21lbnQocykge1xuXHQvLyBTZWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG5cdHJldHVybiBzLnJlcGxhY2UoZW5jb2RlZFNlcGFyYXRvclJ4LCBzZXBhcmF0b3IpLnJlcGxhY2UoZW5jb2RlZEVzY2FwZVJ4LCBlc2NhcGVDaGFyKTtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBkZWNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGVuY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBlbmNvZGVTZWdtZW50KHMpIHtcblx0cmV0dXJuIHMucmVwbGFjZShlc2NhcGVSeCwgZW5jb2RlZEVzY2FwZSkucmVwbGFjZShzZXBhcmF0b3JSeCwgZW5jb2RlZFNlcGFyYXRvcik7XG59XG5cbnZhciBhcnJheUluZGV4UnggPSAvXigwfFsxLTldXFxkKikkLztcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiBzIGlzIGEgdmFsaWQgSlNPTiBQb2ludGVyIGFycmF5IGluZGV4XG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4KHMpIHtcblx0cmV0dXJuIGFycmF5SW5kZXhSeC50ZXN0KHMpO1xufVxuXG4vKipcbiAqIFNhZmVseSBwYXJzZSBhIHN0cmluZyBpbnRvIGEgbnVtYmVyID49IDAuIERvZXMgbm90IGNoZWNrIGZvciBkZWNpbWFsIG51bWJlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIG51bWVyaWMgc3RyaW5nXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBudW1iZXIgPj0gMFxuICovXG5mdW5jdGlvbiBwYXJzZUFycmF5SW5kZXggKHMpIHtcblx0aWYoaXNWYWxpZEFycmF5SW5kZXgocykpIHtcblx0XHRyZXR1cm4gK3M7XG5cdH1cblxuXHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2ludmFsaWQgYXJyYXkgaW5kZXggJyArIHMpO1xufVxuXG5mdW5jdGlvbiBmaW5kSW5kZXggKGZpbmRDb250ZXh0LCBzdGFydCwgYXJyYXksIGNvbnRleHQpIHtcblx0dmFyIGluZGV4ID0gc3RhcnQ7XG5cblx0aWYoaW5kZXggPCAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdhcnJheSBpbmRleCBvdXQgb2YgYm91bmRzICcgKyBpbmRleCk7XG5cdH1cblxuXHRpZihjb250ZXh0ICE9PSB2b2lkIDAgJiYgdHlwZW9mIGZpbmRDb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aW5kZXggPSBmaW5kQ29udGV4dChzdGFydCwgYXJyYXksIGNvbnRleHQpO1xuXHRcdGlmKGluZGV4IDwgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBwYXRjaCBjb250ZXh0ICcgKyBjb250ZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5kZXg7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbm1vZHVsZS5leHBvcnRzID0ganNvblBvaW50ZXJQYXJzZTtcblxudmFyIHBhcnNlUnggPSAvXFwvfH4xfH4wL2c7XG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG5cbi8qKlxuICogUGFyc2UgdGhyb3VnaCBhbiBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmcsIGRlY29kaW5nIGVhY2ggcGF0aCBzZWdtZW50XG4gKiBhbmQgcGFzc2luZyBpdCB0byBhbiBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3NlY3Rpb24tNFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nXG4gKiBAcGFyYW0ge3tmdW5jdGlvbihzZWdtZW50OnN0cmluZyk6Ym9vbGVhbn19IG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMge3N0cmluZ30gb3JpZ2luYWwgcGF0aFxuICovXG5mdW5jdGlvbiBqc29uUG9pbnRlclBhcnNlKHBhdGgsIG9uU2VnbWVudCkge1xuXHR2YXIgcG9zLCBhY2N1bSwgbWF0Y2hlcywgbWF0Y2g7XG5cblx0cG9zID0gcGF0aC5jaGFyQXQoMCkgPT09IHNlcGFyYXRvciA/IDEgOiAwO1xuXHRhY2N1bSA9ICcnO1xuXHRwYXJzZVJ4Lmxhc3RJbmRleCA9IHBvcztcblxuXHR3aGlsZShtYXRjaGVzID0gcGFyc2VSeC5leGVjKHBhdGgpKSB7XG5cblx0XHRtYXRjaCA9IG1hdGNoZXNbMF07XG5cdFx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MsIHBhcnNlUngubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcblx0XHRwb3MgPSBwYXJzZVJ4Lmxhc3RJbmRleDtcblxuXHRcdGlmKG1hdGNoID09PSBzZXBhcmF0b3IpIHtcblx0XHRcdGlmIChvblNlZ21lbnQoYWNjdW0pID09PSBmYWxzZSkgcmV0dXJuIHBhdGg7XG5cdFx0XHRhY2N1bSA9ICcnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhY2N1bSArPSBtYXRjaCA9PT0gZW5jb2RlZFNlcGFyYXRvciA/IHNlcGFyYXRvciA6IGVzY2FwZUNoYXI7XG5cdFx0fVxuXHR9XG5cblx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MpO1xuXHRvblNlZ21lbnQoYWNjdW0pO1xuXG5cdHJldHVybiBwYXRoO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29tcGFyZSA9IGNvbXBhcmU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcblxudmFyIFJFTU9WRSwgUklHSFQsIEFERCwgRE9XTiwgU0tJUDtcblxuZXhwb3J0cy5SRU1PVkUgPSBSRU1PVkUgPSBSSUdIVCA9IC0xO1xuZXhwb3J0cy5BREQgICAgPSBBREQgICAgPSBET1dOICA9ICAxO1xuZXhwb3J0cy5FUVVBTCAgPSBTS0lQICAgPSAwO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBsY3MgY29tcGFyaXNvbiBtYXRyaXggZGVzY3JpYmluZyB0aGUgZGlmZmVyZW5jZXNcbiAqIGJldHdlZW4gdHdvIGFycmF5LWxpa2Ugc2VxdWVuY2VzXG4gKiBAcGFyYW0ge2FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEBwYXJhbSB7YXJyYXl9IGIgYXJyYXktbGlrZVxuICogQHJldHVybnMge29iamVjdH0gbGNzIGRlc2NyaXB0b3IsIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHJlZHVjZSgpXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuXHR2YXIgY29scyA9IGEubGVuZ3RoO1xuXHR2YXIgcm93cyA9IGIubGVuZ3RoO1xuXG5cdHZhciBwcmVmaXggPSBmaW5kUHJlZml4KGEsIGIpO1xuXHR2YXIgc3VmZml4ID0gcHJlZml4IDwgY29scyAmJiBwcmVmaXggPCByb3dzXG5cdFx0PyBmaW5kU3VmZml4KGEsIGIsIHByZWZpeClcblx0XHQ6IDA7XG5cblx0dmFyIHJlbW92ZSA9IHN1ZmZpeCArIHByZWZpeCAtIDE7XG5cdGNvbHMgLT0gcmVtb3ZlO1xuXHRyb3dzIC09IHJlbW92ZTtcblx0dmFyIG1hdHJpeCA9IGNyZWF0ZU1hdHJpeChjb2xzLCByb3dzKTtcblxuXHRmb3IgKHZhciBqID0gY29scyAtIDE7IGogPj0gMDsgLS1qKSB7XG5cdFx0Zm9yICh2YXIgaSA9IHJvd3MgLSAxOyBpID49IDA7IC0taSkge1xuXHRcdFx0bWF0cml4W2ldW2pdID0gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgcHJlZml4LCBqLCBpKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHByZWZpeDogcHJlZml4LFxuXHRcdG1hdHJpeDogbWF0cml4LFxuXHRcdHN1ZmZpeDogc3VmZml4XG5cdH07XG59XG5cbi8qKlxuICogUmVkdWNlIGEgc2V0IG9mIGxjcyBjaGFuZ2VzIHByZXZpb3VzbHkgY3JlYXRlZCB1c2luZyBjb21wYXJlXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB0eXBlOm51bWJlciwgaTpudW1iZXIsIGo6bnVtYmVyKX0gZlxuICogIHJlZHVjZXIgZnVuY3Rpb24sIHdoZXJlOlxuICogIC0gcmVzdWx0IGlzIHRoZSBjdXJyZW50IHJlZHVjZSB2YWx1ZSxcbiAqICAtIHR5cGUgaXMgdGhlIHR5cGUgb2YgY2hhbmdlOiBBREQsIFJFTU9WRSwgb3IgU0tJUFxuICogIC0gaSBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBiXG4gKiAgLSBqIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGFcbiAqIEBwYXJhbSB7Kn0gciBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzIHJlc3VsdHMgcmV0dXJuZWQgYnkgY29tcGFyZSgpXG4gKiBAcmV0dXJucyB7Kn0gdGhlIGZpbmFsIHJlZHVjZWQgdmFsdWVcbiAqL1xuZnVuY3Rpb24gcmVkdWNlKGYsIHIsIGxjcykge1xuXHR2YXIgaSwgaiwgaywgb3A7XG5cblx0dmFyIG0gPSBsY3MubWF0cml4O1xuXG5cdC8vIFJlZHVjZSBzaGFyZWQgcHJlZml4XG5cdHZhciBsID0gbGNzLnByZWZpeDtcblx0Zm9yKGkgPSAwO2kgPCBsOyArK2kpIHtcblx0XHRyID0gZihyLCBTS0lQLCBpLCBpKTtcblx0fVxuXG5cdC8vIFJlZHVjZSBsb25nZXN0IGNoYW5nZSBzcGFuXG5cdGsgPSBpO1xuXHRsID0gbS5sZW5ndGg7XG5cdGkgPSAwO1xuXHRqID0gMDtcblx0d2hpbGUoaSA8IGwpIHtcblx0XHRvcCA9IG1baV1bal0udHlwZTtcblx0XHRyID0gZihyLCBvcCwgaStrLCBqK2spO1xuXG5cdFx0c3dpdGNoKG9wKSB7XG5cdFx0XHRjYXNlIFNLSVA6ICArK2k7ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIFJJR0hUOiArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBET1dOOiAgKytpOyBicmVhaztcblx0XHR9XG5cdH1cblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHN1ZmZpeFxuXHRpICs9IGs7XG5cdGogKz0gaztcblx0bCA9IGxjcy5zdWZmaXg7XG5cdGZvcihrID0gMDtrIDwgbDsgKytrKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaStrLCBqK2spO1xuXHR9XG5cblx0cmV0dXJuIHI7XG59XG5cbmZ1bmN0aW9uIGZpbmRQcmVmaXgoYSwgYikge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBsID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcblx0d2hpbGUoaSA8IGwgJiYgYVtpXSA9PT0gYltpXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZmluZFN1ZmZpeChhLCBiKSB7XG5cdHZhciBhbCA9IGEubGVuZ3RoIC0gMTtcblx0dmFyIGJsID0gYi5sZW5ndGggLSAxO1xuXHR2YXIgbCA9IE1hdGgubWluKGFsLCBibCk7XG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgYVthbC1pXSA9PT0gYltibC1pXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgc3RhcnQsIGosIGkpIHtcblx0aWYgKGFbaitzdGFydF0gPT09IGJbaStzdGFydF0pIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqICsgMV0udmFsdWUsIHR5cGU6IFNLSVAgfTtcblx0fVxuXHRpZiAobWF0cml4W2ldW2ogKyAxXS52YWx1ZSA8IG1hdHJpeFtpICsgMV1bal0udmFsdWUpIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2ldW2ogKyAxXS52YWx1ZSArIDEsIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqXS52YWx1ZSArIDEsIHR5cGU6IERPV04gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWF0cml4IChjb2xzLCByb3dzKSB7XG5cdHZhciBtID0gW10sIGksIGosIGxhc3Ryb3c7XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCByb3dcblx0bGFzdHJvdyA9IG1bcm93c10gPSBbXTtcblx0Zm9yIChqID0gMDsgajxjb2xzOyArK2opIHtcblx0XHRsYXN0cm93W2pdID0geyB2YWx1ZTogY29scyAtIGosIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNvbFxuXHRmb3IgKGkgPSAwOyBpPHJvd3M7ICsraSkge1xuXHRcdG1baV0gPSBbXTtcblx0XHRtW2ldW2NvbHNdID0geyB2YWx1ZTogcm93cyAtIGksIHR5cGU6IERPV04gfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY2VsbFxuXHRtW3Jvd3NdW2NvbHNdID0geyB2YWx1ZTogMCwgdHlwZTogU0tJUCB9O1xuXG5cdHJldHVybiBtO1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIGRlZXBFcXVhbHMgPSByZXF1aXJlKCcuL2RlZXBFcXVhbHMnKTtcbnZhciBjb21tdXRlUGF0aHMgPSByZXF1aXJlKCcuL2NvbW11dGVQYXRocycpO1xuXG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5cbnZhciBUZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL1Rlc3RGYWlsZWRFcnJvcicpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xudmFyIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgZmluZCA9IGpzb25Qb2ludGVyLmZpbmQ7XG52YXIgcGFyc2VBcnJheUluZGV4ID0ganNvblBvaW50ZXIucGFyc2VBcnJheUluZGV4O1xuXG5leHBvcnRzLnRlc3QgPSB7XG5cdGFwcGx5OiBhcHBseVRlc3QsXG5cdGludmVyc2U6IGludmVydFRlc3QsXG5cdGNvbW11dGU6IGNvbW11dGVUZXN0XG59O1xuXG5leHBvcnRzLmFkZCA9IHtcblx0YXBwbHk6IGFwcGx5QWRkLFxuXHRpbnZlcnNlOiBpbnZlcnRBZGQsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbmV4cG9ydHMucmVtb3ZlID0ge1xuXHRhcHBseTogYXBwbHlSZW1vdmUsXG5cdGludmVyc2U6IGludmVydFJlbW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlbW92ZVxufTtcblxuZXhwb3J0cy5yZXBsYWNlID0ge1xuXHRhcHBseTogYXBwbHlSZXBsYWNlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZXBsYWNlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVwbGFjZVxufTtcblxuZXhwb3J0cy5tb3ZlID0ge1xuXHRhcHBseTogYXBwbHlNb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRNb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlTW92ZVxufTtcblxuZXhwb3J0cy5jb3B5ID0ge1xuXHRhcHBseTogYXBwbHlDb3B5LFxuXHRpbnZlcnNlOiBub3RJbnZlcnRpYmxlLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgdGVzdCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0IHRlc3Qgb3BlcmF0aW9uXG4gKiBAdGhyb3dzIHtUZXN0RmFpbGVkRXJyb3J9IGlmIHRoZSB0ZXN0IG9wZXJhdGlvbiBmYWlsc1xuICovXG5cbmZ1bmN0aW9uIGFwcGx5VGVzdCh4LCB0ZXN0LCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCB0ZXN0LnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIHRlc3QuY29udGV4dCk7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblx0dmFyIGluZGV4LCB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRpbmRleCA9IHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSk7XG5cdFx0Ly9pbmRleCA9IGZpbmRJbmRleChvcHRpb25zLmZpbmRDb250ZXh0LCBpbmRleCwgdGFyZ2V0LCB0ZXN0LmNvbnRleHQpO1xuXHRcdHZhbHVlID0gdGFyZ2V0W2luZGV4XTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHBvaW50ZXIua2V5ID09PSB2b2lkIDAgPyBwb2ludGVyLnRhcmdldCA6IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0fVxuXG5cdGlmKCFkZWVwRXF1YWxzKHZhbHVlLCB0ZXN0LnZhbHVlKSkge1xuXHRcdHRocm93IG5ldyBUZXN0RmFpbGVkRXJyb3IoJ3Rlc3QgZmFpbGVkICcgKyBKU09OLnN0cmluZ2lmeSh0ZXN0KSk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuLyoqXG4gKiBJbnZlcnQgdGhlIHByb3ZpZGVkIHRlc3QgYW5kIGFkZCBpdCB0byB0aGUgaW52ZXJ0ZWQgcGF0Y2ggc2VxdWVuY2VcbiAqIEBwYXJhbSBwclxuICogQHBhcmFtIHRlc3RcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGludmVydFRlc3QocHIsIHRlc3QpIHtcblx0cHIucHVzaCh0ZXN0KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVUZXN0KHRlc3QsIGIpIHtcblx0aWYodGVzdC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgdGVzdCxyZW1vdmUgLT4gcmVtb3ZlLHRlc3QgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgdGVzdF07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHRlc3QsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGFuIGFkZCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgYWRkIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUFkZCh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWwgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsO1xuXHR9XG5cblx0X2FkZChwb2ludGVyLCB2YWwpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX2FkZChwb2ludGVyLCB2YWx1ZSkge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0Ly8gJy0nIGluZGljYXRlcyAnYXBwZW5kJyB0byBhcnJheVxuXHRcdGlmKHBvaW50ZXIua2V5ID09PSAnLScpIHtcblx0XHRcdHRhcmdldC5wdXNoKHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LnNwbGljZShwb2ludGVyLmtleSwgMCwgdmFsdWUpO1xuXHRcdH1cblx0fSBlbHNlIGlmKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiBhZGQgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXkgJyArIHBvaW50ZXIua2V5KTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRBZGQocHIsIGFkZCkge1xuXHR2YXIgY29udGV4dCA9IGFkZC5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKGFkZC52YWx1ZSwgY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IGFkZC5wYXRoLCB2YWx1ZTogYWRkLnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBhZGQucGF0aCwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVBZGRPckNvcHkoYWRkLCBiKSB7XG5cdGlmKGFkZC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgYWRkLHJlbW92ZSAtPiByZW1vdmUsYWRkIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMoYWRkLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlcGxhY2Ugb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlcGxhY2Ugb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVwbGFjZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgbWlzc2luZ1ZhbHVlKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsdWUgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydFJlcGxhY2UocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZXBsYWNlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhwcmV2LnZhbHVlLCBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBjLnZhbHVlIH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZXBsYWNlKHJlcGxhY2UsIGIpIHtcblx0aWYocmVwbGFjZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgcmVwbGFjZSxyZW1vdmUgLT4gcmVtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgcmVwbGFjZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlcGxhY2UsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZW1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHQvLyBrZXkgbXVzdCBleGlzdCBmb3IgcmVtb3ZlXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHRfcmVtb3ZlKHBvaW50ZXIpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZSAocG9pbnRlcikge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0dmFyIHJlbW92ZWQ7XG5cdGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0LnNwbGljZShwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpLCAxKTtcblx0XHRyZXR1cm4gcmVtb3ZlZFswXTtcblxuXHR9IGVsc2UgaWYgKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdGRlbGV0ZSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdHJldHVybiByZW1vdmVkO1xuXG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgcmVtb3ZlIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVtb3ZlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVtb3ZlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVtb3ZlKHJlbW92ZSwgYikge1xuXHRpZihyZW1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIFtiLCByZW1vdmVdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZW1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlNb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHRpZihqc29uUG9pbnRlci5jb250YWlucyhjaGFuZ2UucGF0aCwgY2hhbmdlLmZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdtb3ZlLmZyb20gY2Fubm90IGJlIGFuY2VzdG9yIG9mIG1vdmUucGF0aCcpO1xuXHR9XG5cblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRfYWRkKHB0bywgX3JlbW92ZShwZnJvbSkpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0TW92ZShwciwgYykge1xuXHRwci5wdXNoKHsgb3A6ICdtb3ZlJyxcblx0XHRwYXRoOiBjLmZyb20sIGNvbnRleHQ6IGMuZnJvbUNvbnRleHQsXG5cdFx0ZnJvbTogYy5wYXRoLCBmcm9tQ29udGV4dDogYy5jb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1vdmUobW92ZSwgYikge1xuXHRpZihtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBtb3ZlLHJlbW92ZSAtPiBtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIGNvcHkgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGNvcHkgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5Q29weSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwZnJvbSkgfHwgbWlzc2luZ1ZhbHVlKHBmcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignY29weS5mcm9tIG11c3QgZXhpc3QnKTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwZnJvbS50YXJnZXQ7XG5cdHZhciB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwYXJzZUFycmF5SW5kZXgocGZyb20ua2V5KV07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGZyb20ua2V5XTtcblx0fVxuXG5cdF9hZGQocHRvLCBjbG9uZSh2YWx1ZSkpO1xuXHRyZXR1cm4geDtcbn1cblxuLy8gTk9URTogQ29weSBpcyBub3QgaW52ZXJ0aWJsZVxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvamlmZi9pc3N1ZXMvOVxuLy8gVGhpcyBuZWVkcyBtb3JlIHRob3VnaHQuIFdlIG1heSBoYXZlIHRvIGV4dGVuZC9hbWVuZCBKU09OIFBhdGNoLlxuLy8gQXQgZmlyc3QgZ2xhbmNlLCB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGp1c3QgYmUgYSByZW1vdmUuXG4vLyBIb3dldmVyLCB0aGF0J3Mgbm90IGNvcnJlY3QuICBJdCB2aW9sYXRlcyB0aGUgaW52b2x1dGlvbjpcbi8vIGludmVydChpbnZlcnQocCkpIH49IHAuICBGb3IgZXhhbXBsZTpcbi8vIGludmVydChjb3B5KSAtPiByZW1vdmVcbi8vIGludmVydChyZW1vdmUpIC0+IGFkZFxuLy8gdGh1czogaW52ZXJ0KGludmVydChjb3B5KSkgLT4gYWRkIChET0ghIHRoaXMgc2hvdWxkIGJlIGNvcHkhKVxuXG5mdW5jdGlvbiBub3RJbnZlcnRpYmxlKF8sIGMpIHtcblx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0ICcgKyBjLm9wKTtcbn1cblxuZnVuY3Rpb24gbm90Rm91bmQgKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIgPT09IHZvaWQgMCB8fCAocG9pbnRlci50YXJnZXQgPT0gbnVsbCAmJiBwb2ludGVyLmtleSAhPT0gdm9pZCAwKTtcbn1cblxuZnVuY3Rpb24gbWlzc2luZ1ZhbHVlKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIua2V5ICE9PSB2b2lkIDAgJiYgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDA7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgeCBpcyBhIG5vbi1udWxsIG9iamVjdFxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59XG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xyXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXHJcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXHJcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xyXG5cclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkQ29udGVudCA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZENvbnRlbnRcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9saXN0ZW5lcnMgPSBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cclxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcclxuICAgIGFsbFByb3ZpZGVycyA9IHt9XHJcbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBfZXJyb3IgXCJVbmtub3duIHByb3ZpZGVyOiAje3Byb3ZpZGVyTmFtZX1cIlxyXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xyXG5cclxuICAgICMgYWRkIHNpbmdsZXRvbiBzaGFyZVByb3ZpZGVyLCBpZiBpdCBleGlzdHNcclxuICAgIGZvciBwcm92aWRlciBpbiBAc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIHByb3ZpZGVyLmNhbiAnc2hhcmUnXHJcbiAgICAgICAgQF9zZXRTdGF0ZSBzaGFyZVByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIGJyZWFrXHJcblxyXG4gICAgQF91aS5pbml0IEBhcHBPcHRpb25zLnVpXHJcblxyXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcclxuICAgIGlmIEBhcHBPcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgQGF1dG9TYXZlIEBhcHBPcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluaXRpYWxpemUgdGhlIGNsb3VkQ29udGVudEZhY3Rvcnkgd2l0aCBhbGwgZGF0YSB3ZSB3YW50IGluIHRoZSBlbnZlbG9wZVxyXG4gICAgY2xvdWRDb250ZW50RmFjdG9yeS5zZXRFbnZlbG9wZU1ldGFkYXRhXHJcbiAgICAgIGFwcE5hbWU6IEBhcHBPcHRpb25zLmFwcE5hbWUgb3IgXCJcIlxyXG4gICAgICBhcHBWZXJzaW9uOiBAYXBwT3B0aW9ucy5hcHBWZXJzaW9uIG9yIFwiXCJcclxuICAgICAgYXBwQnVpbGROdW06IEBhcHBPcHRpb25zLmFwcEJ1aWxkTnVtIG9yIFwiXCJcclxuXHJcbiAgc2V0UHJvdmlkZXJPcHRpb25zOiAobmFtZSwgbmV3T3B0aW9ucykgLT5cclxuICAgIGZvciBwcm92aWRlciBpbiBAc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIHByb3ZpZGVyLm5hbWUgaXMgbmFtZVxyXG4gICAgICAgIHByb3ZpZGVyLm9wdGlvbnMgPz0ge31cclxuICAgICAgICBmb3Iga2V5IG9mIG5ld09wdGlvbnNcclxuICAgICAgICAgIHByb3ZpZGVyLm9wdGlvbnNba2V5XSA9IG5ld09wdGlvbnNba2V5XVxyXG4gICAgICAgIGJyZWFrXHJcblxyXG4gIGNvbm5lY3Q6IC0+XHJcbiAgICBAX2V2ZW50ICdjb25uZWN0ZWQnLCB7Y2xpZW50OiBAfVxyXG5cclxuICBsaXN0ZW46IChsaXN0ZW5lcikgLT5cclxuICAgIGlmIGxpc3RlbmVyXHJcbiAgICAgIEBfbGlzdGVuZXJzLnB1c2ggbGlzdGVuZXJcclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5hcHBlbmRNZW51SXRlbSBpdGVtOyBAXHJcblxyXG4gIHByZXBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLnByZXBlbmRNZW51SXRlbSBpdGVtOyBAXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBfdWkucmVwbGFjZU1lbnVJdGVtIGtleSwgaXRlbTsgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBfdWkuaW5zZXJ0TWVudUl0ZW1CZWZvcmUga2V5LCBpdGVtOyBAXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQWZ0ZXIga2V5LCBpdGVtOyBAXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBfdWkuc2V0TWVudUJhckluZm8gaW5mb1xyXG5cclxuICBuZXdGaWxlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgIEBfcmVzZXRTdGF0ZSgpXHJcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnLCB7Y29udGVudDogXCJcIn1cclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBhcHBPcHRpb25zLnVpPy5uZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiB3aW5kb3cubG9jYXRpb24sICdfYmxhbmsnXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kaXJ0eVxyXG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIEBzYXZlKClcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uTkVXX0ZJTEUnXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcclxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBvcGVuU2hhcmVkQ29udGVudDogKGlkKSAtPlxyXG4gICAgQHN0YXRlLnNoYXJlUHJvdmlkZXI/LmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3ZlcndyaXRhYmxlOiBmYWxzZSwgb3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG5cclxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgQHNhdmVDb250ZW50IHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb250ZW50OiAoc3RyaW5nQ29udGVudCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZSdcclxuICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgIHNhdmluZzogbWV0YWRhdGFcclxuXHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50IHN0cmluZ0NvbnRlbnRcclxuICAgICAgY3VycmVudENvbnRlbnQuYWRkTWV0YWRhdGEgZG9jTmFtZTogbWV0YWRhdGEubmFtZVxyXG5cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBpZiBAc3RhdGUubWV0YWRhdGEgaXNudCBtZXRhZGF0YVxyXG4gICAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIHtzYXZlZDogdHJ1ZSwgY3VycmVudENvbnRlbnQ6IGN1cnJlbnRDb250ZW50fVxyXG4gICAgICAgIGNhbGxiYWNrPyBjdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChzdHJpbmdDb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29weURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBzYXZlQ29weSA9IChjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgQF91aS5zYXZlQ29weURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIGlmIGNvbnRlbnQgaXMgbnVsbFxyXG4gICAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpIC0+XHJcbiAgICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgc2F2ZUNvcHkgY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgc2hhcmVHZXRMaW5rOiAtPlxyXG4gICAgc2hhcmVkRG9jdW1lbnRJZCA9IEBzdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0IFwic2hhcmVkRG9jdW1lbnRJZFwiXHJcbiAgICBpZiBzaGFyZWREb2N1bWVudElkXHJcbiAgICAgIEBfc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcclxuICAgIGVsc2VcclxuICAgICAgQHNoYXJlIChzaGFyZWREb2N1bWVudElkKSA9PlxyXG4gICAgICAgIEBfc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcclxuXHJcbiAgc2hhcmVVcGRhdGU6IC0+XHJcbiAgICBAc2hhcmUoKVxyXG5cclxuICBzaGFyZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHN0YXRlLnNoYXJlUHJvdmlkZXJcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICBzYXZpbmc6IHRydWVcclxuICAgICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2hhcmUgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxyXG4gICAgICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgICAgICBzYXZpbmc6IGZhbHNlXHJcbiAgICAgICAgICAgIGN1cnJlbnRDb250ZW50OiBjdXJyZW50Q29udGVudFxyXG4gICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrPyBzaGFyZWRDb250ZW50SWRcclxuXHJcbiAgX3Nob3dTaGFyZURpYWxvZzogKHNoYXJlZERvY3VtZW50SWQpIC0+XHJcbiAgICBwYXRoID0gZG9jdW1lbnQubG9jYXRpb24ub3JpZ2luICsgZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWVcclxuICAgIHNoYXJlUXVlcnkgPSBcIj9vcGVuU2hhcmVkPSN7c2hhcmVkRG9jdW1lbnRJZH1cIlxyXG4gICAgQF91aS5zaGFyZVVybERpYWxvZyBcIiN7cGF0aH0je3NoYXJlUXVlcnl9XCJcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICBAX3VpLmRvd25sb2FkRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgQGFwcE9wdGlvbnMubWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKGVyciwgbWV0YWRhdGEpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmFkZE1ldGFkYXRhIGRvY05hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBAX2V2ZW50ICdyZW5hbWVkRmlsZScsIHttZXRhZGF0YTogbWV0YWRhdGF9XHJcbiAgICAgICAgY2FsbGJhY2s/IG5ld05hbWVcclxuXHJcbiAgcmVuYW1lRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBfdWkucmVuYW1lRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YS5uYW1lLCAobmV3TmFtZSkgPT5cclxuICAgICAgICBAcmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgY2FsbGJhY2s/ICdObyBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXHJcblxyXG4gIHJlb3BlbjogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBAc3RhdGUub3BlbmVkQ29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogQHN0YXRlLm9wZW5lZENvbnRlbnQuY2xvbmUoKX1cclxuXHJcbiAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgaWYgKG5vdCBAc3RhdGUuZGlydHkpIG9yIChjb25maXJtIHRyICd+Q09ORklSTS5SRU9QRU5fRklMRScpXHJcbiAgICAgICAgQHJlb3BlbiBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBjYWxsYmFjaz8gJ05vIGluaXRpYWwgb3BlbmVkIHZlcnNpb24gd2FzIGZvdW5kIGZvciB0aGUgY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgQF9hdXRvU2F2ZUludGVydmFsID0gc2V0SW50ZXJ2YWwgKD0+IEBzYXZlKCkgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnKSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsID4gMFxyXG5cclxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEsIGFkZGl0aW9uYWxTdGF0ZT17fSkgLT5cclxuICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA/PSB0cnVlXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIGFkZGl0aW9uYWxTdGF0ZVxyXG4gICAgICBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfc2V0U3RhdGUgc3RhdGVcclxuICAgIEBfZXZlbnQgdHlwZSwge2NvbnRlbnQ6IGNvbnRlbnQuZ2V0VGV4dCgpfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgZm9yIGxpc3RlbmVyIGluIEBfbGlzdGVuZXJzXHJcbiAgICAgIGxpc3RlbmVyIGV2ZW50XHJcblxyXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xyXG4gICAgICBAc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXHJcblxyXG4gIF9yZXNldFN0YXRlOiAtPlxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBvcGVuZWRDb250ZW50OiBudWxsXHJcbiAgICAgIGN1cnJlbnRDb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG4gIF9jbG9zZUN1cnJlbnRGaWxlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdjbG9zZSdcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmNsb3NlIEBzdGF0ZS5tZXRhZGF0YVxyXG5cclxuICBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudDogKHN0cmluZ0NvbnRlbnQpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/XHJcbiAgICAgIGN1cnJlbnRDb250ZW50ID0gQHN0YXRlLmN1cnJlbnRDb250ZW50XHJcbiAgICAgIGN1cnJlbnRDb250ZW50LnNldFRleHQgc3RyaW5nQ29udGVudFxyXG4gICAgZWxzZVxyXG4gICAgICBjdXJyZW50Q29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHN0cmluZ0NvbnRlbnRcclxuICAgIGN1cnJlbnRDb250ZW50XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbmRvY3VtZW50U3RvcmUgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tXCJcclxuYXV0aG9yaXplVXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxyXG5jaGVja0xvZ2luVXJsICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2luZm9cIlxyXG5saXN0VXJsICAgICAgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9hbGxcIlxyXG5sb2FkRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9vcGVuXCJcclxuc2F2ZURvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvc2F2ZVwiXHJcbnBhdGNoRG9jdW1lbnRVcmwgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3BhdGNoXCJcclxucmVtb3ZlRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvZGVsZXRlXCJcclxucmVuYW1lRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcmVuYW1lXCJcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuamlmZiA9IHJlcXVpcmUgJ2ppZmYnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBkb2NTdG9yZUF2YWlsYWJsZTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9vbkRvY1N0b3JlTG9hZGVkID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmRvY1N0b3JlQXZhaWxhYmxlXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAnVHJ5aW5nIHRvIGxvZyBpbnRvIHRoZSBEb2N1bWVudCBTdG9yZS4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBzaGFyZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICAgIEB1c2VyID0gbnVsbFxyXG5cclxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXHJcblxyXG4gIHByZXZpb3VzbHlTYXZlZENvbnRlbnQ6IG51bGxcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEB1c2VyXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgZWxzZVxyXG4gICAgICBAdXNlciBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAtPlxyXG4gICAgQF9zaG93TG9naW5XaW5kb3coKVxyXG5cclxuICBfb25Eb2NTdG9yZUxvYWRlZDogKEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQF9kb2NTdG9yZUxvYWRlZFxyXG4gICAgICBAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpblN1Y2Nlc3NmdWw6IChAdXNlcikgLT5cclxuICAgIEBfbG9naW5XaW5kb3c/LmNsb3NlKClcclxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG5cclxuICBfY2hlY2tMb2dpbjogLT5cclxuICAgIHByb3ZpZGVyID0gQFxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luV2luZG93OiBudWxsXHJcblxyXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XHJcbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcclxuICAgICAgQF9sb2dpbldpbmRvdy5mb2N1cygpXHJcbiAgICBlbHNlXHJcblxyXG4gICAgICBjb21wdXRlU2NyZWVuTG9jYXRpb24gPSAodywgaCkgLT5cclxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcclxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxyXG4gICAgICAgIHdpZHRoICA9IHdpbmRvdy5pbm5lcldpZHRoICBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIG9yIHNjcmVlbi53aWR0aFxyXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcclxuXHJcbiAgICAgICAgbGVmdCA9ICgod2lkdGggLyAyKSAtICh3IC8gMikpICsgc2NyZWVuTGVmdFxyXG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxyXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxyXG5cclxuICAgICAgd2lkdGggPSAxMDAwXHJcbiAgICAgIGhlaWdodCA9IDQ4MFxyXG4gICAgICBwb3NpdGlvbiA9IGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiB3aWR0aCwgaGVpZ2h0XHJcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xyXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcclxuICAgICAgICAnaGVpZ2h0PScgKyBoZWlnaHRcclxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXHJcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXHJcbiAgICAgICAgJ2RlcGVuZGVudD15ZXMnXHJcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcclxuICAgICAgICAnbG9jYXRpb249bm8nXHJcbiAgICAgICAgJ2RpYWxvZz15ZXMnXHJcbiAgICAgICAgJ21lbnViYXI9bm8nXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxyXG5cclxuICAgICAgcG9sbEFjdGlvbiA9ID0+XHJcbiAgICAgICAgdHJ5XHJcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICAgICAgICBpZiAoaHJlZiBpcyB3aW5kb3cubG9jYXRpb24uaHJlZilcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXHJcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxyXG4gICAgICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgICAgIGNhdGNoIGVcclxuICAgICAgICAgICMgY29uc29sZS5sb2cgZVxyXG5cclxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBsaXN0VXJsXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3Igb3duIGtleSwgZmlsZSBvZiBkYXRhXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YToge2lkOiBmaWxlLmlkfVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXHJcblxyXG4gIGxvYWRTaGFyZWRDb250ZW50OiAoaWQsIGNhbGxiYWNrKSAtPlxyXG4gICAgc2hhcmVkTWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICBzaGFyZWRDb250ZW50SWQ6IGlkXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBvdmVyd3JpdGFibGU6IGZhbHNlXHJcbiAgICBAbG9hZCBzaGFyZWRNZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBzaGFyZWRNZXRhZGF0YVxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgd2l0aENyZWRlbnRpYWxzID0gdW5sZXNzIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZCB0aGVuIHRydWUgZWxzZSBmYWxzZVxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWQgb3IgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHt3aXRoQ3JlZGVudGlhbHN9XHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBkYXRhXHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNvbnRlbnQuY2xvbmUoKVxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPz0gZGF0YS5kb2NOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBtZXNzYWdlID0gaWYgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkXHJcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkIGRvY3VtZW50ICcje21ldGFkYXRhLnNoYXJlZENvbnRlbnRJZH0nLiBQZXJoYXBzIHRoZSBmaWxlIHdhcyBub3Qgc2hhcmVkP1wiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgXCJVbmFibGUgdG8gbG9hZCAje21ldGFkYXRhLm5hbWUgb3IgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZCBvciAnZmlsZSd9XCJcclxuICAgICAgICBjYWxsYmFjayBtZXNzYWdlXHJcblxyXG4gIHNoYXJlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcnVuS2V5ID0gY29udGVudC5nZXQoXCJzaGFyZUVkaXRLZXlcIikgb3IgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpXHJcblxyXG4gICAgcGFyYW1zID1cclxuICAgICAgcnVuS2V5OiBydW5LZXlcclxuXHJcbiAgICBpZiBjb250ZW50LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgcGFyYW1zLnJlY29yZGlkID0gY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcblxyXG4gICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICBfcGVybWlzc2lvbnM6IDFcclxuICAgICAgc2hhcmVFZGl0S2V5OiBudWxsICAgICAgICAgICAgIyBzdHJpcCB0aGVzZSBvdXQgb2YgdGhlIHNoYXJlZCBkYXRhIGlmIHRoZXlcclxuICAgICAgc2hhcmVkRG9jdW1lbnRJZDogbnVsbCAgICAgICAgIyBleGlzdCAodGhleSdsbCBiZSByZS1hZGRlZCBvbiBzdWNjZXNzKVxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHNhdmVEb2N1bWVudFVybCwgcGFyYW1zKVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogZmFsc2VcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY29udGVudC5hZGRNZXRhZGF0YVxyXG4gICAgICAgICAgc2hhcmVkRG9jdW1lbnRJZDogZGF0YS5pZFxyXG4gICAgICAgICAgc2hhcmVFZGl0S2V5OiBydW5LZXlcclxuICAgICAgICAgIF9wZXJtaXNzaW9uczogMFxyXG4gICAgICAgIG1ldGFkYXRhPy5uYW1lID0gZGF0YS5kb2NOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YS5pZFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBzYXZlIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgc2F2ZTogKGNsb3VkQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgY29udGVudCA9IGNsb3VkQ29udGVudC5nZXRDb250ZW50KClcclxuXHJcbiAgICBwYXJhbXMgPSB7fVxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkIHRoZW4gcGFyYW1zLnJlY29yZGlkID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcblxyXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXHJcbiAgICBjYW5PdmVyd3JpdGUgPSBtZXRhZGF0YS5vdmVyd3JpdGFibGUgYW5kIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50P1xyXG4gICAgaWYgY2FuT3ZlcndyaXRlIGFuZCBkaWZmID0gQF9jcmVhdGVEaWZmIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50LmdldENvbnRlbnQoKSwgY29udGVudFxyXG4gICAgICBzZW5kQ29udGVudCA9IGRpZmZcclxuICAgICAgdXJsID0gcGF0Y2hEb2N1bWVudFVybFxyXG4gICAgZWxzZVxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIHRoZW4gcGFyYW1zLnJlY29yZG5hbWUgPSBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIHVybCA9IHNhdmVEb2N1bWVudFVybFxyXG4gICAgICBzZW5kQ29udGVudCA9IGNvbnRlbnRcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyh1cmwsIHBhcmFtcylcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSBzZW5kQ29udGVudFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNsb3VkQ29udGVudC5jbG9uZSgpXHJcbiAgICAgICAgaWYgZGF0YS5pZCB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCA9IGRhdGEuaWRcclxuXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBzYXZlIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiByZW5hbWVEb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICBuZXdSZWNvcmRuYW1lOiBuZXdOYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHJlbmFtZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cclxuICAgIHJldHVybiB1cmwgdW5sZXNzIHBhcmFtc1xyXG4gICAga3ZwID0gW11cclxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xyXG4gICAgICBrdnAucHVzaCBba2V5LCB2YWx1ZV0ubWFwKGVuY29kZVVSSSkuam9pbiBcIj1cIlxyXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcclxuXHJcbiAgX2NyZWF0ZURpZmY6IChvYmoxLCBvYmoyKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIG9wdHMgPVxyXG4gICAgICAgIGhhc2g6IEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpZiB0eXBlb2YgQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlzIFwiZnVuY3Rpb25cIlxyXG4gICAgICBkaWZmID0gamlmZi5kaWZmKG9iajEsIG9iajIsIG9wdHMpXHJcbiAgICAgIHJldHVybiBkaWZmXHJcbiAgICBjYXRjaFxyXG4gICAgICByZXR1cm4gbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5qc2RpZmYgPSByZXF1aXJlICdkaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgUmVhbFRpbWVJbmZvIGV4dGVuZHMgRXJyb3JcclxuICBjb25zdHJ1Y3RvcjogLT4gQG5hbWUgPSAnUmVhbFRpbWVJbmZvJ1xyXG5cclxuY2xhc3MgUmVhbFRpbWVFcnJvciBleHRlbmRzIEVycm9yXHJcbiAgY29uc3RydWN0b3I6IC0+IEBuYW1lID0gJ1JlYWxUaW1lRXJyb3InXHJcblxyXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAc2V0U3RhdGUgbG9hZGVkR0FQSTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuU0hPV19QT1BVUFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xyXG4gICAgKVxyXG5cclxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuR09PR0xFX0RSSVZFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiB0cnVlXHJcblxyXG4gICAgQGF1dGhUb2tlbiA9IG51bGxcclxuICAgIEB1c2VyID0gbnVsbFxyXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcclxuICAgIGlmIG5vdCBAY2xpZW50SWRcclxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsZURyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXHJcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxyXG4gICAgQHVzZVJlYWxUaW1lQVBJID0gQG9wdGlvbnMudXNlUmVhbFRpbWVBUEkgb3IgZmFsc2VcclxuICAgIGlmIEB1c2VSZWFsVGltZUFQSVxyXG4gICAgICBAbWltZVR5cGUgKz0gJytjZm1fcmVhbHRpbWUnXHJcbiAgICBAX2xvYWRHQVBJKClcclxuXHJcbiAgQE5hbWU6ICdnb29nbGVEcml2ZSdcclxuXHJcbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcclxuICBASU1NRURJQVRFID0gdHJ1ZVxyXG4gIEBTSE9XX1BPUFVQID0gZmFsc2VcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuICAgIGVsc2VcclxuICAgICAgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAoaW1tZWRpYXRlKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGFyZ3MgPVxyXG4gICAgICAgIGNsaWVudF9pZDogQGNsaWVudElkXHJcbiAgICAgICAgc2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZScsICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLnByb2ZpbGUnXVxyXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXHJcbiAgICAgIGdhcGkuYXV0aC5hdXRob3JpemUgYXJncywgKGF1dGhUb2tlbikgPT5cclxuICAgICAgICBAYXV0aFRva2VuID0gaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yIHRoZW4gYXV0aFRva2VuIGVsc2UgbnVsbFxyXG4gICAgICAgIEB1c2VyID0gbnVsbFxyXG4gICAgICAgIEBhdXRvUmVuZXdUb2tlbiBAYXV0aFRva2VuXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XHJcbiAgICAgICAgICAgIEB1c2VyID0gdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgYXV0b1JlbmV3VG9rZW46IChhdXRoVG9rZW4pIC0+XHJcbiAgICBpZiBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0IEBfYXV0b1JlbmV3VGltZW91dFxyXG4gICAgaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yXHJcbiAgICAgIEBfYXV0b1JlbmV3VGltZW91dCA9IHNldFRpbWVvdXQgKD0+IEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEUpLCAocGFyc2VJbnQoYXV0aFRva2VuLmV4cGlyZXNfaW4sIDEwKSAqIDAuNzUpICogMTAwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdnZHJpdmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBzYXZlOiAgKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX3NhdmVSZWFsVGltZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX3NhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGlmIEB1c2VSZWFsVGltZUFQSVxyXG4gICAgICAgIEBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9sb2FkRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMubGlzdFxyXG4gICAgICAgIHE6IHF1ZXJ5ID0gXCIoKG1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfScpIG9yIChtaW1lVHlwZSA9ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykpIGFuZCAnI3tpZiBtZXRhZGF0YSB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J30nIGluIHBhcmVudHNcIlxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1VuYWJsZSB0byBsaXN0IGZpbGVzJykgaWYgbm90IHJlc3VsdFxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXHJcbiAgICAgICAgICAgIHR5cGU6IGlmIGl0ZW0ubWltZVR5cGUgaXMgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcGFyZW50OiBtZXRhZGF0YVxyXG4gICAgICAgICAgICBvdmVyd3JpdGFibGU6IGl0ZW0uZWRpdGFibGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgICAgIGlkOiBpdGVtLmlkXHJcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxyXG4gICAgICAgICAgbG93ZXJBID0gYS5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMSBpZiBsb3dlckEgPiBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAwXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmRlbGV0ZVxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGNhbGxiYWNrPyByZXN1bHQ/LmVycm9yIG9yIG51bGxcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5wYXRjaFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgcmVzb3VyY2U6XHJcbiAgICAgICAgICB0aXRsZTogbmV3TmFtZVxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBpZiByZXN1bHQ/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjaz8gcmVzdWx0LmVycm9yXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcblxyXG4gIGNsb3NlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5yZWFsVGltZT8uZG9jP1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuZG9jLmNsb3NlKClcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcclxuICAgICAgY2FsbGJhY2soKVxyXG4gICAgZWxzZVxyXG4gICAgICBzZWxmID0gQFxyXG4gICAgICBjaGVjayA9IC0+XHJcbiAgICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ29hdXRoMicsICd2MicsIC0+XHJcbiAgICAgICAgICAgICAgZ2FwaS5sb2FkICdkcml2ZS1yZWFsdGltZScsIC0+XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCBzZWxmXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuXHJcbiAgX2xvYWRGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxyXG4gICAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgICAgeGhyLm9wZW4gJ0dFVCcsIGZpbGUuZG93bmxvYWRVcmxcclxuICAgICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAnQXV0aG9yaXphdGlvbicsIFwiQmVhcmVyICN7QGF1dGhUb2tlbi5hY2Nlc3NfdG9rZW59XCJcclxuICAgICAgICB4aHIub25sb2FkID0gLT5cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHhoci5yZXNwb25zZVRleHRcclxuICAgICAgICB4aHIub25lcnJvciA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBkb3dubG9hZCAje3VybH1cIlxyXG4gICAgICAgIHhoci5zZW5kKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gZ2V0IGRvd25sb2FkIHVybCdcclxuXHJcbiAgX3NhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG5cclxuICAgIFttZXRob2QsIHBhdGhdID0gaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICBbJ1BVVCcsIFwiL3VwbG9hZC9kcml2ZS92Mi9maWxlcy8je21ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH1cIl1cclxuICAgIGVsc2VcclxuICAgICAgWydQT1NUJywgJy91cGxvYWQvZHJpdmUvdjIvZmlsZXMnXVxyXG5cclxuICAgIGJvZHkgPSBbXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxcclxcblxcclxcbiN7aGVhZGVyfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICN7QG1pbWVUeXBlfVxcclxcblxcclxcbiN7Y29udGVudC5nZXRDb250ZW50QXNKU09OKCl9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbiAgX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGZpbGVMb2FkZWQgPSAoZG9jKSAtPlxyXG4gICAgICBjb250ZW50ID0gZG9jLmdldE1vZGVsKCkuZ2V0Um9vdCgpLmdldCAnY29udGVudCdcclxuICAgICAgaWYgbWV0YWRhdGEub3ZlcndyaXRhYmxlXHJcbiAgICAgICAgdGhyb3dFcnJvciA9IChlKSAtPlxyXG4gICAgICAgICAgaWYgbm90IGUuaXNMb2NhbFxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgUmVhbFRpbWVFcnJvciAnQW5vdGhlciB1c2VyIGhhcyBtYWRlIGVkaXRzIHRvIHRoaXMgZmlsZSdcclxuICAgICAgICAjY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfSU5TRVJURUQsIHRocm93RXJyb3JcclxuICAgICAgICAjY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfREVMRVRFRCwgdGhyb3dFcnJvclxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxyXG4gICAgICAgIGRvYzogZG9jXHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBjb250ZW50LmdldFRleHQoKVxyXG5cclxuICAgIGluaXQgPSAobW9kZWwpIC0+XHJcbiAgICAgIGNvbnRlbnQgPSBtb2RlbC5jcmVhdGVTdHJpbmcgJydcclxuICAgICAgbW9kZWwuZ2V0Um9vdCgpLnNldCAnY29udGVudCcsIGNvbnRlbnRcclxuXHJcbiAgICBlcnJvciA9IChlcnIpID0+XHJcbiAgICAgIGlmIGVyci50eXBlIGlzICdUT0tFTl9SRUZSRVNIX1JFUVVJUkVEJ1xyXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGFsZXJ0IGVyci5tZXNzYWdlXHJcblxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZ2V0XHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIGVsc2VcclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmluc2VydFxyXG4gICAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxyXG4gICAgICAgIHBhcmVudHM6IFt7aWQ6IGlmIG1ldGFkYXRhLnBhcmVudD8ucHJvdmlkZXJEYXRhPy5pZD8gdGhlbiBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfV1cclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGZpbGU/LmlkXHJcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXHJcbiAgICAgICAgZ2FwaS5kcml2ZS5yZWFsdGltZS5sb2FkIGZpbGUuaWQsIGZpbGVMb2FkZWQsIGluaXQsIGVycm9yXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQgZmlsZSdcclxuXHJcbiAgX3NhdmVSZWFsVGltZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/Lm1vZGVsXHJcbiAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgICAgQF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbCBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaW5kZXggPSAwXHJcbiAgICByZWFsVGltZUNvbnRlbnQgPSBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuY29udGVudFxyXG4gICAgZGlmZnMgPSBqc2RpZmYuZGlmZkNoYXJzIHJlYWxUaW1lQ29udGVudC5nZXRDb250ZW50QXNKU09OKCksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICBmb3IgZGlmZiBpbiBkaWZmc1xyXG4gICAgICBpZiBkaWZmLnJlbW92ZWRcclxuICAgICAgICByZWFsVGltZUNvbnRlbnQucmVtb3ZlUmFuZ2UgaW5kZXgsIGluZGV4ICsgZGlmZi52YWx1ZS5sZW5ndGhcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIGRpZmYuYWRkZWRcclxuICAgICAgICAgIHJlYWxUaW1lQ29udGVudC5pbnNlcnRTdHJpbmcgaW5kZXgsIGRpZmYudmFsdWVcclxuICAgICAgICBpbmRleCArPSBkaWZmLmNvdW50XHJcbiAgICBjYWxsYmFjayBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xyXG4gIEBBdmFpbGFibGU6IC0+XHJcbiAgICByZXN1bHQgPSB0cnlcclxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRlc3QsIHRlc3QpXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxyXG4gICAgICB0cnVlXHJcbiAgICBjYXRjaFxyXG4gICAgICBmYWxzZVxyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGZpbGVLZXkgPSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gZmlsZUtleSwgY29udGVudC5nZXRDb250ZW50QXNKU09OKClcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgIGNhdGNoIGVcclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgKG1ldGFkYXRhPy5wYXRoKCkgb3IgW10pLmpvaW4gJy8nXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW2ZpbGVuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbmFtZSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IG5hbWVcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byByZW5hbWUnXHJcblxyXG4gIF9nZXRLZXk6IChuYW1lID0gJycpIC0+XHJcbiAgICBcImNmbTo6I3tuYW1lLnJlcGxhY2UgL1xcdC9nLCAnICd9XCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdG9yYWdlUHJvdmlkZXJcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0Bjb250ZW50LCBAbWV0YWRhdGF9ID0gb3B0aW9uc1xyXG5cclxuY2xhc3MgQ2xvdWRNZXRhZGF0YVxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQHR5cGUsIEBwcm92aWRlciA9IG51bGwsIEBwYXJlbnQgPSBudWxsLCBAcHJvdmlkZXJEYXRhPXt9LCBAb3ZlcndyaXRhYmxlLCBAc2hhcmVkQ29udGVudElkLCBAc2hhcmVkQ29udGVudFNlY3JldEtleX0gPSBvcHRpb25zXHJcbiAgQEZvbGRlcjogJ2ZvbGRlcidcclxuICBARmlsZTogJ2ZpbGUnXHJcblxyXG4gIHBhdGg6IC0+XHJcbiAgICBfcGF0aCA9IFtdXHJcbiAgICBwYXJlbnQgPSBAcGFyZW50XHJcbiAgICB3aGlsZSBwYXJlbnQgaXNudCBudWxsXHJcbiAgICAgIF9wYXRoLnVuc2hpZnQgcGFyZW50XHJcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRcclxuICAgIF9wYXRoXHJcblxyXG4jIHNpbmdsZXRvbiB0aGF0IGNhbiBjcmVhdGUgQ2xvdWRDb250ZW50IHdyYXBwZWQgd2l0aCBnbG9iYWwgb3B0aW9uc1xyXG5jbGFzcyBDbG91ZENvbnRlbnRGYWN0b3J5XHJcbiAgY29uc3RydWN0b3I6IC0+XHJcbiAgICBAZW52ZWxvcGVNZXRhZGF0YSA9IHt9XHJcblxyXG4gICMgc2V0IGluaXRpYWwgZW52ZWxvcGVNZXRhZGF0YSBvciB1cGRhdGUgaW5kaXZpZHVhbCBwcm9wZXJ0aWVzXHJcbiAgc2V0RW52ZWxvcGVNZXRhZGF0YTogKGVudmVsb3BlTWV0YWRhdGEpIC0+XHJcbiAgICBmb3Iga2V5IG9mIGVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgQGVudmVsb3BlTWV0YWRhdGFba2V5XSA9IGVudmVsb3BlTWV0YWRhdGFba2V5XVxyXG5cclxuICAjIHJldHVybnMgbmV3IENsb3VkQ29udGVudCBjb250YWluaW5nIGVudmVsb3BlZCBkYXRhXHJcbiAgY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50OiAoY29udGVudCkgLT5cclxuICAgIG5ldyBDbG91ZENvbnRlbnQgQGVudmVsb3BDb250ZW50IGNvbnRlbnRcclxuXHJcbiAgIyBlbnZlbG9wcyBjb250ZW50IHdpdGggbWV0YWRhdGEsIHJldHVybnMgYW4gb2JqZWN0LlxyXG4gICMgSWYgY29udGVudCB3YXMgYWxyZWFkeSBhbiBvYmplY3QgKE9iamVjdCBvciBKU09OKSB3aXRoIG1ldGFkYXRhLFxyXG4gICMgYW55IGV4aXN0aW5nIG1ldGFkYXRhIHdpbGwgYmUgcmV0YWluZWQuXHJcbiAgIyBOb3RlOiBjYWxsaW5nIGBlbnZlbG9wQ29udGVudGAgbWF5IGJlIHNhZmVseSBjYWxsZWQgb24gc29tZXRoaW5nIHRoYXRcclxuICAjIGhhcyBhbHJlYWR5IGhhZCBgZW52ZWxvcENvbnRlbnRgIGNhbGxlZCBvbiBpdCwgYW5kIHdpbGwgYmUgYSBuby1vcC5cclxuICBlbnZlbG9wQ29udGVudDogKGNvbnRlbnQpIC0+XHJcbiAgICBlbnZlbG9wZWRDbG91ZENvbnRlbnQgPSBAX3dyYXBJZk5lZWRlZCBjb250ZW50XHJcbiAgICBmb3Iga2V5IG9mIEBlbnZlbG9wZU1ldGFkYXRhXHJcbiAgICAgIGVudmVsb3BlZENsb3VkQ29udGVudFtrZXldID89IEBlbnZlbG9wZU1ldGFkYXRhW2tleV1cclxuICAgIHJldHVybiBlbnZlbG9wZWRDbG91ZENvbnRlbnRcclxuXHJcbiAgIyBlbnZlbG9wcyBjb250ZW50IGluIHtjb250ZW50OiBjb250ZW50fSBpZiBuZWVkZWQsIHJldHVybnMgYW4gb2JqZWN0XHJcbiAgX3dyYXBJZk5lZWRlZDogKGNvbnRlbnQpIC0+XHJcbiAgICBpZiBpc1N0cmluZyBjb250ZW50XHJcbiAgICAgIHRyeSBjb250ZW50ID0gSlNPTi5wYXJzZSBjb250ZW50XHJcbiAgICBpZiBjb250ZW50LmNvbnRlbnQ/XHJcbiAgICAgIHJldHVybiBjb250ZW50XHJcbiAgICBlbHNlXHJcbiAgICAgIHJldHVybiB7Y29udGVudH1cclxuXHJcbmNsYXNzIENsb3VkQ29udGVudFxyXG4gIGNvbnN0cnVjdG9yOiAoQF8gPSB7fSkgLT5cclxuXHJcbiAgZ2V0Q29udGVudDogLT4gQF9cclxuICBnZXRDb250ZW50QXNKU09OOiAgLT4gSlNPTi5zdHJpbmdpZnkgQF9cclxuXHJcbiAgY2xvbmU6IC0+IG5ldyBDbG91ZENvbnRlbnQgXy5jbG9uZURlZXAgQF9cclxuXHJcbiAgc2V0VGV4dDogKHRleHQpIC0+IEBfLmNvbnRlbnQgPSB0ZXh0XHJcbiAgZ2V0VGV4dDogLT4gaWYgQF8uY29udGVudCBpcyBudWxsIHRoZW4gJycgZWxzZSBpZiBpc1N0cmluZyhAXy5jb250ZW50KSB0aGVuIEBfLmNvbnRlbnQgZWxzZSBKU09OLnN0cmluZ2lmeSBAXy5jb250ZW50XHJcblxyXG4gIGFkZE1ldGFkYXRhOiAobWV0YWRhdGEpIC0+IEBfW2tleV0gPSBtZXRhZGF0YVtrZXldIGZvciBrZXkgb2YgbWV0YWRhdGFcclxuICBnZXQ6IChwcm9wKSAtPiBAX1twcm9wXVxyXG5cclxuY2xhc3MgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAZGlzcGxheU5hbWUsIEBjYXBhYmlsaXRpZXN9ID0gb3B0aW9uc1xyXG5cclxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXHJcblxyXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XHJcbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgIGNhbGxiYWNrIHRydWVcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgbnVsbFxyXG5cclxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXHJcblxyXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcclxuXHJcbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdjbG9zZSdcclxuXHJcbiAgX25vdEltcGxlbWVudGVkOiAobWV0aG9kTmFtZSkgLT5cclxuICAgIGFsZXJ0IFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxyXG4gIENsb3VkTWV0YWRhdGE6IENsb3VkTWV0YWRhdGFcclxuICBDbG91ZENvbnRlbnQ6IENsb3VkQ29udGVudFxyXG4gIGNsb3VkQ29udGVudEZhY3Rvcnk6IG5ldyBDbG91ZENvbnRlbnRGYWN0b3J5KClcclxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IFJlYWRPbmx5UHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuUkVBRF9PTkxZJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IGZhbHNlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IGZhbHNlXHJcbiAgICAgICAgcmVuYW1lOiBmYWxzZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG4gICAgQHRyZWUgPSBudWxsXHJcblxyXG4gIEBOYW1lOiAncmVhZE9ubHknXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHN1YlRyZWUgPSBAX2ZpbmRTdWJUcmVlIG1ldGFkYXRhXHJcbiAgICAgIGlmIHN1YlRyZWVcclxuICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdXHJcbiAgICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0uY29udGVudFxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gaXMgYSBmb2xkZXJcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgbGlzdCA9IFtdXHJcbiAgICAgIHN1YlRyZWUgPSBAX2ZpbmRTdWJUcmVlIG1ldGFkYXRhXHJcbiAgICAgIGlmIHN1YlRyZWVcclxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHN1YlRyZWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICBfZmluZFN1YlRyZWU6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlblxyXG4gICAgZWxzZSBpZiBtZXRhZGF0YT8ucGFyZW50XHJcbiAgICAgIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuY2hpbGRyZW5cclxuICAgIGVsc2VcclxuICAgICAgQHRyZWVcclxuXHJcbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAdHJlZSBpc250IG51bGxcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxyXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xyXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xyXG4gICAgICAkLmFqYXhcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcclxuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgIGVsc2VcclxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XHJcblxyXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGFyZW50ID0gbnVsbCkgLT5cclxuICAgIHRyZWUgPSB7fVxyXG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXHJcbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgIHR5cGU6IHR5cGVcclxuICAgICAgICBwYXJlbnQ6IHBhcmVudFxyXG4gICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgY2hpbGRyZW46IG51bGxcclxuICAgICAgaWYgdHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlbiA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgbWV0YWRhdGFcclxuICAgICAgY29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGpzb25bZmlsZW5hbWVdXHJcbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cclxuICAgICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICB0cmVlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcblxyXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3JldmVydFN1Yk1lbnUnLCAnc2VwYXJhdG9yJywgJ3NhdmUnLCAnc2F2ZUZpbGVBc0RpYWxvZycsICdzaGFyZVN1Yk1lbnUnLCAnZG93bmxvYWREaWFsb2cnLCAncmVuYW1lRGlhbG9nJ11cclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XHJcbiAgICBAaXRlbXMgPSBAcGFyc2VNZW51SXRlbXMgb3B0aW9ucy5tZW51LCBjbGllbnRcclxuICAgIGNvbnNvbGUuZGlyIEBpdGVtc1xyXG5cclxuICBwYXJzZU1lbnVJdGVtczogKG1lbnVJdGVtcywgY2xpZW50KSAtPlxyXG4gICAgc2V0QWN0aW9uID0gKGFjdGlvbikgLT5cclxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXHJcblxyXG4gICAgc2V0RW5hYmxlZCA9IChhY3Rpb24pIC0+XHJcbiAgICAgIHN3aXRjaCBhY3Rpb25cclxuICAgICAgICB3aGVuICdyZXZlcnRTdWJNZW51J1xyXG4gICAgICAgICAgLT4gKGNsaWVudC5zdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgY2xpZW50LnN0YXRlLm1ldGFkYXRhPykgb3IgY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJ1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/XHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0U2hhcmVkRGlhbG9nJ1xyXG4gICAgICAgICAgLT4gdHJ1ZSAjIFRPRE86IHdoYXQgc2hvdWxkIHRoZSBjaGVjayBiZSBoZXJlP1xyXG4gICAgICAgIHdoZW4gJ3JlbmFtZURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAncmVuYW1lJ1xyXG4gICAgICAgIHdoZW4gJ3NhdmVDb3B5RGlhbG9nJ1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xyXG4gICAgICAgIHdoZW4gJ3NoYXJlR2V0TGluaycsICdzaGFyZVN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRydWVcclxuXHJcbiAgICBnZXRJdGVtcyA9IChzdWJNZW51SXRlbXMpID0+XHJcbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xyXG4gICAgICAgIEBwYXJzZU1lbnVJdGVtcyBzdWJNZW51SXRlbXMsIGNsaWVudFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiXHJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXHJcbiAgICAgIHNoYXJlR2V0TGluazogdHIgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiXHJcbiAgICAgIHNoYXJlVXBkYXRlOiB0ciBcIn5NRU5VLlNIQVJFX1VQREFURVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IHRyIFwifk1FTlUuUkVWRVJUX1RPXCJcclxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcclxuXHJcbiAgICBzdWJNZW51cyA9XHJcbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cclxuICAgICAgc2hhcmVTdWJNZW51OiBbJ3NoYXJlR2V0TGluaycsICdzaGFyZVVwZGF0ZSddXHJcblxyXG4gICAgaXRlbXMgPSBbXVxyXG4gICAgZm9yIGl0ZW0sIGkgaW4gbWVudUl0ZW1zXHJcbiAgICAgIGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBtZW51SXRlbSA9XHJcbiAgICAgICAgICBrZXk6IFwic2VwZXJhdG9yI3tpfVwiXHJcbiAgICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbWVudUl0ZW0gPVxyXG4gICAgICAgICAga2V5OiBpdGVtXHJcbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgICAgZW5hYmxlZDogc2V0RW5hYmxlZCBpdGVtXHJcbiAgICAgICAgICBpdGVtczogZ2V0SXRlbXMgc3ViTWVudXNbaXRlbV1cclxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG1lbnVJdGVtID0gaXRlbVxyXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5rZXkgPSBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcclxuICAgICAgICBtZW51SXRlbS5pdGVtcyA9IGl0ZW0uaXRlbXMgb3IgZ2V0SXRlbXMgaXRlbS5uYW1lXHJcbiAgICAgIGl0ZW1zLnB1c2ggbWVudUl0ZW1cclxuICAgIGl0ZW1zXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdwcmVwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncmVwbGFjZU1lbnVJdGVtJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQWZ0ZXInLFxyXG4gICAgICBrZXk6IGtleVxyXG4gICAgICBpdGVtOiBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2V0TWVudUJhckluZm8nLCBpbmZvXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVDb3B5JywgKHRyICd+RElBTE9HLlNBVkVfQ09QWScpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgbWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWltZVR5cGU6IG1pbWVUeXBlXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGZpbGVuYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1JlbmFtZURpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgc2hhcmVVcmxEaWFsb2c6ICh1cmwpIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dTaGFyZVVybERpYWxvZycsXHJcbiAgICAgIHVybDogdXJsXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT5cclxuICByZXQgPSBudWxsXHJcbiAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuc29tZSAocGFpcikgLT5cclxuICAgIHBhaXIuc3BsaXQoXCI9XCIpWzBdIGlzIHBhcmFtIGFuZCAocmV0ID0gcGFpci5zcGxpdChcIj1cIilbMV0pXHJcbiAgcmV0XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXHJcbiIsIm1vZHVsZS5leHBvcnRzID1cclxuICBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuUkVPUEVOXCI6IFwiUmV2ZXJ0IHRvIHJlY2VudGx5IG9wZW5lZCBzdGF0ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5NRU5VLlNIQVJFXCI6IFwiU2hhcmUuLi5cIlxyXG4gIFwifk1FTlUuU0hBUkVfR0VUX0xJTktcIjogXCJHZXQgbGluayB0byBzaGFyZWQgdmlld1wiXHJcbiAgXCJ+TUVOVS5TSEFSRV9VUERBVEVcIjogXCJVcGRhdGUgc2hhcmVkIHZpZXdcIlxyXG4gIFwifk1FTlUuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+TUVOVS5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPXCI6IFwiUmV2ZXJ0IHRvLi4uXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiOiBcIlJlY2VudGx5IG9wZW5lZCBzdGF0ZVwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIjogXCJTaGFyZWQgdmlld1wiXHJcblxyXG4gIFwifkRJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+RElBTE9HLlNBVkVfQ09QWVwiOiBcIlNhdmUgQSBDb3B5IC4uLlwiXHJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+RElBTE9HLlNIQVJFRFwiOiBcIlNoYXJlZCBEb2N1bWVudFwiXHJcblxyXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcclxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxyXG4gIFwiflBST1ZJREVSLkdPT0dMRV9EUklWRVwiOiBcIkdvb2dsZSBEcml2ZVwiXHJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXHJcblxyXG4gIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCI6IFwiRmlsZW5hbWVcIlxyXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSAle2ZpbGVuYW1lfT9cIlxyXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcclxuXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5SRU5BTUVfRElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWVwiOiBcIkNvcHlcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5WSUVXXCI6IFwiVmlld1wiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNMT1NFXCI6IFwiQ2xvc2VcIlxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIjogXCJUaGUgc2hhcmUgdXJsIGhhcyBiZWVuIGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlfRVJST1JcIjogXCJTb3JyeSwgdGhlIHNoYXJlIHVybCB3YXMgbm90IGFibGUgdG8gYmUgY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuXCJcclxuXHJcbiAgXCJ+Q09ORklSTS5PUEVOX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgb3BlbiBhIG5ldyBmaWxlP1wiXHJcbiAgXCJ+Q09ORklSTS5ORVdfRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBhIG5ldyBmaWxlP1wiXHJcbiAgXCJ+Q09ORklSTS5SRU9QRU5fRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZW9wZW4gdGhlIGZpbGUgYW5kIHJldHVybiB0byBpdHMgbGFzdCBzYXZlZCBzdGF0ZT9cIlxyXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cclxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xyXG5kZWZhdWx0TGFuZyA9ICdlbidcclxudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xyXG5cclxudHJhbnNsYXRlID0gKGtleSwgdmFycz17fSwgbGFuZz1kZWZhdWx0TGFuZykgLT5cclxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcclxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XHJcbiAgICBpZiB2YXJzLmhhc093blByb3BlcnR5IGtleSB0aGVuIHZhcnNba2V5XSBlbHNlIFwiJyoqIFVLTk9XTiBLRVk6ICN7a2V5fSAqKlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxyXG4iLCJNZW51QmFyID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21lbnUtYmFyLXZpZXcnXHJcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcclxuRG93bmxvYWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZG93bmxvYWQtZGlhbG9nLXZpZXcnXHJcblJlbmFtZURpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9yZW5hbWUtZGlhbG9nLXZpZXcnXHJcblNoYXJlVXJsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NoYXJlLXVybC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbntkaXYsIGlmcmFtZX0gPSBSZWFjdC5ET01cclxuXHJcbklubmVyQXBwID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcclxuXHJcbiAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiAobmV4dFByb3BzKSAtPlxyXG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcclxuICAgICAgKGlmcmFtZSB7c3JjOiBAcHJvcHMuYXBwfSlcclxuICAgIClcclxuXHJcbkFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcclxuXHJcbiAgZ2V0RmlsZW5hbWU6IC0+XHJcbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIGFuZCBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWU/Lmxlbmd0aCA+IDBcclxuICAgICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YS5uYW1lXHJcbiAgICBlbHNlXHJcbiAgICAgICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpXHJcblxyXG4gIGdldFByb3ZpZGVyOiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcclxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cclxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICBzaGFyZVVybERpYWxvZzogbnVsbFxyXG4gICAgZGlydHk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5jbGllbnQubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xyXG4gICAgICAgIHttZXNzYWdlOiBcIlNhdmluZy4uLlwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuc2F2ZWRcclxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuZGlydHlcclxuICAgICAgICB7bWVzc2FnZTogJ1Vuc2F2ZWQnLCB0eXBlOiAnYWxlcnQnfVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgICAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcclxuICAgICAgICBmaWxlU3RhdHVzOiBmaWxlU3RhdHVzXHJcblxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ2Nvbm5lY3RlZCdcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXHJcblxyXG4gICAgQHByb3BzLmNsaWVudC5fdWkubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdzaG93UHJvdmlkZXJEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcHJvdmlkZXJEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgZG93bmxvYWREaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93UmVuYW1lRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dTaGFyZVVybERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBzaGFyZVVybERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ2FwcGVuZE1lbnVJdGVtJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdwcmVwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3JlcGxhY2VNZW51SXRlbSdcclxuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XHJcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXHJcbiAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXNbaW5kZXhdID0gZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUJlZm9yZSdcclxuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XHJcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXHJcbiAgICAgICAgICAgIGlmIGluZGV4IGlzIDBcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCwgMCwgZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUFmdGVyJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXggKyAxLCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3NldE1lbnVCYXJJbmZvJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudU9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc1xyXG5cclxuICBfZ2V0TWVudUl0ZW1JbmRleDogKGtleSkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGtleVxyXG4gICAgICBmb3IgaXRlbSwgaW5kZXggaW4gQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHJldHVybiBpbmRleCBpZiBpdGVtLmtleSBpcyBrZXlcclxuICAgICAgLTFcclxuICAgIGVsc2VcclxuICAgICAgaW5kZXggPSBwYXJzZUludCBrZXksIDEwXHJcbiAgICAgIGlmIGlzTmFOKGluZGV4KSBvciBpbmRleCA8IDAgb3IgaW5kZXggPiBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAtMVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaW5kZXhcclxuXHJcbiAgY2xvc2VEaWFsb2dzOiAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICAgIHJlbmFtZURpYWxvZzogbnVsbFxyXG4gICAgICBzaGFyZVVybERpYWxvZzogbnVsbFxyXG5cclxuICByZW5kZXJEaWFsb2dzOiAtPlxyXG4gICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgIChQcm92aWRlclRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5wcm92aWRlckRpYWxvZywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBtaW1lVHlwZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLm1pbWVUeXBlLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucmVuYW1lRGlhbG9nXHJcbiAgICAgIChSZW5hbWVEaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUucmVuYW1lRGlhbG9nLmZpbGVuYW1lLCBjYWxsYmFjazogQHN0YXRlLnJlbmFtZURpYWxvZy5jYWxsYmFjaywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuc2hhcmVVcmxEaWFsb2dcclxuICAgICAgKFNoYXJlVXJsRGlhbG9nIHt1cmw6IEBzdGF0ZS5zaGFyZVVybERpYWxvZy51cmwsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIChNZW51QmFyIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcclxuICAgICAgICAoSW5uZXJBcHAge2FwcDogQHByb3BzLmFwcH0pXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZyBvciBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXBwXHJcbiIsIkF1dGhvcml6ZU1peGluID1cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBhdXRob3JpemVkOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcclxuICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEb3dubG9hZERpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICBkb3dubG9hZDogKGUpIC0+XHJcbiAgICBpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgZS50YXJnZXQuc2V0QXR0cmlidXRlICdocmVmJywgXCJkYXRhOiN7QHByb3BzLm1pbWVUeXBlfSwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudC5nZXRUZXh0KCkpfVwiXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2Rvd25sb2FkLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGEge2hyZWY6ICcjJywgY2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIGRvd25sb2FkOiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLCBvbkNsaWNrOiBAZG93bmxvYWR9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRCcpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCB1bCwgbGksIHN2ZywgZywgcmVjdH0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIG1vdXNlRW50ZXI6IC0+XHJcbiAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgICBtZW51SXRlbSA9ICQgUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuaXRlbVxyXG4gICAgICBtZW51ID0gbWVudUl0ZW0ucGFyZW50KCkucGFyZW50KClcclxuXHJcbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51XHJcbiAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJ1xyXG4gICAgICAgICAgbGVmdDogbWVudS53aWR0aCgpXHJcbiAgICAgICAgICB0b3A6IG1lbnVJdGVtLnBvc2l0aW9uKCkudG9wIC0gcGFyc2VJbnQobWVudUl0ZW0uY3NzKCdwYWRkaW5nLXRvcCcpKVxyXG4gICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMuc2V0U3ViTWVudT8gbnVsbFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBlbmFibGVkID0gaWYgQHByb3BzLml0ZW0uaGFzT3duUHJvcGVydHkgJ2VuYWJsZWQnXHJcbiAgICAgIGlmIHR5cGVvZiBAcHJvcHMuaXRlbS5lbmFibGVkIGlzICdmdW5jdGlvbidcclxuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWRcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICAgIGNsYXNzZXMgPSBbJ21lbnVJdGVtJ11cclxuICAgIGlmIEBwcm9wcy5pdGVtLnNlcGFyYXRvclxyXG4gICAgICBjbGFzc2VzLnB1c2ggJ3NlcGFyYXRvcidcclxuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpfSwgJycpXHJcbiAgICBlbHNlXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnZGlzYWJsZWQnIGlmIG5vdCBlbmFibGVkIG9yIG5vdCAoQHByb3BzLml0ZW0uYWN0aW9uIG9yIEBwcm9wcy5pdGVtLml0ZW1zKVxyXG4gICAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxyXG4gICAgICAobGkge3JlZjogJ2l0ZW0nLCBjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpLCBvbkNsaWNrOiBAY2xpY2tlZCwgb25Nb3VzZUVudGVyOiBAbW91c2VFbnRlciB9LFxyXG4gICAgICAgIG5hbWVcclxuICAgICAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xyXG4gICAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24taW5zcGVjdG9yQXJyb3ctY29sbGFwc2UnfSlcclxuICAgICAgKVxyXG5cclxuRHJvcERvd24gPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzaG93aW5nTWVudTogZmFsc2VcclxuICAgIHRpbWVvdXQ6IG51bGxcclxuICAgIHN1Yk1lbnU6IG51bGxcclxuXHJcbiAgYmx1cjogLT5cclxuICAgIEB1bmJsdXIoKVxyXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZSwgc3ViTWVudTogZmFsc2V9ICksIDUwMFxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiB0aW1lb3V0fVxyXG5cclxuICB1bmJsdXI6IC0+XHJcbiAgICBpZiBAc3RhdGUudGltZW91dFxyXG4gICAgICBjbGVhclRpbWVvdXQoQHN0YXRlLnRpbWVvdXQpXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XHJcblxyXG4gIHNldFN1Yk1lbnU6IChzdWJNZW51KSAtPlxyXG4gICAgQHNldFN0YXRlIHN1Yk1lbnU6IHN1Yk1lbnVcclxuXHJcbiAgc2VsZWN0OiAoaXRlbSkgLT5cclxuICAgIHJldHVybiBpZiBpdGVtPy5pdGVtc1xyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGl0ZW0uYWN0aW9uPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIG1lbnVDbGFzcyA9IGlmIEBzdGF0ZS5zaG93aW5nTWVudSB0aGVuICdtZW51LXNob3dpbmcnIGVsc2UgJ21lbnUtaGlkZGVuJ1xyXG4gICAgc2VsZWN0ID0gKGl0ZW0pID0+XHJcbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICAoc3ZnIHt2ZXJzaW9uOiAnMS4xJywgd2lkdGg6IDE2LCBoZWlnaHQ6IDE2LCB2aWV3Qm94OiAnMCAwIDE2IDE2JywgZW5hYmxlQmFja2dyb3VuZDogJ25ldyAwIDAgMTYgMTYnfSxcclxuICAgICAgICAgIChnIHt9LFxyXG4gICAgICAgICAgICAocmVjdCB7eTogMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgICAocmVjdCB7eTogNywgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgICAocmVjdCB7eTogMTIsIHdpZHRoOiAxNiwgaGVpZ2h0OiAyfSlcclxuICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgc2V0U3ViTWVudTogQHNldFN1Yk1lbnV9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICBpZiBAc3RhdGUuc3ViTWVudVxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgc3R5bGU6IEBzdGF0ZS5zdWJNZW51LnN0eWxlfSxcclxuICAgICAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGluZGV4LCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3R9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHN0YXRlLnN1Yk1lbnUuaXRlbXNcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERyb3BEb3duXHJcbiIsIkF1dGhvcml6ZU1peGluID0gcmVxdWlyZSAnLi9hdXRob3JpemUtbWl4aW4nXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxue2RpdiwgaW1nLCBpLCBzcGFuLCBpbnB1dCwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3RGaWxlJ1xyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAbGFzdENsaWNrID0gMFxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxyXG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMubWV0YWRhdGFcclxuICAgIGlmIG5vdyAtIEBsYXN0Q2xpY2sgPD0gMjUwXHJcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcclxuICAgIEBsYXN0Q2xpY2sgPSBub3dcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IChpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAnc2VsZWN0ZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAZmlsZVNlbGVjdGVkfSxcclxuICAgICAgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6IGlmIEBwcm9wcy5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyIHRoZW4gJ2ljb24taW5zcGVjdG9yQXJyb3ctY29sbGFwc2UnIGVsc2UgJ2ljb24tbm90ZVRvb2wnfSlcclxuICAgICAgQHByb3BzLm1ldGFkYXRhLm5hbWVcclxuICAgIClcclxuXHJcbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRpbmc6IHRydWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAbG9hZCBAcHJvcHMuZm9sZGVyXHJcblxyXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBpZiBuZXh0UHJvcHMuZm9sZGVyIGlzbnQgQHByb3BzLmZvbGRlclxyXG4gICAgICBAbG9hZCBuZXh0UHJvcHMuZm9sZGVyXHJcblxyXG4gIGxvYWQ6IChmb2xkZXIpIC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBmb2xkZXIsIChlcnIsIGxpc3QpID0+XHJcbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxyXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XHJcblxyXG4gIHBhcmVudFNlbGVjdGVkOiAoZSkgLT5cclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLmZvbGRlcj8ucGFyZW50XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgaWYgQHByb3BzLmZvbGRlciBpc250IG51bGxcclxuICAgICAgbGlzdC5wdXNoIChkaXYge2tleTogJ3BhcmVudCcsIG9uQ2xpY2s6IEBwYXJlbnRTZWxlY3RlZH0sIChSZWFjdC5ET00uaSB7Y2xhc3NOYW1lOiAnaWNvbi1wYWxldHRlQXJyb3ctY29sbGFwc2UnfSksICdQYXJlbnQgRm9sZGVyJylcclxuICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxyXG4gICAgICBsaXN0LnB1c2ggKEZpbGVMaXN0RmlsZSB7a2V5OiBpLCBtZXRhZGF0YTogbWV0YWRhdGEsIHNlbGVjdGVkOiBAcHJvcHMuc2VsZWN0ZWRGaWxlIGlzIG1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBwcm9wcy5maWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBwcm9wcy5maWxlQ29uZmlybWVkfSlcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xyXG4gICAgICAgIHRyIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbGlzdFxyXG4gICAgKVxyXG5cclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlRGlhbG9nVGFiJ1xyXG5cclxuICBtaXhpbnM6IFtBdXRob3JpemVNaXhpbl1cclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgQGdldFN0YXRlRm9yRm9sZGVyIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XHJcbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICBtZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWUsIEBzdGF0ZS5saXN0XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG5cclxuICBsaXN0TG9hZGVkOiAobGlzdCkgLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBsaXN0OiBsaXN0XHJcbiAgICAgIG1ldGFkYXRhOiBAZmluZE1ldGFkYXRhICQudHJpbShAc3RhdGUuZmlsZW5hbWUpLCBsaXN0XHJcblxyXG4gIGdldFN0YXRlRm9yRm9sZGVyOiAoZm9sZGVyKSAtPlxyXG4gICAgZm9sZGVyOiBmb2xkZXJcclxuICAgIG1ldGFkYXRhOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xyXG4gICAgbGlzdDogW11cclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBAc2V0U3RhdGUgQGdldFN0YXRlRm9yRm9sZGVyIG1ldGFkYXRhXHJcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2V0U3RhdGUgQGdldFN0YXRlRm9yRm9sZGVyIG51bGxcclxuXHJcbiAgY29uZmlybTogLT5cclxuICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWUsIEBzdGF0ZS5saXN0XHJcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBpZiBAaXNPcGVuXHJcbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwYXJlbnQ6IEBzdGF0ZS5mb2xkZXIgb3IgbnVsbFxyXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXHJcbiAgICAgIEBwcm9wcy5kaWFsb2cuY2FsbGJhY2s/IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICByZW1vdmU6IC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVtb3ZlIEBzdGF0ZS5tZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICBpZiBub3QgZXJyXHJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxyXG4gICAgICAgICAgaW5kZXggPSBsaXN0LmluZGV4T2YgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBsaXN0LnNwbGljZSBpbmRleCwgMVxyXG4gICAgICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGZpbmRNZXRhZGF0YTogKGZpbGVuYW1lLCBsaXN0KSAtPlxyXG4gICAgZm9yIG1ldGFkYXRhIGluIGxpc3RcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxyXG4gICAgICAgIHJldHVybiBtZXRhZGF0YVxyXG4gICAgbnVsbFxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgICBAY29uZmlybSgpXHJcblxyXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cclxuICAgIChAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDApIG9yIChAaXNPcGVuIGFuZCBub3QgQHN0YXRlLm1ldGFkYXRhKVxyXG5cclxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cclxuICAgIGNvbmZpcm1EaXNhYmxlZCA9IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgcmVtb3ZlRGlzYWJsZWQgPSAoQHN0YXRlLm1ldGFkYXRhIGlzIG51bGwpIG9yIChAc3RhdGUubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlcilcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcclxuICAgICAgKGlucHV0IHt0eXBlOiAndGV4dCcsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIHBsYWNlaG9sZGVyOiAodHIgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIiksIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbktleURvd246IEB3YXRjaEZvckVudGVyfSlcclxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNvbmZpcm0sIGRpc2FibGVkOiBjb25maXJtRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgY29uZmlybURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgaWYgQGlzT3BlbiB0aGVuICh0ciBcIn5GSUxFX0RJQUxPRy5PUEVOXCIpIGVsc2UgKHRyIFwifkZJTEVfRElBTE9HLlNBVkVcIikpXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHJlbW92ZSwgZGlzYWJsZWQ6IHJlbW92ZURpc2FibGVkLCBjbGFzc05hbWU6IGlmIHJlbW92ZURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgKHRyIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiKSlcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY2FuY2VsfSwgKHRyIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiKSlcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXHJcbiIsIntkaXYsIGksIHNwYW4sIGlucHV0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG5leHRQcm9wcy5maWxlbmFtZVxyXG5cclxuICBmaWxlbmFtZUNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXHJcbiAgICAgICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogdHJ1ZVxyXG4gICAgICAgIHNldFRpbWVvdXQgKD0+IEBmb2N1c0ZpbGVuYW1lKCkpLCAxMFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLmNsaWVudC5zYXZlRmlsZURpYWxvZygpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogLT5cclxuICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogQGZpbGVuYW1lKCkudmFsdWVcclxuXHJcbiAgZmlsZW5hbWVCbHVycmVkOiAtPlxyXG4gICAgQHJlbmFtZSgpXHJcblxyXG4gIGZpbGVuYW1lOiAtPlxyXG4gICAgUmVhY3QuZmluZERPTU5vZGUoQHJlZnMuZmlsZW5hbWUpXHJcblxyXG4gIGZvY3VzRmlsZW5hbWU6IC0+XHJcbiAgICBlbCA9IEBmaWxlbmFtZSgpXHJcbiAgICBlbC5mb2N1cygpXHJcbiAgICBpZiB0eXBlb2YgZWwuc2VsZWN0aW9uU3RhcnQgaXMgJ251bWJlcidcclxuICAgICAgZWwuc2VsZWN0aW9uU3RhcnQgPSBlbC5zZWxlY3Rpb25FbmQgPSBlbC52YWx1ZS5sZW5ndGhcclxuICAgIGVsc2UgaWYgdHlwZW9mIGVsLmNyZWF0ZVRleHRSYW5nZSBpc250ICd1bmRlZmluZWQnXHJcbiAgICAgIHJhbmdlID0gZWwuY3JlYXRlVGV4dFJhbmdlKClcclxuICAgICAgcmFuZ2UuY29sbGFwc2UgZmFsc2VcclxuICAgICAgcmFuZ2Uuc2VsZWN0KClcclxuXHJcbiAgcmVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAc3RhdGUuZmlsZW5hbWUucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG4gICAgaWYgZmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2xpZW50LnJlbmFtZSBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLCBmaWxlbmFtZVxyXG4gICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTNcclxuICAgICAgQHJlbmFtZSgpXHJcbiAgICBlbHNlIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogQHByb3BzLmZpbGVuYW1lXHJcbiAgICAgICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG5cclxuICBoZWxwOiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLm9wdGlvbnMuaGVscCwgJ19ibGFuaydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxyXG4gICAgICAgIChEcm9wZG93biB7aXRlbXM6IEBwcm9wcy5pdGVtc30pXHJcbiAgICAgICAgaWYgQHN0YXRlLmVkaXRpbmdGaWxlbmFtZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30sXHJcbiAgICAgICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25CbHVyOiBAZmlsZW5hbWVCbHVycmVkLCBvbktleURvd246IEB3YXRjaEZvckVudGVyfSlcclxuICAgICAgICAgIClcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnLCBvbkNsaWNrOiBAZmlsZW5hbWVDbGlja2VkfSwgQHN0YXRlLmZpbGVuYW1lKVxyXG4gICAgICAgIGlmIEBwcm9wcy5maWxlU3RhdHVzXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItcmlnaHQnfSxcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlciBhbmQgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQoKVxyXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmhlbHBcclxuICAgICAgICAgIChpIHtzdHlsZToge2ZvbnRTaXplOiBcIjEzcHhcIn0sIGNsYXNzTmFtZTogJ2NsaWNrYWJsZSBpY29uLWhlbHAnLCBvbkNsaWNrOiBAaGVscH0pXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcclxuXHJcbiAgY2xvc2U6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxyXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcclxuXHJcbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgKVxyXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXHJcbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGVDb3B5JywgJ3NhdmVGaWxlQ29weScgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXHJcblxyXG4gICAgdGFicyA9IFtdXHJcbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxyXG4gICAgZm9yIHByb3ZpZGVyLCBpIGluIEBwcm9wcy5jbGllbnQuc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIG5vdCBjYXBhYmlsaXR5IG9yIHByb3ZpZGVyLmNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXHJcbiAgICAgICAgICBzZWxlY3RlZFRhYkluZGV4ID0gaVxyXG5cclxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICByZW5hbWU6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jYWxsYmFjaz8gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdyZW5hbWUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYnV0dG9uIHtjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgb25DbGljazogQHJlbmFtZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5SRU5BTUUnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35SRU5BTUVfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xyXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1NoYXJlVXJsRGlhbG9nVmlldydcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy51cmwpPy5zZWxlY3QoKVxyXG5cclxuICB2aWV3OiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLnVybFxyXG5cclxuICAjIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vc3Vkb2Rva2kvY29weS10by1jbGlwYm9hcmQvYmxvYi9tYXN0ZXIvaW5kZXguanNcclxuICBjb3B5OiAtPlxyXG4gICAgY29waWVkID0gdHJ1ZVxyXG4gICAgdHJ5XHJcbiAgICAgIG1hcmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdtYXJrJ1xyXG4gICAgICBtYXJrLmlubmVySFRNTCA9IEBwcm9wcy51cmxcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCBtYXJrXHJcblxyXG4gICAgICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKVxyXG4gICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuXHJcbiAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxyXG4gICAgICByYW5nZS5zZWxlY3ROb2RlIG1hcmtcclxuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlIHJhbmdlXHJcblxyXG4gICAgICBjb3BpZWQgPSBkb2N1bWVudC5leGVjQ29tbWFuZCAnY29weSdcclxuICAgIGNhdGNoXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIHdpbmRvdy5jbGlwYm9hcmREYXRhLnNldERhdGEgJ3RleHQnLCBAcHJvcHMudXJsXHJcbiAgICAgIGNhdGNoXHJcbiAgICAgICAgY29waWVkID0gZmFsc2VcclxuICAgIGZpbmFsbHlcclxuICAgICAgaWYgc2VsZWN0aW9uXHJcbiAgICAgICAgaWYgdHlwZW9mIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgcmFuZ2VcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuICAgICAgaWYgbWFya1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQgbWFya1xyXG4gICAgICBhbGVydCB0ciAoaWYgY29waWVkIHRoZW4gXCJ+U0hBUkVfRElBTE9HLkNPUFlfU1VDQ0VTU1wiIGVsc2UgXCJ+U0hBUkVfRElBTE9HLkNPUFlfRVJST1JcIilcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlNIQVJFRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc2hhcmUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICd1cmwnLCB2YWx1ZTogQHByb3BzLnVybCwgcmVhZE9ubHk6IHRydWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIGlmIGRvY3VtZW50LmV4ZWNDb21tYW5kIG9yIHdpbmRvdy5jbGlwYm9hcmREYXRhXHJcbiAgICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb3B5fSwgdHIgJ35TSEFSRV9ESUFMT0cuQ09QWScpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAdmlld30sIHRyICd+U0hBUkVfRElBTE9HLlZJRVcnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35TSEFSRV9ESUFMT0cuQ0xPU0UnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXHJcblxyXG5jbGFzcyBUYWJJbmZvXHJcbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cclxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcclxuXHJcblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFRhYidcclxuXHJcbiAgY2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXHJcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4IG9yIDBcclxuXHJcbiAgc3RhdGljczpcclxuICAgIFRhYjogKHNldHRpbmdzKSAtPiBuZXcgVGFiSW5mbyBzZXR0aW5nc1xyXG5cclxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxyXG4gICAgQHNldFN0YXRlIHNlbGVjdGVkVGFiSW5kZXg6IGluZGV4XHJcblxyXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XHJcbiAgICAoVGFiXHJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcclxuICAgICAga2V5OiBpbmRleFxyXG4gICAgICBpbmRleDogaW5kZXhcclxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcclxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclRhYnM6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFicyd9LFxyXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYi1jb21wb25lbnQnfSxcclxuICAgICAgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnNcclxuICAgICAgICAoZGl2IHtcclxuICAgICAgICAgIGtleTogaW5kZXhcclxuICAgICAgICAgIHN0eWxlOlxyXG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0YWIuY29tcG9uZW50XHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogXCJ0YWJiZWQtcGFuZWxcIn0sXHJcbiAgICAgIEByZW5kZXJUYWJzKClcclxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxyXG4gICAgKVxyXG4iXX0=
