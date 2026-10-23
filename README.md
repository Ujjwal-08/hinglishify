# hinglish

Convert romanised Hindi (Hinglish) to Devanagari and back, and make URL-safe slugs from
Hindi text. Rule-based, offline, zero dependencies.

```
$ npx hinglish "kaise ho"
कैसे हो

$ npx hinglish "mera naam Ujjwal hai aur yeh mera blog post hai"
मेरा नाम Ujjwal है और यह मेरा blog post है

$ npx hinglish --latin "नमस्ते दुनिया"
namaste duniya

$ npx hinglish --slug "मेरा Blog पोस्ट #1"
mera-blog-post-1

$ printf 'namaste dost\nzindagi ek safar hai\n' | npx hinglish
नमस्ते दोस्त
ज़िंदगी एक सफ़र है
```

## Install

```sh
npx hinglish "kaise ho"
```

```sh
npm i hinglish
```

Node 18 or newer. ESM only.

## Usage

### CLI

```
$ hinglish --help
hinglish - romanised Hindi <-> Devanagari, offline and rule-based

Usage
  hinglish <text>            Hinglish -> Devanagari
  hinglish --latin <text>    Devanagari -> Latin
  hinglish --slug <text>     URL-safe slug
  cat file.txt | hinglish    read from stdin

Flags
  -l, --latin      romanise Devanagari instead of converting to it
  -s, --slug       print a URL-safe slug
      --strict     leave words that are not in the dictionary untouched
  -h, --help       show this help
  -v, --version    print the version

Examples
  $ hinglish "kaise ho"
  $ hinglish --slug "मेरा Blog पोस्ट #1"
  $ echo "नमस्ते" | hinglish --latin
```

| Flag | Effect |
| --- | --- |
| `-l`, `--latin` | Devanagari to ASCII instead of the other way round |
| `-s`, `--slug` | print a URL-safe slug |
| `--strict` | leave words that are not in the dictionary exactly as typed |
| `-h`, `--help` | print help |
| `-v`, `--version` | print the version |

Text can come from arguments or from stdin. Each input line is converted separately.

### API

```js
import { toDevanagari, toLatin, slugify, isHinglish, addWords } from "hinglish";

toDevanagari("namaste duniya");        // नमस्ते दुनिया
toDevanagari("mera naam Ujjwal hai");  // मेरा नाम Ujjwal है
toLatin("नमस्ते दुनिया");                // namaste duniya
slugify("मेरा Blog पोस्ट #1");           // mera-blog-post-1
isHinglish("kaise ho");                // true
isHinglish("the quick brown fox");     // false

addWords({ jugaadu: "जुगाड़ू" });
toDevanagari("jugaadu banda");         // जुगाड़ू बंदा
```

Output captured from that exact snippet:

```
नमस्ते दुनिया
मेरा नाम Ujjwal है
namaste duniya
mera-blog-post-1
true false
जुगाड़ू बंदा
```

## API

### `toDevanagari(text, options?)`

Hinglish to Devanagari. Punctuation, digits, emoji, whitespace and text that is already
Devanagari pass through untouched, so running it twice is a no-op.

Words are resolved in this order: tokens containing digits, `ALL CAPS` tokens and
domain-looking tokens are left alone; then the dictionary; then the English stop-list
(`blog`, `post`, `api`, `www`, `https`, …); then capitalised words, which are treated as
proper nouns; then the phonetic rules.

- `options.strict` (default `false`) — when `true`, a word that is not in the dictionary
  is left exactly as typed instead of being guessed phonetically.

```js
toDevanagari("chai peelo yaar");                 // चाय पीलो यार
toDevanagari("chai peelo yaar", { strict: true }); // चाय peelo यार
```

### `toLatin(text)`

Devanagari to plain ASCII — no diacritics, because the point is slugs and search.
Non-Devanagari characters are left alone.

### `slugify(text, options?)`

`toLatin` for the Devanagari parts, then lowercase, strip punctuation, collapse to the
separator and trim. Never returns an empty string for input that contains Latin letters,
digits or Devanagari.

- `options.separator` (default `"-"`)
- `options.maxLength` (default: no limit) — truncates at a separator boundary
- `options.lowercase` (default `true`)

### `isDevanagari(text)`

`true` when the text contains Devanagari characters and no Latin letters.

### `isHinglish(text)`

Heuristic. Scores each Latin token against the dictionary, a shape test (`aa`, `kh`, `bh`,
`-ji`, `-wala`, …) and a common-English veto list, then asks for a simple majority.

### `transliterate(text, options?)`

Wrapper. `options.to` is `"devanagari"` (default) or `"latin"`.

### `dictionary`, `addWords(words)`, `getDictionary()`, `resetDictionary()`

`dictionary` is a read-only live view of the 298 built-in words — assigning to it throws.
`addWords` adds or overrides entries (keys are lowercased) and returns how many were
applied. `getDictionary()` returns a detached mutable copy; `resetDictionary()` drops
everything `addWords` added.

## Transliteration rules

Implemented in `src/mappings.js` (tables) and `src/transliterate.js` (the engine):

