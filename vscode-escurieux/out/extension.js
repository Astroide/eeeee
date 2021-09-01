"use strict";
exports.__esModule = true;
var vscode = require("vscode");
var output = vscode.window.createOutputChannel("Escurieux");
globalThis.console = {
    log: function (msg) {
        output.appendLine(msg);
    }
};
console.log('Starting up Escurieux extension...');
