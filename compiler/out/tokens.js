"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUnaryOperatorOnly = exports.isUnaryOperator = exports.isOperator = exports.Macro = exports.Label = exports.TemplateStringLiteral = exports.Keyword = exports.Identifier = exports.BooleanLiteral = exports.NumberLiteral = exports.StringLiteral = exports.CharLiteral = exports.Token = exports.TokenType = void 0;
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
    TokenType[TokenType["Import"] = 56] = "Import";
    TokenType[TokenType["Return"] = 57] = "Return";
    TokenType[TokenType["Label"] = 58] = "Label";
    TokenType[TokenType["Macro"] = 59] = "Macro";
    TokenType[TokenType["AtSign"] = 60] = "AtSign";
    TokenType[TokenType["As"] = 61] = "As";
    TokenType[TokenType["Trait"] = 62] = "Trait";
    TokenType[TokenType["Structural"] = 63] = "Structural";
    TokenType[TokenType["Struct"] = 64] = "Struct";
    TokenType[TokenType["Operator"] = 65] = "Operator";
    TokenType[TokenType["Enum"] = 66] = "Enum";
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
function isOperator(type) {
    return type === TokenType.Plus
        || type === TokenType.Minus
        || type === TokenType.DoublePlus
        || type === TokenType.DoubleMinus
        || type === TokenType.Star
        || type === TokenType.DoubleStar
        || type === TokenType.Slash
        || type === TokenType.DoubleEquals
        || type === TokenType.Pipe
        || type === TokenType.DoublePipe
        || type === TokenType.Ampersand
        || type === TokenType.DoubleAmpersand
        || type === TokenType.Xor
        || type === TokenType.LeftAngleBracket
        || type === TokenType.RightAngleBracket
        || type === TokenType.GreaterOrEqual
        || type === TokenType.SmallerOrEqual
        || type === TokenType.LeftShift
        || type === TokenType.RightShift
        || type === TokenType.Tilde
        || type === TokenType.Bang;
}
exports.isOperator = isOperator;
function isUnaryOperator(type) {
    return type === TokenType.Minus
        || type === TokenType.DoublePlus
        || type === TokenType.DoubleMinus
        || type === TokenType.Tilde
        || type === TokenType.Bang;
}
exports.isUnaryOperator = isUnaryOperator;
function isUnaryOperatorOnly(type) {
    return type === TokenType.DoublePlus
        || type === TokenType.DoubleMinus
        || type === TokenType.Tilde
        || type === TokenType.Bang;
}
exports.isUnaryOperatorOnly = isUnaryOperatorOnly;
//# sourceMappingURL=tokens.js.map