/**
 * Application controller and UI components for Lab #2 Regex Helper
 * Strictly follows OOP principles (Controllers, Views, Helpers)
 * (STRICT: ZERO REGEX USED - PURE JS STRING OPERATIONS)
 */

class HtmlEscaper {
  /**
   * Safe HTML escaping without regex
   */
  static escape(str) {
    if (!str) return '';
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (c === '&') out += '&amp;';
      else if (c === '<') out += '&lt;';
      else if (c === '>') out += '&gt;';
      else if (c === '"') out += '&quot;';
      else if (c === "'") out += '&#039;';
      else out += c;
    }
    return out;
  }
}

class AlertView {
  constructor(containerElement) {
    this.container = containerElement;
  }

  show(type, title, message) {
    var icon = '⚠️';
    var alertClass = 'alert-warning';

    if (type === 'danger') {
      icon = '❌';
      alertClass = 'alert-danger';
    } else if (type === 'success') {
      icon = '✅';
      alertClass = 'alert-success';
    } else if (type === 'info') {
      icon = 'ℹ️';
      alertClass = 'alert-info';
    }

    this.container.innerHTML =
      '<div class="alert ' + alertClass + '">' +
        '<div class="alert-icon">' + icon + '</div>' +
        '<div class="alert-content">' +
          '<div class="alert-title">' + HtmlEscaper.escape(title) + '</div>' +
          '<div class="alert-desc">' + HtmlEscaper.escape(message) + '</div>' +
        '</div>' +
      '</div>';
  }

  clear() {
    this.container.innerHTML = '';
  }
}

class ResultView {
  constructor(elements) {
    this.section = elements.resultSection;
    this.statsBar = elements.statsBar;
    this.highlightViewer = elements.highlightViewer;
    this.tableContainer = elements.matchesTableContainer;
    this.tableBody = elements.matchesTableBody;
    this.breakdownList = elements.breakdownList;
  }

  activate() {
    this.section.classList.add('active');
  }

  deactivate() {
    this.section.classList.remove('active');
  }

  renderBreakdown(descriptions) {
    this.breakdownList.innerHTML = '';
    if (descriptions && descriptions.length > 0) {
      for (var d = 0; d < descriptions.length; d++) {
        var item = descriptions[d];
        var li = document.createElement('li');
        li.className = 'breakdown-item';
        li.innerHTML = '<strong>' + HtmlEscaper.escape(item.type) + ':</strong> ' + HtmlEscaper.escape(item.desc);
        this.breakdownList.appendChild(li);
      }
    } else {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'breakdown-item';
      emptyLi.textContent = 'Простое литеральное соответствие';
      this.breakdownList.appendChild(emptyLi);
    }
  }

  renderSuccess(text, foundList) {
    var highlightedHtml = '';
    var lastIdx = 0;

    for (var m = 0; m < foundList.length; m++) {
      var item = foundList[m];
      highlightedHtml += HtmlEscaper.escape(text.substring(lastIdx, item.start));
      highlightedHtml += '<mark class="highlight-match" title="Совпадение #' + (m + 1) + ' (индекс ' + item.start + '-' + item.end + ')">' +
                         HtmlEscaper.escape(text.substring(item.start, item.end)) +
                         '</mark>';
      lastIdx = item.end;
    }
    highlightedHtml += HtmlEscaper.escape(text.substring(lastIdx));
    this.highlightViewer.innerHTML = highlightedHtml;

    this.statsBar.innerHTML =
      '<div class="stat-chip">Статус: <strong style="color: #059669;">Найдено в тексте</strong></div>' +
      '<div class="stat-chip">Количество совпадений: <strong>' + foundList.length + '</strong></div>' +
      '<div class="stat-chip">Длина текста: <strong>' + text.length + ' симв.</strong></div>';

    this.tableContainer.style.display = 'block';
    this.tableBody.innerHTML = '';
    for (var t = 0; t < foundList.length; t++) {
      var row = foundList[t];
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (t + 1) + '</td>' +
        '<td><code>' + HtmlEscaper.escape(row.value) + '</code></td>' +
        '<td>' + row.start + '</td>' +
        '<td>' + row.end + '</td>' +
        '<td>' + (row.end - row.start) + '</td>';
      this.tableBody.appendChild(tr);
    }
  }

  renderNoMatch(text) {
    this.highlightViewer.textContent = text;
    this.tableContainer.style.display = 'none';

    this.statsBar.innerHTML =
      '<div class="stat-chip">Статус: <strong style="color: #d97706;">Отсутствует в тексте</strong></div>' +
      '<div class="stat-chip">Количество совпадений: <strong>0</strong></div>' +
      '<div class="stat-chip">Длина текста: <strong>' + text.length + ' симв.</strong></div>';
  }
}

