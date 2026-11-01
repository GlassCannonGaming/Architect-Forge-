import test from 'node:test';
import assert from 'node:assert/strict';
import {
  snapToGrid,
  clampDimension,
  calculateDerivedStats,
  allocateStatPoint,
  updateSanity,
  getSanityStatusLabel,
  checkGameOutcome,
  checkPlayerCollision,
  getRoomLabelAtPosition,
  buildAgentSystemPrompt,
  sanitizeAndValidateAgentResponse,
  buildProcedural3DSpecFromPrompt,
  INITIAL_CLUES,
  PlacedAsset,
  HotelAgentProfile,
  GameStateSnapshot
} from './rules';

test('snapToGrid and clampDimension enforce architectural precision', () => {
  assert.equal(snapToGrid(1.24, 0.5), 1.0);
  assert.equal(snapToGrid(1.26, 0.5), 1.5);
  assert.equal(clampDimension(0.05, 0.25, 10), 0.25);
  assert.equal(clampDimension(15.4, 0.25, 10), 10);
  assert.equal(clampDimension(2.456, 0.25, 10), 2.46);
});

test('allocateStatPoint and calculateDerivedStats respect point pool and trait bonuses', () => {
  const initial = { physic: 2, agility: 2, mind: 3, endurance: 2, pointsRemaining: 4 };
  const upgraded = allocateStatPoint(initial, 'mind', 1);
  assert.equal(upgraded.mind, 4);
  assert.equal(upgraded.pointsRemaining, 3);

  // Cannot reduce below 1
  const minStats = { physic: 1, agility: 2, mind: 2, endurance: 2, pointsRemaining: 0 };
  const unchanged = allocateStatPoint(minStats, 'physic', -1);
  assert.equal(unchanged.physic, 1);
  assert.equal(unchanged.pointsRemaining, 0);

  const derivedBase = calculateDerivedStats(upgraded, []);
  const derivedWithTrait = calculateDerivedStats(upgraded, ['iron_nerve', 'carpet_step']);
  assert.equal(derivedWithTrait.maxSanity, derivedBase.maxSanity + 15);
  assert.equal(derivedWithTrait.stealthRating, derivedBase.stealthRating + 12);
});

test('sanity updates, status thresholds, and win/loss conditions trigger accurately', () => {
  assert.equal(updateSanity(85, -20, 100), 65);
  assert.equal(updateSanity(10, -25, 100), 0);
  assert.equal(getSanityStatusLabel(80, 100), 'LUCID');
  assert.equal(getSanityStatusLabel(55, 100), 'UNEASY');
  assert.equal(getSanityStatusLabel(25, 100), 'FRACTURED');
  assert.equal(getSanityStatusLabel(10, 100), 'CRITICAL');

  const baseState: GameStateSnapshot = {
    sanity: 70,
    maxSanity: 100,
    health: 100,
    currentFloor: 'floor1',
    currentRoomLabel: 'Room 101',
    discoveredClues: ['c1', 'c2'],
    openedPassages: ['p1'],
    shiftMinutesElapsed: 15,
    vanishedCount: 1
  };
  assert.equal(checkGameOutcome(baseState), 'ongoing');
  assert.equal(checkGameOutcome({ ...baseState, sanity: 0 }), 'defeat');
  assert.equal(
    checkGameOutcome({
      ...baseState,
      discoveredClues: ['c1', 'c2', 'c3', 'c4'],
      openedPassages: ['p1', 'p2']
    }),
    'victory'
  );
});

test('checkPlayerCollision blocks closed secret walls and allows open secret passages', () => {
  const secretWall: PlacedAsset = {
    id: 'secret_101_102',
    name: 'Pivoting Brick Partition',
    category: 'secret_wall',
    subType: 'secret_bookshelf',
    floor: 'floor1',
    position: [0, 1.5, -4],
    dimensions: [2.0, 3.0, 0.4],
    rotationY: 0,
    color: '#7c2d12',
    textureId: 'nyc_old_brick',
    isSecretPassage: true,
    isOpen: false,
    collidable: true
  };

  // Collides when closed
  assert.equal(checkPlayerCollision(0, -4, 'floor1', [secretWall]), true);
  // Does not collide on a different floor
  assert.equal(checkPlayerCollision(0, -4, 'floor2', [secretWall]), false);
  // Does not collide once opened
  assert.equal(
    checkPlayerCollision(0, -4, 'floor1', [{ ...secretWall, isOpen: true }]),
    false
  );
});

