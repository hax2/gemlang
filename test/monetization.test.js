import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_MODULE_IDS,
  hasPaidAccess,
  isModuleFree,
  PRICING_PLANS,
} from '../src/config/monetization.js';

test('the free tier contains the promised starter course', () => {
  assert.equal(FREE_MODULE_IDS.size, 4);
  assert.equal(isModuleFree('module-1'), true);
  assert.equal(isModuleFree('review-1-2-3'), true);
  assert.equal(isModuleFree('module-4'), false);
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
