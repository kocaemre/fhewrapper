"use client";

import { ExplorerTxLink } from "./ExplorerTxLink";
import toast from "react-hot-toast";

/**
 * Cellar-themed toast helpers over the already-installed `react-hot-toast`
 * (UX-02, CONTEXT Decision B). The `<Toaster/>` is already mounted once in
 * `DappWrapperWithProviders` — these helpers only enqueue toasts, they NEVER
 * mount a second `<Toaster/>`.
 *
 * A write flow calls `notifyPending` on submit to get a toast id, then REPLACES
 * that same toast in place by passing the id back into `notifySuccess` /
 * `notifyError` (react-hot-toast's `{ id }` option) — pending never stacks under
 * its terminal result. `notifySuccess` embeds a working Sepolia explorer link
 * when a tx `hash` is present.
 *
 * SECURITY (T-06-02, T-02-01 carried): every title/desc/token-symbol value is
 * passed as React children only — react-hot-toast escapes JSX. There is NO
 * `dangerouslySetInnerHTML` anywhere in this module.
 */

const MONO = "var(--font-jetbrains-mono), monospace";

type Variant = "pending" | "success" | "error";

const BORDER: Record<Variant, string> = {
  pending: "var(--line)",
  success: "var(--green)",
  error: "var(--red)",
};

function ToastBody({ variant, title, desc, hash }: { variant: Variant; title: string; desc?: string; hash?: string }) {
  return (
    <div style={{ fontFamily: MONO, lineHeight: 1.45, minWidth: 0 }}>
      <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>{title}</strong>
      {desc ? <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{desc}</div> : null}
      {variant === "success" && hash ? <ExplorerTxLink hash={hash} /> : null}
    </div>
  );
}

function toastStyle(variant: Variant) {
  return {
    border: `2px solid ${BORDER[variant]}`,
    background: "var(--panel)",
    color: "var(--ink)",
    padding: "12px 16px",
    maxWidth: 360,
  } as const;
}

/** Enqueue a persistent pending toast; returns the id to reuse on terminal. */
export function notifyPending(title: string, desc?: string): string {
  return toast.loading(<ToastBody variant="pending" title={title} desc={desc} />, {
    style: toastStyle("pending"),
  });
}

/** Replace (or open) a success toast, embedding the explorer link when a hash is present. */
export function notifySuccess({
  title,
  desc,
  hash,
  id,
}: {
  title: string;
  desc?: string;
  hash?: string;
  id?: string;
}): string {
  return toast.success(<ToastBody variant="success" title={title} desc={desc} hash={hash} />, {
    id,
    style: toastStyle("success"),
    duration: 6000,
  });
}

/** Replace (or open) an error toast with the typed, human-readable body. */
export function notifyError({ title, desc, id }: { title: string; desc?: string; id?: string }): string {
  return toast.error(<ToastBody variant="error" title={title} desc={desc} />, {
    id,
    style: toastStyle("error"),
    duration: 6000,
  });
}
