<template>
  <div class="form-card success-box">
    <div class="success-icon">✓</div>
    <h2>Booking confirmed</h2>
    <p>Thank you — your reservation has been submitted successfully.</p>
    <div v-if="submissionId || elapsedLabel" class="submission-meta">
      <div v-if="submissionId">Reference: {{ submissionId }}</div>
      <div v-if="elapsedLabel">Timer stopped at {{ elapsedLabel }}</div>
      <div v-if="deviceType">Device: {{ deviceType }}</div>
    </div>
    <button class="btn" @click="$emit('reset')">Start again</button>
  </div>
</template>

<script setup>
defineProps({
  submissionId: { type: String, default: '' },
  elapsedLabel: { type: String, default: '' },
  deviceType: { type: String, default: '' },
})

defineEmits(['reset'])
</script>
