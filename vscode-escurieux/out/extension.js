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
var output = vscode.window.createOutputChannel('Escurieux');
globalThis.console = {
    log: function (msg) {
        output.appendLine(msg);
    }
};
// console.log('Starting up Escurieux extension...');
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
    // console.log('Line 32:' + message);
    var result = {
        type: 'warning',
        message: '',
        line: 1,
        char: 1
    };
    result.type = message.includes('Fatal error' + resetANSIEscapeCode) ? 'error' : 'warning';
    // console.log('Line 40:' + `!!${message}!!`);
    var matches = message.match(/: \n(.+)\nOn line (\d+) at character (\d+):\n/);
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
                    // console.log('Line 62:' + type + ' ' + message + ' ' + line + ' ' + char);
                    var range = new vscode.Range(line - 1, char - 1, line - 1, char);
                    var diagnostic = new vscode.Diagnostic(range, message, type == 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
                    diagnostics.push(diagnostic);
                    // console.log('Line 66:' + message);
                }
                diagnosticCollection.clear();
                diagnosticCollection.set(uri, diagnostics);
            });
            return [2 /*return*/];
        });
    });
}
vscode.workspace.onDidChangeTextDocument(function (event) {
    //if (!event.document.uri.fsPath.startsWith('extension-output')) // console.log('Line 76:' + `File was modified : ${event.document.uri.fsPath} ${event.document.languageId}`);
    if (event.document.languageId == 'escurieux') {
        updateDiagnostics(event.document.uri);
    }
});
// console.log('Line 82:' + 'Finished starting up.');
//# sourceMappingURL=extension.js.map