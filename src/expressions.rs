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
        inside: AnyExpr,
    },
    If {
        condition: AnyExpr,
        then     : AnyExpr,
        else_    : Option<AnyExpr>,
    },
    Assign {
        left : AnyExpr,
        right: AnyExpr
    },
    AssignOp {
        left : AnyExpr,
        right: AnyExpr,
        op   : BinaryOp,
    },
    Identifier {
        id: String,
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
