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

const rules: {
    name: string;
    variants: any[];
}[] = [];

let rule: {
    name: string;
    variants: any[];
} = {
    name: '',
    variants: []
};
for (const line of contents.split('\n')) {
    if (line.startsWith('| ')) {
        // Add a variant
        rule.variants.push(line.slice(2).split(' '));
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

for (const rule of rules) {
    output.write(`export class ${rule.name} {\n`);
    const classFields: Map<string, string[]> = new Map();
    for (const variant of rule.variants) {
        for (const variantPart of <string[]>variant) {
            if (!variantPart.startsWith('"')) {
                const [name, type] = variantPart.split(':');
                if (classFields.has(name)) {
                    const types = classFields.get(name);
                    types.push(type);
                    classFields.set(name, types);
                } else {
                    classFields.set(name, [type]);
                }
            }
        }
    }
    for (const [fieldName, types] of classFields) {
        output.write(`    ${fieldName}: ${[...new Set(types)].join(' | ')};\n`);
    }

    output.write('}\n');
}
console.log(rules);

output.close();