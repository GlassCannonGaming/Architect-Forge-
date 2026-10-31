import {
  PlacedAsset,
  HotelAgentProfile,
  FloorId,
  TexturePresetId,
  AssetCategory,
  CompositeSubPart
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
  isGenerated?: boolean;
}

export function createBlueprintFromAsset(asset: PlacedAsset): AssetBlueprint {
  return {
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
    isGenerated: true
  };
}

export const ASSET_CATALOG: AssetBlueprint[] = [
  {
    subType: 'brick_wall_segment',
    name: 'Vintage Red Brick Wall',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.35],
    defaultColor: '#8c3b2b',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    description: 'Load-bearing weathered red-brick masonry partition with cornice trim.'
  },
  {
    subType: 'interior_plaster_wall',
    name: 'Wainscoted Plaster Wall',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.3],
    defaultColor: '#d6d0c4',
    defaultTexture: 'plaster_cream',
    collidable: true,
    description: 'Modular interior room divider with dark oak wainscoting.'
  },
  {
    subType: 'window_brick_wall',
    name: 'Casement Window Wall',
    category: 'window_wall',
    defaultDimensions: [3.0, 3.0, 0.35],
    defaultColor: '#7c2d12',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    description: 'Exterior brick wall with tall vintage sash window frame.'
  },
  {
    subType: 'secret_bookshelf_door',
    name: 'Pivoting Secret Bookshelf Wall',
    category: 'secret_wall',
    defaultDimensions: [2.2, 2.9, 0.45],
    defaultColor: '#5c3824',
    defaultTexture: 'oak_parquet',
    collidable: true,
    isSecretPassage: true,
    description: 'Concealed passage door disguised as a mahogany bookcase between suites.'
  },
  {
    subType: 'suite_door',
    name: 'Transom Hotel Suite Door',
    category: 'door',
    defaultDimensions: [1.4, 2.6, 0.25],
    defaultColor: '#6b3e26',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Numbered mahogany guest room door with brass transom grille.'
  },
  {
    subType: 'floor_runner_slab',
    name: 'Crimson Parlor Floor Rug',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.06, 3.2],
    defaultColor: '#7f1d1d',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    description: 'Plush woven hotel carpet tile for acoustic dampening.'
  },
  {
    subType: 'four_poster_bed',
    name: 'Carved Canopy Suite Bed',
    category: 'furniture',
    defaultDimensions: [2.1, 1.4, 2.4],
    defaultColor: '#7f1d1d',
    defaultTexture: 'velvet_crimson',
    collidable: true,
    description: 'Low-poly hotel bed with brass headboard posts and quilt.'
  },
  {
    subType: 'reception_desk',
    name: 'Concierge Registration Desk',
    category: 'furniture',
    defaultDimensions: [3.4, 1.15, 1.1],
    defaultColor: '#4a2810',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Mahogany front desk with key cubbies, call bell, and guest ledger.'
  },
  {
    subType: 'vintage_radiator',
    name: 'Clawfoot Steam Radiator',
    category: 'appliance',
    defaultDimensions: [1.2, 0.9, 0.4],
    defaultColor: '#b48a3e',
    defaultTexture: 'aged_brass',
    collidable: true,
    description: 'Clanking cast-iron steam pipe appliance that clatters at midnight.'
  },
  {
    subType: 'icebox_fridge',
    name: 'Compact Hotel Mini-Fridge',
    category: 'appliance',
    defaultDimensions: [0.95, 1.65, 0.85],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: true,
    description: 'Enamel-lined compact suite refrigerator with magnetic latches.'
  },
  {
    subType: 'rotary_wall_phone',
    name: 'Brass Switchboard Console',
    category: 'appliance',
    defaultDimensions: [0.9, 1.3, 0.65],
    defaultColor: '#ca8a04',
    defaultTexture: 'aged_brass',
    collidable: true,
    description: 'Internal hotel house-phone connected to the front desk and basement.'
  },
  {
    subType: 'banker_desk_lamp',
    name: 'Emerald Study Desk & Lamp',
    category: 'lighting',
    defaultDimensions: [1.5, 1.25, 0.9],
    defaultColor: '#15803d',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Writing desk topped with a warm glowing green-glass shade lamp.'
  },
  {
    subType: 'crt_tv_vhs_combo',
    name: '90s CRT Hotel TV & VHS Combo',
    category: 'appliance',
    defaultDimensions: [0.9, 0.85, 0.75],
    defaultColor: '#334155',
    defaultTexture: 'plaster_cream',
    collidable: true,
    description: 'Chunky 90s dark slate CRT tv with built-in VHS tape cassette player.'
  },
  {
    subType: 'soda_vending_machine',
    name: '90s Retro Soda Dispenser Machine',
    category: 'appliance',
    defaultDimensions: [1.1, 2.1, 0.9],
    defaultColor: '#0f172a',
    defaultTexture: 'nyc_old_brick',
    collidable: true,
    description: 'Illuminated 90s corridor soda dispenser with neon drink selector buttons.'
  },
  {
    subType: 'concierge_crt_computer',
    name: '90s Concierge Desk CRT Computer',
    category: 'appliance',
    defaultDimensions: [0.95, 0.85, 0.8],
    defaultColor: '#cbd5e1',
    defaultTexture: 'plaster_cream',
    collidable: true,
    description: 'Beige desktop tower with glowing CRT monitor and mechanical keyboard.'
  },
  {
    subType: 'retro_teal_armchair',
    name: '90s Retro Hotel Lobby Armchair',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.95],
    defaultColor: '#0d9488',
    defaultTexture: 'velvet_crimson',
    collidable: true,
    description: 'Geometric teal and purple upholstered lobby chair on tubular steel frame.'
  },
  {
    subType: 'lobby_payphone_booth',
    name: '90s Hotel Lobby Telephone Booth',
    category: 'appliance',
    defaultDimensions: [0.85, 1.85, 0.65],
    defaultColor: '#334155',
    defaultTexture: 'aged_brass',
    collidable: true,
    description: 'Stainless steel wall telephone mounted inside transparent acrylic partitions.'
  },
  {
    subType: 'porcelain_bathtub',
    name: 'Porcelain Clawfoot Hotel Bathtub',
    category: 'furniture',
    defaultDimensions: [1.6, 0.75, 0.8],
    defaultColor: '#f8fafc',
    defaultTexture: 'checker_marble',
    collidable: true,
    description: 'Deep porcelain soaker tub resting on four ornate brass claw feet.'
  },
  {
    subType: 'marble_vanity_sink',
    name: 'Marble Vanity Bathroom Sink',
    category: 'furniture',
    defaultDimensions: [1.1, 1.25, 0.65],
    defaultColor: '#f1f5f9',
    defaultTexture: 'checker_marble',
    collidable: true,
    description: 'Carrara marble countertop vanity with recessed porcelain basin and brass faucet.'
  },
  {
    subType: 'suite_porcelain_toilet',
    name: 'Porcelain Suite Toilet & Flush Tank',
    category: 'furniture',
    defaultDimensions: [0.55, 0.85, 0.75],
    defaultColor: '#ffffff',
    defaultTexture: 'checker_marble',
    collidable: true,
    description: 'Sanitary porcelain bathroom toilet with ceramic water tank and brass flush lever.'
  },
  {
    subType: 'gilded_wall_painting',
    name: 'Gilded Art Deco Hotel Wall Painting',
    category: 'custom_ai',
    defaultDimensions: [1.2, 1.0, 0.12],
    defaultColor: '#d4af37',
    defaultTexture: 'aged_brass',
    collidable: false,
    description: 'Ornate gold-leaf carved picture frame housing an oil landscape painting.'
  },
  {
    subType: 'potted_lobby_palm',
    name: 'Potted Lobby Fan Palm Plant',
    category: 'custom_ai',
    defaultDimensions: [0.85, 1.45, 0.85],
    defaultColor: '#166534',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Lush tropical fan palm potted inside a terracotta planter with polished brass rim.'
  },
  {
    subType: 'brass_towel_rack',
    name: 'Brass Wall Towel Rack & Linens',
    category: 'furniture',
    defaultDimensions: [0.75, 0.65, 0.35],
    defaultColor: '#ca8a04',
    defaultTexture: 'aged_brass',
    collidable: false,
    description: 'Wall-mounted double brass towel rail holding freshly laundered plush hotel towels.'
  },
  {
    subType: 'retrofit_window_ac',
    name: 'Retrofitted Window AC & Conduit Box',
    category: 'appliance',
    defaultDimensions: [0.85, 0.95, 0.65],
    defaultColor: '#cbd5e1',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    description: 'Piecemeal 1980s/90s window air-conditioner wired via surface-mounted metal electrical conduit over old plaster.'
  },
  {
    subType: 'resident_kitchenette',
    name: 'Piecemeal Resident Hotplate & Kitchenette',
    category: 'appliance',
    defaultDimensions: [1.15, 1.1, 0.65],
    defaultColor: '#5c3824',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Makeshift long-term tenant kitchenette counter with formica top, glowing coil hotplate, and retro microwave.'
  },
  {
    subType: 'resident_steamer_trunk',
    name: 'Decade-Lived-In Steamer Trunk & Keepsakes',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.7],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: true,
    description: 'Brass-bound leather steamer trunk stacked with hatboxes and decades of personal tenant journals.'
  }
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
      color: '#d6d0c4',
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
      color: '#d6d0c4',
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
      color: '#d6d0c4',
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
      color: '#d6d0c4',
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
      color: '#6b3e26',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Brass plate reads: SUITE ${prefix}1.`
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
      color: '#6b3e26',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Brass plate reads: SUITE ${prefix}2.`
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
      color: '#6b3e26',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Brass plate reads: SUITE ${prefix}3.`
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
      color: '#6b3e26',
      textureId: 'oak_parquet',
      isOpen: true,
      collidable: true,
      inspectText: `Brass plate reads: SUITE ${prefix}4.`
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
      color: '#5c3824',
      textureId: 'oak_parquet',
      isSecretPassage: true,
      isOpen: false,
      collidable: true,
      inspectText: `A hollow mahogany bookcase hiding a brick crawlspace between Room ${prefix}1 and Room ${prefix}2.`
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
      color: '#7c2d12',
      textureId: 'nyc_old_brick',
      isSecretPassage: true,
      isOpen: false,
      collidable: true,
      inspectText: `Cold drafty mortar seams conceal a hidden passage linking Room ${prefix}3 and Room ${prefix}4.`
    },
    // Suite Furnishings in the 4 rooms
    {
      id: `${floor}_bed_1`,
      name: `Suite ${prefix}1 Canopy Bed`,
      category: 'furniture',
      subType: 'four_poster_bed',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-6.8, 0.7, -6.5],
      dimensions: [2.1, 1.4, 2.4],
      rotationY: 0,
      color: '#7f1d1d',
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
      color: '#15803d',
      textureId: 'oak_parquet',
      collidable: true
    },
    {
      id: `${floor}_bed_3`,
      name: `Suite ${prefix}3 Canopy Bed`,
      category: 'furniture',
      subType: 'four_poster_bed',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-6.8, 0.7, 6.5],
      dimensions: [2.1, 1.4, 2.4],
      rotationY: Math.PI,
      color: '#1e3a8a',
      textureId: 'wallpaper_damask',
      collidable: true
    },
    {
      id: `${floor}_icebox_4`,
      name: `Suite ${prefix}4 Enamel Icebox`,
      category: 'appliance',
      subType: 'icebox_fridge',
      floor,
      roomNumber: `Room ${prefix}4`,
      position: [7.2, 0.82, 6.6],
      dimensions: [0.95, 1.65, 0.85],
      rotationY: Math.PI,
      color: '#e2e8f0',
      textureId: 'plaster_cream',
      collidable: true
    },
    // Small piecemeal upgrades & permanent multi-decade resident belongings
    {
      id: `${floor}_crt_tv_1`,
      name: `Suite ${prefix}1 Retrofitted 90s CRT TV`,
      category: 'appliance',
      subType: 'crt_tv_vhs_combo',
      floor,
      roomNumber: `Room ${prefix}1`,
      position: [-7.2, 0.42, -3.2],
      dimensions: [0.9, 0.85, 0.75],
      rotationY: Math.PI / 2,
      color: '#334155',
      textureId: 'plaster_cream',
      collidable: true,
      inspectText: `A 1990s CRT TV & VHS combo wired via surface conduit into Suite ${prefix}1's original wainscoting.`
    },
    {
      id: `${floor}_kitchenette_3`,
      name: `Suite ${prefix}3 Piecemeal Kitchenette`,
      category: 'appliance',
      subType: 'resident_kitchenette',
      floor,
      roomNumber: `Room ${prefix}3`,
      position: [-7.2, 0.55, 3.2],
      dimensions: [1.15, 1.1, 0.65],
      rotationY: Math.PI / 2,
      color: '#5c3824',
      textureId: 'oak_parquet',
      collidable: true,
      inspectText: `A makeshift hotplate and microwave kitchenette used by a permanent multi-decade tenant.`
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
      color: '#451a03',
      textureId: 'oak_parquet',
      collidable: true,
      inspectText: `Leather steamer trunk and hatboxes belonging to a permanent resident who moved in decades ago.`
    },
    {
      id: `${floor}_rug_center`,
      name: `Floor ${prefix[0]} Corridor Runner`,
      category: 'floor_tile',
      subType: 'floor_runner_slab',
      floor,
      roomNumber: 'Corridor',
      position: [0, 0.03, 0],
      dimensions: [14.0, 0.05, 2.2],
      rotationY: 0,
      color: '#7f1d1d',
      textureId: 'velvet_crimson',
      collidable: false
    }
  ];

  return assets;
}

