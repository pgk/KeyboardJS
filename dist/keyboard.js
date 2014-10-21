!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.keyboardJS=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// libs
var KeyboardJS = require('./lib/keyboard');
var Locale = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');
var usLocale = require('./locales/us');

var keyboardJS = new KeyboardJS();
keyboardJS.setLocale(usLocale);

exports = module.exports = keyboardJS;
exports.KeyboardJS = KeyboardJS;
exports.Locale = Locale;
exports.KeyCombo = KeyCombo;

},{"./lib/key-combo":2,"./lib/keyboard":3,"./lib/locale":4,"./locales/us":5}],2:[function(require,module,exports){

// modules
var guard = require('type-guard');


function KeyCombo(keyComboStr) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');

  self.sourceStr = keyComboStr;
  self.subCombos = KeyCombo.parseComboStr(keyComboStr);
  self.keyNames = self.subCombos.reduce(function(memo, nextSubCombo) {
    return memo.concat(nextSubCombo);
  });
}

KeyCombo.sequenceDeliminator = '>>';
KeyCombo.comboDeliminator = '>';
KeyCombo.keyDeliminator = '+';

KeyCombo.parseComboStr = function(keyComboStr) {
  guard('keyComboStr', keyComboStr, 'string');

  var subComboStrs = KeyCombo._splitStr(keyComboStr, KeyCombo.comboDeliminator);
  var combo = [];
  for (var i = 0 ; i < subComboStrs.length; i += 1) {
    combo.push(KeyCombo._splitStr(subComboStrs[i], KeyCombo.keyDeliminator));
  }
  return combo;
};

KeyCombo._splitStr = function(str, deliminator) {
  var s = str;
  var d = deliminator;
  var c = '';
  var ca = [];

  for (var ci = 0; ci < s.length; ci += 1) {
    if (ci > 0 && s[ci] === d && s[ci - 1] !== '\\') {
      ca.push(c.trim());
      c = '';
      ci += 1;
    }
    c += s[ci];
  }
  if (c) { ca.push(c.trim()); }

  return ca;
};

KeyCombo.prototype.check = function(pressedKeyNames) {
  var self = this;

  guard('pressedKeyNames', pressedKeyNames, 'array');

  var startingKeyNameIndex = 0;
  for (var i = 0; i < self.subCombos.length; i += 1) {
    startingKeyNameIndex = self._checkSubCombo(
      self.subCombos[i],
      startingKeyNameIndex,
      pressedKeyNames
    );
    if (startingKeyNameIndex === -1) { return false; }
  }
  return true;
};

KeyCombo.prototype.isEqual = function(otherKeyCombo) {
  var self = this;

  guard('otherKeyCombo', otherKeyCombo, [ 'object', 'string' ]);

  if (typeof otherKeyCombo === 'string') {
    otherKeyCombo = new KeyCombo(otherKeyCombo);
  } else {
    guard('otherKeyCombo.subCombos', otherKeyCombo.subCombos, 'array');
  }

  if (self.subCombos.length !== otherKeyCombo.subCombos.length) {
    return false;
  }
  for (var i = 0; i < self.subCombos.length; i += 1) {
    if (self.subCombos[i].length !== otherKeyCombo.subCombos[i].length) {
      return false;
    }
  }

  for (var i = 0; i < self.subCombos.length; i += 1) {
    var subCombo = self.subCombos[i];
    var otherSubCombo = otherKeyCombo.subCombos[i].slice(0);
    for (var j = 0; j < subCombo.length; j += 1) {
      var keyName = subCombo[j];
      var index = otherSubCombo.indexOf(keyName);
      if (index > -1) {
        otherSubCombo.splice(index, 1);
      }
    }
    if (otherSubCombo.length !== 0) {
      return false;
    }
  }

  return true;
};

KeyCombo.prototype._checkSubCombo = function(
  subCombo,
  startingKeyNameIndex,
  pressedKeyNames
) {
  var self = this;

  guard('subCombo', subCombo, 'array');
  guard('startingKeyNameIndex', startingKeyNameIndex, 'number');
  guard('pressedKeyNames', pressedKeyNames, 'array');

  subCombo = subCombo.slice(0);
  pressedKeyNames = pressedKeyNames.slice(startingKeyNameIndex);

  var endIndex = startingKeyNameIndex;
  for (var i = 0; i < subCombo.length; i += 1) {

    var keyName = subCombo[i];
    if (keyName[0] === '\\') {
      var escapedKeyName = keyName.slice(1);
      if (
        escapedKeyName === KeyCombo.comboDeliminator ||
        escapedKeyName === KeyCombo.keyDeliminator
      ) {
        keyName = escapedKeyName;
      }
    }

    var index = pressedKeyNames.indexOf(keyName);
    if (index > -1) {
      subCombo.splice(i, 1);
      i -= 1;
      if (index > endIndex) {
        endIndex = index;
      }
      if (subCombo.length === 0) {
        return endIndex;
      }
    }
  }
  return -1;
};


module.exports = KeyCombo;

},{"type-guard":6}],3:[function(require,module,exports){
(function (global){

// modules
var guard = require('type-guard');

// libs
var Locale = require('./locale');
var KeyCombo = require('./key-combo');


function KeyboardJS(targetWindow) {
  var self = this;

  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  self.locale = null;
  self._listeners = [];
  self._appliedListeners = [];
  self._locales = {};
  self._targetDocument = null;
  self._targetWindow = null;

  self.watch();
}

KeyboardJS.prototype.setLocale = function(localeName, localeBuilder) {
  var self = this;

  var locale = null;
  if (typeof localeName === 'string') {

    guard('localeName', localeName, [ 'string', 'null' ]);
    guard('localeBuilder', localeBuilder, [ 'function', 'undefined' ]);

    if (localeBuilder) {
      locale = new Locale(localeName);
      localeBuilder(locale);
    } else {
      locale = self._locales[localeName] || null;
    }
  } else {

    guard('locale', localeName, 'object');
    guard('locale.localeName', localeName.localeName, 'string');
    guard('locale.pressKey', localeName.pressKey, 'function');
    guard('locale.releaseKey', localeName.releaseKey, 'function');
    guard('locale.pressedKeys', localeName.pressedKeys, 'array');

    locale = localeName;
    localeName = locale.localeName;
  }

  self.locale = locale;
  self._locales[localeName] = locale;
  if (locale) {
    self.locale.pressedKeys = locale.pressedKeys;
  }
};

KeyboardJS.prototype.pressKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.pressKey(keyCode);
  self._applyBindings(event);
};

KeyboardJS.prototype.releaseKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.releaseKey(keyCode);
  self._clearBindings(event);
};

KeyboardJS.prototype.releaseAllKeys = function() {
  var self = this;
  self.locale.pressedKeys.length = 0;
  self._clearBindings();
};

KeyboardJS.prototype.bind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, 'function');
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined' ]);

  if (typeof keyComboStr === 'string') {
    self._listeners.push({
      keyCombo: new KeyCombo(keyComboStr),
      pressHandler: pressHandler,
      releaseHandler: releaseHandler || null
    });
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.addListener = KeyboardJS.prototype.bind;
KeyboardJS.prototype.on = KeyboardJS.prototype.bind;

KeyboardJS.prototype.unbind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, [ 'function', 'undefined' ]);
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined' ]);

  if (typeof keyComboStr === 'string') {
    for (var i = 0; i < self._listeners.length; i += 1) {
      var listener = self._listeners[i];

      var comboMatches = listener.keyCombo.isEqual(keyComboStr);
      var pressHandlerMatches = !pressHandler ||
        pressHandler === listener.pressHandler;
      var releaseHandlerMatches = listener.releaseHandler === null ||
        releaseHandler === listener.releaseHandler;

      if (comboMatches && pressHandlerMatches && releaseHandlerMatches) {
        self._listeners.splice(i, 1);
        i -= 1;
      }
    }
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.removeListener = KeyboardJS.prototype.unbind;
KeyboardJS.prototype.off = KeyboardJS.prototype.unbind;

KeyboardJS.prototype.watch = function(targetDocument, targetWindow) {
  var self = this;

  self.stop();

  guard('targetDocument', targetDocument, [ 'object', 'undefined' ]);
  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  if (targetDocument && targetDocument.document && !targetWindow) {
    targetWindow = targetDocument;
    targetDocument = null;
  }
  if (!targetWindow) {
    targetWindow = global.window;
  }
  if (targetWindow && !targetDocument) {
    targetDocument = targetWindow.document;
  }

  if (targetDocument && targetWindow) {
    self._isModernBrowser = !!targetWindow.addEventListener;

    self._bindEvent(targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._bindEvent(targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._bindEvent(targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._bindEvent(targetWindow, 'blur', self.releaseAllKeys.bind(self));

    self._targetDocument = targetDocument;
    self._targetWindow = targetWindow;
  }
};

KeyboardJS.prototype.stop = function() {
  var self = this;
  if (self._targetDocument) {
    self._unbindEvent(self._targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._unbindEvent(self._targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._targetDocument = null;
  }
  if (self._targetWindow) {
    self._unbindEvent(self._targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._unbindEvent(self._targetWindow, 'blur', self.releaseAllKeys.bind(self));
    self._targetWindow = null;
  }
};

KeyboardJS.prototype.reset = function() {
  var self = this;
  self.releaseAllKeys();
  self._listeners.length = 0;
};

KeyboardJS.prototype._bindEvent = function(targetElement, event, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.addEventListener(event, handler, false) :
    targetElement.attachEvent('on' + event, handler);
};

KeyboardJS.prototype._unbindEvent = function(targetElement, event, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.removeEventListener(event, handler, false):
    targetElement.detachEvent('on' + event, handler);
};

KeyboardJS.prototype._applyBindings = function(event) {
  var self = this;

  var pressedKeys = self.locale.pressedKeys.slice(0);
  var listeners = self._listeners.slice(0).sort(function(a, b) {
    return a.keyNames.length > b.keyNames.length;
  });

  for (var i = 0; i < listeners.length; i += 1) {
    var listener = listeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.pressHandler;
    if (keyCombo.check(pressedKeys)) {

      handler.apply(self, event);

      for (var j = 0; j < keyCombo.keyNames.length; j += 1) {
        var index = pressedKeys.indexOf(keyCombo.keyNames[j]);
        if (index !== -1) {
          pressedKeys.splice(index, 1);
          j -= 1;
        }
      }

      if (listener.releaseHandler) {
        if (self._appliedListeners.indexOf(listener) === -1) {
          self._appliedListeners.push(listener);
        }
      }
    }
  }
};

KeyboardJS.prototype._clearBindings = function(event) {
  var self = this;
  for (var i = 0; i < self._appliedListeners.length; i += 1) {
    var listener = self._appliedListeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.releaseHandler;
    if (!keyCombo.check(self.locale.pressedKeys)) {
      handler.apply(self, event);
      self._appliedListeners.splice(i, 1);
      i -= 1;
    }
  }
};

module.exports = KeyboardJS;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./key-combo":2,"./locale":4,"type-guard":6}],4:[function(require,module,exports){

// modules
var guard = require('type-guard');

// libs
var KeyCombo = require('./key-combo');


function Locale(name) {
  var self = this;

  guard('name', name, 'string');

  self.localeName = name;
  self.pressedKeys = [];
  self._appliedMacros = [];
  self._keyMap = {};
  self._macros = [];
}

Locale.prototype.bindKeyCode = function(keyCode, keyNames) {
  var self = this;

  guard('keyCode', keyCode, 'number');
  guard('keyNames', keyNames, [ 'array', 'string' ]);

  if (typeof keyNames === 'string') {
    keyNames = [keyNames];
  }

  self._keyMap[keyCode] = keyNames;
};

Locale.prototype.bindMacro = function(keyComboStr, keyNames) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');
  guard('keyNames', keyNames, [ 'function', 'string', 'array' ]);

  if (typeof keyNames === 'string') {
    keyNames = [ keyNames ];
  }

  var macro = {
    keyCombo: new KeyCombo(keyComboStr),
    keyNames: null,
    handler: null
  };

  if (typeof keyNames === 'function') {
    macro.handler = keyNames;
  } else {
    macro.keyNames = keyNames;
  }

  self._macros.push(macro);
};

Locale.prototype.getKeyCodes = function(keyName) {
  var self = this;

  guard('keyName', keyName, 'string');

  var keyCodes = [];
  for (var keyCode in self._keyMap) {
    var index = self._keyMap[keyCode].indexOf(keyName);
    if (index > -1) { keyCodes.push(keyCode|0); }
  }
  return keyCodes;
};

Locale.prototype.getKeyNames = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, 'number');

  return self._keyMap[keyCode] || [];
};

Locale.prototype.pressKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.pressKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      if (self.pressedKeys.indexOf(keyNames[i]) === -1) {
        self.pressedKeys.push(keyNames[i]);
      }
    }

    self._applyMacros();
  }
};

Locale.prototype.releaseKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.releaseKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      var index = self.pressedKeys.indexOf(keyNames[i]);
      if (index > -1) {
        self.pressedKeys.splice(index, 1);
      }
    }

    self._clearMacros();
  }
};

