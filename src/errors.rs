use std::hint::black_box;

use crate::loader::{Loader, Span};

pub mod diagnostics {
    macro_rules! d {
        ($no:ident, $message:literal) => {
            pub const $no: (&'static str, &'static str) = (stringify!($no), $message);
        };
    }
    d!(
        E0001,
        "todo: add explanation for this error (unrecognized character)"
    );
}

#[rustfmt::skip]
#[derive(Debug)]
pub struct Error {
    pub(crate) pieces: Vec<String>,
    pub(crate) spans : Vec<Span>,
    pub(crate) fatal : bool,
    pub(crate) code  : &'static str,
}

impl Error {
    pub fn muffin(self) {
        black_box((self.pieces, self.spans, self.fatal, self.code)); // silence the warnings
    }
}

macro_rules! make_error {
    ($code:expr,$fatal:expr,$($string:expr, $span:expr),+) => {{
        let mut pieces: Vec<String> = vec![];
        let mut spans: Vec<Span> = vec![];
        $({
          pieces.push($string.to_owned());
          spans.push($span);
        })+;
        Error { code: $code, pieces, spans, fatal: $fatal }
    }}
}
pub(crate) use make_error;

/// temporary implementation, to be improved.
pub fn print_error(error: &Error, sources: &Loader) {
    eprint!("\x1B[31merror ({}):\x1B[0m ", error.code);
    for i in 0..error.pieces.len() {
        eprintln!("\x1B[34m{}\x1B[0m", error.pieces[i]);
        let (left, mid, right) = sources.span_content_with_margins(error.spans[i], 5, 5);
        eprintln!("{}\x1B[35m{}\x1B[0m{}", left, mid, right);
    }
}
