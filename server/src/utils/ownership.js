const { NotFoundError } = require("./httpErrors");

// Throws NotFoundError (mapped to a 404 by handleControllerError) when the
// resource is missing OR belongs to a different user, deliberately keeping
// those two cases indistinguishable to the caller. Replaces the same inline
// `if (!resource || resource.user_id !== userId) return res.status(404)...`
// check that used to be repeated across every resource controller.
function assertOwned(resource, userId, notFoundMessage) {
  if (!resource || resource.user_id !== userId) {
    throw new NotFoundError(notFoundMessage);
  }
  return resource;
}

module.exports = { assertOwned };
