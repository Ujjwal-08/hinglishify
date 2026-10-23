#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createColors } from "../src/colors.js";
import { slugify } from "../src/slug.js";
import { toDevanagari, toLatin } from "../src/transliterate.js";

const here = dirname(fileURLToPath(import.meta.url));
const colors = createColors();

function version() {
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
    return pkg.version;
}

function parseArgs(argv) {
    const flags = { latin: false, slug: false, strict: false, help: false, version: false };
    const words = [];
    for (const arg of argv) {
        switch (arg) {
            case "--latin": case "-l": flags.latin = true; break;
            case "--slug": case "-s": flags.slug = true; break;
            case "--strict": flags.strict = true; break;
            case "--help": case "-h": flags.help = true; break;
            case "--version": case "-v": flags.version = true; break;
            default:
                if (arg.startsWith("-")) { flags.unknown = arg; break; }
                words.push(arg);
        }
    }
    return { flags, text: words.join(" ") };
}

function help() {
    const b = colors.bold;
    const d = colors.dim;
    return [
        b("hinglish") + " - romanised Hindi <-> Devanagari, offline and rule-based",
        "",
        b("Usage"),
        "  hinglish <text>            Hinglish -> Devanagari",
        "  hinglish --latin <text>    Devanagari -> Latin",
        "  hinglish --slug <text>     URL-safe slug",
        "  cat file.txt | hinglish    read from stdin",
        "",
        b("Flags"),
        "  -l, --latin      romanise Devanagari instead of converting to it",
        "  -s, --slug       print a URL-safe slug",
        "      --strict     leave words that are not in the dictionary untouched",
        "  -h, --help       show this help",
        "  -v, --version    print the version",
        "",
        b("Examples"),
        d("  $ hinglish \"kaise ho\""),
        d("  $ hinglish --slug \"मेरा Blog पोस्ट #1\""),
        d("  $ echo \"नमस्ते\" | hinglish --latin"),
    ].join("\n");
}

function convert(text, flags) {
    if (flags.slug) return slugify(text);
    if (flags.latin) return toLatin(text);
    return toDevanagari(text, { strict: flags.strict });
}

function readStdin() {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => { data += chunk; });
        process.stdin.on("end", () => resolve(data));
    });
}

async function main() {
    const { flags, text } = parseArgs(process.argv.slice(2));

    if (flags.help) { process.stdout.write(help() + "\n"); return 0; }
    if (flags.version) { process.stdout.write(version() + "\n"); return 0; }
    if (flags.unknown) {
        process.stderr.write(colors.red(`unknown flag: ${flags.unknown}`) + "\n");
        process.stderr.write("run `hinglish --help`\n");
        return 1;
    }

    let input = text;
    if (!input && !process.stdin.isTTY) input = await readStdin();
    if (!input.trim()) { process.stdout.write(help() + "\n"); return 0; }

    const lines = input.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
    process.stdout.write(lines.map((line) => convert(line, flags)).join("\n") + "\n");
    return 0;
}

main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(colors.red(String(error && error.message ? error.message : error)) + "\n");
    process.exitCode = 1;
});
