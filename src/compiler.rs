use std::collections::HashMap;

use crate::{expressions::{Expression, Expr, UnaryOp, BinaryOp}, vm, ice::ice, tokens::IntLiteralType};

#[derive(Debug)]
#[must_use]
pub(crate) struct Target(usize);

#[derive(Debug, Default)]
pub struct ProgramBuilder {
    instructions: Vec<vm::Instruction>,
    constants: Vec<vm::Value>,
    names: Vec<String>,
    target_no: usize,
    end_stuff: Vec<(Option<vm::Instruction>, ProgramBuilder)>,
}

impl ProgramBuilder {
    pub fn new() -> ProgramBuilder {
        Self {
            instructions: vec![],
            constants: vec![],
            names: vec![],
            target_no: 0,
            end_stuff: vec![]
        }
    }

    pub fn add_constant(&mut self, constant: vm::Value) -> usize {
        for (index, value) in self.constants.iter().enumerate() {
            if *value == constant {
                return index
            }
        };
        self.constants.push(constant);
        self.constants.len() - 1
    }

    pub fn add_name(&mut self, name: &String) -> usize {
        for (index, value) in self.names.iter().enumerate() {
            if value == name {
                return index
            }
        };
        self.names.push(name.clone());
        self.names.len() - 1
    }

    pub fn emit(&mut self, instruction: vm::Instruction) {
        self.instructions.push(instruction)
    }

    pub fn target(&mut self) -> usize {
        self.instructions.push(vm::Instruction::JumpTarget(self.target_no));
        self.target_no += 1;
        self.target_no - 1
    }

    pub(crate) fn reserve_target(&mut self) -> Target {
        self.target_no += 1;
        Target(self.target_no - 1)
    }

    pub(crate) fn add_reserved(&mut self, t: Target) {
        self.instructions.push(vm::Instruction::JumpTarget(t.0))
    }

    pub fn stack_padding(&mut self) {
        self.instructions.push(vm::Instruction::PushNothing)
    }

    pub fn flattened(mut self) -> Self {
        for (maybe_instruction, element) in self.end_stuff.into_iter().map(|x| (x.0, x.1.flattened())) {
            macro_rules! self_add_constant {
                ($cst:expr) => {'self_add_block: {
                    let constant = $cst;
                    for (index, value) in self.constants.iter().enumerate() {
                        if *value == constant {
                            break 'self_add_block index
                        }
                    };
                    self.constants.push(constant);
                    self.constants.len() - 1
                }}
            }
            macro_rules! self_add_name {
                ($name:expr) => {'self_add_block: {
                    let name = $name;
                    for (index, value) in self.names.iter().enumerate() {
                        if value == name {
                            break 'self_add_block index
                        }
                    };
                    self.names.push(name.clone());
                    self.names.len() - 1
                }}
            }
            self.instructions.push(vm::Instruction::Terminate);
            if let Some(i) = maybe_instruction {
                self.instructions.push(i);
            }
            let mut jump_map = HashMap::<usize, usize>::new();
            let mut constant_map = HashMap::<usize, usize>::new();
            let mut name_map = HashMap::<usize, usize>::new();
            for instruction in element.instructions.iter() {
                match instruction {
                    vm::Instruction::JumpTarget(n) => {
                        self.target_no += 1;
                        let new_n = self.target_no - 1;
                        jump_map.insert(*n, new_n);
                    },
                    _ => ()
                }
            }
            for (in_, val) in element.constants.iter().enumerate() {
                match val {
                    vm::Value::Fn(jump_target) => {
                        let out = self_add_constant!(vm::Value::Fn(*jump_map.get(jump_target).unwrap()));
                        constant_map.insert(in_, out);
                    },
                    val => {
                        let out = self_add_constant!(val.clone());
                        constant_map.insert(in_, out);
                    }
                }
            }
            for (in_, name) in element.names.iter().enumerate() {
                let out = self_add_name!(name);
                name_map.insert(in_, out);
            }
            for instruction in element.instructions {
                let out = match instruction {
                    vm::Instruction::LoadConst(n) => {
                        vm::Instruction::LoadConst(*constant_map.get(&n).unwrap())
                    },
                    vm::Instruction::LoadVar(n) => {
                        vm::Instruction::LoadVar(*name_map.get(&n).unwrap())
                    },
                    vm::Instruction::Store(n) => {
                        vm::Instruction::Store(*name_map.get(&n).unwrap())
                    },
                    vm::Instruction::AssignStore(n) => {
                        vm::Instruction::AssignStore(*name_map.get(&n).unwrap())
                    },
                    vm::Instruction::JumpTarget(n) => {
                        vm::Instruction::JumpTarget(*jump_map.get(&n).unwrap())
                    },
                    vm::Instruction::JumpTo(target) => {
                        vm::Instruction::JumpTo(*jump_map.get(&target).unwrap())
                    },
                    vm::Instruction::ConditionalJumpTo(target) => {
                        vm::Instruction::ConditionalJumpTo(*jump_map.get(&target).unwrap())
                    },
                    vm::Instruction::JumpRefTo(target) => {
                        vm::Instruction::JumpRefTo(*jump_map.get(&target).unwrap())
                    },
                    anything => anything
                };
                self.instructions.push(out);
            }
        };
        self.end_stuff = vec![];
        self
    }

    pub fn finish(self) -> vm::Program {
        self.flattened().finish_()
    }

    fn finish_(mut self) -> vm::Program {
        let mut new_instructions = Vec::<vm::Instruction>::with_capacity(self.instructions.len());
        self.instructions.reverse();
        while self.instructions.len() > 0 {
            let instruction = self.instructions.pop().unwrap();
            if matches!(instruction, vm::Instruction::PushNothing) {
                if self.instructions.len() > 0 {
                    if matches!(self.instructions[self.instructions.len() - 1], vm::Instruction::Discard) {
                        self.instructions.pop();
                        continue
                    }
                }
            }
            new_instructions.push(instruction);
        }
        vm::Program {
            instructions: new_instructions.iter().map(|instruction| {
                match instruction {
                    vm::Instruction::JumpTarget(_) => vm::Instruction::Null,
                    vm::Instruction::JumpTo(target) => {
                        // eprintln!("{}", target);
                        let position = new_instructions.iter().position(|x| matches!(x, vm::Instruction::JumpTarget(k) if k == target)).unwrap();
                        vm::Instruction::Jump(position)
                    },
                    vm::Instruction::ConditionalJumpTo(target) => {
                        let position = new_instructions.iter().position(|x| matches!(x, vm::Instruction::JumpTarget(k) if k == target)).unwrap();
                        vm::Instruction::ConditionalJump(position)
                    },
                    vm::Instruction::JumpRefTo(target) => {
                        let position = new_instructions.iter().position(|x| matches!(x, vm::Instruction::JumpTarget(k) if k == target)).unwrap();
                        vm::Instruction::PushJumpRef(position)
                    }
                    any => any.clone(),
                }
            }).collect::<Vec<_>>(),
            constants: self.constants.into_iter().map(|x| {
                match x {
                    vm::Value::Fn(k) => vm::Value::Fn(new_instructions.iter().position(|x| matches!(x, vm::Instruction::JumpTarget(n) if k == *n)).unwrap()),
                    anything_else => anything_else,
                }
            }).collect::<Vec<_>>(),
            names: self.names,
        }
    }
}

