import type {
  AssetCategory,
  TexturePresetId,
  CompositeSubPart,
  AssetClipboardItem,
  AssetSet,
  PlacedAsset,
  SearchableBlueprintLike
} from './rules';
import type { ApartmentAssetBlueprint } from './apartmentImportData';

/**
 * ============================================================================
 * STRUCTURAL ASSETS CATALOG & IMMUTABILITY MATRIX
 * Structural architectural elements (masonry walls, concrete stairwells, elevator
 * hoistway shafts, cast-iron gravity waste chutes, central steam radiator mains)
 * CANNOT be updated or removed during 1992-1995 hotel renovation conversions.
 * ============================================================================
 */
export const STRUCTURAL_HOTEL_ASSET_SUBTYPES = new Set<string>([
  'apt_concrete_stairwell_flight',
  'apt_elevator_sliding_doors',
  'apt_wall_trash_chute_door',
  'apt_baseboard_steam_radiator',
  'apt_utility_gas_electric_meter',
  'apt_surface_breaker_panel',
  'apt_popcorn_ceiling_tile',
  'brick_wall_exterior',
  'apt_interior_plaster_wall',
  'apt_hallway_cinderblock_wall',
  'apt_loadbearing_pillar',
  'concrete_foundation_slab',
  'elevator_shaft_core'
]);

/**
 * Returns true if the asset represents an immutable structural load-bearing or MEP core element.
 */
export function isStructuralHotelAsset(
  subType: string,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): boolean {
  if (STRUCTURAL_HOTEL_ASSET_SUBTYPES.has(subType)) return true;
  const bp = allBlueprints.find((b) => b.subType === subType);
  if (bp) {
    if (bp.canUpdateInHotel === true) return false;
    if (bp.canUpdateInHotel === false) return true;
    if (bp.structuralConstraint) return true;
    if (bp.tags && (bp.tags.includes('structural_fixed') || bp.tags.includes('structural'))) return true;
    if (bp.category === 'wall' || bp.category === 'secret_wall') return true;
  }
  const s = subType.toLowerCase();
  // Interior cab components are updatable furnishings/fixtures
  if (
    s.startsWith('apt_elevator_cab_') ||
    s.startsWith('apt_elevator_button_panel') ||
    s.startsWith('apt_elevator_emergency_phone') ||
    s.startsWith('apt_elevator_ceiling') ||
    s.startsWith('apt_elevator_floor_tile')
  ) {
    return false;
  }
  return (
    s.includes('stairwell') ||
    s.includes('chute') ||
    s === 'apt_elevator_sliding_doors' ||
    s.includes('elevator_shaft') ||
    s.includes('breaker_panel') ||
    s.includes('meter') ||
    s.includes('structural')
  );
}

/**
 * Returns true if an asset can be legally upgraded in a hotel renovation.
 */
export function canAssetBeUpdatedInHotel(
  assetOrSubtype: string | PlacedAsset | SearchableBlueprintLike,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): boolean {
  const subType = typeof assetOrSubtype === 'string' ? assetOrSubtype : assetOrSubtype.subType;
  if (isStructuralHotelAsset(subType, allBlueprints)) return false;

  if (typeof assetOrSubtype === 'object' && assetOrSubtype !== null) {
    if (assetOrSubtype.canUpdateInHotel === false) return false;
    if (assetOrSubtype.paired1990sId) return true;
  }

  const bp = allBlueprints.find((b) => b.subType === subType);
  if (bp) {
    if (bp.canUpdateInHotel === false) return false;
    if (bp.paired1990sId) return true;
  }

  // Check 1990s catalog pairings
  return Boolean(getUpdated1990sVariantSubtype(subType, allBlueprints));
}

/**
 * ============================================================================
 * 1992-1995 HOTEL RENOVATED BLUEPRINT CATALOG
 * New items representative of early-to-mid 1990s hotel conversion standards:
 * Hunter Green & Teal palettes, Bleached Oak laminate, Black Trinitron CRTs,
 * Push-button touchtone phones, Saflok magnetic keycards, PTAC climate units,
 * Cultured marble vanities, Hollywood chrome bar lighting, Halogen torchieres.
 * ============================================================================
 */
