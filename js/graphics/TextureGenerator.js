/**
 * Генератор текстур высокого разрешения для 3D сцены ESIM DISPATCH
 * Создает процедурные текстуры в памяти Canvas для промышленной эстетики ЕВРАЗ
 */

import * as THREE from "three";

export class TextureGenerator {
  /**
   * Текстура фасада ГОФ (Обогатительная фабрика)
   */
  static createGofFacadeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Основной фон: Индустриальный графит
    ctx.fillStyle = "#1E2227";
    ctx.fillRect(0, 0, 1024, 512);

    // Гофрированные металлические панели
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 2;
    for (let x = 0; x < 1024; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // Горизонтальные балки
    ctx.fillStyle = "#14171A";
    ctx.fillRect(0, 100, 1024, 16);
    ctx.fillRect(0, 240, 1024, 16);
    ctx.fillRect(0, 380, 1024, 16);

    // Фирменная полоса ЕВРАЗ
    ctx.fillStyle = "#ED7D27";
    ctx.fillRect(0, 480, 1024, 32);
    ctx.fillStyle = "#FFB81C";
    ctx.fillRect(0, 470, 1024, 10);
    ctx.fillStyle = "#E4002B";
    ctx.fillRect(0, 462, 1024, 8);

    // Архитектурный карниз здания
    ctx.fillStyle = "#14171A";
    ctx.fillRect(60, 40, 904, 110);
    ctx.strokeStyle = "#ED7D27";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 40, 904, 110);

    // Технологические жалюзи / решетки вентиляции
    ctx.fillStyle = "#111417";
    for (let b = 0; b < 4; b++) {
      const bx = 100 + b * 220;
      ctx.fillRect(bx, 240, 160, 140);
      ctx.strokeStyle = "#333A42";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, 240, 160, 140);
      for (let y = 250; y < 370; y += 12) {
        ctx.beginPath();
        ctx.moveTo(bx + 10, y);
        ctx.lineTo(bx + 150, y);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Текстура ворот РМЦ (Ремонтно-механический цех / База ТО)
   */
  static createRmcFacadeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Графитовый фасад
    ctx.fillStyle = "#1E2227";
    ctx.fillRect(0, 0, 1024, 512);

    // Верхняя балка
    ctx.fillStyle = "#14171A";
    ctx.fillRect(40, 30, 944, 90);
    ctx.strokeStyle = "#ED7D27";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 30, 944, 90);

