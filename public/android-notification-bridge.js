// Android Native Notification Bridge
// This script detects if running in Android WebView and intercepts notifications

(function() {
  'use strict';

  // Check if running in Android WebView
  const isAndroidWebView = typeof window.AndroidNotification !== 'undefined';
  
  if (!isAndroidWebView) {
    console.log('Not running in Android WebView - using standard web notifications');
    return;
  }

  console.log('Android WebView detected - bridging notifications to native');

  // Override web push notifications to use native Android notifications
  if ('Notification' in window) {
    const OriginalNotification = window.Notification;
    
    // Create proxy for Notification constructor
    window.Notification = function(title, options) {
      options = options || {};
      
      try {
        // Send to Android native notification
        window.AndroidNotification.showNotification(
          title || 'LWSRHP',
          options.body || '',
          options.icon || null,
          options.data?.url || null
        );
        
        console.log('Notification sent to Android:', { title, options });
        
        // Return a dummy notification object for compatibility
        return {
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {}
        };
      } catch (error) {
        console.error('Error sending notification to Android:', error);
        // Fallback to original
        return new OriginalNotification(title, options);
      }
    };
    
    // Copy static properties
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = function() {
      return Promise.resolve('granted');
    };
  }

  // Intercept service worker notifications
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, icon, url } = event.data;
        
        try {
          window.AndroidNotification.showNotification(
            title || 'LWSRHP',
            body || '',
            icon || null,
            url || null
          );
          console.log('Service worker notification sent to Android:', event.data);
        } catch (error) {
          console.error('Error sending SW notification to Android:', error);
        }
      }
    });
  }

  // Helper function for custom notifications from your app
  window.showNativeNotification = function(title, body, icon, url) {
    if (isAndroidWebView) {
      try {
        window.AndroidNotification.showNotification(title, body, icon || null, url || null);
        console.log('Custom notification sent to Android');
        return true;
      } catch (error) {
        console.error('Error showing native notification:', error);
        return false;
      }
    }
    return false;
  };

  // JSON version for complex data
  window.showNativeNotificationJson = function(data) {
    if (isAndroidWebView) {
      try {
        const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
        window.AndroidNotification.showNotificationJson(jsonString);
        console.log('JSON notification sent to Android');
        return true;
      } catch (error) {
        console.error('Error showing JSON notification:', error);
        return false;
      }
    }
    return false;
  };

  console.log('Android notification bridge initialized');
})();
