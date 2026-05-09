/**
 * reCAPTCHA v3 verification middleware
 * Attaches to any route that receives user input to prevent bot abuse.
 * Expects `recaptchaToken` in the request body.
 * Rejects requests scoring below MIN_SCORE (default 0.5).
 */

const MIN_SCORE = 0.5;
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Verify a reCAPTCHA v3 token with Google's API.
 * Returns { success, score, action } or throws on network failure.
 */
async function verifyRecaptchaToken(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // In development, if no real secret key is set, skip verification
  if (!secret || secret === "YOUR_RECAPTCHA_V3_SECRET_KEY") {
    console.warn("[reCAPTCHA] No secret key configured — skipping verification in dev mode.");
    return { success: true, score: 1.0, action: "dev_bypass" };
  }

  const params = new URLSearchParams({ secret, response: token });
  const res = await fetch(`${VERIFY_URL}?${params.toString()}`, { method: "POST" });
  const data = await res.json();
  return data;
}

/**
 * Express middleware — verifies reCAPTCHA v3 token on protected routes.
 * Usage: router.post("/login", verifyRecaptcha, authController.login);
 */
const verifyRecaptcha = async (req, res, next) => {
  const token = req.body.recaptchaToken;

  if (!token) {
    return res.status(400).json({ error: "reCAPTCHA token is missing. Please try again." });
  }

  try {
    const result = await verifyRecaptchaToken(token);

    if (!result.success || result.score < MIN_SCORE) {
      console.warn(`[reCAPTCHA] Failed — score: ${result.score}, errors: ${JSON.stringify(result["error-codes"])}`);
      return res.status(403).json({
        error: "reCAPTCHA verification failed. Your request appears to be automated.",
        score: result.score,
      });
    }

    // Attach score to request so controllers can access it if needed
    req.recaptchaScore = result.score;
    next();
  } catch (err) {
    console.error("[reCAPTCHA] Verification error:", err);
    // Fail open on network errors so legitimate users aren't blocked
    console.warn("[reCAPTCHA] Failing open due to verification network error.");
    next();
  }
};

module.exports = { verifyRecaptcha };
