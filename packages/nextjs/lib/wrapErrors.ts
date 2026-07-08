import { toAppError } from "./appError";

/**
 * Wrap error taxonomy (WRP-01 messaging).
 *
 * Delegates to the unified `toAppError` classifier (CONTEXT Decision A) under
 * the `"wrap"` flow, returning just the body line the wrap panel renders. The
 * copy is identical to the pre-consolidation map — classification remains by
 * `instanceof` against the typed `@zama-fhe/react-sdk` subclasses inside
 * `toAppError`, never string-matching raw revert text.
 */
export function toWrapError(e: unknown): string {
  return toAppError(e, { flow: "wrap" }).body;
}
