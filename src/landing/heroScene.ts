import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl'

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec4 uRect;
uniform vec3 uLight;
uniform vec2 uTexel;
uniform float uLift;
varying vec2 vUv;
float h(vec2 uv) { return texture2D(uMap, uRect.xy + uv * uRect.zw).r; }
void main() {
  float c = h(vUv);
  float dx = h(vUv + vec2(uTexel.x, 0.0)) - h(vUv - vec2(uTexel.x, 0.0));
  float dy = h(vUv + vec2(0.0, uTexel.y)) - h(vUv - vec2(0.0, uTexel.y));
  vec3 n = normalize(vec3(-dx * 4.5, -dy * 4.5, 1.0));
  vec3 l = normalize(uLight);
  float diff = max(dot(n, l), 0.0);
  vec3 hv = normalize(l + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, hv), 0.0), 38.0);
  vec3 lead = vec3(0.55, 0.535, 0.505);
  vec3 ink = vec3(0.1, 0.09, 0.08);
  vec3 base = mix(lead * 0.62, lead, smoothstep(0.2, 0.5, c));
  base = mix(base, ink, smoothstep(0.82, 0.95, c));
  vec3 col = base * (0.42 + 0.85 * diff) + vec3(1.0, 0.97, 0.9) * spec * (0.45 + 0.55 * smoothstep(0.3, 0.6, c));
  float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
  col *= mix(0.55, 1.0, edge);
  gl_FragColor = vec4(col * (1.0 - uLift * 0.15), 1.0);
}`

const TILE = 256

function atlas(word: string, font: string) {
  const canvas = document.createElement('canvas')
  canvas.width = TILE * word.length
  canvas.height = TILE
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < word.length; i++) {
    const x = i * TILE
    ctx.save()
    ctx.filter = 'blur(5px)'
    ctx.fillStyle = '#6e6e6e'
    ctx.fillRect(x + 14, 14, TILE - 28, TILE - 28)
    ctx.restore()
    ctx.save()
    ctx.fillStyle = '#4a4a4a'
    ctx.fillRect(x + 22, TILE - 46, TILE - 44, 7)
    ctx.restore()
    ctx.save()
    ctx.filter = 'blur(2.2px)'
    ctx.fillStyle = '#fff'
    ctx.font = `900 ${TILE * 0.66}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.translate(x + TILE / 2, TILE / 2 + TILE * 0.03)
    ctx.scale(-1, 1)
    ctx.fillText(word[i], 0, 0)
    ctx.restore()
  }
  return canvas
}

type Sort = { mesh: Mesh; from: { x: number; y: number; r: number }; to: { x: number; y: number }; delay: number }

export type Hero = { destroy: () => void }

const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(1 - t, 4))

export function mountHero(canvas: HTMLCanvasElement, word: string, reduced: boolean): Hero | null {
  let renderer: Renderer
  try {
    renderer = new Renderer({ canvas, dpr: Math.min(2, window.devicePixelRatio || 1), alpha: true, antialias: true })
  } catch {
    return null
  }
  const gl = renderer.gl
  if (!gl) return null
  gl.clearColor(0, 0, 0, 0)
  const camera = new Camera(gl, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 })
  camera.position.z = 5
  const scene = new Transform()
  const line = [...word].reverse().join('')
  const texture = new Texture(gl, { image: atlas(line, "'Schibsted Grotesk', Arial, sans-serif"), generateMipmaps: false })
  const geometry = new Plane(gl)
  const light = { x: 0.6, y: 0.5, tx: 0.6, ty: 0.5 }
  const sorts: Sort[] = []
  for (let i = 0; i < word.length; i++) {
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uMap: { value: texture },
        uRect: { value: [i / word.length, 0, 1 / word.length, 1] },
        uLight: { value: [0.6, 0.5, 0.35] },
        uTexel: { value: [1 / (TILE * word.length), 1 / TILE] },
        uLift: { value: 0 },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })
    mesh.setParent(scene)
    const seed = Math.sin(i * 91.7) * 0.5 + 0.5
    sorts.push({ mesh, from: { x: (seed - 0.5) * 2.6, y: 1.6 + seed * 0.8, r: (seed - 0.5) * 1.4 }, to: { x: 0, y: 0 }, delay: i * 0.09 })
  }

  let width = 1
  let height = 1
  let size = 0.2
  const layout = () => {
    const box = canvas.parentElement ?? canvas
    width = box.clientWidth
    height = box.clientHeight
    renderer.setSize(width, height)
    const aspect = width / Math.max(1, height)
    camera.orthographic({ left: -aspect, right: aspect, top: 1, bottom: -1 })
    size = Math.min(0.66, (aspect * 2 * 0.88) / word.length)
    const gap = size * 0.06
    const total = word.length * size + (word.length - 1) * gap
    sorts.forEach((s, i) => {
      s.to = { x: -total / 2 + size / 2 + i * (size + gap), y: 0.02 }
      s.mesh.scale.set(size, size * 1.18, 1)
    })
  }
  layout()
  const ro = new ResizeObserver(layout)
  ro.observe(canvas.parentElement ?? canvas)

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    light.tx = ((e.clientX - r.left) / r.width) * 2 - 1
    light.ty = -(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  const start = performance.now()
  let frame = 0
  let visible = true
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !frame) frame = requestAnimationFrame(tick)
  })
  io.observe(canvas)

  function tick(now: number) {
    frame = 0
    const t = reduced ? 10 : (now - start) / 1000
    if (!reduced && t > 3) {
      light.tx += Math.sin(t * 0.35) * 0.0008
    }
    light.x += (light.tx - light.x) * 0.08
    light.y += (light.ty - light.y) * 0.08
    for (const s of sorts) {
      const k = ease(Math.max(0, (t - 0.25 - s.delay) / 1.1))
      s.mesh.position.x = s.from.x + (s.to.x - s.from.x) * k
      s.mesh.position.y = s.from.y + (s.to.y - s.from.y) * k
      s.mesh.rotation.z = s.from.r * (1 - k)
      const p = s.mesh.program
      p.uniforms.uLight.value = [light.x - s.mesh.position.x, light.y - s.mesh.position.y, 0.42]
      p.uniforms.uLift.value = 1 - k
    }
    renderer.render({ scene, camera })
    if (visible && (!reduced || t < 0.1)) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)

  return {
    destroy: () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
