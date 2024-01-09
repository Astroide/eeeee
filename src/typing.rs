use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct TypeId(usize);

#[derive(Debug, Clone)]
pub enum Type {
    U8,
    U16,
    U32,
    U64,
    I8,
    I16,
    I32,
    I64,
    F32,
    F64,
    Char,
    Bool,
    Ref(Box<Type>),
    RefMut(Box<Type>),
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Integer {
    U8,
    U16,
    U32,
    U64,
    I8,
    I16,
    I32,
    I64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Float {
    F32,
    F64,
}

#[derive(Debug, Clone)]
pub enum TypeInfo {
    // built-in types
    Integer(Option<Integer>),
    Float(Option<Float>),
    Char,
    Bool,
    
    // references
    RefTo(TypeId),
    RefMutTo(TypeId),

    // meta
    Ref(TypeId),
    Unknown,
}

#[derive(Debug, Default)]
pub struct Machine {
    id_counter: usize,
    vars: HashMap<TypeId, TypeInfo>,
}

impl Machine {
    pub fn insert(&mut self, info: TypeInfo) -> TypeId {
        let id = TypeId(self.id_counter);
        self.id_counter += 1;
        self.vars.insert(id, info);
        id
    }

    pub fn unify(&mut self, a: TypeId, b: TypeId) -> Result<(), String> {
        match (self.vars[&a].clone(), self.vars[&b].clone()) {
            (TypeInfo::Ref(a), _) => self.unify(a, b),
            (_, TypeInfo::Ref(a)) => self.unify(a, b),

            (TypeInfo::Unknown, _) => { self.vars.insert(a, TypeInfo::Ref(b)); Ok(()) },
            (_, TypeInfo::Unknown) => { self.vars.insert(b, TypeInfo::Ref(a)); Ok(()) },

            (TypeInfo::Bool, TypeInfo::Bool) => Ok(()),
            (TypeInfo::Integer(Some(a)), TypeInfo::Integer(Some(b))) if a == b => Ok(()),
            (TypeInfo::Float(Some(a)), TypeInfo::Float(Some(b))) if a == b => Ok(()),
            (TypeInfo::Integer(Some(_)), TypeInfo::Integer(None)) => { self.vars.insert(a, TypeInfo::Ref(b)); Ok(()) },
            (TypeInfo::Integer(None), TypeInfo::Integer(Some(_))) => { self.vars.insert(b, TypeInfo::Ref(a)); Ok(()) },
            (TypeInfo::Float(Some(_)), TypeInfo::Float(None)) => { self.vars.insert(a, TypeInfo::Ref(b)); Ok(()) },
            (TypeInfo::Float(None), TypeInfo::Float(Some(_))) => { self.vars.insert(b, TypeInfo::Ref(a)); Ok(()) },

            (TypeInfo::RefTo(a_item), TypeInfo::RefTo(b_item)) => self.unify(a_item, b_item),
            (TypeInfo::RefMutTo(a_item), TypeInfo::RefMutTo(b_item)) => self.unify(a_item, b_item),

            (a, b) => Err(format!("Conflict between {:?} and {:?}", a, b)),
        }
    }

    pub fn reconstruct(&self, id: TypeId) -> Result<Type, String> {
        macro_rules! num_match_arms {
            ($e:expr, $src:ident, $($x:ident)+) => {
                match $e { $($src::$x => Type::$x,)+ }
            }
        }

        match self.vars[&id] {
            TypeInfo::Unknown => Err(format!("Cannot infer")),
            TypeInfo::Ref(id) => self.reconstruct(id),
            TypeInfo::Bool => Ok(Type::Bool),
            TypeInfo::Char => Ok(Type::Char),
            TypeInfo::RefTo(id) => Ok(Type::Ref(Box::new(self.reconstruct(id)?))),
            TypeInfo::RefMutTo(id) => Ok(Type::RefMut(Box::new(self.reconstruct(id)?))),
            TypeInfo::Integer(Some(i)) => Ok(num_match_arms!(i, Integer, U8 U16 U32 U64 I8 I16 I32 I64)),
            TypeInfo::Float(Some(i)) => Ok(num_match_arms!(i, Float, F32 F64)),
            TypeInfo::Integer(None) => Ok(Type::I32),
            TypeInfo::Float(None) => Ok(Type::F64),
        }
    }
}