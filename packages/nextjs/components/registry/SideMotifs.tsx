/**
 * Decorative side-gutter engraving motifs (02 visual polish).
 *
 * A matched flanking pair of copperplate vine-and-bottle strips that fill the
 * empty parchment gutters left/right of the centered 1180px content. Purely
 * DECORATIVE — `aria-hidden`, `pointer-events:none`, fixed BEHIND the content
 * (`z-index:0`, see `.side-motif` in globals.css). They are hidden below 1280px
 * so they never crowd the cards/hero/toolbar or introduce horizontal scroll.
 *
 * Assets are self-hosted WebP under `/public/motifs/` (same-origin — COEP
 * `require-corp`, no cross-origin media). `side-left.png`'s ornament is weighted
 * to its inner (right) edge and `side-right.png`'s to its inner (left) edge;
 * `object-position` pins that ornamented edge toward the content so the vines
 * frame the page, while the plain cream fades outward into the parchment ground.
 */
export function SideMotifs() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/motifs/side-left.webp" alt="" aria-hidden="true" className="side-motif side-motif--left" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/motifs/side-right.webp" alt="" aria-hidden="true" className="side-motif side-motif--right" />
    </>
  );
}
