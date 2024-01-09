use crate::{
    loader::Span,
    tokens::{TokenType, IntLiteralType}, ice::ice,
    typing::TypeId,
};

#[derive(Debug)]
pub struct Expression {
    pub et: Expr,
    pub span: Span,
    pub ty: TypeId,
}

type Scope = ();

type AnyExpr = Box<Expression>;

#[derive(Debug)]
pub struct EnumVariant {
    name: String,
    payload: EnumPayload
}

#[derive(Debug)]
pub enum EnumPayload {
    Tuple(Vec<Type>),
    Struct(Vec<(String, Type)>),
}

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
    Module(Option<AnyExpr>, String),
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
    },
    Fn {
        name: String,
        body: AnyExpr,
        args: Vec<String>,
    },
    Let {
        name : String,
        value: Option<AnyExpr>,
    },
    While {
        condition: AnyExpr,
        body     : AnyExpr,
    },
    EnumDecl {
        name    : String,
        variants: Vec<EnumVariant>,
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
    Show,
    Panic,
}

pub fn is_scope_barrier(expr: &Expression) -> bool {
    matches!(expr.et, Expr::Block(_) | Expr::Module(_, _) | Expr::Loop { .. } | Expr::Fn { .. })
}

pub fn get_scope(expr: &Expression) -> Scope {
    match expr.et {
        
    }
}

pub fn show_tree(expr: &Expression) {
    show_tree_impl(expr, 0)
}

