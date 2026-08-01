# Technology Stack

**Project:** Skywalker Studio Shared Framework (Surfing + Snowboarding)
**Researched:** 2026-08-02

## Confirmed Stack (from project.godot files)

### Engine
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Godot Engine | 4.7 | Game engine | Both projects use 4.7 Forward+ |
| GDScript | 4.7 | Primary language | All gameplay code is GDScript |
| GLTFDocument | Runtime | 3D model loading | Both games load .glb at runtime (not import) |

### Rendering
| Technology | Used In | Purpose |
|------------|---------|---------|
| Forward+ | Both | Primary renderer (config/features) |
| ProceduralSkyMaterial | Surfing | Dynamic sky with custom colors per stop |
| ShaderMaterial (spatial) | Both | Ocean/snow surfaces |
| ShaderMaterial (canvas_item) | Both | Menu backgrounds, speed lines, post FX |
| GPUParticles3D | Both | Spray, sparks, snow, trails |
| StandardMaterial3D | Both | PBR materials for props, characters |

### Architecture Patterns
| Pattern | Snowboarding | Surfing | Shared? |
|---------|-------------|---------|---------|
| EventBus (signal broker) | Yes (52 signals) | No (direct coupling) | NO - needs extraction |
| Autoload singletons | 3 (EventBus, GameInitializer, GameSession) | 1 (GameFlow) | Different patterns |
| Script-based scene construction | Yes (main.gd builds everything) | Yes (main.gd builds everything) | YES - same pattern |
| Height-function terrain | Yes (analytical formula) | Yes (analytical formula) | YES - SurfMath covers this |
| class_name data classes | Yes (TrickBook, Characters) | Yes (SurfTrickBook) | YES - same pattern |

## Shared Toolkit (Already Extracted)

### `shared/toolkit/`
| File | class_name | Functions | Used By |
|------|-----------|-----------|---------|
| `surf_math.gd` | SurfMath | slope_at(), downhill_dir(), predict_jump_land(), noise2d(), fbm2d() | Both games (vendored copies) |
| `utils.gd` | Utils | clamp01(), approach(), remap_clamped(), format_int(), format_time(), lerp_color() | Both games (vendored copies) |

### `shared/world_tour/`
| File | class_name | Lines | Used By |
|------|-----------|-------|---------|
| `tour_stop.gd` | TourStop (Resource) | 49 | Surfing only (snowboard has forked copy) |
| `tour_save.gd` | TourSave | 81 | Surfing only |
| `tour_map.gd` | TourMap (Control) | 258 | Surfing only |
| `world_tour_screen.gd` | WorldTourScreen (Control) | 986 | Surfing only |

## Supporting Libraries / Systems (Snowboarding, to be shared)

| System | File | Lines | Purpose | Shared? |
|--------|------|-------|---------|---------|
| EventBus | `scripts/core/event_bus.gd` | 52 | Decoupled signal broker | SHOULD BE |
| Characters | `scripts/content/characters.gd` | 44 | Rider roster with stat spreads | Pattern reusable |
| TrickBook | `scripts/trick_book.gd` | 60 | Pure trick data catalog | Pattern reusable |
| VFXManager | `scripts/core/vfx_manager.gd` | ? | Centralized particle spawning | SHOULD BE |
| EnhancedAudioManager | `scripts/systems/enhanced_audio_manager.gd` | ? | Dynamic audio mixing | SHOULD BE |
| RaceManager | `scripts/content/race_manager.gd` | ? | AI rivals, countdown, positions | Snowboard-only |
| AvalancheSystem | `scripts/content/avalanche.gd` | ? | Chase mechanic | Snowboard-only |

## Installation / Project Structure

Current layout:
``
skywalker-studio/
  shared/
    toolkit/
      surf_math.gd      # class_name SurfMath
      utils.gd           # class_name Utils
    world_tour/
      tour_stop.gd       # class_name TourStop
      tour_save.gd       # class_name TourSave
      tour_map.gd        # class_name TourMap
      world_tour_screen.gd  # class_name WorldTourScreen
  games/
    surfing/
      toolkit/           # VENDORED COPY of shared/toolkit/
      scripts/world_tour/  # VENDORED COPY of shared/world_tour/
    snowboarding/
      toolkit/           # VENDORED COPY of shared/toolkit/
      scripts/world_tour/  # FORKED COPY (adds world_tour_flow.gd)
``

**Problem:** Both games vendor copies instead of referencing shared/. Godot's `res://` paths make this tricky — shared code must be either:
1. Symlinked into each project's `res://` tree
2. Added as a Git submodule mapped to a `res://` path
3. Copied by a build script before opening in Godot

## Sources

- `games/surfing/project.godot` (lines 1-85)
- `games/snowboarding/project.godot` (lines 1-164)
- Direct file comparison of toolkit/ and shared/toolkit/ (byte-identical confirmed)
