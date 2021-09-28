# Escurieux
![Build Status - MacOS](https://github.com/astroide/escurieux/actions/workflows/macos.yml/badge.svg)
![Build Status - Ubuntu](https://github.com/astroide/escurieux/actions/workflows/ubuntu.yml/badge.svg)
![Build Status - Windows](https://github.com/astroide/escurieux/actions/workflows/windows.yml/badge.svg)

A statically typed programming language, transpiled to C.

### Current State
As of now, the parser and the tokenizer are written (and the compiler will be) in [TypeScript](https://typescriptlang.org), but once Escurieux will be in an appropriate state, they will be rewritten in Escurieux to remove the TypeScript/Node.js dependencies.

```
             _
             V
   ┌─────────┰──────────┰──────────────┰──────────────┐
Tokenizer  Parser    Compiler   Standard Library   Rewriting
                                                 the compiler
                                                 in Escurieux
```
