from enum import Enum

typeid = 0

class TypeType(Enum):
    Terminal = 0
    Sum = 1
    Product = 2

class Type:
    def __init__(self, self_type: TypeType, *other_stuff):
        global typeid
        self.type        = self_type
        self.other_stuff = other_stuff
        self.type_id     = typeid
        typeid += 1
    
    def __repr__(self) -> str:
        return f'<typing_.Type {self.type_id} {str(self.type).replace("TypeType.", "")}>'