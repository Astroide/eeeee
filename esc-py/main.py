#!/usr/bin/env python3

# a compiler fox experimentation with the language.
# when I will have a satisfying language prototype, this'll be rewritten in Rust. 

# Things to fix:
# * errors.py: fix ANSI code being considered multiple characters; add the `message`

from errors import crash, span_with_message
import text as Text
import sys as Sys, os as Os

if __name__ != '__main__':
    crash('this is meant to be invoked directly, not as a module')

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
        span_with_message(Text.Span(the_file, text, 100, 102), 'hamster')
except PermissionError:
    crash(f'{the_file}: insufficient permissions to read')