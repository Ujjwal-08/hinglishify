import assert from "node:assert/strict";
import test from "node:test";

import { toDevanagari, toLatin, transliterate } from "../index.js";

const TABLE = [
    ["नमस्ते", "namaste"],
    ["दुनिया", "duniya"],
    ["घर", "ghar"],
    ["हिंदी", "hindi"],
    ["भारत", "bharat"],
    ["दिल्ली", "dilli"],
    ["मुंबई", "mumbai"],
    ["पानी", "pani"],
    ["ख़ुशी", "khushi"],
    ["फ़िल्म", "film"],
    ["ज़रूरी", "zaruri"],
    ["क़िला", "qila"],
    ["आम", "aam"],
    ["ऊपर", "oopar"],
    ["एक", "ek"],
    ["औरत", "aurat"],
    ["दोस्त", "dost"],
    ["क्या", "kya"],
    ["चाँद", "chand"],
    ["पोस्ट", "post"],
    ["मंदिर", "mandir"],
    ["ज़िंदगी", "zindagi"],
    ["कमरा", "kamra"],
    ["प्यार", "pyar"],
    ["श्रद्धा", "shraddha"],
    ["क्षमा", "kshama"],
    ["जुगाड़", "jugad"],
    ["सड़क", "sadak"],
];

/** Hindi drops some inherent vowels in speech; romanisation follows speech. */
const SCHWA_DELETION = [
    ["राम", "ram"],        // final schwa dropped
    ["कमल", "kamal"],      // medial schwa kept
    ["मतलब", "matlab"],    // medial schwa dropped
    ["करना", "karna"],
    ["कितना", "kitna"],
    ["सबसे", "sabse"],
    ["अपना", "apna"],
    ["धरती", "dharti"],
    ["आदमी", "aadmi"],
    ["लड़का", "ladka"],
    ["लड़की", "ladki"],
    ["कहानी", "kahani"],
    ["सूरज", "suraj"],
    ["मेहनत", "mehnat"],
    ["शहर", "shahar"],
    ["समझ", "samajh"],
    ["सुंदर", "sundar"],
];

test("toLatin romanises Devanagari words", () => {
    for (const [input, expected] of TABLE) {
        assert.equal(toLatin(input), expected, `${input} -> ${expected}`);
    }
});

test("toLatin applies Hindi schwa deletion", () => {
    for (const [input, expected] of SCHWA_DELETION) {
        assert.equal(toLatin(input), expected, `${input} -> ${expected}`);
    }
});

test("toLatin leaves non-Devanagari text alone", () => {
    assert.equal(toLatin("नमस्ते दुनिया"), "namaste duniya");
    assert.equal(toLatin("hello दोस्त 2026"), "hello dost 2026");
    assert.equal(toLatin("ABC"), "ABC");
    assert.equal(toLatin(""), "");
});

test("toLatin converts Devanagari digits", () => {
    assert.equal(toLatin("१२३"), "123");
});

test("toLatin accepts precomposed nukta letters as well as decomposed ones", () => {
    assert.equal(toLatin("क़िला"), "qila", "precomposed U+0958");
    assert.equal(toLatin("क़िला"), "qila", "decomposed क + nukta");
});

test("toLatin rejects non-string input", () => {
    assert.throws(() => toLatin(7), TypeError);
});

/**
 * Round trip: toLatin(toDevanagari(word)). The expectation is written out per
 * word because the trip is lossy - long "aa" collapses to a single "a".
 */
const ROUND_TRIP = [
    ["namaste", "namaste"],
    ["duniya", "duniya"],
    ["dost", "dost"],
    ["ghar", "ghar"],
    ["paani", "pani"],      // ा romanises as "a"
    ["kaise", "kaise"],
    ["khush", "khush"],
    ["mera", "mera"],
    ["sundar", "sundar"],
    ["mandir", "mandir"],
    ["dil", "dil"],
    ["din", "din"],
    ["raat", "rat"],        // lossy
    ["kaam", "kam"],        // lossy
    ["naam", "nam"],        // lossy
    ["pyaar", "pyar"],      // lossy
    ["shukriya", "shukriya"],
    ["zindagi", "zindagi"],
    ["kitab", "kitab"],
    ["suraj", "suraj"],
    ["desh", "desh"],
    ["khel", "khel"],
    ["shaam", "sham"],      // lossy
    ["sach", "sach"],
    ["kabhi", "kabhi"],
    ["mast", "mast"],
    ["shabd", "shabd"],
    ["chalo", "chalo"],
    ["karo", "karo"],
    ["dekho", "dekho"],
];

test("round trip returns the documented spelling for each word", () => {
    for (const [word, expected] of ROUND_TRIP) {
        assert.equal(toLatin(toDevanagari(word)), expected, `round trip of ${word}`);
    }
});

test("24 of the 30 round-trip words come back byte-identical", () => {
    const identical = ROUND_TRIP.filter(([word, expected]) => word === expected);
    assert.equal(identical.length, 24);
});

test("transliterate wraps both directions", () => {
    assert.equal(transliterate("kaise ho"), "कैसे हो");
    assert.equal(transliterate("kaise ho", { to: "devanagari" }), "कैसे हो");
    assert.equal(transliterate("नमस्ते दुनिया", { to: "latin" }), "namaste duniya");
    assert.equal(transliterate("chai peelo", { to: "devanagari", strict: true }), "चाय peelo");
    assert.throws(() => transliterate("x", { to: "klingon" }), TypeError);
});
