import React, { useState, useRef } from 'react';
import {
  FloorId,
  FloorLayer,
  PlacedAsset,
  TexturePresetId,
  RoomBlueprint,
  StudioWindowId,
  StudioWindowState,
  clampDimension,
  AI_MODEL_REGISTRY,
  createDefaultStudioWindows,
  CatalogCategoryFilter,
  CatalogCapabilityFilter,
  CatalogSortMode,
  IN_GAME_FEATURE_ASSET_TEMPLATES,
  parseBlueprintTagsInput,
  addTagToBlueprint,
  removeTagFromBlueprint,
  collectBlueprintTagCounts,
  searchAndFilterCatalogBlueprints,
  searchAndFilterRoomBlueprints,
  assignSoundToAssetOrBlueprint
} from '../game/rules';
import { AssetBlueprint } from '../game/hotelData';
import {
  audioEngine,
  BUILTIN_SOUND_EFFECTS,
  SoundEffectType
} from '../game/audioEngine';
import { WorkspaceMode } from './HotelViewport3D';
import { AssetThumbnailSvg } from './AssetThumbnailSvg';
import { StudioWindowFrame } from './StudioWindowFrame';

interface UnifiedBottomDockProps {
  mode: WorkspaceMode;
  windows: Record<StudioWindowId, StudioWindowState>;
  onFocusWindow: (id: StudioWindowId) => void;
  onMoveWindow: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResizeWindow: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimizeWindow: (id: StudioWindowId) => void;
  onToggleMaximizeWindow: (id: StudioWindowId) => void;
  onCloseWindow: (id: StudioWindowId) => void;
  onOpenWindow?: (id: StudioWindowId) => void;
  currentFloor: FloorId;
  floorLayers: FloorLayer[];
  onSelectFloor: (floor: FloorId) => void;
  onAddFloorLayer: () => void;
  onToggleFloorLayerVisibility: (floor: FloorId) => void;
  onClearFloor: () => void;
  catalogAssets: AssetBlueprint[];
  floorAssets: PlacedAsset[];
  selectedAsset: PlacedAsset | null;
  selectedCount: number;
  marqueeModeActive: boolean;
  onToggleMarqueeMode: () => void;
  onToggleQuickEditF: () => void;
  onSelectAssetId: (id: string | null) => void;
  activeBlueprint: AssetBlueprint | null;
  onSelectBlueprint: (bp: AssetBlueprint | null) => void;
  onClearMouse: () => void;
  onUpdateAsset: (updated: PlacedAsset) => void;
  onDuplicateAsset: (asset: PlacedAsset) => void;
  onInteractAsset: (asset: PlacedAsset) => void;
  onSaveAssetToCatalog: (asset: PlacedAsset) => void;
  onExportSingleAsset: (asset: PlacedAsset) => void;
  onDeleteAsset: (id: string) => void;
  surfaceSnapEnabled: boolean;
  onToggleSurfaceSnap: () => void;
  onSnapSelectedToSurfaceNow: () => void;
  // Room Blueprints Library Props
  roomBlueprints: RoomBlueprint[];
  onSaveRoomBlueprint: (
    name: string,
    description: string,
    useSelectionOnly: boolean,
    customTags?: string[]
  ) => void;
  onUpdateRoomBlueprint?: (updated: RoomBlueprint) => void;
  onUpdateCatalogBlueprint?: (updated: AssetBlueprint) => void;
  onSwitchToSoundBoard?: () => void;
  onLoadRoomBlueprint: (
    blueprint: RoomBlueprint,
    offsetX: number,
    offsetZ: number,
    replaceFloor: boolean
  ) => void;
  onDeleteRoomBlueprint: (id: string) => void;
  onExportRoomBlueprint: (blueprint: RoomBlueprint) => void;
  onExportAllRoomBlueprints: () => void;
  onImportRoomBlueprintsJson: (jsonText: string) => void;
  undoCount: number;
  lastUndoLabel: string | null;
  onUndo: () => void;
  showTPoseMannequin: boolean;
  onToggleTPose: () => void;
  isolateSelectedAsset: boolean;
  onToggleIsolateAsset: () => void;
  showExteriorWalls: boolean;
  onToggleExteriorWalls: () => void;
  onGenerateAI3DAsset: (prompt: string, referenceImageUrl?: string | null) => Promise<void>;
  onGenerateCustomTexture: (prompt: string) => Promise<void>;
  onResearchNycLore: (query: string) => Promise<void>;
  aiForgeBusy: boolean;
  loreSummary: string | null;
  customGeneratedTexUrl: string | null;
}

const TEXTURE_OPTIONS: { id: TexturePresetId; label: string }[] = [
  { id: 'nyc_old_brick', label: 'Vintage Red Brick' },
  { id: 'plaster_cream', label: 'Wainscot Plaster' },
  { id: 'oak_parquet', label: 'Mahogany / Oak' },
  { id: 'checker_marble', label: 'Checker Marble' },
  { id: 'wallpaper_damask', label: 'Damask Wallpaper' },
  { id: 'velvet_crimson', label: 'Crimson Velvet' },
  { id: 'aged_brass', label: 'Aged Brass' },
  { id: 'industrial_concrete', label: 'Basement Concrete' }
];

type CategoryFilter = CatalogCategoryFilter;

