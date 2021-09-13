/* Generated file */
import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword } from './tokens';
import { TokenGenerator } from './parser';
export class Expression {
    expr: NumberLiteral | StringLiteral | BooleanLiteral | Identifier | AddExpression | SubstractExpression | MultiplyExpression | DivideExpression | Block | Lambda | Group | FunctionCall | FieldAccess | VariableDeclaration | ConstantDeclaration;
}
export class Group {
    expr: Expression;
}
export class AddExpression {
    left: Expression;
    right: Expression;
}
export class SubstractExpression {
    left: Expression;
    right: Expression;
}
export class MultiplyExpression {
    left: Expression;
    Right: Expression;
}
export class DivideExpression {
    left: Expression;
    Right: Expression;
}
export class Statement {
    expr: Expression;
}
export class StatementList {
    car: Statement;
    cdr: StatementList;
}
export class Block {
    list: StatementList;
}
export class TypelessArgumentList {
    car: Identifier;
    cdr: TypelessArgumentList;
}
export class Lambda {
    args: TypelessArgumentList;
    body: Expression | Block;
}
export class Arguments {
    car: Expression;
    cdr: Arguments;
}
export class FunctionCall {
    fn: Expression;
    args: Arguments;
}
export class Type {
    type: Identifier;
    generic: Type;
}
export class FieldAccess {
    obj: Expression;
    field: Identifier;
}
export class VariableDeclaration {
    name: Identifier;
    value: Expression;
    type: Type;
}
export class ConstantDeclaration {
    name: Identifier;
    value: Expression;
    type: Type;
}
