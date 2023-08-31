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

PREC_SEMICOLON   = 1
PREC_BREAK       = 5
PREC_LOGICAL     = 10
PREC_EQ          = 15
PREC_ADD_SUB     = 20
PREC_MUL_DIV_EXP = 30
PREC_UNARY       = 40
PREC_CALL        = 50
PREC_LITERAL     = 100

class Expression:
    def __repr__(self):
        raise BaseException(f'undefined __repr__ (in {repr(type(self))})')
    
    def source_span(self) -> Text.Span:
        raise BaseException(f'undefined source_span (in {repr(type(self))})')
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + f'(??? {repr(type(self))})')

class Block(Expression):
    def __init__(self, inner: Expression, span: Text.Span):
        self.inner = inner
        self.span  = span
    
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
        self.left     = left
        self.operator = operator
        self.right    = right
        self.span     = span
    
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
        self.expr     = expr
        self.span     = span
    
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
        self.value     = value
        self.type      = None
        self.type_hint = type_hint
        self.source    = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def __repr__(self) -> str:
        return f'$int({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.CYAN + str(self.value) + Errors.CLEAR_COLOR)

class FloatLiteral(LiteralExpression):
    def __init__(self, value: float, type_hint: str | None, source: Text.Span):
        self.value     = value
        self.type      = None
        self.type_hint = type_hint
        self.source    = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def __repr__(self) -> str:
        return f'$float({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.CYAN + str(self.value) + Errors.CLEAR_COLOR)

class BooleanLiteral(LiteralExpression):
    def __init__(self, value: bool, source: Text.Span):
        self.value  = value
        self.type   = None
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def __repr__(self) -> str:
        return '$true' if self.value else '$false'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.ERROR + ('true' if self.value else 'false') + Errors.CLEAR_COLOR)

class StringLiteral(LiteralExpression):
    def __init__(self, value: str, type_hint: str | None, source: Text.Span):
        self.value     = value
        self.type      = None
        self.type_hint = type_hint
        self.source    = source
    
    def source_span(self) -> Text.Span:
        return self.source
    

    def __repr__(self) -> str:
        return f'$string({self.value})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '\x1B[32m' + repr(self.value) + Errors.CLEAR_COLOR)

class IdentifierExpression(Expression):
    def __init__(self, id: str, source: Text.Span):
        self.id     = id
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + Errors.WARN + self.id + Errors.CLEAR_COLOR)

    def __repr__(self) -> str:
        return f'$id({self.id})'

