extends Node2D

var shake_amount := 0.0
var shake_timer := 0.0
var shake_duration := 0.0

func shake(amount: float, duration: float):
	shake_amount = amount
	shake_duration = duration
	shake_timer = duration

func _process(delta):
	if shake_timer > 0:
		shake_timer -= delta
		var intensity = shake_timer / shake_duration
		position = Vector2(randf() * shake_amount * 2 - shake_amount, randf() * shake_amount * 2 - shake_amount) * intensity
	else:
		position = Vector2.ZERO
