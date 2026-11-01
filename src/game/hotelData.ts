import {
  PlacedAsset,
  HotelAgentProfile,
  FloorId,
  TexturePresetId,
  AssetCategory,
  CompositeSubPart,
  IN_GAME_FEATURE_ASSET_TEMPLATES,
  buildProcedural3DSpecFromPrompt,
  inferDefaultAssetBlueprintTags,
  parseBlueprintTagsInput,
  DEFAULT_CHARACTER_VOICE_PROFILES
} from './rules';

export interface AssetBlueprint {
  subType: string;
  name: string;
  category: AssetCategory;
  defaultDimensions: [number, number, number];
  defaultColor: string;
  defaultTexture: TexturePresetId;
  collidable: boolean;
  isSecretPassage?: boolean;
  description: string;
  compositeParts?: CompositeSubPart[];
  referenceImageUrl?: string;
  isGenerated?: boolean;
  tags?: string[];
  animationSpec?: string;
  soundPresetId?: string;
}

export function createBlueprintFromAsset(asset: PlacedAsset): AssetBlueprint {
  const baseBp: AssetBlueprint = {
    subType: `${asset.subType}_${Date.now()}`,
    name: asset.name,
    category: asset.category,
    defaultDimensions: [...asset.dimensions] as [number, number, number],
    defaultColor: asset.color,
    defaultTexture: asset.textureId,
    collidable: asset.collidable,
    isSecretPassage: asset.isSecretPassage,
    description: asset.inspectText || `Generated 3D asset (${asset.name}) added to catalog.`,
    compositeParts: asset.compositeParts ? [...asset.compositeParts] : undefined,
    referenceImageUrl: asset.customTextureUrl,
    isGenerated: true,
    tags: asset.tags ? parseBlueprintTagsInput(asset.tags) : undefined,
    soundPresetId: asset.soundPresetId
  };
  baseBp.tags = inferDefaultAssetBlueprintTags(baseBp);
  return baseBp;
}

