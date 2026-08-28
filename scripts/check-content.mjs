import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const files = [
  "src/index.html",
  "src/main.ts",
  "src/supersplat-viewer.ts",
  "src/viewer.ts",
  "src/styles.css",
  "scripts/generate-brand-assets.mjs",
];

const prohibited = [
  /\/mnt\//i,
  /\/home\//i,
  /[A-Z]:\\\\/,
  /RELEASE QUALIFIED/,
  /LOCAL ALPHA PASS/,
  /safe real-engine (cancel|resume).*qualified/i,
  /179.degree.*fixed/i,
];

for (const file of files) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  for (const pattern of prohibited) {
    if (pattern.test(content)) {
      throw new Error(`${file} contains prohibited public content: ${pattern}`);
    }
  }
}

const html = await readFile(new URL("../src/index.html", import.meta.url), "utf8");
const manifest = await readFile(new URL("../public/site.webmanifest", import.meta.url), "utf8");
const appleTouchIcon = await readFile(new URL("../public/apple-touch-icon.png", import.meta.url));
const shareCard = await readFile(new URL("../public/share-card-v2.png", import.meta.url));
const brandMark = await readFile(new URL("../public/brand-mark.svg", import.meta.url), "utf8");
const brandGenerator = await readFile(new URL("./generate-brand-assets.mjs", import.meta.url), "utf8");
const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
const superSplatSource = await readFile(new URL("../src/supersplat-viewer.ts", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

const pngDimensions = (buffer) => {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("public brand artwork must be a valid PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
if (JSON.stringify(pngDimensions(appleTouchIcon)) !== JSON.stringify({ width: 180, height: 180 })) {
  throw new Error("public/apple-touch-icon.png must be exactly 180x180");
}
if (JSON.stringify(pngDimensions(shareCard)) !== JSON.stringify({ width: 1200, height: 630 })) {
  throw new Error("public/share-card-v2.png must be exactly 1200x630");
}
for (const required of ['viewBox="0 0 64 64"', 'stroke="#4faea5"', 'stroke="#80d4ca"']) {
  if (!brandMark.includes(required)) throw new Error(`public/brand-mark.svg is missing website brand geometry: ${required}`);
}
for (const required of ['public", "brand-mark.svg"', 'apple-touch-icon', 'share-card-v2']) {
  if (!brandGenerator.includes(required)) throw new Error(`brand asset generator is not bound to the canonical mark: ${required}`);
}
for (const [label, bytes, expected] of [
  ["apple-touch-icon", appleTouchIcon, "51933fece33d2c94ab529f94cc027db2f31a92517f902d3e011ade9e653970cd"],
  ["share-card-v2", shareCard, "fe2e518a7686a5c6335e39b965edc0ff8afe6b1ef471956ee0188267c7bd616c"],
]) {
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`${label} is not the reviewed canonical-brand derivative: ${actual}`);
}
for (const required of [
  "Capture a space.",
  "SCENE PREVIEW",
  "A captured space, rebuilt in 3D.",
  "./reconstruction-preview.jpg",
  "Move through the captured space.",
  "Created by Jeprary",
  'rel="preload"',
  'href="./assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog"',
  'as="fetch"',
  'type="application/octet-stream"',
  'crossorigin="anonymous"',
  '<meta property="og:url" content="https://jeprary.github.io/spacetakeGS-web/" />',
  '<meta property="og:image" content="https://jeprary.github.io/spacetakeGS-web/share-card-v2.png" />',
  '<meta property="og:image:secure_url" content="https://jeprary.github.io/spacetakeGS-web/share-card-v2.png" />',
  '<meta property="og:image:type" content="image/png" />',
  '<meta property="og:image:alt" content="SpaceTake GS circular brand mark" />',
  '<meta name="twitter:image" content="https://jeprary.github.io/spacetakeGS-web/share-card-v2.png" />',
  '<link rel="icon" href="./brand-mark.svg" type="image/svg+xml" />',
  '<link rel="apple-touch-icon" href="./apple-touch-icon.png" sizes="180x180" />',
  '<link rel="canonical" href="https://jeprary.github.io/spacetakeGS-web/" />',
]) {
  if (!html.includes(required)) {
    throw new Error(`src/index.html is missing required public copy: ${required}`);
  }
}

for (const removed of [
  "Private Local Alpha",
  "No public build",
  "Scroll to reveal",
  "Current status",
  "Download not available",
  "Public-use approval pending",
  "REAL RECONSTRUCTION",
  "A real space, reconstructed.",
  "RECONSTRUCTION PREVIEW",
  "release review",
  "Open local scene",
  "Viewer credits:",
  "Real reconstruction",
  "A captured space, ready to inspect.",
  "Panoramic spatial capture",
  "How it works",
  "One capture.<br />Four clear stages.",
  "Record the space with a supported panoramic camera.",
  "Prepare / SfM",
  "Train a fisheye-aware Gaussian representation locally.",
  "Explore the result and retain structured scene artifacts.",
  "Fisheye geometry stays in the loop.",
  "LichtFeld supplies 3DGUT, MRNF, and PPISP.",
  "Interactive reconstruction",
  "The Gaussian scene loads as this viewer approaches the viewport.",
  "On-demand WebGL",
  "Interactive scene unavailable.",
  "The scene will load automatically nearby.",
  "Interactive scene",
  "Ready when the viewer enters the page.",
  "Please try again later.",
]) {
  if (html.includes(removed)) {
    throw new Error(`src/index.html still contains removed internal/status copy: ${removed}`);
  }
}

if ((html.match(/<h1\b/giu) ?? []).length !== 1) {
  throw new Error("src/index.html must contain exactly one semantic H1");
}

if (
  !/<span class="hero-line">Capture a space\.<\/span>\s*<em class="hero-line">Keep it yours\.<\/em>/u.test(
    html,
  )
) {
  throw new Error("src/index.html must preserve the approved non-breaking hero lines exactly");
}

for (const requiredResponsiveRule of [
  "html { width:100%; max-width:100%; overflow-x:hidden;",
  "body { position:relative; width:100%; max-width:100%; margin:0; overflow-x:hidden; overscroll-behavior-x:none;",
  "html,body,main { overflow-x:clip; }",
  "main { width:100%; max-width:100%; }",
  ".site-header,.hero,.reveal-section,.viewer-intro,.site-footer { touch-action:pan-y; }",
  ".viewer-shell { overflow:hidden; overscroll-behavior:contain; touch-action:none;",
  ".viewer-stage canvas,.supersplat-frame { display:block; width:100%; height:100%; min-height:620px; touch-action:none; }",
  ".hero-line { display:block; white-space:nowrap; }",
  ".hero { position:relative; z-index:2; isolation:isolate; width:100%; min-height:100svh; background:var(--ink); }",
  ".hero-content { display:flex; min-height:100svh; padding-top:150px; padding-bottom:90px; flex-direction:column; justify-content:center; align-items:flex-start; }",
  ".hero h1 { width:100%; font-size:clamp(2rem,12vw,4.5rem); }",
]) {
  if (!styles.includes(requiredResponsiveRule)) {
    throw new Error(`src/styles.css is missing the mobile overflow guard: ${requiredResponsiveRule}`);
  }
}

if (/\b(?:50|100)vw\b/u.test(styles)) {
  throw new Error("src/styles.css must not use viewport-width full-bleed geometry");
}

if (/main\s*\{[^}]*overflow(?:-x)?:hidden/u.test(styles)) {
  throw new Error("main must not become an overflow container because it breaks the sticky reveal");
}

if (
  !html.includes('<img class="brand-mark" src="./brand-mark.svg" alt="" width="18" height="18" />') ||
  !styles.includes(
    ".brand-mark { display:block; flex:0 0 auto; width:18px; height:18px; max-width:none; }",
  )
) {
  throw new Error("website header must reference the canonical website brand mark");
}

if (/reveal-caption|id="reconstruction-preview"/u.test(html)) {
  throw new Error("src/index.html still contains the superseded inset reveal");
}

if ((html.match(/class="hero"/gu) ?? []).length !== 1 || (html.match(/class="hero-content section-shell"/gu) ?? []).length !== 1) {
  throw new Error("src/index.html must contain one full-width opaque hero and one constrained hero content shell");
}

if (/og\.png/iu.test(html)) {
  throw new Error("src/index.html must not reference the superseded atom social card");
}

if ((html.match(/data-reveal-section/gu) ?? []).length !== 1) {
  throw new Error("src/index.html must contain one separate reconstruction reveal");
}

if (!html.includes('class="reveal-clipper"') || html.includes("reveal-backdrop")) {
  throw new Error("src/index.html must use the verified clipper/media structure without the backdrop workaround");
}

const revealCopy = html.match(/<div class="reveal-copy section-shell">([\s\S]*?)<\/div>/u)?.[1] ?? "";
if (!revealCopy.includes("SCENE PREVIEW") || !revealCopy.includes("A captured space, rebuilt in 3D.")) {
  throw new Error("src/index.html must contain the approved minimal page-2 overlay copy");
}
if ((revealCopy.match(/<p\b/gu) ?? []).length !== 1) {
  throw new Error("src/index.html page-2 overlay must not include a supporting paragraph");
}

if (/workflow-section|workflow-title|workflow-strip|method-section|method-title|method-layout|method-copy/u.test(html)) {
  throw new Error("src/index.html still contains a removed workflow or method section");
}

if (!/<\/section>\s*<section id="viewer" class="viewer-section"/u.test(html)) {
  throw new Error("src/index.html must transition directly from the reveal into the viewer");
}

const viewerSection = html.match(/<section id="viewer"[\s\S]*?<\/section>/u)?.[0] ?? "";
const viewerText = viewerSection.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
if (viewerText !== "Move through the captured space.") {
  throw new Error(`src/index.html viewer must expose only its approved title; found: ${viewerText}`);
}
if (/viewer-toolbar|viewer-placeholder|viewer-kicker|mini-cloud|data-viewer-placeholder/u.test(viewerSection)) {
  throw new Error("src/index.html still contains visible viewer status or fallback UI");
}
if (!/<p class="sr-only" data-viewer-status aria-live="polite" aria-atomic="true"><\/p>/u.test(viewerSection)) {
  throw new Error("src/index.html viewer status must be an empty screen-reader-only live region");
}

if (/<nav\b|<button\b|<input\b|menu-button|site-nav/iu.test(html)) {
  throw new Error("src/index.html must keep a brand-only header and no local-file control");
}

const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/iu)?.[1] ?? "";
const footerText = footer.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
if (footerText !== "Created by Jeprary") {
  throw new Error(`src/index.html footer must contain only the author line; found: ${footerText}`);
}

if (/FAQ|Frequently Asked Questions/i.test(html)) {
  throw new Error("src/index.html must not include an FAQ section");
}

if (/panoramic spatial capture/iu.test(`${html}\n${manifest}`)) {
  throw new Error("public metadata still contains the removed hero eyebrow copy");
}

for (const required of [
  'window.location.protocol !== "http:"',
  'window.location.hostname !== "127.0.0.1"',
  'url.origin !== window.location.origin',
  "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh1-4m-aligned.ply",
  "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh1-4m-aligned.spark-2.1.0.spz",
  "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.spark-2.1.0.spz",
  "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog",
  "assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog",
  "bundledPublicSceneUrl.href",
  'initialScene?.viewer === "supersplat"',
  "lockedHuggingFaceAsset.test(publicScene.url)",
  'viewer === "supersplat"',
]) {
  if (!mainSource.includes(required)) {
    throw new Error(`src/main.ts is missing a local/public viewer source guard: ${required}`);
  }
}

for (const required of [
  '@playcanvas/supersplat-viewer',
  'renderViewerHtml',
  'defaultSettings("environment")',
  'contentFilename: "scene.sog"',
  "initialCamera.position[1] = 0.15",
  "initialCamera.target[1] = 0.15",
  'inlineCss: true',
  'inlineJs: true',
]) {
  if (!superSplatSource.includes(required)) {
    throw new Error(`src/supersplat-viewer.ts is missing an official viewer boundary: ${required}`);
  }
}

if (!viteConfig.includes('command === "build" ? "/spacetakeGS-web/" : "/"')) {
  throw new Error("vite.config.ts must keep the project-site production base and root local development base");
}
for (const required of ['"start_url": "/spacetakeGS-web/"', '"scope": "/spacetakeGS-web/"', '"src": "./brand-mark.svg"', '"sizes": "any"', '"type": "image/svg+xml"']) {
  if (!manifest.includes(required)) throw new Error(`site.webmanifest is missing project-site metadata: ${required}`);
}

if (/[\u3400-\u9fff\uf900-\ufaff]/u.test(html)) {
  throw new Error("src/index.html must remain English-only for this checkpoint");
}

console.log(`Website content gate passed (${files.length} maintained files).`);
