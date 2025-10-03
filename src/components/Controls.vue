
<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
const store = useStore()
const status = computed(()=> store.state.status)
function generate() { store.dispatch('generate') }
function start() { store.dispatch('start') }
</script>

<template>
  <article>
    <header>
      <h3>Kontroller</h3>
      <p class="code">Round mesafeleri: [1200, 1400, 1600, 1800, 2000, 2200] m</p>
    </header>
    <footer style="display:flex; gap:.5rem; flex-wrap:wrap;">
      <button @click="generate" data-testid="btn-generate">Generate</button>
      <button @click="start" :disabled="status==='idle'" data-testid="btn-start">Start</button>
      <span style="margin-left:auto">Durum: <strong>{{ status }}</strong></span>
    </footer>
  </article>
</template>
