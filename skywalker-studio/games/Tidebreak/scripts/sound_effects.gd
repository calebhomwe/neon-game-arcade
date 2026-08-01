extends Node

const SOUNDS := {
	"trap_place": preload("res://sounds/trap_place.wav"),
	"trap_pop": preload("res://sounds/trap_pop.wav"),
	"freeze": preload("res://sounds/freeze.wav"),
	"pickup": preload("res://sounds/pickup.wav"),
}

const VOLUMES := {
	"trap_place": -12.0,
	"trap_pop": -8.0,
	"freeze": -6.0,
	"pickup": -10.0,
}

const POOL_SIZE := 8

var _pool: Array[AudioStreamPlayer2D] = []
var _pool_idx := 0

func _ready() -> void:
	for i in POOL_SIZE:
		var player := AudioStreamPlayer2D.new()
		player.finished.connect(_on_finished.bind(player))
		add_child(player)
		_pool.append(player)

func _on_finished(player: AudioStreamPlayer2D) -> void:
	player.stream = null

static func play_sound(scene: Node, type: String) -> void:
	var se := scene.get_node_or_null("/root/SoundEffects")
	if se:
		se._play(type, scene.global_position)

func _play(type: String, pos: Vector2) -> void:
	if not SOUNDS.has(type):
		return
	var player := _pool[_pool_idx]
	_pool_idx = (_pool_idx + 1) % POOL_SIZE
	player.stream = SOUNDS[type]
	player.volume_db = VOLUMES[type]
	player.global_position = pos
	player.play()
