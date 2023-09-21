use crate::tokens::{Token, TokenType};

pub const SEMICOLON: u8 = 1;
pub const BREAK_ASSIGN: u8 = 5;
pub const LOGICAL: u8 = 10;
pub const EQ: u8 = 15;
pub const ADD_SUB: u8 = 20;
pub const MUL_DIV_EXP: u8 = 30;
pub const UNARY: u8 = 40;
pub const CALL: u8 = 50;
pub const LITERAL: u8 = 100;

macro_rules! prec {
    ($token:ident, $($in:pat = $out:expr),*) => {
        match $token {
            $(
                Some(Token { tt: $in, .. }) => $out,
            )*
            _ => 0,
        }
    }
}

pub fn get_precedence(t: &Option<&Token>) -> u8 {
    prec!(t,
        TokenType::Neq       = LOGICAL,
        TokenType::EqEq      = LOGICAL,
        TokenType::Leq       = LOGICAL,
        TokenType::Geq       = LOGICAL,
        TokenType::Lt        = LOGICAL,
        TokenType::Gt        = LOGICAL,
        TokenType::Plus      = ADD_SUB,
        TokenType::Minus     = ADD_SUB,
        TokenType::Star      = MUL_DIV_EXP,
        TokenType::Slash     = MUL_DIV_EXP,
        TokenType::Exp       = MUL_DIV_EXP,
        TokenType::Semicolon = SEMICOLON
    )
}
