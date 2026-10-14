'use client'

import { useEffect, useRef } from 'react'
import { browserAllowsDecorativeMotion } from '@/lib/ui/motion-policy'

const VERTEX = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`
const FRAGMENT = `
  precision highp float;
  uniform vec2 resolution;
  uniform float elapsed;
  void main() {
    vec2 p = gl_FragCoord.xy / resolution * 2.0 - 1.0;
    float t = elapsed * 0.14;
    float slope = p.y + 0.4 * p.x;
    float blue = exp(-pow((slope - 0.1 * sin(p.x * 4.0 + t)) * 8.0, 2.0));
    float violet = exp(-pow((slope + 0.25 + 0.09 * sin(p.x * 3.5 - t)) * 7.0, 2.0));
    float glow = exp(-dot(p - vec2(0.35, 0.05), p - vec2(0.35, 0.05)) * 2.0);
    vec3 color = vec3(0.016, 0.035, 0.085);
    color += vec3(0.015, 0.08, 0.22) * glow;
    color += vec3(0.04, 0.21, 0.57) * blue;
    color += vec3(0.16, 0.09, 0.4) * violet * 0.8;
    gl_FragColor = vec4(color, 1.0);
  }
`

function shader(gl: WebGLRenderingContext, kind: number, source: string): WebGLShader | null {
  const instance = gl.createShader(kind)
  if (!instance) return null
  gl.shaderSource(instance, source)
  gl.compileShader(instance)
  if (!gl.getShaderParameter(instance, gl.COMPILE_STATUS)) {
    gl.deleteShader(instance)
    return null
  }
  return instance
}

/** Optional decorative effect: CSS provides a complete non-WebGL fallback. */
export function AmbientWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !browserAllowsDecorativeMotion()) return
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
    })
    if (!gl) return

    const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      return
    }
    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    if (!program || !buffer) {
      if (program) gl.deleteProgram(program)
      if (buffer) gl.deleteBuffer(buffer)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      return
    }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      return
    }

    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const attribute = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(attribute)
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'resolution')
    const elapsed = gl.getUniformLocation(program, 'elapsed')
    let frameId = 0
    let visible = true
    let disposed = false
    const started = performance.now()

    function resize() {
      if (!canvas || !gl) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    function render(now: number) {
      if (!canvas || !gl || disposed || !visible || document.hidden) return
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(elapsed, (now - started) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frameId = requestAnimationFrame(render)
    }

    function updateVisibility() {
      cancelAnimationFrame(frameId)
      if (visible && !document.hidden && !disposed) frameId = requestAnimationFrame(render)
    }

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false
        updateVisibility()
      },
      { threshold: 0.01 },
    )
    observer?.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', updateVisibility)
    resize()
    frameId = requestAnimationFrame(render)

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', updateVisibility)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [])

  return <canvas className="vx-ambient-canvas" ref={canvasRef} aria-hidden="true" />
}
