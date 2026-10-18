/**
 * Индустриальный HUD пульта АСУ ГТК «ESIM-DISPATCH»
 * Строгая телеметрия без эмодзи, стандартизированные цвета
 */

import { SaveManager } from "../core/SaveManager.js";
import { sound } from "../audio.js";

export class HUD {
  constructor(game) {
    this.game = game;

    this.elTime = document.getElementById("hud-time");
    this.elShiftTimeLeft = document.getElementById("hud-shift-time-left");
    this.elOreTons = document.getElementById("hud-ore-tons");
    this.elWasteTons = document.getElementById("hud-waste-tons");
    this.elNetProfit = document.getElementById("hud-profit");
    this.elLosses = document.getElementById("hud-losses");
    this.elKpi = document.getElementById("hud-kpi");
    this.elAlerts = document.getElementById("hud-alerts-feed");
    this.elAutoModeBtn = document.getElementById("btn-toggle-auto");

    this.selectedBuildingKey = null;
    this.initCameraControls();
    this.initBuildingCard();
    this.initStartMenu();
    this.initFleetList();
    this.initSpeedControls();
  }

  update() {
    const { dispatcher, shiftSecondsRemaining } = this.game;
    const { stats } = dispatcher;

    // Виртуальное время 12ч смены (08:00 - 20:00)
    const totalSec = this.game.shiftDurationSec || 3600;
    const progress = 1 - (shiftSecondsRemaining / totalSec);
    const shiftHours = 8 + progress * 12;
    const hours = Math.floor(shiftHours);
    const mins = Math.floor((shiftHours - hours) * 60);
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    if (this.elTime) {
      this.elTime.textContent = timeFormatted;
    }

    if (this.elShiftTimeLeft) {
      const secLeft = Math.max(0, Math.round(shiftSecondsRemaining));
      const mLeft = Math.floor(secLeft / 60);
      const sLeft = secLeft % 60;
      this.elShiftTimeLeft.textContent = `${String(mLeft).padStart(2, '0')}:${String(sLeft).padStart(2, '0')}`;
    }

    if (this.elOreTons) {
      this.elOreTons.textContent = Math.round(stats.deliveredOreTons).toLocaleString("ru-RU") + " т";
    }

    if (this.elWasteTons) {
      this.elWasteTons.textContent = Math.round(stats.deliveredWasteTons).toLocaleString("ru-RU") + " т";
    }

    if (this.elNetProfit) {
      const isPositive = stats.netProfitRub >= 0;
      this.elNetProfit.textContent = (isPositive ? "+" : "") + Math.round(stats.netProfitRub).toLocaleString("ru-RU") + " ₽";
      this.elNetProfit.className = isPositive ? "metric-value green" : "metric-value red";
    }

    if (this.elLosses) {
      const totalLoss = stats.truckIdleLossRub + stats.excavatorIdleLossRub + stats.badOrePenaltyRub;
      this.elLosses.textContent = "-" + Math.round(totalLoss).toLocaleString("ru-RU") + " ₽";
    }

    if (this.elKpi) {
      this.elKpi.textContent = `${stats.efficiencyKpi}%`;
      this.elKpi.style.color = stats.efficiencyKpi > 80 ? "#10B981" : stats.efficiencyKpi > 50 ? "#ED7D27" : "#E4002B";
    }

    // Обновление журнала сообщений
    if (this.elAlerts && dispatcher.warnings.length > 0) {
      const newHtml = dispatcher.warnings.map(w => `
        <div class="alert-item">
          <span class="alert-time">[${w.time}]</span>
          <span class="alert-msg">${w.text}</span>
        </div>
      `).join("");
      if (this.elAlerts.innerHTML !== newHtml) {
        this.elAlerts.innerHTML = newHtml;
        this.elAlerts.scrollTop = this.elAlerts.scrollHeight;
      }
    }

    // Обновление списка парка БелАЗов
    this.updateFleetList();

    // Обновление телеметрии в открытой карточке БелАЗа
    if (this.selectedTruck && this.elTruckCard && this.elTruckCard.style.display !== "none") {
      this.updateTruckCardTelemetry(this.selectedTruck);
    }

    // Обновление телеметрии в открытой карточке промышленного объекта
    if (this.selectedBuildingKey && this.elBuildingCard && this.elBuildingCard.style.display !== "none") {
      this.updateBuildingCardTelemetry();
    }
  }