export const APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS: ApartmentAssetBlueprint[] = [
  // --------------------------------------------------------------------------
  // 1. ELECTRONICS, COMMUNICATIONS & CLIMATE CONTROL
  // --------------------------------------------------------------------------
  {
    subType: 'apt_tv_crt_90s_black',
    name: '1990s Trinitron Black 27-inch CRT Television',
    category: 'appliance',
    defaultDimensions: [0.95, 0.72, 0.65],
    defaultColor: '#18181b',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_television_pristine',
    soundPresetId: 'sfx_radio_static',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'tv', 'crt', 'electronics', 'appliance', 'audio-linked'],
    description: '1992-1995 high-end commercial 27-inch color CRT television in textured charcoal ABS plastic with front RCA composite inputs, remote sensor eye, and front-firing stereo speaker grilles.',
    compositeParts: [
      { id: 'chassis', shape: 'box', offset: [0, 0, 0], size: [0.95, 0.7, 0.62], color: '#18181b', roughness: 0.45, metalness: 0.2 },
      { id: 'screen', shape: 'box', offset: [0, 0.05, 0.29], size: [0.72, 0.52, 0.05], color: '#1e293b', roughness: 0.1, metalness: 0.85, emissive: '#0f172a' },
      { id: 'button_bar', shape: 'box', offset: [0, -0.25, 0.3], size: [0.7, 0.06, 0.03], color: '#27272a', roughness: 0.6, metalness: 0.3 },
      { id: 'rca_jacks', shape: 'box', offset: [0.38, -0.25, 0.31], size: [0.08, 0.04, 0.02], color: '#eab308', roughness: 0.3, metalness: 0.9 }
    ]
  },
  {
    subType: 'apt_phone_touchtone_90s',
    name: '1990s Commercial Touchtone Hotel Desk Phone',
    category: 'appliance',
    defaultDimensions: [0.35, 0.22, 0.35],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_wall_rotary_telephone',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'phone', 'telephone', 'touchtone', 'audio-linked'],
    description: 'Commercial 12-key push-button touchtone desk phone with side RJ-11 modem data port, front desk speed-dial buttons, and blinking neon red message-waiting lamp.',
    compositeParts: [
      { id: 'base', shape: 'box', offset: [0, 0, 0], size: [0.32, 0.12, 0.32], color: '#d8cfbe', roughness: 0.4, metalness: 0.1 },
      { id: 'handset', shape: 'box', offset: [0, 0.08, 0], size: [0.28, 0.08, 0.1], color: '#27272a', roughness: 0.35, metalness: 0.1 },
      { id: 'keypad', shape: 'box', offset: [0, 0.04, 0.04], size: [0.14, 0.02, 0.16], color: '#18181b', roughness: 0.6, metalness: 0.2 },
      { id: 'message_led', shape: 'sphere', offset: [0.12, 0.07, -0.1], size: [0.02, 0.02, 0.02], color: '#ef4444', roughness: 0.2, metalness: 0.1, emissive: '#ef4444' }
    ]
  },
  {
    subType: 'apt_bed_digital_clock_radio_90s',
    name: '1990s Digital LED AM/FM Alarm Clock Radio',
    category: 'appliance',
    defaultDimensions: [0.32, 0.14, 0.22],
    defaultColor: '#18181b',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_alarm_clock_pristine',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'alarm_clock', 'radio', 'bedroom', 'appliance'],
    description: 'Matte black bedside digital clock radio with bright red 7-segment LED time readout, wide top snooze bar, and rotary tuning wheel.',
    compositeParts: [
      { id: 'casing', shape: 'box', offset: [0, 0, 0], size: [0.32, 0.12, 0.22], color: '#18181b', roughness: 0.45, metalness: 0.2 },
      { id: 'led_face', shape: 'box', offset: [0, 0, 0.11], size: [0.24, 0.06, 0.01], color: '#dc2626', roughness: 0.1, metalness: 0.1, emissive: '#ef4444' },
      { id: 'snooze_bar', shape: 'box', offset: [0, 0.07, 0], size: [0.18, 0.02, 0.06], color: '#3f3f46', roughness: 0.6, metalness: 0.3 }
    ]
  },
  {
    subType: 'apt_door_keycard_reader_90s',
    name: '1990s Saflok Magnetic Keycard Hotel Door Lockset',
    category: 'door',
    defaultDimensions: [1.1, 2.3, 0.25],
    defaultColor: '#c5a059',
    defaultTexture: 'aged_brass',
    collidable: true,
    isSecretPassage: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_interior_tenement_door',
    animationSpec: '500ms smooth right-hinged hotel door swing + magnetic lock swipe chime',
    soundPresetId: 'sfx_door_latch',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'door', 'lock', 'keycard', 'interactive', 'hinged'],
    description: 'Commercial fire-rated hotel entrance door equipped with Saflok magnetic keycard swipe reader, polished brass lever handle, and red/green verification LEDs.',
    compositeParts: [
      { id: 'door_frame', shape: 'box', offset: [0, 0, 0], size: [1.1, 2.3, 0.22], color: '#e2e8f0', roughness: 0.4, metalness: 0.1 },
      { id: 'door_leaf', shape: 'box', offset: [0, 0, 0], size: [0.96, 2.18, 0.06], color: '#ece8df', roughness: 0.4, metalness: 0.15 },
      { id: 'keycard_unit', shape: 'box', offset: [0.38, 0.05, 0.05], size: [0.12, 0.34, 0.04], color: '#c5a059', roughness: 0.25, metalness: 0.85 },
      { id: 'swipe_slot', shape: 'box', offset: [0.38, 0.12, 0.07], size: [0.08, 0.02, 0.01], color: '#18181b', roughness: 0.8, metalness: 0.2 },
      { id: 'lever_handle', shape: 'box', offset: [0.38, -0.06, 0.08], size: [0.16, 0.04, 0.08], color: '#c5a059', roughness: 0.25, metalness: 0.85 },
      { id: 'led_indicator', shape: 'cylinder', offset: [0.38, 0.18, 0.07], size: [0.015, 0.01, 0.015], color: '#22c55e', roughness: 0.2, metalness: 0.1, emissive: '#22c55e' }
    ]
  },
  {
    subType: 'apt_ptac_ac_unit_90s',
    name: '1990s Under-Window PTAC Hotel Climate Unit',
    category: 'appliance',
    defaultDimensions: [1.4, 0.65, 0.45],
    defaultColor: '#e5e7eb',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_baseboard_steam_radiator',
    soundPresetId: 'sfx_steam_pipe',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'ptac', 'ac_unit', 'climate', 'appliance', 'audio-linked'],
    description: 'Under-window Packaged Terminal Air Conditioner and heat pump in off-white textured stamped steel housing with adjustable directional discharge louvers and dual climate knobs.',
    compositeParts: [
      { id: 'cabinet', shape: 'box', offset: [0, 0, 0], size: [1.4, 0.65, 0.42], color: '#e5e7eb', roughness: 0.4, metalness: 0.3 },
      { id: 'louver_grille', shape: 'box', offset: [0, 0.15, 0.2], size: [1.25, 0.24, 0.04], color: '#9ca3af', roughness: 0.7, metalness: 0.4 },
      { id: 'control_hatch', shape: 'box', offset: [0.48, 0.15, 0.21], size: [0.24, 0.16, 0.03], color: '#374151', roughness: 0.5, metalness: 0.2 },
      { id: 'temp_knob', shape: 'cylinder', offset: [0.48, 0.15, 0.23], size: [0.035, 0.02, 0.035], color: '#d1d5db', roughness: 0.3, metalness: 0.4 }
    ]
  },
  {
    subType: 'apt_fire_alarm_strobe_horn_90s',
    name: '1990s Wheelock ADA Xenon Strobe Fire Alarm Horn',
    category: 'appliance',
    defaultDimensions: [0.28, 0.35, 0.15],
    defaultColor: '#ffffff',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ceiling_smoke_detector',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'fire_alarm', 'strobe', 'safety', 'appliance'],
    description: 'Wall-mounted white ADA-compliant fire alarm horn station featuring a high-intensity xenon strobe flash lens above a perforated red sounder plate.',
    compositeParts: [
      { id: 'box', shape: 'box', offset: [0, 0, 0], size: [0.28, 0.35, 0.12], color: '#ffffff', roughness: 0.4, metalness: 0.1 },
      { id: 'strobe_lens', shape: 'box', offset: [0, 0.08, 0.07], size: [0.2, 0.12, 0.04], color: '#f8fafc', roughness: 0.1, metalness: 0.2, emissive: '#fef08a' },
      { id: 'horn_grille', shape: 'box', offset: [0, -0.08, 0.06], size: [0.2, 0.12, 0.02], color: '#dc2626', roughness: 0.5, metalness: 0.3 }
    ]
  },
  {
    subType: 'apt_hotel_exit_sign_led_90s',
    name: '1990s Photoluminescent LED Emergency Exit Sign',
    category: 'lighting',
    defaultDimensions: [0.65, 0.35, 0.15],
    defaultColor: '#ffffff',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_illuminated_exit_sign',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'exit_sign', 'safety', 'lighting'],
    description: 'Slimline thermoplastic emergency exit sign illuminated with energy-efficient green LED letters and directional knockout chevron arrows.',
    compositeParts: [
      { id: 'frame', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.35, 0.12], color: '#ffffff', roughness: 0.35, metalness: 0.2 },
      { id: 'green_face', shape: 'box', offset: [0, 0, 0.065], size: [0.58, 0.28, 0.02], color: '#22c55e', roughness: 0.15, metalness: 0.1, emissive: '#22c55e' }
    ]
  },
  {
    subType: 'apt_intercom_hotel_pbx_90s',
    name: '1990s Front-Desk PBX Digital Intercom Console',
    category: 'appliance',
    defaultDimensions: [0.65, 0.45, 0.35],
    defaultColor: '#334155',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_front_door_intercom',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'intercom', 'pbx', 'switchboard', 'lobby', 'appliance'],
    description: 'Concierge front-desk digital PBX console with multi-line LCD status readout, room extension button bank, and gooseneck dispatcher microphone.',
    compositeParts: [
      { id: 'console_body', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.25, 0.35], color: '#334155', roughness: 0.5, metalness: 0.3 },
      { id: 'lcd_display', shape: 'box', offset: [0, 0.12, -0.05], size: [0.28, 0.08, 0.02], color: '#059669', roughness: 0.2, metalness: 0.1, emissive: '#10b981' },
      { id: 'button_matrix', shape: 'box', offset: [0, 0.05, 0.08], size: [0.52, 0.04, 0.16], color: '#1e293b', roughness: 0.6, metalness: 0.2 }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. GUEST ROOM & SUITE FURNITURE (1992-1995 HOTEL STANDARDS)
  // --------------------------------------------------------------------------
  {
    subType: 'apt_hotel_bed_queen_90s',
    name: '1990s Bleached Oak Hotel Queen Bed',
    category: 'furniture',
    defaultDimensions: [1.85, 1.15, 2.25],
    defaultColor: '#0f4c5c',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_mattress_boxspring_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'bed', 'queen_bed', 'bedroom', 'furniture'],
    description: 'Contract hotel queen bed featuring a whitewashed ash laminate headboard, crisp white triple-sheeted linens, and a quilted dark teal & forest green geometric bedspread.',
    compositeParts: [
      { id: 'headboard', shape: 'box', offset: [0, 0.3, -1.05], size: [1.85, 1.15, 0.12], color: '#f1ede4', roughness: 0.45, metalness: 0.1 },
      { id: 'steel_frame', shape: 'box', offset: [0, -0.22, 0.05], size: [1.75, 0.25, 2.15], color: '#18181b', roughness: 0.6, metalness: 0.7 },
      { id: 'boxspring', shape: 'box', offset: [0, -0.05, 0.05], size: [1.7, 0.22, 2.1], color: '#f8fafc', roughness: 0.8, metalness: 0.05 },
      { id: 'quilted_spread', shape: 'box', offset: [0, 0.1, 0.12], size: [1.72, 0.15, 1.8], color: '#0f4c5c', roughness: 0.75, metalness: 0.1 },
      { id: 'hotel_pillows', shape: 'box', offset: [0, 0.22, -0.8], size: [1.5, 0.18, 0.45], color: '#ffffff', roughness: 0.85, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_hotel_tv_armoire_90s',
    name: '1990s Whitewashed Laminate TV Armoire',
    category: 'furniture',
    defaultDimensions: [1.35, 1.95, 0.75],
    defaultColor: '#ece8df',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_dresser_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'armoire', 'wardrobe', 'storage', 'tv_stand', 'furniture'],
    description: 'Hospitality television armoire finished in whitewashed bleached oak laminate with bifold pocket doors, heavy-duty CRT television swivel pull-out shelf, and three lower clothes drawers.',
    compositeParts: [
      { id: 'main_carcass', shape: 'box', offset: [0, 0, 0], size: [1.35, 1.95, 0.75], color: '#ece8df', roughness: 0.45, metalness: 0.1 },
      { id: 'upper_cavity', shape: 'box', offset: [0, 0.35, 0.05], size: [1.25, 1.05, 0.68], color: '#ded7c7', roughness: 0.6, metalness: 0.05 },
      { id: 'lower_drawers', shape: 'box', offset: [0, -0.55, 0.05], size: [1.25, 0.65, 0.68], color: '#e5ded0', roughness: 0.45, metalness: 0.1 },
      { id: 'brass_drawer_pulls', shape: 'cylinder', offset: [0, -0.55, 0.4], size: [0.02, 0.03, 0.02], color: '#c5a059', roughness: 0.25, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_hotel_nightstand_90s',
    name: '1990s Bleached Laminate Hotel Nightstand',
    category: 'furniture',
    defaultDimensions: [0.65, 0.65, 0.55],
    defaultColor: '#ece8df',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_nightstand_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'nightstand', 'bedroom', 'furniture'],
    description: 'Durable bleached oak contract nightstand with rounded postformed edges, an open lower book cubby, and a single drawer with polished brass knob.',
    compositeParts: [
      { id: 'carcass', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.65, 0.55], color: '#ece8df', roughness: 0.45, metalness: 0.1 },
      { id: 'open_cubby', shape: 'box', offset: [0, -0.12, 0.02], size: [0.55, 0.28, 0.5], color: '#ded7c7', roughness: 0.6, metalness: 0.05 },
      { id: 'drawer_front', shape: 'box', offset: [0, 0.18, 0.28], size: [0.55, 0.22, 0.03], color: '#e5ded0', roughness: 0.45, metalness: 0.1 },
      { id: 'brass_knob', shape: 'sphere', offset: [0, 0.18, 0.3], size: [0.025, 0.025, 0.025], color: '#c5a059', roughness: 0.25, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_hotel_sofa_90s',
    name: '1990s Teal & Mauve Commercial Hotel Sofa',
    category: 'furniture',
    defaultDimensions: [2.2, 0.88, 0.95],
    defaultColor: '#1b4332',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_sofa_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'sofa', 'couch', 'living', 'furniture'],
    description: 'Three-cushion contract sleeper sofa upholstered in stain-resistant hunter green, teal, and dusty mauve geometric patterned micro-suede with rounded padded armrests.',
    compositeParts: [
      { id: 'frame_base', shape: 'box', offset: [0, -0.15, 0], size: [2.2, 0.42, 0.95], color: '#153326', roughness: 0.8, metalness: 0.1 },
      { id: 'seat_cushions', shape: 'box', offset: [0, 0.05, 0.1], size: [2.05, 0.22, 0.7], color: '#1b4332', roughness: 0.75, metalness: 0.1 },
      { id: 'back_cushions', shape: 'box', offset: [0, 0.25, -0.3], size: [2.05, 0.42, 0.25], color: '#1e4a37', roughness: 0.75, metalness: 0.1 },
      { id: 'rounded_arms', shape: 'box', offset: [0, 0.15, 0], size: [2.2, 0.28, 0.2], color: '#153326', roughness: 0.8, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_coffee_table_glass_steel_90s',
    name: '1990s Glass & Tubular Steel Coffee Table',
    category: 'furniture',
    defaultDimensions: [1.35, 0.45, 0.75],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_coffee_table_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coffee_table', 'table', 'living', 'furniture'],
    description: 'Contemporary 1990s parlor coffee table with a tempered beveled glass tabletop supported by a curved matte-black tubular steel frame and lower perforated magazine rack.',
    compositeParts: [
      { id: 'steel_frame', shape: 'box', offset: [0, -0.05, 0], size: [1.25, 0.42, 0.65], color: '#18181b', roughness: 0.4, metalness: 0.8 },
      { id: 'glass_top', shape: 'box', offset: [0, 0.21, 0], size: [1.35, 0.02, 0.75], color: '#94a3b8', roughness: 0.1, metalness: 0.9, emissive: '#0f172a' },
      { id: 'lower_rack', shape: 'box', offset: [0, -0.15, 0], size: [1.15, 0.02, 0.55], color: '#27272a', roughness: 0.6, metalness: 0.6 }
    ]
  },
  {
    subType: 'apt_hotel_armchair_90s',
    name: '1990s Barrel Club Armchair in Hunter Green',
    category: 'furniture',
    defaultDimensions: [0.95, 0.82, 0.9],
    defaultColor: '#1b4332',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_velvet_armchair',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'armchair', 'chair', 'living', 'furniture'],
    description: 'Semi-circular barrel club armchair tailored in heavy commercial hunter-green jacquard fabric with dark espresso tapered feet.',
    compositeParts: [
      { id: 'barrel_body', shape: 'cylinder', offset: [0, 0, 0], size: [0.45, 0.82, 0.45], color: '#1b4332', roughness: 0.75, metalness: 0.1 },
      { id: 'seat_cushion', shape: 'cylinder', offset: [0, 0.02, 0.08], size: [0.38, 0.22, 0.38], color: '#22533e', roughness: 0.7, metalness: 0.1 },
      { id: 'front_feet', shape: 'cylinder', offset: [0, -0.38, 0], size: [0.04, 0.08, 0.04], color: '#18181b', roughness: 0.5, metalness: 0.5 }
    ]
  },
  {
    subType: 'apt_hotel_desk_laminate_90s',
    name: '1990s Executive Laminate Desk & Swivel Task Chair',
    category: 'furniture',
    defaultDimensions: [1.6, 0.76, 0.85],
    defaultColor: '#ece8df',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_rotary_telephone_desk',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'desk', 'chair', 'workstation', 'furniture'],
    description: 'Executive hotel workstation desk in bleached oak laminate with modesty panel, desktop cord grommet, and matching black fabric 5-star swivel task chair.',
    compositeParts: [
      { id: 'desktop', shape: 'box', offset: [0, 0.35, 0], size: [1.6, 0.06, 0.85], color: '#ece8df', roughness: 0.45, metalness: 0.1 },
      { id: 'side_pedestal', shape: 'box', offset: [-0.55, -0.04, 0], size: [0.45, 0.68, 0.75], color: '#ded7c7', roughness: 0.5, metalness: 0.1 },
      { id: 'modesty_panel', shape: 'box', offset: [0, -0.05, -0.35], size: [1.5, 0.55, 0.02], color: '#ded7c7', roughness: 0.5, metalness: 0.1 },
      { id: 'task_chair', shape: 'box', offset: [0.25, 0.05, 0.2], size: [0.55, 0.95, 0.55], color: '#18181b', roughness: 0.6, metalness: 0.4 }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. LIGHTING & WINDOW TREATMENTS
  // --------------------------------------------------------------------------
  {
    subType: 'apt_halogen_torchiere_lamp_90s',
    name: '1990s Black Tubular Halogen Torchiere Lamp',
    category: 'lighting',
    defaultDimensions: [0.45, 1.85, 0.45],
    defaultColor: '#18181b',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_floor_lamp_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'lamp', 'torchiere', 'halogen', 'lighting'],
    description: 'Ubiquitous 1990s matte-black tubular steel floor lamp with an upward-firing 500W halogen bowl diffuser and a rotary dimmer switch at mid-pole.',
    compositeParts: [
      { id: 'base_disc', shape: 'cylinder', offset: [0, -0.9, 0], size: [0.22, 0.04, 0.22], color: '#18181b', roughness: 0.4, metalness: 0.8 },
      { id: 'pole_stem', shape: 'cylinder', offset: [0, 0, 0], size: [0.03, 1.7, 0.03], color: '#18181b', roughness: 0.4, metalness: 0.8 },
      { id: 'halogen_bowl', shape: 'cone', offset: [0, 0.88, 0], size: [0.22, 0.16, 0.22], color: '#27272a', roughness: 0.3, metalness: 0.7, emissive: '#fef08a' },
      { id: 'dimmer_wheel', shape: 'cylinder', offset: [0.04, 0, 0], size: [0.02, 0.02, 0.02], color: '#71717a', roughness: 0.5, metalness: 0.5 }
    ]
  },
  {
    subType: 'apt_brass_tulip_sconce_90s',
    name: '1990s Polished Brass Tulip Wall Sconce',
    category: 'lighting',
    defaultDimensions: [0.3, 0.45, 0.3],
    defaultColor: '#c5a059',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_hallway_globe_fixture',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'sconce', 'lighting', 'brass'],
    description: 'Polished lacquered brass hotel corridor and headboard wall sconce featuring a curved swan-neck bracket supporting an upward frosted tulip-flute glass shade.',
    compositeParts: [
      { id: 'wall_rosette', shape: 'cylinder', offset: [0, 0, -0.12], size: [0.1, 0.03, 0.1], color: '#c5a059', roughness: 0.25, metalness: 0.85 },
      { id: 'curved_arm', shape: 'cylinder', offset: [0, -0.05, 0], size: [0.025, 0.22, 0.025], color: '#c5a059', roughness: 0.25, metalness: 0.85 },
      { id: 'tulip_shade', shape: 'cone', offset: [0, 0.12, 0.06], size: [0.14, 0.22, 0.14], color: '#ffffff', roughness: 0.2, metalness: 0.1, emissive: '#fffbeb' }
    ]
  },
  {
    subType: 'apt_hotel_blackout_drapes_90s',
    name: '1990s Hunter Green Hotel Blackout Drapes',
    category: 'furniture',
    defaultDimensions: [2.6, 2.6, 0.25],
    defaultColor: '#1b4332',
    defaultTexture: 'wallpaper_damask',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_velvet_curtains_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'curtains', 'drapes', 'blackout', 'furniture'],
    description: 'Full-length hospitality pinch-pleated blackout drapery set in hunter green and muted burgundy with an acrylic blackout liner and baton draw wand.',
    compositeParts: [
      { id: 'curtain_track', shape: 'cylinder', offset: [0, 1.25, 0], size: [0.03, 2.6, 0.03], color: '#c5a059', roughness: 0.3, metalness: 0.8 },
      { id: 'left_drape', shape: 'box', offset: [-0.85, 0, 0.05], size: [0.95, 2.5, 0.1], color: '#1b4332', roughness: 0.85, metalness: 0.05 },
      { id: 'right_drape', shape: 'box', offset: [0.85, 0, 0.05], size: [0.95, 2.5, 0.1], color: '#1b4332', roughness: 0.85, metalness: 0.05 },
      { id: 'sheer_curtain', shape: 'box', offset: [0, 0, 0], size: [2.2, 2.45, 0.02], color: '#f8fafc', roughness: 0.9, metalness: 0.02 }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. KITCHENETTE & IN-ROOM HOSPITALITY AMENITIES
  // --------------------------------------------------------------------------
  {
    subType: 'apt_fridge_white_90s',
    name: '1990s Modern White Full Refrigerator',
    category: 'appliance',
    defaultDimensions: [1.0, 1.78, 0.9],
    defaultColor: '#f1f5f9',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_harvest_gold_refrigerator',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'refrigerator', 'fridge', 'kitchen', 'appliance'],
    description: 'Post-1990 energy-efficient textured white enamel top-freezer refrigerator with recessed molded door handles replacing outdated vintage 70s harvest gold models.',
    compositeParts: [
      { id: 'cabinet', shape: 'box', offset: [0, 0, 0], size: [1.0, 1.78, 0.88], color: '#f1f5f9', roughness: 0.35, metalness: 0.2 },
      { id: 'freezer_door', shape: 'box', offset: [0, 0.55, 0.46], size: [0.96, 0.58, 0.04], color: '#f1f5f9', roughness: 0.3, metalness: 0.25 },
      { id: 'fridge_door', shape: 'box', offset: [0, -0.28, 0.46], size: [0.96, 1.15, 0.04], color: '#f1f5f9', roughness: 0.3, metalness: 0.25 },
      { id: 'handle_pocket', shape: 'box', offset: [-0.42, 0, 0.48], size: [0.06, 0.8, 0.03], color: '#e2e8f0', roughness: 0.4, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_minibar_fridge_90s',
    name: '1990s Dometic Silent Undercounter Minibar',
    category: 'appliance',
    defaultDimensions: [0.65, 0.82, 0.65],
    defaultColor: '#3e2723',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_harvest_gold_refrigerator',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'minibar', 'fridge', 'hospitality', 'appliance'],
    description: 'Silent absorption hotel guestroom minibar refrigerator featuring a dark walnut woodgrain door panel, brass key cylinder lock, and interior drink shelving.',
    compositeParts: [
      { id: 'chassis', shape: 'box', offset: [0, 0, 0], size: [0.65, 0.82, 0.62], color: '#18181b', roughness: 0.5, metalness: 0.3 },
      { id: 'woodgrain_door', shape: 'box', offset: [0, 0, 0.32], size: [0.62, 0.78, 0.03], color: '#4a2c17', roughness: 0.4, metalness: 0.1 },
      { id: 'brass_key_lock', shape: 'cylinder', offset: [0.26, 0.32, 0.34], size: [0.015, 0.02, 0.015], color: '#c5a059', roughness: 0.25, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_microwave_digital_90s',
    name: '1990s Compact Digital Touchpad Microwave',
    category: 'appliance',
    defaultDimensions: [0.62, 0.38, 0.45],
    defaultColor: '#f1f5f9',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_toaster_pristine',
    soundPresetId: 'sfx_radio_static',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'microwave', 'kitchenette', 'appliance'],
    description: 'Compact white countertop microwave oven with green digital LED timer clock, flat membrane touch control pad, and tinted dark glass view door.',
    compositeParts: [
      { id: 'housing', shape: 'box', offset: [0, 0, 0], size: [0.62, 0.38, 0.44], color: '#f1f5f9', roughness: 0.35, metalness: 0.25 },
      { id: 'window', shape: 'box', offset: [-0.1, 0, 0.23], size: [0.38, 0.28, 0.02], color: '#18181b', roughness: 0.1, metalness: 0.8 },
      { id: 'membrane_keypad', shape: 'box', offset: [0.2, -0.02, 0.23], size: [0.16, 0.24, 0.01], color: '#334155', roughness: 0.5, metalness: 0.2 },
      { id: 'digital_clock', shape: 'box', offset: [0.2, 0.12, 0.23], size: [0.12, 0.04, 0.01], color: '#059669', roughness: 0.2, metalness: 0.1, emissive: '#10b981' }
    ]
  },
  {
    subType: 'apt_counter_laminate_bullnose_90s',
    name: '1990s Postformed Bullnose Granite-Laminate Counter & Sink',
    category: 'furniture',
    defaultDimensions: [2.4, 0.95, 0.8],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_formica_countertop_wood_trim',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'counter', 'kitchenette', 'sink', 'furniture'],
    description: 'Modern hotel kitchenette counter with seamless postformed bullnose laminate in speckled gray faux-granite, drop-in stainless steel basin, and single-lever chrome ball faucet.',
    compositeParts: [
      { id: 'lower_cabinet', shape: 'box', offset: [0, -0.04, 0], size: [2.35, 0.88, 0.75], color: '#ece8df', roughness: 0.45, metalness: 0.1 },
      { id: 'granite_laminate_top', shape: 'box', offset: [0, 0.44, 0], size: [2.4, 0.08, 0.8], color: '#64748b', roughness: 0.35, metalness: 0.25 },
      { id: 'ss_basin', shape: 'box', offset: [0.45, 0.38, 0], size: [0.65, 0.22, 0.55], color: '#cbd5e1', roughness: 0.25, metalness: 0.85 },
      { id: 'chrome_lever_faucet', shape: 'cylinder', offset: [0.45, 0.55, -0.22], size: [0.03, 0.22, 0.03], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 }
    ]
  },
  {
    subType: 'apt_faucet_single_lever_90s',
    name: '1990s Single-Lever Chrome Ball Mixer Faucet',
    category: 'furniture',
    defaultDimensions: [0.25, 0.32, 0.28],
    defaultColor: '#e2e8f0',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'faucet', 'plumbing', 'bathroom', 'kitchen'],
    description: 'Polished chrome single-lever commercial ball mixer faucet with swivel aerator spout, standard in early 90s hotel renovations.',
    compositeParts: [
      { id: 'body', shape: 'cylinder', offset: [0, 0, 0], size: [0.04, 0.18, 0.04], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 },
      { id: 'spout', shape: 'cylinder', offset: [0, 0.12, 0.08], size: [0.02, 0.16, 0.02], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 },
      { id: 'lever', shape: 'box', offset: [0, 0.15, -0.04], size: [0.04, 0.02, 0.12], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 }
    ]
  },
  {
    subType: 'apt_hospitality_coffee_tray_90s',
    name: '1990s In-Room Hospitality Coffee Station & Condiment Tray',
    category: 'furniture',
    defaultDimensions: [0.55, 0.35, 0.42],
    defaultColor: '#18181b',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_dish_rack_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coffee_maker', 'hospitality', 'tray', 'clue_prop'],
    description: 'Commercial 4-cup drip coffee brewer set on a black plastic organizer tray alongside wrapped foam cups, sugar caddy, and non-dairy creamer packets.',
    compositeParts: [
      { id: 'plastic_tray', shape: 'box', offset: [0, -0.15, 0], size: [0.55, 0.04, 0.42], color: '#18181b', roughness: 0.6, metalness: 0.2 },
      { id: 'brewer_housing', shape: 'box', offset: [-0.12, 0.05, 0], size: [0.22, 0.32, 0.22], color: '#27272a', roughness: 0.4, metalness: 0.3 },
      { id: 'glass_pot', shape: 'cylinder', offset: [-0.12, -0.02, 0.04], size: [0.08, 0.16, 0.08], color: '#94a3b8', roughness: 0.1, metalness: 0.8 },
      { id: 'cup_stack', shape: 'cylinder', offset: [0.15, 0, 0.05], size: [0.05, 0.18, 0.05], color: '#ffffff', roughness: 0.85, metalness: 0.05 }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. BATHROOM SUITE MODERNIZATION (1992-1995)
  // --------------------------------------------------------------------------
  {
    subType: 'apt_vanity_cultured_marble_90s',
    name: '1990s Cultured Marble Vanity Sink & Laminate Base',
    category: 'furniture',
    defaultDimensions: [1.25, 0.95, 0.65],
    defaultColor: '#f1f5f9',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'marble_vanity_sink',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'vanity', 'sink', 'bathroom', 'furniture'],
    description: 'One-piece molded cultured marble vanity top with seamless oval basin, 4-inch integrated backsplash, single-lever chrome faucet, and whitewashed laminate 2-door cabinet.',
    compositeParts: [
      { id: 'cabinet_base', shape: 'box', offset: [0, -0.05, 0], size: [1.2, 0.88, 0.62], color: '#ece8df', roughness: 0.45, metalness: 0.1 },
      { id: 'cultured_marble_top', shape: 'box', offset: [0, 0.44, 0], size: [1.25, 0.07, 0.65], color: '#f1f5f9', roughness: 0.2, metalness: 0.3 },
      { id: 'oval_sink_basin', shape: 'sphere', offset: [0, 0.36, 0.05], size: [0.28, 0.18, 0.22], color: '#ffffff', roughness: 0.15, metalness: 0.1 },
      { id: 'chrome_mixer', shape: 'cylinder', offset: [0, 0.52, -0.16], size: [0.03, 0.18, 0.03], color: '#e2e8f0', roughness: 0.1, metalness: 0.95 }
    ]
  },
  {
    subType: 'apt_bath_chrome_strip_light_90s',
    name: '1990s Six-Bulb Hollywood Vanity Chrome Strip Light',
    category: 'lighting',
    defaultDimensions: [1.15, 0.18, 0.15],
    defaultColor: '#e2e8f0',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_hallway_globe_fixture',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'vanity_light', 'hollywood_light', 'lighting', 'bathroom'],
    description: 'Theatrical six-globe Hollywood strip vanity fixture in polished mirror-finish chrome with translucent spherical globe bulbs, mounted directly above the bathroom mirror.',
    compositeParts: [
      { id: 'chrome_backplate', shape: 'box', offset: [0, 0, 0], size: [1.15, 0.12, 0.04], color: '#e2e8f0', roughness: 0.1, metalness: 0.95 },
      { id: 'globe_lamp_1', shape: 'sphere', offset: [-0.45, 0, 0.06], size: [0.05, 0.05, 0.05], color: '#ffffff', roughness: 0.1, metalness: 0.1, emissive: '#fffbeb' },
      { id: 'globe_lamp_2', shape: 'sphere', offset: [-0.18, 0, 0.06], size: [0.05, 0.05, 0.05], color: '#ffffff', roughness: 0.1, metalness: 0.1, emissive: '#fffbeb' },
      { id: 'globe_lamp_3', shape: 'sphere', offset: [0.18, 0, 0.06], size: [0.05, 0.05, 0.05], color: '#ffffff', roughness: 0.1, metalness: 0.1, emissive: '#fffbeb' },
      { id: 'globe_lamp_4', shape: 'sphere', offset: [0.45, 0, 0.06], size: [0.05, 0.05, 0.05], color: '#ffffff', roughness: 0.1, metalness: 0.1, emissive: '#fffbeb' }
    ]
  },
  {
    subType: 'apt_bath_acrylic_tub_enclosure_90s',
    name: '1990s Molded White Acrylic Tub & Shower Enclosure',
    category: 'furniture',
    defaultDimensions: [1.65, 2.1, 0.85],
    defaultColor: '#ffffff',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'porcelain_bathtub',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'bathtub', 'shower', 'bathroom', 'furniture'],
    description: 'One-piece molded high-gloss white acrylic alcove bathtub with seamless surrounding wall panels, integrated shampoo shelves, and curved shower curtain bar.',
    compositeParts: [
      { id: 'tub_base', shape: 'box', offset: [0, -0.75, 0], size: [1.65, 0.55, 0.85], color: '#ffffff', roughness: 0.2, metalness: 0.1 },
      { id: 'acrylic_walls', shape: 'box', offset: [0, 0.3, -0.4], size: [1.65, 1.55, 0.06], color: '#f8fafc', roughness: 0.25, metalness: 0.1 },
      { id: 'chrome_curtain_rod', shape: 'cylinder', offset: [0, 0.95, 0.38], size: [0.02, 1.65, 0.02], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 },
      { id: 'chrome_showerhead', shape: 'cylinder', offset: [-0.65, 0.75, -0.2], size: [0.04, 0.12, 0.04], color: '#cbd5e1', roughness: 0.2, metalness: 0.9 }
    ]
  },
  {
    subType: 'apt_wall_hair_dryer_90s',
    name: '1990s Wall-Mounted Commercial Bathroom Hair Dryer',
    category: 'appliance',
    defaultDimensions: [0.25, 0.45, 0.2],
    defaultColor: '#ffffff',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_toaster_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hair_dryer', 'amenity', 'bathroom', 'appliance'],
    description: 'Commercial 1200W wall-mounted white ABS hotel hair dryer cradle with flexible black coiled cord, nightlight base, and automatic magnetic shutoff.',
    compositeParts: [
      { id: 'wall_cradle', shape: 'box', offset: [0, 0, 0], size: [0.22, 0.35, 0.12], color: '#f8fafc', roughness: 0.4, metalness: 0.1 },
      { id: 'dryer_gun', shape: 'cylinder', offset: [0, 0.04, 0.08], size: [0.05, 0.22, 0.05], color: '#ffffff', roughness: 0.3, metalness: 0.15 },
      { id: 'coiled_hose', shape: 'torus', offset: [0, -0.15, 0.06], size: [0.06, 0.02, 0.06], color: '#18181b', roughness: 0.8, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_toilet_white_90s',
    name: '1990s Water-Saving White Porcelain Toilet',
    category: 'furniture',
    defaultDimensions: [0.55, 0.85, 0.72],
    defaultColor: '#ffffff',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'suite_porcelain_toilet',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'toilet', 'bathroom', 'furniture'],
    description: 'Close-coupled white vitreous china 1.6 GPF water-saving hotel toilet with smooth contoured bowl and chrome side trip lever.',
    compositeParts: [
      { id: 'bowl_base', shape: 'cylinder', offset: [0, -0.2, 0.08], size: [0.22, 0.42, 0.26], color: '#ffffff', roughness: 0.2, metalness: 0.1 },
      { id: 'water_tank', shape: 'box', offset: [0, 0.2, -0.22], size: [0.52, 0.42, 0.24], color: '#ffffff', roughness: 0.2, metalness: 0.1 },
      { id: 'chrome_trip_lever', shape: 'cylinder', offset: [-0.28, 0.32, -0.18], size: [0.015, 0.06, 0.015], color: '#e2e8f0', roughness: 0.1, metalness: 0.95 }
    ]
  },
  {
    subType: 'apt_hotel_towel_rack_chrome_90s',
    name: '1990s Chrome Hotel Towel Train Rack & Fresh Linens',
    category: 'furniture',
    defaultDimensions: [0.75, 0.35, 0.38],
    defaultColor: '#e2e8f0',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'brass_towel_rack',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'towel_rack', 'towels', 'bathroom', 'furniture'],
    description: 'Commercial chrome tubular hotel train rack shelf loaded with freshly laundered white folded terry bath sheets and hand towels.',
    compositeParts: [
      { id: 'tubular_frame', shape: 'box', offset: [0, 0, 0], size: [0.75, 0.32, 0.38], color: '#e2e8f0', roughness: 0.15, metalness: 0.95 },
      { id: 'folded_towels', shape: 'box', offset: [0, 0.08, 0], size: [0.65, 0.16, 0.32], color: '#ffffff', roughness: 0.85, metalness: 0.05 }
    ]
  },

  // --------------------------------------------------------------------------
  // 6. FLOORING & HALLWAY AMENITIES
  // --------------------------------------------------------------------------
  {
    subType: 'apt_flooring_hotel_teal_carpet_90s',
    name: '1990s Commercial Teal & Burgundy Hotel Carpet',
    category: 'floor_tile',
    defaultDimensions: [3.2, 0.04, 3.2],
    defaultColor: '#0f4c5c',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_area_rug_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'carpet', 'flooring', 'floor_tile'],
    description: 'Dense commercial contract low-pile carpet tiles featuring the signature 1990s hospitality dark teal lattice pattern with burgundy floral accents.'
  },
  {
    subType: 'apt_flooring_white_tile_90s',
    name: '1990s Glazed White Ceramic Floor Tile',
    category: 'floor_tile',
    defaultDimensions: [3.0, 0.03, 3.0],
    defaultColor: '#f1f5f9',
    defaultTexture: 'checker_marble',
    collidable: false,
    era: '1990s',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'tile', 'flooring', 'ceramic', 'floor_tile'],
    description: '8x8-inch glazed white vitreous ceramic floor tiles with gray stain-resistant epoxy grout, standard in renovated 1990s hotel baths and kitchenettes.'
  },
  {
    subType: 'apt_hotel_ice_machine_90s',
    name: '1990s Manitowoc Commercial Hotel Ice Dispenser',
    category: 'appliance',
    defaultDimensions: [0.85, 1.85, 0.85],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_coin_op_washer_dryer',
    soundPresetId: 'sfx_radio_static',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'ice_machine', 'amenity', 'corridor', 'appliance', 'audio-linked'],
    description: 'Stainless steel commercial guest ice dispenser with blue push-chute mechanism, drip drain tray, and humming compressor unit.',
    compositeParts: [
      { id: 'cabinet', shape: 'box', offset: [0, 0, 0], size: [0.85, 1.85, 0.82], color: '#64748b', roughness: 0.4, metalness: 0.7 },
      { id: 'dispense_niche', shape: 'box', offset: [0, 0.15, 0.3], size: [0.55, 0.45, 0.2], color: '#1e293b', roughness: 0.6, metalness: 0.3 },
      { id: 'push_paddle', shape: 'box', offset: [0, 0.22, 0.32], size: [0.2, 0.15, 0.08], color: '#38bdf8', roughness: 0.3, metalness: 0.5 },
      { id: 'drain_grille', shape: 'box', offset: [0, -0.06, 0.32], size: [0.55, 0.05, 0.2], color: '#cbd5e1', roughness: 0.3, metalness: 0.9 }
    ]
  },

  // --------------------------------------------------------------------------
  // 7. 1992-1995 HOTEL RENOVATED ELEVATOR CAB ASSETS (Stainless Steel & Laminate)
  // --------------------------------------------------------------------------
  {
    subType: 'apt_elevator_cab_sliding_doors_90s',
    name: '1990s Commercial Elevator Telescoping Sliding Doors',
    category: 'door',
    defaultDimensions: [2.2, 2.5, 0.12],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    isSecretPassage: false,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_cab_sliding_doors',
    animationSpec: '500ms smooth lateral pocket slide with motorized track hum',
    soundPresetId: 'sfx_door_latch',
    tags: ['elevator', 'cab', 'sliding_doors', 'door', 'stainless_steel', 'pocket_slide', 'hinged', 'interactive', '1990s', 'hotel-updated'],
    description: '1990s commercial Dover-style brushed stainless steel elevator cab sliding doors with full-height infrared light curtain safety edge.',
    compositeParts: [
      { id: 'track_header', shape: 'box', offset: [0, 1.25, 0], size: [2.2, 0.12, 0.12], color: '#334155', roughness: 0.4, metalness: 0.8 },
      { id: 'door_left', shape: 'box', offset: [-0.52, 0, 0.02], size: [1.08, 2.38, 0.04], color: '#64748b', roughness: 0.25, metalness: 0.9 },
      { id: 'door_right', shape: 'box', offset: [0.52, 0, -0.02], size: [1.08, 2.38, 0.04], color: '#64748b', roughness: 0.25, metalness: 0.9 },
      { id: 'safety_sensor', shape: 'box', offset: [0, 0, 0.03], size: [0.03, 2.38, 0.04], color: '#0f172a', roughness: 0.8, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_elevator_cab_wall_solid_90s',
    name: '1990s Elevator Cab Stainless & Laminate Wall (7m)',
    category: 'wall',
    defaultDimensions: [7.0, 2.8, 0.35],
    defaultColor: '#475569',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_cab_wall_solid',
    tags: ['elevator', 'cab', 'wall', 'box_wall', 'stainless', '1990s', 'hotel-updated'],
    description: 'Renovated 7-meter commercial hotel elevator cab wall finished in brushed stainless steel panels, bleached oak accents, and tubular stainless handrail.',
    compositeParts: [
      { id: 'wall_slab', shape: 'box', offset: [0, 0, 0], size: [7.0, 2.8, 0.15], color: '#475569', roughness: 0.4, metalness: 0.6 },
      { id: 'stainless_handrail', shape: 'cylinder', offset: [0, -0.4, 0.12], size: [0.04, 6.8, 0.04], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', roughness: 0.2, metalness: 0.95 },
      { id: 'rail_bracket_l', shape: 'box', offset: [-2.4, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#94a3b8', roughness: 0.3, metalness: 0.9 },
      { id: 'rail_bracket_c', shape: 'box', offset: [0, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#94a3b8', roughness: 0.3, metalness: 0.9 },
      { id: 'rail_bracket_r', shape: 'box', offset: [2.4, -0.4, 0.06], size: [0.06, 0.06, 0.12], color: '#94a3b8', roughness: 0.3, metalness: 0.9 },
      { id: 'diamond_kickplate', shape: 'box', offset: [0, -1.25, 0.02], size: [7.0, 0.28, 0.04], color: '#64748b', roughness: 0.35, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_elevator_cab_portal_wall_90s',
    name: '1990s Elevator Cab Sliding Door Portal Wall (7m)',
    category: 'wall',
    defaultDimensions: [7.0, 2.8, 0.35],
    defaultColor: '#475569',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_cab_portal_wall',
    tags: ['elevator', 'cab', 'wall', 'portal_wall', 'door_frame', '1990s', 'hotel-updated'],
    description: 'Renovated 7-meter front elevator cab wall with 2.2m central portal for sliding doors, stainless steel threshold sill, and digital 7-segment floor lantern.',
    compositeParts: [
      { id: 'jamb_left', shape: 'box', offset: [-2.35, 0, 0], size: [2.3, 2.8, 0.15], color: '#475569', roughness: 0.4, metalness: 0.6 },
      { id: 'jamb_right', shape: 'box', offset: [2.35, 0, 0], size: [2.3, 2.8, 0.15], color: '#475569', roughness: 0.4, metalness: 0.6 },
      { id: 'transom_header', shape: 'box', offset: [0, 1.25, 0], size: [7.0, 0.3, 0.18], color: '#334155', roughness: 0.35, metalness: 0.7 },
      { id: 'threshold_sill', shape: 'box', offset: [0, -1.36, 0.05], size: [2.4, 0.06, 0.22], color: '#94a3b8', roughness: 0.25, metalness: 0.9 },
      { id: 'digital_lantern', shape: 'box', offset: [0, 1.25, 0.1], size: [0.55, 0.18, 0.06], color: '#0f172a', roughness: 0.2, metalness: 0.4 }
    ]
  },
  {
    subType: 'apt_elevator_ceiling_access_panel_90s',
    name: '1990s Commercial Elevator Ceiling with Access Hatch (7x7)',
    category: 'floor_tile',
    defaultDimensions: [7.0, 0.25, 7.0],
    defaultColor: '#334155',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_ceiling_access_panel',
    tags: ['elevator', 'cab', 'ceiling', 'access_panel', 'emergency_hatch', '1990s', 'hotel-updated'],
    description: '1990s modular commercial elevator ceiling featuring a flush 0.9m emergency escape hatch, halogen downlights, and commercial smoke sensor.',
    compositeParts: [
      { id: 'ceiling_grid', shape: 'box', offset: [0, 0, 0], size: [7.0, 0.12, 7.0], color: '#334155', roughness: 0.7, metalness: 0.3 },
      { id: 'hatch_frame', shape: 'box', offset: [0, 0.01, 0], size: [1.15, 0.08, 1.15], color: '#64748b', roughness: 0.3, metalness: 0.8 },
      { id: 'hatch_door', shape: 'box', offset: [0, 0.02, 0], size: [0.94, 0.06, 0.94], color: '#475569', roughness: 0.35, metalness: 0.75 },
      { id: 'hatch_lock', shape: 'box', offset: [0, -0.03, 0.35], size: [0.12, 0.03, 0.08], color: '#94a3b8', roughness: 0.2, metalness: 0.9 },
      { id: 'downlight_1', shape: 'cylinder', offset: [-2.0, -0.04, -2.0], size: [0.25, 0.02, 0.25], color: '#f1f5f9', roughness: 0.1, metalness: 0.5 },
      { id: 'downlight_2', shape: 'cylinder', offset: [2.0, -0.04, -2.0], size: [0.25, 0.02, 0.25], color: '#f1f5f9', roughness: 0.1, metalness: 0.5 },
      { id: 'downlight_3', shape: 'cylinder', offset: [-2.0, -0.04, 2.0], size: [0.25, 0.02, 0.25], color: '#f1f5f9', roughness: 0.1, metalness: 0.5 },
      { id: 'downlight_4', shape: 'cylinder', offset: [2.0, -0.04, 2.0], size: [0.25, 0.02, 0.25], color: '#f1f5f9', roughness: 0.1, metalness: 0.5 }
    ]
  },
  {
    subType: 'apt_elevator_emergency_phone_90s',
    name: '1990s ADA Hands-Free Elevator Emergency Phone',
    category: 'appliance',
    defaultDimensions: [0.45, 0.65, 0.12],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_emergency_phone',
    soundPresetId: 'sfx_telephone_ring',
    tags: ['elevator', 'emergency_phone', 'ada', 'handsfree', '1990s', 'hotel-updated'],
    description: 'ADA-compliant 1990s flush-mount brushed stainless steel emergency elevator phone with push-to-call button, speaker grille, and braille signage.',
    compositeParts: [
      { id: 'faceplate', shape: 'box', offset: [0, 0, 0], size: [0.45, 0.65, 0.04], color: '#64748b', roughness: 0.25, metalness: 0.9 },
      { id: 'push_call_btn', shape: 'cylinder', offset: [0, -0.12, 0.025], size: [0.05, 0.02, 0.05], color: '#991b1b', roughness: 0.3, metalness: 0.6 },
      { id: 'speaker_grille', shape: 'box', offset: [0, 0.14, 0.022], size: [0.28, 0.18, 0.01], color: '#1e293b', roughness: 0.8, metalness: 0.3 },
      { id: 'call_indicator_led', shape: 'cylinder', offset: [0, -0.02, 0.025], size: [0.015, 0.01, 0.015], color: '#10b981', roughness: 0.2, metalness: 0.5 },
      { id: 'braille_plate', shape: 'box', offset: [0, -0.22, 0.022], size: [0.32, 0.08, 0.008], color: '#334155', roughness: 0.4, metalness: 0.7 }
    ]
  },
  {
    subType: 'apt_elevator_button_panel_cop_90s',
    name: '1990s Dover/Schindler Elevator Car Operating Panel (COP)',
    category: 'appliance',
    defaultDimensions: [0.42, 1.6, 0.12],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_button_panel_cop',
    soundPresetId: 'sfx_bell_ring',
    tags: ['elevator', 'button_panel', 'cop', 'controls', 'interactive', '1990s', 'hotel-updated'],
    description: '1990s commercial brushed stainless steel Car Operating Panel (COP) with green LED halo floor buttons, digital 7-segment floor display, and emergency door controls.',
    compositeParts: [
      { id: 'stainless_plate', shape: 'box', offset: [0, 0, 0], size: [0.42, 1.6, 0.04], color: '#64748b', roughness: 0.25, metalness: 0.9 },
      { id: 'digital_display', shape: 'box', offset: [0, 0.62, 0.025], size: [0.32, 0.18, 0.02], color: '#0f172a', roughness: 0.2, metalness: 0.4 },
      { id: 'buttons_left_col', shape: 'cylinder', offset: [-0.08, 0.12, 0.025], size: [0.03, 0.015, 0.03], color: '#94a3b8', roughness: 0.2, metalness: 0.8 },
      { id: 'buttons_right_col', shape: 'cylinder', offset: [0.08, 0.12, 0.025], size: [0.03, 0.015, 0.03], color: '#94a3b8', roughness: 0.2, metalness: 0.8 },
      { id: 'door_open_btn', shape: 'cylinder', offset: [-0.08, -0.32, 0.025], size: [0.03, 0.015, 0.03], color: '#10b981', roughness: 0.2, metalness: 0.8 },
      { id: 'door_close_btn', shape: 'cylinder', offset: [0.08, -0.32, 0.025], size: [0.03, 0.015, 0.03], color: '#f59e0b', roughness: 0.2, metalness: 0.8 },
      { id: 'alarm_btn', shape: 'cylinder', offset: [0, -0.44, 0.025], size: [0.035, 0.015, 0.035], color: '#991b1b', roughness: 0.3, metalness: 0.5 }
    ]
  },
  {
    subType: 'apt_elevator_floor_tile_7x7_90s',
    name: '1990s Commercial Hotel Elevator Carpet (7x7)',
    category: 'floor_tile',
    defaultDimensions: [7.0, 0.15, 7.0],
    defaultColor: '#143d2b',
    defaultTexture: 'velvet_crimson',
    collidable: true,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_floor_tile_7x7',
    tags: ['elevator', 'cab', 'floor', 'carpet', '1990s', 'hotel-updated'],
    description: '7x7 tile wide commercial hotel elevator cab floor covered in heavy-traffic hunter-green low-pile carpet with stainless steel nosing.',
    compositeParts: [
      { id: 'subfloor', shape: 'box', offset: [0, 0, 0], size: [7.0, 0.12, 7.0], color: '#334155', roughness: 0.8, metalness: 0.2 },
      { id: 'carpet_finish', shape: 'box', offset: [0, 0.065, 0], size: [6.9, 0.03, 6.9], color: '#143d2b', roughness: 0.9, metalness: 0.05 },
      { id: 'stainless_nosing', shape: 'box', offset: [0, 0.07, 3.48], size: [7.0, 0.04, 0.06], color: '#94a3b8', roughness: 0.2, metalness: 0.9 }
    ]
  }
];

/**
 * ============================================================================
 * 1992-1995 HOTEL ROOM ASSET SETS (.assetset.json)
 * Prefixed with `set_apt_updated_*` as explicitly requested by user brief.
 * Pre-composed multi-item rooms representing the full 1992-1995 hotel renovation.
 * ============================================================================
 */
export const APARTMENT_UPDATED_HOTEL_ASSET_SETS: AssetSet[] = [
  {
    id: 'set_apt_updated_elevator_cab_90s',
    name: '1990s Commercial Hotel Elevator Cab Set (7x7)',
    description: 'Modernized 1990s Dover-style 7x7 tile hotel elevator cab with brushed stainless steel walls, ADA hands-free emergency speakerphone, digital COP button panel, and telescoping sliding doors.',
    createdAt: '2026-11-01T14:15:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'elevator', 'cab', '7x7', 'sliding_doors', 'emergency_phone', 'button_panel', 'access_panel', 'set'],
    boundingSize: [7.0, 7.0],
    items: [
      {
        name: '1990s Commercial Hotel Elevator Carpet (7x7)',
        category: 'floor_tile',
        subType: 'apt_elevator_floor_tile_7x7_90s',
        relPosition: [0, 0.075, 0],
        dimensions: [7.0, 0.15, 7.0],
        rotationY: 0,
        color: '#143d2b',
        textureId: 'velvet_crimson',
        collidable: true,
        tags: ['elevator', 'floor', '7x7', '1990s']
      },
      {
        name: '1990s Elevator Cab Stainless & Laminate Wall (Back)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid_90s',
        relPosition: [0, 1.4, -3.35],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: 0,
        color: '#475569',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall', '1990s']
      },
      {
        name: '1990s Elevator Cab Stainless & Laminate Wall (Left)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid_90s',
        relPosition: [-3.35, 1.4, 0],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: Math.PI / 2,
        color: '#475569',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall', '1990s']
      },
      {
        name: '1990s Elevator Cab Stainless & Laminate Wall (Right)',
        category: 'wall',
        subType: 'apt_elevator_cab_wall_solid_90s',
        relPosition: [3.35, 1.4, 0],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: -Math.PI / 2,
        color: '#475569',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'wall', 'box_wall', '1990s']
      },
      {
        name: '1990s Elevator Cab Sliding Door Portal Wall (Front)',
        category: 'wall',
        subType: 'apt_elevator_cab_portal_wall_90s',
        relPosition: [0, 1.4, 3.35],
        dimensions: [7.0, 2.8, 0.35],
        rotationY: 0,
        color: '#475569',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'wall', 'portal_wall', '1990s']
      },
      {
        name: '1990s Commercial Elevator Telescoping Sliding Doors',
        category: 'door',
        subType: 'apt_elevator_cab_sliding_doors_90s',
        relPosition: [0, 1.25, 3.35],
        dimensions: [2.2, 2.5, 0.12],
        rotationY: 0,
        color: '#64748b',
        textureId: 'industrial_concrete',
        collidable: true,
        isSecretPassage: false,
        soundPresetId: 'sfx_door_latch',
        tags: ['elevator', 'sliding_doors', 'door', 'pocket_slide', '1990s']
      },
      {
        name: '1990s Commercial Elevator Ceiling with Access Hatch (7x7)',
        category: 'floor_tile',
        subType: 'apt_elevator_ceiling_access_panel_90s',
        relPosition: [0, 2.7, 0],
        dimensions: [7.0, 0.25, 7.0],
        rotationY: 0,
        color: '#334155',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['elevator', 'ceiling', 'access_panel', 'emergency_hatch', '1990s']
      },
      {
        name: '1990s Dover/Schindler Elevator Car Operating Panel (COP)',
        category: 'appliance',
        subType: 'apt_elevator_button_panel_cop_90s',
        relPosition: [1.6, 1.35, 3.15],
        dimensions: [0.42, 1.6, 0.12],
        rotationY: Math.PI,
        color: '#64748b',
        textureId: 'industrial_concrete',
        collidable: true,
        soundPresetId: 'sfx_bell_ring',
        tags: ['elevator', 'button_panel', 'cop', 'controls', '1990s']
      },
      {
        name: '1990s ADA Hands-Free Elevator Emergency Phone',
        category: 'appliance',
        subType: 'apt_elevator_emergency_phone_90s',
        relPosition: [3.15, 1.35, 0],
        dimensions: [0.45, 0.65, 0.12],
        rotationY: -Math.PI / 2,
        color: '#64748b',
        textureId: 'industrial_concrete',
        collidable: true,
        soundPresetId: 'sfx_telephone_ring',
        tags: ['elevator', 'emergency_phone', 'ada', 'handsfree', '1990s']
      }
    ]
  },
  {
    id: 'set_apt_updated_guest_room_90s',
    name: '1990s Renovated Hotel Guest Room Suite',
    description: 'Complete 1992-1995 hotel guestroom suite with bleached oak queen bed, whitewashed armoire with 27" black CRT TV, laminate nightstand with touchtone phone & digital clock radio, and under-window PTAC unit.',
    createdAt: '2026-11-01T12:00:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'guest_room', 'bedroom', 'suite'],
    boundingSize: [4.2, 3.8],
    items: [
      {
        name: '1990s Bleached Oak Hotel Queen Bed',
        category: 'furniture',
        subType: 'apt_hotel_bed_queen_90s',
        relPosition: [0, 0.58, -0.6],
        dimensions: [1.85, 1.15, 2.25],
        rotationY: 0,
        color: '#0f4c5c',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['bed', 'queen_bed', '1990s']
      },
      {
        name: '1990s Bleached Laminate Hotel Nightstand',
        category: 'furniture',
        subType: 'apt_hotel_nightstand_90s',
        relPosition: [-1.35, 0.32, -1.3],
        dimensions: [0.65, 0.65, 0.55],
        rotationY: 0,
        color: '#ece8df',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['nightstand', '1990s']
      },
      {
        name: '1990s Commercial Touchtone Hotel Desk Phone',
        category: 'appliance',
        subType: 'apt_phone_touchtone_90s',
        relPosition: [-1.35, 0.72, -1.3],
        dimensions: [0.35, 0.22, 0.35],
        rotationY: 0,
        color: '#e2e8f0',
        textureId: 'plaster_cream',
        collidable: false,
        soundPresetId: 'sfx_telephone_ring',
        tags: ['phone', 'touchtone', '1990s']
      },
      {
        name: '1990s Digital LED AM/FM Alarm Clock Radio',
        category: 'appliance',
        subType: 'apt_bed_digital_clock_radio_90s',
        relPosition: [-1.35, 0.72, -1.05],
        dimensions: [0.32, 0.14, 0.22],
        rotationY: 0,
        color: '#18181b',
        textureId: 'plaster_cream',
        collidable: false,
        soundPresetId: 'sfx_telephone_ring',
        tags: ['clock', '1990s']
      },
      {
        name: '1990s Whitewashed Laminate TV Armoire',
        category: 'furniture',
        subType: 'apt_hotel_tv_armoire_90s',
        relPosition: [0, 0.98, 1.4],
        dimensions: [1.35, 1.95, 0.75],
        rotationY: Math.PI,
        color: '#ece8df',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['armoire', 'storage', '1990s']
      },
      {
        name: '1990s Trinitron Black 27-inch CRT Television',
        category: 'appliance',
        subType: 'apt_tv_crt_90s_black',
        relPosition: [0, 1.35, 1.35],
        dimensions: [0.95, 0.72, 0.65],
        rotationY: Math.PI,
        color: '#18181b',
        textureId: 'plaster_cream',
        collidable: true,
        soundPresetId: 'sfx_radio_static',
        tags: ['tv', 'crt', '1990s']
      },
      {
        name: '1990s Under-Window PTAC Hotel Climate Unit',
        category: 'appliance',
        subType: 'apt_ptac_ac_unit_90s',
        relPosition: [1.5, 0.32, 0.2],
        dimensions: [1.4, 0.65, 0.45],
        rotationY: -Math.PI / 2,
        color: '#e5e7eb',
        textureId: 'industrial_concrete',
        collidable: true,
        soundPresetId: 'sfx_steam_pipe',
        tags: ['ptac', 'ac_unit', '1990s']
      },
      {
        name: '1990s Black Tubular Halogen Torchiere Lamp',
        category: 'lighting',
        subType: 'apt_halogen_torchiere_lamp_90s',
        relPosition: [1.4, 0.92, -1.3],
        dimensions: [0.45, 1.85, 0.45],
        rotationY: 0,
        color: '#18181b',
        textureId: 'aged_brass',
        collidable: true,
        tags: ['lamp', 'torchiere', '1990s']
      }
    ]
  },
  {
    id: 'set_apt_updated_suite_living_90s',
    name: '1990s Executive Parlor & Media Lounge Suite',
    description: 'Refined 1992-1995 hotel parlor suite with teal & mauve commercial sofa, glass & steel coffee table, barrel club armchair, executive desk with task chair, and black CRT TV.',
    createdAt: '2026-11-01T12:15:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'living_room', 'parlor', 'suite'],
    boundingSize: [4.4, 3.6],
    items: [
      {
        name: '1990s Teal & Mauve Commercial Hotel Sofa',
        category: 'furniture',
        subType: 'apt_hotel_sofa_90s',
        relPosition: [0, 0.44, -1.0],
        dimensions: [2.2, 0.88, 0.95],
        rotationY: 0,
        color: '#1b4332',
        textureId: 'wallpaper_damask',
        collidable: true,
        tags: ['sofa', '1990s']
      },
      {
        name: '1990s Glass & Tubular Steel Coffee Table',
        category: 'furniture',
        subType: 'apt_coffee_table_glass_steel_90s',
        relPosition: [0, 0.22, 0.1],
        dimensions: [1.35, 0.45, 0.75],
        rotationY: 0,
        color: '#18181b',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['coffee_table', '1990s']
      },
      {
        name: '1990s Barrel Club Armchair in Hunter Green',
        category: 'furniture',
        subType: 'apt_hotel_armchair_90s',
        relPosition: [-1.4, 0.41, 0.1],
        dimensions: [0.95, 0.82, 0.9],
        rotationY: Math.PI / 4,
        color: '#1b4332',
        textureId: 'wallpaper_damask',
        collidable: true,
        tags: ['armchair', '1990s']
      },
      {
        name: '1990s Executive Laminate Desk & Swivel Task Chair',
        category: 'furniture',
        subType: 'apt_hotel_desk_laminate_90s',
        relPosition: [1.2, 0.38, 0.8],
        dimensions: [1.6, 0.76, 0.85],
        rotationY: Math.PI,
        color: '#ece8df',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['desk', 'workstation', '1990s']
      },
      {
        name: '1990s Polished Brass Tulip Wall Sconce',
        category: 'lighting',
        subType: 'apt_brass_tulip_sconce_90s',
        relPosition: [-1.5, 1.8, -1.2],
        dimensions: [0.3, 0.45, 0.3],
        rotationY: 0,
        color: '#c5a059',
        textureId: 'aged_brass',
        collidable: false,
        tags: ['sconce', 'lighting', '1990s']
      },
      {
        name: '1990s Commercial Teal & Burgundy Hotel Carpet',
        category: 'floor_tile',
        subType: 'apt_flooring_hotel_teal_carpet_90s',
        relPosition: [0, 0.02, 0],
        dimensions: [3.8, 0.04, 3.2],
        rotationY: 0,
        color: '#0f4c5c',
        textureId: 'velvet_crimson',
        collidable: false,
        tags: ['carpet', '1990s']
      }
    ]
  },
  {
    id: 'set_apt_updated_kitchenette_90s',
    name: '1990s Extended-Stay Hotel Kitchenette & Hospitality Bar',
    description: 'Modernized 1990s hotel extended-stay kitchenette with bullnose faux-granite counter & sink, compact touchpad microwave, in-room coffee station, undercounter minibar, and white tile floor.',
    createdAt: '2026-11-01T12:30:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'kitchenette', 'hospitality', 'suite'],
    boundingSize: [3.6, 2.0],
    items: [
      {
        name: '1990s Postformed Bullnose Granite-Laminate Counter & Sink',
        category: 'furniture',
        subType: 'apt_counter_laminate_bullnose_90s',
        relPosition: [0, 0.48, 0],
        dimensions: [2.4, 0.95, 0.8],
        rotationY: 0,
        color: '#94a3b8',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['counter', 'sink', '1990s']
      },
      {
        name: '1990s Compact Digital Touchpad Microwave',
        category: 'appliance',
        subType: 'apt_microwave_digital_90s',
        relPosition: [-0.6, 1.15, 0],
        dimensions: [0.62, 0.38, 0.45],
        rotationY: 0,
        color: '#f8fafc',
        textureId: 'plaster_cream',
        collidable: false,
        soundPresetId: 'sfx_radio_static',
        tags: ['microwave', '1990s']
      },
      {
        name: '1990s In-Room Hospitality Coffee Station & Condiment Tray',
        category: 'furniture',
        subType: 'apt_hospitality_coffee_tray_90s',
        relPosition: [0.65, 1.12, 0],
        dimensions: [0.55, 0.35, 0.42],
        rotationY: 0,
        color: '#18181b',
        textureId: 'plaster_cream',
        collidable: false,
        tags: ['coffee_maker', '1990s']
      },
      {
        name: '1990s Dometic Silent Undercounter Minibar',
        category: 'appliance',
        subType: 'apt_minibar_fridge_90s',
        relPosition: [1.45, 0.41, 0],
        dimensions: [0.65, 0.82, 0.65],
        rotationY: 0,
        color: '#3e2723',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['minibar', 'fridge', '1990s']
      },
      {
        name: '1990s Glazed White Ceramic Floor Tile',
        category: 'floor_tile',
        subType: 'apt_flooring_white_tile_90s',
        relPosition: [0, 0.02, 0],
        dimensions: [3.4, 0.03, 1.8],
        rotationY: 0,
        color: '#f8fafc',
        textureId: 'checker_marble',
        collidable: false,
        tags: ['tile', 'flooring', '1990s']
      }
    ]
  },
  {
    id: 'set_apt_updated_bathroom_90s',
    name: '1990s Modernized Hotel Ensuite Bathroom',
    description: 'Fully renovated 1990s ensuite hotel bathroom featuring a molded acrylic tub enclosure, cultured marble vanity sink, 6-bulb Hollywood vanity strip light, wall-mount commercial hair dryer, water-saving toilet, and chrome towel rack.',
    createdAt: '2026-11-01T12:45:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'bathroom', 'ensuite', 'suite'],
    boundingSize: [3.0, 2.8],
    items: [
      {
        name: '1990s Molded White Acrylic Tub & Shower Enclosure',
        category: 'furniture',
        subType: 'apt_bath_acrylic_tub_enclosure_90s',
        relPosition: [-0.65, 1.05, -0.65],
        dimensions: [1.65, 2.1, 0.85],
        rotationY: 0,
        color: '#ffffff',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['bathtub', 'shower', '1990s']
      },
      {
        name: '1990s Cultured Marble Vanity Sink & Laminate Base',
        category: 'furniture',
        subType: 'apt_vanity_cultured_marble_90s',
        relPosition: [0.65, 0.48, -0.65],
        dimensions: [1.25, 0.95, 0.65],
        rotationY: 0,
        color: '#f8fafc',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['vanity', 'sink', '1990s']
      },
      {
        name: '1990s Six-Bulb Hollywood Vanity Chrome Strip Light',
        category: 'lighting',
        subType: 'apt_bath_chrome_strip_light_90s',
        relPosition: [0.65, 1.75, -0.9],
        dimensions: [1.15, 0.18, 0.15],
        rotationY: 0,
        color: '#e2e8f0',
        textureId: 'aged_brass',
        collidable: false,
        tags: ['lighting', 'vanity_light', '1990s']
      },
      {
        name: '1990s Wall-Mounted Commercial Bathroom Hair Dryer',
        category: 'appliance',
        subType: 'apt_wall_hair_dryer_90s',
        relPosition: [1.2, 1.35, -0.65],
        dimensions: [0.25, 0.45, 0.2],
        rotationY: -Math.PI / 2,
        color: '#ffffff',
        textureId: 'plaster_cream',
        collidable: false,
        tags: ['hair_dryer', 'amenity', '1990s']
      },
      {
        name: '1990s Water-Saving White Porcelain Toilet',
        category: 'furniture',
        subType: 'apt_toilet_white_90s',
        relPosition: [0.65, 0.42, 0.65],
        dimensions: [0.55, 0.85, 0.72],
        rotationY: Math.PI,
        color: '#ffffff',
        textureId: 'plaster_cream',
        collidable: true,
        tags: ['toilet', '1990s']
      },
      {
        name: '1990s Chrome Hotel Towel Train Rack & Fresh Linens',
        category: 'furniture',
        subType: 'apt_hotel_towel_rack_chrome_90s',
        relPosition: [0.65, 1.55, 0.95],
        dimensions: [0.75, 0.35, 0.38],
        rotationY: Math.PI,
        color: '#e2e8f0',
        textureId: 'aged_brass',
        collidable: false,
        tags: ['towel_rack', '1990s']
      }
    ]
  },
  {
    id: 'set_apt_updated_hallway_access_90s',
    name: '1990s Commercial Hotel Corridor & Secure Keycard Access Bay',
    description: 'Renovated 1990s hotel corridor access cluster with Saflok magnetic keycard door, Wheelock ADA xenon strobe fire alarm, photoluminescent LED exit sign, commercial Manitowoc ice machine, and brass tulip sconces.',
    createdAt: '2026-11-01T13:00:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hallway', 'corridor', 'access', 'suite'],
    boundingSize: [3.8, 2.2],
    items: [
      {
        name: '1990s Saflok Magnetic Keycard Hotel Door Lockset',
        category: 'door',
        subType: 'apt_door_keycard_reader_90s',
        relPosition: [0, 1.15, -0.6],
        dimensions: [1.1, 2.3, 0.25],
        rotationY: 0,
        color: '#c5a059',
        textureId: 'aged_brass',
        collidable: true,
        isSecretPassage: false,
        soundPresetId: 'sfx_door_latch',
        tags: ['door', 'keycard', '1990s']
      },
      {
        name: '1990s Wheelock ADA Xenon Strobe Fire Alarm Horn',
        category: 'appliance',
        subType: 'apt_fire_alarm_strobe_horn_90s',
        relPosition: [0.95, 1.9, -0.6],
        dimensions: [0.28, 0.35, 0.15],
        rotationY: 0,
        color: '#ffffff',
        textureId: 'plaster_cream',
        collidable: false,
        tags: ['fire_alarm', '1990s']
      },
      {
        name: '1990s Photoluminescent LED Emergency Exit Sign',
        category: 'lighting',
        subType: 'apt_hotel_exit_sign_led_90s',
        relPosition: [-0.95, 2.2, -0.6],
        dimensions: [0.65, 0.35, 0.15],
        rotationY: 0,
        color: '#ffffff',
        textureId: 'industrial_concrete',
        collidable: false,
        tags: ['exit_sign', '1990s']
      },
      {
        name: '1990s Manitowoc Commercial Hotel Ice Dispenser',
        category: 'appliance',
        subType: 'apt_hotel_ice_machine_90s',
        relPosition: [1.3, 0.92, 0.4],
        dimensions: [0.85, 1.85, 0.85],
        rotationY: -Math.PI / 2,
        color: '#94a3b8',
        textureId: 'industrial_concrete',
        collidable: true,
        soundPresetId: 'sfx_radio_static',
        tags: ['ice_machine', 'amenity', '1990s']
      },
      {
        name: '1990s Polished Brass Tulip Wall Sconce',
        category: 'lighting',
        subType: 'apt_brass_tulip_sconce_90s',
        relPosition: [-1.3, 1.8, 0.4],
        dimensions: [0.3, 0.45, 0.3],
        rotationY: Math.PI / 2,
        color: '#c5a059',
        textureId: 'aged_brass',
        collidable: false,
        tags: ['sconce', '1990s']
      }
    ]
  }
];

/**
 * Maps 1978 original/unkempt subTypes to their 1992-1995 hotel updated counterparts.
 */
export const HOTEL_1978_TO_1990S_UPDATE_MAP: Record<string, string> = {
  // Electronics & AV
  apt_lr_television_pristine: 'apt_tv_crt_90s_black',
  apt_lr_television_unkempt: 'apt_tv_crt_90s_black',
  apt_rotary_telephone_desk: 'apt_phone_touchtone_90s',
  apt_wall_rotary_telephone: 'apt_phone_touchtone_90s',
  apt_bed_alarm_clock_pristine: 'apt_bed_digital_clock_radio_90s',
  apt_bed_alarm_clock_unkempt: 'apt_bed_digital_clock_radio_90s',
  apt_front_door_intercom: 'apt_intercom_hotel_pbx_90s',
  apt_ceiling_smoke_detector: 'apt_fire_alarm_strobe_horn_90s',
  apt_illuminated_exit_sign: 'apt_hotel_exit_sign_led_90s',
  apt_coin_op_washer_dryer: 'apt_hotel_ice_machine_90s',

  // Doors & Access
  apt_interior_tenement_door: 'apt_door_keycard_reader_90s',
  apt_hallway_unit_door: 'apt_door_keycard_reader_90s',
  suite_door: 'apt_door_keycard_reader_90s',

  // Furniture & Bedding
  apt_bed_mattress_boxspring_pristine: 'apt_hotel_bed_queen_90s',
  apt_bed_mattress_boxspring_unkempt: 'apt_hotel_bed_queen_90s',
  apt_bed_dresser_pristine: 'apt_hotel_tv_armoire_90s',
  apt_bed_dresser_unkempt: 'apt_hotel_tv_armoire_90s',
  apt_bed_nightstand_pristine: 'apt_hotel_nightstand_90s',
  apt_bed_nightstand_unkempt: 'apt_hotel_nightstand_90s',
  apt_lr_sofa_pristine: 'apt_hotel_sofa_90s',
  apt_lr_sofa_unkempt: 'apt_hotel_sofa_90s',
  apt_lr_coffee_table_pristine: 'apt_coffee_table_glass_steel_90s',
  apt_lr_coffee_table_unkempt: 'apt_coffee_table_glass_steel_90s',
  apt_velvet_armchair: 'apt_hotel_armchair_90s',

  // Lighting & Curtains
  apt_lr_floor_lamp_pristine: 'apt_halogen_torchiere_lamp_90s',
  apt_lr_floor_lamp_unkempt: 'apt_halogen_torchiere_lamp_90s',
  apt_hallway_globe_fixture: 'apt_brass_tulip_sconce_90s',
  apt_lr_velvet_curtains_pristine: 'apt_hotel_blackout_drapes_90s',
  apt_lr_velvet_curtains_unkempt: 'apt_hotel_blackout_drapes_90s',

  // Kitchenette
  apt_harvest_gold_refrigerator: 'apt_fridge_white_90s',
  apt_formica_countertop_wood_trim: 'apt_counter_laminate_bullnose_90s',
  apt_kit_dish_rack_pristine: 'apt_hospitality_coffee_tray_90s',
  apt_kit_dish_rack_unkempt: 'apt_hospitality_coffee_tray_90s',
  apt_kit_toaster_pristine: 'apt_microwave_digital_90s',
  apt_kit_toaster_unkempt: 'apt_microwave_digital_90s',

  // Bathroom
  marble_vanity_sink: 'apt_vanity_cultured_marble_90s',
  porcelain_bathtub: 'apt_bath_acrylic_tub_enclosure_90s',
  suite_porcelain_toilet: 'apt_toilet_white_90s',
  brass_towel_rack: 'apt_hotel_towel_rack_chrome_90s',

  // Flooring
  apt_lr_area_rug_pristine: 'apt_flooring_hotel_teal_carpet_90s',
  apt_lr_area_rug_unkempt: 'apt_flooring_hotel_teal_carpet_90s',

  // Elevator Cab Components (7x7 Hoistway)
  apt_elevator_cab_sliding_doors: 'apt_elevator_cab_sliding_doors_90s',
  apt_elevator_cab_wall_solid: 'apt_elevator_cab_wall_solid_90s',
  apt_elevator_cab_portal_wall: 'apt_elevator_cab_portal_wall_90s',
  apt_elevator_ceiling_access_panel: 'apt_elevator_ceiling_access_panel_90s',
  apt_elevator_emergency_phone: 'apt_elevator_emergency_phone_90s',
  apt_elevator_button_panel_cop: 'apt_elevator_button_panel_cop_90s',
  apt_elevator_floor_tile_7x7: 'apt_elevator_floor_tile_7x7_90s'
};

/**
 * Reverse mapping from 1990s updated hotel subTypes back to their original 1978 baseline subTypes.
 */
export const HOTEL_1990S_TO_1978_PREDECESSOR_MAP: Record<string, string> = {
  apt_tv_crt_90s_black: 'apt_lr_television_pristine',
  apt_phone_touchtone_90s: 'apt_wall_rotary_telephone',
  apt_bed_digital_clock_radio_90s: 'apt_bed_alarm_clock_pristine',
  apt_door_keycard_reader_90s: 'apt_interior_tenement_door',
  apt_ptac_ac_unit_90s: 'apt_baseboard_steam_radiator',
  apt_fire_alarm_strobe_horn_90s: 'apt_ceiling_smoke_detector',
  apt_hotel_exit_sign_led_90s: 'apt_illuminated_exit_sign',
  apt_intercom_hotel_pbx_90s: 'apt_front_door_intercom',
  apt_hotel_bed_queen_90s: 'apt_bed_mattress_boxspring_pristine',
  apt_hotel_tv_armoire_90s: 'apt_bed_dresser_pristine',
  apt_hotel_nightstand_90s: 'apt_bed_nightstand_pristine',
  apt_hotel_sofa_90s: 'apt_lr_sofa_pristine',
  apt_coffee_table_glass_steel_90s: 'apt_lr_coffee_table_pristine',
  apt_hotel_armchair_90s: 'apt_velvet_armchair',
  apt_hotel_desk_laminate_90s: 'apt_rotary_telephone_desk',
  apt_halogen_torchiere_lamp_90s: 'apt_lr_floor_lamp_pristine',
  apt_brass_tulip_sconce_90s: 'apt_hallway_globe_fixture',
  apt_hotel_blackout_drapes_90s: 'apt_lr_velvet_curtains_pristine',
  apt_fridge_white_90s: 'apt_harvest_gold_refrigerator',
  apt_minibar_fridge_90s: 'apt_harvest_gold_refrigerator',
  apt_microwave_digital_90s: 'apt_kit_toaster_pristine',
  apt_counter_laminate_bullnose_90s: 'apt_formica_countertop_wood_trim',
  apt_faucet_single_lever_90s: 'apt_formica_countertop_wood_trim',
  apt_hospitality_coffee_tray_90s: 'apt_kit_dish_rack_pristine',
  apt_vanity_cultured_marble_90s: 'marble_vanity_sink',
  apt_bath_chrome_strip_light_90s: 'apt_hallway_globe_fixture',
  apt_bath_acrylic_tub_enclosure_90s: 'porcelain_bathtub',
  apt_wall_hair_dryer_90s: 'apt_kit_toaster_pristine',
  apt_toilet_white_90s: 'suite_porcelain_toilet',
  apt_hotel_towel_rack_chrome_90s: 'brass_towel_rack',
  apt_flooring_hotel_teal_carpet_90s: 'apt_lr_area_rug_pristine',
  apt_flooring_white_tile_90s: 'apt_popcorn_ceiling_tile',
  apt_hotel_ice_machine_90s: 'apt_coin_op_washer_dryer',

  // Elevator Cab Components (7x7 Hoistway)
  apt_elevator_cab_sliding_doors_90s: 'apt_elevator_cab_sliding_doors',
  apt_elevator_cab_wall_solid_90s: 'apt_elevator_cab_wall_solid',
  apt_elevator_cab_portal_wall_90s: 'apt_elevator_cab_portal_wall',
  apt_elevator_ceiling_access_panel_90s: 'apt_elevator_ceiling_access_panel',
  apt_elevator_emergency_phone_90s: 'apt_elevator_emergency_phone',
  apt_elevator_button_panel_cop_90s: 'apt_elevator_button_panel_cop',
  apt_elevator_floor_tile_7x7_90s: 'apt_elevator_floor_tile_7x7'
};

/**
 * Returns the 1990s updated hotel subType for any given 1978 original asset.
 */
export function getUpdated1990sVariantSubtype(
  subType: string,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): string | undefined {
  if (HOTEL_1978_TO_1990S_UPDATE_MAP[subType]) {
    return HOTEL_1978_TO_1990S_UPDATE_MAP[subType];
  }
  const bp = allBlueprints.find((b) => b.subType === subType);
  return bp?.paired1990sId;
}

/**
 * Returns the 1978 baseline subType predecessor for any given 1990s asset.
 */
export function getPredecessor1978Subtype(
  subType: string,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): string | undefined {
  if (HOTEL_1990S_TO_1978_PREDECESSOR_MAP[subType]) {
    return HOTEL_1990S_TO_1978_PREDECESSOR_MAP[subType];
  }
  const bp = allBlueprints.find((b) => b.subType === subType);
  return bp?.predecessor1978Id;
}

/**
 * Upgrades a placed 1978 asset to its 1992-1995 hotel updated counterpart in-place,
 * preserving position, rotation, and floor assignment while enforcing structural immutability.
 */
export function upgradeAssetTo1990sHotelVersion(
  asset: PlacedAsset,
  allBlueprints: readonly SearchableBlueprintLike[] = APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS
): { success: true; upgradedAsset: PlacedAsset } | { success: false; reason: string } {
  // Enforce: Structural items CANNOT be updated in hotel conversion
  if (isStructuralHotelAsset(asset.subType, allBlueprints)) {
    return {
      success: false,
      reason: `Structural item (${asset.name || asset.subType}) is an architecturally fixed load-bearing element or MEP shaft that cannot be updated in a hotel renovation.`
    };
  }

  const targetSubtype =
    asset.paired1990sId ||
    getUpdated1990sVariantSubtype(asset.subType, allBlueprints);

  if (!targetSubtype) {
    return {
      success: false,
      reason: `No 1990s hotel updated variant registered for asset subType: ${asset.subType}`
    };
  }

  const targetBp =
    allBlueprints.find((b) => b.subType === targetSubtype) ||
    APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.find((b) => b.subType === targetSubtype);

  if (!targetBp) {
    return {
      success: false,
      reason: `Blueprint definition not found for 1990s target subType: ${targetSubtype}`
    };
  }

  const upgradedAsset: PlacedAsset = {
    ...asset,
    name: targetBp.name,
    subType: targetBp.subType,
    category: targetBp.category,
    color: targetBp.defaultColor,
    textureId: targetBp.defaultTexture,
    dimensions: [...targetBp.defaultDimensions] as [number, number, number],
    compositeParts: targetBp.compositeParts ? targetBp.compositeParts.map((p) => ({ ...p })) : undefined,
    soundPresetId: targetBp.soundPresetId || asset.soundPresetId,
    era: '1990s',
    canUpdateInHotel: true,
    predecessor1978Id: asset.subType, // Retains pointer to previous 1978 asset for instant downgrade
    tags: targetBp.tags ? [...targetBp.tags] : asset.tags
  };

  return { success: true, upgradedAsset };
}

/**
 * Reverts a 1990s hotel updated placed asset back to its 1978 original baseline version.
 */
export function downgradeAssetTo1978Version(
  asset: PlacedAsset,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): { success: true; downgradedAsset: PlacedAsset } | { success: false; reason: string } {
  const targetSubtype =
    asset.predecessor1978Id ||
    getPredecessor1978Subtype(asset.subType, allBlueprints);

  if (!targetSubtype) {
    return {
      success: false,
      reason: `No 1978 original predecessor registered for asset subType: ${asset.subType}`
    };
  }

  const targetBp = allBlueprints.find((b) => b.subType === targetSubtype);
  if (!targetBp) {
    return {
      success: false,
      reason: `Blueprint definition not found for 1978 predecessor subType: ${targetSubtype}`
    };
  }

  const downgradedAsset: PlacedAsset = {
    ...asset,
    name: targetBp.name,
    subType: targetBp.subType,
    category: targetBp.category,
    color: targetBp.defaultColor,
    textureId: targetBp.defaultTexture,
    dimensions: [...targetBp.defaultDimensions] as [number, number, number],
    compositeParts: targetBp.compositeParts ? targetBp.compositeParts.map((p) => ({ ...p })) : undefined,
    soundPresetId: targetBp.soundPresetId || asset.soundPresetId,
    era: '1970s',
    paired1990sId: asset.subType,
    tags: targetBp.tags ? [...targetBp.tags] : asset.tags
  };

  return { success: true, downgradedAsset };
}

/**
 * Generates an expanded Google AI Studio (`gemini-2.5-flash`) queue payload
 * to synthesize 1992-1995 period 3D mesh references and concept textures for the hotel renovation.
 * Uses `gemini-2.5-flash` as the highest model capable while being completely free with Google Studio Pro.
 */
export function buildGemini1990sHotelAssetPromptQueue(
  modelId: 'gemini-2.5-flash' | 'gemini-3.1-flash-lite' = 'gemini-2.5-flash'
): Array<{
  subType: string;
  name: string;
  modelId: string;
  era: '1990s';
  prompt: string;
}> {
  return APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.map((bp) => ({
    subType: bp.subType,
    name: bp.name,
    modelId,
    era: '1990s',
    prompt: `1992-1995 hotel renovation asset: ${bp.name}. ${bp.description} Era-authentic early-to-mid 1990s hospitality styling (hunter green, deep teal, bleached oak laminate, tubular steel, polished brass tulip sconces, black ABS plastics), photorealistic 3D architectural geometry optimized for game engine runtime.`
  }));
}
