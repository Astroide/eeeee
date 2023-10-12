use std::path::PathBuf;

// important note : a lot of things are half-implemented or far from a final form because I want to get something running fast.
// so no patterns for now.

fn main() {
    let mut loader = eeeee::loader::Loader::new();
    let index;
    #[cfg(miri)]
    {
        index = loader.load_from_memory(include_str!("../testing.txt").to_owned(), "testing.txt".to_owned());
    }

    #[cfg(not(miri))]
    {
        index = loader.load_file(PathBuf::from("testing.txt")).unwrap();
    }
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
        let result = eeeee::parser::parse(&res.0, index, &mut loader);
        match result {
            Err(errors) => {
                for error in errors.iter() {
                    eeeee::errors::print_error(error, &loader);
                }
            }
            Ok(expr) => {
                eeeee::expressions::show_tree(&expr);
                eprintln!("PARSED");
                let mut builder = eeeee::compiler::ProgramBuilder::new(true);
                eeeee::compiler::lower(&expr, &mut builder);
                eprintln!("COMPILED");
                let program = builder.finish();
                eeeee::vm::show_program(&program);
                let mut vm = eeeee::vm::VM::new(program);
                vm.run();
                eprintln!("EXECUTED");
                // eprintln!("parsed: {:?}", expr)
            },
        }
    }
}
