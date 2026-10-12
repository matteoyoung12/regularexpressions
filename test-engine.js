/**
 * Comprehensive test suite for CustomRegexEngine
 */
const fs = require('fs');
const engine = require('./regex-engine.js');

console.log('=== ТЕСТИРОВАНИЕ КАСТОМНОГО ДВИЖКА РЕГУЛЯРНЫХ ВЫРАЖЕНИЙ ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, detail) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} - ${detail || 'Условие не выполнено'}`);
  }
}

// 1. ПРОВЕРКА ОТСУТСТВИЯ REGEX В ИСХОДНОМ КОДЕ
console.log('--- 1. Проверка отсутствия встроенных regex в коде ---');
const engineCode = fs.readFileSync('./regex-engine.js', 'utf8');
const appCode = fs.readFileSync('./app.js', 'utf8');

assert(engineCode.indexOf('new RegExp') === -1 && engineCode.indexOf('RegExp(') === -1, 'В regex-engine.js отсутствует RegExp');
assert(engineCode.indexOf('.match(') === -1, 'В regex-engine.js отсутствует .match()');
assert(engineCode.indexOf('.search(') === -1, 'В regex-engine.js отсутствует .search()');

assert(appCode.indexOf('new RegExp') === -1 && appCode.indexOf('RegExp(') === -1, 'В app.js отсутствует RegExp');
assert(appCode.indexOf('.match(') === -1, 'В app.js отсутствует .match()');
assert(appCode.indexOf('.search(') === -1, 'В app.js отсутствует .search()');

const srcFiles = fs.readdirSync('./src');
srcFiles.forEach(file => {
  const code = fs.readFileSync(`./src/${file}`, 'utf8');
  assert(code.indexOf('new RegExp') === -1 && code.indexOf('RegExp(') === -1, `В src/${file} отсутствует RegExp`);
  assert(code.indexOf('.match(') === -1, `В src/${file} отсутствует .match()`);
  assert(code.indexOf('.search(') === -1, `В src/${file} отсутствует .search()`);
});

// 2. ПРОВЕРКА ПУСТЫХ СТРОК (Требование лабы: выдать предупреждающее сообщение)
console.log('\n--- 2. Проверка валидации пустых строк ---');
const emptyPatternRes = engine.execute('', 'some text');
assert(!emptyPatternRes.success && emptyPatternRes.warningType === 'EMPTY_PATTERN', 'Предупреждение при пустом выражении');

const emptyTextRes = engine.execute('abc', '');
assert(!emptyTextRes.success && emptyTextRes.warningType === 'EMPTY_TEXT', 'Предупреждение при пустом тексте');

// 3. ПРОВЕРКА СИНТАКСИСА: НЕ РЕГУЛЯРНЫЕ ВЫРАЖЕНИЯ (Требование лабы: предупреждение)
console.log('\n--- 3. Проверка синтаксических ошибок (не регулярные выражения) ---');

const invalidCases = [
  { pattern: '*abc', desc: 'Висящий квантификатор * в начале' },
  { pattern: '+abc', desc: 'Висящий квантификатор + в начале' },
  { pattern: '?abc', desc: 'Висящий квантификатор ? в начале' },
  { pattern: '{2}abc', desc: 'Висящий квантификатор {2} в начале' },
  { pattern: '(abc', desc: 'Не закрыта круглая скобка (' },
  { pattern: 'abc)', desc: 'Лишняя закрывающая круглая скобка )' },
  { pattern: '[a-z', desc: 'Не закрыта квадратная скобка [' },
  { pattern: '[]', desc: 'Пустой класс символов []' },
  { pattern: '[^]', desc: 'Пустой инвертированный класс [^]' },
  { pattern: '[z-a]', desc: 'Некорректный диапазон z-a (начало > конца)' },
  { pattern: 'a{5,2}', desc: 'Некорректный диапазон в квантификаторе {5,2}' },
  { pattern: 'a{abc}', desc: 'Нечисловой квантификатор {abc}' },
  { pattern: 'a{}', desc: 'Пустой квантификатор {}' },
  { pattern: 'a{3', desc: 'Не закрыта фигурная скобка {' },
  { pattern: 'abc\\', desc: 'Одиночный обратный слэш в конце строки' },
  { pattern: 'a|*b', desc: 'Квантификатор сразу после |' },
  { pattern: 'a**', desc: 'Два квантификатора подряд' },
  { pattern: 'a|', desc: 'Пустая правая ветвь альтернативы' },
  { pattern: '|a', desc: 'Пустая левая ветвь альтернативы' }
];

