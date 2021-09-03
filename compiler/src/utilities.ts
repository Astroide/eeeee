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
function doSomethingAt(fn: (message: string) => any, source: string, message: string, line: number, char: number) {

}

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
}