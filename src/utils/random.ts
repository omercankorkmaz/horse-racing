
export function generateColors(n: number): string[] {
  const colors: string[] = []
  const golden = 0.618033988749895
  let h = Math.random()
  for (let i=0;i<n;i++) {
    h = (h + golden) % 1
    const s = 0.65, l = 0.55
    colors.push(hslToHex(h*360, s*100, l*100))
  }
  return colors
}
function hslToHex(h:number, s:number, l:number): string {
  s/=100; l/=100
  const k = (n:number)=>(n + h/30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n:number)=> l - a * max(-1, min(k(n)-3, min(9-k(n), 1)))
  const toHex = (x:number)=> Math.round(255*x).toString(16).padStart(2,'0')
  const max = Math.max, min = Math.min
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}
export function pickN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice(), out: T[] = []
  for (let i=0;i<n && copy.length;i++) { out.push(copy.splice(Math.floor(Math.random()*copy.length),1)[0]) }
  return out
}
