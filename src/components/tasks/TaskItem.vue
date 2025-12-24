<template>
    <q-item
      :class="{
        'task-completed': task.completed,
        'task-editing': isEditing,
      }"
      class="task-item"
    >
      <!-- View Mode -->
      <template v-if="!isEditing">
        <q-item-section avatar class="checkbox-section">
          <div
            class="custom-checkbox"
            :class="{ 'is-checked': task.completed }"
            @click="handleToggle"
          >
            <q-icon v-if="task.completed" name="check" class="check-icon" />
          </div>
        </q-item-section>
  
        <q-item-section @dblclick="handleStartEdit">
          <q-item-label :class="{ 'task-title-completed': task.completed }" class="task-title">
            {{ task.title }}
          </q-item-label>
        </q-item-section>
  
        <q-item-section side class="delete-section">
          <q-icon name="delete" class="delete-icon" @click.stop="handleDelete" />
        </q-item-section>
      </template>
  
      <!-- Edit Mode -->
      <template v-else>
        <q-item-section avatar class="checkbox-section">
          <div
            class="custom-checkbox"
            :class="{ 'is-checked': task.completed }"
            @click="handleToggle"
          >
            <q-icon v-if="task.completed" name="check" class="check-icon" />
          </div>
        </q-item-section>
  
        <q-item-section class="edit-section">
          <q-input
            ref="editInputRef"
            v-model="editingTitle"
            dense
            autofocus
            @keyup.esc="handleCancel"
            @keyup.enter="handleSave"
            class="edit-input"
            borderless
          />
        </q-item-section>
      </template>
    </q-item>
  </template>
  
  <script setup>
  import { ref, computed, watch, nextTick } from 'vue'
  import { useTasksStore } from 'stores/tasks'
  
  const props = defineProps({
    task: {
      type: Object,
      required: true,
    },
    editingTaskId: {
      type: [String, Number],
      default: null,
    },
  })
  
  const emit = defineEmits(['start-edit', 'cancel-edit', 'save-edit', 'toggle', 'delete'])
  
  const tasksStore = useTasksStore()
  
  const editingTitle = ref('')
  const originalEditingTitle = ref('')
  const editInputRef = ref(null)
  
  const isEditing = computed(() => {
    return props.editingTaskId === getTaskId(props.task)
  })
  
  const hasEditChanged = computed(() => {
    if (!isEditing.value) return false
    return editingTitle.value.trim() !== originalEditingTitle.value.trim()
  })
  
  function getTaskId(task) {
    return task?.entity_id || null
  }
  
  function handleToggle() {
    const taskId = getTaskId(props.task)
    if (taskId) {
      emit('toggle', taskId)
    }
  }
  
  function handleStartEdit() {
    const taskId = getTaskId(props.task)
    if (!taskId) return
  
    editingTitle.value = props.task.title || ''
    originalEditingTitle.value = props.task.title || ''
    emit('start-edit', props.task)
  }
  
  function handleCancel() {
    editingTitle.value = ''
    originalEditingTitle.value = ''
    emit('cancel-edit')
  }
  
  function handleSave() {
    if (!hasEditChanged.value) {
      return
    }
  
    const trimmedTitle = editingTitle.value.trim()
  
    if (!trimmedTitle) {
      const taskId = getTaskId(props.task)
      if (taskId) {
        emit('delete', taskId)
      }
      return
    }
  
    if (trimmedTitle.length > 200) {
      tasksStore.showErrorNotification('Task title must be less than 200 characters')
      return
    }
  
    const taskId = getTaskId(props.task)
    emit('save-edit', taskId, trimmedTitle)
  }
  
  function handleDelete() {
    const taskId = getTaskId(props.task)
    if (taskId) {
      emit('delete', taskId)
    }
  }
  
  watch(
    () => props.editingTaskId,
    (newId) => {
      if (newId === getTaskId(props.task)) {
        editingTitle.value = props.task.title || ''
        originalEditingTitle.value = props.task.title || ''
        nextTick(() => {
          if (editInputRef.value) {
            const input = Array.isArray(editInputRef.value)
              ? editInputRef.value[0]
              : editInputRef.value
            if (input) {
              input.focus()
              input.select()
            }
          }
        })
      }
    },
  )
  </script>
  
  <style scoped lang="scss">
  @import '@/styles/pages/_TasksPage';
  </style>
  