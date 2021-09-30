import * as vscode from 'vscode';
import { exec, execSync } from 'child_process';
import { unlink, writeFile } from 'fs/promises';
import { unlinkSync, writeFileSync } from 'fs';
const output = vscode.window.createOutputChannel('Escurieux');
globalThis.console = <Console>{
    log: (msg) => {
        output.appendLine(msg);
    }
};
// console.log('Escurieux extension output');
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
    const result: ParsedMessage = {
        type: 'warning',
        message: '',
        line: 1,
        char: 1
    };
    result.type = message.includes('Fatal error' + resetANSIEscapeCode) ? 'error' : 'warning';
    const matches = message.match(/: \n(.+)\nOn line (\d+) at character (\d+):\n/);
    if (matches == null) {
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
            const range = new vscode.Range(line - 1, char - 1, line - 1, char);
            const diagnostic = new vscode.Diagnostic(range, message, type == 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
            diagnostics.push(diagnostic);
        }
        diagnosticCollection.clear();
        diagnosticCollection.set(uri, diagnostics);
    });
}

vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.languageId == 'escurieux') {
        updateDiagnostics(event.document.uri);
    }
});


const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable', 'typeParameter', 'type', 'operator', 'string', 'number', 'keyword'];
const tokenModifiers = ['declaration', 'documentation'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

function logAndReturn(x: RegExpMatchArray): RegExpMatchArray {
    // console.log('LOG: ' + x.slice(1).join(';'));
    return x;
}

vscode.languages.registerDocumentSemanticTokensProvider({
    'language': 'escurieux',
    'scheme': 'file'
}, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens> {
        // console.log('Semantic Token Provider Started');
        const tokenBuilder = new vscode.SemanticTokensBuilder(legend);
        try {
            const typeMap: { [x: string]: string } = {
                basetoken: 'operator',
                stringliteral: 'string',
                numberliteral: 'number',
                booleanliteral: 'number',
                keyword: 'keyword',
                characterliteral: 'string'
            };
            const path = `/tmp/.escurieux-${Math.random()}.esc`;
            const text = document.getText();
            writeFileSync(path, text);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let result = execSync(`node ~/Desktop/projets/escurieux/compiler/out/main.js -v --stdout "${path}"`).toString('utf-8');
            unlinkSync(path);
            // console.log('result = ' + result);
            result = result.match(/<tokens-start>((.|\n)*)<tokens-end>/)[1];
            const tokenList = result.split('\n')
                .filter(x => !!x)
                .map(x => x.replace(/^Token ([A-Za-z]+ \d+ \d+ \d+) (.*)$/g, '$1').toLowerCase().match(/([a-z]+) (\d+) (\d+) (\d+)/))
                .filter(x => !!x)
                .map(logAndReturn)
                .map(x => ({
                    type: typeMap[x[1]],
                    line: parseInt(x[2], 10),
                    char: parseInt(x[3], 10),
                    length: parseInt(x[4], 10)
                }));
            // console.log(tokenList.join(', '));
            for (let i = 0; i < tokenList.length; i++) {
                const token = tokenList[i];
                tokenBuilder.push(token.line, token.char, token.length, legend.tokenTypes.indexOf(token.type));
            }
        } catch (e) {
            console.log(e.stack);
            throw e;
        }
        // console.log('Semantic Token Provider Ended');
        return tokenBuilder.build();
    }
}, legend);