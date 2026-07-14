# Rigenerazione immagini - Bag End e arrivo dei nani

Preparare immagini per rendere piu' viva la sequenza iniziale a Bag End senza rompere la coerenza con le statiche esistenti. Per **ChatGPT Images**, il metodo consigliato e' usare **l'immagine statica esistente come riferimento allegato** e chiedere al generatore di mantenerne composizione, palette, architettura e atmosfera, aggiungendo solo le varianti narrative necessarie.

**Output:** `assets/local-images/<filename>.png`  
**Formato obbligatorio:** 16:9 (landscape).  
**Ogni prompt sotto e' completo** - copia l'intero blocco nel generatore insieme all'immagine di riferimento corretta.

## Workflow pratico in ChatGPT

Per ChatGPT conviene lavorare cosi':

1. Apri una chat nuova o un Project dedicato alle immagini di Bag End.
2. Allega **una sola immagine di riferimento principale** per volta, salvo casi particolari.
3. Incolla il prompt completo.
4. Se il risultato e' vicino ma non perfetto, continua nella stessa chat con una revisione breve invece di ripartire da zero.

Formula consigliata per le revisioni:

- "Mantieni molto piu' fedelmente la composizione dell'immagine allegata."
- "Riduci la quantita' di cambiamenti: voglio la stessa stanza, solo leggermente piu' occupata."
- "Rendi la scena meno cinematografica e piu' simile all'immagine di riferimento."
- "Mantieni la porta verde aperta."

## Principio guida

Per queste immagini non conviene ripartire da zero.

Il prompt deve esplicitamente chiedere di:

- ispirarsi all'immagine allegata
- mantenere la stessa stanza, lo stesso stile e una composizione molto vicina
- introdurre solo piccole variazioni coerenti con la fase del party
- evitare cambi di camera, cambi di mood troppo forti o scene da cutscene autonoma

Assunzione utile per la coerenza visiva:

- **la porta verde puo' essere sempre considerata aperta** nelle immagini del party e nelle transitorie collegate all'arrivo dei nani

Per le immagini dell'arrivo dei nani, ci sono anche due vincoli contenutistici:

- devono rispettare la **narrazione gia' presente nel gioco**
- devono derivare visivamente prima di tutto da **`Bilbosgarden.jpeg`** e **`hobbit_hole.jpeg`**

In pratica, questi prompt non devono produrre scene fantasy generiche di nani a Bag End, ma momenti molto specifici del flusso iniziale del gioco.

---

## Strategia consigliata

Meglio combinare:

1. **Varianti persistenti di stanza** durante la fase party, usando i JPEG statici come base visiva diretta.
2. **Poche immagini transitorie sobrie**, anch'esse costruite a partire dalla stanza di riferimento, non come scene stilisticamente separate.

Il risultato ideale deve sembrare: stessa Bag End, stesso mondo visivo, qualche minuto piu' tardi.

Per le transitorie c'e' una regola importante:

- se il giocatore e' in `hobbit_hole`, usa una transitoria basata sulla hall
- se il giocatore e' in `bilbos_garden`, usa una transitoria basata sul giardino
- se il giocatore e' in un'altra stanza di Bag End, **non** forzare una transitoria con inquadratura sbagliata; meglio affidarsi alle varianti persistenti e al testo

## Beat narrativi da rispettare

Le immagini dell'arrivo non devono essere solo coerenti con le reference visive, ma anche con il ritmo della narrazione gia' scritto in `game.js`.

Beat principali da rispettare:

1. **Primo knock / primo arrivo**
   Il tono e' quello della quiete domestica che viene incrinata.
   La scena deve suggerire l'inizio dell'interruzione, non una casa gia' piena.

2. **Primi arrivi dei nani**
   I primi nani non vanno trattati come massa indistinta.
   L'impressione deve essere: ospiti inattesi che stanno entrando a poco a poco, con segni di presenza crescente ma ancora leggibili.

3. **Arrivo di Thorin**
   Qui cambia il tono.
   La scena non deve diventare epica, ma deve far capire che questo ospite e' diverso dagli altri: piu' grave, piu' importante, piu' legato alla quest.

Riferimenti pratici alla narrazione:

- per `first_knock`, la scena deve restare vicina all'idea di quiete domestica appena interrotta
- per `thorin_at_door`, la scena deve rendere il passaggio da visita sorprendente a faccenda seria
- se un prompt non riflette questo cambio di tono, va corretto anche se l'immagine e' bella

---

## Priorita' 1 - Varianti persistenti Bag End in fase party

### P1.01 - `hobbit_hole_party.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/hobbit_hole.jpeg`

