const STRIPPED_PUNCTUATION = /[.,;:¿?¡!…—–"“”()]/g;

const cleanToken = (value) => String(value || '')
  .replace(STRIPPED_PUNCTUATION, '')
  .toLocaleLowerCase();

const splitWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean);

const normalizedTokens = (value) => splitWords(
  String(value || '').replace(/\([^)]*\)/g, ' ')
).map(cleanToken);

const balancedSlices = (words, count) => {
  const slices = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((index * words.length) / count);
    const end = Math.floor(((index + 1) * words.length) / count);
    slices.push(words.slice(start, end).join(' '));
  }
  return slices;
};

/**
 * Walk the Spanish sentence against its wordMeanings map. Words covered by a
 * meaning (including multi-word keys) become matched chunks; each run of
 * uncovered words becomes a single gap chunk to be aligned afterwards.
 */
const buildRawChunks = (sentence) => {
  const spanishWords = splitWords(sentence.spanish);
  const meanings = sentence.wordMeanings || {};
  const meaningEntries = Object.entries(meanings)
    .map(([spanish, english]) => ({
      english: String(english || '').trim(),
      normalizedWords: normalizedTokens(spanish),
    }))
    .filter((entry) => entry.english && entry.normalizedWords.length > 0)
    .sort((a, b) => b.normalizedWords.length - a.normalizedWords.length);

  if (spanishWords.length === 0 || meaningEntries.length === 0) return null;

  const rawChunks = [];
  let wordIndex = 0;
  let gapStart = null;

  const flushGap = (end) => {
    if (gapStart === null) return;
    rawChunks.push({ isGap: true, spanish: spanishWords.slice(gapStart, end).join(' ') });
    gapStart = null;
  };

  while (wordIndex < spanishWords.length) {
    const match = meaningEntries.find((entry) => entry.normalizedWords.every(
      (word, offset) => cleanToken(spanishWords[wordIndex + offset]) === word
    ));

    if (match) {
      flushGap(wordIndex);
      rawChunks.push({
        isGap: false,
        spanish: spanishWords.slice(wordIndex, wordIndex + match.normalizedWords.length).join(' '),
        english: match.english,
      });
      wordIndex += match.normalizedWords.length;
    } else {
      if (gapStart === null) gapStart = wordIndex;
      wordIndex += 1;
    }
  }

  flushGap(spanishWords.length);
  return rawChunks;
};

/**
 * Give every gap chunk real English words. Matched chunks act as anchors:
 * their English is located inside the sentence (left to right), and each gap
 * inherits the unconsumed English words between its neighbouring anchors.
 * Without locatable anchors the split falls back to proportional positions.
 */
const fillGapChunks = (rawChunks, english) => {
  const englishWords = splitWords(String(english || '').replace(/\([^)]*\)/g, ' '));
  const tokens = englishWords.map(cleanToken);
  const used = englishWords.map(() => false);

  let wordCursor = 0;
  const spans = rawChunks.map((chunk) => {
    const start = wordCursor;
    wordCursor += splitWords(chunk.spanish).length;
    return { start, end: wordCursor };
  });
  const totalSpanish = Math.max(1, wordCursor);

  const bounds = rawChunks.map((chunk) => {
    if (chunk.isGap) return null;
    const needles = normalizedTokens(chunk.english);
    if (needles.length === 0) return null;
    for (let i = 0; i + needles.length <= tokens.length; i += 1) {
      if (needles.some((_, offset) => used[i + offset])) continue;
      if (needles.every((word, offset) => tokens[i + offset] === word)) {
        for (let offset = 0; offset < needles.length; offset += 1) used[i + offset] = true;
        return { start: i, end: i + needles.length };
      }
    }
    return null;
  });

  const filled = rawChunks.map((chunk, index) => {
    if (!chunk.isGap) return { spanish: chunk.spanish, english: chunk.english };

    let windowStart = 0;
    for (let k = index - 1; k >= 0; k -= 1) {
      if (bounds[k]) {
        windowStart = bounds[k].end;
        break;
      }
    }
    let windowEnd = englishWords.length;
    for (let k = index + 1; k < rawChunks.length; k += 1) {
      if (bounds[k]) {
        windowEnd = bounds[k].start;
        break;
      }
    }

    const available = [];
    for (let i = windowStart; i < windowEnd; i += 1) {
      if (!used[i]) available.push(i);
    }

    const spanishLen = spans[index].end - spans[index].start;
    const wanted = Math.max(1, Math.round((spanishLen * englishWords.length) / totalSpanish));
    const offset = Math.min(
      Math.max(0, available.length - wanted),
      Math.round((spans[index].start / totalSpanish) * available.length)
    );
    const picked = available.slice(offset, offset + wanted);
    picked.forEach((i) => { used[i] = true; });

    return {
      spanish: chunk.spanish,
      english: picked.map((i) => englishWords[i]).join(' '),
    };
  });

  const result = [];
  filled.forEach((chunk, index) => {
    if (chunk.english) {
      result.push(chunk);
      return;
    }
    const next = filled[index + 1];
    if (next) {
      next.spanish = `${chunk.spanish} ${next.spanish}`.trim();
    } else if (result.length > 0) {
      const previous = result[result.length - 1];
      previous.spanish = `${previous.spanish} ${chunk.spanish}`.trim();
    } else {
      result.push(chunk);
    }
  });
  return result;
};

/**
 * Return bilingual pieces for the challenge card.
 *
 * Imported sentences carry authored phrase pairs. Existing Gemlang sentences
 * fall back to their wordMeanings map, with words missing a meaning grouped
 * into gap chunks that receive the leftover English words as their clue.
 * The final balanced fallback keeps older/special prompts independently
 * revealable even when they do not have vocabulary metadata.
 */
export const buildChallengeChunks = (sentence) => {
  if (!sentence) return [];

  if (Array.isArray(sentence.translationChunks) && sentence.translationChunks.length > 0) {
    return sentence.translationChunks
      .map((chunk) => ({
        spanish: String(chunk.spanish || '').trim(),
        english: String(chunk.english || '').trim(),
      }))
      .filter((chunk) => chunk.spanish && chunk.english);
  }

  const englishWords = splitWords(sentence.english);
  if (englishWords.length === 0) return [];

  const rawChunks = buildRawChunks(sentence);
  if (!rawChunks) return balancedFallback(sentence, englishWords);

  return fillGapChunks(rawChunks, sentence.english);
};

const balancedFallback = (sentence, englishWords) => {
  const spanishWords = splitWords(sentence.spanish);
  if (spanishWords.length === 0) return [];

  const chunkCount = Math.max(1, Math.min(
    4,
    spanishWords.length,
    englishWords.length,
    Math.ceil(Math.max(spanishWords.length, englishWords.length) / 2)
  ));
  const spanishSlices = balancedSlices(spanishWords, chunkCount);
  const englishSlices = balancedSlices(englishWords, chunkCount);

  return spanishSlices.map((spanish, index) => ({
    spanish,
    english: englishSlices[index],
  }));
};
