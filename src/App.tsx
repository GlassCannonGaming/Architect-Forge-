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
  HotelAgentProfile,
  CharacterAppearance,
  CharacterStats,
  buildProcedural3DSpecFromPrompt,
  UndoHistoryEntry,
  pushUndoHistory,
  popUndoHistory
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
import { soundFX } from './game/soundEffects';

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('architect');
  const [floorLayers, setFloorLayers] = useState<FloorLayer[]>(INITIAL_FLOOR_LAYERS);
  const [currentFloor, setCurrentFloor] = useState<FloorId>('lobby');
  const [currentRoomLabel, setCurrentRoomLabel] = useState<string>('Ground Floor · Layer L1');
  const [nearbyPrompt, setNearbyPrompt] = useState<string | null>(null);

  // Start with a Blank 128x128 Square Tiles Canvas by default
  const [assets, setAssets] = useState<PlacedAsset[]>([]);
  const [undoStack, setUndoStack] = useState<UndoHistoryEntry[]>([]);
  const [catalogAssets, setCatalogAssets] = useState<AssetBlueprint[]>(ASSET_CATALOG);
  const [agents, setAgents] = useState<HotelAgentProfile[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [activeBlueprint, setActiveBlueprint] = useState<AssetBlueprint | null>(null);
  const [showTPoseMannequin, setShowTPoseMannequin] = useState<boolean>(false);
  const [isolateSelectedAsset, setIsolateSelectedAsset] = useState<boolean>(false);
  const [showExteriorWalls, setShowExteriorWalls] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>(
    `Blank ${GRID_TILE_COUNT}×${GRID_TILE_COUNT} Tile Canvas Ready — Select a visual asset card below to build, switch or add Floor Layers on the right, or press E to interact.`
  );

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
    setUndoStack(remaining);
    setAssets(popped.assets);
    setSelectedAssetId(popped.selectedAssetId);
    if (!popped.selectedAssetId) {
      setIsolateSelectedAsset(false);
    }
    setStatusBanner(
      `Undid: ${popped.actionLabel} (${remaining.length} undo ${
        remaining.length === 1 ? 'step' : 'steps'
      } remaining).`
    );
  }, [undoStack]);

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
    setSelectedAssetId(null);
    setIsolateSelectedAsset(false);
    setStatusBanner('Pointer cleared [ESC] — Click any 3D object to select & modify, or press [E] to interact.');
  }, []);

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
    setIsolateSelectedAsset(false);
    setStatusBanner('Loaded sample multi-floor architectural asset preset onto the 128×128 canvas.');
  }, [recordUndoSnapshot]);

  const handleClearCurrentFloor = useCallback(() => {
    const meta = getFloorMeta(currentFloor, floorLayers);
    recordUndoSnapshot(`Clear ${meta.shortCode} floor layer`);
    setAssets((prev) => prev.filter((a) => a.floor !== currentFloor));
    setSelectedAssetId(null);
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

  // Global Studio Keyboard Shortcuts (ESC clears mouse, Ctrl+Z / Cmd+Z undoes last action, 1/2/3 switch studio views, H toggles dock, M mutes UI audio)
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

      if (e.code === 'Escape') {
        e.preventDefault();
        handleClearMouse();
      } else if (e.code === 'KeyH') {
        setDockCollapsed((c) => !c);
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
  }, [handleClearMouse, handleUndo]);

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
      setActiveBlueprint(null);
      setStatusBanner(
        `Placed "${newAsset.name}" at (${x}m, ${z}m) on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        } — Selected for modification.`
      );
    },
    [activeBlueprint, currentFloor, currentRoomLabel, floorLayers, recordUndoSnapshot]
  );

  // Record snapshot once at the start of a 3D viewport drag gesture
  const handleBeginAssetDrag = useCallback(
    (assetId: string) => {
      const dragged = assets.find((a) => a.id === assetId);
      recordUndoSnapshot(`Move "${dragged ? dragged.name : 'Asset'}"`);
    },
    [assets, recordUndoSnapshot]
  );

  // Drag-move selected asset
  const handleMoveSelectedAssetTo = useCallback((assetId: string, x: number, z: number) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId ? { ...a, position: [x, a.dimensions[1] / 2, z] } : a
      )
    );
  }, []);

  // Toggle hinged door / secret wall swing preview (Modification -> tracked on undo stack)
  const handleToggleAssetOpen = useCallback(
    (asset: PlacedAsset) => {
      recordUndoSnapshot(`${asset.isOpen ? 'Close' : 'Open'} "${asset.name}"`);
      soundFX.playSecretPassageOpen();
      const nextOpen = !asset.isOpen;
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isOpen: nextOpen } : a)));
      setSelectedAssetId(asset.id);
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
      setActiveBlueprint(null);

      if (asset.isSecretPassage || asset.category === 'door') {
        handleToggleAssetOpen(asset);
        return;
      }

      soundFX.playClueFound();
      setStatusBanner(
        `Interacted [E] with "${asset.name}" (${asset.dimensions[0]}m × ${asset.dimensions[1]}m × ${asset.dimensions[2]}m, ${asset.textureId}) — Selected for modification.`
      );
    },
    [handleToggleAssetOpen]
  );

  // Update asset properties from the inspector (Modification -> tracked on undo stack)
  const handleUpdateAsset = useCallback(
    (updated: PlacedAsset) => {
      recordUndoSnapshot(`Modify "${updated.name}"`);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setStatusBanner(`Modified "${updated.name}" — Use Undo (Ctrl+Z) to revert.`);
    },
    [recordUndoSnapshot]
  );

  // Delete asset from floor (Deletion -> tracked on undo stack)
  const handleDeleteAsset = useCallback(
    (id: string) => {
      const target = assets.find((a) => a.id === id);
      recordUndoSnapshot(`Delete "${target ? target.name : 'Asset'}"`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setSelectedAssetId(null);
      setIsolateSelectedAsset(false);
      setStatusBanner(
        `Deleted "${target ? target.name : '3D object'}" from canvas layer — Use Undo (Ctrl+Z) to restore.`
      );
    },
    [assets, recordUndoSnapshot]
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

  // Export a single Character Rig as a portable JSON file
  const handleExportCharacterRig = useCallback((rig: HotelAgentProfile) => {
    const safeName = rig.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const exportPayload = {
      schemaVersion: '1.0.0',
      exportedFrom: 'ArchitectForge 3D Asset Studio',
      exportedAt: new Date().toISOString(),
      assetType: '3d_character_rig',
      characterRig: rig
    };
    triggerJsonDownload(`character_rig_${safeName}.json`, exportPayload);
    setStatusBanner(`Exported character rig "character_rig_${safeName}.json" for external environments!`);
  }, []);

  // Export complete Asset Pack & Multi-Floor Environment JSON
  const handleExportFullAssetPack = useCallback(() => {
    const exportPayload = {
      schemaVersion: '1.0.0',
      exportedFrom: 'ArchitectForge 3D Asset Studio',
      exportedAt: new Date().toISOString(),
      gridDimensions: [GRID_TILE_COUNT, GRID_TILE_COUNT],
      floorLayers,
      catalogBlueprints: catalogAssets,
      environmentPlacements: assets,
      characterRigs: agents,
      customSurfaceTextureUrl: customGeneratedTexUrl
    };
    triggerJsonDownload('architectforge_asset_pack.json', exportPayload);
    setStatusBanner(
      `Exported full Asset Pack (${catalogAssets.length} blueprints, ${assets.length} placed objects, ${floorLayers.length} floor layers)!`
    );
  }, [floorLayers, catalogAssets, assets, agents, customGeneratedTexUrl]);

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
      : {
          schemaVersion: '1.0.0',
          assetType: 'architectforge_asset_pack',
          gridDimensions: [GRID_TILE_COUNT, GRID_TILE_COUNT],
          floorLayers,
          catalogBlueprints: catalogAssets,
          environmentPlacements: assets,
          characterRigs: agents
        };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatusBanner(
        selectedObj
          ? `Copied "${selectedObj.name}" 3D JSON spec to clipboard!`
          : `Copied full Asset Pack JSON (${catalogAssets.length} blueprints) to clipboard!`
      );
    } catch {
      setStatusBanner('Prepared JSON spec — use Export (.json) to save directly to disk.');
    }
  }, [assets, selectedAssetId, floorLayers, catalogAssets, agents]);

  // Import external Asset Pack JSON
  const handleImportAssetPackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        recordUndoSnapshot(`Import "${file.name}"`);
        if (Array.isArray(parsed.floorLayers)) {
          setFloorLayers(parsed.floorLayers);
        }
        if (Array.isArray(parsed.catalogBlueprints)) {
          setCatalogAssets(parsed.catalogBlueprints);
        }
        if (Array.isArray(parsed.environmentPlacements)) {
          setAssets(parsed.environmentPlacements);
        }
        if (Array.isArray(parsed.characterRigs)) {
          setAgents(parsed.characterRigs);
        }
        if (parsed.instance && parsed.blueprint) {
          setCatalogAssets((prev) => [parsed.blueprint, ...prev]);
          setAssets((prev) => [...prev, { ...parsed.instance, floor: currentFloor }]);
        }
        setStatusBanner(`Imported "${file.name}" into ArchitectForge Studio!`);
      } catch {
        setStatusBanner(`Could not parse "${file.name}" — verify valid ArchitectForge JSON format.`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // AI 3D / Meshy Object Generator -> Places in scene, adds to Asset List, and records on Undo Stack
  const handleGenerateAI3DAsset = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiForgeBusy(true);
    setStatusBanner(`AI 3D Forge: Generating low-poly 3D mesh for "${promptText}"...`);
    try {
      const res = await fetch('/api/forge/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, floor: currentFloor })
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
        inspectText: `Custom AI-generated 3D object ("${promptText}").`
      };
      const generatedBlueprint = createBlueprintFromAsset(newAsset);
      recordUndoSnapshot(`Forge AI 3D "${newAsset.name}"`);
      soundFX.playPlaceAsset();
      setCatalogAssets((prev) => [generatedBlueprint, ...prev]);
      setAssets((prev) => [...prev, newAsset]);
      setActiveBlueprint(null);
      setSelectedAssetId(newAsset.id);
      setStatusBanner(
        `Forged "${newAsset.name}" — Added to Visual Catalog & placed on ${
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
      setStatusBanner(
        `Forged "${newAsset.name}" — Added to Visual Catalog & placed on ${
          getFloorMeta(currentFloor, floorLayers).shortCode
        }!`
      );
    } finally {
      setAiForgeBusy(false);
    }
  };

  // Gemini Nano Banana 2.1 Texture Synthesizer
  const handleGenerateCustomTexture = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiForgeBusy(true);
    setStatusBanner(`Nano Banana 2.1: Synthesizing custom surface texture "${promptText}"...`);
    try {
      const res = await fetch('/api/forge/generate-texture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, aspectRatio: '1:1' })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setCustomGeneratedTexUrl(data.imageUrl);
        setStatusBanner(`Synthesized custom surface texture with Gemini Nano Banana 2.1!`);
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

      {/* 1. Full-Bleed 3D WebGL Asset Studio Viewport (Blank 128x128 Square Tiles Lot) */}
      <HotelViewport3D
        mode={mode}
        currentFloor={currentFloor}
        floorLayers={floorLayers}
        assets={assets}
        agents={agents}
        selectedAssetId={selectedAssetId}
        activeBlueprint={activeBlueprint}
        showTPoseMannequin={showTPoseMannequin}
        isolateSelectedAsset={isolateSelectedAsset}
        showExteriorWalls={showExteriorWalls}
        customCharacterAppearance={customAppearance}
        onSelectAsset={(id) => {
          setSelectedAssetId(id);
          if (id) {
            setActiveBlueprint(null);
            const found = assets.find((a) => a.id === id);
            if (found) {
              setStatusBanner(
                `Selected "${found.name}" — Customize dimensions, material, or swatches below (Press E to interact, ESC to clear pointer).`
              );
            }
          } else {
            setIsolateSelectedAsset(false);
          }
        }}
        onPlaceBlueprintAt={handlePlaceBlueprintAt}
        onBeginAssetDrag={handleBeginAssetDrag}
        onMoveSelectedAssetTo={handleMoveSelectedAssetTo}
        onToggleAssetOpen={handleToggleAssetOpen}
        onInteractKeyE={handleInteractWithAssetKeyE}
        onPlayerRoomChange={(rm, prompt) => {
          setCurrentRoomLabel(rm);
          setNearbyPrompt(prompt);
        }}
      />

      {/* 2. SIMS 3 / SIMS 4 FLOATING ROUNDED TOP BAR (Sleek Frosted Pill Bar) */}
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
                    {GRID_TILE_COUNT}×{GRID_TILE_COUNT} Tile Lot · {currentFloorMeta.shortCode} ({floorAssets.length} objs)
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
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  undoStack.length > 0
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↶ Undo ({undoStack.length})
              </button>

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
                onClick={handleCopyJsonToClipboard}
                title="Copy selected asset or full pack JSON to clipboard"
                className="px-2.5 py-1 bg-[#e0f2fe] hover:bg-[#bae6fd] rounded-full text-xs font-bold text-[#0369a1] whitespace-nowrap"
              >
                {selectedAsset ? 'Copy Asset JSON' : 'Copy Pack JSON'}
              </button>

              <button
                type="button"
                onClick={handleExportFullAssetPack}
                title="Download complete 3D Asset Pack & Environment Layout (.json)"
                className="px-3 py-1 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] rounded-full text-xs font-bold text-white whitespace-nowrap shadow-2xs"
              >
                Export (.json)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import an ArchitectForge JSON Asset Pack"
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Import
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

          {/* Rounded Status Pill Banner */}
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-[#cbd5e1] px-4 py-0.5 rounded-full text-xs font-medium text-slate-700 shadow-xs max-w-2xl truncate">
            {nearbyPrompt || statusBanner}
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

        {/* Character & Rig Asset Studio Overlay when in Character Mode */}
        {mode === 'character' && (
          <CharacterCreatorOverlay
            appearance={customAppearance}
            stats={customStats}
            assignedTraits={customTraits}
            onChangeAppearance={setCustomAppearance}
            onChangeStats={setCustomStats}
            onChangeTraits={setCustomTraits}
            onSaveCharacterRig={(newRig) => {
              soundFX.playPlaceAsset();
              setAgents((prev) => [...prev, newRig]);
              setStatusBanner(
                `Added custom 3D Character Rig "${newRig.name}" to ${newRig.roomNumber} & Asset Pack!`
              );
            }}
            onExportCharacterRig={handleExportCharacterRig}
          />
        )}

        {/* Sims 3/4 Rounded Build & Buy Dock + Right-Side Image-Editor Floor Layers Panel */}
        <UnifiedBottomDock
          mode={mode}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((c) => !c)}
          currentFloor={currentFloor}
          floorLayers={floorLayers}
          onSelectFloor={(fl) => {
            setCurrentFloor(fl);
            setSelectedAssetId(null);
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
          onSelectAssetId={(id) => {
            setSelectedAssetId(id);
            if (id) {
              setActiveBlueprint(null);
            } else {
              setIsolateSelectedAsset(false);
            }
          }}
          activeBlueprint={activeBlueprint}
          onSelectBlueprint={(bp) => {
            setActiveBlueprint(bp);
            if (bp) {
              setSelectedAssetId(null);
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
