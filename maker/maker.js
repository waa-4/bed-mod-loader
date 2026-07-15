const $ = (id) => document.getElementById(id);
const state = {
  selectedFunction: null,
  paintMode: 'pencil',
  pixels: Array.from({ length: 16 }, () => Array(16).fill('#00000000')),
  importedTexture: '',
  functions: {}, items: [], recipes: [], structures: [], blocks: [], biomes: [], worlds: []
};

const cmdDefs = {
  give: { label:'Give Item', fields:[['item','Item ID','minecraft:diamond'],['count','Count','1']], build:v=>`give ${v.target} ${v.item} ${v.count}` },
  summon: { label:'Summon Entity', fields:[['entity','Entity ID','minecraft:zombie'],['pos','Position','~ ~ ~']], build:v=>`summon ${v.entity} ${v.pos}` },
  tp: { label:'Teleport', fields:[['pos','Position / Target','~ ~5 ~']], build:v=>`tp ${v.target} ${v.pos}` },
  effect: { label:'Effect', fields:[['effect','Effect','speed'],['seconds','Seconds','10'],['level','Amplifier','1']], build:v=>`effect ${v.target} ${v.effect} ${v.seconds} ${v.level} true` },
  gamemode: { label:'Gamemode', fields:[['mode','Mode','creative']], build:v=>`gamemode ${v.mode} ${v.target}` },
  time: { label:'Time Set', fields:[['time','Time','night']], build:v=>`time set ${v.time}` },
  weather: { label:'Weather', fields:[['weather','Weather','clear'],['duration','Duration','999999']], build:v=>`weather ${v.weather} ${v.duration}` },
  structure: { label:'Structure Load', fields:[['name','Structure Name','my_house'],['pos','Position','~ ~ ~']], build:v=>`structure load ${v.name} ${v.pos}` },
  setblock: { label:'Set Block', fields:[['pos','Position','~ ~ ~'],['block','Block ID','minecraft:diamond_block']], build:v=>`setblock ${v.pos} ${v.block}` },
  fill: { label:'Fill Area', fields:[['from','From','~ ~ ~'],['to','To','~5 ~5 ~5'],['block','Block ID','minecraft:stone']], build:v=>`fill ${v.from} ${v.to} ${v.block}` },
  playsound: { label:'Play Sound', fields:[['sound','Sound','random.levelup'],['pos','Position','~ ~ ~']], build:v=>`playsound ${v.sound} ${v.target} ${v.pos}` },
  title: { label:'Title', fields:[['slot','Title Slot','title'],['text','Text','Hello!']], build:v=>`titleraw ${v.target} ${v.slot} {"rawtext":[{"text":"${escapeJson(v.text)}"}]}` },
  scoreboard: { label:'Scoreboard Add', fields:[['objective','Objective','coins'],['score','Score','1']], build:v=>`scoreboard players add ${v.target} ${v.objective} ${v.score}` },
  execute: { label:'Execute Command', fields:[['as','As','@p'],['at','At','@s'],['run','Run','say executed']], build:v=>`execute as ${v.as} at ${v.at} run ${v.run}` },
  function: { label:'Run Function', fields:[['function','Function Name','starter_function']], build:v=>`function ${v.function}` }
};

function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function cleanId(v){ return String(v||'thing').toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'') || 'thing'; }
function ns(){ return cleanId($('namespace').value || 'derp'); }
function project(){ return cleanId($('projectName').value || 'addon'); }
function escapeJson(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }
function uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]&15; return (c==='x'?r:(r&3|8)).toString(16);}); }
function pretty(o){ return JSON.stringify(o,null,2); }

// tabs
for(const b of document.querySelectorAll('.tab')) b.onclick=()=>{ document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $(b.dataset.tab).classList.add('active'); if(b.dataset.tab==='export') renderExportPreview(); };

