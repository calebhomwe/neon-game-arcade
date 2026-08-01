# Feature Landscape

**Domain:** Extreme sports games (surfing + snowboarding) in Godot 4.7
**Researched:** 2026-08-02

## Feature Matrix: What Exists Where

### Core Gameplay Systems

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| Player controller (CharacterBody3D) | `player.gd` (394 lines) | `player.gd` (1490 lines) | NO | Surfing: balance-based. Snow: edge/carve/air/grind/butter |
| Trick detection & scoring | `player.gd` inline | `player.gd` + `trick_book.gd` | PARTIAL | Snow has data-driven TrickBook; surf has inline SurfTrickBook |
| Combo system | `player.gd` (combo_timer) | `player.gd` (COMBO_WINDOW) | NO | Different implementations, same concept |
| Score popups | `main.gd` (Label3D) | `effects/score_popup.gd` | NO | Different rendering approach |
| Balance/wipeout | `player.gd` (balance 0-100) | `player.gd` (grind_balance) | PARTIAL | Surf: global balance. Snow: grind-specific |
| Boost/adrenaline | NO | `player.gd` (boost + adrenaline) | NO | Snow-only currently |
| Uber trick | NO | `player.gd` (uber_mode) | NO | Snow-only SSX feature |
| Rail grinding | NO | `player.gd` (_process_grind) | NO | Snow-only |
| Butter/press | NO | `player.gd` (_process_butter_press) | NO | Snow-only |
| Speed wobble | NO | `player.gd` (WOBBLE_THRESHOLD) | NO | Snow-only |
| Character roster | NO | `characters.gd` (4 riders) | NO | Snow-only SSX feature |

### Terrain & Environment

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| Analytical height function | `main.gd::_wave_height()` | `main.gd::_get_height()` | NO | Different formulas, same pattern |
| Height-fn duplication | `player.gd` calls `main.get_wave_height_at()` | `player.gd::_get_terrain_height()` COPY | RISK | Snow has a COPY that must stay byte-identical |
| Procedural mesh generation | `main.gd::_build_wave_mesh()` (80x80 grid) | `main.gd::_build_terrain()` (64x240 grid) | NO | Same SurfaceTool pattern |
| Terrain shader | `ocean.gdshader` (spatial) | `snow_ssx.gdshader` (spatial) | NO | Water vs snow |
| Environment props | Rocks, buoys, palms (inline in main.gd) | Trees, mountains, neon tunnels, crowds | NO | Sport-specific dressing |
| Course features | NO | Kickers, rails, pipes, branch path | NO | Snow-only |
| Avalanche | NO | `avalanche.gd` | NO | Snow-only chase mechanic |

### Camera Systems

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| Chase camera | `main.gd::_update_camera()` (inline) | `player.gd::_process()` (inline, 150+ lines) | NO | Snow is far more sophisticated |
| Multiple camera views | NO | 4 views (CHASE, ACTION_WIDE, FP, ORBIT) | NO | Snow-only |
| Auto trick/wipeout cam | NO | `auto_cam_state` (TRICK/WIPEOUT) | NO | Snow-only |
| Camera shake | FOV kick only | Landing shake + high-speed shake | NO | Snow-only |
| Camera banking | NO | Carve roll (`_cam_roll`) | NO | Snow-only |
| FOV speed kick | YES (simple lerp) | YES (per-view, quadratic) | NO | Different implementations |

### UI / HUD

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| HUD | `ui/hud.gd` (175 lines, .tscn) | `ui.gd` (245 lines, code-built) + `enhanced_hud.gd` | NO | Different construction approaches |
| Pause menu | In `hud.gd` | `pause_menu.gd` (separate) | NO | |
| Score popup | Label3D in 3D space | `score_popup.gd` in CanvasLayer | NO | |
| Speed lines | `speed_lines.gdshader` (canvas_item) | `speed_lines.gd` (GPU particles) | NO | Different implementation |
| Tour mode HUD | YES (in hud.gd) | Via `world_tour_flow.gd` | PARTIAL | Same concept, different wiring |
| Tutorial overlay | NO | `tutorial_overlay.gd` | NO | Snow-only |
| Tricky FX | NO | `tricky_fx.gd` (chromatic aberration) | NO | Snow-only |

