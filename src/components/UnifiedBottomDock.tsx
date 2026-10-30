import React, { useState } from 'react';
import {
  FloorId,
  FloorLayer,
  PlacedAsset,
  TexturePresetId,
  clampDimension
} from '../game/rules';
import { AssetBlueprint } from '../game/hotelData';
import { WorkspaceMode } from './HotelViewport3D';
import { AssetThumbnailSvg } from './AssetThumbnailSvg';

interface UnifiedBottomDockProps {
  mode: WorkspaceMode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentFloor: FloorId;
  floorLayers: FloorLayer[];
  onSelectFloor: (floor: FloorId) => void;
  onAddFloorLayer: () => void;
  onToggleFloorLayerVisibility: (floor: FloorId) => void;
  onClearFloor: () => void;
  catalogAssets: AssetBlueprint[];
  floorAssets: PlacedAsset[];
  selectedAsset: PlacedAsset | null;
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
  undoCount: number;
  lastUndoLabel: string | null;
  onUndo: () => void;
  showTPoseMannequin: boolean;
  onToggleTPose: () => void;
  isolateSelectedAsset: boolean;
  onToggleIsolateAsset: () => void;
  showExteriorWalls: boolean;
  onToggleExteriorWalls: () => void;
  onGenerateAI3DAsset: (prompt: string) => Promise<void>;
  onGenerateCustomTexture: (prompt: string) => Promise<void>;
  onResearchNycLore: (query: string) => Promise<void>;
  aiForgeBusy: boolean;
  loreSummary: string | null;
  customGeneratedTexUrl: string | null;
}

const TEXTURE_OPTIONS: { id: TexturePresetId; label: string }[] = [
  { id: 'nyc_old_brick', label: 'NYC Old Brick' },
  { id: 'plaster_cream', label: 'Wainscot Plaster' },
  { id: 'oak_parquet', label: 'Mahogany / Oak' },
  { id: 'checker_marble', label: 'Checker Marble' },
  { id: 'wallpaper_damask', label: 'Damask Wallpaper' },
  { id: 'velvet_crimson', label: 'Crimson Velvet' },
  { id: 'aged_brass', label: 'Aged Brass' },
  { id: 'industrial_concrete', label: 'Basement Concrete' }
];

type CategoryFilter = 'all' | 'architecture' | 'furniture' | 'ai';

