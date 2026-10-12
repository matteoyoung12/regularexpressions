(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TokenType = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  
  var TokenType = {
    CHAR: 'CHAR',
    DOT: 'DOT',
    ANCHOR_START: 'ANCHOR_START',
    ANCHOR_END: 'ANCHOR_END',
    STAR: 'STAR',
    PLUS: 'PLUS',
    QUESTION: 'QUESTION',
    QUANTIFIER: 'QUANTIFIER',
    PIPE: 'PIPE',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    CHAR_CLASS: 'CHAR_CLASS',
    PREDEFINED_CLASS: 'PREDEFINED_CLASS'
  };

  return TokenType;
}));
