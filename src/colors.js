/** Tiny ANSI helper. No dependencies, and it degrades to plain text. */

const CODES = {
    reset: "\u001b[0m",
    bold: "\u001b[1m",
    dim: "\u001b[2m",
    red: "\u001b[31m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    cyan: "\u001b[36m",
};

export function colorEnabled(env = process.env, stream = process.stdout) {
    if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
    if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "" && env.FORCE_COLOR !== "0") return true;
    return Boolean(stream && stream.isTTY);
}

export function createColors(enabled = colorEnabled()) {
    const wrap = (code) => (text) => (enabled ? code + text + CODES.reset : String(text));
    return {
        enabled,
        bold: wrap(CODES.bold),
        dim: wrap(CODES.dim),
        red: wrap(CODES.red),
        green: wrap(CODES.green),
        yellow: wrap(CODES.yellow),
        cyan: wrap(CODES.cyan),
    };
}
