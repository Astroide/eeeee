import { TokenType, Token, CharLiteral, StringLiteral, NumberLiteral, Identifier, Keyword } from './tokens';
import { StringReader, warnAt, panicAt } from './utilities';

export type TokenGenerator = { gen: Generator<Token | string, void, unknown>, setRaw: (boolean) => void };
export class Tokenizer {
    reader: StringReader;
    constructor(source: string) {
        this.reader = new StringReader(source);
    }
    tokenize(): TokenGenerator {
        const self = this;
        let raw = false;
        return {
            setRaw: value => {
                raw = value;
            },
            gen: ((function* () {
                parsing: while (!self.reader.done()) {
                    let tokenText: string = self.reader.next();
                    if (raw) {
                        yield tokenText;
                        continue parsing;
                    }
                    if (tokenText) {
                        if (tokenText == '/') {
                            if (self.reader.peek() == '/') {
                                while (self.reader.peek() != '\n' && !self.reader.done()) self.reader.next();
                                if (!self.reader.done()) self.reader.next();
                                continue parsing;
                            } else if (self.reader.peek() == '*') {
                                let depth = 1;
                                while (depth > 0 && !self.reader.done()) {
                                    const char = self.reader.next();
                                    if (char == '/' && self.reader.peek() == '*') {
                                        self.reader.next();
                                        depth++;
                                    } else if (char == '*' && self.reader.peek() == '/') {
                                        self.reader.next();
                                        depth--;
                                    }
                                }
                                if (self.reader.done() && depth != 0) {
                                    panicAt(self.reader, `[ESCE00001] Comments opened with /* must be closed before EOF.\nNote: there ${depth == 1 ? 'was' : 'were'} ${depth} level${depth == 1 ? '' : 's'} of comment nesting when EOF was reached.`, self.reader.lineCount() - 1, 0, self.reader.getLine(self.reader.lineCount() - 1).slice(0, -1));
                                }
                                continue parsing;
                            }
                        }
                        if (tokenText == '0') {
                            if (/[0-9]/.test(self.reader.peek())) {
                                // Decimal, warn because of leading zero
                                warnAt(self.reader, '[ESCW00001] Leading zero in number literal', self.reader.currentLine, self.reader.currentCharacter - 1, '0');
                            } else if (self.reader.peek() == 'x') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Hexadecimal
                                self.reader.next();
                                tokenText = '';
                                if (!/[0-9.A-Fa-f]/.test(self.reader.peek())) {
                                    const invalidCharacted: string = self.reader.next();
                                    panicAt(self.reader, '[ESCE00002] Hexadecimal numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
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
                                yield (new NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
                                continue parsing;
                            } else if (self.reader.peek() == 'o') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Octal
                                self.reader.next();
                                tokenText = '';
                                if (!/[0-7.]/.test(self.reader.peek())) {
                                    const invalidCharacted: string = self.reader.next();
                                    panicAt(self.reader, '[ESCE00003] Octal numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
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
                                yield (new NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
                                continue parsing;
                            } else if (self.reader.peek() == 'b') {
                                const line = self.reader.currentLine, char = self.reader.currentCharacter - 1, start = self.reader.current - 1;
                                // Binary
                                self.reader.next();
                                tokenText = '';
                                if (!/[01.]/.test(self.reader.peek())) {
                                    const invalidCharacted: string = self.reader.next();
                                    panicAt(self.reader, '[ESCE00007] Binary numbers must contain at least one digit', self.reader.currentLine, self.reader.currentCharacter - 1, invalidCharacted);
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
                                yield (new NumberLiteral(line, char, self.reader.source, start, tokenText.length + 2, value));
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
                                if (tokenText == '.') break decimalParsing;
                                let value = 0;
                                value += parseInt(tokenText.split('.')[0], 10);
                                if (tokenText.includes('.')) {
                                    const decimalPart = tokenText.split('.')[1];
                                    for (let i = 0; i < decimalPart.length; i++) {
                                        const digit = parseInt(decimalPart[i], 10);
                                        value += digit / Math.pow(10, i + 1);
                                    }
                                }
                                yield (new NumberLiteral(line, char, self.reader.source, start, tokenText.length, value));
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
                                } else {
                                    const next = self.reader.next();
                                    if (next == '\\') {
                                        stringContents += '\\';
                                    } else if (next == '\n') {
                                        // Nothing here
                                    } else if (next == 'n') {
                                        stringContents += '\n';
                                    } else if (next == '\'') {
                                        stringContents += '\'';
                                    } else if (next == '"') {
                                        stringContents += '"';
                                    } else {
                                        panicAt(self.reader, `[ESCE00006] Invalid escape sequence: \\${next}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + next);
                                    }
                                }
                            }
                            if (self.reader.done() && self.reader.peek() != delimiter) {
                                panicAt(self.reader, '[ESCE00004] Endless string\nString was started here:', line, character, delimiter);
                            }
                            self.reader.next();
                            yield (new StringLiteral(line, character, self.reader.source, position, self.reader.current - position, stringContents));
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
                                } else if (escaped == '\n') {
                                    panicAt(self.reader, '[ESCE00009] Cannot escape a newline in a character literal', line, character, '\\');
                                } else if (escaped == 'n') {
                                    charContents += '\n';
                                } else if (escaped == '\'') {
                                    charContents += '\'';
                                } else if (escaped == '"') {
                                    charContents += '"';
                                } else {
                                    panicAt(self.reader, `[ESCE00006] Invalid escape sequence: \\${escaped}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + escaped);
                                }
                            }
                            yield (new CharLiteral(line, character, self.reader.source, position, self.reader.current - position, charContents));
                            continue parsing;
                        }
                        if ('+-*=&|<>$/[]{}(),.;'.includes(tokenText)) {
                            const table = {
                                '+': TokenType.Plus,
                                '++': TokenType.DoublePlus,
                                '-': TokenType.Minus,
                                '--': TokenType.DoubleMinus,
                                '*': TokenType.Star,
                                '**': TokenType.DoubleStar,
                                '=': TokenType.Equals,
                                '==': TokenType.DoubleEquals,
                                '&': TokenType.Ampersand,
                                '&&': TokenType.DoubleAmpersand,
                                '|': TokenType.Pipe,
                                '||': TokenType.DoublePipe,
                                '[': TokenType.LeftBracket,
                                ']': TokenType.RightBracket,
                                '{': TokenType.LeftCurlyBracket,
                                '}': TokenType.RightCurlyBracket,
                                '(': TokenType.LeftParen,
                                ')': TokenType.RightParen,
                                '/': TokenType.Slash,
                                ',': TokenType.Comma,
                                '.': TokenType.Dot,
                                ';': TokenType.Semicolon,
                                '<': TokenType.LeftAngleBracket,
                                '>': TokenType.RightAngleBracket,
                                '<=': TokenType.SmallerOrEqual,
                                '>=': TokenType.GreaterOrEqual,
                                '>>': TokenType.RightShift,
                                '<<': TokenType.LeftShift,

                            };
                            while ((tokenText + self.reader.peek()) in table) {
                                tokenText += self.reader.next();
                            }
                            yield (new Token(self.reader.currentLine, self.reader.currentCharacter - tokenText.length, self.reader.source, table[tokenText], self.reader.current - tokenText.length, tokenText.length));
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
                                'fn': TokenType.Fn,
                                'while': TokenType.While,
                                'for': TokenType.For,
                                'if': TokenType.If,
                                'else': TokenType.Else,
                                'continue': TokenType.Continue,
                                'break': TokenType.Break
                            };
                            if (keywords.includes(tokenText)) {
                                yield (new Keyword(self.reader.currentLine, char, self.reader.source, current, tokenText.length, keywordTokenTypes[tokenText]));
                            } else {
                                yield (new Identifier(self.reader.currentLine, char, self.reader.source, current, tokenText.length, tokenText));
                            }
                            continue parsing;
                        }

                        // These should be the last ifs
                        if (/\s/.test(tokenText)) {
                            // Whitespace, OK
                            continue parsing;
                        }

                        // If nothing matched, error
                        panicAt(self.reader, `[ESCE00008] Invalid character : '${tokenText}'`, self.reader.currentLine, self.reader.currentCharacter - 1, tokenText);
                    }
                }
                return;
            })())
        };
    }
}