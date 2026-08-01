# Codebase Cross-Analysis: Surfing vs Snowboarding

**Date:** 2026-08-02
**Scope:** File-level precision analysis of both codebases for shared framework extraction

---

## 1. WHAT'S REUSABLE (Immediate Extraction Candidates)

### Tier 1: Already Shared (Just Fix Paths)

| File | Location | Lines | Status | Action |
|------|----------|-------|--------|--------|
| `surf_math.gd` | `shared/toolkit/` | 74 | ? In shared/ | Delete vendored copies in both games |
| `utils.gd` | `shared/toolkit/` | 47 | ? In shared/ | Delete vendored copies in both games |

### Tier 2: Snowboarding Systems Ready to Share

| File | Location | Lines | Reusability | Action |
|------|----------|-------|-------------|--------|
| `event_bus.gd` | `snow/scripts/core/` | 52 | HIGH — sport-agnostic signals | Copy to `shared/core/`, add to surfing autoloads |
| `game_session.gd` | `snow/scripts/` | 10 | HIGH — cross-scene state carrier | Copy to `shared/core/`, extend for both games |
| `trick_book.gd` | `snow/scripts/` | 60 | PATTERN — data-driven trick catalog | Create `shared/systems/trick_catalog.gd` base; each game provides its own data |
| `characters.gd` | `snow/scripts/content/` | 44 | PATTERN — stat-spread roster | Create `shared/systems/character_catalog.gd` base |
| `score_popup.gd` | `snow/scripts/effects/` | ~30 | HIGH — floating score text | Copy to `shared/ui/` |
| `pause_menu.gd` | `snow/scripts/ui/` | ~60 | HIGH — resume/restart/quit | Copy to `shared/ui/` |
| `proximity_collectible.gd` | `snow/scripts/content/` | ~50 | MEDIUM — collectible pattern | Copy to `shared/systems/`, parameterize mesh/material |

### Tier 3: Surfing Patterns Worth Promoting

| File | Location | Lines | Reusability | Action |
|------|----------|-------|-------------|--------|
| `game_flow.gd` | `surf/scripts/` | 53 | MEDIUM — scene flow controller | Merge with snowboarding's `world_tour_flow.gd` into `shared/core/game_flow.gd` |
| `audio_manager.gd` | `surf/scripts/` | 62 | LOW — too minimal | Use snowboarding's `enhanced_audio_manager.gd` instead |

### Tier 4: Shared World Tour (Needs Unforking)

| File | Shared | Surfing | Snowboarding | Delta |
|------|--------|---------|-------------|-------|
| `tour_stop.gd` | ? 49 lines | Vendored copy | Vendored copy | IDENTICAL |
| `tour_save.gd` | ? 81 lines | Vendored copy | Vendored copy | IDENTICAL (but save path hardcoded to "tidebreak") |
| `tour_map.gd` | ? 258 lines | Vendored copy | Vendored copy | IDENTICAL |
| `world_tour_screen.gd` | ? 986 lines | Vendored copy | Vendored copy | IDENTICAL (but stop data is surfing-specific) |
| `world_tour_flow.gd` | ? Not in shared | N/A | 26 lines | Snow-only — needs to be generalized |

---

## 2. WHAT NEEDS REFACTORING

### Surfing Game (Higher Need)

| File | Current State | Problem | Refactor Target |
|------|--------------|---------|-----------------|
| `main.gd` (582 lines) | God object: wave mesh + camera + HUD + environment + collectibles + audio + popups + tour timer + pause | Violates SRP, untestable | Split into: `WaveTerrain.gd`, `SurfCamera.gd`, `SurfHUD.gd`, `EnvironmentBuilder.gd`, `CollectibleSpawner.gd` |
| `player.gd` (394 lines) | Reaches into parent via `_main.has_method()` | Tight coupling, untyped | Accept `Callable` for height_fn, use EventBus for popups/SFX |
| `hud.gd` (175 lines) | .tscn-dependent (%NodePaths) | Fragile to scene changes | Code-build like snowboarding, or use shared HUD base |
| `wave.gd` (70 lines) | Unused? (main.gd builds its own wave mesh) | Dead code | Delete or integrate |
| `game_flow.gd` (53 lines) | Works but surfing-specific | Won't scale to snowboarding | Generalize into shared `game_flow.gd` |

### Snowboarding Game (Lower Need, But Still)

