(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./TokenType'),
      require('./Token'),
      require('./CharClassifier')
    );
  } else {
    root.Lexer = factory(root.TokenType, root.Token, root.CharClassifier);
  }
}(typeof self !== 'undefined' ? self : this, function (TokenType, Token, CharClassifier) {
  'use strict';

 
  class Lexer {
    constructor(pattern) {
      this.pattern = pattern;
      this.cursor = 0;
      this.len = pattern.length;
    }

    tokenize() {
      var tokens = [];
      while (this.cursor < this.len) {
        var ch = this.pattern.charAt(this.cursor);
        var pos = this.cursor + 1; // 1-indexed

        if (ch === '\\') {
          tokens.push(this.readEscape(pos));
        } else if (ch === '.') {
          tokens.push(new Token(TokenType.DOT, '.', pos, '.'));
          this.cursor += 1;
        } else if (ch === '^') {
          tokens.push(new Token(TokenType.ANCHOR_START, '^', pos, '^'));
          this.cursor += 1;
        } else if (ch === '$') {
          tokens.push(new Token(TokenType.ANCHOR_END, '$', pos, '$'));
          this.cursor += 1;
        } else if (ch === '|') {
          tokens.push(new Token(TokenType.PIPE, '|', pos, '|'));
          this.cursor += 1;
        } else if (ch === '(') {
          tokens.push(new Token(TokenType.LPAREN, '(', pos, '('));
          this.cursor += 1;
        } else if (ch === ')') {
          tokens.push(new Token(TokenType.RPAREN, ')', pos, ')'));
          this.cursor += 1;
        } else if (ch === '*') {
          tokens.push(new Token(TokenType.STAR, '*', pos, '*'));
          this.cursor += 1;
        } else if (ch === '+') {
          tokens.push(new Token(TokenType.PLUS, '+', pos, '+'));
          this.cursor += 1;
        } else if (ch === '?') {
          tokens.push(new Token(TokenType.QUESTION, '?', pos, '?'));
          this.cursor += 1;
        } else if (ch === '{') {
          tokens.push(this.readQuantifier(pos));
        } else if (ch === '[') {
          tokens.push(this.readCharClass(pos));
        } else {
          tokens.push(new Token(TokenType.CHAR, ch, pos, ch));
          this.cursor += 1;
        }
      }
      return tokens;
    }

    readEscape(pos) {
      if (this.cursor + 1 >= this.len) {
        throw {
          message: "Символ экранирования '\\' в конце выражения не имеет следующего символа",
          position: pos
        };
      }
      var nextCh = this.pattern.charAt(this.cursor + 1);
      this.cursor += 2;

      if (nextCh === 'd' || nextCh === 'D' ||
          nextCh === 'w' || nextCh === 'W' ||
          nextCh === 's' || nextCh === 'S') {
        return new Token(TokenType.PREDEFINED_CLASS, nextCh, pos, '\\' + nextCh);
      } else if (nextCh === 't') {
        return new Token(TokenType.CHAR, '\t', pos, '\\t');
      } else if (nextCh === 'n') {
        return new Token(TokenType.CHAR, '\n', pos, '\\n');
      } else if (nextCh === 'r') {
        return new Token(TokenType.CHAR, '\r', pos, '\\r');
      } else {
        return new Token(TokenType.CHAR, nextCh, pos, '\\' + nextCh);
      }
    }

    readQuantifier(pos) {
      var closeBraceIdx = this.pattern.indexOf('}', this.cursor + 1);
      if (closeBraceIdx === -1) {
        throw {
          message: "Не закрыта фигурная скобка '{' для квантификатора",
          position: pos
        };
      }

      var qContent = this.pattern.substring(this.cursor + 1, closeBraceIdx);
      var qRaw = this.pattern.substring(this.cursor, closeBraceIdx + 1);

      if (qContent.length === 0) {
        throw {
          message: "Пустой квантификатор '{}'",
          position: pos
        };
      }

      var commaIdx = qContent.indexOf(',');
      var min = 0;
      var max = 0;

      if (commaIdx === -1) {
        for (var ci = 0; ci < qContent.length; ci++) {
          if (!CharClassifier.isDigit(qContent.charAt(ci))) {
            throw {
              message: "Некорректный квантификатор '" + qRaw + "': ожидалось целое неотрицательное число",
              position: pos
            };
          }
        }
        min = parseInt(qContent, 10);
        max = min;
      } else {
        var minStr = qContent.substring(0, commaIdx);
        var maxStr = qContent.substring(commaIdx + 1);

        if (minStr.length === 0) {
          throw {
            message: "Некорректный квантификатор '" + qRaw + "': пропущена начальная граница",
            position: pos
          };
        }
        for (var c1 = 0; c1 < minStr.length; c1++) {
          if (!CharClassifier.isDigit(minStr.charAt(c1))) {
            throw {
              message: "Некорректный квантификатор '" + qRaw + "': начальная граница должна быть целым числом",
              position: pos
            };
          }
        }
        min = parseInt(minStr, 10);

        if (maxStr.length === 0) {
          max = Infinity;
        } else {
          for (var c2 = 0; c2 < maxStr.length; c2++) {
            if (!CharClassifier.isDigit(maxStr.charAt(c2))) {
              throw {
                message: "Некорректный квантификатор '" + qRaw + "': конечная граница должна быть целым числом",
                position: pos
              };
            }
          }
          max = parseInt(maxStr, 10);
          if (min > max) {
            throw {
              message: "В квантификаторе '" + qRaw + "' начальное число (" + min + ") больше конечного (" + max + ")",
              position: pos
            };
          }
        }
      }

      this.cursor = closeBraceIdx + 1;
      return new Token(TokenType.QUANTIFIER, null, pos, qRaw, { min: min, max: max });
    }

    readCharClass(pos) {
      var classStartPos = pos;
      var j = this.cursor + 1;
      var negated = false;

      if (j < this.len && this.pattern.charAt(j) === '^') {
        negated = true;
        j++;
      }

      if (j < this.len && this.pattern.charAt(j) === ']') {
        throw {
          message: "Пустой класс символов '[" + (negated ? "^]" : "]") + "'",
          position: classStartPos
        };
      }

      var classChars = [];
      var classRanges = [];
      var classPredefined = [];
      var closed = false;

      while (j < this.len) {
        var curChar = this.pattern.charAt(j);
        if (curChar === ']') {
          closed = true;
          j++;
          break;
        }

        var elemChar = '';
        var isPredef = false;
        var predefVal = '';

        if (curChar === '\\') {
          if (j + 1 >= this.len) {
            throw {
              message: "Незавершенный символ экранирования '\\' внутри класса символов",
              position: j + 1
            };
          }
          var escChar = this.pattern.charAt(j + 1);
          if (escChar === 'd' || escChar === 'D' ||
              escChar === 'w' || escChar === 'W' ||
              escChar === 's' || escChar === 'S') {
            isPredef = true;
            predefVal = escChar;
          } else if (escChar === 't') {
            elemChar = '\t';
          } else if (escChar === 'n') {
            elemChar = '\n';
          } else if (escChar === 'r') {
            elemChar = '\r';
          } else {
            elemChar = escChar;
          }
          j += 2;
        } else {
          elemChar = curChar;
          j += 1;
        }

        if (!isPredef && j < this.len && this.pattern.charAt(j) === '-' && j + 1 < this.len && this.pattern.charAt(j + 1) !== ']') {
          j++;
          var endChar = '';
          var endCharPos = j + 1;
          if (this.pattern.charAt(j) === '\\') {
            if (j + 1 >= this.len) {
              throw {
                message: "Незавершенный символ экранирования в конце диапазона внутри класса символов",
                position: endCharPos
              };
            }
            var endEsc = this.pattern.charAt(j + 1);
            if (endEsc === 'd' || endEsc === 'D' || endEsc === 'w' || endEsc === 'W' || endEsc === 's' || endEsc === 'S') {
              throw {
                message: "В диапазоне символов нельзя использовать класс \\" + endEsc,
                position: endCharPos
              };
            }
            endChar = endEsc;
            j += 2;
          } else {
            endChar = this.pattern.charAt(j);
            j += 1;
          }

          var startCode = elemChar.charCodeAt(0);
          var endCode = endChar.charCodeAt(0);
          if (startCode > endCode) {
            throw {
              message: "Некорректный диапазон '" + elemChar + "-" + endChar + "' в классе символов: символ '" + elemChar + "' (код " + startCode + ") больше символа '" + endChar + "' (код " + endCode + ")",
              position: classStartPos
            };
          }

          classRanges.push({ start: startCode, end: endCode, startChar: elemChar, endChar: endChar });
        } else {
          if (isPredef) {
            classPredefined.push(predefVal);
          } else {
            classChars.push(elemChar);
          }
        }
      }

      if (!closed) {
        throw {
          message: "Не закрыта квадратная скобка '[' для класса символов",
          position: classStartPos
        };
      }

      var classRaw = this.pattern.substring(this.cursor, j);
      this.cursor = j;
      return new Token(TokenType.CHAR_CLASS, null, classStartPos, classRaw, {
        negated: negated,
        chars: classChars,
        ranges: classRanges,
        predefined: classPredefined
      });
    }
  }

  return Lexer;
}));
