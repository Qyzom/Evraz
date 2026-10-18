/**
 * Самосвал (БелАЗ-75131 / БелАЗ-75313)
 * Симуляция физики движения по серпантину, расхода топлива, груза и простоев в очередях
 */

import { EVRAZ_CONFIG } from "../config.js";
import { sound } from "../audio.js";

export class Truck {
  constructor(id, typeKey, initialNodeId, quarry) {
    this.id = id;
    this.config = EVRAZ_CONFIG.truckTypes[typeKey];
    this.typeKey = typeKey;
    this.quarry = quarry;

    // Позиция на графе дорог
    this.currentNodeId = initialNodeId;
    this.nextNodeId = null;
    this.targetStationId = null; // желаемая цель ('exc_1', 'exc_2', 'exc_3', 'gof', 'dump', 'service')

    const startNode = quarry.getNode(initialNodeId);
    this.x = startNode ? startNode.x : 0;
    this.elevation = startNode ? (startNode.y || 0) : 0;
    this.z = startNode ? (startNode.z !== undefined ? startNode.z : startNode.y) : 0;
    this.y = this.elevation; // совместимость
    this.angle = 0; // направление движения (в радианах)
    this.yaw = 0;
    this.pitch = 0;
    this.dumpTilt = 0; // наклон кузова при разгрузке (0..1)
    this.pathProgress = 0; // 0..1 между узлами
    this.edgeLengthPx = 100;

    // Груз
    this.currentLoad = 0; // в тоннах
    this.loadType = null; // 'rich_ore', 'standard_ore', 'waste'

    // Ресурсы
    this.fuel = this.config.fuelTank * (0.6 + Math.random() * 0.35); // 60-95% бака
    this.condition = 100; // 0..100% техсостояние

    // Статусы: 'moving_empty', 'moving_loaded', 'queued_load', 'loading', 'queued_unload', 'unloading', 'servicing', 'stopped_breakdown'
    this.state = "moving_empty";
    this.idleTimeSec = 0;
    this.totalHauledTons = 0;

    // Задержка на разгрузку / обслуживание
    this.actionTimer = 0;
  }

  get isLoaded() {
    return this.currentLoad > 0;
  }

  // Расчёт текущей скорости (км/ч -> пикселей в секунду)
  getCurrentSpeed() {
    if (this.state === "queued_load" || this.state === "queued_unload" || this.state === "loading" || this.state === "unloading" || this.state === "servicing") {
      return 0;
    }
    const baseKmh = this.isLoaded ? this.config.speedLoaded : this.config.speedEmpty;
    // Коэффициент перевода км/ч в виртуальные px/s
    return baseKmh * 2.2;
  }

