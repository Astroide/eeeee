import tokens as Tokens

class Expression:
    def __repr__(self):
        raise BaseException("undefined __repr__")

class BinaryExpression(Expression):
    def __init__(self, left: Expression, operator: Tokens.Token, right: Expression):
        self.left = left
        self.operator = operator
        self.right = right
    
    def __repr__(self) -> str:
        return f'bin ({repr(self.left)}, {self.operator.type}, {repr(self.right)})'