const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  revokeToken,
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshTokenById,
  revokeRefreshTokenByRawToken,
} = require("../services/auth.service");
const {
  validateRegisterInput,
  validateLoginInput,
} = require("../utils/validators");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS) || 30;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// Scoped to the auth routes only, so the cookie isn't attached to every
// other API request; httpOnly keeps it out of reach of any XSS in the SPA,
// which localStorage never could.
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
};

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.user_id, email: user.email, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function issueSession(user, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(
    user.user_id,
    new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  );
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...REFRESH_TOKEN_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
  return accessToken;
}

// Generic response used for both a brand-new registration and one for an
// email that's already taken, so the response can't be used to enumerate
// which emails already have an account. A genuine owner who "re-registers"
// with their real password still ends up logged in via the frontend's
// register-then-login flow; a wrong password just fails at that login step
// the same way it would have anyway.
const REGISTER_RESPONSE_MESSAGE =
  "If this information is valid, your account is ready. Please log in to continue.";

async function register(req, res) {
  const errors = validateRegisterInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: errors[0], errors });
  }

  const { name, password } = req.body;
  const email = req.body.email.toLowerCase();

  try {
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      await createUser({ name, email, password });
    }

    res.status(201).json({ status: "success", message: REGISTER_RESPONSE_MESSAGE });
  } catch (error) {
    console.error("Registration failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to register user" });
  }
}

async function login(req, res) {
  const errors = validateLoginInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: errors[0], errors });
  }

  const { password } = req.body;
  const email = req.body.email.toLowerCase();

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const token = await issueSession(user, res);

    res.json({
      status: "success",
      token,
      userId: user.user_id,
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to log in" });
  }
}

// Exchanges the httpOnly refresh cookie for a new access token without
// requiring the password again. The old refresh token is revoked and a new
// one issued on every call (rotation): if a stolen refresh token is ever
// used after the legitimate client has already rotated past it, that reuse
// is at least confined to a single extra access token rather than granting
// indefinite access.
async function refresh(req, res) {
  const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  if (!rawToken) {
    return res.status(401).json({ status: "error", message: "Refresh token is required" });
  }

  try {
    const stored = await findValidRefreshToken(rawToken);
    if (!stored) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);
      return res.status(401).json({ status: "error", message: "Invalid or expired refresh token" });
    }

    const user = await findUserById(stored.user_id);
    if (!user) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);
      return res.status(401).json({ status: "error", message: "Invalid or expired refresh token" });
    }

    await revokeRefreshTokenById(stored.token_id);
    const token = await issueSession(user, res);

    res.json({ status: "success", token, userId: user.user_id });
  } catch (error) {
    console.error("Token refresh failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to refresh session" });
  }
}

// JWTs are stateless, so without this an access token stays valid until it
// expires even after the user "logs out". Recording its jti as revoked
// closes that window (auth.middleware checks every incoming token against
// this table); the refresh token is revoked the same way so it can't be used
// to silently mint a fresh access token afterwards.
async function logout(req, res) {
  try {
    await revokeToken(req.user.jti, new Date(req.user.exp * 1000));

    const rawToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (rawToken) {
      await revokeRefreshTokenByRawToken(rawToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to log out" });
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    res.json({ status: "success", user });
  } catch (error) {
    console.error("Fetching current user failed:", error.message);
    res.status(500).json({ status: "error", message: "Unable to fetch user" });
  }
}

module.exports = { register, login, refresh, logout, getCurrentUser };
