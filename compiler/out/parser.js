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
class IdentifierSubparser {
    parse(parser, token) {
        return new IdentifierExpression(token.getSource());
    }
}
class PrefixOperatorSubparser {
    parse(parser, token) {
        const operand = parser.getExpression();
        return new PrefixOperatorExpression(token.type, operand);
    }
}
class InfixOperatorSubparser {
    parse(parser, left, token) {
        const right = parser.getExpression();
        return new InfixOperatorExpression(token.type, left, right);
    }
}
class GroupSubparser {
    parse(parser, _token) {
        const inside = parser.getExpression();
        parser.tokenSource.consume(tokens_1.TokenType.RightParen, 'parenthesized expressions need to be closed');
        return new GroupExpression(inside);
    }
}
class FunctionCallSubparser {
    parse(parser, callee, _token) {
        const args = [];
        while (!parser.tokenSource.match(tokens_1.TokenType.RightParen)) {
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00011] Leading commas are not allowed.', token.line, token.char, token.getSource());
            }
            const arg = parser.getExpression();
            args.push(arg);
            if (parser.tokenSource.match(tokens_1.TokenType.Comma)) {
                parser.tokenSource.next();
            }
            else if (!parser.tokenSource.match(tokens_1.TokenType.RightParen)) {
                const token = parser.tokenSource.next();
                (0, utilities_1.panicAt)(parser.tokenSource.reader, '[ESCE00012] Arguments should be separated by commas', token.line, token.char, token.getSource());
            }
        }
        return new FunctionCallExpression(callee, args);
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
        return `GroupExpression::<${this.content.toString()}>`;
    }
}
class FunctionCallExpression extends Expression {
    constructor(callee, args) {
        super();
        this.callee = callee;
        this.args = args;
    }
    toString() {
        return `FunctionCall::<${this.callee.toString()}${this.args.length > 0 ? ', ' + this.args.map(x => x.toString()).join(', ') : ''}>`;
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
        return `PropertyAccess::<${this.object.toString()}, ${this.property}>`;
    }
}
class PropertyAccessSubparser {
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
        return tokens_1.TokenType[this.operator] + '.prefix::<' + this.operand.toString() + '>';
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
        return `${tokens_1.TokenType[this.operator]}.infix::<${this.leftOperand.toString()}, ${this.rightOperand.toString()}>`;
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
        this.registerPrefix(tokens_1.TokenType.LeftParen, new GroupSubparser());
        [
            tokens_1.TokenType.Ampersand, tokens_1.TokenType.DoubleAmpersand,
            tokens_1.TokenType.Pipe, tokens_1.TokenType.DoublePipe,
            tokens_1.TokenType.Star, tokens_1.TokenType.DoubleStar,
            tokens_1.TokenType.Minus, tokens_1.TokenType.Plus,
            tokens_1.TokenType.Slash, tokens_1.TokenType.Xor,
            tokens_1.TokenType.DoubleEquals,
            tokens_1.TokenType.GreaterOrEqual, tokens_1.TokenType.SmallerOrEqual,
            tokens_1.TokenType.NotEquals,
            tokens_1.TokenType.LeftShift, tokens_1.TokenType.RightShift
        ].forEach(type => {
            self.registerInfix(type, new InfixOperatorSubparser());
        });
        this.registerInfix(tokens_1.TokenType.Dot, new PropertyAccessSubparser());
        this.registerInfix(tokens_1.TokenType.LeftParen, new FunctionCallSubparser());
    }
    registerPrefix(type, subparser) {
        this.prefixSubparsers.set(type, subparser);
    }
    registerInfix(type, subparser) {
        this.infixSubparsers.set(type, subparser);
    }
    getExpression() {
        const token = this.tokenSource.next();
        if (!this.prefixSubparsers.has(token.type)) {
            (0, utilities_1.panicAt)(this.tokenSource.reader, `[ESCE00011] Could not parse : '${token.getSource()}'`, token.line, token.char, token.getSource());
        }
        const left = this.prefixSubparsers.get(token.type).parse(this, token);
        const next = this.tokenSource.peek();
        // console.log(`infix: ${next.getSource()} ${TokenType[next.type]}`);
        if (this.infixSubparsers.has(next.type)) {
            this.tokenSource.next();
            return this.infixSubparsers.get(next.type).parse(this, left, next);
        }
        else {
            return left;
        }
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map