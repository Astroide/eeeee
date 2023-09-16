use crate::{
    errors::{diagnostics, make_error, Error},
    loader::Span,
    tokens::{Token, TokenType},
};

macro_rules! simple_token {
    ($type:expr,$other_stuff:expr) => {
        Some(Token {
            span: Span::new($other_stuff.0, $other_stuff.1, $other_stuff.1 + 1),
            tt: $type,
        })
    };
}

#[rustfmt::skip]
pub fn lex(input: &crate::loader::Source) -> (Vec<Token>, Result<(), Vec<Error>>) {
    let mut chars = input.string().chars().clone().peekable();
    let file = input.index;
    let mut idx = 0;
    let mut error_accumulator: Vec<Error> = vec![];
    let mut tokens: Vec<Token> = vec![];
    for next in chars {
        use TokenType::*;
        if let Some(token) = match next {
            ' ' | '\n' | '\t' | '\r' => None,
            '(' => simple_token!(LParen,    (file, idx)),
            ')' => simple_token!(RParen,    (file, idx)),
            '[' => simple_token!(LBracket,  (file, idx)),
            ']' => simple_token!(RBracket,  (file, idx)),
            '{' => simple_token!(LCBrace,   (file, idx)),
            '}' => simple_token!(RCBrace,   (file, idx)),
            ';' => simple_token!(Semicolon, (file, idx)),
            '.' => simple_token!(Dot,       (file, idx)),
            ':' => simple_token!(Colon,     (file, idx)),
            ',' => simple_token!(Comma,     (file, idx)),
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
