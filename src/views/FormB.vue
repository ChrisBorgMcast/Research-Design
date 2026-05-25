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

      <!-- Progress indicator -->
      <div class="progress-wrap">
        <div class="dots-row">
          <div
            v-for="(label, i) in stepLabels"
            :key="i"
            class="step-item"
          >
            <div
              class="step-dot"
              :class="{
                active: currentStep === i + 1,
                done:   currentStep > i + 1,
              }"
            >
              <span v-if="currentStep > i + 1">✓</span>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div v-if="i < stepLabels.length - 1"
              class="step-line"
              :class="{ done: currentStep > i + 1 }"
            />
          </div>
        </div>
        <div class="labels-row">
          <span v-for="(label, i) in stepLabels" :key="i">{{ label }}</span>
        </div>
      </div>

      <!-- Step 1: Personal details -->
      <Transition name="slide" mode="out-in">
        <div v-if="currentStep === 1" key="step1">
          <div class="form-head">
            <h1>Your details</h1>
            <p>Step 1 of 3 — Tell us who you are.</p>
          </div>
          <div class="row2">
            <FormField id="b-first" label="First name" v-model="form.firstName" placeholder="Jane" />
            <FormField id="b-last"  label="Last name"  v-model="form.lastName"  placeholder="Smith" />
          </div>
          <FormField id="b-email" label="Email address" type="email" v-model="form.email" placeholder="jane@example.com" />
          <FormField id="b-phone" label="Phone number"  type="tel"   v-model="form.phone" placeholder="+356 9900 0000" />
          <div class="step-nav">
            <button class="btn" @click="currentStep = 2">Continue →</button>
          </div>
        </div>

        <!-- Step 2: Stay details -->
        <div v-else-if="currentStep === 2" key="step2">
          <div class="form-head">
            <h1>Stay details</h1>
            <p>Step 2 of 3 — When are you visiting?</p>
          </div>
          <div class="row2">
            <FormField id="b-checkin"  label="Check-in date"  type="date" v-model="form.checkIn" />
            <FormField id="b-checkout" label="Check-out date" type="date" v-model="form.checkOut" />
          </div>
          <div class="row2">
            <FormField id="b-guests" label="Guests" type="select" v-model="form.guests"
              :options="['1 guest','2 guests','3 guests','4+ guests']" />
            <FormField id="b-room" label="Room type" type="select" v-model="form.room"
              :options="['Standard','Deluxe','Suite']" />
          </div>
          <div class="step-nav">
            <button class="btn btn-ghost" @click="currentStep = 1">← Back</button>
            <button class="btn" @click="currentStep = 3">Continue →</button>
          </div>
        </div>

        <!-- Step 3: Payment -->
        <div v-else-if="currentStep === 3" key="step3">
          <div class="form-head">
            <h1>Payment</h1>
            <p>Step 3 of 3 — Almost done!</p>
          </div>
          <FormField id="b-cardholder" label="Cardholder name" v-model="form.cardholder" placeholder="Jane Smith" />
          <div v-if="errors.cardholder" class="field-error">{{ errors.cardholder }}</div>
          <FormField id="b-cardnum"    label="Card number"     v-model="form.cardNumber"  placeholder="•••• •••• •••• ••••" :maxlength="19" />
          <div v-if="errors.cardNumber" class="field-error">{{ errors.cardNumber }}</div>
          <div class="row2">
            <div style="flex:1">
              <FormField id="b-expiry" label="Expiry date" v-model="form.expiry" placeholder="MM / YY" :maxlength="7" />
              <div v-if="errors.expiry" class="field-error">{{ errors.expiry }}</div>
            </div>
            <div style="flex:1">
              <FormField id="b-cvv"    label="CVV"         v-model="form.cvv"    placeholder="•••"     :maxlength="4" />
              <div v-if="errors.cvv" class="field-error">{{ errors.cvv }}</div>
            </div>
          </div>
          <div class="step-nav">
            <button class="btn btn-ghost" @click="currentStep = 2">← Back</button>
            <button class="btn" @click="handleSubmit">Complete booking</button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount, watch } from 'vue'
import FormField     from '../components/FormField.vue'
import SuccessScreen from '../components/SuccessScreen.vue'
import { detectDeviceType, formatElapsedTime, queueBookingSubmission } from '../utils/bookingStorage'

const currentStep = ref(1)
const submitted   = ref(false)
const timerRunning = ref(false)
const elapsedSeconds = ref(0)
const timerStartedAt = ref(null)
const submissionRecord = ref(null)
let timerId = null
const stepLabels  = ['Your details', 'Stay details', 'Payment']

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
  // Only validate length (13-19 digits). Formatting (spaces) is allowed.
  const digits = (value || '').replace(/\D/g, '')
  if (!/^[0-9]{13,19}$/.test(digits)) return 'Enter a valid card number (13–19 digits)'
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
    formType: 'Form B',
    elapsedSeconds: elapsedSeconds.value,
    deviceType: detectDeviceType(),
  })
  submitted.value = true
}

function reset() {
  submitted.value  = false
  currentStep.value = 1
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

<style scoped>
.progress-wrap { margin-bottom: 2rem; }

.dots-row {
  display: flex;
  align-items: center;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
}
.step-item:last-child { flex: 0; }

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  border: 2px solid var(--border);
  color: var(--muted);
  background: var(--card);
  transition: all .25s;
}
.step-dot.active { border-color: var(--accent); color: var(--accent); }
.step-dot.done   { border-color: var(--accent); background: var(--accent); color: #fff; }

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 6px;
  transition: background .25s;
}
.step-line.done { background: var(--accent); }

.labels-row {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.labels-row span {
  font-size: 10px;
  color: var(--muted);
  flex: 1;
  text-align: center;
}
.labels-row span:first-child { text-align: left; }
.labels-row span:last-child  { text-align: right; }

.step-nav {
  display: flex;
  gap: .75rem;
  margin-top: 1.5rem;
}

/* Step transition */
.slide-enter-active,
.slide-leave-active { transition: opacity .18s ease, transform .18s ease; }
.slide-enter-from   { opacity: 0; transform: translateX(16px); }
.slide-leave-to     { opacity: 0; transform: translateX(-16px); }
</style>
