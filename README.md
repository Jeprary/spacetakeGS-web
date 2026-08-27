# SpaceTake GS public website (`Jeprary/spacetakeGS-web`)

Status: **prototype / NOT PUBLISHED / NOT A PRODUCT RELEASE**.

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

The embedded official SuperSplat Viewer begins loading SOG content when it is
within 700 px of the viewport and retains the package's Orbit/Fly controls. The
existing SparkJS viewer remains a fallback for its supported local formats.
Production builds may set `VITE_PUBLIC_GAUSSIAN_URL` only to a public
Hugging Face Model repository asset pinned with a 40-character commit in the
`/resolve/<commit>/...` path. `VITE_PUBLIC_GAUSSIAN_LABEL` supplies its public
display name. Without that reviewed URL the viewer fails closed to an honest
empty state. The homepage does not expose a local-file chooser.
