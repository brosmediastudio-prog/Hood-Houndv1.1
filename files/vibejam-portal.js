// Vibe Jam 2026 — Three.js portals (adapted for Hood Hound scale + interact to travel)
// Guide: https://vibej.am/portal/2026

function vibeJamCurrentPageHrefNoQuery() {
  var u = window.location.href.split('#')[0];
  var qi = u.indexOf('?');
  return qi < 0 ? u : u.substring(0, qi);
}

function computeVibeJamLocalModeRaw() {
  if (window.location.protocol === 'file:') return true;
  var h = (window.location.hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true;
  var q = new URLSearchParams(window.location.search || '');
  if (q.get('vjlocal') === '1' || q.get('vjlocal') === 'true') return true;
  return false;
}

window.__hoodHoundVibeJamLocal = computeVibeJamLocalModeRaw();
(function () {
  try {
    var q = new URLSearchParams(window.location.search || '');
    if (q.get('vjprod') === '1' || q.get('vjprod') === 'true') {
      window.__hoodHoundVibeJamLocal = false;
    }
  } catch (e) {}
})();

(function () {
  var qs = new URLSearchParams(window.location.search || '');
  var arrivedViaPortal = qs.get('portal') === 'true' || qs.get('portal') === '1';

  var cfg = null;
  var startPortal = null;
  var exitPortal = null;

  var PORTAL_WORLD_SCALE = 0.26;
  var PROX_DIST_MAX = 28;

  /** Read by Hood Hound for ACT / E hint + doI branch */
  window._vjPortalNearExit = false;
  window._vjPortalNearReturn = false;

  function hoodHoundDefaultRef() {
    if (window.location.protocol === 'file:') {
      return vibeJamCurrentPageHrefNoQuery();
    }
    var o = window.location.origin;
    if (!o || String(o).toLowerCase() === 'null') {
      return vibeJamCurrentPageHrefNoQuery();
    }
    var p = window.location.pathname || '/';
    p = p.replace(/\/index\.html?$/i, '');
    if (p !== '/' && p.slice(-1) === '/') p = p.slice(0, -1);
    return o + (p === '/' ? '' : p);
  }

  function makePortal(cfg2) {
    var color = cfg2.color;
    var position = cfg2.position;
    var rotationX = cfg2.rotationX !== undefined ? cfg2.rotationX : 0.35;
    var label = cfg2.label || '';

    var group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    group.rotation.x = rotationX;

    group.add(new THREE.Mesh(
      new THREE.TorusGeometry(15, 2, 16, 100),
      new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        transparent: true,
        opacity: 0.8,
      })
    ));

    group.add(new THREE.Mesh(
      new THREE.CircleGeometry(13, 32),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      })
    ));

    if (label) {
      var canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 64;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 10);
      var lmesh = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 5),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
          transparent: true,
          side: THREE.DoubleSide,
        })
      );
      lmesh.position.y = 20;
      group.add(lmesh);
    }

    var particleCount = 800;
    var geom = new THREE.BufferGeometry();
    var positions = new Float32Array(particleCount * 3);
    var colors = new Float32Array(particleCount * 3);
    var r = ((color >> 16) & 0xff) / 255;
    var g = ((color >> 8) & 0xff) / 255;
    var b = (color & 0xff) / 255;
    for (var i = 0; i < particleCount * 3; i += 3) {
      var angle = Math.random() * Math.PI * 2;
      var radius = 15 + (Math.random() - 0.5) * 4;
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] = (Math.random() - 0.5) * 4;
      var jitter = 0.8 + Math.random() * 0.2;
      colors[i] = r * jitter;
      colors[i + 1] = g * jitter;
      colors[i + 2] = b * jitter;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var particleSystem = new THREE.Points(geom, new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
    }));
    group.add(particleSystem);

    group.scale.setScalar(PORTAL_WORLD_SCALE);

    group.updateMatrixWorld(true);
    return {
      group: group,
      particles: geom,
      box: new THREE.Box3().setFromObject(group),
    };
  }

  function animateParticles(p) {
    var positions = p.attributes.position.array;
    var tt = Date.now() * 0.001;
    for (var i = 0; i < positions.length; i += 3) {
      positions[i + 1] += 0.05 * Math.sin(tt + i);
    }
    p.attributes.position.needsUpdate = true;
  }

  function getPlayerBox() {
    var player = cfg && cfg.getPlayer && cfg.getPlayer();
    if (!player) return null;
    return new THREE.Box3().setFromObject(player);
  }

  function playerNearPortal(struct) {
    if (!struct) return false;
    var playerBox = getPlayerBox();
    if (!playerBox) return false;
    struct.group.updateMatrixWorld(true);
    struct.box.copy(new THREE.Box3().setFromObject(struct.group));
    var dc = playerBox.getCenter(new THREE.Vector3())
      .distanceTo(struct.box.getCenter(new THREE.Vector3()));
    if (dc > PROX_DIST_MAX) return false;
    return playerBox.intersectsBox(struct.box);
  }

  /** Particles + proximity hints (travel only via vibeJamPortalTryInteract through doI). */
  function refreshPortalProximityFlags() {
    window._vjPortalNearExit = false;
    window._vjPortalNearReturn = false;
    if (!cfg) return;

    var ex = !!(exitPortal && playerNearPortal(exitPortal));
    var st = !!(arrivedViaPortal && startPortal && playerNearPortal(startPortal));

    if (ex && st) {
      var pb = getPlayerBox();
      if (!pb) {
        window._vjPortalNearExit = true;
      } else {
        var vc = pb.getCenter(new THREE.Vector3());
        exitPortal.group.updateMatrixWorld(true);
        startPortal.group.updateMatrixWorld(true);
        exitPortal.box.copy(new THREE.Box3().setFromObject(exitPortal.group));
        startPortal.box.copy(new THREE.Box3().setFromObject(startPortal.group));
        var dex = vc.distanceTo(exitPortal.box.getCenter(new THREE.Vector3()));
        var dst = vc.distanceTo(startPortal.box.getCenter(new THREE.Vector3()));
        if (dex <= dst) window._vjPortalNearExit = true;
        else window._vjPortalNearReturn = true;
      }
    } else if (ex) window._vjPortalNearExit = true;
    else if (st) window._vjPortalNearReturn = true;
  }

  function doReturnRedirect() {
    var params = new URLSearchParams(window.location.search);
    var refUrl = params.get('ref');
    if (!refUrl) return false;

    var url = refUrl;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    params.delete('ref');
    var s = params.toString();
    var join = url.indexOf('?') >= 0 ? '&' : '?';
    var dest = s ? url + join + s : url;
    if (window.__hoodHoundVibeJamLocal) {
      console.info('[Hood Hound · Vibe Jam LOCAL] return portal →', dest);
    }
    window.location.href = dest;
    return true;
  }

  function doExitRedirect() {
    var params = new URLSearchParams(window.location.search);
    params.set('portal', 'true');
    var refVal = typeof hoodHoundPortalRef === 'function' ? hoodHoundPortalRef() : hoodHoundDefaultRef();
    params.set('ref', refVal);

    if (typeof selfUsername !== 'undefined' && selfUsername !== '') params.set('username', String(selfUsername));
    if (typeof currentSpeed !== 'undefined') params.set('speed', String(currentSpeed));
    if (typeof playerColorForPortal !== 'undefined' && playerColorForPortal) {
      params.set('color', String(playerColorForPortal));
    }

    if (window.__hoodHoundVibeJamLocal) {
      var next = vibeJamCurrentPageHrefNoQuery() + '?' + params.toString();
      console.info('[Hood Hound · Vibe Jam LOCAL] exit portal → reloading same game URL:\n', next);
      window.location.href = next;
      return true;
    }

    window.location.href = 'https://vibej.am/portal/2026?' + params.toString();
    return true;
  }

  /**
   * Call from Hood Hound ACT / E (doI). Returns true when a redirect fires.
   */
  window.vibeJamPortalTryInteract = function () {
    if (typeof window.S === 'object' && window.S && !window.S.gameStarted) return false;
    if (!cfg) return false;
    refreshPortalProximityFlags();
    if (!window._vjPortalNearExit && !window._vjPortalNearReturn) return false;

    if (window._vjPortalNearReturn) {
      if (!arrivedViaPortal || !startPortal) return false;
      return doReturnRedirect();
    }

    if (window._vjPortalNearExit && exitPortal) return doExitRedirect();

    return false;
  };

  window.initVibeJamPortals = function (options) {
    cfg = Object.assign({
      spawnPoint: { x: 0, y: 0, z: 0 },
      exitPosition: { x: -200, y: 200, z: -300 },
      exitLabel: 'VIBE JAM PORTAL',
    }, options || {});

    window._vjPortalNearExit = false;
    window._vjPortalNearReturn = false;

    if (!cfg.scene) {
      console.warn('[VibeJam] initVibeJamPortals: missing scene option');
      return;
    }

    var locSuf = window.__hoodHoundVibeJamLocal ? ' (LOCAL)' : '';

    if (arrivedViaPortal) {
      startPortal = makePortal({
        color: 0xff2222,
        position: cfg.spawnPoint,
        label: (cfg.startLabel !== undefined ? cfg.startLabel : 'BACK WE GO') + locSuf,
      });
      cfg.scene.add(startPortal.group);
    }

    exitPortal = makePortal({
      color: 0x22ff66,
      position: cfg.exitPosition,
      label: (cfg.exitLabel || 'VIBE JAM PORTAL') + locSuf,
    });
    cfg.scene.add(exitPortal.group);

    if (window.__hoodHoundVibeJamLocal) {
      console.info('[Hood Hound · Vibe Jam LOCAL] Exit ring reloads THIS page with forwarded params. Widget & vibej.am are off. Append ?vjprod=1 anytime to force production.');
    }
  };

  window.animateVibeJamPortals = function () {
    if (typeof window.S === 'object' && window.S && !window.S.gameStarted) {
      window._vjPortalNearExit = false;
      window._vjPortalNearReturn = false;
    } else {
      refreshPortalProximityFlags();
    }
    if (startPortal) animateParticles(startPortal.particles);
    if (exitPortal) animateParticles(exitPortal.particles);
  };
})();
