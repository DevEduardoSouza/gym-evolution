import * as THREE from 'https://esm.sh/three@0.165.0';

let scene, camera, renderer, water, waterTop, bottle, cap, capBase, bubblesGroup;
let waterClipPlane, capClipPlane;
let waterRatio = 0, targetRatio = 0;
let clock;

// Silhouette of a water bottle (radius, y) — revolved around Y axis.
// Y goes from 0 (bottom) to BOTTLE_TOP (top of cap).
const BOTTLE_BOTTOM = 0.0;
const BODY_TOP = 2.1;
const NECK_BOTTOM = 2.65;
const NECK_TOP = 3.05;
const CAP_TOP = 3.45;
const BOTTLE_HEIGHT = CAP_TOP;
const Y_CENTER_OFFSET = -BOTTLE_HEIGHT / 2;

// (radius, y) pairs — define glass outer silhouette
const SILHOUETTE = [
  [0.00, 0.00],
  [0.85, 0.00],
  [1.00, 0.10],
  [1.00, 0.50],
  // small grip rings near base (subtle)
  [0.96, 0.55], [1.00, 0.60],
  [0.96, 0.65], [1.00, 0.70],
  [1.00, BODY_TOP],
  // shoulder curve
  [0.95, 2.22],
  [0.80, 2.36],
  [0.58, 2.50],
  [0.42, 2.58],
  [0.36, NECK_BOTTOM],
  // neck (cylindrical)
  [0.36, NECK_TOP - 0.15],
  // thread rings (subtle bumps)
  [0.40, NECK_TOP - 0.10],
  [0.36, NECK_TOP - 0.07],
  [0.40, NECK_TOP - 0.03],
  [0.36, NECK_TOP],
];

// Water silhouette (slightly smaller radius, no thread/grip details, capped at neck base)
const WATER_SILHOUETTE = [
  [0.00, 0.02],
  [0.92, 0.02],
  [0.95, 0.10],
  [0.95, BODY_TOP],
  [0.90, 2.22],
  [0.76, 2.36],
  [0.55, 2.50],
  [0.40, 2.58],
];
const WATER_MIN_Y = 0.02;
const WATER_MAX_Y = 2.58;

function radiusAtWaterY(y) {
  for (let i = 0; i < WATER_SILHOUETTE.length - 1; i++) {
    const [r1, y1] = WATER_SILHOUETTE[i];
    const [r2, y2] = WATER_SILHOUETTE[i + 1];
    if (y >= y1 && y <= y2) {
      const t = y2 === y1 ? 0 : (y - y1) / (y2 - y1);
      return r1 + (r2 - r1) * t;
    }
  }
  return 0;
}

