import React, { useState, useEffect } from 'react';
import {
  StudioWindowId,
  StudioWindowState,
  KeybindActionId,
  KeybindCategory,
  KeybindingsMap,
  DEFAULT_KEYBIND_SPECS,
  DEFAULT_KEYBINDINGS,
  formatKeyCodeLabel,
  updateActionKeybinding,
  removeActionKeyCode,
  resetActionKeybinding,
  detectKeybindingConflicts
} from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';
import { soundFX } from '../game/soundEffects';

interface KeybindingsWindowProps {
  windowState: StudioWindowState;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  keybindings: KeybindingsMap;
  onChangeKeybindings: (next: KeybindingsMap, statusMessage?: string) => void;
}

const CATEGORY_TABS: { id: 'all' | KeybindCategory; label: string }[] = [
  { id: 'all', label: `All (${DEFAULT_KEYBIND_SPECS.length})` },
  { id: 'movement_stealth', label: '🏃 Movement & Stealth' },
  { id: 'investigation', label: '🔦 Investigation & Mic' },
  { id: 'build_tools', label: '🧱 Build Tools' },
  { id: 'system_modes', label: '⚙️ Modes & Windows' }
];

const QUICK_SELECT_KEY_CODES: string[] = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyC', 'KeyV',
  'KeyB', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyP', 'KeyT',
  'KeyU', 'KeyX', 'KeyY', 'KeyZ',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Enter', 'Tab', 'Escape', 'Delete', 'Backspace',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'PageUp', 'PageDown',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'
];

