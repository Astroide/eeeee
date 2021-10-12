"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keyword = exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.CharLiteral = exports.Token = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["StringLiteral"] = 0] = "StringLiteral";
    TokenType[TokenType["NumericLiteral"] = 1] = "NumericLiteral";
    TokenType[TokenType["BooleanLiteral"] = 2] = "BooleanLiteral";
    TokenType[TokenType["CharacterLiteral"] = 3] = "CharacterLiteral";
    TokenType[TokenType["Pipe"] = 4] = "Pipe";
    TokenType[TokenType["DoublePipe"] = 5] = "DoublePipe";
    TokenType[TokenType["Ampersand"] = 6] = "Ampersand";
    TokenType[TokenType["DoubleAmpersand"] = 7] = "DoubleAmpersand";
    TokenType[TokenType["Xor"] = 8] = "Xor";
    TokenType[TokenType["DoubleXor"] = 9] = "DoubleXor";
    TokenType[TokenType["LeftParenthesis"] = 10] = "LeftParenthesis";
    TokenType[TokenType["RightParenthesis"] = 11] = "RightParenthesis";
    TokenType[TokenType["LeftBracket"] = 12] = "LeftBracket";
    TokenType[TokenType["RightBracket"] = 13] = "RightBracket";
    TokenType[TokenType["LeftCurlyBracket"] = 14] = "LeftCurlyBracket";
    TokenType[TokenType["RightCurlyBracket"] = 15] = "RightCurlyBracket";
    TokenType[TokenType["Identifier"] = 16] = "Identifier";
    TokenType[TokenType["Fn"] = 17] = "Fn";
    TokenType[TokenType["While"] = 18] = "While";
    TokenType[TokenType["For"] = 19] = "For";
    TokenType[TokenType["If"] = 20] = "If";
    TokenType[TokenType["Else"] = 21] = "Else";
    TokenType[TokenType["Continue"] = 22] = "Continue";
    TokenType[TokenType["Break"] = 23] = "Break";
    TokenType[TokenType["Plus"] = 24] = "Plus";
    TokenType[TokenType["Minus"] = 25] = "Minus";
    TokenType[TokenType["DoublePlus"] = 26] = "DoublePlus";
    TokenType[TokenType["DoubleMinus"] = 27] = "DoubleMinus";
    TokenType[TokenType["Star"] = 28] = "Star";
    TokenType[TokenType["DoubleStar"] = 29] = "DoubleStar";
    TokenType[TokenType["Slash"] = 30] = "Slash";
    TokenType[TokenType["Equals"] = 31] = "Equals";
    TokenType[TokenType["DoubleEquals"] = 32] = "DoubleEquals";
    TokenType[TokenType["Comma"] = 33] = "Comma";
    TokenType[TokenType["Dot"] = 34] = "Dot";
    TokenType[TokenType["Semicolon"] = 35] = "Semicolon";
    TokenType[TokenType["LeftAngleBracket"] = 36] = "LeftAngleBracket";
    TokenType[TokenType["RightAngleBracket"] = 37] = "RightAngleBracket";
    TokenType[TokenType["GreaterOrEqual"] = 38] = "GreaterOrEqual";
    TokenType[TokenType["SmallerOrEqual"] = 39] = "SmallerOrEqual";
    TokenType[TokenType["LeftShift"] = 40] = "LeftShift";
    TokenType[TokenType["RightShift"] = 41] = "RightShift";
    TokenType[TokenType["DollarSign"] = 42] = "DollarSign";
    TokenType[TokenType["Const"] = 43] = "Const";
    TokenType[TokenType["Let"] = 44] = "Let";
    TokenType[TokenType["Bang"] = 45] = "Bang";
    TokenType[TokenType["Tilde"] = 46] = "Tilde";
    TokenType[TokenType["NotEquals"] = 47] = "NotEquals";
    TokenType[TokenType["Colon"] = 48] = "Colon";
    TokenType[TokenType["Loop"] = 49] = "Loop";
    TokenType[TokenType["In"] = 50] = "In";
    TokenType[TokenType["Static"] = 51] = "Static";
    TokenType[TokenType["Class"] = 52] = "Class";
    TokenType[TokenType["Public"] = 53] = "Public";
    TokenType[TokenType["Protected"] = 54] = "Protected";
    TokenType[TokenType["Private"] = 55] = "Private";
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
        super(line, char, source, TokenType.CharacterLiteral, start, length);
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