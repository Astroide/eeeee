import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword } from "./tokens";
import { StringReader, warnAt, panicAt } from "./utilities";

export class Parser {
    reader: StringReader;
    constructor(source: string) {
        this.reader = new StringReader(source);
    }
    parse(): Token[] {
        let tokens: Token[] = [];
        parsing: while (!this.reader.done()) {
            let tokenText: string = this.reader.next();
            if (tokenText)
                if (tokenText == '/') {
                    if (this.reader.peek() == '/') {
                        while (this.reader.peek() != '\n' && !this.reader.done()) this.reader.next();
                        if (!this.reader.done()) this.reader.next();
                        continue parsing;
                    } else if (this.reader.peek() == '*') {
                        let depth = 1;
                        while (depth > 0 && !this.reader.done()) {
                            let char = this.reader.next();
                            if (char == '/' && this.reader.peek() == '*') {
                                this.reader.next();
                                depth++;
                            } else if (char == '*' && this.reader.peek() == '/') {
                                this.reader.next();
                                depth--;
                            }
                        }
                        if (this.reader.done() && depth != 0) {
                            panicAt(this.reader, `[ESCE00001] Comments opened with /* must be closed before EOF.\nNote: there ${depth == 1 ? 'was' : 'were'} ${depth} level${depth == 1 ? '' : 's'} of comment nesting when EOF was reached.`, this.reader.lineCount() - 1, 0, this.reader.getLine(this.reader.lineCount() - 1).slice(0, -1));
                        }
                        continue parsing;
                    }
                } else {
                    if (tokenText == '0') {
                        if (/[0-9]/.test(this.reader.peek())) {
                            // Decimal, warn because of leading zero
                            warnAt(this.reader, '[ESCW00001] Leading zero in number literal', this.reader.currentLine, this.reader.currentCharacter - 1, '0');
                        } else if (this.reader.peek() == 'x') {
                            let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                            // Hexadecimal
                            this.reader.next();
                            tokenText = '';
                            if (!/[0-9\.A-Fa-f]/.test(this.reader.peek())) {
                                let invalidCharacted: string = this.reader.next();
                                panicAt(this.reader, '[ESCE00002] Hexadecimal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
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
                            let value: number = 0;
                            value += parseInt(tokenText.split('.')[0], 16);
                            if (tokenText.includes('.')) {
                                let decimalPart = tokenText.split('.')[1];
                                for (let i = 0; i < decimalPart.length; i++) {
                                    const digit = parseInt(decimalPart[i], 16);
                                    value += digit / Math.pow(16, i + 1);
                                }
                            }
                            tokens.push(new NumberLiteral(line, char, '0x' + tokenText, start, tokenText.length + 2, value));
                            continue parsing;
                        } else if (this.reader.peek() == 'o') {
                            let line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                            // Octal
                            this.reader.next();
                            tokenText = '';
                            if (!/[0-7\.]/.test(this.reader.peek())) {
                                let invalidCharacted: string = this.reader.next();
                                panicAt(this.reader, '[ESCE00003] Octal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
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
                            let value: number = 0;
                            value += parseInt(tokenText.split('.')[0], 8);
                            if (tokenText.includes('.')) {
                                let decimalPart = tokenText.split('.')[1];
                                for (let i = 0; i < decimalPart.length; i++) {
                                    const digit = parseInt(decimalPart[i], 8);
                                    value += digit / Math.pow(8, i + 1);
                                }
                            }
                            tokens.push(new NumberLiteral(line, char, '0o' + tokenText, start, tokenText.length + 2, value));
                            continue parsing;
                        }
                    }
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
                        let value: number = 0;
                        value += parseInt(tokenText.split('.')[0], 10);
                        if (tokenText.includes('.')) {
                            let decimalPart = tokenText.split('.')[1];
                            for (let i = 0; i < decimalPart.length; i++) {
                                const digit = parseInt(decimalPart[i], 10);
                                value += digit / Math.pow(10, i + 1);
                            }
                        }
                        tokens.push(new NumberLiteral(line, char, tokenText, start, tokenText.length, value));
                        continue parsing;
                    }
                    if (/('|")/.test(tokenText)) {
                        let delimiter = tokenText;
                        let line = this.reader.currentLine, character = this.reader.currentCharacter - 1, position = this.reader.current - 1;
                        let stringContents = '';
                        while (this.reader.peek() != delimiter && !this.reader.done()) {
                            let char = this.reader.next();
                            if (char != '\\') {
                                stringContents += char;
                            } else {
                                let next = this.reader.next();
                                if (next == '\\') {
                                    stringContents += '\\';
                                } else if (next == '\n') {
                                    // Nothing here
                                } else if (next == 'n') {
                                    stringContents += '\n';
                                } else if (next == "'") {
                                    stringContents += "'";
                                } else if (next == '"') {
                                    stringContents += '"';
                                } else {
                                    panicAt(this.reader, `[ESCE00006] Invalid escape sequence: \\${next}`, this.reader.currentLine, this.reader.currentCharacter - 2, '\\' + next);
                                }
                            }
                        }
                        if (this.reader.done() && this.reader.peek() != delimiter) {
                            panicAt(this.reader, "[ESCE00004] Endless string\nString was started here:", line, character, delimiter);
                        }
                        this.reader.next();
                        tokens.push(new StringLiteral(line, character, this.reader.source.slice(position, this.reader.current), position, this.reader.current - position, stringContents));
                        continue parsing;
                    }
                }
        }
        return tokens;
    }
}