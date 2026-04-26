import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// ─────────────────────────────────────────────────────────────────────────────
// TUNING
// ─────────────────────────────────────────────────────────────────────────────
const CFG = {
  CAM_Y: 3.4, CAM_Z: 9.5, LOOK_AT_Y: 4.0,
  HAND_SCALE_H: 3.5, FIST_TOP_Y: 2.90,
  HEADS_BASE_Y: 3.55, BOUQUET_SPREAD: 1.10,
  DOME_HEIGHT: 0.32, DEPTH_SPREAD: 0.20,
  HEAD_SIZE_PROFILE: 1.10,
  HEAD_SIZE_POST_MAX: 1.05, HEAD_SIZE_POST_MIN: 0.82,
  HEAD_SIZE_BG: 0.70,
  PETAL_AXIS: "z",
  BLOOM_STAGGER_MS: 130, BLOOM_DUR_MS: 1400,
  SWAY_AMP_BASE: 0.007, SWAY_AMP_RADIAL: 0.008,
};

const PHI = Math.PI * (3 - Math.sqrt(5));
function phyllotaxis(i, total, radius) {
  const r = Math.sqrt(i / total) * radius;
  const theta = i * PHI;
  return { x: Math.cos(theta) * r, z: Math.sin(theta) * r };
}
function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

const INTERACTIVE = [
  { id: "profile", role: "profile" },
  { id: "post-0",  role: "post", confIdx: 0 },
  { id: "post-1",  role: "post", confIdx: 1 },
  { id: "post-2",  role: "post", confIdx: 2 },
  { id: "post-3",  role: "post", confIdx: 3 },
  { id: "post-4",  role: "post", confIdx: 4 },
  { id: "post-5",  role: "post", confIdx: 5 },
  { id: "post-6",  role: "post", confIdx: 6 },
];
const N_BG = 7;

