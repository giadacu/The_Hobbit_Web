# Rigenerazione immagini - da prima dei trolls fino a Beorn

Sostituire progressivamente i JPEG legacy del tratto narrativo che va da `dreary` fino a `beorns_house`, mantenendo la coerenza visiva delle PNG piu' recenti come `rivendell.png`, `trolls_clearing_live.png`, `trollshaws.png`, `hidden_valley.png` e `beorn_great_hall.png`.

Per il tratto successivo da Mirkwood in avanti, continua a usare `docs/image-regen-mirkwood-onward.md`.

**Output:** `assets/local-images/<room_id>.png`  
**Formato obbligatorio:** 16:9 (landscape).  
**Ogni prompt sotto e' completo** - copia l'intero blocco nel generatore.

Dopo ogni sostituzione, aggiorna `"image"` in `assets/game-data.js` quando vuoi allineare il default esplicito al nuovo file PNG. Il gioco usa comunque il manifest e puo' risolvere automaticamente file piu' recenti con nome coerente alla stanza.

---

## Gia' aggiornate - non rigenerare

`trolls_clearing_live.png`, `trolls_clearing_stone_dawn.png`, `trolls_cave_loot.png`, `rivendell.png`, `trollshaws.png`, `hidden_valley.png`, `courtyard.png`, `library_rivendell.png`, `hall_of_fire.png`, `guest_chambers_rivendell.png`, `terrace_rivendell.png`, `bridge_rivendell.png`, `treeless_opening_open_ground.png`, `beorn_great_hall.png`, `beorn_stable.png`, `beorn_garden.png`, `beorn_animal_yard.png`.

---

## Priorita' 1 - Prima dei trolls e sentieri nascosti

