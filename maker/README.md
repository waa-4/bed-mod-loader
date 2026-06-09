# Bed-Mod Maker V2

Drop this `maker/` folder into the root of the `bed-mod-loader` GitHub Pages repo.

It adds:

- Commands Builder
- Function Builder
- Item Creator with cooldowns and on-use actions
- Weapon Creator presets
- 16x16 pixel texture editor
- Shapeless and shaped recipe creator
- `.mcstructure` upload and structure spawn command/function generator
- Advanced custom block creator
- Basic biome creator
- World Preset Designer without world-file editing
- ZIP export with Behavior Pack and Resource Pack folders

## Important World Preset Note

This V2 intentionally does not edit uploaded Bedrock worlds. The World Preset Designer exports readable preset files and setup functions. Fully importable world templates normally require an exported Minecraft world folder containing files such as `level.dat`, which this tool does not create from scratch.

## Item Use Actions

Item use actions are generated through `BP/scripts/main.js`. Some Minecraft versions may ask you to enable creator/script experiment toggles before script-powered item actions work.
