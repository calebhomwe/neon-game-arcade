# Architecture Patterns

**Domain:** Godot 4.7 extreme sports games (surfing + snowboarding)
**Researched:** 2026-08-02

## Current Architecture: Surfing Game

``
project.godot
  autoload: GameFlow (scripts/game_flow.gd)

scenes/main_menu.tscn -> main_menu.gd
scenes/main.tscn -> main.gd (582 lines, GOD OBJECT)
scenes/world_tour.tscn -> world_tour_screen.gd (from shared/)
ui/hud.tscn -> hud.gd (175 lines)

main.gd responsibilities:
  - Wave mesh generation + animation
  - Wave height function (physics + visuals)
  - Camera control
  - HUD updates
  - Tour timer
  - Environment (sky, rocks, buoys, palms)
  - Collectible spawning
  - Audio manager creation
  - Score popup spawning (Label3D)
  - Tour context application
  - Pause/resume
  - Player reset

Player.gd -> main.gd coupling:
  - _main = get_parent()
  - _main.has_method("get_wave_height_at")
  - _main.has_method("show_popup")
  - _main.has_method("play_trick_sfx")
  - _main.has_method("play_wipeout_sfx")
``

**Problem:** main.gd is a 582-line god object. Player reaches back into parent via has_method() checks — fragile, untyped, no signal decoupling.

## Current Architecture: Snowboarding Game

``
project.godot
  autoload: EventBus (scripts/core/event_bus.gd)
  autoload: GameInitializer (scripts/core/game_initializer.gd)
  autoload: GameSession (scripts/game_session.gd)

world_tour.tscn -> world_tour_flow.gd (flow controller)
  -> WorldTourScreen (from scripts/world_tour/)
Main.tscn -> main.gd (669 lines, BUILDER)

main.gd responsibilities:
  - Terrain mesh generation
  - Height function
  - Decor (trees, mountains)
  - Content generators (rocks, boosts, obstacles, ramps, rails)
  - Course features (CourseRamps, CourseRails, CoursePipes, CourseDressing)
  - BackdropPeaks, NeonTunnels, BranchPath
  - Pickups
  - Player creation
  - UI creation
  - Enhanced systems (ArtDirector, AudioManager, HUD, VFX)
  - Avalanche, RaceManager, Heli, Crowds
  - SSX glow-up systems
  - Screenshot modes

Player.gd (1490 lines, SELF-CONTAINED):
  - Builds own collision, visuals, camera, effects
  - Camera system (4 views + auto-cams)
  - All physics (ground, air, grind, butter)
  - All trick/scoring logic
  - EventBus emitter (not direct coupling)
  - Character roster application
``

**Strength:** EventBus decouples systems. Player builds its own camera/VFX. main.gd is a builder/orchestrator, not a god object.

**Weakness:** player.gd is 1490 lines — too large, but at least self-contained.

## Recommended Shared Architecture

``
shared/
  toolkit/
    surf_math.gd          # Height-field math (Callable-based)
    utils.gd              # Formatting, clamping, interpolation
  world_tour/
    tour_stop.gd          # Resource: stop definition
    tour_save.gd          # Save/load progression
    tour_map.gd           # UI: map widget
    world_tour_screen.gd  # UI: full tour screen
  core/
    event_bus.gd          # Signal broker (sport-agnostic signals)
    game_session.gd       # Cross-scene state carrier
    pause_manager.gd      # Shared pause/resume logic
  ui/
    score_popup.gd        # Reusable score popup (CanvasLayer)
    hud_panel.gd          # Base HUD panel (score, combo, time)
    pause_menu.gd         # Shared pause menu
  systems/
    audio_manager.gd      # Base audio manager (ambient + SFX)
    trick_catalog.gd      # Base trick data pattern
    camera_rig.gd         # Base chase camera (sport-specific overrides)
``

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| EventBus | Signal broker, decoupled communication | Everything (pub/sub) |
| GameSession | Cross-scene state (tour_stop_id, character_id, scores) | World Tour <-> Game scene |
| WorldTourScreen | Tour progression UI, medal logic | GameSession, TourSave |
| AudioManager | Ambient loops + SFX one-shots | EventBus (request_sfx) |
| ScorePopup | Floating score text | Called directly by gameplay |
| CameraRig | Chase/follow camera with FOV kick | Player (position/speed read) |
| SurfMath | Height-field slope, downhill, noise | Any terrain system |
| Utils | Formatting, math helpers | Anywhere |

### Data Flow

``
[World Tour Screen] --event_requested--> [GameSession] --loads--> [Game Scene]
                                                                     |
                                                              [main.gd builder]
                                                                     |
                                              +------------------+---------+------------------+
                                              |                  |         |                  |
                                          [Player]          [Terrain]    [Audio]           [VFX]
                                              |                  |         |                  |
                                         EventBus <-----------> EventBus  EventBus         EventBus
                                              |
                                          [HUD / UI]
                                              |
                                      [Game Session] <--score at end--> [World Tour Screen]
