import { createStore } from 'vuex';
import type { Horse, RoundConfig, RaceResult } from '../types';
import { generateColors, pickN } from '../utils/random';

export type State = {
  horses: Horse[];
  schedule: RoundConfig[];
  currentRound: number;
  results: RaceResult[];
  status: 'idle' | 'scheduled' | 'running' | 'finished';
  paused: boolean;
};

const roundDistances = [1200, 1400, 1600, 1800, 2000, 2200];

function makeHorses(): Horse[] {
  const colors = generateColors(20);
  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Horse ${String(i + 1).padStart(2, '0')}`,
    color: colors[i],
    condition: 1 + Math.floor(Math.random() * 100),
  }));
}
function makeSchedule(horses: Horse[]): RoundConfig[] {
  const ids = horses.map((h) => h.id);
  return roundDistances.map((d, i) => {
    const ten = pickN(ids, 10).sort((a, b) => a - b);
    return { round: i + 1, distance: d, horses: ten };
  });
}

export const store = createStore<State>({
  state: (): State => ({
    horses: [],
    schedule: [],
    currentRound: 0,
    results: [],
    status: 'idle',
    paused: false,
  }),
  getters: {
    roundDistances: () => roundDistances,
    currentRoundConfig: (s) => s.schedule[s.currentRound] || null,
    lastResult: (s) => s.results[s.results.length - 1] || null,
  },
  mutations: {
    SET_HORSES(s, horses: Horse[]) {
      s.horses = horses;
    },
    SET_SCHEDULE(s, schedule: RoundConfig[]) {
      s.schedule = schedule;
      s.status = 'scheduled';
      s.results = [];
      s.currentRound = 0;
    },
    SET_STATUS(s, status: State['status']) {
      s.status = status;
    },
    APPEND_RESULT(s, res: RaceResult) {
      s.results.push(res);
    },
    ADVANCE_ROUND(s) {
      s.currentRound += 1;
    },
    SET_PAUSED(s, v: boolean) {
      s.paused = v;
    },
    ADD_RESULT(state, payload) {
      state.results.push(payload);
    },
    UPSERT_ROUND_RESULT(
      s,
      payload: {
        round: number;
        distance: number;
        finish: { horseId: number; timeMs: number };
      },
    ) {
      const { round, distance, finish } = payload;
      let rec = s.results.find(
        (r) => r.round === round && r.distance === distance,
      );
      if (!rec) {
        rec = { round, distance, finishes: [] };
        s.results.push(rec);
      }
      if (!rec.finishes.some((f) => f.horseId === finish.horseId)) {
        rec.finishes.push(finish);
        rec.finishes.sort((a, b) => a.timeMs - b.timeMs);
      }
    },
  },
  actions: {
    generate({ commit }) {
      const horses = makeHorses();
      commit('SET_HORSES', horses);
      const schedule = makeSchedule(horses);
      commit('SET_SCHEDULE', schedule);
    },
    start({ state, commit }) {
      if (state.status === 'scheduled' || state.status === 'running') {
        commit('SET_STATUS', 'running');
      }
    },
  },
});
