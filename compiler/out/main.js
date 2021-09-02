"use strict";
exports.__esModule = true;
var process_1 = require("process");
var utilities_1 = require("./utilities");
var commandLineArguments = process_1.argv.slice(2).sort(function (a, _) { return a.startsWith('-') ? -1 : 1; });
var commandLineOptions = {
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
    }
};
var filename = '';
for (var _i = 0, commandLineArguments_1 = commandLineArguments; _i < commandLineArguments_1.length; _i++) {
    var argument = commandLineArguments_1[_i];
    if (argument.startsWith('-')) {
        if (argument.startsWith('---')) {
            utilities_1.panic('No option exists that starts with three dashes');
        }
        else {
            var originalArgument = argument;
            argument = argument.replace(/^(-)/, '').replace(/^(-)/, '');
            var foundMatch = false;
            for (var optionName in commandLineOptions) {
                if (Object.prototype.hasOwnProperty.call(commandLineOptions, optionName)) {
                    var option = commandLineOptions[optionName];
                    if (argument == option.short || argument == option.long || (argument.startsWith(option.short) && option.short.endsWith('=')) || (argument.startsWith(option.long) && option.long.endsWith('=')))
                        foundMatch = true;
                }
            }
            if (!foundMatch) {
                utilities_1.panic("No such option : " + originalArgument + ".");
            }
        }
    }
    else
        filename = argument;
}
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
if (filename == '' && !getOption('help')) {
    utilities_1.panic('Unless -h or --help is specified, a filename is required.');
}
if (getOption('help')) {
    utilities_1.print("Usage:\nescurieux [options] [filename]\n(filename is required unless -h or --help is specified)\nOptions:\n* -v, --verbose : Verbose mode. Print extra informations about what the compiler is doing.\n* -h, --help : Show this message. When this option is specified, a filename is not required.\n* -o=filename, --out=filename : Specify where should bytecode be output.\n* -b, --bytecode : Run from bytecode instead of source.\n* -c, --compile-only : Compile to bytecode without running that bytecode.\n\nReport any errors / bugs / whatever to this page : https://github.com/Astroide/escurieux/issues .");
    process_1.exit(0);
}
if (getOption('bytecode') && getOption('compileOnly')) {
    utilities_1.panic('--bytecode / -b and --compile-only / -c cannot be used together.');
}
if (getOption('bytecode')) {
    utilities_1.panic('The VM has not been implemented yet.');
}