Usare come variante contestuale della stanza `hobbit_hole` durante `bagEndPartyPhase() === "arrivals"` o `bagEndPartyPhase() === "briefing"`.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. Keep the same hobbit entrance hall, the same overall composition, the same cozy painterly realism, the same warm amber light, the same curved timber framing, and the same domestic Bag End atmosphere. Keep the green round front door open. Create a subtle later-in-the-evening variation of this same room after the first unexpected dwarf arrivals. Add only believable signs of recent guests: a few dwarf cloaks and hoods on pegs, a walking stick by the open green door, one or two mugs or plates left out, slightly disturbed order, but no crowding and no major rearrangement. Preserve the intimate, tidy, warmly lit feel of the original image. This must still look like the same room and nearly the same shot. No text, no UI, 16:9 landscape.
```

### P1.02 - `bag_end_parlour_party.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/bag_end_parlour.jpeg`

Usare come variante contestuale della stanza `bag_end_parlour` durante `bagEndPartyPhase() === "arrivals"` o `bagEndPartyPhase() === "briefing"`.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. Keep the same parlour, the same frontal viewpoint, the same fireplace-centered composition, the same warm firelit palette, the same rounded hobbit architecture, and the same richly comfortable Bag End style. Create a subtle variation of this exact room during the dwarves' gathering. Add extra teacups, plates with crumbs, seed-cake or biscuits on the table, a cloak draped over a chair, a pipe or gloves left behind, and a slight sense that several guests have been using the room. Keep the room coherent, readable, and domestic rather than chaotic. Do not turn it into a new scene; it must still feel like the same image, just later and more occupied. No text, no UI, 16:9 landscape.
```

### P1.03 - `bag_end_kitchen_party.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/bag_end_kitchen.jpeg`

Usare come variante contestuale della stanza `bag_end_kitchen` durante `bagEndPartyPhase() === "arrivals"` o `bagEndPartyPhase() === "briefing"`.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. Keep the same Bag End kitchen, the same fixed viewpoint, the same warm hearthlight, the same rounded beams, shelves, worktable, pottery, and homely painterly realism. Create a believable variation of this exact room during hurried hospitality for many dwarf guests. Add extra plates and mugs, bread already cut, serving dishes on the central table, signs of active food preparation, and mild pressure on the room without making it messy or comic. Preserve the same architecture, the same comforting atmosphere, and the same visual style. This should feel like the original kitchen image with party activity layered into it, not a different kitchen. No text, no UI, 16:9 landscape.
```

---

## Priorita' 2 - Immagini transitorie sobrie e room-aware

### P2.01 - `unexpected_party_first_knock.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/hobbit_hole.jpeg`

Da mostrare una sola volta all'inizio del primo arrivo, **solo se il giocatore si trova in `hobbit_hole`**.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. This image must reflect the first interruption of Bilbo's quiet evening, not a later crowded party scene. Keep the same Bag End entrance hall, the same framing, the same warm interior style, and the same overall composition, but adapt it into a transitional story beat. The green round front door is open, and the peaceful room is being interrupted by the unmistakable first arrival of a dwarf visitor. Suggest the presence of a stocky traveler just outside or at the threshold without turning this into a dramatic action scene. Preserve the same warm painterly realism and intimate domestic tone as the reference image, while adding a quiet sense that Bilbo's evening has just changed. It must still feel like the same room and nearly the same shot. No text, no UI, 16:9 landscape.
```

### P2.02 - `unexpected_party_first_knock_garden.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/Bilbosgarden.jpeg`

Da mostrare una sola volta all'inizio del primo arrivo, **solo se il giocatore si trova in `bilbos_garden`**.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. This image must reflect the first interruption of Bilbo's quiet evening, not a later crowded party scene. Keep the same garden outside Bag End, the same viewpoint toward the round green door, the same lush foliage, the same soft storybook painterly realism, and the same intimate domestic mood. Keep the green round front door open. Adapt this exact garden image into the first-knock story beat: the peaceful garden is being interrupted by the unmistakable arrival of the first dwarf visitor. Suggest a stocky traveler approaching or just reaching the open doorway, but do not turn this into a dramatic action scene. Preserve the same composition and same visual identity of the reference image, with only a quiet narrative shift that signals the beginning of the unexpected party. No text, no UI, 16:9 landscape.
```

### P2.03 - `unexpected_party_thorin_at_door_hall.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/hobbit_hole.jpeg`

Da mostrare una sola volta quando arriva Thorin, **solo se il giocatore si trova in `hobbit_hole`**, come passaggio dal tono conviviale al tono della quest.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. This image must reflect the narrative moment when Thorin arrives and the tone shifts from convivial surprise to serious purpose. Keep the same Bag End entrance hall, the same curved framing, the same warm interior palette, and the same intimate painterly style. The green round front door is open. At the doorway stands an imposing dwarf leader in a dark travel cloak, grave, proud, and self-possessed, clearly distinct from the earlier guests. Preserve the same room and the same visual identity of the reference image, but shift the emotional tone slightly from cheerful interruption to serious purpose. Avoid epic staging, strong action, or a different camera angle. It must still feel like the same house and almost the same shot, only at a more important moment. No text, no UI, 16:9 landscape.
```

