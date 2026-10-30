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
