"use client";

import React, { useRef } from "react";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar min-h-0 shrink-0 justify-between z-20 px-3 sm:px-5 lg:px-8">
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
