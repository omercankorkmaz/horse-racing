
<script lang="ts" setup>
import Controls from './components/Controls.vue'
import ThreeRace from './components/ThreeRace.vue'
import HorseTrack from './components/HorseTrack.vue'
import ScheduleTable from './components/ScheduleTable.vue'
import ResultsPanel from './components/ResultsPanel.vue'
</script>

<template>
  <main class="container">
    <h1>Horse Racing Game</h1>
    <p>Vue 3 + TypeScript + Vuex + Pico.css + Three.js</p>
    <div class="grid">
      <section>
        <Controls />
        <ThreeRace style="margin-top:1rem;" />
        <HorseTrack style="margin-top:1rem;" />
        <ScheduleTable style="margin-top:1rem;" />
      </section>
      <aside>
        <ResultsPanel />
      </aside>
    </div>
  </main>
</template>
