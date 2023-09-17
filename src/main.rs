use std::path::PathBuf;

fn main() {
    let mut loader = escurieux::loader::Loader::new();
    let index = loader.load_file(PathBuf::from("testing.txt")).unwrap();
    let res = escurieux::lexer::lex(loader.get_file(index));
    eprintln!("{:?}", res.0);
    if let Err(errors) = res.1 {
        for error in errors.iter() {
            escurieux::errors::print_error(error, &loader)
        }
    }
}
