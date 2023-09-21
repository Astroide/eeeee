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
            if *pointer + 1 < input.len() {
                Some(&input[*pointer + 1])
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
        ($x:ty, $fatal:literal) => {
            {
                let token = next!();
                if !matches!(token, Some($x)) {
                    if matches!(None, token) {
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
        panic!();
        exit_with!(
            make_error!("expected an expression, got EOF", codes::E0011.0, Severity::FatalError, None => Span::new(file, 0, 0))
        )
    };
    let mut lhs: Box<Expression>;
    match &token.tt {
        tt @ TokenType::SLiteral { .. } => {
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
        TokenType::LParen => {
            lhs = parse_impl(input, 0, pointer, accumulator, file)?;
            let maybe_token = next!();
            if let Some(Token { span, tt }) = maybe_token {
                if !matches!(tt, TokenType::RParen) {
                    exit_with!(make_error!(
                        format!("expected a closing parenthesis, got {}", tt.name_for_errors()),
                        codes::E0012.0,
                        Severity::FatalError,
                        "expected ) here" => *span
                    )
                    .push("opening parenthesis was here".to_string(), token.span));
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
                    exit_with!(make_error!(
                        format!("expected a closing '}}', got {}", tt.name_for_errors()),
                        codes::E0012.0,
                        Severity::FatalError,
                        "expected } here" => *span
                    )
                    .push("opening '{' was here".to_string(), token.span));
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
        _ => exit_with!(
            make_error!(format!("expected an expression, got {}", token.tt.name_for_errors()), codes::E0011.0, Severity::FatalError, None => token.span)
        ),
    };
    while level < infix_precedence!() {
        let token = if let Some(t) = next!() {
            t
        } else {
            ice!("expected infix/postfix, got EOF; infix_precedence should prevent this from happening...")
        };
        match &token.tt {
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
