import assert from "node:assert/strict";
import test from "node:test";

import { slugify } from "../index.js";

test("slugify handles pure Hindi", () => {
    assert.equal(slugify("नमस्ते दुनिया"), "namaste-duniya");
    assert.equal(slugify("आम"), "aam");
    assert.equal(slugify("घर"), "ghar");
    assert.equal(slugify("नमस्ते दुनिया और सब"), "namaste-duniya-aur-sab");
});

test("slugify handles mixed Hindi and English", () => {
    assert.equal(slugify("मेरा Blog पोस्ट #1"), "mera-blog-post-1");
    assert.equal(slugify("भारत 2026 ka plan"), "bharat-2026-ka-plan");
    assert.equal(slugify("हिंदी के 10 सबक"), "hindi-ke-10-sabak");
});

test("slugify strips punctuation and collapses whitespace", () => {
    assert.equal(slugify("  ---Hello  World!!!  "), "hello-world");
    assert.equal(slugify("Ekdum  mast!!"), "ekdum-mast");
    assert.equal(slugify("--घर--"), "ghar");
    assert.equal(slugify("a....b"), "a-b");
});

test("slugify drops emoji but keeps the words around them", () => {
    assert.equal(slugify("🎉 पार्टी time 🎉"), "parti-time");
    assert.equal(slugify("dost 🙏 forever"), "dost-forever");
});

test("slugify keeps digits", () => {
    assert.equal(slugify("7"), "7");
    assert.equal(slugify("version 2 ka update"), "version-2-ka-update");
});

test("slugify never leaves a leading, trailing or doubled separator", () => {
    for (const input of ["  ---Hello  World!!!  ", "🎉 पार्टी time 🎉", "--घर--", "!!a!!b!!"]) {
        const slug = slugify(input);
        assert.ok(!slug.startsWith("-"), `no leading separator: ${slug}`);
        assert.ok(!slug.endsWith("-"), `no trailing separator: ${slug}`);
        assert.ok(!slug.includes("--"), `no doubled separator: ${slug}`);
    }
});

test("slugify respects maxLength and cuts at a word boundary", () => {
    assert.equal(slugify("नमस्ते दुनिया और सब", { maxLength: 14 }), "namaste");
    assert.equal(slugify("namaste", { maxLength: 3 }), "nam");
    assert.equal(slugify("namaste duniya", { maxLength: 100 }), "namaste-duniya");
    const capped = slugify("हिंदी के 10 सबक", { maxLength: 10 });
    assert.ok(capped.length <= 10, `"${capped}" fits in 10 characters`);
    assert.ok(!capped.endsWith("-"));
});

test("slugify accepts a custom separator", () => {
    assert.equal(slugify("नमस्ते दुनिया", { separator: "_" }), "namaste_duniya");
    assert.equal(slugify("नमस्ते दुनिया", { separator: "" }), "namasteduniya");
    assert.equal(slugify("  ---Hello  World!!!  ", { separator: "." }), "hello.world");
});

test("slugify can keep the original case", () => {
    assert.equal(slugify("Mera Blog", { lowercase: false }), "Mera-Blog");
    assert.equal(slugify("Mera Blog"), "mera-blog");
});

test("slugify never returns an empty string for input with alphanumeric content", () => {
    const inputs = [
        "a", "7", "आम", "नमस्ते दुनिया", "मेरा Blog पोस्ट #1", "🎉 पार्टी time 🎉",
        "!!!x!!!", "   9   ", "क", "Z",
    ];
    for (const input of inputs) {
        assert.notEqual(slugify(input), "", `slug of ${JSON.stringify(input)}`);
    }
    for (const input of ["a", "7", "आम", "क"]) {
        assert.notEqual(slugify(input, { maxLength: 1 }), "", `capped slug of ${input}`);
    }
});

test("slugify returns an empty string when there is nothing to slug", () => {
    assert.equal(slugify(""), "");
    assert.equal(slugify("..."), "");
    assert.equal(slugify("🎉🎉"), "");
});

test("slugify rejects non-string input", () => {
    assert.throws(() => slugify(undefined), TypeError);
});
