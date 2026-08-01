extends Node

var score := {1: 0, 2: 0}
var game_over := false
var win_score := 3

func add_score(player_id: int):
	score[player_id] += 1
	if score[player_id] >= win_score:
		game_over = true

func restart():
	score = {1: 0, 2: 0}
	game_over = false

func get_status_text():
	if game_over:
		var winner = 1 if score[1] > score[2] else 2
		return "🏆 Player " + str(winner) + " WINS! Press R to restart 🏆"
	return "Scores: P1 " + str(score[1]) + " - P2 " + str(score[2])
