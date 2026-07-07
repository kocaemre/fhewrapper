/**
 * Decorative side-gutter engraving motifs (02 visual polish).
 *
 * A SYMMETRIC flanking pair of copperplate grapevine strips that fill the empty
 * parchment gutters left/right of the centered 1180px content. Both gutters draw
 * ONE source tile (`/motifs/vine-tile.webp`) so they are exact MIRROR images: the
 * left uses the tile as-is (ornate detail on its right edge → faces content) and
 * the right mirrors it with `transform: scaleX(-1)` (detail → inner edge). Purely
 * DECORATIVE — `aria-hidden`, `pointer-events:none`, positioned BEHIND the
 * content (`z-index:0`, see `.side-motif` in globals.css).
 *
 * They SCROLL WITH THE PAGE and span the FULL document height: each strip is
 * `position:absolute; top:0; bottom:0` inside the page's `position:relative`
 * root (see app/page.tsx), so it flanks the content top-to-bottom no matter how
 * tall the card grid grows. The tile is authored with no top/bottom end-cap and
 * tiles seamlessly via `repeat-y` at a fixed `background-size: auto 480px`; a
 * seam-feather mask keyed to that 480px period softens the tile boundary into an
 * "infinite wallpaper" with no visible gaps or hard repeat line.
 *
 * Assets are self-hosted WebP under `/public/motifs/` (same-origin — COEP
 * `require-corp`, no cross-origin media). Rendered as background-image `<div>`s
 * (not `<img>`) so `repeat-y` + `background-size` control the vertical tiling.
 * They are hidden below 1280px so they never crowd the content or introduce
 * horizontal scroll; a top/bottom + outer-edge + seam-feather mask fades the
 * tile seams and the page edges into the parchment ground.
 */
export function SideMotifs() {
  return (
    <>
      <div aria-hidden="true" className="side-motif side-motif--left" />
      <div aria-hidden="true" className="side-motif side-motif--right" />
    </>
  );
}