export const ASSET_CATALOG: AssetBlueprint[] = [
  {
    subType: 'brick_wall_segment',
    name: 'Soot-Stained Tenement Brick Wall',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.35],
    defaultColor: '#592820',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    tags: ['architecture', 'wall', 'brick', 'masonry', 'structural', 'late-70s'],
    description: 'Load-bearing soot-darkened red-brick masonry partition with cracked mortar and scarred cornice trim.'
  },
  {
    subType: 'interior_plaster_wall',
    name: 'Water-Stained Wainscot Wall',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.3],
    defaultColor: '#8a8170',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['architecture', 'wall', 'plaster', 'wood', 'wainscot', 'suite', 'late-70s'],
    description: 'Nicotine-yellowed apartment room divider with damp plaster stains and dark walnut wainscoting.'
  },
  {
    subType: 'window_brick_wall',
    name: 'Rain-Streaked Casement Window Wall',
    category: 'window_wall',
    defaultDimensions: [3.0, 3.0, 0.35],
    defaultColor: '#4a2019',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    tags: ['architecture', 'window-wall', 'brick', 'exterior', 'late-70s'],
    description: 'Weathered exterior brick wall with drafty late-70s sash window overlooking the rain-slicked airshaft.'
  },
  {
    subType: 'secret_bookshelf_door',
    name: 'Pivoting Secret Bookshelf Wall',
    category: 'secret_wall',
    defaultDimensions: [2.2, 2.9, 0.45],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: true,
    isSecretPassage: true,
    tags: ['architecture', 'secret-wall', 'secret-passage', 'hinged', 'interactive', 'animated', 'wood', 'late-70s'],
    animationSpec: '500ms cubic ease-in-out hinge swing / pocket-slide + mortise latch click',
    soundPresetId: 'sfx_door_creak',
    description: 'Concealed passage door disguised as a dark oiled walnut bookcase hiding a hollow crawlspace.'
  },
  {
    subType: 'suite_door',
    name: 'Scarred Transom Apartment Door',
    category: 'door',
    defaultDimensions: [1.4, 2.6, 0.25],
    defaultColor: '#422616',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['architecture', 'door', 'hinged', 'interactive', 'animated', 'wood', 'brass', 'suite', 'late-70s'],
    animationSpec: '500ms timber hinge swing + 480ms brass latch click',
    soundPresetId: 'sfx_door_latch',
    description: 'Numbered dark walnut apartment-suite door with tarnished brass deadbolts and painted-shut transom grille.'
  },
  {
    subType: 'floor_runner_slab',
    name: 'Threadbare Oxblood Corridor Rug',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.06, 3.2],
    defaultColor: '#4a181b',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    tags: ['architecture', 'floor-tile', 'carpet', 'corridor', 'lobby', 'late-70s'],
    description: 'Faded, worn dried-oxblood and ochre apartment carpet runner that muffles midnight footsteps.'
  },
  {
    subType: 'four_poster_bed',
    name: 'Faded Burgundy & Walnut Suite Bed',
    category: 'furniture',
    defaultDimensions: [2.1, 1.4, 2.4],
    defaultColor: '#4f1d21',
    defaultTexture: 'velvet_crimson',
    collidable: true,
    tags: ['furniture', 'bed', 'suite', 'wood', 'brass', 'late-70s'],
    description: 'Creaking dark-wood apartment bed with tarnished brass posts and a moth-eaten burgundy bedspread.'
  },
  {
    subType: 'reception_desk',
    name: 'Shadowed Walnut Registration Desk',
    category: 'furniture',
    defaultDimensions: [3.4, 1.15, 1.1],
    defaultColor: '#331b0e',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['furniture', 'desk', 'lobby', 'wood', 'brass', 'audio-linked', 'late-70s'],
    soundPresetId: 'sfx_brass_bell',
    description: 'Scarred walnut front counter with pigeonhole key cubbies, tarnished call bell, and tenant ledger.'
  },
  {
    subType: 'vintage_radiator',
    name: 'Clanking Cast-Iron Steam Radiator',
    category: 'appliance',
    defaultDimensions: [1.2, 0.9, 0.4],
    defaultColor: '#6e5a38',
    defaultTexture: 'aged_brass',
    collidable: true,
    tags: ['appliance', 'heating', 'brass', 'suite', 'audio-linked', 'late-70s'],
    soundPresetId: 'sfx_steam_pipe',
    description: 'Flaking bronze-painted cast-iron steam radiator that hisses and carries whispers between floors.'
  },
  {
    subType: 'icebox_fridge',
    name: '1978 Harvest-Gold Apartment Fridge',
    category: 'appliance',
    defaultDimensions: [0.95, 1.65, 0.85],
    defaultColor: '#7d7559',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['appliance', 'kitchenette', 'suite', 'late-70s'],
    description: 'Humming late-70s faded harvest-gold refrigerator with yellowed door gaskets and chrome latch.'
  },
  {
    subType: 'rotary_wall_phone',
    name: 'Tarnished Rotary Switchboard Console',
    category: 'appliance',
    defaultDimensions: [0.9, 1.3, 0.65],
    defaultColor: '#6b532c',
    defaultTexture: 'aged_brass',
    collidable: true,
    tags: ['appliance', 'telephone', 'lobby', 'brass', 'audio-linked', 'late-70s'],
    soundPresetId: 'sfx_telephone_ring',
    description: 'Analog rotary house-phone switchboard with frayed cloth patch cords connected to tenant suites.'
  },
  {
    subType: 'banker_desk_lamp',
    name: 'Dim Banker’s Investigation Desk & Lamp',
    category: 'lighting',
    defaultDimensions: [1.5, 1.25, 0.9],
    defaultColor: '#284a33',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['lighting', 'desk', 'furniture', 'suite', 'wood', 'brass', 'late-70s'],
    description: 'Worn walnut writing desk topped with a low-wattage green-glass shade lamp.'
  },
  {
    subType: 'crt_tv_vhs_combo',
    name: 'Late-70s Woodgrain CRT TV & VCR Combo',
    category: 'appliance',
    defaultDimensions: [0.9, 0.85, 0.75],
    defaultColor: '#3d2817',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['appliance', 'electronics', 'crt', 'tv', 'suite', 'wood', 'late-70s'],
    description: '1978 faux-walnut veneer television with rotary VHF/UHF tuning dials and top-loading cassette VCR.'
  },
  {
    subType: 'soda_vending_machine',
    name: '1979 Battered Coin-Op Soda Cooler',
    category: 'appliance',
    defaultDimensions: [1.1, 2.1, 0.9],
    defaultColor: '#362519',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    tags: ['appliance', 'vending', 'corridor', 'lobby', 'late-70s'],
    description: 'Flickering late-70s corridor soda machine in faded harvest-gold and burnt umber with mechanical coin return.'
  },
  {
    subType: 'concierge_crt_computer',
    name: '1981 Amber-Phosphor Desk Terminal',
    category: 'appliance',
    defaultDimensions: [0.95, 0.85, 0.8],
    defaultColor: '#78705e',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['appliance', 'electronics', 'crt', 'computer', 'lobby', 'late-70s'],
    description: 'Early-80s nicotine-yellowed microcomputer with dual 5.25-inch floppy drives and dim phosphor CRT monitor.'
  },
  {
    subType: 'retro_teal_armchair',
    name: '70s Faded Avocado & Ochre Armchair',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.95],
    defaultColor: '#4a5438',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    tags: ['furniture', 'seating', 'lobby', 'suite', 'late-70s'],
    description: 'Threadbare late-70s avocado-drab and mustard-ochre tweed armchair on pitted dark bronze legs.'
  },
  {
    subType: 'lobby_payphone_booth',
    name: 'Late-70s Rotary Payphone Alcove',
    category: 'appliance',
    defaultDimensions: [0.85, 1.85, 0.65],
    defaultColor: '#382e26',
    defaultTexture: 'aged_brass',
    collidable: true,
    tags: ['appliance', 'telephone', 'lobby', 'corridor', 'audio-linked', 'late-70s'],
    soundPresetId: 'sfx_telephone_ring',
    description: 'Scratched steel and walnut rotary coin telephone with armored handset cord and torn directory.'
  },
  {
    subType: 'porcelain_bathtub',
    name: 'Water-Stained Clawfoot Bathtub',
    category: 'furniture',
    defaultDimensions: [1.6, 0.75, 0.8],
    defaultColor: '#9c9484',
    defaultTexture: 'checker_marble',
    collidable: true,
    tags: ['furniture', 'bathroom', 'plumbing', 'suite', 'late-70s'],
    description: 'Crazed bone-ecru cast-iron tub with rust rings around the drain and tarnished verdigris claw feet.'
  },
  {
    subType: 'marble_vanity_sink',
    name: 'Cracked Formica & Ecru Vanity Sink',
    category: 'furniture',
    defaultDimensions: [1.1, 1.25, 0.65],
    defaultColor: '#877f70',
    defaultTexture: 'checker_marble',
    collidable: true,
    tags: ['furniture', 'bathroom', 'plumbing', 'suite', 'late-70s'],
    description: 'Damp apartment bathroom vanity with water-spotted basin, dripping brass taps, and desilvered mirror.'
  },
  {
    subType: 'suite_porcelain_toilet',
    name: 'Stained Ecru Suite Toilet & Tank',
    category: 'furniture',
    defaultDimensions: [0.55, 0.85, 0.75],
    defaultColor: '#948c7c',
    defaultTexture: 'checker_marble',
    collidable: true,
    tags: ['furniture', 'bathroom', 'plumbing', 'suite', 'late-70s'],
    description: 'Unmaintained bone-ceramic apartment commode with worn wooden seat and running flush tank.'
  },
  {
    subType: 'gilded_wall_painting',
    name: 'Tarnished 70s Oil Portrait Frame',
    category: 'custom_ai',
    defaultDimensions: [1.2, 1.0, 0.12],
    defaultColor: '#5e4c2e',
    defaultTexture: 'aged_brass',
    collidable: false,
    tags: ['custom-ai', 'decor', 'wall-prop', 'brass', 'corridor', 'late-70s'],
    description: 'Oxidized bronze frame holding a soot-darkened portrait whose eyes seem to follow the corridor.'
  },
  {
    subType: 'potted_lobby_palm',
    name: 'Neglected Parlor Boston Fern',
    category: 'custom_ai',
    defaultDimensions: [0.85, 1.45, 0.85],
    defaultColor: '#2f3e26',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['custom-ai', 'decor', 'plant', 'lobby', 'late-70s'],
    description: 'Overgrown, dusty olive-drab apartment fern inside a cracked terracotta pot with tarnished rim.'
  },
  {
    subType: 'brass_towel_rack',
    name: 'Corroded Brass Towel Rail & Faded Linens',
    category: 'furniture',
    defaultDimensions: [0.75, 0.65, 0.35],
    defaultColor: '#695737',
    defaultTexture: 'aged_brass',
    collidable: false,
    tags: ['furniture', 'bathroom', 'brass', 'suite', 'late-70s'],
    description: 'Wall-mounted tarnished brass towel rail draped with faded ecru and harvest-ochre bath linens.'
  },
  {
    subType: 'retrofit_window_ac',
    name: '1979 Woodgrain Window AC & Conduit',
    category: 'appliance',
    defaultDimensions: [0.85, 0.95, 0.65],
    defaultColor: '#6e6759',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    tags: ['appliance', 'cooling', 'suite', 'exterior', 'late-70s'],
    description: 'Rattling 1979 faux-walnut louver window air-conditioner wired via surface-mounted steel conduit over damp plaster.'
  },
  {
    subType: 'resident_kitchenette',
    name: 'Late-70s Harvest-Gold Hotplate Kitchenette',
    category: 'appliance',
    defaultDimensions: [1.15, 1.1, 0.65],
    defaultColor: '#4a321f',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['appliance', 'kitchenette', 'suite', 'wood', 'late-70s'],
    description: 'Makeshift long-term tenant kitchenette with chipped harvest-gold Formica counter, dial oven, and glowing coil burner.'
  },
  {
    subType: 'resident_steamer_trunk',
    name: 'Decade-Lived-In Steamer Trunk & Keepsakes',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.7],
    defaultColor: '#2e1508',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['furniture', 'storage', 'suite', 'brass', 'late-70s'],
    description: 'Tarnished brass-bound leather steamer trunk stacked with faded oxblood hatboxes and decades of tenant journals.'
  },
  // In-Game Feature Items as Studio Asset Creation Templates (Images -> 3D Models -> Animations -> Sounds)
  ...IN_GAME_FEATURE_ASSET_TEMPLATES.map((tpl) => ({
    subType: tpl.subType,
    name: tpl.name,
    category: tpl.category,
    defaultDimensions: [...tpl.defaultDimensions] as [number, number, number],
    defaultColor: tpl.defaultColor,
    defaultTexture: tpl.defaultTexture,
    collidable: true,
    tags: [...tpl.tags],
    animationSpec: tpl.animationSpec,
    soundPresetId: tpl.soundPresetId,
    compositeParts: buildProcedural3DSpecFromPrompt(tpl.name).parts,
    description: tpl.description
  }))
];