Locale.prototype._applyMacros = function() {
  var self = this;

  var macros = self._macros.slice(0);
  for (var i = 0; i < macros.length; i += 1) {
    var macro = macros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        if (self.pressedKeys.indexOf(keyNames[j]) === -1) {
          self.pressedKeys.push(keyNames[j]);
        }
      }
      self._appliedMacros.push(macro);
    }
  }
};

Locale.prototype._clearMacros = function() {
  var self = this;

  for (var i = 0; i < self._appliedMacros.length; i += 1) {
    var macro = self._appliedMacros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (!keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        var index = self.pressedKeys.indexOf(keyNames[j]);
        if (index > -1) {
          self.pressedKeys.splice(index, 1);
        }
      }
      self._appliedMacros.splice(i, 1);
      i -= 1;
    }
  }
};


module.exports = Locale;

},{"./key-combo":2,"type-guard":6}],5:[function(require,module,exports){

// modules
var Locale = require('../lib/locale');


// create the locale
var locale = new Locale('us');

// general
locale.bindKeyCode(3, [ 'cancel' ]);
locale.bindKeyCode(8, [ 'backspace' ]);
locale.bindKeyCode(9, [ 'tab' ]);
locale.bindKeyCode(12, [ 'clear' ]);
locale.bindKeyCode(13, [ 'enter' ]);
locale.bindKeyCode(16, [ 'shift' ]);
locale.bindKeyCode(17, [ 'ctrl' ]);
locale.bindKeyCode(18, [ 'alt', 'menu' ]);
locale.bindKeyCode(19, [ 'pause', 'break' ]);
locale.bindKeyCode(20, [ 'capslock' ]);
locale.bindKeyCode(27, [ 'escape', 'esc' ]);
locale.bindKeyCode(32, [ 'space', 'spacebar' ]);
locale.bindKeyCode(33, [ 'pageup' ]);
locale.bindKeyCode(34, [ 'pagedown' ]);
locale.bindKeyCode(35, [ 'end' ]);
locale.bindKeyCode(36, [ 'home' ]);
locale.bindKeyCode(37, [ 'left' ]);
locale.bindKeyCode(38, [ 'up' ]);
locale.bindKeyCode(39, [ 'right' ]);
locale.bindKeyCode(40, [ 'down' ]);
locale.bindKeyCode(41, [ 'select' ]);
locale.bindKeyCode(42, [ 'printscreen' ]);
locale.bindKeyCode(43, [ 'execute' ]);
locale.bindKeyCode(44, [ 'snapshot' ]);
locale.bindKeyCode(45, [ 'insert', 'ins' ]);
locale.bindKeyCode(46, [ 'delete', 'del' ]);
locale.bindKeyCode(47, [ 'help' ]);
locale.bindKeyCode(91, [ 'command', 'windows', 'win', 'super', 'leftcommand', 'leftwindows', 'leftwin', 'leftsuper' ]);
locale.bindKeyCode(92, [ 'command', 'windows', 'win', 'super', 'rightcommand', 'rightwindows', 'rightwin', 'rightsuper' ]);
locale.bindKeyCode(145, [ 'scrolllock', 'scroll' ]);
locale.bindKeyCode(186, [ 'semicolon', ';' ]);
locale.bindKeyCode(187, [ 'equal', 'equalsign', '=' ]);
locale.bindKeyCode(188, [ 'comma', ',' ]);
locale.bindKeyCode(189, [ 'dash', '-' ]);
locale.bindKeyCode(190, [ 'period', '.' ]);
locale.bindKeyCode(191, [ 'slash', 'forwardslash', '/' ]);
locale.bindKeyCode(192, [ 'graveaccent', '`' ]);
locale.bindKeyCode(219, [ 'openbracket', '[' ]);
locale.bindKeyCode(220, [ 'backslash', '\\' ]);
locale.bindKeyCode(221, [ 'closebracket', ']' ]);
locale.bindKeyCode(222, [ 'apostrophe', '\'' ]);

// 0-9
locale.bindKeyCode(48, [ 'zero', '0' ]);
locale.bindKeyCode(49, [ 'one', '1' ]);
locale.bindKeyCode(50, [ 'two', '2' ]);
locale.bindKeyCode(51, [ 'three', '3' ]);
locale.bindKeyCode(52, [ 'four', '4' ]);
locale.bindKeyCode(53, [ 'five', '5' ]);
locale.bindKeyCode(54, [ 'six', '6' ]);
locale.bindKeyCode(55, [ 'seven', '7' ]);
locale.bindKeyCode(56, [ 'eight', '8' ]);
locale.bindKeyCode(57, [ 'nine', '9' ]);

// numpad
locale.bindKeyCode(96, [ 'numzero', 'num0' ]);
locale.bindKeyCode(97, [ 'numone', 'num1' ]);
locale.bindKeyCode(98, [ 'numtwo', 'num2' ]);
locale.bindKeyCode(99, [ 'numthree', 'num3' ]);
locale.bindKeyCode(100, [ 'numfour', 'num4' ]);
locale.bindKeyCode(101, [ 'numfive', 'num5' ]);
locale.bindKeyCode(102, [ 'numsix', 'num6' ]);
locale.bindKeyCode(103, [ 'numseven', 'num7' ]);
locale.bindKeyCode(104, [ 'numeight', 'num8' ]);
locale.bindKeyCode(105, [ 'numnine', 'num9' ]);
locale.bindKeyCode(106, [ 'nummultiply', 'num*' ]);
locale.bindKeyCode(107, [ 'numadd', 'num+' ]);
locale.bindKeyCode(108, [ 'numenter' ]);
locale.bindKeyCode(109, [ 'numsubtract', 'num-' ]);
locale.bindKeyCode(110, [ 'numdecimal', 'num.' ]);
locale.bindKeyCode(111, [ 'numdivide', 'num/' ]);
locale.bindKeyCode(144, [ 'numlock', 'num' ]);

// function keys
locale.bindKeyCode(112, [ 'f1' ]);
locale.bindKeyCode(113, [ 'f2' ]);
locale.bindKeyCode(114, [ 'f3' ]);
locale.bindKeyCode(115, [ 'f4' ]);
locale.bindKeyCode(116, [ 'f5' ]);
locale.bindKeyCode(117, [ 'f6' ]);
locale.bindKeyCode(118, [ 'f7' ]);
locale.bindKeyCode(119, [ 'f8' ]);
locale.bindKeyCode(120, [ 'f9' ]);
locale.bindKeyCode(121, [ 'f10' ]);
locale.bindKeyCode(122, [ 'f11' ]);
locale.bindKeyCode(123, [ 'f12' ]);

// secondary key symbols
locale.bindMacro('shift + `', [ 'tilde', '~' ]);
locale.bindMacro('shift + 1', [ 'exclamation', 'exclamationpoint', '!' ]);
locale.bindMacro('shift + 2', [ 'at', '@' ]);
locale.bindMacro('shift + 3', [ 'number', '#' ]);
locale.bindMacro('shift + 4', [ 'dollar', 'dollars', 'dollarsign', '$' ]);
locale.bindMacro('shift + 5', [ 'percent', '%' ]);
locale.bindMacro('shift + 6', [ 'caret', '^' ]);
locale.bindMacro('shift + 7', [ 'ampersand', 'and', '&' ]);
locale.bindMacro('shift + 8', [ 'asterisk', '*' ]);
locale.bindMacro('shift + 9', [ 'openparen', '(' ]);
locale.bindMacro('shift + 0', [ 'closeparen', ')' ]);
locale.bindMacro('shift + -', [ 'underscore', '_' ]);
locale.bindMacro('shift + =', [ 'plus', '+' ]);
locale.bindMacro('shift + [', [ 'opencurlybrace', 'opencurlybracket', '{' ]);
locale.bindMacro('shift + ]', [ 'closecurlybrace', 'closecurlybracket', '}' ]);
locale.bindMacro('shift + \\', [ 'verticalbar', '|' ]);
locale.bindMacro('shift + ;', [ 'colon', ':' ]);
locale.bindMacro('shift + \'', [ 'quotationmark', '\'' ]);
locale.bindMacro('shift + !,', [ 'openanglebracket', '<' ]);
locale.bindMacro('shift + .', [ 'closeanglebracket', '>' ]);
locale.bindMacro('shift + /', [ 'questionmark', '?' ]);

//a-z and A-Z
for (var keyCode = 65; keyCode <= 90; keyCode += 1) {
  var keyName = String.fromCharCode(keyCode + 32);
  var capitalKeyName = String.fromCharCode(keyCode);
	locale.bindKeyCode(keyCode, keyName);
	locale.bindMacro('shift + ' + keyName, capitalKeyName);
	locale.bindMacro('capslock + ' + keyName, capitalKeyName);
}


module.exports = locale;

},{"../lib/locale":4}],6:[function(require,module,exports){


// libs
var GuardError = require('./lib/guard-error');
var guard = require('./lib/guard');


exports = module.exports = function(    ) {
  return guard.check.apply(guard, arguments);
};
exports.GuardError = GuardError;
exports.guard = guard;
exports.types = guard.types;

},{"./lib/guard":8,"./lib/guard-error":7}],7:[function(require,module,exports){

// modules
var inherits = require('inherits');


function GuardError(message, fileName, lineNumber) {
  Error.call(this, message, fileName, lineNumber);

  this.message = message;
  this.name = this.constructor.name;
  if (fileName) { this.fileName = fileName; }
  if (lineNumber) { this.lineNumber = lineNumber; }

  Error.captureStackTrace(this, this.constructor);
  this._setStackOffset(1);
}
inherits(GuardError, Error);

GuardError.prototype._setStackOffset = function(stackOffset) {
  try {
    throw new Error();
  } catch(dummyErr) {
    var firstLine = this.stack.split('\n')[0];
    var lines = dummyErr.stack.split('\n');
    var line = lines[stackOffset + 2];
    var lineChunks = line.match(/\(([^\)]+)\)/)[1].split(':');
    this.stack = [firstLine].concat(lines.slice(stackOffset + 2)).join('\n');
    this.fileName = lineChunks[0];
    this.lineNumber = lineChunks[1];
    this.columnNumber = lineChunks[2];
  }
};


module.exports = GuardError;

},{"inherits":9}],8:[function(require,module,exports){

// libs
var GuardError = require('./guard-error');


exports.types = [
  'object',
  'string',
  'boolean',
  'number',
  'array',
  'regexp',
  'date',
  'stream',
  'read-stream',
  'write-stream',
  'emitter',
  'function',
  'null',
  'undefined'
];

exports.check = function(key, val, type) {
  var self = this;

  if (typeof key !== 'string') {
    throw new TypeError('key must be a string');
  }
  if (typeof type !== 'string' && (
    type === null ||
    typeof type !== 'object' ||
    typeof type.length !== 'number'
  )) {
    throw new TypeError('type must be a string or array');
  }

  var typeErr = self._validateType(type);
  if (typeErr) {
    typeErr._setStackOffset(self._stackOffset);
    throw typeErr;
  }

  var valErr = self._validateVal(key, type, val);
  if (valErr) {
    valErr._setStackOffset(self._stackOffset);
    throw valErr;
  }

  return null;
};

exports._validateType = function(type) {
  var self = this;

  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    for (var i = 0; i < type.length; i += 1) {
      var err = self._validateType(type[i]);
      if (err) { return err; }
    }
    return null;
  }
  if (self.types.indexOf(type) === -1) {
    return new GuardError(
      'type must be one of the following values: ' + self.types.join(', ')
    );
  }
};

// validates the value against the type
exports._validateVal = function(key, type, val) {
  var self = this;

  // recursive
  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    var ok = false;
    for (var i = 0; i < type.length; i += 1) {
      if (!self._validateVal(key, type[i], val)) {
        ok = true;
        break;
      }
    }
    if (ok) {
      return null;
    } else {
      return new GuardError(
        key + ' must be one of the following types: ' + type.join(', ')
      );
    }
  }

  // object
  if (type === 'object' && (
    val === null ||
    typeof val !== 'object'
  )) {
    return new GuardError(key + ' must be an object');
  }

  // string
  else if (type === 'string' && typeof val !== 'string') {
    return new GuardError(key + ' must be a string');
  }

  // boolean
  else if (type === 'boolean' && typeof val !== 'boolean') {
    return new GuardError(key + ' must be a boolean');
  }

  // number
  else if (type === 'number' && typeof val !== 'number') {
    return new GuardError(key + ' must be a number');
  }

  // array
  else if (type === 'array' && (
    val === null ||
    typeof val !== 'object' ||
    typeof val.length !== 'number'
  )) {
    return new GuardError(key + ' must be an array');
  }

  // regex
  else if (type === 'regexp' && val.constructor !== RegExp) {
    return new GuardError(key + ' must be a regexp');
  }

  // date
  else if (type === 'date' && val.constructor !== Date) {
    return new GuardError(key + ' must be a date');
  }

  // emitter
  else if (type === 'emitter' && (
    typeof val.addListener !== 'function' ||
    typeof val.emit !== 'function'
  )) {
    return new GuardError(key + ' must be an emitter');
  }

  // stream
  else if (type === 'stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function'
  )) {
    return new GuardError(key + ' must be a stream');
  }

  // read stream
  else if (type === 'read-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.read !== 'function'
  )) {
    return new GuardError(key + ' must be a read-stream');
  }

  // write stream
  else if (type === 'write-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.write !== 'function' ||
    typeof val.end !== 'function'
  )) {
    return new GuardError(key + ' must be a write-stream');
  }

  // function
  else if (type === 'function' && typeof val !== 'function') {
    return new GuardError(key + ' must be a function');
  }

  // null
  else if (type === 'null' && val !== null) {
    return new GuardError(key + ' must be a null');
  }

  // undefined
  else if (type === 'undefined' && val !== undefined) {
    return new GuardError(key + ' must be a undefined');
  }

  return null;
};

