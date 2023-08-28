from enum import Enum
import errors as Errors
import text as Text

class TokenType(Enum):
    ILiteral = 0   # Integer literal
    FLiteral = 1   # Float literal
    SLiteral = 2   # String literal
    Let = 3        # let
    Eq = 4         # =
    LParen = 5     # (
    RParen = 6     # )
    LBracket = 7   # [
    RBracket = 8   # ]
    SQuote = 9     # '
    DQuote = 10    # "
    Lt = 11        # <
    Gt = 12        # >
    Leq = 13       # <=
    Geq = 14       # >=
    EqEq = 15      # ==
    LCBrace = 16   # {
    RCBrace = 17   # }
    Ident = 18     # Identifier
    If = 19        # if
    Neq = 20       # !=
    Minus = 21     # -
    Plus = 22      # +
    Star = 23      # *
    Slash = 24     # /
    Ret = 25       # ->
    Return = 26    # return
    Exp = 27       # **
    Semicolon = 28 # ;
    Dot = 29       # .
    Not = 30       # !
    Colon = 31     # :

class Token:
    def __init__(self, type, span):
        self.type = type
        self.span = span

class Tokenizer:
    def __init__(self, source_string, source_filename):
        self.source_string = source_string
        self.source_filename = source_filename
        self.position = 0
    
    def generate_tokens(self):
        tokens = []
        while self.position < len(self.source_string):
            match self.source_string[self.position]:
                case ' ' | '\n' | '\r' | '\t':
                    pass
                case _:
                    Errors.error(f'Unrecognized character \'{self.source_string[self.position]}\'', (Text.Span(self.source_filename, self.source_string, self.position, self.position + 1), ''))
                    return None
            self.position += 1
        return tokens