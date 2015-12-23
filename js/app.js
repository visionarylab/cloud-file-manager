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



},{"./client":32,"./ui":39,"./utils/get-hash-param":40,"./views/app-view":44}],2:[function(require,module,exports){
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
module.exports={
  "fivehundredpix": {
    "icon": "M42.9,27.6c-2.1,0-3.6,1-5.8,3.5c-1.9-2.5-3.8-3.5-5.8-3.5c-1.7,0-3.7,0.7-4.7,3.2 c-1-2-2.7-2.6-4.1-2.6c-1,0-2,0.2-2.9,1.1l0.6-3.3h6.2v-2.5h-8.4l-1.5,8v0.2h2.7c0.6-1,1.5-1.2,2.3-1.2c1.2,0,2.3,0.6,2.6,2.4v0.7 c-0.2,1.6-1.3,2.6-2.6,2.6c-1.1,0-2.3-0.6-2.4-2.2h-3v0.7c0,0.3,0.5,1.5,0.5,1.6c1.3,2.1,3.4,2.5,5,2.5c1.8,0,3.9-0.7,5.1-3.2 c1.1,2.4,3,3.1,4.8,3.1c2.1,0,3.5-0.9,5.7-3.3c1.9,2.3,3.7,3.3,5.7,3.3c3.4,0,5.1-2.6,5.1-5.6C48,30,46.2,27.6,42.9,27.6z  M34.7,33.7c-0.4,0.4-1,0.9-1.4,1.1c-0.7,0.4-1.3,0.6-1.9,0.6c-0.6,0-1.7-0.4-2.1-1.3c-0.1-0.2-0.2-0.6-0.2-0.7v-0.9 c0.3-1.5,1.1-2.1,2.2-2.1c0.1,0,0.6,0,0.9,0.1c0.4,0.1,0.7,0.3,1.1,0.6c0.4,0.3,2,1.6,2,1.8C35.3,33.2,34.9,33.5,34.7,33.7z  M42.9,35.5c-1.3,0-2.6-0.9-3.9-2.3c1.4-1.5,2.5-2.6,3.8-2.6c1.5,0,2.3,1.1,2.3,2.5C45.2,34.4,44.4,35.5,42.9,35.5z",
    "mask": "M33.3,31.3c-0.4-0.2-0.7-0.4-1.1-0.6c-0.3-0.1-0.8-0.1-0.9-0.1c-1.1,0-1.9,0.6-2.2,2.1v0.9c0,0.1,0.1,0.4,0.2,0.7 c0.3,0.9,1.4,1.3,2.1,1.3s1.2-0.2,1.9-0.6c0.5-0.3,1-0.7,1.4-1.1c0.2-0.2,0.5-0.5,0.5-0.6C35.3,32.8,33.7,31.6,33.3,31.3z  M42.8,30.6c-1.3,0-2.4,1-3.8,2.6c1.3,1.5,2.6,2.3,3.9,2.3c1.5,0,2.2-1.1,2.2-2.4C45.2,31.7,44.3,30.6,42.8,30.6z M0,0v64h64V0H0z  M42.9,38.5c-2,0-3.8-1-5.7-3.3c-2.2,2.4-3.7,3.3-5.7,3.3c-1.8,0-3.7-0.7-4.8-3.1c-1.2,2.5-3.3,3.2-5.1,3.2c-1.6,0-3.8-0.4-5-2.5 C16.5,36,16,34.8,16,34.5v-0.7h3c0.1,1.6,1.3,2.2,2.4,2.2c1.3,0,2.4-0.9,2.6-2.6v-0.7c-0.2-1.8-1.3-2.4-2.6-2.4 c-0.8,0-1.6,0.2-2.3,1.2h-2.7v-0.2l1.5-8h8.4v2.5h-6.2l-0.6,3.3c1-0.9,2-1.1,2.9-1.1c1.4,0,3.2,0.6,4.1,2.6c1-2.4,3-3.2,4.7-3.2 c2,0,3.9,1,5.8,3.5c2.1-2.6,3.7-3.5,5.8-3.5c3.3,0,5.1,2.4,5.1,5.4C48,35.9,46.2,38.5,42.9,38.5z",
    "color": "#222222"
  },
  "bandsintown": {
    "icon": "M25.8,39.3h13.4v1.1H24.7V18h-5.6v28h25.8V33.7h-19V39.3z M31.4,24.7h-5.6v7.8h5.6V24.7z M38.2,24.7h-5.6v7.8h5.6V24.7z M39.3,18v14.6h5.6V18H39.3z",
    "mask": "M0,0v64h64V0H0z M32.6,24.7h5.6v7.8h-5.6V24.7z M25.8,24.7h5.6v7.8h-5.6V24.7z M44.9,46H19.1V18h5.6v22.4h14.6 v-1.1H25.8v-5.6h19V46z M44.9,32.6h-5.6V18h5.6V32.6z",
    "color": "#1B8793"
  },
  "behance": {
    "icon": "M29.1,31c0.8-0.4,1.5-0.9,1.9-1.5c0.4-0.6,0.6-1.4,0.6-2.3c0-0.9-0.1-1.6-0.4-2.2 c-0.3-0.6-0.7-1.1-1.2-1.4c-0.5-0.4-1.1-0.6-1.9-0.8c-0.7-0.2-1.5-0.2-2.4-0.2H17v18.5h8.9c0.8,0,1.6-0.1,2.4-0.3 c0.8-0.2,1.5-0.5,2.1-1c0.6-0.4,1.1-1,1.5-1.7c0.4-0.7,0.5-1.5,0.5-2.4c0-1.2-0.3-2.1-0.8-3C31.1,31.9,30.2,31.3,29.1,31z  M21.1,25.7h3.8c0.4,0,0.7,0,1,0.1c0.3,0.1,0.6,0.2,0.9,0.3c0.3,0.2,0.5,0.4,0.6,0.6c0.2,0.3,0.2,0.6,0.2,1.1c0,0.8-0.2,1.3-0.7,1.7 c-0.5,0.3-1.1,0.5-1.8,0.5h-4.1V25.7z M28.2,36.7c-0.2,0.3-0.4,0.6-0.7,0.7c-0.3,0.2-0.6,0.3-1,0.4c-0.4,0.1-0.7,0.1-1.1,0.1h-4.3 v-5.1h4.4c0.9,0,1.6,0.2,2.1,0.6c0.5,0.4,0.8,1.1,0.8,2C28.4,36,28.3,36.4,28.2,36.7z M46.7,32.3c-0.2-0.9-0.6-1.8-1.2-2.5 C45,29,44.3,28.4,43.5,28c-0.8-0.4-1.8-0.7-3-0.7c-1,0-1.9,0.2-2.8,0.5c-0.8,0.4-1.6,0.9-2.2,1.5c-0.6,0.6-1.1,1.4-1.4,2.2 c-0.3,0.9-0.5,1.8-0.5,2.8c0,1,0.2,2,0.5,2.8c0.3,0.9,0.8,1.6,1.4,2.2c0.6,0.6,1.3,1.1,2.2,1.4c0.9,0.3,1.8,0.5,2.9,0.5 c1.5,0,2.8-0.3,3.9-1c1.1-0.7,1.9-1.8,2.4-3.4h-3.2c-0.1,0.4-0.4,0.8-1,1.2c-0.5,0.4-1.2,0.6-1.9,0.6c-1,0-1.8-0.3-2.4-0.8 c-0.6-0.5-0.9-1.5-0.9-2.6H47C47,34.2,47,33.2,46.7,32.3z M37.3,32.9c0-0.3,0.1-0.6,0.2-0.9c0.1-0.3,0.3-0.6,0.5-0.9 c0.2-0.3,0.5-0.5,0.9-0.7c0.4-0.2,0.9-0.3,1.5-0.3c0.9,0,1.6,0.3,2.1,0.7c0.4,0.5,0.8,1.2,0.8,2.1H37.3z M44.1,23.8h-7.5v1.8h7.5 V23.8z",
    "mask": "M40.4,30.1c-0.6,0-1.1,0.1-1.5,0.3c-0.4,0.2-0.7,0.4-0.9,0.7c-0.2,0.3-0.4,0.6-0.5,0.9c-0.1,0.3-0.2,0.6-0.2,0.9 h6c-0.1-0.9-0.4-1.6-0.8-2.1C42,30.3,41.3,30.1,40.4,30.1z M25.5,32.8h-4.4v5.1h4.3c0.4,0,0.8,0,1.1-0.1c0.4-0.1,0.7-0.2,1-0.4 c0.3-0.2,0.5-0.4,0.7-0.7c0.2-0.3,0.2-0.7,0.2-1.2c0-1-0.3-1.6-0.8-2C27.1,33,26.4,32.8,25.5,32.8z M27,29.5 c0.5-0.3,0.7-0.9,0.7-1.7c0-0.4-0.1-0.8-0.2-1.1c-0.2-0.3-0.4-0.5-0.6-0.6c-0.3-0.2-0.6-0.3-0.9-0.3c-0.3-0.1-0.7-0.1-1-0.1h-3.8 v4.3h4.1C25.9,30.1,26.5,29.9,27,29.5z M0,0v64h64V0H0z M36.6,23.8h7.5v1.8h-7.5V23.8z M31.9,38.1c-0.4,0.7-0.9,1.2-1.5,1.7 c-0.6,0.4-1.3,0.8-2.1,1c-0.8,0.2-1.6,0.3-2.4,0.3H17V22.6h8.7c0.9,0,1.7,0.1,2.4,0.2c0.7,0.2,1.3,0.4,1.9,0.8 c0.5,0.4,0.9,0.8,1.2,1.4c0.3,0.6,0.4,1.3,0.4,2.2c0,0.9-0.2,1.7-0.6,2.3c-0.4,0.6-1,1.1-1.9,1.5c1.1,0.3,2,0.9,2.5,1.7 c0.6,0.8,0.8,1.8,0.8,3C32.5,36.6,32.3,37.4,31.9,38.1z M47,35.3h-9.6c0,1.1,0.4,2.1,0.9,2.6c0.5,0.5,1.3,0.8,2.4,0.8 c0.7,0,1.4-0.2,1.9-0.6c0.5-0.4,0.9-0.8,1-1.2h3.2c-0.5,1.6-1.3,2.8-2.4,3.4c-1.1,0.7-2.4,1-3.9,1c-1.1,0-2-0.2-2.9-0.5 c-0.8-0.3-1.6-0.8-2.2-1.4c-0.6-0.6-1-1.4-1.4-2.2c-0.3-0.9-0.5-1.8-0.5-2.8c0-1,0.2-1.9,0.5-2.8c0.3-0.9,0.8-1.6,1.4-2.2 c0.6-0.6,1.3-1.1,2.2-1.5c0.8-0.4,1.8-0.5,2.8-0.5c1.1,0,2.1,0.2,3,0.7c0.8,0.4,1.5,1,2.1,1.8c0.5,0.7,0.9,1.6,1.2,2.5 C47,33.2,47,34.2,47,35.3z",
    "color": "#007CFF"
  },
  "codepen": {
    "icon": "M24.4,35l6.8,4.5v-4L27.4,33L24.4,35z M23.8,30.6v2.7l2.1-1.4L23.8,30.6z M31.2,28.5v-4L24.4,29 l3,2L31.2,28.5z M39.6,29l-6.8-4.5v4l3.7,2.5L39.6,29z M32,30l-3,2l3,2l3-2L32,30z M32,16c-8.8,0-16,7.2-16,16c0,8.8,7.2,16,16,16 s16-7.2,16-16C48,23.2,40.8,16,32,16z M41.9,35.1c0,0.3-0.1,0.6-0.4,0.7l-9.1,5.9c-0.3,0.2-0.6,0.2-0.9,0l-9.1-5.9 c-0.2-0.2-0.4-0.4-0.4-0.7v-6.2c0-0.3,0.1-0.6,0.4-0.7l9.1-5.9c0.3-0.2,0.6-0.2,0.9,0l9.1,5.9c0.2,0.2,0.4,0.4,0.4,0.7V35.1z  M32.8,35.5v4l6.8-4.5l-3-2L32.8,35.5z M40.2,33.4v-2.7L38.1,32L40.2,33.4z",
    "mask": "M0,0v64h64V0H0z M32,48c-8.8,0-16-7.2-16-16c0-8.8,7.2-16,16-16s16,7.2,16,16C48,40.8,40.8,48,32,48z M32.5,22.3 c-0.3-0.2-0.6-0.2-0.9,0l-9.1,5.9c-0.2,0.2-0.4,0.4-0.4,0.7v6.2c0,0.3,0.1,0.6,0.4,0.7l9.1,5.9c0.3,0.2,0.6,0.2,0.9,0l9.1-5.9 c0.2-0.2,0.4-0.4,0.4-0.7v-6.2c0-0.3-0.1-0.6-0.4-0.7L32.5,22.3z M32.8,24.5l6.8,4.5l-3,2l-3.7-2.5V24.5z M31.2,24.5v4L27.4,31l-3-2 L31.2,24.5z M23.8,30.6l2.1,1.4l-2.1,1.4V30.6z M31.2,39.5L24.4,35l3-2l3.7,2.5V39.5z M32,34l-3-2l3-2l3,2L32,34z M32.8,39.5v-4 l3.7-2.5l3,2L32.8,39.5z M40.2,33.4L38.1,32l2.1-1.4V33.4z",
    "color": "##151515"
  },
  "dribbble": {
    "icon": "M32,48c-8.8,0-16-7.2-16-16s7.2-16,16-16 s16,7.2,16,16S40.8,48,32,48z M45.5,34.2C45,34,41.3,32.9,37,33.6c1.8,4.9,2.5,8.9,2.7,9.7C42.7,41.3,44.9,38,45.5,34.2z M37.3,44.6 c-0.2-1.2-1-5.4-2.9-10.4c0,0-0.1,0-0.1,0c-7.7,2.7-10.5,8-10.7,8.5c2.3,1.8,5.2,2.9,8.4,2.9C33.9,45.7,35.7,45.3,37.3,44.6z  M21.8,41.2c0.3-0.5,4.1-6.7,11.1-9c0.2-0.1,0.4-0.1,0.5-0.2c-0.3-0.8-0.7-1.6-1.1-2.3c-6.8,2-13.4,2-14,1.9c0,0.1,0,0.3,0,0.4 C18.3,35.5,19.7,38.7,21.8,41.2z M18.6,29.2c0.6,0,6.2,0,12.6-1.7c-2.3-4-4.7-7.4-5.1-7.9C22.4,21.5,19.5,25,18.6,29.2z M28.8,18.7 c0.4,0.5,2.9,3.9,5.1,8c4.9-1.8,6.9-4.6,7.2-4.9c-2.4-2.1-5.6-3.4-9.1-3.4C30.9,18.4,29.8,18.5,28.8,18.7z M42.6,23.4 c-0.3,0.4-2.6,3.3-7.6,5.4c0.3,0.7,0.6,1.3,0.9,2c0.1,0.2,0.2,0.5,0.3,0.7c4.5-0.6,9.1,0.3,9.5,0.4C45.6,28.7,44.5,25.7,42.6,23.4z",
    "mask": "M34.3,34.3c-7.7,2.7-10.5,8-10.7,8.5c2.3,1.8,5.2,2.9,8.4,2.9c1.9,0,3.7-0.4,5.3-1.1 C37.1,43.4,36.3,39.2,34.3,34.3C34.4,34.2,34.4,34.3,34.3,34.3z M31.3,27.6c-2.3-4-4.7-7.4-5.1-7.9c-3.8,1.8-6.7,5.3-7.6,9.6 C19.2,29.2,24.9,29.3,31.3,27.6z M33,32.1c0.2-0.1,0.4-0.1,0.5-0.2c-0.3-0.8-0.7-1.6-1.1-2.3c-6.8,2-13.4,2-14,1.9 c0,0.1,0,0.3,0,0.4c0,3.5,1.3,6.7,3.5,9.1C22.2,40.6,25.9,34.4,33,32.1z M41.1,21.8c-2.4-2.1-5.6-3.4-9.1-3.4 c-1.1,0-2.2,0.1-3.2,0.4c0.4,0.5,2.9,3.9,5.1,8C38.8,24.9,40.8,22.1,41.1,21.8z M34.9,28.8c0.3,0.7,0.6,1.3,0.9,2 c0.1,0.2,0.2,0.5,0.3,0.7c4.5-0.6,9.1,0.3,9.5,0.4c0-3.2-1.2-6.2-3.1-8.5C42.3,23.8,40,26.7,34.9,28.8z M37,33.6 c1.8,4.9,2.5,8.9,2.7,9.7c3.1-2.1,5.2-5.4,5.9-9.2C45,34,41.3,32.9,37,33.6z M0,0v64h64V0H0z M32,48c-8.8,0-16-7.2-16-16 s7.2-16,16-16s16,7.2,16,16S40.8,48,32,48z",
    "color": "#ea4c89"
  },
  "dropbox": {
    "icon": "M25.4,17.1L16,23.3l6.5,5.2l9.5-5.9L25.4,17.1z M16,33.7l9.4,6.1l6.6-5.5l-9.5-5.9L16,33.7z  M32,34.3l6.6,5.5l9.4-6.1l-6.5-5.2L32,34.3z M48,23.3l-9.4-6.1L32,22.6l9.5,5.9L48,23.3z M32,35.5L25.4,41l-2.8-1.8v2.1l9.4,5.7 l9.4-5.7v-2.1L38.6,41L32,35.5z",
    "mask": "M0,0v64h64V0H0z M41.5,41.2L32,46.9l-9.4-5.7v-2.1l2.8,1.8l6.6-5.5l6.6,5.5l2.8-1.8V41.2z M48,33.7l-9.4,6.1 L32,34.3l-6.6,5.5L16,33.7l6.5-5.2L16,23.3l9.4-6.1l6.6,5.5l6.6-5.5l9.4,6.1l-6.5,5.2L48,33.7z M22.5,28.5l9.5,5.9l9.5-5.9L32,22.6 L22.5,28.5z",
    "color": "#1081DE"
  },
  "email": {
    "icon": "M17,22v20h30V22H17z M41.1,25L32,32.1L22.9,25H41.1z M20,39V26.6l12,9.3l12-9.3V39H20z",
    "mask": "M41.1,25H22.9l9.1,7.1L41.1,25z M44,26.6l-12,9.3l-12-9.3V39h24V26.6z M0,0v64h64V0H0z M47,42H17V22h30V42z",
    "color": "#7f7f7f"
  },
  "facebook": {
    "icon": "M34.1,47V33.3h4.6l0.7-5.3h-5.3v-3.4c0-1.5,0.4-2.6,2.6-2.6l2.8,0v-4.8c-0.5-0.1-2.2-0.2-4.1-0.2 c-4.1,0-6.9,2.5-6.9,7V28H24v5.3h4.6V47H34.1z",
    "mask": "M0,0v64h64V0H0z M39.6,22l-2.8,0c-2.2,0-2.6,1.1-2.6,2.6V28h5.3l-0.7,5.3h-4.6V47h-5.5V33.3H24V28h4.6V24 c0-4.6,2.8-7,6.9-7c2,0,3.6,0.1,4.1,0.2V22z",
    "color": "#3b5998"
  },
  "flickr": {
    "icon": "M32,16c-8.8,0-16,7.2-16,16s7.2,16,16,16s16-7.2,16-16S40.8,16,32,16z M26,37c-2.8,0-5-2.2-5-5 s2.2-5,5-5s5,2.2,5,5S28.8,37,26,37z M38,37c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S40.8,37,38,37z",
    "mask": "M38,27c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S40.8,27,38,27z M0,0v64h64V0H0z M32,48c-8.8,0-16-7.2-16-16 s7.2-16,16-16s16,7.2,16,16S40.8,48,32,48z M26,27c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S28.8,27,26,27z",
    "color": "#0063db"
  },
  "foursquare": {
    "icon": "M41.5,17c0,0-14.3,0-16.5,0c-2.3,0-3,1.7-3,2.8c0,1.1,0,26.3,0,26.3c0,1.2,0.7,1.7,1,1.8 c0.4,0.1,1.4,0.3,2-0.4c0,0,7.8-9.1,7.9-9.2c0.2-0.2,0.2-0.2,0.4-0.2c0.4,0,3.4,0,5.1,0c2.1,0,2.5-1.5,2.7-2.4 c0.2-0.7,2.3-11.3,2.9-14.7C44.6,18.4,43.9,17,41.5,17z M41.1,35.7c0.2-0.7,2.3-11.3,2.9-14.7 M40.5,21.5l-0.7,3.6 c-0.1,0.4-0.6,0.8-1,0.8c-0.5,0-6.4,0-6.4,0c-0.7,0-1.2,0.5-1.2,1.2v0.8c0,0.7,0.5,1.2,1.2,1.2c0,0,5,0,5.5,0c0.5,0,1,0.6,0.9,1.1 c-0.1,0.5-0.6,3.3-0.7,3.6c-0.1,0.3-0.4,0.8-1,0.8c-0.5,0-4.5,0-4.5,0c-0.8,0-1.1,0.1-1.6,0.8c-0.5,0.7-5.4,6.5-5.4,6.5 c0,0.1-0.1,0-0.1,0V21.4c0-0.5,0.4-1,1-1c0,0,12.8,0,13.3,0C40.2,20.4,40.6,20.9,40.5,21.5z",
    "mask": "M39.7,20.4c-0.5,0-13.3,0-13.3,0c-0.6,0-1,0.5-1,1v20.5c0,0.1,0,0.1,0.1,0c0,0,4.9-5.9,5.4-6.5 c0.5-0.7,0.8-0.8,1.6-0.8c0,0,3.9,0,4.5,0c0.6,0,1-0.5,1-0.8c0.1-0.3,0.6-3,0.7-3.6c0.1-0.5-0.4-1.1-0.9-1.1c-0.5,0-5.5,0-5.5,0 c-0.7,0-1.2-0.5-1.2-1.2v-0.8c0-0.7,0.5-1.2,1.2-1.2c0,0,6,0,6.4,0c0.5,0,0.9-0.4,1-0.8l0.7-3.6C40.6,20.9,40.2,20.4,39.7,20.4z  M0,0v64h64V0H0z M44,20.9l-1,5.2c-0.8,4.2-1.8,9-1.9,9.5c-0.2,0.9-0.6,2.4-2.7,2.4h-5.1c-0.2,0-0.2,0-0.4,0.2 c-0.1,0.1-7.9,9.2-7.9,9.2c-0.6,0.7-1.6,0.6-2,0.4c-0.4-0.1-1-0.6-1-1.8c0,0,0-25.2,0-26.3c0-1.1,0.7-2.8,3-2.8c2.3,0,16.5,0,16.5,0 C43.9,17,44.6,18.4,44,20.9z",
    "color": "#0072b1"
  },
  "github": {
    "icon": "M32,16c-8.8,0-16,7.2-16,16c0,7.1,4.6,13.1,10.9,15.2 c0.8,0.1,1.1-0.3,1.1-0.8c0-0.4,0-1.4,0-2.7c-4.5,1-5.4-2.1-5.4-2.1c-0.7-1.8-1.8-2.3-1.8-2.3c-1.5-1,0.1-1,0.1-1 c1.6,0.1,2.5,1.6,2.5,1.6c1.4,2.4,3.7,1.7,4.7,1.3c0.1-1,0.6-1.7,1-2.1c-3.6-0.4-7.3-1.8-7.3-7.9c0-1.7,0.6-3.2,1.6-4.3 c-0.2-0.4-0.7-2,0.2-4.2c0,0,1.3-0.4,4.4,1.6c1.3-0.4,2.6-0.5,4-0.5c1.4,0,2.7,0.2,4,0.5c3.1-2.1,4.4-1.6,4.4-1.6 c0.9,2.2,0.3,3.8,0.2,4.2c1,1.1,1.6,2.5,1.6,4.3c0,6.1-3.7,7.5-7.3,7.9c0.6,0.5,1.1,1.5,1.1,3c0,2.1,0,3.9,0,4.4 c0,0.4,0.3,0.9,1.1,0.8C43.4,45.1,48,39.1,48,32C48,23.2,40.8,16,32,16z",
    "mask": "M0,0v64h64V0H0z M37.1,47.2c-0.8,0.2-1.1-0.3-1.1-0.8c0-0.5,0-2.3,0-4.4c0-1.5-0.5-2.5-1.1-3 c3.6-0.4,7.3-1.7,7.3-7.9c0-1.7-0.6-3.2-1.6-4.3c0.2-0.4,0.7-2-0.2-4.2c0,0-1.3-0.4-4.4,1.6c-1.3-0.4-2.6-0.5-4-0.5 c-1.4,0-2.7,0.2-4,0.5c-3.1-2.1-4.4-1.6-4.4-1.6c-0.9,2.2-0.3,3.8-0.2,4.2c-1,1.1-1.6,2.5-1.6,4.3c0,6.1,3.7,7.5,7.3,7.9 c-0.5,0.4-0.9,1.1-1,2.1c-0.9,0.4-3.2,1.1-4.7-1.3c0,0-0.8-1.5-2.5-1.6c0,0-1.6,0-0.1,1c0,0,1,0.5,1.8,2.3c0,0,0.9,3.1,5.4,2.1 c0,1.3,0,2.3,0,2.7c0,0.4-0.3,0.9-1.1,0.8C20.6,45.1,16,39.1,16,32c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16 C48,39.1,43.4,45.1,37.1,47.2z",
    "color": "#4183c4"
  },
  "google_play": {
    "icon": "M24.4,45.6l16-8.8l-3.6-3.6L24.4,45.6z M22.2,18.5c-0.1,0.2-0.2,0.5-0.2,0.9v25.1 c0,0.4,0.1,0.6,0.2,0.9L35.6,32L22.2,18.5z M47.1,30.8L42.1,28L38.1,32l4,4l5-2.8C48.3,32.5,48.3,31.4,47.1,30.8z M40.4,27.1 l-15.9-8.8l12.3,12.3L40.4,27.1z",
    "mask": "M0,0v64h64V0H0z M40.4,27.1l-3.6,3.6L24.5,18.4L40.4,27.1z M22,44.5V19.4c0-0.4,0.1-0.7,0.2-0.9L35.6,32 L22.2,45.4C22.1,45.2,22,44.9,22,44.5z M24.4,45.6l12.4-12.4l3.6,3.6L24.4,45.6z M47.1,33.2l-5,2.8l-4-4l3.9-3.9l5.1,2.8 C48.3,31.4,48.3,32.5,47.1,33.2z",
    "color": "#40BBC1"
  },
  "google": {
    "icon": "M35.4,17h-8c-1.1,0-2.2,0.1-3.4,0.4 c-1.2,0.3-2.4,0.9-3.5,1.8c-1.7,1.6-2.5,3.4-2.5,5.4c0,1.6,0.6,3.1,1.8,4.3c1.1,1.3,2.7,2,4.9,2c0.4,0,0.8,0,1.3-0.1 c-0.1,0.2-0.2,0.4-0.2,0.7c-0.1,0.2-0.2,0.5-0.2,0.9c0,0.6,0.1,1.1,0.4,1.5c0.2,0.4,0.5,0.8,0.8,1.2c-0.9,0-2.1,0.1-3.5,0.4 c-1.4,0.2-2.8,0.7-4.1,1.5c-1.2,0.7-1.9,1.5-2.4,2.4c-0.5,0.9-0.7,1.7-0.7,2.5c0,1.5,0.7,2.8,2.1,3.9c1.4,1.2,3.5,1.8,6.3,1.8 c3.3-0.1,5.9-0.9,7.7-2.4c1.7-1.5,2.6-3.2,2.6-5.2c0-1.4-0.3-2.5-0.9-3.3c-0.6-0.8-1.4-1.6-2.2-2.3l-1.4-1.1 c-0.2-0.2-0.4-0.4-0.6-0.7c-0.2-0.3-0.4-0.6-0.4-1c0-0.4,0.1-0.8,0.4-1.1c0.2-0.3,0.4-0.6,0.7-0.8c0.4-0.4,0.8-0.7,1.2-1.1 c0.3-0.4,0.6-0.7,0.9-1.2c0.6-0.9,0.9-2,0.9-3.4c0-0.8-0.1-1.5-0.3-2.1c-0.2-0.6-0.5-1.1-0.7-1.5c-0.3-0.5-0.6-0.8-0.9-1.2 c-0.3-0.3-0.6-0.5-0.8-0.7H33L35.4,17z M31,38.9c0.7,0.8,1,1.6,1,2.7c0,1.3-0.5,2.3-1.5,3.1c-1,0.8-2.4,1.2-4.3,1.3 c-2.1,0-3.8-0.5-5-1.4c-1.3-0.9-1.9-2.1-1.9-3.5c0-0.7,0.1-1.3,0.4-1.8c0.3-0.5,0.6-0.9,0.9-1.2c0.4-0.3,0.8-0.6,1.1-0.7 c0.4-0.2,0.7-0.3,0.9-0.4c0.9-0.3,1.7-0.5,2.5-0.6c0.8-0.1,1.4-0.1,1.6-0.1c0.3,0,0.6,0,0.9,0C29.2,37.3,30.3,38.2,31,38.9z  M29.7,27.1c-0.1,0.5-0.3,1.1-0.7,1.6c-0.7,0.7-1.6,1.1-2.6,1.1c-0.8,0-1.6-0.3-2.2-0.8c-0.6-0.5-1.2-1.1-1.6-1.9 c-0.8-1.6-1.3-3.1-1.3-4.5c0-1.1,0.3-2.1,0.9-3c0.7-0.9,1.6-1.3,2.7-1.3c0.8,0,1.5,0.3,2.2,0.7c0.6,0.5,1.1,1.1,1.5,1.9 c0.8,1.6,1.2,3.2,1.2,4.8C29.8,26.1,29.8,26.5,29.7,27.1z M43.7,29.5v-4.3h-2.5v4.3H37V32h4.2v4.2h2.5V32H48v-2.5H43.7z",
    "mask": "M0,0v64h64V0H0z M31.3,19.1c0.3,0.3,0.6,0.7,0.9,1.2c0.3,0.4,0.5,0.9,0.7,1.5c0.2,0.6,0.3,1.3,0.3,2.1 c0,1.4-0.3,2.6-0.9,3.4c-0.3,0.4-0.6,0.8-0.9,1.2c-0.4,0.4-0.8,0.7-1.2,1.1c-0.2,0.2-0.5,0.5-0.7,0.8c-0.2,0.3-0.4,0.7-0.4,1.1 c0,0.4,0.1,0.8,0.4,1c0.2,0.3,0.4,0.5,0.6,0.7l1.4,1.1c0.8,0.7,1.6,1.5,2.2,2.3c0.6,0.8,0.9,2,0.9,3.3c0,1.9-0.9,3.7-2.6,5.2 c-1.8,1.6-4.3,2.4-7.7,2.4c-2.8,0-4.9-0.6-6.3-1.8c-1.4-1.1-2.1-2.4-2.1-3.9c0-0.7,0.2-1.6,0.7-2.5c0.4-0.9,1.2-1.7,2.4-2.4 c1.3-0.7,2.7-1.2,4.1-1.5c1.4-0.2,2.6-0.3,3.5-0.4c-0.3-0.4-0.5-0.8-0.8-1.2c-0.3-0.4-0.4-0.9-0.4-1.5c0-0.4,0-0.6,0.2-0.9 c0.1-0.2,0.2-0.5,0.2-0.7c-0.5,0.1-0.9,0.1-1.3,0.1c-2.1,0-3.8-0.7-4.9-2c-1.2-1.2-1.8-2.7-1.8-4.3c0-2,0.8-3.8,2.5-5.4 c1.1-0.9,2.3-1.6,3.5-1.8c1.2-0.2,2.3-0.4,3.4-0.4h8L33,18.4h-2.5C30.7,18.6,31,18.8,31.3,19.1z M48,32h-4.3v4.2h-2.5V32H37v-2.5 h4.2v-4.3h2.5v4.3H48V32z M27.1,19.1c-0.6-0.5-1.4-0.7-2.2-0.7c-1.1,0-2,0.5-2.7,1.3c-0.6,0.9-0.9,1.9-0.9,3c0,1.5,0.4,3,1.3,4.5 c0.4,0.7,0.9,1.4,1.6,1.9c0.6,0.5,1.4,0.8,2.2,0.8c1.1,0,1.9-0.4,2.6-1.1c0.3-0.5,0.6-1,0.7-1.6c0.1-0.5,0.1-1,0.1-1.4 c0-1.6-0.4-3.2-1.2-4.8C28.2,20.2,27.7,19.5,27.1,19.1z M26.9,36.2c-0.2,0-0.7,0-1.6,0.1c-0.8,0.1-1.7,0.3-2.5,0.6 c-0.2,0.1-0.5,0.2-0.9,0.4c-0.4,0.2-0.7,0.4-1.1,0.7c-0.4,0.3-0.7,0.7-0.9,1.2c-0.3,0.5-0.4,1.1-0.4,1.8c0,1.4,0.6,2.6,1.9,3.5 c1.2,0.9,2.9,1.4,5,1.4c1.9,0,3.3-0.4,4.3-1.3c1-0.8,1.5-1.8,1.5-3.1c0-1-0.3-1.9-1-2.7c-0.7-0.7-1.8-1.6-3.3-2.6 C27.5,36.2,27.2,36.2,26.9,36.2z",
    "color": "#dd4b39"
  },
  "instagram": {
    "icon": "M43.5,29.7h-2.6c0.2,0.7,0.3,1.5,0.3,2.3 c0,5.1-4.1,9.2-9.2,9.2c-5.1,0-9.2-4.1-9.2-9.2c0-0.8,0.1-1.6,0.3-2.3h-2.6v12.7c0,0.6,0.5,1.2,1.2,1.2h20.8c0.6,0,1.2-0.5,1.2-1.2 V29.7z M43.5,21.6c0-0.6-0.5-1.2-1.2-1.2h-3.5c-0.6,0-1.2,0.5-1.2,1.2v3.5c0,0.6,0.5,1.2,1.2,1.2h3.5c0.6,0,1.2-0.5,1.2-1.2V21.6z  M32,26.2c-3.2,0-5.8,2.6-5.8,5.8c0,3.2,2.6,5.8,5.8,5.8s5.8-2.6,5.8-5.8C37.8,28.8,35.2,26.2,32,26.2 M43.5,47H20.5 c-1.9,0-3.5-1.6-3.5-3.5V20.5c0-1.9,1.5-3.5,3.5-3.5h23.1c1.9,0,3.5,1.5,3.5,3.5v23.1C47,45.4,45.5,47,43.5,47",
    "mask": "M41.2,32c0,5.1-4.1,9.2-9.2,9.2c-5.1,0-9.2-4.1-9.2-9.2c0-0.8,0.1-1.6,0.3-2.3h-2.6v12.7c0,0.6,0.5,1.2,1.2,1.2 h20.8c0.6,0,1.2-0.5,1.2-1.2V29.7h-2.6C41.1,30.4,41.2,31.2,41.2,32z M32,37.8c3.2,0,5.8-2.6,5.8-5.8c0-3.2-2.6-5.8-5.8-5.8 c-3.2,0-5.8,2.6-5.8,5.8C26.2,35.2,28.8,37.8,32,37.8z M42.4,20.5h-3.5c-0.6,0-1.2,0.5-1.2,1.2v3.5c0,0.6,0.5,1.2,1.2,1.2h3.5 c0.6,0,1.2-0.5,1.2-1.2v-3.5C43.5,21,43,20.5,42.4,20.5z M0,0v64h64V0H0z M47,43.5c0,1.9-1.5,3.5-3.5,3.5H20.5 c-1.9,0-3.5-1.6-3.5-3.5V20.5c0-1.9,1.5-3.5,3.5-3.5h23.1c1.9,0,3.5,1.5,3.5,3.5V43.5z",
    "color": "#3f729b"
  },
  "itunes": {
    "icon": "M41.1,17c-0.1,0-0.2,0-0.3,0l-14.7,3c-0.6,0.1-1.1,0.7-1.1,1.4v17.6c0,0.8-0.6,1.4-1.4,1.4 h-2.8c-1.9,0-3.4,1.5-3.4,3.4c0,1.9,1.5,3.4,3.4,3.4h2c2.2,0,4-1.8,4-4V27.4c0-0.4,0.3-0.8,0.7-0.9l12.1-2.4c0.1,0,0.1,0,0.2,0 c0.5,0,0.9,0.4,0.9,0.9v11c0,0.8-0.6,1.4-1.4,1.4h-2.8c-1.9,0-3.4,1.5-3.4,3.4c0,1.9,1.5,3.4,3.4,3.4h2c2.2,0,4-1.8,4-4V18.4 C42.5,17.6,41.9,17,41.1,17z",
    "mask": "M0,0v64h64V0H0z M42.5,40c0,2.2-1.8,4-4,4h-2c-1.9,0-3.4-1.5-3.4-3.4s1.5-3.4,3.4-3.4h2.8c0.8,0,1.4-0.6,1.4-1.4 v-11c0-0.5-0.4-0.9-0.9-0.9c-0.1,0-0.1,0-0.2,0l-12.1,2.4c-0.4,0.1-0.7,0.4-0.7,0.9V43c0,2.2-1.8,4-4,4h-2c-1.9,0-3.4-1.5-3.4-3.4 c0-1.9,1.5-3.4,3.4-3.4h2.8c0.8,0,1.4-0.6,1.4-1.4V21.3c0-0.7,0.5-1.2,1.1-1.4l14.7-3c0.1,0,0.2,0,0.3,0c0.8,0,1.4,0.6,1.4,1.4V40z",
    "color": "#E049D1"
  },
  "linkedin": {
    "icon": "M20.4,44h5.4V26.6h-5.4V44z M23.1,18c-1.7,0-3.1,1.4-3.1,3.1c0,1.7,1.4,3.1,3.1,3.1 c1.7,0,3.1-1.4,3.1-3.1C26.2,19.4,24.8,18,23.1,18z M39.5,26.2c-2.6,0-4.4,1.4-5.1,2.8h-0.1v-2.4h-5.2V44h5.4v-8.6 c0-2.3,0.4-4.5,3.2-4.5c2.8,0,2.8,2.6,2.8,4.6V44H46v-9.5C46,29.8,45,26.2,39.5,26.2z",
    "mask": "M0,0v64h64V0H0z M25.8,44h-5.4V26.6h5.4V44z M23.1,24.3c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1 c1.7,0,3.1,1.4,3.1,3.1C26.2,22.9,24.8,24.3,23.1,24.3z M46,44h-5.4v-8.4c0-2,0-4.6-2.8-4.6c-2.8,0-3.2,2.2-3.2,4.5V44h-5.4V26.6 h5.2V29h0.1c0.7-1.4,2.5-2.8,5.1-2.8c5.5,0,6.5,3.6,6.5,8.3V44z",
    "color": "#007fb1"
  },
  "medium": {
    "icon": "M47,23.7h-1.2c-0.4,0-0.9,0.6-0.9,1v14.7c0,0.4,0.5,1,0.9,1H47v3.4H36.4v-3.4h2.1V24.9h-0.1 l-5.3,18.9h-4.1l-5.2-18.9h-0.1v15.5H26v3.4h-9v-3.4h1.2c0.5,0,1-0.6,1-1V24.7c0-0.4-0.5-1-1-1H17v-3.6h11.3l3.7,13.8h0.1l3.7-13.8 H47V23.7z",
    "mask": "M0,0v64h64V0H0z M47,23.7h-1.2c-0.4,0-0.9,0.6-0.9,1v14.7c0,0.4,0.5,1,0.9,1H47v3.4H36.4v-3.4h2.1V24.9h-0.1 l-5.3,18.9h-4.1l-5.2-18.9h-0.1v15.5H26v3.4h-9v-3.4h1.2c0.5,0,1-0.6,1-1V24.7c0-0.4-0.5-1-1-1H17v-3.6h11.3l3.7,13.8h0.1l3.7-13.8 H47V23.7z",
    "color": "#333332"
  },
  "meetup": {
    "icon": "M30.8,33.4c0-6.3,1.9-11.9,3.5-15.3c0.5-1.1,0.9-1.4,1.9-1.4c1.3,0,2.9,0.2,4.1,0.4 c1.1,0.2,1.5,1.6,1.7,2.5c1.2,4.5,4.7,18.7,5.5,22.4c0.2,0.8,0.6,2,0.1,2.3c-0.4,0.2-2.5,0.9-3.9,1c-0.6,0.1-1.1-0.6-1.4-1.5 c-1.5-4.6-3.5-11.8-5.2-16.6c0,3.7-0.3,10.8-0.4,12c-0.1,1.7-0.4,3.7-1.8,3.9c-1.1,0.2-2.4,0.4-4,0.4c-1.3,0-1.8-0.9-2.4-1.8 c-1-1.4-3.1-4.8-4.1-6.9c0.3,2.3,0.7,4.7,0.9,5.8c0.1,0.8,0,1.5-0.6,1.9c-1,0.7-3.2,1.4-4.1,1.4c-0.8,0-1.5-0.8-1.6-1.6 c-0.7-3.4-1.2-8-1.1-11.1c0-2.8,0-5.9,0.2-8.3c0-0.7,0.3-1.1,0.9-1.4c1.2-0.5,3-0.6,4.7-0.3c0.8,0.1,1,0.8,1.4,1.4 C26.9,25.5,28.9,29.5,30.8,33.4z",
    "mask": "M0,0v64h64V0H0z M47.8,44.3c-0.4,0.2-2.5,0.9-3.9,1c-0.6,0.1-1.1-0.6-1.4-1.5c-1.5-4.6-3.5-11.8-5.2-16.6 c0,3.7-0.3,10.8-0.4,12c-0.1,1.7-0.4,3.7-1.8,3.9c-1.1,0.2-2.4,0.4-4,0.4c-1.3,0-1.8-0.9-2.4-1.8c-1-1.4-3.1-4.8-4.1-6.9 c0.3,2.3,0.7,4.7,0.9,5.8c0.1,0.8,0,1.5-0.6,1.9c-1,0.7-3.2,1.4-4.1,1.4c-0.8,0-1.5-0.8-1.6-1.6c-0.7-3.4-1.2-8-1.1-11.1 c0-2.8,0-5.9,0.2-8.3c0-0.7,0.3-1.1,0.9-1.4c1.2-0.5,3-0.6,4.7-0.3c0.8,0.1,1,0.8,1.4,1.4c1.7,2.8,3.8,6.7,5.7,10.6 c0-6.3,1.9-11.9,3.5-15.3c0.5-1.1,0.9-1.4,1.9-1.4c1.3,0,2.9,0.2,4.1,0.4c1.1,0.2,1.5,1.6,1.7,2.5c1.2,4.5,4.7,18.7,5.5,22.4 C47.8,42.8,48.3,44,47.8,44.3z",
    "color": "#E51937"
  },
  "npm": {
    "icon": "M18.9,20v25.6H32V25.5h7.5V46h5.6V20H18.9z",
    "mask": "M68,0v68H0V0H68z M18.9,20v25.6H32V25.5h7.5V46h5.6V20H18.9z",
    "color": "#cb3837"
  },
  "pinterest": {
    "icon": "M32,16c-8.8,0-16,7.2-16,16c0,6.6,3.9,12.2,9.6,14.7c0-1.1,0-2.5,0.3-3.7 c0.3-1.3,2.1-8.7,2.1-8.7s-0.5-1-0.5-2.5c0-2.4,1.4-4.1,3.1-4.1c1.5,0,2.2,1.1,2.2,2.4c0,1.5-0.9,3.7-1.4,5.7 c-0.4,1.7,0.9,3.1,2.5,3.1c3,0,5.1-3.9,5.1-8.5c0-3.5-2.4-6.1-6.7-6.1c-4.9,0-7.9,3.6-7.9,7.7c0,1.4,0.4,2.4,1.1,3.1 c0.3,0.3,0.3,0.5,0.2,0.9c-0.1,0.3-0.3,1-0.3,1.3c-0.1,0.4-0.4,0.6-0.8,0.4c-2.2-0.9-3.3-3.4-3.3-6.1c0-4.5,3.8-10,11.4-10 c6.1,0,10.1,4.4,10.1,9.2c0,6.3-3.5,11-8.6,11c-1.7,0-3.4-0.9-3.9-2c0,0-0.9,3.7-1.1,4.4c-0.3,1.2-1,2.5-1.6,3.4 c1.4,0.4,3,0.7,4.5,0.7c8.8,0,16-7.2,16-16C48,23.2,40.8,16,32,16z",
    "mask": "M0,0v64h64V0H0z M32,48c-1.6,0-3.1-0.2-4.5-0.7c0.6-1,1.3-2.2,1.6-3.4c0.2-0.7,1.1-4.4,1.1-4.4 c0.6,1.1,2.2,2,3.9,2c5.1,0,8.6-4.7,8.6-11c0-4.7-4-9.2-10.1-9.2c-7.6,0-11.4,5.5-11.4,10c0,2.8,1,5.2,3.3,6.1 c0.4,0.1,0.7,0,0.8-0.4c0.1-0.3,0.2-1,0.3-1.3c0.1-0.4,0.1-0.5-0.2-0.9c-0.6-0.8-1.1-1.7-1.1-3.1c0-4,3-7.7,7.9-7.7 c4.3,0,6.7,2.6,6.7,6.1c0,4.6-2,8.5-5.1,8.5c-1.7,0-2.9-1.4-2.5-3.1c0.5-2,1.4-4.2,1.4-5.7c0-1.3-0.7-2.4-2.2-2.4 c-1.7,0-3.1,1.8-3.1,4.1c0,1.5,0.5,2.5,0.5,2.5s-1.8,7.4-2.1,8.7c-0.3,1.2-0.3,2.6-0.3,3.7C19.9,44.2,16,38.6,16,32 c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16C48,40.8,40.8,48,32,48z",
    "color": "#cb2128"
  },
  "rdio": {
    "icon": "M47.3,25.7c-3.2,0.1-7.1-2.4-8.7-3.4c-0.1-0.1-0.3-0.2-0.4-0.2c-0.2-0.1-0.3-0.2-0.5-0.3v9.3h0 c0,0.8-0.2,1.7-0.8,2.6l0,0.1c-1.5,2.4-4.7,3.9-7.7,2.9c-2.9-1-3.7-3.8-2.1-6.3l0-0.1c1.5-2.4,4.7-3.9,7.7-2.9 c0.2,0.1,0.4,0.2,0.6,0.3v-6.8c-1.1-0.3-2.2-0.5-3.4-0.5c-6.9,0-12,5.2-12,11.6v0.1c0,6.4,5.1,11.5,12,11.5c6.9,0,12-5.2,12-11.6 v-0.1c0-0.5,0-1-0.1-1.5C47.5,29.5,49,25.8,47.3,25.7z",
    "mask": "M0,0v64h64V0H0z M43.9,30.5c0.1,0.5,0.1,1,0.1,1.5V32c0,6.4-5.1,11.6-12,11.6c-6.9,0-12-5.1-12-11.5V32 c0-6.4,5.1-11.6,12-11.6c1.2,0,2.3,0.2,3.4,0.5v6.8c-0.2-0.1-0.4-0.2-0.6-0.3c-3-1-6.2,0.4-7.7,2.9l0,0.1c-1.5,2.5-0.8,5.3,2.1,6.3 c3,1,6.2-0.4,7.7-2.9l0-0.1c0.5-0.8,0.8-1.7,0.8-2.6h0v-9.3c0.2,0.1,0.3,0.2,0.5,0.3c0.1,0.1,0.3,0.2,0.4,0.2c1.5,1,5.4,3.5,8.7,3.4 C49,25.8,47.5,29.5,43.9,30.5z",
    "color": "#0475C5"
  },
  "rss": {
    "icon": "M24,36c-2.2,0-4,1.8-4,4c0,2.2,1.8,4,4,4s4-1.8,4-4C28,37.8,26.2,36,24,36z M23,18 c-1.1,0-2,0.9-2,2s0.9,2,2,2c10.5,0,19,8.5,19,19c0,1.1,0.9,2,2,2s2-0.9,2-2C46,28.3,35.7,18,23,18z M23,27c-1.1,0-2,0.9-2,2 s0.9,2,2,2c5.5,0,10,4.5,10,10c0,1.1,0.9,2,2,2s2-0.9,2-2C37,33.3,30.7,27,23,27z",
    "mask": "M0,0v64h64V0H0z M24,44c-2.2,0-4-1.8-4-4c0-2.2,1.8-4,4-4s4,1.8,4,4C28,42.2,26.2,44,24,44z M35,43 c-1.1,0-2-0.9-2-2c0-5.5-4.5-10-10-10c-1.1,0-2-0.9-2-2s0.9-2,2-2c7.7,0,14,6.3,14,14C37,42.1,36.1,43,35,43z M44,43 c-1.1,0-2-0.9-2-2c0-10.5-8.5-19-19-19c-1.1,0-2-0.9-2-2s0.9-2,2-2c12.7,0,23,10.3,23,23C46,42.1,45.1,43,44,43z",
    "color": "#EF8733"
  },
  "sharethis": {
    "icon": "M28.3875,32.0001C28.3875,32.0843 28.3683,32.1632 28.3633,32.2471L37.1647,36.6464C37.9182,36.0083 38.8823,35.61 39.9474,35.61C42.3418,35.6105 44.2821,37.5509 44.2821,39.945C44.2821,42.3418 42.3417,44.2821 39.9474,44.2821C37.551,44.2821 35.6127,42.3417 35.6127,39.945C35.6127,39.8587 35.6319,39.7816 35.6367,39.698L26.8353,35.2984C26.0795,35.9341 25.1177,36.3324 24.0526,36.3324C21.6584,36.3324 19.7179,34.3941 19.7179,32.0001C19.7179,29.6036 21.6584,27.6628 24.0526,27.6628C25.1176,27.6628 26.0798,28.0635 26.8353,28.6992L35.6367,24.2997C35.6319,24.2156 35.6127,24.1365 35.6127,24.0502C35.6127,21.6584 37.551,19.7179 39.9474,19.7179C42.3418,19.7179 44.2821,21.6584 44.2821,24.0502C44.2821,26.4466 42.3417,28.3875 39.9474,28.3875C38.88,28.3875 37.9178,27.9868 37.1647,27.3487L28.3633,31.7506C28.368,31.8347 28.3875,31.9138 28.3875,32.0001Z",
    "mask": "M0,0L64,0L64,64L0,64L0,0ZM28.3875,32.0001C28.3875,32.0843 28.3683,32.1632 28.3633,32.2471L37.1647,36.6464C37.9182,36.0083 38.8823,35.61 39.9474,35.61C42.3418,35.6105 44.2821,37.5509 44.2821,39.945C44.2821,42.3418 42.3417,44.2821 39.9474,44.2821C37.551,44.2821 35.6127,42.3417 35.6127,39.945C35.6127,39.8587 35.6319,39.7816 35.6367,39.698L26.8353,35.2984C26.0795,35.9341 25.1177,36.3324 24.0526,36.3324C21.6584,36.3324 19.7179,34.3941 19.7179,32.0001C19.7179,29.6036 21.6584,27.6628 24.0526,27.6628C25.1176,27.6628 26.0798,28.0635 26.8353,28.6992L35.6367,24.2997C35.6319,24.2156 35.6127,24.1365 35.6127,24.0502C35.6127,21.6584 37.551,19.7179 39.9474,19.7179C42.3418,19.7179 44.2821,21.6584 44.2821,24.0502C44.2821,26.4466 42.3417,28.3875 39.9474,28.3875C38.88,28.3875 37.9178,27.9868 37.1647,27.3487L28.3633,31.7506C28.368,31.8347 28.3875,31.9138 28.3875,32.0001Z",
    "color": "#00BF00"
  },
  "smugmug": {
    "icon": "M25.4,22.9c2.8,0,4.1-1.7,3.9-3.1 c-0.1-1.2-1.3-2.4-3.6-2.4c-1.9,0-3.1,1.4-3.3,2.8C22.3,21.6,23.1,23,25.4,22.9z M39.2,22.6c2.6-0.1,3.8-1.5,3.8-2.8 c0-1.5-1.4-3-3.8-2.8c-1.9,0.2-3,1.5-3.2,2.8C35.9,21.3,36.9,22.7,39.2,22.6z M40.9,28.5c-6.6,0.7-6.9,0.7-19,1 c-5.1,0-4,17.5,6.9,17.5C39.2,47,51.7,27.4,40.9,28.5z M29,43.9c-9.5,0-8.2-11.3-6.6-11.4c11.1-0.4,13.9-0.9,17.8-0.9 C44.3,31.6,36.6,43.9,29,43.9z",
    "mask": "M0,0v64h64V0H0z M36.1,19.8c0.2-1.3,1.3-2.6,3.2-2.8c2.4-0.2,3.8,1.3,3.8,2.8c0,1.3-1.2,2.6-3.8,2.8 C36.9,22.7,35.9,21.3,36.1,19.8z M22.5,20.2c0.2-1.4,1.4-2.8,3.3-2.8c2.3,0,3.5,1.1,3.6,2.4c0.2,1.5-1.1,3.1-3.9,3.1 C23.1,23,22.3,21.6,22.5,20.2z M28.8,47c-10.9,0-12-17.5-6.9-17.5c12.1-0.3,12.5-0.3,19-1C51.7,27.4,39.2,47,28.8,47z M40.3,31.6 c-3.9,0-6.8,0.5-17.8,0.9c-1.6,0.1-2.9,11.4,6.6,11.4C36.6,43.9,44.3,31.6,40.3,31.6z",
    "color": "#8cca1e"
  },
  "soundcloud": {
    "icon": "M43.6,30c-0.6,0-1.2,0.1-1.7,0.3c-0.3-4-3.7-7.1-7.7-7.1c-1,0-2,0.2-2.8,0.5 C31.1,23.9,31,24,31,24.3v13.9c0,0.3,0.2,0.5,0.5,0.5c0,0,12.2,0,12.2,0c2.4,0,4.4-1.9,4.4-4.4C48,31.9,46,30,43.6,30z M27.2,25.1 c-0.7,0-1.2,0.5-1.2,1.1v11.3c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2V26.2C28.4,25.6,27.8,25.1,27.2,25.1z M22.2,27.8 c-0.7,0-1.2,0.5-1.2,1.1v8.5c0,0.7,0.6,1.2,1.2,1.2s1.2-0.6,1.2-1.2V29C23.4,28.3,22.9,27.8,22.2,27.8z M17.2,30.2 c-0.7,0-1.2,0.5-1.2,1.1v4.9c0,0.7,0.6,1.2,1.2,1.2c0.7,0,1.2-0.6,1.2-1.2v-4.9C18.5,30.7,17.9,30.2,17.2,30.2z",
    "mask": "M0,0v64h64V0H0z M18.5,36.3c0,0.7-0.6,1.2-1.2,1.2c-0.7,0-1.2-0.6-1.2-1.2v-4.9c0-0.6,0.6-1.1,1.2-1.1 c0.7,0,1.2,0.5,1.2,1.1V36.3z M23.4,37.5c0,0.7-0.6,1.2-1.2,1.2S21,38.2,21,37.5V29c0-0.6,0.6-1.1,1.2-1.1s1.2,0.5,1.2,1.1V37.5z  M28.4,37.5c0,0.7-0.6,1.2-1.2,1.2c-0.7,0-1.2-0.6-1.2-1.2V26.2c0-0.6,0.6-1.1,1.2-1.1c0.7,0,1.2,0.5,1.2,1.1V37.5z M43.6,38.7 c0,0-12.1,0-12.2,0c-0.3,0-0.5-0.2-0.5-0.5V24.3c0-0.3,0.1-0.4,0.4-0.5c0.9-0.3,1.8-0.5,2.8-0.5c4,0,7.4,3.1,7.7,7.1 c0.5-0.2,1.1-0.3,1.7-0.3c2.4,0,4.4,2,4.4,4.4C48,36.8,46,38.7,43.6,38.7z",
    "color": "#FF5700"
  },
  "spotify": {
    "icon": "M32,16c-8.8,0-16,7.2-16,16c0,8.8,7.2,16,16,16c8.8,0,16-7.2,16-16C48,23.2,40.8,16,32,16 M39.3,39.1c-0.3,0.5-0.9,0.6-1.4,0.3c-3.8-2.3-8.5-2.8-14.1-1.5c-0.5,0.1-1.1-0.2-1.2-0.7c-0.1-0.5,0.2-1.1,0.8-1.2 c6.1-1.4,11.3-0.8,15.5,1.8C39.5,38,39.6,38.6,39.3,39.1 M41.3,34.7c-0.4,0.6-1.1,0.8-1.7,0.4c-4.3-2.6-10.9-3.4-15.9-1.9 c-0.7,0.2-1.4-0.2-1.6-0.8c-0.2-0.7,0.2-1.4,0.8-1.6c5.8-1.8,13-0.9,18,2.1C41.5,33.4,41.7,34.1,41.3,34.7 M41.5,30.2 c-5.2-3.1-13.7-3.3-18.6-1.9c-0.8,0.2-1.6-0.2-1.9-1c-0.2-0.8,0.2-1.6,1-1.9c5.7-1.7,15-1.4,21,2.1c0.7,0.4,0.9,1.3,0.5,2.1 C43.1,30.4,42.2,30.6,41.5,30.2",
    "mask": "M39,37.7c-4.2-2.6-9.4-3.2-15.5-1.8c-0.5,0.1-0.9,0.7-0.8,1.2c0.1,0.5,0.7,0.9,1.2,0.7c5.6-1.3,10.3-0.8,14.1,1.5 c0.5,0.3,1.1,0.1,1.4-0.3C39.6,38.6,39.5,38,39,37.7z M40.9,33c-4.9-3-12.2-3.9-18-2.1c-0.7,0.2-1,0.9-0.8,1.6 c0.2,0.7,0.9,1,1.6,0.8c5.1-1.5,11.6-0.8,15.9,1.9c0.6,0.4,1.4,0.2,1.7-0.4C41.7,34.1,41.5,33.4,40.9,33z M0,0v64h64V0H0z M32,48 c-8.8,0-16-7.2-16-16c0-8.8,7.2-16,16-16c8.8,0,16,7.2,16,16C48,40.8,40.8,48,32,48z M43,27.6c-5.9-3.5-15.3-3.9-21-2.1 c-0.8,0.2-1.2,1.1-1,1.9c0.2,0.8,1.1,1.2,1.9,1c4.9-1.5,13.4-1.2,18.6,1.9c0.7,0.4,1.6,0.2,2.1-0.5C43.9,29,43.7,28,43,27.6z",
    "color": "#2EBD59"
  },
  "squarespace": {
    "icon": "M46.2,27.6c-2.4-2.4-6.3-2.4-8.7,0l-9.8,9.8c-0.6,0.6-0.6,1.6,0,2.2c0.6,0.6,1.6,0.6,2.2,0 l9.8-9.8c1.2-1.2,3.2-1.2,4.4,0c1.2,1.2,1.2,3.2,0,4.4l-9.6,9.6c1.2,1.2,3.2,1.2,4.4,0l7.5-7.5C48.6,34,48.6,30,46.2,27.6z  M42.9,30.9c-0.6-0.6-1.6-0.6-2.2,0l-9.8,9.8c-1.2,1.2-3.2,1.2-4.4,0c-0.6-0.6-1.6-0.6-2.2,0c-0.6,0.6-0.6,1.6,0,2.2 c2.4,2.4,6.3,2.4,8.7,0l9.8-9.8C43.5,32.5,43.5,31.5,42.9,30.9z M39.6,21.1c-2.4-2.4-6.3-2.4-8.7,0l-9.8,9.8c-0.6,0.6-0.6,1.6,0,2.2 c0.6,0.6,1.6,0.6,2.2,0l9.8-9.8c1.2-1.2,3.2-1.2,4.4,0c0.6,0.6,1.6,0.6,2.2,0C40.2,22.7,40.2,21.7,39.6,21.1z M36.4,24.4 c-0.6-0.6-1.6-0.6-2.2,0l-9.8,9.8c-1.2,1.2-3.2,1.2-4.4,0c-1.2-1.2-1.2-3.2,0-4.4l9.6-9.6c-1.2-1.2-3.2-1.2-4.4,0l-7.5,7.5 c-2.4,2.4-2.4,6.3,0,8.7c2.4,2.4,6.3,2.4,8.7,0l9.8-9.8C37,25.9,37,25,36.4,24.4z",
    "mask": "M0,0v64h64V0H0z M39.6,21.1c0.6,0.6,0.6,1.6,0,2.2c-0.6,0.6-1.6,0.6-2.2,0c-1.2-1.2-3.2-1.2-4.4,0l-9.8,9.8 c-0.6,0.6-1.6,0.6-2.2,0c-0.6-0.6-0.6-1.6,0-2.2l9.8-9.8C33.3,18.7,37.2,18.7,39.6,21.1z M17.8,36.4c-2.4-2.4-2.4-6.3,0-8.7l7.5-7.5 c1.2-1.2,3.2-1.2,4.4,0L20,29.8c-1.2,1.2-1.2,3.2,0,4.4c1.2,1.2,3.2,1.2,4.4,0l9.8-9.8c0.6-0.6,1.6-0.6,2.2,0c0.6,0.6,0.6,1.6,0,2.2 l-9.8,9.8C24.1,38.8,20.2,38.8,17.8,36.4z M24.4,42.9c-0.6-0.6-0.6-1.6,0-2.2c0.6-0.6,1.6-0.6,2.2,0c1.2,1.2,3.2,1.2,4.4,0l9.8-9.8 c0.6-0.6,1.6-0.6,2.2,0c0.6,0.6,0.6,1.6,0,2.2l-9.8,9.8C30.7,45.3,26.8,45.3,24.4,42.9z M46.2,36.4l-7.5,7.5c-1.2,1.2-3.2,1.2-4.4,0 l9.6-9.6c1.2-1.2,1.2-3.2,0-4.4c-1.2-1.2-3.2-1.2-4.4,0l-9.8,9.8c-0.6,0.6-1.6,0.6-2.2,0c-0.6-0.6-0.6-1.6,0-2.2l9.8-9.8 c2.4-2.4,6.3-2.4,8.7,0C48.6,30,48.6,34,46.2,36.4z",
    "color": "#1C1C1C"
  },
  "tumblr": {
    "icon": "M39.2,41c-0.6,0.3-1.6,0.5-2.4,0.5c-2.4,0.1-2.9-1.7-2.9-3v-9.3h6v-4.5h-6V17c0,0-4.3,0-4.4,0 c-0.1,0-0.2,0.1-0.2,0.2c-0.3,2.3-1.4,6.4-5.9,8.1v3.9h3V39c0,3.4,2.5,8.1,9,8c2.2,0,4.7-1,5.2-1.8L39.2,41z",
    "mask": "M0,0v64h64V0H0z M35.4,47c-6.5,0.1-9-4.7-9-8v-9.8h-3v-3.9c4.6-1.6,5.6-5.7,5.9-8.1c0-0.2,0.1-0.2,0.2-0.2 c0.1,0,4.4,0,4.4,0v7.6h6v4.5h-6v9.3c0,1.3,0.5,3,2.9,3c0.8,0,1.9-0.3,2.4-0.5l1.4,4.3C40.1,46,37.6,47,35.4,47z",
    "color": "#2c4762"
  },
  "twitch": {
    "icon": "M40,25.6h-2.5v7.6H40V25.6z M33,25.6h-2.5v7.6H33V25.6z M20.9,18L19,23.1v20.4h7v3.8h3.8l3.8-3.8h5.7l7.6-7.6V18H20.9z M44.5,34.5L40,39h-7l-3.8,3.8V39h-5.7V20.5h21V34.5z",
    "mask": "M0,0v64h64V0H0z M47,35.8l-7.6,7.6h-5.7l-3.8,3.8H26v-3.8h-7V23.1l1.9-5.1H47V35.8z M29.2,42.8L33,39h7l4.5-4.5 v-14h-21V39h5.7V42.8z M37.5,25.6H40v7.6h-2.5V25.6z M30.5,25.6H33v7.6h-2.5V25.6z",
    "color": "#6441A5"
  },
  "twitter": {
    "icon": "M48,22.1c-1.2,0.5-2.4,0.9-3.8,1c1.4-0.8,2.4-2.1,2.9-3.6c-1.3,0.8-2.7,1.3-4.2,1.6 C41.7,19.8,40,19,38.2,19c-3.6,0-6.6,2.9-6.6,6.6c0,0.5,0.1,1,0.2,1.5c-5.5-0.3-10.3-2.9-13.5-6.9c-0.6,1-0.9,2.1-0.9,3.3 c0,2.3,1.2,4.3,2.9,5.5c-1.1,0-2.1-0.3-3-0.8c0,0,0,0.1,0,0.1c0,3.2,2.3,5.8,5.3,6.4c-0.6,0.1-1.1,0.2-1.7,0.2c-0.4,0-0.8,0-1.2-0.1 c0.8,2.6,3.3,4.5,6.1,4.6c-2.2,1.8-5.1,2.8-8.2,2.8c-0.5,0-1.1,0-1.6-0.1c2.9,1.9,6.4,2.9,10.1,2.9c12.1,0,18.7-10,18.7-18.7 c0-0.3,0-0.6,0-0.8C46,24.5,47.1,23.4,48,22.1z",
    "mask": "M0,0v64h64V0H0z M44.7,25.5c0,0.3,0,0.6,0,0.8C44.7,35,38.1,45,26.1,45c-3.7,0-7.2-1.1-10.1-2.9 c0.5,0.1,1,0.1,1.6,0.1c3.1,0,5.9-1,8.2-2.8c-2.9-0.1-5.3-2-6.1-4.6c0.4,0.1,0.8,0.1,1.2,0.1c0.6,0,1.2-0.1,1.7-0.2 c-3-0.6-5.3-3.3-5.3-6.4c0,0,0-0.1,0-0.1c0.9,0.5,1.9,0.8,3,0.8c-1.8-1.2-2.9-3.2-2.9-5.5c0-1.2,0.3-2.3,0.9-3.3 c3.2,4,8.1,6.6,13.5,6.9c-0.1-0.5-0.2-1-0.2-1.5c0-3.6,2.9-6.6,6.6-6.6c1.9,0,3.6,0.8,4.8,2.1c1.5-0.3,2.9-0.8,4.2-1.6 c-0.5,1.5-1.5,2.8-2.9,3.6c1.3-0.2,2.6-0.5,3.8-1C47.1,23.4,46,24.5,44.7,25.5z",
    "color": "#00aced"
  },
  "vevo": {
    "icon": "M43,21c-4.5,0-5.4,2.7-6.8,4.6c0,0-3.7,5.6-5.1,7.7l-3-12.3H20l5.1,20.6c1.1,3.7,4.1,3.4,4.1,3.4 c2.1,0,3.6-1.1,5-3.1L48,21C48,21,43.2,21,43,21z",
    "mask": "M0,0v64h64V0H0z M34.2,41.9c-1.4,2.1-2.9,3.1-5,3.1c0,0-3,0.2-4.1-3.4L20,21h8.1l3,12.3c1.4-2.1,5.1-7.7,5.1-7.7 c1.4-1.9,2.2-4.6,6.8-4.6c0.2,0,5,0,5,0L34.2,41.9z",
    "color": "#ED1A3B"
  },
  "vimeo": {
    "icon": "M47,25c-0.1,2.9-2.2,6.9-6.1,12c-4.1,5.3-7.5,8-10.4,8c-1.7,0-3.2-1.6-4.4-4.8 c-0.8-3-1.6-5.9-2.4-8.9c-0.9-3.2-1.9-4.8-2.9-4.8c-0.2,0-1,0.5-2.4,1.4L17,26c1.5-1.3,2.9-2.6,4.4-3.9c2-1.7,3.5-2.6,4.4-2.7 c2.3-0.2,3.8,1.4,4.3,4.8c0.6,3.7,1,6,1.2,6.9c0.7,3.1,1.4,4.6,2.2,4.6c0.6,0,1.6-1,2.8-3c1.3-2,1.9-3.5,2-4.5 c0.2-1.7-0.5-2.6-2-2.6c-0.7,0-1.5,0.2-2.2,0.5c1.5-4.8,4.3-7.2,8.4-7C45.7,19.1,47.2,21.1,47,25z",
    "mask": "M0,0v64h64V0H0z M40.9,37c-4.1,5.3-7.5,8-10.4,8c-1.7,0-3.2-1.6-4.4-4.8c-0.8-3-1.6-5.9-2.4-8.9 c-0.9-3.2-1.9-4.8-2.9-4.8c-0.2,0-1,0.5-2.4,1.4L17,26c1.5-1.3,2.9-2.6,4.4-3.9c2-1.7,3.5-2.6,4.4-2.7c2.3-0.2,3.8,1.4,4.3,4.8 c0.6,3.7,1,6,1.2,6.9c0.7,3.1,1.4,4.6,2.2,4.6c0.6,0,1.6-1,2.8-3c1.3-2,1.9-3.5,2-4.5c0.2-1.7-0.5-2.6-2-2.6c-0.7,0-1.5,0.2-2.2,0.5 c1.5-4.8,4.3-7.2,8.4-7c3.1,0.1,4.5,2.1,4.4,6C46.9,27.9,44.8,31.9,40.9,37z",
    "color": "#1ab7ea"
  },
  "vine": {
    "icon": "M45.2,31.9c-0.8,0.2-1.5,0.3-2.2,0.3c-3.8,0-6.7-2.6-6.7-7.2c0-2.3,0.9-3.4,2.1-3.4 c1.2,0,2,1.1,2,3.2c0,1.2-0.3,2.5-0.6,3.3c0,0,1.2,2,4.4,1.4c0.7-1.5,1-3.5,1-5.2c0-4.6-2.3-7.3-6.6-7.3c-4.4,0-7,3.4-7,7.9 c0,4.4,2.1,8.2,5.5,10c-1.4,2.9-3.3,5.4-5.2,7.3c-3.5-4.2-6.6-9.8-7.9-20.7h-5.1c2.4,18.1,9.4,23.9,11.2,25c1.1,0.6,2,0.6,2.9,0.1 c1.5-0.9,6-5.4,8.6-10.7c1.1,0,2.3-0.1,3.6-0.4V31.9z",
    "mask": "M0,0v64h64V0H0z M38.4,21.5c-1.2,0-2.1,1.2-2.1,3.4c0,4.6,2.9,7.2,6.7,7.2c0.7,0,1.4-0.1,2.2-0.3v3.6 c-1.3,0.3-2.5,0.4-3.6,0.4c-2.5,5.3-7,9.8-8.6,10.7c-1,0.5-1.9,0.6-2.9-0.1c-1.9-1.1-8.9-6.9-11.2-25H24c1.3,10.9,4.4,16.5,7.9,20.7 c1.9-1.9,3.7-4.4,5.2-7.3c-3.4-1.7-5.5-5.5-5.5-10c0-4.5,2.6-7.9,7-7.9c4.3,0,6.6,2.7,6.6,7.3c0,1.7-0.4,3.7-1,5.2 c-3.2,0.6-4.4-1.4-4.4-1.4c0.2-0.8,0.6-2.1,0.6-3.3C40.3,22.6,39.5,21.5,38.4,21.5z",
    "color": "#00BF8F"
  },
  "vsco": {
    "icon": "M32,16c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C34.5,17.1,33.4,16,32,16z M18.5,29.5c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C20.9,30.6,19.8,29.5,18.5,29.5z M25.2,22.8c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C27.7,23.9,26.6,22.8,25.2,22.8z M38.7,27.6c1.4,0,2.5-1.1,2.5-2.5c0-1.4-1.1-2.5-2.5-2.5c-1.4,0-2.5,1.1-2.5,2.5 C36.2,26.5,37.3,27.6,38.7,27.6z M25.1,36.2c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C27.6,37.3,26.5,36.2,25.1,36.2z M31.9,34.4c1.4,0,2.5-1.1,2.5-2.5c0-1.4-1.1-2.5-2.5-2.5c-1.4,0-2.5,1.1-2.5,2.5 C29.5,33.3,30.6,34.4,31.9,34.4z M45.5,29.5c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C48,30.6,46.9,29.5,45.5,29.5z M32,43.1c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C34.5,44.2,33.4,43.1,32,43.1z M38.8,36.3c-1.4,0-2.5,1.1-2.5,2.5c0,1.4,1.1,2.5,2.5,2.5c1.4,0,2.5-1.1,2.5-2.5 C41.2,37.4,40.1,36.3,38.8,36.3z",
    "mask": "M0,0v64h64V0H0z M18.5,34.5c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C20.9,33.4,19.8,34.5,18.5,34.5z M25.1,41.1c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C27.6,40,26.5,41.1,25.1,41.1z M25.2,27.7c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C27.7,26.6,26.6,27.7,25.2,27.7z M32,48c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C34.5,46.9,33.4,48,32,48z M29.5,31.9c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5c0,1.4-1.1,2.5-2.5,2.5 C30.6,34.4,29.5,33.3,29.5,31.9z M32,20.9c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C34.5,19.8,33.4,20.9,32,20.9z M38.7,22.7c1.4,0,2.5,1.1,2.5,2.5c0,1.4-1.1,2.5-2.5,2.5c-1.4,0-2.5-1.1-2.5-2.5 C36.2,23.8,37.3,22.7,38.7,22.7z M38.8,41.2c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C41.2,40.1,40.1,41.2,38.8,41.2z M45.5,34.5c-1.4,0-2.5-1.1-2.5-2.5c0-1.4,1.1-2.5,2.5-2.5c1.4,0,2.5,1.1,2.5,2.5 C48,33.4,46.9,34.5,45.5,34.5z",
    "color": "#83878A"
  },
  "yelp": {
    "icon": "M29.5,35.7c0.5-0.1,0.9-0.6,0.9-1.2c0-0.6-0.3-1.2-0.8-1.4c0,0-1.5-0.6-1.5-0.6 c-5-2.1-5.2-2.1-5.5-2.1c-0.4,0-0.7,0.2-1,0.6c-0.5,0.8-0.7,3.3-0.5,5c0.1,0.6,0.2,1,0.3,1.3c0.2,0.4,0.5,0.6,0.9,0.6 c0.2,0,0.4,0,5.1-1.5C27.5,36.4,29.5,35.7,29.5,35.7z M32.2,37.6c-0.6-0.2-1.2-0.1-1.5,0.4c0,0-1,1.2-1,1.2 c-3.5,4.1-3.7,4.3-3.7,4.5c-0.1,0.1-0.1,0.3-0.1,0.4c0,0.2,0.1,0.4,0.3,0.6c0.8,1,4.7,2.4,6,2.2c0.4-0.1,0.7-0.3,0.9-0.7 C33,46.1,33,45.9,33,41c0,0,0-2.2,0-2.2C33.1,38.3,32.7,37.8,32.2,37.6z M32.3,16.8c-0.1-0.4-0.4-0.7-0.9-0.8 c-1.3-0.3-6.5,1.1-7.5,2.1c-0.3,0.3-0.4,0.7-0.3,1.1c0.2,0.3,6.5,10.4,6.5,10.4c0.9,1.5,1.7,1.3,2,1.2c0.3-0.1,1-0.3,0.9-2.1 C33,26.6,32.4,17.3,32.3,16.8z M36.9,33.4C36.9,33.4,36.8,33.5,36.9,33.4c0.2-0.1,0.7-0.2,1.5-0.4c5.3-1.3,5.5-1.3,5.7-1.5 c0.3-0.2,0.5-0.6,0.5-1c0,0,0,0,0,0c-0.1-1.3-2.4-4.7-3.5-5.2c-0.4-0.2-0.8-0.2-1.1,0c-0.2,0.1-0.4,0.3-3.2,4.2c0,0-1.3,1.7-1.3,1.8 c-0.3,0.4-0.3,1,0,1.5C35.8,33.3,36.3,33.6,36.9,33.4z M44.4,38.6c-0.2-0.1-0.3-0.2-5-1.7c0,0-2-0.7-2.1-0.7c-0.5-0.2-1.1,0-1.4,0.5 c-0.4,0.5-0.5,1.1-0.1,1.6l0.8,1.3c2.8,4.5,3,4.8,3.2,5c0.3,0.2,0.7,0.3,1.1,0.1c1.2-0.5,3.7-3.7,3.9-5 C44.8,39.2,44.7,38.8,44.4,38.6z",
    "mask": "M0,0v64h64V0H0z M22.4,37.9c-0.4,0-0.7-0.2-0.9-0.6c-0.1-0.3-0.2-0.7-0.3-1.3c-0.2-1.7,0-4.2,0.5-5 c0.2-0.4,0.6-0.6,1-0.6c0.3,0,0.5,0.1,5.5,2.1c0,0,1.5,0.6,1.5,0.6c0.5,0.2,0.9,0.7,0.8,1.4c0,0.6-0.4,1.1-0.9,1.2 c0,0-2.1,0.7-2.1,0.7C22.8,37.9,22.7,37.9,22.4,37.9z M33,41c0,4.9,0,5-0.1,5.3c-0.1,0.4-0.4,0.6-0.9,0.7c-1.2,0.2-5.1-1.2-6-2.2 c-0.2-0.2-0.3-0.4-0.3-0.6c0-0.2,0-0.3,0.1-0.4c0.1-0.2,0.2-0.4,3.7-4.5c0,0,1-1.2,1-1.2c0.3-0.4,1-0.6,1.5-0.4 c0.6,0.2,0.9,0.7,0.9,1.2C33,38.8,33,41,33,41z M32.2,30.8c-0.3,0.1-1,0.3-2-1.2c0,0-6.4-10.1-6.5-10.4c-0.1-0.3,0-0.7,0.3-1.1 c1-1,6.1-2.4,7.5-2.1c0.4,0.1,0.7,0.4,0.9,0.8c0.1,0.4,0.7,9.8,0.8,11.9C33.2,30.5,32.4,30.7,32.2,30.8z M35.4,31.3 c0,0,1.3-1.8,1.3-1.8c2.8-3.9,3-4.1,3.2-4.2c0.3-0.2,0.7-0.2,1.1,0c1.1,0.5,3.4,3.9,3.5,5.2c0,0,0,0,0,0c0,0.4-0.1,0.8-0.5,1 c-0.2,0.1-0.4,0.2-5.7,1.5c-0.8,0.2-1.3,0.3-1.6,0.4c0,0,0,0,0,0c-0.5,0.1-1.1-0.1-1.4-0.6C35.1,32.3,35.1,31.7,35.4,31.3z  M44.7,39.6c-0.2,1.3-2.7,4.5-3.9,5c-0.4,0.2-0.8,0.1-1.1-0.1c-0.2-0.2-0.4-0.5-3.2-5l-0.8-1.3c-0.3-0.5-0.3-1.1,0.1-1.6 c0.4-0.5,0.9-0.6,1.4-0.5c0,0,2.1,0.7,2.1,0.7c4.6,1.5,4.8,1.6,5,1.7C44.7,38.8,44.8,39.2,44.7,39.6z",
    "color": "#B90C04"
  },
  "youtube": {
    "icon": "M46.7,26c0,0-0.3-2.1-1.2-3c-1.1-1.2-2.4-1.2-3-1.3C38.3,21.4,32,21.4,32,21.4h0 c0,0-6.3,0-10.5,0.3c-0.6,0.1-1.9,0.1-3,1.3c-0.9,0.9-1.2,3-1.2,3S17,28.4,17,30.9v2.3c0,2.4,0.3,4.9,0.3,4.9s0.3,2.1,1.2,3 c1.1,1.2,2.6,1.2,3.3,1.3c2.4,0.2,10.2,0.3,10.2,0.3s6.3,0,10.5-0.3c0.6-0.1,1.9-0.1,3-1.3c0.9-0.9,1.2-3,1.2-3s0.3-2.4,0.3-4.9 v-2.3C47,28.4,46.7,26,46.7,26z M28.9,35.9l0-8.4l8.1,4.2L28.9,35.9z",
    "mask": "M0,0v64h64V0H0z M47,33.1c0,2.4-0.3,4.9-0.3,4.9s-0.3,2.1-1.2,3c-1.1,1.2-2.4,1.2-3,1.3 C38.3,42.5,32,42.6,32,42.6s-7.8-0.1-10.2-0.3c-0.7-0.1-2.2-0.1-3.3-1.3c-0.9-0.9-1.2-3-1.2-3S17,35.6,17,33.1v-2.3 c0-2.4,0.3-4.9,0.3-4.9s0.3-2.1,1.2-3c1.1-1.2,2.4-1.2,3-1.3c4.2-0.3,10.5-0.3,10.5-0.3h0c0,0,6.3,0,10.5,0.3c0.6,0.1,1.9,0.1,3,1.3 c0.9,0.9,1.2,3,1.2,3s0.3,2.4,0.3,4.9V33.1z M28.9,35.9l8.1-4.2l-8.1-4.2L28.9,35.9z",
    "color": "#ff3333"
  }
}

},{}],32:[function(require,module,exports){
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
      return window.open(this.getCurrentUrl(), '_blank');
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

  CloudFileManagerClient.prototype.importData = function(data, callback) {
    if (callback == null) {
      callback = null;
    }
    this._event('importedData', data);
    return typeof callback === "function" ? callback(data) : void 0;
  };

  CloudFileManagerClient.prototype.importDataDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._ui.importDataDialog((function(_this) {
      return function(data) {
        return _this.importData(data, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.readLocalFile = function(file, callback) {
    var reader;
    if (callback == null) {
      callback = null;
    }
    reader = new FileReader();
    reader.onload = function(loaded) {
      return typeof callback === "function" ? callback({
        name: file.name,
        content: loaded.target.result
      }) : void 0;
    };
    return reader.readAsText(file);
  };

  CloudFileManagerClient.prototype.openLocalFile = function(file, callback) {
    if (callback == null) {
      callback = null;
    }
    return this.readLocalFile(file, (function(_this) {
      return function(data) {
        var content, metadata;
        content = cloudContentFactory.createEnvelopedCloudContent(data.content);
        metadata = new CloudMetadata({
          name: data.name,
          type: CloudMetadata.File
        });
        _this._fileChanged('openedFile', content, metadata, {
          openedContent: content.clone()
        });
        return typeof callback === "function" ? callback(content, metadata) : void 0;
      };
    })(this));
  };

  CloudFileManagerClient.prototype.importLocalFile = function(file, callback) {
    if (callback == null) {
      callback = null;
    }
    return this.readLocalFile(file, (function(_this) {
      return function(data) {
        return _this.importData(data, callback);
      };
    })(this));
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
          window.open(_this.getCurrentUrl("#copy=" + copyParams));
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
    return this._ui.shareDialog(this);
  };

  CloudFileManagerClient.prototype.shareUpdate = function() {
    return this.share();
  };

  CloudFileManagerClient.prototype.toggleShare = function(callback) {
    var ref, ref1, ref2, ref3;
    if ((ref = this.state.currentContent) != null ? ref.get("sharedDocumentId") : void 0) {
      if ((ref1 = this.state.currentContent) != null) {
        ref1.remove("_permissions");
      }
      if ((ref2 = this.state.currentContent) != null) {
        ref2.remove("shareEditKey");
      }
      if ((ref3 = this.state.currentContent) != null) {
        ref3.remove("sharedDocumentId");
      }
      this._fileChanged('unsharedFile', this.state.currentContent, this.state.metadata, {
        sharing: false
      });
      return typeof callback === "function" ? callback(false) : void 0;
    } else {
      return this.share(callback);
    }
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
        var envelopedContent, ref, ref1;
        envelopedContent = cloudContentFactory.createEnvelopedCloudContent(content);
        if ((ref = _this.state.currentContent) != null) {
          ref.copyMetadataTo(envelopedContent);
        }
        return _this._ui.downloadDialog((ref1 = _this.state.metadata) != null ? ref1.name : void 0, envelopedContent, callback);
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

  CloudFileManagerClient.prototype.getCurrentUrl = function(queryString) {
    var suffix;
    if (queryString == null) {
      queryString = null;
    }
    suffix = queryString != null ? "?" + queryString : "";
    return "" + document.location.origin + document.location.pathname + suffix;
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



},{"./providers/document-store-provider":33,"./providers/google-drive-provider":34,"./providers/local-file-provider":35,"./providers/localstorage-provider":36,"./providers/provider-interface":37,"./providers/readonly-provider":38,"./ui":39,"./utils/is-string":41,"./utils/translate":43}],33:[function(require,module,exports){
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



},{"../utils/is-string":41,"../utils/translate":43,"./provider-interface":37,"jiff":17}],34:[function(require,module,exports){
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



},{"../utils/is-string":41,"../utils/translate":43,"./provider-interface":37,"diff":11}],35:[function(require,module,exports){
var LocalFileListTab, LocalFileProvider, ProviderInterface, button, cloudContentFactory, div, input, ref, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, input = ref.input, button = ref.button;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

cloudContentFactory = (require('./provider-interface')).cloudContentFactory;

LocalFileListTab = React.createFactory(require('../views/local-file-tab-view'));

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



},{"../utils/translate":43,"../views/local-file-tab-view":51,"./provider-interface":37}],36:[function(require,module,exports){
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



},{"../utils/translate":43,"./provider-interface":37}],37:[function(require,module,exports){
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

  CloudContent.prototype.remove = function(prop) {
    return delete this._[prop];
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



},{"../utils/is-string":41}],38:[function(require,module,exports){
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



},{"../utils/is-string":41,"../utils/translate":43,"./provider-interface":37}],39:[function(require,module,exports){
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

  CloudFileManagerUI.prototype.importDataDialog = function(callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showImportDialog', {
      callback: callback
    }));
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

  CloudFileManagerUI.prototype.shareDialog = function(client) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showShareDialog', {
      client: client
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



},{"./utils/is-string":41,"./utils/translate":43}],40:[function(require,module,exports){
module.exports = function(param) {
  var ret;
  ret = null;
  location.hash.substr(1).split("&").some(function(pair) {
    return pair.split("=")[0] === param && (ret = pair.split("=")[1]);
  });
  return ret;
};



},{}],41:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],42:[function(require,module,exports){
module.exports = {
  "~MENUBAR.UNTITLED_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.IMPORT_DATA": "Import data...",
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
  "~DIALOG.SHARED": "Share",
  "~DIALOG.IMPORT_DATA": "Import Data",
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
  "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED": "Sorry, you can't drop more than one file.",
  "~IMPORT.LOCAL_FILE": "Local File"
};



},{}],43:[function(require,module,exports){
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



},{"./lang/en-us":42}],44:[function(require,module,exports){
var App, BlockingModal, DownloadDialog, ImportTabbedDialog, InnerApp, MenuBar, ProviderTabbedDialog, RenameDialog, ShareDialog, div, iframe, isString, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

DownloadDialog = React.createFactory(require('./download-dialog-view'));

RenameDialog = React.createFactory(require('./rename-dialog-view'));

ShareDialog = React.createFactory(require('./share-dialog-view'));

BlockingModal = React.createFactory(require('./blocking-modal-view'));

ImportTabbedDialog = React.createFactory(require('./import-tabbed-dialog-view'));

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
      shareDialog: null,
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
          case 'showImportDialog':
            return _this.setState({
              importDialog: event.data
            });
          case 'showShareDialog':
            return _this.setState({
              shareDialog: event.data
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
      shareDialog: null,
      importDialog: null
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
    } else if (this.state.importDialog) {
      return ImportTabbedDialog({
        client: this.props.client,
        dialog: this.state.importDialog,
        close: this.closeDialogs
      });
    } else if (this.state.shareDialog) {
      return ShareDialog({
        client: this.props.client,
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



},{"../utils/is-string":41,"../utils/translate":43,"./blocking-modal-view":46,"./download-dialog-view":47,"./import-tabbed-dialog-view":50,"./menu-bar-view":52,"./provider-tabbed-dialog-view":56,"./rename-dialog-view":57,"./share-dialog-view":59}],45:[function(require,module,exports){
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



},{}],46:[function(require,module,exports){
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



},{"./modal-view":55}],47:[function(require,module,exports){
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



},{"../utils/translate":43,"./modal-dialog-view":53}],48:[function(require,module,exports){
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



},{}],49:[function(require,module,exports){
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



},{"../providers/provider-interface":37,"../utils/translate":43,"./authorize-mixin":45}],50:[function(require,module,exports){
var LocalFileImportTab, LocalFileTab, ModalTabbedDialog, TabbedPanel, tr;

ModalTabbedDialog = React.createFactory(require('./modal-tabbed-dialog-view'));

TabbedPanel = require('./tabbed-panel-view');

LocalFileTab = React.createFactory(require('./local-file-tab-view'));

tr = require('../utils/translate');

LocalFileImportTab = React.createFactory(React.createClass);

module.exports = React.createClass({
  displayName: 'ImportTabbedDialog',
  importFile: function(metadata) {
    var reader;
    switch (metadata.provider) {
      case 'localFile':
        reader = new FileReader();
        reader.onload = (function(_this) {
          return function(loaded) {
            var base, data;
            data = {
              name: metadata.providerData.file.name,
              content: loaded.target.result
            };
            return typeof (base = _this.props.dialog).callback === "function" ? base.callback(data) : void 0;
          };
        })(this);
        return reader.readAsText(metadata.providerData.file);
    }
  },
  render: function() {
    var tabs;
    tabs = [
      TabbedPanel.Tab({
        key: 0,
        label: tr("~IMPORT.LOCAL_FILE"),
        component: LocalFileTab({
          dialog: {
            callback: this.importFile
          },
          provider: 'localFile',
          close: this.props.close
        })
      })
    ];
    return ModalTabbedDialog({
      title: tr("~DIALOG.IMPORT_DATA"),
      close: this.props.close,
      tabs: tabs,
      selectedTabIndex: 0
    });
  }
});



},{"../utils/translate":43,"./local-file-tab-view":51,"./modal-tabbed-dialog-view":54,"./tabbed-panel-view":60}],51:[function(require,module,exports){
var CloudMetadata, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, button = ref.button;

tr = require('../utils/translate');

CloudMetadata = (require('../providers/provider-interface')).CloudMetadata;

module.exports = React.createClass({
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
});



},{"../providers/provider-interface":37,"../utils/translate":43}],52:[function(require,module,exports){
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
      return tr("~MENUBAR.UNTITLED_DOCUMENT");
    }
  },
  getInitialState: function() {
    var state;
    return state = {
      editingFilename: false,
      filename: this.getFilename(this.props),
      editableFilename: this.getEditableFilename(this.props),
      initialEditableFilename: this.getEditableFilename(this.props)
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
    var el;
    el = this.filename();
    el.focus();
    return el.select();
  },
  cancelEdit: function() {
    var ref1;
    return this.setState({
      editingFilename: false,
      editableFilename: ((ref1 = this.state.filename) != null ? ref1.length : void 0) > 0 ? this.state.filename : this.state.initialEditableFilename
    });
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
      return this.cancelEdit();
    }
  },
  watchForEnter: function(e) {
    if (e.keyCode === 13) {
      return this.rename();
    } else if (e.keyCode === 27) {
      return this.cancelEdit();
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



},{"../utils/translate":43,"./dropdown-view":48}],53:[function(require,module,exports){
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



},{"./modal-view":55}],54:[function(require,module,exports){
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



},{"./modal-dialog-view":53,"./tabbed-panel-view":60}],55:[function(require,module,exports){
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



},{}],56:[function(require,module,exports){
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



},{"../providers/provider-interface":37,"../utils/translate":43,"./file-dialog-tab-view":49,"./modal-tabbed-dialog-view":54,"./select-provider-dialog-tab-view":58,"./tabbed-panel-view":60}],57:[function(require,module,exports){
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



},{"../utils/translate":43,"./modal-dialog-view":53}],58:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],59:[function(require,module,exports){
var ModalDialog, SocialIcon, a, button, circle, div, g, input, li, path, ref, socialIcons, span, strong, svg, textarea, tr, ul;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button, strong = ref.strong, textarea = ref.textarea, svg = ref.svg, g = ref.g, path = ref.path, span = ref.span, circle = ref.circle, ul = ref.ul, li = ref.li;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

socialIcons = require('svg-social-icons/lib/icons.json');

SocialIcon = React.createFactory(React.createClass({
  displayName: 'SocialIcon',
  getInitialState: function() {
    return {
      data: socialIcons[this.props.icon]
    };
  },
  clicked: function() {
    return window.open(this.props.url);
  },
  render: function() {
    return a({
      className: 'social-icon',
      href: this.props.url,
      target: '_blank'
    }, div({
      className: 'social-container'
    }, svg({
      className: 'social-svg',
      viewBox: '0 0 64 64'
    }, g({
      className: 'social-svg-background'
    }, circle({
      cx: 32,
      cy: 32,
      r: 31
    })), g({
      className: 'social-svg-icon'
    }, path({
      d: this.state.data.icon
    })), g({
      className: 'social-svg-mask',
      style: {
        fill: this.state.data.color
      }
    }, path({
      d: this.state.data.mask
    })))));
  }
}));

module.exports = React.createClass({
  displayName: 'ShareDialogView',
  getInitialState: function() {
    return {
      link: this.getShareLink(),
      embed: this.getEmbed(),
      linkTabSelected: true
    };
  },
  getSharedDocumentId: function() {
    var ref1;
    return (ref1 = this.props.client.state.currentContent) != null ? ref1.get("sharedDocumentId") : void 0;
  },
  getShareLink: function() {
    var sharedDocumentId;
    sharedDocumentId = this.getSharedDocumentId();
    if (sharedDocumentId) {
      return (this.props.client.getCurrentUrl()) + "#shared=" + sharedDocumentId;
    } else {
      return null;
    }
  },
  getEmbed: function() {
    if (this.getShareLink()) {
      return "<iframe width=\"398px\" height=\"313px\" frameborder=\"no\" scrolling=\"no\" allowfullscreen=\"true\" webkitallowfullscreen=\"true\" mozallowfullscreen=\"true\" src=\"" + (this.getShareLink()) + "\"></iframe>";
    } else {
      return null;
    }
  },
  copy: function(e) {
    var copied, error, error1, mark, range, selection;
    e.preventDefault();
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
  updateShare: function() {
    return this.props.client.shareUpdate();
  },
  toggleShare: function(e) {
    e.preventDefault();
    return this.props.client.toggleShare((function(_this) {
      return function() {
        return _this.setState({
          link: _this.getShareLink(),
          embed: _this.getEmbed()
        });
      };
    })(this));
  },
  selectLinkTab: function() {
    return this.setState({
      linkTabSelected: true
    });
  },
  selectEmbedTab: function() {
    return this.setState({
      linkTabSelected: false
    });
  },
  render: function() {
    var sharing;
    sharing = this.state.link !== null;
    return ModalDialog({
      title: tr('~DIALOG.SHARED'),
      close: this.props.close
    }, div({
      className: 'share-dialog'
    }, div({
      className: 'share-top-dialog'
    }, sharing ? div({}, div({
      className: 'share-status'
    }, "Shared view is ", strong({}, "enabled"), a({
      href: '#',
      onClick: this.toggleShare
    }, 'Stop sharing')), div({
      className: 'share-button'
    }, button({
      onClick: this.updateShare
    }, "Update shared view"), div({
      className: 'share-button-help-sharing'
    }, a({
      href: this.state.link,
      target: '_blank'
    }, 'Preview shared view')))) : div({}, div({
      className: 'share-status'
    }, "Shared view is ", strong({}, "disabled")), div({
      className: 'share-button'
    }, button({
      onClick: this.toggleShare
    }, "Enable sharing"), div({
      className: 'share-button-help-not-sharing'
    }, "When sharing is enabled, a copy of the current view is created.  This copy can be shared.")))), sharing ? div({}, ul({
      className: 'sharing-tabs'
    }, li({
      className: "sharing-tab" + (this.state.linkTabSelected ? ' sharing-tab-selected' : ''),
      style: {
        marginLeft: 10
      },
      onClick: this.selectLinkTab
    }, 'Link'), li({
      className: "sharing-tab sharing-tab-embed" + (!this.state.linkTabSelected ? ' sharing-tab-selected' : ''),
      onClick: this.selectEmbedTab
    }, 'Embed')), div({
      className: 'sharing-tab-contents'
    }, this.state.linkTabSelected ? div({}, "Paste this into an email or text message ", document.execCommand || window.clipboardData ? a({
      className: 'copy-link',
      href: '#',
      onClick: this.copy
    }, tr('~SHARE_DIALOG.COPY')) : void 0, div({}, input({
      value: this.state.link,
      readOnly: true
    })), div({
      className: 'social-icons'
    }, SocialIcon({
      icon: 'facebook',
      url: "https://www.facebook.com/sharer/sharer.php?u=" + (encodeURIComponent(this.state.link))
    }), SocialIcon({
      icon: 'twitter',
      url: "https://twitter.com/home?status=" + (encodeURIComponent(this.state.link))
    }))) : div({}, "Embed code for including in webpages or other web-based content", div({}, textarea({
      value: this.state.embed,
      readOnly: true
    }))))) : void 0, div({
      className: 'buttons'
    }, button({
      onClick: this.props.close
    }, tr('~SHARE_DIALOG.CLOSE')))));
  }
});



},{"../utils/translate":43,"./modal-dialog-view":53,"svg-social-icons/lib/icons.json":31}],60:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiLi4vLi4vc3JjL2NvbnZlcnQvZG1wLmpzIiwiLi4vLi4vc3JjL2NvbnZlcnQveG1sLmpzIiwiLi4vLi4vc3JjL2RpZmYvYmFzZS5qcyIsIi4uLy4uL3NyYy9kaWZmL2NoYXJhY3Rlci5qcyIsIi4uLy4uL3NyYy9kaWZmL2Nzcy5qcyIsIi4uLy4uL3NyYy9kaWZmL2pzb24uanMiLCIuLi8uLi9zcmMvZGlmZi9saW5lLmpzIiwiLi4vLi4vc3JjL2RpZmYvc2VudGVuY2UuanMiLCIuLi8uLi9zcmMvZGlmZi93b3JkLmpzIiwiLi4vc3JjL2luZGV4LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2FwcGx5LmpzIiwiLi4vLi4vc3JjL3BhdGNoL2NyZWF0ZS5qcyIsIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS5qcyIsIi4uLy4uL3NyYy91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yLmpzIiwiLi4vLi4vc3JjL3V0aWwvcGFyYW1zLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIm5vZGVfbW9kdWxlcy9zdmctc29jaWFsLWljb25zL2xpYi9pY29ucy5qc29uIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbC1maWxlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xccmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdWkuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGdldC1oYXNoLXBhcmFtLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxpcy1zdHJpbmcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdXRpbHNcXGxhbmdcXGVuLXVzLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFx0cmFuc2xhdGUuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXGFwcC12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhdXRob3JpemUtbWl4aW4uY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXGJsb2NraW5nLW1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXGRvd25sb2FkLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkcm9wZG93bi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxmaWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcaW1wb3J0LXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbG9jYWwtZmlsZS10YWItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbWVudS1iYXItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxyZW5hbWUtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHNlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHNoYXJlLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUU5QyxZQUFBLEdBQWUsT0FBQSxDQUFRLHdCQUFSOztBQUVUO0VBRVMsMEJBQUMsT0FBRDtJQUVYLElBQUMsQ0FBQSxXQUFELEdBQWUsc0JBQXNCLENBQUM7SUFFdEMsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLHNCQUFBLENBQUE7SUFDZCxJQUFDLENBQUEsVUFBRCxHQUFjO0VBTEg7OzZCQU9iLElBQUEsR0FBTSxTQUFDLFVBQUQsRUFBYyxXQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7O01BQWEsY0FBYzs7SUFDaEMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLEdBQTBCO1dBQzFCLElBQUMsQ0FBQSxNQUFNLENBQUMsYUFBUixDQUFzQixJQUFDLENBQUEsVUFBdkI7RUFGSTs7NkJBSU4sV0FBQSxHQUFhLFNBQUMsVUFBRCxFQUFjLE1BQWQsRUFBc0IsYUFBdEI7SUFBQyxJQUFDLENBQUEsYUFBRDs7TUFBcUIsZ0JBQWdCOztJQUNqRCxJQUFDLENBQUEsSUFBRCxDQUFNLElBQUMsQ0FBQSxVQUFQLEVBQW1CLElBQW5CO0lBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLENBQWUsYUFBZjtXQUNBLElBQUMsQ0FBQSxVQUFELENBQVksUUFBUSxDQUFDLGNBQVQsQ0FBd0IsTUFBeEIsQ0FBWjtFQUhXOzs2QkFLYixhQUFBLEdBQWUsU0FBQyxhQUFEO0FBQ2IsUUFBQTtJQUFBLElBQUcsQ0FBSSxJQUFDLENBQUEsVUFBVSxDQUFDLFdBQW5CO01BQ0UsSUFBQyxDQUFBLGdCQUFELENBQUEsRUFERjs7SUFFQSxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsQ0FBZSxhQUFmO0lBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxPQUFSLENBQUE7SUFFQSxlQUFBLEdBQWtCLFlBQUEsQ0FBYSxRQUFiO0lBQ2xCLFVBQUEsR0FBYSxZQUFBLENBQWEsTUFBYjtJQUNiLFVBQUEsR0FBYSxZQUFBLENBQWEsTUFBYjtJQUNiLElBQUcsZUFBSDthQUNFLElBQUMsQ0FBQSxNQUFNLENBQUMsaUJBQVIsQ0FBMEIsZUFBMUIsRUFERjtLQUFBLE1BRUssSUFBRyxVQUFIO01BQ0gsTUFBaUMsVUFBVSxDQUFDLEtBQVgsQ0FBaUIsR0FBakIsQ0FBakMsRUFBQyxxQkFBRCxFQUFlO2FBQ2YsSUFBQyxDQUFBLE1BQU0sQ0FBQyxnQkFBUixDQUF5QixZQUF6QixFQUF1QyxjQUF2QyxFQUZHO0tBQUEsTUFHQSxJQUFHLFVBQUg7YUFDSCxJQUFDLENBQUEsTUFBTSxDQUFDLGNBQVIsQ0FBdUIsVUFBdkIsRUFERzs7RUFkUTs7NkJBaUJmLGdCQUFBLEdBQWtCLFNBQUE7QUFDaEIsUUFBQTtJQUFBLE1BQUEsR0FBUyxRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QjtJQUNULFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBZCxDQUEwQixNQUExQjtXQUNBLElBQUMsQ0FBQSxVQUFELENBQVksTUFBWjtFQUhnQjs7NkJBS2xCLFVBQUEsR0FBWSxTQUFDLE1BQUQ7SUFDVixJQUFDLENBQUEsVUFBVSxDQUFDLE1BQVosR0FBcUIsSUFBQyxDQUFBO1dBQ3RCLEtBQUssQ0FBQyxNQUFOLENBQWMsT0FBQSxDQUFRLElBQUMsQ0FBQSxVQUFULENBQWQsRUFBb0MsTUFBcEM7RUFGVTs7Ozs7O0FBSWQsTUFBTSxDQUFDLE9BQVAsR0FBcUIsSUFBQSxnQkFBQSxDQUFBOzs7Ozs7Ozs7OztBQ2xEZCxTQUFTLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtBQUMzQyxNQUFJLEdBQUcsR0FBRyxFQUFFO01BQ1IsTUFBTSxZQUFBO01BQ04sU0FBUyxZQUFBLENBQUM7QUFDZCxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN2QyxVQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLFFBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtBQUNoQixlQUFTLEdBQUcsQ0FBQyxDQUFDO0tBQ2YsTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDekIsZUFBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ2hCLE1BQU07QUFDTCxlQUFTLEdBQUcsQ0FBQyxDQUFDO0tBQ2Y7O0FBRUQsT0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztHQUNyQztBQUNELFNBQU8sR0FBRyxDQUFDO0NBQ1o7Ozs7Ozs7OztBQ2xCTSxTQUFTLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtBQUMzQyxNQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDYixPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN2QyxRQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsUUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ2hCLFNBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDekIsU0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNuQjs7QUFFRCxPQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7QUFFbkMsUUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQ2hCLFNBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDcEIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDekIsU0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNwQjtHQUNGO0FBQ0QsU0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3JCOztBQUVELFNBQVMsVUFBVSxDQUFDLENBQUMsRUFBRTtBQUNyQixNQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDVixHQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0IsR0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLEdBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM1QixHQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7O0FBRTlCLFNBQU8sQ0FBQyxDQUFDO0NBQ1Y7Ozs7Ozs7cUJDN0J1QixJQUFJOztBQUFiLFNBQVMsSUFBSSxHQUFHLEVBQUU7O0FBRWpDLElBQUksQ0FBQyxTQUFTLEdBQUc7QUFDZixNQUFJLEVBQUEsY0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFnQjtRQUFkLE9BQU8seURBQUcsRUFBRTs7QUFDckMsUUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNoQyxRQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRTtBQUNqQyxjQUFRLEdBQUcsT0FBTyxDQUFDO0FBQ25CLGFBQU8sR0FBRyxFQUFFLENBQUM7S0FDZDtBQUNELFFBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOztBQUV2QixRQUFJLElBQUksR0FBRyxJQUFJLENBQUM7O0FBRWhCLGFBQVMsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUNuQixVQUFJLFFBQVEsRUFBRTtBQUNaLGtCQUFVLENBQUMsWUFBVztBQUFFLGtCQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMxRCxlQUFPLElBQUksQ0FBQztPQUNiLE1BQU07QUFDTCxlQUFPLEtBQUssQ0FBQztPQUNkO0tBQ0Y7OztBQUdELGFBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RDLGFBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUV0QyxhQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDdkQsYUFBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOztBQUV2RCxRQUFJLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTTtRQUFFLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQ3pELFFBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztBQUNuQixRQUFJLGFBQWEsR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3BDLFFBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7OztBQUdoRCxRQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLFFBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxFQUFFOztBQUU1RCxhQUFPLElBQUksQ0FBQyxDQUFDLEVBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckU7OztBQUdELGFBQVMsY0FBYyxHQUFHO0FBQ3hCLFdBQUssSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLFlBQVksSUFBSSxVQUFVLEVBQUUsWUFBWSxJQUFJLENBQUMsRUFBRTtBQUN0RixZQUFJLFFBQVEsWUFBQSxDQUFDO0FBQ2IsWUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7WUFDcEMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU0sR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQSxHQUFJLFlBQVksQ0FBQztBQUNqRSxZQUFJLE9BQU8sRUFBRTs7QUFFWCxrQkFBUSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUM7U0FDeEM7O0FBRUQsWUFBSSxNQUFNLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU07WUFDL0MsU0FBUyxHQUFHLFVBQVUsSUFBSSxDQUFDLElBQUksT0FBTSxJQUFJLE9BQU0sR0FBRyxNQUFNLENBQUM7QUFDN0QsWUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRTs7QUFFekIsa0JBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyxTQUFTLENBQUM7QUFDbkMsbUJBQVM7U0FDVjs7Ozs7QUFLRCxZQUFJLENBQUMsTUFBTSxJQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEFBQUMsRUFBRTtBQUNoRSxrQkFBUSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyxjQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzFELE1BQU07QUFDTCxrQkFBUSxHQUFHLE9BQU8sQ0FBQztBQUNuQixrQkFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2xCLGNBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDMUQ7O0FBRUQsZUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7OztBQUcxRSxZQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sSUFBSSxPQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sRUFBRTtBQUN6RCxpQkFBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7U0FDakcsTUFBTTs7QUFFTCxrQkFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLFFBQVEsQ0FBQztTQUNuQztPQUNGOztBQUVELGdCQUFVLEVBQUUsQ0FBQztLQUNkOzs7OztBQUtELFFBQUksUUFBUSxFQUFFO0FBQ1osQUFBQyxPQUFBLFNBQVMsSUFBSSxHQUFHO0FBQ2Ysa0JBQVUsQ0FBQyxZQUFXOzs7QUFHcEIsY0FBSSxVQUFVLEdBQUcsYUFBYSxFQUFFO0FBQzlCLG1CQUFPLFFBQVEsRUFBRSxDQUFDO1dBQ25COztBQUVELGNBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtBQUNyQixnQkFBSSxFQUFFLENBQUM7V0FDUjtTQUNGLEVBQUUsQ0FBQyxDQUFDLENBQUM7T0FDUCxDQUFBLEVBQUUsQ0FBRTtLQUNOLE1BQU07QUFDTCxhQUFPLFVBQVUsSUFBSSxhQUFhLEVBQUU7QUFDbEMsWUFBSSxHQUFHLEdBQUcsY0FBYyxFQUFFLENBQUM7QUFDM0IsWUFBSSxHQUFHLEVBQUU7QUFDUCxpQkFBTyxHQUFHLENBQUM7U0FDWjtPQUNGO0tBQ0Y7R0FDRjs7QUFFRCxlQUFhLEVBQUEsdUJBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7QUFDeEMsUUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDN0MsUUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUU7OztBQUc1RCxnQkFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7S0FDOUYsTUFBTTtBQUNMLGdCQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0tBQzlEO0dBQ0Y7QUFDRCxlQUFhLEVBQUEsdUJBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFO0FBQzFELFFBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNO1FBQ3pCLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTTtRQUN6QixNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU07UUFDeEIsTUFBTSxHQUFHLE1BQU0sR0FBRyxZQUFZO1FBRTlCLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDcEIsV0FBTyxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzlHLFlBQU0sRUFBRSxDQUFDO0FBQ1QsWUFBTSxFQUFFLENBQUM7QUFDVCxpQkFBVyxFQUFFLENBQUM7S0FDZjs7QUFFRCxRQUFJLFdBQVcsRUFBRTtBQUNmLGNBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLFdBQVcsRUFBQyxDQUFDLENBQUM7S0FDaEQ7O0FBRUQsWUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDekIsV0FBTyxNQUFNLENBQUM7R0FDZjs7QUFFRCxRQUFNLEVBQUEsZ0JBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUNsQixXQUFPLElBQUksS0FBSyxLQUFLLENBQUM7R0FDdkI7QUFDRCxhQUFXLEVBQUEscUJBQUMsS0FBSyxFQUFFO0FBQ2pCLFFBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNiLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3JDLFVBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ1osV0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUNwQjtLQUNGO0FBQ0QsV0FBTyxHQUFHLENBQUM7R0FDWjtBQUNELFdBQVMsRUFBQSxtQkFBQyxLQUFLLEVBQUU7QUFDZixXQUFPLEtBQUssQ0FBQztHQUNkO0FBQ0QsVUFBUSxFQUFBLGtCQUFDLEtBQUssRUFBRTtBQUNkLFdBQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUN4QjtDQUNGLENBQUM7O0FBRUYsU0FBUyxXQUFXLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtBQUM1RSxNQUFJLFlBQVksR0FBRyxDQUFDO01BQ2hCLFlBQVksR0FBRyxVQUFVLENBQUMsTUFBTTtNQUNoQyxNQUFNLEdBQUcsQ0FBQztNQUNWLE1BQU0sR0FBRyxDQUFDLENBQUM7O0FBRWYsU0FBTyxZQUFZLEdBQUcsWUFBWSxFQUFFLFlBQVksRUFBRSxFQUFFO0FBQ2xELFFBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QyxRQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRTtBQUN0QixVQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxlQUFlLEVBQUU7QUFDdkMsWUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5RCxhQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEtBQUssRUFBRSxDQUFDLEVBQUU7QUFDbkMsY0FBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyQyxpQkFBTyxRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsUUFBUSxHQUFHLEtBQUssQ0FBQztTQUMxRCxDQUFDLENBQUM7O0FBRUgsaUJBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztPQUNsQyxNQUFNO0FBQ0wsaUJBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7T0FDOUU7QUFDRCxZQUFNLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQzs7O0FBRzFCLFVBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO0FBQ3BCLGNBQU0sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDO09BQzNCO0tBQ0YsTUFBTTtBQUNMLGVBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDN0UsWUFBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUM7Ozs7O0FBSzFCLFVBQUksWUFBWSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFO0FBQ3RELFlBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkMsa0JBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hELGtCQUFVLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxDQUFDO09BQ2hDO0tBQ0Y7R0FDRjs7OztBQUlELE1BQUksYUFBYSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakQsTUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQSxJQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUMxRixjQUFVLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDO0FBQzFELGNBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztHQUNsQjs7QUFFRCxTQUFPLFVBQVUsQ0FBQztDQUNuQjs7QUFFRCxTQUFTLFNBQVMsQ0FBQyxJQUFJLEVBQUU7QUFDdkIsU0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0NBQ3RFOzs7Ozs7Ozs7Ozs7O29CQzNOZ0IsUUFBUTs7OztBQUVsQixJQUFNLGFBQWEsR0FBRyx1QkFBVSxDQUFDOzs7QUFDakMsU0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFBRSxTQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztDQUFFOzs7Ozs7Ozs7Ozs7b0JDSDNGLFFBQVE7Ozs7QUFFbEIsSUFBTSxPQUFPLEdBQUcsdUJBQVUsQ0FBQzs7QUFDbEMsT0FBTyxDQUFDLFFBQVEsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUNqQyxTQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7Q0FDckMsQ0FBQzs7QUFFSyxTQUFTLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUFFLFNBQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0NBQUU7Ozs7Ozs7Ozs7Ozs7b0JDUG5GLFFBQVE7Ozs7b0JBQ0YsUUFBUTs7QUFFL0IsSUFBTSx1QkFBdUIsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQzs7QUFHbkQsSUFBTSxRQUFRLEdBQUcsdUJBQVUsQ0FBQzs7OztBQUduQyxRQUFRLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzs7QUFFaEMsUUFBUSxDQUFDLFFBQVEsR0FBRyxlQUFTLFFBQVEsQ0FBQztBQUN0QyxRQUFRLENBQUMsU0FBUyxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ25DLFNBQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7Q0FDakcsQ0FBQztBQUNGLFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBUyxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ3RDLFNBQU8sa0JBQUssU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ25HLENBQUM7O0FBRUssU0FBUyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFBRSxTQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztDQUFFOzs7OztBQUsvRixTQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFO0FBQ3pELE9BQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO0FBQ3BCLGtCQUFnQixHQUFHLGdCQUFnQixJQUFJLEVBQUUsQ0FBQzs7QUFFMUMsTUFBSSxDQUFDLFlBQUEsQ0FBQzs7QUFFTixPQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNwQyxRQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDcEIsYUFBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM1QjtHQUNGOztBQUVELE1BQUksZ0JBQWdCLFlBQUEsQ0FBQzs7QUFFckIsTUFBSSxnQkFBZ0IsS0FBSyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDMUQsU0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQixvQkFBZ0IsR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekMsb0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsU0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDbEMsc0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztLQUNyRTtBQUNELFNBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNaLG9CQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO0dBQ3hCLE1BQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtBQUNsRCxTQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLG9CQUFnQixHQUFHLEVBQUUsQ0FBQztBQUN0QixvQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN4QyxRQUFJLFVBQVUsR0FBRyxFQUFFO1FBQ2YsR0FBRyxZQUFBLENBQUM7QUFDUixTQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUU7O0FBRWYsVUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLGtCQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQ3RCO0tBQ0Y7QUFDRCxjQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbEIsU0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDekMsU0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixzQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0tBQ3pFO0FBQ0QsU0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ1osb0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDeEIsTUFBTTtBQUNMLG9CQUFnQixHQUFHLEdBQUcsQ0FBQztHQUN4QjtBQUNELFNBQU8sZ0JBQWdCLENBQUM7Q0FDekI7Ozs7Ozs7Ozs7Ozs7b0JDdEVnQixRQUFROzs7OzBCQUNLLGdCQUFnQjs7QUFFdkMsSUFBTSxRQUFRLEdBQUcsdUJBQVUsQ0FBQzs7QUFDbkMsUUFBUSxDQUFDLFFBQVEsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUNsQyxNQUFJLFFBQVEsR0FBRyxFQUFFO01BQ2IsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQzs7O0FBR2hELE1BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDbEQsb0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7R0FDeEI7OztBQUdELE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEQsUUFBSSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRS9CLFFBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFO0FBQ3pDLGNBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztLQUN2QyxNQUFNO0FBQ0wsVUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFO0FBQ2pDLFlBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7T0FDcEI7QUFDRCxjQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3JCO0dBQ0Y7O0FBRUQsU0FBTyxRQUFRLENBQUM7Q0FDakIsQ0FBQzs7QUFFSyxTQUFTLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUFFLFNBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0NBQUU7O0FBQ2hHLFNBQVMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDekQsTUFBSSxPQUFPLEdBQUcsNEJBQWdCLFFBQVEsRUFBRSxFQUFDLGdCQUFnQixFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDbEUsU0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7Q0FDL0M7Ozs7Ozs7Ozs7OztvQkNsQ2dCLFFBQVE7Ozs7QUFHbEIsSUFBTSxZQUFZLEdBQUcsdUJBQVUsQ0FBQzs7QUFDdkMsWUFBWSxDQUFDLFFBQVEsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUN0QyxTQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztDQUM3QyxDQUFDOztBQUVLLFNBQVMsYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQUUsU0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Q0FBRTs7Ozs7Ozs7Ozs7OztvQkNSOUYsUUFBUTs7OzswQkFDSyxnQkFBZ0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0I5QyxJQUFNLGlCQUFpQixHQUFHLCtEQUFxRyxDQUFDOztBQUVoSSxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7O0FBRW5CLElBQU0sUUFBUSxHQUFHLHVCQUFVLENBQUM7O0FBQ25DLFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBUyxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ3RDLFNBQU8sSUFBSSxLQUFLLEtBQUssSUFBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEFBQUMsQ0FBQztDQUNuSCxDQUFDO0FBQ0YsUUFBUSxDQUFDLFFBQVEsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUNsQyxNQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDOzs7QUFHckMsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFOztBQUUxQyxRQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUMxQixpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQ2pDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDOUMsWUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDM0IsWUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLE9BQUMsRUFBRSxDQUFDO0tBQ0w7R0FDRjs7QUFFRCxTQUFPLE1BQU0sQ0FBQztDQUNmLENBQUM7O0FBRUssU0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDbEQsTUFBSSxPQUFPLEdBQUcsNEJBQWdCLFFBQVEsRUFBRSxFQUFDLGdCQUFnQixFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDbEUsU0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7Q0FDL0M7O0FBQ00sU0FBUyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUMzRCxTQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztDQUNoRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O3dCQ3JDZ0IsYUFBYTs7Ozs2QkFDTixrQkFBa0I7O3dCQUNFLGFBQWE7O3dCQUNmLGFBQWE7OzRCQUMzQixpQkFBaUI7O3VCQUV2QixZQUFZOzt3QkFDRyxhQUFhOzswQkFFWCxlQUFlOzswQkFDN0IsZUFBZTs7MkJBQ3dCLGdCQUFnQjs7MEJBRTlDLGVBQWU7OzBCQUNmLGVBQWU7O1FBRy9DLElBQUk7UUFFSixTQUFTO1FBQ1QsU0FBUztRQUNULGtCQUFrQjtRQUNsQixTQUFTO1FBQ1QsZ0JBQWdCO1FBQ2hCLGFBQWE7UUFFYixPQUFPO1FBQ1AsUUFBUTtRQUVSLGVBQWU7UUFDZixtQkFBbUI7UUFDbkIsV0FBVztRQUNYLFVBQVU7UUFDVixZQUFZO1FBQ1osVUFBVTtRQUNWLG1CQUFtQjtRQUNuQixtQkFBbUI7UUFDbkIsWUFBWTs7Ozs7Ozs7Ozs7OztxQkNyRFcsU0FBUzs7b0NBQ0wsMkJBQTJCOzs7O0FBRWpELFNBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQWdCO01BQWQsT0FBTyx5REFBRyxFQUFFOztBQUN0RCxNQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRTtBQUMvQixXQUFPLEdBQUcsa0JBQVcsT0FBTyxDQUFDLENBQUM7R0FDL0I7O0FBRUQsTUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQzFCLFFBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDdEIsWUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0tBQy9EOztBQUVELFdBQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDdEI7OztBQUdELE1BQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO01BQzFCLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSztNQUVyQixXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSyxVQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFlBQVk7V0FBSyxJQUFJLEtBQUssWUFBWTtHQUFBLEFBQUM7TUFDM0csVUFBVSxHQUFHLENBQUM7TUFDZCxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsSUFBSSxDQUFDO01BQ3BDLE9BQU8sR0FBRyxDQUFDO01BQ1gsTUFBTSxHQUFHLENBQUM7TUFFVixXQUFXLFlBQUE7TUFDWCxRQUFRLFlBQUEsQ0FBQzs7Ozs7QUFLYixXQUFTLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQzdCLFNBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQyxVQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztVQUNwQixTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztVQUNuQixPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFN0IsVUFBSSxTQUFTLEtBQUssR0FBRyxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUU7O0FBRTFDLFlBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQzdELG9CQUFVLEVBQUUsQ0FBQzs7QUFFYixjQUFJLFVBQVUsR0FBRyxVQUFVLEVBQUU7QUFDM0IsbUJBQU8sS0FBSyxDQUFDO1dBQ2Q7U0FDRjtBQUNELGFBQUssRUFBRSxDQUFDO09BQ1Q7S0FDRjs7QUFFRCxXQUFPLElBQUksQ0FBQztHQUNiOzs7QUFHRCxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNyQyxRQUFJLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2YsT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVE7UUFDdEMsV0FBVyxHQUFHLENBQUM7UUFDZixLQUFLLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDOztBQUV2QyxRQUFJLFFBQVEsR0FBRyxrQ0FBaUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQzs7QUFFekQsV0FBTyxXQUFXLEtBQUssU0FBUyxFQUFFLFdBQVcsR0FBRyxRQUFRLEVBQUUsRUFBRTtBQUMxRCxVQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLFdBQVcsQ0FBQyxFQUFFO0FBQ3ZDLFlBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLFdBQVcsQ0FBQztBQUNwQyxjQUFNO09BQ1A7S0FDRjs7QUFFRCxRQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7QUFDN0IsYUFBTyxLQUFLLENBQUM7S0FDZDs7OztBQUlELFdBQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztHQUN2RDs7O0FBR0QsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDckMsUUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNmLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDOztBQUU1QyxTQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDMUMsVUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7VUFDcEIsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7VUFDbkIsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTdCLFVBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtBQUNyQixhQUFLLEVBQUUsQ0FBQztPQUNULE1BQU0sSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO0FBQzVCLGFBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDOztPQUV4QixNQUFNLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtBQUM1QixlQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDaEMsZUFBSyxFQUFFLENBQUM7U0FDVCxNQUFNLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtBQUM3QixjQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUN4RSxjQUFJLGlCQUFpQixLQUFLLEdBQUcsRUFBRTtBQUM3Qix1QkFBVyxHQUFHLElBQUksQ0FBQztXQUNwQixNQUFNLElBQUksaUJBQWlCLEtBQUssR0FBRyxFQUFFO0FBQ3BDLG9CQUFRLEdBQUcsSUFBSSxDQUFDO1dBQ2pCO1NBQ0Y7S0FDRjtHQUNGOzs7QUFHRCxNQUFJLFdBQVcsRUFBRTtBQUNmLFdBQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRTtBQUMvQixXQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7S0FDYjtHQUNGLE1BQU0sSUFBSSxRQUFRLEVBQUU7QUFDbkIsU0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztHQUNoQjtBQUNELFNBQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN6Qjs7OztBQUdNLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUU7QUFDN0MsTUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7QUFDL0IsV0FBTyxHQUFHLGtCQUFXLE9BQU8sQ0FBQyxDQUFDO0dBQy9COztBQUVELE1BQUksWUFBWSxHQUFHLENBQUMsQ0FBQztBQUNyQixXQUFTLFlBQVksR0FBRztBQUN0QixRQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztBQUNwQyxRQUFJLENBQUMsS0FBSyxFQUFFO0FBQ1YsYUFBTyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7S0FDM0I7O0FBRUQsV0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsVUFBUyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQzFDLFVBQUksR0FBRyxFQUFFO0FBQ1AsZUFBTyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO09BQzlCOztBQUVELFVBQUksY0FBYyxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3RELGFBQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDOztBQUV2QyxnQkFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM3QixDQUFDLENBQUM7R0FDSjtBQUNELGNBQVksRUFBRSxDQUFDO0NBQ2hCOzs7Ozs7Ozs7Ozs7Ozt3QkNoSnVCLGNBQWM7O0FBRS9CLFNBQVMsZUFBZSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRTtBQUN2RyxNQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osV0FBTyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO0dBQzFCOztBQUVELE1BQU0sSUFBSSxHQUFHLG9CQUFVLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN2QyxNQUFJLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQzs7QUFFbEMsV0FBUyxZQUFZLENBQUMsS0FBSyxFQUFFO0FBQzNCLFdBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEtBQUssRUFBRTtBQUFFLGFBQU8sR0FBRyxHQUFHLEtBQUssQ0FBQztLQUFFLENBQUMsQ0FBQztHQUMzRDs7QUFFRCxNQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDZixNQUFJLGFBQWEsR0FBRyxDQUFDO01BQUUsYUFBYSxHQUFHLENBQUM7TUFBRSxRQUFRLEdBQUcsRUFBRTtNQUNuRCxPQUFPLEdBQUcsQ0FBQztNQUFFLE9BQU8sR0FBRyxDQUFDLENBQUM7O3dCQUNwQixDQUFDO0FBQ1IsUUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqQixLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVFLFdBQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDOztBQUV0QixRQUFJLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTs7Ozs7O0FBRXBDLFVBQUksQ0FBQyxhQUFhLEVBQUU7QUFDbEIsWUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6QixxQkFBYSxHQUFHLE9BQU8sQ0FBQztBQUN4QixxQkFBYSxHQUFHLE9BQU8sQ0FBQzs7QUFFeEIsWUFBSSxJQUFJLEVBQUU7QUFDUixrQkFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN2Rix1QkFBYSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFDakMsdUJBQWEsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ2xDO09BQ0Y7OztBQUdELG1CQUFBLFFBQVEsRUFBQyxJQUFJLE1BQUEsK0JBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEtBQUssRUFBRTtBQUMxQyxlQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFBLEdBQUksS0FBSyxDQUFDO09BQzVDLENBQUMsRUFBQyxDQUFDOzs7QUFHSixVQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7QUFDakIsZUFBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7T0FDekIsTUFBTTtBQUNMLGVBQU8sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDO09BQ3pCO0tBQ0YsTUFBTTs7QUFFTCxVQUFJLGFBQWEsRUFBRTs7QUFFakIsWUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTs7Ozs7O0FBRTlELHdCQUFBLFFBQVEsRUFBQyxJQUFJLE1BQUEsZ0NBQUssWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUM7U0FDeEMsTUFBTTs7Ozs7O0FBRUwsY0FBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMxRCx3QkFBQSxRQUFRLEVBQUMsSUFBSSxNQUFBLGdDQUFLLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFDLENBQUM7O0FBRTdELGNBQUksSUFBSSxHQUFHO0FBQ1Qsb0JBQVEsRUFBRSxhQUFhO0FBQ3ZCLG9CQUFRLEVBQUcsT0FBTyxHQUFHLGFBQWEsR0FBRyxXQUFXLEFBQUM7QUFDakQsb0JBQVEsRUFBRSxhQUFhO0FBQ3ZCLG9CQUFRLEVBQUcsT0FBTyxHQUFHLGFBQWEsR0FBRyxXQUFXLEFBQUM7QUFDakQsaUJBQUssRUFBRSxRQUFRO1dBQ2hCLENBQUM7QUFDRixjQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7O0FBRTNELGdCQUFJLGFBQWEsR0FBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxBQUFDLENBQUM7QUFDekMsZ0JBQUksYUFBYSxHQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEFBQUMsQ0FBQztBQUN6QyxnQkFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTs7QUFFdkMsc0JBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsOEJBQThCLENBQUMsQ0FBQzthQUNuRSxNQUFNLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxhQUFhLEVBQUU7QUFDM0Msc0JBQVEsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQzthQUMvQztXQUNGO0FBQ0QsZUFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFakIsdUJBQWEsR0FBRyxDQUFDLENBQUM7QUFDbEIsdUJBQWEsR0FBRyxDQUFDLENBQUM7QUFDbEIsa0JBQVEsR0FBRyxFQUFFLENBQUM7U0FDZjtPQUNGO0FBQ0QsYUFBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDeEIsYUFBTyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7S0FDekI7OztBQXJFSCxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtVQUE3QixDQUFDO0dBc0VUOztBQUVELFNBQU87QUFDTCxlQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXO0FBQ2xELGFBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVM7QUFDMUMsU0FBSyxFQUFFLEtBQUs7R0FDYixDQUFDO0NBQ0g7O0FBRU0sU0FBUyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7QUFDM0csTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDOztBQUV0RyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDZixNQUFJLFdBQVcsSUFBSSxXQUFXLEVBQUU7QUFDOUIsT0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLENBQUM7R0FDbkM7QUFDRCxLQUFHLENBQUMsSUFBSSxDQUFDLHFFQUFxRSxDQUFDLENBQUM7QUFDaEYsS0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQSxBQUFDLENBQUMsQ0FBQztBQUMzRyxLQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBLEFBQUMsQ0FBQyxDQUFDOztBQUUzRyxPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDMUMsUUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixPQUFHLENBQUMsSUFBSSxDQUNOLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUMxQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FDMUMsS0FBSyxDQUNSLENBQUM7QUFDRixPQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ2pDOztBQUVELFNBQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDOUI7O0FBRU0sU0FBUyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7QUFDbkYsU0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztDQUMvRjs7Ozs7Ozs7O0FDMUhNLFNBQVMsVUFBVSxDQUFDLE9BQU8sRUFBZ0I7TUFBZCxPQUFPLHlEQUFHLEVBQUU7O0FBQzlDLE1BQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO01BQzdCLElBQUksR0FBRyxFQUFFO01BQ1QsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFVixXQUFTLFVBQVUsR0FBRztBQUNwQixRQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDZixRQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7QUFHakIsV0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUN6QixVQUFJLElBQUksR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7OztBQUd0QixVQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN0QyxjQUFNO09BQ1A7OztBQUdELFVBQUksTUFBTSxHQUFHLEFBQUMsMENBQTBDLENBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLFVBQUksTUFBTSxFQUFFO0FBQ1YsYUFBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDekI7O0FBRUQsT0FBQyxFQUFFLENBQUM7S0FDTDs7OztBQUlELG1CQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkIsbUJBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7O0FBR3ZCLFNBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVqQixXQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3pCLFVBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFdEIsVUFBSSxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDL0MsY0FBTTtPQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQzNCLGFBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7T0FDL0IsTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFOztBQUVqQyxjQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLEFBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO09BQ3pFLE1BQU07QUFDTCxTQUFDLEVBQUUsQ0FBQztPQUNMO0tBQ0Y7R0FDRjs7OztBQUlELFdBQVMsZUFBZSxDQUFDLEtBQUssRUFBRTtBQUM5QixRQUFJLFVBQVUsR0FBRyxBQUFDLHNDQUFzQyxDQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxRQUFJLFVBQVUsRUFBRTtBQUNkLFVBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUN4RCxXQUFLLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxXQUFLLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFNUMsT0FBQyxFQUFFLENBQUM7S0FDTDtHQUNGOzs7O0FBSUQsV0FBUyxTQUFTLEdBQUc7QUFDbkIsUUFBSSxnQkFBZ0IsR0FBRyxDQUFDO1FBQ3BCLGVBQWUsR0FBRyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUIsV0FBVyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQzs7QUFFdEYsUUFBSSxJQUFJLEdBQUc7QUFDVCxjQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLGNBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzlCLGNBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDekIsY0FBUSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDOUIsV0FBSyxFQUFFLEVBQUU7S0FDVixDQUFDOztBQUVGLFFBQUksUUFBUSxHQUFHLENBQUM7UUFDWixXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFdBQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDOUIsVUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU5QixVQUFJLFNBQVMsS0FBSyxHQUFHLElBQUksU0FBUyxLQUFLLEdBQUcsSUFBSSxTQUFTLEtBQUssR0FBRyxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUU7QUFDckYsWUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTVCLFlBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtBQUNyQixrQkFBUSxFQUFFLENBQUM7U0FDWixNQUFNLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtBQUM1QixxQkFBVyxFQUFFLENBQUM7U0FDZixNQUFNLElBQUksU0FBUyxLQUFLLEdBQUcsRUFBRTtBQUM1QixrQkFBUSxFQUFFLENBQUM7QUFDWCxxQkFBVyxFQUFFLENBQUM7U0FDZjtPQUNGLE1BQU07QUFDTCxjQUFNO09BQ1A7S0FDRjs7O0FBR0QsUUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsRUFBRTtBQUNwQyxVQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztLQUNuQjtBQUNELFFBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUU7QUFDdkMsVUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7S0FDbkI7OztBQUdELFFBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUNsQixVQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQzlCLGNBQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDO09BQzlGO0FBQ0QsVUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNqQyxjQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQSxBQUFDLENBQUMsQ0FBQztPQUNoRztLQUNGOztBQUVELFdBQU8sSUFBSSxDQUFDO0dBQ2I7O0FBRUQsU0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUN6QixjQUFVLEVBQUUsQ0FBQztHQUNkOztBQUVELFNBQU8sSUFBSSxDQUFDO0NBQ2I7Ozs7Ozs7Ozs7cUJDM0hjLFVBQVMsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7QUFDL0MsTUFBSSxXQUFXLEdBQUcsSUFBSTtNQUNsQixpQkFBaUIsR0FBRyxLQUFLO01BQ3pCLGdCQUFnQixHQUFHLEtBQUs7TUFDeEIsV0FBVyxHQUFHLENBQUMsQ0FBQzs7QUFFcEIsU0FBTyxTQUFTLFFBQVE7Ozs4QkFBRzs7O0FBQ3pCLFVBQUksV0FBVyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7QUFDcEMsWUFBSSxpQkFBaUIsRUFBRTtBQUNyQixxQkFBVyxFQUFFLENBQUM7U0FDZixNQUFNO0FBQ0wscUJBQVcsR0FBRyxLQUFLLENBQUM7U0FDckI7Ozs7QUFJRCxZQUFJLEtBQUssR0FBRyxXQUFXLElBQUksT0FBTyxFQUFFO0FBQ2xDLGlCQUFPLFdBQVcsQ0FBQztTQUNwQjs7QUFFRCx3QkFBZ0IsR0FBRyxJQUFJLENBQUM7T0FDekI7O0FBRUQsVUFBSSxDQUFDLGlCQUFpQixFQUFFO0FBQ3RCLFlBQUksQ0FBQyxnQkFBZ0IsRUFBRTtBQUNyQixxQkFBVyxHQUFHLElBQUksQ0FBQztTQUNwQjs7OztBQUlELFlBQUksT0FBTyxJQUFJLEtBQUssR0FBRyxXQUFXLEVBQUU7QUFDbEMsaUJBQU8sRUFBQyxXQUFXLEVBQUUsQ0FBQztTQUN2Qjs7QUFFRCx5QkFBaUIsR0FBRyxJQUFJLENBQUM7OztPQUUxQjs7OztLQUlGO0dBQUEsQ0FBQztDQUNIOzs7Ozs7Ozs7Ozs7QUM1Q00sU0FBUyxlQUFlLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRTtBQUNqRCxNQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRTtBQUNqQyxZQUFRLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztHQUM3QixNQUFNLElBQUksT0FBTyxFQUFFO0FBQ2xCLFNBQUssSUFBSSxLQUFJLElBQUksT0FBTyxFQUFFOztBQUV4QixVQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsS0FBSSxDQUFDLEVBQUU7QUFDaEMsZ0JBQVEsQ0FBQyxLQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSSxDQUFDLENBQUM7T0FDaEM7S0FDRjtHQUNGO0FBQ0QsU0FBTyxRQUFRLENBQUM7Q0FDakI7Ozs7QUNaRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEEsSUFBQSw4T0FBQTtF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LFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxjQUE3QjtLQUFKLEVBQ0MsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbmdldEhhc2hQYXJhbSA9IHJlcXVpcmUgJy4vdXRpbHMvZ2V0LWhhc2gtcGFyYW0nXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxyXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG5cclxuICAgIEBjbGllbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudCgpXHJcbiAgICBAYXBwT3B0aW9ucyA9IHt9XHJcblxyXG4gIGluaXQ6IChAYXBwT3B0aW9ucywgdXNpbmdJZnJhbWUgPSBmYWxzZSkgLT5cclxuICAgIEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lID0gdXNpbmdJZnJhbWVcclxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBAYXBwT3B0aW9uc1xyXG5cclxuICBjcmVhdGVGcmFtZTogKEBhcHBPcHRpb25zLCBlbGVtSWQsIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcclxuICAgIEBjbGllbnQubGlzdGVuIGV2ZW50Q2FsbGJhY2tcclxuICAgIEBfcmVuZGVyQXBwIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1JZClcclxuXHJcbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWVcclxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxyXG4gICAgQGNsaWVudC5saXN0ZW4gZXZlbnRDYWxsYmFja1xyXG4gICAgQGNsaWVudC5jb25uZWN0KClcclxuXHJcbiAgICBzaGFyZWRDb250ZW50SWQgPSBnZXRIYXNoUGFyYW0gXCJzaGFyZWRcIlxyXG4gICAgZmlsZVBhcmFtcyA9IGdldEhhc2hQYXJhbSBcImZpbGVcIlxyXG4gICAgY29weVBhcmFtcyA9IGdldEhhc2hQYXJhbSBcImNvcHlcIlxyXG4gICAgaWYgc2hhcmVkQ29udGVudElkXHJcbiAgICAgIEBjbGllbnQub3BlblNoYXJlZENvbnRlbnQgc2hhcmVkQ29udGVudElkXHJcbiAgICBlbHNlIGlmIGZpbGVQYXJhbXNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJQYXJhbXNdID0gZmlsZVBhcmFtcy5zcGxpdCAnOidcclxuICAgICAgQGNsaWVudC5vcGVuUHJvdmlkZXJGaWxlIHByb3ZpZGVyTmFtZSwgcHJvdmlkZXJQYXJhbXNcclxuICAgIGVsc2UgaWYgY29weVBhcmFtc1xyXG4gICAgICBAY2xpZW50Lm9wZW5Db3BpZWRGaWxlIGNvcHlQYXJhbXNcclxuXHJcbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cclxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYW5jaG9yKVxyXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXHJcblxyXG4gIF9yZW5kZXJBcHA6IChhbmNob3IpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XHJcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxyXG4iLCIvLyBTZWU6IGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9nb29nbGUtZGlmZi1tYXRjaC1wYXRjaC93aWtpL0FQSVxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9ETVAoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW10sXG4gICAgICBjaGFuZ2UsXG4gICAgICBvcGVyYXRpb247XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGNoYW5nZSA9IGNoYW5nZXNbaV07XG4gICAgaWYgKGNoYW5nZS5hZGRlZCkge1xuICAgICAgb3BlcmF0aW9uID0gMTtcbiAgICB9IGVsc2UgaWYgKGNoYW5nZS5yZW1vdmVkKSB7XG4gICAgICBvcGVyYXRpb24gPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3BlcmF0aW9uID0gMDtcbiAgICB9XG5cbiAgICByZXQucHVzaChbb3BlcmF0aW9uLCBjaGFuZ2UudmFsdWVdKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRDaGFuZ2VzVG9YTUwoY2hhbmdlcykge1xuICBsZXQgcmV0ID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbmdlcy5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjaGFuZ2UgPSBjaGFuZ2VzW2ldO1xuICAgIGlmIChjaGFuZ2UuYWRkZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8aW5zPicpO1xuICAgIH0gZWxzZSBpZiAoY2hhbmdlLnJlbW92ZWQpIHtcbiAgICAgIHJldC5wdXNoKCc8ZGVsPicpO1xuICAgIH1cblxuICAgIHJldC5wdXNoKGVzY2FwZUhUTUwoY2hhbmdlLnZhbHVlKSk7XG5cbiAgICBpZiAoY2hhbmdlLmFkZGVkKSB7XG4gICAgICByZXQucHVzaCgnPC9pbnM+Jyk7XG4gICAgfSBlbHNlIGlmIChjaGFuZ2UucmVtb3ZlZCkge1xuICAgICAgcmV0LnB1c2goJzwvZGVsPicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVIVE1MKHMpIHtcbiAgbGV0IG4gPSBzO1xuICBuID0gbi5yZXBsYWNlKC8mL2csICcmYW1wOycpO1xuICBuID0gbi5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG4gIG4gPSBuLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcbiAgbiA9IG4ucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuXG4gIHJldHVybiBuO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRGlmZigpIHt9XG5cbkRpZmYucHJvdG90eXBlID0ge1xuICBkaWZmKG9sZFN0cmluZywgbmV3U3RyaW5nLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY2FsbGJhY2sgPSBvcHRpb25zLmNhbGxiYWNrO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgbGV0IHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gZG9uZSh2YWx1ZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKHVuZGVmaW5lZCwgdmFsdWUpOyB9LCAwKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgc3ViY2xhc3NlcyB0byBtYXNzYWdlIHRoZSBpbnB1dCBwcmlvciB0byBydW5uaW5nXG4gICAgb2xkU3RyaW5nID0gdGhpcy5jYXN0SW5wdXQob2xkU3RyaW5nKTtcbiAgICBuZXdTdHJpbmcgPSB0aGlzLmNhc3RJbnB1dChuZXdTdHJpbmcpO1xuXG4gICAgb2xkU3RyaW5nID0gdGhpcy5yZW1vdmVFbXB0eSh0aGlzLnRva2VuaXplKG9sZFN0cmluZykpO1xuICAgIG5ld1N0cmluZyA9IHRoaXMucmVtb3ZlRW1wdHkodGhpcy50b2tlbml6ZShuZXdTdHJpbmcpKTtcblxuICAgIGxldCBuZXdMZW4gPSBuZXdTdHJpbmcubGVuZ3RoLCBvbGRMZW4gPSBvbGRTdHJpbmcubGVuZ3RoO1xuICAgIGxldCBlZGl0TGVuZ3RoID0gMTtcbiAgICBsZXQgbWF4RWRpdExlbmd0aCA9IG5ld0xlbiArIG9sZExlbjtcbiAgICBsZXQgYmVzdFBhdGggPSBbeyBuZXdQb3M6IC0xLCBjb21wb25lbnRzOiBbXSB9XTtcblxuICAgIC8vIFNlZWQgZWRpdExlbmd0aCA9IDAsIGkuZS4gdGhlIGNvbnRlbnQgc3RhcnRzIHdpdGggdGhlIHNhbWUgdmFsdWVzXG4gICAgbGV0IG9sZFBvcyA9IHRoaXMuZXh0cmFjdENvbW1vbihiZXN0UGF0aFswXSwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIDApO1xuICAgIGlmIChiZXN0UGF0aFswXS5uZXdQb3MgKyAxID49IG5ld0xlbiAmJiBvbGRQb3MgKyAxID49IG9sZExlbikge1xuICAgICAgLy8gSWRlbnRpdHkgcGVyIHRoZSBlcXVhbGl0eSBhbmQgdG9rZW5pemVyXG4gICAgICByZXR1cm4gZG9uZShbe3ZhbHVlOiBuZXdTdHJpbmcuam9pbignJyksIGNvdW50OiBuZXdTdHJpbmcubGVuZ3RofV0pO1xuICAgIH1cblxuICAgIC8vIE1haW4gd29ya2VyIG1ldGhvZC4gY2hlY2tzIGFsbCBwZXJtdXRhdGlvbnMgb2YgYSBnaXZlbiBlZGl0IGxlbmd0aCBmb3IgYWNjZXB0YW5jZS5cbiAgICBmdW5jdGlvbiBleGVjRWRpdExlbmd0aCgpIHtcbiAgICAgIGZvciAobGV0IGRpYWdvbmFsUGF0aCA9IC0xICogZWRpdExlbmd0aDsgZGlhZ29uYWxQYXRoIDw9IGVkaXRMZW5ndGg7IGRpYWdvbmFsUGF0aCArPSAyKSB7XG4gICAgICAgIGxldCBiYXNlUGF0aDtcbiAgICAgICAgbGV0IGFkZFBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggLSAxXSxcbiAgICAgICAgICAgIHJlbW92ZVBhdGggPSBiZXN0UGF0aFtkaWFnb25hbFBhdGggKyAxXSxcbiAgICAgICAgICAgIG9sZFBvcyA9IChyZW1vdmVQYXRoID8gcmVtb3ZlUGF0aC5uZXdQb3MgOiAwKSAtIGRpYWdvbmFsUGF0aDtcbiAgICAgICAgaWYgKGFkZFBhdGgpIHtcbiAgICAgICAgICAvLyBObyBvbmUgZWxzZSBpcyBnb2luZyB0byBhdHRlbXB0IHRvIHVzZSB0aGlzIHZhbHVlLCBjbGVhciBpdFxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aCAtIDFdID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNhbkFkZCA9IGFkZFBhdGggJiYgYWRkUGF0aC5uZXdQb3MgKyAxIDwgbmV3TGVuLFxuICAgICAgICAgICAgY2FuUmVtb3ZlID0gcmVtb3ZlUGF0aCAmJiAwIDw9IG9sZFBvcyAmJiBvbGRQb3MgPCBvbGRMZW47XG4gICAgICAgIGlmICghY2FuQWRkICYmICFjYW5SZW1vdmUpIHtcbiAgICAgICAgICAvLyBJZiB0aGlzIHBhdGggaXMgYSB0ZXJtaW5hbCB0aGVuIHBydW5lXG4gICAgICAgICAgYmVzdFBhdGhbZGlhZ29uYWxQYXRoXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCB0aGUgZGlhZ29uYWwgdGhhdCB3ZSB3YW50IHRvIGJyYW5jaCBmcm9tLiBXZSBzZWxlY3QgdGhlIHByaW9yXG4gICAgICAgIC8vIHBhdGggd2hvc2UgcG9zaXRpb24gaW4gdGhlIG5ldyBzdHJpbmcgaXMgdGhlIGZhcnRoZXN0IGZyb20gdGhlIG9yaWdpblxuICAgICAgICAvLyBhbmQgZG9lcyBub3QgcGFzcyB0aGUgYm91bmRzIG9mIHRoZSBkaWZmIGdyYXBoXG4gICAgICAgIGlmICghY2FuQWRkIHx8IChjYW5SZW1vdmUgJiYgYWRkUGF0aC5uZXdQb3MgPCByZW1vdmVQYXRoLm5ld1BvcykpIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGNsb25lUGF0aChyZW1vdmVQYXRoKTtcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IGFkZFBhdGg7ICAgLy8gTm8gbmVlZCB0byBjbG9uZSwgd2UndmUgcHVsbGVkIGl0IGZyb20gdGhlIGxpc3RcbiAgICAgICAgICBiYXNlUGF0aC5uZXdQb3MrKztcbiAgICAgICAgICBzZWxmLnB1c2hDb21wb25lbnQoYmFzZVBhdGguY29tcG9uZW50cywgdHJ1ZSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9sZFBvcyA9IHNlbGYuZXh0cmFjdENvbW1vbihiYXNlUGF0aCwgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIGRpYWdvbmFsUGF0aCk7XG5cbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBoaXQgdGhlIGVuZCBvZiBib3RoIHN0cmluZ3MsIHRoZW4gd2UgYXJlIGRvbmVcbiAgICAgICAgaWYgKGJhc2VQYXRoLm5ld1BvcyArIDEgPj0gbmV3TGVuICYmIG9sZFBvcyArIDEgPj0gb2xkTGVuKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoYnVpbGRWYWx1ZXMoc2VsZiwgYmFzZVBhdGguY29tcG9uZW50cywgbmV3U3RyaW5nLCBvbGRTdHJpbmcsIHNlbGYudXNlTG9uZ2VzdFRva2VuKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRyYWNrIHRoaXMgcGF0aCBhcyBhIHBvdGVudGlhbCBjYW5kaWRhdGUgYW5kIGNvbnRpbnVlLlxuICAgICAgICAgIGJlc3RQYXRoW2RpYWdvbmFsUGF0aF0gPSBiYXNlUGF0aDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlZGl0TGVuZ3RoKys7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybXMgdGhlIGxlbmd0aCBvZiBlZGl0IGl0ZXJhdGlvbi4gSXMgYSBiaXQgZnVnbHkgYXMgdGhpcyBoYXMgdG8gc3VwcG9ydCB0aGVcbiAgICAvLyBzeW5jIGFuZCBhc3luYyBtb2RlIHdoaWNoIGlzIG5ldmVyIGZ1bi4gTG9vcHMgb3ZlciBleGVjRWRpdExlbmd0aCB1bnRpbCBhIHZhbHVlXG4gICAgLy8gaXMgcHJvZHVjZWQuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAoZnVuY3Rpb24gZXhlYygpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBUaGlzIHNob3VsZCBub3QgaGFwcGVuLCBidXQgd2Ugd2FudCB0byBiZSBzYWZlLlxuICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgICAgaWYgKGVkaXRMZW5ndGggPiBtYXhFZGl0TGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWV4ZWNFZGl0TGVuZ3RoKCkpIHtcbiAgICAgICAgICAgIGV4ZWMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hpbGUgKGVkaXRMZW5ndGggPD0gbWF4RWRpdExlbmd0aCkge1xuICAgICAgICBsZXQgcmV0ID0gZXhlY0VkaXRMZW5ndGgoKTtcbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgcHVzaENvbXBvbmVudChjb21wb25lbnRzLCBhZGRlZCwgcmVtb3ZlZCkge1xuICAgIGxldCBsYXN0ID0gY29tcG9uZW50c1tjb21wb25lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0ICYmIGxhc3QuYWRkZWQgPT09IGFkZGVkICYmIGxhc3QucmVtb3ZlZCA9PT0gcmVtb3ZlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBjbG9uZSBoZXJlIGFzIHRoZSBjb21wb25lbnQgY2xvbmUgb3BlcmF0aW9uIGlzIGp1c3RcbiAgICAgIC8vIGFzIHNoYWxsb3cgYXJyYXkgY2xvbmVcbiAgICAgIGNvbXBvbmVudHNbY29tcG9uZW50cy5sZW5ndGggLSAxXSA9IHtjb3VudDogbGFzdC5jb3VudCArIDEsIGFkZGVkOiBhZGRlZCwgcmVtb3ZlZDogcmVtb3ZlZCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzLnB1c2goe2NvdW50OiAxLCBhZGRlZDogYWRkZWQsIHJlbW92ZWQ6IHJlbW92ZWQgfSk7XG4gICAgfVxuICB9LFxuICBleHRyYWN0Q29tbW9uKGJhc2VQYXRoLCBuZXdTdHJpbmcsIG9sZFN0cmluZywgZGlhZ29uYWxQYXRoKSB7XG4gICAgbGV0IG5ld0xlbiA9IG5ld1N0cmluZy5sZW5ndGgsXG4gICAgICAgIG9sZExlbiA9IG9sZFN0cmluZy5sZW5ndGgsXG4gICAgICAgIG5ld1BvcyA9IGJhc2VQYXRoLm5ld1BvcyxcbiAgICAgICAgb2xkUG9zID0gbmV3UG9zIC0gZGlhZ29uYWxQYXRoLFxuXG4gICAgICAgIGNvbW1vbkNvdW50ID0gMDtcbiAgICB3aGlsZSAobmV3UG9zICsgMSA8IG5ld0xlbiAmJiBvbGRQb3MgKyAxIDwgb2xkTGVuICYmIHRoaXMuZXF1YWxzKG5ld1N0cmluZ1tuZXdQb3MgKyAxXSwgb2xkU3RyaW5nW29sZFBvcyArIDFdKSkge1xuICAgICAgbmV3UG9zKys7XG4gICAgICBvbGRQb3MrKztcbiAgICAgIGNvbW1vbkNvdW50Kys7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkNvdW50KSB7XG4gICAgICBiYXNlUGF0aC5jb21wb25lbnRzLnB1c2goe2NvdW50OiBjb21tb25Db3VudH0pO1xuICAgIH1cblxuICAgIGJhc2VQYXRoLm5ld1BvcyA9IG5ld1BvcztcbiAgICByZXR1cm4gb2xkUG9zO1xuICB9LFxuXG4gIGVxdWFscyhsZWZ0LCByaWdodCkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgfSxcbiAgcmVtb3ZlRW1wdHkoYXJyYXkpIHtcbiAgICBsZXQgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycmF5W2ldKSB7XG4gICAgICAgIHJldC5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgY2FzdElucHV0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICB0b2tlbml6ZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5zcGxpdCgnJyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJ1aWxkVmFsdWVzKGRpZmYsIGNvbXBvbmVudHMsIG5ld1N0cmluZywgb2xkU3RyaW5nLCB1c2VMb25nZXN0VG9rZW4pIHtcbiAgbGV0IGNvbXBvbmVudFBvcyA9IDAsXG4gICAgICBjb21wb25lbnRMZW4gPSBjb21wb25lbnRzLmxlbmd0aCxcbiAgICAgIG5ld1BvcyA9IDAsXG4gICAgICBvbGRQb3MgPSAwO1xuXG4gIGZvciAoOyBjb21wb25lbnRQb3MgPCBjb21wb25lbnRMZW47IGNvbXBvbmVudFBvcysrKSB7XG4gICAgbGV0IGNvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICBpZiAoIWNvbXBvbmVudC5yZW1vdmVkKSB7XG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCAmJiB1c2VMb25nZXN0VG9rZW4pIHtcbiAgICAgICAgbGV0IHZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KTtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUsIGkpIHtcbiAgICAgICAgICBsZXQgb2xkVmFsdWUgPSBvbGRTdHJpbmdbb2xkUG9zICsgaV07XG4gICAgICAgICAgcmV0dXJuIG9sZFZhbHVlLmxlbmd0aCA+IHZhbHVlLmxlbmd0aCA/IG9sZFZhbHVlIDogdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbXBvbmVudC52YWx1ZSA9IHZhbHVlLmpvaW4oJycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50LnZhbHVlID0gbmV3U3RyaW5nLnNsaWNlKG5ld1BvcywgbmV3UG9zICsgY29tcG9uZW50LmNvdW50KS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICAgIG5ld1BvcyArPSBjb21wb25lbnQuY291bnQ7XG5cbiAgICAgIC8vIENvbW1vbiBjYXNlXG4gICAgICBpZiAoIWNvbXBvbmVudC5hZGRlZCkge1xuICAgICAgICBvbGRQb3MgKz0gY29tcG9uZW50LmNvdW50O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnQudmFsdWUgPSBvbGRTdHJpbmcuc2xpY2Uob2xkUG9zLCBvbGRQb3MgKyBjb21wb25lbnQuY291bnQpLmpvaW4oJycpO1xuICAgICAgb2xkUG9zICs9IGNvbXBvbmVudC5jb3VudDtcblxuICAgICAgLy8gUmV2ZXJzZSBhZGQgYW5kIHJlbW92ZSBzbyByZW1vdmVzIGFyZSBvdXRwdXQgZmlyc3QgdG8gbWF0Y2ggY29tbW9uIGNvbnZlbnRpb25cbiAgICAgIC8vIFRoZSBkaWZmaW5nIGFsZ29yaXRobSBpcyB0aWVkIHRvIGFkZCB0aGVuIHJlbW92ZSBvdXRwdXQgYW5kIHRoaXMgaXMgdGhlIHNpbXBsZXN0XG4gICAgICAvLyByb3V0ZSB0byBnZXQgdGhlIGRlc2lyZWQgb3V0cHV0IHdpdGggbWluaW1hbCBvdmVyaGVhZC5cbiAgICAgIGlmIChjb21wb25lbnRQb3MgJiYgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXS5hZGRlZCkge1xuICAgICAgICBsZXQgdG1wID0gY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3MgLSAxXSA9IGNvbXBvbmVudHNbY29tcG9uZW50UG9zXTtcbiAgICAgICAgY29tcG9uZW50c1tjb21wb25lbnRQb3NdID0gdG1wO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNwZWNpYWwgY2FzZSBoYW5kbGUgZm9yIHdoZW4gb25lIHRlcm1pbmFsIGlzIGlnbm9yZWQuIEZvciB0aGlzIGNhc2Ugd2UgbWVyZ2UgdGhlXG4gIC8vIHRlcm1pbmFsIGludG8gdGhlIHByaW9yIHN0cmluZyBhbmQgZHJvcCB0aGUgY2hhbmdlLlxuICBsZXQgbGFzdENvbXBvbmVudCA9IGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMV07XG4gIGlmICgobGFzdENvbXBvbmVudC5hZGRlZCB8fCBsYXN0Q29tcG9uZW50LnJlbW92ZWQpICYmIGRpZmYuZXF1YWxzKCcnLCBsYXN0Q29tcG9uZW50LnZhbHVlKSkge1xuICAgIGNvbXBvbmVudHNbY29tcG9uZW50TGVuIC0gMl0udmFsdWUgKz0gbGFzdENvbXBvbmVudC52YWx1ZTtcbiAgICBjb21wb25lbnRzLnBvcCgpO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBvbmVudHM7XG59XG5cbmZ1bmN0aW9uIGNsb25lUGF0aChwYXRoKSB7XG4gIHJldHVybiB7IG5ld1BvczogcGF0aC5uZXdQb3MsIGNvbXBvbmVudHM6IHBhdGguY29tcG9uZW50cy5zbGljZSgwKSB9O1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGNvbnN0IGNoYXJhY3RlckRpZmYgPSBuZXcgRGlmZigpO1xuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDaGFycyhvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spIHsgcmV0dXJuIGNoYXJhY3RlckRpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spOyB9XG4iLCJpbXBvcnQgRGlmZiBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgY29uc3QgY3NzRGlmZiA9IG5ldyBEaWZmKCk7XG5jc3NEaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnNwbGl0KC8oW3t9OjssXXxcXHMrKS8pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZDc3Mob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBjc3NEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7bGluZURpZmZ9IGZyb20gJy4vbGluZSc7XG5cbmNvbnN0IG9iamVjdFByb3RvdHlwZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuXG5leHBvcnQgY29uc3QganNvbkRpZmYgPSBuZXcgRGlmZigpO1xuLy8gRGlzY3JpbWluYXRlIGJldHdlZW4gdHdvIGxpbmVzIG9mIHByZXR0eS1wcmludGVkLCBzZXJpYWxpemVkIEpTT04gd2hlcmUgb25lIG9mIHRoZW0gaGFzIGFcbi8vIGRhbmdsaW5nIGNvbW1hIGFuZCB0aGUgb3RoZXIgZG9lc24ndC4gVHVybnMgb3V0IGluY2x1ZGluZyB0aGUgZGFuZ2xpbmcgY29tbWEgeWllbGRzIHRoZSBuaWNlc3Qgb3V0cHV0OlxuanNvbkRpZmYudXNlTG9uZ2VzdFRva2VuID0gdHJ1ZTtcblxuanNvbkRpZmYudG9rZW5pemUgPSBsaW5lRGlmZi50b2tlbml6ZTtcbmpzb25EaWZmLmNhc3RJbnB1dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeShjYW5vbmljYWxpemUodmFsdWUpLCB1bmRlZmluZWQsICcgICcpO1xufTtcbmpzb25EaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBEaWZmLnByb3RvdHlwZS5lcXVhbHMobGVmdC5yZXBsYWNlKC8sKFtcXHJcXG5dKS9nLCAnJDEnKSwgcmlnaHQucmVwbGFjZSgvLChbXFxyXFxuXSkvZywgJyQxJykpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRpZmZKc29uKG9sZE9iaiwgbmV3T2JqLCBjYWxsYmFjaykgeyByZXR1cm4ganNvbkRpZmYuZGlmZihvbGRPYmosIG5ld09iaiwgY2FsbGJhY2spOyB9XG5cblxuLy8gVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBwcmVzZW5jZSBvZiBjaXJjdWxhciByZWZlcmVuY2VzIGJ5IGJhaWxpbmcgb3V0IHdoZW4gZW5jb3VudGVyaW5nIGFuXG4vLyBvYmplY3QgdGhhdCBpcyBhbHJlYWR5IG9uIHRoZSBcInN0YWNrXCIgb2YgaXRlbXMgYmVpbmcgcHJvY2Vzc2VkLlxuZXhwb3J0IGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZShvYmosIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKSB7XG4gIHN0YWNrID0gc3RhY2sgfHwgW107XG4gIHJlcGxhY2VtZW50U3RhY2sgPSByZXBsYWNlbWVudFN0YWNrIHx8IFtdO1xuXG4gIGxldCBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBzdGFjay5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmIChzdGFja1tpXSA9PT0gb2JqKSB7XG4gICAgICByZXR1cm4gcmVwbGFjZW1lbnRTdGFja1tpXTtcbiAgICB9XG4gIH1cblxuICBsZXQgY2Fub25pY2FsaXplZE9iajtcblxuICBpZiAoJ1tvYmplY3QgQXJyYXldJyA9PT0gb2JqZWN0UHJvdG90eXBlVG9TdHJpbmcuY2FsbChvYmopKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSBuZXcgQXJyYXkob2JqLmxlbmd0aCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wdXNoKGNhbm9uaWNhbGl6ZWRPYmopO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNhbm9uaWNhbGl6ZWRPYmpbaV0gPSBjYW5vbmljYWxpemUob2JqW2ldLCBzdGFjaywgcmVwbGFjZW1lbnRTdGFjayk7XG4gICAgfVxuICAgIHN0YWNrLnBvcCgpO1xuICAgIHJlcGxhY2VtZW50U3RhY2sucG9wKCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsKSB7XG4gICAgc3RhY2sucHVzaChvYmopO1xuICAgIGNhbm9uaWNhbGl6ZWRPYmogPSB7fTtcbiAgICByZXBsYWNlbWVudFN0YWNrLnB1c2goY2Fub25pY2FsaXplZE9iaik7XG4gICAgbGV0IHNvcnRlZEtleXMgPSBbXSxcbiAgICAgICAga2V5O1xuICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzb3J0ZWRLZXlzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGVkS2V5cy5zb3J0KCk7XG4gICAgZm9yIChpID0gMDsgaSA8IHNvcnRlZEtleXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGtleSA9IHNvcnRlZEtleXNbaV07XG4gICAgICBjYW5vbmljYWxpemVkT2JqW2tleV0gPSBjYW5vbmljYWxpemUob2JqW2tleV0sIHN0YWNrLCByZXBsYWNlbWVudFN0YWNrKTtcbiAgICB9XG4gICAgc3RhY2sucG9wKCk7XG4gICAgcmVwbGFjZW1lbnRTdGFjay5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICBjYW5vbmljYWxpemVkT2JqID0gb2JqO1xuICB9XG4gIHJldHVybiBjYW5vbmljYWxpemVkT2JqO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbmV4cG9ydCBjb25zdCBsaW5lRGlmZiA9IG5ldyBEaWZmKCk7XG5saW5lRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGxldCByZXRMaW5lcyA9IFtdLFxuICAgICAgbGluZXNBbmROZXdsaW5lcyA9IHZhbHVlLnNwbGl0KC8oXFxufFxcclxcbikvKTtcblxuICAvLyBJZ25vcmUgdGhlIGZpbmFsIGVtcHR5IHRva2VuIHRoYXQgb2NjdXJzIGlmIHRoZSBzdHJpbmcgZW5kcyB3aXRoIGEgbmV3IGxpbmVcbiAgaWYgKCFsaW5lc0FuZE5ld2xpbmVzW2xpbmVzQW5kTmV3bGluZXMubGVuZ3RoIC0gMV0pIHtcbiAgICBsaW5lc0FuZE5ld2xpbmVzLnBvcCgpO1xuICB9XG5cbiAgLy8gTWVyZ2UgdGhlIGNvbnRlbnQgYW5kIGxpbmUgc2VwYXJhdG9ycyBpbnRvIHNpbmdsZSB0b2tlbnNcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lc0FuZE5ld2xpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGxpbmUgPSBsaW5lc0FuZE5ld2xpbmVzW2ldO1xuXG4gICAgaWYgKGkgJSAyICYmICF0aGlzLm9wdGlvbnMubmV3bGluZUlzVG9rZW4pIHtcbiAgICAgIHJldExpbmVzW3JldExpbmVzLmxlbmd0aCAtIDFdICs9IGxpbmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSkge1xuICAgICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICB9XG4gICAgICByZXRMaW5lcy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXRMaW5lcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7IHJldHVybiBsaW5lRGlmZi5kaWZmKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjayk7IH1cbmV4cG9ydCBmdW5jdGlvbiBkaWZmVHJpbW1lZExpbmVzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICBsZXQgb3B0aW9ucyA9IGdlbmVyYXRlT3B0aW9ucyhjYWxsYmFjaywge2lnbm9yZVdoaXRlc3BhY2U6IHRydWV9KTtcbiAgcmV0dXJuIGxpbmVEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIG9wdGlvbnMpO1xufVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcblxuXG5leHBvcnQgY29uc3Qgc2VudGVuY2VEaWZmID0gbmV3IERpZmYoKTtcbnNlbnRlbmNlRGlmZi50b2tlbml6ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS5zcGxpdCgvKFxcUy4rP1suIT9dKSg/PVxccyt8JCkvKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmU2VudGVuY2VzKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykgeyByZXR1cm4gc2VudGVuY2VEaWZmLmRpZmYob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKTsgfVxuIiwiaW1wb3J0IERpZmYgZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7Z2VuZXJhdGVPcHRpb25zfSBmcm9tICcuLi91dGlsL3BhcmFtcyc7XG5cbi8vIEJhc2VkIG9uIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xhdGluX3NjcmlwdF9pbl9Vbmljb2RlXG4vL1xuLy8gUmFuZ2VzIGFuZCBleGNlcHRpb25zOlxuLy8gTGF0aW4tMSBTdXBwbGVtZW50LCAwMDgw4oCTMDBGRlxuLy8gIC0gVSswMEQ3ICDDlyBNdWx0aXBsaWNhdGlvbiBzaWduXG4vLyAgLSBVKzAwRjcgIMO3IERpdmlzaW9uIHNpZ25cbi8vIExhdGluIEV4dGVuZGVkLUEsIDAxMDDigJMwMTdGXG4vLyBMYXRpbiBFeHRlbmRlZC1CLCAwMTgw4oCTMDI0RlxuLy8gSVBBIEV4dGVuc2lvbnMsIDAyNTDigJMwMkFGXG4vLyBTcGFjaW5nIE1vZGlmaWVyIExldHRlcnMsIDAyQjDigJMwMkZGXG4vLyAgLSBVKzAyQzcgIMuHICYjNzExOyAgQ2Fyb25cbi8vICAtIFUrMDJEOCAgy5ggJiM3Mjg7ICBCcmV2ZVxuLy8gIC0gVSswMkQ5ICDLmSAmIzcyOTsgIERvdCBBYm92ZVxuLy8gIC0gVSswMkRBICDLmiAmIzczMDsgIFJpbmcgQWJvdmVcbi8vICAtIFUrMDJEQiAgy5sgJiM3MzE7ICBPZ29uZWtcbi8vICAtIFUrMDJEQyAgy5wgJiM3MzI7ICBTbWFsbCBUaWxkZVxuLy8gIC0gVSswMkREICDLnSAmIzczMzsgIERvdWJsZSBBY3V0ZSBBY2NlbnRcbi8vIExhdGluIEV4dGVuZGVkIEFkZGl0aW9uYWwsIDFFMDDigJMxRUZGXG5jb25zdCBleHRlbmRlZFdvcmRDaGFycyA9IC9eW2EtekEtWlxcdXtDMH0tXFx1e0ZGfVxcdXtEOH0tXFx1e0Y2fVxcdXtGOH0tXFx1ezJDNn1cXHV7MkM4fS1cXHV7MkQ3fVxcdXsyREV9LVxcdXsyRkZ9XFx1ezFFMDB9LVxcdXsxRUZGfV0rJC91O1xuXG5jb25zdCByZVdoaXRlc3BhY2UgPSAvXFxTLztcblxuZXhwb3J0IGNvbnN0IHdvcmREaWZmID0gbmV3IERpZmYoKTtcbndvcmREaWZmLmVxdWFscyA9IGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gIHJldHVybiBsZWZ0ID09PSByaWdodCB8fCAodGhpcy5vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgJiYgIXJlV2hpdGVzcGFjZS50ZXN0KGxlZnQpICYmICFyZVdoaXRlc3BhY2UudGVzdChyaWdodCkpO1xufTtcbndvcmREaWZmLnRva2VuaXplID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgbGV0IHRva2VucyA9IHZhbHVlLnNwbGl0KC8oXFxzK3xcXGIpLyk7XG5cbiAgLy8gSm9pbiB0aGUgYm91bmRhcnkgc3BsaXRzIHRoYXQgd2UgZG8gbm90IGNvbnNpZGVyIHRvIGJlIGJvdW5kYXJpZXMuIFRoaXMgaXMgcHJpbWFyaWx5IHRoZSBleHRlbmRlZCBMYXRpbiBjaGFyYWN0ZXIgc2V0LlxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGFuIGVtcHR5IHN0cmluZyBpbiB0aGUgbmV4dCBmaWVsZCBhbmQgd2UgaGF2ZSBvbmx5IHdvcmQgY2hhcnMgYmVmb3JlIGFuZCBhZnRlciwgbWVyZ2VcbiAgICBpZiAoIXRva2Vuc1tpICsgMV0gJiYgdG9rZW5zW2kgKyAyXVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2ldKVxuICAgICAgICAgICYmIGV4dGVuZGVkV29yZENoYXJzLnRlc3QodG9rZW5zW2kgKyAyXSkpIHtcbiAgICAgIHRva2Vuc1tpXSArPSB0b2tlbnNbaSArIDJdO1xuICAgICAgdG9rZW5zLnNwbGljZShpICsgMSwgMik7XG4gICAgICBpLS07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRva2Vucztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBkaWZmV29yZHMob2xkU3RyLCBuZXdTdHIsIGNhbGxiYWNrKSB7XG4gIGxldCBvcHRpb25zID0gZ2VuZXJhdGVPcHRpb25zKGNhbGxiYWNrLCB7aWdub3JlV2hpdGVzcGFjZTogdHJ1ZX0pO1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgb3B0aW9ucyk7XG59XG5leHBvcnQgZnVuY3Rpb24gZGlmZldvcmRzV2l0aFNwYWNlKG9sZFN0ciwgbmV3U3RyLCBjYWxsYmFjaykge1xuICByZXR1cm4gd29yZERpZmYuZGlmZihvbGRTdHIsIG5ld1N0ciwgY2FsbGJhY2spO1xufVxuIiwiLyogU2VlIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMgb2YgdXNlICovXG5cbi8qXG4gKiBUZXh0IGRpZmYgaW1wbGVtZW50YXRpb24uXG4gKlxuICogVGhpcyBsaWJyYXJ5IHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgQVBJUzpcbiAqIEpzRGlmZi5kaWZmQ2hhcnM6IENoYXJhY3RlciBieSBjaGFyYWN0ZXIgZGlmZlxuICogSnNEaWZmLmRpZmZXb3JkczogV29yZCAoYXMgZGVmaW5lZCBieSBcXGIgcmVnZXgpIGRpZmYgd2hpY2ggaWdub3JlcyB3aGl0ZXNwYWNlXG4gKiBKc0RpZmYuZGlmZkxpbmVzOiBMaW5lIGJhc2VkIGRpZmZcbiAqXG4gKiBKc0RpZmYuZGlmZkNzczogRGlmZiB0YXJnZXRlZCBhdCBDU1MgY29udGVudFxuICpcbiAqIFRoZXNlIG1ldGhvZHMgYXJlIGJhc2VkIG9uIHRoZSBpbXBsZW1lbnRhdGlvbiBwcm9wb3NlZCBpblxuICogXCJBbiBPKE5EKSBEaWZmZXJlbmNlIEFsZ29yaXRobSBhbmQgaXRzIFZhcmlhdGlvbnNcIiAoTXllcnMsIDE5ODYpLlxuICogaHR0cDovL2NpdGVzZWVyeC5pc3QucHN1LmVkdS92aWV3ZG9jL3N1bW1hcnk/ZG9pPTEwLjEuMS40LjY5MjdcbiAqL1xuaW1wb3J0IERpZmYgZnJvbSAnLi9kaWZmL2Jhc2UnO1xuaW1wb3J0IHtkaWZmQ2hhcnN9IGZyb20gJy4vZGlmZi9jaGFyYWN0ZXInO1xuaW1wb3J0IHtkaWZmV29yZHMsIGRpZmZXb3Jkc1dpdGhTcGFjZX0gZnJvbSAnLi9kaWZmL3dvcmQnO1xuaW1wb3J0IHtkaWZmTGluZXMsIGRpZmZUcmltbWVkTGluZXN9IGZyb20gJy4vZGlmZi9saW5lJztcbmltcG9ydCB7ZGlmZlNlbnRlbmNlc30gZnJvbSAnLi9kaWZmL3NlbnRlbmNlJztcblxuaW1wb3J0IHtkaWZmQ3NzfSBmcm9tICcuL2RpZmYvY3NzJztcbmltcG9ydCB7ZGlmZkpzb24sIGNhbm9uaWNhbGl6ZX0gZnJvbSAnLi9kaWZmL2pzb24nO1xuXG5pbXBvcnQge2FwcGx5UGF0Y2gsIGFwcGx5UGF0Y2hlc30gZnJvbSAnLi9wYXRjaC9hcHBseSc7XG5pbXBvcnQge3BhcnNlUGF0Y2h9IGZyb20gJy4vcGF0Y2gvcGFyc2UnO1xuaW1wb3J0IHtzdHJ1Y3R1cmVkUGF0Y2gsIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsIGNyZWF0ZVBhdGNofSBmcm9tICcuL3BhdGNoL2NyZWF0ZSc7XG5cbmltcG9ydCB7Y29udmVydENoYW5nZXNUb0RNUH0gZnJvbSAnLi9jb252ZXJ0L2RtcCc7XG5pbXBvcnQge2NvbnZlcnRDaGFuZ2VzVG9YTUx9IGZyb20gJy4vY29udmVydC94bWwnO1xuXG5leHBvcnQge1xuICBEaWZmLFxuXG4gIGRpZmZDaGFycyxcbiAgZGlmZldvcmRzLFxuICBkaWZmV29yZHNXaXRoU3BhY2UsXG4gIGRpZmZMaW5lcyxcbiAgZGlmZlRyaW1tZWRMaW5lcyxcbiAgZGlmZlNlbnRlbmNlcyxcblxuICBkaWZmQ3NzLFxuICBkaWZmSnNvbixcblxuICBzdHJ1Y3R1cmVkUGF0Y2gsXG4gIGNyZWF0ZVR3b0ZpbGVzUGF0Y2gsXG4gIGNyZWF0ZVBhdGNoLFxuICBhcHBseVBhdGNoLFxuICBhcHBseVBhdGNoZXMsXG4gIHBhcnNlUGF0Y2gsXG4gIGNvbnZlcnRDaGFuZ2VzVG9ETVAsXG4gIGNvbnZlcnRDaGFuZ2VzVG9YTUwsXG4gIGNhbm9uaWNhbGl6ZVxufTtcbiIsImltcG9ydCB7cGFyc2VQYXRjaH0gZnJvbSAnLi9wYXJzZSc7XG5pbXBvcnQgZGlzdGFuY2VJdGVyYXRvciBmcm9tICcuLi91dGlsL2Rpc3RhbmNlLWl0ZXJhdG9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2goc291cmNlLCB1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKHR5cGVvZiB1bmlEaWZmID09PSAnc3RyaW5nJykge1xuICAgIHVuaURpZmYgPSBwYXJzZVBhdGNoKHVuaURpZmYpO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodW5pRGlmZikpIHtcbiAgICBpZiAodW5pRGlmZi5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwcGx5UGF0Y2ggb25seSB3b3JrcyB3aXRoIGEgc2luZ2xlIGlucHV0LicpO1xuICAgIH1cblxuICAgIHVuaURpZmYgPSB1bmlEaWZmWzBdO1xuICB9XG5cbiAgLy8gQXBwbHkgdGhlIGRpZmYgdG8gdGhlIGlucHV0XG4gIGxldCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyksXG4gICAgICBodW5rcyA9IHVuaURpZmYuaHVua3MsXG5cbiAgICAgIGNvbXBhcmVMaW5lID0gb3B0aW9ucy5jb21wYXJlTGluZSB8fCAoKGxpbmVOdW1iZXIsIGxpbmUsIG9wZXJhdGlvbiwgcGF0Y2hDb250ZW50KSA9PiBsaW5lID09PSBwYXRjaENvbnRlbnQpLFxuICAgICAgZXJyb3JDb3VudCA9IDAsXG4gICAgICBmdXp6RmFjdG9yID0gb3B0aW9ucy5mdXp6RmFjdG9yIHx8IDAsXG4gICAgICBtaW5MaW5lID0gMCxcbiAgICAgIG9mZnNldCA9IDAsXG5cbiAgICAgIHJlbW92ZUVPRk5MLFxuICAgICAgYWRkRU9GTkw7XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgaHVuayBleGFjdGx5IGZpdHMgb24gdGhlIHByb3ZpZGVkIGxvY2F0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBodW5rRml0cyhodW5rLCB0b1Bvcykge1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgaHVuay5saW5lcy5sZW5ndGg7IGorKykge1xuICAgICAgbGV0IGxpbmUgPSBodW5rLmxpbmVzW2pdLFxuICAgICAgICAgIG9wZXJhdGlvbiA9IGxpbmVbMF0sXG4gICAgICAgICAgY29udGVudCA9IGxpbmUuc3Vic3RyKDEpO1xuXG4gICAgICBpZiAob3BlcmF0aW9uID09PSAnICcgfHwgb3BlcmF0aW9uID09PSAnLScpIHtcbiAgICAgICAgLy8gQ29udGV4dCBzYW5pdHkgY2hlY2tcbiAgICAgICAgaWYgKCFjb21wYXJlTGluZSh0b1BvcyArIDEsIGxpbmVzW3RvUG9zXSwgb3BlcmF0aW9uLCBjb250ZW50KSkge1xuICAgICAgICAgIGVycm9yQ291bnQrKztcblxuICAgICAgICAgIGlmIChlcnJvckNvdW50ID4gZnV6ekZhY3Rvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0b1BvcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU2VhcmNoIGJlc3QgZml0IG9mZnNldHMgZm9yIGVhY2ggaHVuayBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lc1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGh1bmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGh1bmsgPSBodW5rc1tpXSxcbiAgICAgICAgbWF4TGluZSA9IGxpbmVzLmxlbmd0aCAtIGh1bmsub2xkTGluZXMsXG4gICAgICAgIGxvY2FsT2Zmc2V0ID0gMCxcbiAgICAgICAgdG9Qb3MgPSBvZmZzZXQgKyBodW5rLm9sZFN0YXJ0IC0gMTtcblxuICAgIGxldCBpdGVyYXRvciA9IGRpc3RhbmNlSXRlcmF0b3IodG9Qb3MsIG1pbkxpbmUsIG1heExpbmUpO1xuXG4gICAgZm9yICg7IGxvY2FsT2Zmc2V0ICE9PSB1bmRlZmluZWQ7IGxvY2FsT2Zmc2V0ID0gaXRlcmF0b3IoKSkge1xuICAgICAgaWYgKGh1bmtGaXRzKGh1bmssIHRvUG9zICsgbG9jYWxPZmZzZXQpKSB7XG4gICAgICAgIGh1bmsub2Zmc2V0ID0gb2Zmc2V0ICs9IGxvY2FsT2Zmc2V0O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobG9jYWxPZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNldCBsb3dlciB0ZXh0IGxpbWl0IHRvIGVuZCBvZiB0aGUgY3VycmVudCBodW5rLCBzbyBuZXh0IG9uZXMgZG9uJ3QgdHJ5XG4gICAgLy8gdG8gZml0IG92ZXIgYWxyZWFkeSBwYXRjaGVkIHRleHRcbiAgICBtaW5MaW5lID0gaHVuay5vZmZzZXQgKyBodW5rLm9sZFN0YXJ0ICsgaHVuay5vbGRMaW5lcztcbiAgfVxuXG4gIC8vIEFwcGx5IHBhdGNoIGh1bmtzXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaHVua3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgaHVuayA9IGh1bmtzW2ldLFxuICAgICAgICB0b1BvcyA9IGh1bmsub2Zmc2V0ICsgaHVuay5uZXdTdGFydCAtIDE7XG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IGh1bmsubGluZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIGxldCBsaW5lID0gaHVuay5saW5lc1tqXSxcbiAgICAgICAgICBvcGVyYXRpb24gPSBsaW5lWzBdLFxuICAgICAgICAgIGNvbnRlbnQgPSBsaW5lLnN1YnN0cigxKTtcblxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJyAnKSB7XG4gICAgICAgIHRvUG9zKys7XG4gICAgICB9IGVsc2UgaWYgKG9wZXJhdGlvbiA9PT0gJy0nKSB7XG4gICAgICAgIGxpbmVzLnNwbGljZSh0b1BvcywgMSk7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICcrJykge1xuICAgICAgICBsaW5lcy5zcGxpY2UodG9Qb3MsIDAsIGNvbnRlbnQpO1xuICAgICAgICB0b1BvcysrO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBsZXQgcHJldmlvdXNPcGVyYXRpb24gPSBodW5rLmxpbmVzW2ogLSAxXSA/IGh1bmsubGluZXNbaiAtIDFdWzBdIDogbnVsbDtcbiAgICAgICAgaWYgKHByZXZpb3VzT3BlcmF0aW9uID09PSAnKycpIHtcbiAgICAgICAgICByZW1vdmVFT0ZOTCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNPcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIGFkZEVPRk5MID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEhhbmRsZSBFT0ZOTCBpbnNlcnRpb24vcmVtb3ZhbFxuICBpZiAocmVtb3ZlRU9GTkwpIHtcbiAgICB3aGlsZSAoIWxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdKSB7XG4gICAgICBsaW5lcy5wb3AoKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYWRkRU9GTkwpIHtcbiAgICBsaW5lcy5wdXNoKCcnKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbi8vIFdyYXBwZXIgdGhhdCBzdXBwb3J0cyBtdWx0aXBsZSBmaWxlIHBhdGNoZXMgdmlhIGNhbGxiYWNrcy5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoZXModW5pRGlmZiwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIHVuaURpZmYgPT09ICdzdHJpbmcnKSB7XG4gICAgdW5pRGlmZiA9IHBhcnNlUGF0Y2godW5pRGlmZik7XG4gIH1cblxuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgZnVuY3Rpb24gcHJvY2Vzc0luZGV4KCkge1xuICAgIGxldCBpbmRleCA9IHVuaURpZmZbY3VycmVudEluZGV4KytdO1xuICAgIGlmICghaW5kZXgpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKCk7XG4gICAgfVxuXG4gICAgb3B0aW9ucy5sb2FkRmlsZShpbmRleCwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmNvbXBsZXRlKGVycik7XG4gICAgICB9XG5cbiAgICAgIGxldCB1cGRhdGVkQ29udGVudCA9IGFwcGx5UGF0Y2goZGF0YSwgaW5kZXgsIG9wdGlvbnMpO1xuICAgICAgb3B0aW9ucy5wYXRjaGVkKGluZGV4LCB1cGRhdGVkQ29udGVudCk7XG5cbiAgICAgIHNldFRpbWVvdXQocHJvY2Vzc0luZGV4LCAwKTtcbiAgICB9KTtcbiAgfVxuICBwcm9jZXNzSW5kZXgoKTtcbn1cbiIsImltcG9ydCB7ZGlmZkxpbmVzfSBmcm9tICcuLi9kaWZmL2xpbmUnO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RydWN0dXJlZFBhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7IGNvbnRleHQ6IDQgfTtcbiAgfVxuXG4gIGNvbnN0IGRpZmYgPSBkaWZmTGluZXMob2xkU3RyLCBuZXdTdHIpO1xuICBkaWZmLnB1c2goe3ZhbHVlOiAnJywgbGluZXM6IFtdfSk7ICAgLy8gQXBwZW5kIGFuIGVtcHR5IHZhbHVlIHRvIG1ha2UgY2xlYW51cCBlYXNpZXJcblxuICBmdW5jdGlvbiBjb250ZXh0TGluZXMobGluZXMpIHtcbiAgICByZXR1cm4gbGluZXMubWFwKGZ1bmN0aW9uKGVudHJ5KSB7IHJldHVybiAnICcgKyBlbnRyeTsgfSk7XG4gIH1cblxuICBsZXQgaHVua3MgPSBbXTtcbiAgbGV0IG9sZFJhbmdlU3RhcnQgPSAwLCBuZXdSYW5nZVN0YXJ0ID0gMCwgY3VyUmFuZ2UgPSBbXSxcbiAgICAgIG9sZExpbmUgPSAxLCBuZXdMaW5lID0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaWZmLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY3VycmVudCA9IGRpZmZbaV0sXG4gICAgICAgICAgbGluZXMgPSBjdXJyZW50LmxpbmVzIHx8IGN1cnJlbnQudmFsdWUucmVwbGFjZSgvXFxuJC8sICcnKS5zcGxpdCgnXFxuJyk7XG4gICAgY3VycmVudC5saW5lcyA9IGxpbmVzO1xuXG4gICAgaWYgKGN1cnJlbnQuYWRkZWQgfHwgY3VycmVudC5yZW1vdmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHByZXZpb3VzIGNvbnRleHQsIHN0YXJ0IHdpdGggdGhhdFxuICAgICAgaWYgKCFvbGRSYW5nZVN0YXJ0KSB7XG4gICAgICAgIGNvbnN0IHByZXYgPSBkaWZmW2kgLSAxXTtcbiAgICAgICAgb2xkUmFuZ2VTdGFydCA9IG9sZExpbmU7XG4gICAgICAgIG5ld1JhbmdlU3RhcnQgPSBuZXdMaW5lO1xuXG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgY3VyUmFuZ2UgPSBvcHRpb25zLmNvbnRleHQgPiAwID8gY29udGV4dExpbmVzKHByZXYubGluZXMuc2xpY2UoLW9wdGlvbnMuY29udGV4dCkpIDogW107XG4gICAgICAgICAgb2xkUmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgICAgbmV3UmFuZ2VTdGFydCAtPSBjdXJSYW5nZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3V0cHV0IG91ciBjaGFuZ2VzXG4gICAgICBjdXJSYW5nZS5wdXNoKC4uLiBsaW5lcy5tYXAoZnVuY3Rpb24oZW50cnkpIHtcbiAgICAgICAgcmV0dXJuIChjdXJyZW50LmFkZGVkID8gJysnIDogJy0nKSArIGVudHJ5O1xuICAgICAgfSkpO1xuXG4gICAgICAvLyBUcmFjayB0aGUgdXBkYXRlZCBmaWxlIHBvc2l0aW9uXG4gICAgICBpZiAoY3VycmVudC5hZGRlZCkge1xuICAgICAgICBuZXdMaW5lICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZGVudGljYWwgY29udGV4dCBsaW5lcy4gVHJhY2sgbGluZSBjaGFuZ2VzXG4gICAgICBpZiAob2xkUmFuZ2VTdGFydCkge1xuICAgICAgICAvLyBDbG9zZSBvdXQgYW55IGNoYW5nZXMgdGhhdCBoYXZlIGJlZW4gb3V0cHV0IChvciBqb2luIG92ZXJsYXBwaW5nKVxuICAgICAgICBpZiAobGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCAqIDIgJiYgaSA8IGRpZmYubGVuZ3RoIC0gMikge1xuICAgICAgICAgIC8vIE92ZXJsYXBwaW5nXG4gICAgICAgICAgY3VyUmFuZ2UucHVzaCguLi4gY29udGV4dExpbmVzKGxpbmVzKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZW5kIHRoZSByYW5nZSBhbmQgb3V0cHV0XG4gICAgICAgICAgbGV0IGNvbnRleHRTaXplID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBvcHRpb25zLmNvbnRleHQpO1xuICAgICAgICAgIGN1clJhbmdlLnB1c2goLi4uIGNvbnRleHRMaW5lcyhsaW5lcy5zbGljZSgwLCBjb250ZXh0U2l6ZSkpKTtcblxuICAgICAgICAgIGxldCBodW5rID0ge1xuICAgICAgICAgICAgb2xkU3RhcnQ6IG9sZFJhbmdlU3RhcnQsXG4gICAgICAgICAgICBvbGRMaW5lczogKG9sZExpbmUgLSBvbGRSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbmV3U3RhcnQ6IG5ld1JhbmdlU3RhcnQsXG4gICAgICAgICAgICBuZXdMaW5lczogKG5ld0xpbmUgLSBuZXdSYW5nZVN0YXJ0ICsgY29udGV4dFNpemUpLFxuICAgICAgICAgICAgbGluZXM6IGN1clJhbmdlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoaSA+PSBkaWZmLmxlbmd0aCAtIDIgJiYgbGluZXMubGVuZ3RoIDw9IG9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gRU9GIGlzIGluc2lkZSB0aGlzIGh1bmtcbiAgICAgICAgICAgIGxldCBvbGRFT0ZOZXdsaW5lID0gKC9cXG4kLy50ZXN0KG9sZFN0cikpO1xuICAgICAgICAgICAgbGV0IG5ld0VPRk5ld2xpbmUgPSAoL1xcbiQvLnRlc3QobmV3U3RyKSk7XG4gICAgICAgICAgICBpZiAobGluZXMubGVuZ3RoID09IDAgJiYgIW9sZEVPRk5ld2xpbmUpIHtcbiAgICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlOiBvbGQgaGFzIG5vIGVvbCBhbmQgbm8gdHJhaWxpbmcgY29udGV4dDsgbm8tbmwgY2FuIGVuZCB1cCBiZWZvcmUgYWRkc1xuICAgICAgICAgICAgICBjdXJSYW5nZS5zcGxpY2UoaHVuay5vbGRMaW5lcywgMCwgJ1xcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghb2xkRU9GTmV3bGluZSB8fCAhbmV3RU9GTmV3bGluZSkge1xuICAgICAgICAgICAgICBjdXJSYW5nZS5wdXNoKCdcXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaHVua3MucHVzaChodW5rKTtcblxuICAgICAgICAgIG9sZFJhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIG5ld1JhbmdlU3RhcnQgPSAwO1xuICAgICAgICAgIGN1clJhbmdlID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9sZExpbmUgKz0gbGluZXMubGVuZ3RoO1xuICAgICAgbmV3TGluZSArPSBsaW5lcy5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBvbGRGaWxlTmFtZTogb2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lOiBuZXdGaWxlTmFtZSxcbiAgICBvbGRIZWFkZXI6IG9sZEhlYWRlciwgbmV3SGVhZGVyOiBuZXdIZWFkZXIsXG4gICAgaHVua3M6IGh1bmtzXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUd29GaWxlc1BhdGNoKG9sZEZpbGVOYW1lLCBuZXdGaWxlTmFtZSwgb2xkU3RyLCBuZXdTdHIsIG9sZEhlYWRlciwgbmV3SGVhZGVyLCBvcHRpb25zKSB7XG4gIGNvbnN0IGRpZmYgPSBzdHJ1Y3R1cmVkUGF0Y2gob2xkRmlsZU5hbWUsIG5ld0ZpbGVOYW1lLCBvbGRTdHIsIG5ld1N0ciwgb2xkSGVhZGVyLCBuZXdIZWFkZXIsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IHJldCA9IFtdO1xuICBpZiAob2xkRmlsZU5hbWUgPT0gbmV3RmlsZU5hbWUpIHtcbiAgICByZXQucHVzaCgnSW5kZXg6ICcgKyBvbGRGaWxlTmFtZSk7XG4gIH1cbiAgcmV0LnB1c2goJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgcmV0LnB1c2goJy0tLSAnICsgZGlmZi5vbGRGaWxlTmFtZSArICh0eXBlb2YgZGlmZi5vbGRIZWFkZXIgPT09ICd1bmRlZmluZWQnID8gJycgOiAnXFx0JyArIGRpZmYub2xkSGVhZGVyKSk7XG4gIHJldC5wdXNoKCcrKysgJyArIGRpZmYubmV3RmlsZU5hbWUgKyAodHlwZW9mIGRpZmYubmV3SGVhZGVyID09PSAndW5kZWZpbmVkJyA/ICcnIDogJ1xcdCcgKyBkaWZmLm5ld0hlYWRlcikpO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZi5odW5rcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGh1bmsgPSBkaWZmLmh1bmtzW2ldO1xuICAgIHJldC5wdXNoKFxuICAgICAgJ0BAIC0nICsgaHVuay5vbGRTdGFydCArICcsJyArIGh1bmsub2xkTGluZXNcbiAgICAgICsgJyArJyArIGh1bmsubmV3U3RhcnQgKyAnLCcgKyBodW5rLm5ld0xpbmVzXG4gICAgICArICcgQEAnXG4gICAgKTtcbiAgICByZXQucHVzaC5hcHBseShyZXQsIGh1bmsubGluZXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldC5qb2luKCdcXG4nKSArICdcXG4nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGF0Y2goZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucykge1xuICByZXR1cm4gY3JlYXRlVHdvRmlsZXNQYXRjaChmaWxlTmFtZSwgZmlsZU5hbWUsIG9sZFN0ciwgbmV3U3RyLCBvbGRIZWFkZXIsIG5ld0hlYWRlciwgb3B0aW9ucyk7XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VQYXRjaCh1bmlEaWZmLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IGRpZmZzdHIgPSB1bmlEaWZmLnNwbGl0KCdcXG4nKSxcbiAgICAgIGxpc3QgPSBbXSxcbiAgICAgIGkgPSAwO1xuXG4gIGZ1bmN0aW9uIHBhcnNlSW5kZXgoKSB7XG4gICAgbGV0IGluZGV4ID0ge307XG4gICAgbGlzdC5wdXNoKGluZGV4KTtcblxuICAgIC8vIFBhcnNlIGRpZmYgbWV0YWRhdGFcbiAgICB3aGlsZSAoaSA8IGRpZmZzdHIubGVuZ3RoKSB7XG4gICAgICBsZXQgbGluZSA9IGRpZmZzdHJbaV07XG5cbiAgICAgIC8vIEZpbGUgaGVhZGVyIGZvdW5kLCBlbmQgcGFyc2luZyBkaWZmIG1ldGFkYXRhXG4gICAgICBpZiAoL14oXFwtXFwtXFwtfFxcK1xcK1xcK3xAQClcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIERpZmYgaW5kZXhcbiAgICAgIGxldCBoZWFkZXIgPSAoL14oPzpJbmRleDp8ZGlmZig/OiAtciBcXHcrKSspXFxzKyguKz8pXFxzKiQvKS5leGVjKGxpbmUpO1xuICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICBpbmRleC5pbmRleCA9IGhlYWRlclsxXTtcbiAgICAgIH1cblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIGZpbGUgaGVhZGVycyBpZiB0aGV5IGFyZSBkZWZpbmVkLiBVbmlmaWVkIGRpZmYgcmVxdWlyZXMgdGhlbSwgYnV0XG4gICAgLy8gdGhlcmUncyBubyB0ZWNobmljYWwgaXNzdWVzIHRvIGhhdmUgYW4gaXNvbGF0ZWQgaHVuayB3aXRob3V0IGZpbGUgaGVhZGVyXG4gICAgcGFyc2VGaWxlSGVhZGVyKGluZGV4KTtcbiAgICBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpO1xuXG4gICAgLy8gUGFyc2UgaHVua3NcbiAgICBpbmRleC5odW5rcyA9IFtdO1xuXG4gICAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgICAgbGV0IGxpbmUgPSBkaWZmc3RyW2ldO1xuXG4gICAgICBpZiAoL14oSW5kZXg6fGRpZmZ8XFwtXFwtXFwtfFxcK1xcK1xcKylcXHMvLnRlc3QobGluZSkpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGVsc2UgaWYgKC9eQEAvLnRlc3QobGluZSkpIHtcbiAgICAgICAgaW5kZXguaHVua3MucHVzaChwYXJzZUh1bmsoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpbmUgJiYgb3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgICAgLy8gSWdub3JlIHVuZXhwZWN0ZWQgY29udGVudCB1bmxlc3MgaW4gc3RyaWN0IG1vZGVcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpbmUgJyArIChpICsgMSkgKyAnICcgKyBKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIHRoZSAtLS0gYW5kICsrKyBoZWFkZXJzLCBpZiBub25lIGFyZSBmb3VuZCwgbm8gbGluZXNcbiAgLy8gYXJlIGNvbnN1bWVkLlxuICBmdW5jdGlvbiBwYXJzZUZpbGVIZWFkZXIoaW5kZXgpIHtcbiAgICBsZXQgZmlsZUhlYWRlciA9ICgvXihcXC1cXC1cXC18XFwrXFwrXFwrKVxccysoXFxTKylcXHM/KC4rPylcXHMqJC8pLmV4ZWMoZGlmZnN0cltpXSk7XG4gICAgaWYgKGZpbGVIZWFkZXIpIHtcbiAgICAgIGxldCBrZXlQcmVmaXggPSBmaWxlSGVhZGVyWzFdID09PSAnLS0tJyA/ICdvbGQnIDogJ25ldyc7XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnRmlsZU5hbWUnXSA9IGZpbGVIZWFkZXJbMl07XG4gICAgICBpbmRleFtrZXlQcmVmaXggKyAnSGVhZGVyJ10gPSBmaWxlSGVhZGVyWzNdO1xuXG4gICAgICBpKys7XG4gICAgfVxuICB9XG5cbiAgLy8gUGFyc2VzIGEgaHVua1xuICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB3ZSBhcmUgYXQgdGhlIHN0YXJ0IG9mIGEgaHVuay5cbiAgZnVuY3Rpb24gcGFyc2VIdW5rKCkge1xuICAgIGxldCBjaHVua0hlYWRlckluZGV4ID0gaSxcbiAgICAgICAgY2h1bmtIZWFkZXJMaW5lID0gZGlmZnN0cltpKytdLFxuICAgICAgICBjaHVua0hlYWRlciA9IGNodW5rSGVhZGVyTGluZS5zcGxpdCgvQEAgLShcXGQrKSg/OiwoXFxkKykpPyBcXCsoXFxkKykoPzosKFxcZCspKT8gQEAvKTtcblxuICAgIGxldCBodW5rID0ge1xuICAgICAgb2xkU3RhcnQ6ICtjaHVua0hlYWRlclsxXSxcbiAgICAgIG9sZExpbmVzOiArY2h1bmtIZWFkZXJbMl0gfHwgMSxcbiAgICAgIG5ld1N0YXJ0OiArY2h1bmtIZWFkZXJbM10sXG4gICAgICBuZXdMaW5lczogK2NodW5rSGVhZGVyWzRdIHx8IDEsXG4gICAgICBsaW5lczogW11cbiAgICB9O1xuXG4gICAgbGV0IGFkZENvdW50ID0gMCxcbiAgICAgICAgcmVtb3ZlQ291bnQgPSAwO1xuICAgIGZvciAoOyBpIDwgZGlmZnN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG9wZXJhdGlvbiA9IGRpZmZzdHJbaV1bMF07XG5cbiAgICAgIGlmIChvcGVyYXRpb24gPT09ICcrJyB8fCBvcGVyYXRpb24gPT09ICctJyB8fCBvcGVyYXRpb24gPT09ICcgJyB8fCBvcGVyYXRpb24gPT09ICdcXFxcJykge1xuICAgICAgICBodW5rLmxpbmVzLnB1c2goZGlmZnN0cltpXSk7XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJysnKSB7XG4gICAgICAgICAgYWRkQ291bnQrKztcbiAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICctJykge1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAnICcpIHtcbiAgICAgICAgICBhZGRDb3VudCsrO1xuICAgICAgICAgIHJlbW92ZUNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSB0aGUgZW1wdHkgYmxvY2sgY291bnQgY2FzZVxuICAgIGlmICghYWRkQ291bnQgJiYgaHVuay5uZXdMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5uZXdMaW5lcyA9IDA7XG4gICAgfVxuICAgIGlmICghcmVtb3ZlQ291bnQgJiYgaHVuay5vbGRMaW5lcyA9PT0gMSkge1xuICAgICAgaHVuay5vbGRMaW5lcyA9IDA7XG4gICAgfVxuXG4gICAgLy8gUGVyZm9ybSBvcHRpb25hbCBzYW5pdHkgY2hlY2tpbmdcbiAgICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICAgIGlmIChhZGRDb3VudCAhPT0gaHVuay5uZXdMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FkZGVkIGxpbmUgY291bnQgZGlkIG5vdCBtYXRjaCBmb3IgaHVuayBhdCBsaW5lICcgKyAoY2h1bmtIZWFkZXJJbmRleCArIDEpKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZW1vdmVDb3VudCAhPT0gaHVuay5vbGRMaW5lcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlbW92ZWQgbGluZSBjb3VudCBkaWQgbm90IG1hdGNoIGZvciBodW5rIGF0IGxpbmUgJyArIChjaHVua0hlYWRlckluZGV4ICsgMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBodW5rO1xuICB9XG5cbiAgd2hpbGUgKGkgPCBkaWZmc3RyLmxlbmd0aCkge1xuICAgIHBhcnNlSW5kZXgoKTtcbiAgfVxuXG4gIHJldHVybiBsaXN0O1xufVxuIiwiLy8gSXRlcmF0b3IgdGhhdCB0cmF2ZXJzZXMgaW4gdGhlIHJhbmdlIG9mIFttaW4sIG1heF0sIHN0ZXBwaW5nXG4vLyBieSBkaXN0YW5jZSBmcm9tIGEgZ2l2ZW4gc3RhcnQgcG9zaXRpb24uIEkuZS4gZm9yIFswLCA0XSwgd2l0aFxuLy8gc3RhcnQgb2YgMiwgdGhpcyB3aWxsIGl0ZXJhdGUgMiwgMywgMSwgNCwgMC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0YXJ0LCBtaW5MaW5lLCBtYXhMaW5lKSB7XG4gIGxldCB3YW50Rm9yd2FyZCA9IHRydWUsXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IGZhbHNlLFxuICAgICAgbG9jYWxPZmZzZXQgPSAxO1xuXG4gIHJldHVybiBmdW5jdGlvbiBpdGVyYXRvcigpIHtcbiAgICBpZiAod2FudEZvcndhcmQgJiYgIWZvcndhcmRFeGhhdXN0ZWQpIHtcbiAgICAgIGlmIChiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgICBsb2NhbE9mZnNldCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2FudEZvcndhcmQgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZXlvbmQgdGV4dCBsZW5ndGgsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGFmdGVyIG9mZnNldCBsb2NhdGlvbiAob3IgZGVzaXJlZCBsb2NhdGlvbiBvbiBmaXJzdCBpdGVyYXRpb24pXG4gICAgICBpZiAoc3RhcnQgKyBsb2NhbE9mZnNldCA8PSBtYXhMaW5lKSB7XG4gICAgICAgIHJldHVybiBsb2NhbE9mZnNldDtcbiAgICAgIH1cblxuICAgICAgZm9yd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFiYWNrd2FyZEV4aGF1c3RlZCkge1xuICAgICAgaWYgKCFmb3J3YXJkRXhoYXVzdGVkKSB7XG4gICAgICAgIHdhbnRGb3J3YXJkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgaWYgdHJ5aW5nIHRvIGZpdCBiZWZvcmUgdGV4dCBiZWdpbm5pbmcsIGFuZCBpZiBub3QsIGNoZWNrIGl0IGZpdHNcbiAgICAgIC8vIGJlZm9yZSBvZmZzZXQgbG9jYXRpb25cbiAgICAgIGlmIChtaW5MaW5lIDw9IHN0YXJ0IC0gbG9jYWxPZmZzZXQpIHtcbiAgICAgICAgcmV0dXJuIC1sb2NhbE9mZnNldCsrO1xuICAgICAgfVxuXG4gICAgICBiYWNrd2FyZEV4aGF1c3RlZCA9IHRydWU7XG4gICAgICByZXR1cm4gaXRlcmF0b3IoKTtcbiAgICB9XG5cbiAgICAvLyBXZSB0cmllZCB0byBmaXQgaHVuayBiZWZvcmUgdGV4dCBiZWdpbm5pbmcgYW5kIGJleW9uZCB0ZXh0IGxlbmdodCwgdGhlblxuICAgIC8vIGh1bmsgY2FuJ3QgZml0IG9uIHRoZSB0ZXh0LiBSZXR1cm4gdW5kZWZpbmVkXG4gIH07XG59XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVPcHRpb25zKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGRlZmF1bHRzLmNhbGxiYWNrID0gb3B0aW9ucztcbiAgfSBlbHNlIGlmIChvcHRpb25zKSB7XG4gICAgZm9yIChsZXQgbmFtZSBpbiBvcHRpb25zKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgZGVmYXVsdHNbbmFtZV0gPSBvcHRpb25zW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdHM7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIGxjcyA9IHJlcXVpcmUoJy4vbGliL2xjcycpO1xudmFyIGFycmF5ID0gcmVxdWlyZSgnLi9saWIvYXJyYXknKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJy4vbGliL2pzb25QYXRjaCcpO1xudmFyIGludmVyc2UgPSByZXF1aXJlKCcuL2xpYi9pbnZlcnNlJyk7XG52YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2xpYi9qc29uUG9pbnRlcicpO1xudmFyIGVuY29kZVNlZ21lbnQgPSBqc29uUG9pbnRlci5lbmNvZGVTZWdtZW50O1xuXG5leHBvcnRzLmRpZmYgPSBkaWZmO1xuZXhwb3J0cy5wYXRjaCA9IHBhdGNoLmFwcGx5O1xuZXhwb3J0cy5wYXRjaEluUGxhY2UgPSBwYXRjaC5hcHBseUluUGxhY2U7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5jbG9uZSA9IHBhdGNoLmNsb25lO1xuXG4vLyBFcnJvcnNcbmV4cG9ydHMuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuZXhwb3J0cy5UZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9UZXN0RmFpbGVkRXJyb3InKTtcbmV4cG9ydHMuUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgaXNWYWxpZE9iamVjdCA9IHBhdGNoLmlzVmFsaWRPYmplY3Q7XG52YXIgZGVmYXVsdEhhc2ggPSBwYXRjaC5kZWZhdWx0SGFzaDtcblxuLyoqXG4gKiBDb21wdXRlIGEgSlNPTiBQYXRjaCByZXByZXNlbnRpbmcgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYSBhbmQgYi5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIGlmIGEgZnVuY3Rpb24sIHNlZSBvcHRpb25zLmhhc2hcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKHg6Kik6U3RyaW5nfE51bWJlcn0gb3B0aW9ucy5oYXNoIHVzZWQgdG8gaGFzaCBhcnJheSBpdGVtc1xuICogIGluIG9yZGVyIHRvIHJlY29nbml6ZSBpZGVudGljYWwgb2JqZWN0cywgZGVmYXVsdHMgdG8gSlNPTi5zdHJpbmdpZnlcbiAqIEBwYXJhbSB7P2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXkpOm9iamVjdH0gb3B0aW9ucy5tYWtlQ29udGV4dFxuICogIHVzZWQgdG8gZ2VuZXJhdGUgcGF0Y2ggY29udGV4dC4gSWYgbm90IHByb3ZpZGVkLCBjb250ZXh0IHdpbGwgbm90IGJlIGdlbmVyYXRlZFxuICogQHJldHVybnMge2FycmF5fSBKU09OIFBhdGNoIHN1Y2ggdGhhdCBwYXRjaChkaWZmKGEsIGIpLCBhKSB+IGJcbiAqL1xuZnVuY3Rpb24gZGlmZihhLCBiLCBvcHRpb25zKSB7XG5cdHJldHVybiBhcHBlbmRDaGFuZ2VzKGEsIGIsICcnLCBpbml0U3RhdGUob3B0aW9ucywgW10pKS5wYXRjaDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgaW5pdGlhbCBkaWZmIHN0YXRlIGZyb20gdGhlIHByb3ZpZGVkIG9wdGlvbnNcbiAqIEBwYXJhbSB7P2Z1bmN0aW9ufD9vYmplY3R9IG9wdGlvbnMgQHNlZSBkaWZmIG9wdGlvbnMgYWJvdmVcbiAqIEBwYXJhbSB7YXJyYXl9IHBhdGNoIGFuIGVtcHR5IG9yIGV4aXN0aW5nIEpTT04gUGF0Y2ggYXJyYXkgaW50byB3aGljaFxuICogIHRoZSBkaWZmIHNob3VsZCBnZW5lcmF0ZSBuZXcgcGF0Y2ggb3BlcmF0aW9uc1xuICogQHJldHVybnMge29iamVjdH0gaW5pdGlhbGl6ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBpbml0U3RhdGUob3B0aW9ucywgcGF0Y2gpIHtcblx0aWYodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLmhhc2gsIGRlZmF1bHRIYXNoKSxcblx0XHRcdG1ha2VDb250ZXh0OiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5tYWtlQ29udGV4dCwgZGVmYXVsdENvbnRleHQpLFxuXHRcdFx0aW52ZXJ0aWJsZTogIShvcHRpb25zLmludmVydGlibGUgPT09IGZhbHNlKVxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHBhdGNoOiBwYXRjaCxcblx0XHRcdGhhc2g6IG9yRWxzZShpc0Z1bmN0aW9uLCBvcHRpb25zLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogZGVmYXVsdENvbnRleHQsXG5cdFx0XHRpbnZlcnRpYmxlOiB0cnVlXG5cdFx0fTtcblx0fVxufVxuXG4vKipcbiAqIEdpdmVuIHR3byBKU09OIHZhbHVlcyAob2JqZWN0LCBhcnJheSwgbnVtYmVyLCBzdHJpbmcsIGV0Yy4pLCBmaW5kIHRoZWlyXG4gKiBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSBiXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kQXJyYXlDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdGlmKGlzVmFsaWRPYmplY3QoYSkgJiYgaXNWYWxpZE9iamVjdChiKSkge1xuXHRcdHJldHVybiBhcHBlbmRPYmplY3RDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcblx0fVxuXG5cdHJldHVybiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBvYmplY3RzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IG8xXG4gKiBAcGFyYW0ge29iamVjdH0gbzJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRPYmplY3RDaGFuZ2VzKG8xLCBvMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhvMik7XG5cdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHR2YXIgaSwga2V5O1xuXG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0dmFyIGtleVBhdGggPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdGlmKG8xW2tleV0gIT09IHZvaWQgMCkge1xuXHRcdFx0YXBwZW5kQ2hhbmdlcyhvMVtrZXldLCBvMltrZXldLCBrZXlQYXRoLCBzdGF0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IGtleVBhdGgsIHZhbHVlOiBvMltrZXldIH0pO1xuXHRcdH1cblx0fVxuXG5cdGtleXMgPSBPYmplY3Qua2V5cyhvMSk7XG5cdGZvcihpPWtleXMubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0aWYobzJba2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0XHR2YXIgcCA9IHBhdGggKyAnLycgKyBlbmNvZGVTZWdtZW50KGtleSk7XG5cdFx0XHRpZihzdGF0ZS5pbnZlcnRpYmxlKSB7XG5cdFx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwLCB2YWx1ZTogbzFba2V5XSB9KTtcblx0XHRcdH1cblx0XHRcdHBhdGNoLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IHAgfSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHN0YXRlO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBhcnJheXMsIGZpbmQgdGhlaXIgZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge2FycmF5fSBhMVxuICogQHBhcmFtIHthcnJheX0gYTJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtPYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRBcnJheUNoYW5nZXMoYTEsIGEyLCBwYXRoLCBzdGF0ZSkge1xuXHR2YXIgYTFoYXNoID0gYXJyYXkubWFwKHN0YXRlLmhhc2gsIGExKTtcblx0dmFyIGEyaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMik7XG5cblx0dmFyIGxjc01hdHJpeCA9IGxjcy5jb21wYXJlKGExaGFzaCwgYTJoYXNoKTtcblxuXHRyZXR1cm4gbGNzVG9Kc29uUGF0Y2goYTEsIGEyLCBwYXRoLCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gYW4gbGNzTWF0cml4IGludG8gSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFuZCBhcHBlbmRcbiAqIHRoZW0gdG8gc3RhdGUucGF0Y2gsIHJlY3Vyc2luZyBpbnRvIGFycmF5IGVsZW1lbnRzIGFzIG5lY2Vzc2FyeVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzTWF0cml4XG4gKiBAcmV0dXJucyB7b2JqZWN0fSBuZXcgc3RhdGUgd2l0aCBKU09OIFBhdGNoIG9wZXJhdGlvbnMgYWRkZWQgYmFzZWRcbiAqICBvbiB0aGUgcHJvdmlkZWQgbGNzTWF0cml4XG4gKi9cbmZ1bmN0aW9uIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCkge1xuXHR2YXIgb2Zmc2V0ID0gMDtcblx0cmV0dXJuIGxjcy5yZWR1Y2UoZnVuY3Rpb24oc3RhdGUsIG9wLCBpLCBqKSB7XG5cdFx0dmFyIGxhc3QsIGNvbnRleHQ7XG5cdFx0dmFyIHBhdGNoID0gc3RhdGUucGF0Y2g7XG5cdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgKGogKyBvZmZzZXQpO1xuXG5cdFx0aWYgKG9wID09PSBsY3MuUkVNT1ZFKSB7XG5cdFx0XHQvLyBDb2FsZXNjZSBhZGphY2VudCByZW1vdmUgKyBhZGQgaW50byByZXBsYWNlXG5cdFx0XHRsYXN0ID0gcGF0Y2hbcGF0Y2gubGVuZ3RoLTFdO1xuXHRcdFx0Y29udGV4dCA9IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKTtcblxuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IGExW2pdLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRpZihsYXN0ICE9PSB2b2lkIDAgJiYgbGFzdC5vcCA9PT0gJ2FkZCcgJiYgbGFzdC5wYXRoID09PSBwKSB7XG5cdFx0XHRcdGxhc3Qub3AgPSAncmVwbGFjZSc7XG5cdFx0XHRcdGxhc3QuY29udGV4dCA9IGNvbnRleHQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRvZmZzZXQgLT0gMTtcblxuXHRcdH0gZWxzZSBpZiAob3AgPT09IGxjcy5BREQpIHtcblx0XHRcdC8vIFNlZSBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMiNzZWN0aW9uLTQuMVxuXHRcdFx0Ly8gTWF5IHVzZSBlaXRoZXIgaW5kZXg9PT1sZW5ndGggKm9yKiAnLScgdG8gaW5kaWNhdGUgYXBwZW5kaW5nIHRvIGFycmF5XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBwLCB2YWx1ZTogYTJbaV0sXG5cdFx0XHRcdGNvbnRleHQ6IHN0YXRlLm1ha2VDb250ZXh0KGosIGExKVxuXHRcdFx0fSk7XG5cblx0XHRcdG9mZnNldCArPSAxO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGFwcGVuZENoYW5nZXMoYTFbal0sIGEyW2ldLCBwLCBzdGF0ZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0YXRlO1xuXG5cdH0sIHN0YXRlLCBsY3NNYXRyaXgpO1xufVxuXG4vKipcbiAqIEdpdmVuIHR3byBudW1iZXJ8c3RyaW5nfG51bGwgdmFsdWVzLCBpZiB0aGV5IGRpZmZlciwgYXBwZW5kIHRvIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcnxudWxsfSBhXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge29iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFZhbHVlQ2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSkge1xuXHRpZihhICE9PSBiKSB7XG5cdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0c3RhdGUucGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHBhdGgsIHZhbHVlOiBhIH0pO1xuXHRcdH1cblxuXHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYiB9KTtcblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcmVkaWNhdGVcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHsqfSB5XG4gKiBAcmV0dXJucyB7Kn0geCBpZiBwcmVkaWNhdGUoeCkgaXMgdHJ1dGh5LCBvdGhlcndpc2UgeVxuICovXG5mdW5jdGlvbiBvckVsc2UocHJlZGljYXRlLCB4LCB5KSB7XG5cdHJldHVybiBwcmVkaWNhdGUoeCkgPyB4IDogeTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHBhdGNoIGNvbnRleHQgZ2VuZXJhdG9yXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfSB1bmRlZmluZWQgY29udGV4dFxuICovXG5mdW5jdGlvbiBkZWZhdWx0Q29udGV4dCgpIHtcblx0cmV0dXJuIHZvaWQgMDtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIHggaXMgYSBmdW5jdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yO1xuXG5mdW5jdGlvbiBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcihtZXNzYWdlKSB7XG5cdEVycm9yLmNhbGwodGhpcyk7XG5cdHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcblx0dGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcblx0aWYodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG5cdH1cbn1cblxuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3I7IiwibW9kdWxlLmV4cG9ydHMgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjtcblxuZnVuY3Rpb24gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcblBhdGNoTm90SW52ZXJ0aWJsZUVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gVGVzdEZhaWxlZEVycm9yO1xuXG5mdW5jdGlvbiBUZXN0RmFpbGVkRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cblRlc3RGYWlsZWRFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVGVzdEZhaWxlZEVycm9yOyIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG5leHBvcnRzLmNvbnMgPSBjb25zO1xuZXhwb3J0cy50YWlsID0gdGFpbDtcbmV4cG9ydHMubWFwID0gbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgeCB0byBhLCB3aXRob3V0IG11dGF0aW5nIGEuIEZhc3RlciB0aGFuIGEudW5zaGlmdCh4KVxuICogQHBhcmFtIHsqfSB4XG4gKiBAcGFyYW0ge0FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEByZXR1cm5zIHtBcnJheX0gbmV3IEFycmF5IHdpdGggeCBwcmVwZW5kZWRcbiAqL1xuZnVuY3Rpb24gY29ucyh4LCBhKSB7XG5cdHZhciBsID0gYS5sZW5ndGg7XG5cdHZhciBiID0gbmV3IEFycmF5KGwrMSk7XG5cdGJbMF0gPSB4O1xuXHRmb3IodmFyIGk9MDsgaTxsOyArK2kpIHtcblx0XHRiW2krMV0gPSBhW2ldO1xuXHR9XG5cblx0cmV0dXJuIGI7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IEFycmF5IGNvbnRhaW5pbmcgYWxsIGVsZW1lbnRzIGluIGEsIGV4Y2VwdCB0aGUgZmlyc3QuXG4gKiAgRmFzdGVyIHRoYW4gYS5zbGljZSgxKVxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSwgdGhlIGVxdWl2YWxlbnQgb2YgYS5zbGljZSgxKVxuICovXG5mdW5jdGlvbiB0YWlsKGEpIHtcblx0dmFyIGwgPSBhLmxlbmd0aC0xO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKTtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpXSA9IGFbaSsxXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIE1hcCBhbnkgYXJyYXktbGlrZS4gRmFzdGVyIHRoYW4gQXJyYXkucHJvdG90eXBlLm1hcFxuICogQHBhcmFtIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSBtYXBwZWQgYnkgZlxuICovXG5mdW5jdGlvbiBtYXAoZiwgYSkge1xuXHR2YXIgYiA9IG5ldyBBcnJheShhLmxlbmd0aCk7XG5cdGZvcih2YXIgaT0wOyBpPCBhLmxlbmd0aDsgKytpKSB7XG5cdFx0YltpXSA9IGYoYVtpXSk7XG5cdH1cblx0cmV0dXJuIGI7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbi8qKlxuICogQ3JlYXRlIGEgZGVlcCBjb3B5IG9mIHggd2hpY2ggbXVzdCBiZSBhIGxlZ2FsIEpTT04gb2JqZWN0L2FycmF5L3ZhbHVlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIGNsb25lXG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gY2xvbmUgb2YgeFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuXG5mdW5jdGlvbiBjbG9uZSh4KSB7XG5cdGlmKHggPT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRyZXR1cm4gY2xvbmVBcnJheSh4KTtcblx0fVxuXG5cdHJldHVybiBjbG9uZU9iamVjdCh4KTtcbn1cblxuZnVuY3Rpb24gY2xvbmVBcnJheSAoeCkge1xuXHR2YXIgbCA9IHgubGVuZ3RoO1xuXHR2YXIgeSA9IG5ldyBBcnJheShsKTtcblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGw7ICsraSkge1xuXHRcdHlbaV0gPSBjbG9uZSh4W2ldKTtcblx0fVxuXG5cdHJldHVybiB5O1xufVxuXG5mdW5jdGlvbiBjbG9uZU9iamVjdCAoeCkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKHgpO1xuXHR2YXIgeSA9IHt9O1xuXG5cdGZvciAodmFyIGssIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcblx0XHRrID0ga2V5c1tpXTtcblx0XHR5W2tdID0gY2xvbmUoeFtrXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cbiIsInZhciBqc29uUG9pbnRlciA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXInKTtcblxuLyoqXG4gKiBjb21tdXRlIHRoZSBwYXRjaCBzZXF1ZW5jZSBhLGIgdG8gYixhXG4gKiBAcGFyYW0ge29iamVjdH0gYSBwYXRjaCBvcGVyYXRpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBiIHBhdGNoIG9wZXJhdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNvbW11dGVQYXRocyhhLCBiKSB7XG5cdC8vIFRPRE86IGNhc2VzIGZvciBzcGVjaWFsIHBhdGhzOiAnJyBhbmQgJy8nXG5cdHZhciBsZWZ0ID0ganNvblBvaW50ZXIucGFyc2UoYS5wYXRoKTtcblx0dmFyIHJpZ2h0ID0ganNvblBvaW50ZXIucGFyc2UoYi5wYXRoKTtcblx0dmFyIHByZWZpeCA9IGdldENvbW1vblBhdGhQcmVmaXgobGVmdCwgcmlnaHQpO1xuXHR2YXIgaXNBcnJheSA9IGlzQXJyYXlQYXRoKGxlZnQsIHJpZ2h0LCBwcmVmaXgubGVuZ3RoKTtcblxuXHQvLyBOZXZlciBtdXRhdGUgdGhlIG9yaWdpbmFsc1xuXHR2YXIgYWMgPSBjb3B5UGF0Y2goYSk7XG5cdHZhciBiYyA9IGNvcHlQYXRjaChiKTtcblxuXHRpZihwcmVmaXgubGVuZ3RoID09PSAwICYmICFpc0FycmF5KSB7XG5cdFx0Ly8gUGF0aHMgc2hhcmUgbm8gY29tbW9uIGFuY2VzdG9yLCBzaW1wbGUgc3dhcFxuXHRcdHJldHVybiBbYmMsIGFjXTtcblx0fVxuXG5cdGlmKGlzQXJyYXkpIHtcblx0XHRyZXR1cm4gY29tbXV0ZUFycmF5UGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIGNvbW11dGVUcmVlUGF0aHMoYWMsIGxlZnQsIGJjLCByaWdodCk7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGNvbW11dGVUcmVlUGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYoYS5wYXRoID09PSBiLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdjYW5ub3QgY29tbXV0ZSAnICsgYS5vcCArICcsJyArIGIub3AgKyAnIHdpdGggaWRlbnRpY2FsIG9iamVjdCBwYXRocycpO1xuXHR9XG5cdC8vIEZJWE1FOiBJbXBsZW1lbnQgdHJlZSBwYXRoIGNvbW11dGF0aW9uXG5cdHJldHVybiBbYiwgYV07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aG9zZSBjb21tb24gYW5jZXN0b3IgKHdoaWNoIG1heSBiZSB0aGUgaW1tZWRpYXRlIHBhcmVudClcbiAqIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gYVxuICogQHBhcmFtIGxlZnRcbiAqIEBwYXJhbSBiXG4gKiBAcGFyYW0gcmlnaHRcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlQYXRocyhhLCBsZWZ0LCBiLCByaWdodCkge1xuXHRpZihsZWZ0Lmxlbmd0aCA9PT0gcmlnaHQubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVNpYmxpbmdzKGEsIGxlZnQsIGIsIHJpZ2h0KTtcblx0fVxuXG5cdGlmIChsZWZ0Lmxlbmd0aCA+IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdC8vIGxlZnQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIHJpZ2h0XG5cdFx0bGVmdCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGIsIHJpZ2h0LCBhLCBsZWZ0LCAtMSk7XG5cdFx0YS5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihsZWZ0KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gcmlnaHQgaXMgbG9uZ2VyLCBjb21tdXRlIGJ5IFwibW92aW5nXCIgaXQgdG8gdGhlIGxlZnRcblx0XHRyaWdodCA9IGNvbW11dGVBcnJheUFuY2VzdG9yKGEsIGxlZnQsIGIsIHJpZ2h0LCAxKTtcblx0XHRiLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKHJpZ2h0KSk7XG5cdH1cblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgaW5kZXgpIHtcblx0cmV0dXJuIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KGxlZnRbaW5kZXhdKVxuXHRcdCYmIGpzb25Qb2ludGVyLmlzVmFsaWRBcnJheUluZGV4KHJpZ2h0W2luZGV4XSk7XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyByZWZlcnJpbmcgdG8gaXRlbXMgaW4gdGhlIHNhbWUgYXJyYXlcbiAqIEBwYXJhbSBsXG4gKiBAcGFyYW0gbHBhdGhcbiAqIEBwYXJhbSByXG4gKiBAcGFyYW0gcnBhdGhcbiAqIEByZXR1cm5zIHsqW119XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheVNpYmxpbmdzKGwsIGxwYXRoLCByLCBycGF0aCkge1xuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0dmFyIGNvbW11dGVkO1xuXG5cdGlmKGxpbmRleCA8IHJpbmRleCkge1xuXHRcdC8vIEFkanVzdCByaWdodCBwYXRoXG5cdFx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gMSk7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0XHRjb21tdXRlZCA9IHJwYXRoLnNsaWNlKCk7XG5cdFx0XHRjb21tdXRlZFt0YXJnZXRdID0gcmluZGV4ICsgMTtcblx0XHRcdHIucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0XHR9XG5cdH0gZWxzZSBpZihyLm9wID09PSAnYWRkJyB8fCByLm9wID09PSAnY29weScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoXG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBsaW5kZXggKyAxO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fSBlbHNlIGlmIChsaW5kZXggPiByaW5kZXggJiYgci5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHQvLyBBZGp1c3QgbGVmdCBwYXRoIG9ubHkgaWYgcmVtb3ZlIHdhcyBhdCBhIChzdHJpY3RseSkgbG93ZXIgaW5kZXhcblx0XHRjb21tdXRlZCA9IGxwYXRoLnNsaWNlKCk7XG5cdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIGxpbmRleCAtIDEpO1xuXHRcdGwucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4oY29tbXV0ZWQpKTtcblx0fVxuXG5cdHJldHVybiBbciwgbF07XG59XG5cbi8qKlxuICogQ29tbXV0ZSB0d28gcGF0Y2hlcyB3aXRoIGEgY29tbW9uIGFycmF5IGFuY2VzdG9yXG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcGFyYW0gZGlyZWN0aW9uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5QW5jZXN0b3IobCwgbHBhdGgsIHIsIHJwYXRoLCBkaXJlY3Rpb24pIHtcblx0Ly8gcnBhdGggaXMgbG9uZ2VyIG9yIHNhbWUgbGVuZ3RoXG5cblx0dmFyIHRhcmdldCA9IGxwYXRoLmxlbmd0aC0xO1xuXHR2YXIgbGluZGV4ID0gK2xwYXRoW3RhcmdldF07XG5cdHZhciByaW5kZXggPSArcnBhdGhbdGFyZ2V0XTtcblxuXHQvLyBDb3B5IHJwYXRoLCB0aGVuIGFkanVzdCBpdHMgYXJyYXkgaW5kZXhcblx0dmFyIHJjID0gcnBhdGguc2xpY2UoKTtcblxuXHRpZihsaW5kZXggPiByaW5kZXgpIHtcblx0XHRyZXR1cm4gcmM7XG5cdH1cblxuXHRpZihsLm9wID09PSAnYWRkJyB8fCBsLm9wID09PSAnY29weScpIHtcblx0XHRyY1t0YXJnZXRdID0gTWF0aC5tYXgoMCwgcmluZGV4IC0gZGlyZWN0aW9uKTtcblx0fSBlbHNlIGlmKGwub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCArIGRpcmVjdGlvbik7XG5cdH1cblxuXHRyZXR1cm4gcmM7XG59XG5cbmZ1bmN0aW9uIGdldENvbW1vblBhdGhQcmVmaXgocDEsIHAyKSB7XG5cdHZhciBwMWwgPSBwMS5sZW5ndGg7XG5cdHZhciBwMmwgPSBwMi5sZW5ndGg7XG5cdGlmKHAxbCA9PT0gMCB8fCBwMmwgPT09IDAgfHwgKHAxbCA8IDIgJiYgcDJsIDwgMikpIHtcblx0XHRyZXR1cm4gW107XG5cdH1cblxuXHQvLyBJZiBwYXRocyBhcmUgc2FtZSBsZW5ndGgsIHRoZSBsYXN0IHNlZ21lbnQgY2Fubm90IGJlIHBhcnRcblx0Ly8gb2YgYSBjb21tb24gcHJlZml4LiAgSWYgbm90IHRoZSBzYW1lIGxlbmd0aCwgdGhlIHByZWZpeCBjYW5ub3Rcblx0Ly8gYmUgbG9uZ2VyIHRoYW4gdGhlIHNob3J0ZXIgcGF0aC5cblx0dmFyIGwgPSBwMWwgPT09IHAybFxuXHRcdD8gcDFsIC0gMVxuXHRcdDogTWF0aC5taW4ocDFsLCBwMmwpO1xuXG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgcDFbaV0gPT09IHAyW2ldKSB7XG5cdFx0KytpXG5cdH1cblxuXHRyZXR1cm4gcDEuc2xpY2UoMCwgaSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlQYXRjaChwKSB7XG5cdGlmKHAub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIHsgb3A6IHAub3AsIHBhdGg6IHAucGF0aCB9O1xuXHR9XG5cblx0aWYocC5vcCA9PT0gJ2NvcHknIHx8IHAub3AgPT09ICdtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIGZyb206IHAuZnJvbSB9O1xuXHR9XG5cblx0Ly8gdGVzdCwgYWRkLCByZXBsYWNlXG5cdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGgsIHZhbHVlOiBwLnZhbHVlIH07XG59IiwibW9kdWxlLmV4cG9ydHMgPSBkZWVwRXF1YWxzO1xuXG4vKipcbiAqIENvbXBhcmUgMiBKU09OIHZhbHVlcywgb3IgcmVjdXJzaXZlbHkgY29tcGFyZSAyIEpTT04gb2JqZWN0cyBvciBhcnJheXNcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsfSBhXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYlxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWZmIGEgYW5kIGIgYXJlIHJlY3Vyc2l2ZWx5IGVxdWFsXG4gKi9cbmZ1bmN0aW9uIGRlZXBFcXVhbHMoYSwgYikge1xuXHRpZihhID09PSBiKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KGEpICYmIEFycmF5LmlzQXJyYXkoYikpIHtcblx0XHRyZXR1cm4gY29tcGFyZUFycmF5cyhhLCBiKTtcblx0fVxuXG5cdGlmKHR5cGVvZiBhID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcblx0XHRyZXR1cm4gY29tcGFyZU9iamVjdHMoYSwgYik7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVBcnJheXMoYSwgYikge1xuXHRpZihhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRmb3IodmFyIGkgPSAwOyBpPGEubGVuZ3RoOyArK2kpIHtcblx0XHRpZighZGVlcEVxdWFscyhhW2ldLCBiW2ldKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlT2JqZWN0cyhhLCBiKSB7XG5cdGlmKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGFrZXlzID0gT2JqZWN0LmtleXMoYSk7XG5cdHZhciBia2V5cyA9IE9iamVjdC5rZXlzKGIpO1xuXG5cdGlmKGFrZXlzLmxlbmd0aCAhPT0gYmtleXMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMCwgazsgaTxha2V5cy5sZW5ndGg7ICsraSkge1xuXHRcdGsgPSBha2V5c1tpXTtcblx0XHRpZighKGsgaW4gYiAmJiBkZWVwRXF1YWxzKGFba10sIGJba10pKSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufSIsInZhciBwYXRjaGVzID0gcmVxdWlyZSgnLi9wYXRjaGVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW52ZXJzZShwKSB7XG5cdHZhciBwciA9IFtdO1xuXHR2YXIgaSwgc2tpcDtcblx0Zm9yKGkgPSBwLmxlbmd0aC0xOyBpPj0gMDsgaSAtPSBza2lwKSB7XG5cdFx0c2tpcCA9IGludmVydE9wKHByLCBwW2ldLCBpLCBwKTtcblx0fVxuXG5cdHJldHVybiBwcjtcbn07XG5cbmZ1bmN0aW9uIGludmVydE9wKHBhdGNoLCBjLCBpLCBjb250ZXh0KSB7XG5cdHZhciBvcCA9IHBhdGNoZXNbYy5vcF07XG5cdHJldHVybiBvcCAhPT0gdm9pZCAwICYmIHR5cGVvZiBvcC5pbnZlcnNlID09PSAnZnVuY3Rpb24nXG5cdFx0PyBvcC5pbnZlcnNlKHBhdGNoLCBjLCBpLCBjb250ZXh0KVxuXHRcdDogMTtcbn1cbiIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG52YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xuXG5leHBvcnRzLmFwcGx5ID0gcGF0Y2g7XG5leHBvcnRzLmFwcGx5SW5QbGFjZSA9IHBhdGNoSW5QbGFjZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuaXNWYWxpZE9iamVjdCA9IGlzVmFsaWRPYmplY3Q7XG5leHBvcnRzLmRlZmF1bHRIYXNoID0gZGVmYXVsdEhhc2g7XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHt9O1xuXG4vKipcbiAqIEFwcGx5IHRoZSBzdXBwbGllZCBKU09OIFBhdGNoIHRvIHhcbiAqIEBwYXJhbSB7YXJyYXl9IGNoYW5nZXMgSlNPTiBQYXRjaFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcn0geCBvYmplY3QvYXJyYXkvdmFsdWUgdG8gcGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKGluZGV4Ok51bWJlciwgYXJyYXk6QXJyYXksIGNvbnRleHQ6b2JqZWN0KTpOdW1iZXJ9IG9wdGlvbnMuZmluZENvbnRleHRcbiAqICBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0XG4gKiBAcmV0dXJucyB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHBhdGNoZWQgdmVyc2lvbiBvZiB4LiBJZiB4IGlzXG4gKiAgYW4gYXJyYXkgb3Igb2JqZWN0LCBpdCB3aWxsIGJlIG11dGF0ZWQgYW5kIHJldHVybmVkLiBPdGhlcndpc2UsIGlmXG4gKiAgeCBpcyBhIHZhbHVlLCB0aGUgbmV3IHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQuXG4gKi9cbmZ1bmN0aW9uIHBhdGNoKGNoYW5nZXMsIHgsIG9wdGlvbnMpIHtcblx0cmV0dXJuIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCBjbG9uZSh4KSwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5QbGFjZShjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdGlmKCFvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXHR9XG5cblx0Ly8gVE9ETzogQ29uc2lkZXIgdGhyb3dpbmcgaWYgY2hhbmdlcyBpcyBub3QgYW4gYXJyYXlcblx0aWYoIUFycmF5LmlzQXJyYXkoY2hhbmdlcykpIHtcblx0XHRyZXR1cm4geDtcblx0fVxuXG5cdHZhciBwYXRjaCwgcDtcblx0Zm9yKHZhciBpPTA7IGk8Y2hhbmdlcy5sZW5ndGg7ICsraSkge1xuXHRcdHAgPSBjaGFuZ2VzW2ldO1xuXHRcdHBhdGNoID0gcGF0Y2hlc1twLm9wXTtcblxuXHRcdGlmKHBhdGNoID09PSB2b2lkIDApIHtcblx0XHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignaW52YWxpZCBvcCAnICsgSlNPTi5zdHJpbmdpZnkocCkpO1xuXHRcdH1cblxuXHRcdHggPSBwYXRjaC5hcHBseSh4LCBwLCBvcHRpb25zKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0SGFzaCh4KSB7XG5cdHJldHVybiBpc1ZhbGlkT2JqZWN0KHgpID8gSlNPTi5zdHJpbmdpZnkoeCkgOiB4O1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIF9wYXJzZSA9IHJlcXVpcmUoJy4vanNvblBvaW50ZXJQYXJzZScpO1xuXG5leHBvcnRzLmZpbmQgPSBmaW5kO1xuZXhwb3J0cy5qb2luID0gam9pbjtcbmV4cG9ydHMuYWJzb2x1dGUgPSBhYnNvbHV0ZTtcbmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMuZW5jb2RlU2VnbWVudCA9IGVuY29kZVNlZ21lbnQ7XG5leHBvcnRzLmRlY29kZVNlZ21lbnQgPSBkZWNvZGVTZWdtZW50O1xuZXhwb3J0cy5wYXJzZUFycmF5SW5kZXggPSBwYXJzZUFycmF5SW5kZXg7XG5leHBvcnRzLmlzVmFsaWRBcnJheUluZGV4ID0gaXNWYWxpZEFycmF5SW5kZXg7XG5cbi8vIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0yXG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIHNlcGFyYXRvclJ4ID0gL1xcLy9nO1xudmFyIGVuY29kZWRTZXBhcmF0b3IgPSAnfjEnO1xudmFyIGVuY29kZWRTZXBhcmF0b3JSeCA9IC9+MS9nO1xuXG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlc2NhcGVSeCA9IC9+L2c7XG52YXIgZW5jb2RlZEVzY2FwZSA9ICd+MCc7XG52YXIgZW5jb2RlZEVzY2FwZVJ4ID0gL34wL2c7XG5cbi8qKlxuICogRmluZCB0aGUgcGFyZW50IG9mIHRoZSBzcGVjaWZpZWQgcGF0aCBpbiB4IGFuZCByZXR1cm4gYSBkZXNjcmlwdG9yXG4gKiBjb250YWluaW5nIHRoZSBwYXJlbnQgYW5kIGEga2V5LiAgSWYgdGhlIHBhcmVudCBkb2VzIG5vdCBleGlzdCBpbiB4LFxuICogcmV0dXJuIHVuZGVmaW5lZCwgaW5zdGVhZC5cbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4IG9iamVjdCBvciBhcnJheSBpbiB3aGljaCB0byBzZWFyY2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIEpTT04gUG9pbnRlciBzdHJpbmcgKGVuY29kZWQpXG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBmaW5kQ29udGV4dFxuICogIG9wdGlvbmFsIGZ1bmN0aW9uIHVzZWQgYWRqdXN0IGFycmF5IGluZGV4ZXMgZm9yIHNtYXJ0eS9mdXp6eSBwYXRjaGluZywgZm9yXG4gKiAgcGF0Y2hlcyBjb250YWluaW5nIGNvbnRleHQuICBJZiBwcm92aWRlZCwgY29udGV4dCBNVVNUIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcGFyYW0gez97YmVmb3JlOkFycmF5LCBhZnRlcjpBcnJheX19IGNvbnRleHQgb3B0aW9uYWwgcGF0Y2ggY29udGV4dCBmb3JcbiAqICBmaW5kQ29udGV4dCB0byB1c2UgdG8gYWRqdXN0IGFycmF5IGluZGljZXMuICBJZiBwcm92aWRlZCwgZmluZENvbnRleHQgTVVTVFxuICogIGFsc28gYmUgcHJvdmlkZWQuXG4gKiBAcmV0dXJucyB7e3RhcmdldDpvYmplY3R8YXJyYXl8bnVtYmVyfHN0cmluZywga2V5OnN0cmluZ318dW5kZWZpbmVkfVxuICovXG5mdW5jdGlvbiBmaW5kKHgsIHBhdGgsIGZpbmRDb250ZXh0LCBjb250ZXh0KSB7XG5cdGlmKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmKHBhdGggPT09ICcnKSB7XG5cdFx0Ly8gd2hvbGUgZG9jdW1lbnRcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogdm9pZCAwIH07XG5cdH1cblxuXHRpZihwYXRoID09PSBzZXBhcmF0b3IpIHtcblx0XHRyZXR1cm4geyB0YXJnZXQ6IHgsIGtleTogJycgfTtcblx0fVxuXG5cdHZhciBwYXJlbnQgPSB4LCBrZXk7XG5cdHZhciBoYXNDb250ZXh0ID0gY29udGV4dCAhPT0gdm9pZCAwO1xuXG5cdF9wYXJzZShwYXRoLCBmdW5jdGlvbihzZWdtZW50KSB7XG5cdFx0Ly8gaG0uLi4gdGhpcyBzZWVtcyBsaWtlIGl0IHNob3VsZCBiZSBpZih0eXBlb2YgeCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0aWYoeCA9PSBudWxsKSB7XG5cdFx0XHQvLyBTaWduYWwgdGhhdCB3ZSBwcmVtYXR1cmVseSBoaXQgdGhlIGVuZCBvZiB0aGUgcGF0aCBoaWVyYXJjaHkuXG5cdFx0XHRwYXJlbnQgPSBudWxsO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmKEFycmF5LmlzQXJyYXkoeCkpIHtcblx0XHRcdGtleSA9IGhhc0NvbnRleHRcblx0XHRcdFx0PyBmaW5kSW5kZXgoZmluZENvbnRleHQsIHBhcnNlQXJyYXlJbmRleChzZWdtZW50KSwgeCwgY29udGV4dClcblx0XHRcdFx0OiBzZWdtZW50ID09PSAnLScgPyBzZWdtZW50IDogcGFyc2VBcnJheUluZGV4KHNlZ21lbnQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXkgPSBzZWdtZW50O1xuXHRcdH1cblxuXHRcdHBhcmVudCA9IHg7XG5cdFx0eCA9IHhba2V5XTtcblx0fSk7XG5cblx0cmV0dXJuIHBhcmVudCA9PT0gbnVsbFxuXHRcdD8gdm9pZCAwXG5cdFx0OiB7IHRhcmdldDogcGFyZW50LCBrZXk6IGtleSB9O1xufVxuXG5mdW5jdGlvbiBhYnNvbHV0ZShwYXRoKSB7XG5cdHJldHVybiBwYXRoWzBdID09PSBzZXBhcmF0b3IgPyBwYXRoIDogc2VwYXJhdG9yICsgcGF0aDtcbn1cblxuZnVuY3Rpb24gam9pbihzZWdtZW50cykge1xuXHRyZXR1cm4gc2VnbWVudHMuam9pbihzZXBhcmF0b3IpO1xufVxuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG5cdHZhciBzZWdtZW50cyA9IFtdO1xuXHRfcGFyc2UocGF0aCwgc2VnbWVudHMucHVzaC5iaW5kKHNlZ21lbnRzKSk7XG5cdHJldHVybiBzZWdtZW50cztcbn1cblxuZnVuY3Rpb24gY29udGFpbnMoYSwgYikge1xuXHRyZXR1cm4gYi5pbmRleE9mKGEpID09PSAwICYmIGJbYS5sZW5ndGhdID09PSBzZXBhcmF0b3I7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgSlNPTiBQb2ludGVyIHBhdGggc2VnbWVudFxuICogQHNlZSBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtM1xuICogQHBhcmFtIHtzdHJpbmd9IHMgZW5jb2RlZCBzZWdtZW50XG4gKiBAcmV0dXJucyB7c3RyaW5nfSBkZWNvZGVkIHNlZ21lbnRcbiAqL1xuZnVuY3Rpb24gZGVjb2RlU2VnbWVudChzKSB7XG5cdC8vIFNlZTogaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcblx0cmV0dXJuIHMucmVwbGFjZShlbmNvZGVkU2VwYXJhdG9yUngsIHNlcGFyYXRvcikucmVwbGFjZShlbmNvZGVkRXNjYXBlUngsIGVzY2FwZUNoYXIpO1xufVxuXG4vKipcbiAqIEVuY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGRlY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZW5jb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGVuY29kZVNlZ21lbnQocykge1xuXHRyZXR1cm4gcy5yZXBsYWNlKGVzY2FwZVJ4LCBlbmNvZGVkRXNjYXBlKS5yZXBsYWNlKHNlcGFyYXRvclJ4LCBlbmNvZGVkU2VwYXJhdG9yKTtcbn1cblxudmFyIGFycmF5SW5kZXhSeCA9IC9eKDB8WzEtOV1cXGQqKSQvO1xuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHMgaXMgYSB2YWxpZCBKU09OIFBvaW50ZXIgYXJyYXkgaW5kZXhcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXgocykge1xuXHRyZXR1cm4gYXJyYXlJbmRleFJ4LnRlc3Qocyk7XG59XG5cbi8qKlxuICogU2FmZWx5IHBhcnNlIGEgc3RyaW5nIGludG8gYSBudW1iZXIgPj0gMC4gRG9lcyBub3QgY2hlY2sgZm9yIGRlY2ltYWwgbnVtYmVyc1xuICogQHBhcmFtIHtzdHJpbmd9IHMgbnVtZXJpYyBzdHJpbmdcbiAqIEByZXR1cm5zIHtudW1iZXJ9IG51bWJlciA+PSAwXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJyYXlJbmRleCAocykge1xuXHRpZihpc1ZhbGlkQXJyYXlJbmRleChzKSkge1xuXHRcdHJldHVybiArcztcblx0fVxuXG5cdHRocm93IG5ldyBTeW50YXhFcnJvcignaW52YWxpZCBhcnJheSBpbmRleCAnICsgcyk7XG59XG5cbmZ1bmN0aW9uIGZpbmRJbmRleCAoZmluZENvbnRleHQsIHN0YXJ0LCBhcnJheSwgY29udGV4dCkge1xuXHR2YXIgaW5kZXggPSBzdGFydDtcblxuXHRpZihpbmRleCA8IDApIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2FycmF5IGluZGV4IG91dCBvZiBib3VuZHMgJyArIGluZGV4KTtcblx0fVxuXG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCAmJiB0eXBlb2YgZmluZENvbnRleHQgPT09ICdmdW5jdGlvbicpIHtcblx0XHRpbmRleCA9IGZpbmRDb250ZXh0KHN0YXJ0LCBhcnJheSwgY29udGV4dCk7XG5cdFx0aWYoaW5kZXggPCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCBmaW5kIHBhdGNoIGNvbnRleHQgJyArIGNvbnRleHQpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBpbmRleDtcbn0iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBqc29uUG9pbnRlclBhcnNlO1xuXG52YXIgcGFyc2VSeCA9IC9cXC98fjF8fjAvZztcbnZhciBzZXBhcmF0b3IgPSAnLyc7XG52YXIgZXNjYXBlQ2hhciA9ICd+JztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcblxuLyoqXG4gKiBQYXJzZSB0aHJvdWdoIGFuIGVuY29kZWQgSlNPTiBQb2ludGVyIHN0cmluZywgZGVjb2RpbmcgZWFjaCBwYXRoIHNlZ21lbnRcbiAqIGFuZCBwYXNzaW5nIGl0IHRvIGFuIG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBzZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjc2VjdGlvbi00XG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmdcbiAqIEBwYXJhbSB7e2Z1bmN0aW9uKHNlZ21lbnQ6c3RyaW5nKTpib29sZWFufX0gb25TZWdtZW50IGNhbGxiYWNrIGZ1bmN0aW9uXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBvcmlnaW5hbCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGpzb25Qb2ludGVyUGFyc2UocGF0aCwgb25TZWdtZW50KSB7XG5cdHZhciBwb3MsIGFjY3VtLCBtYXRjaGVzLCBtYXRjaDtcblxuXHRwb3MgPSBwYXRoLmNoYXJBdCgwKSA9PT0gc2VwYXJhdG9yID8gMSA6IDA7XG5cdGFjY3VtID0gJyc7XG5cdHBhcnNlUngubGFzdEluZGV4ID0gcG9zO1xuXG5cdHdoaWxlKG1hdGNoZXMgPSBwYXJzZVJ4LmV4ZWMocGF0aCkpIHtcblxuXHRcdG1hdGNoID0gbWF0Y2hlc1swXTtcblx0XHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcywgcGFyc2VSeC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuXHRcdHBvcyA9IHBhcnNlUngubGFzdEluZGV4O1xuXG5cdFx0aWYobWF0Y2ggPT09IHNlcGFyYXRvcikge1xuXHRcdFx0aWYgKG9uU2VnbWVudChhY2N1bSkgPT09IGZhbHNlKSByZXR1cm4gcGF0aDtcblx0XHRcdGFjY3VtID0gJyc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFjY3VtICs9IG1hdGNoID09PSBlbmNvZGVkU2VwYXJhdG9yID8gc2VwYXJhdG9yIDogZXNjYXBlQ2hhcjtcblx0XHR9XG5cdH1cblxuXHRhY2N1bSArPSBwYXRoLnNsaWNlKHBvcyk7XG5cdG9uU2VnbWVudChhY2N1bSk7XG5cblx0cmV0dXJuIHBhdGg7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb21wYXJlID0gY29tcGFyZTtcbmV4cG9ydHMucmVkdWNlID0gcmVkdWNlO1xuXG52YXIgUkVNT1ZFLCBSSUdIVCwgQURELCBET1dOLCBTS0lQO1xuXG5leHBvcnRzLlJFTU9WRSA9IFJFTU9WRSA9IFJJR0hUID0gLTE7XG5leHBvcnRzLkFERCAgICA9IEFERCAgICA9IERPV04gID0gIDE7XG5leHBvcnRzLkVRVUFMICA9IFNLSVAgICA9IDA7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGxjcyBjb21wYXJpc29uIG1hdHJpeCBkZXNjcmliaW5nIHRoZSBkaWZmZXJlbmNlc1xuICogYmV0d2VlbiB0d28gYXJyYXktbGlrZSBzZXF1ZW5jZXNcbiAqIEBwYXJhbSB7YXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHBhcmFtIHthcnJheX0gYiBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBsY3MgZGVzY3JpcHRvciwgc3VpdGFibGUgZm9yIHBhc3NpbmcgdG8gcmVkdWNlKClcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG5cdHZhciBjb2xzID0gYS5sZW5ndGg7XG5cdHZhciByb3dzID0gYi5sZW5ndGg7XG5cblx0dmFyIHByZWZpeCA9IGZpbmRQcmVmaXgoYSwgYik7XG5cdHZhciBzdWZmaXggPSBwcmVmaXggPCBjb2xzICYmIHByZWZpeCA8IHJvd3Ncblx0XHQ/IGZpbmRTdWZmaXgoYSwgYiwgcHJlZml4KVxuXHRcdDogMDtcblxuXHR2YXIgcmVtb3ZlID0gc3VmZml4ICsgcHJlZml4IC0gMTtcblx0Y29scyAtPSByZW1vdmU7XG5cdHJvd3MgLT0gcmVtb3ZlO1xuXHR2YXIgbWF0cml4ID0gY3JlYXRlTWF0cml4KGNvbHMsIHJvd3MpO1xuXG5cdGZvciAodmFyIGogPSBjb2xzIC0gMTsgaiA+PSAwOyAtLWopIHtcblx0XHRmb3IgKHZhciBpID0gcm93cyAtIDE7IGkgPj0gMDsgLS1pKSB7XG5cdFx0XHRtYXRyaXhbaV1bal0gPSBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBwcmVmaXgsIGosIGkpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0cHJlZml4OiBwcmVmaXgsXG5cdFx0bWF0cml4OiBtYXRyaXgsXG5cdFx0c3VmZml4OiBzdWZmaXhcblx0fTtcbn1cblxuLyoqXG4gKiBSZWR1Y2UgYSBzZXQgb2YgbGNzIGNoYW5nZXMgcHJldmlvdXNseSBjcmVhdGVkIHVzaW5nIGNvbXBhcmVcbiAqIEBwYXJhbSB7ZnVuY3Rpb24ocmVzdWx0OiosIHR5cGU6bnVtYmVyLCBpOm51bWJlciwgajpudW1iZXIpfSBmXG4gKiAgcmVkdWNlciBmdW5jdGlvbiwgd2hlcmU6XG4gKiAgLSByZXN1bHQgaXMgdGhlIGN1cnJlbnQgcmVkdWNlIHZhbHVlLFxuICogIC0gdHlwZSBpcyB0aGUgdHlwZSBvZiBjaGFuZ2U6IEFERCwgUkVNT1ZFLCBvciBTS0lQXG4gKiAgLSBpIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGJcbiAqICAtIGogaXMgdGhlIGluZGV4IG9mIHRoZSBjaGFuZ2UgbG9jYXRpb24gaW4gYVxuICogQHBhcmFtIHsqfSByIGluaXRpYWwgdmFsdWVcbiAqIEBwYXJhbSB7b2JqZWN0fSBsY3MgcmVzdWx0cyByZXR1cm5lZCBieSBjb21wYXJlKClcbiAqIEByZXR1cm5zIHsqfSB0aGUgZmluYWwgcmVkdWNlZCB2YWx1ZVxuICovXG5mdW5jdGlvbiByZWR1Y2UoZiwgciwgbGNzKSB7XG5cdHZhciBpLCBqLCBrLCBvcDtcblxuXHR2YXIgbSA9IGxjcy5tYXRyaXg7XG5cblx0Ly8gUmVkdWNlIHNoYXJlZCBwcmVmaXhcblx0dmFyIGwgPSBsY3MucHJlZml4O1xuXHRmb3IoaSA9IDA7aSA8IGw7ICsraSkge1xuXHRcdHIgPSBmKHIsIFNLSVAsIGksIGkpO1xuXHR9XG5cblx0Ly8gUmVkdWNlIGxvbmdlc3QgY2hhbmdlIHNwYW5cblx0ayA9IGk7XG5cdGwgPSBtLmxlbmd0aDtcblx0aSA9IDA7XG5cdGogPSAwO1xuXHR3aGlsZShpIDwgbCkge1xuXHRcdG9wID0gbVtpXVtqXS50eXBlO1xuXHRcdHIgPSBmKHIsIG9wLCBpK2ssIGorayk7XG5cblx0XHRzd2l0Y2gob3ApIHtcblx0XHRcdGNhc2UgU0tJUDogICsraTsgKytqOyBicmVhaztcblx0XHRcdGNhc2UgUklHSFQ6ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIERPV046ICArK2k7IGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlZHVjZSBzaGFyZWQgc3VmZml4XG5cdGkgKz0gaztcblx0aiArPSBrO1xuXHRsID0gbGNzLnN1ZmZpeDtcblx0Zm9yKGsgPSAwO2sgPCBsOyArK2spIHtcblx0XHRyID0gZihyLCBTS0lQLCBpK2ssIGorayk7XG5cdH1cblxuXHRyZXR1cm4gcjtcbn1cblxuZnVuY3Rpb24gZmluZFByZWZpeChhLCBiKSB7XG5cdHZhciBpID0gMDtcblx0dmFyIGwgPSBNYXRoLm1pbihhLmxlbmd0aCwgYi5sZW5ndGgpO1xuXHR3aGlsZShpIDwgbCAmJiBhW2ldID09PSBiW2ldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBmaW5kU3VmZml4KGEsIGIpIHtcblx0dmFyIGFsID0gYS5sZW5ndGggLSAxO1xuXHR2YXIgYmwgPSBiLmxlbmd0aCAtIDE7XG5cdHZhciBsID0gTWF0aC5taW4oYWwsIGJsKTtcblx0dmFyIGkgPSAwO1xuXHR3aGlsZShpIDwgbCAmJiBhW2FsLWldID09PSBiW2JsLWldKSB7XG5cdFx0KytpO1xuXHR9XG5cdHJldHVybiBpO1xufVxuXG5mdW5jdGlvbiBiYWNrdHJhY2sobWF0cml4LCBhLCBiLCBzdGFydCwgaiwgaSkge1xuXHRpZiAoYVtqK3N0YXJ0XSA9PT0gYltpK3N0YXJ0XSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2ogKyAxXS52YWx1ZSwgdHlwZTogU0tJUCB9O1xuXHR9XG5cdGlmIChtYXRyaXhbaV1baiArIDFdLnZhbHVlIDwgbWF0cml4W2kgKyAxXVtqXS52YWx1ZSkge1xuXHRcdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaV1baiArIDFdLnZhbHVlICsgMSwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdHJldHVybiB7IHZhbHVlOiBtYXRyaXhbaSArIDFdW2pdLnZhbHVlICsgMSwgdHlwZTogRE9XTiB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYXRyaXggKGNvbHMsIHJvd3MpIHtcblx0dmFyIG0gPSBbXSwgaSwgaiwgbGFzdHJvdztcblxuXHQvLyBGaWxsIHRoZSBsYXN0IHJvd1xuXHRsYXN0cm93ID0gbVtyb3dzXSA9IFtdO1xuXHRmb3IgKGogPSAwOyBqPGNvbHM7ICsraikge1xuXHRcdGxhc3Ryb3dbal0gPSB7IHZhbHVlOiBjb2xzIC0gaiwgdHlwZTogUklHSFQgfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY29sXG5cdGZvciAoaSA9IDA7IGk8cm93czsgKytpKSB7XG5cdFx0bVtpXSA9IFtdO1xuXHRcdG1baV1bY29sc10gPSB7IHZhbHVlOiByb3dzIC0gaSwgdHlwZTogRE9XTiB9O1xuXHR9XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCBjZWxsXG5cdG1bcm93c11bY29sc10gPSB7IHZhbHVlOiAwLCB0eXBlOiBTS0lQIH07XG5cblx0cmV0dXJuIG07XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCcuL2Nsb25lJyk7XG52YXIgZGVlcEVxdWFscyA9IHJlcXVpcmUoJy4vZGVlcEVxdWFscycpO1xudmFyIGNvbW11dGVQYXRocyA9IHJlcXVpcmUoJy4vY29tbXV0ZVBhdGhzJyk7XG5cbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vYXJyYXknKTtcblxudmFyIFRlc3RGYWlsZWRFcnJvciA9IHJlcXVpcmUoJy4vVGVzdEZhaWxlZEVycm9yJyk7XG52YXIgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL0ludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yJyk7XG52YXIgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IgPSByZXF1aXJlKCcuL1BhdGNoTm90SW52ZXJ0aWJsZUVycm9yJyk7XG5cbnZhciBmaW5kID0ganNvblBvaW50ZXIuZmluZDtcbnZhciBwYXJzZUFycmF5SW5kZXggPSBqc29uUG9pbnRlci5wYXJzZUFycmF5SW5kZXg7XG5cbmV4cG9ydHMudGVzdCA9IHtcblx0YXBwbHk6IGFwcGx5VGVzdCxcblx0aW52ZXJzZTogaW52ZXJ0VGVzdCxcblx0Y29tbXV0ZTogY29tbXV0ZVRlc3Rcbn07XG5cbmV4cG9ydHMuYWRkID0ge1xuXHRhcHBseTogYXBwbHlBZGQsXG5cdGludmVyc2U6IGludmVydEFkZCxcblx0Y29tbXV0ZTogY29tbXV0ZUFkZE9yQ29weVxufTtcblxuZXhwb3J0cy5yZW1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseVJlbW92ZSxcblx0aW52ZXJzZTogaW52ZXJ0UmVtb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVtb3ZlXG59O1xuXG5leHBvcnRzLnJlcGxhY2UgPSB7XG5cdGFwcGx5OiBhcHBseVJlcGxhY2UsXG5cdGludmVyc2U6IGludmVydFJlcGxhY2UsXG5cdGNvbW11dGU6IGNvbW11dGVSZXBsYWNlXG59O1xuXG5leHBvcnRzLm1vdmUgPSB7XG5cdGFwcGx5OiBhcHBseU1vdmUsXG5cdGludmVyc2U6IGludmVydE1vdmUsXG5cdGNvbW11dGU6IGNvbW11dGVNb3ZlXG59O1xuXG5leHBvcnRzLmNvcHkgPSB7XG5cdGFwcGx5OiBhcHBseUNvcHksXG5cdGludmVyc2U6IG5vdEludmVydGlibGUsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbi8qKlxuICogQXBwbHkgYSB0ZXN0IG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IHRlc3QgdGVzdCBvcGVyYXRpb25cbiAqIEB0aHJvd3Mge1Rlc3RGYWlsZWRFcnJvcn0gaWYgdGhlIHRlc3Qgb3BlcmF0aW9uIGZhaWxzXG4gKi9cblxuZnVuY3Rpb24gYXBwbHlUZXN0KHgsIHRlc3QsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIHRlc3QucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgdGVzdC5jb250ZXh0KTtcblx0dmFyIHRhcmdldCA9IHBvaW50ZXIudGFyZ2V0O1xuXHR2YXIgaW5kZXgsIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdGluZGV4ID0gcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KTtcblx0XHQvL2luZGV4ID0gZmluZEluZGV4KG9wdGlvbnMuZmluZENvbnRleHQsIGluZGV4LCB0YXJnZXQsIHRlc3QuY29udGV4dCk7XG5cdFx0dmFsdWUgPSB0YXJnZXRbaW5kZXhdO1xuXHR9IGVsc2Uge1xuXHRcdHZhbHVlID0gcG9pbnRlci5rZXkgPT09IHZvaWQgMCA/IHBvaW50ZXIudGFyZ2V0IDogcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldO1xuXHR9XG5cblx0aWYoIWRlZXBFcXVhbHModmFsdWUsIHRlc3QudmFsdWUpKSB7XG5cdFx0dGhyb3cgbmV3IFRlc3RGYWlsZWRFcnJvcigndGVzdCBmYWlsZWQgJyArIEpTT04uc3RyaW5naWZ5KHRlc3QpKTtcblx0fVxuXG5cdHJldHVybiB4O1xufVxuXG4vKipcbiAqIEludmVydCB0aGUgcHJvdmlkZWQgdGVzdCBhbmQgYWRkIGl0IHRvIHRoZSBpbnZlcnRlZCBwYXRjaCBzZXF1ZW5jZVxuICogQHBhcmFtIHByXG4gKiBAcGFyYW0gdGVzdFxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZnVuY3Rpb24gaW52ZXJ0VGVzdChwciwgdGVzdCkge1xuXHRwci5wdXNoKHRlc3QpO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVRlc3QodGVzdCwgYikge1xuXHRpZih0ZXN0LnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSB0ZXN0LHJlbW92ZSAtPiByZW1vdmUsdGVzdCBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCB0ZXN0XTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHModGVzdCwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYW4gYWRkIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBhZGQgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5QWRkKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigncGF0aCBkb2VzIG5vdCBleGlzdCAnICsgY2hhbmdlLnBhdGgpO1xuXHR9XG5cblx0dmFyIHZhbCA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWw7XG5cdH1cblxuXHRfYWRkKHBvaW50ZXIsIHZhbCk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfYWRkKHBvaW50ZXIsIHZhbHVlKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHQvLyAnLScgaW5kaWNhdGVzICdhcHBlbmQnIHRvIGFycmF5XG5cdFx0aWYocG9pbnRlci5rZXkgPT09ICctJykge1xuXHRcdFx0dGFyZ2V0LnB1c2godmFsdWUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQuc3BsaWNlKHBvaW50ZXIua2V5LCAwLCB2YWx1ZSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcigndGFyZ2V0IG9mIGFkZCBtdXN0IGJlIGFuIG9iamVjdCBvciBhcnJheSAnICsgcG9pbnRlci5rZXkpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGludmVydEFkZChwciwgYWRkKSB7XG5cdHZhciBjb250ZXh0ID0gYWRkLmNvbnRleHQ7XG5cdGlmKGNvbnRleHQgIT09IHZvaWQgMCkge1xuXHRcdGNvbnRleHQgPSB7XG5cdFx0XHRiZWZvcmU6IGNvbnRleHQuYmVmb3JlLFxuXHRcdFx0YWZ0ZXI6IGFycmF5LmNvbnMoYWRkLnZhbHVlLCBjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXHRwci5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogYWRkLnBhdGgsIHZhbHVlOiBhZGQudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlbW92ZScsIHBhdGg6IGFkZC5wYXRoLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZUFkZE9yQ29weShhZGQsIGIpIHtcblx0aWYoYWRkLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBhZGQscmVtb3ZlIC0+IHJlbW92ZSxhZGQgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhhZGQsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVwbGFjZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgcmVwbGFjZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZXBsYWNlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwb2ludGVyKSB8fCBtaXNzaW5nVmFsdWUocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWx1ZSA9IGNsb25lKGNoYW5nZS52YWx1ZSk7XG5cblx0Ly8gSWYgcG9pbnRlciByZWZlcnMgdG8gd2hvbGUgZG9jdW1lbnQsIHJlcGxhY2Ugd2hvbGUgZG9jdW1lbnRcblx0aWYocG9pbnRlci5rZXkgPT09IHZvaWQgMCkge1xuXHRcdHJldHVybiB2YWx1ZTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR0YXJnZXRbcGFyc2VBcnJheUluZGV4KHBvaW50ZXIua2V5KV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRbcG9pbnRlci5rZXldID0gdmFsdWU7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVwbGFjZShwciwgYywgaSwgcGF0Y2gpIHtcblx0dmFyIHByZXYgPSBwYXRjaFtpLTFdO1xuXHRpZihwcmV2ID09PSB2b2lkIDAgfHwgcHJldi5vcCAhPT0gJ3Rlc3QnIHx8IHByZXYucGF0aCAhPT0gYy5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0IHJlcGxhY2Ugdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKHByZXYudmFsdWUsIGFycmF5LnRhaWwoY29udGV4dC5hZnRlcikpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IGMudmFsdWUgfSk7XG5cdHByLnB1c2goeyBvcDogJ3JlcGxhY2UnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBwcmV2LnZhbHVlIH0pO1xuXHRyZXR1cm4gMjtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZVJlcGxhY2UocmVwbGFjZSwgYikge1xuXHRpZihyZXBsYWNlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSByZXBsYWNlLHJlbW92ZSAtPiByZW1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRpZihiLm9wID09PSAndGVzdCcgfHwgYi5vcCA9PT0gJ3JlcGxhY2UnKSB7XG5cdFx0cmV0dXJuIFtiLCByZXBsYWNlXTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMocmVwbGFjZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSByZW1vdmUgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlSZW1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXG5cdC8vIGtleSBtdXN0IGV4aXN0IGZvciByZW1vdmVcblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDApIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdF9yZW1vdmUocG9pbnRlcik7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBfcmVtb3ZlIChwb2ludGVyKSB7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblxuXHR2YXIgcmVtb3ZlZDtcblx0aWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXQuc3BsaWNlKHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSksIDEpO1xuXHRcdHJldHVybiByZW1vdmVkWzBdO1xuXG5cdH0gZWxzZSBpZiAoaXNWYWxpZE9iamVjdCh0YXJnZXQpKSB7XG5cdFx0cmVtb3ZlZCA9IHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0ZGVsZXRlIHRhcmdldFtwb2ludGVyLmtleV07XG5cdFx0cmV0dXJuIHJlbW92ZWQ7XG5cblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiByZW1vdmUgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXknKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRSZW1vdmUocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZW1vdmUgdy9vIHRlc3QnKTtcblx0fVxuXG5cdHZhciBjb250ZXh0ID0gcHJldi5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpXG5cdFx0fVxuXHR9XG5cblx0cHIucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZW1vdmUocmVtb3ZlLCBiKSB7XG5cdGlmKHJlbW92ZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHRyZXR1cm4gW2IsIHJlbW92ZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlbW92ZSwgYik7XG59XG5cbi8qKlxuICogQXBwbHkgYSBtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSBtb3ZlIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseU1vdmUoeCwgY2hhbmdlLCBvcHRpb25zKSB7XG5cdGlmKGpzb25Qb2ludGVyLmNvbnRhaW5zKGNoYW5nZS5wYXRoLCBjaGFuZ2UuZnJvbSkpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ21vdmUuZnJvbSBjYW5ub3QgYmUgYW5jZXN0b3Igb2YgbW92ZS5wYXRoJyk7XG5cdH1cblxuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdF9hZGQocHRvLCBfcmVtb3ZlKHBmcm9tKSk7XG5cdHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBpbnZlcnRNb3ZlKHByLCBjKSB7XG5cdHByLnB1c2goeyBvcDogJ21vdmUnLFxuXHRcdHBhdGg6IGMuZnJvbSwgY29udGV4dDogYy5mcm9tQ29udGV4dCxcblx0XHRmcm9tOiBjLnBhdGgsIGZyb21Db250ZXh0OiBjLmNvbnRleHQgfSk7XG5cdHJldHVybiAxO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlTW92ZShtb3ZlLCBiKSB7XG5cdGlmKG1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2FuXFwndCBjb21tdXRlIG1vdmUscmVtb3ZlIC0+IG1vdmUscmVwbGFjZSBmb3Igc2FtZSBwYXRoJyk7XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKG1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgY29weSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgY29weSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlDb3B5KHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcHRvID0gZmluZCh4LCBjaGFuZ2UucGF0aCwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmNvbnRleHQpO1xuXHR2YXIgcGZyb20gPSBmaW5kKHgsIGNoYW5nZS5mcm9tLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuZnJvbUNvbnRleHQpO1xuXG5cdGlmKG5vdEZvdW5kKHBmcm9tKSB8fCBtaXNzaW5nVmFsdWUocGZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdjb3B5LmZyb20gbXVzdCBleGlzdCcpO1xuXHR9XG5cblx0dmFyIHRhcmdldCA9IHBmcm9tLnRhcmdldDtcblx0dmFyIHZhbHVlO1xuXG5cdGlmKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuXHRcdHZhbHVlID0gdGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwZnJvbS5rZXkpXTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwZnJvbS5rZXldO1xuXHR9XG5cblx0X2FkZChwdG8sIGNsb25lKHZhbHVlKSk7XG5cdHJldHVybiB4O1xufVxuXG4vLyBOT1RFOiBDb3B5IGlzIG5vdCBpbnZlcnRpYmxlXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2N1am9qcy9qaWZmL2lzc3Vlcy85XG4vLyBUaGlzIG5lZWRzIG1vcmUgdGhvdWdodC4gV2UgbWF5IGhhdmUgdG8gZXh0ZW5kL2FtZW5kIEpTT04gUGF0Y2guXG4vLyBBdCBmaXJzdCBnbGFuY2UsIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQganVzdCBiZSBhIHJlbW92ZS5cbi8vIEhvd2V2ZXIsIHRoYXQncyBub3QgY29ycmVjdC4gIEl0IHZpb2xhdGVzIHRoZSBpbnZvbHV0aW9uOlxuLy8gaW52ZXJ0KGludmVydChwKSkgfj0gcC4gIEZvciBleGFtcGxlOlxuLy8gaW52ZXJ0KGNvcHkpIC0+IHJlbW92ZVxuLy8gaW52ZXJ0KHJlbW92ZSkgLT4gYWRkXG4vLyB0aHVzOiBpbnZlcnQoaW52ZXJ0KGNvcHkpKSAtPiBhZGQgKERPSCEgdGhpcyBzaG91bGQgYmUgY29weSEpXG5cbmZ1bmN0aW9uIG5vdEludmVydGlibGUoXywgYykge1xuXHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgJyArIGMub3ApO1xufVxuXG5mdW5jdGlvbiBub3RGb3VuZCAocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlciA9PT0gdm9pZCAwIHx8IChwb2ludGVyLnRhcmdldCA9PSBudWxsICYmIHBvaW50ZXIua2V5ICE9PSB2b2lkIDApO1xufVxuXG5mdW5jdGlvbiBtaXNzaW5nVmFsdWUocG9pbnRlcikge1xuXHRyZXR1cm4gcG9pbnRlci5rZXkgIT09IHZvaWQgMCAmJiBwb2ludGVyLnRhcmdldFtwb2ludGVyLmtleV0gPT09IHZvaWQgMDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB4IGlzIGEgbm9uLW51bGwgb2JqZWN0XG4gKiBAcGFyYW0geyp9IHhcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc1ZhbGlkT2JqZWN0ICh4KSB7XG5cdHJldHVybiB4ICE9PSBudWxsICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0Jztcbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJmaXZlaHVuZHJlZHBpeFwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTQyLjksMjcuNmMtMi4xLDAtMy42LDEtNS44LDMuNWMtMS45LTIuNS0zLjgtMy41LTUuOC0zLjVjLTEuNywwLTMuNywwLjctNC43LDMuMiBjLTEtMi0yLjctMi42LTQuMS0yLjZjLTEsMC0yLDAuMi0yLjksMS4xbDAuNi0zLjNoNi4ydi0yLjVoLTguNGwtMS41LDh2MC4yaDIuN2MwLjYtMSwxLjUtMS4yLDIuMy0xLjJjMS4yLDAsMi4zLDAuNiwyLjYsMi40djAuNyBjLTAuMiwxLjYtMS4zLDIuNi0yLjYsMi42Yy0xLjEsMC0yLjMtMC42LTIuNC0yLjJoLTN2MC43YzAsMC4zLDAuNSwxLjUsMC41LDEuNmMxLjMsMi4xLDMuNCwyLjUsNSwyLjVjMS44LDAsMy45LTAuNyw1LjEtMy4yIGMxLjEsMi40LDMsMy4xLDQuOCwzLjFjMi4xLDAsMy41LTAuOSw1LjctMy4zYzEuOSwyLjMsMy43LDMuMyw1LjcsMy4zYzMuNCwwLDUuMS0yLjYsNS4xLTUuNkM0OCwzMCw0Ni4yLDI3LjYsNDIuOSwyNy42eiAgTTM0LjcsMzMuN2MtMC40LDAuNC0xLDAuOS0xLjQsMS4xYy0wLjcsMC40LTEuMywwLjYtMS45LDAuNmMtMC42LDAtMS43LTAuNC0yLjEtMS4zYy0wLjEtMC4yLTAuMi0wLjYtMC4yLTAuN3YtMC45IGMwLjMtMS41LDEuMS0yLjEsMi4yLTIuMWMwLjEsMCwwLjYsMCwwLjksMC4xYzAuNCwwLjEsMC43LDAuMywxLjEsMC42YzAuNCwwLjMsMiwxLjYsMiwxLjhDMzUuMywzMy4yLDM0LjksMzMuNSwzNC43LDMzLjd6ICBNNDIuOSwzNS41Yy0xLjMsMC0yLjYtMC45LTMuOS0yLjNjMS40LTEuNSwyLjUtMi42LDMuOC0yLjZjMS41LDAsMi4zLDEuMSwyLjMsMi41QzQ1LjIsMzQuNCw0NC40LDM1LjUsNDIuOSwzNS41elwiLFxuICAgIFwibWFza1wiOiBcIk0zMy4zLDMxLjNjLTAuNC0wLjItMC43LTAuNC0xLjEtMC42Yy0wLjMtMC4xLTAuOC0wLjEtMC45LTAuMWMtMS4xLDAtMS45LDAuNi0yLjIsMi4xdjAuOWMwLDAuMSwwLjEsMC40LDAuMiwwLjcgYzAuMywwLjksMS40LDEuMywyLjEsMS4zczEuMi0wLjIsMS45LTAuNmMwLjUtMC4zLDEtMC43LDEuNC0xLjFjMC4yLTAuMiwwLjUtMC41LDAuNS0wLjZDMzUuMywzMi44LDMzLjcsMzEuNiwzMy4zLDMxLjN6ICBNNDIuOCwzMC42Yy0xLjMsMC0yLjQsMS0zLjgsMi42YzEuMywxLjUsMi42LDIuMywzLjksMi4zYzEuNSwwLDIuMi0xLjEsMi4yLTIuNEM0NS4yLDMxLjcsNDQuMywzMC42LDQyLjgsMzAuNnogTTAsMHY2NGg2NFYwSDB6ICBNNDIuOSwzOC41Yy0yLDAtMy44LTEtNS43LTMuM2MtMi4yLDIuNC0zLjcsMy4zLTUuNywzLjNjLTEuOCwwLTMuNy0wLjctNC44LTMuMWMtMS4yLDIuNS0zLjMsMy4yLTUuMSwzLjJjLTEuNiwwLTMuOC0wLjQtNS0yLjUgQzE2LjUsMzYsMTYsMzQuOCwxNiwzNC41di0wLjdoM2MwLjEsMS42LDEuMywyLjIsMi40LDIuMmMxLjMsMCwyLjQtMC45LDIuNi0yLjZ2LTAuN2MtMC4yLTEuOC0xLjMtMi40LTIuNi0yLjQgYy0wLjgsMC0xLjYsMC4yLTIuMywxLjJoLTIuN3YtMC4ybDEuNS04aDguNHYyLjVoLTYuMmwtMC42LDMuM2MxLTAuOSwyLTEuMSwyLjktMS4xYzEuNCwwLDMuMiwwLjYsNC4xLDIuNmMxLTIuNCwzLTMuMiw0LjctMy4yIGMyLDAsMy45LDEsNS44LDMuNWMyLjEtMi42LDMuNy0zLjUsNS44LTMuNWMzLjMsMCw1LjEsMi40LDUuMSw1LjRDNDgsMzUuOSw0Ni4yLDM4LjUsNDIuOSwzOC41elwiLFxuICAgIFwiY29sb3JcIjogXCIjMjIyMjIyXCJcbiAgfSxcbiAgXCJiYW5kc2ludG93blwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTI1LjgsMzkuM2gxMy40djEuMUgyNC43VjE4aC01LjZ2MjhoMjUuOFYzMy43aC0xOVYzOS4zeiBNMzEuNCwyNC43aC01LjZ2Ny44aDUuNlYyNC43eiBNMzguMiwyNC43aC01LjZ2Ny44aDUuNlYyNC43eiBNMzkuMywxOHYxNC42aDUuNlYxOEgzOS4zelwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNMzIuNiwyNC43aDUuNnY3LjhoLTUuNlYyNC43eiBNMjUuOCwyNC43aDUuNnY3LjhoLTUuNlYyNC43eiBNNDQuOSw0NkgxOS4xVjE4aDUuNnYyMi40aDE0LjYgdi0xLjFIMjUuOHYtNS42aDE5VjQ2eiBNNDQuOSwzMi42aC01LjZWMThoNS42VjMyLjZ6XCIsXG4gICAgXCJjb2xvclwiOiBcIiMxQjg3OTNcIlxuICB9LFxuICBcImJlaGFuY2VcIjoge1xuICAgIFwiaWNvblwiOiBcIk0yOS4xLDMxYzAuOC0wLjQsMS41LTAuOSwxLjktMS41YzAuNC0wLjYsMC42LTEuNCwwLjYtMi4zYzAtMC45LTAuMS0xLjYtMC40LTIuMiBjLTAuMy0wLjYtMC43LTEuMS0xLjItMS40Yy0wLjUtMC40LTEuMS0wLjYtMS45LTAuOGMtMC43LTAuMi0xLjUtMC4yLTIuNC0wLjJIMTd2MTguNWg4LjljMC44LDAsMS42LTAuMSwyLjQtMC4zIGMwLjgtMC4yLDEuNS0wLjUsMi4xLTFjMC42LTAuNCwxLjEtMSwxLjUtMS43YzAuNC0wLjcsMC41LTEuNSwwLjUtMi40YzAtMS4yLTAuMy0yLjEtMC44LTNDMzEuMSwzMS45LDMwLjIsMzEuMywyOS4xLDMxeiAgTTIxLjEsMjUuN2gzLjhjMC40LDAsMC43LDAsMSwwLjFjMC4zLDAuMSwwLjYsMC4yLDAuOSwwLjNjMC4zLDAuMiwwLjUsMC40LDAuNiwwLjZjMC4yLDAuMywwLjIsMC42LDAuMiwxLjFjMCwwLjgtMC4yLDEuMy0wLjcsMS43IGMtMC41LDAuMy0xLjEsMC41LTEuOCwwLjVoLTQuMVYyNS43eiBNMjguMiwzNi43Yy0wLjIsMC4zLTAuNCwwLjYtMC43LDAuN2MtMC4zLDAuMi0wLjYsMC4zLTEsMC40Yy0wLjQsMC4xLTAuNywwLjEtMS4xLDAuMWgtNC4zIHYtNS4xaDQuNGMwLjksMCwxLjYsMC4yLDIuMSwwLjZjMC41LDAuNCwwLjgsMS4xLDAuOCwyQzI4LjQsMzYsMjguMywzNi40LDI4LjIsMzYuN3ogTTQ2LjcsMzIuM2MtMC4yLTAuOS0wLjYtMS44LTEuMi0yLjUgQzQ1LDI5LDQ0LjMsMjguNCw0My41LDI4Yy0wLjgtMC40LTEuOC0wLjctMy0wLjdjLTEsMC0xLjksMC4yLTIuOCwwLjVjLTAuOCwwLjQtMS42LDAuOS0yLjIsMS41Yy0wLjYsMC42LTEuMSwxLjQtMS40LDIuMiBjLTAuMywwLjktMC41LDEuOC0wLjUsMi44YzAsMSwwLjIsMiwwLjUsMi44YzAuMywwLjksMC44LDEuNiwxLjQsMi4yYzAuNiwwLjYsMS4zLDEuMSwyLjIsMS40YzAuOSwwLjMsMS44LDAuNSwyLjksMC41IGMxLjUsMCwyLjgtMC4zLDMuOS0xYzEuMS0wLjcsMS45LTEuOCwyLjQtMy40aC0zLjJjLTAuMSwwLjQtMC40LDAuOC0xLDEuMmMtMC41LDAuNC0xLjIsMC42LTEuOSwwLjZjLTEsMC0xLjgtMC4zLTIuNC0wLjggYy0wLjYtMC41LTAuOS0xLjUtMC45LTIuNkg0N0M0NywzNC4yLDQ3LDMzLjIsNDYuNywzMi4zeiBNMzcuMywzMi45YzAtMC4zLDAuMS0wLjYsMC4yLTAuOWMwLjEtMC4zLDAuMy0wLjYsMC41LTAuOSBjMC4yLTAuMywwLjUtMC41LDAuOS0wLjdjMC40LTAuMiwwLjktMC4zLDEuNS0wLjNjMC45LDAsMS42LDAuMywyLjEsMC43YzAuNCwwLjUsMC44LDEuMiwwLjgsMi4xSDM3LjN6IE00NC4xLDIzLjhoLTcuNXYxLjhoNy41IFYyMy44elwiLFxuICAgIFwibWFza1wiOiBcIk00MC40LDMwLjFjLTAuNiwwLTEuMSwwLjEtMS41LDAuM2MtMC40LDAuMi0wLjcsMC40LTAuOSwwLjdjLTAuMiwwLjMtMC40LDAuNi0wLjUsMC45Yy0wLjEsMC4zLTAuMiwwLjYtMC4yLDAuOSBoNmMtMC4xLTAuOS0wLjQtMS42LTAuOC0yLjFDNDIsMzAuMyw0MS4zLDMwLjEsNDAuNCwzMC4xeiBNMjUuNSwzMi44aC00LjR2NS4xaDQuM2MwLjQsMCwwLjgsMCwxLjEtMC4xYzAuNC0wLjEsMC43LTAuMiwxLTAuNCBjMC4zLTAuMiwwLjUtMC40LDAuNy0wLjdjMC4yLTAuMywwLjItMC43LDAuMi0xLjJjMC0xLTAuMy0xLjYtMC44LTJDMjcuMSwzMywyNi40LDMyLjgsMjUuNSwzMi44eiBNMjcsMjkuNSBjMC41LTAuMywwLjctMC45LDAuNy0xLjdjMC0wLjQtMC4xLTAuOC0wLjItMS4xYy0wLjItMC4zLTAuNC0wLjUtMC42LTAuNmMtMC4zLTAuMi0wLjYtMC4zLTAuOS0wLjNjLTAuMy0wLjEtMC43LTAuMS0xLTAuMWgtMy44IHY0LjNoNC4xQzI1LjksMzAuMSwyNi41LDI5LjksMjcsMjkuNXogTTAsMHY2NGg2NFYwSDB6IE0zNi42LDIzLjhoNy41djEuOGgtNy41VjIzLjh6IE0zMS45LDM4LjFjLTAuNCwwLjctMC45LDEuMi0xLjUsMS43IGMtMC42LDAuNC0xLjMsMC44LTIuMSwxYy0wLjgsMC4yLTEuNiwwLjMtMi40LDAuM0gxN1YyMi42aDguN2MwLjksMCwxLjcsMC4xLDIuNCwwLjJjMC43LDAuMiwxLjMsMC40LDEuOSwwLjggYzAuNSwwLjQsMC45LDAuOCwxLjIsMS40YzAuMywwLjYsMC40LDEuMywwLjQsMi4yYzAsMC45LTAuMiwxLjctMC42LDIuM2MtMC40LDAuNi0xLDEuMS0xLjksMS41YzEuMSwwLjMsMiwwLjksMi41LDEuNyBjMC42LDAuOCwwLjgsMS44LDAuOCwzQzMyLjUsMzYuNiwzMi4zLDM3LjQsMzEuOSwzOC4xeiBNNDcsMzUuM2gtOS42YzAsMS4xLDAuNCwyLjEsMC45LDIuNmMwLjUsMC41LDEuMywwLjgsMi40LDAuOCBjMC43LDAsMS40LTAuMiwxLjktMC42YzAuNS0wLjQsMC45LTAuOCwxLTEuMmgzLjJjLTAuNSwxLjYtMS4zLDIuOC0yLjQsMy40Yy0xLjEsMC43LTIuNCwxLTMuOSwxYy0xLjEsMC0yLTAuMi0yLjktMC41IGMtMC44LTAuMy0xLjYtMC44LTIuMi0xLjRjLTAuNi0wLjYtMS0xLjQtMS40LTIuMmMtMC4zLTAuOS0wLjUtMS44LTAuNS0yLjhjMC0xLDAuMi0xLjksMC41LTIuOGMwLjMtMC45LDAuOC0xLjYsMS40LTIuMiBjMC42LTAuNiwxLjMtMS4xLDIuMi0xLjVjMC44LTAuNCwxLjgtMC41LDIuOC0wLjVjMS4xLDAsMi4xLDAuMiwzLDAuN2MwLjgsMC40LDEuNSwxLDIuMSwxLjhjMC41LDAuNywwLjksMS42LDEuMiwyLjUgQzQ3LDMzLjIsNDcsMzQuMiw0NywzNS4zelwiLFxuICAgIFwiY29sb3JcIjogXCIjMDA3Q0ZGXCJcbiAgfSxcbiAgXCJjb2RlcGVuXCI6IHtcbiAgICBcImljb25cIjogXCJNMjQuNCwzNWw2LjgsNC41di00TDI3LjQsMzNMMjQuNCwzNXogTTIzLjgsMzAuNnYyLjdsMi4xLTEuNEwyMy44LDMwLjZ6IE0zMS4yLDI4LjV2LTRMMjQuNCwyOSBsMywyTDMxLjIsMjguNXogTTM5LjYsMjlsLTYuOC00LjV2NGwzLjcsMi41TDM5LjYsMjl6IE0zMiwzMGwtMywybDMsMmwzLTJMMzIsMzB6IE0zMiwxNmMtOC44LDAtMTYsNy4yLTE2LDE2YzAsOC44LDcuMiwxNiwxNiwxNiBzMTYtNy4yLDE2LTE2QzQ4LDIzLjIsNDAuOCwxNiwzMiwxNnogTTQxLjksMzUuMWMwLDAuMy0wLjEsMC42LTAuNCwwLjdsLTkuMSw1LjljLTAuMywwLjItMC42LDAuMi0wLjksMGwtOS4xLTUuOSBjLTAuMi0wLjItMC40LTAuNC0wLjQtMC43di02LjJjMC0wLjMsMC4xLTAuNiwwLjQtMC43bDkuMS01LjljMC4zLTAuMiwwLjYtMC4yLDAuOSwwbDkuMSw1LjljMC4yLDAuMiwwLjQsMC40LDAuNCwwLjdWMzUuMXogIE0zMi44LDM1LjV2NGw2LjgtNC41bC0zLTJMMzIuOCwzNS41eiBNNDAuMiwzMy40di0yLjdMMzguMSwzMkw0MC4yLDMzLjR6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE0zMiw0OGMtOC44LDAtMTYtNy4yLTE2LTE2YzAtOC44LDcuMi0xNiwxNi0xNnMxNiw3LjIsMTYsMTZDNDgsNDAuOCw0MC44LDQ4LDMyLDQ4eiBNMzIuNSwyMi4zIGMtMC4zLTAuMi0wLjYtMC4yLTAuOSwwbC05LjEsNS45Yy0wLjIsMC4yLTAuNCwwLjQtMC40LDAuN3Y2LjJjMCwwLjMsMC4xLDAuNiwwLjQsMC43bDkuMSw1LjljMC4zLDAuMiwwLjYsMC4yLDAuOSwwbDkuMS01LjkgYzAuMi0wLjIsMC40LTAuNCwwLjQtMC43di02LjJjMC0wLjMtMC4xLTAuNi0wLjQtMC43TDMyLjUsMjIuM3ogTTMyLjgsMjQuNWw2LjgsNC41bC0zLDJsLTMuNy0yLjVWMjQuNXogTTMxLjIsMjQuNXY0TDI3LjQsMzFsLTMtMiBMMzEuMiwyNC41eiBNMjMuOCwzMC42bDIuMSwxLjRsLTIuMSwxLjRWMzAuNnogTTMxLjIsMzkuNUwyNC40LDM1bDMtMmwzLjcsMi41VjM5LjV6IE0zMiwzNGwtMy0ybDMtMmwzLDJMMzIsMzR6IE0zMi44LDM5LjV2LTQgbDMuNy0yLjVsMywyTDMyLjgsMzkuNXogTTQwLjIsMzMuNEwzOC4xLDMybDIuMS0xLjRWMzMuNHpcIixcbiAgICBcImNvbG9yXCI6IFwiIyMxNTE1MTVcIlxuICB9LFxuICBcImRyaWJiYmxlXCI6IHtcbiAgICBcImljb25cIjogXCJNMzIsNDhjLTguOCwwLTE2LTcuMi0xNi0xNnM3LjItMTYsMTYtMTYgczE2LDcuMiwxNiwxNlM0MC44LDQ4LDMyLDQ4eiBNNDUuNSwzNC4yQzQ1LDM0LDQxLjMsMzIuOSwzNywzMy42YzEuOCw0LjksMi41LDguOSwyLjcsOS43QzQyLjcsNDEuMyw0NC45LDM4LDQ1LjUsMzQuMnogTTM3LjMsNDQuNiBjLTAuMi0xLjItMS01LjQtMi45LTEwLjRjMCwwLTAuMSwwLTAuMSwwYy03LjcsMi43LTEwLjUsOC0xMC43LDguNWMyLjMsMS44LDUuMiwyLjksOC40LDIuOUMzMy45LDQ1LjcsMzUuNyw0NS4zLDM3LjMsNDQuNnogIE0yMS44LDQxLjJjMC4zLTAuNSw0LjEtNi43LDExLjEtOWMwLjItMC4xLDAuNC0wLjEsMC41LTAuMmMtMC4zLTAuOC0wLjctMS42LTEuMS0yLjNjLTYuOCwyLTEzLjQsMi0xNCwxLjljMCwwLjEsMCwwLjMsMCwwLjQgQzE4LjMsMzUuNSwxOS43LDM4LjcsMjEuOCw0MS4yeiBNMTguNiwyOS4yYzAuNiwwLDYuMiwwLDEyLjYtMS43Yy0yLjMtNC00LjctNy40LTUuMS03LjlDMjIuNCwyMS41LDE5LjUsMjUsMTguNiwyOS4yeiBNMjguOCwxOC43IGMwLjQsMC41LDIuOSwzLjksNS4xLDhjNC45LTEuOCw2LjktNC42LDcuMi00LjljLTIuNC0yLjEtNS42LTMuNC05LjEtMy40QzMwLjksMTguNCwyOS44LDE4LjUsMjguOCwxOC43eiBNNDIuNiwyMy40IGMtMC4zLDAuNC0yLjYsMy4zLTcuNiw1LjRjMC4zLDAuNywwLjYsMS4zLDAuOSwyYzAuMSwwLjIsMC4yLDAuNSwwLjMsMC43YzQuNS0wLjYsOS4xLDAuMyw5LjUsMC40QzQ1LjYsMjguNyw0NC41LDI1LjcsNDIuNiwyMy40elwiLFxuICAgIFwibWFza1wiOiBcIk0zNC4zLDM0LjNjLTcuNywyLjctMTAuNSw4LTEwLjcsOC41YzIuMywxLjgsNS4yLDIuOSw4LjQsMi45YzEuOSwwLDMuNy0wLjQsNS4zLTEuMSBDMzcuMSw0My40LDM2LjMsMzkuMiwzNC4zLDM0LjNDMzQuNCwzNC4yLDM0LjQsMzQuMywzNC4zLDM0LjN6IE0zMS4zLDI3LjZjLTIuMy00LTQuNy03LjQtNS4xLTcuOWMtMy44LDEuOC02LjcsNS4zLTcuNiw5LjYgQzE5LjIsMjkuMiwyNC45LDI5LjMsMzEuMywyNy42eiBNMzMsMzIuMWMwLjItMC4xLDAuNC0wLjEsMC41LTAuMmMtMC4zLTAuOC0wLjctMS42LTEuMS0yLjNjLTYuOCwyLTEzLjQsMi0xNCwxLjkgYzAsMC4xLDAsMC4zLDAsMC40YzAsMy41LDEuMyw2LjcsMy41LDkuMUMyMi4yLDQwLjYsMjUuOSwzNC40LDMzLDMyLjF6IE00MS4xLDIxLjhjLTIuNC0yLjEtNS42LTMuNC05LjEtMy40IGMtMS4xLDAtMi4yLDAuMS0zLjIsMC40YzAuNCwwLjUsMi45LDMuOSw1LjEsOEMzOC44LDI0LjksNDAuOCwyMi4xLDQxLjEsMjEuOHogTTM0LjksMjguOGMwLjMsMC43LDAuNiwxLjMsMC45LDIgYzAuMSwwLjIsMC4yLDAuNSwwLjMsMC43YzQuNS0wLjYsOS4xLDAuMyw5LjUsMC40YzAtMy4yLTEuMi02LjItMy4xLTguNUM0Mi4zLDIzLjgsNDAsMjYuNywzNC45LDI4Ljh6IE0zNywzMy42IGMxLjgsNC45LDIuNSw4LjksMi43LDkuN2MzLjEtMi4xLDUuMi01LjQsNS45LTkuMkM0NSwzNCw0MS4zLDMyLjksMzcsMzMuNnogTTAsMHY2NGg2NFYwSDB6IE0zMiw0OGMtOC44LDAtMTYtNy4yLTE2LTE2IHM3LjItMTYsMTYtMTZzMTYsNy4yLDE2LDE2UzQwLjgsNDgsMzIsNDh6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNlYTRjODlcIlxuICB9LFxuICBcImRyb3Bib3hcIjoge1xuICAgIFwiaWNvblwiOiBcIk0yNS40LDE3LjFMMTYsMjMuM2w2LjUsNS4ybDkuNS01LjlMMjUuNCwxNy4xeiBNMTYsMzMuN2w5LjQsNi4xbDYuNi01LjVsLTkuNS01LjlMMTYsMzMuN3ogIE0zMiwzNC4zbDYuNiw1LjVsOS40LTYuMWwtNi41LTUuMkwzMiwzNC4zeiBNNDgsMjMuM2wtOS40LTYuMUwzMiwyMi42bDkuNSw1LjlMNDgsMjMuM3ogTTMyLDM1LjVMMjUuNCw0MWwtMi44LTEuOHYyLjFsOS40LDUuNyBsOS40LTUuN3YtMi4xTDM4LjYsNDFMMzIsMzUuNXpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTQxLjUsNDEuMkwzMiw0Ni45bC05LjQtNS43di0yLjFsMi44LDEuOGw2LjYtNS41bDYuNiw1LjVsMi44LTEuOFY0MS4yeiBNNDgsMzMuN2wtOS40LDYuMSBMMzIsMzQuM2wtNi42LDUuNUwxNiwzMy43bDYuNS01LjJMMTYsMjMuM2w5LjQtNi4xbDYuNiw1LjVsNi42LTUuNWw5LjQsNi4xbC02LjUsNS4yTDQ4LDMzLjd6IE0yMi41LDI4LjVsOS41LDUuOWw5LjUtNS45TDMyLDIyLjYgTDIyLjUsMjguNXpcIixcbiAgICBcImNvbG9yXCI6IFwiIzEwODFERVwiXG4gIH0sXG4gIFwiZW1haWxcIjoge1xuICAgIFwiaWNvblwiOiBcIk0xNywyMnYyMGgzMFYyMkgxN3ogTTQxLjEsMjVMMzIsMzIuMUwyMi45LDI1SDQxLjF6IE0yMCwzOVYyNi42bDEyLDkuM2wxMi05LjNWMzlIMjB6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTQxLjEsMjVIMjIuOWw5LjEsNy4xTDQxLjEsMjV6IE00NCwyNi42bC0xMiw5LjNsLTEyLTkuM1YzOWgyNFYyNi42eiBNMCwwdjY0aDY0VjBIMHogTTQ3LDQySDE3VjIyaDMwVjQyelwiLFxuICAgIFwiY29sb3JcIjogXCIjN2Y3ZjdmXCJcbiAgfSxcbiAgXCJmYWNlYm9va1wiOiB7XG4gICAgXCJpY29uXCI6IFwiTTM0LjEsNDdWMzMuM2g0LjZsMC43LTUuM2gtNS4zdi0zLjRjMC0xLjUsMC40LTIuNiwyLjYtMi42bDIuOCwwdi00LjhjLTAuNS0wLjEtMi4yLTAuMi00LjEtMC4yIGMtNC4xLDAtNi45LDIuNS02LjksN1YyOEgyNHY1LjNoNC42VjQ3SDM0LjF6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE0zOS42LDIybC0yLjgsMGMtMi4yLDAtMi42LDEuMS0yLjYsMi42VjI4aDUuM2wtMC43LDUuM2gtNC42VjQ3aC01LjVWMzMuM0gyNFYyOGg0LjZWMjQgYzAtNC42LDIuOC03LDYuOS03YzIsMCwzLjYsMC4xLDQuMSwwLjJWMjJ6XCIsXG4gICAgXCJjb2xvclwiOiBcIiMzYjU5OThcIlxuICB9LFxuICBcImZsaWNrclwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTMyLDE2Yy04LjgsMC0xNiw3LjItMTYsMTZzNy4yLDE2LDE2LDE2czE2LTcuMiwxNi0xNlM0MC44LDE2LDMyLDE2eiBNMjYsMzdjLTIuOCwwLTUtMi4yLTUtNSBzMi4yLTUsNS01czUsMi4yLDUsNVMyOC44LDM3LDI2LDM3eiBNMzgsMzdjLTIuOCwwLTUtMi4yLTUtNXMyLjItNSw1LTVzNSwyLjIsNSw1UzQwLjgsMzcsMzgsMzd6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTM4LDI3Yy0yLjgsMC01LDIuMi01LDVzMi4yLDUsNSw1czUtMi4yLDUtNVM0MC44LDI3LDM4LDI3eiBNMCwwdjY0aDY0VjBIMHogTTMyLDQ4Yy04LjgsMC0xNi03LjItMTYtMTYgczcuMi0xNiwxNi0xNnMxNiw3LjIsMTYsMTZTNDAuOCw0OCwzMiw0OHogTTI2LDI3Yy0yLjgsMC01LDIuMi01LDVzMi4yLDUsNSw1czUtMi4yLDUtNVMyOC44LDI3LDI2LDI3elwiLFxuICAgIFwiY29sb3JcIjogXCIjMDA2M2RiXCJcbiAgfSxcbiAgXCJmb3Vyc3F1YXJlXCI6IHtcbiAgICBcImljb25cIjogXCJNNDEuNSwxN2MwLDAtMTQuMywwLTE2LjUsMGMtMi4zLDAtMywxLjctMywyLjhjMCwxLjEsMCwyNi4zLDAsMjYuM2MwLDEuMiwwLjcsMS43LDEsMS44IGMwLjQsMC4xLDEuNCwwLjMsMi0wLjRjMCwwLDcuOC05LjEsNy45LTkuMmMwLjItMC4yLDAuMi0wLjIsMC40LTAuMmMwLjQsMCwzLjQsMCw1LjEsMGMyLjEsMCwyLjUtMS41LDIuNy0yLjQgYzAuMi0wLjcsMi4zLTExLjMsMi45LTE0LjdDNDQuNiwxOC40LDQzLjksMTcsNDEuNSwxN3ogTTQxLjEsMzUuN2MwLjItMC43LDIuMy0xMS4zLDIuOS0xNC43IE00MC41LDIxLjVsLTAuNywzLjYgYy0wLjEsMC40LTAuNiwwLjgtMSwwLjhjLTAuNSwwLTYuNCwwLTYuNCwwYy0wLjcsMC0xLjIsMC41LTEuMiwxLjJ2MC44YzAsMC43LDAuNSwxLjIsMS4yLDEuMmMwLDAsNSwwLDUuNSwwYzAuNSwwLDEsMC42LDAuOSwxLjEgYy0wLjEsMC41LTAuNiwzLjMtMC43LDMuNmMtMC4xLDAuMy0wLjQsMC44LTEsMC44Yy0wLjUsMC00LjUsMC00LjUsMGMtMC44LDAtMS4xLDAuMS0xLjYsMC44Yy0wLjUsMC43LTUuNCw2LjUtNS40LDYuNSBjMCwwLjEtMC4xLDAtMC4xLDBWMjEuNGMwLTAuNSwwLjQtMSwxLTFjMCwwLDEyLjgsMCwxMy4zLDBDNDAuMiwyMC40LDQwLjYsMjAuOSw0MC41LDIxLjV6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTM5LjcsMjAuNGMtMC41LDAtMTMuMywwLTEzLjMsMGMtMC42LDAtMSwwLjUtMSwxdjIwLjVjMCwwLjEsMCwwLjEsMC4xLDBjMCwwLDQuOS01LjksNS40LTYuNSBjMC41LTAuNywwLjgtMC44LDEuNi0wLjhjMCwwLDMuOSwwLDQuNSwwYzAuNiwwLDEtMC41LDEtMC44YzAuMS0wLjMsMC42LTMsMC43LTMuNmMwLjEtMC41LTAuNC0xLjEtMC45LTEuMWMtMC41LDAtNS41LDAtNS41LDAgYy0wLjcsMC0xLjItMC41LTEuMi0xLjJ2LTAuOGMwLTAuNywwLjUtMS4yLDEuMi0xLjJjMCwwLDYsMCw2LjQsMGMwLjUsMCwwLjktMC40LDEtMC44bDAuNy0zLjZDNDAuNiwyMC45LDQwLjIsMjAuNCwzOS43LDIwLjR6ICBNMCwwdjY0aDY0VjBIMHogTTQ0LDIwLjlsLTEsNS4yYy0wLjgsNC4yLTEuOCw5LTEuOSw5LjVjLTAuMiwwLjktMC42LDIuNC0yLjcsMi40aC01LjFjLTAuMiwwLTAuMiwwLTAuNCwwLjIgYy0wLjEsMC4xLTcuOSw5LjItNy45LDkuMmMtMC42LDAuNy0xLjYsMC42LTIsMC40Yy0wLjQtMC4xLTEtMC42LTEtMS44YzAsMCwwLTI1LjIsMC0yNi4zYzAtMS4xLDAuNy0yLjgsMy0yLjhjMi4zLDAsMTYuNSwwLDE2LjUsMCBDNDMuOSwxNyw0NC42LDE4LjQsNDQsMjAuOXpcIixcbiAgICBcImNvbG9yXCI6IFwiIzAwNzJiMVwiXG4gIH0sXG4gIFwiZ2l0aHViXCI6IHtcbiAgICBcImljb25cIjogXCJNMzIsMTZjLTguOCwwLTE2LDcuMi0xNiwxNmMwLDcuMSw0LjYsMTMuMSwxMC45LDE1LjIgYzAuOCwwLjEsMS4xLTAuMywxLjEtMC44YzAtMC40LDAtMS40LDAtMi43Yy00LjUsMS01LjQtMi4xLTUuNC0yLjFjLTAuNy0xLjgtMS44LTIuMy0xLjgtMi4zYy0xLjUtMSwwLjEtMSwwLjEtMSBjMS42LDAuMSwyLjUsMS42LDIuNSwxLjZjMS40LDIuNCwzLjcsMS43LDQuNywxLjNjMC4xLTEsMC42LTEuNywxLTIuMWMtMy42LTAuNC03LjMtMS44LTcuMy03LjljMC0xLjcsMC42LTMuMiwxLjYtNC4zIGMtMC4yLTAuNC0wLjctMiwwLjItNC4yYzAsMCwxLjMtMC40LDQuNCwxLjZjMS4zLTAuNCwyLjYtMC41LDQtMC41YzEuNCwwLDIuNywwLjIsNCwwLjVjMy4xLTIuMSw0LjQtMS42LDQuNC0xLjYgYzAuOSwyLjIsMC4zLDMuOCwwLjIsNC4yYzEsMS4xLDEuNiwyLjUsMS42LDQuM2MwLDYuMS0zLjcsNy41LTcuMyw3LjljMC42LDAuNSwxLjEsMS41LDEuMSwzYzAsMi4xLDAsMy45LDAsNC40IGMwLDAuNCwwLjMsMC45LDEuMSwwLjhDNDMuNCw0NS4xLDQ4LDM5LjEsNDgsMzJDNDgsMjMuMiw0MC44LDE2LDMyLDE2elwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNMzcuMSw0Ny4yYy0wLjgsMC4yLTEuMS0wLjMtMS4xLTAuOGMwLTAuNSwwLTIuMywwLTQuNGMwLTEuNS0wLjUtMi41LTEuMS0zIGMzLjYtMC40LDcuMy0xLjcsNy4zLTcuOWMwLTEuNy0wLjYtMy4yLTEuNi00LjNjMC4yLTAuNCwwLjctMi0wLjItNC4yYzAsMC0xLjMtMC40LTQuNCwxLjZjLTEuMy0wLjQtMi42LTAuNS00LTAuNSBjLTEuNCwwLTIuNywwLjItNCwwLjVjLTMuMS0yLjEtNC40LTEuNi00LjQtMS42Yy0wLjksMi4yLTAuMywzLjgtMC4yLDQuMmMtMSwxLjEtMS42LDIuNS0xLjYsNC4zYzAsNi4xLDMuNyw3LjUsNy4zLDcuOSBjLTAuNSwwLjQtMC45LDEuMS0xLDIuMWMtMC45LDAuNC0zLjIsMS4xLTQuNy0xLjNjMCwwLTAuOC0xLjUtMi41LTEuNmMwLDAtMS42LDAtMC4xLDFjMCwwLDEsMC41LDEuOCwyLjNjMCwwLDAuOSwzLjEsNS40LDIuMSBjMCwxLjMsMCwyLjMsMCwyLjdjMCwwLjQtMC4zLDAuOS0xLjEsMC44QzIwLjYsNDUuMSwxNiwzOS4xLDE2LDMyYzAtOC44LDcuMi0xNiwxNi0xNmM4LjgsMCwxNiw3LjIsMTYsMTYgQzQ4LDM5LjEsNDMuNCw0NS4xLDM3LjEsNDcuMnpcIixcbiAgICBcImNvbG9yXCI6IFwiIzQxODNjNFwiXG4gIH0sXG4gIFwiZ29vZ2xlX3BsYXlcIjoge1xuICAgIFwiaWNvblwiOiBcIk0yNC40LDQ1LjZsMTYtOC44bC0zLjYtMy42TDI0LjQsNDUuNnogTTIyLjIsMTguNWMtMC4xLDAuMi0wLjIsMC41LTAuMiwwLjl2MjUuMSBjMCwwLjQsMC4xLDAuNiwwLjIsMC45TDM1LjYsMzJMMjIuMiwxOC41eiBNNDcuMSwzMC44TDQyLjEsMjhMMzguMSwzMmw0LDRsNS0yLjhDNDguMywzMi41LDQ4LjMsMzEuNCw0Ny4xLDMwLjh6IE00MC40LDI3LjEgbC0xNS45LTguOGwxMi4zLDEyLjNMNDAuNCwyNy4xelwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNNDAuNCwyNy4xbC0zLjYsMy42TDI0LjUsMTguNEw0MC40LDI3LjF6IE0yMiw0NC41VjE5LjRjMC0wLjQsMC4xLTAuNywwLjItMC45TDM1LjYsMzIgTDIyLjIsNDUuNEMyMi4xLDQ1LjIsMjIsNDQuOSwyMiw0NC41eiBNMjQuNCw0NS42bDEyLjQtMTIuNGwzLjYsMy42TDI0LjQsNDUuNnogTTQ3LjEsMzMuMmwtNSwyLjhsLTQtNGwzLjktMy45bDUuMSwyLjggQzQ4LjMsMzEuNCw0OC4zLDMyLjUsNDcuMSwzMy4yelwiLFxuICAgIFwiY29sb3JcIjogXCIjNDBCQkMxXCJcbiAgfSxcbiAgXCJnb29nbGVcIjoge1xuICAgIFwiaWNvblwiOiBcIk0zNS40LDE3aC04Yy0xLjEsMC0yLjIsMC4xLTMuNCwwLjQgYy0xLjIsMC4zLTIuNCwwLjktMy41LDEuOGMtMS43LDEuNi0yLjUsMy40LTIuNSw1LjRjMCwxLjYsMC42LDMuMSwxLjgsNC4zYzEuMSwxLjMsMi43LDIsNC45LDJjMC40LDAsMC44LDAsMS4zLTAuMSBjLTAuMSwwLjItMC4yLDAuNC0wLjIsMC43Yy0wLjEsMC4yLTAuMiwwLjUtMC4yLDAuOWMwLDAuNiwwLjEsMS4xLDAuNCwxLjVjMC4yLDAuNCwwLjUsMC44LDAuOCwxLjJjLTAuOSwwLTIuMSwwLjEtMy41LDAuNCBjLTEuNCwwLjItMi44LDAuNy00LjEsMS41Yy0xLjIsMC43LTEuOSwxLjUtMi40LDIuNGMtMC41LDAuOS0wLjcsMS43LTAuNywyLjVjMCwxLjUsMC43LDIuOCwyLjEsMy45YzEuNCwxLjIsMy41LDEuOCw2LjMsMS44IGMzLjMtMC4xLDUuOS0wLjksNy43LTIuNGMxLjctMS41LDIuNi0zLjIsMi42LTUuMmMwLTEuNC0wLjMtMi41LTAuOS0zLjNjLTAuNi0wLjgtMS40LTEuNi0yLjItMi4zbC0xLjQtMS4xIGMtMC4yLTAuMi0wLjQtMC40LTAuNi0wLjdjLTAuMi0wLjMtMC40LTAuNi0wLjQtMWMwLTAuNCwwLjEtMC44LDAuNC0xLjFjMC4yLTAuMywwLjQtMC42LDAuNy0wLjhjMC40LTAuNCwwLjgtMC43LDEuMi0xLjEgYzAuMy0wLjQsMC42LTAuNywwLjktMS4yYzAuNi0wLjksMC45LTIsMC45LTMuNGMwLTAuOC0wLjEtMS41LTAuMy0yLjFjLTAuMi0wLjYtMC41LTEuMS0wLjctMS41Yy0wLjMtMC41LTAuNi0wLjgtMC45LTEuMiBjLTAuMy0wLjMtMC42LTAuNS0wLjgtMC43SDMzTDM1LjQsMTd6IE0zMSwzOC45YzAuNywwLjgsMSwxLjYsMSwyLjdjMCwxLjMtMC41LDIuMy0xLjUsMy4xYy0xLDAuOC0yLjQsMS4yLTQuMywxLjMgYy0yLjEsMC0zLjgtMC41LTUtMS40Yy0xLjMtMC45LTEuOS0yLjEtMS45LTMuNWMwLTAuNywwLjEtMS4zLDAuNC0xLjhjMC4zLTAuNSwwLjYtMC45LDAuOS0xLjJjMC40LTAuMywwLjgtMC42LDEuMS0wLjcgYzAuNC0wLjIsMC43LTAuMywwLjktMC40YzAuOS0wLjMsMS43LTAuNSwyLjUtMC42YzAuOC0wLjEsMS40LTAuMSwxLjYtMC4xYzAuMywwLDAuNiwwLDAuOSwwQzI5LjIsMzcuMywzMC4zLDM4LjIsMzEsMzguOXogIE0yOS43LDI3LjFjLTAuMSwwLjUtMC4zLDEuMS0wLjcsMS42Yy0wLjcsMC43LTEuNiwxLjEtMi42LDEuMWMtMC44LDAtMS42LTAuMy0yLjItMC44Yy0wLjYtMC41LTEuMi0xLjEtMS42LTEuOSBjLTAuOC0xLjYtMS4zLTMuMS0xLjMtNC41YzAtMS4xLDAuMy0yLjEsMC45LTNjMC43LTAuOSwxLjYtMS4zLDIuNy0xLjNjMC44LDAsMS41LDAuMywyLjIsMC43YzAuNiwwLjUsMS4xLDEuMSwxLjUsMS45IGMwLjgsMS42LDEuMiwzLjIsMS4yLDQuOEMyOS44LDI2LjEsMjkuOCwyNi41LDI5LjcsMjcuMXogTTQzLjcsMjkuNXYtNC4zaC0yLjV2NC4zSDM3VjMyaDQuMnY0LjJoMi41VjMySDQ4di0yLjVINDMuN3pcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTMxLjMsMTkuMWMwLjMsMC4zLDAuNiwwLjcsMC45LDEuMmMwLjMsMC40LDAuNSwwLjksMC43LDEuNWMwLjIsMC42LDAuMywxLjMsMC4zLDIuMSBjMCwxLjQtMC4zLDIuNi0wLjksMy40Yy0wLjMsMC40LTAuNiwwLjgtMC45LDEuMmMtMC40LDAuNC0wLjgsMC43LTEuMiwxLjFjLTAuMiwwLjItMC41LDAuNS0wLjcsMC44Yy0wLjIsMC4zLTAuNCwwLjctMC40LDEuMSBjMCwwLjQsMC4xLDAuOCwwLjQsMWMwLjIsMC4zLDAuNCwwLjUsMC42LDAuN2wxLjQsMS4xYzAuOCwwLjcsMS42LDEuNSwyLjIsMi4zYzAuNiwwLjgsMC45LDIsMC45LDMuM2MwLDEuOS0wLjksMy43LTIuNiw1LjIgYy0xLjgsMS42LTQuMywyLjQtNy43LDIuNGMtMi44LDAtNC45LTAuNi02LjMtMS44Yy0xLjQtMS4xLTIuMS0yLjQtMi4xLTMuOWMwLTAuNywwLjItMS42LDAuNy0yLjVjMC40LTAuOSwxLjItMS43LDIuNC0yLjQgYzEuMy0wLjcsMi43LTEuMiw0LjEtMS41YzEuNC0wLjIsMi42LTAuMywzLjUtMC40Yy0wLjMtMC40LTAuNS0wLjgtMC44LTEuMmMtMC4zLTAuNC0wLjQtMC45LTAuNC0xLjVjMC0wLjQsMC0wLjYsMC4yLTAuOSBjMC4xLTAuMiwwLjItMC41LDAuMi0wLjdjLTAuNSwwLjEtMC45LDAuMS0xLjMsMC4xYy0yLjEsMC0zLjgtMC43LTQuOS0yYy0xLjItMS4yLTEuOC0yLjctMS44LTQuM2MwLTIsMC44LTMuOCwyLjUtNS40IGMxLjEtMC45LDIuMy0xLjYsMy41LTEuOGMxLjItMC4yLDIuMy0wLjQsMy40LTAuNGg4TDMzLDE4LjRoLTIuNUMzMC43LDE4LjYsMzEsMTguOCwzMS4zLDE5LjF6IE00OCwzMmgtNC4zdjQuMmgtMi41VjMySDM3di0yLjUgaDQuMnYtNC4zaDIuNXY0LjNINDhWMzJ6IE0yNy4xLDE5LjFjLTAuNi0wLjUtMS40LTAuNy0yLjItMC43Yy0xLjEsMC0yLDAuNS0yLjcsMS4zYy0wLjYsMC45LTAuOSwxLjktMC45LDNjMCwxLjUsMC40LDMsMS4zLDQuNSBjMC40LDAuNywwLjksMS40LDEuNiwxLjljMC42LDAuNSwxLjQsMC44LDIuMiwwLjhjMS4xLDAsMS45LTAuNCwyLjYtMS4xYzAuMy0wLjUsMC42LTEsMC43LTEuNmMwLjEtMC41LDAuMS0xLDAuMS0xLjQgYzAtMS42LTAuNC0zLjItMS4yLTQuOEMyOC4yLDIwLjIsMjcuNywxOS41LDI3LjEsMTkuMXogTTI2LjksMzYuMmMtMC4yLDAtMC43LDAtMS42LDAuMWMtMC44LDAuMS0xLjcsMC4zLTIuNSwwLjYgYy0wLjIsMC4xLTAuNSwwLjItMC45LDAuNGMtMC40LDAuMi0wLjcsMC40LTEuMSwwLjdjLTAuNCwwLjMtMC43LDAuNy0wLjksMS4yYy0wLjMsMC41LTAuNCwxLjEtMC40LDEuOGMwLDEuNCwwLjYsMi42LDEuOSwzLjUgYzEuMiwwLjksMi45LDEuNCw1LDEuNGMxLjksMCwzLjMtMC40LDQuMy0xLjNjMS0wLjgsMS41LTEuOCwxLjUtMy4xYzAtMS0wLjMtMS45LTEtMi43Yy0wLjctMC43LTEuOC0xLjYtMy4zLTIuNiBDMjcuNSwzNi4yLDI3LjIsMzYuMiwyNi45LDM2LjJ6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNkZDRiMzlcIlxuICB9LFxuICBcImluc3RhZ3JhbVwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTQzLjUsMjkuN2gtMi42YzAuMiwwLjcsMC4zLDEuNSwwLjMsMi4zIGMwLDUuMS00LjEsOS4yLTkuMiw5LjJjLTUuMSwwLTkuMi00LjEtOS4yLTkuMmMwLTAuOCwwLjEtMS42LDAuMy0yLjNoLTIuNnYxMi43YzAsMC42LDAuNSwxLjIsMS4yLDEuMmgyMC44YzAuNiwwLDEuMi0wLjUsMS4yLTEuMiBWMjkuN3ogTTQzLjUsMjEuNmMwLTAuNi0wLjUtMS4yLTEuMi0xLjJoLTMuNWMtMC42LDAtMS4yLDAuNS0xLjIsMS4ydjMuNWMwLDAuNiwwLjUsMS4yLDEuMiwxLjJoMy41YzAuNiwwLDEuMi0wLjUsMS4yLTEuMlYyMS42eiAgTTMyLDI2LjJjLTMuMiwwLTUuOCwyLjYtNS44LDUuOGMwLDMuMiwyLjYsNS44LDUuOCw1LjhzNS44LTIuNiw1LjgtNS44QzM3LjgsMjguOCwzNS4yLDI2LjIsMzIsMjYuMiBNNDMuNSw0N0gyMC41IGMtMS45LDAtMy41LTEuNi0zLjUtMy41VjIwLjVjMC0xLjksMS41LTMuNSwzLjUtMy41aDIzLjFjMS45LDAsMy41LDEuNSwzLjUsMy41djIzLjFDNDcsNDUuNCw0NS41LDQ3LDQzLjUsNDdcIixcbiAgICBcIm1hc2tcIjogXCJNNDEuMiwzMmMwLDUuMS00LjEsOS4yLTkuMiw5LjJjLTUuMSwwLTkuMi00LjEtOS4yLTkuMmMwLTAuOCwwLjEtMS42LDAuMy0yLjNoLTIuNnYxMi43YzAsMC42LDAuNSwxLjIsMS4yLDEuMiBoMjAuOGMwLjYsMCwxLjItMC41LDEuMi0xLjJWMjkuN2gtMi42QzQxLjEsMzAuNCw0MS4yLDMxLjIsNDEuMiwzMnogTTMyLDM3LjhjMy4yLDAsNS44LTIuNiw1LjgtNS44YzAtMy4yLTIuNi01LjgtNS44LTUuOCBjLTMuMiwwLTUuOCwyLjYtNS44LDUuOEMyNi4yLDM1LjIsMjguOCwzNy44LDMyLDM3Ljh6IE00Mi40LDIwLjVoLTMuNWMtMC42LDAtMS4yLDAuNS0xLjIsMS4ydjMuNWMwLDAuNiwwLjUsMS4yLDEuMiwxLjJoMy41IGMwLjYsMCwxLjItMC41LDEuMi0xLjJ2LTMuNUM0My41LDIxLDQzLDIwLjUsNDIuNCwyMC41eiBNMCwwdjY0aDY0VjBIMHogTTQ3LDQzLjVjMCwxLjktMS41LDMuNS0zLjUsMy41SDIwLjUgYy0xLjksMC0zLjUtMS42LTMuNS0zLjVWMjAuNWMwLTEuOSwxLjUtMy41LDMuNS0zLjVoMjMuMWMxLjksMCwzLjUsMS41LDMuNSwzLjVWNDMuNXpcIixcbiAgICBcImNvbG9yXCI6IFwiIzNmNzI5YlwiXG4gIH0sXG4gIFwiaXR1bmVzXCI6IHtcbiAgICBcImljb25cIjogXCJNNDEuMSwxN2MtMC4xLDAtMC4yLDAtMC4zLDBsLTE0LjcsM2MtMC42LDAuMS0xLjEsMC43LTEuMSwxLjR2MTcuNmMwLDAuOC0wLjYsMS40LTEuNCwxLjQgaC0yLjhjLTEuOSwwLTMuNCwxLjUtMy40LDMuNGMwLDEuOSwxLjUsMy40LDMuNCwzLjRoMmMyLjIsMCw0LTEuOCw0LTRWMjcuNGMwLTAuNCwwLjMtMC44LDAuNy0wLjlsMTIuMS0yLjRjMC4xLDAsMC4xLDAsMC4yLDAgYzAuNSwwLDAuOSwwLjQsMC45LDAuOXYxMWMwLDAuOC0wLjYsMS40LTEuNCwxLjRoLTIuOGMtMS45LDAtMy40LDEuNS0zLjQsMy40YzAsMS45LDEuNSwzLjQsMy40LDMuNGgyYzIuMiwwLDQtMS44LDQtNFYxOC40IEM0Mi41LDE3LjYsNDEuOSwxNyw0MS4xLDE3elwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNNDIuNSw0MGMwLDIuMi0xLjgsNC00LDRoLTJjLTEuOSwwLTMuNC0xLjUtMy40LTMuNHMxLjUtMy40LDMuNC0zLjRoMi44YzAuOCwwLDEuNC0wLjYsMS40LTEuNCB2LTExYzAtMC41LTAuNC0wLjktMC45LTAuOWMtMC4xLDAtMC4xLDAtMC4yLDBsLTEyLjEsMi40Yy0wLjQsMC4xLTAuNywwLjQtMC43LDAuOVY0M2MwLDIuMi0xLjgsNC00LDRoLTJjLTEuOSwwLTMuNC0xLjUtMy40LTMuNCBjMC0xLjksMS41LTMuNCwzLjQtMy40aDIuOGMwLjgsMCwxLjQtMC42LDEuNC0xLjRWMjEuM2MwLTAuNywwLjUtMS4yLDEuMS0xLjRsMTQuNy0zYzAuMSwwLDAuMiwwLDAuMywwYzAuOCwwLDEuNCwwLjYsMS40LDEuNFY0MHpcIixcbiAgICBcImNvbG9yXCI6IFwiI0UwNDlEMVwiXG4gIH0sXG4gIFwibGlua2VkaW5cIjoge1xuICAgIFwiaWNvblwiOiBcIk0yMC40LDQ0aDUuNFYyNi42aC01LjRWNDR6IE0yMy4xLDE4Yy0xLjcsMC0zLjEsMS40LTMuMSwzLjFjMCwxLjcsMS40LDMuMSwzLjEsMy4xIGMxLjcsMCwzLjEtMS40LDMuMS0zLjFDMjYuMiwxOS40LDI0LjgsMTgsMjMuMSwxOHogTTM5LjUsMjYuMmMtMi42LDAtNC40LDEuNC01LjEsMi44aC0wLjF2LTIuNGgtNS4yVjQ0aDUuNHYtOC42IGMwLTIuMywwLjQtNC41LDMuMi00LjVjMi44LDAsMi44LDIuNiwyLjgsNC42VjQ0SDQ2di05LjVDNDYsMjkuOCw0NSwyNi4yLDM5LjUsMjYuMnpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTI1LjgsNDRoLTUuNFYyNi42aDUuNFY0NHogTTIzLjEsMjQuM2MtMS43LDAtMy4xLTEuNC0zLjEtMy4xYzAtMS43LDEuNC0zLjEsMy4xLTMuMSBjMS43LDAsMy4xLDEuNCwzLjEsMy4xQzI2LjIsMjIuOSwyNC44LDI0LjMsMjMuMSwyNC4zeiBNNDYsNDRoLTUuNHYtOC40YzAtMiwwLTQuNi0yLjgtNC42Yy0yLjgsMC0zLjIsMi4yLTMuMiw0LjVWNDRoLTUuNFYyNi42IGg1LjJWMjloMC4xYzAuNy0xLjQsMi41LTIuOCw1LjEtMi44YzUuNSwwLDYuNSwzLjYsNi41LDguM1Y0NHpcIixcbiAgICBcImNvbG9yXCI6IFwiIzAwN2ZiMVwiXG4gIH0sXG4gIFwibWVkaXVtXCI6IHtcbiAgICBcImljb25cIjogXCJNNDcsMjMuN2gtMS4yYy0wLjQsMC0wLjksMC42LTAuOSwxdjE0LjdjMCwwLjQsMC41LDEsMC45LDFINDd2My40SDM2LjR2LTMuNGgyLjFWMjQuOWgtMC4xIGwtNS4zLDE4LjloLTQuMWwtNS4yLTE4LjloLTAuMXYxNS41SDI2djMuNGgtOXYtMy40aDEuMmMwLjUsMCwxLTAuNiwxLTFWMjQuN2MwLTAuNC0wLjUtMS0xLTFIMTd2LTMuNmgxMS4zbDMuNywxMy44aDAuMWwzLjctMTMuOCBINDdWMjMuN3pcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTQ3LDIzLjdoLTEuMmMtMC40LDAtMC45LDAuNi0wLjksMXYxNC43YzAsMC40LDAuNSwxLDAuOSwxSDQ3djMuNEgzNi40di0zLjRoMi4xVjI0LjloLTAuMSBsLTUuMywxOC45aC00LjFsLTUuMi0xOC45aC0wLjF2MTUuNUgyNnYzLjRoLTl2LTMuNGgxLjJjMC41LDAsMS0wLjYsMS0xVjI0LjdjMC0wLjQtMC41LTEtMS0xSDE3di0zLjZoMTEuM2wzLjcsMTMuOGgwLjFsMy43LTEzLjggSDQ3VjIzLjd6XCIsXG4gICAgXCJjb2xvclwiOiBcIiMzMzMzMzJcIlxuICB9LFxuICBcIm1lZXR1cFwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTMwLjgsMzMuNGMwLTYuMywxLjktMTEuOSwzLjUtMTUuM2MwLjUtMS4xLDAuOS0xLjQsMS45LTEuNGMxLjMsMCwyLjksMC4yLDQuMSwwLjQgYzEuMSwwLjIsMS41LDEuNiwxLjcsMi41YzEuMiw0LjUsNC43LDE4LjcsNS41LDIyLjRjMC4yLDAuOCwwLjYsMiwwLjEsMi4zYy0wLjQsMC4yLTIuNSwwLjktMy45LDFjLTAuNiwwLjEtMS4xLTAuNi0xLjQtMS41IGMtMS41LTQuNi0zLjUtMTEuOC01LjItMTYuNmMwLDMuNy0wLjMsMTAuOC0wLjQsMTJjLTAuMSwxLjctMC40LDMuNy0xLjgsMy45Yy0xLjEsMC4yLTIuNCwwLjQtNCwwLjRjLTEuMywwLTEuOC0wLjktMi40LTEuOCBjLTEtMS40LTMuMS00LjgtNC4xLTYuOWMwLjMsMi4zLDAuNyw0LjcsMC45LDUuOGMwLjEsMC44LDAsMS41LTAuNiwxLjljLTEsMC43LTMuMiwxLjQtNC4xLDEuNGMtMC44LDAtMS41LTAuOC0xLjYtMS42IGMtMC43LTMuNC0xLjItOC0xLjEtMTEuMWMwLTIuOCwwLTUuOSwwLjItOC4zYzAtMC43LDAuMy0xLjEsMC45LTEuNGMxLjItMC41LDMtMC42LDQuNy0wLjNjMC44LDAuMSwxLDAuOCwxLjQsMS40IEMyNi45LDI1LjUsMjguOSwyOS41LDMwLjgsMzMuNHpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTQ3LjgsNDQuM2MtMC40LDAuMi0yLjUsMC45LTMuOSwxYy0wLjYsMC4xLTEuMS0wLjYtMS40LTEuNWMtMS41LTQuNi0zLjUtMTEuOC01LjItMTYuNiBjMCwzLjctMC4zLDEwLjgtMC40LDEyYy0wLjEsMS43LTAuNCwzLjctMS44LDMuOWMtMS4xLDAuMi0yLjQsMC40LTQsMC40Yy0xLjMsMC0xLjgtMC45LTIuNC0xLjhjLTEtMS40LTMuMS00LjgtNC4xLTYuOSBjMC4zLDIuMywwLjcsNC43LDAuOSw1LjhjMC4xLDAuOCwwLDEuNS0wLjYsMS45Yy0xLDAuNy0zLjIsMS40LTQuMSwxLjRjLTAuOCwwLTEuNS0wLjgtMS42LTEuNmMtMC43LTMuNC0xLjItOC0xLjEtMTEuMSBjMC0yLjgsMC01LjksMC4yLTguM2MwLTAuNywwLjMtMS4xLDAuOS0xLjRjMS4yLTAuNSwzLTAuNiw0LjctMC4zYzAuOCwwLjEsMSwwLjgsMS40LDEuNGMxLjcsMi44LDMuOCw2LjcsNS43LDEwLjYgYzAtNi4zLDEuOS0xMS45LDMuNS0xNS4zYzAuNS0xLjEsMC45LTEuNCwxLjktMS40YzEuMywwLDIuOSwwLjIsNC4xLDAuNGMxLjEsMC4yLDEuNSwxLjYsMS43LDIuNWMxLjIsNC41LDQuNywxOC43LDUuNSwyMi40IEM0Ny44LDQyLjgsNDguMyw0NCw0Ny44LDQ0LjN6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNFNTE5MzdcIlxuICB9LFxuICBcIm5wbVwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTE4LjksMjB2MjUuNkgzMlYyNS41aDcuNVY0Nmg1LjZWMjBIMTguOXpcIixcbiAgICBcIm1hc2tcIjogXCJNNjgsMHY2OEgwVjBINjh6IE0xOC45LDIwdjI1LjZIMzJWMjUuNWg3LjVWNDZoNS42VjIwSDE4Ljl6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNjYjM4MzdcIlxuICB9LFxuICBcInBpbnRlcmVzdFwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTMyLDE2Yy04LjgsMC0xNiw3LjItMTYsMTZjMCw2LjYsMy45LDEyLjIsOS42LDE0LjdjMC0xLjEsMC0yLjUsMC4zLTMuNyBjMC4zLTEuMywyLjEtOC43LDIuMS04LjdzLTAuNS0xLTAuNS0yLjVjMC0yLjQsMS40LTQuMSwzLjEtNC4xYzEuNSwwLDIuMiwxLjEsMi4yLDIuNGMwLDEuNS0wLjksMy43LTEuNCw1LjcgYy0wLjQsMS43LDAuOSwzLjEsMi41LDMuMWMzLDAsNS4xLTMuOSw1LjEtOC41YzAtMy41LTIuNC02LjEtNi43LTYuMWMtNC45LDAtNy45LDMuNi03LjksNy43YzAsMS40LDAuNCwyLjQsMS4xLDMuMSBjMC4zLDAuMywwLjMsMC41LDAuMiwwLjljLTAuMSwwLjMtMC4zLDEtMC4zLDEuM2MtMC4xLDAuNC0wLjQsMC42LTAuOCwwLjRjLTIuMi0wLjktMy4zLTMuNC0zLjMtNi4xYzAtNC41LDMuOC0xMCwxMS40LTEwIGM2LjEsMCwxMC4xLDQuNCwxMC4xLDkuMmMwLDYuMy0zLjUsMTEtOC42LDExYy0xLjcsMC0zLjQtMC45LTMuOS0yYzAsMC0wLjksMy43LTEuMSw0LjRjLTAuMywxLjItMSwyLjUtMS42LDMuNCBjMS40LDAuNCwzLDAuNyw0LjUsMC43YzguOCwwLDE2LTcuMiwxNi0xNkM0OCwyMy4yLDQwLjgsMTYsMzIsMTZ6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE0zMiw0OGMtMS42LDAtMy4xLTAuMi00LjUtMC43YzAuNi0xLDEuMy0yLjIsMS42LTMuNGMwLjItMC43LDEuMS00LjQsMS4xLTQuNCBjMC42LDEuMSwyLjIsMiwzLjksMmM1LjEsMCw4LjYtNC43LDguNi0xMWMwLTQuNy00LTkuMi0xMC4xLTkuMmMtNy42LDAtMTEuNCw1LjUtMTEuNCwxMGMwLDIuOCwxLDUuMiwzLjMsNi4xIGMwLjQsMC4xLDAuNywwLDAuOC0wLjRjMC4xLTAuMywwLjItMSwwLjMtMS4zYzAuMS0wLjQsMC4xLTAuNS0wLjItMC45Yy0wLjYtMC44LTEuMS0xLjctMS4xLTMuMWMwLTQsMy03LjcsNy45LTcuNyBjNC4zLDAsNi43LDIuNiw2LjcsNi4xYzAsNC42LTIsOC41LTUuMSw4LjVjLTEuNywwLTIuOS0xLjQtMi41LTMuMWMwLjUtMiwxLjQtNC4yLDEuNC01LjdjMC0xLjMtMC43LTIuNC0yLjItMi40IGMtMS43LDAtMy4xLDEuOC0zLjEsNC4xYzAsMS41LDAuNSwyLjUsMC41LDIuNXMtMS44LDcuNC0yLjEsOC43Yy0wLjMsMS4yLTAuMywyLjYtMC4zLDMuN0MxOS45LDQ0LjIsMTYsMzguNiwxNiwzMiBjMC04LjgsNy4yLTE2LDE2LTE2YzguOCwwLDE2LDcuMiwxNiwxNkM0OCw0MC44LDQwLjgsNDgsMzIsNDh6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNjYjIxMjhcIlxuICB9LFxuICBcInJkaW9cIjoge1xuICAgIFwiaWNvblwiOiBcIk00Ny4zLDI1LjdjLTMuMiwwLjEtNy4xLTIuNC04LjctMy40Yy0wLjEtMC4xLTAuMy0wLjItMC40LTAuMmMtMC4yLTAuMS0wLjMtMC4yLTAuNS0wLjN2OS4zaDAgYzAsMC44LTAuMiwxLjctMC44LDIuNmwwLDAuMWMtMS41LDIuNC00LjcsMy45LTcuNywyLjljLTIuOS0xLTMuNy0zLjgtMi4xLTYuM2wwLTAuMWMxLjUtMi40LDQuNy0zLjksNy43LTIuOSBjMC4yLDAuMSwwLjQsMC4yLDAuNiwwLjN2LTYuOGMtMS4xLTAuMy0yLjItMC41LTMuNC0wLjVjLTYuOSwwLTEyLDUuMi0xMiwxMS42djAuMWMwLDYuNCw1LjEsMTEuNSwxMiwxMS41YzYuOSwwLDEyLTUuMiwxMi0xMS42IHYtMC4xYzAtMC41LDAtMS0wLjEtMS41QzQ3LjUsMjkuNSw0OSwyNS44LDQ3LjMsMjUuN3pcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTQzLjksMzAuNWMwLjEsMC41LDAuMSwxLDAuMSwxLjVWMzJjMCw2LjQtNS4xLDExLjYtMTIsMTEuNmMtNi45LDAtMTItNS4xLTEyLTExLjVWMzIgYzAtNi40LDUuMS0xMS42LDEyLTExLjZjMS4yLDAsMi4zLDAuMiwzLjQsMC41djYuOGMtMC4yLTAuMS0wLjQtMC4yLTAuNi0wLjNjLTMtMS02LjIsMC40LTcuNywyLjlsMCwwLjFjLTEuNSwyLjUtMC44LDUuMywyLjEsNi4zIGMzLDEsNi4yLTAuNCw3LjctMi45bDAtMC4xYzAuNS0wLjgsMC44LTEuNywwLjgtMi42aDB2LTkuM2MwLjIsMC4xLDAuMywwLjIsMC41LDAuM2MwLjEsMC4xLDAuMywwLjIsMC40LDAuMmMxLjUsMSw1LjQsMy41LDguNywzLjQgQzQ5LDI1LjgsNDcuNSwyOS41LDQzLjksMzAuNXpcIixcbiAgICBcImNvbG9yXCI6IFwiIzA0NzVDNVwiXG4gIH0sXG4gIFwicnNzXCI6IHtcbiAgICBcImljb25cIjogXCJNMjQsMzZjLTIuMiwwLTQsMS44LTQsNGMwLDIuMiwxLjgsNCw0LDRzNC0xLjgsNC00QzI4LDM3LjgsMjYuMiwzNiwyNCwzNnogTTIzLDE4IGMtMS4xLDAtMiwwLjktMiwyczAuOSwyLDIsMmMxMC41LDAsMTksOC41LDE5LDE5YzAsMS4xLDAuOSwyLDIsMnMyLTAuOSwyLTJDNDYsMjguMywzNS43LDE4LDIzLDE4eiBNMjMsMjdjLTEuMSwwLTIsMC45LTIsMiBzMC45LDIsMiwyYzUuNSwwLDEwLDQuNSwxMCwxMGMwLDEuMSwwLjksMiwyLDJzMi0wLjksMi0yQzM3LDMzLjMsMzAuNywyNywyMywyN3pcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTI0LDQ0Yy0yLjIsMC00LTEuOC00LTRjMC0yLjIsMS44LTQsNC00czQsMS44LDQsNEMyOCw0Mi4yLDI2LjIsNDQsMjQsNDR6IE0zNSw0MyBjLTEuMSwwLTItMC45LTItMmMwLTUuNS00LjUtMTAtMTAtMTBjLTEuMSwwLTItMC45LTItMnMwLjktMiwyLTJjNy43LDAsMTQsNi4zLDE0LDE0QzM3LDQyLjEsMzYuMSw0MywzNSw0M3ogTTQ0LDQzIGMtMS4xLDAtMi0wLjktMi0yYzAtMTAuNS04LjUtMTktMTktMTljLTEuMSwwLTItMC45LTItMnMwLjktMiwyLTJjMTIuNywwLDIzLDEwLjMsMjMsMjNDNDYsNDIuMSw0NS4xLDQzLDQ0LDQzelwiLFxuICAgIFwiY29sb3JcIjogXCIjRUY4NzMzXCJcbiAgfSxcbiAgXCJzaGFyZXRoaXNcIjoge1xuICAgIFwiaWNvblwiOiBcIk0yOC4zODc1LDMyLjAwMDFDMjguMzg3NSwzMi4wODQzIDI4LjM2ODMsMzIuMTYzMiAyOC4zNjMzLDMyLjI0NzFMMzcuMTY0NywzNi42NDY0QzM3LjkxODIsMzYuMDA4MyAzOC44ODIzLDM1LjYxIDM5Ljk0NzQsMzUuNjFDNDIuMzQxOCwzNS42MTA1IDQ0LjI4MjEsMzcuNTUwOSA0NC4yODIxLDM5Ljk0NUM0NC4yODIxLDQyLjM0MTggNDIuMzQxNyw0NC4yODIxIDM5Ljk0NzQsNDQuMjgyMUMzNy41NTEsNDQuMjgyMSAzNS42MTI3LDQyLjM0MTcgMzUuNjEyNywzOS45NDVDMzUuNjEyNywzOS44NTg3IDM1LjYzMTksMzkuNzgxNiAzNS42MzY3LDM5LjY5OEwyNi44MzUzLDM1LjI5ODRDMjYuMDc5NSwzNS45MzQxIDI1LjExNzcsMzYuMzMyNCAyNC4wNTI2LDM2LjMzMjRDMjEuNjU4NCwzNi4zMzI0IDE5LjcxNzksMzQuMzk0MSAxOS43MTc5LDMyLjAwMDFDMTkuNzE3OSwyOS42MDM2IDIxLjY1ODQsMjcuNjYyOCAyNC4wNTI2LDI3LjY2MjhDMjUuMTE3NiwyNy42NjI4IDI2LjA3OTgsMjguMDYzNSAyNi44MzUzLDI4LjY5OTJMMzUuNjM2NywyNC4yOTk3QzM1LjYzMTksMjQuMjE1NiAzNS42MTI3LDI0LjEzNjUgMzUuNjEyNywyNC4wNTAyQzM1LjYxMjcsMjEuNjU4NCAzNy41NTEsMTkuNzE3OSAzOS45NDc0LDE5LjcxNzlDNDIuMzQxOCwxOS43MTc5IDQ0LjI4MjEsMjEuNjU4NCA0NC4yODIxLDI0LjA1MDJDNDQuMjgyMSwyNi40NDY2IDQyLjM0MTcsMjguMzg3NSAzOS45NDc0LDI4LjM4NzVDMzguODgsMjguMzg3NSAzNy45MTc4LDI3Ljk4NjggMzcuMTY0NywyNy4zNDg3TDI4LjM2MzMsMzEuNzUwNkMyOC4zNjgsMzEuODM0NyAyOC4zODc1LDMxLjkxMzggMjguMzg3NSwzMi4wMDAxWlwiLFxuICAgIFwibWFza1wiOiBcIk0wLDBMNjQsMEw2NCw2NEwwLDY0TDAsMFpNMjguMzg3NSwzMi4wMDAxQzI4LjM4NzUsMzIuMDg0MyAyOC4zNjgzLDMyLjE2MzIgMjguMzYzMywzMi4yNDcxTDM3LjE2NDcsMzYuNjQ2NEMzNy45MTgyLDM2LjAwODMgMzguODgyMywzNS42MSAzOS45NDc0LDM1LjYxQzQyLjM0MTgsMzUuNjEwNSA0NC4yODIxLDM3LjU1MDkgNDQuMjgyMSwzOS45NDVDNDQuMjgyMSw0Mi4zNDE4IDQyLjM0MTcsNDQuMjgyMSAzOS45NDc0LDQ0LjI4MjFDMzcuNTUxLDQ0LjI4MjEgMzUuNjEyNyw0Mi4zNDE3IDM1LjYxMjcsMzkuOTQ1QzM1LjYxMjcsMzkuODU4NyAzNS42MzE5LDM5Ljc4MTYgMzUuNjM2NywzOS42OThMMjYuODM1MywzNS4yOTg0QzI2LjA3OTUsMzUuOTM0MSAyNS4xMTc3LDM2LjMzMjQgMjQuMDUyNiwzNi4zMzI0QzIxLjY1ODQsMzYuMzMyNCAxOS43MTc5LDM0LjM5NDEgMTkuNzE3OSwzMi4wMDAxQzE5LjcxNzksMjkuNjAzNiAyMS42NTg0LDI3LjY2MjggMjQuMDUyNiwyNy42NjI4QzI1LjExNzYsMjcuNjYyOCAyNi4wNzk4LDI4LjA2MzUgMjYuODM1MywyOC42OTkyTDM1LjYzNjcsMjQuMjk5N0MzNS42MzE5LDI0LjIxNTYgMzUuNjEyNywyNC4xMzY1IDM1LjYxMjcsMjQuMDUwMkMzNS42MTI3LDIxLjY1ODQgMzcuNTUxLDE5LjcxNzkgMzkuOTQ3NCwxOS43MTc5QzQyLjM0MTgsMTkuNzE3OSA0NC4yODIxLDIxLjY1ODQgNDQuMjgyMSwyNC4wNTAyQzQ0LjI4MjEsMjYuNDQ2NiA0Mi4zNDE3LDI4LjM4NzUgMzkuOTQ3NCwyOC4zODc1QzM4Ljg4LDI4LjM4NzUgMzcuOTE3OCwyNy45ODY4IDM3LjE2NDcsMjcuMzQ4N0wyOC4zNjMzLDMxLjc1MDZDMjguMzY4LDMxLjgzNDcgMjguMzg3NSwzMS45MTM4IDI4LjM4NzUsMzIuMDAwMVpcIixcbiAgICBcImNvbG9yXCI6IFwiIzAwQkYwMFwiXG4gIH0sXG4gIFwic211Z211Z1wiOiB7XG4gICAgXCJpY29uXCI6IFwiTTI1LjQsMjIuOWMyLjgsMCw0LjEtMS43LDMuOS0zLjEgYy0wLjEtMS4yLTEuMy0yLjQtMy42LTIuNGMtMS45LDAtMy4xLDEuNC0zLjMsMi44QzIyLjMsMjEuNiwyMy4xLDIzLDI1LjQsMjIuOXogTTM5LjIsMjIuNmMyLjYtMC4xLDMuOC0xLjUsMy44LTIuOCBjMC0xLjUtMS40LTMtMy44LTIuOGMtMS45LDAuMi0zLDEuNS0zLjIsMi44QzM1LjksMjEuMywzNi45LDIyLjcsMzkuMiwyMi42eiBNNDAuOSwyOC41Yy02LjYsMC43LTYuOSwwLjctMTksMSBjLTUuMSwwLTQsMTcuNSw2LjksMTcuNUMzOS4yLDQ3LDUxLjcsMjcuNCw0MC45LDI4LjV6IE0yOSw0My45Yy05LjUsMC04LjItMTEuMy02LjYtMTEuNGMxMS4xLTAuNCwxMy45LTAuOSwxNy44LTAuOSBDNDQuMywzMS42LDM2LjYsNDMuOSwyOSw0My45elwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNMzYuMSwxOS44YzAuMi0xLjMsMS4zLTIuNiwzLjItMi44YzIuNC0wLjIsMy44LDEuMywzLjgsMi44YzAsMS4zLTEuMiwyLjYtMy44LDIuOCBDMzYuOSwyMi43LDM1LjksMjEuMywzNi4xLDE5Ljh6IE0yMi41LDIwLjJjMC4yLTEuNCwxLjQtMi44LDMuMy0yLjhjMi4zLDAsMy41LDEuMSwzLjYsMi40YzAuMiwxLjUtMS4xLDMuMS0zLjksMy4xIEMyMy4xLDIzLDIyLjMsMjEuNiwyMi41LDIwLjJ6IE0yOC44LDQ3Yy0xMC45LDAtMTItMTcuNS02LjktMTcuNWMxMi4xLTAuMywxMi41LTAuMywxOS0xQzUxLjcsMjcuNCwzOS4yLDQ3LDI4LjgsNDd6IE00MC4zLDMxLjYgYy0zLjksMC02LjgsMC41LTE3LjgsMC45Yy0xLjYsMC4xLTIuOSwxMS40LDYuNiwxMS40QzM2LjYsNDMuOSw0NC4zLDMxLjYsNDAuMywzMS42elwiLFxuICAgIFwiY29sb3JcIjogXCIjOGNjYTFlXCJcbiAgfSxcbiAgXCJzb3VuZGNsb3VkXCI6IHtcbiAgICBcImljb25cIjogXCJNNDMuNiwzMGMtMC42LDAtMS4yLDAuMS0xLjcsMC4zYy0wLjMtNC0zLjctNy4xLTcuNy03LjFjLTEsMC0yLDAuMi0yLjgsMC41IEMzMS4xLDIzLjksMzEsMjQsMzEsMjQuM3YxMy45YzAsMC4zLDAuMiwwLjUsMC41LDAuNWMwLDAsMTIuMiwwLDEyLjIsMGMyLjQsMCw0LjQtMS45LDQuNC00LjRDNDgsMzEuOSw0NiwzMCw0My42LDMweiBNMjcuMiwyNS4xIGMtMC43LDAtMS4yLDAuNS0xLjIsMS4xdjExLjNjMCwwLjcsMC42LDEuMiwxLjIsMS4yYzAuNywwLDEuMi0wLjYsMS4yLTEuMlYyNi4yQzI4LjQsMjUuNiwyNy44LDI1LjEsMjcuMiwyNS4xeiBNMjIuMiwyNy44IGMtMC43LDAtMS4yLDAuNS0xLjIsMS4xdjguNWMwLDAuNywwLjYsMS4yLDEuMiwxLjJzMS4yLTAuNiwxLjItMS4yVjI5QzIzLjQsMjguMywyMi45LDI3LjgsMjIuMiwyNy44eiBNMTcuMiwzMC4yIGMtMC43LDAtMS4yLDAuNS0xLjIsMS4xdjQuOWMwLDAuNywwLjYsMS4yLDEuMiwxLjJjMC43LDAsMS4yLTAuNiwxLjItMS4ydi00LjlDMTguNSwzMC43LDE3LjksMzAuMiwxNy4yLDMwLjJ6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE0xOC41LDM2LjNjMCwwLjctMC42LDEuMi0xLjIsMS4yYy0wLjcsMC0xLjItMC42LTEuMi0xLjJ2LTQuOWMwLTAuNiwwLjYtMS4xLDEuMi0xLjEgYzAuNywwLDEuMiwwLjUsMS4yLDEuMVYzNi4zeiBNMjMuNCwzNy41YzAsMC43LTAuNiwxLjItMS4yLDEuMlMyMSwzOC4yLDIxLDM3LjVWMjljMC0wLjYsMC42LTEuMSwxLjItMS4xczEuMiwwLjUsMS4yLDEuMVYzNy41eiAgTTI4LjQsMzcuNWMwLDAuNy0wLjYsMS4yLTEuMiwxLjJjLTAuNywwLTEuMi0wLjYtMS4yLTEuMlYyNi4yYzAtMC42LDAuNi0xLjEsMS4yLTEuMWMwLjcsMCwxLjIsMC41LDEuMiwxLjFWMzcuNXogTTQzLjYsMzguNyBjMCwwLTEyLjEsMC0xMi4yLDBjLTAuMywwLTAuNS0wLjItMC41LTAuNVYyNC4zYzAtMC4zLDAuMS0wLjQsMC40LTAuNWMwLjktMC4zLDEuOC0wLjUsMi44LTAuNWM0LDAsNy40LDMuMSw3LjcsNy4xIGMwLjUtMC4yLDEuMS0wLjMsMS43LTAuM2MyLjQsMCw0LjQsMiw0LjQsNC40QzQ4LDM2LjgsNDYsMzguNyw0My42LDM4Ljd6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNGRjU3MDBcIlxuICB9LFxuICBcInNwb3RpZnlcIjoge1xuICAgIFwiaWNvblwiOiBcIk0zMiwxNmMtOC44LDAtMTYsNy4yLTE2LDE2YzAsOC44LDcuMiwxNiwxNiwxNmM4LjgsMCwxNi03LjIsMTYtMTZDNDgsMjMuMiw0MC44LDE2LDMyLDE2IE0zOS4zLDM5LjFjLTAuMywwLjUtMC45LDAuNi0xLjQsMC4zYy0zLjgtMi4zLTguNS0yLjgtMTQuMS0xLjVjLTAuNSwwLjEtMS4xLTAuMi0xLjItMC43Yy0wLjEtMC41LDAuMi0xLjEsMC44LTEuMiBjNi4xLTEuNCwxMS4zLTAuOCwxNS41LDEuOEMzOS41LDM4LDM5LjYsMzguNiwzOS4zLDM5LjEgTTQxLjMsMzQuN2MtMC40LDAuNi0xLjEsMC44LTEuNywwLjRjLTQuMy0yLjYtMTAuOS0zLjQtMTUuOS0xLjkgYy0wLjcsMC4yLTEuNC0wLjItMS42LTAuOGMtMC4yLTAuNywwLjItMS40LDAuOC0xLjZjNS44LTEuOCwxMy0wLjksMTgsMi4xQzQxLjUsMzMuNCw0MS43LDM0LjEsNDEuMywzNC43IE00MS41LDMwLjIgYy01LjItMy4xLTEzLjctMy4zLTE4LjYtMS45Yy0wLjgsMC4yLTEuNi0wLjItMS45LTFjLTAuMi0wLjgsMC4yLTEuNiwxLTEuOWM1LjctMS43LDE1LTEuNCwyMSwyLjFjMC43LDAuNCwwLjksMS4zLDAuNSwyLjEgQzQzLjEsMzAuNCw0Mi4yLDMwLjYsNDEuNSwzMC4yXCIsXG4gICAgXCJtYXNrXCI6IFwiTTM5LDM3LjdjLTQuMi0yLjYtOS40LTMuMi0xNS41LTEuOGMtMC41LDAuMS0wLjksMC43LTAuOCwxLjJjMC4xLDAuNSwwLjcsMC45LDEuMiwwLjdjNS42LTEuMywxMC4zLTAuOCwxNC4xLDEuNSBjMC41LDAuMywxLjEsMC4xLDEuNC0wLjNDMzkuNiwzOC42LDM5LjUsMzgsMzksMzcuN3ogTTQwLjksMzNjLTQuOS0zLTEyLjItMy45LTE4LTIuMWMtMC43LDAuMi0xLDAuOS0wLjgsMS42IGMwLjIsMC43LDAuOSwxLDEuNiwwLjhjNS4xLTEuNSwxMS42LTAuOCwxNS45LDEuOWMwLjYsMC40LDEuNCwwLjIsMS43LTAuNEM0MS43LDM0LjEsNDEuNSwzMy40LDQwLjksMzN6IE0wLDB2NjRoNjRWMEgweiBNMzIsNDggYy04LjgsMC0xNi03LjItMTYtMTZjMC04LjgsNy4yLTE2LDE2LTE2YzguOCwwLDE2LDcuMiwxNiwxNkM0OCw0MC44LDQwLjgsNDgsMzIsNDh6IE00MywyNy42Yy01LjktMy41LTE1LjMtMy45LTIxLTIuMSBjLTAuOCwwLjItMS4yLDEuMS0xLDEuOWMwLjIsMC44LDEuMSwxLjIsMS45LDFjNC45LTEuNSwxMy40LTEuMiwxOC42LDEuOWMwLjcsMC40LDEuNiwwLjIsMi4xLTAuNUM0My45LDI5LDQzLjcsMjgsNDMsMjcuNnpcIixcbiAgICBcImNvbG9yXCI6IFwiIzJFQkQ1OVwiXG4gIH0sXG4gIFwic3F1YXJlc3BhY2VcIjoge1xuICAgIFwiaWNvblwiOiBcIk00Ni4yLDI3LjZjLTIuNC0yLjQtNi4zLTIuNC04LjcsMGwtOS44LDkuOGMtMC42LDAuNi0wLjYsMS42LDAsMi4yYzAuNiwwLjYsMS42LDAuNiwyLjIsMCBsOS44LTkuOGMxLjItMS4yLDMuMi0xLjIsNC40LDBjMS4yLDEuMiwxLjIsMy4yLDAsNC40bC05LjYsOS42YzEuMiwxLjIsMy4yLDEuMiw0LjQsMGw3LjUtNy41QzQ4LjYsMzQsNDguNiwzMCw0Ni4yLDI3LjZ6ICBNNDIuOSwzMC45Yy0wLjYtMC42LTEuNi0wLjYtMi4yLDBsLTkuOCw5LjhjLTEuMiwxLjItMy4yLDEuMi00LjQsMGMtMC42LTAuNi0xLjYtMC42LTIuMiwwYy0wLjYsMC42LTAuNiwxLjYsMCwyLjIgYzIuNCwyLjQsNi4zLDIuNCw4LjcsMGw5LjgtOS44QzQzLjUsMzIuNSw0My41LDMxLjUsNDIuOSwzMC45eiBNMzkuNiwyMS4xYy0yLjQtMi40LTYuMy0yLjQtOC43LDBsLTkuOCw5LjhjLTAuNiwwLjYtMC42LDEuNiwwLDIuMiBjMC42LDAuNiwxLjYsMC42LDIuMiwwbDkuOC05LjhjMS4yLTEuMiwzLjItMS4yLDQuNCwwYzAuNiwwLjYsMS42LDAuNiwyLjIsMEM0MC4yLDIyLjcsNDAuMiwyMS43LDM5LjYsMjEuMXogTTM2LjQsMjQuNCBjLTAuNi0wLjYtMS42LTAuNi0yLjIsMGwtOS44LDkuOGMtMS4yLDEuMi0zLjIsMS4yLTQuNCwwYy0xLjItMS4yLTEuMi0zLjIsMC00LjRsOS42LTkuNmMtMS4yLTEuMi0zLjItMS4yLTQuNCwwbC03LjUsNy41IGMtMi40LDIuNC0yLjQsNi4zLDAsOC43YzIuNCwyLjQsNi4zLDIuNCw4LjcsMGw5LjgtOS44QzM3LDI1LjksMzcsMjUsMzYuNCwyNC40elwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNMzkuNiwyMS4xYzAuNiwwLjYsMC42LDEuNiwwLDIuMmMtMC42LDAuNi0xLjYsMC42LTIuMiwwYy0xLjItMS4yLTMuMi0xLjItNC40LDBsLTkuOCw5LjggYy0wLjYsMC42LTEuNiwwLjYtMi4yLDBjLTAuNi0wLjYtMC42LTEuNiwwLTIuMmw5LjgtOS44QzMzLjMsMTguNywzNy4yLDE4LjcsMzkuNiwyMS4xeiBNMTcuOCwzNi40Yy0yLjQtMi40LTIuNC02LjMsMC04LjdsNy41LTcuNSBjMS4yLTEuMiwzLjItMS4yLDQuNCwwTDIwLDI5LjhjLTEuMiwxLjItMS4yLDMuMiwwLDQuNGMxLjIsMS4yLDMuMiwxLjIsNC40LDBsOS44LTkuOGMwLjYtMC42LDEuNi0wLjYsMi4yLDBjMC42LDAuNiwwLjYsMS42LDAsMi4yIGwtOS44LDkuOEMyNC4xLDM4LjgsMjAuMiwzOC44LDE3LjgsMzYuNHogTTI0LjQsNDIuOWMtMC42LTAuNi0wLjYtMS42LDAtMi4yYzAuNi0wLjYsMS42LTAuNiwyLjIsMGMxLjIsMS4yLDMuMiwxLjIsNC40LDBsOS44LTkuOCBjMC42LTAuNiwxLjYtMC42LDIuMiwwYzAuNiwwLjYsMC42LDEuNiwwLDIuMmwtOS44LDkuOEMzMC43LDQ1LjMsMjYuOCw0NS4zLDI0LjQsNDIuOXogTTQ2LjIsMzYuNGwtNy41LDcuNWMtMS4yLDEuMi0zLjIsMS4yLTQuNCwwIGw5LjYtOS42YzEuMi0xLjIsMS4yLTMuMiwwLTQuNGMtMS4yLTEuMi0zLjItMS4yLTQuNCwwbC05LjgsOS44Yy0wLjYsMC42LTEuNiwwLjYtMi4yLDBjLTAuNi0wLjYtMC42LTEuNiwwLTIuMmw5LjgtOS44IGMyLjQtMi40LDYuMy0yLjQsOC43LDBDNDguNiwzMCw0OC42LDM0LDQ2LjIsMzYuNHpcIixcbiAgICBcImNvbG9yXCI6IFwiIzFDMUMxQ1wiXG4gIH0sXG4gIFwidHVtYmxyXCI6IHtcbiAgICBcImljb25cIjogXCJNMzkuMiw0MWMtMC42LDAuMy0xLjYsMC41LTIuNCwwLjVjLTIuNCwwLjEtMi45LTEuNy0yLjktM3YtOS4zaDZ2LTQuNWgtNlYxN2MwLDAtNC4zLDAtNC40LDAgYy0wLjEsMC0wLjIsMC4xLTAuMiwwLjJjLTAuMywyLjMtMS40LDYuNC01LjksOC4xdjMuOWgzVjM5YzAsMy40LDIuNSw4LjEsOSw4YzIuMiwwLDQuNy0xLDUuMi0xLjhMMzkuMiw0MXpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTM1LjQsNDdjLTYuNSwwLjEtOS00LjctOS04di05LjhoLTN2LTMuOWM0LjYtMS42LDUuNi01LjcsNS45LTguMWMwLTAuMiwwLjEtMC4yLDAuMi0wLjIgYzAuMSwwLDQuNCwwLDQuNCwwdjcuNmg2djQuNWgtNnY5LjNjMCwxLjMsMC41LDMsMi45LDNjMC44LDAsMS45LTAuMywyLjQtMC41bDEuNCw0LjNDNDAuMSw0NiwzNy42LDQ3LDM1LjQsNDd6XCIsXG4gICAgXCJjb2xvclwiOiBcIiMyYzQ3NjJcIlxuICB9LFxuICBcInR3aXRjaFwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTQwLDI1LjZoLTIuNXY3LjZINDBWMjUuNnogTTMzLDI1LjZoLTIuNXY3LjZIMzNWMjUuNnogTTIwLjksMThMMTksMjMuMXYyMC40aDd2My44aDMuOGwzLjgtMy44aDUuN2w3LjYtNy42VjE4SDIwLjl6IE00NC41LDM0LjVMNDAsMzloLTdsLTMuOCwzLjhWMzloLTUuN1YyMC41aDIxVjM0LjV6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE00NywzNS44bC03LjYsNy42aC01LjdsLTMuOCwzLjhIMjZ2LTMuOGgtN1YyMy4xbDEuOS01LjFINDdWMzUuOHogTTI5LjIsNDIuOEwzMywzOWg3bDQuNS00LjUgdi0xNGgtMjFWMzloNS43VjQyLjh6IE0zNy41LDI1LjZINDB2Ny42aC0yLjVWMjUuNnogTTMwLjUsMjUuNkgzM3Y3LjZoLTIuNVYyNS42elwiLFxuICAgIFwiY29sb3JcIjogXCIjNjQ0MUE1XCJcbiAgfSxcbiAgXCJ0d2l0dGVyXCI6IHtcbiAgICBcImljb25cIjogXCJNNDgsMjIuMWMtMS4yLDAuNS0yLjQsMC45LTMuOCwxYzEuNC0wLjgsMi40LTIuMSwyLjktMy42Yy0xLjMsMC44LTIuNywxLjMtNC4yLDEuNiBDNDEuNywxOS44LDQwLDE5LDM4LjIsMTljLTMuNiwwLTYuNiwyLjktNi42LDYuNmMwLDAuNSwwLjEsMSwwLjIsMS41Yy01LjUtMC4zLTEwLjMtMi45LTEzLjUtNi45Yy0wLjYsMS0wLjksMi4xLTAuOSwzLjMgYzAsMi4zLDEuMiw0LjMsMi45LDUuNWMtMS4xLDAtMi4xLTAuMy0zLTAuOGMwLDAsMCwwLjEsMCwwLjFjMCwzLjIsMi4zLDUuOCw1LjMsNi40Yy0wLjYsMC4xLTEuMSwwLjItMS43LDAuMmMtMC40LDAtMC44LDAtMS4yLTAuMSBjMC44LDIuNiwzLjMsNC41LDYuMSw0LjZjLTIuMiwxLjgtNS4xLDIuOC04LjIsMi44Yy0wLjUsMC0xLjEsMC0xLjYtMC4xYzIuOSwxLjksNi40LDIuOSwxMC4xLDIuOWMxMi4xLDAsMTguNy0xMCwxOC43LTE4LjcgYzAtMC4zLDAtMC42LDAtMC44QzQ2LDI0LjUsNDcuMSwyMy40LDQ4LDIyLjF6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE00NC43LDI1LjVjMCwwLjMsMCwwLjYsMCwwLjhDNDQuNywzNSwzOC4xLDQ1LDI2LjEsNDVjLTMuNywwLTcuMi0xLjEtMTAuMS0yLjkgYzAuNSwwLjEsMSwwLjEsMS42LDAuMWMzLjEsMCw1LjktMSw4LjItMi44Yy0yLjktMC4xLTUuMy0yLTYuMS00LjZjMC40LDAuMSwwLjgsMC4xLDEuMiwwLjFjMC42LDAsMS4yLTAuMSwxLjctMC4yIGMtMy0wLjYtNS4zLTMuMy01LjMtNi40YzAsMCwwLTAuMSwwLTAuMWMwLjksMC41LDEuOSwwLjgsMywwLjhjLTEuOC0xLjItMi45LTMuMi0yLjktNS41YzAtMS4yLDAuMy0yLjMsMC45LTMuMyBjMy4yLDQsOC4xLDYuNiwxMy41LDYuOWMtMC4xLTAuNS0wLjItMS0wLjItMS41YzAtMy42LDIuOS02LjYsNi42LTYuNmMxLjksMCwzLjYsMC44LDQuOCwyLjFjMS41LTAuMywyLjktMC44LDQuMi0xLjYgYy0wLjUsMS41LTEuNSwyLjgtMi45LDMuNmMxLjMtMC4yLDIuNi0wLjUsMy44LTFDNDcuMSwyMy40LDQ2LDI0LjUsNDQuNywyNS41elwiLFxuICAgIFwiY29sb3JcIjogXCIjMDBhY2VkXCJcbiAgfSxcbiAgXCJ2ZXZvXCI6IHtcbiAgICBcImljb25cIjogXCJNNDMsMjFjLTQuNSwwLTUuNCwyLjctNi44LDQuNmMwLDAtMy43LDUuNi01LjEsNy43bC0zLTEyLjNIMjBsNS4xLDIwLjZjMS4xLDMuNyw0LjEsMy40LDQuMSwzLjQgYzIuMSwwLDMuNi0xLjEsNS0zLjFMNDgsMjFDNDgsMjEsNDMuMiwyMSw0MywyMXpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTM0LjIsNDEuOWMtMS40LDIuMS0yLjksMy4xLTUsMy4xYzAsMC0zLDAuMi00LjEtMy40TDIwLDIxaDguMWwzLDEyLjNjMS40LTIuMSw1LjEtNy43LDUuMS03LjcgYzEuNC0xLjksMi4yLTQuNiw2LjgtNC42YzAuMiwwLDUsMCw1LDBMMzQuMiw0MS45elwiLFxuICAgIFwiY29sb3JcIjogXCIjRUQxQTNCXCJcbiAgfSxcbiAgXCJ2aW1lb1wiOiB7XG4gICAgXCJpY29uXCI6IFwiTTQ3LDI1Yy0wLjEsMi45LTIuMiw2LjktNi4xLDEyYy00LjEsNS4zLTcuNSw4LTEwLjQsOGMtMS43LDAtMy4yLTEuNi00LjQtNC44IGMtMC44LTMtMS42LTUuOS0yLjQtOC45Yy0wLjktMy4yLTEuOS00LjgtMi45LTQuOGMtMC4yLDAtMSwwLjUtMi40LDEuNEwxNywyNmMxLjUtMS4zLDIuOS0yLjYsNC40LTMuOWMyLTEuNywzLjUtMi42LDQuNC0yLjcgYzIuMy0wLjIsMy44LDEuNCw0LjMsNC44YzAuNiwzLjcsMSw2LDEuMiw2LjljMC43LDMuMSwxLjQsNC42LDIuMiw0LjZjMC42LDAsMS42LTEsMi44LTNjMS4zLTIsMS45LTMuNSwyLTQuNSBjMC4yLTEuNy0wLjUtMi42LTItMi42Yy0wLjcsMC0xLjUsMC4yLTIuMiwwLjVjMS41LTQuOCw0LjMtNy4yLDguNC03QzQ1LjcsMTkuMSw0Ny4yLDIxLjEsNDcsMjV6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE00MC45LDM3Yy00LjEsNS4zLTcuNSw4LTEwLjQsOGMtMS43LDAtMy4yLTEuNi00LjQtNC44Yy0wLjgtMy0xLjYtNS45LTIuNC04LjkgYy0wLjktMy4yLTEuOS00LjgtMi45LTQuOGMtMC4yLDAtMSwwLjUtMi40LDEuNEwxNywyNmMxLjUtMS4zLDIuOS0yLjYsNC40LTMuOWMyLTEuNywzLjUtMi42LDQuNC0yLjdjMi4zLTAuMiwzLjgsMS40LDQuMyw0LjggYzAuNiwzLjcsMSw2LDEuMiw2LjljMC43LDMuMSwxLjQsNC42LDIuMiw0LjZjMC42LDAsMS42LTEsMi44LTNjMS4zLTIsMS45LTMuNSwyLTQuNWMwLjItMS43LTAuNS0yLjYtMi0yLjZjLTAuNywwLTEuNSwwLjItMi4yLDAuNSBjMS41LTQuOCw0LjMtNy4yLDguNC03YzMuMSwwLjEsNC41LDIuMSw0LjQsNkM0Ni45LDI3LjksNDQuOCwzMS45LDQwLjksMzd6XCIsXG4gICAgXCJjb2xvclwiOiBcIiMxYWI3ZWFcIlxuICB9LFxuICBcInZpbmVcIjoge1xuICAgIFwiaWNvblwiOiBcIk00NS4yLDMxLjljLTAuOCwwLjItMS41LDAuMy0yLjIsMC4zYy0zLjgsMC02LjctMi42LTYuNy03LjJjMC0yLjMsMC45LTMuNCwyLjEtMy40IGMxLjIsMCwyLDEuMSwyLDMuMmMwLDEuMi0wLjMsMi41LTAuNiwzLjNjMCwwLDEuMiwyLDQuNCwxLjRjMC43LTEuNSwxLTMuNSwxLTUuMmMwLTQuNi0yLjMtNy4zLTYuNi03LjNjLTQuNCwwLTcsMy40LTcsNy45IGMwLDQuNCwyLjEsOC4yLDUuNSwxMGMtMS40LDIuOS0zLjMsNS40LTUuMiw3LjNjLTMuNS00LjItNi42LTkuOC03LjktMjAuN2gtNS4xYzIuNCwxOC4xLDkuNCwyMy45LDExLjIsMjVjMS4xLDAuNiwyLDAuNiwyLjksMC4xIGMxLjUtMC45LDYtNS40LDguNi0xMC43YzEuMSwwLDIuMy0wLjEsMy42LTAuNFYzMS45elwiLFxuICAgIFwibWFza1wiOiBcIk0wLDB2NjRoNjRWMEgweiBNMzguNCwyMS41Yy0xLjIsMC0yLjEsMS4yLTIuMSwzLjRjMCw0LjYsMi45LDcuMiw2LjcsNy4yYzAuNywwLDEuNC0wLjEsMi4yLTAuM3YzLjYgYy0xLjMsMC4zLTIuNSwwLjQtMy42LDAuNGMtMi41LDUuMy03LDkuOC04LjYsMTAuN2MtMSwwLjUtMS45LDAuNi0yLjktMC4xYy0xLjktMS4xLTguOS02LjktMTEuMi0yNUgyNGMxLjMsMTAuOSw0LjQsMTYuNSw3LjksMjAuNyBjMS45LTEuOSwzLjctNC40LDUuMi03LjNjLTMuNC0xLjctNS41LTUuNS01LjUtMTBjMC00LjUsMi42LTcuOSw3LTcuOWM0LjMsMCw2LjYsMi43LDYuNiw3LjNjMCwxLjctMC40LDMuNy0xLDUuMiBjLTMuMiwwLjYtNC40LTEuNC00LjQtMS40YzAuMi0wLjgsMC42LTIuMSwwLjYtMy4zQzQwLjMsMjIuNiwzOS41LDIxLjUsMzguNCwyMS41elwiLFxuICAgIFwiY29sb3JcIjogXCIjMDBCRjhGXCJcbiAgfSxcbiAgXCJ2c2NvXCI6IHtcbiAgICBcImljb25cIjogXCJNMzIsMTZjLTEuNCwwLTIuNSwxLjEtMi41LDIuNWMwLDEuNCwxLjEsMi41LDIuNSwyLjVjMS40LDAsMi41LTEuMSwyLjUtMi41IEMzNC41LDE3LjEsMzMuNCwxNiwzMiwxNnogTTE4LjUsMjkuNWMtMS40LDAtMi41LDEuMS0yLjUsMi41YzAsMS40LDEuMSwyLjUsMi41LDIuNWMxLjQsMCwyLjUtMS4xLDIuNS0yLjUgQzIwLjksMzAuNiwxOS44LDI5LjUsMTguNSwyOS41eiBNMjUuMiwyMi44Yy0xLjQsMC0yLjUsMS4xLTIuNSwyLjVjMCwxLjQsMS4xLDIuNSwyLjUsMi41YzEuNCwwLDIuNS0xLjEsMi41LTIuNSBDMjcuNywyMy45LDI2LjYsMjIuOCwyNS4yLDIyLjh6IE0zOC43LDI3LjZjMS40LDAsMi41LTEuMSwyLjUtMi41YzAtMS40LTEuMS0yLjUtMi41LTIuNWMtMS40LDAtMi41LDEuMS0yLjUsMi41IEMzNi4yLDI2LjUsMzcuMywyNy42LDM4LjcsMjcuNnogTTI1LjEsMzYuMmMtMS40LDAtMi41LDEuMS0yLjUsMi41YzAsMS40LDEuMSwyLjUsMi41LDIuNWMxLjQsMCwyLjUtMS4xLDIuNS0yLjUgQzI3LjYsMzcuMywyNi41LDM2LjIsMjUuMSwzNi4yeiBNMzEuOSwzNC40YzEuNCwwLDIuNS0xLjEsMi41LTIuNWMwLTEuNC0xLjEtMi41LTIuNS0yLjVjLTEuNCwwLTIuNSwxLjEtMi41LDIuNSBDMjkuNSwzMy4zLDMwLjYsMzQuNCwzMS45LDM0LjR6IE00NS41LDI5LjVjLTEuNCwwLTIuNSwxLjEtMi41LDIuNWMwLDEuNCwxLjEsMi41LDIuNSwyLjVjMS40LDAsMi41LTEuMSwyLjUtMi41IEM0OCwzMC42LDQ2LjksMjkuNSw0NS41LDI5LjV6IE0zMiw0My4xYy0xLjQsMC0yLjUsMS4xLTIuNSwyLjVjMCwxLjQsMS4xLDIuNSwyLjUsMi41YzEuNCwwLDIuNS0xLjEsMi41LTIuNSBDMzQuNSw0NC4yLDMzLjQsNDMuMSwzMiw0My4xeiBNMzguOCwzNi4zYy0xLjQsMC0yLjUsMS4xLTIuNSwyLjVjMCwxLjQsMS4xLDIuNSwyLjUsMi41YzEuNCwwLDIuNS0xLjEsMi41LTIuNSBDNDEuMiwzNy40LDQwLjEsMzYuMywzOC44LDM2LjN6XCIsXG4gICAgXCJtYXNrXCI6IFwiTTAsMHY2NGg2NFYwSDB6IE0xOC41LDM0LjVjLTEuNCwwLTIuNS0xLjEtMi41LTIuNWMwLTEuNCwxLjEtMi41LDIuNS0yLjVjMS40LDAsMi41LDEuMSwyLjUsMi41IEMyMC45LDMzLjQsMTkuOCwzNC41LDE4LjUsMzQuNXogTTI1LjEsNDEuMWMtMS40LDAtMi41LTEuMS0yLjUtMi41YzAtMS40LDEuMS0yLjUsMi41LTIuNWMxLjQsMCwyLjUsMS4xLDIuNSwyLjUgQzI3LjYsNDAsMjYuNSw0MS4xLDI1LjEsNDEuMXogTTI1LjIsMjcuN2MtMS40LDAtMi41LTEuMS0yLjUtMi41YzAtMS40LDEuMS0yLjUsMi41LTIuNWMxLjQsMCwyLjUsMS4xLDIuNSwyLjUgQzI3LjcsMjYuNiwyNi42LDI3LjcsMjUuMiwyNy43eiBNMzIsNDhjLTEuNCwwLTIuNS0xLjEtMi41LTIuNWMwLTEuNCwxLjEtMi41LDIuNS0yLjVjMS40LDAsMi41LDEuMSwyLjUsMi41IEMzNC41LDQ2LjksMzMuNCw0OCwzMiw0OHogTTI5LjUsMzEuOWMwLTEuNCwxLjEtMi41LDIuNS0yLjVjMS40LDAsMi41LDEuMSwyLjUsMi41YzAsMS40LTEuMSwyLjUtMi41LDIuNSBDMzAuNiwzNC40LDI5LjUsMzMuMywyOS41LDMxLjl6IE0zMiwyMC45Yy0xLjQsMC0yLjUtMS4xLTIuNS0yLjVjMC0xLjQsMS4xLTIuNSwyLjUtMi41YzEuNCwwLDIuNSwxLjEsMi41LDIuNSBDMzQuNSwxOS44LDMzLjQsMjAuOSwzMiwyMC45eiBNMzguNywyMi43YzEuNCwwLDIuNSwxLjEsMi41LDIuNWMwLDEuNC0xLjEsMi41LTIuNSwyLjVjLTEuNCwwLTIuNS0xLjEtMi41LTIuNSBDMzYuMiwyMy44LDM3LjMsMjIuNywzOC43LDIyLjd6IE0zOC44LDQxLjJjLTEuNCwwLTIuNS0xLjEtMi41LTIuNWMwLTEuNCwxLjEtMi41LDIuNS0yLjVjMS40LDAsMi41LDEuMSwyLjUsMi41IEM0MS4yLDQwLjEsNDAuMSw0MS4yLDM4LjgsNDEuMnogTTQ1LjUsMzQuNWMtMS40LDAtMi41LTEuMS0yLjUtMi41YzAtMS40LDEuMS0yLjUsMi41LTIuNWMxLjQsMCwyLjUsMS4xLDIuNSwyLjUgQzQ4LDMzLjQsNDYuOSwzNC41LDQ1LjUsMzQuNXpcIixcbiAgICBcImNvbG9yXCI6IFwiIzgzODc4QVwiXG4gIH0sXG4gIFwieWVscFwiOiB7XG4gICAgXCJpY29uXCI6IFwiTTI5LjUsMzUuN2MwLjUtMC4xLDAuOS0wLjYsMC45LTEuMmMwLTAuNi0wLjMtMS4yLTAuOC0xLjRjMCwwLTEuNS0wLjYtMS41LTAuNiBjLTUtMi4xLTUuMi0yLjEtNS41LTIuMWMtMC40LDAtMC43LDAuMi0xLDAuNmMtMC41LDAuOC0wLjcsMy4zLTAuNSw1YzAuMSwwLjYsMC4yLDEsMC4zLDEuM2MwLjIsMC40LDAuNSwwLjYsMC45LDAuNiBjMC4yLDAsMC40LDAsNS4xLTEuNUMyNy41LDM2LjQsMjkuNSwzNS43LDI5LjUsMzUuN3ogTTMyLjIsMzcuNmMtMC42LTAuMi0xLjItMC4xLTEuNSwwLjRjMCwwLTEsMS4yLTEsMS4yIGMtMy41LDQuMS0zLjcsNC4zLTMuNyw0LjVjLTAuMSwwLjEtMC4xLDAuMy0wLjEsMC40YzAsMC4yLDAuMSwwLjQsMC4zLDAuNmMwLjgsMSw0LjcsMi40LDYsMi4yYzAuNC0wLjEsMC43LTAuMywwLjktMC43IEMzMyw0Ni4xLDMzLDQ1LjksMzMsNDFjMCwwLDAtMi4yLDAtMi4yQzMzLjEsMzguMywzMi43LDM3LjgsMzIuMiwzNy42eiBNMzIuMywxNi44Yy0wLjEtMC40LTAuNC0wLjctMC45LTAuOCBjLTEuMy0wLjMtNi41LDEuMS03LjUsMi4xYy0wLjMsMC4zLTAuNCwwLjctMC4zLDEuMWMwLjIsMC4zLDYuNSwxMC40LDYuNSwxMC40YzAuOSwxLjUsMS43LDEuMywyLDEuMmMwLjMtMC4xLDEtMC4zLDAuOS0yLjEgQzMzLDI2LjYsMzIuNCwxNy4zLDMyLjMsMTYuOHogTTM2LjksMzMuNEMzNi45LDMzLjQsMzYuOCwzMy41LDM2LjksMzMuNGMwLjItMC4xLDAuNy0wLjIsMS41LTAuNGM1LjMtMS4zLDUuNS0xLjMsNS43LTEuNSBjMC4zLTAuMiwwLjUtMC42LDAuNS0xYzAsMCwwLDAsMCwwYy0wLjEtMS4zLTIuNC00LjctMy41LTUuMmMtMC40LTAuMi0wLjgtMC4yLTEuMSwwYy0wLjIsMC4xLTAuNCwwLjMtMy4yLDQuMmMwLDAtMS4zLDEuNy0xLjMsMS44IGMtMC4zLDAuNC0wLjMsMSwwLDEuNUMzNS44LDMzLjMsMzYuMywzMy42LDM2LjksMzMuNHogTTQ0LjQsMzguNmMtMC4yLTAuMS0wLjMtMC4yLTUtMS43YzAsMC0yLTAuNy0yLjEtMC43Yy0wLjUtMC4yLTEuMSwwLTEuNCwwLjUgYy0wLjQsMC41LTAuNSwxLjEtMC4xLDEuNmwwLjgsMS4zYzIuOCw0LjUsMyw0LjgsMy4yLDVjMC4zLDAuMiwwLjcsMC4zLDEuMSwwLjFjMS4yLTAuNSwzLjctMy43LDMuOS01IEM0NC44LDM5LjIsNDQuNywzOC44LDQ0LjQsMzguNnpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTIyLjQsMzcuOWMtMC40LDAtMC43LTAuMi0wLjktMC42Yy0wLjEtMC4zLTAuMi0wLjctMC4zLTEuM2MtMC4yLTEuNywwLTQuMiwwLjUtNSBjMC4yLTAuNCwwLjYtMC42LDEtMC42YzAuMywwLDAuNSwwLjEsNS41LDIuMWMwLDAsMS41LDAuNiwxLjUsMC42YzAuNSwwLjIsMC45LDAuNywwLjgsMS40YzAsMC42LTAuNCwxLjEtMC45LDEuMiBjMCwwLTIuMSwwLjctMi4xLDAuN0MyMi44LDM3LjksMjIuNywzNy45LDIyLjQsMzcuOXogTTMzLDQxYzAsNC45LDAsNS0wLjEsNS4zYy0wLjEsMC40LTAuNCwwLjYtMC45LDAuN2MtMS4yLDAuMi01LjEtMS4yLTYtMi4yIGMtMC4yLTAuMi0wLjMtMC40LTAuMy0wLjZjMC0wLjIsMC0wLjMsMC4xLTAuNGMwLjEtMC4yLDAuMi0wLjQsMy43LTQuNWMwLDAsMS0xLjIsMS0xLjJjMC4zLTAuNCwxLTAuNiwxLjUtMC40IGMwLjYsMC4yLDAuOSwwLjcsMC45LDEuMkMzMywzOC44LDMzLDQxLDMzLDQxeiBNMzIuMiwzMC44Yy0wLjMsMC4xLTEsMC4zLTItMS4yYzAsMC02LjQtMTAuMS02LjUtMTAuNGMtMC4xLTAuMywwLTAuNywwLjMtMS4xIGMxLTEsNi4xLTIuNCw3LjUtMi4xYzAuNCwwLjEsMC43LDAuNCwwLjksMC44YzAuMSwwLjQsMC43LDkuOCwwLjgsMTEuOUMzMy4yLDMwLjUsMzIuNCwzMC43LDMyLjIsMzAuOHogTTM1LjQsMzEuMyBjMCwwLDEuMy0xLjgsMS4zLTEuOGMyLjgtMy45LDMtNC4xLDMuMi00LjJjMC4zLTAuMiwwLjctMC4yLDEuMSwwYzEuMSwwLjUsMy40LDMuOSwzLjUsNS4yYzAsMCwwLDAsMCwwYzAsMC40LTAuMSwwLjgtMC41LDEgYy0wLjIsMC4xLTAuNCwwLjItNS43LDEuNWMtMC44LDAuMi0xLjMsMC4zLTEuNiwwLjRjMCwwLDAsMCwwLDBjLTAuNSwwLjEtMS4xLTAuMS0xLjQtMC42QzM1LjEsMzIuMywzNS4xLDMxLjcsMzUuNCwzMS4zeiAgTTQ0LjcsMzkuNmMtMC4yLDEuMy0yLjcsNC41LTMuOSw1Yy0wLjQsMC4yLTAuOCwwLjEtMS4xLTAuMWMtMC4yLTAuMi0wLjQtMC41LTMuMi01bC0wLjgtMS4zYy0wLjMtMC41LTAuMy0xLjEsMC4xLTEuNiBjMC40LTAuNSwwLjktMC42LDEuNC0wLjVjMCwwLDIuMSwwLjcsMi4xLDAuN2M0LjYsMS41LDQuOCwxLjYsNSwxLjdDNDQuNywzOC44LDQ0LjgsMzkuMiw0NC43LDM5LjZ6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNCOTBDMDRcIlxuICB9LFxuICBcInlvdXR1YmVcIjoge1xuICAgIFwiaWNvblwiOiBcIk00Ni43LDI2YzAsMC0wLjMtMi4xLTEuMi0zYy0xLjEtMS4yLTIuNC0xLjItMy0xLjNDMzguMywyMS40LDMyLDIxLjQsMzIsMjEuNGgwIGMwLDAtNi4zLDAtMTAuNSwwLjNjLTAuNiwwLjEtMS45LDAuMS0zLDEuM2MtMC45LDAuOS0xLjIsMy0xLjIsM1MxNywyOC40LDE3LDMwLjl2Mi4zYzAsMi40LDAuMyw0LjksMC4zLDQuOXMwLjMsMi4xLDEuMiwzIGMxLjEsMS4yLDIuNiwxLjIsMy4zLDEuM2MyLjQsMC4yLDEwLjIsMC4zLDEwLjIsMC4zczYuMywwLDEwLjUtMC4zYzAuNi0wLjEsMS45LTAuMSwzLTEuM2MwLjktMC45LDEuMi0zLDEuMi0zczAuMy0yLjQsMC4zLTQuOSB2LTIuM0M0NywyOC40LDQ2LjcsMjYsNDYuNywyNnogTTI4LjksMzUuOWwwLTguNGw4LjEsNC4yTDI4LjksMzUuOXpcIixcbiAgICBcIm1hc2tcIjogXCJNMCwwdjY0aDY0VjBIMHogTTQ3LDMzLjFjMCwyLjQtMC4zLDQuOS0wLjMsNC45cy0wLjMsMi4xLTEuMiwzYy0xLjEsMS4yLTIuNCwxLjItMywxLjMgQzM4LjMsNDIuNSwzMiw0Mi42LDMyLDQyLjZzLTcuOC0wLjEtMTAuMi0wLjNjLTAuNy0wLjEtMi4yLTAuMS0zLjMtMS4zYy0wLjktMC45LTEuMi0zLTEuMi0zUzE3LDM1LjYsMTcsMzMuMXYtMi4zIGMwLTIuNCwwLjMtNC45LDAuMy00LjlzMC4zLTIuMSwxLjItM2MxLjEtMS4yLDIuNC0xLjIsMy0xLjNjNC4yLTAuMywxMC41LTAuMywxMC41LTAuM2gwYzAsMCw2LjMsMCwxMC41LDAuM2MwLjYsMC4xLDEuOSwwLjEsMywxLjMgYzAuOSwwLjksMS4yLDMsMS4yLDNzMC4zLDIuNCwwLjMsNC45VjMzLjF6IE0yOC45LDM1LjlsOC4xLTQuMmwtOC4xLTQuMkwyOC45LDM1Ljl6XCIsXG4gICAgXCJjb2xvclwiOiBcIiNmZjMzMzNcIlxuICB9XG59XG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xyXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXHJcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXHJcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xyXG5Mb2NhbEZpbGVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2FsLWZpbGUtcHJvdmlkZXInXHJcblxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRDb250ZW50ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkQ29udGVudFxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9saXN0ZW5lcnMgPSBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuICAgIEBwcm92aWRlcnMgPSB7fVxyXG5cclxuICBzZXRBcHBPcHRpb25zOiAoQGFwcE9wdGlvbnMgPSB7fSktPlxyXG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xyXG4gICAgYWxsUHJvdmlkZXJzID0ge31cclxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlciwgTG9jYWxGaWxlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zLCBAXHJcbiAgICAgICAgICBAcHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV0gPSBwcm92aWRlclxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcclxuICAgIEBfc2V0U3RhdGUgYXZhaWxhYmxlUHJvdmlkZXJzOiBhdmFpbGFibGVQcm92aWRlcnNcclxuXHJcbiAgICAjIGFkZCBzaW5nbGV0b24gc2hhcmVQcm92aWRlciwgaWYgaXQgZXhpc3RzXHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5jYW4gJ3NoYXJlJ1xyXG4gICAgICAgIEBfc2V0U3RhdGUgc2hhcmVQcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICBicmVha1xyXG5cclxuICAgIEBhcHBPcHRpb25zLnVpIG9yPSB7fVxyXG4gICAgQGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTdWZmaXggb3I9IGRvY3VtZW50LnRpdGxlXHJcbiAgICBAYXBwT3B0aW9ucy51aS53aW5kb3dUaXRsZVNlcGFyYXRvciBvcj0gJyAtICdcclxuICAgIEBfc2V0V2luZG93VGl0bGUoKVxyXG5cclxuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxyXG5cclxuICAgICMgY2hlY2sgZm9yIGF1dG9zYXZlXHJcbiAgICBpZiBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcbiAgICAgIEBhdXRvU2F2ZSBAYXBwT3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcblxyXG4gICAgIyBpbml0aWFsaXplIHRoZSBjbG91ZENvbnRlbnRGYWN0b3J5IHdpdGggYWxsIGRhdGEgd2Ugd2FudCBpbiB0aGUgZW52ZWxvcGVcclxuICAgIGNsb3VkQ29udGVudEZhY3Rvcnkuc2V0RW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBhcHBOYW1lOiBAYXBwT3B0aW9ucy5hcHBOYW1lIG9yIFwiXCJcclxuICAgICAgYXBwVmVyc2lvbjogQGFwcE9wdGlvbnMuYXBwVmVyc2lvbiBvciBcIlwiXHJcbiAgICAgIGFwcEJ1aWxkTnVtOiBAYXBwT3B0aW9ucy5hcHBCdWlsZE51bSBvciBcIlwiXHJcblxyXG4gICAgQG5ld0ZpbGVPcGVuc0luTmV3VGFiID0gaWYgQGFwcE9wdGlvbnMudWk/Lmhhc093blByb3BlcnR5KCduZXdGaWxlT3BlbnNJbk5ld1RhYicpIHRoZW4gQGFwcE9wdGlvbnMudWkubmV3RmlsZU9wZW5zSW5OZXdUYWIgZWxzZSB0cnVlXHJcblxyXG4gIHNldFByb3ZpZGVyT3B0aW9uczogKG5hbWUsIG5ld09wdGlvbnMpIC0+XHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gQHN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBwcm92aWRlci5uYW1lIGlzIG5hbWVcclxuICAgICAgICBwcm92aWRlci5vcHRpb25zID89IHt9XHJcbiAgICAgICAgZm9yIGtleSBvZiBuZXdPcHRpb25zXHJcbiAgICAgICAgICBwcm92aWRlci5vcHRpb25zW2tleV0gPSBuZXdPcHRpb25zW2tleV1cclxuICAgICAgICBicmVha1xyXG5cclxuICBjb25uZWN0OiAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgbGlzdGVuOiAobGlzdGVuZXIpIC0+XHJcbiAgICBpZiBsaXN0ZW5lclxyXG4gICAgICBAX2xpc3RlbmVycy5wdXNoIGxpc3RlbmVyXHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICBwcmVwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5wcmVwZW5kTWVudUl0ZW0gaXRlbTsgQFxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLnJlcGxhY2VNZW51SXRlbSBrZXksIGl0ZW07IEBcclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAX3VpLmluc2VydE1lbnVJdGVtQmVmb3JlIGtleSwgaXRlbTsgQFxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQF91aS5pbnNlcnRNZW51SXRlbUFmdGVyIGtleSwgaXRlbTsgQFxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBcIlwiXHJcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnLCB7Y29udGVudDogXCJcIn1cclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBuZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiBAZ2V0Q3VycmVudFVybCgpLCAnX2JsYW5rJ1xyXG4gICAgZWxzZSBpZiBAc3RhdGUuZGlydHlcclxuICAgICAgaWYgQF9hdXRvU2F2ZUludGVydmFsIGFuZCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBAc2F2ZSgpXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgICBlbHNlIGlmIGNvbmZpcm0gdHIgJ35DT05GSVJNLk5FV19GSUxFJ1xyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgIGVsc2VcclxuICAgICAgQG5ld0ZpbGUoKVxyXG5cclxuICBvcGVuRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnbG9hZCdcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIubG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIEBfY2xvc2VDdXJyZW50RmlsZSgpXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfSwgQF9nZXRIYXNoUGFyYW1zIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcclxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBpbXBvcnREYXRhOiAoZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnaW1wb3J0ZWREYXRhJywgZGF0YVxyXG4gICAgY2FsbGJhY2s/IGRhdGFcclxuXHJcbiAgaW1wb3J0RGF0YURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuaW1wb3J0RGF0YURpYWxvZyAoZGF0YSkgPT5cclxuICAgICAgQGltcG9ydERhdGEgZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgcmVhZExvY2FsRmlsZTogKGZpbGUsIGNhbGxiYWNrPW51bGwpIC0+XHJcbiAgICByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXHJcbiAgICByZWFkZXIub25sb2FkID0gKGxvYWRlZCkgLT5cclxuICAgICAgY2FsbGJhY2s/IHtuYW1lOiBmaWxlLm5hbWUsIGNvbnRlbnQ6IGxvYWRlZC50YXJnZXQucmVzdWx0fVxyXG4gICAgcmVhZGVyLnJlYWRBc1RleHQgZmlsZVxyXG5cclxuICBvcGVuTG9jYWxGaWxlOiAoZmlsZSwgY2FsbGJhY2s9bnVsbCkgLT5cclxuICAgIEByZWFkTG9jYWxGaWxlIGZpbGUsIChkYXRhKSA9PlxyXG4gICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgZGF0YS5jb250ZW50XHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBkYXRhLm5hbWVcclxuICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG4gICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuXHJcbiAgaW1wb3J0TG9jYWxGaWxlOiAoZmlsZSwgY2FsbGJhY2s9bnVsbCkgLT5cclxuICAgIEByZWFkTG9jYWxGaWxlIGZpbGUsIChkYXRhKSA9PlxyXG4gICAgICBAaW1wb3J0RGF0YSBkYXRhLCBjYWxsYmFja1xyXG5cclxuICBvcGVuU2hhcmVkQ29udGVudDogKGlkKSAtPlxyXG4gICAgQHN0YXRlLnNoYXJlUHJvdmlkZXI/LmxvYWRTaGFyZWRDb250ZW50IGlkLCAoZXJyLCBjb250ZW50LCBtZXRhZGF0YSkgPT5cclxuICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhLCB7b3ZlcndyaXRhYmxlOiBmYWxzZSwgb3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG5cclxuICBvcGVuUHJvdmlkZXJGaWxlOiAocHJvdmlkZXJOYW1lLCBwcm92aWRlclBhcmFtcykgLT5cclxuICAgIHByb3ZpZGVyID0gQHByb3ZpZGVyc1twcm92aWRlck5hbWVdXHJcbiAgICBpZiBwcm92aWRlclxyXG4gICAgICBwcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxyXG4gICAgICAgIGlmIGF1dGhvcml6ZWRcclxuICAgICAgICAgIHByb3ZpZGVyLm9wZW5TYXZlZCBwcm92aWRlclBhcmFtcywgKGVyciwgY29udGVudCwgbWV0YWRhdGEpID0+XHJcbiAgICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IGNvbnRlbnQuY2xvbmUoKX0sIEBfZ2V0SGFzaFBhcmFtcyBtZXRhZGF0YVxyXG5cclxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoc3RyaW5nQ29udGVudCkgPT5cclxuICAgICAgQHNhdmVDb250ZW50IHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb250ZW50OiAoc3RyaW5nQ29udGVudCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBzdHJpbmdDb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZTogKHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZSdcclxuICAgICAgQF9zZXRTdGF0ZVxyXG4gICAgICAgIHNhdmluZzogbWV0YWRhdGFcclxuICAgICAgY3VycmVudENvbnRlbnQgPSBAX2NyZWF0ZU9yVXBkYXRlQ3VycmVudENvbnRlbnQgc3RyaW5nQ29udGVudCwgbWV0YWRhdGFcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBpZiBAc3RhdGUubWV0YWRhdGEgaXNudCBtZXRhZGF0YVxyXG4gICAgICAgICAgQF9jbG9zZUN1cnJlbnRGaWxlKClcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIHtzYXZlZDogdHJ1ZX0sIEBfZ2V0SGFzaFBhcmFtcyBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjdXJyZW50Q29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIHN0cmluZ0NvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChzdHJpbmdDb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBjcmVhdGVDb3B5OiAoc3RyaW5nQ29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIHNhdmVBbmRPcGVuQ29weSA9IChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICBAc2F2ZUNvcGllZEZpbGUgc3RyaW5nQ29udGVudCwgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCAoZXJyLCBjb3B5UGFyYW1zKSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaz8gZXJyIGlmIGVyclxyXG4gICAgICAgIHdpbmRvdy5vcGVuIEBnZXRDdXJyZW50VXJsIFwiI2NvcHk9I3tjb3B5UGFyYW1zfVwiXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvcHlQYXJhbXNcclxuICAgIGlmIHN0cmluZ0NvbnRlbnQgaXMgbnVsbFxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSAtPlxyXG4gICAgICAgIHNhdmVBbmRPcGVuQ29weSBzdHJpbmdDb250ZW50XHJcbiAgICBlbHNlXHJcbiAgICAgIHNhdmVBbmRPcGVuQ29weSBzdHJpbmdDb250ZW50XHJcblxyXG4gIHNhdmVDb3BpZWRGaWxlOiAoc3RyaW5nQ29udGVudCwgbmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgcHJlZml4ID0gJ2NmbS1jb3B5OjonXHJcbiAgICAgIG1heENvcHlOdW1iZXIgPSAwXHJcbiAgICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcclxuICAgICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxyXG4gICAgICAgICAgY29weU51bWJlciA9IHBhcnNlSW50KGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCksIDEwKVxyXG4gICAgICAgICAgbWF4Q29weU51bWJlciA9IE1hdGgubWF4KG1heENvcHlOdW1iZXIsIGNvcHlOdW1iZXIpXHJcbiAgICAgIG1heENvcHlOdW1iZXIrK1xyXG4gICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgICAgbmFtZTogaWYgbmFtZT8ubGVuZ3RoID4gMCB0aGVuIFwiQ29weSBvZiAje25hbWV9XCIgZWxzZSBcIkNvcHkgb2YgVW50aXRsZWQgRG9jdW1lbnRcIlxyXG4gICAgICAgIHN0cmluZ0NvbnRlbnQ6IHN0cmluZ0NvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIFwiI3twcmVmaXh9I3ttYXhDb3B5TnVtYmVyfVwiLCB2YWx1ZVxyXG4gICAgICBjYWxsYmFjaz8gbnVsbCwgbWF4Q29weU51bWJlclxyXG4gICAgY2F0Y2ggZVxyXG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byB0ZW1wb3JhcmlseSBzYXZlIGNvcGllZCBmaWxlXCJcclxuXHJcbiAgb3BlbkNvcGllZEZpbGU6IChjb3B5UGFyYW1zKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGtleSA9IFwiY2ZtLWNvcHk6OiN7Y29weVBhcmFtc31cIlxyXG4gICAgICBjb3BpZWQgPSBKU09OLnBhcnNlIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBrZXlcclxuICAgICAgY29udGVudCA9IGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IGNvcGllZC5zdHJpbmdDb250ZW50XHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBjb3BpZWQubmFtZVxyXG4gICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtkaXJ0eTogdHJ1ZSwgb3BlbmVkQ29udGVudDogY29udGVudC5jbG9uZSgpfVxyXG4gICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IFwiXCJcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIGtleVxyXG4gICAgY2F0Y2ggZVxyXG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGNvcGllZCBmaWxlXCJcclxuXHJcbiAgc2hhcmVHZXRMaW5rOiAtPlxyXG4gICAgQF91aS5zaGFyZURpYWxvZyBAXHJcblxyXG4gIHNoYXJlVXBkYXRlOiAtPlxyXG4gICAgQHNoYXJlKClcclxuXHJcbiAgdG9nZ2xlU2hhcmU6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIEBzdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0IFwic2hhcmVkRG9jdW1lbnRJZFwiXHJcbiAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudD8ucmVtb3ZlIFwiX3Blcm1pc3Npb25zXCJcclxuICAgICAgQHN0YXRlLmN1cnJlbnRDb250ZW50Py5yZW1vdmUgXCJzaGFyZUVkaXRLZXlcIlxyXG4gICAgICBAc3RhdGUuY3VycmVudENvbnRlbnQ/LnJlbW92ZSBcInNoYXJlZERvY3VtZW50SWRcIlxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICd1bnNoYXJlZEZpbGUnLCBAc3RhdGUuY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwge3NoYXJpbmc6IGZhbHNlfVxyXG4gICAgICBjYWxsYmFjaz8gZmFsc2VcclxuICAgIGVsc2VcclxuICAgICAgQHNoYXJlIGNhbGxiYWNrXHJcblxyXG4gIHNoYXJlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAc3RhdGUuc2hhcmVQcm92aWRlclxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICAgIHNoYXJpbmc6IHRydWVcclxuICAgICAgICBjdXJyZW50Q29udGVudCA9IEBfY3JlYXRlT3JVcGRhdGVDdXJyZW50Q29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIuc2hhcmUgY3VycmVudENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgKGVyciwgc2hhcmVkQ29udGVudElkKSA9PlxyXG4gICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NoYXJlZEZpbGUnLCBjdXJyZW50Q29udGVudCwgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjaz8gc2hhcmVkQ29udGVudElkXHJcblxyXG4gIHJldmVydFRvU2hhcmVkOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWQgPSBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgIGlmIGlkIGFuZCBAc3RhdGUuc2hhcmVQcm92aWRlcj9cclxuICAgICAgQHN0YXRlLnNoYXJlUHJvdmlkZXIubG9hZFNoYXJlZENvbnRlbnQgaWQsIChlcnIsIGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQHN0YXRlLmN1cnJlbnRDb250ZW50LmNvcHlNZXRhZGF0YVRvIGNvbnRlbnRcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGEsIHtvcGVuZWRDb250ZW50OiBjb250ZW50LmNsb25lKCl9XHJcbiAgICAgICAgY2FsbGJhY2s/IG51bGxcclxuXHJcbiAgcmV2ZXJ0VG9TaGFyZWREaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIikgYW5kIEBzdGF0ZS5zaGFyZVByb3ZpZGVyPyBhbmQgY29uZmlybSB0ciBcIn5DT05GSVJNLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIEByZXZlcnRUb1NoYXJlZCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIGVudmVsb3BlZENvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBjb250ZW50XHJcbiAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudD8uY29weU1ldGFkYXRhVG8gZW52ZWxvcGVkQ29udGVudFxyXG4gICAgICBAX3VpLmRvd25sb2FkRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgZW52ZWxvcGVkQ29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgZGlydHkgPSBAc3RhdGUuZGlydHlcclxuICAgIF9yZW5hbWUgPSAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBzdGF0ZS5jdXJyZW50Q29udGVudD8uYWRkTWV0YWRhdGEgZG9jTmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdyZW5hbWVkRmlsZScsIEBzdGF0ZS5jdXJyZW50Q29udGVudCwgbWV0YWRhdGEsIHtkaXJ0eTogZGlydHl9LCBAX2dldEhhc2hQYXJhbXMgbWV0YWRhdGFcclxuICAgICAgY2FsbGJhY2s/IG5ld05hbWVcclxuICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGE/Lm5hbWVcclxuICAgICAgaWYgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdyZW5hbWUnXHJcbiAgICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLnJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIChlcnIsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICAgIF9yZW5hbWUgbWV0YWRhdGFcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIG1ldGFkYXRhXHJcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogbmV3TmFtZVxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICBfcmVuYW1lIG1ldGFkYXRhXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkucmVuYW1lRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgKG5ld05hbWUpID0+XHJcbiAgICAgIEByZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFja1xyXG5cclxuICByZXZlcnRUb0xhc3RPcGVuZWQ6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgQHN0YXRlLm9wZW5lZENvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwge29wZW5lZENvbnRlbnQ6IEBzdGF0ZS5vcGVuZWRDb250ZW50LmNsb25lKCl9XHJcblxyXG4gIHJldmVydFRvTGFzdE9wZW5lZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5vcGVuZWRDb250ZW50PyBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGlmIGNvbmZpcm0gdHIgJ35DT05GSVJNLlJFVkVSVF9UT19MQVNUX09QRU5FRCdcclxuICAgICAgICBAcmV2ZXJ0VG9MYXN0T3BlbmVkIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gaW5pdGlhbCBvcGVuZWQgdmVyc2lvbiB3YXMgZm91bmQgZm9yIHRoZSBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXHJcblxyXG4gIGRpcnR5OiAoaXNEaXJ0eSA9IHRydWUpLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgZGlydHk6IGlzRGlydHlcclxuICAgICAgc2F2ZWQ6IGZhbHNlIGlmIGlzRGlydHlcclxuXHJcbiAgYXV0b1NhdmU6IChpbnRlcnZhbCkgLT5cclxuICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBjbGVhckludGVydmFsIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW4gY2FzZSB0aGUgY2FsbGVyIHVzZXMgbWlsbGlzZWNvbmRzXHJcbiAgICBpZiBpbnRlcnZhbCA+IDEwMDBcclxuICAgICAgaW50ZXJ2YWwgPSBNYXRoLnJvdW5kKGludGVydmFsIC8gMTAwMClcclxuICAgIGlmIGludGVydmFsID4gMFxyXG4gICAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCAoPT4gQHNhdmUoKSBpZiBAc3RhdGUuZGlydHkgYW5kIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZScpLCAoaW50ZXJ2YWwgKiAxMDAwKVxyXG5cclxuICBpc0F1dG9TYXZpbmc6IC0+XHJcbiAgICBAX2F1dG9TYXZlSW50ZXJ2YWw/XHJcblxyXG4gIHNob3dCbG9ja2luZ01vZGFsOiAobW9kYWxQcm9wcykgLT5cclxuICAgIEBfdWkuYmxvY2tpbmdNb2RhbCBtb2RhbFByb3BzXHJcblxyXG4gIGdldEN1cnJlbnRVcmw6IChxdWVyeVN0cmluZyA9IG51bGwpIC0+XHJcbiAgICBzdWZmaXggPSBpZiBxdWVyeVN0cmluZz8gdGhlbiBcIj8je3F1ZXJ5U3RyaW5nfVwiIGVsc2UgXCJcIlxyXG4gICAgXCIje2RvY3VtZW50LmxvY2F0aW9uLm9yaWdpbn0je2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSN7c3VmZml4fVwiXHJcblxyXG4gIF9kaWFsb2dTYXZlOiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgc3RyaW5nQ29udGVudCBpc250IG51bGxcclxuICAgICAgQHNhdmVGaWxlIHN0cmluZ0NvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChzdHJpbmdDb250ZW50KSA9PlxyXG4gICAgICAgIEBzYXZlRmlsZSBzdHJpbmdDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2Vycm9yOiAobWVzc2FnZSkgLT5cclxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxyXG4gICAgYWxlcnQgbWVzc2FnZVxyXG5cclxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSwgYWRkaXRpb25hbFN0YXRlPXt9LCBoYXNoUGFyYW1zPW51bGwpIC0+XHJcbiAgICBtZXRhZGF0YT8ub3ZlcndyaXRhYmxlID89IHRydWVcclxuICAgIHN0YXRlID1cclxuICAgICAgY3VycmVudENvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgYWRkaXRpb25hbFN0YXRlXHJcbiAgICAgIHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9zZXRXaW5kb3dUaXRsZSBtZXRhZGF0YT8ubmFtZVxyXG4gICAgaWYgaGFzaFBhcmFtcyBpc250IG51bGxcclxuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBoYXNoUGFyYW1zXHJcbiAgICBAX3NldFN0YXRlIHN0YXRlXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50Py5nZXRUZXh0KCl9XHJcblxyXG4gIF9ldmVudDogKHR5cGUsIGRhdGEgPSB7fSwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXHJcbiAgICBmb3IgbGlzdGVuZXIgaW4gQF9saXN0ZW5lcnNcclxuICAgICAgbGlzdGVuZXIgZXZlbnRcclxuXHJcbiAgX3NldFN0YXRlOiAob3B0aW9ucykgLT5cclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBvcHRpb25zXHJcbiAgICAgIEBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfZXZlbnQgJ3N0YXRlQ2hhbmdlZCdcclxuXHJcbiAgX3Jlc2V0U3RhdGU6IC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIG9wZW5lZENvbnRlbnQ6IG51bGxcclxuICAgICAgY3VycmVudENvbnRlbnQ6IG51bGxcclxuICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuXHJcbiAgX2Nsb3NlQ3VycmVudEZpbGU6IC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2Nsb3NlJ1xyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuY2xvc2UgQHN0YXRlLm1ldGFkYXRhXHJcblxyXG4gIF9jcmVhdGVPclVwZGF0ZUN1cnJlbnRDb250ZW50OiAoc3RyaW5nQ29udGVudCwgbWV0YWRhdGEgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLmN1cnJlbnRDb250ZW50P1xyXG4gICAgICBjdXJyZW50Q29udGVudCA9IEBzdGF0ZS5jdXJyZW50Q29udGVudFxyXG4gICAgICBjdXJyZW50Q29udGVudC5zZXRUZXh0IHN0cmluZ0NvbnRlbnRcclxuICAgIGVsc2VcclxuICAgICAgY3VycmVudENvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBzdHJpbmdDb250ZW50XHJcbiAgICBpZiBtZXRhZGF0YT9cclxuICAgICAgY3VycmVudENvbnRlbnQuYWRkTWV0YWRhdGEgZG9jTmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgY3VycmVudENvbnRlbnRcclxuXHJcbiAgX3NldFdpbmRvd1RpdGxlOiAobmFtZSkgLT5cclxuICAgIGlmIEBhcHBPcHRpb25zPy51aT8ud2luZG93VGl0bGVTdWZmaXhcclxuICAgICAgZG9jdW1lbnQudGl0bGUgPSBcIiN7aWYgbmFtZT8ubGVuZ3RoID4gMCB0aGVuIG5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiKX0je0BhcHBPcHRpb25zLnVpLndpbmRvd1RpdGxlU2VwYXJhdG9yfSN7QGFwcE9wdGlvbnMudWkud2luZG93VGl0bGVTdWZmaXh9XCJcclxuXHJcbiAgX2dldEhhc2hQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuT3BlblNhdmVkKCkgdGhlbiBcIiNmaWxlPSN7bWV0YWRhdGEucHJvdmlkZXIubmFtZX06I3tlbmNvZGVVUklDb21wb25lbnQgbWV0YWRhdGEucHJvdmlkZXIuZ2V0T3BlblNhdmVkUGFyYW1zIG1ldGFkYXRhfVwiIGVsc2UgXCJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5kb2N1bWVudFN0b3JlID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbVwiXHJcbmF1dGhvcml6ZVVybCAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvYXV0aGVudGljYXRlXCJcclxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcclxubGlzdFVybCAgICAgICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvYWxsXCJcclxubG9hZERvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvb3BlblwiXHJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxyXG5wYXRjaERvY3VtZW50VXJsICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9wYXRjaFwiXHJcbnJlbW92ZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2RlbGV0ZVwiXHJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcbmppZmYgPSByZXF1aXJlICdqaWZmJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZG9jU3RvcmVBdmFpbGFibGU6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fb25Eb2NTdG9yZUxvYWRlZCA9PlxyXG4gICAgICBAc2V0U3RhdGUgZG9jU3RvcmVBdmFpbGFibGU6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWF1dGgnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtY29uY29yZC1sb2dvJ30sICcnKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1mb290ZXInfSxcclxuICAgICAgICBpZiBAc3RhdGUuZG9jU3RvcmVBdmFpbGFibGVcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnTG9naW4gdG8gQ29uY29yZCcpXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byBDb25jb3JkLi4uJ1xyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgc2hhcmU6IHRydWVcclxuICAgICAgICBjbG9zZTogZmFsc2VcclxuXHJcbiAgICBAdXNlciA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xyXG5cclxuICBwcmV2aW91c2x5U2F2ZWRDb250ZW50OiBudWxsXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgIGVsc2VcclxuICAgICAgQHVzZXIgaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogLT5cclxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcclxuXHJcbiAgX29uRG9jU3RvcmVMb2FkZWQ6IChAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaykgLT5cclxuICAgIGlmIEBfZG9jU3RvcmVMb2FkZWRcclxuICAgICAgQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5TdWNjZXNzZnVsOiAoQHVzZXIpIC0+XHJcbiAgICBAX2xvZ2luV2luZG93Py5jbG9zZSgpXHJcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuXHJcbiAgX2NoZWNrTG9naW46IC0+XHJcbiAgICBwcm92aWRlciA9IEBcclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG4gICAgICAgIHByb3ZpZGVyLl9sb2dpblN1Y2Nlc3NmdWwoZGF0YSlcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpbldpbmRvdzogbnVsbFxyXG5cclxuICBfc2hvd0xvZ2luV2luZG93OiAtPlxyXG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXHJcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxyXG4gICAgZWxzZVxyXG5cclxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XHJcbiAgICAgICAgc2NyZWVuTGVmdCA9IHdpbmRvdy5zY3JlZW5MZWZ0IG9yIHNjcmVlbi5sZWZ0XHJcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcclxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcclxuICAgICAgICBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBzY3JlZW4uaGVpZ2h0XHJcblxyXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcclxuICAgICAgICB0b3AgPSAoKGhlaWdodCAvIDIpIC0gKGggLyAyKSkgKyBzY3JlZW5Ub3BcclxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cclxuXHJcbiAgICAgIHdpZHRoID0gMTAwMFxyXG4gICAgICBoZWlnaHQgPSA0ODBcclxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxyXG4gICAgICB3aW5kb3dGZWF0dXJlcyA9IFtcclxuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXHJcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XHJcbiAgICAgICAgJ3RvcD0nICsgcG9zaXRpb24udG9wIG9yIDIwMFxyXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxyXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xyXG4gICAgICAgICdyZXNpemFibGU9bm8nXHJcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xyXG4gICAgICAgICdkaWFsb2c9eWVzJ1xyXG4gICAgICAgICdtZW51YmFyPW5vJ1xyXG4gICAgICBdXHJcblxyXG4gICAgICBAX2xvZ2luV2luZG93ID0gd2luZG93Lm9wZW4oYXV0aG9yaXplVXJsLCAnYXV0aCcsIHdpbmRvd0ZlYXR1cmVzLmpvaW4oKSlcclxuXHJcbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxyXG4gICAgICAgIHRyeVxyXG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwgcG9sbFxyXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcclxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgICAgICBjYXRjaCBlXHJcbiAgICAgICAgICAjIGNvbnNvbGUubG9nIGVcclxuXHJcbiAgICAgIHBvbGwgPSBzZXRJbnRlcnZhbCBwb2xsQWN0aW9uLCAyMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEAsIGF1dGhDYWxsYmFjazogQGF1dGhDYWxsYmFja30pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBpZiBAdXNlclxyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogbGlzdFVybFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIG93biBrZXksIGZpbGUgb2YgZGF0YVxyXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZVxyXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6IHtpZDogZmlsZS5pZH1cclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxyXG5cclxuICBsb2FkU2hhcmVkQ29udGVudDogKGlkLCBjYWxsYmFjaykgLT5cclxuICAgIHNoYXJlZE1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgc2hhcmVkQ29udGVudElkOiBpZFxyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgb3ZlcndyaXRhYmxlOiBmYWxzZVxyXG4gICAgQGxvYWQgc2hhcmVkTWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpIC0+XHJcbiAgICAgIGNhbGxiYWNrIGVyciwgY29udGVudCwgc2hhcmVkTWV0YWRhdGFcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHdpdGhDcmVkZW50aWFscyA9IHVubGVzcyBtZXRhZGF0YS5zaGFyZWRDb250ZW50SWQgdGhlbiB0cnVlIGVsc2UgZmFsc2VcclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IGxvYWREb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkIG9yIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB7d2l0aENyZWRlbnRpYWxzfVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjb250ZW50ID0gY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgZGF0YVxyXG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjb250ZW50LmNsb25lKClcclxuICAgICAgICBtZXRhZGF0YS5uYW1lID89IGRhdGEuZG9jTmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGNvbnRlbnRcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgbWVzc2FnZSA9IGlmIG1ldGFkYXRhLnNoYXJlZENvbnRlbnRJZFxyXG4gICAgICAgICAgXCJVbmFibGUgdG8gbG9hZCBkb2N1bWVudCAnI3ttZXRhZGF0YS5zaGFyZWRDb250ZW50SWR9Jy4gUGVyaGFwcyB0aGUgZmlsZSB3YXMgbm90IHNoYXJlZD9cIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIFwiVW5hYmxlIHRvIGxvYWQgI3ttZXRhZGF0YS5uYW1lIG9yIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWQgb3IgJ2ZpbGUnfVwiXHJcbiAgICAgICAgY2FsbGJhY2sgbWVzc2FnZVxyXG5cclxuICBzaGFyZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJ1bktleSA9IGNvbnRlbnQuZ2V0KFwic2hhcmVFZGl0S2V5XCIpIG9yIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygyKVxyXG5cclxuICAgIHBhcmFtcyA9XHJcbiAgICAgIHJ1bktleTogcnVuS2V5XHJcblxyXG4gICAgaWYgY29udGVudC5nZXQoXCJzaGFyZWREb2N1bWVudElkXCIpXHJcbiAgICAgIHBhcmFtcy5yZWNvcmRpZCA9IGNvbnRlbnQuZ2V0KFwic2hhcmVkRG9jdW1lbnRJZFwiKVxyXG5cclxuICAgIGNvbnRlbnQuYWRkTWV0YWRhdGFcclxuICAgICAgX3Blcm1pc3Npb25zOiAxXHJcbiAgICAgIHNoYXJlRWRpdEtleTogbnVsbCAgICAgICAgICAgICMgc3RyaXAgdGhlc2Ugb3V0IG9mIHRoZSBzaGFyZWQgZGF0YSBpZiB0aGV5XHJcbiAgICAgIHNoYXJlZERvY3VtZW50SWQ6IG51bGwgICAgICAgICMgZXhpc3QgKHRoZXknbGwgYmUgcmUtYWRkZWQgb24gc3VjY2VzcylcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhzYXZlRG9jdW1lbnRVcmwsIHBhcmFtcylcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNvbnRlbnQuYWRkTWV0YWRhdGFcclxuICAgICAgICAgIHNoYXJlZERvY3VtZW50SWQ6IGRhdGEuaWRcclxuICAgICAgICAgIHNoYXJlRWRpdEtleTogcnVuS2V5XHJcbiAgICAgICAgICBfcGVybWlzc2lvbnM6IDBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhLmlkXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBzYXZlOiAoY2xvdWRDb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBjb250ZW50ID0gY2xvdWRDb250ZW50LmdldENvbnRlbnQoKVxyXG5cclxuICAgIHBhcmFtcyA9IHt9XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgdGhlbiBwYXJhbXMucmVjb3JkaWQgPSBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuXHJcbiAgICAjIFNlZSBpZiB3ZSBjYW4gcGF0Y2hcclxuICAgIGNhbk92ZXJ3cml0ZSA9IG1ldGFkYXRhLm92ZXJ3cml0YWJsZSBhbmQgQHByZXZpb3VzbHlTYXZlZENvbnRlbnQ/XHJcbiAgICBpZiBjYW5PdmVyd3JpdGUgYW5kIGRpZmYgPSBAX2NyZWF0ZURpZmYgQHByZXZpb3VzbHlTYXZlZENvbnRlbnQuZ2V0Q29udGVudCgpLCBjb250ZW50XHJcbiAgICAgIHNlbmRDb250ZW50ID0gZGlmZlxyXG4gICAgICB1cmwgPSBwYXRjaERvY3VtZW50VXJsXHJcbiAgICBlbHNlXHJcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgdGhlbiBwYXJhbXMucmVjb3JkbmFtZSA9IG1ldGFkYXRhLm5hbWVcclxuICAgICAgdXJsID0gc2F2ZURvY3VtZW50VXJsXHJcbiAgICAgIHNlbmRDb250ZW50ID0gY29udGVudFxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHVybCwgcGFyYW1zKVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5IHNlbmRDb250ZW50XHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBpZiBAb3B0aW9ucy5wYXRjaCB0aGVuIEBwcmV2aW91c2x5U2F2ZWRDb250ZW50ID0gY2xvdWRDb250ZW50LmNsb25lKClcclxuICAgICAgICBpZiBkYXRhLmlkIHRoZW4gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkID0gZGF0YS5pZFxyXG5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiByZW1vdmVEb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZG5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbmFtZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIG5ld1JlY29yZG5hbWU6IG5ld05hbWVcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gcmVuYW1lIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgb3BlblNhdmVkOiAob3BlblNhdmVkUGFyYW1zLCBjYWxsYmFjaykgLT5cclxuICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICBpZDogb3BlblNhdmVkUGFyYW1zXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG5cclxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XHJcbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcclxuICAgIGt2cCA9IFtdXHJcbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcclxuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcclxuICAgIHJldHVybiB1cmwgKyBcIj9cIiArIGt2cC5qb2luIFwiJlwiXHJcblxyXG4gIF9jcmVhdGVEaWZmOiAob2JqMSwgb2JqMikgLT5cclxuICAgIHRyeVxyXG4gICAgICBvcHRzID1cclxuICAgICAgICBoYXNoOiBAb3B0aW9ucy5wYXRjaE9iamVjdEhhc2ggaWYgdHlwZW9mIEBvcHRpb25zLnBhdGNoT2JqZWN0SGFzaCBpcyBcImZ1bmN0aW9uXCJcclxuICAgICAgIyBjbGVhbiBvYmplY3RzIGJlZm9yZSBkaWZmaW5nXHJcbiAgICAgIGNsZWFuZWRPYmoxID0gSlNPTi5wYXJzZSBKU09OLnN0cmluZ2lmeSBvYmoxXHJcbiAgICAgIGNsZWFuZWRPYmoyID0gSlNPTi5wYXJzZSBKU09OLnN0cmluZ2lmeSBvYmoyXHJcbiAgICAgIGRpZmYgPSBqaWZmLmRpZmYoY2xlYW5lZE9iajEsIGNsZWFuZWRPYmoyLCBvcHRzKVxyXG4gICAgICByZXR1cm4gZGlmZlxyXG4gICAgY2F0Y2hcclxuICAgICAgcmV0dXJuIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuanNkaWZmID0gcmVxdWlyZSAnZGlmZidcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuY2xvdWRDb250ZW50RmFjdG9yeSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLmNsb3VkQ29udGVudEZhY3RvcnlcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0dvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGVkR0FQSTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9sb2FkZWRHQVBJID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2dvb2dsZS1kcml2ZS1hdXRoJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2dvb2dsZS1kcml2ZS1jb25jb3JkLWxvZ28nfSwgJycpXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2dvb2dsZS1kcml2ZS1mb290ZXInfSxcclxuICAgICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdMb2dpbiB0byBHb29nbGUnKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICdUcnlpbmcgdG8gbG9nIGludG8gR29vZ2xlLi4uJ1xyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5jbGFzcyBHb29nbGVEcml2ZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogR29vZ2xlRHJpdmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgY2xvc2U6IHRydWVcclxuXHJcbiAgICBAYXV0aFRva2VuID0gbnVsbFxyXG4gICAgQHVzZXIgPSBudWxsXHJcbiAgICBAY2xpZW50SWQgPSBAb3B0aW9ucy5jbGllbnRJZFxyXG4gICAgaWYgbm90IEBjbGllbnRJZFxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ01pc3NpbmcgcmVxdWlyZWQgY2xpZW50SWQgaW4gZ29vZ2xlRHJpdmUgcHJvdmlkZXIgb3B0aW9ucydcclxuICAgIEBtaW1lVHlwZSA9IEBvcHRpb25zLm1pbWVUeXBlIG9yIFwidGV4dC9wbGFpblwiXHJcbiAgICBAdXNlUmVhbFRpbWVBUEkgPSBAb3B0aW9ucy51c2VSZWFsVGltZUFQSSBvciBmYWxzZVxyXG4gICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgIEBtaW1lVHlwZSArPSAnK2NmbV9yZWFsdGltZSdcclxuICAgIEBfbG9hZEdBUEkoKVxyXG5cclxuICBATmFtZTogJ2dvb2dsZURyaXZlJ1xyXG5cclxuICAjIGFsaWFzZXMgZm9yIGJvb2xlYW4gcGFyYW1ldGVyIHRvIGF1dGhvcml6ZVxyXG4gIEBJTU1FRElBVEUgPSB0cnVlXHJcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG4gICAgZWxzZVxyXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IChpbW1lZGlhdGUpIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgYXJncyA9XHJcbiAgICAgICAgY2xpZW50X2lkOiBAY2xpZW50SWRcclxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXHJcbiAgICAgICAgaW1tZWRpYXRlOiBpbW1lZGlhdGVcclxuICAgICAgZ2FwaS5hdXRoLmF1dGhvcml6ZSBhcmdzLCAoYXV0aFRva2VuKSA9PlxyXG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXHJcbiAgICAgICAgQHVzZXIgPSBudWxsXHJcbiAgICAgICAgQGF1dG9SZW5ld1Rva2VuIEBhdXRoVG9rZW5cclxuICAgICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5vYXV0aDIudXNlcmluZm8uZ2V0KCkuZXhlY3V0ZSAodXNlcikgPT5cclxuICAgICAgICAgICAgQHVzZXIgPSB1c2VyXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxyXG5cclxuICBhdXRvUmVuZXdUb2tlbjogKGF1dGhUb2tlbikgLT5cclxuICAgIGlmIEBfYXV0b1JlbmV3VGltZW91dFxyXG4gICAgICBjbGVhclRpbWVvdXQgQF9hdXRvUmVuZXdUaW1lb3V0XHJcbiAgICBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3JcclxuICAgICAgQF9hdXRvUmVuZXdUaW1lb3V0ID0gc2V0VGltZW91dCAoPT4gQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURSksIChwYXJzZUludChhdXRoVG9rZW4uZXhwaXJlc19pbiwgMTApICogMC43NSkgKiAxMDAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBpZiBAdXNlclxyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2dkcml2ZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIHNhdmU6ICAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGlmIEB1c2VSZWFsVGltZUFQSVxyXG4gICAgICAgIEBfc2F2ZVJlYWxUaW1lRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfc2F2ZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgaWYgQHVzZVJlYWxUaW1lQVBJXHJcbiAgICAgICAgQF9sb2FkT3JDcmVhdGVSZWFsVGltZUZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX2xvYWRGaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XHJcbiAgICAgICAgcTogcXVlcnkgPSBcIigobWltZVR5cGUgPSAnI3tAbWltZVR5cGV9Jykgb3IgKG1pbWVUeXBlID0gJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInKSkgYW5kICcje2lmIG1ldGFkYXRhIHRoZW4gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfScgaW4gcGFyZW50c1wiXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaygnVW5hYmxlIHRvIGxpc3QgZmlsZXMnKSBpZiBub3QgcmVzdWx0XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIGl0ZW0gaW4gcmVzdWx0Py5pdGVtc1xyXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0udGl0bGVcclxuICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwYXJlbnQ6IG1ldGFkYXRhXHJcbiAgICAgICAgICAgIG92ZXJ3cml0YWJsZTogaXRlbS5lZGl0YWJsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcclxuICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+XHJcbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIHJldHVybiAtMSBpZiBsb3dlckEgPCBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLnBhdGNoXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICByZXNvdXJjZTpcclxuICAgICAgICAgIHRpdGxlOiBuZXdOYW1lXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIHJlc3VsdD8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrPyByZXN1bHQuZXJyb3JcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuXHJcbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LnJlYWxUaW1lPy5kb2M/XHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5yZWFsVGltZS5kb2MuY2xvc2UoKVxyXG5cclxuICBvcGVuU2F2ZWQ6IChvcGVuU2F2ZWRQYXJhbXMsIGNhbGxiYWNrKSAtPlxyXG4gICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgIGlkOiBvcGVuU2F2ZWRQYXJhbXNcclxuICAgIEBsb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSAtPlxyXG4gICAgICBjYWxsYmFjayBlcnIsIGNvbnRlbnQsIG1ldGFkYXRhXHJcblxyXG4gIGdldE9wZW5TYXZlZFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcblxyXG4gIF9sb2FkR0FQSTogLT5cclxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXHJcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXHJcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XHJcbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcclxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xyXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXHJcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XHJcblxyXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzXHJcbiAgICAgIGNhbGxiYWNrKClcclxuICAgIGVsc2VcclxuICAgICAgc2VsZiA9IEBcclxuICAgICAgY2hlY2sgPSAtPlxyXG4gICAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnZHJpdmUnLCAndjInLCAtPlxyXG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxyXG4gICAgICAgICAgICAgIGdhcGkubG9hZCAnZHJpdmUtcmVhbHRpbWUnLCAtPlxyXG4gICAgICAgICAgICAgICAgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50cyA9IHRydWVcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcbiAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcblxyXG4gIF9sb2FkRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gZmlsZS50aXRsZVxyXG4gICAgICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IGZpbGUuZWRpdGFibGVcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEgPSBpZDogZmlsZS5pZFxyXG4gICAgICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICAgICAgeGhyLm9wZW4gJ0dFVCcsIGZpbGUuZG93bmxvYWRVcmxcclxuICAgICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAnQXV0aG9yaXphdGlvbicsIFwiQmVhcmVyICN7QGF1dGhUb2tlbi5hY2Nlc3NfdG9rZW59XCJcclxuICAgICAgICB4aHIub25sb2FkID0gLT5cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGNsb3VkQ29udGVudEZhY3RvcnkuY3JlYXRlRW52ZWxvcGVkQ2xvdWRDb250ZW50IHhoci5yZXNwb25zZVRleHRcclxuICAgICAgICB4aHIub25lcnJvciA9IC0+XHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBkb3dubG9hZCAje3VybH1cIlxyXG4gICAgICAgIHhoci5zZW5kKClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrIEBfYXBpRXJyb3IgZmlsZSwgJ1VuYWJsZSB0byBnZXQgZG93bmxvYWQgdXJsJ1xyXG5cclxuICBfc2F2ZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBib3VuZGFyeSA9ICctLS0tLS0tMzE0MTU5MjY1MzU4OTc5MzIzODQ2J1xyXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnlcclxuICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxyXG4gICAgICBwYXJlbnRzOiBbe2lkOiBpZiBtZXRhZGF0YS5wYXJlbnQ/LnByb3ZpZGVyRGF0YT8uaWQ/IHRoZW4gbWV0YWRhdGEucGFyZW50LnByb3ZpZGVyRGF0YS5pZCBlbHNlICdyb290J31dXHJcblxyXG4gICAgW21ldGhvZCwgcGF0aF0gPSBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxyXG4gICAgZWxzZVxyXG4gICAgICBbJ1BPU1QnLCAnL3VwbG9hZC9kcml2ZS92Mi9maWxlcyddXHJcblxyXG4gICAgYm9keSA9IFtcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuI3toZWFkZXJ9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50LmdldENvbnRlbnRBc0pTT04oKX1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9LS1cIlxyXG4gICAgXS5qb2luICcnXHJcblxyXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LnJlcXVlc3RcclxuICAgICAgcGF0aDogcGF0aFxyXG4gICAgICBtZXRob2Q6IG1ldGhvZFxyXG4gICAgICBwYXJhbXM6IHt1cGxvYWRUeXBlOiAnbXVsdGlwYXJ0J31cclxuICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PVwiJyArIGJvdW5kYXJ5ICsgJ1wiJ31cclxuICAgICAgYm9keTogYm9keVxyXG5cclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgaWYgY2FsbGJhY2tcclxuICAgICAgICBpZiBmaWxlPy5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2sgXCJVbmFibGVkIHRvIHVwbG9hZCBmaWxlOiAje2ZpbGUuZXJyb3IubWVzc2FnZX1cIlxyXG4gICAgICAgIGVsc2UgaWYgZmlsZVxyXG4gICAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhID0gaWQ6IGZpbGUuaWRcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayBAX2FwaUVycm9yIGZpbGUsICdVbmFibGVkIHRvIHVwbG9hZCBmaWxlJ1xyXG5cclxuICBfbG9hZE9yQ3JlYXRlUmVhbFRpbWVGaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgc2VsZiA9IEBcclxuICAgIGZpbGVMb2FkZWQgPSAoZG9jKSAtPlxyXG4gICAgICBjb250ZW50ID0gZG9jLmdldE1vZGVsKCkuZ2V0Um9vdCgpLmdldCAnY29udGVudCdcclxuICAgICAgaWYgbWV0YWRhdGEub3ZlcndyaXRhYmxlXHJcbiAgICAgICAgdGhyb3dFcnJvciA9IChlKSAtPlxyXG4gICAgICAgICAgaWYgbm90IGUuaXNMb2NhbCBhbmQgZS5zZXNzaW9uSWQgaXNudCBtZXRhZGF0YS5wcm92aWRlckRhdGEucmVhbFRpbWUuc2Vzc2lvbklkXHJcbiAgICAgICAgICAgIHNlbGYuY2xpZW50LnNob3dCbG9ja2luZ01vZGFsXHJcbiAgICAgICAgICAgICAgdGl0bGU6ICdDb25jdXJyZW50IEVkaXQgTG9jaydcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnQW4gZWRpdCB3YXMgbWFkZSB0byB0aGlzIGZpbGUgZnJvbSBhbm90aGVyIGJyb3dzZXIgd2luZG93LiBUaGlzIGFwcCBpcyBub3cgbG9ja2VkIGZvciBpbnB1dC4nXHJcbiAgICAgICAgY29udGVudC5hZGRFdmVudExpc3RlbmVyIGdhcGkuZHJpdmUucmVhbHRpbWUuRXZlbnRUeXBlLlRFWFRfSU5TRVJURUQsIHRocm93RXJyb3JcclxuICAgICAgICBjb250ZW50LmFkZEV2ZW50TGlzdGVuZXIgZ2FwaS5kcml2ZS5yZWFsdGltZS5FdmVudFR5cGUuVEVYVF9ERUxFVEVELCB0aHJvd0Vycm9yXHJcbiAgICAgIGZvciBjb2xsYWJvcmF0b3IgaW4gZG9jLmdldENvbGxhYm9yYXRvcnMoKVxyXG4gICAgICAgIHNlc3Npb25JZCA9IGNvbGxhYm9yYXRvci5zZXNzaW9uSWQgaWYgY29sbGFib3JhdG9yLmlzTWVcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lID1cclxuICAgICAgICBkb2M6IGRvY1xyXG4gICAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgICBzZXNzaW9uSWQ6IHNlc3Npb25JZFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBjb250ZW50LmdldFRleHQoKVxyXG5cclxuICAgIGluaXQgPSAobW9kZWwpIC0+XHJcbiAgICAgIGNvbnRlbnQgPSBtb2RlbC5jcmVhdGVTdHJpbmcgJydcclxuICAgICAgbW9kZWwuZ2V0Um9vdCgpLnNldCAnY29udGVudCcsIGNvbnRlbnRcclxuXHJcbiAgICBlcnJvciA9IChlcnIpID0+XHJcbiAgICAgIGlmIGVyci50eXBlIGlzICdUT0tFTl9SRUZSRVNIX1JFUVVJUkVEJ1xyXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGFsZXJ0IGVyci5tZXNzYWdlXHJcblxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZ2V0XHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIGVsc2VcclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmluc2VydFxyXG4gICAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxyXG4gICAgICAgIHBhcmVudHM6IFt7aWQ6IGlmIG1ldGFkYXRhLnBhcmVudD8ucHJvdmlkZXJEYXRhPy5pZD8gdGhlbiBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmlkIGVsc2UgJ3Jvb3QnfV1cclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XHJcbiAgICAgIGlmIGZpbGU/LmlkXHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IGZpbGUudGl0bGVcclxuICAgICAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSBmaWxlLmVkaXRhYmxlXHJcbiAgICAgICAgbWV0YWRhdGEucHJvdmlkZXJEYXRhID0gaWQ6IGZpbGUuaWRcclxuICAgICAgICBnYXBpLmRyaXZlLnJlYWx0aW1lLmxvYWQgZmlsZS5pZCwgZmlsZUxvYWRlZCwgaW5pdCwgZXJyb3JcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrIEBfYXBpRXJyb3IgZmlsZSwgJ1VuYWJsZSB0byBsb2FkIGZpbGUnXHJcblxyXG4gIF9zYXZlUmVhbFRpbWVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5tb2RlbFxyXG4gICAgICBAX2RpZmZBbmRVcGRhdGVSZWFsVGltZU1vZGVsIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAX2xvYWRPckNyZWF0ZVJlYWxUaW1lRmlsZSBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICAgIEBfZGlmZkFuZFVwZGF0ZVJlYWxUaW1lTW9kZWwgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9kaWZmQW5kVXBkYXRlUmVhbFRpbWVNb2RlbDogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGluZGV4ID0gMFxyXG4gICAgcmVhbFRpbWVDb250ZW50ID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLnJlYWxUaW1lLmNvbnRlbnRcclxuICAgIGRpZmZzID0ganNkaWZmLmRpZmZDaGFycyByZWFsVGltZUNvbnRlbnQuZ2V0VGV4dCgpLCBjb250ZW50LmdldENvbnRlbnRBc0pTT04oKVxyXG4gICAgZm9yIGRpZmYgaW4gZGlmZnNcclxuICAgICAgaWYgZGlmZi5yZW1vdmVkXHJcbiAgICAgICAgcmVhbFRpbWVDb250ZW50LnJlbW92ZVJhbmdlIGluZGV4LCBpbmRleCArIGRpZmYudmFsdWUubGVuZ3RoXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBkaWZmLmFkZGVkXHJcbiAgICAgICAgICByZWFsVGltZUNvbnRlbnQuaW5zZXJ0U3RyaW5nIGluZGV4LCBkaWZmLnZhbHVlXHJcbiAgICAgICAgaW5kZXggKz0gZGlmZi5jb3VudFxyXG4gICAgY2FsbGJhY2sgbnVsbFxyXG5cclxuICBfYXBpRXJyb3I6IChyZXN1bHQsIHByZWZpeCkgLT5cclxuICAgIGlmIHJlc3VsdD8ubWVzc2FnZT9cclxuICAgICAgXCIje3ByZWZpeH06ICN7cmVzdWx0Lm1lc3NhZ2V9XCJcclxuICAgIGVsc2VcclxuICAgICAgcHJlZml4XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcclxuIiwie2RpdiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkxvY2FsRmlsZUxpc3RUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4uL3ZpZXdzL2xvY2FsLWZpbGUtdGFiLXZpZXcnXHJcblxyXG5jbGFzcyBMb2NhbEZpbGVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSwgQGNsaWVudCkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsRmlsZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX0ZJTEUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxGaWxlJ1xyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgaWYgY2FwYWJpbGl0eSBpcyAnbGlzdCdcclxuICAgICAgTG9jYWxGaWxlTGlzdFRhYlxyXG4gICAgZWxzZVxyXG4gICAgICBkZWZhdWx0Q29tcG9uZW50XHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAjIG5vIHJlYWxseSBpbXBsZW1lbnRlZCAtIHdlIGZsYWcgaXQgYXMgaW1wbGVtZW50ZWQgc28gd2Ugc2hvdyBpbiB0aGUgbGlzdCBkaWFsb2dcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcclxuICAgIHJlYWRlci5vbmxvYWQgPSAobG9hZGVkKSAtPlxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBsb2FkZWQudGFyZ2V0LnJlc3VsdFxyXG4gICAgcmVhZGVyLnJlYWRBc1RleHQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmZpbGVcclxuXHJcbiAgY2FuT3BlblNhdmVkOiAtPlxyXG4gICAgIyB0aGlzIHByZXZlbnRzIHRoZSBoYXNoIHRvIGJlIHVwZGF0ZWRcclxuICAgIGZhbHNlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsRmlsZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5jbG91ZENvbnRlbnRGYWN0b3J5ID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuY2xvdWRDb250ZW50RmFjdG9yeVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30sIEBjbGllbnQpIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG4gICAgICAgIGNsb3NlOiBmYWxzZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBmaWxlS2V5ID0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIGZpbGVLZXksIGNvbnRlbnQuZ2V0Q29udGVudEFzSlNPTigpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaCBlXHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHNhdmU6ICN7ZS5tZXNzYWdlfVwiXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY2xvdWRDb250ZW50RmFjdG9yeS5jcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgIGNhdGNoIGVcclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZDogI3tlLm1lc3NhZ2V9XCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgKG1ldGFkYXRhPy5wYXRoKCkgb3IgW10pLmpvaW4gJy8nXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW2ZpbGVuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbmFtZSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IG5hbWVcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHBhcmVudDogbWV0YWRhdGFcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byByZW5hbWUnXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IG9wZW5TYXZlZFBhcmFtc1xyXG4gICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgcGFyZW50OiBudWxsXHJcbiAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBAbG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgLT5cclxuICAgICAgY2FsbGJhY2sgZXJyLCBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBnZXRPcGVuU2F2ZWRQYXJhbXM6IChtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLm5hbWVcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWUucmVwbGFjZSAvXFx0L2csICcgJ31cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAdHlwZSwgQHByb3ZpZGVyID0gbnVsbCwgQHBhcmVudCA9IG51bGwsIEBwcm92aWRlckRhdGE9e30sIEBvdmVyd3JpdGFibGUsIEBzaGFyZWRDb250ZW50SWQsIEBzaGFyZWRDb250ZW50U2VjcmV0S2V5fSA9IG9wdGlvbnNcclxuICBARm9sZGVyOiAnZm9sZGVyJ1xyXG4gIEBGaWxlOiAnZmlsZSdcclxuXHJcbiAgcGF0aDogLT5cclxuICAgIF9wYXRoID0gW11cclxuICAgIHBhcmVudCA9IEBwYXJlbnRcclxuICAgIHdoaWxlIHBhcmVudCBpc250IG51bGxcclxuICAgICAgX3BhdGgudW5zaGlmdCBwYXJlbnRcclxuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudFxyXG4gICAgX3BhdGhcclxuXHJcbiMgc2luZ2xldG9uIHRoYXQgY2FuIGNyZWF0ZSBDbG91ZENvbnRlbnQgd3JhcHBlZCB3aXRoIGdsb2JhbCBvcHRpb25zXHJcbmNsYXNzIENsb3VkQ29udGVudEZhY3RvcnlcclxuICBjb25zdHJ1Y3RvcjogLT5cclxuICAgIEBlbnZlbG9wZU1ldGFkYXRhID0ge31cclxuXHJcbiAgIyBzZXQgaW5pdGlhbCBlbnZlbG9wZU1ldGFkYXRhIG9yIHVwZGF0ZSBpbmRpdmlkdWFsIHByb3BlcnRpZXNcclxuICBzZXRFbnZlbG9wZU1ldGFkYXRhOiAoZW52ZWxvcGVNZXRhZGF0YSkgLT5cclxuICAgIGZvciBrZXkgb2YgZW52ZWxvcGVNZXRhZGF0YVxyXG4gICAgICBAZW52ZWxvcGVNZXRhZGF0YVtrZXldID0gZW52ZWxvcGVNZXRhZGF0YVtrZXldXHJcblxyXG4gICMgcmV0dXJucyBuZXcgQ2xvdWRDb250ZW50IGNvbnRhaW5pbmcgZW52ZWxvcGVkIGRhdGFcclxuICBjcmVhdGVFbnZlbG9wZWRDbG91ZENvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgbmV3IENsb3VkQ29udGVudCBAZW52ZWxvcENvbnRlbnQgY29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgd2l0aCBtZXRhZGF0YSwgcmV0dXJucyBhbiBvYmplY3QuXHJcbiAgIyBJZiBjb250ZW50IHdhcyBhbHJlYWR5IGFuIG9iamVjdCAoT2JqZWN0IG9yIEpTT04pIHdpdGggbWV0YWRhdGEsXHJcbiAgIyBhbnkgZXhpc3RpbmcgbWV0YWRhdGEgd2lsbCBiZSByZXRhaW5lZC5cclxuICAjIE5vdGU6IGNhbGxpbmcgYGVudmVsb3BDb250ZW50YCBtYXkgYmUgc2FmZWx5IGNhbGxlZCBvbiBzb21ldGhpbmcgdGhhdFxyXG4gICMgaGFzIGFscmVhZHkgaGFkIGBlbnZlbG9wQ29udGVudGAgY2FsbGVkIG9uIGl0LCBhbmQgd2lsbCBiZSBhIG5vLW9wLlxyXG4gIGVudmVsb3BDb250ZW50OiAoY29udGVudCkgLT5cclxuICAgIGVudmVsb3BlZENsb3VkQ29udGVudCA9IEBfd3JhcElmTmVlZGVkIGNvbnRlbnRcclxuICAgIGZvciBrZXkgb2YgQGVudmVsb3BlTWV0YWRhdGFcclxuICAgICAgZW52ZWxvcGVkQ2xvdWRDb250ZW50W2tleV0gPz0gQGVudmVsb3BlTWV0YWRhdGFba2V5XVxyXG4gICAgcmV0dXJuIGVudmVsb3BlZENsb3VkQ29udGVudFxyXG5cclxuICAjIGVudmVsb3BzIGNvbnRlbnQgaW4ge2NvbnRlbnQ6IGNvbnRlbnR9IGlmIG5lZWRlZCwgcmV0dXJucyBhbiBvYmplY3RcclxuICBfd3JhcElmTmVlZGVkOiAoY29udGVudCkgLT5cclxuICAgIGlmIGlzU3RyaW5nIGNvbnRlbnRcclxuICAgICAgdHJ5IGNvbnRlbnQgPSBKU09OLnBhcnNlIGNvbnRlbnRcclxuICAgIGlmIGNvbnRlbnQuY29udGVudD9cclxuICAgICAgcmV0dXJuIGNvbnRlbnRcclxuICAgIGVsc2VcclxuICAgICAgcmV0dXJuIHtjb250ZW50fVxyXG5cclxuY2xhc3MgQ2xvdWRDb250ZW50XHJcbiAgY29uc3RydWN0b3I6IChAXyA9IHt9KSAtPlxyXG5cclxuICBnZXRDb250ZW50OiAtPiBAX1xyXG4gIGdldENvbnRlbnRBc0pTT046ICAtPiBKU09OLnN0cmluZ2lmeSBAX1xyXG5cclxuICBjbG9uZTogLT4gbmV3IENsb3VkQ29udGVudCBfLmNsb25lRGVlcCBAX1xyXG5cclxuICBzZXRUZXh0OiAodGV4dCkgLT4gQF8uY29udGVudCA9IHRleHRcclxuICBnZXRUZXh0OiAtPiBpZiBAXy5jb250ZW50IGlzIG51bGwgdGhlbiAnJyBlbHNlIGlmIGlzU3RyaW5nKEBfLmNvbnRlbnQpIHRoZW4gQF8uY29udGVudCBlbHNlIEpTT04uc3RyaW5naWZ5IEBfLmNvbnRlbnRcclxuXHJcbiAgYWRkTWV0YWRhdGE6IChtZXRhZGF0YSkgLT4gQF9ba2V5XSA9IG1ldGFkYXRhW2tleV0gZm9yIGtleSBvZiBtZXRhZGF0YVxyXG4gIGdldDogKHByb3ApIC0+IEBfW3Byb3BdXHJcbiAgcmVtb3ZlOiAocHJvcCkgLT4gZGVsZXRlIEBfW3Byb3BdXHJcblxyXG4gIGNvcHlNZXRhZGF0YVRvOiAodG8pIC0+XHJcbiAgICBtZXRhZGF0YSA9IHt9XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgQF9cclxuICAgICAgaWYga2V5IGlzbnQgJ2NvbnRlbnQnXHJcbiAgICAgICAgbWV0YWRhdGFba2V5XSA9IHZhbHVlXHJcbiAgICB0by5hZGRNZXRhZGF0YSBtZXRhZGF0YVxyXG5cclxuY2xhc3MgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAZGlzcGxheU5hbWUsIEBjYXBhYmlsaXRpZXN9ID0gb3B0aW9uc1xyXG5cclxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXHJcblxyXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XHJcbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgIGNhbGxiYWNrIHRydWVcclxuICAgIGVsc2VcclxuICAgICAgdHJ1ZVxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgbnVsbFxyXG5cclxuICBmaWx0ZXJUYWJDb21wb25lbnQ6IChjYXBhYmlsaXR5LCBkZWZhdWx0Q29tcG9uZW50KSAtPlxyXG4gICAgZGVmYXVsdENvbXBvbmVudFxyXG5cclxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXHJcblxyXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcclxuXHJcbiAgY2xvc2U6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdjbG9zZSdcclxuXHJcbiAgY2FuT3BlblNhdmVkOiAtPiB0cnVlXHJcblxyXG4gIG9wZW5TYXZlZDogKG9wZW5TYXZlZFBhcmFtcywgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdvcGVuU2F2ZWQnXHJcblxyXG4gIGdldE9wZW5TYXZlZFBhcmFtczogKG1ldGFkYXRhKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZ2V0T3BlblNhdmVkUGFyYW1zJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIENsb3VkQ29udGVudDogQ2xvdWRDb250ZW50XHJcbiAgY2xvdWRDb250ZW50RmFjdG9yeTogbmV3IENsb3VkQ29udGVudEZhY3RvcnkoKVxyXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbmNsb3VkQ29udGVudEZhY3RvcnkgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5jbG91ZENvbnRlbnRGYWN0b3J5XHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9LCBAY2xpZW50KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICAgICAgY2xvc2U6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV1cclxuICAgICAgICAgIGlmIHN1YlRyZWVbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgc3ViVHJlZVttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBsaXN0ID0gW11cclxuICAgICAgc3ViVHJlZSA9IEBfZmluZFN1YlRyZWUgbWV0YWRhdGFcclxuICAgICAgaWYgc3ViVHJlZVxyXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2Ygc3ViVHJlZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIGNhbk9wZW5TYXZlZDogLT4gZmFsc2VcclxuXHJcbiAgX2ZpbmRTdWJUcmVlOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW5cclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnBhcmVudFxyXG4gICAgICBtZXRhZGF0YS5wYXJlbnQucHJvdmlkZXJEYXRhLmNoaWxkcmVuXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHRyZWUgaXNudCBudWxsXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cclxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcclxuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcclxuICAgICAgJC5hamF4XHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXHJcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxyXG5cclxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhcmVudCA9IG51bGwpIC0+XHJcbiAgICB0cmVlID0ge31cclxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxyXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcGFyZW50OiBwYXJlbnRcclxuICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgIGNoaWxkcmVuOiBudWxsXHJcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgICBtZXRhZGF0YS5wcm92aWRlckRhdGEuY2hpbGRyZW4gPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIG1ldGFkYXRhXHJcbiAgICAgIGNvbnRlbnQgPSBjbG91ZENvbnRlbnRGYWN0b3J5LmNyZWF0ZUVudmVsb3BlZENsb3VkQ29udGVudCBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XHJcbiAgICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5cclxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdyZXZlcnRTdWJNZW51JywgJ3NlcGFyYXRvcicsICdzYXZlJywgJ2NyZWF0ZUNvcHknLCAnc2hhcmVTdWJNZW51JywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxyXG4gICAgQGl0ZW1zID0gQHBhcnNlTWVudUl0ZW1zIG9wdGlvbnMubWVudSwgY2xpZW50XHJcblxyXG4gIHBhcnNlTWVudUl0ZW1zOiAobWVudUl0ZW1zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cclxuICAgICAgc3dpdGNoIGFjdGlvblxyXG4gICAgICAgIHdoZW4gJ3JldmVydFN1Yk1lbnUnXHJcbiAgICAgICAgICAtPiAoY2xpZW50LnN0YXRlLm9wZW5lZENvbnRlbnQ/IGFuZCBjbGllbnQuc3RhdGUubWV0YWRhdGE/KSBvciBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlRWRpdEtleVwiKT9cclxuICAgICAgICB3aGVuICdyZXZlcnRUb0xhc3RPcGVuZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUub3BlbmVkQ29udGVudD8gYW5kIGNsaWVudC5zdGF0ZS5tZXRhZGF0YT9cclxuICAgICAgICB3aGVuICdzaGFyZUdldExpbmsnLCAnc2hhcmVTdWJNZW51J1xyXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLnNoYXJlUHJvdmlkZXI/XHJcbiAgICAgICAgd2hlbiAncmV2ZXJ0VG9TaGFyZWREaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUuY3VycmVudENvbnRlbnQ/LmdldChcInNoYXJlZERvY3VtZW50SWRcIilcclxuICAgICAgICB3aGVuICdzaGFyZVVwZGF0ZSdcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5jdXJyZW50Q29udGVudD8uZ2V0KFwic2hhcmVFZGl0S2V5XCIpP1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIHRydWVcclxuXHJcbiAgICBnZXRJdGVtcyA9IChzdWJNZW51SXRlbXMpID0+XHJcbiAgICAgIGlmIHN1Yk1lbnVJdGVtc1xyXG4gICAgICAgIEBwYXJzZU1lbnVJdGVtcyBzdWJNZW51SXRlbXMsIGNsaWVudFxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmV2ZXJ0VG9MYXN0T3BlbmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiXHJcbiAgICAgIHJldmVydFRvU2hhcmVkRGlhbG9nOiB0ciBcIn5NRU5VLlJFVkVSVF9UT19TSEFSRURfVklFV1wiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIGNyZWF0ZUNvcHk6IHRyIFwifk1FTlUuQ1JFQVRFX0NPUFlcIlxyXG4gICAgICBzaGFyZUdldExpbms6IHRyIFwifk1FTlUuU0hBUkVfR0VUX0xJTktcIlxyXG4gICAgICBzaGFyZVVwZGF0ZTogdHIgXCJ+TUVOVS5TSEFSRV9VUERBVEVcIlxyXG4gICAgICBkb3dubG9hZERpYWxvZzogdHIgXCJ+TUVOVS5ET1dOTE9BRFwiXHJcbiAgICAgIHJlbmFtZURpYWxvZzogdHIgXCJ+TUVOVS5SRU5BTUVcIlxyXG4gICAgICByZXZlcnRTdWJNZW51OiB0ciBcIn5NRU5VLlJFVkVSVF9UT1wiXHJcbiAgICAgIHNoYXJlU3ViTWVudTogdHIgXCJ+TUVOVS5TSEFSRVwiXHJcblxyXG4gICAgc3ViTWVudXMgPVxyXG4gICAgICByZXZlcnRTdWJNZW51OiBbJ3JldmVydFRvTGFzdE9wZW5lZERpYWxvZycsICdyZXZlcnRUb1NoYXJlZERpYWxvZyddXHJcbiAgICAgIHNoYXJlU3ViTWVudTogWydzaGFyZUdldExpbmsnLCAnc2hhcmVVcGRhdGUnXVxyXG5cclxuICAgIGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtLCBpIGluIG1lbnVJdGVtc1xyXG4gICAgICBpZiBpdGVtIGlzICdzZXBhcmF0b3InXHJcbiAgICAgICAgbWVudUl0ZW0gPVxyXG4gICAgICAgICAga2V5OiBcInNlcGVyYXRvciN7aX1cIlxyXG4gICAgICAgICAgc2VwYXJhdG9yOiB0cnVlXHJcbiAgICAgIGVsc2UgaWYgaXNTdHJpbmcgaXRlbVxyXG4gICAgICAgIG1lbnVJdGVtID1cclxuICAgICAgICAgIGtleTogaXRlbVxyXG4gICAgICAgICAgbmFtZTogb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dIG9yIG5hbWVzW2l0ZW1dIG9yIFwiVW5rbm93biBpdGVtOiAje2l0ZW19XCJcclxuICAgICAgICAgIGVuYWJsZWQ6IHNldEVuYWJsZWQgaXRlbVxyXG4gICAgICAgICAgaXRlbXM6IGdldEl0ZW1zIHN1Yk1lbnVzW2l0ZW1dXHJcbiAgICAgICAgICBhY3Rpb246IHNldEFjdGlvbiBpdGVtXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBtZW51SXRlbSA9IGl0ZW1cclxuICAgICAgICAgICMgY2xpZW50cyBjYW4gcGFzcyBpbiBjdXN0b20ge25hbWU6Li4uLCBhY3Rpb246Li4ufSBtZW51IGl0ZW1zIHdoZXJlIHRoZSBhY3Rpb24gY2FuIGJlIGEgY2xpZW50IGZ1bmN0aW9uIG5hbWUgb3Igb3RoZXJ3aXNlIGl0IGlzIGFzc3VtZWQgYWN0aW9uIGlzIGEgZnVuY3Rpb25cclxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgbWVudUl0ZW0ua2V5ID0gaXRlbS5hY3Rpb25cclxuICAgICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgPSBzZXRFbmFibGVkIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbS5hY3Rpb25cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZW51SXRlbS5lbmFibGVkIG9yPSB0cnVlXHJcbiAgICAgICAgbWVudUl0ZW0uaXRlbXMgPSBpdGVtLml0ZW1zIG9yIGdldEl0ZW1zIGl0ZW0ubmFtZVxyXG4gICAgICBpdGVtcy5wdXNoIG1lbnVJdGVtXHJcbiAgICBpdGVtc1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxyXG4gICAgQG1lbnUgPSBudWxsXHJcblxyXG4gIGluaXQ6IChvcHRpb25zKSAtPlxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgb3Ige31cclxuICAgICMgc2tpcCB0aGUgbWVudSBpZiBleHBsaWNpdHkgc2V0IHRvIG51bGwgKG1lYW5pbmcgbm8gbWVudSlcclxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcclxuICAgICAgaWYgdHlwZW9mIG9wdGlvbnMubWVudSBpcyAndW5kZWZpbmVkJ1xyXG4gICAgICAgIG9wdGlvbnMubWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XHJcblxyXG4gICMgZm9yIFJlYWN0IHRvIGxpc3RlbiBmb3IgZGlhbG9nIGNoYW5nZXNcclxuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cclxuXHJcbiAgcHJlcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAncHJlcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICByZXBsYWNlTWVudUl0ZW06IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3JlcGxhY2VNZW51SXRlbScsXHJcbiAgICAgIGtleToga2V5XHJcbiAgICAgIGl0ZW06IGl0ZW1cclxuXHJcbiAgaW5zZXJ0TWVudUl0ZW1CZWZvcmU6IChrZXksIGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2luc2VydE1lbnVJdGVtQmVmb3JlJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBpbnNlcnRNZW51SXRlbUFmdGVyOiAoa2V5LCBpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdpbnNlcnRNZW51SXRlbUFmdGVyJyxcclxuICAgICAga2V5OiBrZXlcclxuICAgICAgaXRlbTogaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgaW1wb3J0RGF0YURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93SW1wb3J0RGlhbG9nJyxcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIGRvd25sb2FkRGlhbG9nOiAoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgcmVuYW1lRGlhbG9nOiAoZmlsZW5hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICBzaGFyZURpYWxvZzogKGNsaWVudCkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1NoYXJlRGlhbG9nJyxcclxuICAgICAgY2xpZW50OiBjbGllbnRcclxuXHJcbiAgYmxvY2tpbmdNb2RhbDogKG1vZGFsUHJvcHMpIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dCbG9ja2luZ01vZGFsJywgbW9kYWxQcm9wc1xyXG5cclxuICBfc2hvd1Byb3ZpZGVyRGlhbG9nOiAoYWN0aW9uLCB0aXRsZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXHJcbiAgICAgIGFjdGlvbjogYWN0aW9uXHJcbiAgICAgIHRpdGxlOiB0aXRsZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSU1lbnU6IENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+XHJcbiAgcmV0ID0gbnVsbFxyXG4gIGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpLnNwbGl0KFwiJlwiKS5zb21lIChwYWlyKSAtPlxyXG4gICAgcGFpci5zcGxpdChcIj1cIilbMF0gaXMgcGFyYW0gYW5kIChyZXQgPSBwYWlyLnNwbGl0KFwiPVwiKVsxXSlcclxuICByZXRcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwYXJhbSkgaXMgJ1tvYmplY3QgU3RyaW5nXSdcclxuIiwibW9kdWxlLmV4cG9ydHMgPVxyXG4gIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXHJcblxyXG4gIFwifk1FTlUuTkVXXCI6IFwiTmV3XCJcclxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXHJcbiAgXCJ+TUVOVS5JTVBPUlRfREFUQVwiOiBcIkltcG9ydCBkYXRhLi4uXCJcclxuICBcIn5NRU5VLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+TUVOVS5DUkVBVEVfQ09QWVwiOiBcIkNyZWF0ZSBBIENvcHkgLi4uXCJcclxuICBcIn5NRU5VLlNIQVJFXCI6IFwiU2hhcmUuLi5cIlxyXG4gIFwifk1FTlUuU0hBUkVfR0VUX0xJTktcIjogXCJHZXQgbGluayB0byBzaGFyZWQgdmlld1wiXHJcbiAgXCJ+TUVOVS5TSEFSRV9VUERBVEVcIjogXCJVcGRhdGUgc2hhcmVkIHZpZXdcIlxyXG4gIFwifk1FTlUuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+TUVOVS5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwifk1FTlUuUkVWRVJUX1RPXCI6IFwiUmV2ZXJ0IHRvLi4uXCJcclxuICBcIn5NRU5VLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiOiBcIlJlY2VudGx5IG9wZW5lZCBzdGF0ZVwiXHJcbiAgXCJ+TUVOVS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIjogXCJTaGFyZWQgdmlld1wiXHJcblxyXG4gIFwifkRJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+RElBTE9HLkNSRUFURV9DT1BZXCI6IFwiQ3JlYXRlIEEgQ29weSAuLi5cIlxyXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxyXG4gIFwifkRJQUxPRy5TSEFSRURcIjogXCJTaGFyZVwiXHJcbiAgXCJ+RElBTE9HLklNUE9SVF9EQVRBXCI6IFwiSW1wb3J0IERhdGFcIlxyXG5cclxuICBcIn5QUk9WSURFUi5MT0NBTF9TVE9SQUdFXCI6IFwiTG9jYWwgU3RvcmFnZVwiXHJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcclxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxyXG4gIFwiflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFXCI6IFwiRG9jdW1lbnQgU3RvcmVcIlxyXG4gIFwiflBST1ZJREVSLkxPQ0FMX0ZJTEVcIjogXCJMb2NhbCBGaWxlXCJcclxuXHJcbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiOiBcIkRlbGV0ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXHJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxyXG5cclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflJFTkFNRV9ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflNIQVJFX0RJQUxPRy5DT1BZXCI6IFwiQ29weVwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLlZJRVdcIjogXCJWaWV3XCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ0xPU0VcIjogXCJDbG9zZVwiXHJcbiAgXCJ+U0hBUkVfRElBTE9HLkNPUFlfU1VDQ0VTU1wiOiBcIlRoZSBzaGFyZSB1cmwgaGFzIGJlZW4gY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuXCJcclxuICBcIn5TSEFSRV9ESUFMT0cuQ09QWV9FUlJPUlwiOiBcIlNvcnJ5LCB0aGUgc2hhcmUgdXJsIHdhcyBub3QgYWJsZSB0byBiZSBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cIlxyXG5cclxuICBcIn5DT05GSVJNLk9QRU5fRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBvcGVuIGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLlJFVkVSVF9UT19MQVNUX09QRU5FRFwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCByZXZlcnQgdGhlIGZpbGUgdG8gaXRzIG1vc3QgcmVjZW50bHkgb3BlbmVkIHN0YXRlP1wiXHJcbiAgXCJ+Q09ORklSTS5SRVZFUlRfVE9fU0hBUkVEX1ZJRVdcIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgcmV2ZXJ0IHRoZSBmaWxlIHRvIGN1cnJlbnRseSBzaGFyZWQgdmlldz9cIlxyXG5cclxuICBcIn5MT0NBTF9GSUxFX0RJQUxPRy5EUk9QX0ZJTEVfSEVSRVwiOiBcIkRyb3AgZmlsZSBoZXJlIG9yIGNsaWNrIGhlcmUgdG8gc2VsZWN0IGZpbGUuXCJcclxuICBcIn5MT0NBTF9GSUxFX0RJQUxPRy5NVUxUSVBMRV9GSUxFU19TRUxFQ1RFRFwiOiBcIlNvcnJ5LCB5b3UgY2FuIGNob29zZSBvbmx5IG9uZSBmaWxlIHRvIG9wZW4uXCJcclxuICBcIn5MT0NBTF9GSUxFX0RJQUxPRy5NVUxUSVBMRV9GSUxFU19EUk9QUEVEXCI6IFwiU29ycnksIHlvdSBjYW4ndCBkcm9wIG1vcmUgdGhhbiBvbmUgZmlsZS5cIlxyXG5cclxuICBcIn5JTVBPUlQuTE9DQUxfRklMRVwiOiBcIkxvY2FsIEZpbGVcIlxyXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cclxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xyXG5kZWZhdWx0TGFuZyA9ICdlbidcclxudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xyXG5cclxudHJhbnNsYXRlID0gKGtleSwgdmFycz17fSwgbGFuZz1kZWZhdWx0TGFuZykgLT5cclxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcclxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XHJcbiAgICBpZiB2YXJzLmhhc093blByb3BlcnR5IGtleSB0aGVuIHZhcnNba2V5XSBlbHNlIFwiJyoqIFVLTk9XTiBLRVk6ICN7a2V5fSAqKlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxyXG4iLCJNZW51QmFyID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21lbnUtYmFyLXZpZXcnXHJcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcclxuRG93bmxvYWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZG93bmxvYWQtZGlhbG9nLXZpZXcnXHJcblJlbmFtZURpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9yZW5hbWUtZGlhbG9nLXZpZXcnXHJcblNoYXJlRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NoYXJlLWRpYWxvZy12aWV3J1xyXG5CbG9ja2luZ01vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Jsb2NraW5nLW1vZGFsLXZpZXcnXHJcbkltcG9ydFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9pbXBvcnQtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/Lmhhc093blByb3BlcnR5KFwibmFtZVwiKSBhbmQgbWV0YWRhdGEubmFtZT8ubGVuZ3RoID4gMCB0aGVuIG1ldGFkYXRhLm5hbWUgZWxzZSBudWxsXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgcHJvdmlkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXHJcbiAgICBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXHJcbiAgICBtZW51T3B0aW9uczogQHByb3BzLnVpPy5tZW51QmFyIG9yIHt9XHJcbiAgICBwcm92aWRlckRpYWxvZzogbnVsbFxyXG4gICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgIHJlbmFtZURpYWxvZzogbnVsbFxyXG4gICAgc2hhcmVEaWFsb2c6IG51bGxcclxuICAgIGRpcnR5OiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50Lmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIGZpbGVTdGF0dXMgPSBpZiBldmVudC5zdGF0ZS5zYXZpbmdcclxuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLnNhdmVkXHJcbiAgICAgICAge21lc3NhZ2U6IFwiQWxsIGNoYW5nZXMgc2F2ZWQgdG8gI3tldmVudC5zdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5kaXNwbGF5TmFtZX1cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XHJcbiAgICAgICAge21lc3NhZ2U6ICdVbnNhdmVkJywgdHlwZTogJ2FsZXJ0J31cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG51bGxcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSBldmVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIHByb3ZpZGVyOiBldmVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuICAgICAgICBmaWxlU3RhdHVzOiBmaWxlU3RhdHVzXHJcblxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ2Nvbm5lY3RlZCdcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXHJcblxyXG4gICAgQHByb3BzLmNsaWVudC5fdWkubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdzaG93UHJvdmlkZXJEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcHJvdmlkZXJEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgZG93bmxvYWREaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdzaG93UmVuYW1lRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dJbXBvcnREaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgaW1wb3J0RGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1NoYXJlRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHNoYXJlRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Jsb2NraW5nTW9kYWwnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgYmxvY2tpbmdNb2RhbFByb3BzOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3ByZXBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAncmVwbGFjZU1lbnVJdGVtJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgQHN0YXRlLm1lbnVJdGVtc1tpbmRleF0gPSBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQmVmb3JlJ1xyXG4gICAgICAgICAgaW5kZXggPSBAX2dldE1lbnVJdGVtSW5kZXggZXZlbnQuZGF0YS5rZXlcclxuICAgICAgICAgIGlmIGluZGV4IGlzbnQgLTFcclxuICAgICAgICAgICAgaWYgaW5kZXggaXMgMFxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMudW5zaGlmdCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMuc3BsaWNlIGluZGV4LCAwLCBldmVudC5kYXRhLml0ZW1cclxuICAgICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ2luc2VydE1lbnVJdGVtQWZ0ZXInXHJcbiAgICAgICAgICBpbmRleCA9IEBfZ2V0TWVudUl0ZW1JbmRleCBldmVudC5kYXRhLmtleVxyXG4gICAgICAgICAgaWYgaW5kZXggaXNudCAtMVxyXG4gICAgICAgICAgICBpZiBpbmRleCBpcyBAc3RhdGUubWVudUl0ZW1zLmxlbmd0aCAtIDFcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YS5pdGVtXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnNwbGljZSBpbmRleCArIDEsIDAsIGV2ZW50LmRhdGEuaXRlbVxyXG4gICAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIF9nZXRNZW51SXRlbUluZGV4OiAoa2V5KSAtPlxyXG4gICAgaWYgaXNTdHJpbmcga2V5XHJcbiAgICAgIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgcmV0dXJuIGluZGV4IGlmIGl0ZW0ua2V5IGlzIGtleVxyXG4gICAgICAtMVxyXG4gICAgZWxzZVxyXG4gICAgICBpbmRleCA9IHBhcnNlSW50IGtleSwgMTBcclxuICAgICAgaWYgaXNOYU4oaW5kZXgpIG9yIGluZGV4IDwgMCBvciBpbmRleCA+IEBzdGF0ZS5tZW51SXRlbXMubGVuZ3RoIC0gMVxyXG4gICAgICAgIC0xXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpbmRleFxyXG5cclxuICBjbG9zZURpYWxvZ3M6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICAgIHNoYXJlRGlhbG9nOiBudWxsXHJcbiAgICAgIGltcG9ydERpYWxvZzogbnVsbFxyXG5cclxuICByZW5kZXJEaWFsb2dzOiAtPlxyXG4gICAgaWYgQHN0YXRlLmJsb2NraW5nTW9kYWxQcm9wc1xyXG4gICAgICAoQmxvY2tpbmdNb2RhbCBAc3RhdGUuYmxvY2tpbmdNb2RhbFByb3BzKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2dcclxuICAgICAgKFByb3ZpZGVyVGFiYmVkRGlhbG9nIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGRpYWxvZzogQHN0YXRlLnByb3ZpZGVyRGlhbG9nLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xyXG4gICAgICAoRG93bmxvYWREaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUuZG93bmxvYWREaWFsb2cuZmlsZW5hbWUsIG1pbWVUeXBlOiBAc3RhdGUuZG93bmxvYWREaWFsb2cubWltZVR5cGUsIGNvbnRlbnQ6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5jb250ZW50LCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5yZW5hbWVEaWFsb2dcclxuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5pbXBvcnREaWFsb2dcclxuICAgICAgKEltcG9ydFRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5pbXBvcnREaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnNoYXJlRGlhbG9nXHJcbiAgICAgIChTaGFyZURpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICAoTWVudUJhciB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxyXG4iLCJBdXRob3JpemVNaXhpbiA9XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgYXV0aG9yaXplZDogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXHJcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdCbG9ja2luZ01vZGFsJ1xyXG5cclxuICBjbG9zZTogLT5cclxuICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LFxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctYmxvY2tpbmctbWVzc2FnZSd9LCBAcHJvcHMubWVzc2FnZSlcclxuICAgICAgICAgIClcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IFwiI3tAcHJvcHMuZmlsZW5hbWUgb3IgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIil9Lmpzb25cIlxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgZG93bmxvYWQ6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIGUudGFyZ2V0LnNldEF0dHJpYnV0ZSAnaHJlZicsIFwiZGF0YTphcHBsaWNhdGlvbi9qc29uLCN7ZW5jb2RlVVJJQ29tcG9uZW50KEBwcm9wcy5jb250ZW50LmdldENvbnRlbnRBc0pTT04oKSl9XCJcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuICAgIGVsc2VcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5ET1dOTE9BRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+RE9XTkxPQURfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaSwgc3ZnLCBnLCByZWN0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cclxuXHJcbiAgbW91c2VFbnRlcjogLT5cclxuICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgIG1lbnVJdGVtID0gJCBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5pdGVtXHJcbiAgICAgIG1lbnUgPSBtZW51SXRlbS5wYXJlbnQoKS5wYXJlbnQoKVxyXG5cclxuICAgICAgQHByb3BzLnNldFN1Yk1lbnVcclxuICAgICAgICBzdHlsZTpcclxuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnXHJcbiAgICAgICAgICBsZWZ0OiBtZW51LndpZHRoKClcclxuICAgICAgICAgIHRvcDogbWVudUl0ZW0ucG9zaXRpb24oKS50b3AgLSBwYXJzZUludChtZW51SXRlbS5jc3MoJ3BhZGRpbmctdG9wJykpXHJcbiAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5zZXRTdWJNZW51PyBudWxsXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcclxuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gICAgY2xhc3NlcyA9IFsnbWVudUl0ZW0nXVxyXG4gICAgaWYgQHByb3BzLml0ZW0uc2VwYXJhdG9yXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xyXG4gICAgICAobGkge2NsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyl9LCAnJylcclxuICAgIGVsc2VcclxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3Igbm90IChAcHJvcHMuaXRlbS5hY3Rpb24gb3IgQHByb3BzLml0ZW0uaXRlbXMpXHJcbiAgICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXHJcbiAgICAgIChsaSB7cmVmOiAnaXRlbScsIGNsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyksIG9uQ2xpY2s6IEBjbGlja2VkLCBvbk1vdXNlRW50ZXI6IEBtb3VzZUVudGVyIH0sXHJcbiAgICAgICAgbmFtZVxyXG4gICAgICAgIGlmIEBwcm9wcy5pdGVtLml0ZW1zXHJcbiAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZSd9KVxyXG4gICAgICApXHJcblxyXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG4gICAgc3ViTWVudTogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlLCBzdWJNZW51OiBmYWxzZX0gKSwgNTAwXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IHRpbWVvdXR9XHJcblxyXG4gIHVuYmx1cjogLT5cclxuICAgIGlmIEBzdGF0ZS50aW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cclxuXHJcbiAgc2V0U3ViTWVudTogKHN1Yk1lbnUpIC0+XHJcbiAgICBAc2V0U3RhdGUgc3ViTWVudTogc3ViTWVudVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgcmV0dXJuIGlmIGl0ZW0/Lml0ZW1zXHJcbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcclxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cclxuICAgIHJldHVybiB1bmxlc3MgaXRlbVxyXG4gICAgaXRlbS5hY3Rpb24/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxyXG4gICAgICAgIChzdmcge3ZlcnNpb246ICcxLjEnLCB3aWR0aDogMTYsIGhlaWdodDogMTYsIHZpZXdCb3g6ICcwIDAgMTYgMTYnLCBlbmFibGVCYWNrZ3JvdW5kOiAnbmV3IDAgMCAxNiAxNid9LFxyXG4gICAgICAgICAgKGcge30sXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAyLCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiA3LCB3aWR0aDogMTYsIGhlaWdodDogMn0pXHJcbiAgICAgICAgICAgIChyZWN0IHt5OiAxMiwgd2lkdGg6IDE2LCBoZWlnaHQ6IDJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcclxuICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBzZXRTdWJNZW51OiBAc2V0U3ViTWVudX0pIGZvciBpdGVtLCBpbmRleCBpbiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIClcclxuICAgICAgICAgIGlmIEBzdGF0ZS5zdWJNZW51XHJcbiAgICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBzdHlsZTogQHN0YXRlLnN1Yk1lbnUuc3R5bGV9LFxyXG4gICAgICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdH0pIGZvciBpdGVtLCBpbmRleCBpbiBAc3RhdGUuc3ViTWVudS5pdGVtc1xyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRHJvcERvd25cclxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpbWcsIGksIHNwYW4sIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdEZpbGUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBsYXN0Q2xpY2sgPSAwXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgQHByb3BzLmZpbGVDb25maXJtZWQoKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LFxyXG4gICAgICAoUmVhY3QuRE9NLmkge2NsYXNzTmFtZTogaWYgQHByb3BzLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgdGhlbiAnaWNvbi1pbnNwZWN0b3JBcnJvdy1jb2xsYXBzZScgZWxzZSAnaWNvbi1ub3RlVG9vbCd9KVxyXG4gICAgICBAcHJvcHMubWV0YWRhdGEubmFtZVxyXG4gICAgKVxyXG5cclxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGluZzogdHJ1ZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBsb2FkIEBwcm9wcy5mb2xkZXJcclxuXHJcbiAgY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogKG5leHRQcm9wcykgLT5cclxuICAgIGlmIG5leHRQcm9wcy5mb2xkZXIgaXNudCBAcHJvcHMuZm9sZGVyXHJcbiAgICAgIEBsb2FkIG5leHRQcm9wcy5mb2xkZXJcclxuXHJcbiAgbG9hZDogKGZvbGRlcikgLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IGZvbGRlciwgKGVyciwgbGlzdCkgPT5cclxuICAgICAgcmV0dXJuIGFsZXJ0KGVycikgaWYgZXJyXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXHJcbiAgICAgIEBwcm9wcy5saXN0TG9hZGVkIGxpc3RcclxuXHJcbiAgcGFyZW50U2VsZWN0ZWQ6IChlKSAtPlxyXG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMuZm9sZGVyPy5wYXJlbnRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBpZiBAcHJvcHMuZm9sZGVyIGlzbnQgbnVsbFxyXG4gICAgICBsaXN0LnB1c2ggKGRpdiB7a2V5OiAncGFyZW50Jywgb25DbGljazogQHBhcmVudFNlbGVjdGVkfSwgKFJlYWN0LkRPTS5pIHtjbGFzc05hbWU6ICdpY29uLXBhbGV0dGVBcnJvdy1jb2xsYXBzZSd9KSwgJ1BhcmVudCBGb2xkZXInKVxyXG4gICAgZm9yIG1ldGFkYXRhLCBpIGluIEBwcm9wcy5saXN0XHJcbiAgICAgIGxpc3QucHVzaCAoRmlsZUxpc3RGaWxlIHtrZXk6IGksIG1ldGFkYXRhOiBtZXRhZGF0YSwgc2VsZWN0ZWQ6IEBwcm9wcy5zZWxlY3RlZEZpbGUgaXMgbWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQHByb3BzLmZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQHByb3BzLmZpbGVDb25maXJtZWR9KVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkaW5nXHJcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBsaXN0XHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBAZ2V0U3RhdGVGb3JGb2xkZXIgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cclxuICAgIGZpbGVuYW1lID0gZS50YXJnZXQudmFsdWVcclxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgbWV0YWRhdGE6IEBmaW5kTWV0YWRhdGEgJC50cmltKEBzdGF0ZS5maWxlbmFtZSksIGxpc3RcclxuXHJcbiAgZ2V0U3RhdGVGb3JGb2xkZXI6IChmb2xkZXIpIC0+XHJcbiAgICBmb2xkZXI6IGZvbGRlclxyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcclxuICAgIGZpbGVuYW1lOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5uYW1lIG9yICcnXHJcbiAgICBsaXN0OiBbXVxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbWV0YWRhdGFcclxuICAgIGVsc2UgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZXRTdGF0ZSBAZ2V0U3RhdGVGb3JGb2xkZXIgbnVsbFxyXG5cclxuICBjb25maXJtOiAtPlxyXG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZSwgQHN0YXRlLmxpc3RcclxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIGlmIEBpc09wZW5cclxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHBhcmVudDogQHN0YXRlLmZvbGRlciBvciBudWxsXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXJcclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIgPSBAcHJvcHMucHJvdmlkZXJcclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIHJlbW92ZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIGlmIG5vdCBlcnJcclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXHJcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXHJcbiAgICAgICAgICBAc2V0U3RhdGVcclxuICAgICAgICAgICAgbGlzdDogbGlzdFxyXG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcclxuXHJcbiAgY2FuY2VsOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUsIGxpc3QpIC0+XHJcbiAgICBmb3IgbWV0YWRhdGEgaW4gbGlzdFxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIGlzIGZpbGVuYW1lXHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXHJcbiAgICBudWxsXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICAgIEBjb25maXJtKClcclxuXHJcbiAgY29uZmlybURpc2FibGVkOiAtPlxyXG4gICAgKEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCkgb3IgKEBpc09wZW4gYW5kIG5vdCBAc3RhdGUubWV0YWRhdGEpXHJcblxyXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxyXG4gICAgY29uZmlybURpc2FibGVkID0gQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RpYWxvZ1RhYid9LFxyXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcmVtb3ZlLCBkaXNhYmxlZDogcmVtb3ZlRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgcmVtb3ZlRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCAodHIgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCIpKVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkxvY2FsRmlsZVRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9sb2NhbC1maWxlLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5Mb2NhbEZpbGVJbXBvcnRUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdJbXBvcnRUYWJiZWREaWFsb2cnXHJcblxyXG4gIGltcG9ydEZpbGU6IChtZXRhZGF0YSkgLT5cclxuICAgIHN3aXRjaCBtZXRhZGF0YS5wcm92aWRlclxyXG4gICAgICB3aGVuICdsb2NhbEZpbGUnXHJcbiAgICAgICAgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxyXG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAobG9hZGVkKSA9PlxyXG4gICAgICAgICAgZGF0YSA9XHJcbiAgICAgICAgICAgIG5hbWU6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5maWxlLm5hbWUsXHJcbiAgICAgICAgICAgIGNvbnRlbnQ6IGxvYWRlZC50YXJnZXQucmVzdWx0XHJcbiAgICAgICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrPyBkYXRhXHJcbiAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmZpbGVcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIHRhYnMgPSBbXHJcbiAgICAgIFRhYmJlZFBhbmVsLlRhYlxyXG4gICAgICAgIGtleTogMFxyXG4gICAgICAgIGxhYmVsOiAodHIgXCJ+SU1QT1JULkxPQ0FMX0ZJTEVcIilcclxuICAgICAgICBjb21wb25lbnQ6IExvY2FsRmlsZVRhYlxyXG4gICAgICAgICAgZGlhbG9nOlxyXG4gICAgICAgICAgICBjYWxsYmFjazogQGltcG9ydEZpbGVcclxuICAgICAgICAgIHByb3ZpZGVyOiAnbG9jYWxGaWxlJyAjIHdlIGFyZSBmYWtpbmcgdGhlIHByb3ZpZGVyIGhlcmUgc28gd2UgY2FuIHJldXNlIHRoZSBsb2NhbCBmaWxlIHRhYlxyXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxyXG4gICAgXVxyXG4gICAgKE1vZGFsVGFiYmVkRGlhbG9nIHt0aXRsZTogKHRyIFwifkRJQUxPRy5JTVBPUlRfREFUQVwiKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogMH0pXHJcbiIsIntkaXYsIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTG9jYWxGaWxlTGlzdFRhYidcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZXMgPSBlLnRhcmdldC5maWxlc1xyXG4gICAgaWYgZmlsZXMubGVuZ3RoID4gMVxyXG4gICAgICBhbGVydCB0ciBcIn5MT0NBTF9GSUxFX0RJQUxPRy5NVUxUSVBMRV9GSUxFU19TRUxFQ1RFRFwiXHJcbiAgICBlbHNlIGlmIGZpbGVzLmxlbmd0aCBpcyAxXHJcbiAgICAgIEBvcGVuRmlsZSBmaWxlc1swXVxyXG5cclxuICBvcGVuRmlsZTogKGZpbGUpIC0+XHJcbiAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgIG5hbWU6IGZpbGUubmFtZS5zcGxpdCgnLicpWzBdXHJcbiAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBwYXJlbnQ6IG51bGxcclxuICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgZmlsZTogZmlsZVxyXG4gICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjaz8gbWV0YWRhdGFcclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGRyYWdFbnRlcjogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBzZXRTdGF0ZSBob3ZlcjogdHJ1ZVxyXG5cclxuICBkcmFnTGVhdmU6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAc2V0U3RhdGUgaG92ZXI6IGZhbHNlXHJcblxyXG4gIGRyb3A6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBkcm9wcGVkRmlsZXMgPSBpZiBlLmRhdGFUcmFuc2ZlciB0aGVuIGUuZGF0YVRyYW5zZmVyLmZpbGVzIGVsc2UgZS50YXJnZXQuZmlsZXNcclxuICAgIGlmIGRyb3BwZWRGaWxlcy5sZW5ndGggPiAxXHJcbiAgICAgIGFsZXJ0IFwifkxPQ0FMX0ZJTEVfRElBTE9HLk1VTFRJUExFX0ZJTEVTX0RST1BQRURcIlxyXG4gICAgZWxzZSBpZiBkcm9wcGVkRmlsZXMubGVuZ3RoIGlzIDFcclxuICAgICAgQG9wZW5GaWxlIGRyb3BwZWRGaWxlc1swXVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBkcm9wQ2xhc3MgPSBcImRyb3BBcmVhI3tpZiBAc3RhdGUuaG92ZXIgdGhlbiAnIGRyb3BIb3ZlcicgZWxzZSAnJ31cIlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiIGxvY2FsRmlsZUxvYWQnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBkcm9wQ2xhc3MsIG9uRHJhZ0VudGVyOiBAZHJhZ0VudGVyLCBvbkRyYWdMZWF2ZTogQGRyYWdMZWF2ZSwgb25Ecm9wOiBAZHJvcH0sXHJcbiAgICAgICAgKHRyIFwifkxPQ0FMX0ZJTEVfRElBTE9HLkRST1BfRklMRV9IRVJFXCIpXHJcbiAgICAgICAgKGlucHV0IHt0eXBlOiAnZmlsZScsIG9uQ2hhbmdlOiBAY2hhbmdlZH0pXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIGksIHNwYW4sIGlucHV0fSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcclxuXHJcbiAgZ2V0RmlsZW5hbWU6IChwcm9wcykgLT5cclxuICAgIGlmIHByb3BzLmZpbGVuYW1lPy5sZW5ndGggPiAwIHRoZW4gcHJvcHMuZmlsZW5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFRF9ET0NVTUVOVFwiKVxyXG5cclxuICBnZXRFZGl0YWJsZUZpbGVuYW1lOiAocHJvcHMpIC0+XHJcbiAgICBpZiBwcm9wcy5maWxlbmFtZT8ubGVuZ3RoID4gMCB0aGVuIHByb3BzLmZpbGVuYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRURfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc3RhdGUgPVxyXG4gICAgICBlZGl0aW5nRmlsZW5hbWU6IGZhbHNlXHJcbiAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUgQHByb3BzXHJcbiAgICAgIGVkaXRhYmxlRmlsZW5hbWU6IEBnZXRFZGl0YWJsZUZpbGVuYW1lIEBwcm9wc1xyXG4gICAgICBpbml0aWFsRWRpdGFibGVGaWxlbmFtZTogQGdldEVkaXRhYmxlRmlsZW5hbWUgQHByb3BzXHJcblxyXG4gIGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHM6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSBuZXh0UHJvcHNcclxuICAgICAgZWRpdGFibGVGaWxlbmFtZTogQGdldEVkaXRhYmxlRmlsZW5hbWUgbmV4dFByb3BzXHJcbiAgICAgIHByb3ZpZGVyOiBuZXh0UHJvcHMucHJvdmlkZXJcclxuXHJcbiAgZmlsZW5hbWVDbGlja2VkOiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgQHNldFN0YXRlIGVkaXRpbmdGaWxlbmFtZTogdHJ1ZVxyXG4gICAgc2V0VGltZW91dCAoPT4gQGZvY3VzRmlsZW5hbWUoKSksIDEwXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBlZGl0YWJsZUZpbGVuYW1lOiBAZmlsZW5hbWUoKS52YWx1ZVxyXG5cclxuICBmaWxlbmFtZUJsdXJyZWQ6IC0+XHJcbiAgICBAcmVuYW1lKClcclxuXHJcbiAgZmlsZW5hbWU6IC0+XHJcbiAgICBSZWFjdC5maW5kRE9NTm9kZShAcmVmcy5maWxlbmFtZSlcclxuXHJcbiAgZm9jdXNGaWxlbmFtZTogLT5cclxuICAgIGVsID0gQGZpbGVuYW1lKClcclxuICAgIGVsLmZvY3VzKClcclxuICAgIGVsLnNlbGVjdCgpXHJcblxyXG4gIGNhbmNlbEVkaXQ6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZWRpdGluZ0ZpbGVuYW1lOiBmYWxzZVxyXG4gICAgICBlZGl0YWJsZUZpbGVuYW1lOiBpZiBAc3RhdGUuZmlsZW5hbWU/Lmxlbmd0aCA+IDAgdGhlbiBAc3RhdGUuZmlsZW5hbWUgZWxzZSBAc3RhdGUuaW5pdGlhbEVkaXRhYmxlRmlsZW5hbWVcclxuXHJcbiAgcmVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAc3RhdGUuZWRpdGFibGVGaWxlbmFtZS5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcbiAgICBpZiBmaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jbGllbnQucmVuYW1lIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEsIGZpbGVuYW1lXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGVkaXRpbmdGaWxlbmFtZTogZmFsc2VcclxuICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgICBlZGl0YWJsZUZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgZWxzZVxyXG4gICAgICBAY2FuY2VsRWRpdCgpXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzXHJcbiAgICAgIEByZW5hbWUoKVxyXG4gICAgZWxzZSBpZiBlLmtleUNvZGUgaXMgMjdcclxuICAgICAgQGNhbmNlbEVkaXQoKVxyXG5cclxuICBoZWxwOiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLm9wdGlvbnMuaGVscCwgJ19ibGFuaydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxyXG4gICAgICAgIChEcm9wZG93biB7aXRlbXM6IEBwcm9wcy5pdGVtc30pXHJcbiAgICAgICAgaWYgQHN0YXRlLmVkaXRpbmdGaWxlbmFtZVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30sXHJcbiAgICAgICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmVkaXRhYmxlRmlsZW5hbWUsIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbkJsdXI6IEBmaWxlbmFtZUJsdXJyZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZScsIG9uQ2xpY2s6IEBmaWxlbmFtZUNsaWNrZWR9LCBAc3RhdGUuZmlsZW5hbWUpXHJcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6IFwibWVudS1iYXItZmlsZS1zdGF0dXMtI3tAcHJvcHMuZmlsZVN0YXR1cy50eXBlfVwifSwgQHByb3BzLmZpbGVTdGF0dXMubWVzc2FnZSlcclxuICAgICAgKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmluZm9cclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWJhci1pbmZvJ30sIEBwcm9wcy5vcHRpb25zLmluZm8pXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyPy5hdXRob3JpemVkKClcclxuICAgICAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJVc2VyKClcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXHJcbiAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ2NyZWF0ZUNvcHknIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBmaWx0ZXJlZFRhYkNvbXBvbmVudCA9IHByb3ZpZGVyLmZpbHRlclRhYkNvbXBvbmVudCBjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRcclxuICAgICAgICBjb21wb25lbnQgPSBmaWx0ZXJlZFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyLm5hbWUgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/Lm5hbWVcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSB0YWJzLmxlbmd0aCAtIDFcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdSZW5hbWVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgcmVuYW1lOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2FsbGJhY2s/IEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLlJFTkFNRScpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxyXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5DQU5DRUwnKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcclxuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9uLCBzdHJvbmcsIHRleHRhcmVhLCBzdmcsIGcsIHBhdGgsIHNwYW4sIGNpcmNsZSwgdWwsIGxpfSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuc29jaWFsSWNvbnMgPSByZXF1aXJlICdzdmctc29jaWFsLWljb25zL2xpYi9pY29ucy5qc29uJ1xyXG5cclxuU29jaWFsSWNvbiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdTb2NpYWxJY29uJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBkYXRhOiBzb2NpYWxJY29uc1tAcHJvcHMuaWNvbl1cclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy51cmxcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGEge2NsYXNzTmFtZTogJ3NvY2lhbC1pY29uJywgaHJlZjogQHByb3BzLnVybCwgdGFyZ2V0OiAnX2JsYW5rJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ3NvY2lhbC1jb250YWluZXInfSxcclxuICAgICAgICAoc3ZnIHtjbGFzc05hbWU6ICdzb2NpYWwtc3ZnJywgdmlld0JveDogJzAgMCA2NCA2NCd9LFxyXG4gICAgICAgICAgKGcge2NsYXNzTmFtZTogJ3NvY2lhbC1zdmctYmFja2dyb3VuZCd9LFxyXG4gICAgICAgICAgICAoY2lyY2xlIHtjeDogMzIsIGN5OiAzMiwgcjogMzF9KVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGcge2NsYXNzTmFtZTogJ3NvY2lhbC1zdmctaWNvbid9LFxyXG4gICAgICAgICAgICAocGF0aCB7ZDogQHN0YXRlLmRhdGEuaWNvbn0pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICAoZyB7Y2xhc3NOYW1lOiAnc29jaWFsLXN2Zy1tYXNrJywgc3R5bGU6IHtmaWxsOiBAc3RhdGUuZGF0YS5jb2xvcn19LFxyXG4gICAgICAgICAgICAocGF0aCB7ZDogQHN0YXRlLmRhdGEubWFza30pXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnU2hhcmVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsaW5rOiBAZ2V0U2hhcmVMaW5rKClcclxuICAgIGVtYmVkOiBAZ2V0RW1iZWQoKVxyXG4gICAgbGlua1RhYlNlbGVjdGVkOiB0cnVlXHJcblxyXG4gIGdldFNoYXJlZERvY3VtZW50SWQ6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLmN1cnJlbnRDb250ZW50Py5nZXQgXCJzaGFyZWREb2N1bWVudElkXCJcclxuXHJcbiAgZ2V0U2hhcmVMaW5rOiAtPlxyXG4gICAgc2hhcmVkRG9jdW1lbnRJZCA9IEBnZXRTaGFyZWREb2N1bWVudElkKClcclxuICAgIGlmIHNoYXJlZERvY3VtZW50SWRcclxuICAgICAgXCIje0Bwcm9wcy5jbGllbnQuZ2V0Q3VycmVudFVybCgpfSNzaGFyZWQ9I3tzaGFyZWREb2N1bWVudElkfVwiXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgZ2V0RW1iZWQ6IC0+XHJcbiAgICBpZiBAZ2V0U2hhcmVMaW5rKClcclxuICAgICAgXCJcIlwiPGlmcmFtZSB3aWR0aD1cIjM5OHB4XCIgaGVpZ2h0PVwiMzEzcHhcIiBmcmFtZWJvcmRlcj1cIm5vXCIgc2Nyb2xsaW5nPVwibm9cIiBhbGxvd2Z1bGxzY3JlZW49XCJ0cnVlXCIgd2Via2l0YWxsb3dmdWxsc2NyZWVuPVwidHJ1ZVwiIG1vemFsbG93ZnVsbHNjcmVlbj1cInRydWVcIiBzcmM9XCIje0BnZXRTaGFyZUxpbmsoKX1cIj48L2lmcmFtZT5cIlwiXCJcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICAjIGFkYXB0ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vc3Vkb2Rva2kvY29weS10by1jbGlwYm9hcmQvYmxvYi9tYXN0ZXIvaW5kZXguanNcclxuICBjb3B5OiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgY29waWVkID0gdHJ1ZVxyXG4gICAgdHJ5XHJcbiAgICAgIG1hcmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdtYXJrJ1xyXG4gICAgICBtYXJrLmlubmVySFRNTCA9IEBwcm9wcy51cmxcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCBtYXJrXHJcblxyXG4gICAgICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKVxyXG4gICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuXHJcbiAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKVxyXG4gICAgICByYW5nZS5zZWxlY3ROb2RlIG1hcmtcclxuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlIHJhbmdlXHJcblxyXG4gICAgICBjb3BpZWQgPSBkb2N1bWVudC5leGVjQ29tbWFuZCAnY29weSdcclxuICAgIGNhdGNoXHJcbiAgICAgIHRyeVxyXG4gICAgICAgIHdpbmRvdy5jbGlwYm9hcmREYXRhLnNldERhdGEgJ3RleHQnLCBAcHJvcHMudXJsXHJcbiAgICAgIGNhdGNoXHJcbiAgICAgICAgY29waWVkID0gZmFsc2VcclxuICAgIGZpbmFsbHlcclxuICAgICAgaWYgc2VsZWN0aW9uXHJcbiAgICAgICAgaWYgdHlwZW9mIHNlbGVjdGlvbi5yZW1vdmVSYW5nZSBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlUmFuZ2UgcmFuZ2VcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKClcclxuICAgICAgaWYgbWFya1xyXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQgbWFya1xyXG4gICAgICBhbGVydCB0ciAoaWYgY29waWVkIHRoZW4gXCJ+U0hBUkVfRElBTE9HLkNPUFlfU1VDQ0VTU1wiIGVsc2UgXCJ+U0hBUkVfRElBTE9HLkNPUFlfRVJST1JcIilcclxuXHJcbiAgdXBkYXRlU2hhcmU6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnNoYXJlVXBkYXRlKClcclxuXHJcbiAgdG9nZ2xlU2hhcmU6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMuY2xpZW50LnRvZ2dsZVNoYXJlID0+XHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGxpbms6IEBnZXRTaGFyZUxpbmsoKVxyXG4gICAgICAgIGVtYmVkOiBAZ2V0RW1iZWQoKVxyXG5cclxuICBzZWxlY3RMaW5rVGFiOiAtPlxyXG4gICAgQHNldFN0YXRlIGxpbmtUYWJTZWxlY3RlZDogdHJ1ZVxyXG5cclxuICBzZWxlY3RFbWJlZFRhYjogLT5cclxuICAgIEBzZXRTdGF0ZSBsaW5rVGFiU2VsZWN0ZWQ6IGZhbHNlXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIHNoYXJpbmcgPSBAc3RhdGUubGluayBpc250IG51bGxcclxuXHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuU0hBUkVEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS10b3AtZGlhbG9nJ30sXHJcbiAgICAgICAgICBpZiBzaGFyaW5nXHJcbiAgICAgICAgICAgIChkaXYge30sXHJcbiAgICAgICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc2hhcmUtc3RhdHVzJ30sXHJcbiAgICAgICAgICAgICAgICBcIlNoYXJlZCB2aWV3IGlzIFwiLCAoc3Ryb25nIHt9LCBcImVuYWJsZWRcIilcclxuICAgICAgICAgICAgICAgIChhIHtocmVmOiAnIycsIG9uQ2xpY2s6IEB0b2dnbGVTaGFyZX0sICdTdG9wIHNoYXJpbmcnKVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1idXR0b24nfSxcclxuICAgICAgICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEB1cGRhdGVTaGFyZX0sIFwiVXBkYXRlIHNoYXJlZCB2aWV3XCIpXHJcbiAgICAgICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1idXR0b24taGVscC1zaGFyaW5nJ30sXHJcbiAgICAgICAgICAgICAgICAgIChhIHtocmVmOiBAc3RhdGUubGluaywgdGFyZ2V0OiAnX2JsYW5rJ30sICdQcmV2aWV3IHNoYXJlZCB2aWV3JylcclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgKGRpdiB7fSxcclxuICAgICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1zdGF0dXMnfSxcclxuICAgICAgICAgICAgICAgIFwiU2hhcmVkIHZpZXcgaXMgXCIsIChzdHJvbmcge30sIFwiZGlzYWJsZWRcIilcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc2hhcmUtYnV0dG9uJ30sXHJcbiAgICAgICAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAdG9nZ2xlU2hhcmV9LCBcIkVuYWJsZSBzaGFyaW5nXCIpXHJcbiAgICAgICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyZS1idXR0b24taGVscC1ub3Qtc2hhcmluZyd9LCBcIldoZW4gc2hhcmluZyBpcyBlbmFibGVkLCBhIGNvcHkgb2YgdGhlIGN1cnJlbnQgdmlldyBpcyBjcmVhdGVkLiAgVGhpcyBjb3B5IGNhbiBiZSBzaGFyZWQuXCIpXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgICAgIGlmIHNoYXJpbmdcclxuICAgICAgICAgIChkaXYge30sXHJcbiAgICAgICAgICAgICh1bCB7Y2xhc3NOYW1lOiAnc2hhcmluZy10YWJzJ30sXHJcbiAgICAgICAgICAgICAgKGxpIHtjbGFzc05hbWU6IFwic2hhcmluZy10YWIje2lmIEBzdGF0ZS5saW5rVGFiU2VsZWN0ZWQgdGhlbiAnIHNoYXJpbmctdGFiLXNlbGVjdGVkJyBlbHNlICcnfVwiLCBzdHlsZToge21hcmdpbkxlZnQ6IDEwfSwgb25DbGljazogQHNlbGVjdExpbmtUYWJ9LCAnTGluaycpXHJcbiAgICAgICAgICAgICAgKGxpIHtjbGFzc05hbWU6IFwic2hhcmluZy10YWIgc2hhcmluZy10YWItZW1iZWQje2lmIG5vdCBAc3RhdGUubGlua1RhYlNlbGVjdGVkIHRoZW4gJyBzaGFyaW5nLXRhYi1zZWxlY3RlZCcgZWxzZSAnJ31cIiwgb25DbGljazogQHNlbGVjdEVtYmVkVGFifSwgJ0VtYmVkJylcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdzaGFyaW5nLXRhYi1jb250ZW50cyd9LFxyXG4gICAgICAgICAgICAgIGlmIEBzdGF0ZS5saW5rVGFiU2VsZWN0ZWRcclxuICAgICAgICAgICAgICAgIChkaXYge30sXHJcbiAgICAgICAgICAgICAgICAgIFwiUGFzdGUgdGhpcyBpbnRvIGFuIGVtYWlsIG9yIHRleHQgbWVzc2FnZSBcIixcclxuICAgICAgICAgICAgICAgICAgaWYgZG9jdW1lbnQuZXhlY0NvbW1hbmQgb3Igd2luZG93LmNsaXBib2FyZERhdGFcclxuICAgICAgICAgICAgICAgICAgICAoYSB7Y2xhc3NOYW1lOiAnY29weS1saW5rJywgaHJlZjogJyMnLCBvbkNsaWNrOiBAY29weX0sIHRyICd+U0hBUkVfRElBTE9HLkNPUFknKVxyXG4gICAgICAgICAgICAgICAgICAoZGl2IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgIChpbnB1dCB7dmFsdWU6IEBzdGF0ZS5saW5rLCByZWFkT25seTogdHJ1ZX0pXHJcbiAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnc29jaWFsLWljb25zJ30sXHJcbiAgICAgICAgICAgICAgICAgICAgKFNvY2lhbEljb24ge2ljb246ICdmYWNlYm9vaycsIHVybDogXCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vc2hhcmVyL3NoYXJlci5waHA/dT0je2VuY29kZVVSSUNvbXBvbmVudCBAc3RhdGUubGlua31cIn0pXHJcbiAgICAgICAgICAgICAgICAgICAgKFNvY2lhbEljb24ge2ljb246ICd0d2l0dGVyJywgdXJsOiBcImh0dHBzOi8vdHdpdHRlci5jb20vaG9tZT9zdGF0dXM9I3tlbmNvZGVVUklDb21wb25lbnQgQHN0YXRlLmxpbmt9XCJ9KVxyXG4gICAgICAgICAgICAgICAgICAgICMgbm90IHdvcmtpbmcgd2l0aCB1cmwgcGFyYW1ldGVyOiAoU29jaWFsSWNvbiB7aWNvbjogJ2dvb2dsZScsIHVybDogXCJodHRwczovL3BsdXMuZ29vZ2xlLmNvbS9zaGFyZT91cmw9I3tlbmNvZGVVUklDb21wb25lbnQgQHN0YXRlLmxpbmt9XCJ9KVxyXG4gICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgKGRpdiB7fSxcclxuICAgICAgICAgICAgICAgICAgXCJFbWJlZCBjb2RlIGZvciBpbmNsdWRpbmcgaW4gd2VicGFnZXMgb3Igb3RoZXIgd2ViLWJhc2VkIGNvbnRlbnRcIixcclxuICAgICAgICAgICAgICAgICAgKGRpdiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAodGV4dGFyZWEge3ZhbHVlOiBAc3RhdGUuZW1iZWQsIHJlYWRPbmx5OiB0cnVlfSlcclxuICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApXHJcblxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+U0hBUkVfRElBTE9HLkNMT1NFJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHtrZXk6IGluZGV4fSwgQHJlbmRlclRhYih0YWIsIGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcclxuICAgIClcclxuXHJcbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXHJcbiAgICAgIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzXHJcbiAgICAgICAgKGRpdiB7XHJcbiAgICAgICAgICBrZXk6IGluZGV4XHJcbiAgICAgICAgICBzdHlsZTpcclxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGFiLmNvbXBvbmVudFxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxyXG4gICAgICBAcmVuZGVyVGFicygpXHJcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcclxuICAgIClcclxuIl19
