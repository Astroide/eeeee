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

    consume(type: TokenType, message: string): Token {
        const next = this.next();
        if (next.type != type) {
            panicAt(this.reader, `[ESCE00010] Expected TokenType.${TokenType[type]}${tokenTypeExplanations.has(type) ? ` (${tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
        return next;
    }
}

const Precedence = {
    // const ASSIGNMENT = 1;
    CONDITIONAL: 2,
    SUM: 3,
    PRODUCT: 4,
    EXPONENT: 5,
    PREFIX: 6,
    POSTFIX: 7,
    CALL: 8,
    PROPERTY_ACCESS: 9,
};
Object.seal(Precedence);

interface PrefixSubparser {
    parse(parser: Parser, token: Token): Expression;
}

interface InfixSubparser {
    parse(parser: Parser, left: Expression, token: Token): Expression;
    precedence: number;
}

class IdentifierSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): Expression {
        return new IdentifierExpression(token.getSource());
    }
}

class PrefixOperatorSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): Expression {
        const operand: Expression = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}

class InfixOperatorSubparser implements InfixSubparser {
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    parse(parser: Parser, left: Expression, token: Token): Expression {
        const right = parser.getExpression(Precedence.SUM);
        return new InfixOperatorExpression(token.type, left, right);
    }
}

class GroupSubparser implements PrefixSubparser {
    parse(parser: Parser, _token: Token): Expression {
        const inside = parser.getExpression(0);
        parser.tokenSource.consume(TokenType.RightParenthesis, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }

}

class FunctionCallSubparser implements InfixSubparser {
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    parse(parser: Parser, callee: Expression, _token: Token): Expression {
        const args: Expression[] = [];
        while (!parser.tokenSource.match(TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const arg = parser.getExpression(0);
            args.push(arg);
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new FunctionCallExpression(callee, args);
    }
}

class ElementAccessSubparser implements InfixSubparser {
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    parse(parser: Parser, object: Expression, _token: Token): Expression {
        const indexes: Expression[] = [];
        while (!parser.tokenSource.match(TokenType.RightBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const index = parser.getExpression(this.precedence);
            indexes.push(index);
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();

        return new ElementAccessExpression(object, indexes);
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

class FunctionCallExpression extends Expression {
    callee: Expression;
    args: Expression[];
    constructor(callee: Expression, args: Expression[]) {
        super();
        this.callee = callee;
        this.args = args;
    }

    toString(): string {
        return `FunctionCall::<${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}>`;
    }
}

class ElementAccessExpression extends Expression {
    left: Expression;
    indexes: Expression[];
    constructor(left: Expression, indexes: Expression[]) {
        super();
        this.left = left;
        this.indexes = indexes;
    }
    toString(): string {
        return `IndexingExpression::<${this.left.toString()}${this.indexes.length > 0 ? ', ' + this.indexes.map(x => x.toString()).join(', ') : ''}>`;
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
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    parse(parser: Parser, left: Expression, _token: Token): Expression {
        const propertyName = parser.tokenSource.consume(TokenType.Identifier, 'expected a property name after a dot').getSource();
        return new PropertyAccessExpression(left, propertyName);
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

class Statement {
    content: Expression;
    constructor(content: Expression) {
        this.content = content;
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
        this.registerPrefix(TokenType.LeftParenthesis, new GroupSubparser());
        (<[TokenType, number][]>[
            [TokenType.Ampersand, Precedence.CONDITIONAL],
            [TokenType.DoubleAmpersand, Precedence.SUM],
            [TokenType.Pipe, Precedence.CONDITIONAL],
            [TokenType.DoublePipe, Precedence.SUM],
            [TokenType.Star, Precedence.PRODUCT],
            [TokenType.DoubleStar, Precedence.EXPONENT],
            [TokenType.Minus, Precedence.SUM],
            [TokenType.Plus, Precedence.SUM],
            [TokenType.Slash, Precedence.PRODUCT],
            [TokenType.Xor, Precedence.SUM],
            [TokenType.DoubleEquals, Precedence.CONDITIONAL],
            [TokenType.GreaterOrEqual, Precedence.CONDITIONAL],
            [TokenType.SmallerOrEqual, Precedence.CONDITIONAL],
            [TokenType.NotEquals, Precedence.CONDITIONAL],
            [TokenType.LeftShift, Precedence.SUM],
            [TokenType.RightShift, Precedence.SUM]
        ]).forEach(([type, precedence]) => {
            self.registerInfix(type, new InfixOperatorSubparser(precedence));
        });
        this.registerInfix(TokenType.Dot, new PropertyAccessSubparser(Precedence.PROPERTY_ACCESS));
        this.registerInfix(TokenType.LeftParenthesis, new FunctionCallSubparser(Precedence.CALL));
        this.registerInfix(TokenType.LeftBracket, new ElementAccessSubparser(Precedence.POSTFIX));
    }

    registerPrefix(type: TokenType, subparser: PrefixSubparser): void {
        this.prefixSubparsers.set(type, subparser);
    }

    registerInfix(type: TokenType, subparser: InfixSubparser): void {
        this.infixSubparsers.set(type, subparser);
    }

    getPrecedence(): number {
        const subparser = this.infixSubparsers.get(this.tokenSource.peek().type);
        if (subparser) {
            return subparser.precedence;
        }
        return 0;
    }

    getExpression(precedence: number): Expression {
        let token: Token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type)) {
            panicAt(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}'`, token.line, token.char, token.getSource());
        }
        let left = this.prefixSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedence()) {
            token = this.tokenSource.next();
            const infix = this.infixSubparsers.get(token.type);
            left = infix.parse(this, left, token);
        }

        return left;
    }

    getStatement(): Statement {
        const expression = this.getExpression(0);
        this.tokenSource.consume(TokenType.Semicolon, '[ESCE00013] Expected a semicolon at the end of a statement.');
        return new Statement(expression);
    }
}
