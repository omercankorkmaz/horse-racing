
<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
const store = useStore()
const schedule = computed(()=> store.state.schedule)
const horses = computed(()=> store.state.horses)
const nameOf = (id:number)=> horses.value.find(h=>h.id===id)?.name || `#${id}`
</script>

<template>
  <article v-if="schedule.length">
    <h3>Yarış Programı (6 Round)</h3>
    <table role="grid">
      <thead>
        <tr><th>Round</th><th>Mesafe (m)</th><th>Atlar</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in schedule" :key="r.round">
          <td>{{ r.round }}</td>
          <td>{{ r.distance }}</td>
          <td style="font-size:.9rem">
            <span v-for="id in r.horses" :key="id" style="margin-right:.5rem">{{ nameOf(id) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
