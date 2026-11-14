export interface FuzzyMatchResult {
  matches: boolean;
  score: number;
}

const WORD_BOUNDARY = /[\s\-_./:]/;

const LETTERS_THEN_DIGITS = /^(?<letters>[a-z]+)(?<digits>[0-9]+)$/;
const DIGITS_THEN_LETTERS = /^(?<digits>[0-9]+)(?<letters>[a-z]+)$/;

/** What one find is worth, in the order the finds are asked about. */
const RUN_BONUS = 5;
const GAP_COST = 2;
const WORD_START_BONUS = 10;
const OFFSET_COST = 0.1;
const EXACT_MATCH_BONUS = 100;

/**
 * Where a query's characters land in the text, or nothing at all.
 *
 * Each character takes the earliest find after the one before it, so the find is
 * the subsequence the query reads as, and a character with nowhere to stand means
 * the text does not hold the query.
 */
function findPositions(text: string, query: string): number[] | null {
  const positions: number[] = [];
  for (const char of query) {
    const at = text.indexOf(char, (positions.at(-1) ?? -1) + 1);
    if (at === -1) return null;
    positions.push(at);
  }
  return positions;
}

/** Whether a character opens a word: the text's first, or one after a divider. */
const opensWord = (text: string, at: number): boolean =>
  at === 0 || WORD_BOUNDARY.test(text[at - 1] ?? "");

/**
 * What one run of finds costs, the lower the better.
 *
 * A run of consecutive characters is worth more with every character it takes, a
 * gap costs what it skips, a character standing at the start of a word costs ten,
 * and a find further into the text costs a little more.
 */
function scorePositions(text: string, positions: readonly number[]): number {
  let score = 0;
  let run = 0;
  positions.forEach((at, order) => {
    const before = positions[order - 1] ?? -1;
    if (at === before + 1) {
      run += 1;
      score -= run * RUN_BONUS;
    } else {
      run = 0;
      if (before >= 0) score += (at - before - 1) * GAP_COST;
    }
    if (opensWord(text, at)) score -= WORD_START_BONUS;
    score += at * OFFSET_COST;
  });
  return score;
}

/**
 * One query scored against the text as the subsequence it finds.
 *
 * A query that is the whole text costs a hundred more, so an exact name wins.
 */
function scoreQuery(text: string, query: string): FuzzyMatchResult {
  if (query.length === 0) return { matches: true, score: 0 };
  if (query.length > text.length) return { matches: false, score: 0 };

  const positions = findPositions(text, query);
  if (positions === null) return { matches: false, score: 0 };

  const exact = query === text ? -EXACT_MATCH_BONUS : 0;
  return { matches: true, score: scorePositions(text, positions) + exact };
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
