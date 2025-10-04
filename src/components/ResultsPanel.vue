
<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
const store = useStore()
const results = computed(()=> store.state.results)
const horses = computed(()=> store.state.horses)
const nameOf = (id:number)=> horses.value.find(h=>h.id===id)?.name || `#${id}`
</script>

<template>
  <article>
    <h3>Sonuçlar</h3>
    <div class="results">
      <details v-for="r in results" :key="r.round">
        <summary>Round {{ r.round }} — {{ r.distance }} m</summary>
        <ol>
          <li v-for="f in r.finishes" :key="f.horseId">
            {{ nameOf(f.horseId) }} — {{ (f.timeMs/1000).toFixed(2) }} s
          </li>
        </ol>
      </details>
      <p v-if="!results.length"><em>Henüz sonuç yok.</em></p>
    </div>
  </article>
</template>
