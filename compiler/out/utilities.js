"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.showLongErrorMessages = exports.zip = exports.logCalls = exports.readFile = exports.Result = exports.StringReader = exports.warnAt = exports.panicAt = exports.warn = exports.print = exports.panic = exports.setCommand = exports.setOutput = void 0;
const process_1 = require("process");
const promises_1 = require("fs/promises");
const explanations_1 = require("./explanations");
let showLongErrors = false;
let outputFunction = console.error;
let command = 'escurieux';
function setOutput(fn) {
    outputFunction = fn;
}
exports.setOutput = setOutput;
function setCommand(cmd) {
    command = cmd;
}
exports.setCommand = setCommand;
function panic(message) {
    outputFunction('\u001b[31mFatal error\u001b[0m: ' + message + '');
    (0, process_1.exit)(1);
}
exports.panic = panic;
function print(message) {
    outputFunction(message);
}
exports.print = print;
function warn(message) {
    outputFunction(`\u001b[33mWarning\u001b[0m: ${message}`);
}
exports.warn = warn;
function doSomethingAt(fn, source, message, line, char, text) {
    const lineCount = source.lineCount();
    let lineText;
    if (char != -1 && text != '\n') {
        lineText = (source.getLine(line).slice(0, char)
            + '\u001b[7m' + text + '\u001b[0m'
            + source.getLine(line).slice(char + text.length));
    }
    else {
        lineText = '\u001b[7m' + source.getLine(line).slice(0, 1) + '\u001b[0m' + source.getLine(line).slice(1);
    }
    let currentLine = '';
    const errorOrWarningId = message.match(/\[ESC(W|E)\d\d\d\d\d\]/)[0].slice(1, -1);
    return fn(`\n${message}
On line ${line + 1} at character ${char + 1}:
 \u001b[34m${(line - 1).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 2 >= 0 ? (currentLine = source.getLine(line - 2)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 1 >= 0 ? (currentLine = source.getLine(line - 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 1).toString().padEnd(6, ' ')} here >\u001b[0m ${lineText.slice(0, lineText.length - 1)}
 \u001b[34m${(line + 2).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 1 < lineCount ? (currentLine = source.getLine(line + 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 3).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 2 < lineCount ? (currentLine = source.getLine(line + 2)).slice(0, currentLine.length - 1) : ''}
${showLongErrors ? `Explanation of error ${errorOrWarningId}:\n  ${explanations_1.errorAndWarningExplanations[errorOrWarningId.slice(3)]}` : `Run ${command} -e ${errorOrWarningId} or ${command} --explain ${errorOrWarningId} for more informations about this error.`}\n----------\n`);
}
const panicAt = (source, message, line, char, text) => doSomethingAt(panic, source, message, line, char, text);
exports.panicAt = panicAt;
const warnAt = (source, message, line, char, text) => doSomethingAt(warn, source, message, line, char, text);
exports.warnAt = warnAt;
class StringReader {
    constructor(source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    next() {
        this.currentCharacter++;
        if (this.source[this.current] == '\n') {
            this.currentLine++;
            this.currentCharacter = 0;
        }
        const char = this.source[this.current++];
        if (char === undefined) {
            (0, exports.panicAt)(this, '[ESCE00005] Trying to access a character past EOF', this.currentLine + (this.currentCharacter == 0 ? -1 : 0), this.currentCharacter - 1, this.last);
        }
        this.last = char;
        return char;
    }
    peek() {
        return this.source[this.current];
    }
    peekSome(number) {
        return this.source.slice(this.current, this.current + number);
    }
    done() {
        return this.current == this.source.length;
    }
    update(source) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    getLine(lineNumber) {
        StringReader.lineReader.update(this.source);
        while (StringReader.lineReader.currentLine != lineNumber) {
            StringReader.lineReader.next();
        }
        let line = '';
        while (StringReader.lineReader.currentLine != lineNumber + 1 && !StringReader.lineReader.done()) {
            line += StringReader.lineReader.next();
        }
        return line;
    }
    lineCount() {
        StringReader.lineReader.update(this.source);
        while (!StringReader.lineReader.done())
            StringReader.lineReader.next();
        return StringReader.lineReader.currentLine;
    }
}
exports.StringReader = StringReader;
_a = StringReader;
(() => {
    _a.lineReader = new StringReader('');
})();
class Result {
    constructor() {
        this.value = null;
        this.errorMessage = null;
    }
    static Ok(value) {
        const result = new Result();
        result.variant = 'Ok';
        result.value = value;
        return result;
    }
    static Err(errorMessage) {
        const result = new Result();
        result.variant = 'Err';
        result.errorMessage = errorMessage;
        return result;
    }
    ok() {
        return this.variant == 'Ok';
    }
    err() {
        return this.variant == 'Err';
    }
}
exports.Result = Result;
async function readFile(filename) {
    const contents = await new Promise((resolve) => {
        (0, promises_1.readFile)(filename, { encoding: 'utf-8', flag: 'r' })
            .then((fileContents) => resolve(Result.Ok(fileContents)))
            .catch((errorMessage) => resolve(Result.Err('' + errorMessage)));
    });
    return contents;
}
exports.readFile = readFile;
const DEBUG_SUBPARSER_CALLS = true;
let indent = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logCalls(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value; // save a reference to the original method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = DEBUG_SUBPARSER_CALLS ? function (...args) {
        console.log(`${'  '.repeat(indent)}<${target.constructor.name}>`);
        indent++;
        const result = originalMethod.apply(this, args);
        indent--;
        console.log(`${'  '.repeat(indent)}</${target.constructor.name}>`);
        return result;
    } : originalMethod;
    return descriptor;
}
exports.logCalls = logCalls;
function zip(a, b) {
    return a.map((_, c) => [a, b].map(row => row[c]));
}
exports.zip = zip;
function showLongErrorMessages(value) {
    showLongErrors = value;
}
exports.showLongErrorMessages = showLongErrorMessages;
//# sourceMappingURL=utilities.js.map