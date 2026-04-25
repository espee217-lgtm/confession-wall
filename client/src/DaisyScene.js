import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const DAISY_DEFS = [
  { id: "compose",  role: "compose",  wx:  0.0, wz:  0.5 },
  { id: "profile",  role: "profile",  wx:  4.2, wz: -3.5 },
  { id: "post-0",   role: "post",     wx: -3.0, wz: -1.5, confIdx: 0 },
  { id: "post-1",   role: "post",     wx:  2.8, wz: -1.8, confIdx: 1 },
  { id: "post-2",   role: "post",     wx: -4.2, wz:  1.2, confIdx: 2 },
  { id: "post-3",   role: "post",     wx:  3.6, wz:  1.0, confIdx: 3 },
  { id: "post-4",   role: "post",     wx: -1.4, wz:  2.8, confIdx: 4 },
  { id: "post-5",   role: "post",     wx:  1.8, wz:  3.0, confIdx: 5 },
  { id: "post-6",   role: "post",     wx: -0.3, wz:  4.2, confIdx: 6 },
];

// BG daisies — purely decorative, not clickable
const BG_DAISIES = [
  { wx: -6.5, wz: -4.0, scale: 0.55 },
  { wx:  6.8, wz: -3.5, scale: 0.5  },
  { wx: -7.2, wz:  0.5, scale: 0.6  },
  { wx:  7.0, wz:  1.5, scale: 0.45 },
  { wx: -5.5, wz:  4.5, scale: 0.5  },
  { wx:  5.8, wz:  4.8, scale: 0.55 },
  { wx:  1.5, wz: -5.5, scale: 0.5  },
  { wx: -2.0, wz: -5.0, scale: 0.45 },
  { wx:  4.5, wz: -5.5, scale: 0.4  },
  { wx: -4.8, wz: -5.2, scale: 0.42 },
  { wx:  8.0, wz: -1.0, scale: 0.38 },
  { wx: -8.0, wz:  2.5, scale: 0.4  },
  { wx:  0.5, wz:  6.5, scale: 0.45 },
  { wx: -3.0, wz:  6.0, scale: 0.38 },
  { wx:  3.5, wz:  6.2, scale: 0.42 },
];

