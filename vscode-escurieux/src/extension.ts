import * as vscode from 'vscode';
import { exec } from 'child_process';
import { unlink, writeFile } from 'fs/promises';
const output = vscode.window.createOutputChannel('Escurieux');
globalThis.console = <Console>{
    log: (msg) => {
        output.appendLine(msg);
    }
};
// console.log('Starting up Escurieux extension...');
vscode.languages.setLanguageConfiguration('escurieux', {
    'wordPattern': /[A-Za-z_0-9]+/
});

function checkCodeValidity(_path: string, text: string): Promise<string[]> {
    return new Promise(resolve => {
        const path = `/tmp/.escurieux-${Math.random()}.esc`;
        writeFile(path, text).then(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            exec(`node ~/Desktop/projets/escurieux/compiler/out/main.js "${path}"`, (_error, _stdout, stderr) => {
                unlink(path).then(() => {
                    if (stderr.trim() == '') {
                        resolve([]);
                    } else {
                        resolve(stderr.split('\n----------\n'));
                    }
                });
            });
        });
    });
}

type ParsedMessage = { type: 'error' | 'warning', message: string, line: number, char: number };
const resetANSIEscapeCode = '\u001b[0m';
function parseMessage(message: string): ParsedMessage {
    // console.log('Line 32:' + message);
    const result: ParsedMessage = {
        type: 'warning',
        message: '',
        line: 1,
        char: 1
    };
    result.type = message.includes('Fatal error' + resetANSIEscapeCode) ? 'error' : 'warning';
    // console.log('Line 40:' + `!!${message}!!`);
    const matches = message.match(/: \n(.+)\nOn line (\d+) at character (\d+):\n/);
    // console.log('Line 42:' + `matches ${matches}`);
    if (matches == null) {
        // console.log('Line 44:' + 'Failed to match.');
        return null;
    }
    result.message = matches[1];
    result.line = parseInt(matches[2], 10);
    result.char = parseInt(matches[3], 10);
    return result;
}

const diagnosticCollection = vscode.languages.createDiagnosticCollection('escurieux');
async function updateDiagnostics(uri: vscode.Uri) {
    checkCodeValidity(uri.fsPath, vscode.window.activeTextEditor.document.getText()).then(messages => {
        const diagnostics: vscode.Diagnostic[] = [];
        for (let i = 0; i < messages.length; i++) {
            const unparsedMessage = messages[i];
            const result = parseMessage(unparsedMessage);
            if (result == null) continue;
            const { type, message, line, char } = result;
            // console.log('Line 62:' + type + ' ' + message + ' ' + line + ' ' + char);
            const range = new vscode.Range(line - 1, char - 1, line - 1, char);
            const diagnostic = new vscode.Diagnostic(range, message, type == 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
            diagnostics.push(diagnostic);
            // console.log('Line 66:' + message);
        }
        diagnosticCollection.clear();
        diagnosticCollection.set(uri, diagnostics);
    });
}

vscode.workspace.onDidChangeTextDocument(event => {
    //if (!event.document.uri.fsPath.startsWith('extension-output')) // console.log('Line 76:' + `File was modified : ${event.document.uri.fsPath} ${event.document.languageId}`);
    if (event.document.languageId == 'escurieux') {
        updateDiagnostics(event.document.uri);
    }
});

// console.log('Line 82:' + 'Finished starting up.');