function buildDefs() {
  const total = INTERACTIVE.length + N_BG;
  const defs = [];
  INTERACTIVE.forEach((role, i) => {
    const { x, z } = phyllotaxis(i, total, CFG.BOUQUET_SPREAD);
    const radial = Math.sqrt(x * x + z * z) / CFG.BOUQUET_SPREAD;
    const headSize = role.role === "profile"
      ? CFG.HEAD_SIZE_PROFILE
      : CFG.HEAD_SIZE_POST_MAX - radial * (CFG.HEAD_SIZE_POST_MAX - CFG.HEAD_SIZE_POST_MIN);
    defs.push({
      ...role, i, radial, headSize,
      hx: x,
      hy: CFG.HEADS_BASE_Y + (1 - radial) * CFG.DOME_HEIGHT,
      hz: -z * CFG.DEPTH_SPREAD,
      isInteractive: true,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.36 + Math.random() * 0.28,
    });
  });
  for (let j = 0; j < N_BG; j++) {
    const i = INTERACTIVE.length + j;
    const { x, z } = phyllotaxis(i, total, CFG.BOUQUET_SPREAD * 1.08);
    const radial = Math.sqrt(x * x + z * z) / (CFG.BOUQUET_SPREAD * 1.08);
    defs.push({
      id: `bg-${j}`, role: "bg", i, radial,
      headSize: CFG.HEAD_SIZE_BG - radial * 0.12,
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

function cloneDaisy(template, templateSize, def, isMobile) {
  const { headSize, hx, hy, hz, radial, isInteractive, role } = def;
  const uniScale = headSize / templateSize;
  const wrapper = new THREE.Group();
  const clone = template.clone(true);
  clone.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = !isMobile;
      n.receiveShadow = !isMobile;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => { if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; } });
    }
  });
  clone.scale.setScalar(uniScale);
  if (CFG.PETAL_AXIS === "y") clone.rotation.x = -Math.PI / 2;
  clone.updateMatrixWorld(true);
  const cb = new THREE.Box3().setFromObject(clone);
  clone.position.y = -cb.max.y + headSize * 0.45;
  wrapper.add(clone);

  const baseRotX = -0.15 - radial * 0.35;
  const baseRotZ = -hx * 0.55 + (Math.random() - 0.5) * 0.12;
  const baseRotY = Math.atan2(hx, 0.5) * 0.40 + (Math.random() - 0.5) * 0.12;
  wrapper.rotation.set(baseRotX, baseRotY, baseRotZ);
  wrapper.position.set(hx, hy, hz);
  wrapper.scale.set(0.01, 0.01, 0.01);
  wrapper.userData.baseRotX = baseRotX;
  wrapper.userData.baseRotZ = baseRotZ;

  if (isInteractive) {
    const seg = isMobile ? 5 : 8;
    const hitGeo = new THREE.SphereGeometry(headSize * 0.52, seg, seg);
    const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
    hitMesh.userData = { flowerId: def.id, role: def.role, confIdx: def.confIdx ?? null };
    wrapper.add(hitMesh);

    // Skip per-flower point lights on mobile — expensive
    if (!isMobile) {
      const glowCol = role === "profile" ? 0x44aaff : 0xffffff;
      const glow = new THREE.PointLight(glowCol, 0.35, 2.2);
      glow.position.set(0, headSize * 0.2, 0);
      wrapper.add(glow);
      wrapper.userData.glow = glow;
    }
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
    flowers: {}, hoveredId: null, time: 0,
    pGeo: null, pPos: null, pVel: null, pMat: null,
    pGeo2: null, pMatSmall: null,
    jGeo: null, jGeo2: null, jGeo3: null,
    jPos: null, jVel: null,
    jMat: null, jMat2: null, jMat3: null,
    bouqGlow: null, fistHit: null,
    hand: null, handBaseY: 0, fistClickTime: -999,
    lastFrame: 0,
  });
  const [tooltip, setTooltip] = useState(null);
  const confRef = useRef(confessions);
  useEffect(() => { confRef.current = confessions; }, [confessions]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const s = S.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // ── Mobile detection ─────────────────────────────────────────────────────
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || window.innerWidth < 768;
    const FPS_CAP = isMobile ? 1000 / 30 : 0; // 30fps on mobile, uncapped on desktop

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x040a09, 0.019);
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);
    camera.position.set(0, CFG.CAM_Y, CFG.CAM_Z);
    camera.lookAt(0, CFG.LOOK_AT_Y, 0);
    s.camera = camera;

    // Antialias off on mobile, pixel ratio capped lower
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isMobile; // shadows off on mobile
    if (!isMobile) renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    // ── Lights ───────────────────────────────────────────────────────────────
    const sun = new THREE.DirectionalLight(0xffe090, 4.5);
    sun.position.set(-3, 9, 5);
    if (!isMobile) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024); // reduced from 2048 even on desktop
      sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
      sun.shadow.camera.left = -7;  sun.shadow.camera.right = 7;
      sun.shadow.camera.top = 9;    sun.shadow.camera.bottom = -3;
      sun.shadow.bias = -0.001;
    }
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x80b8ff, 1.8);
    rim.position.set(5, 7, -9);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffcc80, 0.9);
    fill.position.set(0, -1, 9);
    scene.add(fill);

    scene.add(new THREE.AmbientLight(0xb0ccdd, 0.55));
    scene.add(new THREE.HemisphereLight(0x88aa99, 0x112211, 0.45));

    const bouqGlow = new THREE.PointLight(0xffe060, 2.4, 8.0);
    bouqGlow.position.set(0, CFG.HEADS_BASE_Y + 0.5, 0.5);
    scene.add(bouqGlow);
    s.bouqGlow = bouqGlow;

    // Skip warm fill point light on mobile
    if (!isMobile) {
      const warmFill = new THREE.PointLight(0xffa060, 0.9, 5.0);
      warmFill.position.set(0.5, 2.2, 2.5);
      scene.add(warmFill);
    }

    // ── Load hand.glb ────────────────────────────────────────────────────────
    new GLTFLoader().load("/hand.glb", (gltf) => {
      const hand = gltf.scene;
      hand.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = !isMobile;
          n.receiveShadow = !isMobile;
        }
      });
      const b0 = new THREE.Box3().setFromObject(hand);
      hand.scale.setScalar(CFG.HAND_SCALE_H / b0.getSize(new THREE.Vector3()).y);
      const b1 = new THREE.Box3().setFromObject(hand);
      hand.position.set(0, CFG.FIST_TOP_Y - b1.max.y, 0.15);
      scene.add(hand);
      s.hand = hand;
      s.handBaseY = hand.position.y;

      const fistHit = new THREE.Mesh(
        new THREE.SphereGeometry(0.60, 6, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      fistHit.position.set(0, CFG.FIST_TOP_Y - 0.90, 0.15);
      fistHit.userData = { flowerId: "fist", role: "compose", confIdx: null };
      scene.add(fistHit);
      s.fistHit = fistHit;
    }, undefined, (e) => console.warn("hand.glb:", e));

    // ── Load daisy.glb + clone ───────────────────────────────────────────────
    const loader = new GLTFLoader();
    const tryPaths = ["/daisy.glb", "/daisy2.glb", "/Daisy.glb", "/Daisy2.glb", "/flower.glb"];
    const loadDaisy = (paths) => {
      if (!paths.length) { console.error("No daisy GLB found."); return; }
      const [head, ...tail] = paths;
      loader.load(head, (gltf) => {
        const template = gltf.scene;
        const bbox = new THREE.Box3().setFromObject(template);
        const bsize = bbox.getSize(new THREE.Vector3());
        const templateSize = Math.max(bsize.x, bsize.z, bsize.y * 0.5);
        // Skip bg flowers on mobile to reduce clone count
        const defs = buildDefs().filter(d => !isMobile || d.isInteractive);
        defs.forEach((def, idx) => {
          const wrapper = cloneDaisy(template, templateSize, def, isMobile);
          scene.add(wrapper);
          s.flowers[def.id] = {
            wrapper, def,
            bloomStart: performance.now() + idx * CFG.BLOOM_STAGGER_MS,
            bloomDone: false,
            swayPhase: def.swayPhase,
            swaySpeed: def.swaySpeed,
            radial: def.radial,
            isInteractive: def.isInteractive,
          };
        });
      }, undefined, () => loadDaisy(tail));
    };
    loadDaisy(tryPaths);

    // ── Particles — reduced on mobile ────────────────────────────────────────
    const PC_SWARM = isMobile ? 120 : 320;
    const PC_DRIFT = isMobile ? 25 : 80;
    const PC = PC_SWARM + PC_DRIFT;
    const pPos = new Float32Array(PC * 3);
    const pVel = [];

    for (let i = 0; i < PC_SWARM; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 0.05 + Math.random() * 1.0;
      const h = CFG.HEADS_BASE_Y - 0.15 + Math.random() * 1.3;
      pPos[i * 3] = Math.cos(ang) * r;
      pPos[i * 3 + 1] = h;
      pPos[i * 3 + 2] = Math.sin(ang) * r * 0.6;
      pVel.push({ ang, r, speed: (Math.random() - 0.5) * 0.024, phase: Math.random() * Math.PI * 2, baseH: h, wobble: 0.04 + Math.random() * 0.11, wobbleSpd: 2.5 + Math.random() * 3.5 });
    }
    for (let i = PC_SWARM; i < PC; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 1.1 + Math.random() * 2.5;
      const h = CFG.HEADS_BASE_Y - 0.5 + Math.random() * 3.0;
      pPos[i * 3] = Math.cos(ang) * r;
      pPos[i * 3 + 1] = h;
      pPos[i * 3 + 2] = Math.sin(ang) * r * 0.5;
      pVel.push({ ang, r, speed: (Math.random() - 0.5) * 0.007, phase: Math.random() * Math.PI * 2, baseH: h, wobble: 0.02 + Math.random() * 0.05, wobbleSpd: 0.8 + Math.random() * 1.2 });
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffcc22, size: 0.058, transparent: true, opacity: 0.92, sizeAttenuation: true });
    scene.add(new THREE.Points(pGeo, pMat));
    s.pGeo = pGeo; s.pPos = pPos; s.pVel = pVel; s.pMat = pMat;

    // Second sparkle layer — skip on mobile
    if (!isMobile) {
      const pGeo2 = pGeo.clone();
      const pMatSmall = new THREE.PointsMaterial({ color: 0xfff0a0, size: 0.026, transparent: true, opacity: 0.65, sizeAttenuation: true });
      scene.add(new THREE.Points(pGeo2, pMatSmall));
      s.pGeo2 = pGeo2; s.pMatSmall = pMatSmall;
    }

    // ── Junction fog — reduced on mobile ─────────────────────────────────────
    const JUNCTION_Y = CFG.FIST_TOP_Y + 0.05;
    const JC = isMobile ? 300 : 1000;
    const jPos = new Float32Array(JC * 3);
    const jVel = [];
    for (let i = 0; i < JC; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.06;
      const h = JUNCTION_Y + (Math.random() - 0.5) * 0.65;
      jPos[i * 3] = Math.cos(ang) * r;
      jPos[i * 3 + 1] = h;
      jPos[i * 3 + 2] = Math.sin(ang) * r * 1.4;
      jVel.push({ ang, r, speed: (Math.random() - 0.5) * 0.006, phase: Math.random() * Math.PI * 2, baseH: h });
    }
    const jGeo = new THREE.BufferGeometry();
    jGeo.setAttribute("position", new THREE.BufferAttribute(jPos, 3));
    const jMat = new THREE.PointsMaterial({ color: 0xffe066, size: isMobile ? 0.14 : 0.18, transparent: true, opacity: 0.18, sizeAttenuation: true, depthWrite: false });
    scene.add(new THREE.Points(jGeo, jMat));
    s.jGeo = jGeo; s.jPos = jPos; s.jVel = jVel; s.jMat = jMat;

    if (!isMobile) {
      const jGeo2 = jGeo.clone();
      const jMat2 = new THREE.PointsMaterial({ color: 0xffdd44, size: 0.10, transparent: true, opacity: 0.26, sizeAttenuation: true, depthWrite: false });
      const jGeo3 = jGeo.clone();
      const jMat3 = new THREE.PointsMaterial({ color: 0xfff5bb, size: 0.045, transparent: true, opacity: 0.45, sizeAttenuation: true, depthWrite: false });
      scene.add(new THREE.Points(jGeo2, jMat2));
      scene.add(new THREE.Points(jGeo3, jMat3));
      s.jGeo2 = jGeo2; s.jGeo3 = jGeo3;
      s.jMat2 = jMat2; s.jMat3 = jMat3;
    }

    // ── Raycaster ─────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const toNDC = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((cx - r.left) / r.width)  * 2 - 1;
      mouse.y = -((cy - r.top)  / r.height) * 2 + 1;
    };
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
      const hit = raycast();
      const newId = hit?.userData.flowerId ?? null;
      if (newId !== s.hoveredId) {
        if (s.hoveredId && s.hoveredId !== "fist" && s.flowers[s.hoveredId])
          s.flowers[s.hoveredId].wrapper.scale.setScalar(1);
        s.hoveredId = newId;
        renderer.domElement.style.cursor = newId ? "pointer" : "default";
        if (s.bouqGlow) s.bouqGlow.intensity = newId === "fist" ? 5.0 : 2.4;
      }
      if (newId && newId !== "fist" && s.flowers[newId])
        s.flowers[newId].wrapper.scale.setScalar(1.18);

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
            setTooltip({ x: (proj.x * 0.5 + 0.5) * rect.width, y: (-proj.y * 0.5 + 0.5) * rect.height, text: conf.message?.substring(0, 100) + (conf.message?.length > 100 ? "…" : ""), username: conf.userId?.username || "anon", role: "post" });
          }
        } else if (role === "compose") {
          setTooltip({ role: "compose", label: "✦ plant a confession" });
        } else if (role === "profile") {
          setTooltip({ role: "profile", label: "⌘ your profile" });
        }
      } else { setTooltip(null); }
    };

    const handleClick = (e) => {
      toNDC(e.clientX, e.clientY);
      const hit = raycast();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") { s.fistClickTime = performance.now(); onCompose?.(); }
      else if (role === "profile") onProfile?.();
      else if (role === "post") { const c = confRef.current[confIdx]; if (c) onPostClick?.(c._id); }
    };

    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      toNDC(t.clientX, t.clientY);
      const hit = raycast();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") { s.fistClickTime = performance.now(); onCompose?.(); }
      else if (role === "profile") onProfile?.();
      else if (role === "post") { const c = confRef.current[confIdx]; if (c) onPostClick?.(c._id); }
    };

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate = () => {
      s.frame = requestAnimationFrame(animate);

      // FPS cap for mobile
      const now = performance.now();
      if (FPS_CAP && (now - s.lastFrame) < FPS_CAP) return;
      s.lastFrame = now;

      s.time += 0.009;

      // Swarm particles
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
        if (s.pGeo2) { s.pGeo2.attributes.position.array.set(s.pPos); s.pGeo2.attributes.position.needsUpdate = true; }
        if (s.pMat) s.pMat.opacity = 0.78 + Math.sin(s.time * 1.8) * 0.16;
        if (s.pMatSmall) s.pMatSmall.opacity = 0.40 + Math.sin(s.time * 2.5 + 1.0) * 0.22;
      }

      // Junction fog
      if (s.jVel) {
        for (let i = 0; i < s.jVel.length; i++) {
          const v = s.jVel[i];
          v.ang += v.speed;
          s.jPos[i * 3]     = Math.cos(v.ang) * v.r + Math.sin(s.time * 0.4 + v.phase) * 0.06;
          s.jPos[i * 3 + 1] = v.baseH + Math.sin(s.time * 0.6 + v.phase) * 0.05;
          s.jPos[i * 3 + 2] = Math.sin(v.ang) * v.r * 0.7;
        }
        s.jGeo.attributes.position.needsUpdate = true;
        if (s.jGeo2) { s.jGeo2.attributes.position.array.set(s.jPos); s.jGeo2.attributes.position.needsUpdate = true; }
        if (s.jGeo3) { s.jGeo3.attributes.position.array.set(s.jPos); s.jGeo3.attributes.position.needsUpdate = true; }
        const breathe = 0.18 + Math.sin(s.time * 0.5) * 0.06;
        if (s.jMat)  s.jMat.opacity  = breathe;
        if (s.jMat2) s.jMat2.opacity = breathe + 0.10;
        if (s.jMat3) s.jMat3.opacity = breathe + 0.28;
      }

      // Fist pop
      if (s.hand) {
        const sinceClick = (now - s.fistClickTime) / 1000;
        if (sinceClick < 0.6) {
          const popY = Math.sin(sinceClick * Math.PI / 0.6) * Math.exp(-sinceClick * 5) * 0.28;
          s.hand.position.y = s.handBaseY + popY;
          if (s.fistHit) s.fistHit.position.y = CFG.FIST_TOP_Y - 0.90 + popY;
        } else if (s.fistHit) {
          s.fistHit.position.y = CFG.FIST_TOP_Y - 0.90;
        }
      }

      // Bouquet glow pulse
      if (s.bouqGlow && s.hoveredId !== "fist")
        s.bouqGlow.intensity = 2.0 + Math.sin(s.time * 1.2) * 0.45;

      // Flower bloom + sway
      Object.entries(s.flowers).forEach(([id, f]) => {
        const { wrapper, bloomStart, swayPhase, swaySpeed, radial, isInteractive, def } = f;
        const elapsed = now - bloomStart;
        if (!f.bloomDone && elapsed >= 0) {
          const t = Math.min(elapsed / CFG.BLOOM_DUR_MS, 1);
          const sc = isInteractive ? easeOutElastic(t) : easeOutCubic(t);
          if (s.hoveredId !== id) wrapper.scale.setScalar(Math.max(sc, 0.01));
          if (t >= 1) f.bloomDone = true;
        }
        const amp = CFG.SWAY_AMP_BASE + radial * CFG.SWAY_AMP_RADIAL;
        const baseZ = wrapper.userData.baseRotZ ?? -(def.hx ?? 0) * 0.30;
        const baseX = wrapper.userData.baseRotX ?? -0.15 - radial * 0.35;
        wrapper.rotation.z = baseZ + Math.sin(s.time * swaySpeed + swayPhase) * amp;
        wrapper.rotation.x = baseX + Math.cos(s.time * swaySpeed * 0.65 + swayPhase) * amp * 0.4;
        if (isInteractive && wrapper.userData.glow) {
          wrapper.userData.glow.intensity = s.hoveredId === id
            ? 2.8 + Math.sin(s.time * 4.5) * 0.9
            : 0.28 + Math.sin(s.time * 1.6 + swayPhase) * 0.12;
        }
      });

      // Camera drift — skip on mobile for perf
      if (!isMobile) {
        camera.position.x = Math.sin(s.time * 0.05) * 0.12;
        camera.position.y = CFG.CAM_Y + Math.sin(s.time * 0.038) * 0.07;
        camera.lookAt(Math.sin(s.time * 0.036) * 0.04, CFG.LOOK_AT_Y, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

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
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {tooltip?.role === "post" && (
        <div style={{
          position: "absolute", left: tooltip.x, top: tooltip.y - 125,
          transform: "translateX(-50%)",
          background: "rgba(3,9,5,0.96)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,210,0.14)", borderRadius: "16px",
          padding: "13px 18px", maxWidth: "240px", pointerEvents: "none",
          zIndex: 100, fontFamily: "Georgia, serif",
          boxShadow: "0 10px 40px rgba(0,0,0,0.65)",
        }}>
          <p style={{ color: "rgba(255,238,136,0.58)", fontSize: "10px", margin: "0 0 5px", letterSpacing: "0.14em" }}>@{tooltip.username}</p>
          <p style={{ color: "rgba(255,255,220,0.93)", fontSize: "12px", margin: 0, lineHeight: 1.65 }}>{tooltip.text}</p>
        </div>
      )}

      {tooltip?.role && tooltip.role !== "post" && (
        <div style={{
          position: "absolute", bottom: "11%", left: "50%", transform: "translateX(-50%)",
          color: tooltip.role === "compose" ? "rgba(255,238,136,0.88)" : "rgba(136,210,255,0.88)",
          fontSize: "13px", letterSpacing: "0.16em", pointerEvents: "none",
          fontFamily: "Georgia, serif", textShadow: "0 2px 16px rgba(0,0,0,0.95)",
        }}>{tooltip.label}</div>
      )}

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 65% at 50% 46%, transparent 18%, rgba(2,5,3,0.50) 58%, rgba(1,3,2,0.95) 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "15%", pointerEvents: "none", background: "linear-gradient(to bottom, rgba(2,6,3,0.88), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28%", pointerEvents: "none", background: "linear-gradient(to top, rgba(1,4,2,0.98), transparent)" }} />
      <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,210,0.12)", fontSize: "10px", letterSpacing: "0.44em", textTransform: "uppercase", pointerEvents: "none", fontFamily: "Georgia, serif" }}>
        confession wall
      </div>
    </div>
  );
}
