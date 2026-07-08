import { toAppError } from "./appError";

/**
 * Unwrap error taxonomy (UNW-01 messaging).
 *
 * Delegates to the unified `toAppError` classifier (CONTEXT Decision A) under
 * the `"unwrap"` flow, returning just the body line the unwrap panel renders.
 * The copy is identical to the pre-consolidation map — classification remains
 * by `instanceof` against the typed `@zama-fhe/react-sdk` subclasses inside
 * `toAppError`, never string-matching raw revert text.
 */
export function toUnwrapError(e: unknown): string {
  return toAppError(e, { flow: "unwrap" }).body;
}
