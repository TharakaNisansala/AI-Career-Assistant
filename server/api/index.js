// Vercel Node.js runtime entry point. Vercel treats the default export of
// this file as the request handler for every path routed to it by
// vercel.json — an Express app satisfies that contract directly (it's just
// a `(req, res) => {}` function under the hood), so no adapter is needed.
const app = require("../src/server");

module.exports = app;
