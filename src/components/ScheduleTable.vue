<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
const store = useStore();
const schedule = computed(() => store.state.schedule);
const horses = computed(() => store.state.horses);
const colorOf = (id: number) => horses.value.find((h) => h.id === id)?.color;
</script>

<template>
  <article v-if="schedule.length">
    <main>
      <table role="grid">
        <thead>
          <tr>
            <th>Round</th>
            <th>Mesafe</th>
            <th>Atlar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in schedule" :key="r.round">
            <td>{{ r.round }}</td>
            <td>{{ r.distance }}m</td>
            <td style="font-size: 0.9rem">
              <span
                v-for="id in r.horses"
                :key="id"
                :style="{ 'margin-right': '.5rem', color: colorOf(id) }"
                >{{ id }}</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  </article>
</template>
