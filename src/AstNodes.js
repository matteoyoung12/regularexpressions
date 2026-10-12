(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./CharClassifier'));
  } else {
    var nodes = factory(root.CharClassifier);
    root.AstNodes = nodes;
    var keys = Object.keys(nodes);
    for (var i = 0; i < keys.length; i++) {
      root[keys[i]] = nodes[keys[i]];
    }
  }
}(typeof self !== 'undefined' ? self : this, function (CharClassifier) {
  'use strict';

 
  class AstNode {
    constructor(type) {
      this.type = type;
    }

    testAt(text, index, continuation) {
      return null;
    }

    describe(list) {
      // Базовый метод
    }
  }

  /**
   * Пустой узел (соответствует нулевой длине)
   */
  class EmptyNode extends AstNode {
    constructor() {
      super('EMPTY');
    }

    testAt(text, index, continuation) {
      return continuation(index);
    }

    describe(list) {
      // Не генерирует шагов описания
    }
  }

  /**
   * Литеральный символ
   */
  class CharNode extends AstNode {
    constructor(value, raw) {
      super('CHAR');
      this.value = value;
      this.raw = raw;
    }

    testAt(text, index, continuation) {
      if (index < text.length && text.charAt(index) === this.value) {
        return continuation(index + 1);
      }
      return null;
    }

    describe(list) {
      list.push({
        type: 'Символ',
        desc: "Литеральный символ '" + this.value + "'"
      });
    }
  }

  /**
   * Точка (.) - любой символ кроме перевода строки
   */
  class DotNode extends AstNode {
    constructor(raw) {
      super('DOT');
      this.raw = raw || '.';
    }

    testAt(text, index, continuation) {
      if (index < text.length) {
        var dotCh = text.charAt(index);
        if (dotCh !== '\n' && dotCh !== '\r') {
          return continuation(index + 1);
        }
      }
      return null;
    }

    describe(list) {
      list.push({
        type: 'Точка (.)',
        desc: 'Любой одиночный символ (кроме переноса строки)'
      });
    }
  }

  /**
   * Якорь начала строки (^)
   */
  class AnchorStartNode extends AstNode {
    constructor(raw) {
      super('ANCHOR_START');
      this.raw = raw || '^';
    }

    testAt(text, index, continuation) {
      if (index === 0) {
        return continuation(index);
      }
      return null;
    }

    describe(list) {
      list.push({
        type: 'Якорь (^)',
        desc: 'Начало строки'
      });
    }
  }

  /**
   * Якорь конца строки ($)
   */
  class AnchorEndNode extends AstNode {
    constructor(raw) {
      super('ANCHOR_END');
      this.raw = raw || '$';
    }

    testAt(text, index, continuation) {
      if (index === text.length) {
        return continuation(index);
      }
      return null;
    }

    describe(list) {
      list.push({
        type: 'Якорь ($)',
        desc: 'Конец строки'
      });
    }
  }

  /**
   * Предопределенный класс символов (\d, \w, \s и др.)
   */
  class PredefinedClassNode extends AstNode {
    constructor(value, raw) {
      super('PREDEFINED_CLASS');
      this.value = value;
      this.raw = raw;
    }

    testAt(text, index, continuation) {
      if (index < text.length && CharClassifier.matchesPredefined(this.value, text.charAt(index))) {
        return continuation(index + 1);
      }
      return null;
    }

    describe(list) {
      var desc = '';
      if (this.value === 'd') desc = 'Цифра (0-9)';
      else if (this.value === 'D') desc = 'Любой символ, кроме цифры';
      else if (this.value === 'w') desc = 'Словообразующий символ (буква, цифра или подчеркивание)';
      else if (this.value === 'W') desc = 'Любой символ, кроме словообразующего';
      else if (this.value === 's') desc = 'Пробельный символ (пробел, табуляция, перенос строки)';
      else if (this.value === 'S') desc = 'Любой непробельный символ';

      list.push({
        type: 'Класс \\' + this.value,
        desc: desc
      });
    }
  }

  /**
   * Пользовательский класс символов [...] и [^...]
   */
  class CharClassNode extends AstNode {
    constructor(negated, chars, ranges, predefined, raw) {
      super('CHAR_CLASS');
      this.negated = negated;
      this.chars = chars || [];
      this.ranges = ranges || [];
      this.predefined = predefined || [];
      this.raw = raw;
    }

    containsChar(ch) {
      if (!ch) return false;
      var found = false;

      for (var i = 0; i < this.chars.length; i++) {
        if (this.chars[i] === ch) {
          found = true;
          break;
        }
      }

      if (!found) {
        var code = ch.charCodeAt(0);
        for (var r = 0; r < this.ranges.length; r++) {
          var range = this.ranges[r];
          if (code >= range.start && code <= range.end) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        for (var p = 0; p < this.predefined.length; p++) {
          if (CharClassifier.matchesPredefined(this.predefined[p], ch)) {
            found = true;
            break;
          }
        }
      }

      return this.negated ? !found : found;
    }

    testAt(text, index, continuation) {
      if (index < text.length && this.containsChar(text.charAt(index))) {
        return continuation(index + 1);
      }
      return null;
    }

    describe(list) {
      var details = [];
      if (this.chars.length > 0) details.push('символы: ' + this.chars.join(', '));
      if (this.ranges.length > 0) {
        var rStrs = [];
        for (var r = 0; r < this.ranges.length; r++) {
          rStrs.push(this.ranges[r].startChar + '-' + this.ranges[r].endChar);
        }
        details.push('диапазоны: ' + rStrs.join(', '));
      }
      if (this.predefined.length > 0) {
        details.push('классы: \\' + this.predefined.join(', \\'));
      }
      var title = this.negated ? 'Инвертированный класс символов ' + this.raw : 'Класс символов ' + this.raw;
      list.push({
        type: title,
        desc: (this.negated ? 'Символ НЕ из набора: ' : 'Символ из набора: ') + details.join('; ')
      });
    }
  }

  /**
   * Квантификатор повторений (*, +, ?, {n,m})
   */
  class QuantifierNode extends AstNode {
    constructor(child, min, max, raw) {
      super('QUANTIFIER');
      this.child = child;
      this.min = min;
      this.max = max;
      this.raw = raw;
    }

    testAt(text, index, continuation) {
      var child = this.child;
      var min = this.min;
      var max = this.max;

      function matchReps(count, curPos) {
        if (count >= max) {
          return continuation(curPos);
        }

        var branchRes = child.testAt(text, curPos, function (nextPos) {
          if (nextPos === curPos) {
            return null;
          }
          return matchReps(count + 1, nextPos);
        });

        if (branchRes !== null) {
          return branchRes;
        }

        if (count >= min) {
          return continuation(curPos);
        }

        return null;
      }

      return matchReps(0, index);
    }

    describe(list) {
      if (this.child) {
        this.child.describe(list);
      }
      var qDesc = '';
      if (this.min === 0 && this.max === Infinity) qDesc = 'повторение 0 или более раз (*)';
      else if (this.min === 1 && this.max === Infinity) qDesc = 'повторение 1 или более раз (+)';
      else if (this.min === 0 && this.max === 1) qDesc = 'необязательный элемент: 0 или 1 раз (?)';
      else if (this.min === this.max) qDesc = 'повторение ровно ' + this.min + ' раз(а)';
      else if (this.max === Infinity) qDesc = 'повторение от ' + this.min + ' до бесконечности раз(а)';
      else qDesc = 'повторение от ' + this.min + ' до ' + this.max + ' раз(а)';

      list.push({
        type: 'Квантификатор ' + this.raw,
        desc: qDesc
      });
    }
  }

  /**
   * Группа в круглых скобках (...)
   */
  class GroupNode extends AstNode {
    constructor(child) {
      super('GROUP');
      this.child = child;
    }

    testAt(text, index, continuation) {
      return this.child.testAt(text, index, continuation);
    }

    describe(list) {
      list.push({
        type: 'Группа (...)',
        desc: 'Начало подвыражения в скобках'
      });
      if (this.child) {
        this.child.describe(list);
      }
    }
  }

  /**
   * Альтернатива ветвей (|)
   */
  class AlternationNode extends AstNode {
    constructor(branches) {
      super('ALTERNATION');
      this.branches = branches || [];
    }

    testAt(text, index, continuation) {
      for (var b = 0; b < this.branches.length; b++) {
        var branchRes = this.branches[b].testAt(text, index, continuation);
        if (branchRes !== null) {
          return branchRes;
        }
      }
      return null;
    }

    describe(list) {
      list.push({
        type: 'Альтернатива (|)',
        desc: 'Один из вариантов (' + this.branches.length + ' ветвей)'
      });
      for (var b = 0; b < this.branches.length; b++) {
        this.branches[b].describe(list);
      }
    }
  }

  /**
   * Последовательное сопоставление (Конкатенация)
   */
  class ConcatNode extends AstNode {
    constructor(children) {
      super('CONCAT');
      this.children = children || [];
    }

    testAt(text, index, continuation) {
      var self = this;
      function matchConcatChildren(childIdx, curPos) {
        if (childIdx >= self.children.length) {
          return continuation(curPos);
        }
        return self.children[childIdx].testAt(text, curPos, function (nextPos) {
          return matchConcatChildren(childIdx + 1, nextPos);
        });
      }
      return matchConcatChildren(0, index);
    }

    describe(list) {
      for (var c = 0; c < this.children.length; c++) {
        this.children[c].describe(list);
      }
    }
  }

  return {
    AstNode: AstNode,
    EmptyNode: EmptyNode,
    CharNode: CharNode,
    DotNode: DotNode,
    AnchorStartNode: AnchorStartNode,
    AnchorEndNode: AnchorEndNode,
    PredefinedClassNode: PredefinedClassNode,
    CharClassNode: CharClassNode,
    QuantifierNode: QuantifierNode,
    GroupNode: GroupNode,
    AlternationNode: AlternationNode,
    ConcatNode: ConcatNode
  };
}));