  update(dtSec, dispatcher) {
    // 1. Расход топлива и естественный износ узлов БелАЗа
    const isStationary = (this.idleTimeSec > 0.5) || 
                         this.state.startsWith("queued") || 
                         this.state === "parked" || 
                         this.state === "servicing" ||
                         this.state === "stopped_breakdown";

    if (this.state.startsWith("moving") && !isStationary) {
      const fuelRatePerSec = (this.config.fuelRateMoving / 3600);
      this.fuel = Math.max(0, this.fuel - fuelRatePerSec * dtSec * 3); // сбалансированный расход для смены 1ч
      // Плавное падение ТС при движении (под нагрузкой быстрее)
      const condWear = this.isLoaded ? 0.015 : 0.007;
      this.condition = Math.max(0, this.condition - condWear * dtSec);

      // Проверка критического остатка топлива (<30%) или ТС (<70%) для порожнего самосвала
      if (this.state === "moving_empty") {
        if (this.fuel / this.config.fuelTank < 0.30 && this.targetStationId !== "n_fuel" && this.targetStationId !== "n_service") {
          this.targetStationId = "n_fuel";
          this.selectNextNode();
        } else if (this.condition < 70 && this.targetStationId !== "n_service" && this.targetStationId !== "n_parking") {
          this.targetStationId = "n_service";
          this.selectNextNode();
        }
      }
    } else if (isStationary && this.state !== "parked" && this.state !== "servicing" && this.state !== "stopped_breakdown") {
      // На холостом ходу в заторе или очереди — минимальный расход ДТ
      const fuelRatePerSec = (this.config.fuelRateIdle / 3600);
      this.fuel = Math.max(0, this.fuel - fuelRatePerSec * dtSec * 2);
    } else if (this.state === "parked") {
      // На площадке отстоя / в ангаре: постепенное восстановление ТС и дозаправка
      this.idleTimeSec += dtSec;
      if (this.condition < 100) {
        this.condition = Math.min(100, this.condition + 15 * dtSec);
      }
      if (this.fuel < this.config.fuelTank) {
        this.fuel = Math.min(this.config.fuelTank, this.fuel + 35 * dtSec);
      }
    }

    // Если топливо на нуле
    if (this.fuel <= 0) {
      this.state = "stopped_breakdown";
      this.idleTimeSec += dtSec;
      return;
    }

    // 2. Движение по графу
    if (this.state === "moving_empty" || this.state === "moving_loaded") {
      if (!this.nextNodeId) {
        this.selectNextNode();
      }

      if (this.nextNodeId) {
        this.moveTowardsNextNode(dtSec, dispatcher);
      }
    } else if (this.state === "unloading") {
      this.actionTimer += dtSec;
      const dumpProgress = this.actionTimer / this.config.dumpTimeSec;
      if (dumpProgress < 0.4) {
        this.dumpTilt = (dumpProgress / 0.4) * 0.95;
      } else if (dumpProgress > 0.8) {
        this.dumpTilt = Math.max(0, (1 - dumpProgress) / 0.2) * 0.95;
      } else {
        this.dumpTilt = 0.95;
      }

      if (this.actionTimer >= this.config.dumpTimeSec) {
        this.dumpTilt = 0;
        this.finishUnloading(dispatcher);
      }
    } else if (this.state === "servicing") {
      this.actionTimer += dtSec;
      const isFuelStation = (this.currentNodeId === "n_fuel" || this.targetStationId === "n_fuel");
      if (isFuelStation) {
        // Экспресс-заправка на АЗС ГТК: 240 л/с (полный бак 3500 л заправляется за ~15 сек)
        const speed = (EVRAZ_CONFIG.zones && EVRAZ_CONFIG.zones.fuel) ? EVRAZ_CONFIG.zones.fuel.serviceSpeed : 240;
        this.fuel = Math.min(this.config.fuelTank, this.fuel + speed * dtSec * 1.5);
        if (this.fuel >= this.config.fuelTank) {
          if (dispatcher && dispatcher.stats) dispatcher.stats.refuelCount++;
          this.finishService(dispatcher);
        }
      } else {
        // Плановое ТО на РМЦ: устранение дефектов узлов и заправка
        const speed = (EVRAZ_CONFIG.zones && EVRAZ_CONFIG.zones.service) ? EVRAZ_CONFIG.zones.service.serviceSpeed : 120;
        this.fuel = Math.min(this.config.fuelTank, this.fuel + speed * dtSec);
        this.condition = Math.min(100, this.condition + 25 * dtSec);
        if (this.fuel >= this.config.fuelTank && this.condition >= 100) {
          if (dispatcher && dispatcher.stats) dispatcher.stats.serviceCount++;
          this.finishService(dispatcher);
        }
      }
    }
  }

  selectNextNode() {
    this.nextNodeId = this.quarry.getNextNode(this.currentNodeId, this.targetStationId, this.isLoaded);
    if (!this.nextNodeId) {
      // Тупик или достигли цели — проверяем прибытие на станцию
      const curr = this.quarry.getNode(this.currentNodeId);
      if (curr && curr.type === "station") {
        this.handleArrivalAtStation(curr);
      }
    } else {
      const edge = this.quarry.getEdge(this.currentNodeId, this.nextNodeId);
      this.currentEdge = edge;
      this.isReverse = edge ? (edge.to === this.currentNodeId) : false;
      this.edgeLengthPx = edge ? edge.distanceM : 120;
      this.pathProgress = 0;
      this.switchAlignedForEdge = false;

      // Первичная ориентация
      if (edge && edge.curve) {
        const t = this.isReverse ? 1.0 : 0.0;
        let tgt = edge.curve.getTangentAt(t);
        if (this.isReverse) tgt = tgt.clone().negate();
        this.yaw = Math.atan2(tgt.x, tgt.z);
        this.pitch = Math.atan2(tgt.y, Math.hypot(tgt.x, tgt.z));
      }
    }
  }

