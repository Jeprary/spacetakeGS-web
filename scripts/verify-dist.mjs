import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const allowed = new Set([".html", ".css", ".js", ".jpg", ".png", ".txt", ".webmanifest"]);
let totalBytes = 0;
const paths = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${path}`);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    const suffix = extname(entry.name);
    if (!allowed.has(suffix)) throw new Error(`Unexpected Pages artifact type: ${path}`);
    const info = await stat(path);
    totalBytes += info.size;
    paths.push(relative(root, path));
    if ([".html", ".css", ".js", ".txt"].includes(suffix)) {
      const text = await readFile(path, "utf8");
      for (const pattern of [/\/mnt\//i, /\/home\//i, /[A-Z]:\\\\[A-Za-z0-9._ -]{2,}\\\\/]) {
        if (pattern.test(text)) throw new Error(`Private path pattern in ${path}`);
      }
    }
  }
}

await walk(root);
if (!paths.includes("index.html")) throw new Error("dist/index.html is missing");
if (totalBytes > 10 * 1024 * 1024) {
  throw new Error(`Static artifact exceeds the 10 MiB prototype budget: ${totalBytes}`);
}

console.log(`Pages artifact gate passed: ${paths.length} files, ${totalBytes} bytes.`);
