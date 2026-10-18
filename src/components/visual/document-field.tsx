'use client'

import { useEffect, useRef } from 'react'
import { browserAllowsDecorativeMotion } from '@/lib/ui/motion-policy'

/** An optional, original field of document layers. The SVG remains the fallback. */
export function DocumentField() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!browserAllowsDecorativeMotion() || window.innerWidth < 780) return
    let disposed = false
    let cleanup: (() => void) | undefined
    void import('three').then((THREE) => {
      if (disposed || !host.current) return
      const container = host.current
      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) } catch { return }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 100)
      camera.position.set(0, 0, 12)
      const sculpture = new THREE.Group()
      scene.add(sculpture)
      const geometries: InstanceType<typeof THREE.BufferGeometry>[] = []
      const materials: InstanceType<typeof THREE.Material>[] = []
      // Thin document-sized luminous planes rather than a generic solid object.
      for (let layer = 0; layer < 7; layer++) {
        const geometry = new THREE.PlaneGeometry(2.7, 3.55)
        const material = new THREE.MeshBasicMaterial({ color: layer % 2 ? 0x7955ff : 0x31b9f8, transparent: true, opacity: .035 + layer * .008, side: THREE.DoubleSide, depthWrite: false })
        const page = new THREE.Mesh(geometry, material)
        page.position.set((layer - 3) * .23, (layer - 3) * .1, (layer - 3) * .37)
        page.rotation.set(-.18, -.45, -.15)
        sculpture.add(page)
        const edge = new THREE.EdgesGeometry(geometry)
        const ink = new THREE.LineBasicMaterial({ color: layer % 2 ? 0xaa8dff : 0x63d8ff, transparent: true, opacity: .32 })
        const outline = new THREE.LineSegments(edge, ink)
        outline.position.copy(page.position); outline.rotation.copy(page.rotation)
        sculpture.add(outline)
        geometries.push(geometry, edge); materials.push(material, ink)
      }
      for (let orbit = 0; orbit < 4; orbit++) {
        const points = Array.from({ length: 161 }, (_, i) => {
          const a = i / 160 * Math.PI * 2
          return new THREE.Vector3(Math.cos(a) * (3.7 + orbit * .16), Math.sin(a) * (1.6 + orbit * .16), Math.sin(a) * 1.5)
        })
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({ color: orbit % 2 ? 0x9a6cff : 0x43d9ff, transparent: true, opacity: .2 + orbit * .04 })
        const line = new THREE.Line(geometry, material)
        line.rotation.z = -.45
        sculpture.add(line); geometries.push(geometry); materials.push(material)
      }
      const positions = new Float32Array(90 * 3)
      for (let i = 0; i < 90; i++) {
        const a = i * 2.399963
        const r = 2.8 + (i % 13) * .12
        positions.set([Math.cos(a) * r, Math.sin(a) * r * .7, Math.sin(i * 1.3)], i * 3)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({ color: 0xa3caff, size: .035, transparent: true, opacity: .7 })
      sculpture.add(new THREE.Points(geometry, material)); geometries.push(geometry); materials.push(material)
      let frame = 0; let visible = true; let lost = false
      const resize = () => {
        const width = container.clientWidth; const height = container.clientHeight
        if (!width || !height) return
        renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix()
      }
      const draw = (time: number) => {
        if (disposed || lost || !visible || document.hidden) return
        sculpture.rotation.y = Math.sin(time * .00015) * .12
        sculpture.position.y = Math.sin(time * .0004) * .08
        renderer.render(scene, camera)
        frame = requestAnimationFrame(draw)
      }
      const resume = () => { cancelAnimationFrame(frame); if (visible && !document.hidden && !lost) frame = requestAnimationFrame(draw) }
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume() })
      const resizeObserver = new ResizeObserver(resize)
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); renderer.domElement.style.opacity = '0' }
      renderer.domElement.addEventListener('webglcontextlost', contextLost)
      observer.observe(container); resizeObserver.observe(container)
      document.addEventListener('visibilitychange', resume)
      resize(); resume()
      cleanup = () => {
        cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect()
        document.removeEventListener('visibilitychange', resume)
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        geometries.forEach((item) => item.dispose()); materials.forEach((item) => item.dispose())
        renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
      }
    }).catch(() => { /* The complete static illustration remains visible. */ })
    return () => { disposed = true; cleanup?.() }
  }, [])
  return <div className="vx-document-field" ref={host} aria-hidden="true" />
}
