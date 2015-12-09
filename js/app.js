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



},{"./client":31,"./ui":37,"./utils/get-query-param":39,"./views/app-view":43}],2:[function(require,module,exports){
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



},{"./providers/document-store-provider":32,"./providers/google-drive-provider":33,"./providers/localstorage-provider":34,"./providers/provider-interface":35,"./providers/readonly-provider":36,"./ui":37,"./utils/is-string":40,"./utils/translate":42}],32:[function(require,module,exports){
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, clean, cloudContentFactory, div, documentStore, isString, jiff, listUrl, loadDocumentUrl, patchDocumentUrl, ref, removeDocumentUrl, renameDocumentUrl, saveDocumentUrl, span, tr,
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

clean = require('../utils/clean-object');

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
      [obj1, obj2].map(clean);
      diff = jiff.diff(obj1, obj2, opts);
      return diff;
    } catch (error) {
      return null;
    }
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/clean-object":38,"../utils/is-string":40,"../utils/translate":42,"./provider-interface":35,"jiff":17}],33:[function(require,module,exports){
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



},{"../utils/is-string":40,"../utils/translate":42,"./provider-interface":35,"diff":11}],34:[function(require,module,exports){
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



},{"../utils/translate":42,"./provider-interface":35}],35:[function(require,module,exports){
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



},{"../utils/is-string":40}],36:[function(require,module,exports){
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



},{"../utils/is-string":40,"../utils/translate":42,"./provider-interface":35}],37:[function(require,module,exports){
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



},{"./utils/is-string":40,"./utils/translate":42}],38:[function(require,module,exports){
var clean,
  hasProp = {}.hasOwnProperty;

clean = function(obj) {
  var key, results;
  results = [];
  for (key in obj) {
    if (!hasProp.call(obj, key)) continue;
    if (obj[key] == null) {
      results.push(delete obj[key]);
    } else if (obj[key] instanceof Object) {
      results.push(clean(obj[key]));
    } else {
      results.push(void 0);
    }
  }
  return results;
};

module.exports = clean;



},{}],39:[function(require,module,exports){
module.exports = function(param) {
  var ret;
  ret = null;
  location.search.substr(1).split("&").some(function(pair) {
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



},{"../providers/provider-interface":35,"../utils/translate":42,"./authorize-mixin":44}],49:[function(require,module,exports){
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



},{"./dropdown-view":47}],50:[function(require,module,exports){
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



},{"../providers/provider-interface":35,"../utils/translate":42,"./file-dialog-tab-view":48,"./modal-tabbed-dialog-view":51,"./select-provider-dialog-tab-view":55,"./tabbed-panel-view":57}],54:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL2NsaWVudC5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3VpLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2NsZWFuLW9iamVjdC5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy9nZXQtcXVlcnktcGFyYW0uY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvaXMtc3RyaW5nLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2xhbmcvZW4tdXMuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvdHJhbnNsYXRlLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2FwcC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2F1dGhvcml6ZS1taXhpbi5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9ibG9ja2luZy1tb2RhbC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2Rvd25sb2FkLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2Ryb3Bkb3duLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbWVudS1iYXItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvcmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3Mvc2hhcmUtdXJsLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3RhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxrQkFBUixDQUFwQjs7QUFFVixzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFDMUMsc0JBQUEsR0FB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QztDQUNqQjs7OztBQ1pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEEsSUFBQSw0TUFB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LFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXG5cbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG5cbmdldFF1ZXJ5UGFyYW0gPSByZXF1aXJlICcuL3V0aWxzL2dldC1xdWVyeS1wYXJhbSdcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICAjIHNpbmNlIHRoZSBtb2R1bGUgZXhwb3J0cyBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgd2UgbmVlZCB0byBmYWtlIGEgY2xhc3MgdmFyaWFibGUgYXMgYW4gaW5zdGFuY2UgdmFyaWFibGVcbiAgICBARGVmYXVsdE1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XG5cbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxuICAgIEBhcHBPcHRpb25zID0ge31cblxuICBpbml0OiAoQGFwcE9wdGlvbnMsIHVzaW5nSWZyYW1lID0gZmFsc2UpIC0+XG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBAYXBwT3B0aW9uc1xuXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcbiAgICBAY2xpZW50Lmxpc3RlbiBldmVudENhbGxiYWNrXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxuXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcbiAgICBAY2xpZW50LmNvbm5lY3QoKVxuXG4gICAgb3BlblNoYXJlZENvbnRlbnRJZCA9IGdldFF1ZXJ5UGFyYW0gXCJvcGVuU2hhcmVkXCJcbiAgICBvcGVuU2F2ZWRQYXJhbXMgPSBnZXRRdWVyeVBhcmFtIFwib3BlblNhdmVkXCJcbiAgICBpZiBvcGVuU2hhcmVkQ29udGVudElkXG4gICAgICBAY2xpZW50Lm9wZW5TaGFyZWRDb250ZW50IG9wZW5TaGFyZWRDb250ZW50SWRcbiAgICBlbHNlIGlmIG9wZW5TYXZlZFBhcmFtc1xuICAgICAgQGNsaWVudC5vcGVuU2F2ZWQgb3BlblNhdmVkUGFyYW1zXG5cbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXG5cbiAgX3JlbmRlckFwcDogKGFuY2hvcikgLT5cbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxuIiwiLy8gU2VlOiBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvZ29vZ2xlLWRpZmYtbWF0Y2gtcGF0Y2gvd2lraS9BUElcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvRE1QKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdLFxuICAgICAgY2hhbmdlLFxuICAgICAgb3BlcmF0aW9uO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIG9wZXJhdGlvbiA9IDE7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgb3BlcmF0aW9uID0gLTE7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wZXJhdGlvbiA9IDA7XG4gICAgfVxuXG4gICAgcmV0LnB1c2goW29wZXJhdGlvbiwgY2hhbmdlLnZhbHVlXSk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cbiIsImV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0Q2hhbmdlc1RvWE1MKGNoYW5nZXMpIHtcbiAgbGV0IHJldCA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGNoYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgY2hhbmdlID0gY2hhbmdlc1tpXTtcbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPGlucz4nKTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICByZXQucHVzaCgnPGRlbD4nKTtcbiAgICB9XG5cbiAgICByZXQucHVzaChlc2NhcGVIVE1MKGNoYW5nZS52YWx1ZSkpO1xuXG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgcmV0LnB1c2goJzwvaW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8L2RlbD4nKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlSFRNTChzKSB7XG4gIGxldCBuID0gcztcbiAgbiA9IG4ucmVwbGFjZSgvJi9nLCAnJmFtcDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvPC9nLCAnJmx0OycpO1xuICBuID0gbi5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcblxuICByZXR1cm4gbjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIERpZmYoKSB7fVxuXG5EaWZmLnByb3RvdHlwZSA9IHtcbiAgZGlmZihvbGRTdHJpbmcsIG5ld1N0cmluZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGNhbGxiYWNrID0gb3B0aW9ucy5jYWxsYmFjaztcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIGRvbmUodmFsdWUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayh1bmRlZmluZWQsIHZhbHVlKTsgfSwgMCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbG93IHN1YmNsYXNzZXMgdG8gbWFzc2FnZSB0aGUgaW5wdXQgcHJpb3IgdG8gcnVubmluZ1xuICAgIG9sZFN0cmluZyA9IHRoaXMuY2FzdElucHV0KG9sZFN0cmluZyk7XG4gICAgbmV3U3RyaW5nID0gdGhpcy5jYXN0SW5wdXQobmV3U3RyaW5nKTtcblxuICAgIG9sZFN0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShvbGRTdHJpbmcpKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLnJlbW92ZUVtcHR5KHRoaXMudG9rZW5pemUobmV3U3RyaW5nKSk7XG5cbiAgICBsZXQgbmV3TGVuID0gbmV3U3RyaW5nLmxlbmd0aCwgb2xkTGVuID0gb2xkU3RyaW5nLmxlbmd0aDtcbiAgICBsZXQgZWRpdExlbmd0aCA9IDE7XG4gICAgbGV0IG1heEVkaXRMZW5ndGggPSBuZXdMZW4gKyBvbGRMZW47XG4gICAgbGV0IGJlc3RQYXRoID0gW3sgbmV3UG9zOiAtMSwgY29tcG9uZW50czogW10gfV07XG5cbiAgICAvLyBTZWVkIGVkaXRMZW5ndGggPSAwLCBpLmUuIHRoZSBjb250ZW50IHN0YXJ0cyB3aXRoIHRoZSBzYW1lIHZhbHVlc1xuICAgIGxldCBvbGRQb3MgPSB0aGlzLmV4dHJhY3RDb21tb24oYmVzdFBhdGhbMF0sIG5ld1N0cmluZywgb2xkU3RyaW5nLCAwKTtcbiAgICBpZiAoYmVzdFBhdGhbMF0ubmV3UG9zICsgMSA+PSBuZXdMZW4gJiYgb2xkUG9zICsgMSA+PSBvbGRMZW4pIHtcbiAgICAgIC8vIElkZW50aXR5IHBlciB0aGUgZXF1YWxpdHkgYW5kIHRva2VuaXplclxuICAgICAgcmV0dXJuIGRvbmUoW3t2YWx1ZTogbmV3U3RyaW5nLmpvaW4oJycpLCBjb3VudDogbmV3U3RyaW5nLmxlbmd0aH1dKTtcbiAgICB9XG5cbiAgICAvLyBNYWluIHdvcmtlciBtZXRob2QuIGNoZWNrcyBhbGwgcGVybXV0YXRpb25zIG9mIGEgZ2l2ZW4gZWRpdCBsZW5ndGggZm9yIGFjY2VwdGFuY2UuXG4gICAgZnVuY3Rpb24gZXhlY0VkaXRMZW5ndGgoKSB7XG4gICAgICBmb3IgKGxldCBkaWFnb25hbFBhdGggPSAtMSAqIGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCA8PSBlZGl0TGVuZ3RoOyBkaWFnb25hbFBhdGggKz0gMikge1xuICAgICAgICBsZXQgYmFzZVBhdGg7XG4gICAgICAgIGxldCBhZGRQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoIC0gMV0sXG4gICAgICAgICAgICByZW1vdmVQYXRoID0gYmVzdFBhdGhbZGlhZ29uYWxQYXRoICsgMV0sXG4gICAgICAgICAgICBvbGRQb3MgPSAocmVtb3ZlUGF0aCA/IHJlbW92ZVBhdGgubmV3UG9zIDogMCkgLSBkaWFnb25hbFBhdGg7XG4gICAgICAgIGlmIChhZGRQYXRoKSB7XG4gICAgICAgICAgLy8gTm8gb25lIGVsc2UgaXMgZ29pbmcgdG8gYXR0ZW1wdCB0byB1c2UgdGhpcyB2YWx1ZSwgY2xlYXIgaXRcbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjYW5BZGQgPSBhZGRQYXRoICYmIGFkZFBhdGgubmV3UG9zICsgMSA8IG5ld0xlbixcbiAgICAgICAgICAgIGNhblJlbW92ZSA9IHJlbW92ZVBhdGggJiYgMCA8PSBvbGRQb3MgJiYgb2xkUG9zIDwgb2xkTGVuO1xuICAgICAgICBpZiAoIWNhbkFkZCAmJiAhY2FuUmVtb3ZlKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyBwYXRoIGlzIGEgdGVybWluYWwgdGhlbiBwcnVuZVxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWxlY3QgdGhlIGRpYWdvbmFsIHRoYXQgd2Ugd2FudCB0byBicmFuY2ggZnJvbS4gV2Ugc2VsZWN0IHRoZSBwcmlvclxuICAgICAgICAvLyBwYXRoIHdob3NlIHBvc2l0aW9uIGluIHRoZSBuZXcgc3RyaW5nIGlzIHRoZSBmYXJ0aGVzdCBmcm9tIHRoZSBvcmlnaW5cbiAgICAgICAgLy8gYW5kIGRvZXMgbm90IHBhc3MgdGhlIGJvdW5kcyBvZiB0aGUgZGlmZiBncmFwaFxuICAgICAgICBpZiAoIWNhbkFkZCB8fCAoY2FuUmVtb3ZlICYmIGFkZFBhdGgubmV3UG9zIDwgcmVtb3ZlUGF0aC5uZXdQb3MpKSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBjbG9uZVBhdGgocmVtb3ZlUGF0aCk7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmFzZVBhdGggPSBhZGRQYXRoOyAgIC8vIE5vIG5lZWQgdG8gY2xvbmUsIHdlJ3ZlIHB1bGxlZCBpdCBmcm9tIHRoZSBsaXN0XG4gICAgICAgICAgYmFzZVBhdGgubmV3UG9zKys7XG4gICAgICAgICAgc2VsZi5wdXNoQ29tcG9uZW50KGJhc2VQYXRoLmNvbXBvbmVudHMsIHRydWUsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cblxuICAgICAgICBvbGRQb3MgPSBzZWxmLmV4dHJhY3RDb21tb24oYmFzZVBhdGgsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBkaWFnb25hbFBhdGgpO1xuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgaGl0IHRoZSBlbmQgb2YgYm90aCBzdHJpbmdzLCB0aGVuIHdlIGFyZSBkb25lXG4gICAgICAgIGlmIChiYXNlUGF0aC5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgICAgIHJldHVybiBkb25lKGJ1aWxkVmFsdWVzKHNlbGYsIGJhc2VQYXRoLmNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCBzZWxmLnVzZUxvbmdlc3RUb2tlbikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSB0cmFjayB0aGlzIHBhdGggYXMgYSBwb3RlbnRpYWwgY2FuZGlkYXRlIGFuZCBjb250aW51ZS5cbiAgICAgICAgICBiZXN0UGF0aFtkaWFnb25hbFBhdGhdID0gYmFzZVBhdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZWRpdExlbmd0aCsrO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm1zIHRoZSBsZW5ndGggb2YgZWRpdCBpdGVyYXRpb24uIElzIGEgYml0IGZ1Z2x5IGFzIHRoaXMgaGFzIHRvIHN1cHBvcnQgdGhlXG4gICAgLy8gc3luYyBhbmQgYXN5bmMgbW9kZSB3aGljaCBpcyBuZXZlciBmdW4uIExvb3BzIG92ZXIgZXhlY0VkaXRMZW5ndGggdW50aWwgYSB2YWx1ZVxuICAgIC8vIGlzIHByb2R1Y2VkLlxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgKGZ1bmN0aW9uIGV4ZWMoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gVGhpcyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IHdlIHdhbnQgdG8gYmUgc2FmZS5cbiAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgICAgICAgIGlmIChlZGl0TGVuZ3RoID4gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFleGVjRWRpdExlbmd0aCgpKSB7XG4gICAgICAgICAgICBleGVjKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcbiAgICAgIH0oKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoaWxlIChlZGl0TGVuZ3RoIDw9IG1heEVkaXRMZW5ndGgpIHtcbiAgICAgICAgbGV0IHJldCA9IGV4ZWNFZGl0TGVuZ3RoKCk7XG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHB1c2hDb21wb25lbnQoY29tcG9uZW50cywgYWRkZWQsIHJlbW92ZWQpIHtcbiAgICBsZXQgbGFzdCA9IGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdCAmJiBsYXN0LmFkZGVkID09PSBhZGRlZCAmJiBsYXN0LnJlbW92ZWQgPT09IHJlbW92ZWQpIHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gY2xvbmUgaGVyZSBhcyB0aGUgY29tcG9uZW50IGNsb25lIG9wZXJhdGlvbiBpcyBqdXN0XG4gICAgICAvLyBhcyBzaGFsbG93IGFycmF5IGNsb25lXG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudHMubGVuZ3RoIC0gMV0gPSB7Y291bnQ6IGxhc3QuY291bnQgKyAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50cy5wdXNoKHtjb3VudDogMSwgYWRkZWQ6IGFkZGVkLCByZW1vdmVkOiByZW1vdmVkIH0pO1xuICAgIH1cbiAgfSxcbiAgZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCkge1xuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLFxuICAgICAgICBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoLFxuICAgICAgICBuZXdQb3MgPSBiYXNlUGF0aC5uZXdQb3MsXG4gICAgICAgIG9sZFBvcyA9IG5ld1BvcyAtIGRpYWdvbmFsUGF0aCxcblxuICAgICAgICBjb21tb25Db3VudCA9IDA7XG4gICAgd2hpbGUgKG5ld1BvcyArIDEgPCBuZXdMZW4gJiYgb2xkUG9zICsgMSA8IG9sZExlbiAmJiB0aGlzLmVxdWFscyhuZXdTdHJpbmdbbmV3UG9zICsgMV0sIG9sZFN0cmluZ1tvbGRQb3MgKyAxXSkpIHtcbiAgICAgIG5ld1BvcysrO1xuICAgICAgb2xkUG9zKys7XG4gICAgICBjb21tb25Db3VudCsrO1xuICAgIH1cblxuICAgIGlmIChjb21tb25Db3VudCkge1xuICAgICAgYmFzZVBhdGguY29tcG9uZW50cy5wdXNoKHtjb3VudDogY29tbW9uQ291bnR9KTtcbiAgICB9XG5cbiAgICBiYXNlUGF0aC5uZXdQb3MgPSBuZXdQb3M7XG4gICAgcmV0dXJuIG9sZFBvcztcbiAgfSxcblxuICBlcXVhbHMobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XG4gIH0sXG4gIHJlbW92ZUVtcHR5KGFycmF5KSB7XG4gICAgbGV0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJheVtpXSkge1xuICAgICAgICByZXQucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGNhc3RJbnB1dCh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgdG9rZW5pemUodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUuc3BsaXQoJycpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBidWlsZFZhbHVlcyhkaWZmLCBjb21wb25lbnRzLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgdXNlTG9uZ2VzdFRva2VuKSB7XG4gIGxldCBjb21wb25lbnRQb3MgPSAwLFxuICAgICAgY29tcG9uZW50TGVuID0gY29tcG9uZW50cy5sZW5ndGgsXG4gICAgICBuZXdQb3MgPSAwLFxuICAgICAgb2xkUG9zID0gMDtcblxuICBmb3IgKDsgY29tcG9uZW50UG9zIDwgY29tcG9uZW50TGVuOyBjb21wb25lbnRQb3MrKykge1xuICAgIGxldCBjb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgaWYgKCFjb21wb25lbnQucmVtb3ZlZCkge1xuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQgJiYgdXNlTG9uZ2VzdFRva2VuKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCk7XG4gICAgICAgIHZhbHVlID0gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlLCBpKSB7XG4gICAgICAgICAgbGV0IG9sZFZhbHVlID0gb2xkU3RyaW5nW29sZFBvcyArIGldO1xuICAgICAgICAgIHJldHVybiBvbGRWYWx1ZS5sZW5ndGggPiB2YWx1ZS5sZW5ndGggPyBvbGRWYWx1ZSA6IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb21wb25lbnQudmFsdWUgPSB2YWx1ZS5qb2luKCcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IG5ld1N0cmluZy5zbGljZShuZXdQb3MsIG5ld1BvcyArIGNvbXBvbmVudC5jb3VudCkuam9pbignJyk7XG4gICAgICB9XG4gICAgICBuZXdQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuXG4gICAgICAvLyBDb21tb24gY2FzZVxuICAgICAgaWYgKCFjb21wb25lbnQuYWRkZWQpIHtcbiAgICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29tcG9uZW50LnZhbHVlID0gb2xkU3RyaW5nLnNsaWNlKG9sZFBvcywgb2xkUG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIG9sZFBvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIFJldmVyc2UgYWRkIGFuZCByZW1vdmUgc28gcmVtb3ZlcyBhcmUgb3V0cHV0IGZpcnN0IHRvIG1hdGNoIGNvbW1vbiBjb252ZW50aW9uXG4gICAgICAvLyBUaGUgZGlmZmluZyBhbGdvcml0aG0gaXMgdGllZCB0byBhZGQgdGhlbiByZW1vdmUgb3V0cHV0IGFuZCB0aGlzIGlzIHRoZSBzaW1wbGVzdFxuICAgICAgLy8gcm91dGUgdG8gZ2V0IHRoZSBkZXNpcmVkIG91dHB1dCB3aXRoIG1pbmltYWwgb3ZlcmhlYWQuXG4gICAgICBpZiAoY29tcG9uZW50UG9zICYmIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0uYWRkZWQpIHtcbiAgICAgICAgbGV0IHRtcCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV07XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zIC0gMV0gPSBjb21wb25lbnRzW2NvbXBvbmVudFBvc107XG4gICAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50UG9zXSA9IHRtcDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTcGVjaWFsIGNhc2UgaGFuZGxlIGZvciB3aGVuIG9uZSB0ZXJtaW5hbCBpcyBpZ25vcmVkLiBGb3IgdGhpcyBjYXNlIHdlIG1lcmdlIHRoZVxuICAvLyB0ZXJtaW5hbCBpbnRvIHRoZSBwcmlvciBzdHJpbmcgYW5kIGRyb3AgdGhlIGNoYW5nZS5cbiAgbGV0IGxhc3RDb21wb25lbnQgPSBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDFdO1xuICBpZiAoKGxhc3RDb21wb25lbnQuYWRkZWQgfHwgbGFzdENvbXBvbmVudC5yZW1vdmVkKSAmJiBkaWZmLmVxdWFscygnJywgbGFzdENvbXBvbmVudC52YWx1ZSkpIHtcbiAgICBjb21wb25lbnRzW2NvbXBvbmVudExlbiAtIDJdLnZhbHVlICs9IGxhc3RDb21wb25lbnQudmFsdWU7XG4gICAgY29tcG9uZW50cy5wb3AoKTtcbiAgfVxuXG4gIHJldHVybiBjb21wb25lbnRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZVBhdGgocGF0aCkge1xuICByZXR1cm4geyBuZXdQb3M6IHBhdGgubmV3UG9zLCBjb21wb25lbnRzOiBwYXRoLmNvbXBvbmVudHMuc2xpY2UoMCkgfTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBjb25zdCBjaGFyYWN0ZXJEaWZmID0gbmV3IERpZmYoKTtcbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ2hhcnMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjaGFyYWN0ZXJEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNzc0RpZmYgPSBuZXcgRGlmZigpO1xuY3NzRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFt7fTo7LF18XFxzKykvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmQ3NzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gY3NzRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2xpbmVEaWZmfSBmcm9tICcuL2xpbmUnO1xuXG5jb25zdCBvYmplY3RQcm90b3R5cGVUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cblxuZXhwb3J0IGNvbnN0IGpzb25EaWZmID0gbmV3IERpZmYoKTtcbi8vIERpc2NyaW1pbmF0ZSBiZXR3ZWVuIHR3byBsaW5lcyBvZiBwcmV0dHktcHJpbnRlZCwgc2VyaWFsaXplZCBKU09OIHdoZXJlIG9uZSBvZiB0aGVtIGhhcyBhXG4vLyBkYW5nbGluZyBjb21tYSBhbmQgdGhlIG90aGVyIGRvZXNuJ3QuIFR1cm5zIG91dCBpbmNsdWRpbmcgdGhlIGRhbmdsaW5nIGNvbW1hIHlpZWxkcyB0aGUgbmljZXN0IG91dHB1dDpcbmpzb25EaWZmLnVzZUxvbmdlc3RUb2tlbiA9IHRydWU7XG5cbmpzb25EaWZmLnRva2VuaXplID0gbGluZURpZmYudG9rZW5pemU7XG5qc29uRGlmZi5jYXN0SW5wdXQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogSlNPTi5zdHJpbmdpZnkoY2Fub25pY2FsaXplKHZhbHVlKSwgdW5kZWZpbmVkLCAnICAnKTtcbn07XG5qc29uRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gRGlmZi5wcm90b3R5cGUuZXF1YWxzKGxlZnQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJyksIHJpZ2h0LnJlcGxhY2UoLywoW1xcclxcbl0pL2csICckMScpKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmSnNvbihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spIHsgcmV0dXJuIGpzb25EaWZmLmRpZmYob2xkT2JqLCBuZXdPYmosIGNhbGxiYWNrKTsgfVxuXG5cbi8vIFRoaXMgZnVuY3Rpb24gaGFuZGxlcyB0aGUgcHJlc2VuY2Ugb2YgY2lyY3VsYXIgcmVmZXJlbmNlcyBieSBiYWlsaW5nIG91dCB3aGVuIGVuY291bnRlcmluZyBhblxuLy8gb2JqZWN0IHRoYXQgaXMgYWxyZWFkeSBvbiB0aGUgXCJzdGFja1wiIG9mIGl0ZW1zIGJlaW5nIHByb2Nlc3NlZC5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemUob2JqLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjaykge1xuICBzdGFjayA9IHN0YWNrIHx8IFtdO1xuICByZXBsYWNlbWVudFN0YWNrID0gcmVwbGFjZW1lbnRTdGFjayB8fCBbXTtcblxuICBsZXQgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgc3RhY2subGVuZ3RoOyBpICs9IDEpIHtcbiAgICBpZiAoc3RhY2tbaV0gPT09IG9iaikge1xuICAgICAgcmV0dXJuIHJlcGxhY2VtZW50U3RhY2tbaV07XG4gICAgfVxuICB9XG5cbiAgbGV0IGNhbm9uaWNhbGl6ZWRPYmo7XG5cbiAgaWYgKCdbb2JqZWN0IEFycmF5XScgPT09IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nLmNhbGwob2JqKSkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gbmV3IEFycmF5KG9iai5sZW5ndGgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucHVzaChjYW5vbmljYWxpemVkT2JqKTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgb2JqLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2ldID0gY2Fub25pY2FsaXplKG9ialtpXSwgc3RhY2ssIHJlcGxhY2VtZW50U3RhY2spO1xuICAgIH1cbiAgICBzdGFjay5wb3AoKTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnBvcCgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIG9iaiAhPT0gbnVsbCkge1xuICAgIHN0YWNrLnB1c2gob2JqKTtcbiAgICBjYW5vbmljYWxpemVkT2JqID0ge307XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGxldCBzb3J0ZWRLZXlzID0gW10sXG4gICAgICAgIGtleTtcbiAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc29ydGVkS2V5cy5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRlZEtleXMuc29ydCgpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBzb3J0ZWRLZXlzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBrZXkgPSBzb3J0ZWRLZXlzW2ldO1xuICAgICAgY2Fub25pY2FsaXplZE9ialtrZXldID0gY2Fub25pY2FsaXplKG9ialtrZXldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgY2Fub25pY2FsaXplZE9iaiA9IG9iajtcbiAgfVxuICByZXR1cm4gY2Fub25pY2FsaXplZE9iajtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG5leHBvcnQgY29uc3QgbGluZURpZmYgPSBuZXcgRGlmZigpO1xubGluZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBsZXQgcmV0TGluZXMgPSBbXSxcbiAgICAgIGxpbmVzQW5kTmV3bGluZXMgPSB2YWx1ZS5zcGxpdCgvKFxcbnxcXHJcXG4pLyk7XG5cbiAgLy8gSWdub3JlIHRoZSBmaW5hbCBlbXB0eSB0b2tlbiB0aGF0IG9jY3VycyBpZiB0aGUgc3RyaW5nIGVuZHMgd2l0aCBhIG5ldyBsaW5lXG4gIGlmICghbGluZXNBbmROZXdsaW5lc1tsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgbGluZXNBbmROZXdsaW5lcy5wb3AoKTtcbiAgfVxuXG4gIC8vIE1lcmdlIHRoZSBjb250ZW50IGFuZCBsaW5lIHNlcGFyYXRvcnMgaW50byBzaW5nbGUgdG9rZW5zXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXNBbmROZXdsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBsaW5lID0gbGluZXNBbmROZXdsaW5lc1tpXTtcblxuICAgIGlmIChpICUgMiAmJiAhdGhpcy5vcHRpb25zLm5ld2xpbmVJc1Rva2VuKSB7XG4gICAgICByZXRMaW5lc1tyZXRMaW5lcy5sZW5ndGggLSAxXSArPSBsaW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpIHtcbiAgICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgfVxuICAgICAgcmV0TGluZXMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0TGluZXM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gbGluZURpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG5leHBvcnQgZnVuY3Rpb24gZGlmZlRyaW1tZWRMaW5lcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgbGV0IG9wdGlvbnMgPSBnZW5lcmF0ZU9wdGlvbnMoY2FsbGJhY2ssIHtpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlfSk7XG4gIHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBvcHRpb25zKTtcbn1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5cblxuZXhwb3J0IGNvbnN0IHNlbnRlbmNlRGlmZiA9IG5ldyBEaWZmKCk7XG5zZW50ZW5jZURpZmYudG9rZW5pemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUuc3BsaXQoLyhcXFMuKz9bLiE/XSkoPz1cXHMrfCQpLyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZlNlbnRlbmNlcyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIHNlbnRlbmNlRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbiIsImltcG9ydCBEaWZmIGZyb20gJy4vYmFzZSc7XG5pbXBvcnQge2dlbmVyYXRlT3B0aW9uc30gZnJvbSAnLi4vdXRpbC9wYXJhbXMnO1xuXG4vLyBCYXNlZCBvbiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MYXRpbl9zY3JpcHRfaW5fVW5pY29kZVxuLy9cbi8vIFJhbmdlcyBhbmQgZXhjZXB0aW9uczpcbi8vIExhdGluLTEgU3VwcGxlbWVudCwgMDA4MOKAkzAwRkZcbi8vICAtIFUrMDBENyAgw5cgTXVsdGlwbGljYXRpb24gc2lnblxuLy8gIC0gVSswMEY3ICDDtyBEaXZpc2lvbiBzaWduXG4vLyBMYXRpbiBFeHRlbmRlZC1BLCAwMTAw4oCTMDE3RlxuLy8gTGF0aW4gRXh0ZW5kZWQtQiwgMDE4MOKAkzAyNEZcbi8vIElQQSBFeHRlbnNpb25zLCAwMjUw4oCTMDJBRlxuLy8gU3BhY2luZyBNb2RpZmllciBMZXR0ZXJzLCAwMkIw4oCTMDJGRlxuLy8gIC0gVSswMkM3ICDLhyAmIzcxMTsgIENhcm9uXG4vLyAgLSBVKzAyRDggIMuYICYjNzI4OyAgQnJldmVcbi8vICAtIFUrMDJEOSAgy5kgJiM3Mjk7ICBEb3QgQWJvdmVcbi8vICAtIFUrMDJEQSAgy5ogJiM3MzA7ICBSaW5nIEFib3ZlXG4vLyAgLSBVKzAyREIgIMubICYjNzMxOyAgT2dvbmVrXG4vLyAgLSBVKzAyREMgIMucICYjNzMyOyAgU21hbGwgVGlsZGVcbi8vICAtIFUrMDJERCAgy50gJiM3MzM7ICBEb3VibGUgQWN1dGUgQWNjZW50XG4vLyBMYXRpbiBFeHRlbmRlZCBBZGRpdGlvbmFsLCAxRTAw4oCTMUVGRlxuY29uc3QgZXh0ZW5kZWRXb3JkQ2hhcnMgPSAvXlthLXpBLVpcXHV7QzB9LVxcdXtGRn1cXHV7RDh9LVxcdXtGNn1cXHV7Rjh9LVxcdXsyQzZ9XFx1ezJDOH0tXFx1ezJEN31cXHV7MkRFfS1cXHV7MkZGfVxcdXsxRTAwfS1cXHV7MUVGRn1dKyQvdTtcblxuY29uc3QgcmVXaGl0ZXNwYWNlID0gL1xcUy87XG5cbmV4cG9ydCBjb25zdCB3b3JkRGlmZiA9IG5ldyBEaWZmKCk7XG53b3JkRGlmZi5lcXVhbHMgPSBmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgfHwgKHRoaXMub3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlICYmICFyZVdoaXRlc3BhY2UudGVzdChsZWZ0KSAmJiAhcmVXaGl0ZXNwYWNlLnRlc3QocmlnaHQpKTtcbn07XG53b3JkRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCB0b2tlbnMgPSB2YWx1ZS5zcGxpdCgvKFxccyt8XFxiKS8pO1xuXG4gIC8vIEpvaW4gdGhlIGJvdW5kYXJ5IHNwbGl0cyB0aGF0IHdlIGRvIG5vdCBjb25zaWRlciB0byBiZSBib3VuZGFyaWVzLiBUaGlzIGlzIHByaW1hcmlseSB0aGUgZXh0ZW5kZWQgTGF0aW4gY2hhcmFjdGVyIHNldC5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgLy8gSWYgd2UgaGF2ZSBhbiBlbXB0eSBzdHJpbmcgaW4gdGhlIG5leHQgZmllbGQgYW5kIHdlIGhhdmUgb25seSB3b3JkIGNoYXJzIGJlZm9yZSBhbmQgYWZ0ZXIsIG1lcmdlXG4gICAgaWYgKCF0b2tlbnNbaSArIDFdICYmIHRva2Vuc1tpICsgMl1cbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpXSlcbiAgICAgICAgICAmJiBleHRlbmRlZFdvcmRDaGFycy50ZXN0KHRva2Vuc1tpICsgMl0pKSB7XG4gICAgICB0b2tlbnNbaV0gKz0gdG9rZW5zW2kgKyAyXTtcbiAgICAgIHRva2Vucy5zcGxpY2UoaSArIDEsIDIpO1xuICAgICAgaS0tO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b2tlbnM7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZXb3Jkc1dpdGhTcGFjZShvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHdvcmREaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTtcbn1cbiIsIi8qIFNlZSBMSUNFTlNFIGZpbGUgZm9yIHRlcm1zIG9mIHVzZSAqL1xuXG4vKlxuICogVGV4dCBkaWZmIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIFRoaXMgbGlicmFyeSBzdXBwb3J0cyB0aGUgZm9sbG93aW5nIEFQSVM6XG4gKiBKc0RpZmYuZGlmZkNoYXJzOiBDaGFyYWN0ZXIgYnkgY2hhcmFjdGVyIGRpZmZcbiAqIEpzRGlmZi5kaWZmV29yZHM6IFdvcmQgKGFzIGRlZmluZWQgYnkgXFxiIHJlZ2V4KSBkaWZmIHdoaWNoIGlnbm9yZXMgd2hpdGVzcGFjZVxuICogSnNEaWZmLmRpZmZMaW5lczogTGluZSBiYXNlZCBkaWZmXG4gKlxuICogSnNEaWZmLmRpZmZDc3M6IERpZmYgdGFyZ2V0ZWQgYXQgQ1NTIGNvbnRlbnRcbiAqXG4gKiBUaGVzZSBtZXRob2RzIGFyZSBiYXNlZCBvbiB0aGUgaW1wbGVtZW50YXRpb24gcHJvcG9zZWQgaW5cbiAqIFwiQW4gTyhORCkgRGlmZmVyZW5jZSBBbGdvcml0aG0gYW5kIGl0cyBWYXJpYXRpb25zXCIgKE15ZXJzLCAxOTg2KS5cbiAqIGh0dHA6Ly9jaXRlc2VlcnguaXN0LnBzdS5lZHUvdmlld2RvYy9zdW1tYXJ5P2RvaT0xMC4xLjEuNC42OTI3XG4gKi9cbmltcG9ydCBEaWZmIGZyb20gJy4vZGlmZi9iYXNlJztcbmltcG9ydCB7ZGlmZkNoYXJzfSBmcm9tICcuL2RpZmYvY2hhcmFjdGVyJztcbmltcG9ydCB7ZGlmZldvcmRzLCBkaWZmV29yZHNXaXRoU3BhY2V9IGZyb20gJy4vZGlmZi93b3JkJztcbmltcG9ydCB7ZGlmZkxpbmVzLCBkaWZmVHJpbW1lZExpbmVzfSBmcm9tICcuL2RpZmYvbGluZSc7XG5pbXBvcnQge2RpZmZTZW50ZW5jZXN9IGZyb20gJy4vZGlmZi9zZW50ZW5jZSc7XG5cbmltcG9ydCB7ZGlmZkNzc30gZnJvbSAnLi9kaWZmL2Nzcyc7XG5pbXBvcnQge2RpZmZKc29uLCBjYW5vbmljYWxpemV9IGZyb20gJy4vZGlmZi9qc29uJztcblxuaW1wb3J0IHthcHBseVBhdGNoLCBhcHBseVBhdGNoZXN9IGZyb20gJy4vcGF0Y2gvYXBwbHknO1xuaW1wb3J0IHtwYXJzZVBhdGNofSBmcm9tICcuL3BhdGNoL3BhcnNlJztcbmltcG9ydCB7c3RydWN0dXJlZFBhdGNoLCBjcmVhdGVUd29GaWxlc1BhdGNoLCBjcmVhdGVQYXRjaH0gZnJvbSAnLi9wYXRjaC9jcmVhdGUnO1xuXG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9ETVB9IGZyb20gJy4vY29udmVydC9kbXAnO1xuaW1wb3J0IHtjb252ZXJ0Q2hhbmdlc1RvWE1MfSBmcm9tICcuL2NvbnZlcnQveG1sJztcblxuZXhwb3J0IHtcbiAgRGlmZixcblxuICBkaWZmQ2hhcnMsXG4gIGRpZmZXb3JkcyxcbiAgZGlmZldvcmRzV2l0aFNwYWNlLFxuICBkaWZmTGluZXMsXG4gIGRpZmZUcmltbWVkTGluZXMsXG4gIGRpZmZTZW50ZW5jZXMsXG5cbiAgZGlmZkNzcyxcbiAgZGlmZkpzb24sXG5cbiAgc3RydWN0dXJlZFBhdGNoLFxuICBjcmVhdGVUd29GaWxlc1BhdGNoLFxuICBjcmVhdGVQYXRjaCxcbiAgYXBwbHlQYXRjaCxcbiAgYXBwbHlQYXRjaGVzLFxuICBwYXJzZVBhdGNoLFxuICBjb252ZXJ0Q2hhbmdlc1RvRE1QLFxuICBjb252ZXJ0Q2hhbmdlc1RvWE1MLFxuICBjYW5vbmljYWxpemVcbn07XG4iLCJpbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGFyc2UnO1xuaW1wb3J0IGRpc3RhbmNlSXRlcmF0b3IgZnJvbSAnLi4vdXRpbC9kaXN0YW5jZS1pdGVyYXRvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoKHNvdXJjZSwgdW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGlmICh0eXBlb2YgdW5pRGlmZiA9PT0gJ3N0cmluZycpIHtcbiAgICB1bmlEaWZmID0gcGFyc2VQYXRjaCh1bmlEaWZmKTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHVuaURpZmYpKSB7XG4gICAgaWYgKHVuaURpZmYubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcHBseVBhdGNoIG9ubHkgd29ya3Mgd2l0aCBhIHNpbmdsZSBpbnB1dC4nKTtcbiAgICB9XG5cbiAgICB1bmlEaWZmID0gdW5pRGlmZlswXTtcbiAgfVxuXG4gIC8vIEFwcGx5IHRoZSBkaWZmIHRvIHRoZSBpbnB1dFxuICBsZXQgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpLFxuICAgICAgaHVua3MgPSB1bmlEaWZmLmh1bmtzLFxuXG4gICAgICBjb21wYXJlTGluZSA9IG9wdGlvbnMuY29tcGFyZUxpbmUgfHwgKChsaW5lTnVtYmVyLCBsaW5lLCBvcGVyYXRpb24sIHBhdGNoQ29udGVudCkgPT4gbGluZSA9PT0gcGF0Y2hDb250ZW50KSxcbiAgICAgIGVycm9yQ291bnQgPSAwLFxuICAgICAgZnV6ekZhY3RvciA9IG9wdGlvbnMuZnV6ekZhY3RvciB8fCAwLFxuICAgICAgbWluTGluZSA9IDAsXG4gICAgICBvZmZzZXQgPSAwLFxuXG4gICAgICByZW1vdmVFT0ZOTCxcbiAgICAgIGFkZEVPRk5MO1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGh1bmsgZXhhY3RseSBmaXRzIG9uIHRoZSBwcm92aWRlZCBsb2NhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gaHVua0ZpdHMoaHVuaywgdG9Qb3MpIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnIHx8IG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIC8vIENvbnRleHQgc2FuaXR5IGNoZWNrXG4gICAgICAgIGlmICghY29tcGFyZUxpbmUodG9Qb3MgKyAxLCBsaW5lc1t0b1Bvc10sIG9wZXJhdGlvbiwgY29udGVudCkpIHtcbiAgICAgICAgICBlcnJvckNvdW50Kys7XG5cbiAgICAgICAgICBpZiAoZXJyb3JDb3VudCA+IGZ1enpGYWN0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIFNlYXJjaCBiZXN0IGZpdCBvZmZzZXRzIGZvciBlYWNoIGh1bmsgYmFzZWQgb24gdGhlIHByZXZpb3VzIG9uZXNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBodW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBodW5rID0gaHVua3NbaV0sXG4gICAgICAgIG1heExpbmUgPSBsaW5lcy5sZW5ndGggLSBodW5rLm9sZExpbmVzLFxuICAgICAgICBsb2NhbE9mZnNldCA9IDAsXG4gICAgICAgIHRvUG9zID0gb2Zmc2V0ICsgaHVuay5vbGRTdGFydCAtIDE7XG5cbiAgICBsZXQgaXRlcmF0b3IgPSBkaXN0YW5jZUl0ZXJhdG9yKHRvUG9zLCBtaW5MaW5lLCBtYXhMaW5lKTtcblxuICAgIGZvciAoOyBsb2NhbE9mZnNldCAhPT0gdW5kZWZpbmVkOyBsb2NhbE9mZnNldCA9IGl0ZXJhdG9yKCkpIHtcbiAgICAgIGlmIChodW5rRml0cyhodW5rLCB0b1BvcyArIGxvY2FsT2Zmc2V0KSkge1xuICAgICAgICBodW5rLm9mZnNldCA9IG9mZnNldCArPSBsb2NhbE9mZnNldDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxvY2FsT2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG93ZXIgdGV4dCBsaW1pdCB0byBlbmQgb2YgdGhlIGN1cnJlbnQgaHVuaywgc28gbmV4dCBvbmVzIGRvbid0IHRyeVxuICAgIC8vIHRvIGZpdCBvdmVyIGFscmVhZHkgcGF0Y2hlZCB0ZXh0XG4gICAgbWluTGluZSA9IGh1bmsub2Zmc2V0ICsgaHVuay5vbGRTdGFydCArIGh1bmsub2xkTGluZXM7XG4gIH1cblxuICAvLyBBcHBseSBwYXRjaCBodW5rc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgdG9Qb3MgPSBodW5rLm9mZnNldCArIGh1bmsubmV3U3RhcnQgLSAxO1xuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBodW5rLmxpbmVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBsZXQgbGluZSA9IGh1bmsubGluZXNbal0sXG4gICAgICAgICAgb3BlcmF0aW9uID0gbGluZVswXSxcbiAgICAgICAgICBjb250ZW50ID0gbGluZS5zdWJzdHIoMSk7XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcgJykge1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDEpO1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgbGluZXMuc3BsaWNlKHRvUG9zLCAwLCBjb250ZW50KTtcbiAgICAgICAgdG9Qb3MrKztcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgbGV0IHByZXZpb3VzT3BlcmF0aW9uID0gaHVuay5saW5lc1tqIC0gMV0gPyBodW5rLmxpbmVzW2ogLSAxXVswXSA6IG51bGw7XG4gICAgICAgIGlmIChwcmV2aW91c09wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgcmVtb3ZlRU9GTkwgPSB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICBhZGRFT0ZOTCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgRU9GTkwgaW5zZXJ0aW9uL3JlbW92YWxcbiAgaWYgKHJlbW92ZUVPRk5MKSB7XG4gICAgd2hpbGUgKCFsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSkge1xuICAgICAgbGluZXMucG9wKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFkZEVPRk5MKSB7XG4gICAgbGluZXMucHVzaCgnJyk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vLyBXcmFwcGVyIHRoYXQgc3VwcG9ydHMgbXVsdGlwbGUgZmlsZSBwYXRjaGVzIHZpYSBjYWxsYmFja3MuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzKHVuaURpZmYsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgbGV0IGN1cnJlbnRJbmRleCA9IDA7XG4gIGZ1bmN0aW9uIHByb2Nlc3NJbmRleCgpIHtcbiAgICBsZXQgaW5kZXggPSB1bmlEaWZmW2N1cnJlbnRJbmRleCsrXTtcbiAgICBpZiAoIWluZGV4KSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZSgpO1xuICAgIH1cblxuICAgIG9wdGlvbnMubG9hZEZpbGUoaW5kZXgsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5jb21wbGV0ZShlcnIpO1xuICAgICAgfVxuXG4gICAgICBsZXQgdXBkYXRlZENvbnRlbnQgPSBhcHBseVBhdGNoKGRhdGEsIGluZGV4LCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMucGF0Y2hlZChpbmRleCwgdXBkYXRlZENvbnRlbnQpO1xuXG4gICAgICBzZXRUaW1lb3V0KHByb2Nlc3NJbmRleCwgMCk7XG4gICAgfSk7XG4gIH1cbiAgcHJvY2Vzc0luZGV4KCk7XG59XG4iLCJpbXBvcnQge2RpZmZMaW5lc30gZnJvbSAnLi4vZGlmZi9saW5lJztcblxuZXhwb3J0IGZ1bmN0aW9uIHN0cnVjdHVyZWRQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0geyBjb250ZXh0OiA0IH07XG4gIH1cblxuICBjb25zdCBkaWZmID0gZGlmZkxpbmVzKG9sZFN0ciwgbmV3U3RyKTtcbiAgZGlmZi5wdXNoKHt2YWx1ZTogJycsIGxpbmVzOiBbXX0pOyAgIC8vIEFwcGVuZCBhbiBlbXB0eSB2YWx1ZSB0byBtYWtlIGNsZWFudXAgZWFzaWVyXG5cbiAgZnVuY3Rpb24gY29udGV4dExpbmVzKGxpbmVzKSB7XG4gICAgcmV0dXJuIGxpbmVzLm1hcChmdW5jdGlvbihlbnRyeSkgeyByZXR1cm4gJyAnICsgZW50cnk7IH0pO1xuICB9XG5cbiAgbGV0IGh1bmtzID0gW107XG4gIGxldCBvbGRSYW5nZVN0YXJ0ID0gMCwgbmV3UmFuZ2VTdGFydCA9IDAsIGN1clJhbmdlID0gW10sXG4gICAgICBvbGRMaW5lID0gMSwgbmV3TGluZSA9IDE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBkaWZmW2ldLFxuICAgICAgICAgIGxpbmVzID0gY3VycmVudC5saW5lcyB8fCBjdXJyZW50LnZhbHVlLnJlcGxhY2UoL1xcbiQvLCAnJykuc3BsaXQoJ1xcbicpO1xuICAgIGN1cnJlbnQubGluZXMgPSBsaW5lcztcblxuICAgIGlmIChjdXJyZW50LmFkZGVkIHx8IGN1cnJlbnQucmVtb3ZlZCkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBwcmV2aW91cyBjb250ZXh0LCBzdGFydCB3aXRoIHRoYXRcbiAgICAgIGlmICghb2xkUmFuZ2VTdGFydCkge1xuICAgICAgICBjb25zdCBwcmV2ID0gZGlmZltpIC0gMV07XG4gICAgICAgIG9sZFJhbmdlU3RhcnQgPSBvbGRMaW5lO1xuICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gbmV3TGluZTtcblxuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgIGN1clJhbmdlID0gb3B0aW9ucy5jb250ZXh0ID4gMCA/IGNvbnRleHRMaW5lcyhwcmV2LmxpbmVzLnNsaWNlKC1vcHRpb25zLmNvbnRleHQpKSA6IFtdO1xuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgLT0gY3VyUmFuZ2UubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE91dHB1dCBvdXIgY2hhbmdlc1xuICAgICAgY3VyUmFuZ2UucHVzaCguLi4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7XG4gICAgICAgIHJldHVybiAoY3VycmVudC5hZGRlZCA/ICcrJyA6ICctJykgKyBlbnRyeTtcbiAgICAgIH0pKTtcblxuICAgICAgLy8gVHJhY2sgdGhlIHVwZGF0ZWQgZmlsZSBwb3NpdGlvblxuICAgICAgaWYgKGN1cnJlbnQuYWRkZWQpIHtcbiAgICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWRlbnRpY2FsIGNvbnRleHQgbGluZXMuIFRyYWNrIGxpbmUgY2hhbmdlc1xuICAgICAgaWYgKG9sZFJhbmdlU3RhcnQpIHtcbiAgICAgICAgLy8gQ2xvc2Ugb3V0IGFueSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG91dHB1dCAob3Igam9pbiBvdmVybGFwcGluZylcbiAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQgKiAyICYmIGkgPCBkaWZmLmxlbmd0aCAtIDIpIHtcbiAgICAgICAgICAvLyBPdmVybGFwcGluZ1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGVuZCB0aGUgcmFuZ2UgYW5kIG91dHB1dFxuICAgICAgICAgIGxldCBjb250ZXh0U2l6ZSA9IE1hdGgubWluKGxpbmVzLmxlbmd0aCwgb3B0aW9ucy5jb250ZXh0KTtcbiAgICAgICAgICBjdXJSYW5nZS5wdXNoKC4uLiBjb250ZXh0TGluZXMobGluZXMuc2xpY2UoMCwgY29udGV4dFNpemUpKSk7XG5cbiAgICAgICAgICBsZXQgaHVuayA9IHtcbiAgICAgICAgICAgIG9sZFN0YXJ0OiBvbGRSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgb2xkTGluZXM6IChvbGRMaW5lIC0gb2xkUmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIG5ld1N0YXJ0OiBuZXdSYW5nZVN0YXJ0LFxuICAgICAgICAgICAgbmV3TGluZXM6IChuZXdMaW5lIC0gbmV3UmFuZ2VTdGFydCArIGNvbnRleHRTaXplKSxcbiAgICAgICAgICAgIGxpbmVzOiBjdXJSYW5nZVxuICAgICAgICAgIH07XG4gICAgICAgICAgaWYgKGkgPj0gZGlmZi5sZW5ndGggLSAyICYmIGxpbmVzLmxlbmd0aCA8PSBvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIEVPRiBpcyBpbnNpZGUgdGhpcyBodW5rXG4gICAgICAgICAgICBsZXQgb2xkRU9GTmV3bGluZSA9ICgvXFxuJC8udGVzdChvbGRTdHIpKTtcbiAgICAgICAgICAgIGxldCBuZXdFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG5ld1N0cikpO1xuICAgICAgICAgICAgaWYgKGxpbmVzLmxlbmd0aCA9PSAwICYmICFvbGRFT0ZOZXdsaW5lKSB7XG4gICAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZTogb2xkIGhhcyBubyBlb2wgYW5kIG5vIHRyYWlsaW5nIGNvbnRleHQ7IG5vLW5sIGNhbiBlbmQgdXAgYmVmb3JlIGFkZHNcbiAgICAgICAgICAgICAgY3VyUmFuZ2Uuc3BsaWNlKGh1bmsub2xkTGluZXMsIDAsICdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW9sZEVPRk5ld2xpbmUgfHwgIW5ld0VPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgY3VyUmFuZ2UucHVzaCgnXFxcXCBObyBuZXdsaW5lIGF0IGVuZCBvZiBmaWxlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGh1bmtzLnB1c2goaHVuayk7XG5cbiAgICAgICAgICBvbGRSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBuZXdSYW5nZVN0YXJ0ID0gMDtcbiAgICAgICAgICBjdXJSYW5nZSA9IFtdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvbGRMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIG5ld0xpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb2xkRmlsZU5hbWU6IG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZTogbmV3RmlsZU5hbWUsXG4gICAgb2xkSGVhZGVyOiBvbGRIZWFkZXIsIG5ld0hlYWRlcjogbmV3SGVhZGVyLFxuICAgIGh1bmtzOiBodW5rc1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHdvRmlsZXNQYXRjaChvbGRGaWxlTmFtZSwgbmV3RmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICBjb25zdCBkaWZmID0gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKTtcblxuICBjb25zdCByZXQgPSBbXTtcbiAgaWYgKG9sZEZpbGVOYW1lID09IG5ld0ZpbGVOYW1lKSB7XG4gICAgcmV0LnB1c2goJ0luZGV4OiAnICsgb2xkRmlsZU5hbWUpO1xuICB9XG4gIHJldC5wdXNoKCc9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7XG4gIHJldC5wdXNoKCctLS0gJyArIGRpZmYub2xkRmlsZU5hbWUgKyAodHlwZW9mIGRpZmYub2xkSGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm9sZEhlYWRlcikpO1xuICByZXQucHVzaCgnKysrICcgKyBkaWZmLm5ld0ZpbGVOYW1lICsgKHR5cGVvZiBkaWZmLm5ld0hlYWRlciA9PT0gJ3VuZGVmaW5lZCcgPyAnJyA6ICdcXHQnICsgZGlmZi5uZXdIZWFkZXIpKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmYuaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBodW5rID0gZGlmZi5odW5rc1tpXTtcbiAgICByZXQucHVzaChcbiAgICAgICdAQCAtJyArIGh1bmsub2xkU3RhcnQgKyAnLCcgKyBodW5rLm9sZExpbmVzXG4gICAgICArICcgKycgKyBodW5rLm5ld1N0YXJ0ICsgJywnICsgaHVuay5uZXdMaW5lc1xuICAgICAgKyAnIEBAJ1xuICAgICk7XG4gICAgcmV0LnB1c2guYXBwbHkocmV0LCBodW5rLmxpbmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXQuam9pbignXFxuJykgKyAnXFxuJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhdGNoKGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGNyZWF0ZVR3b0ZpbGVzUGF0Y2goZmlsZU5hbWUsIGZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUGF0Y2godW5pRGlmZiwgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCBkaWZmc3RyID0gdW5pRGlmZi5zcGxpdCgnXFxuJyksXG4gICAgICBsaXN0ID0gW10sXG4gICAgICBpID0gMDtcblxuICBmdW5jdGlvbiBwYXJzZUluZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHt9O1xuICAgIGxpc3QucHVzaChpbmRleCk7XG5cbiAgICAvLyBQYXJzZSBkaWZmIG1ldGFkYXRhXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICAvLyBGaWxlIGhlYWRlciBmb3VuZCwgZW5kIHBhcnNpbmcgZGlmZiBtZXRhZGF0YVxuICAgICAgaWYgKC9eKFxcLVxcLVxcLXxcXCtcXCtcXCt8QEApXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBEaWZmIGluZGV4XG4gICAgICBsZXQgaGVhZGVyID0gKC9eKD86SW5kZXg6fGRpZmYoPzogLXIgXFx3KykrKVxccysoLis/KVxccyokLykuZXhlYyhsaW5lKTtcbiAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgaW5kZXguaW5kZXggPSBoZWFkZXJbMV07XG4gICAgICB9XG5cbiAgICAgIGkrKztcbiAgICB9XG5cbiAgICAvLyBQYXJzZSBmaWxlIGhlYWRlcnMgaWYgdGhleSBhcmUgZGVmaW5lZC4gVW5pZmllZCBkaWZmIHJlcXVpcmVzIHRoZW0sIGJ1dFxuICAgIC8vIHRoZXJlJ3Mgbm8gdGVjaG5pY2FsIGlzc3VlcyB0byBoYXZlIGFuIGlzb2xhdGVkIGh1bmsgd2l0aG91dCBmaWxlIGhlYWRlclxuICAgIHBhcnNlRmlsZUhlYWRlcihpbmRleCk7XG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGh1bmtzXG4gICAgaW5kZXguaHVua3MgPSBbXTtcblxuICAgIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICAgIGxldCBsaW5lID0gZGlmZnN0cltpXTtcblxuICAgICAgaWYgKC9eKEluZGV4OnxkaWZmfFxcLVxcLVxcLXxcXCtcXCtcXCspXFxzLy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmICgvXkBALy50ZXN0KGxpbmUpKSB7XG4gICAgICAgIGluZGV4Lmh1bmtzLnB1c2gocGFyc2VIdW5rKCkpO1xuICAgICAgfSBlbHNlIGlmIChsaW5lICYmIG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICAgIC8vIElnbm9yZSB1bmV4cGVjdGVkIGNvbnRlbnQgdW5sZXNzIGluIHN0cmljdCBtb2RlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsaW5lICcgKyAoaSArIDEpICsgJyAnICsgSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyB0aGUgLS0tIGFuZCArKysgaGVhZGVycywgaWYgbm9uZSBhcmUgZm91bmQsIG5vIGxpbmVzXG4gIC8vIGFyZSBjb25zdW1lZC5cbiAgZnVuY3Rpb24gcGFyc2VGaWxlSGVhZGVyKGluZGV4KSB7XG4gICAgbGV0IGZpbGVIZWFkZXIgPSAoL14oXFwtXFwtXFwtfFxcK1xcK1xcKylcXHMrKFxcUyspXFxzPyguKz8pXFxzKiQvKS5leGVjKGRpZmZzdHJbaV0pO1xuICAgIGlmIChmaWxlSGVhZGVyKSB7XG4gICAgICBsZXQga2V5UHJlZml4ID0gZmlsZUhlYWRlclsxXSA9PT0gJy0tLScgPyAnb2xkJyA6ICduZXcnO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0ZpbGVOYW1lJ10gPSBmaWxlSGVhZGVyWzJdO1xuICAgICAgaW5kZXhba2V5UHJlZml4ICsgJ0hlYWRlciddID0gZmlsZUhlYWRlclszXTtcblxuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlcyBhIGh1bmtcbiAgLy8gVGhpcyBhc3N1bWVzIHRoYXQgd2UgYXJlIGF0IHRoZSBzdGFydCBvZiBhIGh1bmsuXG4gIGZ1bmN0aW9uIHBhcnNlSHVuaygpIHtcbiAgICBsZXQgY2h1bmtIZWFkZXJJbmRleCA9IGksXG4gICAgICAgIGNodW5rSGVhZGVyTGluZSA9IGRpZmZzdHJbaSsrXSxcbiAgICAgICAgY2h1bmtIZWFkZXIgPSBjaHVua0hlYWRlckxpbmUuc3BsaXQoL0BAIC0oXFxkKykoPzosKFxcZCspKT8gXFwrKFxcZCspKD86LChcXGQrKSk/IEBALyk7XG5cbiAgICBsZXQgaHVuayA9IHtcbiAgICAgIG9sZFN0YXJ0OiArY2h1bmtIZWFkZXJbMV0sXG4gICAgICBvbGRMaW5lczogK2NodW5rSGVhZGVyWzJdIHx8IDEsXG4gICAgICBuZXdTdGFydDogK2NodW5rSGVhZGVyWzNdLFxuICAgICAgbmV3TGluZXM6ICtjaHVua0hlYWRlcls0XSB8fCAxLFxuICAgICAgbGluZXM6IFtdXG4gICAgfTtcblxuICAgIGxldCBhZGRDb3VudCA9IDAsXG4gICAgICAgIHJlbW92ZUNvdW50ID0gMDtcbiAgICBmb3IgKDsgaSA8IGRpZmZzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBvcGVyYXRpb24gPSBkaWZmc3RyW2ldWzBdO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnKycgfHwgb3BlcmF0aW9uID09PSAnLScgfHwgb3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnXFxcXCcpIHtcbiAgICAgICAgaHVuay5saW5lcy5wdXNoKGRpZmZzdHJbaV0pO1xuXG4gICAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICAgIGFkZENvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgICByZW1vdmVDb3VudCsrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgdGhlIGVtcHR5IGJsb2NrIGNvdW50IGNhc2VcbiAgICBpZiAoIWFkZENvdW50ICYmIGh1bmsubmV3TGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsubmV3TGluZXMgPSAwO1xuICAgIH1cbiAgICBpZiAoIXJlbW92ZUNvdW50ICYmIGh1bmsub2xkTGluZXMgPT09IDEpIHtcbiAgICAgIGh1bmsub2xkTGluZXMgPSAwO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gb3B0aW9uYWwgc2FuaXR5IGNoZWNraW5nXG4gICAgaWYgKG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgICBpZiAoYWRkQ291bnQgIT09IGh1bmsubmV3TGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBZGRlZCBsaW5lIGNvdW50IGRpZCBub3QgbWF0Y2ggZm9yIGh1bmsgYXQgbGluZSAnICsgKGNodW5rSGVhZGVySW5kZXggKyAxKSk7XG4gICAgICB9XG4gICAgICBpZiAocmVtb3ZlQ291bnQgIT09IGh1bmsub2xkTGluZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZW1vdmVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaHVuaztcbiAgfVxuXG4gIHdoaWxlIChpIDwgZGlmZnN0ci5sZW5ndGgpIHtcbiAgICBwYXJzZUluZGV4KCk7XG4gIH1cblxuICByZXR1cm4gbGlzdDtcbn1cbiIsIi8vIEl0ZXJhdG9yIHRoYXQgdHJhdmVyc2VzIGluIHRoZSByYW5nZSBvZiBbbWluLCBtYXhdLCBzdGVwcGluZ1xuLy8gYnkgZGlzdGFuY2UgZnJvbSBhIGdpdmVuIHN0YXJ0IHBvc2l0aW9uLiBJLmUuIGZvciBbMCwgNF0sIHdpdGhcbi8vIHN0YXJ0IG9mIDIsIHRoaXMgd2lsbCBpdGVyYXRlIDIsIDMsIDEsIDQsIDAuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGFydCwgbWluTGluZSwgbWF4TGluZSkge1xuICBsZXQgd2FudEZvcndhcmQgPSB0cnVlLFxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSBmYWxzZSxcbiAgICAgIGxvY2FsT2Zmc2V0ID0gMTtcblxuICByZXR1cm4gZnVuY3Rpb24gaXRlcmF0b3IoKSB7XG4gICAgaWYgKHdhbnRGb3J3YXJkICYmICFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICBpZiAoYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgICAgbG9jYWxPZmZzZXQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmV5b25kIHRleHQgbGVuZ3RoLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBhZnRlciBvZmZzZXQgbG9jYXRpb24gKG9yIGRlc2lyZWQgbG9jYXRpb24gb24gZmlyc3QgaXRlcmF0aW9uKVxuICAgICAgaWYgKHN0YXJ0ICsgbG9jYWxPZmZzZXQgPD0gbWF4TGluZSkge1xuICAgICAgICByZXR1cm4gbG9jYWxPZmZzZXQ7XG4gICAgICB9XG5cbiAgICAgIGZvcndhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYmFja3dhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmICghZm9yd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICB3YW50Rm9yd2FyZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGlmIHRyeWluZyB0byBmaXQgYmVmb3JlIHRleHQgYmVnaW5uaW5nLCBhbmQgaWYgbm90LCBjaGVjayBpdCBmaXRzXG4gICAgICAvLyBiZWZvcmUgb2Zmc2V0IGxvY2F0aW9uXG4gICAgICBpZiAobWluTGluZSA8PSBzdGFydCAtIGxvY2FsT2Zmc2V0KSB7XG4gICAgICAgIHJldHVybiAtbG9jYWxPZmZzZXQrKztcbiAgICAgIH1cblxuICAgICAgYmFja3dhcmRFeGhhdXN0ZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGl0ZXJhdG9yKCk7XG4gICAgfVxuXG4gICAgLy8gV2UgdHJpZWQgdG8gZml0IGh1bmsgYmVmb3JlIHRleHQgYmVnaW5uaW5nIGFuZCBiZXlvbmQgdGV4dCBsZW5naHQsIHRoZW5cbiAgICAvLyBodW5rIGNhbid0IGZpdCBvbiB0aGUgdGV4dC4gUmV0dXJuIHVuZGVmaW5lZFxuICB9O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0cykge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBkZWZhdWx0cy5jYWxsYmFjayA9IG9wdGlvbnM7XG4gIH0gZWxzZSBpZiAob3B0aW9ucykge1xuICAgIGZvciAobGV0IG5hbWUgaW4gb3B0aW9ucykge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGRlZmF1bHRzW25hbWVdID0gb3B0aW9uc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRzO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBsY3MgPSByZXF1aXJlKCcuL2xpYi9sY3MnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vbGliL2FycmF5Jyk7XG52YXIgcGF0Y2ggPSByZXF1aXJlKCcuL2xpYi9qc29uUGF0Y2gnKTtcbnZhciBpbnZlcnNlID0gcmVxdWlyZSgnLi9saWIvaW52ZXJzZScpO1xudmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9saWIvanNvblBvaW50ZXInKTtcbnZhciBlbmNvZGVTZWdtZW50ID0ganNvblBvaW50ZXIuZW5jb2RlU2VnbWVudDtcblxuZXhwb3J0cy5kaWZmID0gZGlmZjtcbmV4cG9ydHMucGF0Y2ggPSBwYXRjaC5hcHBseTtcbmV4cG9ydHMucGF0Y2hJblBsYWNlID0gcGF0Y2guYXBwbHlJblBsYWNlO1xuZXhwb3J0cy5pbnZlcnNlID0gaW52ZXJzZTtcbmV4cG9ydHMuY2xvbmUgPSBwYXRjaC5jbG9uZTtcblxuLy8gRXJyb3JzXG5leHBvcnRzLkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9saWIvSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbmV4cG9ydHMuVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9saWIvVGVzdEZhaWxlZEVycm9yJyk7XG5leHBvcnRzLlBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9saWIvUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGlzVmFsaWRPYmplY3QgPSBwYXRjaC5pc1ZhbGlkT2JqZWN0O1xudmFyIGRlZmF1bHRIYXNoID0gcGF0Y2guZGVmYXVsdEhhc2g7XG5cbi8qKlxuICogQ29tcHV0ZSBhIEpTT04gUGF0Y2ggcmVwcmVzZW50aW5nIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGEgYW5kIGIuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBpZiBhIGZ1bmN0aW9uLCBzZWUgb3B0aW9ucy5oYXNoXG4gKiBAcGFyYW0gez9mdW5jdGlvbih4OiopOlN0cmluZ3xOdW1iZXJ9IG9wdGlvbnMuaGFzaCB1c2VkIHRvIGhhc2ggYXJyYXkgaXRlbXNcbiAqICBpbiBvcmRlciB0byByZWNvZ25pemUgaWRlbnRpY2FsIG9iamVjdHMsIGRlZmF1bHRzIHRvIEpTT04uc3RyaW5naWZ5XG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5KTpvYmplY3R9IG9wdGlvbnMubWFrZUNvbnRleHRcbiAqICB1c2VkIHRvIGdlbmVyYXRlIHBhdGNoIGNvbnRleHQuIElmIG5vdCBwcm92aWRlZCwgY29udGV4dCB3aWxsIG5vdCBiZSBnZW5lcmF0ZWRcbiAqIEByZXR1cm5zIHthcnJheX0gSlNPTiBQYXRjaCBzdWNoIHRoYXQgcGF0Y2goZGlmZihhLCBiKSwgYSkgfiBiXG4gKi9cbmZ1bmN0aW9uIGRpZmYoYSwgYiwgb3B0aW9ucykge1xuXHRyZXR1cm4gYXBwZW5kQ2hhbmdlcyhhLCBiLCAnJywgaW5pdFN0YXRlKG9wdGlvbnMsIFtdKSkucGF0Y2g7XG59XG5cbi8qKlxuICogQ3JlYXRlIGluaXRpYWwgZGlmZiBzdGF0ZSBmcm9tIHRoZSBwcm92aWRlZCBvcHRpb25zXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIEBzZWUgZGlmZiBvcHRpb25zIGFib3ZlXG4gKiBAcGFyYW0ge2FycmF5fSBwYXRjaCBhbiBlbXB0eSBvciBleGlzdGluZyBKU09OIFBhdGNoIGFycmF5IGludG8gd2hpY2hcbiAqICB0aGUgZGlmZiBzaG91bGQgZ2VuZXJhdGUgbmV3IHBhdGNoIG9wZXJhdGlvbnNcbiAqIEByZXR1cm5zIHtvYmplY3R9IGluaXRpYWxpemVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gaW5pdFN0YXRlKG9wdGlvbnMsIHBhdGNoKSB7XG5cdGlmKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5oYXNoLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMubWFrZUNvbnRleHQsIGRlZmF1bHRDb250ZXh0KSxcblx0XHRcdGludmVydGlibGU6ICEob3B0aW9ucy5pbnZlcnRpYmxlID09PSBmYWxzZSlcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucywgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IGRlZmF1bHRDb250ZXh0LFxuXHRcdFx0aW52ZXJ0aWJsZTogdHJ1ZVxuXHRcdH07XG5cdH1cbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gSlNPTiB2YWx1ZXMgKG9iamVjdCwgYXJyYXksIG51bWJlciwgc3RyaW5nLCBldGMuKSwgZmluZCB0aGVpclxuICogZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZEFycmF5Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRpZihpc1ZhbGlkT2JqZWN0KGEpICYmIGlzVmFsaWRPYmplY3QoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kT2JqZWN0Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRyZXR1cm4gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gb2JqZWN0cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMVxuICogQHBhcmFtIHtvYmplY3R9IG8yXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kT2JqZWN0Q2hhbmdlcyhvMSwgbzIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMobzIpO1xuXHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0dmFyIGksIGtleTtcblxuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdHZhciBrZXlQYXRoID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRpZihvMVtrZXldICE9PSB2b2lkIDApIHtcblx0XHRcdGFwcGVuZENoYW5nZXMobzFba2V5XSwgbzJba2V5XSwga2V5UGF0aCwgc3RhdGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBrZXlQYXRoLCB2YWx1ZTogbzJba2V5XSB9KTtcblx0XHR9XG5cdH1cblxuXHRrZXlzID0gT2JqZWN0LmtleXMobzEpO1xuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdGlmKG8yW2tleV0gPT09IHZvaWQgMCkge1xuXHRcdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IG8xW2tleV0gfSk7XG5cdFx0XHR9XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwIH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYXJyYXlzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQXJyYXlDaGFuZ2VzKGExLCBhMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGExaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMSk7XG5cdHZhciBhMmhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTIpO1xuXG5cdHZhciBsY3NNYXRyaXggPSBsY3MuY29tcGFyZShhMWhhc2gsIGEyaGFzaCk7XG5cblx0cmV0dXJuIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGxjc01hdHJpeCBpbnRvIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhbmQgYXBwZW5kXG4gKiB0aGVtIHRvIHN0YXRlLnBhdGNoLCByZWN1cnNpbmcgaW50byBhcnJheSBlbGVtZW50cyBhcyBuZWNlc3NhcnlcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjc01hdHJpeFxuICogQHJldHVybnMge29iamVjdH0gbmV3IHN0YXRlIHdpdGggSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFkZGVkIGJhc2VkXG4gKiAgb24gdGhlIHByb3ZpZGVkIGxjc01hdHJpeFxuICovXG5mdW5jdGlvbiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpIHtcblx0dmFyIG9mZnNldCA9IDA7XG5cdHJldHVybiBsY3MucmVkdWNlKGZ1bmN0aW9uKHN0YXRlLCBvcCwgaSwgaikge1xuXHRcdHZhciBsYXN0LCBjb250ZXh0O1xuXHRcdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHRcdHZhciBwID0gcGF0aCArICcvJyArIChqICsgb2Zmc2V0KTtcblxuXHRcdGlmIChvcCA9PT0gbGNzLlJFTU9WRSkge1xuXHRcdFx0Ly8gQ29hbGVzY2UgYWRqYWNlbnQgcmVtb3ZlICsgYWRkIGludG8gcmVwbGFjZVxuXHRcdFx0bGFzdCA9IHBhdGNoW3BhdGNoLmxlbmd0aC0xXTtcblx0XHRcdGNvbnRleHQgPSBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSk7XG5cblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBhMVtqXSwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYobGFzdCAhPT0gdm9pZCAwICYmIGxhc3Qub3AgPT09ICdhZGQnICYmIGxhc3QucGF0aCA9PT0gcCkge1xuXHRcdFx0XHRsYXN0Lm9wID0gJ3JlcGxhY2UnO1xuXHRcdFx0XHRsYXN0LmNvbnRleHQgPSBjb250ZXh0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0b2Zmc2V0IC09IDE7XG5cblx0XHR9IGVsc2UgaWYgKG9wID09PSBsY3MuQUREKSB7XG5cdFx0XHQvLyBTZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDIjc2VjdGlvbi00LjFcblx0XHRcdC8vIE1heSB1c2UgZWl0aGVyIGluZGV4PT09bGVuZ3RoICpvciogJy0nIHRvIGluZGljYXRlIGFwcGVuZGluZyB0byBhcnJheVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcCwgdmFsdWU6IGEyW2ldLFxuXHRcdFx0XHRjb250ZXh0OiBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSlcblx0XHRcdH0pO1xuXG5cdFx0XHRvZmZzZXQgKz0gMTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKGExW2pdLCBhMltpXSwgcCwgc3RhdGUpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzdGF0ZTtcblxuXHR9LCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gbnVtYmVyfHN0cmluZ3xudWxsIHZhbHVlcywgaWYgdGhleSBkaWZmZXIsIGFwcGVuZCB0byBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtvYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoYSAhPT0gYikge1xuXHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYSB9KTtcblx0XHR9XG5cblx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcGF0aCwgdmFsdWU6IGIgfSk7XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7Kn0geVxuICogQHJldHVybnMgeyp9IHggaWYgcHJlZGljYXRlKHgpIGlzIHRydXRoeSwgb3RoZXJ3aXNlIHlcbiAqL1xuZnVuY3Rpb24gb3JFbHNlKHByZWRpY2F0ZSwgeCwgeSkge1xuXHRyZXR1cm4gcHJlZGljYXRlKHgpID8geCA6IHk7XG59XG5cbi8qKlxuICogRGVmYXVsdCBwYXRjaCBjb250ZXh0IGdlbmVyYXRvclxuICogQHJldHVybnMge3VuZGVmaW5lZH0gdW5kZWZpbmVkIGNvbnRleHRcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdENvbnRleHQoKSB7XG5cdHJldHVybiB2b2lkIDA7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcblx0cmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjtcblxuZnVuY3Rpb24gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7XG5cbmZ1bmN0aW9uIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFRlc3RGYWlsZWRFcnJvcjtcblxuZnVuY3Rpb24gVGVzdEZhaWxlZEVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRlc3RGYWlsZWRFcnJvcjsiLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb25zID0gY29ucztcbmV4cG9ydHMudGFpbCA9IHRhaWw7XG5leHBvcnRzLm1hcCA9IG1hcDtcblxuLyoqXG4gKiBQcmVwZW5kIHggdG8gYSwgd2l0aG91dCBtdXRhdGluZyBhLiBGYXN0ZXIgdGhhbiBhLnVuc2hpZnQoeClcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSB3aXRoIHggcHJlcGVuZGVkXG4gKi9cbmZ1bmN0aW9uIGNvbnMoeCwgYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKzEpO1xuXHRiWzBdID0geDtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpKzFdID0gYVtpXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBBcnJheSBjb250YWluaW5nIGFsbCBlbGVtZW50cyBpbiBhLCBleGNlcHQgdGhlIGZpcnN0LlxuICogIEZhc3RlciB0aGFuIGEuc2xpY2UoMSlcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXksIHRoZSBlcXVpdmFsZW50IG9mIGEuc2xpY2UoMSlcbiAqL1xuZnVuY3Rpb24gdGFpbChhKSB7XG5cdHZhciBsID0gYS5sZW5ndGgtMTtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCk7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaV0gPSBhW2krMV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBNYXAgYW55IGFycmF5LWxpa2UuIEZhc3RlciB0aGFuIEFycmF5LnByb3RvdHlwZS5tYXBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgbWFwcGVkIGJ5IGZcbiAqL1xuZnVuY3Rpb24gbWFwKGYsIGEpIHtcblx0dmFyIGIgPSBuZXcgQXJyYXkoYS5sZW5ndGgpO1xuXHRmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7ICsraSkge1xuXHRcdGJbaV0gPSBmKGFbaV0pO1xuXHR9XG5cdHJldHVybiBiO1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhIGRlZXAgY29weSBvZiB4IHdoaWNoIG11c3QgYmUgYSBsZWdhbCBKU09OIG9iamVjdC9hcnJheS92YWx1ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBjbG9uZVxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGNsb25lIG9mIHhcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcblxuZnVuY3Rpb24gY2xvbmUoeCkge1xuXHRpZih4ID09IG51bGwgfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0cmV0dXJuIGNsb25lQXJyYXkoeCk7XG5cdH1cblxuXHRyZXR1cm4gY2xvbmVPYmplY3QoeCk7XG59XG5cbmZ1bmN0aW9uIGNsb25lQXJyYXkgKHgpIHtcblx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0dmFyIHkgPSBuZXcgQXJyYXkobCk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHR5W2ldID0gY2xvbmUoeFtpXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cblxuZnVuY3Rpb24gY2xvbmVPYmplY3QgKHgpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh4KTtcblx0dmFyIHkgPSB7fTtcblxuXHRmb3IgKHZhciBrLCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0ayA9IGtleXNbaV07XG5cdFx0eVtrXSA9IGNsb25lKHhba10pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG5cbi8qKlxuICogY29tbXV0ZSB0aGUgcGF0Y2ggc2VxdWVuY2UgYSxiIHRvIGIsYVxuICogQHBhcmFtIHtvYmplY3R9IGEgcGF0Y2ggb3BlcmF0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gYiBwYXRjaCBvcGVyYXRpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21tdXRlUGF0aHMoYSwgYikge1xuXHQvLyBUT0RPOiBjYXNlcyBmb3Igc3BlY2lhbCBwYXRoczogJycgYW5kICcvJ1xuXHR2YXIgbGVmdCA9IGpzb25Qb2ludGVyLnBhcnNlKGEucGF0aCk7XG5cdHZhciByaWdodCA9IGpzb25Qb2ludGVyLnBhcnNlKGIucGF0aCk7XG5cdHZhciBwcmVmaXggPSBnZXRDb21tb25QYXRoUHJlZml4KGxlZnQsIHJpZ2h0KTtcblx0dmFyIGlzQXJyYXkgPSBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgcHJlZml4Lmxlbmd0aCk7XG5cblx0Ly8gTmV2ZXIgbXV0YXRlIHRoZSBvcmlnaW5hbHNcblx0dmFyIGFjID0gY29weVBhdGNoKGEpO1xuXHR2YXIgYmMgPSBjb3B5UGF0Y2goYik7XG5cblx0aWYocHJlZml4Lmxlbmd0aCA9PT0gMCAmJiAhaXNBcnJheSkge1xuXHRcdC8vIFBhdGhzIHNoYXJlIG5vIGNvbW1vbiBhbmNlc3Rvciwgc2ltcGxlIHN3YXBcblx0XHRyZXR1cm4gW2JjLCBhY107XG5cdH1cblxuXHRpZihpc0FycmF5KSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBjb21tdXRlVHJlZVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBjb21tdXRlVHJlZVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGEucGF0aCA9PT0gYi5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IGNvbW11dGUgJyArIGEub3AgKyAnLCcgKyBiLm9wICsgJyB3aXRoIGlkZW50aWNhbCBvYmplY3QgcGF0aHMnKTtcblx0fVxuXHQvLyBGSVhNRTogSW1wbGVtZW50IHRyZWUgcGF0aCBjb21tdXRhdGlvblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2hvc2UgY29tbW9uIGFuY2VzdG9yICh3aGljaCBtYXkgYmUgdGhlIGltbWVkaWF0ZSBwYXJlbnQpXG4gKiBpcyBhbiBhcnJheVxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBsZWZ0XG4gKiBAcGFyYW0gYlxuICogQHBhcmFtIHJpZ2h0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5UGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYobGVmdC5sZW5ndGggPT09IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlTaWJsaW5ncyhhLCBsZWZ0LCBiLCByaWdodCk7XG5cdH1cblxuXHRpZiAobGVmdC5sZW5ndGggPiByaWdodC5sZW5ndGgpIHtcblx0XHQvLyBsZWZ0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSByaWdodFxuXHRcdGxlZnQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihiLCByaWdodCwgYSwgbGVmdCwgLTEpO1xuXHRcdGEucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4obGVmdCkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIHJpZ2h0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSBsZWZ0XG5cdFx0cmlnaHQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihhLCBsZWZ0LCBiLCByaWdodCwgMSk7XG5cdFx0Yi5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihyaWdodCkpO1xuXHR9XG5cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIGluZGV4KSB7XG5cdHJldHVybiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChsZWZ0W2luZGV4XSlcblx0XHQmJiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChyaWdodFtpbmRleF0pO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgcmVmZXJyaW5nIHRvIGl0ZW1zIGluIHRoZSBzYW1lIGFycmF5XG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcmV0dXJucyB7KltdfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlTaWJsaW5ncyhsLCBscGF0aCwgciwgcnBhdGgpIHtcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdHZhciBjb21tdXRlZDtcblxuXHRpZihsaW5kZXggPCByaW5kZXgpIHtcblx0XHQvLyBBZGp1c3QgcmlnaHQgcGF0aFxuXHRcdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIDEpO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IHJpbmRleCArIDE7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoci5vcCA9PT0gJ2FkZCcgfHwgci5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gbGluZGV4ICsgMTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH0gZWxzZSBpZiAobGluZGV4ID4gcmluZGV4ICYmIHIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aCBvbmx5IGlmIHJlbW92ZSB3YXMgYXQgYSAoc3RyaWN0bHkpIGxvd2VyIGluZGV4XG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCBsaW5kZXggLSAxKTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH1cblxuXHRyZXR1cm4gW3IsIGxdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2l0aCBhIGNvbW1vbiBhcnJheSBhbmNlc3RvclxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHBhcmFtIGRpcmVjdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheUFuY2VzdG9yKGwsIGxwYXRoLCByLCBycGF0aCwgZGlyZWN0aW9uKSB7XG5cdC8vIHJwYXRoIGlzIGxvbmdlciBvciBzYW1lIGxlbmd0aFxuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0Ly8gQ29weSBycGF0aCwgdGhlbiBhZGp1c3QgaXRzIGFycmF5IGluZGV4XG5cdHZhciByYyA9IHJwYXRoLnNsaWNlKCk7XG5cblx0aWYobGluZGV4ID4gcmluZGV4KSB7XG5cdFx0cmV0dXJuIHJjO1xuXHR9XG5cblx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIGRpcmVjdGlvbik7XG5cdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggKyBkaXJlY3Rpb24pO1xuXHR9XG5cblx0cmV0dXJuIHJjO1xufVxuXG5mdW5jdGlvbiBnZXRDb21tb25QYXRoUHJlZml4KHAxLCBwMikge1xuXHR2YXIgcDFsID0gcDEubGVuZ3RoO1xuXHR2YXIgcDJsID0gcDIubGVuZ3RoO1xuXHRpZihwMWwgPT09IDAgfHwgcDJsID09PSAwIHx8IChwMWwgPCAyICYmIHAybCA8IDIpKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG5cblx0Ly8gSWYgcGF0aHMgYXJlIHNhbWUgbGVuZ3RoLCB0aGUgbGFzdCBzZWdtZW50IGNhbm5vdCBiZSBwYXJ0XG5cdC8vIG9mIGEgY29tbW9uIHByZWZpeC4gIElmIG5vdCB0aGUgc2FtZSBsZW5ndGgsIHRoZSBwcmVmaXggY2Fubm90XG5cdC8vIGJlIGxvbmdlciB0aGFuIHRoZSBzaG9ydGVyIHBhdGguXG5cdHZhciBsID0gcDFsID09PSBwMmxcblx0XHQ/IHAxbCAtIDFcblx0XHQ6IE1hdGgubWluKHAxbCwgcDJsKTtcblxuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIHAxW2ldID09PSBwMltpXSkge1xuXHRcdCsraVxuXHR9XG5cblx0cmV0dXJuIHAxLnNsaWNlKDAsIGkpO1xufVxuXG5mdW5jdGlvbiBjb3B5UGF0Y2gocCkge1xuXHRpZihwLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGggfTtcblx0fVxuXG5cdGlmKHAub3AgPT09ICdjb3B5JyB8fCBwLm9wID09PSAnbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCBmcm9tOiBwLmZyb20gfTtcblx0fVxuXG5cdC8vIHRlc3QsIGFkZCwgcmVwbGFjZVxuXHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCB2YWx1ZTogcC52YWx1ZSB9O1xufSIsIm1vZHVsZS5leHBvcnRzID0gZGVlcEVxdWFscztcblxuLyoqXG4gKiBDb21wYXJlIDIgSlNPTiB2YWx1ZXMsIG9yIHJlY3Vyc2l2ZWx5IGNvbXBhcmUgMiBKU09OIG9iamVjdHMgb3IgYXJyYXlzXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGJcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBhIGFuZCBiIGFyZSByZWN1cnNpdmVseSBlcXVhbFxuICovXG5mdW5jdGlvbiBkZWVwRXF1YWxzKGEsIGIpIHtcblx0aWYoYSA9PT0gYikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVBcnJheXMoYSwgYik7XG5cdH1cblxuXHRpZih0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVPYmplY3RzKGEsIGIpO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlQXJyYXlzKGEsIGIpIHtcblx0aWYoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMDsgaTxhLmxlbmd0aDsgKytpKSB7XG5cdFx0aWYoIWRlZXBFcXVhbHMoYVtpXSwgYltpXSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZU9iamVjdHMoYSwgYikge1xuXHRpZigoYSA9PT0gbnVsbCAmJiBiICE9PSBudWxsKSB8fCAoYSAhPT0gbnVsbCAmJiBiID09PSBudWxsKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBha2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuXHR2YXIgYmtleXMgPSBPYmplY3Qua2V5cyhiKTtcblxuXHRpZihha2V5cy5sZW5ndGggIT09IGJrZXlzLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDAsIGs7IGk8YWtleXMubGVuZ3RoOyArK2kpIHtcblx0XHRrID0gYWtleXNbaV07XG5cdFx0aWYoIShrIGluIGIgJiYgZGVlcEVxdWFscyhhW2tdLCBiW2tdKSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn0iLCJ2YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGludmVyc2UocCkge1xuXHR2YXIgcHIgPSBbXTtcblx0dmFyIGksIHNraXA7XG5cdGZvcihpID0gcC5sZW5ndGgtMTsgaT49IDA7IGkgLT0gc2tpcCkge1xuXHRcdHNraXAgPSBpbnZlcnRPcChwciwgcFtpXSwgaSwgcCk7XG5cdH1cblxuXHRyZXR1cm4gcHI7XG59O1xuXG5mdW5jdGlvbiBpbnZlcnRPcChwYXRjaCwgYywgaSwgY29udGV4dCkge1xuXHR2YXIgb3AgPSBwYXRjaGVzW2Mub3BdO1xuXHRyZXR1cm4gb3AgIT09IHZvaWQgMCAmJiB0eXBlb2Ygb3AuaW52ZXJzZSA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdD8gb3AuaW52ZXJzZShwYXRjaCwgYywgaSwgY29udGV4dClcblx0XHQ6IDE7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcblxuZXhwb3J0cy5hcHBseSA9IHBhdGNoO1xuZXhwb3J0cy5hcHBseUluUGxhY2UgPSBwYXRjaEluUGxhY2U7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmlzVmFsaWRPYmplY3QgPSBpc1ZhbGlkT2JqZWN0O1xuZXhwb3J0cy5kZWZhdWx0SGFzaCA9IGRlZmF1bHRIYXNoO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcblxuLyoqXG4gKiBBcHBseSB0aGUgc3VwcGxpZWQgSlNPTiBQYXRjaCB0byB4XG4gKiBAcGFyYW0ge2FycmF5fSBjaGFuZ2VzIEpTT04gUGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIHBhdGNoXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtmdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBvcHRpb25zLmZpbmRDb250ZXh0XG4gKiAgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dFxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSBwYXRjaGVkIHZlcnNpb24gb2YgeC4gSWYgeCBpc1xuICogIGFuIGFycmF5IG9yIG9iamVjdCwgaXQgd2lsbCBiZSBtdXRhdGVkIGFuZCByZXR1cm5lZC4gT3RoZXJ3aXNlLCBpZlxuICogIHggaXMgYSB2YWx1ZSwgdGhlIG5ldyB2YWx1ZSB3aWxsIGJlIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBwYXRjaChjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdHJldHVybiBwYXRjaEluUGxhY2UoY2hhbmdlcywgY2xvbmUoeCksIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwYXRjaEluUGxhY2UoY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRpZighb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblx0fVxuXG5cdC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGlmIGNoYW5nZXMgaXMgbm90IGFuIGFycmF5XG5cdGlmKCFBcnJheS5pc0FycmF5KGNoYW5nZXMpKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHR2YXIgcGF0Y2gsIHA7XG5cdGZvcih2YXIgaT0wOyBpPGNoYW5nZXMubGVuZ3RoOyArK2kpIHtcblx0XHRwID0gY2hhbmdlc1tpXTtcblx0XHRwYXRjaCA9IHBhdGNoZXNbcC5vcF07XG5cblx0XHRpZihwYXRjaCA9PT0gdm9pZCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2ludmFsaWQgb3AgJyArIEpTT04uc3RyaW5naWZ5KHApKTtcblx0XHR9XG5cblx0XHR4ID0gcGF0Y2guYXBwbHkoeCwgcCwgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEhhc2goeCkge1xuXHRyZXR1cm4gaXNWYWxpZE9iamVjdCh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogeDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBfcGFyc2UgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyUGFyc2UnKTtcblxuZXhwb3J0cy5maW5kID0gZmluZDtcbmV4cG9ydHMuam9pbiA9IGpvaW47XG5leHBvcnRzLmFic29sdXRlID0gYWJzb2x1dGU7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5leHBvcnRzLmNvbnRhaW5zID0gY29udGFpbnM7XG5leHBvcnRzLmVuY29kZVNlZ21lbnQgPSBlbmNvZGVTZWdtZW50O1xuZXhwb3J0cy5kZWNvZGVTZWdtZW50ID0gZGVjb2RlU2VnbWVudDtcbmV4cG9ydHMucGFyc2VBcnJheUluZGV4ID0gcGFyc2VBcnJheUluZGV4O1xuZXhwb3J0cy5pc1ZhbGlkQXJyYXlJbmRleCA9IGlzVmFsaWRBcnJheUluZGV4O1xuXG4vLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtMlxudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBzZXBhcmF0b3JSeCA9IC9cXC8vZztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcbnZhciBlbmNvZGVkU2VwYXJhdG9yUnggPSAvfjEvZztcblxudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZXNjYXBlUnggPSAvfi9nO1xudmFyIGVuY29kZWRFc2NhcGUgPSAnfjAnO1xudmFyIGVuY29kZWRFc2NhcGVSeCA9IC9+MC9nO1xuXG4vKipcbiAqIEZpbmQgdGhlIHBhcmVudCBvZiB0aGUgc3BlY2lmaWVkIHBhdGggaW4geCBhbmQgcmV0dXJuIGEgZGVzY3JpcHRvclxuICogY29udGFpbmluZyB0aGUgcGFyZW50IGFuZCBhIGtleS4gIElmIHRoZSBwYXJlbnQgZG9lcyBub3QgZXhpc3QgaW4geCxcbiAqIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geCBvYmplY3Qgb3IgYXJyYXkgaW4gd2hpY2ggdG8gc2VhcmNoXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBKU09OIFBvaW50ZXIgc3RyaW5nIChlbmNvZGVkKVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gZmluZENvbnRleHRcbiAqICBvcHRpb25hbCBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0LiAgSWYgcHJvdmlkZWQsIGNvbnRleHQgTVVTVCBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHBhcmFtIHs/e2JlZm9yZTpBcnJheSwgYWZ0ZXI6QXJyYXl9fSBjb250ZXh0IG9wdGlvbmFsIHBhdGNoIGNvbnRleHQgZm9yXG4gKiAgZmluZENvbnRleHQgdG8gdXNlIHRvIGFkanVzdCBhcnJheSBpbmRpY2VzLiAgSWYgcHJvdmlkZWQsIGZpbmRDb250ZXh0IE1VU1RcbiAqICBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHJldHVybnMge3t0YXJnZXQ6b2JqZWN0fGFycmF5fG51bWJlcnxzdHJpbmcsIGtleTpzdHJpbmd9fHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZCh4LCBwYXRoLCBmaW5kQ29udGV4dCwgY29udGV4dCkge1xuXHRpZih0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZihwYXRoID09PSAnJykge1xuXHRcdC8vIHdob2xlIGRvY3VtZW50XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6IHZvaWQgMCB9O1xuXHR9XG5cblx0aWYocGF0aCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6ICcnIH07XG5cdH1cblxuXHR2YXIgcGFyZW50ID0geCwga2V5O1xuXHR2YXIgaGFzQ29udGV4dCA9IGNvbnRleHQgIT09IHZvaWQgMDtcblxuXHRfcGFyc2UocGF0aCwgZnVuY3Rpb24oc2VnbWVudCkge1xuXHRcdC8vIGhtLi4uIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQgYmUgaWYodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKVxuXHRcdGlmKHggPT0gbnVsbCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRoYXQgd2UgcHJlbWF0dXJlbHkgaGl0IHRoZSBlbmQgb2YgdGhlIHBhdGggaGllcmFyY2h5LlxuXHRcdFx0cGFyZW50ID0gbnVsbDtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0XHRrZXkgPSBoYXNDb250ZXh0XG5cdFx0XHRcdD8gZmluZEluZGV4KGZpbmRDb250ZXh0LCBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCksIHgsIGNvbnRleHQpXG5cdFx0XHRcdDogc2VnbWVudCA9PT0gJy0nID8gc2VnbWVudCA6IHBhcnNlQXJyYXlJbmRleChzZWdtZW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0a2V5ID0gc2VnbWVudDtcblx0XHR9XG5cblx0XHRwYXJlbnQgPSB4O1xuXHRcdHggPSB4W2tleV07XG5cdH0pO1xuXG5cdHJldHVybiBwYXJlbnQgPT09IG51bGxcblx0XHQ/IHZvaWQgMFxuXHRcdDogeyB0YXJnZXQ6IHBhcmVudCwga2V5OiBrZXkgfTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGUocGF0aCkge1xuXHRyZXR1cm4gcGF0aFswXSA9PT0gc2VwYXJhdG9yID8gcGF0aCA6IHNlcGFyYXRvciArIHBhdGg7XG59XG5cbmZ1bmN0aW9uIGpvaW4oc2VnbWVudHMpIHtcblx0cmV0dXJuIHNlZ21lbnRzLmpvaW4oc2VwYXJhdG9yKTtcbn1cblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuXHR2YXIgc2VnbWVudHMgPSBbXTtcblx0X3BhcnNlKHBhdGgsIHNlZ21lbnRzLnB1c2guYmluZChzZWdtZW50cykpO1xuXHRyZXR1cm4gc2VnbWVudHM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKGEsIGIpIHtcblx0cmV0dXJuIGIuaW5kZXhPZihhKSA9PT0gMCAmJiBiW2EubGVuZ3RoXSA9PT0gc2VwYXJhdG9yO1xufVxuXG4vKipcbiAqIERlY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGVuY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZGVjb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGRlY29kZVNlZ21lbnQocykge1xuXHQvLyBTZWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG5cdHJldHVybiBzLnJlcGxhY2UoZW5jb2RlZFNlcGFyYXRvclJ4LCBzZXBhcmF0b3IpLnJlcGxhY2UoZW5jb2RlZEVzY2FwZVJ4LCBlc2NhcGVDaGFyKTtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBkZWNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGVuY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBlbmNvZGVTZWdtZW50KHMpIHtcblx0cmV0dXJuIHMucmVwbGFjZShlc2NhcGVSeCwgZW5jb2RlZEVzY2FwZSkucmVwbGFjZShzZXBhcmF0b3JSeCwgZW5jb2RlZFNlcGFyYXRvcik7XG59XG5cbnZhciBhcnJheUluZGV4UnggPSAvXigwfFsxLTldXFxkKikkLztcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiBzIGlzIGEgdmFsaWQgSlNPTiBQb2ludGVyIGFycmF5IGluZGV4XG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4KHMpIHtcblx0cmV0dXJuIGFycmF5SW5kZXhSeC50ZXN0KHMpO1xufVxuXG4vKipcbiAqIFNhZmVseSBwYXJzZSBhIHN0cmluZyBpbnRvIGEgbnVtYmVyID49IDAuIERvZXMgbm90IGNoZWNrIGZvciBkZWNpbWFsIG51bWJlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIG51bWVyaWMgc3RyaW5nXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBudW1iZXIgPj0gMFxuICovXG5mdW5jdGlvbiBwYXJzZUFycmF5SW5kZXggKHMpIHtcblx0aWYoaXNWYWxpZEFycmF5SW5kZXgocykpIHtcblx0XHRyZXR1cm4gK3M7XG5cdH1cblxuXHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2ludmFsaWQgYXJyYXkgaW5kZXggJyArIHMpO1xufVxuXG5mdW5jdGlvbiBmaW5kSW5kZXggKGZpbmRDb250ZXh0LCBzdGFydCwgYXJyYXksIGNvbnRleHQpIHtcblx0dmFyIGluZGV4ID0gc3RhcnQ7XG5cblx0aWYoaW5kZXggPCAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdhcnJheSBpbmRleCBvdXQgb2YgYm91bmRzICcgKyBpbmRleCk7XG5cdH1cblxuXHRpZihjb250ZXh0ICE9PSB2b2lkIDAgJiYgdHlwZW9mIGZpbmRDb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aW5kZXggPSBmaW5kQ29udGV4dChzdGFydCwgYXJyYXksIGNvbnRleHQpO1xuXHRcdGlmKGluZGV4IDwgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBwYXRjaCBjb250ZXh0ICcgKyBjb250ZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5kZXg7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbm1vZHVsZS5leHBvcnRzID0ganNvblBvaW50ZXJQYXJzZTtcblxudmFyIHBhcnNlUnggPSAvXFwvfH4xfH4wL2c7XG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG5cbi8qKlxuICogUGFyc2UgdGhyb3VnaCBhbiBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmcsIGRlY29kaW5nIGVhY2ggcGF0aCBzZWdtZW50XG4gKiBhbmQgcGFzc2luZyBpdCB0byBhbiBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3NlY3Rpb24tNFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nXG4gKiBAcGFyYW0ge3tmdW5jdGlvbihzZWdtZW50OnN0cmluZyk6Ym9vbGVhbn19IG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMge3N0cmluZ30gb3JpZ2luYWwgcGF0aFxuICovXG5mdW5jdGlvbiBqc29uUG9pbnRlclBhcnNlKHBhdGgsIG9uU2VnbWVudCkge1xuXHR2YXIgcG9zLCBhY2N1bSwgbWF0Y2hlcywgbWF0Y2g7XG5cblx0cG9zID0gcGF0aC5jaGFyQXQoMCkgPT09IHNlcGFyYXRvciA/IDEgOiAwO1xuXHRhY2N1bSA9ICcnO1xuXHRwYXJzZVJ4Lmxhc3RJbmRleCA9IHBvcztcblxuXHR3aGlsZShtYXRjaGVzID0gcGFyc2VSeC5leGVjKHBhdGgpKSB7XG5cblx0XHRtYXRjaCA9IG1hdGNoZXNbMF07XG5cdFx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MsIHBhcnNlUngubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcblx0XHRwb3MgPSBwYXJzZVJ4Lmxhc3RJbmRleDtcblxuXHRcdGlmKG1hdGNoID09PSBzZXBhcmF0b3IpIHtcblx0XHRcdGlmIChvblNlZ21lbnQoYWNjdW0pID09PSBmYWxzZSkgcmV0dXJuIHBhdGg7XG5cdFx0XHRhY2N1bSA9ICcnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhY2N1bSArPSBtYXRjaCA9PT0gZW5jb2RlZFNlcGFyYXRvciA/IHNlcGFyYXRvciA6IGVzY2FwZUNoYXI7XG5cdFx0fVxuXHR9XG5cblx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MpO1xuXHRvblNlZ21lbnQoYWNjdW0pO1xuXG5cdHJldHVybiBwYXRoO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29tcGFyZSA9IGNvbXBhcmU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcblxudmFyIFJFTU9WRSwgUklHSFQsIEFERCwgRE9XTiwgU0tJUDtcblxuZXhwb3J0cy5SRU1PVkUgPSBSRU1PVkUgPSBSSUdIVCA9IC0xO1xuZXhwb3J0cy5BREQgICAgPSBBREQgICAgPSBET1dOICA9ICAxO1xuZXhwb3J0cy5FUVVBTCAgPSBTS0lQICAgPSAwO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBsY3MgY29tcGFyaXNvbiBtYXRyaXggZGVzY3JpYmluZyB0aGUgZGlmZmVyZW5jZXNcbiAqIGJldHdlZW4gdHdvIGFycmF5LWxpa2Ugc2VxdWVuY2VzXG4gKiBAcGFyYW0ge2FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEBwYXJhbSB7YXJyYXl9IGIgYXJyYXktbGlrZVxuICogQHJldHVybnMge29iamVjdH0gbGNzIGRlc2NyaXB0b3IsIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHJlZHVjZSgpXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuXHR2YXIgY29scyA9IGEubGVuZ3RoO1xuXHR2YXIgcm93cyA9IGIubGVuZ3RoO1xuXG5cdHZhciBwcmVmaXggPSBmaW5kUHJlZml4KGEsIGIpO1xuXHR2YXIgc3VmZml4ID0gcHJlZml4IDwgY29scyAmJiBwcmVmaXggPCByb3dzXG5cdFx0PyBmaW5kU3VmZml4KGEsIGIsIHByZWZpeClcblx0XHQ6IDA7XG5cblx0dmFyIHJlbW92ZSA9IHN1ZmZpeCArIHByZWZpeCAtIDE7XG5cdGNvbHMgLT0gcmVtb3ZlO1xuXHRyb3dzIC09IHJlbW92ZTtcblx0dmFyIG1hdHJpeCA9IGNyZWF0ZU1hdHJpeChjb2xzLCByb3dzKTtcblxuXHRmb3IgKHZhciBqID0gY29scyAtIDE7IGogPj0gMDsgLS1qKSB7XG5cdFx0Zm9yICh2YXIgaSA9IHJvd3MgLSAxOyBpID49IDA7IC0taSkge1xuXHRcdFx0bWF0cml4W2ldW2pdID0gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgcHJlZml4LCBqLCBpKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHByZWZpeDogcHJlZml4LFxuXHRcdG1hdHJpeDogbWF0cml4LFxuXHRcdHN1ZmZpeDogc3VmZml4XG5cdH07XG59XG5cbi8qKlxuICogUmVkdWNlIGEgc2V0IG9mIGxjcyBjaGFuZ2VzIHByZXZpb3VzbHkgY3JlYXRlZCB1c2luZyBjb21wYXJlXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB0eXBlOm51bWJlciwgaTpudW1iZXIsIGo6bnVtYmVyKX0gZlxuICogIHJlZHVjZXIgZnVuY3Rpb24sIHdoZXJlOlxuICogIC0gcmVzdWx0IGlzIHRoZSBjdXJyZW50IHJlZHVjZSB2YWx1ZSxcbiAqICAtIHR5cGUgaXMgdGhlIHR5cGUgb2YgY2hhbmdlOiBBREQsIFJFTU9WRSwgb3IgU0tJUFxuICogIC0gaSBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBiXG4gKiAgLSBqIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGFcbiAqIEBwYXJhbSB7Kn0gciBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzIHJlc3VsdHMgcmV0dXJuZWQgYnkgY29tcGFyZSgpXG4gKiBAcmV0dXJucyB7Kn0gdGhlIGZpbmFsIHJlZHVjZWQgdmFsdWVcbiAqL1xuZnVuY3Rpb24gcmVkdWNlKGYsIHIsIGxjcykge1xuXHR2YXIgaSwgaiwgaywgb3A7XG5cblx0dmFyIG0gPSBsY3MubWF0cml4O1xuXG5cdC8vIFJlZHVjZSBzaGFyZWQgcHJlZml4XG5cdHZhciBsID0gbGNzLnByZWZpeDtcblx0Zm9yKGkgPSAwO2kgPCBsOyArK2kpIHtcblx0XHRyID0gZihyLCBTS0lQLCBpLCBpKTtcblx0fVxuXG5cdC8vIFJlZHVjZSBsb25nZXN0IGNoYW5nZSBzcGFuXG5cdGsgPSBpO1xuXHRsID0gbS5sZW5ndGg7XG5cdGkgPSAwO1xuXHRqID0gMDtcblx0d2hpbGUoaSA8IGwpIHtcblx0XHRvcCA9IG1baV1bal0udHlwZTtcblx0XHRyID0gZihyLCBvcCwgaStrLCBqK2spO1xuXG5cdFx0c3dpdGNoKG9wKSB7XG5cdFx0XHRjYXNlIFNLSVA6ICArK2k7ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIFJJR0hUOiArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBET1dOOiAgKytpOyBicmVhaztcblx0XHR9XG5cdH1cblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHN1ZmZpeFxuXHRpICs9IGs7XG5cdGogKz0gaztcblx0bCA9IGxjcy5zdWZmaXg7XG5cdGZvcihrID0gMDtrIDwgbDsgKytrKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaStrLCBqK2spO1xuXHR9XG5cblx0cmV0dXJuIHI7XG59XG5cbmZ1bmN0aW9uIGZpbmRQcmVmaXgoYSwgYikge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBsID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcblx0d2hpbGUoaSA8IGwgJiYgYVtpXSA9PT0gYltpXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZmluZFN1ZmZpeChhLCBiKSB7XG5cdHZhciBhbCA9IGEubGVuZ3RoIC0gMTtcblx0dmFyIGJsID0gYi5sZW5ndGggLSAxO1xuXHR2YXIgbCA9IE1hdGgubWluKGFsLCBibCk7XG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgYVthbC1pXSA9PT0gYltibC1pXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgc3RhcnQsIGosIGkpIHtcblx0aWYgKGFbaitzdGFydF0gPT09IGJbaStzdGFydF0pIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqICsgMV0udmFsdWUsIHR5cGU6IFNLSVAgfTtcblx0fVxuXHRpZiAobWF0cml4W2ldW2ogKyAxXS52YWx1ZSA8IG1hdHJpeFtpICsgMV1bal0udmFsdWUpIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2ldW2ogKyAxXS52YWx1ZSArIDEsIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqXS52YWx1ZSArIDEsIHR5cGU6IERPV04gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWF0cml4IChjb2xzLCByb3dzKSB7XG5cdHZhciBtID0gW10sIGksIGosIGxhc3Ryb3c7XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCByb3dcblx0bGFzdHJvdyA9IG1bcm93c10gPSBbXTtcblx0Zm9yIChqID0gMDsgajxjb2xzOyArK2opIHtcblx0XHRsYXN0cm93W2pdID0geyB2YWx1ZTogY29scyAtIGosIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNvbFxuXHRmb3IgKGkgPSAwOyBpPHJvd3M7ICsraSkge1xuXHRcdG1baV0gPSBbXTtcblx0XHRtW2ldW2NvbHNdID0geyB2YWx1ZTogcm93cyAtIGksIHR5cGU6IERPV04gfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY2VsbFxuXHRtW3Jvd3NdW2NvbHNdID0geyB2YWx1ZTogMCwgdHlwZTogU0tJUCB9O1xuXG5cdHJldHVybiBtO1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIGRlZXBFcXVhbHMgPSByZXF1aXJlKCcuL2RlZXBFcXVhbHMnKTtcbnZhciBjb21tdXRlUGF0aHMgPSByZXF1aXJlKCcuL2NvbW11dGVQYXRocycpO1xuXG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5cbnZhciBUZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL1Rlc3RGYWlsZWRFcnJvcicpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xudmFyIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgZmluZCA9IGpzb25Qb2ludGVyLmZpbmQ7XG52YXIgcGFyc2VBcnJheUluZGV4ID0ganNvblBvaW50ZXIucGFyc2VBcnJheUluZGV4O1xuXG5leHBvcnRzLnRlc3QgPSB7XG5cdGFwcGx5OiBhcHBseVRlc3QsXG5cdGludmVyc2U6IGludmVydFRlc3QsXG5cdGNvbW11dGU6IGNvbW11dGVUZXN0XG59O1xuXG5leHBvcnRzLmFkZCA9IHtcblx0YXBwbHk6IGFwcGx5QWRkLFxuXHRpbnZlcnNlOiBpbnZlcnRBZGQsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbmV4cG9ydHMucmVtb3ZlID0ge1xuXHRhcHBseTogYXBwbHlSZW1vdmUsXG5cdGludmVyc2U6IGludmVydFJlbW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlbW92ZVxufTtcblxuZXhwb3J0cy5yZXBsYWNlID0ge1xuXHRhcHBseTogYXBwbHlSZXBsYWNlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZXBsYWNlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVwbGFjZVxufTtcblxuZXhwb3J0cy5tb3ZlID0ge1xuXHRhcHBseTogYXBwbHlNb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRNb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlTW92ZVxufTtcblxuZXhwb3J0cy5jb3B5ID0ge1xuXHRhcHBseTogYXBwbHlDb3B5LFxuXHRpbnZlcnNlOiBub3RJbnZlcnRpYmxlLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgdGVzdCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0IHRlc3Qgb3BlcmF0aW9uXG4gKiBAdGhyb3dzIHtUZXN0RmFpbGVkRXJyb3J9IGlmIHRoZSB0ZXN0IG9wZXJhdGlvbiBmYWlsc1xuICovXG5cbmZ1bmN0aW9uIGFwcGx5VGVzdCh4LCB0ZXN0LCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCB0ZXN0LnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIHRlc3QuY29udGV4dCk7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblx0dmFyIGluZGV4LCB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRpbmRleCA9IHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSk7XG5cdFx0Ly9pbmRleCA9IGZpbmRJbmRleChvcHRpb25zLmZpbmRDb250ZXh0LCBpbmRleCwgdGFyZ2V0LCB0ZXN0LmNvbnRleHQpO1xuXHRcdHZhbHVlID0gdGFyZ2V0W2luZGV4XTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHBvaW50ZXIua2V5ID09PSB2b2lkIDAgPyBwb2ludGVyLnRhcmdldCA6IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0fVxuXG5cdGlmKCFkZWVwRXF1YWxzKHZhbHVlLCB0ZXN0LnZhbHVlKSkge1xuXHRcdHRocm93IG5ldyBUZXN0RmFpbGVkRXJyb3IoJ3Rlc3QgZmFpbGVkICcgKyBKU09OLnN0cmluZ2lmeSh0ZXN0KSk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuLyoqXG4gKiBJbnZlcnQgdGhlIHByb3ZpZGVkIHRlc3QgYW5kIGFkZCBpdCB0byB0aGUgaW52ZXJ0ZWQgcGF0Y2ggc2VxdWVuY2VcbiAqIEBwYXJhbSBwclxuICogQHBhcmFtIHRlc3RcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGludmVydFRlc3QocHIsIHRlc3QpIHtcblx0cHIucHVzaCh0ZXN0KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVUZXN0KHRlc3QsIGIpIHtcblx0aWYodGVzdC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgdGVzdCxyZW1vdmUgLT4gcmVtb3ZlLHRlc3QgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgdGVzdF07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHRlc3QsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGFuIGFkZCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgYWRkIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUFkZCh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWwgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsO1xuXHR9XG5cblx0X2FkZChwb2ludGVyLCB2YWwpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX2FkZChwb2ludGVyLCB2YWx1ZSkge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0Ly8gJy0nIGluZGljYXRlcyAnYXBwZW5kJyB0byBhcnJheVxuXHRcdGlmKHBvaW50ZXIua2V5ID09PSAnLScpIHtcblx0XHRcdHRhcmdldC5wdXNoKHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LnNwbGljZShwb2ludGVyLmtleSwgMCwgdmFsdWUpO1xuXHRcdH1cblx0fSBlbHNlIGlmKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiBhZGQgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXkgJyArIHBvaW50ZXIua2V5KTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRBZGQocHIsIGFkZCkge1xuXHR2YXIgY29udGV4dCA9IGFkZC5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKGFkZC52YWx1ZSwgY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IGFkZC5wYXRoLCB2YWx1ZTogYWRkLnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBhZGQucGF0aCwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVBZGRPckNvcHkoYWRkLCBiKSB7XG5cdGlmKGFkZC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgYWRkLHJlbW92ZSAtPiByZW1vdmUsYWRkIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMoYWRkLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlcGxhY2Ugb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlcGxhY2Ugb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVwbGFjZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgbWlzc2luZ1ZhbHVlKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsdWUgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydFJlcGxhY2UocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZXBsYWNlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhwcmV2LnZhbHVlLCBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBjLnZhbHVlIH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZXBsYWNlKHJlcGxhY2UsIGIpIHtcblx0aWYocmVwbGFjZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgcmVwbGFjZSxyZW1vdmUgLT4gcmVtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgcmVwbGFjZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlcGxhY2UsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZW1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHQvLyBrZXkgbXVzdCBleGlzdCBmb3IgcmVtb3ZlXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHRfcmVtb3ZlKHBvaW50ZXIpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZSAocG9pbnRlcikge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0dmFyIHJlbW92ZWQ7XG5cdGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0LnNwbGljZShwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpLCAxKTtcblx0XHRyZXR1cm4gcmVtb3ZlZFswXTtcblxuXHR9IGVsc2UgaWYgKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdGRlbGV0ZSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdHJldHVybiByZW1vdmVkO1xuXG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgcmVtb3ZlIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVtb3ZlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVtb3ZlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVtb3ZlKHJlbW92ZSwgYikge1xuXHRpZihyZW1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIFtiLCByZW1vdmVdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZW1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlNb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHRpZihqc29uUG9pbnRlci5jb250YWlucyhjaGFuZ2UucGF0aCwgY2hhbmdlLmZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdtb3ZlLmZyb20gY2Fubm90IGJlIGFuY2VzdG9yIG9mIG1vdmUucGF0aCcpO1xuXHR9XG5cblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRfYWRkKHB0bywgX3JlbW92ZShwZnJvbSkpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0TW92ZShwciwgYykge1xuXHRwci5wdXNoKHsgb3A6ICdtb3ZlJyxcblx0XHRwYXRoOiBjLmZyb20sIGNvbnRleHQ6IGMuZnJvbUNvbnRleHQsXG5cdFx0ZnJvbTogYy5wYXRoLCBmcm9tQ29udGV4dDogYy5jb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1vdmUobW92ZSwgYikge1xuXHRpZihtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBtb3ZlLHJlbW92ZSAtPiBtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIGNvcHkgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGNvcHkgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5Q29weSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwZnJvbSkgfHwgbWlzc2luZ1ZhbHVlKHBmcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignY29weS5mcm9tIG11c3QgZXhpc3QnKTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwZnJvbS50YXJnZXQ7XG5cdHZhciB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwYXJzZUFycmF5SW5kZXgocGZyb20ua2V5KV07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGZyb20ua2V5XTtcblx0fVxuXG5cdF9hZGQocHRvLCBjbG9uZSh2YWx1ZSkpO1xuXHRyZXR1cm4geDtcbn1cblxuLy8gTk9URTogQ29weSBpcyBub3QgaW52ZXJ0aWJsZVxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvamlmZi9pc3N1ZXMvOVxuLy8gVGhpcyBuZWVkcyBtb3JlIHRob3VnaHQuIFdlIG1heSBoYXZlIHRvIGV4dGVuZC9hbWVuZCBKU09OIFBhdGNoLlxuLy8gQXQgZmlyc3QgZ2xhbmNlLCB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGp1c3QgYmUgYSByZW1vdmUuXG4vLyBIb3dldmVyLCB0aGF0J3Mgbm90IGNvcnJlY3QuICBJdCB2aW9sYXRlcyB0aGUgaW52b2x1dGlvbjpcbi8vIGludmVydChpbnZlcnQocCkpIH49IHAuICBGb3IgZXhhbXBsZTpcbi8vIGludmVydChjb3B5KSAtPiByZW1vdmVcbi8vIGludmVydChyZW1vdmUpIC0+IGFkZFxuLy8gdGh1czogaW52ZXJ0KGludmVydChjb3B5KSkgLT4gYWRkIChET0ghIHRoaXMgc2hvdWxkIGJlIGNvcHkhKVxuXG5mdW5jdGlvbiBub3RJbnZlcnRpYmxlKF8sIGMpIHtcblx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0ICcgKyBjLm9wKTtcbn1cblxuZnVuY3Rpb24gbm90Rm91bmQgKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIgPT09IHZvaWQgMCB8fCAocG9pbnRlci50YXJnZXQgPT0gbnVsbCAmJiBwb2ludGVyLmtleSAhPT0gdm9pZCAwKTtcbn1cblxuZnVuY3Rpb24gbWlzc2luZ1ZhbHVlKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIua2V5ICE9PSB2b2lkIDAgJiYgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDA7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgeCBpcyBhIG5vbi1udWxsIG9iamVjdFxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59XG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcblxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcblxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXG5cbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkQ29udGVudFxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcblxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAc3RhdGUgPVxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxuICAgIEBfbGlzdGVuZXJzID0gW11cbiAgICBAX3Jlc2V0U3RhdGUoKVxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcbiAgICBAcHJvdmlkZXJzID0ge31cblxuICBzZXRBcHBPcHRpb25zOiAoQGFwcE9wdGlvbnMgPSB7fSktPlxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXG5cbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnByb3ZpZGVyc1xuICAgICAgQGFwcE9wdGlvbnMucHJvdmlkZXJzID0gW11cbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xuICAgICAgICBhcHBPcHRpb25zLnByb3ZpZGVycy5wdXNoIHByb3ZpZGVyTmFtZVxuXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXG4gICAgYXZhaWxhYmxlUHJvdmlkZXJzID0gW11cbiAgICBmb3IgcHJvdmlkZXIgaW4gQGFwcE9wdGlvbnMucHJvdmlkZXJzXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cbiAgICAgICMgbWVyZ2UgaW4gb3RoZXIgb3B0aW9ucyBhcyBuZWVkZWRcbiAgICAgIHByb3ZpZGVyT3B0aW9ucy5taW1lVHlwZSA/PSBAYXBwT3B0aW9ucy5taW1lVHlwZVxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxuICAgICAgZWxzZVxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cbiAgICAgICAgICBwcm92aWRlciA9IG5ldyBQcm92aWRlciBwcm92aWRlck9wdGlvbnMsIEBcbiAgICAgICAgICBAcHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV0gPSBwcm92aWRlclxuICAgICAgICAgIGF2YWlsYWJsZVByb3ZpZGVycy5wdXNoIHByb3ZpZGVyXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcbiAgICBAX3NldFN0YXRlIGF2YWlsYWJsZVByb3ZpZGVyczogYXZhaWxhYmxlUHJvdmlkZXJzXG5cbiAgICAjIGFkZCBzaW5nbGV0b24gc2hhcmVQcm92aWRlciwgaWYgaXQgZXhpc3RzXG4gICAgZm9yIHByb3ZpZGVyIGluIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcbiAgICAgIGlmIHByb3ZpZGVyLmNhbiAnc2hhcmUnXG4gICAgICAgIEBfc2V0U3RhdGUgc2hhcmVQcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgYnJlYWtcblxuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxuXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcbiAgICBpZiBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXG4gICAgICBAYXV0b1NhdmUgQGFwcE9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxuXG4gICAgIyBpbml0aWFsaXplIHRoZSBjbG91ZENvbnRlbnRGYWN0b3J5IHdpdGggYWxsIGRhdGEgd2Ugd2FudCBpbiB0aGUgZW52ZWxvcGVcbiAgICBjbG91ZENvbnRlbnRGYWN0b3J5LnNldEVudmVsb3BlTWV0YWRhdGFcbiAgICAgIGFwcE5hbWU6IEBhcHBPcHRpb25zLmFwcE5hbWUgb3IgXCJcIlxuICAgICAgYXBwVmVyc2lvbjogQGFwcE9wdGlvbnMuYXBwVmVyc2lvbiBvciBcIlwiXG4gICAgICBhcHBCdWlsZE51bTogQGFwcE9wdGlvbnMuYXBwQnVpbGROdW0gb3IgXCJcIlxuXG4gICAgQG5ld0ZpbGVPcGVuc0luTmV3VGFiID0gaWYgQGFwcE9wdGlvbnMudWk/Lmhhc093blByb3BlcnR5KCduZXdGaWxlT3BlbnNJbk5ld1RhYicpIHRoZW4gQGFwcE9wdGlvbnMudWkubmV3RmlsZU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXG4gICAgQHNhdmVDb3B5T3BlbnNJbk5ld1RhYiA9IGlmIEBhcHBPcHRpb25zLnVpPy5oYXNPd25Qcm9wZXJ0eSgnc2F2ZUNvcHlPcGVuc0luTmV3VGFiJykgdGhlbiBAYXBwT3B0aW9ucy51aS5zYXZlQ29weU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXG5cbiAgc2V0UHJvdmlkZXJPcHRpb25zOiAobmFtZSwgbmV3T3B0aW9ucykgLT5cbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgcHJvdmlkZXIubmFtZSBpcyBuYW1lXG4gICAgICAgIHByb3ZpZGVyLm9wdGlvbnMgPz0ge31cbiAgICAgICAgZm9yIGtleSBvZiBuZXdPcHRpb25zXG4gICAgICAgICAgcHJvdmlkZXIub3B0aW9uc1trZXldID0gbmV3T3B0aW9uc1trZXldXG4gICAgICAgIGJyZWFrXG5cbiAgY29ubmVjdDogLT5cbiAgICBAX2V2ZW50ICdjb25uZWN0ZWQnLCB7Y2xpZW50OiBAfVxuXG4gIGxpc3RlbjogKGxpc3RlbmVyKSAtPlxuICAgIGlmIGxpc3RlbmVyXG4gICAgICBAX2xpc3RlbmVycy5wdXNoIGxpc3RlbmVyXG5cbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbTsgQFxuXG4gIHByZXBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XG4gICAgQF91aS5wcmVwZW5kTWVudUl0ZW0gaXRlbTsgQFxuXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cbiAgICBAX3VpLnJlcGxhY2VNZW51SXRlbSBrZXksIGl0ZW07IEBcblxuICBpbnNlcnRNZW51SXRlbUJlZm9yZTogKGtleSwgaXRlbSkgLT5cbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQmVmb3JlIGtleSwgaXRlbTsgQFxuXG4gIGluc2VydE1lbnVJdGVtQWZ0ZXI6IChrZXksIGl0ZW0pIC0+XG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUFmdGVyIGtleSwgaXRlbTsgQFxuXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cblxuICBuZXdGaWxlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXG4gICAgQF9yZXNldFN0YXRlKClcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnLCB7Y29udGVudDogXCJcIn1cblxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBuZXdGaWxlT3BlbnNJbk5ld1RhYlxuICAgICAgd2luZG93Lm9wZW4gQF9nZXRDdXJyZW50VXJsKCksICdfYmxhbmsnXG4gICAgZWxzZSBpZiBAc3RhdGUuZGlydHlcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAgIEBzYXZlKClcbiAgICAgICAgQG5ld0ZpbGUoKVxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5ORVdfRklMRSdcbiAgICAgICAgQG5ld0ZpbGUoKVxuICAgIGVsc2VcbiAgICAgIEBuZXdGaWxlKClcblxuICBvcGVuRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2xvYWQnXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAX2Nsb3NlQ3VycmVudEZpbGUoKVxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xuXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcbiAgICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgb3BlblNoYXJlZENvbnRlbnQ6IChpZCkgLT5cbiAgICBAc3RhdGUuc2hhcmVQcm92aWRlcj8ubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxuICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge292ZXJ3cml0YWJsZTogZmFsc2UsIG9wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cblxuICBvcGVuU2F2ZWQ6IChwYXJhbXMpIC0+XG4gICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJQYXJhbXNdID0gcGFyYW1zLnNwbGl0ICc6J1xuICAgIHByb3ZpZGVyID0gQHByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgaWYgcHJvdmlkZXJcbiAgICAgIHByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XG4gICAgICAgIGlmIGF1dGhvcml6ZWRcbiAgICAgICAgICBwcm92aWRlci5vcGVuU2F2ZWQgcHJvdmlkZXJQYXJhbXMsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxuICAgICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX1cblxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpID0+XG4gICAgICBAc2F2ZUNvbnRlbnQgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlQ29udGVudDogKHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGU6IChzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xuICAgICAgQF9zZXRTdGF0ZVxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXG4gICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50LCBtZXRhZGF0YVxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBpc250IG1ldGFkYXRhXG4gICAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY3VycmVudENvbnRlbnQsIG1ldGFkYXRhLCB7c2F2ZWQ6IHRydWV9XG4gICAgICAgIGNhbGxiYWNrPyBjdXJyZW50Q29udGVudCwgbWV0YWRhdGFcbiAgICBlbHNlXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgc3RyaW5nQ29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlRmlsZURpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAX2RpYWxvZ1NhdmUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBfZGlhbG9nU2F2ZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBzYXZlQ29weURpYWxvZzogKHN0cmluZ0NvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgc2F2ZUNvcHkgPSAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEpID0+XG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgc3RyaW5nQ29udGVudFxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgaWYgQHNhdmVDb3B5T3BlbnNJbk5ld1RhYlxuICAgICAgICAgIHdpbmRvdy5vcGVuIEBfZ2V0Q3VycmVudFVybCBcIm9wZW5TYXZlZD0je21ldGFkYXRhLnByb3ZpZGVyLm5hbWV9OiN7ZW5jb2RlVVJJQ29tcG9uZW50IG1ldGFkYXRhLnByb3ZpZGVyLmdldE9wZW5TYXZlZFBhcmFtcyBtZXRhZGF0YX1cIlxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcbiAgICBAX3VpLnNhdmVDb3B5RGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIGlmIHN0cmluZ0NvbnRlbnQgaXMgbnVsbFxuICAgICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSAtPlxuICAgICAgICAgIHNhdmVDb3B5IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXG4gICAgICBlbHNlXG4gICAgICAgIHNhdmVDb3B5IHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhXG5cbiAgc2hhcmVHZXRMaW5rOiAtPlxuICAgIHNob3dTaGFyZURpYWxvZyA9IChzaGFyZWREb2N1bWVudElkKSA9PlxuICAgICAgQF91aS5zaGFyZVVybERpYWxvZyBAX2dldEN1cnJlbnRVcmwgXCJvcGVuU2hhcmVkPSN7c2hhcmVkRG9jdW1lbnRJZH1cIlxuXG4gICAgc2hhcmVkRG9jdW1lbnRJZCA9IEBzdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0IFwic2hhcmVkRG9jdW1lbnRJZFwiXG4gICAgaWYgc2hhcmVkRG9jdW1lbnRJZFxuICAgICAgc2hvd1NoYXJlRGlhbG9nIHNoYXJlZERvY3VtZW50SWRcbiAgICBlbHNlXG4gICAgICBAc2hhcmUgKHNoYXJlZERvY3VtZW50SWQpID0+XG4gICAgICAgIEBkaXJ0eSgpXG4gICAgICAgIHNob3dTaGFyZURpYWxvZyBzaGFyZWREb2N1bWVudElkXG5cbiAgc2hhcmVVcGRhdGU6IC0+XG4gICAgQHNoYXJlKClcblxuICBzaGFyZTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIEBzdGF0ZS5zaGFyZVByb3ZpZGVyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxuICAgICAgICBAX3NldFN0YXRlXG4gICAgICAgICAgc2hhcmluZzogdHJ1ZVxuICAgICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50XG4gICAgICAgIEBzdGF0ZS5zaGFyZVByb3ZpZGVyLnNoYXJlIGN1cnJlbnRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIChlcnIsIHNoYXJlZENvbnRlbnRJZCkgPT5cbiAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NoYXJlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAgICAgY2FsbGJhY2s/IHNoYXJlZENvbnRlbnRJZFxuXG4gIHJldmVydFRvU2hhcmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlkID0gQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXG4gICAgaWYgaWQgYW5kIEBzdGF0ZS5zaGFyZVByb3ZpZGVyP1xuICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQuY29weU1ldGFkYXRhVG8gY29udGVudFxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XG4gICAgICAgIGNhbGxiYWNrPyBudWxsXG5cbiAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj8gYW5kIGNvbmZpcm0gdHIgXCJ+Q09ORklSTS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIlxuICAgICAgQHJldmVydFRvU2hhcmVkIGNhbGxiYWNrXG5cbiAgZG93bmxvYWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cbiAgICAgIEBfdWkuZG93bmxvYWREaWFsb2cgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCBAYXBwT3B0aW9ucy5taW1lVHlwZSwgY29udGVudCwgY2FsbGJhY2tcblxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XG4gICAgaWYgbmV3TmFtZSBpc250IEBzdGF0ZS5tZXRhZGF0YS5uYW1lXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKGVyciwgbWV0YWRhdGEpID0+XG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudD8uYWRkTWV0YWRhdGEgZG9jTmFtZTogbWV0YWRhdGEubmFtZVxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdyZW5hbWVkRmlsZScsIEBzdGF0ZS5jdXJyZW50Q29udGVudCwgbWV0YWRhdGFcbiAgICAgICAgY2FsbGJhY2s/IG5ld05hbWVcblxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGEubmFtZSwgKG5ld05hbWUpID0+XG4gICAgICAgIEByZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xuXG4gIHJldmVydFRvTGFzdE9wZW5lZDogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIEBzdGF0ZS5vcGVuZWRDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBAc3RhdGUub3BlbmVkQ29udGVudC5jbG9uZSgpfVxuXG4gIHJldmVydFRvTGFzdE9wZW5lZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uUkVWRVJUX1RPX0xBU1RfT1BFTkVEJ1xuICAgICAgICBAcmV2ZXJ0VG9MYXN0T3BlbmVkIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgY2FsbGJhY2s/ICdObyBpbml0aWFsIG9wZW5lZCB2ZXJzaW9uIHdhcyBmb3VuZCBmb3IgdGhlIGN1cnJlbnRseSBhY3RpdmUgZmlsZSdcblxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XG4gICAgQF9zZXRTdGF0ZVxuICAgICAgZGlydHk6IGlzRGlydHlcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XG5cbiAgYXV0b1NhdmU6IChpbnRlcnZhbCkgLT5cbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcbiAgICAgIGNsZWFySW50ZXJ2YWwgQF9hdXRvU2F2ZUludGVydmFsXG5cbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xuICAgIGlmIGludGVydmFsID4gMTAwMFxuICAgICAgaW50ZXJ2YWwgPSBNYXRoLnJvdW5kKGludGVydmFsIC8gMTAwMClcbiAgICBpZiBpbnRlcnZhbCA+IDBcbiAgICAgIEBfYXV0b1NhdmVJbnRlcnZhbCA9IHNldEludGVydmFsICg9PiBAc2F2ZSgpIGlmIEBzdGF0ZS5kaXJ0eSBhbmQgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJyksIChpbnRlcnZhbCAqIDEwMDApXG5cbiAgaXNBdXRvU2F2aW5nOiAtPlxuICAgIEBfYXV0b1NhdmVJbnRlcnZhbD9cblxuICBzaG93QmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XG4gICAgQF91aS5ibG9ja2luZ01vZGFsIG1vZGFsUHJvcHNcblxuICBfZGlhbG9nU2F2ZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBpZiBzdHJpbmdDb250ZW50IGlzbnQgbnVsbFxuICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKHN0cmluZ0NvbnRlbnQpID0+XG4gICAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZXJyb3I6IChtZXNzYWdlKSAtPlxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxuICAgIGFsZXJ0IG1lc3NhZ2VcblxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSwgYWRkaXRpb25hbFN0YXRlPXt9KSAtPlxuICAgIG1ldGFkYXRhPy5vdmVyd3JpdGFibGUgPz0gdHJ1ZVxuICAgIHN0YXRlID1cbiAgICAgIGN1cnJlbnRDb250ZW50OiBjb250ZW50XG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICAgIHNhdmluZzogbnVsbFxuICAgICAgc2F2ZWQ6IGZhbHNlXG4gICAgICBkaXJ0eTogZmFsc2VcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgYWRkaXRpb25hbFN0YXRlXG4gICAgICBzdGF0ZVtrZXldID0gdmFsdWVcbiAgICBAX3NldFN0YXRlIHN0YXRlXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudC5nZXRUZXh0KCl9XG5cbiAgX2V2ZW50OiAodHlwZSwgZGF0YSA9IHt9LCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXG4gICAgZm9yIGxpc3RlbmVyIGluIEBfbGlzdGVuZXJzXG4gICAgICBsaXN0ZW5lciBldmVudFxuXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcbiAgICAgIEBzdGF0ZVtrZXldID0gdmFsdWVcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXG5cbiAgX3Jlc2V0U3RhdGU6IC0+XG4gICAgQF9zZXRTdGF0ZVxuICAgICAgb3BlbmVkQ29udGVudDogbnVsbFxuICAgICAgY3VycmVudENvbnRlbnQ6IG51bGxcbiAgICAgIG1ldGFkYXRhOiBudWxsXG4gICAgICBkaXJ0eTogZmFsc2VcbiAgICAgIHNhdmluZzogbnVsbFxuICAgICAgc2F2ZWQ6IGZhbHNlXG5cbiAgX2Nsb3NlQ3VycmVudEZpbGU6IC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdjbG9zZSdcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5jbG9zZSBAc3RhdGUubWV0YWRhdGFcblxuICBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudDogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/XG4gICAgICBjdXJyZW50Q29udGVudCA9IEBzdGF0ZS5jdXJyZW50Q29udGVudFxuICAgICAgY3VycmVudENvbnRlbnQuc2V0VGV4dCBzdHJpbmdDb250ZW50XG4gICAgZWxzZVxuICAgICAgY3VycmVudENvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBzdHJpbmdDb250ZW50XG4gICAgaWYgbWV0YWRhdGE/XG4gICAgICBjdXJyZW50Q29udGVudC5hZGRNZXRhZGF0YSBkb2NOYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgY3VycmVudENvbnRlbnRcblxuICBfZ2V0Q3VycmVudFVybDogKHF1ZXJ5U3RyaW5nID0gbnVsbCkgLT5cbiAgICBzdWZmaXggPSBpZiBxdWVyeVN0cmluZz8gdGhlbiBcIj8je3F1ZXJ5U3RyaW5nfVwiIGVsc2UgXCJcIlxuICAgIFwiI3tkb2N1bWVudC5sb2NhdGlvbi5vcmlnaW59I3tkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0je3N1ZmZpeH1cIlxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cblxuZG9jdW1lbnRTdG9yZSA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb21cIlxuYXV0aG9yaXplVXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcbmxpc3RVcmwgICAgICAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2FsbFwiXG5sb2FkRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9vcGVuXCJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxucGF0Y2hEb2N1bWVudFVybCAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcGF0Y2hcIlxucmVtb3ZlRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvZGVsZXRlXCJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5jbGVhbiA9IHJlcXVpcmUgJy4uL3V0aWxzL2NsZWFuLW9iamVjdCdcbmppZmYgPSByZXF1aXJlICdqaWZmJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGRvY1N0b3JlQXZhaWxhYmxlOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX29uRG9jU3RvcmVMb2FkZWQgPT5cbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxuXG4gIGF1dGhlbnRpY2F0ZTogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSxcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXG4gICAgKVxuXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcbiAgICAgICAgc2hhcmU6IHRydWVcbiAgICAgICAgY2xvc2U6IGZhbHNlXG5cbiAgICBAdXNlciA9IG51bGxcblxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXG5cbiAgcHJldmlvdXNseVNhdmVkQ29udGVudDogbnVsbFxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEB1c2VyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxuICAgICAgZWxzZVxuICAgICAgICBAX2NoZWNrTG9naW4oKVxuICAgIGVsc2VcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogLT5cbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXG5cbiAgX29uRG9jU3RvcmVMb2FkZWQ6IChAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaykgLT5cbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXG4gICAgICBAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXG5cbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxuICAgIEBfbG9naW5XaW5kb3c/LmNsb3NlKClcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcblxuICBfY2hlY2tMb2dpbjogLT5cbiAgICBwcm92aWRlciA9IEBcbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxuXG4gIF9sb2dpbldpbmRvdzogbnVsbFxuXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcbiAgICBlbHNlXG5cbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcblxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cblxuICAgICAgd2lkdGggPSAxMDAwXG4gICAgICBoZWlnaHQgPSA0ODBcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxuICAgICAgICAnZGVwZW5kZW50PXllcydcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xuICAgICAgICAnZGlhbG9nPXllcydcbiAgICAgICAgJ21lbnViYXI9bm8nXG4gICAgICBdXG5cbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxuXG4gICAgICBwb2xsQWN0aW9uID0gPT5cbiAgICAgICAgdHJ5XG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXG4gICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAjIGNvbnNvbGUubG9nIGVcblxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcblxuICByZW5kZXJVc2VyOiAtPlxuICAgIGlmIEB1c2VyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWljb24nfSksIEB1c2VyLm5hbWUpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgJC5hamF4XG4gICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICB1cmw6IGxpc3RVcmxcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZVxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxuXG4gIGxvYWRTaGFyZWRDb250ZW50OiAoaWQsIGNhbGxiYWNrKSAtPlxuICAgIHNoYXJlZE1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgIHNoYXJlZENvbnRlbnRJZDogaWRcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgb3ZlcndyaXRhYmxlOiBmYWxzZVxuICAgIEBsb2FkIHNoYXJlZE1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBzaGFyZWRNZXRhZGF0YVxuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgd2l0aENyZWRlbnRpYWxzID0gdW5sZXNzIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZCB0aGVuIHRydWUgZWxzZSBmYWxzZVxuICAgICQuYWpheFxuICAgICAgdXJsOiBsb2FkRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB7d2l0aENyZWRlbnRpYWxzfVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBkYXRhXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjb250ZW50LmNsb25lKClcbiAgICAgICAgbWV0YWRhdGEubmFtZSA/PSBkYXRhLmRvY05hbWVcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIG1lc3NhZ2UgPSBpZiBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWRcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkIGRvY3VtZW50ICcje21ldGFkYXRhLnNoYXJlZENvbnRlbnRJZH0nLiBQZXJoYXBzIHRoZSBmaWxlIHdhcyBub3Qgc2hhcmVkP1wiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBcIlVuYWJsZSB0byBsb2FkICN7bWV0YWRhdGEubmFtZSBvciBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yICdmaWxlJ31cIlxuICAgICAgICBjYWxsYmFjayBtZXNzYWdlXG5cbiAgc2hhcmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgcnVuS2V5ID0gY29udGVudC5nZXQoXCJzaGFyZUVkaXRLZXlcIikgb3IgTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDIpXG5cbiAgICBwYXJhbXMgPVxuICAgICAgcnVuS2V5OiBydW5LZXlcblxuICAgIGlmIGNvbnRlbnQuZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxuICAgICAgcGFyYW1zLnJlY29yZGlkID0gY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXG5cbiAgICBjb250ZW50LmFkZE1ldGFkYXRhXG4gICAgICBfcGVybWlzc2lvbnM6IDFcbiAgICAgIHNoYXJlRWRpdEtleTogbnVsbCAgICAgICAgICAgICMgc3RyaXAgdGhlc2Ugb3V0IG9mIHRoZSBzaGFyZWQgZGF0YSBpZiB0aGV5XG4gICAgICBzaGFyZWREb2N1bWVudElkOiBudWxsICAgICAgICAjIGV4aXN0ICh0aGV5J2xsIGJlIHJlLWFkZGVkIG9uIHN1Y2Nlc3MpXG5cbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhzYXZlRG9jdW1lbnRVcmwsIHBhcmFtcylcblxuICAgICQuYWpheFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgbWV0aG9kOiAnUE9TVCdcbiAgICAgIHVybDogdXJsXG4gICAgICBkYXRhOiBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgY29udGVudC5hZGRNZXRhZGF0YVxuICAgICAgICAgIHNoYXJlZERvY3VtZW50SWQ6IGRhdGEuaWRcbiAgICAgICAgICBzaGFyZUVkaXRLZXk6IHJ1bktleVxuICAgICAgICAgIF9wZXJtaXNzaW9uczogMFxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhLmlkXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gc2F2ZSBcIittZXRhZGF0YS5uYW1lXG5cbiAgc2F2ZTogKGNsb3VkQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnQuZ2V0Q29udGVudCgpXG5cbiAgICBwYXJhbXMgPSB7fVxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXG4gICAgY2FuT3ZlcndyaXRlID0gbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudD9cbiAgICBpZiBjYW5PdmVyd3JpdGUgYW5kIGRpZmYgPSBAX2NyZWF0ZURpZmYgQHByZXZpb3VzbHlTYXZlZENvbnRlbnQuZ2V0Q29udGVudCgpLCBjb250ZW50XG4gICAgICBzZW5kQ29udGVudCA9IGRpZmZcbiAgICAgIHVybCA9IHBhdGNoRG9jdW1lbnRVcmxcbiAgICBlbHNlXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIHRoZW4gcGFyYW1zLnJlY29yZG5hbWUgPSBtZXRhZGF0YS5uYW1lXG4gICAgICB1cmwgPSBzYXZlRG9jdW1lbnRVcmxcbiAgICAgIHNlbmRDb250ZW50ID0gY29udGVudFxuXG4gICAgdXJsID0gQF9hZGRQYXJhbXModXJsLCBwYXJhbXMpXG5cbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgICB1cmw6IHVybFxuICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkgc2VuZENvbnRlbnRcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgaWYgQG9wdGlvbnMucGF0Y2ggdGhlbiBAcHJldmlvdXNseVNhdmVkQ29udGVudCA9IGNsb3VkQ29udGVudC5jbG9uZSgpXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXG5cbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmUgXCIrbWV0YWRhdGEubmFtZVxuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZG5hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHJlbmFtZSBcIittZXRhZGF0YS5uYW1lXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHByb3ZpZGVyOiBAXG4gICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcblxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XG4gICAgcmV0dXJuIHVybCB1bmxlc3MgcGFyYW1zXG4gICAga3ZwID0gW11cbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcbiAgICAgIGt2cC5wdXNoIFtrZXksIHZhbHVlXS5tYXAoZW5jb2RlVVJJKS5qb2luIFwiPVwiXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcblxuICBfY3JlYXRlRGlmZjogKG9iajEsIG9iajIpIC0+XG4gICAgdHJ5XG4gICAgICBvcHRzID1cbiAgICAgICAgaGFzaDogQG9wdGlvbnMucGF0Y2hPYmplY3RIYXNoIGlmIHR5cGVvZiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaXMgXCJmdW5jdGlvblwiXG4gICAgICAjIGNsZWFuIG9iamVjdHMgYmVmb3JlIGRpZmZpbmdcbiAgICAgIFtvYmoxLG9iajJdLm1hcCBjbGVhblxuICAgICAgZGlmZiA9IGppZmYuZGlmZihvYmoxLCBvYmoyLCBvcHRzKVxuICAgICAgcmV0dXJuIGRpZmZcbiAgICBjYXRjaFxuICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcbmpzZGlmZiA9IHJlcXVpcmUgJ2RpZmYnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXG5cbiAgYXV0aGVudGljYXRlOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xuICAgIClcblxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgIGNsb3NlOiB0cnVlXG5cbiAgICBAYXV0aFRva2VuID0gbnVsbFxuICAgIEB1c2VyID0gbnVsbFxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXG4gICAgaWYgbm90IEBjbGllbnRJZFxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsZURyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcbiAgICBAdXNlUmVhbFRpbWVBUEkgPSBAb3B0aW9ucy51c2VSZWFsVGltZUFQSSBvciBmYWxzZVxuICAgIGlmIEB1c2VSZWFsVGltZUFQSVxuICAgICAgQG1pbWVUeXBlICs9ICcrY2ZtX3JlYWx0aW1lJ1xuICAgIEBfbG9hZEdBUEkoKVxuXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXG5cbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcbiAgQElNTUVESUFURSA9IHRydWVcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEBhdXRoVG9rZW5cbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcbiAgICBlbHNlXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIGFyZ3MgPVxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXG4gICAgICAgIEB1c2VyID0gbnVsbFxuICAgICAgICBAYXV0b1JlbmV3VG9rZW4gQGF1dGhUb2tlblxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dG9SZW5ld1Rva2VuOiAoYXV0aFRva2VuKSAtPlxuICAgIGlmIEBfYXV0b1JlbmV3VGltZW91dFxuICAgICAgY2xlYXJUaW1lb3V0IEBfYXV0b1JlbmV3VGltZW91dFxuICAgIGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvclxuICAgICAgQF9hdXRvUmVuZXdUaW1lb3V0ID0gc2V0VGltZW91dCAoPT4gQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURSksIChwYXJzZUludChhdXRoVG9rZW4uZXhwaXJlc19pbiwgMTApICogMC43NSkgKiAxMDAwXG5cbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cbiAgICAoR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQH0pXG5cbiAgcmVuZGVyVXNlcjogLT5cbiAgICBpZiBAdXNlclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdnZHJpdmUtaWNvbid9KSwgQHVzZXIubmFtZSlcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJID0+XG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcbiAgICAgICAgQF9zYXZlUmVhbFRpbWVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgICAgZWxzZVxuICAgICAgICBAX3NhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJID0+XG4gICAgICBpZiBAdXNlUmVhbFRpbWVBUElcbiAgICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgICBlbHNlXG4gICAgICAgIEBfbG9hZEZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XG4gICAgICAgIHE6IHF1ZXJ5ID0gXCIoKG1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfScpIG9yIChtaW1lVHlwZSA9ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykpIGFuZCAnI3tpZiBtZXRhZGF0YSB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J30nIGluIHBhcmVudHNcIlxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XG4gICAgICAgIHJldHVybiBjYWxsYmFjaygnVW5hYmxlIHRvIGxpc3QgZmlsZXMnKSBpZiBub3QgcmVzdWx0XG4gICAgICAgIGxpc3QgPSBbXVxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXG4gICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwYXJlbnQ6IG1ldGFkYXRhXG4gICAgICAgICAgICBvdmVyd3JpdGFibGU6IGl0ZW0uZWRpdGFibGVcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgICAgICAgIGlkOiBpdGVtLmlkXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxuICAgICAgICAgIHJldHVybiAwXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJIC0+XG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgLT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5wYXRjaFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgICAgICByZXNvdXJjZTpcbiAgICAgICAgICB0aXRsZTogbmV3TmFtZVxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XG4gICAgICAgIGlmIHJlc3VsdD8uZXJyb3JcbiAgICAgICAgICBjYWxsYmFjaz8gcmVzdWx0LmVycm9yXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXG5cbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5yZWFsVGltZT8uZG9jP1xuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmRvYy5jbG9zZSgpXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHByb3ZpZGVyOiBAXG4gICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cbiAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcblxuICBfbG9hZEdBUEk6IC0+XG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXG4gICAgICB3aW5kb3cuX0dBUElPbkxvYWQgPSAtPlxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xuICAgICAgc2NyaXB0LnNyYyA9ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQuanM/b25sb2FkPV9HQVBJT25Mb2FkJ1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcblxuICBfbG9hZGVkR0FQSTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcbiAgICAgIGNhbGxiYWNrKClcbiAgICBlbHNlXG4gICAgICBzZWxmID0gQFxuICAgICAgY2hlY2sgPSAtPlxuICAgICAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxuICAgICAgICAgICAgICBnYXBpLmxvYWQgJ2RyaXZlLXJlYWx0aW1lJywgLT5cbiAgICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcbiAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXG5cbiAgX2xvYWRGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcbiAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IGZpbGUudGl0bGVcbiAgICAgICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gZmlsZS5lZGl0YWJsZVxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxuICAgICAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgICB4aHIub3BlbiAnR0VUJywgZmlsZS5kb3dubG9hZFVybFxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje0BhdXRoVG9rZW4uYWNjZXNzX3Rva2VufVwiXG4gICAgICAgIHhoci5vbmxvYWQgPSAtPlxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgeGhyLm9uZXJyb3IgPSAtPlxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXG4gICAgICAgIHhoci5zZW5kKClcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXG5cbiAgX3NhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnlcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXG4gICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXG5cbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxuICAgIGVsc2VcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cblxuICAgIGJvZHkgPSBbXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50LmdldENvbnRlbnRBc0pTT04oKX1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcbiAgICBdLmpvaW4gJydcblxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XG4gICAgICBwYXRoOiBwYXRoXG4gICAgICBtZXRob2Q6IG1ldGhvZFxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxuICAgICAgYm9keTogYm9keVxuXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgaWYgY2FsbGJhY2tcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXG4gICAgICAgIGVsc2UgaWYgZmlsZVxuICAgICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgQF9hcGlFcnJvciBmaWxlLCAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcblxuICBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHNlbGYgPSBAXG4gICAgZmlsZUxvYWRlZCA9IChkb2MpIC0+XG4gICAgICBjb250ZW50ID0gZG9jLmdldE1vZGVsKCkuZ2V0Um9vdCgpLmdldCAnY29udGVudCdcbiAgICAgIGlmIG1ldGFkYXRhLm92ZXJ3cml0YWJsZVxuICAgICAgICB0aHJvd0Vycm9yID0gKGUpIC0+XG4gICAgICAgICAgaWYgbm90IGUuaXNMb2NhbCBhbmQgZS5zZXNzaW9uSWQgaXNudCBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuc2Vzc2lvbklkXG4gICAgICAgICAgICBzZWxmLmNsaWVudC5zaG93QmxvY2tpbmdNb2RhbFxuICAgICAgICAgICAgICB0aXRsZTogJ0NvbmN1cnJlbnQgRWRpdCBMb2NrJ1xuICAgICAgICAgICAgICBtZXNzYWdlOiAnQW4gZWRpdCB3YXMgbWFkZSB0byB0aGlzIGZpbGUgZnJvbSBhbm90aGVyIGJyb3dzZXIgd2luZG93LiBUaGlzIGFwcCBpcyBub3cgbG9ja2VkIGZvciBpbnB1dC4nXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0lOU0VSVEVELCB0aHJvd0Vycm9yXG4gICAgICAgIGNvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lciBnYXBpLmRyaXZlLnJlYWx0aW1lLkV2ZW50VHlwZS5URVhUX0RFTEVURUQsIHRocm93RXJyb3JcbiAgICAgIGZvciBjb2xsYWJvcmF0b3IgaW4gZG9jLmdldENvbGxhYm9yYXRvcnMoKVxuICAgICAgICBzZXNzaW9uSWQgPSBjb2xsYWJvcmF0b3Iuc2Vzc2lvbklkIGlmIGNvbGxhYm9yYXRvci5pc01lXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUgPVxuICAgICAgICBkb2M6IGRvY1xuICAgICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICAgIHNlc3Npb25JZDogc2Vzc2lvbklkXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBjb250ZW50LmdldFRleHQoKVxuXG4gICAgaW5pdCA9IChtb2RlbCkgLT5cbiAgICAgIGNvbnRlbnQgPSBtb2RlbC5jcmVhdGVTdHJpbmcgJydcbiAgICAgIG1vZGVsLmdldFJvb3QoKS5zZXQgJ2NvbnRlbnQnLCBjb250ZW50XG5cbiAgICBlcnJvciA9IChlcnIpID0+XG4gICAgICBpZiBlcnIudHlwZSBpcyAnVE9LRU5fUkVGUkVTSF9SRVFVSVJFRCdcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxuICAgICAgZWxzZVxuICAgICAgICBhbGVydCBlcnIubWVzc2FnZVxuXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgIGVsc2VcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5pbnNlcnRcbiAgICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcbiAgICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxuICAgICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXG5cbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XG4gICAgICBpZiBmaWxlPy5pZFxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gZmlsZS50aXRsZVxuICAgICAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSBmaWxlLmVkaXRhYmxlXG4gICAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YSA9IGlkOiBmaWxlLmlkXG4gICAgICAgIGdhcGkuZHJpdmUucmVhbHRpbWUubG9hZCBmaWxlLmlkLCBmaWxlTG9hZGVkLCBpbml0LCBlcnJvclxuICAgICAgZWxzZVxuICAgICAgICBjYWxsYmFjayBAX2FwaUVycm9yIGZpbGUsICdVbmFibGUgdG8gbG9hZCBmaWxlJ1xuXG4gIF9zYXZlUmVhbFRpbWVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8ubW9kZWxcbiAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIChlcnIpID0+XG4gICAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGluZGV4ID0gMFxuICAgIHJlYWxUaW1lQ29udGVudCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5jb250ZW50XG4gICAgZGlmZnMgPSBqc2RpZmYuZGlmZkNoYXJzIHJlYWxUaW1lQ29udGVudC5nZXRUZXh0KCksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXG4gICAgZm9yIGRpZmYgaW4gZGlmZnNcbiAgICAgIGlmIGRpZmYucmVtb3ZlZFxuICAgICAgICByZWFsVGltZUNvbnRlbnQucmVtb3ZlUmFuZ2UgaW5kZXgsIGluZGV4ICsgZGlmZi52YWx1ZS5sZW5ndGhcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgZGlmZi5hZGRlZFxuICAgICAgICAgIHJlYWxUaW1lQ29udGVudC5pbnNlcnRTdHJpbmcgaW5kZXgsIGRpZmYudmFsdWVcbiAgICAgICAgaW5kZXggKz0gZGlmZi5jb3VudFxuICAgIGNhbGxiYWNrIG51bGxcblxuICBfYXBpRXJyb3I6IChyZXN1bHQsIHByZWZpeCkgLT5cbiAgICBpZiByZXN1bHQ/Lm1lc3NhZ2U/XG4gICAgICBcIiN7cHJlZml4fTogI3tyZXN1bHQubWVzc2FnZX1cIlxuICAgIGVsc2VcbiAgICAgIHByZWZpeFxuXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgIGNsb3NlOiBmYWxzZVxuXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xuICBAQXZhaWxhYmxlOiAtPlxuICAgIHJlc3VsdCA9IHRyeVxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXG4gICAgICB0cnVlXG4gICAgY2F0Y2hcbiAgICAgIGZhbHNlXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGZpbGVLZXkgPSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXG4gICAgICBjYWxsYmFjaz8gbnVsbFxuICAgIGNhdGNoIGVcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXG4gICAgY2F0Y2ggZVxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcblxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGxpc3QgPSBbXVxuICAgIHByZWZpeCA9IEBfZ2V0S2V5IChtZXRhZGF0YT8ucGF0aCgpIG9yIFtdKS5qb2luICcvJ1xuICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XG4gICAgICAgIFtmaWxlbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxuICAgICAgICBuYW1lID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICBuYW1lOiBuYW1lXG4gICAgICAgICAgdHlwZTogaWYgcmVtYWluZGVyLmxlbmd0aCA+IDAgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcbiAgICAgICAgICBwcm92aWRlcjogQFxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcbiAgICAgIGNhbGxiYWNrPyBudWxsXG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcblxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShuZXdOYW1lKSwgY29udGVudFxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXG4gICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxuICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcbiAgICBjYXRjaFxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gcmVuYW1lJ1xuXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XG4gICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgbmFtZTogb3BlblNhdmVkUGFyYW1zXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIHBhcmVudDogbnVsbFxuICAgICAgcHJvdmlkZXI6IEBcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgbWV0YWRhdGFcblxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChjbGllbnRNZXRhZGF0YSwgc2F2ZWRNZXRhZGF0YSkgLT5cbiAgICBzYXZlZE1ldGFkYXRhLm5hbWVcblxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RvcmFnZVByb3ZpZGVyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuY2xhc3MgQ2xvdWRGaWxlXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXG5cbmNsYXNzIENsb3VkTWV0YWRhdGFcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQHR5cGUsIEBwcm92aWRlciA9IG51bGwsIEBwYXJlbnQgPSBudWxsLCBAcHJvdmlkZXJEYXRhPXt9LCBAb3ZlcndyaXRhYmxlLCBAc2hhcmVkQ29udGVudElkLCBAc2hhcmVkQ29udGVudFNlY3JldEtleX0gPSBvcHRpb25zXG4gIEBGb2xkZXI6ICdmb2xkZXInXG4gIEBGaWxlOiAnZmlsZSdcblxuICBwYXRoOiAtPlxuICAgIF9wYXRoID0gW11cbiAgICBwYXJlbnQgPSBAcGFyZW50XG4gICAgd2hpbGUgcGFyZW50IGlzbnQgbnVsbFxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcbiAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRcbiAgICBfcGF0aFxuXG4jIHNpbmdsZXRvbiB0aGF0IGNhbiBjcmVhdGUgQ2xvdWRDb250ZW50IHdyYXBwZWQgd2l0aCBnbG9iYWwgb3B0aW9uc1xuY2xhc3MgQ2xvdWRDb250ZW50RmFjdG9yeVxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAZW52ZWxvcGVNZXRhZGF0YSA9IHt9XG5cbiAgIyBzZXQgaW5pdGlhbCBlbnZlbG9wZU1ldGFkYXRhIG9yIHVwZGF0ZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcbiAgc2V0RW52ZWxvcGVNZXRhZGF0YTogKGVudmVsb3BlTWV0YWRhdGEpIC0+XG4gICAgZm9yIGtleSBvZiBlbnZlbG9wZU1ldGFkYXRhXG4gICAgICBAZW52ZWxvcGVNZXRhZGF0YVtrZXldID0gZW52ZWxvcGVNZXRhZGF0YVtrZXldXG5cbiAgIyByZXR1cm5zIG5ldyBDbG91ZENvbnRlbnQgY29udGFpbmluZyBlbnZlbG9wZWQgZGF0YVxuICBjcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgIG5ldyBDbG91ZENvbnRlbnQgQGVudmVsb3BDb250ZW50IGNvbnRlbnRcblxuICAjIGVudmVsb3BzIGNvbnRlbnQgd2l0aCBtZXRhZGF0YSwgcmV0dXJucyBhbiBvYmplY3QuXG4gICMgSWYgY29udGVudCB3YXMgYWxyZWFkeSBhbiBvYmplY3QgKE9iamVjdCBvciBKU09OKSB3aXRoIG1ldGFkYXRhLFxuICAjIGFueSBleGlzdGluZyBtZXRhZGF0YSB3aWxsIGJlIHJldGFpbmVkLlxuICAjIE5vdGU6IGNhbGxpbmcgYGVudmVsb3BDb250ZW50YCBtYXkgYmUgc2FmZWx5IGNhbGxlZCBvbiBzb21ldGhpbmcgdGhhdFxuICAjIGhhcyBhbHJlYWR5IGhhZCBgZW52ZWxvcENvbnRlbnRgIGNhbGxlZCBvbiBpdCwgYW5kIHdpbGwgYmUgYSBuby1vcC5cbiAgZW52ZWxvcENvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgIGVudmVsb3BlZENsb3VkQ29udGVudCA9IEBfd3JhcElmTmVlZGVkIGNvbnRlbnRcbiAgICBmb3Iga2V5IG9mIEBlbnZlbG9wZU1ldGFkYXRhXG4gICAgICBlbnZlbG9wZWRDbG91ZENvbnRlbnRba2V5XSA/PSBAZW52ZWxvcGVNZXRhZGF0YVtrZXldXG4gICAgcmV0dXJuIGVudmVsb3BlZENsb3VkQ29udGVudFxuXG4gICMgZW52ZWxvcHMgY29udGVudCBpbiB7Y29udGVudDogY29udGVudH0gaWYgbmVlZGVkLCByZXR1cm5zIGFuIG9iamVjdFxuICBfd3JhcElmTmVlZGVkOiAoY29udGVudCkgLT5cbiAgICBpZiBpc1N0cmluZyBjb250ZW50XG4gICAgICB0cnkgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxuICAgIGlmIGNvbnRlbnQuY29udGVudD9cbiAgICAgIHJldHVybiBjb250ZW50XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHtjb250ZW50fVxuXG5jbGFzcyBDbG91ZENvbnRlbnRcbiAgY29uc3RydWN0b3I6IChAXyA9IHt9KSAtPlxuXG4gIGdldENvbnRlbnQ6IC0+IEBfXG4gIGdldENvbnRlbnRBc0pTT046ICAtPiBKU09OLnN0cmluZ2lmeSBAX1xuXG4gIGNsb25lOiAtPiBuZXcgQ2xvdWRDb250ZW50IF8uY2xvbmVEZWVwIEBfXG5cbiAgc2V0VGV4dDogKHRleHQpIC0+IEBfLmNvbnRlbnQgPSB0ZXh0XG4gIGdldFRleHQ6IC0+IGlmIEBfLmNvbnRlbnQgaXMgbnVsbCB0aGVuICcnIGVsc2UgaWYgaXNTdHJpbmcoQF8uY29udGVudCkgdGhlbiBAXy5jb250ZW50IGVsc2UgSlNPTi5zdHJpbmdpZnkgQF8uY29udGVudFxuXG4gIGFkZE1ldGFkYXRhOiAobWV0YWRhdGEpIC0+IEBfW2tleV0gPSBtZXRhZGF0YVtrZXldIGZvciBrZXkgb2YgbWV0YWRhdGFcbiAgZ2V0OiAocHJvcCkgLT4gQF9bcHJvcF1cblxuICBjb3B5TWV0YWRhdGFUbzogKHRvKSAtPlxuICAgIG1ldGFkYXRhID0ge31cbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgQF9cbiAgICAgIGlmIGtleSBpc250ICdjb250ZW50J1xuICAgICAgICBtZXRhZGF0YVtrZXldID0gdmFsdWVcbiAgICB0by5hZGRNZXRhZGF0YSBtZXRhZGF0YVxuXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXG5cbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxuXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBpZiBjYWxsYmFja1xuICAgICAgY2FsbGJhY2sgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxuICAgIChBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cge3Byb3ZpZGVyOiBAfSlcblxuICByZW5kZXJVc2VyOiAtPlxuICAgIG51bGxcblxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdkaWFsb2cnXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdzYXZlJ1xuXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdsb2FkJ1xuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbGlzdCdcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVtb3ZlJ1xuXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdyZW5hbWUnXG5cbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnY2xvc2UnXG5cbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdvcGVuU2F2ZWQnXG5cbiAgZ2V0T3BlblNhdmVkUGFyYW1zOiAobWV0YWRhdGEpIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZ2V0T3BlblNhdmVkUGFyYW1zJ1xuXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXG4gIENsb3VkTWV0YWRhdGE6IENsb3VkTWV0YWRhdGFcbiAgQ2xvdWRDb250ZW50OiBDbG91ZENvbnRlbnRcbiAgY2xvdWRDb250ZW50RmFjdG9yeTogbmV3IENsb3VkQ29udGVudEZhY3RvcnkoKVxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IFJlYWRPbmx5UHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IGZhbHNlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IGZhbHNlXG4gICAgICAgIHJlbmFtZTogZmFsc2VcbiAgICAgICAgY2xvc2U6IGZhbHNlXG4gICAgQHRyZWUgPSBudWxsXG5cbiAgQE5hbWU6ICdyZWFkT25seSdcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICBzdWJUcmVlID0gQF9maW5kU3ViVHJlZSBtZXRhZGF0YVxuICAgICAgaWYgc3ViVHJlZVxuICAgICAgICBpZiBzdWJUcmVlW21ldGFkYXRhLm5hbWVdXG4gICAgICAgICAgaWYgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIGxpc3QgPSBbXVxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcbiAgICAgIGlmIHN1YlRyZWVcbiAgICAgICAgbGlzdC5wdXNoIGZpbGUubWV0YWRhdGEgZm9yIG93biBmaWxlbmFtZSwgZmlsZSBvZiBzdWJUcmVlXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XG5cbiAgX2ZpbmRTdWJUcmVlOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5jaGlsZHJlblxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnBhcmVudFxuICAgICAgbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5jaGlsZHJlblxuICAgIGVsc2VcbiAgICAgIEB0cmVlXG5cbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XG4gICAgaWYgQHRyZWUgaXNudCBudWxsXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XG4gICAgICAgIGlmIGVyclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxuICAgICAgICBlbHNlXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcbiAgICAgICQuYWpheFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXG4gICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PlxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgICAgICBlcnJvcjogLT4gY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBqc29uIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxuICAgIGVsc2VcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxuICAgICAgY2FsbGJhY2sgbnVsbCwge31cblxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhcmVudCA9IG51bGwpIC0+XG4gICAgdHJlZSA9IHt9XG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgIHBhcmVudDogcGFyZW50XG4gICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIHByb3ZpZGVyRGF0YTpcbiAgICAgICAgICBjaGlsZHJlbjogbnVsbFxuICAgICAgaWYgdHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW4gPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIG1ldGFkYXRhXG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQganNvbltmaWxlbmFtZV1cbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cbiAgICAgICAgY29udGVudDogY29udGVudFxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICB0cmVlXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhZE9ubHlQcm92aWRlclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XG5cbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSkgLT5cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3JldmVydFN1Yk1lbnUnLCAnc2VwYXJhdG9yJywgJ3NhdmUnLCAnc2F2ZUNvcHlEaWFsb2cnLCAnc2hhcmVTdWJNZW51JywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XG4gICAgQGl0ZW1zID0gQHBhcnNlTWVudUl0ZW1zIG9wdGlvbnMubWVudSwgY2xpZW50XG4gICAgY29uc29sZS5kaXIgQGl0ZW1zXG5cbiAgcGFyc2VNZW51SXRlbXM6IChtZW51SXRlbXMsIGNsaWVudCkgLT5cbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXG5cbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cbiAgICAgIHN3aXRjaCBhY3Rpb25cbiAgICAgICAgd2hlbiAncmV2ZXJ0U3ViTWVudSdcbiAgICAgICAgICAtPiAoY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/KSBvciBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJ1xuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xuICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXG4gICAgICAgIHdoZW4gJ3NoYXJlR2V0TGluaycsICdzaGFyZVN1Yk1lbnUnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XG4gICAgICAgIHdoZW4gJ3JldmVydFRvU2hhcmVkRGlhbG9nJ1xuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRydWVcblxuICAgIGdldEl0ZW1zID0gKHN1Yk1lbnVJdGVtcykgPT5cbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xuICAgICAgICBAcGFyc2VNZW51SXRlbXMgc3ViTWVudUl0ZW1zLCBjbGllbnRcbiAgICAgIGVsc2VcbiAgICAgICAgbnVsbFxuXG4gICAgbmFtZXMgPVxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxuICAgICAgb3BlbkZpbGVEaWFsb2c6IHRyIFwifk1FTlUuT1BFTlwiXG4gICAgICByZXZlcnRUb0xhc3RPcGVuZWREaWFsb2c6IHRyIFwifk1FTlUuUkVWRVJUX1RPX0xBU1RfT1BFTkVEXCJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXG4gICAgICBzYXZlOiB0ciBcIn5NRU5VLlNBVkVcIlxuICAgICAgc2F2ZUZpbGVBc0RpYWxvZzogdHIgXCJ+TUVOVS5TQVZFX0FTXCJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXG4gICAgICBzaGFyZUdldExpbms6IHRyIFwifk1FTlUuU0hBUkVfR0VUX0xJTktcIlxuICAgICAgc2hhcmVVcGRhdGU6IHRyIFwifk1FTlUuU0hBUkVfVVBEQVRFXCJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcbiAgICAgIHJlbmFtZURpYWxvZzogdHIgXCJ+TUVOVS5SRU5BTUVcIlxuICAgICAgcmV2ZXJ0U3ViTWVudTogdHIgXCJ+TUVOVS5SRVZFUlRfVE9cIlxuICAgICAgc2hhcmVTdWJNZW51OiB0ciBcIn5NRU5VLlNIQVJFXCJcblxuICAgIHN1Yk1lbnVzID1cbiAgICAgIHJldmVydFN1Yk1lbnU6IFsncmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nJywgJ3JldmVydFRvU2hhcmVkRGlhbG9nJ11cbiAgICAgIHNoYXJlU3ViTWVudTogWydzaGFyZUdldExpbmsnLCAnc2hhcmVVcGRhdGUnXVxuXG4gICAgaXRlbXMgPSBbXVxuICAgIGZvciBpdGVtLCBpIGluIG1lbnVJdGVtc1xuICAgICAgaWYgaXRlbSBpcyAnc2VwYXJhdG9yJ1xuICAgICAgICBtZW51SXRlbSA9XG4gICAgICAgICAga2V5OiBcInNlcGVyYXRvciN7aX1cIlxuICAgICAgICAgIHNlcGFyYXRvcjogdHJ1ZVxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXG4gICAgICAgIG1lbnVJdGVtID1cbiAgICAgICAgICBrZXk6IGl0ZW1cbiAgICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxuICAgICAgICAgIGVuYWJsZWQ6IHNldEVuYWJsZWQgaXRlbVxuICAgICAgICAgIGl0ZW1zOiBnZXRJdGVtcyBzdWJNZW51c1tpdGVtXVxuICAgICAgICAgIGFjdGlvbjogc2V0QWN0aW9uIGl0ZW1cbiAgICAgIGVsc2VcbiAgICAgICAgbWVudUl0ZW0gPSBpdGVtXG4gICAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxuICAgICAgICAgIG1lbnVJdGVtLmtleSA9IGl0ZW0uYWN0aW9uXG4gICAgICAgICAgbWVudUl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbS5hY3Rpb25cbiAgICAgICAgZWxzZVxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgb3I9IHRydWVcbiAgICAgICAgbWVudUl0ZW0uaXRlbXMgPSBpdGVtLml0ZW1zIG9yIGdldEl0ZW1zIGl0ZW0ubmFtZVxuICAgICAgaXRlbXMucHVzaCBtZW51SXRlbVxuICAgIGl0ZW1zXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxuXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxuICAgIEBtZW51ID0gbnVsbFxuXG4gIGluaXQ6IChvcHRpb25zKSAtPlxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XG5cbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cblxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cblxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncHJlcGVuZE1lbnVJdGVtJywgaXRlbVxuXG4gIHJlcGxhY2VNZW51SXRlbTogKGtleSwgaXRlbSkgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3JlcGxhY2VNZW51SXRlbScsXG4gICAgICBrZXk6IGtleVxuICAgICAgaXRlbTogaXRlbVxuXG4gIGluc2VydE1lbnVJdGVtQmVmb3JlOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnLFxuICAgICAga2V5OiBrZXlcbiAgICAgIGl0ZW06IGl0ZW1cblxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnaW5zZXJ0TWVudUl0ZW1BZnRlcicsXG4gICAgICBrZXk6IGtleVxuICAgICAgaXRlbTogaXRlbVxuXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xuXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcblxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xuXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQ29weScsICh0ciAnfkRJQUxPRy5TQVZFX0NPUFknKSwgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXG5cbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgbWltZVR5cGUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd0Rvd25sb2FkRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgbWltZVR5cGU6IG1pbWVUeXBlXG4gICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgc2hhcmVVcmxEaWFsb2c6ICh1cmwpIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93U2hhcmVVcmxEaWFsb2cnLFxuICAgICAgdXJsOiB1cmxcblxuICBibG9ja2luZ01vZGFsOiAobW9kYWxQcm9wcykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dCbG9ja2luZ01vZGFsJywgbW9kYWxQcm9wc1xuXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXG4gICAgICBhY3Rpb246IGFjdGlvblxuICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcbiAgQ2xvdWRGaWxlTWFuYWdlclVJOiBDbG91ZEZpbGVNYW5hZ2VyVUlcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuIiwiIyByZW1vdmVzIGFsbCBwcm9wZXJ0aWVzIHdpdGggbnVsbCBvciB1bmRlZmluZWQgdmFsdWVzXG5jbGVhbiA9IChvYmopIC0+XG4gIGZvciBvd24ga2V5IG9mIG9ialxuICAgIHVubGVzcyBvYmpba2V5XT9cbiAgICAgIGRlbGV0ZSBvYmpba2V5XVxuICAgIGVsc2UgaWYgb2JqW2tleV0gaW5zdGFuY2VvZiBPYmplY3RcbiAgICAgIGNsZWFuIG9ialtrZXldXG5cbm1vZHVsZS5leHBvcnRzID0gY2xlYW5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+XG4gIHJldCA9IG51bGxcbiAgbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKS5zcGxpdChcIiZcIikuc29tZSAocGFpcikgLT5cbiAgICBwYWlyLnNwbGl0KFwiPVwiKVswXSBpcyBwYXJhbSBhbmQgKHJldCA9IHBhaXIuc3BsaXQoXCI9XCIpWzFdKVxuICByZXRcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXG4iLCJtb2R1bGUuZXhwb3J0cyA9XG4gIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXG5cbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG4gIFwifk1FTlUuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcbiAgXCJ+TUVOVS5TSEFSRVwiOiBcIlNoYXJlLi4uXCJcbiAgXCJ+TUVOVS5TSEFSRV9HRVRfTElOS1wiOiBcIkdldCBsaW5rIHRvIHNoYXJlZCB2aWV3XCJcbiAgXCJ+TUVOVS5TSEFSRV9VUERBVEVcIjogXCJVcGRhdGUgc2hhcmVkIHZpZXdcIlxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXG4gIFwifk1FTlUuUkVWRVJUX1RPXCI6IFwiUmV2ZXJ0IHRvLi4uXCJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJSZWNlbnRseSBvcGVuZWQgc3RhdGVcIlxuICBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIlNoYXJlZCB2aWV3XCJcblxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcbiAgXCJ+RElBTE9HLlNBVkVfQ09QWVwiOiBcIlNhdmUgQSBDb3B5IC4uLlwiXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcbiAgXCJ+RElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXG4gIFwifkRJQUxPRy5TSEFSRURcIjogXCJTaGFyZWQgRG9jdW1lbnRcIlxuXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXG5cbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxuXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlcIjogXCJDb3B5XCJcbiAgXCJ+U0hBUkVfRElBTE9HLlZJRVdcIjogXCJWaWV3XCJcbiAgXCJ+U0hBUkVfRElBTE9HLkNMT1NFXCI6IFwiQ2xvc2VcIlxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9TVUNDRVNTXCI6IFwiVGhlIHNoYXJlIHVybCBoYXMgYmVlbiBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9FUlJPUlwiOiBcIlNvcnJ5LCB0aGUgc2hhcmUgdXJsIHdhcyBub3QgYWJsZSB0byBiZSBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxuXG4gIFwifkNPTkZJUk0uT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IG9wZW4gYSBuZXcgZmlsZT9cIlxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcbiAgXCJ+Q09ORklSTS5SRVZFUlRfVE9fTEFTVF9PUEVORURcIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgcmV2ZXJ0IHRoZSBmaWxlIHRvIGl0cyBtb3N0IHJlY2VudGx5IG9wZW5lZCBzdGF0ZT9cIlxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gY3VycmVudGx5IHNoYXJlZCB2aWV3P1wiXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcbmRlZmF1bHRMYW5nID0gJ2VuJ1xudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xuXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcblxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcblNoYXJlVXJsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NoYXJlLXVybC1kaWFsb2ctdmlldydcbkJsb2NraW5nTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vYmxvY2tpbmctbW9kYWwtdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxuXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcblxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXG4gICAgKVxuXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcblxuICBnZXRGaWxlbmFtZTogLT5cbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIGFuZCBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWU/Lmxlbmd0aCA+IDBcbiAgICAgIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZVxuICAgIGVsc2VcbiAgICAgICh0ciBcIn5NRU5VQkFSLlVOVElUTEVEX0RPQ1VNRU5UXCIpXG5cbiAgZ2V0UHJvdmlkZXI6IC0+XG4gICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXG4gICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cbiAgICBwcm92aWRlckRpYWxvZzogbnVsbFxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXG4gICAgc2hhcmVVcmxEaWFsb2c6IG51bGxcbiAgICBkaXJ0eTogZmFsc2VcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XG4gICAgICBlbHNlXG4gICAgICAgIG51bGxcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICAgICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcblxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG5cbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdzaG93U2hhcmVVcmxEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlVXJsRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dCbG9ja2luZ01vZGFsJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBibG9ja2luZ01vZGFsUHJvcHM6IGV2ZW50LmRhdGFcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnVuc2hpZnQgZXZlbnQuZGF0YVxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAnaW5zZXJ0TWVudUl0ZW1CZWZvcmUnXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcbiAgICAgICAgICBpZiBpbmRleCBpc250IC0xXG4gICAgICAgICAgICBpZiBpbmRleCBpcyAwXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXgsIDAsIGV2ZW50LmRhdGEuaXRlbVxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xuICAgICAgICB3aGVuICdpbnNlcnRNZW51SXRlbUFmdGVyJ1xuICAgICAgICAgIGluZGV4ID0gQF9nZXRNZW51SXRlbUluZGV4IGV2ZW50LmRhdGEua2V5XG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxuICAgICAgICAgICAgaWYgaW5kZXggaXMgQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5zcGxpY2UgaW5kZXggKyAxLCAwLCBldmVudC5kYXRhLml0ZW1cbiAgICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcblxuICBfZ2V0TWVudUl0ZW1JbmRleDogKGtleSkgLT5cbiAgICBpZiBpc1N0cmluZyBrZXlcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXG4gICAgICAgIHJldHVybiBpbmRleCBpZiBpdGVtLmtleSBpcyBrZXlcbiAgICAgIC0xXG4gICAgZWxzZVxuICAgICAgaW5kZXggPSBwYXJzZUludCBrZXksIDEwXG4gICAgICBpZiBpc05hTihpbmRleCkgb3IgaW5kZXggPCAwIG9yIGluZGV4ID4gQHN0YXRlLm1lbnVJdGVtcy5sZW5ndGggLSAxXG4gICAgICAgIC0xXG4gICAgICBlbHNlXG4gICAgICAgIGluZGV4XG5cbiAgY2xvc2VEaWFsb2dzOiAtPlxuICAgIEBzZXRTdGF0ZVxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcbiAgICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXG4gICAgICByZW5hbWVEaWFsb2c6IG51bGxcbiAgICAgIHNoYXJlVXJsRGlhbG9nOiBudWxsXG5cbiAgcmVuZGVyRGlhbG9nczogLT5cbiAgICBpZiBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzXG4gICAgICAoQmxvY2tpbmdNb2RhbCBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzKVxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBtaW1lVHlwZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLm1pbWVUeXBlLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG4gICAgZWxzZSBpZiBAc3RhdGUuc2hhcmVVcmxEaWFsb2dcbiAgICAgIChTaGFyZVVybERpYWxvZyB7dXJsOiBAc3RhdGUuc2hhcmVVcmxEaWFsb2cudXJsLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG5cbiAgcmVuZGVyOiAtPlxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXG4gICAgICAgIChNZW51QmFyIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXG4gICAgICApXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkF1dGhvcml6ZU1peGluID1cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcblxuICByZW5kZXI6IC0+XG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXG4gICAgZWxzZVxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQmxvY2tpbmdNb2RhbCdcblxuICBjbG9zZTogLT5cbiAgICBAcHJvcHMuY2xvc2U/KClcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXG4gICAgICAgICAgKVxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSxcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy1ibG9ja2luZy1tZXNzYWdlJ30sIEBwcm9wcy5tZXNzYWdlKVxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXG5cbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xuICAgIHN0YXRlID1cbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXG4gICAgQGZpbGVuYW1lLmZvY3VzKClcblxuICB1cGRhdGVGaWxlbmFtZTogLT5cbiAgICBmaWxlbmFtZSA9IEBmaWxlbmFtZS52YWx1ZVxuICAgIEBzZXRTdGF0ZVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgdHJpbTogKHMpIC0+XG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXG5cbiAgZG93bmxvYWQ6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgZS50YXJnZXQuc2V0QXR0cmlidXRlICdocmVmJywgXCJkYXRhOiN7QHByb3BzLm1pbWVUeXBlfSwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudC5nZXRUZXh0KCkpfVwiXG4gICAgICBAcHJvcHMuY2xvc2UoKVxuICAgIGVsc2VcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxuICAgICAgICApXG4gICAgICApXG4gICAgKVxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpLCBzdmcsIGcsIHJlY3R9ID0gUmVhY3QuRE9NXG5cbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcblxuICBjbGlja2VkOiAtPlxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cblxuICBtb3VzZUVudGVyOiAtPlxuICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXG4gICAgICBtZW51SXRlbSA9ICQgUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuaXRlbVxuICAgICAgbWVudSA9IG1lbnVJdGVtLnBhcmVudCgpLnBhcmVudCgpXG5cbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51XG4gICAgICAgIHN0eWxlOlxuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnXG4gICAgICAgICAgbGVmdDogbWVudS53aWR0aCgpXG4gICAgICAgICAgdG9wOiBtZW51SXRlbS5wb3NpdGlvbigpLnRvcCAtIHBhcnNlSW50KG1lbnVJdGVtLmNzcygncGFkZGluZy10b3AnKSlcbiAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtLml0ZW1zXG4gICAgZWxzZVxuICAgICAgQHByb3BzLnNldFN1Yk1lbnU/IG51bGxcblxuICByZW5kZXI6IC0+XG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkKClcbiAgICAgIGVsc2VcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICAgIGNsYXNzZXMgPSBbJ21lbnVJdGVtJ11cbiAgICBpZiBAcHJvcHMuaXRlbS5zZXBhcmF0b3JcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpfSwgJycpXG4gICAgZWxzZVxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3Igbm90IChAcHJvcHMuaXRlbS5hY3Rpb24gb3IgQHByb3BzLml0ZW0uaXRlbXMpXG4gICAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxuICAgICAgKGxpIHtyZWY6ICdpdGVtJywgY2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKSwgb25DbGljazogQGNsaWNrZWQsIG9uTW91c2VFbnRlcjogQG1vdXNlRW50ZXIgfSxcbiAgICAgICAgbmFtZVxuICAgICAgICBpZiBAcHJvcHMuaXRlbS5pdGVtc1xuICAgICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWluc3BlY3RvckFycm93LWNvbGxhcHNlJ30pXG4gICAgICApXG5cbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBzaG93aW5nTWVudTogZmFsc2VcbiAgICB0aW1lb3V0OiBudWxsXG4gICAgc3ViTWVudTogbnVsbFxuXG4gIGJsdXI6IC0+XG4gICAgQHVuYmx1cigpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZSwgc3ViTWVudTogZmFsc2V9ICksIDUwMFxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cblxuICB1bmJsdXI6IC0+XG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XG5cbiAgc2V0U3ViTWVudTogKHN1Yk1lbnUpIC0+XG4gICAgQHNldFN0YXRlIHN1Yk1lbnU6IHN1Yk1lbnVcblxuICBzZWxlY3Q6IChpdGVtKSAtPlxuICAgIHJldHVybiBpZiBpdGVtPy5pdGVtc1xuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cbiAgICBpdGVtLmFjdGlvbj8oKVxuXG4gIHJlbmRlcjogLT5cbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxuICAgICAgICAoc3ZnIHt2ZXJzaW9uOiAnMS4xJywgd2lkdGg6IDE2LCBoZWlnaHQ6IDE2LCB2aWV3Qm94OiAnMCAwIDE2IDE2JywgZW5hYmxlQmFja2dyb3VuZDogJ25ldyAwIDAgMTYgMTYnfSxcbiAgICAgICAgICAoZyB7fSxcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXG4gICAgICAgICAgICAocmVjdCB7eTogNywgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxuICAgICAgICAgICAgKHJlY3Qge3k6IDEyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICApXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXG4gICAgICAgICAgKHVsIHt9LFxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBzZXRTdWJNZW51OiBAc2V0U3ViTWVudX0pIGZvciBpdGVtLCBpbmRleCBpbiBAcHJvcHMuaXRlbXNcbiAgICAgICAgICApXG4gICAgICAgICAgaWYgQHN0YXRlLnN1Yk1lbnVcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBzdHlsZTogQHN0YXRlLnN1Yk1lbnUuc3R5bGV9LFxuICAgICAgICAgICAgICAodWwge30sXG4gICAgICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBzdGF0ZS5zdWJNZW51Lml0ZW1zXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQGxhc3RDbGljayA9IDBcblxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcbiAgICBAbGFzdENsaWNrID0gbm93XG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sXG4gICAgICAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogaWYgQHByb3BzLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgdGhlbiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZScgZWxzZSAnaWNvbi1ub3RlVG9vbCd9KVxuICAgICAgQHByb3BzLm1ldGFkYXRhLm5hbWVcbiAgICApXG5cbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkaW5nOiB0cnVlXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGxvYWQgQHByb3BzLmZvbGRlclxuXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XG4gICAgaWYgbmV4dFByb3BzLmZvbGRlciBpc250IEBwcm9wcy5mb2xkZXJcbiAgICAgIEBsb2FkIG5leHRQcm9wcy5mb2xkZXJcblxuICBsb2FkOiAoZm9sZGVyKSAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IGZvbGRlciwgKGVyciwgbGlzdCkgPT5cbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxuICAgICAgQHNldFN0YXRlXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XG5cbiAgcGFyZW50U2VsZWN0ZWQ6IChlKSAtPlxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLmZvbGRlcj8ucGFyZW50XG5cbiAgcmVuZGVyOiAtPlxuICAgIGxpc3QgPSBbXVxuICAgIGlmIEBwcm9wcy5mb2xkZXIgaXNudCBudWxsXG4gICAgICBsaXN0LnB1c2ggKGRpdiB7a2V5OiAncGFyZW50Jywgb25DbGljazogQHBhcmVudFNlbGVjdGVkfSwgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6ICdpY29uLXBhbGV0dGVBcnJvdy1jb2xsYXBzZSd9KSwgJ1BhcmVudCBGb2xkZXInKVxuICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxuICAgICAgbGlzdC5wdXNoIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXG5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXG4gICAgICBlbHNlXG4gICAgICAgIGxpc3RcbiAgICApXG5cbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXG5cbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIEBnZXRTdGF0ZUZvckZvbGRlciBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAaXNPcGVuID0gQHByb3BzLmRpYWxvZy5hY3Rpb24gaXMgJ29wZW5GaWxlJ1xuXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcbiAgICBAc2V0U3RhdGVcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXG5cbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XG4gICAgQHNldFN0YXRlXG4gICAgICBsaXN0OiBsaXN0XG4gICAgICBtZXRhZGF0YTogQGZpbmRNZXRhZGF0YSAkLnRyaW0oQHN0YXRlLmZpbGVuYW1lKSwgbGlzdFxuXG4gIGdldFN0YXRlRm9yRm9sZGVyOiAoZm9sZGVyKSAtPlxuICAgIGZvbGRlcjogZm9sZGVyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xuICAgIGxpc3Q6IFtdXG5cbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbWV0YWRhdGFcbiAgICBlbHNlIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgQHNldFN0YXRlXG4gICAgICAgIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbnVsbFxuXG4gIGNvbmZpcm06IC0+XG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lLCBAc3RhdGUubGlzdFxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICBpZiBAaXNPcGVuXG4gICAgICAgICAgYWxlcnQgXCIje0BzdGF0ZS5maWxlbmFtZX0gbm90IGZvdW5kXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgICBuYW1lOiBmaWxlbmFtZVxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwYXJlbnQ6IEBzdGF0ZS5mb2xkZXIgb3IgbnVsbFxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAcHJvcHMuY2xvc2UoKVxuXG4gIHJlbW92ZTogLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XG4gICAgICAgIGlmIG5vdCBlcnJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXG4gICAgICAgICAgQHNldFN0YXRlXG4gICAgICAgICAgICBsaXN0OiBsaXN0XG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXG5cbiAgY2FuY2VsOiAtPlxuICAgIEBwcm9wcy5jbG9zZSgpXG5cbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUsIGxpc3QpIC0+XG4gICAgZm9yIG1ldGFkYXRhIGluIGxpc3RcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXG4gICAgbnVsbFxuXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxuICAgICAgQGNvbmZpcm0oKVxuXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcblxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxuXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxuICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpLCBzcGFuLCBpbnB1dH0gPSBSZWFjdC5ET01cblxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxuICAgIGZpbGVuYW1lOiBAcHJvcHMuZmlsZW5hbWVcblxuICBjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiAobmV4dFByb3BzKSAtPlxuICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogbmV4dFByb3BzLmZpbGVuYW1lXG5cbiAgZmlsZW5hbWVDbGlja2VkOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIGlmIG5vdyAtIEBsYXN0Q2xpY2sgPD0gMjUwXG4gICAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXG4gICAgICAgIEBzZXRTdGF0ZSBlZGl0aW5nRmlsZW5hbWU6IHRydWVcbiAgICAgICAgc2V0VGltZW91dCAoPT4gQGZvY3VzRmlsZW5hbWUoKSksIDEwXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9wcy5jbGllbnQuc2F2ZUZpbGVEaWFsb2coKVxuICAgIEBsYXN0Q2xpY2sgPSBub3dcblxuICBmaWxlbmFtZUNoYW5nZWQ6IC0+XG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZmlsZW5hbWUoKS52YWx1ZVxuXG4gIGZpbGVuYW1lQmx1cnJlZDogLT5cbiAgICBAcmVuYW1lKClcblxuICBmaWxlbmFtZTogLT5cbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy5maWxlbmFtZSlcblxuICBmb2N1c0ZpbGVuYW1lOiAtPlxuICAgIGVsID0gQGZpbGVuYW1lKClcbiAgICBlbC5mb2N1cygpXG4gICAgaWYgdHlwZW9mIGVsLnNlbGVjdGlvblN0YXJ0IGlzICdudW1iZXInXG4gICAgICBlbC5zZWxlY3Rpb25TdGFydCA9IGVsLnNlbGVjdGlvbkVuZCA9IGVsLnZhbHVlLmxlbmd0aFxuICAgIGVsc2UgaWYgdHlwZW9mIGVsLmNyZWF0ZVRleHRSYW5nZSBpc250ICd1bmRlZmluZWQnXG4gICAgICByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpXG4gICAgICByYW5nZS5jb2xsYXBzZSBmYWxzZVxuICAgICAgcmFuZ2Uuc2VsZWN0KClcblxuICByZW5hbWU6IC0+XG4gICAgZmlsZW5hbWUgPSBAc3RhdGUuZmlsZW5hbWUucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xuICAgIGlmIGZpbGVuYW1lLmxlbmd0aCA+IDBcbiAgICAgIEBwcm9wcy5jbGllbnQucmVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEsIGZpbGVuYW1lXG4gICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcblxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cbiAgICBpZiBlLmtleUNvZGUgaXMgMTNcbiAgICAgIEByZW5hbWUoKVxuICAgIGVsc2UgaWYgZS5rZXlDb2RlIGlzIDI3XG4gICAgICBAc2V0U3RhdGVcbiAgICAgICAgZmlsZW5hbWU6IEBwcm9wcy5maWxlbmFtZVxuICAgICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXG5cbiAgaGVscDogLT5cbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxuICAgICAgICAoRHJvcGRvd24ge2l0ZW1zOiBAcHJvcHMuaXRlbXN9KVxuICAgICAgICBpZiBAc3RhdGUuZWRpdGluZ0ZpbGVuYW1lXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30sXG4gICAgICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uQmx1cjogQGZpbGVuYW1lQmx1cnJlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXG4gICAgICAgICAgKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJywgb25DbGljazogQGZpbGVuYW1lQ2xpY2tlZH0sIEBzdGF0ZS5maWxlbmFtZSlcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXG4gICAgICApXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyIGFuZCBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCgpXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXG4gICAgICAgICAgKGkge3N0eWxlOiB7Zm9udFNpemU6IFwiMTNweFwifSwgY2xhc3NOYW1lOiAnY2xpY2thYmxlIGljb24taGVscCcsIG9uQ2xpY2s6IEBoZWxwfSlcbiAgICAgIClcbiAgICApXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXG5cbiAgY2xvc2U6IC0+XG4gICAgQHByb3BzLmNsb3NlPygpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tZXhcIiwgb25DbGljazogQGNsb3NlfSlcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xuICAgICAgICAgIClcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcbiAgICApXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcblxuICB3YXRjaEZvckVzY2FwZTogKGUpIC0+XG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XG4gICAgICBAcHJvcHMuY2xvc2U/KClcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXG5cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWJhY2tncm91bmQnfSlcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxuICAgIClcbiIsIk1vZGFsVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldydcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZmlsZS1kaWFsb2ctdGFiLXZpZXcnXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1Byb3ZpZGVyVGFiYmVkRGlhbG9nJ1xuXG4gIHJlbmRlcjogIC0+XG4gICAgW2NhcGFiaWxpdHksIFRhYkNvbXBvbmVudF0gPSBzd2l0Y2ggQHByb3BzLmRpYWxvZy5hY3Rpb25cbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZUNvcHknLCAnc2F2ZUZpbGVDb3B5JyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXG5cbiAgICB0YWJzID0gW11cbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcblxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXG4gICAgc3RhdGUgPVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcblxuICB0cmltOiAocykgLT5cbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcblxuICByZW5hbWU6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgQHByb3BzLmNhbGxiYWNrPyBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflJFTkFNRV9ESUFMT0cuQ0FOQ0VMJylcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1NoYXJlVXJsRGlhbG9nVmlldydcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy51cmwpPy5zZWxlY3QoKVxuXG4gIHZpZXc6IC0+XG4gICAgd2luZG93Lm9wZW4gQHByb3BzLnVybFxuXG4gICMgYWRhcHRlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zdWRvZG9raS9jb3B5LXRvLWNsaXBib2FyZC9ibG9iL21hc3Rlci9pbmRleC5qc1xuICBjb3B5OiAtPlxuICAgIGNvcGllZCA9IHRydWVcbiAgICB0cnlcbiAgICAgIG1hcmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdtYXJrJ1xuICAgICAgbWFyay5pbm5lckhUTUwgPSBAcHJvcHMudXJsXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkIG1hcmtcblxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKClcbiAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKVxuXG4gICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKClcbiAgICAgIHJhbmdlLnNlbGVjdE5vZGUgbWFya1xuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlIHJhbmdlXG5cbiAgICAgIGNvcGllZCA9IGRvY3VtZW50LmV4ZWNDb21tYW5kICdjb3B5J1xuICAgIGNhdGNoXG4gICAgICB0cnlcbiAgICAgICAgd2luZG93LmNsaXBib2FyZERhdGEuc2V0RGF0YSAndGV4dCcsIEBwcm9wcy51cmxcbiAgICAgIGNhdGNoXG4gICAgICAgIGNvcGllZCA9IGZhbHNlXG4gICAgZmluYWxseVxuICAgICAgaWYgc2VsZWN0aW9uXG4gICAgICAgIGlmIHR5cGVvZiBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICAgIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSByYW5nZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpXG4gICAgICBpZiBtYXJrXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQgbWFya1xuICAgICAgYWxlcnQgdHIgKGlmIGNvcGllZCB0aGVuIFwiflNIQVJFX0RJQUxPRy5DT1BZX1NVQ0NFU1NcIiBlbHNlIFwiflNIQVJFX0RJQUxPRy5DT1BZX0VSUk9SXCIpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5TSEFSRUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1kaWFsb2cnfSxcbiAgICAgICAgKGlucHV0IHtyZWY6ICd1cmwnLCB2YWx1ZTogQHByb3BzLnVybCwgcmVhZE9ubHk6IHRydWV9KVxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgICAgaWYgZG9jdW1lbnQuZXhlY0NvbW1hbmQgb3Igd2luZG93LmNsaXBib2FyZERhdGFcbiAgICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb3B5fSwgdHIgJ35TSEFSRV9ESUFMT0cuQ09QWScpXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHZpZXd9LCB0ciAnflNIQVJFX0RJQUxPRy5WSUVXJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflNIQVJFX0RJQUxPRy5DTE9TRScpXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXG5cbmNsYXNzIFRhYkluZm9cbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXG5cblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xuXG4gIGNsaWNrZWQ6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxuXG4gIHJlbmRlcjogLT5cbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxuXG4gIHN0YXRpY3M6XG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXG5cbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcblxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxuICAgIChUYWJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcbiAgICAgIGtleTogaW5kZXhcbiAgICAgIGluZGV4OiBpbmRleFxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxuICAgIClcblxuICByZW5kZXJUYWJzOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxuICAgIClcblxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xuICAgICAgICAoZGl2IHtcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgICAgc3R5bGU6XG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRhYi5jb21wb25lbnRcbiAgICAgICAgKVxuICAgIClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxuICAgICAgQHJlbmRlclRhYnMoKVxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxuICAgIClcbiJdfQ==
