import { TokenType } from './tokens';

export const errorAndWarningExplanations: { [x: string]: string } = {
    E00001: 'Comments opened with /* must be closed before EOF: This error happens when there are more block comment starts (/*) than there are block comment ends (*/) in a source file. This might be happening because block comments in Escurieux nest, so /* /* */ (which would be valid in many programming languages) is not valid in Escurieux.',
    E00002: 'Hexadecimal numbers must contain at least one digit: This error happens because there is a hexadecimal number start \'0x\' that is not followed by a dot or at least one hexadecimal digit (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, A / a, B / b, C / c, D / d, E / e or F / f).',
    E00003: 'Octal numbers must contain at least one digit: This error happens because there is a octal number start \'0o\' that is not followed by a dot or at least one octal digit (0, 1, 2, 3, 4, 5, 6, 7).',
    E00004: 'Endless string: This error happens when a string has no terminating character and thus runs to the end of the file.',
    E00005: 'Trying to access a character past EOF: This error happens when the parser is trying to get a character past the end of the file. This is usually caused when a backslash is the last character of a string that is not terminated or when an hexadecimal (0x), binary (0b) or octal (0o) number start is at the end of the file, followed by no digits.',
    E00006: 'Invalid escape sequence: This error happens when a backslash \'\\\' in a string is not followed by a valid character to escape. These valid characters are the following: newline, \'n\', \'\\\', \'\'\' and \'"\'.',
    E00007: 'Binary numbers must contain at least one digit: This error happens because there is a binary number start \'0b\' that is not followed by a dot or at least one binary digit (0, 1).',
    E00008: 'Invalid character : This error is raised when an unrecognized character is read in the source code.',
    E00009: 'Cannot escape a newline in a character literal : This error is raised when a newline is escaped within a character literal, which makes no sense because character literals are supposed to be one character long.',
    W00001: 'Leading zero in number literal: This warning is shown when a number literal starts with one or more extra zeroes, as in 0123, 0893.034 or 0023. If this was intended to be an octal literal, it should have been written like this : 0o123 instead of 0123 or 00123.',
};

export const tokenTypeExplanations: Map<TokenType, string> = new Map<TokenType, string>();
[
    [TokenType.Identifier, 'an identifier, e.g. myVariable'],
    [TokenType.LeftBracket, '\'[\''],
    [TokenType.RightBracket, '\']\''],
    [TokenType.LeftCurlyBracket, '\'{\''],
    [TokenType.RightCurlyBracket, '\'}\''],
    [TokenType.LeftAngleBracket, '\'<\''],
    [TokenType.RightAngleBracket, '\'>\''],
    [TokenType.LeftParen, '\'(\''],
    [TokenType.RightParen, '\')\'']
].forEach(
    ([type, explanation]) =>
        tokenTypeExplanations.set(<TokenType>type, <string>explanation));