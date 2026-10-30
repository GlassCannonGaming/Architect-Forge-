import * as THREE from 'three';
import {
  PlacedAsset,
  TexturePresetId,
  CharacterAppearance
} from './rules';

const textureCache = new Map<string, { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }>();

export function getProceduralMaterialTextures(
  preset: TexturePresetId,
  maxAnisotropy = 4
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (textureCache.has(preset)) {
    return textureCache.get(preset)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base fill
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  if (preset === 'nyc_old_brick') {
    ctx.fillStyle = '#382c26'; // Mortar
    ctx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = '#303030';
    bCtx.fillRect(0, 0, 256, 256);

    const rows = 8;
    const cols = 4;
    const brickH = 256 / rows;
    const brickW = 256 / cols;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (brickW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * brickW + offset;
        const y = r * brickH;
        const shade = ((r * 7 + c * 13) % 24) - 12;
        const red = Math.min(255, Math.max(90, 142 + shade));
        const green = Math.min(255, Math.max(35, 56 + Math.floor(shade * 0.5)));
        const blue = Math.min(255, Math.max(25, 42 + Math.floor(shade * 0.4)));
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);

        bCtx.fillStyle = '#d0d0d0';
        bCtx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);
      }
    }
  } else if (preset === 'checker_marble') {
    const tiles = 4;
    const size = 256 / tiles;
    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const isDark = (r + c) % 2 === 0;
        ctx.fillStyle = isDark ? '#3f3a34' : '#d6d1c7';
        ctx.fillRect(c * size, r * size, size, size);
        bCtx.fillStyle = isDark ? '#909090' : '#b0b0b0';
        bCtx.fillRect(c * size + 1, r * size + 1, size - 2, size - 2);
      }
    }
  } else if (preset === 'oak_parquet') {
    ctx.fillStyle = '#5c3824';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) {
      const y = i * 16;
      ctx.fillStyle = i % 2 === 0 ? '#69412a' : '#52301d';
      ctx.fillRect(0, y, 256, 14);
      bCtx.fillStyle = '#a8a8a8';
      bCtx.fillRect(0, y, 256, 14);
    }
  } else if (preset === 'wallpaper_damask') {
    ctx.fillStyle = '#233529';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#3c5a45';
    ctx.lineWidth = 3;
    for (let x = 32; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  } else if (preset === 'velvet_crimson') {
    ctx.fillStyle = '#6e1414';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 232);
  } else if (preset === 'aged_brass') {
    ctx.fillStyle = '#b48a3e';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(8, 8, 240, 240);
  } else {
    // plaster_cream or industrial_concrete
    ctx.fillStyle = preset === 'industrial_concrete' ? '#52525b' : '#ded8ce';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#5c3824';
    ctx.fillRect(0, 196, 256, 60); // Wainscoting band at bottom
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  const entry = { map, bumpMap };
  textureCache.set(preset, entry);
  return entry;
}

/**
 * Creates a soft radial contact shadow plane placed at bottom-center (y = 0.015)
 */
export function createContactShadowDisc(radiusX: number, radiusZ: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.5, 20);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x050505,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(radiusX * 1.9, 1, radiusZ * 1.9);
  mesh.position.y = 0.015;
  return mesh;
}

/**
 * Builds a composite 3-12 part procedural 3D Group for any hotel architectural or furniture asset.
 * Pivoted cleanly so the group's position matches its world placement while parts have distinct roughness/metalness.
 */
