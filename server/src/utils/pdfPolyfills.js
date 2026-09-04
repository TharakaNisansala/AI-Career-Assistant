// pdf-parse bundles pdfjs-dist, which tries to load @napi-rs/canvas to
// polyfill DOMMatrix/ImageData/Path2D for PDF rendering. We only use it for
// text extraction (see textExtraction.utils.js), never rendering, and don't
// install @napi-rs/canvas -- but pdfjs-dist's internal code still references
// the bare `DOMMatrix`/`ImageData`/`Path2D` identifiers unconditionally in a
// few places, which throws `ReferenceError: DOMMatrix is not defined` in
// plain Node (Vercel's runtime included) once the canvas require fails.
//
// Setting these on `global` before pdf-parse is ever required satisfies
// pdfjs-dist's own `globalThis.DOMMatrix || ...` check (so it skips trying to
// load canvas at all) and makes the bare identifiers resolve, without
// pulling in a real canvas implementation we don't need.
if (typeof global.DOMMatrix === "undefined") {
  global.DOMMatrix = class DOMMatrix {};
}

if (typeof global.ImageData === "undefined") {
  global.ImageData = class ImageData {};
}

if (typeof global.Path2D === "undefined") {
  global.Path2D = class Path2D {};
}
