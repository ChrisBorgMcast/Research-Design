<template>
  <div class="container">
    <SuccessScreen
      v-if="submitted"
      :submission-id="submissionRecord?.id"
      :elapsed-label="submissionRecord?.elapsedLabel"
      :device-type="submissionRecord?.deviceType"
      @reset="reset"
    />

    <div v-else class="form-card">
      <div class="notice">
        Start the timer before booking so we can capture the time taken to complete the form.
      </div>

      <div class="timer-bar">
        <div>
          <div class="timer-label">Booking timer</div>
          <div class="timer-value">{{ elapsedLabel }}</div>
        </div>
        <button
          v-if="!timerRunning"
          type="button"
          class="timer-start"
          @click="startTimer"
        >
          Start timer
        </button>
        <div v-else class="timer-status">Running</div>
      </div>

      <div class="form-head">
        <h1>Book your stay</h1>
        <p>Fill in your details below to complete the reservation.</p>
      </div>

      <!-- Personal details -->
      <div class="section-label">Your details</div>
      <div class="row2">
        <FormField id="a-first" label="First name" v-model="form.firstName" placeholder="Jane" />
        <FormField id="a-last"  label="Last name"  v-model="form.lastName"  placeholder="Smith" />
      </div>
      <FormField id="a-email" label="Email address" type="email" v-model="form.email" placeholder="jane@example.com" />
      <FormField id="a-phone" label="Phone number"  type="tel"   v-model="form.phone" placeholder="+356 9900 0000" />

      <div class="divider" />

      <!-- Stay details -->
      <div class="section-label">Stay details</div>
      <div class="row2">
        <FormField id="a-checkin"  label="Check-in date"  type="date" v-model="form.checkIn" />
        <FormField id="a-checkout" label="Check-out date" type="date" v-model="form.checkOut" />
      </div>
      <div class="row2">
        <FormField id="a-guests" label="Guests" type="select" v-model="form.guests"
          :options="['1 guest','2 guests','3 guests','4+ guests']" />
        <FormField id="a-room" label="Room type" type="select" v-model="form.room"
          :options="['Standard','Deluxe','Suite']" />
      </div>

      <div class="divider" />

      <!-- Payment -->
      <div class="section-label">Payment</div>
      <FormField id="a-cardholder" label="Cardholder name" v-model="form.cardholder" placeholder="Jane Smith" />
      <div v-if="errors.cardholder" class="field-error">{{ errors.cardholder }}</div>
      <FormField id="a-cardnum"    label="Card number"     v-model="form.cardNumber"  placeholder="•••• •••• •••• ••••" :maxlength="19" />
      <div v-if="errors.cardNumber" class="field-error">{{ errors.cardNumber }}</div>
      <div class="row2">
        <div style="flex:1">
          <FormField id="a-expiry" label="Expiry date" v-model="form.expiry" placeholder="MM / YY" :maxlength="7" />
          <div v-if="errors.expiry" class="field-error">{{ errors.expiry }}</div>
        </div>
        <div style="flex:1">
          <FormField id="a-cvv"    label="CVV"         v-model="form.cvv"    placeholder="•••"     :maxlength="4" />
          <div v-if="errors.cvv" class="field-error">{{ errors.cvv }}</div>
        </div>
      </div>

      <button class="btn" @click="handleSubmit">Complete booking</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount, watch } from 'vue'
import FormField    from '../components/FormField.vue'
import SuccessScreen from '../components/SuccessScreen.vue'
import { detectDeviceType, formatElapsedTime, queueBookingSubmission } from '../utils/bookingStorage'

const submitted = ref(false)
const timerRunning = ref(false)
const elapsedSeconds = ref(0)
const timerStartedAt = ref(null)
const submissionRecord = ref(null)
let timerId = null

const form = reactive({
  firstName: '', lastName: '', email: '', phone: '',
  checkIn: '', checkOut: '', guests: '1 guest', room: 'Standard',
  cardholder: '', cardNumber: '', expiry: '', cvv: '',
})

const errors = reactive({ cardholder: '', cardNumber: '', expiry: '', cvv: '' })
const elapsedLabel = computed(() => formatElapsedTime(elapsedSeconds.value))

function tick() {
  if (timerStartedAt.value === null) return
  elapsedSeconds.value = Math.floor((Date.now() - timerStartedAt.value) / 1000)
}

function formatCardNumberInput(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiryInput(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + '/' + digits.slice(2)
}

watch(() => form.cardNumber, (v) => {
  const f = formatCardNumberInput(v)
  if (v !== f) form.cardNumber = f
})

watch(() => form.expiry, (v) => {
  const f = formatExpiryInput(v)
  if (v !== f) form.expiry = f
})

function startTimer() {
  if (timerRunning.value) return
  timerStartedAt.value = Date.now() - elapsedSeconds.value * 1000
  timerRunning.value = true
  tick()
  timerId = window.setInterval(tick, 1000)
}

function stopTimer() {
  if (!timerRunning.value) return
  tick()
  timerRunning.value = false
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function validateCardNumber(value) {
  const digits = (value || '').replace(/\D/g, '')
  if (!/^[0-9]{13,19}$/.test(digits)) return 'Enter a valid card number (13–19 digits)'
  let sum = 0; let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10)
    if (alt) { d = d * 2; if (d > 9) d -= 9 }
    sum += d; alt = !alt
  }
  if (sum % 10 !== 0) return 'Card number failed validation'
  return ''
}

function validateExpiry(value) {
  if (!value) return 'Enter expiry date'
  const m = value.match(/^(\s*\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/)
  if (!m) return 'Expiry must be MM/YY'
  const month = parseInt(m[1], 10)
  let year = parseInt(m[2], 10)
  if (month < 1 || month > 12) return 'Expiry month is invalid'
  if (year < 100) year += 2000
  const expDate = new Date(year, month, 1)
  const now = new Date()
  if (expDate <= new Date(now.getFullYear(), now.getMonth(), 1)) return 'Card expired'
  return ''
}

function validateCVV(value) {
  if (!value) return 'Enter CVV'
  if (!/^\d{3,4}$/.test((value || '').replace(/\s/g, ''))) return 'CVV must be 3 or 4 digits'
  return ''
}

function validateCardholder(value) {
  if (!value || !value.trim()) return 'Enter cardholder name'
  return ''
}

function handleSubmit() {
  errors.cardholder = validateCardholder(form.cardholder)
  errors.cardNumber = validateCardNumber(form.cardNumber)
  errors.expiry = validateExpiry(form.expiry)
  errors.cvv = validateCVV(form.cvv)

  const hasError = Object.values(errors).some(v => v)
  if (hasError) return

  if (!timerRunning.value && elapsedSeconds.value === 0) {
    startTimer()
  }

  stopTimer()
  submissionRecord.value = queueBookingSubmission({
    formType: 'Form A',
    elapsedSeconds: elapsedSeconds.value,
    deviceType: detectDeviceType(),
  })
  submitted.value = true
}

function reset() {
  submitted.value = false
  submissionRecord.value = null
  elapsedSeconds.value = 0
  timerStartedAt.value = null
  stopTimer()
  Object.keys(form).forEach(k => {
    form[k] = k === 'guests' ? '1 guest' : k === 'room' ? 'Standard' : ''
  })
}

onBeforeUnmount(() => {
  stopTimer()
})
</script>
