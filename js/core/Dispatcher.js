/**
 * Модуль Диспетчера АСУ ГТК «ESIM DISPATCH»:
 * Диспетчерский контроль, учет рудопотоков, расчет финансового баланса,
 * Anti-collision система предотвращения столкновений и управление очередями
 */

import { EVRAZ_CONFIG } from "../config.js";
import { sound } from "../audio.js";

export class Dispatcher {
  constructor(quarry) {
    this.quarry = quarry;
    this.trucks = [];

    this.gofActiveTrucks = [];
    this.dumpActiveTrucks = [];

    this.stats = {
      deliveredOreTons: 0,
      deliveredWasteTons: 0,
      oreByGrade: {
        rich1: 0,   // Забой 1 (Fe 62%)
        rich2: 0,   // Забой 4 (Fe 64%)
        standard: 0 // Забой 2 (Рядовая)
      },
      badOreDeliveries: 0,
      badWasteDeliveries: 0,
      truckIdleLossRub: 0,
      excavatorIdleLossRub: 0,
      badOrePenaltyRub: 0,
      netProfitRub: 0,
      efficiencyKpi: 100,
      totalTrips: 0,
      totalFuelConsumedLiters: 0,
      refuelCount: 0,
      serviceCount: 0,
      breakdownCount: 0,
      ordersGivenCount: 0,
      excavatorStats: {
        n_exc_deep: { name: "Забой 1 (Liebherr 9400 Запад)", tons: 0, trips: 0, grade: "Fe 62%" },
        n_exc_deep2: { name: "Забой 4 (Liebherr 9400 Восток)", tons: 0, trips: 0, grade: "Fe 64%" },
        n_exc_mid: { name: "Забой 2 (Liebherr 9250 Рядовая)", tons: 0, trips: 0, grade: "Рядовая" },
        n_exc_waste: { name: "Забой 3 (Liebherr 9250 Вскрыша)", tons: 0, trips: 0, grade: "Вскрыша" }
      },
      timeUtilization: {
        movingLoaded: 0,
        movingEmpty: 0,
        loading: 0,
        unloading: 0,
        queued: 0,
        servicing: 0
      },
      hourlyStats: Array.from({ length: 12 }, (_, i) => ({
        hour: 8 + i,
        timeLabel: `${String(8 + i).padStart(2, '0')}:00`,
        ore: 0,
        waste: 0,
        losses: 0,
        profit: 0
      }))
    };

    this.warnings = [];
    this.shiftSecondsRemaining = 600;
  }