  moveTowardsNextNode(dtSec, dispatcher) {
    if (!this.nextNodeId) return;

    // Автоматический выбор направления на развилке СЦБ по маршруту приближающегося БелАЗа
    if (this.pathProgress > 0.35 && !this.switchAlignedForEdge) {
      const nextNode = this.quarry.getNode(this.nextNodeId);
      if (nextNode && nextNode.type === "switch") {
        this.quarry.alignSwitchForTruck(this, this.nextNodeId);
        this.switchAlignedForEdge = true;
      }
    }

    // Дистанция движения за этот кадр
    const speedPxPerSec = this.getCurrentSpeed();
    const distanceDelta = speedPxPerSec * dtSec;
    const progressDelta = distanceDelta / Math.max(1, this.edgeLengthPx);

    // Проверка дистанции безопасности с идущим впереди БелАЗом (Anti-collision)
    const canMove = dispatcher.checkPathClearance(this, this.currentNodeId, this.nextNodeId, this.pathProgress);
    if (!canMove) {
      // Стоим в заторе на узкой берме, соблюдая безопасную дистанцию
      this.idleTimeSec += dtSec;
      return;
    }

    this.pathProgress += progressDelta;

    const p2 = this.quarry.getNode(this.nextNodeId);

    // Движение точно по плавному 3D сплайну дороги и рампы (с правосторонним смещением полосы 3.2м)
    if (this.currentEdge && this.currentEdge.curve) {
      const t = Math.min(1.0, Math.max(0, this.isReverse ? (1.0 - this.pathProgress) : this.pathProgress));
      const pt = this.currentEdge.curve.getPointAt(t);
      let tgt = this.currentEdge.curve.getTangentAt(t);
      if (this.isReverse) {
        tgt = tgt.clone().negate();
      }

      this.yaw = Math.atan2(tgt.x, tgt.z);
      this.pitch = Math.atan2(tgt.y, Math.hypot(tgt.x, tgt.z));

      // Смещение на правую полосу движения (двухполосный трафик карьера)
      const rightX = tgt.z;
      const rightZ = -tgt.x;
      const laneOffset = 3.2;

      this.x = pt.x + rightX * laneOffset;
      this.y = pt.y;
      this.elevation = pt.y;
      this.z = pt.z + rightZ * laneOffset;
    } else if (p2) {
      const p1 = this.quarry.getNode(this.currentNodeId);
      const dx = p2.x - p1.x;
      const dy = (p2.y || 0) - (p1.y || 0);
      const dz = (p2.z !== undefined ? p2.z : p2.y) - (p1.z !== undefined ? p1.z : p1.y);

      this.yaw = Math.atan2(dx, dz);
      this.pitch = Math.atan2(dy, Math.hypot(dx, dz));

      const len = Math.hypot(dx, dz) || 1;
      const rightX = dz / len;
      const rightZ = -dx / len;
      const laneOffset = 3.2;

      this.x = p1.x + dx * this.pathProgress + rightX * laneOffset;
      this.elevation = (p1.y || 0) + dy * this.pathProgress;
      this.y = this.elevation;
      this.z = (p1.z !== undefined ? p1.z : p1.y) + dz * this.pathProgress + rightZ * laneOffset;
    }

    if (this.pathProgress >= 1.0) {
      // Прибыли в следующий узел
      this.currentNodeId = this.nextNodeId;
      if (p2) {
        this.x = p2.x;
        this.elevation = p2.y || 0;
        this.y = this.elevation;
        this.z = p2.z !== undefined ? p2.z : p2.y;
      }
      this.pathProgress = 0;
      this.nextNodeId = null;
      this.currentEdge = null;

      // Если это целевая станция
      if (p2 && p2.type === "station") {
        this.handleArrivalAtStation(p2);
      } else {
        this.selectNextNode();
      }
    }
  }

