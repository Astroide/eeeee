import { tokenTypeExplanations } from './explanations';
import { TokenStream } from './tokenizer';
import { Token, TokenType } from './tokens';
import { panicAt, StringReader } from './utilities';

class PeekableTokenStream {
    private stream: TokenStream;
    private nextTokens: Token[] = [];
    reader: StringReader;

    constructor(stream: TokenStream, reader: StringReader) {
        this.stream = stream;
        this.reader = reader;
    }

    next(): Token {
        if (this.nextTokens.length > 0) {
            return this.nextTokens.shift();
        } else {
            return <Token>this.stream.gen.next().value;
        }
    }

    peek(): Token {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(<Token>this.stream.gen.next().value);
        return this.nextTokens[0];
    }

    match(type: TokenType): boolean {
        const next = this.peek();
        return next.type == type;
    }

    consume(type: TokenType, message: string) {
        const next = this.next();
        if (next.type != type) {
            panicAt(this.reader, `[ESCE00010] Expected TokenType.${TokenType[type]}${tokenTypeExplanations.has(type) ? ` (${tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
    }
}

interface PrefixSubparser {
    parse(parser: Parser, token: Token): Expression;
}

interface InfixSubparser {
    parse(parser: Parser, left: Expression, token: Token): Expression;
}

class IdentifierSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): Expression {
        return new IdentifierExpression(token.getSource());
    }
}

class PrefixOperatorSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): Expression {
        const operand: Expression = parser.getExpression();
        return new PrefixOperatorExpression(token.type, operand);
    }
}

class InfixOperatorSubparser implements InfixSubparser {
    parse(parser: Parser, left: Expression, token: Token): Expression {
        const right = parser.getExpression();
        return new InfixOperatorExpression(token.type, left, right);
    }
}

class Expression { }

class IdentifierExpression extends Expression {
    id: string;
    constructor(id: string) {
        super();
        this.id = id;
    }
}

class PrefixOperatorExpression {
    operator: TokenType;
    operand: Expression;
    constructor(operator: TokenType, operand: Expression) {
        this.operator = operator;
        this.operand = operand;
    }
}

class InfixOperatorExpression extends Expression {
    operator: TokenType;
    leftOperand: Expression;
    rightOperand: Expression;
    constructor(operator: TokenType, left: Expression, right: Expression) {
        super();
        this.operator = operator;
        this.leftOperand = left;
        this.rightOperand = right;
    }
}

export class Parser {
    tokenSource: PeekableTokenStream;
    prefixSubparsers: Map<TokenType, PrefixSubparser> = new Map();
    infixSubparsers: Map<TokenType, InfixSubparser> = new Map();
    constructor(source: TokenStream, reader: StringReader) {
        this.tokenSource = new PeekableTokenStream(source, reader);
        this.registerPrefix(TokenType.Identifier, new IdentifierSubparser());
        this.registerPrefix(TokenType.Plus, new PrefixOperatorSubparser());
        this.registerPrefix(TokenType.Minus, new PrefixOperatorSubparser());
        this.registerPrefix(TokenType.Tilde, new PrefixOperatorSubparser());
        this.registerPrefix(TokenType.Bang, new PrefixOperatorSubparser());
    }

    registerPrefix(type: TokenType, subparser: PrefixSubparser): void {
        this.prefixSubparsers.set(type, subparser);
    }

    registerInfix(type: TokenType, subparser: InfixSubparser): void {
        this.infixSubparsers.set(type, subparser);
    }

    getExpression(): Expression {
        const token: Token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type)) {
            panicAt(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}'`, token.line, token.char, token.getSource());
        }
        return this.prefixSubparsers.get(token.type).parse(this, token);
    }
}