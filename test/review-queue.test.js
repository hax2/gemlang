import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReviewCards, scheduleReview } from '../src/utils/reviewQueue.js';
import { isProgressItem } from '../src/utils/lessonProgress.js';
const base = Array.from({length: 8}, (_, id) => ({ type: 'sentence', data: {id} }));
test('see again soon repeats after three intervening cards without inflating progress', () => {
  const reviews = scheduleReview(base, [], 0);
  const cards = mergeReviewCards(base, reviews);
  assert.deepEqual(cards.slice(0, 6).map(c => c.data.id), [0, 1, 2, 3, 0, 4]);
  assert.equal(cards.filter(c => isProgressItem(c)).length, base.length);
  assert.equal(scheduleReview(cards, reviews, 0), reviews);
});
test('review at the end and repeated review requests remain reachable', () => {
  let reviews = scheduleReview(base, [], 7);
  let cards = mergeReviewCards(base, reviews);
  assert.equal(cards[8].data.id, 7);
  reviews = scheduleReview(cards, reviews, 8);
  cards = mergeReviewCards(base, reviews);
  assert.equal(cards[9].data.id, 7);
});
test('checkpoints count as intervening cards and multiple queued sentences keep their order', () => {
  const course = [base[0], {type: 'challenge', data: {id: 'checkpoint'}}, ...base.slice(1)];
  let reviews = scheduleReview(course, [], 0);
  let cards = mergeReviewCards(course, reviews);
  reviews = scheduleReview(cards, reviews, 2);
  cards = mergeReviewCards(course, reviews);
  assert.equal(cards[4].data.id, 0);
  assert.equal(cards[6].data.id, 1);
  assert.equal(cards[1].type, 'challenge');
});
