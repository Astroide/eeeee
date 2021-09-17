"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
class Parser {
    constructor(source) {
        this.reader = new utilities_1.StringReader(source);
    }
    parse() {
        const self = this;
        let raw = false;
        return {
            setRaw: value => {
                raw = value;
            },
            gen: ((function* () {
                parsing: while (!self.reader.done()) {
                    let tokenText = self.reader.next();
                    if (raw) {
                        yield tokenText;
                        continue parsing;
                    }
                    if (tokenText) {
                        if (tokenText == '/') {
                            if (self.reader.peek() == '/') {
                                while (self.reader.peek() != '\n' && !self.reader.done())
                                    self.reader.next();
                                if (!self.reader.done())
                                    self.reader.next();
                                continue parsing;
                            }
                            else if (self.reader.peek() == '*') {
                                let depth = 1;
                                while (depth > 0 && !self.reader.done()) {
                                    const char = self.reader.next();
                                    if (char == '/' && self.reader.peek() == '*') {
                                        self.reader.next();
                                        depth++;
                                    }
                                    else if (char == '*' && self.reader.peek() == '/') {
                                        self.reader.next();
                                        depth--;
                                    }
                                }
                                if (self.reader.done() && depth != 0) {
                                    (0, utilities_1.panicAt)(self.reader, `[ESCE00001] Comments opened with /* must be closed before EOF.\nNote: there ${depth == 1 ? 'was' : 'were'} ${depth} level${depth == 1 ? '' : 's'} of comment nesting when EOF was reached.`, self.reader.lineCount() - 1, 0, self.reader.getLine(self.reader.lineCount() - 1).slice(0, -1));
                                }
                                continue parsing;
                            }
                        }
                        if (tokenText == '0') {
                            if (/[0-9]/.test(self.reader.peek())) {
                                // Decimal, warn because of leading zero
                                (0, utilities_1.warnAt)(self.reader, '[ESCW00001] Leading zero in number literal', self.reader.currentLine, self.reader.currentCharacter - 1, '0');
                            }
                            else if (self.reader.peek() == 'x') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Hexadecimal
                                self.reader.next();
                                tokenText = '';
                                if (!/[0-9.A-Fa-f]/.test(self.reader.peek())) {
                                    const invalidCharacted = self.reader.next();
                                    (0, utilities_1.panicAt)(self.reader, '[ESCE00002] Hexadecimal numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
                                }
                                tokenText = '';
                                while (self.reader.peek() != '.' && /[0-9A-Fa-f]/.test(self.reader.peek())) {
                                    tokenText += self.reader.next();
                                }
                                if (self.reader.peek() == '.') {
                                    tokenText += '.';
                                    self.reader.next();
                                    while (/[0-9A-Fa-f]/.test(self.reader.peek())) {
                                        tokenText += self.reader.next();
                                    }
                                }
                                let value = 0;
                                value += parseInt(tokenText.split('.')[0], 16);
                                if (tokenText.includes('.')) {
                                    const decimalPart = tokenText.split('.')[1];
                                    for (let i = 0; i < decimalPart.length; i++) {
                                        const digit = parseInt(decimalPart[i], 16);
                                        value += digit / Math.pow(16, i + 1);
                                    }
                                }
                                yield (new tokens_1.NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
                                continue parsing;
                            }
                            else if (self.reader.peek() == 'o') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Octal
                                self.reader.next();
                                tokenText = '';
                                if (!/[0-7.]/.test(self.reader.peek())) {
                                    const invalidCharacted = self.reader.next();
                                    (0, utilities_1.panicAt)(self.reader, '[ESCE00003] Octal numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
                                }
                                tokenText = '';
                                while (self.reader.peek() != '.' && /[0-7]/.test(self.reader.peek())) {
                                    tokenText += self.reader.next();
                                }
                                if (self.reader.peek() == '.') {
                                    tokenText += '.';
                                    self.reader.next();
                                    while (/[0-7]/.test(self.reader.peek())) {
                                        tokenText += self.reader.next();
                                    }
                                }
                                let value = 0;
                                value += parseInt(tokenText.split('.')[0], 8);
                                if (tokenText.includes('.')) {
                                    const decimalPart = tokenText.split('.')[1];
                                    for (let i = 0; i < decimalPart.length; i++) {
                                        const digit = parseInt(decimalPart[i], 8);
                                        value += digit / Math.pow(8, i + 1);
                                    }
                                }
                                yield (new tokens_1.NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
                                continue parsing;
                            }
                            else if (self.reader.peek() == 'b') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Binary
                                self.reader.next();
                                tokenText = '';
                                if (!/[01.]/.test(self.reader.peek())) {
                                    const invalidCharacted = self.reader.next();
                                    (0, utilities_1.panicAt)(self.reader, '[ESCE00007] Binary numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
                                }
                                tokenText = '';
                                while (self.reader.peek() != '.' && /[01]/.test(self.reader.peek())) {
                                    tokenText += self.reader.next();
                                }
                                if (self.reader.peek() == '.') {
                                    tokenText += '.';
                                    self.reader.next();
                                    while (/[01]/.test(self.reader.peek())) {
                                        tokenText += self.reader.next();
                                    }
                                }
                                let value = 0;
                                value += parseInt(tokenText.split('.')[0], 2);
                                if (tokenText.includes('.')) {
                                    const decimalPart = tokenText.split('.')[1];
                                    for (let i = 0; i < decimalPart.length; i++) {
                                        const digit = parseInt(decimalPart[i], 2);
                                        value += digit / Math.pow(2, i + 1);
                                    }
                                }
                                yield (new tokens_1.NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
                                continue parsing;
                            }
                        }
                        decimalParsing: do {
                            if (/[0-9.]/.test(tokenText)) {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Decimal
                                while (self.reader.peek() != '.' && /[0-9]/.test(self.reader.peek())) {
                                    tokenText += self.reader.next();
                                }
                                if (self.reader.peek() == '.') {
                                    tokenText += '.';
                                    self.reader.next();
                                    while (/[0-9]/.test(self.reader.peek())) {
                                        tokenText += self.reader.next();
                                    }
                                }
                                if (tokenText == '.')
                                    break decimalParsing;
                                let value = 0;
                                value += parseInt(tokenText.split('.')[0], 10);
                                if (tokenText.includes('.')) {
                                    const decimalPart = tokenText.split('.')[1];
                                    for (let i = 0; i < decimalPart.length; i++) {
                                        const digit = parseInt(decimalPart[i], 10);
                                        value += digit / Math.pow(10, i + 1);
                                    }
                                }
                                yield (new tokens_1.NumberLiteral(line, char, self.reader.source, start, tokenText.length, value));
                                continue parsing;
                            }
                        } while (false);
                        if (/"/.test(tokenText)) {
                            const delimiter = tokenText;
                            const line = self.reader.currentLine, character = self.reader.currentCharacter - 1, position = self.reader.current - 1;
                            let stringContents = '';
                            while (self.reader.peek() != delimiter && !self.reader.done()) {
                                const char = self.reader.next();
                                if (char != '\\') {
                                    stringContents += char;
                                }
                                else {
                                    const next = self.reader.next();
                                    if (next == '\\') {
                                        stringContents += '\\';
                                    }
                                    else if (next == '\n') {
                                        // Nothing here
                                    }
                                    else if (next == 'n') {
                                        stringContents += '\n';
                                    }
                                    else if (next == '\'') {
                                        stringContents += '\'';
                                    }
                                    else if (next == '"') {
                                        stringContents += '"';
                                    }
                                    else {
                                        (0, utilities_1.panicAt)(self.reader, `[ESCE00006] Invalid escape sequence: \\${next}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + next);
                                    }
                                }
                            }
                            if (self.reader.done() && self.reader.peek() != delimiter) {
                                (0, utilities_1.panicAt)(self.reader, '[ESCE00004] Endless string\nString was started here:', line, character, delimiter);
                            }
                            self.reader.next();
                            yield (new tokens_1.StringLiteral(line, character, self.reader.source, position, self.reader.current - position, stringContents));
                            continue parsing;
                        }
                        if (/'/.test(tokenText)) {
                            const line = self.reader.currentLine, character = self.reader.currentCharacter - 1, position = self.reader.current - 1;
                            let charContents = self.reader.next();
                            if (charContents == '\\') {
                                charContents = '';
                                const escaped = self.reader.next();
                                if (escaped == '\\') {
                                    charContents += '\\';
                                }
                                else if (escaped == '\n') {
                                    (0, utilities_1.panicAt)(self.reader, '[ESCE00009] Cannot escape a newline in a character literal', line, character, '\\');
                                }
                                else if (escaped == 'n') {
                                    charContents += '\n';
                                }
                                else if (escaped == '\'') {
                                    charContents += '\'';
                                }
                                else if (escaped == '"') {
                                    charContents += '"';
                                }
                                else {
                                    (0, utilities_1.panicAt)(self.reader, `[ESCE00006] Invalid escape sequence: \\${escaped}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + escaped);
                                }
                            }
                            yield (new tokens_1.CharLiteral(line, character, self.reader.source, position, self.reader.current - position, charContents));
                            continue parsing;
                        }
                        if ('+-*=&|<>$/[]{}(),.;'.includes(tokenText)) {
                            const table = {
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
                            while ((tokenText + self.reader.peek()) in table) {
                                tokenText += self.reader.next();
                            }
                            yield (new tokens_1.Token(self.reader.currentLine, self.reader.currentCharacter - tokenText.length, self.reader.source, table[tokenText], self.reader.current - tokenText.length, tokenText.length));
                            continue parsing;
                        }
                        if (/[a-zA-Z_]/.test(tokenText)) {
                            // Identifier
                            const char = self.reader.currentCharacter - 1, current = self.reader.current - 1;
                            while (!self.reader.done() && /[a-zA-Z_0-9]/.test(self.reader.peek())) {
                                tokenText += self.reader.next();
                            }
                            const keywords = 'fn while for if else continue break'.split(' ');
                            const keywordTokenTypes = {
                                'fn': tokens_1.TokenType.Fn,
                                'while': tokens_1.TokenType.While,
                                'for': tokens_1.TokenType.For,
                                'if': tokens_1.TokenType.If,
                                'else': tokens_1.TokenType.Else,
                                'continue': tokens_1.TokenType.Continue,
                                'break': tokens_1.TokenType.Break
                            };
                            if (keywords.includes(tokenText)) {
                                yield (new tokens_1.Keyword(self.reader.currentLine, char, self.reader.source, current, tokenText.length, keywordTokenTypes[tokenText]));
                            }
                            else {
                                yield (new tokens_1.Identifier(self.reader.currentLine, char, self.reader.source, current, tokenText.length, tokenText));
                            }
                            continue parsing;
                        }
                        // These should be the last ifs
                        if (/\s/.test(tokenText)) {
                            // Whitespace, OK
                            continue parsing;
                        }
                        // If nothing matched, error
                        (0, utilities_1.panicAt)(self.reader, `[ESCE00008] Invalid character : '${tokenText}'`, self.reader.currentLine, self.reader.currentCharacter - 1, tokenText);
                    }
                }
                return;
            })())
        };
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map