export function buildAssetMeshGroup(
  asset: PlacedAsset,
  maxAnisotropy = 4,
  isSelected = false
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { assetId: asset.id, asset };

  const [w, h, d] = asset.dimensions;
  const { map, bumpMap } = getProceduralMaterialTextures(asset.textureId, maxAnisotropy);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(asset.color || '#ffffff'),
    map,
    bumpMap,
    bumpScale: 0.03,
    roughness: asset.textureId === 'aged_brass' ? 0.28 : 0.78,
    metalness: asset.textureId === 'aged_brass' ? 0.82 : 0.12
  });

  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3e2415,
    roughness: 0.5,
    metalness: 0.18
  });

  const brassAccentMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.88
  });

  // Custom AI / Meshy Composite Parts
  if (asset.compositeParts && asset.compositeParts.length > 0) {
    asset.compositeParts.forEach((part) => {
      let geo: THREE.BufferGeometry;
      const [sx, sy, sz] = part.size;
      if (part.shape === 'cylinder') {
        geo = new THREE.CylinderGeometry(sx, sx, sy, 16);
      } else if (part.shape === 'sphere') {
        geo = new THREE.SphereGeometry(sx, 16, 12);
      } else if (part.shape === 'cone') {
        geo = new THREE.ConeGeometry(sx, sy, 16);
      } else if (part.shape === 'torus') {
        geo = new THREE.TorusGeometry(sx, sy, 10, 20);
      } else {
        geo = new THREE.BoxGeometry(sx, sy, sz);
      }
      const pMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(part.color),
        roughness: part.roughness,
        metalness: part.metalness,
        emissive: part.emissive ? new THREE.Color(part.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: part.emissive ? 0.6 : 0
      });
      const mesh = new THREE.Mesh(geo, pMat);
      mesh.position.set(part.offset[0], part.offset[1] - h / 2, part.offset[2]);
      if (part.rotation) {
        mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
  } else if (asset.category === 'wall' || asset.category === 'window_wall') {
    // 1. Main wall body
    const bodyGeo = new THREE.BoxGeometry(w, h * 0.88, d);
    const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Baseboard plinth (secondary silhouette)
    const baseGeo = new THREE.BoxGeometry(w + 0.04, h * 0.1, d + 0.05);
    const baseMesh = new THREE.Mesh(baseGeo, trimWoodMat);
    baseMesh.position.y = -h / 2 + (h * 0.1) / 2;
    group.add(baseMesh);

    // 3. Crown cornice molding (top accent)
    const crownGeo = new THREE.BoxGeometry(w + 0.04, h * 0.07, d + 0.06);
    const crownMesh = new THREE.Mesh(crownGeo, trimWoodMat);
    crownMesh.position.y = h / 2 - (h * 0.07) / 2;
    group.add(crownMesh);

    // 4. Optional casement window frame
    if (asset.category === 'window_wall') {
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.15,
        metalness: 0.6,
        emissive: 0x0c4a6e,
        emissiveIntensity: 0.35
      });
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.48, d + 0.04), glassMat);
      pane.position.y = h * 0.06;
      group.add(pane);
    }
  } else if (asset.category === 'secret_wall' || asset.category === 'door') {
    // Secret bookshelf door or suite door with frame, shelves/panels, and brass latch
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.94, d * 0.75), primaryMat);
    doorPanel.castShadow = true;
    group.add(doorPanel);

    // Left & Right Jambs
    const jambGeo = new THREE.BoxGeometry(w * 0.08, h, d * 1.15);
    const leftJamb = new THREE.Mesh(jambGeo, trimWoodMat);
    leftJamb.position.x = -w * 0.46;
    const rightJamb = new THREE.Mesh(jambGeo, trimWoodMat);
    rightJamb.position.x = w * 0.46;
    group.add(leftJamb, rightJamb);

    // Bookshelf ledges or door molding + brass handle
    for (let s = -1; s <= 1; s++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.07, d * 0.95), trimWoodMat);
      shelf.position.y = s * (h * 0.25);
      group.add(shelf);
    }
    const latch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, d + 0.12, 12), brassAccentMat);
    latch.rotation.x = Math.PI / 2;
    latch.position.set(w * 0.32, 0, 0);
    group.add(latch);

    // If secret passage is open, swing/slide the panel aside visually!
    if (asset.isOpen) {
      doorPanel.position.x = w * 0.72;
      doorPanel.rotation.y = Math.PI / 2.4;
    }
  } else if (asset.subType === 'four_poster_bed') {
    // 5-part composite canopy bed
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.28, d), trimWoodMat);
    frame.position.y = -h * 0.32;
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.24, d * 0.9), primaryMat);
    mattress.position.y = -h * 0.12;
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.75, h * 0.14, d * 0.22),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85, metalness: 0.05 })
    );
    pillow.position.set(0, h * 0.05, -d * 0.32);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.85, 0.14), trimWoodMat);
    headboard.position.set(0, h * 0.06, -d * 0.46);
    group.add(frame, mattress, pillow, headboard);

    // 4 Brass Corner Finials
    [
      [-w * 0.46, -d * 0.46],
      [w * 0.46, -d * 0.46],
      [-w * 0.46, d * 0.46],
      [w * 0.46, d * 0.46]
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 10), brassAccentMat);
      post.position.set(px, 0, pz);
      group.add(post);
    });
  } else if (asset.subType === 'reception_desk') {
    // Multi-part concierge desk with counter, brass bell, ledger book, and key rack
    const counterHull = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.88, d * 0.88), primaryMat);
    counterHull.position.y = -h * 0.06;
    const topSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h * 0.12, d + 0.1), trimWoodMat);
    topSlab.position.y = h * 0.44;
    const ledger = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6, metalness: 0.2 })
    );
    ledger.position.set(-0.35, h * 0.52, 0.1);
    const callBell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), brassAccentMat);
    callBell.position.set(0.45, h * 0.54, 0.15);
    group.add(counterHull, topSlab, ledger, callBell);
  } else if (asset.category === 'lighting') {
    // Banker's Desk & Emerald Glowing Lamp
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.12, d), trimWoodMat);
    deskTop.position.y = h * 0.1;
    const leftPedestal = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, h * 0.65, d * 0.88), trimWoodMat);
    leftPedestal.position.set(-w * 0.36, -h * 0.18, 0);
    const rightPedestal = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, h * 0.65, d * 0.88), trimWoodMat);
    rightPedestal.position.set(w * 0.36, -h * 0.18, 0);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.36, 10), brassAccentMat);
    lampStem.position.set(0, h * 0.32, -0.1);
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.18, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(asset.color),
        emissive: new THREE.Color(asset.color),
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.3
      })
    );
    lampShade.position.set(0, h * 0.48, -0.1);
    group.add(deskTop, leftPedestal, rightPedestal, lampStem, lampShade);
  } else if (asset.category === 'floor_tile') {
    // Offset carpet/floor tile with gold fringe border
    const rugMesh = new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.04, h), d), primaryMat);
    const borderMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, Math.max(0.02, h * 0.6), d + 0.08), brassAccentMat);
    borderMesh.position.y = -0.008;
    group.add(borderMesh, rugMesh);
  } else {
    // Appliances (Radiator, Icebox, Switchboard) with multi-part silhouettes
    const hull = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.88, d * 0.9), primaryMat);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.1, d), brassAccentMat);
    cap.position.y = h * 0.44;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), brassAccentMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, h * 0.18, d * 0.46);
    group.add(hull, cap, dial);
  }

  // Selection outline wireframe box in ArchitectForge mode
  if (isSelected) {
    const selBox = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true
      })
    );
    group.add(selBox);
  }

  group.position.set(asset.position[0], asset.position[1], asset.position[2]);
  group.rotation.y = asset.rotationY;

  return group;
}

