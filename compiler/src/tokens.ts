import { Expression } from './parser';

enum TokenType {
    StringLiteral,
    TemplateStringLiteral,
    NumericLiteral,
    BooleanLiteral,
    CharacterLiteral,
    Pipe,
    DoublePipe,
    Ampersand,
    DoubleAmpersand,
    Xor,
    LeftParenthesis,
    RightParenthesis,
    LeftBracket,
    RightBracket,
    LeftCurlyBracket,
    RightCurlyBracket,
    Identifier,
    Fn,
    While,
    For,
    If,
    Else,
    Continue,
    Break,
    Plus,
    Minus,
    DoublePlus,
    DoubleMinus,
    Star,
    DoubleStar,
    Slash,
    Equals,
    DoubleEquals,
    Comma,
    Dot,
    Semicolon,
    LeftAngleBracket,
    RightAngleBracket,
    GreaterOrEqual,
    SmallerOrEqual,
    LeftShift,
    RightShift,
    DollarSign,
    Const,
    Let,
    Bang,
    Tilde,
    NotEquals,
    Colon,
    Loop,
    In,
    Static,
    Class,
    Public,
    Protected,
    Private,
    Import,
    Return,
    Label,
    Macro,
    AtSign,
    As,
    Trait,
    Structural,
    Struct,
    Operator,
    Enum,
}

class Token {
    type: TokenType;
    start: number;
    length: number;
    source: string;
    line: number;
    char: number;
    constructor(line: number, char: number, source: string, type: TokenType, start: number, length: number) {
        this.source = source;
        this.type = type;
        this.start = start;
        this.length = length;
        this.line = line;
        this.char = char;
    }

    getSource(): string {
        return this.source.substr(this.start, this.length);
    }
}

class StringLiteral extends Token {
    content: string;
    constructor(line: number, char: number, source: string, start: number, length: number, content: string) {
        super(line, char, source, TokenType.StringLiteral, start, length);
        this.content = content;
    }
}

type TemplateStringElement = {
    data: Expression | string;
    next?: TemplateStringElement;
};

class TemplateStringLiteral extends Token {
    contents: TemplateStringElement;
    constructor(line: number, char: number, source: string, start: number, length: number, contents: TemplateStringElement) {
        super(line, char, source, TokenType.TemplateStringLiteral, start, length);
        this.contents = contents;
    }
}

class CharLiteral extends Token {
    content: string;
    constructor(line: number, char: number, source: string, start: number, length: number, content: string) {
        super(line, char, source, TokenType.CharacterLiteral, start, length);
        this.content = content;
    }
}

class NumberLiteral extends Token {
    content: number;
    constructor(line: number, char: number, source: string, start: number, length: number, content: number) {
        super(line, char, source, TokenType.NumericLiteral, start, length);
        this.content = content;
    }
}

class BooleanLiteral extends Token {
    content: boolean;
    constructor(line: number, char: number, source: string, start: number, length: number, content: boolean) {
        super(line, char, source, TokenType.BooleanLiteral, start, length);
        this.content = content;
    }
}

class Identifier extends Token {
    identifier: string;
    constructor(line: number, char: number, source: string, start: number, length: number, identifier: string) {
        super(line, char, source, TokenType.Identifier, start, length);
        this.identifier = identifier;
    }
}

class Macro extends Token {
    identifier: string;
    constructor(line: number, char: number, source: string, start: number, length: number, identifier: string) {
        super(line, char, source, TokenType.Macro, start, length);
        this.identifier = identifier;
    }
}

class Keyword extends Token {
    keyword: TokenType;
    constructor(line: number, char: number, source: string, start: number, length: number, keyword: TokenType) {
        super(line, char, source, keyword, start, length);
        this.keyword = keyword;
    }
}

class Label extends Token {
    labelText: string;
    constructor(line: number, char: number, source: string, start: number, length: number, labelText: string) {
        super(line, char, source, TokenType.Label, start, length);
        this.labelText = labelText;
    }
}

function isOperator(type: TokenType): boolean {
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

function isUnaryOperator(type: TokenType): boolean {
    return type === TokenType.Minus
        || type === TokenType.DoublePlus
        || type === TokenType.DoubleMinus
        || type === TokenType.Tilde
        || type === TokenType.Bang;
}

function isUnaryOperatorOnly(type: TokenType): boolean {
    return type === TokenType.DoublePlus
        || type === TokenType.DoubleMinus
        || type === TokenType.Tilde
        || type === TokenType.Bang;
}

export { TokenType, Token, CharLiteral, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword, TemplateStringLiteral, TemplateStringElement, Label, Macro, isOperator, isUnaryOperator, isUnaryOperatorOnly };

