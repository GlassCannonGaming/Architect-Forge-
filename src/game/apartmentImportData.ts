import type {
  AssetCategory,
  TexturePresetId,
  CompositeSubPart,
  AssetClipboardItem,
  AssetSet,
  PlacedAsset,
  SearchableBlueprintLike,
  AssetConditionVariant
} from './rules';
import {
  APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS,
  APARTMENT_UPDATED_HOTEL_ASSET_SETS,
  STRUCTURAL_HOTEL_ASSET_SUBTYPES,
  isStructuralHotelAsset,
  canAssetBeUpdatedInHotel,
  getUpdated1990sVariantSubtype,
  getPredecessor1978Subtype,
  upgradeAssetTo1990sHotelVersion,
  downgradeAssetTo1978Version,
  buildGemini1990sHotelAssetPromptQueue
} from './apartmentUpdated1990sData';

export interface ApartmentAssetBlueprint extends SearchableBlueprintLike {
  pairedVariantId?: string;
  conditionVariant?: AssetConditionVariant;
  compositeParts?: CompositeSubPart[];
  era?: '1970s' | '1980s' | '1990s' | 'timeless';
  canUpdateInHotel?: boolean;
  structuralConstraint?: string;
  predecessor1978Id?: string;
  paired1990sId?: string;
}

/**
 * ============================================================================
 * STANDARD APARTMENT BUILDING ITEMS & 1970s/1980s RESIDENTIAL CATALOG
 * Parsed and structured from `/public/assets/aistudio/Standard_Items_located_in_a_all_appartment_buildings_6aeedbbe.txt`
 * ============================================================================
 */
