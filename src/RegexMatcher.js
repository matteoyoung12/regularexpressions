(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./RegexMatch'));
  } else {
    root.RegexMatcher = factory(root.RegexMatch);
  }
}(typeof self !== 'undefined' ? self : this, function (RegexMatch) {
  'use strict';

 
  class RegexMatcher {
    constructor(ast) {
      this.ast = ast;
    }

    findAll(text) {
      var matches = [];
      var i = 0;
      var textLen = text.length;

      while (i <= textLen) {
        var bestEnd = null;

        this.ast.testAt(text, i, function (endPos) {
          bestEnd = endPos;
          return endPos;
        });

        if (bestEnd !== null) {
          var matchedSubstring = text.substring(i, bestEnd);
          matches.push(new RegexMatch(i, bestEnd, matchedSubstring));

          if (bestEnd > i) {
            i = bestEnd;
          } else {
            i += 1;
          }
        } else {
          i += 1;
        }
      }

      return matches;
    }
  }

  return RegexMatcher;
}));
