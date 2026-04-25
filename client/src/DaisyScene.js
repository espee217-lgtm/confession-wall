import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// ─────────────────────────────────────────────────────────────────────────────
// TUNING — adjust these after you see it in browser
// ─────────────────────────────────────────────────────────────────────────────
const CFG = {
  // Camera
  CAM_Y:          3.4,
  CAM_Z:          9.5,
  LOOK_AT_Y:      4.0,

  // Hand GLB
  HAND_SCALE_H:   3.5,   // scale hand so it is this many world-units tall
  FIST_TOP_Y:     2.90,  // world-Y of the knuckles (where stems exit fist)

  // Bouquet heads
  HEADS_BASE_Y:   3.55,  // world-Y of the lowest flower head (just above fist)
  BOUQUET_SPREAD: 1.10,  // horizontal radius of head cluster
  DOME_HEIGHT:    0.32,  // centre flowers rise this much above edge flowers
  DEPTH_SPREAD:   0.20,  // z-depth layering (front/back)

  // Per-flower size
  HEAD_SIZE_PROFILE: 1.10,
  HEAD_SIZE_POST_MAX: 1.05,
  HEAD_SIZE_POST_MIN: 0.82,
  HEAD_SIZE_BG:       0.70,

  // Daisy GLB orientation:
  // If your daisy has petals facing +Z set PETAL_AXIS to "z" (default).
  // If petals face +Y set it to "y".
  PETAL_AXIS: "z",

  // Animation
  BLOOM_STAGGER_MS: 130,  // ms between each flower blooming
  BLOOM_DUR_MS:     1400, // ms for one flower to fully open
  SWAY_AMP_BASE:    0.007,
  SWAY_AMP_RADIAL:  0.008,
};
// ─────────────────────────────────────────────────────────────────────────────

const PHI = Math.PI * (3 - Math.sqrt(5));

