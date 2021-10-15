"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypeExplanations = exports.errorAndWarningExplanations = void 0;
const tokens_1 = require("./tokens");
exports.errorAndWarningExplanations = {
    E00001: 'Comments opened with /* must be closed before EOF: This error happens when there are more block comment starts (/*) than there are block comment ends (*/) in a source file. This might be happening because block comments in Escurieux nest, so /* /* */ (which would be valid in many programming languages) is not valid in Escurieux.',
    E00002: 'Hexadecimal numbers must contain at least one digit: This error happens because there is a hexadecimal number start \'0x\' that is not followed by a dot or at least one hexadecimal digit (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, A / a, B / b, C / c, D / d, E / e or F / f).',
    E00003: 'Octal numbers must contain at least one digit: This error happens because there is a octal number start \'0o\' that is not followed by a dot or at least one octal digit (0, 1, 2, 3, 4, 5, 6, 7).',
    E00004: 'Endless string: This error happens when a string has no terminating character and thus runs to the end of the file.',
    E00005: 'Trying to access a character past EOF: This error happens when the parser is trying to get a character past the end of the file. This is usually caused when a backslash is the last character of a string that is not terminated or when an hexadecimal (0x), binary (0b) or octal (0o) number start is at the end of the file, followed by no digits.',
    E00006: 'Invalid escape sequence: This error happens when a backslash \'\\\' in a string is not followed by a valid character to escape. These valid characters are the following: newline, \'n\', \'\\\', \'\'\' and \'"\'.',
    E00007: 'Binary numbers must contain at least one digit: This error happens because there is a binary number start \'0b\' that is not followed by a dot or at least one binary digit (0, 1).',
    E00008: 'Invalid character : This error is raised when an unrecognized character is read in the source code.',
    E00009: 'Cannot escape a newline in a character literal : This error is raised when a newline is escaped within a character literal, which makes no sense because character literals are supposed to be one character long.',
    E00010: 'Expected TokenType.<token type>, got <text> : <explanation> : This means the compiler expected a particular token (e.g. a closing parenthesis) but another token was found instead.',
    E00011: 'Only commas to separate (function arguments | type parameters | indexes | arguments) and an optional trailing comma are allowed : this error is show when either there is a leading comma (e.g. Map[,string, int]) or a double comma (e.g. fn(1,, 8)).',
    E00012: '(Arguments | Indices) should be separated by commas : This happens when a function is called / something is indexed with multiple arguments / indices that aren\'t separated with commas (e.g. func(1 2)). Arguments (or indices) should always be comma-separated.',
    E00014: 'Unexpected empty type parameters : This error is shown when a type has empty type parameters (e.g. Map[]). This means you need to add the missing type parameters or remove the [] if the type requires no type parameters.',
    E00015: 'A left parenthesis is required to start a function\'s argument list : function expressions (fn funcName(arg1: int, arg2: int) int {}) are required to have an argument list (the (arg1: int, arg2: int) part) enclosed in parentheses.',
    E00016: 'Function arguments must be typed : This error is shown when a function\'s argument is untyped. Function arguments always need to be typed (e.g. fn funcName(argName: Type) {}) to make work easier for the type inference system (and because it is very hard for it to guess the types of the arguments from function usage).',
    E00017: 'Parentheses in \':\' type constraints must contain something : In trait requirements that require multiple traits to be implemented in type constraints (e.g. class Cls[T: (A, B)] {...}), the parentheses must contain something, otherwise they\'re useless and you can take them away.',
    E00018: 'Leading or double commas are not allowed in classes : In classes (class Class { ... }), commas are required to separated methods or properties, and an optional trailing comma is allowed, but nothing else.',
    E00019: 'Left expression of an assignment must be either an identifier, a property access or an indexing expression : this means that you are trying to assign a value to something that is not assignable. Examples of this include \'1 + 1 = 2\', which is invalid because the only types of expression that can be assigned to are identifiers (variable / constant names), property access expressions (i.e. an expression, followed by a dot and anything matching /[A-Za-z_][A-Za-z0-9_]*/), and indexing expressions (e.g. x[0]).',
    E00020: 'Expected \'}\' after expression in template string : in template strings (delimited by \'`\' characters), expressions inserted via ${expr} are required to be closed by a closing curly bracket \'}\'.',
    E99999: 'An error happened in the parser. Please report this to https://github.com/Astroide/escurieux/issues so that it can be fixed.',
    W00001: 'Leading zero in number literal: This warning is shown when a number literal starts with one or more extra zeroes, as in 0123, 0893.034 or 0023. If this was intended to be an octal literal, it should have been written like this : 0o123 instead of 0123 or 00123.',
    W00002: 'The \'private\' access specifier is not required, properties and methods are private by default : This means that you needn\'t add the \'private\' access modifier before a property or a method, because unless specified otherwise, they\'re already private and it\'d be redundant.',
    W00003: 'Dollar signs \'$\' are not required to be escaped within template strings if they aren\'t followed by a \'{\' : in template strings, the only use of escaping dollar signs is if they are followed by an opening curly bracket, because otherwise the contents of the string after the expression could be misinterpreted as part of that expression. For example, in the template string `number = ${3 + 2`, the expression could be either 3 or 3 + 2, and the parser won\'t try to guess what you meant, as it is deterministic.'
};
exports.tokenTypeExplanations = new Map();
[
    [tokens_1.TokenType.Identifier, 'an identifier, e.g. myVariable'],
    [tokens_1.TokenType.LeftBracket, '['],
    [tokens_1.TokenType.RightBracket, ']'],
    [tokens_1.TokenType.LeftCurlyBracket, '{'],
    [tokens_1.TokenType.RightCurlyBracket, '}'],
    [tokens_1.TokenType.LeftAngleBracket, '<'],
    [tokens_1.TokenType.RightAngleBracket, '>'],
    [tokens_1.TokenType.LeftParenthesis, '('],
    [tokens_1.TokenType.RightParenthesis, ')'],
    [tokens_1.TokenType.Ampersand, '&'],
    [tokens_1.TokenType.Pipe, '|'],
    [tokens_1.TokenType.DoubleAmpersand, '&&'],
    [tokens_1.TokenType.DoublePipe, '||'],
].map(([a, b]) => [a, `'${b}'`]).forEach(([type, explanation]) => exports.tokenTypeExplanations.set(type, explanation));
//# sourceMappingURL=explanations.js.map