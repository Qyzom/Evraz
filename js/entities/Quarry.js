/**
 * Модель карьера: Уступы, Бермы, Двухпутевая сеть (Западный и Восточный серпантины)
 * Стандартизирована по брендбуку ЕВРАЗ
 */

import * as THREE from "three";

export class Quarry {
  constructor() {
    // Уступы карьера (расширенный разрез с просторным нижним горизонтом)
    this.benches = [
      { level: 0, depthM: 0,   name: "Поверхность (Отметка +0м)",   radiusX: 720, radiusY: 430, color: "#4A433E" },
      { level: 1, depthM: 45,  name: "Уступ 1 (Отметка -45м)",      radiusX: 580, radiusY: 346, color: "#5A524C" },
      { level: 2, depthM: 95,  name: "Уступ 2 (Отметка -95м)",      radiusX: 450, radiusY: 268, color: "#695E57" },
      { level: 3, depthM: 145, name: "Уступ 3 (Отметка -145м)",     radiusX: 330, radiusY: 197, color: "#786C63" },
      { level: 4, depthM: 195, name: "Дно карьера (Отметка -195м)", radiusX: 220, radiusY: 131, color: "#867970" }
    ];

    // Узлы дорожной сети в 3D (x, y = высота/горизонт, z)
    this.nodes = {
      // 1. Поверхность: Комплексы ГОКа на просторной северной промплощадке (z <= -680, с расстоянием >130м друг от друга)
      n_gof: { id: "n_gof", x: -580, y: 0, z: -680, type: "station", target: "gof", name: "ГОФ-1 (Дробилка руды)" },
      n_dump: { id: "n_dump", x: 740, y: 0, z: -680, type: "station", target: "dump", name: "Северный отвал (Вскрыша)" },
      n_fuel: { id: "n_fuel", x: -120, y: 0, z: -700, type: "station", target: "fuel", name: "АЗС ГТК (Заправка ДТ)" },
      n_service: { id: "n_service", x: 140, y: 0, z: -700, type: "station", target: "service", name: "РМЦ (База ТО БелАЗ)" },
      n_cup: { id: "n_cup", x: -350, y: 0, z: -720, type: "waypoint", name: "ЦУП (Диспетчерский центр)" },

      // Северная магистраль (Магистральная трасса на z = -540, в 110м от карьера и 160м от объектов)
      n_surface_west: {
        id: "n_surface_west",
        x: -380,
        y: 0,
        z: -540,
        type: "switch",
        name: "Западная развилка (Поверхность)",
        activeBranch: 0,
        branches: ["n_gof", "n_fuel", "n_ramp_west_top", "n_surface_mid"]
      },
      n_surface_mid: {
        id: "n_surface_mid",
        x: 140,
        y: 0,
        z: -540,
        type: "switch",
        name: "Центральная развилка (РМЦ / Въезды)",
        activeBranch: 0,
        branches: ["n_fuel", "n_service", "n_ramp_east_top", "n_surface_east", "n_surface_west"]
      },
      n_surface_east: {
        id: "n_surface_east",
        x: 440,
        y: 0,
        z: -540,
        type: "switch",
        name: "Восточная развилка (Парковка / Отвал)",
        activeBranch: 0,
        branches: ["n_dump", "n_parking", "n_surface_mid"]
      },

      // 2. ЗАПАДНЫЙ СЪЕЗД (West Ramp — плавный серпантин по западной чаше карьера)
      n_ramp_west_top: { id: "n_ramp_west_top", x: -360, y: 0, z: -372, type: "waypoint", name: "Западный въезд в карьер" },
      n_w_b1: { id: "n_w_b1", x: -560, y: -45, z: -80, type: "waypoint", name: "Западный съезд (-45м)" },
      n_w_b1_hub: {
        id: "n_w_b1_hub",
        x: -489,
        y: -45,
        z: 181,
        type: "switch",
        name: "Развилка горизонта -45м",
        activeBranch: 0,
        branches: ["n_w_b2", "n_exc_waste"]
      },
      n_exc_waste: { id: "n_exc_waste", x: -349, y: -45, z: 277, type: "station", target: "exc_3", name: "Забой 3 (Вскрыша • Liebherr 9250)" },
      n_w_b2: { id: "n_w_b2", x: -370, y: -95, z: 150, type: "waypoint", name: "Западный съезд (-95м)" },
      n_w_b2_hub: {
        id: "n_w_b2_hub",
        x: -285,
        y: -95,
        z: -204,
        type: "switch",
        name: "Развилка горизонта -95м",
        activeBranch: 0,
        branches: ["n_w_b3", "n_exc_mid"]
      },
      n_exc_mid: { id: "n_exc_mid", x: -188, y: -95, z: -241, type: "station", target: "exc_2", name: "Забой 2 (Рядовая руда • Liebherr 9250)" },
      n_w_b3: { id: "n_w_b3", x: -225, y: -145, z: 140, type: "waypoint", name: "Западный спуск (-145м)" },
      n_w_b4: { id: "n_w_b4", x: -80, y: -195, z: 85, type: "waypoint", name: "Западный въезд на дно (-195м)" },

      // 3. ВОСТОЧНЫЙ ПОДЪЕМ / СЪЕЗД (East Ramp — симметричный серпантин по восточной чаше карьера)
      n_ramp_east_top: { id: "n_ramp_east_top", x: 360, y: 0, z: -372, type: "waypoint", name: "Восточный въезд в карьер" },
      n_e_b1: { id: "n_e_b1", x: 560, y: -45, z: -80, type: "waypoint", name: "Восточный серпантин (-45м)" },
      n_e_b2: { id: "n_e_b2", x: 370, y: -95, z: 150, type: "waypoint", name: "Восточный серпантин (-95м)" },
      n_e_b3: { id: "n_e_b3", x: 225, y: -145, z: 140, type: "waypoint", name: "Восточный спуск (-145м)" },
      n_e_b4: { id: "n_e_b4", x: 80, y: -195, z: 85, type: "waypoint", name: "Восточный въезд на дно (-195м)" },

      // 4. ПРОСТОРНОЕ ДНО КАРЬЕРА (-195м) — 2 мощных экскаватора Liebherr 9400
      n_floor_hub: {
        id: "n_floor_hub",
        x: 0,
        y: -195,
        z: 20,
        type: "switch",
        name: "Центральный узел дна (-195м)",
        activeBranch: 0,
        branches: ["n_exc_deep", "n_exc_deep2"]
      },
      n_exc_deep: { id: "n_exc_deep", x: -100, y: -195, z: 20, type: "station", target: "exc_1", name: "Забой 1 (Богатая руда Fe 62% • Liebherr 9400)" },
      n_exc_deep2: { id: "n_exc_deep2", x: 100, y: -195, z: 20, type: "station", target: "exc_4", name: "Забой 4 (Богатая руда Fe 64% • Liebherr 9400)" },

      // 5. ПЛОЩАДКА ОТСТОЯ И СЕРВИСНЫЙ АНГАР РМЦ (Резерв техники, 14 боксов, 130м от РМЦ и 130м от Отвала)
      n_parking: {
        id: "n_parking",
        x: 440,
        y: 0,
        z: -700,
        type: "station",
        target: "parking",
        name: "Площадка отстоя и сервисный ангар РМЦ"
      }
    };

    // Соединения графа дорог
    this.edges = [
      // Поверхность: Магистрали к ГОФ, Отвалу, АЗС, РМЦ и площадке отстоя
      { from: "n_surface_west", to: "n_gof", distanceM: 250, maxSpeed: 45, isRamp: false },
      { from: "n_surface_west", to: "n_fuel", distanceM: 300, maxSpeed: 35, isRamp: false },
      { from: "n_surface_west", to: "n_ramp_west_top", distanceM: 160, maxSpeed: 35, isRamp: false },
      { from: "n_surface_west", to: "n_surface_mid", distanceM: 520, maxSpeed: 45, isRamp: false },
      { from: "n_surface_mid", to: "n_fuel", distanceM: 290, maxSpeed: 40, isRamp: false },
      { from: "n_surface_mid", to: "n_service", distanceM: 160, maxSpeed: 30, isRamp: false },
      { from: "n_surface_mid", to: "n_ramp_east_top", distanceM: 160, maxSpeed: 35, isRamp: false },
      { from: "n_surface_mid", to: "n_surface_east", distanceM: 300, maxSpeed: 45, isRamp: false },
      { from: "n_fuel", to: "n_service", distanceM: 260, maxSpeed: 30, isRamp: false },
      { from: "n_service", to: "n_parking", distanceM: 300, maxSpeed: 30, isRamp: false },
      { from: "n_surface_east", to: "n_parking", distanceM: 160, maxSpeed: 30, isRamp: false },
      { from: "n_surface_east", to: "n_dump", distanceM: 330, maxSpeed: 45, isRamp: false },

      // Западный съезд (West Ramp)
      { from: "n_ramp_west_top", to: "n_w_b1", distanceM: 460, maxSpeed: 30, isRamp: true, level: 1 },
      { from: "n_w_b1", to: "n_w_b1_hub", distanceM: 360, maxSpeed: 30, isRamp: false, level: 1 },
      { from: "n_w_b1_hub", to: "n_exc_waste", distanceM: 260, maxSpeed: 25, isRamp: false, level: 1 },
      { from: "n_w_b1_hub", to: "n_w_b2", distanceM: 380, maxSpeed: 25, isRamp: true, level: 2 },
      { from: "n_w_b2", to: "n_w_b2_hub", distanceM: 210, maxSpeed: 25, isRamp: false, level: 2 },
      { from: "n_w_b2_hub", to: "n_exc_mid", distanceM: 160, maxSpeed: 25, isRamp: false, level: 2 },
      { from: "n_w_b2_hub", to: "n_w_b3", distanceM: 320, maxSpeed: 25, isRamp: true, level: 3 },
      { from: "n_w_b3", to: "n_w_b4", distanceM: 220, maxSpeed: 20, isRamp: true, level: 4 },
      { from: "n_w_b4", to: "n_exc_deep", distanceM: 90, maxSpeed: 25, isRamp: false, level: 4 },

      // Восточный съезд (East Ramp)
      { from: "n_ramp_east_top", to: "n_e_b1", distanceM: 460, maxSpeed: 30, isRamp: true, level: 1 },
      { from: "n_e_b1", to: "n_e_b2", distanceM: 380, maxSpeed: 25, isRamp: true, level: 2 },
      { from: "n_e_b2", to: "n_e_b3", distanceM: 320, maxSpeed: 25, isRamp: true, level: 3 },
      { from: "n_e_b3", to: "n_e_b4", distanceM: 220, maxSpeed: 20, isRamp: true, level: 4 },
      { from: "n_e_b4", to: "n_exc_deep2", distanceM: 90, maxSpeed: 25, isRamp: false, level: 4 },

      // Прямая соединительная трасса между забоями 1 и 4 через центральный узел
      { from: "n_exc_deep", to: "n_floor_hub", distanceM: 100, maxSpeed: 25, isRamp: false, level: 4 },
      { from: "n_floor_hub", to: "n_exc_deep2", distanceM: 100, maxSpeed: 25, isRamp: false, level: 4 }
    ];

    this.initCurves();
  }

