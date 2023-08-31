from enum import Enum
import errors as Errors
import text as Text
from util import ordinal

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
    Lt = 9         # <
    Gt = 10        # >
    Leq = 11       # <=
    Geq = 12       # >=
    EqEq = 13      # ==
    LCBrace = 14   # {
    RCBrace = 15   # }
    Ident = 16     # Identifier
    If = 17        # if
    Neq = 18       # !=
    Minus = 19     # -
    Plus = 20      # +
    Star = 21      # *
    Slash = 22     # /
    Ret = 23       # ->
    Return = 24    # return
    Exp = 25       # **
    Semicolon = 26 # ;
    Dot = 27       # .
    Not = 28       # !
    Colon = 29     # :
    Fn = 30        # fn
    Else = 31      # else
    Match = 32     # match
    Type = 33      # type
    Const = 34     # const
    Continue = 35  # continue
    Break = 36     # break
    MinusEq = 37   # -=
    PlusEq = 38    # +=
    StarEq = 39    # *=
    SlashEq = 40   # /=
    ExpEq = 41     # **=
    BLiteral = 42  # true | false
    Comma = 43     # ,
    Loop = 44      # loop
    EEE = 45
    EOF = 46

reverse_type_map = {
    TokenType.ILiteral : 'an integer literal',
    TokenType.FLiteral : 'a float literal',
    TokenType.SLiteral : 'a string literal',
    TokenType.Let      : "'let'",
    TokenType.Eq       : "'='",
    TokenType.LParen   : "'('",
    TokenType.RParen   : "')'",
    TokenType.LBracket : "'['",
    TokenType.RBracket : "']'",
    TokenType.Lt       : "'<'",
    TokenType.Gt       : "'>'",
    TokenType.Leq      : "'<='",
    TokenType.Geq      : "'>='",
    TokenType.EqEq     : "'=='",
    TokenType.LCBrace  : "'{'",
    TokenType.RCBrace  : "'}'",
    TokenType.Ident    : "an identifier",
    TokenType.If       : "'if'",
    TokenType.Neq      : "'!='",
    TokenType.Minus    : "'-'",
    TokenType.Plus     : "'+'",
    TokenType.Star     : "'*'",
    TokenType.Slash    : "'/'",
    TokenType.Ret      : "'->'",
    TokenType.Return   : "'return'",
    TokenType.Exp      : "'**'",
    TokenType.Semicolon: "';'",
    TokenType.Dot      : "'.'",
    TokenType.Not      : "'!'",
    TokenType.Colon    : "':'",
    TokenType.Fn       : "'fn'",
    TokenType.Else     : "'else'",
    TokenType.Match    : "'match'",
    TokenType.Type     : "'type'",
    TokenType.Const    : "'const'",
    TokenType.Continue : "'continue'",
    TokenType.Break    : "'break'",
    TokenType.MinusEq  : "'-='",
    TokenType.PlusEq   : "'+='",
    TokenType.StarEq   : "'*='",
    TokenType.SlashEq  : "'/='",
    TokenType.ExpEq    : "'**='",
    TokenType.BLiteral : "a boolean literal ('true' or 'false')",
    TokenType.Comma    : "','",
    TokenType.Loop     : "'loop'",
    TokenType.EEE      : Errors.ice('you should never see this (TokenType.EEE)'),
    TokenType.EOF      : 'EOF',
}

