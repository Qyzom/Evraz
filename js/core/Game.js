/**
 * Главный движок симуляции ESIM DISPATCH
 */

import { EVRAZ_CONFIG } from "../config.js";
import { sound } from "../audio.js";
import { Dispatcher } from "./Dispatcher.js";
import { Quarry } from "../entities/Quarry.js";
import { Excavator } from "../entities/Excavator.js";
import { Truck } from "../entities/Truck.js";
import { Renderer } from "../ui/Renderer.js";
import { HUD } from "../ui/HUD.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.quarry = new Quarry();
    this.dispatcher = new Dispatcher(this.quarry);
    this.renderer = new Renderer(canvas);
    this.camera = this.renderer.camera;

    this.trucks = [];
    this.excavators = [];

    this.shiftDurationSec = EVRAZ_CONFIG.company.gameShiftSeconds;
    this.shiftSecondsRemaining = this.shiftDurationSec;
    this.isPaused = false;
    this.isShiftEnded = false;
    this.autoDispatcherMode = false;
    this.dispatcher.aiMode = this.autoDispatcherMode;

    this.timeSpeed = 1.0;
    this.prevNonZeroSpeed = 1.0;

    this.hud = null;
    this.lastTime = 0;

    this.initEntities();
    this.initInteraction();
  }

  initEntities() {
    this.excavators.push(new Excavator("n_exc_deep", "liebherr_9400", -100, -195, 20, 195, "rich_ore", "Экскаватор №1 (Liebherr 9400, Запад)"));
    this.excavators.push(new Excavator("n_exc_mid", "liebherr_9250", -188, -95, -241, 95, "standard_ore", "Экскаватор №2 (Liebherr 9250)"));
    this.excavators.push(new Excavator("n_exc_waste", "liebherr_9250", -349, -45, 277, 45, "waste", "Экскаватор №3 (Вскрыша)"));
    this.excavators.push(new Excavator("n_exc_deep2", "liebherr_9400", 100, -195, 20, 195, "rich_ore", "Экскаватор №4 (Liebherr 9400, Восток)"));

    const truckDistribution = [
      { type: "belaz_75313", count: 4 },
      { type: "belaz_75131", count: 8 }
    ];

    let idCounter = 101;
    const spawnNodes = ["n_surface_west", "n_surface_mid", "n_surface_east", "n_ramp_west_top", "n_ramp_east_top", "n_w_b1", "n_e_b1"];

    truckDistribution.forEach(dist => {
      for (let i = 0; i < dist.count; i++) {
        const startNode = spawnNodes[i % spawnNodes.length];
        const truck = new Truck(`БелАЗ-${idCounter++}`, dist.type, startNode, this.quarry);
        this.trucks.push(truck);
      }
    });
  }

  initInteraction() {
    let pointerDownPos = { x: 0, y: 0 };

    this.canvas.addEventListener("pointerdown", (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener("pointerup", (e) => {
      sound.init();
      // Если было значительное перемещение мыши (вращение/панорамирование камеры), клик не засчитываем
      const distMoved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (distMoved > 6) return;

      const hit = this.renderer.handlePointerDown(e, this);
      if (!hit) {
        // Клик в пустое пространство/ландшафт: убираем карточки и сбрасываем фокус
        if (this.hud) {
          this.hud.hideTruckCard();
          this.hud.hideBuildingInfoCard();
        }
        this.renderer.selectedTruckId = null;
      }
    });

    // Горячие клавиши для быстрой смены точек внимания (POIs)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.hud) {
          this.hud.hideTruckCard();
          this.hud.hideBuildingInfoCard();
        }
        this.renderer.selectedTruckId = null;
        this.renderer.setCameraPoi("free", null, this);
      } else if (e.key === "0") {
        if (this.hud) {
          this.hud.hideTruckCard();
          this.hud.hideBuildingInfoCard();
        }
        this.renderer.setCameraPoi("overview", null, this);
      } else if (e.key === "1") {
        this.renderer.setCameraPoi("exc_1", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("exc_1");
      } else if (e.key === "2") {
        this.renderer.setCameraPoi("exc_2", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("exc_2");
      } else if (e.key === "3") {
        this.renderer.setCameraPoi("exc_3", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("exc_3");
      } else if (e.key === "4") {
        this.renderer.setCameraPoi("exc_4", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("exc_4");
      } else if (e.key === "5") {
        this.renderer.setCameraPoi("gof", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("gof");
      } else if (e.key === "6") {
        this.renderer.setCameraPoi("dump", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("dump");
      } else if (e.key === "7") {
        this.renderer.setCameraPoi("fuel", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("fuel");
      } else if (e.key === "8") {
        this.renderer.setCameraPoi("service", null, this);
        if (this.hud) this.hud.showBuildingInfoCard("service");
      } else if (e.code === "Space" || e.key === " ") {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        if (this.timeSpeed > 0) {
          this.setTimeSpeed(0);
        } else {
          this.setTimeSpeed(this.prevNonZeroSpeed || 1.0);
        }
      }
    });
  }

  setTimeSpeed(multiplier, notify = true) {
    if (multiplier > 0) {
      this.prevNonZeroSpeed = multiplier;
    }
    this.timeSpeed = multiplier;
    if (this.hud && this.hud.updateSpeedButtons) {
      this.hud.updateSpeedButtons(multiplier);
    }
    sound.playClick();
    if (notify) {
      if (multiplier === 0) {
        this.dispatcher.addWarning("[ВРЕМЯ] Пауза смены (0x). Клавиша [Пробел] — продолжить.");
      } else {
        this.dispatcher.addWarning(`[ВРЕМЯ] Скорость симуляции установлена: ${multiplier}x`);
      }
    }
  }

  toggleAutoDispatcher() {
    this.autoDispatcherMode = !this.autoDispatcherMode;
    this.dispatcher.aiMode = this.autoDispatcherMode;
    sound.playClick();
    if (this.autoDispatcherMode) {
      this.dispatcher.addWarning("[АСУ ГТК] Автоматическая динамическая маршрутизация активирована.");
    } else {
      this.dispatcher.addWarning("[РЕЖИМ] Ручное диспетчерское управление активировано.");
    }
    return this.autoDispatcherMode;
  }

  runAutoDispatcherLogic(dtSec = 0.016) {
    this.autoTimer = (this.autoTimer || 0) + dtSec;
    if (this.autoTimer < 1.2) return;
    this.autoTimer = 0;

    // 1. Контроль топлива и технического состояния: автоматическая отправка на АЗС и РМЦ
    this.trucks.forEach(t => {
      const fuelPct = (t.fuel / t.config.fuelTank) * 100;
      if (fuelPct < 25 && t.targetStationId !== "n_fuel" && t.state !== "servicing") {
        t.dispatchTo("n_fuel");
        this.dispatcher.addWarning(`[АВТОМАТИКА] ${t.id} направлен на АЗС (остаток топлива: ${Math.round(fuelPct)}%)`);
      } else if (t.condition < 45 && t.targetStationId !== "n_service" && t.state !== "servicing") {
        t.dispatchTo("n_service");
        this.dispatcher.addWarning(`[АВТОМАТИКА] ${t.id} направлен в РМЦ на ТО (состояние: ${Math.round(t.condition)}%)`);
      }
    });

    // 2. Интеллектуальное распределение порожних самосвалов по всем 4 забоям карьера
    const excTargets = [
      { id: "n_exc_deep", name: "Забой 1 (Liebherr 9400 Запад)" },
      { id: "n_exc_deep2", name: "Забой 4 (Liebherr 9400 Восток)" },
      { id: "n_exc_mid", name: "Забой 2 (Liebherr 9250 Рядовая)" },
      { id: "n_exc_waste", name: "Забой 3 (Liebherr 9250 Вскрыша)" }
    ];

    const excLoads = {};
    excTargets.forEach(e => {
      excLoads[e.id] = this.trucks.filter(t => 
        (t.targetStationId === e.id) || 
        (t.currentNodeId === e.id && t.state === "queued_load")
      ).length;
    });

    // Направляем освободившиеся порожние машины в наименее загруженный забой
    this.trucks.forEach(t => {
      if (t.state === "moving_empty" && !t.targetStationId) {
        let bestExc = excTargets[0];
        let minLoad = excLoads[bestExc.id];
        for (const e of excTargets) {
          if (excLoads[e.id] < minLoad) {
            minLoad = excLoads[e.id];
            bestExc = e;
          }
        }
        t.dispatchTo(bestExc.id);
        excLoads[bestExc.id]++;
        this.dispatcher.addWarning(`[АВТОМАТИКА] ${t.id} направлен в: ${bestExc.name} (очередь: ${minLoad} ед.)`);
      }
    });

    // 3. Вывод самосвалов из резерва ангара на маршруты при готовности техники
    this.trucks.forEach(t => {
      if (t.state === "parked" && (t.fuel / t.config.fuelTank) >= 0.35 && t.condition >= 80) {
        let bestExc = excTargets[0];
        let minLoad = excLoads[bestExc.id];
        for (const e of excTargets) {
          if (excLoads[e.id] < minLoad) {
            minLoad = excLoads[e.id];
            bestExc = e;
          }
        }
        t.dispatchTo(bestExc.id);
        excLoads[bestExc.id]++;
        this.dispatcher.addWarning(`[АВТОМАТИКА] ${t.id} выведен из ангара на маршрут: ${bestExc.name}`);
      }
    });

    // 3. Синхронизация стрелок по фактической загрузке забоев
    const floorHub = this.quarry.getNode("n_floor_hub");
    if (floorHub) {
      const idxDeep1 = floorHub.branches.indexOf("n_exc_deep");
      const idxDeep2 = floorHub.branches.indexOf("n_exc_deep2");
      if (excLoads["n_exc_deep"] > excLoads["n_exc_deep2"] && floorHub.activeBranch !== idxDeep2 && idxDeep2 !== -1) {
        floorHub.activeBranch = idxDeep2;
        this.dispatcher.addWarning("[АВТОМАТИКА] Стрелка дна переключена: Забой 4 (Liebherr 9400 Восток)");
      } else if (excLoads["n_exc_deep2"] > excLoads["n_exc_deep"] && floorHub.activeBranch !== idxDeep1 && idxDeep1 !== -1) {
        floorHub.activeBranch = idxDeep1;
        this.dispatcher.addWarning("[АВТОМАТИКА] Стрелка дна переключена: Забой 1 (Liebherr 9400 Запад)");
      }
    }

    const wB1Hub = this.quarry.getNode("n_w_b1_hub");
    if (wB1Hub) {
      const idxWaste = wB1Hub.branches.indexOf("n_exc_waste");
      const idxB2 = wB1Hub.branches.indexOf("n_w_b2");
      if (excLoads["n_exc_waste"] <= 1 && wB1Hub.activeBranch !== idxWaste && idxWaste !== -1) {
        wB1Hub.activeBranch = idxWaste;
      } else if (excLoads["n_exc_waste"] >= 3 && wB1Hub.activeBranch !== idxB2 && idxB2 !== -1) {
        wB1Hub.activeBranch = idxB2;
      }
    }

    const wB2Hub = this.quarry.getNode("n_w_b2_hub");
    if (wB2Hub) {
      const idxMid = wB2Hub.branches.indexOf("n_exc_mid");
      const idxB3 = wB2Hub.branches.indexOf("n_w_b3");
      if (excLoads["n_exc_mid"] <= 1 && wB2Hub.activeBranch !== idxMid && idxMid !== -1) {
        wB2Hub.activeBranch = idxMid;
      } else if (excLoads["n_exc_mid"] >= 3 && wB2Hub.activeBranch !== idxB3 && idxB3 !== -1) {
        wB2Hub.activeBranch = idxB3;
      }
    }
  }

  start() {
    this.hud = new HUD(this);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(currentTime) {
    const realDt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    const simDt = realDt * (this.timeSpeed !== undefined ? this.timeSpeed : 1.0);

    if (simDt > 0 && !this.isPaused && !this.isShiftEnded) {
      this.update(simDt);
    }

    this.renderer.render(this, realDt);
    if (this.hud) {
      this.hud.update();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dtSec) {
    this.shiftSecondsRemaining -= dtSec;
    if (this.shiftSecondsRemaining <= 0) {
      this.shiftSecondsRemaining = 0;
      this.endShift();
    }

    if (this.autoDispatcherMode) {
      this.runAutoDispatcherLogic(dtSec);
    }

    this.excavators.forEach(e => e.update(dtSec));
    this.trucks.forEach(t => t.update(dtSec, this.dispatcher));
    this.dispatcher.update(dtSec, this.trucks, this.excavators, this.shiftSecondsRemaining);
  }

  endShift() {
    this.isShiftEnded = true;
    sound.playShiftEnd();
    if (this.hud) {
      this.hud.showShiftSummaryModal(this.dispatcher.stats);
    }
  }

  restart() {
    this.trucks = [];
    this.excavators = [];
    this.dispatcher = new Dispatcher(this.quarry);
    this.shiftSecondsRemaining = this.shiftDurationSec;
    this.isShiftEnded = false;
    this.initEntities();
  }
}
