#![forbid(missing_debug_implementations, nonstandard_style)]

pub mod errors;
pub(crate) mod ice; // must be first due to how macros work
pub mod lexer;
pub mod loader;
pub mod token_debugger;
pub mod tokens;

pub mod failure {
    use std::{io::Error, string::FromUtf8Error};

    #[derive(Debug)]
    pub enum Failure {
        IOError(Error),
        Utf8Error(FromUtf8Error),
    }
}