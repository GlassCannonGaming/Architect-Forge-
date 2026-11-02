import * as THREE from 'three';
import {
  PlacedAsset,
  TexturePresetId,
  AssetConditionVariant,
  CharacterAppearance,
  buildProcedural3DSpecFromPrompt,
  weatherAssetToLate70sStyle,
  resolveAssetConditionVariant,
  isUnkemptOrAgedAsset,
  computeAssetInteractionVisualState,
  computeAssetHingeAnimationState,
  SkeletonPoseEuler,
  FacialRigParams,
  computeFacialRigParams
} from './rules';

const textureCache = new Map<string, { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }>();

const SPECIALIZED_70S_SUBTYPES = new Set<string>([
  'crt_tv_vhs_combo',
  'soda_vending_machine',
  'concierge_crt_computer',
  'retro_teal_armchair',
  'lobby_payphone_booth',
  'porcelain_bathtub',
  'marble_vanity_sink',
  'suite_porcelain_toilet',
  'gilded_wall_painting',
  'potted_lobby_palm',
  'brass_towel_rack',
  'retrofit_window_ac',
  'resident_kitchenette',
  'resident_steamer_trunk',
  'investigator_notebook_prop',
  'microcassette_player_prop',
  'chrome_dcell_flashlight_prop',
  'evidence_corkboard_prop',
  'master_skeleton_keyring_prop'
]);

