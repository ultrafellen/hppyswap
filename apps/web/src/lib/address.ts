// SPDX-License-Identifier: MIT
/**
 * Truncates a hex address to a compact "0x12…ab34" form for display.
 * Strings too short to usefully truncate (e.g. already-short test fixtures)
 * are returned unchanged.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
