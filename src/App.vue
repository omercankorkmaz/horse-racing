
<script lang="ts" setup>
import Controls from './components/Controls.vue'
import ThreeRace from './components/ThreeRace.vue'
import HorseTrack from './components/HorseTrack.vue'
import ScheduleTable from './components/ScheduleTable.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import StraightRace from './components/StraightRace.vue'
import GeneratedHorses from './components/GeneratedHorses.vue'
</script>

<template>
  <main class="container">
    <h1>Horse Racing Game</h1>
    <div class="grid">
      <aside>
        <GeneratedHorses />
      </aside>
      <section>
        <Controls />
        <ScheduleTable style="margin-top:1rem;" />
        <StraightRace />
      </section>
      <aside>
        <ResultsPanel />
      </aside>
    </div>
  </main>
</template>
