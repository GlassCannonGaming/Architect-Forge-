import React, { useState, useRef, useEffect } from 'react';
import { HingeSwingMode, PlacedAsset, TexturePresetId } from '../game/rules';

interface QuickEditWindowFProps {
  primaryAsset: PlacedAsset;
  selectedCount: number;
  screenPosition: { x: number; y: number };
  onClose: () => void;
  onBatchModify: (patch: {
    color?: string;
    textureId?: TexturePresetId;
    scaleMultiplier?: number;
    dimensions?: [number, number, number];
    rotationDeltaY?: number;
    hingeSwingMode?: HingeSwingMode;
    isSecretPassage?: boolean;
  }) => void;
  onInteractKeyE: (asset: PlacedAsset) => void;
  onDuplicate: (asset: PlacedAsset) => void;
  onDeleteSelected: () => void;
  onExtendWallRow?: (asset: PlacedAsset) => void;
}

const SWATCH_COLORS = [
  '#592820', // Soot-Stained Brick
  '#8a8170', // Nicotine Plaster
  '#3b2314', // Dark Walnut Trim
  '#4a181b', // Dried Oxblood
  '#4a5438', // 70s Faded Avocado
  '#6e562f', // 70s Harvest Ochre
  '#5e4c2e', // Tarnished Brass
  '#242220'  // Corroded Cast Iron
];

const TEXTURE_OPTIONS: { id: TexturePresetId; label: string }[] = [
  { id: 'nyc_old_brick', label: 'Soot-Stained Brick' },
  { id: 'plaster_cream', label: 'Nicotine Wainscot' },
  { id: 'oak_parquet', label: 'Worn Dark Walnut' },
  { id: 'checker_marble', label: '70s Cracked Linoleum' },
  { id: 'wallpaper_damask', label: 'Peeling 70s Wallpaper' },
  { id: 'velvet_crimson', label: 'Threadbare Oxblood' },
  { id: 'aged_brass', label: 'Tarnished Bronze' },
  { id: 'industrial_concrete', label: 'Damp Cellar Concrete' }
];

