"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keyword = exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.CharLiteral = exports.Token = exports.TokenType = void 0;
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
    TokenType[TokenType["Continue"] = 21] = "Continue";
    TokenType[TokenType["Break"] = 22] = "Break";
    TokenType[TokenType["Plus"] = 23] = "Plus";
    TokenType[TokenType["Minus"] = 24] = "Minus";
    TokenType[TokenType["DoublePlus"] = 25] = "DoublePlus";
    TokenType[TokenType["DoubleMinus"] = 26] = "DoubleMinus";
    TokenType[TokenType["Star"] = 27] = "Star";
    TokenType[TokenType["DoubleStar"] = 28] = "DoubleStar";
    TokenType[TokenType["Slash"] = 29] = "Slash";
    TokenType[TokenType["Equals"] = 30] = "Equals";
    TokenType[TokenType["DoubleEquals"] = 31] = "DoubleEquals";
    TokenType[TokenType["Comma"] = 32] = "Comma";
    TokenType[TokenType["Dot"] = 33] = "Dot";
    TokenType[TokenType["Semicolon"] = 34] = "Semicolon";
    TokenType[TokenType["LeftAngleBracket"] = 35] = "LeftAngleBracket";
    TokenType[TokenType["RightAngleBracket"] = 36] = "RightAngleBracket";
    TokenType[TokenType["GreaterOrEqual"] = 37] = "GreaterOrEqual";
    TokenType[TokenType["SmallerOrEqual"] = 38] = "SmallerOrEqual";
    TokenType[TokenType["LeftShift"] = 39] = "LeftShift";
    TokenType[TokenType["RightShift"] = 40] = "RightShift";
    TokenType[TokenType["DollarSign"] = 41] = "DollarSign";
    TokenType[TokenType["Const"] = 42] = "Const";
    TokenType[TokenType["Let"] = 43] = "Let";
})(TokenType || (TokenType = {}));
exports.TokenType = TokenType;
class Token {
    constructor(line, char, source, type, start, length) {
        this.source = source;
        this.type = type;
        this.start = start;
        this.length = length;
        this.line = line;
        this.char = char;
    }
    getSource() {
        return this.source.substr(this.start, this.length);
    }
}
exports.Token = Token;
class StringLiteral extends Token {
    constructor(line, char, source, start, length, content) {
        super(line, char, source, TokenType.StringLiteral, start, length);
        this.content = content;
    }
}
exports.StringLiteral = StringLiteral;
class CharLiteral extends Token {
    constructor(line, char, source, start, length, content) {
        super(line, char, source, TokenType.StringLiteral, start, length);
        this.content = content;
    }
}
exports.CharLiteral = CharLiteral;
class NumberLiteral extends Token {
    constructor(line, char, source, start, length, content) {
        super(line, char, source, TokenType.NumericLiteral, start, length);
        this.content = content;
    }
}
exports.NumberLiteral = NumberLiteral;
class BooleanLiteral extends Token {
    constructor(line, char, source, start, length, content) {
        super(line, char, source, TokenType.BooleanLiteral, start, length);
        this.content = content;
    }
}
exports.BooleanLiteral = BooleanLiteral;
class Identifier extends Token {
    constructor(line, char, source, start, length, identifier) {
        super(line, char, source, TokenType.Identifier, start, length);
        this.identifier = identifier;
    }
}
exports.Identifier = Identifier;
class Keyword extends Token {
    constructor(line, char, source, start, length, keyword) {
        super(line, char, source, keyword, start, length);
        this.keyword = keyword;
    }
}
exports.Keyword = Keyword;
//# sourceMappingURL=tokens.js.map