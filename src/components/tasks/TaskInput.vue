<template>
    <div class="input-section">
      <q-input
        v-model="newTaskTitle"
        placeholder="What needs to be done?"
        :disabled="isLoading"
        @keyup.enter="handleAddTask"
        class="task-input"
        borderless
      >
        <template v-slot:prepend>
          <q-icon
            :name="tasksStore.allTasksCompleted ? 'check' : 'expand_more'"
            :color="tasksStore.allTasksCompleted ? 'grey-7' : 'grey-5'"
            size="20px"
            class="toggle-all-icon"
            @click.stop="handleToggleAll"
            style="cursor: pointer"
          />
        </template>
      </q-input>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useTasksStore } from 'stores/tasks'
  
  const tasksStore = useTasksStore()
  
  const newTaskTitle = ref('')
  const isLoading = computed(() => tasksStore.loading)
  
  async function handleAddTask() {
    const trimmedTitle = newTaskTitle.value.trim()
  
    if (!trimmedTitle) {
      return
    }
  
    if (trimmedTitle.length > 200) {
      tasksStore.showErrorNotification('Task title must be less than 200 characters')
      return
    }
  
    const success = await tasksStore.addTask({
      title: trimmedTitle,
    })
  
    if (success) {
      newTaskTitle.value = ''
    }
  }
  
  async function handleToggleAll() {
    const shouldComplete = !tasksStore.allTasksCompleted
    await tasksStore.toggleAllTasks(shouldComplete)
  }
  </script>
  
  <style scoped lang="scss">
  @import '@/styles/pages/_TasksPage';
  </style>
  