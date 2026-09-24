import { Boxes } from 'lucide-react'

// Left panel shared by Login and Register (mirrors the Figma split layout)
export default function AuthArt() {
  return (
    <section className="auth-art">
      <div className="brand">
        <div className="brand-mark"><Boxes size={18} strokeWidth={2.4} /></div>
        <div><b>StoreShare</b><span>Capacity marketplace</span></div>
      </div>
      <h1>Every empty bay is an opportunity.</h1>
      <p>Book verified storage capacity, or turn unused warehouse space into dependable revenue. Rent only the square footage you need, for the dates you need it.</p>
      <div className="tape" aria-hidden="true" />
      <div className="facts">
        <span>Overbooking blocked by the server</span>
        <span>Partial space, exact dates</span>
      </div>
    </section>
  )
}
