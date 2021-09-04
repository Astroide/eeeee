import { exit } from "process";
import { readFile as fsReadFile } from "fs/promises";
export function panic(message: string): never {
    console.error('\u001b[31mFatal error\u001b[0m: ' + message + '\nRun escurieux -h or escurieux --help for help.');
    exit(1);
}
export function print(message: string) {
    console.error(message);
}
export function warn(message: string) {
    console.error(`\u001b[33mWarning\u001b[0m: ${message}`);
}
function doSomethingAt(fn: (message: string) => any, source: StringReader, message: string, line: number, char: number, text: string) {
    let lineCount = source.lineCount();
    let lineText = source.getLine(line).slice(0, char) + '\u001b[7m' + text + '\u001b[0m' + source.getLine(line).slice(char + text.length);
    let currentLine = '';
    let errorOrWarningId = message.match(/\[ESC(W|E)\d\d\d\d\d\]/)[0].slice(1, -1);
    fn(`\n${message}
On line ${line + 1} at character ${char + 1}:
 \u001b[34m${(line - 1).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 2 >= 0 ? (currentLine = source.getLine(line - 2)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line).toString().padEnd(6, ' ')}      \u001b[0m| ${line - 1 >= 0 ? (currentLine = source.getLine(line - 1)).slice(0, currentLine.length - 1) : ''}
 \u001b[34m${(line + 1).toString().padEnd(6, ' ')} here >\u001b[0m ${lineText.slice(0, lineText.length - 1)}
 \u001b[34m${(line + 2).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 1 < lineCount ? (currentLine = source.getLine(line + 1)).slice(0, currentLine.length - 1) : '<EOF>'}
 \u001b[34m${(line + 3).toString().padEnd(6, ' ')}      \u001b[0m| ${line + 2 < lineCount ? (currentLine = source.getLine(line + 2)).slice(0, currentLine.length - 1) : '<EOF>'}
Run escurieux -e ${errorOrWarningId} or escurieux --explain ${errorOrWarningId} for more informations about this error.\n`);
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

export class Result<T> {
    variant: "Ok" | "Err";
    value?: T;
    errorMessage?: string;
    constructor() { }
    static Ok<T>(value: T): Result<T> {
        let result = new Result<T>();
        result.variant = "Ok";
        result.value = value;
        return result;
    }
    static Err<T>(errorMessage: string): Result<T> {
        let result = new Result<T>();
        result.variant = "Err";
        result.errorMessage = errorMessage;
        return result;
    }
    ok(): boolean {
        return this.variant == "Ok";
    }
    err(): boolean {
        return this.variant == "Err";
    }
}

export async function readFile(filename: string): Promise<Result<string>> {
    let contents = await new Promise((resolve) => {
        fsReadFile(filename, { encoding: 'utf-8', flag: 'r' })
            .then((fileContents) => resolve(Result.Ok(fileContents)))
            .catch((errorMessage) => resolve(Result.Err("" + errorMessage)));
    });
    return <Result<string>>contents;
}