/**
 * Builds the blocky-headed low-poly Chibi Character Mesh (matching toonbuilder_af91be6a.jpeg)
 * with 8+ composite parts: head, hair/hat, left/right eyes, ears, mouth, torso, limbs, and optional pedestal base.
 */
export function buildCharacterToonGroup(
  appearance: CharacterAppearance,
  includePedestal = false
): THREE.Group {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinColor || '#f3d9c4'),
    roughness: 0.65,
    metalness: 0.08
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.hairColor || '#451a03'),
    roughness: 0.75,
    metalness: 0.12
  });
  const outfitMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.outfitColor || '#78350f'),
    roughness: 0.7,
    metalness: 0.15
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.accentColor || '#eab308'),
    roughness: 0.28,
    metalness: 0.82
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.45,
    metalness: 0.3
  });

  const actorGroup = new THREE.Group();
  actorGroup.scale.set(
    appearance.widthScale || 1,
    appearance.heightScale || 1,
    appearance.widthScale || 1
  );

  // 1. Contact shadow disc
  actorGroup.add(createContactShadowDisc(0.45, 0.45));

  // 2. Boots / Legs (y = 0 to 0.36)
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.2), bootMat);
  leftLeg.position.set(-0.14, 0.18, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.2), bootMat);
  rightLeg.position.set(0.14, 0.18, 0);
  actorGroup.add(leftLeg, rightLeg);

  // 3. Torso Tunic + Brass Belt Buckle (y = 0.36 to 0.92)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.34), outfitMat);
  torso.position.set(0, 0.64, 0);
  torso.castShadow = true;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.36), bootMat);
  belt.position.set(0, 0.44, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.38), accentMat);
  buckle.position.set(0, 0.44, 0);
  actorGroup.add(torso, belt, buckle);

  // 4. Arms & Hands
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.18), outfitMat);
  leftArm.position.set(-0.37, 0.64, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.18), outfitMat);
  rightArm.position.set(0.37, 0.64, 0);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skinMat);
  leftHand.position.set(-0.37, 0.38, 0);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skinMat);
  rightHand.position.set(0.37, 0.38, 0);
  actorGroup.add(leftArm, rightArm, leftHand, rightHand);

  // 5. Chibi Blocky Head Group (matching toonbuilder_af91be6a.jpeg proportions)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.32, 0);
  const hs = appearance.headScale || 1.08;
  headGroup.scale.set(hs, hs, hs);

  const headW = appearance.headShape === 'tall_noir' ? 0.68 : 0.84;
  const headH = appearance.headShape === 'tall_noir' ? 0.76 : 0.66;
  const headBox = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, 0.64), skinMat);
  headBox.castShadow = true;
  headGroup.add(headBox);

  // Ears
  const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat);
  leftEar.position.set(-headW / 2 - 0.04, -0.02, 0);
  const rightEar = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat);
  rightEar.position.set(headW / 2 + 0.04, -0.02, 0);
  headGroup.add(leftEar, rightEar);

  // Eyes
  const eyeColor =
    appearance.eyeStyle === 'hollow_glow'
      ? 0x38bdf8
      : appearance.eyeStyle === 'wide_amber'
      ? 0xb45309
      : 0x18181b;
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: appearance.eyeStyle === 'hollow_glow' ? 0x0284c7 : 0x000000,
    emissiveIntensity: 0.6,
    roughness: 0.2
  });
  const eyeH = appearance.eyeStyle === 'narrow_suspicious' ? 0.06 : 0.14;
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, eyeH, 0.05), eyeMat);
  leftEye.position.set(-0.18, 0.02, 0.33);
  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, eyeH, 0.05), eyeMat);
  rightEye.position.set(0.18, 0.02, 0.33);
  headGroup.add(leftEye, rightEye);

  // Eyebrows
  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.05), hairMat);
  leftBrow.position.set(-0.18, 0.14, 0.33);
  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.05), hairMat);
  rightBrow.position.set(0.18, 0.14, 0.33);
  if (appearance.eyeStyle === 'narrow_suspicious') {
    leftBrow.rotation.z = -0.18;
    rightBrow.rotation.z = 0.18;
  }
  headGroup.add(leftBrow, rightBrow);

  // Dynamic 3D Mouth Mesh (slight_smirk, nervous_frown, stitched_grin, calm_neutral)
  const mouthMat = new THREE.MeshStandardMaterial({
    color: appearance.mouthStyle === 'stitched_grin' ? 0x18181b : 0x7c2d12,
    roughness: 0.5
  });
  const mouthWidth = appearance.mouthStyle === 'stitched_grin' ? 0.26 : 0.16;
  const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(mouthWidth, 0.035, 0.05), mouthMat);
  mouthMesh.position.set(0, -0.14, 0.33);
  if (appearance.mouthStyle === 'slight_smirk') {
    mouthMesh.rotation.z = 0.16;
  } else if (appearance.mouthStyle === 'nervous_frown') {
    mouthMesh.rotation.z = -0.14;
  }
  headGroup.add(mouthMesh);

  // Hair / Hat Cap
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(headW + 0.06, 0.24, 0.68), hairMat);
  hairCap.position.set(0, headH / 2 - 0.04, 0);
  headGroup.add(hairCap);

  if (appearance.hairStyle === 'bowler_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.05, 16), bootMat);
    brim.position.set(0, headH / 2 + 0.08, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), bootMat);
    dome.position.set(0, headH / 2 + 0.18, 0);
    headGroup.add(brim, dome);
  } else {
    // Swept bangs
    const bang = new THREE.Mesh(new THREE.BoxGeometry(headW * 0.75, 0.12, 0.1), hairMat);
    bang.position.set(0.05, headH / 2 - 0.14, 0.32);
    bang.rotation.z = -0.12;
    headGroup.add(bang);
  }

  actorGroup.add(headGroup);

  if (includePedestal) {
    // Diorama Pedestal Block from toonbuilder_af91be6a.jpeg with sprouts and pebbles
    const pedBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.26, 1.55),
      new THREE.MeshStandardMaterial({ color: 0x5c3824, roughness: 0.75, metalness: 0.15 })
    );
    pedBase.position.y = -0.21;
    const pedSoil = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.14, 1.48),
      new THREE.MeshStandardMaterial({ color: 0xa1885c, roughness: 0.85, metalness: 0.05 })
    );
    pedSoil.position.y = -0.05;

    const sproutMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.6 });
    const sprout1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6), sproutMat);
    sprout1.position.set(-0.52, 0.11, -0.45);
    const sprout2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), sproutMat);
    sprout2.position.set(0.48, 0.09, 0.46);
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09, 0),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 })
    );
    pebble.position.set(0.52, 0.05, -0.38);

    root.add(pedBase, pedSoil, sprout1, sprout2, pebble);
  }

  root.add(actorGroup);
  return root;
}

/**
 * Builds the T-Pose Architectural Scale Reference Mannequin (matching w_alls_with_t-pose_-modular-environments-03_a620f39c.jpg)
 */
export function buildTPoseScaleMannequin(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.25
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.6,
    metalness: 0.4
  });

  // Legs
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.85, 10), mat);
  leftLeg.position.set(-0.14, 0.42, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.85, 10), mat);
  rightLeg.position.set(0.14, 0.42, 0);
  // Pelvis & Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.22), mat);
  torso.position.set(0, 1.15, 0);
  // Outstretched T-Pose Arms
  const arms = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.48, 10), mat);
  arms.rotation.z = Math.PI / 2;
  arms.position.set(0, 1.38, 0);
  // Shoulder joints
  const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), jointMat);
  leftShoulder.position.set(-0.24, 1.38, 0);
  const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), jointMat);
  rightShoulder.position.set(0.24, 1.38, 0);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), mat);
  head.scale.set(0.85, 1.1, 0.9);
  head.position.set(0, 1.66, 0);

  group.add(createContactShadowDisc(0.4, 0.4), leftLeg, rightLeg, torso, arms, leftShoulder, rightShoulder, head);
  return group;
}
