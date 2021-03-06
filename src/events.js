'use strict';

const Events = {
  savePng() {
    const a  = document.createElement('a');
    a.href = document.getElementById('glmandel').toDataURL('png');
    a.download = `mandelbrot_x_${aim.x.toExponential()}__y_${aim.y.toExponential()})`
      + `__zoom_${Math.floor(1.5 * aim.hx.inv().toNumber())}x.png`;
    a.click();
  },
  showError(header, msg) {
    if (header) document.getElementById('errorHdr').innerHTML = header;
    if (msg) document.getElementById('errorMsg').innerHTML = msg;
    document.getElementById('errorBox').classList.add('is-active');
  },
  simpleZoom(pos, factor) {
    aim.x = pos.x;
    aim.y = pos.y;
    aim.hx = aim.hx.mul(factor);
    aim.hy = aim.hy.mul(factor);
    draw(aim);
    Events.updateUI();
  },
  updateUI() {
    const glcontrol = document.getElementById('glcontrol');
    const ctx = glcontrol.getContext('2d');
    ctx.clearRect(0, 0, glcontrol.width, glcontrol.height);
    glcontrol.width = ctx.canvas.clientWidth;
    glcontrol.height = ctx.canvas.clientHeight;
    const gl = twgl.getContext(document.getElementById('gljulia'));
    gl.clear(gl.COLOR_BUFFER_BIT);
  },
  reset() {
    aim = { x: new Double(-0.75), y: new Double(0), hx: new Double(1.25), hy: new Double(1.15), phi: 0 };
    draw(aim);
  }
};