  update(dtSec, trucks, excavators, shiftSecondsRemaining = 600) {
    this.trucks = trucks;
    this.shiftSecondsRemaining = shiftSecondsRemaining;

    // 1. Управление постами разгрузки на ГОФ и Отвале
    this.manageUnloadStation(
      "n_gof", 
      this.gofActiveTrucks, 
      EVRAZ_CONFIG.zones.gof.slots, 
      trucks,
      { active: { x: -580, y: 0, z: -642 }, queueDir: { x: 1, z: 0 }, yaw: 0 }
    );

    this.manageUnloadStation(
      "n_dump", 
      this.dumpActiveTrucks, 
      EVRAZ_CONFIG.zones.dump.slots, 
      trucks,
      { active: { x: 740, y: 0.4, z: -676 }, queueDir: { x: -1, z: 0 }, yaw: 0 }
    );

    // 1.4. Мобильная аварийная служба РМЦ (оперативная дозаправка техники в карьере)
    trucks.forEach(t => {
      if (t.state === "stopped_breakdown") {
        t.breakdownTimer = (t.breakdownTimer || 0) + dtSec;
        if (!t.emergencyNotified) {
          this.addWarning(`[АВАРИЯ] ${t.id}: остановка (выработка топлива)! Направлен мобильный топливозаправщик РМЦ.`);
          sound.playWarning();
          t.emergencyNotified = true;
        }
        // Мобильный заправщик прибывает за 3.5 секунды
        if (t.breakdownTimer >= 3.5) {
          t.fuel = Math.round(t.config.fuelTank * 0.50); // заливаем 50% бака ДТ
          t.condition = Math.max(75, t.condition);
          t.state = "moving_empty";
          t.targetStationId = "n_fuel";
          t.breakdownTimer = 0;
          t.emergencyNotified = false;
          t.idleTimeSec = 0;
          this.addWarning(`[СЦБ/ТО] ${t.id}: аварийная дозаправка завершена (залито 50% ДТ), машина в строю!`);
          sound.playRadioBeep();
          t.selectNextNode();
        }
      } else {
        t.breakdownTimer = 0;
        t.emergencyNotified = false;
      }
    });

    // 1.5. Управление сервисом, заправкой и резервной площадкой отстоя техники
    this.manageServiceStation("n_fuel", EVRAZ_CONFIG.zones.fuel.slots, trucks, { active: { x: -120, y: 0, z: -700 }, yaw: Math.PI });
    this.manageServiceStation("n_service", EVRAZ_CONFIG.zones.service.slots, trucks, { active: { x: 140, y: 0, z: -700 }, yaw: Math.PI });
    this.manageParkingStation(trucks);

    // 1.6. Генератор случайных отказов и повреждений техники (шины, дизель, гидравлика)
    this.incidentTimer = (this.incidentTimer || 0) + dtSec;
    if (this.incidentTimer > 45) {
      this.incidentTimer = 0;
      const activeMoving = trucks.filter(t => (t.state === "moving_empty" || t.state === "moving_loaded") && t.condition > 40);
      if (activeMoving.length > 0 && Math.random() < 0.75) {
        const victim = activeMoving[Math.floor(Math.random() * activeMoving.length)];
        const incidents = [
          { name: "повреждение карьерной шины 40.00R57 на скальном уступе", loss: 20 },
          { name: "неполадки в системе наддува дизельного двигателя", loss: 10 },
          { name: "падение давления в гидросистеме подъема кузова", loss: 15 },
          { name: "перегрев тягового электропривода на подъеме", loss: 12 }
        ];
        const inc = incidents[Math.floor(Math.random() * incidents.length)];
        victim.condition = Math.max(15, Math.round(victim.condition - inc.loss));
        this.stats.breakdownCount++;
        this.addWarning(`[СЦБ/ТО] ${victim.id}: ${inc.name}! ТС снижено на ${inc.loss}% (ТС: ${Math.round(victim.condition)}%).`);
        sound.playWarning();

        if (victim.condition < 70) {
          if (victim.state === "moving_empty") {
            victim.targetStationId = "n_service";
            victim.selectNextNode();
            this.addWarning(`[СЦБ/ТО] ${victim.id} снят с линии и направлен на Базу ТО (РМЦ).`);
          }
        }
      }
    }

    // 2. Управление очередями и погрузкой у экскаваторов в забоях
    excavators.forEach(exc => {
      // Все ожидающие самосвалы у этого экскаватора
      const queuedTrucks = trucks.filter(t => 
        t.currentNodeId === exc.id && t.state === "queued_load"
      );

      // Если экскаватор свободен — берем первый самосвал из очереди
      if ((exc.state === "waiting_truck" || exc.state === "idle") && queuedTrucks.length > 0) {
        const nextTruck = queuedTrucks[0];
        exc.assignTruck(nextTruck);
      }

      // Позиционирование самосвала под ковшом экскаватора (не накладывается!)
      if (exc.currentTruck) {
        exc.currentTruck.x = exc.x + 18;
        exc.currentTruck.y = exc.y;
        exc.currentTruck.elevation = exc.y;
        exc.currentTruck.z = exc.z - 8;
        exc.currentTruck.yaw = Math.PI / 2;
        exc.currentTruck.pitch = 0;
      }

      // Формирование физической аккуратной очереди ожидания строго вдоль дорожного полотна!
      const waitingTrucks = queuedTrucks.filter(t => t !== exc.currentTruck);
      waitingTrucks.forEach((wt, idx) => {
        const distanceBack = 32 + idx * 28;
        const trail = this.quarry.getPositionBackAlongPath(exc.id, distanceBack);
        if (trail) {
          wt.x = trail.pos.x;
          wt.y = trail.pos.y;
          wt.elevation = trail.pos.y;
          wt.z = trail.pos.z;
          wt.yaw = trail.yaw;
          wt.pitch = trail.pitch;
        } else {
          wt.x = exc.x + 30 + idx * 28;
          wt.y = exc.y;
          wt.elevation = exc.y;
          wt.z = exc.z;
          wt.yaw = 0;
          wt.pitch = 0;
        }
      });
    });

    // 3. Подсчет простоев и финансовой эффективности
    const totalShiftSec = EVRAZ_CONFIG.company.gameShiftSeconds || 600;
    const timeScale = (EVRAZ_CONFIG.company.shiftDurationHours * 3600) / totalShiftSec; // 72 для 10-мин смены

    let idleTrucksCount = 0;

    trucks.forEach(t => {
      if (t.state === "stopped_breakdown") {
        idleTrucksCount++;
        const idlePerHour = t.typeKey === "belaz_75313" 
          ? EVRAZ_CONFIG.finances.belaz240_idlePerHour 
          : EVRAZ_CONFIG.finances.belaz130_idlePerHour;
        this.stats.truckIdleLossRub += (idlePerHour / 3600) * timeScale * dtSec;
      } else if (t.state === "parked") {
        // Простой исправной техники в ангаре / на площадке отстоя без наряд-задания
        idleTrucksCount++;
        const idlePerHour = t.typeKey === "belaz_75313" 
          ? EVRAZ_CONFIG.finances.belaz240_idlePerHour 
          : EVRAZ_CONFIG.finances.belaz130_idlePerHour;
        this.stats.truckIdleLossRub += (idlePerHour / 3600) * timeScale * dtSec;
      } else if (t.state.startsWith("queued") && t.idleTimeSec > 8) {
        // Очередь сверх нормативного буфера маневрирования (8 секунд)
        idleTrucksCount++;
        const idlePerHour = (t.typeKey === "belaz_75313" ? 7500 : 5000) * 0.5;
        this.stats.truckIdleLossRub += (idlePerHour / 3600) * timeScale * dtSec;
      }
    });

    excavators.forEach(e => {
      if (e.state === "waiting_truck") {
        // Проверяем: назначен ли хотя бы один самосвал на этот забой
        const assignedTruck = trucks.some(t => 
          (t.targetStationId === e.id) || 
          (t.currentNodeId === e.id && t.state === "queued_load")
        );
        // Если самосвал уже в пути к экскаватору — это нормативное время подачи, потерь нет!
        // Потери считаются ТОЛЬКО если диспетчер оставил забой БЕЗ машин (простой экскаватора свыше 8с)
        if (!assignedTruck) {
          e.totalIdleTimeSec = (e.totalIdleTimeSec || 0) + dtSec;
          if (e.totalIdleTimeSec > 8) {
            const lossPerSec = (EVRAZ_CONFIG.finances.excavator_idlePerHour / 3600) * timeScale;
            this.stats.excavatorIdleLossRub += lossPerSec * dtSec;
          }
        } else {
          e.totalIdleTimeSec = 0;
        }
      } else {
        e.totalIdleTimeSec = 0;
      }
    });

    // Накопление телеметрии использования парка и расхода топлива
    trucks.forEach(t => {
      // Расход топлива
      const isMoving = t.state === "moving_empty" || t.state === "moving_loaded";
      const fuelBurnRate = isMoving ? t.config.fuelRateMoving : t.config.fuelRateIdle;
      this.stats.totalFuelConsumedLiters += (fuelBurnRate / 3600) * dtSec;

      // Баланс времени
      switch (t.state) {
        case "moving_loaded": this.stats.timeUtilization.movingLoaded += dtSec; break;
        case "moving_empty": this.stats.timeUtilization.movingEmpty += dtSec; break;
        case "loading": this.stats.timeUtilization.loading += dtSec; break;
        case "unloading": this.stats.timeUtilization.unloading += dtSec; break;
        case "queued_load":
        case "queued_unload": this.stats.timeUtilization.queued += dtSec; break;
        case "servicing": this.stats.timeUtilization.servicing += dtSec; break;
        case "parked":
        case "stopped_breakdown":
          if (!this.stats.timeUtilization.parked) this.stats.timeUtilization.parked = 0;
          this.stats.timeUtilization.parked += dtSec;
          break;
      }
    });

    const oreValue = this.stats.deliveredOreTons * EVRAZ_CONFIG.finances.oreValuePerTon;
    const totalLoss = this.stats.truckIdleLossRub + this.stats.excavatorIdleLossRub + this.stats.badOrePenaltyRub;
    this.stats.netProfitRub = oreValue - totalLoss;

    // Запись почасовой динамики смены
    const totalShift = EVRAZ_CONFIG.company.gameShiftSeconds || 3600;
    const currentProgress = Math.max(0, Math.min(1.0, 1 - (this.shiftSecondsRemaining / totalShift)));
    const hourIdx = Math.min(11, Math.floor(currentProgress * 12));
    if (this.stats.hourlyStats && this.stats.hourlyStats[hourIdx]) {
      this.stats.hourlyStats[hourIdx].profit = Math.round(this.stats.netProfitRub);
      this.stats.hourlyStats[hourIdx].losses = Math.round(totalLoss);
    }

    // Честный KPI эффективности диспетчеризации:
    if (oreValue <= 0) {
      this.stats.efficiencyKpi = totalLoss > 0 ? Math.max(70, Math.round(100 - (totalLoss / 10000))) : 100;
    } else {
      const penaltyRatio = totalLoss / (oreValue + totalLoss);
      this.stats.efficiencyKpi = Math.max(0, Math.min(100, Math.round((1 - penaltyRatio * 1.5) * 100)));
    }

    if (idleTrucksCount > 4 && Math.random() < 0.012) {
      this.addWarning("[ВНИМАНИЕ] Скопление техники в очереди. Перенаправьте часть машин в свободные забои.");
      sound.playWarning();
    }
  }

