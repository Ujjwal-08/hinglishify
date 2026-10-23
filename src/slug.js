import { toLatin } from "./transliterate.js";

const ALNUM_SOURCE = /[A-Za-z0-9ऀ-ॿ]/;

function trimSeparator(value, separator) {
    if (!separator) return value;
    let out = value;
    while (out.startsWith(separator)) out = out.slice(separator.length);
    while (out.endsWith(separator)) out = out.slice(0, -separator.length);
    return out;
}

/**
 * URL-safe slug from Hindi, Hinglish or mixed text.
 *
 * @param {string} text
 * @param {{ separator?: string, maxLength?: number, lowercase?: boolean }} [options]
 * @returns {string} never empty when the input contains Latin, digit or
 *   Devanagari characters.
 */
export function slugify(text, options = {}) {
    if (typeof text !== "string") throw new TypeError("slugify(text): text must be a string");

    const separator = options.separator ?? "-";
    const lowercase = options.lowercase !== false;
    const maxLength = Number.isFinite(options.maxLength) ? Math.max(0, Math.trunc(options.maxLength)) : 0;

    let working = toLatin(text);
    if (lowercase) working = working.toLowerCase();

    const safe = working.replace(/[^A-Za-z0-9]+/g, separator || "");
    let out = trimSeparator(safe, separator);
    if (separator) {
        const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        out = out.replace(new RegExp(`(?:${escaped})+`, "g"), separator);
        out = trimSeparator(out, separator);
    }

    if (maxLength > 0 && out.length > maxLength) {
        const hard = out.slice(0, maxLength);
        let cut = hard;
        if (separator) {
            const idx = hard.lastIndexOf(separator);
            if (idx > 0) cut = hard.slice(0, idx);
        }
        cut = trimSeparator(cut, separator);
        out = cut.length > 0 ? cut : trimSeparator(hard, separator) || hard;
    }

    if (out.length === 0 && ALNUM_SOURCE.test(text)) {
        // Last resort: keep raw alphanumerics so the guarantee always holds.
        const fallback = working.replace(/[^A-Za-z0-9]/g, "");
        if (fallback.length > 0) {
            return maxLength > 0 ? fallback.slice(0, maxLength) : fallback;
        }
    }

    return out;
}
