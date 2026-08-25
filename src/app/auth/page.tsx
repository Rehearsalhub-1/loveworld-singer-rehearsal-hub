"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Eye, EyeOff, Loader2, ChevronDown, Search, Check, Building } from 'lucide-react'
import { ZONES, getZoneByInvitationCode } from '@/config/zones'

import { KingsChatAuthService } from '@/lib/kingschat-auth'
import { useAuth } from '@/hooks/useAuth'
import CustomLoader from '@/components/CustomLoader'
import { apiClient } from '@/lib/api-client'

// Helper function to convert Firebase errors to user-friendly messages
function sanitizeError(error: string): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const lower = error.toLowerCase();
  if (lower.includes('invalid credential') || lower.includes('invalid-credential') || lower.includes('invalid login')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lower.includes('user not found') || lower.includes('user-not-found') || lower.includes('no account found')) {
    return 'No account found with this email. Please check your email or create an account.';
  }
  if (lower.includes('password') && (lower.includes('incorrect') || lower.includes('wrong'))) {
    return 'Incorrect password. Please try again or reset your password.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lower.includes('too many') || lower.includes('rate limit')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }

  return error;
}

// Special senior HQ logins: allow name-based "email" that maps to internal emails
const SPECIAL_LOGIN_MAP: Record<string, { email: string }> = {
  // Senior HQ zones (have their own zones but are HQ groups, not necessarily HQ admins)
  'the president': { email: 'president@loveworldhq.org' },
  'the president 2': { email: 'thepresident2@loveworld.com' },
  'the director': { email: 'director@loveworldhq.org' },
  'pst daba': { email: 'oftp.daba@loveworldhq.org' },
  'pst bisola': { email: 'oftp.bisola@loveworldhq.org' },
  'pst rita': { email: 'oftp.rita@loveworldhq.org' },
}