### P1.01 - `dreary.png` (sostituisce `Dreary.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Bleak Trollshaws borderland before the trolls: gloomy empty land with dreary hills ahead, withered grass, scattered ancient stones, low mist caught among barren rises, heavy overcast sky, melancholy desolation, no settlement, no road sign, a place that feels watched and abandoned.
```

### P1.02 - `hidden_path.png` (sostituisce `hidden_path.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Hidden forest path near the trolls' country: narrow mossy trail under ancient trees, deep oversized footprints pressed into soft ground, roots and vines forming natural arches overhead, damp foliage, dim green light, secretive uneasy mood, the track looks used by something large and brutish.
```

---

## Priorita' 2 - Misty Mountains: salita, creste e vallate

### P2.01 - `misty_mountain.png` (sostituisce `misty_mountain.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Hard dangerous path in the Misty Mountains: narrow treacherous trail along sheer cliffs and dark ravines, jagged rock, loose gravel, cold thin air, swirling mist obscuring distance, harsh blue-grey mountain light, constant tension, exposed and unforgiving terrain.
```

### P2.02 - `narrow_path_1.png` (sostituisce `narrow_path_1.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow mountain path with hidden crevices and a small cave-like recess offering brief shelter from the wind, twisting trail on raw stone, lonely high-altitude mood, cold light, distant mountain echoes, painterly realism, no figures.
```

### P2.03 - `narrow_path_2.png` (sostituisce `narrow_path_2.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow winding trail climbing beside sheer cliffs and steep rocky inclines, loose gravel and sharp stones underfoot, mountain wall on one side and a severe drop on the other, drifting mist, bleak alpine palette, sense of careful footing at every step.
```

### P2.04 - `narrow_path_3.png` (sostituisce `narrow_path_3.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow mountain path with vast rugged terrain opening around it, distant forest and lake far below, fierce wind sweeping across exposed stone, cold clear air, broad sense of altitude and isolation, high crags and barren ledges.
```

### P2.05 - `narrow_path_4.png` (sostituisce `narrow_path_4.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path crossing a barren mountainside where the earth's bones are laid bare, stark stone, sparse scrub, austere weathered ridges, enduring strength of nature, restrained cold palette, adventurous but severe atmosphere.
```

### P2.06 - `narrow_path_5.png` (sostituisce `narrow_path_5.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path at a breathtaking lookout in the Misty Mountains: rocky crags, sheer cliffs, valley spread far below, wind howling around exposed stone, huge depth and scale, dangerous beauty, no characters, no structures.
```

### P2.07 - `steep_path_6.png` (sostituisce `steep_path_1.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Rugged mountain trail etched into the mountainside and flanked by steep drops into shadowy ravines, peak shrouded in mist ahead, daunting but enticing ascent, cold wind, sharpened rocky textures, high-altitude foreboding.
```

### P2.08 - `steep_path_7.png` (sostituisce `steep_path_2.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Steep path becoming narrower and more challenging on rocky slopes, shifting ground from earth to uneven stone, jagged outcrops creating natural obstacles, intense verticality, cold grey light, a route that demands slow deliberate movement.
```

### P2.09 - `steep_path_8.png` (sostituisce `steep_path_3.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Path climbing more steeply toward a looming barren mountain, trees thinning away into hardy shrubs and rough grass clinging to rock, transition from lower wild land to harsher mountain country, exposed sky, desaturated palette, adventurous unease.
```

### P2.10 - `deep_misty_valley_1.png` (sostituisce `deep_misty_1.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Deep misty valley in the Misty Mountains: ancient stones half-lost in verdant gloom, thick silver mist drifting low, enigmatic shadows, old weathered rock, hints of forgotten age, magical but uneasy atmosphere, lush darkness beneath mountain walls.
```

### P2.11 - `deep_misty_valley_2.png` (sostituisce `deep_misty_2.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Another deep misty valley, denser canopy and thicker haze than before, shifting shadows beneath ancient trees and stone, primordial magical mood, deeper enclosed mystery, cool misty greens and slate greys, no visible people or creatures.
```

### P2.12 - `narrow_path_6.png` (sostituisce `narrow_path_6.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path threading through an ancient mountain valley, towering trees gripping the earth with gnarled roots, filtered light touching the trail like a silver ribbon, mountain and woodland meeting in one sheltered but uncanny passage.
```

### P2.13 - `narrow_path_7.png` (sostituisce `narrow_path_7.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path under towering ancient trees, enshrouded in mist and shadow, dense thickets, moss-covered stones, scent of pine and earth suggested by the scene, forgotten-tales atmosphere, painterly forested mountain path with subdued light.
```

### P2.14 - `narrow_path_8.png` (sostituisce `narrow_path_8.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path pinched by protruding roots and low-hanging branches, the way forced into a tighter squeeze, uneven ground, dim woodland-mountain light, close framing, obstacle-focused composition, adventurous tension without showing travelers.
```

### P2.15 - `narrow_path_9.png` (sostituisce `narrow_path_9.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path curving gently through an enchanting but remote mountain landscape, slight inclines, scattered boulders, alternating openings and shadowed turns, each bend promising another vista, measured adventure, restrained mist and cool light.
```

### P2.16 - `narrow_path_10.png` (sostituisce `narrow_path_10.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow path in a harsher high mountain environment dotted with boulders and lichen, endurance-road mood, little life beyond stubborn alpine growth, path rising toward unseen heights, austere stone and wind, far from the lush world below.
```

### P2.17 - `narrow_place.png` (sostituisce `ravine_1.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow place with a dreadful drop into a dim valley: path clinging to a cliffside barely wide enough to cross, swirling mist below, jagged rocks and twisted roots, dizzying vertical drop, howling wind, ominous silence over a shadow-filled ravine.
```

---

## Priorita' 3 - Montagna, goblins e tunnel soffocanti

### P3.01 - `large_dry_cave.png` (sostituisce `large_dry_cave.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Large dry cave in the mountains: broad sheltering cavern with smooth dry ground, light filtering through cracks above, stalactites and stalagmites like ancient sentinels, cool still air, brief refuge from storm and exposure, natural stone grandeur without treasure or people.
```

### P3.02 - `goblins_dungeon.png` (sostituisce `goblins_dungeon.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Goblin dungeon deep under the mountains: damp rugged stone walls, moss streaks, flickering torches, scattered bones, rusted chains, branching tunnel mouths, mold and decay atmosphere, sickly yellow-green firelight, filthy oppressive underground prison.
```

### P3.03 - `dark_winding_passage.png` (sostituisce `dark_winding.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Dark winding goblin passage twisting out of sight, narrow rugged walls damp with moss, uneven floor, torchlight catching only parts of each bend, eerie shadows, stale cave air, bones and scraps suggested in corners, labyrinthine menace.
```

### P3.04 - `big_cavern.png` (sostituisce `big_cavern.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Big goblin cavern: vast underground chamber with towering pillars, heavy stalactites, scattered torches, debris-strewn uneven floor, distant darkness swallowing scale, damp mossy rock, ominous echoing emptiness before hidden movement.
```

### P3.05 - `dark_stuffy_passage_1.png` (sostituisce `dark_stuffy_1.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Cramped black goblin tunnel heavy with dust, faint dripping somewhere beyond sight, rough stone pressing close, almost no light except a weak distant glow, claustrophobic composition, stale oppressive underground air.
```

### P3.06 - `dark_stuffy_passage_2.png` (sostituisce `dark_stuffy_2.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Damp and oppressive tunnel where the walls draw close on either side, beads of moisture on black stone, low visibility, stale air, close perspective making every breath feel heavy, no figures, no text.
```

### P3.07 - `dark_stuffy_passage_3.png` (sostituisce `dark_stuffy_3.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Deep black passage where darkness presses in from every side, floor barely visible, tunnel disappearing into shadow, silence disturbed only by imagined footfalls, minimal torch spill, intense enclosed dread.
```

### P3.08 - `dark_stuffy_passage_4.png` (sostituisce `dark_stuffy_4.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Musty mold-reeking tunnel with a low oppressive roof seeming to stoop downward, rough stone, damp patches, stale yellow torchlight from a side bend, uncomfortable crouching scale, foul underground atmosphere.
```

### P3.09 - `inside_goblins_gate.png` (sostituisce `inside_goblins_gate.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Inside goblin's gate: damp pillared hall lit by sickly torchlight, moss-streaked stone, rough table with bones and stolen trinkets, shadowed stair climbing into deeper ways, crude goblin occupation of an older underground space, dirty green-yellow light, no visible goblins.
```

### P3.10 - `dark_stuffy_passage_5.png` (sostituisce `dark_stuffy_5.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow underground passage with stale dead air and an old sour smell implied by damp discoloration and rot, tight stone corridor, weak torch-glow fading fast, fetid stillness, oppressive close walls.
```

### P3.11 - `dark_stuffy_passage_6.png` (sostituisce `dark_stuffy_6.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Cramped tunnel where shadows mass thickly and every sound would rebound from narrow stone, slightly angled perspective, glossy damp rock catching minimal light, acoustic claustrophobia, blackness ahead.
```

### P3.12 - `dark_stuffy_passage_7.png` (sostituisce `dark_stuffy_7.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Rough cold stone passage so tight the walls seem within arm's reach on both sides, no room for comfort, low heavy ceiling, chill damp texture, harsh close framing, goblin-tunnel realism.
```

### P3.13 - `dark_stuffy_passage_8.png` (sostituisce `dark_stuffy_8.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Suffocatingly still black passage where even the air feels heavy, no breeze, dust suspended in weak light, near-motionless oppressive atmosphere, tunnel vanishing into close darkness, no characters.
```

### P3.14 - `dark_stuffy_passage_9.png` (sostituisce `dark_stuffy_9.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Uneasy tunnel held in thick silence, hints of distant furtive scurrying suggested by disturbed dust and scraps near the walls, narrow black corridor, sickly reflected torchlight, watchful unseen menace.
```

### P3.15 - `dark_stuffy_passage_10.png` (sostituisce `dark_stuffy_10.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Very tight goblin passage with scarcely room to move freely, dust kicked up from the floor, close stale air, constricted floor and walls, cramped low tunnel rendered with painterly realism and heavy underground gloom.
```

### P3.16 - `dark_stuffy_passage_11.png` (sostituisce `dark_stuffy_11.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Airless underground choke-point where no breath of moving air reaches, close black passage, stone sweating moisture, dim ember-like torchlight from far behind, oppressive breathing-labor mood, no creatures present.
```

### P3.17 - `dark_stuffy_passage_12.png` (sostituisce `dark_stuffy_12.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Tunnel where the darkness feels nearly solid and the passage ahead seems unnaturally long, receding perspective swallowed by blackness, damp rough stone, minimal light, endless oppressive underground corridor.
```

### P3.18 - `dark_stuffy_passage_13.png` (sostituisce `dark_stuffy_13.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Black tunnel with oppressive trapped heat, unpleasantly warm stale air, damp stone darkened by soot and moisture, no ventilation, low red-yellow torch influence, suffocating underground discomfort.
```

### P3.19 - `deep_dark_lake.png` (sostituisce `dark_deep_lake.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Deep dark subterranean lake under the mountains: black still water swallowing light, ancient stone edges and narrow rock margins, distant torch reflections trembling on the surface, oppressive cave darkness, secret underground depth, no boat, no figures.
```

### P3.20 - `dark_stuffy_passage_14.png` (sostituisce `dark_stuffy_14.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Stale tunnel smelling of damp rot and old wood, broken goblin timbers and scraps half-lost in shadow, black stone passage, foul moisture, weak sour light, claustrophobic low-roof composition.
```

### P3.21 - `dark_stuffy_passage_15.png` (sostituisce `dark_stuffy_15.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Extremely narrow goblin passage where the confines make every sound feel too loud, tunnel seeming to listen back, close black rock on all sides, tiny pocket of light fading behind, intense heartbeat-like tension without any character shown.
```

---

## Priorita' 4 - Fuga dai goblins e arrivo da Beorn

### P4.01 - `narrow_dangerous_path.png` (sostituisce `ravine_2.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Narrow dangerous path clinging to a sheer cliff after escaping the goblin tunnels, loose gravel underfoot, jagged rock, dizzying drop into shadow, cold wind through crags, distant roar of hidden water, urgent exposed mountain peril.
```

### P4.02 - `outside_goblins_gate.png` (sostituisce `goblins_gate.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Outside goblin's gate in the mountain face: blackened arch of iron and stone sealing a tunnel mouth, cruel spikes and old trophies, unhealthy green torches burning against raw rock, harsh moonlit or storm-broken mountain atmosphere, ugly fortress entrance without visible goblins.
```

### P4.03 - `great_river.png` (sostituisce `great_river.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Great River of the Anduin near Beorn's country: broad swift waters under open sky, lush banks and rolling hills, sunlight touching the current, strong living landscape after the mountain dark, noble river scale, no boats, no settlement.
```

### P4.04 - `mountains.png` (sostituisce `mountains.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Majestic mountain view near the eastern vales: snow-capped peaks piercing the sky, craggy passes, drifting mist in deep valleys, austere grandeur softened by alpine meadows and distant waterfalls, epic Middle-earth landscape, painterly and atmospheric.
```

### P4.05 - `forest_river.png` (sostituisce `forest_river.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Forest river flowing through dense woodland, clear water under dappled light, overhanging ancient trees, ferny banks, secluded and restorative mood, song-like natural beauty, gentle current and layered greenery, no travelers.
```

### P4.06 - `forest.png` (sostituisce `forest.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Broad healthy forest before Mirkwood's shadow, towering trees, rich green floor, sunbeams filtering through canopy, moss and pine scent implied by detail, serene but still part of a long road east, painterly woodland realism.
```

### P4.07 - `waterfall.png` (sostituisce `waterfall.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Powerful forest waterfall cascading in a thunderous rush over mossy rock, bright mist rising at the base, lush greenery around the falls, strong vertical movement, beautiful but forceful natural scene, no rainbow emphasis, painterly high-fantasy landscape.
```

### P4.08 - `running_river.png` (sostituisce `running_river.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Swift running river through wild country, lively clear current, bright moving water over stone, ferny banks and woodland edges, energetic natural rhythm, transitional landscape between mountain escape and the safer vales.
```

### P4.09 - `beorns_house.png` (sostituisce `Beorns.jpeg`)

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no characters, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. Beorn's house interior as a great welcoming wooden hall: massive timber beams, high roof, broad hearth glowing warmly, sturdy tables and chairs, honey and fresh bread atmosphere, tapestries of wild lands, animal skins used as rustic furnishing, forest light from the doorway, warmth and strength after a dangerous journey.
```