// commands
function initCommands(){
  $('cmdType').innerHTML = Object.entries(cmdDefs).map(([k,d])=>`<option value="${k}">${d.label}</option>`).join('');
  $('cmdType').onchange = renderCmdFields;
  ['cmdTarget','cmdAmount'].forEach(id=>$(id).oninput=buildCommand);
  renderCmdFields();
}
function renderCmdFields(){
  const def = cmdDefs[$('cmdType').value];
  $('cmdFields').innerHTML = def.fields.map(f=>`<label>${f[1]}<input data-cmdfield="${f[0]}" value="${f[2]}"></label>`).join('');
  document.querySelectorAll('[data-cmdfield]').forEach(i=>i.oninput=buildCommand);
  buildCommand();
}
function buildCommand(){
  const def = cmdDefs[$('cmdType').value];
  const v = { target:$('cmdTarget').value, amount:$('cmdAmount').value };
  document.querySelectorAll('[data-cmdfield]').forEach(i=>v[i.dataset.cmdfield]=i.value);
  $('cmdOutput').value = def.build(v);
}
$('copyCmdBtn').onclick=async()=>{ await navigator.clipboard.writeText($('cmdOutput').value); toast('Command copied'); };
$('addCmdToFunctionBtn').onclick=()=>{ if(!state.selectedFunction) createFunction(); state.functions[state.selectedFunction].push($('cmdOutput').value); renderFunctions(); toast('Added to function'); };
$('addCmdToItemBtn').onclick=()=>{ $('itemUseCommand').value = $('cmdOutput').value; document.querySelector('[data-tab="items"]').click(); toast('Put command in item use box'); };

// functions
function createFunction(){ const name=cleanId($('functionName').value); if(!state.functions[name]) state.functions[name]=[]; state.selectedFunction=name; renderFunctions(); return name; }
$('createFunctionBtn').onclick=()=>{ createFunction(); toast('Function selected'); };
$('addManualCommandBtn').onclick=()=>{ if(!state.selectedFunction) createFunction(); const c=$('manualCommand').value.trim(); if(c) state.functions[state.selectedFunction].push(c); $('manualCommand').value=''; renderFunctions(); };
$('deleteFunctionBtn').onclick=()=>{ if(state.selectedFunction){ delete state.functions[state.selectedFunction]; state.selectedFunction=Object.keys(state.functions)[0]||null; renderFunctions(); } };
$('saveFunctionTextBtn').onclick=()=>{ if(!state.selectedFunction) return; state.functions[state.selectedFunction]=$('functionText').value.split('\n').map(x=>x.trim()).filter(Boolean); renderFunctions(); toast('Function saved'); };
function renderFunctions(){
  const names = Object.keys(state.functions);
  $('functionList').innerHTML = names.map(n=>`<div class="listItem"><b>${n}</b><div>${state.functions[n].length} command(s)</div><div class="mini"><button data-selfn="${n}">Select</button></div></div>`).join('') || '<p>No functions yet.</p>';
  document.querySelectorAll('[data-selfn]').forEach(b=>b.onclick=()=>{ state.selectedFunction=b.dataset.selfn; renderFunctions(); });
  $('functionText').value = state.selectedFunction ? (state.functions[state.selectedFunction]||[]).join('\n') : '';
  renderFunctionSelects(); renderExportPreview(false);
}
function renderFunctionSelects(){
  const opts = '<option value="">None</option>' + Object.keys(state.functions).map(n=>`<option value="${n}">${n}</option>`).join('');
  $('itemUseFunction').innerHTML = opts;
}