- **Inherent vowel and matras.** `k ka kaa ki kii ku kuu ke kai ko kau kam kan` →
  `क का का की की कू कू के कै को कौ कम कन`. A vowel at the start of a word, or straight
  after another vowel, is independent (अ आ इ ई …); inside a word it is the matra
  (ा ि ी ु ू े ै ो ौ).
- **Long word-final vowels.** Hinglish `hindi`, `tu`, `mera` mean हिंदी, तू, मेरा, so a
  final `i`/`u`/`a` is written long.
- **Aspirates and retroflex.** `kh gh ch chh jh th dh ph bh sh`, plus `T`→ट, `t`→त,
  `D`→ड, `d`→द, `N`→ण, `n`→न, `Sh`→ष. Lowercase-only typing still works (`tha` → था).
- **Conjuncts.** `kya` → क्या, `pyaar` → प्यार, `shraddha` → श्रद्धा, `kshama` → क्षमा,
  `dost` → दोस्त, `shabd` → शब्द.
- **Where *not* to join.** A halant is only inserted for a word-final cluster, a
  word-initial cluster, a geminate, or a listed conjunct pair. That is what keeps
  `karna` → करना rather than कर्ना, and `kitna`, `apna`, `sabse`, `matlab`, `bachpan`.
- **Nasals.** `n`/`m` before a stop become anusvara: `hindi` → हिंदी, `chand` → चंद,
  `sundar` → सुंदर, `angrezi` → अंग्रेज़ी. `m` only nasalises before a labial, so
  `kamzor` stays कमज़ोर. A final `-aan` becomes candrabindu: `haan` → हाँ, `yahaan` → यहाँ.
- **Nukta.** `z` → ज़, `f` → फ़, `q` → क़, `R` → ड़, and a trailing dot adds a nukta to the
  previous consonant (`kh.aas` → ख़ास). Output is always NFC, so nukta letters have one
  encoding.
- **Dictionary.** 298 frequent words override the rules, because exact Hindi spelling is
  not recoverable from Hinglish spelling.
- **Mixed English.** `ALL CAPS`, tokens with digits, domains, the English stop-list and
  capitalised proper nouns are left as typed.
- **Reverse.** `toLatin` collapses matras, maps nukta letters to `z`/`f`/`q`, and applies
  Hindi schwa deletion right to left: राम → `ram`, लड़का → `ladka`, करना → `karna`,
  मतलब → `matlab`, while कमल stays `kamal`.

## Honesty about the limits

Transliteration between Hinglish and Devanagari is **lossy and genuinely ambiguous**. This
library gets common text right and will get uncommon text wrong. Known cases:

- **Schwa deletion is a guess.** Hindi writes vowels it does not pronounce. `karna` is
  करना but `dost` is दोस्त, and nothing in the Latin spelling says which. The rule set
  above covers the usual shapes; `jaldi` → जल्दी and similar irregulars live in the
  dictionary instead.
- **त/ट, द/ड, न/ण, स/श cannot be recovered from lowercase typing.** `theek` is ठीक, not
  थीक, only because the dictionary says so. Type `T`, `D`, `N`, `Sh` for the retroflex
  letters when it matters.
- **Vowel length is lost in both directions.** `sharab` → शरब, not शराब. Going back,
  `काम` → `kam` and `राम` → `ram`, so `kaam` does not round-trip byte-identically.
  24 of the 30 round-trip words in the test suite come back unchanged; the other 6 lose
  a doubled vowel. The exact expectation for each word is asserted in
  `test/to-latin.test.js`.
- **Candrabindu vs anusvara.** `chand` → चंद, although चाँद is the moon. The rule follows
  the anusvara default; put the word you want in the dictionary.
- **Hinglish and English collide.** `the` is in the dictionary as थे, so English `the`
  becomes थे. `--strict`, the stop-list and `addWords` are the ways out.
- **Capitalised words are assumed to be proper nouns.** `Ujjwal` survives, which is the
  point, but so does `Takkar` — type it lowercase, or add it to the dictionary.
- **माँ romanises as `man`.** Candrabindu becomes `n`, which is right for यहाँ → `yahan`
  and wrong here.

### The escape hatch

Anything the rules get wrong is one line away from being right:

```js
import { dictionary, addWords } from "hinglish";

addWords({ "jugaad": "जुगाड़" });
```

Keys are lowercased and the dictionary always wins, including under `strict: true`.
`dictionary` itself is read-only — assigning to it throws — so nothing can corrupt the
table by accident.

## Why

Hindi content on the web is typed in Latin letters and published in Devanagari, and the
tools in between are either online APIs, machine-learning models, or 40 MB of training
data. This is a few tables and a scanner: it runs offline, in a build step, with no
network and no dependencies, and when it is wrong you can fix it with one dictionary
entry. The slug half exists because `encodeURIComponent("नमस्ते")` is not a URL anybody
wants to click.

## Support

If this saved you some time, you can support the work here:

- **Patreon:** https://www.patreon.com/cw/BABU_ISHU
- **PayPal:** https://www.paypal.com/ncp/payment/SECBQ62TRZZ6Y

## License

MIT