pub fn lower(expression: &Expression, builder: &mut ProgramBuilder) {
    match &expression.et {
        Expr::Literal { src } => match src {
            crate::tokens::TokenType::ILiteral { value, kind, .. } => {
                let constant = builder.add_constant(vm::Value::Num(match kind {
                    IntLiteralType::Hexadecimal => i64::from_str_radix(value, 16).unwrap() as f64,
                    IntLiteralType::Decimal => value.parse::<f64>().unwrap(),
                    IntLiteralType::Octal => i64::from_str_radix(value, 8).unwrap() as f64,
                    IntLiteralType::Binary => i64::from_str_radix(value, 2).unwrap() as f64,
                }));
                builder.emit(vm::Instruction::LoadConst(constant))
            },
            crate::tokens::TokenType::FLiteral { value, .. } => {
                let constant = builder.add_constant(vm::Value::Num(value.parse::<f64>().unwrap() /* handle this in a better way...? */));
                builder.emit(vm::Instruction::LoadConst(constant))
            },
            crate::tokens::TokenType::SLiteral { value, .. } => {
                let constant = builder.add_constant(vm::Value::Str(value.clone()));
                builder.emit(vm::Instruction::LoadConst(constant))
            },
            crate::tokens::TokenType::BLiteral(val) => {
                let constant = builder.add_constant(vm::Value::Bool(*val));
                builder.emit(vm::Instruction::LoadConst(constant))
            },
            _ => ice!("literal is not a literal")
        },
        Expr::Unary { op, right } => {
            lower(right, builder);
            match op {
                UnaryOp::Neg  => builder.emit(vm::Instruction::Negate),
                UnaryOp::Not  => builder.emit(vm::Instruction::Invert),
                UnaryOp::Show => builder.emit(vm::Instruction::Show),
            }
        },
        Expr::Binary { op, left, right } => {
            lower(left, builder);
            lower(right, builder);
            builder.emit(match op {
                BinaryOp::Add => vm::Instruction::Add,
                BinaryOp::Sub => vm::Instruction::Subtract,
                BinaryOp::Mul => vm::Instruction::Multiply,
                BinaryOp::Div => vm::Instruction::Divide,
                BinaryOp::Exp => vm::Instruction::RaiseTo,
                BinaryOp::Eq  => vm::Instruction::CheckEquality,
                BinaryOp::Lt  => vm::Instruction::Lesser,
                BinaryOp::Gt  => vm::Instruction::Greater,
                BinaryOp::Leq => vm::Instruction::LesserEq,
                BinaryOp::Geq => vm::Instruction::GreaterEq,
                BinaryOp::Neq => vm::Instruction::CheckInequality,
            });
        },
        Expr::Semicolon { left, right } => {
            lower(left, builder);
            builder.emit(vm::Instruction::Discard);
            lower(right, builder);
        },
        Expr::Block(maybe_inside) => if let Some(inside) = maybe_inside {
            builder.emit(vm::Instruction::NewScope);
            lower(&inside, builder);
            builder.emit(vm::Instruction::EndScope);
        } else {
            builder.stack_padding()
        }, 
        Expr::Call { callee, args } => {
            let target = builder.reserve_target();
            builder.emit(vm::Instruction::JumpRefTo(target.0));
            for arg in args {
                lower(arg, builder);
            }
            lower(callee, builder);
            builder.emit(vm::Instruction::Call);
            builder.add_reserved(target);
        },
        Expr::Property { object, name } => todo!(),
        Expr::Break { with } => todo!(),
        Expr::Continue => todo!(),
        Expr::Use { imports } => todo!(),
        Expr::Loop { inside } => {
            // builder.emit(vm::Instruction::NewScope);
            let target = builder.target();
            lower(inside, builder);
            builder.emit(vm::Instruction::Discard);
            builder.emit(vm::Instruction::JumpTo(target));
            builder.stack_padding()
            // builder.emit(vm::Instruction::EndScope);
        },
        Expr::If { condition, then, else_ } => {
            lower(condition, builder);
            if let Some(else_) = else_ {
                let target = builder.reserve_target();
                let end_of_all = builder.reserve_target();
                builder.emit(vm::Instruction::Invert);
                builder.emit(vm::Instruction::ConditionalJumpTo(target.0));
                lower(then, builder);
                builder.emit(vm::Instruction::JumpTo(end_of_all.0));
                builder.add_reserved(target);
                lower(else_, builder);
                builder.add_reserved(end_of_all);
            } else {
                let target = builder.reserve_target();
                builder.emit(vm::Instruction::Invert);
                builder.emit(vm::Instruction::ConditionalJumpTo(target.0));
                lower(then, builder);
                builder.add_reserved(target);
            }
        },
        Expr::Assign { left, right } => {
            if let Expr::Identifier { ref id } = left.et {
                lower(right, builder);
                let name_index = builder.add_name(id);
                builder.emit(vm::Instruction::Store(name_index));
                builder.stack_padding()
            }
        },
        Expr::AssignOp { left, right, op } => {
            if let Expr::Identifier { ref id } = left.et {
                let name_index = builder.add_name(id);
                builder.emit(vm::Instruction::LoadVar(name_index));
                lower(right, builder);
                builder.emit(match op {
                    BinaryOp::Add => vm::Instruction::Add,
                    BinaryOp::Sub => vm::Instruction::Subtract,
                    BinaryOp::Mul => vm::Instruction::Multiply,
                    BinaryOp::Div => vm::Instruction::Divide,
                    BinaryOp::Exp => vm::Instruction::RaiseTo,
                    BinaryOp::Eq  => vm::Instruction::CheckEquality,
                    BinaryOp::Lt  => vm::Instruction::Lesser,
                    BinaryOp::Gt  => vm::Instruction::Greater,
                    BinaryOp::Leq => vm::Instruction::LesserEq,
                    BinaryOp::Geq => vm::Instruction::GreaterEq,
                    BinaryOp::Neq => vm::Instruction::CheckInequality,
                });
                builder.emit(vm::Instruction::Store(name_index));
                builder.stack_padding()
            }
        },
        Expr::Identifier { id } => {
            let name_index = builder.add_name(id);
            builder.emit(vm::Instruction::LoadVar(name_index))
        },
        Expr::Fn { name, body, args } => {
            let function_start = builder.reserve_target();
            let mut function_target = ProgramBuilder::new();
            function_target.emit(vm::Instruction::NewScope);
            for arg in args.iter().rev() {
                let name_index = function_target.add_name(arg);
                function_target.emit(vm::Instruction::AssignStore(name_index))
            }
            lower(body, &mut function_target);
            function_target.emit(vm::Instruction::EndScope);
            function_target.emit(vm::Instruction::Swap);
            function_target.emit(vm::Instruction::PopJump);
            let function = builder.add_constant(vm::Value::Fn(function_start.0));
            builder.emit(vm::Instruction::LoadConst(function));
            builder.emit(vm::Instruction::Duplicate);
            let name_index = builder.add_name(name);
            builder.emit(vm::Instruction::AssignStore(name_index));
            builder.end_stuff.push((Some(vm::Instruction::JumpTarget(function_start.0)), function_target))
        },
        Expr::Let { name, value } => {
            if let Some(x) = value {
                lower(x, builder);
                let name_index = builder.add_name(name);
                builder.emit(vm::Instruction::AssignStore(name_index));
                builder.stack_padding()
            }
        },
        Expr::While { condition, body } => {
            let target = builder.target();
            let end = builder.reserve_target();
            lower(condition, builder);
            builder.emit(vm::Instruction::Invert);
            builder.emit(vm::Instruction::ConditionalJumpTo(end.0));
            lower(body, builder);
            builder.emit(vm::Instruction::JumpTo(target));
            builder.add_reserved(end);
        }
    }
}