// pixel texture
const canvas=$('pixelCanvas'), ctx=canvas.getContext('2d');
function drawPixels(){ ctx.clearRect(0,0,512,512); for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const c=state.pixels[y][x]; if(c && c!=='#00000000'){ ctx.fillStyle=c; ctx.fillRect(x*32,y*32,32,32); } ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.strokeRect(x*32,y*32,32,32); } }
function pixelAt(e){ const r=canvas.getBoundingClientRect(); return {x:Math.floor((e.clientX-r.left)/r.width*16), y:Math.floor((e.clientY-r.top)/r.height*16)}; }
function paint(e){ const p=pixelAt(e); if(p.x<0||p.y<0||p.x>15||p.y>15)return; if(state.paintMode==='fill'){ const old=state.pixels[p.y][p.x]; flood(p.x,p.y,old,$('paintColor').value); } else state.pixels[p.y][p.x]=state.paintMode==='eraser'?'#00000000':$('paintColor').value; drawPixels(); }
function flood(x,y,old,nw){ if(old===nw)return; const q=[[x,y]]; while(q.length){ const [cx,cy]=q.pop(); if(cx<0||cy<0||cx>15||cy>15||state.pixels[cy][cx]!==old)continue; state.pixels[cy][cx]=nw; q.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]); }}
let mouseDown=false; canvas.onmousedown=e=>{mouseDown=true; paint(e)}; window.onmouseup=()=>mouseDown=false; canvas.onmousemove=e=>{ if(mouseDown && state.paintMode!=='fill') paint(e); };
for(const [id,mode] of [['pencilBtn','pencil'],['eraserBtn','eraser'],['fillBtn','fill']]) $(id).onclick=()=>{state.paintMode=mode; document.querySelectorAll('#pencilBtn,#eraserBtn,#fillBtn').forEach(b=>b.classList.remove('selected')); $(id).classList.add('selected');};
$('clearCanvasBtn').onclick=()=>{ state.pixels=Array.from({length:16},()=>Array(16).fill('#00000000')); drawPixels(); };
$('downloadPngBtn').onclick=()=>downloadDataUrl('bed_mod_texture.png', makeTextureDataUrl());
$('importTextureBtn').onclick=async()=>{
  const file=$('textureImport').files[0];
  if(!file){ toast('Choose a PNG first'); return; }
  const url=await fileToDataUrl(file);
  const img=await loadImage(url);
  const c=document.createElement('canvas'); c.width=16; c.height=16;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false; x.clearRect(0,0,16,16); x.drawImage(img,0,0,16,16);
  const data=x.getImageData(0,0,16,16).data;
  state.pixels=Array.from({length:16},(_,y)=>Array.from({length:16},(_,px)=>{
    const i=(y*16+px)*4, a=data[i+3];
    if(a===0) return '#00000000';
    return '#'+[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
  }));
  state.importedTexture=c.toDataURL('image/png'); drawPixels(); toast('PNG loaded into the 16x16 editor');
};
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }
function loadImage(url){ return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=url; }); }
function selectedTexture(source,color){ if(source==='imported' && state.importedTexture) return state.importedTexture; if(source==='pixel') return makeTextureDataUrl(); return autoTexture(color); }
function makeTextureDataUrl(){ const c=document.createElement('canvas'); c.width=16;c.height=16; const x=c.getContext('2d'); for(let y=0;y<16;y++) for(let i=0;i<16;i++){ const col=state.pixels[y][i]; if(col && col!=='#00000000'){x.fillStyle=col;x.fillRect(i,y,1,1);} } return c.toDataURL('image/png'); }
function autoTexture(color){ const c=document.createElement('canvas'); c.width=16;c.height=16; const x=c.getContext('2d'); x.fillStyle=color; x.fillRect(1,1,14,14); x.fillStyle='rgba(255,255,255,.35)'; x.fillRect(2,2,5,2); x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(10,10,4,4); return c.toDataURL('image/png'); }
function downloadDataUrl(name,url){ const a=document.createElement('a'); a.href=url; a.download=name; a.click(); }

// items/weapons
$('addItemBtn').onclick=()=>{ addItem({ id:cleanId($('itemId').value), name:$('itemName').value, stack:+$('itemStack').value||1, category:$('itemCategory').value, cooldownOn:$('itemCooldownOn').checked, cooldown:+$('itemCooldown').value||0, useOn:$('itemUseOn').checked, useFunction:$('itemUseFunction').value, useCommand:$('itemUseCommand').value.trim(), texture:selectedTexture($('itemTextureSource').value,$('itemColor').value), color:$('itemColor').value, damage:0, durability:0 }); };
function addItem(item){ const i=state.items.findIndex(x=>x.id===item.id); if(i>=0) state.items[i]=item; else state.items.push(item); renderItems(); toast('Item saved'); }
function renderItems(){ $('itemList').innerHTML = state.items.map(it=>`<div class="listItem"><b>${ns()}:${it.id}</b> — ${it.name}<div>Stack ${it.stack}, cooldown ${it.cooldownOn?it.cooldown+'s':'none'}, ${it.useOn?'has use action':'no use action'}</div><div class="mini"><button data-edititem="${it.id}">Edit</button><button data-delitem="${it.id}">Delete</button></div></div>`).join('') || '<p>No items yet.</p>'; document.querySelectorAll('[data-delitem]').forEach(b=>b.onclick=()=>{state.items=state.items.filter(x=>x.id!==b.dataset.delitem); renderItems();}); document.querySelectorAll('[data-edititem]').forEach(b=>b.onclick=()=>{const it=state.items.find(x=>x.id===b.dataset.edititem); $('itemId').value=it.id;$('itemName').value=it.name;$('itemStack').value=it.stack;$('itemCooldownOn').checked=it.cooldownOn;$('itemCooldown').value=it.cooldown;$('itemUseOn').checked=it.useOn;$('itemUseFunction').value=it.useFunction||'';$('itemUseCommand').value=it.useCommand||'';}); renderExportPreview(false); }
$('addWeaponBtn').onclick=()=>{ const id=cleanId($('weaponId').value); const cmdLines=$('weaponCommands').value.split('\n').map(x=>x.trim()).filter(Boolean); if($('weaponType').value==='Lightning Tool') cmdLines.push('execute at @s run summon minecraft:lightning_bolt ~ ~ ~'); if($('weaponType').value==='Gun-ish Item') cmdLines.push('execute at @s run particle minecraft:basic_flame_particle ^ ^1 ^5'); addItem({ id, name:$('weaponName').value, stack:1, category:'Equipment', cooldownOn:true, cooldown:+$('weaponCooldown').value||1, useOn:cmdLines.length>0, useFunction:'', useCommand:cmdLines.join('\n'), texture:autoTexture('#ffcf4a'), color:'#ffcf4a', damage:+$('weaponDamage').value||0, durability:+$('weaponDurability').value||0, weaponType:$('weaponType').value }); document.querySelector('[data-tab="items"]').click(); };

