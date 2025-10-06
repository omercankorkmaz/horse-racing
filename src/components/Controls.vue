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
      <button data-testid="btn-generate" @click="generate">
        Generate Program
      </button>
      <button v-if="status !== 'running'" class="btn-start" @click="start">
        Start
      </button>
      <button
        v-else
        :class="paused ? 'btn-resume' : 'btn-pause'"
        :aria-pressed="paused ? 'false' : 'true'"
        @click="togglePause"
      >
        {{ paused ? 'Resume' : 'Pause' }}
      </button>
    </main>
  </article>
</template>

<style scoped>
.btn-start,
.btn-resume {
  background: #16a34a;
  color: #fff;
  border: 1px solid #15803d;
}
.btn-start:hover,
.btn-resume:hover {
  filter: brightness(0.95);
}

.btn-pause {
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;
}
.btn-pause:hover {
  filter: brightness(0.95);
}
</style>
