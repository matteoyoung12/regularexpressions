(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./Lexer'),
      require('./Parser')
    );
  } else {
    root.SyntaxValidator = factory(root.Lexer, root.Parser);
  }
}(typeof self !== 'undefined' ? self : this, function (Lexer, Parser) {
  'use strict';

  
  class SyntaxValidator {
    static validate(pattern) {
      if (typeof pattern !== 'string') {
        return {
          isValid: false,
          error: 'Выражение должно быть строкой'
        };
      }
      if (pattern.length === 0) {
        return {
          isValid: false,
          isEmpty: true,
          error: 'Введена пустая строка в поле выражения'
        };
      }

      try {
        var lexer = new Lexer(pattern);
        var tokens = lexer.tokenize();
        var parser = new Parser(tokens);
        var ast = parser.parse();
        var descriptions = [];
        ast.describe(descriptions);

        return {
          isValid: true,
          ast: ast,
          tokens: tokens,
          descriptions: descriptions
        };
      } catch (err) {
        return {
          isValid: false,
          error: err.message || 'Синтаксическая ошибка в выражении',
          position: err.position || null
        };
      }
    }
  }

  return SyntaxValidator;
}));
