<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <select v-if="type === 'select'" :id="id" v-model="model">
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    <input
      v-else
      :id="id"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      v-model="model"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  id:          { type: String, required: true },
  label:       { type: String, required: true },
  type:        { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  maxlength:   { type: Number, default: undefined },
  options:     { type: Array,  default: () => [] },
})

const model = defineModel()
</script>
