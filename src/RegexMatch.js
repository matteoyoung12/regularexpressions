(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RegexMatch = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

 
  class RegexMatch {
    constructor(start, end, value) {
      this.start = start;
      this.end = end;
      this.value = value;
    }
  }

  return RegexMatch;
}));
