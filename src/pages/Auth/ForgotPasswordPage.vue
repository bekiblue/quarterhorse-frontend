<template>
  <q-page class="flex row flex-center">
    <!-- Success Dialog -->
    <q-dialog v-model="showSuccessDialog" persistent>
      <q-card class="q-pa-md" style="min-width: 350px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="check_circle" color="positive" size="48px" />
          <div class="text-h6 q-ml-md">Password Reset Email Sent</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <p class="text-body1">
            If an account exists with the email address <strong>{{ email }}</strong>, you will
            receive a password reset link shortly.
          </p>
          <p class="text-body2 q-mt-md text-grey-7">
            Please check your email inbox and follow the instructions to reset your password. The
            link will expire in 15 minutes.
          </p>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Close" color="primary" @click="navigateToLogin" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Main Form Card -->
    <q-card class="col-11 col-sm-8 col-md-6 col-lg-4 col-xl-3 q-pa-xs q-pa-md-sm q-mb-xl">
      <q-card-section>
        <div class="text-h6 text-center">Reset Your Password</div>
        <div class="text-subtitle2 text-center text-grey-7 q-mt-sm">
          Enter your email address and we'll send you a link to reset your password
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="handleSubmit" class="full-width">
          <!-- Email Input -->
          <q-input
            v-model="email"
            type="email"
            label="Email Address"
            outlined
            required
            :error="hasEmailError"
            :error-message="emailErrorMessage"
            class="q-mb-lg"
            autocomplete="email"
            aria-label="Email address" 
            @update:model-value="clearEmailError"
          />

          <!-- Submit Button -->
          <q-btn
            label="Send Reset Link"
            color="primary"
            type="submit"
            class="full-width"
            :loading="isSubmitting"
            :disable="!isFormValid"
          />

          <!-- Navigation Links -->
          <div class="text-center q-mt-md">
            <router-link to="/login" class="text-primary">Back to Login</router-link>
          </div>
          <div class="text-center q-mt-sm">
            <span class="text-grey-7">Don't have an account? </span>
            <router-link to="/signup" class="text-primary">Sign Up</router-link>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const isSubmitting = ref(false)
const showSuccessDialog = ref(false)
const emailErrorMessage = ref('')


const hasEmailError = computed(() => !!emailErrorMessage.value)

const isFormValid = computed(() => email.value.trim() !== '')

function clearEmailError() {
  emailErrorMessage.value = ''
}

async function handleSubmit() {
  clearEmailError()

  if (!isFormValid.value) {
    emailErrorMessage.value = 'Please enter a valid email address'
    return
  }

  isSubmitting.value = true

  try {
    const success = await authStore.requestPasswordReset(email.value.trim())

    if (success) {
      showSuccessDialog.value = true
    }
  } catch (error) {
    console.error('Password reset error:', error)
    emailErrorMessage.value = 'An error occurred. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

function navigateToLogin() {
  showSuccessDialog.value = false
  router.push('/login')
}
</script>
