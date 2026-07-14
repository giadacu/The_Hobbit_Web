# Rigenerazione immagini — da Mirkwood in avanti

Sostituire progressivamente i JPEG legacy con PNG nello stile di `mirkwood_forest_path.png`, `elvish_clearing.png`, `elvenkings_halls.png`.

**Output:** `assets/local-images/<filename>.png`  
**Formato obbligatorio:** 16:9 (landscape).  
**Ogni prompt sotto è completo** — copia l'intero blocco nel generatore.

Dopo ogni sostituzione, aggiorna `"image"` in `assets/game-data.js` (o `ensureRoom` in `game.js`).

---

## Già aggiornate — non rigenerare

Mirkwood interno e varianti contestuali, `elvish_clearing.png`, sale elfiche, quartieri `lake_town_*.png`, Erebor interno, Smaug contestuali, scene endgame — vedi commit precedenti o `assets/local-images/`.

---

## Priorità 1 — Ingresso Mirkwood e loop foresta

### P1.01 · `gate_to_mirkwood.png` (sostituisce `Mirkwood.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Forest entrance at the edge of Mirkwood: open lands falling away behind, first black boughs gathering ahead with unwelcoming patience. A practical path slips between massive trunks, no ornate gate, colder air under the trees, the entrance looks more like a warning than a road.
```

### P1.02 · `forest_road.png` (sostituisce `forest_road_1.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Forest road beneath the eaves of Mirkwood: still broad enough to seem trustworthy for a little while, but trees already lean close and the light has begun to lose heart. Wheel-ruts in damp earth, uneasy silence, path receding into gloom.
```

### P1.03 · `forest_road_2.png` (sostituisce `forest_road_2.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Same forest road deeper under the trees: narrower, more shadowed, roots crossing the path, distant mist between trunks, light failing further, oppressive closeness.
```

### P1.04 · `bewitched_gloomy_place.png` (sostituisce `bewitched.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Bewitched gloomy woodland: unnatural fog clinging to roots, twisted trees leaning in with skeletal branches, half-heard whispers suggested only by shifting shadows, wood that feels suffered rather than chosen, no visible magic glyphs or text.
```

### P1.05 · `west_bank.png` (sostituisce `west_bank.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. West bank of the Black River in Mirkwood: fast silent dark water between muddy roots, reeds along the shore, a boat half-hidden among rushes on the far side, oppressive trees behind, passage offered where the forest offered only sameness.
```

### P1.06 · `west_bank_exhausted.png` (file mancante, referenziato in `game.js`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. West bank of the Black River, bleaker and colder than usual: empty exhausted mood, optional small dwarf-sized silhouette slumped by the water, spent journey, harsher light, the forest still watching, fast dark current.
```

