/**
 * 3D WebGL Рендерер карьера ESIM DISPATCH на базе Three.js
 * Полноценный 3D разрез карьера, богатое промышленное окружение,
 * ограниченная игровая область камеры, строгая корпоративная стилистика ЕВРАЗ
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { ModelBuilder } from "../graphics/ModelBuilder.js";
import { TextureGenerator } from "../graphics/TextureGenerator.js";
import { sound } from "../audio.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;

    // 1. Создание Three.js WebGLRenderer с надежными резервными параметрами
    let renderer = null;
    const renderOpts = [
      { canvas: this.canvas, antialias: true, alpha: false, logarithmicDepthBuffer: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false },
      { canvas: this.canvas, antialias: true, alpha: false, powerPreference: "default", failIfMajorPerformanceCaveat: false },
      { canvas: this.canvas, antialias: false, alpha: false, failIfMajorPerformanceCaveat: false },
      { canvas: this.canvas }
    ];

    for (const opt of renderOpts) {
      try {
        renderer = new THREE.WebGLRenderer(opt);
        if (renderer) break;
      } catch (err) {
        console.warn("Попытка инициализации WebGLRenderer с параметрами:", opt, "завершилась с ошибкой:", err);
      }
    }

    if (!renderer) {
      const errBox = document.createElement("div");
      errBox.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1E2227;color:#FFB81C;border:2px solid #E4002B;padding:24px;border-radius:8px;font-family:sans-serif;z-index:9999;max-width:500px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.8);";
      errBox.innerHTML = "<h3 style='margin-top:0;color:#E4002B;'>Ошибка создания WebGL контекста</h3><p style='color:#E2E8F0;font-size:14px;line-height:1.5;'>В браузере отключено аппаратное ускорение или WebGL.<br>В LibreWolf / Firefox: перейдите в <b>about:config</b> и убедитесь, что <b>webgl.disabled = false</b>.</p>";
      document.body.appendChild(errBox);
      throw new Error("Не удалось создать WebGLRenderer (WebGL не поддерживается браузером)");
    }

    const initW = this.canvas.clientWidth || Math.max(800, window.innerWidth - 380);
    const initH = this.canvas.clientHeight || Math.max(600, window.innerHeight - 52);

    this.renderer = renderer;
    this.renderer.setSize(initW, initH, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 2. Сцена и Яркий Дневной Скайбокс с облаками
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#A2C8E8"); // Соответствует цвету атмосферной дымки, устраняет любые черные артефакты
    this.setupSkyDome();
    this.scene.fog = new THREE.FogExp2("#A2C8E8", 0.00014); // Мягкая дневная атмосферная дымка

    // 3. Камера с расширенной дальней плоскостью отсечения (полностью исключает клиппинг скайбокса)
    this.camera = new THREE.PerspectiveCamera(
      42,
      initW / initH,
      2.5,
      12000
    );
    // Стартовая перспектива: изометрический угол обзора карьера и фабрики
    this.camera.position.set(-600, 480, 620);

    // 4. OrbitControls с жесткими ограничениями (Camera Bounds & Collisions)
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;

    // Пользователь может свободно вращать, зумировать и панорамировать камеру.
    // При этом фокус и слежение за транспортом сохраняются, а сброс в свободный режим происходит по Esc или кнопке [СВОБОДНЫЙ ОБЗОР].
    this.controls.addEventListener("start", () => {
      // Плавный переход отменяется при ручном вмешательстве пользователя, но целевой объект не теряется
      if (this.cameraTransition && this.cameraTransition.active) {
        this.cameraTransition.active = false;
      }
    });

    // Ограничения зума и углов обзора: от детального вида БелАЗа (20м) до панорамы карьера (1000м)
    this.controls.minDistance = 20;
    this.controls.maxDistance = 1000;
    this.controls.minPolarAngle = Math.PI * 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.44; // комфортно выше горизонта земли

    // Начальный фокус в центр карьера
    this.controls.target.set(0, -60, 0);

    // 5. Освещение
    this.setupLighting();

    // 6. Хранилища 3D объектов техники и комплексов
    this.truckObjects = new Map();
    this.excavatorObjects = new Map();
    this.switchMeshes = new Map();
    this.buildingObjects = new Map();
    this.buildingBadges = [];

    // 7. Система точек внимания (POI) и динамического слежения
    this.currentPoi = "overview";
    this.trackingTruckId = null;
    this.cameraTransition = null;
    this.lastGameRef = null;

    // 8. Raycaster для интерактива мыши
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;
    this.selectedTruckId = null;

    // Спрайты меток над техникой
    this.truckSprites = new Map();

    this.isBuilt = false;
  }

  /**
   * Яркий панорамный купол сибирского дневного неба с реалистичными облаками
   */
  setupSkyDome() {
    const skyTex = TextureGenerator.createBrightDaySkyTexture();
    const skyGeo = new THREE.SphereGeometry(4500, 48, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.renderOrder = -1000;
    this.scene.add(this.skyDome);
  }

  setupLighting() {
    // Рассеянный дневной свет (чистые тени без непроглядной черноты)
    const ambientLight = new THREE.AmbientLight("#7A7268", 1.35);
    this.scene.add(ambientLight);

    // Мягкий полусферический свет сибирского неба и скального массива
    const hemiLight = new THREE.HemisphereLight("#A8D4F8", "#54463A", 1.3);
    hemiLight.position.set(0, 600, 0);
    this.scene.add(hemiLight);

    // Яркое дневное солнце с теплыми лучами
    const sunLight = new THREE.DirectionalLight("#FFF7E6", 2.2);
    sunLight.position.set(-500, 750, 450);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1900;

    const d = 750;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    // Заполняющий свет с противоположной стороны
    const fillLight = new THREE.DirectionalLight("#8AB4D6", 1.1);
    fillLight.position.set(500, 450, -450);
    this.scene.add(fillLight);

    // Промышленные карьерные прожекторы на рабочих горизонтах
    const pitLight1 = new THREE.PointLight("#FFB81C", 1.6, 450);
    pitLight1.position.set(0, -180, 20);
    this.scene.add(pitLight1);

    const pitLight2 = new THREE.PointLight("#FFAA33", 1.3, 400);
    pitLight2.position.set(-60, -70, -170);
    this.scene.add(pitLight2);

    const pitLight3 = new THREE.PointLight("#FFAA33", 1.3, 400);
    pitLight3.position.set(-140, -25, 270);
    this.scene.add(pitLight3);
  }

  /**
   * Инициализация статического окружения (3D горы, карьер, ГОФ, РМЦ, тайга)
   */
  initEnvironment(quarry) {
    if (this.isBuilt) return;

    // 0. Внешний 3D горный хребет (360 градусов), закрывающий край земли
    const mountains = ModelBuilder.buildMountainRing();
    this.scene.add(mountains);

    // 1. 3D Разрез карьера с уступами, бермами и рельефом
    const quarryMesh = ModelBuilder.buildQuarryMesh(quarry);
    this.scene.add(quarryMesh);

    // 2. Стилизованные навигационные пути АСУ ГТК
    const roadsMesh = ModelBuilder.buildRoadsMesh(quarry);
    this.scene.add(roadsMesh);

    // 3. Комплекс ГОФ (Дробилка + галерея конвейера + силосы)
    const gofNode = quarry.getNode("n_gof") || { x: -580, y: 0, z: -680 };
    const gof = ModelBuilder.buildGofComplex(gofNode);
    gof.userData = { poiType: "gof", name: "ГОФ-1 (Обогатительная фабрика)" };
    this.scene.add(gof);
    this.buildingObjects.set("gof", gof);

    // 4. АЗС ГТК (Заправочный комплекс)
    const fuelNode = quarry.getNode("n_fuel") || { x: -120, y: 0, z: -700 };
    const fuel = ModelBuilder.buildFuelStation(fuelNode);
    fuel.userData = { poiType: "fuel", name: "АЗС ГТК (Заправочный пункт)" };
    this.scene.add(fuel);
    this.buildingObjects.set("fuel", fuel);

    // 5. РМЦ (База техобслуживания и ремонтные боксы)
    const serviceNode = quarry.getNode("n_service") || { x: 140, y: 0, z: -700 };
    const rmc = ModelBuilder.buildRmcComplex(serviceNode);
    rmc.userData = { poiType: "service", name: "РМЦ (Ремонтно-механический цех)" };
    this.scene.add(rmc);
    this.buildingObjects.set("service", rmc);

    // 6. ЦУП (Диспетчерская вышка с радиомачтой, отодвинутая вглубь террасы)
    const cupNode = quarry.getNode("n_cup") || { x: -350, y: 0, z: -720 };
    const cup = ModelBuilder.buildCupOffice(cupNode);
    cup.userData = { poiType: "cup", name: "ЦУП (Диспетчерский центр)" };
    this.scene.add(cup);
    this.buildingObjects.set("cup", cup);

    // 7. Северный отвал вскрышных пород
    const dumpNode = quarry.getNode("n_dump") || { x: 740, y: 0, z: -680 };
    const dump = ModelBuilder.buildWasteDump(dumpNode);
    dump.userData = { poiType: "dump", name: "Северный отвал (Вскрыша)" };
    this.scene.add(dump);
    this.buildingObjects.set("dump", dump);

    // 7.5. Парящие 3D информационные таблички-бейджи над комплексами
    const gofBadge = this.createBuildingBadgeSprite("ГОФ-1 • ОБОГАТИТЕЛЬНАЯ ФАБРИКА", "ДРОБИЛЬНЫЙ КОМПЛЕКС • ПРИЕМКА РУДЫ", "● 3 ПОСТА РАЗГРУЗКИ", "#FFB81C");
    gofBadge.position.set(-580, 82, -680);
    gofBadge.userData = { poiType: "gof", isBadge: true };
    this.scene.add(gofBadge);
    this.buildingBadges.push(gofBadge);

    const fuelBadge = this.createBuildingBadgeSprite("АЗС ГТК • ЗАПРАВОЧНЫЙ ПУНКТ", "ДИЗЕЛЬНОЕ ТОПЛИВО • 3 РЕЗЕРВУАРА", "● 2 ПОСТА ЗАПРАВКИ", "#FFB81C");
    fuelBadge.position.set(-120, 52, -700);
    fuelBadge.userData = { poiType: "fuel", isBadge: true };
    this.scene.add(fuelBadge);
    this.buildingBadges.push(fuelBadge);

    const rmcBadge = this.createBuildingBadgeSprite("РМЦ • БАЗА ТЕХОБСЛУЖИВАНИЯ", "РЕМОНТНЫЙ АНГАР • СКЛАД ШИН", "● 3 СЕРВИСНЫХ БОКСА", "#00A3E0");
    rmcBadge.position.set(140, 72, -700);
    rmcBadge.userData = { poiType: "service", isBadge: true };
    this.scene.add(rmcBadge);
    this.buildingBadges.push(rmcBadge);

    // 5.5. Сервисный ангар и площадка отстоя техники (Резерв парка)
    const parkingNode = quarry.getNode("n_parking") || { x: 440, y: 0, z: -700 };
    const parking = ModelBuilder.buildParkingApron(parkingNode);
    parking.userData = { poiType: "parking", name: "Площадка отстоя и сервисный ангар РМЦ" };
    this.scene.add(parking);
    this.buildingObjects.set("parking", parking);

    const parkingBadge = this.createBuildingBadgeSprite("ПЛОЩАДКА ОТСТОЯ • АНГАР", "РЕЗЕРВ ТЕХНИКИ • МЕЖРЕЙСОВОЕ ТО", "● 14 СТОЯНОЧНЫХ МЕСТ", "#10B981");
    parkingBadge.position.set(440, 52, -700);
    parkingBadge.userData = { poiType: "parking", isBadge: true };
    this.scene.add(parkingBadge);
    this.buildingBadges.push(parkingBadge);

    const cupBadge = this.createBuildingBadgeSprite("ЦУП • ДИСПЕТЧЕРСКАЯ АСУ ГТК", "ДИСПЕТЧЕРСКИЙ ЦЕНТР УПРАВЛЕНИЯ", "● ОПЕРАТИВНЫЙ КОНТРОЛЬ", "#ED7D27");
    cupBadge.position.set(-350, 56, -720);
    cupBadge.userData = { poiType: "cup", isBadge: true };
    this.scene.add(cupBadge);
    this.buildingBadges.push(cupBadge);

    const dumpBadge = this.createBuildingBadgeSprite("СЕВЕРНЫЙ ОТВАЛ • ВСКРЫША", "ПРИЕМКА ПУСТОЙ ПОРОДЫ", "● СЕКТОР А • В РАБОТЕ", "#A0AEC0");
    dumpBadge.position.set(740, 52, -680);
    dumpBadge.userData = { poiType: "dump", isBadge: true };
    this.scene.add(dumpBadge);
    this.buildingBadges.push(dumpBadge);

    // Бейджи забоев
    const exc1Badge = this.createBuildingBadgeSprite("ЗАБОЙ 1 • БОГАТАЯ РУДА (Fe 62%)", "LIEBHERR R 9400 • ЕМКОСТЬ 24м³", "● ОТМЕТКА -195м • ПРИОРИТЕТ", "#FFB81C");
    exc1Badge.position.set(-90, -155, 30);
    exc1Badge.userData = { poiType: "exc_1", isBadge: true };
    this.scene.add(exc1Badge);
    this.buildingBadges.push(exc1Badge);

    const exc2Badge = this.createBuildingBadgeSprite("ЗАБОЙ 2 • РЯДОВАЯ РУДА", "LIEBHERR R 9250 • ЕМКОСТЬ 15м³", "● ОТМЕТКА -95м • В РАБОТЕ", "#ED7D27");
    exc2Badge.position.set(-180, -55, -230);
    exc2Badge.userData = { poiType: "exc_2", isBadge: true };
    this.scene.add(exc2Badge);
    this.buildingBadges.push(exc2Badge);

    const exc3Badge = this.createBuildingBadgeSprite("ЗАБОЙ 3 • ВСКРЫШНЫЕ ПОРОДЫ", "LIEBHERR R 9250 • ЕМКОСТЬ 15м³", "● ОТМЕТКА -45м • В РАБОТЕ", "#A0AEC0");
    exc3Badge.position.set(-340, -5, 270);
    exc3Badge.userData = { poiType: "exc_3", isBadge: true };
    this.scene.add(exc3Badge);
    this.buildingBadges.push(exc3Badge);

    const exc4Badge = this.createBuildingBadgeSprite("ЗАБОЙ 4 • БОГАТАЯ РУДА (Fe 64%)", "LIEBHERR R 9400 • ЕМКОСТЬ 24м³", "● ОТМЕТКА -195м • ВОСТ. ПОДЪЕМ", "#FFB81C");
    exc4Badge.position.set(90, -155, 30);
    exc4Badge.userData = { poiType: "exc_4", isBadge: true };
    this.scene.add(exc4Badge);
    this.buildingBadges.push(exc4Badge);

    // 8. Сибирская тайга вокруг карьера (Густой лес на InstancedMesh, 60 FPS)
    const forest = ModelBuilder.buildTaigaForest();
    this.scene.add(forest);

    // 9. Мачты карьерного освещения (динамически привязаны к высоте грунта, исключая зависание в воздухе)
    const mastPositions = [
      { x: -520, z: -320 },
      { x: 520, z: -320 },
      { x: 500, z: 140 },
      { x: -520, z: 140 },
      { x: 0, z: 400 },
      { x: -20, z: -580 }
    ];
    mastPositions.forEach(p => {
      const surfaceY = ModelBuilder.getSurfaceHeight(p.x, p.z);
      const tower = ModelBuilder.buildFloodlightTower({ x: p.x, y: surfaceY, z: p.z });
      this.scene.add(tower);
    });

    // 9. 3D Стрелочные переводы АСУ ГТК на дорогах
    this.buildSwitchIndicators(quarry);

    this.isBuilt = true;
  }

  /**
   * Стрелочные указатели полностью убраны с полотна дорог по требованию диспетчеризации
   */
  buildSwitchIndicators(quarry) {
    // Стрелки удалены с полотна карьерных дорог
  }

  /**
   * Обновление направления стрелок (заглушка)
   */
  updateSwitches(quarry, dtSec = 0.016) {
    // Стрелки удалены с полотна дорог
  }

  /**
   * Создание плавающей текстовой метки над самосвалом
   */
  createTruckBadgeSprite(truck) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 20;
    sprite.scale.set(34, 13, 1);
    sprite.userData = { canvas, ctx, tex, lastLoad: -1, lastType: "" };

    this.drawTruckBadge(sprite.userData, truck);
    return sprite;
  }

  drawTruckBadge(data, truck) {
    const { ctx, tex } = data;
    ctx.clearRect(0, 0, 512, 192);

    ctx.fillStyle = "rgba(18, 21, 24, 0.92)";
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 160, 16);
    ctx.fill();

    ctx.strokeStyle = truck.isLoaded ? "#FFB81C" : "#ED7D27";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = "#FFB81C";
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.fillText(truck.id, 256, 84);

    const loadLabel = truck.isLoaded
      ? (truck.loadType === "waste" ? "ВСКРЫША" : "РУДА")
      : "ПОРОЖНИЙ";
    ctx.fillStyle = truck.isLoaded ? "#10B981" : "#CBD5E1";
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.fillText(`${Math.round(truck.currentLoad)}т / ${truck.config.capacity}т • ${loadLabel}`, 256, 144);

    tex.needsUpdate = true;
    data.lastLoad = Math.round(truck.currentLoad);
    data.lastType = truck.loadType;
  }

  /**
   * Главный цикл рендеринга Three.js сцены
   */
  render(game, dtSec = 0.016) {
    this.lastGameRef = game;
    const { quarry, trucks, excavators } = game;

    if (!this.isBuilt) {
      this.initEnvironment(quarry);
    }

    // 1. Анимация плавного перемещения камеры между точками интереса (Smooth POI Lerp)
    if (this.cameraTransition && this.cameraTransition.active) {
      this.cameraTransition.progress += (dtSec || 0.016) / this.cameraTransition.duration;
      const t = Math.min(1.0, this.cameraTransition.progress);
      // Smoothstep сглаживание
      const ease = t * t * (3 - 2 * t);

      this.camera.position.lerpVectors(this.cameraTransition.startCamPos, this.cameraTransition.targetCamPos, ease);
      this.controls.target.lerpVectors(this.cameraTransition.startLookAt, this.cameraTransition.targetLookAt, ease);

      if (t >= 1.0) {
        this.cameraTransition.active = false;
        if (this.cameraTransition.onComplete) this.cameraTransition.onComplete();
      }
    } else if (this.trackingTruckId) {
      // Режим непрерывного динамического слежения за выбранным БелАЗом
      const truck = trucks.find(t => t.id === this.trackingTruckId);
      if (truck) {
        const truckY = (truck.elevation !== undefined ? truck.elevation : 0) + 4.5;
        const currentTarget = new THREE.Vector3(truck.x, truckY, truck.z !== undefined ? truck.z : truck.y);
        const delta = currentTarget.clone().sub(this.controls.target);
        this.controls.target.copy(currentTarget);
        this.camera.position.add(delta);
      } else {
        this.trackingTruckId = null;
        if (game.hud && game.hud.updateCameraPoiUI) game.hud.updateCameraPoiUI("free");
      }
    }

    // Защита: target НИКОГДА не может провалиться под землю и удерживается в рабочей зоне карьера
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -580, 740);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -720, 350);
    const minTargetY = ModelBuilder.getSurfaceHeight(this.controls.target.x, this.controls.target.z) + 1.5;
    if (this.controls.target.y < minTargetY) {
      this.controls.target.y = minTargetY;
    }
    this.controls.target.y = Math.min(this.controls.target.y, 80);

    this.controls.minPolarAngle = Math.PI * 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.44; // комфортно выше горизонта земли

    this.controls.update();

    // Защита от вылета камеры за пределы чаши карьера в снежный горный хребет (максимальный радиус 1080м от центра карьера)
    const maxCamRadius = 1080;
    const centerZ = -150;
    const camDistH = Math.hypot(this.camera.position.x, this.camera.position.z - centerZ);
    if (camDistH > maxCamRadius) {
      const ratio = maxCamRadius / camDistH;
      this.camera.position.x *= ratio;
      this.camera.position.z = centerZ + (this.camera.position.z - centerZ) * ratio;
    }

    // 1.1. Физическая коллизия камеры с рельефом карьера (Camera Terrain Collision)
    // Предотвращает прохождение камеры сквозь уступы, откосы, сопки и дно карьера во всех режимах (включая свободный)
    const minCamY = ModelBuilder.getSurfaceHeight(this.camera.position.x, this.camera.position.z) + 5.0;
    if (this.camera.position.y < minCamY) {
      this.camera.position.y = minCamY;
    }

    // Проверка луча видимости от target к камере (предотвращает врезку скалы в камеру)
    const rayDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const rayDist = rayDir.length();
    if (rayDist > 2) {
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const factor = s / steps;
        const testX = this.controls.target.x + rayDir.x * factor;
        const testZ = this.controls.target.z + rayDir.z * factor;
        const testGround = ModelBuilder.getSurfaceHeight(testX, testZ);
        const testY = this.controls.target.y + rayDir.y * factor;
        if (testY < testGround + 3.0) {
          const needed = (testGround + 3.0) - testY;
          this.camera.position.y += needed * factor;
        }
      }
    }

    // Контрольный барьер высоты камеры
    const finalMinCamY = ModelBuilder.getSurfaceHeight(this.camera.position.x, this.camera.position.z) + 4.5;
    if (this.camera.position.y < finalMinCamY) {
      this.camera.position.y = finalMinCamY;
    }

    // 2. Обновление экскаваторов
    excavators.forEach(exc => {
      let excMesh = this.excavatorObjects.get(exc.id);
      if (!excMesh) {
        excMesh = ModelBuilder.buildExcavatorModel(exc);
        excMesh.position.set(exc.x, exc.elevation || 0, exc.z !== undefined ? exc.z : exc.y);
        excMesh.userData = {
          isExcavator: true,
          excId: exc.id,
          poiKey: exc.id === "n_exc_deep" ? "exc_1" :
            (exc.id === "n_exc_mid" ? "exc_2" :
            (exc.id === "n_exc_deep2" ? "exc_4" : "exc_3"))
        };
        this.scene.add(excMesh);
        this.excavatorObjects.set(exc.id, excMesh);
      }

      // Анимация ковша и поворотной платформы
      if (excMesh.userData.turret) {
        if (exc.state === "loading") {
          excMesh.userData.turret.rotation.y = Math.sin(exc.cycleTimer * 1.5) * 0.45;
          if (excMesh.userData.boomPivot) {
            excMesh.userData.boomPivot.rotation.x = -0.5 + Math.sin(exc.cycleTimer * 3) * 0.15;
          }
        } else {
          excMesh.userData.turret.rotation.y = 0;
        }
      }
    });

    // 3. Обновление БелАЗов
    trucks.forEach(truck => {
      let truckMesh = this.truckObjects.get(truck.id);
      let sprite = this.truckSprites.get(truck.id);

      if (!truckMesh) {
        truckMesh = ModelBuilder.buildBelazTruckModel(truck);
        this.scene.add(truckMesh);
        this.truckObjects.set(truck.id, truckMesh);

        sprite = this.createTruckBadgeSprite(truck);
        this.scene.add(sprite);
        this.truckSprites.set(truck.id, sprite);
      }

      // Плавное позиционирование в 3D пространстве с контролем высоты рельефа
      const tz = truck.z !== undefined ? truck.z : truck.y;
      const gH = ModelBuilder.getSurfaceHeight(truck.x, tz);
      const elev = Math.max(truck.elevation || 0, gH);
      truckMesh.position.set(truck.x, elev, tz);
      truckMesh.rotation.y = truck.yaw || 0;
      truckMesh.rotation.x = -(truck.pitch || 0);

      // Анимация подъема кузова при выгрузке (подъем передней части кузова вверх)
      if (truckMesh.userData.dumpPivot) {
        truckMesh.userData.dumpPivot.rotation.x = -(truck.dumpTilt || 0);
      }

      // Горная масса в кузове
      if (truckMesh.userData.loadMesh) {
        truckMesh.userData.loadMesh.visible = truck.isLoaded;
        if (truck.loadType === "rich_ore") {
          truckMesh.userData.loadMesh.material.color.set("#FFB81C"); // золотистая титаномагнетитовая
        } else if (truck.loadType === "standard_ore") {
          truckMesh.userData.loadMesh.material.color.set("#ED7D27"); // оранжевая
        } else {
          truckMesh.userData.loadMesh.material.color.set("#7D8693"); // скальная вскрыша
        }
      }

      // Позиция бейджа над кабиной БелАЗа и динамическое обновление данных
      if (sprite) {
        sprite.position.set(truck.x, (truck.elevation || 0) + 26, (truck.z !== undefined ? truck.z : truck.y));
        if (sprite.userData && (sprite.userData.lastLoad !== Math.round(truck.currentLoad) || sprite.userData.lastType !== truck.loadType)) {
          this.drawTruckBadge(sprite.userData, truck);
        }
      }
    });

    // 4. Обновление стрелок
    this.updateSwitches(quarry);

    // 4.6. Подсветка выбранного диспетчером самосвала
    if (!this.selectionRing) {
      const ringGeo = new THREE.RingGeometry(8, 10.5, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#FFB81C",
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
      this.selectionRing.visible = false;
      this.scene.add(this.selectionRing);
    }

    if (this.selectedTruckId) {
      const selectedTruck = trucks.find(t => t.id === this.selectedTruckId);
      if (selectedTruck && this.selectionRing) {
        this.selectionRing.visible = true;
        this.selectionRing.position.set(selectedTruck.x, (selectedTruck.elevation || 0) + 0.6, selectedTruck.z !== undefined ? selectedTruck.z : selectedTruck.y);
        const pulse = 1.0 + Math.sin(performance.now() * 0.008) * 0.12;
        this.selectionRing.scale.set(pulse, pulse, pulse);
      }
    } else if (this.selectionRing) {
      this.selectionRing.visible = false;
    }

    // 5. Отрисовка сцены (скайбокс центрируется строго на камере, исключая любые срезы)
    if (this.skyDome) {
      this.skyDome.position.copy(this.camera.position);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Создание парящей 3D таблички-бейджа над промышленными комплексами и забоями
   */
  createBuildingBadgeSprite(title, subtitle, statusText, statusColor = "#FFB81C") {
    const canvas = document.createElement("canvas");
    canvas.width = 680;
    canvas.height = 190;
    const ctx = canvas.getContext("2d");

    // Подложка glassmorphism
    ctx.fillStyle = "rgba(18, 22, 26, 0.94)";
    ctx.beginPath();
    ctx.roundRect(10, 10, 660, 170, 16);
    ctx.fill();

    // Фирменная окантовка ЕВРАЗ
    ctx.strokeStyle = "#ED7D27";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Динамический расчет размера шрифта для гарантированного умещения любого заголовка
    let titleFontSize = 28;
    ctx.font = `900 ${titleFontSize}px system-ui, sans-serif`;
    while (ctx.measureText(title).width > 620 && titleFontSize > 16) {
      titleFontSize -= 1;
      ctx.font = `900 ${titleFontSize}px system-ui, sans-serif`;
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText(title, 340, 56);

    // Подзаголовок
    let subFontSize = 19;
    ctx.font = `500 ${subFontSize}px system-ui, sans-serif`;
    while (ctx.measureText(subtitle).width > 620 && subFontSize > 13) {
      subFontSize -= 1;
      ctx.font = `500 ${subFontSize}px system-ui, sans-serif`;
    }
    ctx.fillStyle = "#A0AEC0";
    ctx.fillText(subtitle, 340, 94);

    // Плашка статуса
    ctx.fillStyle = "#14171A";
    ctx.beginPath();
    ctx.roundRect(100, 116, 480, 42, 8);
    ctx.fill();

    ctx.fillStyle = statusColor;
    ctx.font = "bold 18px monospace";
    ctx.fillText(statusText, 340, 143);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, depthWrite: false, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 20;
    sprite.scale.set(78, 22, 1);
    return sprite;
  }

  /**
   * Вычисление минимальной безопасной высоты камеры с учетом рельефа уступов карьера
   */
  getQuarrySafeY(x, z) {
    return ModelBuilder.getSurfaceHeight(x, z) + 5.0;
  }

  /**
   * Конфигурации точек внимания (POIs) с выверенными ракурсами и удобным зумом
   */
  getPoiConfig(poiKey, param, game) {
    switch (poiKey) {
      case "overview":
      case "top":
      case "perspective":
        return {
          id: "overview",
          name: "Общий вид карьера",
          target: new THREE.Vector3(0, -70, -30),
          camPos: new THREE.Vector3(-850, 750, 850)
        };
      case "pit_bottom":
        return {
          id: "pit_bottom",
          name: "Дно карьера (-195м)",
          target: new THREE.Vector3(0, -195, 0),
          camPos: new THREE.Vector3(260, -100, 260)
        };
      case "gof":
        return {
          id: "gof",
          name: "ГОФ-1 • Дробильный комплекс",
          target: new THREE.Vector3(-480, 25, -620),
          camPos: new THREE.Vector3(-300, 260, -380)
        };
      case "fuel":
        return {
          id: "fuel",
          name: "АЗС ГТК • Заправочный комплекс",
          target: new THREE.Vector3(40, 20, -640),
          camPos: new THREE.Vector3(40, 230, -420)
        };
      case "service":
        return {
          id: "service",
          name: "РМЦ • База ТО и Ремонтные боксы",
          target: new THREE.Vector3(240, 20, -640),
          camPos: new THREE.Vector3(240, 240, -420)
        };
      case "parking":
        return {
          id: "parking",
          name: "Площадка отстоя • Ангар РМЦ",
          target: new THREE.Vector3(380, 20, -640),
          camPos: new THREE.Vector3(380, 230, -420)
        };
      case "dump":
        return {
          id: "dump",
          name: "Северный отвал • Вскрыша",
          target: new THREE.Vector3(520, 25, -600),
          camPos: new THREE.Vector3(340, 260, -360)
        };
      case "cup":
        return {
          id: "cup",
          name: "ЦУП • Диспетчерская вышка",
          target: new THREE.Vector3(-350, 25, -720),
          camPos: new THREE.Vector3(-350, 230, -500)
        };
      case "exc_1":
      case "n_exc_deep":
        return {
          id: "exc_1",
          name: "Забой 1 • Liebherr R 9400 (-195м, Запад)",
          target: new THREE.Vector3(-100, -190, 20),
          camPos: new THREE.Vector3(100, -90, 160)
        };
      case "exc_2":
      case "n_exc_mid":
        return {
          id: "exc_2",
          name: "Забой 2 • Liebherr R 9250 (-95м)",
          target: new THREE.Vector3(-188, -90, -241),
          camPos: new THREE.Vector3(10, 0, -120)
        };
      case "exc_3":
      case "n_exc_waste":
        return {
          id: "exc_3",
          name: "Забой 3 • Вскрыша (-45м)",
          target: new THREE.Vector3(-349, -40, 277),
          camPos: new THREE.Vector3(-210, 60, 400)
        };
      case "exc_4":
      case "n_exc_deep2":
        return {
          id: "exc_4",
          name: "Забой 4 • Liebherr R 9400 (-195м, Восток)",
          target: new THREE.Vector3(100, -190, 20),
          camPos: new THREE.Vector3(260, -90, 160)
        };
      case "truck":
        if (game && game.trucks) {
          const truck = game.trucks.find(t => t.id === param);
          if (truck) {
            const yaw = truck.yaw || 0;
            const target = new THREE.Vector3(truck.x, (truck.elevation || 0) + 4.5, truck.z !== undefined ? truck.z : truck.y);
            // Просторное удаление камеры: 160м назад и 80м вверх (в 2.5 раза свободнее прежних 85м/45м)
            const camOffset = new THREE.Vector3(
              -Math.sin(yaw) * 160,
              80,
              -Math.cos(yaw) * 160
            );
            return {
              id: `truck_${truck.id}`,
              name: `${truck.id} (${truck.config.name})`,
              target,
              camPos: target.clone().add(camOffset),
              truckId: truck.id
            };
          }
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Плавный запуск перехода камеры
   */
  startCameraTransition(targetCamPos, targetLookAt, duration = 0.9, onComplete = null) {
    this.cameraTransition = {
      active: true,
      startCamPos: this.camera.position.clone(),
      targetCamPos: targetCamPos.clone(),
      startLookAt: this.controls.target.clone(),
      targetLookAt: targetLookAt.clone(),
      progress: 0,
      duration: Math.max(0.4, duration),
      onComplete
    };
  }

  /**
   * Активация точки внимания или слежения
   */
  setCameraPoi(poiKey, param = null, game = null, smooth = true) {
    if (!game) game = this.lastGameRef;

    if (poiKey === "free") {
      this.currentPoi = "free";
      this.trackingTruckId = null;
      if (this.cameraTransition) this.cameraTransition.active = false;
      if (game && game.hud && game.hud.updateCameraPoiUI) {
        game.hud.updateCameraPoiUI("free");
      }
      return;
    }

    const config = this.getPoiConfig(poiKey, param, game);
    if (!config) return;

    this.currentPoi = poiKey;
    if (poiKey === "truck" && param) {
      this.trackingTruckId = param;
    } else {
      this.trackingTruckId = null;
    }

    if (smooth) {
      this.startCameraTransition(config.camPos, config.target, 0.9);
    } else {
      this.camera.position.copy(config.camPos);
      this.controls.target.copy(config.target);
    }

    if (game && game.hud && game.hud.updateCameraPoiUI) {
      game.hud.updateCameraPoiUI(poiKey, param);
    }
  }

  /**
   * Обратная совместимость для смены вида камеры
   */
  focusView(viewType) {
    this.setCameraPoi(viewType, null, this.lastGameRef, true);
  }

  /**
   * Обработка клика по 3D объектам (Стрелки дорог, БелАЗы, Экскаваторы, Здания)
   */
  handlePointerDown(event, game) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Стрелочные указатели теперь работают исключительно в автоматическом режиме СЦБ (по ходу поезда машин)
    // Управление потоками осуществляется через диспетчеризацию БелАЗов и карточки объектов

    // 1. Проверяем клик по БелАЗам (фокус камеры + слежение + открытие карточки)
    const truckMeshes = Array.from(this.truckObjects.values());
    const truckHits = this.raycaster.intersectObjects(truckMeshes, true);
    if (truckHits.length > 0) {
      let topHit = truckHits[0].object;
      while (topHit.parent && !topHit.name.startsWith("truck_") && topHit.parent !== this.scene) {
        topHit = topHit.parent;
      }
      const truckId = topHit.name.replace("truck_", "");
      const truck = game.trucks.find(t => t.id === truckId);
      if (truck) {
        this.selectedTruckId = truck.id;
        sound.playRadioBeep();
        this.setCameraPoi("truck", truck.id, game, true);
        if (game.hud && game.hud.showTruckDispatchCard) {
          game.hud.showTruckDispatchCard(truck);
        }
        return true;
      }
    }

    // 3. Проверяем клик по 3D бейджам над зданиями и забоями
    if (this.buildingBadges && this.buildingBadges.length > 0) {
      const badgeHits = this.raycaster.intersectObjects(this.buildingBadges, false);
      if (badgeHits.length > 0) {
        const poiKey = badgeHits[0].object.userData.poiType;
        if (poiKey) {
          sound.playClick();
          this.setCameraPoi(poiKey, null, game, true);
          if (game.hud && game.hud.showBuildingInfoCard) {
            game.hud.showBuildingInfoCard(poiKey);
          }
          return true;
        }
      }
    }

    // 4. Проверяем клик по экскаваторам в забоях
    const excMeshes = Array.from(this.excavatorObjects.values());
    const excHits = this.raycaster.intersectObjects(excMeshes, true);
    if (excHits.length > 0) {
      let topHit = excHits[0].object;
      while (topHit.parent && !topHit.userData.isExcavator && topHit.parent !== this.scene) {
        topHit = topHit.parent;
      }
      const poiKey = topHit.userData.poiKey || "exc_1";
      sound.playClick();
      this.setCameraPoi(poiKey, null, game, true);
      const exc = game.excavators.find(e => e.id === topHit.userData.excId);
      if (exc) {
        game.dispatcher.addWarning(`[КАМЕРА] Фокус на забое: ${exc.name}`);
        if (game.hud && game.hud.showBuildingInfoCard) {
          game.hud.showBuildingInfoCard(poiKey);
        }
      }
      return true;
    }

    // 5. Проверяем клик по промышленным комплексам (ГОФ, АЗС, РМЦ, ЦУП, Отвал)
    const buildingMeshes = Array.from(this.buildingObjects.values());
    const bldHits = this.raycaster.intersectObjects(buildingMeshes, true);
    if (bldHits.length > 0) {
      let topHit = bldHits[0].object;
      while (topHit.parent && !topHit.userData.poiType && topHit.parent !== this.scene) {
        topHit = topHit.parent;
      }
      const poiType = topHit.userData.poiType;
      if (poiType) {
        sound.playClick();
        this.setCameraPoi(poiType, null, game, true);
        const name = topHit.userData.name || poiType;
        game.dispatcher.addWarning(`[КАМЕРА] Фокус на объекте: ${name}`);
        if (game.hud && game.hud.showBuildingInfoCard) {
          game.hud.showBuildingInfoCard(poiType);
        }
        return true;
      }
    }

    return false;
  }

  resize() {
    const width = this.canvas.clientWidth || Math.max(800, window.innerWidth - 380);
    const height = this.canvas.clientHeight || Math.max(600, window.innerHeight - 52);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
