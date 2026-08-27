import "./styles.css";

const header = document.querySelector<HTMLElement>("[data-header]");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealSection = document.querySelector<HTMLElement>("[data-reveal-section]");
let revealVisible = false;
let revealFrame = 0;

const updateReveal = () => {
  revealFrame = 0;
  const revealRelease = revealSection
    ? revealSection.offsetTop + revealSection.offsetHeight - window.innerHeight
    : 20;
  header?.toggleAttribute("data-scrolled", window.scrollY >= revealRelease);
  if (!revealSection || reduceMotion || !revealVisible) return;

  const bounds = revealSection.getBoundingClientRect();
  const sectionProgress = Math.min(Math.max(-bounds.top / Math.max(revealSection.offsetHeight, 1), 0), 1);
  let mediaScale: number;
  if (sectionProgress <= 0.4) {
    mediaScale = 1 + 0.07 * (sectionProgress / 0.4);
  } else if (sectionProgress <= 0.6) {
    mediaScale = 1.07 + 0.04 * ((sectionProgress - 0.4) / 0.2);
  } else {
    mediaScale = 1.11 + 0.15 * ((sectionProgress - 0.6) / 0.4);
  }
  const copyProgress = Math.min(Math.max((sectionProgress - 0.16) / 0.1, 0), 1);
  const copyEase = copyProgress * copyProgress * (3 - 2 * copyProgress);
  const copyTravel = Math.min(sectionProgress / 0.9, 1);

  revealSection.style.setProperty("--reveal-scale", mediaScale.toFixed(4));
  revealSection.style.setProperty("--copy-opacity", copyEase.toFixed(4));
  revealSection.style.setProperty("--copy-y", `${(24 - 48 * copyTravel).toFixed(2)}px`);
};

const scheduleReveal = () => {
  if (revealFrame) return;
  revealFrame = window.requestAnimationFrame(updateReveal);
};

if (revealSection && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      revealVisible = entries.some((entry) => entry.isIntersecting);
      if (revealVisible) scheduleReveal();
    },
    { rootMargin: "25% 0px" },
  );
  revealObserver.observe(revealSection);
  window.addEventListener("scroll", scheduleReveal, { passive: true });
  window.addEventListener("resize", scheduleReveal, { passive: true });
} else if (revealSection) {
  revealSection.style.setProperty("--reveal-scale", "1");
  revealSection.style.setProperty("--copy-opacity", "1");
  revealSection.style.setProperty("--copy-y", "0px");
}

window.addEventListener("scroll", scheduleReveal, { passive: true });
scheduleReveal();

const viewerShell = document.querySelector<HTMLElement>("[data-viewer-shell]");
const stage = document.querySelector<HTMLElement>("[data-viewer-stage]");
const status = document.querySelector<HTMLElement>("[data-viewer-status]");
let disposeViewer: (() => void) | undefined;
let viewerRequest = 0;
let publicSceneAttempted = false;

const bundledPublicScenePath = `${import.meta.env.BASE_URL}assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog`;
const bundledPublicSceneUrl = new URL(bundledPublicScenePath, window.location.origin);
const configuredPublicSceneUrl = import.meta.env.VITE_PUBLIC_GAUSSIAN_URL?.trim() ?? "";
const publicScene = {
  url: configuredPublicSceneUrl || bundledPublicSceneUrl.href,
  label: import.meta.env.VITE_PUBLIC_GAUSSIAN_LABEL?.trim() || "SpaceTake GS 4.97M SH3 reconstruction",
};
const lockedHuggingFaceAsset =
  /^https:\/\/huggingface\.co\/[^/\s]+\/[^/\s]+\/resolve\/[0-9a-f]{40}\/[^?#\s]+(?:\?download=true)?$/iu;
type ViewerKind = "spark" | "supersplat";
const localScenePaths = new Map([
  [
    "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh1-4m-aligned.ply",
    { label: "4M SH1 PLY local preview", viewer: "spark" as ViewerKind },
  ],
  [
    "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh1-4m-aligned.spark-2.1.0.spz",
    { label: "4M SH1 SPZ local preview", viewer: "spark" as ViewerKind },
  ],
  [
    "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.spark-2.1.0.spz",
    { label: "4.97M SH3 SPZ local preview", viewer: "spark" as ViewerKind },
  ],
  [
    "/__spacetake-local-assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog",
    { label: "4.97M SH3 SOG local preview", viewer: "supersplat" as ViewerKind },
  ],
]);

const selectScene = () => {
  const requestedLocalPath = new URLSearchParams(window.location.search).get("localScene");
  if (requestedLocalPath !== null) {
    if (window.location.protocol !== "http:" || window.location.hostname !== "127.0.0.1") return;
    const localScene = localScenePaths.get(requestedLocalPath);
    if (!localScene) return;
    const url = new URL(requestedLocalPath, window.location.origin);
    if (url.origin !== window.location.origin) return;
    return { url: url.href, ...localScene };
  }

  const isBundledPublicScene = publicScene.url === bundledPublicSceneUrl.href;
  if (!isBundledPublicScene && !lockedHuggingFaceAsset.test(publicScene.url)) return;
  const path = new URL(publicScene.url).pathname.toLowerCase();
  const viewer: ViewerKind = path.endsWith(".sog") ? "supersplat" : "spark";
  return { ...publicScene, viewer };
};

const showEmptyViewer = () => {
  if (!stage || !status) return;
  stage.replaceChildren();
  stage.removeAttribute("aria-busy");
  status.textContent = "Viewer unavailable.";
};

const mountSource = async (source: string, label: string, viewer: ViewerKind) => {
  if (!stage || !status) return;

  const request = ++viewerRequest;
  disposeViewer?.();
  disposeViewer = undefined;
  stage.replaceChildren();
  status.textContent = `Loading ${label}…`;
  stage.setAttribute("aria-busy", "true");

  try {
    const onStatus = (message: string) => {
      if (request === viewerRequest) status.textContent = message;
    };
    const dispose =
      viewer === "supersplat"
        ? await import("./supersplat-viewer").then(({ mountSuperSplatViewer }) =>
            mountSuperSplatViewer({ container: stage, source, label, onStatus }),
          )
        : await import("./viewer").then(({ mountGaussianViewer }) =>
            mountGaussianViewer({ container: stage, source, label, onStatus }),
          );
    if (request !== viewerRequest) {
      dispose();
      return;
    }
    disposeViewer = dispose;
  } catch {
    if (request !== viewerRequest) return;
    showEmptyViewer();
  } finally {
    if (request === viewerRequest) stage.removeAttribute("aria-busy");
  }
};

const loadSelectedScene = () => {
  if (publicSceneAttempted || !stage || !status) return;
  publicSceneAttempted = true;

  const scene = selectScene();
  if (!scene) {
    showEmptyViewer();
    return;
  }

  void mountSource(scene.url, scene.label, scene.viewer);
};

if (viewerShell) {
  const viewerObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      viewerObserver.disconnect();
      loadSelectedScene();
    },
    { rootMargin: "700px 0px" },
  );
  viewerObserver.observe(viewerShell);
}
