/**
 * Wrap preview math (WRP-02) — PURE `bigint`, no chain/imports (04-RESEARCH Pattern 3).
 *
 * An `ERC7984ERC20Wrapper` mints `floor(underlyingRaw / rate)` confidential base
 * units and pulls `confRaw * rate` underlying; the remainder is refunded. The
 * conversion `rate = 10^(underlyingDecimals − wrapperDecimals)` MUST be read
 * onchain per pair (wrappers are 6-dp) — never hardcode 18 (Pitfall 1). When the
 * entered amount is below one confidential base unit, `belowOneUnit` is true and
 * the UI disables Wrap (Pitfall 2).
 */
export interface WrapPreview {
  /** Confidential base units minted = floor(underlyingRaw / rate). */
  confRaw: bigint;
  /** Underlying base units actually consumed = confRaw * rate. */
  consumedRaw: bigint;
  /** Underlying base units returned = underlyingRaw − consumedRaw. */
  refundRaw: bigint;
  /** True when the entered amount mints zero confidential units (warn + disable). */
  belowOneUnit: boolean;
}

/**
 * @param underlyingRaw ERC-20 amount in underlying base units (`parseUnits(whole, underlyingDecimals)`).
 * @param rate `10^(underlyingDecimals − wrapperDecimals)`, read from the wrapper's `rate()` onchain.
 * @param wrapperDecimals the confidential token's own decimals (for display; not used in the math).
 */
export function previewWrap(
  underlyingRaw: bigint,
  rate: bigint,
  // Part of the WRP-02 signature for callers/display; the math is decimals-agnostic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  wrapperDecimals: number,
): WrapPreview {
  const confRaw = underlyingRaw / rate; // floor division (bigint)
  const consumedRaw = confRaw * rate; // underlying actually consumed
  const refundRaw = underlyingRaw - consumedRaw; // remainder returned
  const belowOneUnit = confRaw === 0n; // entered amount < one confidential base unit
  return { confRaw, consumedRaw, refundRaw, belowOneUnit };
}