    // 3 больших сервисных пролета для БелАЗов
    for (let i = 0; i < 3; i++) {
      const gx = 70 + i * 310;
      const gy = 150;
      const gw = 260;
      const gh = 340;

      // Рама ворот
      ctx.fillStyle = "#2D3239";
      ctx.fillRect(gx, gy, gw, gh);

      // Сигнальная черно-желтая разметка над въездом
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx, gy, gw, 30);
      ctx.clip();
      ctx.fillStyle = "#FFB81C";
      ctx.fillRect(gx, gy, gw, 30);
      ctx.fillStyle = "#14171A";
      for (let sx = -50; sx < gw + 50; sx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx + sx, gy);
        ctx.lineTo(gx + sx + 20, gy);
        ctx.lineTo(gx + sx, gy + 30);
        ctx.lineTo(gx + sx - 20, gy + 30);
        ctx.fill();
      }
      ctx.restore();

      // Секционные ворота
      ctx.fillStyle = "#181B1E";
      ctx.fillRect(gx + 10, gy + 35, gw - 20, gh - 35);

      ctx.strokeStyle = "#383F47";
      ctx.lineWidth = 3;
      for (let y = gy + 50; y < gy + gh - 10; y += 30) {
        ctx.beginPath();
        ctx.moveTo(gx + 15, y);
        ctx.lineTo(gx + gw - 15, y);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /**
   * Текстура вывески ЦУП (Центр управления производством)
   */
  static createCupFacadeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#1E2227";
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = "#14171A";
    ctx.fillRect(20, 20, 472, 110);
    ctx.strokeStyle = "#ED7D27";
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 472, 110);

    // Панорамные тонированные окна
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#193246";
      ctx.fillRect(30 + i * 115, 140, 100, 95);
      ctx.strokeStyle = "#3E5D77";
      ctx.lineWidth = 2;
      ctx.strokeRect(30 + i * 115, 140, 100, 95);
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Текстура геологического разреза карьера (Strata layers)
   */
  static createStrataTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Градиент геологических пластов
    const layers = [
      { y: 0, h: 250, color: "#544B44", sub: "#3F3731", name: "Вскрышные скальные породы" },
      { y: 250, h: 250, color: "#6A5D54", sub: "#534840", name: "Рядовая магнетитовая руда" },
      { y: 500, h: 250, color: "#827063", sub: "#645549", name: "Титаномагнетитовый горизонт" },
      { y: 750, h: 274, color: "#9E8267", sub: "#7D664F", name: "Богатая руда (Fe 62%)" }
    ];

    layers.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillRect(0, l.y, 512, l.h);

      // Прожилки и трещины породы
      ctx.fillStyle = l.sub;
      for (let i = 0; i < 30; i++) {
        const py = l.y + Math.random() * l.h;
        ctx.fillRect(0, py, 512, 4 + Math.random() * 8);
      }

      // Золотисто-оранжевые вкрапления руды
      if (l.y >= 500) {
        ctx.fillStyle = "rgba(255, 184, 28, 0.4)";
        for (let j = 0; j < 50; j++) {
          const rx = Math.random() * 512;
          const ry = l.y + Math.random() * l.h;
          ctx.fillRect(rx, ry, 6 + Math.random() * 14, 2 + Math.random() * 4);
        }
      }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * Текстура откосов уступов карьера (взорванная скала, прожилки руды, следы бурения)
   */
  static createPitSlopeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // 1. Естественный светлый тон скального уступа железнорудного карьера (Евраз КГОК)
    ctx.fillStyle = "#6E655D";
    ctx.fillRect(0, 0, 1024, 512);

    // 2. Горизонтальные геологические пласты осадочно-магматических пород
    for (let y = 0; y < 512; y += 4) {
      const noise = Math.sin(y * 0.05) * 18 + Math.cos(y * 0.12) * 10;
      const shade = Math.floor(100 + noise);
      ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.92)}, ${Math.floor(shade * 0.84)})`;
      ctx.fillRect(0, y, 1024, 4);
    }

    // 3. Контрастные рудные пласты богатого титаномагнетита (Fe 62-64%)
    ctx.fillStyle = "rgba(42, 34, 28, 0.7)";
    for (let i = 0; i < 35; i++) {
      const y = Math.random() * 512;
      const h = 4 + Math.random() * 10;
      ctx.fillRect(0, y, 1024, h);
    }

    // 4. Янтарно-золотистые вкрапления рудного минерала
    ctx.fillStyle = "rgba(237, 125, 39, 0.3)";
    for (let i = 0; i < 180; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, 6 + Math.random() * 16, 2 + Math.random() * 4);
    }

    // 5. Следы взрывных скважин и вертикального бурения станков СБШ
    ctx.strokeStyle = "rgba(35, 28, 22, 0.35)";
    ctx.lineWidth = 2;
    for (let x = 0; x < 1024; x += 22 + Math.random() * 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      let cx = x;
      for (let y = 0; y < 512; y += 32) {
        cx += (Math.random() - 0.5) * 3;
        ctx.lineTo(cx, y);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 16;
    tex.repeat.set(12, 1);
    return tex;
  }

  /**
   * Текстура дна и горизонтальных берм карьера (укатанный гравий, рудная пыль, колеи)
   */
  static createPitFloorTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Скальный горизонт естественного освещения
    ctx.fillStyle = "#635A52";
    ctx.fillRect(0, 0, 1024, 1024);

    // Зернистость дробленой руды и гравия
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 2 + Math.random() * 5;
      ctx.fillStyle = Math.random() > 0.6 ? "#786E64" : (Math.random() > 0.3 ? "#4A4138" : "#362F27");
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }

    // Рудная пыль ЕВРАЗ
    ctx.fillStyle = "rgba(237, 125, 39, 0.08)";
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 60 + Math.random() * 120, 40 + Math.random() * 80);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.repeat.set(14, 14);
    return tex;
  }

  /**
   * Текстура полотна технологической дороги с колеей и разметкой
   */
  /**
   * Текстура полотна технологической дороги высокого разрешения
   * Накатанная грунтово-щебеночная карьерная автодорога со следами тяжелых спаренных шин БелАЗ,
   * глубокой колеей, щебнем, скальной крошкой и пылью (без асфальтовых полос!)
   */
  static createRoadTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // 1. Базовый скальный массив дороги: утрамбованный диоритовый щебень
    ctx.fillStyle = "#483F37";
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Зернистость скального щебня и гравийной крошки
    for (let i = 0; i < 2200; i++) {
      const gx = Math.random() * 1024;
      const gy = Math.random() * 1024;
      const sz = 2 + Math.random() * 5;
      const c = Math.random();
      ctx.fillStyle = c > 0.6 ? "#5C5248" : (c > 0.3 ? "#362F29" : "#2B241E");
      ctx.fillRect(gx, gy, sz, sz);
    }

    // 3. Широкие накатанные колеи от спаренных крупногабаритных карьерных шин 40.00R57 (Левая и Правая полосы)
    // Левая полоса (движение вниз/вверх): две колеи спарки (колея 1: 120-220, колея 2: 280-380)
    // Правая полоса (встречное движение): две колеи спарки (колея 3: 640-740, колея 4: 800-900)
    const tireTracks = [
      { start: 110, width: 130 },
      { start: 270, width: 140 },
      { start: 610, width: 140 },
      { start: 780, width: 130 }
    ];

    tireTracks.forEach(tr => {
      // Темный уплотненный гравий в колее под давлением 240-тонных самосвалов
      const rutGrad = ctx.createLinearGradient(tr.start, 0, tr.start + tr.width, 0);
      rutGrad.addColorStop(0.0, "rgba(42, 35, 29, 0.4)");
      rutGrad.addColorStop(0.5, "rgba(26, 21, 17, 0.82)");
      rutGrad.addColorStop(1.0, "rgba(42, 35, 29, 0.4)");
      ctx.fillStyle = rutGrad;
      ctx.fillRect(tr.start, 0, tr.width, 1024);

      // Поперечный протекторный рельеф карьерного рисунка шины (E-4 Deep Rock)
      ctx.fillStyle = "rgba(18, 14, 11, 0.45)";
      for (let y = 0; y < 1024; y += 36) {
        ctx.fillRect(tr.start + 6, y, tr.width - 12, 14);
      }
    });

    // 4. Осевой навал рыхлого щебня и рудной пыли по центру дороги между полосами (430-590)
    const centerGrad = ctx.createLinearGradient(420, 0, 600, 0);
    centerGrad.addColorStop(0.0, "rgba(65, 56, 48, 0.2)");
    centerGrad.addColorStop(0.5, "rgba(82, 72, 63, 0.65)");
    centerGrad.addColorStop(1.0, "rgba(65, 56, 48, 0.2)");
    ctx.fillStyle = centerGrad;
    ctx.fillRect(420, 0, 180, 1024);

    // Камни и фракции щебня на центральном разделительном гребне
    for (let i = 0; i < 450; i++) {
      const cx = 440 + Math.random() * 140;
      const cy = Math.random() * 1024;
      const cr = 2 + Math.random() * 4;
      ctx.fillStyle = Math.random() > 0.5 ? "#63584E" : "#322B24";
      ctx.fillRect(cx, cy, cr, cr);
    }

    // 5. Тонкие полосы рудной пыли ЕВРАЗ вдоль кромок полос
    ctx.fillStyle = "rgba(237, 125, 39, 0.05)";
    ctx.fillRect(100, 0, 320, 1024);
    ctx.fillRect(600, 0, 320, 1024);

    // 6. Скальные предохранительные бровки по внешним краям дороги (0-55 и 969-1024)
    ctx.fillStyle = "#2D251F";
    ctx.fillRect(0, 0, 55, 1024);
    ctx.fillRect(969, 0, 55, 1024);

    for (let i = 0; i < 280; i++) {
      const bx = (Math.random() > 0.5) ? (Math.random() * 50) : (974 + Math.random() * 50);
      const by = Math.random() * 1024;
      ctx.fillStyle = Math.random() > 0.5 ? "#3F362E" : "#1A1511";
      ctx.fillRect(bx, by, 4 + Math.random() * 6, 4 + Math.random() * 6);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.repeat.set(1, 2);
    return tex;
  }

  /**
   * Текстура перекрестка со скруглением
   */
  static createJunctionTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Идентичное полотну дорог основание (утрамбованный скальный щебень)
    ctx.fillStyle = "#483F37";
    ctx.beginPath();
    ctx.arc(256, 256, 255, 0, Math.PI * 2);
    ctx.fill();

    // Зернистость гравия
    for (let i = 0; i < 900; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 248;
      ctx.fillStyle = Math.random() > 0.5 ? "#5C5248" : "#2B241E";
      ctx.fillRect(256 + Math.cos(angle) * dist, 256 + Math.sin(angle) * dist, 3, 3);
    }

    // Круговые следы разворота тяжелых спаренных колес БелАЗ
    ctx.strokeStyle = "rgba(26, 21, 17, 0.7)";
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(256, 256, 170, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(256, 256, 110, 0, Math.PI * 2);
    ctx.stroke();

    // Пылевой налет
    ctx.fillStyle = "rgba(237, 125, 39, 0.05)";
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
  }

  /**
   * Стилизованная векторная траектория АСУ ГТК «ESIM-DISPATCH»
   * Формирует технологичные неоновые направляющие линии поверх рельефа карьера
   */
  static createStylizedPathTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 512, 1024);

    // 1. Полупрозрачная подложка коридора безопасности движения
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 0);
    bgGrad.addColorStop(0.0, "rgba(237, 125, 39, 0.0)");
    bgGrad.addColorStop(0.15, "rgba(30, 24, 20, 0.55)");
    bgGrad.addColorStop(0.5, "rgba(237, 125, 39, 0.08)");
    bgGrad.addColorStop(0.85, "rgba(30, 24, 20, 0.55)");
    bgGrad.addColorStop(1.0, "rgba(237, 125, 39, 0.0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 1024);

    // 2. Двойные светящиеся боковые направляющие шины (EVRAZ Orange & Gold)
    ctx.shadowColor = "#ED7D27";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#ED7D27";
    ctx.lineWidth = 6;

    // Левый рельс
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.lineTo(70, 1024);
    ctx.stroke();

    // Правый рельс
    ctx.beginPath();
    ctx.moveTo(442, 0);
    ctx.lineTo(442, 1024);
    ctx.stroke();

    // Внутренняя золотая кромка
    ctx.shadowColor = "#FFB81C";
    ctx.shadowBlur = 4;
    ctx.strokeStyle = "#FFB81C";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(82, 0);
    ctx.lineTo(82, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(430, 0);
    ctx.lineTo(430, 1024);
    ctx.stroke();

    // 3. Центральная импульсная телеметрия (шевронные стрелки направления движения)
    ctx.shadowColor = "#FFB81C";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFB81C";

    for (let y = 30; y < 1024; y += 128) {
      // Шеврон направления АСУ ГТК (>>>)
      ctx.beginPath();
      ctx.moveTo(256, y);
      ctx.lineTo(290, y + 42);
      ctx.lineTo(276, y + 42);
      ctx.lineTo(256, y + 16);
      ctx.lineTo(236, y + 42);
      ctx.lineTo(222, y + 42);
      ctx.closePath();
      ctx.fill();

      // Боковые точки синхронизации
      ctx.fillStyle = "#ED7D27";
      ctx.fillRect(160, y + 20, 6, 6);
      ctx.fillRect(346, y + 20, 6, 6);
      ctx.fillStyle = "#FFB81C";
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.repeat.set(1, 2);
    return tex;
  }

  /**
   * Стилизованный шеврон стрелочного перевода АСУ ГТК
   */
  static createChevronSwitchTexture(active = true) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 512, 512);

    // Темная контрастная подложка-диск стрелки
    ctx.fillStyle = "rgba(16, 20, 24, 0.9)";
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = active ? "#ED7D27" : "#4A5568";
    ctx.lineWidth = 14;
    ctx.stroke();

    // 3 мощных светящихся шеврона
    const offsets = [65, 185, 305];
    const scales = [1.2, 1.05, 0.9];

    offsets.forEach((oy, idx) => {
      const s = scales[idx];
      ctx.fillStyle = idx === 0 ? "#FFFFFF" : (active ? "#FFB81C" : "#718096");
      ctx.beginPath();
      ctx.moveTo(256, oy);
      ctx.lineTo(256 + 140 * s, oy + 95 * s);
      ctx.lineTo(256 + 95 * s, oy + 95 * s);
      ctx.lineTo(256, oy + 28 * s);
      ctx.lineTo(256 - 95 * s, oy + 95 * s);
      ctx.lineTo(256 - 140 * s, oy + 95 * s);
      ctx.closePath();
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * Яркий панорамный скайбокс сибирского дня с облаками (4K Canvas)
   */
  static createBrightDaySkyTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // 1. Градиент ясного сибирского неба (от глубокого лазурного зенита к горизонту и вниз к туману)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0.0, "#1558A6");  // Насыщенный лазурный зенит (верх купола)
    skyGrad.addColorStop(0.20, "#2563EB"); // Яркий ультрамарин
    skyGrad.addColorStop(0.42, "#4895EF"); // Дневная лазурь
    skyGrad.addColorStop(0.58, "#70AEEA"); // Предгоризонтный свет
    skyGrad.addColorStop(0.72, "#A5CDF5"); // Воздушная дымка
    skyGrad.addColorStop(0.85, "#DCEBFA"); // Теплый солнечный горизонт
    skyGrad.addColorStop(1.0, "#A2C8E8");  // Светлая атмосферная дымка (низ купола, 100% совпадение с fog)

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // 2. Яркое полуденное солнце с короной и лучами
    const sunX = 1480;
    const sunY = 220;

    // Внешнее гало
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 340);
    sunGlow.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
    sunGlow.addColorStop(0.12, "rgba(254, 240, 138, 0.85)");
    sunGlow.addColorStop(0.35, "rgba(251, 191, 36, 0.45)");
    sunGlow.addColorStop(0.7, "rgba(245, 158, 11, 0.15)");
    sunGlow.addColorStop(1.0, "rgba(245, 158, 11, 0.0)");

    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 340, 0, Math.PI * 2);
    ctx.fill();

    // Ядро солнца
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    // 3. Высотные перистые облака (Cirrus streaks)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 14;
    for (let i = 0; i < 28; i++) {
      const cy = 60 + Math.random() * 220;
      const cx = Math.random() * 2048;
      const cLen = 120 + Math.random() * 240;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + cLen * 0.5, cy - 15 + Math.random() * 30, cx + cLen, cy);
      ctx.stroke();
    }

    // 4. Реалистичные кучевые облака (Cumulus) с объемной светотенью
    // Функция отрисовки облачной гряды из мягких сферических мазков
    function drawCloudCluster(baseX, baseY, width, height, density = 45) {
      // Теневая нижняя сторона облака (голубовато-стальной тон)
      for (let i = 0; i < density; i++) {
        const px = baseX + (Math.random() - 0.5) * width;
        const py = baseY + Math.random() * height * 0.5;
        const r = 24 + Math.random() * (height * 0.65);

        const shadeGrad = ctx.createRadialGradient(px, py - r * 0.2, r * 0.2, px, py, r);
        shadeGrad.addColorStop(0.0, "rgba(215, 228, 242, 0.85)");
        shadeGrad.addColorStop(0.65, "rgba(180, 198, 220, 0.65)");
        shadeGrad.addColorStop(1.0, "rgba(180, 198, 220, 0.0)");

        ctx.fillStyle = shadeGrad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Освещенная солнцем верхняя кромка облака (белоснежная с золотым отливом)
      for (let i = 0; i < density * 1.2; i++) {
        const px = baseX + (Math.random() - 0.5) * width * 0.95;
        const py = baseY - Math.random() * height * 0.45;
        const r = 26 + Math.random() * (height * 0.7);

        const litGrad = ctx.createRadialGradient(px - r * 0.25, py - r * 0.25, r * 0.1, px, py, r);
        litGrad.addColorStop(0.0, "rgba(255, 255, 255, 0.95)");
        litGrad.addColorStop(0.6, "rgba(248, 250, 252, 0.8)");
        litGrad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");

        ctx.fillStyle = litGrad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Располагаем живописные облачные массивы по панораме
    const cloudClusters = [
      { x: 280, y: 340, w: 380, h: 110, count: 50 },
      { x: 620, y: 260, w: 480, h: 140, count: 65 },
      { x: 1080, y: 320, w: 340, h: 95, count: 45 },
      { x: 1320, y: 240, w: 260, h: 80, count: 40 }, // рядом с солнцем
      { x: 1840, y: 300, w: 420, h: 120, count: 55 },
      { x: 120, y: 440, w: 520, h: 90, count: 45 },  // горизонтные облака
      { x: 880, y: 460, w: 600, h: 85, count: 45 },
      { x: 1640, y: 450, w: 560, h: 90, count: 45 }
    ];

    cloudClusters.forEach(c => drawCloudCluster(c.x, c.y, c.w, c.h, c.count));

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  /**
   * Текстура поверхности земли (Плато ГОКа с гравием и растительностью)
   */
  static createGroundTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Индустриальный скальный грунт ГОКа
    ctx.fillStyle = "#362F29";
    ctx.fillRect(0, 0, 1024, 1024);

    // Зоны тяжелого суглинка и утрамбованного гравия
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 4 + Math.random() * 14;
      ctx.fillStyle = Math.random() > 0.6 ? "#443C34" : Math.random() > 0.3 ? "#2A231E" : "#1F1916";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Вкрапления сибирского мха и мелких пород
    ctx.fillStyle = "rgba(48, 64, 46, 0.35)";
    for (let i = 0; i < 150; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 16 + Math.random() * 32, 16 + Math.random() * 32);
    }

    // Тонкие трещины и колеи
    ctx.strokeStyle = "rgba(22, 17, 14, 0.4)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      let sx = Math.random() * 1024;
      let sy = Math.random() * 1024;
      ctx.moveTo(sx, sy);
      for (let j = 0; j < 4; j++) {
        sx += (Math.random() - 0.5) * 60;
        sy += (Math.random() - 0.5) * 60;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.repeat.set(12, 12);
    return tex;
  }

  /**
   * Текстура стрелочного указателя направления АСУ ГТК
   */
  static createArrowTexture(active = true) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 256, 256);

    // Круглая светящаяся основа
    ctx.fillStyle = active ? "rgba(237, 125, 39, 0.85)" : "rgba(80, 85, 92, 0.75)";
    ctx.beginPath();
    ctx.arc(128, 128, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = active ? "#FFB81C" : "#A6B0BA";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Стрелка шеврон
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(128, 40);
    ctx.lineTo(200, 140);
    ctx.lineTo(158, 140);
    ctx.lineTo(158, 200);
    ctx.lineTo(98, 200);
    ctx.lineTo(98, 140);
    ctx.lineTo(56, 140);
    ctx.closePath();
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }
}
