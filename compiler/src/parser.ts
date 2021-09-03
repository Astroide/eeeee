import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier } from "./tokens";
import { StringReader, warnAt, panicAt } from "./utilities";

export class Parser {
    reader: StringReader;
    constructor(source: string) {
        this.reader = new StringReader(source);
    }
    parse(): Token[] {
        let tokens: Token[] = [];
        while (!this.reader.done()) {
            let tokenText: string = this.reader.next();
            if (tokenText)
                if (tokenText == '/') {
                    if (this.reader.peek() == '/') {
                        while (this.reader.peek() != '\n') this.reader.next();
                        this.reader.next();
                        continue;
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
                            panicAt(this.reader, `Comments opened with /* must be closed before EOF.\nNote: there ${depth == 1 ? 'was' : 'were'} ${depth} level${depth == 1 ? '' : 's'} of comment nesting when EOF was reached.`, this.reader.lineCount() - 1, 0, this.reader.getLine(this.reader.lineCount() - 1).slice(0, -1));
                        }
                    }
                } else {
                    if (tokenText == '0') {
                        if (/[0-9]/.test(this.reader.peek())) {
                            // Decimal, warn because of leading zero
                            warnAt(this.reader, 'Leading zero in number literal', this.reader.currentLine, this.reader.currentCharacter - 1, '0');
                        } else if (this.reader.peek() == 'x') {
                            // Hexadecimal
                        }
                    }
                }
        }
        return tokens;
    }
}