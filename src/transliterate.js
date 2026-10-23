import {
    ANUSVARA,
    BASE_DICTIONARY,
    CANDRABINDU,
    CONJUNCT_PAIRS,
    CONSONANTS,
    CONSONANT_TO_LATIN,
    DIGIT_TO_LATIN,
    ENGLISH_COMMON,
    ENGLISH_STOP,
    FINAL_VOWEL_UPGRADE,
    INDEPENDENT_TO_LATIN,
    MATRA_TO_LATIN,
    NASAL_TRIGGERS_M,
    NASAL_TRIGGERS_N,
    NUKTA_TO_LATIN,
    SCAN_UNITS,
    SIGN_TO_LATIN,
    VIRAMA,
    VOWELS,
} from "./mappings.js";

const DEVANAGARI_RANGE = /[ऀ-ॿ]/;
const DEVANAGARI_RUN = /[ऀ-ॿ]+/g;
// Digits are part of the token so that `test123` is recognised as not-Hinglish.
const LATIN_TOKEN = /[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.?/g;

/**
 * Devanagari nukta letters have two legal encodings (precomposed ज़ U+095B and
 * decomposed ज + ़). Everything this module emits is NFC, which is the
 * decomposed form, so dictionary hits and phonetic output always match.
 */
function normalise(value) {
    return value.normalize("NFC");
}

function normalisedCopy(source) {
    const copy = Object.create(null);
    for (const [key, value] of Object.entries(source)) copy[key] = normalise(value);
    return copy;
}

/** Live dictionary. `addWords` writes here; lookups read from here. */
const store = normalisedCopy(BASE_DICTIONARY);

/**
 * Read-only live view of the dictionary. Writes are rejected (TypeError in
 * strict mode / ESM) so callers cannot corrupt it by accident.
 */
export const dictionary = new Proxy(store, {
    set() { return false; },
    defineProperty() { return false; },
    deleteProperty() { return false; },
    setPrototypeOf() { return false; },
});

/** Add or override dictionary entries. Returns the number of entries applied. */
export function addWords(words) {
    if (!words || typeof words !== "object") {
        throw new TypeError("addWords(words): expected an object of { hinglish: devanagari }");
    }
    let count = 0;
    for (const [key, value] of Object.entries(words)) {
        if (typeof value !== "string" || value.length === 0) continue;
        store[String(key).toLowerCase()] = normalise(value);
        count += 1;
    }
    return count;
}

/** A plain mutable copy of the dictionary, including anything `addWords` added. */
export function getDictionary() {
    return { ...store };
}

/** Restore the built-in dictionary, dropping everything `addWords` added. */
export function resetDictionary() {
    for (const key of Object.keys(store)) delete store[key];
    Object.assign(store, normalisedCopy(BASE_DICTIONARY));
    return getDictionary();
}

/** Split a Latin word into consonant / vowel units, longest match first. */
export function scanUnits(word) {
    const units = [];
    let i = 0;
    while (i < word.length) {
        let matched = null;
        for (const unit of SCAN_UNITS) {
            if (word.startsWith(unit.key, i)) {
                matched = unit;
                break;
            }
        }
        if (matched) {
            units.push({ key: matched.key, kind: matched.kind });
            i += matched.key.length;
        } else {
            units.push({ key: word[i], kind: "X" });
            i += 1;
        }
    }
    return units;
}

/** The letter a unit "belongs to", used to spot geminates (d/dh, c/ch, t/T). */
function baseLetter(key) {
    return key[0].toLowerCase();
}

/**
 * Only `aa` triggers the candrabindu rule. Widening it to ee/oo breaks
 * ordinary words (`qanoon` would become क़नूँ instead of क़ानून).
 */
function takesCandrabindu(key) {
    return key === "aa" || key === "A";
}

/**
 * Should a virama join C1 to the following consonant C2?
 * Anything that returns false keeps the inherent "a" (karna -> करना).
 */
function needsVirama(units, i) {
    const c1 = units[i].key;
    const c2 = units[i + 1].key;
    if (i + 1 === units.length - 1) return true;      // final cluster: dost, shabd
    if (i === 0) return true;                          // word-initial onset: kya, pyaar
    if (baseLetter(c1) === baseLetter(c2)) return true; // geminate: patta, accha
    return CONJUNCT_PAIRS.has(`${c1}|${c2}`);
}

/** Phonetic Hinglish -> Devanagari for one lowercase-ish word. */
export function transliterateWord(word) {
    const units = scanUnits(word);
    if (units.length === 0) return "";

    const vowelCount = units.filter((u) => u.kind === "V").length;
    let out = "";
    let prevWasVowel = true; // word start behaves like "after a vowel"

    for (let i = 0; i < units.length; i += 1) {
        const unit = units[i];
        const next = units[i + 1];
        const isLast = i === units.length - 1;

        if (unit.kind === "X") {
            out += unit.key;
            prevWasVowel = false;
            continue;
        }

        if (unit.kind === "V") {
            let key = unit.key;
            // Word-final short vowels are written long in Hindi: hindi -> हिंदी.
            if (isLast && FINAL_VOWEL_UPGRADE[key] && units.length > 1) {
                // A final "a" after a consonant is ा even in one-syllable words:
                // ja -> जा, ya -> या, ta -> ता, like ka -> का.
                key = FINAL_VOWEL_UPGRADE[key];
            }
            // `khao` -> खाओ: a bare "a" before another vowel is audible, so it
            // needs the ा matra rather than the silent inherent vowel.
            if (key === "a" && next && next.kind === "V") key = "aa";
            const [independent, matra] = VOWELS[key];
            out += prevWasVowel ? independent : matra;
            prevWasVowel = true;
            continue;
        }

        // Consonant.
        const nasalBase = unit.key === "n" || unit.key === "m";
        if (nasalBase && !isLast && next.kind === "C" && prevWasVowel && i > 0) {
            const triggers = unit.key === "n" ? NASAL_TRIGGERS_N : NASAL_TRIGGERS_M;
            if (triggers.has(next.key)) {
                out += ANUSVARA;
                prevWasVowel = false;
                continue;
            }
        }

        out += CONSONANTS[unit.key];
        prevWasVowel = false;

        if (!isLast && next.kind === "C") {
            if (needsVirama(units, i)) out += VIRAMA;
        }
    }

    // `haan` / `yahaan`: a final n after a long vowel is a candrabindu, not न.
    const last = units[units.length - 1];
    const beforeLast = units[units.length - 2];
    if (last && last.key === "n" && beforeLast && beforeLast.kind === "V"
        && takesCandrabindu(beforeLast.key)) {
        out = out.slice(0, -CONSONANTS.n.length) + CANDRABINDU;
    }

    return out;
}

function hasDigit(token) {
    return /[0-9]/.test(token);
}

function isAllCaps(token) {
    return /^[A-Z]+$/.test(token) && token.length > 1;
}

function isCapitalised(token) {
    return /^[A-Z][a-z]/.test(token);
}

function looksLikeDomain(token) {
    if (!token.includes(".")) return false;
    const parts = token.toLowerCase().split(".").filter(Boolean);
    return parts.length > 2 || parts.some((part) => ENGLISH_STOP.has(part));
}

/**
 * Convert Hinglish (romanised Hindi) to Devanagari.
 * Punctuation, digits, emoji, whitespace and existing Devanagari pass through.
 *
 * @param {string} text
 * @param {{ strict?: boolean }} [options] strict: leave words that are not in
 *   the dictionary exactly as they are instead of guessing phonetically.
 */
export function toDevanagari(text, options = {}) {
    if (typeof text !== "string") throw new TypeError("toDevanagari(text): text must be a string");
    const strict = options.strict === true;

    return normalise(text).replace(LATIN_TOKEN, (token) => {
        const lower = token.toLowerCase();
        if (hasDigit(token)) return token;
        if (isAllCaps(token)) return token;
        if (looksLikeDomain(token)) return token;
        if (store[lower]) return store[lower];
        if (ENGLISH_STOP.has(lower)) return token;
        if (isCapitalised(token)) return token; // proper noun: Ujjwal, Delhi
        if (strict) return token;
        return transliterateWord(token.replace(/\.$/, ""));
    });
}

/** Mid-word independent vowels romanise short: मुंबई -> mumbai, not munbaee. */
const SHORT_INDEPENDENT = { aa: "a", ee: "i", oo: "u" };
const LABIAL_LATIN = new Set(["p", "ph", "b", "bh", "m", "f"]);

/** Devanagari -> plain ASCII romanisation for one Devanagari run. */
function latiniseRun(run) {
    const chars = [...run];
    const parts = [];
    let i = 0;

    while (i < chars.length) {
        const pair = chars[i] + (chars[i + 1] ?? "");
        if (NUKTA_TO_LATIN[pair]) {
            parts.push({ t: "C", s: NUKTA_TO_LATIN[pair] });
            i += 2;
            continue;
        }
        const c = chars[i];
        i += 1;
        if (CONSONANT_TO_LATIN[c]) parts.push({ t: "C", s: CONSONANT_TO_LATIN[c] });
        else if (MATRA_TO_LATIN[c] !== undefined) parts.push({ t: "M", s: MATRA_TO_LATIN[c] });
        else if (c === VIRAMA) parts.push({ t: "H", s: "" });
        else if (INDEPENDENT_TO_LATIN[c]) parts.push({ t: "V", s: INDEPENDENT_TO_LATIN[c] });
        else if (c === ANUSVARA || c === CANDRABINDU) parts.push({ t: "N", s: "n" });
        else if (SIGN_TO_LATIN[c] !== undefined) parts.push({ t: "P", s: SIGN_TO_LATIN[c] });
        else if (DIGIT_TO_LATIN[c]) parts.push({ t: "P", s: DIGIT_TO_LATIN[c] });
        else parts.push({ t: "P", s: "" });
    }

    const drop = decideSchwaDeletion(parts);

    let out = "";
    for (let k = 0; k < parts.length; k += 1) {
        const part = parts[k];
        if (part.t === "V") {
            out += k === 0 ? part.s : (SHORT_INDEPENDENT[part.s] ?? part.s);
            continue;
        }
        if (part.t === "N") {
            // Anusvara is "m" before a labial (मुंबई -> mumbai), "n" otherwise.
            const after = parts[k + 1];
            out += after && after.t === "C" && LABIAL_LATIN.has(after.s) ? "m" : "n";
            continue;
        }
        if (part.t !== "C") {
            out += part.s;
            continue;
        }
        out += part.s;
        const next = parts[k + 1];
        if (next && next.t === "H") { k += 1; continue; }  // explicit halant
        if (next && next.t === "M") { out += next.s; k += 1; continue; }
        if (!drop[k]) out += "a";
    }
    return out;
}

/**
 * Hindi deletes some inherent "a" vowels in speech, and romanisation follows
 * speech: लड़का is "ladka", करना is "karna". Walk the syllables right to left,
 * dropping a schwa unless doing so would collide with the syllable next to it.
 */
function decideSchwaDeletion(parts) {
    const drop = new Array(parts.length).fill(false);
    let previousDeleted = false;

    for (let k = parts.length - 1; k >= 0; k -= 1) {
        const part = parts[k];
        if (part.t !== "C") { previousDeleted = false; continue; }

        const next = parts[k + 1];
        if (next && (next.t === "H" || next.t === "M")) { previousDeleted = false; continue; }

        if (k === parts.length - 1) { drop[k] = true; previousDeleted = true; continue; }

        const afterConjunct = k > 0 && (parts[k - 1].t === "H" || parts[k - 1].t === "N");
        const beforeConjunct = next && next.t === "C" && parts[k + 2] && parts[k + 2].t === "H";
        const keep = k === 0 || afterConjunct || beforeConjunct || previousDeleted;

        drop[k] = !keep;
        previousDeleted = drop[k];
    }
    return drop;
}

/**
 * Convert Devanagari to a readable ASCII romanisation. Lossy on purpose:
 * no diacritics, since the point is slugs and search.
 */
export function toLatin(text) {
    if (typeof text !== "string") throw new TypeError("toLatin(text): text must be a string");
    return text.normalize("NFC").replace(DEVANAGARI_RUN, latiniseRun);
}

/** True when the text contains Devanagari and no Latin letters. */
export function isDevanagari(text) {
    if (typeof text !== "string" || text.length === 0) return false;
    return DEVANAGARI_RANGE.test(text) && !/[A-Za-z]/.test(text);
}

const HINGLISH_SHAPE = /(aa|ee|oo|ii|kh|gh|bh|dh|jh|chh|th|ph|sh)/;
const HINGLISH_TAIL = /(ji|na|ne|ka|ki|ko|ta|ti|te|ya|ye|ho|hai|hun|wala|wali)$/;

/**
 * Heuristic: does this look like romanised Hindi rather than English?
 * Scores each Latin token against the dictionary, a shape test and a
 * common-English veto list, then asks for a simple majority.
 */
export function isHinglish(text) {
    if (typeof text !== "string") return false;
    const tokens = text.match(/[A-Za-z]+/g);
    if (!tokens || tokens.length === 0) return false;

    let score = 0;
    for (const token of tokens) {
        const lower = token.toLowerCase();
        if (ENGLISH_COMMON.has(lower) || ENGLISH_STOP.has(lower)) continue;
        if (store[lower]) { score += 1; continue; }
        if (HINGLISH_SHAPE.test(lower) || HINGLISH_TAIL.test(lower)) score += 0.5;
    }
    return score / tokens.length >= 0.5;
}

/** Convenience wrapper over toDevanagari / toLatin. */
export function transliterate(text, options = {}) {
    const to = options.to ?? "devanagari";
    if (to === "devanagari") return toDevanagari(text, options);
    if (to === "latin") return toLatin(text);
    throw new TypeError(`transliterate(): unknown target "${to}" (use "devanagari" or "latin")`);
}
