import tokens as Tokens
TokenType = Tokens.TokenType
import text as Text
import errors as Errors
from sys import setrecursionlimit, getrecursionlimit, _getframe
from itertools import count

def stack_size3a(size=2): # from: https://stackoverflow.com/a/47956089, stack_size3a()
    frame = _getframe(size)
    try:
        for size in count(size, 8):
            frame = frame.f_back.f_back.f_back.f_back.\
                f_back.f_back.f_back.f_back
    except AttributeError:
        while frame:
            frame = frame.f_back
            size += 1
        return size - 1


def safe_recurse():
    limit = getrecursionlimit()
    depth = stack_size3a()
    if depth + 10 > limit:
        setrecursionlimit(limit + 10)
    elif limit > 2 * depth and limit > 1000:
        setrecursionlimit(max(1000, depth + 100))

PREC_SEMICOLON = 1
PREC_LOGICAL = 10
PREC_ADD_SUB = 20
PREC_MUL_DIV_EXP = 30
PREC_UNARY = 40
PREC_LITERAL = 100

class Expression:
    def __repr__(self):
        raise BaseException("undefined __repr__")
    
    def source_span(self) -> Text.Span:
        raise BaseException("undefined source_span")
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(???)')

class Block(Expression):
    def __init__(self, inner: Expression, span: Text.Span):
        self.inner = inner
        self.span = span
    
    def __repr__(self):
        return f'{{{repr(self.inner)}}}'
    
    def source_span(self) -> Text.Span:
        return self.span
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '{')
        safe_recurse()
        self.inner.lispfmt(indentation + 1, idt)
        print(idt(indentation) + '}')

class BinaryExpression(Expression):
    def __init__(self, left: Expression, operator: Tokens.Token, right: Expression, span: Text.Span):
        self.left = left
        self.operator = operator
        self.right = right
        self.span = span
    
    def __repr__(self) -> str:
        return f'bin({repr(self.left)} {str(self.operator.type).replace("TokenType.", "")} {repr(self.right)})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        safe_recurse()
        print(idt(indentation) + '(' + Tokens.lit[self.operator.type])
        self.left.lispfmt(indentation + 1, idt)
        self.right.lispfmt(indentation + 1, idt)
        print(idt(indentation) + ')')

    def source_span(self) -> Text.Span:
        return self.span

class UnaryExpression(Expression):
    def __init__(self, operator: Tokens.Token, expr: Expression, span: Text.Span):
        self.operator = operator
        self.expr = expr
        self.span = span
    
    def __repr__(self) -> str:
        return f'unary({str(self.operator.type).replace("TokenType.", "")} {repr(self.expr)})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(' + Tokens.lit[self.operator.type])
        self.expr.lispfmt(indentation + 1, idt)
        print(idt(indentation) + ')')

    def source_span(self) -> Text.Span:
        return self.span

class LiteralExpression(Expression):
    def __repr__(self) -> str:
        return 'some_literal'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(unknown_literal)')

class IntLiteral(LiteralExpression):
    def __init__(self, value: int, type_hint: str | None, source: Text.Span):
        self.value = value
        self.type = None
        self.type_hint = type_hint
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def __repr__(self) -> str:
        return f'$int({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.CYAN + str(self.value) + Errors.CLEAR_COLOR)

class FloatLiteral(LiteralExpression):
    def __init__(self, value: float, type_hint: str | None, source: Text.Span):
        self.value = value
        self.type = None
        self.type_hint = type_hint
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def __repr__(self) -> str:
        return f'$float({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.CYAN + str(self.value) + Errors.CLEAR_COLOR)

class StringLiteral(LiteralExpression):
    def __init__(self, value: str, type_hint: str | None, source: Text.Span):
        self.value = value
        self.type = None
        self.type_hint = type_hint
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    

    def __repr__(self) -> str:
        return f'$string({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '\x1B[32m' + repr(self.value) + Errors.CLEAR_COLOR)

class IdentifierExpression(Expression):
    def __init__(self, id: str, source: Text.Span):
        self.id = id
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.WARN + self.id + Errors.CLEAR_COLOR)

    def __repr__(self) -> str:
        return f'$id({self.id})'

class FatalParseError(BaseException):
    pass

