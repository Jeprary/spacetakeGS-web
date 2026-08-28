# Website asset record

Status: published website asset inventory.

| Path | Classification | Source | Public boundary |
| --- | --- | --- | --- |
| `public/brand-mark.svg` | CANONICAL WEBSITE brand mark, SVG | Formalizes the circular teal mark previously expressed only as desktop UI CSS; the website header, favicon and manifest reference this exact file | Single editable source for the website brand geometry; contains no third-party logo, capture, person, private evidence or machine path |
| `public/apple-touch-icon.png` | GENERATED WEBSITE touch icon, 180×180 PNG | Generated from `public/brand-mark.svg` by `scripts/generate-brand-assets.mjs` | Raster derivative only; the mark is not redrawn in this file |
| `public/share-card-v2.png` | GENERATED WEBSITE social preview, 1200×630 PNG | Generated from `public/brand-mark.svg` by `scripts/generate-brand-assets.mjs` | Replaces the superseded orbital social artwork; the mark is not redrawn in this file |
| `public/reconstruction-preview.jpg` | REAL reconstruction preview, 1280×665 JPEG, 194,295 bytes, SHA-256 `339f3ab8c29ed7e0b97dbe9307915510ec8b3676f68b17e1317d36584df0f18f` | Owner-supplied web derivative; owner approved it for public display on 2026-08-27; exact bytes preserved | Public display is approved for this reconstruction preview only; no raw capture or private machine path is included |
| `public/assets/x5-tunnel-mrnf-ppisp-sh3-4m97-aligned.sog` | REAL reconstruction, SuperSplat SOG, 4,971,490 Gaussians, SH3, 67,111,473 bytes, SHA-256 `f1aaf327df2d68d4edb342da1bcf601d9ce32459eb4fdea1f6d2140da455fdef` | Owner-approved web derivative produced with `@playcanvas/splat-transform` 3.1.7; exact bytes preserved | Public viewing is approved. Copyright © 2026 Jeprary; all rights reserved. The source PLY, raw capture, private paths and conversion evidence are not included. |
| `public/GAUSSIAN-ASSET-NOTICE.txt` | Asset rights notice | Website-owned public-use boundary for the embedded SOG | Keeps the website source notice separate from the reconstruction asset rights. |
| `public/THIRD_PARTY.txt` | Runtime license notice | Exact MIT notices from the installed SuperSplat Viewer 1.30.2, SparkJS 2.1.0 and three.js 0.180.0 packages | Plain text; contains no private evidence or machine path |

No source PLY, raw camera media, model weight, product payload, external font,
tracking script or remote image is included. The embedded SOG is the only public
Gaussian derivative in the Pages artifact and is locked to the identity above.
