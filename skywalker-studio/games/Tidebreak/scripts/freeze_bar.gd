extends ProgressBar

var freeze_timer_ref := 0.0

func _ready():
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.3, 0.8, 1.0, 0.8)
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(1, 1, 1, 1)
	add_theme_stylebox_override("fill", style)
	visible = false

func _process(_delta):
	if freeze_timer_ref > 0:
		value = freeze_timer_ref / 2.0 * 100.0
		visible = true
	else:
		visible = false

func update_freeze(timer: float):
	freeze_timer_ref = timer