### Progression / Meta

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| World Tour screen | `world_tour_screen.gd` (shared/) | `world_tour_screen.gd` (forked copy) | FORKED | Same code, different locations |
| Tour save/load | `tour_save.gd` (shared/) | `tour_save.gd` (forked copy) | FORKED | Save path hardcoded to "tidebreak" |
| Scene flow | `game_flow.gd` autoload | `game_session.gd` autoload + `world_tour_flow.gd` | NO | Different patterns |
| Medal system | In `world_tour_screen.gd` | In `world_tour_screen.gd` | YES (shared) | Same medal_for_score() logic |
| Heat timer | `main.gd::_update_tour_timer()` | `race_manager.gd` | NO | Different implementations |

### Audio

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| Audio manager | `audio_manager.gd` (62 lines, minimal) | `enhanced_audio_manager.gd` (full) | NO | Surf is stub; snow is production |
| Ambient loop | YES (ocean_ambient.wav) | YES (dynamic mixing) | PARTIAL | |
| SFX one-shots | YES (4 types) | YES (EventBus-driven) | NO | Different dispatch |
| Music bus | NO | YES (Music bus, muted by default) | NO | |

### Visual Effects

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| VFX manager | NO | `vfx_manager.gd` | NO | Snow-only centralized system |
| Particle trails | Splash particles (player.gd) | Snow trail, board trail, carve spray | NO | |
| Landing effects | Wipeout splash | Landing dust (`landing_dust.gd`) | NO | |
| Grind sparks | NO | `grind_sparks.gd` | NO | |
| SSX juice layer | NO | 10 scripts in `scripts/ssx/` | NO | |

### Dev Tools

| Feature | Surfing | Snowboarding | Shared? | Notes |
|---------|---------|-------------|---------|-------|
| Screenshot capture | NO | `--shot` / `--shots` CLI args | NO | |
| QA harness | `test_flow.gd` | `qa_harness.gd` | NO | |
| Vision judge | NO | `vision_judge.py` | NO | |
| Automated improvement | NO | `auto_improve.py` | NO | |
| Course editor | NO | `track_editor.gd` + `blueprint/` | NO | |

## Table Stakes (Both Games Need)

| Feature | Current State | Shared Opportunity |
|---------|--------------|-------------------|
| Score display + formatting | Both use `Utils.format_int()` | ALREADY SHARED via utils.gd |
| Time formatting | Both use `Utils.format_time()` | ALREADY SHARED via utils.gd |
| Terrain height queries | Both have analytical functions | SurfMath provides slope_at/downhill_dir but neither uses them |
| Scene flow / state passing | Both need cross-scene state | Shared GameSession pattern needed |
| Pause/resume | Both implement independently | Shared pause system possible |
| Input handling | Different input maps | Shared input abstraction possible |

## Differentiators (Sport-Specific)

| Game | Unique Features |
|------|----------------|
| Surfing | Wave riding physics, barrel detection, cutback scoring, wave surface snapping, ocean shader |
| Snowboarding | Edge carving, rail grinding, butter/press, uber tricks, SSX TRICKY state, character roster, race mode, avalanche chase, course features (kickers/pipes/rails) |

## Anti-Features (Do NOT Share)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Sport-specific physics | Surfing balance != snowboarding edges | Keep player.gd separate per sport |
| Terrain height formulas | Wave != mountain | Keep _wave_height / _get_height separate |
| Input maps | Different control schemes | Keep input maps per-project |
| Shaders | Ocean != snow | Keep shaders per-project |
| Sport-specific VFX | Splash != snow spray | Keep VFX per-project |

## MVP Recommendation for Shared Framework

Prioritize:
1. **EventBus** (snowboarding's pattern, sport-agnostic signals)
2. **Utils + SurfMath** (already shared, just fix paths)
3. **World Tour module** (unfork the forked copies)
4. **TrickBook pattern** (data-driven trick catalog, sport-specific data)
5. **Score popup system** (both games need it, currently different)

Defer: Player controller base class — too sport-specific to abstract cleanly right now.

## Sources

- Full file inventory of both `scripts/` directories
- Line-by-line comparison of `toolkit/` vs `shared/toolkit/`
- `INTEGRATION.md` and `GAME_STATUS.md` from snowboarding project
