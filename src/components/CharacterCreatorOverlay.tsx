import React, { useState } from 'react';
import {
  CharacterAppearance,
  CharacterStats,
  TRAIT_LIBRARY,
  FloorId,
  allocateStatPoint,
  calculateDerivedStats,
  HotelAgentProfile
} from '../game/rules';

interface CharacterCreatorOverlayProps {
  appearance: CharacterAppearance;
  stats: CharacterStats;
  assignedTraits: string[];
  onChangeAppearance: (next: CharacterAppearance) => void;
  onChangeStats: (next: CharacterStats) => void;
  onChangeTraits: (next: string[]) => void;
  onSaveCharacterRig: (newRig: HotelAgentProfile) => void;
  onExportCharacterRig: (rig: HotelAgentProfile) => void;
}

const ARCHETYPES: CharacterAppearance['archetype'][] = [
  'Detective Clerk',
  'Night Bellhop',
  'Occult Archivist',
  ' eccentric Socialite'
];

const HEAD_SHAPES: CharacterAppearance['headShape'][] = [
  'chibi_block',
  'rounded_toon',
  'tall_noir'
];

const EYE_STYLES: CharacterAppearance['eyeStyle'][] = [
  'wide_amber',
  'narrow_suspicious',
  'hollow_glow',
  'button_dark'
];

const HAIR_STYLES: CharacterAppearance['hairStyle'][] = [
  'swept_pompadour',
  'messy_curls',
  'bob_cut',
  'bowler_hat'
];

const MOUTH_STYLES: CharacterAppearance['mouthStyle'][] = [
  'slight_smirk',
  'nervous_frown',
  'stitched_grin',
  'calm_neutral'
];

const OUTFIT_COLORS = ['#78350f', '#450a0a', '#1e3a8a', '#0f766e', '#581c87', '#374151'];
const HAIR_COLORS = ['#451a03', '#1f2937', '#991b1b', '#d97706', '#9ca3af', '#581c87'];

