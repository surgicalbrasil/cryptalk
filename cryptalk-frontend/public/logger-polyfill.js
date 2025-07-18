// Logger polyfill for Magic SDK compatibility
(function() {
  'use strict';
  
  // Create logger object
  var loggerObj = {
    log: function() { 
      if (console && console.log) {
        console.log.apply(console, arguments); 
      }
    },
    warn: function() { 
      if (console && console.warn) {
        console.warn.apply(console, arguments); 
      }
    },
    error: function() { 
      if (console && console.error) {
        console.error.apply(console, arguments); 
      }
    },
    info: function() { 
      if (console && console.info) {
        console.info.apply(console, arguments); 
      }
    },
    debug: function() { 
      if (console && console.debug) {
        console.debug.apply(console, arguments); 
      }
    }
  };
  
  // Define logger as a global variable - the most compatible approach
  window.logger = loggerObj;
  
  // Also try to define it in other global contexts
  try {
    if (typeof globalThis !== 'undefined') {
      globalThis.logger = loggerObj;
    }
  } catch (e) {}
  
  try {
    if (typeof self !== 'undefined') {
      self.logger = loggerObj;
    }
  } catch (e) {}
  
  try {
    if (typeof global !== 'undefined') {
      global.logger = loggerObj;
    }
  } catch (e) {}
  
  // Most important: Define logger in the global scope
  try {
    eval('var logger = window.logger;');
  } catch (e) {}
  
  // Also try to define it as a property of the global object
  try {
    Object.defineProperty(window, 'logger', {
      value: loggerObj,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
  
  console.log('Logger polyfill loaded and defined globally');
})();