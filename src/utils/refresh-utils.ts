// Utility function for refreshing app data while preserving auth and zone state
export const handleAppRefresh = async () => {
  try {
    
    // Show user feedback
    if (typeof window !== 'undefined') {
      // Create a simple loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'refresh-loading-indicator';
      loadingDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: white;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="
            background: white;
            color: #333;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          ">
            <div style="
              width: 24px;
              height: 24px;
              border: 2px solid #e5e7eb;
              border-top: 2px solid #8b5cf6;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 12px;
            "></div>
            <div style="font-weight: 600; margin-bottom: 4px;">Refreshing App</div>
            <div style="font-size: 14px; color: #6b7280;">Fetching latest data...</div>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loadingDiv);
    }
    
    // Keys to ALWAYS preserve (auth, zone state, important user data)
    const keysToPreserve = [
      // Firebase/Auth
      'firebase',
      'auth',
      'session',
      'loveworld-singers-session',
      'firebase:',
      '__firebase',
      // Zustand stores - CRITICAL: preserve zone and auth state
      'lwsrh-zone-state',
      'lwsrh-auth-state',
      'currentZoneId',
      // Countdown persistence
      'server_target_date_',
      'countdown_hash_',
      // User preferences
      'theme',
      'language'
    ];
    
    // Only clear non-essential cache data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
                const shouldPreserve = keysToPreserve.some(preserve => 
          key.includes(preserve) || key.startsWith(preserve)
        );
        
        if (!shouldPreserve) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    
    // Instead of page reload, refresh data in Zustand stores
    try {
      // Dynamically import to avoid circular dependencies
      const { useZoneStore } = await import('@/stores/zoneStore');
      const { useAuthStore } = await import('@/stores/authStore');
      
      const { user } = useAuthStore.getState();
      if (user?.id && user?.email) {
        // Refresh zone data from server (without clearing state)
        await useZoneStore.getState().refreshZones(user.id, user.email);
      }
      
      // Remove loading indicator
      const loadingDiv = document.getElementById('refresh-loading-indicator');
      if (loadingDiv) {
        loadingDiv.remove();
      }
      
      // Show success message
      showRefreshSuccess();
      
    } catch (storeError) {
 console.warn('Could not refresh stores, falling back to page reload:', storeError);
      // Fallback to page reload if store refresh fails
      setTimeout(() => {
        const loadingDiv = document.getElementById('refresh-loading-indicator');
        if (loadingDiv) {
          loadingDiv.remove();
        }
        window.location.reload();
      }, 500);
    }
    
  } catch (error) {
 console.error(' Refresh error:', error);
    // Remove loading indicator
    const loadingDiv = document.getElementById('refresh-loading-indicator');
    if (loadingDiv) {
      loadingDiv.remove();
    }
    // Fallback to page reload
    window.location.reload();
  }
};

// Show a brief success toast
const showRefreshSuccess = () => {
  if (typeof window === 'undefined') return;
  
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: #10B981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      animation: slideUp 0.3s ease-out;
    ">
       App refreshed successfully!
    </div>
    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    </style>
  `;
  document.body.appendChild(toast);
  
  // Remove after 2 seconds
  setTimeout(() => {
    toast.remove();
  }, 2000);
};
