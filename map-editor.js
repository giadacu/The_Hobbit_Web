(() => {
  const DATA = expandEditorData(window.HOBBIT_DATA || {});
  const deepClone = (value) => JSON.parse(JSON.stringify(value || {}));
  const INITIAL_LAYOUT = deepClone(window.HOBBIT_MAP_LAYOUT || {});
  const state = {
    layout: deepClone(INITIAL_LAYOUT),
    backups: [],
    scope: "world",
    zoom: 1,
    directSaveHandle: null,
    exportFileHandle: null,
    backupDirectoryHandle: null,
    selectedNodeId: "",
    selectedEdgeId: "",
    selectedLaneId: "",
    lastNodeClick: null,
    drag: null,
    waypointDrag: null,
    pendingFocus: null,
  };

  const SIDE_OPTIONS = ["auto", "north", "east", "south", "west", "north east", "north west", "south east", "south west"];
  const BOX_WIDTH = 112;
  const BOX_HEIGHT = 106;
  const UNIT = 168;
  const PADDING = 120;
  const NODE_SNAP_STEP = 1 / 14;
  const BRIDGE_RADIUS = 10;
  const BRIDGE_LIFT = 8;
  const BRIDGE_BACKGROUND = "rgba(239, 227, 198, 0.98)";
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 1.75;
  const ZOOM_STEP = 0.1;
  const HANDLE_DB_NAME = "hobbit-map-editor";
  const HANDLE_STORE_NAME = "settings";
  const DIRECT_HANDLE_KEY = "direct-layout-handle";
  const EXPORT_FILE_HANDLE_KEY = "export-layout-handle";
  const BACKUP_DIR_HANDLE_KEY = "backup-directory-handle";
  const BACKUP_STORAGE_KEY = "hobbit-map-editor-backups-v1";
  const DRAFT_STORAGE_KEY = "hobbit-map-editor-layout-draft-v1";
  const ZOOM_STORAGE_KEY = "hobbit-map-editor-zoom-v1";
  const MAX_BACKUPS = 30;
  const ROOM_TO_REGION = Object.fromEntries(
    Object.entries(state.layout.regions || {}).flatMap(([regionId, region]) => (region.rooms || []).map((roomId) => [roomId, regionId]))
  );

  const scopeSelect = document.getElementById("scope-select");
  const scopeTitle = document.getElementById("scope-title");
  const scopeSubtitle = document.getElementById("scope-subtitle");
  const selectionSummary = document.getElementById("selection-summary");
  const canvas = document.getElementById("editor-canvas");
  const routeSelect = document.getElementById("connector-route");
  const sourceSideSelect = document.getElementById("connector-source-side");
  const targetSideSelect = document.getElementById("connector-target-side");
  const addWaypointButton = document.getElementById("add-waypoint");
  const clearWaypointsButton = document.getElementById("clear-waypoints");
  const connectorPanel = document.getElementById("connector-panel");
  const resetScopeButton = document.getElementById("reset-scope");
  const saveLayoutButton = document.getElementById("save-layout");
  const chooseBackupFolderButton = document.getElementById("choose-backup-folder");
  const downloadLayoutButton = document.getElementById("download-layout");
  const saveStatus = document.getElementById("save-status");
  const createBackupButton = document.getElementById("create-backup");
  const backupStatus = document.getElementById("backup-status");
  const backupList = document.getElementById("backup-list");
  const zoomOutButton = document.getElementById("zoom-out");
  const zoomResetButton = document.getElementById("zoom-reset");
  const zoomInButton = document.getElementById("zoom-in");
  const scopeBackButton = document.getElementById("scope-back");
  const nodeExitsPanel = document.getElementById("node-exits-panel");

  function expandEditorData(rawData) {
    const data = JSON.parse(JSON.stringify(rawData || {}));
    data.rooms = data.rooms || {};
    data.connections = Array.isArray(data.connections) ? data.connections : [];
    data.roomOrder = Array.isArray(data.roomOrder) ? data.roomOrder : [];

    const oppositeDirection = (direction = "") => ({
      north: "south",
      east: "west",
      south: "north",
      west: "east",
      "north east": "south west",
      "north west": "south east",
      "south east": "north west",
      "south west": "north east",
      inside: "outside",
      outside: "inside",
      up: "down",
      down: "up",
    }[String(direction || "").trim().toLowerCase()] || "");

    const ensureRoom = (id, name) => {
      if (!id) return;
      if (!data.rooms[id]) {
        data.rooms[id] = {
          id,
          name,
          description: "",
          image: null,
          transformedImage: null,
          sound: "relaxed",
        };
      } else if (!data.rooms[id].name && name) {
        data.rooms[id].name = name;
      }
      if (!data.roomOrder.includes(id)) data.roomOrder.push(id);
    };

    const ensureConnection = (from, direction, to, distance = 1) => {
      if (data.connections.some((connection) => connection.from === from && connection.direction === direction && connection.to === to)) return;
      data.connections.push({ from, direction, to, door: null, distance });
    };

    const ensureTwoWay = (a, dirA, b, dirB = oppositeDirection(dirA), distance = 1) => {
      ensureConnection(a, dirA, b, distance);
      ensureConnection(b, dirB, a, distance);
    };

    const normalizeConnections = (connections = []) => {
      const merged = new Map();
      for (const connection of connections) {
        const key = `${connection.from}|${connection.direction}`;
        const existing = merged.get(key);
        merged.set(key, {
          ...connection,
          door: existing?.door || connection.door || null,
        });
      }
      return [...merged.values()];
    };

    [
      ["bag_end_parlour", "Parlour"],
      ["bag_end_study", "Study"],
      ["bag_end_dining_room", "Dining Room"],
      ["bag_end_pantry", "Pantry"],
      ["bag_end_kitchen", "Kitchen"],
      ["bag_end_guest_room", "Guest Room"],
      ["bag_end_cellar_room", "Cellar"],
      ["lane_beneath_hill", "Lane Beneath the Hill"],
      ["party_field", "Party Field"],
      ["bywater_bridge", "Bywater Bridge"],
      ["trollshaws_road", "Trollshaws Road"],
      ["hidden_valley_path", "Hidden Valley Path"],
      ["rivendell_courtyard", "Courtyard"],
      ["rivendell_library", "Library"],
      ["rivendell_hall_of_fire", "Hall of Fire"],
      ["rivendell_guest_chambers", "Guest Chambers"],
      ["rivendell_terrace", "Terrace"],
      ["rivendell_bridge", "Bridge"],
      ["narrow_ledge", "Narrow Ledge"],
      ["mountain_lookout", "Mountain Lookout"],
      ["storm_shelter", "Storm Shelter"],
      ["beorn_great_hall", "Great Hall"],
      ["beorn_stable", "Stable"],
      ["beorn_garden", "Garden"],
      ["beorn_animal_yard", "Animal Yard"],
      ["mirkwood_forest_path", "Forest Path"],
      ["mirkwood_spider_grove", "Spider Grove"],
      ["mirkwood_dark_glade", "Dark Glade"],
      ["mirkwood_enchanted_stream", "Enchanted Stream"],
      ["mirkwood_deer_trail", "Deer Trail"],
      ["mirkwood_fallen_tree_crossing", "Fallen Tree Crossing"],
      ["mirkwood_ruined_clearing", "Ruined Clearing"],
      ["elven_prison_cells", "Prison Cells"],
      ["elven_guard_post", "Guard Post"],
      ["elven_feast_hall", "Feast Hall"],
      ["elven_underground_river", "Underground River"],
      ["elven_storage_rooms", "Storage Rooms"],
      ["laketown_docks", "Docks"],
      ["laketown_marketplace", "Marketplace"],
      ["laketown_town_square", "Town Square"],
      ["laketown_warehouses", "Warehouses"],
      ["laketown_bridges", "Bridges"],
      ["laketown_tavern", "Tavern"],
      ["erebor_hidden_door", "Western Wall"],
      ["erebor_watch_chamber", "Watch Chamber"],
      ["erebor_upper_tunnels", "Upper Tunnels"],
      ["erebor_ancient_armoury", "Ancient Armoury"],
      ["erebor_abandoned_workshop", "Abandoned Workshop"],
      ["erebor_great_hall", "Great Hall"],
      ["erebor_treasure_approach", "Treasure Approach"],
    ].forEach(([id, name]) => ensureRoom(id, name));

    data.connections = data.connections.filter((connection) => !(
      (connection.from === "trolls_clearing" && connection.to === "rivendell")
      || (connection.from === "rivendell" && connection.to === "trolls_clearing")
      || (connection.from === "front_gate" && connection.to === "lower_halls")
      || (connection.from === "lower_halls" && connection.to === "front_gate")
      || (connection.from === "beorns_house" && ["gate_to_mirkwood", "forest_road"].includes(connection.to))
      || (connection.to === "beorns_house" && ["gate_to_mirkwood", "forest_road"].includes(connection.from))
      || (connection.from === "great_river" && connection.to === "misty_mountain")
      || (connection.from === "misty_mountain" && connection.to === "great_river")
    ));

    [
      ["hobbit_hole", "east", "bilbos_garden", "west"],
      ["bilbos_garden", "east", "lane_beneath_hill", "west"],
      ["lane_beneath_hill", "east", "party_field", "west"],
      ["party_field", "east", "bywater_bridge", "west"],
      ["bywater_bridge", "east", "green_dragon_inn_outside", "west"],
      ["green_dragon_inn_outside", "inside", "green_dragon_inn", "outside"],
      ["trolls_clearing", "south east", "trollshaws_road", "north west", 2],
      ["trollshaws_road", "east", "hidden_valley_path", "west", 1],
      ["hidden_valley_path", "east", "rivendell", "west", 1],
      ["hobbit_hole", "west", "bag_end_parlour"],
      ["hobbit_hole", "south", "bag_end_dining_room"],
      ["hobbit_hole", "north east", "bag_end_study", "south west"],
      ["bag_end_dining_room", "east", "bag_end_pantry"],
      ["bag_end_pantry", "east", "bag_end_kitchen"],
      ["bag_end_parlour", "south", "bag_end_guest_room"],
      ["bag_end_dining_room", "down", "bag_end_cellar_room", "up"],
      ["rivendell", "north", "rivendell_courtyard"],
      ["rivendell", "north east", "rivendell_library", "south west", 1],
      ["rivendell", "south", "rivendell_hall_of_fire", "north"],
      ["rivendell", "north west", "rivendell_guest_chambers", "south east"],
      ["rivendell_courtyard", "east", "rivendell_terrace", "west"],
      ["rivendell_terrace", "north", "rivendell_bridge", "south"],
      ["misty_mountain", "north west", "narrow_ledge", "south east"],
      ["narrow_ledge", "up", "mountain_lookout", "down"],
      ["narrow_ledge", "west", "storm_shelter", "east"],
      ["beorns_house", "east", "beorn_great_hall", "west"],
      ["beorn_great_hall", "south", "beorn_stable", "north"],
      ["beorn_great_hall", "north", "beorn_garden", "south"],
      ["beorn_garden", "east", "beorn_animal_yard", "west"],
      ["forest_road", "south east", "mirkwood_forest_path", "north west"],
      ["mirkwood_forest_path", "east", "mirkwood_dark_glade", "west"],
      ["mirkwood_dark_glade", "north", "mirkwood_deer_trail", "south"],
      ["mirkwood_dark_glade", "east", "mirkwood_enchanted_stream", "west"],
      ["mirkwood_enchanted_stream", "north", "mirkwood_fallen_tree_crossing", "south"],
      ["mirkwood_fallen_tree_crossing", "east", "mirkwood_spider_grove", "west"],
      ["mirkwood_spider_grove", "north", "mirkwood_ruined_clearing", "south"],
      ["mirkwood_ruined_clearing", "east", "place_of_black_spiders", "west"],
      ["elvenkings_halls", "north", "elven_guard_post", "south"],
      ["elvenkings_halls", "north east", "elven_feast_hall", "south west"],
      ["dark_dungeon", "north", "elven_prison_cells", "south"],
      ["cellar", "east", "elven_storage_rooms", "west"],
      ["cellar", "south east", "elven_underground_river", "north west"],
      ["wooden_town", "north east", "laketown_marketplace", "south west"],
      ["wooden_town", "south east", "laketown_docks", "north west"],
      ["wooden_town", "north west", "laketown_town_square", "south east"],
      ["wooden_town", "south west", "laketown_bridges", "north east"],
      ["laketown_marketplace", "south", "laketown_warehouses", "north"],
      ["laketown_bridges", "south", "laketown_tavern", "north"],
      ["beorns_house", "north", "great_river", "south"],
      ["great_river", "east", "gate_to_mirkwood", "west"],
      ["gate_to_mirkwood", "south", "forest_road", "north"],
      ["front_gate", "north east", "erebor_hidden_door", "south west"],
      ["erebor_hidden_door", "east", "erebor_watch_chamber", "west"],
      ["erebor_watch_chamber", "east", "erebor_upper_tunnels", "west"],
      ["erebor_upper_tunnels", "south", "erebor_ancient_armoury", "north"],
      ["erebor_upper_tunnels", "east", "erebor_abandoned_workshop", "west"],
      ["erebor_abandoned_workshop", "north", "erebor_great_hall", "south"],
      ["erebor_great_hall", "east", "erebor_treasure_approach", "west"],
      ["erebor_treasure_approach", "east", "lower_halls", "west"],
    ].forEach(([from, direction, to, reverseDirection, distance]) => ensureTwoWay(from, direction, to, reverseDirection, distance));

    data.connections = normalizeConnections(data.connections);
    return data;
  }

  for (const select of [sourceSideSelect, targetSideSelect]) {
    select.innerHTML = SIDE_OPTIONS.map((value) => `<option value="${value}">${value}</option>`).join("");
  }

  function clonePointMap(points = {}) {
    return Object.fromEntries(Object.entries(points).map(([key, value]) => [key, { x: Number(value.x) || 0, y: Number(value.y) || 0 }]));
  }

  function defaultConnectorStyle() {
    return {
      route: "auto",
      sourceSide: "auto",
      targetSide: "auto",
      waypoints: [],
    };
  }

  function cloneConnectorStyle(style = {}) {
    return {
      route: style.route === "straight" ? "straight" : "auto",
      sourceSide: style.sourceSide || "auto",
      targetSide: style.targetSide || "auto",
      waypoints: Array.isArray(style.waypoints) ? style.waypoints.map((point) => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })) : [],
    };
  }

  function cloneConnectorMap(connectors = {}) {
    return Object.fromEntries(
      Object.entries(connectors).map(([edgeId, connector]) => [edgeId, {
        ...cloneConnectorStyle(connector),
        lanes: Object.fromEntries(
          Object.entries(connector?.lanes || {}).map(([laneId, laneStyle]) => [laneId, cloneConnectorStyle(laneStyle)])
        ),
      }])
    );
  }

  function roomName(roomId = "") {
    return state.layout.labelOverrides?.[roomId] || DATA.rooms?.[roomId]?.name || roomId;
  }

  function worldNodePositions() {
    return clonePointMap(state.layout.world?.nodes || {});
  }

  function regionNodePositions(scope = "") {
    return Object.fromEntries(
      Object.entries(clonePointMap(state.layout.regions?.[scope]?.nodes || {})).map(([roomId, point]) => [`room:${roomId}`, point])
    );
  }

  function worldConnectors() {
    return cloneConnectorMap(state.layout.world?.connectors || {});
  }

  function regionConnectors(scope = "") {
    return cloneConnectorMap(state.layout.regions?.[scope]?.connectors || {});
  }

  function buildEdges(rooms, mapRoom) {
    const visible = new Set(rooms);
    const edges = [];
    const edgeMap = new Map();
    const seenLinks = new Set();
    for (const connection of DATA.connections || []) {
      if (!visible.has(connection.from) || !visible.has(connection.to)) continue;
      const fromId = mapRoom(connection.from);
      const toId = mapRoom(connection.to);
      if (!fromId || !toId || fromId === toId) continue;
      const direction = normalizeDirection(connection.direction);
      const linkKey = `${fromId}|${direction}|${toId}`;
      if (seenLinks.has(linkKey)) continue;
      seenLinks.add(linkKey);
      const left = fromId < toId ? fromId : toId;
      const right = left === fromId ? toId : fromId;
      const key = `${left}|${right}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { id: key, from: left, to: right, links: [] });
        edges.push(edgeMap.get(key));
      }
      edgeMap.get(key).links.push({
        from: fromId,
        to: toId,
        direction,
      });
    }
    return edges;
  }

  function addPortalEdges(edges, nodes) {
    for (const node of nodes) {
      if (!node.portalHostRoomId) continue;
      const hostNodeId = `room:${node.portalHostRoomId}`;
      if (!nodes.some((candidate) => candidate.id === hostNodeId)) continue;
      const left = hostNodeId < node.id ? hostNodeId : node.id;
      const right = left === hostNodeId ? node.id : hostNodeId;
      edges.push({
        id: `${left}|${right}`,
        from: left,
        to: right,
        links: [
          { from: hostNodeId, to: node.id, direction: "down" },
          { from: node.id, to: hostNodeId, direction: "up" },
        ],
      });
    }
  }

  function buildModel(scope = "world") {
    const roomOrder = new Map((DATA.roomOrder || Object.keys(DATA.rooms || {})).map((roomId, index) => [roomId, index]));
    if (scope === "world") {
      const rooms = (DATA.roomOrder || Object.keys(DATA.rooms || {})).filter((roomId) => DATA.rooms?.[roomId] && roomId !== "flags");
      const nodes = [];
      const nodeMap = new Map();
      for (const roomId of rooms) {
        const regionId = ROOM_TO_REGION[roomId];
        const region = state.layout.regions?.[regionId];
        if (region?.parentScope) continue;
        if (regionId && (state.layout.inlineRegionsInWorld || []).includes(regionId)) {
          const id = `room:${roomId}`;
          if (nodeMap.has(id)) continue;
          nodeMap.set(id, true);
          nodes.push({ id, roomId, label: roomName(roomId), kind: "room" });
          continue;
        }
        if (regionId && state.layout.inlineRegionHosts?.[regionId]) {
          const id = `region:${regionId}`;
          if (nodeMap.has(id)) continue;
          nodeMap.set(id, true);
          nodes.push({ id, label: region.label, kind: "region", openRegion: regionId, portalHostRoomId: state.layout.inlineRegionHosts[regionId] });
          continue;
        }
        const id = regionId ? `region:${regionId}` : `room:${roomId}`;
        if (nodeMap.has(id)) continue;
        nodeMap.set(id, true);
        nodes.push(regionId
          ? { id, label: region?.label || roomName(roomId), kind: "region", openRegion: (state.layout.drilldownDisabled || []).includes(regionId) ? "" : regionId }
          : { id, roomId, label: roomName(roomId), kind: "room" });
      }
      const edges = buildEdges(rooms, (roomId) => {
        const regionId = ROOM_TO_REGION[roomId];
        const region = state.layout.regions?.[regionId];
        if (region?.parentScope) return "";
        if (regionId && (state.layout.inlineRegionsInWorld || []).includes(regionId)) return `room:${roomId}`;
        if (regionId && state.layout.inlineRegionHosts?.[regionId]) return "";
        return regionId ? `region:${regionId}` : `room:${roomId}`;
      });
      addPortalEdges(edges, nodes);
      return {
        title: "Mondo",
        nodes,
        edges,
        positions: worldNodePositions(),
        connectors: worldConnectors(),
      };
    }

    const region = state.layout.regions?.[scope];
    const childRegions = Object.entries(state.layout.regions || {}).filter(([_id, candidate]) => candidate.parentScope === scope);
    const previewRooms = new Set(region.previewRooms || []);
    const childRoomIds = new Set(childRegions.flatMap(([_id, child]) => child.rooms || []));
    const rooms = (region.rooms || [])
      .filter((roomId) => !childRoomIds.has(roomId) || previewRooms.has(roomId))
      .sort((a, b) => (roomOrder.get(a) || 0) - (roomOrder.get(b) || 0));
    const nodes = rooms.map((roomId) => ({ id: `room:${roomId}`, roomId, label: roomName(roomId), kind: "room" }));
    const nodeMap = new Map(nodes.map((node) => [node.roomId, node]));
    for (const [childRegionId, childRegion] of childRegions) {
      const hostNode = nodeMap.get(childRegion.hostRoomId || "");
      if (hostNode) hostNode.inlinePortal = childRegionId;
    }
    return {
      title: region.label,
      nodes,
      edges: buildEdges(rooms, (roomId) => `room:${roomId}`),
      positions: regionNodePositions(scope),
      connectors: regionConnectors(scope),
    };
  }

  function nodeOpenScope(node) {
    if (!node) return "";
    return node.openRegion || node.inlinePortal || "";
  }

  function parentScope(scope = state.scope) {
    if (!scope || scope === "world") return "world";
    return state.layout.regions?.[scope]?.parentScope || "world";
  }

  function updateScopeNavigationUi() {
    if (scopeSelect && scopeSelect.value !== state.scope) {
      scopeSelect.value = state.scope;
    }
    if (scopeBackButton) {
      const canGoBack = state.scope !== "world";
      scopeBackButton.disabled = !canGoBack;
      scopeBackButton.textContent = canGoBack ? `Back a ${backupScopeLabel(parentScope(state.scope))}` : "Back";
      scopeBackButton.title = canGoBack ? `Torna a ${backupScopeLabel(parentScope(state.scope))}` : "Sei gia al livello Mondo";
    }
  }

  function normalizeDirection(direction = "") {
    return String(direction || "").trim().toLowerCase().replace(/_/g, " ");
  }

  function laneStorageKey(lane = {}) {
    const mode = lane.twoWay ? "tw" : "ow";
    return `${mode}:${lane.startNodeId || ""}>${lane.endNodeId || ""}:${normalizeDirection(lane.sourceDirection)}:${normalizeDirection(lane.targetDirection)}`;
  }

  function directionSide(direction = "") {
    const normalized = normalizeDirection(direction);
    return SIDE_OPTIONS.includes(normalized) && normalized !== "auto" ? normalized : "";
  }

  function directionVector(direction = "") {
    return {
      north: { x: 0, y: -1 },
      east: { x: 1, y: 0 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 },
      "north east": { x: 1, y: -1 },
      "north west": { x: -1, y: -1 },
      "south east": { x: 1, y: 1 },
      "south west": { x: -1, y: 1 },
    }[directionSide(direction)] || { x: 0, y: 0 };
  }

  function directionBadge(direction = "") {
    const normalized = normalizeDirection(direction);
    return {
      north: "n",
      east: "e",
      south: "s",
      west: "w",
      "north east": "ne",
      "north west": "nw",
      "south east": "se",
      "south west": "sw",
      up: "u",
      down: "d",
    }[normalized] || "";
  }

  function directionSortIndex(direction = "") {
    return {
      north: 0,
      "north east": 1,
      east: 2,
      "south east": 3,
      south: 4,
      "south west": 5,
      west: 6,
      "north west": 7,
      up: 8,
      down: 9,
      inside: 10,
      outside: 11,
    }[normalizeDirection(direction)] ?? 99;
  }

  function snapNodeCoordinate(value, snapEnabled = true) {
    if (!snapEnabled) return value;
    return Math.round((value / NODE_SNAP_STEP)) * NODE_SNAP_STEP;
  }

  function exitBadgeSide(direction = "") {
    const normalized = normalizeDirection(direction);
    if (normalized === "up") return "north";
    if (normalized === "down") return "south";
    return directionSide(normalized);
  }

  function oppositeDirection(direction = "") {
    return {
      north: "south",
      east: "west",
      south: "north",
      west: "east",
      "north east": "south west",
      "north west": "south east",
      "south east": "north west",
      "south west": "north east",
    }[directionSide(direction)] || "";
  }

  function directionAlignmentScore(direction = "", fromPoint = null, toPoint = null) {
    if (!fromPoint || !toPoint) return Number.NEGATIVE_INFINITY;
    const vector = directionVector(direction);
    const vectorMagnitude = Math.hypot(vector.x, vector.y);
    if (!vectorMagnitude) return Number.NEGATIVE_INFINITY;
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return Number.NEGATIVE_INFINITY;
    return ((dx * vector.x) + (dy * vector.y)) / (distance * vectorMagnitude);
  }

  function reversePairScore(forwardLink, reverseLink, centers) {
    const forwardScore = directionAlignmentScore(forwardLink.direction, centers[forwardLink.from], centers[forwardLink.to]);
    const reverseScore = directionAlignmentScore(reverseLink.direction, centers[reverseLink.from], centers[reverseLink.to]);
    if (!Number.isFinite(forwardScore) || !Number.isFinite(reverseScore)) return Number.NEGATIVE_INFINITY;
    const exactOppositeBonus = oppositeDirection(forwardLink.direction) === directionSide(reverseLink.direction) ? 0.2 : 0;
    return forwardScore + reverseScore + exactOppositeBonus;
  }

  function renderDirectionTowardsTarget(direction = "", fromPoint = null, toPoint = null) {
    const normalized = directionSide(direction);
    if (!normalized) return "";
    const opposite = oppositeDirection(normalized);
    if (!opposite) return normalized;
    const forwardScore = directionAlignmentScore(normalized, fromPoint, toPoint);
    const oppositeScore = directionAlignmentScore(opposite, fromPoint, toPoint);
    return oppositeScore > forwardScore ? opposite : normalized;
  }

  function buildDisplayLanes(edge, centers) {
    const links = edge.links || [];
    const lanes = [];
    const used = new Set();
    const forwardEntries = [];
    const reverseEntries = [];
    links.forEach((link, index) => {
      if (link.from === edge.from && link.to === edge.to) {
        forwardEntries.push({ link, index });
        return;
      }
      if (link.from === edge.to && link.to === edge.from) {
        reverseEntries.push({ link, index });
      }
    });
    for (const forwardEntry of forwardEntries) {
      if (used.has(forwardEntry.index)) continue;
      const exactReverseIndex = reverseEntries.findIndex((reverseEntry) => (
        !used.has(reverseEntry.index)
        && directionSide(reverseEntry.link.direction) === oppositeDirection(forwardEntry.link.direction)
      ));
      if (exactReverseIndex < 0) continue;
      const reverseEntry = reverseEntries[exactReverseIndex];
      lanes.push({
        twoWay: true,
        startNodeId: edge.from,
        endNodeId: edge.to,
        sourceDirection: normalizeDirection(forwardEntry.link.direction),
        targetDirection: normalizeDirection(reverseEntry.link.direction),
      });
      used.add(forwardEntry.index);
      used.add(reverseEntry.index);
    }
    while (forwardEntries.length && reverseEntries.length) {
      let best = null;
      for (const forwardEntry of forwardEntries) {
        if (used.has(forwardEntry.index)) continue;
        for (const reverseEntry of reverseEntries) {
          if (used.has(reverseEntry.index)) continue;
          const score = reversePairScore(forwardEntry.link, reverseEntry.link, centers);
          if (!best || score > best.score) {
            best = { forwardEntry, reverseEntry, score };
          }
        }
      }
      if (!best || best.score < 0.25) break;
      lanes.push({
        twoWay: true,
        startNodeId: edge.from,
        endNodeId: edge.to,
        sourceDirection: normalizeDirection(best.forwardEntry.link.direction),
        targetDirection: normalizeDirection(best.reverseEntry.link.direction),
      });
      used.add(best.forwardEntry.index);
      used.add(best.reverseEntry.index);
    }
    for (let index = 0; index < links.length; index += 1) {
      if (used.has(index)) continue;
      const link = links[index];
      lanes.push({
        twoWay: false,
        startNodeId: link.from,
        endNodeId: link.to,
        sourceDirection: normalizeDirection(link.direction),
        targetDirection: oppositeDirection(link.direction),
      });
      used.add(index);
    }
    return lanes.map((lane) => ({
      ...lane,
      id: laneStorageKey(lane),
    }));
  }

  function inferSide(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
    return dy >= 0 ? "south" : "north";
  }

  function levelSidePoint(center, side = "south", target = null) {
    const halfHeight = BOX_HEIGHT / 2;
    const quarterOffset = BOX_WIDTH * 0.25;
    const dx = (target?.x || center.x) - center.x;
    const horizontalOffset = dx > 0 ? quarterOffset : -quarterOffset;
    if (side === "north") return { x: center.x + horizontalOffset, y: center.y - halfHeight };
    if (side === "south") return { x: center.x + horizontalOffset, y: center.y + halfHeight };
    return center;
  }

  function anchor(center, side = "auto") {
    const halfWidth = BOX_WIDTH / 2;
    const halfHeight = BOX_HEIGHT / 2;
    return {
      north: { x: center.x, y: center.y - halfHeight },
      east: { x: center.x + halfWidth, y: center.y },
      south: { x: center.x, y: center.y + halfHeight },
      west: { x: center.x - halfWidth, y: center.y },
      "north east": { x: center.x + halfWidth - 6, y: center.y - halfHeight + 6 },
      "north west": { x: center.x - halfWidth + 6, y: center.y - halfHeight + 6 },
      "south east": { x: center.x + halfWidth - 6, y: center.y + halfHeight - 6 },
      "south west": { x: center.x - halfWidth + 6, y: center.y + halfHeight - 6 },
    }[side] || center;
  }

  function buildDirectionalLead(point, side = "") {
    const vector = directionVector(side);
    if (!vector.x && !vector.y) return null;
    const magnitude = Math.hypot(vector.x, vector.y) || 1;
    const lead = ["north east", "north west", "south east", "south west"].includes(side) ? 22 : 18;
    return {
      x: point.x + ((vector.x / magnitude) * lead),
      y: point.y + ((vector.y / magnitude) * lead),
    };
  }

  function compactPoints(points = []) {
    const compact = [];
    for (const point of points) {
      if (!point) continue;
      const rounded = {
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
      };
      const previous = compact[compact.length - 1];
      if (previous && Math.abs(previous.x - rounded.x) < 0.1 && Math.abs(previous.y - rounded.y) < 0.1) continue;
      compact.push(rounded);
    }
    return compact;
  }

  function snapAlignedConnectorSides(startCenter, endCenter, sourceSide, targetSide, options = {}) {
    const threshold = options.threshold ?? 18;
    const sourceLocked = Boolean(options.sourceLocked);
    const targetLocked = Boolean(options.targetLocked);
    const dx = endCenter.x - startCenter.x;
    const dy = endCenter.y - startCenter.y;
    let nextSource = sourceSide;
    let nextTarget = targetSide;
    if (Math.abs(dx) <= threshold) {
      if (!sourceLocked) nextSource = dy >= 0 ? "south" : "north";
      if (!targetLocked) nextTarget = dy >= 0 ? "north" : "south";
    } else if (Math.abs(dy) <= threshold) {
      if (!sourceLocked) nextSource = dx >= 0 ? "east" : "west";
      if (!targetLocked) nextTarget = dx >= 0 ? "west" : "east";
    }
    return {
      sourceSide: nextSource,
      targetSide: nextTarget,
    };
  }

  function connectorGeometry(edge, centers, style, lane) {
    const startCenter = centers[lane.startNodeId];
    const endCenter = centers[lane.endNodeId];
    if (!startCenter || !endCenter) return null;
    const sourceOverride = lane.startNodeId === edge.from ? style.sourceSide : style.targetSide;
    const targetOverride = lane.endNodeId === edge.to ? style.targetSide : style.sourceSide;
    const sourceDirection = normalizeDirection(renderDirectionTowardsTarget(lane.sourceDirection, startCenter, endCenter) || lane.sourceDirection);
    const targetDirection = normalizeDirection(renderDirectionTowardsTarget(lane.targetDirection, endCenter, startCenter) || lane.targetDirection);
    const sourceSide = sourceOverride && sourceOverride !== "auto" ? sourceOverride : (directionSide(sourceDirection) || inferSide(startCenter, endCenter));
    const targetSide = targetOverride && targetOverride !== "auto" ? targetOverride : (directionSide(targetDirection) || inferSide(endCenter, startCenter));
    const snappedSides = snapAlignedConnectorSides(startCenter, endCenter, sourceSide, targetSide, {
      sourceLocked: sourceOverride && sourceOverride !== "auto",
      targetLocked: targetOverride && targetOverride !== "auto",
    });
    const sourceIsLevel = ["up", "down"].includes(sourceDirection);
    const targetIsLevel = ["up", "down"].includes(targetDirection);
    const start = sourceIsLevel
      ? levelSidePoint(startCenter, snappedSides.sourceSide, endCenter)
      : anchor(startCenter, snappedSides.sourceSide);
    const end = targetIsLevel
      ? levelSidePoint(endCenter, snappedSides.targetSide, startCenter)
      : anchor(endCenter, snappedSides.targetSide);
    if (style.route === "straight") {
      return {
        points: [start, end],
        start,
        end,
        startCenter,
        endCenter,
        sourceSide: snappedSides.sourceSide,
        targetSide: snappedSides.targetSide,
        sourceDirection,
        targetDirection,
        twoWay: lane.twoWay,
        startNodeId: lane.startNodeId,
        endNodeId: lane.endNodeId,
      };
    }
    if (style.waypoints?.length) {
      return {
        points: compactPoints([start, ...style.waypoints, end]),
        start,
        end,
        startCenter,
        endCenter,
        sourceSide: snappedSides.sourceSide,
        targetSide: snappedSides.targetSide,
        sourceDirection,
        targetDirection,
        twoWay: lane.twoWay,
        startNodeId: lane.startNodeId,
        endNodeId: lane.endNodeId,
      };
    }
    if (["up", "down"].includes(sourceDirection) || ["up", "down"].includes(targetDirection)) {
      return {
        points: [start, end],
        start,
        end,
        startCenter,
        endCenter,
        sourceSide: snappedSides.sourceSide,
        targetSide: snappedSides.targetSide,
        sourceDirection,
        targetDirection,
        twoWay: lane.twoWay,
        startNodeId: lane.startNodeId,
        endNodeId: lane.endNodeId,
      };
    }
    const sourceLead = buildDirectionalLead(start, snappedSides.sourceSide);
    const targetLead = buildDirectionalLead(end, snappedSides.targetSide);
    const routeStart = sourceLead || start;
    const routeEnd = targetLead || end;
    const horizontalFirst = ["east", "west"].includes(snappedSides.sourceSide)
      || (["north east", "south east", "north west", "south west"].includes(snappedSides.sourceSide)
        ? Math.abs(routeEnd.x - routeStart.x) >= Math.abs(routeEnd.y - routeStart.y)
        : Math.abs(routeEnd.x - routeStart.x) >= Math.abs(routeEnd.y - routeStart.y));
    const middle = horizontalFirst
      ? { x: routeEnd.x, y: routeStart.y }
      : { x: routeStart.x, y: routeEnd.y };
    return {
      points: compactPoints([start, sourceLead, middle, targetLead, end]),
      start,
      end,
      startCenter,
      endCenter,
      sourceSide: snappedSides.sourceSide,
      targetSide: snappedSides.targetSide,
      sourceDirection,
      targetDirection,
      twoWay: lane.twoWay,
      startNodeId: lane.startNodeId,
      endNodeId: lane.endNodeId,
    };
  }

  function arrowMarkup(points = [], color = "#87683c") {
    if (!Array.isArray(points) || points.length < 2) return "";
    const end = points[points.length - 1];
    let previous = null;
    for (let index = points.length - 2; index >= 0; index -= 1) {
      const candidate = points[index];
      if (Math.abs(candidate.x - end.x) >= 0.1 || Math.abs(candidate.y - end.y) >= 0.1) {
        previous = candidate;
        break;
      }
    }
    if (!previous) return "";
    const dx = end.x - previous.x;
    const dy = end.y - previous.y;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude < 0.1) return "";
    const unitX = dx / magnitude;
    const unitY = dy / magnitude;
    const arrowLength = 14;
    const arrowWidth = 6.5;
    const tipX = end.x;
    const tipY = end.y;
    const baseX = tipX - (unitX * arrowLength);
    const baseY = tipY - (unitY * arrowLength);
    const perpX = -unitY;
    const perpY = unitX;
    const leftX = baseX + (perpX * arrowWidth);
    const leftY = baseY + (perpY * arrowWidth);
    const rightX = baseX - (perpX * arrowWidth);
    const rightY = baseY - (perpY * arrowWidth);
    return `<polygon points="${leftX.toFixed(1)},${leftY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${rightX.toFixed(1)},${rightY.toFixed(1)}" fill="${color}" stroke="${color}" stroke-width="1.2" stroke-linejoin="round"></polygon>`;
  }

  function exitBadgePlacement(center, direction, index = 0, total = 1) {
    const side = exitBadgeSide(direction);
    const label = directionBadge(direction);
    if (!side || !label) return null;
    const anchorPoint = anchor(center, side);
    const vector = directionVector(side);
    const magnitude = Math.hypot(vector.x, vector.y) || 1;
    const offset = 20;
    const normalX = -vector.y / magnitude;
    const normalY = vector.x / magnitude;
    const spread = total > 1 ? (index - ((total - 1) / 2)) * 16 : 0;
    const x = anchorPoint.x + ((vector.x / magnitude) * offset) + (normalX * spread);
    const y = anchorPoint.y + ((vector.y / magnitude) * offset) + (normalY * spread);
    return {
      side,
      label,
      badgePoint: { x, y },
    };
  }

  function exitBadgeMarkup(placement) {
    if (!placement) return "";
    return `<g class="editor-exit-badge" transform="translate(${placement.badgePoint.x.toFixed(1)} ${placement.badgePoint.y.toFixed(1)})">
      <rect x="-11" y="-8.5" width="22" height="17" rx="7"></rect>
      <text x="0" y="3.3" text-anchor="middle">${placement.label}</text>
    </g>`;
  }

  function geometryBadgePlacement(geometry, direction, index = 0, total = 1) {
    if (!geometry?.points?.length) return null;
    const startPoint = geometry.start || geometry.points[0];
    const nextPoint = geometry.points.find((point) => (
      point
      && startPoint
      && (Math.abs(point.x - startPoint.x) >= 0.1 || Math.abs(point.y - startPoint.y) >= 0.1)
    )) || geometry.end || startPoint;
    const segmentDx = (nextPoint?.x || 0) - (startPoint?.x || 0);
    const segmentDy = (nextPoint?.y || 0) - (startPoint?.y || 0);
    const segmentMagnitude = Math.hypot(segmentDx, segmentDy) || 1;
    const alongX = segmentDx / segmentMagnitude;
    const alongY = segmentDy / segmentMagnitude;
    const distanceFromNode = Math.min(22, Math.max(16, segmentMagnitude * 0.22));
    const baseX = (startPoint?.x || 0) + (alongX * distanceFromNode);
    const baseY = (startPoint?.y || 0) + (alongY * distanceFromNode);
    const side = exitBadgeSide(direction);
    const vector = directionVector(side);
    const magnitude = Math.hypot(vector.x, vector.y) || 1;
    const normalX = -vector.y / magnitude;
    const normalY = vector.x / magnitude;
    const spread = total > 1 ? (index - ((total - 1) / 2)) * 16 : 0;
    return {
      side,
      label: directionBadge(direction),
      badgePoint: {
        x: baseX + (normalX * spread),
        y: baseY + (normalY * spread),
      },
    };
  }

  function reverseLaneView(lane) {
    if (!lane) return null;
    return {
      ...lane,
      startNodeId: lane.endNodeId,
      endNodeId: lane.startNodeId,
      sourceDirection: lane.targetDirection,
      targetDirection: lane.sourceDirection,
    };
  }

  function geometryForExitLink(edge, centers, lanes, link) {
    const direction = normalizeDirection(link.direction);
    if (!direction) return null;
    const directLane = lanes.find((candidate) => (
      candidate.startNodeId === link.from
      && candidate.endNodeId === link.to
      && normalizeDirection(candidate.sourceDirection) === direction
    ));
    if (directLane) {
      const directStyle = connectorStyleForLane(edge.id, directLane.id);
      return connectorGeometry(edge, centers, directStyle, directLane);
    }
    const reverseLane = lanes.find((candidate) => (
      candidate.twoWay
      && candidate.startNodeId === link.to
      && candidate.endNodeId === link.from
      && normalizeDirection(candidate.targetDirection) === direction
    ));
    if (!reverseLane) return null;
    const reverseStyle = connectorStyleForLane(edge.id, reverseLane.id);
    return connectorGeometry(edge, centers, reverseStyle, reverseLaneView(reverseLane));
  }

  function selectedNodeExitDecorations(edge, centers) {
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId || (selectedNodeId !== edge.from && selectedNodeId !== edge.to)) return "";
    const nodeCenter = centers[selectedNodeId];
    if (!nodeCenter) return "";
    const exits = [];
    const seen = new Set();
    const lanes = buildDisplayLanes(edge, centers);
    for (const link of edge.links || []) {
      if (link.from !== selectedNodeId) continue;
      const direction = normalizeDirection(link.direction);
      if (!direction) continue;
      const key = `${direction}|${link.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const geometry = geometryForExitLink(edge, centers, lanes, link);
      exits.push({ direction, geometry });
    }
    if (!exits.length) return "";
    return exits.map((entry, index) => {
      const placement = ["up", "down"].includes(entry.direction)
        ? geometryBadgePlacement(entry.geometry, entry.direction, index, exits.length)
        : exitBadgePlacement(nodeCenter, entry.direction, index, exits.length);
      return exitBadgeMarkup(placement);
    }).join("");
  }

  function selectedNodeDestinations(model) {
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId) return [];
    const nodeMap = new Map((model.nodes || []).map((node) => [node.id, node]));
    const seen = new Set();
    const exits = [];
    for (const edge of model.edges || []) {
      for (const link of edge.links || []) {
        if (link.from !== selectedNodeId) continue;
        const direction = normalizeDirection(link.direction);
        const destination = nodeMap.get(link.to);
        if (!direction || !destination) continue;
        const key = `${direction}|${link.to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        exits.push({
          direction,
          destinationLabel: destination.label || link.to,
        });
      }
    }
    exits.sort((left, right) => {
      const directionDelta = directionSortIndex(left.direction) - directionSortIndex(right.direction);
      if (directionDelta) return directionDelta;
      return left.destinationLabel.localeCompare(right.destinationLabel, "it");
    });
    return exits;
  }

  function scopeNodeDescriptorForRoom(scope = "world", roomId = "") {
    if (!roomId) return null;
    if (scope === "world") {
      const regionId = ROOM_TO_REGION[roomId];
      const region = state.layout.regions?.[regionId];
      if (region?.parentScope) return null;
      if (regionId && (state.layout.inlineRegionsInWorld || []).includes(regionId)) {
        return { id: `room:${roomId}`, label: roomName(roomId), scope: "world" };
      }
      if (regionId && state.layout.inlineRegionHosts?.[regionId]) return null;
      if (regionId) {
        return { id: `region:${regionId}`, label: region?.label || roomName(roomId), scope: "world" };
      }
      return { id: `room:${roomId}`, label: roomName(roomId), scope: "world" };
    }
    const region = state.layout.regions?.[scope];
    if (!region) return null;
    const childRegions = Object.entries(state.layout.regions || {}).filter(([_id, candidate]) => candidate.parentScope === scope);
    const childRoomIds = new Set(childRegions.flatMap(([_id, child]) => child.rooms || []));
    const previewRooms = new Set(region.previewRooms || []);
    if (!(region.rooms || []).includes(roomId)) return null;
    if (childRoomIds.has(roomId) && !previewRooms.has(roomId)) return null;
    return { id: `room:${roomId}`, label: roomName(roomId), scope };
  }

  function externalScopeExits(model) {
    if (!model || state.scope === "world") return [];
    const parent = parentScope(state.scope);
    const visibleRoomIds = new Set((model.nodes || []).map((node) => node.roomId).filter(Boolean));
    const exits = [];
    const seen = new Set();
    for (const node of model.nodes || []) {
      if (!node.roomId) continue;
      for (const connection of DATA.connections || []) {
        if (connection.from !== node.roomId) continue;
        if (visibleRoomIds.has(connection.to)) continue;
        const direction = normalizeDirection(connection.direction);
        if (!direction) continue;
        const parentTarget = scopeNodeDescriptorForRoom(parent, connection.to);
        if (!parentTarget) continue;
        const key = `${node.id}|${direction}|${parentTarget.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        exits.push({
          id: key,
          sourceNodeId: node.id,
          direction,
          destinationLabel: parentTarget.label,
          parentNodeId: parentTarget.id,
          parentScope: parentTarget.scope,
        });
      }
    }
    exits.sort((left, right) => {
      if (left.sourceNodeId !== right.sourceNodeId) return left.sourceNodeId.localeCompare(right.sourceNodeId, "it");
      const directionDelta = directionSortIndex(left.direction) - directionSortIndex(right.direction);
      if (directionDelta) return directionDelta;
      return left.destinationLabel.localeCompare(right.destinationLabel, "it");
    });
    return exits;
  }

  function selectedNodeExternalDestinations(model) {
    if (!state.selectedNodeId) return [];
    return externalScopeExits(model).filter((entry) => entry.sourceNodeId === state.selectedNodeId);
  }

  function selectedLaneSummary(model) {
    if (!state.selectedLaneId) return null;
    const laneMatch = findLaneById(model, state.selectedLaneId);
    if (!laneMatch) return null;
    const nodeMap = new Map((model.nodes || []).map((node) => [node.id, node]));
    const fromNode = nodeMap.get(laneMatch.lane.startNodeId);
    const toNode = nodeMap.get(laneMatch.lane.endNodeId);
    return {
      fromLabel: fromNode?.label || laneMatch.lane.startNodeId,
      toLabel: toNode?.label || laneMatch.lane.endNodeId,
      sourceDirection: laneMatch.lane.sourceDirection,
      targetDirection: laneMatch.lane.targetDirection,
      twoWay: laneMatch.lane.twoWay,
    };
  }

  function renderCornerPanel(model) {
    if (!nodeExitsPanel) return;
    const laneSummary = selectedLaneSummary(model);
    if (laneSummary) {
      nodeExitsPanel.innerHTML = `
        <div class="editor-corner-panel__title">Connettore</div>
        <div class="editor-corner-panel__body">
          <div class="editor-corner-panel__node">${escapeHtml(laneSummary.fromLabel)} → ${escapeHtml(laneSummary.toLabel)}</div>
          <div class="editor-corner-panel__list">
            <div class="editor-corner-panel__row">
              <span class="editor-corner-panel__badge">${escapeHtml(directionBadge(laneSummary.sourceDirection) || laneSummary.sourceDirection || "auto")}</span>
              <span class="editor-corner-panel__dest">${escapeHtml(laneSummary.fromLabel)} → ${escapeHtml(laneSummary.toLabel)}</span>
            </div>
            ${laneSummary.twoWay ? `
              <div class="editor-corner-panel__row">
                <span class="editor-corner-panel__badge">${escapeHtml(directionBadge(laneSummary.targetDirection) || laneSummary.targetDirection || "auto")}</span>
                <span class="editor-corner-panel__dest">${escapeHtml(laneSummary.toLabel)} → ${escapeHtml(laneSummary.fromLabel)}</span>
              </div>
            ` : ""}
          </div>
        </div>
      `;
      return;
    }
    const selectedNode = (model.nodes || []).find((node) => node.id === state.selectedNodeId);
    if (!selectedNode) {
      nodeExitsPanel.innerHTML = `
        <div class="editor-corner-panel__title">Uscite</div>
        <div class="editor-corner-panel__body editor-corner-panel__empty">Seleziona una location per vedere dove portano le sue uscite.</div>
      `;
      return;
    }
    const exits = selectedNodeDestinations(model);
    const externalExits = selectedNodeExternalDestinations(model);
    const internalMarkup = exits.length
      ? `<div class="editor-corner-panel__section">
          <div class="editor-corner-panel__section-title">Interne</div>
          <div class="editor-corner-panel__list">${exits.map((entry) => `
            <div class="editor-corner-panel__row">
              <span class="editor-corner-panel__badge">${escapeHtml(directionBadge(entry.direction) || entry.direction)}</span>
              <span class="editor-corner-panel__dest">${escapeHtml(entry.destinationLabel)}</span>
            </div>
          `).join("")}</div>
        </div>`
      : "";
    const externalMarkup = externalExits.length
      ? `<div class="editor-corner-panel__section">
          <div class="editor-corner-panel__section-title">Verso ${escapeHtml(backupScopeLabel(parentScope(state.scope)))}</div>
          <div class="editor-corner-panel__list">${externalExits.map((entry) => `
            <button
              type="button"
              class="editor-corner-panel__row editor-corner-panel__row--button"
              data-parent-scope="${escapeHtml(entry.parentScope)}"
              data-parent-node-id="${escapeHtml(entry.parentNodeId)}"
            >
              <span class="editor-corner-panel__badge">${escapeHtml(directionBadge(entry.direction) || entry.direction)}</span>
              <span class="editor-corner-panel__dest">${escapeHtml(entry.destinationLabel)}</span>
            </button>
          `).join("")}</div>
        </div>`
      : "";
    const emptyMarkup = (!internalMarkup && !externalMarkup)
      ? `<div class="editor-corner-panel__empty">Nessuna uscita disponibile da questa location.</div>`
      : "";
    nodeExitsPanel.innerHTML = `
      <div class="editor-corner-panel__title">Uscite</div>
      <div class="editor-corner-panel__body">
        <div class="editor-corner-panel__node">${escapeHtml(selectedNode.label || selectedNode.id)}</div>
        ${internalMarkup}
        ${externalMarkup}
        ${emptyMarkup}
      </div>
    `;
  }

  function centerCanvasOnPoint(point) {
    if (!point) return;
    canvas.scrollLeft = Math.max(0, (point.x * state.zoom) - (canvas.clientWidth / 2));
    canvas.scrollTop = Math.max(0, (point.y * state.zoom) - (canvas.clientHeight / 2));
  }

  function jumpToScopeNode(scope = "world", nodeId = "") {
    state.scope = scope;
    state.selectedNodeId = nodeId;
    state.selectedEdgeId = "";
    state.selectedLaneId = "";
    state.lastNodeClick = null;
    state.pendingFocus = { scope, nodeId };
    render();
  }

  function externalExitPlacement(center, direction, index = 0, total = 1) {
    const side = exitBadgeSide(direction);
    const label = directionBadge(direction);
    if (!side || !label) return null;
    const vector = directionVector(side);
    const magnitude = Math.hypot(vector.x, vector.y) || 1;
    const alongX = vector.x / magnitude;
    const alongY = vector.y / magnitude;
    const normalX = -alongY;
    const normalY = alongX;
    const spread = total > 1 ? (index - ((total - 1) / 2)) * 28 : 0;
    const halfHeight = BOX_HEIGHT / 2;
    const quarterOffset = BOX_WIDTH * 0.25;
    let anchorPoint = anchor(center, side);
    if (direction === "up") anchorPoint = { x: center.x - quarterOffset, y: center.y - halfHeight };
    if (direction === "down") anchorPoint = { x: center.x + quarterOffset, y: center.y + halfHeight };
    anchorPoint = {
      x: anchorPoint.x + (normalX * spread),
      y: anchorPoint.y + (normalY * spread),
    };
    const stubEnd = {
      x: anchorPoint.x + (alongX * 32),
      y: anchorPoint.y + (alongY * 32),
    };
    return {
      label,
      anchorPoint,
      stubEnd,
      directionVector: { x: alongX, y: alongY },
    };
  }

  function externalExitMarkup(entry, placement, selected = false) {
    if (!placement) return "";
    const destinationText = entry.destinationLabel;
    const badgeWidth = Math.max(18, (placement.label.length * 7) + 10);
    const labelWidth = Math.max(74, Math.min(210, (destinationText.length * 6.7) + 20));
    const pillWidth = badgeWidth + labelWidth + 10;
    const pillHeight = 22;
    const pillGap = 10;
    const centerX = placement.stubEnd.x + (placement.directionVector.x * ((pillWidth / 2) + pillGap));
    const centerY = placement.stubEnd.y + (placement.directionVector.y * ((pillHeight / 2) + pillGap));
    const pillX = centerX - (pillWidth / 2);
    const pillY = centerY - (pillHeight / 2);
    const badgeX = pillX + 4;
    const textX = badgeX + badgeWidth + 8;
    return `<g
      class="editor-external-exit${selected ? " is-selected" : ""}"
      data-parent-scope="${escapeHtml(entry.parentScope)}"
      data-parent-node-id="${escapeHtml(entry.parentNodeId)}"
      data-external-exit-id="${escapeHtml(entry.id)}"
    >
      <path class="editor-external-exit__line" d="M ${placement.anchorPoint.x.toFixed(1)} ${placement.anchorPoint.y.toFixed(1)} L ${placement.stubEnd.x.toFixed(1)} ${placement.stubEnd.y.toFixed(1)}"></path>
      <rect class="editor-external-exit__hit" x="${(pillX - 6).toFixed(1)}" y="${(pillY - 6).toFixed(1)}" width="${(pillWidth + 12).toFixed(1)}" height="${(pillHeight + 12).toFixed(1)}" rx="10"></rect>
      <rect class="editor-external-exit__pill" x="${pillX.toFixed(1)}" y="${pillY.toFixed(1)}" width="${pillWidth.toFixed(1)}" height="${pillHeight}" rx="11"></rect>
      <rect class="editor-external-exit__badge" x="${badgeX.toFixed(1)}" y="${(pillY + 3).toFixed(1)}" width="${badgeWidth.toFixed(1)}" height="${(pillHeight - 6).toFixed(1)}" rx="8"></rect>
      <text class="editor-external-exit__badge-text" x="${(badgeX + (badgeWidth / 2)).toFixed(1)}" y="${(centerY + 3.2).toFixed(1)}" text-anchor="middle">${escapeHtml(placement.label)}</text>
      <text class="editor-external-exit__label" x="${textX.toFixed(1)}" y="${(centerY + 3.2).toFixed(1)}">${escapeHtml(destinationText)}</text>
    </g>`;
  }

  function axisAlignedSegments(points = []) {
    const segments = [];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      if (!start || !end) continue;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) >= 0.1) {
        segments.push({
          orientation: "vertical",
          start,
          end,
          segmentIndex: index - 1,
          minX: start.x,
          maxX: start.x,
          minY: Math.min(start.y, end.y),
          maxY: Math.max(start.y, end.y),
        });
      } else if (Math.abs(dy) < 0.1 && Math.abs(dx) >= 0.1) {
        segments.push({
          orientation: "horizontal",
          start,
          end,
          segmentIndex: index - 1,
          minX: Math.min(start.x, end.x),
          maxX: Math.max(start.x, end.x),
          minY: start.y,
          maxY: start.y,
        });
      }
    }
    return segments;
  }

  function pointNearSegmentEnd(segment, x, y, margin = BRIDGE_RADIUS + 2) {
    return (
      Math.hypot(segment.start.x - x, segment.start.y - y) <= margin
      || Math.hypot(segment.end.x - x, segment.end.y - y) <= margin
    );
  }

  function bridgeEraseMarkup(bridge, strokeWidth) {
    const eraseWidth = strokeWidth + 5;
    if (bridge.orientation === "horizontal") {
      const left = bridge.x - BRIDGE_RADIUS;
      const right = bridge.x + BRIDGE_RADIUS;
      return `<path d="M ${left.toFixed(1)} ${bridge.y.toFixed(1)} L ${right.toFixed(1)} ${bridge.y.toFixed(1)}" fill="none" stroke="${BRIDGE_BACKGROUND}" stroke-width="${eraseWidth.toFixed(1)}" stroke-linecap="round"></path>`;
    }
    const top = bridge.y - BRIDGE_RADIUS;
    const bottom = bridge.y + BRIDGE_RADIUS;
    return `<path d="M ${bridge.x.toFixed(1)} ${top.toFixed(1)} L ${bridge.x.toFixed(1)} ${bottom.toFixed(1)}" fill="none" stroke="${BRIDGE_BACKGROUND}" stroke-width="${eraseWidth.toFixed(1)}" stroke-linecap="round"></path>`;
  }

  function pathMarkup(points = [], bridges = [], stroke = "#87683c", strokeWidth = 4.4) {
    if (!Array.isArray(points) || !points.length) return "";
    if (!Array.isArray(bridges) || !bridges.length) {
      return `<polyline points="${pointMarkup(points)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"></polyline>`;
    }
    const bridgesBySegment = new Map();
    for (const bridge of bridges) {
      if (!bridgesBySegment.has(bridge.segmentIndex)) bridgesBySegment.set(bridge.segmentIndex, []);
      bridgesBySegment.get(bridge.segmentIndex).push(bridge);
    }
    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const segmentBridges = bridgesBySegment.get(index - 1) || [];
      if (!segmentBridges.length) {
        path += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
        continue;
      }
      if (Math.abs(start.y - end.y) < 0.1) {
        const direction = end.x >= start.x ? 1 : -1;
        const ordered = [...segmentBridges].sort((left, right) => direction * (left.x - right.x));
        let cursorX = start.x;
        const y = start.y;
        for (const bridge of ordered) {
          const entryX = bridge.x - (BRIDGE_RADIUS * direction);
          const exitX = bridge.x + (BRIDGE_RADIUS * direction);
          path += ` L ${entryX.toFixed(1)} ${y.toFixed(1)}`;
          path += ` Q ${bridge.x.toFixed(1)} ${(y - BRIDGE_LIFT).toFixed(1)} ${exitX.toFixed(1)} ${y.toFixed(1)}`;
          cursorX = exitX;
        }
        if (Math.abs(cursorX - end.x) >= 0.1) {
          path += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
        }
        continue;
      }
      if (Math.abs(start.x - end.x) < 0.1) {
        const direction = end.y >= start.y ? 1 : -1;
        const ordered = [...segmentBridges].sort((left, right) => direction * (left.y - right.y));
        let cursorY = start.y;
        const x = start.x;
        for (const bridge of ordered) {
          const entryY = bridge.y - (BRIDGE_RADIUS * direction);
          const exitY = bridge.y + (BRIDGE_RADIUS * direction);
          path += ` L ${x.toFixed(1)} ${entryY.toFixed(1)}`;
          path += ` Q ${(x + BRIDGE_LIFT).toFixed(1)} ${bridge.y.toFixed(1)} ${x.toFixed(1)} ${exitY.toFixed(1)}`;
          cursorY = exitY;
        }
        if (Math.abs(cursorY - end.y) >= 0.1) {
          path += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
        }
        continue;
      }
      path += ` L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }
    return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"></path>`;
  }

  function computeLaneBridges(lineEntries = []) {
    const segmentEntries = lineEntries.flatMap((entry, renderIndex) => (
      axisAlignedSegments(entry.points).map((segment) => ({ ...segment, entry, renderIndex }))
    ));
    const bridgesByLane = new Map();
    for (let index = 0; index < segmentEntries.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < segmentEntries.length; compareIndex += 1) {
        const first = segmentEntries[index];
        const second = segmentEntries[compareIndex];
        if (first.entry.laneId === second.entry.laneId) continue;
        if (first.orientation === second.orientation) continue;
        const horizontal = first.orientation === "horizontal" ? first : second;
        const vertical = first.orientation === "vertical" ? first : second;
        const crossX = vertical.start.x;
        const crossY = horizontal.start.y;
        if (
          crossX <= horizontal.minX + BRIDGE_RADIUS + 2
          || crossX >= horizontal.maxX - BRIDGE_RADIUS - 2
          || crossY <= vertical.minY + BRIDGE_RADIUS + 2
          || crossY >= vertical.maxY - BRIDGE_RADIUS - 2
        ) continue;
        if (
          pointNearSegmentEnd(horizontal, crossX, crossY)
          || pointNearSegmentEnd(vertical, crossX, crossY)
        ) continue;
        const bridgeSegment = (
          first.entry.selected && !second.entry.selected ? first
          : second.entry.selected && !first.entry.selected ? second
          : first.renderIndex > second.renderIndex ? first : second
        );
        const laneKey = bridgeSegment.entry.laneId;
        if (!bridgesByLane.has(laneKey)) bridgesByLane.set(laneKey, []);
        const existing = bridgesByLane.get(laneKey);
        if (existing.some((bridge) => Math.abs(bridge.x - crossX) < 1 && Math.abs(bridge.y - crossY) < 1)) continue;
        existing.push({
          x: crossX,
          y: crossY,
          orientation: bridgeSegment.orientation,
          segmentIndex: bridgeSegment.segmentIndex,
        });
      }
    }
    return bridgesByLane;
  }

  function pointMarkup(points) {
    return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  }

  function layoutSourceText() {
    return `(function () {\n  window.HOBBIT_MAP_LAYOUT = ${JSON.stringify(state.layout, null, 2)};\n}());\n`;
  }

  function loadStoredZoom() {
    try {
      const parsed = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
      if (!Number.isFinite(parsed)) return 1;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parsed));
    } catch (_error) {
      return 1;
    }
  }

  function persistZoom() {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(state.zoom));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function layoutSignature(layout = state.layout) {
    return JSON.stringify(layout || {});
  }

  function persistLayoutDraft(options = {}) {
    try {
      const payload = {
        updatedAt: new Date().toISOString(),
        scope: state.scope,
        layout: state.layout,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      if (!options.silent) {
        setSaveStatus("Bozza locale aggiornata nel browser. Per usarla nel gioco, salva nel progetto oppure usa Salva file.", "warning");
      }
      return true;
    } catch (_error) {
      if (!options.silent) {
        setSaveStatus("Non sono riuscito a salvare la bozza locale nel browser.", "danger");
      }
      return false;
    }
  }

  function loadLayoutDraft() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object" || !parsed.layout) return null;
      return {
        updatedAt: parsed.updatedAt || "",
        scope: parsed.scope || "world",
        layout: deepClone(parsed.layout),
      };
    } catch (_error) {
      return null;
    }
  }

  function setSaveStatus(message, tone = "") {
    if (!saveStatus) return;
    saveStatus.textContent = message;
    if (tone) {
      saveStatus.dataset.tone = tone;
    } else {
      delete saveStatus.dataset.tone;
    }
  }

  function setBackupStatus(message, tone = "") {
    if (!backupStatus) return;
    backupStatus.textContent = message;
    if (tone) {
      backupStatus.dataset.tone = tone;
    } else {
      delete backupStatus.dataset.tone;
    }
  }

  function updateDirectSaveUi() {
    if (saveLayoutButton) {
      saveLayoutButton.textContent = state.directSaveHandle ? "Salva nel progetto" : "Scegli file progetto";
    }
    if (chooseBackupFolderButton) {
      chooseBackupFolderButton.textContent = state.backupDirectoryHandle ? "Cartella backup pronta" : "Scegli cartella backup";
    }
  }

  function openHandleDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(HANDLE_DB_NAME, 1);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore(HANDLE_STORE_NAME);
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async function persistHandle(key, handle) {
    if (!handle || !window.indexedDB) return false;
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      tx.objectStore(HANDLE_STORE_NAME).put(handle, key);
      tx.addEventListener("complete", resolve);
      tx.addEventListener("error", () => reject(tx.error));
      tx.addEventListener("abort", () => reject(tx.error));
    });
    db.close();
    return true;
  }

  async function restoreHandle(key) {
    if (!window.indexedDB) return null;
    try {
      const db = await openHandleDb();
      const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
        const request = tx.objectStore(HANDLE_STORE_NAME).get(key);
        request.addEventListener("success", () => resolve(request.result || null));
        request.addEventListener("error", () => reject(request.error));
      });
      db.close();
      return handle || null;
    } catch (_error) {
      return null;
    }
  }

  async function persistDirectSaveHandle(handle) {
    return persistHandle(DIRECT_HANDLE_KEY, handle);
  }

  async function restoreDirectSaveHandle() {
    return restoreHandle(DIRECT_HANDLE_KEY);
  }

  async function persistExportFileHandle(handle) {
    return persistHandle(EXPORT_FILE_HANDLE_KEY, handle);
  }

  async function restoreExportFileHandle() {
    return restoreHandle(EXPORT_FILE_HANDLE_KEY);
  }

  async function persistBackupDirectoryHandle(handle) {
    return persistHandle(BACKUP_DIR_HANDLE_KEY, handle);
  }

  async function restoreBackupDirectoryHandle() {
    return restoreHandle(BACKUP_DIR_HANDLE_KEY);
  }

  async function ensureDirectSavePermission(handle) {
    if (!handle?.queryPermission || !handle?.requestPermission) return true;
    const current = await handle.queryPermission({ mode: "readwrite" });
    if (current === "granted") return true;
    const requested = await handle.requestPermission({ mode: "readwrite" });
    return requested === "granted";
  }

  async function chooseDirectSaveHandle() {
    if (typeof window.showOpenFilePicker === "function") {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "JavaScript files", accept: { "text/javascript": [".js"] } }],
        excludeAcceptAllOption: false,
      });
      return handle || null;
    }
    if (typeof window.showSaveFilePicker === "function") {
      return window.showSaveFilePicker({
        suggestedName: "map-layout-data.js",
        types: [{ description: "JavaScript files", accept: { "text/javascript": [".js"] } }],
      });
    }
    return null;
  }

  async function chooseExportFileHandle() {
    if (typeof window.showSaveFilePicker !== "function") return null;
    const options = {
      suggestedName: "map-layout-data.js",
      types: [{ description: "JavaScript files", accept: { "text/javascript": [".js"] } }],
      excludeAcceptAllOption: false,
    };
    if (state.exportFileHandle) options.startIn = state.exportFileHandle;
    return window.showSaveFilePicker(options);
  }

  async function chooseBackupDirectoryHandle() {
    if (typeof window.showDirectoryPicker !== "function") return null;
    return window.showDirectoryPicker({ mode: "readwrite" });
  }

  async function writeLayoutToHandle(handle) {
    const writable = await handle.createWritable();
    await writable.write(layoutSourceText());
    await writable.close();
  }

  function backupFileTimestamp(date = new Date()) {
    return date.toISOString().replace(/[:.]/g, "-");
  }

  function backupFileName(scope = state.scope, label = "autosave") {
    const safeScope = String(scope || "world").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "world";
    const safeLabel = String(label || "backup").toLowerCase().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "backup";
    return `map-layout-backup-${safeScope}-${safeLabel}-${backupFileTimestamp()}.js`;
  }

  async function ensureBackupDirectory() {
    if (state.backupDirectoryHandle) {
      const allowed = await ensureDirectSavePermission(state.backupDirectoryHandle);
      if (allowed) return state.backupDirectoryHandle;
    }
    if (typeof window.showDirectoryPicker !== "function") {
      setSaveStatus("Il browser non supporta la scelta di una cartella backup. Continuero con il salvataggio principale.", "warning");
      return null;
    }
    setSaveStatus("Scegli una cartella dove salvare i file di backup automatici.", "warning");
    const handle = await chooseBackupDirectoryHandle();
    if (!handle) return null;
    const allowed = await ensureDirectSavePermission(handle);
    if (!allowed) {
      setSaveStatus("Permesso negato sulla cartella backup. Continuero senza file di backup esterni.", "warning");
      return null;
    }
    state.backupDirectoryHandle = handle;
    updateDirectSaveUi();
    try {
      await persistBackupDirectoryHandle(handle);
    } catch (_persistError) {
      // Ignore persistence issues: directory still works for this session.
    }
    setBackupStatus(`Cartella backup pronta: ${handle.name || "backup"}.`, "success");
    return handle;
  }

  async function writeExternalBackupFile(label = "autosave") {
    const directoryHandle = await ensureBackupDirectory();
    if (!directoryHandle) return null;
    let backupContent = layoutSourceText();
    if (state.directSaveHandle?.getFile) {
      try {
        const currentFile = await state.directSaveHandle.getFile();
        backupContent = await currentFile.text();
      } catch (_error) {
        // Fall back to current in-memory layout when the existing file cannot be read.
      }
    }
    const fileHandle = await directoryHandle.getFileHandle(backupFileName(state.scope, label), { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(backupContent);
    await writable.close();
    return fileHandle.name || null;
  }

  function persistBackups() {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(state.backups));
      return true;
    } catch (_error) {
      setBackupStatus("Non sono riuscito a salvare la cronologia backup nel browser.", "danger");
      return false;
    }
  }

  function loadBackups() {
    try {
      const parsed = JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && entry.layout) : [];
    } catch (_error) {
      return [];
    }
  }

  function formatBackupTime(timestamp) {
    try {
      return new Intl.DateTimeFormat("it-IT", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(timestamp));
    } catch (_error) {
      return String(timestamp || "");
    }
  }

  function backupScopeLabel(scope = "world") {
    if (scope === "world") return "Mondo";
    return state.layout.regions?.[scope]?.label || scope;
  }

  function renderBackupList() {
    if (!backupList) return;
    if (!state.backups.length) {
      backupList.innerHTML = `<div class="editor-backup-empty">Nessun backup ancora disponibile.</div>`;
      return;
    }
    backupList.innerHTML = state.backups.map((backup) => `
      <article class="editor-backup-card">
        <div class="editor-backup-head">
          <strong>${escapeHtml(backup.label || "Snapshot")}</strong>
          <span>${escapeHtml(formatBackupTime(backup.createdAt))}</span>
        </div>
        <div class="editor-backup-meta">${escapeHtml(backupScopeLabel(backup.scope))}</div>
        <div class="editor-backup-actions">
          <button type="button" data-backup-action="restore" data-backup-id="${escapeHtml(backup.id)}">Ripristina</button>
          <button type="button" data-backup-action="delete" data-backup-id="${escapeHtml(backup.id)}">Elimina</button>
        </div>
      </article>
    `).join("");
  }

  function createBackup(label = "Snapshot", options = {}) {
    const signature = layoutSignature();
    if (!options.force && state.backups[0]?.signature === signature) return false;
    const backup = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      label,
      scope: state.scope,
      signature,
      layout: deepClone(state.layout),
    };
    state.backups = [backup, ...state.backups.filter((entry) => entry.signature !== signature)].slice(0, MAX_BACKUPS);
    persistLayoutDraft({ silent: Boolean(options.silent) });
    persistBackups();
    renderBackupList();
    if (!options.silent) {
      setBackupStatus(`Backup creato: ${label}.`, "success");
    }
    return true;
  }

  function restoreBackup(backupId) {
    const backup = state.backups.find((entry) => entry.id === backupId);
    if (!backup) return false;
    state.layout = deepClone(backup.layout);
    const fallbackScope = state.layout.regions?.[state.scope] ? state.scope : "world";
    state.scope = (backup.scope === "world" || state.layout.regions?.[backup.scope]) ? backup.scope : fallbackScope;
    state.selectedEdgeId = "";
    state.selectedLaneId = "";
    state.selectedNodeId = "";
    persistLayoutDraft({ silent: true });
    render();
    setBackupStatus(`Backup ripristinato: ${backup.label}.`, "success");
    setSaveStatus("Layout ripristinato da backup e bozza locale aggiornata. Per applicarlo al gioco, salva nel progetto oppure usa Salva file.", "warning");
    return true;
  }

  function deleteBackup(backupId) {
    const before = state.backups.length;
    state.backups = state.backups.filter((entry) => entry.id !== backupId);
    if (state.backups.length === before) return false;
    persistBackups();
    renderBackupList();
    setBackupStatus("Backup eliminato.", "warning");
    return true;
  }

  async function saveLayoutDirectly() {
    if (typeof window.showOpenFilePicker !== "function" && typeof window.showSaveFilePicker !== "function") {
      setSaveStatus("Questo browser non supporta il salvataggio diretto. Usa Salva file e sostituisci assets/map-layout-data.js.", "warning");
      return false;
    }
    try {
      let handle = state.directSaveHandle;
      if (!handle) {
        setSaveStatus("Scegli il file assets/map-layout-data.js del progetto per abilitare il salvataggio diretto.", "warning");
        handle = await chooseDirectSaveHandle();
        if (!handle) return false;
      }
      const allowed = await ensureDirectSavePermission(handle);
      if (!allowed) {
        setSaveStatus("Permesso di scrittura negato. Puoi sempre usare Salva file.", "danger");
        return false;
      }
      let backupFile = null;
      try {
        backupFile = await writeExternalBackupFile("before-save");
      } catch (_backupError) {
        setBackupStatus("Non sono riuscito a scrivere il file di backup esterno. Procedo comunque col salvataggio principale.", "warning");
      }
      await writeLayoutToHandle(handle);
      state.directSaveHandle = handle;
      updateDirectSaveUi();
      try {
        await persistDirectSaveHandle(handle);
      } catch (_persistError) {
        // Ignore persistence issues: direct save still succeeded for this session.
      }
      const fileName = handle.name || "map-layout-data.js";
      setSaveStatus(`Layout salvato direttamente in ${fileName}.${backupFile ? ` Backup creato: ${backupFile}.` : ""} Ricarica il gioco per vedere l'aggiornamento.`, "success");
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        setSaveStatus("Selezione del file annullata. Nessuna modifica salvata.", "warning");
        return false;
      }
      setSaveStatus("Salvataggio diretto non riuscito. Usa Salva file come fallback.", "danger");
      return false;
    }
  }

  function currentZoomLabel() {
    return `${Math.round(state.zoom * 100)}%`;
  }

  function updateZoomUi() {
    if (zoomResetButton) zoomResetButton.textContent = currentZoomLabel();
  }

  function captureCanvasAnchor(clientX = null, clientY = null) {
    const rect = canvas.getBoundingClientRect();
    const offsetX = Number.isFinite(clientX) ? clientX - rect.left : canvas.clientWidth / 2;
    const offsetY = Number.isFinite(clientY) ? clientY - rect.top : canvas.clientHeight / 2;
    return {
      offsetX,
      offsetY,
      mapX: (canvas.scrollLeft + offsetX) / state.zoom,
      mapY: (canvas.scrollTop + offsetY) / state.zoom,
    };
  }

  function restoreCanvasAnchor(anchor) {
    if (!anchor) return;
    canvas.scrollLeft = Math.max(0, (anchor.mapX * state.zoom) - anchor.offsetX);
    canvas.scrollTop = Math.max(0, (anchor.mapY * state.zoom) - anchor.offsetY);
  }

  function setZoom(nextZoom, options = {}) {
    const normalized = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoom.toFixed(2))));
    if (Math.abs(normalized - state.zoom) < 0.001) {
      updateZoomUi();
      return false;
    }
    const anchor = captureCanvasAnchor(options.clientX, options.clientY);
    state.zoom = normalized;
    persistZoom();
    render();
    restoreCanvasAnchor(anchor);
    return true;
  }

  function adjustZoom(delta, options = {}) {
    return setZoom(state.zoom + delta, options);
  }

  function currentConnectorMap() {
    if (state.scope === "world") return state.layout.world.connectors;
    return state.layout.regions[state.scope].connectors;
  }

  function currentNodeMap() {
    if (state.scope === "world") return state.layout.world.nodes;
    return state.layout.regions[state.scope].nodes;
  }

  function connectorEntryForEdge(edgeId = "") {
    const connectorMap = currentConnectorMap();
    if (!connectorMap[edgeId]) {
      connectorMap[edgeId] = { ...defaultConnectorStyle(), lanes: {} };
    }
    if (!connectorMap[edgeId].lanes) connectorMap[edgeId].lanes = {};
    return connectorMap[edgeId];
  }

  function connectorStyleForLane(edgeId = "", laneId = "") {
    const entry = currentConnectorMap()[edgeId];
    if (!entry) return defaultConnectorStyle();
    if (laneId && entry.lanes?.[laneId]) return cloneConnectorStyle(entry.lanes[laneId]);
    return cloneConnectorStyle(entry);
  }

  function laneUsesReversedStyle(edge, lane) {
    if (!edge || !lane) return false;
    return lane.startNodeId !== edge.from || lane.endNodeId !== edge.to;
  }

  function uiConnectorStyleForLane(edge, lane, connectorStyle = defaultConnectorStyle()) {
    if (!laneUsesReversedStyle(edge, lane)) return connectorStyle;
    return {
      ...connectorStyle,
      sourceSide: connectorStyle.targetSide || "auto",
      targetSide: connectorStyle.sourceSide || "auto",
    };
  }

  function laneStyleFromUiStyle(edge, lane, uiStyle = defaultConnectorStyle()) {
    if (!laneUsesReversedStyle(edge, lane)) return uiStyle;
    return {
      ...uiStyle,
      sourceSide: uiStyle.targetSide || "auto",
      targetSide: uiStyle.sourceSide || "auto",
    };
  }

  function updateSelectedLaneStyle(mutator) {
    if (!state.selectedEdgeId || !state.selectedLaneId) return false;
    const entry = connectorEntryForEdge(state.selectedEdgeId);
    const nextStyle = cloneConnectorStyle(mutator(connectorStyleForLane(state.selectedEdgeId, state.selectedLaneId)) || {});
    entry.lanes[state.selectedLaneId] = nextStyle;
    return true;
  }

  function computeCanvasMetrics(model) {
    const points = Object.values(model.positions);
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const minX = Math.min(...xValues, 0);
    const maxX = Math.max(...xValues, 1);
    const minY = Math.min(...yValues, 0);
    const maxY = Math.max(...yValues, 1);
    const width = Math.max(1200, ((maxX - minX) * UNIT) + (PADDING * 2) + BOX_WIDTH);
    const height = Math.max(840, ((maxY - minY) * UNIT) + (PADDING * 2) + BOX_HEIGHT);
    const scaledWidth = Math.round(width * state.zoom);
    const scaledHeight = Math.round(height * state.zoom);
    const centers = Object.fromEntries(
      Object.entries(model.positions).map(([nodeId, point]) => [nodeId, {
        x: PADDING + ((point.x - minX) * UNIT) + (BOX_WIDTH / 2),
        y: PADDING + ((point.y - minY) * UNIT) + (BOX_HEIGHT / 2),
      }])
    );
    return { minX, minY, maxX, maxY, width, height, scaledWidth, scaledHeight, centers };
  }

  function findLaneById(model, laneId = "", centers = null) {
    if (!laneId) return null;
    const resolvedCenters = centers || computeCanvasMetrics(model).centers;
    for (const edge of model.edges) {
      const lane = buildDisplayLanes(edge, resolvedCenters).find((candidate) => candidate.id === laneId);
      if (lane) return { edge, lane };
    }
    return null;
  }

  function setSelectedLane(edgeId = "", laneId = "") {
    state.selectedEdgeId = edgeId;
    state.selectedLaneId = laneId;
    state.selectedNodeId = "";
    syncSidebar();
    render();
  }

  function currentSelectedLaneContext() {
    if (!state.selectedLaneId) return null;
    const model = buildModel(state.scope);
    return findLaneById(model, state.selectedLaneId);
  }

  function syncSidebar() {
    const connectorSelected = Boolean(state.selectedLaneId);
    if (connectorPanel) connectorPanel.classList.toggle("editor-panel--disabled", !connectorSelected);
    for (const control of [routeSelect, sourceSideSelect, targetSideSelect, addWaypointButton, clearWaypointsButton]) {
      if (control) control.disabled = !connectorSelected;
    }
    if (!state.selectedLaneId) {
      selectionSummary.textContent = state.selectedNodeId || "Nessuna selezione.";
      routeSelect.value = "auto";
      sourceSideSelect.value = "auto";
      targetSideSelect.value = "auto";
      return;
    }
    const model = buildModel(state.scope);
    const laneMatch = findLaneById(model, state.selectedLaneId);
    const connector = connectorStyleForLane(state.selectedEdgeId, state.selectedLaneId);
    if (laneMatch) {
      selectionSummary.textContent = `${laneMatch.lane.startNodeId} -> ${laneMatch.lane.endNodeId} • ${laneMatch.lane.sourceDirection}${laneMatch.lane.twoWay ? ` / ${laneMatch.lane.targetDirection}` : ""}`;
    } else {
      selectionSummary.textContent = state.selectedLaneId;
    }
    const uiStyle = laneMatch ? uiConnectorStyleForLane(laneMatch.edge, laneMatch.lane, connector) : connector;
    routeSelect.value = uiStyle.route || "auto";
    sourceSideSelect.value = uiStyle.sourceSide || "auto";
    targetSideSelect.value = uiStyle.targetSide || "auto";
  }

  function render() {
    const model = buildModel(state.scope);
    const {
      width,
      height,
      scaledWidth,
      scaledHeight,
      centers,
    } = computeCanvasMetrics(model);
    const lineEntries = [];
    const exitBadgeEntries = [];
    const scopeExternalExits = externalScopeExits(model);

    const lineMarkup = model.edges.map((edge) => {
      const laneMarkup = buildDisplayLanes(edge, centers).map((lane) => {
        const style = connectorStyleForLane(edge.id, lane.id);
        const selected = state.selectedLaneId === lane.id;
        const stroke = selected ? "#b27e24" : "#87683c";
        const geometry = connectorGeometry(edge, centers, style, lane);
        if (!geometry) return "";
        const strokeWidth = selected ? 6.2 : 4.4;
        const pointsForEdge = geometry.points;
        lineEntries.push({
          edgeId: edge.id,
          laneId: lane.id,
          points: pointsForEdge,
          stroke,
          strokeWidth,
          selected,
        });
        const arrow = geometry.twoWay ? "" : arrowMarkup(pointsForEdge, stroke);
        const waypoints = selected
          ? (style.waypoints || []).map((point, index) => `<circle class="editor-waypoint" r="8" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" data-waypoint-index="${index}" data-edge-id="${edge.id}" data-lane-id="${lane.id}"></circle>`).join("")
          : "";
        return `<g data-edge-id="${edge.id}" data-lane-id="${lane.id}">
          ${pathMarkup(pointsForEdge, [], stroke, strokeWidth)}
          ${arrow}
          <polyline class="editor-edge-hit" points="${pointMarkup(pointsForEdge)}" fill="none" stroke="rgba(0,0,0,0)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" data-edge-hit="${edge.id}" data-lane-hit="${lane.id}"></polyline>
          ${waypoints}
        </g>`;
      }).join("");
      if (!laneMarkup) return "";
      const exitBadges = selectedNodeExitDecorations(edge, centers);
      if (exitBadges) exitBadgeEntries.push(exitBadges);
      return `<g data-edge-id="${edge.id}">
        ${laneMarkup}
      </g>`;
    }).join("");
    const bridgeMap = computeLaneBridges(lineEntries);
    const bridgeMarkup = lineEntries.map((entry) => {
      const bridges = bridgeMap.get(entry.laneId) || [];
      if (!bridges.length) return "";
      return `<g data-bridge-lane-id="${entry.laneId}">
        ${bridges.map((bridge) => bridgeEraseMarkup(bridge, entry.strokeWidth)).join("")}
        ${pathMarkup(entry.points, bridges, entry.stroke, entry.strokeWidth)}
      </g>`;
    }).join("");
    const exitBadgeMarkup = exitBadgeEntries.join("");
    const groupedExternalExits = scopeExternalExits.reduce((map, entry) => {
      const key = `${entry.sourceNodeId}|${exitBadgeSide(entry.direction) || entry.direction}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
      return map;
    }, new Map());
    const externalExitMarkupText = Array.from(groupedExternalExits.entries()).map(([groupKey, entries]) => {
      const [sourceNodeId] = groupKey.split("|");
      const center = centers[sourceNodeId];
      if (!center) return "";
      return entries.map((entry, index) => externalExitMarkup(
        entry,
        externalExitPlacement(center, entry.direction, index, entries.length),
        state.selectedNodeId === sourceNodeId,
      )).join("");
    }).join("");

    const nodeMarkup = model.nodes.map((node) => {
      const center = centers[node.id];
      if (!center) return "";
      const openScope = nodeOpenScope(node);
      const classes = [
        "editor-node",
        state.selectedNodeId === node.id ? "is-selected" : "",
        openScope ? "has-scope" : "",
      ].filter(Boolean).join(" ");
      const scopeAttrs = openScope
        ? ` data-open-scope="${openScope}" title="Doppio click per aprire ${escapeHtml(state.layout.regions?.[openScope]?.label || openScope)}"`
        : "";
      return `<button class="${classes}" type="button" data-node-id="${node.id}"${scopeAttrs} style="left:${center.x.toFixed(1)}px;top:${center.y.toFixed(1)}px;">${node.label}</button>`;
    }).join("");

    canvas.innerHTML = `<div class="editor-stage-shell" style="width:${scaledWidth}px;height:${scaledHeight}px;">
      <div class="editor-stage" style="width:${width}px;height:${height}px;transform:scale(${state.zoom});">
        <svg class="editor-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${lineMarkup}${bridgeMarkup}${exitBadgeMarkup}${externalExitMarkupText}</svg>
        ${nodeMarkup}
      </div>
    </div>`;
    scopeTitle.textContent = model.title;
    if (scopeSubtitle) scopeSubtitle.textContent = `Zoom ${currentZoomLabel()} • trascina i nodi, seleziona un connettore e rifiniscilo con i punti.`;
    renderCornerPanel(model);
    if (state.pendingFocus?.scope === state.scope && state.pendingFocus?.nodeId) {
      const focusPoint = centers[state.pendingFocus.nodeId];
      if (focusPoint) centerCanvasOnPoint(focusPoint);
      state.pendingFocus = null;
    }
    updateScopeNavigationUi();
    updateZoomUi();
    syncSidebar();
  }

  function setScope(scope = "world") {
    state.scope = scope;
    state.selectedNodeId = "";
    state.selectedEdgeId = "";
    state.selectedLaneId = "";
    state.lastNodeClick = null;
    state.pendingFocus = null;
    render();
  }

  async function downloadLayout() {
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await chooseExportFileHandle();
        if (!handle) return false;
        let existingFile = null;
        try {
          existingFile = await handle.getFile();
        } catch (_error) {
          existingFile = null;
        }
        const hasExistingContent = Boolean(existingFile && (existingFile.size > 0 || existingFile.name));
        if (hasExistingContent) {
          const confirmed = window.confirm(`Il file ${handle.name || "map-layout-data.js"} esiste gia. Vuoi sovrascriverlo?`);
          if (!confirmed) {
            setSaveStatus("Salvataggio file annullato. Nessun file sovrascritto.", "warning");
            return false;
          }
          setSaveStatus(`Sto sovrascrivendo ${handle.name || "map-layout-data.js"}.`, "warning");
        }
        await writeLayoutToHandle(handle);
        state.exportFileHandle = handle;
        try {
          await persistExportFileHandle(handle);
        } catch (_persistError) {
          // Ignore export handle persistence issues for this session.
        }
        setSaveStatus(`File salvato in ${handle.name || "map-layout-data.js"}. Per usarlo nel gioco, sostituisci il file del progetto oppure usa Salva nel progetto.`, hasExistingContent ? "warning" : "success");
        return true;
      } catch (error) {
        if (error?.name === "AbortError") {
          setSaveStatus("Salvataggio file annullato.", "warning");
          return false;
        }
        setSaveStatus("Salvataggio file non riuscito. Provo con il download classico.", "danger");
      }
    }
    const blob = new Blob([layoutSourceText()], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchorElement = document.createElement("a");
    anchorElement.href = url;
    anchorElement.download = "map-layout-data.js";
    anchorElement.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveStatus("File scaricato. In questo browser non posso scegliere la cartella da qui; per usarlo nel gioco, sostituisci assets/map-layout-data.js oppure usa Salva nel progetto.", "warning");
    return true;
  }

  function resetScope() {
    if (state.scope === "world") {
      state.layout.world.nodes = clonePointMap(INITIAL_LAYOUT.world.nodes || {});
      state.layout.world.connectors = cloneConnectorMap(INITIAL_LAYOUT.world.connectors || {});
    } else {
      state.layout.regions[state.scope].nodes = clonePointMap(INITIAL_LAYOUT.regions[state.scope]?.nodes || {});
      state.layout.regions[state.scope].connectors = cloneConnectorMap(INITIAL_LAYOUT.regions[state.scope]?.connectors || {});
    }
    state.selectedEdgeId = "";
    state.selectedLaneId = "";
    state.selectedNodeId = "";
    createBackup(`Reset ${backupScopeLabel(state.scope)}`);
    render();
  }

  function escapeHtml(text = "") {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  scopeSelect.innerHTML = [`<option value="world">world</option>`, ...Object.keys(state.layout.regions || {}).map((scope) => `<option value="${scope}">${scope}</option>`)].join("");
  scopeSelect.addEventListener("change", (event) => setScope(event.target.value));
  nodeExitsPanel.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-parent-scope][data-parent-node-id]");
    if (!trigger) return;
    jumpToScopeNode(trigger.getAttribute("data-parent-scope") || "world", trigger.getAttribute("data-parent-node-id") || "");
  });
  if (scopeBackButton) {
    scopeBackButton.addEventListener("click", () => {
      if (state.scope === "world") return;
      setScope(parentScope(state.scope));
    });
  }
  saveLayoutButton.addEventListener("click", () => {
    saveLayoutDirectly();
  });
  chooseBackupFolderButton.addEventListener("click", async () => {
    try {
      const handle = await chooseBackupDirectoryHandle();
      if (!handle) return;
      const allowed = await ensureDirectSavePermission(handle);
      if (!allowed) {
        setBackupStatus("Permesso negato sulla cartella backup.", "danger");
        return;
      }
      state.backupDirectoryHandle = handle;
      updateDirectSaveUi();
      try {
        await persistBackupDirectoryHandle(handle);
      } catch (_persistError) {
        // Ignore persistence issues for this session.
      }
      setBackupStatus(`Cartella backup impostata: ${handle.name || "backup"}.`, "success");
    } catch (error) {
      if (error?.name === "AbortError") {
        setBackupStatus("Scelta della cartella backup annullata.", "warning");
        return;
      }
      setBackupStatus("Impostazione della cartella backup non riuscita.", "danger");
    }
  });
  createBackupButton.addEventListener("click", () => {
    createBackup(`Snapshot manuale • ${backupScopeLabel(state.scope)}`, { force: true });
  });
  downloadLayoutButton.addEventListener("click", downloadLayout);
  resetScopeButton.addEventListener("click", resetScope);
  zoomOutButton.addEventListener("click", () => adjustZoom(-ZOOM_STEP));
  zoomResetButton.addEventListener("click", () => setZoom(1));
  zoomInButton.addEventListener("click", () => adjustZoom(ZOOM_STEP));
  routeSelect.addEventListener("change", () => {
    if (!updateSelectedLaneStyle((style) => ({ ...style, route: routeSelect.value }))) return;
    createBackup(`Percorso aggiornato • ${backupScopeLabel(state.scope)}`);
    render();
  });
  sourceSideSelect.addEventListener("change", () => {
    const laneContext = currentSelectedLaneContext();
    if (!updateSelectedLaneStyle((style) => {
      const uiStyle = laneContext ? uiConnectorStyleForLane(laneContext.edge, laneContext.lane, style) : style;
      return laneContext
        ? laneStyleFromUiStyle(laneContext.edge, laneContext.lane, { ...uiStyle, sourceSide: sourceSideSelect.value })
        : { ...style, sourceSide: sourceSideSelect.value };
    })) return;
    createBackup(`Lato origine aggiornato • ${backupScopeLabel(state.scope)}`);
    render();
  });
  targetSideSelect.addEventListener("change", () => {
    const laneContext = currentSelectedLaneContext();
    if (!updateSelectedLaneStyle((style) => {
      const uiStyle = laneContext ? uiConnectorStyleForLane(laneContext.edge, laneContext.lane, style) : style;
      return laneContext
        ? laneStyleFromUiStyle(laneContext.edge, laneContext.lane, { ...uiStyle, targetSide: targetSideSelect.value })
        : { ...style, targetSide: targetSideSelect.value };
    })) return;
    createBackup(`Lato arrivo aggiornato • ${backupScopeLabel(state.scope)}`);
    render();
  });
  addWaypointButton.addEventListener("click", () => {
    if (!state.selectedLaneId || !state.selectedEdgeId) return;
    const model = buildModel(state.scope);
    const metrics = computeCanvasMetrics(model);
    const selected = findLaneById(model, state.selectedLaneId, metrics.centers);
    if (!selected) return;
    const from = metrics.centers[selected.lane.startNodeId];
    const to = metrics.centers[selected.lane.endNodeId];
    const connector = connectorStyleForLane(state.selectedEdgeId, state.selectedLaneId);
    const midpoint = { x: Math.round(((from.x + to.x) / 2) * 10) / 10, y: Math.round(((from.y + to.y) / 2) * 10) / 10 };
    updateSelectedLaneStyle(() => ({ ...connector, waypoints: [...(connector.waypoints || []), midpoint] }));
    createBackup(`Punto aggiunto • ${backupScopeLabel(state.scope)}`);
    render();
  });
  clearWaypointsButton.addEventListener("click", () => {
    if (!updateSelectedLaneStyle((style) => ({ ...style, waypoints: [] }))) return;
    createBackup(`Punti rimossi • ${backupScopeLabel(state.scope)}`);
    render();
  });

  backupList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-backup-action]");
    if (!button) return;
    const backupId = button.getAttribute("data-backup-id");
    const action = button.getAttribute("data-backup-action");
    if (action === "restore") {
      restoreBackup(backupId);
      return;
    }
    if (action === "delete") {
      deleteBackup(backupId);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    const externalExit = event.target.closest("[data-parent-scope][data-parent-node-id]");
    if (externalExit) {
      event.preventDefault();
      state.drag = null;
      state.waypointDrag = null;
      jumpToScopeNode(externalExit.getAttribute("data-parent-scope") || "world", externalExit.getAttribute("data-parent-node-id") || "");
      return;
    }
    const waypointHandle = event.target.closest("[data-waypoint-index]");
    if (waypointHandle) {
      state.waypointDrag = {
        edgeId: waypointHandle.getAttribute("data-edge-id"),
        laneId: waypointHandle.getAttribute("data-lane-id"),
        index: Number(waypointHandle.getAttribute("data-waypoint-index")),
        changed: false,
      };
      return;
    }
    const node = event.target.closest("[data-node-id]");
    if (node) {
      const nodeId = node.getAttribute("data-node-id") || "";
      const openScope = node.getAttribute("data-open-scope");
      const now = Date.now();
      const repeatedNodeClick = Boolean(
        state.lastNodeClick
        && state.lastNodeClick.scope === state.scope
        && state.lastNodeClick.nodeId === nodeId
        && (now - state.lastNodeClick.time) <= 420
      );
      state.lastNodeClick = { scope: state.scope, nodeId, time: now };
      if (repeatedNodeClick && openScope && state.layout.regions?.[openScope]) {
        event.preventDefault();
        state.lastNodeClick = null;
        state.drag = null;
        state.waypointDrag = null;
        setScope(openScope);
        return;
      }
      state.selectedNodeId = nodeId;
      state.selectedEdgeId = "";
      state.selectedLaneId = "";
      const model = buildModel(state.scope);
      const positions = state.scope === "world" ? state.layout.world.nodes : state.layout.regions[state.scope].nodes;
      const entryKey = state.scope === "world" ? nodeId : nodeId.replace(/^room:/, "");
      const currentPosition = positions[entryKey];
      if (!currentPosition) return;
      state.drag = {
        nodeId: state.selectedNodeId,
        positions,
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: Number(currentPosition.x) || 0,
        originY: Number(currentPosition.y) || 0,
        model,
        changed: false,
      };
      render();
      return;
    }
    const edge = event.target.closest("[data-edge-hit]");
    if (edge) {
      state.lastNodeClick = null;
      setSelectedLane(edge.getAttribute("data-edge-hit"), edge.getAttribute("data-lane-hit"));
      return;
    }
    state.lastNodeClick = null;
    state.selectedNodeId = "";
    state.selectedEdgeId = "";
    state.selectedLaneId = "";
    render();
  });

  window.addEventListener("pointermove", (event) => {
    if (state.drag) {
      const {
        nodeId,
        positions,
        startClientX,
        startClientY,
        originX,
        originY,
      } = state.drag;
      const entryKey = state.scope === "world" ? nodeId : nodeId.replace(/^room:/, "");
      const next = positions[entryKey];
      if (!next) return;
      const freeMove = event.altKey;
      const rawX = originX + ((event.clientX - startClientX) / (UNIT * state.zoom));
      const rawY = originY + ((event.clientY - startClientY) / (UNIT * state.zoom));
      next.x = snapNodeCoordinate(rawX, !freeMove);
      next.y = snapNodeCoordinate(rawY, !freeMove);
      state.drag.changed = true;
      render();
      return;
    }
    if (state.waypointDrag) {
      const stageShell = canvas.querySelector(".editor-stage-shell");
      if (!stageShell) return;
      const rect = stageShell.getBoundingClientRect();
      const connector = connectorEntryForEdge(state.waypointDrag.edgeId).lanes[state.waypointDrag.laneId];
      if (!connector?.waypoints?.[state.waypointDrag.index]) return;
      connector.waypoints[state.waypointDrag.index] = {
        x: Math.round(((event.clientX - rect.left) / state.zoom) * 10) / 10,
        y: Math.round(((event.clientY - rect.top) / state.zoom) * 10) / 10,
      };
      state.waypointDrag.changed = true;
      render();
    }
  });

  window.addEventListener("pointerup", () => {
    if (state.drag?.changed) {
      createBackup(`Nodo spostato • ${backupScopeLabel(state.scope)}`);
    }
    if (state.waypointDrag?.changed) {
      createBackup(`Punto spostato • ${backupScopeLabel(state.scope)}`);
    }
    state.drag = null;
    state.waypointDrag = null;
  });

  window.addEventListener("pagehide", () => {
    persistLayoutDraft({ silent: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      persistLayoutDraft({ silent: true });
    }
  });

  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
    event.preventDefault();
    adjustZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, { passive: false });

  state.zoom = loadStoredZoom();
  const restoredDraft = loadLayoutDraft();
  if (restoredDraft?.layout) {
    state.layout = restoredDraft.layout;
    const restoredScope = restoredDraft.scope === "world" || state.layout.regions?.[restoredDraft.scope]
      ? restoredDraft.scope
      : "world";
    state.scope = restoredScope;
    setSaveStatus("Bozza locale ripristinata dal browser. Per applicare le modifiche al gioco, salva nel progetto oppure usa Salva file.", "warning");
  }
  state.backups = loadBackups();
  renderBackupList();
  if (!state.backups.length) {
    createBackup("Layout iniziale importato", { force: true, silent: true });
  } else {
    setBackupStatus("Cronologia backup pronta. Puoi ripristinare qualsiasi passaggio qui sotto.", "success");
  }
  updateDirectSaveUi();
  restoreDirectSaveHandle().then(async (handle) => {
    if (!handle) return;
    state.directSaveHandle = handle;
    updateDirectSaveUi();
    try {
      const permitted = await ensureDirectSavePermission(handle);
      if (permitted) {
        setSaveStatus(`Target diretto pronto: ${handle.name || "map-layout-data.js"}.`, "success");
      } else {
        setSaveStatus("Target di salvataggio trovato, ma servirà confermare di nuovo i permessi.", "warning");
      }
    } catch (_error) {
      setSaveStatus("Target diretto trovato, ma il browser chiederà di nuovo il permesso quando salvi.", "warning");
    }
  });
  restoreExportFileHandle().then((handle) => {
    if (!handle) return;
    state.exportFileHandle = handle;
  });
  restoreBackupDirectoryHandle().then(async (handle) => {
    if (!handle) return;
    state.backupDirectoryHandle = handle;
    updateDirectSaveUi();
    try {
      const permitted = await ensureDirectSavePermission(handle);
      if (permitted) {
        setBackupStatus(`Cartella backup pronta: ${handle.name || "backup"}.`, "success");
      } else {
        setBackupStatus("Cartella backup trovata, ma potrebbe servire confermare di nuovo il permesso.", "warning");
      }
    } catch (_error) {
      setBackupStatus("Cartella backup trovata, ma il browser potrebbe chiedere di nuovo il permesso.", "warning");
    }
  });
  setScope(state.scope || "world");
})();
