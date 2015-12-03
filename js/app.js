(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

CloudFileManager = (function() {
  function CloudFileManager(options) {
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;
    this.AutoSaveMenu = CloudFileManagerUIMenu.AutoSaveMenu;
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

  CloudFileManager.prototype.createFrame = function(appOptions, elemId) {
    this.appOptions = appOptions;
    this.init(this.appOptions, true);
    return this._renderApp(document.getElementById(elemId));
  };

  CloudFileManager.prototype.clientConnect = function(eventCallback) {
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    return this.client.connect(eventCallback);
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



},{"./client":16,"./ui":22,"./views/app-view":26}],2:[function(require,module,exports){
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

},{"./lib/InvalidPatchOperationError":3,"./lib/PatchNotInvertibleError":4,"./lib/TestFailedError":5,"./lib/array":6,"./lib/inverse":10,"./lib/jsonPatch":11,"./lib/jsonPointer":12,"./lib/lcs":14}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
},{"./jsonPointer":12}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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

},{"./patches":15}],11:[function(require,module,exports){
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

},{"./InvalidPatchOperationError":3,"./clone":7,"./patches":15}],12:[function(require,module,exports){
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
},{"./jsonPointerParse":13}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./InvalidPatchOperationError":3,"./PatchNotInvertibleError":4,"./TestFailedError":5,"./array":6,"./clone":7,"./commutePaths":8,"./deepEquals":9,"./jsonPointer":12}],16:[function(require,module,exports){
var CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, DocumentStoreProvider, GoogleDriveProvider, LocalStorageProvider, ReadOnlyProvider, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUI = (require('./ui')).CloudFileManagerUI;

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

CloudFileManagerClientEvent = (function() {
  function CloudFileManagerClientEvent(type1, data1, callback1, state) {
    this.type = type1;
    this.data = data1 != null ? data1 : {};
    this.callback = callback1 != null ? callback1 : null;
    this.state = state != null ? state : {};
  }

  return CloudFileManagerClientEvent;

})();

CloudFileManagerClient = (function() {
  function CloudFileManagerClient(options) {
    this.state = {
      availableProviders: []
    };
    this._resetState();
    this._ui = new CloudFileManagerUI(this);
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions1) {
    var Provider, allProviders, availableProviders, i, j, len, len1, provider, providerName, providerOptions, ref, ref1, ref2;
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
    this._ui.init(this.appOptions.ui);
    if (options.autoSaveInterval) {
      return this.autoSave(options.autoSaveInterval);
    }
  };

  CloudFileManagerClient.prototype.connect = function(eventCallback1) {
    this.eventCallback = eventCallback1;
    return this._event('connected', {
      client: this
    });
  };

  CloudFileManagerClient.prototype.listen = function(listenerCallback) {
    this.listenerCallback = listenerCallback;
  };

  CloudFileManagerClient.prototype.appendMenuItem = function(item) {
    return this._ui.appendMenuItem(item);
  };

  CloudFileManagerClient.prototype.setMenuBarInfo = function(info) {
    return this._ui.setMenuBarInfo(info);
  };

  CloudFileManagerClient.prototype.newFile = function(callback) {
    if (callback == null) {
      callback = null;
    }
    this._resetState();
    return this._event('newedFile');
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
          _this._fileChanged('openedFile', content, metadata);
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
          _this._fileChanged('savedFile', content, metadata);
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

  CloudFileManagerClient.prototype.downloadDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._event('getContent', {}, (function(_this) {
      return function(content) {
        var ref;
        return _this._ui.downloadDialog((ref = _this.state.metadata) != null ? ref.name : void 0, content, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.renameDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this._ui.renameDialog(this.state.metadata.name, (function(_this) {
        return function(newName) {
          if (newName !== _this.state.metadata.name) {
            return _this.state.metadata.provider.rename(_this.state.metadata, newName, function(err, metadata) {
              if (err) {
                return _this._error(err);
              }
              _this._setState({
                metadata: metadata
              });
              _this._event('renamedFile', {
                metadata: metadata
              });
              return typeof callback === "function" ? callback(filename) : void 0;
            });
          }
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
    if (this.state.metadata) {
      return this.openFile(this.state.metadata, callback);
    }
  };

  CloudFileManagerClient.prototype.reopenDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      if ((!this.state.dirty) || (confirm(tr('~CONFIRM.REOPEN_FILE')))) {
        return this.openFile(this.state.metadata, callback);
      }
    } else {
      return typeof callback === "function" ? callback('No currently active file') : void 0;
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
          if (_this.state.dirty && (_this.state.metadata != null)) {
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

  CloudFileManagerClient.prototype._fileChanged = function(type, content, metadata) {
    metadata.overwritable = true;
    this._setState({
      content: content,
      metadata: metadata,
      saving: null,
      saved: type === 'savedFile',
      dirty: false
    });
    return this._event(type, {
      content: content,
      metadata: metadata
    });
  };

  CloudFileManagerClient.prototype._event = function(type, data, eventCallback) {
    var event;
    if (data == null) {
      data = {};
    }
    if (eventCallback == null) {
      eventCallback = null;
    }
    event = new CloudFileManagerClientEvent(type, data, eventCallback, this.state);
    if (typeof this.eventCallback === "function") {
      this.eventCallback(event);
    }
    return typeof this.listenerCallback === "function" ? this.listenerCallback(event) : void 0;
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
      content: null,
      metadata: null,
      dirty: false,
      saving: null,
      saved: false
    });
  };

  return CloudFileManagerClient;

})();

module.exports = {
  CloudFileManagerClientEvent: CloudFileManagerClientEvent,
  CloudFileManagerClient: CloudFileManagerClient
};



},{"./providers/document-store-provider":17,"./providers/google-drive-provider":18,"./providers/localstorage-provider":19,"./providers/readonly-provider":21,"./ui":22,"./utils/is-string":23,"./utils/translate":25}],17:[function(require,module,exports){
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, div, documentStore, isString, jiff, listUrl, loadDocumentUrl, ref, removeDocumentUrl, renameDocumentUrl, saveDocumentUrl, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

documentStore = "http://document-store.herokuapp.com";

authorizeUrl = documentStore + "/user/authenticate";

checkLoginUrl = documentStore + "/user/info";

listUrl = documentStore + "/document/all";

loadDocumentUrl = documentStore + "/document/open";

saveDocumentUrl = documentStore + "/document/save";

removeDocumentUrl = documentStore + "/document/delete";

renameDocumentUrl = documentStore + "/document/rename";

tr = require('../utils/translate');

isString = require('../utils/is-string');

jiff = require('jiff');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

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
        rename: true
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

  DocumentStoreProvider.prototype.load = function(metadata, callback) {
    return $.ajax({
      url: loadDocumentUrl,
      data: {
        recordid: metadata.providerData.id
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        if (this.options.patch) {
          this.previouslySavedContent = data;
        }
        return callback(null, JSON.stringify(data));
      },
      error: function() {
        return callback("Unable to load " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.save = function(content, metadata, callback) {
    var diff, params, sendContent, url;
    content = this._validateContent(content);
    params = {};
    if (metadata.providerData.id) {
      params.recordid = metadata.providerData.id;
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
        withCredentials: true
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
        return callback("Unable to load " + metadata.name);
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

  DocumentStoreProvider.prototype._validateContent = function(content) {
    var error;
    try {
      content = JSON.parse(content);
    } catch (error) {
      content = {
        content: content
      };
    }
    if (content.appName == null) {
      content.appName = this.options.appName;
    }
    if (content.appVersion == null) {
      content.appVersion = this.options.appVersion;
    }
    if (content.appBuildNum == null) {
      content.appBuildNum = this.options.appBuildNum;
    }
    return JSON.stringify(content);
  };

  DocumentStoreProvider.prototype._createDiff = function(json1, json2) {
    var diff, error;
    try {
      diff = jiff.diff(JSON.parse(json1), JSON.parse(json2));
      return JSON.stringify(diff);
    } catch (error) {
      return null;
    }
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":23,"../utils/translate":25,"./provider-interface":20,"jiff":2}],18:[function(require,module,exports){
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, button, div, isString, ref, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

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
        rename: true
      }
    });
    this.authToken = null;
    this.user = null;
    this.clientId = this.options.clientId;
    if (!this.clientId) {
      throw new Error('Missing required clientId in googleDrive provider options');
    }
    this.mimeType = this.options.mimeType || "text/plain";
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
        return _this._sendFile(content, metadata, callback);
      };
    })(this));
  };

  GoogleDriveProvider.prototype.load = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var request;
        request = gapi.client.drive.files.get({
          fileId: metadata.providerData.id
        });
        return request.execute(function(file) {
          if (file != null ? file.downloadUrl : void 0) {
            return _this._downloadFromUrl(file.downloadUrl, _this.authToken, callback);
          } else {
            return callback('Unable to get download url');
          }
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.list = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var request;
        request = gapi.client.drive.files.list({
          q: "mimeType = '" + _this.mimeType + "'"
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
            if (item.mimeType !== 'application/vnd.google-apps.folder') {
              list.push(new CloudMetadata({
                name: item.title,
                path: "",
                type: item.mimeType === 'application/vnd.google-apps.folder' ? CloudMetadata.Folder : CloudMetadata.File,
                provider: _this,
                providerData: {
                  id: item.id
                }
              }));
            }
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
              window._LoadedGAPIClients = true;
              return callback.call(self);
            });
          });
        } else {
          return setTimeout(check, 10);
        }
      };
      return setTimeout(check, 10);
    }
  };

  GoogleDriveProvider.prototype._downloadFromUrl = function(url, token, callback) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    if (token) {
      xhr.setRequestHeader('Authorization', "Bearer " + token.access_token);
    }
    xhr.onload = function() {
      return callback(null, xhr.responseText);
    };
    xhr.onerror = function() {
      return callback("Unable to download " + url);
    };
    return xhr.send();
  };

  GoogleDriveProvider.prototype._sendFile = function(content, metadata, callback) {
    var body, boundary, header, method, path, ref1, ref2, request;
    boundary = '-------314159265358979323846';
    header = JSON.stringify({
      title: metadata.name,
      mimeType: this.mimeType
    });
    ref2 = ((ref1 = metadata.providerData) != null ? ref1.id : void 0) ? ['PUT', "/upload/drive/v2/files/" + metadata.providerData.id] : ['POST', '/upload/drive/v2/files'], method = ref2[0], path = ref2[1];
    body = ["\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + header, "\r\n--" + boundary + "\r\nContent-Type: " + this.mimeType + "\r\n\r\n" + content, "\r\n--" + boundary + "--"].join('');
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

  return GoogleDriveProvider;

})(ProviderInterface);

module.exports = GoogleDriveProvider;



},{"../utils/is-string":23,"../utils/translate":25,"./provider-interface":20}],19:[function(require,module,exports){
var CloudMetadata, LocalStorageProvider, ProviderInterface, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

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
        rename: true
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
    var error;
    try {
      window.localStorage.setItem(this._getKey(metadata.name), content);
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to save') : void 0;
    }
  };

  LocalStorageProvider.prototype.load = function(metadata, callback) {
    var content, error;
    try {
      content = window.localStorage.getItem(this._getKey(metadata.name));
      return callback(null, content);
    } catch (error) {
      return callback('Unable to load');
    }
  };

  LocalStorageProvider.prototype.list = function(metadata, callback) {
    var key, list, name, path, prefix, ref, ref1, remainder;
    list = [];
    path = (metadata != null ? metadata.path : void 0) || '';
    prefix = this._getKey(path);
    ref = window.localStorage;
    for (key in ref) {
      if (!hasProp.call(ref, key)) continue;
      if (key.substr(0, prefix.length) === prefix) {
        ref1 = key.substr(prefix.length).split('/'), name = ref1[0], remainder = 2 <= ref1.length ? slice.call(ref1, 1) : [];
        list.push(new CloudMetadata({
          name: key.substr(prefix.length),
          path: path + "/" + name,
          type: remainder.length > 0 ? CloudMetadata.Folder : CloudMetadata.File,
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
    return "cfm::" + name;
  };

  return LocalStorageProvider;

})(ProviderInterface);

module.exports = LocalStorageProvider;



},{"../utils/translate":25,"./provider-interface":20}],20:[function(require,module,exports){
var AuthorizationNotImplementedDialog, CloudFile, CloudMetadata, ProviderInterface, div;

div = React.DOM.div;

CloudFile = (function() {
  function CloudFile() {}

  CloudFile.prototype.contructor = function(options) {
    return this.content = options.content, this.metadata = options.metadata, options;
  };

  return CloudFile;

})();

CloudMetadata = (function() {
  function CloudMetadata(options) {
    var ref;
    this.name = options.name, this.path = options.path, this.type = options.type, this.provider = options.provider, this.providerData = (ref = options.providerData) != null ? ref : {}, this.overwritable = options.overwritable;
  }

  CloudMetadata.Folder = 'folder';

  CloudMetadata.File = 'file';

  return CloudMetadata;

})();

AuthorizationNotImplementedDialog = React.createFactory(React.createClass({
  displayName: 'AuthorizationNotImplementedDialog',
  render: function() {
    return div({}, "Authorization dialog not yet implemented for " + this.props.provider.displayName);
  }
}));

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

  ProviderInterface.prototype._notImplemented = function(methodName) {
    return alert(methodName + " not implemented for " + this.name + " provider");
  };

  return ProviderInterface;

})();

module.exports = {
  CloudFile: CloudFile,
  CloudMetadata: CloudMetadata,
  ProviderInterface: ProviderInterface
};



},{}],21:[function(require,module,exports){
var CloudMetadata, ProviderInterface, ReadOnlyProvider, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

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
        rename: false
      }
    });
    this.tree = null;
  }

  ReadOnlyProvider.Name = 'readOnly';

  ReadOnlyProvider.prototype.load = function(metadata, callback) {
    return this._loadTree((function(_this) {
      return function(err, tree) {
        var parent;
        if (err) {
          return callback(err);
        }
        parent = _this._findParent(metadata);
        if (parent) {
          if (parent[metadata.name]) {
            if (parent[metadata.name].metadata.type === CloudMetadata.File) {
              return callback(null, parent[metadata.name].content);
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
        var file, filename, list, parent;
        if (err) {
          return callback(err);
        }
        parent = _this._findParent(metadata);
        if (parent) {
          list = [];
          for (filename in parent) {
            if (!hasProp.call(parent, filename)) continue;
            file = parent[filename];
            list.push(file.metadata);
          }
          return callback(null, list);
        } else if (metadata) {
          return callback(metadata.name + " folder not found");
        }
      };
    })(this));
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

  ReadOnlyProvider.prototype._convertJSONToMetadataTree = function(json, pathPrefix) {
    var filename, metadata, tree, type;
    if (pathPrefix == null) {
      pathPrefix = '/';
    }
    tree = {};
    for (filename in json) {
      if (!hasProp.call(json, filename)) continue;
      type = isString(json[filename]) ? CloudMetadata.File : CloudMetadata.Folder;
      metadata = new CloudMetadata({
        name: filename,
        path: pathPrefix + filename,
        type: type,
        provider: this,
        children: null
      });
      if (type === CloudMetadata.Folder) {
        metadata.children = _convertJSONToMetadataTree(json[filename], pathPrefix + filename + '/');
      }
      tree[filename] = {
        content: json[filename],
        metadata: metadata
      };
    }
    return tree;
  };

  ReadOnlyProvider.prototype._findParent = function(metadata) {
    if (!metadata) {
      return this.tree;
    } else {
      return this.tree;
    }
  };

  return ReadOnlyProvider;

})(ProviderInterface);

module.exports = ReadOnlyProvider;



},{"../utils/is-string":23,"../utils/translate":25,"./provider-interface":20}],22:[function(require,module,exports){
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'save', 'saveFileAsDialog', 'downloadDialog', 'renameDialog'];

  CloudFileManagerUIMenu.AutoSaveMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'saveCopyDialog', 'downloadDialog', 'renameDialog'];

  function CloudFileManagerUIMenu(options, client) {
    var i, item, len, menuItem, names, ref, ref1, setAction, setEnabled;
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
            var ref;
            return (ref = client.state.metadata) != null ? ref.provider.can('load') : void 0;
          };
        case 'renameDialog':
          return function() {
            var ref;
            return (ref = client.state.metadata) != null ? ref.provider.can('rename') : void 0;
          };
        case 'saveCopyDialog':
          return function() {
            return client.state.metadata != null;
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
      downloadDialog: tr("~MENU.DOWNLOAD"),
      renameDialog: tr("~MENU.RENAME")
    };
    this.items = [];
    ref = options.menu;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      menuItem = item === 'separator' ? {
        separator: true
      } : isString(item) ? {
        name: ((ref1 = options.menuNames) != null ? ref1[item] : void 0) || names[item] || ("Unknown item: " + item),
        enabled: setEnabled(item),
        action: setAction(item)
      } : (isString(item.action) ? (item.enabled = setEnabled(item.action), item.action = setAction(item.action)) : item.enabled || (item.enabled = true), item);
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



},{"./utils/is-string":23,"./utils/translate":25}],23:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],24:[function(require,module,exports){
module.exports = {
  "~MENUBAR.UNTITLE_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.REOPEN": "Reopen",
  "~MENU.SAVE": "Save",
  "~MENU.SAVE_AS": "Save As ...",
  "~MENU.SAVE_COPY": "Save A Copy ...",
  "~MENU.DOWNLOAD": "Download",
  "~MENU.RENAME": "Rename",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.SAVE_COPY": "Save A Copy ...",
  "~DIALOG.OPEN": "Open",
  "~DIALOG.DOWNLOAD": "Download",
  "~DIALOG.RENAME": "Rename",
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
  "~CONFIRM.OPEN_FILE": "You have unsaved changes.  Are you sure you want open a new file?",
  "~CONFIRM.NEW_FILE": "You have unsaved changes.  Are you sure you want a new file?",
  "~CONFIRM.REOPEN_FILE": "You have unsaved changes.  Are you sure you want reopen the file and return to its last saved state?"
};



},{}],25:[function(require,module,exports){
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



},{"./lang/en-us":24}],26:[function(require,module,exports){
var App, DownloadDialog, InnerApp, MenuBar, ProviderTabbedDialog, RenameDialog, div, iframe, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

DownloadDialog = React.createFactory(require('./download-dialog-view'));

RenameDialog = React.createFactory(require('./rename-dialog-view'));

tr = require('../utils/translate');

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
          case 'appendMenuItem':
            _this.state.menuItems.push(event.data);
            return _this.setState({
              menuItems: _this.state.menuItems
            });
          case 'setMenuBarInfo':
            _this.state.menuOptions.info = event.data;
            return _this.setState({
              menuOptions: _this.state.menuOptions
            });
        }
      };
    })(this));
  },
  closeDialogs: function() {
    return this.setState({
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null
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
        content: this.state.downloadDialog.content,
        close: this.closeDialogs
      });
    } else if (this.state.renameDialog) {
      return RenameDialog({
        filename: this.state.renameDialog.filename,
        callback: this.state.renameDialog.callback,
        close: this.closeDialogs
      });
    }
  },
  render: function() {
    if (this.props.usingIframe) {
      return div({
        className: 'app'
      }, MenuBar({
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



},{"../utils/translate":25,"./download-dialog-view":28,"./menu-bar-view":31,"./provider-tabbed-dialog-view":35,"./rename-dialog-view":36}],27:[function(require,module,exports){
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



},{}],28:[function(require,module,exports){
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
      e.target.setAttribute('href', "data:text/plain," + (encodeURIComponent(this.props.content)));
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



},{"../utils/translate":25,"./modal-dialog-view":32}],29:[function(require,module,exports){
var DropDown, DropdownItem, div, i, li, ref, span, ul;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, ul = ref.ul, li = ref.li;

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
    }, span({
      className: 'menu-anchor',
      onClick: (function(_this) {
        return function() {
          return _this.select(null);
        };
      })(this)
    }, this.props.anchor, i({
      className: 'icon-arrow-expand'
    })), ((ref1 = this.props.items) != null ? ref1.length : void 0) > 0 ? div({
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



},{}],30:[function(require,module,exports){
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
    }, this.props.metadata.name);
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
    return this.load();
  },
  load: function() {
    return this.props.provider.list(this.props.folder, (function(_this) {
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
  render: function() {
    var metadata;
    return div({
      className: 'filelist'
    }, (function() {
      var j, len, ref1, results;
      if (this.state.loading) {
        return tr("~FILE_DIALOG.LOADING");
      } else {
        ref1 = this.props.list;
        results = [];
        for (i = j = 0, len = ref1.length; j < len; i = ++j) {
          metadata = ref1[i];
          results.push(FileListFile({
            key: i,
            metadata: metadata,
            selected: this.props.selectedFile === metadata,
            fileSelected: this.props.fileSelected,
            fileConfirmed: this.props.fileConfirmed
          }));
        }
        return results;
      }
    }).call(this));
  }
}));

FileDialogTab = React.createClass({
  displayName: 'FileDialogTab',
  mixins: [AuthorizeMixin],
  getInitialState: function() {
    var ref1, ref2;
    return {
      folder: ((ref1 = this.props.client.state.metadata) != null ? ref1.parent : void 0) || null,
      metadata: this.props.client.state.metadata,
      filename: ((ref2 = this.props.client.state.metadata) != null ? ref2.name : void 0) || '',
      list: []
    };
  },
  componentWillMount: function() {
    return this.isOpen = this.props.dialog.action === 'openFile';
  },
  filenameChanged: function(e) {
    var filename, metadata;
    filename = e.target.value;
    metadata = this.findMetadata(filename);
    return this.setState({
      filename: filename,
      metadata: metadata
    });
  },
  listLoaded: function(list) {
    return this.setState({
      list: list
    });
  },
  fileSelected: function(metadata) {
    if ((metadata != null ? metadata.type : void 0) === CloudMetadata.File) {
      this.setState({
        filename: metadata.name
      });
    }
    return this.setState({
      metadata: metadata
    });
  },
  confirm: function() {
    var base, filename;
    if (!this.state.metadata) {
      filename = $.trim(this.state.filename);
      this.state.metadata = this.findMetadata(filename);
      if (!this.state.metadata) {
        if (this.isOpen) {
          alert(this.state.filename + " not found");
        } else {
          this.state.metadata = new CloudMetadata({
            name: filename,
            path: "/" + filename,
            type: CloudMetadata.File,
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
  findMetadata: function(filename) {
    var j, len, metadata, ref1;
    ref1 = this.state.list;
    for (j = 0, len = ref1.length; j < len; j++) {
      metadata = ref1[j];
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



},{"../providers/provider-interface":20,"../utils/translate":25,"./authorize-mixin":27}],31:[function(require,module,exports){
var Dropdown, div, i, ref, span;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span;

Dropdown = React.createFactory(require('./dropdown-view'));

module.exports = React.createClass({
  displayName: 'MenuBar',
  help: function() {
    return window.open(this.props.options.help, '_blank');
  },
  render: function() {
    return div({
      className: 'menu-bar'
    }, div({
      className: 'menu-bar-left'
    }, Dropdown({
      anchor: this.props.filename,
      items: this.props.items,
      className: 'menu-bar-content-filename'
    }), this.props.fileStatus ? span({
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



},{"./dropdown-view":29}],32:[function(require,module,exports){
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



},{"./modal-view":34}],33:[function(require,module,exports){
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



},{"./modal-dialog-view":32,"./tabbed-panel-view":38}],34:[function(require,module,exports){
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



},{}],35:[function(require,module,exports){
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



},{"../providers/provider-interface":20,"../utils/translate":25,"./file-dialog-tab-view":30,"./modal-tabbed-dialog-view":33,"./select-provider-dialog-tab-view":37,"./tabbed-panel-view":38}],36:[function(require,module,exports){
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



},{"../utils/translate":25,"./modal-dialog-view":32}],37:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],38:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwibm9kZV9tb2R1bGVzL2ppZmYvamlmZi5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9QYXRjaE5vdEludmVydGlibGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9UZXN0RmFpbGVkRXJyb3IuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvYXJyYXkuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvY29tbXV0ZVBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2ppZmYvbGliL2RlZXBFcXVhbHMuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvaW52ZXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9qc29uUGF0Y2guanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXIuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvanNvblBvaW50ZXJQYXJzZS5qcyIsIm5vZGVfbW9kdWxlcy9qaWZmL2xpYi9sY3MuanMiLCJub2RlX21vZHVsZXMvamlmZi9saWIvcGF0Y2hlcy5qcyIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL2NsaWVudC5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3VpLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2lzLXN0cmluZy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy9sYW5nL2VuLXVzLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL3RyYW5zbGF0ZS5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9hcHAtdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9hdXRob3JpemUtbWl4aW4uY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZG93bmxvYWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZHJvcGRvd24tdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9maWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tZW51LWJhci12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9yZW5hbWUtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3Mvc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy90YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBw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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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LFNBQUE7QUFDVixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGdCQUFaO0tBQUo7O0FBQ0U7QUFBQTtXQUFBLHNEQUFBOztxQkFBQSxFQUFBLENBQUc7VUFBQyxHQUFBLEVBQUssS0FBTjtTQUFILEVBQWlCLElBQUMsQ0FBQSxTQUFELENBQVcsR0FBWCxFQUFnQixLQUFoQixDQUFqQjtBQUFBOztpQkFERjtFQURTLENBcEJaO0VBeUJBLG1CQUFBLEVBQXFCLFNBQUE7QUFDbkIsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx5QkFBWjtLQUFKOztBQUNDO0FBQUE7V0FBQSxzREFBQTs7cUJBQ0csR0FBQSxDQUFJO1VBQ0gsR0FBQSxFQUFLLEtBREY7VUFFSCxLQUFBLEVBQ0U7WUFBQSxPQUFBLEVBQVksS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBQW5CLEdBQXlDLE9BQXpDLEdBQXNELE1BQS9EO1dBSEM7U0FBSixFQUtDLEdBQUcsQ0FBQyxTQUxMO0FBREg7O2lCQUREO0VBRGtCLENBekJyQjtFQXFDQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLEdBQUEsRUFBSyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQWI7TUFBa0IsU0FBQSxFQUFXLGNBQTdCO0tBQUosRUFDQyxJQUFDLENBQUEsVUFBRCxDQUFBLENBREQsRUFFQyxJQUFDLENBQUEsbUJBQUQsQ0FBQSxDQUZEO0VBREssQ0FyQ1I7Q0FGZSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xuXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50ID0gKHJlcXVpcmUgJy4vY2xpZW50JykuQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcbiAgICBAQXV0b1NhdmVNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5BdXRvU2F2ZU1lbnVcblxuICAgIEBjbGllbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudCgpXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxuXG4gIGluaXQ6IChAYXBwT3B0aW9ucywgdXNpbmdJZnJhbWUgPSBmYWxzZSkgLT5cbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXG5cbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkKSAtPlxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxuXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxuICAgIEBjbGllbnQuY29ubmVjdCBldmVudENhbGxiYWNrXG5cbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXG5cbiAgX3JlbmRlckFwcDogKGFuY2hvcikgLT5cbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBsY3MgPSByZXF1aXJlKCcuL2xpYi9sY3MnKTtcbnZhciBhcnJheSA9IHJlcXVpcmUoJy4vbGliL2FycmF5Jyk7XG52YXIgcGF0Y2ggPSByZXF1aXJlKCcuL2xpYi9qc29uUGF0Y2gnKTtcbnZhciBpbnZlcnNlID0gcmVxdWlyZSgnLi9saWIvaW52ZXJzZScpO1xudmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9saWIvanNvblBvaW50ZXInKTtcbnZhciBlbmNvZGVTZWdtZW50ID0ganNvblBvaW50ZXIuZW5jb2RlU2VnbWVudDtcblxuZXhwb3J0cy5kaWZmID0gZGlmZjtcbmV4cG9ydHMucGF0Y2ggPSBwYXRjaC5hcHBseTtcbmV4cG9ydHMucGF0Y2hJblBsYWNlID0gcGF0Y2guYXBwbHlJblBsYWNlO1xuZXhwb3J0cy5pbnZlcnNlID0gaW52ZXJzZTtcbmV4cG9ydHMuY2xvbmUgPSBwYXRjaC5jbG9uZTtcblxuLy8gRXJyb3JzXG5leHBvcnRzLkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9saWIvSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcbmV4cG9ydHMuVGVzdEZhaWxlZEVycm9yID0gcmVxdWlyZSgnLi9saWIvVGVzdEZhaWxlZEVycm9yJyk7XG5leHBvcnRzLlBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9saWIvUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3InKTtcblxudmFyIGlzVmFsaWRPYmplY3QgPSBwYXRjaC5pc1ZhbGlkT2JqZWN0O1xudmFyIGRlZmF1bHRIYXNoID0gcGF0Y2guZGVmYXVsdEhhc2g7XG5cbi8qKlxuICogQ29tcHV0ZSBhIEpTT04gUGF0Y2ggcmVwcmVzZW50aW5nIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGEgYW5kIGIuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHs/ZnVuY3Rpb258P29iamVjdH0gb3B0aW9ucyBpZiBhIGZ1bmN0aW9uLCBzZWUgb3B0aW9ucy5oYXNoXG4gKiBAcGFyYW0gez9mdW5jdGlvbih4OiopOlN0cmluZ3xOdW1iZXJ9IG9wdGlvbnMuaGFzaCB1c2VkIHRvIGhhc2ggYXJyYXkgaXRlbXNcbiAqICBpbiBvcmRlciB0byByZWNvZ25pemUgaWRlbnRpY2FsIG9iamVjdHMsIGRlZmF1bHRzIHRvIEpTT04uc3RyaW5naWZ5XG4gKiBAcGFyYW0gez9mdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5KTpvYmplY3R9IG9wdGlvbnMubWFrZUNvbnRleHRcbiAqICB1c2VkIHRvIGdlbmVyYXRlIHBhdGNoIGNvbnRleHQuIElmIG5vdCBwcm92aWRlZCwgY29udGV4dCB3aWxsIG5vdCBiZSBnZW5lcmF0ZWRcbiAqIEByZXR1cm5zIHthcnJheX0gSlNPTiBQYXRjaCBzdWNoIHRoYXQgcGF0Y2goZGlmZihhLCBiKSwgYSkgfiBiXG4gKi9cbmZ1bmN0aW9uIGRpZmYoYSwgYiwgb3B0aW9ucykge1xuXHRyZXR1cm4gYXBwZW5kQ2hhbmdlcyhhLCBiLCAnJywgaW5pdFN0YXRlKG9wdGlvbnMsIFtdKSkucGF0Y2g7XG59XG5cbi8qKlxuICogQ3JlYXRlIGluaXRpYWwgZGlmZiBzdGF0ZSBmcm9tIHRoZSBwcm92aWRlZCBvcHRpb25zXG4gKiBAcGFyYW0gez9mdW5jdGlvbnw/b2JqZWN0fSBvcHRpb25zIEBzZWUgZGlmZiBvcHRpb25zIGFib3ZlXG4gKiBAcGFyYW0ge2FycmF5fSBwYXRjaCBhbiBlbXB0eSBvciBleGlzdGluZyBKU09OIFBhdGNoIGFycmF5IGludG8gd2hpY2hcbiAqICB0aGUgZGlmZiBzaG91bGQgZ2VuZXJhdGUgbmV3IHBhdGNoIG9wZXJhdGlvbnNcbiAqIEByZXR1cm5zIHtvYmplY3R9IGluaXRpYWxpemVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gaW5pdFN0YXRlKG9wdGlvbnMsIHBhdGNoKSB7XG5cdGlmKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucy5oYXNoLCBkZWZhdWx0SGFzaCksXG5cdFx0XHRtYWtlQ29udGV4dDogb3JFbHNlKGlzRnVuY3Rpb24sIG9wdGlvbnMubWFrZUNvbnRleHQsIGRlZmF1bHRDb250ZXh0KSxcblx0XHRcdGludmVydGlibGU6ICEob3B0aW9ucy5pbnZlcnRpYmxlID09PSBmYWxzZSlcblx0XHR9O1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB7XG5cdFx0XHRwYXRjaDogcGF0Y2gsXG5cdFx0XHRoYXNoOiBvckVsc2UoaXNGdW5jdGlvbiwgb3B0aW9ucywgZGVmYXVsdEhhc2gpLFxuXHRcdFx0bWFrZUNvbnRleHQ6IGRlZmF1bHRDb250ZXh0LFxuXHRcdFx0aW52ZXJ0aWJsZTogdHJ1ZVxuXHRcdH07XG5cdH1cbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gSlNPTiB2YWx1ZXMgKG9iamVjdCwgYXJyYXksIG51bWJlciwgc3RyaW5nLCBldGMuKSwgZmluZCB0aGVpclxuICogZGlmZmVyZW5jZXMgYW5kIGFwcGVuZCB0aGVtIHRvIHRoZSBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGFcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ8bnVsbH0gYlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHJldHVybnMge09iamVjdH0gdXBkYXRlZCBkaWZmIHN0YXRlXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZENoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGFwcGVuZEFycmF5Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRpZihpc1ZhbGlkT2JqZWN0KGEpICYmIGlzVmFsaWRPYmplY3QoYikpIHtcblx0XHRyZXR1cm4gYXBwZW5kT2JqZWN0Q2hhbmdlcyhhLCBiLCBwYXRoLCBzdGF0ZSk7XG5cdH1cblxuXHRyZXR1cm4gYXBwZW5kVmFsdWVDaGFuZ2VzKGEsIGIsIHBhdGgsIHN0YXRlKTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gb2JqZWN0cywgZmluZCB0aGVpciBkaWZmZXJlbmNlcyBhbmQgYXBwZW5kIHRoZW0gdG8gdGhlIGRpZmYgc3RhdGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBvMVxuICogQHBhcmFtIHtvYmplY3R9IG8yXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kT2JqZWN0Q2hhbmdlcyhvMSwgbzIsIHBhdGgsIHN0YXRlKSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMobzIpO1xuXHR2YXIgcGF0Y2ggPSBzdGF0ZS5wYXRjaDtcblx0dmFyIGksIGtleTtcblxuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdHZhciBrZXlQYXRoID0gcGF0aCArICcvJyArIGVuY29kZVNlZ21lbnQoa2V5KTtcblx0XHRpZihvMVtrZXldICE9PSB2b2lkIDApIHtcblx0XHRcdGFwcGVuZENoYW5nZXMobzFba2V5XSwgbzJba2V5XSwga2V5UGF0aCwgc3RhdGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdhZGQnLCBwYXRoOiBrZXlQYXRoLCB2YWx1ZTogbzJba2V5XSB9KTtcblx0XHR9XG5cdH1cblxuXHRrZXlzID0gT2JqZWN0LmtleXMobzEpO1xuXHRmb3IoaT1rZXlzLmxlbmd0aC0xOyBpPj0wOyAtLWkpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdGlmKG8yW2tleV0gPT09IHZvaWQgMCkge1xuXHRcdFx0dmFyIHAgPSBwYXRoICsgJy8nICsgZW5jb2RlU2VnbWVudChrZXkpO1xuXHRcdFx0aWYoc3RhdGUuaW52ZXJ0aWJsZSkge1xuXHRcdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICd0ZXN0JywgcGF0aDogcCwgdmFsdWU6IG8xW2tleV0gfSk7XG5cdFx0XHR9XG5cdFx0XHRwYXRjaC5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBwIH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gYXJyYXlzLCBmaW5kIHRoZWlyIGRpZmZlcmVuY2VzIGFuZCBhcHBlbmQgdGhlbSB0byB0aGUgZGlmZiBzdGF0ZVxuICogQHBhcmFtIHthcnJheX0gYTFcbiAqIEBwYXJhbSB7YXJyYXl9IGEyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICogQHBhcmFtIHtvYmplY3R9IHN0YXRlXG4gKiBAcmV0dXJucyB7T2JqZWN0fSB1cGRhdGVkIGRpZmYgc3RhdGVcbiAqL1xuZnVuY3Rpb24gYXBwZW5kQXJyYXlDaGFuZ2VzKGExLCBhMiwgcGF0aCwgc3RhdGUpIHtcblx0dmFyIGExaGFzaCA9IGFycmF5Lm1hcChzdGF0ZS5oYXNoLCBhMSk7XG5cdHZhciBhMmhhc2ggPSBhcnJheS5tYXAoc3RhdGUuaGFzaCwgYTIpO1xuXG5cdHZhciBsY3NNYXRyaXggPSBsY3MuY29tcGFyZShhMWhhc2gsIGEyaGFzaCk7XG5cblx0cmV0dXJuIGxjc1RvSnNvblBhdGNoKGExLCBhMiwgcGF0aCwgc3RhdGUsIGxjc01hdHJpeCk7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIGxjc01hdHJpeCBpbnRvIEpTT04gUGF0Y2ggb3BlcmF0aW9ucyBhbmQgYXBwZW5kXG4gKiB0aGVtIHRvIHN0YXRlLnBhdGNoLCByZWN1cnNpbmcgaW50byBhcnJheSBlbGVtZW50cyBhcyBuZWNlc3NhcnlcbiAqIEBwYXJhbSB7YXJyYXl9IGExXG4gKiBAcGFyYW0ge2FycmF5fSBhMlxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtvYmplY3R9IGxjc01hdHJpeFxuICogQHJldHVybnMge29iamVjdH0gbmV3IHN0YXRlIHdpdGggSlNPTiBQYXRjaCBvcGVyYXRpb25zIGFkZGVkIGJhc2VkXG4gKiAgb24gdGhlIHByb3ZpZGVkIGxjc01hdHJpeFxuICovXG5mdW5jdGlvbiBsY3NUb0pzb25QYXRjaChhMSwgYTIsIHBhdGgsIHN0YXRlLCBsY3NNYXRyaXgpIHtcblx0dmFyIG9mZnNldCA9IDA7XG5cdHJldHVybiBsY3MucmVkdWNlKGZ1bmN0aW9uKHN0YXRlLCBvcCwgaSwgaikge1xuXHRcdHZhciBsYXN0LCBjb250ZXh0O1xuXHRcdHZhciBwYXRjaCA9IHN0YXRlLnBhdGNoO1xuXHRcdHZhciBwID0gcGF0aCArICcvJyArIChqICsgb2Zmc2V0KTtcblxuXHRcdGlmIChvcCA9PT0gbGNzLlJFTU9WRSkge1xuXHRcdFx0Ly8gQ29hbGVzY2UgYWRqYWNlbnQgcmVtb3ZlICsgYWRkIGludG8gcmVwbGFjZVxuXHRcdFx0bGFzdCA9IHBhdGNoW3BhdGNoLmxlbmd0aC0xXTtcblx0XHRcdGNvbnRleHQgPSBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSk7XG5cblx0XHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IHAsIHZhbHVlOiBhMVtqXSwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYobGFzdCAhPT0gdm9pZCAwICYmIGxhc3Qub3AgPT09ICdhZGQnICYmIGxhc3QucGF0aCA9PT0gcCkge1xuXHRcdFx0XHRsYXN0Lm9wID0gJ3JlcGxhY2UnO1xuXHRcdFx0XHRsYXN0LmNvbnRleHQgPSBjb250ZXh0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAncmVtb3ZlJywgcGF0aDogcCwgY29udGV4dDogY29udGV4dCB9KTtcblx0XHRcdH1cblxuXHRcdFx0b2Zmc2V0IC09IDE7XG5cblx0XHR9IGVsc2UgaWYgKG9wID09PSBsY3MuQUREKSB7XG5cdFx0XHQvLyBTZWUgaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDIjc2VjdGlvbi00LjFcblx0XHRcdC8vIE1heSB1c2UgZWl0aGVyIGluZGV4PT09bGVuZ3RoICpvciogJy0nIHRvIGluZGljYXRlIGFwcGVuZGluZyB0byBhcnJheVxuXHRcdFx0cGF0Y2gucHVzaCh7IG9wOiAnYWRkJywgcGF0aDogcCwgdmFsdWU6IGEyW2ldLFxuXHRcdFx0XHRjb250ZXh0OiBzdGF0ZS5tYWtlQ29udGV4dChqLCBhMSlcblx0XHRcdH0pO1xuXG5cdFx0XHRvZmZzZXQgKz0gMTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcHBlbmRDaGFuZ2VzKGExW2pdLCBhMltpXSwgcCwgc3RhdGUpO1xuXHRcdH1cblxuXHRcdHJldHVybiBzdGF0ZTtcblxuXHR9LCBzdGF0ZSwgbGNzTWF0cml4KTtcbn1cblxuLyoqXG4gKiBHaXZlbiB0d28gbnVtYmVyfHN0cmluZ3xudWxsIHZhbHVlcywgaWYgdGhleSBkaWZmZXIsIGFwcGVuZCB0byBkaWZmIHN0YXRlXG4gKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ8bnVsbH0gYVxuICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfG51bGx9IGJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEByZXR1cm5zIHtvYmplY3R9IHVwZGF0ZWQgZGlmZiBzdGF0ZVxuICovXG5mdW5jdGlvbiBhcHBlbmRWYWx1ZUNoYW5nZXMoYSwgYiwgcGF0aCwgc3RhdGUpIHtcblx0aWYoYSAhPT0gYikge1xuXHRcdGlmKHN0YXRlLmludmVydGlibGUpIHtcblx0XHRcdHN0YXRlLnBhdGNoLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwYXRoLCB2YWx1ZTogYSB9KTtcblx0XHR9XG5cblx0XHRzdGF0ZS5wYXRjaC5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcGF0aCwgdmFsdWU6IGIgfSk7XG5cdH1cblxuXHRyZXR1cm4gc3RhdGU7XG59XG5cbi8qKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gcHJlZGljYXRlXG4gKiBAcGFyYW0geyp9IHhcbiAqIEBwYXJhbSB7Kn0geVxuICogQHJldHVybnMgeyp9IHggaWYgcHJlZGljYXRlKHgpIGlzIHRydXRoeSwgb3RoZXJ3aXNlIHlcbiAqL1xuZnVuY3Rpb24gb3JFbHNlKHByZWRpY2F0ZSwgeCwgeSkge1xuXHRyZXR1cm4gcHJlZGljYXRlKHgpID8geCA6IHk7XG59XG5cbi8qKlxuICogRGVmYXVsdCBwYXRjaCBjb250ZXh0IGdlbmVyYXRvclxuICogQHJldHVybnMge3VuZGVmaW5lZH0gdW5kZWZpbmVkIGNvbnRleHRcbiAqL1xuZnVuY3Rpb24gZGVmYXVsdENvbnRleHQoKSB7XG5cdHJldHVybiB2b2lkIDA7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiB4IGlzIGEgZnVuY3Rpb24sIGZhbHNlIG90aGVyd2lzZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcblx0cmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcjtcblxuZnVuY3Rpb24gSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IobWVzc2FnZSkge1xuXHRFcnJvci5jYWxsKHRoaXMpO1xuXHR0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG5cdHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG5cdGlmKHR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuXHR9XG59XG5cbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbkludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yOyIsIm1vZHVsZS5leHBvcnRzID0gUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3I7XG5cbmZ1bmN0aW9uIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5QYXRjaE5vdEludmVydGlibGVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQYXRjaE5vdEludmVydGlibGVFcnJvcjsiLCJtb2R1bGUuZXhwb3J0cyA9IFRlc3RGYWlsZWRFcnJvcjtcblxuZnVuY3Rpb24gVGVzdEZhaWxlZEVycm9yKG1lc3NhZ2UpIHtcblx0RXJyb3IuY2FsbCh0aGlzKTtcblx0dGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuXHR0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRpZih0eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UgPT09ICdmdW5jdGlvbicpIHtcblx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcblx0fVxufVxuXG5UZXN0RmFpbGVkRXJyb3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuVGVzdEZhaWxlZEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRlc3RGYWlsZWRFcnJvcjsiLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxuZXhwb3J0cy5jb25zID0gY29ucztcbmV4cG9ydHMudGFpbCA9IHRhaWw7XG5leHBvcnRzLm1hcCA9IG1hcDtcblxuLyoqXG4gKiBQcmVwZW5kIHggdG8gYSwgd2l0aG91dCBtdXRhdGluZyBhLiBGYXN0ZXIgdGhhbiBhLnVuc2hpZnQoeClcbiAqIEBwYXJhbSB7Kn0geFxuICogQHBhcmFtIHtBcnJheX0gYSBhcnJheS1saWtlXG4gKiBAcmV0dXJucyB7QXJyYXl9IG5ldyBBcnJheSB3aXRoIHggcHJlcGVuZGVkXG4gKi9cbmZ1bmN0aW9uIGNvbnMoeCwgYSkge1xuXHR2YXIgbCA9IGEubGVuZ3RoO1xuXHR2YXIgYiA9IG5ldyBBcnJheShsKzEpO1xuXHRiWzBdID0geDtcblx0Zm9yKHZhciBpPTA7IGk8bDsgKytpKSB7XG5cdFx0YltpKzFdID0gYVtpXTtcblx0fVxuXG5cdHJldHVybiBiO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBBcnJheSBjb250YWluaW5nIGFsbCBlbGVtZW50cyBpbiBhLCBleGNlcHQgdGhlIGZpcnN0LlxuICogIEZhc3RlciB0aGFuIGEuc2xpY2UoMSlcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXksIHRoZSBlcXVpdmFsZW50IG9mIGEuc2xpY2UoMSlcbiAqL1xuZnVuY3Rpb24gdGFpbChhKSB7XG5cdHZhciBsID0gYS5sZW5ndGgtMTtcblx0dmFyIGIgPSBuZXcgQXJyYXkobCk7XG5cdGZvcih2YXIgaT0wOyBpPGw7ICsraSkge1xuXHRcdGJbaV0gPSBhW2krMV07XG5cdH1cblxuXHRyZXR1cm4gYjtcbn1cblxuLyoqXG4gKiBNYXAgYW55IGFycmF5LWxpa2UuIEZhc3RlciB0aGFuIEFycmF5LnByb3RvdHlwZS5tYXBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSB7QXJyYXl9IGEgYXJyYXktbGlrZVxuICogQHJldHVybnMge0FycmF5fSBuZXcgQXJyYXkgbWFwcGVkIGJ5IGZcbiAqL1xuZnVuY3Rpb24gbWFwKGYsIGEpIHtcblx0dmFyIGIgPSBuZXcgQXJyYXkoYS5sZW5ndGgpO1xuXHRmb3IodmFyIGk9MDsgaTwgYS5sZW5ndGg7ICsraSkge1xuXHRcdGJbaV0gPSBmKGFbaV0pO1xuXHR9XG5cdHJldHVybiBiO1xufSIsIi8qKiBAbGljZW5zZSBNSVQgTGljZW5zZSAoYykgY29weXJpZ2h0IDIwMTAtMjAxNCBvcmlnaW5hbCBhdXRob3Igb3IgYXV0aG9ycyAqL1xuLyoqIEBhdXRob3IgQnJpYW4gQ2F2YWxpZXIgKi9cbi8qKiBAYXV0aG9yIEpvaG4gSGFubiAqL1xuXG4vKipcbiAqIENyZWF0ZSBhIGRlZXAgY29weSBvZiB4IHdoaWNoIG11c3QgYmUgYSBsZWdhbCBKU09OIG9iamVjdC9hcnJheS92YWx1ZVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxudWxsfSB4IG9iamVjdC9hcnJheS92YWx1ZSB0byBjbG9uZVxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfG51bGx9IGNsb25lIG9mIHhcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcblxuZnVuY3Rpb24gY2xvbmUoeCkge1xuXHRpZih4ID09IG51bGwgfHwgdHlwZW9mIHggIT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0cmV0dXJuIGNsb25lQXJyYXkoeCk7XG5cdH1cblxuXHRyZXR1cm4gY2xvbmVPYmplY3QoeCk7XG59XG5cbmZ1bmN0aW9uIGNsb25lQXJyYXkgKHgpIHtcblx0dmFyIGwgPSB4Lmxlbmd0aDtcblx0dmFyIHkgPSBuZXcgQXJyYXkobCk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsOyArK2kpIHtcblx0XHR5W2ldID0gY2xvbmUoeFtpXSk7XG5cdH1cblxuXHRyZXR1cm4geTtcbn1cblxuZnVuY3Rpb24gY2xvbmVPYmplY3QgKHgpIHtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyh4KTtcblx0dmFyIHkgPSB7fTtcblxuXHRmb3IgKHZhciBrLCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG5cdFx0ayA9IGtleXNbaV07XG5cdFx0eVtrXSA9IGNsb25lKHhba10pO1xuXHR9XG5cblx0cmV0dXJuIHk7XG59XG4iLCJ2YXIganNvblBvaW50ZXIgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyJyk7XG5cbi8qKlxuICogY29tbXV0ZSB0aGUgcGF0Y2ggc2VxdWVuY2UgYSxiIHRvIGIsYVxuICogQHBhcmFtIHtvYmplY3R9IGEgcGF0Y2ggb3BlcmF0aW9uXG4gKiBAcGFyYW0ge29iamVjdH0gYiBwYXRjaCBvcGVyYXRpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21tdXRlUGF0aHMoYSwgYikge1xuXHQvLyBUT0RPOiBjYXNlcyBmb3Igc3BlY2lhbCBwYXRoczogJycgYW5kICcvJ1xuXHR2YXIgbGVmdCA9IGpzb25Qb2ludGVyLnBhcnNlKGEucGF0aCk7XG5cdHZhciByaWdodCA9IGpzb25Qb2ludGVyLnBhcnNlKGIucGF0aCk7XG5cdHZhciBwcmVmaXggPSBnZXRDb21tb25QYXRoUHJlZml4KGxlZnQsIHJpZ2h0KTtcblx0dmFyIGlzQXJyYXkgPSBpc0FycmF5UGF0aChsZWZ0LCByaWdodCwgcHJlZml4Lmxlbmd0aCk7XG5cblx0Ly8gTmV2ZXIgbXV0YXRlIHRoZSBvcmlnaW5hbHNcblx0dmFyIGFjID0gY29weVBhdGNoKGEpO1xuXHR2YXIgYmMgPSBjb3B5UGF0Y2goYik7XG5cblx0aWYocHJlZml4Lmxlbmd0aCA9PT0gMCAmJiAhaXNBcnJheSkge1xuXHRcdC8vIFBhdGhzIHNoYXJlIG5vIGNvbW1vbiBhbmNlc3Rvciwgc2ltcGxlIHN3YXBcblx0XHRyZXR1cm4gW2JjLCBhY107XG5cdH1cblxuXHRpZihpc0FycmF5KSB7XG5cdFx0cmV0dXJuIGNvbW11dGVBcnJheVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBjb21tdXRlVHJlZVBhdGhzKGFjLCBsZWZ0LCBiYywgcmlnaHQpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBjb21tdXRlVHJlZVBhdGhzKGEsIGxlZnQsIGIsIHJpZ2h0KSB7XG5cdGlmKGEucGF0aCA9PT0gYi5wYXRoKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignY2Fubm90IGNvbW11dGUgJyArIGEub3AgKyAnLCcgKyBiLm9wICsgJyB3aXRoIGlkZW50aWNhbCBvYmplY3QgcGF0aHMnKTtcblx0fVxuXHQvLyBGSVhNRTogSW1wbGVtZW50IHRyZWUgcGF0aCBjb21tdXRhdGlvblxuXHRyZXR1cm4gW2IsIGFdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2hvc2UgY29tbW9uIGFuY2VzdG9yICh3aGljaCBtYXkgYmUgdGhlIGltbWVkaWF0ZSBwYXJlbnQpXG4gKiBpcyBhbiBhcnJheVxuICogQHBhcmFtIGFcbiAqIEBwYXJhbSBsZWZ0XG4gKiBAcGFyYW0gYlxuICogQHBhcmFtIHJpZ2h0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY29tbXV0ZUFycmF5UGF0aHMoYSwgbGVmdCwgYiwgcmlnaHQpIHtcblx0aWYobGVmdC5sZW5ndGggPT09IHJpZ2h0Lmxlbmd0aCkge1xuXHRcdHJldHVybiBjb21tdXRlQXJyYXlTaWJsaW5ncyhhLCBsZWZ0LCBiLCByaWdodCk7XG5cdH1cblxuXHRpZiAobGVmdC5sZW5ndGggPiByaWdodC5sZW5ndGgpIHtcblx0XHQvLyBsZWZ0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSByaWdodFxuXHRcdGxlZnQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihiLCByaWdodCwgYSwgbGVmdCwgLTEpO1xuXHRcdGEucGF0aCA9IGpzb25Qb2ludGVyLmFic29sdXRlKGpzb25Qb2ludGVyLmpvaW4obGVmdCkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIHJpZ2h0IGlzIGxvbmdlciwgY29tbXV0ZSBieSBcIm1vdmluZ1wiIGl0IHRvIHRoZSBsZWZ0XG5cdFx0cmlnaHQgPSBjb21tdXRlQXJyYXlBbmNlc3RvcihhLCBsZWZ0LCBiLCByaWdodCwgMSk7XG5cdFx0Yi5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihyaWdodCkpO1xuXHR9XG5cblx0cmV0dXJuIFtiLCBhXTtcbn1cblxuZnVuY3Rpb24gaXNBcnJheVBhdGgobGVmdCwgcmlnaHQsIGluZGV4KSB7XG5cdHJldHVybiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChsZWZ0W2luZGV4XSlcblx0XHQmJiBqc29uUG9pbnRlci5pc1ZhbGlkQXJyYXlJbmRleChyaWdodFtpbmRleF0pO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgcmVmZXJyaW5nIHRvIGl0ZW1zIGluIHRoZSBzYW1lIGFycmF5XG4gKiBAcGFyYW0gbFxuICogQHBhcmFtIGxwYXRoXG4gKiBAcGFyYW0gclxuICogQHBhcmFtIHJwYXRoXG4gKiBAcmV0dXJucyB7KltdfVxuICovXG5mdW5jdGlvbiBjb21tdXRlQXJyYXlTaWJsaW5ncyhsLCBscGF0aCwgciwgcnBhdGgpIHtcblxuXHR2YXIgdGFyZ2V0ID0gbHBhdGgubGVuZ3RoLTE7XG5cdHZhciBsaW5kZXggPSArbHBhdGhbdGFyZ2V0XTtcblx0dmFyIHJpbmRleCA9ICtycGF0aFt0YXJnZXRdO1xuXG5cdHZhciBjb21tdXRlZDtcblxuXHRpZihsaW5kZXggPCByaW5kZXgpIHtcblx0XHQvLyBBZGp1c3QgcmlnaHQgcGF0aFxuXHRcdGlmKGwub3AgPT09ICdhZGQnIHx8IGwub3AgPT09ICdjb3B5Jykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIDEpO1xuXHRcdFx0ci5wYXRoID0ganNvblBvaW50ZXIuYWJzb2x1dGUoanNvblBvaW50ZXIuam9pbihjb21tdXRlZCkpO1xuXHRcdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdFx0Y29tbXV0ZWQgPSBycGF0aC5zbGljZSgpO1xuXHRcdFx0Y29tbXV0ZWRbdGFyZ2V0XSA9IHJpbmRleCArIDE7XG5cdFx0XHRyLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdFx0fVxuXHR9IGVsc2UgaWYoci5vcCA9PT0gJ2FkZCcgfHwgci5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aFxuXHRcdGNvbW11dGVkID0gbHBhdGguc2xpY2UoKTtcblx0XHRjb21tdXRlZFt0YXJnZXRdID0gbGluZGV4ICsgMTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH0gZWxzZSBpZiAobGluZGV4ID4gcmluZGV4ICYmIHIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0Ly8gQWRqdXN0IGxlZnQgcGF0aCBvbmx5IGlmIHJlbW92ZSB3YXMgYXQgYSAoc3RyaWN0bHkpIGxvd2VyIGluZGV4XG5cdFx0Y29tbXV0ZWQgPSBscGF0aC5zbGljZSgpO1xuXHRcdGNvbW11dGVkW3RhcmdldF0gPSBNYXRoLm1heCgwLCBsaW5kZXggLSAxKTtcblx0XHRsLnBhdGggPSBqc29uUG9pbnRlci5hYnNvbHV0ZShqc29uUG9pbnRlci5qb2luKGNvbW11dGVkKSk7XG5cdH1cblxuXHRyZXR1cm4gW3IsIGxdO1xufVxuXG4vKipcbiAqIENvbW11dGUgdHdvIHBhdGNoZXMgd2l0aCBhIGNvbW1vbiBhcnJheSBhbmNlc3RvclxuICogQHBhcmFtIGxcbiAqIEBwYXJhbSBscGF0aFxuICogQHBhcmFtIHJcbiAqIEBwYXJhbSBycGF0aFxuICogQHBhcmFtIGRpcmVjdGlvblxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNvbW11dGVBcnJheUFuY2VzdG9yKGwsIGxwYXRoLCByLCBycGF0aCwgZGlyZWN0aW9uKSB7XG5cdC8vIHJwYXRoIGlzIGxvbmdlciBvciBzYW1lIGxlbmd0aFxuXG5cdHZhciB0YXJnZXQgPSBscGF0aC5sZW5ndGgtMTtcblx0dmFyIGxpbmRleCA9ICtscGF0aFt0YXJnZXRdO1xuXHR2YXIgcmluZGV4ID0gK3JwYXRoW3RhcmdldF07XG5cblx0Ly8gQ29weSBycGF0aCwgdGhlbiBhZGp1c3QgaXRzIGFycmF5IGluZGV4XG5cdHZhciByYyA9IHJwYXRoLnNsaWNlKCk7XG5cblx0aWYobGluZGV4ID4gcmluZGV4KSB7XG5cdFx0cmV0dXJuIHJjO1xuXHR9XG5cblx0aWYobC5vcCA9PT0gJ2FkZCcgfHwgbC5vcCA9PT0gJ2NvcHknKSB7XG5cdFx0cmNbdGFyZ2V0XSA9IE1hdGgubWF4KDAsIHJpbmRleCAtIGRpcmVjdGlvbik7XG5cdH0gZWxzZSBpZihsLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJjW3RhcmdldF0gPSBNYXRoLm1heCgwLCByaW5kZXggKyBkaXJlY3Rpb24pO1xuXHR9XG5cblx0cmV0dXJuIHJjO1xufVxuXG5mdW5jdGlvbiBnZXRDb21tb25QYXRoUHJlZml4KHAxLCBwMikge1xuXHR2YXIgcDFsID0gcDEubGVuZ3RoO1xuXHR2YXIgcDJsID0gcDIubGVuZ3RoO1xuXHRpZihwMWwgPT09IDAgfHwgcDJsID09PSAwIHx8IChwMWwgPCAyICYmIHAybCA8IDIpKSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG5cblx0Ly8gSWYgcGF0aHMgYXJlIHNhbWUgbGVuZ3RoLCB0aGUgbGFzdCBzZWdtZW50IGNhbm5vdCBiZSBwYXJ0XG5cdC8vIG9mIGEgY29tbW9uIHByZWZpeC4gIElmIG5vdCB0aGUgc2FtZSBsZW5ndGgsIHRoZSBwcmVmaXggY2Fubm90XG5cdC8vIGJlIGxvbmdlciB0aGFuIHRoZSBzaG9ydGVyIHBhdGguXG5cdHZhciBsID0gcDFsID09PSBwMmxcblx0XHQ/IHAxbCAtIDFcblx0XHQ6IE1hdGgubWluKHAxbCwgcDJsKTtcblxuXHR2YXIgaSA9IDA7XG5cdHdoaWxlKGkgPCBsICYmIHAxW2ldID09PSBwMltpXSkge1xuXHRcdCsraVxuXHR9XG5cblx0cmV0dXJuIHAxLnNsaWNlKDAsIGkpO1xufVxuXG5mdW5jdGlvbiBjb3B5UGF0Y2gocCkge1xuXHRpZihwLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHJldHVybiB7IG9wOiBwLm9wLCBwYXRoOiBwLnBhdGggfTtcblx0fVxuXG5cdGlmKHAub3AgPT09ICdjb3B5JyB8fCBwLm9wID09PSAnbW92ZScpIHtcblx0XHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCBmcm9tOiBwLmZyb20gfTtcblx0fVxuXG5cdC8vIHRlc3QsIGFkZCwgcmVwbGFjZVxuXHRyZXR1cm4geyBvcDogcC5vcCwgcGF0aDogcC5wYXRoLCB2YWx1ZTogcC52YWx1ZSB9O1xufSIsIm1vZHVsZS5leHBvcnRzID0gZGVlcEVxdWFscztcblxuLyoqXG4gKiBDb21wYXJlIDIgSlNPTiB2YWx1ZXMsIG9yIHJlY3Vyc2l2ZWx5IGNvbXBhcmUgMiBKU09OIG9iamVjdHMgb3IgYXJyYXlzXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbH0gYVxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl8c3RyaW5nfG51bWJlcnxib29sZWFufG51bGx9IGJcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmZiBhIGFuZCBiIGFyZSByZWN1cnNpdmVseSBlcXVhbFxuICovXG5mdW5jdGlvbiBkZWVwRXF1YWxzKGEsIGIpIHtcblx0aWYoYSA9PT0gYikge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0aWYoQXJyYXkuaXNBcnJheShhKSAmJiBBcnJheS5pc0FycmF5KGIpKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVBcnJheXMoYSwgYik7XG5cdH1cblxuXHRpZih0eXBlb2YgYSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGIgPT09ICdvYmplY3QnKSB7XG5cdFx0cmV0dXJuIGNvbXBhcmVPYmplY3RzKGEsIGIpO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb21wYXJlQXJyYXlzKGEsIGIpIHtcblx0aWYoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Zm9yKHZhciBpID0gMDsgaTxhLmxlbmd0aDsgKytpKSB7XG5cdFx0aWYoIWRlZXBFcXVhbHMoYVtpXSwgYltpXSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZU9iamVjdHMoYSwgYikge1xuXHRpZigoYSA9PT0gbnVsbCAmJiBiICE9PSBudWxsKSB8fCAoYSAhPT0gbnVsbCAmJiBiID09PSBudWxsKSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHZhciBha2V5cyA9IE9iamVjdC5rZXlzKGEpO1xuXHR2YXIgYmtleXMgPSBPYmplY3Qua2V5cyhiKTtcblxuXHRpZihha2V5cy5sZW5ndGggIT09IGJrZXlzLmxlbmd0aCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGZvcih2YXIgaSA9IDAsIGs7IGk8YWtleXMubGVuZ3RoOyArK2kpIHtcblx0XHRrID0gYWtleXNbaV07XG5cdFx0aWYoIShrIGluIGIgJiYgZGVlcEVxdWFscyhhW2tdLCBiW2tdKSkpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdHJ1ZTtcbn0iLCJ2YXIgcGF0Y2hlcyA9IHJlcXVpcmUoJy4vcGF0Y2hlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGludmVyc2UocCkge1xuXHR2YXIgcHIgPSBbXTtcblx0dmFyIGksIHNraXA7XG5cdGZvcihpID0gcC5sZW5ndGgtMTsgaT49IDA7IGkgLT0gc2tpcCkge1xuXHRcdHNraXAgPSBpbnZlcnRPcChwciwgcFtpXSwgaSwgcCk7XG5cdH1cblxuXHRyZXR1cm4gcHI7XG59O1xuXG5mdW5jdGlvbiBpbnZlcnRPcChwYXRjaCwgYywgaSwgY29udGV4dCkge1xuXHR2YXIgb3AgPSBwYXRjaGVzW2Mub3BdO1xuXHRyZXR1cm4gb3AgIT09IHZvaWQgMCAmJiB0eXBlb2Ygb3AuaW52ZXJzZSA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdD8gb3AuaW52ZXJzZShwYXRjaCwgYywgaSwgY29udGV4dClcblx0XHQ6IDE7XG59XG4iLCIvKiogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKGMpIGNvcHlyaWdodCAyMDEwLTIwMTQgb3JpZ2luYWwgYXV0aG9yIG9yIGF1dGhvcnMgKi9cbi8qKiBAYXV0aG9yIEJyaWFuIENhdmFsaWVyICovXG4vKiogQGF1dGhvciBKb2huIEhhbm4gKi9cblxudmFyIHBhdGNoZXMgPSByZXF1aXJlKCcuL3BhdGNoZXMnKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3InKTtcblxuZXhwb3J0cy5hcHBseSA9IHBhdGNoO1xuZXhwb3J0cy5hcHBseUluUGxhY2UgPSBwYXRjaEluUGxhY2U7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmlzVmFsaWRPYmplY3QgPSBpc1ZhbGlkT2JqZWN0O1xuZXhwb3J0cy5kZWZhdWx0SGFzaCA9IGRlZmF1bHRIYXNoO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7fTtcblxuLyoqXG4gKiBBcHBseSB0aGUgc3VwcGxpZWQgSlNPTiBQYXRjaCB0byB4XG4gKiBAcGFyYW0ge2FycmF5fSBjaGFuZ2VzIEpTT04gUGF0Y2hcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fHN0cmluZ3xudW1iZXJ9IHggb2JqZWN0L2FycmF5L3ZhbHVlIHRvIHBhdGNoXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtmdW5jdGlvbihpbmRleDpOdW1iZXIsIGFycmF5OkFycmF5LCBjb250ZXh0Om9iamVjdCk6TnVtYmVyfSBvcHRpb25zLmZpbmRDb250ZXh0XG4gKiAgZnVuY3Rpb24gdXNlZCBhZGp1c3QgYXJyYXkgaW5kZXhlcyBmb3Igc21hcnR5L2Z1enp5IHBhdGNoaW5nLCBmb3JcbiAqICBwYXRjaGVzIGNvbnRhaW5pbmcgY29udGV4dFxuICogQHJldHVybnMge29iamVjdHxhcnJheXxzdHJpbmd8bnVtYmVyfSBwYXRjaGVkIHZlcnNpb24gb2YgeC4gSWYgeCBpc1xuICogIGFuIGFycmF5IG9yIG9iamVjdCwgaXQgd2lsbCBiZSBtdXRhdGVkIGFuZCByZXR1cm5lZC4gT3RoZXJ3aXNlLCBpZlxuICogIHggaXMgYSB2YWx1ZSwgdGhlIG5ldyB2YWx1ZSB3aWxsIGJlIHJldHVybmVkLlxuICovXG5mdW5jdGlvbiBwYXRjaChjaGFuZ2VzLCB4LCBvcHRpb25zKSB7XG5cdHJldHVybiBwYXRjaEluUGxhY2UoY2hhbmdlcywgY2xvbmUoeCksIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwYXRjaEluUGxhY2UoY2hhbmdlcywgeCwgb3B0aW9ucykge1xuXHRpZighb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblx0fVxuXG5cdC8vIFRPRE86IENvbnNpZGVyIHRocm93aW5nIGlmIGNoYW5nZXMgaXMgbm90IGFuIGFycmF5XG5cdGlmKCFBcnJheS5pc0FycmF5KGNoYW5nZXMpKSB7XG5cdFx0cmV0dXJuIHg7XG5cdH1cblxuXHR2YXIgcGF0Y2gsIHA7XG5cdGZvcih2YXIgaT0wOyBpPGNoYW5nZXMubGVuZ3RoOyArK2kpIHtcblx0XHRwID0gY2hhbmdlc1tpXTtcblx0XHRwYXRjaCA9IHBhdGNoZXNbcC5vcF07XG5cblx0XHRpZihwYXRjaCA9PT0gdm9pZCAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ2ludmFsaWQgb3AgJyArIEpTT04uc3RyaW5naWZ5KHApKTtcblx0XHR9XG5cblx0XHR4ID0gcGF0Y2guYXBwbHkoeCwgcCwgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdEhhc2goeCkge1xuXHRyZXR1cm4gaXNWYWxpZE9iamVjdCh4KSA/IEpTT04uc3RyaW5naWZ5KHgpIDogeDtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbnZhciBfcGFyc2UgPSByZXF1aXJlKCcuL2pzb25Qb2ludGVyUGFyc2UnKTtcblxuZXhwb3J0cy5maW5kID0gZmluZDtcbmV4cG9ydHMuam9pbiA9IGpvaW47XG5leHBvcnRzLmFic29sdXRlID0gYWJzb2x1dGU7XG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5leHBvcnRzLmNvbnRhaW5zID0gY29udGFpbnM7XG5leHBvcnRzLmVuY29kZVNlZ21lbnQgPSBlbmNvZGVTZWdtZW50O1xuZXhwb3J0cy5kZWNvZGVTZWdtZW50ID0gZGVjb2RlU2VnbWVudDtcbmV4cG9ydHMucGFyc2VBcnJheUluZGV4ID0gcGFyc2VBcnJheUluZGV4O1xuZXhwb3J0cy5pc1ZhbGlkQXJyYXlJbmRleCA9IGlzVmFsaWRBcnJheUluZGV4O1xuXG4vLyBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3BhZ2UtMlxudmFyIHNlcGFyYXRvciA9ICcvJztcbnZhciBzZXBhcmF0b3JSeCA9IC9cXC8vZztcbnZhciBlbmNvZGVkU2VwYXJhdG9yID0gJ34xJztcbnZhciBlbmNvZGVkU2VwYXJhdG9yUnggPSAvfjEvZztcblxudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZXNjYXBlUnggPSAvfi9nO1xudmFyIGVuY29kZWRFc2NhcGUgPSAnfjAnO1xudmFyIGVuY29kZWRFc2NhcGVSeCA9IC9+MC9nO1xuXG4vKipcbiAqIEZpbmQgdGhlIHBhcmVudCBvZiB0aGUgc3BlY2lmaWVkIHBhdGggaW4geCBhbmQgcmV0dXJuIGEgZGVzY3JpcHRvclxuICogY29udGFpbmluZyB0aGUgcGFyZW50IGFuZCBhIGtleS4gIElmIHRoZSBwYXJlbnQgZG9lcyBub3QgZXhpc3QgaW4geCxcbiAqIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQuXG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geCBvYmplY3Qgb3IgYXJyYXkgaW4gd2hpY2ggdG8gc2VhcmNoXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aCBKU09OIFBvaW50ZXIgc3RyaW5nIChlbmNvZGVkKVxuICogQHBhcmFtIHs/ZnVuY3Rpb24oaW5kZXg6TnVtYmVyLCBhcnJheTpBcnJheSwgY29udGV4dDpvYmplY3QpOk51bWJlcn0gZmluZENvbnRleHRcbiAqICBvcHRpb25hbCBmdW5jdGlvbiB1c2VkIGFkanVzdCBhcnJheSBpbmRleGVzIGZvciBzbWFydHkvZnV6enkgcGF0Y2hpbmcsIGZvclxuICogIHBhdGNoZXMgY29udGFpbmluZyBjb250ZXh0LiAgSWYgcHJvdmlkZWQsIGNvbnRleHQgTVVTVCBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHBhcmFtIHs/e2JlZm9yZTpBcnJheSwgYWZ0ZXI6QXJyYXl9fSBjb250ZXh0IG9wdGlvbmFsIHBhdGNoIGNvbnRleHQgZm9yXG4gKiAgZmluZENvbnRleHQgdG8gdXNlIHRvIGFkanVzdCBhcnJheSBpbmRpY2VzLiAgSWYgcHJvdmlkZWQsIGZpbmRDb250ZXh0IE1VU1RcbiAqICBhbHNvIGJlIHByb3ZpZGVkLlxuICogQHJldHVybnMge3t0YXJnZXQ6b2JqZWN0fGFycmF5fG51bWJlcnxzdHJpbmcsIGtleTpzdHJpbmd9fHVuZGVmaW5lZH1cbiAqL1xuZnVuY3Rpb24gZmluZCh4LCBwYXRoLCBmaW5kQ29udGV4dCwgY29udGV4dCkge1xuXHRpZih0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZihwYXRoID09PSAnJykge1xuXHRcdC8vIHdob2xlIGRvY3VtZW50XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6IHZvaWQgMCB9O1xuXHR9XG5cblx0aWYocGF0aCA9PT0gc2VwYXJhdG9yKSB7XG5cdFx0cmV0dXJuIHsgdGFyZ2V0OiB4LCBrZXk6ICcnIH07XG5cdH1cblxuXHR2YXIgcGFyZW50ID0geCwga2V5O1xuXHR2YXIgaGFzQ29udGV4dCA9IGNvbnRleHQgIT09IHZvaWQgMDtcblxuXHRfcGFyc2UocGF0aCwgZnVuY3Rpb24oc2VnbWVudCkge1xuXHRcdC8vIGhtLi4uIHRoaXMgc2VlbXMgbGlrZSBpdCBzaG91bGQgYmUgaWYodHlwZW9mIHggPT09ICd1bmRlZmluZWQnKVxuXHRcdGlmKHggPT0gbnVsbCkge1xuXHRcdFx0Ly8gU2lnbmFsIHRoYXQgd2UgcHJlbWF0dXJlbHkgaGl0IHRoZSBlbmQgb2YgdGhlIHBhdGggaGllcmFyY2h5LlxuXHRcdFx0cGFyZW50ID0gbnVsbDtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZihBcnJheS5pc0FycmF5KHgpKSB7XG5cdFx0XHRrZXkgPSBoYXNDb250ZXh0XG5cdFx0XHRcdD8gZmluZEluZGV4KGZpbmRDb250ZXh0LCBwYXJzZUFycmF5SW5kZXgoc2VnbWVudCksIHgsIGNvbnRleHQpXG5cdFx0XHRcdDogc2VnbWVudCA9PT0gJy0nID8gc2VnbWVudCA6IHBhcnNlQXJyYXlJbmRleChzZWdtZW50KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0a2V5ID0gc2VnbWVudDtcblx0XHR9XG5cblx0XHRwYXJlbnQgPSB4O1xuXHRcdHggPSB4W2tleV07XG5cdH0pO1xuXG5cdHJldHVybiBwYXJlbnQgPT09IG51bGxcblx0XHQ/IHZvaWQgMFxuXHRcdDogeyB0YXJnZXQ6IHBhcmVudCwga2V5OiBrZXkgfTtcbn1cblxuZnVuY3Rpb24gYWJzb2x1dGUocGF0aCkge1xuXHRyZXR1cm4gcGF0aFswXSA9PT0gc2VwYXJhdG9yID8gcGF0aCA6IHNlcGFyYXRvciArIHBhdGg7XG59XG5cbmZ1bmN0aW9uIGpvaW4oc2VnbWVudHMpIHtcblx0cmV0dXJuIHNlZ21lbnRzLmpvaW4oc2VwYXJhdG9yKTtcbn1cblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuXHR2YXIgc2VnbWVudHMgPSBbXTtcblx0X3BhcnNlKHBhdGgsIHNlZ21lbnRzLnB1c2guYmluZChzZWdtZW50cykpO1xuXHRyZXR1cm4gc2VnbWVudHM7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKGEsIGIpIHtcblx0cmV0dXJuIGIuaW5kZXhPZihhKSA9PT0gMCAmJiBiW2EubGVuZ3RoXSA9PT0gc2VwYXJhdG9yO1xufVxuXG4vKipcbiAqIERlY29kZSBhIEpTT04gUG9pbnRlciBwYXRoIHNlZ21lbnRcbiAqIEBzZWUgaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNjkwMSNwYWdlLTNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGVuY29kZWQgc2VnbWVudFxuICogQHJldHVybnMge3N0cmluZ30gZGVjb2RlZCBzZWdtZW50XG4gKi9cbmZ1bmN0aW9uIGRlY29kZVNlZ21lbnQocykge1xuXHQvLyBTZWU6IGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG5cdHJldHVybiBzLnJlcGxhY2UoZW5jb2RlZFNlcGFyYXRvclJ4LCBzZXBhcmF0b3IpLnJlcGxhY2UoZW5jb2RlZEVzY2FwZVJ4LCBlc2NhcGVDaGFyKTtcbn1cblxuLyoqXG4gKiBFbmNvZGUgYSBKU09OIFBvaW50ZXIgcGF0aCBzZWdtZW50XG4gKiBAc2VlIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzY5MDEjcGFnZS0zXG4gKiBAcGFyYW0ge3N0cmluZ30gcyBkZWNvZGVkIHNlZ21lbnRcbiAqIEByZXR1cm5zIHtzdHJpbmd9IGVuY29kZWQgc2VnbWVudFxuICovXG5mdW5jdGlvbiBlbmNvZGVTZWdtZW50KHMpIHtcblx0cmV0dXJuIHMucmVwbGFjZShlc2NhcGVSeCwgZW5jb2RlZEVzY2FwZSkucmVwbGFjZShzZXBhcmF0b3JSeCwgZW5jb2RlZFNlcGFyYXRvcik7XG59XG5cbnZhciBhcnJheUluZGV4UnggPSAvXigwfFsxLTldXFxkKikkLztcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiBzIGlzIGEgdmFsaWQgSlNPTiBQb2ludGVyIGFycmF5IGluZGV4XG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRBcnJheUluZGV4KHMpIHtcblx0cmV0dXJuIGFycmF5SW5kZXhSeC50ZXN0KHMpO1xufVxuXG4vKipcbiAqIFNhZmVseSBwYXJzZSBhIHN0cmluZyBpbnRvIGEgbnVtYmVyID49IDAuIERvZXMgbm90IGNoZWNrIGZvciBkZWNpbWFsIG51bWJlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIG51bWVyaWMgc3RyaW5nXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBudW1iZXIgPj0gMFxuICovXG5mdW5jdGlvbiBwYXJzZUFycmF5SW5kZXggKHMpIHtcblx0aWYoaXNWYWxpZEFycmF5SW5kZXgocykpIHtcblx0XHRyZXR1cm4gK3M7XG5cdH1cblxuXHR0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ2ludmFsaWQgYXJyYXkgaW5kZXggJyArIHMpO1xufVxuXG5mdW5jdGlvbiBmaW5kSW5kZXggKGZpbmRDb250ZXh0LCBzdGFydCwgYXJyYXksIGNvbnRleHQpIHtcblx0dmFyIGluZGV4ID0gc3RhcnQ7XG5cblx0aWYoaW5kZXggPCAwKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdhcnJheSBpbmRleCBvdXQgb2YgYm91bmRzICcgKyBpbmRleCk7XG5cdH1cblxuXHRpZihjb250ZXh0ICE9PSB2b2lkIDAgJiYgdHlwZW9mIGZpbmRDb250ZXh0ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aW5kZXggPSBmaW5kQ29udGV4dChzdGFydCwgYXJyYXksIGNvbnRleHQpO1xuXHRcdGlmKGluZGV4IDwgMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgZmluZCBwYXRjaCBjb250ZXh0ICcgKyBjb250ZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5kZXg7XG59IiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbm1vZHVsZS5leHBvcnRzID0ganNvblBvaW50ZXJQYXJzZTtcblxudmFyIHBhcnNlUnggPSAvXFwvfH4xfH4wL2c7XG52YXIgc2VwYXJhdG9yID0gJy8nO1xudmFyIGVzY2FwZUNoYXIgPSAnfic7XG52YXIgZW5jb2RlZFNlcGFyYXRvciA9ICd+MSc7XG5cbi8qKlxuICogUGFyc2UgdGhyb3VnaCBhbiBlbmNvZGVkIEpTT04gUG9pbnRlciBzdHJpbmcsIGRlY29kaW5nIGVhY2ggcGF0aCBzZWdtZW50XG4gKiBhbmQgcGFzc2luZyBpdCB0byBhbiBvblNlZ21lbnQgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAc2VlIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM2OTAxI3NlY3Rpb24tNFxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGggZW5jb2RlZCBKU09OIFBvaW50ZXIgc3RyaW5nXG4gKiBAcGFyYW0ge3tmdW5jdGlvbihzZWdtZW50OnN0cmluZyk6Ym9vbGVhbn19IG9uU2VnbWVudCBjYWxsYmFjayBmdW5jdGlvblxuICogQHJldHVybnMge3N0cmluZ30gb3JpZ2luYWwgcGF0aFxuICovXG5mdW5jdGlvbiBqc29uUG9pbnRlclBhcnNlKHBhdGgsIG9uU2VnbWVudCkge1xuXHR2YXIgcG9zLCBhY2N1bSwgbWF0Y2hlcywgbWF0Y2g7XG5cblx0cG9zID0gcGF0aC5jaGFyQXQoMCkgPT09IHNlcGFyYXRvciA/IDEgOiAwO1xuXHRhY2N1bSA9ICcnO1xuXHRwYXJzZVJ4Lmxhc3RJbmRleCA9IHBvcztcblxuXHR3aGlsZShtYXRjaGVzID0gcGFyc2VSeC5leGVjKHBhdGgpKSB7XG5cblx0XHRtYXRjaCA9IG1hdGNoZXNbMF07XG5cdFx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MsIHBhcnNlUngubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcblx0XHRwb3MgPSBwYXJzZVJ4Lmxhc3RJbmRleDtcblxuXHRcdGlmKG1hdGNoID09PSBzZXBhcmF0b3IpIHtcblx0XHRcdGlmIChvblNlZ21lbnQoYWNjdW0pID09PSBmYWxzZSkgcmV0dXJuIHBhdGg7XG5cdFx0XHRhY2N1bSA9ICcnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhY2N1bSArPSBtYXRjaCA9PT0gZW5jb2RlZFNlcGFyYXRvciA/IHNlcGFyYXRvciA6IGVzY2FwZUNoYXI7XG5cdFx0fVxuXHR9XG5cblx0YWNjdW0gKz0gcGF0aC5zbGljZShwb3MpO1xuXHRvblNlZ21lbnQoYWNjdW0pO1xuXG5cdHJldHVybiBwYXRoO1xufVxuIiwiLyoqIEBsaWNlbnNlIE1JVCBMaWNlbnNlIChjKSBjb3B5cmlnaHQgMjAxMC0yMDE0IG9yaWdpbmFsIGF1dGhvciBvciBhdXRob3JzICovXG4vKiogQGF1dGhvciBCcmlhbiBDYXZhbGllciAqL1xuLyoqIEBhdXRob3IgSm9obiBIYW5uICovXG5cbmV4cG9ydHMuY29tcGFyZSA9IGNvbXBhcmU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcblxudmFyIFJFTU9WRSwgUklHSFQsIEFERCwgRE9XTiwgU0tJUDtcblxuZXhwb3J0cy5SRU1PVkUgPSBSRU1PVkUgPSBSSUdIVCA9IC0xO1xuZXhwb3J0cy5BREQgICAgPSBBREQgICAgPSBET1dOICA9ICAxO1xuZXhwb3J0cy5FUVVBTCAgPSBTS0lQICAgPSAwO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBsY3MgY29tcGFyaXNvbiBtYXRyaXggZGVzY3JpYmluZyB0aGUgZGlmZmVyZW5jZXNcbiAqIGJldHdlZW4gdHdvIGFycmF5LWxpa2Ugc2VxdWVuY2VzXG4gKiBAcGFyYW0ge2FycmF5fSBhIGFycmF5LWxpa2VcbiAqIEBwYXJhbSB7YXJyYXl9IGIgYXJyYXktbGlrZVxuICogQHJldHVybnMge29iamVjdH0gbGNzIGRlc2NyaXB0b3IsIHN1aXRhYmxlIGZvciBwYXNzaW5nIHRvIHJlZHVjZSgpXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuXHR2YXIgY29scyA9IGEubGVuZ3RoO1xuXHR2YXIgcm93cyA9IGIubGVuZ3RoO1xuXG5cdHZhciBwcmVmaXggPSBmaW5kUHJlZml4KGEsIGIpO1xuXHR2YXIgc3VmZml4ID0gcHJlZml4IDwgY29scyAmJiBwcmVmaXggPCByb3dzXG5cdFx0PyBmaW5kU3VmZml4KGEsIGIsIHByZWZpeClcblx0XHQ6IDA7XG5cblx0dmFyIHJlbW92ZSA9IHN1ZmZpeCArIHByZWZpeCAtIDE7XG5cdGNvbHMgLT0gcmVtb3ZlO1xuXHRyb3dzIC09IHJlbW92ZTtcblx0dmFyIG1hdHJpeCA9IGNyZWF0ZU1hdHJpeChjb2xzLCByb3dzKTtcblxuXHRmb3IgKHZhciBqID0gY29scyAtIDE7IGogPj0gMDsgLS1qKSB7XG5cdFx0Zm9yICh2YXIgaSA9IHJvd3MgLSAxOyBpID49IDA7IC0taSkge1xuXHRcdFx0bWF0cml4W2ldW2pdID0gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgcHJlZml4LCBqLCBpKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHByZWZpeDogcHJlZml4LFxuXHRcdG1hdHJpeDogbWF0cml4LFxuXHRcdHN1ZmZpeDogc3VmZml4XG5cdH07XG59XG5cbi8qKlxuICogUmVkdWNlIGEgc2V0IG9mIGxjcyBjaGFuZ2VzIHByZXZpb3VzbHkgY3JlYXRlZCB1c2luZyBjb21wYXJlXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHJlc3VsdDoqLCB0eXBlOm51bWJlciwgaTpudW1iZXIsIGo6bnVtYmVyKX0gZlxuICogIHJlZHVjZXIgZnVuY3Rpb24sIHdoZXJlOlxuICogIC0gcmVzdWx0IGlzIHRoZSBjdXJyZW50IHJlZHVjZSB2YWx1ZSxcbiAqICAtIHR5cGUgaXMgdGhlIHR5cGUgb2YgY2hhbmdlOiBBREQsIFJFTU9WRSwgb3IgU0tJUFxuICogIC0gaSBpcyB0aGUgaW5kZXggb2YgdGhlIGNoYW5nZSBsb2NhdGlvbiBpbiBiXG4gKiAgLSBqIGlzIHRoZSBpbmRleCBvZiB0aGUgY2hhbmdlIGxvY2F0aW9uIGluIGFcbiAqIEBwYXJhbSB7Kn0gciBpbml0aWFsIHZhbHVlXG4gKiBAcGFyYW0ge29iamVjdH0gbGNzIHJlc3VsdHMgcmV0dXJuZWQgYnkgY29tcGFyZSgpXG4gKiBAcmV0dXJucyB7Kn0gdGhlIGZpbmFsIHJlZHVjZWQgdmFsdWVcbiAqL1xuZnVuY3Rpb24gcmVkdWNlKGYsIHIsIGxjcykge1xuXHR2YXIgaSwgaiwgaywgb3A7XG5cblx0dmFyIG0gPSBsY3MubWF0cml4O1xuXG5cdC8vIFJlZHVjZSBzaGFyZWQgcHJlZml4XG5cdHZhciBsID0gbGNzLnByZWZpeDtcblx0Zm9yKGkgPSAwO2kgPCBsOyArK2kpIHtcblx0XHRyID0gZihyLCBTS0lQLCBpLCBpKTtcblx0fVxuXG5cdC8vIFJlZHVjZSBsb25nZXN0IGNoYW5nZSBzcGFuXG5cdGsgPSBpO1xuXHRsID0gbS5sZW5ndGg7XG5cdGkgPSAwO1xuXHRqID0gMDtcblx0d2hpbGUoaSA8IGwpIHtcblx0XHRvcCA9IG1baV1bal0udHlwZTtcblx0XHRyID0gZihyLCBvcCwgaStrLCBqK2spO1xuXG5cdFx0c3dpdGNoKG9wKSB7XG5cdFx0XHRjYXNlIFNLSVA6ICArK2k7ICsrajsgYnJlYWs7XG5cdFx0XHRjYXNlIFJJR0hUOiArK2o7IGJyZWFrO1xuXHRcdFx0Y2FzZSBET1dOOiAgKytpOyBicmVhaztcblx0XHR9XG5cdH1cblxuXHQvLyBSZWR1Y2Ugc2hhcmVkIHN1ZmZpeFxuXHRpICs9IGs7XG5cdGogKz0gaztcblx0bCA9IGxjcy5zdWZmaXg7XG5cdGZvcihrID0gMDtrIDwgbDsgKytrKSB7XG5cdFx0ciA9IGYociwgU0tJUCwgaStrLCBqK2spO1xuXHR9XG5cblx0cmV0dXJuIHI7XG59XG5cbmZ1bmN0aW9uIGZpbmRQcmVmaXgoYSwgYikge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBsID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcblx0d2hpbGUoaSA8IGwgJiYgYVtpXSA9PT0gYltpXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZmluZFN1ZmZpeChhLCBiKSB7XG5cdHZhciBhbCA9IGEubGVuZ3RoIC0gMTtcblx0dmFyIGJsID0gYi5sZW5ndGggLSAxO1xuXHR2YXIgbCA9IE1hdGgubWluKGFsLCBibCk7XG5cdHZhciBpID0gMDtcblx0d2hpbGUoaSA8IGwgJiYgYVthbC1pXSA9PT0gYltibC1pXSkge1xuXHRcdCsraTtcblx0fVxuXHRyZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gYmFja3RyYWNrKG1hdHJpeCwgYSwgYiwgc3RhcnQsIGosIGkpIHtcblx0aWYgKGFbaitzdGFydF0gPT09IGJbaStzdGFydF0pIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqICsgMV0udmFsdWUsIHR5cGU6IFNLSVAgfTtcblx0fVxuXHRpZiAobWF0cml4W2ldW2ogKyAxXS52YWx1ZSA8IG1hdHJpeFtpICsgMV1bal0udmFsdWUpIHtcblx0XHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2ldW2ogKyAxXS52YWx1ZSArIDEsIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHRyZXR1cm4geyB2YWx1ZTogbWF0cml4W2kgKyAxXVtqXS52YWx1ZSArIDEsIHR5cGU6IERPV04gfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWF0cml4IChjb2xzLCByb3dzKSB7XG5cdHZhciBtID0gW10sIGksIGosIGxhc3Ryb3c7XG5cblx0Ly8gRmlsbCB0aGUgbGFzdCByb3dcblx0bGFzdHJvdyA9IG1bcm93c10gPSBbXTtcblx0Zm9yIChqID0gMDsgajxjb2xzOyArK2opIHtcblx0XHRsYXN0cm93W2pdID0geyB2YWx1ZTogY29scyAtIGosIHR5cGU6IFJJR0hUIH07XG5cdH1cblxuXHQvLyBGaWxsIHRoZSBsYXN0IGNvbFxuXHRmb3IgKGkgPSAwOyBpPHJvd3M7ICsraSkge1xuXHRcdG1baV0gPSBbXTtcblx0XHRtW2ldW2NvbHNdID0geyB2YWx1ZTogcm93cyAtIGksIHR5cGU6IERPV04gfTtcblx0fVxuXG5cdC8vIEZpbGwgdGhlIGxhc3QgY2VsbFxuXHRtW3Jvd3NdW2NvbHNdID0geyB2YWx1ZTogMCwgdHlwZTogU0tJUCB9O1xuXG5cdHJldHVybiBtO1xufVxuIiwidmFyIGpzb25Qb2ludGVyID0gcmVxdWlyZSgnLi9qc29uUG9pbnRlcicpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIGRlZXBFcXVhbHMgPSByZXF1aXJlKCcuL2RlZXBFcXVhbHMnKTtcbnZhciBjb21tdXRlUGF0aHMgPSByZXF1aXJlKCcuL2NvbW11dGVQYXRocycpO1xuXG52YXIgYXJyYXkgPSByZXF1aXJlKCcuL2FycmF5Jyk7XG5cbnZhciBUZXN0RmFpbGVkRXJyb3IgPSByZXF1aXJlKCcuL1Rlc3RGYWlsZWRFcnJvcicpO1xudmFyIEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9JbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcicpO1xudmFyIFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yID0gcmVxdWlyZSgnLi9QYXRjaE5vdEludmVydGlibGVFcnJvcicpO1xuXG52YXIgZmluZCA9IGpzb25Qb2ludGVyLmZpbmQ7XG52YXIgcGFyc2VBcnJheUluZGV4ID0ganNvblBvaW50ZXIucGFyc2VBcnJheUluZGV4O1xuXG5leHBvcnRzLnRlc3QgPSB7XG5cdGFwcGx5OiBhcHBseVRlc3QsXG5cdGludmVyc2U6IGludmVydFRlc3QsXG5cdGNvbW11dGU6IGNvbW11dGVUZXN0XG59O1xuXG5leHBvcnRzLmFkZCA9IHtcblx0YXBwbHk6IGFwcGx5QWRkLFxuXHRpbnZlcnNlOiBpbnZlcnRBZGQsXG5cdGNvbW11dGU6IGNvbW11dGVBZGRPckNvcHlcbn07XG5cbmV4cG9ydHMucmVtb3ZlID0ge1xuXHRhcHBseTogYXBwbHlSZW1vdmUsXG5cdGludmVyc2U6IGludmVydFJlbW92ZSxcblx0Y29tbXV0ZTogY29tbXV0ZVJlbW92ZVxufTtcblxuZXhwb3J0cy5yZXBsYWNlID0ge1xuXHRhcHBseTogYXBwbHlSZXBsYWNlLFxuXHRpbnZlcnNlOiBpbnZlcnRSZXBsYWNlLFxuXHRjb21tdXRlOiBjb21tdXRlUmVwbGFjZVxufTtcblxuZXhwb3J0cy5tb3ZlID0ge1xuXHRhcHBseTogYXBwbHlNb3ZlLFxuXHRpbnZlcnNlOiBpbnZlcnRNb3ZlLFxuXHRjb21tdXRlOiBjb21tdXRlTW92ZVxufTtcblxuZXhwb3J0cy5jb3B5ID0ge1xuXHRhcHBseTogYXBwbHlDb3B5LFxuXHRpbnZlcnNlOiBub3RJbnZlcnRpYmxlLFxuXHRjb21tdXRlOiBjb21tdXRlQWRkT3JDb3B5XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgdGVzdCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSB0ZXN0IHRlc3Qgb3BlcmF0aW9uXG4gKiBAdGhyb3dzIHtUZXN0RmFpbGVkRXJyb3J9IGlmIHRoZSB0ZXN0IG9wZXJhdGlvbiBmYWlsc1xuICovXG5cbmZ1bmN0aW9uIGFwcGx5VGVzdCh4LCB0ZXN0LCBvcHRpb25zKSB7XG5cdHZhciBwb2ludGVyID0gZmluZCh4LCB0ZXN0LnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIHRlc3QuY29udGV4dCk7XG5cdHZhciB0YXJnZXQgPSBwb2ludGVyLnRhcmdldDtcblx0dmFyIGluZGV4LCB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRpbmRleCA9IHBhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSk7XG5cdFx0Ly9pbmRleCA9IGZpbmRJbmRleChvcHRpb25zLmZpbmRDb250ZXh0LCBpbmRleCwgdGFyZ2V0LCB0ZXN0LmNvbnRleHQpO1xuXHRcdHZhbHVlID0gdGFyZ2V0W2luZGV4XTtcblx0fSBlbHNlIHtcblx0XHR2YWx1ZSA9IHBvaW50ZXIua2V5ID09PSB2b2lkIDAgPyBwb2ludGVyLnRhcmdldCA6IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XTtcblx0fVxuXG5cdGlmKCFkZWVwRXF1YWxzKHZhbHVlLCB0ZXN0LnZhbHVlKSkge1xuXHRcdHRocm93IG5ldyBUZXN0RmFpbGVkRXJyb3IoJ3Rlc3QgZmFpbGVkICcgKyBKU09OLnN0cmluZ2lmeSh0ZXN0KSk7XG5cdH1cblxuXHRyZXR1cm4geDtcbn1cblxuLyoqXG4gKiBJbnZlcnQgdGhlIHByb3ZpZGVkIHRlc3QgYW5kIGFkZCBpdCB0byB0aGUgaW52ZXJ0ZWQgcGF0Y2ggc2VxdWVuY2VcbiAqIEBwYXJhbSBwclxuICogQHBhcmFtIHRlc3RcbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGludmVydFRlc3QocHIsIHRlc3QpIHtcblx0cHIucHVzaCh0ZXN0KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVUZXN0KHRlc3QsIGIpIHtcblx0aWYodGVzdC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgdGVzdCxyZW1vdmUgLT4gcmVtb3ZlLHRlc3QgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgdGVzdF07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHRlc3QsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGFuIGFkZCBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgYWRkIG9wZXJhdGlvblxuICovXG5mdW5jdGlvbiBhcHBseUFkZCh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikpIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3BhdGggZG9lcyBub3QgZXhpc3QgJyArIGNoYW5nZS5wYXRoKTtcblx0fVxuXG5cdHZhciB2YWwgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsO1xuXHR9XG5cblx0X2FkZChwb2ludGVyLCB2YWwpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX2FkZChwb2ludGVyLCB2YWx1ZSkge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0Ly8gJy0nIGluZGljYXRlcyAnYXBwZW5kJyB0byBhcnJheVxuXHRcdGlmKHBvaW50ZXIua2V5ID09PSAnLScpIHtcblx0XHRcdHRhcmdldC5wdXNoKHZhbHVlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0LnNwbGljZShwb2ludGVyLmtleSwgMCwgdmFsdWUpO1xuXHRcdH1cblx0fSBlbHNlIGlmKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHRhcmdldFtwb2ludGVyLmtleV0gPSB2YWx1ZTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdyBuZXcgSW52YWxpZFBhdGNoT3BlcmF0aW9uRXJyb3IoJ3RhcmdldCBvZiBhZGQgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYXJyYXkgJyArIHBvaW50ZXIua2V5KTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbnZlcnRBZGQocHIsIGFkZCkge1xuXHR2YXIgY29udGV4dCA9IGFkZC5jb250ZXh0O1xuXHRpZihjb250ZXh0ICE9PSB2b2lkIDApIHtcblx0XHRjb250ZXh0ID0ge1xuXHRcdFx0YmVmb3JlOiBjb250ZXh0LmJlZm9yZSxcblx0XHRcdGFmdGVyOiBhcnJheS5jb25zKGFkZC52YWx1ZSwgY29udGV4dC5hZnRlcilcblx0XHR9XG5cdH1cblx0cHIucHVzaCh7IG9wOiAndGVzdCcsIHBhdGg6IGFkZC5wYXRoLCB2YWx1ZTogYWRkLnZhbHVlLCBjb250ZXh0OiBjb250ZXh0IH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZW1vdmUnLCBwYXRoOiBhZGQucGF0aCwgY29udGV4dDogY29udGV4dCB9KTtcblx0cmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVBZGRPckNvcHkoYWRkLCBiKSB7XG5cdGlmKGFkZC5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgYWRkLHJlbW92ZSAtPiByZW1vdmUsYWRkIGZvciBzYW1lIHBhdGgnKTtcblx0fVxuXG5cdHJldHVybiBjb21tdXRlUGF0aHMoYWRkLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIHJlcGxhY2Ugb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIHJlcGxhY2Ugb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVwbGFjZSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHBvaW50ZXIgPSBmaW5kKHgsIGNoYW5nZS5wYXRoLCBvcHRpb25zLmZpbmRDb250ZXh0LCBjaGFuZ2UuY29udGV4dCk7XG5cblx0aWYobm90Rm91bmQocG9pbnRlcikgfHwgbWlzc2luZ1ZhbHVlKHBvaW50ZXIpKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHR2YXIgdmFsdWUgPSBjbG9uZShjaGFuZ2UudmFsdWUpO1xuXG5cdC8vIElmIHBvaW50ZXIgcmVmZXJzIHRvIHdob2xlIGRvY3VtZW50LCByZXBsYWNlIHdob2xlIGRvY3VtZW50XG5cdGlmKHBvaW50ZXIua2V5ID09PSB2b2lkIDApIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0aWYoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG5cdFx0dGFyZ2V0W3BhcnNlQXJyYXlJbmRleChwb2ludGVyLmtleSldID0gdmFsdWU7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0W3BvaW50ZXIua2V5XSA9IHZhbHVlO1xuXHR9XG5cblx0cmV0dXJuIHg7XG59XG5cbmZ1bmN0aW9uIGludmVydFJlcGxhY2UocHIsIGMsIGksIHBhdGNoKSB7XG5cdHZhciBwcmV2ID0gcGF0Y2hbaS0xXTtcblx0aWYocHJldiA9PT0gdm9pZCAwIHx8IHByZXYub3AgIT09ICd0ZXN0JyB8fCBwcmV2LnBhdGggIT09IGMucGF0aCkge1xuXHRcdHRocm93IG5ldyBQYXRjaE5vdEludmVydGlibGVFcnJvcignY2Fubm90IGludmVydCByZXBsYWNlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkuY29ucyhwcmV2LnZhbHVlLCBhcnJheS50YWlsKGNvbnRleHQuYWZ0ZXIpKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ3Rlc3QnLCBwYXRoOiBwcmV2LnBhdGgsIHZhbHVlOiBjLnZhbHVlIH0pO1xuXHRwci5wdXNoKHsgb3A6ICdyZXBsYWNlJywgcGF0aDogcHJldi5wYXRoLCB2YWx1ZTogcHJldi52YWx1ZSB9KTtcblx0cmV0dXJuIDI7XG59XG5cbmZ1bmN0aW9uIGNvbW11dGVSZXBsYWNlKHJlcGxhY2UsIGIpIHtcblx0aWYocmVwbGFjZS5wYXRoID09PSBiLnBhdGggJiYgYi5vcCA9PT0gJ3JlbW92ZScpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5cXCd0IGNvbW11dGUgcmVwbGFjZSxyZW1vdmUgLT4gcmVtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0aWYoYi5vcCA9PT0gJ3Rlc3QnIHx8IGIub3AgPT09ICdyZXBsYWNlJykge1xuXHRcdHJldHVybiBbYiwgcmVwbGFjZV07XG5cdH1cblxuXHRyZXR1cm4gY29tbXV0ZVBhdGhzKHJlcGxhY2UsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgcmVtb3ZlIG9wZXJhdGlvbiB0byB4XG4gKiBAcGFyYW0ge29iamVjdHxhcnJheX0geFxuICogQHBhcmFtIHtvYmplY3R9IGNoYW5nZSByZW1vdmUgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHR2YXIgcG9pbnRlciA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblxuXHQvLyBrZXkgbXVzdCBleGlzdCBmb3IgcmVtb3ZlXG5cdGlmKG5vdEZvdW5kKHBvaW50ZXIpIHx8IHBvaW50ZXIudGFyZ2V0W3BvaW50ZXIua2V5XSA9PT0gdm9pZCAwKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdwYXRoIGRvZXMgbm90IGV4aXN0ICcgKyBjaGFuZ2UucGF0aCk7XG5cdH1cblxuXHRfcmVtb3ZlKHBvaW50ZXIpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gX3JlbW92ZSAocG9pbnRlcikge1xuXHR2YXIgdGFyZ2V0ID0gcG9pbnRlci50YXJnZXQ7XG5cblx0dmFyIHJlbW92ZWQ7XG5cdGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHRyZW1vdmVkID0gdGFyZ2V0LnNwbGljZShwYXJzZUFycmF5SW5kZXgocG9pbnRlci5rZXkpLCAxKTtcblx0XHRyZXR1cm4gcmVtb3ZlZFswXTtcblxuXHR9IGVsc2UgaWYgKGlzVmFsaWRPYmplY3QodGFyZ2V0KSkge1xuXHRcdHJlbW92ZWQgPSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdGRlbGV0ZSB0YXJnZXRbcG9pbnRlci5rZXldO1xuXHRcdHJldHVybiByZW1vdmVkO1xuXG5cdH0gZWxzZSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCd0YXJnZXQgb2YgcmVtb3ZlIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFycmF5Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW52ZXJ0UmVtb3ZlKHByLCBjLCBpLCBwYXRjaCkge1xuXHR2YXIgcHJldiA9IHBhdGNoW2ktMV07XG5cdGlmKHByZXYgPT09IHZvaWQgMCB8fCBwcmV2Lm9wICE9PSAndGVzdCcgfHwgcHJldi5wYXRoICE9PSBjLnBhdGgpIHtcblx0XHR0aHJvdyBuZXcgUGF0Y2hOb3RJbnZlcnRpYmxlRXJyb3IoJ2Nhbm5vdCBpbnZlcnQgcmVtb3ZlIHcvbyB0ZXN0Jyk7XG5cdH1cblxuXHR2YXIgY29udGV4dCA9IHByZXYuY29udGV4dDtcblx0aWYoY29udGV4dCAhPT0gdm9pZCAwKSB7XG5cdFx0Y29udGV4dCA9IHtcblx0XHRcdGJlZm9yZTogY29udGV4dC5iZWZvcmUsXG5cdFx0XHRhZnRlcjogYXJyYXkudGFpbChjb250ZXh0LmFmdGVyKVxuXHRcdH1cblx0fVxuXG5cdHByLnB1c2goeyBvcDogJ2FkZCcsIHBhdGg6IHByZXYucGF0aCwgdmFsdWU6IHByZXYudmFsdWUsIGNvbnRleHQ6IGNvbnRleHQgfSk7XG5cdHJldHVybiAyO1xufVxuXG5mdW5jdGlvbiBjb21tdXRlUmVtb3ZlKHJlbW92ZSwgYikge1xuXHRpZihyZW1vdmUucGF0aCA9PT0gYi5wYXRoICYmIGIub3AgPT09ICdyZW1vdmUnKSB7XG5cdFx0cmV0dXJuIFtiLCByZW1vdmVdO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhyZW1vdmUsIGIpO1xufVxuXG4vKipcbiAqIEFwcGx5IGEgbW92ZSBvcGVyYXRpb24gdG8geFxuICogQHBhcmFtIHtvYmplY3R8YXJyYXl9IHhcbiAqIEBwYXJhbSB7b2JqZWN0fSBjaGFuZ2UgbW92ZSBvcGVyYXRpb25cbiAqL1xuZnVuY3Rpb24gYXBwbHlNb3ZlKHgsIGNoYW5nZSwgb3B0aW9ucykge1xuXHRpZihqc29uUG9pbnRlci5jb250YWlucyhjaGFuZ2UucGF0aCwgY2hhbmdlLmZyb20pKSB7XG5cdFx0dGhyb3cgbmV3IEludmFsaWRQYXRjaE9wZXJhdGlvbkVycm9yKCdtb3ZlLmZyb20gY2Fubm90IGJlIGFuY2VzdG9yIG9mIG1vdmUucGF0aCcpO1xuXHR9XG5cblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRfYWRkKHB0bywgX3JlbW92ZShwZnJvbSkpO1xuXHRyZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gaW52ZXJ0TW92ZShwciwgYykge1xuXHRwci5wdXNoKHsgb3A6ICdtb3ZlJyxcblx0XHRwYXRoOiBjLmZyb20sIGNvbnRleHQ6IGMuZnJvbUNvbnRleHQsXG5cdFx0ZnJvbTogYy5wYXRoLCBmcm9tQ29udGV4dDogYy5jb250ZXh0IH0pO1xuXHRyZXR1cm4gMTtcbn1cblxuZnVuY3Rpb24gY29tbXV0ZU1vdmUobW92ZSwgYikge1xuXHRpZihtb3ZlLnBhdGggPT09IGIucGF0aCAmJiBiLm9wID09PSAncmVtb3ZlJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0NhblxcJ3QgY29tbXV0ZSBtb3ZlLHJlbW92ZSAtPiBtb3ZlLHJlcGxhY2UgZm9yIHNhbWUgcGF0aCcpO1xuXHR9XG5cblx0cmV0dXJuIGNvbW11dGVQYXRocyhtb3ZlLCBiKTtcbn1cblxuLyoqXG4gKiBBcHBseSBhIGNvcHkgb3BlcmF0aW9uIHRvIHhcbiAqIEBwYXJhbSB7b2JqZWN0fGFycmF5fSB4XG4gKiBAcGFyYW0ge29iamVjdH0gY2hhbmdlIGNvcHkgb3BlcmF0aW9uXG4gKi9cbmZ1bmN0aW9uIGFwcGx5Q29weSh4LCBjaGFuZ2UsIG9wdGlvbnMpIHtcblx0dmFyIHB0byA9IGZpbmQoeCwgY2hhbmdlLnBhdGgsIG9wdGlvbnMuZmluZENvbnRleHQsIGNoYW5nZS5jb250ZXh0KTtcblx0dmFyIHBmcm9tID0gZmluZCh4LCBjaGFuZ2UuZnJvbSwgb3B0aW9ucy5maW5kQ29udGV4dCwgY2hhbmdlLmZyb21Db250ZXh0KTtcblxuXHRpZihub3RGb3VuZChwZnJvbSkgfHwgbWlzc2luZ1ZhbHVlKHBmcm9tKSkge1xuXHRcdHRocm93IG5ldyBJbnZhbGlkUGF0Y2hPcGVyYXRpb25FcnJvcignY29weS5mcm9tIG11c3QgZXhpc3QnKTtcblx0fVxuXG5cdHZhciB0YXJnZXQgPSBwZnJvbS50YXJnZXQ7XG5cdHZhciB2YWx1ZTtcblxuXHRpZihBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcblx0XHR2YWx1ZSA9IHRhcmdldFtwYXJzZUFycmF5SW5kZXgocGZyb20ua2V5KV07XG5cdH0gZWxzZSB7XG5cdFx0dmFsdWUgPSB0YXJnZXRbcGZyb20ua2V5XTtcblx0fVxuXG5cdF9hZGQocHRvLCBjbG9uZSh2YWx1ZSkpO1xuXHRyZXR1cm4geDtcbn1cblxuLy8gTk9URTogQ29weSBpcyBub3QgaW52ZXJ0aWJsZVxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvamlmZi9pc3N1ZXMvOVxuLy8gVGhpcyBuZWVkcyBtb3JlIHRob3VnaHQuIFdlIG1heSBoYXZlIHRvIGV4dGVuZC9hbWVuZCBKU09OIFBhdGNoLlxuLy8gQXQgZmlyc3QgZ2xhbmNlLCB0aGlzIHNlZW1zIGxpa2UgaXQgc2hvdWxkIGp1c3QgYmUgYSByZW1vdmUuXG4vLyBIb3dldmVyLCB0aGF0J3Mgbm90IGNvcnJlY3QuICBJdCB2aW9sYXRlcyB0aGUgaW52b2x1dGlvbjpcbi8vIGludmVydChpbnZlcnQocCkpIH49IHAuICBGb3IgZXhhbXBsZTpcbi8vIGludmVydChjb3B5KSAtPiByZW1vdmVcbi8vIGludmVydChyZW1vdmUpIC0+IGFkZFxuLy8gdGh1czogaW52ZXJ0KGludmVydChjb3B5KSkgLT4gYWRkIChET0ghIHRoaXMgc2hvdWxkIGJlIGNvcHkhKVxuXG5mdW5jdGlvbiBub3RJbnZlcnRpYmxlKF8sIGMpIHtcblx0dGhyb3cgbmV3IFBhdGNoTm90SW52ZXJ0aWJsZUVycm9yKCdjYW5ub3QgaW52ZXJ0ICcgKyBjLm9wKTtcbn1cblxuZnVuY3Rpb24gbm90Rm91bmQgKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIgPT09IHZvaWQgMCB8fCAocG9pbnRlci50YXJnZXQgPT0gbnVsbCAmJiBwb2ludGVyLmtleSAhPT0gdm9pZCAwKTtcbn1cblxuZnVuY3Rpb24gbWlzc2luZ1ZhbHVlKHBvaW50ZXIpIHtcblx0cmV0dXJuIHBvaW50ZXIua2V5ICE9PSB2b2lkIDAgJiYgcG9pbnRlci50YXJnZXRbcG9pbnRlci5rZXldID09PSB2b2lkIDA7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgeCBpcyBhIG5vbi1udWxsIG9iamVjdFxuICogQHBhcmFtIHsqfSB4XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNWYWxpZE9iamVjdCAoeCkge1xuXHRyZXR1cm4geCAhPT0gbnVsbCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCc7XG59XG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcblxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcblxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIEBzdGF0ZSA9XG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXG4gICAgQF9yZXNldFN0YXRlKClcbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXG5cbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cbiAgICAjIGZsdGVyIGZvciBhdmFpbGFibGUgcHJvdmlkZXJzXG4gICAgYWxsUHJvdmlkZXJzID0ge31cbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxuICAgICAgICBhbGxQcm92aWRlcnNbUHJvdmlkZXIuTmFtZV0gPSBQcm92aWRlclxuXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy5wcm92aWRlcnNcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcblxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xuICAgIGF2YWlsYWJsZVByb3ZpZGVycyA9IFtdXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXG4gICAgICAjIG1lcmdlIGluIG90aGVyIG9wdGlvbnMgYXMgbmVlZGVkXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcbiAgICAgICAgQF9lcnJvciBcIkludmFsaWQgcHJvdmlkZXIgc3BlYyAtIG11c3QgZWl0aGVyIGJlIHN0cmluZyBvciBvYmplY3Qgd2l0aCBuYW1lIHByb3BlcnR5XCJcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cbiAgICAgICAgICBQcm92aWRlciA9IGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxuXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcbiAgICBpZiBvcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcbiAgICAgIEBhdXRvU2F2ZSBvcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcblxuICAjIHNpbmdsZSBjbGllbnQgLSB1c2VkIGJ5IHRoZSBjbGllbnQgYXBwIHRvIHJlZ2lzdGVyIGFuZCByZWNlaXZlIGNhbGxiYWNrIGV2ZW50c1xuICBjb25uZWN0OiAoQGV2ZW50Q2FsbGJhY2spIC0+XG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cblxuICAjIHNpbmdsZSBsaXN0ZW5lciAtIHVzZWQgYnkgdGhlIFJlYWN0IG1lbnUgdmlhIHRvIHdhdGNoIGNsaWVudCBzdGF0ZSBjaGFuZ2VzXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxuXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW1cblxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXG5cbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX3Jlc2V0U3RhdGUoKVxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZSdcblxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBhcHBPcHRpb25zLnVpPy5uZXdGaWxlT3BlbnNJbk5ld1RhYlxuICAgICAgd2luZG93Lm9wZW4gd2luZG93LmxvY2F0aW9uLCAnX2JsYW5rJ1xuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICBAc2F2ZSgpXG4gICAgICAgIEBuZXdGaWxlKClcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uTkVXX0ZJTEUnXG4gICAgICAgIEBuZXdGaWxlKClcbiAgICBlbHNlXG4gICAgICBAbmV3RmlsZSgpXG5cbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xuICAgICAgbWV0YWRhdGEucHJvdmlkZXIubG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xuXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcbiAgICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxuICAgICAgQHNhdmVDb250ZW50IGNvbnRlbnQsIGNhbGxiYWNrXG5cbiAgc2F2ZUNvbnRlbnQ6IChjb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAc2F2ZUZpbGUgY29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xuXG4gIHNhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZSdcbiAgICAgIEBfc2V0U3RhdGVcbiAgICAgICAgc2F2aW5nOiBtZXRhZGF0YVxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXG4gICAgZWxzZVxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgQF9kaWFsb2dTYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfdWkuc2F2ZUZpbGVBc0RpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZUNvcHlEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIHNhdmVDb3B5ID0gKGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXG4gICAgQF91aS5zYXZlQ29weURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBpZiBjb250ZW50IGlzIG51bGxcbiAgICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgLT5cbiAgICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxuICAgICAgZWxzZVxuICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxuXG4gIGRvd25sb2FkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XG4gICAgICBAX3VpLmRvd25sb2FkRGlhbG9nIEBzdGF0ZS5tZXRhZGF0YT8ubmFtZSwgY29udGVudCwgY2FsbGJhY2tcblxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGEubmFtZSwgKG5ld05hbWUpID0+XG4gICAgICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5yZW5hbWUgQHN0YXRlLm1ldGFkYXRhLCBuZXdOYW1lLCAoZXJyLCBtZXRhZGF0YSkgPT5cbiAgICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgICAgICBAX3NldFN0YXRlXG4gICAgICAgICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgICAgICAgICAgQF9ldmVudCAncmVuYW1lZEZpbGUnLCB7bWV0YWRhdGE6IG1ldGFkYXRhfVxuICAgICAgICAgICAgY2FsbGJhY2s/IGZpbGVuYW1lXG4gICAgZWxzZVxuICAgICAgY2FsbGJhY2s/ICdObyBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXG5cbiAgcmVvcGVuOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQG9wZW5GaWxlIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcblxuICByZW9wZW5EaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBpZiAobm90IEBzdGF0ZS5kaXJ0eSkgb3IgKGNvbmZpcm0gdHIgJ35DT05GSVJNLlJFT1BFTl9GSUxFJylcbiAgICAgICAgQG9wZW5GaWxlIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBjYWxsYmFjaz8gJ05vIGN1cnJlbnRseSBhY3RpdmUgZmlsZSdcblxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XG4gICAgQF9zZXRTdGF0ZVxuICAgICAgZGlydHk6IGlzRGlydHlcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XG5cbiAgYXV0b1NhdmU6IChpbnRlcnZhbCkgLT5cbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcbiAgICAgIGNsZWFySW50ZXJ2YWwgQF9hdXRvU2F2ZUludGVydmFsXG5cbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xuICAgIGlmIGludGVydmFsID4gMTAwMFxuICAgICAgaW50ZXJ2YWwgPSBNYXRoLnJvdW5kKGludGVydmFsIC8gMTAwMClcbiAgICBpZiBpbnRlcnZhbCA+IDBcbiAgICAgIEBfYXV0b1NhdmVJbnRlcnZhbCA9IHNldEludGVydmFsICg9PiBAc2F2ZSgpIGlmIEBzdGF0ZS5kaXJ0eSBhbmQgQHN0YXRlLm1ldGFkYXRhPyksIChpbnRlcnZhbCAqIDEwMDApXG5cbiAgaXNBdXRvU2F2aW5nOiAtPlxuICAgIEBfYXV0b1NhdmVJbnRlcnZhbCA+IDBcblxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBpZiBjb250ZW50IGlzbnQgbnVsbFxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XG4gICAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZXJyb3I6IChtZXNzYWdlKSAtPlxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxuICAgIGFsZXJ0IG1lc3NhZ2VcblxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSkgLT5cbiAgICBtZXRhZGF0YS5vdmVyd3JpdGFibGUgPSB0cnVlXG4gICAgQF9zZXRTdGF0ZVxuICAgICAgY29udGVudDogY29udGVudFxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXG4gICAgICBzYXZpbmc6IG51bGxcbiAgICAgIHNhdmVkOiB0eXBlIGlzICdzYXZlZEZpbGUnXG4gICAgICBkaXJ0eTogZmFsc2VcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LCBtZXRhZGF0YTogbWV0YWRhdGF9XG5cbiAgX2V2ZW50OiAodHlwZSwgZGF0YSA9IHt9LCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXG4gICAgQGV2ZW50Q2FsbGJhY2s/IGV2ZW50XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2s/IGV2ZW50XG5cbiAgX3NldFN0YXRlOiAob3B0aW9ucykgLT5cbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxuICAgIEBfZXZlbnQgJ3N0YXRlQ2hhbmdlZCdcblxuICBfcmVzZXRTdGF0ZTogLT5cbiAgICBAX3NldFN0YXRlXG4gICAgICBjb250ZW50OiBudWxsXG4gICAgICBtZXRhZGF0YTogbnVsbFxuICAgICAgZGlydHk6IGZhbHNlXG4gICAgICBzYXZpbmc6IG51bGxcbiAgICAgIHNhdmVkOiBmYWxzZVxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cblxuZG9jdW1lbnRTdG9yZSA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb21cIlxuYXV0aG9yaXplVXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcbmxpc3RVcmwgICAgICAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2FsbFwiXG5sb2FkRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9vcGVuXCJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxucmVtb3ZlRG9jdW1lbnRVcmwgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvZGVsZXRlXCJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5qaWZmID0gcmVxdWlyZSAnamlmZidcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGRvY1N0b3JlQXZhaWxhYmxlOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX29uRG9jU3RvcmVMb2FkZWQgPT5cbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxuXG4gIGF1dGhlbnRpY2F0ZTogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSxcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXG4gICAgKVxuXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcblxuICAgIEB1c2VyID0gbnVsbFxuXG4gIEBOYW1lOiAnZG9jdW1lbnRTdG9yZSdcblxuICBwcmV2aW91c2x5U2F2ZWRDb250ZW50OiBudWxsXG5cbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XG4gICAgaWYgQGF1dGhDYWxsYmFja1xuICAgICAgaWYgQHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXG4gICAgZWxzZVxuICAgICAgQHVzZXIgaXNudCBudWxsXG5cbiAgYXV0aG9yaXplOiAtPlxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcblxuICBfb25Eb2NTdG9yZUxvYWRlZDogKEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKSAtPlxuICAgIGlmIEBfZG9jU3RvcmVMb2FkZWRcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcblxuICBfbG9naW5TdWNjZXNzZnVsOiAoQHVzZXIpIC0+XG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxuXG4gIF9jaGVja0xvZ2luOiAtPlxuICAgIHByb3ZpZGVyID0gQFxuICAgICQuYWpheFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXG5cbiAgX2xvZ2luV2luZG93OiBudWxsXG5cbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxuICAgIGVsc2VcblxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxuXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxuXG4gICAgICB3aWR0aCA9IDEwMDBcbiAgICAgIGhlaWdodCA9IDQ4MFxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xuICAgICAgICAncmVzaXphYmxlPW5vJ1xuICAgICAgICAnbG9jYXRpb249bm8nXG4gICAgICAgICdkaWFsb2c9eWVzJ1xuICAgICAgICAnbWVudWJhcj1ubydcbiAgICAgIF1cblxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXG5cbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxuICAgICAgICB0cnlcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcbiAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICMgY29uc29sZS5sb2cgZVxuXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXG5cbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgaWYgQHVzZXJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtaWNvbid9KSwgQHVzZXIubmFtZSlcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogbGlzdFVybFxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBsaXN0ID0gW11cbiAgICAgICAgZm9yIG93biBrZXksIGZpbGUgb2YgZGF0YVxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6IHtpZDogZmlsZS5pZH1cbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXG4gICAgICBkYXRhOlxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICBjb250ZXh0OiBAXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBkYXRhXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIEpTT04uc3RyaW5naWZ5IGRhdGFcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcblxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGNvbnRlbnQgPSBAX3ZhbGlkYXRlQ29udGVudCBjb250ZW50XG5cbiAgICBwYXJhbXMgPSB7fVxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuXG4gICAgIyBTZWUgaWYgd2UgY2FuIHBhdGNoXG4gICAgaWYgbWV0YWRhdGEub3ZlcndyaXRhYmxlIGFuZCBAcHJldmlvdXNseVNhdmVkQ29udGVudCBhbmRcbiAgICAgICAgZGlmZiA9IEBfY3JlYXRlRGlmZiBAcHJldmlvdXNseVNhdmVkQ29udGVudCwgY29udGVudFxuICAgICAgc2VuZENvbnRlbnQgPSBkaWZmXG4gICAgICB1cmwgPSBwYXRjaERvY3VtZW50VXJsXG4gICAgZWxzZVxuICAgICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxuICAgICAgdXJsID0gc2F2ZURvY3VtZW50VXJsXG4gICAgICBzZW5kQ29udGVudCA9IGNvbnRlbnRcblxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHVybCwgcGFyYW1zKVxuXG4gICAgJC5hamF4XG4gICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xuICAgICAgdXJsOiB1cmxcbiAgICAgIGRhdGE6IHNlbmRDb250ZW50XG4gICAgICBjb250ZXh0OiBAXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGlmIEBvcHRpb25zLnBhdGNoIHRoZW4gQHByZXZpb3VzbHlTYXZlZENvbnRlbnQgPSBjb250ZW50XG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgJC5hamF4XG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXG4gICAgICBkYXRhOlxuICAgICAgICByZWNvcmRuYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgICBjb250ZXh0OiBAXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcblxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XG4gICAgJC5hamF4XG4gICAgICB1cmw6IHJlbmFtZURvY3VtZW50VXJsXG4gICAgICBkYXRhOlxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICAgIG5ld1JlY29yZG5hbWU6IG5ld05hbWVcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxuXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcbiAgICBrdnAgPSBbXVxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcbiAgICByZXR1cm4gdXJsICsgXCI/XCIgKyBrdnAuam9pbiBcIiZcIlxuXG4gICMgVGhlIGRvY3VtZW50IHNlcnZlciByZXF1aXJlcyB0aGUgY29udGVudCB0byBiZSBKU09OLCBhbmQgaXQgbXVzdCBoYXZlXG4gICMgY2VydGFpbiBwcmUtZGVmaW5lZCBrZXlzIGluIG9yZGVyIHRvIGJlIGxpc3RlZCB3aGVuIHdlIHF1ZXJ5IHRoZSBsaXN0XG4gIF92YWxpZGF0ZUNvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgICMgZmlyc3QgY29udmVydCB0byBhbiBvYmplY3QgdG8gZWFzaWx5IGFkZCBwcm9wZXJ0aWVzXG4gICAgdHJ5XG4gICAgICBjb250ZW50ID0gSlNPTi5wYXJzZSBjb250ZW50XG4gICAgY2F0Y2hcbiAgICAgIGNvbnRlbnQgPSB7Y29udGVudDogY29udGVudH1cblxuICAgIGNvbnRlbnQuYXBwTmFtZSAgICAgPz0gQG9wdGlvbnMuYXBwTmFtZVxuICAgIGNvbnRlbnQuYXBwVmVyc2lvbiAgPz0gQG9wdGlvbnMuYXBwVmVyc2lvblxuICAgIGNvbnRlbnQuYXBwQnVpbGROdW0gPz0gQG9wdGlvbnMuYXBwQnVpbGROdW1cblxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSBjb250ZW50XG5cbiAgX2NyZWF0ZURpZmY6IChqc29uMSwganNvbjIpIC0+XG4gICAgdHJ5XG4gICAgICBkaWZmID0gamlmZi5kaWZmKEpTT04ucGFyc2UoanNvbjEpLCBKU09OLnBhcnNlKGpzb24yKSlcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSBkaWZmXG4gICAgY2F0Y2hcbiAgICAgIHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbkdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcblxuICBhdXRoZW50aWNhdGU6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSxcbiAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxuICAgICAgZWxzZVxuICAgICAgICAnV2FpdGluZyBmb3IgdGhlIEdvb2dsZSBDbGllbnQgQVBJIHRvIGxvYWQuLi4nXG4gICAgKVxuXG5jbGFzcyBHb29nbGVEcml2ZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcblxuICAgIEBhdXRoVG9rZW4gPSBudWxsXG4gICAgQHVzZXIgPSBudWxsXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcbiAgICBpZiBub3QgQGNsaWVudElkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ01pc3NpbmcgcmVxdWlyZWQgY2xpZW50SWQgaW4gZ29vZ2xlRHJpdmUgcHJvdmlkZXIgb3B0aW9ucydcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxuICAgIEBfbG9hZEdBUEkoKVxuXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXG5cbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcbiAgQElNTUVESUFURSA9IHRydWVcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEBhdXRoVG9rZW5cbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcbiAgICBlbHNlXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIGFyZ3MgPVxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXG4gICAgICAgIEB1c2VyID0gbnVsbFxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgaWYgQHVzZXJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIHNhdmU6ICAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZGVkR0FQSSA9PlxuICAgICAgQF9zZW5kRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZGVkR0FQSSA9PlxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxuICAgICAgICAgIEBfZG93bmxvYWRGcm9tVXJsIGZpbGUuZG93bmxvYWRVcmwsIEBhdXRoVG9rZW4sIGNhbGxiYWNrXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XG4gICAgICAgIHE6IFwibWltZVR5cGUgPSAnI3tAbWltZVR5cGV9J1wiXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcbiAgICAgICAgICAjIFRPRE86IGZvciBub3cgZG9uJ3QgYWxsb3cgZm9sZGVyc1xuICAgICAgICAgIGlmIGl0ZW0ubWltZVR5cGUgaXNudCAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcbiAgICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXG4gICAgICAgICAgICAgIHBhdGg6IFwiXCJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgICBwcm92aWRlcjogQFxuICAgICAgICAgICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgLT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXG5cbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZGVkR0FQSSAtPlxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLnBhdGNoXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICAgIHJlc291cmNlOlxuICAgICAgICAgIHRpdGxlOiBuZXdOYW1lXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cbiAgICAgICAgaWYgcmVzdWx0Py5lcnJvclxuICAgICAgICAgIGNhbGxiYWNrPyByZXN1bHQuZXJyb3JcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcblxuICBfbG9hZEdBUEk6IC0+XG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXG4gICAgICB3aW5kb3cuX0dBUElPbkxvYWQgPSAtPlxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xuICAgICAgc2NyaXB0LnNyYyA9ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQuanM/b25sb2FkPV9HQVBJT25Mb2FkJ1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcblxuICBfbG9hZGVkR0FQSTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcbiAgICAgIGNhbGxiYWNrKClcbiAgICBlbHNlXG4gICAgICBzZWxmID0gQFxuICAgICAgY2hlY2sgPSAtPlxuICAgICAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxuICAgICAgICAgICAgICB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzID0gdHJ1ZVxuICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsIHNlbGZcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXG4gICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxuXG4gIF9kb3dubG9hZEZyb21Vcmw6ICh1cmwsIHRva2VuLCBjYWxsYmFjaykgLT5cbiAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgIHhoci5vcGVuICdHRVQnLCB1cmxcbiAgICBpZiB0b2tlblxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje3Rva2VuLmFjY2Vzc190b2tlbn1cIlxuICAgIHhoci5vbmxvYWQgPSAtPlxuICAgICAgY2FsbGJhY2sgbnVsbCwgeGhyLnJlc3BvbnNlVGV4dFxuICAgIHhoci5vbmVycm9yID0gLT5cbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXG4gICAgeGhyLnNlbmQoKVxuXG4gIF9zZW5kRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBib3VuZGFyeSA9ICctLS0tLS0tMzE0MTU5MjY1MzU4OTc5MzIzODQ2J1xuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxuICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxuXG4gICAgW21ldGhvZCwgcGF0aF0gPSBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXG4gICAgICBbJ1BVVCcsIFwiL3VwbG9hZC9kcml2ZS92Mi9maWxlcy8je21ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH1cIl1cbiAgICBlbHNlXG4gICAgICBbJ1BPU1QnLCAnL3VwbG9hZC9kcml2ZS92Mi9maWxlcyddXG5cbiAgICBib2R5ID0gW1xuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuI3toZWFkZXJ9XCIsXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICN7QG1pbWVUeXBlfVxcclxcblxcclxcbiN7Y29udGVudH1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcbiAgICBdLmpvaW4gJydcblxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XG4gICAgICBwYXRoOiBwYXRoXG4gICAgICBtZXRob2Q6IG1ldGhvZFxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxuICAgICAgYm9keTogYm9keVxuXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSAtPlxuICAgICAgaWYgY2FsbGJhY2tcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXG4gICAgICAgIGVsc2UgaWYgZmlsZVxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrICdVbmFibGVkIHRvIHVwbG9hZCBmaWxlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5jbGFzcyBMb2NhbFN0b3JhZ2VQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuTE9DQUxfU1RPUkFHRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcblxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcbiAgQEF2YWlsYWJsZTogLT5cbiAgICByZXN1bHQgPSB0cnlcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGVzdCwgdGVzdClcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxuICAgICAgdHJ1ZVxuICAgIGNhdGNoXG4gICAgICBmYWxzZVxuXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSksIGNvbnRlbnRcbiAgICAgIGNhbGxiYWNrPyBudWxsXG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIHNhdmUnXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxuICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBsaXN0ID0gW11cbiAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcbiAgICBwcmVmaXggPSBAX2dldEtleSBwYXRoXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcbiAgICAgICAgW25hbWUsIHJlbWFpbmRlci4uLl0gPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpLnNwbGl0KCcvJylcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgbmFtZToga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxuICAgICAgICAgIHBhdGg6IFwiI3twYXRofS8je25hbWV9XCJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgcHJvdmlkZXI6IEBcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XG5cbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHRyeVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXG4gICAgICBjYWxsYmFjaz8gbnVsbFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBkZWxldGUnXG5cbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxuICAgIHRyeVxuICAgICAgY29udGVudCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobmV3TmFtZSksIGNvbnRlbnRcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxuICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcbiAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIHJlbmFtZSdcblxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxuICAgIFwiY2ZtOjoje25hbWV9XCJcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxuY2xhc3MgQ2xvdWRGaWxlXG4gIGNvbnRydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAY29udGVudCwgQG1ldGFkYXRhfSA9IG9wdGlvbnNcblxuY2xhc3MgQ2xvdWRNZXRhZGF0YVxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAge0BuYW1lLCBAcGF0aCwgQHR5cGUsIEBwcm92aWRlciwgQHByb3ZpZGVyRGF0YT17fSwgQG92ZXJ3cml0YWJsZX0gPSBvcHRpb25zXG4gIEBGb2xkZXI6ICdmb2xkZXInXG4gIEBGaWxlOiAnZmlsZSdcblxuQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0F1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZydcbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sIFwiQXV0aG9yaXphdGlvbiBkaWFsb2cgbm90IHlldCBpbXBsZW1lbnRlZCBmb3IgI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXG5cbmNsYXNzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQGRpc3BsYXlOYW1lLCBAY2FwYWJpbGl0aWVzfSA9IG9wdGlvbnNcblxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXG5cbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG5cbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxuICAgIGlmIGNhbGxiYWNrXG4gICAgICBjYWxsYmFjayB0cnVlXG4gICAgZWxzZVxuICAgICAgdHJ1ZVxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgbnVsbFxuXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcblxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXG5cbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXG5cbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcblxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxuICAgIGFsZXJ0IFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCJcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiBmYWxzZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxuICAgICAgICByZW5hbWU6IGZhbHNlXG4gICAgQHRyZWUgPSBudWxsXG5cbiAgQE5hbWU6ICdyZWFkT25seSdcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcbiAgICAgIGlmIHBhcmVudFxuICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV1cbiAgICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHBhcmVudFttZXRhZGF0YS5uYW1lXS5jb250ZW50XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxuICAgICAgaWYgcGFyZW50XG4gICAgICAgIGxpc3QgPSBbXVxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHBhcmVudFxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XG4gICAgICBlbHNlIGlmIG1ldGFkYXRhXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcblxuICBfbG9hZFRyZWU6IChjYWxsYmFjaykgLT5cbiAgICBpZiBAdHJlZSBpc250IG51bGxcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvbkNhbGxiYWNrXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgY2FsbGJhY2sgZXJyXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xuICAgICAgJC5hamF4XG4gICAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgZGF0YVxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXG4gICAgZWxzZVxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxuXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGF0aFByZWZpeCA9ICcvJykgLT5cbiAgICB0cmVlID0ge31cbiAgICBmb3Igb3duIGZpbGVuYW1lIG9mIGpzb25cbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgIG5hbWU6IGZpbGVuYW1lXG4gICAgICAgIHBhdGg6IHBhdGhQcmVmaXggKyBmaWxlbmFtZVxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIGNoaWxkcmVuOiBudWxsXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXG4gICAgICAgIG1ldGFkYXRhLmNoaWxkcmVuID0gX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIHBhdGhQcmVmaXggKyBmaWxlbmFtZSArICcvJ1xuICAgICAgdHJlZVtmaWxlbmFtZV0gPVxuICAgICAgICBjb250ZW50OiBqc29uW2ZpbGVuYW1lXVxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICB0cmVlXG5cbiAgX2ZpbmRQYXJlbnQ6IChtZXRhZGF0YSkgLT5cbiAgICBpZiBub3QgbWV0YWRhdGFcbiAgICAgIEB0cmVlXG4gICAgZWxzZVxuICAgICAgQHRyZWVcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcblxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG5cbiAgQERlZmF1bHRNZW51OiBbJ25ld0ZpbGVEaWFsb2cnLCAnb3BlbkZpbGVEaWFsb2cnLCAncmVvcGVuRGlhbG9nJywgJ3NlcGFyYXRvcicsICdzYXZlJywgJ3NhdmVGaWxlQXNEaWFsb2cnLCAnZG93bmxvYWREaWFsb2cnLCAncmVuYW1lRGlhbG9nJ11cbiAgQEF1dG9TYXZlTWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3Jlb3BlbkRpYWxvZycsICdzZXBhcmF0b3InLCAnc2F2ZUNvcHlEaWFsb2cnLCAnZG93bmxvYWREaWFsb2cnLCAncmVuYW1lRGlhbG9nJ11cblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMsIGNsaWVudCkgLT5cbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXG5cbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cbiAgICAgIHN3aXRjaCBhY3Rpb25cbiAgICAgICAgd2hlbiAncmVvcGVuRGlhbG9nJ1xuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdsb2FkJ1xuICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlci5jYW4gJ3JlbmFtZSdcbiAgICAgICAgd2hlbiAnc2F2ZUNvcHlEaWFsb2cnXG4gICAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhP1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdHJ1ZVxuXG4gICAgbmFtZXMgPVxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxuICAgICAgb3BlbkZpbGVEaWFsb2c6IHRyIFwifk1FTlUuT1BFTlwiXG4gICAgICByZW9wZW5EaWFsb2c6IHRyIFwifk1FTlUuUkVPUEVOXCJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXG4gICAgICBzYXZlRmlsZUFzRGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQVNcIlxuICAgICAgc2F2ZUNvcHlEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9DT1BZXCJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcbiAgICAgIHJlbmFtZURpYWxvZzogdHIgXCJ+TUVOVS5SRU5BTUVcIlxuXG4gICAgQGl0ZW1zID0gW11cbiAgICBmb3IgaXRlbSBpbiBvcHRpb25zLm1lbnVcbiAgICAgIG1lbnVJdGVtID0gaWYgaXRlbSBpcyAnc2VwYXJhdG9yJ1xuICAgICAgICBzZXBhcmF0b3I6IHRydWVcbiAgICAgIGVsc2UgaWYgaXNTdHJpbmcgaXRlbVxuICAgICAgICBuYW1lOiBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV0gb3IgbmFtZXNbaXRlbV0gb3IgXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxuICAgICAgICBlbmFibGVkOiBzZXRFbmFibGVkIGl0ZW1cbiAgICAgICAgYWN0aW9uOiBzZXRBY3Rpb24gaXRlbVxuICAgICAgZWxzZVxuICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIG90aGVyd2lzZSBpdCBpcyBhc3N1bWVkIGFjdGlvbiBpcyBhIGZ1bmN0aW9uXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXG4gICAgICAgICAgaXRlbS5lbmFibGVkID0gc2V0RW5hYmxlZCBpdGVtLmFjdGlvblxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpdGVtLmVuYWJsZWQgb3I9IHRydWVcbiAgICAgICAgaXRlbVxuICAgICAgaWYgbWVudUl0ZW1cbiAgICAgICAgQGl0ZW1zLnB1c2ggbWVudUl0ZW1cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJXG5cbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XG4gICAgQG1lbnUgPSBudWxsXG5cbiAgaW5pdDogKG9wdGlvbnMpIC0+XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgb3Ige31cbiAgICAjIHNraXAgdGhlIG1lbnUgaWYgZXhwbGljaXR5IHNldCB0byBudWxsIChtZWFuaW5nIG5vIG1lbnUpXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxuICAgICAgaWYgdHlwZW9mIG9wdGlvbnMubWVudSBpcyAndW5kZWZpbmVkJ1xuICAgICAgICBvcHRpb25zLm1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcblxuICAjIGZvciBSZWFjdCB0byBsaXN0ZW4gZm9yIGRpYWxvZyBjaGFuZ2VzXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxuXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxuXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xuXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcblxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xuXG4gIHNhdmVDb3B5RGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQ29weScsICh0ciAnfkRJQUxPRy5TQVZFX0NPUFknKSwgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXG5cbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgX3Nob3dQcm92aWRlckRpYWxvZzogKGFjdGlvbiwgdGl0bGUsIGNhbGxiYWNrKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcbiAgICAgIGFjdGlvbjogYWN0aW9uXG4gICAgICB0aXRsZTogdGl0bGVcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxuICBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51OiBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xuIiwibW9kdWxlLmV4cG9ydHMgPVxuICBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXG5cbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXG4gIFwifk1FTlUuUkVPUEVOXCI6IFwiUmVvcGVuXCJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcbiAgXCJ+TUVOVS5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXG5cbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG4gIFwifkRJQUxPRy5TQVZFX0NPUFlcIjogXCJTYXZlIEEgQ29weSAuLi5cIlxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxuICBcIn5ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXG4gIFwifkRJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxuXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXG5cbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxuXG4gIFwifkRPV05MT0FEX0RJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+UkVOQU1FX0RJQUxPRy5SRU5BTUVcIjogXCJSZW5hbWVcIlxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG5cbiAgXCJ+Q09ORklSTS5PUEVOX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgb3BlbiBhIG5ldyBmaWxlP1wiXG4gIFwifkNPTkZJUk0uTkVXX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgYSBuZXcgZmlsZT9cIlxuICBcIn5DT05GSVJNLlJFT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJlb3BlbiB0aGUgZmlsZSBhbmQgcmV0dXJuIHRvIGl0cyBsYXN0IHNhdmVkIHN0YXRlP1wiXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcbmRlZmF1bHRMYW5nID0gJ2VuJ1xudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xuXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcblxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGlmcmFtZX0gPSBSZWFjdC5ET01cblxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VySW5uZXJBcHAnXG5cbiAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiAobmV4dFByb3BzKSAtPlxuICAgIG5leHRQcm9wcy5hcHAgaXNudCBAcHJvcHMuYXBwXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ2lubmVyQXBwJ30sXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxuICAgIClcblxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXInXG5cbiAgZ2V0RmlsZW5hbWU6IC0+XG4gICAgaWYgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8uaGFzT3duUHJvcGVydHkoJ25hbWUnKSB0aGVuIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIilcblxuICBnZXRQcm92aWRlcjogLT5cbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcbiAgICBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXG4gICAgZG93bmxvYWREaWFsb2c6IG51bGxcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcbiAgICBkaXJ0eTogZmFsc2VcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxuICAgICAgICB7bWVzc2FnZTogXCJBbGwgY2hhbmdlcyBzYXZlZCB0byAje2V2ZW50LnN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiLCB0eXBlOiAnaW5mbyd9XG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XG4gICAgICBlbHNlXG4gICAgICAgIG51bGxcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICAgICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcblxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG5cbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdzaG93RG93bmxvYWREaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHJlbmFtZURpYWxvZzogZXZlbnQuZGF0YVxuICAgICAgICB3aGVuICdhcHBlbmRNZW51SXRlbSdcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcblxuICBjbG9zZURpYWxvZ3M6IC0+XG4gICAgQHNldFN0YXRlXG4gICAgICBwcm92aWRlckRpYWxvZzogbnVsbFxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcbiAgICAgIHJlbmFtZURpYWxvZzogbnVsbFxuXG4gIHJlbmRlckRpYWxvZ3M6IC0+XG4gICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xuICAgICAgKERvd25sb2FkRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmZpbGVuYW1lLCBjb250ZW50OiBAc3RhdGUuZG93bmxvYWREaWFsb2cuY29udGVudCwgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG5cbiAgcmVuZGVyOiAtPlxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXG4gICAgICAgIChNZW51QmFyIHtmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXG4gICAgICAgIChJbm5lckFwcCB7YXBwOiBAcHJvcHMuYXBwfSlcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxuICAgICAgKVxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nIG9yIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJBdXRob3JpemVNaXhpbiA9XG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBhdXRob3JpemVkOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXG5cbiAgcmVuZGVyOiAtPlxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXG4gICAgICBAcmVuZGVyV2hlbkF1dGhvcml6ZWQoKVxuICAgIGVsc2VcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdEb3dubG9hZERpYWxvZ1ZpZXcnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXG4gICAgc3RhdGUgPVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcblxuICB0cmltOiAocykgLT5cbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcblxuICBkb3dubG9hZDogKGUpIC0+XG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXG4gICAgICBlLnRhcmdldC5zZXRBdHRyaWJ1dGUgJ2hyZWYnLCBcImRhdGE6dGV4dC9wbGFpbiwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudCl9XCJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb3dubG9hZC1kaWFsb2cnfSxcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAgIChhIHtocmVmOiAnIycsIGNsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBkb3dubG9hZDogQHN0YXRlLnRyaW1tZWRGaWxlbmFtZSwgb25DbGljazogQGRvd25sb2FkfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQUQnKVxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+RE9XTkxPQURfRElBTE9HLkNBTkNFTCcpXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG4iLCJ7ZGl2LCBpLCBzcGFuLCB1bCwgbGl9ID0gUmVhY3QuRE9NXG5cbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcblxuICBjbGlja2VkOiAtPlxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cblxuICByZW5kZXI6IC0+XG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkKClcbiAgICAgIGVsc2VcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxuICAgIGVsc2VcbiAgICAgIHRydWVcblxuICAgIGNsYXNzZXMgPSBbJ21lbnVJdGVtJ11cbiAgICBpZiBAcHJvcHMuaXRlbS5zZXBhcmF0b3JcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpfSwgJycpXG4gICAgZWxzZVxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3IgKEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIG5vdCBAcHJvcHMuaXRlbS5hY3Rpb24pXG4gICAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpLCBvbkNsaWNrOiBAY2xpY2tlZCB9LCBuYW1lKVxuXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcblxuICBnZXREZWZhdWx0UHJvcHM6IC0+XG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXG4gICAgb25TZWxlY3Q6IChpdGVtKSAtPiAgICAgICAgICAgICAjIElmIG5vdCwgQHByb3BzLm9uU2VsZWN0IGlzIGNhbGxlZFxuICAgICAgbG9nLmluZm8gXCJTZWxlY3RlZCAje2l0ZW19XCJcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgc2hvd2luZ01lbnU6IGZhbHNlXG4gICAgdGltZW91dDogbnVsbFxuXG4gIGJsdXI6IC0+XG4gICAgQHVuYmx1cigpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZX0gKSwgNTAwXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiB0aW1lb3V0fVxuXG4gIHVuYmx1cjogLT5cbiAgICBpZiBAc3RhdGUudGltZW91dFxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cblxuICBzZWxlY3Q6IChpdGVtKSAtPlxuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cbiAgICBpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBpdGVtLmFjdGlvblxuICAgICAgaXRlbS5hY3Rpb24oKVxuICAgIGVsc2VcbiAgICAgIEBwcm9wcy5vblNlbGVjdCBpdGVtXG5cbiAgcmVuZGVyOiAtPlxuICAgIG1lbnVDbGFzcyA9IGlmIEBzdGF0ZS5zaG93aW5nTWVudSB0aGVuICdtZW51LXNob3dpbmcnIGVsc2UgJ21lbnUtaGlkZGVuJ1xuICAgIHNlbGVjdCA9IChpdGVtKSA9PlxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUnfSxcbiAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxuICAgICAgICBAcHJvcHMuYW5jaG9yXG4gICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWFycm93LWV4cGFuZCd9KVxuICAgICAgKVxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBvbk1vdXNlTGVhdmU6IEBibHVyLCBvbk1vdXNlRW50ZXI6IEB1bmJsdXJ9LFxuICAgICAgICAgICh1bCB7fSxcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBwcm9wcy5pdGVtc1xuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQGxhc3RDbGljayA9IDBcblxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcbiAgICBAbGFzdENsaWNrID0gbm93XG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sIEBwcm9wcy5tZXRhZGF0YS5uYW1lKVxuXG5GaWxlTGlzdCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgbG9hZGluZzogdHJ1ZVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgIEBsb2FkKClcblxuICBsb2FkOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IEBwcm9wcy5mb2xkZXIsIChlcnIsIGxpc3QpID0+XG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXG4gICAgICBlbHNlXG4gICAgICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxuICAgICAgICAgIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXG4gICAgKVxuXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdGaWxlRGlhbG9nVGFiJ1xuXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmb2xkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xuICAgIGxpc3Q6IFtdXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXG5cbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXG4gICAgbWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxuICAgIEBzZXRTdGF0ZSBsaXN0OiBsaXN0XG5cbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICBAc2V0U3RhdGUgbWV0YWRhdGE6IG1ldGFkYXRhXG5cbiAgY29uZmlybTogLT5cbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgaWYgQGlzT3BlblxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcbiAgICAgICAgICAgIHBhdGg6IFwiLyN7ZmlsZW5hbWV9XCIgIyBUT0RPOiBGaXggcGF0aFxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrPyBAc3RhdGUubWV0YWRhdGFcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG5cbiAgcmVtb3ZlOiAtPlxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVtb3ZlIEBzdGF0ZS5tZXRhZGF0YSwgKGVycikgPT5cbiAgICAgICAgaWYgbm90IGVyclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXG4gICAgICAgICAgaW5kZXggPSBsaXN0LmluZGV4T2YgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAgICAgbGlzdC5zcGxpY2UgaW5kZXgsIDFcbiAgICAgICAgICBAc2V0U3RhdGVcbiAgICAgICAgICAgIGxpc3Q6IGxpc3RcbiAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcblxuICBjYW5jZWw6IC0+XG4gICAgQHByb3BzLmNsb3NlKClcblxuICBmaW5kTWV0YWRhdGE6IChmaWxlbmFtZSkgLT5cbiAgICBmb3IgbWV0YWRhdGEgaW4gQHN0YXRlLmxpc3RcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXG4gICAgbnVsbFxuXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxuICAgICAgQGNvbmZpcm0oKVxuXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcblxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxuXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxuICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpLCBzcGFufSA9IFJlYWN0LkRPTVxuXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xuXG4gIGhlbHA6IC0+XG4gICAgd2luZG93Lm9wZW4gQHByb3BzLm9wdGlvbnMuaGVscCwgJ19ibGFuaydcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcbiAgICAgICAgKERyb3Bkb3duIHtcbiAgICAgICAgICBhbmNob3I6IEBwcm9wcy5maWxlbmFtZVxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcbiAgICAgICAgICBjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnfSlcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXG4gICAgICApXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXG4gICAgICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYmFyLWluZm8nfSwgQHByb3BzLm9wdGlvbnMuaW5mbylcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyIGFuZCBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCgpXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5oZWxwXG4gICAgICAgICAgKGkge3N0eWxlOiB7Zm9udFNpemU6IFwiMTNweFwifSwgY2xhc3NOYW1lOiAnY2xpY2thYmxlIGljb24taGVscCcsIG9uQ2xpY2s6IEBoZWxwfSlcbiAgICAgIClcbiAgICApXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXG5cbiAgY2xvc2U6IC0+XG4gICAgQHByb3BzLmNsb3NlPygpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tZXhcIiwgb25DbGljazogQGNsb3NlfSlcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xuICAgICAgICAgIClcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcbiAgICApXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcblxuICB3YXRjaEZvckVzY2FwZTogKGUpIC0+XG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XG4gICAgICBAcHJvcHMuY2xvc2U/KClcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXG5cbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWJhY2tncm91bmQnfSlcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxuICAgIClcbiIsIk1vZGFsVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldydcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZmlsZS1kaWFsb2ctdGFiLXZpZXcnXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1Byb3ZpZGVyVGFiYmVkRGlhbG9nJ1xuXG4gIHJlbmRlcjogIC0+XG4gICAgW2NhcGFiaWxpdHksIFRhYkNvbXBvbmVudF0gPSBzd2l0Y2ggQHByb3BzLmRpYWxvZy5hY3Rpb25cbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzYXZlRmlsZUNvcHknLCAnc2F2ZUZpbGVDb3B5JyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXG5cbiAgICB0YWJzID0gW11cbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcblxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXG4gICAgc3RhdGUgPVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcblxuICB0cmltOiAocykgLT5cbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcblxuICByZW5hbWU6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgQHByb3BzLmNhbGxiYWNrPyBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAncmVuYW1lLWRpYWxvZyd9LFxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgICAgKGJ1dHRvbiB7Y2xhc3NOYW1lOiAoaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEByZW5hbWV9LCB0ciAnflJFTkFNRV9ESUFMT0cuUkVOQU1FJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflJFTkFNRV9ESUFMT0cuQ0FOQ0VMJylcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXG5cbmNsYXNzIFRhYkluZm9cbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXG5cblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xuXG4gIGNsaWNrZWQ6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxuXG4gIHJlbmRlcjogLT5cbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxuXG4gIHN0YXRpY3M6XG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXG5cbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcblxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxuICAgIChUYWJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcbiAgICAgIGtleTogaW5kZXhcbiAgICAgIGluZGV4OiBpbmRleFxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxuICAgIClcblxuICByZW5kZXJUYWJzOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXG4gICAgICAodWwge2tleTogaW5kZXh9LCBAcmVuZGVyVGFiKHRhYiwgaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxuICAgIClcblxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xuICAgICAgICAoZGl2IHtcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgICAgc3R5bGU6XG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRhYi5jb21wb25lbnRcbiAgICAgICAgKVxuICAgIClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxuICAgICAgQHJlbmRlclRhYnMoKVxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxuICAgIClcbiJdfQ==
