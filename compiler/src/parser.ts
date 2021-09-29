import { tokenTypeExplanations } from './explanations';
import { TokenStream } from './tokenizer';
import { BooleanLiteral, CharLiteral, Identifier, NumberLiteral, StringLiteral, Token, TokenType } from './tokens';
import { logCalls, panicAt, StringReader, zip } from './utilities';

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
    @logCalls
    parse(parser: Parser, token: Token): IdentifierExpression {
        return new IdentifierExpression(token.getSource());
    }
}

class PrefixOperatorSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): PrefixOperatorExpression {
        const operand: Expression = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}

class InfixOperatorSubparser implements InfixSubparser {
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    @logCalls
    parse(parser: Parser, left: Expression, token: Token): InfixOperatorExpression {
        const right = parser.getExpression(Precedence.SUM);
        return new InfixOperatorExpression(token.type, left, right);
    }
}

class GroupSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): GroupExpression {
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
    @logCalls
    parse(parser: Parser, callee: Expression, _token: Token): FunctionCallExpression {
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
    @logCalls
    parse(parser: Parser, object: Expression, _token: Token): ElementAccessExpression {
        const indices: Expression[] = [];
        while (!parser.tokenSource.match(TokenType.RightBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate indices and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const index = parser.getExpression(this.precedence);
            indices.push(index);
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00012] Indices should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();

        return new ElementAccessExpression(object, indices);
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
        return `GroupExpression {${this.content.toString()}}`;
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
        return `FunctionCall {${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}}`;
    }
}

class ElementAccessExpression extends Expression {
    left: Expression;
    indices: Expression[];
    constructor(left: Expression, indices: Expression[]) {
        super();
        this.left = left;
        this.indices = indices;
    }
    toString(): string {
        return `IndexingExpression {${this.left.toString()}${this.indices.length > 0 ? ', ' + this.indices.map(x => x.toString()).join(', ') : ''}}`;
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
    @logCalls
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
        return `PropertyAccess {${this.object.toString()}, ${this.property}}`;
    }
}

class PropertyAccessSubparser implements InfixSubparser {
    precedence: number;
    constructor(precedence: number) {
        this.precedence = precedence;
    }
    @logCalls
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
        return TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}

class StatementExpression extends Expression {
    left: Expression;
    right: Expression;
    constructor(left: Expression, right: Expression) {
        super();
        this.left = left;
        this.right = right;
    }

    toString(): string {
        return `${this.left} ; ${this.right}`;
    }
}

class StatementSubparser implements InfixSubparser {
    @logCalls
    parse(parser: Parser, left: Expression, _token: Token): Expression {
        const right = parser.getExpression(0);
        return new StatementExpression(left, right);
    }
    precedence = 0.5;

}

class Block extends Expression {
    expression: Expression;
    constructor(expression: Expression) {
        super();
        this.expression = expression;
    }

    toString(): string {
        return `Block {${this.expression.toString()}}`;
    }
}

class BlockSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): Block {
        const expression = parser.getExpression(0);
        parser.tokenSource.consume(TokenType.RightCurlyBracket, 'a \'}\' was expected at the end of a block');
        return new Block(expression);
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
        return `${TokenType[this.operator]}.infix {${this.leftOperand.toString()}, ${this.rightOperand.toString()}}`;
    }
}

class IfExpression {
    condition: Expression;
    thenBranch: Block;
    elseBranch?: Block;
    constructor(condition: Expression, thenBranch: Block, elseBranch?: Block) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }

    toString(): string {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}

class WhileExpression {
    condition: Expression;
    body: Block;
    constructor(condition: Expression, body: Block) {
        this.condition = condition;
        this.body = body;
    }

    toString(): string {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}

class IfSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): IfExpression {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after an if\'s condition');
        const thenBranch = (new BlockSubparser()).parse(parser, token);
        let elseBranch = null;
        if (parser.tokenSource.match(TokenType.Else)) {
            parser.tokenSource.next(); // Consume 'else'
            const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after an \'else\'');
            elseBranch = (new BlockSubparser()).parse(parser, token);
        }
        return new IfExpression(condition, thenBranch, elseBranch);
    }
}

class WhileSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): WhileExpression {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after an while\'s condition');
        const body = (new BlockSubparser()).parse(parser, token);
        return new WhileExpression(condition, body);
    }
}

class TypeCastingExpression extends Expression {
    value: Expression;
    type: Type;
    constructor(type: Type, value: Expression) {
        super();
        this.value = value;
        this.type = type;
    }

    toString(): string {
        return `Typecast {${typeToString(this.type)}, ${this.value.toString()}}`;
    }
}

