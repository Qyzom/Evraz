/**
 * Камера для плавного панорамирования и зумирования изометрического карьера
 */

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
    this.minZoom = 0.35;
    this.maxZoom = 2.0;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.initEvents();
  }

  initEvents() {
    this.mouseDownPos = { x: 0, y: 0 };
    this.hasMovedSignificantly = false;

    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.hasMovedSignificantly = false;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.dragStartX = e.clientX - this.x;
      this.dragStartY = e.clientY - this.y;
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const dist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);
        if (dist > 5) {
          this.hasMovedSignificantly = true;
        }
        this.x = e.clientX - this.dragStartX;
        this.y = e.clientY - this.dragStartY;
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, this.minZoom), this.maxZoom);

      // Масштабирование относительно курсора
      const mouseX = e.clientX - this.canvas.offsetLeft;
      const mouseY = e.clientY - this.canvas.offsetTop;

      this.x = mouseX - (mouseX - this.x) * (newZoom / this.zoom);
      this.y = mouseY - (mouseY - this.y) * (newZoom / this.zoom);
      this.zoom = newZoom;
    }, { passive: false });

    // Тач-события для мобилок
    let lastTouchDist = 0;
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX - this.x;
        this.dragStartY = e.touches[0].clientY - this.y;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.x = e.touches[0].clientX - this.dragStartX;
        this.y = e.touches[0].clientY - this.dragStartY;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          this.zoom = Math.min(Math.max(this.zoom * factor, this.minZoom), this.maxZoom);
        }
        lastTouchDist = dist;
      }
    });

    this.canvas.addEventListener("touchend", () => {
      this.isDragging = false;
      lastTouchDist = 0;
    });
  }

  // Перевод координат экрана в мировые
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom
    };
  }

  // Перевод координат мира на экран
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.x,
      y: worldY * this.zoom + this.y
    };
  }

  apply(ctx) {
    ctx.translate(this.x, this.y);
    ctx.scale(this.zoom, this.zoom);
  }

  reset(canvasWidth, canvasHeight) {
    // Автоподбор масштаба под экран
    const scaleX = (canvasWidth * 0.9) / 1600;
    const scaleY = (canvasHeight * 0.78) / 950;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.1);
    this.x = canvasWidth / 2;
    // Сдвиг по вертикали с учётом верхней панели шапки
    this.y = (canvasHeight / 2) + 25;
  }
}
