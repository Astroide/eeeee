import { exit } from "process";
export function panic(message: string): never {
    console.error('Fatal error: ' + message + '\nRun escurieux -h or escurieux --help for help.');
    exit(1);
}
export function print(message: string) {
    console.error(message);
}