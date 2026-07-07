import { Gelasio, JetBrains_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import { DappWrapperWithProviders } from "~~/components/DappWrapperWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/helper/getMetadata";

export const metadata = getMetadata({
  title: "The Cellar Registry",
  description: "Confidential ERC-20 ⇄ ERC-7984 wrapper registry on Sepolia · Zama FHEVM",
});

// Self-hosted at build time (next/font) → same-origin → safe under COEP `require-corp`
// (a cross-origin Google Fonts <link> would be blocked). Gelasio (serif body/headings)
// + JetBrains Mono (labels/addresses/numbers) per 02-UI-SPEC.
const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-gelasio",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const DappWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${gelasio.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning>
        {/* next-themes writes `data-theme` on <html>. The theme KEYS stay `light`/`dark`
            (so DappWrapperWithProviders' `resolvedTheme === "dark"` RainbowKit theming is
            untouched), while `value` maps the applied attribute to the engraving themes:
            parchment (light, default) + cellar (dark). All engraving CSS vars resolve from
            `[data-theme]` in globals.css. */}
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          value={{ light: "parchment", dark: "cellar" }}
          enableSystem
        >
          <DappWrapperWithProviders>{children}</DappWrapperWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default DappWrapper;