| File | Current State | Problem | Refactor Target |
|------|--------------|---------|-----------------|
| `player.gd` (1490 lines) | Self-contained but massive | Too large to comprehend, hard to modify | Split into: `SnowPlayer.gd` (orchestrator), `GroundPhysics.gd`, `AirPhysics.gd`, `GrindPhysics.gd`, `ButterSystem.gd`, `CameraSystem.gd` |
| `main.gd` (669 lines) | Builder pattern (good) but still large | 30+ systems created inline | Extract system lists into configuration data |
| `_get_terrain_height` | Duplicated in player.gd | MUST stay byte-identical comment | Delete from player, pass Callable from main |
| `camera_controller.gd` (120 lines) | Unused? Player builds its own camera | Dead code | Delete |
| `camera_follow.gd` (35 lines) | Unused? Player builds its own camera | Dead code | Delete |
| World Tour fork | `scripts/world_tour/` is a copy of `shared/world_tour/` + `world_tour_flow.gd` | Divergence risk | Delete fork, use shared/ + add flow controller to shared/ |

### Shared Toolkit (Needs Expansion)

| File | Current State | Problem | Refactor Target |
|------|--------------|---------|-----------------|
| `tour_save.gd` | `SAVE_PATH = "user://tidebreak_world_tour.json"` | Hardcoded game name | Parameterize: `save_path_for(game_id)` |
| `world_tour_screen.gd` | `_create_tour_stops()` returns surfing data | Hardcoded sport | Accept stops via `configure_stops()` |
| `surf_math.gd` | Neither game uses `slope_at()` or `downhill_dir()` | Dead functions | Either use them or remove them |

---

## 3. MIGRATION PATH TO SHARED FRAMEWORK

### Phase 1: Fix the Foundation (Low Risk, 1-2 days)

**Goal:** Establish shared/ as the single source of truth for toolkit code.

1. **Set up symlink/submodule** so `shared/` is accessible as `res://shared/` in both games
2. **Delete vendored copies:**
   - `games/surfing/toolkit/surf_math.gd` + `.uid`
   - `games/surfing/toolkit/utils.gd` + `.uid`
   - `games/snowboarding/toolkit/surf_math.gd` + `.uid`
   - `games/snowboarding/toolkit/utils.gd` + `.uid`
3. **Delete .godot/ caches** in both projects
4. **Verify:** Both games still launch, `Utils.format_int()` and `SurfMath.noise2d()` resolve

**Risk:** LOW — files are byte-identical, just changing resolution path.

### Phase 2: Unfork World Tour (Medium Risk, 2-3 days)

**Goal:** Single World Tour module consumed by both games.

1. **Parameterize save path** in `shared/world_tour/tour_save.gd`:
   `gdscript
   static func save_path_for(game_id: String) -> String:
       return "user://%s_world_tour.json" % game_id
   `
2. **Parameterize stop data** in `shared/world_tour/world_tour_screen.gd`:
   `gdscript
   func configure_stops(game_stops: Array) -> void:
       stops = game_stops
   `
3. **Move `world_tour_flow.gd`** from snowboarding to `shared/world_tour/`
4. **Delete vendored copies:**
   - `games/surfing/scripts/world_tour/` (entire directory)
   - `games/snowboarding/scripts/world_tour/` (entire directory)
5. **Update scene references** in both games' .tscn files
6. **Delete .godot/ caches** in both projects

**Risk:** MEDIUM — .tscn files reference script paths that will change.

### Phase 3: EventBus Everywhere (Medium Risk, 3-5 days)

**Goal:** Both games use EventBus for decoupled communication.

1. **Copy `event_bus.gd`** to `shared/core/event_bus.gd`
2. **Add to surfing's project.godot** autoloads:
   `
   EventBus="res://shared/core/event_bus.gd"
   `
3. **Refactor surfing's `player.gd`:**
   - Replace `_main.show_popup()` with `EventBus.trick_completed.emit()`
   - Replace `_main.play_trick_sfx()` with `EventBus.request_sfx.emit()`
   - Replace `_main.get_wave_height_at()` with a Callable passed at setup
4. **Refactor surfing's `main.gd`:**
   - Extract HUD updates to listen on EventBus signals
   - Extract audio to listen on `request_sfx`
5. **Delete .godot/ caches**

**Risk:** MEDIUM — changes how every script in surfing communicates.

### Phase 4: Terrain Callable Unification (Medium Risk, 1-2 days)

**Goal:** Eliminate height-function duplication.

1. **Snowboarding:** Delete `player.gd::_get_terrain_height()` (lines 912-928)
2. **Snowboarding `main.gd`:** Pass `Callable(self, "_get_height")` to player via `player.set_height_fn()`
3. **Surfing:** Already uses `_main.get_wave_height_at()` — convert to Callable pattern
4. **Both games:** Use `SurfMath.slope_at(height_fn, x, z)` for slope queries instead of manual gradient calculation
5. **Delete .godot/ caches**

