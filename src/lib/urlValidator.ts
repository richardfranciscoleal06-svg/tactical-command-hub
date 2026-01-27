/**
 * URL Validation utility for security
 * Validates URLs to prevent XSS attacks via javascript: and data: protocols
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Domains commonly used for image hosting
const ALLOWED_DOMAINS = [
  'imgur.com',
  'i.imgur.com',
  'ibb.co',
  'i.ibb.co',
  'postimg.cc',
  'i.postimg.cc',
  'imageban.ru',
  'imgbb.com',
  'discord.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'ibjddcrzhksqfqnmbsof.supabase.co', // Project's Supabase storage
];

/**
 * Validates if a URL is safe to use in href attributes
 * Blocks javascript:, data:, and other potentially dangerous protocols
 */
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url.trim());
    
    // Check protocol - only allow http/https
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Validates if a URL is from an allowed image hosting domain
 * Use this for stricter validation when needed
 */
export const isValidEvidenceUrl = (url: string): boolean => {
  if (!isValidUrl(url)) {
    return false;
  }

  try {
    const parsed = new URL(url.trim());
    const domain = parsed.hostname.toLowerCase();
    
    // Check if domain is in whitelist or is a subdomain of allowed domain
    return ALLOWED_DOMAINS.some(allowed => 
      domain === allowed || domain.endsWith('.' + allowed)
    );
  } catch {
    return false;
  }
};

/**
 * Sanitizes a URL for safe use in href
 * Returns '#' if the URL is invalid
 */
export const sanitizeUrl = (url: string): string => {
  return isValidUrl(url) ? url : '#';
};
