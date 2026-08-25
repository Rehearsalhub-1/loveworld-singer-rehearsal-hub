// Firebase Cloud Messaging Handler for Android WebView
// This script receives FCM token from native Android app

(function() {
  'use strict';
  
  // Store FCM token when received from Android
  window.handleFCMToken = function(token) {
    console.log('📱 FCM Token received from Android:', token);
    
    // Store in localStorage for later use
    localStorage.setItem('fcm_token_android', token);
    
    // Send to your backend/server if needed
    if (typeof sendTokenToBackend === 'function') {
      sendTokenToBackend(token);
    }
    
    // Dispatch event for other parts of your app to listen to
    window.dispatchEvent(new CustomEvent('fcmTokenReady', {
      detail: { token: token }
    }));
  };
  
  // Check if we already have a token stored
  const storedToken = localStorage.getItem('fcm_token_android');
  if (storedToken) {
    console.log('📱 Using stored FCM token:', storedToken);
    window.fcmToken = storedToken;
  }
  
  // Function to send token to your backend
  window.sendTokenToBackend = function(token) {
    // TODO: Implement your backend endpoint
    /*
    fetch('/api/save-fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        platform: 'android-webview'
      })
    }).then(response => {
      console.log('FCM token sent to backend');
    }).catch(error => {
      console.error('Error sending FCM token:', error);
    });
    */
  };
  
  console.log('📱 FCM Handler initialized for Android WebView');
})();
