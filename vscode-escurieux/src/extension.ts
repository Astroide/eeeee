import * as vscode from 'vscode';
let output = vscode.window.createOutputChannel("Escurieux");
globalThis.console = <any>{
    log: (msg) => {
        output.appendLine(msg);
    }
};
console.log('Starting up Escurieux extension...');



console.log('Finished starting up.');