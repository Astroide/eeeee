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