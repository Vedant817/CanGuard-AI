const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

class JWTUtil {
  static generateToken(userId) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  static generateRefreshToken(userId) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  static verifyToken(token) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.verify(token, process.env.JWT_SECRET);
  }

  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }
}

module.exports = JWTUtil;
