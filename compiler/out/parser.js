"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const explanations_1 = require("./explanations");
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
class PeekableTokenStream {
    constructor(stream, reader) {
        this.nextTokens = [];
        this.stream = stream;
        this.reader = reader;
    }
    next() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens.shift();
        }
        else {
            return this.stream.gen.next().value;
        }
    }
    peek() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(this.stream.gen.next().value);
        return this.nextTokens[0];
    }
    match(type) {
        const next = this.peek();
        return next.type == type;
    }
    consume(type, message) {
        const next = this.next();
        if (next.type != type) {
            (0, utilities_1.panicAt)(this.reader, `[ESCE00010] Expected TokenType.${tokens_1.TokenType[type]}${explanations_1.tokenTypeExplanations.has(type) ? ` (${explanations_1.tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
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
class IdentifierSubparser {
    parse(parser, token) {
        return new IdentifierExpression(token.getSource());
    }
}
__decorate([
    utilities_1.logCalls
], IdentifierSubparser.prototype, "parse", null);
class PrefixOperatorSubparser {
    parse(parser, token) {
        const operand = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}
__decorate([
    utilities_1.logCalls
], PrefixOperatorSubparser.prototype, "parse", null);
class InfixOperatorSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, left, token) {
        const right = parser.getExpression(Precedence.SUM);
        return new InfixOperatorExpression(token.type, left, right);
    }
}
__decorate([
    utilities_1.logCalls
], InfixOperatorSubparser.prototype, "parse", null);
class GroupSubparser {
    parse(parser, _token) {
        const inside = parser.getExpression(0);
        parser.tokenSource.consume(tokens_1.TokenType.RightParenthesis, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }
}
__decorate([
    utilities_1.logCalls
], GroupSubparser.prototype, "parse", null);
class FunctionCallSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, callee, _token) {
        const args = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const arg = parser.getExpression(0);
            args.push(arg);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new FunctionCallExpression(callee, args);
    }
}
__decorate([
    utilities_1.logCalls
], FunctionCallSubparser.prototype, "parse", null);
class ElementAccessSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, object, _token) {
        const indexes = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate indexes and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const index = parser.getExpression(this.precedence);
            indexes.push(index);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new ElementAccessExpression(object, indexes);
    }
}
__decorate([
    utilities_1.logCalls
], ElementAccessSubparser.prototype, "parse", null);
class Expression {
}
class GroupExpression extends Expression {
    constructor(content) {
        super();
        this.content = content;
    }
    toString() {
        return `GroupExpression {${this.content.toString()}}`;
    }
}
class FunctionCallExpression extends Expression {
    constructor(callee, args) {
        super();
        this.callee = callee;
        this.args = args;
    }
    toString() {
        return `FunctionCall {${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}}`;
    }
}
class ElementAccessExpression extends Expression {
    constructor(left, indexes) {
        super();
        this.left = left;
        this.indexes = indexes;
    }
    toString() {
        return `IndexingExpression {${this.left.toString()}${this.indexes.length > 0 ? ', ' + this.indexes.map(x => x.toString()).join(', ') : ''}}`;
    }
}
class IdentifierExpression extends Expression {
    constructor(id) {
        super();
        this.id = id;
    }
    toString() {
        return `Identifier[${this.id}]`;
    }
}
class LiteralExpression extends Expression {
    constructor(value, type) {
        super();
        this.value = value;
        this.type = type;
    }
    toString() {
        return `${tokens_1.TokenType[this.type]}[${this.value}]`;
    }
}
class LiteralSubparser {
    parse(_parser, token) {
        if (token.type == tokens_1.TokenType.CharacterLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.CharacterLiteral);
        else if (token.type == tokens_1.TokenType.StringLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.StringLiteral);
        else if (token.type == tokens_1.TokenType.NumericLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.NumericLiteral);
        else if (token.type == tokens_1.TokenType.BooleanLiteral)
            return new LiteralExpression(token.content, tokens_1.TokenType.BooleanLiteral);
    }
}
__decorate([
    utilities_1.logCalls
], LiteralSubparser.prototype, "parse", null);
class PropertyAccessExpression extends Expression {
    constructor(object, property) {
        super();
        this.object = object;
        this.property = property;
    }
    toString() {
        return `PropertyAccess {${this.object.toString()}, ${this.property}}`;
    }
}
class PropertyAccessSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, left, _token) {
        const propertyName = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a property name after a dot').getSource();
        return new PropertyAccessExpression(left, propertyName);
    }
}
__decorate([
    utilities_1.logCalls
], PropertyAccessSubparser.prototype, "parse", null);
class PrefixOperatorExpression {
    constructor(operator, operand) {
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return tokens_1.TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}
class StatementExpression extends Expression {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    toString() {
        return `${this.left} ; ${this.right}`;
    }
}
class StatementSubparser {
    constructor() {
        this.precedence = 0.5;
    }
    parse(parser, left, _token) {
        const right = parser.getExpression(0);
        return new StatementExpression(left, right);
    }
}
__decorate([
    utilities_1.logCalls
], StatementSubparser.prototype, "parse", null);
class Block extends Expression {
    constructor(expression) {
        super();
        this.expression = expression;
    }
    toString() {
        return `Block {${this.expression.toString()}}`;
    }
}
class BlockSubparser {
    parse(parser, _token) {
        const expression = parser.getExpression(0);
        parser.tokenSource.consume(tokens_1.TokenType.RightCurlyBracket, 'a \'}\' was expected at the end of a block');
        return new Block(expression);
    }
}
__decorate([
    utilities_1.logCalls
], BlockSubparser.prototype, "parse", null);
class InfixOperatorExpression extends Expression {
    constructor(operator, left, right) {
        super();
        this.operator = operator;
        this.leftOperand = left;
        this.rightOperand = right;
    }
    toString() {
        return `${tokens_1.TokenType[this.operator]}.infix {${this.leftOperand.toString()}, ${this.rightOperand.toString()}}`;
    }
}
class IfExpression {
    constructor(condition, thenBranch, elseBranch) {
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
    toString() {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}
class WhileExpression {
    constructor(condition, body) {
        this.condition = condition;
        this.body = body;
    }
    toString() {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}
class IfSubparser {
    parse(parser, _token) {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an if\'s condition');
        const thenBranch = (new BlockSubparser()).parse(parser, token);
        let elseBranch = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Else)) {
            parser.tokenSource.next(); // Consume 'else'
            const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an \'else\'');
            elseBranch = (new BlockSubparser()).parse(parser, token);
        }
        return new IfExpression(condition, thenBranch, elseBranch);
    }
}
__decorate([
    utilities_1.logCalls
], IfSubparser.prototype, "parse", null);
class WhileSubparser {
    parse(parser, _token) {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an while\'s condition');
        const body = (new BlockSubparser()).parse(parser, token);
        return new WhileExpression(condition, body);
    }
}
__decorate([
    utilities_1.logCalls
], WhileSubparser.prototype, "parse", null);
class TypeCastingExpression extends Expression {
    constructor(type, value) {
        super();
        this.value = value;
        this.type = type;
    }
    toString() {
        return `Typecast {${typeToString(this.type)}, ${this.value.toString()}}`;
    }
}
class TypeCastingSubparser {
    parse(parser, _token) {
        const type = parser.getType();
        parser.tokenSource.consume(tokens_1.TokenType.RightAngleBracket, 'expected a \'>\' after a type cast');
        const expression = parser.getExpression(Precedence.PREFIX);
        return new TypeCastingExpression(type, expression);
    }
}
class LetOrConstDeclarationSubparser {
    parse(parser, token) {
        const type = token.type == tokens_1.TokenType.Let ? 'let' : 'const';
        const name = parser.tokenSource.consume(tokens_1.TokenType.Identifier, `expected an identifier after ${type}`);
        let variableType = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
            parser.tokenSource.next();
            variableType = parser.getType();
        }
        let value = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
            parser.tokenSource.next();
            value = parser.getExpression(0);
        }
        return new LetOrConstDeclarationExpression(type, name, value, variableType);
    }
}
class LetOrConstDeclarationExpression extends Expression {
    constructor(type, name, value, variableType) {
        super();
        this.type = type;
        this.name = name;
        this.value = value;
        this.variableType = variableType;
    }
    toString() {
        return `${this.type} {${(new IdentifierExpression(this.name.getSource())).toString()}, ${this.variableType ? typeToString(this.variableType) : '<inferred type>'}${this.value ? ', ' + this.value.toString() : ''}}`;
    }
}
function typeToString(type) {
    if (type.plain)
        return type.value.getSource();
    else
        return `${type.value.getSource()}[${type.typeParameters.map(x => typeToString(x)).join(', ')}]`;
}
class PostfixOperatorExpression extends Expression {
    constructor(operator, operand) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return `${tokens_1.TokenType[this.operator]}.postfix {${this.operand.toString()}}`;
    }
}
class PostfixOperatorSubparser {
    constructor() {
        this.precedence = Precedence.POSTFIX;
    }
    parse(parser, left, token) {
        return new PostfixOperatorExpression(token.type, left);
    }
}
__decorate([
    utilities_1.logCalls
], PostfixOperatorSubparser.prototype, "parse", null);
class ForExpression extends Expression {
    constructor(init, condition, repeat, body) {
        super();
        this.init = init;
        this.condition = condition;
        this.repeat = repeat;
        this.body = body;
    }
    toString() {
        return `ForExpression {${this.init.toString()}, ${this.condition.toString()}, ${this.repeat.toString()}, ${this.body.toString()}}`;
    }
}
class ForSubparser {
    parse(parser, _token) {
        let init = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let condition = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let repeat = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        if (!parser.tokenSource.match(tokens_1.TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        parser.tokenSource.consume(tokens_1.TokenType.Comma, 'expected a comma after a for loop\'s initialization expression');
        if (!parser.tokenSource.match(tokens_1.TokenType.Comma)) {
            condition = parser.getExpression(0);
        }
        parser.tokenSource.consume(tokens_1.TokenType.Comma, 'expected a comma after a for loop\'s condition');
        if (!parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
            repeat = parser.getExpression(0);
        }
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s repeating expression');
        const loopBody = (new BlockSubparser()).parse(parser, token);
        return new ForExpression(init, condition, repeat, loopBody);
    }
}
class LambdaFunctionExpression extends Expression {
    constructor(args, typesOfArguments, body) {
        super();
        this.args = args;
        this.body = body;
        this.typesOfArguments = typesOfArguments;
    }
    toString() {
        return `LambdaFunction {[${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name.toString() + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}
class FunctionExpression extends Expression {
    constructor(typeParameters, args, typesOfArguments, body, name, returnType) {
        super();
        this.typeParameters = typeParameters;
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
        this.name = name;
        this.returnType = returnType;
    }
    toString() {
        return `Function<${this.typeParameters.map(x => x.id).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {[${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name.toString() + ': ' + typeToString(type)).join(', ')}], ${this.body.toString()}]`;
    }
}
class FunctionSubparser {
    parse(parser, _token) {
        const functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a function name is required'));
        const typeParameters = [];
        if (parser.tokenSource.match(tokens_1.TokenType.LeftAngleBracket)) {
            parser.tokenSource.next(); // Consume the <
            while (!parser.tokenSource.match(tokens_1.TokenType.RightAngleBracket)) {
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                typeParameters.push((new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a type parameter name was expected')));
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    parser.tokenSource.next();
                }
                else if (!parser.tokenSource.match(tokens_1.TokenType.RightAngleBracket)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                }
            }
            parser.tokenSource.next(); // Consume the '>'
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftParenthesis, '[ESCE00015] A left parenthesis is required to start a function\'s argument list');
        const args = [];
        const typesOfArguments = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            args.push(parser.getNamePattern());
            if (!parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                const wrongToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00016] Function arguments MUST be typed (e.g. fn func(a: int, b: int) {})', wrongToken.line, wrongToken.char, wrongToken.getSource());
            }
            else {
                parser.tokenSource.next();
                typesOfArguments.push(parser.getType());
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ')'
        let returnType = null;
        if (!parser.tokenSource.match(tokens_1.TokenType.LeftCurlyBracket)) {
            returnType = parser.getType();
        }
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start');
        const body = (new BlockSubparser()).parse(parser, token);
        return new FunctionExpression(typeParameters, args, typesOfArguments, body, functionName, returnType);
    }
}
class LambdaFunctionSubparser {
    parse(parser, token) {
        const args = [];
        const typesOfArguments = [];
        if (token.type == tokens_1.TokenType.Pipe) {
            // Function potentially has arguments
            while (!parser.tokenSource.match(tokens_1.TokenType.Pipe)) {
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                args.push(parser.getNamePattern());
                if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                    parser.tokenSource.next();
                    typesOfArguments.push(parser.getType());
                }
                else {
                    typesOfArguments.push(null);
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                    parser.tokenSource.next();
                }
                else if (!parser.tokenSource.match(tokens_1.TokenType.Pipe)) {
                    const token = parser.tokenSource.next();
                    (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                }
            }
            parser.tokenSource.next(); // Consume the '|'
        }
        const body = parser.getExpression(0);
        return new LambdaFunctionExpression(args, typesOfArguments, body);
    }
}
__decorate([
    utilities_1.logCalls
], LambdaFunctionSubparser.prototype, "parse", null);
class Parser {
    constructor(source, reader) {
        this.prefixSubparsers = new Map();
        this.infixSubparsers = new Map();
        this.tokenSource = new PeekableTokenStream(source, reader);
        this.registerPrefix(tokens_1.TokenType.Identifier, new IdentifierSubparser());
        const self = this;
        [tokens_1.TokenType.Plus, tokens_1.TokenType.Minus, tokens_1.TokenType.Tilde, tokens_1.TokenType.Bang].forEach(type => {
            self.registerPrefix(type, new PrefixOperatorSubparser());
        });
        [tokens_1.TokenType.BooleanLiteral, tokens_1.TokenType.CharacterLiteral, tokens_1.TokenType.StringLiteral, tokens_1.TokenType.NumericLiteral].forEach(type => {
            self.registerPrefix(type, new LiteralSubparser());
        });
        this.registerPrefix(tokens_1.TokenType.LeftCurlyBracket, new BlockSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftParenthesis, new GroupSubparser());
        this.registerPrefix(tokens_1.TokenType.If, new IfSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftAngleBracket, new TypeCastingSubparser());
        this.registerPrefix(tokens_1.TokenType.Let, new LetOrConstDeclarationSubparser());
        this.registerPrefix(tokens_1.TokenType.Const, new LetOrConstDeclarationSubparser());
        this.registerPrefix(tokens_1.TokenType.While, new WhileSubparser());
        this.registerPrefix(tokens_1.TokenType.For, new ForSubparser());
        this.registerPrefix(tokens_1.TokenType.Pipe, new LambdaFunctionSubparser());
        this.registerPrefix(tokens_1.TokenType.DoublePipe, new LambdaFunctionSubparser());
        this.registerPrefix(tokens_1.TokenType.Fn, new FunctionSubparser());
        [
            [tokens_1.TokenType.Ampersand, Precedence.CONDITIONAL],
            [tokens_1.TokenType.DoubleAmpersand, Precedence.SUM],
            [tokens_1.TokenType.Pipe, Precedence.CONDITIONAL],
            [tokens_1.TokenType.DoublePipe, Precedence.SUM],
            [tokens_1.TokenType.Star, Precedence.PRODUCT],
            [tokens_1.TokenType.DoubleStar, Precedence.EXPONENT],
            [tokens_1.TokenType.Minus, Precedence.SUM],
            [tokens_1.TokenType.Plus, Precedence.SUM],
            [tokens_1.TokenType.Slash, Precedence.PRODUCT],
            [tokens_1.TokenType.Xor, Precedence.SUM],
            [tokens_1.TokenType.DoubleEquals, Precedence.CONDITIONAL],
            [tokens_1.TokenType.GreaterOrEqual, Precedence.CONDITIONAL],
            [tokens_1.TokenType.SmallerOrEqual, Precedence.CONDITIONAL],
            [tokens_1.TokenType.NotEquals, Precedence.CONDITIONAL],
            [tokens_1.TokenType.LeftShift, Precedence.SUM],
            [tokens_1.TokenType.RightShift, Precedence.SUM],
            [tokens_1.TokenType.LeftAngleBracket, Precedence.CONDITIONAL],
            [tokens_1.TokenType.RightAngleBracket, Precedence.CONDITIONAL]
        ].forEach(([type, precedence]) => {
            self.registerInfix(type, new InfixOperatorSubparser(precedence));
        });
        this.registerInfix(tokens_1.TokenType.Dot, new PropertyAccessSubparser(Precedence.PROPERTY_ACCESS));
        this.registerInfix(tokens_1.TokenType.LeftParenthesis, new FunctionCallSubparser(Precedence.CALL));
        this.registerInfix(tokens_1.TokenType.LeftBracket, new ElementAccessSubparser(Precedence.POSTFIX));
        this.registerInfix(tokens_1.TokenType.Semicolon, new StatementSubparser());
        this.registerInfix(tokens_1.TokenType.DoubleMinus, new PostfixOperatorSubparser());
        this.registerInfix(tokens_1.TokenType.DoublePlus, new PostfixOperatorSubparser());
    }
    registerPrefix(type, subparser) {
        this.prefixSubparsers.set(type, subparser);
    }
    registerInfix(type, subparser) {
        this.infixSubparsers.set(type, subparser);
    }
    getPrecedence() {
        const subparser = this.infixSubparsers.get(this.tokenSource.peek().type);
        if (subparser) {
            return subparser.precedence;
        }
        return 0;
    }
    getExpression(precedence) {
        let token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type)) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}'`, token.line, token.char, token.getSource());
        }
        let left = this.prefixSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedence()) {
            token = this.tokenSource.next();
            const infix = this.infixSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            }
            catch (e) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${tokens_1.TokenType[token.type]}`, token.line, token.char, token.getSource());
            }
        }
        return left;
    }
    getNamePattern() {
        return (new IdentifierSubparser()).parse(this, this.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected an identifier'));
    }
    getType() {
        let T = {
            plain: true,
            value: this.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a type name')
        };
        if (this.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            this.tokenSource.next();
            T = {
                plain: false,
                value: T.value,
                typeParameters: []
            };
            if (this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00014] Unexpected empty type parameters', token.line, token.char, token.getSource());
            }
            while (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    const token = this.tokenSource.next();
                    (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                }
                const parameter = this.getType();
                T.typeParameters.push(parameter);
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    this.tokenSource.next(); // Consume the comma
                }
            }
            this.tokenSource.next(); // Consume the ']'
        }
        return T;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map