use crate::tokens::Token;

pub const SEMICOLON: u8 = 1;
pub const BREAK: u8 = 5;
pub const LOGICAL: u8 = 10;
pub const EQ: u8 = 15;
pub const ADD_SUB: u8 = 20;
pub const MUL_DIV_EXP: u8 = 30;
pub const UNARY: u8 = 40;
pub const CALL: u8 = 50;
pub const LITERAL: u8 = 100;

pub fn get_precedence(t: &Option<&Token>) -> u8 {
    0
}
