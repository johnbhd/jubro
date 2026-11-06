export const GUEST_TRANSFER_NONE = 'none';
export const GUEST_TRANSFER_AUTOMATIC = 'automatic';
export const GUEST_TRANSFER_CONFIRM = 'confirm';

export function getGuestTransferMode({ hasGuestData, hasAccountData, isLegacyGuest = false }) {
  if (!hasGuestData) return GUEST_TRANSFER_NONE;
  if (isLegacyGuest) return GUEST_TRANSFER_CONFIRM;
  if (!hasAccountData) return GUEST_TRANSFER_AUTOMATIC;

  return GUEST_TRANSFER_CONFIRM;
}
