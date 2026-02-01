// Flower petal animation
class Petal {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = -20 - Math.random() * this.canvas.height; // Start from random height above
    this.z = Math.random() * 0.5 + 0.5;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = Math.random() * 1 + 0.5;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    this.size = (Math.random() * 8 + 4) * this.z;
    this.opacity = Math.random() * 0.6 + 0.4;
    
    const types = ['cherry', 'osmanthus', 'plum'];
    this.type = types[Math.floor(Math.random() * types.length)];
    
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
    this.x += Math.sin(this.y * 0.01) * 0.5;
    
    if (this.y > this.canvas.height + 20) {
      this.x = Math.random() * this.canvas.width;
      this.y = -20;
    }
    
    if (this.x < -20) this.x = this.canvas.width + 20;
    if (this.x > this.canvas.width + 20) this.x = -20;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity * this.z;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
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
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

export function initPetals(count = 30) {
  const canvas = document.getElementById('petalCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const petals = [];

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

  for (let i = 0; i < count; i++) {
    petals.push(new Petal(canvas));
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
}

export function initLanterns(texts = ['新', '年', '快', '乐']) {
  const container = document.createElement('div');
  container.className = 'lanterns-container';
  container.innerHTML = `
    <div class="deng-box2">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a"><div class="deng-b"><div class="deng-t">${texts[0]}</div></div></div>
        <div class="shui shui-a"><div class="shui-c"></div><div class="shui-b"></div></div>
      </div>
    </div>
    <div class="deng-box3">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a"><div class="deng-b"><div class="deng-t">${texts[1]}</div></div></div>
        <div class="shui shui-a"><div class="shui-c"></div><div class="shui-b"></div></div>
      </div>
    </div>
    <div class="deng-box1">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a"><div class="deng-b"><div class="deng-t">${texts[2]}</div></div></div>
        <div class="shui shui-a"><div class="shui-c"></div><div class="shui-b"></div></div>
      </div>
    </div>
    <div class="deng-box">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a"><div class="deng-b"><div class="deng-t">${texts[3]}</div></div></div>
        <div class="shui shui-a"><div class="shui-c"></div><div class="shui-b"></div></div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
}

export function initSnow(color = '#cccccc') {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/magic-snowflakes/dist/snowflakes.min.js';
  script.onload = () => {
    if (window.Snowflakes) {
      new window.Snowflakes({ color });
    }
  };
  document.body.appendChild(script);
}

export function initWaves(colors = ['#4579e2', '#3461c1', '#2d55aa']) {
  const wavesHTML = `
    <div class="wiiuii_layout">
      <svg class="editorial" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none">
        <defs>
          <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
        </defs>
        <g class="parallax">
          <use xlink:href="#gentle-wave" x="50" y="0" fill="${colors[0]}"/>
          <use xlink:href="#gentle-wave" x="50" y="3" fill="${colors[1]}"/>
          <use xlink:href="#gentle-wave" x="50" y="6" fill="${colors[2]}"/>
        </g>
      </svg>
    </div>
  `;
  
  // Insert at the end of body, before scripts
  document.body.insertAdjacentHTML('beforeend', wavesHTML);
}
