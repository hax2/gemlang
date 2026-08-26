import test from 'node:test';
import assert from 'node:assert/strict';

import { withPracticeCounts } from '../src/utils/moduleCounts.js';

test('ordinary modules include Puente additions in guided and testing totals', () => {
  const module = withPracticeCounts({
    id: 'module-2',
    sentenceCount: 47,
  }, 1);

  assert.equal(module.guidedSentenceCount, 48);
  assert.equal(module.testingSentenceCount, 48);
});

test('special rule lessons keep their guided item total and count testing translations separately', () => {
  const module = withPracticeCounts({
    id: 'module-ser-vs-estar',
    sentenceCount: 60,
  }, 2);

  assert.equal(module.guidedSentenceCount, 60);
  assert.equal(module.testingSentenceCount, 22);
});
