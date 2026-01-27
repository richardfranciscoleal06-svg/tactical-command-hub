// Secure logger utility - prevents sensitive data exposure in production

const isDevelopment = import.meta.env.DEV;

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, only log the message, not error details
      console.error(message);
    }
  },

  info: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },

  warn: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.warn(message, data);
    }
  },

  debug: (message: string, data?: unknown) => {
    if (isDevelopment) {
      console.debug(message, data);
    }
  }
};
