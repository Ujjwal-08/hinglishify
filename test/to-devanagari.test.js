import assert from "node:assert/strict";
import test from "node:test";

import { toDevanagari, transliterateWord } from "../index.js";

/**
 * Every row is asserted individually, so a failure names the exact word.
 * Expectations were captured from real runs, not guessed.
 */
const TABLE = [
    // consonant + inherent "a", and the matra ladder
    ["k", "क"],
    ["ka", "का"],
    ["kaa", "का"],
    ["ki", "की"],
    ["kii", "की"],
    ["ku", "कू"],
    ["kuu", "कू"],
    ["ke", "के"],
    ["kai", "कै"],
    ["ko", "को"],
    ["kau", "कौ"],
    ["kam", "कम"],
    ["kan", "कन"],

    // independent vowels at the start of a word
    ["a", "अ"],
    ["aa", "आ"],
    ["ee", "ई"],
    ["oo", "ऊ"],
    ["e", "ए"],
    ["ai", "ऐ"],
    ["o", "ओ"],
    ["au", "औ"],
    ["aam", "आम"],
    ["idhar", "इधर"],
    ["udhar", "उधर"],
    ["ek", "एक"],

    // a vowel after another vowel stays independent
    ["khao", "खाओ"],
    ["jao", "जाओ"],
    ["aao", "आओ"],

    // conjuncts joined with a halant
    ["kya", "क्या"],
    ["pyaar", "प्यार"],
    ["shraddha", "श्रद्धा"],
    ["kshama", "क्षमा"],
    ["prem", "प्रेम"],
    ["shukriya", "शुक्रिया"],
    ["patta", "पत्ता"],
    ["bachcha", "बच्चा"],
    // written out so the file's own encoding cannot hide a nukta mismatch
    ["izzat", "इज़्ज़त"],
    ["dilli", "दिल्ली"],
    ["dost", "दोस्त"],
    ["shabd", "शब्द"],
    ["arth", "अर्थ"],
    ["mushkil", "मुश्किल"],
    ["pustak", "पुस्तक"],

    // no halant where Hindi keeps the inherent vowel
    ["karna", "करना"],
    ["karte", "करते"],
    ["apna", "अपना"],
    ["kitna", "कितना"],
    ["sabse", "सबसे"],
    ["matlab", "मतलब"],
    ["bachpan", "बचपन"],
    ["rakhna", "रखना"],

    // nasals: anusvara before a stop, plain न/म otherwise
    ["hindi", "हिंदी"],
    ["chand", "चंद"],
    ["sundar", "सुंदर"],
    ["mandir", "मंदिर"],
    ["angrezi", "अंग्रेज़ी"],
    ["manzil", "मंज़िल"],
    ["lamba", "लंबा"],
    ["kamzor", "कमज़ोर"],
    ["namkeen", "नमकीन"],

    // candrabindu
    ["haan", "हाँ"],
    ["yahaan", "यहाँ"],
    ["kahaan", "कहाँ"],
    ["gaon", "गाँव"],

    // nukta letters
    ["zindagi", "ज़िंदगी"],
    ["faisla", "फ़ैसला"],
    ["qamar", "क़मर"],
    ["kh.aas", "ख़ास"],
    ["waqt", "वक़्त"],
    ["ishq", "इश्क़"],
    ["jugaad", "जुगाड़"],

    // aspirates and retroflex
    ["khush", "खुश"],
    ["ghar", "घर"],
    ["jhooth", "झूठ"],
    ["theek", "ठीक"],
    ["chota", "छोटा"],

    // dictionary words
    ["namaste", "नमस्ते"],
    ["dhanyavad", "धन्यवाद"],
    ["kaise", "कैसे"],
    ["kaisa", "कैसा"],
    ["hai", "है"],
    ["hain", "हैं"],
    ["tha", "था"],
    ["thi", "थी"],
    ["the", "थे"],
    ["kyun", "क्यों"],
    ["kyunki", "क्योंकि"],
    ["nahi", "नहीं"],
    ["nahin", "नहीं"],
    ["mera", "मेरा"],
    ["tumhara", "तुम्हारा"],
    ["aapka", "आपका"],
    ["hum", "हम"],
    ["yeh", "यह"],
    ["woh", "वह"],
    ["bahut", "बहुत"],
    ["zyada", "ज़्यादा"],
    ["bhai", "भाई"],
    ["maa", "माँ"],
    ["chai", "चाय"],
    ["purana", "पुराना"],
    ["bada", "बड़ा"],
];

