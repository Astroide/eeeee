"use strict";
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
class PrefixOperatorSubparser {
    parse(parser, token) {
        const operand = parser.getExpression(Precedence.PREFIX);
        return new PrefixOperatorExpression(token.type, operand);
    }
}
class InfixOperatorSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, left, token) {
        const right = parser.getExpression(Precedence.SUM);
        return new InfixOperatorExpression(token.type, left, right);
    }
}
class GroupSubparser {
    parse(parser, _token) {
        const inside = parser.getExpression(0);
        parser.tokenSource.consume(tokens_1.TokenType.RightParenthesis, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }
}
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
class ElementAccessSubparser {
    constructor(precedence) {
        this.precedence = precedence;
    }
    parse(parser, object, _token) {
        const indexes = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightBracket)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Only commas to separate function arguments and an optional trailing comma are allowed.', token.line, token.char, token.getSource());
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
class PrefixOperatorExpression {
    constructor(operator, operand) {
        this.operator = operator;
        this.operand = operand;
    }
    toString() {
        return tokens_1.TokenType[this.operator] + '.prefix {' + this.operand.toString() + '}';
    }
}
class Statement {
    constructor(content) {
        this.content = content;
    }
}
class Block extends Expression {
    constructor(statements) {
        super();
        this.statements = statements;
    }
    toString() {
        return this.statements.length == 0 ? 'Block {}' : `Block {${this.statements.map(s => `Statement {${s.content.toString()}}`).join(', ')}}`;
    }
}
class BlockSubparser {
    parse(parser, _token) {
        const statements = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightCurlyBracket)) {
            statements.push(parser.getStatement());
        }
        parser.tokenSource.next(); // Consume the '}'
        return new Block(statements);
    }
}
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
            [tokens_1.TokenType.RightShift, Precedence.SUM]
        ].forEach(([type, precedence]) => {
            self.registerInfix(type, new InfixOperatorSubparser(precedence));
        });
        this.registerInfix(tokens_1.TokenType.Dot, new PropertyAccessSubparser(Precedence.PROPERTY_ACCESS));
        this.registerInfix(tokens_1.TokenType.LeftParenthesis, new FunctionCallSubparser(Precedence.CALL));
        this.registerInfix(tokens_1.TokenType.LeftBracket, new ElementAccessSubparser(Precedence.POSTFIX));
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
            left = infix.parse(this, left, token);
        }
        return left;
    }
    getStatement() {
        const expression = this.getExpression(0);
        this.tokenSource.consume(tokens_1.TokenType.Semicolon, '[ESCE00013] Expected a semicolon at the end of a statement.');
        return new Statement(expression);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map