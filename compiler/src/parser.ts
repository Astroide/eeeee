import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier } from "./tokens";
class StringReader {
    source: string;
    current: number;
    constructor(source: string) {
        this.source = source;
        this.current = 0;
    }
    next(): string {
        return this.source[this.current++];
    }
    peek(): string {
        return this.source[this.current];
    }
    peekSome(number: number): string {
        return this.source.slice(this.current, this.current + number);
    }
}

export class Parser {
    reader: StringReader;
    constructor(source: string) {
        this.reader = new StringReader(source);
    }
    parse(): Token[] {
        let tokens: Token[] = [];

        return tokens;
    }
}