  /**
   * Генерация плавных криволинейных 3D сплайнов для каждого ребра
   */
  initCurves() {
    this.edges.forEach(edge => {
      const p1 = this.getNode(edge.from);
      const p2 = this.getNode(edge.to);
      if (!p1 || !p2) return;

      const v1 = new THREE.Vector3(p1.x, p1.y || 0, p1.z !== undefined ? p1.z : p1.y);
      const v2 = new THREE.Vector3(p2.x, p2.y || 0, p2.z !== undefined ? p2.z : p2.y);

      const pts = [v1];
      const eRatio = 430 / 720; // 0.59722

      // Криволинейная дуга вдоль чаши карьера генерируется ТОЛЬКО для рамп и горизонтальных уступов чаши,
      // но НЕ для плоского дна карьера (-195м) и не для площадок поверхности!
      const isFloor = (p1.y <= -190 && p2.y <= -190);
      const isBowlRoad = (edge.isRamp || (p1.y < 0 && p2.y < 0)) && !isFloor;

      if (isBowlRoad) {
        const th1 = Math.atan2(v1.z / eRatio, v1.x);
        let th2 = Math.atan2(v2.z / eRatio, v2.x);

        let diff = th2 - th1;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const isRamp = Math.abs(v1.y - v2.y) > 5;
        const numSub = 14;
        for (let i = 1; i < numSub; i++) {
          const frac = i / numSub;
          const th = th1 + diff * frac;
          const y = v1.y + (v2.y - v1.y) * frac;
          
          let r;
          if (isRamp) {
            // Радиус строго повторяет профиль откосов уступов карьера, исключая врезание в стены
            if (y >= -45) {
              r = 600 + ((y + 45) / 45) * 120;
            } else if (y >= -95) {
              r = 460 + ((y + 95) / 50) * 100;
            } else if (y >= -145) {
              r = 340 + ((y + 145) / 50) * 90;
            } else {
              r = 220 + ((y + 195) / 50) * 90;
            }
          } else {
            const r1 = Math.hypot(v1.x, v1.z / eRatio);
            const r2 = Math.hypot(v2.x, v2.z / eRatio);
            r = r1 + (r2 - r1) * frac;
          }

          pts.push(new THREE.Vector3(
            r * Math.cos(th),
            y,
            r * eRatio * Math.sin(th)
          ));
        }
      } else {
        // Прямой участок: плоское дно карьера, магистрали поверхности или прямые съезды
        const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        pts.push(mid);
      }

      pts.push(v2);

      // CatmullRomCurve3 обеспечивает 100% плавность без изломов
      edge.curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
      edge.distanceM = Math.round(edge.curve.getLength());
    });
  }

