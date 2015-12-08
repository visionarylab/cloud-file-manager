(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu, getQueryParam;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

getQueryParam = require('./utils/get-query-param');

CloudFileManager = (function() {
  function CloudFileManager(options) {
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;
    this.AutoSaveMenu = CloudFileManagerUIMenu.AutoSaveMenu;
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
var CloudContent, CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, DocumentStoreProvider, GoogleDriveProvider, LocalStorageProvider, ReadOnlyProvider, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUI = (require('./ui')).CloudFileManagerUI;

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

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
      return this.autoSave(this.appOptions.autoSaveInterval);
    }
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

  CloudFileManagerClient.prototype.getEmptyContent = function() {
    return new CloudContent();
  };

  CloudFileManagerClient.prototype.createContent = function(content) {
    return new CloudContent(content);
  };

  CloudFileManagerClient.prototype.createTextContent = function(text) {
    var content;
    content = new CloudContent();
    content.initText(text);
    return content;
  };

  CloudFileManagerClient.prototype.createJSONContent = function(json) {
    var content;
    content = new CloudContent();
    content.initJSON(json);
    return content;
  };

  CloudFileManagerClient.prototype.newFile = function(callback) {
    if (callback == null) {
      callback = null;
    }
    this._closeCurrentFile();
    this._resetState();
    return this._event('newedFile', {
      content: this.getEmptyContent()
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
      return function(err, content) {
        if (err) {
          return _this._error(err);
        }
        return _this._fileChanged('openedFile', content, null, {
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
      return function(content) {
        return _this.saveContent(content, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveContent = function(content, callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this.saveFile(content, this.state.metadata, callback);
    } else {
      return this.saveFileDialog(content, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFile = function(content, metadata, callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    if (metadata != null ? (ref = metadata.provider) != null ? ref.can('save') : void 0 : void 0) {
      this._setState({
        saving: metadata
      });
      return metadata.provider.save(content, metadata, (function(_this) {
        return function(err) {
          if (err) {
            return _this._error(err);
          }
          if (_this.state.metadata !== metadata) {
            _this._closeCurrentFile();
          }
          _this._fileChanged('savedFile', content, metadata, {
            saved: true
          });
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        };
      })(this));
    } else {
      return this.saveFileDialog(content, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFileDialog = function(content, callback) {
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(content, metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveFileAsDialog = function(content, callback) {
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileAsDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(content, metadata, callback);
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

  CloudFileManagerClient.prototype.share = function() {
    if (this.state.shareProvider) {
      return this._event('getContent', {}, (function(_this) {
        return function(content) {
          _this._setState({
            saving: true
          });
          return _this.state.shareProvider.saveSharedContent(content, function(err, sharedContentId) {
            var path, shareQuery;
            _this._setState({
              saving: false
            });
            if (err) {
              return _this._error(err);
            }
            path = document.location.origin + document.location.pathname;
            shareQuery = "?openShared=" + sharedContentId;
            return _this._ui.shareUrlDialog("" + path + shareQuery);
          });
        };
      })(this));
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
          if (err) {
            return _this._error(err);
          }
          _this._setState({
            metadata: metadata
          });
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
      return this._fileChanged('openedFile', this.state.openedContent, this.state.metadata);
    }
  };

  CloudFileManagerClient.prototype.reopenDialog = function(callback) {
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

  CloudFileManagerClient.prototype._dialogSave = function(content, metadata, callback) {
    if (content !== null) {
      return this.saveFile(content, metadata, callback);
    } else {
      return this._event('getContent', {}, (function(_this) {
        return function(content) {
          return _this.saveFile(content, metadata, callback);
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
      content: content,
      metadata: metadata
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

  return CloudFileManagerClient;

})();

module.exports = {
  CloudFileManagerClientEvent: CloudFileManagerClientEvent,
  CloudFileManagerClient: CloudFileManagerClient
};



},{"./providers/document-store-provider":32,"./providers/google-drive-provider":33,"./providers/localstorage-provider":34,"./providers/provider-interface":35,"./providers/readonly-provider":36,"./ui":37,"./utils/is-string":39,"./utils/translate":41}],32:[function(require,module,exports){
var CloudContent, CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, div, documentStore, isString, jiff, listUrl, loadDocumentUrl, patchDocumentUrl, ref, removeDocumentUrl, renameDocumentUrl, saveDocumentUrl, span, tr,
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

CloudContent = (require('./provider-interface')).CloudContent;

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
      type: CloudMetadata.File
    });
    return this.load(sharedMetadata, callback);
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
        if (this.options.patch) {
          this.previouslySavedContent = data;
        }
        return callback(null, new CloudContent(data.content || data));
      },
      error: function() {
        var message, ref2;
        message = metadata.sharedContentId ? "Unable to load document '" + metadata.sharedContentId + "'. Perhaps the file was not shared?" : "Unable to load " + (metadata.name || ((ref2 = metadata.providerData) != null ? ref2.id : void 0) || 'file');
        return callback(message);
      }
    });
  };

  DocumentStoreProvider.prototype.saveSharedContent = function(content, callback) {
    var runKey, sharedMetadata;
    runKey = Math.random().toString(16).substring(2);
    sharedMetadata = new CloudMetadata({
      sharedContentSecretKey: runKey,
      type: CloudMetadata.File
    });
    return this.save(content, sharedMetadata, function(err, data) {
      return callback(err, data.id);
    });
  };

  DocumentStoreProvider.prototype.save = function(content, metadata, callback) {
    var diff, params, sendContent, url, withCredentials;
    content = this._wrapContent(content.getContent(), metadata.sharedContentSecretKey);
    withCredentials = true;
    params = {};
    if (metadata.providerData.id) {
      params.recordid = metadata.providerData.id;
    }
    if (metadata.sharedContentSecretKey) {
      params.runKey = metadata.sharedContentSecretKey;
      withCredentials = false;
    }
    if (metadata.overwritable && this.previouslySavedContent && (diff = this._createDiff(this.previouslySavedContent, content))) {
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
      data: sendContent,
      context: this,
      xhrFields: {
        withCredentials: withCredentials
      },
      success: function(data) {
        if (this.options.patch) {
          this.previouslySavedContent = content;
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

  DocumentStoreProvider.prototype._wrapContent = function(content, share) {
    var error;
    if (isString(content)) {
      try {
        content = JSON.parse(content);
      } catch (error) {

      }
    }
    return JSON.stringify({
      appName: this.options.appName,
      appVersion: this.options.appVersion,
      appBuildNum: this.options.appBuildNum,
      content: content,
      _permissions: share ? 1 : 0
    });
  };

  DocumentStoreProvider.prototype._createDiff = function(json1, json2) {
    var diff, error, opts;
    try {
      opts = typeof this.options.patchObjectHash === "function" ? {
        hash: this.options.patchObjectHash
      } : void 0;
      diff = jiff.diff(JSON.parse(json1), JSON.parse(json2), opts);
      return JSON.stringify(diff);
    } catch (error) {
      return null;
    }
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":39,"../utils/translate":41,"./provider-interface":35,"jiff":17}],33:[function(require,module,exports){
var CloudContent, CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, RealTimeError, RealTimeInfo, button, div, isString, jsdiff, ref, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

tr = require('../utils/translate');

isString = require('../utils/is-string');

jsdiff = require('diff');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudContent = (require('./provider-interface')).CloudContent;

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
            return callback(null, new CloudContent(xhr.responseText));
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
    header = JSON.stringify(headerData);
    ref4 = ((ref3 = metadata.providerData) != null ? ref3.id : void 0) ? ['PUT', "/upload/drive/v2/files/" + metadata.providerData.id] : ['POST', '/upload/drive/v2/files'], method = ref4[0], path = ref4[1];
    body = ["\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + header, "\r\n--" + boundary + "\r\nContent-Type: " + this.mimeType + "\r\n\r\n" + (content.getText()), "\r\n--" + boundary + "--"].join('');
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
      return callback(null, new CloudContent(content.getText()));
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
    diffs = jsdiff.diffChars(realTimeContent.getText(), content.getText());
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
var CloudContent, CloudMetadata, LocalStorageProvider, ProviderInterface, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudContent = (require('./provider-interface')).CloudContent;

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
      window.localStorage.setItem(fileKey, content.getText());
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      return callback("Unable to save: " + e.message);
    }
  };

  LocalStorageProvider.prototype.load = function(metadata, callback) {
    var e, error;
    try {
      return callback(null, new CloudContent(window.localStorage.getItem(this._getKey(metadata.name))));
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
var CloudContent, CloudFile, CloudMetadata, ProviderInterface, div, isString;

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

CloudContent = (function() {
  function CloudContent(_1, options) {
    this._ = _1 != null ? _1 : null;
    if (options == null) {
      options = {};
    }
    this.dirty = false;
  }

  CloudContent.prototype.getContent = function() {
    return this._;
  };

  CloudContent.prototype.initContent = function(content) {
    return this.setContent(content, {
      dirty: false
    });
  };

  CloudContent.prototype.setContent = function(content, options) {
    if (options == null) {
      options = {};
    }
    this._ = content;
    this.dirty = options.hasOwnProperty('dirty') ? options.dirty : true;
    return this;
  };

  CloudContent.prototype.clone = function() {
    return new CloudContent(_.cloneDeep(this._));
  };

  CloudContent.prototype.getText = function() {
    if (this._ === null) {
      return '';
    } else if (isString(this._)) {
      return this._;
    } else {
      return JSON.stringify(this._);
    }
  };

  CloudContent.prototype.initText = function(text) {
    return this.setText(text, {
      dirty: false
    });
  };

  CloudContent.prototype.setText = function(text, options) {
    return this.setContent(text, options);
  };

  CloudContent.prototype.getJSON = function() {
    if (isString(this._)) {
      return JSON.parse(this._);
    } else {
      return this._;
    }
  };

  CloudContent.prototype.initJSON = function(json) {
    return this.setJSON(json, {
      dirty: false
    });
  };

  CloudContent.prototype.setJSON = function(json, options) {
    return this.setContent((isString(json) ? json : JSON.stringify(json)), options);
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
  ProviderInterface: ProviderInterface
};



},{"../utils/is-string":39}],36:[function(require,module,exports){
var CloudContent, CloudMetadata, ProviderInterface, ReadOnlyProvider, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudContent = (require('./provider-interface')).CloudContent;

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
      content = new CloudContent(json[filename]);
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'save', 'saveFileAsDialog', 'share', 'downloadDialog', 'renameDialog'];

  CloudFileManagerUIMenu.AutoSaveMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'saveCopyDialog', 'share', 'downloadDialog', 'renameDialog'];

  function CloudFileManagerUIMenu(options, client) {
    var i, item, j, len, menuItem, names, ref, ref1, setAction, setEnabled;
    setAction = function(action) {
      var ref;
      return ((ref = client[action]) != null ? ref.bind(client) : void 0) || (function() {
        return alert("No " + action + " action is available in the client");
      });
    };
    setEnabled = function(action) {
      switch (action) {
        case 'reopenDialog':
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
        case 'share':
          return function() {
            return client.state.shareProvider != null;
          };
        default:
          return true;
      }
    };
    names = {
      newFileDialog: tr("~MENU.NEW"),
      openFileDialog: tr("~MENU.OPEN"),
      reopenDialog: tr("~MENU.REOPEN"),
      save: tr("~MENU.SAVE"),
      saveFileAsDialog: tr("~MENU.SAVE_AS"),
      saveCopyDialog: tr("~MENU.SAVE_COPY"),
      share: tr("~MENU.SHARE"),
      downloadDialog: tr("~MENU.DOWNLOAD"),
      renameDialog: tr("~MENU.RENAME")
    };
    this.items = [];
    ref = options.menu;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      item = ref[i];
      menuItem = item === 'separator' ? {
        key: "seperator" + i,
        separator: true
      } : isString(item) ? {
        key: item,
        name: ((ref1 = options.menuNames) != null ? ref1[item] : void 0) || names[item] || ("Unknown item: " + item),
        enabled: setEnabled(item),
        action: setAction(item)
      } : (isString(item.action) ? (item.key = item.action, item.enabled = setEnabled(item.action), item.action = setAction(item.action)) : item.enabled || (item.enabled = true), item);
      if (menuItem) {
        this.items.push(menuItem);
      }
    }
  }

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
  "~MENUBAR.UNTITLE_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.REOPEN": "Revert to recently opened state",
  "~MENU.SAVE": "Save",
  "~MENU.SAVE_AS": "Save As ...",
  "~MENU.SAVE_COPY": "Save A Copy ...",
  "~MENU.SHARE": "Share",
  "~MENU.DOWNLOAD": "Download",
  "~MENU.RENAME": "Rename",
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
  "~SHARE_DIALOG.CLOSE": "Close",
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
    var ref1;
    if ((ref1 = this.props.client.state.metadata) != null ? ref1.hasOwnProperty('name') : void 0) {
      return this.props.client.state.metadata.name;
    } else {
      return tr("~MENUBAR.UNTITLE_DOCUMENT");
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
      if (!enabled || (this.props.isActionMenu && !this.props.item.action)) {
        classes.push('disabled');
      }
      name = this.props.item.name || this.props.item;
      return li({
        className: classes.join(' '),
        onClick: this.clicked
      }, name);
    }
  }
}));

DropDown = React.createClass({
  displayName: 'Dropdown',
  getDefaultProps: function() {
    return {
      isActionMenu: true,
      onSelect: function(item) {
        return log.info("Selected " + item);
      }
    };
  },
  getInitialState: function() {
    return {
      showingMenu: false,
      timeout: null
    };
  },
  blur: function() {
    var timeout;
    this.unblur();
    timeout = setTimeout(((function(_this) {
      return function() {
        return _this.setState({
          showingMenu: false
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
  select: function(item) {
    var nextState;
    nextState = !this.state.showingMenu;
    this.setState({
      showingMenu: nextState
    });
    if (!item) {
      return;
    }
    if (this.props.isActionMenu && item.action) {
      return item.action();
    } else {
      return this.props.onSelect(item);
    }
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
          isActionMenu: this.props.isActionMenu
        }));
      }
      return results;
    }).call(this))) : void 0);
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
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.SHARED'),
      close: this.props.close
    }, div({
      className: 'share-dialog'
    }, input({
      ref: 'url',
      value: this.props.url
    }), div({
      className: 'buttons'
    }, button({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXGNsaWVudC5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxwcm92aWRlcnNcXGRvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdWkuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGdldC1xdWVyeS1wYXJhbS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzaGFyZS11cmwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHRhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEs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QUFHLE9BQU8sQ0FBQyxLQUFJLENBQUMsQ0FBQztPQUNoQztLQUNGO0dBQ0Y7QUFDRCxTQUFPLFFBQVEsQ0FBQztDQUNqQjs7OztBQ1pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG5nZXRRdWVyeVBhcmFtID0gcmVxdWlyZSAnLi91dGlscy9nZXQtcXVlcnktcGFyYW0nXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxyXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgQEF1dG9TYXZlTWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuQXV0b1NhdmVNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gICAgb3BlblNoYXJlZENvbnRlbnRJZCA9IGdldFF1ZXJ5UGFyYW0gXCJvcGVuU2hhcmVkXCJcclxuICAgIGlmIG9wZW5TaGFyZWRDb250ZW50SWRcclxuICAgICAgQGNsaWVudC5vcGVuU2hhcmVkQ29udGVudCBvcGVuU2hhcmVkQ29udGVudElkXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAaW5pdCBAYXBwT3B0aW9ucywgdHJ1ZVxyXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xyXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxyXG5cclxuICBjbGllbnRDb25uZWN0OiAoZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxyXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXHJcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXHJcbiAgICBAY2xpZW50LmNvbm5lY3QoKVxyXG5cclxuICBfY3JlYXRlSGlkZGVuQXBwOiAtPlxyXG4gICAgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpXHJcbiAgICBAX3JlbmRlckFwcCBhbmNob3JcclxuXHJcbiAgX3JlbmRlckFwcDogKGFuY2hvcikgLT5cclxuICAgIEBhcHBPcHRpb25zLmNsaWVudCA9IEBjbGllbnRcclxuICAgIFJlYWN0LnJlbmRlciAoQXBwVmlldyBAYXBwT3B0aW9ucyksIGFuY2hvclxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlcigpXHJcbiIsIi8vIFNlZTogaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2dvb2dsZS1kaWZmLW1hdGNoLXBhdGNoL3dpa2kvQVBJXG5leHBvcnQgZnVuY3Rpb24gY29udmVydENoYW5nZXNUb0RNUChjaGFuZ2VzKSB7XG4gIGxldCByZXQgPSBbXSxcbiAgICAgIGNoYW5nZSxcbiAgICAgIG9wZXJhdGlvbjtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAxO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IC0xO1xuICAgIH0gZWxzZSB7XG4gICAgICBvcGVyYXRpb24gPSAwO1xuICAgIH1cblxuICAgIHJldC5wdXNoKFtvcGVyYXRpb24sIGNoYW5nZS52YWx1ZV0pO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gY29udmVydENoYW5nZXNUb1hNTChjaGFuZ2VzKSB7XG4gIGxldCByZXQgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGFuZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgcmV0LnB1c2goJzxpbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzxkZWw+Jyk7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goZXNjYXBlSFRNTChjaGFuZ2UudmFsdWUpKTtcblxuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8L2lucz4nKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICByZXQucHVzaCgnPC9kZWw+Jyk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXQuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUhUTUwocykge1xuICBsZXQgbiA9IHM7XG4gIG4gPSBuLnJlcGxhY2UoLyYvZywgJyZhbXA7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLzwvZywgJyZsdDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICBuID0gbi5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG5cbiAgcmV0dXJuIG47XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBEaWZmKCkge31cblxuRGlmZi5wcm90b3R5cGUgPSB7XG4gIGRpZmYob2xkU3RyaW5nLCBuZXdTdHJpbmcsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBjYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2s7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICBsZXQgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBkb25lKHZhbHVlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sodW5kZWZpbmVkLCB2YWx1ZSk7IH0sIDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGxvdyBzdWJjbGFzc2VzIHRvIG1hc3NhZ2UgdGhlIGlucHV0IHByaW9yIHRvIHJ1bm5pbmdcbiAgICBvbGRTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChvbGRTdHJpbmcpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMuY2FzdElucHV0KG5ld1N0cmluZyk7XG5cbiAgICBvbGRTdHJpbmcgPSB0aGlzLnJlbW92ZUVtcHR5KHRoaXMudG9rZW5pemUob2xkU3RyaW5nKSk7XG4gICAgbmV3U3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG5ld1N0cmluZykpO1xuXG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGg7XG4gICAgbGV0IGVkaXRMZW5ndGggPSAxO1xuICAgIGxldCBtYXhFZGl0TGVuZ3RoID0gbmV3TGVuICsgb2xkTGVuO1xuICAgIGxldCBiZXN0UGF0aCA9IFt7IG5ld1BvczogLTEsIGNvbXBvbmVudHM6IFtdIH1dO1xuXG4gICAgLy8gU2VlZCBlZGl0TGVuZ3RoID0gMCwgaS5lLiB0aGUgY29udGVudCBzdGFydHMgd2l0aCB0aGUgc2FtZSB2YWx1ZXNcbiAgICBsZXQgb2xkUG9zID0gdGhpcy5leHRyYWN0Q29tbW9uKGJlc3RQYXRoWzBdLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgMCk7XG4gICAgaWYgKGJlc3RQYXRoWzBdLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAvLyBJZGVudGl0eSBwZXIgdGhlIGVxdWFsaXR5IGFuZCB0b2tlbml6ZXJcbiAgICAgIHJldHVybiBkb25lKFt7dmFsdWU6IG5ld1N0cmluZy5qb2luKCcnKSwgY291bnQ6IG5ld1N0cmluZy5sZW5ndGh9XSk7XG4gICAgfVxuXG4gICAgLy8gTWFpbiB3b3JrZXIgbWV0aG9kLiBjaGVja3MgYWxsIHBlcm11dGF0aW9ucyBvZiBhIGdpdmVuIGVkaXQgbGVuZ3RoIGZvciBhY2NlcHRhbmNlLlxuICAgIGZ1bmN0aW9uIGV4ZWNFZGl0TGVuZ3RoKCkge1xuICAgICAgZm9yIChsZXQgZGlhZ29uYWxQYXRoID0gLTEgKiBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggPD0gZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoICs9IDIpIHtcbiAgICAgICAgbGV0IGJhc2VQYXRoO1xuICAgICAgICBsZXQgYWRkUGF0aCA9IGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdLFxuICAgICAgICAgICAgcmVtb3ZlUGF0aCA9IGJlc3RQYXRoW2RpYWdvbmFsUGF0aCArIDFdLFxuICAgICAgICAgICAgb2xkUG9zID0gKHJlbW92ZVBhdGggPyByZW1vdmVQYXRoLm5ld1BvcyA6IDApIC0gZGlhZ29uYWxQYXRoO1xuICAgICAgICBpZiAoYWRkUGF0aCkge1xuICAgICAgICAgIC8vIE5vIG9uZSBlbHNlIGlzIGdvaW5nIHRvIGF0dGVtcHQgdG8gdXNlIHRoaXMgdmFsdWUsIGNsZWFyIGl0XG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2FuQWRkID0gYWRkUGF0aCAmJiBhZGRQYXRoLm5ld1BvcyArIDEgPCBuZXdMZW4sXG4gICAgICAgICAgICBjYW5SZW1vdmUgPSByZW1vdmVQYXRoICYmIDAgPD0gb2xkUG9zICYmIG9sZFBvcyA8IG9sZExlbjtcbiAgICAgICAgaWYgKCFjYW5BZGQgJiYgIWNhblJlbW92ZSkge1xuICAgICAgICAgIC8vIElmIHRoaXMgcGF0aCBpcyBhIHRlcm1pbmFsIHRoZW4gcHJ1bmVcbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2VsZWN0IHRoZSBkaWFnb25hbCB0aGF0IHdlIHdhbnQgdG8gYnJhbmNoIGZyb20uIFdlIHNlbGVjdCB0aGUgcHJpb3JcbiAgICAgICAgLy8gcGF0aCB3aG9zZSBwb3NpdGlvbiBpbiB0aGUgbmV3IHN0cmluZyBpcyB0aGUgZmFydGhlc3QgZnJvbSB0aGUgb3JpZ2luXG4gICAgICAgIC8vIGFuZCBkb2VzIG5vdCBwYXNzIHRoZSBib3VuZHMgb2YgdGhlIGRpZmYgZ3JhcGhcbiAgICAgICAgaWYgKCFjYW5BZGQgfHwgKGNhblJlbW92ZSAmJiBhZGRQYXRoLm5ld1BvcyA8IHJlbW92ZVBhdGgubmV3UG9zKSkge1xuICAgICAgICAgIGJhc2VQYXRoID0gY2xvbmVQYXRoKHJlbW92ZVBhdGgpO1xuICAgICAgICAgIHNlbGYucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCB1bmRlZmluZWQsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJhc2VQYXRoID0gYWRkUGF0aDsgICAvLyBObyBuZWVkIHRvIGNsb25lLCB3ZSd2ZSBwdWxsZWQgaXQgZnJvbSB0aGUgbGlzdFxuICAgICAgICAgIGJhc2VQYXRoLm5ld1BvcysrO1xuICAgICAgICAgIHNlbGYucHVzaENvbXBvbmVudChiYXNlUGF0aC5jb21wb25lbnRzLCB0cnVlLCB1bmRlZmluZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgb2xkUG9zID0gc2VsZi5leHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGhpdCB0aGUgZW5kIG9mIGJvdGggc3RyaW5ncywgdGhlbiB3ZSBhcmUgZG9uZVxuICAgICAgICBpZiAoYmFzZVBhdGgubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgICAgICByZXR1cm4gZG9uZShidWlsZFZhbHVlcyhzZWxmLCBiYXNlUGF0aC5jb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgc2VsZi51c2VMb25nZXN0VG9rZW4pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBPdGhlcndpc2UgdHJhY2sgdGhpcyBwYXRoIGFzIGEgcG90ZW50aWFsIGNhbmRpZGF0ZSBhbmQgY29udGludWUuXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IGJhc2VQYXRoO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGVkaXRMZW5ndGgrKztcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtcyB0aGUgbGVuZ3RoIG9mIGVkaXQgaXRlcmF0aW9uLiBJcyBhIGJpdCBmdWdseSBhcyB0aGlzIGhhcyB0byBzdXBwb3J0IHRoZVxuICAgIC8vIHN5bmMgYW5kIGFzeW5jIG1vZGUgd2hpY2ggaXMgbmV2ZXIgZnVuLiBMb29wcyBvdmVyIGV4ZWNFZGl0TGVuZ3RoIHVudGlsIGEgdmFsdWVcbiAgICAvLyBpcyBwcm9kdWNlZC5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIChmdW5jdGlvbiBleGVjKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIFRoaXMgc2hvdWxkIG5vdCBoYXBwZW4sIGJ1dCB3ZSB3YW50IHRvIGJlIHNhZmUuXG4gICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICAgICAgICBpZiAoZWRpdExlbmd0aCA+IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghZXhlY0VkaXRMZW5ndGgoKSkge1xuICAgICAgICAgICAgZXhlYygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgICB9KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAoZWRpdExlbmd0aCA8PSBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgIGxldCByZXQgPSBleGVjRWRpdExlbmd0aCgpO1xuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwdXNoQ29tcG9uZW50KGNvbXBvbmVudHMsIGFkZGVkLCByZW1vdmVkKSB7XG4gICAgbGV0IGxhc3QgPSBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKGxhc3QgJiYgbGFzdC5hZGRlZCA9PT0gYWRkZWQgJiYgbGFzdC5yZW1vdmVkID09PSByZW1vdmVkKSB7XG4gICAgICAvLyBXZSBuZWVkIHRvIGNsb25lIGhlcmUgYXMgdGhlIGNvbXBvbmVudCBjbG9uZSBvcGVyYXRpb24gaXMganVzdFxuICAgICAgLy8gYXMgc2hhbGxvdyBhcnJheSBjbG9uZVxuICAgICAgY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdID0ge2NvdW50OiBsYXN0LmNvdW50ICsgMSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudHMucHVzaCh7Y291bnQ6IDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9KTtcbiAgICB9XG4gIH0sXG4gIGV4dHJhY3RDb21tb24oYmFzZVBhdGgsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBkaWFnb25hbFBhdGgpIHtcbiAgICBsZXQgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCxcbiAgICAgICAgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aCxcbiAgICAgICAgbmV3UG9zID0gYmFzZVBhdGgubmV3UG9zLFxuICAgICAgICBvbGRQb3MgPSBuZXdQb3MgLSBkaWFnb25hbFBhdGgsXG5cbiAgICAgICAgY29tbW9uQ291bnQgPSAwO1xuICAgIHdoaWxlIChuZXdQb3MgKyAxIDwgbmV3TGVuICYmIG9sZFBvcyArIDEgPCBvbGRMZW4gJiYgdGhpcy5lcXVhbHMobmV3U3RyaW5nW25ld1BvcyArIDFdLCBvbGRTdHJpbmdbb2xkUG9zICsgMV0pKSB7XG4gICAgICBuZXdQb3MrKztcbiAgICAgIG9sZFBvcysrO1xuICAgICAgY29tbW9uQ291bnQrKztcbiAgICB9XG5cbiAgICBpZiAoY29tbW9uQ291bnQpIHtcbiAgICAgIGJhc2VQYXRoLmNvbXBvbmVudHMucHVzaCh7Y291bnQ6IGNvbW1vbkNvdW50fSk7XG4gICAgfVxuXG4gICAgYmFzZVBhdGgubmV3UG9zID0gbmV3UG9zO1xuICAgIHJldHVybiBvbGRQb3M7XG4gIH0sXG5cbiAgZXF1YWxzKGxlZnQsIHJpZ2h0KSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0O1xuICB9LFxuICByZW1vdmVFbXB0eShhcnJheSkge1xuICAgIGxldCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyYXlbaV0pIHtcbiAgICAgICAgcmV0LnB1c2goYXJyYXlbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuICBjYXN0SW5wdXQodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG4gIHRva2VuaXplKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnNwbGl0KCcnKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYnVpbGRWYWx1ZXMoZGlmZiwgY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHVzZUxvbmdlc3RUb2tlbikge1xuICBsZXQgY29tcG9uZW50UG9zID0gMCxcbiAgICAgIGNvbXBvbmVudExlbiA9IGNvbXBvbmVudHMubGVuZ3RoLFxuICAgICAgbmV3UG9zID0gMCxcbiAgICAgIG9sZFBvcyA9IDA7XG5cbiAgZm9yICg7IGNvbXBvbmVudFBvcyA8IGNvbXBvbmVudExlbjsgY29tcG9uZW50UG9zKyspIHtcbiAgICBsZXQgY29tcG9uZW50ID0gY29tcG9uZW50c1tjb21wb25lbnRQb3NdO1xuICAgIGlmICghY29tcG9uZW50LnJlbW92ZWQpIHtcbiAgICAgIGlmICghY29tcG9uZW50LmFkZGVkICYmIHVzZUxvbmdlc3RUb2tlbikge1xuICAgICAgICBsZXQgdmFsdWUgPSBuZXdTdHJpbmcuc2xpY2UobmV3UG9zLCBuZXdQb3MgKyBjb21wb25lbnQuY291bnQpO1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLm1hcChmdW5jdGlvbih2YWx1ZSwgaSkge1xuICAgICAgICAgIGxldCBvbGRWYWx1ZSA9IG9sZFN0cmluZ1tvbGRQb3MgKyBpXTtcbiAgICAgICAgICByZXR1cm4gb2xkVmFsdWUubGVuZ3RoID4gdmFsdWUubGVuZ3RoID8gb2xkVmFsdWUgOiB2YWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gdmFsdWUuam9pbignJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21wb25lbnQudmFsdWUgPSBuZXdTdHJpbmcuc2xpY2UobmV3UG9zLCBuZXdQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgfVxuICAgICAgbmV3UG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gQ29tbW9uIGNhc2VcbiAgICAgIGlmICghY29tcG9uZW50LmFkZGVkKSB7XG4gICAgICAgIG9sZFBvcyArPSBjb21wb25lbnQuY291bnQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBvbmVudC52YWx1ZSA9IG9sZFN0cmluZy5zbGljZShvbGRQb3MsIG9sZFBvcyArIGNvbXBvbmVudC5jb3VudCkuam9pbignJyk7XG4gICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuXG4gICAgICAvLyBSZXZlcnNlIGFkZCBhbmQgcmVtb3ZlIHNvIHJlbW92ZXMgYXJlIG91dHB1dCBmaXJzdCB0byBtYXRjaCBjb21tb24gY29udmVudGlvblxuICAgICAgLy8gVGhlIGRpZmZpbmcgYWxnb3JpdGhtIGlzIHRpZWQgdG8gYWRkIHRoZW4gcmVtb3ZlIG91dHB1dCBhbmQgdGhpcyBpcyB0aGUgc2ltcGxlc3RcbiAgICAgIC8vIHJvdXRlIHRvIGdldCB0aGUgZGVzaXJlZCBvdXRwdXQgd2l0aCBtaW5pbWFsIG92ZXJoZWFkLlxuICAgICAgaWYgKGNvbXBvbmVudFBvcyAmJiBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdLmFkZGVkKSB7XG4gICAgICAgIGxldCB0bXAgPSBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdO1xuICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudFBvcyAtIDFdID0gY29tcG9uZW50c1tjb21wb25lbnRQb3NdO1xuICAgICAgICBjb21wb25lbnRzW2NvbXBvbmVudFBvc10gPSB0bXA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGhhbmRsZSBmb3Igd2hlbiBvbmUgdGVybWluYWwgaXMgaWdub3JlZC4gRm9yIHRoaXMgY2FzZSB3ZSBtZXJnZSB0aGVcbiAgLy8gdGVybWluYWwgaW50byB0aGUgcHJpb3Igc3RyaW5nIGFuZCBkcm9wIHRoZSBjaGFuZ2UuXG4gIGxldCBsYXN0Q29tcG9uZW50ID0gY29tcG9uZW50c1tjb21wb25lbnRMZW4gLSAxXTtcbiAgaWYgKChsYXN0Q29tcG9uZW50LmFkZGVkIHx8IGxhc3RDb21wb25lbnQucmVtb3ZlZCkgJiYgZGlmZi5lcXVhbHMoJycsIGxhc3RDb21wb25lbnQudmFsdWUpKSB7XG4gICAgY29tcG9uZW50c1tjb21wb25lbnRMZW4gLSAyXS52YWx1ZSArPSBsYXN0Q29tcG9uZW50LnZhbHVlO1xuICAgIGNvbXBvbmVudHMucG9wKCk7XG4gIH1cblxuICByZXR1cm4gY29tcG9uZW50cztcbn1cblxuZnVuY3Rpb24gY2xvbmVQYXRoKHBhdGgpIHtcbiAgcmV0dXJuIHsgbmV3UG9zOiBwYXRoLm5ld1BvcywgY29tcG9uZW50czogcGF0aC5jb21wb25lbnRzLnNsaWNlKDApIH07XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY2hhcmFjdGVyRGlmZiA9IG5ldyBEaWZmKCk7XG5leHBvcnQgZnVuY3Rpb24gZGlmZkNoYXJzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gY2hhcmFjdGVyRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBjb25zdCBjc3NEaWZmID0gbmV3IERpZmYoKTtcbmNzc0RpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhbe306OyxdfFxccyspLyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkNzcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNzc0RpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtsaW5lRGlmZn0gZnJvbSAnLi9saW5lJztcblxuY29uc3Qgb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5cbmV4cG9ydCBjb25zdCBqc29uRGlmZiA9IG5ldyBEaWZmKCk7XG4vLyBEaXNjcmltaW5hdGUgYmV0d2VlbiB0d28gbGluZXMgb2YgcHJldHR5LXByaW50ZWQsIHNlcmlhbGl6ZWQgSlNPTiB3aGVyZSBvbmUgb2YgdGhlbSBoYXMgYVxuLy8gZGFuZ2xpbmcgY29tbWEgYW5kIHRoZSBvdGhlciBkb2Vzbid0LiBUdXJucyBvdXQgaW5jbHVkaW5nIHRoZSBkYW5nbGluZyBjb21tYSB5aWVsZHMgdGhlIG5pY2VzdCBvdXRwdXQ6XG5qc29uRGlmZi51c2VMb25nZXN0VG9rZW4gPSB0cnVlO1xuXG5qc29uRGlmZi50b2tlbml6ZSA9IGxpbmVEaWZmLnRva2VuaXplO1xuanNvbkRpZmYuY2FzdElucHV0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZSA6IEpTT04uc3RyaW5naWZ5KGNhbm9uaWNhbGl6ZSh2YWx1ZSksIHVuZGVmaW5lZCwgJyAgJyk7XG59O1xuanNvbkRpZmYuZXF1YWxzID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIERpZmYucHJvdG90eXBlLmVxdWFscyhsZWZ0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpLCByaWdodC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkpzb24ob2xkT2JqLCBuZXdPYmosIGNhbGxiYWNrKSB7IHJldHVybiBqc29uRGlmZi5kaWZmKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjayk7IH1cblxuXG4vLyBUaGlzIGZ1bmN0aW9uIGhhbmRsZXMgdGhlIHByZXNlbmNlIG9mIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgYmFpbGluZyBvdXQgd2hlbiBlbmNvdW50ZXJpbmcgYW5cbi8vIG9iamVjdCB0aGF0IGlzIGFscmVhZHkgb24gdGhlIFwic3RhY2tcIiBvZiBpdGVtcyBiZWluZyBwcm9jZXNzZWQuXG5leHBvcnQgZnVuY3Rpb24gY2Fub25pY2FsaXplKG9iaiwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spIHtcbiAgc3RhY2sgPSBzdGFjayB8fCBbXTtcbiAgcmVwbGFjZW1lbnRTdGFjayA9IHJlcGxhY2VtZW50U3RhY2sgfHwgW107XG5cbiAgbGV0IGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHN0YWNrLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHN0YWNrW2ldID09PSBvYmopIHtcbiAgICAgIHJldHVybiByZXBsYWNlbWVudFN0YWNrW2ldO1xuICAgIH1cbiAgfVxuXG4gIGxldCBjYW5vbmljYWxpemVkT2JqO1xuXG4gIGlmICgnW29iamVjdCBBcnJheV0nID09PSBvYmplY3RQcm90b3R5cGVUb1N0cmluZy5jYWxsKG9iaikpIHtcbiAgICBzdGFjay5wdXNoKG9iaik7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IG5ldyBBcnJheShvYmoubGVuZ3RoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgZm9yIChpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgY2Fub25pY2FsaXplZE9ialtpXSA9IGNhbm9uaWNhbGl6ZShvYmpbaV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmogIT09IG51bGwpIHtcbiAgICBzdGFjay5wdXNoKG9iaik7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IHt9O1xuICAgIHJlcGxhY2VtZW50U3RhY2sucHVzaChjYW5vbmljYWxpemVkT2JqKTtcbiAgICBsZXQgc29ydGVkS2V5cyA9IFtdLFxuICAgICAgICBrZXk7XG4gICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNvcnRlZEtleXMucHVzaChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3J0ZWRLZXlzLnNvcnQoKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgc29ydGVkS2V5cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAga2V5ID0gc29ydGVkS2V5c1tpXTtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpba2V5XSA9IGNhbm9uaWNhbGl6ZShvYmpba2V5XSwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spO1xuICAgIH1cbiAgICBzdGFjay5wb3AoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICB9IGVsc2Uge1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBvYmo7XG4gIH1cbiAgcmV0dXJuIGNhbm9uaWNhbGl6ZWRPYmo7XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtnZW5lcmF0ZU9wdGlvbnN9IGZyb20gJy4uL3V0aWwvcGFyYW1zJztcblxuZXhwb3J0IGNvbnN0IGxpbmVEaWZmID0gbmV3IERpZmYoKTtcbmxpbmVEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHJldExpbmVzID0gW10sXG4gICAgICBsaW5lc0FuZE5ld2xpbmVzID0gdmFsdWUuc3BsaXQoLyhcXG58XFxyXFxuKS8pO1xuXG4gIC8vIElnbm9yZSB0aGUgZmluYWwgZW1wdHkgdG9rZW4gdGhhdCBvY2N1cnMgaWYgdGhlIHN0cmluZyBlbmRzIHdpdGggYSBuZXcgbGluZVxuICBpZiAoIWxpbmVzQW5kTmV3bGluZXNbbGluZXNBbmROZXdsaW5lcy5sZW5ndGggLSAxXSkge1xuICAgIGxpbmVzQW5kTmV3bGluZXMucG9wKCk7XG4gIH1cblxuICAvLyBNZXJnZSB0aGUgY29udGVudCBhbmQgbGluZSBzZXBhcmF0b3JzIGludG8gc2luZ2xlIHRva2Vuc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzQW5kTmV3bGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgbGluZSA9IGxpbmVzQW5kTmV3bGluZXNbaV07XG5cbiAgICBpZiAoaSAlIDIgJiYgIXRoaXMub3B0aW9ucy5uZXdsaW5lSXNUb2tlbikge1xuICAgICAgcmV0TGluZXNbcmV0TGluZXMubGVuZ3RoIC0gMV0gKz0gbGluZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlKSB7XG4gICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgIH1cbiAgICAgIHJldExpbmVzLnB1c2gobGluZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldExpbmVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZMaW5lcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZUcmltbWVkTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gbGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5cbmV4cG9ydCBjb25zdCBzZW50ZW5jZURpZmYgPSBuZXcgRGlmZigpO1xuc2VudGVuY2VEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oXFxTLis/Wy4hP10pKD89XFxzK3wkKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZTZW50ZW5jZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBzZW50ZW5jZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHtnZW5lcmF0ZU9wdGlvbnN9IGZyb20gJy4uL3V0aWwvcGFyYW1zJztcblxuLy8gQmFzZWQgb24gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGF0aW5fc2NyaXB0X2luX1VuaWNvZGVcbi8vXG4vLyBSYW5nZXMgYW5kIGV4Y2VwdGlvbnM6XG4vLyBMYXRpbi0xIFN1cHBsZW1lbnQsIDAwODDigJMwMEZGXG4vLyAgLSBVKzAwRDcgIMOXIE11bHRpcGxpY2F0aW9uIHNpZ25cbi8vICAtIFUrMDBGNyAgw7cgRGl2aXNpb24gc2lnblxuLy8gTGF0aW4gRXh0ZW5kZWQtQSwgMDEwMOKAkzAxN0Zcbi8vIExhdGluIEV4dGVuZGVkLUIsIDAxODDigJMwMjRGXG4vLyBJUEEgRXh0ZW5zaW9ucywgMDI1MOKAkzAyQUZcbi8vIFNwYWNpbmcgTW9kaWZpZXIgTGV0dGVycywgMDJCMOKAkzAyRkZcbi8vICAtIFUrMDJDNyAgy4cgJiM3MTE7ICBDYXJvblxuLy8gIC0gVSswMkQ4ICDLmCAmIzcyODsgIEJyZXZlXG4vLyAgLSBVKzAyRDkgIMuZICYjNzI5OyAgRG90IEFib3ZlXG4vLyAgLSBVKzAyREEgIMuaICYjNzMwOyAgUmluZyBBYm92ZVxuLy8gIC0gVSswMkRCICDLmyAmIzczMTsgIE9nb25la1xuLy8gIC0gVSswMkRDICDLnCAmIzczMjsgIFNtYWxsIFRpbGRlXG4vLyAgLSBVKzAyREQgIMudICYjNzMzOyAgRG91YmxlIEFjdXRlIEFjY2VudFxuLy8gTGF0aW4gRXh0ZW5kZWQgQWRkaXRpb25hbCwgMUUwMOKAkzFFRkZcbmNvbnN0IGV4dGVuZGVkV29yZENoYXJzID0gL15bYS16QS1aXFx1e0MwfS1cXHV7RkZ9XFx1e0Q4fS1cXHV7RjZ9XFx1e0Y4fS1cXHV7MkM2fVxcdXsyQzh9LVxcdXsyRDd9XFx1ezJERX0tXFx1ezJGRn1cXHV7MUUwMH0tXFx1ezFFRkZ9XSskL3U7XG5cbmNvbnN0IHJlV2hpdGVzcGFjZSA9IC9cXFMvO1xuXG5leHBvcnQgY29uc3Qgd29yZERpZmYgPSBuZXcgRGlmZigpO1xud29yZERpZmYuZXF1YWxzID0gZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0IHx8ICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QobGVmdCkgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KHJpZ2h0KSk7XG59O1xud29yZERpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBsZXQgdG9rZW5zID0gdmFsdWUuc3BsaXQoLyhcXHMrfFxcYikvKTtcblxuICAvLyBKb2luIHRoZSBib3VuZGFyeSBzcGxpdHMgdGhhdCB3ZSBkbyBub3QgY29uc2lkZXIgdG8gYmUgYm91bmRhcmllcy4gVGhpcyBpcyBwcmltYXJpbHkgdGhlIGV4dGVuZGVkIExhdGluIGNoYXJhY3RlciBzZXQuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIC8vIElmIHdlIGhhdmUgYW4gZW1wdHkgc3RyaW5nIGluIHRoZSBuZXh0IGZpZWxkIGFuZCB3ZSBoYXZlIG9ubHkgd29yZCBjaGFycyBiZWZvcmUgYW5kIGFmdGVyLCBtZXJnZVxuICAgIGlmICghdG9rZW5zW2kgKyAxXSAmJiB0b2tlbnNbaSArIDJdXG4gICAgICAgICAgJiYgZXh0ZW5kZWRXb3JkQ2hhcnMudGVzdCh0b2tlbnNbaV0pXG4gICAgICAgICAgJiYgZXh0ZW5kZWRXb3JkQ2hhcnMudGVzdCh0b2tlbnNbaSArIDJdKSkge1xuICAgICAgdG9rZW5zW2ldICs9IHRva2Vuc1tpICsgMl07XG4gICAgICB0b2tlbnMuc3BsaWNlKGkgKyAxLCAyKTtcbiAgICAgIGktLTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG9rZW5zO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZXb3JkcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgbGV0IG9wdGlvbnMgPSBnZW5lcmF0ZU9wdGlvbnMoY2FsbGJhY2ssIHtpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlfSk7XG4gIHJldHVybiB3b3JkRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHNXaXRoU3BhY2Uob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB3b3JkRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7XG59XG4iLCIvKiBTZWUgTElDRU5TRSBmaWxlIGZvciB0ZXJtcyBvZiB1c2UgKi9cblxuLypcbiAqIFRleHQgZGlmZiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBUaGlzIGxpYnJhcnkgc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBBUElTOlxuICogSnNEaWZmLmRpZmZDaGFyczogQ2hhcmFjdGVyIGJ5IGNoYXJhY3RlciBkaWZmXG4gKiBKc0RpZmYuZGlmZldvcmRzOiBXb3JkIChhcyBkZWZpbmVkIGJ5IFxcYiByZWdleCkgZGlmZiB3aGljaCBpZ25vcmVzIHdoaXRlc3BhY2VcbiAqIEpzRGlmZi5kaWZmTGluZXM6IExpbmUgYmFzZWQgZGlmZlxuICpcbiAqIEpzRGlmZi5kaWZmQ3NzOiBEaWZmIHRhcmdldGVkIGF0IENTUyBjb250ZW50XG4gKlxuICogVGhlc2UgbWV0aG9kcyBhcmUgYmFzZWQgb24gdGhlIGltcGxlbWVudGF0aW9uIHByb3Bvc2VkIGluXG4gKiBcIkFuIE8oTkQpIERpZmZlcmVuY2UgQWxnb3JpdGhtIGFuZCBpdHMgVmFyaWF0aW9uc1wiIChNeWVycywgMTk4NikuXG4gKiBodHRwOi8vY2l0ZXNlZXJ4LmlzdC5wc3UuZWR1L3ZpZXdkb2Mvc3VtbWFyeT9kb2k9MTAuMS4xLjQuNjkyN1xuICovXG5pbXBvcnQgRGlmZiBmcm9tICcuL2RpZmYvYmFzZSc7XG5pbXBvcnQge2RpZmZDaGFyc30gZnJvbSAnLi9kaWZmL2NoYXJhY3Rlcic7XG5pbXBvcnQge2RpZmZXb3JkcywgZGlmZldvcmRzV2l0aFNwYWNlfSBmcm9tICcuL2RpZmYvd29yZCc7XG5pbXBvcnQge2RpZmZMaW5lcywgZGlmZlRyaW1tZWRMaW5lc30gZnJvbSAnLi9kaWZmL2xpbmUnO1xuaW1wb3J0IHtkaWZmU2VudGVuY2VzfSBmcm9tICcuL2RpZmYvc2VudGVuY2UnO1xuXG5pbXBvcnQge2RpZmZDc3N9IGZyb20gJy4vZGlmZi9jc3MnO1xuaW1wb3J0IHtkaWZmSnNvbiwgY2Fub25pY2FsaXplfSBmcm9tICcuL2RpZmYvanNvbic7XG5cbmltcG9ydCB7YXBwbHlQYXRjaCwgYXBwbHlQYXRjaGVzfSBmcm9tICcuL3BhdGNoL2FwcGx5JztcbmltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXRjaC9wYXJzZSc7XG5pbXBvcnQge3N0cnVjdHVyZWRQYXRjaCwgY3JlYXRlVHdvRmlsZXNQYXRjaCwgY3JlYXRlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvY3JlYXRlJztcblxuaW1wb3J0IHtjb252ZXJ0Q2hhbmdlc1RvRE1QfSBmcm9tICcuL2NvbnZlcnQvZG1wJztcbmltcG9ydCB7Y29udmVydENoYW5nZXNUb1hNTH0gZnJvbSAnLi9jb252ZXJ0L3htbCc7XG5cbmV4cG9ydCB7XG4gIERpZmYsXG5cbiAgZGlmZkNoYXJzLFxuICBkaWZmV29yZHMsXG4gIGRpZmZXb3Jkc1dpdGhTcGFjZSxcbiAgZGlmZkxpbmVzLFxuICBkaWZmVHJpbW1lZExpbmVzLFxuICBkaWZmU2VudGVuY2VzLFxuXG4gIGRpZmZDc3MsXG4gIGRpZmZKc29uLFxuXG4gIHN0cnVjdHVyZWRQYXRjaCxcbiAgY3JlYXRlVHdvRmlsZXNQYXRjaCxcbiAgY3JlYXRlUGF0Y2gsXG4gIGFwcGx5UGF0Y2gsXG4gIGFwcGx5UGF0Y2hlcyxcbiAgcGFyc2VQYXRjaCxcbiAgY29udmVydENoYW5nZXNUb0RNUCxcbiAgY29udmVydENoYW5nZXNUb1hNTCxcbiAgY2Fub25pY2FsaXplXG59O1xuIiwiaW1wb3J0IHtwYXJzZVBhdGNofSBmcm9tICcuL3BhcnNlJztcbmltcG9ydCBkaXN0YW5jZUl0ZXJhdG9yIGZyb20gJy4uL3V0aWwvZGlzdGFuY2UtaXRlcmF0b3InO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaChzb3VyY2UsIHVuaURpZmYsIG9wdGlvbnMgPSB7fSkge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh1bmlEaWZmKSkge1xuICAgIGlmICh1bmlEaWZmLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXBwbHlQYXRjaCBvbmx5IHdvcmtzIHdpdGggYSBzaW5nbGUgaW5wdXQuJyk7XG4gICAgfVxuXG4gICAgdW5pRGlmZiA9IHVuaURpZmZbMF07XG4gIH1cblxuICAvLyBBcHBseSB0aGUgZGlmZiB0byB0aGUgaW5wdXRcbiAgbGV0IGxpbmVzID0gc291cmNlLnNwbGl0KCdcXG4nKSxcbiAgICAgIGh1bmtzID0gdW5pRGlmZi5odW5rcyxcblxuICAgICAgY29tcGFyZUxpbmUgPSBvcHRpb25zLmNvbXBhcmVMaW5lIHx8ICgobGluZU51bWJlciwgbGluZSwgb3BlcmF0aW9uLCBwYXRjaENvbnRlbnQpID0+IGxpbmUgPT09IHBhdGNoQ29udGVudCksXG4gICAgICBlcnJvckNvdW50ID0gMCxcbiAgICAgIGZ1enpGYWN0b3IgPSBvcHRpb25zLmZ1enpGYWN0b3IgfHwgMCxcbiAgICAgIG1pbkxpbmUgPSAwLFxuICAgICAgb2Zmc2V0ID0gMCxcblxuICAgICAgcmVtb3ZlRU9GTkwsXG4gICAgICBhZGRFT0ZOTDtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBodW5rIGV4YWN0bHkgZml0cyBvbiB0aGUgcHJvdmlkZWQgbG9jYXRpb25cbiAgICovXG4gIGZ1bmN0aW9uIGh1bmtGaXRzKGh1bmssIHRvUG9zKSB7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBsZXQgbGluZSA9IGh1bmsubGluZXNbal0sXG4gICAgICAgICAgb3BlcmF0aW9uID0gbGluZVswXSxcbiAgICAgICAgICBjb250ZW50ID0gbGluZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAvLyBDb250ZXh0IHNhbml0eSBjaGVja1xuICAgICAgICBpZiAoIWNvbXBhcmVMaW5lKHRvUG9zICsgMSwgbGluZXNbdG9Qb3NdLCBvcGVyYXRpb24sIGNvbnRlbnQpKSB7XG4gICAgICAgICAgZXJyb3JDb3VudCsrO1xuXG4gICAgICAgICAgaWYgKGVycm9yQ291bnQgPiBmdXp6RmFjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBTZWFyY2ggYmVzdCBmaXQgb2Zmc2V0cyBmb3IgZWFjaCBodW5rIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBvbmVzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICBtYXhMaW5lID0gbGluZXMubGVuZ3RoIC0gaHVuay5vbGRMaW5lcyxcbiAgICAgICAgbG9jYWxPZmZzZXQgPSAwLFxuICAgICAgICB0b1BvcyA9IG9mZnNldCArIGh1bmsub2xkU3RhcnQgLSAxO1xuXG4gICAgbGV0IGl0ZXJhdG9yID0gZGlzdGFuY2VJdGVyYXRvcih0b1BvcywgbWluTGluZSwgbWF4TGluZSk7XG5cbiAgICBmb3IgKDsgbG9jYWxPZmZzZXQgIT09IHVuZGVmaW5lZDsgbG9jYWxPZmZzZXQgPSBpdGVyYXRvcigpKSB7XG4gICAgICBpZiAoaHVua0ZpdHMoaHVuaywgdG9Qb3MgKyBsb2NhbE9mZnNldCkpIHtcbiAgICAgICAgaHVuay5vZmZzZXQgPSBvZmZzZXQgKz0gbG9jYWxPZmZzZXQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsb2NhbE9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvd2VyIHRleHQgbGltaXQgdG8gZW5kIG9mIHRoZSBjdXJyZW50IGh1bmssIHNvIG5leHQgb25lcyBkb24ndCB0cnlcbiAgICAvLyB0byBmaXQgb3ZlciBhbHJlYWR5IHBhdGNoZWQgdGV4dFxuICAgIG1pbkxpbmUgPSBodW5rLm9mZnNldCArIGh1bmsub2xkU3RhcnQgKyBodW5rLm9sZExpbmVzO1xuICB9XG5cbiAgLy8gQXBwbHkgcGF0Y2ggaHVua3NcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBodW5rID0gaHVua3NbaV0sXG4gICAgICAgIHRvUG9zID0gaHVuay5vZmZzZXQgKyBodW5rLm5ld1N0YXJ0IC0gMTtcblxuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgbGluZXMuc3BsaWNlKHRvUG9zLCAxKTtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMCwgY29udGVudCk7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIGxldCBwcmV2aW91c09wZXJhdGlvbiA9IGh1bmsubGluZXNbaiAtIDFdID8gaHVuay5saW5lc1tqIC0gMV1bMF0gOiBudWxsO1xuICAgICAgICBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICAgIHJlbW92ZUVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgYWRkRU9GTkwgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIEVPRk5MIGluc2VydGlvbi9yZW1vdmFsXG4gIGlmIChyZW1vdmVFT0ZOTCkge1xuICAgIHdoaWxlICghbGluZXNbbGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICAgIGxpbmVzLnBvcCgpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChhZGRFT0ZOTCkge1xuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuLy8gV3JhcHBlciB0aGF0IHN1cHBvcnRzIG11bHRpcGxlIGZpbGUgcGF0Y2hlcyB2aWEgY2FsbGJhY2tzLlxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2hlcyh1bmlEaWZmLCBvcHRpb25zKSB7XG4gIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgfVxuXG4gIGxldCBjdXJyZW50SW5kZXggPSAwO1xuICBmdW5jdGlvbiBwcm9jZXNzSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0gdW5pRGlmZltjdXJyZW50SW5kZXgrK107XG4gICAgaWYgKCFpbmRleCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoKTtcbiAgICB9XG5cbiAgICBvcHRpb25zLmxvYWRGaWxlKGluZGV4LCBmdW5jdGlvbihlcnIsIGRhdGEpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29tcGxldGUoZXJyKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHVwZGF0ZWRDb250ZW50ID0gYXBwbHlQYXRjaChkYXRhLCBpbmRleCwgb3B0aW9ucyk7XG4gICAgICBvcHRpb25zLnBhdGNoZWQoaW5kZXgsIHVwZGF0ZWRDb250ZW50KTtcblxuICAgICAgc2V0VGltZW91dChwcm9jZXNzSW5kZXgsIDApO1xuICAgIH0pO1xuICB9XG4gIHByb2Nlc3NJbmRleCgpO1xufVxuIiwiaW1wb3J0IHtkaWZmTGluZXN9IGZyb20gJy4uL2RpZmYvbGluZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHsgY29udGV4dDogNCB9O1xuICB9XG5cbiAgY29uc3QgZGlmZiA9IGRpZmZMaW5lcyhvbGRTdHIsIG5ld1N0cik7XG4gIGRpZmYucHVzaCh7dmFsdWU6ICcnLCBsaW5lczogW119KTsgICAvLyBBcHBlbmQgYW4gZW1wdHkgdmFsdWUgdG8gbWFrZSBjbGVhbnVwIGVhc2llclxuXG4gIGZ1bmN0aW9uIGNvbnRleHRMaW5lcyhsaW5lcykge1xuICAgIHJldHVybiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHsgcmV0dXJuICcgJyArIGVudHJ5OyB9KTtcbiAgfVxuXG4gIGxldCBodW5rcyA9IFtdO1xuICBsZXQgb2xkUmFuZ2VTdGFydCA9IDAsIG5ld1JhbmdlU3RhcnQgPSAwLCBjdXJSYW5nZSA9IFtdLFxuICAgICAgb2xkTGluZSA9IDEsIG5ld0xpbmUgPSAxO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmYubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjdXJyZW50ID0gZGlmZltpXSxcbiAgICAgICAgICBsaW5lcyA9IGN1cnJlbnQubGluZXMgfHwgY3VycmVudC52YWx1ZS5yZXBsYWNlKC9cXG4kLywgJycpLnNwbGl0KCdcXG4nKTtcbiAgICBjdXJyZW50LmxpbmVzID0gbGluZXM7XG5cbiAgICBpZiAoY3VycmVudC5hZGRlZCB8fCBjdXJyZW50LnJlbW92ZWQpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgcHJldmlvdXMgY29udGV4dCwgc3RhcnQgd2l0aCB0aGF0XG4gICAgICBpZiAoIW9sZFJhbmdlU3RhcnQpIHtcbiAgICAgICAgY29uc3QgcHJldiA9IGRpZmZbaSAtIDFdO1xuICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gb2xkTGluZTtcbiAgICAgICAgbmV3UmFuZ2VTdGFydCA9IG5ld0xpbmU7XG5cbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICBjdXJSYW5nZSA9IG9wdGlvbnMuY29udGV4dCA+IDAgPyBjb250ZXh0TGluZXMocHJldi5saW5lcy5zbGljZSgtb3B0aW9ucy5jb250ZXh0KSkgOiBbXTtcbiAgICAgICAgICBvbGRSYW5nZVN0YXJ0IC09IGN1clJhbmdlLmxlbmd0aDtcbiAgICAgICAgICBuZXdSYW5nZVN0YXJ0IC09IGN1clJhbmdlLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPdXRwdXQgb3VyIGNoYW5nZXNcbiAgICAgIGN1clJhbmdlLnB1c2goLi4uIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkge1xuICAgICAgICByZXR1cm4gKGN1cnJlbnQuYWRkZWQgPyAnKycgOiAnLScpICsgZW50cnk7XG4gICAgICB9KSk7XG5cbiAgICAgIC8vIFRyYWNrIHRoZSB1cGRhdGVkIGZpbGUgcG9zaXRpb25cbiAgICAgIGlmIChjdXJyZW50LmFkZGVkKSB7XG4gICAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2xkTGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElkZW50aWNhbCBjb250ZXh0IGxpbmVzLiBUcmFjayBsaW5lIGNoYW5nZXNcbiAgICAgIGlmIChvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIC8vIENsb3NlIG91dCBhbnkgY2hhbmdlcyB0aGF0IGhhdmUgYmVlbiBvdXRwdXQgKG9yIGpvaW4gb3ZlcmxhcHBpbmcpXG4gICAgICAgIGlmIChsaW5lcy5sZW5ndGggPD0gb3B0aW9ucy5jb250ZXh0ICogMiAmJiBpIDwgZGlmZi5sZW5ndGggLSAyKSB7XG4gICAgICAgICAgLy8gT3ZlcmxhcHBpbmdcbiAgICAgICAgICBjdXJSYW5nZS5wdXNoKC4uLiBjb250ZXh0TGluZXMobGluZXMpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlbmQgdGhlIHJhbmdlIGFuZCBvdXRwdXRcbiAgICAgICAgICBsZXQgY29udGV4dFNpemUgPSBNYXRoLm1pbihsaW5lcy5sZW5ndGgsIG9wdGlvbnMuY29udGV4dCk7XG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzLnNsaWNlKDAsIGNvbnRleHRTaXplKSkpO1xuXG4gICAgICAgICAgbGV0IGh1bmsgPSB7XG4gICAgICAgICAgICBvbGRTdGFydDogb2xkUmFuZ2VTdGFydCxcbiAgICAgICAgICAgIG9sZExpbmVzOiAob2xkTGluZSAtIG9sZFJhbmdlU3RhcnQgKyBjb250ZXh0U2l6ZSksXG4gICAgICAgICAgICBuZXdTdGFydDogbmV3UmFuZ2VTdGFydCxcbiAgICAgICAgICAgIG5ld0xpbmVzOiAobmV3TGluZSAtIG5ld1JhbmdlU3RhcnQgKyBjb250ZXh0U2l6ZSksXG4gICAgICAgICAgICBsaW5lczogY3VyUmFuZ2VcbiAgICAgICAgICB9O1xuICAgICAgICAgIGlmIChpID49IGRpZmYubGVuZ3RoIC0gMiAmJiBsaW5lcy5sZW5ndGggPD0gb3B0aW9ucy5jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBFT0YgaXMgaW5zaWRlIHRoaXMgaHVua1xuICAgICAgICAgICAgbGV0IG9sZEVPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3Qob2xkU3RyKSk7XG4gICAgICAgICAgICBsZXQgbmV3RU9GTmV3bGluZSA9ICgvXFxuJC8udGVzdChuZXdTdHIpKTtcbiAgICAgICAgICAgIGlmIChsaW5lcy5sZW5ndGggPT0gMCAmJiAhb2xkRU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICAvLyBzcGVjaWFsIGNhc2U6IG9sZCBoYXMgbm8gZW9sIGFuZCBubyB0cmFpbGluZyBjb250ZXh0OyBuby1ubCBjYW4gZW5kIHVwIGJlZm9yZSBhZGRzXG4gICAgICAgICAgICAgIGN1clJhbmdlLnNwbGljZShodW5rLm9sZExpbmVzLCAwLCAnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFvbGRFT0ZOZXdsaW5lIHx8ICFuZXdFT0ZOZXdsaW5lKSB7XG4gICAgICAgICAgICAgIGN1clJhbmdlLnB1c2goJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBodW5rcy5wdXNoKGh1bmspO1xuXG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCA9IDA7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCA9IDA7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb2xkTGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG9sZEZpbGVOYW1lOiBvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWU6IG5ld0ZpbGVOYW1lLFxuICAgIG9sZEhlYWRlcjogb2xkSGVhZGVyLCBuZXdIZWFkZXI6IG5ld0hlYWRlcixcbiAgICBodW5rczogaHVua3NcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgY29uc3QgZGlmZiA9IHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG5cbiAgY29uc3QgcmV0ID0gW107XG4gIGlmIChvbGRGaWxlTmFtZSA9PSBuZXdGaWxlTmFtZSkge1xuICAgIHJldC5wdXNoKCdJbmRleDogJyArIG9sZEZpbGVOYW1lKTtcbiAgfVxuICByZXQucHVzaCgnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpO1xuICByZXQucHVzaCgnLS0tICcgKyBkaWZmLm9sZEZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm9sZEhlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5vbGRIZWFkZXIpKTtcbiAgcmV0LnB1c2goJysrKyAnICsgZGlmZi5uZXdGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5uZXdIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYubmV3SGVhZGVyKSk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgaHVuayA9IGRpZmYuaHVua3NbaV07XG4gICAgcmV0LnB1c2goXG4gICAgICAnQEAgLScgKyBodW5rLm9sZFN0YXJ0ICsgJywnICsgaHVuay5vbGRMaW5lc1xuICAgICAgKyAnICsnICsgaHVuay5uZXdTdGFydCArICcsJyArIGh1bmsubmV3TGluZXNcbiAgICAgICsgJyBAQCdcbiAgICApO1xuICAgIHJldC5wdXNoLmFwcGx5KHJldCwgaHVuay5saW5lcyk7XG4gIH1cblxuICByZXR1cm4gcmV0LmpvaW4oJ1xcbicpICsgJ1xcbic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYXRjaChmaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIHJldHVybiBjcmVhdGVUd29GaWxlc1BhdGNoKGZpbGVOYW1lLCBmaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBwYXJzZVBhdGNoKHVuaURpZmYsIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgZGlmZnN0ciA9IHVuaURpZmYuc3BsaXQoJ1xcbicpLFxuICAgICAgbGlzdCA9IFtdLFxuICAgICAgaSA9IDA7XG5cbiAgZnVuY3Rpb24gcGFyc2VJbmRleCgpIHtcbiAgICBsZXQgaW5kZXggPSB7fTtcbiAgICBsaXN0LnB1c2goaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgZGlmZiBtZXRhZGF0YVxuICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgIGxldCBsaW5lID0gZGlmZnN0cltpXTtcblxuICAgICAgLy8gRmlsZSBoZWFkZXIgZm91bmQsIGVuZCBwYXJzaW5nIGRpZmYgbWV0YWRhdGFcbiAgICAgIGlmICgvXihcXC1cXC1cXC18XFwrXFwrXFwrfEBAKVxccy8udGVzdChsaW5lKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gRGlmZiBpbmRleFxuICAgICAgbGV0IGhlYWRlciA9ICgvXig/OkluZGV4OnxkaWZmKD86IC1yIFxcdyspKylcXHMrKC4rPylcXHMqJC8pLmV4ZWMobGluZSk7XG4gICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgIGluZGV4LmluZGV4ID0gaGVhZGVyWzFdO1xuICAgICAgfVxuXG4gICAgICBpKys7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgZmlsZSBoZWFkZXJzIGlmIHRoZXkgYXJlIGRlZmluZWQuIFVuaWZpZWQgZGlmZiByZXF1aXJlcyB0aGVtLCBidXRcbiAgICAvLyB0aGVyZSdzIG5vIHRlY2huaWNhbCBpc3N1ZXMgdG8gaGF2ZSBhbiBpc29sYXRlZCBodW5rIHdpdGhvdXQgZmlsZSBoZWFkZXJcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuICAgIHBhcnNlRmlsZUhlYWRlcihpbmRleCk7XG5cbiAgICAvLyBQYXJzZSBodW5rc1xuICAgIGluZGV4Lmh1bmtzID0gW107XG5cbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIGlmICgvXihJbmRleDp8ZGlmZnxcXC1cXC1cXC18XFwrXFwrXFwrKVxccy8udGVzdChsaW5lKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAoL15AQC8udGVzdChsaW5lKSkge1xuICAgICAgICBpbmRleC5odW5rcy5wdXNoKHBhcnNlSHVuaygpKTtcbiAgICAgIH0gZWxzZSBpZiAobGluZSAmJiBvcHRpb25zLnN0cmljdCkge1xuICAgICAgICAvLyBJZ25vcmUgdW5leHBlY3RlZCBjb250ZW50IHVubGVzcyBpbiBzdHJpY3QgbW9kZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGluZSAnICsgKGkgKyAxKSArICcgJyArIEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZXMgdGhlIC0tLSBhbmQgKysrIGhlYWRlcnMsIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBsaW5lc1xuICAvLyBhcmUgY29uc3VtZWQuXG4gIGZ1bmN0aW9uIHBhcnNlRmlsZUhlYWRlcihpbmRleCkge1xuICAgIGxldCBmaWxlSGVhZGVyID0gKC9eKFxcLVxcLVxcLXxcXCtcXCtcXCspXFxzKyhcXFMrKVxccz8oLis/KVxccyokLykuZXhlYyhkaWZmc3RyW2ldKTtcbiAgICBpZiAoZmlsZUhlYWRlcikge1xuICAgICAgbGV0IGtleVByZWZpeCA9IGZpbGVIZWFkZXJbMV0gPT09ICctLS0nID8gJ29sZCcgOiAnbmV3JztcbiAgICAgIGluZGV4W2tleVByZWZpeCArICdGaWxlTmFtZSddID0gZmlsZUhlYWRlclsyXTtcbiAgICAgIGluZGV4W2tleVByZWZpeCArICdIZWFkZXInXSA9IGZpbGVIZWFkZXJbM107XG5cbiAgICAgIGkrKztcbiAgICB9XG4gIH1cblxuICAvLyBQYXJzZXMgYSBodW5rXG4gIC8vIFRoaXMgYXNzdW1lcyB0aGF0IHdlIGFyZSBhdCB0aGUgc3RhcnQgb2YgYSBodW5rLlxuICBmdW5jdGlvbiBwYXJzZUh1bmsoKSB7XG4gICAgbGV0IGNodW5rSGVhZGVySW5kZXggPSBpLFxuICAgICAgICBjaHVua0hlYWRlckxpbmUgPSBkaWZmc3RyW2krK10sXG4gICAgICAgIGNodW5rSGVhZGVyID0gY2h1bmtIZWFkZXJMaW5lLnNwbGl0KC9AQCAtKFxcZCspKD86LChcXGQrKSk/IFxcKyhcXGQrKSg/OiwoXFxkKykpPyBAQC8pO1xuXG4gICAgbGV0IGh1bmsgPSB7XG4gICAgICBvbGRTdGFydDogK2NodW5rSGVhZGVyWzFdLFxuICAgICAgb2xkTGluZXM6ICtjaHVua0hlYWRlclsyXSB8fCAxLFxuICAgICAgbmV3U3RhcnQ6ICtjaHVua0hlYWRlclszXSxcbiAgICAgIG5ld0xpbmVzOiArY2h1bmtIZWFkZXJbNF0gfHwgMSxcbiAgICAgIGxpbmVzOiBbXVxuICAgIH07XG5cbiAgICBsZXQgYWRkQ291bnQgPSAwLFxuICAgICAgICByZW1vdmVDb3VudCA9IDA7XG4gICAgZm9yICg7IGkgPCBkaWZmc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgb3BlcmF0aW9uID0gZGlmZnN0cltpXVswXTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnIHx8IG9wZXJhdGlvbiA9PT0gJy0nIHx8IG9wZXJhdGlvbiA9PT0gJyAnIHx8IG9wZXJhdGlvbiA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIGh1bmsubGluZXMucHVzaChkaWZmc3RyW2ldKTtcblxuICAgICAgICBpZiAob3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgICAgcmVtb3ZlQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICAgIGFkZENvdW50Kys7XG4gICAgICAgICAgcmVtb3ZlQ291bnQrKztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHRoZSBlbXB0eSBibG9jayBjb3VudCBjYXNlXG4gICAgaWYgKCFhZGRDb3VudCAmJiBodW5rLm5ld0xpbmVzID09PSAxKSB7XG4gICAgICBodW5rLm5ld0xpbmVzID0gMDtcbiAgICB9XG4gICAgaWYgKCFyZW1vdmVDb3VudCAmJiBodW5rLm9sZExpbmVzID09PSAxKSB7XG4gICAgICBodW5rLm9sZExpbmVzID0gMDtcbiAgICB9XG5cbiAgICAvLyBQZXJmb3JtIG9wdGlvbmFsIHNhbml0eSBjaGVja2luZ1xuICAgIGlmIChvcHRpb25zLnN0cmljdCkge1xuICAgICAgaWYgKGFkZENvdW50ICE9PSBodW5rLm5ld0xpbmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQWRkZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgICAgaWYgKHJlbW92ZUNvdW50ICE9PSBodW5rLm9sZExpbmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVtb3ZlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGh1bms7XG4gIH1cblxuICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgcGFyc2VJbmRleCgpO1xuICB9XG5cbiAgcmV0dXJuIGxpc3Q7XG59XG4iLCIvLyBJdGVyYXRvciB0aGF0IHRyYXZlcnNlcyBpbiB0aGUgcmFuZ2Ugb2YgW21pbiwgbWF4XSwgc3RlcHBpbmdcbi8vIGJ5IGRpc3RhbmNlIGZyb20gYSBnaXZlbiBzdGFydCBwb3NpdGlvbi4gSS5lLiBmb3IgWzAsIDRdLCB3aXRoXG4vLyBzdGFydCBvZiAyLCB0aGlzIHdpbGwgaXRlcmF0ZSAyLCAzLCAxLCA0LCAwLlxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RhcnQsIG1pbkxpbmUsIG1heExpbmUpIHtcbiAgbGV0IHdhbnRGb3J3YXJkID0gdHJ1ZSxcbiAgICAgIGJhY2t3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gZmFsc2UsXG4gICAgICBsb2NhbE9mZnNldCA9IDE7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGl0ZXJhdG9yKCkge1xuICAgIGlmICh3YW50Rm9yd2FyZCAmJiAhZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKGJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIGxvY2FsT2Zmc2V0Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJleW9uZCB0ZXh0IGxlbmd0aCwgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYWZ0ZXIgb2Zmc2V0IGxvY2F0aW9uIChvciBkZXNpcmVkIGxvY2F0aW9uIG9uIGZpcnN0IGl0ZXJhdGlvbilcbiAgICAgIGlmIChzdGFydCArIGxvY2FsT2Zmc2V0IDw9IG1heExpbmUpIHtcbiAgICAgICAgcmV0dXJuIGxvY2FsT2Zmc2V0O1xuICAgICAgfVxuXG4gICAgICBmb3J3YXJkRXhoYXVzdGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIWJhY2t3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpZiB0cnlpbmcgdG8gZml0IGJlZm9yZSB0ZXh0IGJlZ2lubmluZywgYW5kIGlmIG5vdCwgY2hlY2sgaXQgZml0c1xuICAgICAgLy8gYmVmb3JlIG9mZnNldCBsb2NhdGlvblxuICAgICAgaWYgKG1pbkxpbmUgPD0gc3RhcnQgLSBsb2NhbE9mZnNldCkge1xuICAgICAgICByZXR1cm4gLWxvY2FsT2Zmc2V0Kys7XG4gICAgICB9XG5cbiAgICAgIGJhY2t3YXJkRXhoYXVzdGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBpdGVyYXRvcigpO1xuICAgIH1cblxuICAgIC8vIFdlIHRyaWVkIHRvIGZpdCBodW5rIGJlZm9yZSB0ZXh0IGJlZ2lubmluZyBhbmQgYmV5b25kIHRleHQgbGVuZ2h0LCB0aGVuXG4gICAgLy8gaHVuayBjYW4ndCBmaXQgb24gdGhlIHRleHQuIFJldHVybiB1bmRlZmluZWRcbiAgfTtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZU9wdGlvbnMob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZGVmYXVsdHMuY2FsbGJhY2sgPSBvcHRpb25zO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMpIHtcbiAgICBmb3IgKGxldCBuYW1lIGluIG9wdGlvbnMpIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBkZWZhdWx0c1tuYW1lXSA9IG9wdGlvbnNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0cztcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgbGNzID0gcmVxdWlyZSgnLi9saWIvbGNzJyk7XG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2xpYi9hcnJheScpO1xudmFyIHBhdGNoID0gcmVxdWlyZSgnLi9saWIvanNvblBhdGNoJyk7XG52YXIgaW52ZXJzZSA9IHJlcXVpcmUoJy4vbGliL2ludmVyc2UnKTtcbnZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vbGliL2pzb25Qb2ludGVyJyk7XG52YXIgZW5jb2RlU2VnbWVudCA9IGpzb25Qb2ludGVyLmVuY29kZVNlZ21lbnQ7XG5cbmV4cG9ydHMuZGlmZiA9IGRpZmY7XG5leHBvcnRzLnBhdGNoID0gcGF0Y2guYXBwbHk7XG5leHBvcnRzLnBhdGNoSW5QbGFjZSA9IHBhdGNoLmFwcGx5SW5QbGFjZTtcbmV4cG9ydHMuaW52ZXJzZSA9IGludmVyc2U7XG5leHBvcnRzLmNsb25lID0gcGF0Y2guY2xvbmU7XG5cbi8vIEVycm9yc1xuZXhwb3J0cy5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vbGliL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG5leHBvcnRzLlRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vbGliL1Rlc3RGYWlsZWRFcnJvcicpO1xuZXhwb3J0cy5QYXRjaE5vdEludmVydGlibGVFcnJvciA9IHJlcXVpcmUoJy4vbGliL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBpc1ZhbGlkT2JqZWN0ID0gcGF0Y2guaXNWYWxpZE9iamVjdDtcbnZhciBkZWZhdWx0SGFzaCA9IHBhdGNoLmRlZmF1bHRIYXNoO1xuXG4vKipcbiAqIENvbXB1dGUgYSBKU09OIFBhdGNoIHJlcHJlc2VudGluZyB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBhIGFuZCBiLlxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgaWYgYSBmdW5jdGlvbiwgc2VlIG9wdGlvbnMuaGFzaFxuICogQHBhcmFtIHs/ZnVuY3Rpb24oeDoqKTpTdHJpbmd8TnVtYmVyfSBvcHRpb25zLmhhc2ggdXNlZCB0byBoYXNoIGFycmF5IGl0ZW1zXG4gKiAgaW4gb3JkZXIgdG8gcmVjb2duaXplIGlkZW50aWNhbCBvYmplY3RzLCBkZWZhdWx0cyB0byBKU09OLnN0cmluZ2lmeVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSk6b2JqZWN0fSBvcHRpb25zLm1ha2VDb250ZXh0XG4gKiAgdXNlZCB0byBnZW5lcmF0ZSBwYXRjaCBjb250ZXh0LiBJZiBub3QgcHJvdmlkZWQsIGNvbnRleHQgd2lsbCBub3QgYmUgZ2VuZXJhdGVkXG4gKiBAcmV0dXJucyB7YXJyYXl9IEpTT04gUGF0Y2ggc3VjaCB0aGF0IHBhdGNoKGRpZmYoYSwgYiksIGEpIH4gYlxuICovXG5mdW5jdGlvbiBkaWZmKGEsIGIsIG9wdGlvbnMpIHtcblx0cmV0dXJuIGFwcGVuZENoYW5nZXMoYSwgYiwgJycsIGluaXRTdGF0ZShvcHRpb25zLCBbXSkpLnBhdGNoO1xufVxuXG4vKipcbiAqIENyZWF0ZSBpbml0aWFsIGRpZmYgc3RhdGUgZnJvbSB0aGUgcHJvdmlkZWQgb3B0aW9uc1xuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBAc2VlIGRpZmYgb3B0aW9ucyBhYm92ZVxuICogQHBhcmFtIHthcnJheX0gcGF0Y2ggYW4gZW1wdHkgb3IgZXhpc3RpbmcgSlNPTiBQYXRjaCBhcnJheSBpbnRvIHdoaWNoXG4gKiAgdGhlIGRpZmYgc2hvdWxkIGdlbmVyYXRlIG5ldyBwYXRjaCBvcGVyYXRpb25zXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBpbml0aWFsaXplZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGluaXRTdGF0ZShvcHRpb25zLCBwYXRjaCkge1xuXHRpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0Y2g6IHBhdGNoLFxuXHRcdFx0aGFzaDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMuaGFzaCwgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLm1ha2VDb250ZXh0LCBkZWZhdWx0Q29udGV4dCksXG5cdFx0XHRpbnZlcnRpYmxlOiAhKG9wdGlvbnMuaW52ZXJ0aWJsZSA9PT0gZmFsc2UpXG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0cGF0Y2g6IHBhdGNoLFxuXHRcdFx0aGFzaDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBkZWZhdWx0Q29udGV4dCxcblx0XHRcdGludmVydGlibGU6IHRydWVcblx0XHR9O1xuXHR9XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIEpTT04gdmFsdWVzIChvYmplY3QsIGFycmF5LCBudW1iZXIsIHN0cmluZywgZXRjLiksIGZpbmQgdGhlaXJcbiAqIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKSB7XG5cdGlmKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuXHRcdHJldHVybiBhcHBlbmRBcnJheUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xuXHR9XG5cblx0aWYoaXNWYWxpZE9iamVjdChhKSAmJiBpc1ZhbGlkT2JqZWN0KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZE9iamVjdENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xuXHR9XG5cblx0cmV0dXJuIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIG9iamVjdHMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbzFcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZE9iamVjdENoYW5nZXMobzEsIG8yLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG8yKTtcblx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdHZhciBpLCBrZXk7XG5cblx0Zm9yKGk9a2V5cy5sZW5ndGgtMTsgaT49MDsgLS1pKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHR2YXIga2V5UGF0aCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0aWYobzFba2V5XSAhPT0gdm9pZCAwKSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKG8xW2tleV0sIG8yW2tleV0sIGtleVBhdGgsIHN0YXRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDoga2V5UGF0aCwgdmFsdWU6IG8yW2tleV0gfSk7XG5cdFx0fVxuXHR9XG5cblx0a2V5cyA9IE9iamVjdC5rZXlzKG8xKTtcblx0Zm9yKGk9a2V5cy5sZW5ndGgtMTsgaT49MDsgLS1pKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHRpZihvMltrZXldID09PSB2b2lkIDApIHtcblx0XHRcdHZhciBwID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBvMVtrZXldIH0pO1xuXHRcdFx0fVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCB9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIGFycmF5cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZEFycmF5Q2hhbmdlcyhhMSwgYTIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBhMWhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTEpO1xuXHR2YXIgYTJoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGEyKTtcblxuXHR2YXIgbGNzTWF0cml4ID0gbGNzLmNvbXBhcmUoYTFoYXNoLCBhMmhhc2gpO1xuXG5cdHJldHVybiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBsY3NNYXRyaXggaW50byBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYW5kIGFwcGVuZFxuICogdGhlbSB0byBzdGF0ZS5wYXRjaCwgcmVjdXJzaW5nIGludG8gYXJyYXkgZWxlbWVudHMgYXMgbmVjZXNzYXJ5XG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3NNYXRyaXhcbiAqIEByZXR1cm5zIHtvYmplY3R9IG5ldyBzdGF0ZSB3aXRoIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhZGRlZCBiYXNlZFxuICogIG9uIHRoZSBwcm92aWRlZCBsY3NNYXRyaXhcbiAqL1xuZnVuY3Rpb24gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KSB7XG5cdHZhciBvZmZzZXQgPSAwO1xuXHRyZXR1cm4gbGNzLnJlZHVjZShmdW5jdGlvbihzdGF0ZSwgb3AsIGksIGopIHtcblx0XHR2YXIgbGFzdCwgY29udGV4dDtcblx0XHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyAoaiArIG9mZnNldCk7XG5cblx0XHRpZiAob3AgPT09IGxjcy5SRU1PVkUpIHtcblx0XHRcdC8vIENvYWxlc2NlIGFkamFjZW50IHJlbW92ZSArIGFkZCBpbnRvIHJlcGxhY2Vcblx0XHRcdGxhc3QgPSBwYXRjaFtwYXRjaC5sZW5ndGgtMV07XG5cdFx0XHRjb250ZXh0ID0gc3RhdGUubWFrZUNvbnRleHQoaiwgYTEpO1xuXG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogYTFbal0sIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGxhc3QgIT09IHZvaWQgMCAmJiBsYXN0Lm9wID09PSAnYWRkJyAmJiBsYXN0LnBhdGggPT09IHApIHtcblx0XHRcdFx0bGFzdC5vcCA9ICdyZXBsYWNlJztcblx0XHRcdFx0bGFzdC5jb250ZXh0ID0gY29udGV4dDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdFx0XHR9XG5cblx0XHRcdG9mZnNldCAtPSAxO1xuXG5cdFx0fSBlbHNlIGlmIChvcCA9PT0gbGNzLkFERCkge1xuXHRcdFx0Ly8gU2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAyI3NlY3Rpb24tNC4xXG5cdFx0XHQvLyBNYXkgdXNlIGVpdGhlciBpbmRleD09PWxlbmd0aCAqb3IqICctJyB0byBpbmRpY2F0ZSBhcHBlbmRpbmcgdG8gYXJyYXlcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHAsIHZhbHVlOiBhMltpXSxcblx0XHRcdFx0Y29udGV4dDogc3RhdGUubWFrZUNvbnRleHQoaiwgYTEpXG5cdFx0XHR9KTtcblxuXHRcdFx0b2Zmc2V0ICs9IDE7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhhMVtqXSwgYTJbaV0sIHAsIHN0YXRlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gc3RhdGU7XG5cblx0fSwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogR2l2ZW4gdHdvIG51bWJlcnxzdHJpbmd8bnVsbCB2YWx1ZXMsIGlmIHRoZXkgZGlmZmVyLCBhcHBlbmQgdG8gZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKSB7XG5cdGlmKGEgIT09IGIpIHtcblx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcGF0aCwgdmFsdWU6IGEgfSk7XG5cdFx0fVxuXG5cdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAncmVwbGFjZScsIHBhdGg6IHBhdGgsIHZhbHVlOiBiIH0pO1xuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHByZWRpY2F0ZVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0geyp9IHlcbiAqIEByZXR1cm5zIHsqfSB4IGlmIHByZWRpY2F0ZSh4KSBpcyB0cnV0aHksIG90aGVyd2lzZSB5XG4gKi9cbmZ1bmN0aW9uIG9yRWxzZShwcmVkaWNhdGUsIHgsIHkpIHtcblx0cmV0dXJuIHByZWRpY2F0ZSh4KSA/IHggOiB5O1xufVxuXG4vKipcbiAqIERlZmF1bHQgcGF0Y2ggY29udGV4dCBnZW5lcmF0b3JcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9IHVuZGVmaW5lZCBjb250ZXh0XG4gKi9cbmZ1bmN0aW9uIGRlZmF1bHRDb250ZXh0KCkge1xuXHRyZXR1cm4gdm9pZCAwO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0geFxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgeCBpcyBhIGZ1bmN0aW9uLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih4KSB7XG5cdHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7XG5cbmZ1bmN0aW9uIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yO1xuXG5mdW5jdGlvbiBQYXRjaE5vdEludmVydGlibGVFcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBUZXN0RmFpbGVkRXJyb3I7XG5cbmZ1bmN0aW9uIFRlc3RGYWlsZWRFcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUZXN0RmFpbGVkRXJyb3I7IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29ucyA9IGNvbnM7XG5leHBvcnRzLnRhaWwgPSB0YWlsO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5cbi8qKlxuICogUHJlcGVuZCB4IHRvIGEsIHdpdGhvdXQgbXV0YXRpbmcgYS4gRmFzdGVyIHRoYW4gYS51bnNoaWZ0KHgpXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgd2l0aCB4IHByZXBlbmRlZFxuICovXG5mdW5jdGlvbiBjb25zKHgsIGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aDtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCsxKTtcblx0YlswXSA9IHg7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaSsxXSA9IGFbaV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgQXJyYXkgY29udGFpbmluZyBhbGwgZWxlbWVudHMgaW4gYSwgZXhjZXB0IHRoZSBmaXJzdC5cbiAqICBGYXN0ZXIgdGhhbiBhLnNsaWNlKDEpXG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5LCB0aGUgZXF1aXZhbGVudCBvZiBhLnNsaWNlKDEpXG4gKi9cbmZ1bmN0aW9uIHRhaWwoYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoLTE7XG5cdHZhciBiID0gbmV3IEFycmF5KGwpO1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2ldID0gYVtpKzFdO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogTWFwIGFueSBhcnJheS1saWtlLiBGYXN0ZXIgdGhhbiBBcnJheS5wcm90b3R5cGUubWFwXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IG1hcHBlZCBieSBmXG4gKi9cbmZ1bmN0aW9uIG1hcChmLCBhKSB7XG5cdHZhciBiID0gbmV3IEFycmF5KGEubGVuZ3RoKTtcblx0Zm9yKHZhciBpPTA7IGk8IGEubGVuZ3RoOyArK2kpIHtcblx0XHRiW2ldID0gZihhW2ldKTtcblx0fVxuXHRyZXR1cm4gYjtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWVwIGNvcHkgb2YgeCB3aGljaCBtdXN0IGJlIGEgbGVnYWwgSlNPTiBvYmplY3QvYXJyYXkvdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gY2xvbmVcbiAqIEByZXR1cm5zIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBjbG9uZSBvZiB4XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG5cbmZ1bmN0aW9uIGNsb25lKHgpIHtcblx0aWYoeCA9PSBudWxsIHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB4O1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheSh4KSkge1xuXHRcdHJldHVybiBjbG9uZUFycmF5KHgpO1xuXHR9XG5cblx0cmV0dXJuIGNsb25lT2JqZWN0KHgpO1xufVxuXG5mdW5jdGlvbiBjbG9uZUFycmF5ICh4KSB7XG5cdHZhciBsID0geC5sZW5ndGg7XG5cdHZhciB5ID0gbmV3IEFycmF5KGwpO1xuXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbDsgKytpKSB7XG5cdFx0eVtpXSA9IGNsb25lKHhbaV0pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG5cbmZ1bmN0aW9uIGNsb25lT2JqZWN0ICh4KSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMoeCk7XG5cdHZhciB5ID0ge307XG5cblx0Zm9yICh2YXIgaywgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuXHRcdGsgPSBrZXlzW2ldO1xuXHRcdHlba10gPSBjbG9uZSh4W2tdKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xuXG4vKipcbiAqIGNvbW11dGUgdGhlIHBhdGNoIHNlcXVlbmNlIGEsYiB0byBiLGFcbiAqIEBwYXJhbSB7b2JqZWN0fSBhIHBhdGNoIG9wZXJhdGlvblxuICogQHBhcmFtIHtvYmplY3R9IGIgcGF0Y2ggb3BlcmF0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tbXV0ZVBhdGhzKGEsIGIpIHtcblx0Ly8gVE9ETzogY2FzZXMgZm9yIHNwZWNpYWwgcGF0aHM6ICcnIGFuZCAnLydcblx0dmFyIGxlZnQgPSBqc29uUG9pbnRlci5wYXJzZShhLnBhdGgpO1xuXHR2YXIgcmlnaHQgPSBqc29uUG9pbnRlci5wYXJzZShiLnBhdGgpO1xuXHR2YXIgcHJlZml4ID0gZ2V0Q29tbW9uUGF0aFByZWZpeChsZWZ0LCByaWdodCk7XG5cdHZhciBpc0FycmF5ID0gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIHByZWZpeC5sZW5ndGgpO1xuXG5cdC8vIE5ldmVyIG11dGF0ZSB0aGUgb3JpZ2luYWxzXG5cdHZhciBhYyA9IGNvcHlQYXRjaChhKTtcblx0dmFyIGJjID0gY29weVBhdGNoKGIpO1xuXG5cdGlmKHByZWZpeC5sZW5ndGggPT09IDAgJiYgIWlzQXJyYXkpIHtcblx0XHQvLyBQYXRocyBzaGFyZSBubyBjb21tb24gYW5jZXN0b3IsIHNpbXBsZSBzd2FwXG5cdFx0cmV0dXJuIFtiYywgYWNdO1xuXHR9XG5cblx0aWYoaXNBcnJheSkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlQYXRocyhhYywgbGVmdCwgYmMsIHJpZ2h0KTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gY29tbXV0ZVRyZWVQYXRocyhhYywgbGVmdCwgYmMsIHJpZ2h0KTtcblx0fVxufTtcblxuZnVuY3Rpb24gY29tbXV0ZVRyZWVQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihhLnBhdGggPT09IGIucGF0aCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2Nhbm5vdCBjb21tdXRlICcgKyBhLm9wICsgJywnICsgYi5vcCArICcgd2l0aCBpZGVudGljYWwgb2JqZWN0IHBhdGhzJyk7XG5cdH1cblx0Ly8gRklYTUU6IEltcGxlbWVudCB0cmVlIHBhdGggY29tbXV0YXRpb25cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHdob3NlIGNvbW1vbiBhbmNlc3RvciAod2hpY2ggbWF5IGJlIHRoZSBpbW1lZGlhdGUgcGFyZW50KVxuICogaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSBhXG4gKiBAcGFyYW0gbGVmdFxuICogQHBhcmFtIGJcbiAqIEBwYXJhbSByaWdodFxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGxlZnQubGVuZ3RoID09PSByaWdodC5sZW5ndGgpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5U2libGluZ3MoYSwgbGVmdCwgYiwgcmlnaHQpO1xuXHR9XG5cblx0aWYgKGxlZnQubGVuZ3RoID4gcmlnaHQubGVuZ3RoKSB7XG5cdFx0Ly8gbGVmdCBpcyBsb25nZXIsIGNvbW11dGUgYnkgXCJtb3ZpbmdcIiBpdCB0byB0aGUgcmlnaHRcblx0XHRsZWZ0ID0gY29tbXV0ZUFycmF5QW5jZXN0b3IoYiwgcmlnaHQsIGEsIGxlZnQsIC0xKTtcblx0XHRhLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGxlZnQpKTtcblx0fSBlbHNlIHtcblx0XHQvLyByaWdodCBpcyBsb25nZXIsIGNvbW11dGUgYnkgXCJtb3ZpbmdcIiBpdCB0byB0aGUgbGVmdFxuXHRcdHJpZ2h0ID0gY29tbXV0ZUFycmF5QW5jZXN0b3IoYSwgbGVmdCwgYiwgcmlnaHQsIDEpO1xuXHRcdGIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4ocmlnaHQpKTtcblx0fVxuXG5cdHJldHVybiBbYiwgYV07XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBpbmRleCkge1xuXHRyZXR1cm4ganNvblBvaW50ZXIuaXNWYWxpZEFycmF5SW5kZXgobGVmdFtpbmRleF0pXG5cdFx0JiYganNvblBvaW50ZXIuaXNWYWxpZEFycmF5SW5kZXgocmlnaHRbaW5kZXhdKTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHJlZmVycmluZyB0byBpdGVtcyBpbiB0aGUgc2FtZSBhcnJheVxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHJldHVybnMgeypbXX1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5U2libGluZ3MobCwgbHBhdGgsIHIsIHJwYXRoKSB7XG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHR2YXIgY29tbXV0ZWQ7XG5cblx0aWYobGluZGV4IDwgcmluZGV4KSB7XG5cdFx0Ly8gQWRqdXN0IHJpZ2h0IHBhdGhcblx0XHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRcdGNvbW11dGVkID0gcnBhdGguc2xpY2UoKTtcblx0XHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggLSAxKTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9IGVsc2UgaWYobC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRcdGNvbW11dGVkID0gcnBhdGguc2xpY2UoKTtcblx0XHRcdGNvbW11dGVkW3RhcmdldF0gPSByaW5kZXggKyAxO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH1cblx0fSBlbHNlIGlmKHIub3AgPT09ICdhZGQnIHx8IHIub3AgPT09ICdjb3B5Jykge1xuXHRcdC8vIEFkanVzdCBsZWZ0IHBhdGhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IGxpbmRleCArIDE7XG5cdFx0bC5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHR9IGVsc2UgaWYgKGxpbmRleCA+IHJpbmRleCAmJiByLm9wID09PSAncmVtb3ZlJykge1xuXHRcdC8vIEFkanVzdCBsZWZ0IHBhdGggb25seSBpZiByZW1vdmUgd2FzIGF0IGEgKHN0cmljdGx5KSBsb3dlciBpbmRleFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgbGluZGV4IC0gMSk7XG5cdFx0bC5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHR9XG5cblx0cmV0dXJuIFtyLCBsXTtcbn1cblxuLyoqXG4gKiBDb21tdXRlIHR3byBwYXRjaGVzIHdpdGggYSBjb21tb24gYXJyYXkgYW5jZXN0b3JcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEBwYXJhbSBkaXJlY3Rpb25cbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlBbmNlc3RvcihsLCBscGF0aCwgciwgcnBhdGgsIGRpcmVjdGlvbikge1xuXHQvLyBycGF0aCBpcyBsb25nZXIgb3Igc2FtZSBsZW5ndGhcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdC8vIENvcHkgcnBhdGgsIHRoZW4gYWRqdXN0IGl0cyBhcnJheSBpbmRleFxuXHR2YXIgcmMgPSBycGF0aC5zbGljZSgpO1xuXG5cdGlmKGxpbmRleCA+IHJpbmRleCkge1xuXHRcdHJldHVybiByYztcblx0fVxuXG5cdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggLSBkaXJlY3Rpb24pO1xuXHR9IGVsc2UgaWYobC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4ICsgZGlyZWN0aW9uKTtcblx0fVxuXG5cdHJldHVybiByYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29tbW9uUGF0aFByZWZpeChwMSwgcDIpIHtcblx0dmFyIHAxbCA9IHAxLmxlbmd0aDtcblx0dmFyIHAybCA9IHAyLmxlbmd0aDtcblx0aWYocDFsID09PSAwIHx8IHAybCA9PT0gMCB8fCAocDFsIDwgMiAmJiBwMmwgPCAyKSkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdC8vIElmIHBhdGhzIGFyZSBzYW1lIGxlbmd0aCwgdGhlIGxhc3Qgc2VnbWVudCBjYW5ub3QgYmUgcGFydFxuXHQvLyBvZiBhIGNvbW1vbiBwcmVmaXguICBJZiBub3QgdGhlIHNhbWUgbGVuZ3RoLCB0aGUgcHJlZml4IGNhbm5vdFxuXHQvLyBiZSBsb25nZXIgdGhhbiB0aGUgc2hvcnRlciBwYXRoLlxuXHR2YXIgbCA9IHAxbCA9PT0gcDJsXG5cdFx0PyBwMWwgLSAxXG5cdFx0OiBNYXRoLm1pbihwMWwsIHAybCk7XG5cblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBwMVtpXSA9PT0gcDJbaV0pIHtcblx0XHQrK2lcblx0fVxuXG5cdHJldHVybiBwMS5zbGljZSgwLCBpKTtcbn1cblxuZnVuY3Rpb24gY29weVBhdGNoKHApIHtcblx0aWYocC5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoIH07XG5cdH1cblxuXHRpZihwLm9wID09PSAnY29weScgfHwgcC5vcCA9PT0gJ21vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCwgZnJvbTogcC5mcm9tIH07XG5cdH1cblxuXHQvLyB0ZXN0LCBhZGQsIHJlcGxhY2Vcblx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCwgdmFsdWU6IHAudmFsdWUgfTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGRlZXBFcXVhbHM7XG5cbi8qKlxuICogQ29tcGFyZSAyIEpTT04gdmFsdWVzLCBvciByZWN1cnNpdmVseSBjb21wYXJlIDIgSlNPTiBvYmplY3RzIG9yIGFycmF5c1xuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBiXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZmYgYSBhbmQgYiBhcmUgcmVjdXJzaXZlbHkgZXF1YWxcbiAqL1xuZnVuY3Rpb24gZGVlcEVxdWFscyhhLCBiKSB7XG5cdGlmKGEgPT09IGIpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoYSkgJiYgQXJyYXkuaXNBcnJheShiKSkge1xuXHRcdHJldHVybiBjb21wYXJlQXJyYXlzKGEsIGIpO1xuXHR9XG5cblx0aWYodHlwZW9mIGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBiID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiBjb21wYXJlT2JqZWN0cyhhLCBiKTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZUFycmF5cyhhLCBiKSB7XG5cdGlmKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDA7IGk8YS5sZW5ndGg7ICsraSkge1xuXHRcdGlmKCFkZWVwRXF1YWxzKGFbaV0sIGJbaV0pKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVPYmplY3RzKGEsIGIpIHtcblx0aWYoKGEgPT09IG51bGwgJiYgYiAhPT0gbnVsbCkgfHwgKGEgIT09IG51bGwgJiYgYiA9PT0gbnVsbCkpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgYWtleXMgPSBPYmplY3Qua2V5cyhhKTtcblx0dmFyIGJrZXlzID0gT2JqZWN0LmtleXMoYik7XG5cblx0aWYoYWtleXMubGVuZ3RoICE9PSBia2V5cy5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwLCBrOyBpPGFrZXlzLmxlbmd0aDsgKytpKSB7XG5cdFx0ayA9IGFrZXlzW2ldO1xuXHRcdGlmKCEoayBpbiBiICYmIGRlZXBFcXVhbHMoYVtrXSwgYltrXSkpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRydWU7XG59IiwidmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbnZlcnNlKHApIHtcblx0dmFyIHByID0gW107XG5cdHZhciBpLCBza2lwO1xuXHRmb3IoaSA9IHAubGVuZ3RoLTE7IGk+PSAwOyBpIC09IHNraXApIHtcblx0XHRza2lwID0gaW52ZXJ0T3AocHIsIHBbaV0sIGksIHApO1xuXHR9XG5cblx0cmV0dXJuIHByO1xufTtcblxuZnVuY3Rpb24gaW52ZXJ0T3AocGF0Y2gsIGMsIGksIGNvbnRleHQpIHtcblx0dmFyIG9wID0gcGF0Y2hlc1tjLm9wXTtcblx0cmV0dXJuIG9wICE9PSB2b2lkIDAgJiYgdHlwZW9mIG9wLmludmVyc2UgPT09ICdmdW5jdGlvbidcblx0XHQ/IG9wLmludmVyc2UocGF0Y2gsIGMsIGksIGNvbnRleHQpXG5cdFx0OiAxO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG5cbmV4cG9ydHMuYXBwbHkgPSBwYXRjaDtcbmV4cG9ydHMuYXBwbHlJblBsYWNlID0gcGF0Y2hJblBsYWNlO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5pc1ZhbGlkT2JqZWN0ID0gaXNWYWxpZE9iamVjdDtcbmV4cG9ydHMuZGVmYXVsdEhhc2ggPSBkZWZhdWx0SGFzaDtcblxudmFyIGRlZmF1bHRPcHRpb25zID0ge307XG5cbi8qKlxuICogQXBwbHkgdGhlIHN1cHBsaWVkIEpTT04gUGF0Y2ggdG8geFxuICogQHBhcmFtIHthcnJheX0gY2hhbmdlcyBKU09OIFBhdGNoXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBwYXRjaFxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gb3B0aW9ucy5maW5kQ29udGV4dFxuICogIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHRcbiAqIEByZXR1cm5zIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0gcGF0Y2hlZCB2ZXJzaW9uIG9mIHguIElmIHggaXNcbiAqICBhbiBhcnJheSBvciBvYmplY3QsIGl0IHdpbGwgYmUgbXV0YXRlZCBhbmQgcmV0dXJuZWQuIE90aGVyd2lzZSwgaWZcbiAqICB4IGlzIGEgdmFsdWUsIHRoZSBuZXcgdmFsdWUgd2lsbCBiZSByZXR1cm5lZC5cbiAqL1xuZnVuY3Rpb24gcGF0Y2goY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRyZXR1cm4gcGF0Y2hJblBsYWNlKGNoYW5nZXMsIGNsb25lKHgpLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcGF0Y2hJblBsYWNlKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0aWYoIW9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gZGVmYXVsdE9wdGlvbnM7XG5cdH1cblxuXHQvLyBUT0RPOiBDb25zaWRlciB0aHJvd2luZyBpZiBjaGFuZ2VzIGlzIG5vdCBhbiBhcnJheVxuXHRpZighQXJyYXkuaXNBcnJheShjaGFuZ2VzKSkge1xuXHRcdHJldHVybiB4O1xuXHR9XG5cblx0dmFyIHBhdGNoLCBwO1xuXHRmb3IodmFyIGk9MDsgaTxjaGFuZ2VzLmxlbmd0aDsgKytpKSB7XG5cdFx0cCA9IGNoYW5nZXNbaV07XG5cdFx0cGF0Y2ggPSBwYXRjaGVzW3Aub3BdO1xuXG5cdFx0aWYocGF0Y2ggPT09IHZvaWQgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdpbnZhbGlkIG9wICcgKyBKU09OLnN0cmluZ2lmeShwKSk7XG5cdFx0fVxuXG5cdFx0eCA9IHBhdGNoLmFwcGx5KHgsIHAsIG9wdGlvbnMpO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRIYXNoKHgpIHtcblx0cmV0dXJuIGlzVmFsaWRPYmplY3QoeCkgPyBKU09OLnN0cmluZ2lmeSh4KSA6IHg7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRPYmplY3QgKHgpIHtcblx0cmV0dXJuIHggIT09IG51bGwgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSAnW29iamVjdCBPYmplY3RdJztcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgX3BhcnNlID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlclBhcnNlJyk7XG5cbmV4cG9ydHMuZmluZCA9IGZpbmQ7XG5leHBvcnRzLmpvaW4gPSBqb2luO1xuZXhwb3J0cy5hYnNvbHV0ZSA9IGFic29sdXRlO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuZXhwb3J0cy5jb250YWlucyA9IGNvbnRhaW5zO1xuZXhwb3J0cy5lbmNvZGVTZWdtZW50ID0gZW5jb2RlU2VnbWVudDtcbmV4cG9ydHMuZGVjb2RlU2VnbWVudCA9IGRlY29kZVNlZ21lbnQ7XG5leHBvcnRzLnBhcnNlQXJyYXlJbmRleCA9IHBhcnNlQXJyYXlJbmRleDtcbmV4cG9ydHMuaXNWYWxpZEFycmF5SW5kZXggPSBpc1ZhbGlkQXJyYXlJbmRleDtcblxuLy8gaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTJcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgc2VwYXJhdG9yUnggPSAvXFwvL2c7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG52YXIgZW5jb2RlZFNlcGFyYXRvclJ4ID0gL34xL2c7XG5cbnZhciBlc2NhcGVDaGFyID0gJ34nO1xudmFyIGVzY2FwZVJ4ID0gL34vZztcbnZhciBlbmNvZGVkRXNjYXBlID0gJ34wJztcbnZhciBlbmNvZGVkRXNjYXBlUnggPSAvfjAvZztcblxuLyoqXG4gKiBGaW5kIHRoZSBwYXJlbnQgb2YgdGhlIHNwZWNpZmllZCBwYXRoIGluIHggYW5kIHJldHVybiBhIGRlc2NyaXB0b3JcbiAqIGNvbnRhaW5pbmcgdGhlIHBhcmVudCBhbmQgYSBrZXkuICBJZiB0aGUgcGFyZW50IGRvZXMgbm90IGV4aXN0IGluIHgsXG4gKiByZXR1cm4gdW5kZWZpbmVkLCBpbnN0ZWFkLlxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHggb2JqZWN0IG9yIGFycmF5IGluIHdoaWNoIHRvIHNlYXJjaFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggSlNPTiBQb2ludGVyIHN0cmluZyAoZW5jb2RlZClcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IGZpbmRDb250ZXh0XG4gKiAgb3B0aW9uYWwgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dC4gIElmIHByb3ZpZGVkLCBjb250ZXh0IE1VU1QgYWxzbyBiZSBwcm92aWRlZC5cbiAqIEBwYXJhbSB7P3tiZWZvcmU6QXJyYXksIGFmdGVyOkFycmF5fX0gY29udGV4dCBvcHRpb25hbCBwYXRjaCBjb250ZXh0IGZvclxuICogIGZpbmRDb250ZXh0IHRvIHVzZSB0byBhZGp1c3QgYXJyYXkgaW5kaWNlcy4gIElmIHByb3ZpZGVkLCBmaW5kQ29udGV4dCBNVVNUXG4gKiAgYWxzbyBiZSBwcm92aWRlZC5cbiAqIEByZXR1cm5zIHt7dGFyZ2V0Om9iamVjdHxhcnJheXxudW1iZXJ8c3RyaW5nLCBrZXk6c3RyaW5nfXx1bmRlZmluZWR9XG4gKi9cbmZ1bmN0aW9uIGZpbmQoeCwgcGF0aCwgZmluZENvbnRleHQsIGNvbnRleHQpIHtcblx0aWYodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYocGF0aCA9PT0gJycpIHtcblx0XHQvLyB3aG9sZSBkb2N1bWVudFxuXHRcdHJldHVybiB7IHRhcmdldDogeCwga2V5OiB2b2lkIDAgfTtcblx0fVxuXG5cdGlmKHBhdGggPT09IHNlcGFyYXRvcikge1xuXHRcdHJldHVybiB7IHRhcmdldDogeCwga2V5OiAnJyB9O1xuXHR9XG5cblx0dmFyIHBhcmVudCA9IHgsIGtleTtcblx0dmFyIGhhc0NvbnRleHQgPSBjb250ZXh0ICE9PSB2b2lkIDA7XG5cblx0X3BhcnNlKHBhdGgsIGZ1bmN0aW9uKHNlZ21lbnQpIHtcblx0XHQvLyBobS4uLiB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGJlIGlmKHR5cGVvZiB4ID09PSAndW5kZWZpbmVkJylcblx0XHRpZih4ID09IG51bGwpIHtcblx0XHRcdC8vIFNpZ25hbCB0aGF0IHdlIHByZW1hdHVyZWx5IGhpdCB0aGUgZW5kIG9mIHRoZSBwYXRoIGhpZXJhcmNoeS5cblx0XHRcdHBhcmVudCA9IG51bGw7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0aWYoQXJyYXkuaXNBcnJheSh4KSkge1xuXHRcdFx0a2V5ID0gaGFzQ29udGV4dFxuXHRcdFx0XHQ/IGZpbmRJbmRleChmaW5kQ29udGV4dCwgcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpLCB4LCBjb250ZXh0KVxuXHRcdFx0XHQ6IHNlZ21lbnQgPT09ICctJyA/IHNlZ21lbnQgOiBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGtleSA9IHNlZ21lbnQ7XG5cdFx0fVxuXG5cdFx0cGFyZW50ID0geDtcblx0XHR4ID0geFtrZXldO1xuXHR9KTtcblxuXHRyZXR1cm4gcGFyZW50ID09PSBudWxsXG5cdFx0PyB2b2lkIDBcblx0XHQ6IHsgdGFyZ2V0OiBwYXJlbnQsIGtleToga2V5IH07XG59XG5cbmZ1bmN0aW9uIGFic29sdXRlKHBhdGgpIHtcblx0cmV0dXJuIHBhdGhbMF0gPT09IHNlcGFyYXRvciA/IHBhdGggOiBzZXBhcmF0b3IgKyBwYXRoO1xufVxuXG5mdW5jdGlvbiBqb2luKHNlZ21lbnRzKSB7XG5cdHJldHVybiBzZWdtZW50cy5qb2luKHNlcGFyYXRvcik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlKHBhdGgpIHtcblx0dmFyIHNlZ21lbnRzID0gW107XG5cdF9wYXJzZShwYXRoLCBzZWdtZW50cy5wdXNoLmJpbmQoc2VnbWVudHMpKTtcblx0cmV0dXJuIHNlZ21lbnRzO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyhhLCBiKSB7XG5cdHJldHVybiBiLmluZGV4T2YoYSkgPT09IDAgJiYgYlthLmxlbmd0aF0gPT09IHNlcGFyYXRvcjtcbn1cblxuLyoqXG4gKiBEZWNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBlbmNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGRlY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBkZWNvZGVTZWdtZW50KHMpIHtcblx0Ly8gU2VlOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVuY29kZWRTZXBhcmF0b3JSeCwgc2VwYXJhdG9yKS5yZXBsYWNlKGVuY29kZWRFc2NhcGVSeCwgZXNjYXBlQ2hhcik7XG59XG5cbi8qKlxuICogRW5jb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZGVjb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBlbmNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZW5jb2RlU2VnbWVudChzKSB7XG5cdHJldHVybiBzLnJlcGxhY2UoZXNjYXBlUngsIGVuY29kZWRFc2NhcGUpLnJlcGxhY2Uoc2VwYXJhdG9yUngsIGVuY29kZWRTZXBhcmF0b3IpO1xufVxuXG52YXIgYXJyYXlJbmRleFJ4ID0gL14oMHxbMS05XVxcZCopJC87XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgcyBpcyBhIHZhbGlkIEpTT04gUG9pbnRlciBhcnJheSBpbmRleFxuICogQHBhcmFtIHtTdHJpbmd9IHNcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkQXJyYXlJbmRleChzKSB7XG5cdHJldHVybiBhcnJheUluZGV4UngudGVzdChzKTtcbn1cblxuLyoqXG4gKiBTYWZlbHkgcGFyc2UgYSBzdHJpbmcgaW50byBhIG51bWJlciA+PSAwLiBEb2VzIG5vdCBjaGVjayBmb3IgZGVjaW1hbCBudW1iZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBudW1lcmljIHN0cmluZ1xuICogQHJldHVybnMge251bWJlcn0gbnVtYmVyID49IDBcbiAqL1xuZnVuY3Rpb24gcGFyc2VBcnJheUluZGV4IChzKSB7XG5cdGlmKGlzVmFsaWRBcnJheUluZGV4KHMpKSB7XG5cdFx0cmV0dXJuICtzO1xuXHR9XG5cblx0dGhyb3cgbmV3IFN5bnRheEVycm9yKCdpbnZhbGlkIGFycmF5IGluZGV4ICcgKyBzKTtcbn1cblxuZnVuY3Rpb24gZmluZEluZGV4IChmaW5kQ29udGV4dCwgc3RhcnQsIGFycmF5LCBjb250ZXh0KSB7XG5cdHZhciBpbmRleCA9IHN0YXJ0O1xuXG5cdGlmKGluZGV4IDwgMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcignYXJyYXkgaW5kZXggb3V0IG9mIGJvdW5kcyAnICsgaW5kZXgpO1xuXHR9XG5cblx0aWYoY29udGV4dCAhPT0gdm9pZCAwICYmIHR5cGVvZiBmaW5kQ29udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGluZGV4ID0gZmluZENvbnRleHQoc3RhcnQsIGFycmF5LCBjb250ZXh0KTtcblx0XHRpZihpbmRleCA8IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgcGF0Y2ggY29udGV4dCAnICsgY29udGV4dCk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGluZGV4O1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGpzb25Qb2ludGVyUGFyc2U7XG5cbnZhciBwYXJzZVJ4ID0gL1xcL3x+MXx+MC9nO1xudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBlc2NhcGVDaGFyID0gJ34nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xuXG4vKipcbiAqIFBhcnNlIHRocm91Z2ggYW4gZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nLCBkZWNvZGluZyBlYWNoIHBhdGggc2VnbWVudFxuICogYW5kIHBhc3NpbmcgaXQgdG8gYW4gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNzZWN0aW9uLTRcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZ1xuICogQHBhcmFtIHt7ZnVuY3Rpb24oc2VnbWVudDpzdHJpbmcpOmJvb2xlYW59fSBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb25cbiAqIEByZXR1cm5zIHtzdHJpbmd9IG9yaWdpbmFsIHBhdGhcbiAqL1xuZnVuY3Rpb24ganNvblBvaW50ZXJQYXJzZShwYXRoLCBvblNlZ21lbnQpIHtcblx0dmFyIHBvcywgYWNjdW0sIG1hdGNoZXMsIG1hdGNoO1xuXG5cdHBvcyA9IHBhdGguY2hhckF0KDApID09PSBzZXBhcmF0b3IgPyAxIDogMDtcblx0YWNjdW0gPSAnJztcblx0cGFyc2VSeC5sYXN0SW5kZXggPSBwb3M7XG5cblx0d2hpbGUobWF0Y2hlcyA9IHBhcnNlUnguZXhlYyhwYXRoKSkge1xuXG5cdFx0bWF0Y2ggPSBtYXRjaGVzWzBdO1xuXHRcdGFjY3VtICs9IHBhdGguc2xpY2UocG9zLCBwYXJzZVJ4Lmxhc3RJbmRleCAtIG1hdGNoLmxlbmd0aCk7XG5cdFx0cG9zID0gcGFyc2VSeC5sYXN0SW5kZXg7XG5cblx0XHRpZihtYXRjaCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0XHRpZiAob25TZWdtZW50KGFjY3VtKSA9PT0gZmFsc2UpIHJldHVybiBwYXRoO1xuXHRcdFx0YWNjdW0gPSAnJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0YWNjdW0gKz0gbWF0Y2ggPT09IGVuY29kZWRTZXBhcmF0b3IgPyBzZXBhcmF0b3IgOiBlc2NhcGVDaGFyO1xuXHRcdH1cblx0fVxuXG5cdGFjY3VtICs9IHBhdGguc2xpY2UocG9zKTtcblx0b25TZWdtZW50KGFjY3VtKTtcblxuXHRyZXR1cm4gcGF0aDtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbXBhcmUgPSBjb21wYXJlO1xuZXhwb3J0cy5yZWR1Y2UgPSByZWR1Y2U7XG5cbnZhciBSRU1PVkUsIFJJR0hULCBBREQsIERPV04sIFNLSVA7XG5cbmV4cG9ydHMuUkVNT1ZFID0gUkVNT1ZFID0gUklHSFQgPSAtMTtcbmV4cG9ydHMuQUREICAgID0gQUREICAgID0gRE9XTiAgPSAgMTtcbmV4cG9ydHMuRVFVQUwgID0gU0tJUCAgID0gMDtcblxuLyoqXG4gKiBDcmVhdGUgYW4gbGNzIGNvbXBhcmlzb24gbWF0cml4IGRlc2NyaWJpbmcgdGhlIGRpZmZlcmVuY2VzXG4gKiBiZXR3ZWVuIHR3byBhcnJheS1saWtlIHNlcXVlbmNlc1xuICogQHBhcmFtIHthcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcGFyYW0ge2FycmF5fSBiIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtvYmplY3R9IGxjcyBkZXNjcmlwdG9yLCBzdWl0YWJsZSBmb3IgcGFzc2luZyB0byByZWR1Y2UoKVxuICovXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcblx0dmFyIGNvbHMgPSBhLmxlbmd0aDtcblx0dmFyIHJvd3MgPSBiLmxlbmd0aDtcblxuXHR2YXIgcHJlZml4ID0gZmluZFByZWZpeChhLCBiKTtcblx0dmFyIHN1ZmZpeCA9IHByZWZpeCA8IGNvbHMgJiYgcHJlZml4IDwgcm93c1xuXHRcdD8gZmluZFN1ZmZpeChhLCBiLCBwcmVmaXgpXG5cdFx0OiAwO1xuXG5cdHZhciByZW1vdmUgPSBzdWZmaXggKyBwcmVmaXggLSAxO1xuXHRjb2xzIC09IHJlbW92ZTtcblx0cm93cyAtPSByZW1vdmU7XG5cdHZhciBtYXRyaXggPSBjcmVhdGVNYXRyaXgoY29scywgcm93cyk7XG5cblx0Zm9yICh2YXIgaiA9IGNvbHMgLSAxOyBqID49IDA7IC0taikge1xuXHRcdGZvciAodmFyIGkgPSByb3dzIC0gMTsgaSA+PSAwOyAtLWkpIHtcblx0XHRcdG1hdHJpeFtpXVtqXSA9IGJhY2t0cmFjayhtYXRyaXgsIGEsIGIsIHByZWZpeCwgaiwgaSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRwcmVmaXg6IHByZWZpeCxcblx0XHRtYXRyaXg6IG1hdHJpeCxcblx0XHRzdWZmaXg6IHN1ZmZpeFxuXHR9O1xufVxuXG4vKipcbiAqIFJlZHVjZSBhIHNldCBvZiBsY3MgY2hhbmdlcyBwcmV2aW91c2x5IGNyZWF0ZWQgdXNpbmcgY29tcGFyZVxuICogQHBhcmFtIHtmdW5jdGlvbihyZXN1bHQ6KiwgdHlwZTpudW1iZXIsIGk6bnVtYmVyLCBqOm51bWJlcil9IGZcbiAqICByZWR1Y2VyIGZ1bmN0aW9uLCB3aGVyZTpcbiAqICAtIHJlc3VsdCBpcyB0aGUgY3VycmVudCByZWR1Y2UgdmFsdWUsXG4gKiAgLSB0eXBlIGlzIHRoZSB0eXBlIG9mIGNoYW5nZTogQURELCBSRU1PVkUsIG9yIFNLSVBcbiAqICAtIGkgaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYlxuICogIC0gaiBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBhXG4gKiBAcGFyYW0geyp9IHIgaW5pdGlhbCB2YWx1ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjcyByZXN1bHRzIHJldHVybmVkIGJ5IGNvbXBhcmUoKVxuICogQHJldHVybnMgeyp9IHRoZSBmaW5hbCByZWR1Y2VkIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIHJlZHVjZShmLCByLCBsY3MpIHtcblx0dmFyIGksIGosIGssIG9wO1xuXG5cdHZhciBtID0gbGNzLm1hdHJpeDtcblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHByZWZpeFxuXHR2YXIgbCA9IGxjcy5wcmVmaXg7XG5cdGZvcihpID0gMDtpIDwgbDsgKytpKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaSwgaSk7XG5cdH1cblxuXHQvLyBSZWR1Y2UgbG9uZ2VzdCBjaGFuZ2Ugc3BhblxuXHRrID0gaTtcblx0bCA9IG0ubGVuZ3RoO1xuXHRpID0gMDtcblx0aiA9IDA7XG5cdHdoaWxlKGkgPCBsKSB7XG5cdFx0b3AgPSBtW2ldW2pdLnR5cGU7XG5cdFx0ciA9IGYociwgb3AsIGkraywgaitrKTtcblxuXHRcdHN3aXRjaChvcCkge1xuXHRcdFx0Y2FzZSBTS0lQOiAgKytpOyArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBSSUdIVDogKytqOyBicmVhaztcblx0XHRcdGNhc2UgRE9XTjogICsraTsgYnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBzdWZmaXhcblx0aSArPSBrO1xuXHRqICs9IGs7XG5cdGwgPSBsY3Muc3VmZml4O1xuXHRmb3IoayA9IDA7ayA8IGw7ICsraykge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGkraywgaitrKTtcblx0fVxuXG5cdHJldHVybiByO1xufVxuXG5mdW5jdGlvbiBmaW5kUHJlZml4KGEsIGIpIHtcblx0dmFyIGkgPSAwO1xuXHR2YXIgbCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XG5cdHdoaWxlKGkgPCBsICYmIGFbaV0gPT09IGJbaV0pIHtcblx0XHQrK2k7XG5cdH1cblx0cmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGZpbmRTdWZmaXgoYSwgYikge1xuXHR2YXIgYWwgPSBhLmxlbmd0aCAtIDE7XG5cdHZhciBibCA9IGIubGVuZ3RoIC0gMTtcblx0dmFyIGwgPSBNYXRoLm1pbihhbCwgYmwpO1xuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIGFbYWwtaV0gPT09IGJbYmwtaV0pIHtcblx0XHQrK2k7XG5cdH1cblx0cmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGJhY2t0cmFjayhtYXRyaXgsIGEsIGIsIHN0YXJ0LCBqLCBpKSB7XG5cdGlmIChhW2orc3RhcnRdID09PSBiW2krc3RhcnRdKSB7XG5cdFx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpICsgMV1baiArIDFdLnZhbHVlLCB0eXBlOiBTS0lQIH07XG5cdH1cblx0aWYgKG1hdHJpeFtpXVtqICsgMV0udmFsdWUgPCBtYXRyaXhbaSArIDFdW2pdLnZhbHVlKSB7XG5cdFx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpXVtqICsgMV0udmFsdWUgKyAxLCB0eXBlOiBSSUdIVCB9O1xuXHR9XG5cblx0cmV0dXJuIHsgdmFsdWU6IG1hdHJpeFtpICsgMV1bal0udmFsdWUgKyAxLCB0eXBlOiBET1dOIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1hdHJpeCAoY29scywgcm93cykge1xuXHR2YXIgbSA9IFtdLCBpLCBqLCBsYXN0cm93O1xuXG5cdC8vIEZpbGwgdGhlIGxhc3Qgcm93XG5cdGxhc3Ryb3cgPSBtW3Jvd3NdID0gW107XG5cdGZvciAoaiA9IDA7IGo8Y29sczsgKytqKSB7XG5cdFx0bGFzdHJvd1tqXSA9IHsgdmFsdWU6IGNvbHMgLSBqLCB0eXBlOiBSSUdIVCB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjb2xcblx0Zm9yIChpID0gMDsgaTxyb3dzOyArK2kpIHtcblx0XHRtW2ldID0gW107XG5cdFx0bVtpXVtjb2xzXSA9IHsgdmFsdWU6IHJvd3MgLSBpLCB0eXBlOiBET1dOIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNlbGxcblx0bVtyb3dzXVtjb2xzXSA9IHsgdmFsdWU6IDAsIHR5cGU6IFNLSVAgfTtcblxuXHRyZXR1cm4gbTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBkZWVwRXF1YWxzID0gcmVxdWlyZSgnLi9kZWVwRXF1YWxzJyk7XG52YXIgY29tbXV0ZVBhdGhzID0gcmVxdWlyZSgnLi9jb21tdXRlUGF0aHMnKTtcblxudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9hcnJheScpO1xuXG52YXIgVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9UZXN0RmFpbGVkRXJyb3InKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbnZhciBQYXRjaE5vdEludmVydGlibGVFcnJvciA9IHJlcXVpcmUoJy4vUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGZpbmQgPSBqc29uUG9pbnRlci5maW5kO1xudmFyIHBhcnNlQXJyYXlJbmRleCA9IGpzb25Qb2ludGVyLnBhcnNlQXJyYXlJbmRleDtcblxuZXhwb3J0cy50ZXN0ID0ge1xuXHRhcHBseTogYXBwbHlUZXN0LFxuXHRpbnZlcnNlOiBpbnZlcnRUZXN0LFxuXHRjb21tdXRlOiBjb21tdXRlVGVzdFxufTtcblxuZXhwb3J0cy5hZGQgPSB7XG5cdGFwcGx5OiBhcHBseUFkZCxcblx0aW52ZXJzZTogaW52ZXJ0QWRkLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG5leHBvcnRzLnJlbW92ZSA9IHtcblx0YXBwbHk6IGFwcGx5UmVtb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZW1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVSZW1vdmVcbn07XG5cbmV4cG9ydHMucmVwbGFjZSA9IHtcblx0YXBwbHk6IGFwcGx5UmVwbGFjZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVwbGFjZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlcGxhY2Vcbn07XG5cbmV4cG9ydHMubW92ZSA9IHtcblx0YXBwbHk6IGFwcGx5TW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0TW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZU1vdmVcbn07XG5cbmV4cG9ydHMuY29weSA9IHtcblx0YXBwbHk6IGFwcGx5Q29weSxcblx0aW52ZXJzZTogbm90SW52ZXJ0aWJsZSxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuLyoqXG4gKiBBcHBseSBhIHRlc3Qgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gdGVzdCB0ZXN0IG9wZXJhdGlvblxuICogQHRocm93cyB7VGVzdEZhaWxlZEVycm9yfSBpZiB0aGUgdGVzdCBvcGVyYXRpb24gZmFpbHNcbiAqL1xuXG5mdW5jdGlvbiBhcHBseVRlc3QoeCwgdGVzdCwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgdGVzdC5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCB0ZXN0LmNvbnRleHQpO1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cdHZhciBpbmRleCwgdmFsdWU7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0aW5kZXggPSBwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpO1xuXHRcdC8vaW5kZXggPSBmaW5kSW5kZXgob3B0aW9ucy5maW5kQ29udGV4dCwgaW5kZXgsIHRhcmdldCwgdGVzdC5jb250ZXh0KTtcblx0XHR2YWx1ZSA9IHRhcmdldFtpbmRleF07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSBwb2ludGVyLmtleSA9PT0gdm9pZCAwID8gcG9pbnRlci50YXJnZXQgOiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV07XG5cdH1cblxuXHRpZighZGVlcEVxdWFscyh2YWx1ZSwgdGVzdC52YWx1ZSkpIHtcblx0XHR0aHJvdyBuZXcgVGVzdEZhaWxlZEVycm9yKCd0ZXN0IGZhaWxlZCAnICsgSlNPTi5zdHJpbmdpZnkodGVzdCkpO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbi8qKlxuICogSW52ZXJ0IHRoZSBwcm92aWRlZCB0ZXN0IGFuZCBhZGQgaXQgdG8gdGhlIGludmVydGVkIHBhdGNoIHNlcXVlbmNlXG4gKiBAcGFyYW0gcHJcbiAqIEBwYXJhbSB0ZXN0XG4gKiBAcmV0dXJucyB7bnVtYmVyfVxuICovXG5mdW5jdGlvbiBpbnZlcnRUZXN0KHByLCB0ZXN0KSB7XG5cdHByLnB1c2godGVzdCk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlVGVzdCh0ZXN0LCBiKSB7XG5cdGlmKHRlc3QucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIHRlc3QscmVtb3ZlIC0+IHJlbW92ZSx0ZXN0IGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdGlmKGIub3AgPT09ICd0ZXN0JyB8fCBiLm9wID09PSAncmVwbGFjZScpIHtcblx0XHRyZXR1cm4gW2IsIHRlc3RdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyh0ZXN0LCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhbiBhZGQgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGFkZCBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlBZGQoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsID0gY2xvbmUoY2hhbmdlLnZhbHVlKTtcblxuXHQvLyBJZiBwb2ludGVyIHJlZmVycyB0byB3aG9sZSBkb2N1bWVudCwgcmVwbGFjZSB3aG9sZSBkb2N1bWVudFxuXHRpZihwb2ludGVyLmtleSA9PT0gdm9pZCAwKSB7XG5cdFx0cmV0dXJuIHZhbDtcblx0fVxuXG5cdF9hZGQocG9pbnRlciwgdmFsKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIF9hZGQocG9pbnRlciwgdmFsdWUpIHtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdC8vICctJyBpbmRpY2F0ZXMgJ2FwcGVuZCcgdG8gYXJyYXlcblx0XHRpZihwb2ludGVyLmtleSA9PT0gJy0nKSB7XG5cdFx0XHR0YXJnZXQucHVzaCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRhcmdldC5zcGxpY2UocG9pbnRlci5rZXksIDAsIHZhbHVlKTtcblx0XHR9XG5cdH0gZWxzZSBpZihpc1ZhbGlkT2JqZWN0KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgYWRkIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5ICcgKyBwb2ludGVyLmtleSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0QWRkKHByLCBhZGQpIHtcblx0dmFyIGNvbnRleHQgPSBhZGQuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhhZGQudmFsdWUsIGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBhZGQucGF0aCwgdmFsdWU6IGFkZC52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cHIucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogYWRkLnBhdGgsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlQWRkT3JDb3B5KGFkZCwgYikge1xuXHRpZihhZGQucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIGFkZCxyZW1vdmUgLT4gcmVtb3ZlLGFkZCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKGFkZCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZXBsYWNlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZXBsYWNlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseVJlcGxhY2UoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IG1pc3NpbmdWYWx1ZShwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbHVlID0gY2xvbmUoY2hhbmdlLnZhbHVlKTtcblxuXHQvLyBJZiBwb2ludGVyIHJlZmVycyB0byB3aG9sZSBkb2N1bWVudCwgcmVwbGFjZSB3aG9sZSBkb2N1bWVudFxuXHRpZihwb2ludGVyLmtleSA9PT0gdm9pZCAwKSB7XG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpXSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRSZXBsYWNlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVwbGFjZSB3L28gdGVzdCcpO1xuXHR9XG5cblx0dmFyIGNvbnRleHQgPSBwcmV2LmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMocHJldi52YWx1ZSwgYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKSlcblx0XHR9XG5cdH1cblxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogYy52YWx1ZSB9KTtcblx0cHIucHVzaCh7IG9wOiAncmVwbGFjZScsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVwbGFjZShyZXBsYWNlLCBiKSB7XG5cdGlmKHJlcGxhY2UucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIHJlcGxhY2UscmVtb3ZlIC0+IHJlbW92ZSxyZXBsYWNlIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdGlmKGIub3AgPT09ICd0ZXN0JyB8fCBiLm9wID09PSAncmVwbGFjZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlcGxhY2VdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZXBsYWNlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseVJlbW92ZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0Ly8ga2V5IG11c3QgZXhpc3QgZm9yIHJlbW92ZVxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMCkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0X3JlbW92ZShwb2ludGVyKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIF9yZW1vdmUgKHBvaW50ZXIpIHtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXG5cdHZhciByZW1vdmVkO1xuXHRpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldC5zcGxpY2UocGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KSwgMSk7XG5cdFx0cmV0dXJuIHJlbW92ZWRbMF07XG5cblx0fSBlbHNlIGlmIChpc1ZhbGlkT2JqZWN0KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0XHRkZWxldGUgdGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0XHRyZXR1cm4gcmVtb3ZlZDtcblxuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIHJlbW92ZSBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheScpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydFJlbW92ZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlbW92ZSB3L28gdGVzdCcpO1xuXHR9XG5cblx0dmFyIGNvbnRleHQgPSBwcmV2LmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LnRhaWwoY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblxuXHRwci5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlbW92ZShyZW1vdmUsIGIpIHtcblx0aWYocmVtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiBbYiwgcmVtb3ZlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIG1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIG1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5TW92ZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0aWYoanNvblBvaW50ZXIuY29udGFpbnMoY2hhbmdlLnBhdGgsIGNoYW5nZS5mcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignbW92ZS5mcm9tIGNhbm5vdCBiZSBhbmNlc3RvciBvZiBtb3ZlLnBhdGgnKTtcblx0fVxuXG5cdHZhciBwdG8gPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cdHZhciBwZnJvbSA9IGZpbmQoeCwgY2hhbmdlLmZyb20sIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5mcm9tQ29udGV4dCk7XG5cblx0X2FkZChwdG8sIF9yZW1vdmUocGZyb20pKTtcblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydE1vdmUocHIsIGMpIHtcblx0cHIucHVzaCh7IG9wOiAnbW92ZScsXG5cdFx0cGF0aDogYy5mcm9tLCBjb250ZXh0OiBjLmZyb21Db250ZXh0LFxuXHRcdGZyb206IGMucGF0aCwgZnJvbUNvbnRleHQ6IGMuY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVNb3ZlKG1vdmUsIGIpIHtcblx0aWYobW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgbW92ZSxyZW1vdmUgLT4gbW92ZSxyZXBsYWNlIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMobW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBjb3B5IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBjb3B5IG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUNvcHkoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwdG8gPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cdHZhciBwZnJvbSA9IGZpbmQoeCwgY2hhbmdlLmZyb20sIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5mcm9tQ29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocGZyb20pIHx8IG1pc3NpbmdWYWx1ZShwZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2NvcHkuZnJvbSBtdXN0IGV4aXN0Jyk7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcGZyb20udGFyZ2V0O1xuXHR2YXIgdmFsdWU7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBmcm9tLmtleSldO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3Bmcm9tLmtleV07XG5cdH1cblxuXHRfYWRkKHB0bywgY2xvbmUodmFsdWUpKTtcblx0cmV0dXJuIHg7XG59XG5cbi8vIE5PVEU6IENvcHkgaXMgbm90IGludmVydGlibGVcbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL2ppZmYvaXNzdWVzLzlcbi8vIFRoaXMgbmVlZHMgbW9yZSB0aG91Z2h0LiBXZSBtYXkgaGF2ZSB0byBleHRlbmQvYW1lbmQgSlNPTiBQYXRjaC5cbi8vIEF0IGZpcnN0IGdsYW5jZSwgdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBqdXN0IGJlIGEgcmVtb3ZlLlxuLy8gSG93ZXZlciwgdGhhdCdzIG5vdCBjb3JyZWN0LiAgSXQgdmlvbGF0ZXMgdGhlIGludm9sdXRpb246XG4vLyBpbnZlcnQoaW52ZXJ0KHApKSB+PSBwLiAgRm9yIGV4YW1wbGU6XG4vLyBpbnZlcnQoY29weSkgLT4gcmVtb3ZlXG4vLyBpbnZlcnQocmVtb3ZlKSAtPiBhZGRcbi8vIHRodXM6IGludmVydChpbnZlcnQoY29weSkpIC0+IGFkZCAoRE9IISB0aGlzIHNob3VsZCBiZSBjb3B5ISlcblxuZnVuY3Rpb24gbm90SW52ZXJ0aWJsZShfLCBjKSB7XG5cdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCAnICsgYy5vcCk7XG59XG5cbmZ1bmN0aW9uIG5vdEZvdW5kIChwb2ludGVyKSB7XG5cdHJldHVybiBwb2ludGVyID09PSB2b2lkIDAgfHwgKHBvaW50ZXIudGFyZ2V0ID09IG51bGwgJiYgcG9pbnRlci5rZXkgIT09IHZvaWQgMCk7XG59XG5cbmZ1bmN0aW9uIG1pc3NpbmdWYWx1ZShwb2ludGVyKSB7XG5cdHJldHVybiBwb2ludGVyLmtleSAhPT0gdm9pZCAwICYmIHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHggaXMgYSBub24tbnVsbCBvYmplY3RcbiAqIEBwYXJhbSB7Kn0geFxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRPYmplY3QgKHgpIHtcblx0cmV0dXJuIHggIT09IG51bGwgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnO1xufVxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcclxuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xyXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xyXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcclxuXHJcbkNsb3VkQ29udGVudCA9IChyZXF1aXJlICcuL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZENvbnRlbnRcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9saXN0ZW5lcnMgPSBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cclxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcclxuICAgIGFsbFByb3ZpZGVycyA9IHt9XHJcbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBfZXJyb3IgXCJVbmtub3duIHByb3ZpZGVyOiAje3Byb3ZpZGVyTmFtZX1cIlxyXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xyXG5cclxuICAgICMgYWRkIHNpbmdsZXRvbiBzaGFyZVByb3ZpZGVyLCBpZiBpdCBleGlzdHNcclxuICAgIGZvciBwcm92aWRlciBpbiBAc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIHByb3ZpZGVyLmNhbiAnc2hhcmUnXHJcbiAgICAgICAgQF9zZXRTdGF0ZSBzaGFyZVByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIGJyZWFrXHJcblxyXG4gICAgQF91aS5pbml0IEBhcHBPcHRpb25zLnVpXHJcblxyXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcclxuICAgIGlmIEBhcHBPcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgQGF1dG9TYXZlIEBhcHBPcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgc2V0UHJvdmlkZXJPcHRpb25zOiAobmFtZSwgbmV3T3B0aW9ucykgLT5cclxuICAgIGZvciBwcm92aWRlciBpbiBAc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIHByb3ZpZGVyLm5hbWUgaXMgbmFtZVxyXG4gICAgICAgIHByb3ZpZGVyLm9wdGlvbnMgPz0ge31cclxuICAgICAgICBmb3Iga2V5IG9mIG5ld09wdGlvbnNcclxuICAgICAgICAgIHByb3ZpZGVyLm9wdGlvbnNba2V5XSA9IG5ld09wdGlvbnNba2V5XVxyXG4gICAgICAgIGJyZWFrXHJcblxyXG4gIGNvbm5lY3Q6IC0+XHJcbiAgICBAX2V2ZW50ICdjb25uZWN0ZWQnLCB7Y2xpZW50OiBAfVxyXG5cclxuICBsaXN0ZW46IChsaXN0ZW5lcikgLT5cclxuICAgIGlmIGxpc3RlbmVyXHJcbiAgICAgIEBfbGlzdGVuZXJzLnB1c2ggbGlzdGVuZXJcclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5hcHBlbmRNZW51SXRlbSBpdGVtXHJcbiAgICBAXHJcblxyXG4gIHByZXBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLnByZXBlbmRNZW51SXRlbSBpdGVtXHJcbiAgICBAXHJcblxyXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBfdWkucmVwbGFjZU1lbnVJdGVtIGtleSwgaXRlbVxyXG4gICAgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cclxuICAgIEBfdWkuaW5zZXJ0TWVudUl0ZW1CZWZvcmUga2V5LCBpdGVtXHJcbiAgICBAXHJcblxyXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQWZ0ZXIga2V5LCBpdGVtXHJcbiAgICBAXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBfdWkuc2V0TWVudUJhckluZm8gaW5mb1xyXG5cclxuICBnZXRFbXB0eUNvbnRlbnQ6IC0+XHJcbiAgICBuZXcgQ2xvdWRDb250ZW50KClcclxuXHJcbiAgY3JlYXRlQ29udGVudDogKGNvbnRlbnQpIC0+XHJcbiAgICBuZXcgQ2xvdWRDb250ZW50IGNvbnRlbnRcclxuICBjcmVhdGVUZXh0Q29udGVudDogKHRleHQpIC0+XHJcbiAgICBjb250ZW50ID0gbmV3IENsb3VkQ29udGVudCgpXHJcbiAgICBjb250ZW50LmluaXRUZXh0IHRleHRcclxuICAgIGNvbnRlbnRcclxuICBjcmVhdGVKU09OQ29udGVudDogKGpzb24pIC0+XHJcbiAgICBjb250ZW50ID0gbmV3IENsb3VkQ29udGVudCgpXHJcbiAgICBjb250ZW50LmluaXRKU09OIGpzb25cclxuICAgIGNvbnRlbnRcclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJywge2NvbnRlbnQ6IEBnZXRFbXB0eUNvbnRlbnQoKX1cclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBhcHBPcHRpb25zLnVpPy5uZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiB3aW5kb3cubG9jYXRpb24sICdfYmxhbmsnXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kaXJ0eVxyXG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIEBzYXZlKClcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uTkVXX0ZJTEUnXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcclxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBvcGVuU2hhcmVkQ29udGVudDogKGlkKSAtPlxyXG4gICAgQHN0YXRlLnNoYXJlUHJvdmlkZXI/LmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbnVsbCwge292ZXJ3cml0YWJsZTogZmFsc2UsIG9wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cclxuXHJcbiAgc2F2ZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIEBzYXZlQ29udGVudCBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29udGVudDogKGNvbnRlbnQsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAc2F2ZUZpbGUgY29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXHJcbiAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLnNhdmUgY29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBpZiBAc3RhdGUubWV0YWRhdGEgaXNudCBtZXRhZGF0YVxyXG4gICAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge3NhdmVkOiB0cnVlfVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlQXNEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb3B5RGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIHNhdmVDb3B5ID0gKGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBAX3VpLnNhdmVDb3B5RGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgaWYgY29udGVudCBpcyBudWxsXHJcbiAgICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgLT5cclxuICAgICAgICAgIHNhdmVDb3B5IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBzaGFyZTogLT5cclxuICAgIGlmIEBzdGF0ZS5zaGFyZVByb3ZpZGVyXHJcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgICAgc2F2aW5nOiB0cnVlXHJcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2F2ZVNoYXJlZENvbnRlbnQgY29udGVudCwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxyXG4gICAgICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgICAgICBzYXZpbmc6IGZhbHNlXHJcbiAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG5cclxuICAgICAgICAgIHBhdGggPSBkb2N1bWVudC5sb2NhdGlvbi5vcmlnaW4gKyBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZVxyXG4gICAgICAgICAgc2hhcmVRdWVyeSA9IFwiP29wZW5TaGFyZWQ9I3tzaGFyZWRDb250ZW50SWR9XCJcclxuICAgICAgICAgIEBfdWkuc2hhcmVVcmxEaWFsb2cgXCIje3BhdGh9I3tzaGFyZVF1ZXJ5fVwiXHJcblxyXG4gIGRvd25sb2FkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgQF91aS5kb3dubG9hZERpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIEBhcHBPcHRpb25zLm1pbWVUeXBlLCBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBpZiBuZXdOYW1lIGlzbnQgQHN0YXRlLm1ldGFkYXRhLm5hbWVcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLnJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIChlcnIsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgICAgQF9ldmVudCAncmVuYW1lZEZpbGUnLCB7bWV0YWRhdGE6IG1ldGFkYXRhfVxyXG4gICAgICAgIGNhbGxiYWNrPyBuZXdOYW1lXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGEubmFtZSwgKG5ld05hbWUpID0+XHJcbiAgICAgICAgQHJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICByZW9wZW46IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgQHN0YXRlLm9wZW5lZENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YVxyXG5cclxuICByZW9wZW5EaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBpZiAobm90IEBzdGF0ZS5kaXJ0eSkgb3IgKGNvbmZpcm0gdHIgJ35DT05GSVJNLlJFT1BFTl9GSUxFJylcclxuICAgICAgICBAcmVvcGVuIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gaW5pdGlhbCBvcGVuZWQgdmVyc2lvbiB3YXMgZm91bmQgZm9yIHRoZSBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXHJcblxyXG4gIGRpcnR5OiAoaXNEaXJ0eSA9IHRydWUpLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgZGlydHk6IGlzRGlydHlcclxuICAgICAgc2F2ZWQ6IGZhbHNlIGlmIGlzRGlydHlcclxuXHJcbiAgYXV0b1NhdmU6IChpbnRlcnZhbCkgLT5cclxuICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBjbGVhckludGVydmFsIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW4gY2FzZSB0aGUgY2FsbGVyIHVzZXMgbWlsbGlzZWNvbmRzXHJcbiAgICBpZiBpbnRlcnZhbCA+IDEwMDBcclxuICAgICAgaW50ZXJ2YWwgPSBNYXRoLnJvdW5kKGludGVydmFsIC8gMTAwMClcclxuICAgIGlmIGludGVydmFsID4gMFxyXG4gICAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCAoPT4gQHNhdmUoKSBpZiBAc3RhdGUuZGlydHkgYW5kIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZScpLCAoaW50ZXJ2YWwgKiAxMDAwKVxyXG5cclxuICBpc0F1dG9TYXZpbmc6IC0+XHJcbiAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPiAwXHJcblxyXG4gIF9kaWFsb2dTYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY29udGVudCBpc250IG51bGxcclxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2Vycm9yOiAobWVzc2FnZSkgLT5cclxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxyXG4gICAgYWxlcnQgbWVzc2FnZVxyXG5cclxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSwgYWRkaXRpb25hbFN0YXRlPXt9KSAtPlxyXG4gICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID89IHRydWVcclxuICAgIHN0YXRlID1cclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgYWRkaXRpb25hbFN0YXRlXHJcbiAgICAgIHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9zZXRTdGF0ZSBzdGF0ZVxyXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudCwgbWV0YWRhdGE6IG1ldGFkYXRhfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgZm9yIGxpc3RlbmVyIGluIEBfbGlzdGVuZXJzXHJcbiAgICAgIGxpc3RlbmVyIGV2ZW50XHJcblxyXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xyXG4gICAgICBAc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXHJcblxyXG4gIF9yZXNldFN0YXRlOiAtPlxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBvcGVuZWRDb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG4gIF9jbG9zZUN1cnJlbnRGaWxlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdjbG9zZSdcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmNsb3NlIEBzdGF0ZS5tZXRhZGF0YVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5kb2N1bWVudFN0b3JlID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbVwiXHJcbmF1dGhvcml6ZVVybCAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvYXV0aGVudGljYXRlXCJcclxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcclxubGlzdFVybCAgICAgICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvYWxsXCJcclxubG9hZERvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvb3BlblwiXHJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxyXG5wYXRjaERvY3VtZW50VXJsICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9wYXRjaFwiXHJcbnJlbW92ZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2RlbGV0ZVwiXHJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcbmppZmYgPSByZXF1aXJlICdqaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZENvbnRlbnQgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZENvbnRlbnRcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkRvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGRvY1N0b3JlQXZhaWxhYmxlOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX29uRG9jU3RvcmVMb2FkZWQgPT5cclxuICAgICAgQHNldFN0YXRlIGRvY1N0b3JlQXZhaWxhYmxlOiB0cnVlXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LFxyXG4gICAgICBpZiBAc3RhdGUuZG9jU3RvcmVBdmFpbGFibGVcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgICAgZWxzZVxyXG4gICAgICAgICdUcnlpbmcgdG8gbG9nIGludG8gdGhlIERvY3VtZW50IFN0b3JlLi4uJ1xyXG4gICAgKVxyXG5cclxuY2xhc3MgRG9jdW1lbnRTdG9yZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIHNoYXJlOiB0cnVlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gICAgQHVzZXIgPSBudWxsXHJcblxyXG4gIEBOYW1lOiAnZG9jdW1lbnRTdG9yZSdcclxuXHJcbiAgcHJldmlvdXNseVNhdmVkQ29udGVudDogbnVsbFxyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICBlbHNlXHJcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IC0+XHJcbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXHJcblxyXG4gIF9vbkRvY1N0b3JlTG9hZGVkOiAoQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXHJcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxyXG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxyXG4gICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcblxyXG4gIF9jaGVja0xvZ2luOiAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGNoZWNrTG9naW5VcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5XaW5kb3c6IG51bGxcclxuXHJcbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgYW5kIG5vdCBAX2xvZ2luV2luZG93LmNsb3NlZFxyXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcclxuICAgIGVsc2VcclxuXHJcbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxyXG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxyXG4gICAgICAgIHNjcmVlblRvcCAgPSB3aW5kb3cuc2NyZWVuVG9wICBvciBzY3JlZW4udG9wXHJcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxyXG5cclxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XHJcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXHJcbiAgICAgICAgcmV0dXJuIHtsZWZ0LCB0b3B9XHJcblxyXG4gICAgICB3aWR0aCA9IDEwMDBcclxuICAgICAgaGVpZ2h0ID0gNDgwXHJcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcclxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXHJcbiAgICAgICAgJ3dpZHRoPScgKyB3aWR0aFxyXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxyXG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcclxuICAgICAgICAnbGVmdD0nICsgcG9zaXRpb24ubGVmdCBvciAyMDBcclxuICAgICAgICAnZGVwZW5kZW50PXllcydcclxuICAgICAgICAncmVzaXphYmxlPW5vJ1xyXG4gICAgICAgICdsb2NhdGlvbj1ubydcclxuICAgICAgICAnZGlhbG9nPXllcydcclxuICAgICAgICAnbWVudWJhcj1ubydcclxuICAgICAgXVxyXG5cclxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXHJcblxyXG4gICAgICBwb2xsQWN0aW9uID0gPT5cclxuICAgICAgICB0cnlcclxuICAgICAgICAgIGhyZWYgPSBAX2xvZ2luV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxyXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcclxuICAgICAgICAgICAgQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICAgICAgY2F0Y2ggZVxyXG4gICAgICAgICAgIyBjb25zb2xlLmxvZyBlXHJcblxyXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGxpc3RVcmxcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWVcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgW11cclxuXHJcbiAgbG9hZFNoYXJlZENvbnRlbnQ6IChpZCwgY2FsbGJhY2spIC0+XHJcbiAgICBzaGFyZWRNZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIHNoYXJlZENvbnRlbnRJZDogaWRcclxuICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICBAbG9hZChzaGFyZWRNZXRhZGF0YSwgY2FsbGJhY2spXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB3aXRoQ3JlZGVudGlhbHMgPSB1bmxlc3MgbWV0YWRhdGEuc2hhcmVkQ29udGVudElkIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlXHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiBsb2FkRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZCBvciBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAge3dpdGhDcmVkZW50aWFsc31cclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGRhdGFcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBuZXcgQ2xvdWRDb250ZW50IGRhdGEuY29udGVudCBvciBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIG1lc3NhZ2UgPSBpZiBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcclxuICAgICAgICAgIFwiVW5hYmxlIHRvIGxvYWQgZG9jdW1lbnQgJyN7bWV0YWRhdGEuc2hhcmVkQ29udGVudElkfScuIFBlcmhhcHMgdGhlIGZpbGUgd2FzIG5vdCBzaGFyZWQ/XCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkICN7bWV0YWRhdGEubmFtZSBvciBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yICdmaWxlJ31cIlxyXG4gICAgICAgIGNhbGxiYWNrIG1lc3NhZ2VcclxuXHJcbiAgc2F2ZVNoYXJlZENvbnRlbnQ6IChjb250ZW50LCBjYWxsYmFjaykgLT5cclxuICAgICMgZm9yIHRoZSBtb21lbnQsIGNyZWF0ZSBjb21wbGV0ZWx5IHJhbmRvbSBydW5LZXkgYW5kIGRvbid0XHJcbiAgICAjIGJvdGhlciB0byBzdG9yZSBpdC5cclxuICAgIHJ1bktleSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygyKVxyXG4gICAgc2hhcmVkTWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICBzaGFyZWRDb250ZW50U2VjcmV0S2V5OiBydW5LZXlcclxuICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICBAc2F2ZSBjb250ZW50LCBzaGFyZWRNZXRhZGF0YSwgKGVyciwgZGF0YSkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBkYXRhLmlkXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBjb250ZW50ID0gQF93cmFwQ29udGVudCBjb250ZW50LmdldENvbnRlbnQoKSwgbWV0YWRhdGEuc2hhcmVkQ29udGVudFNlY3JldEtleVxyXG5cclxuICAgIHdpdGhDcmVkZW50aWFscyA9IHRydWVcclxuXHJcbiAgICBwYXJhbXMgPSB7fVxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkIHRoZW4gcGFyYW1zLnJlY29yZGlkID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICBpZiBtZXRhZGF0YS5zaGFyZWRDb250ZW50U2VjcmV0S2V5XHJcbiAgICAgIHBhcmFtcy5ydW5LZXkgPSBtZXRhZGF0YS5zaGFyZWRDb250ZW50U2VjcmV0S2V5XHJcbiAgICAgIHdpdGhDcmVkZW50aWFscyA9IGZhbHNlXHJcblxyXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXHJcbiAgICBpZiBtZXRhZGF0YS5vdmVyd3JpdGFibGUgYW5kIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50IGFuZFxyXG4gICAgICAgIGRpZmYgPSBAX2NyZWF0ZURpZmYgQHByZXZpb3VzbHlTYXZlZENvbnRlbnQsIGNvbnRlbnRcclxuICAgICAgc2VuZENvbnRlbnQgPSBkaWZmXHJcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcclxuICAgIGVsc2VcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxyXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcclxuICAgICAgc2VuZENvbnRlbnQgPSBjb250ZW50XHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogc2VuZENvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAge3dpdGhDcmVkZW50aWFsc31cclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNvbnRlbnRcclxuICAgICAgICBpZiBkYXRhLmlkIHRoZW4gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkID0gZGF0YS5pZFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XHJcbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcclxuICAgIGt2cCA9IFtdXHJcbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcclxuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcclxuICAgIHJldHVybiB1cmwgKyBcIj9cIiArIGt2cC5qb2luIFwiJlwiXHJcblxyXG4gICMgVGhlIGRvY3VtZW50IHNlcnZlciByZXF1aXJlcyB0aGUgY29udGVudCB0byBiZSBKU09OLCBhbmQgaXQgbXVzdCBoYXZlXHJcbiAgIyBjZXJ0YWluIHByZS1kZWZpbmVkIGtleXMgaW4gb3JkZXIgdG8gYmUgbGlzdGVkIHdoZW4gd2UgcXVlcnkgdGhlIGxpc3RcclxuICBfd3JhcENvbnRlbnQ6IChjb250ZW50LCBzaGFyZSkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGNvbnRlbnRcclxuICAgICAgdHJ5XHJcbiAgICAgICAgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxyXG4gICAgICBjYXRjaFxyXG4gICAgSlNPTi5zdHJpbmdpZnlcclxuICAgICAgYXBwTmFtZTogQG9wdGlvbnMuYXBwTmFtZVxyXG4gICAgICBhcHBWZXJzaW9uOiBAb3B0aW9ucy5hcHBWZXJzaW9uXHJcbiAgICAgIGFwcEJ1aWxkTnVtOiBAb3B0aW9ucy5hcHBCdWlsZE51bVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIF9wZXJtaXNzaW9uczogaWYgc2hhcmUgdGhlbiAxIGVsc2UgMFxyXG5cclxuICBfY3JlYXRlRGlmZjogKGpzb24xLCBqc29uMikgLT5cclxuICAgIHRyeVxyXG4gICAgICBvcHRzID1cclxuICAgICAgICBoYXNoOiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaWYgdHlwZW9mIEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpcyBcImZ1bmN0aW9uXCJcclxuICAgICAgZGlmZiA9IGppZmYuZGlmZihKU09OLnBhcnNlKGpzb24xKSwgSlNPTi5wYXJzZShqc29uMiksIG9wdHMpXHJcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSBkaWZmXHJcbiAgICBjYXRjaFxyXG4gICAgICByZXR1cm4gbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5qc2RpZmYgPSByZXF1aXJlICdkaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZENvbnRlbnQgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZENvbnRlbnRcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWxUaW1lSW5mbyBleHRlbmRzIEVycm9yXHJcbiAgY29uc3RydWN0b3I6IC0+IEBuYW1lID0gJ1JlYWxUaW1lSW5mbydcclxuXHJcbmNsYXNzIFJlYWxUaW1lRXJyb3IgZXh0ZW5kcyBFcnJvclxyXG4gIGNvbnN0cnVjdG9yOiAtPiBAbmFtZSA9ICdSZWFsVGltZUVycm9yJ1xyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRlZEdBUElcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgICAgZWxzZVxyXG4gICAgICAgICdXYWl0aW5nIGZvciB0aGUgR29vZ2xlIENsaWVudCBBUEkgdG8gbG9hZC4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBjbG9zZTogdHJ1ZVxyXG5cclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAdXNlciA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbGVEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEB1c2VSZWFsVGltZUFQSSA9IEBvcHRpb25zLnVzZVJlYWxUaW1lQVBJIG9yIGZhbHNlXHJcbiAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnLCAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJ11cclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAdXNlciA9IG51bGxcclxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIGdhcGkuY2xpZW50Lm9hdXRoMi51c2VyaW5mby5nZXQoKS5leGVjdXRlICh1c2VyKSA9PlxyXG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxyXG4gICAgaWYgQF9hdXRvUmVuZXdUaW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dCBAX2F1dG9SZW5ld1RpbWVvdXRcclxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxyXG4gICAgICBAX2F1dG9SZW5ld1RpbWVvdXQgPSBzZXRUaW1lb3V0ICg9PiBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFKSwgKHBhcnNlSW50KGF1dGhUb2tlbi5leHBpcmVzX2luLCAxMCkgKiAwLjc1KSAqIDEwMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9zYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcclxuICAgICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBxdWVyeSA9IFwiKChtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nKSBvciAobWltZVR5cGUgPSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicpKSBhbmQgJyN7aWYgbWV0YWRhdGEgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9JyBpbiBwYXJlbnRzXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgICAgb3ZlcndyaXRhYmxlOiBpdGVtLmVkaXRhYmxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICBpZDogaXRlbS5pZFxyXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cclxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBsb3dlckIgPSBiLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMucGF0Y2hcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIHJlc291cmNlOlxyXG4gICAgICAgICAgdGl0bGU6IG5ld05hbWVcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgaWYgcmVzdWx0Py5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2s/IHJlc3VsdC5lcnJvclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ucmVhbFRpbWU/LmRvYz9cclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXHJcblxyXG4gIF9sb2FkR0FQSTogLT5cclxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXHJcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXHJcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XHJcbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcclxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xyXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXHJcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XHJcblxyXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzXHJcbiAgICAgIGNhbGxiYWNrKClcclxuICAgIGVsc2VcclxuICAgICAgc2VsZiA9IEBcclxuICAgICAgY2hlY2sgPSAtPlxyXG4gICAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnZHJpdmUnLCAndjInLCAtPlxyXG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxyXG4gICAgICAgICAgICAgIGdhcGkubG9hZCAnZHJpdmUtcmVhbHRpbWUnLCAtPlxyXG4gICAgICAgICAgICAgICAgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50cyA9IHRydWVcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcbiAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcblxyXG4gIF9sb2FkRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcclxuICAgICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgICAgIHhoci5vcGVuICdHRVQnLCBmaWxlLmRvd25sb2FkVXJsXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje0BhdXRoVG9rZW4uYWNjZXNzX3Rva2VufVwiXHJcbiAgICAgICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBuZXcgQ2xvdWRDb250ZW50IHhoci5yZXNwb25zZVRleHRcclxuICAgICAgICB4aHIub25lcnJvciA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBkb3dubG9hZCAje3VybH1cIlxyXG4gICAgICAgIHhoci5zZW5kKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gZ2V0IGRvd25sb2FkIHVybCdcclxuXHJcbiAgX3NhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnkgaGVhZGVyRGF0YVxyXG5cclxuICAgIFttZXRob2QsIHBhdGhdID0gaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICBbJ1BVVCcsIFwiL3VwbG9hZC9kcml2ZS92Mi9maWxlcy8je21ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH1cIl1cclxuICAgIGVsc2VcclxuICAgICAgWydQT1NUJywgJy91cGxvYWQvZHJpdmUvdjIvZmlsZXMnXVxyXG5cclxuICAgIGJvZHkgPSBbXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxcclxcblxcclxcbiN7aGVhZGVyfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICN7QG1pbWVUeXBlfVxcclxcblxcclxcbiN7Y29udGVudC5nZXRUZXh0KCl9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbiAgX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGZpbGVMb2FkZWQgPSAoZG9jKSAtPlxyXG4gICAgICBjb250ZW50ID0gZG9jLmdldE1vZGVsKCkuZ2V0Um9vdCgpLmdldCAnY29udGVudCdcclxuICAgICAgaWYgbWV0YWRhdGEub3ZlcndyaXRhYmxlXHJcbiAgICAgICAgdGhyb3dFcnJvciA9IChlKSAtPlxyXG4gICAgICAgICAgaWYgbm90IGUuaXNMb2NhbFxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgUmVhbFRpbWVFcnJvciAnQW5vdGhlciB1c2VyIGhhcyBtYWRlIGVkaXRzIHRvIHRoaXMgZmlsZSdcclxuICAgICAgICAjY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfSU5TRVJURUQsIHRocm93RXJyb3JcclxuICAgICAgICAjY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfREVMRVRFRCwgdGhyb3dFcnJvclxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxyXG4gICAgICAgIGRvYzogZG9jXHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBuZXcgQ2xvdWRDb250ZW50IGNvbnRlbnQuZ2V0VGV4dCgpXHJcblxyXG4gICAgaW5pdCA9IChtb2RlbCkgLT5cclxuICAgICAgY29udGVudCA9IG1vZGVsLmNyZWF0ZVN0cmluZyAnJ1xyXG4gICAgICBtb2RlbC5nZXRSb290KCkuc2V0ICdjb250ZW50JywgY29udGVudFxyXG5cclxuICAgIGVycm9yID0gKGVycikgPT5cclxuICAgICAgaWYgZXJyLnR5cGUgaXMgJ1RPS0VOX1JFRlJFU0hfUkVRVUlSRUQnXHJcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgYWxlcnQgZXJyLm1lc3NhZ2VcclxuXHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgZWxzZVxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuaW5zZXJ0XHJcbiAgICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcbiAgICAgICAgcGFyZW50czogW3tpZDogaWYgbWV0YWRhdGEucGFyZW50Py5wcm92aWRlckRhdGE/LmlkPyB0aGVuIG1ldGFkYXRhLnBhcmVudC5wcm92aWRlckRhdGEuaWQgZWxzZSAncm9vdCd9XVxyXG5cclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgLT5cclxuICAgICAgaWYgZmlsZT8uaWRcclxuICAgICAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSBmaWxlLmVkaXRhYmxlXHJcbiAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhID0gaWQ6IGZpbGUuaWRcclxuICAgICAgICBnYXBpLmRyaXZlLnJlYWx0aW1lLmxvYWQgZmlsZS5pZCwgZmlsZUxvYWRlZCwgaW5pdCwgZXJyb3JcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gbG9hZCBmaWxlJ1xyXG5cclxuICBfc2F2ZVJlYWxUaW1lRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ubW9kZWxcclxuICAgICAgQF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbCBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgICBAX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWw6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpbmRleCA9IDBcclxuICAgIHJlYWxUaW1lQ29udGVudCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5jb250ZW50XHJcbiAgICBkaWZmcyA9IGpzZGlmZi5kaWZmQ2hhcnMgcmVhbFRpbWVDb250ZW50LmdldFRleHQoKSwgY29udGVudC5nZXRUZXh0KClcclxuICAgIGZvciBkaWZmIGluIGRpZmZzXHJcbiAgICAgIGlmIGRpZmYucmVtb3ZlZFxyXG4gICAgICAgIHJlYWxUaW1lQ29udGVudC5yZW1vdmVSYW5nZSBpbmRleCwgaW5kZXggKyBkaWZmLnZhbHVlLmxlbmd0aFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgZGlmZi5hZGRlZFxyXG4gICAgICAgICAgcmVhbFRpbWVDb250ZW50Lmluc2VydFN0cmluZyBpbmRleCwgZGlmZi52YWx1ZVxyXG4gICAgICAgIGluZGV4ICs9IGRpZmYuY291bnRcclxuICAgIGNhbGxiYWNrIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRDb250ZW50XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xyXG4gIEBBdmFpbGFibGU6IC0+XHJcbiAgICByZXN1bHQgPSB0cnlcclxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRlc3QsIHRlc3QpXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxyXG4gICAgICB0cnVlXHJcbiAgICBjYXRjaFxyXG4gICAgICBmYWxzZVxyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGZpbGVLZXkgPSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gZmlsZUtleSwgY29udGVudC5nZXRUZXh0KClcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgbmV3IENsb3VkQ29udGVudCB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgY2F0Y2ggZVxyXG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkOiAje2UubWVzc2FnZX1cIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBwcmVmaXggPSBAX2dldEtleSAobWV0YWRhdGE/LnBhdGgoKSBvciBbXSkuam9pbiAnLydcclxuICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcclxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcclxuICAgICAgICBbZmlsZW5hbWUsIHJlbWFpbmRlci4uLl0gPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpLnNwbGl0KCcvJylcclxuICAgICAgICBuYW1lID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxyXG4gICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgbmFtZTogbmFtZVxyXG4gICAgICAgICAgdHlwZTogaWYgcmVtYWluZGVyLmxlbmd0aCA+IDAgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgcGFyZW50OiBtZXRhZGF0YVxyXG4gICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBjYWxsYmFjaz8gbnVsbFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gZGVsZXRlJ1xyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY29udGVudCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShuZXdOYW1lKSwgY29udGVudFxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIHJlbmFtZSdcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAdHlwZSwgQHByb3ZpZGVyID0gbnVsbCwgQHBhcmVudCA9IG51bGwsIEBwcm92aWRlckRhdGE9e30sIEBvdmVyd3JpdGFibGUsIEBzaGFyZWRDb250ZW50SWQsIEBzaGFyZWRDb250ZW50U2VjcmV0S2V5fSA9IG9wdGlvbnNcclxuICBARm9sZGVyOiAnZm9sZGVyJ1xyXG4gIEBGaWxlOiAnZmlsZSdcclxuXHJcbiAgcGF0aDogLT5cclxuICAgIF9wYXRoID0gW11cclxuICAgIHBhcmVudCA9IEBwYXJlbnRcclxuICAgIHdoaWxlIHBhcmVudCBpc250IG51bGxcclxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcclxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudFxyXG4gICAgX3BhdGhcclxuXHJcbmNsYXNzIENsb3VkQ29udGVudFxyXG4gIGNvbnN0cnVjdG9yOiAoQF8gPSBudWxsLCBvcHRpb25zID0ge30pIC0+XHJcbiAgICBAZGlydHkgPSBmYWxzZVxyXG5cclxuICBnZXRDb250ZW50OiAtPiBAX1xyXG4gIGluaXRDb250ZW50OiAoY29udGVudCkgLT4gQHNldENvbnRlbnQgY29udGVudCwge2RpcnR5OiBmYWxzZX1cclxuICBzZXRDb250ZW50OiAoY29udGVudCwgb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgQF8gPSBjb250ZW50XHJcbiAgICBAZGlydHkgPSBpZiBvcHRpb25zLmhhc093blByb3BlcnR5KCdkaXJ0eScpIHRoZW4gb3B0aW9ucy5kaXJ0eSBlbHNlIHRydWVcclxuICAgIEBcclxuICBjbG9uZTogLT4gbmV3IENsb3VkQ29udGVudCBfLmNsb25lRGVlcCBAX1xyXG5cclxuICBnZXRUZXh0OiAtPiBpZiBAXyBpcyBudWxsIHRoZW4gJycgZWxzZSBpZiBpc1N0cmluZyhAXykgdGhlbiBAXyBlbHNlIEpTT04uc3RyaW5naWZ5IEBfXHJcbiAgaW5pdFRleHQ6ICh0ZXh0KSAtPiBAc2V0VGV4dCB0ZXh0LCB7ZGlydHk6IGZhbHNlfVxyXG4gIHNldFRleHQ6ICh0ZXh0LCBvcHRpb25zKSAtPiBAc2V0Q29udGVudCB0ZXh0LCBvcHRpb25zXHJcblxyXG4gIGdldEpTT046IC0+IGlmIGlzU3RyaW5nKEBfKSB0aGVuIEpTT04ucGFyc2UgQF8gZWxzZSBAX1xyXG4gIGluaXRKU09OOiAoanNvbikgLT4gQHNldEpTT04ganNvbiwge2RpcnR5OiBmYWxzZX1cclxuICBzZXRKU09OOiAoanNvbiwgb3B0aW9ucykgLT4gQHNldENvbnRlbnQgKGlmIGlzU3RyaW5nKGpzb24pIHRoZW4ganNvbiBlbHNlIEpTT04uc3RyaW5naWZ5IGpzb24pLCBvcHRpb25zXHJcblxyXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXHJcblxyXG4gIEBBdmFpbGFibGU6IC0+IHRydWVcclxuXHJcbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cclxuICAgIEBjYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuXHJcbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY2FsbGJhY2tcclxuICAgICAgY2FsbGJhY2sgdHJ1ZVxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBudWxsXHJcblxyXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcclxuXHJcbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbW92ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVuYW1lJ1xyXG5cclxuICBjbG9zZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2Nsb3NlJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIENsb3VkQ29udGVudDogQ2xvdWRDb250ZW50XHJcbiAgUHJvdmlkZXJJbnRlcmZhY2U6IFByb3ZpZGVySW50ZXJmYWNlXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRDb250ZW50XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV1cclxuICAgICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBsaXN0ID0gW11cclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2Ygc3ViVHJlZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIF9maW5kU3ViVHJlZTogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmNoaWxkcmVuXHJcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy5wYXJlbnRcclxuICAgICAgbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5jaGlsZHJlblxyXG4gICAgZWxzZVxyXG4gICAgICBAdHJlZVxyXG5cclxuICBfbG9hZFRyZWU6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIEB0cmVlIGlzbnQgbnVsbFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uXHJcbiAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvbkNhbGxiYWNrXHJcbiAgICAgIEBvcHRpb25zLmpzb25DYWxsYmFjayAoZXJyLCBqc29uKSA9PlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgY2FsbGJhY2sgZXJyXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuc3JjXHJcbiAgICAgICQuYWpheFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgICB1cmw6IEBvcHRpb25zLnNyY1xyXG4gICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PlxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgZGF0YVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgICAgICBlcnJvcjogLT4gY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBqc29uIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgZWxzZVxyXG4gICAgICBjb25zb2xlLmVycm9yPyBcIk5vIGpzb24gb3Igc3JjIG9wdGlvbiBmb3VuZCBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgICAgY2FsbGJhY2sgbnVsbCwge31cclxuXHJcbiAgX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWU6IChqc29uLCBwYXJlbnQgPSBudWxsKSAtPlxyXG4gICAgdHJlZSA9IHt9XHJcbiAgICBmb3Igb3duIGZpbGVuYW1lIG9mIGpzb25cclxuICAgICAgdHlwZSA9IGlmIGlzU3RyaW5nIGpzb25bZmlsZW5hbWVdIHRoZW4gQ2xvdWRNZXRhZGF0YS5GaWxlIGVsc2UgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgdHlwZTogdHlwZVxyXG4gICAgICAgIHBhcmVudDogcGFyZW50XHJcbiAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgICBjaGlsZHJlbjogbnVsbFxyXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmNoaWxkcmVuID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGpzb25bZmlsZW5hbWVdLCBtZXRhZGF0YVxyXG4gICAgICBjb250ZW50ID0gbmV3IENsb3VkQ29udGVudCBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5cclxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdyZW9wZW5EaWFsb2cnLCAnc2VwYXJhdG9yJywgJ3NhdmUnLCAnc2F2ZUZpbGVBc0RpYWxvZycsICdzaGFyZScsICdkb3dubG9hZERpYWxvZycsICdyZW5hbWVEaWFsb2cnXVxyXG4gIEBBdXRvU2F2ZU1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdyZW9wZW5EaWFsb2cnLCAnc2VwYXJhdG9yJywgJ3NhdmVDb3B5RGlhbG9nJywgJ3NoYXJlJywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxyXG4gICAgc2V0QWN0aW9uID0gKGFjdGlvbikgLT5cclxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXHJcblxyXG4gICAgc2V0RW5hYmxlZCA9IChhY3Rpb24pIC0+XHJcbiAgICAgIHN3aXRjaCBhY3Rpb25cclxuICAgICAgICB3aGVuICdyZW9wZW5EaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3JlbmFtZSdcclxuICAgICAgICB3aGVuICdzYXZlQ29weURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdzaGFyZSdcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5zaGFyZVByb3ZpZGVyP1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRydWVcclxuXHJcbiAgICBuYW1lcyA9XHJcbiAgICAgIG5ld0ZpbGVEaWFsb2c6IHRyIFwifk1FTlUuTkVXXCJcclxuICAgICAgb3BlbkZpbGVEaWFsb2c6IHRyIFwifk1FTlUuT1BFTlwiXHJcbiAgICAgIHJlb3BlbkRpYWxvZzogdHIgXCJ+TUVOVS5SRU9QRU5cIlxyXG4gICAgICBzYXZlOiB0ciBcIn5NRU5VLlNBVkVcIlxyXG4gICAgICBzYXZlRmlsZUFzRGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQVNcIlxyXG4gICAgICBzYXZlQ29weURpYWxvZzogdHIgXCJ+TUVOVS5TQVZFX0NPUFlcIlxyXG4gICAgICBzaGFyZTogdHIgXCJ+TUVOVS5TSEFSRVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcblxyXG4gICAgQGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtLCBpIGluIG9wdGlvbnMubWVudVxyXG4gICAgICBtZW51SXRlbSA9IGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBrZXk6IFwic2VwZXJhdG9yI3tpfVwiXHJcbiAgICAgICAgc2VwYXJhdG9yOiB0cnVlXHJcbiAgICAgIGVsc2UgaWYgaXNTdHJpbmcgaXRlbVxyXG4gICAgICAgIGtleTogaXRlbVxyXG4gICAgICAgIG5hbWU6IG9wdGlvbnMubWVudU5hbWVzP1tpdGVtXSBvciBuYW1lc1tpdGVtXSBvciBcIlVua25vd24gaXRlbTogI3tpdGVtfVwiXHJcbiAgICAgICAgZW5hYmxlZDogc2V0RW5hYmxlZCBpdGVtXHJcbiAgICAgICAgYWN0aW9uOiBzZXRBY3Rpb24gaXRlbVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBpdGVtLmtleSA9IGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBpdGVtLmVuYWJsZWQgPSBzZXRFbmFibGVkIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBpdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGl0ZW0uZW5hYmxlZCBvcj0gdHJ1ZVxyXG4gICAgICAgIGl0ZW1cclxuICAgICAgaWYgbWVudUl0ZW1cclxuICAgICAgICBAaXRlbXMucHVzaCBtZW51SXRlbVxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxyXG4gICAgQG1lbnUgPSBudWxsXHJcblxyXG4gIGluaXQ6IChvcHRpb25zKSAtPlxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgb3Ige31cclxuICAgICMgc2tpcCB0aGUgbWVudSBpZiBleHBsaWNpdHkgc2V0IHRvIG51bGwgKG1lYW5pbmcgbm8gbWVudSlcclxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcclxuICAgICAgaWYgdHlwZW9mIG9wdGlvbnMubWVudSBpcyAndW5kZWZpbmVkJ1xyXG4gICAgICAgIG9wdGlvbnMubWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XHJcblxyXG4gICMgZm9yIFJlYWN0IHRvIGxpc3RlbiBmb3IgZGlhbG9nIGNoYW5nZXNcclxuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cclxuXHJcbiAgcHJlcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncHJlcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3JlcGxhY2VNZW51SXRlbScsXHJcbiAgICAgIGtleToga2V5XHJcbiAgICAgIGl0ZW06IGl0ZW1cclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQmVmb3JlJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdpbnNlcnRNZW51SXRlbUFmdGVyJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29weURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQ29weScsICh0ciAnfkRJQUxPRy5TQVZFX0NPUFknKSwgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXHJcblxyXG4gIGRvd25sb2FkRGlhbG9nOiAoZmlsZW5hbWUsIG1pbWVUeXBlLCBjb250ZW50LCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd0Rvd25sb2FkRGlhbG9nJyxcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBtaW1lVHlwZVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dSZW5hbWVEaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIHNoYXJlVXJsRGlhbG9nOiAodXJsKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93U2hhcmVVcmxEaWFsb2cnLFxyXG4gICAgICB1cmw6IHVybFxyXG5cclxuICBfc2hvd1Byb3ZpZGVyRGlhbG9nOiAoYWN0aW9uLCB0aXRsZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXHJcbiAgICAgIGFjdGlvbjogYWN0aW9uXHJcbiAgICAgIHRpdGxlOiB0aXRsZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSU1lbnU6IENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+XHJcbiAgcmV0ID0gbnVsbFxyXG4gIGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSkuc3BsaXQoXCImXCIpLnNvbWUgKHBhaXIpIC0+XHJcbiAgICBwYWlyLnNwbGl0KFwiPVwiKVswXSBpcyBwYXJhbSBhbmQgKHJldCA9IHBhaXIuc3BsaXQoXCI9XCIpWzFdKVxyXG4gIHJldFxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuUkVPUEVOXCI6IFwiUmV2ZXJ0IHRvIHJlY2VudGx5IG9wZW5lZCBzdGF0ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5NRU5VLlNIQVJFXCI6IFwiU2hhcmVcIlxyXG4gIFwifk1FTlUuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+TUVOVS5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG5cclxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkRJQUxPRy5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifkRJQUxPRy5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxyXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwifkRJQUxPRy5TSEFSRURcIjogXCJTaGFyZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5QUk9WSURFUi5MT0NBTF9TVE9SQUdFXCI6IFwiTG9jYWwgU3RvcmFnZVwiXHJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcclxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxyXG4gIFwiflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFXCI6IFwiRG9jdW1lbnQgU3RvcmVcIlxyXG5cclxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcclxuICBcIn5GSUxFX0RJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCI6IFwiRGVsZXRlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcclxuICBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCI6IFwiTG9hZGluZy4uLlwiXHJcblxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwiflJFTkFNRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNMT1NFXCI6IFwiQ2xvc2VcIlxyXG5cclxuICBcIn5DT05GSVJNLk9QRU5fRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBvcGVuIGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLlJFT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJlb3BlbiB0aGUgZmlsZSBhbmQgcmV0dXJuIHRvIGl0cyBsYXN0IHNhdmVkIHN0YXRlP1wiXHJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxyXG50cmFuc2xhdGlvbnNbJ2VuJ10gPSByZXF1aXJlICcuL2xhbmcvZW4tdXMnXHJcbmRlZmF1bHRMYW5nID0gJ2VuJ1xyXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXHJcblxyXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxyXG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxyXG4gIHRyYW5zbGF0aW9uLnJlcGxhY2UgdmFyUmVnRXhwLCAobWF0Y2gsIGtleSkgLT5cclxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRlXHJcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcclxuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5Eb3dubG9hZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kb3dubG9hZC1kaWFsb2ctdmlldydcclxuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcclxuU2hhcmVVcmxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2hhcmUtdXJsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogLT5cclxuICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lmhhc093blByb3BlcnR5KCduYW1lJykgdGhlbiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCIpXHJcblxyXG4gIGdldFByb3ZpZGVyOiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcclxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cclxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICBzaGFyZVVybERpYWxvZzogbnVsbFxyXG4gICAgZGlydHk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5jbGllbnQubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xyXG4gICAgICAgIHttZXNzYWdlOiBcIlNhdmluZy4uLlwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuc2F2ZWRcclxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XHJcbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuZGlydHlcclxuICAgICAgICB7bWVzc2FnZTogJ1Vuc2F2ZWQnLCB0eXBlOiAnYWxlcnQnfVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgICAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcclxuICAgICAgICBmaWxlU3RhdHVzOiBmaWxlU3RhdHVzXHJcblxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ2Nvbm5lY3RlZCdcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXHJcblxyXG4gICAgQHByb3BzLmNsaWVudC5fdWkubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdzaG93UHJvdmlkZXJEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcHJvdmlkZXJEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgZG93bmxvYWREaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93UmVuYW1lRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dTaGFyZVVybERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBzaGFyZVVybERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ2FwcGVuZE1lbnVJdGVtJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdwcmVwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3JlcGxhY2VNZW51SXRlbSdcclxuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XHJcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXHJcbiAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXNbaW5kZXhdID0gZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUJlZm9yZSdcclxuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XHJcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXHJcbiAgICAgICAgICAgIGlmIGluZGV4IGlzIDBcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCwgMCwgZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUFmdGVyJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXggKyAxLCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3NldE1lbnVCYXJJbmZvJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudU9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc1xyXG5cclxuICBfZ2V0TWVudUl0ZW1JbmRleDogKGtleSkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGtleVxyXG4gICAgICBmb3IgaXRlbSwgaW5kZXggaW4gQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHJldHVybiBpbmRleCBpZiBpdGVtLmtleSBpcyBrZXlcclxuICAgICAgLTFcclxuICAgIGVsc2VcclxuICAgICAgaW5kZXggPSBwYXJzZUludCBrZXksIDEwXHJcbiAgICAgIGlmIGlzTmFOKGluZGV4KSBvciBpbmRleCA8IDAgb3IgaW5kZXggPiBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAtMVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaW5kZXhcclxuXHJcbiAgY2xvc2VEaWFsb2dzOiAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICAgIHJlbmFtZURpYWxvZzogbnVsbFxyXG4gICAgICBzaGFyZVVybERpYWxvZzogbnVsbFxyXG5cclxuICByZW5kZXJEaWFsb2dzOiAtPlxyXG4gICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgIChQcm92aWRlclRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5wcm92aWRlckRpYWxvZywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBtaW1lVHlwZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLm1pbWVUeXBlLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucmVuYW1lRGlhbG9nXHJcbiAgICAgIChSZW5hbWVEaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUucmVuYW1lRGlhbG9nLmZpbGVuYW1lLCBjYWxsYmFjazogQHN0YXRlLnJlbmFtZURpYWxvZy5jYWxsYmFjaywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxyXG4gICAgZWxzZSBpZiBAc3RhdGUuc2hhcmVVcmxEaWFsb2dcclxuICAgICAgKFNoYXJlVXJsRGlhbG9nIHt1cmw6IEBzdGF0ZS5zaGFyZVVybERpYWxvZy51cmwsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIChNZW51QmFyIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcclxuICAgICAgICAoSW5uZXJBcHAge2FwcDogQHByb3BzLmFwcH0pXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZyBvciBAc3RhdGUuZG93bmxvYWREaWFsb2dcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxyXG4gICAgICApXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXBwXHJcbiIsIkF1dGhvcml6ZU1peGluID1cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBhdXRob3JpemVkOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcclxuICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEb3dubG9hZERpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICBkb3dubG9hZDogKGUpIC0+XHJcbiAgICBpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgZS50YXJnZXQuc2V0QXR0cmlidXRlICdocmVmJywgXCJkYXRhOiN7QHByb3BzLm1pbWVUeXBlfSwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudC5nZXRUZXh0KCkpfVwiXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2Rvd25sb2FkLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGEge2hyZWY6ICcjJywgY2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIGRvd25sb2FkOiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLCBvbkNsaWNrOiBAZG93bmxvYWR9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRCcpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCB1bCwgbGksIHN2ZywgZywgcmVjdH0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcclxuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gICAgY2xhc3NlcyA9IFsnbWVudUl0ZW0nXVxyXG4gICAgaWYgQHByb3BzLml0ZW0uc2VwYXJhdG9yXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xyXG4gICAgICAobGkge2NsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyl9LCAnJylcclxuICAgIGVsc2VcclxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3IgKEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIG5vdCBAcHJvcHMuaXRlbS5hY3Rpb24pXHJcbiAgICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXHJcbiAgICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxyXG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXHJcbiAgICBvblNlbGVjdDogKGl0ZW0pIC0+ICAgICAgICAgICAgICMgSWYgbm90LCBAcHJvcHMub25TZWxlY3QgaXMgY2FsbGVkXHJcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGlmIEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIGl0ZW0uYWN0aW9uXHJcbiAgICAgIGl0ZW0uYWN0aW9uKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLm9uU2VsZWN0IGl0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxyXG4gICAgICAgIChzdmcge3ZlcnNpb246ICcxLjEnLCB3aWR0aDogMTYsIGhlaWdodDogMTYsIHZpZXdCb3g6ICcwIDAgMTYgMTYnLCBlbmFibGVCYWNrZ3JvdW5kOiAnbmV3IDAgMCAxNiAxNid9LFxyXG4gICAgICAgICAgKGcge30sXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiA3LCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAxMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcclxuICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBpc0FjdGlvbk1lbnU6IEBwcm9wcy5pc0FjdGlvbk1lbnV9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sXHJcbiAgICAgIChSZWFjdC5ET00uaSB7Y2xhc3NOYW1lOiBpZiBAcHJvcHMubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlciB0aGVuICdpY29uLWluc3BlY3RvckFycm93LWNvbGxhcHNlJyBlbHNlICdpY29uLW5vdGVUb29sJ30pXHJcbiAgICAgIEBwcm9wcy5tZXRhZGF0YS5uYW1lXHJcbiAgICApXHJcblxyXG5GaWxlTGlzdCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkaW5nOiB0cnVlXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGxvYWQgQHByb3BzLmZvbGRlclxyXG5cclxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxyXG4gICAgaWYgbmV4dFByb3BzLmZvbGRlciBpc250IEBwcm9wcy5mb2xkZXJcclxuICAgICAgQGxvYWQgbmV4dFByb3BzLmZvbGRlclxyXG5cclxuICBsb2FkOiAoZm9sZGVyKSAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmxpc3QgZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxyXG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxyXG5cclxuICBwYXJlbnRTZWxlY3RlZDogKGUpIC0+XHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5mb2xkZXI/LnBhcmVudFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgIGlmIEBwcm9wcy5mb2xkZXIgaXNudCBudWxsXHJcbiAgICAgIGxpc3QucHVzaCAoZGl2IHtrZXk6ICdwYXJlbnQnLCBvbkNsaWNrOiBAcGFyZW50U2VsZWN0ZWR9LCAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogJ2ljb24tcGFsZXR0ZUFycm93LWNvbGxhcHNlJ30pLCAnUGFyZW50IEZvbGRlcicpXHJcbiAgICBmb3IgbWV0YWRhdGEsIGkgaW4gQHByb3BzLmxpc3RcclxuICAgICAgbGlzdC5wdXNoIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZmlsZWxpc3QnfSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcclxuICAgICAgICB0ciBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGxpc3RcclxuICAgIClcclxuXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZURpYWxvZ1RhYidcclxuXHJcbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIEBnZXRTdGF0ZUZvckZvbGRlciBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAaXNPcGVuID0gQHByb3BzLmRpYWxvZy5hY3Rpb24gaXMgJ29wZW5GaWxlJ1xyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxyXG4gICAgbWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgbGlzdDogbGlzdFxyXG4gICAgICBtZXRhZGF0YTogQGZpbmRNZXRhZGF0YSAkLnRyaW0oQHN0YXRlLmZpbGVuYW1lKSwgbGlzdFxyXG5cclxuICBnZXRTdGF0ZUZvckZvbGRlcjogKGZvbGRlcikgLT5cclxuICAgIGZvbGRlcjogZm9sZGVyXHJcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcclxuICAgIGxpc3Q6IFtdXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgQHNldFN0YXRlIEBnZXRTdGF0ZUZvckZvbGRlciBtZXRhZGF0YVxyXG4gICAgZWxzZSBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNldFN0YXRlIEBnZXRTdGF0ZUZvckZvbGRlciBudWxsXHJcblxyXG4gIGNvbmZpcm06IC0+XHJcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGZpbGVuYW1lID0gJC50cmltIEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxyXG4gICAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgaWYgQGlzT3BlblxyXG4gICAgICAgICAgYWxlcnQgXCIje0BzdGF0ZS5maWxlbmFtZX0gbm90IGZvdW5kXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcGFyZW50OiBAc3RhdGUuZm9sZGVyIG9yIG51bGxcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICMgZW5zdXJlIHRoZSBtZXRhZGF0YSBwcm92aWRlciBpcyB0aGUgY3VycmVudGx5LXNob3dpbmcgdGFiXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrPyBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgcmVtb3ZlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhIGFuZCBAc3RhdGUubWV0YWRhdGEudHlwZSBpc250IENsb3VkTWV0YWRhdGEuRm9sZGVyIGFuZCBjb25maXJtKHRyKFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCIsIHtmaWxlbmFtZTogQHN0YXRlLm1ldGFkYXRhLm5hbWV9KSlcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgaWYgbm90IGVyclxyXG4gICAgICAgICAgbGlzdCA9IEBzdGF0ZS5saXN0LnNsaWNlIDBcclxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgbGlzdC5zcGxpY2UgaW5kZXgsIDFcclxuICAgICAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgICAgICBsaXN0OiBsaXN0XHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnJ1xyXG5cclxuICBjYW5jZWw6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICBmaW5kTWV0YWRhdGE6IChmaWxlbmFtZSwgbGlzdCkgLT5cclxuICAgIGZvciBtZXRhZGF0YSBpbiBsaXN0XHJcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcclxuICAgICAgICByZXR1cm4gbWV0YWRhdGFcclxuICAgIG51bGxcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTMgYW5kIG5vdCBAY29uZmlybURpc2FibGVkKClcclxuICAgICAgQGNvbmZpcm0oKVxyXG5cclxuICBjb25maXJtRGlzYWJsZWQ6IC0+XHJcbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcclxuXHJcbiAgcmVuZGVyV2hlbkF1dGhvcml6ZWQ6IC0+XHJcbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcclxuICAgIHJlbW92ZURpc2FibGVkID0gKEBzdGF0ZS5tZXRhZGF0YSBpcyBudWxsKSBvciAoQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIpXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXHJcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgIChGaWxlTGlzdCB7cHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlciwgZm9sZGVyOiBAc3RhdGUuZm9sZGVyLCBzZWxlY3RlZEZpbGU6IEBzdGF0ZS5tZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAY29uZmlybSwgbGlzdDogQHN0YXRlLmxpc3QsIGxpc3RMb2FkZWQ6IEBsaXN0TG9hZGVkfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogY29uZmlybURpc2FibGVkLCBjbGFzc05hbWU6IGlmIGNvbmZpcm1EaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlci5jYW4gJ3JlbW92ZSdcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNhbmNlbH0sICh0ciBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIikpXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZURpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCBpbnB1dH0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Ryb3Bkb3duLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5maWxlbmFtZVxyXG5cclxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxyXG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBuZXh0UHJvcHMuZmlsZW5hbWVcclxuXHJcbiAgZmlsZW5hbWVDbGlja2VkOiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgaWYgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAncmVuYW1lJ1xyXG4gICAgICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IHRydWVcclxuICAgICAgICBzZXRUaW1lb3V0ICg9PiBAZm9jdXNGaWxlbmFtZSgpKSwgMTBcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBwcm9wcy5jbGllbnQuc2F2ZUZpbGVEaWFsb2coKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IC0+XHJcbiAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IEBmaWxlbmFtZSgpLnZhbHVlXHJcblxyXG4gIGZpbGVuYW1lQmx1cnJlZDogLT5cclxuICAgIEByZW5hbWUoKVxyXG5cclxuICBmaWxlbmFtZTogLT5cclxuICAgIFJlYWN0LmZpbmRET01Ob2RlKEByZWZzLmZpbGVuYW1lKVxyXG5cclxuICBmb2N1c0ZpbGVuYW1lOiAtPlxyXG4gICAgZWwgPSBAZmlsZW5hbWUoKVxyXG4gICAgZWwuZm9jdXMoKVxyXG4gICAgaWYgdHlwZW9mIGVsLnNlbGVjdGlvblN0YXJ0IGlzICdudW1iZXInXHJcbiAgICAgIGVsLnNlbGVjdGlvblN0YXJ0ID0gZWwuc2VsZWN0aW9uRW5kID0gZWwudmFsdWUubGVuZ3RoXHJcbiAgICBlbHNlIGlmIHR5cGVvZiBlbC5jcmVhdGVUZXh0UmFuZ2UgaXNudCAndW5kZWZpbmVkJ1xyXG4gICAgICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpXHJcbiAgICAgIHJhbmdlLmNvbGxhcHNlIGZhbHNlXHJcbiAgICAgIHJhbmdlLnNlbGVjdCgpXHJcblxyXG4gIHJlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHN0YXRlLmZpbGVuYW1lLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuICAgIGlmIGZpbGVuYW1lLmxlbmd0aCA+IDBcclxuICAgICAgQHByb3BzLmNsaWVudC5yZW5hbWUgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YSwgZmlsZW5hbWVcclxuICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzXHJcbiAgICAgIEByZW5hbWUoKVxyXG4gICAgZWxzZSBpZiBlLmtleUNvZGUgaXMgMjdcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IEBwcm9wcy5maWxlbmFtZVxyXG4gICAgICAgIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge2l0ZW1zOiBAcHJvcHMuaXRlbXN9KVxyXG4gICAgICAgIGlmIEBzdGF0ZS5lZGl0aW5nRmlsZW5hbWVcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9LFxyXG4gICAgICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uQmx1cjogQGZpbGVuYW1lQmx1cnJlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJywgb25DbGljazogQGZpbGVuYW1lQ2xpY2tlZH0sIEBzdGF0ZS5maWxlbmFtZSlcclxuICAgICAgICBpZiBAcHJvcHMuZmlsZVN0YXR1c1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogXCJtZW51LWJhci1maWxlLXN0YXR1cy0je0Bwcm9wcy5maWxlU3RhdHVzLnR5cGV9XCJ9LCBAcHJvcHMuZmlsZVN0YXR1cy5tZXNzYWdlKVxyXG4gICAgICApXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLXJpZ2h0J30sXHJcbiAgICAgICAgaWYgQHByb3BzLm9wdGlvbnMuaW5mb1xyXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIgYW5kIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkKClcclxuICAgICAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJVc2VyKClcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXHJcbiAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlQ29weScsICdzYXZlRmlsZUNvcHknIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBjb21wb25lbnQgPSBUYWJDb21wb25lbnRcclxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxyXG4gICAgICAgICAgZGlhbG9nOiBAcHJvcHMuZGlhbG9nXHJcbiAgICAgICAgICBjbG9zZTogQHByb3BzLmNsb3NlXHJcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICB0YWJzLnB1c2ggVGFiYmVkUGFuZWwuVGFiIHtrZXk6IGksIGxhYmVsOiAodHIgcHJvdmlkZXIuZGlzcGxheU5hbWUpLCBjb21wb25lbnQ6IGNvbXBvbmVudH1cclxuICAgICAgICBpZiBwcm92aWRlciBpcyBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdSZW5hbWVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgcmVuYW1lOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2FsbGJhY2s/IEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlJFTkFNRScpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcclxuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdTaGFyZVVybERpYWxvZ1ZpZXcnXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgUmVhY3QuZmluZERPTU5vZGUoQHJlZnMudXJsKT8uc2VsZWN0KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlNIQVJFRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc2hhcmUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICd1cmwnLCB2YWx1ZTogQHByb3BzLnVybH0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35TSEFSRV9ESUFMT0cuQ0xPU0UnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXHJcblxyXG5jbGFzcyBUYWJJbmZvXHJcbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cclxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcclxuXHJcblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFRhYidcclxuXHJcbiAgY2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXHJcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4IG9yIDBcclxuXHJcbiAgc3RhdGljczpcclxuICAgIFRhYjogKHNldHRpbmdzKSAtPiBuZXcgVGFiSW5mbyBzZXR0aW5nc1xyXG5cclxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxyXG4gICAgQHNldFN0YXRlIHNlbGVjdGVkVGFiSW5kZXg6IGluZGV4XHJcblxyXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XHJcbiAgICAoVGFiXHJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcclxuICAgICAga2V5OiBpbmRleFxyXG4gICAgICBpbmRleDogaW5kZXhcclxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcclxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclRhYnM6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFicyd9LFxyXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYi1jb21wb25lbnQnfSxcclxuICAgICAgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnNcclxuICAgICAgICAoZGl2IHtcclxuICAgICAgICAgIGtleTogaW5kZXhcclxuICAgICAgICAgIHN0eWxlOlxyXG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0YWIuY29tcG9uZW50XHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogXCJ0YWJiZWQtcGFuZWxcIn0sXHJcbiAgICAgIEByZW5kZXJUYWJzKClcclxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxyXG4gICAgKVxyXG4iXX0=