function createFourRoomFloorAssets(floor: FloorId, prefix: string): PlacedAsset[] {
  const assets: PlacedAsset[] = [
    // Corridor North & South dividers creating 4 quadrant suites (X01 NW, X02 NE, X03 SW, X04 SE)
    {
      id: `${floor}_wall_nw_s`,
      name: `Room ${prefix}1 South Wall`,
      category: 'wall',
      subType: 'interior_plaster_wall',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-5.2, 1.5, -1.6],
      dimensions: [6.8, 3.0, 0.3],
      rotationY: 0,
      color: '#8a8170',
      textureId: 'plaster_cream',
      collidable: true
    },
    {
      id: `${floor}_wall_ne_s`,
      name: `Room ${prefix}2 South Wall`,
      category: 'wall',
      subType: 'interior_plaster_wall',
      floor,
      roomNumber: `Room ${prefix}2`,
      position: [5.2, 1.5, -1.6],
      dimensions: [6.8, 3.0, 0.3],
      rotationY: 0,
      color: '#8a8170',
      textureId: 'plaster_cream',
      collidable: true
    },
    {
      id: `${floor}_wall_sw_n`,
      name: `Room ${prefix}3 North Wall`,
      category: 'wall',
      subType: 'interior_plaster_wall',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-5.2, 1.5, 1.6],
      dimensions: [6.8, 3.0, 0.3],
      rotationY: 0,
      color: '#8a8170',
      textureId: 'plaster_cream',
      collidable: true
    },
    {
      id: `${floor}_wall_se_n`,
      name: `Room ${prefix}4 North Wall`,
      category: 'wall',
      subType: 'interior_plaster_wall',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [5.2, 1.5, 1.6],
      dimensions: [6.8, 3.0, 0.3],
      rotationY: 0,
      color: '#8a8170',
      textureId: 'plaster_cream',
      collidable: true
    },
    // 4 Suite Entry Doors along the central corridor
    {
      id: `${floor}_door_1`,
      name: `Suite ${prefix}1 Entry Door`,
      category: 'door',
      subType: 'suite_door',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-2.6, 1.3, -1.6],
      dimensions: [1.4, 2.6, 0.32],
      rotationY: 0,
      color: '#422616',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Tarnished brass plate reads: SUITE ${prefix}1.`
    },
    {
      id: `${floor}_door_2`,
      name: `Suite ${prefix}2 Entry Door`,
      category: 'door',
      subType: 'suite_door',
      floor,
      roomNumber: `Room ${prefix}2`,
      position: [2.6, 1.3, -1.6],
      dimensions: [1.4, 2.6, 0.32],
      rotationY: 0,
      color: '#422616',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Tarnished brass plate reads: SUITE ${prefix}2.`
    },
    {
      id: `${floor}_door_3`,
      name: `Suite ${prefix}3 Entry Door`,
      category: 'door',
      subType: 'suite_door',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-2.6, 1.3, 1.6],
      dimensions: [1.4, 2.6, 0.32],
      rotationY: 0,
      color: '#422616',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Tarnished brass plate reads: SUITE ${prefix}3.`
    },
    {
      id: `${floor}_door_4`,
      name: `Suite ${prefix}4 Entry Door`,
      category: 'door',
      subType: 'suite_door',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [2.6, 1.3, 1.6],
      dimensions: [1.4, 2.6, 0.32],
      rotationY: 0,
      color: '#422616',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Tarnished brass plate reads: SUITE ${prefix}4.`
    },
    // Secret Passage Wall between Room X01 and Room X02 (North Crawlspace)
    {
      id: floor === 'floor1' ? 'secret_101_102' : `${floor}_secret_n`,
      name: `Hidden Bookshelf Passage (${prefix}1 ↔ ${prefix}2)`,
      category: 'secret_wall',
      subType: 'secret_bookshelf_door',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [0, 1.45, -5.4],
      dimensions: [2.2, 2.9, 0.45],
      rotationY: Math.PI / 2,
      color: '#3b2314',
      textureId: 'oak_parquet',
      isSecretPassage: true,
      isOpen: false,
      collidable: true,
      inspectText: `A hollow dark-walnut bookcase hiding a brick crawlspace between Room ${prefix}1 and Room ${prefix}2.`
    },
    // Secret Passage Wall between Room X02/X04 (East Service Shaft)
    {
      id: floor === 'floor2' ? 'secret_202_204' : floor === 'floor3' ? 'secret_303_304' : `${floor}_secret_s`,
      name: `Pivoting Brick Panel (${prefix}3 ↔ ${prefix}4)`,
      category: 'secret_wall',
      subType: 'secret_bookshelf_door',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [0, 1.45, 5.4],
      dimensions: [2.2, 2.9, 0.45],
      rotationY: Math.PI / 2,
      color: '#4a2019',
      textureId: 'nyc_old_brick',
      isSecretPassage: true,
      isOpen: false,
      collidable: true,
      inspectText: `Cold drafty mortar seams conceal a hidden passage linking Room ${prefix}3 and Room ${prefix}4.`
    },
    // Suite Furnishings in the 4 rooms
    {
      id: `${floor}_bed_1`,
      name: `Suite ${prefix}1 Faded Burgundy Bed`,
      category: 'furniture',
      subType: 'four_poster_bed',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-6.8, 0.7, -6.5],
      dimensions: [2.1, 1.4, 2.4],
      rotationY: 0,
      color: '#4a181b',
      textureId: 'velvet_crimson',
      collidable: true
    },
    {
      id: `${floor}_desk_2`,
      name: `Suite ${prefix}2 Writing Desk`,
      category: 'lighting',
      subType: 'banker_desk_lamp',
      floor,
      roomNumber: `Room ${prefix}2`,
      position: [6.4, 0.62, -6.4],
      dimensions: [1.5, 1.25, 0.9],
      rotationY: 0,
      color: '#284a33',
      textureId: 'oak_parquet',
      collidable: true
    },
    {
      id: `${floor}_bed_3`,
      name: `Suite ${prefix}3 Faded Avocado Bed`,
      category: 'furniture',
      subType: 'four_poster_bed',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-6.8, 0.7, 6.5],
      dimensions: [2.1, 1.4, 2.4],
      rotationY: Math.PI,
      color: '#38452b',
      textureId: 'wallpaper_damask',
      collidable: true
    },
    {
      id: `${floor}_icebox_4`,
      name: `Suite ${prefix}4 Harvest-Gold Fridge`,
      category: 'appliance',
      subType: 'icebox_fridge',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [7.2, 0.82, 6.6],
      dimensions: [0.95, 1.65, 0.85],
      rotationY: Math.PI,
      color: '#7d7559',
      textureId: 'plaster_cream',
      collidable: true
    },
    // Late-70s / Early-80s piecemeal upgrades & permanent multi-decade resident belongings
    {
      id: `${floor}_crt_tv_1`,
      name: `Suite ${prefix}1 Late-70s Woodgrain CRT TV`,
      category: 'appliance',
      subType: 'crt_tv_vhs_combo',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-7.2, 0.42, -3.2],
      dimensions: [0.9, 0.85, 0.75],
      rotationY: Math.PI / 2,
      color: '#3d2817',
      textureId: 'oak_parquet',
      collidable: true,
      inspectText: `A 1978 woodgrain CRT television and top-load cassette deck wired via surface conduit into Suite ${prefix}1's stained wainscoting.`
    },
    {
      id: `${floor}_kitchenette_3`,
      name: `Suite ${prefix}3 Harvest-Gold Kitchenette`,
      category: 'appliance',
      subType: 'resident_kitchenette',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-7.2, 0.55, 3.2],
      dimensions: [1.15, 1.1, 0.65],
      rotationY: Math.PI / 2,
      color: '#3b2314',
      textureId: 'oak_parquet',
      collidable: true,
      inspectText: `A worn late-70s harvest-gold Formica hotplate kitchenette used by a permanent multi-decade tenant.`
    },
    {
      id: `${floor}_trunk_4`,
      name: `Suite ${prefix}4 Resident Steamer Trunk`,
      category: 'furniture',
      subType: 'resident_steamer_trunk',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [7.2, 0.48, 3.2],
      dimensions: [1.1, 0.95, 0.7],
      rotationY: -Math.PI / 2,
      color: '#2b180a',
      textureId: 'oak_parquet',
      collidable: true,
      inspectText: `Scuffed leather steamer trunk and faded hatboxes belonging to a permanent resident who moved in decades ago.`
    },
    {
      id: `${floor}_rug_center`,
      name: `Floor ${prefix[0]} Threadbare Corridor Runner`,
      category: 'floor_tile',
      subType: 'floor_runner_slab',
      floor,
      roomNumber: 'Corridor',
      position: [0, 0.03, 0],
      dimensions: [14.0, 0.05, 2.2],
      rotationY: 0,
      color: '#4a181b',
      textureId: 'velvet_crimson',
      collidable: false
    }
  ];

  return assets;
}

