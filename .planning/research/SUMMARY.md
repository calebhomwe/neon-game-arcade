# Research Summary: Surfing + Snowboarding Shared Framework

**Domain:** Godot 4.7 extreme sports games (surfing "Tidebreak" + snowboarding "SFX Snowboarding")
**Researched:** 2026-08-02
**Overall confidence:** HIGH (full source-level analysis of both codebases)

## Executive Summary

Two Godot 4.7 games share a common lineage: a surfing game ("Tidebreak: Tropical Surfing") and a snowboarding game ("SFX Snowboarding"). Both are third-person extreme sports titles with trick systems, score/combo mechanics, World Tour progression, and procedural terrain. The snowboarding game is **~10x more mature** (1490-line player.gd, 80+ scripts, full SSX-style feature set) while the surfing game is a compact prototype (~580-line main.gd, ~15 scripts).

**The shared toolkit already exists** at `C:\Users\caleb\skywalker-studio\shared\` with two files (`surf_math.gd`, `utils.gd`) that are **byte-identical** copies of what's vendored into each game's `toolkit/` folder. A shared `world_tour/` module (4 files, ~1300 lines) also exists but is only consumed by the surfing game so far — the snowboarding game has its own forked copy under `scripts/world_tour/` with an extra `world_tour_flow.gd`.

The key finding: **the snowboarding codebase is the de facto reference architecture**. It has an EventBus, character roster, VFX manager, audio manager, blueprint/course system, SSX juice layers, and a proper separation of concerns. The surfing game is a monolith that would benefit enormously from adopting the snowboarding patterns. The migration path is clear: extract shared systems from snowboarding into `shared/`, then have both games consume them.

## Key Findings

**Stack:** Godot 4.7 GDScript, Forward+ renderer, GLTFDocument runtime loading, procedural terrain via analytical height functions, GPU particles, ShaderMaterial.

**Architecture:** Snowboarding uses EventBus decoupling + autoload singletons + script-based scene construction. Surfing uses direct parent-child coupling + a single GameFlow autoload. The shared layer should be EventBus + autoloads + toolkit.

**Critical pitfall:** The terrain height function is duplicated between `main.gd` and `player.gd` in both games with a comment saying "MUST stay byte-identical" — this is a ticking time-bomb for physics/visual desync.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Extract & Centralize Toolkit** - Low-risk, high-value foundation
   - Addresses: `surf_math.gd`, `utils.gd` already shared; add `event_bus.gd`, `characters.gd` pattern
   - Avoids: Further duplication as new games are added

2. **Unify World Tour Module** - Medium complexity, removes the biggest fork
   - Addresses: Snowboarding has a forked `world_tour/` with `world_tour_flow.gd`; surfing uses `GameFlow` autoload
   - Avoids: Two diverging progression systems

3. **Refactor Surfing to EventBus Architecture** - Highest impact, highest risk
   - Addresses: Surfing's monolithic `main.gd` (582 lines) and tight parent-child coupling
   - Avoids: Surfing game becoming unmaintainable as features grow

4. **Extract Shared Player Controller Base** - Complex, requires careful abstraction
   - Addresses: Both `player.gd` files share balance/combo/score/trick patterns but differ in physics
   - Avoids: Copy-paste fixes to trick scoring, combo timers, popup systems

**Phase ordering rationale:**
- Toolkit first because it's already done (just needs path switching)
- World Tour second because it's a self-contained module with clear boundaries
- EventBus refactor third because it changes how every script communicates
- Player base last because it requires the deepest understanding of sport-specific physics

**Research flags for phases:**
- Phase 3: Likely needs deeper research (EventBus signal contract must cover both sports)
- Phase 4: Likely needs deeper research (what's shared vs sport-specific in player controllers)
- Phase 1-2: Standard patterns, unlikely to need research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Both project.godot files read, Godot 4.7 confirmed |
| Features | HIGH | Full script inventory of both games |
| Architecture | HIGH | Every .gd file read, patterns verified |
| Pitfalls | HIGH | Height-function duplication confirmed in both games |

## Gaps to Address

- Whether `.godot/` import caches will cause issues when scripts move to `shared/` (Godot resource path resolution)
- Whether the snowboarding `blueprint/` course system is reusable for surfing wave generation
- Audio bus layout compatibility (snowboarding has Music/SFX buses, surfing doesn't)
- Whether both games should share export presets or keep independent build configs
