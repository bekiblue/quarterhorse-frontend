<template>
  <q-page class="flex row flex-center">
    <q-card class="col-11 col-sm-8 col-md-6 col-lg-4 col-xl-3 q-pa-xs q-pa-md-sm q-mb-xl">
      <q-card-section>
        <div class="text-h6 text-center">Set password</div>
        <div class="text-subtitle2 text-center">
          Set a password for your account to gain access to your account.
        </div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="full-width">
          <!-- Password -->
          <q-input
            v-model="password"
            type="password"
            label="Password"
            outlined
            class="q-mb-lg"
            :rules="passwordRules"
          />

          <!-- Confirm Password -->
          <q-input
            v-model="passwordConfirm"
            type="password"
            label="Confirm password"
            outlined
            lazy-rules
            :rules="confirmPasswordRules"
            class="q-mb-lg"
          />

          <!-- Set password Button -->
          <q-btn label="Set password" color="primary" type="submit" class="full-width" />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
  
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const token = route.params.token
const uidb64 = route.params.uidb64

const password = ref('')
const passwordConfirm = ref('')

const passwordRules = [
  (v) => !!v || 'Password is required',
  (v) => v.length >= 8 || 'Min 8 characters',
]

const confirmPasswordRules = [(v) => v === password.value || 'Passwords do not match.']

onMounted(() => {
  console.log('mounted')
})
// Placeholder login function
async function onSubmit() {
  await authStore.setPassword(token, uidb64, {
    password: password.value,
  })
}
</script>
  