invalidCases.forEach(c => {
  const res = engine.execute(c.pattern, 'sample text');
  assert(!res.success && res.warningType === 'INVALID_PATTERN', `Корректное обнаружение ошибки: ${c.desc} ("${c.pattern}")`, res.message);
});

// 4. ПРОВЕРКА КОРРЕКТНЫХ РЕГУЛЯРНЫХ ВЫРАЖЕНИЙ И ПОИСКА
console.log('\n--- 4. Проверка корректных регулярных выражений и поиска ---');

// Литералы
const litRes = engine.execute('cat', 'the cat sat on the mat and another cat');
assert(litRes.success && litRes.matches.length === 2 && litRes.matches[0].value === 'cat' && litRes.matches[1].value === 'cat', 'Поиск литералов cat (2 совпадения)');

// Точка
const dotRes = engine.execute('c.t', 'cat cot czt cut');
assert(dotRes.success && dotRes.matches.length === 4, 'Точка (.) сопоставляет любой символ');

// Классы символов и диапазоны
const classRes = engine.execute('[0-9]+', 'Item 123 costs 45 rubles');
assert(classRes.success && classRes.matches.length === 2 && classRes.matches[0].value === '123' && classRes.matches[1].value === '45', 'Диапазон цифр [0-9]+');

// Инвертированный класс
const negClassRes = engine.execute('[^0-9]+', '123abc456');
assert(negClassRes.success && negClassRes.matches.length === 1 && negClassRes.matches[0].value === 'abc', 'Инвертированный класс [^0-9]+');

// Предопределенные классы \d, \w, \s
const predefRes = engine.execute('\\d{2,4}', 'Code 7, 42, 108, 2024, 99999');
assert(predefRes.success && predefRes.matches.length === 4, 'Квантификатор {2,4} с \\d');

// Альтернатива и скобки
const altRes = engine.execute('(cat|dog)', 'I have a dog and a cat');
assert(altRes.success && altRes.matches.length === 2 && altRes.matches[0].value === 'dog' && altRes.matches[1].value === 'cat', 'Альтернатива (cat|dog)');

// Кириллица
const cyrRes = engine.execute('[А-Яа-яЁё]+', 'Привет, мир 123!');
assert(cyrRes.success && cyrRes.matches.length === 2 && cyrRes.matches[0].value === 'Привет' && cyrRes.matches[1].value === 'мир', 'Поиск кириллических слов');

// Жадность и бэктрекинг
const greedyRes = engine.execute('a.*b', 'axxbxxb');
assert(greedyRes.success && greedyRes.matches.length === 1 && greedyRes.matches[0].value === 'axxbxxb', 'Жадный бэктрекинг a.*b');

// Якоря ^ и $
const anchorStart = engine.execute('^hello', 'hello world\nhello again');
assert(anchorStart.success && anchorStart.matches.length === 1 && anchorStart.matches[0].start === 0, 'Якорь начала строки ^');

const anchorEnd = engine.execute('world$', 'hello world');
assert(anchorEnd.success && anchorEnd.matches.length === 1 && anchorEnd.matches[0].value === 'world', 'Якорь конца строки $');

// 5. ПРОВЕРКА ОТСУТСТВИЯ СОВПАДЕНИЙ (Требование лабы: сообщение об отсутствии)
console.log('\n--- 5. Проверка отсутствия совпадений в тексте ---');
const noMatchRes = engine.execute('elephant', 'there is a tiger in the jungle');
assert(noMatchRes.success && !noMatchRes.hasMatch && noMatchRes.matches.length === 0, 'Корректно определяется отсутствие совпадения');

console.log(`\n========================================`);
console.log(`ИТОГО: Пройдено ${passedTests} из ${totalTests} тестов.`);
if (passedTests === totalTests) {
  console.log('ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!');
  process.exit(0);
} else {
  console.error('НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!');
  process.exit(1);
}
