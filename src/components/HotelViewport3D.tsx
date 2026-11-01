import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FloorId,
  FloorLayer,
  GRID_TILE_COUNT,
  PlacedAsset,
  HotelAgentProfile,
  CharacterAppearance,
  checkPlayerCollision,
  getRoomLabelAtPosition,
  snapToGrid,
  computeWallRowPlacements,
  WallRowPlacement,
  computeFirstPersonCameraDisplacement,
  computeCameraPanDelta,
  extractMoodLightEmittersFromAssets,
  computePerRoomMoodLightState,
  MoodLightEmitterSpec,
  computeFlashlightInspectionState,
  computeAssetHingeAnimationState,
  computeSkeletonPose,
  computeFacialRigParams,
  getActiveDailyAction,
  FloorSurfaceMaterial,
  resolveFloorSurfaceMaterialAtPosition,
  didCrossStrideFootstepPhase,
  KeybindingsMap,
  DEFAULT_KEYBINDINGS,
  isActionKeyPressed,
  isActionKeyHeld,
  getPrimaryActionKeyLabel,
  GlobalAnimationFps,
  DEFAULT_GLOBAL_ANIMATION_FPS,
  computeCharacterAnimationLodState,
  evaluateHybridLowFrameRigState,
  STUDIO_DARK_UI_WHITE_CANVAS_SPEC
} from '../game/rules';
import {
  buildAssetMeshGroup,
  buildCharacterToonGroup,
  buildTPoseScaleMannequin,
  getProceduralMaterialTextures,
  applySkeletonPoseToRig
} from '../game/procedural3D';
import { AssetBlueprint, createBlueprintFromAsset } from '../game/hotelData';
import { soundFX } from '../game/soundEffects';
import { audioEngine } from '../game/audioEngine';

export type WorkspaceMode = 'architect' | 'character' | 'soundboard' | 'walkthrough';

interface HotelViewport3DProps {
  mode: WorkspaceMode;
  currentFloor: FloorId;
  floorLayers: FloorLayer[];
  assets: PlacedAsset[];
  agents: HotelAgentProfile[];
  selectedAssetId: string | null;
  selectedAssetIds: string[];
  marqueeModeActive: boolean;
  activeBlueprint: AssetBlueprint | null;
  showTPoseMannequin: boolean;
  isolateSelectedAsset: boolean;
  showExteriorWalls: boolean;
  customCharacterAppearance: CharacterAppearance;
  flashlightEnabled?: boolean;
  onToggleFlashlight?: () => void;
  onFlashlightRevealChange?: (revealText: string | null, revealedCount: number) => void;
  onSelectAsset: (assetId: string | null, shiftKey?: boolean) => void;
  onMarqueeSelectAssets: (assetIds: string[], additiveShift?: boolean) => void;
  onPlaceBlueprintAt: (x: number, z: number) => void;
  onPlaceBlueprintRow?: (
    segments: WallRowPlacement[],
    blueprintOverride?: AssetBlueprint
  ) => void;
  onBeginAssetDrag: (assetId: string) => void;
  onMoveSelectedAssetTo: (assetId: string, x: number, z: number) => void;
  onToggleAssetOpen: (asset: PlacedAsset) => void;
  onInteractKeyE: (asset: PlacedAsset) => void;
  onSelectedAssetScreenPosition?: (pos: { x: number; y: number } | null) => void;
  onPlayerRoomChange: (roomLabel: string, nearbyPrompt: string | null) => void;
  activeSpeakingAgentId?: string | null;
  onWalkthroughSpeakToAgent?: (agent: HotelAgentProfile, text: string) => void;
  gameTimeMinutes?: number;
  footstepsEnabled?: boolean;
  keybindings?: KeybindingsMap;
  globalAnimationFps?: GlobalAnimationFps;
}

// Pre-allocated scratch math helpers outside the animation loop (Zero GC)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const HALF_GRID = GRID_TILE_COUNT / 2 - 0.5; // 63.5m bound for 128x128 tiles

