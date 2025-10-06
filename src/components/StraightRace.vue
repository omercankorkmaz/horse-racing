<script lang="ts" setup>
import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue'
import { useStore } from 'vuex'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const container = ref<HTMLDivElement | null>(null)
const store = useStore()
const roundCfg = computed(()=> store.getters.currentRoundConfig)
const horses = computed(()=> store.state.horses)
const status = computed(()=> store.state.status)

const colorOf = (id:number)=> horses.value.find(h=>h.id===id)?.color

let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let frameId = 0

const TRACK_LEN = 40
const START_X = -TRACK_LEN/2
const END_X   =  TRACK_LEN/2
const LANE_GAP = 0.7

let BASE_LIFT_Y = 0

const MODEL_FWD = new THREE.Vector3(0,0,1)
const ROT_FIX = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0))

let horseObjs: Record<number, THREE.Object3D> = {}
let startTime = 0
let durations: Record<number, number> = {}
let finished: Set<number> = new Set()
let runningRound = -1

const clock = new THREE.Clock()
const loader = new GLTFLoader()
let baseGltf: { scene: THREE.Object3D, animations: THREE.AnimationClip[] } | null = null
let mixers: Record<number, THREE.AnimationMixer> = {}
let actions: Record<number, THREE.AnimationAction> = {}
let timeScales: Record<number, number> = {}
let horseLabels: Record<number, CSS2DObject> = {}

const _box = new THREE.Box3()

function attachLabel(target: THREE.Object3D, numText: string){
  const color = horses.value.find(h=>h.id=== Number(numText))?.color
  const div = document.createElement('div')
  div.textContent = numText
  div.style.padding = '2px 6px'
  div.style.borderRadius = '6px'
  div.style.background = `${color}60`
  div.style.color = '#fff'
  div.style.fontSize = '12px'
  div.style.whiteSpace = 'nowrap'
  div.style.backdropFilter = 'blur(2px)'

  _box.setFromObject(target)
  const h = Math.max(0.8, _box.max.y - _box.min.y)
  const label = new CSS2DObject(div)
  label.position.set(0, h / 3, 0)
  target.add(label)
  return label
}

function removeLabelsFrom(obj: THREE.Object3D) {
  obj.traverse((n: any) => {
    if (n instanceof CSS2DObject || n?.isCSS2DObject) {
      const el: HTMLElement | undefined = (n as any).element
      n.removeFromParent()
      if (el && el.parentElement) el.parentElement.removeChild(el)
    }
  })
}

function removeAllSceneLabels() {
  scene.traverse((n: any) => {
    if (n instanceof CSS2DObject || n?.isCSS2DObject) {
      const el: HTMLElement | undefined = (n as any).element
      n.removeFromParent()
      if (el && el.parentElement) el.parentElement.removeChild(el)
    }
  })
  labelRenderer?.domElement && (labelRenderer.domElement.innerHTML = '')
}

