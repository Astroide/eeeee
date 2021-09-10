"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
class Parser {
    constructor(source) {
        this.reader = new utilities_1.StringReader(source);
    }
    *parse() {
        let tokens = [];
        parsing: while (!this.reader.done()) {
            let tokenText = this.reader.next();
            if (tokenText) {
                if (tokenText == '/') {
                    if (this.reader.peek() == '/') {
                        while (this.reader.peek() != '\n' && !this.reader.done())
                            this.reader.next();
                        if (!this.reader.done())
                            this.reader.next();
                        continue parsing;
                    }
                    else if (this.reader.peek() == '*') {
                        let depth = 1;
                        while (depth > 0 && !this.reader.done()) {
                            let char = this.reader.next();
                            if (char == '/' && this.reader.peek() == '*') {
                                this.reader.next();
                                depth++;
                            }
                            else if (char == '*' && this.reader.peek() == '/') {
                                this.reader.next();
                                depth--;
                            }
                        }
                        if (this.reader.done() && depth != 0) {
                            (0, utilities_1.panicAt)(this.reader, `[ESCE00001] Comments opened with /* must be closed before EOF.\nNote: there ${depth == 1 ? 'was' : 'were'} ${depth} level${depth == 1 ? '' : 's'} of comment nesting when EOF was reached.`, this.reader.lineCount() - 1, 0, this.reader.getLine(this.reader.lineCount() - 1).slice(0, -1));
                        }
                        continue parsing;
                    }
                }
                if (tokenText == '0') {
                    if (/[0-9]/.test(this.reader.peek())) {
                        // Decimal, warn because of leading zero
                        (0, utilities_1.warnAt)(this.reader, '[ESCW00001] Leading zero in number literal', this.reader.currentLine, this.reader.currentCharacter - 1, '0');
                    }
                    else if (this.reader.peek() == 'x') {
                        let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Hexadecimal
                        this.reader.next();
                        tokenText = '';
                        if (!/[0-9\.A-Fa-f]/.test(this.reader.peek())) {
                            let invalidCharacted = this.reader.next();
                            (0, utilities_1.panicAt)(this.reader, '[ESCE00002] Hexadecimal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                        }
                        tokenText = '';
                        while (this.reader.peek() != '.' && /[0-9A-Fa-f]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[0-9A-Fa-f]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        let value = 0;
                        value += parseInt(tokenText.split('.')[0], 16);
                        if (tokenText.includes('.')) {
                            let decimalPart = tokenText.split('.')[1];
                            for (let i = 0; i < decimalPart.length; i++) {
                                const digit = parseInt(decimalPart[i], 16);
                                value += digit / Math.pow(16, i + 1);
                            }
                        }
                        yield (new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                    else if (this.reader.peek() == 'o') {
                        let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Octal
                        this.reader.next();
                        tokenText = '';
                        if (!/[0-7\.]/.test(this.reader.peek())) {
                            let invalidCharacted = this.reader.next();
                            (0, utilities_1.panicAt)(this.reader, '[ESCE00003] Octal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                        }
                        tokenText = '';
                        while (this.reader.peek() != '.' && /[0-7]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[0-7]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        let value = 0;
                        value += parseInt(tokenText.split('.')[0], 8);
                        if (tokenText.includes('.')) {
                            let decimalPart = tokenText.split('.')[1];
                            for (let i = 0; i < decimalPart.length; i++) {
                                const digit = parseInt(decimalPart[i], 8);
                                value += digit / Math.pow(8, i + 1);
                            }
                        }
                        yield (new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                    else if (this.reader.peek() == 'b') {
                        let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Binary
                        this.reader.next();
                        tokenText = '';
                        if (!/[01\.]/.test(this.reader.peek())) {
                            let invalidCharacted = this.reader.next();
                            (0, utilities_1.panicAt)(this.reader, '[ESCE00007] Binary numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                        }
                        tokenText = '';
                        while (this.reader.peek() != '.' && /[01]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[01]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        let value = 0;
                        value += parseInt(tokenText.split('.')[0], 2);
                        if (tokenText.includes('.')) {
                            let decimalPart = tokenText.split('.')[1];
                            for (let i = 0; i < decimalPart.length; i++) {
                                const digit = parseInt(decimalPart[i], 2);
                                value += digit / Math.pow(2, i + 1);
                            }
                        }
                        yield (new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                }
                decimalParsing: do {
                    if (/[0-9\.]/.test(tokenText)) {
                        let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Decimal
                        while (this.reader.peek() != '.' && /[0-9]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[0-9]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        if (tokenText == '.')
                            break decimalParsing;
                        let value = 0;
                        value += parseInt(tokenText.split('.')[0], 10);
                        if (tokenText.includes('.')) {
                            let decimalPart = tokenText.split('.')[1];
                            for (let i = 0; i < decimalPart.length; i++) {
                                const digit = parseInt(decimalPart[i], 10);
                                value += digit / Math.pow(10, i + 1);
                            }
                        }
                        yield (new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length, value));
                        continue parsing;
                    }
                } while (false);
                if (/('|")/.test(tokenText)) {
                    let delimiter = tokenText;
                    let line = this.reader.currentLine, character = this.reader.currentCharacter - 1, position = this.reader.current - 1;
                    let stringContents = '';
                    while (this.reader.peek() != delimiter && !this.reader.done()) {
                        let char = this.reader.next();
                        if (char != '\\') {
                            stringContents += char;
                        }
                        else {
                            let next = this.reader.next();
                            if (next == '\\') {
                                stringContents += '\\';
                            }
                            else if (next == '\n') {
                                // Nothing here
                            }
                            else if (next == 'n') {
                                stringContents += '\n';
                            }
                            else if (next == "'") {
                                stringContents += "'";
                            }
                            else if (next == '"') {
                                stringContents += '"';
                            }
                            else {
                                (0, utilities_1.panicAt)(this.reader, `[ESCE00006] Invalid escape sequence: \\${next}`, this.reader.currentLine, this.reader.currentCharacter - 2, '\\' + next);
                            }
                        }
                    }
                    if (this.reader.done() && this.reader.peek() != delimiter) {
                        (0, utilities_1.panicAt)(this.reader, "[ESCE00004] Endless string\nString was started here:", line, character, delimiter);
                    }
                    this.reader.next();
                    yield (new tokens_1.StringLiteral(line, character, this.reader.source, position, this.reader.current - position, stringContents));
                    continue parsing;
                }
                if ('+-*=&|<>$/[]{}(),.;'.includes(tokenText)) {
                    let table = {
                        '+': tokens_1.TokenType.Plus,
                        '++': tokens_1.TokenType.DoublePlus,
                        '-': tokens_1.TokenType.Minus,
                        '--': tokens_1.TokenType.DoubleMinus,
                        '*': tokens_1.TokenType.Star,
                        '**': tokens_1.TokenType.DoubleStar,
                        '=': tokens_1.TokenType.Equals,
                        '==': tokens_1.TokenType.DoubleEquals,
                        '&': tokens_1.TokenType.Ampersand,
                        '&&': tokens_1.TokenType.DoubleAmpersand,
                        '|': tokens_1.TokenType.Pipe,
                        '||': tokens_1.TokenType.DoublePipe,
                        '[': tokens_1.TokenType.LeftBracket,
                        ']': tokens_1.TokenType.RightBracket,
                        '{': tokens_1.TokenType.LeftCurlyBracket,
                        '}': tokens_1.TokenType.RightCurlyBracket,
                        '(': tokens_1.TokenType.LeftParen,
                        ')': tokens_1.TokenType.RightParen,
                        '/': tokens_1.TokenType.Slash,
                        ',': tokens_1.TokenType.Comma,
                        '.': tokens_1.TokenType.Dot,
                        ';': tokens_1.TokenType.Semicolon,
                        '<': tokens_1.TokenType.LeftAngleBracket,
                        '>': tokens_1.TokenType.RightAngleBracket,
                        '<=': tokens_1.TokenType.SmallerOrEqual,
                        '>=': tokens_1.TokenType.GreaterOrEqual,
                        '>>': tokens_1.TokenType.RightShift,
                        '<<': tokens_1.TokenType.LeftShift,
                    };
                    while ((tokenText + this.reader.peek()) in table) {
                        tokenText += this.reader.next();
                    }
                    yield (new tokens_1.Token(this.reader.currentLine, this.reader.currentCharacter - tokenText.length, this.reader.source, table[tokenText], this.reader.current - tokenText.length, tokenText.length));
                    continue parsing;
                }
                if (/[a-zA-Z_]/.test(tokenText)) {
                    // Identifier
                    let char = this.reader.currentCharacter - 1, current = this.reader.current - 1;
                    while (!this.reader.done() && /[a-zA-Z_0-9]/.test(this.reader.peek())) {
                        tokenText += this.reader.next();
                    }
                    let keywords = 'fn while for if else continue break'.split(' ');
                    let keywordTokenTypes = {
                        'fn': tokens_1.TokenType.Fn,
                        'while': tokens_1.TokenType.While,
                        'for': tokens_1.TokenType.For,
                        'if': tokens_1.TokenType.If,
                        'else': tokens_1.TokenType.Else,
                        'continue': tokens_1.TokenType.Continue,
                        'break': tokens_1.TokenType.Break
                    };
                    if (keywords.includes(tokenText)) {
                        yield (new tokens_1.Keyword(this.reader.currentLine, char, this.reader.source, current, tokenText.length, keywordTokenTypes[tokenText]));
                    }
                    else {
                        yield (new tokens_1.Identifier(this.reader.currentLine, char, this.reader.source, current, tokenText.length, tokenText));
                    }
                    continue parsing;
                }
                // These should be the last ifs
                if (/\s/.test(tokenText)) {
                    // Whitespace, OK
                    continue parsing;
                }
                // If nothing matched, error
                (0, utilities_1.panicAt)(this.reader, `[ESCE00008] Invalid character : '${tokenText}'`, this.reader.currentLine, this.reader.currentCharacter - 1, tokenText);
            }
        }
        return;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map