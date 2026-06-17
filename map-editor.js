(() => {
  const DATA = window.HOBBIT_DATA || {};
  const deepClone = (value) => JSON.parse(JSON.stringify(value || {}));
  const INITIAL_LAYOUT = deepClone(window.HOBBIT_MAP_LAYOUT || {});
  const state = {
    layout: deepClone(INITIAL_LAYOUT),
    scope: "world",
    selectedNodeId: "",
    selectedEdgeId: "",
    drag: null,
    waypointDrag: null,
  };

  const SIDE_OPTIONS = ["auto", "north", "east", "south", "west", "north east", "north west", "south east", "south west"];
  const BOX = 98;
  const UNIT = 168;
  const PADDING = 120;
  const ROOM_TO_REGION = Object.fromEntries(
    Object.entries(state.layout.regions || {}).flatMap(([regionId, region]) => (region.rooms || []).map((roomId) => [roomId, regionId]))
  );

  const scopeSelect = document.getElementById("scope-select");
  const scopeTitle = document.getElementById("scope-title");
  const selectionSummary = document.getElementById("selection-summary");
  const canvas = document.getElementById("editor-canvas");
  const routeSelect = document.getElementById("connector-route");
  const sourceSideSelect = document.getElementById("connector-source-side");
  const targetSideSelect = document.getElementById("connector-target-side");
  const addWaypointButton = document.getElementById("add-waypoint");
  const clearWaypointsButton = document.getElementById("clear-waypoints");
  const resetScopeButton = document.getElementById("reset-scope");
  const downloadLayoutButton = document.getElementById("download-layout");

  for (const select of [sourceSideSelect, targetSideSelect]) {
    select.innerHTML = SIDE_OPTIONS.map((value) => `<option value="${value}">${value}</option>`).join("");
  }

  function clonePointMap(points = {}) {
    return Object.fromEntries(Object.entries(points).map(([key, value]) => [key, { x: Number(value.x) || 0, y: Number(value.y) || 0 }]));
  }

  function cloneConnectorMap(connectors = {}) {
    return Object.fromEntries(
      Object.entries(connectors).map(([edgeId, connector]) => [edgeId, {
        route: connector.route === "straight" ? "straight" : "auto",
        sourceSide: connector.sourceSide || "auto",
        targetSide: connector.targetSide || "auto",
        waypoints: Array.isArray(connector.waypoints) ? connector.waypoints.map((point) => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })) : [],
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
    for (const connection of DATA.connections || []) {
      if (!visible.has(connection.from) || !visible.has(connection.to)) continue;
      const fromId = mapRoom(connection.from);
      const toId = mapRoom(connection.to);
      if (!fromId || !toId || fromId === toId) continue;
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
        direction: normalizeDirection(connection.direction),
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
        title: "World",
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

  function normalizeDirection(direction = "") {
    return String(direction || "").trim().toLowerCase().replace(/_/g, " ");
  }

  function inferSide(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
    return dy >= 0 ? "south" : "north";
  }

  function anchor(center, side = "auto") {
    const half = BOX / 2;
    return {
      north: { x: center.x, y: center.y - half },
      east: { x: center.x + half, y: center.y },
      south: { x: center.x, y: center.y + half },
      west: { x: center.x - half, y: center.y },
      "north east": { x: center.x + half - 6, y: center.y - half + 6 },
      "north west": { x: center.x - half + 6, y: center.y - half + 6 },
      "south east": { x: center.x + half - 6, y: center.y + half - 6 },
      "south west": { x: center.x - half + 6, y: center.y + half - 6 },
    }[side] || center;
  }

  function connectorPoints(from, to, style, edge) {
    const sourceSide = style.sourceSide && style.sourceSide !== "auto" ? style.sourceSide : inferSide(from, to);
    const targetSide = style.targetSide && style.targetSide !== "auto" ? style.targetSide : inferSide(to, from);
    const start = anchor(from, sourceSide);
    const end = anchor(to, targetSide);
    if (style.route === "straight") return [start, end];
    if (style.waypoints?.length) return [start, ...style.waypoints, end];
    const firstDirection = edge.links?.[0]?.direction || "";
    if (["up", "down"].includes(firstDirection)) return [start, end];
    const horizontalFirst = ["east", "west"].includes(sourceSide) || (sourceSide === "auto" && Math.abs(to.x - from.x) >= Math.abs(to.y - from.y));
    return horizontalFirst
      ? [start, { x: end.x, y: start.y }, end]
      : [start, { x: start.x, y: end.y }, end];
  }

  function pointMarkup(points) {
    return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  }

  function currentConnectorMap() {
    if (state.scope === "world") return state.layout.world.connectors;
    return state.layout.regions[state.scope].connectors;
  }

  function currentNodeMap() {
    if (state.scope === "world") return state.layout.world.nodes;
    return state.layout.regions[state.scope].nodes;
  }

  function setSelectedEdge(edgeId = "") {
    state.selectedEdgeId = edgeId;
    state.selectedNodeId = "";
    syncSidebar();
    render();
  }

  function syncSidebar() {
    if (!state.selectedEdgeId) {
      selectionSummary.textContent = state.selectedNodeId || "Nessuna selezione.";
      routeSelect.value = "auto";
      sourceSideSelect.value = "auto";
      targetSideSelect.value = "auto";
      return;
    }
    const model = buildModel(state.scope);
    const edge = model.edges.find((candidate) => candidate.id === state.selectedEdgeId);
    const connector = currentConnectorMap()[state.selectedEdgeId] || { route: "auto", sourceSide: "auto", targetSide: "auto", waypoints: [] };
    selectionSummary.textContent = edge ? `${edge.from} -> ${edge.to}` : state.selectedEdgeId;
    routeSelect.value = connector.route || "auto";
    sourceSideSelect.value = connector.sourceSide || "auto";
    targetSideSelect.value = connector.targetSide || "auto";
  }

  function render() {
    const model = buildModel(state.scope);
    const points = Object.values(model.positions);
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const minX = Math.min(...xValues, 0);
    const maxX = Math.max(...xValues, 1);
    const minY = Math.min(...yValues, 0);
    const maxY = Math.max(...yValues, 1);
    const width = Math.max(1200, ((maxX - minX) * UNIT) + (PADDING * 2) + BOX);
    const height = Math.max(840, ((maxY - minY) * UNIT) + (PADDING * 2) + BOX);
    const centers = Object.fromEntries(
      Object.entries(model.positions).map(([nodeId, point]) => [nodeId, {
        x: PADDING + ((point.x - minX) * UNIT) + (BOX / 2),
        y: PADDING + ((point.y - minY) * UNIT) + (BOX / 2),
      }])
    );

    const lineMarkup = model.edges.map((edge) => {
      const style = model.connectors[edge.id] || { route: "auto", sourceSide: "auto", targetSide: "auto", waypoints: [] };
      const from = centers[edge.from];
      const to = centers[edge.to];
      if (!from || !to) return "";
      const pointsForEdge = connectorPoints(from, to, style, edge);
      const waypoints = state.selectedEdgeId === edge.id
        ? (style.waypoints || []).map((point, index) => `<circle class="editor-waypoint" r="8" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" data-waypoint-index="${index}" data-edge-id="${edge.id}"></circle>`).join("")
        : "";
      return `<g data-edge-id="${edge.id}">
        <polyline points="${pointMarkup(pointsForEdge)}" fill="none" stroke="${state.selectedEdgeId === edge.id ? "#b27e24" : "#87683c"}" stroke-width="${state.selectedEdgeId === edge.id ? "6.2" : "4.4"}" stroke-linecap="round" stroke-linejoin="round"></polyline>
        <polyline class="editor-edge-hit" points="${pointMarkup(pointsForEdge)}" fill="none" stroke="rgba(0,0,0,0)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" data-edge-hit="${edge.id}"></polyline>
        ${waypoints}
      </g>`;
    }).join("");

    const nodeMarkup = model.nodes.map((node) => {
      const center = centers[node.id];
      if (!center) return "";
      return `<button class="editor-node${state.selectedNodeId === node.id ? " is-selected" : ""}" type="button" data-node-id="${node.id}" style="left:${center.x.toFixed(1)}px;top:${center.y.toFixed(1)}px;">${node.label}</button>`;
    }).join("");

    canvas.innerHTML = `<div class="editor-stage" style="width:${width}px;height:${height}px;">
      <svg class="editor-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${lineMarkup}</svg>
      ${nodeMarkup}
    </div>`;
    scopeTitle.textContent = model.title;
    syncSidebar();
  }

  function setScope(scope = "world") {
    state.scope = scope;
    state.selectedNodeId = "";
    state.selectedEdgeId = "";
    render();
  }

  function downloadLayout() {
    const content = `(function () {\n  window.HOBBIT_MAP_LAYOUT = ${JSON.stringify(state.layout, null, 2)};\n}());\n`;
    const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchorElement = document.createElement("a");
    anchorElement.href = url;
    anchorElement.download = "map-layout-data.js";
    anchorElement.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    state.selectedNodeId = "";
    render();
  }

  scopeSelect.innerHTML = [`<option value="world">world</option>`, ...Object.keys(state.layout.regions || {}).map((scope) => `<option value="${scope}">${scope}</option>`)].join("");
  scopeSelect.addEventListener("change", (event) => setScope(event.target.value));
  downloadLayoutButton.addEventListener("click", downloadLayout);
  resetScopeButton.addEventListener("click", resetScope);
  routeSelect.addEventListener("change", () => {
    if (!state.selectedEdgeId) return;
    currentConnectorMap()[state.selectedEdgeId] = { ...(currentConnectorMap()[state.selectedEdgeId] || {}), route: routeSelect.value };
    render();
  });
  sourceSideSelect.addEventListener("change", () => {
    if (!state.selectedEdgeId) return;
    currentConnectorMap()[state.selectedEdgeId] = { ...(currentConnectorMap()[state.selectedEdgeId] || {}), sourceSide: sourceSideSelect.value };
    render();
  });
  targetSideSelect.addEventListener("change", () => {
    if (!state.selectedEdgeId) return;
    currentConnectorMap()[state.selectedEdgeId] = { ...(currentConnectorMap()[state.selectedEdgeId] || {}), targetSide: targetSideSelect.value };
    render();
  });
  addWaypointButton.addEventListener("click", () => {
    if (!state.selectedEdgeId) return;
    const model = buildModel(state.scope);
    const edge = model.edges.find((candidate) => candidate.id === state.selectedEdgeId);
    if (!edge) return;
    const nodePositions = Object.fromEntries(model.nodes.map((node) => [node.id, {
      x: PADDING + ((model.positions[node.id].x - Math.min(...Object.values(model.positions).map((point) => point.x), 0)) * UNIT) + (BOX / 2),
      y: PADDING + ((model.positions[node.id].y - Math.min(...Object.values(model.positions).map((point) => point.y), 0)) * UNIT) + (BOX / 2),
    }]));
    const from = nodePositions[edge.from];
    const to = nodePositions[edge.to];
    const connector = currentConnectorMap()[edge.id] || { route: "auto", sourceSide: "auto", targetSide: "auto", waypoints: [] };
    const midpoint = { x: Math.round(((from.x + to.x) / 2) * 10) / 10, y: Math.round(((from.y + to.y) / 2) * 10) / 10 };
    currentConnectorMap()[edge.id] = { ...connector, waypoints: [...(connector.waypoints || []), midpoint] };
    render();
  });
  clearWaypointsButton.addEventListener("click", () => {
    if (!state.selectedEdgeId) return;
    currentConnectorMap()[state.selectedEdgeId] = { ...(currentConnectorMap()[state.selectedEdgeId] || {}), waypoints: [] };
    render();
  });

  canvas.addEventListener("pointerdown", (event) => {
    const waypointHandle = event.target.closest("[data-waypoint-index]");
    if (waypointHandle) {
      state.waypointDrag = {
        edgeId: waypointHandle.getAttribute("data-edge-id"),
        index: Number(waypointHandle.getAttribute("data-waypoint-index")),
      };
      return;
    }
    const node = event.target.closest("[data-node-id]");
    if (node) {
      state.selectedNodeId = node.getAttribute("data-node-id");
      state.selectedEdgeId = "";
      const model = buildModel(state.scope);
      const positions = state.scope === "world" ? state.layout.world.nodes : state.layout.regions[state.scope].nodes;
      state.drag = { nodeId: state.selectedNodeId, positions, offsetX: event.clientX, offsetY: event.clientY, model };
      render();
      return;
    }
    const edge = event.target.closest("[data-edge-hit]");
    if (edge) {
      setSelectedEdge(edge.getAttribute("data-edge-hit"));
      return;
    }
    state.selectedNodeId = "";
    state.selectedEdgeId = "";
    render();
  });

  window.addEventListener("pointermove", (event) => {
    if (state.drag) {
      const { nodeId, positions } = state.drag;
      const entryKey = state.scope === "world" ? nodeId : nodeId.replace(/^room:/, "");
      const next = positions[entryKey];
      if (!next) return;
      next.x += (event.clientX - state.drag.offsetX) / UNIT;
      next.y += (event.clientY - state.drag.offsetY) / UNIT;
      state.drag.offsetX = event.clientX;
      state.drag.offsetY = event.clientY;
      render();
      return;
    }
    if (state.waypointDrag) {
      const stage = canvas.querySelector(".editor-stage");
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const connector = currentConnectorMap()[state.waypointDrag.edgeId];
      if (!connector?.waypoints?.[state.waypointDrag.index]) return;
      connector.waypoints[state.waypointDrag.index] = {
        x: Math.round((event.clientX - rect.left) * 10) / 10,
        y: Math.round((event.clientY - rect.top) * 10) / 10,
      };
      render();
    }
  });

  window.addEventListener("pointerup", () => {
    state.drag = null;
    state.waypointDrag = null;
  });

  setScope("world");
})();
