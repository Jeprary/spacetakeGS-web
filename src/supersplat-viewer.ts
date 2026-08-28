import { renderViewerHtml } from "@playcanvas/supersplat-viewer";
import { defaultSettings } from "@playcanvas/supersplat-viewer/settings";
import { installViewerFullscreenHost } from "./viewer-fullscreen";

interface ViewerOptions {
  container: HTMLElement;
  source: string;
  label: string;
  onStatus: (message: string) => void;
}

export async function mountSuperSplatViewer({ container, source, label, onStatus }: ViewerOptions) {
  const frame = document.createElement("iframe");
  const fallbackExit = document.createElement("button");
  frame.className = "supersplat-frame";
  frame.title = `${label} — official SuperSplat Viewer`;
  frame.loading = "eager";
  frame.referrerPolicy = "no-referrer";
  frame.setAttribute("allow", "fullscreen");
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock");
  fallbackExit.className = "viewer-fullscreen-exit";
  fallbackExit.type = "button";
  fallbackExit.textContent = "Exit fullscreen";
  fallbackExit.hidden = true;

  const settings = defaultSettings("environment");
  settings.background.color = [0, 0, 0];
  const initialCamera = settings.cameras[0]?.initial;
  if (!initialCamera) throw new Error("SuperSplat initial camera is unavailable.");
  initialCamera.position[1] = 0.15;
  initialCamera.target[1] = 0.15;

  const viewerBase = new URL(`${import.meta.env.BASE_URL}supersplat-viewer/`, window.location.origin);
  const viewerDocument = renderViewerHtml({
    bootstrap: {
      settings,
      contentUrl: source,
      contentFilename: "scene.sog",
    },
    baseHref: viewerBase.href,
    backgroundColor: [0, 0, 0],
    inlineCss: true,
    inlineJs: true,
  });

  const removeFullscreenHost = installViewerFullscreenHost(frame, container, fallbackExit);

  container.replaceChildren();
  const loaded = new Promise<void>((resolve, reject) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener("error", () => reject(new Error("SuperSplat Viewer failed to load.")), {
      once: true,
    });
  });
  container.append(frame, fallbackExit);
  frame.srcdoc = viewerDocument;
  await loaded;
  onStatus(`${label} loaded in the official SuperSplat Viewer.`);

  return () => {
    removeFullscreenHost();
    frame.srcdoc = "";
    frame.remove();
    fallbackExit.remove();
  };
}
