import { tokenTypeExplanations } from './explanations';
import { TokenStream } from './tokenizer';
import { BooleanLiteral, CharLiteral, Identifier, isOperator, isUnaryOperator, isUnaryOperatorOnly, Label, Macro, NumberLiteral, StringLiteral, TemplateStringElement, TemplateStringLiteral, Token, TokenType } from './tokens';
import { logCalls, panicAt, StringReader, warnAt, zip } from './utilities';

// This class is a wrapper around the tokenizer. It allows reading, peeking, matching, skipping, and consuming tokens.
class BetterTokenStream {
    private stream: TokenStream;
    private nextTokens: Token[] = [];
    reader: StringReader;
    index = 0;
    stack: Token[] = [];

    constructor(stream: TokenStream, reader: StringReader) {
        this.stream = stream;
        this.reader = reader;
    }

    next(): Token {
        this.index++;
        if (this.nextTokens.length > 0) {
            return this.pushToStackAndReturn(this.nextTokens.shift());
        } else {
            return this.pushToStackAndReturn(<Token>this.stream.gen.next().value);
        }
    }

    pushToStackAndReturn(token: Token): Token {
        this.stack.push(token);
        return token;
    }

    peek(): Token {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(<Token>this.stream.gen.next().value);
        return this.nextTokens[0];
    }

    peekN(n: number): Token {
        if (this.nextTokens.length > n - 1) {
            return this.nextTokens[n - 1];
        }
        while (!(this.nextTokens.length > n - 1)) {
            this.nextTokens.push(<Token>this.stream.gen.next().value);
        }
        return this.nextTokens[n - 1];
    }

    match(type: TokenType): boolean {
        const next = this.peek();
        return next.type == type;
    }

    consume(type: TokenType, message: string): Token {
        this.index++;
        const next = this.next();
        if (next.type != type) {
            panicAt(this.reader, `[ESCE00010] Expected TokenType.${TokenType[type]}${tokenTypeExplanations.has(type) ? ` (${tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
        return this.pushToStackAndReturn(next);
    }

    state(): number {
        return this.index;
    }

    restore(state: number): void {
        while (this.index != state) {
            this.index--;
            this.nextTokens.unshift(this.stack.pop());
        }
    }
}

// Precedence levels
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
// Lock Precedence's properties (it being const doesn't imply its properties are constant)
Object.seal(Precedence);

// Interface for prefix subparsers. Any expression prefix subparser (identifiers, literals, if-else expressions, etc.) must implement this interface.
interface PrefixSubparser {
    parse(parser: Parser, token: Token): Expression;
}

// Interface for infix subparsers. Any expression infix subparser (infix operators, function calls, postfix operators, etc.) must implement this interface.
interface InfixSubparser {
    parse(parser: Parser, left: Expression, token: Token): Expression;
    precedence: number;
}

// Base pattern class
class Pattern {
    // Even if this method exists, it must be overridden by subclasses.
    toString(): string {
        return 'Pattern';
    }
}

// Interface for pattern prefix subparsers. Any pattern prefix subparser (@name naming patterns, plain name patterns, list patterns, etc.) must implement this interface.
interface PrefixPatternSubparser {
    parse(parser: Parser, token: Token): Pattern;
}

// Interface for pattern infix subparsers. Any pattern infix subparsers (no examples yet) must implement this interface.
interface InfixPatternSubparser {
    parse(parser: Parser, left: Pattern, token: Token): Pattern;
    precedence: number;
}

class IdentifierSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): IdentifierExpression {
        return new IdentifierExpression(<Identifier>token);
    }
}

class PrefixOperatorSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): PrefixOperatorExpression {
        const operand: Expression = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}

// All infix operators (except ;, the expression chaining operator) are implemented by this class.
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
        const args: [Expression, Identifier?][] = [];
        while (!parser.tokenSource.match(TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            let argName: Identifier = null;
            if (parser.tokenSource.peek().type == TokenType.Identifier && parser.tokenSource.peekN(2).type == TokenType.Colon) {
                // Named argument
                argName = <Identifier>parser.tokenSource.next();
                parser.tokenSource.next();
            }
            const arg = parser.getExpression(0);
            args.push(argName ? [arg, argName] : [arg]);
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

// Base expression class
export class Expression {
    // Although this method exists, it must be overridden by subclasses.
    toString(): string {
        return 'Expression';
    }
}

export class GroupExpression extends Expression {
    constructor(public content: Expression) {
        super();
    }

    toString(): string {
        return `GroupExpression {${this.content.toString()}}`;
    }
}

export class FunctionCallExpression extends Expression {
    constructor(public callee: Expression, public args: [Expression, Identifier?][]) {
        super();
    }

    toString(): string {
        return `FunctionCall {${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}}`;
    }
}

export class ElementAccessExpression extends Expression {
    constructor(public left: Expression, public indices: Expression[]) {
        super();
    }
    toString(): string {
        return `IndexingExpression {${this.left.toString()}${this.indices.length > 0 ? ', ' + this.indices.map(x => x.toString()).join(', ') : ''}}`;
    }
}

export class IdentifierExpression extends Expression {
    id: string;
    constructor(public token: Identifier) {
        super();
        this.id = token.identifier;
        this.token = token;
    }

    toString(): string {
        return `Identifier[${this.id}]`;
    }
}

export class LiteralExpression extends Expression {
    constructor(public value: string | number | boolean | TemplateStringElement, public type: TokenType.NumericLiteral | TokenType.BooleanLiteral | TokenType.StringLiteral | TokenType.CharacterLiteral | TokenType.TemplateStringLiteral) {
        super();
    }

    toString(): string {
        if (this.type == TokenType.TemplateStringLiteral) {
            let string = `${TokenType[this.type]}[\n`;
            let element = <TemplateStringElement>this.value;
            while (element) {
                if (element.data instanceof Expression) {
                    string += '+ ' + element.data.toString() + '\n';
                } else {
                    string += '+ string |' + element.data.toString() + '|\n';
                }
                element = element.next;
            }
            string += ']';
            return string;
        } else {
            return `${TokenType[this.type]}[${this.value}]`;
        }
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
        else if (token.type == TokenType.TemplateStringLiteral)
            return new LiteralExpression((<TemplateStringLiteral>token).contents, TokenType.TemplateStringLiteral);
    }
}

export class PropertyAccessExpression extends Expression {
    constructor(public object: Expression, public property: string) {
        super();
    }

    toString(): string {
        return `PropertyAccess {${this.object.toString()}, ${this.property}}`;
    }
}

class PropertyAccessSubparser implements InfixSubparser {
    constructor(public precedence: number) { }
    @logCalls
    parse(parser: Parser, left: Expression, _token: Token): Expression {
        const propertyName = parser.tokenSource.consume(TokenType.Identifier, 'expected a property name after a dot').getSource();
        return new PropertyAccessExpression(left, propertyName);
    }
}

export class PrefixOperatorExpression extends Expression {
    constructor(public operator: TokenType, public operand: Expression) {
        super();
    }

    toString(): string {
        return TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}

export class StatementExpression extends Expression {
    constructor(public left: Expression, public right: Expression) {
        super();
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
    label?: string = null;
    constructor(public expression: Expression) {
        super();
    }

    toString(): string {
        return `Block${this.label ? '#' + this.label : ''} {${this.expression.toString()}}`;
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

export class InfixOperatorExpression extends Expression {
    constructor(public operator: TokenType, public leftOperand: Expression, public rightOperand: Expression) {
        super();
    }

    toString(): string {
        return `${TokenType[this.operator]}.infix {${this.leftOperand.toString()}, ${this.rightOperand.toString()}}`;
    }
}

export class IfExpression extends Expression {
    constructor(public condition: Expression, public thenBranch: Block, public elseBranch?: Block | IfExpression) {
        super();
    }

    toString(): string {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}

export class WhileExpression extends Expression {
    constructor(public condition: Expression, public body: Block) {
        super();
    }

    toString(): string {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}

export class LoopExpression extends Expression {
    label?: string = null;
    constructor(public body: Block) {
        super();
    }

    toString(): string {
        return `Loop${this.label ? '#' + this.label : ''} {${this.body.toString()}}`;
    }
}

class IfSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): IfExpression {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after an if\'s condition');
        const thenBranch = (new BlockSubparser()).parse(parser, token);
        let elseBranch: Block | IfExpression = null;
        if (parser.tokenSource.match(TokenType.Else)) {
            parser.tokenSource.next(); // Consume 'else'
            if (parser.tokenSource.match(TokenType.If)) {
                elseBranch = (new IfSubparser()).parse(parser, parser.tokenSource.next());
            } else {
                const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after an \'else\'');
                elseBranch = (new BlockSubparser()).parse(parser, token);
            }
        }
        return new IfExpression(condition, thenBranch, elseBranch);
    }
}

class ListExpression extends Expression {
    constructor(public elements: Expression[]) {
        super();
    }

    toString(): string {
        return `ListExpression {${this.elements.map(x => x.toString()).join(', ')}}`;
    }
}

class ListSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ListExpression {
        const elements: Expression[] = [];
        while (!parser.tokenSource.match(TokenType.RightBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00023] Leading / double commas are not allowed within list literals.', token.line, token.char, token.getSource());
            }
            elements.push(parser.getExpression(0));
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00024] A list literal\'s elements should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ']'
        return new ListExpression(elements);
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

class LoopSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): LoopExpression {
        const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'a \'{\' was expected after a \'loop\'');
        const body = (new BlockSubparser()).parse(parser, token);
        return new LoopExpression(body);
    }
}

export class TypeCastingExpression extends Expression {
    constructor(public type: Type, public value: Expression) {
        super();
    }