  initFleetList() {
    this.elFleetList = document.getElementById("hud-fleet-list");
    this.elFleetSummary = document.getElementById("hud-fleet-summary");
    if (!this.elFleetList) return;

    const trucks = this.game.trucks || [];
    if (trucks.length === 0) return;

    this.elFleetList.innerHTML = trucks.map(t => `
      <div class="fleet-truck-row" id="ftr-${t.id}" data-truck-id="${t.id}">
        <div class="ftr-top">
          <span class="ftr-id-badge">${t.id.replace('БелАЗ-', '№')}</span>
          <span class="ftr-status-badge empty" id="ftr-status-${t.id}">ПОРОЖНИЙ</span>
        </div>
        <div class="ftr-mid">
          <span class="ftr-dest" id="ftr-dest-${t.id}">→ Забой 1</span>
          <span class="ftr-cond" id="ftr-cond-${t.id}">100% ТС</span>
          <span class="ftr-fuel" id="ftr-fuel-${t.id}">88% ДТ</span>
        </div>
        <div class="ftr-bottom">
          <button class="ftr-btn-focus" data-truck-id="${t.id}">ФОКУС</button>
          <select class="ftr-select-order" data-truck-id="${t.id}">
            <option value="">ПРИКАЗ ▾</option>
            <option value="n_parking">Площадка отстоя (Ангар)</option>
            <option value="n_exc_deep">Забой 1 (Fe 62%, Зап.)</option>
            <option value="n_exc_deep2">Забой 4 (Fe 64%, Вост.)</option>
            <option value="n_exc_mid">Забой 2 (Рядовая, -95м)</option>
            <option value="n_exc_waste">Забой 3 (Вскрыша, -45м)</option>
            <option value="n_gof">ГОФ-1 (Дробилка)</option>
            <option value="n_dump">Отвал (Вскрыша)</option>
            <option value="n_fuel">АЗС ГТК (Заправка)</option>
            <option value="n_service">РМЦ (Техобслуживание)</option>
          </select>
        </div>
      </div>
    `).join("");

    // Wire up events
    this.elFleetList.querySelectorAll(".ftr-btn-focus").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const truckId = btn.getAttribute("data-truck-id");
        const truck = this.game.trucks.find(t => t.id === truckId);
        if (truck) {
          this.game.renderer.selectedTruckId = truck.id;
          this.game.renderer.setCameraPoi("truck", truck.id, this.game);
          this.showTruckDispatchCard(truck);
          sound.playRadioBeep();
        }
      });
    });

    this.elFleetList.querySelectorAll(".ftr-select-order").forEach(select => {
      select.addEventListener("change", (e) => {
        e.stopPropagation();
        const truckId = select.getAttribute("data-truck-id");
        const targetId = select.value;
        if (!targetId) return;

        const truck = this.game.trucks.find(t => t.id === truckId);
        if (truck) {
          truck.dispatchTo(targetId);
          if (this.game.dispatcher && this.game.dispatcher.stats) {
            this.game.dispatcher.stats.ordersGivenCount++;
          }
          const targetNode = this.game.quarry.getNode(targetId);
          const targetName = targetNode ? targetNode.name : targetId;
          this.game.dispatcher.addWarning(`[ДИСПЕТЧЕР] ${truck.id} перенаправлен: ${targetName}`);
          sound.playRadioBeep();
        }
        select.value = "";
      });
    });
  }

  updateFleetList() {
    if (!this.elFleetList) {
      this.initFleetList();
      return;
    }
    const trucks = this.game.trucks || [];
    if (trucks.length === 0) return;

    if (this.elFleetList.children.length !== trucks.length) {
      this.initFleetList();
    }

    const trackingId = this.game.renderer ? this.game.renderer.trackingTruckId : null;
    let activeTrucksCount = 0;

    for (let i = 0; i < trucks.length; i++) {
      const t = trucks[i];
      // "В линии" считаются только те машины, которые реально выполняют работу (в пути, на погрузке, выгрузке, ТО/АЗС),
      // а машины на стоянке в ангаре (parked) или аварийные (stopped_breakdown) НЕ учитываются
      if (t.state !== "parked" && t.state !== "stopped_breakdown") activeTrucksCount++;

      const row = document.getElementById(`ftr-${t.id}`);
      if (!row) continue;

      if (trackingId === t.id) {
        if (!row.classList.contains("active-track")) row.classList.add("active-track");
      } else {
        if (row.classList.contains("active-track")) row.classList.remove("active-track");
      }

      // Status badge
      const statusEl = document.getElementById(`ftr-status-${t.id}`);
      if (statusEl) {
        let badgeClass = "empty";
        let badgeText = "ПОРОЖНИЙ";

        switch (t.state) {
          case "moving_empty":
            badgeClass = "empty";
            badgeText = "ПОРОЖНИЙ В ПУТИ";
            break;
          case "moving_loaded":
            if (t.loadType === "waste") {
              badgeClass = "waste";
              badgeText = "ВСКРЫША 240т";
            } else {
              badgeClass = "ore";
              badgeText = "РУДА 240т";
            }
            break;
          case "queued_load":
            badgeClass = "queue";
            badgeText = "ОЧЕРЕДЬ ЗАГРУЗКИ";
            break;
          case "loading":
            badgeClass = "ore";
            badgeText = "ИДЕТ ПОГРУЗКА";
            break;
          case "queued_unload":
            badgeClass = "queue";
            badgeText = "ОЧЕРЕДЬ ВЫГРУЗКИ";
            break;
          case "unloading":
            badgeClass = "ore";
            badgeText = "РАЗГРУЗКА В БУНКЕР";
            break;
          case "servicing":
            badgeClass = "service";
            badgeText = "ТО / ЗАПРАВКА";
            break;
          case "parked":
            badgeClass = "parked";
            badgeText = "НА СТОЯНКЕ";
            break;
          case "stopped_breakdown":
            badgeClass = "breakdown";
            badgeText = "АВАРИЯ (ТОПЛИВО)";
            break;
        }

        if (statusEl.className !== `ftr-status-badge ${badgeClass}`) {
          statusEl.className = `ftr-status-badge ${badgeClass}`;
        }
        if (statusEl.textContent !== badgeText) {
          statusEl.textContent = badgeText;
        }
      }

      // Destination text
      const destEl = document.getElementById(`ftr-dest-${t.id}`);
      if (destEl) {
        let destName = "Карьер";
        if (t.state === "parked") {
          destName = "Ангар / Отстой";
        } else if (t.targetStationId) {
          const targetNode = this.game.quarry.getNode(t.targetStationId);
          destName = targetNode ? targetNode.name : t.targetStationId;
        }
        const formattedDest = `→ ${destName}`;
        if (destEl.textContent !== formattedDest) {
          destEl.textContent = formattedDest;
        }
      }

      // Condition text
      const condEl = document.getElementById(`ftr-cond-${t.id}`);
      if (condEl) {
        const condPct = Math.round(t.condition !== undefined ? t.condition : 100);
        const condText = `${condPct}% ТС`;
        if (condEl.textContent !== condText) {
          condEl.textContent = condText;
          condEl.style.color = condPct < 70 ? "#E4002B" : (condPct < 85 ? "#FFB81C" : "#10B981");
        }
      }

      // Fuel text
      const fuelEl = document.getElementById(`ftr-fuel-${t.id}`);
      if (fuelEl) {
        const fuelPct = Math.round((t.fuel / t.config.fuelTank) * 100);
        const fuelText = `${fuelPct}% ДТ`;
        if (fuelEl.textContent !== fuelText) {
          fuelEl.textContent = fuelText;
          fuelEl.style.color = fuelPct < 25 ? "#E4002B" : "#FFB81C";
        }
      }
    }

    if (this.elFleetSummary) {
      const summaryText = `${activeTrucksCount} / ${trucks.length} В ЛИНИИ`;
      if (this.elFleetSummary.textContent !== summaryText) {
        this.elFleetSummary.textContent = summaryText;
      }
    }
  }

  initTruckCard() {
    this.elTruckCard = document.getElementById("truck-control-card");
    if (!this.elTruckCard) return;

    const actionBtns = this.elTruckCard.querySelectorAll(".tcard-btn[data-target]");
    actionBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        if (!this.selectedTruck) return;
        const targetId = btn.getAttribute("data-target");
        this.selectedTruck.dispatchTo(targetId);

        const targetNode = this.game.quarry.getNode(targetId);
        const targetName = targetNode ? targetNode.name : targetId;
        this.game.dispatcher.addWarning(`[ДИСПЕТЧЕР] ${this.selectedTruck.id} перенаправлен: ${targetName}`);
        sound.playRadioBeep();
      });
    });
  }

  hideTruckCard() {
    if (this.elTruckCard) {
      this.elTruckCard.style.display = "none";
    }
    this.selectedTruck = null;
    if (this.game.renderer) {
      this.game.renderer.selectedTruckId = null;
    }
  }

  initBuildingCard() {
    this.elBuildingCard = document.getElementById("building-control-card");
    if (!this.elBuildingCard) return;

    const focusBtn = document.getElementById("bc-focus-btn");
    if (focusBtn) {
      focusBtn.addEventListener("click", () => {
        if (!this.selectedBuildingKey) return;
        this.game.renderer.setCameraPoi(this.selectedBuildingKey, null, this.game);
        sound.playRadioBeep();
      });
    }
  }

  showBuildingInfoCard(key) {
    if (!this.elBuildingCard) {
      this.initBuildingCard();
    }
    if (!this.elBuildingCard) return;

    this.hideTruckCard();
    this.selectedBuildingKey = key;
    this.elBuildingCard.style.display = "block";
    this.updateBuildingCardTelemetry();
  }

  hideBuildingInfoCard() {
    if (this.elBuildingCard) {
      this.elBuildingCard.style.display = "none";
    }
    this.selectedBuildingKey = null;
  }

  updateBuildingCardTelemetry() {
    if (!this.selectedBuildingKey) return;
    const key = this.selectedBuildingKey;

    const elBadge = document.getElementById("bc-badge");
    const elName = document.getElementById("bc-name");
    const elStatus = document.getElementById("bc-status");
    const elCapacity = document.getElementById("bc-capacity");
    const elProgressBar = document.getElementById("bc-progress-bar");
    const elQueue = document.getElementById("bc-queue");
    const elThroughput = document.getElementById("bc-throughput");
    const elDesc = document.getElementById("bc-description");

    const trucks = this.game.trucks || [];
    const excavators = this.game.excavators || [];
    const stats = this.game.dispatcher ? this.game.dispatcher.stats : {};

    if (key === "gof") {
      if (elBadge) elBadge.textContent = "ГОФ-1";
      if (elName) elName.textContent = "Дробильный комплекс";
      if (elStatus) elStatus.textContent = "Приемка товарной руды";
      if (elDesc) elDesc.textContent = "ГОФ-1: Главная обогатительная фабрика и дробильный комплекс. Приемка богатой железной руды (Fe 62-64%) и первичное дробление в щековой дробилке. Выгрузка пустой вскрышной породы запрещена.";
      const active = this.game.dispatcher ? this.game.dispatcher.gofActiveTrucks : [];
      if (elCapacity) elCapacity.textContent = `${active.length} / 2 постов занято`;

      let progress = 0;
      if (active.length > 0) {
        progress = Math.min(100, Math.round((active[0].actionTimer / 5) * 100));
      }
      if (elProgressBar) elProgressBar.style.width = `${progress}%`;

      const queued = trucks.filter(t => t.currentNodeId === "n_gof" && t.state === "queued_unload");
      if (elQueue) {
        elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Очередь чиста";
      }
      if (elThroughput) elThroughput.textContent = `${Math.round(stats.deliveredOreTons || 0).toLocaleString("ru-RU")} т руды`;

    } else if (key === "dump") {
      if (elBadge) elBadge.textContent = "ОТВАЛ";
      if (elName) elName.textContent = "Северный отвал (Вскрыша)";
      if (elStatus) elStatus.textContent = "Приемка пустой породы";
      if (elDesc) elDesc.textContent = "Северный отвал: Технологический полигон складирования пустых вскрышных пород со скальных горизонтов карьера. Приемка товарной железной руды категорически запрещена.";
      const active = this.game.dispatcher ? this.game.dispatcher.dumpActiveTrucks : [];
      if (elCapacity) elCapacity.textContent = `${active.length} / 3 постов занято`;

      let progress = 0;
      if (active.length > 0) {
        progress = Math.min(100, Math.round((active[0].actionTimer / 5) * 100));
      }
      if (elProgressBar) elProgressBar.style.width = `${progress}%`;

      const queued = trucks.filter(t => t.currentNodeId === "n_dump" && t.state === "queued_unload");
      if (elQueue) {
        elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Очередь чиста";
      }
      if (elThroughput) elThroughput.textContent = `${Math.round(stats.deliveredWasteTons || 0).toLocaleString("ru-RU")} т вскрыши`;

    } else if (key === "fuel") {
      if (elBadge) elBadge.textContent = "АЗС ГТК";
      if (elName) elName.textContent = "Топливный комплекс ДТ";
      if (elStatus) elStatus.textContent = "Выдача дизельного топлива";
      if (elDesc) elDesc.textContent = "АЗС ГТК: Автоматизированный топливозаправочный комплекс горнотранспортного цеха. Двухпостовая экспресс-раздача дизельного топлива для карьерных автосамосвалов БелАЗ.";
      const active = trucks.filter(t => t.currentNodeId === "n_fuel" && t.state === "servicing");
      if (elCapacity) elCapacity.textContent = `${active.length} / 2 ТРК постов занято`;

      let progress = 0;
      if (active.length > 0) {
        const fuelPct = Math.round((active[0].fuel / active[0].config.fuelTank) * 100);
        progress = fuelPct;
      }
      if (elProgressBar) elProgressBar.style.width = `${progress}%`;

      const queued = trucks.filter(t => t.currentNodeId === "n_fuel" && t.state !== "servicing");
      if (elQueue) {
        elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Очередь чиста";
      }
      if (elThroughput) elThroughput.textContent = "Резервуары: 285 000 л";

    } else if (key === "service") {
      if (elBadge) elBadge.textContent = "РМЦ";
      if (elName) elName.textContent = "База ТО и ремонтные боксы";
      if (elStatus) elStatus.textContent = "Планово-предупредительный ремонт";
      if (elDesc) elDesc.textContent = "РМЦ: Ремонтно-механический цех и диагностическая база. Плановое ТО, замена крупногабаритных шин (КГШ) и устранение отказов двигателей и гидравлических систем.";
      const active = trucks.filter(t => t.currentNodeId === "n_service" && t.state === "servicing");
      if (elCapacity) elCapacity.textContent = `${active.length} / 3 боксов занято`;

      let progress = 0;
      if (active.length > 0) {
        progress = Math.round(active[0].condition);
      }
      if (elProgressBar) elProgressBar.style.width = `${progress}%`;

      const queued = trucks.filter(t => t.currentNodeId === "n_service" && t.state !== "servicing");
      if (elQueue) {
        elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Очередь чиста";
      }
      if (elThroughput) elThroughput.textContent = "Готовность парка: 100%";

    } else if (key === "parking") {
      if (elBadge) elBadge.textContent = "АНГАР";
      if (elName) elName.textContent = "Площадка отстоя и сервисный ангар";
      if (elStatus) elStatus.textContent = "Резерв техники / Межрейсовый отстой";
      if (elDesc) elDesc.textContent = "Площадка отстоя и сервисный ангар: 12 стояночных мест. Резерв автопарка, стоянка машин без наряда, охлаждение узлов и восстановление ресурса.";
      const parked = trucks.filter(t => t.currentNodeId === "n_parking" && t.state === "parked");
      if (elCapacity) elCapacity.textContent = `${parked.length} / 12 мест занято`;

      let progress = Math.min(100, Math.round((parked.length / 12) * 100));
      if (elProgressBar) elProgressBar.style.width = `${progress}%`;

      const queued = trucks.filter(t => t.currentNodeId === "n_parking" && t.state !== "parked");
      if (elQueue) {
        elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Очередь чиста";
      }
      if (elThroughput) elThroughput.textContent = `В резерве: ${parked.length} ед.`;

    } else if (key === "cup") {
      if (elBadge) elBadge.textContent = "ЦУП";
      if (elName) elName.textContent = "Диспетчерский центр АСУ ГТК";
      if (elStatus) elStatus.textContent = "Оперативный контроль АСУ ГТК";
      if (elDesc) elDesc.textContent = "ЦУП: Центральный пункт диспетчерского управления карьера ЕВРАЗ. Динамическая маршрутизация самосвалов, контроль КПИ смены, устранение пробок и мониторинг СЦБ.";
      if (elCapacity) elCapacity.textContent = `${trucks.length} БелАЗов на линии`;
      if (elProgressBar) elProgressBar.style.width = `${stats.efficiencyKpi || 100}%`;
      if (elQueue) elQueue.textContent = `КПИ: ${stats.efficiencyKpi || 100}%`;
      if (elThroughput) elThroughput.textContent = `${Math.round(stats.netProfitRub || 0).toLocaleString("ru-RU")} ₽`;

    } else if (key.startsWith("exc_")) {
      const excId = key === "exc_1" ? "n_exc_deep" :
        (key === "exc_2" ? "n_exc_mid" :
        (key === "exc_3" ? "n_exc_waste" : "n_exc_deep2"));
      const exc = excavators.find(e => e.id === excId);
      if (exc) {
        if (elBadge) elBadge.textContent = key === "exc_1" ? "ЗАБОЙ 1" : (key === "exc_4" ? "ЗАБОЙ 4" : (key === "exc_2" ? "ЗАБОЙ 2" : "ЗАБОЙ 3"));
        if (elName) elName.textContent = exc.name;
        if (elStatus) elStatus.textContent = exc.state === "loading" ? "Идет погрузка ковшом" : (exc.state === "waiting_truck" ? "Ожидает подачи самосвала" : "В работе");
        if (elCapacity) elCapacity.textContent = exc.currentTruck ? `Ковш ${exc.config.bucketCapacityTons}т → ${exc.currentTruck.id}` : "Свободен под погрузку";

        if (elDesc) {
          if (key === "exc_1") {
            elDesc.textContent = "Забой 1 (глубокий горизонт -195м, западный фланг): Тяжелый гидравлический экскаватор Liebherr R 9400 (ковш 24 м³). Отгрузка богатой руды с содержанием Fe 62%.";
          } else if (key === "exc_2") {
            elDesc.textContent = "Забой 2 (промежуточный горизонт -95м): Карьерный экскаватор Liebherr R 9250 (ковш 15 м³). Добыча рядовой магнетитовой руды стандартного обогащения.";
          } else if (key === "exc_3") {
            elDesc.textContent = "Забой 3 (вскрышной горизонт -45м, верхний ярус): Экскаватор Liebherr R 9250. Селективная экскавация скальных вскрышных пород для транспортировки на Северный отвал.";
          } else {
            elDesc.textContent = "Забой 4 (глубокий горизонт -195м, восточный фланг): Флагманский экскаватор Liebherr R 9400 (ковш 24 м³). Богатейшая руда карьера с содержанием Fe 64%.";
          }
        }

        const cycleProgress = exc.config ? Math.round(((exc.cycleTimer % exc.config.cycleTimeSec) / exc.config.cycleTimeSec) * 100) : 0;
        if (elProgressBar) elProgressBar.style.width = `${exc.state === "loading" ? cycleProgress : 0}%`;

        const queued = trucks.filter(t => t.currentNodeId === exc.id && t.state === "queued_load");
        if (elQueue) {
          elQueue.textContent = queued.length > 0 ? queued.map(t => t.id.replace("БелАЗ-", "#")).join(", ") : "Нет очереди";
        }
        if (elThroughput) elThroughput.textContent = `${Math.round(exc.totalDugTons || 0).toLocaleString("ru-RU")} т отгружено`;
      }
    }
  }

  initCameraControls() {
    this.elCameraBar = document.getElementById("camera-poi-bar");
    if (!this.elCameraBar) return;

    // 1. Кнопки основных точек интереса (Карьер, Дно, ГОФ, Отвал, РМЦ, ЦУП, Свободный)
    const poiBtns = this.elCameraBar.querySelectorAll(".cam-btn[data-poi]");
    poiBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const poiKey = btn.getAttribute("data-poi");
        this.game.renderer.setCameraPoi(poiKey, null, this.game);
        if (poiKey === "free" || poiKey === "overview" || poiKey === "pit_bottom") {
          this.hideTruckCard();
          this.hideBuildingInfoCard();
        } else {
          this.showBuildingInfoCard(poiKey);
        }
        this.closeAllCameraDropdowns();
      });
    });

    // 2. Выпадающий список забоев
    const btnExc = document.getElementById("btn-cam-exc");
    const menuExc = document.getElementById("menu-cam-exc");
    const wrapExc = document.getElementById("wrap-cam-exc");
    if (btnExc && menuExc) {
      btnExc.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menuExc.classList.contains("show");
        this.closeAllCameraDropdowns();
        if (!isOpen) {
          menuExc.classList.add("show");
          if (wrapExc) wrapExc.classList.add("open");
        }
      });

      menuExc.querySelectorAll(".cam-menu-item").forEach(item => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const poiKey = item.getAttribute("data-poi");
          this.game.renderer.setCameraPoi(poiKey, null, this.game);
          this.showBuildingInfoCard(poiKey);
          this.closeAllCameraDropdowns();
        });
      });
    }

    // 3. Выпадающий список БелАЗов
    const btnTrucks = document.getElementById("btn-cam-trucks");
    const menuTrucks = document.getElementById("menu-cam-trucks");
    const wrapTrucks = document.getElementById("wrap-cam-trucks");
    if (btnTrucks && menuTrucks) {
      btnTrucks.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menuTrucks.classList.contains("show");
        this.closeAllCameraDropdowns();
        if (!isOpen) {
          this.populateTrucksDropdown(menuTrucks);
          menuTrucks.classList.add("show");
          if (wrapTrucks) wrapTrucks.classList.add("open");
        }
      });
    }

    // Закрытие выпадающих списков при клике в свободное место
    window.addEventListener("click", () => {
      this.closeAllCameraDropdowns();
    });

    // 4. Кнопка отмены активного слежения
    const cancelTrackingBtn = document.getElementById("btn-cancel-cam-tracking");
    if (cancelTrackingBtn) {
      cancelTrackingBtn.addEventListener("click", () => {
        this.game.renderer.setCameraPoi("free", null, this.game);
      });
    }
  }

  closeAllCameraDropdowns() {
    const menus = document.querySelectorAll(".cam-dropdown-menu");
    menus.forEach(m => m.classList.remove("show"));
    const wraps = document.querySelectorAll(".cam-dropdown-wrapper");
    wraps.forEach(w => w.classList.remove("open"));
  }

  populateTrucksDropdown(menuTrucks) {
    if (!this.game.trucks || this.game.trucks.length === 0) return;

    menuTrucks.innerHTML = this.game.trucks.map(t => {
      const isSelected = this.game.renderer.trackingTruckId === t.id;
      const loadText = t.isLoaded ? (t.loadType === "waste" ? "Вскр." : "Руда") : "Порож.";
      return `
        <button class="cam-menu-item ${isSelected ? 'active' : ''}" data-truck-id="${t.id}" title="${t.config.name} (${loadText})">
          <b>${t.id.replace('БелАЗ-', '#')}</b> <small style="color:${t.isLoaded ? '#10B981' : '#94A3B8'};font-size:10px;">${loadText}</small>
        </button>
      `;
    }).join("");

    menuTrucks.querySelectorAll(".cam-menu-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const truckId = btn.getAttribute("data-truck-id");
        const truck = this.game.trucks.find(t => t.id === truckId);
        if (truck) {
          this.game.renderer.selectedTruckId = truck.id;
          this.game.renderer.setCameraPoi("truck", truck.id, this.game);
          this.showTruckDispatchCard(truck);
        }
        this.closeAllCameraDropdowns();
      });
    });
  }

  updateCameraPoiUI(poiKey, param) {
    if (!this.elCameraBar) return;

    if (poiKey === "free" || poiKey === "overview") {
      this.hideTruckCard();
      this.hideBuildingInfoCard();
    }

    // Снимаем активность со всех кнопок
    const btns = this.elCameraBar.querySelectorAll(".cam-btn");
    btns.forEach(b => b.classList.remove("active"));

    const activeBtn = this.elCameraBar.querySelector(`.cam-btn[data-poi="${poiKey}"]`);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    // Если это забой
    const btnExc = document.getElementById("btn-cam-exc");
    if (btnExc && (poiKey === "exc_1" || poiKey === "exc_2" || poiKey === "exc_3" || poiKey === "exc_4")) {
      btnExc.classList.add("active");
    }

    // Индикатор слежения за БелАЗом
    const trackingIndicator = document.getElementById("cam-tracking-indicator");
    const trackingName = document.getElementById("cam-tracking-name");
    const labelCamTrucks = document.getElementById("label-cam-trucks");
    const btnCamTrucks = document.getElementById("btn-cam-trucks");

    if (poiKey === "truck" && param) {
      if (btnCamTrucks) btnCamTrucks.classList.add("active");
      if (labelCamTrucks) labelCamTrucks.textContent = `${param} ▾`;
      if (trackingIndicator) {
        trackingIndicator.style.display = "flex";
      }
      if (trackingName) {
        trackingName.textContent = param;
      }
    } else {
      if (labelCamTrucks) labelCamTrucks.textContent = `БЕЛАЗЫ ▾`;
      if (trackingIndicator) {
        trackingIndicator.style.display = "none";
      }
    }
  }

  showTruckDispatchCard(truck) {
    if (!this.elTruckCard) {
      this.initTruckCard();
    }
    if (!this.elTruckCard) return;

    this.hideBuildingInfoCard();
    this.selectedTruck = truck;
    this.elTruckCard.style.display = "block";
    this.updateTruckCardTelemetry(truck);
  }

  updateTruckCardTelemetry(truck) {
    const elBadge = document.getElementById("tc-badge");
    const elType = document.getElementById("tc-type");
    const elStatus = document.getElementById("tc-status");
    const elLoad = document.getElementById("tc-load");
    const elFuel = document.getElementById("tc-fuel");
    const elCond = document.getElementById("tc-condition");

    if (elBadge) elBadge.textContent = truck.id;
    if (elType) elType.textContent = `${truck.config.name} • ${truck.config.capacity}т`;

    const statusMap = {
      "moving_empty": "Порожний в рейсе",
      "moving_loaded": "С грузом на выезд",
      "queued_load": "В очереди под погрузку",
      "loading": "Идет погрузка ковшом",
      "queued_unload": "В очереди на разгрузку",
      "unloading": "Разгрузка в бункер",
      "servicing": "Техобслуживание / Заправка",
      "parked": "На площадке отстоя (Ангар)",
      "stopped_breakdown": "Аварийный останов (топливо)"
    };

    if (elStatus) elStatus.textContent = statusMap[truck.state] || truck.state;
    if (elLoad) {
      const typeStr = truck.isLoaded 
        ? (truck.loadType === "waste" ? "Вскрыша" : "Руда") 
        : "Порожний";
      elLoad.textContent = `${Math.round(truck.currentLoad)} т / ${truck.config.capacity} т (${typeStr})`;
    }
    if (elFuel) {
      const fuelPct = Math.round((truck.fuel / truck.config.fuelTank) * 100);
      elFuel.textContent = `${fuelPct}%`;
      elFuel.style.color = fuelPct < 25 ? "#E4002B" : "#FFB81C";
    }
    if (elCond) {
      const condPct = Math.round(truck.condition !== undefined ? truck.condition : 100);
      const condDesc = condPct < 70 ? " (Требует ТО)" : (condPct < 85 ? " (Износ)" : " (Исправен)");
      elCond.textContent = `${condPct}%${condDesc}`;
      elCond.style.color = condPct < 70 ? "#E4002B" : (condPct < 85 ? "#FFB81C" : "#10B981");
    }
  }

  initSpeedControls() {
    const speedBtns = document.querySelectorAll(".speed-btn");
    speedBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const speed = parseFloat(btn.getAttribute("data-speed"));
        this.game.setTimeSpeed(speed);
      });
    });
  }

  updateSpeedButtons(activeSpeed) {
    const speedBtns = document.querySelectorAll(".speed-btn");
    speedBtns.forEach(btn => {
      const speed = parseFloat(btn.getAttribute("data-speed"));
      if (Math.abs(speed - activeSpeed) < 0.01) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  showShiftSummaryModal(stats) {
    const modal = document.getElementById("shift-summary-modal");
    if (!modal) return;

    const totalLoss = stats.truckIdleLossRub + stats.excavatorIdleLossRub + stats.badOrePenaltyRub;
    const oreTons = Math.round(stats.deliveredOreTons);
    const wasteTons = Math.round(stats.deliveredWasteTons);

    // 1. Заполнение числовых метрик
    const elOre = document.getElementById("sum-ore");
    const elOreSub = document.getElementById("sum-ore-sub");
    if (elOre) elOre.textContent = oreTons.toLocaleString("ru-RU") + " т";
    if (elOreSub && stats.oreByGrade) {
      elOreSub.textContent = `Fe 62%: ${Math.round(stats.oreByGrade.rich1)}т | Fe 64%: ${Math.round(stats.oreByGrade.rich2)}т | Рядовая: ${Math.round(stats.oreByGrade.standard)}т`;
    }

    const elWaste = document.getElementById("sum-waste");
    const elWasteRatio = document.getElementById("sum-waste-ratio");
    if (elWaste) elWaste.textContent = wasteTons.toLocaleString("ru-RU") + " т";
    if (elWasteRatio) {
      const ratio = oreTons > 0 ? (wasteTons / oreTons).toFixed(2) : "0.00";
      elWasteRatio.textContent = `Коэф. вскрыши: ${ratio} т/т`;
    }

    const elTrips = document.getElementById("sum-trips");
    if (elTrips) elTrips.textContent = `${stats.totalTrips || 0} рейсов`;

    const elFuel = document.getElementById("sum-fuel");
    const elFuelCost = document.getElementById("sum-fuel-cost");
    const fuelLiters = Math.round(stats.totalFuelConsumedLiters || 0);
    if (elFuel) elFuel.textContent = `${fuelLiters.toLocaleString("ru-RU")} л`;
    if (elFuelCost) elFuelCost.textContent = `Затраты: ~${Math.round(fuelLiters * 65).toLocaleString("ru-RU")} ₽`;

    const elLosses = document.getElementById("sum-losses");
    const elLossesSub = document.getElementById("sum-losses-sub");
    if (elLosses) elLosses.textContent = "-" + Math.round(totalLoss).toLocaleString("ru-RU") + " ₽";
    if (elLossesSub) {
      elLossesSub.textContent = `БелАЗы: -${Math.round(stats.truckIdleLossRub).toLocaleString("ru-RU")}₽ | Забои: -${Math.round(stats.excavatorIdleLossRub).toLocaleString("ru-RU")}₽`;
    }

    const elProfit = document.getElementById("sum-profit");
    if (elProfit) {
      const isPos = stats.netProfitRub >= 0;
      elProfit.textContent = (isPos ? "+" : "") + Math.round(stats.netProfitRub).toLocaleString("ru-RU") + " ₽";
      elProfit.style.color = isPos ? "var(--evraz-green)" : "var(--evraz-red)";
    }

    const elKpi = document.getElementById("sum-kpi");
    if (elKpi) elKpi.textContent = `${stats.efficiencyKpi || 100}%`;

    const elReadiness = document.getElementById("sum-fleet-readiness");
    if (elReadiness) {
      const badCount = (stats.badWasteDeliveries || 0) + (stats.badOreDeliveries || 0);
      elReadiness.textContent = `${Math.max(75, 100 - badCount * 5)}%`;
    }

    // Дополнительные счётчики событий за смену
    const elRefuels = document.getElementById("sum-refuels");
    if (elRefuels) elRefuels.textContent = `${stats.refuelCount || 0} раз`;

    const elServices = document.getElementById("sum-services");
    if (elServices) elServices.textContent = `${stats.serviceCount || 0} раз`;

    const elBreakdowns = document.getElementById("sum-breakdowns");
    if (elBreakdowns) elBreakdowns.textContent = `${stats.breakdownCount || 0} раз`;

    const elOrders = document.getElementById("sum-orders");
    if (elOrders) elOrders.textContent = `${stats.ordersGivenCount || 0} раз`;

    // 2. Отрисовка диаграмм
    this.drawHourlyProdChart(stats.hourlyStats || []);
    this.drawPitDistChart(stats.excavatorStats || {});
    this.drawFleetUtilChart(stats.timeUtilization || {});

    // Кнопка перезапуска смены
    const restartBtn = document.getElementById("btn-restart-shift");
    if (restartBtn) {
      restartBtn.onclick = () => {
        modal.classList.remove("active");
        this.game.restart();
        sound.playClick();
      };
    }

    modal.classList.add("active");
  }

  drawHourlyProdChart(hourlyStats) {
    const canvas = document.getElementById("chart-hourly-prod");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Фон графика
    ctx.fillStyle = "#101419";
    ctx.fillRect(0, 0, w, h);

    // Сетка и направляющие
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let y = 20; y < h - 25; y += 30) {
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
    }

    // Поиск максимума для масштабирования
    let maxVal = 100;
    hourlyStats.forEach(s => {
      if (s.ore > maxVal) maxVal = s.ore;
      if (s.waste > maxVal) maxVal = s.waste;
    });
    maxVal = Math.ceil(maxVal / 50) * 50;

    const barAreaW = w - 50;
    const barAreaH = h - 50;
    const numHours = 12;
    const colW = barAreaW / numHours;

    hourlyStats.forEach((s, i) => {
      const cx = 40 + i * colW;
      const bW = Math.max(4, colW * 0.36);

      // Столбец руды (золотой ЕВРАЗ)
      const oreH = Math.max(2, (s.ore / maxVal) * barAreaH);
      const oreY = (h - 25) - oreH;
      ctx.fillStyle = "#FFB81C";
      ctx.fillRect(cx - bW - 1, oreY, bW, oreH);

      // Столбец вскрыши (оранжевый ЕВРАЗ)
      const wasteH = Math.max(2, (s.waste / maxVal) * barAreaH);
      const wasteY = (h - 25) - wasteH;
      ctx.fillStyle = "#ED7D27";
      ctx.fillRect(cx + 1, wasteY, bW, wasteH);

      // Подпись времени внизу (08, 09, 10...)
      ctx.fillStyle = "#94A3B8";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(8 + i), cx, h - 10);
    });
  }

  drawPitDistChart(excStats) {
    const canvas = document.getElementById("chart-pit-dist");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const items = [
      { id: "n_exc_deep", name: "Забой 1 (Fe 62%)", color: "#FFB81C", val: excStats.n_exc_deep ? excStats.n_exc_deep.tons : 0 },
      { id: "n_exc_deep2", name: "Забой 4 (Fe 64%)", color: "#38BDF8", val: excStats.n_exc_deep2 ? excStats.n_exc_deep2.tons : 0 },
      { id: "n_exc_mid", name: "Забой 2 (Рядовая)", color: "#ED7D27", val: excStats.n_exc_mid ? excStats.n_exc_mid.tons : 0 },
      { id: "n_exc_waste", name: "Забой 3 (Вскрыша)", color: "#94A3B8", val: excStats.n_exc_waste ? excStats.n_exc_waste.tons : 0 }
    ];

    const total = items.reduce((acc, it) => acc + it.val, 0);

    const centerX = w / 2;
    const centerY = h / 2 - 10;
    const radius = 60;
    const innerRadius = 38;

    let currentAngle = -Math.PI / 2;

    if (total <= 0) {
      ctx.strokeStyle = "#2B333F";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Нет данных", centerX, centerY + 4);
      return;
    }

    items.forEach(it => {
      const sliceAngle = (it.val / total) * Math.PI * 2;
      if (sliceAngle <= 0.001) return;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = it.color;
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Текст в центре кольца
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(total)}т`, centerX, centerY + 5);
  }

  drawFleetUtilChart(util) {
    const canvas = document.getElementById("chart-fleet-util");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const segments = [
      { label: "С грузом", color: "#10B981", val: util.movingLoaded || 1 },
      { label: "Порожний", color: "#38BDF8", val: util.movingEmpty || 1 },
      { label: "Погрузка", color: "#FFB81C", val: util.loading || 1 },
      { label: "Разгрузка", color: "#A855F7", val: util.unloading || 1 },
      { label: "В очереди", color: "#EF4444", val: util.queued || 1 },
      { label: "Сервис/АЗС", color: "#6366F1", val: util.servicing || 1 },
      { label: "Простой/Ангар", color: "#64748B", val: util.parked || 0 }
    ];

    const total = segments.reduce((acc, s) => acc + s.val, 0) || 1;

    let curX = 0;
    segments.forEach(seg => {
      const segW = (seg.val / total) * w;
      ctx.fillStyle = seg.color;
      ctx.fillRect(curX, 0, segW, h);
      curX += segW;
    });

    // Легенда под диаграммой
    const legendEl = document.getElementById("chart-fleet-util-legend");
    if (legendEl) {
      legendEl.innerHTML = segments.map(seg => {
        const pct = Math.round((seg.val / total) * 100);
        return `
          <span style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; background: ${seg.color}; border-radius: 2px;"></span>
            ${seg.label}: <b>${pct}%</b>
          </span>
        `;
      }).join("");
    }
  }

  initStartMenu() {
    this.modalStartMenu = document.getElementById("start-menu-modal");
    this.btnStartNew = document.getElementById("smenu-start-new-btn");
    this.btnResume = document.getElementById("smenu-resume-btn");
    this.btnOpenMenu = document.getElementById("btn-open-smenu");

    if (this.btnStartNew) {
      this.btnStartNew.addEventListener("click", () => {
        if (this.modalStartMenu) this.modalStartMenu.classList.remove("active");
        if (this.game.isShiftEnded || this.game.shiftSecondsRemaining <= 0) {
          this.game.restart();
        }
        this.game.isPaused = false;
        sound.playClick();
      });
    }

    if (this.btnResume) {
      this.btnResume.addEventListener("click", () => {
        if (this.modalStartMenu) this.modalStartMenu.classList.remove("active");
        this.game.isPaused = false;
        sound.playClick();
      });
    }

    if (this.btnOpenMenu) {
      this.btnOpenMenu.addEventListener("click", () => {
        this.openStartMenu(true);
      });
    }
  }

  openStartMenu(isResumeAllowed = false) {
    if (!this.modalStartMenu) return;
    if (this.btnResume) {
      this.btnResume.style.display = isResumeAllowed ? "block" : "none";
    }
    this.modalStartMenu.classList.add("active");
    sound.playClick();
  }
}
