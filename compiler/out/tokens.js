"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.Token = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["StringLiteral"] = 0] = "StringLiteral";
    TokenType[TokenType["NumericLiteral"] = 1] = "NumericLiteral";
    TokenType[TokenType["BooleanLiteral"] = 2] = "BooleanLiteral";
    TokenType[TokenType["Pipe"] = 3] = "Pipe";
    TokenType[TokenType["DoublePipe"] = 4] = "DoublePipe";
    TokenType[TokenType["Ampersand"] = 5] = "Ampersand";
    TokenType[TokenType["DoubleAmpersand"] = 6] = "DoubleAmpersand";
    TokenType[TokenType["Xor"] = 7] = "Xor";
    TokenType[TokenType["DoubleXor"] = 8] = "DoubleXor";
    TokenType[TokenType["LeftParen"] = 9] = "LeftParen";
    TokenType[TokenType["RightParen"] = 10] = "RightParen";
    TokenType[TokenType["LeftBracket"] = 11] = "LeftBracket";
    TokenType[TokenType["RightBracket"] = 12] = "RightBracket";
    TokenType[TokenType["LeftCurlyBracket"] = 13] = "LeftCurlyBracket";
    TokenType[TokenType["RightCurlyBracket"] = 14] = "RightCurlyBracket";
    TokenType[TokenType["Identifier"] = 15] = "Identifier";
    TokenType[TokenType["Fn"] = 16] = "Fn";
    TokenType[TokenType["While"] = 17] = "While";
    TokenType[TokenType["For"] = 18] = "For";
    TokenType[TokenType["If"] = 19] = "If";
    TokenType[TokenType["Else"] = 20] = "Else";
    TokenType[TokenType["Plus"] = 21] = "Plus";
    TokenType[TokenType["Minus"] = 22] = "Minus";
    TokenType[TokenType["Star"] = 23] = "Star";
    TokenType[TokenType["Slash"] = 24] = "Slash";
    TokenType[TokenType["Equals"] = 25] = "Equals";
    TokenType[TokenType["DoubleEquals"] = 26] = "DoubleEquals";
    TokenType[TokenType["Comma"] = 27] = "Comma";
    TokenType[TokenType["Dot"] = 28] = "Dot";
    TokenType[TokenType["Semicolon"] = 29] = "Semicolon";
    TokenType[TokenType["LeftAngleBracket"] = 30] = "LeftAngleBracket";
    TokenType[TokenType["RightAngleBracket"] = 31] = "RightAngleBracket";
    TokenType[TokenType["GreaterOrEqual"] = 32] = "GreaterOrEqual";
    TokenType[TokenType["SmallerOrEqual"] = 33] = "SmallerOrEqual";
})(TokenType || (TokenType = {}));
exports.TokenType = TokenType;
var Token = /** @class */ (function () {
    function Token(source, type, start, length) {
        this.source = source;
        this.type = type;
        this.start = start;
        this.length = length;
    }
    Token.prototype.getSource = function () {
        return this.source.substr(this.start, this.length);
    };
    return Token;
}());
exports.Token = Token;
var StringLiteral = /** @class */ (function (_super) {
    __extends(StringLiteral, _super);
    function StringLiteral(source, type, start, length, content) {
        var _this = _super.call(this, source, type, start, length) || this;
        _this.content = content;
        return _this;
    }
    return StringLiteral;
}(Token));
exports.StringLiteral = StringLiteral;
var NumberLiteral = /** @class */ (function (_super) {
    __extends(NumberLiteral, _super);
    function NumberLiteral(source, type, start, length, content) {
        var _this = _super.call(this, source, type, start, length) || this;
        _this.content = content;
        return _this;
    }
    return NumberLiteral;
}(Token));
exports.NumberLiteral = NumberLiteral;
var BooleanLiteral = /** @class */ (function (_super) {
    __extends(BooleanLiteral, _super);
    function BooleanLiteral(source, type, start, length, content) {
        var _this = _super.call(this, source, type, start, length) || this;
        _this.content = content;
        return _this;
    }
    return BooleanLiteral;
}(Token));
exports.BooleanLiteral = BooleanLiteral;
var Identifier = /** @class */ (function (_super) {
    __extends(Identifier, _super);
    function Identifier(source, type, start, length, identifier) {
        var _this = _super.call(this, source, type, start, length) || this;
        _this.identifier = identifier;
        return _this;
    }
    return Identifier;
}(Token));
exports.Identifier = Identifier;
