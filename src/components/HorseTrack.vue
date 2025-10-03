
<script lang="ts" setup>
import { computed, reactive, watch, nextTick } from 'vue'
import { useStore } from 'vuex'
const store = useStore()
const roundCfg = computed(()=> store.getters.currentRoundConfig)
const horses = computed(()=> store.state.horses)
const progress = reactive<Record<number, number>>({})
function colorOf(id:number) { return horses.value.find(h=>h.id===id)?.color || '#888' }
function nameOf(id:number) { return horses.value.find(h=>h.id===id)?.name || `#${id}` }
async function animateRound() {
  const rc = roundCfg.value
  if (!rc) return
  const ids = rc.horses.slice()
  ids.forEach(id=> progress[id]=0)
  await nextTick()
  requestAnimationFrame(()=>{
    ids.forEach(id=>{
      const el = document.getElementById(`horse-${id}`)
      if (el) {
        const cond = horses.value.find(h=>h.id===id)?.condition || 50
        const base = rc.distance / (14 + (cond/100)*2)
        const jitter = (Math.random()*0.8)
        const ms = (base + jitter) * 1000
        el.style.transitionDuration = `${Math.round(ms)}ms`
        el.style.transform = `translateX(calc(100% - 30px))`
      }
    })
  })
}
watch(()=> store.state.currentRound, ()=>{ animateRound() }, { immediate: true })
</script>

<template>
  <section v-if="roundCfg">
    <h3>2D Pist (Basit)</h3>
    <div v-for="id in roundCfg.horses" :key="id" class="track">
      <div class="flag"></div>
      <div class="horse" :id="`horse-${id}`" :style="{ background: colorOf(id) }" :title="nameOf(id)"></div>
    </div>
  </section>
</template>
