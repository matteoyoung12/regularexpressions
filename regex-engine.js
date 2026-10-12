(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./src/TokenType'),
      require('./src/Token'),
      require('./src/CharClassifier'),
      require('./src/Lexer'),
      require('./src/AstNodes'),
      require('./src/Parser'),
      require('./src/RegexMatch'),
      require('./src/RegexMatcher'),
      require('./src/SyntaxValidator')
    );
  } else {
    root.CustomRegexEngine = factory(
      root.TokenType, root.Token, root.CharClassifier, root.Lexer,
      root.AstNodes, root.Parser, root.RegexMatch, root.RegexMatcher, root.SyntaxValidator
    );
  }
}(typeof self !== 'undefined' ? self : this, function (
  TokenType, Token, CharClassifier, Lexer, AstNodes, Parser, RegexMatch, RegexMatcher, SyntaxValidator
) {
  'use strict';

  /**
   * Класс-фасад (Facade):
   * Тонкая обёртка, координирующая работу вынесенных классов Lexer, Parser, AstNodes, RegexMatcher.
   */
  class CustomRegexEngine {
    static validateSyntax(pattern) {
      return SyntaxValidator.validate(pattern);
    }

    static execute(pattern, text) {
      if (typeof pattern !== 'string' || pattern.length === 0) {
        return {
          success: false,
          warningType: 'EMPTY_PATTERN',
          message: 'Предупреждение: Введена пустая строка в поле регулярного выражения. Пожалуйста, введите выражение.'
        };
      }
      if (typeof text !== 'string' || text.length === 0) {
        return {
          success: false,
          warningType: 'EMPTY_TEXT',
          message: 'Предупреждение: Введена пустая строка в поле текста. Пожалуйста, введите текст для поиска.'
        };
      }

      var valResult = this.validateSyntax(pattern);
      if (!valResult.isValid) {
        var posMsg = valResult.position ? ' (позиция ' + valResult.position + ')' : '';
        return {
          success: false,
          warningType: 'INVALID_PATTERN',
          message: 'Предупреждение: Введено не регулярное выражение! ' + valResult.error + posMsg + '.',
          position: valResult.position
        };
      }

      var matcher = new RegexMatcher(valResult.ast);
      var matches = matcher.findAll(text);

      return {
        success: true,
        pattern: pattern,
        text: text,
        matches: matches,
        hasMatch: matches.length > 0,
        descriptions: valResult.descriptions
      };
    }
  }

  Object.assign(CustomRegexEngine, {
    TokenType: TokenType,
    Token: Token,
    CharClassifier: CharClassifier,
    Lexer: Lexer,
    AstNodes: AstNodes,
    Parser: Parser,
    RegexMatch: RegexMatch,
    RegexMatcher: RegexMatcher,
    SyntaxValidator: SyntaxValidator
  }, AstNodes);

  return CustomRegexEngine;
}));