function detachAndDisposeLabel(lbl: CSS2DObject | undefined) {
  if (!lbl) return
  lbl.removeFromParent()
  const el = (lbl as any).element as HTMLElement | undefined
  if (el && el.parentElement) el.parentElement.removeChild(el)
}

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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, Math.max(8, lanes*LANE_GAP*3)),
    new THREE.MeshStandardMaterial({ color: 0x14301a })
  )
  ground.rotation.x = -Math.PI/2
  ground.receiveShadow = true
  ground.keep = true
  scene.add(ground)

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_LEN+4, Math.max(2.4, lanes*LANE_GAP+0.6)),
    new THREE.MeshStandardMaterial({ color: 0xe2ca76 })
  )
  road.rotation.x = -Math.PI/2
  road.position.y = 0.01
  road.receiveShadow = true
  road.keep = true
  scene.add(road)

  const linesMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  for (let li=0; li<=lanes; li++){
    const z = ((li - lanes/2) * LANE_GAP)
    const line = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_LEN+4, 0.03), linesMat)
    line.rotation.x = -Math.PI/2
    line.position.set(0, 0.015, z)
    line.keep = true
    scene.add(line)
  }

  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const startBar = new THREE.Mesh(new THREE.PlaneGeometry(0.2, lanes*LANE_GAP), barMat)
  startBar.rotation.x = -Math.PI/2
  startBar.position.set(START_X, 0.02, 0)
  startBar.keep = true
  scene.add(startBar)

  const finBar = new THREE.Mesh(new THREE.PlaneGeometry(0.2, lanes*LANE_GAP), barMat)
  finBar.rotation.x = -Math.PI/2
  finBar.position.set(END_X, 0.02, 0)
  finBar.keep = true
  scene.add(finBar)
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
  renderer.outputColorSpace = THREE.SRGBColorSpace

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'

  container.value!.appendChild(renderer.domElement)
  container.value!.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.enableZoom = false
  controls.target.set(0, 0, 0)
  controls.update()

  addLights()
  buildStraightTrack((roundCfg.value?.horses.length ?? 10))
  attachFixedWheelZoom()

  window.addEventListener('resize', onResize)
  animate()
}

let onWheelHandler: ((ev: WheelEvent) => void) | null = null
const ZOOM_UNITS_PER_NOTCH = 0.01
function attachFixedWheelZoom() {
  if (!renderer || !camera || !controls) return

  const onWheel = (ev: WheelEvent) => {
    const d = THREE.MathUtils.clamp(ev.deltaY, -200, 200)
    const step = -d * ZOOM_UNITS_PER_NOTCH
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir).normalize()
    const move = dir.multiplyScalar(step)
    camera.position.add(move)
    controls.target.add(move)
    controls.update()
    ev.preventDefault()
  }
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
  onWheelHandler = onWheel
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
  Object.values(actions).forEach(a=> a?.stop())
  Object.values(mixers).forEach(m=> m.stopAllAction())
  actions = {}
  mixers = {}

  Object.values(horseObjs).forEach(o => removeLabelsFrom(o))
  Object.values(horseObjs).forEach(o => scene.remove(o))
  horseObjs = {}

  durations = {}
  finished = new Set()
  runningRound = -1
  removeAllSceneLabels()
}

function preloadHorse(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (baseGltf) return resolve()
    loader.load('src/models/horse.glb', (gltf) => {
      baseGltf = { scene: gltf.scene, animations: gltf.animations || [] }
      gltf.scene.traverse((c:any)=>{ if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      baseGltf.scene.scale.set(0.5, 0.5, 0.5)
      resolve()
    }, undefined, reject)
  })
}

function spawnHorses(ids: number[]){
  clearRound()
  const lanes = ids.length
  scene.children = scene.children.filter((obj:any)=> obj.keep === true)
  addLights()

  if (baseGltf) {
    ids.forEach((id, i)=>{
      const horse = SkeletonUtils.clone(baseGltf!.scene) as THREE.Object3D
      const z = (i - (lanes-1)/2) * LANE_GAP
      horse.position.set(START_X, BASE_LIFT_Y, z)
      scene.add(horse)
      const lbl = attachLabel(horse, String(id))
      horseLabels[id] = lbl
      horseObjs[id] = horse

      const quatToX = new THREE.Quaternion()
        .setFromUnitVectors(MODEL_FWD, new THREE.Vector3(1,0,0))
        .multiply(ROT_FIX)
      horse.quaternion.copy(quatToX)

      const mixer = new THREE.AnimationMixer(horse)
      mixers[id] = mixer
      const clips = baseGltf!.animations || []
      let clip = THREE.AnimationClip.findByName(clips, 'Run') ||
                 THREE.AnimationClip.findByName(clips, 'Gallop') ||
                 clips[0]

      if (clip) {
        const action = mixer.clipAction(clip)
        action.setLoop(THREE.LoopRepeat)
        const cond = horses.value.find(h=>h.id===id)?.condition ?? 50
        timeScales[id] = 0.9 + (cond/100) * 0.6
        action.play()
        actions[id] = action
      }
    })
    return
  }

  const geom = new THREE.CapsuleGeometry(0.25, 0.7, 6, 12)
  const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd })
  ids.forEach((id, i)=>{
    const z = (i - (lanes-1)/2) * LANE_GAP
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.set(START_X, 0.35, z)
    scene.add(mesh)
    const lbl = attachLabel(mesh, String(id))
    horseLabels[id] = lbl
    horseObjs[id] = mesh
  })
}

