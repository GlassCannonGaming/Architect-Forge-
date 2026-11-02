import React from 'react';
import { AssetBlueprint } from '../game/hotelData';

interface AssetThumbnailSvgProps {
  blueprint: AssetBlueprint;
  active?: boolean;
}

export const AssetThumbnailSvg: React.FC<AssetThumbnailSvgProps> = ({ blueprint, active }) => {
  if (!blueprint) {
    return <div className="relative w-full h-16 rounded-xl bg-stone-900/60" />;
  }
  const subType = blueprint.subType || '';
  const category = blueprint.category || 'furniture';
  const defaultColor = blueprint.defaultColor || '#592820';
  const safeDims: [number, number, number] =
    Array.isArray(blueprint.defaultDimensions) && blueprint.defaultDimensions.length >= 2
      ? [
          Number(blueprint.defaultDimensions[0]) || 1,
          Number(blueprint.defaultDimensions[1]) || 1,
          Number(blueprint.defaultDimensions[2]) || 1
        ]
      : [1, 1, 1];

  return (
    <div
      className={`relative w-full h-16 rounded-xl overflow-hidden flex items-center justify-center transition-all ${
        active
          ? 'bg-gradient-to-b from-[#2b241d] via-[#362c22] to-[#1f1a15] ring-2 ring-[#b45309]'
          : 'bg-gradient-to-b from-[#1c1a18] via-[#262320] to-[#171513] group-hover:from-[#262320] group-hover:to-[#302b25]'
      }`}
    >
      {/* Subtle Build Mode Floor Tile Grid in Thumbnail Background */}
      <svg
        viewBox="0 0 120 80"
        className="w-full h-full object-contain drop-shadow-sm"
        aria-hidden="true"
      >
        {/* Isometric studio pedestal grid */}
        <polygon
          points="60,52 96,65 60,76 24,65"
          fill="#2e2924"
          fillOpacity="0.85"
          stroke="#574c3f"
          strokeWidth="0.7"
        />
        <line x1="42" y1="58.5" x2="78" y2="70.5" stroke="#443c32" strokeWidth="0.5" />
        <line x1="78" y1="58.5" x2="42" y2="70.5" stroke="#443c32" strokeWidth="0.5" />

        {/* Render distinct isometric 3D asset illustration by subType/category */}
        {(subType.includes('brick_wall') || category === 'wall') && !subType.includes('plaster') && (
          <g>
            {/* Isometric 3D Soot-Stained Brick Wall Segment */}
            <polygon points="30,22 76,36 76,66 30,52" fill={defaultColor || '#592820'} stroke="#241612" strokeWidth="1" />
            <polygon points="76,36 88,30 88,60 76,66" fill="#3d1b15" stroke="#241612" strokeWidth="1" />
            <polygon points="30,22 42,16 88,30 76,36" fill="#8a8170" stroke="#3f3a34" strokeWidth="1" />
            {/* Brick mortar lines */}
            <line x1="30" y1="32" x2="76" y2="46" stroke="#a8a29e" strokeWidth="0.7" strokeOpacity="0.4" />
            <line x1="30" y1="42" x2="76" y2="56" stroke="#a8a29e" strokeWidth="0.7" strokeOpacity="0.4" />
          </g>
        )}

        {subType.includes('plaster') && (
          <g>
            {/* Nicotine-Stained Plaster & Dark Walnut Wainscot Wall */}
            <polygon points="30,22 76,36 76,54 30,40" fill="#8a8170" stroke="#44403c" strokeWidth="1" />
            <polygon points="30,40 76,54 76,66 30,52" fill="#3b2314" stroke="#1c1917" strokeWidth="1" />
            <polygon points="76,36 86,31 86,61 76,66" fill="#6b6356" stroke="#44403c" strokeWidth="1" />
            <polygon points="30,22 40,17 86,31 76,36" fill="#9c9280" stroke="#44403c" strokeWidth="1" />
          </g>
        )}

        {category === 'window_wall' && (
          <g>
            {/* Soot Brick Wall with Grimy Nocturnal Sash Window */}
            <polygon points="28,20 78,35 78,66 28,51" fill="#52241c" stroke="#241612" strokeWidth="1" />
            <polygon points="78,35 88,29 88,60 78,66" fill="#381812" stroke="#241612" strokeWidth="1" />
            <polygon points="28,20 38,14 88,29 78,35" fill="#8a8170" stroke="#3f3a34" strokeWidth="1" />
            {/* Sodium-Vapor Dim Amber Window */}
            <polygon points="41,29 66,37 66,56 41,48" fill="#3a444a" stroke="#9a7b4f" strokeWidth="1.3" />
            <line x1="53.5" y1="33" x2="53.5" y2="52" stroke="#241612" strokeWidth="1.2" />
            <line x1="41" y1="39" x2="66" y2="47" stroke="#241612" strokeWidth="1.2" />
          </g>
        )}

        {category === 'secret_wall' && (
          <g>
            {/* Pivoting Secret Bookshelf Wall */}
            <polygon points="34,18 74,30 74,66 34,54" fill="#3b2314" stroke="#1c110a" strokeWidth="1.2" />
            <polygon points="74,30 84,24 84,60 74,66" fill="#29170c" stroke="#1c110a" strokeWidth="1" />
            <polygon points="34,18 44,12 84,24 74,30" fill="#4d2e1b" stroke="#1c110a" strokeWidth="1" />
            {/* Shelves & weathered 1970s ledger spines */}
            <line x1="37" y1="31" x2="71" y2="41" stroke="#1c110a" strokeWidth="2" />
            <line x1="37" y1="43" x2="71" y2="53" stroke="#1c110a" strokeWidth="2" />
            <rect x="41" y="24" width="4" height="7" fill="#591c1c" transform="skewY(16)" />
            <rect x="47" y="23" width="4" height="8" fill="#334147" transform="skewY(16)" />
            <rect x="54" y="24" width="4" height="7" fill="#6e562f" transform="skewY(16)" />
            <rect x="43" y="36" width="5" height="7" fill="#4a5438" transform="skewY(16)" />
            <rect x="51" y="36" width="4" height="7" fill="#5e4c2e" transform="skewY(16)" />
          </g>
        )}

        {category === 'door' && (
          <g>
            {/* Scuffed Transom Corridor Door */}
            <polygon points="40,16 72,26 72,66 40,56" fill="#3b2314" stroke="#1c110a" strokeWidth="1.4" />
            <polygon points="72,26 79,22 79,62 72,66" fill="#29170c" stroke="#1c110a" strokeWidth="1" />
            {/* Frosted smoky transom glass top */}
            <polygon points="44,20 68,28 68,34 44,26" fill="#4a5559" stroke="#6e562f" strokeWidth="1" />
            {/* Tarnished brass doorknob */}
            <circle cx="66" cy="47" r="2.3" fill="#8c6d3b" stroke="#3b2314" strokeWidth="0.7" />
          </g>
        )}

        {category === 'floor_tile' && (
          <g>
            {/* Threadbare Isometric Parlor Rug */}
            <polygon
              points="60,36 98,51 60,67 22,51"
              fill={defaultColor || '#4a181b'}
              stroke="#6e562f"
              strokeWidth="1.5"
            />
            <polygon
              points="60,41 86,51 60,62 34,51"
              fill="none"
              stroke="#8c734b"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          </g>
        )}

        {subType.includes('bed') && (
          <g>
            {/* Faded Oxblood Suite Bed */}
            <polygon points="32,45 64,34 90,44 58,56" fill="#4a181b" stroke="#260b0d" strokeWidth="1" />
            <polygon points="32,45 58,56 58,64 32,53" fill="#3b2314" stroke="#1c110a" strokeWidth="1" />
            <polygon points="58,56 90,44 90,52 58,64" fill="#29170c" stroke="#1c110a" strokeWidth="1" />
            {/* Yellowed ecru pillows */}
            <polygon points="56,37 68,41 62,45 50,40" fill="#968d7b" stroke="#57534e" strokeWidth="0.8" />
            {/* Four Dark Walnut Posts */}
            <line x1="33" y1="53" x2="33" y2="23" stroke="#3b2314" strokeWidth="2.5" />
            <line x1="58" y1="63" x2="58" y2="31" stroke="#3b2314" strokeWidth="2.5" />
            <line x1="64" y1="35" x2="64" y2="15" stroke="#3b2314" strokeWidth="2.2" />
            <line x1="89" y1="45" x2="89" y2="22" stroke="#3b2314" strokeWidth="2.2" />
          </g>
        )}

        {category === 'furniture' && !subType.includes('bed') && (
          <g>
            {/* Worn Walnut Night Clerk Desk / 70s Furniture Piece */}
            <polygon points="28,36 62,25 92,37 58,48" fill={defaultColor || '#472a18'} stroke="#1c110a" strokeWidth="1" />
            <polygon points="28,36 58,48 58,65 28,53" fill="#361f11" stroke="#1c110a" strokeWidth="1" />
            <polygon points="58,48 92,37 92,54 58,65" fill="#26160c" stroke="#1c110a" strokeWidth="1" />
            {/* Tarnished service bell & oxblood guest ledger */}
            <polygon points="52,35 64,39 59,43 47,39" fill="#4a181b" />
            <circle cx="72" cy="36" r="2.5" fill="#8c6d3b" />
          </g>
        )}

        {category === 'appliance' && (
          <g>
            {/* Late-70s Woodgrain CRT / Harvest-Gold Appliance / Corroded Radiator */}
            <polygon
              points="42,20 74,30 74,64 42,54"
              fill={defaultColor || '#5e4c2e'}
              stroke="#1f1d1b"
              strokeWidth="1.2"
            />
            <polygon points="74,30 84,24 84,58 74,64" fill="#3d3934" stroke="#1f1d1b" strokeWidth="1" />
            <polygon points="42,20 52,14 84,24 74,30" fill="#787062" stroke="#1f1d1b" strokeWidth="1" />
            <line x1="46" y1="36" x2="70" y2="44" stroke="#292524" strokeWidth="1.2" />
            <circle cx="67" cy="34" r="2" fill="#b45309" />
            <circle cx="67" cy="49" r="2" fill="#785c38" />
          </g>
        )}

        {category === 'lighting' && (
          <g>
            {/* Detective's Desk & Faded Avocado Banker's Lamp */}
            <polygon points="32,42 62,32 88,42 58,52" fill="#3b2314" stroke="#1c110a" strokeWidth="1" />
            <polygon points="34,52 34,65 38,65 38,52" fill="#26160c" />
            <polygon points="82,44 82,58 86,58 86,44" fill="#26160c" />
            {/* Avocado shade & dim tungsten glow */}
            <circle cx="60" cy="30" r="9" fill="#b45309" fillOpacity="0.35" />
            <line x1="60" y1="41" x2="60" y2="29" stroke="#6e562f" strokeWidth="2.2" />
            <polygon points="51,29 69,29 64,22 56,22" fill="#4a5438" stroke="#262e1d" strokeWidth="1" />
          </g>
        )}

        {subType === 'investigator_notebook_prop' && (
          <g>
            {/* Open Leather-Bound Detective Notebook & Brass Pen */}
            <polygon points="28,44 60,33 92,44 60,56" fill="#4a1c17" stroke="#1c110a" strokeWidth="1.2" />
            <polygon points="33,43 59,35 59,52 33,49" fill="#d8ccb8" stroke="#78716c" strokeWidth="0.7" />
            <polygon points="61,35 87,43 87,49 61,52" fill="#d8ccb8" stroke="#78716c" strokeWidth="0.7" />
            {/* Crimson bookmark ribbon & brass pen */}
            <line x1="60" y1="35" x2="60" y2="59" stroke="#7f1d1d" strokeWidth="1.6" />
            <line x1="66" y1="38" x2="84" y2="50" stroke="#9a7b38" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {subType === 'microcassette_player_prop' && (
          <g>
            {/* 1978 Brushed Aluminum & Charcoal Microcassette Dictaphone */}
            <polygon points="34,42 64,31 88,41 58,52" fill="#262626" stroke="#171717" strokeWidth="1.2" />
            <polygon points="38,41 62,33 82,40 58,48" fill="#a39e93" stroke="#44403c" strokeWidth="0.8" />
            {/* Dual tape spools window */}
            <polygon points="48,39 62,35 72,39 58,44" fill="#3b3731" stroke="#1c1917" strokeWidth="0.8" />
            <circle cx="56" cy="39.5" r="2.2" fill="#d6d3d1" />
            <circle cx="64" cy="39.5" r="2.2" fill="#d6d3d1" />
            {/* Red REC button */}
            <circle cx="45" cy="44" r="2" fill="#991b1b" />
          </g>
        )}

        {subType === 'chrome_dcell_flashlight_prop' && (
          <g>
            {/* Heavy-Duty 1970s Ribbed Chrome D-Cell Flashlight */}
            <line x1="36" y1="48" x2="72" y2="35" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" />
            <polygon points="69,31 82,27 86,38 73,40" fill="#52525b" stroke="#27272a" strokeWidth="1" />
            <ellipse cx="83" cy="32.5" rx="3" ry="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.9" />
            {/* Warm beam cone */}
            <polygon points="85,28 106,20 106,42 85,37" fill="#fde047" fillOpacity="0.28" />
          </g>
        )}

        {subType === 'evidence_corkboard_prop' && (
          <g>
            {/* Framed Corkboard with Pinned Polaroids & Red Yarn */}
            <polygon points="30,18 82,32 82,62 30,48" fill="#7c5836" stroke="#3b2314" strokeWidth="2" />
            <rect x="37" y="25" width="9" height="9" fill="#e7dec8" transform="skewY(15)" />
            <rect x="62" y="29" width="10" height="8" fill="#d8ccb8" transform="skewY(15)" />
            <rect x="49" y="38" width="11" height="8" fill="#facc15" transform="skewY(15)" />
            <line x1="41" y1="30" x2="67" y2="39" stroke="#991b1b" strokeWidth="1.2" />
            <line x1="67" y1="39" x2="54" y2="46" stroke="#991b1b" strokeWidth="1.2" />
          </g>
        )}

        {subType === 'master_skeleton_keyring_prop' && (
          <g>
            {/* Tarnished Brass Ring with Skeleton Keys & Red Tag */}
            <circle cx="52" cy="40" r="8" fill="none" stroke="#9a7b38" strokeWidth="2.2" />
            <line x1="59" y1="42" x2="78" y2="49" stroke="#85682a" strokeWidth="2.2" />
            <line x1="75" y1="49" x2="75" y2="53" stroke="#85682a" strokeWidth="2" />
            <line x1="58" y1="46" x2="73" y2="55" stroke="#715822" strokeWidth="2" />
            <polygon points="36,43 47,39 50,46 39,50" fill="#6b1d1d" stroke="#260b0d" strokeWidth="0.8" />
          </g>
        )}

        {(category === 'custom_ai' || category === 'clue_prop') &&
          subType !== 'investigator_notebook_prop' &&
          subType !== 'microcassette_player_prop' &&
          subType !== 'chrome_dcell_flashlight_prop' &&
          subType !== 'evidence_corkboard_prop' &&
          subType !== 'master_skeleton_keyring_prop' && (
            <g>
              {/* Custom AI 3D Forged Thriller Artifact */}
              <polygon
                points="44,30 60,22 76,30 60,38"
                fill={defaultColor || '#5e4c2e'}
                stroke="#292014"
                strokeWidth="1"
              />
              <polygon
                points="44,30 60,38 60,62 44,54"
                fill={defaultColor || '#4a3b22'}
                stroke="#292014"
                strokeWidth="1"
              />
              <polygon points="60,38 76,30 76,54 60,62" fill="#382c19" stroke="#292014" strokeWidth="1" />
              <circle cx="60" cy="20" r="5" fill="#b45309" stroke="#451a03" strokeWidth="1" />
            </g>
          )}
      </svg>

      {/* Late-70s Faded Swatch Dots in Top-Left Corner */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-stone-900/80 backdrop-blur-xs px-1 py-0.5 rounded-full shadow-2xs border border-stone-700">
        <span
          className="w-2 h-2 rounded-full border border-stone-500"
          style={{ backgroundColor: defaultColor || '#592820' }}
        />
        <span className="w-2 h-2 rounded-full bg-[#8a8170] border border-stone-500" />
        <span className="w-2 h-2 rounded-full bg-[#3b2314] border border-stone-500" />
      </div>

      {/* Animation / Sound Capability Badge in Top-Right Corner */}
      {(blueprint.animationSpec || blueprint.soundPresetId) && (
        <span
          title={`${blueprint.animationSpec ? `Anim: ${blueprint.animationSpec}` : ''}${
            blueprint.soundPresetId ? ` · SFX: ${blueprint.soundPresetId}` : ''
          }`}
          className="absolute top-1 right-1.5 px-1 py-0.2 bg-amber-950/90 text-amber-300 text-[8px] font-bold rounded-full border border-amber-700/70"
        >
          {blueprint.animationSpec ? '🎞️' : ''}
          {blueprint.soundPresetId ? '🔊' : ''}
        </span>
      )}

      {/* Dimensions Pill in Bottom-Right Corner */}
      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.2 bg-stone-950/85 text-amber-200/90 text-[9px] font-mono rounded-full border border-stone-700/80">
        {safeDims[0]}×{safeDims[1]}m
      </span>
    </div>
  );
};
