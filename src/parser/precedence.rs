use crate::tokens::{Token, TokenType};

pub const SEMICOLON: u8 = 1;
pub const BREAK: u8 = 5;
pub const ASSIGN: u8 = 6;
pub const LOGICAL: u8 = 10;
// pub const EQ: u8 = 15;
pub const ADD_SUB: u8 = 20;
pub const MUL_DIV_EXP: u8 = 30;
pub const UNARY: u8 = 40;
pub const CALL: u8 = 50;
pub const DOT: u8 = 60;
pub const ONE: u8 = 255;

macro_rules! prec {
    ($token:ident, $($in:pat = $out:expr)*) => {
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
        TokenType::Neq       = LOGICAL
        TokenType::EqEq      = LOGICAL
        TokenType::Leq       = LOGICAL
        TokenType::Geq       = LOGICAL
        TokenType::Lt        = LOGICAL
        TokenType::Gt        = LOGICAL
        TokenType::Plus      = ADD_SUB
        TokenType::Minus     = ADD_SUB
        TokenType::Star      = MUL_DIV_EXP
        TokenType::Slash     = MUL_DIV_EXP
        TokenType::Exp       = MUL_DIV_EXP
        TokenType::Semicolon = SEMICOLON
        TokenType::Eq        = ASSIGN
        TokenType::PlusEq    = ASSIGN
        TokenType::MinusEq   = ASSIGN
        TokenType::SlashEq   = ASSIGN
        TokenType::StarEq    = ASSIGN
        TokenType::ExpEq     = ASSIGN
        TokenType::LParen    = CALL
        TokenType::Dot       = DOT
    )
}
