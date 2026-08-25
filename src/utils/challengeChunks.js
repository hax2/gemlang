const STRIPPED_PUNCTUATION = /[.,;:¿?¡!…—–"“”()]/g;

const cleanToken = (value) => String(value || '')
  .replace(STRIPPED_PUNCTUATION, '')
  .toLocaleLowerCase();

const splitWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean);

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
 * Return bilingual pieces for the Puente-style challenge card.
 *
 * Imported Puente sentences carry authored phrase pairs. Existing Gemlang
 * sentences fall back to their wordMeanings map, including multi-word keys.
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

  const spanishWords = splitWords(sentence.spanish);
  const meanings = sentence.wordMeanings || {};
  const meaningEntries = Object.entries(meanings)
    .map(([spanish, english]) => ({
      spanish,
      english: String(english || '').trim(),
      normalizedWords: splitWords(spanish).map(cleanToken),
    }))
    .filter((entry) => entry.english && entry.normalizedWords.length > 0)
    .sort((a, b) => b.normalizedWords.length - a.normalizedWords.length);

  if (meaningEntries.length > 0 && spanishWords.length > 0) {
    const chunks = [];
    let wordIndex = 0;

    while (wordIndex < spanishWords.length) {
      const match = meaningEntries.find((entry) => entry.normalizedWords.every(
        (word, offset) => cleanToken(spanishWords[wordIndex + offset]) === word
      ));

      if (match) {
        chunks.push({
          spanish: spanishWords.slice(wordIndex, wordIndex + match.normalizedWords.length).join(' '),
          english: match.english,
        });
        wordIndex += match.normalizedWords.length;
      } else {
        chunks.push({
          spanish: spanishWords[wordIndex],
          english: 'Tap to reveal',
        });
        wordIndex += 1;
      }
    }

    return chunks;
  }

  const englishWords = splitWords(sentence.english);
  if (spanishWords.length === 0 || englishWords.length === 0) return [];

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

