/**
 * Normalizes a string for search by:
 * 1. Converting to lowercase
 * 2. Removing punctuation (non-alphanumeric except spaces)
 * 3. Collapsing multiple spaces into one
 * 4. Trimming whitespace
 * 
 * @param str The string to normalize
 * @returns The normalized string
 */
export const normalizeSearchString = (str: string | null | undefined): string => {
    if (!str) return '';

    return str
        .toLowerCase()
        // Remove punctuation: everything that is not a letter, number, or space
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        // Replace multiple spaces/newlines with a single space
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Splits query into search tokens (words) and checks if EVERY word matches the target text.
 * Gracefully handles trailing spaces, multiple words out of order, and punctuation.
 * 
 * Example: Searching "you world" will match "YOU CONQUERED THE WORLD".
 * Searching "praise key g" will match if category is Praise and key is G.
 * 
 * @param target A string or array of searchable strings
 * @param query The user's search query
 * @returns boolean
 */
export const matchesSearchTokens = (
    target: string | (string | null | undefined)[] | null | undefined,
    query: string | null | undefined
): boolean => {
    if (!query) return true;
    const cleanQuery = normalizeSearchString(query);
    if (!cleanQuery) return true;

    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    let corpus = '';
    if (Array.isArray(target)) {
        corpus = normalizeSearchString(target.filter(Boolean).join(' '));
    } else {
        corpus = normalizeSearchString(target);
    }

    // Every token in the query must be found in the searchable corpus
    return tokens.every(token => corpus.includes(token));
};

/**
 * Checks if HTML content has any visible text after stripping tags
 * @param html The HTML string to check
 * @returns boolean
 */
export const hasVisibleContent = (html?: string | null): boolean => {
    if (!html) return false;
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text.length > 0;
};

/**
 * Strips HTML tags and &nbsp; from a string
 * @param html The HTML string to clean
 * @returns string
 */
export const stripHtml = (html?: string | null): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

/**
 * Formats seconds into M:SS format
 * @param time Time in seconds
 * @returns string
 */
export const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
