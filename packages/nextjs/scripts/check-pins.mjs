#!/usr/bin/env node
// FND-01 guard: assert @zama-fhe/sdk and @zama-fhe/react-sdk are pinned to EXACT 3.0.0
// (no caret/tilde/range). Runnable in CI and on Vercel before build so an unpinned
// SDK can never auto-update into a judged deploy. Exits non-zero on any violation.
//
// NOTE (01-01 deviation, human-approved): the exact version is 3.0.0, NOT the 3.2.0
// originally named in FND-01. The official fhevm-react-template locks 3.0.0 and its
// preserved provider targets the 3.0.0 API; 3.2.0 introduced breaking changes
// (SepoliaConfig / RelayerWeb location / hardhatCleartextConfig / ZERO_HANDLE) that are
// incompatible with the verbatim-preserved provider (FND-03). Exact-pin intent is kept.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");

const REQUIRED = {
  "@zama-fhe/sdk": "3.0.0",
  "@zama-fhe/react-sdk": "3.0.0",
};

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const deps = pkg.dependencies || {};

const violations = [];
for (const [name, expected] of Object.entries(REQUIRED)) {
  const actual = deps[name];
  if (actual !== expected) {
    violations.push(
      `  ${name}: expected exact "${expected}", found ${actual === undefined ? "MISSING" : `"${actual}"`}`,
    );
  }
}

if (violations.length > 0) {
  console.error("FND-01 exact-pin check FAILED:");
  console.error(violations.join("\n"));
  console.error("\nZama SDK deps must be pinned to an exact version (no ^ or ~).");
  process.exit(1);
}

console.log("FND-01 exact-pin check passed: @zama-fhe/sdk and @zama-fhe/react-sdk both pinned to 3.0.0.");
