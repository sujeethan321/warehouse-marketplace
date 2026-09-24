import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import StatCard from '../../components/StatCard'
import { errMsg } from '../../services/api'
import { importCSV, TEMPLATE_ROWS } from '../../services/importService'
import { downloadCSV } from '../../utils/dateUtils'

const COLUMNS = [
  ['unique_code', 'Text, max 50. Must not already exist in the system or repeat in the file.'],
  ['name', 'Text, max 150.'],
  ['total_capacity', 'Number greater than 0.'],
  ['unit', 'Text, e.g. sq.ft or pallets.'],
  ['unit_price', 'Number greater than 0 (price per unit per day).'],
  ['location', 'Text, e.g. Jaffna.'],
  ['availability', "Either 'available' or 'unavailable'."],
]

export default function CSVImport() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  function pick(f) {
    setFile(f || null)
    setResult(null)
    setError('')
  }

  async function upload() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await importCSV(file))
    } catch (e) {
      setError(errMsg(e))
    }
    setBusy(false)
  }

  const steps = [
    ['Upload file', file ? file.name : 'Choose a .csv file', file ? 'done' : 'now'],
    ['Check columns and rows', 'Every row is validated. Bad rows are skipped, not the whole file.', result ? 'done' : file ? 'now' : ''],
    ['Import', result ? `${result.valid} of ${result.total} rows imported` : 'Valid rows are saved together', result ? 'done' : ''],
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="sub">Inventory setup</div>
          <h1>Import storage spaces</h1>
        </div>
        <button className="btn ghost" onClick={() => downloadCSV('storeshare-template.csv', TEMPLATE_ROWS)}>Download CSV template</button>
      </div>

      <div className="steps">
        {steps.map(([title, note, state], i) => (
          <div key={title} className={`step ${state}`}>
            <b>{i + 1}. {title}</b>
            <div className="muted small" style={{ marginTop: 3 }}>{note}</div>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 20 }}>
        <div className="card">
          <div
            className={`dropzone ${file ? 'has' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
          >
            <FileUp size={26} />
            <p style={{ margin: '8px 0 12px' }}>{file ? <b>{file.name}</b> : 'Drag a CSV file here, or choose one'}</p>
            <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} />
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn ghost" onClick={() => input.current.click()}>{file ? 'Choose another file' : 'Choose file'}</button>
              <button className="btn" disabled={!file || busy} onClick={upload}>{busy ? 'Importing...' : 'Import spaces'}</button>
            </div>
          </div>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        {result && (
          <>
            <div className="grid c3">
              <StatCard label="Rows in file" value={result.total} />
              <StatCard hot label="Imported" value={result.valid} note={result.valid ? 'Now listed in your spaces' : 'Nothing was imported'} />
              <StatCard label="Skipped" value={result.invalid} note={result.invalid ? 'See the reasons below' : 'No problems found'} />
            </div>
            {result.valid > 0 && <div className="alert ok">{result.valid} {result.valid === 1 ? 'space was' : 'spaces were'} added. <Link to="/owner/spaces">View my spaces</Link></div>}
            {result.errors.length > 0 && (
              <div className="card">
                <div className="card-head"><h2>Validation results</h2><span className="muted small">Fix these rows and upload them again</span></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th style={{ width: 90 }}>Row</th><th>Problem</th></tr></thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.row}><td className="num">{e.row}</td><td>{e.error}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="card">
          <div className="card-head"><h2>Required columns</h2><span className="muted small">Header must match exactly, in this order</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Column</th><th>Rule</th></tr></thead>
              <tbody>
                {COLUMNS.map(([c, rule]) => (
                  <tr key={c}><td className="num">{c}</td><td>{rule}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