  getApproachNode(excId) {
    if (excId === "exc_3" || excId === "n_exc_waste") return this.quarry.getNode("n_bench1_hub");
    if (excId === "exc_2" || excId === "n_exc_mid") return this.quarry.getNode("n_bench2_hub");
    if (excId === "exc_1" || excId === "n_exc_deep") return this.quarry.getNode("n_bench3_c");
    return null;
  }

  manageUnloadStation(nodeId, activeList, maxSlots, trucks, layout) {
    for (let i = activeList.length - 1; i >= 0; i--) {
      if (activeList[i].state !== "unloading") {
        activeList.splice(i, 1);
      }
    }

    const queued = trucks.filter(t => t.currentNodeId === nodeId && t.state === "queued_unload");

    while (activeList.length < maxSlots && queued.length > 0) {
      const next = queued.shift();
      activeList.push(next);
      next.startUnloading();
    }

    // Позиционирование машин на разгрузке (точно по 3 приемным бункерам)
    activeList.forEach((t, i) => {
      t.x = layout.active.x + (i - (maxSlots - 1) / 2) * 32;
      t.y = layout.active.y;
      t.elevation = layout.active.y;
      t.z = layout.active.z;
      t.yaw = 0;
      t.pitch = 0;
    });

    // Позиционирование машин в очереди разгрузки строго вдоль дороги
    queued.forEach((t, i) => {
      const distanceBack = 36 + i * 28;
      const trail = this.quarry.getPositionBackAlongPath(nodeId, distanceBack);
      if (trail) {
        t.x = trail.pos.x;
        t.y = trail.pos.y;
        t.elevation = trail.pos.y;
        t.z = trail.pos.z;
        t.yaw = trail.yaw;
        t.pitch = trail.pitch;
      } else {
        t.x = layout.active.x + layout.queueDir.x * (36 + i * 30);
        t.y = layout.active.y;
        t.elevation = layout.active.y;
        t.z = layout.active.z + layout.queueDir.z * (36 + i * 30);
      }
    });
  }

