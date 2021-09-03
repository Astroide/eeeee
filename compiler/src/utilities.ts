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
    constructor(source: string) {
        this.source = source;
        this.current = 0;
    }
    next(): string {
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
}