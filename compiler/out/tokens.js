"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Macro = exports.Label = exports.TemplateStringLiteral = exports.Keyword = exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.CharLiteral = exports.Token = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    TokenType[TokenType["StringLiteral"] = 0] = "StringLiteral";
    TokenType[TokenType["TemplateStringLiteral"] = 1] = "TemplateStringLiteral";
    TokenType[TokenType["NumericLiteral"] = 2] = "NumericLiteral";
    TokenType[TokenType["BooleanLiteral"] = 3] = "BooleanLiteral";
    TokenType[TokenType["CharacterLiteral"] = 4] = "CharacterLiteral";
    TokenType[TokenType["Pipe"] = 5] = "Pipe";
    TokenType[TokenType["DoublePipe"] = 6] = "DoublePipe";
    TokenType[TokenType["Ampersand"] = 7] = "Ampersand";
    TokenType[TokenType["DoubleAmpersand"] = 8] = "DoubleAmpersand";
    TokenType[TokenType["Xor"] = 9] = "Xor";
    TokenType[TokenType["DoubleXor"] = 10] = "DoubleXor";
    TokenType[TokenType["LeftParenthesis"] = 11] = "LeftParenthesis";
    TokenType[TokenType["RightParenthesis"] = 12] = "RightParenthesis";
    TokenType[TokenType["LeftBracket"] = 13] = "LeftBracket";
    TokenType[TokenType["RightBracket"] = 14] = "RightBracket";
    TokenType[TokenType["LeftCurlyBracket"] = 15] = "LeftCurlyBracket";
    TokenType[TokenType["RightCurlyBracket"] = 16] = "RightCurlyBracket";
    TokenType[TokenType["Identifier"] = 17] = "Identifier";
    TokenType[TokenType["Fn"] = 18] = "Fn";
    TokenType[TokenType["While"] = 19] = "While";
    TokenType[TokenType["For"] = 20] = "For";
    TokenType[TokenType["If"] = 21] = "If";
    TokenType[TokenType["Else"] = 22] = "Else";
    TokenType[TokenType["Continue"] = 23] = "Continue";
    TokenType[TokenType["Break"] = 24] = "Break";
    TokenType[TokenType["Plus"] = 25] = "Plus";
    TokenType[TokenType["Minus"] = 26] = "Minus";
    TokenType[TokenType["DoublePlus"] = 27] = "DoublePlus";
    TokenType[TokenType["DoubleMinus"] = 28] = "DoubleMinus";
    TokenType[TokenType["Star"] = 29] = "Star";
    TokenType[TokenType["DoubleStar"] = 30] = "DoubleStar";
    TokenType[TokenType["Slash"] = 31] = "Slash";
    TokenType[TokenType["Equals"] = 32] = "Equals";
    TokenType[TokenType["DoubleEquals"] = 33] = "DoubleEquals";
    TokenType[TokenType["Comma"] = 34] = "Comma";
    TokenType[TokenType["Dot"] = 35] = "Dot";
    TokenType[TokenType["Semicolon"] = 36] = "Semicolon";
    TokenType[TokenType["LeftAngleBracket"] = 37] = "LeftAngleBracket";
    TokenType[TokenType["RightAngleBracket"] = 38] = "RightAngleBracket";
    TokenType[TokenType["GreaterOrEqual"] = 39] = "GreaterOrEqual";
    TokenType[TokenType["SmallerOrEqual"] = 40] = "SmallerOrEqual";
    TokenType[TokenType["LeftShift"] = 41] = "LeftShift";
    TokenType[TokenType["RightShift"] = 42] = "RightShift";
    TokenType[TokenType["DollarSign"] = 43] = "DollarSign";
    TokenType[TokenType["Const"] = 44] = "Const";
    TokenType[TokenType["Let"] = 45] = "Let";
    TokenType[TokenType["Bang"] = 46] = "Bang";
    TokenType[TokenType["Tilde"] = 47] = "Tilde";
    TokenType[TokenType["NotEquals"] = 48] = "NotEquals";
    TokenType[TokenType["Colon"] = 49] = "Colon";
    TokenType[TokenType["Loop"] = 50] = "Loop";
    TokenType[TokenType["In"] = 51] = "In";
    TokenType[TokenType["Static"] = 52] = "Static";
    TokenType[TokenType["Class"] = 53] = "Class";
    TokenType[TokenType["Public"] = 54] = "Public";
    TokenType[TokenType["Protected"] = 55] = "Protected";
    TokenType[TokenType["Private"] = 56] = "Private";
    TokenType[TokenType["Import"] = 57] = "Import";
    TokenType[TokenType["Return"] = 58] = "Return";
    TokenType[TokenType["Label"] = 59] = "Label";
    TokenType[TokenType["Macro"] = 60] = "Macro";
    TokenType[TokenType["AtSign"] = 61] = "AtSign";
    TokenType[TokenType["As"] = 62] = "As";
    TokenType[TokenType["Trait"] = 63] = "Trait";
    TokenType[TokenType["Structural"] = 64] = "Structural";
    TokenType[TokenType["Struct"] = 65] = "Struct";
    TokenType[TokenType["Operator"] = 66] = "Operator";
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
class TemplateStringLiteral extends Token {
    constructor(line, char, source, start, length, contents) {
        super(line, char, source, TokenType.TemplateStringLiteral, start, length);
        this.contents = contents;
    }
}
exports.TemplateStringLiteral = TemplateStringLiteral;
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
class Macro extends Token {
    constructor(line, char, source, start, length, identifier) {
        super(line, char, source, TokenType.Macro, start, length);
        this.identifier = identifier;
    }
}
exports.Macro = Macro;
class Keyword extends Token {
    constructor(line, char, source, start, length, keyword) {
        super(line, char, source, keyword, start, length);
        this.keyword = keyword;
    }
}
exports.Keyword = Keyword;
class Label extends Token {
    constructor(line, char, source, start, length, labelText) {
        super(line, char, source, TokenType.Label, start, length);
        this.labelText = labelText;
    }
}
exports.Label = Label;
//# sourceMappingURL=tokens.js.map