**Risk:** MEDIUM — physics-breaking if the Callable isn't wired correctly.

### Phase 5: Shared UI Components (Low Risk, 2-3 days)

**Goal:** Shared HUD, pause menu, score popups.

1. **Copy to shared/ui/:** `score_popup.gd`, `pause_menu.gd`
2. **Create `shared/ui/hud_base.gd`** with common HUD interface:
   - `update_score(score, combo)`
   - `update_time(time)`
   - `show_popup(text, color)`
   - `set_paused(bool)`
3. **Each game extends** `hud_base.gd` with sport-specific meters (balance bar for surf, boost/adrenaline for snow)

**Risk:** LOW — additive changes, old code can coexist during transition.

---

## 4. TECHNICAL DEBT INVENTORY

### Surfing Game

| Debt | Location | Severity | Description |
|------|----------|----------|-------------|
| God object | `main.gd` (582 lines) | HIGH | Handles 10+ responsibilities |
| Parent reaching | `player.gd:43` `_main = get_parent()` | HIGH | 7 `has_method()` checks instead of typed API |
| Dead code | `wave.gd` (70 lines) | LOW | main.gd builds its own wave mesh; this is unused |
| No EventBus | Entire project | MEDIUM | Direct coupling everywhere |
| Vendored shared code | `toolkit/`, `scripts/world_tour/` | MEDIUM | 6 files duplicated from shared/ |
| Minimal audio | `audio_manager.gd` (62 lines) | LOW | Stub implementation, no real sounds |
| No character system | N/A | LOW | Surfing has no rider customization |
| Inline environment | `main.gd:476-582` | LOW | Rocks/buoys/palms built inline, not extracted |

### Snowboarding Game

| Debt | Location | Severity | Description |
|------|----------|----------|-------------|
| Mega player.gd | `player.gd` (1490 lines) | MEDIUM | Self-contained but too large |
| Height function copy | `player.gd:912-928` | HIGH | Must stay byte-identical to main.gd:381-401 |
| Dead camera scripts | `camera_controller.gd`, `camera_follow.gd` | LOW | Player builds its own camera; these are unused |
| Dead rigged rider path | `player.gd:269` `if false and` | LOW | Disabled code for abandoned rig approach |
| Vendored shared code | `toolkit/`, `scripts/world_tour/` | MEDIUM | Duplicated from shared/ |
| Forked World Tour | `scripts/world_tour/` | MEDIUM | Has extra `world_tour_flow.gd` not in shared/ |
| Hardcoded save path | `tour_save.gd:4` | MEDIUM | "tidebreak" in snowboarding game |
| Dev artifacts | `_b1.out`, `_b2.out`, `_dump_*.gd.uid` | LOW | Build/test output files in repo root |
| Untyped declarations | Throughout | LOW | `gdscript/warnings/inference_on_variant=1` in project.godot |
| 30+ autoload `get_node` calls | `player.gd` | MEDIUM | `get_node("/root/EventBus")` called repeatedly instead of cached |

### Shared Toolkit

| Debt | Location | Severity | Description |
|------|----------|----------|-------------|
| Hardcoded save path | `tour_save.gd:4` | HIGH | "tidebreak_world_tour.json" |
| Hardcoded surf stops | `world_tour_screen.gd:63-108` | HIGH | Surfing-specific data in shared module |
| Unused SurfMath functions | `surf_math.gd:8-17` | LOW | `slope_at()` and `downhill_dir()` never called by either game |
| No tests | `toolkit/tests/` is empty | MEDIUM | Zero test coverage for shared code |
| No README | `shared/` root | LOW | No documentation of the shared module's purpose or usage |

---

## 5. INTEGRATION RISKS

### Risk 1: Godot `res://` Path Resolution (BLOCKER)
**Risk:** HIGH | **Likelihood:** CERTAIN
**Description:** Godot cannot load scripts from `../../shared/` via `res://` without help.
**Mitigation:** Create a symlink `games/surfing/shared` -> `../../shared` and `games/snowboarding/shared` -> `../../shared`. On Windows: `mklink /D games\surfing\shared ..\..\shared`.
**Validation:** Open both projects in Godot, confirm `class_name SurfMath` resolves.

