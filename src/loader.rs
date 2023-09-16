use std::path::{Path, PathBuf};

use crate::{
    failure::Failure,
    ice::{ice, unwrap_err},
};

macro_rules! ok {
    ($e:expr, $output:path) => {{
        let res = $e;
        if let Ok(value) = res {
            value
        } else {
            return Err($output(res.unwrap_err()));
        }
    }};
}

#[derive(Debug, Clone, Copy)]
pub struct Span {
    pub file: usize,
    pub start: u32,
    pub end: u32,
}

impl Span {
    pub fn new(file: usize, start: usize, end: usize) -> Span {
        Span {
            file,
            start: unwrap_err!(start.try_into()),
            end: unwrap_err!(end.try_into()),
        }
    }

    pub fn merge(self, other: Span) -> Span {
        if self.file != other.file {
            ice!("attempting to merge two spans that aren't from the same file")
        }
        Span {
            file: self.file,
            start: self.start.min(other.start),
            end: self.end.max(other.end),
        }
    }
}

#[derive(Debug)]
pub struct Source {
    string: String,
    src: PathBuf,
    pub index: usize,
}

impl Source {
    pub fn string(&self) -> &str {
        &self.string
    }

    pub fn src(&self) -> Option<&str> {
        self.src.as_os_str().to_str()
    }
}

#[derive(Debug, Default)]
pub struct Loader {
    files: Vec<Source>,
}

impl Loader {
    pub fn new() -> Loader {
        Loader { files: vec![] }
    }

    pub fn load_file<P: AsRef<Path>>(&mut self, path: P) -> Result<usize, Failure> {
        let path = path.as_ref();
        let bytes = ok!(std::fs::read(path), Failure::IOError);
        let utf8 = ok!(String::from_utf8(bytes), Failure::Utf8Error);
        self.files.push(Source {
            index: self.files.len(),
            src: path.to_owned(),
            string: utf8,
        });
        Ok(self.files.len() - 1)
    }

    pub fn get_file(&self, index: usize) -> &Source {
        &self.files[index]
    }
}
