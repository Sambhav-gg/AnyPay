import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Upload, Camera, CameraOff, ZoomIn, ZoomOut } from 'lucide-react'

interface QRScannerProps {
  onScan: (result: string) => void
  onClose: () => void
  isOpen: boolean
}

export function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rafRef = useRef<number | null>(null)
  const jsQRRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    import('jsqr').then((m) => { jsQRRef.current = m.default; setIsLibraryLoaded(true) })
      .catch(() => setError('Failed to load QR library'))
  }, [])

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => setIsScanning(true), 250)
      return () => clearTimeout(id)
    } else {
      stopCamera()
      setZoom(1)
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (isScanning) startCamera()
    else stopCamera()
  }, [isScanning])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = ms
      if (videoRef.current) {
        videoRef.current.srcObject = ms
        await videoRef.current.play()
        startScanning()
      }
    } catch (err: any) {
      const msgs: Record<string, string> = {
        NotAllowedError: 'Camera permission denied.',
        NotFoundError: 'No camera found.',
        NotReadableError: 'Camera in use by another app.',
      }
      setError(msgs[err.name] || 'Camera access failed.')
      setIsScanning(false)
    }
  }

  const scanQRCode = (imageData: ImageData): string | null => {
    if (!jsQRRef.current) return null
    try {
      if (!imageData?.data?.length || imageData.width <= 0 || imageData.height <= 0) return null
      if (imageData.data.length !== imageData.width * imageData.height * 4) return null
      const result = jsQRRef.current(imageData.data, imageData.width, imageData.height)
      return result ? result.data : null
    } catch { return null }
  }

  const startScanning = useCallback(() => {
    if (!isLibraryLoaded || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    let lastScan = 0
    const scan = (ts: number) => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan); return
      }
      if (ts - lastScan >= 100) {
        lastScan = ts
        try {
          if (video.videoWidth === 0) { rafRef.current = requestAnimationFrame(scan); return }
          canvas.width = video.videoWidth; canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const res = scanQRCode(data)
          if (res) {
            if (navigator.vibrate) navigator.vibrate(100)
            onScan(res); stopCamera(); setIsScanning(false); return
          }
        } catch { /* continue */ }
      }
      rafRef.current = requestAnimationFrame(scan)
    }
    rafRef.current = requestAnimationFrame(scan)
  }, [isLibraryLoaded, onScan, stopCamera])

  const handleZoom = (v: number) => {
    const c = Math.max(1, Math.min(3, Math.round(v * 10) / 10))
    setZoom(c)
    if (videoRef.current) videoRef.current.style.transform = `scale(${c})`
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isLibraryLoaded) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      try {
        canvas.width = img.width; canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const res = scanQRCode(data)
        if (res) { if (navigator.vibrate) navigator.vibrate(100); onScan(res) }
        else setError('No QR code found in image')
      } catch { setError('Failed to process image') }
    }
    img.onerror = () => setError('Failed to load image')
    img.src = URL.createObjectURL(file)
  }

  if (!isOpen) return null

  return (
    <div className="overlay" style={{ background: '#000' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-mark" style={{ width: 28, height: 28, borderRadius: 8 }}>
            <Camera size={14} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'white' }}>Scan QR Code</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}>
          <X size={18} />
        </button>
      </div>

      {/* Viewfinder */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 320, aspectRatio: '1', position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: '#111' }}>
            {isScanning ? (
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transition: 'transform 0.1s' }}
                playsInline muted autoPlay
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'rgba(255,255,255,0.4)' }}>
                <Camera size={40} />
                <span style={{ fontSize: 13 }}>{error || 'Ready to scan'}</span>
              </div>
            )}
          </div>

          {/* Corners */}
          {isScanning && (
            <>
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />
              <div className="scan-beam" />
              {/* Zoom */}
              <div style={{ position: 'absolute', bottom: 14, left: '10%', right: '10%', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ZoomOut size={14} color="rgba(255,255,255,0.5)" />
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => handleZoom(parseFloat(e.target.value))} style={{ flex: 1 }} />
                <ZoomIn size={14} color="rgba(255,255,255,0.5)" />
                <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', width: 36 }}>{zoom.toFixed(1)}×</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, maxWidth: 320, margin: '0 auto', width: '100%' }}>
          <button
            className="btn"
            style={{ flex: 1, background: isScanning ? 'rgba(255,255,255,0.1)' : 'white', color: isScanning ? 'white' : '#111', border: 'none' }}
            onClick={() => setIsScanning((v) => !v)}
            disabled={!isLibraryLoaded}
          >
            {isScanning ? <><CameraOff size={16} /> Stop</> : <><Camera size={16} /> Start Camera</>}
          </button>
          <button
            className="btn btn-icon"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 48, borderRadius: 14 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={!isLibraryLoaded}
          >
            <Upload size={16} />
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{error}</p>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
