import typing_ as Typing
from typing_ import TypeType
mod = {}

def declare_type(path: str, type: Typing.Type):
    global mod
    segments = path.split('.')
    k = mod
    for segment in segments[:-1]:
        try:
            k = k[segment]
        except KeyError:
            k[segment] = {}
            k = k[segment]
    k[segments[-1]] = type

declare_type('$builtin.u8',   Typing.Type(TypeType.Terminal))
declare_type('$builtin.i8',   Typing.Type(TypeType.Terminal))
declare_type('$builtin.u16',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.i16',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.u32',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.i32',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.u64',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.i64',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.u128', Typing.Type(TypeType.Terminal))
declare_type('$builtin.i128', Typing.Type(TypeType.Terminal))
declare_type('$builtin.f32',  Typing.Type(TypeType.Terminal))
declare_type('$builtin.f64',  Typing.Type(TypeType.Terminal))