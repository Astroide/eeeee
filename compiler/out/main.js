"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
const explanations_1 = require("./explanations");
const parser_1 = require("./parser");
const tokenizer_1 = require("./tokenizer");
const tokens_1 = require("./tokens");
const utilities_1 = require("./utilities");
async function main() {
    const commandLineArguments = process_1.argv.slice(2).sort((a, _) => a.startsWith('-') ? -1 : 1);
    const commandLineOptions = {
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
    let filename = '';
    for (let argument of commandLineArguments) {
        if (argument.startsWith('-')) {
            if (argument.startsWith('---')) {
                (0, utilities_1.panic)('No option exists that starts with three dashes');
            }
            else {
                const originalArgument = argument;
                argument = argument.replace(/^(-)/, '').replace(/^(-)/, '');
                let foundMatch = false;
                for (const optionName in commandLineOptions) {
                    if (Object.prototype.hasOwnProperty.call(commandLineOptions, optionName)) {
                        const option = commandLineOptions[optionName];
                        if (argument == option.short || argument == option.long || (argument.startsWith(option.short) && option.short.endsWith('=')) || (argument.startsWith(option.long) && option.long.endsWith('=')))
                            foundMatch = true;
                    }
                }
                if (!foundMatch) {
                    (0, utilities_1.panic)(`No such option : ${originalArgument}.`);
                }
            }
        }
        else
            filename = argument;
    }
    function getOption(name) {
        let { short, long } = commandLineOptions[name];
        short = '-' + short;
        long = '--' + long;
        if (commandLineArguments.includes(short)) {
            return 'true';
        }
        else if (commandLineArguments.includes(long)) {
            return 'true';
        }
        else {
            for (const argument of commandLineArguments) {
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
    if (filename == '' && !getOption('help') && !getOption('explain')) {
        (0, utilities_1.panic)('Unless -h or --help is specified, a filename is required.');
    }
    if (getOption('help')) {
        (0, utilities_1.print)(`Usage:
escurieux [options] [filename]
(filename is required unless -h, --help, -e or --explain is specified)
Options:
* -v, --verbose : Verbose mode. Print extra informations about what the compiler is doing.
* -h, --help : Show this message.
* -e errorid, --explain errorid : Show the explanation for the error or warning 'errorid'.
* -o=filename, --out=filename : Specify where should bytecode be output.
* -b, --bytecode : Run from bytecode instead of source.
* -c, --compile-only : Compile to bytecode without running that bytecode.

Report any errors / bugs / whatever to this page : https://github.com/Astroide/escurieux/issues .`);
        (0, process_1.exit)(0);
    }
    if (getOption('explain')) {
        const errorID = filename;
        let hasFoundAnything = false;
        for (const id in explanations_1.errorAndWarningExplanations) {
            if (Object.prototype.hasOwnProperty.call(explanations_1.errorAndWarningExplanations, id) && ('ESC' + id) == errorID) {
                const explanation = explanations_1.errorAndWarningExplanations[id];
                hasFoundAnything = true;
                (0, utilities_1.print)((id.startsWith('W') ? 'Warning' : 'Error') + ' ' + errorID + ': ' + explanation);
            }
        }
        if (!hasFoundAnything) {
            (0, utilities_1.panic)(`Error id ${errorID} is invalid.`);
        }
        (0, process_1.exit)(0);
    }
    if (getOption('bytecode') && getOption('compileOnly')) {
        (0, utilities_1.panic)('--bytecode / -b and --compile-only / -c cannot be used together.');
    }
    if (getOption('bytecode')) {
        (0, utilities_1.panic)('The VM has not been implemented yet.');
    }
    else {
        const verbose = !!getOption('verbose');
        const result = await (0, utilities_1.readFile)(filename);
        if (result.err()) {
            (0, utilities_1.panic)(`The file ${filename} does not exist. Node.js error:\n${result.errorMessage}`);
        }
        const contentsOfSourceFile = result.value;
        const tokenizer = new tokenizer_1.Tokenizer(contentsOfSourceFile);
        const tokenGenerator = tokenizer.tokenize();
        if (verbose) {
            (0, utilities_1.print)('=== Tokens ===');
            (0, utilities_1.print)('Note : these may be incorrect if you are using a macro that requires untokenized input.');
            const tokenGeneratorForPrinting = (new tokenizer_1.Tokenizer(contentsOfSourceFile)).tokenize();
            [...tokenGeneratorForPrinting.gen].forEach(token => {
                if (token instanceof tokens_1.NumberLiteral) {
                    const num = token.content;
                    (0, utilities_1.print)(`Token NumberLiteral <${num}>`);
                }
                else if (token instanceof tokens_1.StringLiteral) {
                    const num = token.content;
                    (0, utilities_1.print)(`Token StringLiteral <${num}>`);
                }
                else if (token instanceof tokens_1.Keyword) {
                    const num = token.getSource();
                    (0, utilities_1.print)(`Token Keyword <${num}>`);
                }
                else if (token instanceof tokens_1.Identifier) {
                    const num = token.identifier;
                    (0, utilities_1.print)(`Token Identifier <${num}>`);
                }
                else if (token instanceof tokens_1.Token) {
                    (0, utilities_1.print)(`Token BaseToken <${token.getSource()}>`);
                }
            });
        }
        const parser = new parser_1.Parser(tokenGenerator, tokenizer.reader);
        console.log(parser.getExpression());
    }
}
main();
//# sourceMappingURL=main.js.map