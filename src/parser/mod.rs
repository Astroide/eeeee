mod precedence;

use crate::{
    errors::{codes, make_error, Error, Severity},
    expressions::{self, Expression},
    ice::ice,
    loader::Span,
    tokens::{Token, TokenType},
};

pub fn parse(input: &[Token], file: usize) -> Result<Box<Expression>, Vec<Error>> {
    let mut errors: Vec<Error> = vec![];
    let mut pointer = 0usize;
    match parse_impl(input, 0, &mut pointer, &mut errors, file) {
        Err(_) => Err(errors),
        Ok(val) => Ok(val),
    }
}

fn parse_impl(
    input: &[Token],
    level: u8,
    pointer: &mut usize,
    accumulator: &mut Vec<Error>,
    file: usize,
) -> Result<Box<Expression>, ()> {
    macro_rules! peek {
        () => {
            if *pointer < input.len() {
                Some(&input[*pointer])
            } else {
                None
            }
        };
    }

    macro_rules! exit_with {
        ($error: expr) => {{
            accumulator.push($error);
            return Err(());
        }};
    }

    macro_rules! infix_precedence {
        () => {
            precedence::get_precedence(&peek!())
        };
    }

    macro_rules! next {
        () => {{
            *pointer += 1;
            if *pointer > input.len() {
                None
            } else {
                // eprintln!("next => {:?}", input[*pointer - 1]);
                Some(&input[*pointer - 1])
            }
        }};
    }

    macro_rules! expect {
        ($x:pat, $fatal:literal, $extra:literal) => {
            {
                let token = next!();
                if !matches!(token, Some(Token { tt: $x, .. })) {
                    if matches!(token, None) {
                        exit_with!(make_error!(
                            format!("expected {}{}, got EOF", stringify!($x), $extra),
                            codes::E0012.0,
                            Severity::FatalError,
                            None => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end }
                        ))
                    } else if let Some(token) = token {
                        if $fatal {
                            exit_with!(make_error!(
                            format!("expected {}{}, got {}", stringify!($x), $extra, token.tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::FatalError,
                            None => token.span
                        ))
                    } else {
                        accumulator.push(make_error!(
                            format!("expected {}{}, got {}", stringify!($x), $extra, token.tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::Error,
                            None => token.span
                        ))
                    }
                    } else { ice!("fell through") }
                }
            }
        };
    }

    let token = if let Some(t) = next!() {
        t
    } else {
        exit_with!(make_error!(
            "expected an expression, got EOF",
            codes::E0011.0,
            Severity::FatalError,
            None => Span::new(file, 0, 0)
        ))
    };

    macro_rules! has_expression {
        () => {
            match peek!() {
                Some(Token { tt: 
                TokenType::SLiteral { .. }
              | TokenType::ILiteral { .. }
              | TokenType::FLiteral { .. }
              | TokenType::BLiteral { .. }
              | TokenType::Break
              | TokenType::LParen
              | TokenType::LCBrace
              | TokenType::Not
              | TokenType::Minus
              | TokenType::If
              | TokenType::Fn
              | TokenType::Loop
              | TokenType::While
              | TokenType::Let
              | TokenType::Show
              | TokenType::Ident { .. }, .. }) => true,
              _ => false,
            }
        }
    }

    let mut lhs: Box<Expression>;
    match &token.tt {
        tt @ TokenType::SLiteral { .. } => {
            lhs = Box::new(Expression {
                et: expressions::Expr::Literal { src: tt.clone() },
                span: token.span,
            });
        }
        tt @ TokenType::ILiteral { .. } => {
            lhs = Box::new(Expression {
                et: expressions::Expr::Literal { src: tt.clone() },
                span: token.span,
            });
        }
        tt @ TokenType::FLiteral { .. } => {
            lhs = Box::new(Expression {
                et: expressions::Expr::Literal { src: tt.clone() },
                span: token.span,
            });
        }
        tt @ TokenType::BLiteral { .. } => {
            lhs = Box::new(Expression {
                et: expressions::Expr::Literal { src: tt.clone() },
                span: token.span,
            });
        }
        TokenType::Fn => {
            let fn_name = if let Some(token) = next!() {
                if let TokenType::Ident(ref name) = token.tt {
                    name.clone()
                } else {
                    exit_with!(make_error!(
                        "expected a function name",
                        codes::E0013.0,
                        Severity::FatalError,
                        None => token.span
                    ))
                }
            } else {
                exit_with!(make_error!(
                    "expected a function name, got EOF",
                    codes::E0013.0,
                    Severity::FatalError,
                    None => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end }
                ))
            };
            expect!(TokenType::LParen, true, " after function name");
            let mut arguments: Vec<String> = vec![];
            loop {
                if let Some(Token { tt: TokenType::Ident(v), .. }) = peek!() {
                    next!();
                    arguments.push(v.clone());
                } else {
                    break
                }
                if let Some(Token { tt: TokenType::Comma, .. }) = peek!() {
                    next!();
                } else {
                    break
                }
            }
            expect!(TokenType::RParen, true, " after function argument list");
            expect!(TokenType::LCBrace, true, " after function arguments");
            *pointer -= 1;
            let block = parse_impl(input, precedence::ONE, pointer, accumulator, file)?;
            let block_span = block.span;
            lhs = Box::new(Expression {
                et: expressions::Expr::Fn { name: fn_name, body: block, args: arguments },
                span: token.span.merge(block_span)
            });
        }
        TokenType::Let => {
            let name_span;
            let name = if let Some(token) = next!() {
                if let TokenType::Ident(ref name) = token.tt {
                    name_span = token.span;
                    name.clone()
                } else {
                    exit_with!(make_error!(
                        "expected a name",
                        codes::E0012.0,
                        Severity::FatalError,
                        None => token.span
                    ))
                }
            } else {
                exit_with!(make_error!(
                    "expected a name, got EOF",
                    codes::E0012.0,
                    Severity::FatalError,
                    None => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end }
                ))
            };
            let mut span: Option<Span> = None;
            let value = if let Some(Token { tt: TokenType::Eq, .. }) = peek!() {
                next!();
                let value = parse_impl(input, precedence::ASSIGN, pointer, accumulator, file)?;
                span = Some(value.span);
                Some(value)
            } else {
                None
            };
            lhs = Box::new(Expression {
                et: expressions::Expr::Let { name, value },
                span: if let Some(s) = span { token.span.merge(s) } else { token.span.merge(name_span) }
            })
        }
        TokenType::Ident(ident) => {
            lhs = Box::new(Expression {
                et: expressions::Expr::Identifier { id: ident.clone() },
                span: token.span,
            })
        }
        TokenType::Not => {
            let right = parse_impl(input, precedence::UNARY, pointer, accumulator, file)?;
            let right_span = right.span;
            lhs = Box::new(Expression {
                et: expressions::Expr::Unary {
                    op: expressions::UnaryOp::Not,
                    right,
                },
                span: token.span.merge(right_span),
            })
        }
        TokenType::Show => {
            let right = parse_impl(input, precedence::SEMICOLON + 1, pointer, accumulator, file)?;
            let right_span = right.span;
            lhs = Box::new(Expression {
                et: expressions::Expr::Unary {
                    op: expressions::UnaryOp::Show,
                    right,
                },
                span: token.span.merge(right_span),
            })
        }
        TokenType::Minus => {
            let right = parse_impl(input, precedence::UNARY, pointer, accumulator, file)?;
            let right_span = right.span;
            lhs = Box::new(Expression {
                et: expressions::Expr::Unary {
                    op: expressions::UnaryOp::Neg,
                    right,
                },
                span: token.span.merge(right_span),
            })
        }
        TokenType::Break => {
            let mut maybe_right: Option<Box<Expression>> = None;
            let mut span = token.span;
            if has_expression!() {
                let expr = parse_impl(input, precedence::BREAK, pointer, accumulator, file)?;
                span = span.merge(expr.span);
                maybe_right = Some(expr);
            }
            lhs = Box::new(Expression { et: expressions::Expr::Break { with: maybe_right }, span })
        }
        TokenType::Continue => {
            lhs = Box::new(Expression { et: expressions::Expr::Continue, span: token.span })
        }
        TokenType::Loop => {
            expect!(TokenType::LCBrace, true, " after 'loop'");
            *pointer -= 1;
            let inside = parse_impl(input, precedence::ONE, pointer, accumulator, file)?;
            let inside_span = inside.span;
            lhs = Box::new(Expression { et: expressions::Expr::Loop { inside }, span: token.span.merge(inside_span) })
        }
        TokenType::LParen => {
            lhs = parse_impl(input, 0, pointer, accumulator, file)?;
            let maybe_token = next!();
            if let Some(Token { span, tt }) = maybe_token {
                if !matches!(tt, TokenType::RParen) {
                    exit_with!(
                        make_error!(
                            format!("expected a closing parenthesis, got {}", tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::FatalError,
                            "expected ) here" => *span
                        ).push("opening parenthesis was here".to_string(), token.span)
                    );
                }
            } else {
                exit_with!(make_error!(
                    "expected a closing parenthesis, got EOF",
                    codes::E0012.0,
                    Severity::FatalError,
                    "expected ) here" => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end },
                    "opening parenthesis was here" => token.span
                ))
            }
        }
        TokenType::If => {
            let condition = parse_impl(input, 0, pointer, accumulator, file)?;
            expect!(TokenType::LCBrace, true, " after if condition");
            *pointer -= 1;
            let then = parse_impl(input, precedence::ONE, pointer, accumulator, file)?;
            let then_span = then.span;
            let mut else_: Option<Box<Expression>> = None;
            if matches!(peek!(), Some(Token { tt: TokenType::Else, .. })) {
                next!();
                if matches!(peek!(), Some(Token { tt: TokenType::If, .. })) {
                    // eprintln!("else if");
                    else_ = Some(parse_impl(input, precedence::ONE, pointer, accumulator, file)?);
                    // eprintln!("{:#?}", else_);
                } else {
                    expect!(TokenType::LCBrace, true, " or 'if' after 'else'");
                    *pointer -= 1;
                    else_ = Some(parse_impl(input, precedence::ONE, pointer, accumulator, file)?);
                }
                // *pointer -= 1;
            }
            lhs = Box::new(Expression { et: expressions::Expr::If { condition, then, else_ }, span: token.span.merge(then_span) })
        }
        TokenType::While => {
            let condition = parse_impl(input, 0, pointer, accumulator, file)?;
            expect!(TokenType::LCBrace, true, " after while condition");
            *pointer -= 1;
            let body = parse_impl(input, precedence::ONE, pointer, accumulator, file)?;
            let body_span = body.span;
            lhs = Box::new(Expression { et: expressions::Expr::While { condition, body }, span: token.span.merge(body_span) })
        }
        TokenType::LCBrace => {
            let inside = if has_expression!() { Some(parse_impl(input, 0, pointer, accumulator, file)?) } else { None };
            let maybe_token = next!();
            if let Some(Token { span, tt }) = maybe_token {
                if !matches!(tt, TokenType::RCBrace) {
                    exit_with!(
                        make_error!(
                            format!("expected a closing '}}', got {}", tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::FatalError,
                            "expected } here" => *span
                        ).push("opening '{' was here".to_string(), token.span)
                    );
                } else {
                    lhs = Box::new(Expression {
                        et: expressions::Expr::Block(inside),
                        span: *span,
                    });
                }
            } else {
                exit_with!(make_error!(
                    "expected a closing parenthesis, got EOF",
                    codes::E0012.0,
                    Severity::FatalError,
                    "expected } here" => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end },
                    "opening '{' was here" => token.span
                ))
            }
        }
        _ => exit_with!(make_error!(
            format!("expected an expression, got {}", token.tt.name_for_errors()),
            codes::E0011.0,
            Severity::FatalError,
            None => token.span
        )),
    };

    while (level == precedence::ASSIGN && level <= infix_precedence!()) || level < infix_precedence!() {
        macro_rules! infix {
            ($token:expr, $op:expr) => {{
                let rhs = parse_impl(
                    input,
                    precedence::get_precedence(&Some(&$token)),
                    pointer,
                    accumulator,
                    file,
                )?;
                lhs = Box::new(Expression {
                    span: lhs.span.merge(rhs.span),
                    et: expressions::Expr::Binary {
                        op: $op,
                        left: lhs,
                        right: rhs,
                    },
                })
            }};
        }

        macro_rules! infix_assign {
            ($op:expr) => {{
                let rhs = parse_impl(
                    input,
                    precedence::ASSIGN,
                    pointer,
                    accumulator,
                    file,
                )?;
                lhs = Box::new(Expression {
                    span: lhs.span.merge(rhs.span),
                    et: expressions::Expr::AssignOp {
                        left: lhs,
                        right: rhs,
                        op: $op
                    },
                })
            }}
        }
        let token = if let Some(t) = next!() {
            t
        } else {
            ice!("expected infix/postfix, got EOF; infix_precedence should prevent this from happening...")
        };
        use expressions::BinaryOp;
        match &token.tt {
            TokenType::Plus    => infix!(token, BinaryOp::Add),
            TokenType::Minus   => infix!(token, BinaryOp::Sub),
            TokenType::Star    => infix!(token, BinaryOp::Mul),
            TokenType::Slash   => infix!(token, BinaryOp::Div),
            TokenType::Exp     => infix!(token, BinaryOp::Exp),
            TokenType::Lt      => infix!(token, BinaryOp::Lt ),
            TokenType::Leq     => infix!(token, BinaryOp::Leq),
            TokenType::EqEq    => infix!(token, BinaryOp::Eq ),
            TokenType::Geq     => infix!(token, BinaryOp::Geq),
            TokenType::Gt      => infix!(token, BinaryOp::Gt ),
            TokenType::Neq     => infix!(token, BinaryOp::Neq),
            TokenType::StarEq  => infix_assign!(BinaryOp::Mul),
            TokenType::SlashEq => infix_assign!(BinaryOp::Div),
            TokenType::ExpEq   => infix_assign!(BinaryOp::Exp),
            TokenType::PlusEq  => infix_assign!(BinaryOp::Add),
            TokenType::MinusEq => infix_assign!(BinaryOp::Sub),
            TokenType::LParen  => {
                let mut arguments: Vec<Box<Expression>> = vec![];
                loop {
                    if has_expression!() {
                        arguments.push(parse_impl(input, 0, pointer, accumulator, file)?);
                    } else {
                        break
                    }
                    if let Some(Token { tt: TokenType::Comma, .. }) = peek!() {
                        next!();
                    } else {
                        break
                    }
                };
                expect!(TokenType::RParen, true, " after arguments");
                lhs = Box::new(Expression {
                    et: expressions::Expr::Call { callee: lhs, args: arguments },
                    span: token.span.merge(input[*pointer - 2].span)
                })
            },
            TokenType::Eq      => {
                let rhs = parse_impl(
                    input,
                    precedence::ASSIGN,
                    pointer,
                    accumulator,
                    file,
                )?;
                lhs = Box::new(Expression {
                    span: lhs.span.merge(rhs.span),
                    et: expressions::Expr::Assign {
                        left: lhs,
                        right: rhs,
                    },
                })
            }
            TokenType::Semicolon => {
                let rhs = parse_impl(
                    input,
                    precedence::SEMICOLON,
                    pointer,
                    accumulator,
                    file,
                )?;
                lhs = Box::new(Expression {
                    span: lhs.span.merge(rhs.span),
                    et: expressions::Expr::Semicolon {
                        left: lhs,
                        right: rhs,
                    },
                })
            }
            _ => {
                ice!(
                    "normally, infix_precedence! should prevent this from happening. token: {:?}",
                    token
                )
            }
        }
    }
    if accumulator.is_empty() {
        Ok(lhs)
    } else {
        Err(())
    }
}
