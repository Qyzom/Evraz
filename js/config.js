/**
 * Конфигурация карьера и парка техники ESIM DISPATCH
 * Все параметры строго согласованы с кейсом «Карьерная перспектива» (ЕВРАЗ)
 */

export const EVRAZ_CONFIG = {
  // Параметры предприятия
  company: {
    systemName: "ESIM DISPATCH",
    subTitle: "АСУ ГТК • Модуль динамической маршрутизации",
    oreType: "Титаномагнетитовая руда",
    ironGrade: 16.6, // %
    annualCapacity: 46_000_000, // тонн/год
    shiftDurationHours: 12,
    gameShiftSeconds: 600, // 10 минут реального времени = 12 часов горной смены
  },

  // Финансовые показатели простоев и работы (из кейса)
  finances: {
    belaz130_workPerHour: 21_000,
    belaz130_idlePerHour: 5_000, // 4-6 тыс. руб./ч.
    belaz240_workPerHour: 32_000,
    belaz240_idlePerHour: 7_500, // 6-9 тыс. руб./ч.
    excavator_idlePerHour: 16_000,
    badOrePenaltyPerTon: 850, // Засор дробилки вскрышной породой
    oreValuePerTon: 1_200,    // Ценность доставленной кондиционной руды
  },

  // ТТХ самосвалов
  truckTypes: {
    belaz_75131: {
      id: "belaz_75131",
      name: "БелАЗ-75131",
      capacity: 130, // тонн
      speedEmpty: 38,
      speedLoaded: 22,
      fuelTank: 1900,
      fuelRateMoving: 140,
      fuelRateIdle: 25,
      dumpTimeSec: 3.5,
      color: "#ED7D27", // Фирменный карьерный оранжевый ЕВРАЗ
    },
    belaz_75313: {
      id: "belaz_75313",
      name: "БелАЗ-75313",
      capacity: 240, // тонн
      speedEmpty: 34,
      speedLoaded: 18,
      fuelTank: 3500,
      fuelRateMoving: 240,
      fuelRateIdle: 40,
      dumpTimeSec: 4.5,
      color: "#FFB81C", // Теплый золотисто-оранжевый
    }
  },

  // ТТХ экскаваторов (ускоренная погрузка без очередей-заторов)
  excavatorTypes: {
    liebherr_9250: {
      id: "liebherr_9250",
      name: "Liebherr R 9250",
      bucketCapacityTons: 45,
      cycleTimeSec: 2.4,
      color: "#E2E8F0",
    },
    liebherr_9400: {
      id: "liebherr_9400",
      name: "Liebherr R 9400",
      bucketCapacityTons: 60,
      cycleTimeSec: 2.2,
      color: "#F8FAFC",
    }
  },

  // Зоны карьера
  zones: {
    gof: {
      id: "gof",
      name: "ГОФ (Дробильный комплекс)",
      type: "unloading_ore",
      slots: 3,
      unloadingTime: 3.5,
    },
    dump: {
      id: "dump",
      name: "Внешний отвал №1 (Вскрыша)",
      type: "unloading_waste",
      slots: 3,
      unloadingTime: 3.5,
    },
    fuel: {
      id: "fuel",
      name: "АЗС ГТК (Топливный терминал)",
      type: "refuel",
      slots: 2,
      serviceSpeed: 180,
    },
    service: {
      id: "service",
      name: "РМЦ (База ТО и Ремонтные боксы)",
      type: "service",
      slots: 3,
      serviceSpeed: 120,
    }
  }
};
