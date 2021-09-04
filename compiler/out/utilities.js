"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
var _this = this;
exports.__esModule = true;
exports.readFile = exports.Result = exports.StringReader = exports.warnAt = exports.panicAt = exports.warn = exports.print = exports.panic = void 0;
var process_1 = require("process");
var promises_1 = require("fs/promises");
function panic(message) {
    console.error('\u001b[31mFatal error\u001b[0m: ' + message + '\nRun escurieux -h or escurieux --help for help.');
    (0, process_1.exit)(1);
}
exports.panic = panic;
function print(message) {
    console.error(message);
}
exports.print = print;
function warn(message) {
    console.error("\u001B[33mWarning\u001B[0m: " + message);
}
exports.warn = warn;
function doSomethingAt(fn, source, message, line, char, text) {
    var lineCount = source.lineCount();
    var lineText = source.getLine(line).slice(0, char) + '\u001b[7m' + text + '\u001b[0m' + source.getLine(line).slice(char + text.length);
    var currentLine = '';
    var errorOrWarningId = message.match(/\[ESC(W|E)\d\d\d\d\d\]/)[0].slice(1, -1);
    fn("\n" + message + "\nOn line " + (line + 1) + " at character " + (char + 1) + ":\n \u001B[34m" + (line - 1).toString().padEnd(6, ' ') + "      \u001B[0m| " + (line - 2 >= 0 ? (currentLine = source.getLine(line - 2)).slice(0, currentLine.length - 1) : '') + "\n \u001B[34m" + (line).toString().padEnd(6, ' ') + "      \u001B[0m| " + (line - 1 >= 0 ? (currentLine = source.getLine(line - 1)).slice(0, currentLine.length - 1) : '') + "\n \u001B[34m" + (line + 1).toString().padEnd(6, ' ') + " here >\u001B[0m " + lineText.slice(0, lineText.length - 1) + "\n \u001B[34m" + (line + 2).toString().padEnd(6, ' ') + "      \u001B[0m| " + (line + 1 < lineCount ? (currentLine = source.getLine(line + 1)).slice(0, currentLine.length - 1) : '<EOF>') + "\n \u001B[34m" + (line + 3).toString().padEnd(6, ' ') + "      \u001B[0m| " + (line + 2 < lineCount ? (currentLine = source.getLine(line + 2)).slice(0, currentLine.length - 1) : '<EOF>') + "\nRun escurieux -e " + errorOrWarningId + " or escurieux --explain " + errorOrWarningId + " for more informations about this error.\n");
}
var panicAt = function (source, message, line, char, text) { return doSomethingAt(panic, source, message, line, char, text); };
exports.panicAt = panicAt;
var warnAt = function (source, message, line, char, text) { return doSomethingAt(warn, source, message, line, char, text); };
exports.warnAt = warnAt;
var StringReader = /** @class */ (function () {
    function StringReader(source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    StringReader.prototype.next = function () {
        this.currentCharacter++;
        if (this.source[this.current] == '\n') {
            this.currentLine++;
            this.currentCharacter = 0;
        }
        return this.source[this.current++];
    };
    StringReader.prototype.peek = function () {
        return this.source[this.current];
    };
    StringReader.prototype.peekSome = function (number) {
        return this.source.slice(this.current, this.current + number);
    };
    StringReader.prototype.done = function () {
        return this.current == this.source.length;
    };
    StringReader.prototype.update = function (source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    };
    StringReader.prototype.getLine = function (lineNumber) {
        StringReader.lineReader.update(this.source);
        while (StringReader.lineReader.currentLine != lineNumber) {
            StringReader.lineReader.next();
        }
        var line = '';
        while (StringReader.lineReader.currentLine != lineNumber + 1 && !StringReader.lineReader.done()) {
            line += StringReader.lineReader.next();
        }
        return line;
    };
    StringReader.prototype.lineCount = function () {
        StringReader.lineReader.update(this.source);
        while (!StringReader.lineReader.done())
            StringReader.lineReader.next();
        return StringReader.lineReader.currentLine;
    };
    return StringReader;
}());
exports.StringReader = StringReader;
_a = StringReader;
(function () {
    _a.lineReader = new StringReader('');
})();
var Result = /** @class */ (function () {
    function Result() {
    }
    Result.Ok = function (value) {
        var result = new Result();
        result.variant = "Ok";
        result.value = value;
        return result;
    };
    Result.Err = function (errorMessage) {
        var result = new Result();
        result.variant = "Err";
        result.errorMessage = errorMessage;
        return result;
    };
    Result.prototype.ok = function () {
        return this.variant == "Ok";
    };
    Result.prototype.err = function () {
        return this.variant == "Err";
    };
    return Result;
}());
exports.Result = Result;
function readFile(filename) {
    return __awaiter(this, void 0, void 0, function () {
        var contents;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve) {
                        (0, promises_1.readFile)(filename, { encoding: 'utf-8', flag: 'r' })
                            .then(function (fileContents) { return resolve(Result.Ok(fileContents)); })["catch"](function (errorMessage) { return resolve(Result.Err("" + errorMessage)); });
                    })];
                case 1:
                    contents = _b.sent();
                    return [2 /*return*/, contents];
            }
        });
    });
}
exports.readFile = readFile;
//# sourceMappingURL=utilities.js.map