  /**
   * Точный расчет позиции в очереди вдоль трассы подхода к станции
   */
  getPositionBackAlongPath(targetNodeId, distanceMeters) {
    const approachPaths = {
      n_exc_deep: ["n_exc_deep", "n_floor_hub", "n_w_b4", "n_w_b3", "n_w_b2_hub"],
      n_exc_deep2: ["n_exc_deep2", "n_floor_hub", "n_e_b4", "n_e_b3", "n_e_b2"],
      n_exc_mid: ["n_exc_mid", "n_w_b2_hub", "n_w_b2", "n_w_b1_hub"],
      n_exc_waste: ["n_exc_waste", "n_w_b1_hub", "n_w_b1", "n_ramp_west_top"],
      n_gof: ["n_gof", "n_surface_west", "n_ramp_west_top", "n_surface_mid"],
      n_dump: ["n_dump", "n_surface_east", "n_surface_mid"],
      n_fuel: ["n_fuel", "n_surface_west", "n_surface_mid"],
      n_service: ["n_service", "n_surface_mid", "n_surface_east"],
      n_parking: ["n_parking", "n_surface_east", "n_surface_mid"]
    };

    const chain = approachPaths[targetNodeId];
    if (!chain || chain.length < 2) return null;

    let remainingDist = distanceMeters;

    for (let c = 0; c < chain.length - 1; c++) {
      const fromNodeId = chain[c];
      const toNodeId = chain[c + 1];
      const edge = this.getEdge(fromNodeId, toNodeId);
      if (!edge || !edge.curve) continue;

      const edgeLen = edge.distanceM;
      const isDirect = (edge.from === fromNodeId && edge.to === toNodeId);

      if (remainingDist <= edgeLen) {
        const frac = remainingDist / edgeLen;
        const curveT = isDirect ? frac : (1.0 - frac);
        const pt = edge.curve.getPointAt(curveT);
        let tgt = edge.curve.getTangentAt(curveT);
        if (!isDirect) tgt = tgt.clone().negate();

        // Правостороннее смещение полосы (3.2м), чтобы очереди стояли ровно в своей полосе
        const rightX = tgt.z;
        const rightZ = -tgt.x;
        const laneOffset = 3.2;

        return {
          pos: new THREE.Vector3(pt.x + rightX * laneOffset, pt.y, pt.z + rightZ * laneOffset),
          yaw: Math.atan2(tgt.x, tgt.z),
          pitch: Math.atan2(tgt.y, Math.hypot(tgt.x, tgt.z))
        };
      }

      remainingDist -= edgeLen;
    }

    return null;
  }