(function () {

  /* ============== Functions ============== */

  function getPos(e) {
    if (prevPhi !== aim.phi) {
      prevPhi = aim.phi;
      prevCos = Math.cos(aim.phi);
      prevSin = Math.sin(aim.phi);
    }
    const dx = aim.hx.mul(2 * e.offsetX / glcontrol.width - 1);
    const dy = aim.hy.mul(2 * e.offsetY / glcontrol.height - 1);
    return {
      x: aim.x.add(dx.mul(prevCos).add(dy.mul(prevSin))),
      y: aim.y.add(dx.mul(prevSin).sub(dy.mul(prevCos))),
      px: e.offsetX,
      py: e.offsetY,
    };
  }

  function wheelZoom(pos) {
    const factor = Math.pow(2, -wheelAccum / 200 );
    pos.x = pos.x.add(aim.x.sub(pos.x).mul(factor));
    pos.y = pos.y.add(aim.y.sub(pos.y).mul(factor));
    Events.simpleZoom(pos, factor);
    wheelAccum = 0;
  }

  function aimZoom(pos, newAim) {
    if (!newAim.hx) {
      Events.simpleZoom(pos, 1/8);
    } else if (Math.abs(mouseDownPos.px - pos.px) + Math.abs(mouseDownPos.py - pos.py) < 10) {
      Events.simpleZoom(mouseDownPos, 1/8);
    } else {
      aim = newAim;
      draw(aim);
      Events.updateUI();
    }
  }

  function drawOrbit(pos) {
    const orbittex = calcOrbit(pos);
    const ctx = glcontrol.getContext('2d');
    ctx.clearRect(0, 0, glcontrol.width, glcontrol.height);
    ctx.beginPath();
    for (let i = 0; i < imax; i++) {
      const point = { x: orbittex[4 * i], y: orbittex[4 * i + 1] };
      const x = ((point.x - aim.x.toNumber()) / aim.hx.toNumber() + 1) / 2 * glcontrol.width;
      const y = ((aim.y.toNumber() - point.y) / aim.hy.toNumber() + 1) / 2 * glcontrol.height;
      ctx.arc(x, y, 1, 0, 2 * Math.PI, true);
      ctx.lineTo(x, y);
      ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#efe1f4';
    ctx.stroke();
  }

  /* ============== Listeners ============== */

  const glcontrol = document.getElementById('glcontrol');
  let mouseDownPos, prevPhi, prevSin, prevCos;
  let newAim = {};
  let isDrawingAim = false;
  let isJulia = false;
  let isOrbit = false;
  let wheelAccum = 0;

  document.addEventListener('DOMContentLoaded', () => {
    Events.updateUI();
    draw(aim);
  });

  glcontrol.addEventListener('mousedown', e => {
    mouseDownPos = getPos(e);
    if ((e.button === 0 && e.ctrlKey) || e.button === 1) {
      isJulia = true;
    } else if (e.button === 0) {
      isDrawingAim = true;
    }
  });

  glcontrol.addEventListener('mouseup', e => {
    const pos = getPos(e);
    if (e.button === 0 && !isJulia) {
      isDrawingAim = false;
      aimZoom(pos, newAim);
    } else if (e.button === 2) {
      Events.simpleZoom(pos, 8);
    }
  });

  window.addEventListener('mouseup', e => {
    if (isDrawingAim && e.target.id !== 'glcontrol') {
      getPos(e);
      glcontrol.dispatchEvent(new MouseEvent('mouseup', e));
    }
    if (isJulia) {
      isJulia = false;
      Events.updateUI();
    }
    if (isOrbit) {
      isOrbit = false;
      Events.updateUI();
    }
  });
  glcontrol.addEventListener('mousemove', e => {
    if (isDrawingAim) {
      const ctx = glcontrol.getContext('2d');
      ctx.clearRect(0, 0, glcontrol.width, glcontrol.height);
      const dpos = mouseDownPos;
      const mx = e.offsetX - dpos.px;
      const my = e.offsetY - dpos.py;
      const ww = glcontrol.width;
      const wh = glcontrol.height;
      const ratio = Math.sqrt((mx*mx + my*my) * 4 / ww / ww);
      const hx = aim.hx.mul(ratio);
      const hy = aim.hy.mul(ratio);
      const alpha = -Math.atan2(my, mx);
      const px = ww / 2 * ratio;
      const py = wh / 2 * ratio;
      ctx.save();
      ctx.beginPath();
      ctx.translate(dpos.px, dpos.py);
      ctx.rotate(-alpha);
      ctx.rect(-px, -py, 2*px, 2*py);
      ctx.moveTo(0, 0);
      ctx.lineTo(px, 0);
      ctx.fillRect(-px-1, -py-1, 2, 2);
      ctx.fillRect(-px-1,  py-1, 2, 2);
      ctx.fillRect( px-1,  py-1, 2, 2);
      ctx.fillRect( px-1, -py-1, 2, 2);
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.stroke();
      ctx.restore();
      newAim = { x: dpos.x, y: dpos.y, hx: hx, hy: hy, phi: aim.phi + alpha };
    }
    if (isJulia) {
      const pos = getPos(e);
      draw({x:Double.Zero, y:Double.Zero, hx:new Double(2), hy:new Double(2), phi:0}, pos);
      drawOrbit(pos);
    }
  });

  glcontrol.addEventListener('wheel', e => {
    e.preventDefault();
    if (wheelAccum === 0) {
      setTimeout(() => wheelZoom(getPos(e)), 100);
    }
    wheelAccum += e.deltaY;
  });

  /* ============== Resize / context ============== */
  glcontrol.addEventListener('contextmenu', e => e.preventDefault());
  document.getElementById('glmandel').addEventListener('webglcontextlost', e => {
    Events.showError('WebGL context lost!',
      `GPU calculation was too long and browser or OS decides to reset the GPU. 
      ${superSampling ? '\nTry to off supersampling.' : ''}`);
    e.preventDefault();
  });

  let currentRequestId = 0;
  window.addEventListener('resize', e => {
    function requestResize(crid) {
      if (crid === currentRequestId) {
        Events.simpleZoom(aim, 1);
      }
      currentRequestId = 0;
    }
    currentRequestId += 1;
    setTimeout(() => requestResize(currentRequestId), 500);
  });

  /* ============== Burgermenu ============== */

  const burger = document.querySelector('.navbar-burger');
  const menu = document.getElementById(burger.dataset.target);
  menu.addEventListener('click', () => {
    if (window.getComputedStyle(burger).display === 'block') {
      burger.click();
    }
  });
  burger.addEventListener('click', () => {
    menu.classList.toggle('is-active');
    burger.classList.toggle('is-active');
  });

  /* ============== Hammerjs ============== */

  document.body.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, false);

  let hammerjs = new Hammer.Manager(glcontrol);
  let pan = new Hammer.Pan();
  let rotate = new Hammer.Rotate();
  let pinch = new Hammer.Pinch();

  hammerjs.add([pan, pinch, rotate]);
  hammerjs.get('pinch').set({ enable: true });
  hammerjs.get('rotate').set({ enable: true });

  let adjustDeltaX = 0;
  let adjustDeltaY = 0;
  let adjustScale = 1;
  let adjustRotation = 0;

  let currentDeltaX = null;
  let currentDeltaY = null;
  let currentScale = null;
  let currentRotation = null;

  hammerjs.on("panstart pinchstart rotatestart", function(e) {
    if (e.pointerType === 'touch') {
      adjustRotation -= e.rotation;
    }
  });

  hammerjs.on("panmove pinchmove rotatemove", function(e) {
    if (e.pointerType === 'touch') {
      currentRotation = adjustRotation + e.rotation;
      currentScale = adjustScale * e.scale;
      currentDeltaX = adjustDeltaX + e.deltaX / currentScale;
      currentDeltaY = adjustDeltaY + e.deltaY / currentScale;
    }
  });

  hammerjs.on("panend pinchend rotateend", function(e) {
    if (e.pointerType === 'touch') {
      adjustScale = currentScale;
      adjustRotation = currentRotation;
      adjustDeltaX = currentDeltaX;
      adjustDeltaY = currentDeltaY;

      const dx = aim.hx.mul(-2 * adjustDeltaX / glcontrol.width);
      const dy = aim.hy.mul(-2 * adjustDeltaY / glcontrol.height);
      const cosPhi = Math.cos(aim.phi);
      const sinPhi = Math.sin(aim.phi);
      aim.x = aim.x.add(dx.mul(cosPhi).add(dy.mul(sinPhi)));
      aim.y = aim.y.add(dx.mul(sinPhi).sub(dy.mul(cosPhi)));
      aim.hx = aim.hx.div(adjustScale);
      aim.hy = aim.hy.div(adjustScale);
      aim.phi = aim.phi + adjustRotation / 360;
      draw(aim);

      adjustScale = 1;
      adjustRotation = 0;
      adjustDeltaX = 0;
      adjustDeltaY = 0;
    }
  });

  /* ============== Service worker ============== */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }

})();