export const INITIAL_PLACED_ASSETS: PlacedAsset[] = [
  // MAIN LOBBY ASSETS (Old Architecture + Small Piecemeal Upgrades Over the Decades)
  {
    id: 'lobby_front_desk',
    name: 'Grand Registration Counter',
    category: 'furniture',
    subType: 'reception_desk',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [0, 0.58, -5.2],
    dimensions: [4.2, 1.15, 1.2],
    rotationY: 0,
    color: '#4a2810',
    textureId: 'oak_parquet',
    collidable: true,
    clueId: 'clue_guest_register',
    inspectText: 'The leather-bound Permanent Resident Ledger lies open next to a retrofitted 90s CRT terminal. Several multi-decade tenants were signed out in Arthur’s own handwriting.'
  },
  {
    id: 'lobby_retrofit_computer',
    name: 'Retrofitted Concierge CRT Computer',
    category: 'appliance',
    subType: 'concierge_crt_computer',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [2.8, 0.42, -5.2],
    dimensions: [0.95, 0.85, 0.8],
    rotationY: 0,
    color: '#cbd5e1',
    textureId: 'plaster_cream',
    collidable: true,
    inspectText: 'A beige 1990s CRT desktop computer bolted onto a side table beside the antique mahogany front desk to log long-term resident room assignments and hallway maintenance.'
  },
  {
    id: 'lobby_vending_machine',
    name: 'Alcove 90s Soda Dispenser Machine',
    category: 'appliance',
    subType: 'soda_vending_machine',
    floor: 'lobby',
    roomNumber: 'Luggage & Lift Alcove',
    position: [6.5, 1.05, 1.5],
    dimensions: [1.1, 2.1, 0.9],
    rotationY: -Math.PI / 2,
    color: '#0f172a',
    textureId: 'nyc_old_brick',
    collidable: true,
    inspectText: 'Installed during a minor 1994 lobby upgrade; its neon marquee hums against the century-old wainscoting.'
  },
  {
    id: 'lobby_payphone_unit',
    name: 'Lobby Wall Telephone Booth',
    category: 'appliance',
    subType: 'lobby_payphone_booth',
    floor: 'lobby',
    roomNumber: 'Luggage & Lift Alcove',
    position: [6.5, 0.92, -1.5],
    dimensions: [0.85, 1.85, 0.65],
    rotationY: -Math.PI / 2,
    color: '#334155',
    textureId: 'aged_brass',
    collidable: true,
    inspectText: 'A stainless-steel house telephone retrofitted onto the brick wall for permanent residents who disconnected their suite intercom lines.'
  },
  {
    id: 'lobby_carpet_runner',
    name: 'Grand Lobby Crimson Carpet',
    category: 'floor_tile',
    subType: 'floor_runner_slab',
    floor: 'lobby',
    roomNumber: 'Main Lobby',
    position: [0, 0.03, 0.5],
    dimensions: [5.5, 0.05, 9.0],
    rotationY: 0,
    color: '#7f1d1d',
    textureId: 'velvet_crimson',
    collidable: false
  },
  {
    id: 'lobby_west_wall',
    name: 'Parlor Archway Partition',
    category: 'wall',
    subType: 'brick_wall_segment',
    floor: 'lobby',
    roomNumber: 'West Parlor Lounge',
    position: [-5.5, 1.5, -1.5],
    dimensions: [4.2, 3.0, 0.35],
    rotationY: 0,
    color: '#8c3b2b',
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
    color: '#5c3824',
    textureId: 'oak_parquet',
    isSecretPassage: true,
    isOpen: false,
    collidable: true,
    inspectText: 'A false mahogany key-cabinet behind the front desk concealing the chute to the Basement.'
  },
  {
    id: 'lobby_switchboard',
    name: 'House Brass Switchboard',
    category: 'appliance',
    subType: 'rotary_wall_phone',
    floor: 'lobby',
    roomNumber: 'Front Desk',
    position: [-3.2, 0.65, -5.2],
    dimensions: [0.95, 1.3, 0.7],
    rotationY: 0,
    color: '#ca8a04',
    textureId: 'aged_brass',
    collidable: true,
    inspectText: 'Original brass plug-board still used for intercom calls to permanent residents; Cord #202 is humming with low static.'
  },
  {
    id: 'lobby_parlor_lamp',
    name: 'Parlor Reading Desk & Lamp',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'lobby',
    roomNumber: 'West Parlor Lounge',
    position: [-6.2, 0.62, 3.2],
    dimensions: [1.5, 1.25, 0.9],
    rotationY: Math.PI / 2,
    color: '#15803d',
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
    color: '#7c2d12',
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
    color: '#7c2d12',
    textureId: 'nyc_old_brick',
    isSecretPassage: true,
    isOpen: false,
    collidable: true,
    clueId: 'clue_basement_key',
    inspectText: 'Behind this brick seal lies Master Skeleton Key #00 and the original sleepwalking resonators.'
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
    color: '#ca8a04',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_basement_key',
    inspectText: 'Resting beside the brass lamp is Master Skeleton Key #00!'
  },

  // FLOORS 1, 2, 3 (4 Rooms each + Secret Passages + Piecemeal Upgrades)
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
    color: '#b48a3e',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_hollow_brick_101',
    inspectText: 'A brass latch hidden behind Eleanor’s 34-year-old radiator unlocks the secret passage between Room 101 and Room 102!'
  },
  {
    id: 'floor2_clue_cassette_player',
    name: 'Julian’s Desktop Cassette Player',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'floor2',
    roomNumber: 'Room 202',
    position: [3.2, 0.62, -4.8],
    dimensions: [1.3, 1.25, 0.9],
    rotationY: -Math.PI / 4,
    color: '#ca8a04',
    textureId: 'aged_brass',
    collidable: true,
    clueId: 'clue_spinning_wax_202',
    inspectText: '25-year resident Julian Vance vanished from his suite; the microcassette whispers: "Press the mortar seam on the south corridor wall to enter Room 204 unseen."'
  },
  {
    id: 'floor3_clue_drafting_table',
    name: 'Architect’s Drafting Table',
    category: 'lighting',
    subType: 'banker_desk_lamp',
    floor: 'floor3',
    roomNumber: 'Room 304',
    position: [4.2, 0.62, 4.5],
    dimensions: [1.7, 1.25, 1.0],
    rotationY: Math.PI,
    color: '#38bdf8',
    textureId: 'oak_parquet',
    collidable: true,
    clueId: 'clue_blueprints_304',
    inspectText: 'Original construction blueprints annotated with decades of piecemeal conduit and plumbing upgrades over the hidden crawlspaces.'
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
    personality: 'Keen-eared, methodical, slightly eerie handheld microcassette dictaphone entity that only knows what you have uncovered and remembers every transcript.',
    secretTruth: 'Resonates with the hotel’s original acoustic pipes and retrofitted electrical conduits to replay forgotten conversations.',
    knownFacts: [
      'You were just hired tonight as the Night Clerk at The Alderney Arms—an old residential hotel home to permanent multi-decade tenants.',
      'Over the decades, the hotel received small piecemeal upgrades (surface conduit wiring, 90s CRT TVs, a lobby soda machine, and hotplate kitchenettes) without ever disturbing the hollow inner brick walls.'
    ],
    memories: [
      'Logged Shift Start: Midnight rain outside; old red bricks and retrofitted neon dispenser lights humming in the lobby.',
      'Instruction: Inspect permanent residents’ suites, talk to Arthur and the long-term tenants, and ask me to cross-reference clues.'
    ],
    suspicionLevel: 0,
    trustLevel: 100,
    appearance: {
      archetype: 'Occult Archivist',
      headShape: 'chibi_block',
      skinColor: '#e5c158',
      eyeStyle: 'wide_amber',
      hairStyle: 'bowler_hat',
      hairColor: '#27272a',
      outfitColor: '#78350f',
      accentColor: '#eab308',
      mouthStyle: 'calm_neutral',
      heightScale: 0.9,
      widthScale: 0.95,
      headScale: 1.15
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
    secretTruth: 'Arthur has been forging departure log entries for multi-decade permanent tenants who sleepwalk into the secret brick crawlspaces when the Basement boiler hums at 33 Hz.',
    knownFacts: [
      'Has worked the front desk for 38 years and personally supervised every piecemeal upgrade—from surface-mounted electrical conduits to the 90s CRT desk terminal.',
      'Insists long-term residents in Room 202 (Julian, 25 years) and Room 303 (31 years) merely "transferred suites" while their rooms undergo wiring upgrades.'
    ],
    memories: [
      'Hired the new Night Clerk tonight with strict instructions never to open the old wainscoting behind the retrofitted coaxial cables.',
      'Hid Master Skeleton Key #00 in the Basement Sub-Vault.'
    ],
    suspicionLevel: 35,
    trustLevel: 45,
    appearance: {
      archetype: 'Night Bellhop',
      headShape: 'tall_noir',
      skinColor: '#e2cbb0',
      eyeStyle: 'narrow_suspicious',
      hairStyle: 'bowler_hat',
      hairColor: '#1f2937',
      outfitColor: '#450a0a',
      accentColor: '#d4af37',
      mouthStyle: 'slight_smirk',
      heightScale: 1.08,
      widthScale: 0.95,
      headScale: 1.05
    },
    stats: { physic: 3, agility: 2, mind: 5, endurance: 4, pointsRemaining: 0 },
    assignedTraits: ['velvet_tongue', 'wax_memory']
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
    personality: 'Theatrical, fiercely attached to her permanent corner suite of 34 years, presses a stethoscope to the old plaster walls at night.',
    secretTruth: 'She discovered the pivoting bookshelf between Room 101 and Room 102 behind her steamer trunks and heard vanished long-term neighbors whispering from inside the masonry.',
    knownFacts: [
      'Has lived permanently in Suite 101 for 34 years and refuses to plug in the retrofitted 90s CRT TV management installed because its hum masks the sounds inside the North wall.',
      'Saw Arthur carrying an empty suitcase out of long-term neighbor Room 102 at 3:00 AM, even though forty years of belongings were still inside.'
    ],
    memories: [
      'Tapped three times on the original clawfoot radiator pipe and heard four taps back from Room 102.',
      'Hid the brass latch release behind the clawfoot radiator in Room 101.'
    ],
    suspicionLevel: 20,
    trustLevel: 60,
    appearance: {
      archetype: ' eccentric Socialite',
      headShape: 'chibi_block',
      skinColor: '#f3d9c4',
      eyeStyle: 'wide_amber',
      hairStyle: 'bob_cut',
      hairColor: '#581c87',
      outfitColor: '#7e22ce',
      accentColor: '#facc15',
      mouthStyle: 'nervous_frown',
      heightScale: 0.98,
      widthScale: 1.0,
      headScale: 1.12
    },
    stats: { physic: 2, agility: 3, mind: 4, endurance: 2, pointsRemaining: 0 },
    assignedTraits: ['hollow_knock']
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
    secretTruth: 'When installers drilled surface conduits for the 90s hallway upgrades, he measured Floor 1 and proved the interior suites are 4 feet narrower than the exterior brick facade—hiding secret corridors.',
    knownFacts: [
      'Has lived in Suite 104 for 27 years, brewing tea on a makeshift hotplate kitchenette while mapping every renovation patch in the building.',
      'Measured a 4-foot structural cavity between Room 103 and Room 104 that management deliberately routed the new electrical conduits around.'
    ],
    memories: [
      'Left his brass calipers near the south wall of Floor 1.',
      'Warned 25-year resident Julian in Room 202 not to listen to the microcassette player after midnight.'
    ],
    suspicionLevel: 15,
    trustLevel: 70,
    appearance: {
      archetype: 'Detective Clerk',
      headShape: 'rounded_toon',
      skinColor: '#ebd3be',
      eyeStyle: 'button_dark',
      hairStyle: 'messy_curls',
      hairColor: '#9ca3af',
      outfitColor: '#1e3a8a',
      accentColor: '#fbbf24',
      mouthStyle: 'nervous_frown',
      heightScale: 0.94,
      widthScale: 1.05,
      headScale: 1.15
    },
    stats: { physic: 2, agility: 4, mind: 5, endurance: 2, pointsRemaining: 0 },
    assignedTraits: ['hollow_knock', 'iron_nerve']
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
    secretTruth: 'She peered through a gap beside a retrofitted radiator valve in the wainscot and saw decade-long residents walking in a trance down a hidden brick stair toward the Basement.',
    knownFacts: [
      'Has lived in Suite 201 for 19 years; her sewing mannequins and steamer trunks fill the corners next to a patched 90s kitchenette.',
      'Her neighbor Julian in Room 202—who never left the building in 25 years—vanished while his cassette player and CRT TV were still on.'
    ],
    memories: [
      'Heard the cassette player in Room 202 playing backward at 2:15 AM.',
      'Locked her suite’s original transom door and retrofitted deadbolt thrice, yet found red brick dust on her carpet.'
    ],
    suspicionLevel: 30,
    trustLevel: 55,
    appearance: {
      archetype: ' eccentric Socialite',
      headShape: 'chibi_block',
      skinColor: '#d6a98a',
      eyeStyle: 'wide_amber',
      hairStyle: 'swept_pompadour',
      hairColor: '#991b1b',
      outfitColor: '#0f766e',
      accentColor: '#f59e0b',
      mouthStyle: 'calm_neutral',
      heightScale: 1.0,
      widthScale: 0.96,
      headScale: 1.1
    },
    stats: { physic: 2, agility: 4, mind: 4, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['carpet_step']
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
    personality: 'Scholarly, intense permanent resident (considered "the newcomer" by the 30-year tenants) who studies how the old hotel was patched over the decades.',
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
      headShape: 'chibi_block',
      skinColor: '#eab696',
      eyeStyle: 'button_dark',
      hairStyle: 'swept_pompadour',
      hairColor: '#451a03',
      outfitColor: '#374151',
      accentColor: '#38bdf8',
      mouthStyle: 'slight_smirk',
      heightScale: 1.02,
      widthScale: 1.0,
      headScale: 1.08
    },
    stats: { physic: 3, agility: 3, mind: 5, endurance: 3, pointsRemaining: 0 },
    assignedTraits: ['wax_memory', 'hollow_knock']
  }
];