// recipes
function initCraft(){ $('craftGrid').innerHTML = Array.from({length:9},(_,i)=>`<input placeholder="${i+1}" />`).join(''); }
$('addShapelessBtn').onclick=()=>{ const id=cleanId($('recipeId').value); state.recipes=state.recipes.filter(r=>r.id!==id); state.recipes.push({type:'shapeless',id,result:$('recipeResult').value.trim(),count:+$('recipeCount').value||1,ingredients:$('recipeIngredients').value.split('\n').map(x=>x.trim()).filter(Boolean)}); renderRecipes(); };
$('addShapedBtn').onclick=()=>{ const id=cleanId($('recipeId').value); state.recipes=state.recipes.filter(r=>r.id!==id); const cells=[...document.querySelectorAll('#craftGrid input')].map(i=>i.value.trim()); state.recipes.push({type:'shaped',id,result:$('recipeResult').value.trim(),count:+$('recipeCount').value||1,cells}); renderRecipes(); };
function renderRecipes(){ $('recipeList').innerHTML=state.recipes.map(r=>`<div class="listItem"><b>${r.id}</b> ${r.type} → <code>${r.result}</code><div class="mini"><button data-delrecipe="${r.id}">Delete</button></div></div>`).join('')||'<p>No recipes yet.</p>'; document.querySelectorAll('[data-delrecipe]').forEach(b=>b.onclick=()=>{state.recipes=state.recipes.filter(x=>x.id!==b.dataset.delrecipe);renderRecipes();}); renderExportPreview(false); }

// structures
$('makeStructureCommandBtn').onclick=()=>{ $('structureCommand').value=`structure load ${cleanId($('structureName').value)} ${$('structureOffset').value||'~ ~ ~'}`; };
$('addStructureBtn').onclick=async()=>{ const f=$('structureFile').files[0]; if(!f){toast('Choose a .mcstructure file first');return;} const id=cleanId($('structureName').value); const data=await f.arrayBuffer(); state.structures=state.structures.filter(s=>s.id!==id); state.structures.push({id, offset:$('structureOffset').value||'~ ~ ~', data, fileName:f.name}); renderStructures(); toast('Structure added'); };
function renderStructures(){ $('structureList').innerHTML=state.structures.map(s=>`<div class="listItem"><b>${s.id}</b> from ${s.fileName}<br><code>structure load ${s.id} ${s.offset}</code><div class="mini"><button data-addstructfn="${s.id}">Add Spawn Function</button><button data-delstruct="${s.id}">Delete</button></div></div>`).join('')||'<p>No structures yet.</p>'; document.querySelectorAll('[data-delstruct]').forEach(b=>b.onclick=()=>{state.structures=state.structures.filter(x=>x.id!==b.dataset.delstruct);renderStructures();}); document.querySelectorAll('[data-addstructfn]').forEach(b=>b.onclick=()=>{const s=state.structures.find(x=>x.id===b.dataset.addstructfn); state.functions[`spawn_${s.id}`]=[`structure load ${s.id} ${s.offset}`]; state.selectedFunction=`spawn_${s.id}`; renderFunctions(); toast('Spawn function created');}); renderExportPreview(false); }

