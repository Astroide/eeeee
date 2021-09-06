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
        parsing: while (!this.reader.done()) {
            var tokenText = this.reader.next();
            if (tokenText) {
                if (tokenText == '/') {
                    if (this.reader.peek() == '/') {
                        while (this.reader.peek() != '\n' && !this.reader.done())
                            this.reader.next();
                        if (!this.reader.done())
                            this.reader.next();
                        continue parsing;
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
                        continue parsing;
                    }
                }
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
                        tokens.push(new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                    else if (this.reader.peek() == 'o') {
                        var line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Octal
                        this.reader.next();
                        tokenText = '';
                        if (!/[0-7\.]/.test(this.reader.peek())) {
                            var invalidCharacted = this.reader.next();
                            (0, utilities_1.panicAt)(this.reader, '[ESCE00003] Octal numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                        }
                        tokenText = '';
                        while (this.reader.peek() != '.' && /[0-7]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[0-7]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        var value = 0;
                        value += parseInt(tokenText.split('.')[0], 8);
                        if (tokenText.includes('.')) {
                            var decimalPart = tokenText.split('.')[1];
                            for (var i = 0; i < decimalPart.length; i++) {
                                var digit = parseInt(decimalPart[i], 8);
                                value += digit / Math.pow(8, i + 1);
                            }
                        }
                        tokens.push(new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                    else if (this.reader.peek() == 'b') {
                        var line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Binary
                        this.reader.next();
                        tokenText = '';
                        if (!/[01\.]/.test(this.reader.peek())) {
                            var invalidCharacted = this.reader.next();
                            (0, utilities_1.panicAt)(this.reader, '[ESCE00007] Binary numbers must contain at least one digit', this.reader.currentLine, this.reader.currentCharacter - 1, invalidCharacted);
                        }
                        tokenText = '';
                        while (this.reader.peek() != '.' && /[01]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[01]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        var value = 0;
                        value += parseInt(tokenText.split('.')[0], 2);
                        if (tokenText.includes('.')) {
                            var decimalPart = tokenText.split('.')[1];
                            for (var i = 0; i < decimalPart.length; i++) {
                                var digit = parseInt(decimalPart[i], 2);
                                value += digit / Math.pow(2, i + 1);
                            }
                        }
                        tokens.push(new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length + 2, value));
                        continue parsing;
                    }
                }
                decimalParsing: do {
                    if (/[0-9\.]/.test(tokenText)) {
                        var line = this.reader.currentLine, char = this.reader.currentCharacter - 1, start = this.reader.current - 1;
                        // Decimal
                        while (this.reader.peek() != '.' && /[0-9]/.test(this.reader.peek())) {
                            tokenText += this.reader.next();
                        }
                        if (this.reader.peek() == '.') {
                            tokenText += '.';
                            this.reader.next();
                            while (/[0-9]/.test(this.reader.peek())) {
                                tokenText += this.reader.next();
                            }
                        }
                        if (tokenText)
                            break decimalParsing;
                        var value = 0;
                        value += parseInt(tokenText.split('.')[0], 10);
                        if (tokenText.includes('.')) {
                            var decimalPart = tokenText.split('.')[1];
                            for (var i = 0; i < decimalPart.length; i++) {
                                var digit = parseInt(decimalPart[i], 10);
                                value += digit / Math.pow(10, i + 1);
                            }
                        }
                        tokens.push(new tokens_1.NumberLiteral(line, char, this.reader.source, start, tokenText.length, value));
                        continue parsing;
                    }
                } while (false);
                if (/('|")/.test(tokenText)) {
                    var delimiter = tokenText;
                    var line = this.reader.currentLine, character = this.reader.currentCharacter - 1, position = this.reader.current - 1;
                    var stringContents = '';
                    while (this.reader.peek() != delimiter && !this.reader.done()) {
                        var char = this.reader.next();
                        if (char != '\\') {
                            stringContents += char;
                        }
                        else {
                            var next = this.reader.next();
                            if (next == '\\') {
                                stringContents += '\\';
                            }
                            else if (next == '\n') {
                                // Nothing here
                            }
                            else if (next == 'n') {
                                stringContents += '\n';
                            }
                            else if (next == "'") {
                                stringContents += "'";
                            }
                            else if (next == '"') {
                                stringContents += '"';
                            }
                            else {
                                (0, utilities_1.panicAt)(this.reader, "[ESCE00006] Invalid escape sequence: \\" + next, this.reader.currentLine, this.reader.currentCharacter - 2, '\\' + next);
                            }
                        }
                    }
                    if (this.reader.done() && this.reader.peek() != delimiter) {
                        (0, utilities_1.panicAt)(this.reader, "[ESCE00004] Endless string\nString was started here:", line, character, delimiter);
                    }
                    this.reader.next();
                    tokens.push(new tokens_1.StringLiteral(line, character, this.reader.source, position, this.reader.current - position, stringContents));
                    continue parsing;
                }
                if ('[]{}()/,.'.includes(tokenText)) {
                    // Tokens of only one character
                    var type = {
                        '[': tokens_1.TokenType.LeftBracket,
                        ']': tokens_1.TokenType.RightBracket,
                        '{': tokens_1.TokenType.LeftCurlyBracket,
                        '}': tokens_1.TokenType.RightCurlyBracket,
                        '(': tokens_1.TokenType.LeftParen,
                        ')': tokens_1.TokenType.RightParen,
                        '/': tokens_1.TokenType.Slash,
                        ',': tokens_1.TokenType.Comma,
                        '.': tokens_1.TokenType.Dot
                    }[tokenText];
                    tokens.push(new tokens_1.Token(this.reader.currentLine, this.reader.currentCharacter - 1, this.reader.source, type, this.reader.current - 1, 1));
                    continue parsing;
                }
                if ('+-*=&|'.includes(tokenText)) {
                    var table = {
                        '+': tokens_1.TokenType.Plus,
                        '++': tokens_1.TokenType.PlusPlus,
                        '-': tokens_1.TokenType.Minus,
                        '--': tokens_1.TokenType.MinusMinus,
                        '*': tokens_1.TokenType.Star,
                        '**': tokens_1.TokenType.StarStar,
                        '=': tokens_1.TokenType.Equals,
                        '==': tokens_1.TokenType.DoubleEquals,
                        '&': tokens_1.TokenType.Ampersand,
                        '&&': tokens_1.TokenType.DoubleAmpersand,
                        '|': tokens_1.TokenType.Pipe,
                        '||': tokens_1.TokenType.DoublePipe
                    };
                    if (this.reader.peek() == tokenText) {
                        tokenText += this.reader.next();
                    }
                    tokens.push(new tokens_1.Token(this.reader.currentLine, this.reader.currentCharacter - tokenText.length, this.reader.source, table[tokenText], this.reader.current - tokenText.length, tokenText.length));
                    continue parsing;
                }
            }
        }
        return tokens;
    };
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map