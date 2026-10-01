# Mini Life Sim: third-party assets

| What | Source | Licence |
| --- | --- | --- |
| three.js r180 (`../vendor/three/`: build, GLTFLoader, BufferGeometryUtils, meshopt decoder) | https://threejs.org, https://github.com/zeux/meshoptimizer | MIT (`../vendor/three/LICENSE`) |
| Furniture Kit: large fridge, stove, kitchen sink, cabinet and upper cabinet, coffee machine, toaster, trash can, toilet, shower, bathroom sink and mirror, washer, double bed, nightstand, table lamp, open bookcase, modern TV and TV cabinet, sofa, coffee table, floor lamp, desk, computer screen and keyboard, desk chair, side table, lounge chair, potted plants, rugs, books, wall, window wall, doorway wall | Kenney, https://kenney.nl/assets/furniture-kit | CC0 1.0 |
| Nature Kit: oak and default trees, bushes, red and yellow flowers, simple fence, stone path | Kenney, https://kenney.nl/assets/nature-kit | CC0 1.0 |
| Ultimate Animated Character Pack: Casual Female (the Sim; Idle, Walk, Run, SitDown, PickUp, Victory animations) | Quaternius, https://quaternius.com/packs/ultimateanimatedcharacter.html | CC0 1.0 |
| Shared kit3d/hole3d.js (toon material, CPU-WebGL detection) | this repository | same as the game |

`models/house.glb` packs the 44 Kenney models: each went through `tools/blender/optimize_glb.py`
(Caleb's Arcade repo; 3,000-triangle budget, textures 512 px or less, pivot at the bottom centre,
scaled to real heights; the models are 12 to 830 triangles so no decimation or LODs were needed;
the double bed first had its shared pillow mesh made single-user, which the script needs), were
packed into one file with shared materials and compressed with gltfpack (`-cc`, meshopt + quantization).

`models/sim.glb` is the Quaternius glTF compressed with gltfpack only: optimize_glb.py joins meshes
and deletes armatures, which would strip the skeleton and animations from a rigged character.

Floors, walls, lawn, sky, the phone, screens and effect sprites are drawn in code. Kenney and
Quaternius ask for no credit; thank you both.
