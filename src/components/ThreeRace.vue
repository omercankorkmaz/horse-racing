
<script lang="ts" setup>
import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue'
import { useStore } from 'vuex'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const container = ref<HTMLDivElement | null>(null)
const store = useStore()
const roundCfg = computed(()=> store.getters.currentRoundConfig)
const horses = computed(()=> store.state.horses)
const status = computed(()=> store.state.status)

let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let frameId = 0

let curve: THREE.Curve<THREE.Vector3>
let frames: { tangents: THREE.Vector3[], normals: THREE.Vector3[], binormals: THREE.Vector3[] }
const FRAME_SEGMENTS = 1000

let horseMeshes: Record<number, THREE.Object3D> = {}
let startTime = 0
let durations: Record<number, number> = {}
let finished: Set<number> = new Set()
let runningRound = -1

const loader = new GLTFLoader()
let baseHorse: THREE.Object3D | null = null

const MODEL_FWD = new THREE.Vector3(0,0,1)
const ROT_FIX = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0))

function colorOf(id:number){ return horses.value.find(h=>h.id===id)?.color || '#888' }

function buildOvalCurve(a=18, b=10, segments=400){
  const pts: THREE.Vector3[] = []
  for (let i=0;i<=segments;i++){
    const t = (i/segments) * Math.PI*2
    const x = a * Math.cos(t)
    const z = b * Math.sin(t)
    pts.push(new THREE.Vector3(x, 0, z))
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1)
}

function buildTrack(){
  curve = buildOvalCurve(18, 10, 400)
  // @ts-ignore
  frames = (curve as any).computeFrenetFrames(FRAME_SEGMENTS, true)

  const tube = new THREE.TubeGeometry(curve as any, 400, 0.15, 12, true)
  const mat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.2, roughness: 0.8 })
  const trackMesh = new THREE.Mesh(tube, mat)
  trackMesh.receiveShadow = true
  scene.add(trackMesh)

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x19331f })
  )
  ground.rotation.x = -Math.PI/2
  ground.receiveShadow = true
  scene.add(ground)
}

function addLights(){
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.5)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(15,20,10)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024,1024)
  scene.add(dir)
}

function initThree(){
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1020)

  const aspect = container.value!.clientWidth / Math.max(1, container.value!.clientHeight)
  camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200)
  camera.position.set(0, 15, 32)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  // @ts-ignore
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value!.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)
  controls.update()

  addLights()
  buildTrack()

  window.addEventListener('resize', onResize)
  animate()
}

function onResize(){
  if (!container.value) return
  camera.aspect = container.value.clientWidth / Math.max(1, container.value.clientHeight)
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
}

function clearRound(){
  Object.values(horseMeshes).forEach(m=> scene.remove(m))
  horseMeshes = {}
  durations = {}
  finished = new Set()
  runningRound = -1
}

function preloadHorse(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (baseHorse) return resolve()
    loader.load('src/models/horsek.glb', (gltf) => {
      baseHorse = gltf.scene
      baseHorse.traverse((c:any)=>{ if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      baseHorse.scale.set(0.8,0.8,0.8)
      resolve()
    }, undefined, reject)
  })
}

function getFrenet(t:number){
  const u = t * FRAME_SEGMENTS
  const i = Math.floor(u) % FRAME_SEGMENTS
  return {
    tangent: frames.tangents[i].clone(),
    normal: frames.normals[i].clone(),
    binormal: frames.binormals[i].clone()
  }
}

