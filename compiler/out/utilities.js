"use strict";
exports.__esModule = true;
exports.print = exports.panic = void 0;
var process_1 = require("process");
function panic(message) {
    console.error('Fatal error: ' + message + '\nRun escurieux -h or escurieux --help for help.');
    process_1.exit(1);
}
exports.panic = panic;
function print(message) {
    console.error(message);
}
exports.print = print;
