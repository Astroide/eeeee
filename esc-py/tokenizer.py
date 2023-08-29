from enum import Enum
import errors as Errors
import text as Text

class TokenType(Enum):
    ILiteral = 0   # Integer literal
    FLiteral = 1   # Float literal
    SLiteral = 2   # String or char literal; idea from danielrab (https://discord.com/channels/273534239310479360/490356824420122645/1145878910953848932)
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
    Fn = 32        # fn
    Else = 33      # else
    Match = 34     # match
    Type = 35      # type
    Const = 36     # const
    Continue = 37  # continue
    Break = 38     # break
    MinusEq = 39   # -=
    PlusEq = 40    # +=
    StarEq = 41    # *=
    SlashEq = 42   # /=
    ExpEq = 43     # **=

single_char_dict = {
    '(': TokenType.LParen,
    ')': TokenType.RParen,
    '[': TokenType.LBracket,
    ']': TokenType.RBracket,
    '{': TokenType.LCBrace,
    '}': TokenType.RCBrace,
    ';': TokenType.Semicolon,
    '.': TokenType.Dot,
    ':': TokenType.Colon,
}

language = 'en' # for fun
keyword_dict = {'en': {
    'let': TokenType.Let,
    'if': TokenType.If,
    'fn': TokenType.Fn,
    'return': TokenType.Return,
    'const': TokenType.Const,
    'else': TokenType.Else,
    'match': TokenType.Match,
    'type': TokenType.Type,
    'const': TokenType.Const,
    'continue': TokenType.Continue,
    'break': TokenType.Break,
}, 'fr': {
    'si': TokenType.If,
    'fn': TokenType.Fn,
    'retourner': TokenType.Return,
    'let': TokenType.Let, # there is probably a better keyword name
    # later : add missing keywords
}}

class Token:
    def __init__(self, type, span, something_else, type_hint):
        self.type = type
        self.span = span
        self.something_else = something_else
        self.type_hint = type_hint
    
    def __repr__(self) -> str:
        return f'<Token {str(self.type).removeprefix("TokenType.")} `{self.span.content()}`{" [" + self.type_hint + "]" if self.type_hint is not None else ""}{" " + str(self.something_else) if self.something_else is not None else ""}>'