class RegexAppController {
  constructor() {
    this.presets = {
      'email': {
        pattern: '[a-zA-Z0-9_]+@[a-zA-Z0-9_]+\\.[a-zA-Z]+',
        text: 'Для обратной связи пишите на support@company.ru или отдел продаж: sales@company.com.'
      },
      'phone': {
        pattern: '\\+7-\\d{3}-\\d{3}-\\d{2}-\\d{2}',
        text: 'Основной телефон: +7-999-123-45-67, дополнительный горячей линии: +7-800-555-35-35.'
      },
      'numbers': {
        pattern: '\\d{2,4}',
        text: 'Список идентификаторов: 5, 23, 789, 1024, 99999.'
      },
      'cyrillic': {
        pattern: '[А-Яа-яЁё]+',
        text: 'Лабораторная работа номер 2 по регулярным выражениям.'
      },
      'animals': {
        pattern: '(cat|dog|fox)',
        text: 'The quick brown fox jumps over the lazy dog and the cute cat.'
      },
      'nomatch': {
        pattern: 'дракон',
        text: 'В этом лесу живут только белки, лисы и зайцы.'
      },
      'err-paren': {
        pattern: '(abc|def',
        text: 'Текст с abc и def'
      },
      'err-star': {
        pattern: '*abc',
        text: 'Текст для проверки'
      },
      'err-range': {
        pattern: '[z-a]+',
        text: 'Проверка некорректного диапазона'
      },
      'err-curly': {
        pattern: 'a{5,2}',
        text: 'aaaaa'
      }
    };
  }

  init() {
    this.form = document.getElementById('checker-form');
    this.patternInput = document.getElementById('pattern-input');
    this.textInput = document.getElementById('text-input');
    this.btnClear = document.getElementById('btn-clear');

    this.alertView = new AlertView(document.getElementById('alert-container'));
    this.resultView = new ResultView({
      resultSection: document.getElementById('result-section'),
      statsBar: document.getElementById('stats-bar'),
      highlightViewer: document.getElementById('highlight-viewer'),
      matchesTableContainer: document.getElementById('matches-table-container'),
      matchesTableBody: document.getElementById('matches-table-body'),
      breakdownList: document.getElementById('breakdown-list')
    });

    this.bindEvents();
  }

  bindEvents() {
    var self = this;

    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      self.performCheck();
    });

    this.btnClear.addEventListener('click', function () {
      self.patternInput.value = '';
      self.textInput.value = '';
      self.alertView.clear();
      self.resultView.deactivate();
      self.patternInput.focus();
    });

    var presetBtns = document.querySelectorAll('.preset-btn');
    for (var i = 0; i < presetBtns.length; i++) {
      presetBtns[i].addEventListener('click', function () {
        var presetKey = this.getAttribute('data-preset');
        var preset = self.presets[presetKey];
        if (preset) {
          self.patternInput.value = preset.pattern;
          self.textInput.value = preset.text;
          self.performCheck();
        }
      });
    }
  }

  performCheck() {
    this.alertView.clear();
    this.resultView.deactivate();

    var pattern = this.patternInput.value;
    var text = this.textInput.value;

    // 1. Проверка на пустые строки
    if (pattern.length === 0 && text.length === 0) {
      this.alertView.show('warning', 'Предупреждение: Введены пустые строки', 'Пожалуйста, введите регулярное выражение и текст для проверки.');
      return;
    }
    if (pattern.length === 0) {
      this.alertView.show('warning', 'Предупреждение: Пустая строка выражения', 'Введена пустая строка в поле выражения. Пожалуйста, введите шаблон для проверки на регулярность.');
      return;
    }
    if (text.length === 0) {
      this.alertView.show('warning', 'Предупреждение: Пустая строка текста', 'Введена пустая строка в поле текста. Пожалуйста, введите текст для поиска совпадений.');
      return;
    }

    // 2. Вызов движка регулярных выражений
    var result = CustomRegexEngine.execute(pattern, text);

    if (!result.success) {
      if (result.warningType === 'INVALID_PATTERN') {
        this.alertView.show('danger', 'Предупреждение: Введено не регулярное выражение!', result.message);
      } else {
        this.alertView.show('warning', 'Предупреждение', result.message);
      }
      return;
    }

    // 3. Выражение корректно
    this.resultView.activate();
    this.resultView.renderBreakdown(result.descriptions);

    if (result.hasMatch) {
      this.alertView.show('success', 'Регулярное выражение содержится в тексте', 'Выражение является корректным регулярным выражением. Найдено совпадений: ' + result.matches.length + '.');
      this.resultView.renderSuccess(text, result.matches);
    } else {
      this.alertView.show('warning', 'Регулярное выражение отсутствует в тексте', 'Выражение является корректным регулярным выражением, однако оно НЕ содержится в представленной строке (тексте). Совпадений не обнаружено.');
      this.resultView.renderNoMatch(text);
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var app = new RegexAppController();
  app.init();
});
