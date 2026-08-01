extends Area2D

var start_position := Vector2.ZERO
var respawn_timer := 0.0
var is_respawning := false

@onready var sprite = $Sprite2D

func _ready():
	start_position = global_position
	add_to_group("package")
	body_entered.connect(_on_body_entered)

func _process(delta):
	if is_respawning:
		respawn_timer -= delta
		var pulse = sin(Time.get_ticks_msec() * 0.008) * 0.4 + 0.4
		sprite.modulate = Color(1, 0.8, 0, pulse)
		sprite.scale = Vector2.ONE * (0.8 + pulse * 0.4)
		if respawn_timer <= 0:
			reset()

func reset():
	global_position = start_position
	show()
	monitoring = true
	is_respawning = false
	sprite.modulate = Color(1, 0.8, 0, 1.0)

func _on_body_entered(body):
	if body.has_method("pickup_package") and not body.has_package:
		body.pickup_package()
		SoundEffects.play_sound(self, "pickup")
		hide()
		monitoring = false
		is_respawning = true
		respawn_timer = 4.0
		sparkle(global_position)

func sparkle(pos: Vector2):
	var pm = ParticleProcessMaterial.new()
	pm.direction = Vector3(0, 0, 0)
	pm.spread = 180.0
	pm.initial_velocity_min = 30.0
	pm.initial_velocity_max = 80.0
	pm.gravity = Vector3(0, 100, 0)
	pm.scale_min = 2.0
	pm.scale_max = 4.0
	var p = GPUParticles2D.new()
	p.global_position = pos
	p.process_material = pm
	p.amount = 12
	p.lifetime = 0.5
	p.one_shot = true
	p.emitting = true
	get_tree().root.add_child(p)
	var timer = get_tree().create_timer(0.7)
	timer.timeout.connect(p.queue_free)
