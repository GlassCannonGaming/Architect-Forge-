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
  subType: string | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): boolean {
  if (!subType || typeof subType !== 'string') return false;
  if (STRUCTURAL_HOTEL_ASSET_SUBTYPES.has(subType)) return true;
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const bp = safeBlueprints.find((b) => b && b.subType === subType);
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
    s.startsWith('apt_elevator_interior_panel') ||
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
  assetOrSubtype: string | PlacedAsset | SearchableBlueprintLike | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): boolean {
  if (!assetOrSubtype) return false;
  const subType = typeof assetOrSubtype === 'string' ? assetOrSubtype : assetOrSubtype.subType;
  if (!subType || typeof subType !== 'string') return false;
  if (isStructuralHotelAsset(subType, allBlueprints)) return false;

  if (typeof assetOrSubtype === 'object' && assetOrSubtype !== null) {
    if (assetOrSubtype.canUpdateInHotel === false) return false;
    if (assetOrSubtype.paired1990sId) return true;
  }

  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const bp = safeBlueprints.find((b) => b && b.subType === subType);
  if (bp) {
    if (bp.canUpdateInHotel === false) return false;
    if (bp.paired1990sId) return true;
  }

  // Check 1990s catalog pairings
  return Boolean(getUpdated1990sVariantSubtype(subType, safeBlueprints));
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
  },

  // --------------------------------------------------------------------------
  // 8. COMPLETE 1990s ROOM PROPS & UPDATED TOGGLE VARIANTS (FROM ATTACHED LIST)
  // Modeled via Text-to-Image-to-3D (gemini-3.1-flash-lite-image -> Meshy.ai meshy-4-image-to-3d)
  // Includes alternate visual designs for asset types that already exist in the catalog
  // --------------------------------------------------------------------------
  // Entryway Lobby & Shared Building Items (16 items)
  {
    subType: 'apt_front_door_intercom_90s',
    name: '1990s Tarnished Brushed-Aluminum Front Door Intercom System',
    category: 'appliance',
    defaultDimensions: [0.42, 0.68, 0.1],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_front_door_intercom',
    soundPresetId: 'sfx_bell_ring',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'intercom', 'lobby', 'appliance', 'meshy_3d', 'visual_design_variant'],
    description: 'Tarnished brushed-aluminum wall panel with vertical rows of small blocky metallic push-buttons, a slotted speaker grill, and yellowed plastic label strips with faded black text.',
    compositeParts: [
      { id: 'aluminum_panel', shape: 'box', offset: [0, 0, 0], size: [0.4, 0.66, 0.06], color: '#94a3b8', roughness: 0.45, metalness: 0.78 },
      { id: 'speaker_grill', shape: 'box', offset: [0, 0.2, 0.035], size: [0.26, 0.14, 0.015], color: '#334155', roughness: 0.7, metalness: 0.5 },
      { id: 'button_bank_left', shape: 'box', offset: [-0.09, -0.08, 0.035], size: [0.05, 0.32, 0.02], color: '#cbd5e1', roughness: 0.35, metalness: 0.85 },
      { id: 'button_bank_right', shape: 'box', offset: [0.09, -0.08, 0.035], size: [0.05, 0.32, 0.02], color: '#cbd5e1', roughness: 0.35, metalness: 0.85 },
      { id: 'yellowed_labels', shape: 'box', offset: [0, -0.08, 0.033], size: [0.1, 0.32, 0.012], color: '#fef08a', roughness: 0.65, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_mailboxes_90s',
    name: '1990s Scratched Brass Wall-Mounted Mailboxes',
    category: 'furniture',
    defaultDimensions: [1.8, 1.4, 0.35],
    defaultColor: '#786438',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_gang_mailboxes',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'mailboxes', 'lobby', 'furniture', 'meshy_3d'],
    description: 'Wall-mounted block of rectangular, lock-keyed metal mailboxes with a dull scratched brass finish and slightly bent compartment doors showing thin dark gaps.',
    compositeParts: [
      { id: 'mailbox_housing', shape: 'box', offset: [0, 0, 0], size: [1.76, 1.36, 0.32], color: '#786438', roughness: 0.55, metalness: 0.72 },
      { id: 'compartment_grid_upper', shape: 'box', offset: [0, 0.3, 0.165], size: [1.68, 0.56, 0.02], color: '#856d3d', roughness: 0.5, metalness: 0.75 },
      { id: 'compartment_grid_lower', shape: 'box', offset: [0, -0.3, 0.165], size: [1.68, 0.56, 0.02], color: '#6b5830', roughness: 0.6, metalness: 0.7 },
      { id: 'bent_door_gap', shape: 'box', offset: [0.35, -0.28, 0.175], size: [0.28, 0.24, 0.02], rotation: [0.06, -0.08, 0], color: '#1e1b18', roughness: 0.9, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_fire_extinguisher_90s',
    name: '1990s Chipped Red Fire Extinguisher & Gauge',
    category: 'clue_prop',
    defaultDimensions: [0.35, 0.75, 0.3],
    defaultColor: '#991b1b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_wall_fire_extinguisher',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'fire_extinguisher', 'safety', 'lobby', 'meshy_3d'],
    description: 'Cylindrical fire extinguisher with chipped faded red paint, black rubber discharge hose, scratched pressure gauge dial, and a light coating of gray dust.',
    compositeParts: [
      { id: 'tank_cylinder', shape: 'cylinder', offset: [0, -0.06, 0], size: [0.11, 0.56, 0.11], color: '#991b1b', roughness: 0.52, metalness: 0.45 },
      { id: 'valve_head', shape: 'cylinder', offset: [0, 0.26, 0], size: [0.045, 0.1, 0.045], color: '#94a3b8', roughness: 0.35, metalness: 0.85 },
      { id: 'pressure_gauge', shape: 'cylinder', offset: [0, 0.26, 0.055], size: [0.025, 0.02, 0.025], rotation: [Math.PI / 2, 0, 0], color: '#f8fafc', roughness: 0.3, metalness: 0.3 },
      { id: 'discharge_hose', shape: 'cylinder', offset: [-0.08, -0.02, 0.02], size: [0.018, 0.44, 0.018], color: '#18181b', roughness: 0.85, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_smoke_detector_disc_90s',
    name: '1990s Nicotine-Stained Beige Disc Smoke Detector',
    category: 'appliance',
    defaultDimensions: [0.28, 0.08, 0.28],
    defaultColor: '#d6cba8',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ceiling_smoke_detector',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'smoke_detector', 'fire_alarm', 'lobby', 'meshy_3d', 'visual_design_variant'],
    description: 'Disc-shaped, battery-operated ceiling smoke alarm made of nicotine-stained beige plastic with a single dull, unlit red LED indicator lens.',
    compositeParts: [
      { id: 'disc_body', shape: 'cylinder', offset: [0, 0, 0], size: [0.13, 0.05, 0.13], color: '#d6cba8', roughness: 0.72, metalness: 0.08 },
      { id: 'vent_slots_ring', shape: 'cylinder', offset: [0, -0.025, 0], size: [0.09, 0.015, 0.09], color: '#b8aa84', roughness: 0.8, metalness: 0.1 },
      { id: 'unlit_red_led', shape: 'sphere', offset: [0.05, -0.032, 0], size: [0.012, 0.012, 0.012], color: '#7f1d1d', roughness: 0.35, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_exit_sign_stencil_red_90s',
    name: '1990s Angular Metal Red Stencil Exit Sign',
    category: 'lighting',
    defaultDimensions: [0.62, 0.34, 0.14],
    defaultColor: '#cbd5e1',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_illuminated_exit_sign',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'exit_sign', 'lighting', 'lobby', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy, angular metal enclosure with a stencil face and thick red glass EXIT lettering, heavily stained with grime around the housing seams.',
    compositeParts: [
      { id: 'metal_enclosure', shape: 'box', offset: [0, 0, 0], size: [0.6, 0.32, 0.12], color: '#94a3b8', roughness: 0.6, metalness: 0.65 },
      { id: 'stencil_faceplate', shape: 'box', offset: [0, 0, 0.062], size: [0.56, 0.28, 0.01], color: '#cbd5e1', roughness: 0.55, metalness: 0.7 },
      { id: 'red_exit_glass_display', shape: 'box', offset: [0, 0, 0.068], size: [0.46, 0.2, 0.01], color: '#dc2626', emissive: '#991b1b', roughness: 0.25, metalness: 0.15 }
    ]
  },
  {
    subType: 'apt_concrete_stairwell_step_90s',
    name: '1990s Cracked Raw Concrete Stairwell Step',
    category: 'floor_tile',
    defaultDimensions: [2.4, 0.25, 0.9],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_stairwell_zig_zag_flight',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'stairwell', 'concrete', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Single low-poly block representing a raw concrete step with a rounded safety edge, hairline surface cracks, dark water stains, and chipped corners.',
    compositeParts: [
      { id: 'concrete_tread_block', shape: 'box', offset: [0, 0, 0], size: [2.38, 0.22, 0.86], color: '#64748b', roughness: 0.92, metalness: 0.05 },
      { id: 'rounded_safety_nosing', shape: 'cylinder', offset: [0, 0.09, 0.43], size: [0.03, 2.36, 0.03], rotation: [0, 0, Math.PI / 2], color: '#475569', roughness: 0.88, metalness: 0.1 },
      { id: 'water_stain_patch', shape: 'box', offset: [-0.45, 0.112, 0.08], size: [0.65, 0.008, 0.42], color: '#334155', roughness: 0.95, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_carpeted_stairwell_step_90s',
    name: '1990s Matted Industrial Carpeted Stairwell Step',
    category: 'floor_tile',
    defaultDimensions: [2.4, 0.25, 0.9],
    defaultColor: '#4a3728',
    defaultTexture: 'velvet_crimson',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_stairwell_zig_zag_flight',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'stairwell', 'carpet', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Low-poly stairwell step covered in heavily worn, matted industrial loop carpet of dark brown with frayed backing edges.',
    compositeParts: [
      { id: 'step_subbase', shape: 'box', offset: [0, -0.02, 0], size: [2.38, 0.2, 0.86], color: '#3b2f2f', roughness: 0.85, metalness: 0.05 },
      { id: 'matted_brown_carpet', shape: 'box', offset: [0, 0.09, 0.02], size: [2.34, 0.04, 0.88], color: '#4a3728', roughness: 0.96, metalness: 0.02 },
      { id: 'frayed_front_edge', shape: 'box', offset: [0, 0.02, 0.45], size: [2.32, 0.16, 0.03], color: '#5c4033', roughness: 0.98, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_elevator_interior_panel_90s',
    name: '1990s Faux Wood-Grain Laminate Elevator Wall Panel',
    category: 'furniture',
    defaultDimensions: [1.4, 2.5, 0.08],
    defaultColor: '#4a2c17',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_elevator_cab_wall_solid',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'elevator', 'panel', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Flat, modular rectangular wall panel with a fake vertical wood-grain laminate finish, marred by shallow key scratches and localized peeling at the base corner.',
    compositeParts: [
      { id: 'laminate_panel_slab', shape: 'box', offset: [0, 0, 0], size: [1.38, 2.48, 0.06], color: '#4a2c17', roughness: 0.62, metalness: 0.12 },
      { id: 'peeling_corner_strip', shape: 'box', offset: [0.58, -1.12, 0.036], size: [0.18, 0.22, 0.015], rotation: [0.12, -0.15, 0.08], color: '#78553a', roughness: 0.85, metalness: 0.05 },
      { id: 'key_scratch_groove', shape: 'box', offset: [-0.15, 0.18, 0.033], size: [0.48, 0.015, 0.008], rotation: [0, 0, -0.22], color: '#a88b73', roughness: 0.9, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_shared_washing_machine_90s',
    name: '1990s Coin-Op Enamel Commercial Washing Machine',
    category: 'appliance',
    defaultDimensions: [0.9, 1.25, 0.9],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_coin_op_washer_dryer',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'laundry', 'washer', 'appliance', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy, cubical coin-operated commercial washing machine with a white enamel finish, rust along the bottom seam, and a heavy steel coin-slide mechanism on the top control console.',
    compositeParts: [
      { id: 'washer_cabinet', shape: 'box', offset: [0, -0.08, 0], size: [0.86, 1.02, 0.84], color: '#e2e8f0', roughness: 0.38, metalness: 0.35 },
      { id: 'top_control_console', shape: 'box', offset: [0, 0.5, -0.32], size: [0.86, 0.2, 0.18], color: '#cbd5e1', roughness: 0.45, metalness: 0.5 },
      { id: 'steel_coin_slide_box', shape: 'box', offset: [0.24, 0.44, -0.12], size: [0.2, 0.14, 0.32], color: '#94a3b8', roughness: 0.3, metalness: 0.88 },
      { id: 'bottom_seam_rust', shape: 'box', offset: [0, -0.57, 0.425], size: [0.84, 0.05, 0.015], color: '#7c2d12', roughness: 0.92, metalness: 0.25 }
    ]
  },
  {
    subType: 'apt_shared_dryer_90s',
    name: '1990s Front-Load Commercial Clothes Dryer',
    category: 'appliance',
    defaultDimensions: [0.9, 1.25, 0.9],
    defaultColor: '#cbd5e1',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_coin_op_washer_dryer',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'laundry', 'dryer', 'appliance', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Heavy, boxy commercial clothes dryer matching the washer, featuring a circular front-loading glass door and scuffed paint around the handle.',
    compositeParts: [
      { id: 'dryer_cabinet', shape: 'box', offset: [0, -0.05, 0], size: [0.88, 1.12, 0.86], color: '#cbd5e1', roughness: 0.42, metalness: 0.35 },
      { id: 'front_door_ring', shape: 'cylinder', offset: [0, -0.06, 0.44], size: [0.28, 0.04, 0.28], rotation: [Math.PI / 2, 0, 0], color: '#64748b', roughness: 0.35, metalness: 0.75 },
      { id: 'porthole_glass', shape: 'cylinder', offset: [0, -0.06, 0.45], size: [0.22, 0.02, 0.22], rotation: [Math.PI / 2, 0, 0], color: '#1e293b', roughness: 0.18, metalness: 0.2 },
      { id: 'scuffed_door_handle', shape: 'box', offset: [0.26, -0.06, 0.46], size: [0.04, 0.16, 0.03], color: '#475569', roughness: 0.7, metalness: 0.5 }
    ]
  },
  {
    subType: 'apt_hvac_vent_grill_90s',
    name: '1990s Slatted Central HVAC Vent Register',
    category: 'appliance',
    defaultDimensions: [0.65, 0.35, 0.08],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_hvac_ceiling_diffuser',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hvac', 'vent', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Rectangular, slatted metal ventilation register mounted high on a wall, with louvers heavily caked in dark, fuzzy dust and trailing soot streaks.',
    compositeParts: [
      { id: 'vent_outer_frame', shape: 'box', offset: [0, 0, 0], size: [0.64, 0.34, 0.05], color: '#64748b', roughness: 0.65, metalness: 0.6 },
      { id: 'slatted_louver_core', shape: 'box', offset: [0, 0, 0.02], size: [0.56, 0.26, 0.025], color: '#334155', roughness: 0.9, metalness: 0.3 },
      { id: 'fuzzy_soot_streak', shape: 'box', offset: [0, 0.14, 0.028], size: [0.52, 0.05, 0.01], color: '#1e293b', roughness: 0.98, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_cast_iron_radiator_90s',
    name: '1990s Flaking Off-White Multi-Loop Cast Iron Radiator',
    category: 'appliance',
    defaultDimensions: [1.15, 0.78, 0.28],
    defaultColor: '#d6d3d1',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_baseboard_steam_radiator',
    soundPresetId: 'sfx_steam_pipe',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'radiator', 'heating', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Heavy, multi-sectioned vertical loop cast iron radiator with thick, peeling, and flaking layers of off-white paint over dark corroded iron.',
    compositeParts: [
      { id: 'radiator_loop_bank', shape: 'box', offset: [0, 0, 0], size: [1.02, 0.72, 0.24], color: '#d6d3d1', roughness: 0.85, metalness: 0.45 },
      { id: 'corroded_iron_core', shape: 'box', offset: [0, -0.12, 0.01], size: [0.96, 0.36, 0.25], color: '#3f3f46', roughness: 0.92, metalness: 0.65 },
      { id: 'steam_inlet_valve', shape: 'cylinder', offset: [0.54, -0.26, 0], size: [0.045, 0.14, 0.045], color: '#78350f', roughness: 0.7, metalness: 0.75 }
    ]
  },
  {
    subType: 'apt_utility_meter_90s',
    name: '1990s Glass-Domed Mechanical Utility Meter',
    category: 'appliance',
    defaultDimensions: [0.38, 0.48, 0.26],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_electric_meter_bank',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'utility_meter', 'electric', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Cylindrical glass-domed utility meter mounted on a gray metal base box, featuring internal mechanical dials and a spinning horizontal disc behind smudged glass.',
    compositeParts: [
      { id: 'gray_metal_base_box', shape: 'box', offset: [0, 0, -0.05], size: [0.34, 0.44, 0.12], color: '#64748b', roughness: 0.6, metalness: 0.7 },
      { id: 'smudged_glass_dome', shape: 'cylinder', offset: [0, 0.02, 0.06], size: [0.13, 0.14, 0.13], rotation: [Math.PI / 2, 0, 0], color: '#cbd5e1', roughness: 0.22, metalness: 0.15 },
      { id: 'spinning_rotor_disc', shape: 'cylinder', offset: [0, 0.02, 0.07], size: [0.09, 0.015, 0.09], color: '#1e293b', roughness: 0.4, metalness: 0.8 }
    ]
  },
  {
    subType: 'apt_trash_chute_door_90s',
    name: '1990s Galvanized Iron Flush Trash Chute Door',
    category: 'door',
    defaultDimensions: [0.55, 0.58, 0.12],
    defaultColor: '#71717a',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_hallway_trash_chute',
    soundPresetId: 'sfx_door_latch',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'trash_chute', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Small, square, bottom-hinged heavy galvanized iron door mounted flush in a wall frame, with a T-shaped metal pull handle and greasy dark smudges around the latch.',
    compositeParts: [
      { id: 'wall_flush_frame', shape: 'box', offset: [0, 0, 0], size: [0.54, 0.56, 0.06], color: '#52525b', roughness: 0.65, metalness: 0.75 },
      { id: 'galvanized_hatch_door', shape: 'box', offset: [0, 0, 0.032], size: [0.44, 0.46, 0.025], color: '#71717a', roughness: 0.55, metalness: 0.8 },
      { id: 't_handle_latch', shape: 'box', offset: [0, 0.14, 0.06], size: [0.12, 0.035, 0.04], color: '#cbd5e1', roughness: 0.35, metalness: 0.9 },
      { id: 'greasy_latch_smudge', shape: 'box', offset: [0, 0.13, 0.046], size: [0.18, 0.1, 0.005], color: '#27272a', roughness: 0.95, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_hallway_dome_fixture_90s',
    name: '1990s Frosted Glass Ceiling Dome Fixture',
    category: 'lighting',
    defaultDimensions: [0.45, 0.2, 0.45],
    defaultColor: '#e5ded0',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_hallway_globe_fixture',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'lighting', 'hallway', 'lobby', 'meshy_3d', 'visual_design_variant'],
    description: 'Low-profile, circular frosted glass ceiling dome with a dull brass base ring, containing dark silhouettes of dead insects trapped inside the glass.',
    compositeParts: [
      { id: 'dull_brass_ring', shape: 'cylinder', offset: [0, 0.06, 0], size: [0.22, 0.04, 0.22], color: '#856d3d', roughness: 0.55, metalness: 0.78 },
      { id: 'frosted_glass_dome', shape: 'sphere', offset: [0, -0.01, 0], size: [0.19, 0.14, 0.19], color: '#e5ded0', emissive: '#fef3c7', roughness: 0.45, metalness: 0.08 },
      { id: 'trapped_debris_speck', shape: 'box', offset: [0.05, -0.05, 0.03], size: [0.04, 0.01, 0.03], color: '#27272a', roughness: 0.9, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_breaker_panel_90s',
    name: '1990s Ajar Gray Metal Electrical Breaker Panel',
    category: 'appliance',
    defaultDimensions: [0.52, 0.78, 0.14],
    defaultColor: '#64748b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_breaker_box_panel',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'breaker_panel', 'electrical', 'lobby', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Rectangular, flat gray-painted metal electrical box with a hinged door slightly ajar, revealing two vertical rows of black plastic toggle switches and a faded paper directory.',
    compositeParts: [
      { id: 'metal_panel_box', shape: 'box', offset: [0, 0, 0], size: [0.5, 0.76, 0.1], color: '#64748b', roughness: 0.58, metalness: 0.68 },
      { id: 'breaker_switches_rows', shape: 'box', offset: [-0.04, 0, 0.052], size: [0.22, 0.52, 0.02], color: '#18181b', roughness: 0.7, metalness: 0.2 },
      { id: 'ajar_hinged_door', shape: 'box', offset: [0.06, 0, 0.08], size: [0.46, 0.72, 0.015], rotation: [0, 0.28, 0], color: '#71717a', roughness: 0.55, metalness: 0.7 },
      { id: 'faded_paper_directory', shape: 'box', offset: [0.12, 0.04, 0.072], size: [0.16, 0.28, 0.005], rotation: [0, 0.28, 0], color: '#fef3c7', roughness: 0.85, metalness: 0.02 }
    ]
  },

  // Living Room & Shared Areas (12 items from 1990s List)
  {
    subType: 'apt_lr_crt_tv_vcr_90s',
    name: '1990s Wood-Grain Laminate CRT Console Television & VCR',
    category: 'appliance',
    defaultDimensions: [0.92, 0.76, 0.62],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_crt_tv_console_pristine',
    soundPresetId: 'sfx_radio_static',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'tv', 'television', 'crt', 'living', 'meshy_3d', 'visual_design_variant'],
    description: 'Heavy, boxy 1990 CRT television housed in a dark artificial wood-grain laminate cabinet, featuring a thick convex dark-gray reflective glass screen with grey dust and side tuning dials.',
    compositeParts: [
      { id: 'woodgrain_cabinet', shape: 'box', offset: [0, 0, 0], size: [0.9, 0.74, 0.58], color: '#3b2314', roughness: 0.65, metalness: 0.12 },
      { id: 'crt_screen_glass', shape: 'box', offset: [-0.08, 0.03, 0.295], size: [0.62, 0.5, 0.03], color: '#27272a', roughness: 0.18, metalness: 0.25 },
      { id: 'tuning_dials_panel', shape: 'box', offset: [0.32, 0.03, 0.295], size: [0.14, 0.5, 0.025], color: '#18181b', roughness: 0.6, metalness: 0.3 },
      { id: 'rotary_dial_upper', shape: 'cylinder', offset: [0.32, 0.16, 0.315], size: [0.038, 0.025, 0.038], rotation: [Math.PI / 2, 0, 0], color: '#cbd5e1', roughness: 0.35, metalness: 0.8 },
      { id: 'rotary_dial_lower', shape: 'cylinder', offset: [0.32, 0.04, 0.315], size: [0.038, 0.025, 0.038], rotation: [Math.PI / 2, 0, 0], color: '#cbd5e1', roughness: 0.35, metalness: 0.8 }
    ]
  },
  {
    subType: 'apt_lr_remote_control_90s',
    name: '1990s Black Plastic Rubber-Button TV Remote',
    category: 'clue_prop',
    defaultDimensions: [0.24, 0.06, 0.1],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_remote_control_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'remote', 'living', 'clue_prop', 'meshy_3d'],
    description: 'Elongated rectangular black plastic block remote controller with rows of gray and red rubber buttons and worn-away white channel labels.',
    compositeParts: [
      { id: 'remote_body', shape: 'box', offset: [0, 0, 0], size: [0.23, 0.04, 0.09], color: '#18181b', roughness: 0.6, metalness: 0.15 },
      { id: 'power_red_btn', shape: 'box', offset: [-0.08, 0.025, -0.02], size: [0.025, 0.012, 0.025], color: '#dc2626', roughness: 0.75, metalness: 0.05 },
      { id: 'rubber_keypad_grid', shape: 'box', offset: [0.02, 0.024, 0], size: [0.13, 0.01, 0.065], color: '#52525b', roughness: 0.85, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_lr_floral_sofa_90s',
    name: '1990s Faded Floral Mauve & Hunter-Green 3-Seater Sofa',
    category: 'furniture',
    defaultDimensions: [2.2, 0.88, 0.95],
    defaultColor: '#6b4c57',
    defaultTexture: 'wallpaper_damask',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_sofa_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'sofa', 'couch', 'living', 'furniture', 'meshy_3d', 'visual_design_variant'],
    description: 'Blocky, low-poly three-seater couch upholstered in a faded 1990 floral pattern with muted mauve and hunter green tones, featuring a noticeably sagged and darkened middle cushion.',
    compositeParts: [
      { id: 'sofa_base_frame', shape: 'box', offset: [0, -0.22, 0], size: [2.16, 0.36, 0.9], color: '#1b4332', roughness: 0.88, metalness: 0.04 },
      { id: 'sofa_backrest', shape: 'box', offset: [0, 0.16, -0.32], size: [2.14, 0.52, 0.26], color: '#6b4c57', roughness: 0.9, metalness: 0.03 },
      { id: 'cushion_left', shape: 'box', offset: [-0.66, -0.02, 0.06], size: [0.62, 0.18, 0.68], color: '#7a5964', roughness: 0.9, metalness: 0.03 },
      { id: 'cushion_middle_sagged', shape: 'box', offset: [0, -0.06, 0.06], size: [0.62, 0.14, 0.68], color: '#4a353d', roughness: 0.95, metalness: 0.02 },
      { id: 'cushion_right', shape: 'box', offset: [0.66, -0.02, 0.06], size: [0.62, 0.18, 0.68], color: '#7a5964', roughness: 0.9, metalness: 0.03 }
    ]
  },
  {
    subType: 'apt_lr_particle_glass_coffee_table_90s',
    name: '1990s Particle-Board & Smoky Glass Coffee Table',
    category: 'furniture',
    defaultDimensions: [1.35, 0.45, 0.75],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_coffee_table_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coffee_table', 'table', 'living', 'furniture', 'meshy_3d', 'visual_design_variant'],
    description: 'Low rectangular table with a dark particle-board wood frame holding a recessed, smoky tempered glass top pane covered in faint circular water rings and micro-scratches.',
    compositeParts: [
      { id: 'particle_board_frame', shape: 'box', offset: [0, 0.16, 0], size: [1.32, 0.08, 0.72], color: '#3b2314', roughness: 0.75, metalness: 0.08 },
      { id: 'smoky_glass_pane', shape: 'box', offset: [0, 0.19, 0], size: [1.16, 0.02, 0.56], color: '#334155', roughness: 0.18, metalness: 0.25 },
      { id: 'leg_fl', shape: 'box', offset: [-0.58, -0.04, 0.28], size: [0.08, 0.36, 0.08], color: '#3b2314', roughness: 0.78, metalness: 0.08 },
      { id: 'leg_fr', shape: 'box', offset: [0.58, -0.04, 0.28], size: [0.08, 0.36, 0.08], color: '#3b2314', roughness: 0.78, metalness: 0.08 },
      { id: 'leg_bl', shape: 'box', offset: [-0.58, -0.04, -0.28], size: [0.08, 0.36, 0.08], color: '#3b2314', roughness: 0.78, metalness: 0.08 },
      { id: 'leg_br', shape: 'box', offset: [0.58, -0.04, -0.28], size: [0.08, 0.36, 0.08], color: '#3b2314', roughness: 0.78, metalness: 0.08 }
    ]
  },
  {
    subType: 'apt_lr_stack_magazines_90s',
    name: '1990s Stack of Curled Design Magazines',
    category: 'clue_prop',
    defaultDimensions: [0.45, 0.14, 0.35],
    defaultColor: '#134e4a',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_books_magazines_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'magazines', 'books', 'living', 'clue_prop', 'meshy_3d'],
    description: 'Low-poly stack of three thin rectangular paper magazines with faded 1990 design format covers and curled, yellowed edges.',
    compositeParts: [
      { id: 'mag_bottom', shape: 'box', offset: [0, -0.03, 0], size: [0.4, 0.03, 0.3], color: '#fef3c7', roughness: 0.85, metalness: 0.02 },
      { id: 'mag_middle', shape: 'box', offset: [0.02, 0, -0.01], size: [0.39, 0.03, 0.29], rotation: [0, 0.12, 0], color: '#9f5f68', roughness: 0.82, metalness: 0.04 },
      { id: 'mag_top_cover', shape: 'box', offset: [-0.01, 0.03, 0.01], size: [0.38, 0.03, 0.28], rotation: [0, -0.08, 0], color: '#134e4a', roughness: 0.78, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_lr_throw_pillow_90s',
    name: '1990s Dusty-Rose Corded Throw Pillow',
    category: 'furniture',
    defaultDimensions: [0.5, 0.22, 0.5],
    defaultColor: '#9f5f68',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_throws_blanket_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'pillow', 'blanket', 'living', 'meshy_3d'],
    description: 'Square fabric throw pillow in faded dusty-rose with simple corded trim fraying at one corner (Meshy.ai organic cloth mesh).',
    compositeParts: [
      { id: 'pillow_cushion_body', shape: 'box', offset: [0, 0, 0], size: [0.46, 0.18, 0.46], color: '#9f5f68', roughness: 0.9, metalness: 0.02 },
      { id: 'corded_trim_border', shape: 'box', offset: [0, 0, 0], size: [0.49, 0.04, 0.49], color: '#7a434b', roughness: 0.92, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_lr_ficus_houseplant_90s',
    name: '1990s Faux Silk Ficus Tree in Black Pot',
    category: 'custom_ai',
    defaultDimensions: [0.75, 1.45, 0.75],
    defaultColor: '#1b4332',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_pothos_plant_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'plant', 'ficus', 'living', 'meshy_3d'],
    description: 'Fake indoor silk ficus tree in a plain black plastic pot with dusty muted dark green leaves (Meshy.ai complex foliage mesh).',
    compositeParts: [
      { id: 'black_plastic_pot', shape: 'cylinder', offset: [0, -0.52, 0], size: [0.22, 0.36, 0.22], color: '#18181b', roughness: 0.65, metalness: 0.15 },
      { id: 'wooden_trunk_stem', shape: 'cylinder', offset: [0, -0.05, 0], size: [0.04, 0.72, 0.04], color: '#4a2c17', roughness: 0.85, metalness: 0.05 },
      { id: 'ficus_foliage_canopy', shape: 'sphere', offset: [0, 0.34, 0], size: [0.36, 0.42, 0.36], color: '#1b4332', roughness: 0.88, metalness: 0.04 }
    ]
  },
  {
    subType: 'apt_lr_framed_wall_art_90s',
    name: '1990s Pastel Geometric Abstract Wall Art',
    category: 'custom_ai',
    defaultDimensions: [1.2, 0.9, 0.08],
    defaultColor: '#5eead4',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_wall_art_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'art', 'painting', 'living', 'meshy_3d'],
    description: 'Thin black plastic rectangular frame holding a faded 1990 geometric pastel abstract print with a diagonal hairline crack in the glass.',
    compositeParts: [
      { id: 'black_plastic_frame', shape: 'box', offset: [0, 0, 0], size: [1.18, 0.88, 0.05], color: '#18181b', roughness: 0.45, metalness: 0.2 },
      { id: 'pastel_abstract_print', shape: 'box', offset: [0, 0, 0.028], size: [1.08, 0.78, 0.01], color: '#5eead4', roughness: 0.65, metalness: 0.05 },
      { id: 'diagonal_glass_crack', shape: 'box', offset: [0.18, -0.1, 0.035], size: [0.62, 0.01, 0.005], rotation: [0, 0, -0.65], color: '#cbd5e1', roughness: 0.2, metalness: 0.3 }
    ]
  },
  {
    subType: 'apt_lr_brass_pleated_floor_lamp_90s',
    name: '1990s Brass Pole Floor Lamp with Crooked Pleated Shade',
    category: 'lighting',
    defaultDimensions: [0.48, 1.72, 0.48],
    defaultColor: '#b59449',
    defaultTexture: 'aged_brass',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_floor_lamp_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'lamp', 'floor_lamp', 'lighting', 'living', 'meshy_3d', 'visual_design_variant'],
    description: 'Tall, straight floor lamp with a tarnished, once-polished brass pole on a circular weighted base, topped with a stained, slightly crooked pleated cream fabric lampshade.',
    compositeParts: [
      { id: 'weighted_brass_base', shape: 'cylinder', offset: [0, -0.8, 0], size: [0.2, 0.05, 0.2], color: '#856d3d', roughness: 0.45, metalness: 0.82 },
      { id: 'brass_pole_shaft', shape: 'cylinder', offset: [0, -0.05, 0], size: [0.025, 1.48, 0.025], color: '#b59449', roughness: 0.38, metalness: 0.85 },
      { id: 'crooked_pleated_shade', shape: 'cone', offset: [0.02, 0.68, 0], size: [0.24, 0.34, 0.24], rotation: [0.08, 0, -0.12], color: '#fef3c7', emissive: '#fde68a', roughness: 0.85, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_lr_geometric_area_rug_90s',
    name: '1990s Faded Beige & Teal Geometric Area Rug',
    category: 'floor_tile',
    defaultDimensions: [2.8, 0.04, 2.0],
    defaultColor: '#0f766e',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_area_rug_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'rug', 'carpet', 'living', 'meshy_3d', 'visual_design_variant'],
    description: 'Flat rectangular area rug with a faded 1990 geometric pattern in beige and teal, showing darkened high-traffic wear paths, curled edges, and frayed binding threads.',
    compositeParts: [
      { id: 'rug_main_body', shape: 'box', offset: [0, 0, 0], size: [2.76, 0.025, 1.96], color: '#d6cba8', roughness: 0.94, metalness: 0.02 },
      { id: 'teal_geometric_motif', shape: 'box', offset: [0, 0.015, 0], size: [2.1, 0.01, 1.4], color: '#0f766e', roughness: 0.92, metalness: 0.02 },
      { id: 'curled_corner_edge', shape: 'box', offset: [1.32, 0.022, 0.92], size: [0.16, 0.02, 0.16], rotation: [-0.15, 0, 0.18], color: '#b8aa84', roughness: 0.96, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_lr_cork_coaster_90s',
    name: '1990s Ring-Stained Circular Cork Coaster',
    category: 'furniture',
    defaultDimensions: [0.22, 0.04, 0.22],
    defaultColor: '#78350f',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_lr_coasters_tray_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coasters', 'living', 'meshy_3d'],
    description: 'Simple thin circular cork coaster featuring a dark circular ring stain from a beverage glass.',
    compositeParts: [
      { id: 'cork_disc', shape: 'cylinder', offset: [0, 0, 0], size: [0.1, 0.02, 0.1], color: '#92400e', roughness: 0.95, metalness: 0.02 },
      { id: 'beverage_ring_stain', shape: 'torus', offset: [0, 0.012, 0], size: [0.065, 0.008, 0.065], rotation: [Math.PI / 2, 0, 0], color: '#451a03', roughness: 0.98, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_lr_video_game_console_90s',
    name: '1990s 8-Bit Retro Gray Video Game Console',
    category: 'appliance',
    defaultDimensions: [0.42, 0.16, 0.35],
    defaultColor: '#9ca3af',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'video_game', 'console', 'living', 'new_90s_item', 'meshy_3d'],
    description: 'Boxy rectangular 8-bit retro video game console made of unevenly yellowed matte gray plastic with dual front controller ports.',
    compositeParts: [
      { id: 'console_lower_deck', shape: 'box', offset: [0, -0.03, 0], size: [0.38, 0.07, 0.32], color: '#6b7280', roughness: 0.65, metalness: 0.15 },
      { id: 'console_yellowed_top', shape: 'box', offset: [0, 0.035, 0], size: [0.4, 0.07, 0.34], color: '#d6cba8', roughness: 0.6, metalness: 0.1 },
      { id: 'cartridge_flap_door', shape: 'box', offset: [-0.05, 0.072, 0.08], size: [0.22, 0.01, 0.12], color: '#9ca3af', roughness: 0.55, metalness: 0.15 },
      { id: 'controller_ports_front', shape: 'box', offset: [0.11, -0.01, 0.168], size: [0.1, 0.05, 0.015], color: '#18181b', roughness: 0.75, metalness: 0.2 }
    ]
  },

  // Kitchen & Dining (16 items from 1990s List)
  {
    subType: 'apt_kit_drip_coffee_maker_90s',
    name: '1990s Black Drip Coffee Maker & Stained Carafe',
    category: 'appliance',
    defaultDimensions: [0.35, 0.38, 0.32],
    defaultColor: '#18181b',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_kettle_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coffee_maker', 'kettle', 'kitchen', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy black plastic drip coffee machine with hotplate base holding a glass carafe stained with baked-on coffee residue rings.',
    compositeParts: [
      { id: 'coffee_maker_tower', shape: 'box', offset: [0, 0, -0.06], size: [0.28, 0.36, 0.16], color: '#18181b', roughness: 0.55, metalness: 0.2 },
      { id: 'filter_basket_head', shape: 'box', offset: [0, 0.1, 0.06], size: [0.24, 0.14, 0.16], color: '#27272a', roughness: 0.6, metalness: 0.15 },
      { id: 'stained_glass_carafe', shape: 'cylinder', offset: [0, -0.06, 0.06], size: [0.09, 0.16, 0.09], color: '#78350f', roughness: 0.28, metalness: 0.15 }
    ]
  },
  {
    subType: 'apt_kit_two_slice_toaster_90s',
    name: '1990s Smudged Chrome Two-Slice Bread Toaster',
    category: 'appliance',
    defaultDimensions: [0.35, 0.25, 0.22],
    defaultColor: '#cbd5e1',
    defaultTexture: 'aged_brass',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_toaster_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'toaster', 'kitchen', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy chrome-plated two-slice bread toaster with black plastic base, manual lowering lever, greasy fingerprints, and crumbs.',
    compositeParts: [
      { id: 'chrome_toaster_body', shape: 'box', offset: [0, 0.02, 0], size: [0.32, 0.19, 0.2], color: '#cbd5e1', roughness: 0.32, metalness: 0.88 },
      { id: 'black_plastic_base', shape: 'box', offset: [0, -0.09, 0], size: [0.34, 0.04, 0.21], color: '#18181b', roughness: 0.7, metalness: 0.15 },
      { id: 'toast_slots_top', shape: 'box', offset: [0, 0.118, 0], size: [0.24, 0.01, 0.1], color: '#0f172a', roughness: 0.9, metalness: 0.2 },
      { id: 'lowering_lever', shape: 'box', offset: [0.17, 0.02, 0], size: [0.03, 0.03, 0.05], color: '#18181b', roughness: 0.65, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_kit_rotary_microwave_90s',
    name: '1990s Off-White Rotary-Dial Countertop Microwave',
    category: 'appliance',
    defaultDimensions: [0.62, 0.38, 0.45],
    defaultColor: '#ede8d0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_toaster_pristine',
    soundPresetId: 'sfx_radio_static',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'microwave', 'kitchen', 'appliance', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy countertop microwave with a yellowed off-white plastic exterior, a single mechanical rotary dial timer, a push-button door release, and a smudged tinted door window.',
    compositeParts: [
      { id: 'yellowed_microwave_shell', shape: 'box', offset: [0, 0, 0], size: [0.6, 0.36, 0.42], color: '#ede8d0', roughness: 0.58, metalness: 0.15 },
      { id: 'smudged_tinted_window', shape: 'box', offset: [-0.07, 0.01, 0.215], size: [0.38, 0.26, 0.015], color: '#1e293b', roughness: 0.25, metalness: 0.2 },
      { id: 'rotary_timer_dial', shape: 'cylinder', offset: [0.21, 0.05, 0.22], size: [0.035, 0.025, 0.035], rotation: [Math.PI / 2, 0, 0], color: '#d6cba8', roughness: 0.6, metalness: 0.2 },
      { id: 'door_release_button', shape: 'box', offset: [0.21, -0.1, 0.218], size: [0.07, 0.035, 0.02], color: '#b8aa84', roughness: 0.65, metalness: 0.15 }
    ]
  },
  {
    subType: 'apt_kit_cooking_pot_90s',
    name: '1990s Scorched Aluminum Cooking Pot',
    category: 'clue_prop',
    defaultDimensions: [0.38, 0.24, 0.35],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'cooking_pot', 'kitchen', 'new_90s_item', 'meshy_3d'],
    description: 'Cylindrical aluminum cooking pot with twin black bakelite side handles, dark interior scorch marks, and mineral discoloration.',
    compositeParts: [
      { id: 'aluminum_pot_body', shape: 'cylinder', offset: [0, 0, 0], size: [0.15, 0.2, 0.15], color: '#94a3b8', roughness: 0.42, metalness: 0.82 },
      { id: 'scorched_interior', shape: 'cylinder', offset: [0, 0.06, 0], size: [0.135, 0.09, 0.135], color: '#27272a', roughness: 0.88, metalness: 0.35 },
      { id: 'bakelite_handle_l', shape: 'box', offset: [-0.17, 0.05, 0], size: [0.05, 0.025, 0.07], color: '#18181b', roughness: 0.7, metalness: 0.1 },
      { id: 'bakelite_handle_r', shape: 'box', offset: [0.17, 0.05, 0], size: [0.05, 0.025, 0.07], color: '#18181b', roughness: 0.7, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_kit_frying_pan_90s',
    name: '1990s Scratched Non-Stick Frying Pan',
    category: 'clue_prop',
    defaultDimensions: [0.45, 0.12, 0.35],
    defaultColor: '#27272a',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_skillet_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'frying_pan', 'skillet', 'kitchen', 'meshy_3d'],
    description: 'Shallow circular frying pan with long black handle and heavily scratched non-stick coating exposing silver aluminum in the center.',
    compositeParts: [
      { id: 'pan_skillet_bowl', shape: 'cylinder', offset: [-0.06, -0.02, 0], size: [0.15, 0.05, 0.15], color: '#27272a', roughness: 0.65, metalness: 0.45 },
      { id: 'scratched_silver_center', shape: 'cylinder', offset: [-0.06, 0.006, 0], size: [0.08, 0.01, 0.08], color: '#cbd5e1', roughness: 0.35, metalness: 0.88 },
      { id: 'long_black_handle', shape: 'box', offset: [0.14, 0.01, 0], size: [0.18, 0.025, 0.035], rotation: [0, 0, 0.12], color: '#18181b', roughness: 0.72, metalness: 0.15 }
    ]
  },
  {
    subType: 'apt_kit_ceramic_plate_90s',
    name: '1990s Green Vine Border Ceramic Dinner Plate',
    category: 'furniture',
    defaultDimensions: [0.35, 0.08, 0.35],
    defaultColor: '#e2e8f0',
    defaultTexture: 'checker_marble',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_dishes_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'dishes', 'plate', 'kitchen', 'meshy_3d'],
    description: 'Circular ceramic dinner plate with a faded 1990 green vine border pattern and a hairline crack running toward the center.',
    compositeParts: [
      { id: 'ceramic_plate_rim', shape: 'cylinder', offset: [0, 0, 0], size: [0.16, 0.025, 0.16], color: '#1b4332', roughness: 0.3, metalness: 0.08 },
      { id: 'ceramic_plate_well', shape: 'cylinder', offset: [0, 0.008, 0], size: [0.12, 0.02, 0.12], color: '#f1f5f9', roughness: 0.25, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_kit_drinking_glass_90s',
    name: '1990s Cloudy Hard-Water Drinking Glass Tumbler',
    category: 'furniture',
    defaultDimensions: [0.16, 0.22, 0.16],
    defaultColor: '#cbd5e1',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'glass', 'tumbler', 'kitchen', 'new_90s_item', 'meshy_3d'],
    description: 'Cylindrical clear glass tumbler with heavy base, cloudy from hard-water scaling and dried water spots.',
    compositeParts: [
      { id: 'heavy_glass_base', shape: 'cylinder', offset: [0, -0.08, 0], size: [0.06, 0.04, 0.06], color: '#94a3b8', roughness: 0.35, metalness: 0.1 },
      { id: 'cloudy_tumbler_wall', shape: 'cylinder', offset: [0, 0.02, 0], size: [0.065, 0.16, 0.065], color: '#cbd5e1', roughness: 0.45, metalness: 0.08 }
    ]
  },
  {
    subType: 'apt_kit_chef_knife_90s',
    name: "1990s Molded-Handle Stainless Chef's Knife",
    category: 'clue_prop',
    defaultDimensions: [0.35, 0.06, 0.12],
    defaultColor: '#94a3b8',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_cutlery_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'knife', 'cutlery', 'kitchen', 'clue_prop', 'meshy_3d'],
    description: "Low-poly chef's knife with dull stainless steel blade, light surface smudging, and black molded plastic handle with two silver rivets.",
    compositeParts: [
      { id: 'stainless_blade', shape: 'box', offset: [-0.06, 0, 0], size: [0.2, 0.01, 0.045], color: '#cbd5e1', roughness: 0.32, metalness: 0.88 },
      { id: 'molded_black_handle', shape: 'box', offset: [0.09, 0, 0], size: [0.12, 0.024, 0.032], color: '#18181b', roughness: 0.7, metalness: 0.15 }
    ]
  },
  {
    subType: 'apt_kit_plastic_dish_rack_90s',
    name: '1990s Slatted Dingy White Plastic Dish Rack',
    category: 'furniture',
    defaultDimensions: [0.6, 0.32, 0.45],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_dish_rack_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'dish_rack', 'kitchen', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Rectangular slatted plastic dish-drying rack in dingy faded white with dark mildew spotting along the drain tray corners.',
    compositeParts: [
      { id: 'drain_tray_base', shape: 'box', offset: [0, -0.12, 0], size: [0.58, 0.03, 0.42], color: '#cbd5e1', roughness: 0.65, metalness: 0.05 },
      { id: 'slatted_rack_basket', shape: 'box', offset: [0, 0.02, 0], size: [0.54, 0.22, 0.38], color: '#e2e8f0', roughness: 0.6, metalness: 0.05 },
      { id: 'mildew_corner_spot', shape: 'box', offset: [0.22, -0.1, 0.16], size: [0.09, 0.015, 0.08], color: '#334155', roughness: 0.95, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_kit_pedal_trash_can_90s',
    name: '1990s Cylindrical White Step-Pedal Trash Can',
    category: 'furniture',
    defaultDimensions: [0.45, 0.78, 0.45],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_trash_can_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'trash', 'kitchen', 'meshy_3d'],
    description: 'Tall cylindrical white plastic trash can with step-pedal lid mechanism and dark scuff streaks near the base.',
    compositeParts: [
      { id: 'cylindrical_bin', shape: 'cylinder', offset: [0, -0.03, 0], size: [0.19, 0.68, 0.19], color: '#e2e8f0', roughness: 0.55, metalness: 0.08 },
      { id: 'domed_hinge_lid', shape: 'cylinder', offset: [0, 0.34, 0], size: [0.2, 0.06, 0.2], color: '#f8fafc', roughness: 0.5, metalness: 0.08 },
      { id: 'step_pedal_bar', shape: 'box', offset: [0, -0.34, 0.2], size: [0.1, 0.03, 0.06], color: '#334155', roughness: 0.7, metalness: 0.3 }
    ]
  },
  {
    subType: 'apt_kit_fridge_magnet_90s',
    name: '1990s Peeling Local Business Fridge Magnet',
    category: 'clue_prop',
    defaultDimensions: [0.3, 0.3, 0.04],
    defaultColor: '#0284c7',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_magnets_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'magnets', 'kitchen', 'clue_prop', 'meshy_3d'],
    description: 'Rectangular promotional sheet magnet with a faded 1990 local business logo and curling corners.',
    compositeParts: [
      { id: 'sheet_magnet_backing', shape: 'box', offset: [0, 0, 0], size: [0.26, 0.18, 0.015], color: '#18181b', roughness: 0.85, metalness: 0.2 },
      { id: 'printed_promo_face', shape: 'box', offset: [0, 0, 0.01], size: [0.25, 0.17, 0.008], color: '#0284c7', roughness: 0.6, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_kit_paper_towel_holder_90s',
    name: '1990s Yellowed Plastic Paper Towel Spindle',
    category: 'furniture',
    defaultDimensions: [0.32, 0.35, 0.22],
    defaultColor: '#fef9c3',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_paper_towel_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'paper_towel', 'kitchen', 'meshy_3d'],
    description: 'Countertop vertical spindle paper towel holder made of cheap white plastic yellowed with age.',
    compositeParts: [
      { id: 'circular_plastic_base', shape: 'cylinder', offset: [0, -0.15, 0], size: [0.11, 0.025, 0.11], color: '#fef08a', roughness: 0.55, metalness: 0.08 },
      { id: 'vertical_spindle_rod', shape: 'cylinder', offset: [0, 0.02, 0], size: [0.018, 0.32, 0.018], color: '#fde047', roughness: 0.5, metalness: 0.1 },
      { id: 'paper_towel_roll', shape: 'cylinder', offset: [0, -0.01, 0], size: [0.075, 0.24, 0.075], color: '#f8fafc', roughness: 0.9, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_kit_quilted_oven_mitt_90s',
    name: '1990s Scorched Plaid Quilted Oven Mitt',
    category: 'clue_prop',
    defaultDimensions: [0.26, 0.34, 0.08],
    defaultColor: '#1e3a8a',
    defaultTexture: 'wallpaper_damask',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_oven_mitts_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'oven_mitts', 'kitchen', 'meshy_3d'],
    description: 'Hand-shaped quilted fabric oven mitt with a faded 1990 plaid pattern and a dark scorched burn mark on the palm (Meshy.ai cloth mesh).',
    compositeParts: [
      { id: 'mitt_main_glove', shape: 'box', offset: [0.02, 0, 0], size: [0.16, 0.3, 0.06], color: '#1e3a8a', roughness: 0.9, metalness: 0.02 },
      { id: 'mitt_thumb_lobe', shape: 'box', offset: [-0.07, -0.02, 0], size: [0.07, 0.12, 0.05], rotation: [0, 0, 0.45], color: '#1e3a8a', roughness: 0.9, metalness: 0.02 },
      { id: 'scorched_palm_mark', shape: 'cylinder', offset: [0.02, 0.03, 0.032], size: [0.05, 0.008, 0.05], rotation: [Math.PI / 2, 0, 0], color: '#27272a', roughness: 0.96, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_kit_plastic_container_90s',
    name: '1990s Tomato-Stained Plastic Food Container',
    category: 'furniture',
    defaultDimensions: [0.42, 0.25, 0.35],
    defaultColor: '#fb923c',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_containers_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'containers', 'kitchen', 'meshy_3d'],
    description: 'Rectangular translucent plastic food storage container stained light orange from old tomato sauce with a mismatched opaque red lid.',
    compositeParts: [
      { id: 'tomato_stained_tub', shape: 'box', offset: [0, -0.02, 0], size: [0.34, 0.16, 0.26], color: '#fb923c', roughness: 0.4, metalness: 0.08 },
      { id: 'mismatched_red_lid', shape: 'box', offset: [0.01, 0.07, 0], size: [0.36, 0.025, 0.28], rotation: [0, 0.05, 0], color: '#dc2626', roughness: 0.5, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_kit_wooden_spice_rack_90s',
    name: '1990s Two-Tier Dark Wood Spice Rack & Jars',
    category: 'furniture',
    defaultDimensions: [0.45, 0.4, 0.15],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_spice_rack_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'spice_rack', 'kitchen', 'meshy_3d'],
    description: 'Two-tier wall-mounted dark stained wooden spice rack holding four cylindrical glass jars with peeling paper labels.',
    compositeParts: [
      { id: 'wood_rack_frame', shape: 'box', offset: [0, 0, -0.04], size: [0.42, 0.38, 0.04], color: '#3b2314', roughness: 0.72, metalness: 0.08 },
      { id: 'shelf_tier_lower', shape: 'box', offset: [0, -0.12, 0.01], size: [0.4, 0.03, 0.1], color: '#4a2c17', roughness: 0.7, metalness: 0.08 },
      { id: 'shelf_tier_upper', shape: 'box', offset: [0, 0.06, 0.01], size: [0.4, 0.03, 0.1], color: '#4a2c17', roughness: 0.7, metalness: 0.08 },
      { id: 'spice_jar_1', shape: 'cylinder', offset: [-0.11, 0.13, 0.01], size: [0.032, 0.1, 0.032], color: '#d97706', roughness: 0.35, metalness: 0.1 },
      { id: 'spice_jar_2', shape: 'cylinder', offset: [0.11, 0.13, 0.01], size: [0.032, 0.1, 0.032], color: '#65a30d', roughness: 0.35, metalness: 0.1 },
      { id: 'spice_jar_3', shape: 'cylinder', offset: [-0.11, -0.05, 0.01], size: [0.032, 0.1, 0.032], color: '#991b1b', roughness: 0.35, metalness: 0.1 },
      { id: 'spice_jar_4', shape: 'cylinder', offset: [0.11, -0.05, 0.01], size: [0.032, 0.1, 0.032], color: '#fef3c7', roughness: 0.35, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_kit_synthetic_sponge_90s',
    name: '1990s Frayed Yellow & Green Kitchen Sponge',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.12, 0.16],
    defaultColor: '#ca8a04',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_kit_sponge_soap_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'sponge', 'kitchen', 'meshy_3d'],
    description: 'Rectangular synthetic kitchen sponge with torn abrasive green scrubbing layer and compressed, stained yellow foam body.',
    compositeParts: [
      { id: 'yellow_foam_body', shape: 'box', offset: [0, -0.015, 0], size: [0.18, 0.05, 0.12], color: '#eab308', roughness: 0.94, metalness: 0.01 },
      { id: 'green_scouring_pad', shape: 'box', offset: [0, 0.02, 0], size: [0.175, 0.02, 0.115], color: '#15803d', roughness: 0.98, metalness: 0.01 }
    ]
  },

  // Bedroom (10 items from 1990s List)
  {
    subType: 'apt_bed_frame_metal_90s',
    name: '1990s Angle-Iron Black Metal Bed Frame',
    category: 'furniture',
    defaultDimensions: [2.0, 0.45, 2.2],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_platform_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'bed_frame', 'bedroom', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Minimalist rectangular bed frame made of angle-iron black metal rails showing light scuffs and missing corner paint.',
    compositeParts: [
      { id: 'rail_left', shape: 'box', offset: [-0.94, 0.02, 0], size: [0.06, 0.08, 2.14], color: '#18181b', roughness: 0.55, metalness: 0.8 },
      { id: 'rail_right', shape: 'box', offset: [0.94, 0.02, 0], size: [0.06, 0.08, 2.14], color: '#18181b', roughness: 0.55, metalness: 0.8 },
      { id: 'rail_head', shape: 'box', offset: [0, 0.02, -1.04], size: [1.94, 0.08, 0.06], color: '#18181b', roughness: 0.55, metalness: 0.8 },
      { id: 'rail_foot', shape: 'box', offset: [0, 0.02, 1.04], size: [1.94, 0.08, 0.06], color: '#27272a', roughness: 0.6, metalness: 0.75 }
    ]
  },
  {
    subType: 'apt_bed_pillow_90s',
    name: '1990s Wrinkled Off-White Sleeping Pillow',
    category: 'furniture',
    defaultDimensions: [1.5, 0.28, 0.52],
    defaultColor: '#e5ded0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_pillows_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'pillows', 'bedroom', 'meshy_3d'],
    description: 'Soft rectangular sleeping pillow enclosed in a wrinkled off-white pillowcase with a faint yellowish stain (Meshy.ai soft-body mesh).',
    compositeParts: [
      { id: 'pillow_left', shape: 'box', offset: [-0.36, 0, 0], size: [0.64, 0.2, 0.44], color: '#e5ded0', roughness: 0.88, metalness: 0.02 },
      { id: 'pillow_right_stained', shape: 'box', offset: [0.36, 0, 0], size: [0.64, 0.2, 0.44], color: '#dfd3b6', roughness: 0.9, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_bed_quilted_comforter_90s',
    name: '1990s Watercolor Pastel Teal & Pink Comforter',
    category: 'furniture',
    defaultDimensions: [1.9, 0.26, 2.1],
    defaultColor: '#134e4a',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_comforter_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'comforter', 'bedroom', 'meshy_3d'],
    description: 'Heavy rectangular comforter drapery featuring a faded 1990 watercolor abstract design in pastel teal and pink (Meshy.ai cloth mesh).',
    compositeParts: [
      { id: 'comforter_drape_sheet', shape: 'box', offset: [0, 0, 0], size: [1.86, 0.2, 2.04], color: '#134e4a', roughness: 0.88, metalness: 0.02 },
      { id: 'pastel_pink_stripe', shape: 'box', offset: [0, 0.105, 0.15], size: [1.84, 0.015, 0.65], color: '#d88c9a', roughness: 0.88, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_bed_veneered_nightstand_90s',
    name: '1990s Chipped Dark-Veneered Particle-Board Nightstand',
    category: 'furniture',
    defaultDimensions: [0.65, 0.65, 0.55],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_nightstand_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'nightstand', 'bedroom', 'furniture', 'meshy_3d', 'visual_design_variant'],
    description: 'Small, boxy single-drawer bedside table constructed from dark-veneered particle board, featuring a chipped front laminate edge exposing raw porous wood beneath.',
    compositeParts: [
      { id: 'nightstand_carcass', shape: 'box', offset: [0, 0, 0], size: [0.62, 0.62, 0.52], color: '#3b2314', roughness: 0.72, metalness: 0.08 },
      { id: 'single_top_drawer', shape: 'box', offset: [0, 0.16, 0.265], size: [0.54, 0.18, 0.02], color: '#4a2c17', roughness: 0.68, metalness: 0.1 },
      { id: 'chipped_raw_edge', shape: 'box', offset: [0.18, 0.3, 0.265], size: [0.18, 0.025, 0.02], color: '#a88b73', roughness: 0.95, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_bed_ceramic_lamp_90s',
    name: '1990s Dusty-Rose Ceramic Bedside Lamp',
    category: 'lighting',
    defaultDimensions: [0.42, 0.68, 0.42],
    defaultColor: '#9f5f68',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_lamp_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'lamp', 'bedroom', 'lighting', 'meshy_3d'],
    description: 'Small table lamp with a rounded ceramic base glazed in faded dusty-rose and a slightly dented white fabric drum shade.',
    compositeParts: [
      { id: 'dusty_rose_ceramic_urn', shape: 'sphere', offset: [0, -0.14, 0], size: [0.14, 0.26, 0.14], color: '#9f5f68', roughness: 0.32, metalness: 0.12 },
      { id: 'dented_drum_shade', shape: 'cylinder', offset: [0, 0.16, 0], size: [0.19, 0.26, 0.19], color: '#f8fafc', emissive: '#fef3c7', roughness: 0.85, metalness: 0.04 }
    ]
  },
  {
    subType: 'apt_bed_plastic_hanger_90s',
    name: '1990s Dingy White Tubular Plastic Hanger',
    category: 'furniture',
    defaultDimensions: [0.65, 0.35, 0.15],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_hangers_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hangers', 'bedroom', 'meshy_3d'],
    description: 'Triangular molded tubular plastic clothes hanger in dingy white with thin stress marks near the neck hook.',
    compositeParts: [
      { id: 'hanger_bottom_bar', shape: 'box', offset: [0, -0.08, 0], size: [0.46, 0.02, 0.02], color: '#e2e8f0', roughness: 0.55, metalness: 0.05 },
      { id: 'hanger_neck_hook', shape: 'cylinder', offset: [0, 0.1, 0], size: [0.015, 0.12, 0.015], color: '#cbd5e1', roughness: 0.5, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_bed_four_drawer_dresser_90s',
    name: '1990s Dark-Veneered 4-Drawer Particle-Board Dresser',
    category: 'furniture',
    defaultDimensions: [1.25, 1.15, 0.62],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_dresser_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'dresser', 'storage', 'bedroom', 'furniture', 'meshy_3d', 'visual_design_variant'],
    description: 'Large, blocky four-drawer chest made of dark-veneered particle board, with one bottom plastic drawer handle cracked in half and missing its right side.',
    compositeParts: [
      { id: 'dresser_cabinet', shape: 'box', offset: [0, 0, 0], size: [1.22, 1.12, 0.58], color: '#3b2314', roughness: 0.72, metalness: 0.08 },
      { id: 'drawer_face_1', shape: 'box', offset: [0, 0.36, 0.295], size: [1.12, 0.22, 0.02], color: '#4a2c17', roughness: 0.68, metalness: 0.1 },
      { id: 'drawer_face_2', shape: 'box', offset: [0, 0.12, 0.295], size: [1.12, 0.22, 0.02], color: '#4a2c17', roughness: 0.68, metalness: 0.1 },
      { id: 'drawer_face_3', shape: 'box', offset: [0, -0.12, 0.295], size: [1.12, 0.22, 0.02], color: '#4a2c17', roughness: 0.68, metalness: 0.1 },
      { id: 'drawer_face_4', shape: 'box', offset: [0, -0.36, 0.295], size: [1.12, 0.22, 0.02], color: '#4a2c17', roughness: 0.68, metalness: 0.1 },
      { id: 'cracked_bottom_handle_left', shape: 'box', offset: [-0.05, -0.36, 0.312], size: [0.08, 0.025, 0.02], color: '#18181b', roughness: 0.75, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_bed_wicker_hamper_90s',
    name: '1990s Frayed Woven Wicker Laundry Hamper',
    category: 'furniture',
    defaultDimensions: [0.58, 0.88, 0.58],
    defaultColor: '#92400e',
    defaultTexture: 'oak_parquet',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_hamper_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hamper', 'laundry', 'bedroom', 'meshy_3d'],
    description: 'Tall cylindrical woven wicker laundry basket with flat lid and broken wicker strands sticking outward (Meshy.ai woven mesh).',
    compositeParts: [
      { id: 'wicker_basket_cylinder', shape: 'cylinder', offset: [0, -0.02, 0], size: [0.26, 0.78, 0.26], color: '#92400e', roughness: 0.92, metalness: 0.03 },
      { id: 'wicker_flat_lid', shape: 'cylinder', offset: [0, 0.4, 0], size: [0.27, 0.05, 0.27], color: '#78350f', roughness: 0.9, metalness: 0.03 }
    ]
  },
  {
    subType: 'apt_bed_wall_mirror_90s',
    name: '1990s Laminate-Framed Desilvered Wall Mirror',
    category: 'furniture',
    defaultDimensions: [1.1, 0.95, 0.08],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bed_mirror_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'mirror', 'bedroom', 'meshy_3d'],
    description: 'Vertical rectangular mirror panel in a dark wood-grained laminate frame with silvering degradation spots along the lower border.',
    compositeParts: [
      { id: 'laminate_mirror_frame', shape: 'box', offset: [0, 0, 0], size: [1.08, 0.92, 0.05], color: '#3b2314', roughness: 0.65, metalness: 0.1 },
      { id: 'mirror_glass_plate', shape: 'box', offset: [0, 0, 0.028], size: [0.96, 0.8, 0.01], color: '#cbd5e1', roughness: 0.08, metalness: 0.92 },
      { id: 'desilvered_bottom_spot', shape: 'box', offset: [0.22, -0.35, 0.033], size: [0.28, 0.06, 0.005], color: '#3f3f46', roughness: 0.85, metalness: 0.2 }
    ]
  },

  // Bathroom (9 items from 1990s List)
  {
    subType: 'apt_bath_vinyl_shower_curtain_90s',
    name: '1990s Pastel Seashell Vinyl Shower Curtain',
    category: 'furniture',
    defaultDimensions: [1.8, 2.1, 0.1],
    defaultColor: '#99f6e4',
    defaultTexture: 'checker_marble',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_shower_curtain_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'shower_curtain', 'bathroom', 'meshy_3d'],
    description: 'Hanging vinyl shower curtain featuring a faded 1990 pastel seashell motif and yellowish soap scum at the bottom hem (Meshy.ai cloth mesh).',
    compositeParts: [
      { id: 'vinyl_curtain_sheet', shape: 'box', offset: [0, 0, 0], size: [1.76, 1.98, 0.04], color: '#99f6e4', roughness: 0.35, metalness: 0.08 },
      { id: 'soap_scum_hem', shape: 'box', offset: [0, -0.92, 0.005], size: [1.76, 0.16, 0.045], color: '#fde047', roughness: 0.78, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_bath_shower_curtain_ring_90s',
    name: '1990s Molded White Plastic Curtain Ring Set',
    category: 'furniture',
    defaultDimensions: [1.6, 0.12, 0.12],
    defaultColor: '#e5e7eb',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'shower_ring', 'bathroom', 'new_90s_item', 'meshy_3d'],
    description: 'Simple C-shaped circular shower curtain ring molded from cheap white plastic.',
    compositeParts: [
      { id: 'curtain_rod_bar', shape: 'cylinder', offset: [0, 0, 0], size: [0.018, 1.56, 0.018], rotation: [0, 0, Math.PI / 2], color: '#cbd5e1', roughness: 0.3, metalness: 0.8 },
      { id: 'c_ring_1', shape: 'torus', offset: [-0.5, 0, 0], size: [0.04, 0.008, 0.04], color: '#f8fafc', roughness: 0.5, metalness: 0.05 },
      { id: 'c_ring_2', shape: 'torus', offset: [0, 0, 0], size: [0.04, 0.008, 0.04], color: '#f8fafc', roughness: 0.5, metalness: 0.05 },
      { id: 'c_ring_3', shape: 'torus', offset: [0.5, 0, 0], size: [0.04, 0.008, 0.04], color: '#f8fafc', roughness: 0.5, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_bath_plush_mat_90s',
    name: '1990s Matted Hunter-Green Plush Bath Mat',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.05, 0.65],
    defaultColor: '#1b4332',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_mat_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'bath_mat', 'bathroom', 'meshy_3d'],
    description: 'Small rectangular shaggy bathroom floor mat in faded 1990 hunter green with the pile flattened and matted down in the center.',
    compositeParts: [
      { id: 'shaggy_green_mat', shape: 'box', offset: [0, 0, 0], size: [0.92, 0.035, 0.62], color: '#1b4332', roughness: 0.95, metalness: 0.02 },
      { id: 'matted_center_oval', shape: 'cylinder', offset: [0, 0.015, 0], size: [0.24, 0.01, 0.24], color: '#143325', roughness: 0.98, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_bath_toothbrush_holder_90s',
    name: '1990s Cream Ceramic 4-Slot Toothbrush Holder',
    category: 'clue_prop',
    defaultDimensions: [0.22, 0.25, 0.22],
    defaultColor: '#e5ded0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_toothbrush_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'toothbrush', 'bathroom', 'meshy_3d'],
    description: 'Small ceramic tumbler-style toothbrush holder with four top slots in dull cream glaze with dried white toothpaste residue drips.',
    compositeParts: [
      { id: 'ceramic_tumbler_body', shape: 'cylinder', offset: [0, 0, 0], size: [0.075, 0.22, 0.075], color: '#e5ded0', roughness: 0.35, metalness: 0.1 },
      { id: 'toothpaste_drip_crust', shape: 'box', offset: [0.06, -0.02, 0.04], size: [0.025, 0.09, 0.02], color: '#f8fafc', roughness: 0.85, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_bath_soap_dispenser_90s',
    name: '1990s Clear Plastic Pump Liquid Soap Dispenser',
    category: 'clue_prop',
    defaultDimensions: [0.2, 0.24, 0.2],
    defaultColor: '#cbd5e1',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_soap_dish_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'soap', 'bathroom', 'meshy_3d'],
    description: 'Clear cylindrical plastic liquid hand soap bottle with white plastic pump mechanism and partially peeled water-damaged label.',
    compositeParts: [
      { id: 'clear_soap_bottle', shape: 'cylinder', offset: [0, -0.03, 0], size: [0.065, 0.16, 0.065], color: '#cbd5e1', roughness: 0.25, metalness: 0.1 },
      { id: 'white_pump_head', shape: 'box', offset: [0.02, 0.08, 0], size: [0.07, 0.04, 0.03], color: '#f8fafc', roughness: 0.5, metalness: 0.08 }
    ]
  },
  {
    subType: 'apt_bath_toilet_brush_90s',
    name: '1990s White Plastic Toilet Brush & Cup Holder',
    category: 'furniture',
    defaultDimensions: [0.24, 0.45, 0.24],
    defaultColor: '#e2e8f0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_toilet_paper_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'toilet_brush', 'bathroom', 'meshy_3d'],
    description: 'Cheap white plastic toilet cleaning brush with splayed bristles sitting inside a matching cylindrical plastic holder cup.',
    compositeParts: [
      { id: 'plastic_holder_cup', shape: 'cylinder', offset: [0, -0.1, 0], size: [0.085, 0.22, 0.085], color: '#e2e8f0', roughness: 0.55, metalness: 0.05 },
      { id: 'brush_handle_wand', shape: 'cylinder', offset: [0, 0.08, 0], size: [0.016, 0.28, 0.016], color: '#f8fafc', roughness: 0.5, metalness: 0.05 }
    ]
  },
  {
    subType: 'apt_bath_handheld_hairdryer_90s',
    name: '1990s Off-White Handheld Hairdryer & Coiled Cord',
    category: 'appliance',
    defaultDimensions: [0.35, 0.28, 0.16],
    defaultColor: '#e5ded0',
    defaultTexture: 'plaster_cream',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_hairdryer_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'hairdryer', 'bathroom', 'meshy_3d', 'visual_design_variant'],
    description: 'Boxy handheld off-white plastic hair dryer with thick black coiled power cord and grey lint blocking the intake grill (Meshy.ai mesh).',
    compositeParts: [
      { id: 'blower_nozzle_barrel', shape: 'cylinder', offset: [-0.04, 0.05, 0], size: [0.05, 0.22, 0.05], rotation: [0, 0, Math.PI / 2], color: '#e5ded0', roughness: 0.5, metalness: 0.1 },
      { id: 'pistol_grip_handle', shape: 'box', offset: [0.04, -0.05, 0], size: [0.045, 0.16, 0.04], rotation: [0, 0, -0.25], color: '#d6cba8', roughness: 0.55, metalness: 0.1 },
      { id: 'coiled_black_cord', shape: 'cylinder', offset: [0.1, -0.1, 0], size: [0.03, 0.12, 0.03], color: '#18181b', roughness: 0.85, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_bath_small_wastebasket_90s',
    name: '1990s Scuffed Dark Grey Plastic Wastebasket',
    category: 'furniture',
    defaultDimensions: [0.35, 0.42, 0.3],
    defaultColor: '#374151',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_wastebasket_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'wastebasket', 'bathroom', 'meshy_3d'],
    description: 'Open-top rectangular plastic bathroom trash bin in dark grey showing surface scuffs and scratches along the sides.',
    compositeParts: [
      { id: 'rectangular_bin_body', shape: 'box', offset: [0, 0, 0], size: [0.32, 0.4, 0.26], color: '#374151', roughness: 0.68, metalness: 0.1 },
      { id: 'bin_top_rim', shape: 'box', offset: [0, 0.19, 0], size: [0.34, 0.03, 0.28], color: '#4b5563', roughness: 0.6, metalness: 0.12 }
    ]
  },
  {
    subType: 'apt_bath_first_aid_kit_90s',
    name: '1990s White Tin First-Aid Box with Red Cross',
    category: 'clue_prop',
    defaultDimensions: [0.42, 0.35, 0.18],
    defaultColor: '#e5e7eb',
    defaultTexture: 'plaster_cream',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_first_aid_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'first_aid', 'bathroom', 'clue_prop', 'meshy_3d'],
    description: 'Rectangular white tin box with faded red cross emblem printed on the lid and orange oxidation on the metal latches.',
    compositeParts: [
      { id: 'white_tin_case', shape: 'box', offset: [0, 0, 0], size: [0.38, 0.3, 0.14], color: '#e5e7eb', roughness: 0.45, metalness: 0.55 },
      { id: 'red_cross_horiz', shape: 'box', offset: [0, 0, 0.073], size: [0.14, 0.045, 0.008], color: '#dc2626', roughness: 0.5, metalness: 0.2 },
      { id: 'red_cross_vert', shape: 'box', offset: [0, 0, 0.073], size: [0.045, 0.14, 0.008], color: '#dc2626', roughness: 0.5, metalness: 0.2 },
      { id: 'rusted_top_latches', shape: 'box', offset: [0, 0.155, 0.03], size: [0.22, 0.02, 0.04], color: '#9a3412', roughness: 0.85, metalness: 0.6 }
    ]
  },
  {
    subType: 'apt_bath_towels_90s',
    name: '1990s Hunter Green & White Hotel Bath Towels',
    category: 'furniture',
    defaultDimensions: [0.75, 0.85, 0.2],
    defaultColor: '#1b4332',
    defaultTexture: 'velvet_crimson',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_bath_towels_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'towels', 'bathroom', 'meshy_3d'],
    description: 'Folded hunter-green and white commercial hotel terrycloth bath towels hung across a polished chrome rail.',
    compositeParts: [
      { id: 'chrome_towel_bar', shape: 'cylinder', offset: [0, 0.34, 0], size: [0.018, 0.72, 0.018], rotation: [0, 0, Math.PI / 2], color: '#e2e8f0', roughness: 0.2, metalness: 0.92 },
      { id: 'hunter_green_towel', shape: 'box', offset: [-0.14, -0.02, 0.02], size: [0.3, 0.68, 0.08], color: '#1b4332', roughness: 0.92, metalness: 0.02 },
      { id: 'white_hand_towel', shape: 'box', offset: [0.16, 0.08, 0.03], size: [0.24, 0.48, 0.08], color: '#f8fafc', roughness: 0.9, metalness: 0.02 }
    ]
  },

  // Entryway & Utility (7 items from 1990s List)
  {
    subType: 'apt_ent_wooden_key_rack_90s',
    name: '1990s Scratched Wood Plank Brass Hook Key Rack',
    category: 'furniture',
    defaultDimensions: [0.45, 0.2, 0.12],
    defaultColor: '#3b2314',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_key_rack_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'keys', 'entryway', 'meshy_3d'],
    description: 'Horizontal rectangular wood plank with scratched dark varnish and three small L-shaped brass key hooks.',
    compositeParts: [
      { id: 'wood_plank_backing', shape: 'box', offset: [0, 0, 0], size: [0.42, 0.16, 0.04], color: '#3b2314', roughness: 0.7, metalness: 0.08 },
      { id: 'brass_hook_1', shape: 'box', offset: [-0.12, -0.02, 0.035], size: [0.02, 0.04, 0.04], color: '#b59449', roughness: 0.4, metalness: 0.85 },
      { id: 'brass_hook_2', shape: 'box', offset: [0, -0.02, 0.035], size: [0.02, 0.04, 0.04], color: '#b59449', roughness: 0.4, metalness: 0.85 },
      { id: 'brass_hook_3', shape: 'box', offset: [0.12, -0.02, 0.035], size: [0.02, 0.04, 0.04], color: '#b59449', roughness: 0.4, metalness: 0.85 }
    ]
  },
  {
    subType: 'apt_ent_rubber_doormat_90s',
    name: '1990s Rubber-Bordered Coir Entryway Doormat',
    category: 'floor_tile',
    defaultDimensions: [0.95, 0.04, 0.65],
    defaultColor: '#451a03',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_doormat_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'doormat', 'entryway', 'meshy_3d'],
    description: 'Low rectangular entryway mat made of coarse brown coir fiber with a black rubber border and worn mud-caked center.',
    compositeParts: [
      { id: 'black_rubber_border', shape: 'box', offset: [0, 0, 0], size: [0.92, 0.025, 0.62], color: '#18181b', roughness: 0.88, metalness: 0.05 },
      { id: 'coir_fiber_insert', shape: 'box', offset: [0, 0.01, 0], size: [0.8, 0.02, 0.5], color: '#78350f', roughness: 0.98, metalness: 0.01 }
    ]
  },
  {
    subType: 'apt_ent_collapsed_umbrella_90s',
    name: '1990s Collapsed Black Umbrella with J-Handle',
    category: 'furniture',
    defaultDimensions: [0.3, 0.9, 0.3],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_umbrella_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'umbrella', 'entryway', 'meshy_3d'],
    description: 'Closed collapsed personal umbrella with dark fabric canopy wrapped around a metal shaft and curved black plastic J-handle (Meshy.ai mesh).',
    compositeParts: [
      { id: 'folded_canopy_cone', shape: 'cone', offset: [0, -0.05, 0], size: [0.06, 0.62, 0.06], color: '#18181b', roughness: 0.82, metalness: 0.05 },
      { id: 'curved_j_handle', shape: 'torus', offset: [0.03, 0.3, 0], size: [0.04, 0.012, 0.04], color: '#09090b', roughness: 0.5, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_ent_upright_vacuum_90s',
    name: '1990s Hunter-Green Upright Bag Vacuum Cleaner',
    category: 'appliance',
    defaultDimensions: [0.45, 1.2, 0.45],
    defaultColor: '#1b4332',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_vacuum_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'vacuum', 'cleaning', 'entryway', 'meshy_3d'],
    description: 'Heavy 1990 upright bag-style vacuum cleaner in dark hunter-green and black hard plastic with a dusty zip-up fabric debris bag (Meshy.ai complex mesh).',
    compositeParts: [
      { id: 'vacuum_motor_hood', shape: 'box', offset: [0, -0.48, 0.08], size: [0.38, 0.16, 0.32], color: '#1b4332', roughness: 0.55, metalness: 0.18 },
      { id: 'zip_up_debris_bag', shape: 'cylinder', offset: [0, 0.02, -0.04], size: [0.11, 0.68, 0.11], color: '#143325', roughness: 0.9, metalness: 0.04 },
      { id: 'upright_handle_stalk', shape: 'cylinder', offset: [0, 0.15, -0.1], size: [0.02, 0.95, 0.02], color: '#18181b', roughness: 0.5, metalness: 0.4 }
    ]
  },
  {
    subType: 'apt_ent_straw_broom_90s',
    name: '1990s Wire-Bound Coarse Straw Broom',
    category: 'clue_prop',
    defaultDimensions: [0.38, 1.35, 0.15],
    defaultColor: '#ca8a04',
    defaultTexture: 'oak_parquet',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_cleaning_supplies_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'broom', 'cleaning', 'entryway', 'meshy_3d', 'visual_design_variant'],
    description: 'Traditional broom with unpainted wooden handle and a fan of coarse yellowish straw bristles bound with wire (Meshy.ai mesh).',
    compositeParts: [
      { id: 'wooden_broomstick', shape: 'cylinder', offset: [0, 0.18, 0], size: [0.018, 0.95, 0.018], color: '#a16207', roughness: 0.8, metalness: 0.05 },
      { id: 'straw_bristle_fan', shape: 'box', offset: [0, -0.44, 0], size: [0.32, 0.38, 0.08], color: '#ca8a04', roughness: 0.95, metalness: 0.02 }
    ]
  },
  {
    subType: 'apt_ent_plastic_dustpan_90s',
    name: '1990s Warped Dark Blue Plastic Hand Dustpan',
    category: 'clue_prop',
    defaultDimensions: [0.32, 0.12, 0.35],
    defaultColor: '#1e3a8a',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_cleaning_supplies_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'dustpan', 'cleaning', 'entryway', 'new_90s_item', 'meshy_3d', 'visual_design_variant'],
    description: 'Hand-held dark blue plastic dustpan with a slightly warped and nicked leading collection edge.',
    compositeParts: [
      { id: 'dustpan_tray', shape: 'box', offset: [0, -0.02, 0.04], size: [0.28, 0.04, 0.22], color: '#1e3a8a', roughness: 0.65, metalness: 0.1 },
      { id: 'dustpan_handle', shape: 'box', offset: [0, 0.01, -0.11], size: [0.05, 0.03, 0.12], color: '#172554', roughness: 0.65, metalness: 0.1 }
    ]
  },
  {
    subType: 'apt_ent_shoe_rack_90s',
    name: '1990s Two-Tier Black Tubular Plastic Shoe Rack',
    category: 'furniture',
    defaultDimensions: [0.85, 0.42, 0.35],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: false,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_shoe_tray_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'shoes', 'entryway', 'meshy_3d'],
    description: 'Low-poly two-tier shoe storage frame made of thin black plastic tubes with footwear dirt smudges on the bars.',
    compositeParts: [
      { id: 'side_frame_l', shape: 'box', offset: [-0.38, 0, 0], size: [0.03, 0.38, 0.3], color: '#18181b', roughness: 0.65, metalness: 0.15 },
      { id: 'side_frame_r', shape: 'box', offset: [0.38, 0, 0], size: [0.03, 0.38, 0.3], color: '#18181b', roughness: 0.65, metalness: 0.15 },
      { id: 'tube_bars_lower', shape: 'box', offset: [0, -0.1, 0], size: [0.76, 0.025, 0.22], color: '#27272a', roughness: 0.75, metalness: 0.2 },
      { id: 'tube_bars_upper', shape: 'box', offset: [0, 0.1, 0], size: [0.76, 0.025, 0.22], color: '#27272a', roughness: 0.75, metalness: 0.2 }
    ]
  },
  {
    subType: 'apt_ent_coat_rack_90s',
    name: '1990s Black Tubular Steel Coat & Hat Stand',
    category: 'furniture',
    defaultDimensions: [0.6, 1.9, 0.6],
    defaultColor: '#18181b',
    defaultTexture: 'industrial_concrete',
    collidable: true,
    era: '1990s',
    conditionVariant: 'updated',
    canUpdateInHotel: true,
    predecessor1978Id: 'apt_ent_coat_rack_pristine',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'coat_rack', 'entryway', 'meshy_3d'],
    description: '1990s matte-black powder-coated tubular steel hall tree coat stand with rounded plastic peg tips.',
    compositeParts: [
      { id: 'coat_stand_base', shape: 'cylinder', offset: [0, -0.9, 0], size: [0.26, 0.05, 0.26], color: '#18181b', roughness: 0.55, metalness: 0.75 },
      { id: 'central_steel_pole', shape: 'cylinder', offset: [0, 0, 0], size: [0.03, 1.78, 0.03], color: '#18181b', roughness: 0.45, metalness: 0.8 },
      { id: 'peg_crown_hooks', shape: 'box', offset: [0, 0.75, 0], size: [0.36, 0.04, 0.36], color: '#27272a', roughness: 0.5, metalness: 0.7 }
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
  },
  {
    id: 'set_apt_updated_90s_new_items_collection',
    name: "1990s Complete Imported Props & Appliances Set",
    description: 'Comprehensive 1990s asset set bundling the newly imported 90s items: 8-bit retro video game console, ficus houseplant, dusty-rose throw pillow, drip coffee maker, scorched cooking pot, green vine plate, watercolor comforter, wicker hamper, pastel seashell shower curtain, and upright hunter-green vacuum.',
    createdAt: '2026-11-02T01:00:00.000Z',
    tags: ['apartment', '1990s', 'hotel-updated', '1992-1995', 'new_90s_item', 'meshy_3d', 'props_set', 'suite'],
    boundingSize: [4.8, 3.8],
    items: [
      {
        name: '1990s 8-Bit Retro Gray Video Game Console',
        category: 'appliance',
        subType: 'apt_lr_video_game_console_90s',
        relPosition: [-1.6, 0.5, -1.0],
        dimensions: [0.42, 0.16, 0.35],
        rotationY: 0,
        color: '#9ca3af',
        textureId: 'industrial_concrete',
        collidable: false,
        tags: ['video_game', 'console', '1990s', 'new_90s_item']
      },
      {
        name: '1990s Faux Silk Ficus Tree in Black Pot',
        category: 'custom_ai',
        subType: 'apt_lr_ficus_houseplant_90s',
        relPosition: [-1.6, 0.72, 0.8],
        dimensions: [0.75, 1.45, 0.75],
        rotationY: 0,
        color: '#1b4332',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['plant', 'ficus', '1990s', 'meshy_3d']
      },
      {
        name: '1990s Dusty-Rose Corded Throw Pillow',
        category: 'furniture',
        subType: 'apt_lr_throw_pillow_90s',
        relPosition: [-0.8, 0.45, -1.0],
        dimensions: [0.5, 0.22, 0.5],
        rotationY: 0,
        color: '#9f5f68',
        textureId: 'velvet_crimson',
        collidable: false,
        tags: ['pillow', '1990s', 'meshy_3d']
      },
      {
        name: '1990s Black Drip Coffee Maker & Stained Carafe',
        category: 'appliance',
        subType: 'apt_kit_drip_coffee_maker_90s',
        relPosition: [0, 0.55, -1.0],
        dimensions: [0.35, 0.38, 0.32],
        rotationY: 0,
        color: '#18181b',
        textureId: 'plaster_cream',
        collidable: false,
        tags: ['coffee_maker', '1990s', 'meshy_3d']
      },
      {
        name: '1990s Scorched Aluminum Cooking Pot',
        category: 'clue_prop',
        subType: 'apt_kit_cooking_pot_90s',
        relPosition: [0.6, 0.5, -1.0],
        dimensions: [0.38, 0.24, 0.35],
        rotationY: 0,
        color: '#94a3b8',
        textureId: 'industrial_concrete',
        collidable: false,
        tags: ['cooking_pot', '1990s', 'new_90s_item']
      },
      {
        name: '1990s Hunter-Green Upright Bag Vacuum Cleaner',
        category: 'appliance',
        subType: 'apt_ent_upright_vacuum_90s',
        relPosition: [1.5, 0.6, 0.8],
        dimensions: [0.45, 1.2, 0.45],
        rotationY: 0,
        color: '#1b4332',
        textureId: 'industrial_concrete',
        collidable: true,
        tags: ['vacuum', '1990s', 'meshy_3d']
      },
      {
        name: '1990s Frayed Woven Wicker Laundry Hamper',
        category: 'furniture',
        subType: 'apt_bed_wicker_hamper_90s',
        relPosition: [0.6, 0.44, 0.8],
        dimensions: [0.58, 0.88, 0.58],
        rotationY: 0,
        color: '#92400e',
        textureId: 'oak_parquet',
        collidable: true,
        tags: ['hamper', '1990s', 'meshy_3d']
      },
      {
        name: '1990s Warped Dark Blue Plastic Hand Dustpan',
        category: 'clue_prop',
        subType: 'apt_ent_plastic_dustpan_90s',
        relPosition: [1.5, 0.06, 0.1],
        dimensions: [0.32, 0.12, 0.35],
        rotationY: 0,
        color: '#1e3a8a',
        textureId: 'industrial_concrete',
        collidable: false,
        tags: ['dustpan', '1990s', 'new_90s_item']
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
  apt_lr_crt_tv_console_pristine: 'apt_lr_crt_tv_vcr_90s',
  apt_lr_crt_tv_console_unkempt: 'apt_lr_crt_tv_vcr_90s',
  apt_lr_remote_control_pristine: 'apt_lr_remote_control_90s',
  apt_lr_remote_control_unkempt: 'apt_lr_remote_control_90s',
  apt_rotary_telephone_desk: 'apt_phone_touchtone_90s',
  apt_wall_rotary_telephone: 'apt_phone_touchtone_90s',
  apt_bed_alarm_clock_pristine: 'apt_bed_digital_clock_radio_90s',
  apt_bed_alarm_clock_unkempt: 'apt_bed_digital_clock_radio_90s',
  apt_front_door_intercom: 'apt_intercom_hotel_pbx_90s',
  apt_gang_mailboxes: 'apt_mailboxes_90s',
  apt_wall_fire_extinguisher: 'apt_fire_extinguisher_90s',
  apt_ceiling_smoke_detector: 'apt_fire_alarm_strobe_horn_90s',
  apt_illuminated_exit_sign: 'apt_hotel_exit_sign_led_90s',
  apt_coin_op_washer_dryer: 'apt_hotel_ice_machine_90s',

  // Doors & Access
  apt_interior_tenement_door: 'apt_door_keycard_reader_90s',
  apt_hallway_unit_door: 'apt_door_keycard_reader_90s',
  suite_door: 'apt_door_keycard_reader_90s',

  // Furniture, Living & Bedding
  apt_bed_mattress_boxspring_pristine: 'apt_hotel_bed_queen_90s',
  apt_bed_mattress_boxspring_unkempt: 'apt_hotel_bed_queen_90s',
  apt_bed_platform_pristine: 'apt_hotel_bed_queen_90s',
  apt_bed_platform_unkempt: 'apt_hotel_bed_queen_90s',
  apt_bed_pillows_pristine: 'apt_bed_pillow_90s',
  apt_bed_pillows_unkempt: 'apt_bed_pillow_90s',
  apt_bed_comforter_pristine: 'apt_bed_quilted_comforter_90s',
  apt_bed_comforter_unkempt: 'apt_bed_quilted_comforter_90s',
  apt_bed_dresser_pristine: 'apt_hotel_tv_armoire_90s',
  apt_bed_dresser_unkempt: 'apt_hotel_tv_armoire_90s',
  apt_bed_nightstand_pristine: 'apt_hotel_nightstand_90s',
  apt_bed_nightstand_unkempt: 'apt_hotel_nightstand_90s',
  apt_bed_lamp_pristine: 'apt_bed_ceramic_lamp_90s',
  apt_bed_lamp_unkempt: 'apt_bed_ceramic_lamp_90s',
  apt_bed_hangers_pristine: 'apt_bed_plastic_hanger_90s',
  apt_bed_hangers_unkempt: 'apt_bed_plastic_hanger_90s',
  apt_bed_hamper_pristine: 'apt_bed_wicker_hamper_90s',
  apt_bed_hamper_unkempt: 'apt_bed_wicker_hamper_90s',
  apt_bed_mirror_pristine: 'apt_bed_wall_mirror_90s',
  apt_bed_mirror_unkempt: 'apt_bed_wall_mirror_90s',
  apt_lr_sofa_pristine: 'apt_hotel_sofa_90s',
  apt_lr_sofa_unkempt: 'apt_hotel_sofa_90s',
  apt_lr_coffee_table_pristine: 'apt_coffee_table_glass_steel_90s',
  apt_lr_coffee_table_unkempt: 'apt_coffee_table_glass_steel_90s',
  apt_lr_books_magazines_pristine: 'apt_lr_stack_magazines_90s',
  apt_lr_books_magazines_unkempt: 'apt_lr_stack_magazines_90s',
  apt_lr_throws_blanket_pristine: 'apt_lr_throw_pillow_90s',
  apt_lr_throws_blanket_unkempt: 'apt_lr_throw_pillow_90s',
  apt_lr_pothos_plant_pristine: 'apt_lr_ficus_houseplant_90s',
  apt_lr_pothos_plant_unkempt: 'apt_lr_ficus_houseplant_90s',
  apt_lr_wall_art_pristine: 'apt_lr_framed_wall_art_90s',
  apt_lr_wall_art_unkempt: 'apt_lr_framed_wall_art_90s',
  apt_lr_coasters_tray_pristine: 'apt_lr_cork_coaster_90s',
  apt_lr_extension_cords_unkempt: 'apt_lr_cork_coaster_90s',
  apt_velvet_armchair: 'apt_hotel_armchair_90s',

  // Lighting & Curtains
  apt_lr_floor_lamp_pristine: 'apt_halogen_torchiere_lamp_90s',
  apt_lr_floor_lamp_unkempt: 'apt_halogen_torchiere_lamp_90s',
  apt_hallway_globe_fixture: 'apt_brass_tulip_sconce_90s',
  apt_lr_velvet_curtains_pristine: 'apt_hotel_blackout_drapes_90s',
  apt_lr_velvet_curtains_unkempt: 'apt_hotel_blackout_drapes_90s',

  // Kitchenette & Dining
  apt_harvest_gold_refrigerator: 'apt_fridge_white_90s',
  apt_formica_countertop_wood_trim: 'apt_counter_laminate_bullnose_90s',
  apt_kit_kettle_pristine: 'apt_kit_drip_coffee_maker_90s',
  apt_kit_kettle_unkempt: 'apt_kit_drip_coffee_maker_90s',
  apt_kit_dish_rack_pristine: 'apt_hospitality_coffee_tray_90s',
  apt_kit_dish_rack_unkempt: 'apt_hospitality_coffee_tray_90s',
  apt_kit_toaster_pristine: 'apt_microwave_digital_90s',
  apt_kit_toaster_unkempt: 'apt_microwave_digital_90s',
  apt_kit_skillet_pristine: 'apt_kit_frying_pan_90s',
  apt_kit_skillet_unkempt: 'apt_kit_frying_pan_90s',
  apt_kit_dishes_pristine: 'apt_kit_ceramic_plate_90s',
  apt_kit_dishes_unkempt: 'apt_kit_ceramic_plate_90s',
  apt_kit_cutlery_pristine: 'apt_kit_chef_knife_90s',
  apt_kit_cutlery_unkempt: 'apt_kit_chef_knife_90s',
  apt_kit_trash_can_pristine: 'apt_kit_pedal_trash_can_90s',
  apt_kit_trash_can_unkempt: 'apt_kit_pedal_trash_can_90s',
  apt_kit_magnets_pristine: 'apt_kit_fridge_magnet_90s',
  apt_kit_magnets_unkempt: 'apt_kit_fridge_magnet_90s',
  apt_kit_paper_towel_pristine: 'apt_kit_paper_towel_holder_90s',
  apt_kit_paper_towel_unkempt: 'apt_kit_paper_towel_holder_90s',
  apt_kit_oven_mitts_pristine: 'apt_kit_quilted_oven_mitt_90s',
  apt_kit_oven_mitts_unkempt: 'apt_kit_quilted_oven_mitt_90s',
  apt_kit_containers_pristine: 'apt_kit_plastic_container_90s',
  apt_kit_containers_unkempt: 'apt_kit_plastic_container_90s',
  apt_kit_spice_rack_pristine: 'apt_kit_wooden_spice_rack_90s',
  apt_kit_spice_rack_unkempt: 'apt_kit_wooden_spice_rack_90s',
  apt_kit_sponge_soap_pristine: 'apt_kit_synthetic_sponge_90s',
  apt_kit_sponge_soap_unkempt: 'apt_kit_synthetic_sponge_90s',

  // Bathroom
  marble_vanity_sink: 'apt_vanity_cultured_marble_90s',
  porcelain_bathtub: 'apt_bath_acrylic_tub_enclosure_90s',
  suite_porcelain_toilet: 'apt_toilet_white_90s',
  brass_towel_rack: 'apt_hotel_towel_rack_chrome_90s',
  apt_bath_towels_pristine: 'apt_bath_towels_90s',
  apt_bath_towels_unkempt: 'apt_bath_towels_90s',
  apt_bath_shower_curtain_pristine: 'apt_bath_vinyl_shower_curtain_90s',
  apt_bath_shower_curtain_unkempt: 'apt_bath_vinyl_shower_curtain_90s',
  apt_bath_mat_pristine: 'apt_bath_plush_mat_90s',
  apt_bath_mat_unkempt: 'apt_bath_plush_mat_90s',
  apt_bath_toothbrush_pristine: 'apt_bath_toothbrush_holder_90s',
  apt_bath_toothbrush_unkempt: 'apt_bath_toothbrush_holder_90s',
  apt_bath_soap_dish_pristine: 'apt_bath_soap_dispenser_90s',
  apt_bath_soap_dish_unkempt: 'apt_bath_soap_dispenser_90s',
  apt_bath_toilet_paper_pristine: 'apt_bath_toilet_brush_90s',
  apt_bath_toilet_paper_unkempt: 'apt_bath_toilet_brush_90s',
  apt_bath_hairdryer_pristine: 'apt_bath_handheld_hairdryer_90s',
  apt_bath_hairdryer_unkempt: 'apt_bath_handheld_hairdryer_90s',
  apt_bath_wastebasket_pristine: 'apt_bath_small_wastebasket_90s',
  apt_bath_wastebasket_unkempt: 'apt_bath_small_wastebasket_90s',
  apt_bath_first_aid_pristine: 'apt_bath_first_aid_kit_90s',
  apt_bath_first_aid_unkempt: 'apt_bath_first_aid_kit_90s',

  // Entryway & Utility
  apt_ent_key_rack_pristine: 'apt_ent_wooden_key_rack_90s',
  apt_ent_key_rack_unkempt: 'apt_ent_wooden_key_rack_90s',
  apt_ent_doormat_pristine: 'apt_ent_rubber_doormat_90s',
  apt_ent_doormat_unkempt: 'apt_ent_rubber_doormat_90s',
  apt_ent_umbrella_pristine: 'apt_ent_collapsed_umbrella_90s',
  apt_ent_umbrella_unkempt: 'apt_ent_collapsed_umbrella_90s',
  apt_ent_vacuum_pristine: 'apt_ent_upright_vacuum_90s',
  apt_ent_vacuum_unkempt: 'apt_ent_upright_vacuum_90s',
  apt_ent_cleaning_supplies_pristine: 'apt_ent_straw_broom_90s',
  apt_ent_cleaning_supplies_unkempt: 'apt_ent_straw_broom_90s',
  apt_ent_shoe_tray_pristine: 'apt_ent_shoe_rack_90s',
  apt_ent_shoe_tray_unkempt: 'apt_ent_shoe_rack_90s',
  apt_ent_coat_rack_pristine: 'apt_ent_coat_rack_90s',
  apt_ent_coat_rack_unkempt: 'apt_ent_coat_rack_90s',

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
  apt_lr_crt_tv_vcr_90s: 'apt_lr_crt_tv_console_pristine',
  apt_lr_remote_control_90s: 'apt_lr_remote_control_pristine',
  apt_phone_touchtone_90s: 'apt_wall_rotary_telephone',
  apt_bed_digital_clock_radio_90s: 'apt_bed_alarm_clock_pristine',
  apt_door_keycard_reader_90s: 'apt_interior_tenement_door',
  apt_ptac_ac_unit_90s: 'apt_baseboard_steam_radiator',
  apt_cast_iron_radiator_90s: 'apt_baseboard_steam_radiator',
  apt_fire_alarm_strobe_horn_90s: 'apt_ceiling_smoke_detector',
  apt_smoke_detector_disc_90s: 'apt_ceiling_smoke_detector',
  apt_hotel_exit_sign_led_90s: 'apt_illuminated_exit_sign',
  apt_exit_sign_stencil_red_90s: 'apt_illuminated_exit_sign',
  apt_intercom_hotel_pbx_90s: 'apt_front_door_intercom',
  apt_front_door_intercom_90s: 'apt_front_door_intercom',
  apt_mailboxes_90s: 'apt_gang_mailboxes',
  apt_fire_extinguisher_90s: 'apt_wall_fire_extinguisher',
  apt_concrete_stairwell_step_90s: 'apt_stairwell_zig_zag_flight',
  apt_carpeted_stairwell_step_90s: 'apt_stairwell_zig_zag_flight',
  apt_elevator_interior_panel_90s: 'apt_elevator_cab_wall_solid',
  apt_shared_washing_machine_90s: 'apt_coin_op_washer_dryer',
  apt_shared_dryer_90s: 'apt_coin_op_washer_dryer',
  apt_hvac_vent_grill_90s: 'apt_hvac_ceiling_diffuser',
  apt_utility_meter_90s: 'apt_electric_meter_bank',
  apt_trash_chute_door_90s: 'apt_hallway_trash_chute',
  apt_hallway_dome_fixture_90s: 'apt_hallway_globe_fixture',
  apt_breaker_panel_90s: 'apt_breaker_box_panel',
  apt_hotel_bed_queen_90s: 'apt_bed_platform_pristine',
  apt_bed_frame_metal_90s: 'apt_bed_platform_pristine',
  apt_bed_pillow_90s: 'apt_bed_pillows_pristine',
  apt_bed_quilted_comforter_90s: 'apt_bed_comforter_pristine',
  apt_hotel_tv_armoire_90s: 'apt_bed_dresser_pristine',
  apt_bed_four_drawer_dresser_90s: 'apt_bed_dresser_pristine',
  apt_hotel_nightstand_90s: 'apt_bed_nightstand_pristine',
  apt_bed_veneered_nightstand_90s: 'apt_bed_nightstand_pristine',
  apt_bed_ceramic_lamp_90s: 'apt_bed_lamp_pristine',
  apt_bed_plastic_hanger_90s: 'apt_bed_hangers_pristine',
  apt_bed_wicker_hamper_90s: 'apt_bed_hamper_pristine',
  apt_bed_wall_mirror_90s: 'apt_bed_mirror_pristine',
  apt_hotel_sofa_90s: 'apt_lr_sofa_pristine',
  apt_lr_floral_sofa_90s: 'apt_lr_sofa_pristine',
  apt_coffee_table_glass_steel_90s: 'apt_lr_coffee_table_pristine',
  apt_lr_particle_glass_coffee_table_90s: 'apt_lr_coffee_table_pristine',
  apt_lr_stack_magazines_90s: 'apt_lr_books_magazines_pristine',
  apt_lr_throw_pillow_90s: 'apt_lr_throws_blanket_pristine',
  apt_lr_ficus_houseplant_90s: 'apt_lr_pothos_plant_pristine',
  apt_lr_framed_wall_art_90s: 'apt_lr_wall_art_pristine',
  apt_lr_cork_coaster_90s: 'apt_lr_coasters_tray_pristine',
  apt_hotel_armchair_90s: 'apt_lr_sofa_pristine',
  apt_hotel_desk_laminate_90s: 'apt_lr_coffee_table_pristine',
  apt_halogen_torchiere_lamp_90s: 'apt_lr_floor_lamp_pristine',
  apt_lr_brass_pleated_floor_lamp_90s: 'apt_lr_floor_lamp_pristine',
  apt_brass_tulip_sconce_90s: 'apt_hallway_globe_fixture',
  apt_hotel_blackout_drapes_90s: 'apt_lr_throws_blanket_pristine',
  apt_fridge_white_90s: 'apt_harvest_gold_refrigerator',
  apt_minibar_fridge_90s: 'apt_harvest_gold_refrigerator',
  apt_microwave_digital_90s: 'apt_kit_toaster_pristine',
  apt_kit_rotary_microwave_90s: 'apt_kit_toaster_pristine',
  apt_kit_two_slice_toaster_90s: 'apt_kit_toaster_pristine',
  apt_kit_drip_coffee_maker_90s: 'apt_kit_kettle_pristine',
  apt_kit_frying_pan_90s: 'apt_kit_skillet_pristine',
  apt_kit_ceramic_plate_90s: 'apt_kit_dishes_pristine',
  apt_kit_chef_knife_90s: 'apt_kit_cutlery_pristine',
  apt_kit_plastic_dish_rack_90s: 'apt_kit_dish_rack_pristine',
  apt_kit_pedal_trash_can_90s: 'apt_kit_trash_can_pristine',
  apt_kit_fridge_magnet_90s: 'apt_kit_magnets_pristine',
  apt_kit_paper_towel_holder_90s: 'apt_kit_paper_towel_pristine',
  apt_kit_quilted_oven_mitt_90s: 'apt_kit_oven_mitts_pristine',
  apt_kit_plastic_container_90s: 'apt_kit_containers_pristine',
  apt_kit_wooden_spice_rack_90s: 'apt_kit_spice_rack_pristine',
  apt_kit_synthetic_sponge_90s: 'apt_kit_sponge_soap_pristine',
  apt_counter_laminate_bullnose_90s: 'apt_formica_countertop_wood_trim',
  apt_faucet_single_lever_90s: 'apt_formica_countertop_wood_trim',
  apt_hospitality_coffee_tray_90s: 'apt_kit_dish_rack_pristine',
  apt_vanity_cultured_marble_90s: 'marble_vanity_sink',
  apt_bath_chrome_strip_light_90s: 'apt_hallway_globe_fixture',
  apt_bath_acrylic_tub_enclosure_90s: 'porcelain_bathtub',
  apt_wall_hair_dryer_90s: 'apt_bath_hairdryer_pristine',
  apt_bath_handheld_hairdryer_90s: 'apt_bath_hairdryer_pristine',
  apt_toilet_white_90s: 'suite_porcelain_toilet',
  apt_hotel_towel_rack_chrome_90s: 'brass_towel_rack',
  apt_bath_towels_90s: 'apt_bath_towels_pristine',
  apt_bath_vinyl_shower_curtain_90s: 'apt_bath_shower_curtain_pristine',
  apt_bath_plush_mat_90s: 'apt_bath_mat_pristine',
  apt_bath_toothbrush_holder_90s: 'apt_bath_toothbrush_pristine',
  apt_bath_soap_dispenser_90s: 'apt_bath_soap_dish_pristine',
  apt_bath_toilet_brush_90s: 'apt_bath_toilet_paper_pristine',
  apt_bath_small_wastebasket_90s: 'apt_bath_wastebasket_pristine',
  apt_bath_first_aid_kit_90s: 'apt_bath_first_aid_pristine',
  apt_ent_wooden_key_rack_90s: 'apt_ent_key_rack_pristine',
  apt_ent_rubber_doormat_90s: 'apt_ent_doormat_pristine',
  apt_ent_collapsed_umbrella_90s: 'apt_ent_umbrella_pristine',
  apt_ent_upright_vacuum_90s: 'apt_ent_vacuum_pristine',
  apt_ent_straw_broom_90s: 'apt_ent_cleaning_supplies_pristine',
  apt_ent_plastic_dustpan_90s: 'apt_ent_cleaning_supplies_pristine',
  apt_ent_shoe_rack_90s: 'apt_ent_shoe_tray_pristine',
  apt_ent_coat_rack_90s: 'apt_ent_coat_rack_pristine',
  apt_flooring_hotel_teal_carpet_90s: 'apt_lr_area_rug_pristine',
  apt_lr_geometric_area_rug_90s: 'apt_lr_area_rug_pristine',
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
 * Groups asset subTypes that share the same functional asset type so the new Meshy.ai
 * early-1990s models are available as selectable visual designs of that asset type.
 */
export const ASSET_VISUAL_DESIGN_FAMILIES: Record<string, readonly string[]> = {
  crt_television: [
    'apt_tv_crt_90s_black',
    'apt_lr_crt_tv_vcr_90s',
    'apt_lr_television_pristine',
    'apt_lr_television_unkempt'
  ],
  sofa_couch: [
    'apt_hotel_sofa_90s',
    'apt_lr_floral_sofa_90s',
    'apt_lr_sofa_pristine',
    'apt_lr_sofa_unkempt'
  ],
  coffee_table: [
    'apt_coffee_table_glass_steel_90s',
    'apt_lr_particle_glass_coffee_table_90s',
    'apt_lr_coffee_table_pristine',
    'apt_lr_coffee_table_unkempt'
  ],
  floor_lamp: [
    'apt_halogen_torchiere_lamp_90s',
    'apt_lr_brass_pleated_floor_lamp_90s',
    'apt_lr_floor_lamp_pristine',
    'apt_lr_floor_lamp_unkempt'
  ],
  area_rug_carpet: [
    'apt_flooring_hotel_teal_carpet_90s',
    'apt_lr_geometric_area_rug_90s',
    'apt_lr_area_rug_pristine',
    'apt_lr_area_rug_unkempt'
  ],
  countertop_heating_appliance: [
    'apt_microwave_digital_90s',
    'apt_kit_rotary_microwave_90s',
    'apt_kit_two_slice_toaster_90s',
    'apt_kit_toaster_pristine',
    'apt_kit_toaster_unkempt'
  ],
  coffee_maker_kettle: [
    'apt_kit_drip_coffee_maker_90s',
    'apt_hospitality_coffee_tray_90s',
    'apt_kit_kettle_pristine',
    'apt_kit_kettle_unkempt'
  ],
  dish_rack_tray: [
    'apt_kit_plastic_dish_rack_90s',
    'apt_hospitality_coffee_tray_90s',
    'apt_kit_dish_rack_pristine',
    'apt_kit_dish_rack_unkempt'
  ],
  bed_frame_platform: [
    'apt_hotel_bed_queen_90s',
    'apt_bed_frame_metal_90s',
    'apt_bed_platform_pristine',
    'apt_bed_platform_unkempt'
  ],
  nightstand_table: [
    'apt_hotel_nightstand_90s',
    'apt_bed_veneered_nightstand_90s',
    'apt_bed_nightstand_pristine',
    'apt_bed_nightstand_unkempt'
  ],
  dresser_armoire: [
    'apt_hotel_tv_armoire_90s',
    'apt_bed_four_drawer_dresser_90s',
    'apt_bed_dresser_pristine',
    'apt_bed_dresser_unkempt'
  ],
  bathroom_hairdryer: [
    'apt_bath_handheld_hairdryer_90s',
    'apt_wall_hair_dryer_90s',
    'apt_bath_hairdryer_pristine',
    'apt_bath_hairdryer_unkempt'
  ],
  intercom_system: [
    'apt_intercom_hotel_pbx_90s',
    'apt_front_door_intercom_90s',
    'apt_front_door_intercom'
  ],
  smoke_fire_detector: [
    'apt_fire_alarm_strobe_horn_90s',
    'apt_smoke_detector_disc_90s',
    'apt_ceiling_smoke_detector'
  ],
  emergency_exit_sign: [
    'apt_hotel_exit_sign_led_90s',
    'apt_exit_sign_stencil_red_90s',
    'apt_illuminated_exit_sign'
  ],
  hallway_light_fixture: [
    'apt_brass_tulip_sconce_90s',
    'apt_hallway_dome_fixture_90s',
    'apt_bath_chrome_strip_light_90s',
    'apt_hallway_globe_fixture'
  ],
  shared_laundry_appliance: [
    'apt_shared_washing_machine_90s',
    'apt_shared_dryer_90s',
    'apt_hotel_ice_machine_90s',
    'apt_coin_op_washer_dryer'
  ],
  stairwell_step: [
    'apt_concrete_stairwell_step_90s',
    'apt_carpeted_stairwell_step_90s',
    'apt_stairwell_zig_zag_flight'
  ],
  elevator_wall_panel: [
    'apt_elevator_cab_wall_solid_90s',
    'apt_elevator_interior_panel_90s',
    'apt_elevator_cab_wall_solid'
  ],
  room_heating_radiator: [
    'apt_ptac_ac_unit_90s',
    'apt_cast_iron_radiator_90s',
    'apt_baseboard_steam_radiator'
  ],
  hvac_vent_register: [
    'apt_hvac_vent_grill_90s',
    'apt_hvac_ceiling_diffuser'
  ],
  utility_electric_meter: [
    'apt_utility_meter_90s',
    'apt_electric_meter_bank'
  ],
  trash_chute_hatch: [
    'apt_trash_chute_door_90s',
    'apt_hallway_trash_chute'
  ],
  electrical_breaker_panel: [
    'apt_breaker_panel_90s',
    'apt_breaker_box_panel'
  ],
  cleaning_broom_dustpan: [
    'apt_ent_straw_broom_90s',
    'apt_ent_plastic_dustpan_90s',
    'apt_ent_cleaning_supplies_pristine',
    'apt_ent_cleaning_supplies_unkempt'
  ]
};

/**
 * Returns all available visual design blueprints for a given asset subType.
 */
export function getAssetVisualDesignVariants(
  subType: string | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): SearchableBlueprintLike[] {
  if (!subType || typeof subType !== 'string') return [];
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const combinedPool: SearchableBlueprintLike[] = [
    ...safeBlueprints,
    ...APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.filter(
      (bp) => !safeBlueprints.some((existing) => existing && existing.subType === bp.subType)
    )
  ];

  for (const familySubTypes of Object.values(ASSET_VISUAL_DESIGN_FAMILIES)) {
    if (familySubTypes.includes(subType)) {
      const designs = familySubTypes
        .map((st) => combinedPool.find((bp) => bp && bp.subType === st))
        .filter((bp): bp is SearchableBlueprintLike => Boolean(bp));
      if (designs.length > 0) {
        return designs;
      }
    }
  }

  // Also check if the asset has a 1990s updated counterpart or 1978 predecessor
  const updatedSub = getUpdated1990sVariantSubtype(subType, combinedPool);
  const predSub = getPredecessor1978Subtype(subType, combinedPool);
  const relatedSubs = Array.from(
    new Set([subType, updatedSub, predSub].filter((s): s is string => Boolean(s)))
  );
  return relatedSubs
    .map((st) => combinedPool.find((bp) => bp && bp.subType === st))
    .filter((bp): bp is SearchableBlueprintLike => Boolean(bp));
}

/**
 * Swaps a placed asset to a different visual design model of the same asset family
 * (or cycles to the next visual design when targetDesignSubType === 'next').
 */
export function swapAssetVisualDesign(
  asset: PlacedAsset | null | undefined,
  targetDesignSubType: string | 'next',
  allBlueprints: readonly SearchableBlueprintLike[] = []
): { swappedAsset: PlacedAsset; designName: string; message: string } {
  const fallbackAsset: PlacedAsset =
    asset && typeof asset === 'object'
      ? {
          ...asset,
          id: asset.id || `asset_fallback_${Date.now()}`,
          name: asset.name || '3D Asset',
          category: asset.category || 'furniture',
          subType: asset.subType || 'custom_ai',
          floor: asset.floor || 'lobby',
          position:
            Array.isArray(asset.position) && asset.position.length === 3
              ? ([...asset.position] as [number, number, number])
              : [0, 0.5, 0],
          dimensions:
            Array.isArray(asset.dimensions) && asset.dimensions.length === 3
              ? ([...asset.dimensions] as [number, number, number])
              : [1, 1, 1],
          rotationY: typeof asset.rotationY === 'number' ? asset.rotationY : 0,
          color: asset.color || '#5e4c2e',
          textureId: asset.textureId || 'oak_parquet',
          collidable: Boolean(asset.collidable)
        }
      : {
          id: `asset_fallback_${Date.now()}`,
          name: '3D Asset',
          category: 'furniture',
          subType: 'custom_ai',
          floor: 'lobby',
          position: [0, 0.5, 0],
          dimensions: [1, 1, 1],
          rotationY: 0,
          color: '#5e4c2e',
          textureId: 'oak_parquet',
          collidable: true
        };

  const variants = getAssetVisualDesignVariants(fallbackAsset.subType, allBlueprints);
  if (variants.length === 0) {
    return {
      swappedAsset: fallbackAsset,
      designName: fallbackAsset.name,
      message: `No alternate visual designs registered for ${fallbackAsset.name}.`
    };
  }

  let targetBp: SearchableBlueprintLike | undefined;
  const safeTargetSub = typeof targetDesignSubType === 'string' ? targetDesignSubType.trim() : 'next';
  if (safeTargetSub === 'next' || !safeTargetSub) {
    const currentIndex = variants.findIndex((v) => v && v.subType === fallbackAsset.subType);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % variants.length : 0;
    targetBp = variants[nextIndex];
  } else {
    targetBp = variants.find((v) => v && v.subType === safeTargetSub) || variants[0];
  }

  if (!targetBp) {
    return {
      swappedAsset: fallbackAsset,
      designName: fallbackAsset.name,
      message: `No alternate visual designs registered for ${fallbackAsset.name}.`
    };
  }

  const is90s = targetBp.era === '1990s' || targetBp.subType.endsWith('_90s');
  const isUnkempt = targetBp.subType.endsWith('_unkempt');
  const nextDims: [number, number, number] =
    Array.isArray(targetBp.defaultDimensions) && targetBp.defaultDimensions.length === 3
      ? ([...targetBp.defaultDimensions] as [number, number, number])
      : fallbackAsset.dimensions;

  const swappedAsset: PlacedAsset = {
    ...fallbackAsset,
    name: targetBp.name || fallbackAsset.name,
    subType: targetBp.subType || fallbackAsset.subType,
    category: targetBp.category || fallbackAsset.category,
    color: targetBp.defaultColor || fallbackAsset.color,
    textureId: targetBp.defaultTexture || fallbackAsset.textureId,
    dimensions: nextDims,
    compositeParts: Array.isArray(targetBp.compositeParts)
      ? targetBp.compositeParts.map((p) => ({ ...p }))
      : undefined,
    soundPresetId: targetBp.soundPresetId || fallbackAsset.soundPresetId,
    era: is90s ? '1990s' : '1970s',
    conditionVariant: is90s ? 'updated' : isUnkempt ? 'unkempt' : 'pristine',
    tags: Array.isArray(targetBp.tags) ? [...targetBp.tags] : fallbackAsset.tags
  };

  return {
    swappedAsset,
    designName: swappedAsset.name,
    message: `Switched visual design to "${swappedAsset.name}" (${swappedAsset.subType}).`
  };
}

/**
 * Returns the 1990s updated hotel subType for any given 1978 original asset.
 */
export function getUpdated1990sVariantSubtype(
  subType: string | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): string | undefined {
  if (!subType || typeof subType !== 'string') return undefined;
  if (HOTEL_1978_TO_1990S_UPDATE_MAP[subType]) {
    return HOTEL_1978_TO_1990S_UPDATE_MAP[subType];
  }
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const bp = safeBlueprints.find((b) => b && b.subType === subType);
  return bp?.paired1990sId;
}

/**
 * Returns the 1978 baseline subType predecessor for any given 1990s asset.
 */
export function getPredecessor1978Subtype(
  subType: string | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): string | undefined {
  if (!subType || typeof subType !== 'string') return undefined;
  if (HOTEL_1990S_TO_1978_PREDECESSOR_MAP[subType]) {
    return HOTEL_1990S_TO_1978_PREDECESSOR_MAP[subType];
  }
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const bp = safeBlueprints.find((b) => b && b.subType === subType);
  return bp?.predecessor1978Id;
}

/**
 * Upgrades a placed 1978 asset to its 1992-1995 hotel updated counterpart in-place,
 * preserving position, rotation, and floor assignment while enforcing structural immutability.
 */
export function upgradeAssetTo1990sHotelVersion(
  asset: PlacedAsset | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS
): { success: true; upgradedAsset: PlacedAsset } | { success: false; reason: string } {
  if (!asset || typeof asset !== 'object' || !asset.subType) {
    return {
      success: false,
      reason: 'Invalid or missing placed asset provided for 1990s hotel upgrade.'
    };
  }
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];

  // Enforce: Structural items CANNOT be updated in hotel conversion
  if (isStructuralHotelAsset(asset.subType, safeBlueprints)) {
    return {
      success: false,
      reason: `Structural item (${asset.name || asset.subType}) is an architecturally fixed load-bearing element or MEP shaft that cannot be updated in a hotel renovation.`
    };
  }

  const targetSubtype =
    asset.paired1990sId ||
    getUpdated1990sVariantSubtype(asset.subType, safeBlueprints);

  if (!targetSubtype) {
    return {
      success: false,
      reason: `No 1990s hotel updated variant registered for asset subType: ${asset.subType}`
    };
  }

  const targetBp =
    safeBlueprints.find((b) => b && b.subType === targetSubtype) ||
    APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.find((b) => b.subType === targetSubtype);

  if (!targetBp) {
    return {
      success: false,
      reason: `Blueprint definition not found for 1990s target subType: ${targetSubtype}`
    };
  }

  const nextDims: [number, number, number] =
    Array.isArray(targetBp.defaultDimensions) && targetBp.defaultDimensions.length === 3
      ? ([...targetBp.defaultDimensions] as [number, number, number])
      : Array.isArray(asset.dimensions) && asset.dimensions.length === 3
      ? ([...asset.dimensions] as [number, number, number])
      : [1, 1, 1];

  const upgradedAsset: PlacedAsset = {
    ...asset,
    name: targetBp.name,
    subType: targetBp.subType,
    category: targetBp.category,
    color: targetBp.defaultColor,
    textureId: targetBp.defaultTexture,
    dimensions: nextDims,
    compositeParts: targetBp.compositeParts ? targetBp.compositeParts.map((p) => ({ ...p })) : undefined,
    soundPresetId: targetBp.soundPresetId || asset.soundPresetId,
    era: '1990s',
    conditionVariant: 'updated',
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
  asset: PlacedAsset | null | undefined,
  allBlueprints: readonly SearchableBlueprintLike[] = []
): { success: true; downgradedAsset: PlacedAsset } | { success: false; reason: string } {
  if (!asset || typeof asset !== 'object' || !asset.subType) {
    return {
      success: false,
      reason: 'Invalid or missing placed asset provided for 1978 downgrade.'
    };
  }
  const safeBlueprints = Array.isArray(allBlueprints) ? allBlueprints.filter(Boolean) : [];
  const targetSubtype =
    asset.predecessor1978Id ||
    getPredecessor1978Subtype(asset.subType, safeBlueprints);

  if (!targetSubtype) {
    return {
      success: false,
      reason: `No 1978 original predecessor registered for asset subType: ${asset.subType}`
    };
  }

  const targetBp = safeBlueprints.find((b) => b && b.subType === targetSubtype);
  if (!targetBp) {
    return {
      success: false,
      reason: `Blueprint definition not found for 1978 predecessor subType: ${targetSubtype}`
    };
  }

  const nextDims: [number, number, number] =
    Array.isArray(targetBp.defaultDimensions) && targetBp.defaultDimensions.length === 3
      ? ([...targetBp.defaultDimensions] as [number, number, number])
      : Array.isArray(asset.dimensions) && asset.dimensions.length === 3
      ? ([...asset.dimensions] as [number, number, number])
      : [1, 1, 1];

  const downgradedAsset: PlacedAsset = {
    ...asset,
    name: targetBp.name,
    subType: targetBp.subType,
    category: targetBp.category,
    color: targetBp.defaultColor,
    textureId: targetBp.defaultTexture,
    dimensions: nextDims,
    compositeParts: targetBp.compositeParts ? targetBp.compositeParts.map((p) => ({ ...p })) : undefined,
    soundPresetId: targetBp.soundPresetId || asset.soundPresetId,
    era: '1970s',
    conditionVariant: targetBp.subType.endsWith('_unkempt') ? 'unkempt' : 'pristine',
    paired1990sId: asset.subType,
    tags: targetBp.tags ? [...targetBp.tags] : asset.tags
  };

  return { success: true, downgradedAsset };
}

/**
 * Generates an expanded Google AI Studio + Meshy.ai Text-to-Image-to-3D queue payload
 * (`gemini-2.5-flash` -> `gemini-3.1-flash-lite-image` -> `meshy-4-image-to-3d`)
 * to synthesize early-1990s period 3D mesh references and concept textures for the hotel & apartment catalog.
 */
export function buildGemini1990sHotelAssetPromptQueue(
  modelId: 'gemini-2.5-flash' | 'gemini-3.1-flash-lite' = 'gemini-2.5-flash'
): Array<{
  subType: string;
  name: string;
  modelId: string;
  imageModel: 'gemini-3.1-flash-lite-image';
  era: '1990s';
  useMeshy3D: boolean;
  meshyPipeline?: 'meshy-4-image-to-3d';
  prompt: string;
}> {
  return APARTMENT_1990S_HOTEL_CATALOG_BLUEPRINTS.map((bp) => {
    const useMeshy3D = Boolean(bp.tags?.includes('meshy_3d'));
    return {
      subType: bp.subType,
      name: bp.name,
      modelId,
      imageModel: 'gemini-3.1-flash-lite-image',
      era: '1990s',
      useMeshy3D,
      meshyPipeline: useMeshy3D ? 'meshy-4-image-to-3d' : undefined,
      prompt: `A single isolated 3D asset of ${bp.name}: ${bp.description} Game-ready low-poly asset, early 1990s aesthetic, worn and slightly unkempt textures, muted colors, realistic surface grime, neutral flat studio lighting, orthographic three-quarter view, isolated on a solid neutral gray background, no environment, no floor, no drop shadows.`
    };
  });
}

