import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const allowlistPath = join(root, "PUBLIC-SOURCE-ALLOWLIST.txt");
const allowlistText = await readFile(allowlistPath, "utf8");
const allowlist = allowlistText
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const failures = [];
const seen = new Set();
let projectLicense;
const textSuffixes = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".ts", ".txt", ".webmanifest", ".yml"]);
const allowedSuffixes = new Set([...textSuffixes, ".jpg", ".png", ".sog"]);
const bundledGaussianPath = "public/assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog";
const bundledGaussianBytes = 67_111_473;
const bundledGaussianSha256 = "f1aaf327df2d68d4edb342da1bcf601d9ce32459eb4fdea1f6d2140da455fdef";

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
const secretPatterns = [
  ["GitHub classic token", new RegExp(["gh", "p_", "[A-Za-z0-9]{20,}"].join(""), "u")],
  ["GitHub fine-grained token", new RegExp(["github", "_pat_", "[A-Za-z0-9_]{20,}"].join(""), "u")],
  ["AWS access key", new RegExp(["AK", "IA", "[0-9A-Z]{16}"].join(""), "u")],
  ["private key block", new RegExp(["BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY"].join(""), "u")],
  ["Slack token", new RegExp(["xo", "x[baprs]-", "[A-Za-z0-9-]{16,}"].join(""), "u")],
];
const privatePathPatterns = [
  new RegExp(["/", "mnt", "/"].join(""), "iu"),
  new RegExp(["/", "home", "/"].join(""), "iu"),
  /[A-Z]:\\/u,
];

for (const relativePath of allowlist) {
  if (seen.has(relativePath)) failures.push(`duplicate allowlist entry: ${relativePath}`);
  seen.add(relativePath);
  if (relativePath.startsWith("/") || relativePath.includes("..") || relativePath.includes("\\")) {
    failures.push(`unsafe allowlist path: ${relativePath}`);
    continue;
  }

  const absolutePath = join(root, relativePath);
  let info;
  try {
    info = await lstat(absolutePath);
  } catch {
    failures.push(
      relativePath === "LICENSE"
        ? "website source LICENSE is missing; owner license decision is required before public source push"
        : `missing allowlisted file: ${relativePath}`,
    );
    continue;
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    failures.push(`allowlist entry is not a regular file: ${relativePath}`);
    continue;
  }
  if (
    !allowedSuffixes.has(extname(relativePath)) &&
    relativePath !== ".gitignore" &&
    relativePath !== "LICENSE" &&
    relativePath !== "deployment/github-pages.yml.proposed"
  ) {
    failures.push(`unsupported public-source file type: ${relativePath}`);
  }
  const isBundledGaussian = relativePath === bundledGaussianPath;
  if (info.size > 1024 * 1024 && !isBundledGaussian) {
    failures.push(`public-source file exceeds 1 MiB: ${relativePath}`);
  }
  if (isBundledGaussian) {
    if (info.size !== bundledGaussianBytes) {
      failures.push(`bundled Gaussian size mismatch: ${info.size}`);
    }
    const digest = await sha256(absolutePath);
    if (digest !== bundledGaussianSha256) {
      failures.push(`bundled Gaussian SHA-256 mismatch: ${digest}`);
    }
  }

  if (textSuffixes.has(extname(relativePath)) || relativePath === ".gitignore" || relativePath === "LICENSE") {
    const content = await readFile(absolutePath, "utf8");
    if (relativePath === "LICENSE") projectLicense = content;
    for (const [label, pattern] of secretPatterns) {
      if (pattern.test(content)) failures.push(`${label} pattern in ${relativePath}`);
    }
    for (const pattern of privatePathPatterns) {
      if (pattern.test(content)) failures.push(`private machine path pattern in ${relativePath}`);
    }
  }
}

const html = await readFile(join(root, "src/index.html"), "utf8");
for (const [label, pattern] of [
  ["remote executable script", /<script[^>]+src=["']https?:\/\//iu],
  ["remote image", /<img[^>]+src=["']https?:\/\//iu],
  ["data-collection form", /<form\b/iu],
  ["analytics integration", /(?:google-analytics|googletagmanager|segment\.com|plausible\.io)/iu],
]) {
  if (pattern.test(html)) failures.push(`${label} found in src/index.html`);
}

for (const relativePath of ["src/main.ts", "src/supersplat-viewer.ts", "src/viewer.ts"]) {
  const source = await readFile(join(root, relativePath), "utf8");
  if (/(?:fetch\s*\(|XMLHttpRequest|sendBeacon\s*\()/u.test(source)) {
    failures.push(`network API found in ${relativePath}`);
  }
}

const mainSource = await readFile(join(root, "src/main.ts"), "utf8");
for (const required of [
  "VITE_PUBLIC_GAUSSIAN_URL",
  "huggingface\\.co",
  "resolve\\/",
  "[0-9a-f]{40}",
  "IntersectionObserver",
  'rootMargin: "700px 0px"',
  "bundledPublicSceneUrl.href",
  "assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog",
]) {
  if (!mainSource.includes(required)) {
    failures.push(`public viewer loading guard is missing: ${required}`);
  }
}

const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
const acceptedDependencyLicenses = new Set(["Apache-2.0", "BSD-3-Clause", "ISC", "MIT", "MPL-2.0"]);
const licenseInventory = new Map();
for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (!packagePath) continue;
  if (!metadata.license) {
    failures.push(`dependency has no lockfile license: ${packagePath}`);
    continue;
  }
  if (!acceptedDependencyLicenses.has(metadata.license)) {
    failures.push(`unreviewed dependency license ${metadata.license}: ${packagePath}`);
  }
  licenseInventory.set(metadata.license, (licenseInventory.get(metadata.license) ?? 0) + 1);
}

const notices = await readFile(join(root, "public/THIRD_PARTY.txt"), "utf8");
for (const required of [
  "SuperSplat Viewer 1.30.2",
  "Copyright (c) 2011-2026 PlayCanvas Ltd.",
  "SparkJS 2.1.0",
  "Copyright © 2025 WORLD LABS TECHNOLOGIES, INC.",
  "three.js 0.180.0",
  "Copyright © 2010-2025 three.js authors",
]) {
  if (!notices.includes(required)) failures.push(`runtime notice is missing: ${required}`);
}

if (projectLicense !== undefined && projectLicense.trim().length < 40) {
  failures.push("website source LICENSE is incomplete");
}

console.log(`Public-source allowlist checked: ${allowlist.length} files.`);
console.log(`Dependency license inventory: ${[...licenseInventory.entries()].map(([license, count]) => `${license}=${count}`).join(", ")}.`);
if (failures.length) {
  for (const failure of failures) console.error(`AUDIT BLOCKER: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Standalone allowlist/privacy/secret/license audit passed.");
}
