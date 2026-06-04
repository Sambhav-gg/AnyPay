import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, HelpCircle, Smartphone, CreditCard, Download, Share2, ExternalLink, Play } from 'lucide-react'

interface FAQPageProps {
  isOpen: boolean
  onClose: () => void
}

const faqItems = [
  { q: 'What is AnyPay and how does it work?', a: 'AnyPay is an offline UPI payment app that lets you scan QR codes and make payments using USSD codes (*99#). It works without internet by extracting UPI IDs from QR codes and helping you use your phone\'s USSD feature to complete payments.' },
  { q: 'How do I scan a QR code?', a: 'Tap "Scan QR" on the main screen. Allow camera access when prompted. Point your camera at the UPI QR code. The app will automatically detect and extract the UPI ID. You can also upload a QR code image.' },
  { q: 'What are USSD codes and how do they work?', a: 'USSD codes are special phone codes that work without internet. *99*1*3# is for sending money, and *99*3# is for checking balance. These codes connect you to your bank\'s USSD service.' },
  { q: 'How do I send money after scanning?', a: 'After scanning, the UPI ID is automatically copied to your clipboard. Tap "Send Money" to dial *99*1*3#. Follow the voice prompts, paste the UPI ID when asked, enter the amount, and confirm with your mobile banking PIN.' },
  { q: 'Can I use this without internet?', a: 'Yes! AnyPay works completely offline. QR scanning, UPI ID extraction, and USSD dialing all work without internet. You only need network coverage for the USSD call to your bank.' },
  { q: 'Which banks support USSD payments?', a: 'Most major Indian banks support *99# USSD including SBI, HDFC, ICICI, Axis, PNB, BOB, Canara Bank, and many others.' },
  { q: 'Is my data safe?', a: 'Yes! AnyPay doesn\'t store any personal or financial data. It only extracts UPI IDs from QR codes and helps you dial USSD codes. All transactions happen directly with your bank.' },
  { q: 'What if the QR code doesn\'t scan?', a: 'Try: 1) Ensure good lighting, 2) Hold the phone steady, 3) Clean your camera lens, 4) Try uploading the QR code image instead.' },
  { q: 'What if I have a Jio SIM?', a: 'Unfortunately AnyPay doesn\'t work on Jio SIM cards. The USSD technology (*99#) is not supported on Jio\'s network. Use Airtel, Vi, or BSNL for USSD payments.' },
  { q: 'Can I use this on vending machine QR codes?', a: '⚠️ We recommend avoiding computerized QR codes from vending machines. AnyPay is best for person-to-person or merchant payments.' },
]

export function FAQPage({ isOpen, onClose }: FAQPageProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (!isOpen) return null

  return (
    <div className="overlay" style={{ overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 }}>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <HelpCircle size={18} color="var(--accent2)" />
        <span style={{ fontWeight: 700, fontSize: 17 }}>Help & FAQ</span>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Install */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Download size={15} color="var(--accent2)" />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)' }}>Install AnyPay</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: <Smartphone size={14} />, title: 'Android / Chrome', steps: ['Tap ⋮ menu (top right) in Chrome', 'Tap "Install app" or "Add to Home screen"', 'Tap Install'] },
              { icon: <Share2 size={14} />, title: 'iPhone / iPad (Safari)', steps: ['Tap the Share button at the bottom', 'Scroll and tap "Add to Home Screen"', 'Tap Add'] },
            ].map((platform, i) => (
              <div key={i} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, color: 'var(--text2)' }}>
                  {platform.icon}
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{platform.title}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {platform.steps.map((step, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600, minWidth: 16 }}>{j + 1}.</span>
                      <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tutorial */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Play size={15} color="var(--accent2)" />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)' }}>Setup Tutorial</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16/9' }}>
              <iframe
                width="100%" height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="AnyPay Setup Tutorial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen style={{ display: 'block' }}
              />
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Complete AnyPay Setup Guide</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Walkthrough of setting up AnyPay and enabling USSD payments</p>
            </div>
          </div>
        </section>

        {/* Quick start */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Smartphone size={15} color="var(--accent2)" />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)' }}>Quick Start</span>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            {[
              { n: '1', title: 'Scan QR Code', sub: "Tap 'Scan QR' and point camera at UPI QR code" },
              { n: '2', title: 'UPI ID Extracted', sub: 'App automatically copies UPI ID to clipboard' },
              { n: '3', title: 'Tap Send Money', sub: 'Dials *99*1*3# automatically' },
              { n: '4', title: 'Complete Payment', sub: 'Follow USSD prompts, paste UPI ID, enter amount & PIN' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 20 : 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #8b55ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{step.n}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* USSD Codes */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CreditCard size={15} color="var(--accent2)" />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)' }}>USSD Reference</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Send Money', sub: 'Transfer to any UPI ID', code: '*99*1*3#' },
              { label: 'Check Balance', sub: 'View account balance', code: '*99*3#' },
            ].map((item, i) => (
              <div key={i} className="card detail-row" style={{ borderRadius: 14 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{item.sub}</p>
                </div>
                <span className="mono chip chip-accent">{item.code}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <HelpCircle size={15} color="var(--accent2)" />
            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text2)' }}>FAQ</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {faqItems.map((item, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden', borderRadius: 14 }}>
                <button
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', gap: 12, textAlign: 'left' }}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.5 }}>{item.q}</span>
                  {expanded === i ? <ChevronDown size={16} color="var(--text3)" style={{ flexShrink: 0 }} /> : <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0 }} />}
                </button>
                {expanded === i && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* BHIM link */}
        <div className="card" style={{ padding: '20px', textAlign: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
            For official BHIM USSD setup instructions, visit the BHIM website.
          </p>
          <button
            className="btn btn-ghost"
            style={{ width: '100%' }}
            onClick={() => window.open('https://www.bhimupi.org.in/steps-to-use-99', '_blank')}
          >
            <ExternalLink size={15} />
            BHIM *99# Setup Guide
          </button>
        </div>

      </div>
    </div>
  )
}
