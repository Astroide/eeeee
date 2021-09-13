/* This file is not intended to be run
 * at the same time as the compiler.
 * It is a code generator that turns
 * whatever it finds in the
 * "compiler/expressions" file into
 * TypeScript code.
 * Usage :
 *  $ node out/expression-processor.js infile outfile.ts
 */

import { createWriteStream, readFileSync } from 'fs';
import { argv, exit } from 'process';

if (argv.length != 4) {
    console.error('Usage : node out/expression-processor.js infile outfile.ts');
    exit(1);
}

const inFile = argv[2];
const outFile = argv[3];

const output = createWriteStream(outFile, {
    'encoding': 'utf8'
});

const contents = readFileSync(inFile, {
    encoding: 'utf8'
});

if (!contents) {
    console.error('Empty file: ' + inFile);
    exit(1);
}

const rules = [];

let rule = {
    name: '',
    variants: []
};
for (const line of contents.split('\n')) {
    if (line.startsWith('| ')) {
        // Add a variant
        rule.variants.push(line.slice(2));
    } else {
        if (rule.name != '') {
            rules.push(rule);
        }
        rule = {
            name: line.slice(0, -1),
            variants: []
        };
    }
}

output.write('/* Generated file */\n');
console.log(rules);

output.close();