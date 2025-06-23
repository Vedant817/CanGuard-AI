const { body, validationResult } = require('express-validator');
const ValidationUtil = require('../utils/validators');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      if (!ValidationUtil.isValidUsername(value)) {
        throw new Error('Invalid username format');
      }
      return true;
    }),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom((value) => {
      if (!ValidationUtil.isValidEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .custom((value) => {
      if (!ValidationUtil.isValidPassword(value)) {
        throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      }
      return true;
    }),
  
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !ValidationUtil.isValidPhoneNumber(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    })
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .custom((value) => {
      if (!ValidationUtil.isValidPassword(value)) {
        throw new Error('New password must contain at least one lowercase letter, one uppercase letter, and one number');
      }
      return true;
    })
];

const validateBehaviorUpdate = [
  body('touchPatterns.averagePressure')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Average pressure must be between 0 and 1'),
  
  body('touchPatterns.averageDuration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Average duration must be positive'),
  
  body('typingPatterns.wpm')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('WPM must be between 0 and 200'),
  
  body('typingPatterns.accuracy')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Accuracy must be between 0 and 100')
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateBehaviorUpdate,
  handleValidationErrors
};