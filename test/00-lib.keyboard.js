
// modules
var test = require('tape');

// libs
var KeyboardJS = require('../lib/keyboard');
var Locale = require('../lib/locale');

// test globals
var keyboardJS;


test('new KeyboardJS()', function(t) {
  keyboardJS = new KeyboardJS();
  t.pass('can construct an instance of KeyboardJS');
  t.end();
});

test('keyboardJS.setLocale(locale)', function(t) {
  var locale = new Locale('test-1');
  locale.bindKeyCode(1, 'a');
  locale.bindKeyCode(2, 'b');
  locale.bindKeyCode(3, 'c');
  keyboardJS.setLocale(locale);
  t.equal(keyboardJS._locales['test-1'], locale);
  t.equal(keyboardJS.locale, locale);
  t.end();
});

test('keyboardJS.setLocale(localName, localeBuilder(locale))', function(t) {
  var locale;
  keyboardJS.setLocale('test-2', function(_locale) {
    locale = _locale;
    t.equal(locale.constructor, Locale);
  });
  t.equal(keyboardJS._locales['test-2'], locale);
  t.equal(keyboardJS.locale, locale);
  t.end();
});

test('keyboardJS.setLocale(localName)', function(t) {
  keyboardJS.setLocale('test-1');
  t.equal(keyboardJS.locale, keyboardJS._locales['test-1']);
  t.end();
});

test('keyboardJS.pressKey(keyCode)', function(t) {
  keyboardJS.pressKey(1);
  keyboardJS.pressKey(2);
  keyboardJS.pressKey(3);
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'a', 'b', 'c' ],
    'adds the a key to pressed keys array'
  );
  t.end();
});

test('keyboardJS.releaseKey(keyCode)', function(t) {
  keyboardJS.releaseKey(1);
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'b', 'c' ],
    'removes the a key from pressed keys array'
  );
  t.end();
});

test('keyboardJS.pressKey(keyName)', function(t) {
  keyboardJS.locale.pressedKeys.length = 0
  ;
  keyboardJS.pressKey('a');
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'a' ],
    'adds the a and b keys to pressed keys array'
  );
  t.end();
});

test('keyboardJS.releaseKey(keyName)', function(t) {
  keyboardJS.releaseKey('a');
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [],
    'removes the a key from pressed keys array'
  );
  t.end();
});

test('keyboardJS.bind(keyCombo, handler(event))', function(t) {
  var bindingFired = false;
  keyboardJS.bind('a + b > c', function(event) {
    bindingFired = true;
  });
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('c');
  keyboardJS.pressKey('b');
  t.notOk(
    bindingFired,
    'not fired unless keys are pressed in the correct order'
  );
  keyboardJS.releaseAllKeys();
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.ok(bindingFired, 'fired when keys are pressed in the correct order');
  t.end();
});

test('keyboardJS.addListener() -> keyboardJS.bind()', function(t) {
  t.equal(keyboardJS.addListener, keyboardJS.bind, 'aliases keyboardJS.bind');
  t.end();
});

test('keyboardJS.on() -> keyboardJS.bind()', function(t) {
  t.equal(keyboardJS.on, keyboardJS.bind, 'aliases keyboardJS.bind');
  t.end();
});

test('keyboardJS.unbind(keyCombo, handler(event))', function(t) {
  var bindingFired = false;
  var listener = function(event) {
    bindingFired = true;
  };
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b > c', listener);
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.notOk(bindingFired, 'listener should be unbound');

  keyboardJS.releaseAllKeys();
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b > c');
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.notOk(bindingFired, 'listener should be unbound');

  keyboardJS.releaseAllKeys();
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b');
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.ok(bindingFired, 'listener should be fired');

  t.end();
});

test('keyboardJS.watch(targetDocument, targetWindow) - Modern Browsers', function(t) {
  var focusBound = false;
  var blurBound = false;
  var keyupBound = false;
  var keydownBound = false;
  var targetDocument = {
    addEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'keyup') { keyupBound = true; }
      if (eventName === 'keydown') { keydownBound = true; }
    },
    removeEventListener: function() {}
  };
  var targetWindow = {
    addEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'focus') { focusBound = true; }
      if (eventName === 'blur') { blurBound = true; }
    },
    removeEventListener: function() {}
  };

  keyboardJS.watch(targetDocument, targetWindow);
  t.ok(focusBound, 'bound focus event');
  t.ok(blurBound, 'bound blur event');
  t.ok(keyupBound, 'bound keyup event');
  t.ok(keydownBound, 'bound keydown event');

  t.end();
});

