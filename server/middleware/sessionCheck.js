const THREE_WEEKS_MS = 1000 * 60 * 60 * 24 * 21;

module.exports = (requireTyping = true, requireMpin = true) => {
  return async (req, res, next) => {
    const user = req.user;
    const now = Date.now();

    const needsTyping =
      requireTyping &&
      (!user.lastBehavioralVerification ||
        now - new Date(user.lastBehavioralVerification).getTime() >
          THREE_WEEKS_MS);

    const needsMpin =
      requireMpin &&
      (!user.lastMpinVerifiedAt ||
        now - new Date(user.lastMpinVerifiedAt).getTime() > THREE_WEEKS_MS);

    if (needsTyping) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Behavioral re-verification required",
          step: "typing",
        });
    }

    if (needsMpin) {
      return res
        .status(403)
        .json({
          success: false,
          message: "MPIN verification required",
          step: "mpin",
        });
    }

    next();
  };
};
