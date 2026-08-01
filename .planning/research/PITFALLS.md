# Domain Pitfalls

**Domain:** Godot 4.7 extreme sports games — shared framework migration
**Researched:** 2026-08-02

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Height Function Desync (ALREADY HAPPENING)
**What goes wrong:** The terrain height function exists in TWO places — `main.gd` (mesh generation) and `player.gd` (physics queries). Both files have comments saying "MUST stay byte-identical." If they drift, the player falls through the terrain or floats above it.
**Why it happens:** Two developers (or AI agents) modify terrain in one file but not the other. The snowboarding game has this exact problem — `player.gd::_get_terrain_height()` (lines 912-928) is a manual copy of `main.gd::_get_height()` (lines 381-401).
**Consequences:** Player falls through terrain on specific spots. Extremely hard to debug because it only happens at certain coordinates. Physics mesh and visual mesh don't match.
**Prevention:** Single source of truth. `main.gd` passes `Callable(self, "_get_height")` to the player at setup. Player never has its own copy. SurfMath already provides `slope_at(height_fn, ...)` — use it.
**Detection:** Grep for `_get_terrain_height` and `_get_height` — they should not both exist as independent implementations.

**Status in codebase:**
- Snowboarding: `main.gd:381` and `player.gd:912` — byte-identical COPY with warning comment
- Surfing: `main.gd:257` (`_wave_height`) — player calls `_main.get_wave_height_at()` (safer, but still fragile)

### Pitfall 2: Godot `res://` Path Resolution for Shared Code
**What goes wrong:** Godot's virtual filesystem (`res://`) doesn't natively support references outside the project directory. Code in `shared/toolkit/` can't be loaded as `res://shared/toolkit/surf_math.gd` from `games/surfing/` unless the shared directory is symlinked or mapped into the project.
**Why it happens:** Godot projects are self-contained by design. The `project.godot` defines the `res://` root.
**Consequences:** Scripts fail to load. class_name registrations don't work. Autoloads break.
**Prevention:** Use one of these approaches:
1. **Symlink** `shared/` into each game project (works on Windows with mklink /D)
2. **Git submodule** mapped to a path inside the project
3. **Build script** that copies shared/ into each project before Godot opens
4. **Godot package manager** (if available for 4.7)
**Detection:** Test that `class_name SurfMath` is globally accessible after moving files.

### Pitfall 3: class_name Collision After Deduplication
**What goes wrong:** Both games define `class_name SurfMath` and `class_name Utils` in their local `toolkit/` directories. When migrating to shared/, the old copies must be deleted — otherwise Godot sees duplicate class_name registrations and errors.
**Why it happens:** Incremental migration leaves old files in place.
**Consequences:** Godot editor shows "class already exists" errors. Scripts fail to parse.
**Prevention:** Delete vendored copies atomically with the migration. Use a script that:
1. Copies shared/ into project
2. Deletes local toolkit/ copies
3. Reimports
**Detection:** `grep -r "class_name SurfMath" games/` should return zero results after migration.

### Pitfall 4: World Tour Save Path Collision
**What goes wrong:** `tour_save.gd` hardcodes `SAVE_PATH := "user://tidebreak_world_tour.json"`. If both games use the same shared TourSave, they'll read/write the same save file — surfing progress will appear in snowboarding and vice versa.
**Why it happens:** The save path was written for the surfing game ("Tidebreak") and never parameterized.
**Consequences:** Players see cross-game save corruption. Medals from surfing appear in snowboarding tour.
**Prevention:** Parameterize the save path:
```gdscript
# Instead of:
const SAVE_PATH := "user://tidebreak_world_tour.json"

# Use:
static func save_path_for(game_id: String) -> String:
    return "user://%s_world_tour.json" % game_id
```
**Detection:** Check `tour_save.gd` for hardcoded game-specific strings.

### Pitfall 5: World Tour Screen Hardcodes Surfing Stops
**What goes wrong:** `world_tour_screen.gd::_create_tour_stops()` returns 7 surfing locations (Pipeline, Trestles, Snapper Rocks, etc.). If snowboarding uses this same screen, it'll show surf stops for a snow game.
**Why it happens:** The stop data is hardcoded in the screen class, not injected.
**Consequences:** Snowboarding game shows "PIPELINE, HAWAII" when it should show alpine mountains.
**Prevention:** Make WorldTourScreen accept stops via configuration, not hardcoded:
```gdscript
# Instead of _create_tour_stops() returning surfing data,
# accept stops from the calling game:
func configure_stops(game_stops: Array) -> void:
    stops = game_stops
```
**Detection:** The `_create_tour_stops()` method contains surfing-specific data (wave heights, surf conditions).

## Moderate Pitfalls

### Pitfall 6: Input Map Incompatibility
**What goes wrong:** Surfing uses `move_left/move_right/trick_1/trick_2`. Snowboarding uses `steer_left/steer_right/jump/trick_left/trick_right/boost/uber/grind`. Shared systems (pause menu, HUD) that reference input actions will break if the action doesn't exist.
**Prevention:** Shared UI code should check `InputMap.has_action()` before referencing sport-specific actions. Or: define a minimal shared input contract (`reset`, `pause`, `ui_cancel`) and let each game define its own sport actions.

### Pitfall 7: Viewport Size Mismatch
**What goes wrong:** Surfing is 1280x720. Snowboarding is 1920x1080. Shared UI code with hardcoded pixel offsets will look wrong at different resolutions.
**Prevention:** Use anchor-based layouts (both games already do this). Avoid `custom_minimum_size` for critical layout. Test shared UI at both resolutions.

