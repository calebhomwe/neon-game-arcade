# AGENTS.md — Tidebreak

## Repo
- Godot 4.7 2-player local multiplayer party game
- Entry point: `scenes/Main.tscn`
- Code: `scripts/` | Scenes: `scenes/` | Art: `sprites/` | Audio: `sounds/`
- Browser version: `../games-hub.html`

## Running
1. Open project folder in Godot 4.7+
2. Press F5 (input map pre-configured in project.godot)
- P1: WASD + E (trap) | P2: Arrows + Right Shift (trap)
- Escape = pause | R = restart after win

## Architecture
- `sound_effects.gd` — autoload singleton, pooled AudioStreamPlayer2D (8 voices)
- `player.gd` — CharacterBody2D, movement/trap/freeze/visual states
- `confetti_trap.gd` — Area2D, 3s lifetime, freezes opposite player on contact
- `care_package.gd` — Area2D, 4s respawn, pickup triggers score run
- `dropoff_zone.gd` — Area2D, scores when matching player enters with package
- `game_manager.gd` — score tracking, win at 3
- `hud.gd` — status text, pause, freeze timer (PROCESS_MODE_ALWAYS)
- `main_control.gd` — screen shake with decay
- `pulse_shader.gdshader` — alpha pulse on dropoff zones

## Completed
- ✅ project.godot (4.7, input map, autoload, gl_compatibility renderer)
- ✅ Sprite textures (sprites/*.png)
- ✅ Sound WAV files (sounds/*.wav) with pooled playback
- ✅ Particle effects (ParticleProcessMaterial, timer cleanup)
- ✅ Screen shake on freeze
- ✅ Win/lose + R restart
- ✅ Score tracking (first to 3)
- ✅ HUD: status, freeze timer, pause (Escape)
- ✅ Pulse shader via ShaderMaterial
- ✅ Player color coding + visual states (frozen/package/cooldown)
- ✅ Trap cooldown + color coding
- ✅ Package respawn pulse
- ✅ PROCESS_MODE_ALWAYS on HUD + zones (pause works)
- ✅ icon.svg + .gitignore

## Remaining
- (none)
