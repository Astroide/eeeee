import tokens as Tokens
TokenType = Tokens.TokenType
import text as Text
import errors as Errors

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
        return Text.Span('(this expression type has no override for source_span())', '...', 0, 3)

class BinaryExpression(Expression):
    def __init__(self, left: Expression, operator: Tokens.Token, right: Expression, span: Text.Span):
        self.left = left
        self.operator = operator
        self.right = right
        self.span = span
    
    def __repr__(self) -> str:
        return f'bin ({repr(self.left)} {str(self.operator.type).replace("TokenType.", "")} {repr(self.right)})'

class LiteralExpression(Expression):
    def __repr__(self) -> str:
        return 'some_literal'

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

class IdentifierExpression(Expression):
    def __init__(self, text: str, source: Text.Span):
        self.text = text
        self.source = source
    
    def source_span(self) -> Text.Span:
        return self.source

class FatalParseError(BaseException):
    pass

class Parser:
    def __init__(self, tokens: list[Tokens.Token]):
        self.tokens = tokens
        source_span = Text.Span('<file contained no text>', '', 0, 0) if len(tokens) == 0 else Text.Span(tokens[-1].span.filename, tokens[-1].span.text, tokens[-1].span.end, tokens[-1].span.end)
        self.tokens.append(Tokens.Token(TokenType.EOF, source_span, 'EOF', 'EOF'))
        self.cursor = 0
    
    def next(self) -> Tokens.Token:
        self.cursor += 1
        return self.tokens[self.cursor - 1]
    
    def peek(self) -> Tokens.Token:
        return self.tokens[self.cursor]
    
    def back(self):
        self.cursor -= 1
    
    def expect(self, token_type: TokenType, message: str, message_2: str = ''):
        token = self.next()
        if token.type != token_type:
            Errors.error(message.replace('<ET>', Tokens.reverse_type_map[token_type]).replace('<AT>', Tokens.reverse_type_map[token.type]), (token.span, message_2))
            raise FatalParseError()
    
    def literal(self, token: Tokens.Token) -> LiteralExpression:
        if token.type == TokenType.FLiteral:
            return FloatLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.ILiteral:
            return IntLiteral(token.something_else, token.type_hint, token.span)
        elif token.type == TokenType.SLiteral:
            return StringLiteral(token.something_else, token.type_hint, token.span)
        
    def expression(self, level = 0) -> Expression:
        token = self.next()
        if token.type == TokenType.EOF:
            self.back()
            self.expect(TokenType.EEE, 'expected an expression, got <AT>')
        
        if token.type in (TokenType.FLiteral, TokenType.SLiteral, TokenType.ILiteral, TokenType.Ident):
            l_expr = None
            the_expr = None
            if token.type == TokenType.Ident:
                l_expr = IdentifierExpression(token.something_else, token.span)
            else:
                l_expr = self.literal(token)
            nxt = self.next()
            if nxt.type == TokenType.Plus and level <= PREC_ADD_SUB:
                r_expr = self.expression(PREC_ADD_SUB)
                the_expr = BinaryExpression(l_expr, nxt, r_expr, Text.merge_spans(l_expr.source_span(), nxt.span, r_expr.source_span()))
            else:
                the_expr = l_expr
                self.back()
            return the_expr
        elif token.type == TokenType.LParen:
            return self.parenthesized()
        self.back()
        self.expect(TokenType.EEE, 'expected an expression, got <AT>')
    
    def parenthesized(self) -> Expression:
        expr = self.expression()
        self.expect(TokenType.RParen, 'expected a closing parenthesis, got <AT>')
        return expr