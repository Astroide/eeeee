"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstantDeclaration = exports.VariableDeclaration = exports.FieldAccess = exports.Type = exports.FunctionCall = exports.Arguments = exports.Lambda = exports.TypelessArgumentList = exports.Block = exports.StatementList = exports.Statement = exports.DivideExpression = exports.MultiplyExpression = exports.SubstractExpression = exports.AddExpression = exports.Group = exports.Expression = void 0;
class Expression {
}
exports.Expression = Expression;
Expression.priority = 0;
class Group {
}
exports.Group = Group;
Group.priority = 0;
class AddExpression {
}
exports.AddExpression = AddExpression;
AddExpression.priority = 2;
class SubstractExpression {
}
exports.SubstractExpression = SubstractExpression;
SubstractExpression.priority = 2;
class MultiplyExpression {
}
exports.MultiplyExpression = MultiplyExpression;
MultiplyExpression.priority = 3;
class DivideExpression {
}
exports.DivideExpression = DivideExpression;
DivideExpression.priority = 3;
class Statement {
}
exports.Statement = Statement;
Statement.priority = 1;
class StatementList {
}
exports.StatementList = StatementList;
StatementList.priority = 0;
class Block {
}
exports.Block = Block;
Block.priority = 0;
class TypelessArgumentList {
}
exports.TypelessArgumentList = TypelessArgumentList;
TypelessArgumentList.priority = 0;
class Lambda {
}
exports.Lambda = Lambda;
Lambda.priority = 0;
class Arguments {
}
exports.Arguments = Arguments;
Arguments.priority = 0;
class FunctionCall {
}
exports.FunctionCall = FunctionCall;
FunctionCall.priority = 6;
class Type {
}
exports.Type = Type;
Type.priority = 0;
class FieldAccess {
}
exports.FieldAccess = FieldAccess;
FieldAccess.priority = 7;
class VariableDeclaration {
}
exports.VariableDeclaration = VariableDeclaration;
VariableDeclaration.priority = 0;
class ConstantDeclaration {
}
exports.ConstantDeclaration = ConstantDeclaration;
ConstantDeclaration.priority = 0;
//# sourceMappingURL=expressions.js.map