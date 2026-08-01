shader_type canvas_item;

void fragment() {
	COLOR.a = sin(TIME * 2.0) * 0.3 + 0.5;
}
