import React from 'react';
import { AssetBlueprint } from '../game/hotelData';

interface AssetThumbnailSvgProps {
  blueprint: AssetBlueprint;
  active?: boolean;
}

export const AssetThumbnailSvg: React.FC<AssetThumbnailSvgProps> = ({ blueprint, active }) => {
  const { subType, category, defaultColor } = blueprint;

  return (
    <div
      className={`relative w-full h-16 rounded-xl overflow-hidden flex items-center justify-center transition-all ${
        active
          ? 'bg-gradient-to-b from-[#d1fae5] via-[#ecfdf5] to-[#a7f3d0] ring-2 ring-[#10b981]'
          : 'bg-gradient-to-b from-[#f0f9ff] via-[#e0f2fe] to-[#bae6fd]/60 group-hover:from-[#e0f2fe] group-hover:to-[#bae6fd]'
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
          fill="#ffffff"
          fillOpacity="0.65"
          stroke="#94a3b8"
          strokeWidth="0.7"
        />
        <line x1="42" y1="58.5" x2="78" y2="70.5" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="78" y1="58.5" x2="42" y2="70.5" stroke="#cbd5e1" strokeWidth="0.5" />

        {/* Render distinct isometric 3D asset illustration by subType/category */}
        {(subType.includes('brick_wall') || category === 'wall') && !subType.includes('plaster') && (
          <g>
            {/* Isometric 3D Brick Wall Segment */}
            <polygon points="30,22 76,36 76,66 30,52" fill={defaultColor || '#8c3b2b'} stroke="#451a03" strokeWidth="1" />
            <polygon points="76,36 88,30 88,60 76,66" fill="#6b291d" stroke="#451a03" strokeWidth="1" />
            <polygon points="30,22 42,16 88,30 76,36" fill="#d6d0c4" stroke="#57534e" strokeWidth="1" />
            {/* Brick mortar lines */}
            <line x1="30" y1="32" x2="76" y2="46" stroke="#e7e5e4" strokeWidth="0.7" strokeOpacity="0.55" />
            <line x1="30" y1="42" x2="76" y2="56" stroke="#e7e5e4" strokeWidth="0.7" strokeOpacity="0.55" />
          </g>
        )}

        {subType.includes('plaster') && (
          <g>
            {/* Wainscoted Cream Plaster Wall */}
            <polygon points="30,22 76,36 76,54 30,40" fill="#e7e0d3" stroke="#78716c" strokeWidth="1" />
            <polygon points="30,40 76,54 76,66 30,52" fill="#5c3824" stroke="#292524" strokeWidth="1" />
            <polygon points="76,36 86,31 86,61 76,66" fill="#a8a29e" stroke="#57534e" strokeWidth="1" />
            <polygon points="30,22 40,17 86,31 76,36" fill="#f5f5f4" stroke="#78716c" strokeWidth="1" />
          </g>
        )}

        {category === 'window_wall' && (
          <g>
            {/* Brick Wall with Tall Sash Window */}
            <polygon points="28,20 78,35 78,66 28,51" fill="#7c2d12" stroke="#451a03" strokeWidth="1" />
            <polygon points="78,35 88,29 88,60 78,66" fill="#5b210d" stroke="#451a03" strokeWidth="1" />
            <polygon points="28,20 38,14 88,29 78,35" fill="#d6d0c4" stroke="#57534e" strokeWidth="1" />
            {/* Glowing Sash Window */}
            <polygon points="41,29 66,37 66,56 41,48" fill="#7dd3fc" stroke="#fef08a" strokeWidth="1.3" />
            <line x1="53.5" y1="33" x2="53.5" y2="52" stroke="#451a03" strokeWidth="1.2" />
            <line x1="41" y1="39" x2="66" y2="47" stroke="#451a03" strokeWidth="1.2" />
          </g>
        )}

        {category === 'secret_wall' && (
          <g>
            {/* Pivoting Secret Bookshelf Wall */}
            <polygon points="34,18 74,30 74,66 34,54" fill="#5c3824" stroke="#27170e" strokeWidth="1.2" />
            <polygon points="74,30 84,24 84,60 74,66" fill="#3f2516" stroke="#27170e" strokeWidth="1" />
            <polygon points="34,18 44,12 84,24 74,30" fill="#78492f" stroke="#27170e" strokeWidth="1" />
            {/* Shelves & colorful books */}
            <line x1="37" y1="31" x2="71" y2="41" stroke="#27170e" strokeWidth="2" />
            <line x1="37" y1="43" x2="71" y2="53" stroke="#27170e" strokeWidth="2" />
            <rect x="41" y="24" width="4" height="7" fill="#dc2626" transform="skewY(16)" />
            <rect x="47" y="23" width="4" height="8" fill="#2563eb" transform="skewY(16)" />
            <rect x="54" y="24" width="4" height="7" fill="#eab308" transform="skewY(16)" />
            <rect x="43" y="36" width="5" height="7" fill="#10b981" transform="skewY(16)" />
            <rect x="51" y="36" width="4" height="7" fill="#a855f7" transform="skewY(16)" />
          </g>
        )}

        {category === 'door' && (
          <g>
            {/* Transom Mahogany Hotel Door */}
            <polygon points="40,16 72,26 72,66 40,56" fill="#6b3e26" stroke="#29170c" strokeWidth="1.4" />
            <polygon points="72,26 79,22 79,62 72,66" fill="#4a2810" stroke="#29170c" strokeWidth="1" />
            {/* Transom glass top */}
            <polygon points="44,20 68,28 68,34 44,26" fill="#bae6fd" stroke="#d97706" strokeWidth="1" />
            {/* Brass doorknob */}
            <circle cx="66" cy="47" r="2.3" fill="#facc15" stroke="#713f12" strokeWidth="0.7" />
          </g>
        )}

        {category === 'floor_tile' && (
          <g>
            {/* Plush Isometric Parlor Rug */}
            <polygon
              points="60,36 98,51 60,67 22,51"
              fill={defaultColor || '#7f1d1d'}
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
            <polygon
              points="60,41 86,51 60,62 34,51"
              fill="none"
              stroke="#fde68a"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          </g>
        )}

        {subType.includes('bed') && (
          <g>
            {/* Four-Poster Canopy Suite Bed */}
            <polygon points="32,45 64,34 90,44 58,56" fill="#991b1b" stroke="#450a0a" strokeWidth="1" />
            <polygon points="32,45 58,56 58,64 32,53" fill="#5c3824" stroke="#27170e" strokeWidth="1" />
            <polygon points="58,56 90,44 90,52 58,64" fill="#451a03" stroke="#27170e" strokeWidth="1" />
            {/* Pillows */}
            <polygon points="56,37 68,41 62,45 50,40" fill="#fef3c7" stroke="#d6d3d1" strokeWidth="0.8" />
            {/* Four Brass/Wood Canopy Posts */}
            <line x1="33" y1="53" x2="33" y2="23" stroke="#5c3824" strokeWidth="2.5" />
            <line x1="58" y1="63" x2="58" y2="31" stroke="#5c3824" strokeWidth="2.5" />
            <line x1="64" y1="35" x2="64" y2="15" stroke="#5c3824" strokeWidth="2.2" />
            <line x1="89" y1="45" x2="89" y2="22" stroke="#5c3824" strokeWidth="2.2" />
          </g>
        )}

        {category === 'furniture' && !subType.includes('bed') && (
          <g>
            {/* Concierge Desk / Furniture Piece */}
            <polygon points="28,36 62,25 92,37 58,48" fill="#78350f" stroke="#27170e" strokeWidth="1" />
            <polygon points="28,36 58,48 58,65 28,53" fill="#4a2810" stroke="#27170e" strokeWidth="1" />
            <polygon points="58,48 92,37 92,54 58,65" fill="#3b1f0c" stroke="#27170e" strokeWidth="1" />
            {/* Brass service bell & guest ledger */}
            <polygon points="52,35 64,39 59,43 47,39" fill="#dc2626" />
            <circle cx="72" cy="36" r="2.5" fill="#facc15" />
          </g>
        )}

        {category === 'appliance' && (
          <g>
            {/* Vintage Icebox / Radiator / Switchboard */}
            <polygon
              points="42,20 74,30 74,64 42,54"
              fill={defaultColor || '#b48a3e'}
              stroke="#334155"
              strokeWidth="1.2"
            />
            <polygon points="74,30 84,24 84,58 74,64" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
            <polygon points="42,20 52,14 84,24 74,30" fill="#f8fafc" stroke="#334155" strokeWidth="1" />
            <line x1="46" y1="36" x2="70" y2="44" stroke="#475569" strokeWidth="1.2" />
            <circle cx="67" cy="34" r="2" fill="#f59e0b" />
            <circle cx="67" cy="49" r="2" fill="#f59e0b" />
          </g>
        )}

        {category === 'lighting' && (
          <g>
            {/* Study Desk & Glowing Emerald Lamp */}
            <polygon points="32,42 62,32 88,42 58,52" fill="#5c3824" stroke="#29170c" strokeWidth="1" />
            <polygon points="34,52 34,65 38,65 38,52" fill="#3f2516" />
            <polygon points="82,44 82,58 86,58 86,44" fill="#3f2516" />
            {/* Emerald shade & warm glow */}
            <circle cx="60" cy="30" r="9" fill="#fef08a" fillOpacity="0.45" />
            <line x1="60" y1="41" x2="60" y2="29" stroke="#d97706" strokeWidth="2.2" />
            <polygon points="51,29 69,29 64,22 56,22" fill="#10b981" stroke="#064e3b" strokeWidth="1" />
          </g>
        )}

        {(category === 'custom_ai' || category === 'clue_prop') && (
          <g>
            {/* Custom AI 3D Forged Object */}
            <polygon
              points="44,30 60,22 76,30 60,38"
              fill={defaultColor || '#10b981'}
              stroke="#065f46"
              strokeWidth="1"
            />
            <polygon
              points="44,30 60,38 60,62 44,54"
              fill={defaultColor || '#059669'}
              stroke="#065f46"
              strokeWidth="1"
            />
            <polygon points="60,38 76,30 76,54 60,62" fill="#047857" stroke="#065f46" strokeWidth="1" />
            <circle cx="60" cy="20" r="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          </g>
        )}
      </svg>

      {/* Sims 4 Style Swatch Dots in Top-Left Corner */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-white/80 backdrop-blur-xs px-1 py-0.5 rounded-full shadow-2xs">
        <span
          className="w-2 h-2 rounded-full border border-slate-400"
          style={{ backgroundColor: defaultColor || '#8c3b2b' }}
        />
        <span className="w-2 h-2 rounded-full bg-[#d6d0c4] border border-slate-400" />
        <span className="w-2 h-2 rounded-full bg-[#5c3824] border border-slate-400" />
      </div>

      {/* Dimensions Pill in Bottom-Right Corner */}
      <span className="absolute bottom-1 right-1.5 px-1.5 py-0.2 bg-slate-900/70 text-white text-[9px] font-mono rounded-full">
        {blueprint.defaultDimensions[0]}×{blueprint.defaultDimensions[1]}m
      </span>
    </div>
  );
};
