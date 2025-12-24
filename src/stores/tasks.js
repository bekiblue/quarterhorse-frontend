import { Notify } from 'quasar'
import { defineStore, acceptHMRUpdate } from 'pinia'

import axios from 'config/axios'

const FILTER_TYPES = {
  ALL: 'all',
  ACTIVE: 'active',
  COMPLETED: 'completed',
}

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    filter: FILTER_TYPES.ALL,
    loading: false,
  }),

  getters: {
    /**
     * Get filtered tasks based on current filter
     */
    filteredTasks(state) {
      switch (state.filter) {
        case FILTER_TYPES.ACTIVE:
          return state.tasks.filter((task) => !task.completed)
        case FILTER_TYPES.COMPLETED:
          return state.tasks.filter((task) => task.completed)
        case FILTER_TYPES.ALL:
        default:
          return state.tasks
      }
    },

    /**
     * Get count of active tasks
     */
    activeTaskCount(state) {
      return state.tasks.filter((task) => !task.completed).length
    },

    /**
     * Get count of completed tasks
     */
    completedTaskCount(state) {
      return state.tasks.filter((task) => task.completed).length
    },

    /**
     * Check if all tasks are completed
     */
    allTasksCompleted(state) {
      return state.tasks.length > 0 && state.tasks.every((task) => task.completed)
    },
  },

  actions: {
    /**
     * Show error notification
     */
    showErrorNotification(message = 'An unknown error occurred') {
      Notify.create({
        message,
        color: 'negative',
      })
    },

    /**
     * Show success notification
     */
    showSuccessNotification(message, timeout = 2000) {
      Notify.create({
        message,
        color: 'positive',
        position: 'top',
        timeout,
      })
    },

    /**
     * Handle API errors consistently
     */
    handleApiError(error, defaultMessage = 'An unknown error occurred') {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        defaultMessage
      this.showErrorNotification(message)
      return false
    },

    /**
     * Extract error message from API response
     */
    extractErrorMessage(response, defaultMessage) {
      return response.data?.message || defaultMessage
    },

    /**
     * Find task index by entity ID
     */
    findTaskIndex(taskId) {
      return this.tasks.findIndex((task) => task.entity_id === taskId)
    },

    /**
     * Validate task ID
     */
    validateTaskId(taskId) {
      if (!taskId || taskId === null || taskId === undefined || taskId === '') {
        this.showErrorNotification('Task ID is missing')
        return false
      }
      return true
    },

    /**
     * Update task in local state
     */
    updateTaskInState(taskId, updates) {
      const taskIndex = this.findTaskIndex(taskId)
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates }
        return true
      }
      return false
    },

    /**
     * Remove task from local state
     */
    removeTaskFromState(taskId) {
      const taskIndex = this.findTaskIndex(taskId)
      if (taskIndex !== -1) {
        this.tasks.splice(taskIndex, 1)
        return true
      }
      return false
    },

    /**
     * Fetch all tasks from the server
     */
    async getTasks() {
      this.loading = true
      try {
        const response = await axios.get('/task/')

        if (response.data?.success) {
          this.tasks = response.data.tasks || []
          return true
        } else {
          const errorMessage = this.extractErrorMessage(response, 'Failed to fetch tasks')
          this.showErrorNotification(errorMessage)
          return false
        }
      } catch (error) {
        return this.handleApiError(error, 'Failed to fetch tasks')
      } finally {
        this.loading = false
      }
    },

    /**
     * Add a new task
     */
    async addTask(payload) {
      try {
        // Validate payload
        if (!payload || typeof payload !== 'object') {
          this.showErrorNotification('Invalid task data')
          return false
        }

        const response = await axios.post('/task/', payload)

        if (response.data?.success) {
          this.showSuccessNotification(
            response.data?.message || 'Task added successfully!',
          )
          // Refetch tasks to ensure consistency with server state
          await this.getTasks()
          return true
        } else {
          const errorMessage = this.extractErrorMessage(response, 'Failed to add task')
          this.showErrorNotification(errorMessage)
          return false
        }
      } catch (error) {
        return this.handleApiError(error, 'Failed to add task')
      }
    },

    /**
     * Update an existing task
     */
    async updateTask(taskId, payload) {
      if (!this.validateTaskId(taskId)) {
        return false
      }

      try {
        // Validate payload
        if (!payload || typeof payload !== 'object') {
          this.showErrorNotification('Invalid task data')
          return false
        }

        const response = await axios.put(`/task/${taskId}`, payload)

        if (response.data?.success) {
          // Update local state optimistically
          this.updateTaskInState(taskId, payload)

          this.showSuccessNotification(
            response.data?.message || 'Task updated successfully!',
          )
          return true
        } else {
          const errorMessage = this.extractErrorMessage(response, 'Failed to update task')
          this.showErrorNotification(errorMessage)
          return false
        }
      } catch (error) {
        return this.handleApiError(error, 'Failed to update task')
      }
    },

    /**
     * Toggle task completion status
     */
    async toggleTaskComplete(taskId) {
      const task = this.tasks.find((t) => t.entity_id === taskId)

      if (!task) {
        this.showErrorNotification('Task not found')
        return false
      }

      return await this.updateTask(taskId, {
        completed: !task.completed,
      })
    },

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
      if (!this.validateTaskId(taskId)) {
        return false
      }

      try {
        const response = await axios.delete(`/task/${taskId}`)

        if (response.data?.success) {
          // Remove from local state optimistically
          this.removeTaskFromState(taskId)

          this.showSuccessNotification(
            response.data?.message || 'Task deleted successfully!',
          )
          return true
        } else {
          const errorMessage = this.extractErrorMessage(response, 'Failed to delete task')
          this.showErrorNotification(errorMessage)
          return false
        }
      } catch (error) {
        return this.handleApiError(error, 'Failed to delete task')
      }
    },

    /**
     * Set filter for task display
     */
    setFilter(filter) {
      if (Object.values(FILTER_TYPES).includes(filter)) {
        this.filter = filter
      } else {
        console.warn(`Invalid filter type: ${filter}. Using default: ${FILTER_TYPES.ALL}`)
        this.filter = FILTER_TYPES.ALL
      }
    },

    /**
     * Toggle all tasks completion status
     */
    async toggleAllTasks(completed) {
      const tasksToUpdate = this.tasks.filter((task) => task.completed !== completed)

      if (tasksToUpdate.length === 0) {
        return true
      }

      try {
        // Optimistically update local state
        tasksToUpdate.forEach((task) => {
          this.updateTaskInState(task.entity_id, { completed })
        })

        // Update all tasks on server
        const updatePromises = tasksToUpdate.map((task) =>
          axios.put(`/task/${task.entity_id}`, { completed }),
        )

        await Promise.all(updatePromises)

        // Refetch to ensure consistency
        await this.getTasks()

        this.showSuccessNotification(
          completed
            ? 'All tasks marked as completed!'
            : 'All tasks marked as active!',
        )
        return true
      } catch (error) {
        // Revert optimistic update on error
        await this.getTasks()
        return this.handleApiError(error, 'Failed to toggle all tasks')
      }
    },


    async clearCompleted() {
      const completedTasks = this.tasks.filter((task) => task.completed)

      if (completedTasks.length === 0) {
        return true
      }

      try {
        // Optimistically remove from local state
        const taskIds = completedTasks.map((task) => task.entity_id)
        taskIds.forEach((taskId) => {
          this.removeTaskFromState(taskId)
        })

        const deletePromises = completedTasks.map((task) =>
          axios.delete(`/task/${task.entity_id}`),
        )

        await Promise.all(deletePromises)

        // Refetch to ensure consistency
        await this.getTasks()

        this.showSuccessNotification(
          `Cleared ${completedTasks.length} completed task${completedTasks.length > 1 ? 's' : ''}!`,
        )
        return true
      } catch (error) {
        // Revert optimistic update on error
        await this.getTasks()
        return this.handleApiError(error, 'Failed to clear completed tasks')
      }
    },
  },
})

// Hot Module Replacement support
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTasksStore, import.meta.hot))
}
