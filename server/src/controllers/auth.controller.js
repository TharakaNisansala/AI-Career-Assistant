const jwt = require("jsonwebtoken");
const {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
} = require("../services/auth.service");
const {
  validateRegisterInput,
  validateLoginInput,
} = require("../utils/validators");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

function signToken(user) {
  return jwt.sign(
    { userId: user.user_id, email: user.email },
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
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists",
      });
    }

    const user = await createUser({ name, email, password });

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      userId: user.user_id,
    });
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

module.exports = { register, login, getCurrentUser };
