import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const canonicalPath = join(root, "public", "brand-mark.svg");
const canonical = await readFile(canonicalPath, "utf8");
const inner = canonical.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/u)?.[1];
if (!inner) throw new Error("public/brand-mark.svg has no reusable SVG body");

const renderWrapper = ({ width, height, markSize }) => {
  const scale = markSize / 64;
  const x = (width - markSize) / 2;
  const y = (height - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#070a0a"/>
  <g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>
</svg>\n`;
};

const outputs = [
  { name: "apple-touch-icon", width: 180, height: 180, markSize: 112 },
  { name: "share-card-v2", width: 1200, height: 630, markSize: 320 },
];
const temporaryBase = process.env.SPACETAKE_BRAND_TEMP || (process.platform === "linux" ? "/tmp" : tmpdir());
const temporaryRoot = await mkdtemp(join(temporaryBase, "spacetake-brand-"));
const converter = process.env.MAGICK_BIN || "convert";

try {
  for (const output of outputs) {
    const wrapperPath = join(temporaryRoot, `${output.name}.svg`);
    const destination = join(root, "public", `${output.name}.png`);
    await writeFile(wrapperPath, renderWrapper(output), "utf8");
    const result = spawnSync(
      converter,
      [wrapperPath, "-alpha", "off", "-depth", "8", "-strip", "-define", "png:exclude-chunks=date,time", destination],
      {
      encoding: "utf8",
      },
    );
    if (result.status !== 0) {
      throw new Error(`${converter} failed for ${output.name}: ${(result.stderr || result.stdout).trim()}`);
    }
    const bytes = await readFile(destination);
    console.log(`${output.name}.png ${bytes.length} ${createHash("sha256").update(bytes).digest("hex")}`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
