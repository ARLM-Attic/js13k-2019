//#region globals

const c = document.createElement('canvas')
const $ = c.getContext('2d')
const w = (c.width = 720)
const h = (c.height = w * 0.8)

const PI2 = 2 * Math.PI
const FRICTION = 0.96
const MOUSE = captureMouse(c)
let HUE_LEVEL = -1
const HUE_LEVELS = [300, 240, 170, 60, 0]
const HIGH_SCORES = localStorage.highScore
  ? JSON.parse(localStorage.highScore)
  : []

//#endregion

//#region html

const styles = `body{text-align:center;background:#000}canvas{cursor:crosshair;
outline:navy solid 15px}.start{cursor:pointer;position:absolute;bottom:50px;
left:calc(50% - 125px);width:200px;color:#FFF;padding:10px 25px;font-size:25px;
font-family:monospace;outline:#fff solid 5px}.start:hover{color:#222;
outline:#222 solid 5px}.container{margin:30px auto;position:relative}`

const style = document.createElement('style')
style.innerHTML = styles
document.head.appendChild(style)

const container = document.createElement('div')
container.classList.add('container')

const startBtn = document.createElement('div')
startBtn.classList.add('start')
startBtn.innerText = 'New Game'
startBtn.addEventListener('click', () => startGame())

document.body.appendChild(container)
container.appendChild(c)
container.appendChild(startBtn)

const hideStart = () => startBtn.setAttribute('hidden', 'true')
const showStart = () => startBtn.removeAttribute('hidden')

//#endregion

//#region mouse

function captureMouse(el) {
  let mouse = { x: 0, y: 0 }

  el.addEventListener('mousemove', e =>
    Object.assign(mouse, {
      x: e.pageX - el.offsetLeft,
      y: e.pageY - el.offsetTop
    })
  )

  return mouse
}

//#endregion

//#region keyboard

const PRESSED_KEYS = {}

const isKeyDown = key => PRESSED_KEYS[key]
const onKeyUp = ({ which }) => delete PRESSED_KEYS[which]
const onKeyDown = ({ which }) => (PRESSED_KEYS[which] = true)

window.addEventListener('keyup', onKeyUp)
window.addEventListener('keydown', onKeyDown)

const KEYS = {
  A: 65,
  W: 87,
  S: 83,
  D: 68,
  UP: 38,
  LEFT: 37,
  DOWN: 40,
  RIGHT: 39
}

//#endregion

//#region utils

const partial = (fn, ...partials) => (...args) => fn(...partials, ...args)
const extend = (o, ...ext) => Object.assign({}, o, ...ext)
const randNum = (min, max) => Math.random() * (max - min) + min
const intersects = (a, b) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist < a.radius + b.radius
}

const updateLevel = () => {
  HUE_LEVEL++
  if (!(HUE_LEVEL in HUE_LEVELS)) HUE_LEVEL = 0
  style.innerHTML += `canvas {filter: contrast(175%) brightness(105%) hue-rotate(${
    HUE_LEVELS[HUE_LEVEL]
  }deg); }`
}

const addHighScore = score => {
  if (HIGH_SCORES.length < 5) {
    HIGH_SCORES.push(score)
  } else {
    HIGH_SCORES.sort((a, b) => a < b)
    HIGH_SCORES.reverse()
    for (let i = 0; i < HIGH_SCORES.length; ++i) {
      if (HIGH_SCORES[i] < score) {
        HIGH_SCORES.splice(i, 0, score)
        break
      }
    }
  }
  HIGH_SCORES.sort((a, b) => a < b)
  HIGH_SCORES.splice(5)
  localStorage.setItem('highScore', JSON.stringify(HIGH_SCORES))
}

const Vector = partial(extend, { x: 0, y: 0, vx: 0, vy: 0 })
const GameObject = partial(Vector, { radius: 0, color: '#FFF', rotation: 0 })

//#endregion

//#region bg

const wifiIcon = (signalStrength = 4) => {
  const intialColor = `rgba(255,255,255,.2)`
  const fadedColor = `rgba(255,255,255,.05)`

  $.save()

  const initialArc = 180
  $.lineWidth = 40

  $.strokeStyle = signalStrength >= 4 ? intialColor : fadedColor

  $.beginPath()
  $.arc(w / 2, h / 2, initialArc, Math.PI + 0.4, PI2 - 0.4)
  $.stroke()

  $.strokeStyle = signalStrength >= 3 ? intialColor : fadedColor

  $.beginPath()
  $.arc(w / 2, h / 2, initialArc - 50, Math.PI + 0.4, PI2 - 0.4)
  $.stroke()

  $.strokeStyle = signalStrength >= 2 ? intialColor : fadedColor

  $.beginPath()
  $.arc(w / 2, h / 2, initialArc - 100, Math.PI + 0.4, PI2 - 0.4)
  $.stroke()

  $.fillStyle = signalStrength > 0 ? intialColor : fadedColor

  $.beginPath()
  $.arc(w / 2, h / 2, 50, 0, PI2)
  $.fill()

  $.restore()
}