### Pitfall 8: Audio Bus Layout Assumptions
**What goes wrong:** Snowboarding expects "Music" and "SFX" audio buses (`AudioServer.get_bus_index("Music")`). Surfing doesn't define these. Shared audio code that references bus names will fail silently or error.
**Prevention:** Shared audio manager should create buses if they don't exist, or use the default bus. Check `AudioServer.get_bus_index()` return values.

### Pitfall 9: Autoload Name Collisions
**What goes wrong:** Surfing autoloads `GameFlow`. Snowboarding autoloads `EventBus`, `GameInitializer`, `GameSession`. If shared code assumes `EventBus` exists (`get_node("/root/EventBus")`), it will crash in the surfing game.
**Prevention:** Either:
1. Both games must autoload EventBus (recommended — it's the whole point)
2. Shared code uses `get_node_or_null("/root/EventBus")` and gracefully degrades

### Pitfall 10: .godot/ Cache Staleness
**What goes wrong:** Godot's `.godot/` directory caches imports, UIDs, and script class info. Moving files between directories invalidates these caches but Godot doesn't always detect it.
**Consequences:** Stale class_name references. Orphaned .uid files. Scripts appear to load but reference old paths.
**Prevention:** After any shared/ migration:
1. Close Godot
2. Delete `.godot/` entirely
3. Reopen project (Godot regenerates the cache)
**Detection:** `.godot/` contains `uid_cache.bin` — delete it if scripts behave oddly.

## Minor Pitfalls

### Pitfall 11: GLTFDocument Runtime Loading Performance
**What goes wrong:** Both games load .glb models at runtime via `GLTFDocument.append_from_buffer()`. This is slow (blocks the main thread) and can cause frame hitches.
**Prevention:** Use `ResourceLoader.load_threaded_request()` for async loading, or pre-load models in a loading screen.

### Pitfall 12: GPU Particle Limits
**What goes wrong:** Snowboarding has 15+ particle systems running simultaneously. Adding more from shared VFX could exceed GPU particle limits on weaker hardware.
**Prevention:** Use `ObjectPool` (already exists in snowboarding `scripts/core/object_pool.gd`) for particle recycling.

### Pitfall 13: Snowboarding's `if false and` Dead Code
**What goes wrong:** `player.gd:269` has `if false and ResourceLoader.exists(rigged_path):` — a disabled code path for a rigged character model that was abandoned. This dead code confuses future developers.
**Prevention:** Remove dead code paths during migration. If needed later, git history preserves them.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Extract toolkit to shared/ | class_name collision (#3) | Delete vendored copies atomically |
| Unify World Tour | Save path collision (#4), hardcoded stops (#5) | Parameterize game_id and stop data |
| EventBus in surfing game | Autoload name collision (#9) | Add EventBus to surfing's project.godot autoloads |
| Refactor surfing main.gd | Height function desync (#1) | Pass Callable from terrain to player |
| Shared player base class | Sport-specific physics bleed | Use template method pattern, not inheritance |
| Shared camera rig | Viewport size mismatch (#7) | Use relative offsets, not absolute pixels |
| Shared audio | Audio bus assumptions (#8) | Create buses if missing, use defaults |
| .godot/ cache issues | Stale imports (#10) | Delete .godot/ after every structural change |

## Integration Risk Matrix

| Integration Point | Risk | Impact | Likelihood |
|------------------|------|--------|------------|
| Godot res:// path resolution | HIGH | Blocks all shared code | HIGH (needs symlink/submodule setup) |
| Height function dedup | HIGH | Physics desync, player falls through terrain | MEDIUM (requires careful Callable wiring) |
| World Tour save path | MEDIUM | Cross-game save corruption | HIGH (currently hardcoded) |
| World Tour stop data | MEDIUM | Wrong sport displayed | HIGH (currently hardcoded) |
| EventBus adoption in surfing | LOW | Gradual, additive change | LOW (just add autoload) |
| class_name collision | MEDIUM | Editor errors, broken scripts | HIGH if migration is incremental |
| .godot/ cache staleness | LOW | Confusing bugs, wasted time | HIGH (happens every time) |

## Sources

- `player.gd` (snowboarding) lines 912-928: `_get_terrain_height` with "MUST stay byte-identical" comment
- `main.gd` (snowboarding) lines 381-401: `_get_height` — the original
- `tour_save.gd` line 4: `SAVE_PATH := "user://tidebreak_world_tour.json"`
- `world_tour_screen.gd` lines 63-108: hardcoded surfing stops
- `player.gd` (surfing) lines 378-394: `_main.has_method()` pattern
- `main.gd` (surfing) line 270: `get_wave_height_at` as public API
- `project.godot` (surfing) line 22: 1280x720 viewport
- `project.godot` (snowboarding) line 35: 1920x1080 viewport

---

## CORRECTION: World Tour Screen Has Already Diverged (Verified 2026-08-02)

MD5 hash comparison reveals `world_tour_screen.gd` exists in **three different versions**:
- `shared/`: 987 lines (baseline)
- `games/surfing/`: 1049 lines (+62 lines, adds `demo_mode` export)
- `games/snowboarding/`: 951 lines (-36 lines, comment changes + possible trimming)

This is **worse than a two-way fork** — it's a three-way divergence that will get harder to merge over time. The other three world_tour files (`tour_stop.gd`, `tour_save.gd`, `tour_map.gd`) remain byte-identical across all three locations and are safe to deduplicate immediately.