  getEdge(fromId, toId) {
    return this.edges.find(e => 
      (e.from === fromId && e.to === toId) || 
      (e.from === toId && e.to === fromId)
    );
  }

  toggleSwitch(nodeId) {
    const node = this.nodes[nodeId];
    if (node && node.type === "switch") {
      node.activeBranch = (node.activeBranch + 1) % node.branches.length;
      return node.branches[node.activeBranch];
    }
    return null;
  }

  /**
   * Автоматический перевод стрелочного указателя СЦБ по ходу поезда машины
   */
  alignSwitchForTruck(truck, switchNodeId) {
    const switchNode = this.nodes[switchNodeId];
    if (!switchNode || switchNode.type !== "switch" || !switchNode.branches) return null;

    let target = truck.targetStationId;
    if (!target) {
      target = truck.isLoaded ? (truck.loadType === "waste" ? "n_dump" : "n_gof") : "n_exc_deep";
    }

    const path = this.findPath(switchNodeId, target);
    if (path && path.length > 1) {
      const nextStep = path[1];
      const branchIdx = switchNode.branches.indexOf(nextStep);
      if (branchIdx !== -1 && switchNode.activeBranch !== branchIdx) {
        switchNode.activeBranch = branchIdx;
        const targetNode = this.nodes[nextStep];
        return {
          switchNode,
          branchName: targetNode ? targetNode.name : nextStep
        };
      }
    }
    return null;
  }