class TypeCastingSubparser implements PrefixSubparser {
    parse(parser: Parser, _token: Token): Expression {
        const type = parser.getType();
        parser.tokenSource.consume(TokenType.RightAngleBracket, 'expected a \'>\' after a type cast');
        const expression = parser.getExpression(Precedence.PREFIX);
        return new TypeCastingExpression(type, expression);
    }
}

class LetOrConstDeclarationSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): Expression {
        const type = token.type == TokenType.Let ? 'let' : 'const';
        const name = parser.tokenSource.consume(TokenType.Identifier, `expected an identifier after ${type}`);
        let variableType = null;
        if (parser.tokenSource.match(TokenType.Colon)) {
            parser.tokenSource.next();
            variableType = parser.getType();
        }
        let value: Expression = null;
        if (parser.tokenSource.match(TokenType.Equals)) {
            parser.tokenSource.next();
            value = parser.getExpression(0);
        }
        return new LetOrConstDeclarationExpression(type, <Identifier>name, value, variableType);
    }
}

class LetOrConstDeclarationExpression extends Expression {
    type: 'let' | 'const';
    name: Identifier;
    value?: Expression;
    variableType?: Type;
    constructor(type: 'let' | 'const', name: Identifier, value?: Expression, variableType?: Type) {
        super();
        this.type = type;
        this.name = name;
        this.value = value;
        this.variableType = variableType;
    }

    toString(): string {
        return `${this.type} {${(new IdentifierExpression(this.name.getSource())).toString()}, ${this.variableType ? typeToString(this.variableType) : '<inferred type>'}${this.value ? ', ' + this.value.toString() : ''}}`;
    }
}

type Type = { plain: true, value: Identifier } | { plain: false, value: Identifier, typeParameters: Type[] };

function typeToString(type: Type): string {
    if (type.plain) return type.value.getSource();
    else return `${type.value.getSource()}[${(<{ plain: false, value: Identifier, typeParameters: Type[] }>type).typeParameters.map(x => typeToString(x)).join(', ')}]`;
}

class PostfixOperatorExpression extends Expression {
    operator: TokenType;
    operand: Expression;
    constructor(operator: TokenType, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }

    toString(): string {
        return `${TokenType[this.operator]}.postfix {${this.operand.toString()}}`;
    }
}

class PostfixOperatorSubparser implements InfixSubparser {
    precedence: number;
    constructor() {
        this.precedence = Precedence.POSTFIX;
    }
    @logCalls
    parse(parser: Parser, left: Expression, token: Token): Expression {
        return new PostfixOperatorExpression(token.type, left);
    }
}

class ForExpression extends Expression {
    init: Expression;
    condition: Expression;
    repeat: Expression;
    body: Block;

    constructor(init: Expression, condition: Expression, repeat: Expression, body: Block) {
        super();
        this.init = init;
        this.condition = condition;
        this.repeat = repeat;
        this.body = body;
    }

    toString(): string {
        return `ForExpression {${this.init.toString()}, ${this.condition.toString()}, ${this.repeat.toString()}, ${this.body.toString()}}`;
    }
}

