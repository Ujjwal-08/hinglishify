export interface ToDevanagariOptions {
    /**
     * When true, Latin words that are not in the dictionary are left exactly as
     * they are instead of being transliterated phonetically. Default: false.
     */
    strict?: boolean;
}

export interface SlugifyOptions {
    /** Word separator. Default: "-". */
    separator?: string;
    /** Trim to at most this many characters, cutting at a separator. Default: no limit. */
    maxLength?: number;
    /** Lowercase the result. Default: true. */
    lowercase?: boolean;
}

export interface TransliterateOptions extends ToDevanagariOptions {
    /** Target script. Default: "devanagari". */
    to?: "devanagari" | "latin";
}

export type Dictionary = Readonly<Record<string, string>>;

/** Convert romanised Hindi to Devanagari. Non-Latin characters pass through. */
export function toDevanagari(text: string, options?: ToDevanagariOptions): string;

/** Convert Devanagari to a plain-ASCII romanisation (lossy, no diacritics). */
export function toLatin(text: string): string;

/** Build a URL-safe slug from Hindi, Hinglish or mixed text. */
export function slugify(text: string, options?: SlugifyOptions): string;

/** True when the text contains Devanagari characters and no Latin letters. */
export function isDevanagari(text: string): boolean;

/** Heuristic: true when the Latin text reads as romanised Hindi, not English. */
export function isHinglish(text: string): boolean;

/** Convenience wrapper around toDevanagari / toLatin. */
export function transliterate(text: string, options?: TransliterateOptions): string;

/** Read-only live view of the word dictionary. Assigning to it throws. */
export const dictionary: Dictionary;

/** Add or override dictionary entries. Returns how many entries were applied. */
export function addWords(words: Record<string, string>): number;

/** A plain mutable copy of the dictionary, including additions. */
export function getDictionary(): Record<string, string>;

/** Drop everything addWords added and restore the built-in dictionary. */
export function resetDictionary(): Record<string, string>;

/** Low-level: transliterate a single Latin word, ignoring the dictionary. */
export function transliterateWord(word: string): string;

/** Low-level: split a Latin word into consonant ("C") and vowel ("V") units. */
export function scanUnits(word: string): Array<{ key: string; kind: "C" | "V" | "X" }>;