function phyllotaxis(i, total, radius) {
  const r     = Math.sqrt(i / total) * radius;
  const theta = i * PHI;
  return { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
}

function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// ─────────────────────────────────────────────────────────────────────────────
// FLOWER DEFINITIONS
// "compose" removed — the fist itself handles that action now
// ─────────────────────────────────────────────────────────────────────────────
const INTERACTIVE = [
  { id: "profile",  role: "profile"  },
  { id: "post-0",   role: "post", confIdx: 0 },
  { id: "post-1",   role: "post", confIdx: 1 },
  { id: "post-2",   role: "post", confIdx: 2 },
  { id: "post-3",   role: "post", confIdx: 3 },
  { id: "post-4",   role: "post", confIdx: 4 },
  { id: "post-5",   role: "post", confIdx: 5 },
  { id: "post-6",   role: "post", confIdx: 6 },
];
const N_BG = 7; // decorative background flowers (not interactive)

// Build all flower defs (interactive + bg) in phyllotaxis order
function buildDefs() {
  const total = INTERACTIVE.length + N_BG;
  const defs  = [];

  INTERACTIVE.forEach((role, i) => {
    const { x, z } = phyllotaxis(i, total, CFG.BOUQUET_SPREAD);
    const radial    = Math.sqrt(x * x + z * z) / CFG.BOUQUET_SPREAD;
    const headSize  = role.role === "profile"
                    ? CFG.HEAD_SIZE_PROFILE
                    : CFG.HEAD_SIZE_POST_MAX - radial * (CFG.HEAD_SIZE_POST_MAX - CFG.HEAD_SIZE_POST_MIN);
    defs.push({
      ...role,
      i, radial, headSize,
      hx: x,
      hy: CFG.HEADS_BASE_Y + (1 - radial) * CFG.DOME_HEIGHT,
      hz: -z * CFG.DEPTH_SPREAD,
      isInteractive: true,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.36 + Math.random() * 0.28,
    });
  });

  for (let j = 0; j < N_BG; j++) {
    const i         = INTERACTIVE.length + j;
    const { x, z }  = phyllotaxis(i, total, CFG.BOUQUET_SPREAD * 1.08);
    const radial     = Math.sqrt(x * x + z * z) / (CFG.BOUQUET_SPREAD * 1.08);
    defs.push({
      id: `bg-${j}`, role: "bg",
      i, radial, headSize: CFG.HEAD_SIZE_BG - radial * 0.12,
      hx: x,
      hy: CFG.HEADS_BASE_Y + (1 - radial) * CFG.DOME_HEIGHT * 0.7 - 0.08,
      hz: -z * CFG.DEPTH_SPREAD * 0.9,
      isInteractive: false,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.32 + Math.random() * 0.28,
    });
  }

  return defs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clone a loaded daisy template and fit it to headSize
// ─────────────────────────────────────────────────────────────────────────────
function cloneDaisy(template, templateSize, def) {
  const { headSize, hx, hy, hz, radial, isInteractive, role } = def;

  const uniScale = headSize / templateSize;

  const wrapper = new THREE.Group();
  const clone   = template.clone(true);

  clone.traverse((n) => {
    if (n.isMesh) {
      n.castShadow    = true;
      n.receiveShadow = true;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => { if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; } });
    }
  });

  clone.scale.setScalar(uniScale);

  // Apply petal axis rotation FIRST, then measure bbox so offset is correct
  if (CFG.PETAL_AXIS === "y") {
    clone.rotation.x = -Math.PI / 2;
  }
  clone.updateMatrixWorld(true);
  const cb = new THREE.Box3().setFromObject(clone);

  // Sink clone so the flower HEAD sits at local y=0 of wrapper,
  // and the stem hangs down below into the fist
  clone.position.y = -cb.max.y + headSize * 0.45;

  wrapper.add(clone);

  // ── Outward fan lean so stems converge at the fist ────────────────────────
  // baseRotX: lean forward toward camera + outward based on radial distance
  const baseRotX = -0.15 - radial * 0.35;
  // baseRotZ: fan left/right based on horizontal position — stronger for outer flowers
  const baseRotZ = -hx * 0.55 + (Math.random() - 0.5) * 0.12;
  const baseRotY = Math.atan2(hx, 0.5) * 0.40 + (Math.random() - 0.5) * 0.12;

  wrapper.rotation.set(baseRotX, baseRotY, baseRotZ);

  wrapper.position.set(hx, hy, hz);
  wrapper.scale.set(0.01, 0.01, 0.01); // blooms from 0

  // Store base rotations so the sway loop can ADD on top without drifting back to 0
  wrapper.userData.baseRotX = baseRotX;
  wrapper.userData.baseRotZ = baseRotZ;

  // ── Hit sphere for raycasting (invisible) ────────────────────────────────
  if (isInteractive) {
    const hitGeo  = new THREE.SphereGeometry(headSize * 0.52, 8, 8);
    const hitMat  = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.userData = { flowerId: def.id, role: def.role, confIdx: def.confIdx ?? null };
    wrapper.add(hitMesh);

    // Per-flower accent glow
    const glowCol = role === "profile" ? 0x44aaff : 0xffffff;
    const glow    = new THREE.PointLight(glowCol, 0.35, 2.2);
    glow.position.set(0, headSize * 0.2, 0);
    wrapper.add(glow);
    wrapper.userData.glow     = glow;
    wrapper.userData.headSize = headSize;
  }

  return wrapper;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function DaisyScene({ confessions = [], onPostClick, onCompose, onProfile }) {
  const mountRef = useRef(null);
  const S = useRef({
    renderer: null, scene: null, camera: null, frame: null,
    flowers: {},
    hoveredId: null,
    time: 0,
    pGeo: null, pPos: null, pVel: null, pMat: null,
    bouqGlow: null,
    fistHit: null,
    hand: null,           // ref to the loaded hand group
    fistClickTime: -999,  // timestamp of last fist click for pop animation
  });
  const [tooltip, setTooltip] = useState(null);
  const confRef = useRef(confessions);
  useEffect(() => { confRef.current = confessions; }, [confessions]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const s  = S.current;
    const W  = mount.clientWidth;
    const H  = mount.clientHeight;

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040a09);
    scene.fog = new THREE.FogExp2(0x040a09, 0.019);
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
    camera.position.set(0, CFG.CAM_Y, CFG.CAM_Z);
    camera.lookAt(0, CFG.LOOK_AT_Y, 0);
    s.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    // ── Lights ──────────────────────────────────────────────────────────────
    const sun = new THREE.DirectionalLight(0xffe090, 4.5);
    sun.position.set(-3, 9, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 0.5;  sun.shadow.camera.far    = 30;
    sun.shadow.camera.left   = -7;   sun.shadow.camera.right  = 7;
    sun.shadow.camera.top    =  9;   sun.shadow.camera.bottom = -3;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x80b8ff, 1.8);
    rim.position.set(5, 7, -9);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffcc80, 0.9);
    fill.position.set(0, -1, 9);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0xb0ccdd, 0.55));
    scene.add(new THREE.HemisphereLight(0x88aa99, 0x112211, 0.45));

    // Bouquet warm glow
    const bouqGlow = new THREE.PointLight(0xffe060, 2.4, 8.0);
    bouqGlow.position.set(0, CFG.HEADS_BASE_Y + 0.5, 0.5);
    scene.add(bouqGlow);
    s.bouqGlow = bouqGlow;

    const warmFill = new THREE.PointLight(0xffa060, 0.9, 5.0);
    warmFill.position.set(0.5, 2.2, 2.5);
    scene.add(warmFill);

    // ── Load hand.glb ───────────────────────────────────────────────────────
    new GLTFLoader().load("/hand.glb", (gltf) => {
      const hand = gltf.scene;
      hand.traverse((n) => {
        if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
      });
      // Scale hand
      const b0 = new THREE.Box3().setFromObject(hand);
      hand.scale.setScalar(CFG.HAND_SCALE_H / b0.getSize(new THREE.Vector3()).y);
      // Position fist top at FIST_TOP_Y
      const b1 = new THREE.Box3().setFromObject(hand);
      hand.position.set(0, CFG.FIST_TOP_Y - b1.max.y, 0.15);
      scene.add(hand);
      s.hand = hand; // store for fist pop animation
      s.handBaseY = hand.position.y;
      const fistHit = new THREE.Mesh(
        new THREE.SphereGeometry(0.60, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      // Place at the actual fist/knuckle area — well below FIST_TOP_Y
      fistHit.position.set(0, CFG.FIST_TOP_Y - 0.90, 0.15);
      fistHit.userData = { flowerId: "fist", role: "compose", confIdx: null };
      scene.add(fistHit);
      s.fistHit = fistHit;

    }, undefined, (e) => console.warn("hand.glb:", e));

    // ── Load daisy.glb, clone for each flower def ────────────────────────────
    const loader = new GLTFLoader();
    const tryPaths = ["/daisy.glb", "/daisy2.glb", "/Daisy.glb", "/Daisy2.glb", "/flower.glb"];

    const loadDaisy = (paths) => {
      if (!paths.length) {
        console.error("No daisy GLB found. Drop daisy.glb into /public/");
        return;
      }
      const [head, ...tail] = paths;
      loader.load(head, (gltf) => {
        const template     = gltf.scene;
        const bbox         = new THREE.Box3().setFromObject(template);
        const bsize        = bbox.getSize(new THREE.Vector3());
        const templateSize = Math.max(bsize.x, bsize.z, bsize.y * 0.5);

        buildDefs().forEach((def, idx) => {
          const wrapper = cloneDaisy(template, templateSize, def);
          scene.add(wrapper);
          s.flowers[def.id] = {
            wrapper, def,
            bloomStart:    performance.now() + idx * CFG.BLOOM_STAGGER_MS,
            bloomDone:     false,
            swayPhase:     def.swayPhase,
            swaySpeed:     def.swaySpeed,
            radial:        def.radial,
            isInteractive: def.isInteractive,
          };
        });
      }, undefined, () => loadDaisy(tail));
    };
    loadDaisy(tryPaths);

   // ── Particles — dense golden bee swarm ──────────────────────────────────
    const PC_SWARM = 320;  // tight cluster right at flower heads
    const PC_DRIFT = 80;   // wider ambient floaters
    const PC = PC_SWARM + PC_DRIFT;
 
    const pPos = new Float32Array(PC * 3);
    const pVel = [];
 
    // Swarm — packed tightly into the bouquet head zone
    for (let i = 0; i < PC_SWARM; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r   = 0.05 + Math.random() * 1.0;
      const h   = CFG.HEADS_BASE_Y - 0.15 + Math.random() * 1.3;
      pPos[i * 3]     = Math.cos(ang) * r;
      pPos[i * 3 + 1] = h;
      pPos[i * 3 + 2] = Math.sin(ang) * r * 0.6;
      pVel.push({
        ang, r,
        speed:     (Math.random() - 0.5) * 0.024,
        phase:     Math.random() * Math.PI * 2,
        baseH:     h,
        wobble:    0.04 + Math.random() * 0.11,
        wobbleSpd: 2.5 + Math.random() * 3.5,
      });
    }
 
    // Drift — wider, slower, ambient sparkles
    for (let i = PC_SWARM; i < PC; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r   = 1.1 + Math.random() * 2.5;
      const h   = CFG.HEADS_BASE_Y - 0.5 + Math.random() * 3.0;
      pPos[i * 3]     = Math.cos(ang) * r;
      pPos[i * 3 + 1] = h;
      pPos[i * 3 + 2] = Math.sin(ang) * r * 0.5;
      pVel.push({
        ang, r,
        speed:     (Math.random() - 0.5) * 0.007,
        phase:     Math.random() * Math.PI * 2,
        baseH:     h,
        wobble:    0.02 + Math.random() * 0.05,
        wobbleSpd: 0.8 + Math.random() * 1.2,
      });
    }
 
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
 
    // Large warm gold dots
    const pMat = new THREE.PointsMaterial({
      color: 0xffcc22, size: 0.058, transparent: true,
      opacity: 0.92, sizeAttenuation: true,
    });
    // Smaller bright sparkle layer on same geo
    const pGeo2 = pGeo.clone();
    const pMatSmall = new THREE.PointsMaterial({
      color: 0xfff0a0, size: 0.026, transparent: true,
      opacity: 0.65, sizeAttenuation: true,
    });
 
    scene.add(new THREE.Points(pGeo, pMat));
    scene.add(new THREE.Points(pGeo2, pMatSmall));
    s.pGeo = pGeo; s.pPos = pPos; s.pVel = pVel; s.pMat = pMat;
    s.pGeo2 = pGeo2; s.pMatSmall = pMatSmall;

      // ── Junction fog — hides the hand/stem gap ───────────────────────────────
    // TUNING: adjust JUNCTION_Y to move it up/down to sit exactly at the gap
    const JUNCTION_Y = CFG.FIST_TOP_Y + 0.05; // right at knuckle top
    const JUNCTION_SPREAD = 1.06;  // horizontal radius of the fog puff
    const JUNCTION_HEIGHT = 0.65;  // vertical thickness of fog
    const JUNCTION_Z_OFFSET = 0.4;
    const JC = 1000; // particle count — very dense
 
    const jPos = new Float32Array(JC * 3);
    const jVel = [];
    for (let i = 0; i < JC; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r   = Math.random() * JUNCTION_SPREAD;
      const h   = JUNCTION_Y + (Math.random() - 0.5) * JUNCTION_HEIGHT;
      jPos[i * 3]     = Math.cos(ang) * r;
      jPos[i * 3 + 1] = h;
      jPos[i * 3 + 2] = Math.sin(ang) * r * 1.4;
      jVel.push({
        ang, r,
        speed: (Math.random() - 0.5) * 0.006,
        phase: Math.random() * Math.PI * 2,
        baseH: h,
        drift: (Math.random() - 0.5) * 0.003,
      });
    }
 
    const jGeo = new THREE.BufferGeometry();
    jGeo.setAttribute("position", new THREE.BufferAttribute(jPos, 3));
 
    // Large soft golden fog puffs
    const jMat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 0.18,
      transparent: true,
      opacity: 0.18,
      sizeAttenuation: true,
      depthWrite: false,
    });
    // Medium layer
    const jGeo2 = jGeo.clone();
    const jMat2 = new THREE.PointsMaterial({
      color: 0xffdd44,
      size: 0.10,
      transparent: true,
      opacity: 0.26,
      sizeAttenuation: true,
      depthWrite: false,
    });
    // Fine sparkle layer
    const jGeo3 = jGeo.clone();
    const jMat3 = new THREE.PointsMaterial({
      color: 0xfff5bb,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      depthWrite: false,
    });
 
    scene.add(new THREE.Points(jGeo, jMat));
    scene.add(new THREE.Points(jGeo2, jMat2));
    scene.add(new THREE.Points(jGeo3, jMat3));
 
    s.jGeo = jGeo; s.jGeo2 = jGeo2; s.jGeo3 = jGeo3;
    s.jPos = jPos; s.jVel = jVel;
    s.jMat = jMat; s.jMat2 = jMat2; s.jMat3 = jMat3;
 
 
    // ── Raycaster ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    const toNDC = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((cx - r.left) / r.width)  * 2 - 1;
      mouse.y = -((cy - r.top)  / r.height) * 2 + 1;
    };

    // All raycasting targets: flower hit spheres + fist hit sphere
    const hitMeshes = () => {
      const flowerHits = Object.values(s.flowers)
        .filter(f => f.isInteractive)
        .flatMap(f => f.wrapper.children.filter(c => c.userData?.flowerId));
      return s.fistHit ? [...flowerHits, s.fistHit] : flowerHits;
    };

    const raycast = () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hitMeshes(), false);
      return hits.length ? hits[0].object : null;
    };

    const onMouseMove = (e) => {
      toNDC(e.clientX, e.clientY);
      const hit   = raycast();
      const newId = hit?.userData.flowerId ?? null;

      if (newId !== s.hoveredId) {
        // Reset scale on previously hovered flower (not the fist — it has no wrapper)
        if (s.hoveredId && s.hoveredId !== "fist" && s.flowers[s.hoveredId]) {
          s.flowers[s.hoveredId].wrapper.scale.setScalar(1);
        }
        s.hoveredId = newId;
        renderer.domElement.style.cursor = newId ? "pointer" : "default";

        // Burst bouquet glow when fist is hovered
        if (s.bouqGlow) {
          s.bouqGlow.intensity = newId === "fist" ? 5.0 : 2.4;
        }
      }

      // Scale up hovered flowers (not the fist)
      if (newId && newId !== "fist" && s.flowers[newId]) {
        s.flowers[newId].wrapper.scale.setScalar(1.18);
      }

      // Tooltip logic
      if (newId) {
        const { role, confIdx } = hit.userData;

        if (role === "post") {
          const conf = confRef.current[confIdx];
          if (conf && s.flowers[newId]) {
            const wp = new THREE.Vector3();
            s.flowers[newId].wrapper.getWorldPosition(wp);
            wp.y += 0.8;
            const proj = wp.clone().project(camera);
            const rect = renderer.domElement.getBoundingClientRect();
            setTooltip({
              x:        (proj.x * 0.5 + 0.5) * rect.width,
              y:        (-proj.y * 0.5 + 0.5) * rect.height,
              text:     conf.message?.substring(0, 100) + (conf.message?.length > 100 ? "…" : ""),
              username: conf.userId?.username || "anon",
              role:     "post",
            });
          }
        } else if (role === "compose") {
          setTooltip({ role: "compose", label: "✦ plant a confession" });
        } else if (role === "profile") {
          setTooltip({ role: "profile", label: "⌘ your profile" });
        }
      } else {
        setTooltip(null);
      }
    };

    const handleClick = (e) => {
      toNDC(e.clientX, e.clientY);
      const hit = raycast();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") {
        s.fistClickTime = performance.now(); // trigger pop
        onCompose?.();
      }
      else if (role === "profile") onProfile?.();
      else if (role === "post") {
        const conf = confRef.current[confIdx];
        if (conf) onPostClick?.(conf._id);
      }
    };

    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      toNDC(t.clientX, t.clientY);
      const hit = raycast();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") {
        s.fistClickTime = performance.now(); // trigger pop
        onCompose?.();
      }
      else if (role === "profile") onProfile?.();
      else if (role === "post") {
        const conf = confRef.current[confIdx];
        if (conf) onPostClick?.(conf._id);
      }
    };

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click",     handleClick);
    renderer.domElement.addEventListener("touchend",  onTouchEnd);

    // ── Animation loop ───────────────────────────────────────────────────────
    const animate = () => {
      s.frame = requestAnimationFrame(animate);
      s.time += 0.009;
      const now = performance.now();

     // Particles — golden bee swarm
      if (s.pVel) {
        for (let i = 0; i < s.pVel.length; i++) {
          const v = s.pVel[i];
          v.ang += v.speed;
          const flutter  = Math.sin(s.time * v.wobbleSpd + v.phase) * v.wobble;
          const flutter2 = Math.cos(s.time * v.wobbleSpd * 1.3 + v.phase) * v.wobble * 0.5;
          s.pPos[i * 3]     = Math.cos(v.ang) * v.r + flutter;
          s.pPos[i * 3 + 1] = v.baseH + Math.sin(s.time * 0.9 + v.phase) * 0.18 + flutter2;
          s.pPos[i * 3 + 2] = Math.sin(v.ang) * v.r * 0.6 + flutter * 0.4;
        }
        s.pGeo.attributes.position.needsUpdate = true;
        if (s.pGeo2) {
          s.pGeo2.attributes.position.array.set(s.pPos);
          s.pGeo2.attributes.position.needsUpdate = true;
        }
        if (s.pMat) s.pMat.opacity = 0.78 + Math.sin(s.time * 1.8) * 0.16;
        if (s.pMatSmall) s.pMatSmall.opacity = 0.40 + Math.sin(s.time * 2.5 + 1.0) * 0.22;
      }

        // Junction fog animation
      if (s.jVel) {
        for (let i = 0; i < s.jVel.length; i++) {
          const v = s.jVel[i];
          v.ang += v.speed;
          v.r += Math.sin(s.time * 0.8 + v.phase) * 0.002;

          s.jPos[i * 3]     = Math.cos(v.ang) * v.r + Math.sin(s.time * 0.4 + v.phase) * 0.06;
          s.jPos[i * 3 + 1] = v.baseH + Math.sin(s.time * 0.6 + v.phase) * 0.05;
          s.jPos[i * 3 + 2] = Math.sin(v.ang) * v.r * 0.7;
        }
        s.jGeo.attributes.position.needsUpdate = true;
        if (s.jGeo2) { s.jGeo2.attributes.position.array.set(s.jPos); s.jGeo2.attributes.position.needsUpdate = true; }
        if (s.jGeo3) { s.jGeo3.attributes.position.array.set(s.jPos); s.jGeo3.attributes.position.needsUpdate = true; }
        // Slow breathe
        const breathe = 0.18 + Math.sin(s.time * 0.5) * 0.06;
        if (s.jMat)  s.jMat.opacity  = breathe;
        if (s.jMat2) s.jMat2.opacity = breathe + 0.10;
        if (s.jMat3) s.jMat3.opacity = breathe + 0.28;
      }
 

      // Fist pop animation — quick upward punch on click, springs back
      if (s.hand) {
        const sinceClick = (performance.now() - s.fistClickTime) / 1000; // seconds
        if (sinceClick < 0.6) {
          // decaying sine: pops up then settles
          const popY = Math.sin(sinceClick * Math.PI / 0.6) * Math.exp(-sinceClick * 5) * 0.28;
          s.hand.position.y = s.handBaseY + popY;
          if (s.fistHit) s.fistHit.position.y = CFG.FIST_TOP_Y - 0.90 + popY;
        } else if (s.fistHit) {
          s.fistHit.position.y = CFG.FIST_TOP_Y - 0.90;
        }
      }

      // Bouquet glow pulse (except when overridden by fist hover)
      if (s.bouqGlow && s.hoveredId !== "fist") {
        s.bouqGlow.intensity = 2.0 + Math.sin(s.time * 1.2) * 0.45;
      }

      // Flower bloom + sway
      Object.entries(s.flowers).forEach(([id, f]) => {
        const { wrapper, bloomStart, swayPhase, swaySpeed, radial, isInteractive, def } = f;
        const elapsed = now - bloomStart;

        // Bloom scale
        if (!f.bloomDone && elapsed >= 0) {
          const t  = Math.min(elapsed / CFG.BLOOM_DUR_MS, 1);
          const sc = f.isInteractive ? easeOutElastic(t) : easeOutCubic(t);
          if (s.hoveredId !== id) wrapper.scale.setScalar(Math.max(sc, 0.01));
          if (t >= 1) f.bloomDone = true;
        }

        // Gentle sway — adds ON TOP of stored base lean, never drifts back to 0
        const amp    = CFG.SWAY_AMP_BASE + radial * CFG.SWAY_AMP_RADIAL;
        const baseZ  = wrapper.userData.baseRotZ ?? -(def.hx ?? 0) * 0.30;
        const baseX  = wrapper.userData.baseRotX ?? -0.15 - radial * 0.35;
        wrapper.rotation.z = baseZ + Math.sin(s.time * swaySpeed + swayPhase) * amp;
        wrapper.rotation.x = baseX + Math.cos(s.time * swaySpeed * 0.65 + swayPhase) * amp * 0.4;

        // Glow pulse on interactive flowers
        if (isInteractive && wrapper.userData.glow) {
          wrapper.userData.glow.intensity = s.hoveredId === id
            ? 2.8 + Math.sin(s.time * 4.5) * 0.9
            : 0.28 + Math.sin(s.time * 1.6 + swayPhase) * 0.12;
        }
      });

      // Cinematic camera drift
      camera.position.x = Math.sin(s.time * 0.05) * 0.12;
      camera.position.y = CFG.CAM_Y + Math.sin(s.time * 0.038) * 0.07;
      camera.lookAt(Math.sin(s.time * 0.036) * 0.04, CFG.LOOK_AT_Y, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const nW = mount.clientWidth, nH = mount.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(s.frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click",     handleClick);
      renderer.domElement.removeEventListener("touchend",  onTouchEnd);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Confession tooltip */}
      {tooltip?.role === "post" && (
        <div style={{
          position: "absolute",
          left: tooltip.x, top: tooltip.y - 125,
          transform: "translateX(-50%)",
          background: "rgba(3,9,5,0.96)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,210,0.14)",
          borderRadius: "16px",
          padding: "13px 18px",
          maxWidth: "240px",
          pointerEvents: "none",
          zIndex: 100,
          fontFamily: "Georgia, serif",
          boxShadow: "0 10px 40px rgba(0,0,0,0.65)",
        }}>
          <p style={{ color: "rgba(255,238,136,0.58)", fontSize: "10px", margin: "0 0 5px", letterSpacing: "0.14em" }}>
            @{tooltip.username}
          </p>
          <p style={{ color: "rgba(255,255,220,0.93)", fontSize: "12px", margin: 0, lineHeight: 1.65 }}>
            {tooltip.text}
          </p>
        </div>
      )}

      {/* Action label (compose / profile) — shown at bottom centre */}
      {tooltip?.role && tooltip.role !== "post" && (
        <div style={{
          position: "absolute", bottom: "11%", left: "50%",
          transform: "translateX(-50%)",
          color: tooltip.role === "compose" ? "rgba(255,238,136,0.88)" : "rgba(136,210,255,0.88)",
          fontSize: "13px", letterSpacing: "0.16em",
          pointerEvents: "none",
          fontFamily: "Georgia, serif",
          textShadow: "0 2px 16px rgba(0,0,0,0.95)",
        }}>
          {tooltip.label}
        </div>
      )}

      {/* Cinematic vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 65% at 50% 46%, transparent 18%, rgba(2,5,3,0.50) 58%, rgba(1,3,2,0.95) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "15%", pointerEvents: "none", background: "linear-gradient(to bottom, rgba(2,6,3,0.88), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28%", pointerEvents: "none", background: "linear-gradient(to top, rgba(1,4,2,0.98), transparent)" }} />
      <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,210,0.12)", fontSize: "10px", letterSpacing: "0.44em", textTransform: "uppercase", pointerEvents: "none", fontFamily: "Georgia, serif" }}>
        confession wall
      </div>
    </div>
  );
}