const express = require("express");
const { register, login, getCurrentUser } = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/me", authenticate, getCurrentUser);

module.exports = router;
