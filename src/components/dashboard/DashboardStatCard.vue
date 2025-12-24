<template>
    <q-card :class="['stat-card', variantClass]">
      <q-card-section>
        <div class="stat-icon">
          <q-icon :name="icon" size="32px" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ value }}</div>
          <div class="stat-label">{{ label }}</div>
        </div>
      </q-card-section>
    </q-card>
  </template>
  
  <script setup>
  const { icon, value, label, variantClass } = defineProps({
    icon: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    variantClass: {
      type: String,
      default: '',
    },
  })
  </script>
  
  