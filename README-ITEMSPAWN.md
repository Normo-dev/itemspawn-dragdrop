# Drag-and-Drop Item Spawn Interface

This folder is a file overlay for the `::~item` item spawn results interface.

## Install

1. Drag the `content` and `engine` folders into your 274 rev Lost City project root folder.
2. When OS asks, choose to merge folders and replace files.
3. Rebuild scripts/cache:

```powershell
cd engine
$env:BUILD_VERIFY='false'; npm.cmd run build
cd ..
```

Then start the server normally, open `http://localhost/rs2.cgi`, and use:

```text
::~item dragon
::~item b
::~item rune --wear
::~item 391
```

## Notes

All brand-new content files live under `content/scripts/_test/scripts/cheats/itemspawn`.

The remaining replacements are the smallest wiring needed for this revision:

- `content/scripts/engine.rs2` declares the custom item spawn commands.
- `engine/src/engine/script/ScriptOpcode.ts`, `ScriptOpcodePointers.ts`, and `handlers/DebugOps.ts` expose those commands to RuneScript.
- `engine/src/engine/script/handlers/ItemSpawnDebug.ts` is the new search/add bridge, because RuneScript cannot enumerate all object configs or cast a clicked `obj` into `namedobj` for `inv_add`.
- `engine/src/network/game/client/handler/ClientCheatHandler.ts` lets the `item` debugproc receive the full query text, so `::~item rune scimitar --wear` works.

The interface, buttons, count dialog flow, noted option, and info option are in the itemspawn cheat folder.