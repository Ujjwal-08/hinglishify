import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
    addWords,
    dictionary,
    getDictionary,
    isDevanagari,
    isHinglish,
    resetDictionary,
    scanUnits,
    toDevanagari,
} from "../index.js";

const run = promisify(execFile);
const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "hinglish.js");

test("isDevanagari is true only for Devanagari text without Latin letters", () => {
    assert.equal(isDevanagari("नमस्ते"), true);
    assert.equal(isDevanagari("नमस्ते दुनिया"), true);
    assert.equal(isDevanagari("क्या हाल है?"), true);
    assert.equal(isDevanagari("१२३"), true);

    assert.equal(isDevanagari("namaste"), false);
    assert.equal(isDevanagari("मेरा Blog"), false);
    assert.equal(isDevanagari(""), false);
    assert.equal(isDevanagari("123"), false);
    assert.equal(isDevanagari(null), false);
});

test("isHinglish spots romanised Hindi", () => {
    assert.equal(isHinglish("kaise ho"), true);
    assert.equal(isHinglish("mera naam Ujjwal hai"), true);
    assert.equal(isHinglish("bhai zindagi ek safar hai"), true);
    assert.equal(isHinglish("chai peelo yaar"), true);
    assert.equal(isHinglish("namaste"), true);
});

test("isHinglish says no to English and to Devanagari", () => {
    assert.equal(isHinglish("the quick brown fox"), false);
    assert.equal(isHinglish("hello world"), false);
    assert.equal(isHinglish("how are you doing today"), false);
    assert.equal(isHinglish("नमस्ते"), false);
    assert.equal(isHinglish(""), false);
    assert.equal(isHinglish(42), false);
});

test("scanUnits splits a word into its longest-match units", () => {
    assert.deepEqual(scanUnits("kya").map((u) => u.key), ["k", "y", "a"]);
    assert.deepEqual(scanUnits("chhota").map((u) => u.key), ["chh", "o", "t", "a"]);
    assert.deepEqual(scanUnits("kshama").map((u) => u.key), ["ksh", "a", "m", "a"]);
    assert.deepEqual(scanUnits("paani").map((u) => u.kind), ["C", "V", "C", "V"]);
});

test("the exported dictionary is a read-only live view", () => {
    assert.equal(typeof dictionary, "object");
    assert.equal(dictionary.namaste, "नमस्ते");
    assert.ok(Object.keys(dictionary).length >= 150, "at least 150 built-in words");

    assert.throws(() => { dictionary.namaste = "hacked"; }, TypeError);
    assert.throws(() => { dictionary.brandNew = "x"; }, TypeError);
    assert.throws(() => { delete dictionary.namaste; }, TypeError);
    assert.equal(dictionary.namaste, "नमस्ते", "still intact after the failed writes");
});

test("getDictionary hands back a detached copy", () => {
    const copy = getDictionary();
    copy.namaste = "tampered";
    copy.somethingElse = "x";
    assert.equal(dictionary.namaste, "नमस्ते");
    assert.equal(toDevanagari("namaste"), "नमस्ते");
    assert.equal(getDictionary().somethingElse, undefined);
});

test("addWords affects later conversions", (t) => {
    t.after(() => { resetDictionary(); });

    assert.equal(toDevanagari("blipblorp"), "ब्लिपबलोर्प", "before: guessed phonetically");

    const added = addWords({ blipblorp: "ब्लिपब्लोर्प", Jugaadu: "जुगाड़ू" });
    assert.equal(added, 2);

    assert.equal(toDevanagari("blipblorp"), "ब्लिपब्लोर्प", "after: dictionary wins");
    assert.equal(toDevanagari("jugaadu"), "जुगाड़ू", "keys are lowercased");
    assert.equal(dictionary.blipblorp, "ब्लिपब्लोर्प", "visible on the live view");
    assert.equal(toDevanagari("blipblorp hai"), "ब्लिपब्लोर्प है");
    assert.equal(toDevanagari("blipblorp", { strict: true }), "ब्लिपब्लोर्प", "strict uses it too");
});

test("resetDictionary undoes addWords", () => {
    addWords({ tempword: "टेम्प" });
    assert.equal(toDevanagari("tempword"), "टेम्प");
    resetDictionary();
    assert.equal(dictionary.tempword, undefined);
    assert.notEqual(toDevanagari("tempword"), "टेम्प");
});

test("addWords validates its argument and skips bad values", () => {
    assert.throws(() => addWords(null), TypeError);
    assert.throws(() => addWords("nope"), TypeError);
    assert.equal(addWords({ a: "", b: 5, c: "सी" }), 1);
    resetDictionary();
});

test("CLI converts Hinglish to Devanagari", async () => {
    const { stdout } = await run(process.execPath, [cli, "kaise ho"]);
    assert.equal(stdout.trim(), "कैसे हो");
});

test("CLI supports --latin, --slug and --strict", async () => {
    const latin = await run(process.execPath, [cli, "--latin", "नमस्ते दुनिया"]);
    assert.equal(latin.stdout.trim(), "namaste duniya");

    const slug = await run(process.execPath, [cli, "--slug", "मेरा Blog पोस्ट #1"]);
    assert.equal(slug.stdout.trim(), "mera-blog-post-1");

    const strict = await run(process.execPath, [cli, "--strict", "chai peelo"]);
    assert.equal(strict.stdout.trim(), "चाय peelo");
});

test("CLI prints help and version", async () => {
    const help = await run(process.execPath, [cli, "--help"]);
    assert.match(help.stdout, /Usage/);
    assert.match(help.stdout, /--slug/);

    const version = await run(process.execPath, [cli, "--version"]);
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("CLI reports unknown flags on stderr", async () => {
    await assert.rejects(
        () => run(process.execPath, [cli, "--nope"]),
        (error) => {
            assert.equal(error.code, 1);
            assert.match(error.stderr, /unknown flag/);
            return true;
        },
    );
});