  manageServiceStation(nodeId, maxSlots, trucks, layout) {
    const servicing = trucks.filter(t => t.currentNodeId === nodeId && t.state === "servicing");
    servicing.forEach((t, i) => {
      if (i < maxSlots) {
        t.x = layout.active.x + (i - (maxSlots - 1) / 2) * 26;
        t.y = layout.active.y;
        t.elevation = layout.active.y;
        t.z = layout.active.z;
        t.yaw = layout.yaw !== undefined ? layout.yaw : Math.PI;
        t.pitch = 0;
      } else {
        const distanceBack = 36 + (i - maxSlots) * 28;
        const trail = this.quarry.getPositionBackAlongPath(nodeId, distanceBack);
        if (trail) {
          t.x = trail.pos.x;
          t.y = trail.pos.y;
          t.elevation = trail.pos.y;
          t.z = trail.pos.z;
          t.yaw = trail.yaw;
          t.pitch = trail.pitch;
        } else {
          t.x = layout.active.x;
          t.y = layout.active.y;
          t.elevation = layout.active.y;
          t.z = layout.active.z + 36 + (i - maxSlots) * 28;
          t.yaw = 0;
          t.pitch = 0;
        }
      }
    });
  }

  /**
   * Интеллектуальный выбор оптимального забоя для порожнего самосвала (АСУ ГТК «ESIM DISPATCH»).
   * Взвешенный расчет: балансировка рудопотока с приоритетом богатой руды (Забой 1 и Забой 4).
   */
  findOptimalExcavator(truck = null) {
    const excTargets = [
      { id: "n_exc_deep", name: "Забой 1 (Liebherr 9400 Запад)", weight: 1.25 },
      { id: "n_exc_deep2", name: "Забой 4 (Liebherr 9400 Восток)", weight: 1.25 },
      { id: "n_exc_mid", name: "Забой 2 (Liebherr 9250 Рядовая)", weight: 1.0 },
      { id: "n_exc_waste", name: "Забой 3 (Liebherr 9250 Вскрыша)", weight: 0.8 }
    ];

    if (!this.trucks || this.trucks.length === 0) return excTargets[0];

    const excLoads = {};
    excTargets.forEach(e => {
      excLoads[e.id] = this.trucks.filter(t => 
        (t !== truck) && (
          (t.targetStationId === e.id) || 
          (t.currentNodeId === e.id && (t.state === "queued_load" || t.state === "loading"))
        )
      ).length;
    });

    let bestExc = excTargets[0];
    let minScore = excLoads[bestExc.id] / bestExc.weight;
    for (const e of excTargets) {
      const score = excLoads[e.id] / e.weight;
      if (score < minScore) {
        minScore = score;
        bestExc = e;
      }
    }
    return bestExc;
  }

