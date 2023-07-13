everything is an expression

semicolons act as low-precedence operators which evaluate and discard their left side, then evaluate the right side and return that, so `something; something_else; another_thing` is the same as `(something; something_else); another_thing`

function keyword: `fn`

usual operators for numbers

`&` and `|` are for _booleans_, while `&&` and `||` are for bitwise operations, as opposed to practically every other language

number types: similar to Rust's

'nothing' type? for functions that don't return a value

never type for stuff that never returns; only useful if it's static typing though

lambdas: `|| something`, `|a, b| a + b` or `|a, b| { ... }`
other form: `_.some_method()`/`_ * 3`/`do_something_with(_)` - readability might be affected in the latter case though
```js
array.map(_ * 3) /* => */ array.map(|x| x * 3)
array.map(_.sqrt()) /* => */ array.map(|x| x.sqrt())
```

(probably bad) idea : `.{}` blocks to add to the scope any properties or methods of the thing on which you use it
```js
screen.{
    width += 640;
    height += 480;
    width * height
}
// same as
{
    screen.width += 640;
    screen.width += 480;
    screen.width * screen.height
}
```

match, both postfix and not postfix
```js
match value {
    something => a,
    something_else => b,
    _ => c,
}
// or
value.match {
    something => a,
    something_else => b,
    _ => c,
}
```

`with`/`if` and the like : no parentheses around conditions

generics : allow code inside functions to treat `T` and friends as parameters, but that are types? e.g.
```rs
fn eee<T: Add>(arg: T) -> T {
    match T {
        u8 => arg + 2,
        _ => arg + 1,
    }
}
```