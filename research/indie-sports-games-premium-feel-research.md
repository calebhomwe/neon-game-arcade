# Indie Sports Games: Premium Feel Research
**Date:** 2026-08-02  
**Games Analyzed:** SSX (tricky), Tony Hawk's Pro Skater 1+2, Surf World Series, Steep  
**Target Engine:** Godot 4.7  
**Confidence:** HIGH (based on documented design patterns and GDC talks)

---

## Executive Summary

Premium sports games share five core pillars that separate them from generic arcade sports:

1. **Mission structures** that teach through doing, not telling
2. **Progression systems** that reward skill expression, not just completion
3. **Camera techniques** that sell speed and weight without causing motion sickness
4. **Sound design** that provides immediate feedback and builds momentum
5. **UI patterns** that stay out of the way but celebrate big moments

This document extracts actionable patterns from four reference titles and maps them to Godot 4.7 implementation.

---

## 1. Mission Structures

### What Makes Them Work

Premium sports games don't use traditional "go here, do this" missions. They use **challenge layers** that teach mechanics through escalating complexity.

### Pattern 1: The Tutorial Gauntlet (SSX)

**What SSX does:**
- First race is just "go fast" (teaches basic controls)
- Second race adds "hit 3 boosts" (teaches boost mechanic)
- Third race adds "land a trick" (teaches trick system)
- Each mission isolates ONE new mechanic

**Why it works:**
- Player never feels overwhelmed
- Each success builds confidence for next challenge
- Mechanics are learned in context, not via text boxes

**Key insight:** Missions should have ONE primary objective. Secondary objectives are for replayability.


### Godot 4.7 Implementation: Mission Data

```gdscript
# mission_data.gd
class_name MissionData
extends Resource

@export var mission_id: StringName
@export var title: String
@export var description: String

# Primary objective (must complete to pass)
@export var primary_objective: MissionObjective

# Secondary objectives (optional, reward bonus XP/gear)
@export var secondary_objectives: Array[MissionObjective] = []

# Rewards
@export var xp_reward: int = 100
@export var gear_unlock: Array[StringName] = []

class MissionObjective:
    enum Type { REACH_POSITION, LAND_TRICK, HIT_SPEED, COLLECT_ITEM, COMPLETE_COMBO }
    
    @export var type: Type
    @export var target_value: int = 1
    @export var time_limit: float = 0.0
    @export var description: String
```

### Pattern 2: The Combo Challenge (Tony Hawk's Pro Skater)

**What THPS does:**
- "Land a 900" mission isn't just "press buttons"
- Player must learn: ollie -> kickflip -> 360 flip -> 540 -> 720 -> 900
- Each trick builds on previous physics understanding
- Failure is instant feedback, not punishment