const generateBg = () => {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')

  c.width = w
  c.height = h
  document.body.appendChild(c)

  ctx.fillStyle = 'hsl(220, 60%, 50%)'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = 'hsla(0, 0%, 0%, 0.1)'
  ctx.fillRect(0, 0, w, h)

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      ctx.fillStyle = 'hsla(0, 0%, ' + randNum(0, 100) + '%, 0.02)'
      ctx.fillRect(x, y, 1, 1)
    }
  }

  for (let y = 0; y < h; y += 1) {
    if (y % 2 === 0) {
      ctx.fillStyle = 'hsla(0, 0%, 0%, 0.1)'
    } else {
      ctx.fillStyle = 'hsla(0, 0%, 100%, 0.05)'
    }
    ctx.fillRect(0, y, w, 1)
  }

  let grad1 = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h)
  grad1.addColorStop(0, 'hsla(0, 0%, 100%, .3)')
  grad1.addColorStop(1, 'hsl(0, 0%, 0%)')
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = grad1
  ctx.fillRect(0, 0, w, h)

  const data = ctx.getImageData(0, 0, w, h)
  document.body.removeChild(c)
  return data
}

//#endregion

//#region screens

const splashScreen = scope => {
  $.save()

  $.putImageData(scope.bg, 0, 0, 0, 0, w, h)
  wifiIcon(scope.player.strength)

  $.fillStyle = '#FFF'
  $.strokeStyle = '#FFF'
  $.font = '45px monospace'
  $.fillText('Connection Defender', w / 2, h / 2 - 80)

  $.font = '25px monospace'
  $.fillText('W,A,S,D or Arrow Keys to move.', w / 2, h / 2)
  $.fillText('Mouse to aim.', w / 2, h / 2 + 40)
  $.fillText('Click to shoot.', w / 2, h / 2 + 80)
  $.restore()
}

const endScreen = () => {
  $.save()

  $.fillStyle = `#FFF`
  $.font = '45px monospace'
  $.fillText('Game Over!', w / 2, h / 2 - 140)

  $.font = '20px monospace'
  $.fillText('Connection lost! You are now offline...', w / 2, h / 2 - 100)
  $.fillText('High Scores:', w / 2, h / 2 - 60)

  let offset = -30
  HIGH_SCORES.map((s, i) => {
    if (i > 0) {
      offset += 30
    }
    $.fillText(`${s} pts`, w / 2, h / 2 + offset)
  })

  $.restore()
}

//#endregion

//#region player

const Player = partial(GameObject, {
  speed: 4,
  score: 0,
  radius: 20,
  strength: 4,
  isHit: false,
  color: 'rgb(72,255,206)',
  fadeColor: 'rgba(72,255,206,.1)'
})
const renderPlayer = p => {
  $.save()
  $.translate(p.x, p.y)

  $.lineWidth = 2.5
  $.strokeStyle = p.fadeColor

  // horiz
  $.beginPath()
  $.moveTo(p.radius * 1.5, 0)
  $.lineTo(w, 0)
  $.stroke()
  $.moveTo(-p.radius * 1.5, 0)
  $.lineTo(-w, 0)
  $.stroke()

  // vert
  $.beginPath()
  $.moveTo(0, p.radius * 1.5)
  $.lineTo(0, h)
  $.stroke()
  $.beginPath()
  $.moveTo(0, -p.radius * 1.5)
  $.lineTo(0, -h)
  $.stroke()

  // ship
  $.strokeStyle = p.color
  const buffer = p.radius / 4
  const r = p.radius - buffer

  $.rotate(p.rotation)

  $.beginPath()
  $.moveTo(r, 0)
  $.lineTo(-r, r)
  $.lineTo(-r - r / 2, 0)
  $.lineTo(-r, -r)
  $.lineTo(r, 0)
  $.stroke()

  $.restore()
}
const updatePlayer = p => {
  if (isKeyDown(KEYS.UP) || isKeyDown(KEYS.W)) p.vy = -p.speed
  if (isKeyDown(KEYS.DOWN) || isKeyDown(KEYS.S)) p.vy = p.speed
  if (isKeyDown(KEYS.LEFT) || isKeyDown(KEYS.A)) p.vx = -p.speed
  if (isKeyDown(KEYS.RIGHT) || isKeyDown(KEYS.D)) p.vx = p.speed

  p.x += p.vx
  p.y += p.vy
  p.vx *= FRICTION
  p.vy *= FRICTION

  if (p.x - p.radius <= 0) p.x = p.radius
  if (p.y - p.radius <= 0) p.y = p.radius
  if (p.x + p.radius >= w) p.x = w - p.radius
  if (p.y + p.radius >= h) p.y = h - p.radius

  const dx = MOUSE.x - p.x
  const dy = MOUSE.y - p.y
  p.rotation = Math.atan2(dy, dx)

  if (p.isHit) {
    p.renderAsHit = true
    p.isHit = false
    p.strength--
  }
}

