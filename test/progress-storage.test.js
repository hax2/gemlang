import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, normalizeProgress, parseProgressBackup, mergeProgress } from '../src/utils/progressStorage.js';
import { getResumeIndex } from '../src/utils/lessonProgress.js';

test('corrupt stored progress cannot crash the dashboard or inflate its counts', () => {
  for (const value of [null, [], 7, 'bad', { modules: null }]) {
    assert.deepEqual(normalizeProgress(value), emptyProgress());
  }
  const progress = normalizeProgress({ modules: { 'module-1': { currentIndex: -2, totalSentences: '5' }, 'module-2': null } });
  assert.equal(progress.modules['module-1'].currentIndex, 0);
  assert.equal(progress.modules['module-1'].totalSentences, 0);
  assert.equal(progress.modules['module-2'], undefined);
});

test('restoring a backup preserves completed and further existing work', () => {
  const current = { hasChosenLevel: true, modules: {
    'module-1': { currentIndex: 10, totalSentences: 10, completedAt: '2026-09-01T00:00:00Z', confidence: 'confident' },
    'module-2': { currentIndex: 8, totalSentences: 10 },
  } };
  const incoming = { modules: {
    'module-1': { currentIndex: 3, totalSentences: 10 },
    'module-2': { currentIndex: 2, totalSentences: 10 },
    'module-3': { currentIndex: 4, totalSentences: 10 },
  } };
  const result = mergeProgress(current, incoming);
  assert.equal(result.modules['module-1'].confidence, 'confident');
  assert.equal(result.modules['module-2'].currentIndex, 8);
  assert.equal(result.modules['module-3'].currentIndex, 4);
  assert.equal(current.modules['module-3'], undefined);
});

test('backup format is versioned and rejects unrelated files', () => {
  for (const value of [null, {}, { app: 'other', version: 1 }, { app: 'gemlang', version: 2, progress: { modules: {} } }]) {
    assert.throws(() => parseProgressBackup(JSON.stringify(value)));
  }
  const result = parseProgressBackup(JSON.stringify({ app: 'gemlang', version: 1, progress: { modules: {}, hasChosenLevel: true, startingModuleId: 'module-20' } }));
  assert.equal(result.startingModuleId, 'module-20');
  assert.deepEqual(result.modules, {});
});

test('grammar practice resumes across choice and translation items', () => {
  const items = [{ type: 'intro' }, { type: 'ser-estar-choice' }, { type: 'ser-estar-translation' }];
  assert.equal(getResumeIndex(items, 1, true), 2);
  assert.equal(getResumeIndex(items, 2, true), 3);
});

test('guided resume preserves an intervening challenge and reaches assessment at the end', () => {
  const items = [{ type: 'sentence' }, { type: 'challenge' }, { type: 'sentence' }];
  assert.equal(getResumeIndex(items, 1), 1);
  assert.equal(getResumeIndex(items, 2), 3);
  assert.equal(getResumeIndex(items, 0), 0);
});
