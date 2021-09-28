@! 1 - Introduction
# 1 - Introduction

## 1.0 - Hello World

This is the simplest §Hello, World!§ Escurieux program :

«
stdout.writeln('Hello, World!')
»

#### Breakdown of the §Hello, World!§
«
stdout                           // Standard Output
      .writeln                   // writeln - write with trailing newline
              ('Hello, World!')  // Call the method with as argument the string 'Hello, World!'
»

{
## 1.1
In Escurieux, everything (except imports and macros, because these are compile-time things) is an expression. Classes are expressions. Functions are expressions. Variable declarations are expressions.

### Data types
These are the fundamental data types of Escurieux:
* §string§
* §int§ (64 bits integer)
* §int32§ (32 bits integer)
* §iint§ (infinite-size integer)
* §float§ (64 bits floating-point)
* §float32§ (32 bits floating-point)
* §ifloat§ (infinite-size and infinite-precision floating-point)
* §char§ (character)
* §boolean§ (boolean)

Note that numeric types are by default 64 bits.

All these types are classes, which means that instance of these types have methods and fields, just like any other object.

### Basic Operators
The number types support these operators : §+§, §-§, §*§, §/§, and §%§.
Whenever one of these operations is computed, the result will *always* be of the most precise of the two types.

That means that §float * int -> float§, §iint * ifloat -> ifloat§, §int32 * float -> float§.
}