export const UnifiedBottomDock: React.FC<UnifiedBottomDockProps> = ({
  mode,
  collapsed,
  onToggleCollapse,
  currentFloor,
  floorLayers,
  onSelectFloor,
  onAddFloorLayer,
  onToggleFloorLayerVisibility,
  onClearFloor,
  catalogAssets,
  floorAssets,
  selectedAsset,
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
  const [architectTab, setArchitectTab] = useState<'catalog' | 'ai3d' | 'texture' | 'lore'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ai3DPrompt, setAi3DPrompt] = useState('Vintage brass hotel luggage cart with velvet cushion');
  const [texPrompt, setTexPrompt] = useState('1920s New York crimson art-deco geometric carpet');
  const [loreQuery, setLoreQuery] = useState('1920s New York hotel room dimensions & transom door proportions');

  const filteredCatalog = catalogAssets.filter((bp) => {
    const matchesSearch =
      !searchQuery.trim() ||
      bp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bp.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'architecture') {
      return (
        bp.category === 'wall' ||
        bp.category === 'secret_wall' ||
        bp.category === 'window_wall' ||
        bp.category === 'door' ||
        bp.category === 'floor_tile'
      );
    }
    if (categoryFilter === 'furniture') {
      return (
        bp.category === 'furniture' ||
        bp.category === 'appliance' ||
        bp.category === 'lighting'
      );
    }
    if (categoryFilter === 'ai') {
      return Boolean(bp.isGenerated || bp.category === 'custom_ai');
    }
    return true;
  });

  // Sort floor layers from highest elevation to lowest (just like Layers in Photoshop/Procreate)
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

  return (
    <>
      {/* 1. RIGHT-SIDE VERTICAL IMAGE-EDITOR FLOOR LAYERS PANEL (Sims Floor Stepper + Photoshop Layers) */}
      <aside
        aria-label="Floor Layers Panel"
        className="fixed right-3 top-16 z-20 w-56 pointer-events-auto bg-white/92 backdrop-blur-md border border-[#cbd5e1] rounded-3xl shadow-lg p-3 text-slate-800 flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-xs font-extrabold tracking-tight text-slate-800">
              Floor Layers ({floorLayers.length})
            </span>
          </div>
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

        {/* + Add Floor Layer Button */}
        <button
          type="button"
          onClick={onAddFloorLayer}
          className="w-full py-1.5 px-3 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <span>+ Add Floor Layer</span>
        </button>

        {/* Quick Floor Layer Dropdown */}
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

        {/* Vertical Scrolling Layer Stack (like Photoshop/GIMP Layers) */}
        <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-0.5">
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
                {/* Eye Visibility Toggle (Onion-Skin / Reference Layer Toggle) */}
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

                {/* Select Layer Button */}
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

        {/* Clear Active Layer Button */}
        <button
          type="button"
          onClick={onClearFloor}
          className="w-full py-1 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold transition-colors"
        >
          Clear Active Layer
        </button>
      </aside>

      {/* 2. BOTTOM SIMS 3 / SIMS 4 BUILD & BUY DOCK (Rounded Pill Design, Vertical Menus, Visual Asset Thumbnails) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(97vw,1220px)] pointer-events-auto flex flex-col items-center">
        {/* Floating Rounded Collapse Handle Pill */}
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="px-4 py-1 bg-white/95 hover:bg-[#f0f9ff] border border-[#cbd5e1] rounded-full text-xs font-bold text-slate-700 shadow-md transition-all"
          >
            {collapsed ? '▲ Open Build & Buy Catalog [H]' : '▾ Minimize Catalog [H]'}
          </button>
        </div>

        {!collapsed && (
          <div className="w-full bg-white/94 backdrop-blur-md border border-[#cbd5e1] rounded-3xl shadow-2xl p-3 text-slate-800">
            {mode !== 'character' ? (
              <div className="grid grid-cols-12 gap-3 items-stretch max-h-[250px]">
                {/* LEFT COLUMN (3 cols): Vertical Mode & Category Menus + Dropdowns */}
                <div className="col-span-3 flex flex-col gap-1.5 border-r border-slate-200 pr-2.5 overflow-y-auto">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284c7]">
                      Build / Buy Tools
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">128×128 Grid</span>
                  </div>

                  {/* Studio Tool Mode Dropdown */}
                  <select
                    aria-label="Studio Tool Panel"
                    value={architectTab}
                    onChange={(e) => {
                      e.currentTarget.blur();
                      setArchitectTab(e.target.value as 'catalog' | 'ai3d' | 'texture' | 'lore');
                    }}
                    className="w-full bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl px-2.5 py-1.5 text-xs font-bold text-[#0369a1]"
                  >
                    <option value="catalog">📦 Build &amp; Buy Visual Catalog ({catalogAssets.length})</option>
                    <option value="ai3d">✨ Meshy / AI 3D Object Generator</option>
                    <option value="texture">🎨 Nano Banana 2.1 Surface Textures</option>
                    <option value="lore">📐 Architectural Scale Reference</option>
                  </select>

                  {/* Category Filter Dropdown */}
                  <select
                    aria-label="Catalog Category Filter"
                    value={categoryFilter}
                    onChange={(e) => {
                      e.currentTarget.blur();
                      setCategoryFilter(e.target.value as CategoryFilter);
                      setArchitectTab('catalog');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-2.5 py-1 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">All Categories ({catalogAssets.length})</option>
                    <option value="architecture">Walls, Doors, Windows &amp; Floors</option>
                    <option value="furniture">Furniture, Beds &amp; Appliances</option>
                    <option value="ai">
                      AI Generated Assets ({catalogAssets.filter((b) => b.isGenerated || b.category === 'custom_ai').length})
                    </option>
                  </select>

                  {/* Vertical Tool Action Pills */}
                  <div className="flex flex-col gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={onClearMouse}
                      className={`w-full px-3 py-1 rounded-full text-xs font-bold text-left flex items-center justify-between transition-all ${
                        !activeBlueprint
                          ? 'bg-[#10b981] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>↖ Select &amp; Modify</span>
                      <span className="text-[10px] opacity-85">[Esc]</span>
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

                {/* CENTER PANEL (5 cols): Visual Asset Thumbnail Grid (Vertical Scrolling Only) */}
                <div className="col-span-5 flex flex-col gap-1.5 border-r border-slate-200 pr-2.5 overflow-hidden">
                  {architectTab === 'catalog' && (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search walls, doors, furniture, AI props..."
                          aria-label="Search Asset Catalog"
                          className="flex-1 bg-slate-100 border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setArchitectTab('ai3d')}
                          className="px-2.5 py-1 rounded-full bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] text-[11px] font-bold whitespace-nowrap"
                        >
                          + AI 3D Prop
                        </button>
                      </div>

                      {/* Vertical Scrolling Grid of Sims-Style Visual Asset Thumbnail Cards */}
                      <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[195px] pr-1 pb-1">
                        {filteredCatalog.map((bp) => {
                          const active = activeBlueprint?.subType === bp.subType;
                          return (
                            <button
                              key={bp.subType}
                              type="button"
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
                                <div className="text-[9px] text-slate-500 font-medium truncate">
                                  {bp.category.replace('_', ' ')}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {architectTab === 'ai3d' && (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[215px] pr-1">
                      <div className="text-xs font-bold text-[#0369a1]">
                        Meshy / AI 3D Mesh Generator (Adds directly to Visual Catalog &amp; 128×128 Lot)
                      </div>
                      <input
                        type="text"
                        value={ai3DPrompt}
                        onChange={(e) => setAi3DPrompt(e.target.value)}
                        aria-label="Describe 3D Object to Generate"
                        placeholder="Describe any furniture, appliance, or architectural prop..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-800"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={aiForgeBusy}
                          onClick={async () => {
                            await onGenerateAI3DAsset(ai3DPrompt);
                            setArchitectTab('catalog');
                          }}
                          className="px-4 py-1.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-xs"
                        >
                          {aiForgeBusy ? 'Forging 3D Mesh...' : 'Generate & Add to Visual Catalog'}
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
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[215px] pr-1">
                      <div className="text-xs font-bold text-[#0369a1]">
                        Gemini Nano Banana 2.1 Surface Texture Synthesizer
                      </div>
                      <input
                        type="text"
                        value={texPrompt}
                        onChange={(e) => setTexPrompt(e.target.value)}
                        aria-label="Describe Surface Texture"
                        placeholder="Describe seamless brick, wood, or carpet texture..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-xs text-slate-800"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={aiForgeBusy}
                          onClick={() => onGenerateCustomTexture(texPrompt)}
                          className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white font-bold rounded-full text-xs"
                        >
                          {aiForgeBusy ? 'Synthesizing...' : 'Synthesize Surface Texture'}
                        </button>
                        {customGeneratedTexUrl && (
                          <img
                            src={customGeneratedTexUrl}
                            alt="Synthesized Texture"
                            className="w-9 h-9 rounded-xl border border-slate-300 object-cover"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {architectTab === 'lore' && (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[215px] pr-1">
                      <div className="text-xs font-bold text-[#0369a1]">
                        Architectural Scale &amp; Proportion Reference
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
                          Search
                        </button>
                      </div>
                      {loreSummary && (
                        <div className="text-[11px] text-slate-600 bg-slate-100 rounded-2xl px-3 py-1.5">
                          {loreSummary}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN (4 cols): Vertical Object Selection Dropdown & Sims-Style Property Inspector */}
                <div className="col-span-4 flex flex-col gap-1.5 overflow-y-auto max-h-[235px] pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="floor-object-select"
                      className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 shrink-0"
                    >
                      Object ({floorAssets.length}):
                    </label>
                    <select
                      id="floor-object-select"
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
                      {/* Name + Surface Texture Dropdown + Color Swatch */}
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

                      {/* Coordinates & Dimensions (X, Z, W, H, D) */}
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

                      {/* Surface Texture Preset Dropdown */}
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

                      {/* Sims-Style Rounded Action Buttons */}
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
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center bg-slate-50/80 border border-dashed border-slate-300 rounded-2xl p-3 text-xs text-slate-500">
                      <span className="font-bold text-slate-700 mb-0.5">
                        No 3D Object Selected
                      </span>
                      <span>
                        Click any thumbnail card on the left to place on the 128×128 tile canvas, or click a 3D object to customize its dimensions &amp; swatches.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-600 px-2 py-1">
                <span className="font-bold text-[#0284c7]">
                  Create-A-Sim / Character Rig Studio Active
                </span>
                <span>
                  Use the rounded vertical panels above to customize proportions, traits, and export character rig JSON.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
