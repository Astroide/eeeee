"use strict";
/* This file is not intended to be run
 * at the same time as the compiler.
 * It is a code generator that turns
 * whatever it finds in the
 * "compiler/expressions" file into
 * TypeScript code.
 * Usage :
 *  $ node out/expression-processor.js infile outfile.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const process_1 = require("process");
if (process_1.argv.length != 4) {
    console.error('Usage : node out/expression-processor.js infile outfile.ts');
    (0, process_1.exit)(1);
}
const inFile = process_1.argv[2];
const outFile = process_1.argv[3];
const output = (0, fs_1.createWriteStream)(outFile, {
    'encoding': 'utf8'
});
const contents = (0, fs_1.readFileSync)(inFile, {
    encoding: 'utf8'
});
if (!contents) {
    console.error('Empty file: ' + inFile);
    (0, process_1.exit)(1);
}
const rules = [];
let rule = {
    name: '',
    variants: [],
    priority: 0
};
for (const line of contents.split('\n')) {
    if (line.startsWith('| ')) {
        // Add a variant
        rule.variants.push(line.slice(2).split(' '));
    }
    else if (line.startsWith('#priority')) {
        rule.priority = parseInt(line.slice(9).trim());
    }
    else {
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
    const classFields = new Map();
    for (const variant of rule.variants) {
        for (const variantPart of variant) {
            if (!variantPart.startsWith('"')) {
                const [name, type] = variantPart.split(':');
                if (classFields.has(name)) {
                    const types = classFields.get(name);
                    types.push(type);
                    classFields.set(name, types);
                }
                else {
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
//# sourceMappingURL=expression-processor.js.map