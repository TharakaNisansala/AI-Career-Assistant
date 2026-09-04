// Must run before anything else in this file (see pdfPolyfills.js) --
// src/server.js already requires it first too, but Vercel's bundler doesn't
// guarantee require() order across files the way a single module's top
// does, so this entry point sets it up independently as well.
require("../src/utils/pdfPolyfills");

// Vercel Node.js runtime entry point. Vercel treats the default export of
// this file as the request handler for every path routed to it by
// vercel.json — an Express app satisfies that contract directly (it's just
// a `(req, res) => {}` function under the hood), so no adapter is needed.
const app = require("../src/server");

module.exports = app;
