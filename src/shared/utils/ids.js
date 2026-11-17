import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Record ids in the address bar.
 *
 * `/events/3/forms/21/data` tells anyone reading over a shoulder how many
 * events exist, how many forms, and that the next one along is probably 22 —
 * so every dashboard URL carries its ids encoded instead: `/events/a112mifo/...`.
 *
 * Be clear about what this is. It is obfuscation, not access control: the
 * mapping is reversible by anyone who reads this file, and it is meant to stop
 * ids being *legible*, not to stop them being *guessed*. What actually protects
 * a record is the ownership and team checks the API runs on every request —
 * ask for an event you do not own and you get "not found" whatever the URL
 * said. Those checks are the security; this is tidiness.
 *
 * The mapping is a fixed, reversible 32-bit shuffle, so a given id always
 * produces the same code: a link someone bookmarked or pasted into a message
 * keeps working, which a random per-visit token would not.
 */

/** Odd, so it has a multiplicative inverse modulo 2^32 and the map is reversible. */
const KEY = 2654435761;

/** Mixed in afterwards so consecutive ids do not produce neighbouring codes. */
const SALT = 0x5f3a91c7;

/**
 * The inverse of KEY modulo 2^32, by Newton's method — five doublings take the
 * three correct bits an odd number starts with up past 32.
 */
const inverseOf = (a) => {
    let x = a;

    for (let i = 0; i < 5; i++) {
        x = Math.imul(x, 2 - Math.imul(a, x));
    }

    return x >>> 0;
};

const KEY_INVERSE = inverseOf(KEY);

/** Digits and lower-case letters: short, unambiguous, and safe in a path. */
const RADIX = 36;

/** Every uint32 fits in seven base-36 digits, and is padded to exactly that. */
const WIDTH = 7;

/**
 * A leading letter, so an encoded id can never be mistaken for a plain number.
 *
 * Old links carry a bare id — `/events/3` — and those still have to work, which
 * means a code has to be tellable from a number at a glance. Base 36 alone is
 * not enough: roughly one code in two thousand comes out all digits, and that
 * handful would decode as the wrong record. The letter also doubles as a weak
 * checksum, so a mistyped URL is rejected rather than silently pointing at
 * somebody else's event.
 */
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const checkLetter = (scrambled) => LETTERS[scrambled % LETTERS.length];

/**
 * An id as it appears in a URL.
 *
 * Anything that is not a positive whole number is handed back untouched, so a
 * slug, a token or an already-encoded value can be passed through a link
 * builder without being mangled.
 */
export const encodeId = (value) => {
    const n = Number(value);

    if (!Number.isInteger(n) || n <= 0 || n > 0xffffffff) {
        return value == null ? '' : String(value);
    }

    const scrambled = (Math.imul(n, KEY) ^ SALT) >>> 0;

    return checkLetter(scrambled) + scrambled.toString(RADIX).padStart(WIDTH, '0');
};

/**
 * The id behind a URL segment.
 *
 * A plain number comes back as itself: links made before ids were encoded, and
 * anything typed by hand, keep working rather than 404ing. Anything that does
 * not decode to a plausible id comes back null, so a caller can tell the
 * difference between "no id here" and "id zero".
 */
export const decodeId = (value) => {
    if (value === null || value === undefined || value === '') return null;

    const text = String(value).trim();

    // An id as it used to appear. Still honoured, so old links survive.
    if (/^\d+$/.test(text)) {
        const plain = Number(text);

        return plain > 0 ? plain : null;
    }

    if (!/^[a-z][0-9a-z]{7}$/.test(text)) return null;

    const scrambled = parseInt(text.slice(1), RADIX);

    if (!Number.isInteger(scrambled) || scrambled < 0 || scrambled > 0xffffffff) return null;

    // A code that does not carry its own check letter was not one of ours.
    if (checkLetter(scrambled) !== text[0]) return null;

    const n = Math.imul((scrambled ^ SALT) >>> 0, KEY_INVERSE) >>> 0;

    return n > 0 && n <= 0xffffffff ? n : null;
};

/**
 * Route parameters that name a record, and so are encoded in the path.
 *
 * Everything else a route carries — a form slug, a fixture token, a category
 * name — is already opaque or already public, and is left exactly as it is.
 */
const ID_PARAMS = ['id', 'eventId', 'formId', 'collectionId', 'submissionId'];

/**
 * `useParams()` with the record ids decoded back to numbers.
 *
 * Components read ids from here rather than from useParams directly, so the
 * encoding lives in one place instead of in every page that happens to need an
 * id. A parameter that does not decode comes back as it arrived, which keeps a
 * mistyped URL a 404 from the API rather than a crash on the way there.
 */
export const useRouteIds = () => {
    const params = useParams();

    return useMemo(() => {
        const out = { ...params };

        ID_PARAMS.forEach((key) => {
            if (out[key] === undefined) return;

            const decoded = decodeId(out[key]);

            out[key] = decoded === null ? out[key] : String(decoded);
        });

        return out;
    }, [params]);
};