export const APARTMENT_1978_ORIGINAL_CATALOG_BLUEPRINTS: ApartmentAssetBlueprint[] = [
  // --------------------------------------------------------------------------
  // 1. BUILDING INFRASTRUCTURE & SHARED SYSTEMS
  // --------------------------------------------------------------------------
  {
    subType: 'apt_front_door_intercom',
    name: 'Front Door Intercom System',
    category: 'appliance',
    defaultDimensions: [0.65, 1.25, 0.2],
    defaultColor: '#5e4c2e',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_intercom_hotel_pbx_90s',
    tags: ['apartment', 'infrastructure', 'intercom', 'brass', 'audio-linked', '1970s', 'lobby'],
    soundPresetId: 'sfx_telephone_ring',
    description: 'Wall-mounted brushed brass intercom entrance panel with perforated speaker grille, tenant call buttons, and talk/listen rocker switch.',
    compositeParts: [
      { id: 'plate', shape: 'box', offset: [0, 0, 0], size: [0.65, 1.25, 0.08], color: '#6b542c', roughness: 0.4, metalness: 0.8 },
      { id: 'speaker_grille', shape: 'box', offset: [0, 0.35, 0.05], size: [0.45, 0.35, 0.04], color: '#27272a', roughness: 0.8, metalness: 0.2 },
      { id: 'button_strip', shape: 'box', offset: [0, -0.2, 0.05], size: [0.45, 0.5, 0.03], color: '#e4d8be', roughness: 0.5, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_gang_mailboxes',
    name: 'Bank of Tenant Mailboxes',
    category: 'furniture',
    defaultDimensions: [1.8, 1.4, 0.35],
    defaultColor: '#786438',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    tags: ['apartment', 'infrastructure', 'mailboxes', 'brass', 'lobby', '1970s'],
    description: 'Recessed lobby bank of 16 brass apartment mailboxes with engraved tenant numbers, key locks, and outgoing mail drop slot.',
    compositeParts: [
      { id: 'frame', shape: 'box', offset: [0, 0, 0], size: [1.8, 1.4, 0.35], color: '#59441f', roughness: 0.5, metalness: 0.7 },
      { id: 'doors', shape: 'box', offset: [0, 0, 0.18], size: [1.68, 1.28, 0.02], color: '#7a6639', roughness: 0.35, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_wall_fire_extinguisher',
    name: 'Wall-Mounted Fire Extinguisher',
    category: 'clue_prop',
    defaultDimensions: [0.35, 0.75, 0.3],
    defaultColor: '#991b1b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    tags: ['apartment', 'infrastructure', 'safety', 'fire_extinguisher', 'game-item', '1970s', 'corridor'],
    description: 'Red enamel dry chemical fire extinguisher hanging from a metal wall bracket with inspection tag and black discharge hose.',
    compositeParts: [
      { id: 'tank', shape: 'cylinder', offset: [0, 0, 0], size: [0.22, 0.6, 0.22], color: '#b91c1c', roughness: 0.3, metalness: 0.6 },
      { id: 'handle', shape: 'box', offset: [0, 0.36, 0], size: [0.18, 0.12, 0.08], color: '#18181b', roughness: 0.6, metalness: 0.5 },
      { id: 'hose', shape: 'torus', offset: [0.08, 0.05, 0], size: [0.12, 0.03, 0.12], color: '#27272a', roughness: 0.9, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_ceiling_smoke_detector',
    name: 'Ceiling Smoke Detector',
    category: 'appliance',
    defaultDimensions: [0.3, 0.15, 0.3],
    defaultColor: '#dfd7c5',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_fire_alarm_strobe_horn_90s',
    tags: ['apartment', 'infrastructure', 'safety', 'smoke_detector', '1970s', 'ceiling'],
    description: 'Circular off-white ionization smoke alarm with slotted air chamber and intermittent red monitoring LED.',
    compositeParts: [
      { id: 'base', shape: 'cylinder', offset: [0, 0, 0], size: [0.28, 0.08, 0.28], color: '#e5ded0', roughness: 0.7, metalness: 0.1 },
      { id: 'cap', shape: 'cylinder', offset: [0, -0.05, 0], size: [0.22, 0.06, 0.22], color: '#d8cfbe', roughness: 0.6, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_illuminated_exit_sign',
    name: 'Illuminated Exit Sign',
    category: 'lighting',
    defaultDimensions: [0.65, 0.35, 0.2],
    defaultColor: '#1e293b',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_hotel_exit_sign_led_90s',
    tags: ['apartment', 'infrastructure', 'lighting', 'exit_sign', '1970s', 'corridor'],
    description: 'Overhead metal corridor exit sign with illuminated red acrylic lettering and emergency battery pack.',
    compositeParts: [
      { id: 'box', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.32, 0.18], color: '#e5ded0', roughness: 0.3, metalness: 0.5 },
      { id: 'face', shape: 'box', offset: [0, 0, 0.095], size: [0.6, 0.28, 0.01], color: '#ef4444', roughness: 0.2, metalness: 0.1, emissive: '#ef4444' }
    ]
  },
  {
    subType: 'apt_concrete_stairwell_flight',
    name: 'Concrete & Steel Stairwell Flight',
    category: 'floor_tile',
    defaultDimensions: [2.4, 2.8, 3.2],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Poured industrial concrete multi-step flight and load-bearing well; fixed egress infrastructure cannot be altered in hotel renovation.',
    tags: ['apartment', 'infrastructure', 'stairwell', 'concrete', '1970s', 'structural_fixed', 'structural'],
    description: 'Poured industrial concrete multi-step flight with ribbed non-slip nosing and welded black iron handrail.',
    compositeParts: [
      { id: 'steps', shape: 'box', offset: [0, 0, 0], size: [2.4, 1.4, 3.2], color: '#64748b', roughness: 0.9, metalness: 0.1 },
      { id: 'rail', shape: 'box', offset: [1.1, 1.2, 0], size: [0.06, 1.0, 3.2], color: '#1e293b', roughness: 0.4, metalness: 0.8 }
    ]
  },
  {
    subType: 'apt_elevator_sliding_doors',
    name: 'Corridor Elevator Sliding Doors',
    category: 'door',
    defaultDimensions: [2.2, 2.7, 0.35],
    defaultColor: '#5c4826',
    defaultTexture: 'aged_brass',
    collidable: true,
    isSecretPassage: false,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Vertical structural elevator shaft and hoistway framing; core vertical transportation shaft cannot be relocated or altered in hotel renovation.',
    animationSpec: '650ms smooth motorized pocket slide + mechanical floor chime',
    soundPresetId: 'sfx_door_latch',
    tags: ['apartment', 'infrastructure', 'elevator', 'door', 'brass', 'interactive', '1970s', 'structural_fixed', 'structural'],
    description: 'Brushed dark bronze elevator entrance doors with illuminated floor indicator dial and call button pod.',
    compositeParts: [
      { id: 'frame', shape: 'box', offset: [0, 0, 0], size: [2.2, 2.7, 0.3], color: '#4a3818', roughness: 0.5, metalness: 0.75 },
      { id: 'left_door', shape: 'box', offset: [-0.48, 0, 0.05], size: [0.92, 2.5, 0.05], color: '#6b542c', roughness: 0.4, metalness: 0.85 },
      { id: 'right_door', shape: 'box', offset: [0.48, 0, 0.05], size: [0.92, 2.5, 0.05], color: '#6b542c', roughness: 0.4, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_coin_op_washer_dryer',
    name: 'Shared Coin-Op Washer & Dryer',
    category: 'appliance',
    defaultDimensions: [1.8, 1.3, 0.95],
    defaultColor: '#e4d8be',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_hotel_ice_machine_90s',
    tags: ['apartment', 'infrastructure', 'laundry', 'appliance', '1970s'],
    soundPresetId: 'sfx_tape_recorder',
    description: 'Heavy white and almond commercial laundry pair with mechanical coin slide mechanisms and rotary wash dials.',
    compositeParts: [
      { id: 'washer', shape: 'box', offset: [-0.45, 0, 0], size: [0.85, 1.25, 0.9], color: '#eae4d5', roughness: 0.4, metalness: 0.4 },
      { id: 'dryer', shape: 'box', offset: [0.45, 0, 0], size: [0.85, 1.25, 0.9], color: '#eae4d5', roughness: 0.4, metalness: 0.4 }
    ]
  },
  {
    subType: 'apt_baseboard_steam_radiator',
    name: 'Central Steam Radiator',
    category: 'appliance',
    defaultDimensions: [1.6, 0.85, 0.35],
    defaultColor: '#7a6438',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: false,
    paired1990sId: 'apt_ptac_ac_unit_90s',
    structuralConstraint: 'Cast-iron steam boiler distribution riser and piping network; building-wide structural MEP system cannot be removed in hotel renovation.',
    tags: ['apartment', 'infrastructure', 'heating', 'radiator', 'brass', 'audio-linked', '1970s', 'structural_fixed', 'structural'],
    soundPresetId: 'sfx_steam_pipe',
    description: 'Flaking painted cast-iron multi-fin steam heating radiator with round brass steam shutoff valve.',
    compositeParts: [
      { id: 'fins', shape: 'box', offset: [0, 0, 0], size: [1.55, 0.8, 0.3], color: '#6e5a32', roughness: 0.7, metalness: 0.6 },
      { id: 'valve', shape: 'cylinder', offset: [0.75, 0.3, 0], size: [0.1, 0.18, 0.1], color: '#8a7238', roughness: 0.3, metalness: 0.9 }
    ]
  },
  {
    subType: 'apt_utility_gas_electric_meter',
    name: 'Basement Utility Meter Cluster',
    category: 'appliance',
    defaultDimensions: [1.3, 1.1, 0.4],
    defaultColor: '#475569',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Municipal electric & gas service entrance meters and distribution conduits; core utility infrastructure.',
    tags: ['apartment', 'infrastructure', 'utility', 'meter', 'basement', '1970s', 'structural_fixed', 'structural'],
    description: 'Dual glass-faced analog kilowatt and gas meters flanked by grey industrial metal conduit supply piping.',
    compositeParts: [
      { id: 'mount', shape: 'box', offset: [0, 0, 0], size: [1.25, 1.05, 0.12], color: '#334155', roughness: 0.7, metalness: 0.4 },
      { id: 'meter_left', shape: 'cylinder', offset: [-0.3, 0, 0.15], size: [0.38, 0.22, 0.38], color: '#94a3b8', roughness: 0.3, metalness: 0.7 },
      { id: 'meter_right', shape: 'cylinder', offset: [0.3, 0, 0.15], size: [0.38, 0.22, 0.38], color: '#94a3b8', roughness: 0.3, metalness: 0.7 }
    ]
  },
  {
    subType: 'apt_wall_trash_chute_door',
    name: 'Wall Trash Chute Hopper',
    category: 'door',
    defaultDimensions: [0.7, 0.95, 0.3],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Cast-iron vertical building gravity waste chute stack; structural building shaft cannot be modified or updated.',
    tags: ['apartment', 'infrastructure', 'trash_chute', 'corridor', '1970s', 'structural_fixed', 'structural'],
    description: 'Stainless steel spring-tensioned trash chute intake door with bottom foot-pedal latch and warning placard.',
    compositeParts: [
      { id: 'chute_frame', shape: 'box', offset: [0, 0, 0], size: [0.7, 0.95, 0.12], color: '#64748b', roughness: 0.5, metalness: 0.6 },
      { id: 'chute_door', shape: 'box', offset: [0, 0, 0.08], size: [0.55, 0.75, 0.06], color: '#cbd5e1', roughness: 0.25, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_hallway_globe_fixture',
    name: 'Hallway Frosted Globe Fixture',
    category: 'lighting',
    defaultDimensions: [0.45, 0.45, 0.45],
    defaultColor: '#e5ded0',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_brass_tulip_sconce_90s',
    tags: ['apartment', 'infrastructure', 'lighting', 'hallway', '1970s'],
    description: 'Ceiling-mounted frosted white glass globe diffuser seated in an aged circular brass collar.',
    compositeParts: [
      { id: 'collar', shape: 'cylinder', offset: [0, 0.18, 0], size: [0.3, 0.08, 0.3], color: '#7a6639', roughness: 0.4, metalness: 0.8 },
      { id: 'globe', shape: 'sphere', offset: [0, 0, 0], size: [0.4, 0.4, 0.4], color: '#ffffff', roughness: 0.15, metalness: 0.05, emissive: '#fffbeb' }
    ]
  },
  {
    subType: 'apt_surface_breaker_panel',
    name: 'Surface-Mounted Circuit Breaker Panel',
    category: 'appliance',
    defaultDimensions: [0.65, 0.95, 0.2],
    defaultColor: '#475569',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Primary branch electrical distribution panel and rigid riser feed; fixed MEP core infrastructure.',
    tags: ['apartment', 'infrastructure', 'breaker', 'utility', '1970s', 'structural_fixed', 'structural'],
    description: 'Grey enamel metal electrical panel box with thumb-latch door revealing rows of 15A and 20A toggle switches.',
    compositeParts: [
      { id: 'panel_box', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.95, 0.18], color: '#475569', roughness: 0.6, metalness: 0.5 },
      { id: 'panel_door', shape: 'box', offset: [0, 0, 0.09], size: [0.58, 0.88, 0.02], color: '#64748b', roughness: 0.5, metalness: 0.6 }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. 1970s & 1980s ARCHITECTURAL FINISHES & VINTAGE FIXTURES
  // --------------------------------------------------------------------------
  {
    subType: 'apt_popcorn_ceiling_tile',
    name: 'Textured Popcorn Ceiling Slab',
    category: 'floor_tile',
    defaultDimensions: [3.0, 0.08, 3.0],
    defaultColor: '#ded8cb',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: false,
    structuralConstraint: 'Poured reinforced concrete floor/ceiling slab substrate; structural architectural element.',
    tags: ['apartment', '1970s', 'finish', 'ceiling', 'popcorn_ceiling', 'structural_fixed', 'structural'],
    description: 'Thick spray-applied acoustic popcorn texture ceiling panel with subtle acoustic dampening nodule detail.'
  },
  {
    subType: 'apt_dark_wood_panel_wall',
    name: 'Dark Wood Paneling Wall',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.35],
    defaultColor: '#362114',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['apartment', '1970s', 'wood_paneling', 'wall', 'architecture'],
    description: 'Faux-walnut tongue-and-groove vertical wood-paneled apartment wall partition with routed baseboard molding.'
  },
  {
    subType: 'apt_harvest_gold_refrigerator',
    name: '1970s Harvest Gold Refrigerator',
    category: 'appliance',
    defaultDimensions: [1.0, 1.75, 0.9],
    defaultColor: '#c59223',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['apartment', '1970s', 'kitchen', 'appliance', 'harvest_gold'],
    description: 'Top-freezer residential refrigerator finished in iconic 1970s Harvest Gold porcelain enamel with horizontal chrome pull handle.',
    compositeParts: [
      { id: 'body', shape: 'box', offset: [0, 0, 0], size: [0.98, 1.72, 0.88], color: '#c59223', roughness: 0.35, metalness: 0.35 },
      { id: 'handle', shape: 'box', offset: [0.42, 0.2, 0.46], size: [0.06, 0.4, 0.06], color: '#cbd5e1', roughness: 0.2, metalness: 0.9 }
    ]
  },
  {
    subType: 'apt_avocado_green_gas_range',
    name: '1970s Avocado Green Gas Range',
    category: 'appliance',
    defaultDimensions: [0.95, 1.15, 0.85],
    defaultColor: '#4f5e34',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['apartment', '1970s', 'kitchen', 'appliance', 'avocado_green'],
    description: 'Freestanding four-burner gas oven in vintage Avocado Green with cast-iron grates and analog clock backguard.',
    compositeParts: [
      { id: 'range_base', shape: 'box', offset: [0, 0, 0], size: [0.94, 0.95, 0.82], color: '#4f5e34', roughness: 0.4, metalness: 0.3 },
      { id: 'backguard', shape: 'box', offset: [0, 0.6, -0.32], size: [0.94, 0.32, 0.12], color: '#44522c', roughness: 0.4, metalness: 0.3 }
    ]
  },
  {
    subType: 'apt_almond_dishwasher',
    name: 'Almond Built-In Dishwasher',
    category: 'appliance',
    defaultDimensions: [0.85, 0.95, 0.85],
    defaultColor: '#dfd0b8',
    defaultTexture: 'plaster_cream',
    collidable: true,
    tags: ['apartment', '1970s', 'kitchen', 'appliance', 'almond'],
    description: 'Under-counter automatic dishwasher in warm almond enamel with rotary dial timer and push-button cycle selectors.'
  },
  {
    subType: 'apt_tufted_shag_carpet',
    name: 'Tufted Ochre Shag Carpeting',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.08, 3.2],
    defaultColor: '#bd6a1b',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    tags: ['apartment', '1970s', 'carpet', 'shag', 'living'],
    description: 'Deep-pile tufted shag carpet runner in warm burnt orange, ochre, and chocolate brown tones.'
  },
  {
    subType: 'apt_geometric_linoleum_floor',
    name: 'Geometric Patterned Linoleum Sheet',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.05, 3.2],
    defaultColor: '#cfb16b',
    defaultTexture: 'checker_marble',
    collidable: false,
    tags: ['apartment', '1970s', 'floor', 'linoleum', 'kitchen'],
    description: 'Durable late-1970s kitchen linoleum sheet patterned with mustard-yellow and caramel interlocking geometric tiles.'
  },
  {
    subType: 'apt_formica_countertop_wood_trim',
    name: 'Formica Counter with Faux Wood Trim',
    category: 'furniture',
    defaultDimensions: [2.2, 0.95, 0.8],
    defaultColor: '#dfd7c5',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['apartment', '1970s', 'counter', 'formica', 'kitchen'],
    description: 'Speckled cream Formica kitchen base counter accented with routed dark walnut edge banding and stainless sink drop-in.'
  },
  {
    subType: 'apt_brass_track_light',
    name: 'Brass 3-Spot Track Light',
    category: 'lighting',
    defaultDimensions: [1.8, 0.35, 0.25],
    defaultColor: '#7a6639',
    defaultTexture: 'aged_brass',
    collidable: false,
    tags: ['apartment', '1970s', 'lighting', 'brass', 'track_light'],
    description: 'Linear polished brass ceiling rail holding 3 adjustable swivel cylinder spotlight canisters.',
    compositeParts: [
      { id: 'track_rail', shape: 'box', offset: [0, 0.12, 0], size: [1.8, 0.04, 0.08], color: '#7a6639', roughness: 0.3, metalness: 0.85 },
      { id: 'spot_1', shape: 'cylinder', offset: [-0.6, 0, 0], size: [0.14, 0.22, 0.14], color: '#8a7238', roughness: 0.3, metalness: 0.85, emissive: '#fef08a' },
      { id: 'spot_2', shape: 'cylinder', offset: [0, 0, 0], size: [0.14, 0.22, 0.14], color: '#8a7238', roughness: 0.3, metalness: 0.85, emissive: '#fef08a' },
      { id: 'spot_3', shape: 'cylinder', offset: [0.6, 0, 0], size: [0.14, 0.22, 0.14], color: '#8a7238', roughness: 0.3, metalness: 0.85, emissive: '#fef08a' }
    ]
  },
  {
    subType: 'apt_faux_wicker_swag_lamp',
    name: 'Faux-Wicker Swag Dome Lamp',
    category: 'lighting',
    defaultDimensions: [0.6, 1.1, 0.6],
    defaultColor: '#967445',
    defaultTexture: 'oak_parquet',
    collidable: false,
    tags: ['apartment', '1970s', 'lamp', 'swag_lamp', 'living', 'lighting'],
    description: 'Woven amber-toned plastic faux-wicker dome pendant suspended from looped brass ceiling swag chains.',
    compositeParts: [
      { id: 'chain', shape: 'cylinder', offset: [0, 0.45, 0], size: [0.03, 0.65, 0.03], color: '#7a6639', roughness: 0.4, metalness: 0.8 },
      { id: 'dome', shape: 'sphere', offset: [0, 0, 0], size: [0.55, 0.35, 0.55], color: '#8a6534', roughness: 0.8, metalness: 0.1, emissive: '#fef3c7' }
    ]
  },
  {
    subType: 'apt_amber_bubble_glass_fixture',
    name: 'Textured Amber Glass Ceiling Fixture',
    category: 'lighting',
    defaultDimensions: [0.45, 0.3, 0.45],
    defaultColor: '#b47828',
    defaultTexture: 'aged_brass',
    collidable: false,
    tags: ['apartment', '1970s', 'lighting', 'amber_glass', 'corridor'],
    description: 'Square textured amber pressed-bubble glass ceiling lamp held by an aged brass center finial.'
  },
  {
    subType: 'apt_wall_rotary_telephone',
    name: 'Harvest Gold Rotary Wall Phone',
    category: 'appliance',
    defaultDimensions: [0.35, 0.65, 0.25],
    defaultColor: '#c59223',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_phone_touchtone_90s',
    tags: ['apartment', '1970s', 'telephone', 'rotary', 'audio-linked', 'kitchen'],
    soundPresetId: 'sfx_telephone_ring',
    description: 'Wall-mounted harvest gold rotary dial telephone with coiled handset cord and clear rotary finger wheel.',
    compositeParts: [
      { id: 'base_housing', shape: 'box', offset: [0, 0, 0], size: [0.28, 0.52, 0.14], color: '#c59223', roughness: 0.4, metalness: 0.2 },
      { id: 'rotary_dial', shape: 'cylinder', offset: [0, -0.05, 0.08], size: [0.18, 0.03, 0.18], color: '#ffffff', roughness: 0.2, metalness: 0.3 },
      { id: 'handset', shape: 'box', offset: [-0.15, 0, 0.08], size: [0.1, 0.48, 0.1], color: '#b8851b', roughness: 0.4, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_interior_tenement_door',
    name: '1978 Tenement Interior Door & Key Tumbler',
    category: 'door',
    defaultDimensions: [1.1, 2.3, 0.25],
    defaultColor: '#422616',
    defaultTexture: 'oak_parquet',
    collidable: true,
    isSecretPassage: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_door_keycard_reader_90s',
    animationSpec: '500ms smooth right-hinged door swing',
    soundPresetId: 'sfx_door_latch',
    tags: ['apartment', '1970s', 'door', 'interactive', 'hinged'],
    description: 'Hollow-core dark walnut stain apartment unit door with tarnished brass keyhole tumbler knob and peep sight hole.',
    compositeParts: [
      { id: 'door_frame', shape: 'box', offset: [0, 0, 0], size: [1.1, 2.3, 0.22], color: '#2b180a', roughness: 0.6, metalness: 0.1 },
      { id: 'door_leaf', shape: 'box', offset: [0, 0, 0], size: [0.96, 2.18, 0.06], color: '#422616', roughness: 0.55, metalness: 0.1 },
      { id: 'brass_knob', shape: 'sphere', offset: [0.38, 0, 0.05], size: [0.04, 0.04, 0.04], color: '#8a7238', roughness: 0.35, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_round_dial_thermostat',
    name: 'Round Honeywell Dial Thermostat',
    category: 'appliance',
    defaultDimensions: [0.22, 0.22, 0.1],
    defaultColor: '#8c764a',
    defaultTexture: 'aged_brass',
    collidable: false,
    tags: ['apartment', '1970s', 'thermostat', 'brass', 'hallway'],
    description: 'Classic circular wall thermostat with outer knurled brass temperature setting dial and mercury needle.'
  },
  {
    subType: 'porcelain_bathtub',
    name: 'Water-Stained Clawfoot Bathtub',
    category: 'furniture',
    defaultDimensions: [1.6, 0.75, 0.8],
    defaultColor: '#c4baa9',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_bath_acrylic_tub_enclosure_90s',
    tags: ['apartment', '1970s', 'bathtub', 'bathroom', 'furniture'],
    description: 'Heavy cast-iron clawfoot porcelain soaking tub with oxidized greenish brass hot/cold faucets and rubber drain stopper.',
    compositeParts: [
      { id: 'basin', shape: 'box', offset: [0, 0, 0], size: [1.6, 0.7, 0.8], color: '#c4baa9', roughness: 0.65, metalness: 0.2 },
      { id: 'faucet', shape: 'cylinder', offset: [-0.7, 0.45, 0], size: [0.05, 0.2, 0.05], color: '#6e5835', roughness: 0.38, metalness: 0.75 }
    ]
  },
  {
    subType: 'suite_porcelain_toilet',
    name: 'Vintage Lever Flush Toilet',
    category: 'furniture',
    defaultDimensions: [0.65, 0.95, 0.8],
    defaultColor: '#c4baa9',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_toilet_white_90s',
    tags: ['apartment', '1970s', 'toilet', 'bathroom', 'furniture'],
    description: 'High-tank water closet with tarnished chrome trip lever and yellowed plastic seat.',
    compositeParts: [
      { id: 'bowl', shape: 'cylinder', offset: [0, -0.15, 0.1], size: [0.24, 0.45, 0.28], color: '#c4baa9', roughness: 0.65, metalness: 0.2 },
      { id: 'tank', shape: 'box', offset: [0, 0.25, -0.25], size: [0.55, 0.45, 0.26], color: '#c4baa9', roughness: 0.65, metalness: 0.2 }
    ]
  },
  {
    subType: 'marble_vanity_sink',
    name: 'Weathered Tenement Vanity Sink',
    category: 'furniture',
    defaultDimensions: [1.3, 0.95, 0.75],
    defaultColor: '#7a6850',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_vanity_cultured_marble_90s',
    tags: ['apartment', '1970s', 'vanity', 'sink', 'bathroom', 'furniture'],
    description: 'Hairline-cracked marble washbasin seated on a dark stained walnut single-drawer vanity stand.',
    compositeParts: [
      { id: 'cabinet', shape: 'box', offset: [0, -0.1, 0], size: [1.25, 0.85, 0.7], color: '#4a3824', roughness: 0.7, metalness: 0.1 },
      { id: 'basin_top', shape: 'box', offset: [0, 0.4, 0], size: [1.3, 0.12, 0.75], color: '#a89d88', roughness: 0.5, metalness: 0.3 }
    ]
  },
  {
    subType: 'brass_towel_rack',
    name: 'Tarnished Wall Towel Bar',
    category: 'furniture',
    defaultDimensions: [0.75, 0.2, 0.25],
    defaultColor: '#6e5835',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_hotel_towel_rack_chrome_90s',
    tags: ['apartment', '1970s', 'towel_rack', 'bathroom', 'furniture'],
    description: 'Wall-mounted oxidized tubular brass towel bar holding damp, musty cotton towels.'
  },
  {
    subType: 'apt_louvered_bifold_closet_door',
    name: 'Louvered Bi-Fold Closet Doors',
    category: 'door',
    defaultDimensions: [1.8, 2.5, 0.15],
    defaultColor: '#4a2f1c',
    defaultTexture: 'oak_parquet',
    collidable: true,
    tags: ['apartment', '1970s', 'closet', 'door', 'louvered', 'bedroom'],
    description: 'Pair of slatted wooden louvered bi-fold wardrobe doors with central brass pull handles.'
  },
  {
    subType: 'apt_hollywood_bulb_vanity_mirror',
    name: 'Hollywood Regency Bulb Vanity Mirror',
    category: 'furniture',
    defaultDimensions: [1.4, 1.1, 0.15],
    defaultColor: '#cbd5e1',
    defaultTexture: 'checker_marble',
    collidable: false,
    tags: ['apartment', '1970s', 'bathroom', 'vanity', 'mirror', 'lighting'],
    description: 'Wall-mounted dressing mirror flanked by twin chrome bars holding six exposed round incandescent globe bulbs.'
  },
  {
    subType: 'apt_burnt_orange_ceramic_tile',
    name: 'Burnt Orange Ceramic Wall Tile',
    category: 'wall',
    defaultDimensions: [3.0, 3.0, 0.2],
    defaultColor: '#bd4f1b',
    defaultTexture: 'checker_marble',
    collidable: true,
    tags: ['apartment', '1970s', 'bathroom', 'tile', 'burnt_orange'],
    description: 'Glazed square ceramic tile wall paneling in deep burnt orange and mustard beige mortar.'
  },

  // --------------------------------------------------------------------------
  // 3. LIVING ROOM & SHARED AREAS (Pristine vs. Unkempt Dual Variants)
  // --------------------------------------------------------------------------
  // TV
  {
    subType: 'apt_lr_television_pristine',
    name: '1978 Woodgrain Color Television [Pristine]',
    category: 'appliance',
    defaultDimensions: [1.1, 0.95, 0.75],
    defaultColor: '#3d2516',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_lr_television_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'living', 'tv', 'woodgrain', 'pristine'],
    description: 'Console color cathode television in rich polished walnut veneer with gold trim, VHF/UHF click dials, and pristine curved glass screen.'
  },
  {
    subType: 'apt_lr_television_unkempt',
    name: 'Cathode-Ray Tube (CRT) Television [Unkempt]',
    category: 'appliance',
    defaultDimensions: [1.1, 0.95, 0.75],
    defaultColor: '#2b190f',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_lr_television_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'living', 'tv', 'crt', 'unkempt', 'weathered'],
    description: 'Cathode-ray tube (CRT) television flickering with gray static snow, scratched veneer peeling at corners, and a bent rabbit-ear antenna.'
  },

  // Remote Control
  {
    subType: 'apt_lr_remote_control_pristine',
    name: 'Woodgrain TV Remote Control [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.08, 0.12],
    defaultColor: '#4a2f1c',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_lr_remote_control_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'remote', 'living', 'pristine', 'game-item'],
    description: '1978 woodgrained infrared TV remote control with crisp gold-printed channel buttons and intact battery door.'
  },
  {
    subType: 'apt_lr_remote_control_unkempt',
    name: 'Stained TV Remote [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.08, 0.12],
    defaultColor: '#362114',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_lr_remote_control_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'remote', 'living', 'unkempt', 'weathered', 'game-item'],
    description: 'Stained wood-grained TV remote with missing battery cover, exposed corroded spring contacts, and tape holding in mismatched AA cells.'
  },

  // Sofa
  {
    subType: 'apt_lr_sofa_pristine',
    name: 'Mid-Century Tweed Sofa [Pristine]',
    category: 'furniture',
    defaultDimensions: [2.2, 0.9, 0.95],
    defaultColor: '#b89445',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    pairedVariantId: 'apt_lr_sofa_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'sofa', 'living', 'seating', 'pristine'],
    description: 'Tailored mid-century sofa in clean gold-threaded woven tweed with button-tufted backrests and solid tapered walnut legs.'
  },
  {
    subType: 'apt_lr_sofa_unkempt',
    name: 'Sagging Tweed Sofa [Unkempt]',
    category: 'furniture',
    defaultDimensions: [2.2, 0.85, 0.95],
    defaultColor: '#755f32',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    pairedVariantId: 'apt_lr_sofa_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'sofa', 'living', 'seating', 'unkempt', 'weathered'],
    description: 'Sagging tweed sofa with frayed armrests, sunken lumpy seat cushions, and deep scorched cigarette burns in the fabric.'
  },

  // Coffee Table
  {
    subType: 'apt_lr_coffee_table_pristine',
    name: 'Polished Walnut Coffee Table [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.4, 0.5, 0.75],
    defaultColor: '#4a2c17',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_lr_coffee_table_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'coffee_table', 'table', 'living', 'pristine'],
    description: 'Polished dark walnut rectangular coffee table with satin polyurethane sheen and clean magazine under-shelf.'
  },
  {
    subType: 'apt_lr_coffee_table_unkempt',
    name: 'Scarred Laminate Coffee Table & Ashtray [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.4, 0.5, 0.75],
    defaultColor: '#361e0e',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_lr_coffee_table_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'coffee_table', 'table', 'living', 'unkempt', 'weathered'],
    description: 'Water-ringed laminate coffee table cluttered with sticky beverage rings and an overflowing heavy amber glass ashtray.'
  },

  // Books & Magazines
  {
    subType: 'apt_lr_books_magazines_pristine',
    name: 'Paperback Thrillers & Magazines [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.5, 0.2, 0.4],
    defaultColor: '#d97706',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_lr_books_magazines_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'books', 'props', 'living', 'pristine', 'game-item'],
    description: 'Neatly organized stack of late-70s paperback mystery thrillers and crisp lifestyle magazines.'
  },
  {
    subType: 'apt_lr_books_magazines_unkempt',
    name: 'Yellowed Paperbacks & Torn Magazines [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.55, 0.22, 0.45],
    defaultColor: '#854d0e',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_lr_books_magazines_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'books', 'props', 'living', 'unkempt', 'weathered', 'game-item'],
    description: 'Yellowed, dog-eared paperback thrillers with creased spines and torn true-crime magazines stained with spilled coffee.'
  },

  // Throw Pillows & Blanket
  {
    subType: 'apt_lr_throws_blanket_pristine',
    name: 'Woven Throw Blanket & Pillows [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.8, 0.35, 0.6],
    defaultColor: '#b45309',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_lr_throws_blanket_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'blanket', 'living', 'pristine'],
    description: 'Folded autumn-toned woven herringbone wool throw blanket with twin plump mustard velvet accent pillows.'
  },
  {
    subType: 'apt_lr_throws_blanket_unkempt',
    name: 'Threadbare Mildew-Scented Blanket [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.85, 0.3, 0.65],
    defaultColor: '#78350f',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_lr_throws_blanket_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'blanket', 'living', 'unkempt', 'weathered'],
    description: 'Muted, threadbare throw blankets smelling faintly of damp mildew, heaped into an unwashed crumpled mound.'
  },

  // Houseplants
  {
    subType: 'apt_lr_pothos_plant_pristine',
    name: 'Vibrant Pothos Houseplant [Pristine]',
    category: 'custom_ai',
    defaultDimensions: [0.65, 0.9, 0.65],
    defaultColor: '#22543d',
    defaultTexture: 'plaster_cream',
    collidable: true,
    pairedVariantId: 'apt_lr_pothos_plant_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'plant', 'living', 'decor', 'pristine'],
    description: 'Glossy trailing golden pothos vine thriving inside a glazed ivory ceramic planter on a wood pedestal.'
  },
  {
    subType: 'apt_lr_pothos_plant_unkempt',
    name: 'Half-Dead Drooping Pothos Plant [Unkempt]',
    category: 'custom_ai',
    defaultDimensions: [0.65, 0.75, 0.65],
    defaultColor: '#4a442d',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    pairedVariantId: 'apt_lr_pothos_plant_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'plant', 'living', 'decor', 'unkempt', 'weathered'],
    description: 'Half-dead, drooping pothos plant with curled yellow-brown foliage sitting in a cracked plastic pot in parched soil.'
  },

  // Wall Art
  {
    subType: 'apt_lr_wall_art_pristine',
    name: 'Framed Landscape Oil Painting [Pristine]',
    category: 'custom_ai',
    defaultDimensions: [1.2, 0.9, 0.1],
    defaultColor: '#b45309',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_lr_wall_art_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'art', 'painting', 'living', 'pristine'],
    description: 'Gilt-framed landscape oil painting depicting an autumn river scene beneath pristine, crystal-clear glass.'
  },
  {
    subType: 'apt_lr_wall_art_unkempt',
    name: 'Dusty Lopsided Painting with Cracked Glass [Unkempt]',
    category: 'custom_ai',
    defaultDimensions: [1.2, 0.9, 0.1],
    defaultColor: '#78350f',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_lr_wall_art_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'art', 'painting', 'living', 'unkempt', 'weathered'],
    description: 'Dusty, lopsided framed landscape painting hanging crookedly on a rusted nail with a diagonal fracture across the glass pane.'
  },

  // Floor Lamp
  {
    subType: 'apt_lr_floor_lamp_pristine',
    name: 'Polished Brass Torchiere Floor Lamp [Pristine]',
    category: 'lighting',
    defaultDimensions: [0.55, 1.8, 0.55],
    defaultColor: '#8a7238',
    defaultTexture: 'aged_brass',
    collidable: true,
    pairedVariantId: 'apt_lr_floor_lamp_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'lamp', 'floor_lamp', 'living', 'lighting', 'pristine'],
    description: 'Gleaming polished brass torchiere floor lamp with a crisp ivory pleated drum shade and heavy weighted base.'
  },
  {
    subType: 'apt_lr_floor_lamp_unkempt',
    name: 'Tarnished Brass Floor Lamp [Unkempt]',
    category: 'lighting',
    defaultDimensions: [0.55, 1.75, 0.55],
    defaultColor: '#524320',
    defaultTexture: 'aged_brass',
    collidable: true,
    pairedVariantId: 'apt_lr_floor_lamp_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'lamp', 'floor_lamp', 'living', 'lighting', 'unkempt', 'weathered'],
    description: 'Tarnished brass floor lamp leaning at an angle, sporting a crooked, heavily water-stained fabric shade with cigarette scorch marks.'
  },

  // Area Rug
  {
    subType: 'apt_lr_area_rug_pristine',
    name: 'Burnt Orange Wool Area Rug [Pristine]',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.05, 2.4],
    defaultColor: '#bd4f1b',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_lr_area_rug_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'rug', 'living', 'pristine'],
    description: 'Deep burnt orange woven wool area rug with thick fringed trim and crisp geometric borders.'
  },
  {
    subType: 'apt_lr_area_rug_unkempt',
    name: 'Faded Traffic-Worn Area Rug [Unkempt]',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.05, 2.4],
    defaultColor: '#6e3215',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_lr_area_rug_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'rug', 'living', 'unkempt', 'weathered'],
    description: 'Faded area rug worn down to bare backing threads and frayed warp cords along high-traffic walking lanes.'
  },

  // Extras / Cords
  {
    subType: 'apt_lr_coasters_tray_pristine',
    name: 'Cork Coasters & Tabletop Tray [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.1, 0.35],
    defaultColor: '#78350f',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_lr_extension_cords_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'coasters', 'living', 'pristine'],
    description: 'Clean walnut tabletop tray fitted with four ceramic and cork coasters and brass corners.'
  },
  {
    subType: 'apt_lr_extension_cords_unkempt',
    name: 'Tangled Nest of Extension Cords [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.8, 0.15, 0.8],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_lr_coasters_tray_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'cords', 'living', 'unkempt', 'weathered', 'game-item'],
    description: 'Tangled nest of dusty black vinyl extension cords and three-prong splitters snaking haphazardly along the baseboards.'
  },

  // --------------------------------------------------------------------------
  // 4. KITCHEN & DINING (Pristine vs. Unkempt Dual Variants)
  // --------------------------------------------------------------------------
  // Kettle
  {
    subType: 'apt_kit_kettle_pristine',
    name: 'Stainless Steel Whistling Kettle [Pristine]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.32, 0.35],
    defaultColor: '#e2e8f0',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_kettle_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'kettle', 'kitchen', 'pristine', 'game-item'],
    description: 'Mirror-polished stainless steel whistling kettle with black bakelite handle and hinged whistle cap.'
  },
  {
    subType: 'apt_kit_kettle_unkempt',
    name: 'Dented Kettle with Grease-Dust Layer [Unkempt]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.3, 0.35],
    defaultColor: '#71717a',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_kettle_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'kettle', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Dented metal kettle coated in a sticky layer of hardened grease-fossilized dust and burnt tea scale.'
  },

  // Toaster
  {
    subType: 'apt_kit_toaster_pristine',
    name: 'Chrome Two-Slice Toaster [Pristine]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.25, 0.22],
    defaultColor: '#cbd5e1',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_toaster_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'toaster', 'kitchen', 'pristine'],
    description: 'Art-deco ribbed chrome 2-slice pop-up toaster with brown dial knobs and crumb tray.'
  },
  {
    subType: 'apt_kit_toaster_unkempt',
    name: 'Scorched Two-Slice Toaster [Unkempt]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.25, 0.22],
    defaultColor: '#52525b',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_toaster_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'toaster', 'kitchen', 'unkempt', 'weathered'],
    description: 'Scorched two-slice toaster with blackened heating slots and a frayed, cloth-insulated electrical cord exposing wire.'
  },

  // Skillet / Sink
  {
    subType: 'apt_kit_skillet_pristine',
    name: 'Cast-Iron Skillet & Saucepan [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.45, 0.15, 0.35],
    defaultColor: '#27272a',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_skillet_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'skillet', 'kitchen', 'pristine', 'game-item'],
    description: 'Properly seasoned heavy black cast-iron skillet hanging beside a polished copper saucepan.'
  },
  {
    subType: 'apt_kit_skillet_unkempt',
    name: 'Scratched Pan in Murky Sink [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.65, 0.4, 0.55],
    defaultColor: '#3f3f46',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_skillet_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'skillet', 'sink', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Scratched Teflon frying pan soaking in a stained ceramic sink half-full of stagnant murky greasy water.'
  },

  // Dishes & Mugs
  {
    subType: 'apt_kit_dishes_pristine',
    name: 'Stacked Ceramic Dishes & Mugs [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.6, 0.35, 0.45],
    defaultColor: '#e4d8be',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_kit_dishes_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'dishes', 'kitchen', 'pristine'],
    description: 'Neatly organized stack of cream stoneware dinner plates, bowls, and clean coffee mugs.'
  },
  {
    subType: 'apt_kit_dishes_unkempt',
    name: 'Mismatched Fractured Plates & Stained Mugs [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.6, 0.35, 0.45],
    defaultColor: '#a89d88',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_kit_dishes_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'dishes', 'kitchen', 'unkempt', 'weathered'],
    description: 'Mismatched ceramic plates with hairline fractures and brown tea-ring-stained mugs with chipped rims.'
  },

  // Cutlery
  {
    subType: 'apt_kit_cutlery_pristine',
    name: 'Cutlery Block & Utensils [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.35, 0.25],
    defaultColor: '#5c3a21',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_kit_cutlery_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'cutlery', 'kitchen', 'pristine', 'game-item'],
    description: 'Dark wood knife block holding matching stainless steel carving knives, forks, and wooden spoons.'
  },
  {
    subType: 'apt_kit_cutlery_unkempt',
    name: 'Dull Knives & Bent Aluminum Forks [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.3, 0.1, 0.3],
    defaultColor: '#71717a',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_cutlery_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'cutlery', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Dull plastic-handled steak knives and bent aluminum cafeteria forks jumbled in a crumb-filled tray.'
  },

  // Dish Rack
  {
    subType: 'apt_kit_dish_rack_pristine',
    name: 'Chrome Wire Dish Rack [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.35, 0.5],
    defaultColor: '#cbd5e1',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_dish_rack_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'dish_rack', 'kitchen', 'pristine'],
    description: 'Clean chrome wire dish drying rack equipped with a white sloping drainage catch tray.'
  },
  {
    subType: 'apt_kit_dish_rack_unkempt',
    name: 'Rusted Wire Dish Rack & Lone Glass [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.35, 0.5],
    defaultColor: '#78350f',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_kit_dish_rack_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'dish_rack', 'kitchen', 'unkempt', 'weathered'],
    description: 'Rusted wire dish rack flaking its rubberized coating, holding a lone, bone-dry water glass.'
  },

  // Trash Can
  {
    subType: 'apt_kit_trash_can_pristine',
    name: 'Step-On Kitchen Trash Can [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.75, 0.45],
    defaultColor: '#94a3b8',
    defaultTexture: 'plaster_cream',
    collidable: true,
    pairedVariantId: 'apt_kit_trash_can_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'trash', 'kitchen', 'pristine'],
    description: 'White and chrome pedal-operated kitchen waste bin with clean fitted plastic bag liner.'
  },
  {
    subType: 'apt_kit_trash_can_unkempt',
    name: 'Overflowing Trash Bin with Swinging Lid [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.5, 0.85, 0.5],
    defaultColor: '#475569',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    pairedVariantId: 'apt_kit_trash_can_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'trash', 'kitchen', 'unkempt', 'weathered'],
    description: 'Overflowing plastic trash bin with a grease-stained swinging lid spilling cartons, coffee grounds, and tins.'
  },

  // Magnets & Menus
  {
    subType: 'apt_kit_magnets_pristine',
    name: 'Enamel Refrigerator Magnets [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.35, 0.35, 0.05],
    defaultColor: '#e11d48',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_magnets_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'magnets', 'kitchen', 'pristine', 'game-item'],
    description: 'Decorative enamel fruit and calendar magnets neatly pinning clean grocery notes.'
  },
  {
    subType: 'apt_kit_magnets_unkempt',
    name: 'Sun-Bleached Magnets & Peeling Menus [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.4, 0.4, 0.05],
    defaultColor: '#78350f',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_magnets_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'magnets', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Sun-bleached refrigerator magnets holding up yellowed, peeling takeout menus with grease smudges.'
  },

  // Paper Towel
  {
    subType: 'apt_kit_paper_towel_pristine',
    name: 'Wooden Paper Towel Holder [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.35, 0.18, 0.18],
    defaultColor: '#78350f',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_kit_paper_towel_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'paper_towel', 'kitchen', 'pristine'],
    description: 'Wall-mounted turned-oak paper towel rack with a neat, tightly-wound roll of white paper towels.'
  },
  {
    subType: 'apt_kit_paper_towel_unkempt',
    name: 'Unraveling Paper Towel Roll on Counter [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.4, 0.2, 0.3],
    defaultColor: '#d6d3d1',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_paper_towel_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'paper_towel', 'kitchen', 'unkempt', 'weathered'],
    description: 'Unraveling roll of generic paper towels sitting directly on a sticky, water-stained laminate counter.'
  },

  // Oven Mitts
  {
    subType: 'apt_kit_oven_mitts_pristine',
    name: 'Checkered Gingham Oven Mitts [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.35, 0.08],
    defaultColor: '#b91c1c',
    defaultTexture: 'wallpaper_damask',
    collidable: false,
    pairedVariantId: 'apt_kit_oven_mitts_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'oven_mitts', 'kitchen', 'pristine', 'game-item'],
    description: 'Clean red-and-white gingham quilted cotton oven mitts hanging neatly from a brass cup hook.'
  },
  {
    subType: 'apt_kit_oven_mitts_unkempt',
    name: 'Singed Greasy Oven Mitt near Burner [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.28, 0.35, 0.08],
    defaultColor: '#451a03',
    defaultTexture: 'wallpaper_damask',
    collidable: false,
    pairedVariantId: 'apt_kit_oven_mitts_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'oven_mitts', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Singed, grease-stained oven mitt resting precariously near the open flame grate of the gas stovetop.'
  },

  // Food Containers
  {
    subType: 'apt_kit_containers_pristine',
    name: 'Matching Food Storage Containers [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.3, 0.35],
    defaultColor: '#d97706',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_containers_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'containers', 'kitchen', 'pristine'],
    description: 'Set of matching 1970s amber Tupperware food containers with tight-sealing sunburst lids.'
  },
  {
    subType: 'apt_kit_containers_unkempt',
    name: 'Cloudy Tupperware with Warped Lids [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.5, 0.3, 0.4],
    defaultColor: '#92400e',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_containers_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'containers', 'kitchen', 'unkempt', 'weathered'],
    description: 'Cloudy plastic food containers with tomato-sauce-stained bottoms and mismatched warped lids.'
  },

  // Spice Rack
  {
    subType: 'apt_kit_spice_rack_pristine',
    name: 'Wooden Tiered Spice Rack [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.4, 0.15],
    defaultColor: '#5c3a21',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_kit_spice_rack_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'spice_rack', 'kitchen', 'pristine'],
    description: 'Three-tier turned-oak spice rack stocked with labeled glass jars of cinnamon, paprika, and bay leaves.'
  },
  {
    subType: 'apt_kit_spice_rack_unkempt',
    name: 'Grimy Spice Rack with Expired Powders [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.4, 0.15],
    defaultColor: '#362114',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_kit_spice_rack_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'spice_rack', 'kitchen', 'unkempt', 'weathered'],
    description: 'Grimy wooden spice carousel holding dust-caked glass jars of greyish, expired clumped seasonings.'
  },

  // Sponge & Soap
  {
    subType: 'apt_kit_sponge_soap_pristine',
    name: 'Dish Soap & Fresh Cellulose Sponge [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.25, 0.18],
    defaultColor: '#eab308',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_sponge_soap_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'soap', 'sponge', 'kitchen', 'pristine', 'game-item'],
    description: 'Bottle of amber dish liquid alongside a clean, springy yellow cellulose sponge.'
  },
  {
    subType: 'apt_kit_sponge_soap_unkempt',
    name: 'Crumbling Sponge in Crusty Soap Pool [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.25, 0.2, 0.2],
    defaultColor: '#854d0e',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_kit_sponge_soap_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'soap', 'sponge', 'kitchen', 'unkempt', 'weathered', 'game-item'],
    description: 'Dried-out, crumbling kitchen sponge sitting in a dried pool of crusty blue detergent on porcelain.'
  },

  // --------------------------------------------------------------------------
  // 5. BEDROOM (Pristine vs. Unkempt Dual Variants)
  // --------------------------------------------------------------------------
  // Bed
  {
    subType: 'apt_bed_platform_pristine',
    name: 'Walnut Platform Bed & Tucked Sheets [Pristine]',
    category: 'furniture',
    defaultDimensions: [2.1, 1.25, 2.3],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_platform_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'bed', 'bedroom', 'furniture', 'pristine'],
    description: 'Solid walnut platform bed with crisp, hospital-tucked cotton sheets and a padded headboard.'
  },
  {
    subType: 'apt_bed_platform_unkempt',
    name: 'Sagging Stained Mattress on Box Spring [Unkempt]',
    category: 'furniture',
    defaultDimensions: [2.1, 1.05, 2.3],
    defaultColor: '#78716c',
    defaultTexture: 'plaster_cream',
    collidable: true,
    pairedVariantId: 'apt_bed_platform_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'bed', 'bedroom', 'furniture', 'unkempt', 'weathered'],
    description: 'Sagging, brown-watermarked mattress resting directly on a creaking bare box spring with disheveled bedding.'
  },

  // Pillows
  {
    subType: 'apt_bed_pillows_pristine',
    name: 'Plump Pillows in Crisp Cotton Cases [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.6, 0.35, 0.55],
    defaultColor: '#e5ded0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_bed_pillows_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'pillows', 'bedroom', 'pristine'],
    description: 'Pair of fluffy, plump goose-down pillows wrapped in freshly starched white cotton pillowcases.'
  },
  {
    subType: 'apt_bed_pillows_unkempt',
    name: 'Flattened Yellowed Pillows [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.6, 0.22, 0.55],
    defaultColor: '#d6d3d1',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_bed_pillows_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'pillows', 'bedroom', 'unkempt', 'weathered'],
    description: 'Flattened, sweat-yellowed pillows missing their pillowcases, bunched haphazardly at the foot of the bed.'
  },

  // Comforter
  {
    subType: 'apt_bed_comforter_pristine',
    name: 'Quilted Autumn Harvest Comforter [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.9, 0.25, 2.1],
    defaultColor: '#9a3412',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bed_comforter_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'comforter', 'bedroom', 'pristine'],
    description: 'Quilted autumn floral comforter in harvest rust, mustard, and avocado tones neatly made over the bed.'
  },
  {
    subType: 'apt_bed_comforter_unkempt',
    name: 'Faded Wool Comforter with Torn Batting [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.9, 0.25, 2.1],
    defaultColor: '#57534e',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bed_comforter_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'comforter', 'bedroom', 'unkempt', 'weathered'],
    description: 'Heavy, faded scratchy wool comforter with ripped edge seams exposing clumpy grey synthetic batting.'
  },

  // Nightstand
  {
    subType: 'apt_bed_nightstand_pristine',
    name: 'Polished Walnut Bedside Nightstand [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.65, 0.55],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_nightstand_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'nightstand', 'bedroom', 'furniture', 'pristine'],
    description: 'Polished dark walnut veneer bedside nightstand with brass drawer pull and pristine lacquer surface.'
  },
  {
    subType: 'apt_bed_nightstand_unkempt',
    name: 'Scuffed Particle-Board Nightstand [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.65, 0.55],
    defaultColor: '#292524',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_nightstand_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'nightstand', 'bedroom', 'furniture', 'unkempt', 'weathered'],
    description: 'Scuffed particle-board nightstand with water-ring stains, chipped veneer corners, and sticky medicine residue.'
  },

  // Bedside Lamp
  {
    subType: 'apt_bed_lamp_pristine',
    name: 'Ceramic Bedside Lamp with Pleated Shade [Pristine]',
    category: 'lighting',
    defaultDimensions: [0.45, 0.7, 0.45],
    defaultColor: '#d97706',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_bed_lamp_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'lamp', 'bedroom', 'lighting', 'pristine'],
    description: 'Amber glazed ceramic urn table lamp with a crisp ivory accordion-pleated fabric drum shade.'
  },
  {
    subType: 'apt_bed_lamp_unkempt',
    name: 'Dim Bedside Lamp with Bare Bulb [Unkempt]',
    category: 'lighting',
    defaultDimensions: [0.4, 0.65, 0.4],
    defaultColor: '#78716c',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_bed_lamp_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'lamp', 'bedroom', 'lighting', 'unkempt', 'weathered'],
    description: 'Dim bedside lamp with a cracked brown plastic base, crooked socket, and a bare low-wattage yellow bulb.'
  },

  // Hangers
  {
    subType: 'apt_bed_hangers_pristine',
    name: 'Cedar Clothes Hangers [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.35, 0.15],
    defaultColor: '#9a3412',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_bed_hangers_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'hangers', 'closet', 'bedroom', 'pristine'],
    description: 'Aromatic contoured cedar wood suit hangers neatly spaced across a polished brass wardrobe rod.'
  },
  {
    subType: 'apt_bed_hangers_unkempt',
    name: 'Bent Wire Hangers in Empty Closet [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.35, 0.15],
    defaultColor: '#52525b',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bed_hangers_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'hangers', 'closet', 'bedroom', 'unkempt', 'weathered'],
    description: 'Bent, tangled dry-cleaner wire hangers rattling loosely in a bare, shadowed wardrobe closet.'
  },

  // Dresser
  {
    subType: 'apt_bed_dresser_pristine',
    name: 'Six-Drawer Mid-Century Walnut Dresser [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.6, 1.1, 0.65],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_dresser_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'dresser', 'bedroom', 'furniture', 'pristine'],
    description: 'Mid-century modern six-drawer walnut dresser with horizontal brass bar pulls and smooth wooden glides.'
  },
  {
    subType: 'apt_bed_dresser_unkempt',
    name: 'Dresser with Missing Bottom Drawer [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.6, 1.1, 0.65],
    defaultColor: '#292524',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_dresser_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'dresser', 'bedroom', 'furniture', 'unkempt', 'weathered'],
    description: 'Dresser with a missing bottom drawer revealing floor dust, mismatched plastic knobs, and stuck drawer runners.'
  },

  // Hamper
  {
    subType: 'apt_bed_hamper_pristine',
    name: 'Woven Wicker Laundry Hamper with Lid [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.55, 0.85, 0.55],
    defaultColor: '#b45309',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_hamper_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'hamper', 'laundry', 'bedroom', 'pristine'],
    description: 'Sturdy rattan wicker laundry hamper with fitted flat lid and clean canvas liner bag.'
  },
  {
    subType: 'apt_bed_hamper_unkempt',
    name: 'Overflowing Wicker Laundry Hamper [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.65, 0.9, 0.65],
    defaultColor: '#78350f',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_bed_hamper_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'hamper', 'laundry', 'bedroom', 'unkempt', 'weathered'],
    description: 'Overflowing wicker laundry hamper with split fibers spilling stained, wrinkled clothes across the floorboards.'
  },

  // Alarm Clock
  {
    subType: 'apt_bed_alarm_clock_pristine',
    name: 'Digital Woodgrain Flip Alarm Clock [Pristine]',
    category: 'appliance',
    defaultDimensions: [0.32, 0.16, 0.2],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_bed_alarm_clock_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'alarm_clock', 'bedroom', 'audio-linked', 'pristine'],
    soundPresetId: 'sfx_telephone_ring',
    description: '1970s faux-walnut digital mechanical flip alarm clock with glowing neon numeral cards and buzzer.'
  },
  {
    subType: 'apt_bed_alarm_clock_unkempt',
    name: 'Grimy Ticking Mechanical Alarm Clock [Unkempt]',
    category: 'appliance',
    defaultDimensions: [0.28, 0.28, 0.18],
    defaultColor: '#78716c',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bed_alarm_clock_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'alarm_clock', 'bedroom', 'audio-linked', 'unkempt', 'weathered'],
    soundPresetId: 'sfx_telephone_ring',
    description: 'Grimy, loud-ticking mechanical twin-bell alarm clock with a scratched plastic face and oxidized brass winding keys.'
  },

  // Mirror
  {
    subType: 'apt_bed_mirror_pristine',
    name: 'Beveled Walnut Dresser Mirror [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.08],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_bed_mirror_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'mirror', 'bedroom', 'pristine'],
    description: 'Clean beveled rectangular dressing mirror mounted in a solid walnut molding frame.'
  },
  {
    subType: 'apt_bed_mirror_unkempt',
    name: 'Smudged Distorted Dresser Mirror [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.08],
    defaultColor: '#292524',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_bed_mirror_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'mirror', 'bedroom', 'unkempt', 'weathered'],
    description: 'Smudged dresser mirror with greasy handprints and desilvered black oxidation spots giving a dim, distorted reflection.'
  },

  // --------------------------------------------------------------------------
  // 6. BATHROOM (Pristine vs. Unkempt Dual Variants)
  // --------------------------------------------------------------------------
  // Towels
  {
    subType: 'apt_bath_towels_pristine',
    name: 'Plush Bath & Hand Towels on Bar [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.75, 0.85, 0.2],
    defaultColor: '#c59223',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bath_towels_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'towels', 'bathroom', 'pristine'],
    description: 'Plush, folded harvest gold and ecru terrycloth bath and hand towels hanging from a gleaming chrome bar.'
  },
  {
    subType: 'apt_bath_towels_unkempt',
    name: 'Threadbare Radiator-Dried Towels [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.75, 0.85, 0.2],
    defaultColor: '#78716c',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bath_towels_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'towels', 'bathroom', 'unkempt', 'weathered'],
    description: 'Threadbare bath towels stiff and scratchy from being repeatedly air-dried over a rusted cast-iron radiator.'
  },

  // Shower Curtain
  {
    subType: 'apt_bath_shower_curtain_pristine',
    name: 'Geometric Vinyl Shower Curtain [Pristine]',
    category: 'furniture',
    defaultDimensions: [1.8, 2.1, 0.1],
    defaultColor: '#b45309',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_bath_shower_curtain_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'shower_curtain', 'bathroom', 'pristine'],
    description: 'Clean vinyl shower curtain printed with crisp 1970s brown-and-gold mod geometric concentric circles.'
  },
  {
    subType: 'apt_bath_shower_curtain_unkempt',
    name: 'Mildew-Speckled Vinyl Shower Curtain [Unkempt]',
    category: 'furniture',
    defaultDimensions: [1.8, 2.1, 0.1],
    defaultColor: '#4d4637',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_bath_shower_curtain_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'shower_curtain', 'bathroom', 'unkempt', 'weathered'],
    description: 'Mildew-speckled yellowed vinyl shower curtain hanging from rusted metal rings with grey soap scum at the hem.'
  },

  // Bath Mat
  {
    subType: 'apt_bath_mat_pristine',
    name: 'Tufted Contour Bath Mat [Pristine]',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.05, 0.65],
    defaultColor: '#c59223',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bath_mat_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'bath_mat', 'bathroom', 'pristine'],
    description: 'Soft, absorbent harvest gold tufted cotton contour bath mat with non-slip rubber backing.'
  },
  {
    subType: 'apt_bath_mat_unkempt',
    name: 'Damp Matted Moist Bath Mat [Unkempt]',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.05, 0.65],
    defaultColor: '#57534e',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    pairedVariantId: 'apt_bath_mat_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'bath_mat', 'bathroom', 'unkempt', 'weathered'],
    description: 'Damp, matted bath mat that stays perpetually moist and smelling of stagnancy against cold tile.'
  },

  // Toothbrush & Mug
  {
    subType: 'apt_bath_toothbrush_pristine',
    name: 'Ceramic Toothbrush Tumbler [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.25, 0.22],
    defaultColor: '#e2e8f0',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_bath_toothbrush_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'toothbrush', 'bathroom', 'pristine', 'game-item'],
    description: 'Clean ceramic bathroom tumbler holding an upright toothbrush and fresh tube of toothpaste.'
  },
  {
    subType: 'apt_bath_toothbrush_unkempt',
    name: 'Splayed Toothbrush in Water-Stained Mug [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.25, 0.22],
    defaultColor: '#a1a1aa',
    defaultTexture: 'checker_marble',
    collidable: false,
    pairedVariantId: 'apt_bath_toothbrush_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'toothbrush', 'bathroom', 'unkempt', 'weathered', 'game-item'],
    description: 'Splayed, discolored toothbrush sitting in a water-stained chipped ceramic mug with crusted toothpaste drips.'
  },

  // Soap
  {
    subType: 'apt_bath_soap_dish_pristine',
    name: 'Glass Soap Dish & Fresh Bar [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.15, 0.18],
    defaultColor: '#cbd5e1',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bath_soap_dish_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'soap', 'bathroom', 'pristine', 'game-item'],
    description: 'Embossed pressed glass soap dish holding an unused, wrapped oval bar of scented tallow soap.'
  },
  {
    subType: 'apt_bath_soap_dish_unkempt',
    name: 'Melting Yellow Soap Bar in Cracked Dish [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.15, 0.18],
    defaultColor: '#ca8a04',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_bath_soap_dish_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'soap', 'bathroom', 'unkempt', 'weathered', 'game-item'],
    description: 'Grimy bar of yellow lye soap melting into a cracked porcelain dish with crusted hair and scum.'
  },

  // Toilet Paper
  {
    subType: 'apt_bath_toilet_paper_pristine',
    name: 'Chrome Wall Toilet Paper Roll [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.25, 0.2, 0.18],
    defaultColor: '#ffffff',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bath_toilet_paper_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'toilet_paper', 'bathroom', 'pristine'],
    description: 'Full white two-ply toilet paper roll hung neatly from a spring-loaded chrome wall spindle.'
  },
  {
    subType: 'apt_bath_toilet_paper_unkempt',
    name: 'Water-Logged Toilet Paper Roll on Tank [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.25, 0.2, 0.18],
    defaultColor: '#d6d3d1',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_bath_toilet_paper_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'toilet_paper', 'bathroom', 'unkempt', 'weathered'],
    description: 'Water-logged toilet paper roll sitting loosely on top of the condensation-dripping porcelain tank lid.'
  },

  // Hairdryer
  {
    subType: 'apt_bath_hairdryer_pristine',
    name: 'Compact Blow Dryer with Loop [Pristine]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.28, 0.15],
    defaultColor: '#b45309',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bath_hairdryer_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'hairdryer', 'bathroom', 'pristine'],
    description: 'Vintage burnt-orange molded handheld blow dryer with shiny chrome air concentrator nozzle.'
  },
  {
    subType: 'apt_bath_hairdryer_unkempt',
    name: 'Old Heavy Hairdryer with Lint Screen [Unkempt]',
    category: 'appliance',
    defaultDimensions: [0.35, 0.28, 0.15],
    defaultColor: '#78716c',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_bath_hairdryer_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'hairdryer', 'bathroom', 'unkempt', 'weathered'],
    description: 'Old, heavy yellowed hairdryer with a thick layer of grey dust clogging the rear intake lint screen.'
  },

  // Wastebasket
  {
    subType: 'apt_bath_wastebasket_pristine',
    name: 'Chrome Small Step Wastebasket [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.35, 0.45, 0.35],
    defaultColor: '#cbd5e1',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bath_wastebasket_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'wastebasket', 'bathroom', 'pristine'],
    description: 'Small shiny chrome step-on bathroom wastebasket with foot pedal and sealed lid.'
  },
  {
    subType: 'apt_bath_wastebasket_unkempt',
    name: 'Rusted Wastebasket Overflowing Tissues [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.35, 0.45, 0.35],
    defaultColor: '#78350f',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_bath_wastebasket_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'wastebasket', 'bathroom', 'unkempt', 'weathered'],
    description: 'Small rusted metal wastebasket filled to the brim and spilling crumpled, stained tissues onto the tiles.'
  },

  // First Aid
  {
    subType: 'apt_bath_first_aid_pristine',
    name: 'Wall Metal First-Aid Cabinet [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.45, 0.6, 0.18],
    defaultColor: '#ffffff',
    defaultTexture: 'plaster_cream',
    collidable: true,
    pairedVariantId: 'apt_bath_first_aid_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'first_aid', 'bathroom', 'pristine', 'game-item'],
    description: 'Clean white enamel medical cabinet with red cross emblem, stocked with sterile bandages and antiseptic.'
  },
  {
    subType: 'apt_bath_first_aid_unkempt',
    name: 'Rusted First-Aid Kit with Expired Pills [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.45, 0.6, 0.18],
    defaultColor: '#78350f',
    defaultTexture: 'aged_brass',
    collidable: true,
    pairedVariantId: 'apt_bath_first_aid_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'first_aid', 'bathroom', 'unkempt', 'weathered', 'game-item'],
    description: 'Rusted tin first-aid kit containing yellowed adhesive bandages, dry cotton swabs, and expired amber prescription bottles.'
  },

  // --------------------------------------------------------------------------
  // 7. ENTRYWAY & UTILITY (Pristine vs. Unkempt Dual Variants)
  // --------------------------------------------------------------------------
  // Key Rack
  {
    subType: 'apt_ent_key_rack_pristine',
    name: 'Brass Key Rack with Entry Catchall [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.25, 0.15],
    defaultColor: '#7a6639',
    defaultTexture: 'aged_brass',
    collidable: false,
    pairedVariantId: 'apt_ent_key_rack_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'keys', 'entryway', 'pristine'],
    description: 'Polished brass wall key board with four hooks and a walnut tray for coins and apartment keys.'
  },
  {
    subType: 'apt_ent_key_rack_unkempt',
    name: 'Bent Metal Key Hook in Torn Wallpaper [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.45, 0.25, 0.15],
    defaultColor: '#52525b',
    defaultTexture: 'plaster_cream',
    collidable: false,
    pairedVariantId: 'apt_ent_key_rack_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'keys', 'entryway', 'unkempt', 'weathered'],
    description: 'Bent metal key hook pulled away from peeling damp wallpaper, exposing crumbling gypsum plaster underneath.'
  },

  // Doormat
  {
    subType: 'apt_ent_doormat_pristine',
    name: 'Natural Coir Welcome Doormat [Pristine]',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.04, 0.65],
    defaultColor: '#92400e',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_ent_doormat_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'doormat', 'entryway', 'pristine'],
    description: 'Thick natural coconut coir welcome doormat with heavy black vulcanized rubber border.'
  },
  {
    subType: 'apt_ent_doormat_unkempt',
    name: 'Frayed Mud-Caked Doormat [Unkempt]',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.04, 0.65],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: false,
    pairedVariantId: 'apt_ent_doormat_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'doormat', 'entryway', 'unkempt', 'weathered'],
    description: 'Frayed, mud-caked doormat shedding stiff bristles across the doorway with bald worn center patches.'
  },

  // Umbrella
  {
    subType: 'apt_ent_umbrella_pristine',
    name: 'Wood-Handled Umbrella in Brass Stand [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.35, 0.95, 0.35],
    defaultColor: '#451a03',
    defaultTexture: 'aged_brass',
    collidable: true,
    pairedVariantId: 'apt_ent_umbrella_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'umbrella', 'entryway', 'pristine'],
    description: 'Tightly rolled black nylon umbrella with curved chestnut handle resting in a polished brass cylinder stand.'
  },
  {
    subType: 'apt_ent_umbrella_unkempt',
    name: 'Broken Umbrella with Snapped Rib [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.35, 0.9, 0.35],
    defaultColor: '#27272a',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_ent_umbrella_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'umbrella', 'entryway', 'unkempt', 'weathered'],
    description: 'Broken umbrella with a snapped metal rib jutting through torn black fabric, propped in a dark corner.'
  },

  // Vacuum
  {
    subType: 'apt_ent_vacuum_pristine',
    name: '1970s Canister Vacuum & Horsehair Broom [Pristine]',
    category: 'appliance',
    defaultDimensions: [0.85, 0.95, 0.45],
    defaultColor: '#4d7c0f',
    defaultTexture: 'aged_brass',
    collidable: true,
    pairedVariantId: 'apt_ent_vacuum_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'vacuum', 'cleaning', 'entryway', 'pristine'],
    description: 'Avocado green canister vacuum cleaner with chrome wand beside an upright turned-wood horsehair broom.'
  },
  {
    subType: 'apt_ent_vacuum_unkempt',
    name: 'Old Upright Vacuum with Duct-Taped Hose [Unkempt]',
    category: 'appliance',
    defaultDimensions: [0.65, 1.25, 0.45],
    defaultColor: '#78350f',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    pairedVariantId: 'apt_ent_vacuum_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'vacuum', 'cleaning', 'entryway', 'unkempt', 'weathered'],
    description: 'Old upright vacuum cleaner with split vinyl hose wrapped in silver duct tape and a bulging dusty cloth bag.'
  },

  // Cleaning Supplies
  {
    subType: 'apt_ent_cleaning_supplies_pristine',
    name: 'Galvanized Utility Bucket & Cotton Mop [Pristine]',
    category: 'clue_prop',
    defaultDimensions: [0.55, 1.2, 0.45],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    pairedVariantId: 'apt_ent_cleaning_supplies_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'mop', 'cleaning', 'entryway', 'pristine', 'game-item'],
    description: 'Shiny galvanized steel mop wringer bucket paired with a clean white cotton string mop.'
  },
  {
    subType: 'apt_ent_cleaning_supplies_unkempt',
    name: 'Sticky Floor Cleaner & Dried-Out Grey Mop [Unkempt]',
    category: 'clue_prop',
    defaultDimensions: [0.55, 1.15, 0.45],
    defaultColor: '#57534e',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    pairedVariantId: 'apt_ent_cleaning_supplies_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'mop', 'cleaning', 'entryway', 'unkempt', 'weathered', 'game-item'],
    description: 'Sticky crusty plastic bottle of generic pine floor cleaner sitting beside a stiff, dried-out grey string mop.'
  },

  // Shoe Tray
  {
    subType: 'apt_ent_shoe_tray_pristine',
    name: 'Rubberized Entryway Boot Tray [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.85, 0.12, 0.45],
    defaultColor: '#1e293b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_ent_shoe_tray_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'shoes', 'entryway', 'pristine'],
    description: 'Clean molded black rubber shoe and winter boot tray with raised water containment rim.'
  },
  {
    subType: 'apt_ent_shoe_tray_unkempt',
    name: 'Scuffed Shoe Tray & Single Salted Boot [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.85, 0.12, 0.45],
    defaultColor: '#334155',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    pairedVariantId: 'apt_ent_shoe_tray_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'shoes', 'entryway', 'unkempt', 'weathered'],
    description: 'Scuffed cracked plastic shoe tray holding a single, salt-stained work boot caked with winter road grit.'
  },

  // Coat Rack
  {
    subType: 'apt_ent_coat_rack_pristine',
    name: 'Bentwood Hall Tree Coat Rack [Pristine]',
    category: 'furniture',
    defaultDimensions: [0.65, 1.95, 0.65],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_ent_coat_rack_unkempt',
    conditionVariant: 'pristine',
    tags: ['apartment', '1970s', 'coat_rack', 'entryway', 'furniture', 'pristine'],
    description: 'Classic dark walnut bentwood hall tree with curved coat hooks and umbrella ring base.'
  },
  {
    subType: 'apt_ent_coat_rack_unkempt',
    name: 'Loose Coat Hooks with Damp Trench Coat [Unkempt]',
    category: 'furniture',
    defaultDimensions: [0.65, 1.85, 0.65],
    defaultColor: '#292524',
    defaultTexture: 'oak_parquet',
    collidable: true,
    pairedVariantId: 'apt_ent_coat_rack_pristine',
    conditionVariant: 'unkempt',
    tags: ['apartment', '1970s', 'coat_rack', 'entryway', 'furniture', 'unkempt', 'weathered'],
    description: 'Wobbly loose coat hooks holding a heavy, damp-smelling rain-soaked trench coat that drags on the floor.'
  },

  // --------------------------------------------------------------------------
  // ELEVATOR CAB & 7X7 HOISTWAY ASSETS (1978 Vintage Brass & Walnut)
  // --------------------------------------------------------------------------
  {
    subType: 'apt_elevator_cab_sliding_doors',
    name: '1978 Elevator Cab Telescoping Sliding Doors',
    category: 'door',
    defaultDimensions: [2.2, 2.5, 0.12],
    defaultColor: '#5c4826',
    defaultTexture: 'aged_brass',
    collidable: true,
    isSecretPassage: false,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_cab_sliding_doors_90s',
    animationSpec: '500ms smooth lateral pocket slide with motorized track hum',
    soundPresetId: 'sfx_door_latch',
    tags: ['elevator', 'cab', 'sliding_doors', 'door', 'brass', 'pocket_slide', 'hinged', 'interactive', '1970s'],
    description: 'Heavy telescoping dual-leaf aged brass elevator cab doors with safety rubber bumper edge and overhead guide track rollers.',
    compositeParts: [
      { id: 'track', shape: 'box', offset: [0, 1.25, 0], size: [2.2, 0.12, 0.12], color: '#4a3818', roughness: 0.5, metalness: 0.7 },
      { id: 'door_left', shape: 'box', offset: [-0.52, 0, 0.02], size: [1.08, 2.38, 0.04], color: '#5c4826', roughness: 0.45, metalness: 0.8 },
      { id: 'door_right', shape: 'box', offset: [0.52, 0, -0.02], size: [1.08, 2.38, 0.04], color: '#5c4826', roughness: 0.45, metalness: 0.8 },
      { id: 'bumper', shape: 'box', offset: [0, 0, 0.03], size: [0.04, 2.38, 0.05], color: '#18181b', roughness: 0.9, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_elevator_cab_wall_solid',
    name: '1978 Elevator Cab Solid Wall & Handrail (7m)',
    category: 'wall',
    defaultDimensions: [7.0, 2.8, 0.35],
    defaultColor: '#3a2818',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_cab_wall_solid_90s',
    tags: ['elevator', 'cab', 'wall', 'box_wall', 'handrail', '1970s', 'architecture'],
    description: 'Enclosed 7-meter elevator cab wall panel featuring dark walnut veneer wainscoting, solid brass protective handrail, and ribbed kickplate.',
    compositeParts: [
      { id: 'wall_slab', shape: 'box', offset: [0, 0, 0], size: [7.0, 2.8, 0.15], color: '#3a2818', roughness: 0.75, metalness: 0.1 },
      { id: 'handrail', shape: 'cylinder', offset: [0, -0.4, 0.12], size: [0.04, 6.8, 0.04], rotation: [0, 0, Math.PI / 2], color: '#6b542c', roughness: 0.35, metalness: 0.85 },
      { id: 'bracket_left', shape: 'box', offset: [-2.4, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#4a3818', roughness: 0.4, metalness: 0.8 },
      { id: 'bracket_center', shape: 'box', offset: [0, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#4a3818', roughness: 0.4, metalness: 0.8 },
      { id: 'bracket_right', shape: 'box', offset: [2.4, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#4a3818', roughness: 0.4, metalness: 0.8 },
      { id: 'kickplate', shape: 'box', offset: [0, -1.25, 0.02], size: [7.0, 0.28, 0.04], color: '#524320', roughness: 0.5, metalness: 0.7 }
    ]
  },
  {
    subType: 'apt_elevator_cab_portal_wall',
    name: '1978 Elevator Cab Sliding Door Portal Wall (7m)',
    category: 'wall',
    defaultDimensions: [7.0, 2.8, 0.35],
    defaultColor: '#3a2818',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_cab_portal_wall_90s',
    tags: ['elevator', 'cab', 'wall', 'portal_wall', 'door_frame', '1970s', 'architecture'],
    description: 'Front 7-meter elevator cab wall featuring a 2.2m central portal opening for sliding doors, brass threshold sill, and overhead indicator transom.',
    compositeParts: [
      { id: 'jamb_left', shape: 'box', offset: [-2.35, 0, 0], size: [2.3, 2.8, 0.15], color: '#3a2818', roughness: 0.75, metalness: 0.1 },
      { id: 'jamb_right', shape: 'box', offset: [2.35, 0, 0], size: [2.3, 2.8, 0.15], color: '#3a2818', roughness: 0.75, metalness: 0.1 },
      { id: 'transom_header', shape: 'box', offset: [0, 1.25, 0], size: [7.0, 0.3, 0.18], color: '#3a2818', roughness: 0.7, metalness: 0.1 },
      { id: 'threshold_sill', shape: 'box', offset: [0, -1.36, 0.05], size: [2.4, 0.06, 0.22], color: '#6b542c', roughness: 0.4, metalness: 0.85 },
      { id: 'lantern_indicator', shape: 'box', offset: [0, 1.25, 0.1], size: [0.55, 0.18, 0.06], color: '#786438', roughness: 0.3, metalness: 0.7, emissive: '#855826' }
    ]
  },
  {
    subType: 'apt_elevator_ceiling_access_panel',
    name: '1978 Elevator Ceiling with Emergency Access Hatch (7x7)',
    category: 'floor_tile',
    defaultDimensions: [7.0, 0.25, 7.0],
    defaultColor: '#2c2824',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_ceiling_access_panel_90s',
    tags: ['elevator', 'cab', 'ceiling', 'access_panel', 'emergency_hatch', '1970s'],
    description: 'Heavy steel 7x7 tile elevator cab ceiling featuring a recessed 0.9m emergency escape hatch with padlock hasps, dual release handles, and recessed lighting fixtures.',
    compositeParts: [
      { id: 'ceiling_slab', shape: 'box', offset: [0, 0, 0], size: [7.0, 0.12, 7.0], color: '#2c2824', roughness: 0.85, metalness: 0.2 },
      { id: 'hatch_frame', shape: 'box', offset: [0, 0.01, 0], size: [1.15, 0.08, 1.15], color: '#475569', roughness: 0.5, metalness: 0.7 },
      { id: 'hatch_door', shape: 'box', offset: [0, 0.02, 0], size: [0.94, 0.06, 0.94], color: '#3a342c', roughness: 0.6, metalness: 0.6 },
      { id: 'hatch_handle_1', shape: 'cylinder', offset: [-0.25, -0.04, 0], size: [0.02, 0.18, 0.02], rotation: [0, 0, Math.PI / 2], color: '#6b542c', roughness: 0.35, metalness: 0.85 },
      { id: 'hatch_handle_2', shape: 'cylinder', offset: [0.25, -0.04, 0], size: [0.02, 0.18, 0.02], rotation: [0, 0, Math.PI / 2], color: '#6b542c', roughness: 0.35, metalness: 0.85 },
      { id: 'light_troffer_nw', shape: 'box', offset: [-2.2, -0.03, -2.2], size: [0.85, 0.04, 0.85], color: '#d8cbb5', roughness: 0.2, metalness: 0.2, emissive: '#786438' },
      { id: 'light_troffer_ne', shape: 'box', offset: [2.2, -0.03, -2.2], size: [0.85, 0.04, 0.85], color: '#d8cbb5', roughness: 0.2, metalness: 0.2, emissive: '#786438' },
      { id: 'light_troffer_sw', shape: 'box', offset: [-2.2, -0.03, 2.2], size: [0.85, 0.04, 0.85], color: '#d8cbb5', roughness: 0.2, metalness: 0.2, emissive: '#786438' },
      { id: 'light_troffer_se', shape: 'box', offset: [2.2, -0.03, 2.2], size: [0.85, 0.04, 0.85], color: '#d8cbb5', roughness: 0.2, metalness: 0.2, emissive: '#786438' }
    ]
  },
  {
    subType: 'apt_elevator_emergency_phone',
    name: '1978 Elevator In-Cab Emergency Call Phone',
    category: 'appliance',
    defaultDimensions: [0.45, 0.65, 0.22],
    defaultColor: '#7a1a1f',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_emergency_phone_90s',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['elevator', 'emergency_phone', 'phone', 'safety', 'audio-linked', '1970s'],
    description: "Flush-mounted steel elevator emergency phone cabinet with hinged lockable door, 'EMERGENCY TELEPHONE - LIFT HANDSET' stencil, and armored cord handset.",
    compositeParts: [
      { id: 'cabinet_box', shape: 'box', offset: [0, 0, 0], size: [0.45, 0.65, 0.18], color: '#7a1a1f', roughness: 0.55, metalness: 0.4 },
      { id: 'door_faceplate', shape: 'box', offset: [0, 0, 0.09], size: [0.42, 0.62, 0.03], color: '#8b262a', roughness: 0.45, metalness: 0.5 },
      { id: 'latch_handle', shape: 'cylinder', offset: [0.16, 0, 0.11], size: [0.02, 0.08, 0.02], color: '#6b542c', roughness: 0.35, metalness: 0.85 },
      { id: 'handset_body', shape: 'box', offset: [-0.05, 0, 0.03], size: [0.12, 0.32, 0.08], color: '#1c1917', roughness: 0.7, metalness: 0.2 },
      { id: 'placard_plate', shape: 'box', offset: [0, 0.22, 0.105], size: [0.32, 0.09, 0.01], color: '#e2e8f0', roughness: 0.3, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_elevator_button_panel_cop',
    name: '1978 Elevator Car Operating Button Panel (COP)',
    category: 'appliance',
    defaultDimensions: [0.42, 1.6, 0.12],
    defaultColor: '#5c4826',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_button_panel_cop_90s',
    soundPresetId: 'sfx_bell_ring',
    tags: ['elevator', 'button_panel', 'cop', 'controls', 'interactive', 'audio-linked', '1970s'],
    description: 'Vertical brushed architectural bronze Car Operating Panel (COP) with jeweled floor push buttons (B, L, 1, 2, 3, 4, 5, Door Open, Door Close), emergency alarm bell, and top floor indicator dial.',
    compositeParts: [
      { id: 'bronze_plate', shape: 'box', offset: [0, 0, 0], size: [0.42, 1.6, 0.05], color: '#5c4826', roughness: 0.4, metalness: 0.85 },
      { id: 'floor_dial', shape: 'box', offset: [0, 0.62, 0.03], size: [0.32, 0.22, 0.04], color: '#292524', roughness: 0.3, metalness: 0.4 },
      { id: 'button_col_left', shape: 'cylinder', offset: [-0.08, 0.12, 0.035], size: [0.03, 0.02, 0.03], color: '#d97706', roughness: 0.2, metalness: 0.6 },
      { id: 'button_col_right', shape: 'cylinder', offset: [0.08, 0.12, 0.035], size: [0.03, 0.02, 0.03], color: '#d97706', roughness: 0.2, metalness: 0.6 },
      { id: 'alarm_bell_btn', shape: 'cylinder', offset: [0, -0.42, 0.04], size: [0.04, 0.03, 0.04], color: '#dc2626', roughness: 0.3, metalness: 0.5 },
      { id: 'keyed_switch', shape: 'cylinder', offset: [0, -0.58, 0.035], size: [0.02, 0.02, 0.02], color: '#6b542c', roughness: 0.3, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_elevator_floor_tile_7x7',
    name: '1978 Elevator Cab Checker Marble Floor Tile (7x7)',
    category: 'floor_tile',
    defaultDimensions: [7.0, 0.15, 7.0],
    defaultColor: '#695e4d',
    defaultTexture: 'checker_marble',
    collidable: true,
    era: '1970s',
    canUpdateInHotel: true,
    paired1990sId: 'apt_elevator_floor_tile_7x7_90s',
    tags: ['elevator', 'cab', 'floor', 'checker_marble', '1970s', 'architecture'],
    description: '7x7 tile wide elevator cab floor slab laid in vintage checkerboard marble with heavy brass threshold perimeter binding.',
    compositeParts: [
      { id: 'base_slab', shape: 'box', offset: [0, 0, 0], size: [7.0, 0.12, 7.0], color: '#334155', roughness: 0.9, metalness: 0.1 },
      { id: 'marble_surface', shape: 'box', offset: [0, 0.065, 0], size: [6.9, 0.03, 6.9], color: '#695e4d', roughness: 0.3, metalness: 0.2 },
      { id: 'brass_edging', shape: 'box', offset: [0, 0.07, 3.48], size: [7.0, 0.04, 0.06], color: '#6b542c', roughness: 0.35, metalness: 0.85 }
    ]
  }
];

export const APARTMENT_BUILDING_CATALOG_BLUEPRINTS: ApartmentAssetBlueprint[] = [
  ...APARTMENT_1978_ORIGINAL_CATALOG_BLUEPRINTS,
  ...APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS
];

/**
 * ============================================================================
 * PRE-COMPOSED APARTMENT ROOM ASSET SETS (.assetset.json)
 * Instant one-click multi-asset stamp sets matching the text file suites.
 * ============================================================================
 */
export const APARTMENT_1978_ROOM_ASSET_SETS: AssetSet[] = [
  {
    id: 'set_elevator_cab_7x7',
    name: '7x7 Tile Elevator Cab & Hoistway Set',
    description: 'Complete 7x7 tile enclosed elevator cab with solid walls, sliding door portal wall, telescoping sliding doors, ceiling with emergency access hatch, emergency call phone, and Car Operating Panel.',
    createdAt: '2026-11-01T14:00:00.000Z',
    tags: ['elevator', 'cab', '7x7', 'sliding_doors', 'emergency_phone', 'button_panel', 'access_panel', '1970s', 'set'],
    boundingSize: [7.0, 7.0],
    items: [
      {
        name: '1978 Elevator Cab Checker Marble Floor Tile (7x7)',
        category: 'floor_tile',
        subType: 'apt_elevator_floor_tile_7x7',
        relPosition: [0, 0.075, 0],
        dimensions: [7.0, 0.15, 7.0],
        rotationY: 0,
        color: '#695e4d',
        textureId: 'checker_marble',
        collidable: true,
        tags: ['elevator', 'floor', '7x7']
      },
      {
        name: '1978 Elevator Cab Solid Wall & Handrail (Back)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid',
        relPosition: [0, 1.4, -3.35],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: 0,
        color: '#3a2818',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall']
      },
      {
        name: '1978 Elevator Cab Solid Wall & Handrail (Left)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid',
        relPosition: [-3.35, 1.4, 0],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: Math.PI / 2,
        color: '#3a2818',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall']
      },
      {
        name: '1978 Elevator Cab Solid Wall & Handrail (Right)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid',
        relPosition: [3.35, 1.4, 0],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: -Math.PI / 2,
        color: '#3a2818',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall']
      },
      {
        name: '1978 Elevator Cab Sliding Door Portal Wall (Front)',
        category: 'wall',
        subType: 'apt_elevator_cab_portal_wall',
        relPosition: [0, 1.4, 3.35],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: 0,
        color: '#3a2818',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['elevator', 'wall', 'portal_wall']
      },
      {
        name: '1978 Elevator Cab Telescoping Sliding Doors',
        category: 'door',
        subType: 'apt_elevator_cab_sliding_doors',
        relPosition: [0, 1.25, 3.35],
        dimensions: [2.2, 2.5, 0.12],
        rotationY: 0,
        color: '#5c4826',
        textureId: 'aged_brass',
        collidable: true,
        isSecretPassage: false,
        soundPresetId: 'sfx_door_latch',
        tags: ['elevator', 'sliding_doors', 'door', 'pocket_slide']
      },
      {
        name: '1978 Elevator Ceiling with Emergency Access Hatch (7x7)',
        category: 'floor_tile',
        subType: 'apt_elevator_ceiling_access_panel',
        relPosition: [0, 2.7, 0],
        dimensions: [7.0, 0.25, 7.0],
        rotationY: 0,
        color: '#2c2824',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'ceiling', 'access_panel', 'emergency_hatch']
      },
      {
        name: '1978 Elevator Car Operating Button Panel (COP)',
        category: 'appliance',
        subType: 'apt_elevator_button_panel_cop',
        relPosition: [1.6, 1.35, 3.15],
        dimensions: [0.42, 1.6, 0.12],
        rotationY: Math.PI,
        color: '#5c4826',
        textureId: 'aged_brass',
        collidable: true,
        soundPresetId: 'sfx_bell_ring',
        tags: ['elevator', 'button_panel', 'cop', 'controls']
      },
      {
        name: '1978 Elevator In-Cab Emergency Call Phone',
        category: 'appliance',
        subType: 'apt_elevator_emergency_phone',
        relPosition: [3.15, 1.35, 0],
        dimensions: [0.45, 0.65, 0.22],
        rotationY: -Math.PI / 2,
        color: '#7a1a1f',
        textureId: 'aged_brass',
        collidable: true,
        soundPresetId: 'sfx_telephone_ring',
        tags: ['elevator', 'emergency_phone', 'phone', 'safety']
      }
    ]
  },
  {
    id: 'set_apt_hallway_utility_1978',
    name: '1978 Apartment Hallway & Utility Cluster',
    description: 'Infrastructure hallway set including tenant mailboxes, intercom panel, baseboard steam radiator, globe fixture, and fire extinguisher.',
    createdAt: '2026-11-01T10:00:00.000Z',
    tags: ['apartment', 'hallway', 'infrastructure', '1970s', 'utility'],
    boundingSize: [3.8, 1.8],
    items: [
      {
        name: 'Bank of Tenant Mailboxes',
        category: 'furniture',
        subType: 'apt_gang_mailboxes',
        relPosition: [-0.9, 0.7, -0.4],
        dimensions: [1.8, 1.4, 0.35],
        rotationY: 0,
        color: '#786438',
        textureId: 'aged_brass',
        collidable: true,
        tags: ['apartment', 'mailboxes', 'infrastructure']
      },
      {
        name: 'Front Door Intercom System',
        category: 'appliance',
        subType: 'apt_front_door_intercom',
        relPosition: [0.75, 0.6, -0.4],
        dimensions: [0.65, 1.25, 0.2],
        rotationY: 0,
        color: '#5e4c2e',
        textureId: 'aged_brass',
        collidable: true,
        soundPresetId: 'sfx_telephone_ring',
        tags: ['apartment', 'intercom', 'audio-linked']
      },
      {
        name: 'Wall-Mounted Fire Extinguisher',
        category: 'clue_prop',
        subType: 'apt_wall_fire_extinguisher',
        relPosition: [1.4, 0.7, -0.3],
        dimensions: [0.35, 0.75, 0.3],
        rotationY: 0,
        color: '#991b1b',
        textureId: 'industrial_concrete',
        collidable: false,
        tags: ['apartment', 'safety', 'fire_extinguisher']
      },
      {
        name: 'Central Steam Radiator',
        category: 'appliance',
        subType: 'apt_baseboard_steam_radiator',
        relPosition: [-0.8, 0.42, 0.4],
        dimensions: [1.6, 0.85, 0.35],
        rotationY: 0,
        color: '#7a6438',
        textureId: 'aged_brass',
        collidable: true,
        soundPresetId: 'sfx_steam_pipe',
        tags: ['apartment', 'radiator', 'steam']
      },
      {
        name: 'Hallway Frosted Globe Fixture',
        category: 'lighting',
        subType: 'apt_hallway_globe_fixture',
        relPosition: [0, 2.4, 0],
        dimensions: [0.45, 0.45, 0.45],
        rotationY: 0,
        color: '#e5ded0',
        textureId: 'aged_brass',
        collidable: false,
        tags: ['apartment', 'lighting']
      }
    ]
  },
  {
    id: 'set_apt_pristine_living_room_1978',
    name: '1978 Pristine Living Room Suite',
    description: 'Pristine 1970s living room suite with gold tweed sofa, polished walnut coffee table, color woodgrain TV, torchiere lamp, and wool rug.',
    createdAt: '2026-11-01T10:15:00.000Z',
    tags: ['apartment', 'living_room', '1970s', 'pristine', 'suite'],
    boundingSize: [3.4, 3.2],
    items: [
      {
        name: 'Mid-Century Tweed Sofa [Pristine]',
        category: 'furniture',
        subType: 'apt_lr_sofa_pristine',
        relPosition: [0, 0.45, -0.9],
        dimensions: [2.2, 0.9, 0.95],
        rotationY: 0,
        color: '#b89445',
        textureId: 'wallpaper_damask',
        collidable: true,
        pairedVariantId: 'apt_lr_sofa_unkempt',
        conditionVariant: 'pristine',
        tags: ['sofa', 'pristine', 'living']
      },
      {
        name: 'Polished Walnut Coffee Table [Pristine]',
        category: 'furniture',
        subType: 'apt_lr_coffee_table_pristine',
        relPosition: [0, 0.25, 0.2],
        dimensions: [1.4, 0.5, 0.75],
        rotationY: 0,
        color: '#4a2c17',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_lr_coffee_table_unkempt',
        conditionVariant: 'pristine',
        tags: ['coffee_table', 'pristine']
      },
      {
        name: '1978 Woodgrain Color Television [Pristine]',
        category: 'appliance',
        subType: 'apt_lr_television_pristine',
        relPosition: [0, 0.48, 1.2],
        dimensions: [1.1, 0.95, 0.75],
        rotationY: Math.PI,
        color: '#3d2516',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_lr_television_unkempt',
        conditionVariant: 'pristine',
        tags: ['tv', 'pristine']
      },
      {
        name: 'Polished Brass Torchiere Floor Lamp [Pristine]',
        category: 'lighting',
        subType: 'apt_lr_floor_lamp_pristine',
        relPosition: [-1.3, 0.9, -0.9],
        dimensions: [0.55, 1.8, 0.55],
        rotationY: 0,
        color: '#8a7238',
        textureId: 'aged_brass',
        collidable: true,
        pairedVariantId: 'apt_lr_floor_lamp_unkempt',
        conditionVariant: 'pristine',
        tags: ['lamp', 'lighting']
      },
      {
        name: 'Burnt Orange Wool Area Rug [Pristine]',
        category: 'floor_tile',
        subType: 'apt_lr_area_rug_pristine',
        relPosition: [0, 0.03, 0],
        dimensions: [3.2, 0.05, 2.4],
        rotationY: 0,
        color: '#bd4f1b',
        textureId: 'velvet_crimson',
        collidable: false,
        pairedVariantId: 'apt_lr_area_rug_unkempt',
        conditionVariant: 'pristine',
        tags: ['rug', 'carpet']
      }
    ]
  },
  {
    id: 'set_apt_unkempt_living_room_1978',
    name: '1978 Unkempt Atmospheric Living Suite',
    description: 'Weathered atmospheric apartment parlor with sagging cigarette-burned sofa, scarred coffee table with ashtray, static CRT TV, and tangled cords.',
    createdAt: '2026-11-01T10:30:00.000Z',
    tags: ['apartment', 'living_room', '1970s', 'unkempt', 'weathered', 'noir'],
    boundingSize: [3.4, 3.2],
    items: [
      {
        name: 'Sagging Tweed Sofa [Unkempt]',
        category: 'furniture',
        subType: 'apt_lr_sofa_unkempt',
        relPosition: [0, 0.42, -0.9],
        dimensions: [2.2, 0.85, 0.95],
        rotationY: 0,
        color: '#755f32',
        textureId: 'wallpaper_damask',
        collidable: true,
        pairedVariantId: 'apt_lr_sofa_pristine',
        conditionVariant: 'unkempt',
        tags: ['sofa', 'unkempt', 'living']
      },
      {
        name: 'Scarred Laminate Coffee Table & Ashtray [Unkempt]',
        category: 'furniture',
        subType: 'apt_lr_coffee_table_unkempt',
        relPosition: [0, 0.25, 0.2],
        dimensions: [1.4, 0.5, 0.75],
        rotationY: 0,
        color: '#361e0e',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_lr_coffee_table_pristine',
        conditionVariant: 'unkempt',
        tags: ['coffee_table', 'unkempt']
      },
      {
        name: 'Cathode-Ray Tube (CRT) Television [Unkempt]',
        category: 'appliance',
        subType: 'apt_lr_television_unkempt',
        relPosition: [0, 0.48, 1.2],
        dimensions: [1.1, 0.95, 0.75],
        rotationY: Math.PI,
        color: '#2b190f',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_lr_television_pristine',
        conditionVariant: 'unkempt',
        tags: ['tv', 'crt', 'unkempt']
      },
      {
        name: 'Tarnished Brass Floor Lamp [Unkempt]',
        category: 'lighting',
        subType: 'apt_lr_floor_lamp_unkempt',
        relPosition: [-1.3, 0.88, -0.9],
        dimensions: [0.55, 1.75, 0.55],
        rotationY: 0,
        color: '#524320',
        textureId: 'aged_brass',
        collidable: true,
        pairedVariantId: 'apt_lr_floor_lamp_pristine',
        conditionVariant: 'unkempt',
        tags: ['lamp', 'lighting', 'unkempt']
      },
      {
        name: 'Tangled Nest of Extension Cords [Unkempt]',
        category: 'clue_prop',
        subType: 'apt_lr_extension_cords_unkempt',
        relPosition: [1.3, 0.08, 0.8],
        dimensions: [0.8, 0.15, 0.8],
        rotationY: 0,
        color: '#18181b',
        textureId: 'industrial_concrete',
        collidable: false,
        pairedVariantId: 'apt_lr_coasters_tray_pristine',
        conditionVariant: 'unkempt',
        tags: ['cords', 'unkempt']
      },
      {
        name: 'Faded Traffic-Worn Area Rug [Unkempt]',
        category: 'floor_tile',
        subType: 'apt_lr_area_rug_unkempt',
        relPosition: [0, 0.03, 0],
        dimensions: [3.2, 0.05, 2.4],
        rotationY: 0,
        color: '#6e3215',
        textureId: 'velvet_crimson',
        collidable: false,
        pairedVariantId: 'apt_lr_area_rug_pristine',
        conditionVariant: 'unkempt',
        tags: ['rug', 'carpet', 'unkempt']
      }
    ]
  },
  {
    id: 'set_apt_kitchenette_harvest_gold_1978',
    name: '1978 Harvest Gold Kitchenette Suite',
    description: 'Clean vintage kitchen setup with Harvest Gold refrigerator, Avocado gas range, Formica counter with sink, and wire dish rack.',
    createdAt: '2026-11-01T10:45:00.000Z',
    tags: ['apartment', 'kitchen', '1970s', 'harvest_gold', 'pristine'],
    boundingSize: [3.8, 1.8],
    items: [
      {
        name: '1970s Harvest Gold Refrigerator',
        category: 'appliance',
        subType: 'apt_harvest_gold_refrigerator',
        relPosition: [-1.4, 0.88, 0],
        dimensions: [1.0, 1.75, 0.9],
        rotationY: 0,
        color: '#c59223',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['appliance', 'fridge', 'harvest_gold']
      },
      {
        name: 'Formica Counter with Faux Wood Trim',
        category: 'furniture',
        subType: 'apt_formica_countertop_wood_trim',
        relPosition: [0.1, 0.48, 0],
        dimensions: [2.2, 0.95, 0.8],
        rotationY: 0,
        color: '#dfd7c5',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['counter', 'formica']
      },
      {
        name: 'Chrome Wire Dish Rack [Pristine]',
        category: 'furniture',
        subType: 'apt_kit_dish_rack_pristine',
        relPosition: [0.6, 1.05, 0],
        dimensions: [0.65, 0.35, 0.5],
        rotationY: 0,
        color: '#cbd5e1',
        textureId: 'aged_brass',
        collidable: false,
        pairedVariantId: 'apt_kit_dish_rack_unkempt',
        conditionVariant: 'pristine',
        tags: ['dish_rack', 'pristine']
      },
      {
        name: '1970s Avocado Green Gas Range',
        category: 'appliance',
        subType: 'apt_avocado_green_gas_range',
        relPosition: [1.5, 0.58, 0],
        dimensions: [0.95, 1.15, 0.85],
        rotationY: 0,
        color: '#4f5e34',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['appliance', 'oven', 'avocado_green']
      }
    ]
  },
  {
    id: 'set_apt_unkempt_kitchenette_1978',
    name: '1978 Unkempt Dilapidated Kitchenette',
    description: 'Grease-stained tenant kitchenette with peeling takeout menus on fridge, scorched toaster, dish rack with lone glass, and overflowing trash.',
    createdAt: '2026-11-01T11:00:00.000Z',
    tags: ['apartment', 'kitchen', '1970s', 'unkempt', 'weathered', 'noir'],
    boundingSize: [3.8, 1.8],
    items: [
      {
        name: '1970s Harvest Gold Refrigerator',
        category: 'appliance',
        subType: 'apt_harvest_gold_refrigerator',
        relPosition: [-1.4, 0.88, 0],
        dimensions: [1.0, 1.75, 0.9],
        rotationY: 0,
        color: '#a87919',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['appliance', 'fridge', 'harvest_gold']
      },
      {
        name: 'Scratched Pan in Murky Sink [Unkempt]',
        category: 'clue_prop',
        subType: 'apt_kit_skillet_unkempt',
        relPosition: [0, 0.48, 0],
        dimensions: [0.65, 0.4, 0.55],
        rotationY: 0,
        color: '#3f3f46',
        textureId: 'plaster_cream',
        collidable: false,
        pairedVariantId: 'apt_kit_skillet_pristine',
        conditionVariant: 'unkempt',
        tags: ['sink', 'skillet', 'unkempt']
      },
      {
        name: 'Rusted Wire Dish Rack & Lone Glass [Unkempt]',
        category: 'furniture',
        subType: 'apt_kit_dish_rack_unkempt',
        relPosition: [0.65, 0.48, 0],
        dimensions: [0.65, 0.35, 0.5],
        rotationY: 0,
        color: '#78350f',
        textureId: 'aged_brass',
        collidable: false,
        pairedVariantId: 'apt_kit_dish_rack_pristine',
        conditionVariant: 'unkempt',
        tags: ['dish_rack', 'unkempt']
      },
      {
        name: 'Scorched Two-Slice Toaster [Unkempt]',
        category: 'appliance',
        subType: 'apt_kit_toaster_unkempt',
        relPosition: [-0.65, 0.48, 0],
        dimensions: [0.35, 0.25, 0.22],
        rotationY: 0,
        color: '#52525b',
        textureId: 'aged_brass',
        collidable: false,
        pairedVariantId: 'apt_kit_toaster_pristine',
        conditionVariant: 'unkempt',
        tags: ['toaster', 'unkempt']
      },
      {
        name: 'Overflowing Trash Bin with Swinging Lid [Unkempt]',
        category: 'furniture',
        subType: 'apt_kit_trash_can_unkempt',
        relPosition: [1.4, 0.42, 0.2],
        dimensions: [0.5, 0.85, 0.5],
        rotationY: 0,
        color: '#475569',
        textureId: 'industrial_concrete',
        collidable: true,
        pairedVariantId: 'apt_kit_trash_can_pristine',
        conditionVariant: 'unkempt',
        tags: ['trash', 'unkempt']
      }
    ]
  },
  {
    id: 'set_apt_tenement_bathroom_1978',
    name: '1978 Tenement Bathroom Suite',
    description: 'Complete vintage tenement bathroom with clawfoot tub, mildewed vinyl shower curtain, splayed toothbrush tumbler, and radiator-dried towels.',
    createdAt: '2026-11-01T11:15:00.000Z',
    tags: ['apartment', 'bathroom', '1970s', 'weathered', 'suite'],
    boundingSize: [2.8, 2.8],
    items: [
      {
        name: 'Water-Stained Clawfoot Bathtub',
        category: 'furniture',
        subType: 'porcelain_bathtub',
        relPosition: [-0.7, 0.38, -0.7],
        dimensions: [1.6, 0.75, 0.8],
        rotationY: 0,
        color: '#9c9484',
        textureId: 'checker_marble',
        collidable: true,
        tags: ['bathtub', 'bathroom']
      },
      {
        name: 'Mildew-Speckled Vinyl Shower Curtain [Unkempt]',
        category: 'furniture',
        subType: 'apt_bath_shower_curtain_unkempt',
        relPosition: [-0.7, 1.05, -0.3],
        dimensions: [1.8, 2.1, 0.1],
        rotationY: 0,
        color: '#4d4637',
        textureId: 'checker_marble',
        collidable: false,
        pairedVariantId: 'apt_bath_shower_curtain_pristine',
        conditionVariant: 'unkempt',
        tags: ['shower_curtain', 'unkempt']
      },
      {
        name: 'Stained Ecru Suite Toilet & Tank',
        category: 'furniture',
        subType: 'suite_porcelain_toilet',
        relPosition: [0.8, 0.42, -0.7],
        dimensions: [0.55, 0.85, 0.75],
        rotationY: 0,
        color: '#948c7c',
        textureId: 'checker_marble',
        collidable: true,
        tags: ['toilet', 'bathroom']
      },
      {
        name: 'Cracked Formica & Ecru Vanity Sink',
        category: 'furniture',
        subType: 'marble_vanity_sink',
        relPosition: [0.7, 0.62, 0.5],
        dimensions: [1.1, 1.25, 0.65],
        rotationY: Math.PI,
        color: '#877f70',
        textureId: 'checker_marble',
        collidable: true,
        tags: ['vanity', 'sink', 'bathroom']
      },
      {
        name: 'Threadbare Radiator-Dried Towels [Unkempt]',
        category: 'furniture',
        subType: 'apt_bath_towels_unkempt',
        relPosition: [-0.8, 0.7, 0.6],
        dimensions: [0.75, 0.85, 0.2],
        rotationY: 0,
        color: '#78716c',
        textureId: 'velvet_crimson',
        collidable: false,
        pairedVariantId: 'apt_bath_towels_pristine',
        conditionVariant: 'unkempt',
        tags: ['towels', 'unkempt']
      }
    ]
  },
  {
    id: 'set_apt_bedroom_retro_1978',
    name: '1978 Retro Tenant Bedroom Suite',
    description: 'Classic 1970s tenant bedroom featuring platform bed, veneer nightstand with flip clock, pleated lamp, and louvered closet doors.',
    createdAt: '2026-11-01T11:30:00.000Z',
    tags: ['apartment', 'bedroom', '1970s', 'suite'],
    boundingSize: [3.4, 3.2],
    items: [
      {
        name: 'Walnut Platform Bed & Tucked Sheets [Pristine]',
        category: 'furniture',
        subType: 'apt_bed_platform_pristine',
        relPosition: [0, 0.62, -0.6],
        dimensions: [2.1, 1.25, 2.3],
        rotationY: 0,
        color: '#451a03',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_bed_platform_unkempt',
        conditionVariant: 'pristine',
        tags: ['bed', 'furniture']
      },
      {
        name: 'Polished Walnut Bedside Nightstand [Pristine]',
        category: 'furniture',
        subType: 'apt_bed_nightstand_pristine',
        relPosition: [-1.35, 0.32, -0.6],
        dimensions: [0.65, 0.65, 0.55],
        rotationY: 0,
        color: '#451a03',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_bed_nightstand_unkempt',
        conditionVariant: 'pristine',
        tags: ['nightstand']
      },
      {
        name: 'Digital Woodgrain Flip Alarm Clock [Pristine]',
        category: 'appliance',
        subType: 'apt_bed_alarm_clock_pristine',
        relPosition: [-1.35, 0.72, -0.6],
        dimensions: [0.32, 0.16, 0.2],
        rotationY: 0,
        color: '#451a03',
        textureId: 'oak_parquet',
        collidable: false,
        pairedVariantId: 'apt_bed_alarm_clock_unkempt',
        conditionVariant: 'pristine',
        soundPresetId: 'sfx_telephone_ring',
        tags: ['alarm_clock']
      },
      {
        name: 'Six-Drawer Mid-Century Walnut Dresser [Pristine]',
        category: 'furniture',
        subType: 'apt_bed_dresser_pristine',
        relPosition: [1.35, 0.55, 0.4],
        dimensions: [1.6, 1.1, 0.65],
        rotationY: -Math.PI / 2,
        color: '#451a03',
        textureId: 'oak_parquet',
        collidable: true,
        pairedVariantId: 'apt_bed_dresser_unkempt',
        conditionVariant: 'pristine',
        tags: ['dresser']
      }
    ]
  }
];

export const APARTMENT_ROOM_ASSET_SETS: AssetSet[] = [
  ...APARTMENT_1978_ROOM_ASSET_SETS,
  ...APARTMENT_UPDATED_HOTEL_ASSET_SETS
];

export {
  APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS,
  APARTMENT_UPDATED_HOTEL_ASSET_SETS,
  STRUCTURAL_HOTEL_ASSET_SUBTYPES,
  isStructuralHotelAsset,
  canAssetBeUpdatedInHotel,
  getUpdated1990sVariantSubtype,
  getPredecessor1978Subtype,
  upgradeAssetTo1990sHotelVersion,
  downgradeAssetTo1978Version,
  buildGemini1990sHotelAssetPromptQueue
};

/**
 * Returns the paired variant subType for any given asset template.
 */
export function getPairedVariantSubtype(subType: string): string | undefined {
  const match = APARTMENT_BUILDING_CATALOG_BLUEPRINTS.find((b) => b.subType === subType);
  return match?.pairedVariantId;
}

/**
 * Toggles a placed asset between its Pristine and Unkempt variants in-place on the 3D lot,
 * preserving its coordinate [X, Y, Z], rotation, floor layer, and selection ID.
 */
export function togglePlacedAssetConditionVariant(
  asset: PlacedAsset,
  allBlueprints: readonly SearchableBlueprintLike[] = APARTMENT_BUILDING_CATALOG_BLUEPRINTS
): PlacedAsset | null {
  const targetSubtype =
    asset.pairedVariantId ||
    allBlueprints.find((b) => b.subType === asset.subType)?.pairedVariantId ||
    getPairedVariantSubtype(asset.subType);

  if (!targetSubtype) return null;

  const targetBp = allBlueprints.find((b) => b.subType === targetSubtype);
  if (!targetBp) return null;

  return {
    ...asset,
    name: targetBp.name,
    subType: targetBp.subType,
    category: targetBp.category,
    color: targetBp.defaultColor,
    textureId: targetBp.defaultTexture,
    dimensions: [...targetBp.defaultDimensions] as [number, number, number],
    compositeParts: targetBp.compositeParts ? targetBp.compositeParts.map((p) => ({ ...p })) : undefined,
    soundPresetId: targetBp.soundPresetId || asset.soundPresetId,
    pairedVariantId: asset.subType, // Points back to previous variant for instant reverse toggle
    conditionVariant: targetBp.conditionVariant,
    tags: targetBp.tags ? [...targetBp.tags] : asset.tags
  };
}

/**
 * Generates an expanded Google AI Studio (`gemini-2.5-flash`) queue payload
 * to synthesize supplementary high-fidelity 3D mesh references and concept textures.
 */
export function buildGeminiApartmentAssetPromptQueue(
  modelId: 'gemini-2.5-flash' | 'gemini-3.1-flash-lite' = 'gemini-2.5-flash'
): Array<{
  subType: string;
  name: string;
  modelId: string;
  condition: AssetConditionVariant | 'standard';
  prompt: string;
}> {
  return APARTMENT_BUILDING_CATALOG_BLUEPRINTS.map((bp) => ({
    subType: bp.subType,
    name: bp.name,
    modelId,
    condition: bp.conditionVariant || 'standard',
    prompt: `1970s apartment building asset: ${bp.name}. ${bp.description} Period late-70s textures (Harvest Gold, Avocado Green, Dark Walnut, Tarnished Brass), photorealistic architectural detail, optimized for real-time 3D game engines.`
  }));
}