function AuthPageContent() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCheckingAccount, setIsCheckingAccount] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'kingschat' | 'newPassword'>('email')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [verifiedKingschatId, setVerifiedKingschatId] = useState<string | null>(null)
  const [resetUserFirstName, setResetUserFirstName] = useState('')
  const [maskedKingschatId, setMaskedKingschatId] = useState('')
  const [isVerifyingKingschat, setIsVerifyingKingschat] = useState(false)
  const [zoneInvitationCode, setZoneInvitationCode] = useState('')
  const [zoneName, setZoneName] = useState<string | null>(null)
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false)
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')
  const [useManualZoneCode, setUseManualZoneCode] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    zoneCode: '',
    kingschatId: ''
  })
  const [isFetchingKingsChat, setIsFetchingKingsChat] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [multipleAccounts, setMultipleAccounts] = useState<any[]>([])
  const [pendingKingschatId, setPendingKingschatId] = useState('')
  const [pendingAccessToken, setPendingAccessToken] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')
  const [isRecoveredAccount, setIsRecoveredAccount] = useState(false)
  const [recoveredEmail, setRecoveredEmail] = useState('')

  // Auth store handles redirects

  // Check for URL parameters on mount (error, recovery)
  useEffect(() => {
    // Prefetch for instant login
    router.prefetch('/home')

    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    const urlMessage = urlParams.get('message')
    const recovered = urlParams.get('recovered')
    const email = urlParams.get('email')

    if (urlError && urlMessage) {
      setError(urlMessage)
    }

    if (recovered === 'true') {
      setIsRecoveredAccount(true)
      setIsLogin(false) // Switch to signup mode
      if (email) {
        setRecoveredEmail(decodeURIComponent(email))
        setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
      }
    }

    if (urlError || recovered) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Auth state observer
  // Transition when user is detected and context is ready
  useEffect(() => {
    if (user) {
      // Check for returnUrl or default to /home
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get('returnUrl')
      
      // Use router.replace for a cleaner transition
      router.replace(returnUrl || '/home')
    }
  }, [user, router])

  // Validate zone code when user types
  const handleZoneCodeChange = async (code: string) => {
    setFormData(prev => ({ ...prev, zoneCode: code }))
    setZoneInvitationCode(code)

    if (code.length >= 6) {
      // Get zone name from config
      const { getZoneByInvitationCode } = await import('@/config/zones')
      const zone = getZoneByInvitationCode(code)
      if (zone) {
        // Show special message for Central Admin zone
        if (zone.id === 'zone-boss') {
          setZoneName('Central Admin - Full Access to All Zones')
          setIsCoordinator(true) // Central Admin has elevated privileges
        } else {
          setZoneName(zone.name)
        }
        setError('')
      } else {
        setZoneName(null)
        setError('Invalid zone code')
      }
    } else {
      setZoneName(null)
      setError('')
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setSuccess('')
    setIsLoading(true)
    setIsCheckingAccount(true)

    try {
      if (!isLogin) {
        // Signup validation
        if (!formData.zoneCode || formData.zoneCode.length < 6) {
          setError('Please enter a valid zone code')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }
        // KingsChat ID is required during signup
        if (!formData.kingschatId || formData.kingschatId.trim().length === 0) {
          setError('Please enter your KingsChat ID or click the button to fetch it')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }
        // Birthday and profile image are optional - can be added later in profile
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        // Offline check
        if (typeof window !== 'undefined' && window.navigator && window.navigator.onLine === false) {
          setError('You appear to be offline. Please connect to the internet before creating your account.')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        // Validate zone code
        const { getZoneByInvitationCode, getZoneRole, isBossCode } = await import('@/config/zones')

        // Get zone (Boss code now returns Boss zone)
        const zone = getZoneByInvitationCode(formData.zoneCode)
        if (!zone) {
          setError('Invalid zone code. Please check and try again.')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        const isBoss = isBossCode(formData.zoneCode)

        // Determine role from code
        const role = getZoneRole(formData.zoneCode)

        setSuccess('Creating your account...')

        const result = await apiClient.post<{
          success: boolean
          data?: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }
          error?: string
        }>('/auth/register', {
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          zone_code: formData.zoneCode,
          kingschat_id: formData.kingschatId || undefined,
        })

        if (!result.success || !result.data) {
          setSuccess('');
          setError(sanitizeError(result.error || 'email-already-in-use'))
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        apiClient.setAccessToken(result.data.accessToken)
        setSuccess('Account created! Joining your zone...')

        if (zone) {
          setSuccess(`Welcome to ${zone.name || 'your zone'}! Redirecting...`)
        }

        if (typeof window !== 'undefined') {
          document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax"
          localStorage.setItem('lwsrh_has_user', 'true')
          
          const urlParams = new URLSearchParams(window.location.search)
          const returnUrl = urlParams.get('returnUrl') || '/home'
          window.location.href = returnUrl
        }
      } else {
        setSuccess('Signing in...');

        // Special name-based logins
        const rawIdentifier = formData.email.trim();
        const key = rawIdentifier.toLowerCase();
        const special = SPECIAL_LOGIN_MAP[key];

        const signInEmail = special ? special.email : formData.email;

        // API-based login
        const result = await apiClient.post<{
          success: boolean;
          data?: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } };
          error?: string;
        }>('/auth/login', { email: signInEmail, password: formData.password });

        if (!result.success || !result.data) {
          setSuccess('');
          setError(sanitizeError(result.error || 'invalid-credential'));
          setIsLoading(false);
          setIsCheckingAccount(false);
          return;
        }

        apiClient.setAccessToken(result.data.accessToken, result.data.refreshToken);
        if (result.data.user?.id) {
          apiClient.setUserId(result.data.user.id);
        }

        setSuccess('Login successful! Redirecting...');

        // Set persistence flags and cookie for Middleware
        if (typeof window !== 'undefined') {
          document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax";
          sessionStorage.setItem('justLoggedIn', 'true');
          localStorage.setItem('lwsrh_has_user', 'true');
          const { AUTH_CACHE_KEY } = require('@/config/routes');
          localStorage.setItem(AUTH_CACHE_KEY, 'true');
          
          // FORCED INSTANT REDIRECT
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('returnUrl') || '/home';
          window.location.href = returnUrl;
        }
        setIsLoading(false)
        setIsCheckingAccount(false)
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(sanitizeError(error.message || 'An error occurred during authentication'))
      setIsLoading(false)
      setIsCheckingAccount(false)
    } finally {
      if (isLogin) {
        setIsLoading(false)
        setIsCheckingAccount(false)
      }
    }
  }

  const handleAccountSelection = async (selectedProfile: any) => {
    setSelectedAccount(selectedProfile)
    setShowAccountSelector(false)
    setError('')

    if (pendingAccessToken && pendingKingschatId) {
      setIsLoading(true)
      setIsCheckingAccount(true)
      try {
        const tokenRes = await fetch('/api/auth/kingschat-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: pendingAccessToken,
            kingschatUserId: pendingKingschatId,
            email: selectedProfile.email
          })
        })

        const tokenData = await tokenRes.json()

        if (tokenData.success && tokenData.customToken) {
          // Exchange custom token for JWT
          const jwtResult = await apiClient.post<{
            success: boolean
            data?: { accessToken: string; refreshToken: string }
          }>('/auth/kingschat-login', {
            accessToken: pendingAccessToken,
            kingschatUserId: pendingKingschatId,
            email: selectedProfile.email
          })

          if (!jwtResult.success || !jwtResult.data) {
            throw new Error('Failed to generate secure login token')
          }

          apiClient.setAccessToken(jwtResult.data.accessToken)

          if (typeof window !== 'undefined') {
            document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax"
            localStorage.setItem('lwsrh_has_user', 'true')
            localStorage.setItem('userAuthenticated', 'true')
            localStorage.setItem('hasCompletedProfile', 'true')
            localStorage.setItem('authProvider', 'kingschat')
          }

          setSuccess('Login successful!')
          setIsLoading(false)
          setIsCheckingAccount(false)

          const urlParams = new URLSearchParams(window.location.search)
          const returnUrl = urlParams.get('returnUrl')
          router.push(returnUrl || '/home')
          return
        } else {
          throw new Error(tokenData.error || 'Failed to generate secure login token')
        }
      } catch (tokenErr: any) {
        console.error('KingsChat select account secure login error:', tokenErr)
        setShowPasswordPrompt(true)
        setAccountPassword('')
        setIsLoading(false)
        setIsCheckingAccount(false)
        setError(sanitizeError(tokenErr.message || 'Secure login failed. Please enter your password.'))
      }
    } else {
      setShowPasswordPrompt(true)
      setAccountPassword('')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setIsCheckingAccount(true)
    setError('')

    try {
      const signInEmail = selectedAccount.email

      // Sign in via API
      const signInResult = await apiClient.post<{
        success: boolean
        data?: { accessToken: string; refreshToken: string }
        error?: string
      }>('/auth/login', { email: signInEmail, password: accountPassword })

      if (!signInResult.success || !signInResult.data) {
        setError('Incorrect password. Please try again.')
        setIsLoading(false)
        setIsCheckingAccount(false)
        return
      }

      apiClient.setAccessToken(signInResult.data.accessToken)

      if (typeof window !== 'undefined') {
        document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax"
        localStorage.setItem('lwsrh_has_user', 'true')
        localStorage.setItem('userAuthenticated', 'true')
        localStorage.setItem('hasCompletedProfile', 'true')
        localStorage.setItem('authProvider', 'kingschat')
      }

      setShowPasswordPrompt(false)
      setIsLoading(false)
      setIsCheckingAccount(false)

      // Manual redirect accelerator
      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get('returnUrl')
      router.push(returnUrl || '/home')
    } catch (error: any) {
 console.error('Account selection error:', error)
      setError(sanitizeError('Failed to sign in with selected account. Please use email/password login.'))
      setIsLoading(false)
      setIsCheckingAccount(false)
      setShowAccountSelector(true) // Show modal again
    }
  }

  const handleFetchKingsChatId = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsFetchingKingsChat(true)
    setError('')

    try {
      // Initiate KingsChat OAuth flow
      const authTokens = await KingsChatAuthService.login()

      if (!authTokens) {
        setError('KingsChat login was cancelled. Please try again.')
        setIsFetchingKingsChat(false)
        return
      }

      // Extract KingsChat UID from token
      const { jwtDecode } = await import('jwt-decode')
      const decoded: any = jwtDecode(authTokens.accessToken)
      const kingschatUserId = decoded.userId || decoded.sub || decoded.id

      if (!kingschatUserId) {
        setError('Could not extract user ID from KingsChat')
        setIsFetchingKingsChat(false)
        return
      }

      // Fetch user profile details from V2 API
      const profile = await KingsChatAuthService.getUserProfile(authTokens.accessToken)
      console.log('KingsChat fetched profile payload:', profile)

      // Generate a secure, random password for them
      const generatedPassword = 'KC-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10).toUpperCase() + '!';

      // Set the KingsChat ID, profile details, and generated password in the form
      setFormData(prev => ({
        ...prev,
        kingschatId: kingschatUserId,
        firstName: profile?.firstName || prev.firstName,
        lastName: profile?.lastName || prev.lastName,
        email: profile?.email || prev.email,
        password: prev.password || generatedPassword,
        confirmPassword: prev.confirmPassword || generatedPassword
      }))

      setSuccess('KingsChat ID and profile fetched successfully!')
      setTimeout(() => setSuccess(''), 2000)

    } catch (error: any) {
 console.error('KingsChat fetch error:', error)
      setError(sanitizeError(error.message || 'Failed to fetch KingsChat ID'))
    } finally {
      setIsFetchingKingsChat(false)
    }
  }

  const handleSocialLogin = async (provider: string, e?: React.MouseEvent) => {
    // Prevent form submission
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setError('')
    setSuccess('')
    setIsLoading(true)
    setIsCheckingAccount(true)

    try {
      if (provider === 'kingschat') {
        setSuccess('Opening KingsChat login...')

        // Initiate KingsChat OAuth flow
        const authTokens = await KingsChatAuthService.login()

        if (!authTokens) {
          setError('KingsChat login was cancelled or failed. Please try again.')
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        setSuccess('KingsChat login successful! Setting up your account...')

        // Send the access token to the server API which verifies it with KingsChat
        // and extracts the real user ID (KingsChat tokens are NOT JWTs)
        const loginRes = await fetch('/api/auth/kingschat-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: authTokens.accessToken
          })
        })

        const loginResult = await loginRes.json()

        // 2. Handle the server response
        if (loginResult.success && loginResult.customToken) {
          // Legacy path — exchange via API
          const jwtResult = await apiClient.post<{
            success: boolean
            data?: { accessToken: string; refreshToken: string }
          }>('/auth/kingschat-login', { accessToken: authTokens.accessToken })

          if (!jwtResult.success || !jwtResult.data) {
            throw new Error('KingsChat login failed')
          }

          apiClient.setAccessToken(jwtResult.data.accessToken)

          if (typeof window !== 'undefined') {
            document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax"
            localStorage.setItem('lwsrh_has_user', 'true')
            localStorage.setItem('userAuthenticated', 'true')
            localStorage.setItem('hasCompletedProfile', 'true')
            localStorage.setItem('authProvider', 'kingschat')
          }

          setSuccess('Login successful!')
          setIsLoading(false)
          setIsCheckingAccount(false)

          const urlParams = new URLSearchParams(window.location.search)
          const returnUrl = urlParams.get('returnUrl')
          router.push(returnUrl || '/home')
          return
        }

        // Case: Multiple accounts found linked to this KingsChat ID
        if (loginResult.code === 'MULTIPLE_ACCOUNTS') {
          setMultipleAccounts(loginResult.accounts)
          setPendingKingschatId(loginResult.kingschatUserId)
          setPendingAccessToken(authTokens.accessToken)
          setShowAccountSelector(true)
          setIsLoading(false)
          setIsCheckingAccount(false)
          return
        }

        // Case: No account found (New User)
        if (loginResult.code === 'NO_ACCOUNT') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('kingschatUserId', loginResult.kingschatUserId)
            localStorage.setItem('kingschatAuthPending', 'true')
          }

          const profile = loginResult.profile
          const generatedPassword = 'KC-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10).toUpperCase() + '!';

          setIsLoading(false)
          setIsCheckingAccount(false)
          setIsLogin(false) // Switch to signup mode for NEW users only
          setSuccess('Please complete signup with your KingsChat account')

          // Pre-fill KingsChat ID, profile details, and generated password in the form
          setFormData(prev => ({
            ...prev,
            kingschatId: loginResult.kingschatUserId,
            firstName: profile?.firstName || prev.firstName,
            lastName: profile?.lastName || prev.lastName,
            email: profile?.email || prev.email,
            password: prev.password || generatedPassword,
            confirmPassword: prev.confirmPassword || generatedPassword
          }))
          return
        }

        throw new Error(loginResult.error || 'Authentication failed')
      }
    } catch (error: any) {
 console.error('Social login error:', error)
      setError(sanitizeError(error.message || 'An error occurred during social login'))
      setIsLoading(false)
      setIsCheckingAccount(false)
    } finally {
      if (provider === 'google') {
        setIsLoading(false)
        setIsCheckingAccount(false)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile image must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }

      setFormData(prev => ({
        ...prev,
        profileImage: file
      }))
      setError('')
    }
  }

  // Store the actual KingsChat ID from profile for verification
  const [storedKingschatIdForReset, setStoredKingschatIdForReset] = useState<string | null>(null)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (forgotPasswordStep === 'email') {
        if (!forgotPasswordEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
          setError('Please enter a valid email address')
          setIsLoading(false)
          return
        }

        // Lookup user profile client-side using existing Firebase client
        const profiles: any[] = []

        if (!profiles || profiles.length === 0) {
          setError('No account found with this email')
          setIsLoading(false)
          return
        }

        const profile = profiles[0] as any
        const kingschatId = profile.kingschat_id

        if (!kingschatId) {
          setError('This account does not have KingsChat linked. Please contact support.')
          setIsLoading(false)
          return
        }

        // Store user info and move to KingsChat verification step
        setResetUserFirstName(profile.first_name || '')
        setStoredKingschatIdForReset(kingschatId)
        // Mask the KingsChat ID for display
        const maskedId = kingschatId.length > 4
          ? '****' + kingschatId.slice(-4)
          : '****'
        setMaskedKingschatId(maskedId)
        setForgotPasswordStep('kingschat')

      } else if (forgotPasswordStep === 'newPassword') {
        if (!newPassword || newPassword.length < 6) {
          setError('Password must be at least 6 characters')
          setIsLoading(false)
          return
        }

        if (newPassword !== confirmNewPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }

        if (!verifiedKingschatId || !storedKingschatIdForReset) {
          setError('KingsChat verification required')
          setForgotPasswordStep('kingschat')
          setIsLoading(false)
          return
        }

        // Call API to reset password - send both IDs for server verification
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reset',
            email: forgotPasswordEmail.toLowerCase(),
            storedKingschatId: storedKingschatIdForReset,
            verifiedKingschatId: verifiedKingschatId,
            newPassword: newPassword
          })
        })

        const result = await response.json()

        if (!result.success) {
          setError(result.error || 'Failed to reset password')
          setIsLoading(false)
          return
        }

        setForgotPasswordSuccess(true)
      }
    } catch (error: any) {
 console.error('Forgot password error:', error)
      setError(sanitizeError(error.message || 'Failed to reset password'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle KingsChat verification for password reset
  const handleKingschatVerification = async () => {
    setError('')
    setIsVerifyingKingschat(true)

    try {
      // Initiate KingsChat OAuth flow
      const authTokens = await KingsChatAuthService.login()

      if (!authTokens) {
        setError('KingsChat verification was cancelled. Please try again.')
        setIsVerifyingKingschat(false)
        return
      }

      // Extract KingsChat UID from token
      const { jwtDecode } = await import('jwt-decode')
      const decoded: any = jwtDecode(authTokens.accessToken)
      const kingschatUserId = decoded.userId || decoded.sub || decoded.id

      if (!kingschatUserId) {
        setError('Could not verify KingsChat account')
        setIsVerifyingKingschat(false)
        return
      }

      // Store verified KingsChat ID and move to new password step
      setVerifiedKingschatId(kingschatUserId)
      setForgotPasswordStep('newPassword')

    } catch (error: any) {
 console.error('KingsChat verification error:', error)
      setError(sanitizeError(error.message || 'KingsChat verification failed'))
    } finally {
      setIsVerifyingKingschat(false)
    }
  }

  // If user is already authenticated, show loader while redirecting instead of blank page
  if (user) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
        <CustomLoader message="" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Dark Header Section */}
      <div className="bg-gray-900 px-8 py-12 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"></div>

        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-gray-600 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-gray-500 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-1/3 w-28 h-28 bg-gray-400 rounded-full blur-2xl"></div>
        </div>

        {/* Header Content */}
        <div className="relative z-10 text-center pt-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Join LoveWorld Singers
          </h1>
          <h1 className="text-2xl font-bold text-white mb-4">
            Rehearsal Hub
          </h1>
          <p className="text-gray-300 text-sm">
            Connect with fellow singers and access rehearsal resources
          </p>
        </div>
      </div>

      {/* White Form Section */}
      <div className="bg-white rounded-t-3xl -mt-8 relative z-20 px-8 py-8 min-h-[70vh]">
        {/* App Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="Loveworld Singers Rehearsal Hub"
              className="object-contain"
              style={{ width: '60px', height: '60px' }}
            />
          </div>
        </div>

        {/* Auth Form */}
        <div className="max-w-md mx-auto w-full">
          {/* Zone Detection Banner */}
          {!isLogin && zoneName && (
            <div className="mb-6 p-4 rounded-xl border-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-green-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">
                    Zone Detected
                  </p>
                  <p className="text-base font-bold text-green-700">
                    {zoneName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Recovery Message */}
          {isRecoveredAccount && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Account Recovered!
                  </p>
                  <p className="text-xs text-blue-700">
                    Your account was recovered but needs additional information. Please complete the signup form below with your <strong>Zone Code</strong> and <strong>KingsChat ID</strong> to finish setting up your account.
                  </p>
                  {recoveredEmail && (
                    <p className="text-xs text-blue-600 mt-2">
                      Email: <strong>{recoveredEmail}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-4">
              {!isLogin && (
                <>
                  {/* Zone Selector Dropdown */}
                  <div className="relative">
                    {!useManualZoneCode ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                          className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-left flex items-center justify-between text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Building className="w-4 h-4 text-purple-600 shrink-0" />
                            {zoneName ? (
                              <div className="truncate">
                                <span className="font-bold text-gray-900">{zoneName}</span>
                                <span className="text-xs text-purple-600 ml-2 font-mono font-bold">({formData.zoneCode})</span>
                              </div>
                            ) : (
                              <span className="text-gray-500 font-medium">Select Your Zone or HQ Group *</span>
                            )}
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isZoneDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsZoneDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="p-3 border-b border-gray-100 bg-gray-50/70">
                                <div className="relative">
                                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    placeholder="Search zone by name, region or code..."
                                    value={zoneSearchQuery}
                                    onChange={(e) => setZoneSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                </div>
                              </div>

                              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                {ZONES.filter(z => {
                                  if (!zoneSearchQuery.trim()) return true;
                                  const q = zoneSearchQuery.toLowerCase().trim();
                                  return z.name.toLowerCase().includes(q) ||
                                    (z.region && z.region.toLowerCase().includes(q)) ||
                                    (z.invitationCode && z.invitationCode.toLowerCase().includes(q));
                                }).length === 0 ? (
                                  <div className="p-4 text-center text-xs text-gray-500 font-medium">
                                    No zones found matching "{zoneSearchQuery}"
                                  </div>
                                ) : (
                                  ZONES.filter(z => {
                                    if (!zoneSearchQuery.trim()) return true;
                                    const q = zoneSearchQuery.toLowerCase().trim();
                                    return z.name.toLowerCase().includes(q) ||
                                      (z.region && z.region.toLowerCase().includes(q)) ||
                                      (z.invitationCode && z.invitationCode.toLowerCase().includes(q));
                                  }).map(z => {
                                    const isSelected = formData.zoneCode === z.invitationCode;
                                    return (
                                      <button
                                        key={z.id}
                                        type="button"
                                        onClick={() => {
                                          handleZoneCodeChange(z.invitationCode);
                                          setIsZoneDropdownOpen(false);
                                          setZoneSearchQuery('');
                                        }}
                                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                                            : 'hover:bg-purple-50 text-gray-800'
                                        }`}
                                      >
                                        <div className="truncate pr-2">
                                          <p className="font-bold truncate">{z.name}</p>
                                          <p className={`text-[10px] ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>
                                            {z.region} • <span className="font-mono">{z.invitationCode}</span>
                                          </p>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>

                              <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUseManualZoneCode(true);
                                    setIsZoneDropdownOpen(false);
                                  }}
                                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
                                >
                                  Have a custom invitation code? Enter manually
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            name="zoneCode"
                            placeholder="Enter Zone Code (e.g. BLWZN1)"
                            value={formData.zoneCode}
                            onChange={(e) => handleZoneCodeChange(e.target.value.toUpperCase())}
                            className="flex-1 px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm font-mono uppercase"
                            required
                            maxLength={10}
                          />
                          <button
                            type="button"
                            onClick={() => setUseManualZoneCode(false)}
                            className="px-3 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all shrink-0"
                          >
                            Browse List
                          </button>
                        </div>
                        {zoneName && (
                          <p className="text-xs text-green-600 mt-1 ml-1 font-bold">✓ {zoneName}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                      required
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                      required
                    />
                  </div>

                  {/* KingsChat ID Field with Fetch Button */}
                  <div className="relative">
                    {formData.kingschatId ? (
                      // Show verified badge when KingsChat ID is fetched
                      <div className="w-full px-4 py-4 bg-green-50 border-2 border-green-500 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-green-800 font-semibold text-sm">KingsChat Verified</p>
                            <p className="text-green-600 text-xs">Your account is linked</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, kingschatId: '' }))}
                          className="text-green-700 hover:text-green-900 text-xs underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          name="kingschatId"
                          placeholder="KingsChat ID (Required)"
                          value={formData.kingschatId}
                          onChange={handleInputChange}
                          className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm pr-24"
                          required
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={handleFetchKingsChatId}
                          disabled={isFetchingKingsChat}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {isFetchingKingsChat ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Fetch</span>
                            </>
                          ) : (
                            <>
                              <img
                                src="/kingschat.jpeg"
                                alt="KC"
                                className="w-3 h-3 rounded-full object-cover"
                              />
                              <span>Fetch</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              <input
                type="text"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                required
                pattern=".*"
                title="Enter your email address"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot Password Link - Only show for login */}
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {!isLogin && (
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl touch-target hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading && isLogin ? 'Signing In...' : isLoading && !isLogin ? 'Creating Account...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Only show KingsChat login button for login mode */}
          {isLogin && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={(e) => handleSocialLogin('kingschat', e)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && isCheckingAccount ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <img
                      src="/kingschat.jpeg"
                      alt="KingsChat"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  )}
                  {isLoading && isCheckingAccount ? 'Connecting...' : 'Continue with KingsChat'}
                </button>
              </div>
            </>
          )}

          {/* Toggle between Login and Signup */}
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
              }}
              className="text-gray-600 text-sm focus:outline-none focus:ring-0 focus:border-0 border-0 outline-none"
            >
              {isLogin ? "Don't Have Account? " : "Already have an account? "}
              <span className="text-purple-600 font-semibold">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-sm">
                {forgotPasswordStep === 'email'
                  ? 'Enter your email address to reset your password.'
                  : forgotPasswordStep === 'kingschat'
                    ? 'Verify your identity with KingsChat.'
                    : 'Create a new password for your account.'}
              </p>
            </div>

            {forgotPasswordSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset!</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordSuccess(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordStep('email')
                    setNewPassword('')
                    setConfirmNewPassword('')
                    setVerifiedKingschatId(null)
                    setStoredKingschatIdForReset(null)
                    setResetUserFirstName('')
                    setMaskedKingschatId('')
                  }}
                  className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Sign In Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotPasswordStep === 'email' && (
                  <div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                      required
                    />
                  </div>
                )}

                {forgotPasswordStep === 'kingschat' && (
                  <>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <p className="text-purple-700 text-sm mb-1">
                        Account found{resetUserFirstName ? ` for ${resetUserFirstName}` : ''}
                      </p>
                      <p className="text-purple-600 text-xs">
                        KingsChat ID: {maskedKingschatId}
                      </p>
                    </div>
                    <div className="text-center py-4">
                      <p className="text-gray-600 text-sm mb-4">
                        To verify your identity, please sign in with the KingsChat account linked to this email.
                      </p>
                      <button
                        type="button"
                        onClick={handleKingschatVerification}
                        disabled={isVerifyingKingschat}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifyingKingschat ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <img
                            src="/kingschat.jpeg"
                            alt="KingsChat"
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        {isVerifyingKingschat ? 'Verifying...' : 'Verify with KingsChat'}
                      </button>
                    </div>
                  </>
                )}

                {forgotPasswordStep === 'newPassword' && (
                  <>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-green-700 text-sm">
                         KingsChat verified for: <strong>{forgotPasswordEmail}</strong>
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New Password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm pr-12"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 text-sm"
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (forgotPasswordStep === 'newPassword') {
                        setForgotPasswordStep('kingschat')
                        setNewPassword('')
                        setConfirmNewPassword('')
                        setVerifiedKingschatId(null)
                        setError('')
                      } else if (forgotPasswordStep === 'kingschat') {
                        setForgotPasswordStep('email')
                        setResetUserFirstName('')
                        setMaskedKingschatId('')
                        setError('')
                      } else {
                        setShowForgotPassword(false)
                        setForgotPasswordEmail('')
                        setForgotPasswordStep('email')
                        setError('')
                      }
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    {forgotPasswordStep !== 'email' ? 'Back' : 'Cancel'}
                  </button>
                  {forgotPasswordStep !== 'kingschat' && (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {forgotPasswordStep === 'email' ? 'Continue' : 'Reset Password'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Account Selector Modal */}
      {showAccountSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <h3 className="text-xl font-bold text-white mb-2">Select Your Account</h3>
              <p className="text-purple-100 text-sm">
                Multiple accounts found with this KingsChat ID. Choose which one to sign in to:
              </p>
            </div>

            {/* Account List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {multipleAccounts.map((account: any, index: number) => (
                  <button
                    key={account.id || index}
                    onClick={() => handleAccountSelection(account)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(account.first_name?.[0] || account.email?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {account.first_name && account.last_name
                            ? `${account.first_name} ${account.last_name}`
                            : account.email || 'User'}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {account.email || 'No email'}
                        </p>
                        {account.zone && (
                          <p className="text-xs text-gray-500 mt-1">
                            Zone: {account.zone}
                          </p>
                        )}
                      </div>
                      <div className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAccountSelector(false)
                  setMultipleAccounts([])
                  setPendingKingschatId('')
                }}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordPrompt && selectedAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <h3 className="text-xl font-bold text-white mb-2">Enter Password</h3>
              <p className="text-purple-100 text-sm">
                Sign in to: {selectedAccount.first_name && selectedAccount.last_name
                  ? `${selectedAccount.first_name} ${selectedAccount.last_name}`
                  : selectedAccount.email}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the password you used when creating this account
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordPrompt(false)
                    setShowAccountSelector(true)
                    setAccountPassword('')
                    setError('')
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !accountPassword}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuthPage() {
  return <AuthPageContent />
}
