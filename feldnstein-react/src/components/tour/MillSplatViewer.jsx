import { useEffect, useRef } from 'react'

/**
 * three.js r186+ native Gaussian splat viewer (ADR-0026).
 * Business job: recreate the Mothadaka shed in navigable 3D from the
 * pipeline's .ply — gentle auto-orbit motion, drag to take over.
 *
 * Everything three-related is dynamically imported so the ~600KB engine
 * chunk and the 4.3MB splat load only after explicit user intent.
 * Fallback ladder: WebGPU → WebGL2 backend (forceWebGL) → onError (poster).
 */
export default function MillSplatViewer({ src, onReady, onError }) {
  const mountRef = useRef(null)

  useEffect(() => {
    let disposed = false
    let teardown = () => {}

    async function boot() {
      const mount = mountRef.current
      if (!mount) return
      try {
        const THREE = await import('three/webgpu')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        const { GaussianSplatPLYLoader } = await import('three/examples/jsm/loaders/GaussianSplatPLYLoader.js')
        const { GaussianSplat } = await import('three/examples/jsm/objects/GaussianSplat.js')
        if (disposed) return

        const geometry = await new GaussianSplatPLYLoader().loadAsync(src)
        if (disposed) return

        // Frame the shot on the scene's mass, not its outliers: the raw
        // bounding sphere is inflated by stray floaters, which would leave
        // the shed a speck in the middle of the viewport.
        const pos = geometry.getAttribute('position')
        const axisExtent = axis => {
          const vals = []
          for (let i = 0; i < pos.count; i++) vals.push(pos['get' + axis](i))
          vals.sort((a, b) => a - b)
          const lo = vals[Math.floor(vals.length * 0.02)]
          const hi = vals[Math.ceil(vals.length * 0.98) - 1]
          return { lo, hi }
        }
        const [x, y, z] = ['X', 'Y', 'Z'].map(axisExtent)
        const center = new THREE.Vector3(
          (x.lo + x.hi) / 2, (y.lo + y.hi) / 2, (z.lo + z.hi) / 2,
        )
        const radius = Math.max(x.hi - x.lo, y.hi - y.lo, z.hi - z.lo) / 2

        let renderer
        try {
          renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true })
          await renderer.init()
        } catch (webGpuError) {
          if (disposed) return
          renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true, forceWebGL: true })
          await renderer.init()
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(mount.clientWidth, mount.clientHeight)
        mount.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(
          55,
          mount.clientWidth / mount.clientHeight,
          radius / 100,
          radius * 30,
        )
        // Interior capture: enter at eye level just inside the front of the
        // shed (like walking in), not at a bounding-sphere distance that
        // leaves the camera hovering outside the walls. Aim below the volume
        // center so the churn and floor dominate the frame, not the roof.
        const target = center.clone().add(new THREE.Vector3(0, -radius * 0.25, 0))
        camera.position.copy(target).add(
          new THREE.Vector3(radius * 0.15, radius * 0.12, -radius * 1.0),
        )

        const splats = new GaussianSplat(geometry)
        scene.add(splats)

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.copy(target)
        controls.enableDamping = true
        controls.dampingFactor = 0.06
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.55
        controls.minDistance = radius * 0.1
        controls.maxDistance = radius * 4
        controls.update()

        let announced = false
        renderer.setAnimationLoop(() => {
          controls.update()
          renderer.render(scene, camera)
          if (!announced) {
            announced = true
            onReady?.()
          }
        })

        const observer = new ResizeObserver(() => {
          const w = mount.clientWidth
          const h = mount.clientHeight
          if (w === 0 || h === 0) return
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        })
        observer.observe(mount)

        teardown = () => {
          observer.disconnect()
          renderer.setAnimationLoop(null)
          controls.dispose()
          geometry.dispose()
          renderer.dispose()
          renderer.domElement.remove()
        }
      } catch (error) {
        if (!disposed) onError?.(error)
      }
    }

    boot()
    return () => {
      disposed = true
      teardown()
    }
  }, [src, onReady, onError])

  return <div ref={mountRef} className="absolute inset-0" aria-label="Interactive 3D tour of the Mothadaka mill shed" />
}
