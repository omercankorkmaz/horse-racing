
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
    <main style="display:flex; gap:.5rem; flex-wrap:wrap;">
      <button @click="generate" data-testid="btn-generate">Generate</button>
      <button @click="start" :disabled="status==='idle'" data-testid="btn-start">Start</button>
      <span style="margin-left:auto">Durum: <strong>{{ status }}</strong></span>
    </main>
  </article>
</template>