//#endregion

//#region bullet

const Bullet = partial(GameObject, {
  speed: 6,
  radius: 5,
  target: Vector(),
  hitTarget: false,
  color: `rgb(0, 255, 255)`
})
const renderBullet = b => {
  $.save()
  $.translate(b.x, b.y)
  $.rotate(b.rotation)

  $.lineWidth = 1
  $.strokeStyle = b.color
  const r = b.radius

  $.beginPath()
  $.moveTo(r, 0)
  $.lineTo(-r, r)
  $.lineTo(-r - r / 2, 0)
  $.lineTo(-r, -r)
  $.lineTo(r, 0)
  $.stroke()
  $.restore()
}
const updateBullet = b => {
  let dx = b.target.x - b.x
  let dy = b.target.y - b.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < b.radius) {
    b.hitTarget = true
    return
  }

  dx = dx / dist
  dy = dy / dist

  b.x += dx * b.speed
  b.y += dy * b.speed
  b.rotation = Math.atan2(dy, dx)
}

//#endregion

//#region enemy

const Enemy = partial(GameObject, {
  radius: 18,
  isHit: false,
  target: Vector(),
  hitTarget: false,
  speed: randNum(1.5, 3),
  color: `hsl(0, 50%, 50%)`
})
const renderEnemy = e => {
  $.save()
  $.translate(e.x, e.y)
  $.rotate(e.rotation)
  $.fillStyle = e.color

  const r = e.radius
  const buffer = r / 4

  $.beginPath()
  $.moveTo(0, 0)
  $.lineTo(-r / 2, -r / 2 - buffer)
  $.lineTo(r, 0)
  $.lineTo(r, 0)
  $.lineTo(-r / 2, r / 2 + buffer)
  $.closePath()
  $.fill()
  $.restore()
}
const updateEnemy = e => {
  let dx = e.target.x - e.x
  let dy = e.target.y - e.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < e.radius) {
    e.hitTarget = true
    return
  }

  dx = dx / dist
  dy = dy / dist

  e.x += dx * e.speed
  e.y += dy * e.speed
  e.rotation = Math.atan2(dy, dx)
}
const generateEnemy = target => {
  const randX = randNum(0, w)
  const randY = randNum(0, h)
  const x = randNum(0, 1) > 0.5 ? randX + w : randX - w
  const y = randNum(0, 1) > 0.5 ? randY + h : randY - h
  return Enemy({ x, y, target })
}

//#endregion

//#region boss

const Boss = partial(GameObject, {
  health: 18,
  speed: 1.8,
  radius: 32,
  alive: true,
  isHit: false,
  target: Vector(),
  hitTarget: false,
  color: `hsl(0, 50%, 50%)`
})
const renderBoss = e => {
  $.save()
  $.lineWidth = 3
  $.translate(e.x, e.y)
  $.rotate(e.rotation)

  $.strokeStyle = `hsl(${e.x % 360}, 80%, 35%)`
  $.fillStyle = `hsl(${e.x % 360}, 80%, 35%)`

  const r = e.radius

  $.beginPath()
  $.moveTo(r, 0)
  $.lineTo(-r, r)
  $.lineTo(-r - r / 2, 0)
  $.lineTo(-r, -r)
  $.lineTo(r, 0)

  if (e.isHit) {
    $.fill()
    e.isHit = false
  } else {
    $.stroke()
  }
  $.restore()
}
const updateBoss = e => {
  let dx = e.target.x - e.x
  let dy = e.target.y - e.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < e.radius) {
    e.hitTarget = true
    return
  }

  dx = dx / dist
  dy = dy / dist

  e.x += dx * e.speed
  e.y += dy * e.speed
  e.rotation = Math.atan2(dy, dx)
  if (e.isHit) {
    e.health -= 1
  }

  if (e.health < 1) {
    e.alive = false
  }
}
const generateBoss = target => {
  const randX = randNum(0, w)
  const randY = randNum(0, h)
  const x = randNum(0, 1) > 0.5 ? randX + w : randX - w
  const y = randNum(0, 1) > 0.5 ? randY + h : randY - h
  return Boss({ x, y, target })
}

//#endregion

//#region explosion

