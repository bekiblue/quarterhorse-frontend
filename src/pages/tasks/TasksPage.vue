<template>
    <q-page class="tasks-page">
      <div class="tasks-container">
        <div class="tasks-header">
          <h1 class="tasks-title">todos</h1>
        </div>
  
        <div class="task-card">
          <!-- Input Section -->
          <TaskInput />
  
          <!-- Loading State -->
          <div v-if="isLoading && tasksStore.tasks.length === 0" class="state-wrapper">
            <q-spinner-dots size="50px" color="grey-4" />
            <p class="state-text">Loading your tasks...</p>
          </div>
  
          <!-- Empty State -->
          <div v-else-if="!isLoading && tasksStore.tasks.length === 0" class="state-wrapper">
            <q-icon name="task_alt" size="80px" color="grey-4" />
            <p class="state-text">No tasks yet</p>
            <p class="state-subtext">Add a task above and press Enter to get started.</p>
          </div>
  
          <!-- Tasks List -->
          <div v-else-if="tasksStore.tasks.length > 0" class="tasks-content">
            <q-list class="tasks-list" separator>
              <TaskItem
                v-for="task in tasksStore.filteredTasks"
                :key="getTaskId(task)"
                :task="task"
                :editing-task-id="editingTaskId"
                @start-edit="handleStartEdit"
                @cancel-edit="handleCancelEdit"
                @save-edit="handleSaveEdit"
                @toggle="handleToggleTask"
                @delete="handleDeleteTask"
              />
            </q-list>
  
            <!-- Footer -->
            <div class="tasks-footer">
              <div class="footer-left">
                <span class="task-count">
                  <strong>{{ tasksStore.activeTaskCount }}</strong>
                  {{ tasksStore.activeTaskCount === 1 ? 'task' : 'tasks' }} left
                </span>
              </div>
  
              <div class="footer-center">
                <q-btn-toggle
                  v-model="tasksStore.filter"
                  :options="[
                    { label: 'All', value: 'all' },
                    { label: 'Active', value: 'active' },
                    { label: 'Completed', value: 'completed' },
                  ]"
                  :disable="isLoading"
                  :ripple="false"
                  color="transparent"
                  text-color="grey-6"
                  class="filter-toggle"
                  flat
                />
              </div>
  
              <div class="footer-right">
                <q-btn
                  v-if="tasksStore.completedTaskCount > 0"
                  flat
                  dense
                  :disable="isLoading"
                  @click="handleClearCompleted"
                  class="clear-btn"
                >
                  Clear completed
                </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-page>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useTasksStore } from 'stores/tasks'
  import TaskInput from 'components/tasks/TaskInput.vue'
  import TaskItem from 'components/tasks/TaskItem.vue'
  
  const tasksStore = useTasksStore()
  
  const editingTaskId = ref(null)
  
  const isLoading = computed(() => tasksStore.loading)
  
  function getTaskId(task) {
    return task?.entity_id || null
  }
  
  async function handleToggleTask(taskId) {
    if (!taskId) {
      return
    }
  
    await tasksStore.toggleTaskComplete(taskId)
  }
  
  function handleStartEdit(task) {
    if (!task || !getTaskId(task)) {
      return
    }
  
    editingTaskId.value = getTaskId(task)
  }
  
  function handleCancelEdit() {
    editingTaskId.value = null
  }
  
  async function handleSaveEdit(taskId, title) {
    if (!taskId || !title) {
      return
    }
  
    const success = await tasksStore.updateTask(taskId, {
      title: title,
    })
  
    if (success) {
      editingTaskId.value = null
    }
  }
  
  async function handleDeleteTask(taskId) {
    if (!taskId) {
      return
    }
  
    await tasksStore.deleteTask(taskId)
  }
  
  async function handleClearCompleted() {
    if (tasksStore.completedTaskCount === 0) {
      return
    }
  
    await tasksStore.clearCompleted()
  }
  
  onMounted(async () => {
    if (tasksStore.tasks.length === 0) {
      await tasksStore.getTasks()
    }
  })
  </script>
  
  <style scoped lang="scss">
  @import '@/styles/pages/_TasksPage';
  </style>
  