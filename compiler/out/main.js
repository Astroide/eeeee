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
var process_1 = require("process");
var explanations_1 = require("./explanations");
var parser_1 = require("./parser");
var tokens_1 = require("./tokens");
var utilities_1 = require("./utilities");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        function getOption(name) {
            var _a = commandLineOptions[name], short = _a.short, long = _a.long;
            short = '-' + short;
            long = '--' + long;
            if (commandLineArguments.includes(short)) {
                return 'true';
            }
            else if (commandLineArguments.includes(long)) {
                return 'true';
            }
            else {
                for (var _i = 0, commandLineArguments_2 = commandLineArguments; _i < commandLineArguments_2.length; _i++) {
                    var argument = commandLineArguments_2[_i];
                    if (argument.startsWith(short) && short.endsWith('=')) {
                        return argument.slice(argument.indexOf(short));
                    }
                    if (argument.startsWith(long) && long.endsWith('=')) {
                        return argument.slice(argument.indexOf(long));
                    }
                }
            }
            return null;
        }
        var commandLineArguments, commandLineOptions, filename, _i, commandLineArguments_1, argument, originalArgument, foundMatch, optionName, option, errorID, hasFoundAnything, id, explanation, verbose, result, contentsOfSourceFile, parser, tokens;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    commandLineArguments = process_1.argv.slice(2).sort(function (a, _) { return a.startsWith('-') ? -1 : 1; });
                    commandLineOptions = {
                        verbose: {
                            short: 'v',
                            long: 'verbose'
                        },
                        output: {
                            short: 'o=',
                            long: 'out='
                        },
                        help: {
                            short: 'h',
                            long: 'help'
                        },
                        bytecode: {
                            short: 'b',
                            long: 'bytecode'
                        },
                        compileOnly: {
                            short: 'c',
                            long: 'compile-only'
                        },
                        explain: {
                            short: 'e',
                            long: 'explain'
                        }
                    };
                    filename = '';
                    for (_i = 0, commandLineArguments_1 = commandLineArguments; _i < commandLineArguments_1.length; _i++) {
                        argument = commandLineArguments_1[_i];
                        if (argument.startsWith('-')) {
                            if (argument.startsWith('---')) {
                                (0, utilities_1.panic)('No option exists that starts with three dashes');
                            }
                            else {
                                originalArgument = argument;
                                argument = argument.replace(/^(-)/, '').replace(/^(-)/, '');
                                foundMatch = false;
                                for (optionName in commandLineOptions) {
                                    if (Object.prototype.hasOwnProperty.call(commandLineOptions, optionName)) {
                                        option = commandLineOptions[optionName];
                                        if (argument == option.short || argument == option.long || (argument.startsWith(option.short) && option.short.endsWith('=')) || (argument.startsWith(option.long) && option.long.endsWith('=')))
                                            foundMatch = true;
                                    }
                                }
                                if (!foundMatch) {
                                    (0, utilities_1.panic)("No such option : " + originalArgument + ".");
                                }
                            }
                        }
                        else
                            filename = argument;
                    }
                    if (filename == '' && !getOption('help') && !getOption('explain')) {
                        (0, utilities_1.panic)('Unless -h or --help is specified, a filename is required.');
                    }
                    if (getOption('help')) {
                        (0, utilities_1.print)("Usage:\nescurieux [options] [filename]\n(filename is required unless -h, --help, -e or --explain is specified)\nOptions:\n* -v, --verbose : Verbose mode. Print extra informations about what the compiler is doing.\n* -h, --help : Show this message.\n* -e errorid, --explain errorid : Show the explanation for the error or warning 'errorid'.\n* -o=filename, --out=filename : Specify where should bytecode be output.\n* -b, --bytecode : Run from bytecode instead of source.\n* -c, --compile-only : Compile to bytecode without running that bytecode.\n\nReport any errors / bugs / whatever to this page : https://github.com/Astroide/escurieux/issues .");
                        (0, process_1.exit)(0);
                    }
                    if (getOption('explain')) {
                        errorID = filename;
                        hasFoundAnything = false;
                        for (id in explanations_1.errorAndWarningExplanations) {
                            if (Object.prototype.hasOwnProperty.call(explanations_1.errorAndWarningExplanations, id) && ('ESC' + id) == errorID) {
                                explanation = explanations_1.errorAndWarningExplanations[id];
                                hasFoundAnything = true;
                                (0, utilities_1.print)((id.startsWith('W') ? 'Warning' : 'Error') + ' ' + errorID + ': ' + explanation);
                            }
                        }
                        if (!hasFoundAnything) {
                            (0, utilities_1.panic)("Error id " + errorID + " is invalid.");
                        }
                        (0, process_1.exit)(0);
                    }
                    if (getOption('bytecode') && getOption('compileOnly')) {
                        (0, utilities_1.panic)('--bytecode / -b and --compile-only / -c cannot be used together.');
                    }
                    if (!getOption('bytecode')) return [3 /*break*/, 1];
                    (0, utilities_1.panic)('The VM has not been implemented yet.');
                    return [3 /*break*/, 3];
                case 1:
                    verbose = !!getOption('verbose');
                    return [4 /*yield*/, (0, utilities_1.readFile)(filename)];
                case 2:
                    result = _a.sent();
                    if (result.err()) {
                        (0, utilities_1.panic)("The file " + filename + " does not exist. Node.js error:\n" + result.errorMessage);
                    }
                    contentsOfSourceFile = result.value;
                    parser = new parser_1.Parser(contentsOfSourceFile);
                    tokens = parser.parse();
                    if (verbose) {
                        tokens.forEach(function (token) {
                            if (token instanceof tokens_1.NumberLiteral) {
                                var num = token.content;
                                (0, utilities_1.print)("Token NumberLiteral <" + num + ">");
                            }
                            else if (token instanceof tokens_1.StringLiteral) {
                                var num = token.content;
                                (0, utilities_1.print)("Token StringLiteral <" + num + ">");
                            }
                        });
                    }
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
main();
//# sourceMappingURL=main.js.map