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
            match &peek!() {
                _ => 0,
            }
        };
    }

    macro_rules! next {
        () => {{
            *pointer = *pointer + 1;
            if *pointer >= input.len() {
                None
            } else {
                Some(&input[*pointer - 1])
            }
        }};
    }

    let token = if let Some(t) = next!() {
        t
    } else {
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
    Ok(lhs)
}
