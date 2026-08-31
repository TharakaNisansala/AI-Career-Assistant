// Provider driver seam, mirroring services/storage: every provider must
// expose complete(request), keyed by the AI_PROVIDER env var. Swapping or
// adding a provider later means dropping in a new module here (e.g.
// openai.provider.js) and pointing AI_PROVIDER at it -- callers never change.
const anthropicProvider = require("./providers/anthropic.provider");
const { AIConfigurationError } = require("./errors");

const providers = {
  anthropic: anthropicProvider,
};

// Resolved at call time (not module load) so an unsupported AI_PROVIDER
// surfaces as a normal request-time error instead of crashing the process.
function resolveProvider() {
  const providerName = process.env.AI_PROVIDER || "anthropic";
  const provider = providers[providerName];

  if (!provider) {
    throw new AIConfigurationError(`Unsupported AI_PROVIDER: ${providerName}`);
  }

  return { name: providerName, module: provider };
}

async function generateCompletion(request) {
  const { name, module } = resolveProvider();
  const result = await module.complete(request);
  return { provider: name, ...result };
}

module.exports = { generateCompletion };