``

## Patterns to Follow

### Pattern 1: EventBus Decoupling (from Snowboarding)
**What:** Central signal broker. Systems emit signals instead of calling methods on each other.
**When:** Any cross-system communication (score changed, trick completed, SFX request).
**Example:**
```gdscript
# Instead of:
_main.show_popup("TRICK!", Color.GREEN)

# Use:
EventBus.trick_completed.emit("METHOD", 400)
# HUD connects to EventBus.trick_completed and shows its own popup
```

### Pattern 2: Builder main.gd (from Snowboarding)
**What:** main.gd creates child systems in _ready(), each system is self-contained.
**When:** Scene setup. Every system owns its own lifecycle.
**Example:**
```gdscript
func _ready() -> void:
    var terrain := _build_terrain()
    var player := _build_player()
    player.setup(terrain, pickups)
    var audio := EnhancedAudioManager.new()
    add_child(audio)
    var hud := EnhancedHUD.new()
    hud.setup(player)
    add_child(hud)
```

### Pattern 3: Callable Height Function (from SurfMath)
**What:** Terrain queries via `Callable` instead of direct node references.
**When:** Any gameplay code that needs terrain height/slope.
**Example:**
```gdscript
var height_fn := Callable(self, "_get_height")
var slope := SurfMath.slope_at(height_fn, x, z)
var downhill := SurfMath.downhill_dir(height_fn, x, z)
```

### Pattern 4: Data-Driven Trick Catalog (from TrickBook)
**What:** Pure-data RefCounted class with static lookup methods.
**When:** Any game with a trick/scoring system.
**Example:**
```gdscript
class_name TrickCatalog extends RefCounted
const TRICKS: Array = [...]
static func get_trick(id: String) -> Dictionary: ...
static func tricks_of_kind(kind: String) -> Array: ...
```

### Pattern 5: Self-Building Player (from Snowboarding)
**What:** Player creates its own collision, visuals, camera, effects in _ready().
**When:** Complex player with multiple subsystems.
**Why:** Avoids scene file dependencies, allows code-only instantiation.

## Anti-Patterns to Avoid

### Anti-Pattern 1: God Object main.gd (Surfing's current pattern)
**What:** main.gd handles wave mesh, camera, HUD, environment, collectibles, audio, popups, tour timer, pause.
**Why bad:** 582 lines, every change risks breaking something else, untestable.
**Instead:** Split into Terrain, CameraRig, HUD, AudioManager, CollectibleSpawner systems.

### Anti-Pattern 2: Parent Reaching (Surfing's player.gd)
**What:** `_main = get_parent()` then `_main.has_method("get_wave_height_at")`.
**Why bad:** Tight coupling, untyped, fragile to scene tree changes.
**Instead:** Pass a Callable height function, or use EventBus.

### Anti-Pattern 3: Height Function Duplication (Both games)
**What:** `main.gd::_get_height()` and `player.gd::_get_terrain_height()` must stay byte-identical.
**Why bad:** Any terrain change requires updating two places. Comment says "MUST stay byte-identical" — this will drift.
**Instead:** Single source of truth. Player receives a Callable from main.gd, or both call a shared TerrainHeightmap class.

### Anti-Pattern 4: Vendored Copies of Shared Code
**What:** `toolkit/surf_math.gd` exists in 3 places (shared, surfing, snowboarding).
**Why bad:** Bug fixes must be applied 3 times. Already happened with world_tour (snowboard forked it).
**Instead:** Single source in `shared/`, referenced via symlink or build script.

### Anti-Pattern 5: Code-Built UI Without Theme (Both games)
**What:** UI built entirely in code with manual StyleBoxFlat creation.
**Why bad:** 200+ lines of UI styling code, no theme reuse, hard to iterate visually.
**Instead:** Godot Theme resources + minimal code overrides.

## Scalability Considerations

| Concern | Current (2 games) | At 5 games | At 10 games |
|---------|-------------------|------------|-------------|
| Toolkit duplication | 3 copies of 2 files | 10 copies | Unmanageable |
| World Tour forks | 2 variants | 5+ variants | Need plugin architecture |
| EventBus signals | 52 (snow only) | Need sport-specific signals | Need signal namespacing |
| player.gd size | 394 / 1490 lines | Each sport-specific | Need base class + overrides |
| Height function sync | 2 pairs to keep in sync | 10 pairs | Need shared TerrainQuery |

## Sources

- Full read of both `main.gd` files (surfing: 582 lines, snowboarding: 669 lines)
- Full read of both `player.gd` files (surfing: 394 lines, snowboarding: 1490 lines)
- `event_bus.gd` (52 lines, 30+ signals)
- `game_flow.gd` (surfing, 53 lines) vs `game_session.gd` + `world_tour_flow.gd` (snowboarding)
- Directory listings of all `scripts/` subdirectories
