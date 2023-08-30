#!/usr/bin/env python3

# a compiler fox experimentation with the language.
# when I will have a satisfying language prototype, this'll be rewritten in Rust. 

# temporarily 'fixed' the ANSI escape code issue by commenting out (I) the line length code.
# this will eventually need to be changed; but for now, it more or less works.
#
# identifiers are currently only [A-Za-z_][A-Za-z0-9_]*, as this is a testing version. Unicode identifiers are planned in the future.

import errors as Errors
crash = Errors.crash
import tokens as Tokens
import text as Text
import sys as Sys, os as Os
import parser_ as Parser # the underscore is to have my Python extension shut up about overriding a default module

if __name__ != '__main__':
    crash('this is meant to be invoked directly, not as a module')

def die():
    Errors.info(f'compilation aborted due to {"this error" if Errors.error_count() == 1 else f"{Errors.error_count()} errors"}.')
    exit(1)

if len(Sys.argv) < 2:
    crash('a filename must be provided')

the_file = Os.path.abspath(Sys.argv[1])
if not Os.path.exists(the_file):
    crash(f'{the_file}: no such file or directory')

if Os.path.isdir(the_file):
    crash(f'{the_file}: is a directory')

# proceed
try:
    with open(the_file, mode='r') as handle:
        text = handle.read()
        tokenizer = Tokens.Tokenizer(text, the_file)
        tokens = tokenizer.generate_tokens()
        if tokens is None:
            die()
        hex_tokens = list(filter(lambda t: t.type == Tokens.TokenType.ILiteral and t.span.content().startswith('0x'), tokens))
        hex_text = ' '.join(map(lambda t: t.span.content()[2:].split('_')[0], hex_tokens))
        if hex_text.lower() != hex_text and hex_text.upper() != hex_text:
            parts = tuple(map(lambda token: (token.span, 'this literal uses ' + ('upper' if token.span.content()[2:] == token.span.content()[2:].upper() else ('lower' if token.span.content()[2:] == token.span.content()[2:].lower() else 'mixed')) + ' case'), hex_tokens))
            Errors.warning('mixed case in hexadecimal literals', *parts)
        # print(tokens)
        parser = Parser.Parser(tokens)
        try:
            stuff = parser.expression()
            print(stuff)
        except Parser.FatalParseError:
            die()
except PermissionError:
    crash(f'{the_file}: insufficient permissions to read')