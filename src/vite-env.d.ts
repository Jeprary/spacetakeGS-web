/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_GAUSSIAN_URL?: string;
  readonly VITE_PUBLIC_GAUSSIAN_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