### Risk 2: .uid File Orphans (HIGH)
**Risk:** MEDIUM | **Likelihood:** HIGH
**Description:** Every .gd file has a companion .uid file. Moving/deleting scripts without cleaning .uids causes Godot to log warnings and potentially misresolve resources.
**Mitigation:** When deleting vendored copies, delete both `.gd` and `.gd.uid` files. Then delete `.godot/` entirely.
**Validation:** Zero "UID not found" warnings in Godot's output panel.

### Risk 3: Scene Tree Path Breakage (MEDIUM)
**Risk:** MEDIUM | **Likelihood:** MEDIUM
**Description:** Surfing's `hud.tscn` uses `%NodePath` unique names. If the scene structure changes during refactoring, all `@onready var x = %Name` lines break.
**Mitigation:** Don't change `hud.tscn` node names during migration. Refactor the script, not the scene.
**Validation:** HUD loads without "node not found" errors.

### Risk 4: Signal Contract Mismatch (MEDIUM)
**Risk:** MEDIUM | **Likelihood:** MEDIUM
**Description:** EventBus has 30+ signals typed for snowboarding (`carve_started`, `edge_engaged`, `avalanche_started`). Surfing won't emit most of these. Shared UI code that connects to snow-specific signals will never fire.
**Mitigation:** EventBus signals are fire-and-forget — listeners that never fire are harmless. Document which signals are sport-specific vs universal.
**Validation:** Surfing game runs without errors even though 80% of EventBus signals are never emitted.

### Risk 5: Tour Progression Cross-Contamination (MEDIUM)
**Risk:** MEDIUM | **Likelihood:** HIGH (until fixed)
**Description:** Both games writing to `user://tidebreak_world_tour.json`.
**Mitigation:** Phase 2 of migration (parameterize save path per game_id).
**Validation:** Surfing and snowboarding have separate save files.

### Risk 6: Performance Regression from Shared Abstractions (LOW)
**Risk:** LOW | **Likelihood:** LOW
**Description:** Adding EventBus indirection to surfing's tight update loops (`_update_hud` every frame) could add overhead.
**Mitigation:** EventBus signals are direct connections (no queueing). Overhead is negligible vs the current `has_method()` checks.
**Validation:** Frame time doesn't increase after EventBus adoption.

---

## File Count Summary

| Category | Surfing | Snowboarding | Shared | Notes |
|----------|---------|-------------|--------|-------|
| Gameplay scripts | 7 | 4 | 0 | player, main, game_flow, trick_book, etc. |
| Core/Systems | 0 | 12 | 0 | EventBus, VFX, audio, etc. |
| Content/Levels | 0 | 19 | 0 | Characters, course features, etc. |
| Effects | 0 | 6 | 0 | Particles, popups, trails |
| UI | 1 | 4 | 0 | HUD, pause, tutorial, tricky FX |
| SSX juice | 0 | 10 | 0 | Sky, trails, camera, snow effects |
| Blueprint/Editor | 0 | 13 | 0 | Course design tools |
| Toolkit | 2 | 2 | 2 | surf_math + utils (all identical) |
| World Tour | 4 | 5 | 4 | All forked from shared |
| Shaders | 3 | 3 | 0 | All sport-specific |
| Tools/Tests | 3 | 7 | 0 | Screenshot, QA, vision judge |
| **Total .gd files** | **~20** | **~85** | **~6** | |
| **Total lines (approx)** | **~2,200** | **~12,000** | **~1,450** | |

---

## CORRECTION: World Tour Screen is a THREE-WAY Fork

**Verified via MD5 hash comparison (2026-08-02):**

| Copy | Lines | Delta from shared/ | Key Difference |
|------|-------|--------------------|----------------|
| `shared/world_tour/world_tour_screen.gd` | 987 | baseline | Base version |
| `games/surfing/scripts/world_tour/world_tour_screen.gd` | 1049 | +62 lines | Adds `@export var demo_mode: bool = false` + demo simulation logic |
| `games/snowboarding/scripts/world_tour/world_tour_screen.gd` | 951 | -36 lines | Changes comment "surfing" -> "snow-run", may have removed some demo features |

**All three copies are different.** The original analysis stated they were identical — this was wrong. The fork is smaller than feared (surfing added demo_mode, snowboarding trimmed some things) but it confirms the divergence pattern.

**Migration implication:** When unifying, need to:
1. Take the shared/ version as baseline
2. Cherry-pick the `demo_mode` feature from surfing's copy into shared/
3. Verify snowboarding's copy doesn't have any unique fixes that need to be backported
4. Delete both forked copies

**Other files confirmed byte-identical:** `tour_stop.gd`, `tour_save.gd`, `tour_map.gd` — these are safe to deduplicate immediately.
