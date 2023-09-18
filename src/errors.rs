use crate::loader::{Loader, Span};

pub mod codes {
    macro_rules! d {
        ($no:ident, $message:literal) => {
            pub const $no: (&'static str, &'static str) = (stringify!($no), $message);
        };
    }
    d!(
        E0001,
        "todo: add explanation for this error (unrecognized character)"
    );
    d!(E0002, "todo: add explanation for this error (unmatched /*)");
    d!(
        E0003,
        "todo: add explanation for this error (empty hex/octal literal)"
    );
    d!(E0004, "todo: add explanation for this error (unmatched ')");
    d!(
        E0005,
        "todo: add explanation for this error (unknown escape sequence)"
    );
    d!(
        E0006,
        "todo: add explanation for this error (expected hexadecimal digit, got <something-else>)"
    );
    d!(
        E0007,
        "todo: add explanation for this error (Unicode sequences, expected { or })"
    );
    d!(
        E0008,
        "todo: add explanation for this error (invalid Unicode sequence)"
    );
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Severity {
    Warning,
    Error,
    FatalError,
}

#[derive(Debug)]
pub struct Error {
    pub(crate) pieces: Vec<String>,
    pub(crate) spans: Vec<Span>,
    pub(crate) severity: Severity,
    pub(crate) code: &'static str,
}

macro_rules! make_error {
    ($code:expr,$severity:expr,$($string:expr, $span:expr),+) => {{
        let mut pieces: Vec<String> = vec![];
        let mut spans: Vec<Span> = vec![];
        $({
          pieces.push($string.to_owned());
          spans.push($span);
        })+;
        Error { code: $code, pieces, spans, severity: $severity }
    }}
}
pub(crate) use make_error;

/// temporary implementation, to be improved.
pub fn print_error(error: &Error, sources: &Loader) {
    eprint!(
        "{} ({}):\x1B[0m ",
        match error.severity {
            Severity::Warning => "\x1B[33mwarning",
            Severity::Error => "\x1B[31merror",
            Severity::FatalError => "\x1B[31mfatal error",
        },
        error.code
    );
    for i in 0..error.pieces.len() {
        eprintln!("\x1B[34m{}\x1B[0m", error.pieces[i]);
        let (left, mid, right) = sources.span_content_with_margins(error.spans[i], 5, 5);
        eprintln!("{}\x1B[35m{}\x1B[0m{}", left, mid, right);
    }
}