exports._stackOffset = 2;


},{"./guard-error":7}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyIsIm5vZGVfbW9kdWxlcy90eXBlLWd1YXJkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLWVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLy8gbGlic1xudmFyIEtleWJvYXJkSlMgPSByZXF1aXJlKCcuL2xpYi9rZXlib2FyZCcpO1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbGliL2xvY2FsZScpO1xudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9saWIva2V5LWNvbWJvJyk7XG52YXIgdXNMb2NhbGUgPSByZXF1aXJlKCcuL2xvY2FsZXMvdXMnKTtcblxudmFyIGtleWJvYXJkSlMgPSBuZXcgS2V5Ym9hcmRKUygpO1xua2V5Ym9hcmRKUy5zZXRMb2NhbGUodXNMb2NhbGUpO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBrZXlib2FyZEpTO1xuZXhwb3J0cy5LZXlib2FyZEpTID0gS2V5Ym9hcmRKUztcbmV4cG9ydHMuTG9jYWxlID0gTG9jYWxlO1xuZXhwb3J0cy5LZXlDb21ibyA9IEtleUNvbWJvO1xuIiwiXG4vLyBtb2R1bGVzXG52YXIgZ3VhcmQgPSByZXF1aXJlKCd0eXBlLWd1YXJkJyk7XG5cblxuZnVuY3Rpb24gS2V5Q29tYm8oa2V5Q29tYm9TdHIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb21ib1N0cicsIGtleUNvbWJvU3RyLCAnc3RyaW5nJyk7XG5cbiAgc2VsZi5zb3VyY2VTdHIgPSBrZXlDb21ib1N0cjtcbiAgc2VsZi5zdWJDb21ib3MgPSBLZXlDb21iby5wYXJzZUNvbWJvU3RyKGtleUNvbWJvU3RyKTtcbiAgc2VsZi5rZXlOYW1lcyA9IHNlbGYuc3ViQ29tYm9zLnJlZHVjZShmdW5jdGlvbihtZW1vLCBuZXh0U3ViQ29tYm8pIHtcbiAgICByZXR1cm4gbWVtby5jb25jYXQobmV4dFN1YkNvbWJvKTtcbiAgfSk7XG59XG5cbktleUNvbWJvLnNlcXVlbmNlRGVsaW1pbmF0b3IgPSAnPj4nO1xuS2V5Q29tYm8uY29tYm9EZWxpbWluYXRvciA9ICc+JztcbktleUNvbWJvLmtleURlbGltaW5hdG9yID0gJysnO1xuXG5LZXlDb21iby5wYXJzZUNvbWJvU3RyID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIpIHtcbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcblxuICB2YXIgc3ViQ29tYm9TdHJzID0gS2V5Q29tYm8uX3NwbGl0U3RyKGtleUNvbWJvU3RyLCBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yKTtcbiAgdmFyIGNvbWJvID0gW107XG4gIGZvciAodmFyIGkgPSAwIDsgaSA8IHN1YkNvbWJvU3Rycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbWJvLnB1c2goS2V5Q29tYm8uX3NwbGl0U3RyKHN1YkNvbWJvU3Ryc1tpXSwgS2V5Q29tYm8ua2V5RGVsaW1pbmF0b3IpKTtcbiAgfVxuICByZXR1cm4gY29tYm87XG59O1xuXG5LZXlDb21iby5fc3BsaXRTdHIgPSBmdW5jdGlvbihzdHIsIGRlbGltaW5hdG9yKSB7XG4gIHZhciBzID0gc3RyO1xuICB2YXIgZCA9IGRlbGltaW5hdG9yO1xuICB2YXIgYyA9ICcnO1xuICB2YXIgY2EgPSBbXTtcblxuICBmb3IgKHZhciBjaSA9IDA7IGNpIDwgcy5sZW5ndGg7IGNpICs9IDEpIHtcbiAgICBpZiAoY2kgPiAwICYmIHNbY2ldID09PSBkICYmIHNbY2kgLSAxXSAhPT0gJ1xcXFwnKSB7XG4gICAgICBjYS5wdXNoKGMudHJpbSgpKTtcbiAgICAgIGMgPSAnJztcbiAgICAgIGNpICs9IDE7XG4gICAgfVxuICAgIGMgKz0gc1tjaV07XG4gIH1cbiAgaWYgKGMpIHsgY2EucHVzaChjLnRyaW0oKSk7IH1cblxuICByZXR1cm4gY2E7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbihwcmVzc2VkS2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdwcmVzc2VkS2V5TmFtZXMnLCBwcmVzc2VkS2V5TmFtZXMsICdhcnJheScpO1xuXG4gIHZhciBzdGFydGluZ0tleU5hbWVJbmRleCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBzdGFydGluZ0tleU5hbWVJbmRleCA9IHNlbGYuX2NoZWNrU3ViQ29tYm8oXG4gICAgICBzZWxmLnN1YkNvbWJvc1tpXSxcbiAgICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICAgICAgcHJlc3NlZEtleU5hbWVzXG4gICAgKTtcbiAgICBpZiAoc3RhcnRpbmdLZXlOYW1lSW5kZXggPT09IC0xKSB7IHJldHVybiBmYWxzZTsgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuS2V5Q29tYm8ucHJvdG90eXBlLmlzRXF1YWwgPSBmdW5jdGlvbihvdGhlcktleUNvbWJvKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgnb3RoZXJLZXlDb21ibycsIG90aGVyS2V5Q29tYm8sIFsgJ29iamVjdCcsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Ygb3RoZXJLZXlDb21ibyA9PT0gJ3N0cmluZycpIHtcbiAgICBvdGhlcktleUNvbWJvID0gbmV3IEtleUNvbWJvKG90aGVyS2V5Q29tYm8pO1xuICB9IGVsc2Uge1xuICAgIGd1YXJkKCdvdGhlcktleUNvbWJvLnN1YkNvbWJvcycsIG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLCAnYXJyYXknKTtcbiAgfVxuXG4gIGlmIChzZWxmLnN1YkNvbWJvcy5sZW5ndGggIT09IG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHNlbGYuc3ViQ29tYm9zW2ldLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBzdWJDb21ibyA9IHNlbGYuc3ViQ29tYm9zW2ldO1xuICAgIHZhciBvdGhlclN1YkNvbWJvID0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0uc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdWJDb21iby5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgdmFyIGtleU5hbWUgPSBzdWJDb21ib1tqXTtcbiAgICAgIHZhciBpbmRleCA9IG90aGVyU3ViQ29tYm8uaW5kZXhPZihrZXlOYW1lKTtcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIG90aGVyU3ViQ29tYm8uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG90aGVyU3ViQ29tYm8ubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuX2NoZWNrU3ViQ29tYm8gPSBmdW5jdGlvbihcbiAgc3ViQ29tYm8sXG4gIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICBwcmVzc2VkS2V5TmFtZXNcbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ3N1YkNvbWJvJywgc3ViQ29tYm8sICdhcnJheScpO1xuICBndWFyZCgnc3RhcnRpbmdLZXlOYW1lSW5kZXgnLCBzdGFydGluZ0tleU5hbWVJbmRleCwgJ251bWJlcicpO1xuICBndWFyZCgncHJlc3NlZEtleU5hbWVzJywgcHJlc3NlZEtleU5hbWVzLCAnYXJyYXknKTtcblxuICBzdWJDb21ibyA9IHN1YkNvbWJvLnNsaWNlKDApO1xuICBwcmVzc2VkS2V5TmFtZXMgPSBwcmVzc2VkS2V5TmFtZXMuc2xpY2Uoc3RhcnRpbmdLZXlOYW1lSW5kZXgpO1xuXG4gIHZhciBlbmRJbmRleCA9IHN0YXJ0aW5nS2V5TmFtZUluZGV4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YkNvbWJvLmxlbmd0aDsgaSArPSAxKSB7XG5cbiAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2ldO1xuICAgIGlmIChrZXlOYW1lWzBdID09PSAnXFxcXCcpIHtcbiAgICAgIHZhciBlc2NhcGVkS2V5TmFtZSA9IGtleU5hbWUuc2xpY2UoMSk7XG4gICAgICBpZiAoXG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yIHx8XG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5rZXlEZWxpbWluYXRvclxuICAgICAgKSB7XG4gICAgICAgIGtleU5hbWUgPSBlc2NhcGVkS2V5TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBwcmVzc2VkS2V5TmFtZXMuaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgc3ViQ29tYm8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgICAgaWYgKGluZGV4ID4gZW5kSW5kZXgpIHtcbiAgICAgICAgZW5kSW5kZXggPSBpbmRleDtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJDb21iby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVuZEluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Q29tYm87XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuLy8gbGlic1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIEtleWJvYXJkSlModGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgndGFyZ2V0V2luZG93JywgdGFyZ2V0V2luZG93LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcblxuICBzZWxmLmxvY2FsZSA9IG51bGw7XG4gIHNlbGYuX2xpc3RlbmVycyA9IFtdO1xuICBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzID0gW107XG4gIHNlbGYuX2xvY2FsZXMgPSB7fTtcbiAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuXG4gIHNlbGYud2F0Y2goKTtcbn1cblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxlTmFtZSwgbG9jYWxlQnVpbGRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGxvY2FsZSA9IG51bGw7XG4gIGlmICh0eXBlb2YgbG9jYWxlTmFtZSA9PT0gJ3N0cmluZycpIHtcblxuICAgIGd1YXJkKCdsb2NhbGVOYW1lJywgbG9jYWxlTmFtZSwgWyAnc3RyaW5nJywgJ251bGwnIF0pO1xuICAgIGd1YXJkKCdsb2NhbGVCdWlsZGVyJywgbG9jYWxlQnVpbGRlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcblxuICAgIGlmIChsb2NhbGVCdWlsZGVyKSB7XG4gICAgICBsb2NhbGUgPSBuZXcgTG9jYWxlKGxvY2FsZU5hbWUpO1xuICAgICAgbG9jYWxlQnVpbGRlcihsb2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbGUgPSBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuXG4gICAgZ3VhcmQoJ2xvY2FsZScsIGxvY2FsZU5hbWUsICdvYmplY3QnKTtcbiAgICBndWFyZCgnbG9jYWxlLmxvY2FsZU5hbWUnLCBsb2NhbGVOYW1lLmxvY2FsZU5hbWUsICdzdHJpbmcnKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzS2V5JywgbG9jYWxlTmFtZS5wcmVzc0tleSwgJ2Z1bmN0aW9uJyk7XG4gICAgZ3VhcmQoJ2xvY2FsZS5yZWxlYXNlS2V5JywgbG9jYWxlTmFtZS5yZWxlYXNlS2V5LCAnZnVuY3Rpb24nKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzZWRLZXlzJywgbG9jYWxlTmFtZS5wcmVzc2VkS2V5cywgJ2FycmF5Jyk7XG5cbiAgICBsb2NhbGUgPSBsb2NhbGVOYW1lO1xuICAgIGxvY2FsZU5hbWUgPSBsb2NhbGUubG9jYWxlTmFtZTtcbiAgfVxuXG4gIHNlbGYubG9jYWxlID0gbG9jYWxlO1xuICBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdID0gbG9jYWxlO1xuICBpZiAobG9jYWxlKSB7XG4gICAgc2VsZi5sb2NhbGUucHJlc3NlZEtleXMgPSBsb2NhbGUucHJlc3NlZEtleXM7XG4gIH1cbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnByZXNzS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSwgZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgWyAnbnVtYmVyJywgJ3N0cmluZycgXSk7XG4gIGd1YXJkKCdldmVudCcsIGV2ZW50LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcblxuICBzZWxmLmxvY2FsZS5wcmVzc0tleShrZXlDb2RlKTtcbiAgc2VsZi5fYXBwbHlCaW5kaW5ncyhldmVudCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSwgZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgWyAnbnVtYmVyJywgJ3N0cmluZycgXSk7XG4gIGd1YXJkKCdldmVudCcsIGV2ZW50LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcblxuICBzZWxmLmxvY2FsZS5yZWxlYXNlS2V5KGtleUNvZGUpO1xuICBzZWxmLl9jbGVhckJpbmRpbmdzKGV2ZW50KTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnJlbGVhc2VBbGxLZXlzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5sb2NhbGUucHJlc3NlZEtleXMubGVuZ3RoID0gMDtcbiAgc2VsZi5fY2xlYXJCaW5kaW5ncygpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgWyAnc3RyaW5nJywgJ2FycmF5JyBdKTtcbiAgZ3VhcmQoJ3ByZXNzSGFuZGxlcicsIHByZXNzSGFuZGxlciwgJ2Z1bmN0aW9uJyk7XG4gIGd1YXJkKCdyZWxlYXNlSGFuZGxlcicsIHJlbGVhc2VIYW5kbGVyLCBbICdmdW5jdGlvbicsICd1bmRlZmluZWQnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VsZi5fbGlzdGVuZXJzLnB1c2goe1xuICAgICAga2V5Q29tYm86IG5ldyBLZXlDb21ibyhrZXlDb21ib1N0ciksXG4gICAgICBwcmVzc0hhbmRsZXI6IHByZXNzSGFuZGxlcixcbiAgICAgIHJlbGVhc2VIYW5kbGVyOiByZWxlYXNlSGFuZGxlciB8fCBudWxsXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb21ib1N0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5iaW5kKGtleUNvbWJvU3RyW2ldLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKTtcbiAgICB9XG4gIH1cbn07XG5LZXlib2FyZEpTLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEtleWJvYXJkSlMucHJvdG90eXBlLmJpbmQ7XG5LZXlib2FyZEpTLnByb3RvdHlwZS5vbiA9IEtleWJvYXJkSlMucHJvdG90eXBlLmJpbmQ7XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgWyAnc3RyaW5nJywgJ2FycmF5JyBdKTtcbiAgZ3VhcmQoJ3ByZXNzSGFuZGxlcicsIHByZXNzSGFuZGxlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcbiAgZ3VhcmQoJ3JlbGVhc2VIYW5kbGVyJywgcmVsZWFzZUhhbmRsZXIsIFsgJ2Z1bmN0aW9uJywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb21ib1N0ciA9PT0gJ3N0cmluZycpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2xpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIGxpc3RlbmVyID0gc2VsZi5fbGlzdGVuZXJzW2ldO1xuXG4gICAgICB2YXIgY29tYm9NYXRjaGVzID0gbGlzdGVuZXIua2V5Q29tYm8uaXNFcXVhbChrZXlDb21ib1N0cik7XG4gICAgICB2YXIgcHJlc3NIYW5kbGVyTWF0Y2hlcyA9ICFwcmVzc0hhbmRsZXIgfHxcbiAgICAgICAgcHJlc3NIYW5kbGVyID09PSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG4gICAgICB2YXIgcmVsZWFzZUhhbmRsZXJNYXRjaGVzID0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXIgPT09IG51bGwgfHxcbiAgICAgICAgcmVsZWFzZUhhbmRsZXIgPT09IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyO1xuXG4gICAgICBpZiAoY29tYm9NYXRjaGVzICYmIHByZXNzSGFuZGxlck1hdGNoZXMgJiYgcmVsZWFzZUhhbmRsZXJNYXRjaGVzKSB7XG4gICAgICAgIHNlbGYuX2xpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGkgLT0gMTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb21ib1N0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5iaW5kKGtleUNvbWJvU3RyW2ldLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKTtcbiAgICB9XG4gIH1cbn07XG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcbktleWJvYXJkSlMucHJvdG90eXBlLm9mZiA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbih0YXJnZXREb2N1bWVudCwgdGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLnN0b3AoKTtcblxuICBndWFyZCgndGFyZ2V0RG9jdW1lbnQnLCB0YXJnZXREb2N1bWVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG4gIGd1YXJkKCd0YXJnZXRXaW5kb3cnLCB0YXJnZXRXaW5kb3csIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIGlmICh0YXJnZXREb2N1bWVudCAmJiB0YXJnZXREb2N1bWVudC5kb2N1bWVudCAmJiAhdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmICghdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gZ2xvYmFsLndpbmRvdztcbiAgfVxuICBpZiAodGFyZ2V0V2luZG93ICYmICF0YXJnZXREb2N1bWVudCkge1xuICAgIHRhcmdldERvY3VtZW50ID0gdGFyZ2V0V2luZG93LmRvY3VtZW50O1xuICB9XG5cbiAgaWYgKHRhcmdldERvY3VtZW50ICYmIHRhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA9ICEhdGFyZ2V0V2luZG93LmFkZEV2ZW50TGlzdGVuZXI7XG5cbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG5cbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IHRhcmdldERvY3VtZW50O1xuICAgIHNlbGYuX3RhcmdldFdpbmRvdyA9IHRhcmdldFdpbmRvdztcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl90YXJnZXREb2N1bWVudCkge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBzZWxmLnByZXNzS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXREb2N1bWVudCwgJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICB9XG4gIGlmIChzZWxmLl90YXJnZXRXaW5kb3cpIHtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdmb2N1cycsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0V2luZG93LCAnYmx1cicsIHNlbGYucmVsZWFzZUFsbEtleXMuYmluZChzZWxmKSk7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gbnVsbDtcbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlbGVhc2VBbGxLZXlzKCk7XG4gIHNlbGYuX2xpc3RlbmVycy5sZW5ndGggPSAwO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2JpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSkgOlxuICAgIHRhcmdldEVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGVyKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl91bmJpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSk6XG4gICAgdGFyZ2V0RWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2FwcGx5QmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHByZXNzZWRLZXlzID0gc2VsZi5sb2NhbGUucHJlc3NlZEtleXMuc2xpY2UoMCk7XG4gIHZhciBsaXN0ZW5lcnMgPSBzZWxmLl9saXN0ZW5lcnMuc2xpY2UoMCkuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEua2V5TmFtZXMubGVuZ3RoID4gYi5rZXlOYW1lcy5sZW5ndGg7XG4gIH0pO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IGxpc3RlbmVyLmtleUNvbWJvO1xuICAgIHZhciBoYW5kbGVyID0gbGlzdGVuZXIucHJlc3NIYW5kbGVyO1xuICAgIGlmIChrZXlDb21iby5jaGVjayhwcmVzc2VkS2V5cykpIHtcblxuICAgICAgaGFuZGxlci5hcHBseShzZWxmLCBldmVudCk7XG5cbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gcHJlc3NlZEtleXMuaW5kZXhPZihrZXlDb21iby5rZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICBwcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgIGogLT0gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobGlzdGVuZXIucmVsZWFzZUhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT09IC0xKSB7XG4gICAgICAgICAgc2VsZi5fYXBwbGllZExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2NsZWFyQmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5fYXBwbGllZExpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lciA9IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnNbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbGlzdGVuZXIua2V5Q29tYm87XG4gICAgdmFyIGhhbmRsZXIgPSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcjtcbiAgICBpZiAoIWtleUNvbWJvLmNoZWNrKHNlbGYubG9jYWxlLnByZXNzZWRLZXlzKSkge1xuICAgICAgaGFuZGxlci5hcHBseShzZWxmLCBldmVudCk7XG4gICAgICBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIGkgLT0gMTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRKUztcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXG4vLyBtb2R1bGVzXG52YXIgZ3VhcmQgPSByZXF1aXJlKCd0eXBlLWd1YXJkJyk7XG5cbi8vIGxpYnNcbnZhciBLZXlDb21ibyA9IHJlcXVpcmUoJy4va2V5LWNvbWJvJyk7XG5cblxuZnVuY3Rpb24gTG9jYWxlKG5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCduYW1lJywgbmFtZSwgJ3N0cmluZycpO1xuXG4gIHNlbGYubG9jYWxlTmFtZSA9IG5hbWU7XG4gIHNlbGYucHJlc3NlZEtleXMgPSBbXTtcbiAgc2VsZi5fYXBwbGllZE1hY3JvcyA9IFtdO1xuICBzZWxmLl9rZXlNYXAgPSB7fTtcbiAgc2VsZi5fbWFjcm9zID0gW107XG59XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZEtleUNvZGUgPSBmdW5jdGlvbihrZXlDb2RlLCBrZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCAnbnVtYmVyJyk7XG4gIGd1YXJkKCdrZXlOYW1lcycsIGtleU5hbWVzLCBbICdhcnJheScsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5TmFtZXMgPT09ICdzdHJpbmcnKSB7XG4gICAga2V5TmFtZXMgPSBba2V5TmFtZXNdO1xuICB9XG5cbiAgc2VsZi5fa2V5TWFwW2tleUNvZGVdID0ga2V5TmFtZXM7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmJpbmRNYWNybyA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBrZXlOYW1lcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcbiAgZ3VhcmQoJ2tleU5hbWVzJywga2V5TmFtZXMsIFsgJ2Z1bmN0aW9uJywgJ3N0cmluZycsICdhcnJheScgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFsga2V5TmFtZXMgXTtcbiAgfVxuXG4gIHZhciBtYWNybyA9IHtcbiAgICBrZXlDb21ibzogbmV3IEtleUNvbWJvKGtleUNvbWJvU3RyKSxcbiAgICBrZXlOYW1lczogbnVsbCxcbiAgICBoYW5kbGVyOiBudWxsXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG1hY3JvLmhhbmRsZXIgPSBrZXlOYW1lcztcbiAgfSBlbHNlIHtcbiAgICBtYWNyby5rZXlOYW1lcyA9IGtleU5hbWVzO1xuICB9XG5cbiAgc2VsZi5fbWFjcm9zLnB1c2gobWFjcm8pO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlDb2RlcyA9IGZ1bmN0aW9uKGtleU5hbWUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlOYW1lJywga2V5TmFtZSwgJ3N0cmluZycpO1xuXG4gIHZhciBrZXlDb2RlcyA9IFtdO1xuICBmb3IgKHZhciBrZXlDb2RlIGluIHNlbGYuX2tleU1hcCkge1xuICAgIHZhciBpbmRleCA9IHNlbGYuX2tleU1hcFtrZXlDb2RlXS5pbmRleE9mKGtleU5hbWUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7IGtleUNvZGVzLnB1c2goa2V5Q29kZXwwKTsgfVxuICB9XG4gIHJldHVybiBrZXlDb2Rlcztcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuZ2V0S2V5TmFtZXMgPSBmdW5jdGlvbihrZXlDb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsICdudW1iZXInKTtcblxuICByZXR1cm4gc2VsZi5fa2V5TWFwW2tleUNvZGVdIHx8IFtdO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5wcmVzc0tleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgWyAnbnVtYmVyJywgJ3N0cmluZycgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb2RlID09PSAnc3RyaW5nJykge1xuICAgIHZhciBrZXlDb2RlcyA9IHNlbGYuZ2V0S2V5Q29kZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5wcmVzc0tleShrZXlDb2Rlc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgdmFyIGtleU5hbWVzID0gc2VsZi5nZXRLZXlOYW1lcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleU5hbWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBpZiAoc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2ldKSA9PT0gLTEpIHtcbiAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5wdXNoKGtleU5hbWVzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxmLl9hcHBseU1hY3JvcygpO1xuICB9XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLnJlbGVhc2VLZXkgPSBmdW5jdGlvbihrZXlDb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIga2V5Q29kZXMgPSBzZWxmLmdldEtleUNvZGVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYucmVsZWFzZUtleShrZXlDb2Rlc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgZWxzZSB7XG4gICAgdmFyIGtleU5hbWVzID0gc2VsZi5nZXRLZXlOYW1lcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleU5hbWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgaW5kZXggPSBzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pO1xuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGYuX2NsZWFyTWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuX2FwcGx5TWFjcm9zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgbWFjcm9zID0gc2VsZi5fbWFjcm9zLnNsaWNlKDApO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG1hY3Jvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBtYWNybyA9IG1hY3Jvc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBtYWNyby5rZXlDb21ibztcbiAgICB2YXIga2V5TmFtZXMgPSBtYWNyby5rZXlOYW1lcztcbiAgICBpZiAoa2V5Q29tYm8uY2hlY2soc2VsZi5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgaWYgKHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tqXSkgPT09IC0xKSB7XG4gICAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5wdXNoKGtleU5hbWVzW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc2VsZi5fYXBwbGllZE1hY3Jvcy5wdXNoKG1hY3JvKTtcbiAgICB9XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuX2NsZWFyTWFjcm9zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2FwcGxpZWRNYWNyb3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbWFjcm8gPSBzZWxmLl9hcHBsaWVkTWFjcm9zW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IG1hY3JvLmtleUNvbWJvO1xuICAgIHZhciBrZXlOYW1lcyA9IG1hY3JvLmtleU5hbWVzO1xuICAgIGlmICgha2V5Q29tYm8uY2hlY2soc2VsZi5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5TmFtZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2pdKTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICBzZWxmLnByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGYuX2FwcGxpZWRNYWNyb3Muc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZTtcbiIsIlxuLy8gbW9kdWxlc1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4uL2xpYi9sb2NhbGUnKTtcblxuXG4vLyBjcmVhdGUgdGhlIGxvY2FsZVxudmFyIGxvY2FsZSA9IG5ldyBMb2NhbGUoJ3VzJyk7XG5cbi8vIGdlbmVyYWxcbmxvY2FsZS5iaW5kS2V5Q29kZSgzLCBbICdjYW5jZWwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDgsIFsgJ2JhY2tzcGFjZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOSwgWyAndGFiJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMiwgWyAnY2xlYXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEzLCBbICdlbnRlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTYsIFsgJ3NoaWZ0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNywgWyAnY3RybCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTgsIFsgJ2FsdCcsICdtZW51JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOSwgWyAncGF1c2UnLCAnYnJlYWsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIwLCBbICdjYXBzbG9jaycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjcsIFsgJ2VzY2FwZScsICdlc2MnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDMyLCBbICdzcGFjZScsICdzcGFjZWJhcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzMsIFsgJ3BhZ2V1cCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzQsIFsgJ3BhZ2Vkb3duJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNSwgWyAnZW5kJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzNiwgWyAnaG9tZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzcsIFsgJ2xlZnQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM4LCBbICd1cCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzksIFsgJ3JpZ2h0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MCwgWyAnZG93bicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDEsIFsgJ3NlbGVjdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDIsIFsgJ3ByaW50c2NyZWVuJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0MywgWyAnZXhlY3V0ZScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDQsIFsgJ3NuYXBzaG90JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NSwgWyAnaW5zZXJ0JywgJ2lucycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDYsIFsgJ2RlbGV0ZScsICdkZWwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ3LCBbICdoZWxwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5MSwgWyAnY29tbWFuZCcsICd3aW5kb3dzJywgJ3dpbicsICdzdXBlcicsICdsZWZ0Y29tbWFuZCcsICdsZWZ0d2luZG93cycsICdsZWZ0d2luJywgJ2xlZnRzdXBlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTIsIFsgJ2NvbW1hbmQnLCAnd2luZG93cycsICd3aW4nLCAnc3VwZXInLCAncmlnaHRjb21tYW5kJywgJ3JpZ2h0d2luZG93cycsICdyaWdodHdpbicsICdyaWdodHN1cGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNDUsIFsgJ3Njcm9sbGxvY2snLCAnc2Nyb2xsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODYsIFsgJ3NlbWljb2xvbicsICc7JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODcsIFsgJ2VxdWFsJywgJ2VxdWFsc2lnbicsICc9JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODgsIFsgJ2NvbW1hJywgJywnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4OSwgWyAnZGFzaCcsICctJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTAsIFsgJ3BlcmlvZCcsICcuJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTEsIFsgJ3NsYXNoJywgJ2ZvcndhcmRzbGFzaCcsICcvJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxOTIsIFsgJ2dyYXZlYWNjZW50JywgJ2AnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIxOSwgWyAnb3BlbmJyYWNrZXQnLCAnWycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIwLCBbICdiYWNrc2xhc2gnLCAnXFxcXCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIxLCBbICdjbG9zZWJyYWNrZXQnLCAnXScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMjIyLCBbICdhcG9zdHJvcGhlJywgJ1xcJycgXSk7XG5cbi8vIDAtOVxubG9jYWxlLmJpbmRLZXlDb2RlKDQ4LCBbICd6ZXJvJywgJzAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ5LCBbICdvbmUnLCAnMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTAsIFsgJ3R3bycsICcyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1MSwgWyAndGhyZWUnLCAnMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTIsIFsgJ2ZvdXInLCAnNCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTMsIFsgJ2ZpdmUnLCAnNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTQsIFsgJ3NpeCcsICc2JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NSwgWyAnc2V2ZW4nLCAnNycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTYsIFsgJ2VpZ2h0JywgJzgnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU3LCBbICduaW5lJywgJzknIF0pO1xuXG4vLyBudW1wYWRcbmxvY2FsZS5iaW5kS2V5Q29kZSg5NiwgWyAnbnVtemVybycsICdudW0wJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5NywgWyAnbnVtb25lJywgJ251bTEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk4LCBbICdudW10d28nLCAnbnVtMicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTksIFsgJ251bXRocmVlJywgJ251bTMnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMCwgWyAnbnVtZm91cicsICdudW00JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDEsIFsgJ251bWZpdmUnLCAnbnVtNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAyLCBbICdudW1zaXgnLCAnbnVtNicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAzLCBbICdudW1zZXZlbicsICdudW03JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDQsIFsgJ251bWVpZ2h0JywgJ251bTgnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNSwgWyAnbnVtbmluZScsICdudW05JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDYsIFsgJ251bW11bHRpcGx5JywgJ251bSonIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwNywgWyAnbnVtYWRkJywgJ251bSsnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwOCwgWyAnbnVtZW50ZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwOSwgWyAnbnVtc3VidHJhY3QnLCAnbnVtLScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTEwLCBbICdudW1kZWNpbWFsJywgJ251bS4nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExMSwgWyAnbnVtZGl2aWRlJywgJ251bS8nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE0NCwgWyAnbnVtbG9jaycsICdudW0nIF0pO1xuXG4vLyBmdW5jdGlvbiBrZXlzXG5sb2NhbGUuYmluZEtleUNvZGUoMTEyLCBbICdmMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTEzLCBbICdmMicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE0LCBbICdmMycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE1LCBbICdmNCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE2LCBbICdmNScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE3LCBbICdmNicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE4LCBbICdmNycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTE5LCBbICdmOCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIwLCBbICdmOScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIxLCBbICdmMTAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMiwgWyAnZjExJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjMsIFsgJ2YxMicgXSk7XG5cbi8vIHNlY29uZGFyeSBrZXkgc3ltYm9sc1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBgJywgWyAndGlsZGUnLCAnficgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDEnLCBbICdleGNsYW1hdGlvbicsICdleGNsYW1hdGlvbnBvaW50JywgJyEnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAyJywgWyAnYXQnLCAnQCcgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDMnLCBbICdudW1iZXInLCAnIycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDQnLCBbICdkb2xsYXInLCAnZG9sbGFycycsICdkb2xsYXJzaWduJywgJyQnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA1JywgWyAncGVyY2VudCcsICclJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNicsIFsgJ2NhcmV0JywgJ14nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA3JywgWyAnYW1wZXJzYW5kJywgJ2FuZCcsICcmJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgOCcsIFsgJ2FzdGVyaXNrJywgJyonIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA5JywgWyAnb3BlbnBhcmVuJywgJygnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAwJywgWyAnY2xvc2VwYXJlbicsICcpJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLScsIFsgJ3VuZGVyc2NvcmUnLCAnXycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArID0nLCBbICdwbHVzJywgJysnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBbJywgWyAnb3BlbmN1cmx5YnJhY2UnLCAnb3BlbmN1cmx5YnJhY2tldCcsICd7JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXScsIFsgJ2Nsb3NlY3VybHlicmFjZScsICdjbG9zZWN1cmx5YnJhY2tldCcsICd9JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFxcXCcsIFsgJ3ZlcnRpY2FsYmFyJywgJ3wnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA7JywgWyAnY29sb24nLCAnOicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFxcJycsIFsgJ3F1b3RhdGlvbm1hcmsnLCAnXFwnJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgISwnLCBbICdvcGVuYW5nbGVicmFja2V0JywgJzwnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAuJywgWyAnY2xvc2VhbmdsZWJyYWNrZXQnLCAnPicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC8nLCBbICdxdWVzdGlvbm1hcmsnLCAnPycgXSk7XG5cbi8vYS16IGFuZCBBLVpcbmZvciAodmFyIGtleUNvZGUgPSA2NTsga2V5Q29kZSA8PSA5MDsga2V5Q29kZSArPSAxKSB7XG4gIHZhciBrZXlOYW1lID0gU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlICsgMzIpO1xuICB2YXIgY2FwaXRhbEtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpO1xuXHRsb2NhbGUuYmluZEtleUNvZGUoa2V5Q29kZSwga2V5TmFtZSk7XG5cdGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgJyArIGtleU5hbWUsIGNhcGl0YWxLZXlOYW1lKTtcblx0bG9jYWxlLmJpbmRNYWNybygnY2Fwc2xvY2sgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gbG9jYWxlO1xuIiwiXG5cbi8vIGxpYnNcbnZhciBHdWFyZEVycm9yID0gcmVxdWlyZSgnLi9saWIvZ3VhcmQtZXJyb3InKTtcbnZhciBndWFyZCA9IHJlcXVpcmUoJy4vbGliL2d1YXJkJyk7XG5cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oICAgICkge1xuICByZXR1cm4gZ3VhcmQuY2hlY2suYXBwbHkoZ3VhcmQsIGFyZ3VtZW50cyk7XG59O1xuZXhwb3J0cy5HdWFyZEVycm9yID0gR3VhcmRFcnJvcjtcbmV4cG9ydHMuZ3VhcmQgPSBndWFyZDtcbmV4cG9ydHMudHlwZXMgPSBndWFyZC50eXBlcztcbiIsIlxuLy8gbW9kdWxlc1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuXG5mdW5jdGlvbiBHdWFyZEVycm9yKG1lc3NhZ2UsIGZpbGVOYW1lLCBsaW5lTnVtYmVyKSB7XG4gIEVycm9yLmNhbGwodGhpcywgbWVzc2FnZSwgZmlsZU5hbWUsIGxpbmVOdW1iZXIpO1xuXG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcbiAgaWYgKGZpbGVOYW1lKSB7IHRoaXMuZmlsZU5hbWUgPSBmaWxlTmFtZTsgfVxuICBpZiAobGluZU51bWJlcikgeyB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lTnVtYmVyOyB9XG5cbiAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gIHRoaXMuX3NldFN0YWNrT2Zmc2V0KDEpO1xufVxuaW5oZXJpdHMoR3VhcmRFcnJvciwgRXJyb3IpO1xuXG5HdWFyZEVycm9yLnByb3RvdHlwZS5fc2V0U3RhY2tPZmZzZXQgPSBmdW5jdGlvbihzdGFja09mZnNldCkge1xuICB0cnkge1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xuICB9IGNhdGNoKGR1bW15RXJyKSB7XG4gICAgdmFyIGZpcnN0TGluZSA9IHRoaXMuc3RhY2suc3BsaXQoJ1xcbicpWzBdO1xuICAgIHZhciBsaW5lcyA9IGR1bW15RXJyLnN0YWNrLnNwbGl0KCdcXG4nKTtcbiAgICB2YXIgbGluZSA9IGxpbmVzW3N0YWNrT2Zmc2V0ICsgMl07XG4gICAgdmFyIGxpbmVDaHVua3MgPSBsaW5lLm1hdGNoKC9cXCgoW15cXCldKylcXCkvKVsxXS5zcGxpdCgnOicpO1xuICAgIHRoaXMuc3RhY2sgPSBbZmlyc3RMaW5lXS5jb25jYXQobGluZXMuc2xpY2Uoc3RhY2tPZmZzZXQgKyAyKSkuam9pbignXFxuJyk7XG4gICAgdGhpcy5maWxlTmFtZSA9IGxpbmVDaHVua3NbMF07XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZUNodW5rc1sxXTtcbiAgICB0aGlzLmNvbHVtbk51bWJlciA9IGxpbmVDaHVua3NbMl07XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBHdWFyZEVycm9yO1xuIiwiXG4vLyBsaWJzXG52YXIgR3VhcmRFcnJvciA9IHJlcXVpcmUoJy4vZ3VhcmQtZXJyb3InKTtcblxuXG5leHBvcnRzLnR5cGVzID0gW1xuICAnb2JqZWN0JyxcbiAgJ3N0cmluZycsXG4gICdib29sZWFuJyxcbiAgJ251bWJlcicsXG4gICdhcnJheScsXG4gICdyZWdleHAnLFxuICAnZGF0ZScsXG4gICdzdHJlYW0nLFxuICAncmVhZC1zdHJlYW0nLFxuICAnd3JpdGUtc3RyZWFtJyxcbiAgJ2VtaXR0ZXInLFxuICAnZnVuY3Rpb24nLFxuICAnbnVsbCcsXG4gICd1bmRlZmluZWQnXG5dO1xuXG5leHBvcnRzLmNoZWNrID0gZnVuY3Rpb24oa2V5LCB2YWwsIHR5cGUpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2tleSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cbiAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJyAmJiAoXG4gICAgdHlwZSA9PT0gbnVsbCB8fFxuICAgIHR5cGVvZiB0eXBlICE9PSAnb2JqZWN0JyB8fFxuICAgIHR5cGVvZiB0eXBlLmxlbmd0aCAhPT0gJ251bWJlcidcbiAgKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3R5cGUgbXVzdCBiZSBhIHN0cmluZyBvciBhcnJheScpO1xuICB9XG5cbiAgdmFyIHR5cGVFcnIgPSBzZWxmLl92YWxpZGF0ZVR5cGUodHlwZSk7XG4gIGlmICh0eXBlRXJyKSB7XG4gICAgdHlwZUVyci5fc2V0U3RhY2tPZmZzZXQoc2VsZi5fc3RhY2tPZmZzZXQpO1xuICAgIHRocm93IHR5cGVFcnI7XG4gIH1cblxuICB2YXIgdmFsRXJyID0gc2VsZi5fdmFsaWRhdGVWYWwoa2V5LCB0eXBlLCB2YWwpO1xuICBpZiAodmFsRXJyKSB7XG4gICAgdmFsRXJyLl9zZXRTdGFja09mZnNldChzZWxmLl9zdGFja09mZnNldCk7XG4gICAgdGhyb3cgdmFsRXJyO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5leHBvcnRzLl92YWxpZGF0ZVR5cGUgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoXG4gICAgdHlwZSAhPT0gbnVsbCAmJlxuICAgIHR5cGVvZiB0eXBlID09PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiB0eXBlLmxlbmd0aCA9PT0gJ251bWJlcidcbiAgKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB2YXIgZXJyID0gc2VsZi5fdmFsaWRhdGVUeXBlKHR5cGVbaV0pO1xuICAgICAgaWYgKGVycikgeyByZXR1cm4gZXJyOyB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmIChzZWxmLnR5cGVzLmluZGV4T2YodHlwZSkgPT09IC0xKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKFxuICAgICAgJ3R5cGUgbXVzdCBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZyB2YWx1ZXM6ICcgKyBzZWxmLnR5cGVzLmpvaW4oJywgJylcbiAgICApO1xuICB9XG59O1xuXG4vLyB2YWxpZGF0ZXMgdGhlIHZhbHVlIGFnYWluc3QgdGhlIHR5cGVcbmV4cG9ydHMuX3ZhbGlkYXRlVmFsID0gZnVuY3Rpb24oa2V5LCB0eXBlLCB2YWwpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIHJlY3Vyc2l2ZVxuICBpZiAoXG4gICAgdHlwZSAhPT0gbnVsbCAmJlxuICAgIHR5cGVvZiB0eXBlID09PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiB0eXBlLmxlbmd0aCA9PT0gJ251bWJlcidcbiAgKSB7XG4gICAgdmFyIG9rID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0eXBlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBpZiAoIXNlbGYuX3ZhbGlkYXRlVmFsKGtleSwgdHlwZVtpXSwgdmFsKSkge1xuICAgICAgICBvayA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob2spIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3IoXG4gICAgICAgIGtleSArICcgbXVzdCBiZSBvbmUgb2YgdGhlIGZvbGxvd2luZyB0eXBlczogJyArIHR5cGUuam9pbignLCAnKVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBvYmplY3RcbiAgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIChcbiAgICB2YWwgPT09IG51bGwgfHxcbiAgICB0eXBlb2YgdmFsICE9PSAnb2JqZWN0J1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIHN0cmluZ1xuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgdmFsICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuXG4gIC8vIGJvb2xlYW5cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nICYmIHR5cGVvZiB2YWwgIT09ICdib29sZWFuJykge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBib29sZWFuJyk7XG4gIH1cblxuICAvLyBudW1iZXJcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIHZhbCAhPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgbnVtYmVyJyk7XG4gIH1cblxuICAvLyBhcnJheVxuICBlbHNlIGlmICh0eXBlID09PSAnYXJyYXknICYmIChcbiAgICB2YWwgPT09IG51bGwgfHxcbiAgICB0eXBlb2YgdmFsICE9PSAnb2JqZWN0JyB8fFxuICAgIHR5cGVvZiB2YWwubGVuZ3RoICE9PSAnbnVtYmVyJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhbiBhcnJheScpO1xuICB9XG5cbiAgLy8gcmVnZXhcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3JlZ2V4cCcgJiYgdmFsLmNvbnN0cnVjdG9yICE9PSBSZWdFeHApIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgcmVnZXhwJyk7XG4gIH1cblxuICAvLyBkYXRlXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdkYXRlJyAmJiB2YWwuY29uc3RydWN0b3IgIT09IERhdGUpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgZGF0ZScpO1xuICB9XG5cbiAgLy8gZW1pdHRlclxuICBlbHNlIGlmICh0eXBlID09PSAnZW1pdHRlcicgJiYgKFxuICAgIHR5cGVvZiB2YWwuYWRkTGlzdGVuZXIgIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLmVtaXQgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYW4gZW1pdHRlcicpO1xuICB9XG5cbiAgLy8gc3RyZWFtXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJlYW0nICYmIChcbiAgICB0eXBlb2YgdmFsLm9uICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5waXBlICE9PSAnZnVuY3Rpb24nXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgc3RyZWFtJyk7XG4gIH1cblxuICAvLyByZWFkIHN0cmVhbVxuICBlbHNlIGlmICh0eXBlID09PSAncmVhZC1zdHJlYW0nICYmIChcbiAgICB0eXBlb2YgdmFsLm9uICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5waXBlICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5yZWFkICE9PSAnZnVuY3Rpb24nXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgcmVhZC1zdHJlYW0nKTtcbiAgfVxuXG4gIC8vIHdyaXRlIHN0cmVhbVxuICBlbHNlIGlmICh0eXBlID09PSAnd3JpdGUtc3RyZWFtJyAmJiAoXG4gICAgdHlwZW9mIHZhbC5vbiAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwucGlwZSAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwud3JpdGUgIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLmVuZCAhPT0gJ2Z1bmN0aW9uJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHdyaXRlLXN0cmVhbScpO1xuICB9XG5cbiAgLy8gZnVuY3Rpb25cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgdmFsICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBudWxsXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdudWxsJyAmJiB2YWwgIT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgbnVsbCcpO1xuICB9XG5cbiAgLy8gdW5kZWZpbmVkXG4gIGVsc2UgaWYgKHR5cGUgPT09ICd1bmRlZmluZWQnICYmIHZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHVuZGVmaW5lZCcpO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5leHBvcnRzLl9zdGFja09mZnNldCA9IDI7XG5cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIl19
