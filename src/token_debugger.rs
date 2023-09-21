use crate::{
    errors::{self, Error},
    loader::Loader,
    tokens::Token,
};

pub fn print_tokens(tokens: &[Token], sources: &Loader) {
    let mut errorlike = Error::new("tokens".to_owned(), "debug", crate::errors::Severity::Info);
    for token in tokens {
        errorlike = errorlike.push(format!("{:?}", token.tt), token.span);
    }
    errors::print_error(&errorlike, sources);
}
