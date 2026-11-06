import assert from 'node:assert/strict';
import test from 'node:test';

const {
  GUEST_TRANSFER_AUTOMATIC,
  GUEST_TRANSFER_CONFIRM,
  GUEST_TRANSFER_NONE,
  getGuestTransferMode,
} = await import('../js/storage/workspacePolicy.js');

test('requires no transfer when guest has no meaningful data', () => {
  assert.equal(getGuestTransferMode({
    hasGuestData: false,
    hasAccountData: true,
  }), GUEST_TRANSFER_NONE);
});

test('automatically transfers guest data into an empty account', () => {
  assert.equal(getGuestTransferMode({
    hasGuestData: true,
    hasAccountData: false,
  }), GUEST_TRANSFER_AUTOMATIC);
});

test('requires consent when both guest and account have data', () => {
  assert.equal(getGuestTransferMode({
    hasGuestData: true,
    hasAccountData: true,
  }), GUEST_TRANSFER_CONFIRM);
});

test('requires consent before transferring legacy unowned data to an empty account', () => {
  assert.equal(getGuestTransferMode({
    hasGuestData: true,
    hasAccountData: false,
    isLegacyGuest: true,
  }), GUEST_TRANSFER_CONFIRM);
});
