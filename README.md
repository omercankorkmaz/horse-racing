
# Horse Racing Game — Case Study (Vue 3 + TS + Vuex + Pico + Three.js)

Bu proje **3D pist** ile geliştirilmiş final sürümdür.

## Kurulum ve Çalıştırma
```bash
npm i
npm run dev
```

## Komutlar
- Birim testleri (Vitest): `npm run test`
- E2E (Cypress): `npm run e2e:open`

## 3D Görselleştirme
- `ThreeRace.vue` bileşeni oval pist (TubeGeometry + CatmullRomCurve + Frenet Frames) üzerinde atları koşturur.
- `Start` ile `running` durumuna geçildiğinde 3D animasyon başlar, tüm atlar bitirdiğinde sonuçlar yazılır ve bir sonraki tura otomatik geçilir.
- Kamera: OrbitControls (döndür/zoom).

## Gerçek At Modeli (GLTF/GLB)
- `public/models/horse.glb` yoluna bir at modeli ekleyin. Dosya yoksa bileşen kapsül geometriyle devam eder.
- Modelin ileri ekseni farklıysa `ThreeRace.vue` içindeki `MODEL_FWD` ve `ROT_FIX` değerleri ile yönü düzeltin.
