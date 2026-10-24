/** Checagem leve de APIs gráficas (Simulator / TV) antes de investir em recomp/emuladores. */

export interface GraphicsProbeResult {
  webgl2: boolean
  webgpu: boolean
  webgl2Renderer?: string
  webgpuAdapter?: string
  note: string
}

export async function probeGraphicsApis(): Promise<GraphicsProbeResult> {
  let webgl2 = false
  let webgl2Renderer: string | undefined
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (gl) {
      webgl2 = true
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      if (dbg) {
        webgl2Renderer = String(
          gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '',
        )
      }
    }
  } catch {
    webgl2 = false
  }

  let webgpu = false
  let webgpuAdapter: string | undefined
  try {
    const gpu = (
      navigator as Navigator & {
        gpu?: {
          requestAdapter: () => Promise<{
            info?: { device?: string; description?: string }
            requestAdapterInfo?: () => Promise<{ device?: string }>
          } | null>
        }
      }
    ).gpu
    if (gpu) {
      const adapter = await gpu.requestAdapter()
      webgpu = Boolean(adapter)
      if (adapter) {
        let device: string | undefined
        if (typeof adapter.requestAdapterInfo === 'function') {
          const info = await adapter.requestAdapterInfo()
          device = info?.device
        } else if (adapter.info?.device) {
          device = adapter.info.device
        }
        webgpuAdapter = device || 'adapter-ok'
      }
    }
  } catch {
    webgpu = false
  }

  const note = !webgl2
    ? 'Sem WebGL2 — emulação/recomp no browser fica inviável neste runtime.'
    : !webgpu
      ? 'WebGL2 ok; WebGPU ausente — preferir stacks WebGL2 (ex.: wasm+WebGL).'
      : 'WebGL2 e WebGPU disponíveis — ainda assim meça FPS na TV real.'

  return { webgl2, webgpu, webgl2Renderer, webgpuAdapter, note }
}
