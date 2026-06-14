/** Renders an animated particle mesh on a canvas element.
 *  Configurable via options; exposes destroy() for cleanup. (SRP)
 */
export class HeroCanvas {
  #canvas;
  #ctx;
  #particles = [];
  #rafId = null;
  #resizeObserver = null;

  #options;

  static #defaults = {
    particleCount:   45,
    particleColor:   'rgba(37, 99, 235, 0.55)',
    lineColor:       'rgba(37, 99, 235, {alpha})',
    maxLineDistance: 120,
    speed:           0.3,
    minRadius:       1,
    maxRadius:       3,
  };

  constructor(canvasEl, options = {}) {
    this.#canvas  = canvasEl;
    this.#ctx     = canvasEl.getContext('2d');
    this.#options = { ...HeroCanvas.#defaults, ...options };
  }

  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.#resize();
    this.#spawnParticles();
    this.#loop();
    this.#watchResize();
  }

  destroy() {
    if (this.#rafId) cancelAnimationFrame(this.#rafId);
    this.#resizeObserver?.disconnect();
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
  }

  #resize() {
    this.#canvas.width  = this.#canvas.offsetWidth;
    this.#canvas.height = this.#canvas.offsetHeight;
  }

  #watchResize() {
    this.#resizeObserver = new ResizeObserver(() => {
      this.#resize();
      this.#spawnParticles();
    });
    this.#resizeObserver.observe(this.#canvas.parentElement);
  }

  #spawnParticles() {
    const { particleCount, speed, minRadius, maxRadius } = this.#options;
    this.#particles = Array.from({ length: particleCount }, () => ({
      x:  Math.random() * this.#canvas.width,
      y:  Math.random() * this.#canvas.height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      r:  minRadius + Math.random() * (maxRadius - minRadius),
    }));
  }

  #updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > this.#canvas.width)  p.vx *= -1;
    if (p.y < 0 || p.y > this.#canvas.height) p.vy *= -1;
  }

  #draw() {
    const { particleColor, lineColor, maxLineDistance } = this.#options;
    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    for (let i = 0; i < this.#particles.length; i++) {
      const p = this.#particles[i];
      this.#updateParticle(p);

      this.#ctx.beginPath();
      this.#ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.#ctx.fillStyle = particleColor;
      this.#ctx.fill();

      for (let j = i + 1; j < this.#particles.length; j++) {
        const q = this.#particles[j];
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (dist < maxLineDistance) {
          const alpha = (0.12 * (1 - dist / maxLineDistance)).toFixed(3);
          this.#ctx.beginPath();
          this.#ctx.moveTo(p.x, p.y);
          this.#ctx.lineTo(q.x, q.y);
          this.#ctx.strokeStyle = lineColor.replace('{alpha}', alpha);
          this.#ctx.lineWidth = 0.8;
          this.#ctx.stroke();
        }
      }
    }
  }

  #loop() {
    this.#draw();
    this.#rafId = requestAnimationFrame(() => this.#loop());
  }
}
