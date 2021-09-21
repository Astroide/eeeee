import { tokenTypeExplanations } from './explanations';
import { TokenStream } from './tokenizer';
import { BooleanLiteral, CharLiteral, NumberLiteral, StringLiteral, Token, TokenType } from './tokens';
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

class GroupSubparser implements PrefixSubparser {
    parse(parser: Parser, _token: Token): Expression {
        const inside = parser.getExpression();
        parser.tokenSource.consume(TokenType.RightParen, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }

}

class Expression { }

class GroupExpression extends Expression {
    content: Expression;
    constructor(content: Expression) {
        super();
        this.content = content;
    }

    toString(): string {
        return `GroupExpression::<${this.content.toString()}>`;
    }
}

class IdentifierExpression extends Expression {
    id: string;
    constructor(id: string) {
        super();
        this.id = id;
    }

    toString(): string {
        return `Identifier[${this.id}]`;
    }
}

class LiteralExpression extends Expression {
    value: string | number | boolean;
    type: TokenType.NumericLiteral | TokenType.BooleanLiteral | TokenType.StringLiteral | TokenType.CharacterLiteral;
    constructor(value: string | number | boolean, type: TokenType.NumericLiteral | TokenType.BooleanLiteral | TokenType.StringLiteral | TokenType.CharacterLiteral) {
        super();
        this.value = value;
        this.type = type;
    }

    toString(): string {
        return `${TokenType[this.type]}[${this.value}]`;
    }
}

class LiteralSubparser implements PrefixSubparser {
    parse(_parser: Parser, token: Token): Expression {
        if (token.type == TokenType.CharacterLiteral)
            return new LiteralExpression((<CharLiteral>token).content, TokenType.CharacterLiteral);
        else if (token.type == TokenType.StringLiteral)
            return new LiteralExpression((<StringLiteral>token).content, TokenType.StringLiteral);
        else if (token.type == TokenType.NumericLiteral)
            return new LiteralExpression((<NumberLiteral>token).content, TokenType.NumericLiteral);
        else if (token.type == TokenType.BooleanLiteral)
            return new LiteralExpression((<BooleanLiteral>token).content, TokenType.BooleanLiteral);
    }
}

class PropertyAccessExpression extends Expression {
    object: Expression;
    property: string;
    constructor(object: Expression, property: string) {
        super();
        this.object = object;
        this.property = property;
    }

    toString(): string {
        return `PropertyAccess::<${this.object.toString()}, ${this.property}>`;
    }
}

class PropertyAccessSubparser implements InfixSubparser {
    parse(parser: Parser, left: Expression, _token: Token): Expression {
        return new PropertyAccessExpression(left, parser.tokenSource.next().getSource());
    }
}

class PrefixOperatorExpression {
    operator: TokenType;
    operand: Expression;
    constructor(operator: TokenType, operand: Expression) {
        this.operator = operator;
        this.operand = operand;
    }

    toString(): string {
        return TokenType[this.operator] + '.prefix::<' + this.operand.toString() + '>';
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

    toString(): string {
        return `${TokenType[this.operator]}.infix::<${this.leftOperand.toString()}, ${this.rightOperand.toString()}>`;
    }
}

export class Parser {
    tokenSource: PeekableTokenStream;
    prefixSubparsers: Map<TokenType, PrefixSubparser> = new Map();
    infixSubparsers: Map<TokenType, InfixSubparser> = new Map();
    constructor(source: TokenStream, reader: StringReader) {
        this.tokenSource = new PeekableTokenStream(source, reader);
        this.registerPrefix(TokenType.Identifier, new IdentifierSubparser());
        const self = this;
        [TokenType.Plus, TokenType.Minus, TokenType.Tilde, TokenType.Bang].forEach(type => {
            self.registerPrefix(type, new PrefixOperatorSubparser());
        });
        [TokenType.BooleanLiteral, TokenType.CharacterLiteral, TokenType.StringLiteral, TokenType.NumericLiteral].forEach(type => {
            self.registerPrefix(type, new LiteralSubparser());
        });
        this.registerPrefix(TokenType.LeftParen, new GroupSubparser());
        [
            TokenType.Ampersand, TokenType.DoubleAmpersand,
            TokenType.Pipe, TokenType.DoublePipe,
            TokenType.Star, TokenType.DoubleStar,
            TokenType.Minus, TokenType.Plus,
            TokenType.Slash, TokenType.Xor,
            TokenType.DoubleEquals,
            TokenType.GreaterOrEqual, TokenType.SmallerOrEqual,
            TokenType.NotEquals,
            TokenType.LeftShift, TokenType.RightShift
        ].forEach(type => {
            self.registerInfix(type, new InfixOperatorSubparser());
        });
        this.registerInfix(TokenType.Dot, new PropertyAccessSubparser());
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
        const left = this.prefixSubparsers.get(token.type).parse(this, token);
        const next: Token = this.tokenSource.peek();
        console.log(`infix: ${next.getSource()} ${TokenType[next.type]}`);
        if (this.infixSubparsers.has(next.type)) {
            this.tokenSource.next();
            return this.infixSubparsers.get(next.type).parse(this, left, next);
        } else {
            return left;
        }
    }
}