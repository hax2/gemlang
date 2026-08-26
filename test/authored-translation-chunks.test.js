import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.join(testDir, '..', 'src', 'data', 'modules');

const wordCount = (value) => value.trim().split(/\s+/).filter(Boolean).length;

const assertValidChunks = (prompt, label) => {
  const chunks = prompt.translationChunks;
  if (!Array.isArray(chunks) || chunks.length === 0) return false;

  const minimumChunks = Math.min(
    wordCount(prompt.spanish),
    wordCount(prompt.english)
  ) >= 3 ? 2 : 1;

  assert.ok(chunks.length >= minimumChunks, `${label} is under-split`);
  assert.ok(chunks.length <= 7, `${label} has too many chunks`);
  assert.ok(
    chunks.every((chunk) => chunk.spanish?.length > 0 && chunk.english?.length > 0),
    `${label} contains an empty chunk side`
  );
  assert.equal(
    chunks.map((chunk) => chunk.spanish).join(' '),
    prompt.spanish,
    `${label} does not reconstruct its Spanish sentence`
  );
  assert.equal(
    chunks.map((chunk) => chunk.english).join(' '),
    prompt.english,
    `${label} does not reconstruct its English sentence`
  );
  return true;
};

test('authored curriculum chunks remain exact and independently revealable', () => {
  let authoredCount = 0;

  for (const file of fs.readdirSync(modulesDir).filter((name) => name.endsWith('.json'))) {
    const module = JSON.parse(fs.readFileSync(path.join(modulesDir, file), 'utf8'));

    for (const sentence of module.sentences || []) {
      if (assertValidChunks(sentence, `${module.id}/${sentence.id}`)) authoredCount += 1;
    }

    for (const rule of module.rules || []) {
      for (const [index, translation] of (rule.translations || []).entries()) {
        if (assertValidChunks(
          translation,
          `${module.id}/${rule.id}/translation-${index + 1}`
        )) authoredCount += 1;
      }
    }
  }

  assert.ok(authoredCount >= 909, `expected at least 909 authored prompts, found ${authoredCount}`);
});
