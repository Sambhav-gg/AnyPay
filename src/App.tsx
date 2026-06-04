import { useState, useEffect, useRef } from 'react'
import {
  Scan, Upload, CreditCard, HelpCircle, Copy, Check,
  ArrowLeft, Download, Zap, Shield, Wifi,
  ChevronRight, Wallet, X, Share
} from 'lucide-react'
import { QRScanner } from './components/QRScanner'
import { FAQPage } from './components/FAQPage'
import { UPIParser } from './lib/upi-parser'
import './index.css'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UPIData {
  upiId: string
  payeeName?: string
  amount?: string
  transactionNote?: string
  url?: string
}

// ─── PWA install prompt is stored in a module-level ref so it's never lost
// even if the component re-renders before useEffect fires.
let _deferredPrompt: BeforeInstallPromptEvent | null = null

export default function App() {
  const [page, setPage] = useState('home')
  const [isQROpen, setIsQROpen] = useState(false)
  const [isFAQOpen, setIsFAQOpen] = useState(false)
  const [upiData, setUpiData] = useState<UPIData | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  // installState: 'hidden' | 'android' | 'ios' | 'desktop' | 'installed'
  const [installState, setInstallState] = useState('hidden')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showDesktopModal, setShowDesktopModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as installed PWA — hide everything
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) {
      setInstallState('installed')
      return
    }

    // Check if user previously dismissed the banner permanently
    const dismissed = localStorage.getItem('anypay-install-dismissed')
    if (dismissed) setBannerDismissed(true)

    // iOS Safari detection (no beforeinstallprompt support)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setInstallState('ios')
      return
    }

    // Desktop detection — show a "look at your address bar" guide
    const isDesktop = window.innerWidth >= 768 && !/android|mobile/i.test(navigator.userAgent)

    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      _deferredPrompt = promptEvent
      promptRef.current = promptEvent
      setInstallState('android')
    }

    // If it was captured before mount, grab it
    if (_deferredPrompt) {
      promptRef.current = _deferredPrompt
      setInstallState('android')
    } else if (isDesktop) {
      setInstallState('desktop')
    }

    window.addEventListener('beforeinstallprompt', handler)

    // PWA installed successfully (e.g. via browser UI)
    const installedHandler = () => setInstallState('installed')
    window.addEventListener('appinstalled', installedHandler)

    // Handle Web Share Target (shared text from other apps)
    const urlParams = new URLSearchParams(window.location.search)
    const sharedText = urlParams.get('text')
    if (sharedText) handleSharedText(decodeURIComponent(sharedText))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 3000)
    } catch { }
  }

  const handleSharedText = (text: string) => {
    const data = UPIParser.parseUPI(text) as UPIData | null
    if (data) { setUpiData(data); copyToClipboard(data.upiId); setPage('result') }
  }

  const handleQRScan = (result: string) => {
    const data = UPIParser.parseUPI(result) as UPIData | null
    if (data) {
      setUpiData(data); copyToClipboard(data.upiId)
      setIsQROpen(false); setPage('result')
    } else {
      const ids = UPIParser.extractAllUPIIds(result) as string[]
      if (ids.length > 0) {
        setUpiData({ upiId: ids[0], url: result })
        copyToClipboard(ids[0])
        setIsQROpen(false); setPage('result')
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = async () => {
        canvas.width = img.width; canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const jsQR = (await import('jsqr')).default
        const code = jsQR(data.data, data.width, data.height)
        if (code) handleQRScan(code.data)
        else alert('No QR code found in image')
      }
      img.src = URL.createObjectURL(file)
    } catch { alert('Failed to process image') }
  }

  const handleInstall = async () => {
    if (installState === 'android') {
      const prompt = promptRef.current || _deferredPrompt
      if (!prompt) { setShowDesktopModal(true); return }
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      promptRef.current = null
      _deferredPrompt = null
      if (outcome === 'accepted') setInstallState('installed')
      else setInstallState('hidden')
    } else if (installState === 'ios') {
      setShowIOSModal(true)
    } else if (installState === 'desktop') {
      const prompt = promptRef.current || _deferredPrompt
      if (prompt) {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        promptRef.current = null; _deferredPrompt = null
        if (outcome === 'accepted') setInstallState('installed')
      } else {
        setShowDesktopModal(true)
      }
    }
  }

  const dismissBanner = () => {
    setBannerDismissed(true)
    localStorage.setItem('anypay-install-dismissed', '1')
  }

  const reset = () => { setUpiData(null); setIsCopied(false); setPage('home') }

  const showInstallUI = (installState === 'android' || installState === 'ios' || installState === 'desktop') && !bannerDismissed

  /* ── RESULT PAGE ── */
  if (page === 'result' && upiData) {
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="ap-root">
          <div className="ap-glow ap-glow--green" />
          <div className="ap-page">
            <header className="ap-header">
              <button className="ap-icon-btn" onClick={reset}><ArrowLeft size={18} /></button>
              <span className="ap-header-title">Payment Ready</span>
              <div style={{ width: 40 }} />
            </header>

            <div className="ap-success-hero animate-rise">
              <div className="ap-success-ring">
                <div className="ap-success-icon"><Check size={28} strokeWidth={2.5} /></div>
              </div>
              <h2 className="ap-success-title">QR Scanned</h2>
              <p className="ap-success-sub">UPI ID copied to clipboard</p>
              {isCopied && (
                <span className="ap-pill ap-pill--green" style={{ marginTop: 12 }}>
                  <Check size={10} /> Copied
                </span>
              )}
            </div>

            <div className="ap-card animate-rise" style={{ animationDelay: '80ms' }}>
              <p className="ap-label">Payment Details</p>
              <div className="ap-detail-row">
                <div className="ap-detail-content">
                  <span className="ap-detail-key">UPI ID</span>
                  <span className="ap-detail-val ap-mono">{upiData.upiId}</span>
                </div>
                <button className={`ap-copy-btn ${isCopied ? 'ap-copy-btn--copied' : ''}`} onClick={() => copyToClipboard(upiData.upiId)}>
                  {isCopied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              {upiData.payeeName && (
                <div className="ap-detail-row">
                  <div className="ap-detail-content">
                    <span className="ap-detail-key">Payee</span>
                    <span className="ap-detail-val">{upiData.payeeName}</span>
                  </div>
                </div>
              )}
              {upiData.amount && (
                <div className="ap-detail-row" style={{ border: 'none' }}>
                  <div className="ap-detail-content">
                    <span className="ap-detail-key">Amount</span>
                    <span className="ap-amount">₹{upiData.amount}</span>
                  </div>
                </div>
              )}
              {upiData.transactionNote && (
                <div className="ap-detail-row" style={{ border: 'none' }}>
                  <div className="ap-detail-content">
                    <span className="ap-detail-key">Note</span>
                    <span className="ap-detail-val" style={{ color: 'var(--ap-text2)' }}>{upiData.transactionNote}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ap-card ap-card--gold animate-rise" style={{ animationDelay: '140ms' }}>
              <button className="ap-btn-primary" onClick={() => (window.location.href = 'tel:*99*1*3#')}>
                <Wallet size={18} /> Send Money via USSD
              </button>
              <p className="ap-ussd-hint">Dial <span className="ap-mono">*99*1*3#</span> · paste UPI ID when prompted</p>
            </div>

            <div className="ap-row-2">
              <button className="ap-btn-ghost" onClick={reset}><Scan size={15} /> Scan Again</button>
              <button className="ap-btn-ghost" onClick={() => (window.location.href = 'tel:*99*3#')}><CreditCard size={15} /> Balance</button>
            </div>

            <button className="ap-btn-outline animate-rise" style={{ animationDelay: '220ms' }} onClick={() => setIsFAQOpen(true)}>
              <HelpCircle size={15} /> Help & FAQ
            </button>
          </div>
        </div>
        <FAQPage isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
      </>
    )
  }

  /* ── HOME PAGE ── */
  return (
    <>
      <style>{sharedStyles}</style>
      <div className="ap-root">
        <div className="ap-glow ap-glow--purple" />
        <div className="ap-glow ap-glow--gold" />

        <div className="ap-page">
          <header className="ap-header">
            <div className="ap-brand">
              <div className="ap-logo"><Zap size={15} strokeWidth={2.5} /></div>
              <span className="ap-wordmark">AnyPay</span>
            </div>
            {showInstallUI && (
              <button className="ap-header-install-btn" onClick={handleInstall}>
                <Download size={14} />
                <span>{installState === 'ios' ? 'Add to Home' : 'Install App'}</span>
              </button>
            )}
          </header>

          <div className="ap-hero">
            <div className="ap-pill ap-pill--dim" style={{ marginBottom: 18 }}>
              <Wifi size={10} /> Offline-First UPI
            </div>
            <h1 className="ap-headline">
              Pay anyone,<br />
              <span className="ap-headline--gold">no internet.</span>
            </h1>
            <p className="ap-hero-sub">Scan UPI QR codes · pay via USSD · works on any network</p>
          </div>

          <div className="ap-scan-card animate-rise">
            <div className="ap-scan-visual">
              <div className="ap-scan-frame">
                <span className="ap-scan-corner ap-scan-corner--tl" />
                <span className="ap-scan-corner ap-scan-corner--tr" />
                <span className="ap-scan-corner ap-scan-corner--bl" />
                <span className="ap-scan-corner ap-scan-corner--br" />
                <Scan size={40} strokeWidth={1.3} className="ap-scan-icon" />
                <div className="ap-scan-line" />
              </div>
            </div>
            <div className="ap-scan-copy">
              <h2 className="ap-scan-title">Scan QR Code</h2>
              <p className="ap-scan-sub">Extract UPI ID instantly</p>
            </div>
            <div className="ap-scan-actions">
              <button className="ap-btn-primary" onClick={() => setIsQROpen(true)}>
                <Scan size={16} /> Scan Now
              </button>
              <button className="ap-btn-icon-sq" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
              </button>
            </div>
          </div>

          <div className="ap-quick-grid">
            <button className="ap-quick-btn" onClick={() => (window.location.href = 'tel:*99*1*3#')}>
              <div className="ap-quick-icon ap-quick-icon--green"><Wallet size={18} /></div>
              <div>
                <p className="ap-quick-label">Send Money</p>
                <p className="ap-quick-code">*99*1*3#</p>
              </div>
            </button>
            <button className="ap-quick-btn" onClick={() => (window.location.href = 'tel:*99*3#')}>
              <div className="ap-quick-icon ap-quick-icon--blue"><CreditCard size={18} /></div>
              <div>
                <p className="ap-quick-label">Check Balance</p>
                <p className="ap-quick-code">*99*3#</p>
              </div>
            </button>
          </div>

          {showInstallUI && (
            <div className="ap-install-strip animate-rise">
              <button className="ap-install-strip-body" onClick={handleInstall}>
                <div className="ap-install-strip-icon">
                  <Download size={16} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p className="ap-install-strip-title">
                    {installState === 'ios' ? 'Add AnyPay to Home Screen' :
                      installState === 'desktop' ? 'Install AnyPay as an app' :
                        'Install AnyPay — works offline'}
                  </p>
                  <p className="ap-install-strip-sub">
                    {installState === 'ios'
                      ? 'Tap Share → Add to Home Screen in Safari'
                      : installState === 'desktop'
                        ? 'Click the install icon ⊕ in your address bar'
                        : 'No app store · instant install · fully offline after'}
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--ap-text3)', flexShrink: 0 }} />
              </button>
              <button className="ap-install-strip-dismiss" onClick={dismissBanner} title="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="ap-card">
            <p className="ap-label">How It Works</p>
            {[
              { n: '01', t: 'Scan QR', s: 'Point camera at any UPI QR code', accent: 'var(--ap-gold)' },
              { n: '02', t: 'Copy ID', s: 'UPI ID extracted and copied instantly', accent: '#a78bfa' },
              { n: '03', t: 'Dial USSD', s: 'Tap Send Money to open *99*1*3# dialer', accent: 'var(--ap-green)' },
              { n: '04', t: 'Pay', s: 'Paste ID, enter amount and PIN', accent: '#60a5fa' },
            ].map((step, i, arr) => (
              <div key={i} className="ap-step" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--ap-border)' : 'none' }}>
                <span className="ap-step-num" style={{ color: step.accent }}>{step.n}</span>
                <div>
                  <p className="ap-step-title">{step.t}</p>
                  <p className="ap-step-sub">{step.s}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="ap-faq-btn" onClick={() => setIsFAQOpen(true)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HelpCircle size={16} />
              <span>FAQ & Video Tutorials</span>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--ap-text3)' }} />
          </button>

          <div className="ap-warn">
            <span>⚠️</span>
            <p>Avoid computerised QR codes (vending machines) — may not work properly</p>
          </div>

          <div className="ap-badges">
            {[
              { icon: <Shield size={11} />, label: 'No data stored' },
              { icon: <Wifi size={11} />, label: 'Works offline' },
              { icon: <Zap size={11} />, label: 'Instant copy' },
            ].map((b, i) => (
              <span key={i} className="ap-pill ap-pill--dim">{b.icon} {b.label}</span>
            ))}
          </div>

          <footer className="ap-footer">Made by Sambhav</footer>
        </div>

        {/* ── iOS "Add to Home Screen" instructions modal ── */}
        {showIOSModal && (
          <div className="ap-modal-backdrop" onClick={() => setShowIOSModal(false)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <p className="ap-modal-title">Install on iPhone</p>
                <button className="ap-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowIOSModal(false)}>
                  <X size={14} />
                </button>
              </div>
              <p className="ap-modal-sub">Add AnyPay to your home screen for offline access — no App Store needed.</p>
              <div className="ap-modal-steps">
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">1</div>
                  <div className="ap-modal-step-text">
                    Tap the <strong>Share</strong> button
                    <span className="ap-modal-icon-inline"><Share size={14} /></span>
                    at the bottom of Safari
                  </div>
                </div>
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">2</div>
                  <div className="ap-modal-step-text">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </div>
                </div>
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">3</div>
                  <div className="ap-modal-step-text">
                    Tap <strong>Add</strong> in the top-right corner
                  </div>
                </div>
              </div>
              <div className="ap-modal-arrow-hint">
                <span>↓ Share button is down here</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Desktop "look at your address bar" instructions modal ── */}
        {showDesktopModal && (
          <div className="ap-modal-backdrop" onClick={() => setShowDesktopModal(false)}>
            <div className="ap-modal ap-modal--center" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <p className="ap-modal-title">Install on Desktop</p>
                <button className="ap-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setShowDesktopModal(false)}>
                  <X size={14} />
                </button>
              </div>
              <p className="ap-modal-sub">Install AnyPay as a desktop app — it works fully offline once installed.</p>
              <div className="ap-modal-steps">
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">1</div>
                  <div className="ap-modal-step-text">
                    Look at the <strong>right side of your address bar</strong> — you'll see an install icon <span style={{ fontFamily: 'monospace', color: 'var(--ap-gold)' }}>⊕</span> or a computer icon
                  </div>
                </div>
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">2</div>
                  <div className="ap-modal-step-text">
                    Click it, then click <strong>"Install"</strong> in the popup
                  </div>
                </div>
                <div className="ap-modal-step">
                  <div className="ap-modal-step-num">3</div>
                  <div className="ap-modal-step-text">
                    AnyPay opens as a standalone window — pin it to your taskbar for quick access
                  </div>
                </div>
              </div>
              <div className="ap-modal-browser-note">
                Works in <strong>Chrome</strong> and <strong>Edge</strong>. Firefox doesn't support PWA install.
              </div>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        <QRScanner isOpen={isQROpen} onClose={() => setIsQROpen(false)} onScan={handleQRScan} />
        <FAQPage isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   ALL STYLES
───────────────────────────────────────── */
const sharedStyles = `
  :root {
    --ap-bg: #0a0a0b;
    --ap-surface: #111113;
    --ap-surface2: #18181c;
    --ap-border: rgba(255,255,255,0.07);
    --ap-border2: rgba(255,255,255,0.12);
    --ap-text: #f0ede8;
    --ap-text2: #8a8782;
    --ap-text3: #55534f;
    --ap-gold: #d4a853;
    --ap-gold-dim: rgba(212,168,83,0.12);
    --ap-gold-border: rgba(212,168,83,0.25);
    --ap-green: #3ecf7a;
    --ap-green-dim: rgba(62,207,122,0.1);
    --ap-blue-dim: rgba(96,165,250,0.1);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .ap-root {
    min-height: 100dvh;
    background: var(--ap-bg);
    color: var(--ap-text);
    font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif;
    position: relative;
    overflow-x: hidden;
  }

  .ap-glow {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(80px);
    opacity: 0.35;
  }
  .ap-glow--purple { top: -120px; right: -80px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%); }
  .ap-glow--gold { bottom: -80px; left: -60px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(212,168,83,0.4), transparent 70%); }
  .ap-glow--green { top: 80px; right: -100px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(62,207,122,0.3), transparent 70%); }

  .ap-page { max-width: 420px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 1; }

  .ap-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 0 16px;
    position: sticky; top: 0;
    background: rgba(10,10,11,0.85);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    z-index: 10;
    border-bottom: 1px solid var(--ap-border);
    margin-bottom: 4px;
  }
  .ap-header-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: var(--ap-text); }
  .ap-brand { display: flex; align-items: center; gap: 10px; }
  .ap-logo {
    width: 32px; height: 32px; border-radius: 9px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    display: flex; align-items: center; justify-content: center;
    color: white; box-shadow: 0 4px 14px rgba(124,58,237,0.4);
  }
  .ap-logo--sm { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; }
  .ap-wordmark { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; color: var(--ap-text); }
  .ap-icon-btn {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--ap-surface); border: 1px solid var(--ap-border);
    color: var(--ap-text2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s, border-color 0.15s;
  }
  .ap-icon-btn:hover { background: var(--ap-surface2); border-color: var(--ap-border2); }

  .ap-header-install-btn {
    display: flex; align-items: center; gap: 6px;
    height: 34px; padding: 0 12px;
    background: var(--ap-gold); color: #0a0a0b;
    border: none; border-radius: 100px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.01em;
    cursor: pointer; font-family: inherit;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .ap-header-install-btn:hover { opacity: 0.88; }
  .ap-header-install-btn:active { transform: scale(0.96); }

  .ap-hero { padding: 28px 0 24px; text-align: left; }
  .ap-headline { font-size: 38px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 12px; color: var(--ap-text); }
  .ap-headline--gold { color: var(--ap-gold); }
  .ap-hero-sub { font-size: 14px; color: var(--ap-text2); line-height: 1.6; letter-spacing: 0.01em; }

  .ap-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 100px; font-size: 11px; font-weight: 500; letter-spacing: 0.02em; }
  .ap-pill--dim { background: var(--ap-surface2); border: 1px solid var(--ap-border); color: var(--ap-text2); }
  .ap-pill--green { background: var(--ap-green-dim); border: 1px solid rgba(62,207,122,0.25); color: var(--ap-green); }

  .ap-card { background: var(--ap-surface); border: 1px solid var(--ap-border); border-radius: 20px; padding: 20px; margin-bottom: 12px; }
  .ap-card--gold { background: linear-gradient(135deg, rgba(212,168,83,0.07), var(--ap-surface)); border-color: var(--ap-gold-border); }
  .ap-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ap-text3); margin-bottom: 16px; }

  .ap-scan-card {
    background: var(--ap-surface); border: 1px solid var(--ap-border);
    border-radius: 24px; padding: 24px; margin-bottom: 12px;
    position: relative; overflow: hidden;
  }
  .ap-scan-card::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 60%);
    pointer-events: none;
  }
  .ap-scan-visual { display: flex; justify-content: center; margin-bottom: 20px; }
  .ap-scan-frame { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; }
  .ap-scan-icon { color: rgba(139,92,246,0.7); }
  .ap-scan-corner { position: absolute; width: 16px; height: 16px; border-color: rgba(139,92,246,0.5); border-style: solid; }
  .ap-scan-corner--tl { top: 0; left: 0; border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
  .ap-scan-corner--tr { top: 0; right: 0; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
  .ap-scan-corner--bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
  .ap-scan-corner--br { bottom: 0; right: 0; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }
  .ap-scan-line {
    position: absolute; left: 4px; right: 4px; top: 50%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent);
    animation: scan-sweep 2s ease-in-out infinite;
  }
  @keyframes scan-sweep {
    0%, 100% { top: 12%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    50% { top: 88%; }
  }
  .ap-scan-copy { text-align: center; margin-bottom: 20px; }
  .ap-scan-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
  .ap-scan-sub { font-size: 13px; color: var(--ap-text2); }
  .ap-scan-actions { display: flex; gap: 10px; }

  .ap-btn-primary {
    flex: 1; height: 50px;
    background: var(--ap-gold); color: #0a0a0b;
    border: none; border-radius: 14px;
    font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity 0.15s, transform 0.1s; font-family: inherit;
  }
  .ap-btn-primary:hover { opacity: 0.92; }
  .ap-btn-primary:active { transform: scale(0.98); }
  .ap-btn-sm { height: 36px; padding: 0 16px; font-size: 13px; flex: none; }
  .ap-btn-icon-sq {
    width: 50px; height: 50px;
    background: var(--ap-surface2); border: 1px solid var(--ap-border);
    border-radius: 14px; color: var(--ap-text2);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s; flex-shrink: 0;
  }
  .ap-btn-icon-sq:hover { background: rgba(255,255,255,0.06); }
  .ap-btn-ghost {
    flex: 1; height: 48px;
    background: var(--ap-surface); border: 1px solid var(--ap-border);
    border-radius: 14px; color: var(--ap-text2);
    font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    font-family: inherit; transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .ap-btn-ghost:hover { background: var(--ap-surface2); color: var(--ap-text); border-color: var(--ap-border2); }
  .ap-btn-outline {
    width: 100%; height: 48px;
    background: transparent; border: 1px solid var(--ap-border); border-radius: 14px;
    color: var(--ap-text2); font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    font-family: inherit; transition: border-color 0.15s, color 0.15s;
  }
  .ap-btn-outline:hover { border-color: var(--ap-border2); color: var(--ap-text); }

  .ap-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .ap-quick-btn {
    background: var(--ap-surface); border: 1px solid var(--ap-border);
    border-radius: 20px; padding: 18px 16px;
    display: flex; flex-direction: column; gap: 12px;
    cursor: pointer; font-family: inherit; text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }
  .ap-quick-btn:hover { background: var(--ap-surface2); border-color: var(--ap-border2); }
  .ap-quick-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .ap-quick-icon--green { background: var(--ap-green-dim); color: var(--ap-green); border: 1px solid rgba(62,207,122,0.2); }
  .ap-quick-icon--blue { background: var(--ap-blue-dim); color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
  .ap-quick-label { font-size: 13px; font-weight: 600; color: var(--ap-text); margin-bottom: 3px; }
  .ap-quick-code { font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--ap-text3); }

  .ap-install-strip {
    display: flex; align-items: stretch; gap: 0;
    background: linear-gradient(135deg, rgba(212,168,83,0.08), rgba(212,168,83,0.04));
    border: 1px solid var(--ap-gold-border);
    border-radius: 18px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .ap-install-strip-body {
    flex: 1; display: flex; align-items: center; gap: 12px;
    padding: 14px 4px 14px 14px;
    background: transparent; border: none; cursor: pointer; font-family: inherit;
    transition: background 0.15s;
  }
  .ap-install-strip-body:hover { background: rgba(212,168,83,0.05); }
  .ap-install-strip-dismiss {
    width: 44px; display: flex; align-items: center; justify-content: center;
    background: transparent; border: none; border-left: 1px solid var(--ap-gold-border);
    color: var(--ap-text3); cursor: pointer;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .ap-install-strip-dismiss:hover { background: rgba(212,168,83,0.06); color: var(--ap-text2); }
  .ap-install-strip-icon {
    width: 38px; height: 38px; border-radius: 11px;
    background: var(--ap-gold); color: #0a0a0b;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ap-install-strip-title { font-size: 13px; font-weight: 700; color: var(--ap-text); margin-bottom: 3px; }
  .ap-install-strip-sub { font-size: 11px; color: var(--ap-text2); line-height: 1.4; }

  .ap-step { display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; }
  .ap-step:first-of-type { padding-top: 0; }
  .ap-step-num { font-size: 11px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace; min-width: 22px; padding-top: 1px; }
  .ap-step-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; color: var(--ap-text); }
  .ap-step-sub { font-size: 12px; color: var(--ap-text2); line-height: 1.5; }

  .ap-faq-btn {
    width: 100%; background: var(--ap-surface); border: 1px solid var(--ap-border);
    border-radius: 16px; padding: 16px 18px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; color: var(--ap-text);
    margin-bottom: 12px; transition: background 0.15s;
  }
  .ap-faq-btn:hover { background: var(--ap-surface2); }

  .ap-warn {
    background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.15);
    border-radius: 14px; padding: 12px 16px;
    display: flex; gap: 10px; align-items: flex-start; margin-bottom: 20px;
  }
  .ap-warn p { font-size: 12px; color: rgba(245,158,11,0.7); line-height: 1.5; }

  .ap-badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 8px; }

  .ap-footer { text-align: center; padding: 20px 0 28px; font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--ap-text3); letter-spacing: 0.04em; }

  .ap-row-2 { display: flex; gap: 10px; margin-bottom: 10px; }

  .ap-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ap-border); }
  .ap-detail-content { flex: 1; min-width: 0; }
  .ap-detail-key { display: block; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ap-text3); margin-bottom: 4px; font-family: 'SF Mono', 'Fira Code', monospace; }
  .ap-detail-val { display: block; font-size: 14px; font-weight: 500; color: var(--ap-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ap-mono { font-family: 'SF Mono', 'Fira Code', monospace; }
  .ap-amount { display: block; font-size: 28px; font-weight: 800; color: var(--ap-gold); letter-spacing: -0.03em; }
  .ap-copy-btn { width: 36px; height: 36px; border-radius: 10px; background: var(--ap-surface2); border: 1px solid var(--ap-border); color: var(--ap-text2); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
  .ap-copy-btn:hover { border-color: var(--ap-border2); }
  .ap-copy-btn--copied { background: rgba(62,207,122,0.1); border-color: rgba(62,207,122,0.3); color: var(--ap-green); }

  .ap-success-hero { text-align: center; padding: 32px 0 8px; }
  .ap-success-ring {
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(62,207,122,0.08); border: 1px solid rgba(62,207,122,0.2);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px; animation: ring-pulse 2.5s ease-in-out infinite;
  }
  .ap-success-icon { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #16a34a, var(--ap-green)); display: flex; align-items: center; justify-content: center; color: white; }
  @keyframes ring-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(62,207,122,0.2); }
    50% { box-shadow: 0 0 0 10px rgba(62,207,122,0); }
  }
  .ap-success-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
  .ap-success-sub { font-size: 14px; color: var(--ap-text2); }
  .ap-ussd-hint { font-size: 12px; color: var(--ap-text3); text-align: center; margin-top: 12px; line-height: 1.6; }

  .ap-modal-backdrop {
    position: fixed; inset: 0; z-index: 60;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: flex-end; justify-content: center;
    padding: 0 12px 0;
    animation: fade-in 0.2s ease;
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  .ap-modal {
    width: 100%; max-width: 420px;
    background: #1c1c1e;
    border: 1px solid var(--ap-border2);
    border-radius: 24px 24px 0 0;
    padding: 24px 20px 40px;
    animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .ap-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ap-modal-title { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
  .ap-modal-sub { font-size: 13px; color: var(--ap-text2); line-height: 1.5; margin-bottom: 24px; }
  .ap-modal-steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
  .ap-modal-step { display: flex; gap: 14px; align-items: flex-start; }
  .ap-modal-step-num {
    width: 26px; height: 26px; border-radius: 50%;
    background: var(--ap-gold); color: #0a0a0b;
    font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ap-modal-step-text { font-size: 14px; color: var(--ap-text); line-height: 1.5; padding-top: 3px; }
  .ap-modal-step-text strong { color: var(--ap-text); font-weight: 700; }
  .ap-modal-icon-inline {
    display: inline-flex; align-items: center; vertical-align: middle;
    margin: 0 3px; color: var(--ap-gold);
  }
  .ap-modal-arrow-hint {
    text-align: center; font-size: 12px; color: var(--ap-text3);
    border-top: 1px solid var(--ap-border); padding-top: 16px;
    letter-spacing: 0.01em;
  }

  .ap-modal--center {
    border-radius: 24px;
    margin: auto;
    align-self: center;
  }
  .ap-modal-browser-note {
    font-size: 12px; color: var(--ap-text3); line-height: 1.5;
    border-top: 1px solid var(--ap-border); padding-top: 16px;
    text-align: center;
  }
  .ap-modal-browser-note strong { color: var(--ap-text2); font-weight: 600; }

  @keyframes rise {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
`