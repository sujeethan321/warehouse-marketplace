// Statuses are told apart by shape (solid / dashed / struck-through), not by extra colours.
const MAP = {
  approved: { cls: 'solid', label: 'Approved' },
  pending: { cls: 'dashed', label: 'Pending review' },
  rejected: { cls: 'strike', label: 'Rejected' },
  cancelled: { cls: 'dim', label: 'Cancelled' },
  available: { cls: 'solid', label: 'Available' },
  unavailable: { cls: 'dashed', label: 'Unavailable' },
}

export default function StatusBadge({ status }) {
  const m = MAP[status] || { cls: 'dim', label: status }
  return <span className={`badge ${m.cls}`}>{m.label}</span>
}
