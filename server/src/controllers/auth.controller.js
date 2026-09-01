const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  revokeToken,
} = require("../services/auth.service");
const {
  validateRegisterInput,
  validateLoginInput,
} = require("../utils/validators");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Generic response used for both a brand-new registration and one for an
// email that's already taken, so the response can't be used to enumerate
// which emails already have an account. A genuine owner who "re-registers"
// with their real password still ends up logged in via the frontend's
// register-then-login flow; a wrong password just fails at that login step
// the same way it would have anyway.
const REGISTER_RESPONSE_MESSAGE =
  "If this information is valid, your account is ready. Please log in to continue.";

function signToken(user) {
  return jwt.sign(
    { userId: user.user_id, email: user.email, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

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

    const token = signToken(user);

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

// JWTs are stateless, so without this a token stays valid until it expires
// even after the user "logs out". Recording its jti as revoked closes that
// window: auth.middleware checks every incoming token against this table.
async function logout(req, res) {
  try {
    await revokeToken(req.user.jti, new Date(req.user.exp * 1000));
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

module.exports = { register, login, logout, getCurrentUser };
