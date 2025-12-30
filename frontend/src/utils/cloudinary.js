/**
 * Cloudinary utility functions for optimized image delivery
 * Handles automatic format conversion, responsive sizing, and quality optimization
 */

/**
 * Generates an optimized Cloudinary URL for background images
 * @param {string} publicId - The Cloudinary public ID of the image (e.g., 'backgroundImg2_wn4xks')
 * @param {object} options - Transformation options
 * @returns {string} Optimized Cloudinary URL
 */
export const getCloudinaryImageUrl = (publicId, options = {}) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    // Fallback to local images if Cloudinary not configured in frontend
    console.warn('Cloudinary cloud name not configured, using local images');
    return `/${publicId}.webp`;
  }

  // Default transformations for optimal performance
  const defaultTransforms = [
    'c_scale',           // Scale to fit (maintains aspect ratio)
    'w_auto',            // Auto width based on device
    'dpr_auto',          // Auto device pixel ratio
    'q_auto:good',       // Auto quality (good balance of size/quality)
    'f_auto',            // Auto format (AVIF → WebP → JPEG based on browser)
    'fl_progressive'     // Progressive loading (if JPEG is served)
  ];

  // Custom transformations can override defaults
  const transforms = options.transforms || [...defaultTransforms];
  
  // Override with custom options if provided
  if (options.width) {
    const widthIndex = transforms.findIndex(t => t.startsWith('w_'));
    if (widthIndex !== -1) {
      transforms[widthIndex] = `w_${options.width}`;
    } else {
      transforms.push(`w_${options.width}`);
    }
  }
  
  if (options.height) {
    transforms.push(`h_${options.height}`);
  }
  
  if (options.quality) {
    const qualityIndex = transforms.findIndex(t => t.startsWith('q_'));
    if (qualityIndex !== -1) {
      transforms[qualityIndex] = `q_${options.quality}`;
    } else {
      transforms.push(`q_${options.quality}`);
    }
  }
  
  if (options.format) {
    const formatIndex = transforms.findIndex(t => t.startsWith('f_'));
    if (formatIndex !== -1) {
      transforms[formatIndex] = `f_${options.format}`;
    } else {
      transforms.push(`f_${options.format}`);
    }
  }

  const transformString = transforms.join(',');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
};

/**
 * Generates responsive Cloudinary URLs for different screen sizes
 * Returns an object with mobile, tablet, and desktop URLs
 * @param {string} publicId - The Cloudinary public ID of the image
 * @returns {object} Object with mobile, tablet, and desktop URLs
 */
export const getResponsiveCloudinaryUrls = (publicId) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.warn('Cloudinary cloud name not configured, using local images');
    return {
      mobile: `/${publicId}.webp`,
      tablet: `/${publicId}.webp`,
      desktop: `/${publicId}.webp`
    };
  }

  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  // Cloudinary optimizes from high-quality originals
  // These transformations tell Cloudinary what size to serve
  const commonTransforms = 'c_scale,q_auto:good,f_auto,fl_progressive';

  return {
    mobile: `${baseUrl}/${commonTransforms},w_768/${publicId}`,
    tablet: `${baseUrl}/${commonTransforms},w_1280/${publicId}`,
    desktop: `${baseUrl}/${commonTransforms},w_1920/${publicId}`
  };
};

/**
 * Background image public IDs mapping
 * Maps local image names to Cloudinary public IDs
 * Note: Cloudinary public IDs typically don't include file extensions
 * If your public IDs include .webp, they will be used as-is
 */
export const BACKGROUND_IMAGES = {
  backgroundImg1: 'backgroundImg1_vqucdt',
  backgroundImg2: 'backgroundImg2_wn4xks',
  backgroundImg3: 'backgroundImg3_s2ucj4',
  backgroundImg4: 'backgroundImg4_nl4y4h',
  backgroundImg5: 'backgroundImg5_hoxpfb',
  backgroundImg6: 'backgroundImg6_hqbagv'
};

