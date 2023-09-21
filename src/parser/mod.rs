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
            *pointer = *pointer + 1;
            if *pointer >= input.len() + 1 {
                None
            } else {
                eprintln!("next => {:?}", input[*pointer - 1]);
                Some(&input[*pointer - 1])
            }
        }};
    }

    macro_rules! expect {
        ($x:pat, $fatal:literal) => {
            {
                let token = next!();
                if !matches!(token, Some(Token { tt: $x, .. })) {
                    if matches!(token, None) {
                        exit_with!(make_error!(
                            format!("expected {}, got EOF", stringify!($x)),
                            codes::E0012.0,
                            Severity::FatalError,
                            None => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end }
                        ))
                    } else if let Some(token) = token {
                        if $fatal {
                            exit_with!(make_error!(
                            format!("expected {}, got {}", stringify!($x), token.tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::FatalError,
                            None => token.span
                        ))
                    } else {
                        accumulator.push(make_error!(
                            format!("expected {}, got {}", stringify!($x), token.tt.name_for_errors()),
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
              | TokenType::Break
              | TokenType::LParen
              | TokenType::LCBrace
              | TokenType::Not
              | TokenType::Minus
              | TokenType::If
              | TokenType::Loop
              | TokenType::While
              | TokenType::Let
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
                let expr = parse_impl(input, precedence::BREAK_ASSIGN, pointer, accumulator, file)?;
                span = span.merge(expr.span);
                maybe_right = Some(expr);
            }
            lhs = Box::new(Expression { et: expressions::Expr::Break { with: maybe_right }, span })
        }
        TokenType::Continue => {
            lhs = Box::new(Expression { et: expressions::Expr::Continue, span: token.span })
        }
        TokenType::Loop => {
            let pointer_to_opening = *pointer;
            expect!(TokenType::LCBrace, false);
            let mut maybe_inside: Option<Box<Expression>> = None;
            if has_expression!() {
                maybe_inside = Some(parse_impl(input, 0, pointer, accumulator, file)?);
            }
            let mut closing_span: Span;
            if let Some(Token { span, tt }) = next!() {
                if !matches!(tt, TokenType::RCBrace) {
                    exit_with!(
                        make_error!(
                            format!("expected a closing }}, got {}", tt.name_for_errors()),
                            codes::E0012.0,
                            Severity::FatalError,
                            "expected } here" => *span
                        ).push("opening { was here".to_string(), input[pointer_to_opening].span)
                    );
                } else {
                    closing_span = *span
                }
            } else {
                exit_with!(make_error!(
                    "expected a closing }, got EOF",
                    codes::E0012.0,
                    Severity::FatalError,
                    "expected } here" => Span { file, start: input[*pointer - 2].span.end, end: input[*pointer - 2].span.end },
                    "opening { was here" => input[pointer_to_opening].span
                ))
            }
            lhs = Box::new(Expression { et: expressions::Expr::Loop { inside: maybe_inside }, span: token.span.merge(closing_span) })
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
        TokenType::LCBrace => {
            let inside = parse_impl(input, 0, pointer, accumulator, file)?;
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

    while level < infix_precedence!() {
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
        let token = if let Some(t) = next!() {
            t
        } else {
            ice!("expected infix/postfix, got EOF; infix_precedence should prevent this from happening...")
        };
        use expressions::BinaryOp;
        match &token.tt {
            TokenType::Plus  => infix!(token, BinaryOp::Add),
            TokenType::Minus => infix!(token, BinaryOp::Sub),
            TokenType::Star  => infix!(token, BinaryOp::Mul),
            TokenType::Slash => infix!(token, BinaryOp::Div),
            TokenType::Exp   => infix!(token, BinaryOp::Exp),
            TokenType::Lt    => infix!(token, BinaryOp::Lt),
            TokenType::Leq   => infix!(token, BinaryOp::Leq),
            TokenType::EqEq  => infix!(token, BinaryOp::Eq),
            TokenType::Geq   => infix!(token, BinaryOp::Geq),
            TokenType::Gt    => infix!(token, BinaryOp::Gt),
            TokenType::Neq   => infix!(token, BinaryOp::Neq),
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
    if accumulator.len() == 0 {
        Ok(lhs)
    } else {
        Err(())
    }
}
