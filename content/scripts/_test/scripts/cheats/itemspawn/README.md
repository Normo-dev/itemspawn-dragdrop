# Item Spawn Interface

This folder contains the new item spawn feature files.

- `configs/itemspawn.inv` adds the temporary result inventory.
- `interfaces/spawn_main.if` adds the results/spawn window opened by `::~item`.
- `scripts/itemspawn.rs2` owns `::~item`, page buttons, item clicks, count dialogs, noted spawning, and info messages.

Usage:

```text
::~item <name|id> [--members|-m] [--free|-f] [--trade|--tradeable|-t] [--untrade|--untradeable|-u] [--wear|--wearable|-w] [--stack|--stackable|-s] [--note|--noted|-n] [--cert]
```

Existing files still need small hooks so the server can see it:

- `content/scripts/engine.rs2` declares `itemspawn_open`, `itemspawn_page`, and `itemspawn_add`.
- `engine/src/engine/script/ScriptOpcode.ts` registers those opcodes.
- `engine/src/engine/script/ScriptOpcodePointers.ts` marks them as active-player commands.
- `engine/src/engine/script/handlers/DebugOps.ts` calls the itemspawn bridge.
- `engine/src/engine/script/handlers/ItemSpawnDebug.ts` is the small engine bridge for searching all object configs and adding a clicked dynamic `obj` to inventory.
- `engine/src/network/game/client/handler/ClientCheatHandler.ts` passes full multi-word string queries to single-string debugprocs.
- `content/pack/interface.order`, `content/pack/interface.pack`, and `content/pack/inv.pack` include the new interface/inventory in the pack lists.
