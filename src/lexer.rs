use unicode_xid::UnicodeXID;

use crate::{
    errors::{codes, make_error, Error, Severity::*},
    loader::Span,
    tokens::{
        FLiteralTypeHint, ILiteralTypeHint, IntLiteralType, SLiteralTypeHint, Token, TokenType,
    },
};

static HEX_CHAR_TO_STR: [&str; 103] = [
    "\x00", "\x01", "\x02", "\x03", "\x04", "\x05", "\x06", "\x07", "\x08", "\x09", "\x0a", "\x0b",
    "\x0c", "\x0d", "\x0e", "\x0f", "\x10", "\x11", "\x12", "\x13", "\x14", "\x15", "\x16", "\x17",
    "\x18", "\x19", "\x1a", "\x1b", "\x1c", "\x1d", "\x1e", "\x1f", "\x20", "\x21", "\x22", "\x23",
    "\x24", "\x25", "\x26", "\x27", "\x28", "\x29", "\x2a", "\x2b", "\x2c", "\x2d", "\x2e", "\x2f",
    "\x30", "\x31", "\x32", "\x33", "\x34", "\x35", "\x36", "\x37", "\x38", "\x39", "\x3a", "\x3b",
    "\x3c", "\x3d", "\x3e", "\x3f", "\x40", "\x41", "\x42", "\x43", "\x44", "\x45", "\x46", "\x47",
    "\x48", "\x49", "\x4a", "\x4b", "\x4c", "\x4d", "\x4e", "\x4f", "\x50", "\x51", "\x52", "\x53",
    "\x54", "\x55", "\x56", "\x57", "\x58", "\x59", "\x5a", "\x5b", "\x5c", "\x5d", "\x5e", "\x5f",
    "\x60", "\x61", "\x62", "\x63", "\x64", "\x65", "\x66",
];

