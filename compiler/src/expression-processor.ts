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
    variants: string[][];
    priority: number;
}[] = [];

let rule: {
    name: string;
    variants: string[][];
    priority: number;
} = {
    name: '',
    variants: [],
    priority: 0
};
for (const line of contents.split('\n')) {
    if (line.startsWith('| ')) {
        // Add a variant
        rule.variants.push(line.slice(2).split(' '));
    } else if (line.startsWith('#priority')) {
        rule.priority = parseInt(line.slice(9).trim());
    } else {
        if (rule.name != '') {
            rules.push(rule);
        }
        rule = {
            name: line.slice(0, -1),
            variants: [],
            priority: 0
        };
    }
}

output.write('/* Generated file */\n');
output.write('import { TokenType, Token, StringLiteral, NumberLiteral, BooleanLiteral, Identifier, Keyword } from \'./tokens\';\n');

for (const rule of rules) {
    output.write(`export class ${rule.name} {\n`);
    output.write(`    static priority = ${rule.priority};\n`);
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