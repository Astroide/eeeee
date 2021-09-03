import { exit } from "process";
export function panic(message: string): never {
    console.error('\u001b[31mFatal error: ' + message + '\nRun escurieux -h or escurieux --help for help.\u001b[0m');
    exit(1);
}
export function print(message: string) {
    console.error(message);
}
export function warn(message: string) {
    console.error(`\u001b[33mWarning: ${message}\u001b[0m`);
}
function doSomethingAt(fn: (message: string) => any, source: StringReader, message: string, line: number, char: number, text: string) {
    let lineCount = source.lineCount();
    let lineText = source.getLine(line).slice(0, char) + '\u001b[7m' + text + '\u001b[0m' + source.getLine(line).slice(char + text.length);
    fn(`${message}
On line ${line} at character ${char}:
 ${(line - 2).toString().padEnd(9, ' ')}  | ${line - 2 >= 0 ? source.getLine(line - 2) : ''}
 ${(line - 1).toString().padEnd(9, ' ')} || ${line - 1 >= 0 ? source.getLine(line - 1) : ''}
 ${(line).toString().padEnd(9, ' ')}||| ${lineText}
 ${(line + 1).toString().padEnd(9, ' ')} ||| ${line + 1 < lineCount ? source.getLine(line + 1) : ''}
 ${(line + 2).toString().padEnd(9, ' ')}  | ${line + 2 < lineCount ? source.getLine(line + 2) : ''}`);
}

export let panicAt = (source: StringReader, message: string, line: number, char: number, text: string) => doSomethingAt(panic, source, message, line, char, text);

export let warnAt = (source: StringReader, message: string, line: number, char: number, text: string) => doSomethingAt(warn, source, message, line, char, text)


export class StringReader {
    source: string;
    current: number;
    currentCharacter: number;
    currentLine: number;
    private static lineReader: StringReader;
    static {
        this.lineReader = new StringReader('');
    }
    constructor(source: string) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    next(): string {
        this.currentCharacter++;
        if (this.source[this.current] == '\n') {
            this.currentLine++;
            this.currentCharacter = 0;
        }
        return this.source[this.current++];
    }
    peek(): string {
        return this.source[this.current];
    }
    peekSome(number: number): string {
        return this.source.slice(this.current, this.current + number);
    }
    done(): boolean {
        return this.current == this.source.length;
    }
    update(source: string) {
        this.source = source;
        this.current = 0;
        this.currentCharacter = 0;
        this.currentLine = 0;
    }
    getLine(lineNumber: number): string {
        StringReader.lineReader.update(this.source);
        while (StringReader.lineReader.currentLine != lineNumber) {
            StringReader.lineReader.next();
        }
        let line: string = '';
        while (StringReader.lineReader.currentLine != lineNumber + 1 && !StringReader.lineReader.done()) {
            line += StringReader.lineReader.next();
        }
        return line;
    }
    lineCount(): number {
        StringReader.lineReader.update(this.source);
        while (!StringReader.lineReader.done()) StringReader.lineReader.next();
        return StringReader.lineReader.currentLine;
    }
}