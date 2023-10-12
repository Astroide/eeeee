use std::{collections::HashMap, rc::Rc, cell::RefCell};

use crate::ice::ice;

#[derive(Debug)]
pub struct Program {
    pub instructions: Vec<Instruction>,
    pub constants: Vec<Value>,
    pub names: Vec<String>,
}

#[derive(Debug, Clone)]
pub enum Instruction {
    // push/pop values
    LoadConst(usize),
    Discard,
    PushNothing,
    Duplicate,
    PushJumpRef(usize),
    Swap,

    // control flow
    Jump(usize),
    ConditionalJump(usize),
    Terminate,
    RequireArguments(usize),
    Null,
    Call,
    Panic,

    // operations on values
    Negate,
    Add,
    Subtract,
    Multiply,
    Divide,
    Invert,
    RaiseTo,
    CheckEquality,
    Lesser,
    Greater,
    LesserEq,
    GreaterEq,
    CheckInequality,
    Show,
    AccessProperty(usize),

    // scoping & variables
    NewScope,
    LoadVar(usize),
    Store(usize),
    AssignStore(usize),
    EndScope,
    EndAndNameScope(usize),

    // functions
    PopJump,

    // for transformation into other instructions
    JumpTo(usize),
    ConditionalJumpTo(usize),
    JumpTarget(usize),
    JumpRefTo(usize),

    // debug
    FunctionTag(usize),
    CodegenHelper(usize),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Num(f64),
    Str(String),
    Bool(bool),
    Fn(usize),
    JumpRef(usize),
    Nothing,
    Scope(Rc<RefCell<Scope>>),
}

#[derive(Debug, Default, PartialEq)]
pub struct Scope {
    pub stuff: HashMap<String, Value>,
}

#[derive(Debug)]
pub struct VM {
    ip: usize,
    n: usize,
    program: Program,
    stack: Vec<Value>,
    scopes: Vec<Scope>,
}

impl VM {
    pub fn new(program: Program) -> VM {
        VM { ip: 0, n: 0, program, stack: vec![], scopes: vec![Scope::default()] }
    }

