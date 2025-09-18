// Validation utilities for Sequelize-based application

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Domain validation regex
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$|^localhost(:[0-9]+)?$|^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/;

// Password strength regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Sanitize string input by trimming and removing potentially harmful characters
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>"'&]/g, '') // Remove basic XSS characters
    .substring(0, 1000); // Limit length
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email is required' };
  }
  
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  if (sanitizedEmail.length > 254) {
    return { isValid: false, message: 'Email address is too long' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedEmail };
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password is too long (max 128 characters)' };
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate domain name
 */
const validateDomain = (domain) => {
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, message: 'Domain name is required' };
  }
  
  const sanitizedDomain = domain.trim().toLowerCase();
  
  if (!DOMAIN_REGEX.test(sanitizedDomain)) {
    return { isValid: false, message: 'Please enter a valid domain name (e.g., example.com)' };
  }
  
  if (sanitizedDomain.length > 253) {
    return { isValid: false, message: 'Domain name is too long' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedDomain };
};

/**
 * Validate URL format
 */
const validateUrl = (url) => {
  if (!url) {
    return { isValid: true, sanitizedValue: '' }; // URL is optional
  }
  
  if (typeof url !== 'string') {
    return { isValid: false, message: 'URL must be a string' };
  }
  
  const sanitizedUrl = url.trim();
  
  if (!URL_REGEX.test(sanitizedUrl)) {
    return { isValid: false, message: 'Please enter a valid URL (must start with http:// or https://)' };
  }
  
  if (sanitizedUrl.length > 2048) {
    return { isValid: false, message: 'URL is too long' };
  }
  
  return { isValid: true, sanitizedValue: sanitizedUrl };
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (id, fieldName = 'ID') => {
  if (!id) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  // UUID v4 validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return { isValid: false, message: `Invalid ${fieldName} format` };
  }
  
  return { isValid: true };
};

/**
 * Validate string length
 */
const validateStringLength = (str, fieldName, minLength = 0, maxLength = 255) => {
  if (!str || typeof str !== 'string') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const sanitizedStr = sanitizeString(str);
  
  if (sanitizedStr.length < minLength) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} characters long` };
  }
  
  if (sanitizedStr.length > maxLength) {
    return { isValid: false, message: `${fieldName} must be no more than ${maxLength} characters long` };
  }
  
  return { isValid: true, sanitizedValue: sanitizedStr };
};

/**
 * Validate enum values
 */
const validateEnum = (value, allowedValues, fieldName) => {
  if (!value) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (!allowedValues.includes(value)) {
    return { 
      isValid: false, 
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate notification title and content
 */
const validateNotificationContent = (title, content) => {
  const errors = [];
  
  const titleValidation = validateStringLength(title, 'Title', 1, 100);
  if (!titleValidation.isValid) {
    errors.push(titleValidation.message);
  }
  
  const contentValidation = validateStringLength(content, 'Content', 1, 500);
  if (!contentValidation.isValid) {
    errors.push(contentValidation.message);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedTitle: titleValidation.sanitizedValue,
    sanitizedContent: contentValidation.sanitizedValue
  };
};

/**
 * Validate client data
 */
const validateClientData = (clientName, email, password, brandLogoUrl) => {
  const errors = [];
  const sanitizedData = {};
  
  // Validate client name
  const nameValidation = validateStringLength(clientName, 'Client name', 1, 100);
  if (!nameValidation.isValid) {
    errors.push(nameValidation.message);
  } else {
    sanitizedData.clientName = nameValidation.sanitizedValue;
  }
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.push(emailValidation.message);
  } else {
    sanitizedData.email = emailValidation.sanitizedValue;
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.push(passwordValidation.message);
  }
  
  // Validate brand logo URL (optional)
  if (brandLogoUrl) {
    const urlValidation = validateUrl(brandLogoUrl);
    if (!urlValidation.isValid) {
      errors.push(urlValidation.message);
    } else {
      sanitizedData.brandLogoUrl = urlValidation.sanitizedValue;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Create validation middleware
 */
const createValidationMiddleware = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    const sanitizedData = {};
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = req.body[field];
      
      for (const rule of rules) {
        const result = rule(value, field);
        if (!result.isValid) {
          errors.push(result.message);
          break; // Stop at first error for this field
        } else if (result.sanitizedValue !== undefined) {
          sanitizedData[field] = result.sanitizedValue;
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    // Add sanitized data to request
    req.sanitizedBody = { ...req.body, ...sanitizedData };
    next();
  };
};

/**
 * Handle Mongoose validation errors
 */
const handleMongooseError = (error) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return {
      status: 400,
      message: 'Validation failed',
      errors
    };
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      status: 409,
      message: `${field} already exists`,
      errors: [`A record with this ${field} already exists`]
    };
  }
  
  if (error.name === 'CastError') {
    return {
      status: 400,
      message: 'Invalid data format',
      errors: [`Invalid ${error.path}: ${error.value}`]
    };
  }
  
  // Default error
  return {
    status: 500,
    message: 'Internal server error',
    errors: [process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message]
  };
};

module.exports = {
  sanitizeString,
  validateEmail,
  validatePassword,
  validateDomain,
  validateUrl,
  validateObjectId,
  validateStringLength,
  validateEnum,
  validateNotificationContent,
  validateClientData,
  createValidationMiddleware,
  handleMongooseError
};