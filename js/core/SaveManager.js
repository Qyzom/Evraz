/**
 * Модуль управления слотами сохранений (localStorage с куки-фоллбэком)
 * Поддержка 3 слотов: прогресс смены, статистика, парк БелАЗов, стрелочные переводы
 */

export class SaveManager {
  static STORAGE_PREFIX = "evraz_quarry_slot_";

  static getSlots() {
    const slots = [];
    for (let i = 1; i <= 3; i++) {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + i);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          slots.push({
            slot: i,
            empty: false,
            timestamp: data.timestamp || "Неизвестно",
            shiftTime: data.shiftTime || "08:00",
            oreTons: Math.round(data.stats?.deliveredOreTons || 0),
            profit: Math.round(data.stats?.netProfitRub || 0),
            kpi: data.stats?.efficiencyKpi || 100,
            autoMode: data.autoDispatcherMode || false
          });
        } catch (e) {
          slots.push({ slot: i, empty: true });
        }
      } else {
        slots.push({ slot: i, empty: true });
      }
    }
    return slots;
  }

  static saveSlot(slotIndex, game) {
    if (slotIndex < 1 || slotIndex > 3) return false;

    // Расчет текущего виртуального времени смены
    const totalSec = game.shiftDurationSec || 600;
    const progress = 1 - (game.shiftSecondsRemaining / totalSec);
    const shiftHours = 8 + progress * 12;
    const hours = Math.floor(shiftHours);
    const mins = Math.floor((shiftHours - hours) * 60);
    const shiftTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const switchesState = {};
    Object.values(game.quarry.nodes).forEach(n => {
      if (n.type === "switch") {
        switchesState[n.id] = n.activeBranch;
      }
    });

    const trucksState = game.trucks.map(t => ({
      id: t.id,
      typeKey: t.typeKey,
      currentNodeId: t.currentNodeId,
      nextNodeId: t.nextNodeId,
      edgeProgress: t.edgeProgress,
      targetStationId: t.targetStationId,
      isLoaded: t.isLoaded,
      loadType: t.loadType,
      currentLoad: t.currentLoad,
      fuel: t.fuel,
      condition: t.condition,
      state: t.state,
      x: t.x,
      y: t.y,
      z: t.z !== undefined ? t.z : t.y,
      elevation: t.elevation
    }));

    const saveData = {
      slot: slotIndex,
      timestamp: dateStr,
      shiftTime,
      shiftSecondsRemaining: game.shiftSecondsRemaining,
      autoDispatcherMode: game.autoDispatcherMode,
      stats: { ...game.dispatcher.stats },
      switches: switchesState,
      trucks: trucksState
    };

    try {
      localStorage.setItem(this.STORAGE_PREFIX + slotIndex, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error("Ошибка сохранения в слот:", e);
      return false;
    }
  }

  static loadSlot(slotIndex, game) {
    if (slotIndex < 1 || slotIndex > 3) return false;

    const raw = localStorage.getItem(this.STORAGE_PREFIX + slotIndex);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);

      // 1. Восстановление таймера смены
      if (typeof data.shiftSecondsRemaining === "number") {
        game.shiftSecondsRemaining = data.shiftSecondsRemaining;
      }

      // 2. Восстановление режима автодиспетчера
      if (typeof data.autoDispatcherMode === "boolean") {
        game.autoDispatcherMode = data.autoDispatcherMode;
      }

      // 3. Восстановление статистики
      if (data.stats) {
        game.dispatcher.stats = { ...game.dispatcher.stats, ...data.stats };
      }

      // 4. Восстановление стрелочных переводов
      if (data.switches) {
        Object.keys(data.switches).forEach(nodeId => {
          const node = game.quarry.getNode(nodeId);
          if (node && node.type === "switch") {
            node.activeBranch = data.switches[nodeId];
          }
        });
      }

      // 5. Восстановление самосвалов
      if (Array.isArray(data.trucks)) {
        data.trucks.forEach(tSaved => {
          const truck = game.trucks.find(t => t.id === tSaved.id);
          if (truck) {
            truck.currentNodeId = tSaved.currentNodeId;
            truck.nextNodeId = tSaved.nextNodeId;
            truck.edgeProgress = tSaved.edgeProgress || 0;
            truck.targetStationId = tSaved.targetStationId;
            truck.isLoaded = tSaved.isLoaded;
            truck.loadType = tSaved.loadType;
            truck.currentLoad = tSaved.currentLoad;
            truck.fuel = tSaved.fuel;
            truck.condition = tSaved.condition;
            truck.state = tSaved.state;
            truck.x = tSaved.x;
            truck.y = tSaved.y;
            truck.z = tSaved.z;
            truck.elevation = tSaved.elevation;
          }
        });
      }

      game.dispatcher.addWarning(`[СИСТЕМА] Смена успешно загружена из слота #${slotIndex} (${data.timestamp})`);
      return true;
    } catch (e) {
      console.error("Ошибка загрузки слота:", e);
      return false;
    }
  }

  static deleteSlot(slotIndex) {
    localStorage.removeItem(this.STORAGE_PREFIX + slotIndex);
  }
}