function spawnHorses(ids: number[]){
  clearRound()
  if (!baseHorse){
    const geom = new THREE.CapsuleGeometry(0.25, 0.7, 6, 12)
    ids.forEach((id, i)=>{
      const col = new THREE.Color(colorOf(id))
      const mat = new THREE.MeshStandardMaterial({ color: col })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.castShadow = true
      const lane = (i - ids.length/2) * 0.18
      const { binormal: B } = getFrenet(0)
      const pos0 = curve.getPoint(0).clone().add(B.multiplyScalar(lane))
      mesh.position.copy(pos0).add(new THREE.Vector3(0, 0.25, 0))
      scene.add(mesh)
      horseMeshes[id] = mesh
    })
    return
  }
  ids.forEach((id, i)=>{
    const horse = baseHorse!.clone(true)
    horse.traverse((c:any)=>{
      if (c.isMesh && c.material) {
        c.material = c.material.clone()
        if (c.material.color) {
          c.material.color = new THREE.Color(colorOf(id)).convertSRGBToLinear()
          c.material.needsUpdate = true
        }
      }
    })
    const lane = (i - ids.length/2) * 0.18
    const { binormal: B } = getFrenet(0)
    const pos0 = curve.getPoint(0).clone().add(B.multiplyScalar(lane))
    horse.position.copy(pos0).add(new THREE.Vector3(0, 0.25, 0))
    scene.add(horse)
    horseMeshes[id] = horse
  })
}

function computeDurations(distance: number, ids: number[]){
  ids.forEach(id=>{
    const cond = horses.value.find(h=>h.id===id)?.condition ?? 50
    const speed = Math.max(10, 14 + (cond/100)*2 + (Math.random()*1.2-0.6))
    const timeSec = distance / speed
    durations[id] = Math.round(timeSec * 1000)
  })
}

function animate(){
  frameId = requestAnimationFrame(animate)
  const now = performance.now()
  if (runningRound > 0 && roundCfg.value && status.value === 'running'){
    const ids = roundCfg.value.horses
    ids.forEach((id)=>{
      const m = horseMeshes[id]; if (!m) return
      const dur = durations[id] || 1
      const t = Math.min(1, (now - startTime) / dur)
      const { tangent: T, binormal: B } = getFrenet(t)
      const basePos = curve.getPoint(t)
      const laneOffset = ids.indexOf(id) * 0.06 - (ids.length*0.06)/2
      const finalPos = basePos.clone().add(B.multiplyScalar(laneOffset))
      m.position.copy(finalPos).add(new THREE.Vector3(0, 0.25, 0))

      const quatToTangent = new THREE.Quaternion().setFromUnitVectors(MODEL_FWD, T)
      quatToTangent.multiply(ROT_FIX)
      m.quaternion.slerp(quatToTangent, 0.35)

      if (t >= 1 && !finished.has(id)){
        finished.add(id)
        if (finished.size === ids.length){
          const finishes = ids.map(hid => ({ horseId: hid, timeMs: durations[hid] })).sort((a,b)=>a.timeMs-b.timeMs)
          store.commit('APPEND_RESULT', { round: roundCfg.value.round, distance: roundCfg.value.distance, finishes })
          store.commit('ADVANCE_ROUND')
          if (store.state.currentRound >= store.state.schedule.length){
            store.commit('SET_STATUS', 'finished')
          } else {
            const next = store.getters.currentRoundConfig
            spawnHorses(next.horses)
            computeDurations(next.distance, next.horses)
            startTime = performance.now()
            runningRound = next.round
          }
        }
      }
    })
  }
  controls.update()
  renderer.render(scene, camera)
}

async function startVisualRound(){
  if (!roundCfg.value) return
  await preloadHorse().catch(()=>{}) // ignore missing model, fallback available
  spawnHorses(roundCfg.value.horses)
  computeDurations(roundCfg.value.distance, roundCfg.value.horses)
  startTime = performance.now()
  runningRound = roundCfg.value.round
}

watch(()=> status.value, (nv)=>{ if (nv === 'running') startVisualRound() })
watch(()=> roundCfg.value?.round, ()=>{ if (status.value === 'running' && roundCfg.value) startVisualRound() })

onMounted(()=>{ initThree() })
onBeforeUnmount(()=>{
  cancelAnimationFrame(frameId)
  window.removeEventListener('resize', onResize)
  renderer?.dispose()
})
</script>

<template>
  <article>
    <header>
      <h3>3D Yarış Pisti (Three.js)</h3>
      <p>Fare ile döndür/zoom yap. Start'a bastığında atlar pistte koşar.</p>
    </header>
    <div ref="container" style="width:100%;height:420px;border-radius:12px;overflow:hidden;border:1px solid var(--pico-muted-border-color)"></div>
  </article>
</template>
