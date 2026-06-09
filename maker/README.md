# Bed-Mod Maker

Drop this `maker` folder into the root of the `bed-mod-loader` GitHub Pages repo.

After pushing to GitHub, it should be available at:

`https://waa-4.github.io/bed-mod-loader/maker`

## What it does

- Creates Minecraft Bedrock starter add-on zips in the browser.
- Exports a paired Behavior Pack and Resource Pack inside one `.zip`.
- Creates simple custom items.
- Creates shapeless and shaped recipes.
- Imports `.mcstructure` files into `BP/structures`.
- Generates `.mcfunction` files that can spawn structures with `/structure load`.
- Creates tiny placeholder item textures automatically.

## Notes

This is a starter add-on maker, not a Java `.jar` converter. For structures, export a `.mcstructure` file from Minecraft using a Structure Block, upload it in the Structures tab, then export the add-on zip.