  manageParkingStation(trucks) {
    // В ангаре остаются только те самосвалы, чья цель — стоянка (или нет приказа)
    const parked = trucks.filter(t => 
      t.currentNodeId === "n_parking" && 
      (t.state === "parked" || !t.targetStationId || t.targetStationId === "n_parking")
    );
    parked.forEach((t, i) => {
      // Если включен режим АВТОМАТИКА и машина здорова и заправлена — АСУ ГТК назначает оптимальный забой!
      if (this.aiMode && t.condition >= 85 && (t.fuel / t.config.fuelTank) >= 0.40) {
        const bestExc = this.findOptimalExcavator();
        if (bestExc) {
          t.dispatchTo(bestExc.id);
          this.addWarning(`[АВТОМАТИКА] ${t.id} направлен из резерва в забой: ${bestExc.name}`);
          return;
        }
      }

      t.state = "parked";
      // 14 просторных стояночных мест (2 ряда по 7 машин) на новой изолированной площадке отстоя
      const col = i % 7;
      const row = Math.floor(i / 7);
      t.x = 362 + col * 26;
      t.y = 0;
      t.elevation = 0;
      t.z = (row === 0) ? -675 : -725;
      t.yaw = Math.PI; // фарами на юг (к выезду)
      t.pitch = 0;
    });
  }

