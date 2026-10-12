// Where a long app name may wrap in a picker, besides at spaces.
// Kept free of imports so it can be unit tested without a build.

const isLowercase = (character?: string) =>
    character !== undefined && character >= "a" && character <= "z";
const isUppercase = (character?: string) =>
    character !== undefined && character >= "A" && character <= "Z";

// Shorter words always fit a picker on one line.
const MIN_SPLIT_LENGTH = 9;

/**
 * Splits a name into the runs of text between its extra break opportunities:
 * after "/" or "." and between camelCase parts (TranslateLocally), in words
 * long enough to need them. The page puts a <wbr> between the parts, so a
 * long name wraps there rather than in the middle of a word.
 */
export function nameParts(name: string) {
    const parts = [""];
    for (const [wordIndex, word] of name.split(" ").entries()) {
        if (wordIndex > 0) parts[parts.length - 1] += " ";
        const split = word.length >= MIN_SPLIT_LENGTH;
        for (let index = 0; index < word.length; index++) {
            const breakBefore =
                split &&
                index > 0 &&
                index < word.length - 1 &&
                (word[index - 1] === "/" ||
                    word[index - 1] === "." ||
                    (isLowercase(word[index - 2]) &&
                        isLowercase(word[index - 1]) &&
                        isUppercase(word[index]) &&
                        isLowercase(word[index + 1])));
            if (breakBefore) parts.push("");
            parts[parts.length - 1] += word[index];
        }
    }
    return parts;
}
