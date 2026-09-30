import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CreditCard, Wallet } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import { myRentals } from '../../services/rentalService'
import { errMsg } from '../../services/api'
import { formatRange, money, num } from '../../utils/dateUtils'

export default function Payment() {
  const { id } = useParams()
  const [rental, setRental] = useState(null)
  const [error, setError] = useState('')
  const [method, setMethod] = useState('visa')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setRental(null)
    setError('')
    setNotice('')
    myRentals().then((rentals) => {
      if (!active) return
      const booking = rentals.find((r) => String(r.id) === id)
      if (!booking) setError('This rental could not be found.')
      else if (booking.status !== 'approved') setError('Payment is available only for approved rentals.')
      else setRental(booking)
    }).catch((e) => { if (active) setError(errMsg(e)) })
    return () => { active = false }
  }, [id])

  return (
    <div className="customer-ui payment-page">
      <Link className="payment-back" to="/customer/rentals"><ArrowLeft size={16} /> Back to rentals</Link>
      <div className="page-head"><div><div className="sub">Your booking</div><h1>Complete your payment</h1><p className="muted" style={{ marginTop: 8 }}>Review your rental and choose how you’d like to pay.</p></div></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {!rental && !error && <div className="spinner" aria-label="Loading booking" />}
      {rental && <div className="payment-layout">
        <section className="card payment-methods">
          <h2>Payment method</h2>
          <p className="muted small">Choose your preferred payment option.</p>
          <fieldset className="payment-options">
            <legend className="sr-only">Payment method</legend>
            <label className={`payment-option ${method === 'visa' ? 'selected' : ''}`}>
              <input type="radio" name="payment-method" value="visa" checked={method === 'visa'} onChange={() => { setMethod('visa'); setNotice('') }} />
              <CreditCard size={24} /><span className="payment-option-label"><b>Visa</b><span className="muted small">Credit or debit card</span></span><span className="visa-wordmark" aria-hidden="true">VISA</span>
            </label>
            <label className={`payment-option ${method === 'google' ? 'selected' : ''}`}>
              <input type="radio" name="payment-method" value="google" checked={method === 'google'} onChange={() => { setMethod('google'); setNotice('') }} />
              <Wallet size={24} /><span className="payment-option-label"><b>Google Pay</b><span className="muted small">Pay with your Google wallet</span></span><span className="google-pay-wordmark" aria-hidden="true">G Pay</span>
            </label>
          </fieldset>
          <button type="button" className={`btn payment-submit ${method === 'google' ? 'google' : ''}`} onClick={() => setNotice('Online payments are not available yet. No payment has been taken. Please contact the warehouse owner to arrange payment.')}>
            {method === 'google' ? 'Pay with Google Pay' : 'Pay with Visa'}<ArrowRight size={18} />
          </button>
          <p className="muted small payment-note">Online payment processing is not yet available.</p>
          {notice && <div className="alert" role="status">{notice}</div>}
        </section>
        <aside className="card payment-summary">
          <div className="row spread"><h2>Rental summary</h2><StatusBadge status={rental.status} /></div>
          <div><p className="muted small">BK-{rental.id}</p><h3>{rental.space_name}</h3><p className="muted small">{rental.space_location}</p></div>
          <dl className="payment-breakdown"><dt>Rental dates</dt><dd>{formatRange(rental.start_date, rental.end_date)}</dd><dt>Capacity</dt><dd>{num(rental.requested_capacity)} {rental.unit}</dd><dt>Duration</dt><dd>{rental.days} days</dd></dl>
          <div className="payment-total"><span>Total amount</span><strong>{money(rental.total_price)}</strong></div>
        </aside>
      </div>}
    </div>
  )
}
