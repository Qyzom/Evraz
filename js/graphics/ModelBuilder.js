/**
 * Построитель 3D геометрии карьера, фабрик, техники и ландшафта
 * Реалистичный разрез карьера, богатое промышленное окружение, тайга и техника
 */

import * as THREE from "three";
import { TextureGenerator } from "./TextureGenerator.js";

export class ModelBuilder {
  /**
   * Построение 3D разреза карьера с уступами, бермами и геологическим срезом
   */
  /**
   * Построение 3D разреза карьера с уступами, бермами и геологическим срезом
   */
  /**
   * Функция высоты рельефа окружающей местности
   */
  /**
   * Функция высоты рельефа окружающей местности
   */
  /**
   * Функция высоты рельефа окружающей местности
   */
  static getTerrainElevation(x, z) {
    const rimRX = 720;
    const rimRZ = 430;
    const distRatio = Math.sqrt((x * x) / (rimRX * rimRX) + (z * z) / (rimRZ * rimRZ));

    // Промплощадка на севере (ГОФ, РМЦ, АЗС, ЦУП, Отвал) — строго ровный плоский горизонт 0м
    if (z <= -240 && z >= -950 && Math.abs(x) <= 1000) return 0;

    const blend = Math.min(1.0, (distRatio - 1.05) * 2.2);

    // Волнистый рельеф сибирских сопок и гряд
    const h1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 28.0;
    const h2 = Math.sin(x * 0.012 + 1.2) * 14.0;
    const h3 = Math.cos(z * 0.011 - 0.7) * 14.0;
    let elevation = (h1 + h2 + h3) * blend;

    // Плавный подъем рельефа к подножию внешнего горного хребта (барьер высоты для камеры)
    const distCenter = Math.hypot(x, z);
    if (distCenter > 1150) {
      const t = (distCenter - 1150) / 380;
      elevation += Math.pow(Math.max(0, t), 1.7) * 320.0;
    }
    return Math.max(0, elevation);
  }

  /**
   * Вычисление точной высоты поверхности карьера и окружающего ландшафта в точке (x, z)
   * Используется для безошибочной физической коллизии камеры во всех режимах (в т.ч. свободной камере)
   */
  static getSurfaceHeight(x, z) {
    const ellipseRatio = 430 / 720; // 0.59722
    const normZ = z / ellipseRatio;
    const r = Math.hypot(x, normZ);

    if (r >= 720) {
      return this.getTerrainElevation(x, z);
    }
    // Откос уступа 1 (горизонт 0м -> -45м)
    if (r >= 600) return -45 + ((r - 600) / 120) * 45;
    // Берма 1 (горизонт -45м)
    if (r >= 560) return -45;
    // Откос уступа 2 (горизонт -45м -> -95м)
    if (r >= 460) return -95 + ((r - 460) / 100) * 50;
    // Берма 2 (горизонт -95м)
    if (r >= 430) return -95;
    // Откос уступа 3 (горизонт -95м -> -145м)
    if (r >= 340) return -145 + ((r - 340) / 90) * 50;
    // Берма 3 (горизонт -145м)
    if (r >= 310) return -145;
    // Откос уступа 4 (горизонт -145м -> -195м)
    if (r >= 220) return -195 + ((r - 220) / 90) * 50;
    // Дно карьера (горизонт -195м)
    return -195;
  }

  /**
   * 3D Горный хребет по всему периметру горизонта (360 градусов)
   */
  static buildMountainRing() {
    const mountainGroup = new THREE.Group();
    mountainGroup.name = "mountains_ring";

    const strataTex = TextureGenerator.createStrataTexture();
    strataTex.wrapS = THREE.RepeatWrapping;
    strataTex.wrapT = THREE.ClampToEdgeWrapping;
    strataTex.repeat.set(4, 2);

    const rockMat = new THREE.MeshStandardMaterial({
      map: strataTex,
      color: "#6E6359",
      roughness: 0.88,
      metalness: 0.12,
      flatShading: false
    });

    const snowPeakMat = new THREE.MeshStandardMaterial({
      color: "#9C948B",
      roughness: 0.82,
      metalness: 0.1,
      flatShading: false
    });

    const peakCount = 48;
    for (let i = 0; i < peakCount; i++) {
      const angle = (i / peakCount) * Math.PI * 2;
      const dist = 2250 + (i % 4) * 110 + Math.sin(i * 3.7) * 90;
      const height = 540 + (i % 6) * 75 + Math.cos(i * 2.3) * 80;
      const baseRadius = 340 + (i % 5) * 45;
      const segs = 32;

      const peakGeo = new THREE.ConeGeometry(baseRadius, height, segs, 8);
      const pos = peakGeo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const py = pos.getY(j);
        const t = Math.max(0, 1 - (py + height / 2) / height);
        const flare = Math.pow(t, 1.35) * 1.45 + (1 - t) * 0.9;
        pos.setX(j, pos.getX(j) * flare + Math.sin(py * 0.02 + i) * 14);
        pos.setZ(j, pos.getZ(j) * flare + Math.cos(py * 0.02 + i) * 14);
      }
      peakGeo.computeVertexNormals();
      peakGeo.translate(0, height / 2 - 25, 0);

      const mat = (height > 600) ? snowPeakMat : rockMat;
      const peak = new THREE.Mesh(peakGeo, mat);
      peak.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      peak.rotation.y = angle + (i % 3) * 0.4;
      peak.scale.set(1.15 + (i % 3) * 0.25, 1.0, 1.05 + (i % 2) * 0.3);
      peak.receiveShadow = true;
      mountainGroup.add(peak);
    }

