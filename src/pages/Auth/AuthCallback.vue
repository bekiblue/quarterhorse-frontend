<template>
  <div class="flex flex-center full-height">
    <div class="text-center">
      <q-spinner-dots size="50px" color="primary" />
      <div class="text-h6 q-mt-md">Signing you in…</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { storeToRefs } from 'pinia'
import authService from 'src/services/auth.service'
import { Notify } from 'quasar'

const router = useRouter()
const authStore = useAuthStore()
const { oauthErrorMessage } = storeToRefs(authStore)

const hasProcessed = ref(false)

onMounted(async () => {
  if (hasProcessed.value) return
  hasProcessed.value = true
  
  try {
    // Check for access_denied error in URL params
    const urlParams = new URLSearchParams(globalThis.location.search)
    const error = urlParams.get('error')
    
    // Debug: Log all URL parameters
    console.log('OAuth Callback - URL Parameters:', Object.fromEntries(urlParams.entries()))
    
    if (error === 'access_denied') {
      // Redirect to login with error message
      router.push({
        path: '/login',
        query: { error: 'oauth_cancelled' }
      })
      return
    }
    
    let provider = await authService.getStateDataValue('provider')
    let stateInvitationToken = await authService.getStateDataValue('invitation_token', false)
    
    // Debug: Log provider and invitation token
    console.log('OAuth Callback - Provider:', provider)
    console.log('OAuth Callback - Invitation Token:', stateInvitationToken)
    
    // Prepare the request body with available fields
    const requestBody = {
      redirect_uri: globalThis.location.origin + '/auth/callback',
      code_verifier: await authService.getCodeVerifier(), // Get the code verifier from authService
      provider
    }
    
    // Include invitation token if present
    if (stateInvitationToken) {
      requestBody.invitation_token = stateInvitationToken
    }
    
    // Get the authorization code from URL params if available
    const code = urlParams.get('code')
    console.log('OAuth Callback - Authorization Code:', code)
    
    if (!code) {
      // No authorization code - this means the OAuth flow didn't complete properly
      console.error('OAuth Callback - No authorization code received')
      oauthErrorMessage.value = 'OAuth authentication failed: No authorization code received. Please try again.'
      router.push({
        path: '/login',
        query: { error: 'oauth_no_code' }
      })
      return
    }
    
    // Add code to request body
    requestBody.code = code
    
    // Debug: Log final request body
    console.log('OAuth Callback - Request Body:', requestBody)
    
    // Exchange tokens with Flask backend
    const result = await authStore.loginWithOAuth(provider, requestBody)
    
    if (result.success) {
      // OAuth login successful - clear invitation token and redirect to dashboard
      authStore.clearInvitationToken()
      authStore.clearOAuthErrorMessage()
      
      // Show success notification
      Notify.create({
        message: `Successfully signed in with ${provider}!`,
        color: 'positive',
        position: 'top',
        timeout: 3000,
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } else {
      // OAuth login failed - show error and redirect to login
      if (result.error) {
        oauthErrorMessage.value = result.error
      } else {
        oauthErrorMessage.value = `Failed to sign in with ${provider}. Please try again.`
      }
      
      router.push({
        path: '/login',
        query: { error: 'oauth_failed' }
      })
    }
    
  } catch (error) {
    console.error('Authentication callback error:', error)
    // Redirect to login on error
    router.push('/login')
  }
})
</script>
