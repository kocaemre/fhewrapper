/**
 * Decorative side-gutter engraving motifs (02 visual polish).
 *
 * A matched flanking pair of copperplate vine-and-bottle strips that fill the
 * empty parchment gutters left/right of the centered 1180px content. Purely
 * DECORATIVE — `aria-hidden`, `pointer-events:none`, positioned BEHIND the
 * content (`z-index:0`, see `.side-motif` in globals.css).
 *
 * They SCROLL WITH THE PAGE and span the FULL document height: each strip is
 * `position:absolute; top:0; bottom:0` inside the page's `position:relative`
 * root (see app/page.tsx), so it flanks the content top-to-bottom no matter how
 * tall the card grid grows. The vine ornament is a `repeat-y` background so it
 * tiles continuously down the whole page instead of stretching one image.
 *
 * Assets are self-hosted WebP under `/public/motifs/` (same-origin — COEP
 * `require-corp`, no cross-origin media). Rendered as background-image `<div>`s
 * (not `<img>`) so `repeat-y` + `background-size` control the vertical tiling.
 * They are hidden below 1280px so they never crowd the content or introduce
 * horizontal scroll; a top/bottom + outer-edge mask fades hard tile seams and
 * the page edges into the parchment ground.
 */
export function SideMotifs() {
  return (
    <>
      <div aria-hidden="true" className="side-motif side-motif--left" />
      <div aria-hidden="true" className="side-motif side-motif--right" />
    </>
  );
}
