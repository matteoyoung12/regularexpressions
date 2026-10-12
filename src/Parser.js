(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./TokenType'),
      require('./AstNodes')
    );
  } else {
    root.Parser = factory(root.TokenType, root.AstNodes);
  }
}(typeof self !== 'undefined' ? self : this, function (TokenType, AstNodes) {
  'use strict';

  var EmptyNode = AstNodes.EmptyNode;
  var CharNode = AstNodes.CharNode;
  var DotNode = AstNodes.DotNode;
  var AnchorStartNode = AstNodes.AnchorStartNode;
  var AnchorEndNode = AstNodes.AnchorEndNode;
  var PredefinedClassNode = AstNodes.PredefinedClassNode;
  var CharClassNode = AstNodes.CharClassNode;
  var QuantifierNode = AstNodes.QuantifierNode;
  var GroupNode = AstNodes.GroupNode;
  var AlternationNode = AstNodes.AlternationNode;
  var ConcatNode = AstNodes.ConcatNode;

 
  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.ptr = 0;
    }

    peek() {
      if (this.ptr < this.tokens.length) {
        return this.tokens[this.ptr];
      }
      return null;
    }

    consume(expectedType) {
      var tok = this.peek();
      if (!tok) return null;
      if (expectedType && tok.type !== expectedType) {
        return null;
      }
      this.ptr++;
      return tok;
    }

    parse() {
      if (this.tokens.length === 0) {
        return new EmptyNode();
      }
      var expr = this.parseExpression();
      if (this.ptr < this.tokens.length) {
        var remaining = this.peek();
        if (remaining.type === TokenType.RPAREN) {
          throw {
            message: "Неожиданная закрывающая скобка ')' без соответствующей открывающей",
            position: remaining.position
          };
        }
        throw {
          message: "Неожиданный символ '" + remaining.raw + "'",
          position: remaining.position
        };
      }
      return expr;
    }

    parseExpression() {
      if (this.peek() && this.peek().type === TokenType.PIPE) {
        throw {
          message: "Пустая ветвь альтернативы перед '|'",
          position: this.peek().position
        };
      }

      var firstBranch = this.parseConcatenation();
      var branches = [firstBranch];

      while (this.peek() && this.peek().type === TokenType.PIPE) {
        var pipeToken = this.consume(TokenType.PIPE);
        if (!this.peek() || this.peek().type === TokenType.PIPE || this.peek().type === TokenType.RPAREN) {
          throw {
            message: "Пустая ветвь альтернативы рядом с '|'",
            position: pipeToken.position
          };
        }
        var nextBranch = this.parseConcatenation();
        if (nextBranch.type === 'EMPTY') {
          throw {
            message: "Пустая ветвь альтернативы рядом с '|'",
            position: pipeToken.position
          };
        }
        branches.push(nextBranch);
      }

      if (branches.length === 1) {
        return branches[0];
      }
      return new AlternationNode(branches);
    }

    parseConcatenation() {
      var items = [];
      while (this.peek() && this.peek().type !== TokenType.PIPE && this.peek().type !== TokenType.RPAREN) {
        var item = this.parseQuantifiedAtom();
        items.push(item);
      }

      if (items.length === 0) {
        return new EmptyNode();
      }
      if (items.length === 1) {
        return items[0];
      }
      return new ConcatNode(items);
    }

    parseQuantifiedAtom() {
      var tok = this.peek();
      if (!tok) {
        throw { message: "Неожиданный конец выражения", position: 1 };
      }

      if (tok.type === TokenType.STAR ||
          tok.type === TokenType.PLUS ||
          tok.type === TokenType.QUESTION ||
          tok.type === TokenType.QUANTIFIER) {
        throw {
          message: "Квантификатор '" + tok.raw + "' не имеет предшествующего элемента для повторения",
          position: tok.position
        };
      }

      var atom = this.parseAtom();

      var nextTok = this.peek();
      if (nextTok) {
        if (nextTok.type === TokenType.STAR) {
          this.consume(TokenType.STAR);
          this.checkConsecutiveQuantifiers();
          return new QuantifierNode(atom, 0, Infinity, '*');
        }
        if (nextTok.type === TokenType.PLUS) {
          this.consume(TokenType.PLUS);
          this.checkConsecutiveQuantifiers();
          return new QuantifierNode(atom, 1, Infinity, '+');
        }
        if (nextTok.type === TokenType.QUESTION) {
          this.consume(TokenType.QUESTION);
          this.checkConsecutiveQuantifiers();
          return new QuantifierNode(atom, 0, 1, '?');
        }
        if (nextTok.type === TokenType.QUANTIFIER) {
          var q = this.consume(TokenType.QUANTIFIER);
          this.checkConsecutiveQuantifiers();
          return new QuantifierNode(atom, q.min, q.max, q.raw);
        }
      }

      return atom;
    }

    checkConsecutiveQuantifiers() {
      var next = this.peek();
      if (next && (next.type === TokenType.STAR ||
                   next.type === TokenType.PLUS ||
                   next.type === TokenType.QUESTION ||
                   next.type === TokenType.QUANTIFIER)) {
        throw {
          message: "Несколько квантификаторов подряд: '" + next.raw + "'",
          position: next.position
        };
      }
    }

    parseAtom() {
      var tok = this.peek();
      if (!tok) {
        throw { message: "Неожиданный конец выражения", position: 1 };
      }

      if (tok.type === TokenType.CHAR) {
        this.consume(TokenType.CHAR);
        return new CharNode(tok.value, tok.raw);
      }
      if (tok.type === TokenType.DOT) {
        this.consume(TokenType.DOT);
        return new DotNode(tok.raw);
      }
      if (tok.type === TokenType.ANCHOR_START) {
        this.consume(TokenType.ANCHOR_START);
        return new AnchorStartNode(tok.raw);
      }
      if (tok.type === TokenType.ANCHOR_END) {
        this.consume(TokenType.ANCHOR_END);
        return new AnchorEndNode(tok.raw);
      }
      if (tok.type === TokenType.PREDEFINED_CLASS) {
        this.consume(TokenType.PREDEFINED_CLASS);
        return new PredefinedClassNode(tok.value, tok.raw);
      }
      if (tok.type === TokenType.CHAR_CLASS) {
        this.consume(TokenType.CHAR_CLASS);
        return new CharClassNode(tok.negated, tok.chars, tok.ranges, tok.predefined, tok.raw);
      }
      if (tok.type === TokenType.LPAREN) {
        var lparen = this.consume(TokenType.LPAREN);
        if (this.peek() && this.peek().type === TokenType.RPAREN) {
          this.consume(TokenType.RPAREN);
          return new EmptyNode();
        }
        var inner = this.parseExpression();
        var rparen = this.consume(TokenType.RPAREN);
        if (!rparen) {
          throw {
            message: "Ожидалась закрывающая скобка ')' для открытой скобки",
            position: lparen.position
          };
        }
        return new GroupNode(inner);
      }

      if (tok.type === TokenType.RPAREN) {
        throw {
          message: "Неожиданная закрывающая скобка ')'",
          position: tok.position
        };
      }

      throw {
        message: "Неожиданный символ '" + tok.raw + "'",
        position: tok.position
      };
    }
  }

  return Parser;
}));
