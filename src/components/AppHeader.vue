<template>
  <q-header
    elevated
    class="bg-primary text-white"
    style="box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);"
  >
    <q-toolbar
      style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-inline: 16px;
      "
    >
      <div style="display: flex; align-items: center; gap: 8px;">
        <q-btn
          v-if="authStore.isAuthenticated"
          flat
          dense
          round
          icon="menu"
          aria-label="Open navigation menu"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title
          style="
            font-weight: 600;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            font-size: 18px;
          "
        >
          Quarterhorse
        </q-toolbar-title>
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 12px; opacity: 0.8;">
          v{{ version }}
        </div>

        <div
          v-if="authStore.isAuthenticated"
          style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            padding: 6px 10px;
            border-radius: 999px;
            background-color: rgba(255, 255, 255, 0.08);
          "
        >
          <span style="font-size: 13px; opacity: 0.9;">Logged in as</span>
          <strong>{{ authStore.user.first_name }} {{ authStore.user.last_name }}</strong>
          <q-icon size="18px" name="arrow_drop_down" />

          <q-menu fit auto-close anchor="bottom right" self="top right">
            <q-list style="min-width: 150px;">
              <q-item clickable @click="router.push('/profile')">
                <q-item-section>Profile</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable @click="authStore.logout()">
                <q-item-section>Sign out</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
    </q-toolbar>
  </q-header>

  <q-drawer
    v-if="authStore.isAuthenticated"
    v-model="leftDrawerOpen"
    show-if-above
    bordered
    :width="250"
    style="border-right: 1px solid rgba(148, 163, 184, 0.3);"
  >
    <q-list padding>
      <q-item-label header style="font-size: 12px; text-transform: uppercase; color: #9ca3af;">
        Navigation
      </q-item-label>

      <EssentialLink
        v-for="link in linksList"
        :key="link.title"
        v-bind="link"
      />
    </q-list>
  </q-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import versionData from '@/version.json'
import EssentialLink from 'components/EssentialLink.vue'

const router = useRouter()

const linksList = [
  {
    title: 'Dashboard',
    icon: 'dashboard',
    link: '/dashboard',
  },
  {
    title: 'Tasks',
    icon: 'check_circle',
    link: '/tasks',
  },
  {
    title: 'Profile',
    icon: 'person',
    link: '/profile',
  },
]

const authStore = useAuthStore()
const version = versionData.version

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>