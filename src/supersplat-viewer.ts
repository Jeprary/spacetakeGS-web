import { renderViewerHtml } from "@playcanvas/supersplat-viewer";
import { defaultSettings } from "@playcanvas/supersplat-viewer/settings";

interface ViewerOptions {
  container: HTMLElement;
  source: string;
  label: string;
  onStatus: (message: string) => void;
}

export async function mountSuperSplatViewer({ container, source, label, onStatus }: ViewerOptions) {
  const frame = document.createElement("iframe");
  frame.className = "supersplat-frame";
  frame.title = `${label} — official SuperSplat Viewer`;
  frame.loading = "eager";
  frame.referrerPolicy = "no-referrer";
  frame.setAttribute("allow", "fullscreen");
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-pointer-lock");

  const settings = defaultSettings("environment");
  settings.background.color = [0, 0, 0];

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

  container.replaceChildren();
  const loaded = new Promise<void>((resolve, reject) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener("error", () => reject(new Error("SuperSplat Viewer failed to load.")), {
      once: true,
    });
  });
  container.append(frame);
  frame.srcdoc = viewerDocument;
  await loaded;
  onStatus(`${label} loaded in the official SuperSplat Viewer.`);

  return () => {
    frame.srcdoc = "";
    frame.remove();
  };
}