export const INITIAL_PLACED_ASSETS: PlacedAsset[] = [
  // MAIN LOBBY ASSETS (Unmaintained Late-70s / Early-80s Apartment-Hotel Atmosphere)
  {
    id: 'lobby_front_desk',
    name: 'Shadowed Walnut Registration Counter',
    category: 'furniture',
    subType: 'reception_desk',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [0, 0.58, -5.2],
    dimensions: [4.2, 1.15, 1.2],
    rotationY: 0,
    color: '#331b0e',
    textureId: 'oak_parquet',
    collidable: true,
    clueId: 'clue_guest_register',
    inspectText: 'The leather-bound Permanent Resident Ledger lies open next to an early-80s amber-phosphor terminal. Several multi-decade tenants were signed out in Arthur’s own handwriting.'
  },
  {
    id: 'lobby_retrofit_computer',
    name: '1981 Amber-Phosphor Desk Terminal',
    category: 'appliance',
    subType: 'concierge_crt_computer',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [2.8, 0.42, -5.2],
    dimensions: [0.95, 0.85, 0.8],
    rotationY: 0,
    color: '#78705e',
    textureId: 'plaster_cream',
    collidable: true,
    inspectText: 'A nicotine-yellowed 1981 microcomputer terminal bolted beside the scarred front desk to log long-term resident room assignments and boiler maintenance.'
  },
  {
    id: 'lobby_vending_machine',
    name: 'Alcove 1979 Coin-Op Soda Cooler',
    category: 'appliance',
    subType: 'soda_vending_machine',
    floor: 'lobby',
    roomNumber: 'Luggage & Lift Alcove',
    position: [6.5, 1.05, 1.5],
    dimensions: [1.1, 2.1, 0.9],
    rotationY: -Math.PI / 2,
    color: '#362519',
    textureId: 'nyc_old_brick',
    collidable: true,
    inspectText: 'Installed during a piecemeal 1979 alcove upgrade; its flickering harvest-gold marquee buzzes against the damp wainscoting.'
  },
  {
    id: 'lobby_payphone_unit',
    name: 'Late-70s Rotary Payphone Alcove',
    category: 'appliance',
    subType: 'lobby_payphone_booth',
    floor: 'lobby',
    roomNumber: 'Luggage & Lift Alcove',
    position: [6.5, 0.92, -1.5],
    dimensions: [0.85, 1.85, 0.65],
    rotationY: -Math.PI / 2,
    color: '#382e26',
    textureId: 'aged_brass',
    collidable: true,
    inspectText: 'A scratched rotary payphone mounted onto the soot-stained brick wall for permanent residents who disconnected their suite intercom lines.'
  },
  {
    id: 'lobby_carpet_runner',
    name: 'Threadbare Oxblood Lobby Carpet',
    category: 'floor_tile',
    subType: 'floor_runner_slab',
    floor: 'lobby',
    roomNumber: 'Main Lobby',
    position: [0, 0.03, 0.5],
    dimensions: [5.5, 0.05, 9.0],
    rotationY: 0,
    color: '#4a181b',
    textureId: 'velvet_crimson',
    collidable: false
  },
  {
    id: 'lobby_west_wall',
    name: 'Parlor Archway Brick Partition',
    category: 'wall',
    subType: 'brick_wall_segment',
    floor: 'lobby',
    roomNumber: 'West Parlor Lounge',
    position: [-5.5, 1.5, -1.5],
    dimensions: [4.2, 3.0, 0.35],
    rotationY: 0,
    color: '#592820',
    textureId: 'nyc_old_brick',
    collidable: true
  },
  {
    id: 'secret_lobby_stair',
    name: 'Concealed Service Wainscoting',
    category: 'secret_wall',
    subType: 'secret_bookshelf_door',
    floor: 'lobby',
    roomNumber: 'Service Stairwell',
    position: [5.5, 1.45, -5.2],
    dimensions: [2.4, 2.9, 0.45],
    rotationY: 0,
    color: '#3b2314',
    textureId: 'oak_parquet',
    isSecretPassage: true,
    isOpen: false,
    collidable: true,
    inspectText: 'A false dark-walnut key-cabinet behind the front desk concealing the chute to the Basement.'
  },
  {
    id: 'lobby_switchboard',
    name: 'Tarnished House Switchboard',
    category: 'appliance',
    subType: 'rotary_wall_phone',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [-3.2, 0.65, -5.2],
    dimensions: [0.95, 1.3, 0.7],
    rotationY: 0,
    color: '#6b532c',
    textureId: 'aged_brass',
    collidable: true,
    inspectText: 'Original tarnished plug-board still used for intercom calls to permanent residents; Cord #202 hums with 60Hz static.'
  },
  {
    id: 'lobby_parlor_lamp',
    name: 'Parlor Reading Desk & Dim Lamp',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'lobby',
    roomNumber: 'West Parlor Lounge',
    position: [-6.2, 0.62, 3.2],
    dimensions: [1.5, 1.25, 0.9],
    rotationY: Math.PI / 2,
    color: '#284a33',
    textureId: 'oak_parquet',
    collidable: true
  },

  // BASEMENT ASSETS
  {
    id: 'basement_boiler_unit',
    name: 'Cast-Iron Steam Boiler #1',
    category: 'appliance',
    subType: 'vintage_radiator',
    floor: 'basement',
    roomNumber: 'Boiler Room',
    position: [4.8, 1.1, -4.5],
    dimensions: [2.6, 2.2, 1.8],
    rotationY: 0,
    color: '#4a2019',
    textureId: 'aged_brass',
    collidable: true,
    inspectText: 'The pressure gauge needles tremble whenever someone walks through the upper floor secret walls.'
  },
  {
    id: 'secret_basement_vault',
    name: 'Brick Archway to Sub-Vault 00',
    category: 'secret_wall',
    subType: 'secret_bookshelf_door',
    floor: 'basement',
    roomNumber: 'Sub-Vault 00',
    position: [-4.5, 1.45, -2.5],
    dimensions: [2.6, 2.9, 0.45],
    rotationY: 0,
    color: '#4a2019',
    textureId: 'nyc_old_brick',
    isSecretPassage: true,
    isOpen: false,
    collidable: true,
    clueId: 'clue_basement_key',
    inspectText: 'Behind this soot-stained brick seal lies Master Skeleton Key #00 and the original sleepwalking resonators.'
  },
  {
    id: 'basement_desk_clue',
    name: 'Chief Engineer’s Worktable',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'basement',
    roomNumber: 'Sub-Vault 00',
    position: [-5.5, 0.62, -6.2],
    dimensions: [1.6, 1.25, 1.0],
    rotationY: 0,
    color: '#6b532c',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_basement_key',
    inspectText: 'Resting beside the tarnished brass lamp is Master Skeleton Key #00!'
  },

  // FLOORS 1, 2, 3 (4 Rooms each + Secret Passages + Late-70s / Early-80s Piecemeal Upgrades)
  ...createFourRoomFloorAssets('floor1', '10'),
  ...createFourRoomFloorAssets('floor2', '20'),
  ...createFourRoomFloorAssets('floor3', '30'),

  // Floor-specific Clues on Residential Floors
  {
    id: 'floor1_clue_wardrobe',
    name: 'Eleanor’s Radiator & Loose Brick',
    category: 'appliance',
    subType: 'vintage_radiator',
    floor: 'floor1',
    roomNumber: 'Room 101',
    position: [-2.2, 0.45, -5.4],
    dimensions: [1.2, 0.9, 0.45],
    rotationY: 0,
    color: '#6e5a38',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_hollow_brick_101',
    inspectText: 'A tarnished brass latch hidden behind Eleanor’s 34-year-old radiator unlocks the secret passage between Room 101 and Room 102!'
  },
  {
    id: 'floor2_clue_cassette_player',
    name: 'Julian’s 1979 Desktop Tape Deck',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'floor2',
    roomNumber: 'Room 202',
    position: [3.2, 0.62, -4.8],
    dimensions: [1.3, 1.25, 0.9],
    rotationY: -Math.PI / 4,
    color: '#6b532c',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_spinning_wax_202',
    inspectText: '25-year resident Julian Vance vanished from his unmaintained suite; the microcassette whispers: "Press the mortar seam on the south corridor wall to enter Room 204 unseen."'
  },
  {
    id: 'floor3_clue_drafting_table',
    name: 'Architect’s Stained Drafting Table',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'floor3',
    roomNumber: 'Room 304',
    position: [4.2, 0.62, 4.5],
    dimensions: [1.7, 1.25, 1.0],
    rotationY: Math.PI,
    color: '#4a5438',
    textureId: 'oak_parquet',
    collidable: true,
    clueId: 'clue_blueprints_304',
    inspectText: 'Original construction blueprints annotated in faded ink with late-70s conduit and plumbing patches routed around the hidden crawlspaces.'
  }
];

