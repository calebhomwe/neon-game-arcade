# kit3d: shared 3D stage files

| What | Source | Licence |
| --- | --- | --- |
| `hole3d.js` (the hole.io-style stage, also used for its toon material by Mini Life Sim and Bridge Race) | Caleb's Arcade (HoleGrind) | same as the games |
| `city.glb`: City Kit Suburban 2.0, City Kit Commercial 2.1, City Kit Roads, Car Kit, Nature Kit, Platformer Kit (coin), Furniture Kit (bench), 41 models | Kenney, https://kenney.nl | CC0 1.0 |

`city.glb` was built for Hole Grind: every model went through `tools/blender/optimize_glb.py`
(3,000-triangle budget, textures 512 px or less), then was packed and compressed with gltfpack.
Used by `skywalker-playables/hole-eater.html`.
