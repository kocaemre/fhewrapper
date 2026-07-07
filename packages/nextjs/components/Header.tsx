"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

const SERIF = "var(--font-gelasio), Georgia, serif";

/** Cellar-idiom nav links (engraving typeface, active route → --red underline). */
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Registry" },
  { href: "/decrypt", label: "Decrypt" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        fontFamily: SERIF,
        fontSize: 16,
        fontWeight: active ? 700 : 500,
        color: active ? "var(--ink)" : "var(--muted)",
        textDecoration: "none",
        paddingBottom: 2,
        borderBottom: `2px solid ${active ? "var(--red)" : "transparent"}`,
        transition: "color 0.12s, border-color 0.12s",
      }}
    >
      {label}
    </Link>
  );
}

/**
 * Site header.
 *
 * Left (navbar-start): cellar-idiom nav — a Registry (home) link and the
 * Decrypt link to /decrypt (03-03), the active route underlined in --red via
 * usePathname. Right (navbar-end): the existing right-aligned RainbowKit
 * connect cluster, untouched, so the connect button / address pill stay pinned
 * to the right with their responsive gutter.
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const pathname = usePathname();

  return (
    <div className="sticky lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-3 sm:px-5 lg:px-8">
      {/* Left-aligned nav cluster (navbar-start): keeps the connect button right. */}
      <div className="navbar-start w-auto flex items-center gap-4 sm:gap-6 pl-1 sm:pl-2">
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)}
          />
        ))}
      </div>

      {/* Right-aligned wallet cluster: keep it off the viewport's right edge with a
          responsive gutter (~24px mobile → ~40px desktop) so the connect button /
          address pill / balance block breathes. Padding on the navbar (not a wide
          margin) keeps it inside the layout and avoids horizontal scroll. */}
      <div className="navbar-end grow pr-1 sm:pr-3 lg:pr-4">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
