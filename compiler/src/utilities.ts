import { exit } from 'process';
import { readFile as fsReadFile } from 'fs/promises';
export function panic(message: string): never {
    console.error('\u001b[31mFatal error\u001b[0m: ' + message + '');
    exit(1);
}
export function print(message: string): void {
    console.error(message);
}
export function warn(message: string): void {
    console.error(`\u001b[33mWarning\u001b[0m: ${message}`);
}
function doSomethingAt<T>(fn: (message: string) => T, source: StringReader, message: string, line: number, char: number, text: string): T {
    const lineCount = source.lineCount();
    let lineText: string;
    if (char != -1 && text != '\n') {
        lineText = (
            source.getLine(line).slice(0, char)
            + '\u001b[7m' + text + '\u001b[0m'
            + source.getLine(line).slice(char + text.length)
        );
    } else {
        lineText = '\u001b[7m' + source.getLine(line).slice(0, 1) + '\u001b[0m' + source.getLine(line).slice(1);
    }
    let currentLine = '';
    const errorOrWarningId = message.match(/\[ESC(W|E)\d\d\d\d\d\]/)[0].slice(1, -1);
    return fn(`\n${message}
On line ${line + 1} at character ${char + 1}:
 \u001b[34m${(line - 1).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 2 >= 0 ? (currentLine = source.getLine(line - 2)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 1 >= 0 ? (currentLine = source.getLine(line - 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 1).toString().padEnd(6, ' ')} here >\u001b[0m ${lineText.slice(0, lineText.length - 1)}
 \u001b[34m${(line + 2).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 1 < lineCount ? (currentLine = source.getLine(line + 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 3).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 2 < lineCount ? (currentLine = source.getLine(line + 2)).slice(0, currentLine.length - 1) : ''}
Run escurieux -e ${errorOrWarningId} or escurieux --explain ${errorOrWarningId} for more informations about this error.\n----------\n`);
}

export const panicAt = (source: StringReader, message: string, line: number, char: number, text: string): never => doSomethingAt(panic, source, message, line, char, text);

export const warnAt = (source: StringReader, message: string, line: number, char: number, text: string): void => doSomethingAt(warn, source, message, line, char, text);


export class StringReader {
    source: string;
    current: number;
    currentCharacter: number;
    currentLine: number;
    last: string;
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
        const char = this.source[this.current++];
        if (char === undefined) {
            panicAt(this, '[ESCE00005] Trying to access a character past EOF', this.currentLine + (this.currentCharacter == 0 ? -1 : 0), this.currentCharacter - 1, this.last);
        }
        this.last = char;
        return char;
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
    update(source: string): void {
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
        let line = '';
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

export class Result<T> {
    variant: 'Ok' | 'Err';
    value?: T;
    errorMessage?: string;
    constructor() {
        this.value = null;
        this.errorMessage = null;
    }
    static Ok<T>(value: T): Result<T> {
        const result = new Result<T>();
        result.variant = 'Ok';
        result.value = value;
        return result;
    }
    static Err<T>(errorMessage: string): Result<T> {
        const result = new Result<T>();
        result.variant = 'Err';
        result.errorMessage = errorMessage;
        return result;
    }
    ok(): boolean {
        return this.variant == 'Ok';
    }
    err(): boolean {
        return this.variant == 'Err';
    }
}

export async function readFile(filename: string): Promise<Result<string>> {
    const contents = await new Promise((resolve) => {
        fsReadFile(filename, { encoding: 'utf-8', flag: 'r' })
            .then((fileContents) => resolve(Result.Ok(fileContents)))
            .catch((errorMessage) => resolve(Result.Err('' + errorMessage)));
    });
    return <Result<string>>contents;
}

const DEBUG_SUBPARSER_CALLS = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logCalls(target: unknown, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
    const originalMethod = descriptor.value; // save a reference to the original method

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = DEBUG_SUBPARSER_CALLS ? function (...args: any[]) {
        console.log(`<${target.constructor.name}>`);
        const result = originalMethod.apply(this, args);
        console.log(`</${target.constructor.name}>`);
        return result;
    } : originalMethod;

    return descriptor;
}

export function zip<A, B>(a: A[], b: B[]): [A, B][] {
    return <[A, B][]>a.map((_, c) => [a, b].map(row => row[c]));
}