### P2.04 - `unexpected_party_thorin_at_door_garden.png`

**Immagine di riferimento da allegare in ChatGPT:** `assets/local-images/Bilbosgarden.jpeg`

Da mostrare una sola volta quando arriva Thorin, **solo se il giocatore si trova in `bilbos_garden`**, come passaggio dal tono conviviale al tono della quest.

```text
I am attaching the reference image for this room. Use it as the primary visual reference and stay very close to it. This image must reflect the narrative moment when Thorin arrives and the tone shifts from convivial surprise to serious purpose. Keep the same Bag End garden, the same viewpoint toward the round green door, the same dense greenery, the same warm-and-cool evening balance, and the same intimate painterly style. Keep the green round front door open. Near the doorway or on the garden path stands an imposing dwarf leader in a dark travel cloak, grave, proud, and self-possessed, clearly distinct from the earlier guests. Preserve the same garden and the same visual identity of the reference image, but shift the emotional tone slightly from cheerful interruption to serious purpose. Avoid epic staging, strong action, or a different camera angle. It must still feel like the same place and almost the same shot, only at a more important moment. No text, no UI, 16:9 landscape.
```

---

## Integrazione tecnica consigliata

### Varianti persistenti

Le tre immagini persistenti andrebbero agganciate in `CONTEXTUAL_ROOM_IMAGE_RULES` in `game.js`, legandole almeno alle fasi:

- `bagEndPartyPhase() === "arrivals"`
- `bagEndPartyPhase() === "briefing"`

Volendo, dopo il briefing si puo' tornare alle immagini base oppure mantenere una parte delle varianti fino alla partenza.

### Transitorie

Le due immagini evento sono adatte a `showTemporaryImage(...)`:

- `unexpected_party_first_knock.png` sul primo knock di Dwalin se il giocatore e' in `hobbit_hole`
- `unexpected_party_first_knock_garden.png` sul primo knock di Dwalin se il giocatore e' in `bilbos_garden`
- `unexpected_party_thorin_at_door_hall.png` all'arrivo di Thorin se il giocatore e' in `hobbit_hole`
- `unexpected_party_thorin_at_door_garden.png` all'arrivo di Thorin se il giocatore e' in `bilbos_garden`

Se il giocatore si trova in un'altra stanza di Bag End quando scatta l'evento, meglio non mostrare una transitoria da hall o da giardino: in quel caso conviene lasciare parlare il testo e affidarsi alle varianti persistenti delle stanze.

Dato che in questa proposta la porta verde viene considerata aperta per continuita', conviene mantenere la stessa logica visiva anche nel passaggio fra immagine evento e variante persistente della stanza.

### Regola di approvazione visiva

Un'immagine dell'arrivo dei nani e' corretta solo se soddisfa tutte queste condizioni insieme:

- sembra derivare chiaramente da `Bilbosgarden.jpeg` o `hobbit_hole.jpeg`
- rispetta il beat narrativo giusto del momento
- non sembra una scena generica di nani a Bag End
- non anticipa una casa gia' troppo affollata quando la narrazione e' ancora all'inizio
- nel caso di Thorin, rende percepibile il cambio di tono senza cambiare stile o inquadratura

---

## Checklist post-generazione

1. In ChatGPT, allega il JPEG statico corretto per ogni prompt.
2. Salva i PNG in `assets/local-images/`.
3. Rigenera il manifest: `node scripts/generate-image-manifest.js`
4. Aggiungi le varianti persistenti a `CONTEXTUAL_ROOM_IMAGE_RULES` in `game.js`.
5. Collega le transitorie ai beat narrativi con `showTemporaryImage(...)`, ma solo se la stanza attuale e' coerente con il reference usato.
6. Se l'evento scatta in un'altra stanza di Bag End, non forzare una transitoria con angolo sbagliato.
7. Verifica che il passaggio fra immagine evento e stanza esplorabile resti morbido e coerente.

---

## Riepilogo

| Priorita' | N. | Contenuto |
|-----------|----|-----------|
| P1 | 3 | Varianti persistenti Bag End durante il party |
| P2 | 4 | Immagini transitorie room-aware per hall e giardino |