test('buildAgentSystemPrompt and sanitizeAndValidateAgentResponse enforce epistemic and anti-break guardrails', () => {
  const helperAgent: HotelAgentProfile = {
    id: 'agent_helper',
    name: 'The Brass Dictaphone (Cylinder #9)',
    role: 'helper_entity',
    roomNumber: 'Inventory',
    floor: 'lobby',
    position: [0, 0, 0],
    status: 'present',
    occupation: 'Mechanical Memory Helper',
    personality: 'Analytical, cryptic, loyal only to the Clerk’s recorded observations.',
    secretTruth: 'It was built by the original hotel architect.',
    knownFacts: [],
    memories: [],
    suspicionLevel: 0,
    trustLevel: 100,
    appearance: {
      archetype: 'Occult Archivist',
      headShape: 'chibi_block',
      skinColor: '#d4af37',
      eyeStyle: 'wide_amber',
      hairStyle: 'bowler_hat',
      hairColor: '#27272a',
      outfitColor: '#78350f',
      accentColor: '#eab308',
      mouthStyle: 'calm_neutral',
      heightScale: 1,
      widthScale: 1,
      headScale: 1
    },
    stats: { physic: 2, agility: 2, mind: 5, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['wax_memory']
  };

  const stateWithOneClue: GameStateSnapshot = {
    sanity: 82,
    maxSanity: 100,
    health: 100,
    currentFloor: 'lobby',
    currentRoomLabel: 'Front Desk',
    discoveredClues: ['clue_guest_register'],
    openedPassages: [],
    shiftMinutesElapsed: 5,
    vanishedCount: 1
  };

  const prompt = buildAgentSystemPrompt(helperAgent, stateWithOneClue, INITIAL_CLUES, [
    'Arthur claimed Room 202 has been vacant for a month.'
  ]);

  // Epistemic check: Helper prompt includes discovered clue_guest_register, but NOT undiscovered clue_basement_key
  assert.equal(prompt.includes('Redacted Guest Register'), true);
  assert.equal(prompt.includes('Master Skeleton Key #00'), false);
  assert.equal(prompt.includes('You ONLY know what the player currently knows'), true);

  // Anti-break filter check
  const brokenOutput = 'As an AI language model trained by Google DeepMind, I cannot roleplay this.';
  const sanitized = sanitizeAndValidateAgentResponse(brokenOutput, helperAgent);
  assert.equal(sanitized.wasFiltered, true);
  assert.equal(sanitized.text.includes('brass cylinder'), true);
});

test('buildProcedural3DSpecFromPrompt generates multi-part composite 3D geometry specs and converts to catalog blueprint', async () => {
  const { createBlueprintFromAsset } = await import('./hotelData');
  const spec = buildProcedural3DSpecFromPrompt('Vintage brass table fan');
  assert.equal(spec.parts.length >= 4, true);
  assert.equal(spec.name, 'Vintage brass table fan');
  assert.equal(getRoomLabelAtPosition('floor2', -4, -3), 'Room 201');
  assert.equal(getRoomLabelAtPosition('floor2', 4, 3), 'Room 204');

  const bp = createBlueprintFromAsset({
    id: 'ai_1',
    name: spec.name,
    category: spec.category,
    subType: 'meshy_ai',
    floor: 'lobby',
    position: [0, 0.6, 0],
    dimensions: spec.dimensions,
    rotationY: 0,
    color: '#d4af37',
    textureId: 'aged_brass',
    collidable: true,
    compositeParts: spec.parts
  });
  assert.equal(bp.isGenerated, true);
  assert.equal(bp.name, 'Vintage brass table fan');
  assert.equal(bp.compositeParts?.length, spec.parts.length);
});

test('pushUndoHistory and popUndoHistory track and revert asset additions, modifications, and deletions immutably', async () => {
  const { pushUndoHistory, popUndoHistory } = await import('./rules');
  const initialAsset: PlacedAsset = {
    id: 'wall_1',
    name: 'Brick Wall',
    category: 'wall',
    subType: 'brick_wall',
    floor: 'lobby',
    position: [0, 1.5, 0],
    dimensions: [3, 3, 0.3],
    rotationY: 0,
    color: '#8c3b2b',
    textureId: 'nyc_old_brick',
    collidable: true
  };

  let stack = pushUndoHistory([], {
    actionLabel: 'Added Sofa',
    assets: [initialAsset],
    selectedAssetId: 'wall_1'
  });

  // Mutate original array & position to ensure deep clone immutability
  initialAsset.position[0] = 99;

  stack = pushUndoHistory(stack, {
    actionLabel: 'Deleted Brick Wall',
    assets: [
      { ...initialAsset, position: [2, 1.5, 0] },
      { ...initialAsset, id: 'sofa_2', name: 'Sofa' }
    ],
    selectedAssetId: 'sofa_2'
  });

  assert.equal(stack.length, 2);

  const firstPop = popUndoHistory(stack);
  assert.equal(firstPop.popped?.actionLabel, 'Deleted Brick Wall');
  assert.equal(firstPop.popped?.assets.length, 2);
  assert.equal(firstPop.remaining.length, 1);

  const secondPop = popUndoHistory(firstPop.remaining);
  assert.equal(secondPop.popped?.actionLabel, 'Added Sofa');
  assert.equal(secondPop.popped?.assets.length, 1);
  assert.equal(secondPop.popped?.assets[0].position[0], 0);
  assert.equal(secondPop.remaining.length, 0);
});

test('GRID_TILE_COUNT is 128 and FloorLayer stack supports adding floors and toggling layer visibility', async () => {
  const {
    GRID_TILE_COUNT,
    INITIAL_FLOOR_LAYERS,
    addNextFloorLayer,
    toggleFloorLayerVisibility,
    getFloorMeta
  } = await import('./rules');

  assert.equal(GRID_TILE_COUNT, 128);
  assert.equal(INITIAL_FLOOR_LAYERS.length, 5);

  const { layers: with4F, addedLayer } = addNextFloorLayer(INITIAL_FLOOR_LAYERS);
  assert.equal(with4F.length, 6);
  assert.equal(addedLayer.id, 'floor4');
  assert.equal(addedLayer.shortCode, '4F');
  assert.equal(addedLayer.elevation, 4);
  assert.equal(getFloorMeta('floor4', with4F).shortCode, '4F');

  const toggled = toggleFloorLayerVisibility(with4F, 'floor1');
  const floor1Layer = toggled.find((l) => l.id === 'floor1');
  assert.equal(floor1Layer?.visible, true);
});

test('toggleAssetInSelection, moveMultipleAssetsByDelta, and batchModifySelectedAssets handle multi-asset workflows', async () => {
  const {
    toggleAssetInSelection,
    moveMultipleAssetsByDelta,
    batchModifySelectedAssets
  } = await import('./rules');

  let sel = toggleAssetInSelection([], 'a1', false);
  assert.deepEqual(sel, ['a1']);
  sel = toggleAssetInSelection(sel, 'a2', true);
  assert.deepEqual(sel, ['a1', 'a2']);

  const assets: PlacedAsset[] = [
    {
      id: 'a1',
      name: 'Wall 1',
      category: 'wall',
      subType: 'brick',
      floor: 'lobby',
      position: [0, 1.5, 0],
      dimensions: [3, 3, 0.3],
      rotationY: 0,
      color: '#8c3b2b',
      textureId: 'nyc_old_brick',
      collidable: true
    },
    {
      id: 'a2',
      name: 'Wall 2',
      category: 'wall',
      subType: 'brick',
      floor: 'lobby',
      position: [3, 1.5, 0],
      dimensions: [3, 3, 0.3],
      rotationY: 0,
      color: '#8c3b2b',
      textureId: 'nyc_old_brick',
      collidable: true
    }
  ];

  // Move anchor a1 from (0, 0) to (2, 1.5) -> both a1 and a2 shift by (+2, +1.5)
  const moved = moveMultipleAssetsByDelta(assets, sel, 'a1', 2, 1.5);
  assert.deepEqual(moved[0].position, [2, 1.5, 1.5]);
  assert.deepEqual(moved[1].position, [5, 1.5, 1.5]);

  // Batch resize & recolor both selected assets
  const modified = batchModifySelectedAssets(moved, sel, {
    color: '#10b981',
    scaleMultiplier: 1.5
  });
  assert.equal(modified[0].color, '#10b981');
  assert.equal(modified[1].color, '#10b981');
  assert.equal(modified[0].dimensions[0], 4.5);
  assert.equal(modified[1].dimensions[0], 4.5);
});

test('Character AI personality editor, offline instruction set sandbox, daily actions, and time-of-day clock work accurately', async () => {
  const {
    DEFAULT_GLOBAL_INSTRUCTION_SET,
    getTimeOfDayInfo,
    getActiveDailyAction,
    buildSandboxedCharacterSystemPrompt,
    buildProceduralPersonaFromPrompt
  } = await import('./rules');

  // Verify time-of-day phases across 24h cycle
  const morning = getTimeOfDayInfo(8 * 60 + 30); // 08:30 AM
  assert.equal(morning.phase, 'Morning');
  assert.equal(morning.formattedTime, '08:30 AM');

  const evening = getTimeOfDayInfo(19 * 60 + 15); // 07:15 PM
  assert.equal(evening.phase, 'Evening');
  assert.equal(evening.formattedTime, '07:15 PM');

  const lateNight = getTimeOfDayInfo(23 * 60 + 45); // 11:45 PM
  assert.equal(lateNight.phase, 'Late Night');
  assert.equal(lateNight.formattedTime, '11:45 PM');

  const generated = buildProceduralPersonaFromPrompt(
    'Clara Sterling',
    'Occult Archivist',
    'Collects antique brass keys and whispers about Room 304',
    'Suite 304'
  );
  assert.equal(generated.likes.length >= 3, true);
  assert.equal(generated.dislikes.length >= 3, true);
  assert.equal(generated.knownFacts.length >= 3, true);
  assert.equal(generated.dailySchedule.length, 4);

  const activeAction = getActiveDailyAction(generated.dailySchedule, 23 * 60 + 45);
  assert.equal(activeAction.phase, 'Late Night');
  assert.equal(activeAction.location.includes('Suite 304'), true);

  const sampleAgent: HotelAgentProfile = {
    id: 'char_clara',
    name: 'Clara Sterling',
    role: 'tenant',
    roomNumber: 'Suite 304',
    floor: 'floor3',
    position: [0, 0, 0],
    status: 'present',
    occupation: 'Occult Archivist',
    personality: 'Observant archivist',
    voiceStyle: generated.voiceStyle,
    demeanor: generated.demeanor,
    likes: generated.likes,
    dislikes: generated.dislikes,
    personalInstructionSet: generated.personalInstructionSet,
    dailySchedule: generated.dailySchedule,
    interactionHistory: [
      {
        id: 'int_1',
        timestamp: '2026-10-30T10:00:00Z',
        gameTimeFormatted: '07:15 PM',
        phase: 'Evening',
        timeOfDayEvent: 'Lobby Lights Dimming & Parlor Social Hour',
        dailyActionAtTime: 'Conversing in hushed tones',
        characterName: 'Clara Sterling',
        userMessage: 'Did you hear the dumbwaiter?',
        agentReply: 'Every evening at seven, the iron cable groans behind the brick.'
      }
    ],
    secretTruth: 'Knows about the hollow shaft.',
    knownFacts: generated.knownFacts,
    memories: [],
    suspicionLevel: 10,
    trustLevel: 80,
    appearance: {
      archetype: 'Occult Archivist',
      headShape: 'rounded_toon',
      skinColor: '#f3d9c4',
      eyeStyle: 'wide_amber',
      hairStyle: 'bob_cut',
      hairColor: '#451a03',
      outfitColor: '#581c87',
      accentColor: '#eab308',
      mouthStyle: 'calm_neutral',
      heightScale: 1,
      widthScale: 1,
      headScale: 1
    },
    stats: { physic: 2, agility: 3, mind: 4, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['wax_memory']
  };

  const sandboxedPrompt = buildSandboxedCharacterSystemPrompt(
    sampleAgent,
    DEFAULT_GLOBAL_INSTRUCTION_SET,
    23 * 60 + 45
  );

  assert.equal(sandboxedPrompt.includes('NO INTERNET ACCESS'), true);
  assert.equal(sandboxedPrompt.includes(generated.voiceStyle), true);
  assert.equal(sandboxedPrompt.includes(generated.demeanor), true);
  assert.equal(sandboxedPrompt.includes('Did you hear the dumbwaiter?'), true);
  assert.equal(sandboxedPrompt.includes('11:45 PM (Late Night)'), true);
});

test('Room Blueprint system saves collections of assets with relative coordinates and instantiates them onto any floor', async () => {
  const {
    createRoomBlueprintFromAssets,
    instantiateRoomBlueprintOnFloor,
    INITIAL_ROOM_BLUEPRINTS
  } = await import('./rules');

  assert.equal(INITIAL_ROOM_BLUEPRINTS.length >= 3, true);

  const sourceRoomAssets: PlacedAsset[] = [
    {
      id: 'w1',
      name: 'North Brick Wall',
      category: 'wall',
      subType: 'wall_brick_standard',
      floor: 'lobby',
      position: [10, 1.5, 8],
      dimensions: [4, 3, 0.3],
      rotationY: 0,
      color: '#8c3b2b',
      textureId: 'nyc_old_brick',
      collidable: true
    },
    {
      id: 'd1',
      name: 'Concierge Desk',
      category: 'furniture',
      subType: 'concierge_desk',
      floor: 'lobby',
      position: [10, 0.55, 10],
      dimensions: [2.6, 1.1, 0.9],
      rotationY: 0,
      color: '#5c3824',
      textureId: 'oak_parquet',
      collidable: true
    }
  ];

  const bp = createRoomBlueprintFromAssets(
    'Custom Reception Suite',
    'Saved reception wall and desk',
    sourceRoomAssets,
    ['reception']
  );

  assert.equal(bp.name, 'Custom Reception Suite');
  assert.equal(bp.items.length, 2);
  // Relative X of both should be 0 since both had X=10
  assert.equal(bp.items[0].relPosition[0], 0);
  assert.equal(bp.items[1].relPosition[0], 0);

  // Instantiate on floor2 at offset (-4, 2)
  const stamped = instantiateRoomBlueprintOnFloor(bp, 'floor2', -4, 2);
  assert.equal(stamped.length, 2);
  assert.equal(stamped[0].floor, 'floor2');
  assert.equal(stamped[0].position[0], -4);
  assert.equal(stamped[1].position[0], -4);
});

test('Floating Studio Window Manager supports moving, resizing, minimizing, maximizing, closing, and z-index focusing', async () => {
  const {
    createDefaultStudioWindows,
    focusStudioWindow,
    updateStudioWindowPosition,
    updateStudioWindowSize,
    toggleStudioWindowMinimize,
    toggleStudioWindowMaximize,
    toggleStudioWindowOpen
  } = await import('./rules');

  let wins = createDefaultStudioWindows();
  assert.equal(wins.blueprints.isOpen, true);
  assert.equal(wins.catalog.isOpen, true);

  wins = updateStudioWindowPosition(wins, 'blueprints', 180, 120, 1280, 800);
  assert.equal(wins.blueprints.x, 180);
  assert.equal(wins.blueprints.y, 120);

  wins = updateStudioWindowSize(wins, 'blueprints', 410, 440, 1280, 800);
  assert.equal(wins.blueprints.width, 410);
  assert.equal(wins.blueprints.height, 440);

  wins = toggleStudioWindowMinimize(wins, 'blueprints');
  assert.equal(wins.blueprints.isMinimized, true);

  wins = toggleStudioWindowMaximize(wins, 'blueprints');
  assert.equal(wins.blueprints.isMaximized, true);
  assert.equal(wins.blueprints.isMinimized, false);

  wins = toggleStudioWindowOpen(wins, 'blueprints', false);
  assert.equal(wins.blueprints.isOpen, false);

  const prevZ = wins.tools.zIndex;
  wins = focusStudioWindow(wins, 'tools');
  assert.equal(wins.tools.zIndex > prevZ, true);
});

test('Surface Snapping aligns moved objects flush against the closest wall or surface face', async () => {
  const {
    computeSurfaceSnappedPosition,
    snapAssetToClosestSurfaceNow,
    moveMultipleAssetsByDelta
  } = await import('./rules');

  // A 4.0m wide x 0.3m deep brick wall centered at (0, 1.5, -2.0) -> south face at Z = -2.0 + 0.15 = -1.85
  const northWall: PlacedAsset = {
    id: 'wall_north',
    name: 'NYC Standard Brick Wall',
    category: 'wall',
    subType: 'wall_brick_standard',
    floor: 'lobby',
    position: [0, 1.5, -2.0],
    dimensions: [4.0, 3.0, 0.3],
    rotationY: 0,
    color: '#8c3b2b',
    textureId: 'nyc_old_brick',
    collidable: true
  };

  // A 2.6m wide x 0.9m deep desk (halfD = 0.45) moved near (0.1, -1.1)
  // Flush south of northWall means Z = -2.0 + 0.15 (wall halfD) + 0.45 (desk halfD) = -1.40
  const desk: PlacedAsset = {
    id: 'desk_1',
    name: 'Mahogany Concierge Desk',
    category: 'furniture',
    subType: 'concierge_desk',
    floor: 'lobby',
    position: [1.5, 0.55, 1.0],
    dimensions: [2.6, 1.1, 0.9],
    rotationY: Math.PI / 2, // initially rotated 90 deg
    color: '#5c3824',
    textureId: 'oak_parquet',
    collidable: true
  };

  const snapResult = computeSurfaceSnappedPosition(desk, 0.1, -1.1, [northWall, desk], 2.2);
  assert.equal(snapResult.snappedToId, 'wall_north');
  assert.equal(snapResult.snappedFace, 'south');
  assert.equal(snapResult.z, -1.4);
  assert.equal(snapResult.x, 0);
  // Also auto-aligns desk rotation parallel to the horizontal wall (rotationY = 0)
  assert.equal(snapResult.rotationY, 0);

  // Test moveMultipleAssetsByDelta with surfaceSnap: true
  const movedWithSnap = moveMultipleAssetsByDelta(
    [northWall, desk],
    ['desk_1'],
    'desk_1',
    0.1,
    -1.1,
    63.5,
    { surfaceSnap: true }
  );
  const movedDesk = movedWithSnap.find((a) => a.id === 'desk_1')!;
  assert.equal(movedDesk.position[2], -1.4);
  assert.equal(movedDesk.position[0], 0);
  assert.equal(movedDesk.rotationY, 0);

  // Test snapAssetToClosestSurfaceNow from any distance on the floor
  const instantSnap = snapAssetToClosestSurfaceNow([northWall, desk], 'desk_1');
  assert.equal(instantSnap.snappedToName, 'NYC Standard Brick Wall');
  const snappedDeskNow = instantSnap.updatedAssets.find((a) => a.id === 'desk_1')!;
  assert.equal(snappedDeskNow.position[2], -1.4);
});

test('Project Save and Load system serializes, validates, and restores entire studio workspace state', async () => {
  const {
    INITIAL_FLOOR_LAYERS,
    INITIAL_ROOM_BLUEPRINTS,
    DEFAULT_GLOBAL_INSTRUCTION_SET,
    createProjectSnapshot,
    validateAndParseProjectSnapshot,
    upsertProjectInSlotList
  } = await import('./rules');

  const sampleAsset: PlacedAsset = {
    id: 'wall_test_1',
    name: 'Test Brick Partition',
    category: 'wall',
    subType: 'wall_brick_standard',
    floor: 'floor1',
    position: [4, 1.5, -2],
    dimensions: [3, 3, 0.3],
    rotationY: 0,
    color: '#8c3b2b',
    textureId: 'nyc_old_brick',
    collidable: true
  };

  const snap = createProjectSnapshot({
    id: 'proj_unit_test',
    name: 'West Wing Renovation',
    description: 'Full multi-floor project snapshot test',
    currentFloor: 'floor1',
    floorLayers: INITIAL_FLOOR_LAYERS,
    assets: [sampleAsset],
    roomBlueprints: INITIAL_ROOM_BLUEPRINTS,
    characterRigs: [],
    globalInstructionSet: DEFAULT_GLOBAL_INSTRUCTION_SET,
    gameTimeMinutes: 14 * 60 + 15,
    savedInteractions: [],
    timeOfDayEvents: [],
    settings: { surfaceSnapEnabled: false, showExteriorWalls: true }
  });

  assert.equal(snap.schemaVersion, '2.0.0');
  assert.equal(snap.assetType, 'architectforge_full_project');
  assert.equal(snap.name, 'West Wing Renovation');
  assert.equal(snap.currentFloor, 'floor1');
  assert.equal(snap.assets.length, 1);
  assert.equal(snap.settings.surfaceSnapEnabled, false);
  assert.equal(snap.settings.showExteriorWalls, true);

  // Validate round-trip parsing
  const parsed = validateAndParseProjectSnapshot(JSON.parse(JSON.stringify(snap)));
  assert.equal(parsed.valid, true);
  assert.equal(parsed.project?.id, 'proj_unit_test');
  assert.equal(parsed.project?.assets[0].name, 'Test Brick Partition');
  assert.equal(parsed.project?.gameTimeMinutes, 14 * 60 + 15);

  // Validate slot upsert (insert then update in-place)
  const slots1 = upsertProjectInSlotList([], snap);
  assert.equal(slots1.length, 1);
  const updatedSnap = { ...snap, name: 'West Wing Renovation v2' };
  const slots2 = upsertProjectInSlotList(slots1, updatedSnap);
  assert.equal(slots2.length, 1);
  assert.equal(slots2[0].name, 'West Wing Renovation v2');
});

test('AI_MODEL_REGISTRY enforces cheapest capable Google Gemini models and Meshy.ai Image-to-3D exclusively', async () => {
  const {
    AI_MODEL_REGISTRY,
    verifyAiModelCompliance,
    generateSeamlessSvgTextureDataUrl
  } = await import('./rules');

  const check = verifyAiModelCompliance(AI_MODEL_REGISTRY);
  assert.equal(check.compliant, true);
  assert.equal(check.violations.length, 0);
  assert.equal(check.meshyModelCount, 1);
  assert.equal(check.googleModelCount, 12);

  // Confirm cheapest models are selected for each task
  assert.equal(AI_MODEL_REGISTRY.character_chat.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.persona_generator.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.composite_3d_spec.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.texture_synthesis.modelId, 'gemini-3.1-flash-lite-image');
  assert.equal(AI_MODEL_REGISTRY.description_to_image.modelId, 'gemini-3.1-flash-lite-image');
  assert.equal(AI_MODEL_REGISTRY.architectural_research.modelId, 'gemini-3.8-flash');
  assert.equal(AI_MODEL_REGISTRY.sfx_generator.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.music_composer.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.meshy_image_to_3d.provider, 'Meshy.ai');

  const svgUrl = generateSeamlessSvgTextureDataUrl('crimson geometric corridor carpet');
  assert.equal(svgUrl.startsWith('data:image/svg+xml;utf8,'), true);
});

test('Local Computer Workspace defines dedicated folders for all data types including Asset Descriptions Queue, Blueprints, Audio, and newly added assets', async () => {
  const {
    LOCAL_WORKSPACE_FOLDERS,
    buildLocalFolderItemFilename,
    buildLocalSetupScripts,
    createDefaultStudioWindows
  } = await import('./rules');

  assert.equal(LOCAL_WORKSPACE_FOLDERS.length >= 13, true);

  const descriptionsFolder = LOCAL_WORKSPACE_FOLDERS.find(
    (f) => f.category === 'asset_descriptions'
  );
  assert.equal(!!descriptionsFolder, true);
  assert.equal(descriptionsFolder?.relativePath, 'assets/image_descriptions_import');

  const blueprintsFolder = LOCAL_WORKSPACE_FOLDERS.find((f) => f.category === 'blueprints');
  assert.equal(!!blueprintsFolder, true);
  assert.equal(blueprintsFolder?.relativePath, 'blueprints');
  assert.equal(blueprintsFolder?.label.includes('Blueprints'), true);

  const sfxFolder = LOCAL_WORKSPACE_FOLDERS.find((f) => f.category === 'audio_sfx');
  assert.equal(!!sfxFolder, true);
  assert.equal(sfxFolder?.relativePath, 'audio/sound_effects');

  const musicFolder = LOCAL_WORKSPACE_FOLDERS.find((f) => f.category === 'audio_music');
  assert.equal(!!musicFolder, true);
  assert.equal(musicFolder?.relativePath, 'audio/background_music');

  const bpFile = buildLocalFolderItemFilename('blueprints', 'Boutique Parlor Suite', 'r101');
  assert.equal(bpFile, 'blueprint_boutique_parlor_suite_r101.blueprint.json');

  const asset3dFile = buildLocalFolderItemFilename(
    'environment_3d',
    'Brass Table Fan',
    '9021'
  );
  assert.equal(asset3dFile, 'asset3d_brass_table_fan_9021.asset3d.json');

  const sfxFile = buildLocalFolderItemFilename('audio_sfx', 'Heavy Brass Latch', 'c01');
  assert.equal(sfxFile, 'sfx_heavy_brass_latch_c01.sfx.json');

  const bgmFile = buildLocalFolderItemFilename('audio_music', 'Lobby Lounge Noir', 'm01');
  assert.equal(bgmFile, 'bgm_lobby_lounge_noir_m01.track.json');

  const texFile = buildLocalFolderItemFilename('textures', 'Crimson Geometric Carpet', 't1');
  assert.equal(texFile, 'texture_crimson_geometric_carpet_t1.texture.json');

  const scripts = buildLocalSetupScripts();
  assert.equal(scripts.windowsBat.includes('blueprints'), true);
  assert.equal(scripts.unixSh.includes('blueprints'), true);
  assert.equal(scripts.readmeTxt.includes('blueprints/'), true);

  const wins = createDefaultStudioWindows();
  assert.equal(wins.local_fs.id, 'local_fs');
});

test('computeWallRowPlacements generates a seamless row of walls along dominant axis when clicking and dragging', async () => {
  const { computeWallRowPlacements } = await import('./rules');

  // 1. Single click (or tiny jitter < 1.2m)
  const single = computeWallRowPlacements(4, 2, 4.2, 2.1, [3.0, 3.0, 0.35]);
  assert.equal(single.length, 1);
  assert.equal(single[0].x, 4);
  assert.equal(single[0].z, 2);
  assert.equal(single[0].rotationY, 0);

  // 2. Click and drag 9m along X (horizontal wall row)
  const rowX = computeWallRowPlacements(0, 5, 9, 5.5, [3.0, 3.0, 0.35]);
  assert.equal(rowX.length, 3);
  // Segments centered at 1.5, 4.5, 7.5
  assert.equal(rowX[0].x, 1.5);
  assert.equal(rowX[0].z, 5);
  assert.equal(rowX[0].rotationY, 0);

  assert.equal(rowX[1].x, 4.5);
  assert.equal(rowX[1].z, 5);
  assert.equal(rowX[1].rotationY, 0);

  assert.equal(rowX[2].x, 7.5);
  assert.equal(rowX[2].z, 5);
  assert.equal(rowX[2].rotationY, 0);

  // 3. Click and drag 6m along Z (vertical wall row)
  const rowZ = computeWallRowPlacements(2, 0, 2.2, 6, [3.0, 3.0, 0.35]);
  assert.equal(rowZ.length, 2);
  assert.equal(rowZ[0].x, 2);
  assert.equal(rowZ[0].z, 1.5);
  assert.equal(rowZ[0].rotationY, Math.PI / 2);

  assert.equal(rowZ[1].x, 2);
  assert.equal(rowZ[1].z, 4.5);
  assert.equal(rowZ[1].rotationY, Math.PI / 2);

  // 4. Drag in negative direction
  const negX = computeWallRowPlacements(0, 0, -6, 0, [3.0, 3.0, 0.35]);
  assert.equal(negX.length, 2);
  assert.equal(negX[0].x, -1.5);
  assert.equal(negX[1].x, -4.5);
});

test('first-person camera displacement and pan delta calculate correct motion vectors', async () => {
  const { computeFirstPersonCameraDisplacement, computeCameraPanDelta } = await import('./rules');

  // 1. First-person forward at theta = 0 (looking towards -Z)
  const forward0 = computeFirstPersonCameraDisplacement(0, 1, 0, 0, 5);
  assert.equal(Math.abs(forward0.dx) < 0.0001, true);
  assert.equal(Math.abs(forward0.dz - (-5)) < 0.0001, true);
  assert.equal(forward0.dy, 0);

  // 2. Strafe right at theta = 0 (+X)
  const strafeRight0 = computeFirstPersonCameraDisplacement(0, 0, 1, 0, 5);
  assert.equal(Math.abs(strafeRight0.dx - 5) < 0.0001, true);
  assert.equal(Math.abs(strafeRight0.dz) < 0.0001, true);

  // 3. Elevate up (Space)
  const moveUp = computeFirstPersonCameraDisplacement(0, 0, 0, 1, 3);
  assert.equal(moveUp.dy, 3);

  // 4. Forward at theta = PI/2 (90 deg, looking towards -X)
  const forward90 = computeFirstPersonCameraDisplacement(Math.PI / 2, 1, 0, 0, 4);
  assert.equal(Math.abs(forward90.dx - (-4)) < 0.0001, true);
  assert.equal(Math.abs(forward90.dz) < 0.0001, true);

  // 5. Camera Pan Delta (100px right drag pulls target left to track cursor)
  const pan = computeCameraPanDelta(100, -50, 60, 20, 800, [1, 0, 0], [0, 1, 0]);
  // Right drag -> panX < 0
  assert.equal(pan.panX < 0, true);
  // Up drag -> panY < 0
  assert.equal(pan.panY < 0, true);
});

test('SOTA procedural audio generators and chord voicing resolver produce rich DSP parameters', async () => {
  const {
    buildProceduralSfxSpecFromPrompt,
    buildProceduralMusicSpecFromPrompt,
    resolveChordVoicingFrequencies,
    verifyAiModelCompliance
  } = await import('./rules');

  // 1. Verify low-cost model compliance remains strictly intact
  const compliance = verifyAiModelCompliance();
  assert.equal(compliance.compliant, true);

  // 2. Verify SFX generator assigns SOTA FM, sub-oscillator, noiseColor, and reverbPreset
  const vaultSfx = buildProceduralSfxSpecFromPrompt('Heavy iron vault door');
  assert.equal(vaultSfx.noiseColor, 'brown');
  assert.equal(vaultSfx.reverbPreset, 'sub_vault');
  assert.equal((vaultSfx.fmDepth ?? 0) > 0, true);
  assert.equal((vaultSfx.subOscMix ?? 0) > 0, true);

  const showerSfx = buildProceduralSfxSpecFromPrompt('Hot shower steam');
  assert.equal(showerSfx.noiseColor, 'pink');
  assert.equal(showerSfx.reverbPreset, 'tiled_bathroom');

  // 3. Verify polyphonic chord voicing resolver
  const dm7 = resolveChordVoicingFrequencies('Dm7');
  assert.equal(dm7.length, 4);
  assert.equal(dm7[0] > 140 && dm7[0] < 150, true); // D3 ~ 146.83 Hz
  assert.equal(dm7[3] > dm7[0], true);

  const a7b9 = resolveChordVoicingFrequencies('A7b9');
  assert.equal(a7b9.length, 5);

  // 4. Verify BGM spec includes polyphonic chords, padInstrument, reverbPreset, and stereoWidth
  const rainMusic = buildProceduralMusicSpecFromPrompt('Rainy casement waltz');
  assert.equal(rainMusic.padInstrument, 'warm_epiano');
  assert.equal(rainMusic.reverbPreset, 'grand_lobby');
  assert.equal((rainMusic.stereoWidth ?? 0) > 0.5, true);
  assert.equal(rainMusic.chords.length, 4);
});

test('Late-70s / early-80s thriller palette and weatherAssetToLate70sStyle convert bright legacy colors and labels', async () => {
  const {
    LATE_70S_THRILLER_PALETTE,
    weatherAssetToLate70sStyle,
    weatherAssetsListToLate70sStyle,
    buildProcedural3DSpecFromPrompt
  } = await import('./rules');
  const { ASSET_CATALOG, INITIAL_PLACED_ASSETS } = await import('./hotelData');

  // 1. Verify palette constants are dark, desaturated late-70s tones
  assert.equal(LATE_70S_THRILLER_PALETTE.fadedAvocado, '#4a5438');
  assert.equal(LATE_70S_THRILLER_PALETTE.harvestOchre, '#6e562f');
  assert.equal(LATE_70S_THRILLER_PALETTE.sootBrick, '#592820');

  // 2. Verify legacy bright colors and 90s labels are automatically weathered
  const legacyAsset = {
    id: 'legacy_1',
    name: '90s CRT TV & VCR Combo',
    category: 'appliance' as const,
    subType: 'crt_tv_vhs_combo',
    floor: 'lobby',
    position: [0, 0.5, 0] as [number, number, number],
    dimensions: [0.9, 1.1, 0.6] as [number, number, number],
    rotationY: 0,
    color: '#0d9488',
    textureId: 'industrial_concrete' as const,
    collidable: true
  };
  const weathered = weatherAssetToLate70sStyle(legacyAsset);
  assert.equal(weathered.color, '#4a5438'); // bright teal -> faded 70s avocado
  assert.equal(weathered.name.includes('Late-70s'), true);

  const batchWeathered = weatherAssetsListToLate70sStyle([legacyAsset]);
  assert.equal(batchWeathered.length, 1);
  assert.equal(batchWeathered[0].color, '#4a5438');

  // 3. Verify all catalog and starter hotel assets avoid bright saturated colors
  const brightHexForbidden = new Set(['#0d9488', '#7e22ce', '#38bdf8', '#f8fafc', '#d4af37', '#dc2626']);
  for (const item of ASSET_CATALOG) {
    assert.equal(
      brightHexForbidden.has(item.defaultColor.toLowerCase()),
      false,
      `Catalog item ${item.name} still had bright color ${item.defaultColor}`
    );
  }
  for (const placed of INITIAL_PLACED_ASSETS) {
    assert.equal(
      brightHexForbidden.has(placed.color.toLowerCase()),
      false,
      `Initial placed asset ${placed.name} still had bright color ${placed.color}`
    );
  }

  // 4. Verify procedural 3D specs generate late-70s / early-80s dark thriller multi-part meshes
  const crtSpec = buildProcedural3DSpecFromPrompt('crt_tv_vhs_combo');
  assert.equal(crtSpec.name.includes('Late-70s'), true);
  assert.equal(crtSpec.parts.length >= 6, true);

  const armchairSpec = buildProcedural3DSpecFromPrompt('retro_teal_armchair');
  assert.equal(armchairSpec.name.includes('70s Faded Avocado'), true);
  assert.equal(armchairSpec.parts.length >= 6, true);
});

test('Proposal 1 (Per-Room Mood Lighting), Proposal 2 (Flashlight Inspection Cone), and Deliverable 3 (Asset Import Agent Enforcer & Descriptions File Parser) work accurately', async () => {
  const {
    computePerRoomMoodLightState,
    extractMoodLightEmittersFromAssets,
    computeFlashlightInspectionState,
    ASSET_IMPORT_AGENT_INSTRUCTION_SET,
    buildEnforcedLowPolyImagePrompt,
    parseAssetDescriptionsFile,
    generateAssetConceptSvgDataUrl,
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT
  } = await import('./rules');
  const { INITIAL_PLACED_ASSETS } = await import('./hotelData');

  // 1. Proposal 1: Per-room mood light emitters & 60Hz ballast flicker
  const emitters = extractMoodLightEmittersFromAssets('lobby', INITIAL_PLACED_ASSETS);
  assert.equal(emitters.length >= 2, true);
  const fluorState = computePerRoomMoodLightState(1.4, 'corridor_fluor_lobby_north', 'fluorescent_60hz');
  assert.equal(fluorState.distance, 9.5);
  assert.equal(fluorState.intensity > 0, true);

  const tungstenState = computePerRoomMoodLightState(1.4, 'mood_tungsten_1', 'tungsten_lamp');
  assert.equal(tungstenState.colorHex, '#d4944e');
  assert.equal(tungstenState.intensity > 0.5, true);

  // 2. Proposal 2: 1970s Chrome D-Cell / UV Flashlight Inspection Cone in Walk Mode
  const secretWall: PlacedAsset = {
    id: 'sec_wall_1',
    name: 'Hollow Brick Partition',
    category: 'secret_wall',
    subType: 'secret_bookshelf',
    floor: 'lobby',
    position: [0, 1.5, -3.5],
    dimensions: [2.0, 3.0, 0.35],
    rotationY: 0,
    color: '#592820',
    textureId: 'nyc_old_brick',
    isSecretPassage: true,
    isOpen: false,
    collidable: true
  };

  // Player at [0, 1.62, 0] looking straight north (yaw = 0, pitch = 0 -> forward = (0, 0, -1))
  const inspectionOn = computeFlashlightInspectionState(
    [0, 1.62, 0],
    0,
    0,
    true,
    'lobby',
    [secretWall]
  );
  assert.equal(inspectionOn.revealedAssetIds.length, 1);
  assert.equal(inspectionOn.revealedAssetIds[0], 'sec_wall_1');
  assert.equal(inspectionOn.hiddenChalkInscription?.includes('BEAM REVEAL'), true);
  assert.equal(inspectionOn.activeRevealTitle, 'Hollow Brick Partition');

  // Flashlight turned OFF -> no reveals
  const inspectionOff = computeFlashlightInspectionState(
    [0, 1.62, 0],
    0,
    0,
    false,
    'lobby',
    [secretWall]
  );
  assert.equal(inspectionOff.revealedAssetIds.length, 0);
  assert.equal(inspectionOff.activeRevealTitle, null);

  // 3. Deliverable 3: Asset Import Agent Instruction Set & Mandatory Low-Poly Enforcer
  assert.equal(
    ASSET_IMPORT_AGENT_INSTRUCTION_SET.includes('CORE PIPELINE STRUCTURE (Mandatory Enforcer)'),
    true
  );
  assert.equal(
    ASSET_IMPORT_AGENT_INSTRUCTION_SET.includes('LATE 70s / EARLY 80s THRILLER MYSTERY'),
    true
  );

  const enforcedPrompt = buildEnforcedLowPolyImagePrompt(
    '1978 Tarnished Brass Room Service Cart',
    'Rolling two-tier hotel cart with stained linen cloth'
  );
  assert.equal(
    enforcedPrompt.startsWith(
      '1978 Tarnished Brass Room Service Cart, low-poly game asset, isolated 3D asset style, low-polygon mesh topology silhouette, faceted planar surfaces, full view, centered, orthographic projection, no perspective distortion. Neutral flat lighting, diffuse white studio background, clean drop shadow omission. Stylized color-block texture details, weathered surface shading accents.'
    ),
    true
  );
  assert.equal(
    enforcedPrompt.endsWith('Flat texture maps, optimized for low-poly 3D reconstruction.'),
    true
  );

  // 4. Asset Image Descriptions File Parser (.txt, .md, .json) & Diffuse-White Orthographic Concept SVG
  const defaultEntries = parseAssetDescriptionsFile(
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT
  );
  assert.equal(defaultEntries.length >= 4, true);
  assert.equal(defaultEntries[0].name.includes('Rotary Wall Payphone'), true);
  assert.equal(
    defaultEntries[0].enforcedImagePrompt.includes('diffuse white studio background, clean drop shadow omission'),
    true
  );

  const jsonEntries = parseAssetDescriptionsFile(
    JSON.stringify([
      {
        name: '1978 Tarnished Brass Room Service Cart',
        category: 'furniture',
        description:
          'Weathered late-1970s hotel room service rolling cart with stained linen cloth and tarnished brass dome cover'
      }
    ])
  );
  assert.equal(jsonEntries.length, 1);
  assert.equal(jsonEntries[0].name, '1978 Tarnished Brass Room Service Cart');
  assert.equal(jsonEntries[0].categoryHint, 'furniture');

  const conceptSvg = generateAssetConceptSvgDataUrl(
    jsonEntries[0].name,
    jsonEntries[0].descriptionPrompt
  );
  assert.equal(conceptSvg.startsWith('data:image/svg+xml;utf8,'), true);
  assert.equal(decodeURIComponent(conceptSvg).includes('#f8fafc'), true);
});

test('Proposal A (Studio Background Alpha Matting Pre-Pass) and Smooth 500ms Hinge Rotation Animation work accurately', async () => {
  const {
    applyStudioBackgroundAlphaMatteToRgbaBuffer,
    applyAlphaMatteToConceptImageDataUrl,
    generateAssetConceptSvgDataUrl,
    HINGE_TRANSITION_DURATION_MS,
    computeHingeSwingTransform,
    computeAssetHingeAnimationState,
    initiateAssetHingeToggle
  } = await import('./rules');

  // 1. Proposal A: Verify RGBA pixel buffer chroma-distance alpha matting
  // Pixel 0: #f8fafc studio white (248, 250, 252, 255) -> keyed to alpha 0
  // Pixel 1: #ffffff pure white (255, 255, 255, 255) -> keyed to alpha 0
  // Pixel 2: Feather boundary pixel (230, 232, 234, 255) -> dist ~31.17 in (24..40) -> feathered alpha (1..254)
  // Pixel 3: Late-70s avocado green (74, 84, 56, 255) -> stays 100% opaque (alpha 255)
  const sampleRgba = new Uint8ClampedArray([
    248, 250, 252, 255,
    255, 255, 255, 255,
    230, 232, 234, 255,
    74, 84, 56, 255
  ]);
  const matteStats = applyStudioBackgroundAlphaMatteToRgbaBuffer(sampleRgba, 2, 2);
  assert.equal(matteStats.transparentPixelCount, 2);
  assert.equal(matteStats.featheredPixelCount, 1);
  assert.equal(matteStats.opaquePixelCount, 1);
  assert.equal(matteStats.mattedBuffer[3], 0); // Pixel 0 alpha
  assert.equal(matteStats.mattedBuffer[7], 0); // Pixel 1 alpha
  assert.equal(matteStats.mattedBuffer[11] > 0 && matteStats.mattedBuffer[11] < 255, true); // Feathered
  assert.equal(matteStats.mattedBuffer[15], 255); // Opaque late-70s prop pixel

  // Verify SVG concept image data URI alpha matting removes #f8fafc background rect before Meshy.ai
  const rawSvgUrl = generateAssetConceptSvgDataUrl('1978 Rotary Payphone', 'Walnut hood');
  const mattedSvgRes = applyAlphaMatteToConceptImageDataUrl(rawSvgUrl);
  assert.equal(mattedSvgRes.alphaMatted, true);
  assert.equal(
    decodeURIComponent(mattedSvgRes.mattedImageDataUrl).includes('fill-opacity="0" data-alpha-matted="true"'),
    true
  );

  // 2. Smooth 500ms Hinge Transition Animation for Doors & Secret Passages
  assert.equal(HINGE_TRANSITION_DURATION_MS, 500);

  const secretBookcase: PlacedAsset = {
    id: 'secret_wall_hinge_test',
    name: 'Secret Parlor Bookshelf Door',
    category: 'secret_wall',
    subType: 'secret_bookshelf',
    floor: 'lobby',
    position: [0, 1.5, -4],
    dimensions: [2.0, 3.0, 0.35],
    rotationY: 0,
    color: '#3b2314',
    textureId: 'oak_parquet',
    isSecretPassage: true,
    isOpen: false,
    collidable: true
  };

  // Closed initial state (t = 1000ms, before toggle)
  const closedState = computeAssetHingeAnimationState(secretBookcase, 1000);
  assert.equal(closedState.progress, 0);
  assert.equal(closedState.angleRad, 0);
  assert.equal(closedState.isAnimating, false);

  // Toggle open at t = 1000ms -> initiates 500ms hinge swing from 0 -> 1
  const toggledOpenAsset = initiateAssetHingeToggle(secretBookcase, 1000, 500);
  assert.equal(toggledOpenAsset.isOpen, true);
  assert.equal(toggledOpenAsset.hingeTransitionStartMs, 1000);
  assert.equal(toggledOpenAsset.hingeTransitionFrom, 0);
  assert.equal(toggledOpenAsset.hingeTransitionTo, 1);
  assert.equal(toggledOpenAsset.hingeDurationMs, 500);

  // At t = 1000ms (0ms elapsed): does NOT snap! Starts smoothly at 0 rad
  const stateAtStart = computeAssetHingeAnimationState(toggledOpenAsset, 1000);
  assert.equal(stateAtStart.angleRad, 0);
  assert.equal(stateAtStart.isAnimating, true);

  // At t = 1250ms (250ms elapsed = 50% through 500ms transition): halfway rotated on its hinge
  const stateAtMid = computeAssetHingeAnimationState(toggledOpenAsset, 1250);
  assert.equal(stateAtMid.progress, 0.5);
  assert.equal(stateAtMid.easedProgress, 0.5);
  assert.equal(stateAtMid.angleRad > 0.6 && stateAtMid.angleRad < 0.7, true);
  assert.equal(stateAtMid.isAnimating, true);

  // At t = 1500ms (500ms elapsed = 100% complete): reaches full open angle (Math.PI / 2.4)
  const stateAtEnd = computeAssetHingeAnimationState(toggledOpenAsset, 1500);
  assert.equal(stateAtEnd.progress, 1);
  assert.equal(stateAtEnd.easedProgress, 1);
  assert.equal(Math.abs(stateAtEnd.angleRad - Math.PI / 2.4) < 0.001, true);
  assert.equal(stateAtEnd.isAnimating, false);

  // Verify computeHingeSwingTransform directly
  const quarterSwing = computeHingeSwingTransform(2.0, 0.25);
  assert.equal(quarterSwing.hingeEdgeX, 0.92);
  assert.equal(quarterSwing.angleRad > 0 && quarterSwing.angleRad < stateAtMid.angleRad, true);
});

test('Proposal 1: computeSynchronizedHingeFoleySpec produces synchronized 500ms Foley envelope (0-460ms sweep + 480ms latch click)', async () => {
  const { computeSynchronizedHingeFoleySpec } = await import('./rules');

  // Standard door right-hinge opening
  const doorFoley = computeSynchronizedHingeFoleySpec({
    swingMode: 'right_hinge',
    isOpening: true,
    isSecretPassage: false,
    durationMs: 500
  });
  assert.equal(doorFoley.durationMs, 500);
  assert.equal(doorFoley.swingPhaseEndSec, 0.46);
  assert.equal(doorFoley.latchClickTimeSec, 0.48);
  assert.equal(doorFoley.oscillatorType, 'sawtooth');
  assert.equal(doorFoley.sweepStartHz, 142);
  assert.equal(doorFoley.sweepEndHz, 90);
  assert.equal(doorFoley.latchClickFreqHz, 1420);
  assert.equal(doorFoley.descriptionLabel.includes('500ms Aged Timber Hinge Creak'), true);

  // Secret passage masonry scrape
  const secretFoley = computeSynchronizedHingeFoleySpec({
    swingMode: 'right_hinge',
    isOpening: true,
    isSecretPassage: true,
    durationMs: 500
  });
  assert.equal(secretFoley.swingPhaseEndSec, 0.46);
  assert.equal(secretFoley.latchClickTimeSec, 0.48);
  assert.equal(secretFoley.filterType, 'lowpass');
  assert.equal(secretFoley.descriptionLabel.includes('Secret Masonry Scrape'), true);

  // Pocket slide rail glide
  const pocketFoley = computeSynchronizedHingeFoleySpec({
    swingMode: 'pocket_slide',
    isOpening: true,
    isSecretPassage: false,
    durationMs: 500
  });
  assert.equal(pocketFoley.oscillatorType, 'triangle');
  assert.equal(pocketFoley.swingPhaseEndSec, 0.46);
  assert.equal(pocketFoley.latchClickTimeSec, 0.48);
  assert.equal(pocketFoley.latchClickFreqHz, 1260);
  assert.equal(pocketFoley.descriptionLabel.includes('Pocket-Rail Glide'), true);
});

test('Proposal 2: computeHingeSwingTransform & batchModifySelectedAssets support right_hinge, left_hinge, and pocket_slide modes', async () => {
  const {
    computeHingeSwingTransform,
    computeAssetHingeAnimationState,
    batchModifySelectedAssets
  } = await import('./rules');

  const width = 2.0;

  // 1. Right Hinge: pivots on +width * 0.46, positive angleRad
  const rightHinge = computeHingeSwingTransform(width, 1.0, Math.PI / 2.4, false, 'right_hinge');
  assert.equal(rightHinge.swingMode, 'right_hinge');
  assert.equal(rightHinge.hingeEdgeX > 0, true);
  assert.equal(rightHinge.angleRad > 0, true);
  assert.equal(rightHinge.slideOffsetX, 0);

  // 2. Left Hinge: pivots on -width * 0.46, negative angleRad
  const leftHinge = computeHingeSwingTransform(width, 1.0, Math.PI / 2.4, false, 'left_hinge');
  assert.equal(leftHinge.swingMode, 'left_hinge');
  assert.equal(leftHinge.hingeEdgeX < 0, true);
  assert.equal(leftHinge.angleRad < 0, true);
  assert.equal(leftHinge.slideOffsetX, 0);

  // 3. Pocket Slide: zero angleRad, slides laterally by width * 0.86
  const pocketSlide = computeHingeSwingTransform(width, 1.0, Math.PI / 2.4, false, 'pocket_slide');
  assert.equal(pocketSlide.swingMode, 'pocket_slide');
  assert.equal(pocketSlide.angleRad, 0);
  assert.equal(pocketSlide.slideOffsetX > 1.5, true);

  // Verify batchModifySelectedAssets updates hingeSwingMode and isSecretPassage
  const sampleDoor: PlacedAsset = {
    id: 'door_test_1',
    name: 'Transom Door',
    category: 'door',
    subType: 'transom_door',
    floor: 'lobby',
    position: [0, 1.5, 0],
    dimensions: [1.4, 2.6, 0.25],
    rotationY: 0,
    color: '#3b2314',
    textureId: 'oak_parquet',
    collidable: true
  };

  const modified = batchModifySelectedAssets([sampleDoor], ['door_test_1'], {
    hingeSwingMode: 'pocket_slide',
    isSecretPassage: true
  });
  assert.equal(modified[0].hingeSwingMode, 'pocket_slide');
  assert.equal(modified[0].isSecretPassage, true);

  const pocketAnimState = computeAssetHingeAnimationState(modified[0], Date.now());
  assert.equal(pocketAnimState.swingMode, 'pocket_slide');
});

test('AI Episodic & Relational Memory Engine: disposition shifts, multi-day unanswered question tracking, and clue rewards', async () => {
  const {
    resolveTenantDisposition,
    evaluateCharacterInteractionMemory,
    posePendingQuestionFromAgent,
    buildSandboxedCharacterSystemPrompt
  } = await import('./rules');

  // 1. Disposition resolver thresholds
  assert.equal(resolveTenantDisposition(20, 30), 'hostile');
  assert.equal(resolveTenantDisposition(38, 40), 'cold');
  assert.equal(resolveTenantDisposition(50, 30), 'wary');
  assert.equal(resolveTenantDisposition(65, 30), 'cordial');
  assert.equal(resolveTenantDisposition(82, 20), 'confidant');

  // Base test agent
  const testTenant: HotelAgentProfile = {
    id: 'agent_eleanor',
    name: 'Eleanor Vance',
    role: 'tenant',
    roomNumber: 'Room 101',
    floor: 'floor1',
    position: [-3.5, 0, -2.5],
    status: 'present',
    occupation: 'Recluse Tenant',
    personality: 'Guarded, aristocratic, paranoid about hollow knocking',
    voiceStyle: 'Whispered cadence with sudden pauses',
    demeanor: 'Suspicious of hallway sounds',
    likes: ['classical music', 'polished brass keys', 'chamomile tea'],
    dislikes: ['nosy questions', 'drafty brickwork', 'missing room keys'],
    secretTruth: 'Behind the Room 101 wardrobe is a pivoted brick partition into Room 102.',
    knownFacts: ['Heard footsteps behind Room 101 wall at 11:45 PM.'],
    memories: [],
    suspicionLevel: 30,
    trustLevel: 50,
    appearance: {
      archetype: ' eccentric Socialite',
      headShape: 'tall_noir',
      skinColor: '#f3d9c4',
      eyeStyle: 'narrow_suspicious',
      hairStyle: 'bob_cut',
      hairColor: '#1f2937',
      outfitColor: '#1e3a8a',
      accentColor: '#581c87',
      mouthStyle: 'nervous_frown',
      heightScale: 1.0,
      widthScale: 1.0,
      headScale: 1.0
    },
    stats: { physic: 2, agility: 2, mind: 4, endurance: 3, pointsRemaining: 0 },
    assignedTraits: []
  };

  // 2. Tenant dislikes the user when hostility or dislikes are triggered
  const hostileEval = evaluateCharacterInteractionMemory(
    testTenant,
    'You are a liar and a suspect! Stop asking nosy questions!',
    19 * 60 + 30,
    1
  );
  assert.equal(hostileEval.trustDelta < 0, true);
  assert.equal(hostileEval.resultingTrust < 50, true);
  assert.equal(
    hostileEval.resultingDisposition === 'hostile' || hostileEval.resultingDisposition === 'cold',
    true
  );
  assert.equal(hostileEval.unlockedClueId, null);
  assert.equal(hostileEval.memoryDirectiveForPrompt.includes('DISLIKE / LOW TRUST'), true);

  // 3. Multi-day unanswered question waiting (waiting for answer asked days ago)
  const tenantWithPendingQ = posePendingQuestionFromAgent(
    testTenant,
    19 * 60 + 30,
    1,
    'Did you check behind the Room 101 wardrobe for the loose mortar?'
  ).updatedAgent;

  // On Day 3 (2 days later), player talks to tenant without answering the question
  const waitingEval = evaluateCharacterInteractionMemory(
    tenantWithPendingQ,
    'Hello Eleanor, what is the weather like?',
    19 * 60 + 30,
    3
  );
  assert.equal(waitingEval.unansweredDaysWaiting, 2);
  assert.equal(waitingEval.oldestUnansweredQuestion !== null, true);
  assert.equal(waitingEval.memoryDirectiveForPrompt.includes('2 DAY(S)'), true);

  // 4. Player finally answers the question asked 2 days ago!
  const answerEval = evaluateCharacterInteractionMemory(
    tenantWithPendingQ,
    'About your question from Day 1: Yes, I checked behind the Room 101 wardrobe and found the loose mortar and brass latch.',
    19 * 60 + 30,
    3
  );
  assert.equal(answerEval.answeredQuestion !== null, true);
  assert.equal(answerEval.daysWaitedForAnswer, 2);
  assert.equal(answerEval.trustDelta >= 20, true); // Big bonus for answering delayed question
  assert.equal(answerEval.unlockedClueId, 'clue_hollow_brick_101');
  assert.equal(answerEval.memoryDirectiveForPrompt.includes('MULTI-DAY QUESTION RESOLVED'), true);

  // 5. Build sandboxed system prompt reflects disposition and unresolved question
  const promptText = buildSandboxedCharacterSystemPrompt(
    answerEval.updatedAgent,
    'STRICT OFFLINE SANDBOX',
    19 * 60 + 30,
    3,
    answerEval
  );
  assert.equal(promptText.includes('Day 3'), true);
  assert.equal(promptText.includes('MULTI-DAY QUESTION RESOLVED'), true);
});

test('Skeleton-Based Motion & Posture Engine: upright vs bent spine kyphosis, walking stride, and cane grip', async () => {
  const { computeSkeletonPose, getArchetypeDefaults } = await import('./rules');

  // 1. Upright posture at 0 degrees curvature
  const uprightPose = computeSkeletonPose(0, false, 0, false, false);
  assert.equal(Math.abs(uprightPose.spineLumbarX) < 0.05, true);
  assert.equal(Math.abs(uprightPose.spineThoracicX) < 0.05, true);
  assert.equal(Math.abs(uprightPose.neckX) < 0.05, true);
  assert.equal(uprightPose.caneGripActive, false);

  // 2. Elderly Matron with 34 degrees bent spine (kyphosis)
  const matronDefaults = getArchetypeDefaults('Elderly Matron');
  assert.equal(matronDefaults.spineCurvature, 34);
  assert.equal(matronDefaults.hasWalkingCane, true);
  assert.equal(matronDefaults.hasSpectacles, true);
  assert.equal(matronDefaults.facialExpression, 'weary');

  const bentPose = computeSkeletonPose(0, false, matronDefaults.spineCurvature || 34, true, false);
  assert.equal(Math.abs(bentPose.spineThoracicX + bentPose.spineLowerThoracicX) > 0.35, true); // pronounced multi-vertebrae thoracic stoop
  assert.equal(bentPose.neckX > 0.35, true); // compensatory cervical lift so head looks forward
  assert.equal(bentPose.caneGripActive, true);
  assert.equal(bentPose.rightUpperArmX > 0.2, true); // right arm poised to grip walking cane

  // 3. Walking stride kinematics (anti-phase leg and arm swings)
  const walkingPose = computeSkeletonPose(1.0, true, 0, false, false);
  assert.equal(Math.sign(walkingPose.leftThighX) !== Math.sign(walkingPose.rightThighX), true);
  assert.equal(walkingPose.pelvisY !== 0, true);

  // 4. Scheduled Activity Gestures (wall_listen, inspect_ledger, sleepwalk_trance)
  const wallListenPose = computeSkeletonPose(1.0, false, 10, false, false, 'wall_listen');
  assert.equal(wallListenPose.headY > 0.25, true); // head turned to press ear against wall
  assert.equal(wallListenPose.leftForearmX < -0.5, true); // left hand cupped near ear/wall

  const sleepwalkPose = computeSkeletonPose(1.0, false, 0, false, false, 'sleepwalk_trance');
  assert.equal(sleepwalkPose.leftUpperArmX > 0.9, true); // arms outstretched in 33Hz trance
  assert.equal(sleepwalkPose.rightUpperArmX > 0.9, true);
});

test('3D Facial Rig & Dynamic AI Disposition Binding: eyebrow furrow, eye aperture, uncanny expressions, and speech jaw cadence', async () => {
  const { computeFacialRigParams } = await import('./rules');

  // 1. Neutral expression
  const neutralRig = computeFacialRigParams('neutral', undefined, false, 0);
  assert.equal(neutralRig.browFurrow, 0);
  assert.equal(neutralRig.eyeAperture, 1.0);
  assert.equal(neutralRig.jawDrop, 0);

  // 2. Weary expression (Eleanor Vance / Elderly Matron)
  const wearyRig = computeFacialRigParams('weary', undefined, false, 0);
  assert.equal(wearyRig.underEyeBags, true);
  assert.equal(wearyRig.eyeAperture < 0.8, true); // narrowed weary eyelids
  assert.equal(wearyRig.mouthCornerAngle < 0, true); // downturned weary mouth

  // 3. Uncanny Noir Expressions: hollow_stare, side_eye_glare, paranoid_twitch, cryptic_whisper
  const hollowStare = computeFacialRigParams('hollow_stare', undefined, false, 0);
  assert.equal(hollowStare.eyeAperture > 1.25, true); // unblinking wide aperture
  assert.equal(hollowStare.pupilDilation < 0.7, true); // pinpoint constricted pupils
  assert.equal(hollowStare.cheekHollow >= 0.7, true); // gaunt sunken cheeks

  const sideEye = computeFacialRigParams('side_eye_glare', undefined, false, 0);
  assert.equal(Math.abs(sideEye.eyeGazeX) >= 0.01, true); // sideways darting iris gaze
  assert.equal(Math.abs(sideEye.browAsymmetry) > 0, true); // cocked skeptical eyebrow

  const crypticWhisper = computeFacialRigParams('cryptic_whisper', undefined, false, 1.5);
  assert.equal(crypticWhisper.mouthAsymmetry !== 0, true); // crooked side-mouth whisper
  assert.equal(crypticWhisper.jawDrop > 0, true);

  // 4. Hostile disposition dynamic binding increases furrow
  const hostileRig = computeFacialRigParams('neutral', 'hostile', false, 0);
  assert.equal(hostileRig.browFurrow >= 0.35, true); // automatically furrowed brows
  assert.equal(hostileRig.mouthCornerAngle < 0, true); // downturned frown

  // 5. Live speaking cadence adds jaw drop
  const speakingRig = computeFacialRigParams('neutral', undefined, true, 1.2);
  assert.equal(speakingRig.jawDrop >= 0, true);
  assert.equal(speakingRig.mouthAperture > 0.15, true);
});

test('Daily Schedule Manager relocates AI tenants based on gameTimeMinutes and supports random AI-triggered events', async () => {
  const { computeScheduledAgentsForTime, resolveDailyLocationCoords } = await import('./rules');
  const { INITIAL_AGENTS } = await import('./hotelData');

  const tenants = INITIAL_AGENTS.filter((a) => a.role !== 'helper_entity');

  // 1. Evening Social Hour (19:30 = 1170 mins): Eleanor Vance & Dr. Barnaby Finch gather in the Lobby West Parlor
  const eveningAgents = computeScheduledAgentsForTime(tenants, 19 * 60 + 30, false);
  const eleanorEvening = eveningAgents.find((a) => a.id === 'agent_eleanor')!;
  const barnabyEvening = eveningAgents.find((a) => a.id === 'agent_barnaby')!;
  assert.equal(eleanorEvening.floor, 'lobby');
  assert.equal(barnabyEvening.floor, 'lobby');
  assert.equal(eleanorEvening.appearance.spineCurvature, 0);
  assert.equal(eleanorEvening.appearance.hasWalkingCane, false);

  // 2. Late Night (23:45 = 1425 mins): Tenants return to their respective suites on Floor 1, Floor 2, Floor 3
  const nightAgents = computeScheduledAgentsForTime(tenants, 23 * 60 + 45, false);
  const eleanorNight = nightAgents.find((a) => a.id === 'agent_eleanor')!;
  const claraNight = nightAgents.find((a) => a.id === 'agent_julian')!;
  const marcusNight = nightAgents.find((a) => a.id === 'agent_marcus')!;
  assert.equal(eleanorNight.floor, 'floor1');
  assert.equal(claraNight.floor, 'floor2');
  assert.equal(marcusNight.floor, 'floor3');

  // 3. Random AI-Triggered Anomaly Event overrides schedule and logs memory
  const anomalyAgents = computeScheduledAgentsForTime(tenants, 23 * 60 + 45, true, 3);
  const eleanorAnomaly = anomalyAgents.find((a) => a.id === 'agent_eleanor')!;
  assert.equal(
    eleanorAnomaly.memories.some((m) => m.includes('Random AI Event')),
    true
  );

  // 4. Location string resolver maps room names to 3D floor & coordinates
  const resolvedBoiler = resolveDailyLocationCoords('Basement Boiler Sub-Vault', 'lobby', [0, 0, 0]);
  assert.equal(resolvedBoiler.floor, 'basement');
});

test('1978 Detective Notebook & Dictaphone Memo System: creation, filtering, and tag classification', async () => {
  const { createNotebookMemo, searchAndFilterNotebookMemos } = await import('./rules');

  const memo1 = createNotebookMemo({
    title: 'Dumbwaiter Scratch Marks',
    content: 'Observed deep gouges in the oak shaft behind Room 202. Sounds like brass keys jangling.',
    category: 'clue',
    roomLocation: 'Room 202 Corridor',
    tapeRecorded: true,
    audioDurationSec: 18,
    tags: ['Passkey Code', 'Secret Passage']
  });

  const memo2 = createNotebookMemo({
    title: 'Interrogation: Eleanor Vance',
    content: 'Eleanor claims she never left Suite 204 after 8:00 PM. Yet the front desk ledger has fresh ink.',
    category: 'transcript',
    agentId: 'agent_eleanor',
    agentName: 'Eleanor Vance',
    roomLocation: 'Suite 204',
    tags: ['Contradiction', 'Suspect Motive']
  });

  const memos = [memo1, memo2];

  // Filter by search query
  const queryResults = searchAndFilterNotebookMemos(memos, 'gouges');
  assert.equal(queryResults.length, 1);
  assert.equal(queryResults[0].title, 'Dumbwaiter Scratch Marks');

  // Filter by tag
  const tagResults = searchAndFilterNotebookMemos(memos, '', 'Contradiction');
  assert.equal(tagResults.length, 1);
  assert.equal(tagResults[0].agentName, 'Eleanor Vance');

  // Filter by category
  const catResults = searchAndFilterNotebookMemos(memos, '', 'All', 'transcript');
  assert.equal(catResults.length, 1);
  assert.equal(catResults[0].category, 'transcript');
});

test('Surface-Specific Footsteps & Stealth Crouch Silence: resolveFloorSurfaceMaterialAtPosition, computeSurfaceFootstepSpec, didCrossStrideFootstepPhase, and audioEngine.playSurfaceFootstep', async () => {
  const {
    resolveFloorSurfaceMaterialAtPosition,
    computeSurfaceFootstepSpec,
    didCrossStrideFootstepPhase
  } = await import('./rules');
  const { INITIAL_PLACED_ASSETS } = await import('./hotelData');
  const { audioEngine } = await import('./audioEngine');

  // 1. Spatial surface resolution across carpet, wood, and linoleum
  // Central Lobby runner -> carpet
  const lobbyRunnerSurface = resolveFloorSurfaceMaterialAtPosition(0, 2.0, 'lobby', INITIAL_PLACED_ASSETS);
  assert.equal(lobbyRunnerSurface, 'carpet');

  // Floor 1 suite living area (away from central corridor and wet-wall corners) -> wood
  const suiteWoodSurface = resolveFloorSurfaceMaterialAtPosition(-3.8, -1.5, 'floor1', INITIAL_PLACED_ASSETS);
  assert.equal(suiteWoodSurface, 'wood');

  // Basement boiler room -> linoleum
  const basementSurface = resolveFloorSurfaceMaterialAtPosition(0, 0, 'basement', INITIAL_PLACED_ASSETS);
  assert.equal(basementSurface, 'linoleum');

  // Explicit placed floor_tile asset override
  const customLinoleumTile: PlacedAsset = {
    id: 'tile_lino_test',
    name: '1978 Checkerboard Vinyl Linoleum Tile',
    category: 'floor_tile',
    subType: 'checker_floor_tile',
    floor: 'floor1',
    position: [-3.8, 0.02, -1.5],
    dimensions: [2.0, 0.05, 2.0],
    rotationY: 0,
    color: '#d6d3d1',
    textureId: 'checker_marble',
    collidable: false
  };
  const overriddenSurface = resolveFloorSurfaceMaterialAtPosition(
    -3.8,
    -1.5,
    'floor1',
    [...INITIAL_PLACED_ASSETS, customLinoleumTile]
  );
  assert.equal(overriddenSurface, 'linoleum');

  // 2. Acoustic distinctness & per-step randomization across carpet, wood, and linoleum
  const carpetStepA = computeSurfaceFootstepSpec('carpet', 0, 0.2);
  const carpetStepB = computeSurfaceFootstepSpec('carpet', 1, 0.85);
  const woodStep = computeSurfaceFootstepSpec('wood', 0, 0.5);
  const linoleumStep = computeSurfaceFootstepSpec('linoleum', 0, 0.5);
  const caneTapSpec = computeSurfaceFootstepSpec('wood', 1, 0.5, { isCaneTap: true, isNpc: true });

  assert.equal(carpetStepA.surface, 'carpet');
  assert.equal(carpetStepA.filterType, 'lowpass');
  assert.equal(carpetStepA.noiseColor, 'brown');
  assert.equal(carpetStepA.reverbPreset, 'carpeted_corridor');
  // Randomized jitter + L/R alternation shifts frequency and filter cutoff between steps
  assert.equal(carpetStepA.baseFrequency !== carpetStepB.baseFrequency, true);
  assert.equal(carpetStepA.filterCutoff !== carpetStepB.filterCutoff, true);

  assert.equal(woodStep.surface, 'wood');
  assert.equal(woodStep.reverbPreset, 'wooden_parlor');
  assert.equal(woodStep.baseFrequency > carpetStepA.baseFrequency, true);

  assert.equal(linoleumStep.surface, 'linoleum');
  assert.equal(linoleumStep.reverbPreset, 'tiled_bathroom');
  assert.equal(linoleumStep.baseFrequency > woodStep.baseFrequency, true);
  assert.equal((linoleumStep.filterCutoff ?? 0) > (woodStep.filterCutoff ?? 0), true);

  assert.equal(caneTapSpec.isCaneTap, true);
  assert.equal(caneTapSpec.baseFrequency > 200, true);

  // 3. Stride heel-strike phase crossing detector
  const noCross = didCrossStrideFootstepPhase(1.2, 2.9, Math.PI);
  assert.equal(noCross.triggered, false);

  const crossed = didCrossStrideFootstepPhase(2.9, 3.3, Math.PI);
  assert.equal(crossed.triggered, true);
  assert.equal(crossed.stepIndex, 1);

  // 4. audioEngine.playSurfaceFootstep triggers when standing and is completely silent when crouching
  const standingPlay = audioEngine.playSurfaceFootstep('wood', {
    stepIndex: 2,
    jitterSeed: 0.42,
    isCrouching: false,
    footstepsEnabled: true
  });
  assert.equal(standingPlay !== null, true);
  assert.equal(standingPlay?.type, 'footstep');

  const crouchingPlay = audioEngine.playSurfaceFootstep('wood', {
    stepIndex: 3,
    jitterSeed: 0.42,
    isCrouching: true,
    footstepsEnabled: true
  });
  assert.equal(crouchingPlay, null);

  const disabledPlay = audioEngine.playSurfaceFootstep('carpet', {
    stepIndex: 4,
    isCrouching: false,
    footstepsEnabled: false
  });
  assert.equal(disabledPlay, null);

  // 5. Spatial NPC footstep with cane tap option
  const npcSpatialPlay = audioEngine.playSurfaceFootstep('carpet', {
    stepIndex: 1,
    jitterSeed: 0.6,
    emitterPos: [-3.5, 0.05, 1.5],
    listenerPos: [0, 1.62, 4.0],
    includeCaneTap: true
  });
  assert.equal(npcSpatialPlay !== null, true);
  assert.equal(npcSpatialPlay?.reverbPreset, 'carpeted_corridor');
});

test('User-Defined Keybinding System: preserves all already-assigned keys, supports slot rebinding, alt keys, conflict detection, and live action matchers', async () => {
  const {
    DEFAULT_KEYBINDINGS,
    DEFAULT_KEYBIND_SPECS,
    formatKeyCodeLabel,
    formatActionKeysSummary,
    normalizeAndMergeKeybindings,
    updateActionKeybinding,
    removeActionKeyCode,
    resetActionKeybinding,
    detectKeybindingConflicts,
    isActionKeyPressed,
    isActionKeyHeld,
    createDefaultStudioWindows
  } = await import('./rules');

  // 1. Verify keybindings studio window is registered
  const defaultWins = createDefaultStudioWindows();
  assert.equal(Boolean(defaultWins.keybindings), true);
  assert.equal(defaultWins.keybindings.id, 'keybindings');

  // 2. Verify all already-assigned default keys remain bound
  assert.deepEqual(DEFAULT_KEYBINDINGS.move_forward, ['KeyW', 'ArrowUp']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.move_backward, ['KeyS', 'ArrowDown']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.move_left, ['KeyA', 'ArrowLeft']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.move_right, ['KeyD', 'ArrowRight']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.turn_left, ['KeyQ', 'ArrowLeft']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.turn_right, ['ArrowRight']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.stealth_crouch, ['KeyC', 'ControlLeft', 'ControlRight']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.camera_up, ['Space', 'PageUp']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.camera_down, ['KeyC', 'PageDown']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.sprint_camera, ['ShiftLeft', 'ShiftRight']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.interact, ['KeyE']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.toggle_flashlight, ['KeyL']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.push_to_talk, ['KeyV']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.toggle_notebook, ['KeyJ']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.quick_edit, ['KeyF']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.rotate_asset, ['KeyR']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.delete_asset, ['Delete', 'Backspace']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.wall_tool, ['KeyB']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.clear_selection, ['Escape']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.toggle_keybindings, ['KeyK']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.reset_windows, ['KeyH']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.toggle_mute, ['KeyM']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.mode_build, ['Digit1']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.mode_character, ['Digit2']);
  assert.deepEqual(DEFAULT_KEYBINDINGS.mode_walkthrough, ['Digit3']);
  assert.equal(DEFAULT_KEYBIND_SPECS.length >= 21, true);

  // 3. Default keybindings have zero unintended conflicts
  const initialConflicts = detectKeybindingConflicts(DEFAULT_KEYBINDINGS);
  assert.equal(initialConflicts.length, 0);

  // 4. Appending a secondary key keeps existing keys bound
  const withAltInteract = updateActionKeybinding(DEFAULT_KEYBINDINGS, 'interact', 'Enter');
  assert.deepEqual(withAltInteract.interact, ['KeyE', 'Enter']);
  assert.equal(isActionKeyPressed('interact', 'KeyE', withAltInteract), true);
  assert.equal(isActionKeyPressed('interact', 'Enter', withAltInteract), true);

  // 5. Rebinding a specific slot updates that slot
  const replacedPrimary = updateActionKeybinding(withAltInteract, 'interact', 'KeyG', 0);
  assert.deepEqual(replacedPrimary.interact, ['KeyG', 'Enter']);

  // 6. Removing an extra key preserves remaining keys, and removing the last key falls back to default
  const afterRemoveOne = removeActionKeyCode(replacedPrimary, 'interact', 'KeyG');
  assert.deepEqual(afterRemoveOne.interact, ['Enter']);
  const afterRemoveLast = removeActionKeyCode(afterRemoveOne, 'interact', 'Enter');
  assert.deepEqual(afterRemoveLast.interact, ['KeyE']);

  // 7. Resetting an action restores its default keys
  const resetMap = resetActionKeybinding(replacedPrimary, 'interact');
  assert.deepEqual(resetMap.interact, ['KeyE']);

  // 8. Conflict detection catches overlapping bindings
  const conflictingMap = updateActionKeybinding(DEFAULT_KEYBINDINGS, 'toggle_flashlight', 'KeyE', 0);
  const conflicts = detectKeybindingConflicts(conflictingMap);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].keyCode, 'KeyE');
  assert.equal(conflicts[0].actions.includes('interact'), true);
  assert.equal(conflicts[0].actions.includes('toggle_flashlight'), true);

  // 9. Held key set matching and human-readable key labels
  const heldSet = new Set(['ArrowUp', 'ControlLeft']);
  assert.equal(isActionKeyHeld('move_forward', heldSet, DEFAULT_KEYBINDINGS), true);
  assert.equal(isActionKeyHeld('stealth_crouch', heldSet, DEFAULT_KEYBINDINGS), true);
  assert.equal(isActionKeyHeld('move_backward', heldSet, DEFAULT_KEYBINDINGS), false);
  assert.equal(formatKeyCodeLabel('KeyW'), 'W');
  assert.equal(formatKeyCodeLabel('ArrowUp'), '↑ Up');
  assert.equal(formatActionKeysSummary('move_forward', DEFAULT_KEYBINDINGS), 'W / ↑ Up');

  // 10. normalizeAndMergeKeybindings preserves defaults for missing or invalid entries
  const normalized = normalizeAndMergeKeybindings({
    interact: ['KeyE', 'KeyT'],
    move_forward: []
  });
  assert.deepEqual(normalized.interact, ['KeyE', 'KeyT']);
  assert.deepEqual(normalized.move_forward, ['KeyW', 'ArrowUp']);
});

