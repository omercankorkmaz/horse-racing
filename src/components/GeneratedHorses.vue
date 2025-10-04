<script lang="ts" setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const horses = computed(()=> store.state.horses)

// küçük bir condition sınıflayıcı (görsel ipucu)
function condBadge(c: number) {
  if (c >= 80) return 'success'
  if (c >= 60) return 'primary'
  if (c >= 40) return 'secondary'
  if (c >= 20) return 'warning'
  return 'contrast'
}
</script>

<template>
  <article>
    <header>
      <h3>Horse List</h3>
    </header>

    <div v-if="!horses.length" class="contrast" style="padding:.75rem;border-radius:.5rem;">
      Atlar henüz oluşturulmadı. <em>Generate</em> ile üret.
    </div>

    <table v-else role="grid">
      <thead>
        <tr>
          <th>Ad</th>
          <th style="width:140px;">Condition</th>
          <th style="width:160px;">Renk</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in horses" :key="h.id">
          <td>{{ h.name }}</td>
          <td>
            <span :class="condBadge(h.condition)" class="badge">
              {{ h.condition }}
            </span>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:.5rem;justify-content: center;">
              <span :style="{display:'inline-block',width:'20px',height:'20px',borderRadius:'4px',border:'1px solid var(--pico-muted-border-color)', background:h.color}"></span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