### P1.07 · `east_bank.png` (sostituisce `east_bank.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. East bank of the Black River after crossing: current slides past without sparkle or song, trees slightly less malign than before but Mirkwood not finished yet, lonely muddy landing, quiet dark water.
```

### P1.08 · `green_forest.png` (sostituisce `green_forest.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Small green patch of forest where honest daylight still filters through leaves, mercy after black miles, ordinary ferns and grass, soft filtered sunlight, but thick spider-silk blocking the path ahead, relief mixed with lingering danger, still within Mirkwood's reach.
```

### P1.09 · `place_of_black_spiders.png` (sostituisce `spider_place.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Place of black spiders beneath Mirkwood's foulest boughs: great webs binding tree to tree from root to crown, warm close air heavy with must and old poison, cocoon-shapes in silk, every gap between trunks ready to tremble into life, no large spiders prominent in foreground.
```

### P1.10 · `forest_of_tangled_smothering_trees.png` (sostituisce `tangled_trees.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Forest of tangled smothering trees: canopy so dense only faint dappled light penetrates, gnarled branches interwoven in chaotic embrace, thick vines choking trunks, almost impenetrable green-black suffocation.
```

### P1.11 · `deep_bog.png` (sostituisce `deep_bog.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Oppressive dark forest, desaturated greens and charcoal, claustrophobic ancient trees, minimal light, stale air. Deep bog in Mirkwood: murky stagnant water, foul-smelling mud that would suck at boots, twisted leafless trees overhead draped in ghostly moss, heavy moisture and decay, oppressive silence.
```

---

## Priorità 2 — Elfi: prigione e fuga

### P2.01 · `dark_dungeon.png` (sostituisce `yellowcave.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Cool blue-grey torchlight, damp stone, iron rings, wooden barrels, ordered cold restraint. Dark dungeon beneath the Elvenking's halls: damp stone walls, iron rings on the wall, rusty closed door, stale torch-smoke, none of the woodland grace above, chains suggested but not centered, oppressive captivity.
```

### P2.02 · `cellar.png` (sostituisce `Cellar.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Cool blue-grey torchlight, damp stone, iron rings, wooden barrels, ordered cold restraint. King's wine cellar under the Elvenking's halls: great wooden barrels on supports, damp stone arches, trap door in the floor, underground water channel, feast-night disorder with spilled wine stains, one conspicuous empty barrel ready, lantern warmth against cool stone.
```

### P2.03 · `elvenkings_river_barrel.png` (refresh opzionale)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Cool blue-grey torchlight, damp stone, iron rings, wooden barrels, ordered cold restraint. Single sturdy wooden barrel bobbing on a dark underground river channel beneath the Elvenking's halls, close stone walls, lantern reflections on black water, claustrophobic escape route, current moving away from the cellar.
```

---

## Priorità 3 — Lake-town (hub)

### P3.01 · `long_lake.png` (sostituisce `long_lake.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Vast Long Lake under an exposed cold sky, dark water to the horizon, Lonely Mountain small but clear in the distance, lonely open crossing, optional distant barrel on the water, wind and exposure after underground escape.
```

### P3.02 · `wooden_town.png` (sostituisce `Wooden_town.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town overview: forest of timber halls, jetties and plank bridges raised above dark water, boats moored, nets and casks, merchants' bustle suggested by clutter not crowds, Lonely Mountain visible afar, practical frontier town on the lake.
```

### P3.03 · `strong_river.png` (sostituisce `strong_river.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Fast river below Lake-town after the barrel escape: rushing current, rocky banks, dangerous white water, spray and noise, rocky gorge, urgency of downstream flight, no town visible.
```

---

## Priorità 4 — Avvicinamento e esterno Erebor

### P4.01 · `bleak_barren_land.png` (sostituisce `bleak_barren.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Bleak barren approach to the Lonely Mountain: stony desolate slopes, sparse harsh grass, the Mountain dominating the sky, cold wind, no comfort, desolation after the lake journey.
```

### P4.02 · `ruins_of_the_town_of_dale.png` (sostituisce `ruins_of_Dale.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Ruins of Dale beneath Erebor: broken walls and fallen masonry, wary camps beginning to gather, Lonely Mountain looming overhead, tense post-Smaug atmosphere, not yet full battle, cold northern light.
```

### P4.03 · `stoe_of_ravenhill.png` (sostituisce `ravenhill.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Ravenhill bowman's post: old weathered stone on a windswept height, view of the Mountain's shoulder and open sky where a dragon might break clear, place for the last shot, dramatic altitude, empty stone vantage.
```

### P4.04 · `little_steep_bay.png` (sostituisce `steep_bay.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Little steep bay below the Mountain summit-road: rocky descent, cliff wall above, narrow path toward Ravenhill, dizzy height, barren stone and scrub, Lonely Mountain mass overhead.
```

### P4.05 · `front_gate.png` (sostituisce `front_gate.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Front Gate of Erebor: vast stonework and weathered dwarf carvings, monumental entrance mute and forbidding, old craft commanding awe despite ruin, stairs and rune-marked pillars, harsh daylight, closed gate.
```

### P4.06 · `lonely_mountain.png` (sostituisce `lonely_mountain.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Lonely Mountain exterior slope: vast grey peak filling the sky, dragon-scorched traces on rock, winding mountain path, oppressive scale, cold desolate air, ancient kingdom under stone.
```

### P4.07 · `smooth_straight_passage.png` (sostituisce `smooth_straight.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Ancient dwarf masonry, warm gold glow in cracks, dragon-smoke stains, vast pillared halls. Smooth straight dwarf-passage inside the Mountain: precise tool-marks on walls, faint way-runes, dim torchlight, tunnel perspective receding, deliberate craft despising waste, no treasure visible.
```

### P4.08 · `empty_place.png` (sostituisce `empty_place.jpeg`)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Grey mountain stone, dwarf carvings, harsh daylight, epic monumental scale. Empty high shelf on the Mountain: barren stone platform, vast drop at the edge, sky and peak, lonely altitude, summit-road desolation, wind-exposed emptiness.
```

