import { argv, exit } from 'process';
import { errorAndWarningExplanations } from './explanations';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';
import { CharLiteral, Identifier, Keyword, NumberLiteral, StringLiteral, Token, TokenType } from './tokens';
import { panic, print, readFile, setCommand, setOutput, showLongErrorMessages } from './utilities';

async function main() {
    const command = argv[0] + ' ' + argv[1];
    setCommand(command);
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
        explain: {
            short: 'e',
            long: 'explain'
        },
        transpileOnly: {
            short: 't',
            long: 'transpile-only'
        },
        longErrorMessages: {
            short: 'l',
            long: 'long-errors'
        },
        stdout: {
            short: 's',
            long: 'stdout'
        }
    };
    let filename = '';
    for (let argument of commandLineArguments) {
        if (argument.startsWith('-')) {
            if (argument.startsWith('---')) {
                panic('No option exists that starts with three dashes');
            } else {
                const originalArgument = argument;
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
    if (getOption('stdout')) {
        setOutput(console.log);
    }
    if (getOption('help')) {
        print(
            `Usage:
${command} [options] [filename]
(filename is required unless -h, --help, -e or --explain is specified)
Options:
* -v, --verbose : Verbose mode. Print extra informations about what the compiler is doing.
* -h, --help : Show this message.
* -e errorid, --explain errorid : Show the explanation for the error or warning 'errorid'.
* -o=filename, --out=filename : Specify where should the final executable (or C code when -t / --transpile-only is passed) be output.
* -t, --transpile-only : Do not compile the produced C code, instead write it to the directory specified by the -o / --out option.
* -l, --long-errors : Show the error explanations produced by --explain instead of showing an invitation to run --explain

Report any errors / bugs / whatever to this page : https://github.com/Astroide/escurieux/issues .`);
        exit(0);
    }
    if (getOption('explain')) {
        const errorID = filename;
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
    if (getOption('longErrorMessages')) {
        showLongErrorMessages(true);
    }
    {
        const verbose = !!getOption('verbose');
        const result = await readFile(filename);
        if (result.err()) {
            panic(`The file ${filename} does not exist. Node.js error:\n${result.errorMessage}`);
        }
        const contentsOfSourceFile = result.value.replace(/\r\n/g, '\n');
        const tokenizer = new Tokenizer(contentsOfSourceFile);
        const tokenGenerator = tokenizer.tokenize();
        if (verbose) {
            print('=== Tokens ===');
            print('Note : these may be incorrect if you are using a macro that requires untokenized input.');
            print('<tokens-start>');
            const tokenGeneratorForPrinting = (new Tokenizer(contentsOfSourceFile)).tokenize();
            [...tokenGeneratorForPrinting.gen].forEach(token => {
                if (token instanceof NumberLiteral) {
                    const num = (<NumberLiteral>token).content;
                    print(`Token NumberLiteral ${token.line} ${token.char} ${token.length} <${num}>`);
                } else if (token instanceof StringLiteral) {
                    const num = (<StringLiteral>token).content;
                    print(`Token StringLiteral ${token.line} ${token.char} ${token.length} <${num}>`);
                } else if (token instanceof CharLiteral) {
                    const num = (<CharLiteral>token).content;
                    print(`Token StringLiteral ${token.line} ${token.char} ${token.length} <${num}>`);
                } else if (token instanceof Keyword) {
                    const num = (<Keyword>token).getSource();
                    print(`Token Keyword ${token.line} ${token.char} ${token.length} <${num}>`);
                } else if (token instanceof Identifier) {
                    const num = (<Identifier>token).identifier;
                    print(`Token Identifier ${token.line} ${token.char} ${token.length} <${num}>`);
                } else if (token instanceof Token) {
                    print(`Token BaseToken ${token.line} ${token.char} ${token.length} (${TokenType[token.type]}) <${token.getSource()}>`);
                }
            });
            print('<tokens-end>');
        }
        const parser = new Parser(tokenGenerator, tokenizer.reader);
        console.log(parser.getExpression(0).toString());
    }
}
main();