  getNode(nodeId) {
    return this.nodes[nodeId];
  }

  /**
   * Графовый поиск пути (BFS / Dijkstra) с учетом активных стрелок
   */
  findPath(startId, targetId) {
    if (!startId || !targetId) return null;
    if (startId === targetId) return [startId];

    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr === targetId) return path;

      const neighbors = [];
      const currNode = this.nodes[curr];

      // Стрелочный перевод отдает приоритет выбранной ветке
      if (currNode && currNode.type === "switch" && currNode.branches) {
        const active = currNode.branches[currNode.activeBranch];
        if (active) neighbors.push(active);
        currNode.branches.forEach(b => {
          if (!neighbors.includes(b)) neighbors.push(b);
        });
      }

      this.edges.forEach(e => {
        let nxt = null;
        if (e.from === curr) nxt = e.to;
        else if (e.to === curr) nxt = e.from;
        if (nxt && !neighbors.includes(nxt)) neighbors.push(nxt);
      });

      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt);
          queue.push([...path, nxt]);
        }
      }
    }

    return null;
  }

  getNextNode(currentNodeId, targetNodeId, isLoaded) {
    if (!targetNodeId) {
      if (isLoaded) {
        targetNodeId = "n_gof";
      } else {
        const curr = this.nodes[currentNodeId];
        if (curr && curr.type === "switch" && curr.branches && curr.branches.length > 0) {
          const branchTarget = curr.branches[curr.activeBranch];
          if (branchTarget) {
            return branchTarget;
          }
        }
        targetNodeId = "n_parking";
      }
    }

    // Если самосвал на станции назначения — он прибыл
    if (currentNodeId === targetNodeId) {
      return null;
    }

    const path = this.findPath(currentNodeId, targetNodeId);
    if (path && path.length > 1) {
      return path[1];
    }

    return null;
  }
}