lit = {
    TokenType.ILiteral : 'an integer literal',
    TokenType.FLiteral : 'a float literal',
    TokenType.SLiteral : 'a string literal',
    TokenType.Let      : "let",
    TokenType.Eq       : "=",
    TokenType.LParen   : "(",
    TokenType.RParen   : ")",
    TokenType.LBracket : "[",
    TokenType.RBracket : "]",
    TokenType.Lt       : "<",
    TokenType.Gt       : ">",
    TokenType.Leq      : "<=",
    TokenType.Geq      : ">=",
    TokenType.EqEq     : "==",
    TokenType.LCBrace  : "{",
    TokenType.RCBrace  : "}",
    TokenType.Ident    : "an identifier",
    TokenType.If       : "if",
    TokenType.Neq      : "!=",
    TokenType.Minus    : "-",
    TokenType.Plus     : "+",
    TokenType.Star     : "*",
    TokenType.Slash    : "/",
    TokenType.Ret      : "->",
    TokenType.Return   : "return",
    TokenType.Exp      : "**",
    TokenType.Semicolon: ";",
    TokenType.Dot      : ".",
    TokenType.Not      : "!",
    TokenType.Colon    : ":",
    TokenType.Fn       : "fn",
    TokenType.Else     : "else",
    TokenType.Match    : "match",
    TokenType.Type     : "type",
    TokenType.Const    : "const",
    TokenType.Continue : "continue",
    TokenType.Break    : "break",
    TokenType.MinusEq  : "-=",
    TokenType.PlusEq   : "+=",
    TokenType.StarEq   : "*=",
    TokenType.SlashEq  : "/=",
    TokenType.ExpEq    : "**=",
    TokenType.BLiteral : "a boolean literal ('true' or 'false')",
    TokenType.Comma    : ',',
    TokenType.Loop     : 'loop',
    TokenType.EEE      : Errors.ice('you should never see this (TokenType.EEE)'),
    TokenType.EOF      : 'EOF',
}

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
    ',': TokenType.Comma,
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
    'loop': TokenType.Loop,
}, 'fr': {
    'si': TokenType.If,
    'fn': TokenType.Fn,
    'retourner': TokenType.Return,
    'let': TokenType.Let, # there is probably a better keyword name
    # later : add missing keywords
}}

class Token:
    def __init__(self, type: TokenType, span: Text.Span, something_else, type_hint: str):
        self.type = type
        self.span = span
        self.something_else = something_else
        self.type_hint = type_hint
    
    def __repr__(self) -> str:
        return f'<Token {str(self.type).removeprefix("TokenType.")} `{self.span.content()}`{" [" + self.type_hint + "]" if self.type_hint is not None else ""}{" " + str(self.something_else) if self.something_else is not None else ""}>'


