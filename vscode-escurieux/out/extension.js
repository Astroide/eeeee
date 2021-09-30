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
exports.__esModule = true;
var vscode = require("vscode");
var child_process_1 = require("child_process");
var promises_1 = require("fs/promises");
var fs_1 = require("fs");
var output = vscode.window.createOutputChannel('Escurieux');
globalThis.console = {
    log: function (msg) {
        output.appendLine(msg);
    }
};
// console.log('Escurieux extension output');
vscode.languages.setLanguageConfiguration('escurieux', {
    'wordPattern': /[A-Za-z_0-9]+/
});
function checkCodeValidity(_path, text) {
    return new Promise(function (resolve) {
        var path = "/tmp/.escurieux-" + Math.random() + ".esc";
        (0, promises_1.writeFile)(path, text).then(function () {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (0, child_process_1.exec)("node ~/Desktop/projets/escurieux/compiler/out/main.js \"" + path + "\"", function (_error, _stdout, stderr) {
                (0, promises_1.unlink)(path).then(function () {
                    if (stderr.trim() == '') {
                        resolve([]);
                    }
                    else {
                        resolve(stderr.split('\n----------\n'));
                    }
                });
            });
        });
    });
}
var resetANSIEscapeCode = '\u001b[0m';
function parseMessage(message) {
    var result = {
        type: 'warning',
        message: '',
        line: 1,
        char: 1
    };
    result.type = message.includes('Fatal error' + resetANSIEscapeCode) ? 'error' : 'warning';
    var matches = message.match(/: \n(.+)\nOn line (\d+) at character (\d+):\n/);
    if (matches == null) {
        return null;
    }
    result.message = matches[1];
    result.line = parseInt(matches[2], 10);
    result.char = parseInt(matches[3], 10);
    return result;
}
var diagnosticCollection = vscode.languages.createDiagnosticCollection('escurieux');
function updateDiagnostics(uri) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            checkCodeValidity(uri.fsPath, vscode.window.activeTextEditor.document.getText()).then(function (messages) {
                var diagnostics = [];
                for (var i = 0; i < messages.length; i++) {
                    var unparsedMessage = messages[i];
                    var result = parseMessage(unparsedMessage);
                    if (result == null)
                        continue;
                    var type = result.type, message = result.message, line = result.line, char = result.char;
                    var range = new vscode.Range(line - 1, char - 1, line - 1, char);
                    var diagnostic = new vscode.Diagnostic(range, message, type == 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
                    diagnostics.push(diagnostic);
                }
                diagnosticCollection.clear();
                diagnosticCollection.set(uri, diagnostics);
            });
            return [2 /*return*/];
        });
    });
}
vscode.workspace.onDidChangeTextDocument(function (event) {
    if (event.document.languageId == 'escurieux') {
        updateDiagnostics(event.document.uri);
    }
});
var tokenTypes = ['class', 'interface', 'enum', 'function', 'variable', 'typeParameter', 'type', 'operator', 'string', 'number', 'keyword'];
var tokenModifiers = ['declaration', 'documentation'];
var legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
function logAndReturn(x) {
    // console.log('LOG: ' + x.slice(1).join(';'));
    return x;
}
vscode.languages.registerDocumentSemanticTokensProvider({
    'language': 'escurieux',
    'scheme': 'file'
}, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    provideDocumentSemanticTokens: function (document, token) {
        // console.log('Semantic Token Provider Started');
        var tokenBuilder = new vscode.SemanticTokensBuilder(legend);
        try {
            var typeMap_1 = {
                basetoken: 'operator',
                stringliteral: 'string',
                numberliteral: 'number',
                booleanliteral: 'number',
                keyword: 'keyword',
                characterliteral: 'string'
            };
            var path = "/tmp/.escurieux-" + Math.random() + ".esc";
            var text = document.getText();
            (0, fs_1.writeFileSync)(path, text);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var result = (0, child_process_1.execSync)("node ~/Desktop/projets/escurieux/compiler/out/main.js -v --stdout \"" + path + "\"").toString('utf-8');
            (0, fs_1.unlinkSync)(path);
            // console.log('result = ' + result);
            result = result.match(/<tokens-start>((.|\n)*)<tokens-end>/)[1];
            var tokenList = result.split('\n')
                .filter(function (x) { return !!x; })
                .map(function (x) { return x.replace(/^Token ([A-Za-z]+ \d+ \d+ \d+) (.*)$/g, '$1').toLowerCase().match(/([a-z]+) (\d+) (\d+) (\d+)/); })
                .filter(function (x) { return !!x; })
                .map(logAndReturn)
                .map(function (x) { return ({
                type: typeMap_1[x[1]],
                line: parseInt(x[2], 10),
                char: parseInt(x[3], 10),
                length: parseInt(x[4], 10)
            }); });
            // console.log(tokenList.join(', '));
            for (var i = 0; i < tokenList.length; i++) {
                var token_1 = tokenList[i];
                tokenBuilder.push(token_1.line, token_1.char, token_1.length, legend.tokenTypes.indexOf(token_1.type));
            }
        }
        catch (e) {
            console.log(e.stack);
            throw e;
        }
        // console.log('Semantic Token Provider Ended');
        return tokenBuilder.build();
    }
}, legend);
//# sourceMappingURL=extension.js.map