class CallExpression(Expression):
    def __init__(self, callee: Expression, span: Text.Span, *args):
        self.callee = callee
        self.span   = span
        self.args   = args
    
    def source_span(self) -> Text.Span:
        return self.span
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(call')
        self.callee.lispfmt(indentation + 1, idt)
        for arg in self.args:
            arg.lispfmt(indentation + 1, idt)
        print(idt(indentation) + ')')
    
    def __repr__(self) -> str:
        return 'call(' + repr(self.callee) + ('' if len(self.args) == 0 else ' @ ' + ', '.join(map(repr, self.args))) + ')'

class PropertyAccessExpression(Expression):
    def __init__(self, object: Expression, property: str | int, span: Text.Span):
        self.object   = object
        self.property = property
        self.span     = span

    def __repr__(self) -> str:
        return repr(self.object) + '->' + self.property
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(-> ' + self.property)
        self.object.lispfmt(indentation + 1, idt)
        print(idt(indentation) + ')')
    
    def source_span(self) -> Text.Span:
        return self.span
    
class IfExpression(Expression):
    def __init__(self, condition: Expression, body: Expression, elifs: list[tuple[Expression, Expression]], else_: Expression | None, span: Text.Span):
        self.condition = condition
        self.body      = body
        self.elifs     = elifs
        self.else_     = else_
        self.span      = span
    
    def __repr__(self):
        return f'If({repr(self.condition)}) {{{repr(self.body)}}}' + (' ' + ' '.join(map(lambda x: f'ElseIf({repr(x[0])}) {{{repr(x[1])}}}', self.elifs)) if len(self.elifs) > 0 else '') + (f' Else{{{repr(self.else_)}}}' if self.else_ is not None else '')
    
    def source_span(self) -> Text.Span:
        return self.span
    
    def lispfmt(self, indentation: int, idt) -> int:
        print(idt(indentation) + '(' + Errors.KEYWORD + 'if' + Errors.CLEAR_COLOR)
        self.condition.lispfmt(indentation + 1, idt)
        print(idt(indentation + 1) + Errors.KEYWORD + 'then' + Errors.CLEAR_COLOR)
        self.body.lispfmt(indentation + 1, idt)
        for condition, body in self.elifs:
            print(idt(indentation + 1) + '(' + Errors.KEYWORD + 'elif' + Errors.CLEAR_COLOR)
            condition.lispfmt(indentation + 2, idt)
            print(idt(indentation + 2) + Errors.KEYWORD + 'then' + Errors.CLEAR_COLOR)
            body.lispfmt(indentation + 2, idt)
            print(idt(indentation + 1) + ')')
        if self.else_ is not None:
            print(idt(indentation + 1) + '(' + Errors.KEYWORD + 'else' + Errors.CLEAR_COLOR)
            self.else_.lispfmt(indentation + 2, idt)
            print(idt(indentation + 1) + ')')
        print(idt(indentation) + ')')

class LoopExpression(Expression):
    def __init__(self, body: Expression | None, span: Text.Span):
        self.body = body
        self.span = span
    
    def source_span(self) -> Text.Span:
        return self.span
    
    def __repr__(self) -> str:
        return f'Loop({repr(self.body) if self.body is not None else ""})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        if self.body is None:
            print(idt(indentation) + '(' + Errors.KEYWORD + 'loop' + Errors.CLEAR_COLOR + ')')
        else:
            print(idt(indentation) + '(' + Errors.KEYWORD + 'loop' + Errors.CLEAR_COLOR)
            self.body.lispfmt(indentation + 1, idt)
            print(idt(indentation) + ')')

class BreakExpression(Expression):
    def __init__(self, body: Expression | None, span: Text.Span):
        self.body = body
        self.span = span
    
    def source_span(self) -> Text.Span:
        return self.span
    
    def __repr__(self) -> str:
        return f'Break({repr(self.body) if self.body is not None else ""})'
    
    def lispfmt(self, indentation: int, idt) -> int:
        if self.body is None:
            print(idt(indentation) + '(' + Errors.KEYWORD + 'break' + Errors.CLEAR_COLOR + ')')
        else:
            print(idt(indentation) + '(' + Errors.KEYWORD + 'break' + Errors.CLEAR_COLOR)
            self.body.lispfmt(indentation + 1, idt)
            print(idt(indentation) + ')')

class FatalParseError(BaseException):
    pass

class Parser:
    def __init__(self, tokens: list[Tokens.Token]):
        self.tokens = tokens
        source_span = Text.Span('<file contained no text>', '', 0, 0) if len(tokens) == 0 else Text.Span(tokens[-1].span.filename, tokens[-1].span.text, tokens[-1].span.end, tokens[-1].span.end)
        self.tokens.append(Tokens.Token(TokenType.EOF, source_span, 'EOF', 'EOF'))
        self.cursor = 0
        self.prefixes = {
            TokenType.ILiteral : self.literal,
            TokenType.SLiteral : self.literal,
            TokenType.FLiteral : self.literal,
            TokenType.BLiteral : self.literal,
            TokenType.LParen   : self.parenthesized,
            TokenType.LCBrace  : self.block,
            TokenType.Ident    : self.identifier,
            TokenType.Not      : self.unary,
            TokenType.Minus    : self.unary,
            TokenType.If       : self.if_,
            TokenType.Loop     : self.loop,
            TokenType.Break    : self.break_,
        }
        self.prefix_precedences = {
            TokenType.Not   : PREC_UNARY,
            TokenType.Minus : PREC_UNARY,
        }
        self.infix_precedences = {
            TokenType.Plus      : PREC_ADD_SUB,
            TokenType.Minus     : PREC_ADD_SUB,
            TokenType.Star      : PREC_MUL_DIV_EXP,
            TokenType.Slash     : PREC_MUL_DIV_EXP,
            TokenType.Exp       : PREC_MUL_DIV_EXP,
            TokenType.Semicolon : PREC_SEMICOLON,
            TokenType.LParen    : PREC_CALL,
            TokenType.Dot       : PREC_CALL,
            TokenType.EqEq      : PREC_EQ,
            TokenType.Lt        : PREC_EQ,
            TokenType.Leq       : PREC_EQ,
            TokenType.Gt        : PREC_EQ,
            TokenType.Geq       : PREC_EQ,
            TokenType.Neq       : PREC_EQ,
        }
        self.infixes = {
            TokenType.Plus      : self.infix,
            TokenType.Minus     : self.infix,
            TokenType.Star      : self.infix,
            TokenType.Slash     : self.infix,
            TokenType.Exp       : self.infix,
            TokenType.Semicolon : self.infix,
            TokenType.EqEq      : self.infix,
            TokenType.Lt        : self.infix,
            TokenType.Gt        : self.infix,
            TokenType.Leq       : self.infix,
            TokenType.Geq       : self.infix,
            TokenType.Neq       : self.infix,
            TokenType.LParen    : self.fcall,
            TokenType.Dot       : self.property,
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
    
    def literal(self, token: Tokens.Token) -> LiteralExpression | PropertyAccessExpression:
        if token.type == TokenType.FLiteral:
            exp = FloatLiteral(token.something_else, token.type_hint, token.span)
            if self.match(TokenType.Ident) and token.span.content().removesuffix('_' + ('' if token.type_hint is None else token.type_hint)).endswith('.'):
                Errors.error('wrap integers in parentheses when calling methods upon them', (token.span, f'help: replace this with \x1B[32m({token.span.content().replace(".", "")}).{Errors.CLEAR_COLOR}'))
                exp = IntLiteral(int(token.something_else), None, token.span)
                return self.property(exp, token)
            else:
                return exp
        elif token.type == TokenType.ILiteral:
            return IntLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.SLiteral:
            return StringLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.BLiteral:
            return BooleanLiteral(token.something_else, token.span)
        
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
    
    def fcall(self, lhs: Expression, token: Tokens.Token) -> CallExpression:
        next = self.peek()
        if next.type == TokenType.RParen:
            self.next()
            return CallExpression(lhs, Text.merge_spans(lhs.source_span(), token.span, next.span))
        args = []
        while True:
            args.append(self.expression())
            if self.peek().type == TokenType.Comma:
                self.next()
                if self.peek().type == TokenType.RParen:
                    closing = self.next()
                    return CallExpression(lhs, Text.merge_spans(lhs.source_span(), token.span, closing.span), *args)
            else:
                closing = self.expect(TokenType.RParen, 'expected <ET>, got <AT>')
                return CallExpression(lhs, Text.merge_spans(lhs.source_span(), token.span, closing.span), *args)
    
    def property(self, lhs: Expression, token: Tokens.Token) -> PropertyAccessExpression:
        # todo: add support for .<x> on tuples
        id = self.expect(TokenType.Ident, 'expected <ET>, got <AT>')
        return PropertyAccessExpression(lhs, id.something_else, Text.merge_spans(lhs.source_span(), token.span, id.span))
    
    def match(self, *types):
        for idx, type in enumerate(types):
            if self.tokens[self.cursor + idx].type != type:
                return False
        return True
    
    def if_(self, if_token: Tokens.Token) -> IfExpression:
        condition = self.expression()
        opening = self.expect(TokenType.LCBrace, 'expected <ET> after \'if\' condition, got <AT>')
        body = self.expression()
        closing = self.expect(TokenType.RCBrace, 'expected <ET> after \'if\' expression body, got <AT>')
        elifs = []
        else_ = None
        last_token = closing
        while self.match(TokenType.Else, TokenType.If):
            self.next()
            self.next()
            elif_condition = self.expression()
            self.expect(TokenType.LCBrace, 'expected <ET> after \'else if\' condition, got <AT>')
            elif_body = self.expression()
            last_token = self.expect(TokenType.RCBrace, 'expected <ET> after \'else if\' body, got <AT>')
            elifs.append((elif_condition, elif_body))
        if self.match(TokenType.Else):
            self.next()
            self.expect(TokenType.LCBrace, 'expected <ET> after \'else\', got <AT>')
            else_ = self.expression()
            last_token = self.expect(TokenType.RCBrace, 'expected <ET> after \'else\' body, got <AT>')
        return IfExpression(condition, body, elifs, else_, Text.merge_spans(if_token.span, opening.span, condition.source_span(), last_token.span))
    
    def has_expression(self) -> bool:
        return self.peek().type in self.prefixes.keys()
    
    def loop(self, token: Tokens.Token) -> LoopExpression:
        opening = self.expect(TokenType.LCBrace, 'expected <ET> after \'loop\', got <AT>')
        inside = self.expression() if self.has_expression() else None
        closing = self.expect(TokenType.RCBrace, 'expected <ET> after \'loop\' body, got <AT>')
        return LoopExpression(inside, Text.merge_spans(token.span, opening.span, closing.span))
    
    def break_(self, token: Tokens.Token) -> BreakExpression:
        content = self.expression(PREC_BREAK) if self.has_expression() else None
        return BreakExpression(content, token.span if content is None else Text.merge_spans(token.span, content.source_span()))