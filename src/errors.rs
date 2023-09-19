use crate::loader::{Loader, Source, Span};

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
    d!(
        E0009,
        "todo: add explanation for this error (invalid type hint)"
    );
    d!(
        E0010,
        "todo: add explanation for this error (unexpected identifier)"
    );
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Severity {
    Info,
    Warning,
    Error,
    FatalError,
}

#[derive(Debug)]
pub struct Error {
    pub(crate) message: String,
    pub(crate) pieces: Vec<Option<String>>,
    pub(crate) spans: Vec<Span>,
    pub(crate) severity: Severity,
    pub(crate) code: &'static str,
}

impl Error {
    pub fn new(message: String, code: &'static str, severity: Severity) -> Self {
        Self {
            message,
            pieces: vec![],
            spans: vec![],
            code,
            severity,
        }
    }

    pub fn push<T: Into<Option<String>>>(&mut self, piece: T, span: Span) -> &mut Self {
        self.pieces.push(piece.into());
        self.spans.push(span.into());
        self
    }
}

macro_rules! make_error {
    ($message:expr,$code:expr,$severity:expr,$($string:expr => $span:expr),+) => {{
        let mut pieces: Vec<Option<String>> = vec![];
        let mut spans: Vec<Span> = vec![];
        $({
            let string: Option<&str> = $string.into();
            let string = string.map(|x| x.to_owned());
            pieces.push(string);
            spans.push($span);
        })+;
        Error { message: Into::<String>::into($message), code: $code, pieces, spans, severity: $severity }
    }}
}
pub(crate) use make_error;

fn find_line_col(source: &Source, position: u32) -> (usize, usize) {
    let position = position as usize;
    let mut line = 0;
    let mut chr = 0;
    for (index, c) in source.string().chars().enumerate() {
        if index >= position {
            break;
        }
        if c == '\n' {
            line += 1;
            chr = 0;
        } else {
            chr += 1;
        }
    }
    (line, chr)
}

fn lines(file: &Source) -> usize {
    file.string().chars().filter(|x| x == &'\n').count()
}

fn fuse(spans: &[(usize, usize, usize)]) -> Vec<(usize, usize, usize, Vec<usize>)> {
    let mut output: Vec<(usize, usize, usize, Vec<usize>)> = vec![];
    for (span_index, (file, start, end)) in spans.iter().enumerate() {
        let v = 'block: {
            for (index, (t_file, t_start, t_end, _)) in output.iter().enumerate() {
                if file != t_file {
                    continue;
                }
                if start < t_end && t_start < end {
                    break 'block Some(index);
                }
            }
            output.push((*file, *start, *end, vec![span_index]));
            None
        };
        if let Some(idx) = v {
            output[idx].1 = output[idx].1.min(*start);
            output[idx].2 = output[idx].2.max(*end);
            output[idx].3.push(span_index);
        }
    }
    output
}

fn eprint_line(source: &str, line: usize, end: &str) {
    let chars = source.chars().collect::<Vec<_>>(); // ...
    let mut current_line = 0;
    let mut pointer = 0;
    while current_line < line {
        if chars[pointer] == '\n' {
            current_line += 1
        }
        pointer += 1;
    }
    let width = (line as f64 + 50.0).log10().ceil() as usize + 2;
    let lineno = (line + 1).to_string();
    let mut line_text = " ".repeat(width - lineno.len());
    line_text.push_str(&lineno);
    eprint!("\x1B[34m{} | \x1B[0m", line_text);
    loop {
        eprint!("{}", chars[pointer]);
        pointer += 1;
        if pointer == chars.len() || chars[pointer] == '\n' {
            eprint!("{}", end);
            return;
        }
    }
}

fn eprint_line_start(line: usize) {
    eprint!(
        "\x1B[34m{} : \x1B[0m",
        " ".repeat((line as f64 + 50.0).log10().ceil() as usize + 2)
    );
}

macro_rules! unwrap_or_else_this_particular_case {
    ($value:expr, $other:expr) => {{
        if let Some(ref k) = $value {
            &k[..]
        } else {
            $other
        }
    }};
}

