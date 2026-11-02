import React, { useState, useRef, useEffect } from 'react';
import {
  AssetConditionVariant,
  computeAssetInteractionVisualState,
  computeUnkemptFlickerCssSpec,
  DEFAULT_GLOBAL_ANIMATION_FPS,
  getAssetVisualDesignVariants,
  GlobalAnimationFps,
  HingeSwingMode,
  isStructuralHotelAsset,
  isUnkemptOrAgedAsset,
  PlacedAsset,
  resolveAssetConditionVariant,
  safeExecuteCatalogOrVariantCallback,
  swapAssetConditionVariant,
  swapAssetVisualDesign,
  TexturePresetId
} from '../game/rules';
import { AssetBlueprint } from '../game/hotelData';

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
  onCopySelected?: () => void;
  onPasteClipboard?: () => void;
  clipboardCount?: number;
  onSaveSelectionAsSet?: (setName: string) => void;
  catalogAssets?: AssetBlueprint[];
  onUpdateAsset?: (updated: PlacedAsset, message?: string) => void;
  onSwapConditionVariant?: (variant: AssetConditionVariant) => void;
  onSwapVisualDesign?: (targetSubType: string | 'next') => void;
  globalAnimationFps?: GlobalAnimationFps;
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
  onExtendWallRow,
  onCopySelected,
  onPasteClipboard,
  clipboardCount = 0,
  onSaveSelectionAsSet,
  catalogAssets = [],
  onUpdateAsset,
  onSwapConditionVariant,
  onSwapVisualDesign,
  globalAnimationFps = DEFAULT_GLOBAL_ANIMATION_FPS
}) => {
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [setNameDraft, setSetNameDraft] = useState<string>('');
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  // Reset custom drag offset if primary asset changes
  useEffect(() => {
    setCustomPos(null);
  }, [primaryAsset?.id]);

  if (!primaryAsset || typeof primaryAsset !== 'object') {
    return null;
  }

  const safeDims: [number, number, number] =
    Array.isArray(primaryAsset.dimensions) && primaryAsset.dimensions.length === 3
      ? [
          Number(primaryAsset.dimensions[0]) || 1,
          Number(primaryAsset.dimensions[1]) || 1,
          Number(primaryAsset.dimensions[2]) || 1
        ]
      : [1, 1, 1];

  const baseLeft = Math.max(16, Math.min(window.innerWidth - 310, screenPosition?.x ?? 24));
  const baseTop = Math.max(82, Math.min(window.innerHeight - 380, screenPosition?.y ?? 96));

  const left = customPos ? customPos.x : baseLeft;
  const top = customPos ? customPos.y : baseTop;

  const activeConditionVariant = safeExecuteCatalogOrVariantCallback(
    () => resolveAssetConditionVariant(primaryAsset),
    'pristine',
    'QuickEdit.resolveAssetConditionVariant'
  );
  const unkemptOrAged = safeExecuteCatalogOrVariantCallback(
    () => isUnkemptOrAgedAsset(primaryAsset),
    false,
    'QuickEdit.isUnkemptOrAgedAsset'
  );
  const flickerSpec = safeExecuteCatalogOrVariantCallback(
    () => computeUnkemptFlickerCssSpec(globalAnimationFps, primaryAsset.id),
    { animationDurationSec: '0.5s', stepCount: 6, animationDelaySec: '0s', fps: globalAnimationFps },
    'QuickEdit.computeUnkemptFlickerCssSpec'
  );
  const interactionState = safeExecuteCatalogOrVariantCallback(
    () => computeAssetInteractionVisualState(primaryAsset),
    {
      isInteractive: true,
      interactionKind: 'general_prop',
      isActivated: Boolean(primaryAsset.isActivated),
      screenState: 'none',
      screenColorHex: primaryAsset.color || '#8a8170',
      screenEmissiveHex: '#000000',
      screenEmissiveIntensity: 0,
      emissiveIntensity: 0,
      emitsLight: false,
      lightColorHex: '#fde68a',
      lightIntensity: 0,
      lightDistance: 0,
      statusLabel: 'STANDBY',
      statusSummary: 'STANDBY',
      actionPromptLabel: 'Interact [E]'
    },
    'QuickEdit.computeAssetInteractionVisualState'
  );
  const visualDesignVariants = safeExecuteCatalogOrVariantCallback(
    () => getAssetVisualDesignVariants(primaryAsset.subType, catalogAssets),
    [],
    'QuickEdit.getAssetVisualDesignVariants'
  );

  const safeBatchModify = (patch: Parameters<typeof onBatchModify>[0]) => {
    safeExecuteCatalogOrVariantCallback(
      () => {
        onBatchModify(patch);
      },
      undefined,
      'QuickEdit.onBatchModify'
    );
  };

  const handleApplyConditionVariant = (targetVariant: AssetConditionVariant) => {
    safeExecuteCatalogOrVariantCallback(
      () => {
        if (onSwapConditionVariant) {
          onSwapConditionVariant(targetVariant);
          return;
        }
        const res = swapAssetConditionVariant(primaryAsset, targetVariant, catalogAssets);
        if (onUpdateAsset) {
          onUpdateAsset(res.swappedAsset, res.message);
        } else {
          onBatchModify({
            color: res.swappedAsset.color,
            textureId: res.swappedAsset.textureId
          });
        }
      },
      undefined,
      `QuickEdit.handleApplyConditionVariant(${targetVariant})`
    );
  };

  const handleSwapVisualDesign = (targetSubType: string | 'next') => {
    safeExecuteCatalogOrVariantCallback(
      () => {
        if (onSwapVisualDesign) {
          onSwapVisualDesign(targetSubType);
          return;
        }
        const res = swapAssetVisualDesign(primaryAsset, targetSubType, catalogAssets);
        if (onUpdateAsset) {
          onUpdateAsset(res.swappedAsset, res.message);
        } else {
          onBatchModify({
            color: res.swappedAsset.color,
            textureId: res.swappedAsset.textureId,
            dimensions: res.swappedAsset.dimensions
          });
        }
      },
      undefined,
      `QuickEdit.handleSwapVisualDesign(${targetSubType})`
    );
  };

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
      style={
        {
          left: `${left}px`,
          top: `${top}px`,
          '--flicker-duration': flickerSpec.animationDurationSec,
          '--flicker-steps': flickerSpec.stepCount,
          '--flicker-delay': flickerSpec.animationDelaySec
        } as React.CSSProperties
      }
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
            <div
              className={`text-xs font-extrabold text-slate-100 truncate ${
                unkemptOrAged ? 'unkempt-aged-flicker' : ''
              }`}
            >
              {selectedCount > 1
                ? `${selectedCount} Assets Selected`
                : primaryAsset.name}
            </div>
            <div className="text-[10px] font-medium text-[#38bdf8] truncate">
              {unkemptOrAged
                ? `🕯️ Atmospheric Flicker (${globalAnimationFps} FPS) · Drag to Move`
                : 'Quick Edit Window · Drag to Move'}
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
                  onClick={() => safeBatchModify({ scaleMultiplier: 0.85 })}
                  className="px-2 py-0.5 rounded-full bg-white hover:bg-[#e0f2fe] border border-slate-300 text-[10px] font-bold text-slate-700"
                >
                  -15%
                </button>
                <button
                  type="button"
                  onClick={() => safeBatchModify({ scaleMultiplier: 1.15 })}
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
                  value={safeDims[0]}
                  onChange={(e) =>
                    safeBatchModify({
                      dimensions: [
                        parseFloat(e.target.value) || 1,
                        safeDims[1],
                        safeDims[2]
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
                  value={safeDims[1]}
                  onChange={(e) =>
                    safeBatchModify({
                      dimensions: [
                        safeDims[0],
                        parseFloat(e.target.value) || 1,
                        safeDims[2]
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
                  value={safeDims[2]}
                  onChange={(e) =>
                    safeBatchModify({
                      dimensions: [
                        safeDims[0],
                        safeDims[1],
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
                value={primaryAsset.color || '#592820'}
                onChange={(e) => safeBatchModify({ color: e.target.value })}
                className="w-5 h-5 rounded-full cursor-pointer border border-slate-300 bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between gap-1 pt-0.5">
              {SWATCH_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color Swatch ${swatch}`}
                  onClick={() => safeBatchModify({ color: swatch })}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    (primaryAsset.color || '').toLowerCase() === swatch.toLowerCase()
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
                safeBatchModify({ textureId: e.target.value as TexturePresetId });
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
                  onChange={(e) => safeBatchModify({ isSecretPassage: e.target.checked })}
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
                    onClick={() => safeBatchModify({ hingeSwingMode: m.id })}
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

          {/* 2C. UNIVERSAL "PRISTINE / UNKEMPT / UPDATED (90S)" CONDITION VARIANT TOGGLE FOR ALL ASSETS */}
          <div
            data-testid="quick-edit-updated-90s-panel"
            className={`bg-violet-950/50 border border-violet-700/60 rounded-2xl p-2 space-y-1.5 ${
              unkemptOrAged ? 'unkempt-aged-flicker' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-300">
                🎭 Pristine / Unkempt / Updated
              </span>
              <span
                data-testid="quick-edit-condition-badge"
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-900 border border-violet-700/60 text-violet-200"
              >
                {isStructuralHotelAsset(primaryAsset.subType, catalogAssets)
                  ? `🏛️ Shell · ${activeConditionVariant.toUpperCase()}`
                  : activeConditionVariant === 'updated'
                  ? '🏨 Updated (90s Set)'
                  : activeConditionVariant === 'unkempt'
                  ? '🏚️ Unkempt (70s Grime)'
                  : '✨ Pristine (1978)'}
              </span>
            </div>

            <div
              data-testid="quick-edit-condition-variant-toggle"
              className="grid grid-cols-3 gap-1"
            >
              <button
                type="button"
                data-testid="quick-edit-condition-pristine-btn"
                onClick={() => handleApplyConditionVariant('pristine')}
                className={`py-1 px-1.5 rounded-full text-[10px] font-bold transition-all ${
                  activeConditionVariant === 'pristine'
                    ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-300'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-emerald-500/60'
                }`}
              >
                ✨ Pristine
              </button>
              <button
                type="button"
                data-testid="quick-edit-condition-unkempt-btn"
                onClick={() => handleApplyConditionVariant('unkempt')}
                className={`py-1 px-1.5 rounded-full text-[10px] font-bold transition-all ${
                  activeConditionVariant === 'unkempt'
                    ? 'bg-amber-700 text-white shadow-2xs ring-1 ring-amber-300'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-amber-500/60'
                }`}
              >
                🏚️ Unkempt
              </button>
              <button
                type="button"
                data-testid="quick-edit-condition-updated-btn"
                onClick={() => handleApplyConditionVariant('updated')}
                className={`py-1 px-1.5 rounded-full text-[10px] font-bold transition-all ${
                  activeConditionVariant === 'updated'
                    ? 'bg-violet-600 text-white shadow-2xs ring-1 ring-violet-300'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-violet-500/60'
                }`}
              >
                🏨 Updated
              </button>
            </div>

            {visualDesignVariants.length > 1 && (
              <div
                data-testid="quick-edit-visual-design-panel"
                className="pt-1 border-t border-violet-800/50 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-violet-300">
                    🎨 Visual Design ({visualDesignVariants.length} Meshy.ai 3D Models)
                  </span>
                  <button
                    type="button"
                    data-testid="quick-edit-cycle-visual-design-btn"
                    onClick={() => handleSwapVisualDesign('next')}
                    className="px-2 py-0.5 rounded-full bg-violet-700/80 hover:bg-violet-600 text-white text-[9px] font-bold"
                  >
                    ⟳ Next Design
                  </button>
                </div>
                <select
                  aria-label="Quick Edit Visual Design Variant"
                  data-testid="quick-edit-visual-design-select"
                  value={primaryAsset.subType}
                  onChange={(e) => {
                    e.currentTarget.blur();
                    handleSwapVisualDesign(e.target.value);
                  }}
                  className="w-full bg-slate-900/90 border border-violet-700/60 rounded-full px-2 py-0.5 text-[10px] font-semibold text-violet-100"
                >
                  {visualDesignVariants.map((design, idx) => (
                    <option key={design.subType} value={design.subType}>
                      Design {idx + 1}: {design.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. COMMON EDITING & INTERACTIVE STATE ACTIONS */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => safeBatchModify({ rotationDeltaY: Math.PI / 2 })}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] font-bold text-slate-700"
            >
              ↻ Rotate 90°
            </button>
            <button
              type="button"
              data-testid="quick-edit-interact-e-btn"
              onClick={() =>
                safeExecuteCatalogOrVariantCallback(
                  () => onInteractKeyE(primaryAsset),
                  undefined,
                  'QuickEdit.onInteractKeyE'
                )
              }
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all truncate ${
                primaryAsset.isActivated
                  ? 'bg-emerald-600 text-white ring-1 ring-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
              }`}
              title={interactionState.statusSummary}
            >
              {primaryAsset.isSecretPassage || primaryAsset.category === 'door' || primaryAsset.category === 'secret_wall'
                ? `${primaryAsset.isOpen ? 'Close' : 'Open'} 500ms [E]`
                : interactionState.actionPromptLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                safeExecuteCatalogOrVariantCallback(
                  () => onDuplicate(primaryAsset),
                  undefined,
                  'QuickEdit.onDuplicate'
                )
              }
              className="px-2.5 py-1 bg-[#e0f2fe] hover:bg-[#bae6fd] rounded-full text-[11px] font-bold text-[#0369a1]"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() =>
                safeExecuteCatalogOrVariantCallback(
                  () => onDeleteSelected(),
                  undefined,
                  'QuickEdit.onDeleteSelected'
                )
              }
              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 rounded-full text-[11px] font-bold text-rose-700"
            >
              Delete ({selectedCount})
            </button>
            {onCopySelected && (
              <button
                type="button"
                data-testid="quick-edit-copy-btn"
                onClick={() =>
                  safeExecuteCatalogOrVariantCallback(
                    () => onCopySelected(),
                    undefined,
                    'QuickEdit.onCopySelected'
                  )
                }
                className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 rounded-full text-[11px] font-bold text-sky-900"
              >
                📋 Copy ({selectedCount}) [Ctrl+C]
              </button>
            )}
            {onPasteClipboard && (
              <button
                type="button"
                data-testid="quick-edit-paste-btn"
                disabled={clipboardCount === 0}
                onClick={() =>
                  safeExecuteCatalogOrVariantCallback(
                    () => onPasteClipboard(),
                    undefined,
                    'QuickEdit.onPasteClipboard'
                  )
                }
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-40 rounded-full text-[11px] font-bold text-emerald-900"
              >
                📥 Paste ({clipboardCount}) [Ctrl+V]
              </button>
            )}
            {onSaveSelectionAsSet && (
              <div className="col-span-2 flex items-center gap-1 bg-slate-50/90 border border-slate-200 rounded-full px-2 py-0.5">
                <input
                  type="text"
                  data-testid="quick-edit-set-name-input"
                  value={setNameDraft}
                  onChange={(e) => setSetNameDraft(e.target.value)}
                  placeholder={`Set name (${selectedCount} ${selectedCount === 1 ? 'item' : 'items'})...`}
                  className="flex-1 bg-transparent text-[10px] font-bold text-slate-800 px-1 focus:outline-none"
                />
                <button
                  type="button"
                  data-testid="quick-edit-save-set-btn"
                  onClick={() =>
                    safeExecuteCatalogOrVariantCallback(
                      () => {
                        onSaveSelectionAsSet(
                          setNameDraft.trim() ||
                            (selectedCount === 1
                              ? `${primaryAsset.name} Set`
                              : `${primaryAsset.name} + ${selectedCount - 1} Items Set`)
                        );
                        setSetNameDraft('');
                      },
                      undefined,
                      'QuickEdit.onSaveSelectionAsSet'
                    )
                  }
                  className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-[10px] font-extrabold shrink-0"
                >
                  + Save Set
                </button>
              </div>
            )}
            {primaryAsset.category === 'wall' && onExtendWallRow && (
              <button
                type="button"
                data-testid="extend-wall-row-btn"
                onClick={() =>
                  safeExecuteCatalogOrVariantCallback(
                    () => onExtendWallRow(primaryAsset),
                    undefined,
                    'QuickEdit.onExtendWallRow'
                  )
                }
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