    pub fn run(&mut self) {
        macro_rules! get {
            () => {
                self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("))
            };
        }

        macro_rules! get_num {
            () => {
                {
                    let val = self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("));
                    if let Value::Num(x) = val {
                        x
                    } else {
                        panic!("expected a number and got {:?} (at {})", val, self.ip)
                    }
                }
            };
        }

        macro_rules! get_bool {
            () => {
                {
                    let val = self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("));
                    if let Value::Bool(x) = val {
                        x
                    } else {
                        panic!("expected a bool and got {:?}", val)
                    }
                }
            };
        }

        macro_rules! get_fn {
            () => {
                {
                    let val = self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("));
                    if let Value::Fn(x) = val {
                        x
                    } else {
                        panic!("expected a function and got {:?}", val)
                    }
                }
            };
        }

        macro_rules! get_scope {
            () => {
                {
                    let val = self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("));
                    if let Value::Scope(x) = val {
                        x
                    } else {
                        panic!("expected a scope and got {:?}", val)
                    }
                }
            };
        }

        macro_rules! get_jumpref {
            () => {
                {
                    let val = self.stack.pop().unwrap_or_else(|| ice!("stack is empty :("));
                    if let Value::JumpRef(x) = val {
                        x
                    } else {
                        ice!("expected a JumpRef and got {:?} @ {}", val, self.ip)
                    }
                }
            };
        }

        macro_rules! identity {
            ($e:expr) => { $e }
        }

        macro_rules! op {
            ($op:tt) => {{
                let rhs = get_num!();
                let lhs = get_num!();
                self.stack.push(Value::Num(identity!(lhs $op rhs)))
            }};
        }

        macro_rules! op_num_comparison {
            ($op:tt) => {{
                let rhs = get_num!();
                let lhs = get_num!();
                self.stack.push(Value::Bool(identity!(lhs $op rhs)))
            }};
        }

        while self.ip < self.program.instructions.len() {
            #[cfg(feature = "debug_execution")]
            println!("{} -- {:?} with {:?}", self.ip, self.program.instructions[self.ip], self.stack);
            match self.program.instructions[self.ip] {
                Instruction::LoadConst(idx) => self.stack.push(self.program.constants[idx].clone()),
                Instruction::Discard => { let _ = self.stack.pop(); },
                Instruction::PushNothing => { self.stack.push(Value::Nothing) }
                Instruction::Duplicate => {
                    let v = get!();
                    self.stack.push(v.clone());
                    self.stack.push(v)
                }
                Instruction::PushJumpRef(n) => {
                    self.stack.push(Value::JumpRef(n))
                }
                Instruction::Swap => {
                    let a = get!();
                    let b = get!();
                    self.stack.push(a);
                    self.stack.push(b)
                }
                Instruction::Jump(to) => self.ip = to,
                Instruction::ConditionalJump(to) => {
                    let value = self.stack.pop();
                    match value {
                        Some(Value::Bool(x)) => {
                            if x {
                                self.ip = to
                            }
                        }
                        _ => ice!("stack is empty or non-boolean is on the stack (at {}) (stack = {:#?}) (value = {:#?})", self.ip, self.stack, value),
                    }
                },
                Instruction::Terminate => return,
                Instruction::RequireArguments(n) => {
                    let how_many = self.stack.iter().rev().position(|x| matches!(x, Value::JumpRef(_))).unwrap_or_else(|| ice!("there should be a JumpRef here"));
                    if how_many != n {
                        panic!("function requires {n} arguments but received {how_many}")
                    }
                },
                Instruction::Null => (),
                Instruction::Call => {
                    let target = get_fn!();
                    // self.stack.push(Value::JumpRef(self.ip + 1));
                    self.ip = target
                },
                Instruction::Panic => {
                    panic!("\x1B[31merror: {:?}\x1B[0m", get!())
                },
                Instruction::Negate => {
                    let val = get_num!();
                    self.stack.push(Value::Num(-val))
                },
                Instruction::Add => op!(+),
                Instruction::Subtract => op!(-),
                Instruction::Multiply => op!(*),
                Instruction::Divide => op!(/),
                Instruction::Invert => {
                    let val = get_bool!();
                    self.stack.push(Value::Bool(!val))
                },
                Instruction::RaiseTo => {
                    let rhs = get_num!();
                    let lhs = get_num!();
                    self.stack.push(Value::Num(lhs.powf(rhs)))
                },
                Instruction::CheckEquality => {
                    let val = get!() == get!();
                    self.stack.push(Value::Bool(val))
                },
                Instruction::Lesser => op_num_comparison!(<),
                Instruction::Greater => op_num_comparison!(>),
                Instruction::LesserEq => op_num_comparison!(<=),
                Instruction::GreaterEq => op_num_comparison!(>=),
                Instruction::CheckInequality => {
                    let val = get!() != get!();
                    self.stack.push(Value::Bool(val))
                },
                Instruction::Show => {
                    // eprintln!("after {}", self.n);
                    let val = get!();
                    let s: String;
                    println!("{}", match &val {
                        Value::Fn(n) => {
                            s = format!("<function @ {}>", n);
                            &s
                        },
                        Value::Nothing => "<nothing>",
                        Value::Num(n) => {
                            s = n.to_string();
                            &s
                        },
                        Value::Bool(v) => if *v { "true" } else { "false" }
                        Value::Str(s) => s,
                        Value::JumpRef(n) => {
                            s = format!("<jump ref : {}>", n);
                            &s
                        },
                        Value::Scope(scope) => {
                            s = format!("<scope {:?}>", scope);
                            &s
                        }
                    });
                    self.stack.push(val)
                },
                Instruction::AccessProperty(property) => {
                    let name = self.program.names[property].clone();
                    let scope = get_scope!();
                    let borrow = scope.borrow();
                    self.stack.push(borrow.stuff.get(&name).expect(&name).clone())
                },
                Instruction::NewScope => self.scopes.push(Scope::default()),
                Instruction::LoadVar(index) => {
                    let name = self.program.names[index].clone();
                    let mut found = false;
                    for i in (0..self.scopes.len()).rev() {
                        if self.scopes[i].stuff.contains_key(&name) {
                            self.stack.push(self.scopes[i].stuff.get(&name).unwrap().clone());
                            found = true;
                            break
                        }
                    }
                    if !found {
                        panic!("{} is not defined in this scope or any of its parents", name)
                    }
                },
                Instruction::AssignStore(index) => {
                    let idx = self.scopes.len() - 1;
                    let _ = self.scopes[idx].stuff.insert(self.program.names[index].clone(), get!());
                },
                Instruction::Store(index) => {
                    let name = self.program.names[index].clone();
                    // let mut found = false;
                    for i in (0..self.scopes.len()).rev() {
                        if self.scopes[i].stuff.contains_key(&name) {
                            self.scopes[i].stuff.insert(name, get!());
                            // found = true;
                            break
                        }
                    }
                },
                Instruction::EndScope => {
                    let _ = self.scopes.pop();
                },
                Instruction::EndAndNameScope(index) => {
                    let scope = self.scopes.pop().unwrap_or_else(|| ice!("expected a scope"));
                    let idx = self.scopes.len() - 1;
                    let scope = Rc::new(RefCell::new(scope));
                    let _ = self.scopes[idx].stuff.insert(self.program.names[index].clone(), Value::Scope(scope));
                },
                Instruction::PopJump => {
                    let to = get_jumpref!();
                    self.ip = to
                },
                Instruction::JumpTo(_) => ice!("this should have been turned into Jump"),
                Instruction::ConditionalJumpTo(_) => ice!("this should have been turned into ConditionalJump"),
                Instruction::JumpTarget(_) => ice!("this should have been turned into Null"),
                Instruction::JumpRefTo(_) => ice!("this should have been turned into PushJumpRef"),
                Instruction::FunctionTag(_) => (),
                Instruction::CodegenHelper(_) => (),
            }
            self.ip += 1;
            self.n += 1
        }
    }
}

pub fn show_program(program: &Program) {
    eprintln!("\x1B[32mConstants:\x1B[0m");
    let count = program.constants.len();
    let width = (count as f64).log10() as usize + 3;
    for (idx, constant) in program.constants.iter().enumerate() {
        let num = idx.to_string();
        eprintln!("\x1B[33m{}{} \x1B[34m{}\x1B[0m", " ".repeat(width - num.len()), num, match constant {
            Value::Num(x) => x.to_string(),
            Value::Str(text) => format!("'{text}'"),
            Value::Bool(x) => (if *x { "true" } else { "false" }).to_owned(),
            Value::Fn(n) => format!("<function @ {n}>"),
            Value::Nothing => "<nothing>".to_owned(),
            Value::JumpRef(n) => format!("<jump ref : {n}>"),
            Value::Scope(scope) => format!("<scope {:?}>", scope),
        });
    }
    eprintln!("\n\x1B[32mNames:\x1B[0m");
    let count = program.names.len();
    let width = (count as f64).log10() as usize + 3;
    for (idx, name) in program.names.iter().enumerate() {
        let num = idx.to_string();
        eprintln!("\x1B[33m{}{} \x1B[34m{}\x1B[0m", " ".repeat(width - num.len()), num, name);
    }
    eprintln!("\n\x1B[32mInstructions:\x1B[0m");
    let count = program.instructions.len();
    let width = (count as f64).log10() as usize + 3;
    for (idx, instruction) in program.instructions.iter().enumerate() {
        let num = idx.to_string();
        eprintln!("\x1B[33m{}{} \x1B[34m{}\x1B[0m", " ".repeat(width - num.len()), num, match instruction {
            Instruction::LoadConst(n) => format!("load\x1B[0m {} \x1B[37m({})", match &program.constants[*n] {
                Value::Num(x) => x.to_string(),
                Value::Str(text) => format!("'{text}'"),
                Value::Bool(x) => (if *x { "true" } else { "false" }).to_owned(),
                Value::Fn(x) => format!("<function @ {x}>"),
                Value::Nothing => "<nothing>".to_owned(),
                Value::JumpRef(n) => format!("<jump ref : {n}>"),
                Value::Scope(scope) => format!("<scope {:?}>", scope),
            }, n),
            Instruction::Discard => "discard".to_owned(),
            Instruction::PushNothing => "push-nothing".to_owned(),
            Instruction::Duplicate => "duplicate".to_owned(),
            Instruction::PushJumpRef(x) => format!("push-jump-ref\x1B[0m {}", x),
            Instruction::Swap => "swap".to_owned(),
            Instruction::Jump(to) => format!("jump\x1B[0m {}", to),
            Instruction::ConditionalJump(to) => format!("conditional-jump\x1B[0m {}", to),
            Instruction::Terminate => "---".to_owned(),
            Instruction::RequireArguments(n) => format!("require-args\x1B[0m {n}"),
            Instruction::Null => "".to_owned(),
            Instruction::Call => "call".to_owned(),
            Instruction::Panic => "panic".to_owned(),
            Instruction::Negate => "neg".to_owned(),
            Instruction::Add => "add".to_owned(),
            Instruction::Subtract => "sub".to_owned(),
            Instruction::Multiply => "mul".to_owned(),
            Instruction::Divide => "div".to_owned(),
            Instruction::Invert => "invert".to_owned(),
            Instruction::RaiseTo => "exp".to_owned(),
            Instruction::CheckEquality => "check-eq".to_owned(),
            Instruction::Lesser => "lt".to_owned(),
            Instruction::Greater => "gt".to_owned(),
            Instruction::LesserEq => "leq".to_owned(),
            Instruction::GreaterEq => "geq".to_owned(),
            Instruction::CheckInequality => "check-neq".to_owned(),
            Instruction::Show => "show".to_owned(),
            Instruction::AccessProperty(v) => format!("read-property\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::NewScope => "new-scope".to_owned(),
            Instruction::LoadVar(v) => format!("load-name\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::Store(v) => format!("store\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::AssignStore(v) => format!("declare-store\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::EndScope => "end-scope".to_owned(),
            Instruction::EndAndNameScope(v) => format!("end-store-scope\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::PopJump => "pop-jump".to_owned(),
            Instruction::JumpTo(_) => todo!(),
            Instruction::ConditionalJumpTo(_) => todo!(),
            Instruction::JumpTarget(_) => todo!(),
            Instruction::JumpRefTo(_) => todo!(),
            Instruction::FunctionTag(tag) => format!("\x1B[35m{}:", &program.names[*tag]),
            Instruction::CodegenHelper(tag) => format!("\x1B[35m-- {}", &program.names[*tag]),
        });
    }
}