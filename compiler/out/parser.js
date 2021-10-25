"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.ContinueExpression = exports.BreakExpression = exports.ReturnExpression = exports.AssignmentExpression = exports.ClassExpression = exports.FunctionExpression = exports.LambdaFunctionExpression = exports.ForExpression = exports.PostfixOperatorExpression = exports.LetOrConstDeclarationExpression = exports.TypeCastingExpression = exports.LoopExpression = exports.WhileExpression = exports.IfExpression = exports.InfixOperatorExpression = exports.StatementExpression = exports.PrefixOperatorExpression = exports.PropertyAccessExpression = exports.LiteralExpression = exports.IdentifierExpression = exports.ElementAccessExpression = exports.FunctionCallExpression = exports.GroupExpression = exports.Expression = void 0;
const explanations_1 = require("./explanations");
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
class PeekableTokenStream {
    constructor(stream, reader) {
        this.nextTokens = [];
        this.index = 0;
        this.stack = [];
        this.stream = stream;
        this.reader = reader;
    }
    next() {
        this.index++;
        if (this.nextTokens.length > 0) {
            return this.pushToStackAndReturn(this.nextTokens.shift());
        }
        else {
            return this.pushToStackAndReturn(this.stream.gen.next().value);
        }
    }
    pushToStackAndReturn(token) {
        this.stack.push(token);
        return token;
    }
    peek() {
        if (this.nextTokens.length > 0) {
            return this.nextTokens[0];
        }
        this.nextTokens.push(this.stream.gen.next().value);
        return this.nextTokens[0];
    }
    peekN(n) {
        if (this.nextTokens.length > n - 1) {
            return this.nextTokens[n - 1];
        }
        while (!(this.nextTokens.length > n - 1)) {
            this.nextTokens.push(this.stream.gen.next().value);
        }
        return this.nextTokens[n - 1];
    }
    match(type) {
        const next = this.peek();
        return next.type == type;
    }
    consume(type, message) {
        this.index++;
        const next = this.next();
        if (next.type != type) {
            (0, utilities_1.panicAt)(this.reader, `[ESCE00010] Expected TokenType.${tokens_1.TokenType[type]}${explanations_1.tokenTypeExplanations.has(type) ? ` (${explanations_1.tokenTypeExplanations.get(type)})` : ''}, got '${next.getSource()}' : ${message}`, next.line, next.char, next.getSource());
        }
        return this.pushToStackAndReturn(next);
    }
    state() {
        return this.index;
    }
    rewind(state) {
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
class Pattern {
}
class IdentifierSubparser {
    parse(parser, token) {
        return new IdentifierExpression(token);
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
            let argName = null;
            if (parser.tokenSource.peek().type == tokens_1.TokenType.Identifier && parser.tokenSource.peekN(2).type == tokens_1.TokenType.Colon) {
                // Named argument
                argName = parser.tokenSource.next();
                parser.tokenSource.next();
            }
            const arg = parser.getExpression(0);
            args.push(argName ? [arg, argName] : [arg]);
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
        const indices = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate indices and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const index = parser.getExpression(this.precedence);
            indices.push(index);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Indices should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next();
        return new ElementAccessExpression(object, indices);
    }
}
__decorate([
    utilities_1.logCalls
], ElementAccessSubparser.prototype, "parse", null);
class Expression {
}
exports.Expression = Expression;
class GroupExpression extends Expression {
    constructor(content) {
        super();
        this.content = content;
    }
    toString() {
        return `GroupExpression {${this.content.toString()}}`;
    }
}
exports.GroupExpression = GroupExpression;
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
exports.FunctionCallExpression = FunctionCallExpression;
class ElementAccessExpression extends Expression {
    constructor(left, indices) {
        super();
        this.left = left;
        this.indices = indices;
    }
    toString() {
        return `IndexingExpression {${this.left.toString()}${this.indices.length > 0 ? ', ' + this.indices.map(x => x.toString()).join(', ') : ''}}`;
    }
}
exports.ElementAccessExpression = ElementAccessExpression;
class IdentifierExpression extends Expression {
    constructor(token) {
        super();
        this.id = token.identifier;
        this.token = token;
    }
    toString() {
        return `Identifier[${this.id}]`;
    }
}
exports.IdentifierExpression = IdentifierExpression;
class LiteralExpression extends Expression {
    constructor(value, type) {
        super();
        this.value = value;
        this.type = type;
    }
    toString() {
        if (this.type == tokens_1.TokenType.TemplateStringLiteral) {
            let string = `${tokens_1.TokenType[this.type]}[\n`;
            let element = this.value;
            while (element) {
                if (element.data instanceof Expression) {
                    string += '+ ' + element.data.toString() + '\n';
                }
                else {
                    string += '+ string |' + element.data.toString() + '|\n';
                }
                element = element.next;
            }
            string += ']';
            return string;
        }
        else {
            return `${tokens_1.TokenType[this.type]}[${this.value}]`;
        }
    }
}
exports.LiteralExpression = LiteralExpression;
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
        else if (token.type == tokens_1.TokenType.TemplateStringLiteral)
            return new LiteralExpression(token.contents, tokens_1.TokenType.TemplateStringLiteral);
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
exports.PropertyAccessExpression = PropertyAccessExpression;
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
class PrefixOperatorExpression extends Expression {
    constructor(operator, operand) {
        super();
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return tokens_1.TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}
exports.PrefixOperatorExpression = PrefixOperatorExpression;
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
exports.StatementExpression = StatementExpression;
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
        this.label = null;
        this.expression = expression;
    }
    toString() {
        return `Block${this.label ? '#' + this.label : ''} {${this.expression.toString()}}`;
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
exports.InfixOperatorExpression = InfixOperatorExpression;
class IfExpression extends Expression {
    constructor(condition, thenBranch, elseBranch) {
        super();
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
    toString() {
        return `If {${this.condition.toString()}, ${this.thenBranch.toString()}${this.elseBranch ? ', ' + this.elseBranch.toString() : ''}}`;
    }
}
exports.IfExpression = IfExpression;
class WhileExpression extends Expression {
    constructor(condition, body) {
        super();
        this.condition = condition;
        this.body = body;
    }
    toString() {
        return `While {${this.condition.toString()}, ${this.body.toString()}}`;
    }
}
exports.WhileExpression = WhileExpression;
class LoopExpression extends Expression {
    constructor(body) {
        super();
        this.label = null;
        this.body = body;
    }
    toString() {
        return `Loop${this.label ? '#' + this.label : ''} {${this.body.toString()}}`;
    }
}
exports.LoopExpression = LoopExpression;
class IfSubparser {
    parse(parser, _token) {
        const condition = parser.getExpression(0);
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an if\'s condition');
        const thenBranch = (new BlockSubparser()).parse(parser, token);
        let elseBranch = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Else)) {
            parser.tokenSource.next(); // Consume 'else'
            if (parser.tokenSource.match(tokens_1.TokenType.If)) {
                elseBranch = (new IfSubparser()).parse(parser, parser.tokenSource.next());
            }
            else {
                const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after an \'else\'');
                elseBranch = (new BlockSubparser()).parse(parser, token);
            }
        }
        return new IfExpression(condition, thenBranch, elseBranch);
    }
}
__decorate([
    utilities_1.logCalls
], IfSubparser.prototype, "parse", null);
class ListExpression extends Expression {
    constructor(elements) {
        super();
        this.elements = elements;
    }
    toString() {
        return `ListExpression {${this.elements.map(x => x.toString()).join(', ')}}`;
    }
}
class ListSubparser {
    parse(parser, _token) {
        const elements = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00023] Leading / double commas are not allowed within list literals.', token.line, token.char, token.getSource());
            }
            elements.push(parser.getExpression(0));
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00024] A list literal\'s elements should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the ']'
        return new ListExpression(elements);
    }
}
__decorate([
    utilities_1.logCalls
], ListSubparser.prototype, "parse", null);
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
class LoopSubparser {
    parse(parser, _token) {
        const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'a \'{\' was expected after a \'loop\'');
        const body = (new BlockSubparser()).parse(parser, token);
        return new LoopExpression(body);
    }
}
__decorate([
    utilities_1.logCalls
], LoopSubparser.prototype, "parse", null);
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
exports.TypeCastingExpression = TypeCastingExpression;
class TypeCastingSubparser {
    parse(parser, _token) {
        const type = parser.getType();
        parser.tokenSource.consume(tokens_1.TokenType.RightAngleBracket, 'expected a \'>\' after a type cast');
        const expression = parser.getExpression(Precedence.PREFIX);
        return new TypeCastingExpression(type, expression);
    }
}
__decorate([
    utilities_1.logCalls
], TypeCastingSubparser.prototype, "parse", null);
class LetOrConstDeclarationSubparser {
    parse(parser, token) {
        const type = (token && token.type == tokens_1.TokenType.Const) ? 'const' : 'let';
        const pattern = parser.getPattern(0);
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
        return new LetOrConstDeclarationExpression(type, pattern, value, variableType);
    }
}
__decorate([
    utilities_1.logCalls
], LetOrConstDeclarationSubparser.prototype, "parse", null);
class LetOrConstDeclarationExpression extends Expression {
    constructor(type, name, value, variableType) {
        super();
        this.type = type;
        this.pattern = name;
        this.value = value;
        this.variableType = variableType;
    }
    toString() {
        return `${this.type} {${this.pattern.toString()}, ${this.variableType ? typeToString(this.variableType) : '<inferred type>'}${this.value ? ', ' + this.value.toString() : ''}}`;
    }
}
exports.LetOrConstDeclarationExpression = LetOrConstDeclarationExpression;
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
exports.PostfixOperatorExpression = PostfixOperatorExpression;
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
    constructor(condition, body, kind) {
        super();
        this.label = null;
        this.kind = kind;
        this.condition = condition;
        this.body = body;
    }
    toString() {
        if (this.kind == 'a,b,c')
            return `ForExpression${this.label ? '#' + this.label : ''}.<for a, b, c> {${this.condition.init.toString()}, ${this.condition.condition.toString()}, ${this.condition.repeat.toString()}, ${this.body.toString()}}`;
        else
            return `ForExpression${this.label ? '#' + this.label : ''}.<for a in b> {${this.condition.name.toString()}, ${this.condition.iterator.toString()}, ${this.body.toString()}}`;
    }
}
exports.ForExpression = ForExpression;
class ForSubparser {
    parse(parser, _token) {
        let init = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let condition = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        let repeat = new LiteralExpression(true, tokens_1.TokenType.BooleanLiteral);
        if (!parser.tokenSource.match(tokens_1.TokenType.Comma)) {
            init = parser.getExpression(0);
        }
        if (parser.tokenSource.match(tokens_1.TokenType.In)) {
            const name = expressionAsPattern(init);
            parser.tokenSource.consume(tokens_1.TokenType.In, 'Expected an \'in\', this is an error that shouldn\'t ever happen. Report this to https://github.com/Astroide/escurieux/issues .');
            const iterator = parser.getExpression(0);
            const token = parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a block start after a for loop\'s iterator expression');
            const body = (new BlockSubparser()).parse(parser, token);
            return new ForExpression({
                name: name,
                iterator: iterator
            }, body, 'a in b');
        }
        else {
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
            return new ForExpression({
                condition: condition,
                init: init,
                repeat: repeat
            }, loopBody, 'a,b,c');
        }
    }
}
__decorate([
    utilities_1.logCalls
], ForSubparser.prototype, "parse", null);
class LambdaFunctionExpression extends Expression {
    constructor(args, typesOfArguments, body) {
        super();
        this.args = args;
        this.body = body;
        this.typesOfArguments = typesOfArguments;
    }
    toString() {
        return `LambdaFunction {[${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + (type ? typeToString(type) : '<inferred type>')).join(', ')}], ${this.body.toString()}]`;
    }
}
exports.LambdaFunctionExpression = LambdaFunctionExpression;
class FunctionExpression extends Expression {
    constructor(typeParameters, args, typesOfArguments, body, name, typeConstraints, returnType) {
        super();
        this.typeParameters = typeParameters;
        this.args = args;
        this.typesOfArguments = typesOfArguments;
        this.body = body;
        this.namePattern = name;
        this.returnType = returnType;
        this.typeConstraints = typeConstraints;
    }
    toString() {
        return `Function<${(0, utilities_1.zip)(this.typeParameters, this.typeConstraints).map(x => `${typeToString(x[0])} ${typeConstraintToString(x[1])}`).join(', ')}> -> ${this.returnType ? typeToString(this.returnType) : 'void'} {${this.namePattern.toString()}, [${(0, utilities_1.zip)(this.args, this.typesOfArguments).map(([name, type]) => name[0].toString() + (name[1] ? '=' + name[1].toString() : '') + ': ' + typeToString(type)).join(', ')}], ${this.body.toString()}]`;
    }
}
exports.FunctionExpression = FunctionExpression;
class FunctionSubparser {
    parse(parser, _token) {
        const functionName = (new IdentifierSubparser()).parse(parser, parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'a function name is required'));
        let typeParameters = [];
        let typeConstraints = [];
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftParenthesis, '[ESCE00015] A left parenthesis is required to start a function\'s argument list');
        const args = [];
        const typesOfArguments = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            const pattern = parser.getPattern(0);
            let defaultValue = null;
            if (!parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                const wrongToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00016] Function arguments must be typed', wrongToken.line, wrongToken.char, wrongToken.getSource());
            }
            else {
                parser.tokenSource.next();
                typesOfArguments.push(parser.getType());
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
                parser.tokenSource.next();
                defaultValue = parser.getExpression(0);
            }
            args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
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
        return new FunctionExpression(typeParameters, args, typesOfArguments, body, functionName, typeConstraints, returnType);
    }
}
__decorate([
    utilities_1.logCalls
], FunctionSubparser.prototype, "parse", null);
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
                const pattern = parser.getPattern(0);
                let defaultValue = null;
                if (parser.tokenSource.match(tokens_1.TokenType.Colon)) {
                    parser.tokenSource.next();
                    typesOfArguments.push(parser.getType());
                }
                else {
                    typesOfArguments.push(null);
                }
                if (parser.tokenSource.match(tokens_1.TokenType.Equals)) {
                    parser.tokenSource.next();
                    defaultValue = parser.getExpression(0);
                }
                args.push(defaultValue ? [pattern, defaultValue] : [pattern]);
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
class ClassExpression extends Expression {
    constructor(name, typeParameters, typeConstraints, methods, properties) {
        super();
        this.name = name;
        this.typeParameters = typeParameters;
        this.typeConstraints = typeConstraints;
        this.methods = methods;
        this.properties = properties;
    }
    toString() {
        return `ClassExpression<${(0, utilities_1.zip)(this.typeParameters, this.typeConstraints).map(([type, constraint]) => typeToString(type) + ' ' + typeConstraintToString(constraint)).join(', ')}> {${this.name.toString()}, [${this.properties.map(([name, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + name.toString()).join(', ')}], [${this.methods.map(([func, modifier, accessModifier]) => '(' + accessModifier + ') ' + modifier + ' ' + func.toString()).join(', ')}]}`;
    }
}
exports.ClassExpression = ClassExpression;
class ClassSubparser {
    parse(parser, _token) {
        const name = parser.getPattern(0);
        let typeParameters = [], typeConstraints = [];
        if (parser.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            [typeParameters, typeConstraints] = parser.getTypeParameters();
        }
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, `expected a '{' after ${typeParameters.length == 0 ? 'the class name' : 'the type parameters'}`);
        const methods = [];
        const properties = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const errorToken = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00018] Leading or double commas are not allowed in classes', errorToken.line, errorToken.char, errorToken.getSource());
            }
            const token = parser.tokenSource.peek();
            if (![tokens_1.TokenType.Public, tokens_1.TokenType.Fn, tokens_1.TokenType.Identifier, tokens_1.TokenType.Private, tokens_1.TokenType.Protected, tokens_1.TokenType.Const, tokens_1.TokenType.Static].includes(token.type)) {
                (0, utilities_1.panicAt)(parser.tokenSource.reader, `[ESCE00019] One of ('private', 'protected', 'public', 'const', 'static', <identifier>) was expected, found TokenType.${tokens_1.TokenType[token.type]} instead`, token.line, token.char, token.getSource());
            }
            let modifier = 'instance';
            let accessModifier = 'private';
            if (parser.tokenSource.match(tokens_1.TokenType.Private)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.warnAt)(parser.tokenSource.reader, '[ESCW00002] The \'private\' access specifier is not required, properties and methods are private by default', token.line, token.char, token.getSource());
            }
            else if (parser.tokenSource.match(tokens_1.TokenType.Protected)) {
                parser.tokenSource.next();
                accessModifier = 'protected';
            }
            else if (parser.tokenSource.match(tokens_1.TokenType.Public)) {
                parser.tokenSource.next();
                accessModifier = 'public';
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Static)) {
                parser.tokenSource.next();
                modifier = 'static';
            }
            if (parser.tokenSource.match(tokens_1.TokenType.Fn)) {
                const method = (new FunctionSubparser()).parse(parser, parser.tokenSource.next());
                methods.push([method, modifier, accessModifier]);
            }
            else if (parser.tokenSource.match(tokens_1.TokenType.Const)) {
                const property = (new LetOrConstDeclarationSubparser()).parse(parser, parser.tokenSource.next());
                properties.push([property, modifier, accessModifier]);
            }
            else {
                const property = (new LetOrConstDeclarationSubparser()).parse(parser, null);
                properties.push([property, modifier, accessModifier]);
            }
            if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                parser.tokenSource.consume(tokens_1.TokenType.Comma, 'a comma is required after properties / methods');
            }
        }
        parser.tokenSource.consume(tokens_1.TokenType.RightCurlyBracket, '!!!');
        return new ClassExpression(name, typeParameters, typeConstraints, methods, properties);
    }
}
__decorate([
    utilities_1.logCalls
], ClassSubparser.prototype, "parse", null);
class AssignmentExpression extends Expression {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    toString() {
        return `AssignmentExpression {${this.left.toString()}, ${this.right.toString()}}`;
    }
}
exports.AssignmentExpression = AssignmentExpression;
class AssignmentSubparser {
    constructor() {
        this.precedence = 0.9;
    }
    parse(parser, left, token) {
        const right = parser.getExpression(0);
        if (!(left instanceof IdentifierExpression) && !(left instanceof PropertyAccessExpression) && !(left instanceof ElementAccessExpression)) {
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00019] Left expression of an assignment must be either an identifier, a property access or an indexing expression', token.line, token.char, token.getSource());
        }
        return new AssignmentExpression(left, right);
    }
}
__decorate([
    utilities_1.logCalls
], AssignmentSubparser.prototype, "parse", null);
class AtExpression extends Expression {
    constructor(name, expression) {
        super();
        this.name = name;
        this.expression = expression;
    }
    toString() {
        return `AtExpression {IdentifierExpression[${this.name}], ${this.expression.toString()}}`;
    }
}
class AtSubparser {
    parse(parser, _token) {
        const name = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected an identifier');
        const expression = parser.getExpression(0);
        return new AtExpression(name, expression);
    }
}
__decorate([
    utilities_1.logCalls
], AtSubparser.prototype, "parse", null);
class ReturnExpression extends Expression {
    constructor(returnValue) {
        super();
        this.returnValue = returnValue;
    }
    toString() {
        return `ReturnExpression {${this.returnValue ? this.returnValue.toString() : ''}}`;
    }
}
exports.ReturnExpression = ReturnExpression;
class ReturnSubparser {
    parse(parser, _token) {
        if (parser.canReadExpression()) {
            return new ReturnExpression(parser.getExpression(0));
        }
        else {
            return new ReturnExpression();
        }
    }
}
__decorate([
    utilities_1.logCalls
], ReturnSubparser.prototype, "parse", null);
class BreakExpression extends Expression {
    constructor(breakValue, label) {
        super();
        this.breakValue = breakValue;
        this.label = label;
    }
    toString() {
        return `BreakExpression${this.label ? '#' + this.label : ''} {${this.breakValue ? this.breakValue.toString() : ''}}`;
    }
}
exports.BreakExpression = BreakExpression;
class BreakSubparser {
    parse(parser, _token) {
        let label = null;
        if (parser.tokenSource.match(tokens_1.TokenType.Label)) {
            label = parser.tokenSource.next().labelText;
        }
        if (parser.canReadExpression()) {
            return new BreakExpression(parser.getExpression(0), label);
        }
        else {
            return new BreakExpression(null, label);
        }
    }
}
__decorate([
    utilities_1.logCalls
], BreakSubparser.prototype, "parse", null);
class ContinueExpression extends Expression {
    constructor(label) {
        super();
        this.label = label;
    }
    toString() {
        return `ContinueExpression${this.label ? '#' + this.label : ''}`;
    }
}
exports.ContinueExpression = ContinueExpression;
class ContinueSubparser {
    parse(parser, _token) {
        return new ContinueExpression(parser.tokenSource.match(tokens_1.TokenType.Label) ? parser.tokenSource.next().labelText : null);
    }
}
__decorate([
    utilities_1.logCalls
], ContinueSubparser.prototype, "parse", null);
function typeConstraintToString(t) {
    if (t == 'unconstrained')
        return t;
    else {
        return `${t.kind == 'extends' ? '<=' : ':'} ${typeToString(t.type)}${t.and ? ` & ${typeConstraintToString(t.and)}` : ''}`;
    }
}
class LabelSubparser {
    parse(parser, token) {
        parser.tokenSource.consume(tokens_1.TokenType.Colon, 'expected a colon after a label');
        const expression = parser.getExpression(Infinity);
        if (!(expression instanceof ForExpression || expression instanceof LoopExpression)) {
            (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00022] Cannot label anything that is not a for loop, a \'loop\' loop, or a block.', token.line, token.char, token.getSource());
        }
        const typedExpression = expression;
        typedExpression.label = token.labelText;
        return typedExpression;
    }
}
__decorate([
    utilities_1.logCalls
], LabelSubparser.prototype, "parse", null);
class MapExpression {
    constructor(keys, values) {
        this.keys = keys;
        this.values = values;
    }
    toString() {
        return `MapExpression {${(0, utilities_1.zip)(this.keys, this.values).map(x => x[0].toString() + ': ' + x[1].toString()).join(', ')}}`;
    }
}
class MapSubparser {
    parse(parser, _token) {
        const keys = [];
        const values = [];
        parser.tokenSource.consume(tokens_1.TokenType.LeftCurlyBracket, 'expected a \'{\' after \'map!\'');
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00025] Leading / double commas are not allowed within map literals.', token.line, token.char, token.getSource());
            }
            keys.push(parser.getExpression(0));
            parser.tokenSource.consume(tokens_1.TokenType.Colon, 'expected a colon after a key');
            values.push(parser.getExpression(0));
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00026] A map literal\'s key/value pairs should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        parser.tokenSource.next(); // Consume the '}'
        return new MapExpression(keys, values);
    }
}
__decorate([
    utilities_1.logCalls
], MapSubparser.prototype, "parse", null);
class NamedPattern extends Pattern {
    constructor(pattern, name) {
        super();
        this.pattern = pattern;
        this.name = name;
    }
    toString() {
        return `NamedPattern(${this.name.identifier}) {${this.pattern.toString()}}`;
    }
}
class NamedPatternSubparser {
    parse(parser, _token) {
        const token = parser.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a pattern name');
        const pattern = parser.getPattern(0);
        return new NamedPattern(pattern, token);
    }
}
__decorate([
    utilities_1.logCalls
], NamedPatternSubparser.prototype, "parse", null);
class NamePattern extends Pattern {
    constructor(name) {
        super();
        this.name = name;
    }
    toString() {
        return `NamePattern[${this.name.identifier}]`;
    }
}
class NamePatternSubparser {
    parse(_parser, token) {
        return new NamePattern(token);
    }
}
__decorate([
    utilities_1.logCalls
], NamePatternSubparser.prototype, "parse", null);
function expressionAsPattern(expression) {
    if (expression instanceof IdentifierExpression) {
        return new NamePattern(expression.token);
    }
    else if (expression instanceof AtExpression) {
        return new NamedPattern(expressionAsPattern(expression.expression), expression.name);
    }
}
class Parser {
    constructor(source, reader) {
        this.prefixSubparsers = new Map();
        this.infixSubparsers = new Map();
        this.prefixPatternSubparsers = new Map();
        this.infixPatternSubparsers = new Map();
        this.conditionsOfPrefixSubparsers = new Map();
        this.tokenSource = new PeekableTokenStream(source, reader);
        this.registerPrefix(tokens_1.TokenType.Identifier, new IdentifierSubparser());
        const self = this;
        [tokens_1.TokenType.Plus, tokens_1.TokenType.Minus, tokens_1.TokenType.Tilde, tokens_1.TokenType.Bang].forEach(type => {
            self.registerPrefix(type, new PrefixOperatorSubparser());
        });
        [tokens_1.TokenType.BooleanLiteral, tokens_1.TokenType.CharacterLiteral, tokens_1.TokenType.StringLiteral, tokens_1.TokenType.NumericLiteral, tokens_1.TokenType.TemplateStringLiteral].forEach(type => {
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
        this.registerPrefix(tokens_1.TokenType.Loop, new LoopSubparser());
        this.registerPrefix(tokens_1.TokenType.Class, new ClassSubparser());
        this.registerPrefix(tokens_1.TokenType.Return, new ReturnSubparser());
        this.registerPrefix(tokens_1.TokenType.Break, new BreakSubparser());
        this.registerPrefix(tokens_1.TokenType.Continue, new ContinueSubparser());
        this.registerPrefix(tokens_1.TokenType.Label, new LabelSubparser());
        this.registerPrefix(tokens_1.TokenType.LeftBracket, new ListSubparser());
        this.registerPrefix(tokens_1.TokenType.Macro, new MapSubparser());
        this.registerPrefix(tokens_1.TokenType.AtSign, new AtSubparser());
        this.conditionsOfPrefixSubparsers.set(tokens_1.TokenType.Macro, (token => token.identifier == 'map!'));
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
        this.registerInfix(tokens_1.TokenType.Equals, new AssignmentSubparser());
        // Pattern handlers registering
        this.registerPrefixPattern(tokens_1.TokenType.AtSign, new NamedPatternSubparser());
        this.registerPrefixPattern(tokens_1.TokenType.Identifier, new NamePatternSubparser());
    }
    registerPrefix(type, subparser) {
        this.prefixSubparsers.set(type, subparser);
    }
    registerInfix(type, subparser) {
        this.infixSubparsers.set(type, subparser);
    }
    registerPrefixPattern(type, subparser) {
        this.prefixPatternSubparsers.set(type, subparser);
    }
    registerInfixPattern(type, subparser) {
        this.infixPatternSubparsers.set(type, subparser);
    }
    getPrecedenceForPattern() {
        const patternSubparser = this.infixPatternSubparsers.get(this.tokenSource.peek().type);
        if (patternSubparser) {
            return patternSubparser.precedence;
        }
        return 0;
    }
    canReadExpression() {
        return this.prefixSubparsers.has(this.tokenSource.peek().type);
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
        if (!this.prefixSubparsers.has(token.type) || (this.conditionsOfPrefixSubparsers.has(token.type) && !this.conditionsOfPrefixSubparsers.get(token.type)(token))) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}' (expected an expression)`, token.line, token.char, token.getSource());
        }
        let left = this.prefixSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedence()) {
            token = this.tokenSource.next();
            const infix = this.infixSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            }
            catch (e) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${tokens_1.TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }
        return left;
    }
    getPattern(precedence) {
        let token = this.tokenSource.next();
        if (!this.prefixPatternSubparsers.has(token.type)) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00027] Could not parse : '${token.getSource()}' (expected a pattern)`, token.line, token.char, token.getSource());
        }
        let left = this.prefixPatternSubparsers.get(token.type).parse(this, token);
        while (precedence < this.getPrecedenceForPattern()) {
            token = this.tokenSource.next();
            const infix = this.infixPatternSubparsers.get(token.type);
            try {
                left = infix.parse(this, left, token);
            }
            catch (e) {
                (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE99999] [[Failure]] ${tokens_1.TokenType[token.type]} - please report this error to https://github.com/Astroide/escurieux/issues`, token.line, token.char, token.getSource());
            }
        }
        return left;
    }
    getTypeParameters() {
        this.tokenSource.next(); // Consume the '['
        const names = [];
        const constraints = [];
        while (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
            }
            names.push(this.tokenSource.consume(tokens_1.TokenType.Identifier, 'a type parameter name was expected'));
            const innerConstraints = [];
            if (this.tokenSource.match(tokens_1.TokenType.SmallerOrEqual)) {
                this.tokenSource.next();
                innerConstraints.push({
                    kind: 'extends',
                    type: this.getType()
                });
            }
            if (this.tokenSource.match(tokens_1.TokenType.Colon)) {
                this.tokenSource.next();
                if (this.tokenSource.match(tokens_1.TokenType.LeftParenthesis)) {
                    this.tokenSource.next();
                    if (this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                        const wrongToken = this.tokenSource.next();
                        (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00017] Parentheses in \':\' type constraints must contain something', wrongToken.line, wrongToken.char, wrongToken.getSource());
                    }
                    while (!this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                        if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                            const token = this.tokenSource.next();
                            (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00011] Only commas to separate type parameters and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
                        }
                        innerConstraints.push({
                            kind: 'implements',
                            type: this.getType()
                        });
                        if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                            this.tokenSource.next();
                        }
                        else if (!this.tokenSource.match(tokens_1.TokenType.RightParenthesis)) {
                            const token = this.tokenSource.next();
                            (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
                        }
                    }
                    this.tokenSource.next();
                }
                else {
                    const type = this.getType();
                    innerConstraints.push({
                        kind: 'implements',
                        type: type
                    });
                }
            }
            if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                this.tokenSource.next();
            }
            else if (!this.tokenSource.match(tokens_1.TokenType.RightBracket)) {
                const token = this.tokenSource.next();
                (0, utilities_1.panicAt)(this.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
            if (innerConstraints.length == 0) {
                constraints.push('unconstrained');
            }
            else {
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
        return [names.map(x => ({ plain: true, value: x })), constraints];
    }
    getType(raw = false) {
        let type = {
            plain: true,
            value: this.tokenSource.consume(tokens_1.TokenType.Identifier, 'expected a type name')
        };
        if (raw)
            return type;
        if (this.tokenSource.match(tokens_1.TokenType.LeftBracket)) {
            this.tokenSource.next();
            type = {
                plain: false,
                value: type.value,
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
                type.typeParameters.push(parameter);
                if (this.tokenSource.match(tokens_1.TokenType.Comma)) {
                    this.tokenSource.next(); // Consume the comma
                }
            }
            this.tokenSource.next(); // Consume the ']'
        }
        return type;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map