export const KeybindingsWindow: React.FC<KeybindingsWindowProps> = ({
  windowState,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  keybindings,
  onChangeKeybindings
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | KeybindCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [listeningTarget, setListeningTarget] = useState<{
    actionId: KeybindActionId;
    slotIndex?: number; // undefined means append new key while keeping existing keys
    actionLabel: string;
  } | null>(null);

  const conflicts = detectKeybindingConflicts(keybindings);
  const conflictingActionIds = new Set<KeybindActionId>();
  conflicts.forEach((c) => c.actions.forEach((a) => conflictingActionIds.add(a)));

  // Capture physical keypress when listeningTarget is active
  useEffect(() => {
    if (!listeningTarget) return;

    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Pressing Escape cancels listening unless the user is explicitly rebinding clear_selection
      if (e.code === 'Escape' && listeningTarget.actionId !== 'clear_selection') {
        setListeningTarget(null);
        return;
      }

      const capturedCode = e.code;
      if (!capturedCode) return;

      soundFX.playPlaceAsset();
      const updated = updateActionKeybinding(
        keybindings,
        listeningTarget.actionId,
        capturedCode,
        listeningTarget.slotIndex
      );
      const modeVerb =
        typeof listeningTarget.slotIndex === 'number' ? 'Rebound' : 'Added alternate key';
      onChangeKeybindings(
        updated,
        `⌨️ ${modeVerb} [${formatKeyCodeLabel(capturedCode)}] for "${listeningTarget.actionLabel}".`
      );
      setListeningTarget(null);
    };

    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
  }, [listeningTarget, keybindings, onChangeKeybindings]);

  const filteredSpecs = DEFAULT_KEYBIND_SPECS.filter((spec) => {
    if (activeCategory !== 'all' && spec.category !== activeCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const assignedCodes = keybindings[spec.id] || spec.defaultKeys;
    const keyLabels = assignedCodes.map((c) => formatKeyCodeLabel(c).toLowerCase()).join(' ');
    return (
      spec.label.toLowerCase().includes(q) ||
      spec.description.toLowerCase().includes(q) ||
      keyLabels.includes(q) ||
      assignedCodes.some((c) => c.toLowerCase().includes(q))
    );
  });

  const customizedCount = DEFAULT_KEYBIND_SPECS.filter((spec) => {
    const current = keybindings[spec.id] || [];
    const def = spec.defaultKeys;
    return current.length !== def.length || current.some((k, idx) => k !== def[idx]);
  }).length;

  return (
    <StudioWindowFrame
      windowState={windowState}
      onFocus={onFocus}
      onMove={onMove}
      onResize={onResize}
      onToggleMinimize={onToggleMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
      badgeText={`${DEFAULT_KEYBIND_SPECS.length} Actions · ${
        customizedCount > 0 ? `${customizedCount} Customized` : 'Defaults Bound'
      }`}
    >
      <div className="p-3 space-y-3 text-xs text-slate-800">
        {/* Top Summary & Global Reset Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>⌨️ User-Defined Keybinding & Control Selection</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                All Existing Keys Preserved
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click any bound key badge to replace it, or click <strong>+ Add Key</strong> to bind an additional key without removing existing bindings.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="reset-all-keybindings-btn"
              onClick={() => {
                soundFX.playPlaceAsset();
                setListeningTarget(null);
                onChangeKeybindings(
                  DEFAULT_KEYBINDINGS,
                  '⌨️ Restored all keybindings to their original default assignments.'
                );
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[11px] border border-amber-300 transition"
            >
              ↺ Restore Default Keys
            </button>
          </div>
        </div>

        {/* Active Key Capture Banner */}
        {listeningTarget && (
          <div
            data-testid="keybind-listening-banner"
            className="bg-sky-950 text-sky-100 border-2 border-sky-400 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-md animate-pulse"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500 text-white font-extrabold text-[10px] uppercase">
                Listening
              </span>
              <span className="font-bold text-xs">
                Press any key on your keyboard for &ldquo;{listeningTarget.actionLabel}&rdquo;{' '}
                {typeof listeningTarget.slotIndex === 'number'
                  ? `(Slot #${listeningTarget.slotIndex + 1})`
                  : '(Adding Alternate Key)'}
                ...
              </span>
            </div>
            <button
              type="button"
              onClick={() => setListeningTarget(null)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
            >
              Cancel [Esc]
            </button>
          </div>
        )}

        {/* Conflict Detection Alert */}
        {conflicts.length > 0 && (
          <div
            data-testid="keybind-conflict-banner"
            className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-2.5 space-y-1"
          >
            <div className="font-extrabold text-[11px] flex items-center gap-1.5 text-rose-800">
              <span>⚠️ {conflicts.length} Keybinding Conflict(s) Detected</span>
            </div>
            {conflicts.map((c) => (
              <div key={c.keyCode} className="text-[11px] text-rose-700">
                • {c.scopeNote}
              </div>
            ))}
          </div>
        )}

        {/* Category Filter Tabs & Search Input */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                  activeCategory === tab.id
                    ? 'bg-[#0284c7] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            aria-label="Search Keybindings"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter action or key (e.g. Crouch, Flashlight, E)..."
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 w-56 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Actions Table / List */}
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
          {filteredSpecs.map((spec) => {
            const boundKeys = keybindings[spec.id] || spec.defaultKeys;
            const isCustomized =
              boundKeys.length !== spec.defaultKeys.length ||
              boundKeys.some((k, idx) => k !== spec.defaultKeys[idx]);
            const hasConflict = conflictingActionIds.has(spec.id);

            return (
              <div
                key={spec.id}
                data-testid={`keybind-row-${spec.id}`}
                className={`rounded-xl border p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                  hasConflict
                    ? 'bg-rose-50/70 border-rose-300'
                    : isCustomized
                    ? 'bg-sky-50/60 border-sky-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 text-xs">{spec.label}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                      {spec.modeScope === 'global'
                        ? 'All Modes'
                        : spec.modeScope === 'walkthrough'
                        ? 'Walk Mode'
                        : 'Build Mode'}
                    </span>
                    {spec.isHoldAction && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                        Hold
                      </span>
                    )}
                    {isCustomized && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                        Custom
                      </span>
                    )}
                    {hasConflict && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 text-[10px] font-extrabold">
                        Conflict
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{spec.description}</div>
                </div>

                {/* Bound Keys & Controls */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {boundKeys.map((code, idx) => {
                    const isSlotListening =
                      listeningTarget?.actionId === spec.id && listeningTarget?.slotIndex === idx;
                    return (
                      <div key={`${spec.id}_${code}_${idx}`} className="inline-flex items-center">
                        <button
                          type="button"
                          data-testid={`rebind-slot-${spec.id}-${idx}`}
                          title={`Click then press any key to replace [${formatKeyCodeLabel(code)}] for ${spec.label}`}
                          onClick={() =>
                            setListeningTarget({
                              actionId: spec.id,
                              slotIndex: idx,
                              actionLabel: spec.label
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs border transition ${
                            isSlotListening
                              ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-300'
                              : 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700 shadow-2xs'
                          }`}
                        >
                          {isSlotListening ? 'Press Key...' : formatKeyCodeLabel(code)}
                        </button>
                        {boundKeys.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove ${formatKeyCodeLabel(code)} from ${spec.label}`}
                            title={`Remove [${formatKeyCodeLabel(code)}] binding`}
                            onClick={() => {
                              soundFX.playPlaceAsset();
                              const next = removeActionKeyCode(keybindings, spec.id, code);
                              onChangeKeybindings(
                                next,
                                `Removed [${formatKeyCodeLabel(code)}] from "${spec.label}".`
                              );
                            }}
                            className="ml-0.5 px-1.5 py-1 rounded-md bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 text-[10px] font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* + Add Alternate Key Button (keeps existing keys bound) */}
                  <button
                    type="button"
                    data-testid={`add-key-${spec.id}`}
                    title={`Bind an additional key to "${spec.label}" while keeping existing keys`}
                    onClick={() =>
                      setListeningTarget({
                        actionId: spec.id,
                        slotIndex: undefined,
                        actionLabel: spec.label
                      })
                    }
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] border transition ${
                      listeningTarget?.actionId === spec.id &&
                      listeningTarget?.slotIndex === undefined
                        ? 'bg-sky-600 text-white border-sky-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    + Add Key
                  </button>

                  {/* Quick-Select Key Dropdown (Mouse-only accessibility option) */}
                  <select
                    aria-label={`Quick select key for ${spec.label}`}
                    data-testid={`select-key-${spec.id}`}
                    value=""
                    onChange={(e) => {
                      const chosen = e.target.value;
                      if (!chosen) return;
                      soundFX.playPlaceAsset();
                      const next = updateActionKeybinding(keybindings, spec.id, chosen);
                      onChangeKeybindings(
                        next,
                        `⌨️ Added [${formatKeyCodeLabel(chosen)}] to "${spec.label}".`
                      );
                    }}
                    className="px-1.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                  >
                    <option value="">Pick Key▾</option>
                    {QUICK_SELECT_KEY_CODES.map((kc) => (
                      <option key={kc} value={kc}>
                        {formatKeyCodeLabel(kc)} ({kc})
                      </option>
                    ))}
                  </select>

                  {isCustomized && (
                    <button
                      type="button"
                      data-testid={`reset-action-${spec.id}`}
                      title={`Restore default keys (${spec.defaultKeys
                        .map(formatKeyCodeLabel)
                        .join(' / ')})`}
                      onClick={() => {
                        soundFX.playPlaceAsset();
                        const next = resetActionKeybinding(keybindings, spec.id);
                        onChangeKeybindings(
                          next,
                          `Restored default keys for "${spec.label}".`
                        );
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold"
                    >
                      ↺ Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudioWindowFrame>
  );
};
