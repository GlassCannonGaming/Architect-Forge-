# Implementation Plan: Batch Import of Apartment Building Items & Asset Sets

Import and catalog all ~65 items specified in `/public/assets/aistudio/Standard_Items_located_in_a_all_appartment_buildings_6aeedbbe.txt` into ArchitectForge. This provides instant 3D procedural objects with authentic 1970s/1980s materials, dual pristine/unkempt state toggles, pre-composed room Asset Sets, and an AI 3D asset generation queue powered by `gemini-2.5-flash`.

---

## 1. Item Ingestion & Taxonomy

The items from the text file are categorized into 4 core architectural domains:

1. **Building Infrastructure & Hallways**:
   - Intercom entry unit, gang mailboxes, wall-mounted fire extinguisher, smoke detector, illuminated exit signs, metal/concrete stairwell railing, elevator sliding doors & indicator arrows, coin-op laundry washer/dryer, baseboard radiators & HVAC vents, utility meters (gas/electric), trash chute door, ceiling globe hallway lighting, surface-mounted circuit breaker panel.
2. **1970s / 1980s Architectural Finishes & Fixtures**:
   - Acoustic popcorn ceiling texture, faux-walnut dark wood wall paneling, harvest gold / avocado green / almond appliance finishes, tufted shag carpet, geometric linoleum flooring, faux-marble Formica countertops, polished brass track lighting, amber/brown bubble-glass ceiling pendants, rotary & push-button wall telephones, Honeywell round dial thermostat, louvered bi-fold closet doors, vanity bulb strip mirrors, burnt orange & mustard ceramic tiles.
3. **Room-Specific Suites (Dual Variants: Pristine vs. Unkempt)**:
   - **Living Room**: Tweed mid-century sofa (pristine gold tweed vs. sagging weathered tweed with cigarette burns), coffee table (walnut finish vs. scarred laminate with amber glass ashtray), woodgrain CRT television set (working test pattern vs. flickering cathode screen), brass floor lamp (polished with linen shade vs. tarnished brass with water-stained pleated shade).
   - **Kitchen**: 1970s refrigerator (harvest gold clean vs. almond stained with warped magnets), gas range oven (clean enamel vs. grease-baked enamel with missing knobs), kitchen sink (stainless double-basin vs. stained porcelain with drippy brass faucet), wire dish rack (chrome vs. rusted wire rack), checkered oven mitts (clean gingham vs. scorched & greasy).
   - **Bedroom**: Wood platform bed with headboard (clean tucked floral bedspread vs. rumpled disheveled duvet with exposed mattress corner), veneer nightstand (clean with amber lamp vs. ring-stained with digital flip clock & scattered pills), dresser (smooth sliding drawers vs. off-track drawer with snagged sweater), bi-fold wardrobe closet.
   - **Bathroom**: Porcelain toilet (pristine with fuzzy seat cover vs. stained tank with running flush), pedestal sink / vanity (clean porcelain vs. mildewed caulk with rusted drain ring), cast-iron tub with shower curtain (clean geometric print vs. mildew-speckled yellowed vinyl curtain), medicine cabinet (clear mirrored door vs. oxidized silvering edge with amber prescription bottles).
   - **Entryway & Utility**: Coat rack with umbrella stand, doormat (clean coir vs. frayed damp mat), deadbolt door chain & peephole, hallway runner rug.

---

## 2. Proposed Changes

### Core Game Logic & Asset Catalog
#### [src/game/rules.ts]
- **Batch Ingest Utility & Definitions**:
  - Add `APARTMENT_BUILDING_IMPORT_CATALOG` containing all items parsed and structured from `Standard_Items_located_in_a_all_appartment_buildings_6aeedbbe.txt`.
  - Equip each item with:
    - 3D bounding dimensions ($W \times D \times H$ in meters/tiles).
    - Late-70s color palette tokens (Harvest Gold `#D49B24`, Avocado Green `#5A6B3D`, Almond `#DFD0B8`, Burnt Orange `#BD4F1B`, Dark Walnut `#3B2219`, Tarnished Brass `#9E8043`, Chrome `#CCCCCC`, Aged Beige `#C5BAA8`).
    - Procedural composite 3D geometry sub-parts (mesh blocks, cylinders, dials, glass globes, grills, coils, fabric cushions).
    - Sound triggers (`hum`, `buzz`, `clunk`, `click`, `drip`, `creak`, `sizzle`).
    - Dual Condition Toggle metadata: `conditionVariant: 'pristine' | 'unkempt'` and paired asset ID pointers (`pairedVariantId`).
