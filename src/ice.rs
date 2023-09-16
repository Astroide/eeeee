macro_rules! ice {
    ($string:literal) => {
        { eprintln!(concat!("\x1B[31mICE\x1B[0m ({}:{}): ", $string), file!(), line!()); panic!("internal compiler error") }
    };
    ($string:literal, $($args:tt)*) => {
        { eprintln!(concat!("\x1B[31mICE\x1B[0m ({}:{}): ", $string), $($args)*, file!(), line!()); panic!("internal compiler error") }
    };
}
pub(crate) use ice;

macro_rules! unwrap_err {
    ($e:expr) => {
        $e.unwrap_or_else(|_| ice!("called unwrap() on a None/Err"))
    };
}
pub(crate) use unwrap_err;
