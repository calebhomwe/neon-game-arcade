extends CharacterBody2D

@export var player_id := 1
@export var speed := 200.0
@export var trap_scene: PackedScene

var has_package := false
var is_frozen := false
var freeze_timer := 0.0
var trap_cooldown := 0.0

@onready var sprite = $Sprite2D

func _ready():
	add_to_group("players")
	if player_id == 1:
		sprite.modulate = Color(0.8, 0.9, 1.0, 1.0)
	else:
		sprite.modulate = Color(0.9, 0.8, 0.8, 1.0)

func _physics_process(delta):
	trap_cooldown = max(trap_cooldown - delta, 0.0)

	if is_frozen:
		freeze_timer -= delta
		if freeze_timer <= 0:
			is_frozen = false
			sprite.modulate = Color(0.8, 0.9, 1.0, 1.0) if player_id == 1 else Color(0.9, 0.8, 0.8, 1.0)
			sprite.rotation = 0.0
			scale = Vector2.ONE
		else:
			var freeze_glow = sin(Time.get_ticks_msec() * 0.01) * 0.15 + 0.85
			if player_id == 1:
				sprite.modulate = Color(0.3 * freeze_glow, 0.9, 0.9, 1.0)
			else:
				sprite.modulate = Color(0.9, 0.7 * freeze_glow, 0.7 * freeze_glow, 1.0)
			scale = Vector2.ONE * (0.9 + sin(Time.get_ticks_msec() * 0.008) * 0.05)
		return

	var input_vector := Vector2.ZERO
	if player_id == 1:
		input_vector = Input.get_vector("p1_left", "p1_right", "p1_up", "p1_down")
	else:
		input_vector = Input.get_vector("p2_left", "p2_right", "p2_up", "p2_down")

	velocity = input_vector * speed
	move_and_slide()

	if Input.is_action_just_pressed("p1_trap") and player_id == 1 and trap_cooldown <= 0:
		place_trap()
	if Input.is_action_just_pressed("p2_trap") and player_id == 2 and trap_cooldown <= 0:
		place_trap()

	if has_package:
		var glow = sin(Time.get_ticks_msec() * 0.005) * 0.2 + 0.8
		sprite.modulate = Color(glow, glow, 0.4, 1.0)
		scale = Vector2.ONE * (1.0 + sin(Time.get_ticks_msec() * 0.003) * 0.1)
	elif trap_cooldown > 0:
		var cd = trap_cooldown / 1.5
		if player_id == 1:
			sprite.modulate = Color(0.8 * cd + 0.2, 0.9 * cd + 0.1, 1.0 * cd + 0.1, 1.0)
		else:
			sprite.modulate = Color(0.9 * cd + 0.1, 0.8 * cd + 0.2, 0.8 * cd + 0.1, 1.0)
		scale = Vector2.ONE * (0.95 + cd * 0.05)
	else:
		if player_id == 1:
			sprite.modulate = Color(0.8, 0.9, 1.0, 1.0)
		else:
			sprite.modulate = Color(0.9, 0.8, 0.8, 1.0)
		scale = Vector2.ONE

func place_trap():
	if trap_scene and not is_frozen and trap_cooldown <= 0:
		trap_cooldown = 1.5
		var trap = trap_scene.instantiate()
		trap.global_position = global_position
		trap.owner_id = player_id
		trap._update_color()
		get_parent().add_child(trap)
		SoundEffects.play_sound(self, "trap_place")

func pickup_package():
	has_package = true

func drop_package():
	has_package = false
	var pack = get_tree().get_first_node_in_group("package")
	if pack:
		pack.reset()

func freeze():
	is_frozen = true
	freeze_timer = 2.0
	trap_cooldown = 0.5
	if player_id == 1:
		sprite.modulate = Color(0.4, 1.0, 1.0, 1.0)
	else:
		sprite.modulate = Color(0.6, 1.0, 1.0, 1.0)
	sprite.rotation = 0.2
	shake_screen(5.0, 0.3)
	SoundEffects.play_sound(self, "freeze")
	if has_package:
		drop_package()

func shake_screen(amount: float, duration: float):
	var main = get_node("/root/Main")
	if main:
		main.shake(amount, duration)