export const HotelViewport3D: React.FC<HotelViewport3DProps> = ({
  mode,
  currentFloor,
  floorLayers,
  assets,
  agents,
  selectedAssetId,
  selectedAssetIds,
  marqueeModeActive,
  activeBlueprint,
  showTPoseMannequin,
  isolateSelectedAsset,
  showExteriorWalls,
  customCharacterAppearance,
  flashlightEnabled = true,
  onToggleFlashlight,
  onFlashlightRevealChange,
  onSelectAsset,
  onMarqueeSelectAssets,
  onPlaceBlueprintAt,
  onPlaceBlueprintRow,
  onBeginAssetDrag,
  onMoveSelectedAssetTo,
  onToggleAssetOpen,
  onInteractKeyE,
  onSelectedAssetScreenPosition,
  onPlayerRoomChange,
  activeSpeakingAgentId,
  onWalkthroughSpeakToAgent,
  gameTimeMinutes = 19 * 60 + 30,
  footstepsEnabled = true,
  keybindings = DEFAULT_KEYBINDINGS,
  globalAnimationFps = DEFAULT_GLOBAL_ANIMATION_FPS
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  // Walkthrough live speech-to-text recording state
  const [isWalkthroughVoiceActive, setIsWalkthroughVoiceActive] = useState(false);
  const [walkthroughTargetAgent, setWalkthroughTargetAgent] = useState<HotelAgentProfile | null>(null);
  const [walkthroughLiveTranscript, setWalkthroughLiveTranscript] = useState('');
  const speechRecRef = useRef<any>(null);
  const isVoiceRecordingRef = useRef(false);
  const liveTranscriptAccumRef = useRef('');

  // First-person stealth crouch & active floor surface acoustic state
  const [crouchToggled, setCrouchToggled] = useState(false);
  const [isPlayerCrouchingHud, setIsPlayerCrouchingHud] = useState(false);
  const [activeFloorSurface, setActiveFloorSurface] = useState<FloorSurfaceMaterial>('carpet');
  const crouchToggledRef = useRef(false);

  // Store mutable props in ref so React UI updates never tear down the WebGL canvas
  const stateRef = useRef({
    mode,
    currentFloor,
    floorLayers,
    assets,
    agents,
    selectedAssetId,
    selectedAssetIds,
    marqueeModeActive,
    activeBlueprint,
    showTPoseMannequin,
    isolateSelectedAsset,
    showExteriorWalls,
    customCharacterAppearance,
    flashlightEnabled,
    onToggleFlashlight,
    onFlashlightRevealChange,
    onSelectAsset,
    onMarqueeSelectAssets,
    onPlaceBlueprintAt,
    onPlaceBlueprintRow,
    onBeginAssetDrag,
    onMoveSelectedAssetTo,
    onToggleAssetOpen,
    onInteractKeyE,
    onSelectedAssetScreenPosition,
    onPlayerRoomChange,
    activeSpeakingAgentId,
    onWalkthroughSpeakToAgent,
    gameTimeMinutes,
    footstepsEnabled,
    keybindings,
    globalAnimationFps
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      currentFloor,
      floorLayers,
      assets,
      agents,
      selectedAssetId,
      selectedAssetIds,
      marqueeModeActive,
      activeBlueprint,
      showTPoseMannequin,
      isolateSelectedAsset,
      showExteriorWalls,
      customCharacterAppearance,
      flashlightEnabled,
      onToggleFlashlight,
      onFlashlightRevealChange,
      onSelectAsset,
      onMarqueeSelectAssets,
      onPlaceBlueprintAt,
      onPlaceBlueprintRow,
      onBeginAssetDrag,
      onMoveSelectedAssetTo,
      onToggleAssetOpen,
      onInteractKeyE,
      onSelectedAssetScreenPosition,
      onPlayerRoomChange,
      activeSpeakingAgentId,
      onWalkthroughSpeakToAgent,
      gameTimeMinutes,
      footstepsEnabled,
      keybindings,
      globalAnimationFps
    };
  });

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    worldGroup: THREE.Group;
    characterStudioGroup: THREE.Group;
    isolatedAssetGroup: THREE.Group;
    tPoseGroup: THREE.Group;
    ghostPreviewMesh: THREE.Mesh;
    maxAnisotropy: number;
    rebuildFloorScene?: () => void;
    rebuildCharacterPreview?: () => void;
  } | null>(null);

  const playerPoseRef = useRef({
    x: 0,
    z: 4.0,
    yaw: 0,
    pitch: -0.04,
    bobPhase: 0,
    eyeHeight: 1.62
  });

  useEffect(() => {
    sceneObjectsRef.current?.rebuildFloorScene?.();
  }, [currentFloor]);

  // Rebuild floor assets when assets array, floor layers, selection, or studio flags change
  useEffect(() => {
    if (!activeBlueprint && sceneObjectsRef.current) {
      sceneObjectsRef.current.ghostPreviewMesh.visible = false;
    }
    sceneObjectsRef.current?.rebuildFloorScene?.();
  }, [
    assets,
    floorLayers,
    agents,
    selectedAssetId,
    selectedAssetIds,
    activeBlueprint,
    showTPoseMannequin,
    isolateSelectedAsset,
    showExteriorWalls,
    mode
  ]);

  // Rebuild Character Studio preview when appearance changes
  useEffect(() => {
    sceneObjectsRef.current?.rebuildCharacterPreview?.();
  }, [customCharacterAppearance, mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL detection
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 2. Scene, Sky & Atmospheric Fog (Crisp White Architectural 128x128 Lot Canvas)
    const scene = new THREE.Scene();
    const bgHex = STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.sceneBackgroundHex;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.fogDensity);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.48;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      55,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.1,
      260
    );
    camera.position.set(0, 14, 18);
    scene.add(camera);

    // 3. Balanced Studio Architectural Lighting Rig on White Canvas
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.92);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
    keyLight.position.set(18, 32, 22);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 110;
    const d = 32;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.52);
    rimLight.position.set(-22, 18, -20);
    scene.add(rimLight);

    // World Groups
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const characterStudioGroup = new THREE.Group();
    characterStudioGroup.visible = false;
    scene.add(characterStudioGroup);

    const isolatedAssetGroup = new THREE.Group();
    isolatedAssetGroup.visible = false;
    scene.add(isolatedAssetGroup);

    const staticShellGroup = new THREE.Group();
    worldGroup.add(staticShellGroup);

    const referenceLayersGroup = new THREE.Group();
    worldGroup.add(referenceLayersGroup);

    const dynamicAssetsGroup = new THREE.Group();
    worldGroup.add(dynamicAssetsGroup);

    // Proposal 1: Per-Room Mood Lights Group (60Hz Flickering Fluorescents, Warm Tungsten Pools, CRT Phosphor Glow)
    const moodLightsGroup = new THREE.Group();
    worldGroup.add(moodLightsGroup);
    const activeMoodLightNodes: Array<{
      spec: MoodLightEmitterSpec;
      light: THREE.PointLight;
      bulbMat: THREE.MeshStandardMaterial;
    }> = [];

    // Proposal 2: Interactive 1970s Chrome D-Cell / UV Inspection Flashlight [L] in Walk Mode
    const flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, 1.5, 0);
    scene.add(flashlightTarget);

    const flashlightSpot = new THREE.SpotLight(0xffe4b5, 3.2, 11.5, (28 * Math.PI) / 180, 0.48, 1.4);
    flashlightSpot.target = flashlightTarget;
    flashlightSpot.visible = false;
    scene.add(flashlightSpot);

    const flashlightConeGeom = new THREE.ConeGeometry(1.65, 5.2, 20, 1, true);
    flashlightConeGeom.translate(0, -2.6, 0);
    flashlightConeGeom.rotateX(-Math.PI / 2);
    const flashlightConeMat = new THREE.MeshBasicMaterial({
      color: 0xd8b4fe,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const flashlightConeMesh = new THREE.Mesh(flashlightConeGeom, flashlightConeMat);
    flashlightConeMesh.visible = false;
    scene.add(flashlightConeMesh);

    const flashlightRevealGroup = new THREE.Group();
    worldGroup.add(flashlightRevealGroup);

    const tPoseGroup = buildTPoseScaleMannequin();
    tPoseGroup.position.set(1.5, 0, 0.5);
    worldGroup.add(tPoseGroup);

    // Sims Build Mode Green/Teal Ghost Placement Preview
    const ghostPreviewMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      })
    );
    ghostPreviewMesh.visible = false;
    worldGroup.add(ghostPreviewMesh);

    // Dynamic Wall Row Drag-Placement Ghost Preview Group
    const ghostRowPreviewGroup = new THREE.Group();
    ghostRowPreviewGroup.visible = false;
    worldGroup.add(ghostRowPreviewGroup);

    // Safely dispose transient child geometries & materials before clearing a group (prevents GPU memory leaks)
    const disposeGroupChildren = (group: THREE.Group) => {
      group.traverse((child) => {
        if (child === group) return;
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      group.clear();
    };

    let lastBuiltExteriorWalls: boolean | null = null;

    // Build Blank 128x128 Square Tiles Lot Canvas
    const buildStaticFloorShell = (_floorId: FloorId, includeExteriorWalls: boolean) => {
      if (lastBuiltExteriorWalls === includeExteriorWalls && staticShellGroup.children.length > 0) {
        return;
      }
      lastBuiltExteriorWalls = includeExteriorWalls;
      disposeGroupChildren(staticShellGroup);

      // Surround clean architectural white studio ground plane beneath the 128x128 buildable lot
      const surroundLawn = new THREE.Mesh(
        new THREE.PlaneGeometry(260, 260),
        new THREE.MeshStandardMaterial({
          color: STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.surroundGroundHex,
          roughness: 0.92,
          metalness: 0.02
        })
      );
      surroundLawn.rotation.x = -Math.PI / 2;
      surroundLawn.position.y = -0.06;
      staticShellGroup.add(surroundLawn);

      // Buildable 128x128 Square Tile Pure White Architectural Canvas Base
      const canvasPlane = new THREE.Mesh(
        new THREE.BoxGeometry(GRID_TILE_COUNT, 0.08, GRID_TILE_COUNT),
        new THREE.MeshStandardMaterial({
          color: STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.tileBasePlaneHex,
          roughness: 0.88,
          metalness: 0.02
        })
      );
      canvasPlane.position.y = -0.04;
      canvasPlane.receiveShadow = true;
      staticShellGroup.add(canvasPlane);

      // 128x128 Square Tiles Fine Grid (1m x 1m square tiles) on White Canvas
      const fineTileGrid = new THREE.GridHelper(
        GRID_TILE_COUNT,
        GRID_TILE_COUNT,
        STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.fineGridCenterHex,
        STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.fineGridLineHex
      );
      fineTileGrid.position.y = 0.005;
      staticShellGroup.add(fineTileGrid);

      // Major 8-tile subdivision lines for quick visual measurement on the 128x128 white canvas
      const majorSectorGrid = new THREE.GridHelper(
        GRID_TILE_COUNT,
        16,
        STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.majorGridCenterHex,
        STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.majorGridLineHex
      );
      majorSectorGrid.position.y = 0.009;
      staticShellGroup.add(majorSectorGrid);

      if (!includeExteriorWalls) return;

      // Optional Reference Brick Perimeter Shell (if toggled on by user)
      const { map: brickMap, bumpMap: brickBump } = getProceduralMaterialTextures(
        'nyc_old_brick',
        maxAnisotropy
      );
      const brickMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: brickMap,
        bumpMap: brickBump,
        bumpScale: 0.04,
        roughness: 0.82,
        metalness: 0.08
      });

      const wallConfigs: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [
        { pos: [0, 1.6, -9.8], size: [20, 3.2, 0.4] },
        { pos: [-9.8, 1.6, 0], size: [0.4, 3.2, 20] },
        { pos: [9.8, 1.6, 0], size: [0.4, 3.2, 20] }
      ];

      wallConfigs.forEach(({ pos, size }) => {
        const wMesh = new THREE.Mesh(
          new THREE.BoxGeometry(size[0], size[1], size[2]),
          brickMat
        );
        wMesh.position.set(pos[0], pos[1], pos[2]);
        wMesh.receiveShadow = true;
        staticShellGroup.add(wMesh);
      });
    };

    const interactableObjects: THREE.Object3D[] = [];

    const rebuildFloorScene = () => {
      const st = stateRef.current;
      const isCharMode = st.mode === 'character';
      const selectedObj = st.assets.find((a) => a.id === st.selectedAssetId) || null;
      const isIsolating = st.mode === 'architect' && st.isolateSelectedAsset && Boolean(selectedObj);

      worldGroup.visible = !isCharMode && !isIsolating;
      characterStudioGroup.visible = isCharMode;
      isolatedAssetGroup.visible = isIsolating;

      tPoseGroup.visible = st.mode === 'architect' && st.showTPoseMannequin && !isIsolating;

      if (isIsolating && selectedObj) {
        disposeGroupChildren(isolatedAssetGroup);
        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.95, 0.16, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 })
        );
        pedestal.position.y = -0.08;
        isolatedAssetGroup.add(pedestal);

        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(1.85, 0.035, 12, 36),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.45 })
        );
        rim.rotation.x = Math.PI / 2;
        isolatedAssetGroup.add(rim);

        const centeredCopy: PlacedAsset = {
          ...selectedObj,
          position: [0, selectedObj.dimensions[1] / 2, 0]
        };
        const isolatedMesh = buildAssetMeshGroup(centeredCopy, maxAnisotropy, true);
        isolatedAssetGroup.add(isolatedMesh);
        return;
      }

      buildStaticFloorShell(st.currentFloor, st.showExteriorWalls);
      disposeGroupChildren(referenceLayersGroup);
      disposeGroupChildren(dynamicAssetsGroup);
      interactableObjects.length = 0;

      const activeLayer = st.floorLayers.find((l) => l.id === st.currentFloor);
      const activeElevation = activeLayer ? activeLayer.elevation : 0;

      // 1. Render other visible Floor Layers (Onion-Skin / Multi-Layer Stack like Photoshop)
      st.floorLayers.forEach((layer) => {
        if (layer.id === st.currentFloor || !layer.visible) return;
        const elevOffset = (layer.elevation - activeElevation) * 3.0;
        const layerAssets = st.assets.filter((a) => a.floor === layer.id);

        const refGrid = new THREE.GridHelper(32, 32, 0x94a3b8, 0xe2e8f0);
        refGrid.position.y = elevOffset;
        referenceLayersGroup.add(refGrid);

        layerAssets.forEach((asset) => {
          const meshGroup = buildAssetMeshGroup(asset, maxAnisotropy, false);
          meshGroup.position.y += elevOffset;
          meshGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              if (m.material && !Array.isArray(m.material)) {
                const clonedMat = m.material.clone() as THREE.MeshStandardMaterial;
                clonedMat.transparent = true;
                clonedMat.opacity = 0.38;
                m.material = clonedMat;
              }
            }
          });
          referenceLayersGroup.add(meshGroup);
        });
      });

      // 2. Render active Floor Layer assets (highlight all assets in selectedAssetIds)
      const selectedSet = new Set(st.selectedAssetIds);
      if (st.selectedAssetId) selectedSet.add(st.selectedAssetId);

      const floorAssets = st.assets.filter((a) => a.floor === st.currentFloor);
      floorAssets.forEach((asset) => {
        const isSel = selectedSet.has(asset.id);
        const meshGroup = buildAssetMeshGroup(asset, maxAnisotropy, isSel);
        dynamicAssetsGroup.add(meshGroup);
        interactableObjects.push(meshGroup);
      });

      // 3. Render placed 3D character rigs on active floor layer
      const floorAgents = st.agents.filter(
        (ag) => ag.floor === st.currentFloor && ag.role !== 'helper_entity'
      );
      floorAgents.forEach((agent) => {
        const charGroup = buildCharacterToonGroup(agent.appearance, false);
        charGroup.position.set(agent.position[0], agent.position[1], agent.position[2]);
        charGroup.userData = { ...charGroup.userData, agentId: agent.id, agent, isCharacterRig: true };
        dynamicAssetsGroup.add(charGroup);
        interactableObjects.push(charGroup);
      });

      // 4. Proposal 1: Build Per-Room Mood Lights (60Hz Flickering Corridor Fluorescents + Warm Tungsten Lamp Pools + CRT Phosphor)
      disposeGroupChildren(moodLightsGroup);
      disposeGroupChildren(flashlightRevealGroup);
      activeMoodLightNodes.length = 0;

      const emitters = extractMoodLightEmittersFromAssets(st.currentFloor, st.assets);
      emitters.forEach((spec) => {
        const ptLight = new THREE.PointLight(spec.baseColorHex, spec.baseIntensity, spec.distance, 1.8);
        ptLight.position.set(spec.position[0], spec.position[1], spec.position[2]);
        moodLightsGroup.add(ptLight);

        const bulbGeom =
          spec.kind === 'fluorescent_60hz'
            ? new THREE.BoxGeometry(1.25, 0.06, 0.22)
            : new THREE.SphereGeometry(0.09, 10, 10);
        const bulbMat = new THREE.MeshStandardMaterial({
          color: spec.baseColorHex,
          emissive: spec.baseColorHex,
          emissiveIntensity: 0.85,
          roughness: 0.3,
          metalness: 0.2
        });
        const bulbMesh = new THREE.Mesh(bulbGeom, bulbMat);
        bulbMesh.position.set(spec.position[0], spec.position[1], spec.position[2]);
        moodLightsGroup.add(bulbMesh);

        activeMoodLightNodes.push({
          spec,
          light: ptLight,
          bulbMat
        });
      });
    };

    const rebuildCharacterPreview = () => {
      const st = stateRef.current;
      disposeGroupChildren(characterStudioGroup);
      const previewChar = buildCharacterToonGroup(st.customCharacterAppearance, true);
      previewChar.position.set(0, -0.35, 0);
      characterStudioGroup.add(previewChar);
    };

    sceneObjectsRef.current = {
      scene,
      worldGroup,
      characterStudioGroup,
      isolatedAssetGroup,
      tPoseGroup,
      ghostPreviewMesh,
      maxAnisotropy,
      rebuildFloorScene,
      rebuildCharacterPreview
    };

    rebuildFloorScene();
    rebuildCharacterPreview();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input Handling (WASD, Arrows, E Interact, Shift+Click, Marquee Select, & Simultaneous Drag)
    const keysHeld = new Set<string>();
    let isPointerDown = false;
    let isMiddleMouseDown = false;
    let isRightMouseDown = false;
    let isPanningCamera = false;
    let isMarqueeDragging = false;
    let marqueeAdditiveShift = false;
    let draggingAssetId: string | null = null;
    let hasRecordedDragStart = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let downStartX = 0;
    let downStartY = 0;

    // Wall Row Click-and-Drag Placement State
    let isWallRowDragging = false;
    let wallRowStartPos: { x: number; z: number } | null = null;
    let activeWallRowBlueprint: AssetBlueprint | null = null;
    let wallRowCurrentSegments: WallRowPlacement[] = [];

    const updateGhostRowPreview = (
      segments: WallRowPlacement[],
      dimensions: [number, number, number]
    ) => {
      disposeGroupChildren(ghostRowPreviewGroup);
      ghostRowPreviewGroup.visible = true;
      const [w, h, d] = dimensions;
      segments.forEach((seg) => {
        const boxGeom = new THREE.BoxGeometry(w, h, d);
        const ghostMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.68,
          roughness: 0.25,
          metalness: 0.1
        });
        const ghostMesh = new THREE.Mesh(boxGeom, ghostMat);
        ghostMesh.position.set(seg.x, h / 2, seg.z);
        ghostMesh.rotation.y = seg.rotationY;

        const edges = new THREE.EdgesGeometry(boxGeom);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 })
        );
        ghostMesh.add(line);

        ghostRowPreviewGroup.add(ghostMesh);
      });
    };

    const architectOrbit = {
      theta: 0.55,
      phi: 0.88,
      radius: 20,
      targetX: 0,
      targetY: 0.5,
      targetZ: 0
    };

    let charPreviewRotation = 0;
    let isolatedRotation = 0.45;

    const clearInputs = () => {
      keysHeld.clear();
      isPointerDown = false;
      isMiddleMouseDown = false;
      isRightMouseDown = false;
      isPanningCamera = false;
      isMarqueeDragging = false;
      isWallRowDragging = false;
      wallRowStartPos = null;
      activeWallRowBlueprint = null;
      wallRowCurrentSegments = [];
      ghostRowPreviewGroup.visible = false;
      disposeGroupChildren(ghostRowPreviewGroup);
      draggingAssetId = null;
      hasRecordedDragStart = false;
      ghostPreviewMesh.visible = false;
      setMarqueeBox(null);
      renderer.domElement.style.cursor = 'default';
    };

    // Dedicated "E" key interaction across Walkthrough and Architect modes
    const triggerInteractKeyE = () => {
      const st = stateRef.current;
      const floorAssets = st.assets.filter((a) => a.floor === st.currentFloor);

      if (st.mode === 'walkthrough') {
        _raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = _raycaster.intersectObjects(interactableObjects, true);
        if (hits.length > 0 && hits[0].distance <= 9.0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData?.assetId) {
            obj = obj.parent;
          }
          if (obj?.userData?.asset) {
            st.onSelectAsset(obj.userData.asset.id, false);
            st.onInteractKeyE(obj.userData.asset);
            return;
          }
        }

        const px = playerPoseRef.current.x;
        const pz = playerPoseRef.current.z;
        let nearest: PlacedAsset | null = null;
        let bestDist = 5.0;
        for (const asset of floorAssets) {
          const d = Math.hypot(asset.position[0] - px, asset.position[2] - pz);
          if (d <= bestDist) {
            bestDist = d;
            nearest = asset;
          }
        }
        if (nearest) {
          st.onSelectAsset(nearest.id, false);
          st.onInteractKeyE(nearest);
        }
        return;
      }

      const selectedObj = floorAssets.find((a) => a.id === st.selectedAssetId);
      if (selectedObj) {
        st.onSelectAsset(selectedObj.id, false);
        st.onInteractKeyE(selectedObj);
        return;
      }

      _raycaster.setFromCamera(_mouse, camera);
      const hits = _raycaster.intersectObjects(interactableObjects, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.assetId) {
          obj = obj.parent;
        }
        if (obj?.userData?.asset) {
          st.onSelectAsset(obj.userData.asset.id, false);
          st.onInteractKeyE(obj.userData.asset);
          return;
        }
      }

      if (floorAssets[0]) {
        st.onSelectAsset(floorAssets[0].id, false);
        st.onInteractKeyE(floorAssets[0]);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (tag === 'SELECT') {
        (e.target as HTMLElement).blur();
      }

      const kb = stateRef.current.keybindings || DEFAULT_KEYBINDINGS;

      if (isActionKeyPressed('clear_selection', e.code, kb)) {
        clearInputs();
        return;
      }

      if (!keysHeld.has(e.code) && isActionKeyPressed('interact', e.code, kb)) {
        e.preventDefault();
        triggerInteractKeyE();
      }

      if (!keysHeld.has(e.code) && isActionKeyPressed('toggle_flashlight', e.code, kb)) {
        e.preventDefault();
        stateRef.current.onToggleFlashlight?.();
      }

      // Hold push_to_talk ([V] by default) to Talk Live to nearby AI agent in Walkthrough mode
      if (
        !keysHeld.has(e.code) &&
        isActionKeyPressed('push_to_talk', e.code, kb) &&
        stateRef.current.mode === 'walkthrough'
      ) {
        e.preventDefault();
        const pose = playerPoseRef.current;
        const st = stateRef.current;
        let targetAg: HotelAgentProfile | null = null;
        let bestDist = 6.5;
        for (const ag of st.agents) {
          if (ag.floor === st.currentFloor && ag.role !== 'helper_entity') {
            const d = Math.hypot(ag.position[0] - pose.x, ag.position[2] - pose.z);
            if (d <= bestDist) {
              bestDist = d;
              targetAg = ag;
            }
          }
        }

        if (targetAg && !isVoiceRecordingRef.current) {
          isVoiceRecordingRef.current = true;
          liveTranscriptAccumRef.current = '';
          setIsWalkthroughVoiceActive(true);
          setWalkthroughTargetAgent(targetAg);
          const pttLabel = getPrimaryActionKeyLabel('push_to_talk', kb);
          setWalkthroughLiveTranscript(
            `Listening... Speak into microphone (Release [${pttLabel}] to send).`
          );

          const SpeechRec =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SpeechRec) {
            try {
              const rec = new SpeechRec();
              rec.continuous = true;
              rec.interimResults = true;
              rec.lang = 'en-US';
              rec.onresult = (ev: any) => {
                let text = '';
                for (let i = ev.resultIndex; i < ev.results.length; i++) {
                  text += ev.results[i][0].transcript;
                }
                if (text.trim()) {
                  liveTranscriptAccumRef.current = text.trim();
                  setWalkthroughLiveTranscript(text.trim());
                }
              };
              rec.onerror = () => {};
              speechRecRef.current = rec;
              rec.start();
            } catch {
              // fallback
            }
          }
        }
      }

      keysHeld.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const kb = stateRef.current.keybindings || DEFAULT_KEYBINDINGS;
      if (isActionKeyPressed('push_to_talk', e.code, kb) && isVoiceRecordingRef.current) {
        isVoiceRecordingRef.current = false;
        if (speechRecRef.current) {
          try {
            speechRecRef.current.stop();
          } catch {
            // ignore
          }
          speechRecRef.current = null;
        }
        setIsWalkthroughVoiceActive(false);
        const finalTranscript =
          liveTranscriptAccumRef.current.trim() || 'What secrets are you hiding in this room?';
        const target = walkthroughTargetAgent;
        if (target) {
          stateRef.current.onWalkthroughSpeakToAgent?.(target, finalTranscript);
        }
      }

      keysHeld.delete(e.code);
    };

    const updateMouseNDC = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      _mouse.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      // 1. CLICKING THE MOUSE WHEEL (button === 1) ALLOWS FOR ROTATING
      if (e.button === 1) {
        e.preventDefault();
        isMiddleMouseDown = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        downStartX = e.clientX;
        downStartY = e.clientY;
        renderer.domElement.style.cursor = 'all-scroll';
        return;
      }

      // Secondary / Right-click (button === 2) supports orbit rotation or clearing
      if (e.button === 2) {
        isRightMouseDown = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        downStartX = e.clientX;
        downStartY = e.clientY;
        return;
      }

      if (e.button !== 0) return; // Only process left click below

      isPointerDown = true;
      isPanningCamera = false;
      hasRecordedDragStart = false;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      downStartX = e.clientX;
      downStartY = e.clientY;

      const st = stateRef.current;
      updateMouseNDC(e.clientX, e.clientY);
      _raycaster.setFromCamera(_mouse, camera);

      if (st.mode === 'architect' && !st.isolateSelectedAsset) {
        // 1. Place blueprint or initiate wall row drag if active blueprint is loaded
        if (st.activeBlueprint) {
          const hitPoint = new THREE.Vector3();
          if (_raycaster.ray.intersectPlane(_groundPlane, hitPoint)) {
            const gx = snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.x)), 0.5);
            const gz = snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.z)), 0.5);
            if (st.activeBlueprint.category === 'wall') {
              // Initiate Wall Row Drag!
              isWallRowDragging = true;
              wallRowStartPos = { x: gx, z: gz };
              activeWallRowBlueprint = st.activeBlueprint;
              const initialSegs = computeWallRowPlacements(
                gx,
                gz,
                gx,
                gz,
                st.activeBlueprint.defaultDimensions
              );
              wallRowCurrentSegments = initialSegs;
              updateGhostRowPreview(initialSegs, st.activeBlueprint.defaultDimensions);
              ghostPreviewMesh.visible = false;
              return;
            } else {
              st.onPlaceBlueprintAt(gx, gz);
              ghostPreviewMesh.visible = false;
              return;
            }
          }
        }

        // 2. Raycast against 3D assets to select (or Shift+Click multi-select) & drag
        const hits = _raycaster.intersectObjects(interactableObjects, true);
        if (hits.length > 0 && !st.marqueeModeActive) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData?.assetId && !obj.userData?.agentId) {
            obj = obj.parent;
          }
          if (obj?.userData?.assetId) {
            const hitId = obj.userData.assetId;
            const hitAsset = obj.userData?.asset as PlacedAsset | undefined;

            // Alt + Click on an existing wall initiates an Extend Wall Row drag
            if (e.altKey && hitAsset && hitAsset.category === 'wall') {
              isWallRowDragging = true;
              const bp = createBlueprintFromAsset(hitAsset);
              activeWallRowBlueprint = bp;
              wallRowStartPos = { x: hitAsset.position[0], z: hitAsset.position[2] };
              const initialSegs = computeWallRowPlacements(
                wallRowStartPos.x,
                wallRowStartPos.z,
                wallRowStartPos.x,
                wallRowStartPos.z,
                bp.defaultDimensions
              );
              wallRowCurrentSegments = initialSegs;
              updateGhostRowPreview(initialSegs, bp.defaultDimensions);
              ghostPreviewMesh.visible = false;
              return;
            }

            // If clicking an already multi-selected object without Shift, keep the multi-selection so dragging moves them all simultaneously
            if (!e.shiftKey && st.selectedAssetIds.length > 1 && st.selectedAssetIds.includes(hitId)) {
              draggingAssetId = hitId;
              return;
            }
            st.onSelectAsset(hitId, e.shiftKey);
            draggingAssetId = hitId;
            return;
          }
        }

        // 3. If Shift is held on empty space OR Marquee Select mode is active, begin Marquee-Select box drag
        if (e.shiftKey || st.marqueeModeActive) {
          isMarqueeDragging = true;
          marqueeAdditiveShift = e.shiftKey;
          setMarqueeBox({
            x1: e.clientX,
            y1: e.clientY,
            x2: e.clientX,
            y2: e.clientY
          });
          return;
        }

        // 4. LEFT CLICKING WITHOUT AN ASSET PRESENT MAKES THE CAMERA PAN LEFT TO RIGHT / UP AND DOWN
        isPanningCamera = true;
        renderer.domElement.style.cursor = 'grabbing';
        st.onSelectAsset(null, false);
      } else if (st.mode === 'walkthrough') {
        const hits = _raycaster.intersectObjects(interactableObjects, true);
        if (hits.length > 0 && hits[0].distance <= 9.0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData?.assetId) {
            obj = obj.parent;
          }
          if (obj?.userData?.asset) {
            st.onSelectAsset(obj.userData.asset.id, e.shiftKey);
            if (obj.userData.asset.isSecretPassage || obj.userData.asset.category === 'door') {
              st.onToggleAssetOpen(obj.userData.asset);
            }
            return;
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = stateRef.current;
      updateMouseNDC(e.clientX, e.clientY);

      // CLICKING THE MOUSE WHEEL (or right drag) ALLOWS FOR ROTATING
      if (isMiddleMouseDown || (isRightMouseDown && Math.hypot(e.clientX - downStartX, e.clientY - downStartY) > 3)) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        if (st.mode === 'architect' || st.mode === 'soundboard') {
          architectOrbit.theta -= dx * 0.007;
          architectOrbit.phi = Math.max(0.12, Math.min(1.52, architectOrbit.phi - dy * 0.006));
        } else if (st.mode === 'walkthrough') {
          playerPoseRef.current.yaw -= dx * 0.0055;
          playerPoseRef.current.pitch = Math.max(
            -0.55,
            Math.min(0.55, playerPoseRef.current.pitch - dy * 0.004)
          );
        } else if (st.mode === 'character') {
          charPreviewRotation += dx * 0.012;
        }
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        return;
      }

      if (st.mode === 'architect') {
        if (st.isolateSelectedAsset) {
          ghostPreviewMesh.visible = false;
          if (isPointerDown) {
            const dx = e.clientX - lastPointerX;
            isolatedRotation += dx * 0.012;
            lastPointerX = e.clientX;
          }
          return;
        }

        if (isMarqueeDragging) {
          setMarqueeBox({
            x1: downStartX,
            y1: downStartY,
            x2: e.clientX,
            y2: e.clientY
          });
          return;
        }

        _raycaster.setFromCamera(_mouse, camera);
        const hitPoint = new THREE.Vector3();
        const hitPlane = _raycaster.ray.intersectPlane(_groundPlane, hitPoint);

        // Dynamic Wall Row Drag Placement: Update live preview segments along dominant axis
        if (isWallRowDragging && wallRowStartPos && activeWallRowBlueprint && hitPlane) {
          const gx = snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.x)), 0.5);
          const gz = snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.z)), 0.5);
          const segs = computeWallRowPlacements(
            wallRowStartPos.x,
            wallRowStartPos.z,
            gx,
            gz,
            activeWallRowBlueprint.defaultDimensions
          );
          wallRowCurrentSegments = segs;
          updateGhostRowPreview(segs, activeWallRowBlueprint.defaultDimensions);
          ghostPreviewMesh.visible = false;
          return;
        }

        if (st.activeBlueprint && hitPlane) {
          const [bw, bh, bd] = st.activeBlueprint.defaultDimensions;
          ghostPreviewMesh.visible = true;
          ghostPreviewMesh.scale.set(bw, bh, bd);
          ghostPreviewMesh.position.set(
            snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.x)), 0.5),
            bh / 2,
            snapToGrid(Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.z)), 0.5)
          );
        } else {
          ghostPreviewMesh.visible = false;
        }

        const dragDist = Math.hypot(e.clientX - downStartX, e.clientY - downStartY);
        if (isPointerDown && draggingAssetId && hitPlane && dragDist > 5) {
          if (!hasRecordedDragStart) {
            hasRecordedDragStart = true;
            st.onBeginAssetDrag(draggingAssetId);
          }
          const rawX = Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.x));
          const rawZ = Math.max(-HALF_GRID, Math.min(HALF_GRID, hitPoint.z));
          st.onMoveSelectedAssetTo(draggingAssetId, rawX, rawZ);
          return;
        }

        // 2. LEFT CLICKING WITHOUT AN ASSET PRESENT MAKES THE CAMERA PAN LEFT TO RIGHT / UP AND DOWN
        if (isPointerDown && isPanningCamera) {
          const dx = e.clientX - lastPointerX;
          const dy = e.clientY - lastPointerY;

          const rect = renderer.domElement.getBoundingClientRect();
          _vec3A.setFromMatrixColumn(camera.matrixWorld, 0); // Camera Right
          _vec3B.setFromMatrixColumn(camera.matrixWorld, 1); // Camera Up

          const { panX, panY, panZ } = computeCameraPanDelta(
            dx,
            dy,
            camera.fov,
            architectOrbit.radius,
            rect.height,
            [_vec3A.x, _vec3A.y, _vec3A.z],
            [_vec3B.x, _vec3B.y, _vec3B.z]
          );

          architectOrbit.targetX = Math.max(-HALF_GRID, Math.min(HALF_GRID, architectOrbit.targetX + panX));
          architectOrbit.targetY = Math.max(-2, Math.min(45, architectOrbit.targetY + panY));
          architectOrbit.targetZ = Math.max(-HALF_GRID, Math.min(HALF_GRID, architectOrbit.targetZ + panZ));

          lastPointerX = e.clientX;
          lastPointerY = e.clientY;
          return;
        }
      } else if (st.mode === 'character' && isPointerDown) {
        const dx = e.clientX - lastPointerX;
        charPreviewRotation += dx * 0.012;
        lastPointerX = e.clientX;
      } else if (st.mode === 'walkthrough' && isPointerDown) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        playerPoseRef.current.yaw -= dx * 0.0055;
        playerPoseRef.current.pitch = Math.max(
          -0.55,
          Math.min(0.55, playerPoseRef.current.pitch - dy * 0.004)
        );
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const st = stateRef.current;
      renderer.domElement.style.cursor = 'default';

      if (e.button === 1) {
        isMiddleMouseDown = false;
        return;
      }

      if (e.button === 2) {
        if (isRightMouseDown && Math.hypot(e.clientX - downStartX, e.clientY - downStartY) <= 3) {
          clearInputs();
          st.onSelectAsset(null, false);
        }
        isRightMouseDown = false;
        return;
      }

      // Finalize Wall Row Drag-Placement
      if (isWallRowDragging && wallRowStartPos && activeWallRowBlueprint) {
        if (wallRowCurrentSegments.length > 0) {
          if (st.onPlaceBlueprintRow) {
            st.onPlaceBlueprintRow(wallRowCurrentSegments, activeWallRowBlueprint);
          } else {
            wallRowCurrentSegments.forEach((seg) => {
              st.onPlaceBlueprintAt(seg.x, seg.z);
            });
          }
        }
        isWallRowDragging = false;
        wallRowStartPos = null;
        activeWallRowBlueprint = null;
        wallRowCurrentSegments = [];
        ghostRowPreviewGroup.visible = false;
        disposeGroupChildren(ghostRowPreviewGroup);
        isPointerDown = false;
        isPanningCamera = false;
        return;
      }

      if (isMarqueeDragging) {
        const minX = Math.min(downStartX, e.clientX);
        const maxX = Math.max(downStartX, e.clientX);
        const minY = Math.min(downStartY, e.clientY);
        const maxY = Math.max(downStartY, e.clientY);
        const rect = renderer.domElement.getBoundingClientRect();

        if (Math.hypot(maxX - minX, maxY - minY) > 6) {
          const floorAssets = st.assets.filter((a) => a.floor === st.currentFloor);
          const matchedIds: string[] = [];
          floorAssets.forEach((asset) => {
            _projVec.set(asset.position[0], asset.position[1], asset.position[2]);
            _projVec.project(camera);
            if (_projVec.z >= -1 && _projVec.z <= 1) {
              const sx = ((_projVec.x + 1) * 0.5) * rect.width + rect.left;
              const sy = ((-_projVec.y + 1) * 0.5) * rect.height + rect.top;
              if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
                matchedIds.push(asset.id);
              }
            }
          });
          st.onMarqueeSelectAssets(matchedIds, marqueeAdditiveShift);
        }
        isMarqueeDragging = false;
        setMarqueeBox(null);
      }

      isPointerDown = false;
      isPanningCamera = false;
      draggingAssetId = null;
      hasRecordedDragStart = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (stateRef.current.mode === 'architect') {
        architectOrbit.radius = Math.max(4, Math.min(95, architectOrbit.radius + e.deltaY * 0.015));
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 4. Software-WebGL Safe Animation Loop (afterDraw fenceSync) using high-precision performance.now()
    let frameId = 0;
    let isDisposed = false;
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let lastHudSyncTime = 0;
    let lastFootstepTime = 0;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const nowMs = performance.now();
      const rawDt = Math.max(0, (nowMs - prevTimeMs) * 0.001);
      prevTimeMs = nowMs;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = (nowMs - startTimeMs) * 0.001;
      const st = stateRef.current;

      if (st.mode === 'character') {
        camera.position.set(0, 1.22, 3.45);
        camera.lookAt(0, 0.68, 0);
        if (!isPointerDown) {
          charPreviewRotation += dt * 0.35;
        }
        characterStudioGroup.position.set(0, 0.32, 0);
        characterStudioGroup.rotation.y = charPreviewRotation;

        const previewChar = characterStudioGroup.children[0] as THREE.Group | undefined;
        if (previewChar && previewChar.userData?.bones) {
          const hybrid = evaluateHybridLowFrameRigState({
            appearance: st.customCharacterAppearance,
            gesture: 'idle_observe',
            isMoving: false,
            isSpeaking: false,
            continuousTimeSec: elapsed,
            effectiveFps: st.globalAnimationFps,
            cachedBodyPose: previewChar.userData.cachedBodyPose,
            lastStepIndex: previewChar.userData.lastStepIndex
          });
          previewChar.userData.cachedBodyPose = hybrid.bodyPose;
          previewChar.userData.lastStepIndex = hybrid.stepIndex;
          applySkeletonPoseToRig(previewChar, hybrid.bodyPose, hybrid.facialRig, {
            updateBody: hybrid.bodyPoseRecomputed,
            updateFace: true
          });
        }
      } else if (st.mode === 'architect' && st.isolateSelectedAsset && st.selectedAssetId) {
        camera.position.set(0, 2.35, 5.6);
        camera.lookAt(0, 0.45, 0);
        if (!isPointerDown) {
          isolatedRotation += dt * 0.4;
        }
        isolatedAssetGroup.position.set(0, 0.72, 0);
        isolatedAssetGroup.rotation.y = isolatedRotation;
      } else if (st.mode === 'architect' || st.mode === 'soundboard') {
        // Classic First-Person Controls (User-Defined Keybindings with Camera-Oriented Forward/Strafe)
        const kb = st.keybindings || DEFAULT_KEYBINDINGS;
        let forwardInput = 0;
        let rightInput = 0;
        let upInput = 0;

        if (isActionKeyHeld('move_forward', keysHeld, kb)) forwardInput += 1;
        if (isActionKeyHeld('move_backward', keysHeld, kb)) forwardInput -= 1;
        if (isActionKeyHeld('move_right', keysHeld, kb)) rightInput += 1;
        if (isActionKeyHeld('move_left', keysHeld, kb)) rightInput -= 1;
        if (isActionKeyHeld('camera_up', keysHeld, kb)) upInput += 1;
        if (isActionKeyHeld('camera_down', keysHeld, kb)) upInput -= 1;

        if (forwardInput !== 0 || rightInput !== 0 || upInput !== 0) {
          const moveSpeed = (isActionKeyHeld('sprint_camera', keysHeld, kb) ? 24.0 : 12.0) * dt;
          const { dx, dy, dz } = computeFirstPersonCameraDisplacement(
            architectOrbit.theta,
            forwardInput,
            rightInput,
            upInput,
            moveSpeed
          );

          architectOrbit.targetX = Math.max(-HALF_GRID, Math.min(HALF_GRID, architectOrbit.targetX + dx));
          architectOrbit.targetY = Math.max(-2, Math.min(45, architectOrbit.targetY + dy));
          architectOrbit.targetZ = Math.max(-HALF_GRID, Math.min(HALF_GRID, architectOrbit.targetZ + dz));
        }

        const desiredX =
          architectOrbit.targetX +
          architectOrbit.radius * Math.sin(architectOrbit.phi) * Math.sin(architectOrbit.theta);
        const desiredY =
          architectOrbit.targetY +
          architectOrbit.radius * Math.cos(architectOrbit.phi);
        const desiredZ =
          architectOrbit.targetZ +
          architectOrbit.radius * Math.sin(architectOrbit.phi) * Math.cos(architectOrbit.theta);

        const dampFactor = 1 - Math.exp(-14 * dt);
        camera.position.lerp(_vec3A.set(desiredX, desiredY, desiredZ), dampFactor);
        camera.lookAt(architectOrbit.targetX, architectOrbit.targetY, architectOrbit.targetZ);
      } else if (st.mode === 'walkthrough') {
        const kb = st.keybindings || DEFAULT_KEYBINDINGS;
        const pose = playerPoseRef.current;
        const turnSpeed = 1.95 * dt;
        if (isActionKeyHeld('turn_left', keysHeld, kb)) pose.yaw += turnSpeed;
        if (isActionKeyHeld('turn_right', keysHeld, kb)) pose.yaw -= turnSpeed;

        // Stealth Crouch stance: active while holding bound stealth_crouch key(s) or when HUD crouch toggle is active
        const isCrouching =
          crouchToggledRef.current || isActionKeyHeld('stealth_crouch', keysHeld, kb);

        const targetEyeHeight = isCrouching ? 1.02 : 1.62;
        pose.eyeHeight += (targetEyeHeight - pose.eyeHeight) * Math.min(1, 12 * dt);

        let forwardInput = 0;
        let strafeInput = 0;
        if (isActionKeyHeld('move_forward', keysHeld, kb)) forwardInput += 1;
        if (isActionKeyHeld('move_backward', keysHeld, kb)) forwardInput -= 1;
        // In Walk mode, ArrowLeft/ArrowRight default to turning unless explicitly only bound to strafing
        const strafeLeftHeld = (kb.move_left || []).some(
          (code) => keysHeld.has(code) && !(kb.turn_left || []).includes(code)
        );
        const strafeRightHeld = (kb.move_right || []).some(
          (code) => keysHeld.has(code) && !(kb.turn_right || []).includes(code)
        );
        if (strafeLeftHeld) strafeInput -= 1;
        if (strafeRightHeld) strafeInput += 1;

        if (forwardInput !== 0 || strafeInput !== 0) {
          const speed = (isCrouching ? 2.45 : 4.5) * dt;
          const forwardX = -Math.sin(pose.yaw);
          const forwardZ = -Math.cos(pose.yaw);
          const rightX = Math.cos(pose.yaw);
          const rightZ = -Math.sin(pose.yaw);

          const dx = (forwardX * forwardInput + rightX * strafeInput) * speed;
          const dz = (forwardZ * forwardInput + rightZ * strafeInput) * speed;

          if (!checkPlayerCollision(pose.x + dx, pose.z, st.currentFloor, st.assets)) {
            pose.x += dx;
          }
          if (!checkPlayerCollision(pose.x, pose.z + dz, st.currentFloor, st.assets)) {
            pose.z += dz;
          }

          pose.bobPhase += Math.hypot(dx, dz) * (isCrouching ? 2.8 : 3.5);
        }

        const bobOffset = Math.sin(pose.bobPhase) * (isCrouching ? 0.009 : 0.02);
        camera.position.set(pose.x, pose.eyeHeight + bobOffset, pose.z);

        const lookTargetX = pose.x - Math.sin(pose.yaw) * 4;
        const lookTargetY = pose.eyeHeight + pose.pitch * 3 + bobOffset * 0.5;
        const lookTargetZ = pose.z - Math.cos(pose.yaw) * 4;
        camera.lookAt(_vec3B.set(lookTargetX, lookTargetY, lookTargetZ));

        // Proposal 2: Update 1970s D-Cell / UV Inspection Flashlight Cone in Walk Mode
        const isFlashlightActive = Boolean(st.flashlightEnabled);
        flashlightSpot.visible = isFlashlightActive;
        flashlightConeMesh.visible = isFlashlightActive;
        if (isFlashlightActive) {
          flashlightSpot.position.set(pose.x, pose.eyeHeight - 0.14 + bobOffset, pose.z);
          flashlightTarget.position.set(lookTargetX, lookTargetY, lookTargetZ);
          flashlightTarget.updateMatrixWorld();

          flashlightConeMesh.position.set(pose.x, pose.eyeHeight - 0.2 + bobOffset, pose.z);
          flashlightConeMesh.lookAt(lookTargetX, lookTargetY, lookTargetZ);
        }
      } else {
        flashlightSpot.visible = false;
        flashlightConeMesh.visible = false;
      }

      // Animate placed character agents on active floor with dynamic skeletal motion, scheduled activity gestures, facial expressions & 3D spatial footsteps
      dynamicAssetsGroup.children.forEach((child) => {
        if (child.userData?.isCharacterRig && child.userData?.agent) {
          const ag = child.userData.agent as HotelAgentProfile;
          const isSpeaking = st.activeSpeakingAgentId === ag.id;
          const activeSched = getActiveDailyAction(ag.dailySchedule, st.gameTimeMinutes);
          const isActivelyPacing =
            !isSpeaking &&
            (activeSched.activityGesture === 'pace_corridor' ||
              activeSched.activityGesture === 'sleepwalk_trance' ||
              ag.status === 'erratic');

          // Advance character patrol / stride phase and trigger 3D spatialized surface footsteps
          if (!isSpeaking) {
            const prevCharStride =
              typeof child.userData.stridePhase === 'number'
                ? (child.userData.stridePhase as number)
                : (child.id % 5) * 0.7;
            const strideSpeed = isActivelyPacing ? 2.45 : 1.05;
            const nextCharStride = prevCharStride + dt * strideSpeed;
            child.userData.stridePhase = nextCharStride;

            if (isActivelyPacing) {
              const patrolRadius = activeSched.activityGesture === 'pace_corridor' ? 0.85 : 0.55;
              child.position.x = ag.position[0] + Math.sin(nextCharStride * 0.55) * patrolRadius;
              child.position.z =
                ag.position[2] + Math.cos(nextCharStride * 0.55) * (patrolRadius * 0.45);
            } else {
              child.position.x = ag.position[0];
              child.position.z = ag.position[2];
            }
          }

          const distToCamera = Math.hypot(
            child.position.x - camera.position.x,
            child.position.z - camera.position.z
          );
          const charAnimTime = elapsed + (child.id % 5);
          const lodState = computeCharacterAnimationLodState({
            characterFloor: ag.floor,
            activeFloor: st.currentFloor,
            isFloorVisible: child.visible,
            distanceMeters: distToCamera,
            continuousTimeSec: charAnimTime,
            lastUpdatedStepIndex: child.userData.lastStepIndex,
            globalFps: st.globalAnimationFps
          });

          if (lodState.tier !== 'culled') {
            const hybrid = evaluateHybridLowFrameRigState({
              appearance: ag.appearance || st.customCharacterAppearance,
              gesture: activeSched.activityGesture || 'idle_observe',
              isMoving: isActivelyPacing,
              isSpeaking,
              continuousTimeSec: charAnimTime,
              effectiveFps: lodState.effectiveBodyFps,
              disposition: ag.disposition,
              hasUnansweredQuestions: (ag.pendingQuestions || []).some((q) => !q.resolved),
              cachedBodyPose: child.userData.cachedBodyPose,
              lastStepIndex: child.userData.lastStepIndex
            });
            child.userData.cachedBodyPose = hybrid.bodyPose;
            child.userData.lastStepIndex = hybrid.stepIndex;
            child.userData.animationLodTier = lodState.tier;
            applySkeletonPoseToRig(child as THREE.Group, hybrid.bodyPose, hybrid.facialRig, {
              updateBody: hybrid.bodyPoseRecomputed,
              updateFace: lodState.shouldUpdateFace
            });
          }
        }
      });

      // Proposal 1: Animate 60Hz Fluorescent Ballast Stutter, Warm Tungsten Lamp Pools & CRT Phosphor Shimmer
      for (let i = 0; i < activeMoodLightNodes.length; i++) {
        const node = activeMoodLightNodes[i];
        const frame = computePerRoomMoodLightState(elapsed, node.spec.id, node.spec.kind);
        node.light.intensity = frame.intensity;
        node.light.color.set(frame.colorHex);
        node.bulbMat.emissive.set(frame.colorHex);
        node.bulbMat.emissiveIntensity = frame.isFlickerDrop ? 0.18 : 0.92;
      }

      // Smooth 500ms Hinge Rotation / Pocket-Slide Animation for Doors & Secret Passages (Proposals 1 & 2)
      const wallClockMs = Date.now();
      const updateGroupHinges = (grp: THREE.Group) => {
        for (let i = 0; i < grp.children.length; i++) {
          const child = grp.children[i];
          const hingePivot = child.userData?.hingePivot as THREE.Group | undefined;
          const assetId = child.userData?.assetId as string | undefined;
          if (hingePivot && assetId) {
            const latestAsset =
              st.assets.find((a) => a.id === assetId) ||
              (child.userData?.asset as PlacedAsset | undefined);
            if (latestAsset) {
              const hingeAnim = computeAssetHingeAnimationState(latestAsset, wallClockMs);
              const hingeX = hingeAnim.hingeEdgeX;
              hingePivot.position.x = hingeX + hingeAnim.slideOffsetX;
              hingePivot.rotation.y = hingeAnim.angleRad;

              const doorPanel = child.userData?.doorPanel as THREE.Mesh | undefined;
              if (doorPanel) {
                doorPanel.position.x = -hingeX;
              }
              const shelves = child.userData?.shelves as THREE.Mesh[] | undefined;
              if (Array.isArray(shelves)) {
                for (let s = 0; s < shelves.length; s++) {
                  shelves[s].position.x = -hingeX;
                }
              }
              const latch = child.userData?.latch as THREE.Mesh | undefined;
              const assetW = (child.userData?.assetWidth as number) || latestAsset.dimensions[0] || 1.2;
              if (latch) {
                const latchOffset = hingeAnim.swingMode === 'left_hinge' ? assetW * 0.32 : -assetW * 0.32;
                latch.position.x = -hingeX + latchOffset;
              }
            }
          }
        }
      };
      updateGroupHinges(dynamicAssetsGroup);
      updateGroupHinges(isolatedAssetGroup);

      // Periodically project the primary selected asset's 3D position to 2D screen coordinates
      // so the [F] Quick Edit floating window sits immediately to the right of the asset
      if (elapsed - lastHudSyncTime > 0.2) {
        lastHudSyncTime = elapsed;
        if (st.selectedAssetId && st.onSelectedAssetScreenPosition) {
          const selObj = st.assets.find((a) => a.id === st.selectedAssetId);
          if (selObj) {
            const rect = renderer.domElement.getBoundingClientRect();
            _projVec.set(
              selObj.position[0] + selObj.dimensions[0] * 0.55,
              selObj.position[1] + selObj.dimensions[1] * 0.35,
              selObj.position[2]
            );
            _projVec.project(camera);
            const sx = Math.round(((_projVec.x + 1) * 0.5) * rect.width + rect.left + 24);
            const sy = Math.round(((-_projVec.y + 1) * 0.5) * rect.height + rect.top - 40);
            st.onSelectedAssetScreenPosition({ x: sx, y: sy });
          }
        }

        if (st.mode === 'walkthrough') {
          const pose = playerPoseRef.current;
          const roomName = getRoomLabelAtPosition(st.currentFloor, pose.x, pose.z);
          const currentSurface = resolveFloorSurfaceMaterialAtPosition(
            pose.x,
            pose.z,
            st.currentFloor,
            st.assets
          );
          const kb = st.keybindings || DEFAULT_KEYBINDINGS;
          const currentlyCrouching =
            crouchToggledRef.current || isActionKeyHeld('stealth_crouch', keysHeld, kb);

          setActiveFloorSurface(currentSurface);
          setIsPlayerCrouchingHud(currentlyCrouching);

          // Proposal 2: Evaluate Flashlight / UV Inspection Cone hits against secret walls & clues
          const inspection = computeFlashlightInspectionState(
            [pose.x, pose.eyeHeight, pose.z],
            pose.yaw,
            pose.pitch,
            Boolean(st.flashlightEnabled),
            st.currentFloor,
            st.assets
          );

          disposeGroupChildren(flashlightRevealGroup);
          if (inspection.revealedAssetIds.length > 0) {
            const revSet = new Set(inspection.revealedAssetIds);
            st.assets.forEach((asset) => {
              if (asset.floor === st.currentFloor && revSet.has(asset.id)) {
                const [w, h, d] = asset.dimensions;
                const boxGeom = new THREE.BoxGeometry(w + 0.08, h + 0.08, d + 0.08);
                const edges = new THREE.EdgesGeometry(boxGeom);
                const line = new THREE.LineSegments(
                  edges,
                  new THREE.LineBasicMaterial({
                    color: asset.isSecretPassage ? 0xf59e0b : 0xc084fc
                  })
                );
                line.position.set(asset.position[0], asset.position[1], asset.position[2]);
                line.rotation.y = asset.rotationY;
                flashlightRevealGroup.add(line);
                boxGeom.dispose();
              }
            });
          }

          st.onFlashlightRevealChange?.(
            inspection.hiddenChalkInscription,
            inspection.revealedAssetIds.length
          );

          let nearestAgent: HotelAgentProfile | null = null;
          let bestAgentDist = 5.5;
          for (const ag of st.agents) {
            if (ag.floor === st.currentFloor && ag.role !== 'helper_entity') {
              const d = Math.hypot(ag.position[0] - pose.x, ag.position[2] - pose.z);
              if (d <= bestAgentDist) {
                bestAgentDist = d;
                nearestAgent = ag;
              }
            }
          }

          let nearestObj: PlacedAsset | null = null;
          let bestDist = 4.5;
          for (const asset of st.assets) {
            if (asset.floor === st.currentFloor) {
              const d = Math.hypot(asset.position[0] - pose.x, asset.position[2] - pose.z);
              if (d <= bestDist) {
                bestDist = d;
                nearestObj = asset;
              }
            }
          }

          const crouchKey = getPrimaryActionKeyLabel('stealth_crouch', kb);
          const flashKey = getPrimaryActionKeyLabel('toggle_flashlight', kb);
          const interactKey = getPrimaryActionKeyLabel('interact', kb);
          const pttKey = getPrimaryActionKeyLabel('push_to_talk', kb);
          const quickEditKey = getPrimaryActionKeyLabel('quick_edit', kb);

          let promptStr = `1st-Person Walk: [${crouchKey}] ${currentlyCrouching ? 'Crouching (Silent)' : 'Crouch'} · Surface: ${currentSurface.toUpperCase()} · [${flashKey}] Flashlight (${st.flashlightEnabled ? 'ON' : 'OFF'}) · [${interactKey}] Interact`;
          if (inspection.hiddenChalkInscription) {
            promptStr = inspection.hiddenChalkInscription;
          } else if (nearestAgent) {
            const sched = getActiveDailyAction(nearestAgent.dailySchedule, st.gameTimeMinutes);
            promptStr = `🎙️ Hold [${pttKey}] to Talk Live to ${nearestAgent.name} (${sched.phase}: ${sched.action}) | [${interactKey}] Interrogate`;
          } else if (nearestObj) {
            promptStr = `Press [${interactKey}] to Interact, [${crouchKey}] Stealth Crouch, [${flashKey}] Flashlight (${st.flashlightEnabled ? 'ON' : 'OFF'}), or [${quickEditKey}] Quick-Edit "${nearestObj.name}"`;
          }

          st.onPlayerRoomChange(roomName, promptStr);
        } else {
          disposeGroupChildren(flashlightRevealGroup);
          st.onFlashlightRevealChange?.(null, 0);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, []);

  const surfaceBadgeMeta: Record<
    FloorSurfaceMaterial,
    { label: string; icon: string; acousticNote: string }
  > = {
    carpet: {
      label: 'Carpet Runner',
      icon: '🟫',
      acousticNote: 'Muffled 62Hz Wool Thud'
    },
    wood: {
      label: 'Oak Parquet Wood',
      icon: '🪵',
      acousticNote: 'Resonant 96Hz Plank + Creak'
    },
    linoleum: {
      label: 'Vinyl Linoleum Tile',
      icon: '⬜',
      acousticNote: 'Crisp 148Hz Heel Snap'
    }
  };

  return (
    <>
      <div
        ref={mountRef}
        data-testid="hotel-webgl-viewport"
        className="fixed inset-0 w-full h-full overflow-hidden bg-[#f8fafc]"
      />
      {/* Walkthrough Live Speech-to-Text Recording HUD Banner */}
      {isWalkthroughVoiceActive && walkthroughTargetAgent && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[#1c140e]/95 border-2 border-rose-600 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 text-center min-w-[320px] max-w-[540px] animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-wider text-rose-300 uppercase">
              ● Live Speech to {walkthroughTargetAgent.name}
            </span>
          </div>
          <p className="font-serif italic text-sm text-[#fef3c7] leading-tight">
            "{walkthroughLiveTranscript}"
          </p>
          <span className="text-[10px] text-amber-200/80 font-mono">
            Release [{getPrimaryActionKeyLabel('push_to_talk', keybindings)}] key to transmit voice to tenant memory
          </span>
        </div>
      )}
      {/* Visual Marquee-Select Rectangle Overlay */}
      {marqueeBox && (
        <div
          data-testid="marquee-selection-box"
          style={{
            left: `${Math.min(marqueeBox.x1, marqueeBox.x2)}px`,
            top: `${Math.min(marqueeBox.y1, marqueeBox.y2)}px`,
            width: `${Math.abs(marqueeBox.x2 - marqueeBox.x1)}px`,
            height: `${Math.abs(marqueeBox.y2 - marqueeBox.y1)}px`
          }}
          className="fixed z-20 pointer-events-none border-2 border-[#0284c7] bg-[#38bdf8]/20 rounded-xl shadow-sm"
        />
      )}
    </>
  );
};
