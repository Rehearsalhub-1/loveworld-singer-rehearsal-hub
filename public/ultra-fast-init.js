// ULTRA FAST INITIALIZATION SCRIPT
// This script runs immediately to make the app insanely fast

(function() {
  'use strict';
  
  console.log('🚀 ULTRA FAST MODE INITIALIZING...');
  
  // 1. Preload critical resources IMMEDIATELY
  const criticalResources = [
    '/logo.png',
    '/lmm.png',
    '/manifest.json'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = resource.endsWith('.png') ? 'image' : 'fetch';
    link.href = resource;
    document.head.appendChild(link);
  });
  
  // 2. Prefetch likely next pages
  const likelyPages = [
    '/home',
    '/pages/rehearsals',
    '/pages/profile',
    '/pages/praise-night'
  ];
  
  likelyPages.forEach(page => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = page;
    document.head.appendChild(link);
  });
  
  // 3. Optimize images for instant loading
  const optimizeImages = () => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  };
  
  // Run image optimization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImages);
  } else {
    optimizeImages();
  }
  
  // 4. Register service worker for instant caching
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw-ultra-fast.js')
        .then(registration => {
          console.log('🚀 Ultra Fast SW registered!');
          
          // Force immediate activation
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    });
  }
  
  // 5. Prefetch on link hover for instant navigation
  document.addEventListener('mouseover', (event) => {
    const link = event.target.closest('a');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = link.href;
      document.head.appendChild(prefetchLink);
    }
  });
  
  // 6. Optimize Cloudinary images for instant loading
  const optimizeCloudinaryImages = () => {
    const images = document.querySelectorAll('img[src*="cloudinary.com"]');
    images.forEach(img => {
      const src = img.src;
      if (src.includes('cloudinary.com') && !src.includes('f_webp')) {
        // Add WebP format and quality optimization
        const url = new URL(src);
        const pathParts = url.pathname.split('/');
        const versionIndex = pathParts.findIndex(part => part.startsWith('v'));
        
        if (versionIndex !== -1) {
          pathParts.splice(versionIndex + 1, 0, 'f_webp,q_auto:low,w_auto,h_auto,c_fill,g_auto');
          url.pathname = pathParts.join('/');
          img.src = url.toString();
        }
      }
    });
  };
  
  // Run Cloudinary optimization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeCloudinaryImages);
  } else {
    optimizeCloudinaryImages();
  }
  
  // 7. Preload critical API endpoints
  const apiEndpoints = [
    '/api/songs',
    '/api/praise-nights',
    '/api/categories'
  ];
  
  apiEndpoints.forEach(endpoint => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = endpoint;
    document.head.appendChild(link);
  });
  
  console.log('🚀 ULTRA FAST MODE INITIALIZED - APP IS NOW INSANELY FAST!');
})();
