import test from 'node:test';
import assert from 'node:assert/strict';

import { buildChallengeChunks } from '../src/utils/challengeChunks.js';

test('uses authored Puente phrase pairs without changing their order', () => {
  const chunks = buildChallengeChunks({
    spanish: 'Si tuviera más tiempo, aprendería a tocar la guitarra.',
    english: 'If I had more time, I would learn to play the guitar.',
    translationChunks: [
      { spanish: 'Si tuviera', english: 'If I had' },
      { spanish: 'más tiempo,', english: 'more time,' },
      { spanish: 'aprendería', english: 'I would learn' },
      { spanish: 'a tocar', english: 'to play' },
      { spanish: 'la guitarra.', english: 'the guitar.' },
    ],
  });

  assert.deepEqual(chunks.map((chunk) => chunk.spanish), [
    'Si tuviera',
    'más tiempo,',
    'aprendería',
    'a tocar',
    'la guitarra.',
  ]);
});

test('matches multi-word Gemlang meanings before single words', () => {
  const chunks = buildChallengeChunks({
    spanish: 'Me gusta caminar los fines de semana.',
    english: 'I like walking on weekends.',
    wordMeanings: {
      Me: 'to me',
      gusta: 'is pleasing',
      caminar: 'to walk',
      'fines de semana': 'weekends',
    },
  });

  assert.equal(chunks.at(-1).spanish, 'fines de semana.');
  assert.equal(chunks.at(-1).english, 'weekends');
});

test('builds independently revealable balanced chunks without vocabulary metadata', () => {
  const chunks = buildChallengeChunks({
    spanish: 'Ella es la persona correcta.',
    english: 'She is the correct person.',
  });

  assert.ok(chunks.length > 1);
  assert.equal(chunks.map((chunk) => chunk.spanish).join(' '), 'Ella es la persona correcta.');
  assert.equal(chunks.map((chunk) => chunk.english).join(' '), 'She is the correct person.');
});

