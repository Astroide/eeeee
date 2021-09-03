enum TokenType {
    StringLiteral,
    NumericLiteral,
    BooleanLiteral,
    Pipe,
    DoublePipe,
    Ampersand,
    DoubleAmpersand,
    Xor,
    DoubleXor,
    LeftParen,
    RightParen,
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
    Plus,
    Minus,
    Star,
    Slash,
    Equals,
    DoubleEquals,
    Comma,
    Dot,
    Semicolon,
    LeftAngleBracket,
    RightAngleBracket,
    GreaterOrEqual,
    SmallerOrEqual
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
    constructor(line: number, char: number, source: string, type: TokenType, start: number, length: number, content: string) {
        super(line, char, source, type, start, length);
        this.content = content;
    }
}

class NumberLiteral extends Token {
    content: number;
    constructor(line: number, char: number, source: string, type: TokenType, start: number, length: number, content: number) {
        super(line, char, source, type, start, length);
        this.content = content;
    }
}

class BooleanLiteral extends Token {
    content: boolean;
    constructor(line: number, char: number, source: string, type: TokenType, start: number, length: number, content: boolean) {
        super(line, char, source, type, start, length);
        this.content = content;
    }
}

class Identifier extends Token {
    identifier: string;
    constructor(line: number, char: number, source: string, type: TokenType, start: number, length: number, identifier: string) {
        super(line, char, source, type, start, length);
        this.identifier = identifier;
    }
}

export { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier };