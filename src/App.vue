
<script lang="ts" setup>
import Controls from './components/Controls.vue'
import ScheduleTable from './components/ScheduleTable.vue'
import ResultsPanel from './components/ResultsPanel.vue'
import StraightRace from './components/StraightRace.vue'
import GeneratedHorses from './components/GeneratedHorses.vue'
</script>

<template>
  <main class="container" style="height: 100vh">
    <h1 style="height: 5vh">Horse Racing Game</h1>
    <div class="grid" style="height: 92vh">
      <aside style="height: 100%; overflow: auto;">
        <GeneratedHorses />
      </aside>
      <section style="height: 100%; overflow: auto;">
        <Controls />
        <StraightRace />
        <ScheduleTable style="margin-top:1rem;" />
      </section>
      <aside style="height: 100%; overflow: auto;">
        <ResultsPanel />
      </aside>
    </div>
  </main>
</template>
