<script lang="ts" setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const horses = computed(() => store.state.horses);
</script>

<template>
  <article>
    <header>
      <h3>Horse List</h3>
    </header>

    <div
      v-if="!horses.length"
      class="contrast"
      style="padding: 0.75rem; border-radius: 0.5rem"
    >
      Atlar henüz oluşturulmadı. <em>Generate</em> ile üret.
    </div>

    <table v-else role="grid">
      <thead>
        <tr>
          <th>Name</th>
          <th style="width: 140px">Cond.</th>
          <th style="width: 160px">Color</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in horses" :key="h.id">
          <td>H{{ h.id }}</td>
          <td>
            {{ h.condition }}
          </td>
          <td>
            <span
              :style="{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: '1px solid var(--pico-muted-border-color)',
                background: h.color,
              }"
            ></span>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