  /**
   * Anti-collision система: надежный 3D контроль дистанции безопасности (26м).
   * Двухполосное движение: встречный поток движется свободно по своей полосе.
   * Anti-deadlock: автоматическое предотвращение взаимных блокировок техники.
   */
  checkPathClearance(movingTruck, fromNodeId, toNodeId, currentProgress) {
    if (!this.trucks || this.trucks.length === 0) return true;

    const movingYaw = movingTruck.yaw || 0;
    const fwdX = Math.sin(movingYaw);
    const fwdZ = Math.cos(movingYaw);

    for (const other of this.trucks) {
      if (other.id === movingTruck.id) continue;

      // Припаркованные машины на площадке отстоя стоят в карманах и НЕ создают помех на проезжей части
      if (other.state === "parked") continue;

      // Самосвалы под погрузкой или разгрузкой находятся на своих постах вне полосы движения
      if ((other.state === "loading" || other.state === "unloading") && toNodeId === other.currentNodeId) continue;

      // Anti-deadlock: если обе машины застряли (простой > 2.5с), предоставляем преимущество
      if (movingTruck.idleTimeSec > 2.5 && other.idleTimeSec > 2.5) {
        // Приоритет у груженой машины перед порожней, либо по ID
        const movingPri = (movingTruck.isLoaded ? 100 : 0) + (movingTruck.id < other.id ? 10 : 0);
        const otherPri = (other.isLoaded ? 100 : 0) + (other.id < movingTruck.id ? 10 : 0);
        if (movingPri > otherPri) {
          continue; // Игнорируем блокировку, проезжаем вперед
        }
      }

      // 1. Пространственный 3D конус безопасности (Anti-collision: дистанция 26м)
      const dx = other.x - movingTruck.x;
      const dy = (other.elevation || 0) - (movingTruck.elevation || 0);
      const dz = other.z - movingTruck.z;
      const distSq = dx * dx + dz * dz;

      // Проверяем самосвалы на одном горизонте (разница высот < 6.5м)
      if (Math.abs(dy) < 6.5 && distSq < 32 * 32) {
        const dotForward = dx * fwdX + dz * fwdZ;
        // Если другая машина впереди по направлению движения
        if (dotForward > 2.0) {
          const dist = Math.sqrt(distSq);
          if (dist < 26.0) {
            // Проверка бокового смещения (чтобы встречный поток на своей полосе не блокировался)
            const rightX = fwdZ;
            const rightZ = -fwdX;
            const lateralDist = Math.abs(dx * rightX + dz * rightZ);

            // На двухполосной дороге встречная машина идет со смещением ~6.4м
            // Если машина находится в нашей полосе движения (боковое смещение < 4.2м)
            if (lateralDist < 4.2) {
              const toNode = this.quarry.getNode(toNodeId);
              if (toNode && toNode.type === "station" && currentProgress > 0.65) {
                // Подъезжаем к станции — даем заехать в карман/очередь
              } else {
                return false; // Стоим и соблюдаем безопасную дистанцию
              }
            }
          }
        }
      }

      // 2. Графовая проверка: впереди идущий самосвал на том же ребре
      if (other.currentNodeId === fromNodeId && other.nextNodeId === toNodeId) {
        const edgeLen = Math.max(30, movingTruck.edgeLengthPx || 100);
        const safeProgressGap = Math.max(0.08, 26.0 / edgeLen);
        if (other.pathProgress > currentProgress && (other.pathProgress - currentProgress) < safeProgressGap) {
          return false;
        }
      }

      // 3. Другой самосвал только въехал на следующий участок с нашего узла toNodeId
      if (other.currentNodeId === toNodeId && currentProgress > 0.84) {
        const toNode = this.quarry.getNode(toNodeId);
        // Не блокируем заезд на станции погрузки/разгрузки/сервиса/парковки!
        if (toNode && toNode.type === "station") {
          // разрешаем въезд на станцию в очередь
        } else if (other.state.startsWith("queued") || other.state === "loading" || other.state === "unloading" || other.state === "stopped_breakdown" || other.pathProgress < 0.20) {
          return false;
        }
      }
    }

    return true;
  }

