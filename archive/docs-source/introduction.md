@! 1 - Introduction
-- Note: this file is *not* intended to be viewed in GitHub's default Markdown renderer. It is intended to be available on the [Escurieux docs website](https://astroide.github.io/escurieux)
[Back to index](/escurieux/index.html)
# 1 - Introduction
$E is a language made of expressions. Every $E program is an expression.
There are different types of expressions:
* Literals: these are just a piece of data. Literals aren't composed of other expressions. There are number literals (decimal: §0.234§, §3244.3§, §42§, hexadecimal: §0xFF§, §0xabcde§, §0x0.FE4§, octal: §0o755§, §0o100.23§, binary: §0b1010001011§, §0b0.001§), string literals (§"some text here"§) which can contain newlines, character literals, which are only one character long (§'t§, §'"§), boolean literals (§true§ or §false§), function literals (§fn functionName(arg1: Type) ReturnType { expr }§, §fn functionName[T](arg1: T) T { expr }§) and lambda functions (§|| expr§, §|arg1, arg2| expr§).
* Property accessors: these are ways to access properties of objects. Their syntax is §expr.propertyName§ (meaning: property §propertyName§ of §expr§).
* Parenthesized groups: they're used to execute part of an expression before the rest of the expression (precedence) and act like parentheses in math (e.g. §(expr)§).
* Call syntax: used to call an expression that evaluates to a function, written §expr()§ or §expr(arg1, arg2, ...)§
* Operators: these are a combination of property accesses and function calls. There are two types of operators: prefix (§!expr§, §-expr§ and §~expr§) which call an argument-less function upon the expression they operate on, infix operators (§expr + expr§, §expr - expr§, §expr * expr§, §expr / expr§, §expr % expr§, §expr > expr§, §expr < expr§, §expr >= expr§, §expr <= expr§, §expr == expr§, §expr & expr§, §expr | expr§, §expr && expr§, §expr || expr§, §expr >> expr§, §expr << expr§) which call a function upon their left expression which has as single argument the right expression.
* Postfix expressions (§ident++§, §ident--§): these modify the value which can be accessed via §ident§ and return that value.
* Let and const expressions (§let name§, §let name = expr§, §const name = expr§): these allow defining a name which refers to a value. §let§ allows the value attached to that name be modified, while §const§ does not. The value of these expressions is the value assigned to the name (e.g. §expr§ in §let name = expr§).
* Identifiers (anything matching §[A-Za-z][A-Za-z0-9]*§ except keywords): these are ways of getting the values referenced by names.
* Semicolons (§;§) : these chain execution of expressions. §expr1; expr2§ first executes §expr1§, then evaluates §expr2§ and returns its value.
* If / else expressions : these permit branching. §if expr1 { expr2 } else { expr3 }§ evaluates §expr1§ first. If it evaluates to §true§, then it evaluates §expr2§ and returns its value. Otherwise, it executes §expr3§ and returns its value. An §else§-less variant also exists (§if expr1 { expr2 }§), but it can only be used if its result is discarded, because it may not return a value (if §expr1§ evaluates to §false§).
* Loop expressions (§loop { expr }§): these are loops that run forever (or until they're exited via §break§ or §break expr§). If they ever end, they return the value passed to §break§ if a value there is.
* For expressions (§for expr1, expr2, expr3 { expr4 }§ where §expr1§, §expr2§ and §expr3§ are optional) : §expr1§ is executed once before entering the loop. It is useful for setting up variables. §expr3§ is evaluated at the end of every iteration. §expr2§ is the condition expression. It is evaluated at the beginning of every iteration (including the first). If it evaluates to §true§ or if it is absent, the loop goes on. Otherwise, the loop is exited. For expressions return §()§, hence they can only be used if their result is discarded (e.g. via §;§).
* For-in expressions (§for name in expr1 { expr2 }§) : An alternative of the for loop, equivalent to §for const it = expr1, it.hasNext(), const name = it.next() { expr2 }§.