extends CanvasLayer

@onready var status_label = $Label
var game_manager: Node

func _ready():
	add_to_group("hud")
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	var gm = get_node("/root/Main").get_node("GameManager")
	if gm:
		game_manager = gm

func _process(delta):
	if game_manager and game_manager.game_over:
		status_label.text = game_manager.get_status_text()
		return
	
	if Input.is_action_just_pressed("ui_cancel"):
		get_tree().paused = not get_tree().paused
		if get_tree().paused:
			status_label.text = "⏸ PAUSED"
		else:
			status_label.text = "📦 Grab the Package in the middle!"
		return
	
	var pack = get_tree().get_first_node_in_group("package")
	if not pack:
		return
	
	var frozen = []
	var players = get_tree().get_nodes_in_group("players")
	for p in players:
		if p.is_frozen:
			frozen.append(p)
		elif p.has_package:
			status_label.text = "📦 " + ("P1" if p.player_id == 1 else "P2") + " has the Care Package!"
			return
	
	if frozen.size() > 0:
		var freeze_times = []
		for p in frozen:
			freeze_times.append(p.freeze_timer)
		var remaining = max(freeze_times)
		status_label.text = "❄️ " + str(frozen.size()) + " frozen! " + str(remaining) + "s"
	else:
		status_label.text = "📦 Grab the Package in the middle!"