// blocks
$('addBlockBtn').onclick=()=>{ const id=cleanId($('blockId').value); state.blocks=state.blocks.filter(b=>b.id!==id); state.blocks.push({id,name:$('blockName').value,destroy:+$('blockDestroy').value||1,explosion:+$('blockExplosion').value||1,light:+$('blockLight').value||0,friction:+$('blockFriction').value||0.6,collision:$('blockCollision').checked,color:$('blockColor').value,render:$('blockRender').value,texture:selectedTexture($('blockTextureSource').value,$('blockColor').value),drop:$('blockDrop').value||'self'}); renderBlocks(); toast('Block saved'); };
function renderBlocks(){ $('blockList').innerHTML=state.blocks.map(b=>`<div class="listItem"><b>${ns()}:${b.id}</b> — ${b.name}<div>Light ${b.light}, destroy ${b.destroy}, collision ${b.collision?'on':'off'}</div><div class="mini"><button data-delblock="${b.id}">Delete</button></div></div>`).join('')||'<p>No blocks yet.</p>'; document.querySelectorAll('[data-delblock]').forEach(x=>x.onclick=()=>{state.blocks=state.blocks.filter(b=>b.id!==x.dataset.delblock);renderBlocks();}); renderExportPreview(false); }

// biomes
$('addBiomeBtn').onclick=()=>{ const id=cleanId($('biomeId').value); state.biomes=state.biomes.filter(b=>b.id!==id); state.biomes.push({id,name:$('biomeName').value,temp:+$('biomeTemp').value||0,downfall:+$('biomeDownfall').value||0,grass:$('biomeGrass').value,sky:$('biomeSky').value,surface:$('biomeSurface').value,under:$('biomeUnder').value,tags:$('biomeTags').value.split(',').map(x=>x.trim()).filter(Boolean)}); renderBiomes(); };
function renderBiomes(){ $('biomeList').innerHTML=state.biomes.map(b=>`<div class="listItem"><b>${ns()}:${b.id}</b> — ${b.name}<div>Temp ${b.temp}, downfall ${b.downfall}, surface ${b.surface}</div><div class="mini"><button data-delbiome="${b.id}">Delete</button></div></div>`).join('')||'<p>No biomes yet.</p>'; document.querySelectorAll('[data-delbiome]').forEach(x=>x.onclick=()=>{state.biomes=state.biomes.filter(b=>b.id!==x.dataset.delbiome);renderBiomes();}); renderExportPreview(false); }

// worlds
$('saveWorldPresetBtn').onclick=()=>{ const name=$('worldName').value; state.worlds=state.worlds.filter(w=>w.name!==name); state.worlds.push({name,type:$('worldType').value,gamemode:$('worldGamemode').value,difficulty:$('worldDifficulty').value,items:$('worldItems').value,layers:$('worldLayers').value}); renderWorlds(); };
function renderWorlds(){ $('worldList').innerHTML=state.worlds.map(w=>`<div class="listItem"><b>${w.name}</b> — ${w.type}<div>Gamemode ${w.gamemode}, difficulty ${w.difficulty}</div><div class="mini"><button data-delworld="${w.name}">Delete</button></div></div>`).join('')||'<p>No world presets yet.</p>'; document.querySelectorAll('[data-delworld]').forEach(x=>x.onclick=()=>{state.worlds=state.worlds.filter(w=>w.name!==x.dataset.delworld);renderWorlds();}); renderExportPreview(false); }