  recordDump(truck) {
    const stationNode = this.quarry.getNode(truck.currentNodeId);
    if (!stationNode) return;

    this.stats.totalTrips++;

    // Учет выработки экскаватора, загрузившего данный БелАЗ
    const excId = truck.originExcavatorId;
    if (excId && this.stats.excavatorStats && this.stats.excavatorStats[excId]) {
      this.stats.excavatorStats[excId].tons += truck.currentLoad;
      this.stats.excavatorStats[excId].trips++;
    }

    // Почасовой срез добычи
    const totalShift = EVRAZ_CONFIG.company.gameShiftSeconds || 3600;
    const currentProgress = Math.max(0, Math.min(1.0, 1 - (this.shiftSecondsRemaining / totalShift)));
    const hourIdx = Math.min(11, Math.floor(currentProgress * 12));

    if (stationNode.target === "gof") {
      if (truck.loadType === "waste") {
        this.stats.badOreDeliveries++;
        const penalty = truck.currentLoad * EVRAZ_CONFIG.finances.badOrePenaltyPerTon;
        this.stats.badOrePenaltyRub += penalty;
        this.addWarning(`[ТРЕВОГА] Зафиксирован сброс вскрыши в ГОФ. Убыток от засора: -${Math.round(penalty).toLocaleString("ru-RU")} ₽`);
        sound.playWarning();
      } else {
        this.stats.deliveredOreTons += truck.currentLoad;
        if (this.stats.hourlyStats && this.stats.hourlyStats[hourIdx]) {
          this.stats.hourlyStats[hourIdx].ore += truck.currentLoad;
        }

        // Учет по сортам руды
        if (excId === "n_exc_deep") {
          this.stats.oreByGrade.rich1 += truck.currentLoad;
        } else if (excId === "n_exc_deep2") {
          this.stats.oreByGrade.rich2 += truck.currentLoad;
        } else {
          this.stats.oreByGrade.standard += truck.currentLoad;
        }
      }
    } else if (stationNode.target === "dump") {
      if (truck.loadType === "rich_ore" || truck.loadType === "standard_ore") {
        this.stats.badWasteDeliveries++;
        const lostValue = truck.currentLoad * EVRAZ_CONFIG.finances.oreValuePerTon;
        this.stats.badOrePenaltyRub += lostValue;
        this.addWarning(`[ОШИБКА] Кондиционная руда отправлена на отвал вскрыши. Убыток: -${Math.round(lostValue).toLocaleString("ru-RU")} ₽`);
        sound.playWarning();
      } else {
        this.stats.deliveredWasteTons += truck.currentLoad;
        if (this.stats.hourlyStats && this.stats.hourlyStats[hourIdx]) {
          this.stats.hourlyStats[hourIdx].waste += truck.currentLoad;
        }
      }
    }
  }

  addWarning(text) {
    const timeStr = new Date().toLocaleTimeString("ru-RU", { hour12: false });
    this.warnings.unshift({ time: timeStr, text });
    if (this.warnings.length > 15) {
      this.warnings.pop();
    }
  }
}