class Parser:
    def __init__(self, tokens: list[Tokens.Token]):
        self.tokens = tokens
        source_span = Text.Span('<file contained no text>', '', 0, 0) if len(tokens) == 0 else Text.Span(tokens[-1].span.filename, tokens[-1].span.text, tokens[-1].span.end, tokens[-1].span.end)
        self.tokens.append(Tokens.Token(TokenType.EOF, source_span, 'EOF', 'EOF'))
        self.cursor = 0
        self.prefixes = {
            TokenType.ILiteral: lambda t: self.literal(t),
            TokenType.SLiteral: lambda t: self.literal(t),
            TokenType.FLiteral: lambda t: self.literal(t),
            TokenType.LParen: lambda t: self.parenthesized(t),
            TokenType.LCBrace: lambda t: self.block(t),
            TokenType.Ident: lambda t: self.identifier(t),
            TokenType.Not: lambda t: self.unary(t),
            TokenType.Minus: lambda t: self.unary(t),
        }
        self.prefix_precedences = {
            TokenType.Not: PREC_UNARY,
            TokenType.Minus: PREC_UNARY,
        }
        self.infix_precedences = {
            TokenType.Plus: PREC_ADD_SUB,
            TokenType.Minus: PREC_ADD_SUB,
            TokenType.Star: PREC_MUL_DIV_EXP,
            TokenType.Slash: PREC_MUL_DIV_EXP,
            TokenType.Exp: PREC_MUL_DIV_EXP,
            TokenType.Semicolon: PREC_SEMICOLON,
        }
        fx = lambda lhs, t: self.infix(lhs, t)
        self.infixes = {
            TokenType.Plus: fx,
            TokenType.Minus: fx,
            TokenType.Star: fx,
            TokenType.Slash: fx,
            TokenType.Exp: fx,
            TokenType.Semicolon: fx,
        }
        self.postfixes = {}
    
    def next(self) -> Tokens.Token:
        self.cursor += 1
        return self.tokens[self.cursor - 1]
    
    def peek(self) -> Tokens.Token:
        return self.tokens[self.cursor]
    
    def back(self):
        self.cursor -= 1
    
    def expect(self, token_type: TokenType, message: str, message_2: str = '') -> Tokens.Token:
        token = self.next()
        if token.type != token_type:
            Errors.error(message.replace('<ET>', Tokens.reverse_type_map[token_type]).replace('<AT>', Tokens.reverse_type_map[token.type]), (token.span, message_2))
            raise FatalParseError()
        return token
    
    def literal(self, token: Tokens.Token) -> LiteralExpression:
        if token.type == TokenType.FLiteral:
            return FloatLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.ILiteral:
            return IntLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.SLiteral:
            return StringLiteral(token.something_else, token.type_hint, token.span)
        
    def identifier(self, token: Tokens.Token) -> IdentifierExpression:
        return IdentifierExpression(token.something_else, token.span)
    
    def infix(self, lhs: Expression, token: Tokens.Token) -> BinaryExpression:
        rhs = self.expression(self.infix_precedences[token.type])
        return BinaryExpression(lhs, token, rhs, Text.merge_spans(lhs.source_span(), token.span, rhs.source_span()))
        
    def infix_precedence(self) -> int:
        try:
            return self.infix_precedences[self.peek().type]
        except KeyError:
            return 0

    def expression(self, level = 0) -> Expression:
        safe_recurse()
        token = self.next()
        if token.type not in self.prefixes.keys():
            self.back()
            self.expect(TokenType.EEE, 'expected an expression, got <AT>')
        left = self.prefixes[token.type](token)
        while level < self.infix_precedence():
            token = self.next()
            fn = self.infixes[token.type]
            left = fn(left, token)
        return left

    
    def parenthesized(self, _token) -> Expression:
        expr = self.expression()
        self.expect(TokenType.RParen, 'expected a closing parenthesis, got <AT>')
        return expr
    
    def block(self, start: Tokens.Token) -> Expression:
        expr = self.expression()
        end = self.expect(TokenType.RCBrace, 'expected <ET>, got <AT>')
        return Block(expr, Text.merge_spans(start.span, end.span))
    
    def unary(self, token: Tokens.Token) -> UnaryExpression:
        expr = self.expression(self.prefix_precedences[token.type])
        return UnaryExpression(token, expr, Text.merge_spans(token.span, expr.source_span()))