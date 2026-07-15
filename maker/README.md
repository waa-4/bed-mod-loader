# Bed-Mod Maker V3

Browser-based starter add-on maker for current Minecraft Bedrock packs.

## V3 changes
- Updated generated pack minimum engine and content format versions to 1.21.130.
- Updated the script dependency to stable `@minecraft/server` 2.6.0.
- Fixed item texture aliases and modern `minecraft:icon` output.
- Fixed custom block texture aliases and added required full-block geometry.
- Replaced legacy block destroy/explosion components with current components.
- Added PNG import into the 16x16 texture editor.
- Added imported/pixel/automatic texture choices for items and blocks.
- Added opaque, alpha-test, and blend block render choices.
- Added `.kermit` maker project save/load.
- Linked exported behavior and resource pack manifests with dependencies.

## Notes
Structure binary data is not stored in `.kermit` project files, so structures must be re-imported after loading a saved maker project.
