import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/viewer-fullscreen.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { installViewerFullscreenHost } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

class EventTargetStub {
  listeners = new Map();

  addEventListener(type, listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  removeEventListener(type, listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((candidate) => candidate !== listener),
    );
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class ClassListStub {
  values = new Set();
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class StyleStub {
  values = new Map();
  setProperty(name, value) { this.values.set(name, value); }
  removeProperty(name) { this.values.delete(name); }
  getPropertyValue(name) { return this.values.get(name) ?? ""; }
}

class ElementStub extends EventTargetStub {
  attributes = new Set();
  classList = new ClassListStub();
  style = new StyleStub();
  hidden = true;
  focusCount = 0;
  setAttribute(name) { this.attributes.add(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  focus() { this.focusCount += 1; }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const createHarness = (requestFullscreen) => {
  const root = new ElementStub();
  const windowStub = new EventTargetStub();
  windowStub.scrollY = 123;
  windowStub.scrollCalls = [];
  windowStub.scrollTo = (x, y) => windowStub.scrollCalls.push([x, y]);
  const documentStub = { documentElement: root, fullscreenElement: null };
  const frame = new ElementStub();
  frame.contentWindow = {};
  const container = new ElementStub();
  if (requestFullscreen) container.requestFullscreen = requestFullscreen;
  const exit = new ElementStub();
  exit.hidden = true;
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });
  const dispose = installViewerFullscreenHost(frame, container, exit);
  return { root, windowStub, documentStub, frame, container, exit, dispose };
};

const fallback = createHarness();
fallback.windowStub.dispatch("message", { source: {}, data: "requestFullscreen" });
fallback.windowStub.dispatch("message", {
  source: fallback.frame.contentWindow,
  data: { type: "requestFullscreen" },
});
assert(!fallback.container.hasAttribute("data-expanded-fullscreen"), "untrusted messages must be ignored");
fallback.windowStub.dispatch("message", {
  source: fallback.frame.contentWindow,
  data: "requestFullscreen",
});
assert(fallback.container.hasAttribute("data-expanded-fullscreen"), "trusted request must expand host");
assert(!fallback.exit.hidden, "fallback must expose its host-owned exit button");
assert(fallback.root.classList.contains("viewer-fullscreen-open"), "fallback must lock page scroll");
assert(
  fallback.root.style.getPropertyValue("--viewer-fullscreen-scroll-y") === "-123px",
  "fallback must preserve the current scroll offset",
);
fallback.windowStub.dispatch("message", {
  source: fallback.frame.contentWindow,
  data: "exitFullscreen",
});
assert(!fallback.container.hasAttribute("data-expanded-fullscreen"), "trusted exit must collapse host");
assert(fallback.exit.hidden, "fallback exit button must hide after exit");
assert(JSON.stringify(fallback.windowStub.scrollCalls.at(-1)) === "[0,123]", "exit must restore scroll");
fallback.dispose();
assert((fallback.windowStub.listeners.get("message") ?? []).length === 0, "cleanup must remove message listener");

let nativeRequests = 0;
let nativeExits = 0;
const native = createHarness(async () => {
  nativeRequests += 1;
});
native.windowStub.dispatch("message", {
  source: native.frame.contentWindow,
  data: "requestFullscreen",
});
await tick();
assert(nativeRequests === 1, "trusted request must prefer the native Fullscreen API");
assert(!native.container.hasAttribute("data-expanded-fullscreen"), "native success must not use fallback");
native.documentStub.fullscreenElement = native.container;
native.documentStub.exitFullscreen = async () => {
  nativeExits += 1;
  native.documentStub.fullscreenElement = null;
};
native.windowStub.dispatch("message", {
  source: native.frame.contentWindow,
  data: "exitFullscreen",
});
await tick();
assert(nativeExits === 1, "trusted exit must use the native Fullscreen API when active");
native.dispose();

const rejected = createHarness(async () => {
  throw new Error("NotAllowedError");
});
rejected.windowStub.dispatch("message", {
  source: rejected.frame.contentWindow,
  data: "requestFullscreen",
});
await tick();
assert(rejected.container.hasAttribute("data-expanded-fullscreen"), "native rejection must use fallback");
rejected.exit.dispatch("click");
assert(!rejected.container.hasAttribute("data-expanded-fullscreen"), "host exit control must collapse fallback");
rejected.dispose();

console.log(
  "Fullscreen host gate passed: exact source/data filtering, native preference, rejection fallback, 100dvh host exit state.",
);
