<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
const store = useStore();
const results = computed(() => store.state.results);
</script>

<template>
  <article>
    <h3>Sonuçlar</h3>
    <div class="results">
      <details v-for="r in results" :key="r.round" open>
        <summary>{{ r.distance }}m</summary>
        <ol style="padding-left: 0.25rem">
          <li v-for="f in r.finishes" :key="f.horseId">
            <span style="font-weight: 700">H{{ f.horseId }}:</span>
            {{ (f.timeMs / 1000).toFixed(2) }} s
          </li>
        </ol>
      </details>
      <p v-if="!results.length"><em>Henüz sonuç yok.</em></p>
    </div>
  </article>
</template>
