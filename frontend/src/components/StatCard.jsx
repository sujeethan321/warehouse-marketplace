export default function StatCard({ label, value, note, hot }) {
  return (
    <div className={`stat ${hot ? 'hot' : ''}`}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {note && <div className="n">{note}</div>}
    </div>
  )
}
