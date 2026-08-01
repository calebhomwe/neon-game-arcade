extends Area2D

@export var owner_id := 0
var life_timer := 3.0
var active := true

func _ready():
	body_entered.connect(_on_body_entered)
	_update_color()

func _update_color():
	var target = $Sprite2D
	if target:
		if owner_id == 1:
			target.modulate = Color(0.9, 0.9, 0.9, 0.8)
		else:
			target.modulate = Color(0.4, 0.4, 0.4, 0.8)

func _process(delta):
	if not active:
		return
	life_timer -= delta
	if life_timer <= 0:
		pop()

func _on_body_entered(body):
	if body.has_method("freeze") and body.player_id != owner_id:
		body.freeze()
		pop()

func pop():
	if not active:
		return
	active = false
	SoundEffects.play_sound(self, "trap_pop")
	spawn_confetti(global_position)
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(self, "modulate:a", 0.0, 0.15)
	tween.tween_property(self, "scale", Vector2(0.1, 0.1), 0.15)
	tween.set_parallel(false)
	tween.tween_callback(queue_free)

func spawn_confetti(pos: Vector2):
	var pm = ParticleProcessMaterial.new()
	pm.direction = Vector3(0, -1, 0)
	pm.spread = 180.0
	pm.initial_velocity_min = 50.0
	pm.initial_velocity_max = 150.0
	pm.gravity = Vector3(0, 200, 0)
	pm.scale_min = 2.0
	pm.scale_max = 5.0
	var p = GPUParticles2D.new()
	p.global_position = pos
	p.process_material = pm
	p.amount = 20
	p.lifetime = 0.6
	p.one_shot = true
	p.emitting = true
	get_tree().root.add_child(p)
	var timer = get_tree().create_timer(0.8)
	timer.timeout.connect(p.queue_free)