test('keyboardJS.watch(targetDocument, targetWindow) - Legacy Browsers', function(t) {
  var focusBound = false;
  var blurBound = false;
  var keyupBound = false;
  var keydownBound = false;

  var targetDocument = {
    attachEvent: function(eventName, hander) {
      if (eventName === 'onkeyup') { keyupBound = true; }
      if (eventName === 'onkeydown') { keydownBound = true; }
    },
    detachEvent: function() {}
  };
  var targetWindow = {
    attachEvent: function(eventName, hander) {
      if (eventName === 'onfocus') { focusBound = true; }
      if (eventName === 'onblur') { blurBound = true; }
    },
    detachEvent: function() {}
  };

  keyboardJS.watch(targetDocument, targetWindow);
  t.ok(focusBound, 'bound focus event');
  t.ok(blurBound, 'bound blur event');
  t.ok(keyupBound, 'bound keyup event');
  t.ok(keydownBound, 'bound keydown event');

  t.end();
});

test('keyboardJS.watch(targetWindow)', function(t) {
  var focusBound = false;
  var blurBound = false;
  var keyupBound = false;
  var keydownBound = false;

  var targetWindow = {
    addEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'focus') { focusBound = true; }
      if (eventName === 'blur') { blurBound = true; }
    },
    removeEventListener: function() {},
    document: {
      addEventListener: function(eventName, hander, useCapture) {
        if (eventName === 'keyup') { keyupBound = true; }
        if (eventName === 'keydown') { keydownBound = true; }
      },
      removeEventListener: function() {}
    }
  };

  keyboardJS.watch(targetWindow);
  t.ok(focusBound, 'bound focus event');
  t.ok(blurBound, 'bound blur event');
  t.ok(keyupBound, 'bound keyup event');
  t.ok(keydownBound, 'bound keydown event');

  t.end();
});

test('keyboardJS.watch(targetDocument)', function(t) {
  var focusBound = false;
  var blurBound = false;
  var keyupBound = false;
  var keydownBound = false;

  global.window = {
    addEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'focus') { focusBound = true; }
      if (eventName === 'blur') { blurBound = true; }
    },
    removeEventListener: function() {}
  };

  var targetDocument = {
    addEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'keyup') { keyupBound = true; }
      if (eventName === 'keydown') { keydownBound = true; }
    },
    removeEventListener: function() {}
  };

  keyboardJS.watch(targetDocument);
  t.ok(focusBound, 'bound focus event');
  t.ok(blurBound, 'bound blur event');
  t.ok(keyupBound, 'bound keyup event');
  t.ok(keydownBound, 'bound keydown event');

  delete global.window;

  t.end();
});

test('keyboardJS.stop()', function(t) {
  var focusUnbound = false;
  var blurUnbound = false;
  var keyupUnbound = false;
  var keydownUnbound = false;
  var targetDocument = {
    addEventListener: function() {},
    removeEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'keyup') { keyupUnbound = true; }
      if (eventName === 'keydown') { keydownUnbound = true; }
    }
  };
  var targetWindow = {
    addEventListener: function() {},
    removeEventListener: function(eventName, hander, useCapture) {
      if (eventName === 'focus') { focusUnbound = true; }
      if (eventName === 'blur') { blurUnbound = true; }
    }
  };
  keyboardJS.watch(targetDocument, targetWindow);

  keyboardJS.stop();
  t.ok(focusUnbound, 'unbound focus event');
  t.ok(blurUnbound, 'unbound blur event');
  t.ok(keyupUnbound, 'unbound keyup event');
  t.ok(keydownUnbound, 'unbound keydown event');

  t.end();
});

test('keyboardJS.releaseAllKeys()', function(t) {
  keyboardJS.locale.pressedKeys = ['a'];
  keyboardJS.releaseAllKeys();
  t.equal(
    keyboardJS.locale.pressedKeys.length,
    0,
    'pressedKeys array should be empty'
  );
  t.end();
});

test('keyboardJS.reset()', function(t) {
  keyboardJS.locale.pressedKeys = ['a'];
  keyboardJS._listeners.length = 0;
  keyboardJS.bind('a', function() {});
  keyboardJS.reset();
  t.equal(keyboardJS.locale.pressedKeys.length, 0);
  t.equal(keyboardJS._listeners.length, 0);
  t.end();
});
