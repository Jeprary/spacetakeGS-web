import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface ViewerOptions {
  container: HTMLElement;
  source: string;
  label: string;
  onStatus: (message: string) => void;
}

export async function mountGaussianViewer({ container, source, label, onStatus }: ViewerOptions) {
  if (!document.createElement("canvas").getContext("webgl2")) {
    throw new Error("WebGL 2 is not available in this browser.");
  }

  container.replaceChildren();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x060909, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
  camera.position.set(0, 0, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const splat = new SplatMesh({ url: source });
  splat.quaternion.set(1, 0, 0, 0);
  scene.add(splat);

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let disposed = false;
  renderer.setAnimationLoop(() => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
  });

  try {
    await splat.initialized;
    onStatus(`${label} ready. Drag to orbit, scroll to zoom.`);
  } catch (error) {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
    throw error;
  }

  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    scene.remove(splat);
    renderer.dispose();
    renderer.domElement.remove();
  };
}