  handleArrivalAtStation(stationNode) {
    if (stationNode.target === "gof" || stationNode.target === "dump") {
      // Становимся на разгрузку только если самосвал реально везет горную массу!
      if (this.currentLoad > 0) {
        this.state = "queued_unload";
      } else {
        // Порожний самосвал не должен повторно вставать в очередь на разгрузку
        this.state = "moving_empty";
        this.targetStationId = null;
        if (this.fuel / this.config.fuelTank < 0.30) {
          this.targetStationId = "n_fuel";
        } else if (this.condition < 70) {
          this.targetStationId = "n_service";
        } else if (this.originExcavatorId) {
          this.targetStationId = this.originExcavatorId;
        } else {
          this.targetStationId = "n_parking";
        }
        this.selectNextNode();
      }
    } else if (stationNode.target === "service" || stationNode.id === "n_service" || stationNode.target === "fuel" || stationNode.id === "n_fuel") {
      this.state = "servicing";
      this.actionTimer = 0;
    } else if (stationNode.target === "parking" || stationNode.id === "n_parking") {
      this.state = "parked";
      this.actionTimer = 0;
    } else if (stationNode.target && stationNode.target.startsWith("exc_")) {
      this.state = "queued_load";
    }
  }

  startLoading(excavator) {
    this.state = "loading";
    this.actionTimer = 0;
    this.originExcavatorId = excavator ? excavator.id : this.currentNodeId;
  }

  finishLoading() {
    this.state = "moving_loaded";
    sound.playRadioBeep();
    // Назначение пункта выгрузки по типу горной массы
    if (this.loadType === "waste") {
      this.targetStationId = "n_dump";
    } else {
      this.targetStationId = "n_gof";
    }
    this.selectNextNode();
  }

  startUnloading() {
    this.state = "unloading";
    this.actionTimer = 0;
    sound.playDump();
  }

  finishUnloading(dispatcher) {
    // Регистрация сброса в диспетчере
    dispatcher.recordDump(this);
    this.totalHauledTons += this.currentLoad;
    this.currentLoad = 0;
    this.loadType = null;
    this.state = "moving_empty";
    this.dumpTilt = 0;

    // Сбрасываем завершённую станцию разгрузки (ГОФ / Отвал)
    this.targetStationId = null;

    // Логика направления порожнего самосвала после разгрузки:
    // 1. Топливо < 30% -> на АЗС
    if (this.fuel / this.config.fuelTank < 0.30) {
      this.targetStationId = "n_fuel";
      dispatcher.addWarning(`[СЦБ/ТО] ${this.id}: остаток топлива менее 30%, направлен на заправку АЗС.`);
    }
    // 2. Техсостояние < 70% -> на РМЦ
    else if (this.condition < 70) {
      this.targetStationId = "n_service";
      dispatcher.addWarning(`[СЦБ/ТО] ${this.id}: снижено техсостояние (${Math.round(this.condition)}%), следует на Базу ТО (РМЦ).`);
    }
    // 3. Автоматический режим АСУ ГТК: оптимизация рудопотока
    else if (dispatcher && dispatcher.aiMode) {
      const bestExc = dispatcher.findOptimalExcavator();
      this.targetStationId = bestExc ? bestExc.id : "n_parking";
    }
    // 4. Ручной режим: возвращается челночным рейсом в забой последней погрузки либо на стоянку
    else {
      this.targetStationId = this.originExcavatorId || "n_parking";
    }

    this.selectNextNode();
  }

  finishService(dispatcher) {
    this.state = "moving_empty";
    this.targetStationId = null;
    if (this.fuel / this.config.fuelTank < 0.30) {
      this.targetStationId = "n_fuel";
    } else if (dispatcher && dispatcher.aiMode) {
      // Алгоритм АСУ ГТК сразу выдает разнарядку в наиболее эффективный забой карьера
      const bestExc = dispatcher.findOptimalExcavator();
      this.targetStationId = bestExc ? bestExc.id : "n_parking";
    } else {
      // В ручном режиме возвращается в забой либо на площадку отстоя
      this.targetStationId = this.originExcavatorId || "n_parking";
    }
    this.selectNextNode();
  }

  /**
   * Приказ диспетчера на перенаправление машины
   */
  dispatchTo(targetStationId) {
    this.targetStationId = targetStationId;
    if (this.state === "parked" || this.state === "servicing" || this.state === "stopped_breakdown") {
      this.state = this.isLoaded ? "moving_loaded" : "moving_empty";
      this.actionTimer = 0;
      this.idleTimeSec = 0;
      this.edgeProgress = 0;
      this.selectNextNode();
    } else if (this.state === "moving_empty" || this.state === "moving_loaded") {
      this.selectNextNode();
    }
  }
}