test('Meshy.ai Auto-Rigging & Low-Frame Character Animation Engine (Alterations 1, 2 & 3 with Global FPS Stepper)', async () => {
  const {
    DEFAULT_GLOBAL_ANIMATION_FPS,
    ALLOWED_GLOBAL_ANIMATION_FPS,
    MESHY_ANIMATION_PRESETS,
    normalizeGlobalAnimationFps,
    buildMeshyRiggingRequestPayload,
    buildMeshyAnimateRequestPayload,
    quantizeAnimationTimeToStep,
    decimateAnimationKeyframes,
    sampleDecimatedClipPose,
    computeCharacterAnimationLodState,
    evaluateHybridLowFrameRigState
  } = await import('./rules');
  const { INITIAL_AGENTS } = await import('./hotelData');

  const sampleAppearance = INITIAL_AGENTS[0].appearance;

  // 1. Global FPS normalization (6, 8, 12, 24 FPS)
  assert.equal(DEFAULT_GLOBAL_ANIMATION_FPS, 8);
  assert.deepEqual(ALLOWED_GLOBAL_ANIMATION_FPS, [6, 8, 12, 24]);
  assert.equal(normalizeGlobalAnimationFps(6), 6);
  assert.equal(normalizeGlobalAnimationFps(8), 8);
  assert.equal(normalizeGlobalAnimationFps(12), 12);
  assert.equal(normalizeGlobalAnimationFps(24), 24);
  assert.equal(normalizeGlobalAnimationFps(undefined), 8);

  // 2. Meshy.ai /openapi/v1/rigging and /openapi/v1/animations payload builders
  const rigPayload = buildMeshyRiggingRequestPayload(
    'https://assets.meshy.ai/alderney/eleanor.glb',
    sampleAppearance
  );
  assert.equal(rigPayload.model_url, 'https://assets.meshy.ai/alderney/eleanor.glb');
  assert.equal(rigPayload.height_meters >= 1.2 && rigPayload.height_meters <= 2.2, true);

  const animPayload = buildMeshyAnimateRequestPayload('meshy_rig_01', 'wall_listen', 8);
  assert.equal(animPayload.rig_task_id, 'meshy_rig_01');
  assert.equal(animPayload.action_id, MESHY_ANIMATION_PRESETS.wall_listen.actionId);
  assert.deepEqual(animPayload.post_process, {
    operation_type: 'change_fps',
    fps: 8
  });

  // 3. Alteration 1: Stepped time quantization & keyframe decimation
  const stepA = quantizeAnimationTimeToStep(0.04, 8); // < 0.125s -> step 0
  const stepB = quantizeAnimationTimeToStep(0.11, 8); // < 0.125s -> step 0
  const stepC = quantizeAnimationTimeToStep(0.13, 8); // >= 0.125s -> step 1
  assert.equal(stepA.stepIndex, 0);
  assert.equal(stepB.stepIndex, 0);
  assert.equal(stepA.steppedTimeSec, stepB.steppedTimeSec);
  assert.equal(stepC.stepIndex, 1);
  assert.equal(stepC.steppedTimeSec, 0.125);

  const decimatedClip = decimateAnimationKeyframes(
    sampleAppearance,
    'idle_observe',
    8,
    'meshy_rig_test',
    'meshy_anim_test',
    60
  );
  assert.equal(decimatedClip.bakedFps, 8);
  assert.equal(decimatedClip.postProcessOperation, 'change_fps');
  assert.equal(decimatedClip.decimatedFrameCount < decimatedClip.originalFrameCount, true);
  assert.equal(decimatedClip.keyframeReductionPct >= 80, true);
  assert.equal(decimatedClip.decimatedKeyframes.length, decimatedClip.decimatedFrameCount);

  const appearanceWithClip = {
    ...sampleAppearance,
    meshyRigTaskId: 'meshy_rig_test',
    meshyAnimations: {
      idle_observe: decimatedClip
    }
  };
  const sampledPose = sampleDecimatedClipPose(appearanceWithClip, 'idle_observe', 0.25, false, false);
  assert.equal(typeof sampledPose.pelvisY, 'number');

  // 4. Alteration 2: Hybrid low-frame body pose + full-rate 3D facial expression rig overlay
  const frame1 = evaluateHybridLowFrameRigState({
    appearance: appearanceWithClip,
    gesture: 'idle_observe',
    isMoving: false,
    isSpeaking: true,
    continuousTimeSec: 0.02,
    effectiveFps: 8
  });
  assert.equal(frame1.bodyPoseRecomputed, true);

  // Within the same 8 FPS step window (0.06s < 0.125s): body pose is cached/not recomputed, while speech jaw cadence updates continuously
  const frame2 = evaluateHybridLowFrameRigState({
    appearance: appearanceWithClip,
    gesture: 'idle_observe',
    isMoving: false,
    isSpeaking: true,
    continuousTimeSec: 0.06,
    effectiveFps: 8,
    cachedBodyPose: frame1.bodyPose,
    lastStepIndex: frame1.stepIndex
  });
  assert.equal(frame2.bodyPoseRecomputed, false);
  assert.equal(frame2.bodyPose, frame1.bodyPose);
  assert.notEqual(frame2.facialRig.jawDrop, frame1.facialRig.jawDrop);

  // 5. Alteration 3: Distance & off-floor animation LOD throttling
  const nearLod = computeCharacterAnimationLodState({
    characterFloor: 'lobby',
    activeFloor: 'lobby',
    distanceMeters: 6.5,
    continuousTimeSec: 1.0,
    globalFps: 8
  });
  assert.equal(nearLod.tier, 'full_stepped');
  assert.equal(nearLod.effectiveBodyFps, 8);
  assert.equal(nearLod.shouldUpdateFace, true);

  const midLod = computeCharacterAnimationLodState({
    characterFloor: 'lobby',
    activeFloor: 'lobby',
    distanceMeters: 18.0,
    continuousTimeSec: 1.0,
    globalFps: 12
  });
  assert.equal(midLod.tier, 'half_stepped');
  assert.equal(midLod.effectiveBodyFps, 6);
  assert.equal(midLod.shouldUpdateFace, true);

  const farLod = computeCharacterAnimationLodState({
    characterFloor: 'lobby',
    activeFloor: 'lobby',
    distanceMeters: 29.0,
    continuousTimeSec: 1.0,
    globalFps: 8
  });
  assert.equal(farLod.tier, 'minimal_stepped');
  assert.equal(farLod.effectiveBodyFps, 2);
  assert.equal(farLod.shouldUpdateFace, false);

  const offFloorLod = computeCharacterAnimationLodState({
    characterFloor: 'floor2',
    activeFloor: 'lobby',
    distanceMeters: 5.0,
    continuousTimeSec: 1.0,
    globalFps: 8
  });
  assert.equal(offFloorLod.tier, 'culled');
  assert.equal(offFloorLod.effectiveBodyFps, 0);
  assert.equal(offFloorLod.shouldUpdateBody, false);
  assert.equal(offFloorLod.shouldUpdateFace, false);
  assert.equal(offFloorLod.cpuSavingsEstimatePct, 100);
});