pub fn print_error_(error: &Error, sources: &Loader) {
    eprintln!(
        "{} ({}):\x1B[0m {}",
        match error.severity {
            Severity::Warning => "\x1B[33mwarning",
            Severity::Error => "\x1B[31merror",
            Severity::FatalError => "\x1B[31mfatal error",
            Severity::Info => "\x1B[36minfo",
        },
        error.code,
        error.message
    );
    let ranges = error
        .spans
        .iter()
        .map(|x| {
            let file = sources.get_file(x.file);
            let total_lines = lines(file);
            let start = find_line_col(file, x.start).0;
            let end = find_line_col(file, x.end).0;
            let start = start.saturating_sub(2);
            let end = (end + 3).min(total_lines + 1);
            (x.file, start, end)
        })
        .collect::<Vec<_>>();
    for (file_number, start_line, end_line, spans) in fuse(&ranges).iter() {
        let relevant_spans = error
            .spans
            .iter()
            .enumerate()
            .filter(|x| spans.contains(&x.0))
            .map(|x| {
                let source = sources.get_file(x.1.file);
                let start = find_line_col(source, x.1.start);
                let end = find_line_col(source, x.1.end);
                (x.1, start, end, start.0 == end.0, x.0)
            })
            .collect::<Vec<_>>();
        let file_number = *file_number;
        let start_line = *start_line;
        let end_line = *end_line;
        let src = sources.get_file(file_number).string();
        let lines = src.lines().collect::<Vec<_>>();
        let width = lines[start_line..end_line]
            .iter()
            .fold(0, |len, string| len.max(string.chars().count()));
        let mut stack = Vec::<usize>::new();
        for (i, line_item) in lines.iter().enumerate().take(end_line).skip(start_line) {
            // println!("line #{}", i + 1);
            for (span_index, (_, (start_line, start_col), _, one_liner, _)) in
                relevant_spans.iter().enumerate()
            {
                // let span = *span;
                let start_line = *start_line;
                let start_col = *start_col;
                let one_liner = *one_liner;
                if start_line == i && !one_liner {
                    eprint_line_start(i);
                    let line_x = width + 1 + stack.len();
                    eprint!("{}", " ".repeat(start_col - 1));
                    eprint!("\x1B[36mv");
                    eprint!("{}", "-".repeat((line_x - start_col).saturating_sub(1)));
                    eprintln!("\\\x1B[0m");
                    stack.push(span_index);
                }
            }
            let line_end = format!(
                "{}\x1B[36m{}\x1B[0m\n",
                " ".repeat(width - line_item.chars().count()),
                "|".repeat(stack.len())
            );
            eprint_line(
                src,
                i,
                if stack.is_empty() {
                    "\n"
                } else {
                    &line_end[..]
                },
            );
            for (_, (_, (_, start_col), (end_line, end_col), one_liner, original_index)) in
                relevant_spans.iter().enumerate()
            {
                // let span = *span;
                let end_line = *end_line;
                let start_col = *start_col;
                let end_col = *end_col;
                let one_liner = *one_liner;
                let original_index = *original_index;
                if end_line == i && one_liner {
                    eprint_line_start(i);
                    eprint!("{}", " ".repeat(start_col));
                    eprint!("\x1B[36m^");
                    if end_col - start_col > 1 {
                        eprint!("{}", "-".repeat((end_col - start_col).saturating_sub(2)));
                        if end_col - start_col >= 2 {
                            eprint!("^");
                        }
                    }
                    eprint!(
                        " {}",
                        unwrap_or_else_this_particular_case!(error.pieces[original_index], "here")
                    );
                    eprintln!("\x1B[0m");
                }
            }
            for (span_index, (_span, (_, _), (end_line, end_col), one_liner, _)) in
                relevant_spans.iter().enumerate()
            {
                // let span = *span;
                let end_line = *end_line;
                // let start_col = *start_col;
                let end_col = *end_col;
                let one_liner = *one_liner;
                if end_line == i && !one_liner {
                    let position = stack.iter().position(|x| x == &span_index).unwrap();
                    eprint_line_start(i);
                    eprint!("{}\x1B[36m", " ".repeat(width));
                    for _ in 0..position {
                        eprint!(":");
                    }
                    eprint!("|");
                    for _ in (position + 1)..stack.len() {
                        eprint!(":");
                    }
                    eprintln!("\x1B[0m");
                    stack.remove(position);
                    eprint_line_start(i);
                    let line_x = width + position;
                    eprint!("{}", " ".repeat(end_col));
                    eprint!("\x1B[36m^");
                    eprint!("{}", "-".repeat((line_x - end_col).saturating_sub(1)));
                    eprintln!("/\x1B[0m");
                }
            }
        }
    }
}

/// temporary implementation, to be improved.
pub fn print_error(error: &Error, sources: &Loader) {
    eprint!(
        "{} ({}):\x1B[0m ",
        match error.severity {
            Severity::Warning => "\x1B[33mwarning",
            Severity::Error => "\x1B[31merror",
            Severity::FatalError => "\x1B[31mfatal error",
            Severity::Info => "\x1B[36minfo",
        },
        error.code
    );
    for i in 0..error.pieces.len() {
        let line_col = find_line_col(sources.get_file(error.spans[i].file), error.spans[i].start);
        eprintln!(
            "\x1B[34m{}\x1B[0m",
            unwrap_or_else_this_particular_case!(error.pieces[i], "here")
        );
        eprintln!(
            "--> \x1B[34m{}\x1B[0m:\x1B[34m{}\x1B[0m:\x1B[34m{}\x1B[0m",
            sources
                .get_file(error.spans[i].file)
                .src()
                .unwrap_or("<unknown>"),
            line_col.0 + 1,
            line_col.1 + 1
        );
        let (left, mid, right) = sources.span_content_with_margins(error.spans[i], 5, 5);
        eprintln!("{}\x1B[36m{}\x1B[0m{}", left, mid, right);
    }
}
