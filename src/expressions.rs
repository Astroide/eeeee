use crate::{
    loader::Span,
    tokens::TokenType,
};

#[derive(Debug)]
pub struct Expression {
    pub et: Expr,
    pub span: Span,
}

type AnyExpr = Box<Expression>;

#[derive(Debug)]
pub enum Expr {
    Literal {
        src: TokenType,
    },
    Unary {
        op: UnaryOp,
        right: AnyExpr,
    },
    Binary {
        op: BinaryOp,
        left: AnyExpr,
        right: AnyExpr,
    },
    Semicolon {
        left: AnyExpr,
        right: AnyExpr,
    },
    Block(Option<AnyExpr>),
    Call {
        callee: AnyExpr,
        args: Vec<AnyExpr>, /* Vec of Box doesn't sound like a good idea */
    },
    Property {
        object: AnyExpr,
        name: String,
    },
    Break {
        with: Option<AnyExpr>,
    },
    Continue,
    Use {
        imports: Vec<String>,
    },
    Loop {
        inside: Box<Expression>,
    },
    If {
        condition: Box<Expression>,
        then: Box<Expression>,
        else_: Option<Box<Expression>>,
    }
}

#[derive(Debug)]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
    Exp,
    Eq,
    Lt,
    Gt,
    Leq,
    Geq,
    Neq,
}

#[derive(Debug)]
pub enum UnaryOp {
    Not,
    Neg,
}
