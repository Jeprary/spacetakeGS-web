import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".sog", "application/octet-stream"],
  [".webmanifest", "application/manifest+json"],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/spacetakeGS-web/")) pathname = pathname.slice("/spacetakeGS-web".length);
    if (pathname === "/") pathname = "/index.html";
    const absolutePath = normalize(join(distRoot, pathname));
    const relativePath = relative(distRoot, absolutePath);
    if (relativePath.startsWith("..") || relativePath === "") throw new Error("invalid path");

    if (extname(absolutePath) === ".sog") {
      response.writeHead(200, { "content-length": "0", "content-type": mimeTypes.get(".sog") });
      response.end();
      return;
    }

    const info = await stat(absolutePath);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(info.size),
      "content-type": mimeTypes.get(extname(absolutePath)) ?? "application/octet-stream",
    });
    response.end(await readFile(absolutePath));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (!address || typeof address === "string") throw new Error("mobile test server did not bind");
const pageUrl = `http://127.0.0.1:${address.port}/spacetakeGS-web/`;

const chromeCandidates = [
  process.env.CHROME_BIN,
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
].filter(Boolean);
const chrome = chromeCandidates.find(
  (candidate) => spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0,
);
if (!chrome) throw new Error("Chrome/Chromium is required for the mobile runtime gate");

const profile = await mkdtemp(join(tmpdir(), "spacetake-mobile-chrome-"));
const devtoolsPort = 9222;
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    `--remote-debugging-port=${devtoolsPort}`,
    "--remote-debugging-address=127.0.0.1",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let browserStderr = "";
browser.stderr.setEncoding("utf8");
browser.stderr.on("data", (chunk) => {
  browserStderr += chunk;
});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let devtoolsReady = false;
for (let attempt = 0; attempt < 200; attempt += 1) {
  try {
    const response = await fetch(`http://127.0.0.1:${devtoolsPort}/json/version`);
    if (response.ok) {
      devtoolsReady = true;
      break;
    }
  } catch {
    // Chrome has not exposed its debugging endpoint yet.
  }
  await delay(50);
}
if (!devtoolsReady) {
  browser.kill();
  throw new Error(`Chrome did not expose its DevTools endpoint: ${browserStderr.trim()}`);
}

const target = await fetch(`http://127.0.0.1:${devtoolsPort}/json/new?${encodeURIComponent(pageUrl)}`, {
  method: "PUT",
}).then((response) => response.json());
if (typeof target.webSocketDebuggerUrl !== "string") throw new Error("Chrome target has no WebSocket URL");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let messageId = 0;
const pending = new Map();
const events = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(String(data));
  if (message.id) {
    const resolver = pending.get(message.id);
    if (!resolver) return;
    pending.delete(message.id);
    if (message.error) resolver.reject(new Error(message.error.message));
    else resolver.resolve(message.result);
    return;
  }
  const listeners = events.get(message.method) ?? [];
  events.delete(message.method);
  for (const listener of listeners) listener(message.params);
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    messageId += 1;
    pending.set(messageId, { resolve, reject });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
const once = (method) =>
  new Promise((resolve) => {
    events.set(method, [...(events.get(method) ?? []), resolve]);
  });

await send("Page.enable");
await send("Runtime.enable");

const widths = [320, 390, 430];
const results = [];
try {
  for (const width of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenWidth: width,
      screenHeight: 844,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    const loaded = once("Page.loadEventFired");
    await send("Page.navigate", { url: `${pageUrl}?width=${width}` });
    await loaded;
    await delay(100);

    const layout = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `new Promise((resolve) => requestAnimationFrame(() => {
        const root = document.documentElement;
        const body = document.body;
        const lines = [...document.querySelectorAll('.hero-line')].map((line) => {
          const rect = line.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width, whiteSpace: getComputedStyle(line).whiteSpace };
        });
        window.scrollTo(200, 0);
        requestAnimationFrame(() => resolve({
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          scrollX: window.scrollX,
          lines,
          heroTouchAction: getComputedStyle(document.querySelector('.hero')).touchAction,
          viewerTouchAction: getComputedStyle(document.querySelector('.viewer-shell')).touchAction,
        }));
      }))`,
    });
    const value = layout.result.value;

    const beforeScale = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: "window.visualViewport?.scale ?? 1",
    });
    await send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: width / 2 - 20, y: 300, id: 1 },
        { x: width / 2 + 20, y: 300, id: 2 },
      ],
    });
    await send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: width / 2 - 80, y: 300, id: 1 },
        { x: width / 2 + 80, y: 300, id: 2 },
      ],
    });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await delay(50);
    const afterScale = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: "window.visualViewport?.scale ?? 1",
    });

    await send("Runtime.evaluate", {
      expression: `(() => {
        const section = document.querySelector('.reveal-section');
        document.documentElement.style.scrollBehavior = 'auto';
        const target = window.scrollY + section.getBoundingClientRect().top + section.offsetHeight * 0.3;
        window.scrollTo({ top: target, left: 0, behavior: 'instant' });
      })()`,
    });
    await delay(100);
    const reveal = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const sticky = document.querySelector('.reveal-sticky');
        const section = document.querySelector('.reveal-section');
        return {
          position: getComputedStyle(sticky).position,
          top: sticky.getBoundingClientRect().top,
          scale: Number(getComputedStyle(section).getPropertyValue('--reveal-scale')),
          copyOpacity: Number(getComputedStyle(section).getPropertyValue('--copy-opacity')),
        };
      })()`,
    });

    const record = {
      width,
      ...value,
      scaleBefore: beforeScale.result.value,
      scaleAfter: afterScale.result.value,
      reveal: reveal.result.value,
    };
    results.push(record);

    const lineOverflow = value.lines.some(
      (line) => line.whiteSpace !== "nowrap" || line.left < -0.5 || line.right > value.clientWidth + 0.5,
    );
    if (
      value.clientWidth !== width ||
      value.scrollWidth !== width ||
      value.bodyScrollWidth !== width ||
      value.scrollX !== 0 ||
      lineOverflow ||
      value.heroTouchAction !== "pan-y" ||
      value.viewerTouchAction !== "none" ||
      Math.abs(record.scaleAfter - record.scaleBefore) > 0.001 ||
      record.reveal.position !== "sticky" ||
      Math.abs(record.reveal.top) > 1 ||
      record.reveal.scale <= 1.03 ||
      record.reveal.copyOpacity < 0.9
    ) {
      throw new Error(`mobile runtime gate failed at ${width}px: ${JSON.stringify(record)}`);
    }
  }
  console.log(`Mobile runtime gate passed: ${JSON.stringify(results)}`);
} finally {
  socket.close();
  if (browser.exitCode === null) {
    const exited = new Promise((resolve) => browser.once("exit", resolve));
    browser.kill("SIGTERM");
    await Promise.race([exited, delay(2_000)]);
    if (browser.exitCode === null) browser.kill("SIGKILL");
  }
  server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
