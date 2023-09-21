use crate::{
    loader::Span,
    tokens::{SLiteralTypeHint, TokenType},
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
    Block(AnyExpr),
    Call {
        callee: AnyExpr,
        args: Vec<AnyExpr>, /* Vec of Box doesn't sound like a good idea */
    },
    ReadProperty {
        object: AnyExpr,
        name: String,
    },
    Use {
        imports: Vec<String>,
    },
}

#[derive(Debug)]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    Div,
    Exp,
}

#[derive(Debug)]
pub enum UnaryOp {
    Not,
    Neg,
}