function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function DaisyScene({ confessions = [], user, onPostClick, onCompose, onProfile }) {
  const mountRef = useRef(null);
  const S = useRef({
    renderer: null, scene: null, camera: null, frame: null,
    daisyGroups: {}, hoveredId: null, time: 0, particles: null,
  });
  const [tooltip, setTooltip] = useState(null);
  const confRef = useRef(confessions);
  useEffect(() => { confRef.current = confessions; }, [confessions]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const s = S.current;
    const W = mount.clientWidth, H = mount.clientHeight;

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061008);
    scene.fog = new THREE.FogExp2(0x061008, 0.048);
    s.scene = scene;

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
    camera.position.set(0, 5.5, 9.5);
    camera.lookAt(0, 1.2, 0);
    s.camera = camera;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    // ── Lights ───────────────────────────────────────────────────────────────
    // Warm golden hour sun
    const sun = new THREE.DirectionalLight(0xffe4a0, 3.5);
    sun.position.set(6, 14, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Cool sky fill
    scene.add(new THREE.AmbientLight(0xc8e8ff, 0.5));

    // Warm rim from behind
    const backLight = new THREE.DirectionalLight(0xff9955, 1.2);
    backLight.position.set(-5, 8, -8);
    scene.add(backLight);

    // Ground bounce — green tint
    scene.add(new THREE.HemisphereLight(0x88cc66, 0x224411, 0.6));

    // Soft moonlike fill from front
    const frontFill = new THREE.DirectionalLight(0xaaccff, 0.3);
    frontFill.position.set(0, 3, 10);
    scene.add(frontFill);

    // ── Ground — layered grass look ─────────────────────────────────────────
    // Base ground
    const groundGeo = new THREE.PlaneGeometry(80, 80, 60, 60);
    // Slight undulation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.25) * 0.12 + Math.cos(z * 0.3) * 0.08 + Math.sin(x * 0.6 + z * 0.4) * 0.06);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x1e4a18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Dark ground layer underneath for depth
    const darkGround = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ color: 0x0a1a08 })
    );
    darkGround.rotation.x = -Math.PI / 2;
    darkGround.position.y = -0.05;
    scene.add(darkGround);

    // ── Dense grass (3 layers of instanced meshes) ───────────────────────────
    const grassColors = [0x2a6618, 0x336b1a, 0x3d7d20, 0x295c15];
    const grassLayers = [
      { count: 1200, height: 0.45, spread: 28, minScale: 0.6, maxScale: 1.1 },
      { count: 800,  height: 0.28, spread: 22, minScale: 0.4, maxScale: 0.75 },
      { count: 400,  height: 0.65, spread: 18, minScale: 0.8, maxScale: 1.4 },
    ];

    grassLayers.forEach((layer, li) => {
      const geo = new THREE.ConeGeometry(0.022, layer.height, 3);
      const mat = new THREE.MeshLambertMaterial({ color: grassColors[li] });
      const mesh = new THREE.InstancedMesh(geo, mat, layer.count);
      const d = new THREE.Object3D();
      for (let i = 0; i < layer.count; i++) {
        d.position.set(
          (Math.random() - 0.5) * layer.spread,
          layer.height / 2,
          (Math.random() - 0.5) * layer.spread
        );
        d.rotation.y = Math.random() * Math.PI * 2;
        d.rotation.z = (Math.random() - 0.5) * 0.35;
        d.scale.setScalar(layer.minScale + Math.random() * (layer.maxScale - layer.minScale));
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // ── Firefly / pollen particles ────────────────────────────────────────────
    const particleCount = 120;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = [];
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3]     = (Math.random() - 0.5) * 18;
      pPositions[i * 3 + 1] = Math.random() * 4 + 0.3;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      pVelocities.push({
        x: (Math.random() - 0.5) * 0.008,
        y: (Math.random() - 0.5) * 0.004 + 0.002,
        z: (Math.random() - 0.5) * 0.008,
        phase: Math.random() * Math.PI * 2,
      });
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffee88,
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    s.particles = { mesh: particles, geo: pGeo, positions: pPositions, velocities: pVelocities, count: particleCount };

    // ── Atmospheric haze plane ────────────────────────────────────────────────
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x88bb66,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const hazePlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), hazeMat);
    hazePlane.position.set(0, 1.5, -2);
    scene.add(hazePlane);

    // ── Load GLB ─────────────────────────────────────────────────────────────
    const tryLoad = (paths, onSuccess) => {
      if (!paths.length) { console.error("All GLB paths failed"); return; }
      const [path, ...rest] = paths;
      new GLTFLoader().load(path, onSuccess, undefined,
        () => { console.warn(`Failed: ${path}`); tryLoad(rest, onSuccess); });
    };

    tryLoad(["/daisy2.glb", "/Daisy2.glb"], (gltf) => {
      console.log("GLB loaded successfully");
      const template = gltf.scene;

      template.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(m => {
            if (m) { m.side = THREE.DoubleSide; m.needsUpdate = true; }
          });
        }
      });

      const box = new THREE.Box3().setFromObject(template);
      const sz = box.getSize(new THREE.Vector3());
      const maxD = Math.max(sz.x, sz.y, sz.z);

      // ── Interactive daisies ─────────────────────────────────────────────
      DAISY_DEFS.forEach((def, i) => {
        const targetSize = def.role === "compose" ? 2.2 : def.role === "profile" ? 1.8 : 1.6 + Math.random() * 0.4;
        const uniScale = targetSize / maxD;

        const group = new THREE.Group();
        const clone = template.clone(true);
        clone.scale.setScalar(uniScale);
        const cb = new THREE.Box3().setFromObject(clone);
        clone.position.y = -cb.min.y;
        group.add(clone);

        group.rotation.y = Math.random() * Math.PI * 2;
        group.position.set(def.wx, 0, def.wz);
        group.scale.set(0.01, 0.01, 0.01);

        // Hit sphere — scaled to flower size
        const hitMesh = new THREE.Mesh(
          new THREE.SphereGeometry(targetSize * 0.55, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 })
        );
        hitMesh.position.y = targetSize * 0.55;
        hitMesh.userData = { daisyId: def.id, role: def.role, confIdx: def.confIdx ?? null };
        group.add(hitMesh);

        // Role glow light
        const lightCol = def.role === "compose" ? 0xffdd44 : def.role === "profile" ? 0x44aaff : 0xffffff;
        const glow = new THREE.PointLight(lightCol, def.role === "compose" ? 1.2 : 0.5, 3.5);
        glow.position.y = targetSize * 0.85;
        group.add(glow);
        group.userData.glow = glow;
        group.userData.targetSize = targetSize;

        scene.add(group);
        s.daisyGroups[def.id] = {
          group, def, hitMesh,
          bloomStart: performance.now() + i * 220,
          bloomDone: false,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.55 + Math.random() * 0.45,
        };
      });

      // ── Background decorative daisies ───────────────────────────────────
      BG_DAISIES.forEach((bd, i) => {
        const targetSize = 1.4 * bd.scale;
        const uniScale = targetSize / maxD;
        const group = new THREE.Group();
        const clone = template.clone(true);
        clone.scale.setScalar(uniScale);
        const cb = new THREE.Box3().setFromObject(clone);
        clone.position.y = -cb.min.y;
        group.add(clone);
        group.rotation.y = Math.random() * Math.PI * 2;
        group.position.set(bd.wx, 0, bd.wz);
        group.scale.set(0.01, 0.01, 0.01);
        group.userData.isBg = true;
        group.userData.swayPhase = Math.random() * Math.PI * 2;
        group.userData.swaySpeed = 0.5 + Math.random() * 0.5;

        scene.add(group);

        // Delayed bloom for bg daisies
        const delay = DAISY_DEFS.length * 220 + i * 120;
        const bStart = performance.now() + delay;
        group.userData.bloomStart = bStart;
        group.userData.bloomDone = false;
        s.daisyGroups[`bg-${i}`] = { group, isBg: true, bloomStart: bStart, bloomDone: false, swayPhase: group.userData.swayPhase, swaySpeed: group.userData.swaySpeed };
      });
    });

    // ── Raycaster ─────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const toNDC = (cx, cy) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((cx - r.left) / r.width) * 2 - 1;
      mouse.y = -((cy - r.top) / r.height) * 2 + 1;
    };

    const raycastDaisy = () => {
      raycaster.setFromCamera(mouse, camera);
      const meshes = Object.values(s.daisyGroups)
        .filter(d => !d.isBg && d.hitMesh)
        .map(d => d.hitMesh);
      const hits = raycaster.intersectObjects(meshes, false);
      return hits.length > 0 ? hits[0].object : null;
    };

    const onMouseMove = (e) => {
      toNDC(e.clientX, e.clientY);
      const hit = raycastDaisy();
      const newId = hit?.userData.daisyId ?? null;

      if (newId !== s.hoveredId) {
        if (s.hoveredId && s.daisyGroups[s.hoveredId]) {
          s.daisyGroups[s.hoveredId].group.scale.setScalar(1);
        }
        s.hoveredId = newId;
        renderer.domElement.style.cursor = newId ? "pointer" : "default";
      }

      if (newId && s.daisyGroups[newId]) {
        s.daisyGroups[newId].group.scale.setScalar(1.14);
        if (hit.userData.role === "post") {
          const conf = confRef.current[hit.userData.confIdx];
          if (conf) {
            const wp = new THREE.Vector3();
            s.daisyGroups[newId].group.getWorldPosition(wp);
            wp.y += s.daisyGroups[newId].group.userData.targetSize ?? 2;
            const proj = wp.clone().project(camera);
            const r = renderer.domElement.getBoundingClientRect();
            setTooltip({
              x: (proj.x * 0.5 + 0.5) * r.width,
              y: (-proj.y * 0.5 + 0.5) * r.height,
              text: conf.message?.substring(0, 100) + (conf.message?.length > 100 ? "…" : ""),
              username: conf.userId?.username || "anon",
              role: "post",
            });
          }
        } else {
          setTooltip({
            role: hit.userData.role,
            label: hit.userData.role === "compose" ? "✦ plant a confession" : "⌘ your profile",
          });
        }
      } else {
        setTooltip(null);
      }
    };

    const onClick = (e) => {
      toNDC(e.clientX, e.clientY);
      const hit = raycastDaisy();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") onCompose?.();
      else if (role === "profile") onProfile?.();
      else if (role === "post") {
        const conf = confRef.current[confIdx];
        if (conf) onPostClick?.(conf._id);
      }
    };

    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      toNDC(t.clientX, t.clientY);
      const hit = raycastDaisy();
      if (!hit) return;
      const { role, confIdx } = hit.userData;
      if (role === "compose") onCompose?.();
      else if (role === "profile") onProfile?.();
      else if (role === "post") {
        const conf = confRef.current[confIdx];
        if (conf) onPostClick?.(conf._id);
      }
    };

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    // ── Animation loop ────────────────────────────────────────────────────────
    const animate = () => {
      s.frame = requestAnimationFrame(animate);
      s.time += 0.009;
      const now = performance.now();

      // Update particles
      if (s.particles) {
        const { positions, velocities, count, geo } = s.particles;
        for (let i = 0; i < count; i++) {
          const v = velocities[i];
          positions[i * 3]     += v.x + Math.sin(s.time * 0.5 + v.phase) * 0.003;
          positions[i * 3 + 1] += v.y + Math.sin(s.time + v.phase) * 0.002;
          positions[i * 3 + 2] += v.z;
          // Wrap
          if (positions[i * 3 + 1] > 5) positions[i * 3 + 1] = 0.2;
          if (Math.abs(positions[i * 3]) > 10) positions[i * 3] *= -0.9;
          if (Math.abs(positions[i * 3 + 2]) > 8) positions[i * 3 + 2] *= -0.9;
        }
        geo.attributes.position.needsUpdate = true;
        s.particles.mesh.material.opacity = 0.4 + Math.sin(s.time * 0.5) * 0.2;
      }

      // Daisy animations
      Object.entries(s.daisyGroups).forEach(([id, data]) => {
        const { group, bloomStart, bloomDone, isBg, swayPhase, swaySpeed } = data;

        // Bloom
        if (!bloomDone) {
          const elapsed = now - bloomStart;
          if (elapsed >= 0) {
            const t = Math.min(elapsed / 1800, 1);
            const sc = isBg ? easeOutCubic(t) : easeOutElastic(t);
            if (!isBg && s.hoveredId === id) {
              // keep hover scale
            } else {
              group.scale.setScalar(Math.max(sc, 0.01));
            }
            if (t >= 1) data.bloomDone = true;
          }
        }

        // Sway
        const sp = swayPhase ?? 0;
        const ss = swaySpeed ?? 0.7;
        group.rotation.z = Math.sin(s.time * ss + sp) * 0.035;
        group.rotation.x = Math.cos(s.time * ss * 0.65 + sp) * 0.018;

        // Glow pulse (interactive only)
        if (!isBg && group.userData.glow) {
          const isHov = s.hoveredId === id;
          group.userData.glow.intensity = isHov
            ? 1.8 + Math.sin(s.time * 4) * 0.6
            : 0.4 + Math.sin(s.time * 1.5 + (group.userData.swayPhase ?? 0)) * 0.25;
        }
      });

      // Subtle camera drift — very slow, small amplitude so raycasting stays accurate
      camera.position.x = Math.sin(s.time * 0.06) * 0.5;
      camera.position.y = 5.5 + Math.sin(s.time * 0.04) * 0.2;
      camera.lookAt(0, 1.2, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(s.frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Tooltip / label */}
      {tooltip && tooltip.role === "post" && (
        <div style={{
          position: "absolute",
          left: tooltip.x, top: tooltip.y - 100,
          transform: "translateX(-50%)",
          background: "rgba(4,14,3,0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,220,0.18)",
          borderRadius: "14px", padding: "12px 16px",
          maxWidth: "230px", pointerEvents: "none", zIndex: 100,
          fontFamily: "Georgia, serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <p style={{ color: "rgba(255,238,136,0.65)", fontSize: "10px", margin: "0 0 5px", letterSpacing: "0.12em" }}>
            @{tooltip.username}
          </p>
          <p style={{ color: "rgba(255,255,220,0.9)", fontSize: "12px", margin: 0, lineHeight: 1.6 }}>
            {tooltip.text}
          </p>
        </div>
      )}

      {tooltip && tooltip.role !== "post" && (
        <div style={{
          position: "absolute", bottom: "14%", left: "50%",
          transform: "translateX(-50%)",
          color: tooltip.role === "compose" ? "rgba(255,238,136,0.85)" : "rgba(136,210,255,0.85)",
          fontSize: "13px", letterSpacing: "0.15em",
          pointerEvents: "none", fontFamily: "Georgia, serif",
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        }}>
          {tooltip.label}
        </div>
      )}

      {/* Deep vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 70% at 50% 55%, transparent 30%, rgba(3,8,2,0.65) 75%, rgba(2,5,1,0.9) 100%)",
      }} />

      {/* Top fade */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "15%",
        pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(3,8,2,0.7), transparent)",
      }} />

      {/* Watermark */}
      <div style={{
        position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
        color: "rgba(255,255,220,0.14)", fontSize: "10px", letterSpacing: "0.4em",
        textTransform: "uppercase", pointerEvents: "none", fontFamily: "Georgia, serif",
      }}>
        confession wall
      </div>
    </div>
  );
}
