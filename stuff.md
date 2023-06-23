everything is an expression

semicolons act as low-precedence operators which evaluate and discard their left side, then evaluate the right side and return that, so `something; something_else; another_thing` is the same as `(something; something_else); another_thing`

function keyword: `fn`

usual operators for numbers

`&` and `|` are for _booleans_, while `&&` and `||` are for bitwise operations. also, possibly could remove && and || altogether if I consider booleans to be 1 bit numbers (but then what if `true & some_number`?)

number types: similar to Rust's

'nothing' type? for functions that don't return a value

never type for stuff that never returns; only useful if it's static typing though

lambdas: `|| something`, `|a, b| a + b` or `|a, b| { ... }`