    return mountainGroup;
  }

  /**
   * Построение 3D разреза карьера с уступами, бермами и рельефом
   */
  static buildQuarryMesh(quarry) {
    const quarryGroup = new THREE.Group();
    quarryGroup.name = "quarry_pit";

    const groundTex = TextureGenerator.createGroundTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.88,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    // 1. Аккуратные стилобаты-фундаменты под корпуса фабрик (строго под габаритом зданий, не вылезая на автодороги)
    const plinthMat = new THREE.MeshStandardMaterial({ color: "#2B313A", roughness: 0.85 });
    
    // Фундамент ГОФ (главный корпус, 3 силоса и рампа бункера)
    const gofPlinth = new THREE.Mesh(new THREE.BoxGeometry(160, 0.2, 140), plinthMat);
    gofPlinth.position.set(-580, 0.1, -685);
    gofPlinth.receiveShadow = true;
    quarryGroup.add(gofPlinth);

    // Фундамент ЦУП (диспетчерская и мачта связи)
    const cupPlinth = new THREE.Mesh(new THREE.BoxGeometry(90, 0.2, 70), plinthMat);
    cupPlinth.position.set(-350, 0.1, -720);
    cupPlinth.receiveShadow = true;
    quarryGroup.add(cupPlinth);

    // Фундамент АЗС (резервуары дизельного топлива и ТРК-колонки)
    const fuelPlinth = new THREE.Mesh(new THREE.BoxGeometry(120, 0.2, 80), plinthMat);
    fuelPlinth.position.set(-120, 0.1, -700);
    fuelPlinth.receiveShadow = true;
    quarryGroup.add(fuelPlinth);

    // Фундамент РМЦ (сервисный ангар, кран и склад крупногабаритных шин)
    const rmcPlinth = new THREE.Mesh(new THREE.BoxGeometry(160, 0.2, 90), plinthMat);
    rmcPlinth.position.set(140, 0.1, -700);
    rmcPlinth.receiveShadow = true;
    quarryGroup.add(rmcPlinth);

    // 2. Вокруг карьера: кольцо естественного рельефа сибирской тайги
    const rimRX = 720;
    const rimRZ = 430;
    const ellipseRatio = rimRZ / rimRX; // 0.59722

    const ringTerrainGeo = new THREE.RingGeometry(rimRX, 2600, 80, 40);
    ringTerrainGeo.rotateX(-Math.PI / 2);
    ringTerrainGeo.scale(1, 1, ellipseRatio);

    const pos = ringTerrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = this.getTerrainElevation(vx, vz);
      pos.setY(i, vy);
    }
    ringTerrainGeo.computeVertexNormals();

    const ringTerrain = new THREE.Mesh(ringTerrainGeo, groundMat);
    ringTerrain.receiveShadow = true;
    quarryGroup.add(ringTerrain);

    // 3. Вмещающий геологический массив (внешние скальные стены)
    const strataTex = TextureGenerator.createStrataTexture();
    const blockMat = new THREE.MeshStandardMaterial({
      map: strataTex,
      roughness: 0.92,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    const blockDepth = -210;
    const halfW = 2600;
    const halfD = 2600;

    const wallNorth = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, Math.abs(blockDepth)), blockMat);
    wallNorth.position.set(0, blockDepth / 2, -halfD);
    quarryGroup.add(wallNorth);

    const wallSouth = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, Math.abs(blockDepth)), blockMat);
    wallSouth.position.set(0, blockDepth / 2, halfD);
    wallSouth.rotation.y = Math.PI;
    quarryGroup.add(wallSouth);

    const wallEast = new THREE.Mesh(new THREE.PlaneGeometry(halfD * 2, Math.abs(blockDepth)), blockMat);
    wallEast.position.set(halfW, blockDepth / 2, 0);
    wallEast.rotation.y = -Math.PI / 2;
    quarryGroup.add(wallEast);

    const wallWest = new THREE.Mesh(new THREE.PlaneGeometry(halfD * 2, Math.abs(blockDepth)), blockMat);
    wallWest.position.set(-halfW, blockDepth / 2, 0);
    wallWest.rotation.y = Math.PI / 2;
    quarryGroup.add(wallWest);

    // 4. Расширенные просторные уступы и бермы карьера (Горизонты 0, -45м, -95м, -145м, -195м)
    // 4. Текстурированные уступы, бермы и геологический разрез карьера с естественной неидеальностью рельефа
    const pitSlopeTex = TextureGenerator.createPitSlopeTexture();
    const pitFloorTex = TextureGenerator.createPitFloorTexture();

    const benches = [
      { topY: 0,    botY: -45,  rTop: 720, rBot: 600, color: "#6A6158" },
      { topY: -45,  botY: -95,  rTop: 560, rBot: 460, bermOuter: 600, bermInner: 560, color: "#74695F" },
      { topY: -95,  botY: -145, rTop: 430, rBot: 340, bermOuter: 460, bermInner: 430, color: "#82756A" },
      { topY: -145, botY: -195, rTop: 310, rBot: 220, bermOuter: 340, bermInner: 310, color: "#918174" }
    ];

    benches.forEach(b => {
      // Горизонтальная широкая берма безопасности с текстурой щебня и легкой естественной шероховатостью
      if (b.bermOuter && b.bermInner) {
        const bermGeo = new THREE.RingGeometry(b.bermInner, b.bermOuter, 72, 4);
        bermGeo.rotateX(-Math.PI / 2);
        bermGeo.scale(1, 1, ellipseRatio);
        bermGeo.translate(0, b.topY, 0);

        bermGeo.computeVertexNormals();

        const bermMat = new THREE.MeshStandardMaterial({
          map: pitFloorTex,
          color: "#D0C9C2",
          roughness: 0.90,
          side: THREE.DoubleSide
        });
        const bermMesh = new THREE.Mesh(bermGeo, bermMat);
        bermMesh.receiveShadow = true;
        quarryGroup.add(bermMesh);
      }

      // Откос уступа карьера с текстурой геологических пластов и реалистичной скальной текстурой
      const h = Math.abs(b.botY - b.topY);
      const slopeGeo = new THREE.CylinderGeometry(b.rTop, b.rBot, h, 80, 8, true);
      slopeGeo.scale(1, 1, ellipseRatio);
      slopeGeo.translate(0, (b.topY + b.botY) / 2, 0);
      slopeGeo.computeVertexNormals();

      const slopeMat = new THREE.MeshStandardMaterial({
        map: pitSlopeTex,
        color: "#DDD8D2",
        roughness: 0.86,
        metalness: 0.08,
        side: THREE.DoubleSide
      });
      const slopeMesh = new THREE.Mesh(slopeGeo, slopeMat);
      slopeMesh.receiveShadow = true;
      quarryGroup.add(slopeMesh);
    });

    // 5. Просторное дно карьера (богатый горизонт -195м) с текстурой и микрорельефом
    const floorGeo = new THREE.CircleGeometry(224, 64, 4);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.scale(1, 1, ellipseRatio);
    floorGeo.translate(0, -195, 0);

    const fPos = floorGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const fx = fPos.getX(i);
      const fz = fPos.getZ(i);
      const fy = fPos.getY(i);
      const floorBump = Math.sin(fx * 0.06) * Math.cos(fz * 0.06) * 0.28;
      fPos.setY(i, fy + floorBump);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({
      map: pitFloorTex,
      color: "#5C4E43",
      roughness: 0.94,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    quarryGroup.add(floorMesh);

    // 6. Аккуратные скальные постаменты забоев (цоколи под рабочими площадками)
    const platformMat = new THREE.MeshStandardMaterial({
      color: "#2C2621",
      roughness: 0.96,
      metalness: 0.04,
      side: THREE.DoubleSide
    });

    // Забой 1 (Отметка -195м, Liebherr 9400, Богатая руда на просторном дне)
    const p1Geo = new THREE.CylinderGeometry(30, 32, 0.6, 36);
    const p1 = new THREE.Mesh(p1Geo, platformMat);
    p1.position.set(-100, -195 + 0.3, 20);
    p1.receiveShadow = true;
    quarryGroup.add(p1);

    // Забой 2 (Отметка -95м, Liebherr 9250, Рядовая руда)
    const p2Geo = new THREE.CylinderGeometry(26, 28, 0.6, 32);
    const p2 = new THREE.Mesh(p2Geo, platformMat);
    p2.position.set(-188, -95 + 0.3, -241);
    p2.receiveShadow = true;
    quarryGroup.add(p2);

    // Забой 3 (Отметка -45м, Liebherr 9250, Вскрыша)
    const p3Geo = new THREE.CylinderGeometry(28, 30, 0.6, 32);
    const p3 = new THREE.Mesh(p3Geo, platformMat);
    p3.position.set(-349, -45 + 0.3, 277);
    p3.receiveShadow = true;
    quarryGroup.add(p3);

    // Забой 4 (Отметка -195м, Liebherr 9400, Богатая руда Сектор Восток на просторном дне)
    const p4Geo = new THREE.CylinderGeometry(30, 32, 0.6, 36);
    const p4 = new THREE.Mesh(p4Geo, platformMat);
    p4.position.set(100, -195 + 0.3, 20);
    p4.receiveShadow = true;
    quarryGroup.add(p4);

    return quarryGroup;
  }

  /**
   * Построение процедурных технологических автодорог карьера АСУ ГТК
   * Полноценные массивные скальные насыпи, вытянутые вниз к уступам, чтобы дороги не висели в воздухе!
   */
  static buildRoadsMesh(quarry) {
    const roadsGroup = new THREE.Group();
    roadsGroup.name = "roads_network";

    const roadTex = TextureGenerator.createRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.92,
      metalness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -3.0
    });

    const shoulderMat = new THREE.MeshStandardMaterial({
      color: "#3E352B",
      roughness: 0.96,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0
    });

    const roadWidth = 18; // Широкая двухполосная трасса технологического транспорта
    const shoulderWidth = 3.5;

    quarry.edges.forEach(edge => {
      if (!edge.curve) return;

      const numSamples = Math.max(18, Math.round(edge.distanceM / 9));
      const pts = edge.curve.getPoints(numSamples);
      if (!pts || pts.length < 2) return;

      const positions = [];
      const normals = [];
      const uvs = [];

      const shPositions = [];
      const shNormals = [];

      let totalDist = 0;

      let pLeftPrev = null;
      let pRightPrev = null;
      let pOutLPrev = null;
      let pOutRPrev = null;
      let prevGOutL = 0;
      let prevGOutR = 0;
      let prevSide = null;

      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const pt = pts[i];
        const tangent = edge.curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const isPitOrRamp = edge.isRamp || (Math.abs(pt.y || 0) >= 1.0);

        // Поперечный профиль дороги (плановые координаты)
        const outL_x = pt.x - side.x * (roadWidth / 2 + shoulderWidth);
        const outL_z = pt.z - side.z * (roadWidth / 2 + shoulderWidth);
        const outR_x = pt.x + side.x * (roadWidth / 2 + shoulderWidth);
        const outR_z = pt.z + side.z * (roadWidth / 2 + shoulderWidth);

        // Высоты рельефа под полотном и обочинами
        const gCenter = ModelBuilder.getSurfaceHeight(pt.x, pt.z);
        const gOutL = ModelBuilder.getSurfaceHeight(outL_x, outL_z);
        const gOutR = ModelBuilder.getSurfaceHeight(outR_x, outR_z);
        const maxLocalGround = Math.max(gCenter, gOutL, gOutR);

        // Полотно дороги всегда лежит строго поверх рельефа, предотвращая врезание в скальные уступы карьера
        const baseHeight = Math.max(pt.y || 0, maxLocalGround);
        const yElev = baseHeight + (isPitOrRamp ? 0.45 : 0.25);

        const leftP = new THREE.Vector3(pt.x - side.x * (roadWidth / 2), yElev, pt.z - side.z * (roadWidth / 2));
        const rightP = new THREE.Vector3(pt.x + side.x * (roadWidth / 2), yElev, pt.z + side.z * (roadWidth / 2));
        const outerLeftP = new THREE.Vector3(outL_x, yElev - 0.05, outL_z);
        const outerRightP = new THREE.Vector3(outR_x, yElev - 0.05, outR_z);

        if (i > 0) {
          const segDist = pt.distanceTo(pts[i - 1]);
          const u0 = totalDist / 38;
          const u1 = (totalDist + segDist) / 38;
          totalDist += segDist;

          // 1. Основное полотно автодороги
          positions.push(
            pLeftPrev.x, pLeftPrev.y, pLeftPrev.z,
            pRightPrev.x, pRightPrev.y, pRightPrev.z,
            leftP.x, leftP.y, leftP.z,

            leftP.x, leftP.y, leftP.z,
            pRightPrev.x, pRightPrev.y, pRightPrev.z,
            rightP.x, rightP.y, rightP.z
          );

          for (let k = 0; k < 6; k++) normals.push(0, 1, 0);

          uvs.push(
            0, u0,
            1, u0,
            0, u1,

            0, u1,
            1, u0,
            1, u1
          );

          // 2. Обочины
          shPositions.push(
            pOutLPrev.x, pOutLPrev.y, pOutLPrev.z,
            pLeftPrev.x, pLeftPrev.y, pLeftPrev.z,
            outerLeftP.x, outerLeftP.y, outerLeftP.z,

            outerLeftP.x, outerLeftP.y, outerLeftP.z,
            pLeftPrev.x, pLeftPrev.y, pLeftPrev.z,
            leftP.x, leftP.y, leftP.z,

            pRightPrev.x, pRightPrev.y, pRightPrev.z,
            pOutRPrev.x, pOutRPrev.y, pOutRPrev.z,
            rightP.x, rightP.y, rightP.z,

            rightP.x, rightP.y, rightP.z,
            pOutRPrev.x, pOutRPrev.y, pOutRPrev.z,
            outerRightP.x, outerRightP.y, outerRightP.z
          );

          for (let k = 0; k < 12; k++) shNormals.push(0, 0.9, 0.1);

          // 3. Цоколь / массивные откосы насыпи вниз до рельефа (3D Embankment Skirts):
          // Опускаем нижние вершины насыпи ВСЕГДА до реального уровня рельефа под обочиной (и еще на 0.8м в скалу),
          // гарантируя, что насыпь смыкается с уступами и бермами и нигде не висит в воздухе!
          const pOutLPrev_bot = new THREE.Vector3(
            pOutLPrev.x,
            Math.min(pOutLPrev.y - 1.8, prevGOutL - 0.8),
            pOutLPrev.z
          );
          const outerLeftP_bot = new THREE.Vector3(
            outerLeftP.x,
            Math.min(outerLeftP.y - 1.8, gOutL - 0.8),
            outerLeftP.z
          );
          const pOutRPrev_bot = new THREE.Vector3(
            pOutRPrev.x,
            Math.min(pOutRPrev.y - 1.8, prevGOutR - 0.8),
            pOutRPrev.z
          );
          const outerRightP_bot = new THREE.Vector3(
            outerRightP.x,
            Math.min(outerRightP.y - 1.8, gOutR - 0.8),
            outerRightP.z
          );

          // Левый откос насыпи
          shPositions.push(
            pOutLPrev.x, pOutLPrev.y, pOutLPrev.z,
            pOutLPrev_bot.x, pOutLPrev_bot.y, pOutLPrev_bot.z,
            outerLeftP.x, outerLeftP.y, outerLeftP.z,

            outerLeftP.x, outerLeftP.y, outerLeftP.z,
            pOutLPrev_bot.x, pOutLPrev_bot.y, pOutLPrev_bot.z,
            outerLeftP_bot.x, outerLeftP_bot.y, outerLeftP_bot.z
          );
          for (let k = 0; k < 6; k++) shNormals.push(-prevSide.x, 0.35, -prevSide.z);

          // Правый откос насыпи
          shPositions.push(
            pOutRPrev.x, pOutRPrev.y, pOutRPrev.z,
            outerRightP.x, outerRightP.y, outerRightP.z,
            pOutRPrev_bot.x, pOutRPrev_bot.y, pOutRPrev_bot.z,

            outerRightP.x, outerRightP.y, outerRightP.z,
            outerRightP_bot.x, outerRightP_bot.y, outerRightP_bot.z,
            pOutRPrev_bot.x, pOutRPrev_bot.y, pOutRPrev_bot.z
          );
          for (let k = 0; k < 6; k++) shNormals.push(prevSide.x, 0.35, prevSide.z);
        }

        pLeftPrev = leftP;
        pRightPrev = rightP;
        pOutLPrev = outerLeftP;
        pOutRPrev = outerRightP;
        prevGOutL = gOutL;
        prevGOutR = gOutR;
        prevSide = side;
      }

      if (positions.length > 0) {
        const roadGeo = new THREE.BufferGeometry();
        roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        roadGeo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.receiveShadow = true;
        roadMesh.renderOrder = 1;
        roadsGroup.add(roadMesh);

        const shGeo = new THREE.BufferGeometry();
        shGeo.setAttribute("position", new THREE.Float32BufferAttribute(shPositions, 3));
        shGeo.setAttribute("normal", new THREE.Float32BufferAttribute(shNormals, 3));
        const shMesh = new THREE.Mesh(shGeo, shoulderMat);
        shMesh.receiveShadow = true;
        shMesh.renderOrder = 1;
        roadsGroup.add(shMesh);
      }
    });

    // Однотонные накладные кругляшки поверх ВСЕХ развилок, перекрестков, серпантинных поворотов и терминалов
    const allCapNodes = [
      // Поверхность: объекты и развилки
      "n_surface_west", "n_surface_mid", "n_surface_east",
      "n_gof", "n_dump", "n_fuel", "n_service", "n_parking",
      // Западный съезд: въезд, все уступы, развилки и въезд на дно
      "n_ramp_west_top", "n_w_b1", "n_w_b1_hub", "n_w_b2", "n_w_b2_hub", "n_w_b3", "n_w_b4",
      // Восточный съезд: въезд, все серпантины уступов и въезд на дно
      "n_ramp_east_top", "n_e_b1", "n_e_b2", "n_e_b3", "n_e_b4",
      // Дно карьера
      "n_floor_hub",
      // Забои экскаваторов
      "n_exc_waste", "n_exc_mid", "n_exc_deep", "n_exc_deep2"
    ];

    const solidCapMat = new THREE.MeshStandardMaterial({
      color: "#463E36", // Однотонный цвет утрамбованного карьерного гравия (без текстурных полос и стыков)
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3.0,
      polygonOffsetUnits: -6.0
    });

    const excavatorCapMat = new THREE.MeshStandardMaterial({
      color: "#38312B", // Однотонный темный цвет рабочей площадки забоя
      roughness: 0.94,
      metalness: 0.06,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3.5,
      polygonOffsetUnits: -7.0
    });

    allCapNodes.forEach(nodeId => {
      const node = quarry.nodes[nodeId];
      if (!node) return;
      const isExcavator = nodeId.startsWith("n_exc_");
      const isStation = ["n_gof", "n_dump", "n_fuel", "n_service", "n_parking"].includes(nodeId);
      const isHub = nodeId.includes("hub") || nodeId.startsWith("n_surface_");

      // Радиус перекрывает ширину полотна и стыки дорог
      const r = isExcavator ? 33 : (isStation ? 22 : (isHub ? 20 : 17));

      const capGeo = new THREE.CircleGeometry(r, 36);
      capGeo.rotateX(-Math.PI / 2);

      const isPitOrRamp = (Math.abs(node.y || 0) >= 1.0);
      const groundY = ModelBuilder.getSurfaceHeight(node.x, node.z);
      const baseY = Math.max(node.y || 0, groundY);

      // Слегка приподнято над полотном дороги (+0.12м), чтобы лежать поверх и перекрывать стыки
      const yElev = baseY + (isExcavator ? 0.72 : (isPitOrRamp ? 0.58 : 0.38));

      const capMesh = new THREE.Mesh(capGeo, isExcavator ? excavatorCapMat : solidCapMat);
      capMesh.position.set(node.x, yElev, node.z);
      capMesh.receiveShadow = true;
      capMesh.renderOrder = 3;
      roadsGroup.add(capMesh);
    });

    return roadsGroup;
  }

  /**
   * Комплекс ГОФ (Главная обогатительная фабрика и дробильное отделение)
   */
  static buildGofComplex(pos = { x: -580, y: 0, z: -680 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "station_gof";

    const facadeTex = TextureGenerator.createGofFacadeTexture();

    // 1. Главный корпус обогатительной фабрики (сдвинут, чтобы передняя стена была строго на Z = +20)
    const mainGeo = new THREE.BoxGeometry(140, 75, 80);
    const mainMats = [
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.7 }), // право
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.7 }), // лево
      new THREE.MeshStandardMaterial({ color: "#1E2227", roughness: 0.9 }), // крыша
      new THREE.MeshStandardMaterial({ color: "#14171A" }),                 // низ
      new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.6 }),   // фасад (лицом к подъезду БелАЗов)
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.7 })  // тыл
    ];
    const mainBuilding = new THREE.Mesh(mainGeo, mainMats);
    mainBuilding.position.set(0, 37.5, -20);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    group.add(mainBuilding);

    // 2. Индустриальная эстакада приемных бункеров на 3 поста разгрузки (стыкуется точно по фасаду Z = +20)
    const bunkerGroup = new THREE.Group();
    bunkerGroup.position.set(0, 0, 38);

    // Мощная монолитная бетонная рампа эстакады
    const rampGeo = new THREE.BoxGeometry(112, 10, 36);
    const rampMat = new THREE.MeshStandardMaterial({ color: "#3B424C", roughness: 0.9 });
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.position.set(0, 5, 0);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    bunkerGroup.add(rampMesh);

    // 3 приемных бункера крупного дробления руды (по 1 на каждый из 3 постов разгрузки БелАЗов)
    const hopperCavityMat = new THREE.MeshStandardMaterial({ color: "#121518", roughness: 0.8 });
    const curbMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
    const grateMat = new THREE.MeshStandardMaterial({ color: "#4A5568", metalness: 0.7, roughness: 0.3 });

    const postOffsetsX = [-32, 0, 32];
    postOffsetsX.forEach(posX => {
      // Приемный лоток бункера
      const cavityGeo = new THREE.BoxGeometry(24, 4, 16);
      const cavity = new THREE.Mesh(cavityGeo, hopperCavityMat);
      cavity.position.set(posX, 8.5, -2);
      bunkerGroup.add(cavity);

      // Колосниковая решетка дробилки
      for (let g = -6; g <= 6; g += 3) {
        const barGeo = new THREE.BoxGeometry(23, 0.8, 1);
        const bar = new THREE.Mesh(barGeo, grateMat);
        bar.position.set(posX, 10.4, -2 + g);
        bunkerGroup.add(bar);
      }

      // Сигнальный карьерный колесоотбойник (колеса БелАЗа упираются при опрокидывании кузова)
      const curbGeo = new THREE.BoxGeometry(26, 2.6, 2.4);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(posX, 11.3, 14);
      curb.castShadow = true;
      bunkerGroup.add(curb);
    });

    // Навес приемного отделения с фирменным оранжевым карнизом ЕВРАЗ
    const canopyGeo = new THREE.BoxGeometry(118, 2, 36);
    const canopyMat = new THREE.MeshStandardMaterial({ color: "#22272E", roughness: 0.8 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 24, 0);
    bunkerGroup.add(canopy);

    const fasciaGeo = new THREE.BoxGeometry(120, 1.8, 37);
    const fasciaMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.position.set(0, 24.6, 0);
    bunkerGroup.add(fascia);

    // Опорные стальные колонны по углам эстакады
    const colMat = new THREE.MeshStandardMaterial({ color: "#FFB81C", metalness: 0.5 });
    [-56, 56].forEach(cx => {
      const colGeo = new THREE.BoxGeometry(2.5, 24, 2.5);
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 12, 16);
      bunkerGroup.add(col);
    });

    group.add(bunkerGroup);

    // 3. Три силоса готовой руды / концентрата (сзади главного корпуса)
    for (let i = 0; i < 3; i++) {
      const siloGeo = new THREE.CylinderGeometry(15, 15, 60, 24);
      const siloMat = new THREE.MeshStandardMaterial({ color: "#5A6573", metalness: 0.4, roughness: 0.5 });
      const silo = new THREE.Mesh(siloGeo, siloMat);
      silo.position.set(-45 + i * 45, 30, -75);
      silo.castShadow = true;

      // Коническая крышка
      const roofGeo = new THREE.ConeGeometry(15.5, 8, 24);
      const roofMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 34, 0);
      silo.add(roof);

      group.add(silo);
    }

    // 4. Вентиляционные трубы / дымоходы на кровле
    const pipeGeo = new THREE.CylinderGeometry(3, 3, 40, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: "#7A889B", metalness: 0.7, roughness: 0.3 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(-40, 75, -20);
    group.add(pipe);

    return group;
  }

  /**
   * АЗС ГТК (Заправочный комплекс дизельного топлива для карьерных самосвалов)
   */
  static buildFuelStation(pos = { x: -120, y: 0, z: -700 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "station_fuel";

    // 1. Навес над заправочными постами БелАЗ (высота 22м для свободного проезда 240т машин)
    const canopyRoofGeo = new THREE.BoxGeometry(110, 3, 55);
    const canopyRoofMat = new THREE.MeshStandardMaterial({ color: "#22272E", roughness: 0.8 });
    const canopyRoof = new THREE.Mesh(canopyRoofGeo, canopyRoofMat);
    canopyRoof.position.set(0, 22, 0);
    canopyRoof.castShadow = true;
    group.add(canopyRoof);

    // Оранжевая фирменная окантовка ЕВРАЗ на карнизе навеса
    const fasciaGeo = new THREE.BoxGeometry(112, 2.2, 57);
    const fasciaMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    fascia.position.set(0, 22.8, 0);
    group.add(fascia);

    // 4 мощные стальные колонны навеса
    const pillarMat = new THREE.MeshStandardMaterial({ color: "#FFB81C", metalness: 0.6, roughness: 0.3 });
    const pillarPositions = [
      [-45, -20], [-45, 20], [45, -20], [45, 20]
    ];
    pillarPositions.forEach(([px, pz]) => {
      const colGeo = new THREE.CylinderGeometry(1.6, 2.0, 22, 16);
      const col = new THREE.Mesh(colGeo, pillarMat);
      col.position.set(px, 11, pz);
      col.castShadow = true;
      group.add(col);
    });

    // 2. Три двухсторонние высокопроизводительные колонки ТРК (топливораздаточные колонки)
    for (let i = 0; i < 3; i++) {
      const pumpGeo = new THREE.BoxGeometry(4, 5, 2.5);
      const pumpMat = new THREE.MeshStandardMaterial({ color: "#2B323B", roughness: 0.5 });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(-28 + i * 28, 2.5, 0);
      pump.castShadow = true;

      // Цифровое табло колонки
      const screenGeo = new THREE.PlaneGeometry(2.4, 1.2);
      const screenMat = new THREE.MeshBasicMaterial({ color: "#10B981" });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.8, 1.3);
      pump.add(screen);

      group.add(pump);
    }

    // 3. Резервуарный парк дизельного топлива (3 цистерны по 100 000 литров)
    for (let i = 0; i < 3; i++) {
      const tankGeo = new THREE.CylinderGeometry(6.5, 6.5, 34, 24);
      tankGeo.rotateZ(Math.PI / 2);
      const tankMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", metalness: 0.35, roughness: 0.45 });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(-28 + i * 28, 7.5, -45);
      tank.castShadow = true;
      group.add(tank);

      // Бетонные опоры цистерн
      const cradleGeo = new THREE.BoxGeometry(26, 3, 14);
      const cradleMat = new THREE.MeshStandardMaterial({ color: "#3B424D", roughness: 0.9 });
      const cradle = new THREE.Mesh(cradleGeo, cradleMat);
      cradle.position.set(-28 + i * 28, 1.5, -45);
      group.add(cradle);
    }

    return group;
  }

  /**
   * РМЦ (Ремонтно-механический цех и Автобаза тяжелых БелАЗов)
   */
  static buildRmcComplex(pos = { x: 140, y: 0, z: -700 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "station_service";

    const facadeTex = TextureGenerator.createRmcFacadeTexture();

    // 1. Главный ангар сервиса БелАЗов (3 сервисных бокса с мостовыми кранами)
    const hangarGeo = new THREE.BoxGeometry(140, 48, 70);
    const hangarMats = [
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: "#181B1E", roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: "#14171A" }),
      new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.6 }), // ворота
      new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.8 })
    ];
    const hangar = new THREE.Mesh(hangarGeo, hangarMats);
    hangar.position.set(0, 24, 0);
    hangar.castShadow = true;
    group.add(hangar);

    // 2. Козловой кран на выкатной площадке
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, 0, 48);

    const legMat = new THREE.MeshStandardMaterial({ color: "#FFB81C", metalness: 0.5, roughness: 0.3 });
    const legGeo = new THREE.BoxGeometry(2, 35, 2);

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-58, 17.5, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(58, 17.5, 0);

    const beamGeo = new THREE.BoxGeometry(120, 4, 4);
    const beam = new THREE.Mesh(beamGeo, legMat);
    beam.position.set(0, 35, 0);

    craneGroup.add(legL, legR, beam);
    group.add(craneGroup);

    // 3. Склад крупногабаритных шин БелАЗ (диаметр 2.7м, радиальные OTR 46/90R57)
    for (let i = 0; i < 5; i++) {
      const tireGeo = new THREE.TorusGeometry(6, 3, 10, 20);
      tireGeo.rotateY(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: "#151719", roughness: 0.95 });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(-82, 6, -18 + i * 9);
      group.add(tire);
    }

    return group;
  }

  /**
   * Сервисный ангар и площадка отстоя техники (Резерв парка БелАЗ, База ТО РМЦ)
   */
  static buildParkingApron(pos = { x: 440, y: 0, z: -700 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "station_parking";

    // 1. Асфальтированная площадка отстоя техники (210м x 110м x 0.25м) с запасом на 14 БелАЗов
    const apronGeo = new THREE.BoxGeometry(210, 0.25, 110);
    const apronMat = new THREE.MeshStandardMaterial({ color: "#22272E", roughness: 0.88 });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, 0.12, 0);
    apron.receiveShadow = true;
    group.add(apron);

    // 2. Разметка 14 просторных стояночных боксов (желтые линии безопасности, ширина бокса 26м)
    const lineMat = new THREE.MeshBasicMaterial({ color: "#FFB81C" });
    for (let col = -3.5; col <= 3.5; col += 1.0) {
      const lineGeo = new THREE.PlaneGeometry(1.2, 94);
      lineGeo.rotateX(-Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(col * 26, 0.26, 0);
      group.add(lineMesh);
    }
    // Разделительная осевая между рядами
    const midLineGeo = new THREE.PlaneGeometry(190, 1.2);
    midLineGeo.rotateX(-Math.PI / 2);
    const midLine = new THREE.Mesh(midLineGeo, lineMat);
    midLine.position.set(0, 0.26, 0);
    group.add(midLine);

    // 3. Крытый сервисно-диагностический навес/ангар вдоль северной кромки площадки (над вторым рядом)
    const canopyMat = new THREE.MeshStandardMaterial({ color: "#1E232A", roughness: 0.7 });
    const roofGeo = new THREE.BoxGeometry(195, 2.8, 44);
    const roof = new THREE.Mesh(roofGeo, canopyMat);
    roof.position.set(0, 24, -26);
    roof.castShadow = true;
    group.add(roof);

    // Опорные стальные колонны ЕВРАЗ
    const colMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", metalness: 0.5, roughness: 0.35 });
    for (let cx = -90; cx <= 90; cx += 30) {
      const colGeo = new THREE.CylinderGeometry(0.9, 0.9, 24, 12);
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 12, -6);
      col.castShadow = true;
      group.add(col);

      const colBack = new THREE.Mesh(colGeo, colMat);
      colBack.position.set(cx, 12, -46);
      colBack.castShadow = true;
      group.add(colBack);
    }

    // Вывеска ангара
    const signGeo = new THREE.BoxGeometry(110, 4.5, 0.8);
    const signMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 26.5, -5.5);
    group.add(sign);

    return group;
  }

  /**
   * ЦУП / АБК (Диспетчерский центр АСУ ГТК с вышкой связи)
   */
  static buildCupOffice(pos = { x: -350, y: 0, z: -720 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "office_cup";

    const facadeTex = TextureGenerator.createCupFacadeTexture();

    // 2-этажное административное здание
    const officeGeo = new THREE.BoxGeometry(60, 24, 40);
    const officeMats = [
      new THREE.MeshStandardMaterial({ color: "#2B323B" }),
      new THREE.MeshStandardMaterial({ color: "#2B323B" }),
      new THREE.MeshStandardMaterial({ color: "#1A1D20" }),
      new THREE.MeshStandardMaterial({ color: "#14171A" }),
      new THREE.MeshStandardMaterial({ map: facadeTex }),
      new THREE.MeshStandardMaterial({ color: "#2B323B" })
    ];
    const office = new THREE.Mesh(officeGeo, officeMats);
    office.position.set(0, 12, 0);
    office.castShadow = true;
    group.add(office);

    // Мачта радиосвязи АСУ ГТК с мигающим маяком
    const mastGeo = new THREE.CylinderGeometry(0.8, 1.8, 55, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", metalness: 0.7, roughness: 0.2 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(22, 38, -12);
    group.add(mast);

    // Красный сигнальный огонь на вершине вышки
    const beaconGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: "#E4002B" });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(22, 66, -12);
    return group;
  }

  /**
   * Северный отвал вскрышных пород
   * Широкая ровная разгрузочная площадка вровень с автодорогой и задним упорным валом безопасности
   */
  static buildWasteDump(pos = { x: 740, y: 0, z: -680 }) {
    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);
    group.name = "station_dump";

    // 1. Широкая плоская площадка отвала (укатанный скальный грунт вровень с полотном дороги Y = 0.4)
    const padGeo = new THREE.BoxGeometry(136, 0.8, 96);
    const padMat = new THREE.MeshStandardMaterial({
      color: "#3C342C",
      roughness: 0.94,
      metalness: 0.05
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(0, 0.4, 0);
    padMesh.receiveShadow = true;
    group.add(padMesh);

    // 2. Железобетонный упорный предохранительный вал безопасности (отбойник колес БелАЗов)
    const bermGeo = new THREE.BoxGeometry(116, 3.2, 4.0);
    const bermMat = new THREE.MeshStandardMaterial({ color: "#252B33", roughness: 0.8 });
    const berm = new THREE.Mesh(bermGeo, bermMat);
    berm.position.set(0, 2.0, -22);
    berm.castShadow = true;
    group.add(berm);

    // Светоотражающая защитная полоса на отбойнике (фирменный оранжевый ЕВРАЗ)
    const stripeGeo = new THREE.BoxGeometry(118, 0.9, 4.2);
    const stripeMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", roughness: 0.4 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 2.2, -22);
    group.add(stripe);

    // 4. Сигнальные вехи со светоотражателями и прожекторами освещения зоны сброса
    for (let x = -48; x <= 48; x += 24) {
      const poleGeo = new THREE.CylinderGeometry(0.3, 0.3, 8.5, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: "#FFB81C", metalness: 0.6 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 5.5, -22);
      group.add(pole);

      // Светильник / маяк
      const lampGeo = new THREE.BoxGeometry(1.6, 1.0, 1.6);
      const lampMat = new THREE.MeshBasicMaterial({ color: "#FFF0D0" });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, 10.0, -22);
      group.add(lamp);
    }

    return group;
  }

  /**
   * Лесной массив по периметру карьера (Густая сибирская тайга)
   * Реализован на сверхбыстром THREE.InstancedMesh: всего 4 draw calls вместо 5700, 60 FPS без лагов!
   */
  static buildTaigaForest() {
    const forest = new THREE.Group();
    forest.name = "taiga_forest";

    const treePositions = [];
    const treeCount = 950;
    const rimX = 740;
    const rimZ = 450;

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const baseRX = 750 + Math.random() * 850;
      const baseRZ = 460 + Math.random() * 800;

      const x = Math.cos(angle) * baseRX;
      const z = Math.sin(angle) * baseRZ;

      // 1. Не сажаем деревья внутрь чаши карьера (с запасом 20м от бровки)
      if ((x * x) / (rimX * rimX) + (z * z) / (rimZ * rimZ) < 1.0) {
        continue;
      }

      // 2. Исключаем весь северный промышленный сектор (ГОФ, ЦУП, АЗС, РМЦ, Ангар, Отвал и магистраль)
      if (z <= -480 && z >= -860 && x >= -680 && x <= 860) {
        continue;
      }

      // 3. Исключаем технологические въезды в рампы карьера
      if (Math.hypot(x - (-360), z - (-372)) < 70) continue;
      if (Math.hypot(x - 360, z - (-372)) < 70) continue;

      const groundY = this.getTerrainElevation(x, z);

      let scale;
      const rand = Math.random();
      if (rand < 0.3) {
        scale = 0.7 + Math.random() * 0.4;
      } else if (rand < 0.8) {
        scale = 1.1 + Math.random() * 0.5;
      } else {
        scale = 1.7 + Math.random() * 0.5;
      }

      treePositions.push({ x, y: groundY, z, scale, rot: Math.random() * Math.PI * 2 });
    }

    const actualCount = treePositions.length;
    if (actualCount === 0) return forest;

    // Стволы
    const trunkGeo = new THREE.CylinderGeometry(0.55, 1.25, 12, 6);
    trunkGeo.translate(0, 6, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: "#2B1D15", roughness: 0.95 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, actualCount);

    // Нижняя крона
    const folGeo1 = new THREE.ConeGeometry(5.8, 6.0, 7);
    folGeo1.translate(0, 3.0, 0);
    const folMat1 = new THREE.MeshStandardMaterial({ color: "#163428", roughness: 0.9, metalness: 0.04 });
    const folInst1 = new THREE.InstancedMesh(folGeo1, folMat1, actualCount);

    // Средняя крона
    const folGeo2 = new THREE.ConeGeometry(4.2, 5.5, 7);
    folGeo2.translate(0, 2.75, 0);
    const folMat2 = new THREE.MeshStandardMaterial({ color: "#1E4432", roughness: 0.88, metalness: 0.04 });
    const folInst2 = new THREE.InstancedMesh(folGeo2, folMat2, actualCount);

    // Верхушка
    const folGeo3 = new THREE.ConeGeometry(2.6, 5.0, 7);
    folGeo3.translate(0, 2.5, 0);
    const folInst3 = new THREE.InstancedMesh(folGeo3, folMat1, actualCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < actualCount; i++) {
      const tp = treePositions[i];

      // Ствол
      dummy.position.set(tp.x, tp.y, tp.z);
      dummy.scale.set(tp.scale, tp.scale, tp.scale);
      dummy.rotation.set(0, tp.rot, 0);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      // Ярус 1
      dummy.position.set(tp.x, tp.y + 6 * tp.scale, tp.z);
      dummy.scale.set(tp.scale, tp.scale, tp.scale);
      dummy.rotation.set(0, tp.rot, 0);
      dummy.updateMatrix();
      folInst1.setMatrixAt(i, dummy.matrix);

      // Ярус 2
      dummy.position.set(tp.x, tp.y + 10.5 * tp.scale, tp.z);
      dummy.scale.set(tp.scale * 0.9, tp.scale * 0.9, tp.scale * 0.9);
      dummy.rotation.set(0, tp.rot + 0.5, 0);
      dummy.updateMatrix();
      folInst2.setMatrixAt(i, dummy.matrix);

      // Ярус 3
      dummy.position.set(tp.x, tp.y + 14.5 * tp.scale, tp.z);
      dummy.scale.set(tp.scale * 0.8, tp.scale * 0.8, tp.scale * 0.8);
      dummy.rotation.set(0, tp.rot + 1.0, 0);
      dummy.updateMatrix();
      folInst3.setMatrixAt(i, dummy.matrix);
    }

    trunkInst.instanceMatrix.needsUpdate = true;
    folInst1.instanceMatrix.needsUpdate = true;
    folInst2.instanceMatrix.needsUpdate = true;
    folInst3.instanceMatrix.needsUpdate = true;

    folInst1.castShadow = true;
    folInst1.receiveShadow = true;

    forest.add(trunkInst, folInst1, folInst2, folInst3);
    return forest;
  }

  /**
   * Высокие мачты карьерного освещения с прожекторами
   */
  static buildFloodlightTower(pos = { x: 0, y: 0, z: 0 }, targetDir = new THREE.Vector3(0, -100, 0)) {
    const tower = new THREE.Group();
    tower.position.set(pos.x, pos.y, pos.z);

    // Металлическая ферменная решетка мачты
    const mastGeo = new THREE.CylinderGeometry(1.2, 2.5, 45, 4);
    const mastMat = new THREE.MeshStandardMaterial({ color: "#A8B2BD", metalness: 0.6, roughness: 0.4 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 22.5;
    mast.castShadow = true;
    tower.add(mast);

    // Платформа обслуживания
    const platGeo = new THREE.BoxGeometry(10, 1.5, 6);
    const platMat = new THREE.MeshStandardMaterial({ color: "#3B444E" });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 45;
    tower.add(plat);

    // 4 ярких галогеновых прожектора
    for (let i = 0; i < 4; i++) {
      const lampGeo = new THREE.BoxGeometry(2, 2, 2);
      const lampMat = new THREE.MeshBasicMaterial({ color: "#FFF8E7" });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(-3.5 + i * 2.3, 46.5, 1.5);
      tower.add(lamp);
    }

    return tower;
  }

  /**
   * 3D модель тяжелого карьерного самосвала БелАЗ
   */
  static buildBelazTruckModel(truck) {
    const group = new THREE.Group();
    group.name = `truck_${truck.id}`;

    const isHeavy = truck.typeKey === "belaz_75313";
    const scale = isHeavy ? 1.15 : 1.0;

    // Цветовая палитра БелАЗ ЕВРАЗ
    const yellowOrange = "#FFB81C"; // Фирменный яркий желто-оранжевый
    const darkGraphite = "#1E2227"; // Рама и шасси
    const steelGrey = "#3A414A";

    const bodyMat = new THREE.MeshStandardMaterial({ color: yellowOrange, metalness: 0.2, roughness: 0.4 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: darkGraphite, metalness: 0.5, roughness: 0.6 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#121416", roughness: 0.95 });

    // 1. Шасси / Рама
    const chassisGeo = new THREE.BoxGeometry(12 * scale, 3 * scale, 24 * scale);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 4 * scale;
    chassis.castShadow = true;
    group.add(chassis);

    // 2. Радиаторная решетка и капот
    const hoodGeo = new THREE.BoxGeometry(10 * scale, 7 * scale, 8 * scale);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 7.5 * scale, 8 * scale);
    hood.castShadow = true;
    group.add(hood);

    // Черная решетка радиатора спереди
    const grillGeo = new THREE.PlaneGeometry(8 * scale, 5 * scale);
    const grillMat = new THREE.MeshBasicMaterial({ color: "#14171A" });
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0, 7.5 * scale, 12.05 * scale);
    group.add(grill);

    // Фары
    const lightGeo = new THREE.BoxGeometry(1.2 * scale, 1 * scale, 0.4 * scale);
    const lightMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
    const hlLeft = new THREE.Mesh(lightGeo, lightMat);
    hlLeft.position.set(-3.5 * scale, 5.5 * scale, 12.1 * scale);
    const hlRight = hlLeft.clone();
    hlRight.position.x = 3.5 * scale;
    group.add(hlLeft, hlRight);

    // 3. Кабина водителя (с левой стороны по стандарту БелАЗ)
    const cabGeo = new THREE.BoxGeometry(4.5 * scale, 4.5 * scale, 5 * scale);
    const cab = new THREE.Mesh(cabGeo, bodyMat);
    cab.position.set(-2.5 * scale, 13 * scale, 6 * scale);
    cab.castShadow = true;

    // Лобовое стекло
    const glassGeo = new THREE.PlaneGeometry(3.8 * scale, 2.5 * scale);
    const glassMat = new THREE.MeshStandardMaterial({ color: "#1B3B54", roughness: 0.1, metalness: 0.8 });
    const windshield = new THREE.Mesh(glassGeo, glassMat);
    windshield.position.set(0, 0.4 * scale, 2.55 * scale);
    cab.add(windshield);
    group.add(cab);

    // Лестница и ограждение палубы
    const deckGeo = new THREE.BoxGeometry(11 * scale, 0.8 * scale, 10 * scale);
    const deck = new THREE.Mesh(deckGeo, chassisMat);
    deck.position.set(0, 10.5 * scale, 7 * scale);
    group.add(deck);

    // 4. Откидной кузов (Dump Body) на шарнире
    const dumpPivot = new THREE.Group();
    dumpPivot.position.set(0, 6 * scale, -10 * scale); // точка вращения сзади

    // Основание кузова
    const dumpBaseGeo = new THREE.BoxGeometry(13 * scale, 2 * scale, 20 * scale);
    const dumpBase = new THREE.Mesh(dumpBaseGeo, bodyMat);
    dumpBase.position.set(0, 2 * scale, 10 * scale);
    dumpBase.castShadow = true;

    // Боковые борта
    const sideWallGeo = new THREE.BoxGeometry(1 * scale, 6 * scale, 20 * scale);
    const wallLeft = new THREE.Mesh(sideWallGeo, bodyMat);
    wallLeft.position.set(-6 * scale, 5 * scale, 10 * scale);
    const wallRight = wallLeft.clone();
    wallRight.position.x = 6 * scale;

    // Передний козырек (защита кабины)
    const visorGeo = new THREE.BoxGeometry(13 * scale, 6 * scale, 8 * scale);
    const visor = new THREE.Mesh(visorGeo, bodyMat);
    visor.position.set(0, 7 * scale, 20 * scale);
    visor.rotation.x = -0.3;

    dumpPivot.add(dumpBase, wallLeft, wallRight, visor);

    // Горная масса внутри кузова (руда или вскрыша)
    const loadGeo = new THREE.ConeGeometry(5.5 * scale, 4 * scale, 8);
    loadGeo.scale(1.2, 0.8, 1.8);
    const loadMat = new THREE.MeshStandardMaterial({
      color: "#FFB81C",
      roughness: 0.9
    });
    const loadMesh = new THREE.Mesh(loadGeo, loadMat);
    loadMesh.name = "load_mesh";
    loadMesh.position.set(0, 5 * scale, 9 * scale);
    loadMesh.visible = false;
    dumpPivot.add(loadMesh);

    group.add(dumpPivot);
    group.userData.dumpPivot = dumpPivot;
    group.userData.loadMesh = loadMesh;

    // 5. Колеса БелАЗ (2 передних, 4 сдвоенных задних)
    const wheelRadius = 3.6 * scale;
    const wheelThick = 2.2 * scale;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThick, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    // Передние колеса
    const wFrontLeft = new THREE.Mesh(wheelGeo, wheelMat);
    wFrontLeft.position.set(-6.5 * scale, wheelRadius, 7 * scale);
    wFrontLeft.castShadow = true;

    const wFrontRight = wFrontLeft.clone();
    wFrontRight.position.x = 6.5 * scale;

    // Задние сдвоенные колеса
    const wRearLeft = new THREE.Mesh(wheelGeo, wheelMat);
    wRearLeft.position.set(-6.8 * scale, wheelRadius, -7 * scale);
    wRearLeft.castShadow = true;

    const wRearRight = wRearLeft.clone();
    wRearRight.position.x = 6.8 * scale;

    group.add(wFrontLeft, wFrontRight, wRearLeft, wRearRight);

    return group;
  }

  /**
   * 3D модель тяжелого горного экскаватора Liebherr
   */
  static buildExcavatorModel(exc) {
    const group = new THREE.Group();
    group.name = `excavator_${exc.nodeId}`;

    const isGiant = exc.typeKey === "liebherr_9400";
    const scale = isGiant ? 1.3 : 1.0;

    const whiteMat = new THREE.MeshStandardMaterial({ color: "#ECEEF0", metalness: 0.2, roughness: 0.4 });
    const greyMat = new THREE.MeshStandardMaterial({ color: "#2B313A", metalness: 0.5, roughness: 0.7 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: "#ED7D27", metalness: 0.3, roughness: 0.4 });

    // 1. Гусеничная тележка (Undercarriage)
    const trackGeo = new THREE.BoxGeometry(4 * scale, 5 * scale, 24 * scale);
    const trackLeft = new THREE.Mesh(trackGeo, greyMat);
    trackLeft.position.set(-7 * scale, 2.5 * scale, 0);
    trackLeft.castShadow = true;

    const trackRight = trackLeft.clone();
    trackRight.position.x = 7 * scale;

    const centerBodyGeo = new THREE.BoxGeometry(10 * scale, 3 * scale, 16 * scale);
    const centerBody = new THREE.Mesh(centerBodyGeo, greyMat);
    centerBody.position.set(0, 3.5 * scale, 0);

    group.add(trackLeft, trackRight, centerBody);

    // 2. Поворотная платформа (Revolving Deck)
    const turret = new THREE.Group();
    turret.position.set(0, 5 * scale, 0);

    const houseGeo = new THREE.BoxGeometry(14 * scale, 9 * scale, 20 * scale);
    const house = new THREE.Mesh(houseGeo, whiteMat);
    house.position.set(0, 4.5 * scale, -2 * scale);
    house.castShadow = true;
    turret.add(house);

    // Противовес сзади
    const counterGeo = new THREE.BoxGeometry(14.2 * scale, 7 * scale, 6 * scale);
    const counter = new THREE.Mesh(counterGeo, greyMat);
    counter.position.set(0, 4.5 * scale, -12 * scale);
    turret.add(counter);

    // Кабина машиниста (справа спереди, панорамный обзор забоя)
    const cabGeo = new THREE.BoxGeometry(4.5 * scale, 5 * scale, 5.5 * scale);
    const cab = new THREE.Mesh(cabGeo, orangeMat);
    cab.position.set(5.2 * scale, 9 * scale, 5 * scale);
    turret.add(cab);

    // 3. Стрела и рукоять с ковшом (Boom & Bucket)
    const boomPivot = new THREE.Group();
    boomPivot.position.set(0, 4 * scale, 8 * scale);

    const boomGeo = new THREE.BoxGeometry(3.5 * scale, 4 * scale, 22 * scale);
    const boom = new THREE.Mesh(boomGeo, whiteMat);
    boom.position.set(0, 6 * scale, 9 * scale);
    boom.rotation.x = -0.6;
    boom.castShadow = true;
    boomPivot.add(boom);

    // Рукоять и ковш
    const armPivot = new THREE.Group();
    armPivot.position.set(0, 15 * scale, 16 * scale);

    const armGeo = new THREE.BoxGeometry(2.5 * scale, 16 * scale, 2.5 * scale);
    const arm = new THREE.Mesh(armGeo, whiteMat);
    arm.position.set(0, -6 * scale, 2 * scale);
    armPivot.add(arm);

    // Горный ковш прямой лопаты
    const bucketGeo = new THREE.BoxGeometry(6 * scale, 5 * scale, 5 * scale);
    const bucket = new THREE.Mesh(bucketGeo, greyMat);
    bucket.position.set(0, -14 * scale, 4 * scale);
    armPivot.add(bucket);

    boomPivot.add(armPivot);
    turret.add(boomPivot);

    group.add(turret);

    group.userData.turret = turret;
    group.userData.boomPivot = boomPivot;
    group.userData.armPivot = armPivot;

    return group;
  }
}