test("toDevanagari converts Hinglish word by word", () => {
    for (const [input, expected] of TABLE) {
        assert.equal(toDevanagari(input), expected, `${input} -> ${expected}`);
    }
});

test("toDevanagari handles whole phrases", () => {
    assert.equal(toDevanagari("namaste duniya"), "नमस्ते दुनिया");
    assert.equal(toDevanagari("kaise ho"), "कैसे हो");
    assert.equal(toDevanagari("mera naam Ujjwal hai"), "मेरा नाम Ujjwal है");
});

test("capitalised words that are not in the dictionary are left alone", () => {
    assert.equal(toDevanagari("Ujjwal"), "Ujjwal");
    assert.equal(toDevanagari("Delhi se"), "Delhi से");
    assert.equal(toDevanagari("Namaste"), "नमस्ते", "a dictionary hit still wins");
});

test("ALL CAPS, digits and the English stop-list pass through", () => {
    assert.equal(toDevanagari("NASA ka mission"), "NASA का मिस्सिओन");
    assert.equal(toDevanagari("test123 hai"), "test123 है");
    assert.equal(toDevanagari("v2 app"), "v2 app");
    assert.equal(toDevanagari("chai aur blog"), "चाय और blog");
    assert.equal(toDevanagari("yeh mera blog post hai"), "यह मेरा blog post है");
    assert.equal(toDevanagari("https://example.com par dekho"), "https://example.com पर देखो");
});

test("punctuation, numbers, emoji and whitespace survive untouched", () => {
    assert.equal(toDevanagari("namaste, dost! 100% 🎉"), "नमस्ते, दोस्त! 100% 🎉");
    assert.equal(toDevanagari("kaise   ho"), "कैसे   हो");
    assert.equal(toDevanagari("ho\nkaise"), "हो\nकैसे");
    assert.equal(toDevanagari(""), "");
});

test("strict mode keeps unrecognised words as typed", () => {
    assert.equal(toDevanagari("xyzzy plugh frotz", { strict: true }), "xyzzy plugh frotz");
    assert.equal(toDevanagari("kaise ho bhai", { strict: true }), "कैसे हो भाई");
    assert.equal(toDevanagari("chai peelo yaar", { strict: true }), "चाय peelo यार");
    assert.notEqual(toDevanagari("peelo"), "peelo", "non-strict still guesses");
});

test("toDevanagari is idempotent on text that is already Devanagari", () => {
    for (const text of ["नमस्ते दुनिया", "मेरा नाम है", "क्या हाल है?", "श्रद्धा और क्षमा"]) {
        assert.equal(toDevanagari(text), text);
        assert.equal(toDevanagari(toDevanagari(text)), text);
    }
});

test("toDevanagari rejects non-string input", () => {
    assert.throws(() => toDevanagari(42), TypeError);
    assert.throws(() => toDevanagari(null), TypeError);
});

test("output is always NFC, so nukta letters have one encoding", () => {
    for (const word of ["izzat", "zindagi", "jugaad", "bada", "waqt", "maaf", "angrezi"]) {
        const out = toDevanagari(word);
        assert.equal(out, out.normalize("NFC"), `${word} -> ${out}`);
    }
    // Precomposed ज़ (U+095B) in the input is normalised on the way through.
    assert.equal(toDevanagari("ज़िंदगी"), "ज़िंदगी");
});

test("transliterateWord bypasses the dictionary", () => {
    assert.equal(transliterateWord("chand"), "चंद");
    assert.equal(transliterateWord("kaise"), "कैसे");
});