export function getProceduralMaterialTextures(
  preset: TexturePresetId,
  maxAnisotropy = 4,
  conditionVariant: AssetConditionVariant = 'pristine'
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const cacheKey = `${preset}__${conditionVariant}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
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
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, 256, 256);

  if (preset === 'nyc_old_brick') {
    ctx.fillStyle = '#241b17'; // Cracked dark soot mortar
    ctx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = '#242424';
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
        const shade = ((r * 7 + c * 13) % 22) - 11;
        const red = Math.min(255, Math.max(55, 92 + shade));
        const green = Math.min(255, Math.max(22, 40 + Math.floor(shade * 0.45)));
        const blue = Math.min(255, Math.max(18, 32 + Math.floor(shade * 0.35)));
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);

        bCtx.fillStyle = '#c4c4c4';
        bCtx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6);
      }
    }
    // Soot & damp water-damage vertical streaks
    ctx.fillStyle = 'rgba(15, 12, 10, 0.28)';
    ctx.fillRect(28, 0, 36, 256);
    ctx.fillRect(156, 40, 44, 216);
  } else if (preset === 'checker_marble') {
    const tiles = 4;
    const size = 256 / tiles;
    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const isDark = (r + c) % 2 === 0;
        // Yellowed 1970s ecru linoleum & scuffed charcoal-slate tile
        ctx.fillStyle = isDark ? '#26231f' : '#8f8776';
        ctx.fillRect(c * size, r * size, size, size);
        bCtx.fillStyle = isDark ? '#787878' : '#9c9c9c';
        bCtx.fillRect(c * size + 1, r * size + 1, size - 2, size - 2);
      }
    }
    // Scuff & grime overlay
    ctx.fillStyle = 'rgba(28, 24, 18, 0.22)';
    ctx.fillRect(0, 96, 256, 48);
  } else if (preset === 'oak_parquet') {
    ctx.fillStyle = '#331d10';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) {
      const y = i * 16;
      ctx.fillStyle = i % 2 === 0 ? '#3d2415' : '#2b180d';
      ctx.fillRect(0, y, 256, 14);
      bCtx.fillStyle = '#9a9a9a';
      bCtx.fillRect(0, y, 256, 14);
    }
  } else if (preset === 'wallpaper_damask') {
    // Faded late-70s avocado-olive & harvest-ochre peeling wallpaper
    ctx.fillStyle = '#262e22';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#4d4329';
    ctx.lineWidth = 3;
    for (let x = 32; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    // Water stain patch near top and bottom
    ctx.fillStyle = 'rgba(24, 20, 14, 0.34)';
    ctx.fillRect(0, 0, 256, 38);
    ctx.fillRect(80, 175, 110, 81);
  } else if (preset === 'velvet_crimson') {
    // Threadbare dried-oxblood corridor runner
    ctx.fillStyle = '#3d1417';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#5c3b1e';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 232);
  } else if (preset === 'aged_brass') {
    // Tarnished antique brass / oxidized bronze
    ctx.fillStyle = '#473820';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#635030';
    ctx.fillRect(8, 8, 240, 240);
  } else {
    // plaster_cream (nicotine-stained beige plaster) or industrial_concrete (damp cellar slate)
    ctx.fillStyle = preset === 'industrial_concrete' ? '#36383b' : '#8f8777';
    ctx.fillRect(0, 0, 256, 256);
    // Damp water stain band
    ctx.fillStyle = 'rgba(38, 32, 24, 0.18)';
    ctx.fillRect(0, 0, 256, 36);
    ctx.fillStyle = '#2e1b0f';
    ctx.fillRect(0, 196, 256, 60); // Dark walnut wainscoting band at bottom
  }

  // Condition Variant Procedural Weathering Re-Texture Pass ('pristine' | 'unkempt' | 'updated')
  if (conditionVariant === 'unkempt') {
    // Heavy grime, soot streaks, damp water rings & pitted surface relief
    ctx.fillStyle = 'rgba(18, 14, 10, 0.32)';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(10, 8, 6, 0.38)';
    ctx.fillRect(18, 0, 28, 256);
    ctx.fillRect(112, 34, 46, 222);
    ctx.fillRect(198, 0, 24, 190);
    ctx.strokeStyle = 'rgba(8, 6, 4, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(42, 16);
    ctx.lineTo(68, 95);
    ctx.lineTo(54, 188);
    ctx.stroke();

    bCtx.fillStyle = '#383838';
    bCtx.fillRect(18, 24, 44, 96);
    bCtx.fillRect(134, 88, 68, 114);
  } else if (conditionVariant === 'updated') {
    // 1990s Hotel Commercial Renovation: cleaner satin finish, muted cool-teal/mauve hospitality sheen
    ctx.fillStyle = 'rgba(220, 232, 236, 0.14)';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(42, 107, 108, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 244, 244);

    bCtx.fillStyle = '#888888';
    bCtx.fillRect(8, 8, 240, 240);
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
  textureCache.set(cacheKey, entry);
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
    opacity: 0.52,
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
  rawAsset: PlacedAsset,
  maxAnisotropy = 4,
  isSelected = false
): THREE.Group {
  const conditionVariant = resolveAssetConditionVariant(rawAsset);
  const asset = weatherAssetToLate70sStyle(rawAsset, rawAsset.conditionVariant);
  const interactionState = computeAssetInteractionVisualState(asset);
  const unkemptAged = isUnkemptOrAgedAsset(asset);

  const group = new THREE.Group();
  group.userData = {
    assetId: asset.id,
    asset,
    conditionVariant,
    isUnkemptOrAged: unkemptAged,
    interactionState
  };

  const [w, h, d] = asset.dimensions;
  const { map, bumpMap } = getProceduralMaterialTextures(
    asset.textureId,
    maxAnisotropy,
    conditionVariant
  );

  const baseRoughness =
    conditionVariant === 'unkempt'
      ? 0.94
      : conditionVariant === 'updated'
      ? 0.54
      : asset.textureId === 'aged_brass'
      ? 0.42
      : 0.82;

  const baseMetalness =
    conditionVariant === 'unkempt'
      ? 0.06
      : conditionVariant === 'updated'
      ? 0.24
      : asset.textureId === 'aged_brass'
      ? 0.68
      : 0.1;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(asset.color || '#8a8170'),
    map,
    bumpMap,
    bumpScale: conditionVariant === 'unkempt' ? 0.055 : conditionVariant === 'updated' ? 0.018 : 0.035,
    roughness: baseRoughness,
    metalness: baseMetalness
  });

  const trimWoodMat = new THREE.MeshStandardMaterial({
    color: conditionVariant === 'updated' ? 0x1e242b : 0x26160c,
    roughness: conditionVariant === 'unkempt' ? 0.85 : 0.68,
    metalness: 0.12
  });

  const brassAccentMat = new THREE.MeshStandardMaterial({
    color: conditionVariant === 'updated' ? 0x64748b : 0x6b5634,
    roughness: conditionVariant === 'unkempt' ? 0.62 : 0.38,
    metalness: 0.75
  });

  // Automatically synthesize multi-part 3D geometry for specialized late-70s/early-80s catalog fixtures
  const resolvedCompositeParts =
    asset.compositeParts && asset.compositeParts.length > 0
      ? asset.compositeParts
      : SPECIALIZED_70S_SUBTYPES.has(asset.subType)
      ? buildProcedural3DSpecFromPrompt(asset.name || asset.subType).parts
      : undefined;

  let hasDedicatedScreenPart = false;

  // Custom AI / Meshy / Resolved Late-70s Composite Parts
  if (resolvedCompositeParts && resolvedCompositeParts.length > 0) {
    resolvedCompositeParts.forEach((part) => {
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

      const partNameLower = (part.id || '').toLowerCase();
      const isScreenPart =
        partNameLower.includes('screen') ||
        partNameLower.includes('crt') ||
        partNameLower.includes('tube') ||
        partNameLower.includes('display') ||
        partNameLower.includes('glass');

      let partColorHex = part.color;
      let partEmissiveHex = part.emissive || '#000000';
      let partEmissiveIntensity = part.emissive ? 0.45 : 0;

      if (interactionState.interactionKind === 'tv_screen' && isScreenPart) {
        hasDedicatedScreenPart = true;
        if (interactionState.isActivated) {
          partColorHex = '#ffffff';
          partEmissiveHex = '#ffffff';
          partEmissiveIntensity = 1.45;
        }
      } else if (interactionState.isActivated && part.emissive) {
        partEmissiveHex = interactionState.screenEmissiveHex;
        partEmissiveIntensity = interactionState.emissiveIntensity;
      }

      const pMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(partColorHex),
        roughness: part.roughness,
        metalness: part.metalness,
        emissive: new THREE.Color(partEmissiveHex),
        emissiveIntensity: partEmissiveIntensity
      });
      const mesh = new THREE.Mesh(geo, pMat);
      mesh.userData = { isTvScreen: isScreenPart && interactionState.interactionKind === 'tv_screen' };
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

    // 4. Grimy nocturnal casement window frame with dim sodium-vapor amber streetlight glow
    if (asset.category === 'window_wall') {
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x2b353b,
        roughness: 0.32,
        metalness: 0.45,
        emissive: 0x4a351d,
        emissiveIntensity: 0.28
      });
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.48, d + 0.04), glassMat);
      pane.position.y = h * 0.06;
      group.add(pane);
    }
  } else if (asset.category === 'secret_wall' || asset.category === 'door' || asset.isSecretPassage) {
    // Left & Right Stationary Jambs
    const jambGeo = new THREE.BoxGeometry(w * 0.08, h, d * 1.15);
    const leftJamb = new THREE.Mesh(jambGeo, trimWoodMat);
    leftJamb.position.x = -w * 0.46;
    const rightJamb = new THREE.Mesh(jambGeo, trimWoodMat);
    rightJamb.position.x = w * 0.46;
    group.add(leftJamb, rightJamb);

    // Proposal 2: Apply initial or in-flight 500ms hinge/pocket-slide state ('right_hinge' | 'left_hinge' | 'pocket_slide')
    const hingeState = computeAssetHingeAnimationState(asset, Date.now());
    const hingeX = hingeState.hingeEdgeX;

    const hingePivot = new THREE.Group();
    hingePivot.name = 'hingePivot';
    hingePivot.position.set(hingeX + hingeState.slideOffsetX, 0, 0);

    // Swinging or pocket-sliding door / secret bookshelf panel
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, h * 0.94, d * 0.75),
      primaryMat
    );
    doorPanel.position.x = -hingeX;
    doorPanel.castShadow = true;
    hingePivot.add(doorPanel);

    // Bookshelf ledges or door molding + brass handle mounted to the swinging/sliding assembly
    const shelves: THREE.Mesh[] = [];
    for (let s = -1; s <= 1; s++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.07, d * 0.95), trimWoodMat);
      shelf.position.set(-hingeX, s * (h * 0.25), 0);
      hingePivot.add(shelf);
      shelves.push(shelf);
    }
    const latch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, d + 0.12, 12),
      brassAccentMat
    );
    latch.rotation.x = Math.PI / 2;
    const latchOffsetFromCenter = hingeState.swingMode === 'left_hinge' ? w * 0.32 : -w * 0.32;
    latch.position.set(-hingeX + latchOffsetFromCenter, 0, 0);
    hingePivot.add(latch);

    hingePivot.rotation.y = hingeState.angleRad;

    group.add(hingePivot);
    group.userData.hingePivot = hingePivot;
    group.userData.doorPanel = doorPanel;
    group.userData.shelves = shelves;
    group.userData.latch = latch;
    group.userData.assetWidth = w;
  } else if (asset.subType === 'four_poster_bed') {
    // 5-part composite late-70s weathered apartment bed
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.28, d), trimWoodMat);
    frame.position.y = -h * 0.32;
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.24, d * 0.9), primaryMat);
    mattress.position.y = -h * 0.12;
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.75, h * 0.14, d * 0.22),
      new THREE.MeshStandardMaterial({ color: 0x968d7b, roughness: 0.9, metalness: 0.02 })
    );
    pillow.position.set(0, h * 0.05, -d * 0.32);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.85, 0.14), trimWoodMat);
    headboard.position.set(0, h * 0.06, -d * 0.46);
    group.add(frame, mattress, pillow, headboard);

    // 4 Tarnished Corner Posts
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
    // Multi-part night clerk desk with counter, tarnished bell, worn oxblood ledger book, and key rack
    const counterHull = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.88, d * 0.88), primaryMat);
    counterHull.position.y = -h * 0.06;
    const topSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h * 0.12, d + 0.1), trimWoodMat);
    topSlab.position.y = h * 0.44;
    const ledger = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.08, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x4a181b, roughness: 0.78, metalness: 0.1 })
    );
    ledger.position.set(-0.35, h * 0.52, 0.1);
    const callBell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), brassAccentMat);
    callBell.position.set(0.45, h * 0.54, 0.15);
    group.add(counterHull, topSlab, ledger, callBell);
  } else if (asset.category === 'lighting') {
    // Detective's Desk & Faded Avocado Banker's Lamp
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.12, d), trimWoodMat);
    deskTop.position.y = h * 0.1;
    const leftPedestal = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, h * 0.65, d * 0.88), trimWoodMat);
    leftPedestal.position.set(-w * 0.36, -h * 0.18, 0);
    const rightPedestal = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, h * 0.65, d * 0.88), trimWoodMat);
    rightPedestal.position.set(w * 0.36, -h * 0.18, 0);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.36, 10), brassAccentMat);
    lampStem.position.set(0, h * 0.32, -0.1);
    const isLampOn = asset.isActivated !== false;
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.18, 14),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isLampOn ? '#fef3c7' : asset.color),
        emissive: new THREE.Color(isLampOn ? '#fde68a' : '#2a2214'),
        emissiveIntensity: isLampOn ? 1.15 : 0.15,
        roughness: 0.35,
        metalness: 0.25
      })
    );
    lampShade.position.set(0, h * 0.48, -0.1);
    group.add(deskTop, leftPedestal, rightPedestal, lampStem, lampShade);
  } else if (asset.category === 'floor_tile') {
    // Threadbare carpet/floor tile with tarnished border
    const rugMesh = new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.04, h), d), primaryMat);
    const borderMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, Math.max(0.02, h * 0.6), d + 0.08), brassAccentMat);
    borderMesh.position.y = -0.008;
    group.add(borderMesh, rugMesh);
  } else {
    // Appliances (TVs, Radiator, Icebox, Switchboard) with multi-part silhouettes
    const hull = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.88, d * 0.9), primaryMat);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.1, d), brassAccentMat);
    cap.position.y = h * 0.44;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), brassAccentMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(w * 0.28, h * 0.18, d * 0.46);
    group.add(hull, cap, dial);
  }

  // Dedicated Front Screen Glass Panel for TV / Monitor Assets (Turns bright white "ON" when interacted with!)
  if (
    (interactionState.interactionKind === 'tv_screen' ||
      interactionState.interactionKind === 'computer_monitor') &&
    !hasDedicatedScreenPart
  ) {
    const isTv = interactionState.interactionKind === 'tv_screen';
    const screenColor = interactionState.isActivated
      ? isTv
        ? '#ffffff'
        : '#34d399'
      : '#111827';
    const screenEmissive = interactionState.isActivated
      ? isTv
        ? '#ffffff'
        : '#10b981'
      : '#000000';
    const screenMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(screenColor),
      emissive: new THREE.Color(screenEmissive),
      emissiveIntensity: interactionState.isActivated ? 1.45 : 0.05,
      roughness: 0.16,
      metalness: 0.22
    });
    const screenPanel = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.24, w * 0.72), Math.max(0.2, h * 0.58), 0.04),
      screenMat
    );
    screenPanel.name = 'interactiveScreenPanel';
    screenPanel.userData = { isTvScreen: true };
    screenPanel.position.set(-w * 0.05, h * 0.04, d * 0.46);
    group.add(screenPanel);
  }

  // Emit interactive PointLight glow when a TV ("white on"), lamp, computer, or appliance is activated
  if (interactionState.isActivated && interactionState.emitsLight) {
    const activeLight = new THREE.PointLight(
      new THREE.Color(interactionState.lightColorHex),
      interactionState.interactionKind === 'tv_screen' ? 1.35 : 0.9,
      interactionState.interactionKind === 'tv_screen' ? 5.5 : 4.2,
      1.6
    );
    activeLight.position.set(0, h * 0.15, d * 0.65);
    activeLight.name = 'interactiveStateLight';
    group.add(activeLight);
  }

  // Selection outline wireframe box in ArchitectForge mode
  if (isSelected) {
    const selBox = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.12, h + 0.12, d + 0.12),
      new THREE.MeshBasicMaterial({
        color: 0xd97706,
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
/**
 * Builds the Anatomical Human Skeleton Rig with period-accurate 1970s styling,
 * articulated bone hierarchy (Pelvis -> Lumbar -> Thoracic -> Neck -> Head, arms, legs),
 * configurable kyphosis/bent spine for elderly characters (e.g. old lady with dowager's hump),
 * wooden walking cane accessory, and dynamic facial expression rig.
 */
export function buildCharacterToonGroup(
  appearance: CharacterAppearance,
  includePedestal = false
): THREE.Group {
  const root = new THREE.Group();

  const isElderly =
    appearance.archetype === 'Elderly Matron' ||
    (appearance.spineCurvature !== undefined && appearance.spineCurvature >= 20);

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinColor || (isElderly ? '#eed8c7' : '#f3d9c4')),
    roughness: isElderly ? 0.78 : 0.62,
    metalness: 0.05
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.hairColor || (isElderly ? '#d1d5db' : '#451a03')),
    roughness: 0.82,
    metalness: 0.08
  });
  const outfitMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.outfitColor || (isElderly ? '#4b5563' : '#78350f')),
    roughness: 0.72,
    metalness: 0.12
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.accentColor || '#b45309'),
    roughness: 0.35,
    metalness: 0.75
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x221f1d,
    roughness: 0.55,
    metalness: 0.22
  });
  const caneWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3d2010,
    roughness: 0.45,
    metalness: 0.15
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.85
  });
  const shawlMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.outfitColor ? appearance.outfitColor : '#52525b').offsetHSL(0, -0.05, 0.08),
    roughness: 0.88,
    metalness: 0.02
  });

  const actorGroup = new THREE.Group();
  actorGroup.name = 'actorGroup';
  actorGroup.scale.set(
    appearance.widthScale || 1,
    appearance.heightScale || 1,
    appearance.widthScale || 1
  );

  // 1. Contact shadow disc
  actorGroup.add(createContactShadowDisc(0.48, 0.48));

  // 2. Anatomical Skeleton Hierarchy (Multi-Vertebrae Articulated Spine & Contoured Organic Body):
  // Root Pelvis (y = 0.88m)
  const pelvisBone = new THREE.Group();
  pelvisBone.name = 'pelvisBone';
  pelvisBone.position.set(0, 0.88, 0);

  // Sculpted Iliac Pelvis & Hip Contour (organic rounded cylinder + hip flare)
  const pelvisGeom = new THREE.CylinderGeometry(0.155, 0.145, 0.17, 16);
  pelvisGeom.scale(1.12, 1.0, 0.78);
  const pelvisMesh = new THREE.Mesh(pelvisGeom, outfitMat);
  pelvisMesh.position.set(0, 0, 0);
  pelvisMesh.castShadow = true;
  pelvisBone.add(pelvisMesh);

  // Contoured Leather Belt & Tarnished Brass Buckle
  const beltGeom = new THREE.CylinderGeometry(0.16, 0.158, 0.042, 16);
  beltGeom.scale(1.13, 1.0, 0.8);
  const beltMesh = new THREE.Mesh(beltGeom, bootMat);
  beltMesh.position.set(0, 0.055, 0);
  const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.052, 0.025), accentMat);
  buckleMesh.position.set(0, 0.055, 0.125);
  pelvisBone.add(beltMesh, buckleMesh);

  // L1 Lumbar Spine (Lower Back & Tapered Waist)
  const lumbarSpineBone = new THREE.Group();
  lumbarSpineBone.name = 'lumbarSpineBone';
  lumbarSpineBone.position.set(0, 0.085, 0);

  const lumbarGeom = new THREE.CylinderGeometry(0.148, 0.152, 0.14, 16);
  lumbarGeom.scale(1.1, 1.0, 0.76);
  const lumbarMesh = new THREE.Mesh(lumbarGeom, outfitMat);
  lumbarMesh.position.set(0, 0.065, 0);
  lumbarMesh.castShadow = true;
  lumbarSpineBone.add(lumbarMesh);

  // T6 Lower Thoracic Spine (Mid-Back & Lower Ribcage — key pivot for natural kyphosis / bent spine)
  const lowerThoracicBone = new THREE.Group();
  lowerThoracicBone.name = 'lowerThoracicBone';
  lowerThoracicBone.position.set(0, 0.125, 0);

  const lowerThoracicGeom = new THREE.CylinderGeometry(0.165, 0.148, 0.15, 16);
  lowerThoracicGeom.scale(1.14, 1.0, 0.80);
  const lowerThoracicMesh = new THREE.Mesh(lowerThoracicGeom, outfitMat);
  lowerThoracicMesh.position.set(0, 0.07, 0);
  lowerThoracicMesh.castShadow = true;
  lowerThoracicBone.add(lowerThoracicMesh);

  // T1 Upper Thoracic Spine (Upper Ribcage, Pectorals & Scapular Girdle)
  const thoracicSpineBone = new THREE.Group();
  thoracicSpineBone.name = 'thoracicSpineBone';
  thoracicSpineBone.position.set(0, 0.135, 0);

  // Sculpted Anatomical Ribcage / Tailored Coat Torso
  const chestGeom = new THREE.CylinderGeometry(0.182, 0.164, 0.22, 18);
  chestGeom.scale(1.16, 1.0, 0.82);
  const chestMesh = new THREE.Mesh(chestGeom, outfitMat);
  chestMesh.position.set(0, 0.11, 0);
  chestMesh.castShadow = true;
  thoracicSpineBone.add(chestMesh);

  // Tailored Collar, V-Neck Shirt Front & Brass Buttons
  const shirtFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.04, 0.19, 10),
    new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.75 })
  );
  shirtFront.scale.set(1.1, 1.0, 0.35);
  shirtFront.position.set(0, 0.13, 0.138);
  thoracicSpineBone.add(shirtFront);

  const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.21, 0.022), accentMat);
  lapelL.position.set(-0.048, 0.12, 0.145);
  lapelL.rotation.z = -0.18;
  const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.21, 0.022), accentMat);
  lapelR.position.set(0.048, 0.12, 0.145);
  lapelR.rotation.z = 0.18;
  thoracicSpineBone.add(lapelL, lapelR);

  // Bent spine kyphosis / dowager's hump mesh & draped wool shawl for elderly / bent-spine characters
  const curvatureDeg = appearance.spineCurvature !== undefined ? appearance.spineCurvature : (isElderly ? 38 : 0);
  if (curvatureDeg > 8 || isElderly) {
    // Sculpted upper-thoracic kyphosis contour (dowager's hump)
    const humpGeom = new THREE.SphereGeometry(0.145, 16, 12);
    humpGeom.scale(1.22, 0.95, 1.38);
    const humpMesh = new THREE.Mesh(humpGeom, shawlMat);
    humpMesh.position.set(0, 0.14, -0.075);
    humpMesh.castShadow = true;
    thoracicSpineBone.add(humpMesh);

    // Draped 1970s Knitted Shawl / Stole across shoulders & upper chest
    const shawlGeom = new THREE.CylinderGeometry(0.21, 0.25, 0.19, 18);
    shawlGeom.scale(1.12, 1.0, 0.88);
    const shawlMesh = new THREE.Mesh(shawlGeom, shawlMat);
    shawlMesh.position.set(0, 0.13, -0.01);
    shawlMesh.castShadow = true;
    thoracicSpineBone.add(shawlMesh);

    // Vintage cameo brooch pinning the shawl at the collar
    const brooch = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), brassMat);
    brooch.scale.set(1.2, 1.4, 0.5);
    brooch.position.set(0, 0.18, 0.155);
    thoracicSpineBone.add(brooch);
  }

  // C4 Cervical Neck Joint with Sternocleidomastoid taper
  const neckBone = new THREE.Group();
  neckBone.name = 'neckBone';
  neckBone.position.set(0, 0.215, 0);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.105, 14), skinMat);
  neckMesh.position.set(0, 0.048, 0);
  neckBone.add(neckMesh);

  // High-Detail Proportional Noir Head Group (~7.4 heads high anatomical proportion)
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';
  headGroup.position.set(0, 0.095, 0);
  const hs = appearance.headScale || 1.0;
  headGroup.scale.set(hs, hs, hs);

  // Darker shadow/crease material for noir facial contours (eye sockets, nasolabial folds, hollow cheeks)
  const shadowSkinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skinMat.color).offsetHSL(0, 0.06, -0.15),
    roughness: 0.88,
    metalness: 0.02
  });

  // 1. Cranial Dome & Sculpted Facial Skull (organic rounded cranium + tapered jawline)
  const craniumGeom = new THREE.SphereGeometry(0.118, 20, 16);
  craniumGeom.scale(0.94, 1.12, 1.02);
  const skullMesh = new THREE.Mesh(craniumGeom, skinMat);
  skullMesh.position.set(0, 0.145, -0.005);
  skullMesh.castShadow = true;
  headGroup.add(skullMesh);

  // Lower Face & Maxilla/Cheek Structure
  const faceMaskGeom = new THREE.CylinderGeometry(0.104, 0.078, 0.145, 16);
  faceMaskGeom.scale(0.96, 1.0, 0.92);
  const faceMaskMesh = new THREE.Mesh(faceMaskGeom, skinMat);
  faceMaskMesh.position.set(0, 0.095, 0.018);
  faceMaskMesh.castShadow = true;
  headGroup.add(faceMaskMesh);

  // Sculpted Zygomatic Cheekbones (Left & Right)
  const cheekGeom = new THREE.SphereGeometry(0.038, 12, 10);
  cheekGeom.scale(1.15, 0.75, 0.85);
  const cheekboneL = new THREE.Mesh(cheekGeom, skinMat);
  cheekboneL.position.set(-0.068, 0.108, 0.088);
  const cheekboneR = new THREE.Mesh(cheekGeom, skinMat);
  cheekboneR.position.set(0.068, 0.108, 0.088);
  headGroup.add(cheekboneL, cheekboneR);

  // Sunken Cheek Hollows (gaunt noir shadow beneath cheekbones — driven by cheekHollow param)
  const hollowGeom = new THREE.SphereGeometry(0.032, 10, 8);
  hollowGeom.scale(0.85, 1.15, 0.45);
  const cheekHollowL = new THREE.Mesh(hollowGeom, shadowSkinMat);
  cheekHollowL.name = 'cheekHollowL';
  cheekHollowL.position.set(-0.066, 0.072, 0.086);
  const cheekHollowR = new THREE.Mesh(hollowGeom, shadowSkinMat);
  cheekHollowR.name = 'cheekHollowR';
  cheekHollowR.position.set(0.066, 0.072, 0.086);
  headGroup.add(cheekHollowL, cheekHollowR);

  // Supraorbital Brow Ridge & Recessed Orbital Eye Sockets (gives deep mysterious noir shadow)
  const browRidgeGeom = new THREE.CylinderGeometry(0.096, 0.098, 0.026, 14);
  browRidgeGeom.scale(1.04, 1.0, 0.55);
  const browRidge = new THREE.Mesh(browRidgeGeom, skinMat);
  browRidge.position.set(0, 0.165, 0.076);
  headGroup.add(browRidge);

  const socketGeom = new THREE.SphereGeometry(0.032, 12, 10);
  socketGeom.scale(1.18, 0.92, 0.45);
  const socketL = new THREE.Mesh(socketGeom, shadowSkinMat);
  socketL.position.set(-0.048, 0.134, 0.101);
  const socketR = new THREE.Mesh(socketGeom, shadowSkinMat);
  socketR.position.set(0.048, 0.134, 0.101);
  headGroup.add(socketL, socketR);

  // Sculpted 3D Nose (Nasal Bridge, Nasal Tip & Nostrils)
  const noseBridgeGeom = new THREE.CylinderGeometry(0.011, 0.018, 0.058, 10);
  noseBridgeGeom.scale(0.85, 1.0, 1.15);
  const noseBridge = new THREE.Mesh(noseBridgeGeom, skinMat);
  noseBridge.position.set(0, 0.122, 0.118);
  noseBridge.rotation.x = -0.22;
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 10), skinMat);
  noseTip.position.set(0, 0.096, 0.132);
  const nostrilL = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), shadowSkinMat);
  nostrilL.position.set(-0.012, 0.092, 0.124);
  const nostrilR = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), shadowSkinMat);
  nostrilR.position.set(0.012, 0.092, 0.124);
  headGroup.add(noseBridge, noseTip, nostrilL, nostrilR);

  // Sculpted Ears with Helix & Tragus
  const earGeom = new THREE.SphereGeometry(0.034, 10, 10);
  earGeom.scale(0.45, 1.15, 0.75);
  const leftEar = new THREE.Mesh(earGeom, skinMat);
  leftEar.position.set(-0.108, 0.122, -0.008);
  const rightEar = new THREE.Mesh(earGeom, skinMat);
  rightEar.position.set(0.108, 0.122, -0.008);
  headGroup.add(leftEar, rightEar);

  // Hair Styles (with silver bun, permed silver, bowler hat, or swept noir styles)
  const hairStyle = appearance.hairStyle || (isElderly ? 'silver_bun' : 'swept_pompadour');
  const hairCapGeom = new THREE.SphereGeometry(0.123, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
  hairCapGeom.scale(0.96, 1.08, 1.04);
  const hairCap = new THREE.Mesh(hairCapGeom, hairMat);
  hairCap.position.set(0, 0.152, -0.008);
  headGroup.add(hairCap);

  if (hairStyle === 'silver_bun') {
    const bunGeom = new THREE.SphereGeometry(0.078, 14, 12);
    const bunMesh = new THREE.Mesh(bunGeom, hairMat);
    bunMesh.position.set(0, 0.21, -0.118);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.19, 8), accentMat);
    pin.position.set(0, 0.215, -0.12);
    pin.rotation.z = 0.55;
    // Soft temple hair sweeps
    const templeSweepL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), hairMat);
    templeSweepL.scale.set(0.45, 0.9, 1.2);
    templeSweepL.position.set(-0.095, 0.165, 0.02);
    const templeSweepR = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), hairMat);
    templeSweepR.scale.set(0.45, 0.9, 1.2);
    templeSweepR.position.set(0.095, 0.165, 0.02);
    headGroup.add(bunMesh, pin, templeSweepL, templeSweepR);
  } else if (hairStyle === 'permed_silver') {
    for (let i = -2; i <= 2; i++) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), hairMat);
      curl.position.set(i * 0.044, 0.245, (i % 2) * 0.028 - 0.02);
      headGroup.add(curl);
    }
  } else if (hairStyle === 'bowler_hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.02, 20), bootMat);
    brim.position.set(0, 0.242, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.122, 16, 12), bootMat);
    dome.position.set(0, 0.29, 0);
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.024, 16), accentMat);
    ribbon.position.set(0, 0.255, 0);
    headGroup.add(brim, dome, ribbon);
  } else {
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), hairMat);
    bang.scale.set(1.45, 0.48, 0.68);
    bang.position.set(0.015, 0.215, 0.095);
    bang.rotation.z = -0.12;
    headGroup.add(bang);
  }

  // Spectacles / Wire-Frame Glasses (elderly or scholar/watchmaker)
  const hasGlasses = appearance.hasSpectacles ?? (isElderly || appearance.archetype === 'Occult Archivist');
  if (hasGlasses) {
    const specMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.88, roughness: 0.18 });
    const lensGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.3
    });
    const lensL = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0045, 10, 20), specMat);
    lensL.position.set(-0.048, 0.132, 0.122);
    const glassL = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), lensGlassMat);
    glassL.position.set(-0.048, 0.132, 0.123);

    const lensR = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.0045, 10, 20), specMat);
    lensR.position.set(0.048, 0.132, 0.122);
    const glassR = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), lensGlassMat);
    glassR.position.set(0.048, 0.132, 0.123);

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.036, 8), specMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.136, 0.122);
    headGroup.add(lensL, glassL, lensR, glassR, bridge);
  }

  // Weathered Noir Age Folds, Under-Eye Bags, Nasolabial Creases, Forehead Lines & Crow's Feet
  const underEyeBags = new THREE.Group();
  underEyeBags.name = 'underEyeBags';
  const bagL = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.038, 8), shadowSkinMat);
  bagL.rotation.z = Math.PI / 2 + 0.12;
  bagL.position.set(-0.048, 0.112, 0.112);
  const bagR = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.038, 8), shadowSkinMat);
  bagR.rotation.z = Math.PI / 2 - 0.12;
  bagR.position.set(0.048, 0.112, 0.112);

  // Nasolabial folds (nose-to-mouth corner creases)
  const nasoL = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0025, 0.045, 8), shadowSkinMat);
  nasoL.position.set(-0.032, 0.075, 0.112);
  nasoL.rotation.z = -0.42;
  const nasoR = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0025, 0.045, 8), shadowSkinMat);
  nasoR.position.set(0.032, 0.075, 0.112);
  nasoR.rotation.z = 0.42;

  // Forehead worry creases & outer crow's feet
  const worryCrease1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.075, 8), shadowSkinMat);
  worryCrease1.rotation.z = Math.PI / 2;
  worryCrease1.position.set(0, 0.186, 0.106);
  const worryCrease2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.062, 8), shadowSkinMat);
  worryCrease2.rotation.z = Math.PI / 2;
  worryCrease2.position.set(0, 0.196, 0.103);

  underEyeBags.add(bagL, bagR, nasoL, nasoR, worryCrease1, worryCrease2);
  underEyeBags.visible = isElderly || curvatureDeg > 12;
  headGroup.add(underEyeBags);

  // Compute initial Facial Rig Parameters
  const facialRigParams = computeFacialRigParams(
    appearance.facialExpression || 'neutral',
    undefined,
    false,
    0,
    false,
    isElderly
  );

  // Split Inner & Outer Eyebrows (supports browHeight, browFurrow, and asymmetric cocked browAsymmetry)
  const browPivotL = new THREE.Group();
  browPivotL.name = 'browPivotL';
  browPivotL.position.set(-0.048, 0.164 + facialRigParams.browHeight, 0.114);
  const browInnerL = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.011, 0.014), hairMat);
  browInnerL.position.set(0.011, 0, 0);
  const browOuterL = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.009, 0.014), hairMat);
  browOuterL.position.set(-0.012, -0.002, -0.002);
  browOuterL.rotation.z = 0.15;
  browPivotL.add(browInnerL, browOuterL);
  browPivotL.rotation.z = -facialRigParams.browFurrow * 0.28;

  const browPivotR = new THREE.Group();
  browPivotR.name = 'browPivotR';
  browPivotR.position.set(0.048, 0.164 + facialRigParams.browHeight + facialRigParams.browAsymmetry, 0.114);
  const browInnerR = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.011, 0.014), hairMat);
  browInnerR.position.set(-0.011, 0, 0);
  const browOuterR = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.009, 0.014), hairMat);
  browOuterR.position.set(0.012, -0.002, -0.002);
  browOuterR.rotation.z = -0.15;
  browPivotR.add(browInnerR, browOuterR);
  browPivotR.rotation.z = facialRigParams.browFurrow * 0.28 + facialRigParams.browAsymmetry * 8;

  headGroup.add(browPivotL, browPivotR);

  // Multi-Part Articulated Eyes: Sclera + Iris + Dilating Pupil + Upper/Lower Eyelids
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    roughness: 0.22,
    metalness: 0.05
  });
  const irisColor =
    appearance.eyeStyle === 'hollow_glow'
      ? 0x38bdf8
      : appearance.eyeStyle === 'wide_amber'
      ? 0xd97706
      : 0x3f3f46;
  const irisMat = new THREE.MeshStandardMaterial({
    color: irisColor,
    emissive: appearance.eyeStyle === 'hollow_glow' ? 0x0284c7 : 0x000000,
    emissiveIntensity: 0.65,
    roughness: 0.15
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.1
  });

  // Left Eye Assembly
  const eyeL = new THREE.Group();
  eyeL.name = 'eyeL';
  eyeL.position.set(-0.048, 0.134, 0.108);
  const scleraL = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 12), scleraMat);
  scleraL.scale.set(1.15, 0.92, 0.55);
  const irisGroupL = new THREE.Group();
  irisGroupL.name = 'irisGroupL';
  irisGroupL.position.set(facialRigParams.eyeGazeX, facialRigParams.eyeGazeY, 0.009);
  const irisMeshL = new THREE.Mesh(new THREE.CircleGeometry(0.0105, 14), irisMat);
  const pupilMeshL = new THREE.Mesh(new THREE.CircleGeometry(0.0052, 12), pupilMat);
  pupilMeshL.name = 'pupilMeshL';
  pupilMeshL.position.set(0, 0, 0.001);
  pupilMeshL.scale.setScalar(facialRigParams.pupilDilation);
  irisGroupL.add(irisMeshL, pupilMeshL);

  const upperLidL = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.009, 0.016), shadowSkinMat);
  upperLidL.name = 'upperLidL';
  upperLidL.position.set(0, 0.013, 0.005);
  eyeL.add(scleraL, irisGroupL, upperLidL);
  eyeL.scale.y = Math.max(0.2, facialRigParams.eyeAperture);

  // Right Eye Assembly
  const eyeR = new THREE.Group();
  eyeR.name = 'eyeR';
  eyeR.position.set(0.048, 0.134, 0.108);
  const scleraR = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 12), scleraMat);
  scleraR.scale.set(1.15, 0.92, 0.55);
  const irisGroupR = new THREE.Group();
  irisGroupR.name = 'irisGroupR';
  irisGroupR.position.set(facialRigParams.eyeGazeX, facialRigParams.eyeGazeY, 0.009);
  const irisMeshR = new THREE.Mesh(new THREE.CircleGeometry(0.0105, 14), irisMat);
  const pupilMeshR = new THREE.Mesh(new THREE.CircleGeometry(0.0052, 12), pupilMat);
  pupilMeshR.name = 'pupilMeshR';
  pupilMeshR.position.set(0, 0, 0.001);
  pupilMeshR.scale.setScalar(facialRigParams.pupilDilation);
  irisGroupR.add(irisMeshR, pupilMeshR);

  const upperLidR = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.009, 0.016), shadowSkinMat);
  upperLidR.name = 'upperLidR';
  upperLidR.position.set(0, 0.013, 0.005);
  eyeR.add(scleraR, irisGroupR, upperLidR);
  eyeR.scale.y = Math.max(0.2, facialRigParams.eyeAperture);

  headGroup.add(eyeL, eyeR);

  // Dynamic Jaw, Chin & Asymmetric Lip Rig (supports jaw drop, crooked noir smirk, and lip-sync cadence)
  const jawPivot = new THREE.Group();
  jawPivot.name = 'jawPivot';
  jawPivot.position.set(0, 0.052, 0.048);

  // Sculpted Chin Boss on Jaw Pivot
  const chinGeom = new THREE.SphereGeometry(0.032, 12, 10);
  chinGeom.scale(1.15, 0.82, 0.95);
  const chinMesh = new THREE.Mesh(chinGeom, skinMat);
  chinMesh.position.set(0, -0.022, 0.048);
  jawPivot.add(chinMesh);

  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.55
  });
  const mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.011, 0.015), mouthMat);
  mouthMesh.name = 'mouthMesh';
  mouthMesh.position.set(0, 0.004, 0.062);
  mouthMesh.rotation.z = facialRigParams.mouthCornerAngle + facialRigParams.mouthAsymmetry;
  jawPivot.add(mouthMesh);

  // Left & Right Lip Corners for asymmetric expressions
  const lipCornerL = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), mouthMat);
  lipCornerL.name = 'lipCornerL';
  lipCornerL.position.set(-0.029, 0.004 - facialRigParams.mouthAsymmetry * 0.04, 0.06);
  const lipCornerR = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), mouthMat);
  lipCornerR.name = 'lipCornerR';
  lipCornerR.position.set(0.029, 0.004 + facialRigParams.mouthAsymmetry * 0.04, 0.06);
  jawPivot.add(lipCornerL, lipCornerR);

  // Inner mouth cavity (visible when jaw drops or during speech / whisper)
  const mouthOpening = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.022, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.92 })
  );
  mouthOpening.name = 'mouthOpening';
  mouthOpening.position.set(0, 0.003, 0.059);
  mouthOpening.scale.set(1, Math.max(0.05, facialRigParams.mouthAperture), 1);
  jawPivot.add(mouthOpening);

  headGroup.add(jawPivot);
  neckBone.add(headGroup);
  thoracicSpineBone.add(neckBone);

  // Left Arm Skeleton Chain (Sculpted Deltoid, Tapered Bicep, Elbow, Tapered Forearm, Wrist & Articulated Hand)
  const leftClavicleBone = new THREE.Group();
  leftClavicleBone.name = 'leftClavicleBone';
  leftClavicleBone.position.set(-0.205, 0.185, 0);
  const leftShoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), outfitMat);
  leftShoulderCap.scale.set(1.05, 1.12, 0.95);
  leftClavicleBone.add(leftShoulderCap);

  const leftUpperArmBone = new THREE.Group();
  leftUpperArmBone.name = 'leftUpperArmBone';
  const leftUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.040, 0.22, 12), outfitMat);
  leftUpperArmMesh.position.set(0, -0.11, 0);
  leftUpperArmMesh.castShadow = true;
  leftUpperArmBone.add(leftUpperArmMesh);

  const leftElbowBone = new THREE.Group();
  leftElbowBone.name = 'leftElbowBone';
  leftElbowBone.position.set(0, -0.22, 0);
  const leftElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.041, 10, 10), outfitMat);
  leftElbowBone.add(leftElbowJoint);

  const leftForearmBone = new THREE.Group();
  leftForearmBone.name = 'leftForearmBone';
  const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.032, 0.20, 12), outfitMat);
  leftForearmMesh.position.set(0, -0.10, 0);
  leftForearmMesh.castShadow = true;
  const leftWristCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12),
    new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.7 })
  );
  leftWristCuff.position.set(0, -0.19, 0);
  leftForearmBone.add(leftForearmMesh, leftWristCuff);

  const leftHandBone = new THREE.Group();
  leftHandBone.name = 'leftHandBone';
  leftHandBone.position.set(0, -0.205, 0);
  const leftPalmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), skinMat);
  leftPalmMesh.scale.set(0.75, 1.15, 0.95);
  const leftFingersMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.038, 0.042), skinMat);
  leftFingersMesh.position.set(0, -0.032, 0);
  const leftThumbMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.032, 8), skinMat);
  leftThumbMesh.position.set(0.016, -0.012, 0.022);
  leftThumbMesh.rotation.x = 0.45;
  leftHandBone.add(leftPalmMesh, leftFingersMesh, leftThumbMesh);

  leftForearmBone.add(leftHandBone);
  leftElbowBone.add(leftForearmBone);
  leftUpperArmBone.add(leftElbowBone);
  leftClavicleBone.add(leftUpperArmBone);
  thoracicSpineBone.add(leftClavicleBone);

  // Right Arm Skeleton Chain
  const rightClavicleBone = new THREE.Group();
  rightClavicleBone.name = 'rightClavicleBone';
  rightClavicleBone.position.set(0.205, 0.185, 0);
  const rightShoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), outfitMat);
  rightShoulderCap.scale.set(1.05, 1.12, 0.95);
  rightClavicleBone.add(rightShoulderCap);

  const rightUpperArmBone = new THREE.Group();
  rightUpperArmBone.name = 'rightUpperArmBone';
  const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.040, 0.22, 12), outfitMat);
  rightUpperArmMesh.position.set(0, -0.11, 0);
  rightUpperArmMesh.castShadow = true;
  rightUpperArmBone.add(rightUpperArmMesh);

  const rightElbowBone = new THREE.Group();
  rightElbowBone.name = 'rightElbowBone';
  rightElbowBone.position.set(0, -0.22, 0);
  const rightElbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.041, 10, 10), outfitMat);
  rightElbowBone.add(rightElbowJoint);

  const rightForearmBone = new THREE.Group();
  rightForearmBone.name = 'rightForearmBone';
  const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.032, 0.20, 12), outfitMat);
  rightForearmMesh.position.set(0, -0.10, 0);
  rightForearmMesh.castShadow = true;
  const rightWristCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12),
    new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.7 })
  );
  rightWristCuff.position.set(0, -0.19, 0);
  rightForearmBone.add(rightForearmMesh, rightWristCuff);

  const rightHandBone = new THREE.Group();
  rightHandBone.name = 'rightHandBone';
  rightHandBone.position.set(0, -0.205, 0);
  const rightPalmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), skinMat);
  rightPalmMesh.scale.set(0.75, 1.15, 0.95);
  const rightFingersMesh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.038, 0.042), skinMat);
  rightFingersMesh.position.set(0, -0.032, 0);
  const rightThumbMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.032, 8), skinMat);
  rightThumbMesh.position.set(-0.016, -0.012, 0.022);
  rightThumbMesh.rotation.x = 0.45;
  rightHandBone.add(rightPalmMesh, rightFingersMesh, rightThumbMesh);

  // Walking cane accessory (grip in right hand for elderly / bent spine character)
  const hasCane = appearance.hasWalkingCane ?? isElderly;
  const caneGroup = new THREE.Group();
  caneGroup.name = 'caneGroup';
  caneGroup.visible = hasCane;

  const caneShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.011, 0.84, 10), caneWoodMat);
  caneShaft.position.set(0, -0.39, 0);
  caneShaft.castShadow = true;
  const crookGeom = new THREE.TorusGeometry(0.048, 0.015, 10, 18, Math.PI);
  const crookMesh = new THREE.Mesh(crookGeom, brassMat);
  crookMesh.position.set(0.038, 0.038, 0);
  crookMesh.rotation.z = Math.PI / 2;
  const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.028, 10), brassMat);
  brassCollar.position.set(0, 0.01, 0);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.055, 10), bootMat);
  ferrule.position.set(0, -0.80, 0);
  caneGroup.add(caneShaft, crookMesh, brassCollar, ferrule);
  rightHandBone.add(caneGroup);

  rightForearmBone.add(rightHandBone);
  rightElbowBone.add(rightForearmBone);
  rightUpperArmBone.add(rightElbowBone);
  rightClavicleBone.add(rightUpperArmBone);
  thoracicSpineBone.add(rightClavicleBone);

  // Assemble Multi-Segment Spine Hierarchy: Pelvis -> L1 Lumbar -> T6 Lower Thoracic -> T1 Upper Thoracic
  lowerThoracicBone.add(thoracicSpineBone);
  lumbarSpineBone.add(lowerThoracicBone);
  pelvisBone.add(lumbarSpineBone);

  // Left Leg Skeleton Chain (Contoured Thigh, Patella Knee, Gastrocnemius Calf & Sculpted Oxford Shoe)
  const leftHipBone = new THREE.Group();
  leftHipBone.name = 'leftHipBone';
  leftHipBone.position.set(-0.105, -0.055, 0);
  const leftHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), outfitMat);
  leftHipBone.add(leftHipJoint);

  const leftThighBone = new THREE.Group();
  leftThighBone.name = 'leftThighBone';
  const leftThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.052, 0.38, 14), outfitMat);
  leftThighMesh.position.set(0, -0.19, 0);
  leftThighMesh.castShadow = true;
  leftThighBone.add(leftThighMesh);

  const leftKneeBone = new THREE.Group();
  leftKneeBone.name = 'leftKneeBone';
  leftKneeBone.position.set(0, -0.38, 0);
  const leftKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), outfitMat);
  leftKneeBone.add(leftKneeJoint);

  const leftCalfBone = new THREE.Group();
  leftCalfBone.name = 'leftCalfBone';
  const leftCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.038, 0.36, 14), outfitMat);
  leftCalfMesh.position.set(0, -0.18, 0);
  leftCalfMesh.castShadow = true;
  leftCalfBone.add(leftCalfMesh);

  const leftFootBone = new THREE.Group();
  leftFootBone.name = 'leftFootBone';
  leftFootBone.position.set(0, -0.36, 0);
  const leftShoeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.17, 12), bootMat);
  leftShoeUpper.rotation.x = Math.PI / 2;
  leftShoeUpper.scale.set(1.05, 1.0, 0.72);
  leftShoeUpper.position.set(0, -0.032, 0.038);
  leftShoeUpper.castShadow = true;
  const leftShoeHeel = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.065), bootMat);
  leftShoeHeel.position.set(0, -0.052, -0.015);
  leftFootBone.add(leftShoeUpper, leftShoeHeel);

  leftCalfBone.add(leftFootBone);
  leftKneeBone.add(leftCalfBone);
  leftThighBone.add(leftKneeBone);
  leftHipBone.add(leftThighBone);
  pelvisBone.add(leftHipBone);

  // Right Leg Skeleton Chain
  const rightHipBone = new THREE.Group();
  rightHipBone.name = 'rightHipBone';
  rightHipBone.position.set(0.105, -0.055, 0);
  const rightHipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), outfitMat);
  rightHipBone.add(rightHipJoint);

  const rightThighBone = new THREE.Group();
  rightThighBone.name = 'rightThighBone';
  const rightThighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.052, 0.38, 14), outfitMat);
  rightThighMesh.position.set(0, -0.19, 0);
  rightThighMesh.castShadow = true;
  rightThighBone.add(rightThighMesh);

  const rightKneeBone = new THREE.Group();
  rightKneeBone.name = 'rightKneeBone';
  rightKneeBone.position.set(0, -0.38, 0);
  const rightKneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), outfitMat);
  rightKneeBone.add(rightKneeJoint);

  const rightCalfBone = new THREE.Group();
  rightCalfBone.name = 'rightCalfBone';
  const rightCalfMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.038, 0.36, 14), outfitMat);
  rightCalfMesh.position.set(0, -0.18, 0);
  rightCalfMesh.castShadow = true;
  rightCalfBone.add(rightCalfMesh);

  const rightFootBone = new THREE.Group();
  rightFootBone.name = 'rightFootBone';
  rightFootBone.position.set(0, -0.36, 0);
  const rightShoeUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.17, 12), bootMat);
  rightShoeUpper.rotation.x = Math.PI / 2;
  rightShoeUpper.scale.set(1.05, 1.0, 0.72);
  rightShoeUpper.position.set(0, -0.032, 0.038);
  rightShoeUpper.castShadow = true;
  const rightShoeHeel = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.065), bootMat);
  rightShoeHeel.position.set(0, -0.052, -0.015);
  rightFootBone.add(rightShoeUpper, rightShoeHeel);

  rightCalfBone.add(rightFootBone);
  rightKneeBone.add(rightCalfBone);
  rightThighBone.add(rightKneeBone);
  rightHipBone.add(rightThighBone);
  pelvisBone.add(rightHipBone);

  actorGroup.add(pelvisBone);

  // Initial Multi-Vertebrae Spine Posture Setup (distributes kyphosis across L1, T6, T1, and C4)
  const kyphosisRad = (Math.max(0, Math.min(48, curvatureDeg)) * Math.PI) / 180;
  lumbarSpineBone.rotation.x = -kyphosisRad * 0.22;
  lowerThoracicBone.rotation.x = -kyphosisRad * 0.36;
  thoracicSpineBone.rotation.x = -kyphosisRad * 0.48;
  neckBone.rotation.x = kyphosisRad * 0.78; // Counter-pitch to keep eyes looking forward

  if (hasCane) {
    rightUpperArmBone.rotation.x = 0.28;
    rightUpperArmBone.rotation.z = -0.12;
    rightForearmBone.rotation.x = -0.52;
  }

  // Store bone handles and high-detail facial references on root for 60fps kinematic animation loops
  root.userData = {
    isCharacterRig: true,
    appearance,
    bones: {
      pelvisBone,
      lumbarSpineBone,
      lowerThoracicBone,
      thoracicSpineBone,
      neckBone,
      headGroup,
      leftClavicleBone,
      leftUpperArmBone,
      leftElbowBone,
      leftForearmBone,
      leftHandBone,
      rightClavicleBone,
      rightUpperArmBone,
      rightElbowBone,
      rightForearmBone,
      rightHandBone,
      leftHipBone,
      leftThighBone,
      leftKneeBone,
      leftCalfBone,
      leftFootBone,
      rightHipBone,
      rightThighBone,
      rightKneeBone,
      rightCalfBone,
      rightFootBone,
      caneGroup
    },
    facial: {
      browPivotL,
      browPivotR,
      eyeL,
      eyeR,
      irisGroupL,
      irisGroupR,
      pupilMeshL,
      pupilMeshR,
      upperLidL,
      upperLidR,
      jawPivot,
      mouthMesh,
      lipCornerL,
      lipCornerR,
      mouthOpening,
      underEyeBags,
      cheekHollowL,
      cheekHollowR
    }
  };

  if (includePedestal) {
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
 * Applies forward kinematic bone rotations and high-detail noir facial micro-expression parameters to an articulated character rig.
 */
export function applySkeletonPoseToRig(
  rigGroup: THREE.Group,
  pose: SkeletonPoseEuler,
  facialParams?: FacialRigParams,
  options?: { updateBody?: boolean; updateFace?: boolean }
): void {
  const bones = rigGroup.userData?.bones;
  const facial = rigGroup.userData?.facial;
  if (!bones) return;

  const shouldUpdateBody = options?.updateBody ?? true;
  const shouldUpdateFace = options?.updateFace ?? true;

  if (shouldUpdateBody && pose) {
    // 1. Pelvis & Multi-Vertebrae Spine Kinematics (L1 Lumbar -> T6 Lower Thoracic -> T1 Upper Thoracic -> C4 Neck)
    if (bones.pelvisBone) {
      bones.pelvisBone.position.y = pose.pelvisY;
    }
    if (bones.lumbarSpineBone) {
      bones.lumbarSpineBone.rotation.x = pose.spineLumbarX;
      bones.lumbarSpineBone.rotation.y = pose.spineLumbarY;
    }
    if (bones.lowerThoracicBone) {
      bones.lowerThoracicBone.rotation.x = pose.spineLowerThoracicX;
      bones.lowerThoracicBone.rotation.y = pose.spineLumbarY * 0.6;
    }
    if (bones.thoracicSpineBone) {
      bones.thoracicSpineBone.rotation.x = pose.spineThoracicX;
      bones.thoracicSpineBone.rotation.y = pose.spineThoracicY;
      bones.thoracicSpineBone.rotation.z = pose.spineThoracicZ;
    }
    if (bones.neckBone) {
      bones.neckBone.rotation.x = pose.neckX;
      bones.neckBone.rotation.y = pose.neckY;
    }
    if (bones.headGroup) {
      bones.headGroup.rotation.x = pose.headX;
      bones.headGroup.rotation.y = pose.headY;
      bones.headGroup.rotation.z = pose.headZ || 0;
    }

    // 2. Arms & Wrist/Hand Kinematics
    if (bones.leftClavicleBone) bones.leftClavicleBone.rotation.z = pose.leftClavicleZ;
    if (bones.leftUpperArmBone) {
      bones.leftUpperArmBone.rotation.x = pose.leftUpperArmX;
      bones.leftUpperArmBone.rotation.z = pose.leftUpperArmZ;
    }
    if (bones.leftForearmBone) bones.leftForearmBone.rotation.x = pose.leftForearmX;
    if (bones.leftHandBone && pose.leftHandZ !== undefined) {
      bones.leftHandBone.rotation.z = pose.leftHandZ;
    }

    if (bones.rightClavicleBone) bones.rightClavicleBone.rotation.z = pose.rightClavicleZ;
    if (bones.rightUpperArmBone) {
      bones.rightUpperArmBone.rotation.x = pose.rightUpperArmX;
      bones.rightUpperArmBone.rotation.z = pose.rightUpperArmZ;
    }
    if (bones.rightForearmBone) bones.rightForearmBone.rotation.x = pose.rightForearmX;
    if (bones.rightHandBone && pose.rightHandZ !== undefined) {
      bones.rightHandBone.rotation.z = pose.rightHandZ;
    }

    if (bones.caneGroup) {
      bones.caneGroup.visible = pose.caneGripActive;
    }

    // 3. Legs Kinematics
    if (bones.leftThighBone) bones.leftThighBone.rotation.x = pose.leftThighX;
    if (bones.leftCalfBone) bones.leftCalfBone.rotation.x = pose.leftCalfX;
    if (bones.leftFootBone) bones.leftFootBone.rotation.x = pose.leftFootX;

    if (bones.rightThighBone) bones.rightThighBone.rotation.x = pose.rightThighX;
    if (bones.rightCalfBone) bones.rightCalfBone.rotation.x = pose.rightCalfX;
    if (bones.rightFootBone) bones.rightFootBone.rotation.x = pose.rightFootX;
  }

  // 4. High-Detail Noir Facial Micro-Expressions (Split Brows, Eye Gaze, Pupil Dilation, Eyelid Tremor & Asymmetric Mouth)
  if (shouldUpdateFace && facial && facialParams) {
    if (facial.browPivotL) {
      facial.browPivotL.position.y = 0.164 + facialParams.browHeight;
      facial.browPivotL.rotation.z = -facialParams.browFurrow * 0.28;
    }
    if (facial.browPivotR) {
      facial.browPivotR.position.y = 0.164 + facialParams.browHeight + (facialParams.browAsymmetry || 0);
      facial.browPivotR.rotation.z = facialParams.browFurrow * 0.28 + (facialParams.browAsymmetry || 0) * 8;
    }
    if (facial.eyeL) {
      facial.eyeL.scale.y = Math.max(0.18, facialParams.eyeAperture + (facialParams.eyelidTremor || 0));
    }
    if (facial.eyeR) {
      facial.eyeR.scale.y = Math.max(0.18, facialParams.eyeAperture - (facialParams.eyelidTremor || 0) * 0.5);
    }
    if (facial.irisGroupL) {
      facial.irisGroupL.position.x = facialParams.eyeGazeX || 0;
      facial.irisGroupL.position.y = facialParams.eyeGazeY || 0;
    }
    if (facial.irisGroupR) {
      facial.irisGroupR.position.x = facialParams.eyeGazeX || 0;
      facial.irisGroupR.position.y = facialParams.eyeGazeY || 0;
    }
    if (facial.pupilMeshL && facialParams.pupilDilation !== undefined) {
      facial.pupilMeshL.scale.setScalar(facialParams.pupilDilation);
    }
    if (facial.pupilMeshR && facialParams.pupilDilation !== undefined) {
      facial.pupilMeshR.scale.setScalar(facialParams.pupilDilation);
    }
    if (facial.jawPivot) {
      facial.jawPivot.position.y = 0.052 - facialParams.jawDrop;
    }
    if (facial.mouthMesh) {
      facial.mouthMesh.rotation.z = facialParams.mouthCornerAngle + (facialParams.mouthAsymmetry || 0);
    }
    if (facial.lipCornerL) {
      facial.lipCornerL.position.y = 0.004 - (facialParams.mouthAsymmetry || 0) * 0.04;
    }
    if (facial.lipCornerR) {
      facial.lipCornerR.position.y = 0.004 + (facialParams.mouthAsymmetry || 0) * 0.04;
    }
    if (facial.mouthOpening) {
      facial.mouthOpening.scale.y = Math.max(0.05, facialParams.mouthAperture);
    }
    if (facial.underEyeBags) {
      facial.underEyeBags.visible = facialParams.underEyeBags;
    }
    if (facial.cheekHollowL && facial.cheekHollowR) {
      const hollowScale = 0.65 + (facialParams.cheekHollow || 0.2) * 0.75;
      facial.cheekHollowL.scale.set(0.85 * hollowScale, 1.15 * hollowScale, 0.45);
      facial.cheekHollowR.scale.set(0.85 * hollowScale, 1.15 * hollowScale, 0.45);
    }
  }
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