test('Top Editor Navigation & Title Section Spec: Sound Board as 3rd option, centered Studio subtitle, no canvas size telemetry, and right Eye First-Person Walk toggle', async () => {
  const {
    TOP_EDITOR_MODE_TABS,
    STUDIO_HEADER_BRAND_SPEC,
    getTaskbarWindowIdsForMode,
    createDefaultStudioWindows
  } = await import('./rules');

  // 1. Top 3 editor options: 1 · Build Mode, 2 · Create-A-Character, 3 · Sound Board
  assert.equal(TOP_EDITOR_MODE_TABS.length, 3);
  assert.deepEqual(TOP_EDITOR_MODE_TABS[0], { id: 'architect', label: '1 · Build Mode' });
  assert.deepEqual(TOP_EDITOR_MODE_TABS[1], { id: 'character', label: '2 · Create-A-Character' });
  assert.deepEqual(TOP_EDITOR_MODE_TABS[2], { id: 'soundboard', label: '3 · Sound Board' });

  // 2. Title section spec: green circle left, ArchitectForge with Studio centered underneath, no canvas size reference, right Eye button for walkthrough
  assert.equal(STUDIO_HEADER_BRAND_SPEC.leftBadgeType, 'green_circle_emblem');
  assert.equal(STUDIO_HEADER_BRAND_SPEC.primaryTitle, 'ArchitectForge');
  assert.equal(STUDIO_HEADER_BRAND_SPEC.centeredSubtitleUnderneath, 'Studio');
  assert.equal(STUDIO_HEADER_BRAND_SPEC.showCanvasSizeReference, false);
  assert.equal(STUDIO_HEADER_BRAND_SPEC.rightBadgeType, 'walkthrough_eye_button');
  assert.equal(STUDIO_HEADER_BRAND_SPEC.rightBadgeTargetMode, 'walkthrough');

  // 3. Sound Board mode taskbar and window layout
  const sbWindows = getTaskbarWindowIdsForMode('soundboard');
  assert.equal(sbWindows[0], 'audio');
  assert.equal(sbWindows.includes('blueprints'), false);
  const defaultWins = createDefaultStudioWindows();
  assert.equal(defaultWins.audio.shortTitle, '🎵 Sound Board');
});

test('Studio Dark Mode UI & White 3D Canvas Spec: status bar under WINDOWS bar removed, 3D canvas white, UI dark theme', async () => {
  const { STUDIO_DARK_UI_WHITE_CANVAS_SPEC } = await import('./rules');

  assert.equal(STUDIO_DARK_UI_WHITE_CANVAS_SPEC.showStatusBarUnderWindowsBar, false);
  assert.equal(STUDIO_DARK_UI_WHITE_CANVAS_SPEC.uiTheme, 'dark');
  assert.equal(STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasTheme, 'white');
  assert.equal(STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.tileBasePlaneHex, 0xffffff);
  assert.equal(STUDIO_DARK_UI_WHITE_CANVAS_SPEC.canvasColors.sceneBackgroundHex, 0xf8fafc);
  assert.equal(
    STUDIO_DARK_UI_WHITE_CANVAS_SPEC.uiColors.windowBgClass.includes('bg-slate-900'),
    true
  );
});

test('In-Game Feature Items are represented as Studio Asset Creation Templates (Images, 3D Models, Animations, Sounds) and not embedded gameplay taskbar windows', async () => {
  const {
    IN_GAME_FEATURE_ASSET_TEMPLATES,
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT,
    buildProcedural3DSpecFromPrompt,
    getTaskbarWindowIdsForMode
  } = await import('./rules');
  const { ASSET_CATALOG } = await import('./hotelData');

  // 1. All 5 in-game feature items exist with descriptions, 3D composite parts, animation specs, sound presets, and tags
  assert.equal(IN_GAME_FEATURE_ASSET_TEMPLATES.length, 5);
  const subTypes = IN_GAME_FEATURE_ASSET_TEMPLATES.map((t) => t.subType);
  assert.deepEqual(subTypes, [
    'investigator_notebook_prop',
    'microcassette_player_prop',
    'chrome_dcell_flashlight_prop',
    'evidence_corkboard_prop',
    'master_skeleton_keyring_prop'
  ]);

  for (const tpl of IN_GAME_FEATURE_ASSET_TEMPLATES) {
    assert.equal(tpl.imagePromptDescription.length > 20, true);
    assert.equal(tpl.animationSpec.length > 10, true);
    assert.equal(tpl.soundPresetId.length > 3, true);
    assert.equal(tpl.tags.includes('game-item'), true);
    // Present in ASSET_CATALOG with multi-part 3D geometry
    const catalogEntry = ASSET_CATALOG.find((b) => b.subType === tpl.subType);
    assert.equal(Boolean(catalogEntry), true);
    assert.equal(Array.isArray(catalogEntry?.compositeParts), true);
    assert.equal((catalogEntry?.compositeParts?.length || 0) >= 3, true);
  }

  // 2. Procedural 3D generator builds distinct multi-part meshes for notebook and microcassette player
  const notebookSpec = buildProcedural3DSpecFromPrompt('Investigator Leather Notebook');
  assert.equal(notebookSpec.parts.length >= 5, true);
  const cassetteSpec = buildProcedural3DSpecFromPrompt('1978 Microcassette Dictaphone Player');
  assert.equal(cassetteSpec.parts.length >= 6, true);

  // 3. Batch description import queue includes the notebook and microcassette player descriptions
  assert.equal(
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT.includes('Notebook'),
    true
  );
  assert.equal(
    DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT.includes('Microcassette Dictaphone'),
    true
  );

  // 4. Embedded 'notebook' window is removed from the Studio taskbar modes
  assert.equal(getTaskbarWindowIdsForMode('architect').includes('notebook'), false);
  assert.equal(getTaskbarWindowIdsForMode('character').includes('notebook'), false);
  assert.equal(getTaskbarWindowIdsForMode('soundboard').includes('notebook'), false);
  assert.equal(getTaskbarWindowIdsForMode('walkthrough').includes('notebook'), false);
});

test('Blueprint Tagging & Multi-Faceted Asset Search support tag normalization, tag CRUD, relevance scoring, capability filters, and sorting', async () => {
  const {
    normalizeBlueprintTag,
    parseBlueprintTagsInput,
    addTagToBlueprint,
    removeTagFromBlueprint,
    collectBlueprintTagCounts,
    searchAndFilterCatalogBlueprints,
    searchAndFilterRoomBlueprints,
    INITIAL_ROOM_BLUEPRINTS
  } = await import('./rules');
  const { ASSET_CATALOG } = await import('./hotelData');

  // 1. Tag normalization & comma-separated parsing
  assert.equal(normalizeBlueprintTag('  #Late 70s Prop!! '), 'late-70s-prop');
  assert.deepEqual(
    parseBlueprintTagsInput('#Detective, Cassette Player, #detective, audio'),
    ['detective', 'cassette-player', 'audio']
  );

  // 2. Add and remove tags on any blueprint or asset
  const sampleBp = ASSET_CATALOG[0];
  const withAdded = addTagToBlueprint(sampleBp, 'Featured Evidence');
  assert.equal((withAdded.tags || []).includes('featured-evidence'), true);
  const withRemoved = removeTagFromBlueprint(withAdded, 'featured-evidence');
  assert.equal((withRemoved.tags || []).includes('featured-evidence'), false);

  // 3. Tag counts aggregation across ASSET_CATALOG
  const tagCounts = collectBlueprintTagCounts(ASSET_CATALOG);
  assert.equal(tagCounts.length > 5, true);
  assert.equal(tagCounts.some((tc) => tc.tag === 'game-item' && tc.count >= 5), true);

  // 4. Multi-token & #tag search on catalog blueprints
  const cassetteMatches = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    query: 'microcassette dictaphone'
  });
  assert.equal(cassetteMatches.length >= 1, true);
  assert.equal(cassetteMatches[0].subType, 'microcassette_player_prop');

  const hashTagMatches = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    query: '#notebook'
  });
  assert.equal(hashTagMatches.length >= 1, true);
  assert.equal(hashTagMatches[0].subType, 'investigator_notebook_prop');

  // 5. Capability filter ('game_item', 'interactive_hinged', 'animated') and activeTags filter
  const gamePropsOnly = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    capabilityFilter: 'game_item'
  });
  assert.equal(gamePropsOnly.length >= 5, true);
  assert.equal(
    gamePropsOnly.every(
      (bp) => (bp.tags || []).includes('game-item') || bp.category === 'clue_prop'
    ),
    true
  );

  const animatedOnly = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    capabilityFilter: 'animated'
  });
  assert.equal(animatedOnly.length >= 5, true);

  // 6. Sorting modes ('name_asc', 'size_desc', 'size_asc')
  const sortedAsc = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    sortBy: 'name_asc'
  });
  assert.equal(sortedAsc[0].name.localeCompare(sortedAsc[1].name) <= 0, true);

  const sortedLargest = searchAndFilterCatalogBlueprints(ASSET_CATALOG, {
    sortBy: 'size_desc'
  });
  const volFirst =
    sortedLargest[0].defaultDimensions[0] *
    sortedLargest[0].defaultDimensions[1] *
    sortedLargest[0].defaultDimensions[2];
  const volLast =
    sortedLargest[sortedLargest.length - 1].defaultDimensions[0] *
    sortedLargest[sortedLargest.length - 1].defaultDimensions[1] *
    sortedLargest[sortedLargest.length - 1].defaultDimensions[2];
  assert.equal(volFirst >= volLast, true);

  // 7. Room Blueprint search & tag filtering
  const lobbyRoomBps = searchAndFilterRoomBlueprints(INITIAL_ROOM_BLUEPRINTS, 'concierge', ['lobby']);
  assert.equal(lobbyRoomBps.length, 1);
  assert.equal(lobbyRoomBps[0].id, 'bp_room_lobby_registry');
});

test('Top-Right Undo Action Cluster Removal & Silent Studio Audio Policy: no auto-sounds on camera movement, sound section assigns sounds to assets', async () => {
  const {
    STUDIO_HEADER_BRAND_SPEC,
    STUDIO_AUDIO_POLICY_SPEC,
    assignSoundToAssetOrBlueprint
  } = await import('./rules');
  const { ASSET_CATALOG, INITIAL_PLACED_ASSETS, createBlueprintFromAsset } = await import('./hotelData');
  const { soundFX } = await import('./soundEffects');

  // 1. Top-right action cluster ("Undo (33)", etc.) is removed from the upper-right header
  assert.equal(STUDIO_HEADER_BRAND_SPEC.showTopRightActionCluster, false);

  // 2. Studio Audio Policy disables automatic studio sounds & camera footstep sounds
  assert.equal(STUDIO_AUDIO_POLICY_SPEC.autoPlaySoundsInStudio, false);
  assert.equal(STUDIO_AUDIO_POLICY_SPEC.cameraMovementPlaysFootsteps, false);
  assert.equal(STUDIO_AUDIO_POLICY_SPEC.npcIdlePlaysFootsteps, false);
  assert.equal(STUDIO_AUDIO_POLICY_SPEC.walkthroughAutoPlaysBgm, false);
  assert.equal(
    STUDIO_AUDIO_POLICY_SPEC.soundSectionPurpose,
    'assign_sounds_to_assets_and_create_new_sounds'
  );
  assert.equal(soundFX.muted, true);

  // 3. Assign specific sounds to placed assets and catalog blueprints
  const samplePlaced = INITIAL_PLACED_ASSETS[0];
  const withSound = assignSoundToAssetOrBlueprint(samplePlaced, 'brass_bell');
  assert.equal(withSound.soundPresetId, 'brass_bell');
  assert.equal((withSound.tags || []).includes('audio-linked'), true);

  // Preserved when converted to a catalog blueprint
  const bpFromPlaced = createBlueprintFromAsset(withSound);
  assert.equal(bpFromPlaced.soundPresetId, 'brass_bell');
  assert.equal((bpFromPlaced.tags || []).includes('audio-linked'), true);

  // Clearing assigned sound removes soundPresetId and audio-linked tag
  const clearedSound = assignSoundToAssetOrBlueprint(withSound, '');
  assert.equal(clearedSound.soundPresetId, undefined);
  assert.equal((clearedSound.tags || []).includes('audio-linked'), false);

  // Assigning sound to a catalog blueprint directly
  const catalogWithSound = assignSoundToAssetOrBlueprint(ASSET_CATALOG[0], 'door_latch');
  assert.equal(catalogWithSound.soundPresetId, 'door_latch');
  assert.equal((catalogWithSound.tags || []).includes('audio-linked'), true);
});

test('Google AI Studio Character Animation System (gemini-3.1-flash-lite) replaces Meshy animation and enforces upright external-rig-ready posture', async () => {
  const {
    AI_MODEL_REGISTRY,
    verifyAiModelCompliance,
    GOOGLE_AI_ANIMATION_PRESETS,
    buildGoogleAiAnimationPromptSpec,
    synthesizeGoogleAiCharacterAnimationClip,
    sampleDecimatedClipPose
  } = await import('./rules');
  const { INITIAL_AGENTS } = await import('./hotelData');

  // 1. Model registry routes character_animation to Google gemini-3.1-flash-lite
  assert.equal(AI_MODEL_REGISTRY.character_animation.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.character_animation.provider, 'Google');
  assert.equal(AI_MODEL_REGISTRY.character_animation.costTier, 'Lowest-Cost Flash-Lite');
  const compliance = verifyAiModelCompliance(AI_MODEL_REGISTRY);
  assert.equal(compliance.compliant, true);

  // 2. All INITIAL_AGENTS use upright external-rig-ready posture (spineCurvature === 0, hasWalkingCane === false)
  for (const agent of INITIAL_AGENTS) {
    assert.equal(agent.appearance.spineCurvature ?? 0, 0);
    assert.equal(Boolean(agent.appearance.hasWalkingCane), false);
  }

  // 3. Google AI Studio animation prompt spec and low-frame synthesis
  const sampleAgent = INITIAL_AGENTS[1]; // Arthur Pendelton
  const promptSpec = buildGoogleAiAnimationPromptSpec({
    characterName: sampleAgent.name,
    archetype: sampleAgent.appearance.archetype,
    gesture: 'inspect_ledger',
    globalFps: 8,
    customMotionPrompt: 'Trace ledger entries with a suspicious side-eye glare',
    facialExpression: 'side_eye_glare',
    voiceProfile: sampleAgent.voiceProfile
  });
  assert.equal(promptSpec.modelId, 'gemini-3.1-flash-lite');
  assert.equal(promptSpec.targetFps, 8);
  assert.equal(promptSpec.expectedKeyframeCount, 16);
  assert.equal(promptSpec.promptText.includes('Trace ledger entries'), true);

  const clip = synthesizeGoogleAiCharacterAnimationClip(
    sampleAgent.appearance,
    'inspect_ledger',
    8,
    {
      customMotionPrompt: 'Trace ledger entries with a suspicious side-eye glare',
      facialExpression: 'side_eye_glare',
      aiKeyframeModifiers: [{ headY: 0.22, spineThoracicX: 0.14, facialExpression: 'side_eye_glare' }]
    }
  );
  assert.equal(clip.engine, 'google_ai_studio');
  assert.equal(clip.modelId, 'gemini-3.1-flash-lite');
  assert.equal(clip.bakedFps, 8);
  assert.equal(clip.decimatedFrameCount, 16);
  assert.equal(clip.dominantExpression, 'side_eye_glare');
  assert.equal(clip.keyframes.length, 16);
  assert.equal(clip.keyframes[0].pose.caneGripActive, false);

  // 4. sampleDecimatedClipPose reads directly from appearance.googleAiAnimations
  const appearanceWithGoogleClip = {
    ...sampleAgent.appearance,
    googleAiAnimations: {
      inspect_ledger: clip
    }
  };
  const sampledPose = sampleDecimatedClipPose(
    appearanceWithGoogleClip,
    'inspect_ledger',
    0.0,
    false,
    false
  );
  assert.equal(sampledPose.headY, 0.22);
  assert.equal(sampledPose.spineThoracicX, 0.14);
});

test('Persistent Character Voice, Vocal Tone, Regional Accent & Facial Expression System maintains each character identity across the playthrough', async () => {
  const {
    DEFAULT_CHARACTER_VOICE_PROFILES,
    getOrCreateCharacterVoiceProfile,
    resolveCharacterVoiceAndExpressionForTurn,
    buildGeminiTtsRequestPayload,
    buildSandboxedCharacterSystemPrompt,
    evaluateCharacterInteractionMemory
  } = await import('./rules');
  const { INITIAL_AGENTS } = await import('./hotelData');

  // 1. Every starter character in INITIAL_AGENTS has a locked, distinct voiceProfile and activeFacialExpression
  const seenAccents = new Set<string>();
  const seenTones = new Set<string>();
  for (const agent of INITIAL_AGENTS) {
    const vp = getOrCreateCharacterVoiceProfile(agent);
    assert.equal(vp.persistAcrossPlaythrough, true);
    assert.equal(vp.accent.length > 5, true);
    assert.equal(vp.vocalTone.length > 5, true);
    assert.equal(vp.cadenceStyle.length > 5, true);
    seenAccents.add(vp.accent);
    seenTones.add(vp.vocalTone);
  }
  assert.equal(seenAccents.size, INITIAL_AGENTS.length);
  assert.equal(seenTones.size, INITIAL_AGENTS.length);

  // 2. Multi-turn interactions strictly preserve the character's locked voice/tone/accent while adapting facial expression
  const eleanor = INITIAL_AGENTS.find((a) => a.id === 'agent_eleanor')!;
  const friendlyMem = evaluateCharacterInteractionMemory(
    eleanor,
    'Good evening Mrs. Vance, I brought warm tea and checked the brass keys.',
    20 * 60,
    1
  );
  const turn1 = resolveCharacterVoiceAndExpressionForTurn(
    friendlyMem.updatedAgent,
    friendlyMem,
    'Thank you, Clerk. Listen closely — someone whispers behind the wall.'
  );
  assert.equal(turn1.voiceProfile.prebuiltVoiceName, DEFAULT_CHARACTER_VOICE_PROFILES.agent_eleanor.prebuiltVoiceName);
  assert.equal(turn1.voiceProfile.accent, 'New England Brahmin Transatlantic');
  assert.equal(turn1.voiceProfile.vocalTone, DEFAULT_CHARACTER_VOICE_PROFILES.agent_eleanor.vocalTone);
  assert.equal(turn1.activeFacialExpression, 'cryptic_whisper');

  const hostileMem = evaluateCharacterInteractionMemory(
    friendlyMem.updatedAgent,
    'You are lying and guilty! Confess right now!',
    22 * 60,
    2
  );
  const turn2 = resolveCharacterVoiceAndExpressionForTurn(
    hostileMem.updatedAgent,
    hostileMem,
    'Step away from my door at once.'
  );
  // Voice, tone, and accent remain 100% locked across days and disposition shifts
  assert.equal(turn2.voiceProfile.prebuiltVoiceName, turn1.voiceProfile.prebuiltVoiceName);
  assert.equal(turn2.voiceProfile.accent, turn1.voiceProfile.accent);
  assert.equal(turn2.voiceProfile.vocalTone, turn1.voiceProfile.vocalTone);
  assert.equal(turn2.voiceProfile.persistAcrossPlaythrough, true);
  assert.equal(
    turn2.activeFacialExpression === 'side_eye_glare' || turn2.activeFacialExpression === 'grimace',
    true
  );

  // 3. Sandboxed character system prompt embeds the locked voice/tone/accent and facial expression
  const sysPrompt = buildSandboxedCharacterSystemPrompt(
    {
      ...hostileMem.updatedAgent,
      voiceProfile: turn2.voiceProfile,
      activeFacialExpression: turn2.activeFacialExpression
    },
    '',
    22 * 60,
    2,
    hostileMem
  );
  assert.equal(sysPrompt.includes('New England Brahmin Transatlantic'), true);
  assert.equal(sysPrompt.includes(turn2.voiceProfile.vocalTone), true);
  assert.equal(sysPrompt.includes(turn2.activeFacialExpression), true);

  // 4. Gemini TTS payload builder formats gemini-3.8-flash-lite-tts with prebuiltVoiceConfig and speechMetadata.style
  const ttsPayload = buildGeminiTtsRequestPayload(
    eleanor,
    'Do not trust the footsteps in Room 102.',
    'suspicious'
  );
  assert.equal(ttsPayload.model, 'gemini-3.8-flash-lite-tts');
  assert.equal(
    ttsPayload.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
    'Kore'
  );
  assert.equal(
    ttsPayload.contents.parts[0].speechMetadata.style.includes('New England Brahmin Transatlantic'),
    true
  );
  assert.equal(
    ttsPayload.contents.parts[0].speechMetadata.style.includes('suspicious'),
    true
  );
});

test('Copy (Ctrl+C) / Paste (Ctrl+V) Single & Multi-Selected Assets and Reusable Asset Sets (Separate from Blueprints)', async () => {
  const {
    copySelectedAssetsToClipboard,
    pasteAssetsFromClipboard,
    createAssetSetFromSelection,
    instantiateAssetSetOnFloor,
    searchAndFilterAssetSets,
    INITIAL_ASSET_SETS,
    LOCAL_WORKSPACE_FOLDERS
  } = await import('./rules');

  const sampleFloorAssets: PlacedAsset[] = [
    {
      id: 'item_desk_1',
      name: 'Scarred Walnut Concierge Desk',
      category: 'furniture',
      subType: 'concierge_desk',
      floor: 'lobby',
      position: [-2.0, 0.55, 1.0],
      dimensions: [2.6, 1.1, 0.9],
      rotationY: 0,
      color: '#3b2314',
      textureId: 'oak_parquet',
      collidable: true,
      tags: ['concierge', 'furniture']
    },
    {
      id: 'item_lamp_1',
      name: 'Tarnished Banker Desk Lamp',
      category: 'lighting',
      subType: 'brass_table_lamp',
      floor: 'lobby',
      position: [-2.5, 1.2, 1.0],
      dimensions: [0.4, 0.55, 0.4],
      rotationY: Math.PI / 2,
      color: '#5e4c2e',
      textureId: 'aged_brass',
      collidable: false,
      tags: ['lamp', 'lighting'],
      soundPresetId: 'cassette_click'
    },
    {
      id: 'item_rug_1',
      name: 'Threadbare Oxblood Parlor Rug',
      category: 'floor_tile',
      subType: 'crimson_carpet_runner',
      floor: 'lobby',
      position: [-2.0, 0.03, 2.0],
      dimensions: [3.2, 0.06, 2.0],
      rotationY: 0,
      color: '#4a181b',
      textureId: 'velvet_crimson',
      collidable: false
    }
  ];

  // 1. Copy & Paste a SINGLE selected item (Ctrl+C / Ctrl+V)
  const singleClip = copySelectedAssetsToClipboard(sampleFloorAssets, [], 'item_lamp_1');
  assert.equal(singleClip !== null, true);
  assert.equal(singleClip!.items.length, 1);
  assert.equal(singleClip!.items[0].name, 'Tarnished Banker Desk Lamp');
  assert.equal(singleClip!.items[0].soundPresetId, 'cassette_click');

  const singlePaste = pasteAssetsFromClipboard(singleClip, 'lobby', 1);
  assert.equal(singlePaste.pastedAssets.length, 1);
  assert.equal(singlePaste.pastedIds.length, 1);
  assert.equal(singlePaste.primaryId, singlePaste.pastedAssets[0].id);
  assert.notEqual(singlePaste.pastedAssets[0].id, 'item_lamp_1');
  assert.equal(singlePaste.pastedAssets[0].position[0], -1.5); // -2.5 + 1.0m step offset
  assert.equal(singlePaste.pastedAssets[0].position[2], 2.0); // 1.0 + 1.0m step offset

  // 2. Copy & Paste MULTIPLE selected items as a group (preserving relative offsets)
  const multiClip = copySelectedAssetsToClipboard(
    sampleFloorAssets,
    ['item_desk_1', 'item_lamp_1', 'item_rug_1'],
    'item_rug_1'
  );
  assert.equal(multiClip !== null, true);
  assert.equal(multiClip!.items.length, 3);

  const origDeltaXZ = [
    sampleFloorAssets[1].position[0] - sampleFloorAssets[0].position[0],
    sampleFloorAssets[1].position[2] - sampleFloorAssets[0].position[2]
  ];

  const multiPaste = pasteAssetsFromClipboard(multiClip, 'floor1', 2);
  assert.equal(multiPaste.pastedAssets.length, 3);
  assert.equal(multiPaste.pastedIds.length, 3);
  assert.equal(multiPaste.pastedAssets.every((a) => a.floor === 'floor1'), true);

  const pastedDeltaXZ = [
    multiPaste.pastedAssets[1].position[0] - multiPaste.pastedAssets[0].position[0],
    multiPaste.pastedAssets[1].position[2] - multiPaste.pastedAssets[0].position[2]
  ];
  assert.deepEqual(pastedDeltaXZ, origDeltaXZ);

  // 3. Save a group of multiple selected items as a reusable "Set" (AssetSet), separate from RoomBlueprint
  const customSet = createAssetSetFromSelection({
    name: 'Lobby Desk & Banker Lamp Set',
    description: 'Grouped desk, banker lamp, and oxblood rug set.',
    tags: ['lobby_set', 'concierge'],
    allAssets: sampleFloorAssets,
    selectedIds: ['item_desk_1', 'item_lamp_1', 'item_rug_1'],
    primaryId: 'item_rug_1'
  });
  assert.equal(customSet !== null, true);
  assert.equal(customSet!.id.startsWith('set_'), true);
  assert.equal(customSet!.name, 'Lobby Desk & Banker Lamp Set');
  assert.equal(customSet!.items.length, 3);
  assert.equal(customSet!.tags.includes('lobby_set'), true);

  // 4. Instantiate/place the saved AssetSet onto any floor at custom (offsetX, offsetZ)
  const spawned = instantiateAssetSetOnFloor(customSet!, 'floor2', 4.0, -3.0);
  assert.equal(spawned.spawnedAssets.length, 3);
  assert.equal(spawned.spawnedIds.length, 3);
  assert.equal(spawned.spawnedAssets.every((a) => a.floor === 'floor2'), true);

  // 5. Search & filter AssetSets and verify dedicated local workspace folder 'asset_sets'
  const allSets = [customSet!, ...INITIAL_ASSET_SETS];
  const filteredSets = searchAndFilterAssetSets(allSets, 'Dictaphone');
  assert.equal(filteredSets.length, 1);
  assert.equal(filteredSets[0].id, 'set_investigator_evidence_table');

  const assetSetsFolder = LOCAL_WORKSPACE_FOLDERS.find((f) => f.category === 'asset_sets');
  assert.equal(Boolean(assetSetsFolder), true);
  assert.equal(assetSetsFolder?.extension, '.assetset.json');
});