export const CharacterCreatorOverlay: React.FC<CharacterCreatorOverlayProps> = ({
  appearance,
  stats,
  assignedTraits,
  onChangeAppearance,
  onChangeStats,
  onChangeTraits,
  onSaveCharacterRig,
  onExportCharacterRig
}) => {
  const [charName, setCharName] = useState('Vincent Graves');
  const [targetRoom, setTargetRoom] = useState<{ floor: FloorId; room: string }>({
    floor: 'floor2',
    room: 'Suite 202'
  });
  const [personaMetadata, setPersonaMetadata] = useState(
    'NPC Metadata: Concierge / Resident archetype with modular low-poly rig.'
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const derived = calculateDerivedStats(stats, assignedTraits);

  const handleToggleTrait = (id: string) => {
    if (assignedTraits.includes(id)) {
      onChangeTraits(assignedTraits.filter((t) => t !== id));
    } else if (assignedTraits.length < 4) {
      onChangeTraits([...assignedTraits, id]);
    }
  };

  const buildRigPayload = (): HotelAgentProfile => ({
    id: `char_rig_${Date.now()}`,
    name: charName.trim() || 'Custom Low-Poly Character',
    role: 'tenant',
    roomNumber: targetRoom.room,
    floor: targetRoom.floor,
    position: [2.8, 0, -2.5],
    status: 'present',
    occupation: `${appearance.archetype.trim()} (${targetRoom.room})`,
    personality: personaMetadata,
    secretTruth: 'Exportable NPC behavioral & dialogue seed.',
    knownFacts: [`Spawn Zone: ${targetRoom.room}`],
    memories: [`Created in ArchitectForge Character Studio (${appearance.headShape}).`, personaMetadata],
    suspicionLevel: 15,
    trustLevel: 70,
    appearance,
    stats,
    assignedTraits
  });

  const handleAddRigToPack = () => {
    const rig = buildRigPayload();
    onSaveCharacterRig(rig);
    setSaveFeedback(`Saved "${rig.name}" to Scene & Exportable Asset Pack!`);
  };

  const handleExportRigJson = () => {
    const rig = buildRigPayload();
    onExportCharacterRig(rig);
    setSaveFeedback(`Exported "${rig.name}.json" character asset specification!`);
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex items-start justify-between p-4 mt-14 mb-24">
      {/* Left Sims Create-A-Sim Appearance & Proportions Panel (Vertical Scrolling + Dropdowns) */}
      <div className="pointer-events-auto w-76 max-h-[72vh] overflow-y-auto bg-white/94 backdrop-blur-md border border-[#cbd5e1] rounded-3xl p-4 shadow-xl text-slate-800 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
            Create-A-Character Rig
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#d1fae5] text-[#065f46] text-[10px] font-bold">
            3D Toon Mesh
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Character Name</span>
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              aria-label="Character Rig Name"
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-bold text-slate-800"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Archetype Role</span>
            <select
              value={appearance.archetype}
              onChange={(e) =>
                onChangeAppearance({
                  ...appearance,
                  archetype: e.target.value as CharacterAppearance['archetype']
                })
              }
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-semibold text-slate-800"
            >
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {a.trim()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Head Mesh Shape</span>
            <select
              value={appearance.headShape}
              onChange={(e) =>
                onChangeAppearance({
                  ...appearance,
                  headShape: e.target.value as CharacterAppearance['headShape']
                })
              }
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-semibold text-slate-800"
            >
              {HEAD_SHAPES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Eye Style</span>
              <select
                value={appearance.eyeStyle}
                onChange={(e) =>
                  onChangeAppearance({
                    ...appearance,
                    eyeStyle: e.target.value as CharacterAppearance['eyeStyle']
                  })
                }
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {EYE_STYLES.map((ey) => (
                  <option key={ey} value={ey}>
                    {ey}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Hair / Hat</span>
              <select
                value={appearance.hairStyle}
                onChange={(e) =>
                  onChangeAppearance({
                    ...appearance,
                    hairStyle: e.target.value as CharacterAppearance['hairStyle']
                  })
                }
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {HAIR_STYLES.map((hr) => (
                  <option key={hr} value={hr}>
                    {hr}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Mouth Expression</span>
            <select
              value={appearance.mouthStyle}
              onChange={(e) =>
                onChangeAppearance({
                  ...appearance,
                  mouthStyle: e.target.value as CharacterAppearance['mouthStyle']
                })
              }
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-semibold text-slate-800"
            >
              {MOUTH_STYLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          {/* Outfit & Hair Swatches */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-600">Outfit Swatch:</span>
            <div className="flex items-center gap-1">
              {OUTFIT_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeAppearance({ ...appearance, outfitColor: col })}
                  className={`w-5 h-5 rounded-full border ${
                    appearance.outfitColor === col ? 'ring-2 ring-[#10b981] scale-110' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">Hair Swatch:</span>
            <div className="flex items-center gap-1">
              {HAIR_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeAppearance({ ...appearance, hairColor: col })}
                  className={`w-5 h-5 rounded-full border ${
                    appearance.hairColor === col ? 'ring-2 ring-[#10b981] scale-110' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Proportion Sliders */}
          <div className="pt-1 space-y-1.5 border-t border-slate-200">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Height Scale</span>
              <span className="font-mono font-bold text-[#0284c7]">{appearance.heightScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              aria-label="Character Height Scale"
              min={0.8}
              max={1.25}
              step={0.05}
              value={appearance.heightScale}
              onChange={(e) =>
                onChangeAppearance({ ...appearance, heightScale: parseFloat(e.target.value) })
              }
              className="w-full accent-[#10b981]"
            />

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Head Scale</span>
              <span className="font-mono font-bold text-[#0284c7]">{appearance.headScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              aria-label="Character Head Scale"
              min={0.8}
              max={1.35}
              step={0.05}
              value={appearance.headScale}
              onChange={(e) =>
                onChangeAppearance({ ...appearance, headScale: parseFloat(e.target.value) })
              }
              className="w-full accent-[#10b981]"
            />
          </div>
        </div>
      </div>

      {/* Right Sims Trait & Attribute Panel (Positioned left of the Floor Layers sidebar) */}
      <div className="pointer-events-auto mr-60 w-80 max-h-[72vh] overflow-y-auto bg-white/94 backdrop-blur-md border border-[#cbd5e1] rounded-3xl p-4 shadow-xl text-slate-800 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7]">
            Traits &amp; Rig Export
          </span>
          <span className="text-xs font-bold text-[#10b981]">
            Pts: {stats.pointsRemaining}
          </span>
        </div>

        {/* Stat Allocation */}
        <div className="space-y-1.5">
          {(
            [
              { key: 'physic', label: 'Physic', val: stats.physic },
              { key: 'agility', label: 'Agility', val: stats.agility },
              { key: 'mind', label: 'Mind', val: stats.mind },
              { key: 'endurance', label: 'Endurance', val: stats.endurance }
            ] as const
          ).map((row) => (
            <div key={row.key} className="flex items-center justify-between text-xs bg-slate-50 rounded-full px-3 py-1">
              <span className="font-bold text-slate-700">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeStats(allocateStatPoint(stats, row.key, -1))}
                  className="w-5 h-5 rounded-full bg-white border border-slate-300 font-bold text-slate-700"
                >
                  -
                </button>
                <span className="w-4 text-center font-mono font-bold text-[#0284c7]">{row.val}</span>
                <button
                  type="button"
                  onClick={() => onChangeStats(allocateStatPoint(stats, row.key, 1))}
                  className="w-5 h-5 rounded-full bg-white border border-slate-300 font-bold text-slate-700"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Vertical Traits Selection List */}
        <div className="space-y-1 pt-1">
          <span className="text-[11px] font-bold text-slate-600">
            Assigned Character Traits ({assignedTraits.length}/4):
          </span>
          <div className="max-h-28 overflow-y-auto flex flex-col gap-1 pr-1">
            {TRAIT_LIBRARY.map((trait) => {
              const active = assignedTraits.includes(trait.id);
              return (
                <button
                  key={trait.id}
                  type="button"
                  onClick={() => handleToggleTrait(trait.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-2xl text-xs transition-all border ${
                    active
                      ? 'bg-[#ecfdf5] border-[#10b981] text-[#065f46] font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>{trait.name}</div>
                  <div className="text-[10px] opacity-75 truncate">{trait.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Derived Summary & Save/Export Buttons */}
        <div className="text-[10px] font-mono text-slate-500 bg-slate-50 rounded-2xl px-3 py-1.5 flex justify-between">
          <span>HP {derived.maxHealth}</span>
          <span>STEALTH {derived.stealthRating}%</span>
          <span>SPEED {derived.moveSpeedPct}%</span>
        </div>

        <input
          type="text"
          value={personaMetadata}
          onChange={(e) => setPersonaMetadata(e.target.value)}
          aria-label="Character Behavioral Metadata"
          className="w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-700"
        />

        <div className="flex flex-col gap-1.5 pt-1">
          <button
            type="button"
            onClick={handleAddRigToPack}
            className="w-full py-1.5 px-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold rounded-full text-xs shadow-xs"
          >
            + Place Character Rig in Scene
          </button>
          <button
            type="button"
            onClick={handleExportRigJson}
            className="w-full py-1.5 px-3 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] font-bold rounded-full text-xs"
          >
            Export Character Rig (.json)
          </button>
        </div>

        {saveFeedback && (
          <div className="text-[11px] font-semibold text-[#059669] text-center">
            {saveFeedback}
          </div>
        )}
      </div>
    </div>
  );
};
