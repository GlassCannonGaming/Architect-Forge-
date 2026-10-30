import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FloorId,
  FloorLayer,
  INITIAL_FLOOR_LAYERS,
  GRID_TILE_COUNT,
  getFloorMeta,
  addNextFloorLayer,
  toggleFloorLayerVisibility,
  PlacedAsset,
  TexturePresetId,
  HotelAgentProfile,
  CharacterAppearance,
  CharacterStats,
  buildProcedural3DSpecFromPrompt,
  UndoHistoryEntry,
  pushUndoHistory,
  popUndoHistory,
  toggleAssetInSelection,
  moveMultipleAssetsByDelta,
  computeSurfaceSnappedPosition,
  snapAssetToClosestSurfaceNow,
  batchModifySelectedAssets,
  DEFAULT_GLOBAL_INSTRUCTION_SET,
  SavedInteractionEntry,
  TimeOfDayEventLog,
  getTimeOfDayInfo,
  RoomBlueprint,
  INITIAL_ROOM_BLUEPRINTS,
  createRoomBlueprintFromAssets,
  instantiateRoomBlueprintOnFloor,
  StudioWindowId,
  StudioWindowState,
  createDefaultStudioWindows,
  focusStudioWindow,
  updateStudioWindowPosition,
  updateStudioWindowSize,
  toggleStudioWindowMinimize,
  toggleStudioWindowMaximize,
  toggleStudioWindowOpen,
  ArchitectForgeProjectSnapshot,
  createProjectSnapshot,
  validateAndParseProjectSnapshot,
  upsertProjectInSlotList
} from './game/rules';
import {
  INITIAL_PLACED_ASSETS,
  INITIAL_AGENTS,
  ASSET_CATALOG,
  AssetBlueprint,
  createBlueprintFromAsset
} from './game/hotelData';
import {
  HotelViewport3D,
  WorkspaceMode
} from './components/HotelViewport3D';
import { UnifiedBottomDock } from './components/UnifiedBottomDock';
import { CharacterCreatorOverlay } from './components/CharacterCreatorOverlay';
import { QuickEditWindowF } from './components/QuickEditWindowF';
import { ProjectSaveLoadWindow } from './components/ProjectSaveLoadWindow';
import { soundFX } from './game/soundEffects';

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('architect');
  const [floorLayers, setFloorLayers] = useState<FloorLayer[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_autosave_canvas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.floorLayers) && parsed.floorLayers.length > 0) {
          return parsed.floorLayers;
        }
      }
    } catch {
      // ignore storage error
    }
    return INITIAL_FLOOR_LAYERS;
  });
  const [currentFloor, setCurrentFloor] = useState<FloorId>(() => {
    try {
      const saved = localStorage.getItem('architectforge_autosave_canvas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentFloor) return parsed.currentFloor;
      }
    } catch {
      // ignore storage error
    }
    return 'lobby';
  });
  const [currentRoomLabel, setCurrentRoomLabel] = useState<string>('Ground Floor · Layer L1');
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);

  // Start with a Blank 128x128 Square Tiles Canvas by default (or restore auto-saved canvas)
  const [assets, setAssets] = useState<PlacedAsset[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_autosave_canvas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.assets)) return parsed.assets;
      }
    } catch {
      // ignore storage error
    }
    return [];
  });
  const [undoStack, setUndoStack] = useState<UndoHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoHistoryEntry[]>([]);
  const [catalogAssets, setCatalogAssets] = useState<AssetBlueprint[]>(ASSET_CATALOG);
  const [agents, setAgents] = useState<HotelAgentProfile[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [marqueeModeActive, setMarqueeModeActive] = useState<boolean>(false);
  const [quickEditWindowOpen, setQuickEditWindowOpen] = useState<boolean>(false);
  const [selectedAssetScreenPos, setSelectedAssetScreenPos] = useState<{ x: number; y: number }>({
    x: 680,
    y: 160
  });
  const [activeBlueprint, setActiveBlueprint] = useState<AssetBlueprint | null>(null);
  const [showTPoseMannequin, setShowTPoseMannequin] = useState<boolean>(false);
  const [isolateSelectedAsset, setIsolateSelectedAsset] = useState<boolean>(false);
  const [showExteriorWalls, setShowExteriorWalls] = useState<boolean>(false);
  const [surfaceSnapEnabled, setSurfaceSnapEnabled] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    `Blank ${GRID_TILE_COUNT}×${GRID_TILE_COUNT} Tile Canvas Ready — Drag any window header to customize layout, save/load Room Blueprints, or press [F] for Quick Edit.`
  );

  // Floating Window Manager State (persisted to localStorage)
  const [studioWindows, setStudioWindows] = useState<Record<StudioWindowId, StudioWindowState>>(() => {
    const defaults = createDefaultStudioWindows();
    try {
      const saved = localStorage.getItem('architectforge_windows_layout_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          projects: parsed.projects ? { ...defaults.projects, ...parsed.projects } : defaults.projects
        };
      }
    } catch {
      // ignore storage error
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem('architectforge_windows_layout_v1', JSON.stringify(studioWindows));
    } catch {
      // ignore storage error
    }
  }, [studioWindows]);

  // Auto-save active 128x128 canvas floor layers & placed objects so work is preserved across reloads
  useEffect(() => {
    try {
      localStorage.setItem(
        'architectforge_autosave_canvas_v1',
        JSON.stringify({
          floorLayers,
          currentFloor,
          assets
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [floorLayers, currentFloor, assets]);

  const handleFocusWindow = useCallback((id: StudioWindowId) => {
    setStudioWindows((prev) => focusStudioWindow(prev, id));
  }, []);

  const handleMoveWindow = useCallback((id: StudioWindowId, nextX: number, nextY: number) => {
    setStudioWindows((prev) =>
      updateStudioWindowPosition(prev, id, nextX, nextY, window.innerWidth, window.innerHeight)
    );
  }, []);

  const handleResizeWindow = useCallback((id: StudioWindowId, nextW: number, nextH: number) => {
    setStudioWindows((prev) =>
      updateStudioWindowSize(prev, id, nextW, nextH, window.innerWidth, window.innerHeight)
    );
  }, []);

  const handleToggleMinimizeWindow = useCallback((id: StudioWindowId) => {
    setStudioWindows((prev) => toggleStudioWindowMinimize(prev, id));
  }, []);

  const handleToggleMaximizeWindow = useCallback((id: StudioWindowId) => {
    setStudioWindows((prev) => toggleStudioWindowMaximize(prev, id));
  }, []);

  const handleToggleOpenWindow = useCallback((id: StudioWindowId, forceOpen?: boolean) => {
    setStudioWindows((prev) => toggleStudioWindowOpen(prev, id, forceOpen));
  }, []);

  const handleResetWindowLayout = useCallback(() => {
    const fresh = createDefaultStudioWindows();
    setStudioWindows(fresh);
    setStatusBanner('Reset all floating studio windows to their default workspace layout.');
  }, []);

  // Room Blueprints Library State (persisted to localStorage)
  const [roomBlueprints, setRoomBlueprints] = useState<RoomBlueprint[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_room_blueprints_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return INITIAL_ROOM_BLUEPRINTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('architectforge_room_blueprints_v1', JSON.stringify(roomBlueprints));
    } catch {
      // ignore storage error
    }
  }, [roomBlueprints]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Character Rig Creator State
  const [customAppearance, setCustomAppearance] = useState<CharacterAppearance>({
    archetype: 'Detective Clerk',
    headShape: 'chibi_block',
    skinColor: '#f3d9c4',
    eyeStyle: 'wide_amber',
    hairStyle: 'swept_pompadour',
    hairColor: '#451a03',
    outfitColor: '#78350f',
    accentColor: '#eab308',
    mouthStyle: 'slight_smirk',
    heightScale: 1.0,
    widthScale: 1.0,
    headScale: 1.08
  });

  const [customStats, setCustomStats] = useState<CharacterStats>({
    physic: 2,
    agility: 3,
    mind: 4,
    endurance: 3,
    pointsRemaining: 4
  });

  const [customTraits, setCustomTraits] = useState<string[]>(['wax_memory', 'hollow_knock']);

  // Character AI Offline Instruction Set, Gameplay Time-of-Day Clock & Persistent History State
  const [globalInstructionSet, setGlobalInstructionSet] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('architectforge_character_system_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.globalInstructionSet) return parsed.globalInstructionSet;
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_GLOBAL_INSTRUCTION_SET;
  });

  const [gameTimeMinutes, setGameTimeMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('architectforge_character_system_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.gameTimeMinutes === 'number') return parsed.gameTimeMinutes;
      }
    } catch {
      // ignore storage error
    }
    return 19 * 60 + 30; // 07:30 PM Evening
  });

  const [savedInteractions, setSavedInteractions] = useState<SavedInteractionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_character_system_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.savedInteractions)) return parsed.savedInteractions;
      }
    } catch {
      // ignore storage error
    }
    return [
      {
        id: 'init_log_1',
        timestamp: new Date().toISOString(),
        gameTimeFormatted: '07:30 PM',
        phase: 'Evening',
        timeOfDayEvent: 'Gaslight Dimming & Parlor Social Hour (Wall sconces flickering)',
        dailyActionAtTime: 'Listening to the phonograph and watching who enters the service stairwell.',
        characterName: 'Vincent Graves',
        userMessage: 'Have you checked the brass passkeys for Suite 202?',
        agentReply:
          '*Vincent Graves adjusts his cuffs in a hushed Mid-Atlantic cadence.* "Every brass key is accounted for on the Evening ledger, Clerk, though the brickwork behind Suite 202 has been clicking since sundown."'
      }
    ];
  });

  const [timeOfDayEvents, setTimeOfDayEvents] = useState<TimeOfDayEventLog[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_character_system_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.timeOfDayEvents)) return parsed.timeOfDayEvents;
      }
    } catch {
      // ignore storage error
    }
    return [
      {
        id: 'evt_init_1',
        timestamp: new Date().toISOString(),
        gameTimeMinutes: 19 * 60 + 30,
        formattedTime: '07:30 PM',
        phase: 'Evening',
        eventTitle: 'Gaslight Dimming & Parlor Social Hour',
        eventDescription: 'Initial Evening shift clock state saved.'
      }
    ];
  });

  // Automatically persist all interactions, dialogue, history, daily actions & gameplay time-of-day events
  useEffect(() => {
    try {
      localStorage.setItem(
        'architectforge_character_system_v1',
        JSON.stringify({
          globalInstructionSet,
          gameTimeMinutes,
          savedInteractions,
          timeOfDayEvents,
          savedCharacterRigs: agents
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [globalInstructionSet, gameTimeMinutes, savedInteractions, timeOfDayEvents, agents]);

  const handleChangeGameTimeMinutes = useCallback((nextMinutes: number, eventNote?: string) => {
    const normalized = ((Math.round(nextMinutes) % 1440) + 1440) % 1440;
    const info = getTimeOfDayInfo(normalized);
    setGameTimeMinutes(normalized);
    const newEvent: TimeOfDayEventLog = {
      id: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      gameTimeMinutes: normalized,
      formattedTime: info.formattedTime,
      phase: info.phase,
      eventTitle: info.activeWorldEvent,
      eventDescription: eventNote || `Clock updated to ${info.formattedTime} (${info.phase})`
    };
    setTimeOfDayEvents((prev) => [...prev, newEvent]);
    setStatusBanner(
      `Gameplay Clock: ${info.formattedTime} (${info.phase}) — Saved Time-of-Day Event: ${info.activeWorldEvent}`
    );
  }, []);

  const handleRecordInteraction = useCallback((entry: SavedInteractionEntry) => {
    setSavedInteractions((prev) => [...prev, entry]);
    setStatusBanner(
      `Saved Dialogue & Daily Action History for "${entry.characterName}" at ${entry.gameTimeFormatted} (${entry.phase}).`
    );
  }, []);

  // AI 3D Mesh & Texture Synthesis State
  const [aiForgeBusy, setAiForgeBusy] = useState<boolean>(false);
  const [loreSummary, setLoreSummary] = useState<string | null>(null);
  const [customGeneratedTexUrl, setCustomGeneratedTexUrl] = useState<string | null>(null);

  // Record a snapshot on the Undo stack before any asset addition, modification, or deletion
  const recordUndoSnapshot = useCallback(
    (actionLabel: string) => {
      setUndoStack((prevStack) =>
        pushUndoHistory(prevStack, {
          actionLabel,
          assets,
          selectedAssetId
        })
      );
      setRedoStack([]);
    },
    [assets, selectedAssetId]
  );

  // Revert the last asset modification, addition, or deletion
  const handleUndo = useCallback(() => {
    const { popped, remaining } = popUndoHistory(undoStack);
    if (!popped) {
      setStatusBanner('Nothing to undo — Undo history stack is empty.');
      return;
    }
    soundFX.playPlaceAsset();
    setRedoStack((prevRedo) =>
      pushUndoHistory(prevRedo, {
        actionLabel: popped.actionLabel,
        assets,
        selectedAssetId
      })
    );
    setUndoStack(remaining);
    setAssets(popped.assets);
    setSelectedAssetId(popped.selectedAssetId);
    setSelectedAssetIds(popped.selectedAssetId ? [popped.selectedAssetId] : []);
    if (!popped.selectedAssetId) {
      setIsolateSelectedAsset(false);
      setQuickEditWindowOpen(false);
    }
    setStatusBanner(
      `Undid: ${popped.actionLabel} (${remaining.length} undo ${
        remaining.length === 1 ? 'step' : 'steps'
      } remaining).`
    );
  }, [undoStack, assets, selectedAssetId]);

  // Redo the most recently undone asset action (Ctrl+Y or Ctrl+Shift+Z)
  const handleRedo = useCallback(() => {
    const { popped, remaining } = popUndoHistory(redoStack);
    if (!popped) {
      setStatusBanner('Nothing to redo — Redo stack is empty.');
      return;
    }
    soundFX.playPlaceAsset();
    setUndoStack((prevUndo) =>
      pushUndoHistory(prevUndo, {
        actionLabel: popped.actionLabel,
        assets,
        selectedAssetId
      })
    );
    setRedoStack(remaining);
    setAssets(popped.assets);
    setSelectedAssetId(popped.selectedAssetId);
    setSelectedAssetIds(popped.selectedAssetId ? [popped.selectedAssetId] : []);
    setStatusBanner(
      `Redid: ${popped.actionLabel} (${remaining.length} redo ${
        remaining.length === 1 ? 'step' : 'steps'
      } remaining).`
    );
  }, [redoStack, assets, selectedAssetId]);

  // Clear active mouse placement & selection on ESC
  const handleClearMouse = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch {
        // ignore pointer lock exit error
      }
    }
    setActiveBlueprint(null);
    setMarqueeModeActive(false);
    setSelectedAssetId(null);
    setSelectedAssetIds([]);
    setQuickEditWindowOpen(false);
    setIsolateSelectedAsset(false);
    setStatusBanner(
      'Pointer cleared [ESC] — Click or Shift+Click 3D objects to select, press [E] to interact, or press [F] for Quick Edit.'
    );
  }, []);

  // Select single asset or Shift+Click multi-select
  const handleSelectAsset = useCallback(
    (id: string | null, shiftKey = false) => {
      if (!id) {
        setSelectedAssetId(null);
        setSelectedAssetIds([]);
        setQuickEditWindowOpen(false);
        setIsolateSelectedAsset(false);
        return;
      }
      setActiveBlueprint(null);
      setSelectedAssetIds((prev) => {
        const next = toggleAssetInSelection(prev, id, shiftKey);
        const primary = next.length > 0 ? next[next.length - 1] : null;
        setSelectedAssetId(primary);
        if (!primary) {
          setQuickEditWindowOpen(false);
          setIsolateSelectedAsset(false);
        } else {
          const found = assets.find((a) => a.id === primary);
          if (found) {
            setStatusBanner(
              next.length > 1
                ? `Multi-selected ${next.length} assets — Drag any selected object to move all simultaneously, or press [F] to quick-edit!`
                : `Selected "${found.name}" — Press [F] to open Quick Edit window, [E] to interact, or Shift+Click to multi-select.`
            );
          }
        }
        return next;
      });
    },
    [assets]
  );

  // Marquee-Select multiple assets inside rectangle
  const handleMarqueeSelectAssets = useCallback(
    (matchedIds: string[], additiveShift = false) => {
      setActiveBlueprint(null);
      setSelectedAssetIds((prev) => {
        const next = additiveShift
          ? Array.from(new Set([...prev, ...matchedIds]))
          : matchedIds;
        const primary = next.length > 0 ? next[next.length - 1] : null;
        setSelectedAssetId(primary);
        if (next.length > 0) {
          soundFX.playPlaceAsset();
          setStatusBanner(
            `Marquee-selected ${next.length} ${
              next.length === 1 ? 'asset' : 'assets'
            } — Drag to move simultaneously or press [F] to batch-resize & recolor!`
          );
        } else {
          setQuickEditWindowOpen(false);
          setStatusBanner('No assets inside marquee box — Hold Shift + Drag over 3D objects to multi-select.');
        }
        return next;
      });
    },
    []
  );

  // Reset to a Blank 128x128 Canvas
  const resetToBlankCanvas = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    recordUndoSnapshot('Reset to blank 128×128 canvas');
    setAssets([]);
    setAgents([]);
    setShowExteriorWalls(false);
    setActiveBlueprint(null);
    setSelectedAssetId(null);
    setSelectedAssetIds([]);
    setQuickEditWindowOpen(false);
    setIsolateSelectedAsset(false);
    setStatusBanner(`Reset to a clean Blank ${GRID_TILE_COUNT}×${GRID_TILE_COUNT} Square Tiles Canvas.`);
  }, [recordUndoSnapshot]);

  // Load Demo Multi-Floor Hotel Preset onto the 128x128 Canvas
  const handleLoadSamplePreset = useCallback(() => {
    recordUndoSnapshot('Load sample hotel preset');
    setAssets(INITIAL_PLACED_ASSETS);
    setAgents(INITIAL_AGENTS.filter((a) => a.role !== 'helper_entity'));
    setCurrentFloor('lobby');
    setActiveBlueprint(null);
    setSelectedAssetId(null);
    setSelectedAssetIds([]);
    setQuickEditWindowOpen(false);
    setIsolateSelectedAsset(false);
    setStatusBanner('Loaded sample multi-floor architectural asset preset onto the 128×128 canvas.');
  }, [recordUndoSnapshot]);

  const handleClearCurrentFloor = useCallback(() => {
    const meta = getFloorMeta(currentFloor, floorLayers);
    recordUndoSnapshot(`Clear ${meta.shortCode} floor layer`);
    setAssets((prev) => prev.filter((a) => a.floor !== currentFloor));
    setSelectedAssetId(null);
    setSelectedAssetIds([]);
    setQuickEditWindowOpen(false);
    setIsolateSelectedAsset(false);
    setStatusBanner(
      `Cleared ${meta.shortCode} layer — Blank ${GRID_TILE_COUNT}×${GRID_TILE_COUNT} tile grid ready.`
    );
  }, [currentFloor, floorLayers, recordUndoSnapshot]);

  // Add a new Floor Layer (increases total number of floors dynamically)
  const handleAddFloorLayer = useCallback(() => {
    soundFX.playPlaceAsset();
    const { layers: nextLayers, addedLayer } = addNextFloorLayer(floorLayers);
    setFloorLayers(nextLayers);
    setCurrentFloor(addedLayer.id);
    setSelectedAssetId(null);
    setSelectedAssetIds([]);
    setQuickEditWindowOpen(false);
    setIsolateSelectedAsset(false);
    setStatusBanner(
      `Added new Floor Layer "${addedLayer.label}" (${nextLayers.length} total floor layers)!`
    );
  }, [floorLayers]);

  // Toggle visibility of any floor layer (like eye icon in Photoshop/GIMP)
  const handleToggleFloorLayerVisibility = useCallback(
    (floorId: FloorId) => {
      setFloorLayers((prev) => toggleFloorLayerVisibility(prev, floorId));
      const meta = getFloorMeta(floorId, floorLayers);
      setStatusBanner(`Toggled 3D layer visibility for ${meta.label}.`);
    },
    [floorLayers]
  );

  // Global Studio Keyboard Shortcuts (ESC clears mouse, F opens Quick Edit window, R rotates 90°, Delete removes selected, Ctrl+Z / Ctrl+Y undo/redo, 1/2/3 switch views)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.code === 'Escape') {
          (e.target as HTMLElement).blur();
          handleClearMouse();
        }
        return;
      }
      if (tag === 'SELECT') {
        (e.target as HTMLElement).blur();
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.code === 'KeyF') {
        e.preventDefault();
        if (selectedAssetId) {
          soundFX.playPlaceAsset();
          setQuickEditWindowOpen((prev) => {
            const nextOpen = !prev;
            const found = assets.find((a) => a.id === selectedAssetId);
            setStatusBanner(
              nextOpen
                ? `Opened Quick Edit Window [F] to the right of "${found ? found.name : 'Asset'}" — Resize or alter color!`
                : 'Closed Quick Edit Window [F].'
            );
            return nextOpen;
          });
        } else {
          setStatusBanner('Select an asset first (Click or Shift+Click), then press [F] to open the Quick Edit Window.');
        }
        return;
      }

      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        const targetIds =
          selectedAssetIds.length > 0
            ? selectedAssetIds
            : selectedAssetId
            ? [selectedAssetId]
            : [];
        if (targetIds.length > 0) {
          e.preventDefault();
          soundFX.playPlaceAsset();
          recordUndoSnapshot(`Rotate ${targetIds.length} selected asset(s) 90°`);
          setAssets((prev) =>
            batchModifySelectedAssets(prev, targetIds, { rotationDeltaY: Math.PI / 2 })
          );
          setStatusBanner(
            `Rotated ${targetIds.length} ${
              targetIds.length === 1 ? 'object' : 'selected objects'
            } by 90° [R].`
          );
          return;
        }
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        const targetIds =
          selectedAssetIds.length > 0
            ? selectedAssetIds
            : selectedAssetId
            ? [selectedAssetId]
            : [];
        if (targetIds.length > 0) {
          e.preventDefault();
          const deleteSet = new Set(targetIds);
          const primary = assets.find((a) => a.id === targetIds[0]);
          recordUndoSnapshot(
            targetIds.length > 1
              ? `Delete ${targetIds.length} selected assets`
              : `Delete "${primary ? primary.name : 'Asset'}"`
          );
          setAssets((prev) => prev.filter((a) => !deleteSet.has(a.id)));
          setSelectedAssetId(null);
          setSelectedAssetIds([]);
          setQuickEditWindowOpen(false);
          setIsolateSelectedAsset(false);
          setStatusBanner(
            `Deleted ${targetIds.length} ${
              targetIds.length === 1 ? 'object' : 'selected objects'
            } [Del] — Press Ctrl+Z to undo.`
          );
          return;
        }
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        handleClearMouse();
      } else if (e.code === 'KeyH') {
        handleResetWindowLayout();
      } else if (e.code === 'KeyM') {
        setIsMuted((m) => {
          soundFX.muted = !m;
          return !m;
        });
      } else if (e.code === 'Digit1') {
        setMode('architect');
      } else if (e.code === 'Digit2') {
        setMode('character');
      } else if (e.code === 'Digit3') {
        setMode('walkthrough');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleClearMouse,
    handleUndo,
    handleRedo,
    handleResetWindowLayout,
    recordUndoSnapshot,
    selectedAssetId,
    selectedAssetIds,
    assets
  ]);

  // Place new asset blueprint on 128x128 grid (Addition -> tracked on undo stack)
  const handlePlaceBlueprintAt = useCallback(
    (x: number, z: number) => {
      if (!activeBlueprint) return;
      recordUndoSnapshot(`Add "${activeBlueprint.name}"`);
      const [w, h, d] = activeBlueprint.defaultDimensions;
      const newAsset: PlacedAsset = {
        id: `custom_${activeBlueprint.subType}_${Date.now()}`,
        name: activeBlueprint.name,
        category: activeBlueprint.category,
        subType: activeBlueprint.subType,
        floor: currentFloor,
        roomNumber: currentRoomLabel,
        position: [x, h / 2, z],
        dimensions: [w, h, d],
        rotationY: 0,
        color: activeBlueprint.defaultColor,
        textureId: activeBlueprint.defaultTexture,
        isSecretPassage: activeBlueprint.isSecretPassage,
        isOpen: false,
        collidable: activeBlueprint.collidable,
        compositeParts: activeBlueprint.compositeParts
      };
      setAssets((prev) => [...prev, newAsset]);
      setSelectedAssetId(newAsset.id);
      setSelectedAssetIds([newAsset.id]);
      setActiveBlueprint(null);
      setStatusBanner(
        `Placed "${newAsset.name}" at (${x}m, ${z}m) — Press [F] to Quick-Edit (resize/color) or [E] to interact.`
      );
    },
    [activeBlueprint, currentFloor, currentRoomLabel, recordUndoSnapshot]
  );

  // Record snapshot once at the start of a 3D viewport drag gesture (supports single or multi-asset drag)
  const handleBeginAssetDrag = useCallback(
    (assetId: string) => {
      if (selectedAssetIds.length > 1 && selectedAssetIds.includes(assetId)) {
        recordUndoSnapshot(`Move ${selectedAssetIds.length} selected assets`);
      } else {
        const dragged = assets.find((a) => a.id === assetId);
        recordUndoSnapshot(`Move "${dragged ? dragged.name : 'Asset'}"`);
      }
    },
    [assets, selectedAssetIds, recordUndoSnapshot]
  );

  // Drag-move selected asset (or all multi-selected assets simultaneously, with optional flush Surface Snapping!)
  const handleMoveSelectedAssetTo = useCallback(
    (assetId: string, x: number, z: number) => {
      setAssets((prev) =>
        moveMultipleAssetsByDelta(
          prev,
          selectedAssetIds.length > 0 ? selectedAssetIds : [assetId],
          assetId,
          x,
          z,
          63.5,
          { surfaceSnap: surfaceSnapEnabled }
        )
      );
    },
    [selectedAssetIds, surfaceSnapEnabled]
  );

  // Immediately align the currently selected asset flush against the nearest wall or surface on the floor
  const handleSnapSelectedToSurfaceNow = useCallback(() => {
    if (!selectedAssetId) {
      setStatusBanner('Select a 3D object first to align it flush against the nearest wall or surface.');
      return;
    }
    const target = assets.find((a) => a.id === selectedAssetId);
    if (!target) return;
    recordUndoSnapshot(`Surface-snap "${target.name}"`);
    const { updatedAssets, snappedToName, snappedFace } = snapAssetToClosestSurfaceNow(
      assets,
      selectedAssetId
    );
    if (snappedToName) {
      soundFX.playPlaceAsset();
      setAssets(updatedAssets);
      const updatedTarget = updatedAssets.find((a) => a.id === selectedAssetId);
      setStatusBanner(
        `🧲 Surface Snapped "${target.name}" flush to ${snappedFace?.toUpperCase()} face of "${snappedToName}"${
          updatedTarget ? ` at (${updatedTarget.position[0]}m, ${updatedTarget.position[2]}m)` : ''
        }!`
      );
    } else {
      setStatusBanner(
        `No nearby wall or surface found on this floor within snapping range for "${target.name}".`
      );
    }
  }, [assets, selectedAssetId, recordUndoSnapshot]);

  // Batch resize, recolor, or rotate selected asset(s) from the [F] Quick Edit Window
  const handleBatchModifySelected = useCallback(
    (patch: {
      color?: string;
      textureId?: TexturePresetId;
      scaleMultiplier?: number;
      dimensions?: [number, number, number];
      rotationDeltaY?: number;
    }) => {
      const targetIds =
        selectedAssetIds.length > 0
          ? selectedAssetIds
          : selectedAssetId
          ? [selectedAssetId]
          : [];
      if (targetIds.length === 0) return;
      recordUndoSnapshot(
        targetIds.length > 1
          ? `Quick-edit ${targetIds.length} assets`
          : `Quick-edit asset`
      );
      setAssets((prev) => batchModifySelectedAssets(prev, targetIds, patch));
      setStatusBanner(
        `Updated ${targetIds.length} ${
          targetIds.length === 1 ? 'asset' : 'selected assets'
        } via Quick Edit [F] — Use Undo (Ctrl+Z) to revert.`
      );
    },
    [selectedAssetIds, selectedAssetId, recordUndoSnapshot]
  );

  // Toggle hinged door / secret wall swing preview (Modification -> tracked on undo stack)
  const handleToggleAssetOpen = useCallback(
    (asset: PlacedAsset) => {
      recordUndoSnapshot(`${asset.isOpen ? 'Close' : 'Open'} "${asset.name}"`);
      soundFX.playSecretPassageOpen();
      const nextOpen = !asset.isOpen;
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isOpen: nextOpen } : a)));
      setSelectedAssetId(asset.id);
      setSelectedAssetIds((prev) => (prev.includes(asset.id) ? prev : [asset.id]));
      setStatusBanner(
        `${nextOpen ? 'Opened' : 'Closed'} hinge on "${asset.name}" [E] for clearance & scale preview.`
      );
    },
    [recordUndoSnapshot]
  );

  // Dedicated "E" key interaction handler across Walkthrough & 3D Asset Builder modes
  const handleInteractWithAssetKeyE = useCallback(
    (asset: PlacedAsset) => {
      setSelectedAssetId(asset.id);
      setSelectedAssetIds((prev) => (prev.includes(asset.id) ? prev : [asset.id]));
      setActiveBlueprint(null);

      if (asset.isSecretPassage || asset.category === 'door') {
        handleToggleAssetOpen(asset);
        return;
      }

      soundFX.playClueFound();
      setStatusBanner(
        `Interacted [E] with "${asset.name}" (${asset.dimensions[0]}m × ${asset.dimensions[1]}m × ${asset.dimensions[2]}m, ${asset.textureId}) — Press [F] to open Quick Edit.`
      );
    },
    [handleToggleAssetOpen]
  );

  // Update asset properties from the inspector (Modification -> tracked on undo stack; applies Surface Snapping when X/Z moves if enabled)
  const handleUpdateAsset = useCallback(
    (updated: PlacedAsset) => {
      recordUndoSnapshot(`Modify "${updated.name}"`);
      setAssets((prev) => {
        const existing = prev.find((a) => a.id === updated.id);
        let finalAsset = updated;
        if (
          surfaceSnapEnabled &&
          existing &&
          (existing.position[0] !== updated.position[0] ||
            existing.position[2] !== updated.position[2])
        ) {
          const snap = computeSurfaceSnappedPosition(
            updated,
            updated.position[0],
            updated.position[2],
            prev
          );
          if (snap.snappedToId) {
            finalAsset = {
              ...updated,
              position: [snap.x, updated.position[1], snap.z],
              rotationY: snap.rotationY
            };
          }
        }
        return prev.map((a) => (a.id === updated.id ? finalAsset : a));
      });
      setStatusBanner(`Modified "${updated.name}" — Use Undo (Ctrl+Z) to revert.`);
    },
    [recordUndoSnapshot, surfaceSnapEnabled]
  );

  // Delete asset (or all multi-selected assets) from floor (Deletion -> tracked on undo stack)
  const handleDeleteAsset = useCallback(
    (id: string) => {
      const idsToDelete =
        selectedAssetIds.length > 1 && selectedAssetIds.includes(id)
          ? selectedAssetIds
          : [id];
      const deleteSet = new Set(idsToDelete);
      const target = assets.find((a) => a.id === id);
      recordUndoSnapshot(
        idsToDelete.length > 1
          ? `Delete ${idsToDelete.length} selected assets`
          : `Delete "${target ? target.name : 'Asset'}"`
      );
      setAssets((prev) => prev.filter((a) => !deleteSet.has(a.id)));
      setSelectedAssetId(null);
      setSelectedAssetIds([]);
      setQuickEditWindowOpen(false);
      setIsolateSelectedAsset(false);
      setStatusBanner(
        idsToDelete.length > 1
          ? `Deleted ${idsToDelete.length} selected objects — Use Undo (Ctrl+Z) to restore.`
          : `Deleted "${target ? target.name : '3D object'}" from canvas layer — Use Undo (Ctrl+Z) to restore.`
      );
    },
    [assets, selectedAssetIds, recordUndoSnapshot]
  );

  // Duplicate selected asset on the floor (Addition -> tracked on undo stack)
  const handleDuplicateAsset = useCallback(
    (asset: PlacedAsset) => {
      recordUndoSnapshot(`Duplicate "${asset.name}"`);
      soundFX.playPlaceAsset();
      const copy: PlacedAsset = {
        ...asset,
        id: `${asset.id}_copy_${Date.now()}`,
        name: `${asset.name} (Copy)`,
        position: [
          Math.round((asset.position[0] + 1.0) * 2) / 2,
          asset.position[1],
          Math.round((asset.position[2] + 0.5) * 2) / 2
        ]
      };
      setAssets((prev) => [...prev, copy]);
      setSelectedAssetId(copy.id);
      setSelectedAssetIds([copy.id]);
      setActiveBlueprint(null);
      setStatusBanner(`Duplicated "${asset.name}" and selected the new copy for modification.`);
    },
    [recordUndoSnapshot]
  );

  // Save any modified or generated asset directly into the Asset List catalog
  const handleSaveAssetToCatalog = useCallback(
    (asset: PlacedAsset) => {
      soundFX.playPlaceAsset();
      const bp = createBlueprintFromAsset(asset);
      setCatalogAssets((prev) => [bp, ...prev]);
      setStatusBanner(
        `Added "${asset.name}" to the Visual Asset Catalog (${catalogAssets.length + 1} total assets).`
      );
    },
    [catalogAssets.length]
  );

  // Download helper for JSON exports
  const triggerJsonDownload = (filename: string, payload: unknown) => {
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export a single 3D asset as a portable JSON file for external environments
  const handleExportSingleAsset = useCallback((asset: PlacedAsset) => {
    const safeName = asset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const exportPayload = {
      schemaVersion: '1.0.0',
      exportedFrom: 'ArchitectForge 3D Asset Studio',
      exportedAt: new Date().toISOString(),
      assetType: '3d_environment_object',
      blueprint: createBlueprintFromAsset(asset),
      instance: asset
    };
    triggerJsonDownload(`asset_${safeName}.json`, exportPayload);
    setStatusBanner(`Exported 3D asset specification "asset_${safeName}.json" for external environments!`);
  }, []);

  // Export a single Character Rig as a portable JSON file (including offline instructions, daily actions & history)
  const handleExportCharacterRig = useCallback(
    (rig: HotelAgentProfile) => {
      const safeName = rig.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
      const exportPayload = {
        schemaVersion: '1.1.0',
        exportedFrom: 'ArchitectForge 3D Asset Studio',
        exportedAt: new Date().toISOString(),
        assetType: '3d_character_rig',
        offlineSandboxMode: true,
        globalInstructionSet,
        gameplayClock: {
          gameTimeMinutes,
          formattedTime: timeInfo.formattedTime,
          phase: timeInfo.phase,
          activeWorldEvent: timeInfo.activeWorldEvent
        },
        characterRig: rig,
        savedInteractions,
        timeOfDayEvents
      };
      triggerJsonDownload(`character_rig_${safeName}.json`, exportPayload);
      setStatusBanner(
        `Exported character rig "character_rig_${safeName}.json" with AI personality, offline instructions & saved history!`
      );
    },
    [globalInstructionSet, gameTimeMinutes, savedInteractions, timeOfDayEvents]
  );

  // Save a Room Blueprint (from selected assets or all assets on the active floor) into the JSON Library
  const handleSaveRoomBlueprint = useCallback(
    (name: string, description: string, useSelectionOnly: boolean) => {
      const sourceAssets = useSelectionOnly
        ? assets.filter((a) => selectedAssetIds.includes(a.id) || a.id === selectedAssetId)
        : assets.filter((a) => a.floor === currentFloor);

      if (sourceAssets.length === 0) {
        setStatusBanner(
          'Place or select at least 1 asset on the canvas before saving a Room Blueprint.'
        );
        return;
      }

      soundFX.playPlaceAsset();
      const newBp = createRoomBlueprintFromAssets(name, description, sourceAssets, [
        String(currentFloor),
        useSelectionOnly ? 'selection' : 'full_room'
      ]);
      setRoomBlueprints((prev) => [newBp, ...prev]);
      setStatusBanner(
        `Saved Room Blueprint "${newBp.name}" (${newBp.items.length} objects, ${newBp.boundingSize[0]}m × ${newBp.boundingSize[1]}m) to JSON Library!`
      );
    },
    [assets, selectedAssetIds, selectedAssetId, currentFloor]
  );

  // Load & instantiate a Room Blueprint onto the active floor layer (tracked on Undo stack)
  const handleLoadRoomBlueprint = useCallback(
    (blueprint: RoomBlueprint, offsetX: number, offsetZ: number, replaceFloor: boolean) => {
      recordUndoSnapshot(`Load Room Blueprint "${blueprint.name}"`);
      soundFX.playPlaceAsset();
      const instantiated = instantiateRoomBlueprintOnFloor(
        blueprint,
        currentFloor,
        offsetX,
        offsetZ
      );
      setAssets((prev) => {
        const base = replaceFloor ? prev.filter((a) => a.floor !== currentFloor) : prev;
        return [...base, ...instantiated];
      });
      const newIds = instantiated.map((a) => a.id);
      setSelectedAssetIds(newIds);
      setSelectedAssetId(newIds.length > 0 ? newIds[newIds.length - 1] : null);
      setActiveBlueprint(null);
      setStatusBanner(
        `Loaded Room Blueprint "${blueprint.name}" (${instantiated.length} objects) onto ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        } at (${offsetX}m, ${offsetZ}m)!`
      );
    },
    [currentFloor, floorLayers, recordUndoSnapshot]
  );

  const handleDeleteRoomBlueprint = useCallback((id: string) => {
    setRoomBlueprints((prev) => prev.filter((bp) => bp.id !== id));
    setStatusBanner('Removed Room Blueprint from JSON Library.');
  }, []);

  const handleExportRoomBlueprint = useCallback((blueprint: RoomBlueprint) => {
    const safeName = blueprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    triggerJsonDownload(`room_blueprint_${safeName}.json`, {
      schemaVersion: '1.1.0',
      exportedFrom: 'ArchitectForge Room Blueprint Library',
      exportedAt: new Date().toISOString(),
      assetType: 'room_blueprint',
      roomBlueprint: blueprint
    });
    setStatusBanner(`Exported Room Blueprint "room_blueprint_${safeName}.json"!`);
  }, []);

  const handleExportAllRoomBlueprints = useCallback(() => {
    triggerJsonDownload('architectforge_room_blueprints.json', {
      schemaVersion: '1.1.0',
      exportedFrom: 'ArchitectForge Room Blueprint Library',
      exportedAt: new Date().toISOString(),
      assetType: 'room_blueprint_library',
      roomBlueprints
    });
    setStatusBanner(
      `Exported Room Blueprint JSON Library (${roomBlueprints.length} room layouts)!`
    );
  }, [roomBlueprints]);

  const handleImportRoomBlueprintsJson = useCallback((jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed.roomBlueprints)) {
        setRoomBlueprints((prev) => [...parsed.roomBlueprints, ...prev]);
        setStatusBanner(
          `Imported ${parsed.roomBlueprints.length} Room Blueprints into the JSON Library!`
        );
      } else if (parsed.roomBlueprint && Array.isArray(parsed.roomBlueprint.items)) {
        setRoomBlueprints((prev) => [parsed.roomBlueprint, ...prev]);
        setStatusBanner(
          `Imported Room Blueprint "${parsed.roomBlueprint.name}" into the JSON Library!`
        );
      } else if (Array.isArray(parsed.items) && parsed.name) {
        setRoomBlueprints((prev) => [parsed as RoomBlueprint, ...prev]);
        setStatusBanner(`Imported Room Blueprint "${parsed.name}" into the JSON Library!`);
      } else {
        setStatusBanner('Unrecognized Blueprint JSON structure.');
      }
    } catch {
      setStatusBanner('Failed to parse Blueprint JSON file.');
    }
  }, []);

  // ============================================================================
  // ENTIRE PROJECT SAVE & LOAD SYSTEM (Browser Slots + Portable .json Files)
  // ============================================================================
  const [projectName, setProjectName] = useState<string>('Grand 1920s Hotel & Parlor Project');
  const [projectDescription, setProjectDescription] = useState<string>(
    'Multi-floor 128×128 architectural build with room blueprints, AI character rigs & lore clock.'
  );
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [savedProjects, setSavedProjects] = useState<ArchitectForgeProjectSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem('architectforge_saved_projects_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage error
    }
    const starterHotelProject = createProjectSnapshot({
      id: 'proj_starter_hotel_1920s',
      name: 'Grand 1920s Hotel & Parlor Suite',
      description:
        'Pre-built multi-floor 1920s NYC hotel with lobby counter, secret bookcase wall, and resident AI character rigs.',
      currentFloor: 'lobby',
      floorLayers: INITIAL_FLOOR_LAYERS,
      assets: INITIAL_PLACED_ASSETS,
      catalogBlueprints: ASSET_CATALOG,
      roomBlueprints: INITIAL_ROOM_BLUEPRINTS,
      characterRigs: INITIAL_AGENTS.filter((a) => a.role !== 'helper_entity'),
      globalInstructionSet: DEFAULT_GLOBAL_INSTRUCTION_SET,
      gameTimeMinutes: 19 * 60 + 30,
      savedInteractions: [],
      timeOfDayEvents: [],
      settings: {
        surfaceSnapEnabled: true,
        showTPoseMannequin: false,
        showExteriorWalls: false,
        customGeneratedTexUrl: null
      }
    });

    const blankLotProject = createProjectSnapshot({
      id: 'proj_starter_blank_128',
      name: 'Clean 128×128 Architectural Lot',
      description: 'Empty 5-layer 128×128 square tile lot ready for custom room blueprints and assets.',
      currentFloor: 'lobby',
      floorLayers: INITIAL_FLOOR_LAYERS,
      assets: [],
      catalogBlueprints: ASSET_CATALOG,
      roomBlueprints: INITIAL_ROOM_BLUEPRINTS,
      characterRigs: [],
      globalInstructionSet: DEFAULT_GLOBAL_INSTRUCTION_SET,
      gameTimeMinutes: 12 * 60,
      savedInteractions: [],
      timeOfDayEvents: [],
      settings: {
        surfaceSnapEnabled: true,
        showTPoseMannequin: false,
        showExteriorWalls: false,
        customGeneratedTexUrl: null
      }
    });

    return [starterHotelProject, blankLotProject];
  });

  useEffect(() => {
    try {
      localStorage.setItem('architectforge_saved_projects_v1', JSON.stringify(savedProjects));
    } catch {
      // ignore storage quota errors
    }
  }, [savedProjects]);

  const buildCurrentProjectSnapshot = useCallback(
    (overrideId?: string, overrideName?: string, overrideDesc?: string) => {
      return createProjectSnapshot({
        id: overrideId,
        name: overrideName ?? projectName,
        description: overrideDesc ?? projectDescription,
        currentFloor,
        floorLayers,
        assets,
        catalogBlueprints: catalogAssets,
        roomBlueprints,
        characterRigs: agents,
        customAppearance,
        customStats,
        customTraits,
        globalInstructionSet,
        gameTimeMinutes,
        savedInteractions,
        timeOfDayEvents,
        settings: {
          surfaceSnapEnabled,
          showTPoseMannequin,
          showExteriorWalls,
          customGeneratedTexUrl
        }
      });
    },
    [
      projectName,
      projectDescription,
      currentFloor,
      floorLayers,
      assets,
      catalogAssets,
      roomBlueprints,
      agents,
      customAppearance,
      customStats,
      customTraits,
      globalInstructionSet,
      gameTimeMinutes,
      savedInteractions,
      timeOfDayEvents,
      surfaceSnapEnabled,
      showTPoseMannequin,
      showExteriorWalls,
      customGeneratedTexUrl
    ]
  );

  const applyProjectSnapshotToWorkspace = useCallback(
    (project: ArchitectForgeProjectSnapshot, sourceLabel: string) => {
      recordUndoSnapshot(`Load Project "${project.name}"`);
      soundFX.playPlaceAsset();
      setProjectName(project.name);
      setProjectDescription(project.description);
      setActiveProjectId(project.id);
      setFloorLayers(
        project.floorLayers.length > 0 ? project.floorLayers : INITIAL_FLOOR_LAYERS
      );
      setCurrentFloor(project.currentFloor || 'lobby');
      setAssets(project.assets || []);
      if (Array.isArray(project.catalogBlueprints) && project.catalogBlueprints.length > 0) {
        setCatalogAssets(project.catalogBlueprints as AssetBlueprint[]);
      }
      if (Array.isArray(project.roomBlueprints) && project.roomBlueprints.length > 0) {
        setRoomBlueprints(project.roomBlueprints);
      }
      setAgents(project.characterRigs || []);
      if (project.customAppearance) setCustomAppearance(project.customAppearance);
      if (project.customStats) setCustomStats(project.customStats);
      if (Array.isArray(project.customTraits)) setCustomTraits(project.customTraits);
      if (project.globalInstructionSet) setGlobalInstructionSet(project.globalInstructionSet);
      if (typeof project.gameTimeMinutes === 'number') {
        setGameTimeMinutes(project.gameTimeMinutes);
      }
      if (Array.isArray(project.savedInteractions)) {
        setSavedInteractions(project.savedInteractions);
      }
      if (Array.isArray(project.timeOfDayEvents)) {
        setTimeOfDayEvents(project.timeOfDayEvents);
      }
      if (project.settings) {
        setSurfaceSnapEnabled(project.settings.surfaceSnapEnabled ?? true);
        setShowTPoseMannequin(project.settings.showTPoseMannequin ?? false);
        setShowExteriorWalls(project.settings.showExteriorWalls ?? false);
        setCustomGeneratedTexUrl(project.settings.customGeneratedTexUrl ?? null);
      }
      setSelectedAssetId(null);
      setSelectedAssetIds([]);
      setActiveBlueprint(null);
      setQuickEditWindowOpen(false);
      setIsolateSelectedAsset(false);
      setStatusBanner(
        `Loaded Entire Project "${project.name}" (${project.floorLayers.length} floors, ${project.assets.length} objects, ${project.roomBlueprints.length} blueprints, ${project.characterRigs.length} rigs) from ${sourceLabel}!`
      );
    },
    [recordUndoSnapshot]
  );

  const handleSaveNewProjectSlot = useCallback(() => {
    soundFX.playPlaceAsset();
    const snap = buildCurrentProjectSnapshot();
    setSavedProjects((prev) => upsertProjectInSlotList(prev, snap));
    setActiveProjectId(snap.id);
    setStatusBanner(
      `💾 Saved Entire Project "${snap.name}" (${snap.floorLayers.length} floors, ${snap.assets.length} objects, ${snap.characterRigs.length} rigs) to Project Slots!`
    );
  }, [buildCurrentProjectSnapshot]);

  const handleOverwriteProjectSlot = useCallback(
    (slotId: string) => {
      soundFX.playPlaceAsset();
      const targetSlot = savedProjects.find((p) => p.id === slotId);
      const snap = buildCurrentProjectSnapshot(
        slotId,
        projectName.trim() || targetSlot?.name || 'Saved Project',
        projectDescription.trim() || targetSlot?.description || ''
      );
      setSavedProjects((prev) => upsertProjectInSlotList(prev, snap));
      setActiveProjectId(snap.id);
      setStatusBanner(`💾 Updated Project Slot "${snap.name}" with current studio state!`);
    },
    [savedProjects, projectName, projectDescription, buildCurrentProjectSnapshot]
  );

  const handleDeleteProjectSlot = useCallback(
    (slotId: string) => {
      setSavedProjects((prev) => prev.filter((p) => p.id !== slotId));
      if (activeProjectId === slotId) {
        setActiveProjectId(null);
      }
      setStatusBanner('Removed project slot from Saved Projects library.');
    },
    [activeProjectId]
  );

  // Export complete Project (.json) file to disk
  const handleExportFullAssetPack = useCallback(
    (specificProject?: ArchitectForgeProjectSnapshot) => {
      const snap = specificProject || buildCurrentProjectSnapshot();
      const safeName = snap.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      triggerJsonDownload(`project_${safeName}.architectforge.json`, snap);
      setStatusBanner(
        `Exported Entire Project "project_${safeName}.architectforge.json" (${snap.floorLayers.length} floors, ${snap.assets.length} objects, ${snap.roomBlueprints.length} blueprints)!`
      );
    },
    [buildCurrentProjectSnapshot]
  );

  // Copy JSON spec to clipboard for quick pasting into external apps
  const handleCopyJsonToClipboard = useCallback(async () => {
    const selectedObj = assets.find((a) => a.id === selectedAssetId) || null;
    const payload = selectedObj
      ? {
          schemaVersion: '1.0.0',
          assetType: '3d_environment_object',
          blueprint: createBlueprintFromAsset(selectedObj),
          instance: selectedObj
        }
      : buildCurrentProjectSnapshot();
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatusBanner(
        selectedObj
          ? `Copied "${selectedObj.name}" 3D JSON spec to clipboard!`
          : `Copied full Project JSON ("${projectName}") to clipboard!`
      );
    } catch {
      setStatusBanner('Prepared JSON spec — use Export (.json) to save directly to disk.');
    }
  }, [assets, selectedAssetId, buildCurrentProjectSnapshot, projectName]);

  const handleImportProjectJsonText = useCallback(
    (jsonText: string, filename: string) => {
      try {
        const parsed = JSON.parse(jsonText);
        // Support single 3D asset import as well as full project import
        if (parsed.instance && parsed.blueprint && !parsed.assets && !parsed.environmentPlacements) {
          recordUndoSnapshot(`Import asset "${filename}"`);
          setCatalogAssets((prev) => [parsed.blueprint, ...prev]);
          setAssets((prev) => [...prev, { ...parsed.instance, floor: currentFloor }]);
          setStatusBanner(`Imported 3D asset "${parsed.instance.name}" onto current floor!`);
          return;
        }

        const validation = validateAndParseProjectSnapshot(parsed);
        if (!validation.valid || !validation.project) {
          setStatusBanner(
            validation.error || `Could not parse "${filename}" as an ArchitectForge Project.`
          );
          return;
        }

        const loadedProj = validation.project;
        setSavedProjects((prev) => upsertProjectInSlotList(prev, loadedProj));
        applyProjectSnapshotToWorkspace(loadedProj, `file "${filename}"`);
      } catch {
        setStatusBanner(`Could not parse "${filename}" — verify valid ArchitectForge JSON format.`);
      }
    },
    [currentFloor, recordUndoSnapshot, applyProjectSnapshotToWorkspace]
  );

  // Import external Project or Asset Pack JSON from top-bar file input
  const handleImportAssetPackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleImportProjectJsonText(String(reader.result || ''), file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // AI 3D / Meshy.ai Image-to-3D + Google gemini-3.1-flash-lite Object Generator -> Places in scene, adds to Asset List, and records on Undo Stack
  const handleGenerateAI3DAsset = async (
    promptText: string,
    referenceImageUrl?: string | null
  ) => {
    if (!promptText.trim()) return;
    setAiForgeBusy(true);
    setStatusBanner(
      referenceImageUrl
        ? `Meshy.ai Image-to-3D + Google gemini-3.1-flash-lite: Converting reference image & prompt "${promptText}" into 3D mesh...`
        : `Google gemini-3.1-flash-lite + Meshy 3D: Generating low-poly 3D mesh for "${promptText}"...`
    );
    try {
      const res = await fetch('/api/forge/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          floor: currentFloor,
          referenceImageUrl: referenceImageUrl || null
        })
      });
      const data = await res.json();
      const spec = data.spec || buildProcedural3DSpecFromPrompt(promptText);
      const [w, h, d] = spec.dimensions || [1.1, 1.3, 0.9];

      const newAsset: PlacedAsset = {
        id: `ai3d_${Date.now()}`,
        name: spec.name || promptText,
        category: 'custom_ai',
        subType: 'meshy_ai_object',
        floor: currentFloor,
        roomNumber: currentRoomLabel,
        position: [0, h / 2, 0],
        dimensions: [w, h, d],
        rotationY: 0,
        color: '#d4af37',
        textureId: 'aged_brass',
        collidable: true,
        compositeParts: spec.parts,
        inspectText: `Custom 3D object ("${promptText}" via ${
          referenceImageUrl ? 'Meshy.ai Image-to-3D + ' : ''
        }Google gemini-3.1-flash-lite).`
      };
      const generatedBlueprint = createBlueprintFromAsset(newAsset);
      recordUndoSnapshot(`Forge AI 3D "${newAsset.name}"`);
      soundFX.playPlaceAsset();
      setCatalogAssets((prev) => [generatedBlueprint, ...prev]);
      setAssets((prev) => [...prev, newAsset]);
      setActiveBlueprint(null);
      setSelectedAssetId(newAsset.id);
      setSelectedAssetIds([newAsset.id]);
      setStatusBanner(
        `Forged "${newAsset.name}" (${
          referenceImageUrl ? 'Meshy.ai Image-to-3D + ' : ''
        }Google gemini-3.1-flash-lite) — Added to Visual Catalog & placed on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        }!`
      );
    } catch {
      const fallback = buildProcedural3DSpecFromPrompt(promptText);
      const [w, h, d] = fallback.dimensions;
      const newAsset: PlacedAsset = {
        id: `ai3d_${Date.now()}`,
        name: fallback.name,
        category: 'custom_ai',
        subType: 'meshy_ai_object',
        floor: currentFloor,
        roomNumber: currentRoomLabel,
        position: [0, h / 2, 0],
        dimensions: [w, h, d],
        rotationY: 0,
        color: '#d4af37',
        textureId: 'aged_brass',
        collidable: true,
        compositeParts: fallback.parts
      };
      const generatedBlueprint = createBlueprintFromAsset(newAsset);
      recordUndoSnapshot(`Forge AI 3D "${newAsset.name}"`);
      setCatalogAssets((prev) => [generatedBlueprint, ...prev]);
      setAssets((prev) => [...prev, newAsset]);
      setActiveBlueprint(null);
      setSelectedAssetId(newAsset.id);
      setSelectedAssetIds([newAsset.id]);
      setStatusBanner(
        `Forged "${newAsset.name}" — Added to Visual Catalog & placed on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        }!`
      );
    } finally {
      setAiForgeBusy(false);
    }
  };

  // Google Gemini 3.1 Flash-Lite Image (Nano Banana Lite) Texture & Reference Synthesizer
  const handleGenerateCustomTexture = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiForgeBusy(true);
    setStatusBanner(
      `Google gemini-3.1-flash-lite-image: Synthesizing surface texture "${promptText}"...`
    );
    try {
      const res = await fetch('/api/forge/generate-texture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, aspectRatio: '1:1' })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setCustomGeneratedTexUrl(data.imageUrl);
        setStatusBanner(
          `Synthesized custom surface texture with Google gemini-3.1-flash-lite-image!`
        );
      } else {
        setStatusBanner(`Applied procedural weathered NYC masonry texture preset.`);
      }
    } catch {
      setStatusBanner(`Applied procedural weathered NYC masonry texture preset.`);
    } finally {
      setAiForgeBusy(false);
    }
  };

  // Google Search Grounded Architectural Proportion & Material Reference Lookup
  const handleResearchNycLore = async (query: string) => {
    if (!query.trim()) return;
    setAiForgeBusy(true);
    try {
      const res = await fetch('/api/research/nyc-lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setLoreSummary(data.summary);
    } catch {
      setLoreSummary(
        'Standard pre-war NYC interior partitions use 3.0m ceiling height, 0.25m brick/plaster thickness, and 0.9m × 2.1m transom doors.'
      );
    } finally {
      setAiForgeBusy(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null;
  const floorAssets = assets.filter((a) => a.floor === currentFloor);
  const lastUndoLabel = undoStack.length > 0 ? undoStack[undoStack.length - 1].actionLabel : null;
  const currentFloorMeta = getFloorMeta(currentFloor, floorLayers);
  const activeSelectionCount =
    selectedAssetIds.length > 0 ? selectedAssetIds.length : selectedAsset ? 1 : 0;

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none font-['DM_Sans'] text-slate-800">
      {/* Hidden File Input for Importing JSON Asset Packs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportAssetPackFile}
        className="hidden"
      />

      {/* 1. Full-Bleed 3D WebGL Asset Studio Viewport (Blank 128x128 Square Tiles Lot + Marquee & Shift+Click) */}
      <HotelViewport3D
        mode={mode}
        currentFloor={currentFloor}
        floorLayers={floorLayers}
        assets={assets}
        agents={agents}
        selectedAssetId={selectedAssetId}
        selectedAssetIds={selectedAssetIds}
        marqueeModeActive={marqueeModeActive}
        activeBlueprint={activeBlueprint}
        showTPoseMannequin={showTPoseMannequin}
        isolateSelectedAsset={isolateSelectedAsset}
        showExteriorWalls={showExteriorWalls}
        customCharacterAppearance={customAppearance}
        onSelectAsset={handleSelectAsset}
        onMarqueeSelectAssets={handleMarqueeSelectAssets}
        onPlaceBlueprintAt={handlePlaceBlueprintAt}
        onBeginAssetDrag={handleBeginAssetDrag}
        onMoveSelectedAssetTo={handleMoveSelectedAssetTo}
        onToggleAssetOpen={handleToggleAssetOpen}
        onInteractKeyE={handleInteractWithAssetKeyE}
        onSelectedAssetScreenPosition={(pos) => {
          if (pos) setSelectedAssetScreenPos(pos);
        }}
        onPlayerRoomChange={(rm, prompt) => {
          setCurrentRoomLabel(rm);
          setNearbyPrompt(prompt);
        }}
      />

      {/* 2. FLOATING [F] QUICK EDIT WINDOW TO THE RIGHT OF THE SELECTED ASSET */}
      {quickEditWindowOpen && selectedAsset && mode !== 'character' && (
        <QuickEditWindowF
          primaryAsset={selectedAsset}
          selectedCount={activeSelectionCount}
          screenPosition={selectedAssetScreenPos}
          onClose={() => setQuickEditWindowOpen(false)}
          onBatchModify={handleBatchModifySelected}
          onInteractKeyE={handleInteractWithAssetKeyE}
          onDuplicate={handleDuplicateAsset}
          onDeleteSelected={() => handleDeleteAsset(selectedAsset.id)}
        />
      )}

      {/* 3. SIMS 3 / SIMS 4 FLOATING ROUNDED TOP BAR (Sleek Frosted Pill Bar) */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="fixed top-2.5 left-3 right-3 flex flex-col items-center gap-1 pointer-events-none">
          <div className="w-full flex items-center justify-between gap-2">
            {/* Top-Left Pill: Studio Identity & 128x128 Lot Telemetry */}
            <div className="pointer-events-auto bg-white/92 backdrop-blur-md border border-[#cbd5e1] rounded-full px-3.5 py-1.5 shadow-md flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white font-['Outfit'] font-extrabold text-xs shadow-2xs">
                  ◆
                </div>
                <div>
                  <div className="text-xs font-['Outfit'] font-extrabold tracking-tight text-slate-800 leading-tight">
                    ArchitectForge Studio
                  </div>
                  <div className="text-[10px] font-medium text-[#0284c7] leading-tight">
                    {GRID_TILE_COUNT}×{GRID_TILE_COUNT} Tile Lot · {currentFloorMeta.shortCode} ({floorAssets.length} objs
                    {activeSelectionCount > 1 ? ` · ${activeSelectionCount} sel` : ''})
                  </div>
                </div>
              </div>
            </div>

            {/* Top-Center Floating Pill: Sims-Style Build / Character / Live Walkthrough Mode Switcher */}
            <div className="pointer-events-auto flex items-center gap-1 bg-white/92 backdrop-blur-md border border-[#cbd5e1] p-1 rounded-full shadow-md shrink-0">
              {(
                [
                  { id: 'architect', label: '1 · Build & Buy Mode' },
                  { id: 'character', label: '2 · Create-A-Character' },
                  { id: 'walkthrough', label: '3 · First-Person Walk' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMode(tab.id);
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    mode === tab.id
                      ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Top-Right Pill Cluster: Undo, Load Sample Preset, Export/Import JSON & Audio Mute */}
            <div className="pointer-events-auto flex items-center gap-1.5 bg-white/92 backdrop-blur-md border border-[#cbd5e1] px-2.5 py-1 rounded-full shadow-md shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                title={
                  lastUndoLabel
                    ? `Undo last action: ${lastUndoLabel} (Ctrl+Z)`
                    : 'No asset actions to undo (Ctrl+Z)'
                }
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  undoStack.length > 0
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↶ Undo ({undoStack.length})
              </button>

              {redoStack.length > 0 && (
                <button
                  type="button"
                  onClick={handleRedo}
                  title={`Redo undone action: ${redoStack[redoStack.length - 1].actionLabel} (Ctrl+Y)`}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition-all whitespace-nowrap"
                >
                  ↷ Redo ({redoStack.length})
                </button>
              )}

              <button
                type="button"
                onClick={handleLoadSamplePreset}
                title="Populate the 128×128 canvas with the sample multi-floor hotel objects"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Load Sample Lot
              </button>

              <button
                type="button"
                data-testid="open-project-manager-btn"
                onClick={() => {
                  handleToggleOpenWindow('projects', true);
                  handleFocusWindow('projects');
                }}
                title="Open the Entire Project Save & Load Manager (Save/Load slots or export/import .json project files)"
                className="px-3 py-1 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] rounded-full text-xs font-bold text-white whitespace-nowrap shadow-2xs"
              >
                💾 Projects ({savedProjects.length})
              </button>

              <button
                type="button"
                onClick={handleSaveNewProjectSlot}
                title="Quick-save the entire current studio project into a browser slot"
                className="px-2.5 py-1 bg-[#d1fae5] hover:bg-[#a7f3d0] rounded-full text-xs font-bold text-[#065f46] whitespace-nowrap"
              >
                Save Project
              </button>

              <button
                type="button"
                onClick={() => handleExportFullAssetPack()}
                title="Download complete Project (.architectforge.json)"
                className="px-3 py-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] rounded-full text-xs font-bold text-white whitespace-nowrap shadow-2xs"
              >
                Export (.json)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Load an ArchitectForge Project (.json) from disk"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Load (.json)
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={isMuted ? 'Unmute UI Audio [M]' : 'Mute UI Audio [M]'}
                title="Mute / Unmute UI Audio [M]"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setIsMuted((m) => {
                    soundFX.muted = !m;
                    return !m;
                  });
                }}
                className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-700"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  {isMuted ? (
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  ) : (
                    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                  )}
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Reset Blank 128x128 Canvas"
                title="Reset to Blank 128×128 Square Tiles Canvas"
                onClick={(e) => {
                  e.currentTarget.blur();
                  resetToBlankCanvas();
                }}
                className="w-7 h-7 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 rounded-full flex items-center justify-center text-slate-700"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Window Manager Taskbar & Status Pill Banner */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pointer-events-auto">
            <div
              aria-label="Studio Window Taskbar"
              className="bg-white/92 backdrop-blur-md border border-[#cbd5e1] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 text-[11px]"
            >
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] mr-1">
                Windows:
              </span>
              {(mode === 'character'
                ? (['projects', 'char_appearance', 'char_ai', 'layers'] as StudioWindowId[])
                : (['projects', 'blueprints', 'tools', 'catalog', 'inspector', 'layers'] as StudioWindowId[])
              ).map((winId) => {
                const win = studioWindows[winId];
                const isVisible = win.isOpen && !win.isMinimized;
                return (
                  <button
                    key={winId}
                    type="button"
                    onClick={() => {
                      if (!win.isOpen) {
                        handleToggleOpenWindow(winId, true);
                      } else if (win.isMinimized) {
                        handleToggleMinimizeWindow(winId);
                        handleFocusWindow(winId);
                      } else {
                        handleToggleOpenWindow(winId, false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                      isVisible
                        ? 'bg-[#e0f2fe] text-[#0369a1] border border-[#7dd3fc]'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {win.shortTitle}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleResetWindowLayout}
                title="Reset all windows to default positions & sizes [H]"
                className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] ml-1"
              >
                Reset Layout
              </button>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-[#cbd5e1] px-3.5 py-0.5 rounded-full text-xs font-medium text-slate-700 shadow-xs max-w-xl truncate">
              {nearbyPrompt || statusBanner}
            </div>
          </div>
        </div>

        {/* Center Crosshair in 1st-Person Scale Walkthrough Mode */}
        {mode === 'walkthrough' && (
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0284c7]">
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </div>
        )}

        {/* Character & Rig Asset Studio Windows when in Character Mode */}
        {mode === 'character' && (
          <CharacterCreatorOverlay
            windows={studioWindows}
            onFocusWindow={handleFocusWindow}
            onMoveWindow={handleMoveWindow}
            onResizeWindow={handleResizeWindow}
            onToggleMinimizeWindow={handleToggleMinimizeWindow}
            onToggleMaximizeWindow={handleToggleMaximizeWindow}
            onCloseWindow={(id) => handleToggleOpenWindow(id, false)}
            appearance={customAppearance}
            stats={customStats}
            assignedTraits={customTraits}
            globalInstructionSet={globalInstructionSet}
            onChangeGlobalInstructionSet={setGlobalInstructionSet}
            gameTimeMinutes={gameTimeMinutes}
            onChangeGameTimeMinutes={handleChangeGameTimeMinutes}
            savedInteractions={savedInteractions}
            onRecordInteraction={handleRecordInteraction}
            timeOfDayEvents={timeOfDayEvents}
            onChangeAppearance={setCustomAppearance}
            onChangeStats={setCustomStats}
            onChangeTraits={setCustomTraits}
            onSaveCharacterRig={(newRig) => {
              soundFX.playPlaceAsset();
              setAgents((prev) => [...prev, newRig]);
              setStatusBanner(
                `Saved custom 3D Character Rig "${newRig.name}" (with AI personality, offline instruction sets & history) to ${newRig.roomNumber}!`
              );
            }}
            onExportCharacterRig={handleExportCharacterRig}
          />
        )}

        {/* Entire Project Save & Load Manager Floating Window */}
        <ProjectSaveLoadWindow
          windowState={studioWindows.projects}
          onFocus={handleFocusWindow}
          onMove={handleMoveWindow}
          onResize={handleResizeWindow}
          onToggleMinimize={handleToggleMinimizeWindow}
          onToggleMaximize={handleToggleMaximizeWindow}
          onClose={(id) => handleToggleOpenWindow(id, false)}
          projectName={projectName}
          projectDescription={projectDescription}
          onChangeProjectName={setProjectName}
          onChangeProjectDescription={setProjectDescription}
          activeStats={{
            floorsCount: floorLayers.length,
            assetsCount: assets.length,
            blueprintsCount: roomBlueprints.length,
            charactersCount: agents.length,
            gameTimeMinutes
          }}
          savedProjects={savedProjects}
          activeProjectId={activeProjectId}
          onSaveNewProjectSlot={handleSaveNewProjectSlot}
          onOverwriteProjectSlot={handleOverwriteProjectSlot}
          onLoadProjectSlot={(proj) => applyProjectSnapshotToWorkspace(proj, 'Saved Project Slot')}
          onDeleteProjectSlot={handleDeleteProjectSlot}
          onExportProjectFile={handleExportFullAssetPack}
          onImportProjectJsonText={handleImportProjectJsonText}
        />

        {/* Modular Floating Studio Windows (Floor Layers, Room Blueprints, Tools, Asset Catalog, Inspector) */}
        <UnifiedBottomDock
          mode={mode}
          windows={studioWindows}
          onFocusWindow={handleFocusWindow}
          onMoveWindow={handleMoveWindow}
          onResizeWindow={handleResizeWindow}
          onToggleMinimizeWindow={handleToggleMinimizeWindow}
          onToggleMaximizeWindow={handleToggleMaximizeWindow}
          onCloseWindow={(id) => handleToggleOpenWindow(id, false)}
          currentFloor={currentFloor}
          floorLayers={floorLayers}
          onSelectFloor={(fl) => {
            setCurrentFloor(fl);
            setSelectedAssetId(null);
            setSelectedAssetIds([]);
            setQuickEditWindowOpen(false);
            setIsolateSelectedAsset(false);
            const meta = getFloorMeta(fl, floorLayers);
            setStatusBanner(`Switched active editing layer to ${meta.label}.`);
          }}
          onAddFloorLayer={handleAddFloorLayer}
          onToggleFloorLayerVisibility={handleToggleFloorLayerVisibility}
          onClearFloor={handleClearCurrentFloor}
          catalogAssets={catalogAssets}
          floorAssets={floorAssets}
          selectedAsset={selectedAsset}
          selectedCount={activeSelectionCount}
          marqueeModeActive={marqueeModeActive}
          onToggleMarqueeMode={() => {
            setMarqueeModeActive((m) => {
              const next = !m;
              if (next) setActiveBlueprint(null);
              setStatusBanner(
                next
                  ? 'Marquee Multi-Select Active — Drag a selection box across the 3D viewport to select multiple objects!'
                  : 'Standard Pointer Active — Click or Shift+Click objects to select.'
              );
              return next;
            });
          }}
          onToggleQuickEditF={() => {
            if (selectedAsset) {
              setQuickEditWindowOpen((o) => !o);
            }
          }}
          onSelectAssetId={(id) => {
            setSelectedAssetId(id);
            setSelectedAssetIds(id ? [id] : []);
            if (id) {
              setActiveBlueprint(null);
            } else {
              setQuickEditWindowOpen(false);
              setIsolateSelectedAsset(false);
            }
          }}
          activeBlueprint={activeBlueprint}
          onSelectBlueprint={(bp) => {
            setActiveBlueprint(bp);
            if (bp) {
              setMarqueeModeActive(false);
              setSelectedAssetId(null);
              setSelectedAssetIds([]);
              setQuickEditWindowOpen(false);
              setIsolateSelectedAsset(false);
              setStatusBanner(
                `Loaded "${bp.name}" — Click anywhere on the ${GRID_TILE_COUNT}×${GRID_TILE_COUNT} square tile grid to place, or press ESC to clear.`
              );
            }
          }}
          onClearMouse={handleClearMouse}
          onUpdateAsset={handleUpdateAsset}
          onDuplicateAsset={handleDuplicateAsset}
          onInteractAsset={handleInteractWithAssetKeyE}
          onSaveAssetToCatalog={handleSaveAssetToCatalog}
          onExportSingleAsset={handleExportSingleAsset}
          onDeleteAsset={handleDeleteAsset}
          surfaceSnapEnabled={surfaceSnapEnabled}
          onToggleSurfaceSnap={() => {
            setSurfaceSnapEnabled((prev) => {
              const next = !prev;
              setStatusBanner(
                next
                  ? '🧲 Surface Snapping ENABLED — Moving objects automatically aligns them flush against the closest wall or surface!'
                  : 'Surface Snapping DISABLED — Moving objects snaps to the standard 0.5m tile grid.'
              );
              return next;
            });
          }}
          onSnapSelectedToSurfaceNow={handleSnapSelectedToSurfaceNow}
          roomBlueprints={roomBlueprints}
          onSaveRoomBlueprint={handleSaveRoomBlueprint}
          onLoadRoomBlueprint={handleLoadRoomBlueprint}
          onDeleteRoomBlueprint={handleDeleteRoomBlueprint}
          onExportRoomBlueprint={handleExportRoomBlueprint}
          onExportAllRoomBlueprints={handleExportAllRoomBlueprints}
          onImportRoomBlueprintsJson={handleImportRoomBlueprintsJson}
          undoCount={undoStack.length}
          lastUndoLabel={lastUndoLabel}
          onUndo={handleUndo}
          showTPoseMannequin={showTPoseMannequin}
          onToggleTPose={() => setShowTPoseMannequin((v) => !v)}
          isolateSelectedAsset={isolateSelectedAsset}
          onToggleIsolateAsset={() => setIsolateSelectedAsset((v) => !v)}
          showExteriorWalls={showExteriorWalls}
          onToggleExteriorWalls={() => setShowExteriorWalls((v) => !v)}
          onGenerateAI3DAsset={handleGenerateAI3DAsset}
          onGenerateCustomTexture={handleGenerateCustomTexture}
          onResearchNycLore={handleResearchNycLore}
          aiForgeBusy={aiForgeBusy}
          loreSummary={loreSummary}
          customGeneratedTexUrl={customGeneratedTexUrl}
        />
      </div>
    </main>
  );
}
