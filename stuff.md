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

possibly - `duck` keyword for duck typing
```rs
fn do_stuff(something: duck SomeTrait) {
    // `something` is guaranteed to have all of SomeTrait's methods but not forcedly by implementing SomeTrait
}
```
other possible way:
```rs
fn do_stuff<T: duck SomeTrait>(something: T) {
    // more or less the same as above
}
```
this could be an interesting feature, but it might result in code simply not using traits when they are available, instead relying on the presence of `duck` - and what should happen if `T` implements a method of SomeTrait twice (in different traits' implementations)?

**modules** - for example `use std.fs.read_file;` or, without `use`ing it, `.std.fs.read_file(...)`

**general ideas**
(what I want this to be)
* relatively readable
* nice to write
* neither too verbose nor minimalist - I think that removing everything not absolutely necessary to the syntax can make it less readable; compare `fn do_stuff(a: u8, b: i32, c: f64) { ... }` and `fn do_stuff a u8 b i32 c f64 { ... }` (this one is a bit extreme of an example)
* expressions expressions expressions EVERYTHING IS AN EXPRESSION