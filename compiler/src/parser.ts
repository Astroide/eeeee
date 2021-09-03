import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier } from "./tokens";
import { warn, StringReader } from "./utilities";

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