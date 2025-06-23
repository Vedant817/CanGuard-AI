class ValidationUtil {
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password) {
    // At least 6 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  }

  static isValidUsername(username) {
    // 3-30 characters, letters, numbers, underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  static isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
  }
}

module.exports = ValidationUtil;
