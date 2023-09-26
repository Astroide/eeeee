use crate::{expressions::{Expression, Expr, UnaryOp, BinaryOp}, vm, ice::ice};

#[derive(Debug, Default)]
pub struct ProgramBuilder {
    instructions: Vec<vm::Instruction>,
    constants: Vec<vm::Value>,
    names: Vec<String>,
    target_no: usize,
}

impl ProgramBuilder {
    pub fn new() -> ProgramBuilder {
        Self {
            instructions: vec![],
            constants: vec![],
            names: vec![],
            target_no: 0,
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

    pub fn stack_padding(&mut self) {
        self.instructions.push(vm::Instruction::PushNothing)
    }

    pub fn finish(mut self) -> vm::Program {
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
                    any => any.clone(),
                }
            }).collect::<Vec<_>>(),
            constants: self.constants,
            names: self.names,
        }
    }
}

pub fn lower(expression: &Expression, builder: &mut ProgramBuilder) {
    match &expression.et {
        Expr::Literal { src } => match src {
            crate::tokens::TokenType::ILiteral { value, kind, type_hint } => todo!(),
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
        Expr::Call { callee, args } => todo!(),
        Expr::Property { object, name } => todo!(),
        Expr::Break { with } => todo!(),
        Expr::Continue => todo!(),
        Expr::Use { imports } => todo!(),
        Expr::Loop { inside } => {
            // builder.emit(vm::Instruction::NewScope);
            let target = builder.target();
            lower(inside, builder);
            builder.emit(vm::Instruction::JumpTo(target));
            builder.stack_padding()
            // builder.emit(vm::Instruction::EndScope);
        },
        Expr::If { condition, then, else_ } => todo!(),
        Expr::Assign { left, right } => {
            if let Expr::Identifier { ref id } = left.et {
                lower(right, builder);
                let name_index = builder.add_name(id);
                builder.emit(vm::Instruction::Store(name_index));
                builder.stack_padding()
            }
        },
        Expr::AssignOp { left, right, op } => todo!(),
        Expr::Identifier { id } => {
            let name_index = builder.add_name(id);
            builder.emit(vm::Instruction::LoadVar(name_index))
        },
        Expr::Fn { name, body, args } => todo!(),
        Expr::Let { name, value } => {
            if let Some(x) = value {
                lower(x, builder);
                let name_index = builder.add_name(name);
                builder.emit(vm::Instruction::AssignStore(name_index));
                builder.stack_padding()
            }
        },
    }
}