export const UnifiedBottomDock: React.FC<UnifiedBottomDockProps> = ({
  mode,
  windows,
  onFocusWindow,
  onMoveWindow,
  onResizeWindow,
  onToggleMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
  onOpenWindow,
  currentFloor,
  floorLayers,
  onSelectFloor,
  onAddFloorLayer,
  onToggleFloorLayerVisibility,
  onClearFloor,
  catalogAssets,
  floorAssets,
  selectedAsset,
  selectedCount,
  marqueeModeActive,
  onToggleMarqueeMode,
  onToggleQuickEditF,
  onSelectAssetId,
  activeBlueprint,
  onSelectBlueprint,
  onClearMouse,
  onUpdateAsset,
  onDuplicateAsset,
  onInteractAsset,
  onSaveAssetToCatalog,
  onExportSingleAsset,
  onDeleteAsset,
  surfaceSnapEnabled,
  onToggleSurfaceSnap,
  onSnapSelectedToSurfaceNow,
  roomBlueprints,
  onSaveRoomBlueprint,
  onUpdateRoomBlueprint,
  onUpdateCatalogBlueprint,
  onSwitchToSoundBoard,
  onLoadRoomBlueprint,
  onDeleteRoomBlueprint,
  onExportRoomBlueprint,
  onExportAllRoomBlueprints,
  onImportRoomBlueprintsJson,
  undoCount,
  lastUndoLabel,
  onUndo,
  showTPoseMannequin,
  onToggleTPose,
  isolateSelectedAsset,
  onToggleIsolateAsset,
  showExteriorWalls,
  onToggleExteriorWalls,
  onGenerateAI3DAsset,
  onGenerateCustomTexture,
  onResearchNycLore,
  aiForgeBusy,
  loreSummary,
  customGeneratedTexUrl
}) => {
  const [architectTab, setArchitectTab] = useState<'catalog' | 'ai3d' | 'texture' | 'lore' | 'models'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<CatalogCapabilityFilter>('all');
  const [sortBy, setSortBy] = useState<CatalogSortMode>('relevance');
  const [activeCatalogTags, setActiveCatalogTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogNewTagInput, setCatalogNewTagInput] = useState<string>('');
  const [inspectorNewTagInput, setInspectorNewTagInput] = useState<string>('');
  const [ai3DPrompt, setAi3DPrompt] = useState('Vintage brass hotel luggage cart with velvet cushion');
  const [meshyRefImageUrl, setMeshyRefImageUrl] = useState<string | null>(null);
  const meshyImageInputRef = useRef<HTMLInputElement | null>(null);
  const [texPrompt, setTexPrompt] = useState('Crimson geometric corridor carpet');
  const [loreQuery, setLoreQuery] = useState('Boutique hotel room dimensions & standard door proportions');

  // Room Blueprint Creator, Tagging & Search State
  const [bpName, setBpName] = useState<string>('Custom Parlor Suite');
  const [bpDescription, setBpDescription] = useState<string>(
    'Modular room layout with walls, doors, and period furniture.'
  );
  const [bpTagsInput, setBpTagsInput] = useState<string>('parlor, late-70s, modular');
  const [roomBpSearchQuery, setRoomBpSearchQuery] = useState<string>('');
  const [activeRoomBpTags, setActiveRoomBpTags] = useState<string[]>([]);
  const [roomBpInlineTagDrafts, setRoomBpInlineTagDrafts] = useState<Record<string, string>>({});
  const [bpOffsetX, setBpOffsetX] = useState<number>(0);
  const [bpOffsetZ, setBpOffsetZ] = useState<number>(0);
  const [replaceFloorOnLoad, setReplaceFloorOnLoad] = useState<boolean>(false);
  const blueprintFileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredCatalog = searchAndFilterCatalogBlueprints(catalogAssets, {
    query: searchQuery,
    categoryFilter,
    capabilityFilter,
    activeTags: activeCatalogTags,
    sortBy
  });

  const catalogTagCounts = collectBlueprintTagCounts(catalogAssets).slice(0, 8);
  const roomBlueprintTagCounts = collectBlueprintTagCounts(roomBlueprints).slice(0, 6);
  const filteredRoomBlueprints = searchAndFilterRoomBlueprints(
    roomBlueprints,
    roomBpSearchQuery,
    activeRoomBpTags
  );

  const handleToggleCatalogTagFilter = (tag: string) => {
    setActiveCatalogTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleRoomBpTagFilter = (tag: string) => {
    setActiveRoomBpTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const sortedLayersTopDown = [...floorLayers].sort((a, b) => b.elevation - a.elevation);
  const currentLayerIndex = sortedLayersTopDown.findIndex((l) => l.id === currentFloor);

  const handleStepFloorUp = () => {
    if (currentLayerIndex > 0) {
      onSelectFloor(sortedLayersTopDown[currentLayerIndex - 1].id);
    }
  };

  const handleStepFloorDown = () => {
    if (currentLayerIndex >= 0 && currentLayerIndex < sortedLayersTopDown.length - 1) {
      onSelectFloor(sortedLayersTopDown[currentLayerIndex + 1].id);
    }
  };

  const handleBlueprintFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onImportRoomBlueprintsJson(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={blueprintFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleBlueprintFileChange}
        className="hidden"
      />

      {/* 1. FLOOR LAYERS STACK WINDOW (Available in Build & Walkthrough modes) */}
      {mode !== 'character' && mode !== 'soundboard' && (
        <StudioWindowFrame
          windowState={windows.layers}
          badgeText={`${floorLayers.length} Floors`}
          onFocus={onFocusWindow}
          onMove={onMoveWindow}
          onResize={onResizeWindow}
          onToggleMinimize={onToggleMinimizeWindow}
          onToggleMaximize={onToggleMaximizeWindow}
          onClose={onCloseWindow}
        >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-600">Step Elevation:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleStepFloorUp}
                disabled={currentLayerIndex <= 0}
                title="Move Up One Floor Layer"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-[#e0f2fe] disabled:opacity-40 text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-300"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={handleStepFloorDown}
                disabled={currentLayerIndex < 0 || currentLayerIndex >= sortedLayersTopDown.length - 1}
                title="Move Down One Floor Layer"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-[#e0f2fe] disabled:opacity-40 text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-300"
              >
                ▼
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddFloorLayer}
            className="w-full py-1.5 px-3 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span>+ Add Floor Layer</span>
          </button>

          <div className="flex items-center gap-1.5">
            <label htmlFor="active-floor-dropdown" className="text-[10px] font-semibold text-slate-500 shrink-0">
              Active:
            </label>
            <select
              id="active-floor-dropdown"
              aria-label="Active Floor Layer"
              value={currentFloor}
              onChange={(e) => {
                e.currentTarget.blur();
                onSelectFloor(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800"
            >
              {sortedLayersTopDown.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.shortCode} · {layer.label.split('·')[0].trim()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 pr-0.5">
            {sortedLayersTopDown.map((layer) => {
              const isActive = layer.id === currentFloor;
              return (
                <div
                  key={layer.id}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white font-bold shadow-xs'
                      : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleFloorLayerVisibility(layer.id)}
                    title={
                      isActive
                        ? 'Active editing floor layer'
                        : layer.visible
                        ? 'Hide reference layer in 3D view'
                        : 'Show as ghost reference layer in 3D view'
                    }
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : layer.visible
                        ? 'bg-[#bae6fd] text-[#0369a1]'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isActive || layer.visible ? '👁' : '·'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectFloor(layer.id)}
                    className="flex-1 text-left truncate"
                  >
                    <span className="font-mono text-[10px] opacity-80 mr-1">{layer.shortCode}</span>
                    <span>{layer.label.split('·')[0].trim()}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClearFloor}
            className="w-full py-1 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold transition-colors"
          >
            Clear Active Layer
          </button>
        </div>
        </StudioWindowFrame>
      )}

      {mode !== 'character' && mode !== 'soundboard' && (
        <>
          {/* 2. ROOM BLUEPRINTS LIBRARY WINDOW (Save, Tag, Search & Load Entire Room Layouts as JSON) */}
          <StudioWindowFrame
            windowState={windows.blueprints}
            badgeText={`${filteredRoomBlueprints.length}/${roomBlueprints.length} Saved`}
            onFocus={onFocusWindow}
            onMove={onMoveWindow}
            onResize={onResizeWindow}
            onToggleMinimize={onToggleMinimizeWindow}
            onToggleMaximize={onToggleMaximizeWindow}
            onClose={onCloseWindow}
          >
            <div className="flex flex-col gap-1.5 text-xs">
              {/* Save Current Room / Selection as Blueprint with Custom Blueprint Tags */}
              <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-[#0369a1]">
                    Save Room Layout + Tags
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    Floor: {floorAssets.length} objs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={bpName}
                    onChange={(e) => setBpName(e.target.value)}
                    aria-label="Room Blueprint Name"
                    placeholder="Blueprint name..."
                    className="w-full bg-white border border-sky-200 rounded-full px-2 py-0.5 text-[11px] font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    data-testid="room-blueprint-tags-input"
                    value={bpTagsInput}
                    onChange={(e) => setBpTagsInput(e.target.value)}
                    aria-label="Room Blueprint Tags"
                    placeholder="Tags: lobby, late-70s"
                    className="w-full bg-white border border-sky-200 rounded-full px-2 py-0.5 text-[10px] font-mono text-slate-700"
                  />
                </div>
                <input
                  type="text"
                  value={bpDescription}
                  onChange={(e) => setBpDescription(e.target.value)}
                  aria-label="Room Blueprint Description"
                  placeholder="Short description of room layout..."
                  className="w-full bg-white border border-sky-200 rounded-full px-2 py-0.5 text-[10px] text-slate-700"
                />
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <button
                    type="button"
                    disabled={floorAssets.length === 0}
                    onClick={() =>
                      onSaveRoomBlueprint(
                        bpName,
                        bpDescription,
                        false,
                        parseBlueprintTagsInput(bpTagsInput)
                      )
                    }
                    className="py-1 px-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] disabled:opacity-40 text-white font-bold rounded-full text-[10px] shadow-2xs"
                  >
                    + Save Floor ({floorAssets.length})
                  </button>
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={() =>
                      onSaveRoomBlueprint(
                        bpName,
                        bpDescription,
                        true,
                        parseBlueprintTagsInput(bpTagsInput)
                      )
                    }
                    className="py-1 px-2 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-40 text-white font-bold rounded-full text-[10px] shadow-2xs"
                  >
                    + Save Selected ({selectedCount})
                  </button>
                </div>
              </div>

              {/* Search & Tag Filter Bar for Saved Room Blueprints */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1.5 space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    data-testid="room-blueprint-search-input"
                    value={roomBpSearchQuery}
                    onChange={(e) => setRoomBpSearchQuery(e.target.value)}
                    aria-label="Search Room Blueprints"
                    placeholder="Search blueprints by name, object, or #tag..."
                    className="flex-1 bg-white border border-slate-300 rounded-full px-2.5 py-0.5 text-[10px] text-slate-800"
                  />
                  {(roomBpSearchQuery || activeRoomBpTags.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoomBpSearchQuery('');
                        setActiveRoomBpTags([]);
                      }}
                      className="px-2 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {roomBlueprintTagCounts.length > 0 && (
                  <div
                    data-testid="room-blueprint-tag-filter-bar"
                    className="flex flex-wrap items-center gap-1"
                  >
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                      Tags:
                    </span>
                    {roomBlueprintTagCounts.map(({ tag, count }) => {
                      const active = activeRoomBpTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleRoomBpTagFilter(tag)}
                          className={`px-1.5 py-0.1 rounded-full text-[8px] font-mono font-bold transition-all border ${
                            active
                              ? 'bg-[#0284c7] text-white border-[#38bdf8]'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          #{tag} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-200">
                  <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer truncate">
                    <input
                      type="checkbox"
                      checked={replaceFloorOnLoad}
                      onChange={(e) => setReplaceFloorOnLoad(e.target.checked)}
                      className="rounded accent-[#0284c7]"
                    />
                    <span>Replace floor</span>
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-slate-500">Offset X,Z:</span>
                    <input
                      type="number"
                      aria-label="Blueprint Load Offset X"
                      step={0.5}
                      value={bpOffsetX}
                      onChange={(e) => setBpOffsetX(parseFloat(e.target.value) || 0)}
                      className="w-10 bg-white border border-slate-300 rounded-lg px-1 py-0.2 text-[10px] font-mono text-center"
                    />
                    <input
                      type="number"
                      aria-label="Blueprint Load Offset Z"
                      step={0.5}
                      value={bpOffsetZ}
                      onChange={(e) => setBpOffsetZ(parseFloat(e.target.value) || 0)}
                      className="w-10 bg-white border border-slate-300 rounded-lg px-1 py-0.2 text-[10px] font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Saved Room Blueprints List with Tag Chips & Inline Tag Editor */}
              <div className="space-y-1.5" data-testid="room-blueprints-list">
                {filteredRoomBlueprints.map((bp) => {
                  const inlineTagVal = roomBpInlineTagDrafts[bp.id] || '';
                  return (
                    <div
                      key={bp.id}
                      className="bg-white border border-slate-200 hover:border-[#38bdf8] rounded-2xl p-2 shadow-2xs space-y-1 transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-800">{bp.name}</div>
                          <div className="text-[9px] text-slate-500 leading-snug line-clamp-1">
                            {bp.description}
                          </div>
                        </div>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                          {bp.items.length} objs · {bp.boundingSize[0]}×{bp.boundingSize[1]}m
                        </span>
                      </div>

                      {/* Room Blueprint Tag Chips & Inline Add Tag */}
                      <div className="flex flex-wrap items-center gap-1">
                        {(bp.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[8px] font-mono font-semibold"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleRoomBpTagFilter(tag)}
                              title={`Filter Room Blueprints by #${tag}`}
                              className="hover:underline"
                            >
                              #{tag}
                            </button>
                            {onUpdateRoomBlueprint && (
                              <button
                                type="button"
                                aria-label={`Remove tag ${tag} from ${bp.name}`}
                                onClick={() =>
                                  onUpdateRoomBlueprint(removeTagFromBlueprint(bp, tag))
                                }
                                className="ml-0.5 text-slate-400 hover:text-rose-600 font-bold"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                        {onUpdateRoomBlueprint && (
                          <div className="inline-flex items-center gap-0.5">
                            <input
                              type="text"
                              value={inlineTagVal}
                              onChange={(e) =>
                                setRoomBpInlineTagDrafts((prev) => ({
                                  ...prev,
                                  [bp.id]: e.target.value
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && inlineTagVal.trim()) {
                                  e.preventDefault();
                                  onUpdateRoomBlueprint(addTagToBlueprint(bp, inlineTagVal));
                                  setRoomBpInlineTagDrafts((prev) => ({ ...prev, [bp.id]: '' }));
                                }
                              }}
                              aria-label={`Add tag to ${bp.name}`}
                              placeholder="+tag"
                              className="w-12 bg-slate-50 border border-slate-300 rounded-full px-1.5 py-0.1 text-[8px] font-mono text-slate-700"
                            />
                            {inlineTagVal.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateRoomBlueprint(addTagToBlueprint(bp, inlineTagVal));
                                  setRoomBpInlineTagDrafts((prev) => ({ ...prev, [bp.id]: '' }));
                                }}
                                className="px-1.5 py-0.1 rounded-full bg-[#0284c7] text-white text-[8px] font-bold"
                              >
                                +
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onLoadRoomBlueprint(bp, bpOffsetX, bpOffsetZ, replaceFloorOnLoad)
                          }
                          className="flex-1 py-0.5 px-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-[10px]"
                        >
                          Load Room Blueprint
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportRoomBlueprint(bp)}
                          title="Export this Room Blueprint as JSON"
                          className="py-0.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-[9px]"
                        >
                          .json
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRoomBlueprint(bp.id)}
                          title="Remove Blueprint from Library"
                          className="py-0.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-full text-[9px]"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Export / Import Entire Room Blueprint JSON Library */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onExportAllRoomBlueprints}
                  className="py-1 px-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] font-bold rounded-full text-[10px]"
                >
                  Export Library (.json)
                </button>
                <button
                  type="button"
                  onClick={() => blueprintFileInputRef.current?.click()}
                  className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-[10px]"
                >
                  Import Blueprint JSON
                </button>
              </div>
            </div>
          </StudioWindowFrame>

          {/* 3. BUILD MODE TOOLS WINDOW */}
          <StudioWindowFrame
            windowState={windows.tools}
            badgeText="128×128 Grid"
            onFocus={onFocusWindow}
            onMove={onMoveWindow}
            onResize={onResizeWindow}
            onToggleMinimize={onToggleMinimizeWindow}
            onToggleMaximize={onToggleMaximizeWindow}
            onClose={onCloseWindow}
          >
            <div className="flex flex-col gap-1.5">
              <select
                aria-label="Studio Tool Panel"
                value={architectTab}
                onChange={(e) => {
                  e.currentTarget.blur();
                  const nextTab = e.target.value as 'catalog' | 'ai3d' | 'texture' | 'lore' | 'models';
                  setArchitectTab(nextTab);
                  if (nextTab === 'catalog') {
                    onOpenWindow?.('catalog');
                    onFocusWindow('catalog');
                  }
                }}
                className="w-full bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl px-2.5 py-1.5 text-xs font-bold text-[#0369a1]"
              >
                <option value="catalog">📦 Build Mode Visual Catalog ({catalogAssets.length})</option>
                <option value="ai3d">✨ Meshy.ai Image-to-3D &amp; Google 3D Forge</option>
                <option value="texture">🎨 Google Flash-Lite Surface Textures</option>
                <option value="lore">📐 In-Game Scale Reference (Flash Low)</option>
                <option value="models">⚡ Fast Google + Meshy AI Models</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setArchitectTab('catalog');
                  onOpenWindow?.('catalog');
                  onFocusWindow('catalog');
                }}
                className="w-full px-2.5 py-1 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold transition-all shadow-2xs flex items-center justify-between"
              >
                <span>📦 Toggle Asset Catalog Window</span>
                <span className="text-[9px] bg-sky-900/60 text-sky-100 px-1.5 py-0.5 rounded-full font-mono">{catalogAssets.length} Items</span>
              </button>

              <select
                aria-label="Catalog Category Filter"
                value={categoryFilter}
                onChange={(e) => {
                  e.currentTarget.blur();
                  setCategoryFilter(e.target.value as CategoryFilter);
                  setArchitectTab('catalog');
                  onOpenWindow?.('catalog');
                  onFocusWindow('catalog');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                <option value="all">All Categories ({catalogAssets.length})</option>
                <option value="architecture">Walls, Doors, Windows &amp; Floors</option>
                <option value="furniture">Furniture, Beds &amp; Appliances</option>
                <option value="game_props">
                  🎯 In-Game Feature Item Templates ({IN_GAME_FEATURE_ASSET_TEMPLATES.length})
                </option>
                <option value="ai">
                  AI Generated Assets ({catalogAssets.filter((b) => b.isGenerated || b.category === 'custom_ai').length})
                </option>
              </select>

              <div className="flex flex-col gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={onClearMouse}
                  className={`w-full px-3 py-1 rounded-full text-xs font-bold text-left flex items-center justify-between transition-all ${
                    !activeBlueprint && !marqueeModeActive
                      ? 'bg-[#10b981] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>↖ Select &amp; Modify</span>
                  <span className="text-[10px] opacity-85">[Esc]</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMarqueeMode}
                  className={`w-full px-3 py-1 rounded-full text-xs font-bold text-left flex items-center justify-between transition-all ${
                    marqueeModeActive
                      ? 'bg-[#0284c7] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>⬚ Marquee Multi-Select</span>
                  <span className="text-[10px] opacity-85">[Shift]</span>
                </button>

                <button
                  type="button"
                  data-testid="wall-row-tool-btn"
                  onClick={() => {
                    const wallBp = catalogAssets.find((b) => b.category === 'wall') || catalogAssets[0];
                    onSelectBlueprint(wallBp);
                  }}
                  className={`w-full px-3 py-1 rounded-full text-xs font-bold text-left flex items-center justify-between transition-all ${
                    activeBlueprint?.category === 'wall'
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🧱</span>
                    <span>Wall Tool (Click &amp; Drag Row)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/40 text-amber-950 font-bold rounded-md">
                    [B]
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onUndo}
                  disabled={undoCount === 0}
                  title={
                    lastUndoLabel
                      ? `Undo last action: ${lastUndoLabel} (Ctrl+Z)`
                      : 'No actions to undo (Ctrl+Z)'
                  }
                  className={`w-full px-3 py-1 rounded-full text-xs font-bold text-left flex items-center justify-between transition-all ${
                    undoCount > 0
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>↶ Undo ({undoCount})</span>
                  <span className="text-[10px]">[Ctrl+Z]</span>
                </button>

                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={onToggleIsolateAsset}
                    disabled={!selectedAsset}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold truncate ${
                      isolateSelectedAsset && selectedAsset
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-slate-100 text-slate-600 disabled:opacity-40'
                    }`}
                  >
                    Isolate
                  </button>
                  <button
                    type="button"
                    onClick={onToggleTPose}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold truncate ${
                      showTPoseMannequin
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Scale Guide
                  </button>
                  <button
                    type="button"
                    onClick={onToggleExteriorWalls}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold truncate ${
                      showExteriorWalls
                        ? 'bg-[#0284c7] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Shell Walls
                  </button>
                </div>
              </div>
            </div>
          </StudioWindowFrame>

          {/* 4. VISUAL ASSET CATALOG & AI FORGE WINDOW */}
          <StudioWindowFrame
            windowState={windows.catalog || createDefaultStudioWindows().catalog}
            badgeText={`${filteredCatalog.length} Items`}
            onFocus={onFocusWindow}
            onMove={onMoveWindow}
            onResize={onResizeWindow}
            onToggleMinimize={onToggleMinimizeWindow}
            onToggleMaximize={onToggleMaximizeWindow}
            onClose={onCloseWindow}
          >
            <div className="flex flex-col gap-1.5">
              {/* Quick Sub-Tab Switcher inside Visual Asset Catalog & AI Forge Window */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full text-[10px] font-bold">
                {(
                  [
                    { id: 'catalog', label: `Catalog (${filteredCatalog.length})` },
                    { id: 'ai3d', label: 'Meshy Image-to-3D' },
                    { id: 'texture', label: 'Flash-Lite Texture' },
                    { id: 'lore', label: 'Scale Ref' },
                    { id: 'models', label: '⚡ AI Models' }
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`architect-tab-${t.id}`}
                    onClick={() => setArchitectTab(t.id)}
                    className={`flex-1 py-0.5 px-2 rounded-full transition-all whitespace-nowrap ${
                      architectTab === t.id
                        ? 'bg-[#0284c7] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {architectTab === 'catalog' && (
                <>
                  {/* Enhanced Multi-Token Search Bar + Sort Selector + Quick Meshy 3D Trigger */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        data-testid="catalog-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, material, or #tag (e.g. notebook, cassette, #hinged)..."
                        aria-label="Search Asset Catalog"
                        className="w-full bg-slate-100 border border-slate-300 rounded-full pl-2.5 pr-6 py-0.5 text-[11px] text-slate-800 placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          data-testid="catalog-search-clear-btn"
                          aria-label="Clear Asset Search"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 text-slate-400 hover:text-slate-700 text-[10px] font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <select
                      aria-label="Sort Asset Catalog"
                      data-testid="catalog-sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as CatalogSortMode)}
                      className="bg-slate-100 border border-slate-300 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-700 shrink-0"
                    >
                      <option value="relevance">Sort: Relevance</option>
                      <option value="name_asc">Sort: Name A–Z</option>
                      <option value="category">Sort: Category</option>
                      <option value="size_desc">Sort: Largest</option>
                      <option value="size_asc">Sort: Smallest</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setArchitectTab('ai3d')}
                      className="px-2 py-0.5 rounded-full bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] text-[10px] font-bold whitespace-nowrap shrink-0"
                    >
                      + Meshy 3D
                    </button>
                  </div>

                  {/* Capability Filter Bar + Compact Blueprint Tag Chips Row */}
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {(
                        [
                          { id: 'all', label: 'All' },
                          { id: 'game_item', label: '🎯 In-Game Items' },
                          { id: 'interactive_hinged', label: '🚪 Hinged' },
                          { id: 'animated', label: '🎞️ Animated' },
                          { id: 'custom_ai', label: '✨ AI Forged' }
                        ] as const
                      ).map((cap) => (
                        <button
                          key={cap.id}
                          type="button"
                          data-testid={`catalog-cap-filter-${cap.id}`}
                          onClick={() => setCapabilityFilter(cap.id)}
                          className={`px-2 py-0.2 rounded-full text-[9px] font-bold transition-all border ${
                            capabilityFilter === cap.id
                              ? 'bg-[#0284c7] text-white border-[#38bdf8]'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {cap.label}
                        </button>
                      ))}
                    </div>
                    <span
                      data-testid="catalog-results-count"
                      className="text-[9px] font-mono text-slate-500"
                    >
                      {filteredCatalog.length}/{catalogAssets.length} shown
                    </span>
                  </div>

                  {/* Interactive Blueprint Tag Filter Chips (Compact Single-Line Scroll/Wrap) */}
                  {catalogTagCounts.length > 0 && (
                    <div
                      data-testid="catalog-tag-filter-bar"
                      className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-0.5"
                    >
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                        Tags:
                      </span>
                      {catalogTagCounts.map(({ tag, count }) => {
                        const isTagActive = activeCatalogTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            data-testid={`catalog-tag-chip-${tag}`}
                            onClick={() => handleToggleCatalogTagFilter(tag)}
                            className={`px-1.5 py-0.1 rounded-full text-[8px] font-mono font-bold transition-all border ${
                              isTagActive
                                ? 'bg-[#10b981] text-white border-[#34d399]'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            #{tag} ({count})
                          </button>
                        );
                      })}
                      {(activeCatalogTags.length > 0 ||
                        searchQuery.trim() !== '' ||
                        capabilityFilter !== 'all' ||
                        categoryFilter !== 'all') && (
                        <button
                          type="button"
                          data-testid="catalog-reset-filters-btn"
                          onClick={() => {
                            setActiveCatalogTags([]);
                            setSearchQuery('');
                            setCapabilityFilter('all');
                            setCategoryFilter('all');
                          }}
                          className="ml-auto px-1.5 py-0.1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[8px] font-bold"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Blueprint Tagging & Multi-Modal Asset Creation Inspector Strip */}
                  {activeBlueprint && (
                    <div
                      data-testid="active-blueprint-tag-editor"
                      className="bg-[#f0f9ff] border border-[#bae6fd] rounded-xl px-2 py-1 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-[#0369a1] truncate">
                            {activeBlueprint.name}
                          </span>
                          {activeBlueprint.animationSpec && (
                            <span
                              title={activeBlueprint.animationSpec}
                              className="px-1.5 py-0.1 rounded-full bg-amber-100 text-amber-900 text-[8px] font-bold shrink-0"
                            >
                              🎞️ 8 FPS Anim
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setTexPrompt(`${activeBlueprint.name} — ${activeBlueprint.description || ''}`);
                              setArchitectTab('texture');
                            }}
                            title="Use this item description to synthesize a concept/texture image"
                            className="px-1.5 py-0.2 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-[8px] font-bold text-slate-700"
                          >
                            🖼️ Image
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAi3DPrompt(`${activeBlueprint.name} — ${activeBlueprint.description || ''}`);
                              setArchitectTab('ai3d');
                            }}
                            title="Use this item description in Meshy.ai Image-to-3D & 3D Mesh Forge"
                            className="px-1.5 py-0.2 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-[8px] font-bold text-slate-700"
                          >
                            🧊 3D Model
                          </button>
                          {onSwitchToSoundBoard && (
                            <button
                              type="button"
                              onClick={onSwitchToSoundBoard}
                              title="Open Sound Board to design Foley & audio for this item"
                              className="px-1.5 py-0.2 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-[8px] font-bold text-slate-700"
                            >
                              🔊 Sound
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Blueprint Tag Chips + Add Tag Input */}
                      <div className="flex flex-wrap items-center gap-1">
                        {(activeBlueprint.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.1 rounded-full bg-white border border-slate-300 text-slate-700 text-[8px] font-mono font-semibold"
                          >
                            #{tag}
                            {onUpdateCatalogBlueprint && (
                              <button
                                type="button"
                                aria-label={`Remove tag ${tag} from blueprint`}
                                onClick={() => {
                                  const nextBp = removeTagFromBlueprint(activeBlueprint, tag);
                                  onUpdateCatalogBlueprint(nextBp);
                                  onSelectBlueprint(nextBp);
                                }}
                                className="ml-0.5 text-slate-400 hover:text-rose-600 font-bold"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                        {onUpdateCatalogBlueprint && (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              data-testid="active-blueprint-add-tag-input"
                              value={catalogNewTagInput}
                              onChange={(e) => setCatalogNewTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && catalogNewTagInput.trim()) {
                                  e.preventDefault();
                                  const nextBp = addTagToBlueprint(
                                    activeBlueprint,
                                    catalogNewTagInput
                                  );
                                  onUpdateCatalogBlueprint(nextBp);
                                  onSelectBlueprint(nextBp);
                                  setCatalogNewTagInput('');
                                }
                              }}
                              aria-label="Add Tag to Selected Blueprint"
                              placeholder="+tag..."
                              className="w-16 bg-white border border-slate-300 rounded-full px-1.5 py-0.1 text-[9px] font-mono text-slate-800"
                            />
                            <button
                              type="button"
                              data-testid="active-blueprint-add-tag-btn"
                              onClick={() => {
                                if (!catalogNewTagInput.trim()) return;
                                const nextBp = addTagToBlueprint(
                                  activeBlueprint,
                                  catalogNewTagInput
                                );
                                onUpdateCatalogBlueprint(nextBp);
                                onSelectBlueprint(nextBp);
                                setCatalogNewTagInput('');
                              }}
                              className="px-1.5 py-0.1 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[9px] font-bold"
                            >
                              + Tag
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {filteredCatalog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 text-xs text-slate-500">
                      <span className="font-bold text-slate-700">
                        No catalog blueprints match your search or tag filters
                      </span>
                      <span className="text-[11px] mt-0.5">
                        Try clearing filters or generate a custom 3D model with Meshy.ai Image-to-3D.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pr-1 pb-1">
                      {filteredCatalog.map((bp) => {
                        const active = activeBlueprint?.subType === bp.subType;
                        const topTags = (bp.tags || []).slice(0, 2);
                        return (
                          <button
                            key={bp.subType}
                            type="button"
                            data-testid={`catalog-card-${bp.subType}`}
                            onClick={() => onSelectBlueprint(active ? null : bp)}
                            className={`group flex flex-col rounded-2xl p-1.5 text-left transition-all border ${
                              active
                                ? 'bg-[#ecfdf5] border-[#10b981] shadow-md scale-[1.01]'
                                : 'bg-white hover:bg-[#f8fafc] border-slate-200 hover:border-[#38bdf8] shadow-2xs'
                            }`}
                          >
                            <AssetThumbnailSvg blueprint={bp} active={active} />
                            <div className="mt-1 px-0.5">
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                {bp.name}
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] text-slate-500 font-medium truncate">
                                  {bp.category.replace('_', ' ')}
                                </span>
                                {topTags.length > 0 && (
                                  <span className="text-[8px] font-mono text-sky-600 truncate">
                                    #{topTags[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {architectTab === 'ai3d' && (
                <div className="flex flex-col gap-2 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0369a1]">
                      Meshy.ai Image-to-3D + Google Flash-Lite 3D Forge
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#047857] text-[9px] font-extrabold">
                      meshy-4-image-to-3d + gemini-3.1-flash-lite
                    </span>
                  </div>

                  <input
                    type="text"
                    value={ai3DPrompt}
                    onChange={(e) => setAi3DPrompt(e.target.value)}
                    aria-label="Describe 3D Object to Generate"
                    placeholder="Describe any furniture, appliance, or architectural prop..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-800"
                  />

                  {/* Optional Reference Image for Meshy.ai Image-to-3D */}
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-1.5">
                    <input
                      ref={meshyImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          setMeshyRefImageUrl(String(reader.result || ''));
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {meshyRefImageUrl ? (
                        <img
                          src={meshyRefImageUrl}
                          alt="Meshy Reference"
                          className="w-8 h-8 rounded-lg border border-slate-300 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0369a1] flex items-center justify-center text-xs font-bold shrink-0">
                          3D
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold text-slate-700 truncate">
                          {meshyRefImageUrl
                            ? 'Reference Image Attached for Meshy.ai Image-to-3D'
                            : 'Meshy.ai Image-to-3D Reference (Optional)'}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">
                          Upload an image or attach a Google Flash-Lite synthesized image
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => meshyImageInputRef.current?.click()}
                        className="px-2 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700"
                      >
                        Upload Image
                      </button>
                      {customGeneratedTexUrl && (
                        <button
                          type="button"
                          onClick={() => setMeshyRefImageUrl(customGeneratedTexUrl)}
                          className="px-2 py-1 rounded-full bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] text-[10px] font-bold"
                        >
                          Use Texture
                        </button>
                      )}
                      {meshyRefImageUrl && (
                        <button
                          type="button"
                          onClick={() => setMeshyRefImageUrl(null)}
                          className="px-1.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Quick Presets:</span>
                    {[
                      "Investigator's Leather Notebook & Fountain Pen",
                      '1978 Microcassette Dictaphone & Tape Recorder',
                      '1970s Chrome D-Cell & UV Inspection Flashlight',
                      "Investigator's Evidence Corkboard & Red Yarn",
                      'Brass Master Skeleton Keyring & Room Tags',
                      'Retrofitted Window AC & Conduit Box',
                      'Piecemeal Resident Hotplate & Kitchenette',
                      'Decade-Lived-In Steamer Trunk & Keepsakes',
                      '90s CRT Hotel TV with Built-in VHS',
                      'Porcelain Clawfoot Hotel Bathtub'
                    ].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAi3DPrompt(p)}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-[10px] font-semibold text-slate-700 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={aiForgeBusy}
                      onClick={async () => {
                        await onGenerateAI3DAsset(ai3DPrompt, meshyRefImageUrl);
                        setArchitectTab('catalog');
                      }}
                      className="px-4 py-1.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-xs"
                    >
                      {aiForgeBusy
                        ? 'Forging 3D Mesh...'
                        : meshyRefImageUrl
                        ? 'Run Meshy Image-to-3D & Add to Catalog'
                        : 'Generate 3D Mesh & Add to Catalog'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchitectTab('catalog')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full text-xs"
                    >
                      Back to Catalog
                    </button>
                  </div>
                </div>
              )}

              {architectTab === 'texture' && (
                <div className="flex flex-col gap-2 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0369a1]">
                      Google Flash-Lite Surface &amp; Reference Image Synthesizer
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0369a1] text-[9px] font-extrabold">
                      gemini-3.1-flash-lite-image
                    </span>
                  </div>
                  <input
                    type="text"
                    value={texPrompt}
                    onChange={(e) => setTexPrompt(e.target.value)}
                    aria-label="Describe Surface Texture"
                    placeholder="Describe seamless brick, wood, carpet, or 3D reference image..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={aiForgeBusy}
                      onClick={() => onGenerateCustomTexture(texPrompt)}
                      className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white font-bold rounded-full text-xs"
                    >
                      {aiForgeBusy ? 'Synthesizing...' : 'Synthesize with Flash-Lite Image'}
                    </button>
                    {customGeneratedTexUrl && (
                      <>
                        <img
                          src={customGeneratedTexUrl}
                          alt="Synthesized Texture"
                          className="w-9 h-9 rounded-xl border border-slate-300 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMeshyRefImageUrl(customGeneratedTexUrl);
                            setArchitectTab('ai3d');
                          }}
                          className="px-2.5 py-1 bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#047857] border border-[#a7f3d0] rounded-full text-[10px] font-extrabold"
                        >
                          Send to Meshy Image-to-3D →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {architectTab === 'lore' && (
                <div className="flex flex-col gap-2 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0369a1]">
                      In-Game Architectural Scale &amp; Proportion Reference
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0369a1] text-[9px] font-extrabold">
                      gemini-3.8-flash (ThinkingLevel.LOW)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={loreQuery}
                      onChange={(e) => setLoreQuery(e.target.value)}
                      aria-label="Architectural Reference Query"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={aiForgeBusy}
                      onClick={() => onResearchNycLore(loreQuery)}
                      className="px-3 py-1 bg-[#0284c7] text-white font-bold rounded-full text-xs"
                    >
                      Check Scale
                    </button>
                  </div>
                  {loreSummary && (
                    <div className="text-[11px] text-slate-600 bg-slate-100 rounded-2xl px-3 py-1.5">
                      {loreSummary}
                    </div>
                  )}
                </div>
              )}

              {architectTab === 'models' && (
                <div data-testid="ai-model-compliance-panel" className="flex flex-col gap-1.5 pr-1">
                  <div className="flex items-center justify-between bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl px-2.5 py-1.5">
                    <span className="text-[11px] font-extrabold text-[#065f46]">
                      ⚡ High-Speed Google Gemini + Meshy.ai Stack
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#10b981] text-white text-[9px] font-extrabold">
                      100% Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {Object.values(AI_MODEL_REGISTRY).map((spec) => (
                      <div
                        key={spec.taskKey}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-slate-800 truncate">
                            {spec.taskLabel}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold shrink-0 ${
                              spec.provider === 'Meshy.ai'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-[#e0f2fe] text-[#0369a1]'
                            }`}
                          >
                            {spec.provider}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] font-bold text-[#059669]">
                          {spec.modelId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </StudioWindowFrame>

          {/* 5. 3D OBJECT INSPECTOR WINDOW */}
          <StudioWindowFrame
            windowState={windows.inspector}
            badgeText={
              surfaceSnapEnabled
                ? selectedAsset
                  ? 'Selected · Snap ON'
                  : 'Surface Snap ON'
                : selectedAsset
                ? 'Selected'
                : `${floorAssets.length} on Floor`
            }
            onFocus={onFocusWindow}
            onMove={onMoveWindow}
            onResize={onResizeWindow}
            onToggleMinimize={onToggleMinimizeWindow}
            onToggleMaximize={onToggleMaximizeWindow}
            onClose={onCloseWindow}
          >
            <div className="flex flex-col gap-1.5">
              {/* Surface Snapping Toggle Bar inside the Inspector Window */}
              <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-[#f0f9ff] to-[#ecfdf5] border border-[#bae6fd] rounded-2xl px-2.5 py-1.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-extrabold text-slate-800 leading-tight whitespace-nowrap">
                    🧲 Surface Snapping
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight truncate">
                    {surfaceSnapEnabled
                      ? 'Flush to closest wall/surface'
                      : 'Standard 0.5m grid step'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={surfaceSnapEnabled}
                    aria-label="Toggle Surface Snapping"
                    data-testid="surface-snap-toggle"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleSurfaceSnap();
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all shadow-2xs whitespace-nowrap ${
                      surfaceSnapEnabled
                        ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {surfaceSnapEnabled ? 'ON · Flush' : 'OFF · Grid'}
                  </button>
                  {selectedAsset && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSnapSelectedToSurfaceNow();
                      }}
                      title="Immediately snap selected object flush against the nearest wall or surface on this floor"
                      className="px-2 py-1 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-[10px] font-extrabold shadow-2xs whitespace-nowrap"
                    >
                      Align Flush
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="floor-object-select"
                  className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 shrink-0"
                >
                  Object ({floorAssets.length}):
                </label>
                <select
                  id="floor-object-select"
                  aria-label="Select Scene Object on Current Floor Layer"
                  value={selectedAsset?.id || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    e.currentTarget.blur();
                    onSelectAssetId(val);
                  }}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-bold text-slate-800 truncate"
                >
                  <option value="">-- Select Placed Object --</option>
                  {floorAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.position[0]}m, {a.position[2]}m)
                    </option>
                  ))}
                </select>
              </div>

              {selectedAsset ? (
                <div className="flex flex-col gap-1.5 bg-slate-50/90 border border-slate-200 rounded-2xl p-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label="Selected Object Name"
                      value={selectedAsset.name}
                      onChange={(e) =>
                        onUpdateAsset({
                          ...selectedAsset,
                          name: e.target.value
                        })
                      }
                      className="flex-1 bg-white border border-slate-300 rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-800"
                    />
                    <input
                      type="color"
                      aria-label="Surface Tint Color"
                      value={selectedAsset.color}
                      onChange={(e) =>
                        onUpdateAsset({
                          ...selectedAsset,
                          color: e.target.value
                        })
                      }
                      className="w-6 h-6 rounded-full cursor-pointer border border-slate-300 bg-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-[10px]">
                    <label className="flex flex-col">
                      <span className="text-slate-500 font-semibold">X</span>
                      <input
                        type="number"
                        aria-label="Object X Position"
                        step={0.5}
                        min={-63.5}
                        max={63.5}
                        value={selectedAsset.position[0]}
                        onChange={(e) =>
                          onUpdateAsset({
                            ...selectedAsset,
                            position: [
                              Math.max(-63.5, Math.min(63.5, parseFloat(e.target.value) || 0)),
                              selectedAsset.position[1],
                              selectedAsset.position[2]
                            ]
                          })
                        }
                        className="bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs font-mono"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-slate-500 font-semibold">Z</span>
                      <input
                        type="number"
                        aria-label="Object Z Position"
                        step={0.5}
                        min={-63.5}
                        max={63.5}
                        value={selectedAsset.position[2]}
                        onChange={(e) =>
                          onUpdateAsset({
                            ...selectedAsset,
                            position: [
                              selectedAsset.position[0],
                              selectedAsset.position[1],
                              Math.max(-63.5, Math.min(63.5, parseFloat(e.target.value) || 0))
                            ]
                          })
                        }
                        className="bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs font-mono"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-slate-500 font-semibold">W</span>
                      <input
                        type="number"
                        aria-label="Object Width"
                        step={0.2}
                        min={0.3}
                        max={24}
                        value={selectedAsset.dimensions[0]}
                        onChange={(e) =>
                          onUpdateAsset({
                            ...selectedAsset,
                            dimensions: [
                              clampDimension(parseFloat(e.target.value) || 1, 0.3, 24),
                              selectedAsset.dimensions[1],
                              selectedAsset.dimensions[2]
                            ]
                          })
                        }
                        className="bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs font-mono"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-slate-500 font-semibold">H</span>
                      <input
                        type="number"
                        aria-label="Object Height"
                        step={0.2}
                        min={0.05}
                        max={12}
                        value={selectedAsset.dimensions[1]}
                        onChange={(e) => {
                          const nextH = clampDimension(parseFloat(e.target.value) || 1, 0.05, 12);
                          onUpdateAsset({
                            ...selectedAsset,
                            position: [
                              selectedAsset.position[0],
                              nextH / 2,
                              selectedAsset.position[2]
                            ],
                            dimensions: [
                              selectedAsset.dimensions[0],
                              nextH,
                              selectedAsset.dimensions[2]
                            ]
                          });
                        }}
                        className="bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs font-mono"
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-slate-500 font-semibold">D</span>
                      <input
                        type="number"
                        aria-label="Object Depth"
                        step={0.2}
                        min={0.2}
                        max={24}
                        value={selectedAsset.dimensions[2]}
                        onChange={(e) =>
                          onUpdateAsset({
                            ...selectedAsset,
                            dimensions: [
                              selectedAsset.dimensions[0],
                              selectedAsset.dimensions[1],
                              clampDimension(parseFloat(e.target.value) || 1, 0.2, 24)
                            ]
                          })
                        }
                        className="bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs font-mono"
                      />
                    </label>
                  </div>

                  <select
                    aria-label="Asset Surface Texture"
                    value={selectedAsset.textureId}
                    onChange={(e) => {
                      e.currentTarget.blur();
                      onUpdateAsset({
                        ...selectedAsset,
                        textureId: e.target.value as TexturePresetId
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    {TEXTURE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Surface Material: {t.label}
                      </option>
                    ))}
                  </select>

                  {/* Assigned Asset Sound Selector & Preview */}
                  <div
                    data-testid="inspector-asset-sound-section"
                    className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1"
                  >
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0">
                      🔊 Sound:
                    </span>
                    <select
                      aria-label="Assigned Asset Sound"
                      data-testid="inspector-asset-sound-select"
                      value={selectedAsset.soundPresetId || ''}
                      onChange={(e) => {
                        const val = e.target.value || undefined;
                        e.currentTarget.blur();
                        onUpdateAsset(assignSoundToAssetOrBlueprint(selectedAsset, val));
                      }}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800 truncate"
                    >
                      <option value="">-- No Sound Assigned --</option>
                      {(Object.keys(BUILTIN_SOUND_EFFECTS) as SoundEffectType[]).map((sKey) => (
                        <option key={sKey} value={sKey}>
                          {BUILTIN_SOUND_EFFECTS[sKey].name} ({sKey})
                        </option>
                      ))}
                    </select>
                    {selectedAsset.soundPresetId && (
                      <button
                        type="button"
                        data-testid="inspector-preview-sound-btn"
                        onClick={() => {
                          const presetKey = selectedAsset.soundPresetId as SoundEffectType;
                          if (BUILTIN_SOUND_EFFECTS[presetKey]) {
                            audioEngine.playPresetSound(presetKey);
                          }
                        }}
                        title="Preview assigned asset sound"
                        className="px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[9px] font-extrabold shrink-0"
                      >
                        ▶ Play
                      </button>
                    )}
                    {onSwitchToSoundBoard && (
                      <button
                        type="button"
                        data-testid="inspector-open-soundboard-btn"
                        onClick={() => onSwitchToSoundBoard()}
                        title="Open 3 · Sound Board to create or customize sounds"
                        className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-[9px] font-extrabold shrink-0"
                      >
                        🎛️ Create
                      </button>
                    )}
                  </div>

                  {/* Placed Asset Blueprint Tags Editor */}
                  <div
                    data-testid="inspector-asset-tags-section"
                    className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1"
                  >
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                      Tags:
                    </span>
                    {(selectedAsset.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[9px] font-mono font-semibold"
                      >
                        #{tag}
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag} from selected asset`}
                          onClick={() =>
                            onUpdateAsset(removeTagFromBlueprint(selectedAsset, tag))
                          }
                          className="ml-0.5 text-slate-400 hover:text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        data-testid="inspector-add-tag-input"
                        value={inspectorNewTagInput}
                        onChange={(e) => setInspectorNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inspectorNewTagInput.trim()) {
                            e.preventDefault();
                            onUpdateAsset(addTagToBlueprint(selectedAsset, inspectorNewTagInput));
                            setInspectorNewTagInput('');
                          }
                        }}
                        aria-label="Add Tag to Selected Object"
                        placeholder="+tag"
                        className="w-16 bg-slate-50 border border-slate-300 rounded-full px-1.5 py-0.2 text-[9px] font-mono text-slate-800"
                      />
                      {inspectorNewTagInput.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateAsset(addTagToBlueprint(selectedAsset, inspectorNewTagInput));
                            setInspectorNewTagInput('');
                          }}
                          className="px-1.5 py-0.2 rounded-full bg-[#0284c7] text-white text-[9px] font-bold"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAsset({
                          ...selectedAsset,
                          rotationY: selectedAsset.rotationY + Math.PI / 2
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-full text-[11px] font-bold text-slate-700"
                    >
                      ↻ Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateAsset(selectedAsset)}
                      className="px-2.5 py-1 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] rounded-full text-[11px] font-bold"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={onToggleQuickEditF}
                      className="px-2.5 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded-full text-[11px] font-bold"
                    >
                      Quick Edit [F]
                    </button>
                    <button
                      type="button"
                      onClick={() => onInteractAsset(selectedAsset)}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-full text-[11px] font-bold"
                    >
                      {selectedAsset.isSecretPassage || selectedAsset.category === 'door'
                        ? selectedAsset.isOpen
                          ? 'Close Hinge [E]'
                          : 'Test Hinge [E]'
                        : 'Interact [E]'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveAssetToCatalog(selectedAsset)}
                      className="px-2.5 py-1 bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#065f46] rounded-full text-[11px] font-bold"
                    >
                      + Save to Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => onExportSingleAsset(selectedAsset)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] font-bold"
                    >
                      Export (.json)
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteAsset(selectedAsset.id)}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-full text-[11px] font-bold"
                    >
                      Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center text-center bg-slate-50/80 border border-dashed border-slate-300 rounded-2xl p-3 text-xs text-slate-500">
                  <span className="font-bold text-slate-700 mb-0.5">
                    No 3D Object Selected
                  </span>
                  <span>
                    Click any thumbnail card in the Asset Catalog window to place on the 128×128 tile canvas, or click a 3D object to customize its dimensions &amp; swatches.
                  </span>
                </div>
              )}
            </div>
          </StudioWindowFrame>
        </>
      )}
    </>
  );
};
