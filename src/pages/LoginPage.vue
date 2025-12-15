<template>
  <q-page class="flex row flex-center">
    <q-card class="col-11 col-sm-8 col-md-6 col-lg-4 col-xl-3 q-pa-xs q-pa-md-sm q-mb-xl">
      <q-card-section>
        <div class="text-h6 text-center">Welcome to Rococo Sample</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="full-width">
          <!-- Email -->
          <q-input v-model="email" type="email" label="Email" outlined class="q-mb-lg" />

          <!-- Password -->
          <q-input
            v-model="password"
            type="password"
            label="Password"
            autocomplete="current-password"
            outlined
            class="q-mb-md"
          />

          <!-- Forgot Password Link -->
          <div class="text-right q-mb-md">
            <router-link to="/forgot-password">Forgot Password?</router-link>
          </div>

          <!-- Login Button -->
          <q-btn label="Login" color="primary" type="submit" class="full-width" />

          <!-- Divider (only show if OAuth is available) -->
          <div v-if="hasOAuthProviders" class="text-center q-my-md">
            <q-separator />
            <span class="text-caption q-px-md">or continue with</span>
            <q-separator />
          </div>

          <!-- OAuth Buttons (only show if providers are configured) -->
          <div v-if="hasOAuthProviders" class="row q-gutter-md">
            <div v-if="hasGoogleProvider" class="col">
              <q-btn
                label="Google"
                icon="img:https://developers.google.com/identity/images/g-logo.png"
                color="white"
                text-color="dark"
                outline
                class="full-width"
                :loading="googleLoading"
                @click="signInWithGoogle"
              />
            </div>
            <div v-if="hasMicrosoftProvider" class="col">
              <q-btn
                label="Microsoft"
                icon="img:https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg"
                color="white"
                text-color="dark"
                outline
                class="full-width"
                :loading="microsoftLoading"
                @click="signInWithMicrosoft"
              />
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="text-negative text-center q-mt-md">
            {{ errorMessage }}
          </div>

          <!-- Signup Link -->
          <div class="text-center q-mt-md">
            <span>Don't have an account? </span>
            <router-link to="/signup">Sign up</router-link>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
  
<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AuthService from 'src/services/auth.service'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const googleLoading = ref(false)
const microsoftLoading = ref(false)

// Check if OAuth providers are configured
const hasGoogleProvider = computed(() => {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID.trim() !== ''
})

const hasMicrosoftProvider = computed(() => {
  return import.meta.env.VITE_MICROSOFT_CLIENT_ID && import.meta.env.VITE_MICROSOFT_CLIENT_ID.trim() !== ''
})

const hasOAuthProviders = computed(() => {
  return hasGoogleProvider.value || hasMicrosoftProvider.value
})

// Placeholder login function
async function onSubmit() {
  // Implement actual login logic here
  await authStore.login({ email: email.value, password: password.value })
}

async function signInWithGoogle() {
  googleLoading.value = true
  errorMessage.value = ''
  try {
    await AuthService.signIn("google", authStore.invitationToken)
  } catch (error) {
    console.error('Google sign-in error:', error)
    errorMessage.value = 'Failed to sign in with Google. Please try again.'
  } finally {
    googleLoading.value = false
  }
}

async function signInWithMicrosoft() {
  microsoftLoading.value = true
  errorMessage.value = ''
  try {
    await AuthService.signIn("microsoft", authStore.invitationToken)
  } catch (error) {
    console.error('Microsoft sign-in error:', error)
    errorMessage.value = 'Failed to sign in with Microsoft. Please try again.'
  } finally {
    microsoftLoading.value = false
  }
}
</script>
  