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
    variants: []
};
for (const line of contents.split('\n')) {
    if (line.startsWith('| ')) {
        // Add a variant
        rule.variants.push(line.slice(2));
    }
    else {
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
//# sourceMappingURL=expression-processor.js.map