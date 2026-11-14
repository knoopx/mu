export interface FuzzyMatchResult {
  matches: boolean;
  score: number;
}

const WORD_BOUNDARY = /[\s\-_./:]/;

const LETTERS_THEN_DIGITS = /^(?<letters>[a-z]+)(?<digits>[0-9]+)$/;
const DIGITS_THEN_LETTERS = /^(?<digits>[0-9]+)(?<letters>[a-z]+)$/;

/**
 * One query scored against the text as the subsequence it finds.
 *
 * The lower the score the better: a run of consecutive characters is worth more
 * with every character it takes, a gap costs what it skips, a character standing
 * at the start of a word costs ten, and the earliest find of all costs the least.
 * A query that is the whole text costs a hundred more, so an exact name wins.
 */
function scoreQuery(text: string, query: string): FuzzyMatchResult {
  if (query.length === 0) return { matches: true, score: 0 };
  if (query.length > text.length) return { matches: false, score: 0 };

  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;

  while (queryIndex < query.length) {
    const i = text.indexOf(query[queryIndex], lastMatchIndex + 1);
    if (i === -1) break;

    const isWordBoundary = i === 0 || WORD_BOUNDARY.test(text[i - 1] ?? "");
    if (lastMatchIndex === i - 1) {
      consecutiveMatches++;
      score -= consecutiveMatches * 5;
    } else {
      consecutiveMatches = 0;
      if (lastMatchIndex >= 0) score += (i - lastMatchIndex - 1) * 2;
    }
    if (isWordBoundary) score -= 10;
    score += i * 0.1;

    lastMatchIndex = i;
    queryIndex++;
  }

  if (queryIndex < query.length) return { matches: false, score: 0 };
  if (query === text) score -= 100;
  return { matches: true, score };
}

/** The same query with its letters and its digits the other way round: `usb3`
 *  reaches `usb 3`, `3usb` reaches `usb3`. A query that is not one run of each
 *  has no other reading, and answers empty. */
function transposed(query: string): string {
  const lettersThenDigits = query.match(LETTERS_THEN_DIGITS);
  if (lettersThenDigits !== null)
    return `${lettersThenDigits.groups?.digits ?? ""}${lettersThenDigits.groups?.letters ?? ""}`;
  const digitsThenLetters = query.match(DIGITS_THEN_LETTERS);
  if (digitsThenLetters !== null)
    return `${digitsThenLetters.groups?.letters ?? ""}${digitsThenLetters.groups?.digits ?? ""}`;
  return "";
}

export function fuzzyMatch(query: string, text: string): FuzzyMatchResult {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  const primaryMatch = scoreQuery(textLower, queryLower);
  if (primaryMatch.matches) return primaryMatch;

  const swappedQuery = transposed(queryLower);
  if (swappedQuery === "") return primaryMatch;
  const swappedMatch = scoreQuery(textLower, swappedQuery);
  // A find made by reading the query the other way round still counts, but never
  // ahead of one made by reading it as typed.
  return swappedMatch.matches
    ? { matches: true, score: swappedMatch.score + 5 }
    : primaryMatch;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  if (!query.trim()) return items;
  const tokens = query
    .trim()
    .split(/[\s/]+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return items;

  const results: { item: T; totalScore: number }[] = [];
  for (const item of items) {
    const text = getText(item);
    let totalScore = 0;
    let allMatch = true;
    for (const token of tokens) {
      const match = fuzzyMatch(token, text);
      if (match.matches) totalScore += match.score;
      else {
        allMatch = false;
        break;
      }
    }
    if (allMatch) results.push({ item, totalScore });
  }

  return results
    .sort((a, b) => a.totalScore - b.totalScore)
    .map((result) => result.item);
}
