const state = {
  items: [],
  recipes: [],
  structures: [],
  functions: []
};

const $ = (id) => document.getElementById(id);

function slugify(value, fallback = "derp") {
  const clean = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || fallback;
}

function safeFileName(value, fallback = "addon") {
  return String(value || fallback).replace(/[\\/:*?"<>|]/g, "_").trim() || fallback;
}

function namespace() {
  return slugify($("namespace").value, "derp").replace(/-/g, "_");
}

function projectName() {
  return $("projectName").value.trim() || "Derp Addon";
}

function versionArray(text) {
  const parts = String(text || "1.20.30").split(".").map(n => Math.max(0, parseInt(n, 10) || 0));
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function uuidv4() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function fullId(id) {
  const clean = slugify(id, "thing");
  return clean.includes(":") ? clean : `${namespace()}:${clean}`;
}

function downloadBlob(blob, fileName) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function setTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      $("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "export") renderFileTree();
    });
  });
}

function addItem() {
  const id = slugify($("itemId").value, "custom_item");
  const existing = state.items.find(item => item.id === id);
  if (existing && !confirm("An item with that ID already exists. Replace it?")) return;

  const item = {
    id,
    displayName: $("itemName").value.trim() || id,
    maxStack: Math.min(64, Math.max(1, parseInt($("itemStack").value, 10) || 64)),
    category: $("itemCategory").value,
    color: $("itemColor").value,
    textureStyle: $("itemTextureStyle").value
  };

  state.items = state.items.filter(old => old.id !== id);
  state.items.push(item);
  $("recipeResult").value = `${namespace()}:${id}`;
  renderAll();
}

function removeItem(id) {
  state.items = state.items.filter(item => item.id !== id);
  renderAll();
}

function renderItems() {
  const box = $("itemsList");
  box.innerHTML = state.items.length ? "" : `<p class="muted">No items yet. Add one and it will appear here.</p>`;
  for (const item of state.items) {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <b>${item.displayName}</b>
        <div class="meta"><code>${namespace()}:${item.id}</code> · stack ${item.maxStack} · ${item.textureStyle}</div>
      </div>
      <button onclick="removeItem('${item.id}')">Remove</button>
    `;
    box.appendChild(div);
  }
}

function syncRecipeMode() {
  const shaped = $("recipeType").value === "shaped";
  $("shapelessBox").classList.toggle("hidden", shaped);
  $("shapedBox").classList.toggle("hidden", !shaped);
}

function addRecipe() {
  const id = slugify($("recipeId").value, "custom_recipe");
  const result = $("recipeResult").value.trim() || `${namespace()}:black_pixel`;
  const count = Math.min(64, Math.max(1, parseInt($("recipeCount").value, 10) || 1));
  const type = $("recipeType").value;

  let recipe;
  if (type === "shapeless") {
    const ingredients = $("recipeIngredients").value
      .split(/\n|,/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(item => ({ item }));
    if (!ingredients.length) return alert("Add at least one ingredient.");
    recipe = { id, type, result, count, ingredients };
  } else {
    const rows = [0, 1, 2].map(r => [0, 1, 2].map(c => $(`p${r}${c}`).value.trim().slice(0, 1) || " ").join(""));
    const key = {};
    $("recipeKeyMap").value.split("\n").forEach(line => {
      const [letter, item] = line.split("=").map(x => (x || "").trim());
      if (letter && item) key[letter.slice(0, 1)] = { item };
    });
    recipe = { id, type, result, count, pattern: rows, key };
  }

  state.recipes = state.recipes.filter(old => old.id !== id);
  state.recipes.push(recipe);
  renderAll();
}

function removeRecipe(id) {
  state.recipes = state.recipes.filter(recipe => recipe.id !== id);
  renderAll();
}

function renderRecipes() {
  const box = $("recipesList");
  box.innerHTML = state.recipes.length ? "" : `<p class="muted">No recipes yet.</p>`;
  for (const recipe of state.recipes) {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <b>${recipe.id}</b>
        <div class="meta">${recipe.type} → <code>${recipe.result}</code> x${recipe.count}</div>
      </div>
      <button onclick="removeRecipe('${recipe.id}')">Remove</button>
    `;
    box.appendChild(div);
  }
}

