"use strict";
exports.__esModule = true;
exports.Parser = void 0;
var StringReader = /** @class */ (function () {
    function StringReader(source) {
        this.source = source;
        this.current = 0;
    }
    StringReader.prototype.next = function () {
        return this.source[this.current++];
    };
    StringReader.prototype.peek = function () {
        return this.source[this.current];
    };
    StringReader.prototype.peekSome = function (number) {
        return this.source.slice(this.current, this.current + number);
    };
    return StringReader;
}());
var Parser = /** @class */ (function () {
    function Parser(source) {
        this.reader = new StringReader(source);
    }
    Parser.prototype.parse = function () {
        var tokens = [];
        return tokens;
    };
    return Parser;
}());
exports.Parser = Parser;
