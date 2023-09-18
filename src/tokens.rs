use crate::loader::Span;

#[derive(Debug, Clone, Copy)]
pub enum IntLiteralType {
    Hexadecimal,
    Decimal,
    Octal,
    Binary,
}

#[derive(Debug, Clone)]
pub enum TokenType {
    ILiteral { value: String, kind: IntLiteralType },
    FLiteral(String),
    SLiteral(String),
    Let,
    Eq,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Lt,
    Gt,
    Leq,
    Geq,
    EqEq,
    LCBrace,
    RCBrace,
    Ident(String),
    If,
    Neq,
    Minus,
    Plus,
    Star,
    Slash,
    Ret,
    Return,
    Exp,
    Semicolon,
    Dot,
    Not,
    Colon,
    Fn,
    Else,
    Match,
    Type,
    Const,
    Continue,
    Break,
    MinusEq,
    PlusEq,
    StarEq,
    SlashEq,
    ExpEq,
    BLiteral(bool),
    Comma,
    Loop,
    While,
    Use,
    As,
    Mut,
}

#[derive(Debug, Clone)]
pub struct Token {
    pub span: Span,
    pub tt: TokenType,
}
