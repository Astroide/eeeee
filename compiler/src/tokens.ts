enum TokenType {
    StringLiteral,
    NumericLiteral,
    BooleanLiteral,
    CharacterLiteral,
    Pipe,
    DoublePipe,
    Ampersand,
    DoubleAmpersand,
    Xor,
    DoubleXor,
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
    NotEquals
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

class Keyword extends Token {
    keyword: TokenType;
    constructor(line: number, char: number, source: string, start: number, length: number, keyword: TokenType) {
        super(line, char, source, keyword, start, length);
        this.keyword = keyword;
    }
}

export { TokenType, Token, CharLiteral, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword };