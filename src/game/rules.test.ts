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
    secretTruth: 'It was built by the original 1898 architect.',
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
    discoveredClues: ['clue_ledger_1926'],
    openedPassages: [],
    shiftMinutesElapsed: 5,
    vanishedCount: 1
  };

  const prompt = buildAgentSystemPrompt(helperAgent, stateWithOneClue, INITIAL_CLUES, [
    'Arthur claimed Room 202 has been vacant for a month.'
  ]);

  // Epistemic check: Helper prompt includes discovered clue_ledger_1926, but NOT undiscovered clue_basement_key
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
  const spec = buildProcedural3DSpecFromPrompt('Antique brass gramophone player');
  assert.equal(spec.parts.length >= 4, true);
  assert.equal(spec.name, 'Vintage Brass Phonograph');
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
  assert.equal(bp.name, 'Vintage Brass Phonograph');
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
        timeOfDayEvent: 'Gaslight Dimming & Parlor Social Hour',
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
    name: 'NYC Pre-War Brick Wall',
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
  assert.equal(instantSnap.snappedToName, 'NYC Pre-War Brick Wall');
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
  assert.equal(check.googleModelCount, 8);

  // Confirm cheapest models are selected for each task
  assert.equal(AI_MODEL_REGISTRY.character_chat.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.persona_generator.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.composite_3d_spec.modelId, 'gemini-3.1-flash-lite');
  assert.equal(AI_MODEL_REGISTRY.texture_synthesis.modelId, 'gemini-3.1-flash-lite-image');
  assert.equal(AI_MODEL_REGISTRY.architectural_research.modelId, 'gemini-3.8-flash');
  assert.equal(AI_MODEL_REGISTRY.meshy_image_to_3d.provider, 'Meshy.ai');

  const svgUrl = generateSeamlessSvgTextureDataUrl('1920s crimson carpet');
  assert.equal(svgUrl.startsWith('data:image/svg+xml;utf8,'), true);
});

test('Local Computer Workspace defines 9 dedicated folders for all data types and newly added assets', async () => {
  const {
    LOCAL_WORKSPACE_FOLDERS,
    buildLocalFolderItemFilename,
    buildLocalSetupScripts,
    createDefaultStudioWindows
  } = await import('./rules');

  assert.equal(LOCAL_WORKSPACE_FOLDERS.length, 9);

  const asset3dFile = buildLocalFolderItemFilename(
    'environment_3d',
    'Brass Gramophone Turntable',
    '9021'
  );
  assert.equal(asset3dFile, 'asset3d_brass_gramophone_turntable_9021.asset3d.json');

  const texFile = buildLocalFolderItemFilename('textures', 'Crimson Art Deco Carpet', 't1');
  assert.equal(texFile, 'texture_crimson_art_deco_carpet_t1.texture.json');

  const scripts = buildLocalSetupScripts();
  assert.equal(scripts.windowsBat.includes('assets\\environment_3d'), true);
  assert.equal(scripts.unixSh.includes('assets/environment_3d'), true);
  assert.equal(scripts.readmeTxt.includes('gameplay_logs/interactions'), true);

  const wins = createDefaultStudioWindows();
  assert.equal(wins.local_fs.id, 'local_fs');
});





