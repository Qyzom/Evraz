/**
 * Точка входа приложения ESIM DISPATCH
 */

import { Game } from "./core/Game.js";
import { sound } from "./audio.js";
import { CASE_PASSPORT_HTML } from "./ui/CaseDocModal.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("quarry-canvas");

  const game = new Game(canvas);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (game && game.renderer) {
      game.renderer.resize();
    }
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  game.start();



  // 1. Кнопка переключения "АСУ ГТК (АВТОМАТ) / РУЧНОЙ РЕЖИМ"
  const autoBtn = document.getElementById("btn-toggle-auto");
  if (autoBtn) {
    autoBtn.addEventListener("click", () => {
      const isAuto = game.toggleAutoDispatcher();
      autoBtn.classList.toggle("active", isAuto);
      autoBtn.querySelector(".btn-label").textContent = isAuto 
        ? "РЕЖИМ: АСУ ГТК (АВТОМАТ)" 
        : "РЕЖИМ: РУЧНОЙ ДИСПЕТЧЕР";
    });
  }

  // 2. Модалка "Паспорт кейса для жюри"
  const docModal = document.getElementById("case-passport-modal");
  const docBtn = document.getElementById("btn-open-passport");
  if (docModal && docBtn) {
    docModal.innerHTML = CASE_PASSPORT_HTML;
    docBtn.addEventListener("click", () => {
      sound.playClick();
      docModal.classList.add("active");
    });

    docModal.addEventListener("click", (e) => {
      if (e.target.id === "btn-close-case-modal" || e.target === docModal) {
        sound.playClick();
        docModal.classList.remove("active");
      }
    });
  }

  // 3. Модалка "Инструкция диспетчера"
  const guideModal = document.getElementById("dispatcher-guide-modal");
  const guideBtn = document.getElementById("btn-open-guide");
  const closeGuideBtn = document.getElementById("btn-close-guide");
  const closeGuideFooterBtn = document.getElementById("btn-close-guide-footer");

  if (guideModal && guideBtn) {
    guideBtn.addEventListener("click", () => {
      sound.playClick();
      guideModal.classList.add("active");
    });

    const closeGuide = () => {
      sound.playClick();
      guideModal.classList.remove("active");
    };

    if (closeGuideBtn) closeGuideBtn.addEventListener("click", closeGuide);
    if (closeGuideFooterBtn) closeGuideFooterBtn.addEventListener("click", closeGuide);
    guideModal.addEventListener("click", (e) => {
      if (e.target === guideModal) closeGuide();
    });
  }

  // 5. Кнопка перезапуска смены
  const restartBtn = document.getElementById("btn-restart-shift");
  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      sound.playClick();
      document.getElementById("shift-summary-modal").classList.remove("active");
      game.restart();
    });
  }

  // Регламентное уведомление при старте
  setTimeout(() => {
    const hint = document.getElementById("start-hint");
    if (hint) {
      hint.style.opacity = "0";
      setTimeout(() => hint.remove(), 500);
    }
  }, 5000);
});
