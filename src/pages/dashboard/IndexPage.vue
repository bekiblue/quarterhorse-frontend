<template>
  <q-page class="dashboard-page">
    <div class="dashboard-container">
      <!-- Welcome Section -->
      <div class="welcome-section">
        <div class="welcome-content">
          <div class="welcome-avatar">
            {{ userInitials }}
          </div>
          <div class="welcome-text">
            <h1 class="welcome-title">Welcome back, {{ authStore.user?.first_name }}!</h1>
            <p class="welcome-subtitle">Here's what's happening with your tasks today.</p>
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <DashboardStatCard
          icon="task"
          :value="totalTasks"
          label="Total Tasks"
          variant-class="stat-card-total"
        />

        <DashboardStatCard
          icon="pending_actions"
          :value="activeTasks"
          label="Active Tasks"
          variant-class="stat-card-active"
        />

        <DashboardStatCard
          icon="check_circle"
          :value="completedTasks"
          label="Completed"
          variant-class="stat-card-completed"
        />

        <DashboardStatCard
          icon="trending_up"
          :value="completionRate + '%'"
          label="Completion Rate"
          variant-class="stat-card-progress"
        />
      </div>

      <!-- Quick Actions & Recent Tasks -->
      <div class="content-grid">
        <!-- Quick Actions -->
        <q-card class="action-card">
          <q-card-section>
            <div class="card-header">
              <h3 class="card-title">Quick Actions</h3>
            </div>
            <div class="action-buttons">
              <q-btn
                color="primary"
                icon="add_task"
                label="Add New Task"
                class="full-width action-btn"
                @click="navigateToTasks"
              />
              <q-btn
                flat
                color="primary"
                icon="list"
                label="View All Tasks"
                class="full-width action-btn"
                @click="navigateToTasks"
              />
              <q-btn
                v-if="tasksStore.completedTaskCount > 0"
                flat
                color="negative"
                icon="delete_sweep"
                label="Clear Completed"
                class="full-width action-btn"
                @click="handleClearCompleted"
                :disable="isLoading"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Recent Tasks -->
        <q-card class="tasks-card">
          <q-card-section>
            <div class="card-header">
              <h3 class="card-title">Recent Tasks</h3>
              <q-btn
                flat
                dense
                label="View All"
                color="primary"
                size="sm"
                @click="navigateToTasks"
              />
            </div>

            <div v-if="recentTasks.length === 0" class="empty-state">
              <q-icon name="task_alt" size="48px" color="grey-4" />
              <p class="empty-text">No tasks yet</p>
              <q-btn flat color="primary" label="Create your first task" @click="navigateToTasks" />
            </div>

            <div v-else class="tasks-content">
              <q-list class="tasks-list" separator>
                <TaskItem
                  v-for="task in recentTasks"
                  :key="task.entity_id"
                  :task="task"
                  :editing-task-id="editingTaskId"
                  @start-edit="handleStartEdit"
                  @cancel-edit="handleCancelEdit"
                  @save-edit="handleSaveEdit"
                  @toggle="handleToggleTask"
                  @delete="handleDeleteTask"
                />
              </q-list>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { useTasksStore } from 'stores/tasks'
import TaskItem from 'components/tasks/TaskItem.vue'
import DashboardStatCard from 'components/dashboard/DashboardStatCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const tasksStore = useTasksStore()

const isLoading = computed(() => tasksStore.loading)

const editingTaskId = ref(null)

const totalTasks = computed(() => tasksStore.tasks.length)
const activeTasks = computed(() => tasksStore.activeTaskCount)
const completedTasks = computed(() => tasksStore.completedTaskCount)
const completionRate = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

const recentTasks = computed(() => {
  return [...tasksStore.tasks]
    .sort((a, b) => {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
    .slice(0, 2)
})

const userInitials = computed(() => {
  const f = authStore.user?.first_name || ''
  const l = authStore.user?.last_name || ''
  const fi = f ? f[0].toUpperCase() : ''
  const li = l ? l[0].toUpperCase() : ''
  return fi + li || '?'
})

function navigateToTasks() {
  router.push('/tasks')
}

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
  await tasksStore.clearCompleted()
}

onMounted(async () => {
  if (tasksStore.tasks.length === 0) {
    await tasksStore.getTasks()
  }
})
</script>

<style scoped lang="scss">
@import '@/styles/pages/_DashboardPage';
@import '@/styles/pages/_TasksPage';
</style>
