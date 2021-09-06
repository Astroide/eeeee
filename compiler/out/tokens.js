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
exports.Keyword = exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.Token = exports.TokenType = void 0;
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
    TokenType[TokenType["PlusPlus"] = 23] = "PlusPlus";
    TokenType[TokenType["MinusMinus"] = 24] = "MinusMinus";
    TokenType[TokenType["Star"] = 25] = "Star";
    TokenType[TokenType["StarStar"] = 26] = "StarStar";
    TokenType[TokenType["Slash"] = 27] = "Slash";
    TokenType[TokenType["Equals"] = 28] = "Equals";
    TokenType[TokenType["DoubleEquals"] = 29] = "DoubleEquals";
    TokenType[TokenType["Comma"] = 30] = "Comma";
    TokenType[TokenType["Dot"] = 31] = "Dot";
    TokenType[TokenType["Semicolon"] = 32] = "Semicolon";
    TokenType[TokenType["LeftAngleBracket"] = 33] = "LeftAngleBracket";
    TokenType[TokenType["RightAngleBracket"] = 34] = "RightAngleBracket";
    TokenType[TokenType["GreaterOrEqual"] = 35] = "GreaterOrEqual";
    TokenType[TokenType["SmallerOrEqual"] = 36] = "SmallerOrEqual";
    TokenType[TokenType["LeftShift"] = 37] = "LeftShift";
    TokenType[TokenType["RightShift"] = 38] = "RightShift";
})(TokenType || (TokenType = {}));
exports.TokenType = TokenType;
var Token = /** @class */ (function () {
    function Token(line, char, source, type, start, length) {
        this.source = source;
        this.type = type;
        this.start = start;
        this.length = length;
        this.line = line;
        this.char = char;
    }
    Token.prototype.getSource = function () {
        return this.source.substr(this.start, this.length);
    };
    return Token;
}());
exports.Token = Token;
var StringLiteral = /** @class */ (function (_super) {
    __extends(StringLiteral, _super);
    function StringLiteral(line, char, source, start, length, content) {
        var _this = _super.call(this, line, char, source, TokenType.StringLiteral, start, length) || this;
        _this.content = content;
        return _this;
    }
    return StringLiteral;
}(Token));
exports.StringLiteral = StringLiteral;
var NumberLiteral = /** @class */ (function (_super) {
    __extends(NumberLiteral, _super);
    function NumberLiteral(line, char, source, start, length, content) {
        var _this = _super.call(this, line, char, source, TokenType.NumericLiteral, start, length) || this;
        _this.content = content;
        return _this;
    }
    return NumberLiteral;
}(Token));
exports.NumberLiteral = NumberLiteral;
var BooleanLiteral = /** @class */ (function (_super) {
    __extends(BooleanLiteral, _super);
    function BooleanLiteral(line, char, source, start, length, content) {
        var _this = _super.call(this, line, char, source, TokenType.BooleanLiteral, start, length) || this;
        _this.content = content;
        return _this;
    }
    return BooleanLiteral;
}(Token));
exports.BooleanLiteral = BooleanLiteral;
var Identifier = /** @class */ (function (_super) {
    __extends(Identifier, _super);
    function Identifier(line, char, source, start, length, identifier) {
        var _this = _super.call(this, line, char, source, TokenType.Identifier, start, length) || this;
        _this.identifier = identifier;
        return _this;
    }
    return Identifier;
}(Token));
exports.Identifier = Identifier;
var Keyword = /** @class */ (function (_super) {
    __extends(Keyword, _super);
    function Keyword(line, char, source, start, length, keyword) {
        var _this = _super.call(this, line, char, source, TokenType.Identifier, start, length) || this;
        _this.keyword = keyword;
        return _this;
    }
    return Keyword;
}(Token));
exports.Keyword = Keyword;
//# sourceMappingURL=tokens.js.map