// Flower petal animation
class Petal {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = -20;
    this.z = Math.random() * 0.5 + 0.5; // Depth for parallax
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = Math.random() * 1 + 0.5;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.size = (Math.random() * 8 + 4) * this.z;
    this.opacity = Math.random() * 0.6 + 0.4;
    
    // Different flower types
    const types = ['cherry', 'osmanthus', 'plum'];
    this.type = types[Math.floor(Math.random() * types.length)];
    
    // Colors for different flowers
    this.colors = {
      cherry: ['#FFB7C5', '#FFC0CB', '#FFD1DC'],
      osmanthus: ['#FFD700', '#FFA500', '#FFDB58'],
      plum: ['#DDA0DD', '#EE82EE', '#DA70D6']
    };
    
    this.color = this.colors[this.type][Math.floor(Math.random() * 3)];
  }

  update() {
    this.x += this.vx * this.z;
    this.y += this.vy * this.z;
    this.rotation += this.rotationSpeed;
    
    // Sine wave motion
    this.x += Math.sin(this.y * 0.01) * 0.5;
    
    // Reset when out of bounds
    if (this.y > this.canvas.height + 20) {
      this.reset();
    }
    
    if (this.x < -20 || this.x > this.canvas.width + 20) {
      this.x = Math.random() * this.canvas.width;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity * this.z;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    
    // Draw petal shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    // Five-petal flower shape
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      const x = Math.cos(angle) * this.size;
      const y = Math.sin(angle) * this.size;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const cpx = Math.cos(angle - Math.PI / 5) * this.size * 0.5;
        const cpy = Math.sin(angle - Math.PI / 5) * this.size * 0.5;
        ctx.quadraticCurveTo(cpx, cpy, x, y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add center
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

export function initPetals() {
  const canvas = document.getElementById('petalCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const petals = [];
  const petalCount = 30;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    petals.forEach(petal => {
      petal.update();
      petal.draw(ctx);
    });
    
    requestAnimationFrame(animate);
  }

  // Initialize petals
  for (let i = 0; i < petalCount; i++) {
    petals.push(new Petal(canvas));
    // Spread initial positions
    petals[i].y = Math.random() * canvas.height;
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
}
