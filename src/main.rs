use std::path::PathBuf;

fn main() {
    let mut loader = escurieux::loader::Loader::new();
    let index = loader.load_file(PathBuf::from("testing.txt")).unwrap();
    escurieux::lexer::lex(loader.get_file(index)).1.unwrap();
}