// export generation
function itemJson(it){
  const c={
    'minecraft:max_stack_size':Math.max(1,Math.min(64,it.stack||1)),
    'minecraft:icon':{textures:{default:`${ns()}:${it.id}`}}
  };
  if(it.cooldownOn) c['minecraft:cooldown']={category:`${ns()}_${it.id}`,duration:Math.max(0.05,it.cooldown||1)};
  if(it.damage) c['minecraft:damage']=Math.max(0,it.damage);
  if(it.durability) c['minecraft:durability']={max_durability:Math.max(1,it.durability)};
  return {format_version:'1.21.130','minecraft:item':{description:{identifier:`${ns()}:${it.id}`,menu_category:{category:String(it.category||'items').toLowerCase()}},components:c}};
}
function blockJson(b){
  const components={
    'minecraft:geometry':'minecraft:geometry.full_block',
    'minecraft:material_instances':{'*':{texture:`${ns()}:${b.id}`,render_method:b.render||'opaque'}},
    'minecraft:destructible_by_mining':{seconds_to_destroy:Math.max(0,b.destroy)},
    'minecraft:destructible_by_explosion':{explosion_resistance:Math.max(0,b.explosion)},
    'minecraft:light_emission':Math.max(0,Math.min(15,b.light)),
    'minecraft:friction':Math.max(0,Math.min(1,b.friction)),
    'minecraft:collision_box':!!b.collision,
    'minecraft:selection_box':true
  };
  return {format_version:'1.21.130','minecraft:block':{description:{identifier:`${ns()}:${b.id}`,menu_category:{category:'construction'}},components}};
}
function biomeJson(b){ return {format_version:'1.21.130','minecraft:biome':{description:{identifier:`${ns()}:${b.id}`},components:{'minecraft:temperature':{value:b.temp},'minecraft:downfall':{value:b.downfall},'minecraft:humidity':{is_humid:b.downfall>0.5},'minecraft:tags':{tags:b.tags},'minecraft:overworld_generation_rules':{generate_for_climates:[[b.temp,b.downfall]]}}}}; }
function clientBiomeJson(b){ return {format_version:'1.21.130','minecraft:client_biome':{description:{identifier:`${ns()}:${b.id}`},components:{'minecraft:sky_color':hexToInt(b.sky),'minecraft:water_appearance':{surface_color:'#44aff5'},'minecraft:grass_appearance':{color:b.grass}}}}; }
function hexToInt(h){ return parseInt(String(h).replace('#',''),16); }
function recipeJson(r){ if(r.type==='shapeless') return {format_version:'1.21.130','minecraft:recipe_shapeless':{description:{identifier:`${ns()}:${r.id}`},tags:['crafting_table'],ingredients:r.ingredients.map(i=>({item:i})),result:{item:r.result,count:r.count}}};
  const keys={}, letters='ABCDEFGHI'; let pattern=[]; for(let row=0;row<3;row++){ let line=''; for(let col=0;col<3;col++){ const val=r.cells[row*3+col]; if(val){ const letter=letters[row*3+col]; keys[letter]={item:val}; line+=letter; } else line+=' '; } pattern.push(line.replace(/ +$/,'')); } return {format_version:'1.21.130','minecraft:recipe_shaped':{description:{identifier:`${ns()}:${r.id}`},tags:['crafting_table'],pattern,key:keys,result:{item:r.result,count:r.count}}}; }