    toString(): string {
        return `Typecast {${typeToString(this.type)}, ${this.value.toString()}}`;
    }
}

class TypeCastingSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): Expression {
        const type = parser.getType();
        parser.tokenSource.consume(TokenType.RightAngleBracket, 'expected a \'>\' after a type cast');
        const expression = parser.getExpression(Precedence.PREFIX);
        return new TypeCastingExpression(type, expression);
    }
}

class LetOrConstDeclarationSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): LetOrConstDeclarationExpression {
        const type = (token && token.type == TokenType.Const) ? 'const' : 'let';
        const pattern = parser.getPattern(0);
        let variableType: Type = null;
        if (parser.tokenSource.match(TokenType.Colon)) {
            parser.tokenSource.next();
            variableType = parser.getType();
        }
        let value: Expression = null;
        if (parser.tokenSource.match(TokenType.Equals)) {
            parser.tokenSource.next();
            value = parser.getExpression(0);
        } else if (variableType == null) {
            const token = parser.tokenSource.next();
            panicAt(parser.tokenSource.reader, '[ESCE00040] A type-inferred let / const declaration must have a value. Either specify a type or add a value.', token.line, token.char, token.getSource());
        }
        return new LetOrConstDeclarationExpression(type, pattern, value, variableType);
    }
}

export class LetOrConstDeclarationExpression extends Expression {
    constructor(public type: 'let' | 'const', public pattern: Pattern, public value?: Expression, public variableType?: Type) {
        super();
    }

    toString(): string {
        return `${this.type} {${this.pattern.toString()}, ${this.variableType ? typeToString(this.variableType) : '<inferred type>'}${this.value ? ', ' + this.value.toString() : ''}}`;
    }
}

type Type = { plain: true, value: Identifier } | { plain: false, value: Identifier, typeParameters: Type[] };

function typeToString(type: Type): string {
    if (type.plain) return type.value.getSource();
    else return `${type.value.getSource()}[${(<{ plain: false, value: Identifier, typeParameters: Type[] }>type).typeParameters.map(x => typeToString(x)).join(', ')}]`;
}

