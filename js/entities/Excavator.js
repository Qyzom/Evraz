/**
 * Экскаватор (Liebherr R 9250 / R 9400) в забое карьера
 */

import { EVRAZ_CONFIG } from "../config.js";

export class Excavator {
  constructor(id, typeKey, x, elevation, z, zDepthM, materialType, name) {
    this.id = id;
    this.config = EVRAZ_CONFIG.excavatorTypes[typeKey];
    this.typeKey = typeKey;
    this.name = name;
    this.x = x;
    this.y = elevation; // 3D высота
    this.elevation = elevation;
    this.z = z; // 3D глубина
    this.zDepthM = zDepthM; // глубина от поверхности по паспорту (-80м, -160м, -350м)
    this.materialType = materialType; // 'rich_ore' (богатая), 'standard_ore' (рядовая), 'waste' (вскрыша)

    // Состояние
    this.state = "idle"; // 'digging', 'waiting_truck', 'loading', 'idle'
    this.currentTruck = null;
    this.cycleTimer = 0;
    this.totalIdleTimeSec = 0;
    this.totalDugTons = 0;

    // Анимация ковша (угол поворота)
    this.armAngle = 0;
    this.bucketProgress = 0;
  }

  update(dtSec) {
    if (this.currentTruck) {
      this.state = "loading";
      this.cycleTimer += dtSec;
      this.bucketProgress = (this.cycleTimer % this.config.cycleTimeSec) / this.config.cycleTimeSec;
      this.armAngle = Math.sin(this.cycleTimer * 2) * 0.4;

      // Цикл одного ковша
      if (this.cycleTimer >= this.config.cycleTimeSec) {
        this.cycleTimer = 0;
        const tonAmount = this.config.bucketCapacityTons;
        const remainingSpace = this.currentTruck.config.capacity - this.currentTruck.currentLoad;
        const fillAmount = Math.min(tonAmount, remainingSpace);

        this.currentTruck.currentLoad += fillAmount;
        this.currentTruck.loadType = this.materialType;
        this.totalDugTons += fillAmount;

        // Самосвал полон
        if (this.currentTruck.currentLoad >= this.currentTruck.config.capacity) {
          this.currentTruck.finishLoading();
          this.currentTruck = null;
          this.state = "idle";
        }
      }
    } else {
      // Самосвала нет в забое — экскаватор простаивает с полным ковшом!
      this.state = "waiting_truck";
      this.totalIdleTimeSec += dtSec;
      this.armAngle = 0.2;
    }
  }

  assignTruck(truck) {
    if (!this.currentTruck && truck) {
      this.currentTruck = truck;
      this.cycleTimer = 0;
      this.state = "loading";
      truck.startLoading(this);
      return true;
    }
    return false;
  }
}
