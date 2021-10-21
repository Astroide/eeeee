import { tokenTypeExplanations } from './explanations';
import { TokenStream } from './tokenizer';
import { BooleanLiteral, CharLiteral, Identifier, Label, Macro, NumberLiteral, StringLiteral, TemplateStringElement, TemplateStringLiteral, Token, TokenType } from './tokens';
import { logCalls, panicAt, StringReader, warnAt, zip } from './utilities';

class PeekableTokenStream {
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

    rewind(state: number): void {
        while (this.index != state) {
            this.index--;
            this.nextTokens.unshift(this.stack.pop());
        }
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

class Pattern { }

interface PrefixPatternSubparser {
    parse(parser: Parser, token: Token): Pattern;
}

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

export class Expression { }

export class GroupExpression extends Expression {
    content: Expression;
    constructor(content: Expression) {
        super();
        this.content = content;
    }

    toString(): string {
        return `GroupExpression {${this.content.toString()}}`;
    }
}

export class FunctionCallExpression extends Expression {
    callee: Expression;
    args: [Expression, Identifier?][];
    constructor(callee: Expression, args: [Expression, Identifier?][]) {
        super();
        this.callee = callee;
        this.args = args;
    }

    toString(): string {
        return `FunctionCall {${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}}`;
    }
}

export class ElementAccessExpression extends Expression {
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

export class IdentifierExpression extends Expression {
    id: string;
    token: Identifier;
    constructor(token: Identifier) {
        super();
        this.id = token.identifier;
        this.token = token;
    }

    toString(): string {
        return `Identifier[${this.id}]`;
    }
}

export class LiteralExpression extends Expression {
    value: string | number | boolean | TemplateStringElement;
    type: TokenType.NumericLiteral | TokenType.BooleanLiteral | TokenType.StringLiteral | TokenType.CharacterLiteral | TokenType.TemplateStringLiteral;
    constructor(value: string | number | boolean | TemplateStringElement, type: TokenType.NumericLiteral | TokenType.BooleanLiteral | TokenType.StringLiteral | TokenType.CharacterLiteral | TokenType.TemplateStringLiteral) {
        super();
        this.value = value;
        this.type = type;
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

export class PrefixOperatorExpression extends Expression {
    operator: TokenType;
    operand: Expression;
    constructor(operator: TokenType, operand: Expression) {
        super();
        this.operator = operator;
        this.operand = operand;
    }

    toString(): string {
        return TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}

export class StatementExpression extends Expression {
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
    label?: string = null;
    constructor(expression: Expression) {
        super();
        this.expression = expression;
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

export class IfExpression extends Expression {
    condition: Expression;
    thenBranch: Block;
    elseBranch?: Block | IfExpression;
    constructor(condition: Expression, thenBranch: Block, elseBranch?: Block | IfExpression) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }

    toString(): string {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}

export class WhileExpression extends Expression {
    condition: Expression;
    body: Block;
    constructor(condition: Expression, body: Block) {
        super();
        this.condition = condition;
        this.body = body;
    }

    toString(): string {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}

export class LoopExpression extends Expression {
    body: Block;
    label?: string = null;
    constructor(body: Block) {
        super();
        this.body = body;
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
    elements: Expression[];
    constructor(elements: Expression[]) {
        super();
        this.elements = elements;
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
        return new LetOrConstDeclarationExpression(type, pattern, value, variableType);
    }
}

export class LetOrConstDeclarationExpression extends Expression {
    type: 'let' | 'const';
    pattern: Pattern;
    value?: Expression;
    variableType?: Type;
    constructor(type: 'let' | 'const', name: Pattern, value?: Expression, variableType?: Type) {
        super();
        this.type = type;
        this.pattern = name;
        this.value = value;
        this.variableType = variableType;
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
    kind: 'a,b,c' | 'a in b';
    condition: ForABC | ForAInB;
    body: Block;
    label?: string = null;

    constructor(condition: {
        init: Expression;
        condition: Expression;
        repeat: Expression;
    } | {
        name: Pattern;
        iterator: Expression;
    }, body: Block, kind: 'a,b,c' | 'a in b') {
        super();
        this.kind = kind;
        this.condition = condition;
        this.body = body;
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
        // const state = parser.tokenSource.state();
        if (!parser.tokenSource.match(TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        if (parser.tokenSource.match(TokenType.In)) {
            // parser.tokenSource.rewind(state);
            const name = expressionAsPattern(init);//parser.getPattern(0);
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
    args: [Pattern, Expression?][];
    body: Expression;
    typesOfArguments: Type[];
    constructor(args: [Pattern, Expression?][], typesOfArguments: Type[], body: Expression) {
        super();
        this.args = args;
        this.body = body;
        this.typesOfArguments = typesOfArguments;
    }

    toString(): string {
        return `LambdaFunction {[${zip(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}

export class FunctionExpression extends Expression {
    typeParameters: Type[];
    args: [Pattern, Expression?][];
    typesOfArguments: Type[];
    body: Block;
    namePattern: Pattern;
    returnType?: Type;
    typeConstraints: TypeConstraint[];

    constructor(typeParameters: Type[], args: [Pattern, Expression?][], typesOfArguments: Type[], body: Block, name: Pattern, typeConstraints: TypeConstraint[], returnType?: Type) {
        super();
        this.typeParameters = typeParameters;
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
        this.namePattern = name;
        this.returnType = returnType;
        this.typeConstraints = typeConstraints;
    }

    toString(): string {
        return `Function<${zip(this.typeParameters, this.typeConstraints).map(x => `${typeToString(x[0])} ${typeConstraintToString(x[1])}`).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {${this.namePattern.toString()}, [${zip(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + typeToString(type)).join(', ')}], ${this.body.toString()}]`;
    }
}

class FunctionSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): FunctionExpression {
        const functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(TokenType.Identifier, 'a function name is required'));
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
        const body = (new BlockSubparser()).parse(parser, token);
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
    typeParameters: Type[];
    typeConstraints: TypeConstraint[];
    name: Pattern;
    methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][];
    properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][];
    constructor(name: Pattern, typeParameters: Type[], typeConstraints: TypeConstraint[], methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][], properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][]) {
        super();
        this.name = name;
        this.typeParameters = typeParameters;
        this.typeConstraints = typeConstraints;
        this.methods = methods;
        this.properties = properties;
    }

    toString(): string {
        return `ClassExpression<${zip(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}

class ClassSubparser implements PrefixSubparser {
    @logCalls
    parse(parser: Parser, _token: Token): ClassExpression {
        const name = parser.getPattern(0);
        let typeParameters = [], typeConstraints = [];
        if (parser.tokenSource.match(TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods: [FunctionExpression, 'static' | 'instance', PrivacyModifier][] = [];
        const properties: [LetOrConstDeclarationExpression, 'static' | 'instance', PrivacyModifier][] = [];
        while (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(TokenType.Comma)) {
                const errorToken = parser.tokenSource.next();
                panicAt(parser.tokenSource.reader, '[ESCE00018] Leading or double commas are not allowed in classes', errorToken.line, errorToken.char, errorToken.getSource());
            }
            const token = parser.tokenSource.peek();
            if (![TokenType.Public, TokenType.Fn, TokenType.Identifier, TokenType.Private, TokenType.Protected, TokenType.Const, TokenType.Static].includes(token.type)) {
                panicAt(parser.tokenSource.reader, `[ESCE00019] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${TokenType[token.type]} instead`, token.line, token.char, token.getSource());
            }
            let modifier: 'instance' | 'static' = 'instance';
            let accessModifier: PrivacyModifier = 'private';
            if (parser.tokenSource.match(TokenType.Private)) {
                const token = parser.tokenSource.next();
                warnAt(parser.tokenSource.reader, '[ESCW00002] The \'private\' access specifier is not required, properties and methods are private by default', token.line, token.char, token.getSource());
            } else if (parser.tokenSource.match(TokenType.Protected)) {
                parser.tokenSource.next();
                accessModifier = 'protected';
            } else if (parser.tokenSource.match(TokenType.Public)) {
                parser.tokenSource.next();
                accessModifier = 'public';
            }
            if (parser.tokenSource.match(TokenType.Static)) {
                parser.tokenSource.next();
                modifier = 'static';
            }
            if (parser.tokenSource.match(TokenType.Fn)) {
                const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next());
                methods.push([method, modifier, accessModifier]);
            } else if (parser.tokenSource.match(TokenType.Const)) {
                const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                properties.push([property, modifier, accessModifier]);
            } else {
                const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                properties.push([property, modifier, accessModifier]);
            }
            if (!parser.tokenSource.match(TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(TokenType.RightCurlyBracket, '!!!');
        return new ClassExpression(name, typeParameters, typeConstraints, methods, properties);
    }
}

export class AssignmentExpression extends Expression {
    left: Expression;
    right: Expression;
    constructor(left: Expression, right: Expression) {
        super();
        this.left = left;
        this.right = right;
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
    name: Identifier;
    expression: Expression;
    constructor(name: Identifier, expression: Expression) {
        super();
        this.name = name;
        this.expression = expression;
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
    returnValue?: Expression;
    constructor(returnValue?: Expression) {
        super();
        this.returnValue = returnValue;
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
    breakValue?: Expression;
    label?: string;
    constructor(breakValue?: Expression, label?: string) {
        super();
        this.breakValue = breakValue;
        this.label = label;
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
    label?: string;
    constructor(label?: string) {
        super();
        this.label = label;
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

class MapExpression {
    keys: Expression[];
    values: Expression[];
    constructor(keys: Expression[], values: Expression[]) {
        this.keys = keys;
        this.values = values;
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

class NamePatternSubparser implements PrefixPatternSubparser {
    @logCalls
    parse(_parser: Parser, token: Token): NamePattern {
        return new NamePattern(<Identifier>token);
    }
}

function expressionAsPattern(expression: Expression): Pattern {
    if (expression instanceof IdentifierExpression) {
        return new NamePattern(expression.token);
    } else if (expression instanceof AtExpression) {
        return new NamedPattern(expressionAsPattern(expression.expression), expression.name);
    }
}

export class Parser {
    tokenSource: PeekableTokenStream;
    prefixSubparsers: Map<TokenType, PrefixSubparser> = new Map();
    infixSubparsers: Map<TokenType, InfixSubparser> = new Map();
    prefixPatternSubparsers: Map<TokenType, PrefixPatternSubparser> = new Map();
    infixPatternSubparsers: Map<TokenType, InfixPatternSubparser> = new Map();
    conditionsOfPrefixSubparsers: Map<TokenType, (token: Token) => boolean> = new Map();
    constructor(source: TokenStream, reader: StringReader) {
        this.tokenSource = new PeekableTokenStream(source, reader);
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
        this.registerPrefix(TokenType.Class, new ClassSubparser());
        this.registerPrefix(TokenType.Return, new ReturnSubparser());
        this.registerPrefix(TokenType.Break, new BreakSubparser());
        this.registerPrefix(TokenType.Continue, new ContinueSubparser());
        this.registerPrefix(TokenType.Label, new LabelSubparser());
        this.registerPrefix(TokenType.LeftBracket, new ListSubparser());
        this.registerPrefix(TokenType.Macro, new MapSubparser());
        this.registerPrefix(TokenType.AtSign, new AtSubparser());
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
}
