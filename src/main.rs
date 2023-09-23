use std::path::PathBuf;

fn main() {
    let mut loader = eeeee::loader::Loader::new();
    let index = loader.load_file(PathBuf::from("testing.txt")).unwrap();
    let res = eeeee::lexer::lex(loader.get_file(index));
    // eprintln!("{:?}", res.0);
    let mut has_had_fatal = false;
    if let Err(errors) = res.1 {
        for error in errors.iter() {
            eeeee::errors::print_error(error, &loader);
            if error.fatal() {
                has_had_fatal = true;
            }
            // eeeee::errors::print_error(error, &loader)
        }
    }
    if !has_had_fatal {
        eeeee::token_debugger::print_tokens(&res.0, &loader);
        let result = eeeee::parser::parse(&res.0, index);
        match result {
            Err(errors) => {
                for error in errors.iter() {
                    eeeee::errors::print_error(error, &loader);
                }
            }
            Ok(expr) => {
                eeeee::expressions::show_tree(&expr);
                // eprintln!("parsed: {:?}", expr)
            },
        }
    }
}
