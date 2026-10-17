'use client'

import { useEffect, useRef, useState } from 'react'
import { browserAllowsDecorativeMotion } from '@/lib/ui/motion-policy'

/** Optional Three.js sculpture. The CSS document stack is the permanent fallback. */
export function DocumentOrbit() {
  const [paused, setPaused] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current
    const desktop = window.matchMedia('(min-width: 951px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (paused || !element || !desktop.matches || !browserAllowsDecorativeMotion()) return
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import('three').then((THREE) => {
      if (cancelled || !browserAllowsDecorativeMotion() || !desktop.matches) return
      let renderer: import('three').WebGLRenderer
      try { renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: false, powerPreference: 'low-power' }) } catch { return }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.z = 8
      const group = new THREE.Group()
      const geometry = new THREE.BoxGeometry(1.6, 2.1, 0.07)
      const materials = [0x418fde, 0x3a3152, 0xaccfff].map((color) => new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.3, transparent: true, opacity: 0.88 }))
      materials.forEach((material, index) => {
        const page = new THREE.Mesh(geometry, material)
        page.position.set((index - 1) * 0.3, (index - 1) * 0.12, index * 0.35)
        page.rotation.z = (index - 1) * -0.15
        group.add(page)
      })
      group.rotation.set(0.2, -0.5, -0.15)
      scene.add(group, new THREE.AmbientLight(0xffffff, 2))
      const light = new THREE.DirectionalLight(0xb4dfff, 4)
      light.position.set(3, 4, 5)
      scene.add(light)
      let frame = 0
      let visible = true
      let lost = false
      const resize = () => {
        const width = element.clientWidth, height = element.clientHeight
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      const draw = (now: number) => {
        if (cancelled || lost || !visible || document.hidden || !desktop.matches || !browserAllowsDecorativeMotion()) return
        group.rotation.y = -0.5 + Math.sin(now * 0.0003) * 0.16
        group.position.y = Math.sin(now * 0.0006) * 0.08
        renderer.render(scene, camera)
        element.style.opacity = '1'
        element.parentElement?.setAttribute('data-rendered', 'true')
        frame = requestAnimationFrame(draw)
      }
      const update = () => {
        cancelAnimationFrame(frame)
        if (!desktop.matches || !browserAllowsDecorativeMotion()) { element.style.opacity = '0'; element.parentElement?.removeAttribute('data-rendered') }
        resize()
        frame = requestAnimationFrame(draw)
      }
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); element.style.opacity = '0'; element.parentElement?.removeAttribute('data-rendered') }
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update() })
      observer.observe(element)
      const size = new ResizeObserver(resize)
      size.observe(element)
      document.addEventListener('visibilitychange', update)
      reduced.addEventListener('change', update)
      desktop.addEventListener('change', update)
      element.addEventListener('webglcontextlost', contextLost)
      update()
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); size.disconnect()
        document.removeEventListener('visibilitychange', update)
        reduced.removeEventListener('change', update); desktop.removeEventListener('change', update)
        element.removeEventListener('webglcontextlost', contextLost)
        geometry.dispose(); materials.forEach((material) => material.dispose()); renderer.dispose()
      }
    }).catch(() => { /* Decoration must never prevent authentication. */ })
    return () => { cancelled = true; cleanup?.(); element.style.opacity = '0'; element.parentElement?.removeAttribute('data-rendered') }
  }, [paused])
  return <div className="vx-document-orbit"><div className="vx-orbit-ring" aria-hidden="true" /><div className="vx-document-stack" aria-hidden="true"><span /><span /><span><i /><i /><i /></span></div><canvas ref={canvas} aria-hidden="true" /><button type="button" className="vx-orbit-pause" onClick={() => setPaused(!paused)}>{paused ? 'Play animation' : 'Pause animation'}</button></div>
}
