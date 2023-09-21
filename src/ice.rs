macro_rules! ice {
    ($string:literal) => {
        { eprintln!(concat!("\x1B[31minternal compiler error\x1B[0m ({}:{}): ", $string), file!(), line!()); panic!("internal compiler error") }
    };
    ($string:literal, $($args:tt)*) => {
        { eprintln!(concat!("\x1B[31minternal compiler error\x1B[0m ({}:{}): ", $string), file!(), line!(), $($args)*); panic!("internal compiler error") }
    };
}
pub(crate) use ice;

/// note: use only when the value should really be there, and there's no real risk of failing.
macro_rules! unwrap_err {
    ($e:expr) => {
        $e.unwrap_or_else(|e| ice!("called unwrap() on an Err ({:?})", e))
    };
}
pub(crate) use unwrap_err;
