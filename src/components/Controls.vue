<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
const store = useStore();
const status = computed(() => store.state.status);
const paused = computed(() => store.state.paused);

function generate() {
  store.dispatch('generate');
}
function start() {
  store.dispatch('start');
}
function togglePause() {
  store.commit('SET_PAUSED', !paused.value);
}
</script>

<template>
  <article>
    <main style="display: flex; gap: 0.5rem; flex-wrap: wrap">
      <button data-testid="btn-generate" @click="generate">Generate</button>
      <button v-if="status !== 'running'" @click="start">Start</button>
      <button v-else class="secondary" @click="togglePause">
        {{ paused ? 'Resume' : 'Pause' }}
      </button>
      <span style="margin-left: auto"
        >Durum: <strong>{{ status }}</strong></span
      >
    </main>
  </article>
</template>