function addStructureFiles(files) {
  [...files].forEach(file => {
    if (!file.name.toLowerCase().endsWith(".mcstructure")) return;
    const cleanName = slugify(file.name.replace(/\.mcstructure$/i, ""), "structure") + ".mcstructure";
    state.structures = state.structures.filter(old => old.name !== cleanName);
    state.structures.push({ name: cleanName, file });
  });
  renderAll();
}

function addStructureFunction() {
  const functionName = slugify($("structureFunctionName").value, "spawn_structure");
  let struct = $("structureName").value.trim() || "structure";
  struct = struct.includes(":") ? struct : `${namespace()}:${slugify(struct, "structure")}`;
  const x = parseInt($("structureX").value, 10) || 0;
  const y = parseInt($("structureY").value, 10) || 0;
  const z = parseInt($("structureZ").value, 10) || 0;
  const target = $("structureTarget").value;
  const pos = `~${x || ""} ~${y || ""} ~${z || ""}`;
  const command = `execute as ${target} at @s run structure load ${struct} ${pos}`;

  state.functions = state.functions.filter(fn => fn.name !== functionName);
  state.functions.push({ name: functionName, commands: [command] });
  renderAll();
  alert(`Added /function ${functionName}`);
}

function removeStructure(name) {
  state.structures = state.structures.filter(struct => struct.name !== name);
  renderAll();
}

function renderStructures() {
  const box = $("structuresList");
  box.innerHTML = state.structures.length ? "" : `<p class="muted">No .mcstructure files uploaded yet. You can still make a function now and add the file later.</p>`;
  for (const struct of state.structures) {
    const idNoExt = struct.name.replace(/\.mcstructure$/i, "");
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <b>${struct.name}</b>
        <div class="meta">Structure ID: <code>${namespace()}:${idNoExt}</code></div>
      </div>
      <button onclick="removeStructure('${struct.name}')">Remove</button>
    `;
    box.appendChild(div);
  }
}

function applyFunctionTemplate() {
  const template = $("functionTemplate").value;
  if (template === "give") {
    const first = state.items[0] ? `${namespace()}:${state.items[0].id}` : `${namespace()}:black_pixel`;
    $("functionCommands").value = `give @p ${first} 1\nsay Gave a custom item!`;
  }
  if (template === "lightning") {
    $("functionCommands").value = `execute as @a at @s run summon lightning_bolt ~3 ~ ~\nexecute as @a at @s run summon lightning_bolt ~-3 ~ ~\nexecute as @a at @s run summon lightning_bolt ~ ~ ~3`;
  }
  if (template === "night") {
    $("functionCommands").value = `time set night\nsay The night has arrived.`;
  }
}

function addFunction() {
  const name = slugify($("functionName").value, "custom_function");
  const commands = $("functionCommands").value.split("\n").map(x => x.trim().replace(/^\//, "")).filter(Boolean);
  if (!commands.length) return alert("Add at least one command.");
  state.functions = state.functions.filter(fn => fn.name !== name);
  state.functions.push({ name, commands });
  renderAll();
}

function removeFunction(name) {
  state.functions = state.functions.filter(fn => fn.name !== name);
  renderAll();
}

function renderFunctions() {
  const box = $("functionsList");
  box.innerHTML = state.functions.length ? "" : `<p class="muted">No functions yet.</p>`;
  for (const fn of state.functions) {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <b>/function ${fn.name}</b>
        <div class="meta">${fn.commands.length} command(s)</div>
      </div>
      <button onclick="removeFunction('${fn.name}')">Remove</button>
    `;
    box.appendChild(div);
  }
}

function itemJson(item) {
  return {
    format_version: "1.20.30",
    "minecraft:item": {
      description: {
        identifier: `${namespace()}:${item.id}`,
        category: item.category
      },
      components: {
        "minecraft:max_stack_size": item.maxStack,
        "minecraft:icon": { texture: `${namespace()}_${item.id}` },
        "minecraft:display_name": { value: item.displayName }
      }
    }
  };
}

function recipeJson(recipe) {
  if (recipe.type === "shapeless") {
    return {
      format_version: "1.20.10",
      "minecraft:recipe_shapeless": {
        description: { identifier: `${namespace()}:${recipe.id}` },
        tags: ["crafting_table"],
        ingredients: recipe.ingredients,
        result: { item: recipe.result, count: recipe.count }
      }
    };
  }

  return {
    format_version: "1.20.10",
    "minecraft:recipe_shaped": {
      description: { identifier: `${namespace()}:${recipe.id}` },
      tags: ["crafting_table"],
      pattern: recipe.pattern,
      key: recipe.key,
      result: { item: recipe.result, count: recipe.count }
    }
  };
}