export const INITIAL_AGENTS: HotelAgentProfile[] = [
  {
    id: 'agent_helper',
    name: 'Tape #9 (Pocket Dictaphone)',
    role: 'helper_entity',
    roomNumber: 'Clerk Coat Pocket',
    floor: 'lobby',
    position: [0, 1.2, 0],
    status: 'present',
    occupation: 'Your Sentient Helper Entity',
    personality: 'Keen-eared, methodical, slightly eerie 1979 handheld microcassette dictaphone entity that only knows what you have uncovered and remembers every transcript.',
    secretTruth: 'Resonates with the hotel’s original acoustic pipes and surface-mounted electrical conduits to replay forgotten conversations.',
    knownFacts: [
      'You were just hired tonight as the Night Clerk at The Alderney Arms—an unmaintained, faded residential apartment-hotel home to permanent multi-decade tenants.',
      'By the late 1970s and early 1980s, the building received small piecemeal upgrades (surface conduit wiring, woodgrain rotary-dial CRT TVs, a 1979 coin-op soda cooler, and harvest-gold hotplate kitchenettes) without ever disturbing the hollow inner brick walls.'
    ],
    memories: [
      'Logged Shift Start: Midnight rain outside; soot-stained bricks and a flickering 1979 soda cooler buzzing in the shadowy lobby.',
      'Instruction: Inspect permanent residents’ faded suites, talk to Arthur and the long-term tenants, and ask me to cross-reference clues.'
    ],
    suspicionLevel: 0,
    trustLevel: 100,
    voiceStyle: '1920s Transatlantic Broadcast Modulation · Metallic brass-horn phonograph resonance',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_helper },
    activeFacialExpression: 'cryptic_whisper',
    appearance: {
      archetype: 'Occult Archivist',
      headShape: 'chibi_block',
      skinColor: '#bfa36f',
      eyeStyle: 'wide_amber',
      hairStyle: 'bowler_hat',
      hairColor: '#27272a',
      outfitColor: '#3b2314',
      accentColor: '#6e562f',
      mouthStyle: 'calm_neutral',
      facialExpression: 'cryptic_whisper',
      spineCurvature: 0,
      hasWalkingCane: false,
      heightScale: 0.9,
      widthScale: 0.95,
      headScale: 1.15,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_helper }
    },
    stats: { physic: 2, agility: 3, mind: 6, endurance: 4, pointsRemaining: 0 },
    assignedTraits: ['tape_memory', 'acoustic_sync']
  },
  {
    id: 'agent_arthur',
    name: 'Arthur Pendelton',
    role: 'registrar',
    roomNumber: 'Front Desk',
    floor: 'lobby',
    position: [0, 0, -6.6],
    status: 'present',
    occupation: 'Senior Night Registrar & Building Super (38 Yrs)',
    personality: 'Polite, unblinking, dryly formal, fiercely protective of "house rules" and the building’s piecemeal repairs; deflects questions about vanished long-term residents.',
    voiceStyle: '1970s Old New York Mid-Atlantic accent · Hushed, gravel-edged, world-weary front-desk baritone',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_arthur },
    activeFacialExpression: 'side_eye_glare',
    secretTruth: 'Arthur has been forging departure log entries for multi-decade permanent tenants who sleepwalk into the secret brick crawlspaces when the Basement boiler hums at 33 Hz.',
    knownFacts: [
      'Has worked the front desk for 38 years and personally supervised every piecemeal patch—from surface-mounted electrical conduits to the 1981 amber-phosphor desk terminal.',
      'Insists long-term residents in Room 202 (Julian, 25 years) and Room 303 (31 years) merely "transferred suites" while their rooms undergo wiring repairs.'
    ],
    memories: [
      'Hired the new Night Clerk tonight with strict instructions never to open the old wainscoting behind the surface-mounted antenna cables.',
      'Hid Master Skeleton Key #00 in the Basement Sub-Vault.'
    ],
    suspicionLevel: 35,
    trustLevel: 45,
    appearance: {
      archetype: 'Night Bellhop',
      headShape: 'proportional_human',
      bodyProportionStyle: 'proportional_human',
      skinColor: '#c9b39b',
      eyeStyle: 'narrow_suspicious',
      hairStyle: 'bowler_hat',
      hairColor: '#1c1917',
      outfitColor: '#3b1518',
      accentColor: '#6e562f',
      mouthStyle: 'slight_smirk',
      facialExpression: 'side_eye_glare',
      spineCurvature: 0,
      hasWalkingCane: false,
      hasSpectacles: false,
      heightScale: 1.04,
      widthScale: 0.98,
      headScale: 1.0,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_arthur }
    },
    stats: { physic: 3, agility: 2, mind: 5, endurance: 4, pointsRemaining: 0 },
    assignedTraits: ['velvet_tongue', 'wax_memory'],
    dailySchedule: [
      {
        timeRange: '06:00–11:59',
        phase: 'Morning',
        location: 'Front Desk & Switchboard',
        action: 'Cross-checks guest departure ledgers and locks the brass key cubbies.',
        targetFloor: 'lobby',
        targetPosition: [0, 0, -6.6],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      },
      {
        timeRange: '12:00–16:59',
        phase: 'Afternoon',
        location: 'Basement Boiler Sub-Vault',
        action: 'Inspects the 33 Hz steam pressure valves and sealed brick crawlspace doors.',
        targetFloor: 'basement',
        targetPosition: [-1.8, 0, -2.5],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      },
      {
        timeRange: '17:00–21:59',
        phase: 'Evening',
        location: 'Lobby Registration Desk',
        action: 'Watches the West Parlor social hour with an unblinking side-eye glare.',
        targetFloor: 'lobby',
        targetPosition: [0, 0, -6.6],
        activityGesture: 'idle_observe',
        randomEventsEnabled: true
      },
      {
        timeRange: '22:00–05:59',
        phase: 'Late Night',
        location: 'Lobby Front Desk',
        action: 'Guards the night ledger and monitors the rotary house-phone switchboard.',
        targetFloor: 'lobby',
        targetPosition: [0, 0, -6.6],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      }
    ]
  },
  {
    id: 'agent_eleanor',
    name: 'Eleanor Vance',
    role: 'tenant',
    roomNumber: 'Room 101',
    floor: 'floor1',
    position: [-4.5, 0, -4.2],
    status: 'erratic',
    occupation: 'Retired Opera Contralto (34-Yr Resident, Rm 101)',
    personality: 'Elderly matron with a severely stooped spine who leans on a walnut walking cane; fiercely attached to her faded corner apartment of 34 years and presses a stethoscope to the plaster walls at night.',
    secretTruth: 'She discovered the pivoting bookshelf between Room 101 and Room 102 behind her steamer trunks and heard vanished long-term neighbors whispering from inside the masonry.',
    knownFacts: [
      'Has lived permanently in Suite 101 for 34 years and refuses to plug in the 1978 woodgrain CRT TV management installed because its transformer hum masks the sounds inside the North wall.',
      'Saw Arthur carrying an empty suitcase out of long-term neighbor Room 102 at 3:00 AM, even though forty years of belongings were still inside.'
    ],
    memories: [
      'Tapped three times on the original clawfoot radiator pipe and heard four taps back from Room 102.',
      'Hid the tarnished brass latch release behind the clawfoot radiator in Room 101.'
    ],
    suspicionLevel: 20,
    trustLevel: 60,
    voiceStyle: 'New England Brahmin Transatlantic accent · Poised, aristocratic, sharply observant contralto',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_eleanor },
    activeFacialExpression: 'suspicious',
    appearance: {
      archetype: 'Elderly Matron',
      headShape: 'proportional_human',
      bodyProportionStyle: 'proportional_human',
      skinColor: '#d9c2ae',
      eyeStyle: 'wide_amber',
      hairStyle: 'silver_bun',
      hairColor: '#d4d4d8',
      outfitColor: '#4f3548',
      accentColor: '#6e562f',
      mouthStyle: 'nervous_frown',
      facialExpression: 'suspicious',
      spineCurvature: 0,
      hasWalkingCane: false,
      hasSpectacles: true,
      heightScale: 0.94,
      widthScale: 0.98,
      headScale: 1.0,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_eleanor }
    },
    stats: { physic: 2, agility: 3, mind: 4, endurance: 2, pointsRemaining: 0 },
    assignedTraits: ['hollow_knock'],
    dailySchedule: [
      {
        timeRange: '06:00–11:59',
        phase: 'Morning',
        location: 'Lobby Registration Desk',
        action: 'Stands by the front desk demanding her morning mail and complaining of wall drafts.',
        targetFloor: 'lobby',
        targetPosition: [-1.8, 0, -4.8],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      },
      {
        timeRange: '12:00–16:59',
        phase: 'Afternoon',
        location: 'Floor 1 Corridor & Room 101',
        action: 'Slowly paces the Floor 1 runner, inspecting the wainscot seams.',
        targetFloor: 'floor1',
        targetPosition: [-2.2, 0, -1.5],
        activityGesture: 'pace_corridor',
        randomEventsEnabled: true
      },
      {
        timeRange: '17:00–21:59',
        phase: 'Evening',
        location: 'Lobby West Parlor (Social Hour)',
        action: 'Sits in the Lobby West Parlor during evening social hour, whispering with Dr. Finch about Room 102.',
        targetFloor: 'lobby',
        targetPosition: [-4.5, 0, 1.8],
        activityGesture: 'parlor_social',
        randomEventsEnabled: true
      },
      {
        timeRange: '22:00–05:59',
        phase: 'Late Night',
        location: 'Suite 101 (Floor 1)',
        action: 'Presses a brass stethoscope against the north plaster wall in Room 101 listening to the crawlspace.',
        targetFloor: 'floor1',
        targetPosition: [-4.5, 0, -4.2],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      }
    ]
  },
  {
    id: 'agent_barnaby',
    name: 'Dr. Barnaby Finch',
    role: 'tenant',
    roomNumber: 'Room 104',
    floor: 'floor1',
    position: [4.5, 0, 4.2],
    status: 'present',
    occupation: 'Insomniac Watchmaker (27-Yr Resident, Rm 104)',
    personality: 'Fidgety, meticulous permanent resident who has repaired watches in Suite 104 for nearly three decades; complains about the buzz of piecemeal conduit wiring.',
    voiceStyle: 'Oxford-Inflected Antiquarian accent · Reverent, ink-stained, conspiratorial academic bass',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_barnaby },
    activeFacialExpression: 'paranoid_twitch',
    secretTruth: 'When installers drilled surface conduits for the late-70s hallway upgrades, he measured Floor 1 and proved the interior suites are 4 feet narrower than the exterior brick facade—hiding secret corridors.',
    knownFacts: [
      'Has lived in Suite 104 for 27 years, brewing tea on a harvest-gold hotplate kitchenette while mapping every renovation patch in the building.',
      'Measured a 4-foot structural cavity between Room 103 and Room 104 that management deliberately routed the electrical conduits around.'
    ],
    memories: [
      'Left his brass calipers near the south wall of Floor 1.',
      'Warned 25-year resident Julian in Room 202 not to listen to the microcassette player after midnight.'
    ],
    suspicionLevel: 15,
    trustLevel: 70,
    appearance: {
      archetype: 'Detective Clerk',
      headShape: 'proportional_human',
      bodyProportionStyle: 'proportional_human',
      skinColor: '#d4bda8',
      eyeStyle: 'button_dark',
      hairStyle: 'messy_curls',
      hairColor: '#78716c',
      outfitColor: '#2d3b36',
      accentColor: '#6e562f',
      mouthStyle: 'nervous_frown',
      facialExpression: 'paranoid_twitch',
      spineCurvature: 0,
      hasWalkingCane: false,
      hasSpectacles: true,
      heightScale: 0.96,
      widthScale: 1.0,
      headScale: 1.0,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_barnaby }
    },
    stats: { physic: 2, agility: 4, mind: 5, endurance: 2, pointsRemaining: 0 },
    assignedTraits: ['hollow_knock', 'iron_nerve'],
    dailySchedule: [
      {
        timeRange: '06:00–11:59',
        phase: 'Morning',
        location: 'Room 104 Workbench (Floor 1)',
        action: 'Calibrates pocket chronometers and logs mains frequency fluctuations in Room 104.',
        targetFloor: 'floor1',
        targetPosition: [4.5, 0, 4.2],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      },
      {
        timeRange: '12:00–16:59',
        phase: 'Afternoon',
        location: 'Floor 1 Corridor',
        action: 'Measures the exterior vs. interior wall depth along the Floor 1 hallway with brass calipers.',
        targetFloor: 'floor1',
        targetPosition: [1.8, 0, 1.5],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      },
      {
        timeRange: '17:00–21:59',
        phase: 'Evening',
        location: 'Lobby West Parlor (Social Hour)',
        action: 'Paces nervously near the Lobby vending machine and parlor armchairs during social hour.',
        targetFloor: 'lobby',
        targetPosition: [-3.2, 0, 2.6],
        activityGesture: 'parlor_social',
        randomEventsEnabled: true
      },
      {
        timeRange: '22:00–05:59',
        phase: 'Late Night',
        location: 'Suite 104 (Floor 1)',
        action: 'Stands awake in Room 104 timing the 33 Hz boiler hum against his master tuning fork.',
        targetFloor: 'floor1',
        targetPosition: [4.5, 0, 4.2],
        activityGesture: 'pace_corridor',
        randomEventsEnabled: true
      }
    ]
  },
  {
    id: 'agent_julian',
    name: 'Clara Holloway',
    role: 'tenant',
    roomNumber: 'Room 201',
    floor: 'floor2',
    position: [-4.5, 0, -4.0],
    status: 'erratic',
    occupation: 'Stage Costume Designer (19-Yr Resident, Rm 201)',
    personality: 'Sharp-tongued, observant permanent tenant of 19 years; terrified since her longtime neighbor Julian in Room 202 (a 25-year resident) vanished mid-sentence through the wall.',
    voiceStyle: 'Manhattan Upper East Side Vintage accent · Breathless, velvet-gloved, theatrical socialite mezzo',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_clara },
    activeFacialExpression: 'cryptic_whisper',
    secretTruth: 'She peered through a gap beside a corroded radiator valve in the wainscot and saw decade-long residents walking in a trance down a hidden brick stair toward the Basement.',
    knownFacts: [
      'Has lived in Suite 201 for 19 years; her sewing mannequins and steamer trunks fill the corners next to a faded 1979 harvest-gold kitchenette.',
      'Her neighbor Julian in Room 202—who never left the building in 25 years—vanished while his microcassette deck and woodgrain CRT TV were still humming.'
    ],
    memories: [
      'Heard the cassette player in Room 202 playing backward at 2:15 AM.',
      'Locked her suite’s original transom door and deadbolt thrice, yet found red brick dust on her threadbare carpet.'
    ],
    suspicionLevel: 30,
    trustLevel: 55,
    appearance: {
      archetype: 'Eccentric Socialite',
      headShape: 'proportional_human',
      bodyProportionStyle: 'proportional_human',
      skinColor: '#c9a082',
      eyeStyle: 'wide_amber',
      hairStyle: 'swept_pompadour',
      hairColor: '#59201c',
      outfitColor: '#4a5438',
      accentColor: '#6e562f',
      mouthStyle: 'calm_neutral',
      facialExpression: 'cryptic_whisper',
      spineCurvature: 0,
      hasWalkingCane: false,
      hasSpectacles: false,
      heightScale: 1.0,
      widthScale: 0.95,
      headScale: 1.0,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_clara }
    },
    stats: { physic: 2, agility: 4, mind: 4, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['carpet_step'],
    dailySchedule: [
      {
        timeRange: '06:00–11:59',
        phase: 'Morning',
        location: 'Suite 201 (Floor 2)',
        action: 'Repairs vintage velvet theatre costumes and checks the triple deadbolts on her transom door.',
        targetFloor: 'floor2',
        targetPosition: [-4.5, 0, -4.0],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      },
      {
        timeRange: '12:00–16:59',
        phase: 'Afternoon',
        location: 'Suite 202 Doorway (Floor 2)',
        action: 'Presses her ear to the vanished neighbor Julian’s door in Room 202.',
        targetFloor: 'floor2',
        targetPosition: [3.2, 0, -3.5],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      },
      {
        timeRange: '17:00–21:59',
        phase: 'Evening',
        location: 'Lobby Payphone & Parlor (Social Hour)',
        action: 'Descends to the Lobby Parlor during social hour to whisper warnings about Room 202.',
        targetFloor: 'lobby',
        targetPosition: [4.2, 0, 2.2],
        activityGesture: 'parlor_social',
        randomEventsEnabled: true
      },
      {
        timeRange: '22:00–05:59',
        phase: 'Late Night',
        location: 'Suite 201 (Floor 2)',
        action: 'Watches the radiator valve gap in Suite 201 for brick dust and midnight footsteps.',
        targetFloor: 'floor2',
        targetPosition: [-4.5, 0, -4.0],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      }
    ]
  },
  {
    id: 'agent_marcus',
    name: 'Marcus Sterling',
    role: 'tenant',
    roomNumber: 'Room 304',
    floor: 'floor3',
    position: [4.2, 0, 3.2],
    status: 'present',
    occupation: 'Architectural Historian (12-Yr Resident, Rm 304)',
    personality: 'Scholarly, intense permanent resident (considered "the newcomer" by the 30-year tenants) who studies how the old apartment-hotel was patched over the decades.',
    voiceStyle: 'Chicago Industrial Drafting-Room accent · Restless, analytical, sleep-deprived structural tenor',
    voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_marcus },
    activeFacialExpression: 'side_eye_glare',
    secretTruth: 'He moved into Room 304 twelve years ago as a permanent resident after recovering the original blueprint of "The House Suite" and overlaying every decade of piecemeal plumbing and electrical upgrades.',
    knownFacts: [
      'Keeps the annotated construction blueprint on his drafting table in Room 304 showing how every decade’s small upgrades carefully avoided piercing the hollow inner shaft.',
      'Knows that unlocking two secret passages and four clues exposes the Basement Sub-Vault where the vanished multi-decade residents are drawn.'
    ],
    memories: [
      'Traced the hidden shaft from Room 304 all the way down to Basement Sub-Vault 00.',
      'Suspects Arthur Pendelton has kept the hotel running as a permanent residential building specifically to preserve its sleepwalking experiment.'
    ],
    suspicionLevel: 10,
    trustLevel: 75,
    appearance: {
      archetype: 'Detective Clerk',
      headShape: 'proportional_human',
      bodyProportionStyle: 'proportional_human',
      skinColor: '#d4a687',
      eyeStyle: 'button_dark',
      hairStyle: 'swept_pompadour',
      hairColor: '#2b180a',
      outfitColor: '#2e2b27',
      accentColor: '#6e562f',
      mouthStyle: 'slight_smirk',
      facialExpression: 'side_eye_glare',
      spineCurvature: 0,
      hasWalkingCane: false,
      hasSpectacles: true,
      heightScale: 1.02,
      widthScale: 0.98,
      headScale: 1.0,
      voiceProfile: { ...DEFAULT_CHARACTER_VOICE_PROFILES.agent_marcus }
    },
    stats: { physic: 3, agility: 3, mind: 5, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['wax_memory', 'hollow_knock'],
    dailySchedule: [
      {
        timeRange: '06:00–11:59',
        phase: 'Morning',
        location: 'Room 304 Drafting Table (Floor 3)',
        action: 'Overlays 1898 structural blueprints with 1979 electrical conduit diagrams in Room 304.',
        targetFloor: 'floor3',
        targetPosition: [4.2, 0, 3.2],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      },
      {
        timeRange: '12:00–16:59',
        phase: 'Afternoon',
        location: 'Floor 2 Secret Bookshelf Wall',
        action: 'Inspects the hollow masonry joints along the Floor 2 North Corridor.',
        targetFloor: 'floor2',
        targetPosition: [0.0, 0, -2.5],
        activityGesture: 'wall_listen',
        randomEventsEnabled: true
      },
      {
        timeRange: '17:00–21:59',
        phase: 'Evening',
        location: 'Lobby West Parlor (Social Hour)',
        action: 'Joins the other residents in the Lobby Parlor for evening coffee while observing Arthur.',
        targetFloor: 'lobby',
        targetPosition: [2.8, 0, 1.8],
        activityGesture: 'parlor_social',
        randomEventsEnabled: true
      },
      {
        timeRange: '22:00–05:59',
        phase: 'Late Night',
        location: 'Suite 304 (Floor 3)',
        action: 'Guards the original blueprint roll in Room 304 and listens to the acoustic shaft.',
        targetFloor: 'floor3',
        targetPosition: [4.2, 0, 3.2],
        activityGesture: 'inspect_ledger',
        randomEventsEnabled: true
      }
    ]
  }
];