export class PostfixOperatorExpression extends Expression {
    constructor(public operator: TokenType, public operand: Expression) {
        super();
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

type ForAInB = {
    name: Pattern;
    iterator: Expression;
}
type ForABC = {
    init: Expression;
    condition: Expression;
    repeat: Expression;
}
export class ForExpression extends Expression {
    label?: string = null;

    constructor(public condition: ForABC | ForAInB, public body: Block, public kind: 'a,b,c' | 'a in b') {
        super();
    }

    toString(): string {
        if (this.kind == 'a,b,c') return `ForExpression${this.label ? '#' + this.label : ''}.<for a, b, c> {${(this.condition as ForABC).init.toString()}, ${(this.condition as ForABC).condition.toString()}, ${(this.condition as ForABC).repeat.toString()}, ${this.body.toString()}}`;
        else return `ForExpression${this.label ? '#' + this.label : ''}.<for a in b> {${(this.condition as ForAInB).name.toString()}, ${(this.condition as ForAInB).iterator.toString()}, ${this.body.toString()}}`;
    }
}

class ForSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ForExpression {
        let init: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        let condition: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        let repeat: Expression = new LiteralExpression(true, TokenType.BooleanLiteral);
        if (!parser.tokenSource.match(TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        if (parser.tokenSource.match(TokenType.In)) {
            const name = expressionAsPattern(init);
            parser.tokenSource.consume(TokenType.In, 'Expected an \'in\', this is an error that shouldn\'t ever happen. Report this to https://github.com/Astroide/escurieux/issues .');
            const iterator = parser.getExpression(0);
            const token = parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s iterator expression');
            const body = (new BlockSubparser()).parse(parser, token);
            return new ForExpression({
                name: name,
                iterator: iterator
            }, body, 'a in b');
        } else {
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
            return new ForExpression(<ForABC>{
                condition: condition,
                init: init,
                repeat: repeat
            }, loopBody, 'a,b,c');
        }
    }
}

export class LambdaFunctionExpression extends Expression {
    constructor(public args: [Pattern, Expression?][], public typesOfArguments: Type[], public body: Expression) {
        super();
    }

    toString(): string {
        return `LambdaFunction {[${zip(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}

export class FunctionExpression extends Expression {
    constructor(public typeParameters: Type[], public args: [Pattern, Expression?][], public typesOfArguments: Type[], public body: Block, public namePattern: Pattern, public typeConstraints: TypeConstraint[], public returnType?: Type) {
        super();
    }

    toString(): string {
        return `Function<${zip(this.typeParameters, this.typeConstraints).map(x => `${typeToString(x[0])} ${typeConstraintToString(x[1])}`).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {${this.namePattern.toString()}, [${zip(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + typeToString(type)).join(', ')}], ${this.body ? this.body.toString() : '<no body>'}]`;
    }
}

class FunctionSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token, allowEmpty = false, name?: Token): FunctionExpression {
        let functionName: IdentifierExpression;
        if (!name) {
            functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(TokenType.Identifier, 'a function name is required'));
        } else {
            functionName = new IdentifierExpression(new Identifier(name.line, name.char, name.getSource(), name.start, name.length, name.getSource()));
        }
        let typeParameters: Type[] = [];
        let typeConstraints: TypeConstraint[] = [];
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(TokenType.LeftParenthesis, '[ESCE00015] A left parenthesis is required to start a function\'s argument list');
        const args: [Pattern, Expression?][] = [];
        const typesOfArguments: Type[] = [];
        while (!parser.tokenSource.match(TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const pattern = parser.getPattern(0);
            let defaultValue: Expression = null;
            if (!parser.tokenSource.match(TokenType.Colon)) {
                const wrongToken = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00016] Function arguments must be typed', wrongToken.line, wrongToken.char, wrongToken.getSource());
            } else {
                parser.tokenSource.next();
                typesOfArguments.push(parser.getType());
            }
            if (parser.tokenSource.match(TokenType.Equals)) {
                parser.tokenSource.next();
                defaultValue = parser.getExpression(0);
            }
            args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
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
        let body: Block;
        if (allowEmpty && parser.tokenSource.match(TokenType.RightCurlyBracket)) {
            body = null;
            parser.tokenSource.next();
        } else {
            body = (new BlockSubparser()).parse(parser, token);
        }
        return new FunctionExpression(typeParameters, args, typesOfArguments, body, functionName, typeConstraints, returnType);
    }
}

class LambdaFunctionSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): LambdaFunctionExpression {
        const args: [Pattern, Expression?][] = [];
        const typesOfArguments: Type[] = [];
        if (token.type == TokenType.Pipe) {
            // Function potentially has arguments
            while (!parser.tokenSource.match(TokenType.Pipe)) {
                if (parser.tokenSource.match(TokenType.Comma)) {
                    const token = parser.tokenSource.next();
                    panicAt(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                const pattern = parser.getPattern(0);
                let defaultValue: Expression = null;
                if (parser.tokenSource.match(TokenType.Colon)) {
                    parser.tokenSource.next();
                    typesOfArguments.push(parser.getType());
                } else {
                    typesOfArguments.push(null);
                }
                if (parser.tokenSource.match(TokenType.Equals)) {
                    parser.tokenSource.next();
                    defaultValue = parser.getExpression(0);
                }
                args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
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

type PrivacyModifier = 'private' | 'public' | 'protected';

export class ClassExpression extends Expression {
    constructor(public name: Pattern, public typeParameters: Type[], public typeConstraints: TypeConstraint[], public methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][], public properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][], public isStruct: boolean, public operatorOverloads: { [operator: string]: FunctionExpression }) {
        super();
    }

    toString(): string {
        return `${this.isStruct ? 'Struct' : ''}ClassExpression<${zip(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}

class NamedPattern extends Pattern {
    name: Identifier;
    pattern: Pattern;
    constructor(pattern: Pattern, name: Identifier) {
        super();
        this.pattern = pattern;
        this.name = name;
    }

    toString(): string {
        return `NamedPattern(${this.name.identifier}) {${this.pattern.toString()}}`;
    }
}

class NamedPatternSubparser implements PrefixPatternSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): NamedPattern {
        const token = <Identifier>parser.tokenSource.consume(TokenType.Identifier, 'expected a pattern name');
        const pattern = parser.getPattern(0);
        return new NamedPattern(pattern, token);
    }
}

class NamePattern extends Pattern {
    name: Identifier;
    constructor(name: Identifier) {
        super();
        this.name = name;
    }

    toString(): string {
        return `NamePattern[${this.name.identifier}]`;
    }
}

class ObjectDestructuringPattern extends Pattern {
    constructor(public typeName: Identifier, public typeParameters: [Type[], TypeConstraint[]], public properties: Pattern[]) {
        super();
    }
}

class NamePatternSubparser implements PrefixPatternSubparser {
    @logCalls
    parse(parser: Parser, token: Token): NamePattern {
        // if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
        // const typeParameters = parser.getTypeParameters();
        // const token = parser.tokenSource.peek();
        // parser.tokenSource.consume(TokenType.LeftCurlyBracket, `[ESCE00049] Expected '{', got '${token.getSource()} (parsing an object destructuring pattern)`);
        // }
        return new NamePattern(<Identifier>token);
    }
}

class ObjectPattern extends Pattern {
    properties: [Identifier, Pattern?][];
    constructor(properties: [Identifier, Pattern?][]) {
        super();
        this.properties = properties;
    }

    toString(): string {
        return `ObjectPattern {${this.properties.map(x => x[0].toString() + (x[1] ? ': ' + x[1].toString() : '')).join(', ')}}`;
    }
}

class ObjectPatternSubparser implements PrefixPatternSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ObjectPattern {
        const properties: [Identifier, Pattern?][] = [];
        while (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00033] Leading / double commas are not allowed within object literals.', token.line, token.char, token.getSource());
            }
            const propertyName = <Identifier>parser.tokenSource.consume(TokenType.Identifier, 'expected a property name');
            if (parser.tokenSource.match(TokenType.Colon)) {
                parser.tokenSource.next();
                const propertyPattern = parser.getPattern(0);
                properties.push([propertyName, propertyPattern]);
            } else {
                properties.push([propertyName, null]);
            }
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00034] An object pattern\'s property patterns should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the '}'
        return new ObjectPattern(properties);
    }
}

class ListPattern extends Pattern {
    patterns: Pattern[];
    constructor(patterns: Pattern[]) {
        super();
        this.patterns = patterns;
    }