class Tokenizer:
    def __init__(self, source_string: str, source_filename: str):
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
                    return ''
                if char == '':
                    return '' # let the upstream EOF handler catch it
                acc += char
                self.position += 1
            if len(acc) == 0:
                Errors.error('Empty Unicode escape', (Text.Span(self.source_filename, self.source_string, self.position - 2, self.position + 2), ''))
                return ''
            if len(acc) > 6:
                Errors.error('Unicode escapes have a maximum of 6 hexadecimal digits', (Text.Span(self.source_filename, self.source_string, self.position - len(acc) - 2, self.position + 2), ''))
                return ''
            return chr(int(acc, 16))
        
    def read_num_literal(self):
        lit = self.source_string[self.position]
        while self.peek() in '0123456789' and self.peek() != '':
            lit += self.peek()
            self.position += 1
        if self.peek() == '.':
            self.position += 1
            lit += '.'
            while self.peek() in '0123456789' and self.peek() != '':
                lit += self.peek()
                self.position += 1
            return (TokenType.FLiteral, float(lit))
        else:
            return (TokenType.ILiteral, int(lit))

    def generate_tokens(self) -> list[Token]:
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
                case '/' if self.peek() == '/': # // comments
                    self.position += 1
                    while self.peek() != '\n' and self.peek() != '':
                        self.position += 1
                    self.position += 1
                    continue
                case '/' if self.peek() == '*': # /* comments */
                    self.position += 1
                    depth = 1
                    comment_starts = [token_start]
                    while depth > 0:
                        next_two = self.peek(2)
                        if len(next_two) < 2:
                            unmatched_openers = []
                            for i in range(depth):
                                unmatched_openers.append((Text.Span(self.source_filename, self.source_string, comment_starts[i], comment_starts[i] + 2), f'{ordinal(i + 1)} unclosed comment started here'))
                            Errors.error(f'encountered EOF while in a multiline comment ({depth} unclosed comment{"s" if depth > 1 else ""})', *tuple(unmatched_openers))
                            return None
                        if next_two == '*/':
                            self.position += 2
                            depth -= 1
                        elif next_two == '/*':
                            comment_starts.append(self.position + 1)
                            self.position += 2
                            depth += 1
                        else:
                            self.position += 1
                    self.position += 1
                        
                    continue
                case '-' if self.peek() == '>':
                    self.position += 1
                    token_type = TokenType.Ret
                case '0' if self.peek() == 'x': # hex literal
                    self.position += 1
                    token_type = TokenType.ILiteral
                    lit = ''
                    while True:
                        next_char = self.peek()
                        if next_char != '' and next_char in '0123456789abcdefABCDEF':
                            lit += next_char
                            self.position += 1
                        else:
                            break
                    val = 0
                    if len(lit) == 0:
                        Errors.error('an hexadecimal literal must contain at least one digit', (Text.Span(self.source_filename, self.source_string, token_start, token_start + 2), ''))
                    else:
                        val = int(lit, 16)
                    token_extra = val
                    hint_start = self.position + 1
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint in ['i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']:
                        token_type_hint = hint
                    elif hint in ['f32', 'f64']:
                        Errors.error('float type hints are invalid for int literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of u8, i8, u16, i16, u32, i32, u64, i64, u128, i128'))
                    elif len(hint) > 0:
                        if hint[0] in 'uif' and all(map(lambda x: x in '0123456789', hint[1:])):
                            Errors.error(f'invalid width {hint[1:]} for {"float" if hint[0] == "f" else "integer"} literal', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), f'valid widths for {"float" if hint[0] == "f" else "integer"}s are {"32 and 64" if hint[0] == "f" else "8, 16, 32, 64 and 128"}'))
                        else:
                            Errors.error(f'invalid type hint for number literal: `_{hint}`', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), ''))
                case '0' if self.peek() == 'o': # octal literal
                    self.position += 1
                    token_type = TokenType.ILiteral
                    lit = ''
                    while True:
                        next_char = self.peek()
                        if next_char != '' and next_char in '01234567':
                            lit += next_char
                            self.position += 1
                        else:
                            break
                    val = 0
                    if len(lit) == 0:
                        Errors.error('an octal literal must contain at least one digit', (Text.Span(self.source_filename, self.source_string, token_start, token_start + 2), ''))
                    else:
                        val = int(lit, 8)
                    token_extra = val
                    hint_start = self.position + 1
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint in ['i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']:
                        token_type_hint = hint
                    elif hint in ['f32', 'f64']:
                        Errors.error('float type hints are invalid for int literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of u8, i8, u16, i16, u32, i32, u64, i64, u128, i128'))
                    elif len(hint) > 0:
                        if hint[0] in 'uif' and all(map(lambda x: x in '0123456789', hint[1:])):
                            Errors.error(f'invalid width {hint[1:]} for {"float" if hint[0] == "f" else "integer"} literal', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), f'valid widths for {"float" if hint[0] == "f" else "integer"}s are {"32 and 64" if hint[0] == "f" else "8, 16, 32, 64 and 128"}'))
                        else:
                            Errors.error(f'invalid type hint for number literal: `_{hint}`', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), ''))
                case '0' if self.peek() == 'b': # binary literal
                    self.position += 1
                    token_type = TokenType.ILiteral
                    lit = ''
                    while True:
                        next_char = self.peek()
                        if next_char != '' and next_char in '01':
                            lit += next_char
                            self.position += 1
                        else:
                            break
                    val = 0
                    if len(lit) == 0:
                        Errors.error('a binary literal must contain at least one digit', (Text.Span(self.source_filename, self.source_string, token_start, token_start + 2), ''))
                    else:
                        val = int(lit, 2)
                    token_extra = val
                    hint_start = self.position + 1
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint in ['i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']:
                        token_type_hint = hint
                    elif hint in ['f32', 'f64']:
                        Errors.error('float type hints are invalid for int literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of u8, i8, u16, i16, u32, i32, u64, i64, u128, i128'))
                    elif len(hint) > 0:
                        if hint[0] in 'uif' and all(map(lambda x: x in '0123456789', hint[1:])):
                            Errors.error(f'invalid width {hint[1:]} for {"float" if hint[0] == "f" else "integer"} literal', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), f'valid widths for {"float" if hint[0] == "f" else "integer"}s are {"32 and 64" if hint[0] == "f" else "8, 16, 32, 64 and 128"}'))
                        else:
                            Errors.error(f'invalid type hint for number literal: `_{hint}`', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), ''))
                case '.' if self.peek() in '0123456789':
                    lit = '0.'
                    while self.peek() in '0123456789' and self.peek() != '':
                        lit += self.peek()
                        self.position += 1
                    hint_start = self.position + 1
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint in ['i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']:
                        Errors.error('int type hints are invalid for float literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of f32, f64'))
                    elif hint in ['f32', 'f64']:
                        token_type_hint = hint
                    elif len(hint) > 0:
                        if hint[0] in 'uif' and all(map(lambda x: x in '0123456789', hint[1:])):
                            Errors.error(f'invalid width {hint[1:]} for {"float" if hint[0] == "f" else "integer"} literal', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), f'valid widths for {"float" if hint[0] == "f" else "integer"}s are {"32 and 64" if hint[0] == "f" else "8, 16, 32, 64 and 128"}'))
                        else:
                            Errors.error(f'invalid type hint for number literal: `_{hint}`', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), ''))
                    token_type = TokenType.FLiteral
                    token_extra = float(lit)
                    Errors.error('a float literal must have an integer part', (Text.Span(self.source_filename, self.source_string, token_start, token_start + len(lit) - 1), f'help: add a `0` before it: {lit}'))

                case '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9':
                    token_type, token_extra = self.read_num_literal()
                    hint_start = self.position
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint in ['i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']:
                        if token_type == TokenType.FLiteral:
                            Errors.error('int type hints are invalid for float literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of f32, f64'))
                        else:
                            token_type_hint = hint
                    elif hint in ['f32', 'f64']:
                        if token_type == TokenType.ILiteral:
                            Errors.error('float type hints are invalid for int literals', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), 'a valid type would be one of u8, i8, u16, i16, u32, i32, u64, i64, u128, i128'))
                        else:
                            token_type_hint = hint
                    elif len(hint) > 0:
                        if hint[0] in 'uif' and all(map(lambda x: x in '0123456789', hint[1:])):
                            Errors.error(f'invalid width {hint[1:]} for {"float" if hint[0] == "f" else "integer"} literal', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), f'valid widths for {"float" if hint[0] == "f" else "integer"}s are {"32 and 64" if hint[0] == "f" else "8, 16, 32, 64 and 128"}'))
                        else:
                            Errors.error(f'invalid type hint for number literal: `_{hint}`', (Text.Span(self.source_filename, self.source_string, hint_start, self.position + 1), ''))
                case 't' if self.peek(3) == 'rue':
                    token_type = TokenType.BLiteral
                    token_extra = True
                    self.position += 3
                case 'f' if self.peek(4) == 'alse':
                    token_type = TokenType.BLiteral
                    token_extra = False
                    self.position += 4
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
                case '(' | ')' | '[' | ']' | '{' | '}' | ';' | '.' | ':' | ',':
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
                            Errors.error(f'encountered EOF while reading a text literal', (Text.Span(self.source_filename, self.source_string, token_start, token_start + 1), 'string was started here'))
                            return None
                        elif char == '\\':
                            position = self.position + 1
                            result = self.read_escape()
                            if result is None:
                                Errors.error('invalid escape sequence', (Text.Span(self.source_filename, self.source_string, position, position + 2), ''))
                                result = ''
                            string_contents += result
                        else:
                            string_contents += char
                        self.position += 1
                    self.position += 1
                    position_before_hint = self.position
                    hint = self.get_type_hint()
                    if hint is None:
                        hint = ''
                    if hint == 'char':
                        if len(string_contents) != 1:
                            Errors.error('text literals tagged as char must be exactly 1 character long', (Text.Span(self.source_filename, self.source_string, token_start, self.position + 1), ''))
                            return None
                        token_type_hint = 'char'
                    elif hint == 'string':
                        token_type_hint = 'string'
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