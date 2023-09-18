use crate::loader::Span;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum IntLiteralType {
    Hexadecimal,
    Decimal,
    Octal,
    Binary,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SLiteralTypeHint {
    None,
    Char,
    String,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ILiteralTypeHint {
    None,
    U8,
    I8,
    U16,
    I16,
    U32,
    I32,
    U64,
    I64,
    // U128,
    // I128, (not for now)
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FLiteralTypeHint {
    None,
    F32,
    F64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    ILiteral {
        value: String,
        kind: IntLiteralType,
        type_hint: ILiteralTypeHint,
    },
    FLiteral {
        value: String,
        type_hint: FLiteralTypeHint,
    },
    SLiteral {
        value: String,
        type_hint: SLiteralTypeHint,
    },
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
