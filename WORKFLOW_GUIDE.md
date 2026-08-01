# 🎮 NVIDIA Omniverse Free Tools — Gaming & 3D Design Workflow

> **Everything here is FREE and open-source.** No licenses needed. Just install and create.

---

## 🗺️ The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                  YOUR GAMING & 3D PIPELINE                     │
│                                                                 │
│   🎨 ASSETS          🧮 PHYSICS        🎬 SCENE BUILD          │
│   ──────────         ──────────        ───────────              │
│   USD Composer ◄────► PhysX 5 ◄──────► Warp                     │
│   (world build)      (game physics)   (GPU sim)                │
│        │                  │              │                       │
│        ▼                  ▼              ▼                       │
│   Machinima         Audio2Face      Export to                    │
│   (cinematics)      (face anim)     Unreal/Unity/Blender        │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│   🔗 CONNECTORS: OpenUSD format · USD Exchange · USD Converter  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Free Tools Stack

### Tier 1 — Core (Install These First)

| Tool | What It Does | Gaming Use | 3D Design Use |
|------|-------------|------------|----------------|
| **NVIDIA Warp** | GPU-accelerated Python sim framework | Custom physics, particles, cloth sim | Procedural geometry, spatial computing |
| **PhysX 5** | Real-time physics engine (OPEN SOURCE) | Ragdoll, destruction, collisions, vehicles | Rigid body sim, CAD physics validation |
| **USD Composer** | Scene assembly & world-building | Level design, environment art, lighting | Architectural viz, product design |
| **Omniverse Launcher** | Hub for all NVIDIA 3D tools | Central launcher & updater | Manages connections between apps |

### Tier 2 — AI & Animation

| Tool | What It Does | Install |
|------|-------------|---------|
| **Audio2Face (NIM)** | AI lip-sync from audio | [build.nvidia.com](https://build.nvidia.com/nvidia/audio2face-3d) — free API |
| **Machinima** | Cinematic scene creation with sequencer | Via Omniverse Launcher → Legacy Tools |

### Tier 3 — Connectors & Utilities

| Tool | What It Does |
|------|-------------|
| **USD Exchange** | Import/export USD to Blender, Maya, Unreal, Unity, Houdini |
| **USD Converter** | Batch convert FBX/OBJ/glTF → USD |
| **OpenUSD** | Universal Scene Description library (format standard) |

---

## 🔄 Workflow 1: Game Level Design

```
Step 1: BLOCKOUT
  └─► USD Composer: Drag in primitive shapes, rough out level layout
      - Use USD primitives (cubes, spheres, planes)
      - Set up basic lighting (HDRI sky)
      - Save as .usd scene

Step 2: PHYSICS PROTOTYPE
  └─► PhysX 5: Add collision, rigid bodies, triggers
      - C++ or Python bindings
      - GPU-accelerated on your NVIDIA GPU
      - Export physics simulation data back to USD

Step 3: CUSTOM SIMULATIONS
  └─► Warp (Python): Write custom GPU simulations
      - Particle effects (fire, water, magic)
      - Cloth simulation
      - Procedural terrain deformation
      - pip install warp-lang → write Python → runs on GPU

Step 4: POLISH & LIGHT
  └─► USD Composer: Final art pass
      - Raytraced lighting (RTX)
      - Material editing (MDL)
      - Post-processing

Step 5: EXPORT
  └─► USD Exchange → Send to Unreal Engine 5 or Unity
      - Live-sync available during development
      - Or batch export .usd/.usda/.usdc files
```

---

## 🔄 Workflow 2: 3D Character & Animation

```
Step 1: CHARACTER MODEL
  └─► Create in Blender/Maya/ZBrush
      - Export as FBX or glTF
      - USD Converter → convert to .usd

Step 2: FACE ANIMATION
  └─► Audio2Face: Drop in audio → get blendshapes
      - Use the free NIM API at build.nvidia.com
      - Real-time lip sync generation
      - Export as USD Cache (.usdc)

Step 3: SCENE ASSEMBLY
  └─► USD Composer: Place character in environment
      - Assemble scene from USD layers
      - Set up cameras, lighting

Step 4: CINEMATICS
  └─► Machinima: Create cinematic sequences
      - Timeline/sequencer for camera cuts
      - Trigger animations, physics events
      - Render with RTX

Step 5: EXPORT
  └─► USD Exchange → Game engine or video render
```

---

## 🔄 Workflow 3: Rapid Prototyping (Warp-Powered)

This is the **fastest** workflow for experimenting with game mechanics:

```python
# example_warp_physics.py — runs on your GPU
import warp as wp
import warp.render

@wp.kernel
def simulate_particles(pos: wp.array, vel: wp.array, dt: float):
    i = wp.tid()
    gravity = wp.vec3(0.0, -9.81, 0.0)
    vel[i] = vel[i] + gravity * dt
    pos[i] = pos[i] + vel[i] * dt

# Launch this with: python example_warp_physics.py
# It auto-compiles to CUDA kernels — no manual GPU programming needed
```

**Use this for:**
- 🎯 Projectile trajectories
- 💥 Explosion particle systems
- 🌊 Water/fluid surface simulation
- 🧶 Cloth and rope physics
- 🏔️ Procedural terrain generation
- ⚡ Lightning/electricity effects

---

## ⚡ Quick Start Commands

```bash
# 1. Install Warp (Python GPU simulation framework)
pip install warp-lang

# 2. Clone PhysX 5 (open-source physics engine)
git clone https://github.com/NVIDIA-Omniverse/PhysX.git

# 3. Download Omniverse Launcher
#    → https://developer.nvidia.com/omniverse/launcher
#    → Install → Sign in (free NVIDIA account)
#    → Exchange tab → Install USD Composer, Machinima, USD Exchange

# 4. Verify Warp installation
python -c "import warp; print(f'Warp {warp.__version__} ready — GPU: {warp.is_cuda_available()}')"

# 5. Run Warp examples (tons of gaming-relevant demos)
python -m warp.examples.example_particles
python -m warp.examples.example_cloth
python -m warp.examples.example_rigid_body
```

---

## 🖥️ System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **GPU** | NVIDIA GTX 1060 (6GB) | RTX 3060 (12GB) or better |
| **VRAM** | 6 GB | 12+ GB |
| **RAM** | 16 GB | 32 GB |
| **CPU** | 4-core | 8+ cores |
| **Storage** | 50 GB free | 100+ GB SSD |
| **OS** | Windows 10/11, Ubuntu 20.04+ | Windows 11 |
| **Python** | 3.8+ | 3.10+ |
| **CUDA** | 11.x+ | 12.x (comes with drivers) |

---

## 🔗 Key Links

| Resource | URL |
|----------|-----|
| Omniverse Launcher | https://developer.nvidia.com/omniverse/launcher |
| Warp Docs | https://nvidia.github.io/warp/ |
| Warp GitHub | https://github.com/nvidia/warp |
| PhysX 5 GitHub | https://github.com/NVIDIA-Omniverse/PhysX |
| USD Composer Docs | https://docs.omniverse.nvidia.com/composer/latest/index.html |
| Audio2Face NIM | https://build.nvidia.com/nvidia/audio2face-3d |
| Legacy Tools | https://developer.nvidia.com/omniverse/legacy-tools |
| Warp Colab Tutorial | https://colab.research.google.com/github/NVIDIA/accelerated-computing-hub/blob/main/Accelerated_Python_User_Guide/notebooks/Chapter_12_Intro_to_NVIDIA_Warp.ipynb |