export const QuickEditWindowF: React.FC<QuickEditWindowFProps> = ({
  primaryAsset,
  selectedCount,
  screenPosition,
  onClose,
  onBatchModify,
  onInteractKeyE,
  onDuplicate,
  onDeleteSelected,
  onExtendWallRow
}) => {
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const [minimized, setMinimized] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  // Reset custom drag offset if primary asset changes
  useEffect(() => {
    setCustomPos(null);
  }, [primaryAsset.id]);

  const baseLeft = Math.max(16, Math.min(window.innerWidth - 310, screenPosition.x));
  const baseTop = Math.max(82, Math.min(window.innerHeight - 380, screenPosition.y));

  const left = customPos ? customPos.x : baseLeft;
  const top = customPos ? customPos.y : baseTop;

  const handleTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: left,
      originY: top
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const nx = Math.max(8, Math.min(window.innerWidth - 260, dragRef.current.originX + (ev.clientX - dragRef.current.startX)));
      const ny = Math.max(54, Math.min(window.innerHeight - 80, dragRef.current.originY + (ev.clientY - dragRef.current.startY)));
      setCustomPos({ x: nx, y: ny });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      role="dialog"
      aria-label="Quick Asset Editor [F]"
      data-testid="quick-edit-window-f"
      style={{ left: `${left}px`, top: `${top}px` }}
      className="studio-dark-window fixed z-40 w-72 pointer-events-auto bg-slate-900/95 backdrop-blur-md border-2 border-[#38bdf8] rounded-3xl shadow-2xl overflow-hidden text-slate-100 transition-shadow"
    >
      {/* Draggable Window Title Bar with Minimize & Close [F] (Dark Mode) */}
      <div
        onPointerDown={handleTitlePointerDown}
        className="cursor-move select-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-500 text-xs font-bold">⋮⋮</span>
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
            F
          </span>
          <div className="truncate">
            <div className="text-xs font-extrabold text-slate-100 truncate">
              {selectedCount > 1
                ? `${selectedCount} Assets Selected`
                : primaryAsset.name}
            </div>
            <div className="text-[10px] font-medium text-[#38bdf8]">
              Quick Edit Window · Drag to Move
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? 'Restore Quick Edit Window' : 'Minimize Quick Edit Window'}
            className="w-5 h-5 rounded-full bg-amber-950/90 hover:bg-amber-900 text-amber-200 text-[10px] font-bold flex items-center justify-center border border-amber-700/70"
          >
            {minimized ? '▲' : '—'}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Quick Edit Window [F]"
            className="px-2 py-0.5 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-200 text-[10px] font-bold shrink-0 border border-rose-700/70"
          >
            ✕ [F]
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-3.5 space-y-2.5">
          {/* 1. RESIZE CONTROLS (Uniform Scale + W / H / D Dimensions) */}
          <div className="space-y-1.5 bg-slate-50/90 border border-slate-200 rounded-2xl p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                Resize Dimensions
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onBatchModify({ scaleMultiplier: 0.85 })}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-[#e0f2fe] border border-slate-300 text-[10px] font-bold text-slate-700"
                >
                  -15%
                </button>
                <button
                  type="button"
                  onClick={() => onBatchModify({ scaleMultiplier: 1.15 })}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-[#e0f2fe] border border-slate-300 text-[10px] font-bold text-slate-700"
                >
                  +15%
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <label className="flex flex-col">
                <span className="text-slate-500 font-semibold">Width (m)</span>
                <input
                  type="number"
                  aria-label="Quick Edit Width"
                  step={0.2}
                  min={0.3}
                  max={24}
                  value={primaryAsset.dimensions[0]}
                  onChange={(e) =>
                    onBatchModify({
                      dimensions: [
                        parseFloat(e.target.value) || 1,
                        primaryAsset.dimensions[1],
                        primaryAsset.dimensions[2]
                      ]
                    })
                  }
                  className="mt-0.5 bg-white border border-slate-300 rounded-xl px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-slate-500 font-semibold">Height (m)</span>
                <input
                  type="number"
                  aria-label="Quick Edit Height"
                  step={0.2}
                  min={0.05}
                  max={12}
                  value={primaryAsset.dimensions[1]}
                  onChange={(e) =>
                    onBatchModify({
                      dimensions: [
                        primaryAsset.dimensions[0],
                        parseFloat(e.target.value) || 1,
                        primaryAsset.dimensions[2]
                      ]
                    })
                  }
                  className="mt-0.5 bg-white border border-slate-300 rounded-xl px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-slate-500 font-semibold">Depth (m)</span>
                <input
                  type="number"
                  aria-label="Quick Edit Depth"
                  step={0.2}
                  min={0.2}
                  max={24}
                  value={primaryAsset.dimensions[2]}
                  onChange={(e) =>
                    onBatchModify({
                      dimensions: [
                        primaryAsset.dimensions[0],
                        primaryAsset.dimensions[1],
                        parseFloat(e.target.value) || 1
                      ]
                    })
                  }
                  className="mt-0.5 bg-white border border-slate-300 rounded-xl px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800"
                />
              </label>
            </div>
          </div>

          {/* 2. ALTER COLOR & SURFACE SWATCHES */}
          <div className="space-y-1.5 bg-slate-50/90 border border-slate-200 rounded-2xl p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                Alter Color &amp; Swatch
              </span>
              <input
                type="color"
                aria-label="Quick Edit Custom Color"
                value={primaryAsset.color}
                onChange={(e) => onBatchModify({ color: e.target.value })}
                className="w-5 h-5 rounded-full cursor-pointer border border-slate-300 bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between gap-1 pt-0.5">
              {SWATCH_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color Swatch ${swatch}`}
                  onClick={() => onBatchModify({ color: swatch })}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    primaryAsset.color.toLowerCase() === swatch.toLowerCase()
                      ? 'ring-2 ring-[#10b981] scale-115 border-white'
                      : 'border-slate-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>

            <select
              aria-label="Quick Edit Material Preset"
              value={primaryAsset.textureId}
              onChange={(e) => {
                e.currentTarget.blur();
                onBatchModify({ textureId: e.target.value as TexturePresetId });
              }}
              className="mt-1 w-full bg-white border border-slate-300 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-700"
            >
              {TEXTURE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  Material: {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2B. PROPOSAL 2: HINGE SWING MODE SELECTOR (500MS TRANSITION + FOLEY) */}
          <div
            data-testid="quick-edit-hinge-mode-panel"
            className="bg-amber-50/85 border border-amber-200 rounded-2xl p-2 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                🚪 500ms Hinge / Slide Mode
              </span>
              <label className="flex items-center gap-1 text-[10px] font-bold text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(primaryAsset.isSecretPassage || primaryAsset.category === 'secret_wall')}
                  onChange={(e) => onBatchModify({ isSecretPassage: e.target.checked })}
                  className="accent-amber-600 rounded"
                />
                <span>Secret Passage</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: 'right_hinge', label: 'Right Hinge' },
                  { id: 'left_hinge', label: 'Left Hinge' },
                  { id: 'pocket_slide', label: 'Pocket Slide' }
                ] as { id: HingeSwingMode; label: string }[]
              ).map((m) => {
                const activeMode = primaryAsset.hingeSwingMode || 'right_hinge';
                const isSelected = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`hinge-mode-${m.id}`}
                    onClick={() => onBatchModify({ hingeSwingMode: m.id })}
                    className={`py-1 px-1.5 rounded-full text-[10px] font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. COMMON EDITING ACTIONS */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onBatchModify({ rotationDeltaY: Math.PI / 2 })}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] font-bold text-slate-700"
            >
              ↻ Rotate 90°
            </button>
            <button
              type="button"
              data-testid="quick-edit-interact-e-btn"
              onClick={() => onInteractKeyE(primaryAsset)}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-full text-[11px] font-bold text-amber-900"
            >
              {primaryAsset.isSecretPassage || primaryAsset.category === 'door' || primaryAsset.category === 'secret_wall'
                ? `${primaryAsset.isOpen ? 'Close' : 'Open'} 500ms [E]`
                : 'Interact [E]'}
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(primaryAsset)}
              className="px-2.5 py-1 bg-[#e0f2fe] hover:bg-[#bae6fd] rounded-full text-[11px] font-bold text-[#0369a1]"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 rounded-full text-[11px] font-bold text-rose-700"
            >
              Delete ({selectedCount})
            </button>
            {primaryAsset.category === 'wall' && onExtendWallRow && (
              <button
                type="button"
                data-testid="extend-wall-row-btn"
                onClick={() => onExtendWallRow(primaryAsset)}
                title="Activate Wall Drag Tool using this wall's style and dimensions"
                className="col-span-2 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full text-[11px] font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>🧱</span>
                <span>Extend Wall Row (Click &amp; Drag)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