test('Apartment Building Items Ingestion: 65+ procedural catalog assets, bidirectional dual-variant linking, room asset sets, and Gemini-2.5-flash queue', async () => {
  const {
    APARTMENT_BUILDING_CATALOG_BLUEPRINTS,
    APARTMENT_ROOM_ASSET_SETS,
    togglePlacedAssetConditionVariant,
    getPairedVariantSubtype,
    buildGeminiApartmentAssetPromptQueue,
    INITIAL_ASSET_SETS,
    instantiateAssetSetOnFloor
  } = await import('./rules');

  // 1. Verify all 65+ imported items parsed from text file are present
  assert.equal(APARTMENT_BUILDING_CATALOG_BLUEPRINTS.length >= 65, true);

  // 2. Verify all items have valid positive bounding dimensions, textures, and non-empty descriptions
  for (const bp of APARTMENT_BUILDING_CATALOG_BLUEPRINTS) {
    assert.equal(bp.defaultDimensions[0] > 0, true, `${bp.subType} width`);
    assert.equal(bp.defaultDimensions[1] > 0, true, `${bp.subType} height`);
    assert.equal(bp.defaultDimensions[2] > 0, true, `${bp.subType} depth`);
    assert.equal(Boolean(bp.defaultTexture), true, `${bp.subType} texture`);
    assert.equal(Boolean(bp.description && bp.description.length > 10), true, `${bp.subType} description`);
    assert.equal(bp.tags && bp.tags.length > 0, true, `${bp.subType} tags`);
  }

  // 3. Verify bidirectional pairing for dual condition variants (Pristine <-> Unkempt)
  const pairedItems = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.filter((b) => b.pairedVariantId);
  assert.equal(pairedItems.length >= 40, true);

  for (const item of pairedItems) {
    const counterpartSubtype = item.pairedVariantId!;
    const counterpart = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === counterpartSubtype);
    assert.equal(
      counterpart !== undefined,
      true,
      `Counterpart for ${item.subType} (${counterpartSubtype}) must exist in catalog`
    );
    assert.equal(
      counterpart!.pairedVariantId,
      item.subType,
      `Pairing must be reciprocal: ${counterpart!.subType}.pairedVariantId must equal ${item.subType}`
    );
    assert.notEqual(
      item.conditionVariant,
      counterpart!.conditionVariant,
      `Paired items must have opposing condition variants: ${item.subType} vs ${counterpart!.subType}`
    );
  }

  // 4. Test in-place condition variant toggling on a placed 3D asset
  const sofaPristineBp = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_lr_sofa_pristine')!;
  const placedSofa = {
    id: 'placed_sofa_test_101',
    name: sofaPristineBp.name,
    category: sofaPristineBp.category,
    subType: sofaPristineBp.subType,
    floor: 'floor1',
    position: [2.5, 0.45, -3.0] as [number, number, number],
    dimensions: [...sofaPristineBp.defaultDimensions] as [number, number, number],
    rotationY: 1.57,
    color: sofaPristineBp.defaultColor,
    textureId: sofaPristineBp.defaultTexture,
    collidable: true,
    pairedVariantId: sofaPristineBp.pairedVariantId,
    conditionVariant: sofaPristineBp.conditionVariant,
    tags: sofaPristineBp.tags ? [...sofaPristineBp.tags] : []
  };

  // Toggle Pristine -> Unkempt
  const unkemptSofa = togglePlacedAssetConditionVariant(placedSofa, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
  assert.equal(unkemptSofa !== null, true);
  assert.equal(unkemptSofa!.id, placedSofa.id); // Must preserve exact placed asset ID
  assert.deepEqual(unkemptSofa!.position, placedSofa.position); // Must preserve exact coordinates
  assert.equal(unkemptSofa!.rotationY, placedSofa.rotationY); // Must preserve rotation
  assert.equal(unkemptSofa!.subType, 'apt_lr_sofa_unkempt');
  assert.equal(unkemptSofa!.conditionVariant, 'unkempt');
  assert.equal(unkemptSofa!.pairedVariantId, 'apt_lr_sofa_pristine');

  // Toggle Unkempt -> Pristine (reverse back)
  const restoredSofa = togglePlacedAssetConditionVariant(unkemptSofa!, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
  assert.equal(restoredSofa !== null, true);
  assert.equal(restoredSofa!.subType, 'apt_lr_sofa_pristine');
  assert.equal(restoredSofa!.conditionVariant, 'pristine');

  // 5. Verify all pre-composed room Asset Sets exist in INITIAL_ASSET_SETS
  const expectedSetIds = [
    'set_apt_hallway_utility_1978',
    'set_apt_pristine_living_room_1978',
    'set_apt_unkempt_living_room_1978',
    'set_apt_kitchenette_harvest_gold_1978',
    'set_apt_unkempt_kitchenette_1978',
    'set_apt_tenement_bathroom_1978',
    'set_apt_bedroom_retro_1978'
  ];

  for (const expectedId of expectedSetIds) {
    const foundSet = INITIAL_ASSET_SETS.find((s) => s.id === expectedId);
    assert.equal(foundSet !== undefined, true, `Asset Set ${expectedId} must exist in INITIAL_ASSET_SETS`);
    assert.equal(foundSet!.items.length >= 3, true, `${expectedId} must have at least 3 items`);

    // Verify instantiation
    const spawned = instantiateAssetSetOnFloor(foundSet!, 'floor1', 1.0, 1.0);
    assert.equal(spawned.spawnedAssets.length, foundSet!.items.length);
  }

  // 6. Verify Gemini-2.5-flash AI generation queue generation
  const queue = buildGeminiApartmentAssetPromptQueue('gemini-2.5-flash');
  assert.equal(queue.length, APARTMENT_BUILDING_CATALOG_BLUEPRINTS.length);
  assert.equal(queue[0].modelId, 'gemini-2.5-flash');
  assert.equal(queue[0].prompt.includes('1970s'), true);
});

test('1992-1995 Hotel Updated Assets Ingestion: set_apt_updated_* sets, structural immutability enforcement, bidirectional upgrade/downgrade, and Gemini-2.5-flash queue', async () => {
  const {
    APARTMENT_BUILDING_CATALOG_BLUEPRINTS,
    APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS,
    APARTMENT_UPDATED_HOTEL_ASSET_SETS,
    STRUCTURAL_HOTEL_ASSET_SUBTYPES,
    isStructuralHotelAsset,
    canAssetBeUpdatedInHotel,
    getUpdated1990sVariantSubtype,
    getPredecessor1978Subtype,
    upgradeAssetTo1990sHotelVersion,
    downgradeAssetTo1978Version,
    buildGemini1990sHotelAssetPromptQueue,
    INITIAL_ASSET_SETS,
    instantiateAssetSetOnFloor
  } = await import('./rules');

  // 1. Verify 1990s blueprints count and catalog inclusion
  assert.equal(APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.length >= 25, true);
  for (const bp of APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS) {
    assert.equal(bp.era, '1990s', `${bp.subType} must be era 1990s`);
    assert.equal(bp.canUpdateInHotel, true, `${bp.subType} must be marked canUpdateInHotel`);
    assert.equal(bp.tags?.includes('1990s'), true, `${bp.subType} must have 1990s tag`);
    assert.equal(bp.tags?.includes('hotel-updated'), true, `${bp.subType} must have hotel-updated tag`);
    assert.equal(bp.defaultDimensions[0] > 0, true);
    assert.equal(bp.defaultDimensions[1] > 0, true);
    assert.equal(bp.defaultDimensions[2] > 0, true);
    assert.equal(bp.description.length > 20, true);

    // Verify it is also reachable in the unified catalog
    const inCatalog = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === bp.subType);
    assert.equal(inCatalog !== undefined, true, `${bp.subType} must exist in APARTMENT_BUILDING_CATALOG_BLUEPRINTS`);
  }

  // 2. Verify Structural Immutability Enforcement
  const structuralSubtypes = [
    'apt_concrete_stairwell_flight',
    'apt_elevator_sliding_doors',
    'apt_wall_trash_chute_door',
    'apt_baseboard_steam_radiator',
    'apt_utility_gas_electric_meter',
    'apt_surface_breaker_panel',
    'apt_popcorn_ceiling_tile'
  ];

  for (const sub of structuralSubtypes) {
    assert.equal(isStructuralHotelAsset(sub, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), true, `${sub} must be classified as structural`);
    assert.equal(canAssetBeUpdatedInHotel(sub, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), false, `${sub} cannot be updated in hotel`);

    // Verify upgrade attempt is strictly refused
    const placedStructural: PlacedAsset = {
      id: `placed_${sub}_01`,
      name: 'Structural Component',
      category: 'furniture',
      subType: sub,
      floor: 'floor1',
      position: [0, 0, 0],
      dimensions: [1, 1, 1],
      rotationY: 0,
      color: '#ffffff',
      textureId: 'industrial_concrete',
      collidable: true
    };

    const attempt = upgradeAssetTo1990sHotelVersion(placedStructural, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
    assert.equal(attempt.success, false, `Upgrading structural asset ${sub} must fail`);
    assert.equal(attempt.reason.toLowerCase().includes('structural'), true);
  }

  // 3. Verify Upgrading Updatable Items to 1990s Hotel Version
  const updatablePairs = [
    { from1978: 'apt_lr_television_pristine', to1990s: 'apt_tv_crt_90s_black' },
    { from1978: 'apt_wall_rotary_telephone', to1990s: 'apt_phone_touchtone_90s' },
    { from1978: 'apt_bed_alarm_clock_pristine', to1990s: 'apt_bed_digital_clock_radio_90s' },
    { from1978: 'apt_lr_sofa_pristine', to1990s: 'apt_hotel_sofa_90s' },
    { from1978: 'apt_lr_coffee_table_pristine', to1990s: 'apt_coffee_table_glass_steel_90s' },
    { from1978: 'apt_harvest_gold_refrigerator', to1990s: 'apt_fridge_white_90s' },
    { from1978: 'apt_formica_countertop_wood_trim', to1990s: 'apt_counter_laminate_bullnose_90s' },
    { from1978: 'porcelain_bathtub', to1990s: 'apt_bath_acrylic_tub_enclosure_90s' },
    { from1978: 'suite_porcelain_toilet', to1990s: 'apt_toilet_white_90s' },
    { from1978: 'apt_interior_tenement_door', to1990s: 'apt_door_keycard_reader_90s' },
    { from1978: 'apt_ceiling_smoke_detector', to1990s: 'apt_fire_alarm_strobe_horn_90s' },
    { from1978: 'apt_illuminated_exit_sign', to1990s: 'apt_hotel_exit_sign_led_90s' }
  ];

  for (const pair of updatablePairs) {
    assert.equal(canAssetBeUpdatedInHotel(pair.from1978, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), true, `${pair.from1978} must be updatable`);
    assert.equal(getUpdated1990sVariantSubtype(pair.from1978, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), pair.to1990s);

    const placedOriginal: PlacedAsset = {
      id: `placed_${pair.from1978}_99`,
      name: '1978 Item',
      category: 'furniture',
      subType: pair.from1978,
      floor: 'floor2',
      position: [2.5, 0.4, -1.8],
      dimensions: [1.2, 0.8, 0.8],
      rotationY: 1.57,
      color: '#854d0e',
      textureId: 'oak_parquet',
      collidable: true
    };

    const upgradeResult = upgradeAssetTo1990sHotelVersion(placedOriginal, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
    assert.equal(upgradeResult.success, true, `Upgrade of ${pair.from1978} must succeed`);
    const upgraded = upgradeResult.upgradedAsset;
    assert.equal(upgraded.id, placedOriginal.id, 'Must preserve placed asset ID');
    assert.deepEqual(upgraded.position, placedOriginal.position, 'Must preserve coordinates');
    assert.equal(upgraded.rotationY, placedOriginal.rotationY, 'Must preserve rotation');
    assert.equal(upgraded.floor, placedOriginal.floor, 'Must preserve floor');
    assert.equal(upgraded.subType, pair.to1990s);
    assert.equal(upgraded.era, '1990s');
    assert.equal(upgraded.predecessor1978Id, pair.from1978);

    // Reverse test: Downgrade back to 1978 predecessor
    const downgradeResult = downgradeAssetTo1978Version(upgraded, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
    assert.equal(downgradeResult.success, true, `Downgrade of ${upgraded.subType} must succeed`);
    const downgraded = downgradeResult.downgradedAsset;
    assert.equal(downgraded.subType, pair.from1978);
    assert.equal(downgraded.era, '1970s');
  }

  // 4. Verify All 5 set_apt_updated_* Asset Sets Exist with Valid Composition
  const expectedUpdatedSets = [
    'set_apt_updated_guest_room_90s',
    'set_apt_updated_suite_living_90s',
    'set_apt_updated_kitchenette_90s',
    'set_apt_updated_bathroom_90s',
    'set_apt_updated_hallway_access_90s'
  ];

  for (const expectedSetId of expectedUpdatedSets) {
    assert.equal(expectedSetId.startsWith('set_apt_updated_'), true, 'Must strictly match set_apt_updated_* pattern');

    const inInitial = INITIAL_ASSET_SETS.find((s) => s.id === expectedSetId);
    assert.equal(inInitial !== undefined, true, `${expectedSetId} must be in INITIAL_ASSET_SETS`);

    const inUpdatedArray = APARTMENT_UPDATED_HOTEL_ASSET_SETS.find((s) => s.id === expectedSetId);
    assert.equal(inUpdatedArray !== undefined, true, `${expectedSetId} must be in APARTMENT_UPDATED_HOTEL_ASSET_SETS`);

    assert.equal(inInitial!.items.length >= 4, true, `${expectedSetId} must have at least 4 items`);
    assert.equal(inInitial!.boundingSize[0] > 0, true);
    assert.equal(inInitial!.boundingSize[1] > 0, true);
    assert.equal(inInitial!.tags.includes('1990s'), true);
    assert.equal(inInitial!.tags.includes('hotel-updated'), true);

    // Verify instantiation on lot
    const spawned = instantiateAssetSetOnFloor(inInitial!, 'floor1', 2.0, 3.0);
    assert.equal(spawned.spawnedAssets.length, inInitial!.items.length);
  }

  // 5. Verify Gemini-2.5-flash 1990s Hotel Asset Generation Queue
  const queue90s = buildGemini1990sHotelAssetPromptQueue('gemini-2.5-flash');
  assert.equal(queue90s.length, APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.length);
  assert.equal(queue90s[0].modelId, 'gemini-2.5-flash');
  assert.equal(queue90s[0].era, '1990s');
  assert.equal(queue90s[0].prompt.includes('1992-1995'), true);
});

test('Subtest 43: 7x7 Tile Elevator Cab System: Sliding Doors, Cab Box Walls, Portal Wall, Ceiling Access Hatch, Emergency Phone, Button Panel COP, and Asset Sets', async () => {
  const {
    APARTMENT_BUILDING_CATALOG_BLUEPRINTS,
    APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS,
    APARTMENT_UPDATED_HOTEL_ASSET_SETS,
    INITIAL_ASSET_SETS,
    isStructuralHotelAsset,
    canAssetBeUpdatedInHotel,
    upgradeAssetTo1990sHotelVersion,
    downgradeAssetTo1978Version
  } = await import('./rules');

  // 1. Verify all 6 elevator blueprints exist in 1978 original catalog
  const required1978ElevatorSubtypes = [
    'apt_elevator_cab_sliding_doors',
    'apt_elevator_cab_wall_solid',
    'apt_elevator_cab_portal_wall',
    'apt_elevator_ceiling_access_panel',
    'apt_elevator_emergency_phone',
    'apt_elevator_button_panel_cop',
    'apt_elevator_floor_tile_7x7'
  ];

  for (const st of required1978ElevatorSubtypes) {
    const bp = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === st);
    assert.equal(Boolean(bp), true, `1978 blueprint ${st} must exist in catalog`);
    assert.equal(bp!.era, '1970s');
    assert.equal(bp!.canUpdateInHotel, true, `${st} cab component must be updatable in hotel`);
    assert.equal(Boolean(bp!.paired1990sId), true, `${st} must have paired 1990s updated ID`);
    assert.equal(Array.isArray(bp!.compositeParts), true);
    assert.equal((bp!.compositeParts?.length || 0) >= 3, true);
  }

  // 2. Verify all 6 elevator blueprints exist in 1990s updated hotel catalog
  const required1990sElevatorSubtypes = [
    'apt_elevator_cab_sliding_doors_90s',
    'apt_elevator_cab_wall_solid_90s',
    'apt_elevator_cab_portal_wall_90s',
    'apt_elevator_ceiling_access_panel_90s',
    'apt_elevator_emergency_phone_90s',
    'apt_elevator_button_panel_cop_90s',
    'apt_elevator_floor_tile_7x7_90s'
  ];

  for (const st of required1990sElevatorSubtypes) {
    const bp = APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.find((b) => b.subType === st);
    assert.equal(Boolean(bp), true, `1990s blueprint ${st} must exist in 1990s catalog`);
    assert.equal(bp!.era, '1990s');
    assert.equal(Boolean(bp!.predecessor1978Id), true, `${st} must have predecessor 1978 ID`);
    assert.equal(Array.isArray(bp!.compositeParts), true);
  }

  // 3. Verify specific functional properties:
  // - Sliding doors have pocket_slide and sfx_door_latch
  const doors1978 = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_cab_sliding_doors')!;
  assert.equal(doors1978.category, 'door');
  assert.equal(doors1978.soundPresetId, 'sfx_door_latch');
  assert.equal(doors1978.tags?.includes('pocket_slide'), true);
  assert.equal(doors1978.animationSpec?.includes('pocket slide'), true);

  // - Button panel COP has sfx_bell_ring
  const cop1978 = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_button_panel_cop')!;
  assert.equal(cop1978.category, 'appliance');
  assert.equal(cop1978.soundPresetId, 'sfx_bell_ring');

  // - Emergency phone has sfx_telephone_ring
  const phone1978 = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_emergency_phone')!;
  assert.equal(phone1978.category, 'appliance');
  assert.equal(phone1978.soundPresetId, 'sfx_telephone_ring');

  // - Ceiling with emergency access panel is 7x7 tiles
  const ceiling1978 = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_ceiling_access_panel')!;
  assert.equal(ceiling1978.defaultDimensions[0], 7.0);
  assert.equal(ceiling1978.defaultDimensions[2], 7.0);
  assert.equal(ceiling1978.tags?.includes('access_panel'), true);
  assert.equal(ceiling1978.tags?.includes('emergency_hatch'), true);

  // - Box walls and portal wall are 7m wide
  const wallSolid = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_cab_wall_solid')!;
  assert.equal(wallSolid.defaultDimensions[0], 7.0);
  const wallPortal = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_cab_portal_wall')!;
  assert.equal(wallPortal.defaultDimensions[0], 7.0);

  // 4. Verify 7x7 Tile Elevator Cab Asset Sets in INITIAL_ASSET_SETS
  const set1978 = INITIAL_ASSET_SETS.find((s) => s.id === 'set_elevator_cab_7x7');
  assert.equal(Boolean(set1978), true, 'set_elevator_cab_7x7 must exist in INITIAL_ASSET_SETS');
  assert.deepEqual(set1978!.boundingSize, [7.0, 7.0], 'Must be exactly 7x7 tiles wide');
  assert.equal(set1978!.items.length >= 8, true, 'Must include floor, 3 walls, portal wall, sliding doors, ceiling, COP, and phone');
  assert.equal(set1978!.tags.includes('7x7'), true);
  assert.equal(set1978!.tags.includes('elevator'), true);

  const set1990s = INITIAL_ASSET_SETS.find((s) => s.id === 'set_apt_updated_elevator_cab_90s');
  assert.equal(Boolean(set1990s), true, 'set_apt_updated_elevator_cab_90s must exist in INITIAL_ASSET_SETS');
  assert.deepEqual(set1990s!.boundingSize, [7.0, 7.0], 'Must be exactly 7x7 tiles wide');
  assert.equal(set1990s!.items.length >= 8, true);

  // 5. Verify Bidirectional Upgrade & Downgrade for all elevator components
  for (let i = 0; i < required1978ElevatorSubtypes.length; i++) {
    const from1978 = required1978ElevatorSubtypes[i];
    const to1990s = required1990sElevatorSubtypes[i];

    const testAsset: PlacedAsset = {
      id: `test_${from1978}_1`,
      name: `Test ${from1978}`,
      category: 'appliance',
      subType: from1978,
      floor: 'lobby',
      position: [0, 1.0, 0],
      dimensions: [1, 1, 1],
      rotationY: 0,
      color: '#5c4826',
      textureId: 'aged_brass',
      collidable: true,
      era: '1970s',
      canUpdateInHotel: true,
      paired1990sId: to1990s
    };

    const upgradeRes = upgradeAssetTo1990sHotelVersion(testAsset, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
    assert.equal(upgradeRes.success, true, `Upgrade of ${from1978} to ${to1990s} must succeed`);
    assert.equal(upgradeRes.upgradedAsset.subType, to1990s);
    assert.equal(upgradeRes.upgradedAsset.era, '1990s');

    const downgradeRes = downgradeAssetTo1978Version(upgradeRes.upgradedAsset, APARTMENT_BUILDING_CATALOG_BLUEPRINTS);
    assert.equal(downgradeRes.success, true, `Downgrade of ${to1990s} to ${from1978} must succeed`);
    assert.equal(downgradeRes.downgradedAsset.subType, from1978);
    assert.equal(downgradeRes.downgradedAsset.era, '1970s');
  }

  // 6. Verify Structural Hoistway vs Updatable Cab Distinction
  // apt_elevator_sliding_doors (corridor hoistway) must be structural fixed
  const hoistwayDoor = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === 'apt_elevator_sliding_doors')!;
  assert.equal(isStructuralHotelAsset(hoistwayDoor.subType, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), true);
  // apt_elevator_cab_sliding_doors (cab interior) must NOT be structural fixed
  assert.equal(isStructuralHotelAsset(doors1978.subType, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), false);
  assert.equal(canAssetBeUpdatedInHotel(doors1978, APARTMENT_BUILDING_CATALOG_BLUEPRINTS), true);
});