class ForSubparser implements PrefixSubparser {
    parse(parser: Parser, _token: Token): ForExpression {
        let init: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        let condition: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        let repeat: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        if (!parser.tokenSource.match(TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        parser.tokenSource.consume(TokenType.Comma, 'expected a comma after a for loop\'s initialization expression');
        if (!parser.tokenSource.match(TokenType.Comma)) {
            condition = parser.getExpression(0);
        }
        parser.tokenSource.consume(TokenType.Comma, 'expected a comma after a for loop\'s condition');
        if (!parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
            repeat = parser.getExpression(0);
        }
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s repeating expression');
        const loopBody = (new BlockSubparser()).parse(parser, token);
        return new ForExpression(init, condition, repeat, loopBody);
    }
}

class LambdaFunctionExpression extends Expression {
    args: IdentifierExpression[];
    body: Expression;
    typesOfArguments: Type[];
    constructor(args: IdentifierExpression[], typesOfArguments: Type[], body: Expression) {
        super();
        this.args = args;
        this.body = body;
        this.typesOfArguments = typesOfArguments;
    }

    toString(): string {
        return `LambdaFunction {[${zip(this.args, this.typesOfArguments).map(([name, type]) => name.toString() + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}

class FunctionExpression extends Expression {
    typeParameters: IdentifierExpression[];
    args: IdentifierExpression[];
    typesOfArguments: Type[];
    body: Block;
    name: IdentifierExpression;
    returnType?: Type;
    typeConstraints: TypeConstraint[];

    constructor(typeParameters: IdentifierExpression[], args: IdentifierExpression[], typesOfArguments: Type[], body: Block, name: IdentifierExpression, typeConstraints: TypeConstraint[], returnType?: Type) {
        super();
        this.typeParameters = typeParameters;
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
        this.name = name;
        this.returnType = returnType;
        this.typeConstraints = typeConstraints;
    }

    toString(): string {
        return `Function<${zip(this.typeParameters, this.typeConstraints).map(x => `${x[0].id} ${typeConstraintToString(x[1])}`).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {[${zip(this.args, this.typesOfArguments).map(([name, type]) => name.toString() + ': ' + typeToString(type)).join(', ')}], ${this.body.toString()}]`;
    }
}

class FunctionSubparser implements PrefixSubparser {
    parse(parser: Parser, _token: Token): FunctionExpression {
        const functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(TokenType.Identifier, 'a function name is required'));
        let typeParameters: IdentifierExpression[] = [];
        let typeConstraints: TypeConstraint[] = [];
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(TokenType.LeftParenthesis, '[ESCE00015] A left parenthesis is required to start a function\'s argument list');
        const args: IdentifierExpression[] = [];
        const typesOfArguments: Type[] = [];
        while (!parser.tokenSource.match(TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            args.push(parser.getNamePattern());
            if (!parser.tokenSource.match(TokenType.Colon)) {
                const wrongToken = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00016] Function arguments must be typed', wrongToken.line, wrongToken.char, wrongToken.getSource());
            } else {
                parser.tokenSource.next();
                typesOfArguments.push(parser.getType());
            }
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ')'
        let returnType: Type = null;
        if (!parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
            returnType = parser.getType();
        }
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'expected a block start');
        const body = (new BlockSubparser()).parse(parser, token);
        return new FunctionExpression(typeParameters, args, typesOfArguments, body, functionName, typeConstraints, returnType);
    }
}
class LambdaFunctionSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): LambdaFunctionExpression {
        const args: IdentifierExpression[] = [];
        const typesOfArguments: Type[] = [];
        if (token.type == TokenType.Pipe) {
            // Function potentially has arguments
            while (!parser.tokenSource.match(TokenType.Pipe)) {
                if (parser.tokenSource.match(TokenType.Comma)) {
                    const token = parser.tokenSource.next();
                    panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                args.push(parser.getNamePattern());
                if (parser.tokenSource.match(TokenType.Colon)) {
                    parser.tokenSource.next();
                    typesOfArguments.push(parser.getType());
                } else {
                    typesOfArguments.push(null);
                }
                if (parser.tokenSource.match(TokenType.Comma)) {
                    parser.tokenSource.next();
                } else if (!parser.tokenSource.match(TokenType.Pipe)) {
                    const token = parser.tokenSource.next();
                    panicAt(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                }
            }
            parser.tokenSource.next(); // Consume the '|'
        }
        const body = parser.getExpression(0);
        return new LambdaFunctionExpression(args, typesOfArguments, body);
    }

}

type TypeConstraint = {
    kind: 'extends' | 'implements',
    type: Type,
    and?: TypeConstraint
} | 'unconstrained';

function typeConstraintToString(t: TypeConstraint): string {
    if (t == 'unconstrained') return t;
    else {
        return `${t.kind == 'extends' ? '<=' : ':'} ${typeToString(t.type)}${t.and ? ` & ${typeConstraintToString(t.and)}` : ''}`;
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
        this.registerPrefix(TokenType.LeftCurlyBracket, new BlockSubparser());
        this.registerPrefix(TokenType.LeftParenthesis, new GroupSubparser());
        this.registerPrefix(TokenType.If, new IfSubparser());
        this.registerPrefix(TokenType.LeftAngleBracket, new TypeCastingSubparser());
        this.registerPrefix(TokenType.Let, new LetOrConstDeclarationSubparser());
        this.registerPrefix(TokenType.Const, new LetOrConstDeclarationSubparser());
        this.registerPrefix(TokenType.While, new WhileSubparser());
        this.registerPrefix(TokenType.For, new ForSubparser());
        this.registerPrefix(TokenType.Pipe, new LambdaFunctionSubparser());
        this.registerPrefix(TokenType.DoublePipe, new LambdaFunctionSubparser());
        this.registerPrefix(TokenType.Fn, new FunctionSubparser());
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
            [TokenType.RightShift, Precedence.SUM],
            [TokenType.LeftAngleBracket, Precedence.CONDITIONAL],
            [TokenType.RightAngleBracket, Precedence.CONDITIONAL]
        ]).forEach(([type, precedence]) => {
            self.registerInfix(type, new InfixOperatorSubparser(precedence));
        });
        this.registerInfix(TokenType.Dot, new PropertyAccessSubparser(Precedence.PROPERTY_ACCESS));
        this.registerInfix(TokenType.LeftParenthesis, new FunctionCallSubparser(Precedence.CALL));
        this.registerInfix(TokenType.LeftBracket, new ElementAccessSubparser(Precedence.POSTFIX));
        this.registerInfix(TokenType.Semicolon, new StatementSubparser());
        this.registerInfix(TokenType.DoubleMinus, new PostfixOperatorSubparser());
        this.registerInfix(TokenType.DoublePlus, new PostfixOperatorSubparser());
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
            try {
                left = infix.parse(this, left, token);
            } catch (e) {
                panicAt(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }

        return left;
    }

    getTypeParameters(): [IdentifierExpression[], TypeConstraint[]] {
        this.tokenSource.next(); // Consume the '['
        const names: IdentifierExpression[] = [];
        const constraints: TypeConstraint[] = [];
        while (!this.tokenSource.match(TokenType.RightBracket)) {
            if (this.tokenSource.match(TokenType.Comma)) {
                const token = this.tokenSource.next();
                panicAt(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            names.push((new IdentifierSubparser()).parse(this, this.tokenSource.consume(TokenType.Identifier, 'a type parameter name was expected')));
            const innerConstraints: TypeConstraint[] = [];
            if (this.tokenSource.match(TokenType.SmallerOrEqual)) {
                this.tokenSource.next();
                innerConstraints.push({
                    kind: 'extends',
                    type: this.getType()
                });
            }
            if (this.tokenSource.match(TokenType.Colon)) {
                this.tokenSource.next();
                if (this.tokenSource.match(TokenType.LeftParenthesis)) {
                    this.tokenSource.next();
                    if (this.tokenSource.match(TokenType.RightParenthesis)) {
                        const wrongToken = this.tokenSource.next();
                        panicAt(this.tokenSource.reader, '[ESCE00017] Parentheses in \':\' type constraints must contain something', wrongToken.line, wrongToken.char, wrongToken.getSource());
                    }
                    while (!this.tokenSource.match(TokenType.RightParenthesis)) {
                        if (this.tokenSource.match(TokenType.Comma)) {
                            const token = this.tokenSource.next();
                            panicAt(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                        }
                        innerConstraints.push({
                            kind: 'implements',
                            type: this.getType()
                        });
                        if (this.tokenSource.match(TokenType.Comma)) {
                            this.tokenSource.next();
                        } else if (!this.tokenSource.match(TokenType.RightParenthesis)) {
                            const token = this.tokenSource.next();
                            panicAt(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                        }
                    }
                    this.tokenSource.next();
                } else {
                    const type = this.getType();
                    innerConstraints.push({
                        kind: 'implements',
                        type: type
                    });
                }
            }
            if (this.tokenSource.match(TokenType.Comma)) {
                this.tokenSource.next();
            } else if (!this.tokenSource.match(TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                panicAt(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
            if (innerConstraints.length == 0) {
                constraints.push('unconstrained');
            } else {
                const originalConstraint = innerConstraints[0];
                let constraint = originalConstraint;
                let index = 1;
                while (index < innerConstraints.length) {
                    if (constraint != 'unconstrained') {
                        constraint.and = innerConstraints[index];
                        constraint = constraint.and;
                    }
                    index++;
                }
                constraints.push(originalConstraint);
            }
        }
        this.tokenSource.next(); // Consume the ']'
        return [names, constraints];
    }

    getNamePattern(): IdentifierExpression {
        return (new IdentifierSubparser()).parse(this, this.tokenSource.consume(TokenType.Identifier, 'expected an identifier'));
    }

    getType(): Type {
        let T: Type = {
            plain: true,
            value: <Identifier>this.tokenSource.consume(TokenType.Identifier, 'expected a type name')
        };
        if (this.tokenSource.match(TokenType.LeftBracket)) {
            this.tokenSource.next();
            T = {
                plain: false,
                value: T.value,
                typeParameters: []
            };
            if (this.tokenSource.match(TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                panicAt(this.tokenSource.reader, '[ESCE00014] Unexpected empty type parameters', token.line, token.char, token.getSource());
            }
            while (!this.tokenSource.match(TokenType.RightBracket)) {
                if (this.tokenSource.match(TokenType.Comma)) {
                    const token = this.tokenSource.next();
                    panicAt(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                const parameter = this.getType();
                T.typeParameters.push(parameter);
                if (this.tokenSource.match(TokenType.Comma)) {
                    this.tokenSource.next(); // Consume the comma
                }
            }
            this.tokenSource.next(); // Consume the ']'
        }
        return T;
    }
}