function computeDurations(distance: number, ids: number[]){
  ids.forEach(id=>{
    const cond = horses.value.find(h=>h.id===id)?.condition ?? 50
    const speed = Math.max(10, 14 + (cond/100)*2 + (Math.random()*1.2-0.6))
    const timeSec = distance / speed
    durations[id] = Math.round(timeSec * 1000)
    timeScales[id] = 0.9 + (cond/100) * 0.6
  })
}

function animate(){
  frameId = requestAnimationFrame(animate)
  const dt = clock.getDelta()
  Object.entries(mixers).forEach(([sid, mixer])=>{
    const id = Number(sid)
    const a = actions[id]
    if (a) a.timeScale = timeScales[id] ?? 1
    mixer.update(dt)
  })

  const now = performance.now()
  if (runningRound > 0 && roundCfg.value && status.value === 'running'){
    const ids = roundCfg.value.horses
    ids.forEach((id)=>{
      const obj = horseObjs[id]; if (!obj) return
      const dur = durations[id] || 1
      const t = Math.min(1, (now - startTime) / (dur / 4))
      const x = THREE.MathUtils.lerp(START_X, END_X, t)
      obj.position.x = x

      if (t >= 1 && !finished.has(id)){
        finished.add(id)
        actions[id]?.fadeOut(0.2)
        const lbl = horseLabels[id]
        detachAndDisposeLabel(lbl)
        delete horseLabels[id]

        scene.remove(obj)
        obj.traverse((n:any)=>{
          if (n?.isCSS2DObject) detachAndDisposeLabel(n as CSS2DObject)
        })

        store.commit('UPSERT_ROUND_RESULT', {
          round: roundCfg.value.round,
          distance: roundCfg.value.distance,
          finish: { horseId: id, timeMs: now - startTime }
        })

        if (finished.size === ids.length){
          Object.values(actions).forEach(a=> a?.fadeOut(0.3))
          Object.values(mixers).forEach(m=> m.stopAllAction())
          actions = {}
          mixers = {}
          removeAllSceneLabels()
          Object.values(horseObjs).forEach(o => scene.remove(o))
          horseObjs = {}
          
          store.commit('FINALIZE_ROUND_RESULT', { round: roundCfg.value.round, distance: roundCfg.value.distance })
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
  labelRenderer.render(scene, camera)
}

async function startVisualRound(){
  if (!roundCfg.value) return
  await preloadHorse().catch(()=>{})
  scene.children = scene.children.filter((obj:any)=> obj.keep === true)
  buildStraightTrack(roundCfg.value.horses.length)
  spawnHorses(roundCfg.value.horses)
  computeDurations(roundCfg.value.distance, roundCfg.value.horses)
  startTime = performance.now()
  runningRound = roundCfg.value.round
}

watch(()=> status.value, (nv)=>{ if (nv === 'running') startVisualRound() })
watch(()=> roundCfg.value?.round, ()=>{ if (status.value === 'running' && roundCfg.value) startVisualRound() })

onMounted(()=>{ initThree() })
onBeforeUnmount(()=>{
  if (onWheelHandler) {
    renderer?.domElement?.removeEventListener('wheel', onWheelHandler as any)
    onWheelHandler = null
  }
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
