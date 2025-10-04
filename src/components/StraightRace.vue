<script lang="ts" setup>
import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue'
import { useStore } from 'vuex'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'


const container = ref<HTMLDivElement | null>(null)
const store = useStore()
const roundCfg = computed(()=> store.getters.currentRoundConfig)
const horses = computed(()=> store.state.horses)
const status = computed(()=> store.state.status)

let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let frameId = 0

// düz pist parametreleri
const TRACK_LEN = 40
const START_X = -TRACK_LEN/2
const END_X   =  TRACK_LEN/2
const LANE_GAP = 0.7

let horseObjs: Record<number, THREE.Object3D> = {}
let startTime = 0
let durations: Record<number, number> = {}
let finished: Set<number> = new Set()
let runningRound = -1

// GLTF model + kapsül fallback
const loader = new GLTFLoader()
let baseHorse: THREE.Object3D | null = null

// MODEL İLERİ EKSENİ: şu an model "bize" bakıyordu => genelde -Z.
// Bunu +X'e döndüreceğiz ki soldan sağa baksın.
const MODEL_FWD = new THREE.Vector3(0,0,-1)
const ROT_FIX = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI/2, 0))

// ───────────────────────── helpers
function addLights(){
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.6)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(12,18,10)
  dir.castShadow = true
  dir.shadow.mapSize.set(1024,1024)
  scene.add(dir)
}

function buildStraightTrack(lanes: number){
  // zemin (y=0 düzleminde)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, Math.max(8, lanes*LANE_GAP*3)),
    new THREE.MeshStandardMaterial({ color: 0x14301a })
  )
  ground.rotation.x = -Math.PI/2
  ground.receiveShadow = true
  // @ts-ignore
  ground.keep = true
  scene.add(ground)

  // yol
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_LEN+4, Math.max(2.4, lanes*LANE_GAP+0.6)),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  )
  road.rotation.x = -Math.PI/2
  road.position.y = 0.01
  road.receiveShadow = true
  // @ts-ignore
  road.keep = true
  scene.add(road)

  // şerit çizgileri
  const linesMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  for (let li=0; li<=lanes; li++){
    const z = ((li - lanes/2) * LANE_GAP)
    const line = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_LEN+4, 0.03), linesMat)
    line.rotation.x = -Math.PI/2
    line.position.set(0, 0.015, z)
    // @ts-ignore
    line.keep = true
    scene.add(line)
  }

  // start/finish barları
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const startBar = new THREE.Mesh(new THREE.PlaneGeometry(0.2, lanes*LANE_GAP), barMat)
  startBar.rotation.x = -Math.PI/2
  startBar.position.set(START_X, 0.02, 0)
  // @ts-ignore
  startBar.keep = true
  scene.add(startBar)

  const finBar = new THREE.Mesh(new THREE.PlaneGeometry(0.2, lanes*LANE_GAP), barMat)
  finBar.rotation.x = -Math.PI/2
  finBar.position.set(END_X, 0.02, 0)
  // @ts-ignore
  finBar.keep = true
  scene.add(finBar)

  
  // 🟩 yeşil start bayrağı
  const flagMatStart = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  const flagGeo = new THREE.PlaneGeometry(.5, 1)
  const flagStart = new THREE.Mesh(flagGeo, flagMatStart)
  flagStart.position.set(START_X, 0.8, (lanes * LANE_GAP) / 2 + 0.2)
//   flagStart.rotation.y = Math.PI / 2  // kenardan baksın
  scene.add(flagStart)

  // 🟥 kırmızı finish bayrağı
  const flagMatEnd = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  const flagEnd = new THREE.Mesh(flagGeo, flagMatEnd)
  flagEnd.position.set(END_X, 0.8, (lanes * LANE_GAP) / 2 + 0.2)
//   flagEnd.rotation.y = -Math.PI / 2
  scene.add(flagEnd)

  // istersen direk ekle:
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 })

  const poleStart = new THREE.Mesh(poleGeo, poleMat)
  poleStart.position.set(START_X, 0.6, (lanes * LANE_GAP) / 2)
  scene.add(poleStart)

  const poleEnd = new THREE.Mesh(poleGeo, poleMat)
  poleEnd.position.set(END_X, 0.6, (lanes * LANE_GAP) / 2)
  scene.add(poleEnd)
}

// Modeli piste “oturtmak” için bounding box’a göre Y ayarı
const _box = new THREE.Box3()
function setOnGround(obj: THREE.Object3D, yPad = 0.01) {
  _box.setFromObject(obj)
  const lift = -_box.min.y + yPad // tabanı y=0’a getir
  obj.position.y = lift
}

// Label ekle (sadece sayı)
function attachLabel(target: THREE.Object3D, numText: string){
  const div = document.createElement('div')
  div.textContent = numText          // ← "20" gibi
  div.style.padding = '2px 6px'
  div.style.borderRadius = '6px'
  div.style.background = 'rgba(0,0,0,.55)'
  div.style.color = '#fff'
  div.style.fontSize = '12px'
  div.style.whiteSpace = 'nowrap'
  div.style.backdropFilter = 'blur(2px)'

  // label yüksekliğini modele göre ayarlayalım:
  _box.setFromObject(target)
  const h = Math.max(0.8, _box.max.y - _box.min.y)
  const label = new CSS2DObject(div)
  label.position.set(0, h + 0.15, 0) // başın biraz üstü
  target.add(label)
}