export function initWaterJar(canvas) {
  if (!canvas) return;
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = null;

  const w = canvas.clientWidth || 220;
  const h = canvas.clientHeight || 320;

  camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
  camera.position.set(0, 0.2, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x66ccff, 0.85);
  fill.position.set(-4, 3, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x4fc3f7, 0.55);
  rim.position.set(0, -2, -4);
  scene.add(rim);

  // Glass material
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff,
    transmission: 0.94,
    transparent: true,
    opacity: 0.45,
    roughness: 0.04,
    metalness: 0,
    ior: 1.46,
    thickness: 0.45,
    clearcoat: 0.85,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
  });

  // Build bottle as LatheGeometry
  const lathePoints = SILHOUETTE.map(([r, y]) => new THREE.Vector2(r, y));
  const bottleGeo = new THREE.LatheGeometry(lathePoints, 80);
  bottleGeo.translate(0, Y_CENTER_OFFSET, 0);
  bottle = new THREE.Mesh(bottleGeo, glassMat);
  scene.add(bottle);

  // Bottom cap (closes the bottle base for nicer rendering)
  const baseGeo = new THREE.CircleGeometry(0.95, 64);
  const base = new THREE.Mesh(baseGeo, glassMat);
  base.rotation.x = -Math.PI / 2;
  base.position.y = Y_CENTER_OFFSET + 0.02;
  scene.add(base);

  // Cap (opaque white plastic cap)
  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f2f2,
    metalness: 0.05,
    roughness: 0.45,
    clearcoat: 0.4,
  });
  const capBaseGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 48);
  capBase = new THREE.Mesh(capBaseGeo, capMat);
  capBase.position.y = Y_CENTER_OFFSET + NECK_TOP + 0.025;
  scene.add(capBase);

  const capGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.32, 48);
  cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = Y_CENTER_OFFSET + NECK_TOP + 0.21;
  scene.add(cap);

  // Cap top groove ring (decorative)
  const capRingGeo = new THREE.TorusGeometry(0.40, 0.012, 8, 48);
  const capRing = new THREE.Mesh(capRingGeo, capMat);
  capRing.rotation.x = Math.PI / 2;
  capRing.position.y = Y_CENTER_OFFSET + NECK_TOP + 0.32;
  scene.add(capRing);

  // ===== WATER =====
  // Build water LatheGeometry (slightly smaller radius), with bottom cap
  const waterPoints = WATER_SILHOUETTE.map(([r, y]) => new THREE.Vector2(r, y));
  // Close the top so the geometry has a face when clipped (Three handles open ends fine,
  // but we'll add an explicit top disc that follows the water level instead).
  const waterGeo = new THREE.LatheGeometry(waterPoints, 64);
  waterGeo.translate(0, Y_CENTER_OFFSET, 0);

  // Water-bottom cap (so we don't see through the bottom of the water)
  const waterBaseGeo = new THREE.CircleGeometry(0.92, 64);

  // Clip plane: cut water above the current level. Normal pointing DOWN (0,-1,0),
  // constant = -waterY → keep points where (-y + (-waterY)) > 0 → y < -waterY ... wait math.
  // Plane equation: normal · P + constant = 0; KEEP where normal·P + constant > 0.
  // normal=(0,-1,0), point P=(_,y,_) → -y + constant > 0 → y < constant. So set constant = waterTopY.
  waterClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), Y_CENTER_OFFSET + WATER_MIN_Y);

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x29b6f6,
    transmission: 0.35,
    transparent: true,
    opacity: 0.9,
    roughness: 0.12,
    metalness: 0,
    ior: 1.33,
    thickness: 1.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
    emissive: 0x0b4d70,
    emissiveIntensity: 0.16,
    side: THREE.DoubleSide,
    clippingPlanes: [waterClipPlane],
  });

  water = new THREE.Mesh(waterGeo, waterMat);
  scene.add(water);

  const waterBase = new THREE.Mesh(waterBaseGeo, waterMat);
  waterBase.rotation.x = -Math.PI / 2;
  waterBase.position.y = Y_CENTER_OFFSET + WATER_MIN_Y + 0.001;
  scene.add(waterBase);

  // Top disc (flat surface of water) — separate material WITHOUT clipping so it's always visible.
  const waterTopMat = new THREE.MeshPhysicalMaterial({
    color: 0x4fc3f7,
    transmission: 0.2,
    transparent: true,
    opacity: 0.92,
    roughness: 0.08,
    metalness: 0,
    ior: 1.33,
    clearcoat: 0.7,
    emissive: 0x0e6090,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });
  const topGeo = new THREE.CircleGeometry(1, 56);
  waterTop = new THREE.Mesh(topGeo, waterTopMat);
  waterTop.rotation.x = -Math.PI / 2;
  scene.add(waterTop);

  // Bubbles
  bubblesGroup = new THREE.Group();
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.85,
    transparent: true,
    opacity: 0.7,
    roughness: 0.06,
    ior: 1.3,
  });
  for (let i = 0; i < 9; i++) {
    const r = 0.04 + Math.random() * 0.05;
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), bubbleMat);
    const a = Math.random() * Math.PI * 2;
    const rad = Math.random() * 0.7;
    b.position.set(Math.cos(a) * rad, Y_CENTER_OFFSET + Math.random() * BODY_TOP, Math.sin(a) * rad);
    b.userData = {
      speed: 0.22 + Math.random() * 0.35,
      baseRad: rad,
      baseAng: a,
      wobble: Math.random() * Math.PI * 2,
    };
    bubblesGroup.add(b);
  }
  scene.add(bubblesGroup);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resize(canvas)).observe(canvas);
  }
  window.addEventListener('resize', () => resize(canvas));

  animate();
}

function resize(canvas) {
  if (!renderer) return;
  const w = canvas.clientWidth || 220;
  const h = canvas.clientHeight || 320;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Smoothly approach target ratio
  waterRatio += (targetRatio - waterRatio) * 0.07;

  // Compute current water top Y in local silhouette space
  const yLocal = WATER_MIN_Y + (WATER_MAX_Y - WATER_MIN_Y) * waterRatio;
  const yWorld = Y_CENTER_OFFSET + yLocal + Math.sin(t * 2.4) * 0.006; // tiny surface wobble
  waterClipPlane.constant = yWorld;

  // Update top disc to match water surface size + position
  const r = radiusAtWaterY(yLocal);
  const scale = Math.max(0.02, r);
  waterTop.scale.set(scale, scale, 1);
  waterTop.position.y = yWorld - 0.002;
  waterTop.visible = waterRatio > 0.005;

  // Bubbles drift upward inside the water column
  bubblesGroup.children.forEach((b, i) => {
    b.position.y += b.userData.speed * dt;
    const a = b.userData.baseAng + Math.sin(t * 0.8 + b.userData.wobble) * 0.15;
    const rad = b.userData.baseRad + Math.sin(t * 1.4 + b.userData.wobble) * 0.04;
    b.position.x = Math.cos(a) * rad;
    b.position.z = Math.sin(a) * rad;

    if (b.position.y > yWorld - 0.06) {
      b.position.y = Y_CENTER_OFFSET + WATER_MIN_Y + 0.05;
      b.userData.baseAng = Math.random() * Math.PI * 2;
      b.userData.baseRad = Math.random() * Math.min(0.8, r * 0.85);
    }
    b.visible = waterRatio > 0.04 && b.position.y < yWorld - 0.04;
  });

  // Subtle rotation (slow)
  const rotSpeed = 0.16;
  bottle.rotation.y += rotSpeed * dt;
  water.rotation.y += rotSpeed * dt;
  waterTop.rotation.z += rotSpeed * dt;
  cap.rotation.y += rotSpeed * dt;
  capBase.rotation.y += rotSpeed * dt;
  bubblesGroup.rotation.y += rotSpeed * dt;

  renderer.render(scene, camera);
}

export function setWaterLevel(ratio) {
  targetRatio = Math.max(0, Math.min(1.0, ratio));
}

export function splash() {
  if (!bubblesGroup) return;
  bubblesGroup.children.forEach(b => {
    b.userData.speed = 0.9 + Math.random() * 0.6;
    setTimeout(() => { b.userData.speed = 0.22 + Math.random() * 0.35; }, 1100);
  });
}