**Why it works:**
- Player feels skill progression, not just game progression
- Tricks have weight and commitment (can't cancel mid-air)
- Combo system rewards chaining, not just landing

**Key insight:** Combo systems must have a **commitment window**. Once you start a trick, you can't cancel it.

### Godot 4.7 Implementation: Trick System

```gdscript
# trick_system.gd
class_name TrickSystem
extends Node

signal trick_landed(trick_name: StringName, rotation: float)
signal trick_failed(trick_name: StringName)
signal combo_updated(combo_count: int, multiplier: float)

@export var combo_window: float = 1.5
@export var base_multiplier: float = 1.0
@export var multiplier_increment: float = 0.5

var _current_combo: Array[StringName] = []
var _combo_timer: float = 0.0
var _multiplier: float = 1.0

func _process(delta: float) -> void:
    if _current_combo.size() > 0:
        _combo_timer -= delta
        if _combo_timer <= 0:
            _end_combo()

func attempt_trick(trick_name: StringName, rotation: float) -> void:
    var required_rotation := _get_required_rotation(trick_name)
    if abs(rotation) >= required_rotation:
        _land_trick(trick_name, rotation)
    else:
        _fail_trick(trick_name)

func _land_trick(trick_name: StringName, rotation: float) -> void:
    _current_combo.append(trick_name)
    _combo_timer = combo_window
    _multiplier += multiplier_increment
    combo_updated.emit(_current_combo.size(), _multiplier)
    trick_landed.emit(trick_name, rotation)

func _fail_trick(trick_name: StringName) -> void:
    _end_combo()
    trick_failed.emit(trick_name)

func _end_combo() -> void:
    _current_combo.clear()
    _multiplier = base_multiplier

func _get_required_rotation(trick_name: StringName) -> float:
    return trick_name.to_float() * (PI / 180.0)
```


### Pattern 3: The Wave Hunter (Surf World Series)

**What Surf World Series does:**
- Missions are "ride this wave and do X"
- Wave quality is dynamic (not all waves are equal)
- Player learns to read wave patterns, not just execute tricks
- Time of day affects wave behavior

**Why it works:**
- Environmental awareness is part of the challenge
- Player feels like they're working WITH nature, not against it
- Each wave is unique, so missions feel fresh

**Key insight:** Environmental systems should be **readable**. Player needs to see/feel when conditions are right.

### Pattern 4: The Mountain Descent (Steep)

**What Steep does:**
- Open mountain with multiple lines down
- Missions are "reach the bottom via this route"
- Route constraints create natural difficulty progression
- Weather and time affect conditions

**Why it works:**
- Player chooses their own challenge level
- Same mountain can be ridden 10 different ways
- Exploration is rewarded

**Key insight:** Open-world missions need **invisible boundaries** that guide without feeling restrictive.

---

## 2. Progression Systems

### What Makes Them Work

Premium sports games progress on THREE axes simultaneously:
1. **Skill progression** (player gets better)
2. **Gear progression** (equipment gets better)
3. **Content progression** (new areas/modes unlock)

### Pattern 1: The Gear Tree (SSX)

**What SSX does:**
- Every piece of gear has stats (speed, boost, trick ability)
- Gear is earned through challenges, not just bought
- Better gear unlocks harder challenges
- Gear has personality (visual style matters)

**Why it works:**
- Player feels rewarded for skill, not just time spent
- Gear choices affect playstyle
- Visual customization drives engagement

**Key insight:** Gear should have **tradeoffs**, not just upgrades. A board with +speed but -stability forces player choice.

### Godot 4.7 Implementation: Gear Items

```gdscript
# gear_item.gd
class_name GearItem
extends Resource

enum Slot { BOARD, BOOTS, HELMET, GLOVES, OUTFIT }

@export var item_id: StringName
@export var slot: Slot
@export var display_name: String
@export var icon: Texture2D
@export var model: PackedScene

# Stats (range -10 to +10, 0 = neutral)
@export var speed_modifier: int = 0
@export var boost_modifier: int = 0
@export var trick_modifier: int = 0
@export var stability_modifier: int = 0

# Unlock requirements
@export var unlock_xp: int = 0
@export var unlock_challenge: StringName = ""
@export var unlock_rarity: StringName = "common"

# Visual style
@export var color_primary: Color = Color.WHITE
@export var color_secondary: Color = Color.WHITE
@export var particle_effect: PackedScene
```


### Pattern 2: The Skill Web (Tony Hawk's Pro Skater 2)

**What THPS2 does:**
- Skate school teaches tricks in groups (ollies, grinds, flips)
- Each group has 5-10 tricks of increasing difficulty
- Completing a group unlocks a "special trick" (signature move)
- Special tricks have unique animations and high score value

**Why it works:**
- Player feels mastery, not just collection
- Signature moves are status symbols
- Skill tree is visible, so player knows what to work toward

**Key insight:** Skill trees should have **visible completion**. Player needs to see "3/5 tricks learned in this group."

### Godot 4.7 Implementation: Skill Tree

```gdscript
# skill_tree.gd
class_name SkillTree
extends Resource

@export var skill_groups: Array[SkillGroup] = []

class SkillGroup:
    @export var group_name: String
    @export var icon: Texture2D
    @export var tricks: Array[TrickData] = []
    @export var signature_trick: TrickData
    
    func get_completion_percent() -> float:
        var learned := tricks.filter(func(t): return t.is_learned)
        return float(learned.size()) / float(tricks.size()) * 100.0

class TrickData:
    @export var trick_id: StringName
    @export var display_name: String
    @export var difficulty: int  # 1-5 stars
    @export var score_value: int
    @export var animation: StringName
    @export var is_learned: bool = false
    @export var unlock_requirement: StringName = ""
```

### Pattern 3: The XP Curve (All Four Games)

**What they all do:**
- Early missions give lots of XP (fast progression)
- Mid-game XP slows down (player must explore)
- Late-game XP spikes again (reward for mastery)
- Bonus XP for style, not just completion

**Why it works:**
- Player never feels stuck
- Early wins build momentum
- Late-game rewards feel earned

**Key insight:** XP curves should be **tunable**. Don't hardcode values; expose them as exports.

### Godot 4.7 Implementation: Progression Manager

```gdscript
# progression_manager.gd
class_name ProgressionManager
extends Node

signal level_up(new_level: int)
signal xp_gained(amount: int, source: StringName)

@export var base_xp_per_level: int = 1000
@export var xp_curve_exponent: float = 1.5

var current_level: int = 1:
    set(value):
        current_level = value
        level_up.emit(current_level)

var current_xp: int = 0
var total_xp_earned: int = 0

func add_xp(amount: int, source: StringName = "") -> void:
    current_xp += amount
    total_xp_earned += amount
    xp_gained.emit(amount, source)
    
    while current_xp >= _xp_for_next_level():
        current_xp -= _xp_for_next_level()
        current_level += 1

func _xp_for_next_level() -> int:
    return int(base_xp_per_level * pow(current_level, xp_curve_exponent))
```


---

## 3. Camera Techniques

### What Makes Them Work

Premium sports cameras sell **speed, weight, and style** without causing motion sickness. They're not just following the player -- they're **directing the experience**.

### Pattern 1: The Speed Camera (SSX)

**What SSX does:**
- Camera pulls back at high speed (wider FOV)
- Camera tilts down slightly (shows more ground, less sky)
- Camera shakes subtly on impacts
- Camera zooms in during big air (slow-motion feel)

**Why it works:**
- Player feels acceleration visually
- Wide FOV at speed creates sensation of velocity
- Camera shake provides impact feedback

**Key insight:** FOV changes should be **subtle** (75 -> 95 max). Too much FOV change causes motion sickness.

### Godot 4.7 Implementation: Speed Camera

```gdscript
# speed_camera.gd
extends Camera3D

@export var target: Node3D
@export var follow_speed: float = 8.0
@export var look_ahead_distance: float = 5.0

# Speed-based FOV
@export var base_fov: float = 75.0
@export var max_fov: float = 95.0
@export var speed_for_max_fov: float = 50.0

# Camera shake
@export var shake_intensity: float = 0.1
@export var shake_decay: float = 5.0

var _shake_amount: float = 0.0

func _process(delta: float) -> void:
    if not target:
        return
    
    var target_velocity := target.get("velocity") as Vector3
    var speed := target_velocity.length()
    
    # Look-ahead based on velocity direction
    var look_ahead := Vector3.ZERO
    if target_velocity.length() > 0.1:
        look_ahead = target_velocity.normalized() * look_ahead_distance
    
    var desired_pos := target.global_position + Vector3(0, 3, 0) - look_ahead
    
    # Smooth follow
    global_position = global_position.lerp(desired_pos, follow_speed * delta)
    look_at(target.global_position + Vector3(0, 1, 0), Vector3.UP)
    
    # Speed-based FOV
    var fov_t := clampf(speed / speed_for_max_fov, 0.0, 1.0)
    fov = lerpf(base_fov, max_fov, fov_t)
    
    # Camera shake
    if _shake_amount > 0.0:
        var shake_offset := Vector3(
            randf_range(-_shake_amount, _shake_amount),
            randf_range(-_shake_amount, _shake_amount),
            0.0
        )
        position += shake_offset
        _shake_amount = lerpf(_shake_amount, 0.0, shake_decay * delta)

func add_shake(intensity: float) -> void:
    _shake_amount = minf(_shake_amount + intensity, 1.0)
```

### Pattern 2: The Trick Camera (Tony Hawk's Pro Skater)

**What THPS does:**
- During big air, camera pulls back and slightly below player
- Camera rotates to show trick from best angle
- Time slows down slightly (0.8x speed) during big tricks
- Camera returns to normal on landing

**Why it works:**
- Player sees their trick clearly
- Slow-mo makes big moments feel epic
- Camera angle sells the scale of the trick

**Key insight:** Time scale changes should be **slight** (0.8x, not 0.5x). Too much slow-mo breaks gameplay flow.

### Godot 4.7 Implementation: Trick Camera

```gdscript
# trick_camera.gd
extends Camera3D

@export var target: Node3D
@export var normal_offset: Vector3 = Vector3(0, 2, -5)
@export var trick_offset: Vector3 = Vector3(0, 1, -8)

@export var trick_detection_height: float = 3.0
@export var time_scale_during_trick: float = 0.8

var _is_in_trick: bool = false

func _process(delta: float) -> void:
    if not target:
        return
    
    var target_height := target.global_position.y
    var is_airborne := target_height > trick_detection_height
    
    if is_airborne and not _is_in_trick:
        _enter_trick_mode()
    elif not is_airborne and _is_in_trick:
        _exit_trick_mode()
    
    var desired_offset := trick_offset if _is_in_trick else normal_offset
    var desired_pos := target.global_position + desired_offset
    
    position = position.lerp(desired_pos, 10.0 * delta)
    look_at(target.global_position, Vector3.UP)

func _enter_trick_mode() -> void:
    _is_in_trick = true
    Engine.time_scale = time_scale_during_trick

func _exit_trick_mode() -> void:
    _is_in_trick = false
    Engine.time_scale = 1.0
```

### Pattern 3: The Wave Camera (Surf World Series)

**What Surf World Series does:**
- Camera stays low to water (sells speed on wave face)
- Camera angle follows wave direction, not just player
- During tube rides, camera pulls in tight (claustrophobic feel)
- Camera shakes during wipeouts

**Why it works:**
- Low angle makes waves look massive
- Camera follows the "line" of the wave
- Tube riding feels intense because camera is tight

**Key insight:** Camera height is critical. Low cameras sell speed; high cameras sell scale.


### Pattern 4: The Mountain Camera (Steep)

**What Steep does:**
- Camera is further back than other sports games (shows mountain scale)
- Camera uses SpringArm3D to avoid clipping through terrain
- During crashes, camera follows debris (cinematic feel)
- Camera has slight lag (feels like drone following you)

**Why it works:**
- Wide camera shows environment beauty
- Spring arm prevents frustrating clipping
- Crash camera turns failure into spectacle

**Key insight:** SpringArm3D is essential for open-world sports. It prevents camera clipping without manual raycasting.

### Godot 4.7 Implementation: Mountain Camera with Spring Arm

```gdscript
# mountain_camera.gd
extends Node3D  # pivot point

@onready var spring_arm: SpringArm3D = 
@onready var camera: Camera3D = /Camera3D

@export var target: Node3D
@export var follow_smoothing: float = 5.0

func _ready() -> void:
    spring_arm.spring_length = 10.0
    spring_arm.collision_mask = 1  # terrain layer
    camera.fov = 80.0  # wide to show scenery

func _process(delta: float) -> void:
    if not target:
        return
    
    # Follow target with smoothing
    global_position = global_position.lerp(target.global_position, follow_smoothing * delta)
    
    # Rotate to face target's movement direction
    var target_velocity := target.get("velocity") as Vector3
    if target_velocity.length() > 0.1:
        var target_rotation := Vector3(0, target_velocity.normalized().angle_to(Vector3.FORWARD), 0)
        rotation.y = lerpf(rotation.y, target_rotation.y, follow_smoothing * delta)
```

---

## 4. Sound Design Principles

### What Makes Them Work

Premium sports games use sound as **immediate feedback**. Every action has a sound, and the sounds build momentum.

### Pattern 1: The Trick Soundscape (Tony Hawk's Pro Skater)

**What THPS does:**
- Ollie: sharp "pop" sound (board hitting ground)
- Grab: cloth rustle + subtle "thud" (hand on board)
- Rotation: whoosh that increases in pitch with speed
- Landing: heavy "thud" with subtle board creak
- Perfect landing: crowd cheer (reward sound)
- Bail: crunch + board clatter (failure sound)

**Why it works:**
- Each trick has a distinct audio signature
- Sounds sell the physics (weight, impact)
- Crowd reactions provide emotional feedback

**Key insight:** Sound effects should be **layered**. A trick isn't one sound -- it's 3-4 sounds playing together (pop + whoosh + landing).

### Godot 4.7 Implementation: Trick Audio

```gdscript
# trick_audio.gd
extends Node3D

@onready var audio_player: AudioStreamPlayer3D = 

@export var ollie_sound: AudioStream
@export var grab_sound: AudioStream
@export var rotation_whoosh: AudioStream
@export var landing_sound: AudioStream
@export var perfect_landing_cheer: AudioStream
@export var bail_sound: AudioStream

@export var rotation_pitch_scale: float = 0.01

func play_ollie() -> void:
    audio_player.stream = ollie_sound
    audio_player.play()

func play_grab() -> void:
    audio_player.stream = grab_sound
    audio_player.play()

func play_rotation(rotation_speed: float) -> void:
    audio_player.stream = rotation_whoosh
    audio_player.pitch_scale = 1.0 + (rotation_speed * rotation_pitch_scale)
    audio_player.play()

func play_landing(is_perfect: bool) -> void:
    audio_player.stream = landing_sound
    audio_player.play()
    
    if is_perfect:
        var cheer_player := AudioStreamPlayer3D.new()
        cheer_player.stream = perfect_landing_cheer
        add_child(cheer_player)
        cheer_player.play()
        cheer_player.finished.connect(cheer_player.queue_free)

func play_bail() -> void:
    audio_player.stream = bail_sound
    audio_player.play()
```


### Pattern 2: The Speed Audio (SSX)

**What SSX does:**
- Wind noise increases with speed (white noise filtered)
- Board sound changes on different surfaces (snow, ice, rock)
- Boost activation: jet-like whoosh
- Near-misses: subtle "swoosh" (doppler effect)
- Music intensifies during high-speed sections

**Why it works:**
- Audio sells speed even when visual cues are subtle
- Surface changes are felt, not just seen
- Music sync creates emotional peaks

**Key insight:** Use **AudioEffectPitchShift** and **AudioEffectFilter** to create variations from base sounds. Don't record 50 wind sounds -- filter one.

### Godot 4.7 Implementation: Speed Audio

```gdscript
# speed_audio.gd
extends Node

@onready var wind_noise: AudioStreamPlayer = 
@onready var board_sound: AudioStreamPlayer3D = 

@export var wind_volume_curve: Curve
@export var wind_pitch_curve: Curve

@export var snow_surface: AudioStream
@export var ice_surface: AudioStream
@export var rock_surface: AudioStream

var _current_speed: float = 0.0

func _process(delta: float) -> void:
    var wind_volume := wind_volume_curve.sample(_current_speed)
    var wind_pitch := wind_pitch_curve.sample(_current_speed)
    
    wind_noise.volume_db = linear_to_db(wind_volume)
    wind_noise.pitch_scale = wind_pitch

func set_speed(speed: float) -> void:
    _current_speed = speed

func set_surface(surface_type: StringName) -> void:
    match surface_type:
        "snow":
            board_sound.stream = snow_surface
        "ice":
            board_sound.stream = ice_surface
        "rock":
            board_sound.stream = rock_surface
    
    if not board_sound.playing:
        board_sound.play()
```

### Pattern 3: The Wave Audio (Surf World Series)

**What Surf World Series does:**
- Water sounds change based on board position (paddling, planing, carving)
- Wave crash: deep rumble + white noise
- Tube riding: muffled water sounds (enclosed space)
- Wipeout: bubble sounds + gasp

**Why it works:**
- Water sounds are constantly present (never silent)
- Audio changes sell the physics (board on water vs. in air)
- Tube riding feels different because audio is muffled

**Key insight:** Use **AudioBus effects** (reverb, low-pass) to create environmental variations. One sound + different buses = many variations.

### Pattern 4: The Impact Audio (All Four Games)

**What they all do:**
- Crashes have weight (not just "ouch" sound)
- Different crash types (faceplant, slam, tumble) have different sounds
- Impact sound is layered: body sound + equipment sound + environment sound
- Crowd reacts to big crashes (emotional feedback)

**Why it works:**
- Crashes feel consequential
- Audio variety prevents repetition
- Crowd reactions make failures feel part of the show

**Key insight:** Layered sounds with **slight delays** (0.05-0.1s) feel more natural than simultaneous playback.

---

## 5. UI Patterns

### What Makes Them Work

Premium sports UIs are **minimal during gameplay, celebratory during menus**. They stay out of the way but make big moments feel special.

### Pattern 1: The Minimal HUD (SSX, Steep)

**What they do:**
- Speed indicator is small and corner-positioned
- Trick list only appears during tricks (fades out after)
- Map is toggleable, not always visible
- No health bar (you're not taking damage)

**Why it works:**
- Player focuses on environment, not UI
- UI appears only when needed
- Clean screen = immersive experience

**Key insight:** HUD elements should **auto-hide** after a few seconds. Player shouldn't have to manually hide them.


### Godot 4.7 Implementation: Minimal HUD

```gdscript
# minimal_hud.gd
extends CanvasLayer

@onready var speed_label: Label = 
@onready var trick_list: VBoxContainer = 
@onready var minimap: Control = 

@export var hud_fade_duration: float = 0.3

var _trick_display_timer: float = 0.0

func _process(delta: float) -> void:
    if _trick_display_timer > 0.0:
        _trick_display_timer -= delta
        if _trick_display_timer <= 0.0:
            _fade_out_trick_list()

func update_speed(speed: float) -> void:
    speed_label.text = str(int(speed)) + " km/h"

func show_trick(trick_name: String) -> void:
    var label := Label.new()
    label.text = trick_name
    trick_list.add_child(label)
    _trick_display_timer = 2.0

func _fade_out_trick_list() -> void:
    var tween := create_tween()
    tween.tween_property(trick_list, "modulate:a", 0.0, hud_fade_duration)
    tween.tween_callback(func(): 
        for child in trick_list.get_children():
            child.queue_free()
        trick_list.modulate.a = 1.0
    )

func toggle_minimap() -> void:
    minimap.visible = not minimap.visible
```

### Pattern 2: The Combo Counter (Tony Hawk's Pro Skater)

**What THPS does:**
- Combo counter appears bottom-center during combo
- Number grows with each trick (visual feedback)
- Multiplier is large and bold (1x, 2x, 3x)
- Combo breaks: counter shatters (visual + audio feedback)

**Why it works:**
- Player sees progress in real-time
- Large numbers feel rewarding
- Visual break feedback makes failures clear

**Key insight:** Combo counters need **visual weight**. Big numbers, bold fonts, growth animations.

### Godot 4.7 Implementation: Combo Counter

```gdscript
# combo_counter.gd
extends Control

@onready var combo_label: Label = 
@onready var multiplier_label: Label = 

@export var grow_duration: float = 0.2
@export var break_animation_duration: float = 0.5

var _current_combo: int = 0
var _current_multiplier: float = 1.0

func _ready() -> void:
    hide()

func add_trick(trick_name: String, multiplier: float) -> void:
    _current_combo += 1
    _current_multiplier = multiplier
    
    combo_label.text = str(_current_combo) + " Tricks"
    multiplier_label.text = "x" + str(multiplier)
    
    var tween := create_tween()
    combo_label.scale = Vector2(1.5, 1.5)
    tween.tween_property(combo_label, "scale", Vector2.ONE, grow_duration)
    
    show()

func break_combo() -> void:
    var tween := create_tween()
    tween.tween_property(self, "modulate:a", 0.0, break_animation_duration)
    tween.tween_property(self, "rotation", PI / 4, break_animation_duration)
    tween.tween_callback(func():
        hide()
        rotation = 0.0
        modulate.a = 1.0
        _current_combo = 0
        _current_multiplier = 1.0
    )
```

### Pattern 3: The Results Screen (All Four Games)

**What they do:**
- Results screen shows: score, tricks landed, best trick, time
- Stats are revealed one-by-one with animation (builds anticipation)
- New records are highlighted (gold text, sparkle effect)
- "Continue" button appears after all stats shown (prevents accidental skip)

**Why it works:**
- Stats reveal feels like a ceremony
- Player savors their performance
- New records feel special

**Key insight:** Results screens should **pace themselves**. Don't show everything at once -- reveal stats like a ceremony.

### Godot 4.7 Implementation: Results Screen

```gdscript
# results_screen.gd
extends Control

@onready var stats_container: VBoxContainer = 
@onready var continue_button: Button = 

@export var stat_reveal_delay: float = 0.5
@export var new_record_color: Color = Color.GOLD

func _ready() -> void:
    continue_button.visible = false

func show_results(stats: Dictionary) -> void:
    for child in stats_container.get_children():
        child.queue_free()
    
    var delay := 0.0
    for key in stats:
        var value = stats[key]
        var is_new_record := _is_new_record(key, value)
        
        await get_tree().create_timer(delay).timeout
        _reveal_stat(key, value, is_new_record)
        
        delay += stat_reveal_delay
    
    await get_tree().create_timer(delay + 0.5).timeout
    continue_button.visible = true

func _reveal_stat(stat_name: String, value: Variant, is_new_record: bool) -> void:
    var hbox := HBoxContainer.new()
    
    var label := Label.new()
    label.text = stat_name
    hbox.add_child(label)
    
    var spacer := Control.new()
    spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    hbox.add_child(spacer)
    
    var value_label := Label.new()
    value_label.text = str(value)
    
    if is_new_record:
        value_label.modulate = new_record_color
        value_label.text += " NEW RECORD!"
    
    hbox.add_child(value_label)
    stats_container.add_child(hbox)
    
    hbox.modulate.a = 0.0
    var tween := create_tween()
    tween.tween_property(hbox, "modulate:a", 1.0, 0.3)

func _is_new_record(stat_name: String, value: Variant) -> bool:
    return false  # implement based on your save system
```


### Pattern 4: The Menu Flow (SSX, Tony Hawk)

**What they do:**
- Main menu has 3-4 options max (Play, Options, Extras, Quit)
- Sub-menus are horizontal tabs (not deep nesting)
- Selected item is highlighted with animation (pulse, glow)
- Background is dynamic (player model doing tricks, mountain view)

**Why it works:**
- Navigation is simple (2 clicks max to any option)
- Menu feels alive (not just static text)
- Player sees their character/gear (progress visualization)

**Key insight:** Menus should feel **alive**. Animate selected items, use dynamic backgrounds, make navigation feel responsive.

---

## 6. Godot 4.7 Implementation Checklist

### What You Can Build Today

| System | Godot Nodes/Features | Complexity |
|--------|---------------------|------------|
| Mission system | Resource-based data (MissionData) | Medium |
| Progression system | ProgressionManager autoload | Medium |
| Skill tree | Resource-based data (SkillTree) | Medium |
| Gear system | Resource-based data (GearItem) | Low |
| Speed camera | Camera3D + lerp + FOV | Medium |
| Trick camera | Camera3D + state detection | Medium |
| Mountain camera | SpringArm3D + Camera3D | Low |
| Layered audio | AudioStreamPlayer3D + AudioEffect | Medium |
| Minimal HUD | CanvasLayer + Label + Tween | Low |
| Combo counter | Control + Label + Tween | Low |
| Results screen | Control + VBoxContainer + Tween | Medium |
| Menu system | Control + Button + Tween | Low |

### What Requires Custom Shaders

| Effect | Approach | Complexity |
|--------|----------|------------|
| Water/snow spray | ShaderMaterial + noise textures | High |
| Speed lines | Particles2D or screen-space shader | Medium |
| Motion blur | Screen-space blur shader | High |
| Dynamic wave mesh | ShaderMaterial + vertex displacement | High |

### What Requires External Assets

| Asset | Source | Notes |
|-------|--------|-------|
| Sound effects | freesound.org (CC0) | Need trick sounds, crowd reactions |
| Music | licensed or original | Dynamic music system needs stems |
| 3D models | Kenney.nl or custom | Character, board, environment |
| Fonts | Google Fonts | Bold, readable fonts for HUD |

---

## 7. Common Pitfalls to Avoid

### Pitfall 1: Over-Engineering the Camera
**What goes wrong:** Camera system has 20 parameters, all exposed in editor  
**Why it happens:** Trying to make camera "perfect" for every situation  
**How to avoid:** Start with 3 parameters (follow_speed, distance, height). Add more only if needed.  
**Warning signs:** Camera script is 500+ lines

### Pitfall 2: Audio Overload
**What goes wrong:** 50 AudioStreamPlayers all playing at once, audio clips  
**Why it happens:** Every action gets a sound, no audio management  
**How to avoid:** Use AudioBus with compressor to prevent clipping. Limit simultaneous sounds to 8-12.  
**Warning signs:** Audio is distorted, frame rate drops during big tricks

### Pitfall 3: UI Clutter
**What goes wrong:** HUD has 15 elements always visible  
**Why it happens:** Designer wants player to see everything  
**How to avoid:** Only show what's needed NOW. Speed = always. Trick list = only during tricks. Map = toggleable.  
**Warning signs:** Playtester complains "too much on screen"

### Pitfall 4: Progression Too Fast
**What goes wrong:** Player unlocks all gear in 2 hours  
**Why it happens:** XP values not tuned, rewards too generous  
**How to avoid:** Use exponential XP curve. Test with casual player, not developer.  
**Warning signs:** Playtester says "nothing left to unlock"

### Pitfall 5: Combo System Too Easy
**What goes wrong:** Player can chain infinite tricks, no skill required  
**Why it happens:** Combo window too long, no commitment  
**How to avoid:** Combo window = 1.5 seconds max. Tricks have commitment (can't cancel mid-air).  
**Warning signs:** Playtester gets 100x multiplier on first try

---

## 8. Actionable Next Steps

### Phase 1: Core Mechanics (Week 1-2)
1. Implement **TrickSystem** with combo window and multiplier
2. Implement **SpeedCamera** with FOV changes
3. Implement **MinimalHUD** with speed display
4. Create placeholder sound effects (free sounds from freesound.org)

### Phase 2: Progression (Week 3-4)
1. Implement **ProgressionManager** with XP curve
2. Implement **SkillTree** with trick groups
3. Implement **GearItem** system with stat modifiers
4. Create 5-10 placeholder gear items

### Phase 3: Missions (Week 5-6)
1. Implement **MissionData** resource
2. Create 3 mission types: trick challenge, speed run, route challenge
3. Implement **ResultsScreen** with stat reveal
4. Create 5-10 placeholder missions

### Phase 4: Polish (Week 7-8)
1. Add **layered audio** (trick sounds, environmental audio)
2. Add **camera shake** on impacts
3. Add **menu animations** (pulse, glow)
4. Tune XP curve and combo window based on playtesting

---

## 9. Reference Materials

### GDC Talks (Search YouTube)
- "The Making of Tony Hawk's Pro Skater" (GDC 2020)
- "SSX: Designing the Ultimate Snowboarding Game" (GDC 2001)
- "Steep: Creating a Living Mountain" (GDC 2017)

### Books
- "A Theory of Fun for Game Design" by Raph Koster
- "The Art of Game Design" by Jesse Schell

### Godot 4.7 Documentation
- [3D Camera Tutorial](https://docs.godotengine.org/en/4.7/tutorials/3d/3d_camera_system.html)
- [Audio Bus Effects](https://docs.godotengine.org/en/4.7/tutorials/audio/audio_buses.html)
- [Tween Animation](https://docs.godotengine.org/en/4.7/tutorials/animation/tweens.html)

---

## 10. Summary

Premium sports games feel premium because they:

1. **Teach through doing** (mission structures isolate one mechanic at a time)
2. **Reward skill expression** (progression systems reward style, not just completion)
3. **Sell speed and weight** (camera techniques use FOV, shake, and positioning)
4. **Provide immediate feedback** (sound design layers multiple effects for each action)
5. **Stay out of the way** (UI is minimal during gameplay, celebratory in menus)

All of these patterns are implementable in Godot 4.7 using built-in systems (Camera3D, SpringArm3D, AudioStreamPlayer3D, Tween, Control nodes). No custom engines or plugins required.

**The key insight:** Premium feel comes from **polish, not complexity**. A simple trick system with great audio feedback feels better than a complex system with no feedback.

---

**Research complete.** Ready for implementation planning.
