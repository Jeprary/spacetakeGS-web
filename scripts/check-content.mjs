import { readFile } from "node:fs/promises";

const files = [
  "src/index.html",
  "src/main.ts",
  "src/supersplat-viewer.ts",
  "src/viewer.ts",
  "src/styles.css",
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
const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
const superSplatSource = await readFile(new URL("../src/supersplat-viewer.ts", import.meta.url), "utf8");
const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
for (const required of [
  "Capture a space.",
  "REAL RECONSTRUCTION",
  "A real space, reconstructed.",
  "./reconstruction-preview.jpg",
  "Move through the captured space.",
  "Created by Jeprary",
  'rel="preload"',
  'href="./assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog"',
  'as="fetch"',
  'type="application/octet-stream"',
  'crossorigin="anonymous"',
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

if (!html.includes("Capture a space.<br /><em>Keep it yours.</em>")) {
  throw new Error("src/index.html must preserve the approved hero headline exactly");
}

if (/reveal-caption|id="reconstruction-preview"/u.test(html)) {
  throw new Error("src/index.html still contains the superseded inset reveal");
}

if ((html.match(/class="hero section-shell"/gu) ?? []).length !== 1) {
  throw new Error("src/index.html must contain one standalone opening hero");
}

if ((html.match(/data-reveal-section/gu) ?? []).length !== 1) {
  throw new Error("src/index.html must contain one separate reconstruction reveal");
}

if (!html.includes('class="reveal-clipper"') || html.includes("reveal-backdrop")) {
  throw new Error("src/index.html must use the verified clipper/media structure without the backdrop workaround");
}

const revealCopy = html.match(/<div class="reveal-copy section-shell">([\s\S]*?)<\/div>/u)?.[1] ?? "";
if (!revealCopy.includes("REAL RECONSTRUCTION") || !revealCopy.includes("A real space, reconstructed.")) {
  throw new Error("src/index.html must contain the approved minimal page-2 overlay copy");
}
if ((revealCopy.match(/<p\b/gu) ?? []).length !== 1) {
  throw new Error("src/index.html page-2 overlay must not include a supporting paragraph");
}

if (/workflow-section|workflow-title|workflow-strip|method-section|method-title|method-layout|method-copy/u.test(html)) {
  throw new Error("src/index.html still contains a removed workflow or method section");
}

if (!/<\/section>\s*<section id="viewer" class="viewer-section section-shell"/u.test(html)) {
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
for (const required of ['"start_url": "/spacetakeGS-web/"', '"scope": "/spacetakeGS-web/"']) {
  if (!manifest.includes(required)) throw new Error(`site.webmanifest is missing project-site metadata: ${required}`);
}

if (/[\u3400-\u9fff\uf900-\ufaff]/u.test(html)) {
  throw new Error("src/index.html must remain English-only for this checkpoint");
}

console.log(`Website content gate passed (${files.length} maintained files).`);
