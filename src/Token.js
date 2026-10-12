(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Token = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

 
  class Token {
    constructor(type, value, position, raw, extraProps) {
      this.type = type;
      this.value = value;
      this.position = position;
      this.raw = raw;
      if (extraProps) {
        var keys = Object.keys(extraProps);
        for (var k = 0; k < keys.length; k++) {
          this[keys[k]] = extraProps[keys[k]];
        }
      }
    }
  }

  return Token;
}));
