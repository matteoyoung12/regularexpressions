(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CharClassifier = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

 
  class CharClassifier {
    static isDigit(ch) {
      if (!ch) return false;
      var code = ch.charCodeAt(0);
      return code >= 48 && code <= 57; // '0'..'9'
    }

    static isAsciiLetter(ch) {
      if (!ch) return false;
      var code = ch.charCodeAt(0);
      return (code >= 65 && code <= 90) || (code >= 97 && code <= 122); // 'A'..'Z', 'a'..'z'
    }

    static isCyrillicLetter(ch) {
      if (!ch) return false;
      var code = ch.charCodeAt(0);
      return (code >= 1040 && code <= 1103) || code === 1025 || code === 1105; // 'А'..'я', 'Ё', 'ё'
    }

    static isWordChar(ch) {
      if (!ch) return false;
      return this.isAsciiLetter(ch) || this.isDigit(ch) || ch === '_' || this.isCyrillicLetter(ch);
    }

    static isWhitespace(ch) {
      if (!ch) return false;
      return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
    }

    static matchesPredefined(className, ch) {
      if (!ch) return false;
      switch (className) {
        case 'd': return this.isDigit(ch);
        case 'D': return !this.isDigit(ch);
        case 'w': return this.isWordChar(ch);
        case 'W': return !this.isWordChar(ch);
        case 's': return this.isWhitespace(ch);
        case 'S': return !this.isWhitespace(ch);
        default: return false;
      }
    }
  }

  return CharClassifier;
}));
