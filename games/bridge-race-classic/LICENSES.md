# Bridge Race: third-party assets

| What | Source | Licence |
| --- | --- | --- |
| three.js r180 (`../vendor/three/`: build, GLTFLoader, BufferGeometryUtils, meshopt decoder) | https://threejs.org, https://github.com/zeux/meshoptimizer | MIT (`../vendor/three/LICENSE`) |
| Nature Kit: cliff block and cliff top (the course), wooden bridge pieces, simple fence, round and tall pines, oak and default trees, large and small rocks, large bush, purple and yellow flowers, tall grass, stump, lily pad | Kenney, https://kenney.nl/assets/nature-kit | CC0 1.0 |
| Survival Kit: plank bundle (resource-planks, the pickups and the stack on the builder's back) | Kenney, https://kenney.nl/assets/survival-kit | CC0 1.0 |
| Starter Kit 3D Platformer: flag, cloud (models CC0; the kit's code is MIT and is not used) | Kenney, https://github.com/KenneyNL/Starter-Kit-3D-Platformer | CC0 1.0 |
| Ultimate Animated Character Pack: Worker Male (the builder; Idle, Run, Run_Carry, Jump, Victory, Defeat animations) | Quaternius, https://quaternius.com/packs/ultimateanimatedcharacter.html | CC0 1.0 |

`models/world.glb` packs the 20 Kenney models: each went through `tools/blender/optimize_glb.py`
(Caleb's Arcade repo; 3,000-triangle budget, textures 512 px or less; the models are 12 to 220 triangles,
so no decimation or LODs were needed), then they were packed into one file with shared materials and
compressed with gltfpack (`-cc`). `models/runner.glb` is the Quaternius glTF compressed with gltfpack only,
because optimize_glb.py deletes armatures. The lake, banner and particles are drawn in code.
