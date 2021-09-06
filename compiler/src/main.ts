import { argv, exit } from "process";
import { errorAndWarningExplanations } from "./explanations";
import { Parser } from "./parser";
import { NumberLiteral, StringLiteral } from "./tokens";
import { panic, print, readFile, Result } from "./utilities";
async function main() {
    const commandLineArguments = argv.slice(2).sort((a: string, _) => a.startsWith('-') ? -1 : 1);
    const commandLineOptions: { [x: string]: { short: string, long: string } } = {
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
                panic('No option exists that starts with three dashes');
            } else {
                let originalArgument = argument;
                argument = argument.replace(/^(-)/, '').replace(/^(-)/, '');
                let foundMatch = false;
                for (const optionName in commandLineOptions) {
                    if (Object.prototype.hasOwnProperty.call(commandLineOptions, optionName)) {
                        const option = commandLineOptions[optionName];
                        if (argument == option.short || argument == option.long || (argument.startsWith(option.short) && option.short.endsWith('=')) || (argument.startsWith(option.long) && option.long.endsWith('='))) foundMatch = true;
                    }
                }
                if (!foundMatch) {
                    panic(`No such option : ${originalArgument}.`);
                }
            }
        } else filename = argument;
    }
    function getOption(name: string) {
        let { short, long } = commandLineOptions[name];
        short = '-' + short;
        long = '--' + long;
        if (commandLineArguments.includes(short)) {
            return 'true';
        } else if (commandLineArguments.includes(long)) {
            return 'true';
        } else {
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
        panic('Unless -h or --help is specified, a filename is required.');
    }
    if (getOption('help')) {
        print(
            `Usage:
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
        exit(0);
    }
    if (getOption('explain')) {
        let errorID = filename;
        let hasFoundAnything = false;
        for (const id in errorAndWarningExplanations) {
            if (Object.prototype.hasOwnProperty.call(errorAndWarningExplanations, id) && ('ESC' + id) == errorID) {
                const explanation = errorAndWarningExplanations[id];
                hasFoundAnything = true;
                print((id.startsWith('W') ? 'Warning' : 'Error') + ' ' + errorID + ': ' + explanation);
            }
        }
        if (!hasFoundAnything) {
            panic(`Error id ${errorID} is invalid.`);
        }
        exit(0);
    }
    if (getOption('bytecode') && getOption('compileOnly')) {
        panic('--bytecode / -b and --compile-only / -c cannot be used together.');
    }
    if (getOption('bytecode')) {
        panic('The VM has not been implemented yet.');
    } else {
        let verbose: boolean = !!getOption('verbose');
        let result = await readFile(filename);
        if (result.err()) {
            panic(`The file ${filename} does not exist. Node.js error:\n${result.errorMessage}`)
        }
        let contentsOfSourceFile = result.value;
        let parser = new Parser(contentsOfSourceFile);
        let tokens = parser.parse();
        if (verbose) {
            tokens.forEach(token => {
                if (token instanceof NumberLiteral) {
                    let num = (<NumberLiteral>token).content;
                    print(`Token NumberLiteral <${num}>`);
                } else if (token instanceof StringLiteral) {
                    let num = (<StringLiteral>token).content;
                    print(`Token StringLiteral <${num}>`);
                } else {
                    print(`Token BaseToken <${token.getSource()}>`);
                }
            });
        }
    }
}
main();