export function installViewerFullscreenHost(
  frame: HTMLIFrameElement,
  container: HTMLElement,
  fallbackExit: HTMLButtonElement,
) {
  const root = document.documentElement;
  let fallbackExpanded = false;
  let fallbackScrollY = 0;

  const leaveFallbackFullscreen = () => {
    if (!fallbackExpanded) return;
    fallbackExpanded = false;
    container.removeAttribute("data-expanded-fullscreen");
    fallbackExit.hidden = true;
    root.classList.remove("viewer-fullscreen-open");
    root.style.removeProperty("--viewer-fullscreen-scroll-y");
    window.scrollTo(0, fallbackScrollY);
    frame.focus();
  };

  const enterFallbackFullscreen = () => {
    if (fallbackExpanded) return;
    fallbackExpanded = true;
    fallbackScrollY = window.scrollY;
    root.style.setProperty("--viewer-fullscreen-scroll-y", `${-fallbackScrollY}px`);
    root.classList.add("viewer-fullscreen-open");
    container.setAttribute("data-expanded-fullscreen", "");
    fallbackExit.hidden = false;
  };

  const enterFullscreen = async () => {
    if (document.fullscreenElement === container || fallbackExpanded) return;
    if (typeof container.requestFullscreen === "function") {
      try {
        await container.requestFullscreen();
        return;
      } catch {
        // iOS and embedded browsers may expose the API but reject this iframe-mediated request.
      }
    }
    enterFallbackFullscreen();
  };

  const leaveFullscreen = async () => {
    if (document.fullscreenElement === container && typeof document.exitFullscreen === "function") {
      try {
        await document.exitFullscreen();
      } catch {
        // The host fallback still gives the user an explicit exit path if native exit fails.
      }
    }
    leaveFallbackFullscreen();
  };

  const handleViewerMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return;
    if (event.data === "requestFullscreen") {
      void enterFullscreen();
    } else if (event.data === "exitFullscreen") {
      void leaveFullscreen();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && fallbackExpanded) leaveFallbackFullscreen();
  };

  fallbackExit.addEventListener("click", leaveFallbackFullscreen);
  window.addEventListener("message", handleViewerMessage);
  window.addEventListener("keydown", handleKeydown);

  return () => {
    window.removeEventListener("message", handleViewerMessage);
    window.removeEventListener("keydown", handleKeydown);
    fallbackExit.removeEventListener("click", leaveFallbackFullscreen);
    leaveFallbackFullscreen();
  };
}
