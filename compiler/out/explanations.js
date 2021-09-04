"use strict";
exports.__esModule = true;
exports.errorAndWarningExplanations = void 0;
exports.errorAndWarningExplanations = {
    E00001: 'This error happens when there are more block comment starts (/*) than there are block comment ends (*/) in a source file. This might be happening because block comments in Escurieux nest, so /* /* */ (which would be valid in many programming languages) is not valid in Escurieux.',
    E00002: 'This error happens because there is a hexadecimal number start \'0x\' that is not followed by a dot or at least one hexadecimal digit.',
    W00001: 'This warning is shown when a number literal starts with one or more extra zeroes, as in 0123, 0893.034 or 0023. If this was intended to be an octal literal, it should have been written like this : 0o123 instead of 0123 or 00123.'
};
//# sourceMappingURL=explanations.js.map