function initThree(){
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1020)

  const aspect = container.value!.clientWidth / Math.max(1, container.value!.clientHeight)
  camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200)
  camera.position.set(0, 12, 26)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  // @ts-ignore
  renderer.outputColorSpace = THREE.SRGBColorSpace

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'

  container.value!.appendChild(renderer.domElement)
  container.value!.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)
  controls.update()

  addLights()
  buildStraightTrack( (roundCfg.value?.horses.length ?? 10) )

  window.addEventListener('resize', onResize)
  animate()
}

function onResize(){
  if (!container.value) return
  const w = container.value.clientWidth
  const h = Math.max(1, container.value.clientHeight)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  labelRenderer.setSize(w, h)
}

function clearRound(){
  // önce etiketleri sök
  Object.values(horseObjs).forEach(o => removeLabelsFrom(o))

  // sonra atları sahneden kaldır
  Object.values(horseObjs).forEach(o => scene.remove(o))

  horseObjs = {}
  durations = {}
  finished = new Set()
  runningRound = -1

  // tüm sahneyi süpür (olası sızan etiketler için)
  removeAllSceneLabels(scene, labelRenderer)
}

function preloadHorse(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (baseHorse) return resolve()
    loader.load('src/models/animated-horse-1k.glb', (gltf) => {
        console.log(gltf)
      baseHorse = gltf.scene
      baseHorse.traverse((c:any)=>{ if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      baseHorse.scale.set(0.075,0.075,0.075)
      resolve()
    }, undefined, reject)
  })
}

function spawnHorses(ids: number[]){
  clearRound()
  const lanes = ids.length

  // zemin/çizgiler dursun
  scene.children = scene.children.filter((obj:any)=> obj.keep === true)
  addLights()

  if (!baseHorse){
    // Fallback: kapsül (tek renk), yere oturt
    const geom = new THREE.CapsuleGeometry(0.25, 0.7, 6, 12)
    const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd })
    ids.forEach((id, i)=>{
      const mesh = new THREE.Mesh(geom, mat)
      mesh.castShadow = true
      const z = (i - (lanes-1)/2) * LANE_GAP
      mesh.position.set(START_X, 0, z)
      setOnGround(mesh)                 // ← yere tam otur
      scene.add(mesh)
      attachLabel(mesh, String(id))     // ← sadece sayı
      horseObjs[id] = mesh
    })
    return
  }

  ids.forEach((id, i)=>{
    const horse = baseHorse!.clone(true)
    const z = (i - (lanes-1)/2) * LANE_GAP
    horse.position.set(START_X, 0, z)
    setOnGround(horse)                  // ← yere tam otur
    scene.add(horse)
    attachLabel(horse, String(id))      // ← sadece sayı
    horseObjs[id] = horse
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
      const obj = horseObjs[id]; if (!obj) return
      const dur = durations[id] || 1
      const t = Math.min(1, (now - startTime) / dur)
      const x = THREE.MathUtils.lerp(START_X, END_X, t)
      obj.position.x = x

      // SAĞA BAK: (MODEL_FWD -> +X)
      const quatToX = new THREE.Quaternion().setFromUnitVectors(MODEL_FWD, new THREE.Vector3(1,0,0))
      quatToX.multiply(ROT_FIX)
      obj.quaternion.slerp(quatToX, 0.35)

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
            removeAllSceneLabels(scene, labelRenderer)  // eski etiketleri yok et
            Object.values(horseObjs).forEach(o => scene.remove(o)) // eski atları da temizle
            horseObjs = {}
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
  labelRenderer.render(scene, camera)
}

async function startVisualRound(){
  if (!roundCfg.value) return
  await preloadHorse().catch(()=>{}) // model yoksa kapsül fallback
  // şeritleri turdaki at sayısına göre yenile
  scene.children = scene.children.filter((obj:any)=> obj.keep === true)
  buildStraightTrack(roundCfg.value.horses.length)

  spawnHorses(roundCfg.value.horses)
  computeDurations(roundCfg.value.distance, roundCfg.value.horses)
  startTime = performance.now()
  runningRound = roundCfg.value.round
}

function removeLabelsFrom(obj: THREE.Object3D) {
  obj.traverse((n: any) => {
    // CSS2DObject olup olmadığını kontrol et
    if (n instanceof CSS2DObject || n?.isCSS2DObject) {
      const el: HTMLElement | undefined = (n as any).element
      n.removeFromParent()
      if (el && el.parentElement) el.parentElement.removeChild(el) // DOM’dan da sök
    }
  })
}

function removeAllSceneLabels(scene: THREE.Scene, labelRenderer?: any) {
  scene.traverse((n: any) => {
    if (n instanceof CSS2DObject || n?.isCSS2DObject) {
      const el: HTMLElement | undefined = (n as any).element
      n.removeFromParent()
      if (el && el.parentElement) el.parentElement.removeChild(el)
    }
  })
  // emniyet kemeri: renderer’ın kökünü de boşalt
  if (labelRenderer?.domElement) labelRenderer.domElement.innerHTML = ''
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
    <div ref="container" style="position:relative;width:100%;height:420px;border-radius:12px;overflow:hidden;border:1px solid var(--pico-muted-border-color)"></div>
  </article>
</template>