pub fn lex(input: &crate::loader::Source) -> (Vec<Token>, Result<(), Vec<Error>>) {
    let chars = input.string().chars().clone().collect::<Vec<char>>();
    let file = input.index;
    let mut idx = 0;
    let mut error_accumulator: Vec<Error> = vec![];
    let mut tokens: Vec<Token> = vec![];
    macro_rules! peek {
        () => {
            if idx + 1 < chars.len() {
                Some(chars[idx + 1])
            } else {
                None
            }
        };
    }

    macro_rules! early_exit {
        () => {
            return (tokens, Err(error_accumulator))
        };
    }

    macro_rules! twice {
        ($x:block) => {{
            $x;
            $x
        }};
    }

    while idx < chars.len() {
        let n = idx;

        macro_rules! simple_token {
            ($type:expr) => {
                Some(Token {
                    span: Span::new(file, n, n + 1),
                    tt: $type,
                })
            };
        }

        macro_rules! two_char_token {
            ($type:expr) => {{
                idx += 1;
                Some(Token {
                    span: Span::new(file, n, idx + 1),
                    tt: $type,
                })
            }};
        }

        macro_rules! keyword {
            ($type:expr) => {
                Some(Token {
                    span: Span::new(file, n, idx + 1),
                    tt: $type,
                })
            };
        }

        macro_rules! bool {
            ($val:literal) => {
                Some(Token {
                    span: Span::new(file, n, idx + 1),
                    tt: BLiteral($val),
                })
            };
        }

        macro_rules! invalid_type_hint {
            ($possibilities:expr, $t:expr, $type_:literal, $ths:expr) => {
                error_accumulator.push(make_error!(
                    format!(
                        "{} is not a valid type hint for {{{}}} (valid ones are {})",
                        $t,
                        $type_,
                        $possibilities.iter().skip(1).fold(
                            $possibilities[0].to_string(),
                            |mut acc, item| {
                                acc.push_str(", ");
                                acc.push_str(item);
                                acc
                            }
                        )
                    ),
                    codes::E0009.0,
                    Error,
                    None => Span::new(file, $ths + 1, idx)
                ))
            };
        }

        macro_rules! read_type_hint {
            () => {&{
                let mut hint = String::new();
                while let Some(c @ ('a'..='z' | '0'..='9')) = peek!() { // numbers should be OK, this should be called after the lexer's out of numbers
                    idx += 1;
                    hint.push(c);
                };
                hint
            }[..]}
        }

        macro_rules! rth {
            ($possibilities:expr, $kind:literal, $none:path, $($in_:literal: $out:expr),*) => {
                {
                    let mut invalid = false;
                    let type_hint_start = idx;
                    let type_hint = match read_type_hint!() {
                        "" => $none,
                        $(
                            $in_ => $out,
                        )*
                        any => {
                            invalid_type_hint!($possibilities, any, $kind, type_hint_start);
                            invalid = true;
                            $none
                        },
                    };
                    (type_hint, invalid)
                }
            }
        }

        let next = chars[idx];
        use TokenType::*;
        if let Some(token) = match next {
            ' ' /* space */
          | '\n'
          | '\t'
          | '\r'
          | '\u{000B}' /* vertical tab */
          | '\u{000C}' /* form feed */
          | '\u{0085}' /* whatever this is */
          | '\u{200E}' /* LTR */
          | '\u{200F}' /* RTL */
          | '\u{2028}' /* line separator */
          | '\u{2029}' /* paragraph separator */ => None,
            '/' if matches!(peek!(), Some('/')) => {
                while let Some(c) = peek!() {
                    idx += 1;
                    if c == '\n' {
                        break
                    }
                };
                None
            },
            '/' if matches!(peek!(), Some('*')) => {
                let mut depth = 1;
                let mut starts = vec![n];
                let mut past_two = ('@', '@');
                while depth > 0 {
                    idx += 1;
                    let next = peek!();
                    if let Some(c) = next {
                        past_two.0 = past_two.1;
                        past_two.1 = c;
                        if past_two == ('/', '*') {
                            depth += 1;
                            starts.push(idx);
                        } else if past_two == ('*', '/') {
                            depth -= 1;
                            starts.pop();
                        }
                    } else {
                        error_accumulator.push(make_error!(
                            "unmatched /*", codes::E0002.0, FatalError, None => Span::new(file, starts[starts.len() - 1], starts[starts.len() - 1] + 2 )
                        ));
                        early_exit!()
                    }
                };
                idx += 1;
                None
            },
            '(' => simple_token!(LParen),
            ')' => simple_token!(RParen),
            '[' => simple_token!(LBracket),
            ']' => simple_token!(RBracket),
            '{' => simple_token!(LCBrace),
            '}' => simple_token!(RCBrace),
            ';' => simple_token!(Semicolon),
            '.' => simple_token!(Dot),
            ':' => simple_token!(Colon),
            ',' => simple_token!(Comma),
            '→' => simple_token!(Ret),
            '-' if matches!(peek!(), Some('>')) => two_char_token!(Ret),
            '-' if matches!(peek!(), Some('=')) => two_char_token!(MinusEq),
            '+' if matches!(peek!(), Some('=')) => two_char_token!(PlusEq),
            '!' if matches!(peek!(), Some('=')) => two_char_token!(Neq),
            '/' if matches!(peek!(), Some('=')) => two_char_token!(SlashEq),
            '=' if matches!(peek!(), Some('=')) => two_char_token!(EqEq),
            '<' if matches!(peek!(), Some('=')) => two_char_token!(Leq),
            '>' if matches!(peek!(), Some('=')) => two_char_token!(Geq),
            '-' => simple_token!(Minus),
            '+' => simple_token!(Plus),
            '!' => simple_token!(Not),
            '/' => simple_token!(Slash),
            '=' => simple_token!(Eq),
            '<' => simple_token!(Lt),
            '>' => simple_token!(Gt),
            '*' => {
                if let Some('*') = peek!() {
                    idx += 1;
                    if let Some('=') = peek!() {
                        idx += 1;
                        Some(Token {
                            span: Span::new(file, n, idx + 1),
                            tt: ExpEq,
                        })
                    } else {
                        two_char_token!(Exp)
                    }
                } else if let Some('=') = peek!() {
                    idx += 1;
                    Some(Token {
                        span: Span::new(file, n, idx + 1),
                        tt: StarEq,
                    })
                } else {
                    simple_token!(Star)
                }
            },
            '0' if matches!(peek!(), Some('x')) => {
                idx += 1;
                let mut value = "".to_owned();
                while let Some(c @ ('0'..='9' | 'a'..='f' | 'A'..='F' | '_')) = peek!() {
                    if c != '_' {
                        value.push(c);
                    };
                    idx += 1;
                };
                if value.is_empty() {
                    error_accumulator.push(make_error!("empty hexadecimal literal", codes::E0003.0, Error, None => Span::new(file, n, idx + 1)));
                    value.push('0');
                };
                let (type_hint, _is_invalid) = rth!(["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"], "integer", ILiteralTypeHint::None, "u8": ILiteralTypeHint::U8, "i8": ILiteralTypeHint::I8, "u16": ILiteralTypeHint::U16, "i16": ILiteralTypeHint::I16, "u32": ILiteralTypeHint::U32, "i32": ILiteralTypeHint::I32, "u64": ILiteralTypeHint::U64, "i64": ILiteralTypeHint::I64);
                Some(Token { span: Span::new(file, n, idx + 1), tt: ILiteral { value, kind: IntLiteralType::Hexadecimal, type_hint } })
            },
            '0' if matches!(peek!(), Some('o')) => {
                idx += 1;
                let mut value = "".to_owned();
                while let Some(c @ ('0'..='7' | '_')) = peek!() {
                    if c != '_' {
                        value.push(c);
                    };
                    idx += 1;
                };
                if value.is_empty() {
                    error_accumulator.push(make_error!("empty octal literal", codes::E0003.0, Error, None => Span::new(file, n, idx + 1)));
                    value.push('0');
                };
                let (type_hint, _is_invalid) = rth!(["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"], "integer", ILiteralTypeHint::None, "u8": ILiteralTypeHint::U8, "i8": ILiteralTypeHint::I8, "u16": ILiteralTypeHint::U16, "i16": ILiteralTypeHint::I16, "u32": ILiteralTypeHint::U32, "i32": ILiteralTypeHint::I32, "u64": ILiteralTypeHint::U64, "i64": ILiteralTypeHint::I64);
                Some(Token { span: Span::new(file, n, idx + 1), tt: ILiteral { value, kind: IntLiteralType::Octal, type_hint } })
            },
            '0' if matches!(peek!(), Some('b')) => {
                idx += 1;
                let mut value = "".to_owned();
                while let Some(c @ ('0' | '1' | '_')) = peek!() {
                    if c != '_' {
                        value.push(c);
                    };
                    idx += 1;
                };
                if value.is_empty() {
                    error_accumulator.push(make_error!("empty binary literal", codes::E0003.0, Error, None => Span::new(file, n, idx + 1)));
                    value.push('0');
                };
                let (type_hint, _is_invalid) = rth!(["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"], "integer", ILiteralTypeHint::None, "u8": ILiteralTypeHint::U8, "i8": ILiteralTypeHint::I8, "u16": ILiteralTypeHint::U16, "i16": ILiteralTypeHint::I16, "u32": ILiteralTypeHint::U32, "i32": ILiteralTypeHint::I32, "u64": ILiteralTypeHint::U64, "i64": ILiteralTypeHint::I64);
                Some(Token { span: Span::new(file, n, idx + 1), tt: ILiteral { value, kind: IntLiteralType::Binary, type_hint } })
            },
            x @ '0'..='9' => {
                let mut value = x.to_string();
                while let Some(c @ ('0'..='9' | '_')) = peek!() {
                    if c != '_' {
                        value.push(c);
                    };
                    idx += 1;
                };
                Some(if let Some('.') = peek!() {
                    idx += 1;
                    if let Some('0'..='9') = peek!() {
                        value.push('.');
                        while let Some(c @ ('0'..='9' | '_')) = peek!() {
                            if c != '_' {
                                value.push(c);
                            };
                            idx += 1;
                        };
                        let (type_hint, _is_invalid) = rth!(["f32", "f64"], "float", FLiteralTypeHint::None, "f32": FLiteralTypeHint::F32, "f64": FLiteralTypeHint::F64);
                        Token {
                            span: Span::new(file, n, idx + 1),
                            tt: FLiteral{ value, type_hint}
                        }
                    } else {
                        idx -= 1;
                        let (type_hint, _is_invalid) = rth!(["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"], "integer", ILiteralTypeHint::None, "u8": ILiteralTypeHint::U8, "i8": ILiteralTypeHint::I8, "u16": ILiteralTypeHint::U16, "i16": ILiteralTypeHint::I16, "u32": ILiteralTypeHint::U32, "i32": ILiteralTypeHint::I32, "u64": ILiteralTypeHint::U64, "i64": ILiteralTypeHint::I64);

                        Token {
                            span: Span::new(file, n, idx + 1),
                            tt: ILiteral { value, kind: IntLiteralType::Decimal, type_hint }
                        }
                    }
                } else {
                    let (type_hint, _is_invalid) = rth!(["u8", "i8", "u16", "i16", "u32", "i32", "u64", "i64"], "integer", ILiteralTypeHint::None, "u8": ILiteralTypeHint::U8, "i8": ILiteralTypeHint::I8, "u16": ILiteralTypeHint::U16, "i16": ILiteralTypeHint::I16, "u32": ILiteralTypeHint::U32, "i32": ILiteralTypeHint::I32, "u64": ILiteralTypeHint::U64, "i64": ILiteralTypeHint::I64);
                    Token {
                        span: Span::new(file, n, idx + 1),
                        tt: ILiteral { value, kind: IntLiteralType::Decimal, type_hint }
                    }
                })
            },
            x if x == '_' || x.is_xid_start() => {
                let mut text = x.to_string();
                while peek!().is_some_and(|x| x.is_xid_continue()) {
                    idx += 1;
                    text.push(chars[idx]);
                };
                match &text[..] {
                    "let"      => keyword!(Let),
                    "if"       => keyword!(If),
                    "fn"       => keyword!(Fn),
                    "return"   => keyword!(Return),
                    "const"    => keyword!(Const),
                    "else"     => keyword!(Else),
                    "match"    => keyword!(Match),
                    "type"     => keyword!(Type),
                    "mut"      => keyword!(Mut),
                    "continue" => keyword!(Continue),
                    "break"    => keyword!(Break),
                    "loop"     => keyword!(Loop),
                    "while"    => keyword!(While),
                    "use"      => keyword!(Use),
                    "as"       => keyword!(As),
                    "true"     => bool!   (true),
                    "false"    => bool!   (false),
                    "show"     => keyword!(Show),
                    "panic"    => keyword!(Panic),
                    "module"   => keyword!(Module),
                    "include"  => keyword!(Include),
                    "enum"     => keyword!(Enum),
                    "struct"   => keyword!(Struct),
                    "compound" => keyword!(Compound),
                    _ => Some(Token {
                        span: Span::new(file, n, idx + 1),
                        tt: Ident(text),
                    }),
                }
            },
            '\'' => {
                let mut string_contents = String::new();
                loop {
                    if let Some(c) = peek!() {
                        idx += 1;
                        if c == '\'' {
                            break
                        };
                        if c == '\\' {
                            match peek!() {
                                Some('\\') => {
                                    idx += 1;
                                    string_contents.push('\\')
                                },
                                Some('0') => {
                                    idx += 1;
                                    string_contents.push('\0')
                                },
                                Some('n') => {
                                    idx += 1;
                                    string_contents.push('\n')
                                },
                                Some('r') => {
                                    idx += 1;
                                    string_contents.push('\r')
                                },
                                Some('t') => {
                                    idx += 1;
                                    string_contents.push('\t')
                                },
                                Some('\'') => {
                                    idx += 1;
                                    string_contents.push('\\')
                                },
                                Some('x') => {
                                    idx += 1;
                                    let mut value: u32 = 0;
                                    string_contents.push('block: {
                                        twice! {{
                                            let next = peek!();
                                            if let Some(c @ ('0'..='9' | 'a'..='f' | 'A'..='F')) = next {
                                                value *= 16;
                                                value += u32::from_str_radix(HEX_CHAR_TO_STR[c as usize], 16).expect("this SHOULD be ok");
                                            } else if let Some(c) = next {
                                                error_accumulator.push(make_error!(
                                                    format!("expected a hexadecimal digit, got {}", c),
                                                    codes::E0006.0,
                                                    Error,
                                                    None => Span::new(file, idx + 1, idx + 2)
                                                ));
                                                break 'block '\0'
                                            } else {
                                                error_accumulator.push(make_error!(
                                                    "expected an hexadecimal digit, got <EOF>",
                                                    codes::E0006.0,
                                                    FatalError,
                                                    None => Span::new(file, idx, idx + 1)
                                                ));
                                                early_exit!()
                                            }
                                            idx += 1;
                                        }};
                                        char::from_u32(value).unwrap_or_else(
                                            || {
                                                eprintln!("invalid escape sequence -- this should never happen with 2 characters long sequences");
                                                '\0'
                                            }
                                        )
                                    })
                                }
                                Some('u') => {
                                    idx += 1;
                                    string_contents.push('out: {
                                        if let Some('{') = peek!() {
                                            idx += 1;
                                            let mut value = 0;
                                            let value_start = idx;
                                            let mut iteration_count = 0;
                                            loop {
                                                let next = peek!();
                                                if let Some(c @ ('0'..='9' | 'a'..='f' | 'A'..='F')) = next {
                                                    value *= 16;
                                                    value += u32::from_str_radix(HEX_CHAR_TO_STR[c as usize], 16).expect("this SHOULD be ok");
                                                } else if let Some('}') = next {
                                                    break
                                                } else if let Some(c) = next {
                                                    error_accumulator.push(make_error!(
                                                        format!("invalid character in escape sequence: {}", c),
                                                        codes::E0008.0,
                                                        Error,
                                                        None => Span::new(file, idx + 1, idx + 2)
                                                    ))
                                                } else {
                                                    error_accumulator.push(make_error!(
                                                        "expected an hexadecimal digit, got <EOF>",
                                                        codes::E0008.0,
                                                        FatalError,
                                                        None => Span::new(file, idx, idx + 1)
                                                    ));
                                                    early_exit!()
                                                }
                                                idx += 1;
                                                iteration_count += 1;
                                            };
                                            if iteration_count == 0 {
                                                error_accumulator.push(make_error!(
                                                    "\\u Unicode escapes should contain at least 1 hexadecimal digit",
                                                    codes::E0008.0,
                                                    Warning,
                                                    None => Span::new(file, value_start, idx + 1)
                                                ));
                                            };
                                            if let Some(c) = char::from_u32(value) {
                                                c
                                            } else {
                                                error_accumulator.push(make_error!(
                                                    "invalid escape sequence",
                                                    codes::E0008.0,
                                                    Error,
                                                    None => Span::new(file, value_start, idx)
                                                ));
                                                '\0'
                                            }
                                        } else {
                                            if let Some(c) = peek!() {
                                                error_accumulator.push(make_error!(
                                                    format!("expected {{ after \\u, got {}", c),
                                                    codes::E0007.0,
                                                    Error,
                                                    None => Span::new(file, idx + 1, idx + 2)
                                                ))
                                            } else {
                                                error_accumulator.push(make_error!(
                                                    "expected { after \\u, got <EOF>",
                                                    codes::E0007.0,
                                                    FatalError,
                                                    None => Span::new(file, idx, idx + 1)
                                                ));
                                                early_exit!()
                                            }
                                            break 'out '\0'
                                        }
                                    });
                                    idx += 1
                                }
                                Some(any) => error_accumulator.push(make_error!(
                                    format!("unknown backslash escape: {}", any),
                                    codes::E0005.0,
                                    Error,
                                    None => Span::new(file, idx + 1, idx + 2)
                                )),
                                _ => {
                                    error_accumulator.push(make_error!(
                                        "expected a character after \\, got EOF",
                                        codes::E0005.0,
                                        FatalError,
                                        None => Span::new(file, idx, idx + 1),
                                        "unterminated string started here" => Span::new(file, n, n + 1)
                                    ));
                                    early_exit!()
                                }
                            };
                        } else {
                            string_contents.push(c);
                        }
                    } else {
                        error_accumulator.push(make_error!(
                            "expected a closing single quote, got <EOF>",
                            codes::E0004.0,
                            FatalError,
                            "opening quote was here" => Span::new(file, n, n + 1)
                        ));
                        early_exit!()
                    }
                };
                let idx_there = idx;
                let there_was_an_underscore = if let Some('_') = peek!() {
                    idx += 1;
                    true
                } else {
                    false
                };
                let (type_hint, is_invalid) = rth!(["char", "str"], "string-like", SLiteralTypeHint::None, "char": SLiteralTypeHint::Char, "str": SLiteralTypeHint::String);
                if type_hint == SLiteralTypeHint::None && !is_invalid && there_was_an_underscore {
                    error_accumulator.push(make_error!(
                        "unexpected identifier '_' after {string-like}",
                        codes::E0010.0,
                        Error,
                        None => Span::new(file, idx, idx + 1)
                    ));
                    idx = idx_there;
                };
                Some(Token { span: Span::new(file, n, idx + 1), tt: SLiteral{ value: string_contents, type_hint } })
            },
            any => {
                error_accumulator.push(make_error!(
                    if any == '"' {
                        format!("unrecognized character: {} {}",
                        next,
                        "(note: use single quotes for string or char literals)")
                    } else {
                        format!("unrecognized character: {}", next)
                    },
                    codes::E0001.0,
                    Error,
                    None => Span::new(file, idx, idx + 1)
                ));
                None
            }
        } {
            tokens.push(token);
        }
        idx += 1
    }
    if error_accumulator.is_empty() {
        (tokens, Ok(()))
    } else {
        (tokens, Err(error_accumulator))
    }
}
