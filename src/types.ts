
export type Horse = { id: number; name: string; color: string; condition: number }
export type RoundConfig = { round: number; distance: number; horses: number[] }
export type Finish = { horseId: number; timeMs: number }
export type RaceResult = { round: number; distance: number; finishes: Finish[] }