- **Pre-Composed Room Asset Sets (`.assetset.json`)**:
  - `set_apt_hallway_utility_1978`: Gang mailboxes, intercom panel, baseboard radiator, amber ceiling fixture, fire extinguisher.
  - `set_apt_unkempt_living_room_1978`: Sagging tweed sofa, scarred coffee table with ashtray, woodgrain CRT TV, tarnished brass lamp.
  - `set_apt_pristine_living_room_1978`: Tufted sofa, clean walnut coffee table, brass floor lamp, shag area rug.
  - `set_apt_kitchenette_harvest_gold_1978`: Harvest gold fridge, matching gas range, Formica counter with sink, wire dish rack.
  - `set_apt_unkempt_kitchenette_1978`: Greasy oven, stained almond fridge with magnets, rusted dish rack, dripping faucet.
  - `set_apt_tenement_bathroom_1978`: Stained tub, mildewed vinyl shower curtain, oxidized medicine cabinet, pedestal sink.
  - `set_apt_bedroom_retro_1978`: Disheveled platform bed, veneer nightstand with flip clock, louvered bi-fold closet.
- **AI 3D Model Generation Queue Integration**:
  - Connect each imported description into the generation queue (`descriptions_queue`), populated with tailored prompt descriptors for the `gemini-2.5-flash` model (high-fidelity generative model within Google Studio Pro) to produce supplementary textures and 3D mesh references.

### User Interface & Inspector
#### [src/components/ObjectInspector.tsx]
- Add an interactive **Condition Variant Toggle** (`Pristine ↔ Unkempt / Weathered`) directly in the asset inspector when an item has an associated counterpart. Clicking the toggle swaps the asset in-place on the 3D lot while maintaining its exact coordinate, orientation, and layer placement.
- Show condition status badge (`Pristine Vintage` vs `Atmospheric Weathered`).

#### [src/components/AssetSetsCatalog.tsx] & Asset Search
- Ensure new apartment room sets appear under the **Asset Sets** tab with preview counts and instant 1-click drag/stamp placement.
- Enable tag filters: `#apartment`, `#1970s`, `#infrastructure`, `#unkempt`, `#pristine`, `#living`, `#kitchen`, `#bathroom`, `#utility`.

---

## 3. User Review Required

> [!IMPORTANT]
> - **Default Catalog Presentation**: Items will appear both as individual searchable entries in the catalog (e.g., "1970s Tweed Sofa [Pristine]" and "1970s Tweed Sofa [Unkempt]") AND provide an in-place condition swap toggle in the Object Inspector.
> - **AI Model Selection**: Prompt metadata and prompt formatting are configured for `gemini-2.5-flash` (Google AI Studio Pro's most capable free/cost-effective multi-modal tier).

---

## 4. Verification Plan

### Automated Tests
- Extend `src/game/rules.test.ts`:
  - Verify all items from `APARTMENT_BUILDING_IMPORT_CATALOG` parse with valid 3D bounds, tags, and material palettes.
  - Verify dual variant linkage (`pairedVariantId`) resolves bidirectionally between pristine and unkempt items.
  - Verify all 7 pre-composed apartment `AssetSets` contain valid relative offsets and exist in the asset registry.
  - Run `npx --yes tsx --test src/game/rules.test.ts`.
  - Run `lint_applet` (`tsc --noEmit`) to verify strict TypeScript compliance.

### Visual & Browser Verification
- Compile with `compile_applet`.
- Launch headless browser verification:
  - Open ArchitectForge catalog, filter by `#apartment` and `#1970s`.
  - Place a "1970s Tweed Sofa (Pristine)" on the lot.
  - In Object Inspector, click the "Toggle Unkempt Variant" button and confirm it morphs into the weathered sagging tweed sofa with cigarette burns.
  - Open Asset Sets tab and stamp the "1978 Unkempt Living Room Cluster" onto the lot; verify multi-selection and clipboard copying.