fn show_tree_impl(expr: &Expression, depth: usize) {
    macro_rules! bracket_color {
        () => {
            match depth % 3 {
                0 => "\x1B[34m",
                1 => "\x1B[35m",
                2 => "\x1B[36m",
                _ => ice!("unreachable: 0 <= n % 3 < 3"),
            }
        };
    }
    eprint!("{}", " ".repeat(depth * 2));
    match &expr.et {
        Expr::Continue => eprintln!("(continue)"),
        Expr::Unary { op, right } => {
            eprintln!("{}(\x1B[0m{}", bracket_color!(), match op {
                UnaryOp::Not   => "!",
                UnaryOp::Neg   => "-",
                UnaryOp::Show  => "show",
                UnaryOp::Panic => "panic",
            });
            show_tree_impl(right, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        }
        Expr::Use { imports } => {
            eprintln!("{}(\x1B[32muse\x1B[0m", bracket_color!());
            for import in imports.iter() {
                eprintln!("{}{}", " ".repeat(depth * 2 + 2), import)
            }
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        }
        Expr::Block(inside) => {
            eprint!("{}{{\x1B[0m", bracket_color!());
            match inside {
                None => eprintln!("{}}}\x1B[0m", bracket_color!()),
                Some(stuff) => {
                    eprintln!();
                    show_tree_impl(stuff, depth + 1);
                    eprintln!("{}{}}}\x1B[0m", " ".repeat(depth * 2), bracket_color!());
                }
            }
        }
        Expr::EnumDecl { name, variants } => {
            eprint!("{}enum {} {{\x1B[0m", bracket_color!(), name);
            if variants.len() == 0 {
                eprintln!("{}}}\x1B[0m", bracket_color!());
            } else {
                eprintln!();
                for variant in variants {
                    eprintln!("{}{} {}", " ".repeat(depth * 2 + 2), variant.name, match &variant.payload {
                        EnumPayload::Tuple(types) => format!("({})", types.iter().map(|x| stringify_type(*x)).collect::<Vec<_>>().join(", ")),
                        EnumPayload::Struct(fields) => format!("{{{}}}", fields.iter().map(|(name, r#type)| format!("{}: {}", name, stringify_type(*r#type))).collect::<Vec<_>>().join(", ")),
                    })
                }
                eprintln!("{}{}}}\x1B[0m", " ".repeat(depth * 2), bracket_color!());
            }
        }
        Expr::Module(inside, name) => {
            eprint!("{}mod {} {{\x1B[0m", bracket_color!(), name);
            match inside {
                None => eprintln!("{}}}\x1B[0m", bracket_color!()),
                Some(stuff) => {
                    eprintln!();
                    show_tree_impl(stuff, depth + 1);
                    eprintln!("{}{}}}\x1B[0m", " ".repeat(depth * 2), bracket_color!());
                }
            }
        }
        Expr::Literal { src } => {
            eprint!("\x1B[37m");
            match src {
                TokenType::BLiteral(v) => if *v { eprintln!("<\x1B[33mtrue\x1B[37m>") } else { eprintln!("<\x1B[33mfalse\x1B[37m>") },
                TokenType::FLiteral { value, .. } => eprintln!("<\x1B[33m(f) {value}\x1B[37m>"),
                TokenType::SLiteral { value, .. } => eprintln!("<\x1B[33m\"{}\"\x1B[37m>", value),
                TokenType::ILiteral { value, kind, .. } => {
                    match kind {
                        IntLiteralType::Hexadecimal => eprintln!("<\x1B[33m0x{}\x1B[37m>", value),
                        IntLiteralType::Decimal     => eprintln!("<\x1B[33m{value}\x1B[37m>"),
                        IntLiteralType::Octal       => eprintln!("<\x1B[33m0o{}\x1B[37m>", value),
                        IntLiteralType::Binary      => eprintln!("<\x1B[33m0b{}\x1B[37m>", value),
                    }
                },
                _ => ice!("unreachable; only [IFSB]Literal should be reachable here")
            };
            eprint!("\x1B[0m");
        },
        Expr::Binary { op, left, right } => {
            eprintln!("{}(\x1B[0m{}", bracket_color!(), match op {
                BinaryOp::Add => "+",
                BinaryOp::Sub => "-",
                BinaryOp::Mul => "*",
                BinaryOp::Div => "/",
                BinaryOp::Exp => "**",
                BinaryOp::Eq  => "==",
                BinaryOp::Lt  => "<",
                BinaryOp::Gt  => ">",
                BinaryOp::Leq => "<=",
                BinaryOp::Geq => ">=",
                BinaryOp::Neq => "!="
            });
            show_tree_impl(left, depth + 1);
            show_tree_impl(right, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Semicolon { left, right } => {
            eprintln!("{}(\x1B[0m;", bracket_color!());
            show_tree_impl(left, depth + 1);
            show_tree_impl(right, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Call { callee, args } => {
            eprintln!("{}(\x1B[32mcall\x1B[0m", bracket_color!());
            show_tree_impl(callee, depth + 1);
            eprintln!("{} \x1B[32mwith\x1B[0m", " ".repeat(depth * 2));
            for arg in args {
                show_tree_impl(arg, depth + 1);
            }
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Property { object, name } => {
            eprintln!("{}(\x1B[32mread\x1B[0m {} \x1B[32mof\x1B[0m", bracket_color!(), name);
            show_tree_impl(object, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Break { with } => {
            if let Some(thing) = with {
                eprintln!("{}(\x1B[32mbreak\x1B[0m", bracket_color!());
                show_tree_impl(thing, depth + 1);
                eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
            } else {
                eprintln!("{0}(\x1B[32mbreak{0})\x1B[0m", bracket_color!())
            }
        },
        Expr::Loop { inside } => {
            eprintln!("{}(\x1B[32mloop\x1B[0m", bracket_color!());
            show_tree_impl(inside, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::If { condition, then, else_ } => {
            eprintln!("{}(\x1B[32mif\x1B[0m", bracket_color!());
            show_tree_impl(condition, depth + 1);
            eprintln!("{}\x1B[32mthen\x1B[0m", " ".repeat(depth * 2));
            show_tree_impl(then, depth + 1);
            if let Some(thing) = else_ {
                eprintln!("{}\x1B[32melse\x1B[0m", " ".repeat(depth * 2));
                show_tree_impl(thing, depth + 1);
            }
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Assign { left, right } => {
            eprintln!("{}(\x1B[0mset", bracket_color!());
            show_tree_impl(left, depth + 1);
            show_tree_impl(right, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::AssignOp { left, right, op } => {
            eprintln!("{}(\x1B[0m{}", bracket_color!(), match op {
                BinaryOp::Add => "+=",
                BinaryOp::Sub => "-=",
                BinaryOp::Mul => "*=",
                BinaryOp::Div => "/=",
                BinaryOp::Exp => "**=",
                BinaryOp::Eq  => ice!("unreachable: this should be Expr::Assign"),
                BinaryOp::Lt  => ice!("unreachable: this should be Expr::Binary"),
                BinaryOp::Gt  => ice!("unreachable: this should be Expr::Binary"),
                BinaryOp::Leq => ice!("unreachable: this should be Expr::Binary"),
                BinaryOp::Geq => ice!("unreachable: this should be Expr::Binary"),
                BinaryOp::Neq => ice!("unreachable: this should be Expr::Binary")
            });
            show_tree_impl(left, depth + 1);
            show_tree_impl(right, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Identifier { id } => {
            eprintln!("\x1B[31m#{}\x1B[0m", id);
        },
        Expr::Fn { name, body, args } => {
            eprintln!("{}(\x1B[32mfn \x1B[31m#{}\x1B[0m [{}]", bracket_color!(), name, args.join(", "));
            show_tree_impl(body, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
        Expr::Let { name, value } => {
            eprint!("{}(\x1B[32mlet \x1B[31m#{}\x1B[0m", bracket_color!(), name);
            if let Some(x) = value {
                eprintln!();
                show_tree_impl(x, depth + 1);
                eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
            } else {
                eprintln!("{})\x1B[0m", bracket_color!());
            }
        },
        Expr::While { condition, body } => {
            eprintln!("{}(\x1B[32mwhile\x1B[0m", bracket_color!());
            show_tree_impl(condition, depth + 1);
            show_tree_impl(body, depth + 1);
            eprintln!("{}{})\x1B[0m", " ".repeat(depth * 2), bracket_color!());
        },
    }
}