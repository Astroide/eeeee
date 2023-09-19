use std::path::PathBuf;

fn main() {
    let mut loader = eeeee::loader::Loader::new();
    let index = loader.load_file(PathBuf::from("testing.txt")).unwrap();
    let res = eeeee::lexer::lex(loader.get_file(index));
    // eprintln!("{:?}", res.0);
    if let Err(errors) = res.1 {
        for error in errors.iter() {
            eeeee::errors::print_error_(error, &loader);
            // eeeee::errors::print_error(error, &loader)
        }
    }
    eeeee::token_debugger::print_tokens(&res.0, &loader)
}