### P4.10 - `beorn_glimpse_house.png` (temporary party-glimpse)

One-shot character glimpse during `beginBeornHospitalityScene()` at `beorns_house`. Not a room image.

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. A fleeting character glimpse of Beorn inside his great wooden hall: a towering broad-shouldered man of the wild, dark hair and thick beard, stern watchful face, simple rough tunic and leather belt, standing near the long table as if briefly caught in firelight. Match the warm timber hall atmosphere — massive curved beams, stone hearth glow, bread and honey on the board, animal skins and rustic chairs — but keep Beorn as the clear foreground subject, a partial-to-medium figure glimpse rather than a full establishing room shot. Warm golden firelight, forest daylight from a doorway behind, hospitable yet powerful mood, no other people, no hobbits, no dwarves.
```



### P3.extra - `elrond_glimpse_rivendell.png` (temporary party-glimpse)

One-shot character glimpse on first `noteElrondPreparationInteraction()` while preparations are incomplete. Not a room image.

```text
Cinematic high-fantasy digital painting, painterly realism, dramatic atmospheric lighting, rich environmental detail, no text, no UI, widescreen 16:9 landscape composition, The Hobbit adventure game illustration style. Image aspect ratio must be 16:9. A fleeting character glimpse of Elrond, Lord of Rivendell, offering quiet counsel: an ageless noble elf-lord with dark hair, wise calm face, subtle silver circlet, elegant dark-blue and grey elven robes, standing or seated near warm firelight in an elven hall. Match Rivendell's Hall of Fire atmosphere — carved organic stone arches, tree-and-vine reliefs, roaring hearth, candlelight, soft rugs and carved chairs — but keep Elrond as the clear foreground subject, a partial-to-medium figure glimpse rather than a full empty room shot. Warm golden firelight, serene dignified mood, no other people, no hobbits, no dwarves, no wizards.
```

---

## Checklist post-sostituzione

1. Salva la PNG in `assets/local-images/` usando il nome della stanza, per esempio `deep_misty_valley_1.png` o `outside_goblins_gate.png`.
2. Rigenera il manifest: `node scripts/generate-image-manifest.js`
3. Verifica in gioco la stanza interessata; il motore usera' automaticamente il file piu' recente coerente con il room id.
4. Opzionale: aggiorna `"image"` in `assets/game-data.js` se vuoi eliminare ogni riferimento al vecchio JPEG.

---

## Riepilogo

| Priorita' | N. | Contenuto |
|-----------|----|-----------|
| P1 | 2 | Pre-trolls e sentieri nascosti |
| P2 | 17 | Misty Mountains, creste e vallate |
| P3 | 21 | Caverne goblin e tunnel soffocanti |
| P4 | 10 | Fuga all'aperto, arrivo da Beorn, glimpse hospitality |
