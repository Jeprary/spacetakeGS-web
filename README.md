# SpaceTake GS public website (`Jeprary/spacetakeGS-web`)

Status: **public website prototype / NOT A PRODUCT RELEASE**.

This website-owned Vite project builds a static GitHub Pages candidate. It has
no backend, analytics, cookies, bundled raw camera media, or dependency on
SpaceTake product component payloads.

```text
npm install
npm run dev
npm run build
npm run audit:public
```

`npm run build` type-checks the TypeScript, audits maintained public copy and
the generated `dist/` allowlist, then produces the project-site bundle for
`https://jeprary.github.io/spacetakeGS-web/`. Local Vite development remains at
`http://127.0.0.1:5173/`.
`.github/workflows/deploy-pages.yml` is a manually triggered workflow for the
exact `Jeprary/spacetakeGS-web` project site. A push alone does not deploy it;
the workflow must be explicitly dispatched after the reviewed source commit is
present on `main`.

The social-preview image uses a portable relative URL in this unpublished
prototype. Set an owner-approved absolute public URL only when the final Pages
domain is known and publication has been authorized.

`PUBLIC-SOURCE-ALLOWLIST.txt` is the fail-closed candidate for a future clean
standalone repository. Local checkpoint/provenance records, `node_modules/`,
`dist/`, private product history and product payloads are not on that list.
The initial public source is published with an all-rights-reserved notice for
Jeprary's original website source and assets. Third-party software retains its
own licenses in `public/THIRD_PARTY.txt`; this website notice does not license
SpaceTake application source, Gaussian assets, reconstructions or raw captures.

The homepage is English-only at this checkpoint. Its pinned reconstruction
reveal uses normal document scrolling, a continuous media transform, and a
static `prefers-reduced-motion` fallback. The owner-approved real reconstruction
preview is shipped as `public/reconstruction-preview.jpg` and is included in the
standalone public-source allowlist; no raw capture or private machine path is
bundled.

The embedded official SuperSplat Viewer begins loading the reviewed 4.97M SH3
SOG reconstruction from the browser cache when it is within 700 px of the
viewport and retains the package's Orbit/Fly controls. The document preloads
the SOG and its viewer module from initial navigation while deferring WebGL
initialization until the viewer approaches the viewport. The SOG identity and public-display boundary are
recorded in `ASSETS.md` and `public/GAUSSIAN-ASSET-NOTICE.txt`; its source PLY
and private evidence are not published. The existing SparkJS viewer remains a
fallback for its supported local formats. A production override may use only a
public Hugging Face Model repository asset pinned with a 40-character commit in
the `/resolve/<commit>/...` path. The homepage exposes no local-file chooser.