const Explosion = partial(GameObject, {
  alpha: 1,
  count: 8,
  radius: 1,
  embers: [],
  color: 'red',
  ended: false,
  emberRadius: 3
})
const generateEmbers = e => {
  const res = []
  const embers = e.count
  const radius = e.radius

  for (let i = 0; i < embers; ++i) {
    const ember = GameObject({
      x: e.x,
      y: e.y,
      alpha: 1,
      vx: radius * Math.cos((PI2 * i) / embers),
      vy: radius * Math.sin((PI2 * i) / embers),
      radius: e.emberRadius
    })

    res.push(ember)
  }
  return res
}
const updateExplosion = e => {
  if (!e.embers.length) {
    e.embers = generateEmbers(e)
  }

  e.embers.map(m => {
    m.x += m.vx
    m.y += m.vy

    $.save()
    $.translate(m.x, m.y)
    $.strokeStyle = `hsla(0,80%,80%,${e.alpha})`
    $.beginPath()
    $.arc(0, 0, m.radius, 0, PI2)
    $.stroke()
    $.restore()
  })

  if (e.alpha) {
    e.alpha -= 0.03
    if (e.alpha < 0) {
      e.ended = true
    }
  }
}

//#endregion

//#region scope

const INITIAL_SCOPE = () =>
  extend(
    {},
    {
      player: Player({ x: w / 2, y: h / 2 }),
      bullets: [],
      enemies: [],
      boss: null,
      maxEnemies: 8,
      bg: generateBg(),
      count: 0,
      explosions: []
    }
  )

let SCOPE = INITIAL_SCOPE()
const resetScope = () => extend({}, INITIAL_SCOPE())

//#endregion

//#region gameloop

const gameLoop = scope => {
  if (scope.player.strength > 0) {
    window.requestAnimationFrame(partial(gameLoop, scope))
  } else {
    showStart()
    addHighScore(scope.player.score)
    window.requestAnimationFrame(() => endScreen())
  }

  $.putImageData(scope.bg, 0, 0, 0, 0, w, h)
  wifiIcon(scope.player.strength)

  $.save()
  $.font = '12px monospace'
  $.fillStyle = `rgba(255,255,255,1)`
  $.fillText(`${scope.player.score} pts`, w - 50, h - 20)
  $.restore()

  scope.count++
  if (scope.count % 999 && scope.enemies.length < scope.maxEnemies) {
    scope.enemies.push(generateEnemy(scope.player))
  }

  if (
    scope.player.score === 1200 ||
    (scope.player.score > 1600 &&
      scope.player.score % 1600 === 0 &&
      !scope.boss)
  ) {
    scope.boss = generateBoss(scope.player)
  }

  scope.explosions = scope.explosions
    .map(e => (updateExplosion(e), e))
    .filter(e => !e.ended)

  scope.enemies = scope.enemies
    .map(e => (updateEnemy(e), e))
    .map(e => {
      if (intersects(e, scope.player)) {
        e.hitTarget = true
        scope.player.isHit = true
      }
      return e
    })
    .filter(e => !e.hitTarget)
    .filter(e => {
      if (e.isHit) {
        scope.explosions.push(Explosion({ x: e.x, y: e.y }))
      }
      return !e.isHit
    })

  scope.bullets = scope.bullets
    .map(b => (updateBullet(b), b))
    .filter(b => !b.hitTarget)

  scope.bullets.find(b => {
    const hitEnemy = scope.enemies.find(e => intersects(e, b))
    if (hitEnemy) {
      hitEnemy.isHit = true
      scope.player.score += 50
      return true
    }
    return false
  })

  updatePlayer(scope.player)

  scope.bullets.map(b => renderBullet(b))
  scope.enemies.map(e => renderEnemy(e))
  renderPlayer(scope.player)

  if (scope.boss) {
    const hitBullet = scope.bullets.find(b => intersects(b, scope.boss))
    if (hitBullet) {
      scope.boss.isHit = true
      hitBullet.hitTarget = true
    }

    updateBoss(scope.boss)
    renderBoss(scope.boss)

    if (intersects(scope.player, scope.boss)) {
      scope.player.strength -= 0.1
    }

    if (!scope.boss.alive) {
      scope.player.score += 400
      scope.explosions.push(
        Explosion({
          x: scope.boss.x,
          y: scope.boss.y,
          radius: 3,
          count: 10,
          emberRadius: 6
        })
      )
      scope.boss = null
      updateLevel()
    }
  }
}

//#endregion

//#region setup

$.textAlign = 'center'
$.textBaseline = 'middle'
$.globalCompositeOperation = 'lighter'

const startGame = () => {
  HUE_LEVEL = -1
  SCOPE = resetScope()
  hideStart()
  updateLevel()
  c.focus()
  gameLoop(SCOPE)
}

splashScreen(INITIAL_SCOPE())
updateLevel()

c.addEventListener('click', e => {
  if (SCOPE.player.strength) {
    SCOPE.bullets.push(
      Bullet({
        x: SCOPE.player.x,
        y: SCOPE.player.y,
        target: MOUSE
      })
    )
  }
})

//#endregion
