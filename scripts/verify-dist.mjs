import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const allowed = new Set([".html", ".css", ".js", ".jpg", ".png", ".sog", ".svg", ".txt", ".webmanifest"]);
const bundledGaussianPath = "assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog";
const bundledGaussianBytes = 67_111_473;
const bundledGaussianSha256 = "f1aaf327df2d68d4edb342da1bcf601d9ce32459eb4fdea1f6d2140da455fdef";
let totalBytes = 0;
const paths = [];

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${path}`);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const suffix = extname(entry.name);
    const relativePath = relative(root, path);
    if (!allowed.has(suffix)) throw new Error(`Unexpected Pages artifact type: ${path}`);
    if (suffix === ".sog" && relativePath !== bundledGaussianPath) {
      throw new Error(`Unexpected Gaussian artifact: ${relativePath}`);
    }
    const info = await stat(path);
    totalBytes += info.size;
    paths.push(relativePath);
    if ([".html", ".css", ".js", ".svg", ".txt"].includes(suffix)) {
      const text = await readFile(path, "utf8");
      for (const pattern of [/\/mnt\//i, /\/home\//i, /[A-Z]:\\\\[A-Za-z0-9._ -]{2,}\\\\/]) {
        if (pattern.test(text)) throw new Error(`Private path pattern in ${path}`);
      }
    }
  }
}

await walk(root);
if (!paths.includes("index.html")) throw new Error("dist/index.html is missing");
const builtHtml = await readFile(join(root, "index.html"), "utf8");
for (const [label, pattern] of [
  ["document title", /<title>SpaceTake GS<\/title>/u],
  ["standard description", /<meta\s+name="description"\s+content="Capture a space\. Keep it yours\."\s*\/>/u],
  ["Open Graph title", /<meta property="og:title" content="SpaceTake GS" \/>/u],
  ["Open Graph description", /<meta\s+property="og:description"\s+content="Capture a space\. Keep it yours\."\s*\/>/u],
  ["Twitter title", /<meta name="twitter:title" content="SpaceTake GS" \/>/u],
  ["Twitter description", /<meta\s+name="twitter:description"\s+content="Capture a space\. Keep it yours\."\s*\/>/u],
]) {
  if (!pattern.test(builtHtml)) throw new Error(`dist/index.html has regressed concise sharing metadata: ${label}`);
}
if (!paths.includes(bundledGaussianPath)) throw new Error("bundled Gaussian artifact is missing");
const bundledGaussianAbsolutePath = join(root, bundledGaussianPath);
const bundledGaussianInfo = await stat(bundledGaussianAbsolutePath);
if (bundledGaussianInfo.size !== bundledGaussianBytes) {
  throw new Error(`bundled Gaussian size mismatch: ${bundledGaussianInfo.size}`);
}
const bundledGaussianDigest = await sha256(bundledGaussianAbsolutePath);
if (bundledGaussianDigest !== bundledGaussianSha256) {
  throw new Error(`bundled Gaussian SHA-256 mismatch: ${bundledGaussianDigest}`);
}
if (totalBytes > 80 * 1024 * 1024) {
  throw new Error(`Static artifact exceeds the 80 MiB embedded-viewer budget: ${totalBytes}`);
}

console.log(`Pages artifact gate passed: ${paths.length} files, ${totalBytes} bytes.`);