function scriptText(){
  const actionItems=state.items.filter(i=>i.useOn && (i.useFunction || i.useCommand));
  const actions=JSON.stringify(actionItems.map(i=>({id:`${ns()}:${i.id}`,func:i.useFunction||'',commands:(i.useCommand||'').split('\n').map(x=>x.trim()).filter(Boolean)})),null,2);
  return [
    'import { world } from "@minecraft/server";',
    '',
    `const ACTIONS = ${actions};`,
    '',
    'world.afterEvents.itemUse.subscribe((event) => {',
    '  const source = event.source;',
    '  const item = event.itemStack;',
    '  if (!source || !item) return;',
    '  const found = ACTIONS.find(a => a.id === item.typeId);',
    '  if (!found) return;',
    '  try {',
    '    if (found.func) source.runCommand("function " + found.func);',
    '    for (const command of found.commands) source.runCommand(command);',
    '  } catch (err) {',
    '    console.warn("Bed-Mod Maker action failed: " + err);',
    '  }',
    '});',
    ''
  ].join('\n');
}
function manifest(name,type,headerUuid,moduleUuid,dependency,withScript=false){
  const modules=[{type,uuid:moduleUuid,version:[1,0,0]}];
  if(withScript) modules.push({type:'script',language:'javascript',uuid:uuid(),version:[1,0,0],entry:'scripts/main.js'});
  const m={format_version:2,header:{name,description:$('description').value,uuid:headerUuid,version:[1,0,0],min_engine_version:[1,21,130]},modules};
  const deps=[]; if(dependency) deps.push({uuid:dependency,version:[1,0,0]}); if(withScript) deps.push({module_name:'@minecraft/server',version:'2.6.0'}); if(deps.length) m.dependencies=deps;
  return m;
}
function textureList(){ const data={resource_pack_name:project(),texture_name:'atlas.items',texture_data:{}}; for(const it of state.items) data.texture_data[`${ns()}:${it.id}`]={textures:`textures/items/${it.id}`} ; return data; }
function terrainTexture(){ const data={resource_pack_name:project(),texture_name:'terrain_texture',texture_data:{}}; for(const b of state.blocks) data.texture_data[`${ns()}:${b.id}`]={textures:`textures/blocks/${b.id}`} ; return data; }
function langText(){ let lines=[]; state.items.forEach(i=>lines.push(`item.${ns()}:${i.id}.name=${i.name}`)); state.blocks.forEach(b=>lines.push(`tile.${ns()}:${b.id}.name=${b.name}`)); state.biomes.forEach(b=>lines.push(`biome.${ns()}:${b.id}.name=${b.name}`)); return lines.join('\n')+'\n'; }
function worldSetupFunction(w){ const cmds=[`gamemode ${w.gamemode} @a`,`difficulty ${w.difficulty}`]; String(w.items||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(x=>cmds.push(`give @p ${x}`)); return cmds.join('\n'); }
function installNotes(){ return `BED-MOD MAKER V3 EXPORT\n\nThis zip contains a Behavior Pack and Resource Pack pair.\n\nInstall idea:\n1. Extract this zip.\n2. Put the BP folder into your com.mojang behavior_packs folder.\n3. Put the RP folder into your com.mojang resource_packs folder.\n4. Enable both packs on a world.\n\nNotes:\n- Custom item use actions are generated with a scripts/main.js file. If your Minecraft version asks for script/experiment toggles, enable the needed creator/script toggles.\n- Structure spawning only works for .mcstructure files you uploaded into the maker.\n- World Presets are guides/functions, not edited world saves. This V3 intentionally does not edit world files.\n`; }
function filesPreview(){ const bp=`${project()}_BP`, rp=`${project()}_RP`; let f=[`${bp}/manifest.json`,`${rp}/manifest.json`,`${rp}/texts/en_US.lang`]; state.items.forEach(i=>{f.push(`${bp}/items/${i.id}.json`,`${rp}/textures/items/${i.id}.png`)}); state.blocks.forEach(b=>{f.push(`${bp}/blocks/${b.id}.json`,`${rp}/textures/blocks/${b.id}.png`)}); state.recipes.forEach(r=>f.push(`${bp}/recipes/${r.id}.json`)); Object.keys(state.functions).forEach(n=>f.push(`${bp}/functions/${n}.mcfunction`)); state.structures.forEach(s=>f.push(`${bp}/structures/${s.id}.mcstructure`)); state.biomes.forEach(b=>{f.push(`${bp}/biomes/${b.id}.json`,`${rp}/biomes_client/${b.id}.json`)}); state.worlds.forEach(w=>{f.push(`WORLD_PRESETS/${cleanId(w.name)}.json`,`${bp}/functions/world_${cleanId(w.name)}.mcfunction`)}); return f.sort().join('\n'); }
function renderExportPreview(full=true){ if(!full && !$('export').classList.contains('active')) return; $('stats').innerHTML=[['Items',state.items.length],['Functions',Object.keys(state.functions).length],['Recipes',state.recipes.length],['Structures',state.structures.length],['Blocks',state.blocks.length],['Biomes',state.biomes.length],['World Presets',state.worlds.length]].map(s=>`<div class="stat"><strong>${s[1]}</strong>${s[0]}</div>`).join(''); $('filePreview').textContent=filesPreview(); }
async function dataUrlToBlob(url){ return await (await fetch(url)).blob(); }
async function exportZip(){
  const zip=new JSZip(); const bpName=`${project()}_BP`, rpName=`${project()}_RP`; const bp=zip.folder(bpName), rp=zip.folder(rpName);
  const needsScript=state.items.some(i=>i.useOn && (i.useFunction||i.useCommand));
  const bpHeader=uuid(), bpModule=uuid(), rpHeader=uuid(), rpModule=uuid();
  bp.file('manifest.json', pretty(manifest(`${$('projectName').value} BP`,'data',bpHeader,bpModule,rpHeader,needsScript)));
  rp.file('manifest.json', pretty(manifest(`${$('projectName').value} RP`,'resources',rpHeader,rpModule,bpHeader,false)));
  if(needsScript) bp.file('scripts/main.js', scriptText());
  bp.file('README_BED_MOD_MAKER.txt', installNotes()); zip.file('HOW_TO_INSTALL.txt', installNotes());
  for(const [n,lines] of Object.entries(state.functions)) bp.file(`functions/${n}.mcfunction`, lines.join('\n'));
  for(const it of state.items){ bp.file(`items/${it.id}.json`, pretty(itemJson(it))); const blob=await dataUrlToBlob(it.texture||autoTexture(it.color||'#4cc9f0')); rp.file(`textures/items/${it.id}.png`, blob); }
  if(state.items.length) rp.file('textures/item_texture.json', pretty(textureList()));
  for(const r of state.recipes) bp.file(`recipes/${r.id}.json`, pretty(recipeJson(r)));
  for(const s of state.structures) bp.file(`structures/${s.id}.mcstructure`, s.data);
  for(const b of state.blocks){ bp.file(`blocks/${b.id}.json`, pretty(blockJson(b))); const blob=await dataUrlToBlob(b.texture||autoTexture(b.color)); rp.file(`textures/blocks/${b.id}.png`, blob); }
  if(state.blocks.length) rp.file('textures/terrain_texture.json', pretty(terrainTexture()));
  for(const b of state.biomes){ bp.file(`biomes/${b.id}.json`, pretty(biomeJson(b))); rp.file(`biomes_client/${b.id}.json`, pretty(clientBiomeJson(b))); }
  for(const w of state.worlds){ zip.file(`WORLD_PRESETS/${cleanId(w.name)}.json`, pretty(w)); bp.file(`functions/world_${cleanId(w.name)}.mcfunction`, worldSetupFunction(w)); }
  rp.file('texts/en_US.lang', langText());
  const content=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(content); a.download=`${project()}_bed_mod_maker_export.zip`; a.click(); URL.revokeObjectURL(a.href); toast('Exported zip');
}
$('exportZipBtn').onclick=exportZip;


function projectSnapshot(){
  return {version:3,projectName:$('projectName').value,namespace:$('namespace').value,description:$('description').value,state:{...state,structures:state.structures.map(s=>({...s,data:null}))}};
}
$('saveProjectBtn').onclick=()=>{
  const blob=new Blob([pretty(projectSnapshot())],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${project()}.kermit`; a.click(); URL.revokeObjectURL(a.href); toast('Maker project saved');
};
$('loadProjectBtn').onclick=async()=>{
  const file=$('loadProjectFile').files[0]; if(!file){toast('Choose a .kermit or JSON project');return;}
  try{ const data=JSON.parse(await file.text()); $('projectName').value=data.projectName||'Bed-Mod Project'; $('namespace').value=cleanId(data.namespace||'bedmod'); $('description').value=data.description||''; Object.assign(state,data.state||{}); state.structures=[]; renderAll(); drawPixels(); toast('Project loaded (structures must be re-imported)'); }catch(err){ toast('Could not load that project'); console.error(err); }
};
$('quickDemoBtn').onclick=()=>{ createFunction(); state.functions.magic_spawn=['say Magic spawn activated!','effect @s speed 10 1']; state.selectedFunction='magic_spawn'; $('itemId').value='magic_wand';$('itemName').value='Magic Wand';$('itemUseFunction').value='magic_spawn';$('itemUseCommand').value='playsound random.levelup @s';$('addItemBtn').click(); state.recipes.push({type:'shapeless',id:'magic_wand_recipe',result:`${ns()}:magic_wand`,count:1,ingredients:['minecraft:stick','minecraft:diamond']}); renderFunctions(); renderRecipes(); toast('Demo added'); };
$('clearProjectBtn').onclick=()=>{ if(confirm('Clear items, functions, recipes, blocks, biomes, structures, and world presets?')){ Object.assign(state,{selectedFunction:null,functions:{},items:[],recipes:[],structures:[],blocks:[],biomes:[],worlds:[]}); renderAll(); } };
function renderAll(){ renderFunctions(); renderItems(); renderRecipes(); renderStructures(); renderBlocks(); renderBiomes(); renderWorlds(); renderExportPreview(); }

initCommands(); initCraft(); drawPixels(); renderAll();