### P4.09 · `lower_halls.png` (sostituisce `lower_halls.jpeg`, solo senza drago)

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Ancient dwarf masonry, warm gold glow in cracks, dragon-smoke stains, vast pillared halls. Lower halls of Erebor without the dragon: mighty chamber of pillars and carvings, gold dust glittering in cracks, warm close air faintly tainted by old dragon-smoke, empty treasure hall, ancient dwarf grandeur, respectful silence.
```

> Con Smaug vivo il gioco usa `smaug_sleeping_lower_halls.png` e le altre varianti contestuali — non sostituirle con questa immagine base.

---

## Priorità 5 — Refresh opzionale (quartieri Lake-town)

### P5.01 · `lake_town_docks.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town docks: timbered piers thrust over dark water, boats moored, nets and coiled ropes, barrels on planks, gulls, working harbour mood, Lonely Mountain distant, painterly not photorealistic.
```

### P5.02 · `lake_town_marketplace.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town marketplace: busy wooden stalls, baskets of fish, bolts of cloth, traders' goods, plank walkways above water, lively frontier commerce, Mountain afar, painterly not photorealistic.
```

### P5.03 · `lake_town_square.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town square: widened timber platform, notice posts, open gathering place above the lake, practical civic heart of a town on stilts, Mountain visible in distance, painterly not photorealistic.
```

### P5.04 · `lake_town_warehouses.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town warehouses: heavy tarred doors, stacked grain and salted fish, rope and trade goods in dim interiors, smell of river-water and labor, painterly not photorealistic.
```

### P5.05 · `lake_town_bridges.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town bridges: web of plank bridges linking neighbourhoods above dark water, view down through gaps to the lake, interconnected timber town, painterly not photorealistic.
```

### P5.06 · `lake_town_tavern.png`

```
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Timber halls and jetties above dark lake water, nets, ropes, casks, humid frontier town atmosphere. Lake-town tavern interior or façade: cups and warm lamplight, weather-talk atmosphere, wooden beams, frontier inn above the water, watchers glancing toward the Mountain, painterly not photorealistic.
```

---

## Checklist post-sostituzione

1. Salva la PNG in `assets/local-images/` (convenzione: `{room_id}.png`, vedi tabella sopra).
2. Rigenera il manifest: `node scripts/generate-image-manifest.js`
3. Verifica in gioco la stanza — il gioco userà automaticamente il file più recente tra legacy JPEG, nome stanza e riferimento configurato.
4. Opzionale: aggiorna `"image"` in `assets/game-data.js` quando vuoi allineare il default nel codice.

---

## Riepilogo

| Priorità | N. | Contenuto |
|----------|-----|-----------|
| P1 | 11 | Mirkwood ingresso e loop |
| P2 | 3 | Prigione elfica e fuga |
| P3 | 3 | Hub Lake-town |
| P4 | 9 | Erebor esterno e lower halls base |
| P5 | 6 | Refresh quartieri (opzionale) |
