import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

function Tip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <b>{label}</b>
      <div>{format ? format(payload[0].value) : payload[0].value}</div>
    </div>
  )
}

/**
 * Bar chart in the same style as the Figma design: all bars faded, the latest one solid.
 * type="line" draws a line instead.
 */
export default function ReportChart({ data, xKey, yKey, type = 'bar', height = 230, format, highlight = 'last' }) {
  if (!data?.length) return <div className="empty">No data for this period yet.</div>
  const lastIdx = data.length - 1
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} />
            <YAxis tickLine={false} tickFormatter={format} width={64} />
            <Tooltip content={<Tip format={format} />} cursor={{ stroke: 'rgba(255,242,0,.4)' }} />
            <Line type="monotone" dataKey={yKey} stroke="#FFF200" strokeWidth={2.5} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} />
            <YAxis tickLine={false} tickFormatter={format} width={64} />
            <Tooltip content={<Tip format={format} />} cursor={{ fill: 'rgba(255,242,0,.08)' }} />
            <Bar dataKey={yKey} radius={[3, 3, 0, 0]} maxBarSize={44}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={highlight === 'all' || (highlight === 'last' && i === lastIdx) ? '#FFF200' : 'rgba(255,242,0,.28)'}
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