class Tokenizer:
    def __init__(self, source_string, source_filename):
        self.source_string = source_string
        self.source_filename = source_filename
        self.position = 0
    
    def peek(self, n = 1):
        return self.source_string[self.position + 1:self.position + n + 1]
    
    def get_type_hint(self):
        if self.peek() != '_':
            return ''
        self.position += 1
        hint = ''
        while self.peek() in 'qwertyuiopasdfghjklzxcvbnm1234567890':
            char = self.peek()
            if char == '':
                break
            hint += char
            self.position += 1
        if hint == '':
            Errors.error('a trailing underscore is not a valid type hint', (Text.Span(self.source_filename, self.source_string, self.position, self.position + 1), ''))
            return None
        return hint
    
    def read_escape(self):
        self.position += 1
        nxt = self.peek()
        if nxt == 'n':
            return '\n'
        elif nxt == 't':
            return '\t'
        elif nxt == 'r':
            return '\r'
        elif nxt == '\\':
            return '\\'
        elif nxt == '\'':
            return '\''
        elif nxt == '\0':
            return '\x00'
        elif nxt == 'u':
            self.position += 1
            if self.peek() != '{':
                Errors.error('\\u must be followed by a {', (Text.Span(self.source_filename, self.source_string, self.position + 1, self.position + 2), ''))
                return None
            self.position += 1
            acc = ''
            while self.peek() != '}':
                char = self.peek()
                if char not in '0123456789abcdefABCDEF':
                    Errors.error('Unclosed Unicode escape' if char == "'" else 'Non-hexadecimal character in Unicode escape', (Text.Span(self.source_filename, self.source_string, self.position + 1, self.position + 2), ''))
                    return None
                if char == '':
                    return ''
                acc += char
                self.position += 1
            if len(acc) == 0:
                Errors.error('Empty Unicode escape', (Text.Span(self.source_filename, self.source_string, self.position - 2, self.position + 2), ''))
                return None
            if len(acc) > 6:
                Errors.error('Unicode escapes have a maximum of 6 hexadecimal digits', (Text.Span(self.source_filename, self.source_string, self.position - len(acc) - 2, self.position + 2), ''))
                return None
            return chr(int(acc, 16))
    
    def generate_tokens(self):
        tokens = []
        while self.position < len(self.source_string):
            token_type = TokenType.ILiteral
            token_start = self.position
            token_extra = None
            token_type_hint = None
            match self.source_string[self.position]:
                case ' ' | '\n' | '\r' | '\t':
                    self.position += 1
                    continue
                case '_' | 'a' | 'A' | 'b' | 'B' | 'c' | 'C' | 'd' | 'D' | 'e' | 'E' | 'f' | 'F' | 'g' | 'G' | 'h' | 'H' | 'i' | 'I' | 'j' | 'J' | 'k' | 'K' | 'l' | 'L' | 'm' | 'M' | 'n' | 'N' | 'o' | 'O' | 'p' | 'P' | 'q' | 'Q' | 'r' | 'R' | 's' | 'S' | 't' | 'T' | 'u' | 'U' | 'v' | 'V' | 'w' | 'W' | 'x' | 'X' | 'y' | 'Y' | 'z' | 'Z':
                    # Unicode identifiers will be added... later.
                    ident = self.source_string[self.position]
                    while True:
                        next_char = self.peek()
                        if next_char != '' and next_char in '_aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ0123456789':
                            ident += next_char
                            self.position += 1
                        else:
                            break
                    if ident in keyword_dict[language].keys():
                        token_type = keyword_dict[language][ident]
                    else:
                        token_type = TokenType.Ident
                        token_extra = ident
                case '(' | ')' | '[' | ']' | '{' | '}' | ';' | '.' | ':':
                    token_type = single_char_dict[self.source_string[self.position]]
                case '!' | '/' | '+' | '-' | '=' | '<' | '>':
                    char = self.source_string[self.position]
                    if self.peek() == '=':
                        self.position += 1
                        token_type = {
                            '/': TokenType.SlashEq,
                            '+': TokenType.PlusEq,
                            '!': TokenType.Neq,
                            '-': TokenType.MinusEq,
                            '=': TokenType.EqEq,
                            '<': TokenType.Leq,
                            '>': TokenType.Geq,
                        }[char]
                    else:
                        token_type = {
                            '/': TokenType.Slash,
                            '+': TokenType.Plus,
                            '!': TokenType.Not,
                            '-': TokenType.Minus,
                            '=': TokenType.Eq,
                            '<': TokenType.Lt,
                            '>': TokenType.Gt,
                        }[char]
                case '*':
                    is_exp = self.peek() == '*'
                    if is_exp:
                        self.position += 1
                    if self.peek() == '=':
                        self.position += 1
                        token_type = TokenType.ExpEq if is_exp else TokenType.StarEq
                    else:
                        token_type = TokenType.Exp if is_exp else TokenType.Star
                case "'":
                    string_contents = ''
                    while self.peek() != "'":
                        char = self.peek()
                        if char == '':
                            Errors.error(f'Encountered EOF while reading a text literal', (Text.Span(self.source_filename, self.source_string, token_start, token_start + 1), 'string was started here'))
                            return None
                        elif char == '\\':
                            result = self.read_escape()
                            if result is None:
                                return None
                            string_contents += result
                        else:
                            string_contents += char
                        self.position += 1
                    self.position += 1
                    position_before_hint = self.position
                    hint = self.get_type_hint()
                    if hint is None:
                        return None
                    if hint == 'char':
                        if len(string_contents) != 1:
                            Errors.error('text literals tagged as char must be exactly 1 character long', (Text.Span(self.source_filename, self.source_string, token_start, self.position + 1), ''))
                            return None
                        token_type_hint = 'char'
                    elif hint != '':
                        Errors.error(f'`_{hint}` is not a valid type hint for a text literal', (Text.Span(self.source_filename, self.source_string, position_before_hint + 1, self.position + 1), ''))
                        return None
                    token_type = TokenType.SLiteral
                    token_extra = string_contents
                case _:
                    # print(self.position, '*' + Text.Span(self.source_filename, self.source_string, self.position, self.position + 1).content() + '*')
                    Errors.error(f'Unrecognized character \'{self.source_string[self.position]}\'', (Text.Span(self.source_filename, self.source_string, self.position, self.position + 1), ''))
                    return None
            self.position += 1
            tokens.append(Token(token_type, Text.Span(self.source_filename, self.source_string, token_start, self.position), token_extra, token_type_hint))
        return tokens