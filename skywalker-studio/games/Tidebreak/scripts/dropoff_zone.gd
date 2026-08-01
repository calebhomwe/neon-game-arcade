extends Area2D

@export var zone_owner := 1
var game_manager: Node

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	body_entered.connect(_on_body_entered)
	await get_tree().process_frame
	var gm = get_node_or_null("/root/Main/GameManager")
	if gm:
		game_manager = gm

func _on_body_entered(body):
	if not body.is_in_group("players"):
		return
	if body.has_package and body.player_id == zone_owner:
		if game_manager:
			game_manager.add_score(zone_owner)
		body.has_package = false
		var winner = "P1" if zone_owner == 1 else "P2"
		var hud = get_tree().get_first_node_in_group("hud")
		if hud:
			hud.status_label.text = "🏆 " + winner + " WINS! Press R to restart 🏆"
		get_tree().paused = true

func _unhandled_input(event):
	if event.is_action_pressed("ui_accept") or (event is InputEventKey and event.keycode == KEY_R):
		if get_tree().paused:
			get_tree().paused = false
			get_tree().reload_current_scene()