function makeManifest(type, headerUuid, moduleUuid, dependencyUuid) {
  const isRp = type === "resources";
  const manifest = {
    format_version: 2,
    header: {
      name: `${projectName()} ${isRp ? "RP" : "BP"}`,
      description: $("description").value.trim() || "Made with Bed-Mod Maker",
      uuid: headerUuid,
      version: [1, 0, 0],
      min_engine_version: versionArray($("minEngine").value)
    },
    modules: [{
      type,
      uuid: moduleUuid,
      version: [1, 0, 0]
    }],
    metadata: {
      authors: [$("author").value.trim() || "Bed-Mod Maker"]
    }
  };

  if (!isRp && dependencyUuid) {
    manifest.dependencies = [{ uuid: dependencyUuid, version: [1, 0, 0] }];
  }
  return manifest;
}

function textureJson() {
  const data = {};
  for (const item of state.items) {
    data[`${namespace()}_${item.id}`] = { textures: `textures/items/${item.id}` };
  }
  return {
    resource_pack_name: `${namespace()}_resources`,
    texture_name: "atlas.items",
    texture_data: data
  };
}

function langFile() {
  const lines = [];
  for (const item of state.items) {
    lines.push(`item.${namespace()}:${item.id}=${item.displayName}`);
  }
  return lines.join("\n") + "\n";
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function pngBlobForItem(item) {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 16, 16);
  const { r, g, b } = hexToRgb(item.color);

  function fill(x, y, w, h, alpha = 1) {
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(x, y, w, h);
  }

  if (item.textureStyle === "pixel") {
    fill(7, 7, 2, 2, 1);
    fill(6, 6, 4, 4, .28);
  } else if (item.textureStyle === "gem") {
    fill(7, 2, 2, 1, .65);
    fill(5, 3, 6, 2, .85);
    fill(3, 5, 10, 4, 1);
    fill(5, 9, 6, 3, .85);
    fill(7, 12, 2, 2, .55);
    ctx.fillStyle = "rgba(255,255,255,.45)";
    ctx.fillRect(5, 5, 2, 2);
  } else {
    fill(6, 2, 4, 1, .42);
    fill(4, 3, 8, 2, .65);
    fill(3, 5, 10, 6, 1);
    fill(4, 11, 8, 2, .65);
    fill(6, 13, 4, 1, .42);
    ctx.fillStyle = "rgba(255,255,255,.42)";
    ctx.fillRect(5, 5, 3, 2);
  }

  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

function buildFileList() {
  const base = safeFileName(projectName().replace(/\s+/g, "_"), "BedModProject");
  const bp = `${base}_BP`;
  const rp = `${base}_RP`;
  const files = [];
  files.push(`${bp}/manifest.json`);
  files.push(`${bp}/README.txt`);
  files.push(`${rp}/manifest.json`);
  files.push(`${rp}/README.txt`);
  if (state.items.length) {
    for (const item of state.items) {
      files.push(`${bp}/items/${item.id}.json`);
      files.push(`${rp}/textures/items/${item.id}.png`);
    }
    files.push(`${rp}/textures/item_texture.json`);
    files.push(`${rp}/texts/en_US.lang`);
  }
  for (const recipe of state.recipes) files.push(`${bp}/recipes/${recipe.id}.json`);
  for (const struct of state.structures) files.push(`${bp}/structures/${struct.name}`);
  for (const fn of state.functions) files.push(`${bp}/functions/${fn.name}.mcfunction`);
  return files;
}

function renderFileTree() {
  const files = buildFileList();
  $("fileTree").textContent = files.join("\n");
}

function renderStats() {
  $("statItems").textContent = state.items.length;
  $("statRecipes").textContent = state.recipes.length;
  $("statStructures").textContent = state.structures.length;
  $("statFunctions").textContent = state.functions.length;
}

function renderAll() {
  renderItems();
  renderRecipes();
  renderStructures();
  renderFunctions();
  renderStats();
  renderFileTree();
}

async function exportAddon() {
  if (!window.JSZip) return alert("JSZip did not load. Check your internet connection, then refresh.");

  const zip = new JSZip();
  const base = safeFileName(projectName().replace(/\s+/g, "_"), "BedModProject");
  const bpName = `${base}_BP`;
  const rpName = `${base}_RP`;
  const bp = zip.folder(bpName);
  const rp = zip.folder(rpName);

  const rpHeaderUuid = uuidv4();
  const bpHeaderUuid = uuidv4();
  bp.file("manifest.json", prettyJson(makeManifest("data", bpHeaderUuid, uuidv4(), rpHeaderUuid)));
  rp.file("manifest.json", prettyJson(makeManifest("resources", rpHeaderUuid, uuidv4())));

  bp.file("README.txt", `Generated with Bed-Mod Maker.\n\nInstall both the BP and RP into Minecraft Bedrock.\nRun functions with /function function_name.\nStructures go in BP/structures and can be loaded with /structure load ${namespace()}:name ~ ~ ~\n`);
  rp.file("README.txt", `Resource pack generated with Bed-Mod Maker.\nTextures are in textures/items.\n`);

  if (state.items.length) {
    for (const item of state.items) {
      bp.file(`items/${item.id}.json`, prettyJson(itemJson(item)));
      const blob = await pngBlobForItem(item);
      rp.file(`textures/items/${item.id}.png`, blob);
    }
    rp.file("textures/item_texture.json", prettyJson(textureJson()));
    rp.file("texts/en_US.lang", langFile());
  }

  for (const recipe of state.recipes) {
    bp.file(`recipes/${recipe.id}.json`, prettyJson(recipeJson(recipe)));
  }

  for (const struct of state.structures) {
    bp.file(`structures/${struct.name}`, struct.file);
  }

  for (const fn of state.functions) {
    bp.file(`functions/${fn.name}.mcfunction`, fn.commands.map(c => c.replace(/^\//, "")).join("\n") + "\n");
  }

  const howTo = [
    "BED-MOD MAKER EXPORT",
    "====================",
    "",
    "What is inside:",
    `- ${bpName}: Behavior Pack`,
    `- ${rpName}: Resource Pack`,
    "",
    "How to use:",
    "1. Extract this zip.",
    "2. Put the BP folder into com.mojang/behavior_packs.",
    "3. Put the RP folder into com.mojang/resource_packs.",
    "4. Add both packs to a world.",
    "5. Use /function name_here for generated functions.",
    "",
    "Structure spawning:",
    "- .mcstructure files are placed in BP/structures.",
    `- Load them with /structure load ${namespace()}:file_name ~ ~ ~`,
    "- The maker can generate .mcfunction files that run that command for you.",
    ""
  ].join("\n");
  zip.file("HOW_TO_INSTALL.txt", howTo);

  const blob = await zip.generateAsync({ type: "blob" });
  let fileName = safeFileName($("zipName").value || `${base}.zip`, `${base}.zip`);
  if (!fileName.toLowerCase().endsWith(".zip")) fileName += ".zip";
  downloadBlob(blob, fileName);
}

function resetProject() {
  if (!confirm("Clear items, recipes, structures, and functions?")) return;
  state.items = [];
  state.recipes = [];
  state.structures = [];
  state.functions = [];
  renderAll();
}

function downloadSampleStructureNote() {
  const text = `Structure spawning notes\n\nBed-Mod Maker cannot draw a .mcstructure from nothing yet. Make one in Minecraft using a Structure Block, export it as a .mcstructure file, then upload it in the Structures tab.\n\nAfter export, the file goes in BP/structures. You can load it with commands such as:\nstructure load ${namespace()}:your_structure_name ~ ~ ~\n\nOr use the Structures tab to generate a function, then run:\n/function spawn_structure\n`;
  downloadBlob(new Blob([text], { type: "text/plain" }), "structure-help.txt");
}

function setupStructureDrop() {
  const zone = $("structureDrop");
  const input = $("structureInput");
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    addStructureFiles(e.dataTransfer.files);
  });
  input.addEventListener("change", () => addStructureFiles(input.files));
}

function setupStars() {
  const canvas = $("stars");
  const ctx = canvas.getContext("2d");
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener("resize", resize);
  const stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.7 + 0.25,
    s: Math.random() * 0.28 + 0.04,
    a: Math.random() * .7 + .25
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const star of stars) {
      ctx.fillStyle = `rgba(196,181,253,${star.a})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      star.y += star.s;
      if (star.y > canvas.height + 4) { star.y = -4; star.x = Math.random() * canvas.width; }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

setTabs();
setupStructureDrop();
setupStars();
syncRecipeMode();
renderAll();
