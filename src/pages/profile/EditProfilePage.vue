<template>
  <q-page
    style="
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 32px 16px;
      background: #f3f4f6;
    "
  >
    <q-card
      style="
        width: 100%;
        max-width: 520px;
        border-radius: 16px;
        padding: 24px 24px 28px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        position: relative;
      "
    >
      <!-- Edit icon in top-right -->
      <q-btn
        round
        dense
        flat
        icon="edit"
        color="primary"
        @click="startEditing"
        :disable="isEditing || !authStore.user"
        style="
          position: absolute;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          padding: 8px;
          z-index: 10;
        "
        class="edit-profile-btn"
      >
        <q-tooltip>Edit profile</q-tooltip>
      </q-btn>

      <q-card-section style="text-align: center; padding-bottom: 12px;">
        <!-- Avatar + Title -->
        <div
          style="
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          "
        >
          <div
            style="
              width: 64px;
              height: 64px;
              border-radius: 999px;
              background: linear-gradient(135deg, #4f46e5, #6366f1);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 28px;
              font-weight: 600;
              text-transform: uppercase;
            "
          >
            {{ initials }}
          </div>
          <div style="font-size: 22px; font-weight: 600; color: #111827;">
            Your Profile
          </div>
          <div style="font-size: 14px; color: #6b7280; max-width: 320px;">
            Keep your profile information up to date.
          </div>
        </div>
      </q-card-section>

      <q-card-section style="padding-top: 8px;">
        <q-form @submit.prevent="handleSubmit" style="width: 100%;">
          <!-- Form-level error -->
          <div
            v-if="formErrorMessage"
            style="
              margin-bottom: 12px;
              padding: 8px 12px;
              border-radius: 6px;
              background-color: #fef2f2;
              color: #b91c1c;
              font-size: 13px;
            "
          >
            {{ formErrorMessage }}
          </div>

          <!-- First Name Input -->
          <q-input
            v-model="firstName"
            type="text"
            label="First Name"
            outlined
            :rules="firstNameRules"
            :error="hasFirstNameError"
            :error-message="firstNameErrorMessage"
            :disable="!isEditing"
            style="margin-bottom: 16px;"
            autocomplete="given-name"
            @update:model-value="onFirstNameChange"
          />

          <!-- Last Name Input -->
          <q-input
            v-model="lastName"
            type="text"
            label="Last Name"
            outlined
            :rules="lastNameRules"
            :error="hasLastNameError"
            :error-message="lastNameErrorMessage"
            :disable="!isEditing"
            style="margin-bottom: 24px;"
            autocomplete="family-name"
            @update:model-value="onLastNameChange"
          />

          <div
            v-if="isEditing"
            style="
              display: flex;
              gap: 8px;
              margin-top: 4px;
            "
          >
            <q-btn
              label="Save"
              color="primary"
              type="submit"
              class="full-width"
              :loading="isSubmitting"
              :disable="!isFormValid || isSubmitting"
              style="height: 42px; font-weight: 600;"
            />
            <q-btn
              label="Cancel"
              color="grey-7"
              flat
              class="full-width"
              :disable="isSubmitting"
              style="height: 42px; font-weight: 500;"
              @click="cancelEdit"
            />
          </div>

          <!-- Navigation Link -->
          <div style="text-align: center; margin-top: 16px; font-size: 14px;">
            <router-link to="/dashboard" style="color: #3b82f6; text-decoration: none;">
              Back to Dashboard
            </router-link>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const firstName = ref('')
const lastName = ref('')

const initialFirstName = ref('')
const initialLastName = ref('')

const isSubmitting = ref(false)
const isEditing = ref(false)
const firstNameErrorMessage = ref('')
const lastNameErrorMessage = ref('')
const formErrorMessage = ref('')

const firstNameRules = [
  (val) => !!val || 'First name is required',
  (val) => (val && val.trim().length > 0) || 'First name cannot be empty',
  (val) => (val && val.trim().length <= 100) || 'First name must be less than 100 characters',
]

const lastNameRules = [
  (val) => !!val || 'Last name is required',
  (val) => (val && val.trim().length > 0) || 'Last name cannot be empty',
  (val) => (val && val.trim().length <= 100) || 'Last name must be less than 100 characters',
]

const hasFirstNameError = computed(() => !!firstNameErrorMessage.value)
const hasLastNameError = computed(() => !!lastNameErrorMessage.value)

const hasChanges = computed(() => {
  return (
    firstName.value.trim() !== initialFirstName.value.trim() ||
    lastName.value.trim() !== initialLastName.value.trim()
  )
})

const isFormValid = computed(() => {
  const firstValid = firstNameRules.every((rule) => rule(firstName.value) === true)
  const lastValid = lastNameRules.every((rule) => rule(lastName.value) === true)

  return (
    firstName.value.trim() !== '' &&
    lastName.value.trim() !== '' &&
    firstValid &&
    lastValid &&
    hasChanges.value
  )
})

const initials = computed(() => {
  const f = (firstName.value || authStore.user?.first_name || '').trim()
  const l = (lastName.value || authStore.user?.last_name || '').trim()
  const fi = f ? f[0].toUpperCase() : ''
  const li = l ? l[0].toUpperCase() : ''
  return (fi + li) || '?'
})

function clearFirstNameError() {
  firstNameErrorMessage.value = ''
}

function clearLastNameError() {
  lastNameErrorMessage.value = ''
}

function onFirstNameChange() {
  clearFirstNameError()
  formErrorMessage.value = ''
}

function onLastNameChange() {
  clearLastNameError()
  formErrorMessage.value = ''
}

function startEditing() {
  if (!authStore.user) return
  isEditing.value = true
  formErrorMessage.value = ''
}

function cancelEdit() {
  firstName.value = initialFirstName.value
  lastName.value = initialLastName.value
  clearFirstNameError()
  clearLastNameError()
  formErrorMessage.value = ''
  isEditing.value = false
}

function validateForm() {
  let isValid = true

  firstNameErrorMessage.value = ''
  lastNameErrorMessage.value = ''
  formErrorMessage.value = ''

  for (const rule of firstNameRules) {
    const result = rule(firstName.value)
    if (result !== true) {
      firstNameErrorMessage.value = result
      isValid = false
      break
    }
  }

  for (const rule of lastNameRules) {
    const result = rule(lastName.value)
    if (result !== true) {
      lastNameErrorMessage.value = result
      isValid = false
      break
    }
  }

  if (isValid && !hasChanges.value) {
    formErrorMessage.value = 'Please update at least one field before saving.'
    isValid = false
  }

  return isValid
}

async function handleSubmit() {
  if (!isEditing.value) {
    return
  }

  clearFirstNameError()
  clearLastNameError()
  formErrorMessage.value = ''

  if (!validateForm()) {
    return
  }

  if (!authStore.user) {
    router.push('/login')
    return
  }

  isSubmitting.value = true

  try {
    const success = await authStore.updateProfileInfo({
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
    })

    if (success) {
      initialFirstName.value = firstName.value.trim()
      initialLastName.value = lastName.value.trim()
      isEditing.value = false

    }
  } catch (error) {
    console.error('Profile update error:', error)
    formErrorMessage.value = 'Something went wrong while updating your profile. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (authStore.user) {
    const f = authStore.user.first_name || ''
    const l = authStore.user.last_name || ''
    firstName.value = f
    lastName.value = l
    initialFirstName.value = f
    initialLastName.value = l
    isEditing.value = false
  } else {
    router.push('/login')
  }
})
</script>