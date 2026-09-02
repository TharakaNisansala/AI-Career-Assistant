// A resource that doesn't exist and one that belongs to someone else are
// both reported as "not found" (see ownership.js) so callers can't use the
// response to enumerate other users' resource ids.
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}

module.exports = { NotFoundError };
