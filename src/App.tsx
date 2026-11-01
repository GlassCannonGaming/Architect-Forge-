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
  NotebookMemoEntry,
  createNotebookMemo,
  evaluateCharacterInteractionMemory,
  TimeOfDayEventLog,
  getTimeOfDayInfo,
  DailyActionEntry,
  computeScheduledAgentsForTime,
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
  upsertProjectInSlotList,
  generateSeamlessSvgTextureDataUrl,
  LocalFolderCategory,
  LOCAL_WORKSPACE_FOLDERS,
  LOCAL_WORKSPACE_ROOT_NAME,
  getLocalFolderSpec,
  buildLocalFolderItemFilename,
  WallRowPlacement,
  weatherAssetToLate70sStyle,
  weatherAssetsListToLate70sStyle,
  DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT,
  parseAssetDescriptionsFile,
  generateAssetConceptSvgDataUrl,
  applyAlphaMatteToConceptImageDataUrl,
  HINGE_TRANSITION_DURATION_MS,
  HingeSwingMode,
  initiateAssetHingeToggle,
  AI_MODEL_REGISTRY,
  KeybindingsMap,
  DEFAULT_KEYBINDINGS,
  normalizeAndMergeKeybindings,
  isActionKeyPressed,
  getPrimaryActionKeyLabel,
  GlobalAnimationFps,
  DEFAULT_GLOBAL_ANIMATION_FPS,
  TOP_EDITOR_MODE_TABS,
  STUDIO_HEADER_BRAND_SPEC,
  getTaskbarWindowIdsForMode,
  assignSoundToAssetOrBlueprint
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
import {
  LocalDiskFoldersWindow,
  LocalDiskFolderStatus,
  BatchImportedAssetSummary
} from './components/LocalDiskFoldersWindow';
import { AudioStudioWindow } from './components/AudioStudioWindow';
import { KeybindingsWindow } from './components/KeybindingsWindow';
import { soundFX } from './game/soundEffects';
import { audioEngine, BUILTIN_SOUND_EFFECTS, BUILTIN_BGM_TRACKS } from './game/audioEngine';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFromFirebase,
  syncUserProfileToCloud,
  saveProjectToCloudFirestore,
  deleteProjectFromCloudFirestore,
  subscribeToUserCloudProjects,
  type CloudSyncedProjectRecord,
  type User
} from './firebase';

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('architect');
  const [globalAnimationFps, setGlobalAnimationFps] = useState<GlobalAnimationFps>(
    DEFAULT_GLOBAL_ANIMATION_FPS
  );
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

  // Audio Engine State (No automatic sounds or footsteps in ArchitectForge Studio)
  const [walkthroughBgmEnabled, setWalkthroughBgmEnabled] = useState<boolean>(false);
  const [footstepsEnabled, setFootstepsEnabled] = useState<boolean>(false);

  // Proposal 2: 1970s Chrome D-Cell / UV Flashlight Inspection Cone in Walk Mode ([L])
  const [flashlightEnabled, setFlashlightEnabled] = useState<boolean>(true);
  const [flashlightRevealText, setFlashlightRevealText] = useState<string | null>(null);

  // Synchronize Sound Board Mode Window Activation (never auto-play BGM on mode change)
  useEffect(() => {
    if (mode !== 'soundboard') {
      audioEngine.stopBgm();
    }
    if (mode === 'soundboard') {
      setStudioWindows((prev) => {
        const opened = toggleStudioWindowOpen(prev, 'audio', true);
        const focused = focusStudioWindow(opened, 'audio');
        return {
          ...focused,
          audio: {
            ...focused.audio,
            x: 18,
            y: 84,
            width: 610,
            height: 575,
            isOpen: true,
            isMinimized: false
          }
        };
      });
    } else {
      setStudioWindows((prev) =>
        prev.audio?.isOpen ? toggleStudioWindowOpen(prev, 'audio', false) : prev
      );
    }
  }, [mode]);

  // Restore auto-saved canvas (automatically weathered to late-70s thriller palette) or start with the pre-built late-70s residential hotel
  const [assets, setAssets] = useState<PlacedAsset[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_autosave_canvas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
          return weatherAssetsListToLate70sStyle(parsed.assets);
        }
      }
    } catch {
      // ignore storage error
    }
    return weatherAssetsListToLate70sStyle(INITIAL_PLACED_ASSETS);
  });
  const [undoStack, setUndoStack] = useState<UndoHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoHistoryEntry[]>([]);
  const [catalogAssets, setCatalogAssets] = useState<AssetBlueprint[]>(ASSET_CATALOG);
  const [agents, setAgents] = useState<HotelAgentProfile[]>(() =>
    computeScheduledAgentsForTime(
      INITIAL_AGENTS.filter((a) => a.role !== 'helper_entity'),
      19 * 60 + 30,
      false
    )
  );
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

  // User-Defined Keybindings State (preserves all already-assigned keys by default)
  const [keybindings, setKeybindings] = useState<KeybindingsMap>(() => {
    try {
      const saved = localStorage.getItem('architectforge_keybindings_v1');
      if (saved) {
        return normalizeAndMergeKeybindings(JSON.parse(saved));
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_KEYBINDINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('architectforge_keybindings_v1', JSON.stringify(keybindings));
    } catch {
      // ignore storage error
    }
  }, [keybindings]);

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
          projects: parsed.projects ? { ...defaults.projects, ...parsed.projects } : defaults.projects,
          local_fs: parsed.local_fs ? { ...defaults.local_fs, ...parsed.local_fs } : defaults.local_fs,
          keybindings: parsed.keybindings
            ? { ...defaults.keybindings, ...parsed.keybindings }
            : defaults.keybindings
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

  // Character Rig Creator State (defaults to Old Lady with 38° Bent Spine, Walnut Cane & Hollow Stare)
  const [customAppearance, setCustomAppearance] = useState<CharacterAppearance>({
    archetype: 'Elderly Matron',
    headShape: 'proportional_human',
    bodyProportionStyle: 'proportional_human',
    skinColor: '#eed8c7',
    eyeStyle: 'wide_amber',
    hairStyle: 'silver_bun',
    hairColor: '#d1d5db',
    outfitColor: '#4b5563',
    accentColor: '#b45309',
    mouthStyle: 'nervous_frown',
    facialExpression: 'hollow_stare',
    spineCurvature: 38,
    hasWalkingCane: true,
    hasSpectacles: true,
    heightScale: 0.94,
    widthScale: 0.98,
    headScale: 1.0
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
        timeOfDayEvent: 'Lobby Lights Dimming & Parlor Social Hour (Wall sconces flickering)',
        dailyActionAtTime: 'Listening to the cassette tape player and watching who enters the service stairwell.',
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
        eventTitle: 'Lobby Lights Dimming & Parlor Social Hour',
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

  // ============================================================================
  // 1978 DETECTIVE NOTEBOOK & DICTAPHONE MEMOS STATE (Case Folio & Corkboard)
  // ============================================================================
  const [notebookMemos, setNotebookMemos] = useState<NotebookMemoEntry[]>(() => {
    try {
      const saved = localStorage.getItem('architectforge_notebook_memos_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return [
      createNotebookMemo({
        title: 'Case Folio Opened — St. Jude Hotel',
        content:
          'Late autumn, 1978. Room 202 brickwork vibrating at dusk. Mrs. Eleanor Vance in 204 heard footsteps in the service dumbwaiter. Speak to the tenants directly — keep audio cassette records of all statements.',
        category: 'clue',
        tapeRecorded: true,
        audioDurationSec: 14,
        roomLocation: 'Lobby & Suite 202',
        tags: ['Passkey Code', 'Secret Passage', 'To Investigate']
      })
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('architectforge_notebook_memos_v1', JSON.stringify(notebookMemos));
    } catch {
      // ignore storage error
    }
  }, [notebookMemos]);

  const [activeSpeakingAgentId, setActiveSpeakingAgentId] = useState<string | null>(null);

  // ============================================================================
  // 100% LOCAL COMPUTER WORKSPACE & DEDICATED ASSET FOLDERS MANAGER
  // ============================================================================
  const [localFoldersStatus, setLocalFoldersStatus] = useState<LocalDiskFolderStatus[]>([]);
  const [localRootDiskPath, setLocalRootDiskPath] = useState<string>(
    `./${LOCAL_WORKSPACE_ROOT_NAME}`
  );
  const [autoSaveToFolders, setAutoSaveToFolders] = useState<boolean>(true);
  const [nativeDirName, setNativeDirName] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeDirHandleRef = useRef<any>(null);
  const [lastSavedFolderBanner, setLastSavedFolderBanner] = useState<string | null>(null);

  const refreshLocalDiskFoldersStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/local-fs/status');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.folders)) {
          setLocalFoldersStatus(data.folders);
        }
        if (data.rootDiskPath) {
          setLocalRootDiskPath(data.rootDiskPath);
        }
      }
    } catch {
      // When running offline in standalone HTML mode, synthesize status from localStorage mirror
    }
  }, []);

  useEffect(() => {
    refreshLocalDiskFoldersStatus();
  }, [refreshLocalDiskFoldersStatus]);

  const saveItemToDedicatedFolder = useCallback(
    async (
      category: LocalFolderCategory,
      itemName: string,
      payload: unknown,
      uniqueId = String(Date.now()).slice(-6),
      forceEvenIfAutoOff = false
    ) => {
      if (!autoSaveToFolders && !forceEvenIfAutoOff) return;
      const spec = getLocalFolderSpec(category);
      const filename = buildLocalFolderItemFilename(category, itemName, uniqueId);

      // 1. Write to Native Computer Folder Handle if user mounted one via File System Access API
      if (nativeDirHandleRef.current) {
        try {
          const segments = spec.relativePath.split('/').filter(Boolean);
          let currentDir = nativeDirHandleRef.current;
          for (const seg of segments) {
            currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
          }
          const fileHandle = await currentDir.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(
            JSON.stringify(
              {
                schemaVersion: '2.0.0',
                savedAt: new Date().toISOString(),
                category,
                folderPath: `${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}`,
                itemName,
                data: payload
              },
              null,
              2
            )
          );
          await writable.close();
        } catch {
          // ignore native write error if permission revoked
        }
      }

      // 2. Write to Server-Side Local Computer Workspace (./ArchitectForge_Workspace/<relativePath>/)
      try {
        const res = await fetch('/api/local-fs/save-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            itemName,
            uniqueId,
            payload
          })
        });
        if (res.ok) {
          const savedData = await res.json();
          setLastSavedFolderBanner(
            `${savedData.relativePath} (${(savedData.sizeBytes / 1024).toFixed(1)} KB)`
          );
          refreshLocalDiskFoldersStatus();
          return;
        }
      } catch {
        // Fallback when running offline
      }

      setLastSavedFolderBanner(
        `./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/${filename}`
      );
    },
    [autoSaveToFolders, refreshLocalDiskFoldersStatus]
  );

  const handleMountNativeComputerFolder = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
        const workspaceRootHandle = await dirHandle.getDirectoryHandle(
          LOCAL_WORKSPACE_ROOT_NAME,
          { create: true }
        );
        for (const folder of LOCAL_WORKSPACE_FOLDERS) {
          const segments = folder.relativePath.split('/').filter(Boolean);
          let sub = workspaceRootHandle;
          for (const seg of segments) {
            sub = await sub.getDirectoryHandle(seg, { create: true });
          }
        }
        nativeDirHandleRef.current = workspaceRootHandle;
        setNativeDirName(`${dirHandle.name}/${LOCAL_WORKSPACE_ROOT_NAME}`);
        setStatusBanner(
          `📂 Mounted Computer Folder "${dirHandle.name}/${LOCAL_WORKSPACE_ROOT_NAME}" and created all 9 dedicated subfolders on disk!`
        );
        return;
      } catch {
        // User cancelled picker or iframe blocked showDirectoryPicker
      }
    }
    setStatusBanner(
      `Local Computer Workspace active at "${localRootDiskPath}" — Use "⬇ Windows (.bat)" or "⬇ Mac/Linux (.sh)" when running standalone!`
    );
  }, [localRootDiskPath]);

  const handleChangeGameTimeMinutes = useCallback(
    (nextMinutes: number, eventNote?: string, triggerRandomAnomalies = false) => {
      const normalized = ((Math.round(nextMinutes) % 1440) + 1440) % 1440;
      const info = getTimeOfDayInfo(normalized);
      setGameTimeMinutes(normalized);
      setAgents((prevAgents) => {
        const scheduled = computeScheduledAgentsForTime(
          prevAgents,
          normalized,
          triggerRandomAnomalies,
          Date.now()
        );
        return scheduled;
      });
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
      saveItemToDedicatedFolder('time_events', `${info.phase}_${info.formattedTime}`, newEvent);
      setStatusBanner(
        `🕒 ${info.formattedTime} (${info.phase}) — Tenants relocated for ${info.phase} schedule${
          triggerRandomAnomalies ? ' (with 🎲 Random AI Anomaly!)' : ''
        }!`
      );
    },
    [saveItemToDedicatedFolder]
  );

  const handleUpdateAgentSchedule = useCallback(
    (agentId: string, nextSchedule: DailyActionEntry[]) => {
      setAgents((prevAgents) => {
        const withUpdatedSchedule = prevAgents.map((ag) =>
          ag.id === agentId ? { ...ag, dailySchedule: nextSchedule } : ag
        );
        return computeScheduledAgentsForTime(withUpdatedSchedule, gameTimeMinutes, false);
      });
    },
    [gameTimeMinutes]
  );

  const handleRecordInteraction = useCallback(
    (entry: SavedInteractionEntry) => {
      setSavedInteractions((prev) => [...prev, entry]);
      if (entry.resultingDisposition || typeof entry.resultingTrust === 'number') {
        setAgents((prev) =>
          prev.map((ag) =>
            ag.name.toLowerCase() === entry.characterName.toLowerCase()
              ? {
                  ...ag,
                  trustLevel: entry.resultingTrust ?? ag.trustLevel,
                  suspicionLevel: entry.resultingSuspicion ?? ag.suspicionLevel,
                  disposition: entry.resultingDisposition ?? ag.disposition,
                  lastInteractionDay: entry.gameDay ?? ag.lastInteractionDay,
                  interactionHistory: [...(ag.interactionHistory || []), entry]
                }
              : ag
          )
        );
      }
      saveItemToDedicatedFolder(
        'interactions',
        `${entry.characterName}_${entry.phase}`,
        entry,
        entry.id
      );
      setStatusBanner(
        entry.gameplayInfluenceSummary
          ? `🧠 Memory Saved for "${entry.characterName}": ${entry.gameplayInfluenceSummary}`
          : `Saved Dialogue & Daily Action History for "${entry.characterName}" to ./ArchitectForge_Workspace/gameplay_logs/interactions/!`
      );
    },
    [saveItemToDedicatedFolder]
  );

  // Live Speech-to-Text & AI Interrogation in Walkthrough Mode (Hold [V])
  const handleWalkthroughSpeakToAgent = useCallback(
    async (agent: HotelAgentProfile, text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;
      setStatusBanner(`🎙️ Spoke to ${agent.name}: "${cleanText}" — consulting character memory...`);
      const memEval = evaluateCharacterInteractionMemory(
        agent,
        cleanText,
        gameTimeMinutes,
        1
      );

      let reply = `*${agent.name} pauses, considering your words.* "The walls in ${agent.roomNumber || 'this hotel'} hold many secrets."`;
      try {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: memEval.updatedAgent,
            message: cleanText,
            globalInstructionSet,
            gameTimeMinutes,
            gameDay: 1,
            history: savedInteractions.slice(-4).flatMap((h) => [
              { role: 'user' as const, text: h.userMessage },
              { role: 'model' as const, text: h.agentReply }
            ])
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reply) reply = data.reply;
        }
      } catch {
        // offline fallback
        if (memEval.triggeredDislikes.length > 0) {
          reply = `*${agent.name} stiffens defensively.* "I have no patience for ${memEval.triggeredDislikes[0]}, Detective."`;
        } else if (memEval.answeredQuestion) {
          reply = `*${agent.name} breathes a quiet sigh of relief.* "Thank goodness you answered. Here is what I discovered: ${agent.secretTruth || 'The passage behind 202 is real.'}"`;
        }
      }

      // Update agent state in scene
      setAgents((prev) =>
        prev.map((ag) => (ag.id === agent.id ? memEval.updatedAgent : ag))
      );

      // Record interaction entry
      const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
      const intEntry: SavedInteractionEntry = {
        id: `int_${Date.now()}`,
        timestamp: new Date().toISOString(),
        gameTimeFormatted: timeInfo.formattedTime,
        phase: timeInfo.phase,
        timeOfDayEvent: timeInfo.activeWorldEvent,
        dailyActionAtTime: `${agent.occupation || 'Resident'} at ${timeInfo.formattedTime}`,
        characterName: agent.name,
        userMessage: cleanText,
        agentReply: reply,
        gameDay: 1,
        trustDelta: memEval.trustDelta,
        suspicionDelta: memEval.suspicionDelta,
        resultingTrust: memEval.resultingTrust,
        resultingSuspicion: memEval.resultingSuspicion,
        resultingDisposition: memEval.resultingDisposition,
        triggeredLikes: memEval.triggeredLikes,
        triggeredDislikes: memEval.triggeredDislikes,
        gameplayInfluenceSummary: memEval.gameplayInfluenceSummary,
        unlockedClueId: memEval.unlockedClueId
      };
      handleRecordInteraction(intEntry);

      // Auto-create Notebook Memo
      const newMemo = createNotebookMemo({
        title: `Interrogation: ${agent.name} (${agent.roomNumber || 'Hotel'})`,
        content: `Investigator: "${cleanText}"\n${agent.name}: "${reply}"`,
        category: 'transcript',
        agentId: agent.id,
        agentName: agent.name,
        roomLocation: agent.roomNumber || currentRoomLabel || 'Corridor',
        tags: ['🎙️ Dictaphone Memo', agent.name, memEval.resultingDisposition],
        tapeRecorded: true,
        audioDurationSec: Math.max(4, Math.round(reply.length / 14))
      });
      setNotebookMemos((prev) => [newMemo, ...prev]);

      // Speak aloud with Web Speech API and animate 3D mouth articulation
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const cleanSpeech = reply.replace(/\*[^*]+\*/g, '').trim();
          if (cleanSpeech) {
            const utterance = new SpeechSynthesisUtterance(cleanSpeech);
            utterance.rate = 0.95;
            utterance.pitch = agent.appearance?.archetype === 'Elderly Matron' ? 1.15 : 0.9;
            setActiveSpeakingAgentId(agent.id);
            utterance.onend = () => setActiveSpeakingAgentId(null);
            utterance.onerror = () => setActiveSpeakingAgentId(null);
            window.speechSynthesis.speak(utterance);
          }
        } catch {
          setActiveSpeakingAgentId(null);
        }
      }

      setStatusBanner(
        `🗣️ ${agent.name} replied (${memEval.resultingDisposition.toUpperCase()}) — Saved to 1978 Investigator Notebook [J]!`
      );
    },
    [gameTimeMinutes, globalInstructionSet, savedInteractions, handleRecordInteraction, currentRoomLabel]
  );

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
        if (isActionKeyPressed('clear_selection', e.code, keybindings)) {
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

      if (isActionKeyPressed('quick_edit', e.code, keybindings) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const qeLabel = getPrimaryActionKeyLabel('quick_edit', keybindings);
        if (selectedAssetId) {
          soundFX.playPlaceAsset();
          setQuickEditWindowOpen((prev) => {
            const nextOpen = !prev;
            const found = assets.find((a) => a.id === selectedAssetId);
            setStatusBanner(
              nextOpen
                ? `Opened Quick Edit Window [${qeLabel}] to the right of "${found ? found.name : 'Asset'}" — Resize or alter color!`
                : `Closed Quick Edit Window [${qeLabel}].`
            );
            return nextOpen;
          });
        } else {
          setStatusBanner(
            `Select an asset first (Click or Shift+Click), then press [${qeLabel}] to open the Quick Edit Window.`
          );
        }
        return;
      }

      if (isActionKeyPressed('rotate_asset', e.code, keybindings) && !e.ctrlKey && !e.metaKey) {
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
          const rotLabel = getPrimaryActionKeyLabel('rotate_asset', keybindings);
          setStatusBanner(
            `Rotated ${targetIds.length} ${
              targetIds.length === 1 ? 'object' : 'selected objects'
            } by 90° [${rotLabel}].`
          );
          return;
        }
      }

      if (isActionKeyPressed('delete_asset', e.code, keybindings)) {
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
          const delLabel = getPrimaryActionKeyLabel('delete_asset', keybindings);
          setStatusBanner(
            `Deleted ${targetIds.length} ${
              targetIds.length === 1 ? 'object' : 'selected objects'
            } [${delLabel}] — Press Ctrl+Z to undo.`
          );
          return;
        }
      }

      if (isActionKeyPressed('clear_selection', e.code, keybindings)) {
        e.preventDefault();
        handleClearMouse();
      } else if (
        isActionKeyPressed('wall_tool', e.code, keybindings) &&
        !e.ctrlKey &&
        !e.metaKey &&
        mode === 'architect'
      ) {
        e.preventDefault();
        soundFX.playPlaceAsset();
        const wallBp = catalogAssets.find((b) => b.category === 'wall') || catalogAssets[0];
        setActiveBlueprint(wallBp);
        setSelectedAssetId(null);
        setSelectedAssetIds([]);
        setQuickEditWindowOpen(false);
        const wallLabel = getPrimaryActionKeyLabel('wall_tool', keybindings);
        setStatusBanner(
          `🧱 Wall Tool active [${wallLabel}] ("${wallBp.name}") — Click & Drag across the grid to place a seamless row of walls!`
        );
        return;
      } else if (
        isActionKeyPressed('toggle_notebook', e.code, keybindings) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        soundFX.playPlaceAsset();
        const notebookBp = catalogAssets.find(
          (b) => b.subType === 'investigator_notebook_prop'
        );
        if (notebookBp) {
          setActiveBlueprint(notebookBp);
          setStatusBanner(
            `📓 Selected "${notebookBp.name}" Asset Creation Template — Place 3D model on canvas or use Image / 3D / Sound studio tools.`
          );
        }
      } else if (
        isActionKeyPressed('toggle_keybindings', e.code, keybindings) &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault();
        soundFX.playPlaceAsset();
        setStudioWindows((prev) => toggleStudioWindowOpen(prev, 'keybindings'));
      } else if (isActionKeyPressed('reset_windows', e.code, keybindings)) {
        handleResetWindowLayout();
      } else if (isActionKeyPressed('toggle_mute', e.code, keybindings)) {
        setIsMuted((m) => {
          soundFX.muted = !m;
          return !m;
        });
      } else if (isActionKeyPressed('mode_build', e.code, keybindings)) {
        setMode('architect');
      } else if (isActionKeyPressed('mode_character', e.code, keybindings)) {
        setMode('character');
      } else if (isActionKeyPressed('mode_walkthrough', e.code, keybindings)) {
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
    assets,
    mode,
    catalogAssets,
    keybindings
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
        compositeParts: activeBlueprint.compositeParts,
        tags: activeBlueprint.tags ? [...activeBlueprint.tags] : undefined,
        soundPresetId: activeBlueprint.soundPresetId
      };
      setAssets((prev) => [...prev, newAsset]);
      setSelectedAssetId(newAsset.id);
      setSelectedAssetIds([newAsset.id]);
      setActiveBlueprint(null);
      saveItemToDedicatedFolder('environment_3d', newAsset.name, newAsset, newAsset.id);
      setStatusBanner(
        `Placed "${newAsset.name}" at (${x}m, ${z}m) — Press [F] to Quick-Edit (resize/color) or [E] to interact.`
      );
    },
    [activeBlueprint, currentFloor, currentRoomLabel, recordUndoSnapshot, saveItemToDedicatedFolder]
  );

  // Place a row of wall segments along grid (drag-placement in one unified operation)
  const handlePlaceBlueprintRow = useCallback(
    (segments: WallRowPlacement[], blueprintOverride?: AssetBlueprint) => {
      const bp = blueprintOverride || activeBlueprint;
      if (!bp || segments.length === 0) return;

      const actionLabel =
        segments.length === 1
          ? `Add "${bp.name}"`
          : `Add row of ${segments.length} walls`;
      recordUndoSnapshot(actionLabel);

      const [w, h, d] = bp.defaultDimensions;
      const baseTimestamp = Date.now();
      const newAssets: PlacedAsset[] = segments.map((seg, idx) => ({
        id: `custom_${bp.subType}_${baseTimestamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: segments.length === 1 ? bp.name : `${bp.name} ${idx + 1}`,
        category: bp.category,
        subType: bp.subType,
        floor: currentFloor,
        roomNumber: currentRoomLabel,
        position: [seg.x, h / 2, seg.z],
        dimensions: [w, h, d],
        rotationY: seg.rotationY,
        color: bp.defaultColor,
        textureId: bp.defaultTexture,
        isSecretPassage: bp.isSecretPassage,
        isOpen: false,
        collidable: bp.collidable,
        compositeParts: bp.compositeParts,
        tags: bp.tags ? [...bp.tags] : undefined,
        soundPresetId: bp.soundPresetId
      }));

      setAssets((prev) => [...prev, ...newAssets]);
      const newIds = newAssets.map((a) => a.id);
      setSelectedAssetIds(newIds);
      setSelectedAssetId(newIds[newIds.length - 1] || null);
      setActiveBlueprint(null);

      // Auto-save placed walls to dedicated workspace folder
      newAssets.forEach((placedWall) => {
        saveItemToDedicatedFolder('environment_3d', placedWall.name, placedWall, placedWall.id);
      });

      const totalSpan = (segments.length * w).toFixed(1);
      const axisName = segments[0].rotationY === 0 ? 'X' : 'Z';
      setStatusBanner(
        segments.length === 1
          ? `Placed "${bp.name}" at (${segments[0].x.toFixed(1)}m, ${segments[0].z.toFixed(1)}m).`
          : `🧱 Placed row of ${segments.length} connected walls (${totalSpan}m span) along ${axisName} axis!`
      );
    },
    [activeBlueprint, currentFloor, currentRoomLabel, recordUndoSnapshot, saveItemToDedicatedFolder]
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

  // Batch resize, recolor, rotate, or change hinge swing mode on selected asset(s) from the [F] Quick Edit Window
  const handleBatchModifySelected = useCallback(
    (patch: {
      color?: string;
      textureId?: TexturePresetId;
      scaleMultiplier?: number;
      dimensions?: [number, number, number];
      rotationDeltaY?: number;
      hingeSwingMode?: HingeSwingMode;
      isSecretPassage?: boolean;
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
        patch.hingeSwingMode
          ? `Set 500ms Hinge Swing Mode to "${patch.hingeSwingMode}" via Quick Edit [F] — Press [E] to test!`
          : `Updated ${targetIds.length} ${
              targetIds.length === 1 ? 'asset' : 'selected assets'
            } via Quick Edit [F] — Use Undo (Ctrl+Z) to revert.`
      );
    },
    [selectedAssetIds, selectedAssetId, recordUndoSnapshot]
  );

  // Toggle hinged door / secret wall swing preview with smooth 500ms hinge transition + synchronized Foley (Proposals 1 & 2)
  const hingeTimersRef = useRef<Map<string, number>>(new Map());

  const handleToggleAssetOpen = useCallback(
    (asset: PlacedAsset) => {
      const nowMs = Date.now();
      const nextOpen = !asset.isOpen;
      const swingMode: HingeSwingMode = asset.hingeSwingMode || 'right_hinge';
      const isSecret = Boolean(asset.isSecretPassage || asset.category === 'secret_wall');

      recordUndoSnapshot(`${asset.isOpen ? 'Close' : 'Open'} "${asset.name}"`);
      const foleySpec = soundFX.playSecretPassageOpen({
        swingMode,
        isOpening: nextOpen,
        isSecretPassage: isSecret,
        durationMs: HINGE_TRANSITION_DURATION_MS
      });

      const existingTimer = hingeTimersRef.current.get(asset.id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id
            ? initiateAssetHingeToggle(a, nowMs, HINGE_TRANSITION_DURATION_MS)
            : a
        )
      );
      setSelectedAssetId(asset.id);
      setSelectedAssetIds((prev) => (prev.includes(asset.id) ? prev : [asset.id]));
      setStatusBanner(
        `${nextOpen ? 'Opening' : 'Closing'} "${asset.name}" [E] over ${HINGE_TRANSITION_DURATION_MS}ms (${swingMode} · ${foleySpec.descriptionLabel})...`
      );

      const timerId = window.setTimeout(() => {
        hingeTimersRef.current.delete(asset.id);
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? {
                  ...a,
                  isOpen: nextOpen,
                  openProgress: nextOpen ? 1 : 0,
                  hingeTransitionStartMs: undefined,
                  hingeTransitionFrom: undefined,
                  hingeTransitionTo: undefined
                }
              : a
          )
        );
        setStatusBanner(
          `${nextOpen ? 'Opened' : 'Closed'} "${asset.name}" [E] (${HINGE_TRANSITION_DURATION_MS}ms ${swingMode} complete + 480ms latch click).`
        );
      }, HINGE_TRANSITION_DURATION_MS);

      hingeTimersRef.current.set(asset.id, timerId);
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
      saveItemToDedicatedFolder('environment_3d', copy.name, copy, copy.id);
      setStatusBanner(
        `Duplicated "${asset.name}" and saved newly added asset to ./ArchitectForge_Workspace/assets/environment_3d/!`
      );
    },
    [recordUndoSnapshot, saveItemToDedicatedFolder]
  );

  // Save any modified or generated asset directly into the Asset List catalog AND dedicated catalog_blueprints folder
  const handleSaveAssetToCatalog = useCallback(
    (asset: PlacedAsset) => {
      soundFX.playPlaceAsset();
      const bp = createBlueprintFromAsset(asset);
      setCatalogAssets((prev) => [bp, ...prev]);
      saveItemToDedicatedFolder('catalog_blueprints', bp.name, bp, bp.subType);
      setStatusBanner(
        `Added "${asset.name}" to Visual Catalog & saved to ./ArchitectForge_Workspace/assets/catalog_blueprints/!`
      );
    },
    [saveItemToDedicatedFolder]
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
    (name: string, description: string, useSelectionOnly: boolean, customTags?: string[]) => {
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
      const mergedTags = Array.from(
        new Set([
          String(currentFloor),
          useSelectionOnly ? 'selection' : 'full_room',
          ...(customTags || [])
        ])
      );
      const newBp = createRoomBlueprintFromAssets(name, description, sourceAssets, mergedTags);
      setRoomBlueprints((prev) => [newBp, ...prev]);
      saveItemToDedicatedFolder('blueprints', newBp.name, newBp, newBp.id);
      saveItemToDedicatedFolder('room_blueprints', newBp.name, newBp, newBp.id);
      setStatusBanner(
        `Saved Room Blueprint "${newBp.name}" (${newBp.items.length} objects, tags: ${newBp.tags.map((t) => `#${t}`).join(' ')}) to ./ArchitectForge_Workspace/blueprints/!`
      );
    },
    [assets, selectedAssetIds, selectedAssetId, currentFloor, saveItemToDedicatedFolder]
  );

  const handleUpdateRoomBlueprint = useCallback(
    (updated: RoomBlueprint) => {
      setRoomBlueprints((prev) => prev.map((bp) => (bp.id === updated.id ? updated : bp)));
      saveItemToDedicatedFolder('blueprints', updated.name, updated, updated.id);
      setStatusBanner(
        `Updated Room Blueprint tags on "${updated.name}" (${(updated.tags || []).map((t) => `#${t}`).join(' ')}).`
      );
    },
    [saveItemToDedicatedFolder]
  );

  const handleUpdateCatalogBlueprint = useCallback(
    (updated: AssetBlueprint) => {
      setCatalogAssets((prev) =>
        prev.map((bp) => (bp.subType === updated.subType ? updated : bp))
      );
      saveItemToDedicatedFolder('catalog_blueprints', updated.name, updated, updated.subType);
      setStatusBanner(
        `Updated Blueprint tags on "${updated.name}" (${(updated.tags || []).map((t) => `#${t}`).join(' ')}).`
      );
    },
    [saveItemToDedicatedFolder]
  );

  const handleAssignSoundToAsset = useCallback(
    (assetId: string, soundPresetId: string, soundName: string) => {
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id !== assetId) return a;
          const updated = assignSoundToAssetOrBlueprint(a, soundPresetId);
          saveItemToDedicatedFolder('environment_3d', updated.name, updated, updated.id);
          return updated;
        })
      );
      setStatusBanner(
        `🔊 Assigned sound "${soundName}" (${soundPresetId}) to 3D asset!`
      );
    },
    [saveItemToDedicatedFolder]
  );

  const handleAssignSoundToBlueprint = useCallback(
    (subType: string, soundPresetId: string, soundName: string) => {
      setCatalogAssets((prev) =>
        prev.map((bp) => {
          if (bp.subType !== subType) return bp;
          const updated = assignSoundToAssetOrBlueprint(bp, soundPresetId);
          saveItemToDedicatedFolder('catalog_blueprints', updated.name, updated, updated.subType);
          return updated;
        })
      );
      setActiveBlueprint((prev) =>
        prev && prev.subType === subType
          ? assignSoundToAssetOrBlueprint(prev, soundPresetId)
          : prev
      );
      setStatusBanner(
        `🔊 Assigned sound "${soundName}" (${soundPresetId}) to Catalog Blueprint!`
      );
    },
    [saveItemToDedicatedFolder]
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
  const [projectName, setProjectName] = useState<string>('Grand Boutique Hotel & Parlor Project');
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
      id: 'proj_starter_hotel',
      name: 'Grand Boutique Hotel & Parlor Suite',
      description:
        'Pre-built multi-floor vintage residential hotel with lobby counter, secret bookcase wall, and resident AI character rigs.',
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
      setAssets(weatherAssetsListToLate70sStyle(project.assets || []));
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
    saveItemToDedicatedFolder('projects', snap.name, snap, snap.id);
    setStatusBanner(
      `💾 Saved Entire Project "${snap.name}" to Project Slots & ./ArchitectForge_Workspace/projects/!`
    );
  }, [buildCurrentProjectSnapshot, saveItemToDedicatedFolder]);

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
      saveItemToDedicatedFolder('projects', snap.name, snap, snap.id);
      setStatusBanner(
        `💾 Updated Project Slot "${snap.name}" & synced to ./ArchitectForge_Workspace/projects/!`
      );
    },
    [savedProjects, projectName, projectDescription, buildCurrentProjectSnapshot, saveItemToDedicatedFolder]
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

  // ============================================================================
  // FIREBASE AUTHENTICATION & FIRESTORE CLOUD PROJECT SYNC
  // ============================================================================
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState<boolean>(false);
  const [cloudProjects, setCloudProjects] = useState<CloudSyncedProjectRecord[]>([]);
  const [cloudSyncBusy, setCloudSyncBusy] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
      if (!user) {
        setCloudProjects([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseAuthReady || !firebaseUser) return;
    const unsubscribeCloud = subscribeToUserCloudProjects(
      firebaseUser.uid,
      (records) => {
        setCloudProjects(records);
      },
      (errMessage) => {
        console.warn('Firestore subscription notice:', errMessage);
      }
    );
    return () => unsubscribeCloud();
  }, [firebaseAuthReady, firebaseUser]);

  const handleSignInFirebase = useCallback(async () => {
    try {
      const signedInUser = await signInWithGooglePopup();
      setFirebaseUser(signedInUser);
      await syncUserProfileToCloud(signedInUser, activeProjectId || 'proj_starter_hotel');
      setStatusBanner(
        `☁️ Signed in to Firebase Cloud as ${signedInUser.displayName || signedInUser.email}!`
      );
    } catch (err) {
      setStatusBanner(
        `Firebase Google Sign-In notice: ${err instanceof Error ? err.message : 'Popup closed'}`
      );
    }
  }, [activeProjectId]);

  const handleSignOutFirebase = useCallback(async () => {
    try {
      await signOutFromFirebase();
      setFirebaseUser(null);
      setCloudProjects([]);
      setStatusBanner('Signed out from Firebase Cloud.');
    } catch {
      // ignore sign-out error
    }
  }, []);

  const handleSyncCurrentProjectToCloud = useCallback(async () => {
    if (!firebaseUser) {
      handleToggleOpenWindow('projects', true);
      handleFocusWindow('projects');
      setStatusBanner('Sign in with Google inside the Projects window to sync with Firebase Cloud.');
      return;
    }
    setCloudSyncBusy(true);
    try {
      const snap = buildCurrentProjectSnapshot(activeProjectId || undefined);
      const cloudId = await saveProjectToCloudFirestore(firebaseUser, snap);
      await syncUserProfileToCloud(firebaseUser, cloudId);
      setActiveProjectId(cloudId);
      setStatusBanner(
        `☁️ Synced Project "${snap.name}" (${snap.floorLayers.length} floors, ${snap.assets.length} objects) to Firebase Firestore!`
      );
    } catch (err) {
      setStatusBanner(
        `Cloud sync error: ${err instanceof Error ? err.message.slice(0, 120) : 'Check permissions'}`
      );
    } finally {
      setCloudSyncBusy(false);
    }
  }, [
    firebaseUser,
    activeProjectId,
    buildCurrentProjectSnapshot,
    handleToggleOpenWindow,
    handleFocusWindow
  ]);

  const handleLoadCloudProject = useCallback(
    (record: CloudSyncedProjectRecord) => {
      applyProjectSnapshotToWorkspace(record.snapshot, `Firebase Cloud (${record.name})`);
    },
    [applyProjectSnapshotToWorkspace]
  );

  const handleDeleteCloudProject = useCallback(async (projectId: string) => {
    try {
      await deleteProjectFromCloudFirestore(projectId);
      setStatusBanner('Removed project from Firebase Cloud Firestore.');
    } catch (err) {
      setStatusBanner(
        `Could not delete cloud project: ${err instanceof Error ? err.message.slice(0, 100) : ''}`
      );
    }
  }, []);

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

  // Download a 100% self-contained single-file Standalone HTML version of the app (with current project preloaded)
  const [standaloneBusy, setStandaloneBusy] = useState<boolean>(false);
  const handleDownloadStandaloneHtmlApp = useCallback(async () => {
    setStandaloneBusy(true);
    setStatusBanner(
      'Packaging Standalone Single-File App ("ArchitectForge_Standalone.html") with your current project embedded...'
    );
    const snap = buildCurrentProjectSnapshot();
    try {
      const res = await fetch('/api/export/standalone-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSnapshot: snap })
      });
      if (!res.ok) throw new Error('Standalone endpoint unavailable');
      const data = await res.json();
      const htmlString: string = data.html;
      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'ArchitectForge_Standalone.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusBanner(
        `Downloaded Standalone App "ArchitectForge_Standalone.html" (${Math.round(
          (data.sizeBytes || htmlString.length) / 1024
        )} KB) — Double-click to run offline in any browser!`
      );
    } catch {
      // Fallback when already running offline inside a standalone HTML file
      const fullDoc = `<!doctype html>\n${document.documentElement.outerHTML}`;
      const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ArchitectForge_Standalone.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusBanner('Downloaded offline Standalone HTML copy ("ArchitectForge_Standalone.html")!');
    } finally {
      setStandaloneBusy(false);
    }
  }, [buildCurrentProjectSnapshot]);

  // If running from a downloaded Standalone HTML file with an embedded project snapshot, load it on boot
  useEffect(() => {
    const win = window as unknown as { __STANDALONE_INITIAL_PROJECT__?: unknown };
    if (win.__STANDALONE_INITIAL_PROJECT__) {
      const validation = validateAndParseProjectSnapshot(win.__STANDALONE_INITIAL_PROJECT__);
      if (validation.valid && validation.project) {
        applyProjectSnapshotToWorkspace(validation.project, 'Embedded Standalone HTML Bundle');
      }
      delete win.__STANDALONE_INITIAL_PROJECT__;
    }
  }, [applyProjectSnapshotToWorkspace]);

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
        color: '#5e4c2e',
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
      saveItemToDedicatedFolder('environment_3d', newAsset.name, newAsset, newAsset.id);
      saveItemToDedicatedFolder(
        'catalog_blueprints',
        generatedBlueprint.name,
        generatedBlueprint,
        generatedBlueprint.subType
      );
      setStatusBanner(
        `Forged "${newAsset.name}" — Placed on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        } & auto-saved to ./ArchitectForge_Workspace/assets/environment_3d/!`
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
        color: '#5e4c2e',
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
      saveItemToDedicatedFolder('environment_3d', newAsset.name, newAsset, newAsset.id);
      saveItemToDedicatedFolder(
        'catalog_blueprints',
        generatedBlueprint.name,
        generatedBlueprint,
        generatedBlueprint.subType
      );
      setStatusBanner(
        `Forged "${newAsset.name}" — Placed on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        } & auto-saved to ./ArchitectForge_Workspace/assets/environment_3d/!`
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
      const finalTexUrl = data.imageUrl || generateSeamlessSvgTextureDataUrl(promptText);
      setCustomGeneratedTexUrl(finalTexUrl);
      saveItemToDedicatedFolder('textures', promptText, {
        prompt: promptText,
        imageUrl: finalTexUrl,
        synthesizedAt: new Date().toISOString()
      });
      setStatusBanner(
        `Synthesized surface texture "${promptText}" & saved to ./ArchitectForge_Workspace/assets/textures/!`
      );
    } catch {
      const fallbackSvg = generateSeamlessSvgTextureDataUrl(promptText);
      setCustomGeneratedTexUrl(fallbackSvg);
      saveItemToDedicatedFolder('textures', promptText, {
        prompt: promptText,
        imageUrl: fallbackSvg,
        synthesizedAt: new Date().toISOString()
      });
      setStatusBanner(
        `Synthesized seamless offline surface texture "${promptText}" & saved to ./ArchitectForge_Workspace/assets/textures/!`
      );
    } finally {
      setAiForgeBusy(false);
    }
  };

  // Deliverable 3: Batch Asset Image Descriptions Import -> gemini-3.1-flash-lite-image -> Meshy.ai 3D -> Game Catalog
  const [batchImportBusy, setBatchImportBusy] = useState<boolean>(false);
  const [lastBatchImportSummary, setLastBatchImportSummary] = useState<
    BatchImportedAssetSummary[]
  >([]);

  const handleSaveDescriptionFile = useCallback(
    async (filename: string, content: string) => {
      const cleanName = filename.trim() || 'late70s_hotel_asset_descriptions.descriptions.txt';
      try {
        const res = await fetch('/api/local-fs/save-description-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: cleanName,
            content
          })
        });
        if (res.ok) {
          const saved = await res.json();
          setLastSavedFolderBanner(
            `${saved.relativePath} (${(saved.sizeBytes / 1024).toFixed(1)} KB)`
          );
          await refreshLocalDiskFoldersStatus();
          setStatusBanner(
            `Saved asset description file "${saved.filename}" into ./ArchitectForge_Workspace/assets/image_descriptions_import/!`
          );
          return;
        }
      } catch {
        // Offline fallback
      }
      await saveItemToDedicatedFolder('asset_descriptions', cleanName, content, 'queue', true);
      setStatusBanner(
        `Saved asset description file "${cleanName}" into ./ArchitectForge_Workspace/assets/image_descriptions_import/!`
      );
    },
    [refreshLocalDiskFoldersStatus, saveItemToDedicatedFolder]
  );

  const handleRunBatchDescriptionImport = useCallback(
    async (filename: string, rawContent?: string) => {
      setBatchImportBusy(true);
      setStatusBanner(
        `⚡ Pipeline Running: Reading "${filename}" → Generating reference images (${AI_MODEL_REGISTRY.description_to_image.modelId}) → Meshy.ai Image-to-3D → Importing to Game Catalog...`
      );
      try {
        const res = await fetch('/api/forge/batch-import-descriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            rawContent,
            floor: currentFloor
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            const importedBlueprints: AssetBlueprint[] = data.items.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (it: any) => it.catalogBlueprint as AssetBlueprint
            );
            const importedAssets: PlacedAsset[] = data.items.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (it: any) => it.placedAsset as PlacedAsset
            );
            const summaryItems: BatchImportedAssetSummary[] = data.items.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (it: any) => ({
                name: it.name,
                category: it.category,
                enforcedImagePrompt: it.enforcedImagePrompt,
                referenceImageUrl: it.referenceImageUrl,
                mattedImageDataUrl: it.mattedImageDataUrl || it.referenceImageUrl,
                alphaMatted: Boolean(it.alphaMatted ?? true),
                imageModelUsed: it.imageModelUsed || AI_MODEL_REGISTRY.description_to_image.modelId,
                meshyModelUsed: it.meshyModelUsed || AI_MODEL_REGISTRY.meshy_image_to_3d.modelId
              })
            );

            recordUndoSnapshot(
              `Batch Import ${importedAssets.length} assets from "${filename}"`
            );
            soundFX.playPlaceAsset();
            setCatalogAssets((prev) => [...importedBlueprints, ...prev]);
            setAssets((prev) => [...prev, ...importedAssets]);
            if (importedBlueprints[0]?.referenceImageUrl) {
              setCustomGeneratedTexUrl(importedBlueprints[0].referenceImageUrl);
            }
            setLastBatchImportSummary(summaryItems);
            await refreshLocalDiskFoldersStatus();
            setStatusBanner(
              `✓ Imported ${importedBlueprints.length} assets from "${filename}" (${AI_MODEL_REGISTRY.description_to_image.modelId} → ${AI_MODEL_REGISTRY.meshy_image_to_3d.modelId}) into the Build Mode Catalog!`
            );
            return;
          }
        }
      } catch {
        // Fallback below if offline
      } finally {
        setBatchImportBusy(false);
      }

      // Offline deterministic fallback using the same pipeline functions
      const textToParse = rawContent || DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT;
      const entries = parseAssetDescriptionsFile(textToParse);
      if (entries.length === 0) {
        setStatusBanner(`No valid asset descriptions found in "${filename}".`);
        return;
      }
      const fallbackBlueprints: AssetBlueprint[] = [];
      const fallbackAssets: PlacedAsset[] = [];
      const fallbackSummaries: BatchImportedAssetSummary[] = [];

      entries.slice(0, 8).forEach((entry, idx) => {
        const refImg = generateAssetConceptSvgDataUrl(entry.name, entry.descriptionPrompt);
        const alphaMatte = applyAlphaMatteToConceptImageDataUrl(refImg);
        const spec = buildProcedural3DSpecFromPrompt(`${entry.name} ${entry.descriptionPrompt}`);
        const [w, h, d] = spec.dimensions || [1.1, 1.3, 0.9];
        const placed = weatherAssetToLate70sStyle({
          id: `desc3d_${Date.now()}_${idx}`,
          name: entry.name || spec.name,
          category: entry.categoryHint || spec.category || 'custom_ai',
          subType: `meshy_desc_${idx}_${Date.now().toString(36)}`,
          floor: currentFloor,
          roomNumber: currentRoomLabel,
          position: [-4 + idx * 2.0, h / 2, 0],
          dimensions: [w, h, d],
          rotationY: 0,
          color: '#5e4c2e',
          textureId: 'aged_brass',
          collidable: true,
          compositeParts: spec.parts,
          inspectText: `${entry.descriptionPrompt} [Pipeline: ${AI_MODEL_REGISTRY.description_to_image.modelId} -> Alpha-Matte RGBA(0,0,0,0) -> ${AI_MODEL_REGISTRY.meshy_image_to_3d.modelId}]`
        });
        const bp: AssetBlueprint = {
          ...createBlueprintFromAsset(placed),
          description: `${entry.descriptionPrompt} (Image: ${AI_MODEL_REGISTRY.description_to_image.modelId} → Alpha-Matted → 3D: ${AI_MODEL_REGISTRY.meshy_image_to_3d.modelId})`,
          referenceImageUrl: alphaMatte.mattedImageDataUrl,
          isGenerated: true
        };
        fallbackBlueprints.push(bp);
        fallbackAssets.push(placed);
        fallbackSummaries.push({
          name: bp.name,
          category: bp.category,
          enforcedImagePrompt: entry.enforcedImagePrompt,
          referenceImageUrl: refImg,
          mattedImageDataUrl: alphaMatte.mattedImageDataUrl,
          alphaMatted: alphaMatte.alphaMatted,
          imageModelUsed: AI_MODEL_REGISTRY.description_to_image.modelId,
          meshyModelUsed: AI_MODEL_REGISTRY.meshy_image_to_3d.modelId
        });
      });

      recordUndoSnapshot(`Batch Import ${fallbackAssets.length} assets from "${filename}"`);
      soundFX.playPlaceAsset();
      setCatalogAssets((prev) => [...fallbackBlueprints, ...prev]);
      setAssets((prev) => [...prev, ...fallbackAssets]);
      setLastBatchImportSummary(fallbackSummaries);
      setStatusBanner(
        `✓ Imported ${fallbackBlueprints.length} assets from "${filename}" into the Build Mode Catalog!`
      );
    },
    [currentFloor, currentRoomLabel, recordUndoSnapshot, refreshLocalDiskFoldersStatus]
  );

  // Quick-save or sync handlers for the Dedicated Local Folders window
  const handleQuickSaveCategorySample = useCallback(
    (category: LocalFolderCategory) => {
      soundFX.playPlaceAsset();
      if (category === 'asset_descriptions') {
        handleSaveDescriptionFile(
          'late70s_hotel_asset_descriptions.descriptions.txt',
          DEFAULT_ASSET_DESCRIPTIONS_IMPORT_FILE_CONTENT
        );
        return;
      } else if (category === 'projects') {
        const snap = buildCurrentProjectSnapshot();
        saveItemToDedicatedFolder('projects', snap.name, snap, snap.id, true);
      } else if (category === 'environment_3d') {
        const target =
          assets.find((a) => a.id === selectedAssetId) ||
          assets[assets.length - 1] || {
            id: `asset3d_${Date.now()}`,
            name: 'Custom Brass Chandelier',
            category: 'custom_ai',
            subType: 'meshy_ai_object',
            floor: currentFloor,
            position: [0, 1.2, 0],
            dimensions: [1.2, 1.4, 1.2],
            rotationY: 0,
            color: '#d4af37',
            textureId: 'aged_brass',
            collidable: true,
            compositeParts: buildProcedural3DSpecFromPrompt('Custom Brass Chandelier').parts
          };
        saveItemToDedicatedFolder('environment_3d', target.name, target, target.id, true);
      } else if (category === 'catalog_blueprints') {
        const bp = catalogAssets[0];
        if (bp) {
          saveItemToDedicatedFolder('catalog_blueprints', bp.name, bp, bp.subType, true);
        }
      } else if (category === 'textures') {
        const texUrl =
          customGeneratedTexUrl || generateSeamlessSvgTextureDataUrl('Boutique Brass & Marble Tile');
        saveItemToDedicatedFolder(
          'textures',
          'Boutique Brass & Marble Surface',
          {
            name: 'Boutique Brass & Marble Surface',
            imageUrl: texUrl
          },
          String(Date.now()).slice(-6),
          true
        );
      } else if (category === 'blueprints' || category === 'room_blueprints') {
        const bp = roomBlueprints[0];
        if (bp) {
          saveItemToDedicatedFolder('blueprints', bp.name, bp, bp.id, true);
          saveItemToDedicatedFolder('room_blueprints', bp.name, bp, bp.id, true);
        }
      } else if (category === 'character_rigs') {
        const rig = agents[0] || INITIAL_AGENTS[0];
        if (rig) {
          saveItemToDedicatedFolder('character_rigs', rig.name, rig, rig.id, true);
        }
      } else if (category === 'ai_instructions') {
        saveItemToDedicatedFolder(
          'ai_instructions',
          'Global & Personal Lore Sandbox',
          {
            globalInstructionSet,
            characterCount: agents.length
          },
          String(Date.now()).slice(-6),
          true
        );
      } else if (category === 'interactions') {
        saveItemToDedicatedFolder(
          'interactions',
          'Dialogue & Daily Actions Transcript',
          savedInteractions,
          String(Date.now()).slice(-6),
          true
        );
      } else if (category === 'time_events') {
        saveItemToDedicatedFolder(
          'time_events',
          'Gameplay Clock & World Events Log',
          timeOfDayEvents,
          String(Date.now()).slice(-6),
          true
        );
      } else if (category === 'audio_sfx') {
        const sampleSfx = BUILTIN_SOUND_EFFECTS.brass_bell;
        saveItemToDedicatedFolder(
          'audio_sfx',
          sampleSfx.name,
          {
            schemaVersion: '2.0.0',
            savedAt: new Date().toISOString(),
            category: 'audio_sfx',
            spec: sampleSfx
          },
          sampleSfx.type,
          true
        );
      } else if (category === 'audio_music') {
        const sampleBgm = BUILTIN_BGM_TRACKS[0];
        saveItemToDedicatedFolder(
          'audio_music',
          sampleBgm.title,
          {
            schemaVersion: '2.0.0',
            savedAt: new Date().toISOString(),
            category: 'audio_music',
            track: sampleBgm
          },
          sampleBgm.id,
          true
        );
      }
      const spec = getLocalFolderSpec(category);
      setStatusBanner(
        `Saved item directly into ./${LOCAL_WORKSPACE_ROOT_NAME}/${spec.relativePath}/ on disk!`
      );
    },
    [
      handleSaveDescriptionFile,
      buildCurrentProjectSnapshot,
      saveItemToDedicatedFolder,
      assets,
      selectedAssetId,
      currentFloor,
      catalogAssets,
      customGeneratedTexUrl,
      roomBlueprints,
      agents,
      globalInstructionSet,
      savedInteractions,
      timeOfDayEvents
    ]
  );

  const handleSyncAllDataToFolders = useCallback(async () => {
    soundFX.playPlaceAsset();
    for (const folder of LOCAL_WORKSPACE_FOLDERS) {
      handleQuickSaveCategorySample(folder.category);
    }
    setStatusBanner(
      `⚡ Synced all data categories & newly added assets into ./${LOCAL_WORKSPACE_ROOT_NAME}/ dedicated folders!`
    );
  }, [handleQuickSaveCategorySample]);

  const handleLoadFileFromFolder = useCallback(
    async (category: LocalFolderCategory, filename: string) => {
      try {
        const res = await fetch(
          `/api/local-fs/read-item?category=${encodeURIComponent(
            category
          )}&filename=${encodeURIComponent(filename)}`
        );
        if (!res.ok) return;
        const { parsed } = await res.json();
        const payload = parsed?.data ?? parsed?.asset ?? parsed?.blueprint ?? parsed?.character ?? parsed;
        soundFX.playPlaceAsset();

        if (category === 'asset_descriptions') {
          await handleRunBatchDescriptionImport(
            filename,
            typeof parsed?.rawText === 'string' ? parsed.rawText : undefined
          );
          return;
        } else if (category === 'projects') {
          const check = validateAndParseProjectSnapshot(payload);
          if (check.valid && check.project) {
            applyProjectSnapshotToWorkspace(check.project, `Local Folder (${filename})`);
            return;
          }
        } else if (category === 'environment_3d') {
          const obj: PlacedAsset = payload?.parts
            ? {
                id: `loaded3d_${Date.now()}`,
                name: payload.name || filename,
                category: 'custom_ai',
                subType: 'meshy_ai_object',
                floor: currentFloor,
                position: [0, (payload.dimensions?.[1] || 1.2) / 2, 0],
                dimensions: payload.dimensions || [1.2, 1.2, 1.2],
                rotationY: 0,
                color: '#d4af37',
                textureId: 'aged_brass',
                collidable: true,
                compositeParts: payload.parts
              }
            : {
                ...(payload as PlacedAsset),
                id: `loaded3d_${Date.now()}`,
                floor: currentFloor
              };
          recordUndoSnapshot(`Load "${obj.name}" from dedicated folder`);
          setAssets((prev) => [...prev, obj]);
          setSelectedAssetId(obj.id);
          setSelectedAssetIds([obj.id]);
          setStatusBanner(
            `Loaded 3D asset "${obj.name}" from ./ArchitectForge_Workspace/assets/environment_3d/${filename}!`
          );
          return;
        } else if (category === 'catalog_blueprints' && payload?.name) {
          setCatalogAssets((prev) => [payload as AssetBlueprint, ...prev]);
          setStatusBanner(`Loaded catalog blueprint "${payload.name}" from dedicated folder!`);
          return;
        } else if (category === 'textures') {
          const url = payload?.imageUrl || payload?.texture?.imageUrl;
          if (url) {
            setCustomGeneratedTexUrl(url);
            setStatusBanner(`Loaded surface texture from ${filename}!`);
            return;
          }
        } else if ((category === 'blueprints' || category === 'room_blueprints') && payload?.items) {
          handleLoadRoomBlueprint(payload as RoomBlueprint, 0, 0, false);
          return;
        } else if (category === 'character_rigs' && payload?.name) {
          setAgents((prev) => [...prev, payload as HotelAgentProfile]);
          setStatusBanner(`Loaded Character Rig "${payload.name}" from dedicated folder!`);
          return;
        }
        setStatusBanner(`Loaded "${filename}" from ./${LOCAL_WORKSPACE_ROOT_NAME}/${category}/.`);
      } catch {
        setStatusBanner(`Could not read "${filename}" from dedicated folder.`);
      }
    },
    [
      handleRunBatchDescriptionImport,
      applyProjectSnapshotToWorkspace,
      currentFloor,
      recordUndoSnapshot,
      handleLoadRoomBlueprint
    ]
  );

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
        'Standard vintage residential hotel interior partitions use 3.0m ceiling height, 0.25m brick/plaster thickness, and 0.9m × 2.1m doors.'
      );
    } finally {
      setAiForgeBusy(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null;
  const floorAssets = assets.filter((a) => a.floor === currentFloor);
  const lastUndoLabel = undoStack.length > 0 ? undoStack[undoStack.length - 1].actionLabel : null;
  const activeSelectionCount =
    selectedAssetIds.length > 0 ? selectedAssetIds.length : selectedAsset ? 1 : 0;

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none font-['DM_Sans'] text-slate-100">
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
        onPlaceBlueprintRow={handlePlaceBlueprintRow}
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
        flashlightEnabled={flashlightEnabled}
        onToggleFlashlight={() => {
          setFlashlightEnabled((prev) => {
            const next = !prev;
            soundFX.playPlaceAsset();
            setStatusBanner(
              next
                ? '🔦 [L] 1970s Chrome D-Cell / UV Inspection Flashlight ON — Aim at walls or furniture in Walk Mode to reveal hidden chalk tallies & mortar seams!'
                : '🔦 [L] Inspection Flashlight OFF.'
            );
            return next;
          });
        }}
        onFlashlightRevealChange={setFlashlightRevealText}
        onWalkthroughSpeakToAgent={handleWalkthroughSpeakToAgent}
        activeSpeakingAgentId={activeSpeakingAgentId}
        gameTimeMinutes={gameTimeMinutes}
        footstepsEnabled={footstepsEnabled}
        keybindings={keybindings}
        globalAnimationFps={globalAnimationFps}
      />

      {/* 2. FLOATING [F] QUICK EDIT WINDOW TO THE RIGHT OF THE SELECTED ASSET */}
      {quickEditWindowOpen && selectedAsset && mode !== 'character' && mode !== 'soundboard' && (
        <QuickEditWindowF
          primaryAsset={selectedAsset}
          selectedCount={activeSelectionCount}
          screenPosition={selectedAssetScreenPos}
          onClose={() => setQuickEditWindowOpen(false)}
          onBatchModify={handleBatchModifySelected}
          onInteractKeyE={handleInteractWithAssetKeyE}
          onDuplicate={handleDuplicateAsset}
          onDeleteSelected={() => handleDeleteAsset(selectedAsset.id)}
          onExtendWallRow={(wallAsset) => {
            const bp = createBlueprintFromAsset(wallAsset);
            setActiveBlueprint(bp);
            setSelectedAssetId(null);
            setSelectedAssetIds([]);
            setQuickEditWindowOpen(false);
            soundFX.playPlaceAsset();
            setStatusBanner(
              `🧱 Wall Tool active from "${wallAsset.name}" — Click & Drag across the grid to place a connected row of walls!`
            );
          }}
        />
      )}

      {/* 3. SIMS 3 / SIMS 4 FLOATING ROUNDED TOP BAR (Dark Mode Frosted Pill Bar) */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="fixed top-2.5 left-3 right-3 flex flex-col items-center gap-1 pointer-events-none">
          <div className="w-full relative flex items-center justify-center min-h-[36px]">
            {/* Top-Left Pill: Studio Identity (Green Circle Left · ArchitectForge / Studio Centered · Eye First-Person Walk Button Right) */}
            <div
              data-testid="studio-title-pill"
              className="absolute left-0 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-full px-2.5 py-1 shadow-xl flex items-center justify-between gap-3 shrink-0"
            >
              <div
                data-testid="studio-title-green-circle"
                aria-hidden="true"
                className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white font-['Outfit'] font-extrabold text-xs shadow-2xs shrink-0"
              >
                ◆
              </div>

              <div className="flex flex-col items-center justify-center text-center leading-none px-1">
                <div
                  data-testid="studio-title-primary"
                  className="text-xs font-['Outfit'] font-extrabold tracking-tight text-slate-100 leading-tight text-center"
                >
                  {STUDIO_HEADER_BRAND_SPEC.primaryTitle}
                </div>
                <div
                  data-testid="studio-title-subtitle"
                  className="text-[10px] font-['Outfit'] font-bold tracking-wider text-slate-400 leading-tight text-center"
                >
                  {STUDIO_HEADER_BRAND_SPEC.centeredSubtitleUnderneath}
                </div>
              </div>

              <button
                type="button"
                data-testid="title-walkthrough-eye-btn"
                aria-label={
                  mode === 'walkthrough'
                    ? 'Exit First-Person Walk Mode'
                    : 'First-Person Walk Mode'
                }
                title={
                  mode === 'walkthrough'
                    ? 'First-Person Walk Mode Active — Click to return to Build Mode'
                    : 'Enter First-Person Walk Mode'
                }
                onClick={(e) => {
                  e.currentTarget.blur();
                  const nextMode = mode === 'walkthrough' ? 'architect' : 'walkthrough';
                  setMode(nextMode);
                  setStatusBanner(
                    nextMode === 'walkthrough'
                      ? '👁 First-Person Walk Mode Active — Use WASD to explore corridors, [C] Stealth Crouch, [L] Flashlight, or click the Eye icon to exit.'
                      : 'Returned to 1 · Build Mode from First-Person Walk.'
                  );
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-2xs shrink-0 ${
                  mode === 'walkthrough'
                    ? 'bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white ring-2 ring-[#38bdf8]'
                    : 'bg-slate-800 hover:bg-slate-700 text-[#10b981] hover:text-[#34d399] border border-slate-700'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            {/* Top-Center Floating Pill: 1 · Build Mode / 2 · Create-A-Character / 3 · Sound Board (Top-Right Action Cluster Removed) */}
            <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 p-1 rounded-full shadow-xl shrink-0 mx-auto">
              {TOP_EDITOR_MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`editor-mode-tab-${tab.id}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setMode(tab.id);
                    if (tab.id === 'soundboard') {
                      handleToggleOpenWindow('audio', true);
                      handleFocusWindow('audio');
                      setStatusBanner(
                        '🎵 3 · Sound Board Active — Create new sounds or assign specific sounds to 3D assets and blueprints!'
                      );
                    }
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    mode === tab.id
                      ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Window Manager Taskbar (Small status bar underneath removed per user request) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pointer-events-auto">
            <div
              aria-label="Studio Window Taskbar"
              className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 px-2.5 py-0.5 rounded-full shadow-xl flex items-center gap-1 text-[11px]"
            >
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px] mr-1">
                Windows:
              </span>
              {getTaskbarWindowIdsForMode(mode).map((winId) => {
                const win = studioWindows[winId] || createDefaultStudioWindows()[winId];
                const isVisible = Boolean(win && win.isOpen && !win.isMinimized);
                const legacyTestId =
                  winId === 'local_fs'
                    ? 'open-local-folders-btn'
                    : winId === 'keybindings'
                    ? 'open-keybindings-btn'
                    : winId === 'projects'
                    ? 'open-project-manager-btn'
                    : `taskbar-window-btn-${winId}`;
                return (
                  <button
                    key={winId}
                    type="button"
                    data-testid={legacyTestId}
                    onClick={() => {
                      if (!win || !win.isOpen) {
                        handleToggleOpenWindow(winId, true);
                        handleFocusWindow(winId);
                        if (winId === 'local_fs') refreshLocalDiskFoldersStatus();
                      } else if (win.isMinimized) {
                        handleToggleMinimizeWindow(winId);
                        handleFocusWindow(winId);
                      } else {
                        handleToggleOpenWindow(winId, false);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                      isVisible
                        ? 'bg-sky-950/90 text-sky-300 border border-sky-600/80'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {win ? win.shortTitle : winId}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleResetWindowLayout}
                title="Reset all windows to default positions & sizes [H]"
                className="px-2 py-0.5 rounded-full bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-700/70 font-bold text-[10px] ml-1"
              >
                Reset Layout
              </button>
            </div>
          </div>
        </div>

        {/* Center Crosshair & Proximity Inspection Prompt in 1st-Person Walk Mode */}
        {mode === 'walkthrough' && (
          <>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-900/90 drop-shadow">
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>

            <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto">
              {nearbyPrompt && (
                <div
                  data-testid="walkthrough-nearby-prompt"
                  className="px-3.5 py-1 rounded-full bg-slate-900/95 border border-slate-700 text-slate-200 text-xs font-medium shadow-lg max-w-xl truncate"
                >
                  {nearbyPrompt}
                </div>
              )}
              {flashlightRevealText && flashlightEnabled && (
                <div
                  data-testid="flashlight-reveal-banner"
                  className="px-4 py-1.5 rounded-full bg-amber-950/95 border border-amber-400/80 text-amber-200 text-xs font-mono font-bold shadow-lg max-w-xl text-center"
                >
                  {flashlightRevealText}
                </div>
              )}
            </div>
          </>
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
              saveItemToDedicatedFolder('character_rigs', newRig.name, newRig, newRig.id);
              saveItemToDedicatedFolder(
                'ai_instructions',
                `${newRig.name}_Instructions`,
                {
                  characterName: newRig.name,
                  globalInstructionSet,
                  personalInstructionSet: newRig.personalInstructionSet,
                  knownFacts: newRig.knownFacts
                },
                newRig.id
              );
              setStatusBanner(
                `Saved custom 3D Character Rig "${newRig.name}" to ./ArchitectForge_Workspace/characters/rigs/ & ai_instructions/!`
              );
            }}
            onExportCharacterRig={handleExportCharacterRig}
            agents={agents}
            onUpdateAgentSchedule={handleUpdateAgentSchedule}
            globalAnimationFps={globalAnimationFps}
            onChangeGlobalAnimationFps={(nextFps) => {
              setGlobalAnimationFps(nextFps);
              setStatusBanner(
                `⚡ Global Character Animation Step Rate set to ${nextFps} FPS (Meshy.ai low-frame stepper + 60Hz facial rig overlay active).`
              );
            }}
          />
        )}

        {/* 100% Local Computer Workspace & Dedicated Asset Folders Window */}
        <LocalDiskFoldersWindow
          windowState={studioWindows.local_fs}
          onFocus={handleFocusWindow}
          onMove={handleMoveWindow}
          onResize={handleResizeWindow}
          onToggleMinimize={handleToggleMinimizeWindow}
          onToggleMaximize={handleToggleMaximizeWindow}
          onClose={(id) => handleToggleOpenWindow(id, false)}
          foldersStatus={localFoldersStatus}
          rootDiskPath={localRootDiskPath}
          autoSaveToFolders={autoSaveToFolders}
          onToggleAutoSaveToFolders={() => setAutoSaveToFolders((v) => !v)}
          nativeDirName={nativeDirName}
          onMountNativeComputerFolder={handleMountNativeComputerFolder}
          onSyncAllDataToFolders={handleSyncAllDataToFolders}
          onQuickSaveCategorySample={handleQuickSaveCategorySample}
          onLoadFileFromFolder={handleLoadFileFromFolder}
          onRefreshStatus={refreshLocalDiskFoldersStatus}
          lastSavedBanner={lastSavedFolderBanner}
          onExportStandaloneHtml={handleDownloadStandaloneHtmlApp}
          onSaveDescriptionFile={handleSaveDescriptionFile}
          onRunBatchDescriptionImport={handleRunBatchDescriptionImport}
          batchImportBusy={batchImportBusy}
          lastBatchImportSummary={lastBatchImportSummary}
        />

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
          firebaseUserDisplayName={firebaseUser?.displayName || null}
          firebaseUserEmail={firebaseUser?.email || null}
          firebaseAuthReady={firebaseAuthReady}
          cloudSyncBusy={cloudSyncBusy}
          cloudProjects={cloudProjects}
          onSignInFirebase={handleSignInFirebase}
          onSignOutFirebase={handleSignOutFirebase}
          onSyncCurrentProjectToCloud={handleSyncCurrentProjectToCloud}
          onLoadCloudProject={handleLoadCloudProject}
          onDeleteCloudProject={handleDeleteCloudProject}
        />

        {/* Audio Synthesizer & Sound Studio Floating Window + Sound Board Companion Tools */}
        {studioWindows.audio && (
          <AudioStudioWindow
            windowState={studioWindows.audio}
            onFocus={handleFocusWindow}
            onMove={handleMoveWindow}
            onResize={handleResizeWindow}
            onToggleMinimize={handleToggleMinimizeWindow}
            onToggleMaximize={handleToggleMaximizeWindow}
            onClose={(id) => handleToggleOpenWindow(id, false)}
            onSaveToLocalFolder={saveItemToDedicatedFolder}
            walkthroughBgmEnabled={walkthroughBgmEnabled}
            onToggleWalkthroughBgm={setWalkthroughBgmEnabled}
            footstepsEnabled={footstepsEnabled}
            onToggleFootsteps={setFootstepsEnabled}
            isSoundBoardMode={mode === 'soundboard'}
            assets={floorAssets}
            catalogAssets={catalogAssets}
            selectedAssetId={selectedAssetId}
            activeBlueprintSubType={activeBlueprint?.subType || null}
            onAssignSoundToAsset={handleAssignSoundToAsset}
            onAssignSoundToBlueprint={handleAssignSoundToBlueprint}
          />
        )}

        {/* User-Defined Keybindings & Control Selection Floating Window */}
        {studioWindows.keybindings && (
          <KeybindingsWindow
            windowState={studioWindows.keybindings}
            onFocus={handleFocusWindow}
            onMove={handleMoveWindow}
            onResize={handleResizeWindow}
            onToggleMinimize={handleToggleMinimizeWindow}
            onToggleMaximize={handleToggleMaximizeWindow}
            onClose={(id) => handleToggleOpenWindow(id, false)}
            keybindings={keybindings}
            onChangeKeybindings={(next, msg) => {
              setKeybindings(next);
              if (msg) setStatusBanner(msg);
            }}
          />
        )}

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
          onOpenWindow={(id) => handleToggleOpenWindow(id, true)}
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
          onUpdateRoomBlueprint={handleUpdateRoomBlueprint}
          onUpdateCatalogBlueprint={handleUpdateCatalogBlueprint}
          onSwitchToSoundBoard={() => {
            setMode('soundboard');
            handleToggleOpenWindow('audio', true);
            handleFocusWindow('audio');
          }}
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
