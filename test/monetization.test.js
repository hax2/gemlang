import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_ACCESS_MODE,
  FREE_MODULE_IDS,
  hasPaidAccess,
  isModuleFree,
  PRICING_PLANS,
} from '../src/config/monetization.js';

test('the free tier contains the promised starter course', () => {
  assert.equal(FREE_MODULE_IDS.size, 4);
  assert.equal(FREE_MODULE_IDS.has('module-1'), true);
  assert.equal(FREE_MODULE_IDS.has('review-1-2-3'), true);
});

test('free access mode unlocks every module while payments are offline', () => {
  assert.equal(FREE_ACCESS_MODE, true);
  assert.equal(isModuleFree('module-1'), true);
  assert.equal(isModuleFree('module-4'), true);
  assert.equal(isModuleFree('module-43'), true);
});

test('all Lemon Squeezy subscription states retain access except expired', () => {
  for (const status of ['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled']) {
    assert.equal(hasPaidAccess({ status }), true, `${status} should retain access`);
  }
  assert.equal(hasPaidAccess({ status: 'expired' }), false);
  assert.equal(hasPaidAccess({ status: 'unknown' }), false);
  assert.equal(hasPaidAccess(null), false);
});

test('monthly and yearly prices match the offer', () => {
  assert.equal(PRICING_PLANS.monthly.price, '€8.99');
  assert.equal(PRICING_PLANS.yearly.price, '€59.99');
});
