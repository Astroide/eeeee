"use strict";
exports.__esModule = true;
exports.Parser = void 0;
var tokens_1 = require("./tokens");
var utilities_1 = require("./utilities");
var Parser = /** @class */ (function () {
    function Parser(source) {
        this.reader = new utilities_1.StringReader(source);
    }
    Parser.prototype.parse = function () {
        var tokens = [];
        while (!this.reader.done()) {
            var tokenText = this.reader.next();
            if (tokenText)
                if (tokenText == '/') {
                    if (this.reader.peek() == '/') {
                        while (this.reader.peek() != '\n')
                            this.reader.next();
                        this.reader.next();
                        continue;
                    }
                    else if (this.reader.peek() == '*') {
                        var depth = 1;
                        while (depth > 0 && !this.reader.done()) {
                            var char = this.reader.next();
                            if (char == '/' && this.reader.peek() == '*') {
                                this.reader.next();
                                depth++;
                            }
                            else if (char == '*' && this.reader.peek() == '/') {
                                this.reader.next();
                                depth--;
                            }
                        }
                        if (this.reader.done() && depth != 0) {
                            (0, utilities_1.panicAt)(this.reader, "[ESCE00001] Comments opened with /* must be closed before EOF.\nNote: there " + (depth == 1 ? 'was' : 'were') + " " + depth + " level" + (depth == 1 ? '' : 's') + " of comment nesting when EOF was reached.", this.reader.lineCount() - 1, 0, this.reader.getLine(this.reader.lineCount() - 1).slice(0, -1));
                        }
                    }
                }
                else {
                    if (tokenText == '0') {
                        if (/[0-9]/.test(this.reader.peek())) {
                            // Decimal, warn because of leading zero
                            (0, utilities_1.warnAt)(this.reader, '[ESCW00001] Leading zero in number literal', this.reader.currentLine, this.reader.currentCharacter - 1, '0');
                        }
                        else if (this.reader.peek() == 'x') {
                            var line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                            // Hexadecimal
                            this.reader.next();
                            tokenText = '';
                            if (!/[0-9\.A-Fa-f]/.test(this.reader.peek())) {
                                var invalidCharacted = this.reader.next();
                                (0, utilities_1.panicAt)(this.reader, '[ESCE00002] Hexadecimal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                            }
                            tokenText = '';
                            while (this.reader.peek() != '.' && /[0-9A-Fa-f]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                            if (this.reader.peek() == '.') {
                                tokenText += '.';
                                this.reader.next();
                                while (/[0-9A-Fa-f]/.test(this.reader.peek())) {
                                    tokenText += this.reader.next();
                                }
                            }
                            var value = 0;
                            value += parseInt(tokenText.split('.')[0], 16);
                            if (tokenText.includes('.')) {
                                var decimalPart = tokenText.split('.')[1];
                                for (var i = 0; i < decimalPart.length; i++) {
                                    var digit = parseInt(decimalPart[i], 16);
                                    value += digit / Math.pow(16, i + 1);
                                }
                            }
                            tokens.push(new tokens_1.NumberLiteral(line, char, '0x' + tokenText, start, tokenText.length + 2, value));
                        }
                    }
                }
        }
        return tokens;
    };
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map