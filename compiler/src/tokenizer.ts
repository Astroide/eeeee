import { Parser } from './parser';
import { TokenType, Token, CharLiteral, StringLiteral, NumberLiteral, Identifier, Keyword, TemplateStringElement, TemplateStringLiteral, Label, Macro } from './tokens';
import { StringReader, warnAt, panicAt } from './utilities';

export type TokenStream = { gen: Generator<Token | string, void, unknown>, setRaw: (boolean) => void };
export class Tokenizer {
    reader: StringReader;
    constructor(source: string) {
        this.reader = new StringReader(source);
    }
    tokenize(): TokenStream {
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
                                    } else if (next == '`') {
                                        stringContents += '`';
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
                        if (/`/.test(tokenText)) {
                            const line = self.reader.currentLine, character = self.reader.currentCharacter - 1, position = self.reader.current - 1;
                            let currentPart: TemplateStringElement = {
                                data: null
                            };
                            let firstPart = currentPart;
                            let isFirstIteration = true;
                            let currentData = '';
                            while (self.reader.peek() != '`') {
                                if (!isFirstIteration) {
                                    let char = '';
                                    char = self.reader.next();
                                    if (char == '\\') {
                                        const next = self.reader.next();
                                        if (next == '\\') {
                                            currentData += '\\';
                                        } else if (next == '`') {
                                            currentData += '`';
                                        } else if (next == '"') {
                                            currentData += '"';
                                        } else if (next == '\n') {
                                            // Nothing here
                                        } else if (next == '\'') {
                                            currentData += '\'';
                                        } else if (next == '$' && self.reader.peek() == '{') {
                                            currentData += '${';
                                            self.reader.next();
                                        } else if (next == '$') {
                                            currentData += '$';
                                            warnAt(self.reader, '[ESCW00003] Dollar signs \'$\' are not required to be escaped within template strings if they aren\'t followed by a \'{\'', self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + next);
                                        } else {
                                            panicAt(self.reader, `[ESCE00006] Invalid escape sequence: \\${next}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + next);
                                        }
                                    } else {
                                        currentData += char;
                                    }
                                }
                                isFirstIteration = false;
                                if (self.reader.peekSome(2) == '${') {
                                    if (currentData.length > 1) {
                                        const newPart = {
                                            data: currentData
                                        };
                                        if (firstPart.data == null) {
                                            firstPart = newPart;
                                            currentPart = newPart;
                                        } else {
                                            currentPart.next = newPart;
                                            currentPart = newPart;
                                        }
                                        currentData = '';
                                    }
                                    self.reader.next();
                                    self.reader.next();
                                    const tokenizer = new Tokenizer(self.reader.source);
                                    tokenizer.reader = self.reader;
                                    const parser = new Parser(tokenizer.tokenize(), self.reader);
                                    const newPart: TemplateStringElement = {
                                        data: parser.getExpression(0)
                                    };
                                    self.reader.current--;
                                    self.reader.currentCharacter--;
                                    if (self.reader.currentCharacter < 0) {
                                        self.reader.currentLine--;
                                        self.reader.currentCharacter = self.reader.getLine(self.reader.currentLine).length - 1;
                                    }
                                    if (!firstPart.data) {
                                        firstPart = newPart;
                                        currentPart = newPart;
                                    } else {
                                        currentPart.next = newPart;
                                        currentPart = newPart;
                                    }
                                    if (self.reader.next() != '}') {
                                        panicAt(self.reader, '[ESCE00020] Expected \'}\' after expression in template string', self.reader.currentLine, self.reader.currentCharacter, self.reader.peek());
                                    }
                                }
                            }
                            if (currentData.length > 1) {
                                const newPart = {
                                    data: currentData
                                };
                                if (firstPart.data == null) {
                                    firstPart = newPart;
                                    currentPart = newPart;
                                } else {
                                    currentPart.next = newPart;
                                    currentPart = newPart;
                                }
                            }
                            self.reader.next();
                            yield (new TemplateStringLiteral(line, character, self.reader.source, position, self.reader.current - position, firstPart));
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
                                } else if (escaped == '`') {
                                    charContents += '`';
                                } else if (escaped == '"') {
                                    charContents += '"';
                                } else {
                                    panicAt(self.reader, `[ESCE00006] Invalid escape sequence: \\${escaped}`, self.reader.currentLine, self.reader.currentCharacter - 2, '\\' + escaped);
                                }
                            }
                            yield (new CharLiteral(line, character, self.reader.source, position, self.reader.current - position, charContents));
                            continue parsing;
                        }
                        if ('+-*=&|<>$/[]{}(),.;~!:@'.includes(tokenText)) {
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
                                '(': TokenType.LeftParenthesis,
                                ')': TokenType.RightParenthesis,
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
                                '!': TokenType.Bang,
                                '~': TokenType.Tilde,
                                '!=': TokenType.NotEquals,
                                ':': TokenType.Colon,
                                '@': TokenType.AtSign
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
                            const keywordTokenTypes = {
                                'fn': TokenType.Fn,
                                'while': TokenType.While,
                                'for': TokenType.For,
                                'if': TokenType.If,
                                'else': TokenType.Else,
                                'continue': TokenType.Continue,
                                'break': TokenType.Break,
                                'let': TokenType.Let,
                                'const': TokenType.Const,
                                'loop': TokenType.Loop,
                                'in': TokenType.In,
                                'static': TokenType.Static,
                                'class': TokenType.Class,
                                'private': TokenType.Private,
                                'protected': TokenType.Protected,
                                'public': TokenType.Public,
                                'import': TokenType.Import,
                                'return': TokenType.Return,
                                'as': TokenType.As,
                                'trait': TokenType.Trait,
                                'structural': TokenType.Structural,
                                'struct': TokenType.Struct,
                                'operator': TokenType.Operator,
                            };
                            const keywords = Object.keys(keywordTokenTypes);
                            if (/!/.test(self.reader.peek())) {
                                tokenText += self.reader.next();
                                yield (new Macro(self.reader.currentLine, char, self.reader.source, current, tokenText.length, tokenText));
                            } else {
                                if (keywords.includes(tokenText)) {
                                    yield (new Keyword(self.reader.currentLine, char, self.reader.source, current, tokenText.length, keywordTokenTypes[tokenText]));
                                } else {
                                    yield (new Identifier(self.reader.currentLine, char, self.reader.source, current, tokenText.length, tokenText));
                                }
                            }
                            continue parsing;
                        }

                        if (/#/.test(tokenText)) {
                            const line = self.reader.currentLine, char = self.reader.currentCharacter, current = self.reader.current;
                            let labelText = '';
                            while (!self.reader.done() && /[a-zA-Z_0-9]/.test(self.reader.peek())) {
                                const character = self.reader.next();
                                tokenText += character;
                                labelText += character;
                            }
                            if (labelText.length == 0 || /[0-9]/.test(labelText[0])) {
                                panicAt(self.reader, '[ESCE00021] A label started by \'#\' is required to contain at least one character except the \'#\', and the first of these characters is required to be an ASCII letter or underscore (/[A-Za-z_]/).', line, char, '#');
                            }
                            yield (new Label(line, char, '#' + labelText, current, labelText.length + 1, labelText));
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