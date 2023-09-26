use std::collections::HashMap;

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

    // control flow
    Jump(usize),
    ConditionalJump(usize),
    Terminate,
    Null,

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

    // scoping & variables
    NewScope,
    LoadVar(usize),
    Store(usize),
    AssignStore(usize),
    EndScope,

    // functions
    PopJump,

    // for transformation into other instructions
    JumpTo(usize),
    ConditionalJumpTo(usize),
    JumpTarget(usize),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Num(f64),
    Str(String),
    Bool(bool),
    Fn,
    Nothing,
}

#[derive(Debug, Default)]
pub struct Scope {
    pub stuff: HashMap<String, Value>,
}

#[derive(Debug)]
pub struct VM {
    ip: usize,
    program: Program,
    stack: Vec<Value>,
    scopes: Vec<Scope>,
}

impl VM {
    pub fn new(program: Program) -> VM {
        VM { ip: 0, program, stack: vec![], scopes: vec![Scope::default()] }
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
                        panic!("expected a number and got {:?}", val)
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
            match self.program.instructions[self.ip] {
                Instruction::LoadConst(idx) => self.stack.push(self.program.constants[idx].clone()),
                Instruction::Discard => { let _ = self.stack.pop(); },
                Instruction::PushNothing => { self.stack.push(Value::Nothing) }
                Instruction::Jump(to) => self.ip = to,
                Instruction::ConditionalJump(to) => {
                    let value = self.stack.pop();
                    match value {
                        Some(Value::Bool(x)) => {
                            if x {
                                self.ip = to
                            }
                        }
                        _ => ice!("stack is empty or non-boolean is on the stack"),
                    }
                },
                Instruction::Terminate => return,
                Instruction::Null => (),
                Instruction::Negate => {
                    let val = get_num!();
                    self.stack.push(Value::Num(-val))
                },
                Instruction::Add => op!(+),
                Instruction::Subtract => op!(-),
                Instruction::Multiply => op!(*),
                Instruction::Divide => op!(/),
                Instruction::Invert => todo!(),
                Instruction::RaiseTo => todo!(),
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
                    let val = get!();
                    println!("{:?}", val);
                    self.stack.push(val)
                },
                Instruction::NewScope => self.scopes.push(Scope::default()),
                Instruction::LoadVar(index) => {
                    let name = self.program.names[index].clone();
                    // let mut found = false;
                    for i in (0..self.scopes.len()).rev() {
                        if self.scopes[i].stuff.contains_key(&name) {
                            self.stack.push(self.scopes[i].stuff.get(&name).unwrap().clone());
                            // found = true;
                            break
                        }
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
                Instruction::PopJump => todo!(),
                Instruction::JumpTo(_) => ice!("this should have been turned into Jump"),
                Instruction::ConditionalJumpTo(_) => ice!("this should have been turned into ConditionalJump"),
                Instruction::JumpTarget(_) => ice!("this should have been turned into Null"),
            }
            self.ip += 1
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
            Value::Fn => "<function>".to_owned(),
            Value::Nothing => "<nothing>".to_owned()
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
                Value::Fn => "<function>".to_owned(),
                Value::Nothing => "<nothing>".to_owned()
            }, n),
            Instruction::Discard => "discard".to_owned(),
            Instruction::PushNothing => "push-nothing".to_owned(),
            Instruction::Jump(to) => format!("jump\x1B[0m {}", to),
            Instruction::ConditionalJump(to) => format!("conditional-jump\x1B[0m {}", to),
            Instruction::Terminate => "---".to_owned(),
            Instruction::Null => "".to_owned(),
            Instruction::Negate => "neg".to_owned(),
            Instruction::Add => "add".to_owned(),
            Instruction::Subtract => "sub".to_owned(),
            Instruction::Multiply => "mul".to_owned(),
            Instruction::Divide => "div".to_owned(),
            Instruction::Invert => "invert".to_owned(),
            Instruction::RaiseTo => "add".to_owned(),
            Instruction::CheckEquality => "check-eq".to_owned(),
            Instruction::Lesser => "lt".to_owned(),
            Instruction::Greater => "gt".to_owned(),
            Instruction::LesserEq => "leq".to_owned(),
            Instruction::GreaterEq => "geq".to_owned(),
            Instruction::CheckInequality => "check-neq".to_owned(),
            Instruction::Show => "show".to_owned(),
            Instruction::NewScope => "new-scope".to_owned(),
            Instruction::LoadVar(v) => format!("load-name\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::Store(v) => format!("store\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::AssignStore(v) => format!("declare-store\x1B[0m {} \x1B[37m({})", &program.names[*v], v),
            Instruction::EndScope => "end-scope".to_owned(),
            Instruction::PopJump => "pop-jump".to_owned(),
            Instruction::JumpTo(_) => todo!(),
            Instruction::ConditionalJumpTo(_) => todo!(),
            Instruction::JumpTarget(_) => todo!(),
        });
    }
}