use unicode_xid::UnicodeXID;

use crate::{
    errors::{diagnostics, make_error, Error},
    loader::Span,
    tokens::{Token, TokenType},
};

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
                        error_accumulator.push(make_error!(diagnostics::E0002.0, true, "unmatched /*", Span::new(file, starts[starts.len() - 1], starts[starts.len() - 1] + 2 )));
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
                    if let Some('=') = peek!() {
                        idx += 2;
                        Some(Token {
                            span: Span::new(file, n, idx + 1),
                            tt: ExpEq,
                        })
                    } else {
                        two_char_token!(Exp)
                    }
                } else {
                    simple_token!(Star)
                }
            },
            x if x == '_' || x.is_xid_start() => {
                let mut text = x.to_string();
                while peek!().is_some_and(|x| x.is_xid_continue()) {
                    idx += 1;
                    text.push(chars[idx]);
                };
                match &text[..] {
                    "let" => keyword!(Let),
                    "if" => keyword!(If),
                    "fn" => keyword!(Fn),
                    "return" => keyword!(Return),
                    "const" => keyword!(Const),
                    "else" => keyword!(Else),
                    "match" => keyword!(Match),
                    "type" => keyword!(Type),
                    "mut" => keyword!(Mut),
                    "continue" => keyword!(Continue),
                    "break" => keyword!(Break),
                    "loop" => keyword!(Loop),
                    "while" => keyword!(While),
                    "use" => keyword!(Use),
                    "as" => keyword!(As),
                    "true" => bool!(true),
                    "false" => bool!(false),
                    _ => Some(Token {
                        span: Span::new(file, n, idx + 1),
                        tt: Ident(text),
                    }),
                }
            },
            _ => {
                error_accumulator.push(make_error!(
                    diagnostics::E0001.0,
                    false,
                    format!("unrecognized character: {}", next),
                    Span::new(file, idx, idx + 1)
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