    toString(): string {
        return `ListPattern {${this.patterns.map(x => x.toString()).join(', ')}}`;
    }
}

class ListPatternSubparser implements PrefixPatternSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ListPattern {
        const patterns: Pattern[] = [];
        while (!parser.tokenSource.match(TokenType.RightBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const errorToken = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00031] Leading / double commas are not allowed within list patterns.', errorToken.line, errorToken.char, errorToken.getSource());
            }
            patterns.push(parser.getPattern(0));
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (parser.tokenSource.peek().type != TokenType.RightBracket) {
                const errorToken = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00032] A list pattern\'s elements should be separated by commas', errorToken.line, errorToken.char, errorToken.getSource());
            }
        }
        return new ListPattern(patterns);
    }
}

class ClassSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): ClassExpression {
        const isStruct = token.type === TokenType.Struct;
        const operatorOverloads: { [operator: string]: FunctionExpression } = {};
        const state = parser.tokenSource.state();
        const name = parser.getPattern(0);
        if (!(name instanceof NamePattern)) {
            parser.tokenSource.restore(state);
            const token = parser.tokenSource.next();
            panicAt(parser.tokenSource.reader, '[ESCE00035] Class names must be identifiers', token.line, token.char, token.getSource());
        }
        let typeParameters = [], typeConstraints = [];
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][] = [];
        const properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][] = [];
        const blocks: ('static' | 'public' | 'protected')[] = [];
        loop: while (!parser.tokenSource.match(TokenType.RightCurlyBracket) || blocks.length > 0) {
            toEnd: do {
                if (parser.tokenSource.match(TokenType.RightCurlyBracket) && blocks.length != 0) {
                    blocks.pop();
                    parser.tokenSource.next();
                    continue toEnd;
                }
                if (parser.tokenSource.match(TokenType.Comma)) {
                    const errorToken = parser.tokenSource.next();
                    panicAt(parser.tokenSource.reader, '[ESCE00018] Leading or double commas are not allowed in classes', errorToken.line, errorToken.char, errorToken.getSource());
                }
                const token = parser.tokenSource.peek();
                if (![TokenType.Public, TokenType.Fn, TokenType.Identifier, TokenType.Private, TokenType.Protected, TokenType.Const, TokenType.Static, TokenType.Operator].includes(token.type)) {
                    panicAt(parser.tokenSource.reader, `[ESCE00019] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${TokenType[token.type]} instead`, token.line, token.char, token.getSource());
                }
                let modifier: 'instance' | 'static' = 'instance';
                let accessModifier: PrivacyModifier = 'private';
                if (parser.tokenSource.match(TokenType.Private)) {
                    const token = parser.tokenSource.next();
                    if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    warnAt(parser.tokenSource.reader, '[ESCW00002] The \'private\' access specifier is not required, properties and methods are private by default', token.line, token.char, token.getSource());
                } else if (parser.tokenSource.match(TokenType.Protected)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('protected')) {
                            blocks.push('protected');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    } else {
                        accessModifier = 'protected';
                    }
                } else if (parser.tokenSource.match(TokenType.Public)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('public')) {
                            blocks.push('public');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    } else {
                        accessModifier = 'public';
                    }
                }
                if (parser.tokenSource.match(TokenType.Static)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('static')) {
                            blocks.push('static');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('static')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] \'static\' is not allowed within static blocks', token.line, token.char, token.getSource());
                    } else {
                        modifier = 'static';
                    }
                }
                if (blocks.includes('static')) {
                    modifier = 'static';
                }

                if (blocks.includes('protected') || blocks.includes('public')) {
                    accessModifier = blocks.includes('protected') ? 'protected' : 'public';
                }
                if (parser.tokenSource.match(TokenType.Fn)) {
                    const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next());
                    methods.push([method, modifier, accessModifier]);
                } else if (parser.tokenSource.match(TokenType.Const)) {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            panicAt(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    properties.push([property, modifier, accessModifier]);
                } else if (parser.tokenSource.match(TokenType.Operator)) {
                    parser.tokenSource.next();
                    const operatorToken = parser.tokenSource.next();
                    if (!isOperator(operatorToken.type)) {
                        panicAt(parser.tokenSource.reader, `[ESCE00044] An operator was expected, got '${operatorToken.getSource()}' instead (valid operators are ! * ** / + - | || & && ^ >> << < > >= <= == ~)`, operatorToken.line, operatorToken.char, operatorToken.getSource());
                    }
                    const fnToken = parser.tokenSource.peek();
                    const func = (new FunctionSubparser()).parse(parser, null, false, operatorToken);
                    if (func.args.length > 1) {
                        panicAt(parser.tokenSource.reader, '[ESCE00045] Operator overloading functions can only have no arguments or one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (!isUnaryOperator(operatorToken.type) && func.args.length == 0) {
                        panicAt(parser.tokenSource.reader, '[ESCE00046] Non-unary operator overloads must have exactly one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (isUnaryOperatorOnly(operatorToken.type) && func.args.length != 0) {
                        panicAt(parser.tokenSource.reader, '[ESCE00047] Unary only operator overloads (unary only operators are ~ ++ -- !) must have no arguments', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    operatorOverloads[operatorToken.getSource()] = func;
                } else {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            panicAt(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(TokenType.RightCurlyBracket, '!!!');
        return new ClassExpression(name, typeParameters, typeConstraints, methods, properties, isStruct, operatorOverloads);
    }
}

export class EnumExpression extends Expression {
    constructor(public name: Pattern, public variants: [Pattern, Type[]][], public typeParameters: [Type[], TypeConstraint[]]) {
        super();
    }

    toString(): string {
        return `EnumExpression {${this.name.toString()}, [${this.variants.map(([name, types]) => `${name.toString()} (${types.map(typeToString).join(', ')})`).join(', ')}]}`;
    }
}

class EnumSubparser implements PrefixSubparser {
    parse(parser: Parser, token: Token): EnumExpression {
        const name = (new NamePatternSubparser()).parse(parser, parser.tokenSource.consume(TokenType.Identifier, 'a name is required for an enum'));
        let typeParameters: [Type[], TypeConstraint[]] = null;
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            typeParameters = parser.getTypeParameters();
        }
        const variants: [Pattern, Type[]][] = [];
        parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'expected \'{\' after \'enum <Identifier>\'');
        while (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                panicAt(parser.tokenSource.reader, '[ESCE00048] Double / leading commas are not allowed in enums', token.line, token.char, token.getSource());
            }
            const variantName = (new NamePatternSubparser()).parse(parser, parser.tokenSource.consume(TokenType.Identifier, 'a name is required for an enum variant'));
            const types: Type[] = [];
            if (parser.tokenSource.match(TokenType.LeftParenthesis)) {
                parser.tokenSource.next();
                while (!parser.tokenSource.match(TokenType.RightParenthesis)) {
                    if (parser.tokenSource.match(TokenType.Comma)) {
                        panicAt(parser.tokenSource.reader, '[ESCE00048] Double / leading commas are not allowed in enums', token.line, token.char, token.getSource());
                    }
                    const type = parser.getType();
                    types.push(type);
                    if (!parser.tokenSource.match(TokenType.RightParenthesis)) {
                        parser.tokenSource.consume(TokenType.Comma, 'a comma is required after enum variant types');
                    }
                }
                parser.tokenSource.next();
            }
            variants.push([variantName, types]);
            if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(TokenType.Comma, 'a comma is required after enum variants');
            }
        }
        parser.tokenSource.next();
        return new EnumExpression(name, variants, typeParameters);
    }
}

export class TraitExpression extends Expression {
    constructor(public name: Pattern, public typeParameters: Type[], public typeConstraints: TypeConstraint[], public methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][], public properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][], public structural: boolean, public operatorOverloads: { [operator: string]: FunctionExpression }) {
        super();
    }

    toString(): string {
        return `TraitExpression${this.structural ? '.Structural' : ''}<${zip(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}

export class TraitSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): TraitExpression {
        let structural = false;
        if (token.type === TokenType.Structural) {
            parser.tokenSource.consume(TokenType.Trait, 'expected \'structural\' after \'trait\'');
            structural = true;
        }
        const state = parser.tokenSource.state();
        console.log('type: ' + TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        const name = parser.getPattern(0);
        console.log('type: ' + TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        if (!(name instanceof NamePattern)) {
            parser.tokenSource.restore(state);
            const token = parser.tokenSource.next();
            panicAt(parser.tokenSource.reader, '[ESCE00036] Trait names must be identifiers', token.line, token.char, token.getSource());
        }
        let typeParameters = [], typeConstraints = [];
        console.log('Before Type Parameters');
        console.log('type: ' + TokenType[parser.tokenSource.peek().type] + ', ' + parser.tokenSource.peek().getSource());
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            console.log('Type Parameters');
            parser.tokenSource.next();
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][] = [];
        const properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][] = [];
        const blocks: ('static' | 'public' | 'protected')[] = [];
        const operatorOverloads: { [operator: string]: FunctionExpression } = {};
        loop: while (!parser.tokenSource.match(TokenType.RightCurlyBracket) || blocks.length > 0) {
            toEnd: do {
                if (parser.tokenSource.match(TokenType.RightCurlyBracket) && blocks.length != 0) {
                    blocks.pop();
                    parser.tokenSource.next();
                    continue toEnd;
                }
                if (parser.tokenSource.match(TokenType.Comma)) {
                    const errorToken = parser.tokenSource.next();
                    panicAt(parser.tokenSource.reader, '[ESCE00037] Leading or double commas are not allowed in traits', errorToken.line, errorToken.char, errorToken.getSource());
                }
                const token = parser.tokenSource.peek();
                if (![TokenType.Public, TokenType.Fn, TokenType.Identifier, TokenType.Private, TokenType.Protected, TokenType.Const, TokenType.Static, TokenType.Operator].includes(token.type)) {
                    panicAt(parser.tokenSource.reader, `[ESCE00038] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${TokenType[token.type]} instead`, token.line, token.char, token.getSource());
                }
                let modifier: 'instance' | 'static' = 'instance';
                let accessModifier: PrivacyModifier = 'public';
                if (parser.tokenSource.match(TokenType.Private)) {
                    const token = parser.tokenSource.next();
                    if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    }
                    warnAt(parser.tokenSource.reader, '[ESCW00003] Although nothing actually forbids this, putting private members in traits is nonsense.', token.line, token.char, token.getSource());
                } else if (parser.tokenSource.match(TokenType.Protected)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('protected')) {
                            blocks.push('protected');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    } else {
                        accessModifier = 'protected';
                    }
                } else if (parser.tokenSource.match(TokenType.Public)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('public')) {
                            blocks.push('public');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('protected') || blocks.includes('public')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] Privacy specifiers are not allowed within privacy blocks', token.line, token.char, token.getSource());
                    } else {
                        accessModifier = 'public';
                    }
                }
                if (parser.tokenSource.match(TokenType.Static)) {
                    parser.tokenSource.next();
                    if (parser.tokenSource.match(TokenType.LeftCurlyBracket)) {
                        if (blocks.length < 2 && !blocks.includes('static')) {
                            blocks.push('static');
                            parser.tokenSource.next();
                            continue loop;
                        } else {
                            const token = parser.tokenSource.next();
                            panicAt(parser.tokenSource.reader, '[ESCE00041] Privacy / staticness blocks cannot be nested more than two levels deep and there may not be two of the same type', token.line, token.char, token.getSource());
                        }
                    } else if (blocks.includes('static')) {
                        const token = parser.tokenSource.next();
                        panicAt(parser.tokenSource.reader, '[ESCE00042] \'static\' is not allowed within static blocks', token.line, token.char, token.getSource());
                    } else {
                        modifier = 'static';
                    }
                }
                if (blocks.includes('static')) {
                    modifier = 'static';
                }

                if (blocks.includes('protected') || blocks.includes('public')) {
                    accessModifier = blocks.includes('protected') ? 'protected' : 'public';
                }
                if (parser.tokenSource.match(TokenType.Fn)) {
                    const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next(), true);
                    methods.push([method, modifier, accessModifier]);
                } else if (parser.tokenSource.match(TokenType.Const)) {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            panicAt(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    if (!property.variableType) {
                        panicAt(parser.tokenSource.reader, '[ESCE00039] Trait properties must be explicitly typed', token.line, token.char, token.getSource());
                    }
                    properties.push([property, modifier, accessModifier]);
                } else if (parser.tokenSource.match(TokenType.Operator)) {
                    parser.tokenSource.next();
                    const operatorToken = parser.tokenSource.next();
                    if (!isOperator(operatorToken.type)) {
                        panicAt(parser.tokenSource.reader, `[ESCE00044] An operator was expected, got '${operatorToken.getSource()}' instead (valid operators are ! * ** / + - | || & && ^ >> << < > >= <= == ~)`, operatorToken.line, operatorToken.char, operatorToken.getSource());
                    }
                    const fnToken = parser.tokenSource.peek();
                    const func = (new FunctionSubparser()).parse(parser, null, true, operatorToken);
                    if (func.args.length > 1) {
                        panicAt(parser.tokenSource.reader, '[ESCE00045] Operator overloading functions can only have no arguments or one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (!isUnaryOperator(operatorToken.type) && func.args.length == 0) {
                        panicAt(parser.tokenSource.reader, '[ESCE00046] Non-unary operator overloads must have exactly one argument', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    if (isUnaryOperatorOnly(operatorToken.type) && func.args.length != 0) {
                        panicAt(parser.tokenSource.reader, '[ESCE00047] Unary only operator overloads (unary only operators are ~ ++ -- !) must have no arguments', fnToken.line, fnToken.char, fnToken.getSource());
                    }
                    operatorOverloads[operatorToken.getSource()] = func;
                } else {
                    const token = parser.tokenSource.peek();
                    const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                    for (const [declaration, _, __] of properties) {
                        if (declaration.pattern instanceof NamePattern && property.pattern instanceof NamePattern && declaration.pattern.name.identifier === property.pattern.name.identifier) {
                            panicAt(parser.tokenSource.reader, '[ESCE00043] A property with the same name has already been defined', token.line, token.char, token.getSource());
                        }
                    }
                    if (!property.variableType) {
                        panicAt(parser.tokenSource.reader, '[ESCE00039] Trait properties must be explicitly typed', token.line, token.char, token.getSource());
                    }
                    properties.push([property, modifier, accessModifier]);
                }
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(TokenType.RightCurlyBracket, '!!!');
        return new TraitExpression(name, typeParameters, typeConstraints, methods, properties, structural, operatorOverloads);
    }
}

export class AssignmentExpression extends Expression {
    constructor(public left: Expression, public right: Expression) {
        super();
    }

    toString(): string {
        return `AssignmentExpression {${this.left.toString()}, ${this.right.toString()}}`;
    }
}

class AssignmentSubparser implements InfixSubparser {
    precedence = 0.9;
    @logCalls
    parse(parser: Parser, left: Expression, token: Token): AssignmentExpression {
        const right = parser.getExpression(0);
        if (!(left instanceof IdentifierExpression) && !(left instanceof PropertyAccessExpression) && !(left instanceof ElementAccessExpression)) {
            panicAt(parser.tokenSource.reader, '[ESCE00019] Left expression of an assignment must be either an identifier, a property access or an indexing expression', token.line, token.char, token.getSource());
        }
        return new AssignmentExpression(left, right);
    }
}

class AtExpression extends Expression {
    constructor(public name: Identifier, public expression: Expression) {
        super();
    }

    toString(): string {
        return `AtExpression {IdentifierExpression[${this.name}], ${this.expression.toString()}}`;
    }
}

class AtSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): AtExpression {
        const name = parser.tokenSource.consume(TokenType.Identifier, 'expected an identifier');
        const expression = parser.getExpression(0);
        return new AtExpression(<Identifier>name, expression);
    }
}

export class ReturnExpression extends Expression {
    constructor(public returnValue?: Expression) {
        super();
    }

    toString(): string {
        return `ReturnExpression {${this.returnValue ? this.returnValue.toString() : ''}}`;
    }
}

class ReturnSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ReturnExpression {
        if (parser.canReadExpression()) {
            return new ReturnExpression(parser.getExpression(0));
        } else {
            return new ReturnExpression();
        }
    }
}

export class BreakExpression extends Expression {
    constructor(public breakValue?: Expression, public label?: string) {
        super();
    }

    toString(): string {
        return `BreakExpression${this.label ? '#' + this.label : ''} {${this.breakValue ? this.breakValue.toString() : ''}}`;
    }
}

class BreakSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): BreakExpression {
        let label: string = null;
        if (parser.tokenSource.match(TokenType.Label)) {
            label = (<Label>parser.tokenSource.next()).labelText;
        }
        if (parser.canReadExpression()) {
            return new BreakExpression(parser.getExpression(0), label);
        } else {
            return new BreakExpression(null, label);
        }
    }
}

export class ContinueExpression extends Expression {
    constructor(public label?: string) {
        super();
    }

    toString(): string {
        return `ContinueExpression${this.label ? '#' + this.label : ''}`;
    }
}

class ContinueSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ContinueExpression {
        return new ContinueExpression(parser.tokenSource.match(TokenType.Label) ? (<Label>parser.tokenSource.next()).labelText : null);
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

class LabelSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, token: Token): ForExpression | LoopExpression | Block {
        parser.tokenSource.consume(TokenType.Colon, 'expected a colon after a label');
        const expression = parser.getExpression(Infinity);
        if (!(expression instanceof ForExpression || expression instanceof LoopExpression)) {
            panicAt(parser.tokenSource.reader, '[ESCE00022] Cannot label anything that is not a for loop, a \'loop\' loop, or a block.', token.line, token.char, token.getSource());
        }
        const typedExpression = <ForExpression | LoopExpression | Block>expression;
        typedExpression.label = (<Label>token).labelText;
        return typedExpression;
    }
}

class MapExpression extends Expression {
    constructor(public keys: Expression[], public values: Expression[]) {
        super();
    }

    toString(): string {
        return `MapExpression {${zip(this.keys, this.values).map(x => x[0].toString() + ': ' + x[1].toString()).join(', ')}}`;
    }
}

class MapSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): MapExpression {
        const keys: Expression[] = [];
        const values: Expression[] = [];
        parser.tokenSource.consume(TokenType.LeftCurlyBracket, 'expected a \'{\' after \'map!\'');
        while (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00025] Leading / double commas are not allowed within map literals.', token.line, token.char, token.getSource());
            }
            keys.push(parser.getExpression(0));
            parser.tokenSource.consume(TokenType.Colon, 'expected a colon after a key');
            values.push(parser.getExpression(0));
            if (parser.tokenSource.match(TokenType.Comma)) {
                parser.tokenSource.next();
            } else if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                const token = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00026] A map literal\'s key/value pairs should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the '}'
        return new MapExpression(keys, values);
    }
}

function expressionAsPattern(expression: Expression): Pattern {
    if (expression instanceof IdentifierExpression) {
        return new NamePattern(expression.token);
    } else if (expression instanceof AtExpression) {
        return new NamedPattern(expressionAsPattern(expression.expression), expression.name);
    } else if (expression instanceof ListExpression) {
        return new ListPattern(expression.elements.map(x => expressionAsPattern(x)));
    }
}

export class ImportSection {
    type: 'terminal' | 'list' | 'element';
    next?: ImportSection[] | ImportSection;
    content?: Identifier;
    alias?: Identifier;
    constructor(type: 'terminal' | 'list' | 'element', next: ImportSection[] | ImportSection, content?: Identifier, alias?: Identifier) {
        this.type = type;
        this.next = next;
        this.content = content;
        this.alias = alias;
    }

    toString(): string {
        if (this.type == 'list') {
            return `{${(<ImportSection[]>this.next).map(x => x.toString()).join(', ')}}`;
        } else if (this.type == 'element') {
            return `${this.content.identifier}.${this.next.toString()}`;
        } else {
            return `${this.content.identifier}${this.alias ? ' as ' + this.alias.identifier : ''}`;
        }
    }
}

// Main parser class
export class Parser {
    tokenSource: BetterTokenStream;
    prefixSubparsers: Map<TokenType, PrefixSubparser> = new Map();
    infixSubparsers: Map<TokenType, InfixSubparser> = new Map();
    prefixPatternSubparsers: Map<TokenType, PrefixPatternSubparser> = new Map();
    infixPatternSubparsers: Map<TokenType, InfixPatternSubparser> = new Map();
    conditionsOfPrefixSubparsers: Map<TokenType, (token: Token) => boolean> = new Map();
    constructor(source: TokenStream, reader: StringReader) {
        this.tokenSource = new BetterTokenStream(source, reader);
        this.registerPrefix(TokenType.Identifier, new IdentifierSubparser());
        const self = this;
        [TokenType.Plus, TokenType.Minus, TokenType.Tilde, TokenType.Bang].forEach(type => {
            self.registerPrefix(type, new PrefixOperatorSubparser());
        });
        [TokenType.BooleanLiteral, TokenType.CharacterLiteral, TokenType.StringLiteral, TokenType.NumericLiteral, TokenType.TemplateStringLiteral].forEach(type => {
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
        this.registerPrefix(TokenType.Loop, new LoopSubparser());
        this.registerPrefix(TokenType.Struct, new ClassSubparser());
        this.registerPrefix(TokenType.Class, new ClassSubparser());
        this.registerPrefix(TokenType.Return, new ReturnSubparser());
        this.registerPrefix(TokenType.Break, new BreakSubparser());
        this.registerPrefix(TokenType.Continue, new ContinueSubparser());
        this.registerPrefix(TokenType.Label, new LabelSubparser());
        this.registerPrefix(TokenType.LeftBracket, new ListSubparser());
        this.registerPrefix(TokenType.Macro, new MapSubparser());
        this.registerPrefix(TokenType.AtSign, new AtSubparser());
        this.registerPrefix(TokenType.Trait, new TraitSubparser());
        this.registerPrefix(TokenType.Structural, new TraitSubparser());
        this.registerPrefix(TokenType.Enum, new EnumSubparser());
        this.conditionsOfPrefixSubparsers.set(TokenType.Macro, (token => (<Macro>token).identifier == 'map!'));
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
        this.registerInfix(TokenType.Equals, new AssignmentSubparser());

        // Pattern handlers registering
        this.registerPrefixPattern(TokenType.AtSign, new NamedPatternSubparser());
        this.registerPrefixPattern(TokenType.Identifier, new NamePatternSubparser());
        this.registerPrefixPattern(TokenType.LeftBracket, new ListPatternSubparser());
        this.registerPrefixPattern(TokenType.LeftCurlyBracket, new ObjectPatternSubparser());
    }

    registerPrefix(type: TokenType, subparser: PrefixSubparser): void {
        this.prefixSubparsers.set(type, subparser);
    }

    registerInfix(type: TokenType, subparser: InfixSubparser): void {
        this.infixSubparsers.set(type, subparser);
    }

    registerPrefixPattern(type: TokenType, subparser: PrefixPatternSubparser): void {
        this.prefixPatternSubparsers.set(type, subparser);
    }

    registerInfixPattern(type: TokenType, subparser: InfixPatternSubparser): void {
        this.infixPatternSubparsers.set(type, subparser);
    }

    getPrecedenceForPattern(): number {
        const patternSubparser = this.infixPatternSubparsers.get(this.tokenSource.peek().type);
        if (patternSubparser) {
            return patternSubparser.precedence;
        }
        return 0;
    }

    canReadExpression(): boolean {
        return this.prefixSubparsers.has(this.tokenSource.peek().type);
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
        if (!this.prefixSubparsers.has(token.type) || (this.conditionsOfPrefixSubparsers.has(token.type) && !this.conditionsOfPrefixSubparsers.get(token.type)(token))) {
            panicAt(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}' (expected an expression)`, token.line, token.char, token.getSource());
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

    getPattern(precedence: number): Pattern {
        let token: Token = this.tokenSource.next();
        if (!this.prefixPatternSubparsers.has(token.type)) {
            panicAt(this.tokenSource.reader, `[ESCE00027] Could not parse : '${token.getSource()}' (expected a pattern)`, token.line, token.char, token.getSource());
        }
        let left = this.prefixPatternSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedenceForPattern()) {
            token = this.tokenSource.next();
            const infix = this.infixPatternSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            } catch (e) {
                panicAt(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }

        return left;
    }

    getTypeParameters(): [Type[], TypeConstraint[]] {
        this.tokenSource.next(); // Consume the '['
        const names: Identifier[] = [];
        const constraints: TypeConstraint[] = [];
        while (!this.tokenSource.match(TokenType.RightBracket)) {
            if (this.tokenSource.match(TokenType.Comma)) {
                const token = this.tokenSource.next();
                panicAt(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            names.push(<Identifier>this.tokenSource.consume(TokenType.Identifier, 'a type parameter name was expected'));
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
        return [names.map(x => <Type>{ plain: true, value: x }), constraints];
    }

    getType(raw = false): Type {
        let type: Type = {
            plain: true,
            value: <Identifier>this.tokenSource.consume(TokenType.Identifier, 'expected a type name')
        };
        if (raw) return type;
        if (this.tokenSource.match(TokenType.LeftBracket)) {
            this.tokenSource.next();
            type = {
                plain: false,
                value: type.value,
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
                type.typeParameters.push(parameter);
                if (this.tokenSource.match(TokenType.Comma)) {
                    this.tokenSource.next(); // Consume the comma
                }
            }
            this.tokenSource.next(); // Consume the ']'
        }
        return type;
    }

    parseImport(): ImportSection {
        if (this.tokenSource.match(TokenType.LeftCurlyBracket)) {
            this.tokenSource.next();
            const list: ImportSection[] = [];
            while (!this.tokenSource.match(TokenType.RightCurlyBracket)) {
                if (this.tokenSource.match(TokenType.Comma)) {
                    const token = this.tokenSource.next();
                    panicAt(this.tokenSource.reader, '[ESCE00028] No leading / double commas are allowed within imports', token.line, token.char, token.getSource());
                }
                list.push(this.parseImport());
                if (this.tokenSource.match(TokenType.Comma)) {
                    this.tokenSource.next();
                } else if (!this.tokenSource.match(TokenType.RightCurlyBracket)) {
                    const token = this.tokenSource.next();
                    panicAt(this.tokenSource.reader, '[ESCE00029] Expected either \'}\' or an import section', token.line, token.char, token.getSource());
                }
            }
            const token = this.tokenSource.next(); // Consume the '}'
            if (list.length == 0) {
                panicAt(this.tokenSource.reader, '[ESCE00030] Cannot import nothing from a module', token.line, token.char, token.getSource());
            }
            return new ImportSection('list', list);
        } else if (this.tokenSource.match(TokenType.Identifier)) {
            const token = <Identifier>this.tokenSource.next();
            if (this.tokenSource.match(TokenType.Dot)) {
                this.tokenSource.next();
                return new ImportSection('element', this.parseImport(), token);
            } else if (this.tokenSource.match(TokenType.As)) {
                this.tokenSource.next(); // Consume the 'as'
                return new ImportSection('terminal', null, token, <Identifier>this.tokenSource.consume(TokenType.Identifier, 'expected an identifier after \'as\''));
            } else {
                return new ImportSection('terminal', null, token);
            }
        }
    }
}