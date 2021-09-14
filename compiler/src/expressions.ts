/* Generated file */
import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword } from './tokens';
export class Expression {
    static priority = 0;
    expr: NumberLiteral | StringLiteral | BooleanLiteral | Identifier | AddExpression | SubstractExpression | MultiplyExpression | DivideExpression | Block | Lambda | Group | FunctionCall | FieldAccess | VariableDeclaration | ConstantDeclaration;
}
export class Group {
    static priority = 0;
    expr: Expression;
}
export class AddExpression {
    static priority = 0;
    left: Expression;
    right: Expression;
}
export class SubstractExpression {
    static priority = 0;
    left: Expression;
    right: Expression;
}
export class MultiplyExpression {
    static priority = 0;
    left: Expression;
    Right: Expression;
}
export class DivideExpression {
    static priority = 0;
    left: Expression;
    Right: Expression;
}
export class Statement {
    static priority = 0;
    expr: Expression;
}
export class StatementList {
    static priority = 0;
    car: Statement;
    cdr: StatementList;
}
export class Block {
    static priority = 0;
    list: StatementList;
}
export class TypelessArgumentList {
    static priority = 0;
    car: Identifier;
    cdr: TypelessArgumentList;
}
export class Lambda {
    static priority = 0;
    args: TypelessArgumentList;
    body: Expression | Block;
}
export class Arguments {
    static priority = 0;
    car: Expression;
    cdr: Arguments;
}
export class FunctionCall {
    static priority = 0;
    fn: Expression;
    args: Arguments;
}
export class Type {
    static priority = 0;
    type: Identifier;
    generic: Type;
}
export class FieldAccess {
    static priority = 0;
    obj: Expression;
    field: Identifier;
}
export class VariableDeclaration {
    static priority = 0;
    name: Identifier;
    value: Expression;
    type: Type;
}
export class ConstantDeclaration {
    static priority = 0;
    name: Identifier;
    value: Expression;
    type: Type;
}
