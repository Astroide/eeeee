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

        macro_rules! keyword {
            ($type:expr) => {
                Some(Token {
                    span: Span::new(file, n, idx + 1),
                    tt: $type,
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
