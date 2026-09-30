import { generateSpaceCode } from './ownerUtils.js'

// Preserve quoted commas, newlines and escaped quotes when adding codes.
export function prepareOwnerCSV(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (ch === ',' || ch === '\n' || ch === '\r')) {
      row.push(field)
      field = ''
      if (ch !== ',') {
        rows.push(row)
        row = []
        if (ch === '\r' && source[i + 1] === '\n') i++
      }
    } else field += ch
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.')
  if (field || row.length) rows.push([...row, field])
  const header = rows.shift()?.map((cell) => cell.trim())
  if (!header?.length) throw new Error('The CSV file is empty.')
  const expected = ['name', 'total_capacity', 'unit', 'unit_price', 'location', 'availability']
  const hasCode = header[0] === 'unique_code'
  const columns = hasCode ? header.slice(1) : header
  if (columns.join(',') !== expected.join(',')) {
    throw new Error('CSV columns must match the template, with an optional unique_code column first.')
  }
  const output = [['unique_code', ...expected]]
  for (const values of rows) {
    if (values.every((value) => !value.trim())) continue
    if (values.length !== header.length) throw new Error('A CSV row has an unexpected number of columns.')
    if (!hasCode) values.unshift(generateSpaceCode())
    else if (!values[0].trim()) values[0] = generateSpaceCode()
    output.push(values)
  }
  return output.map((values) => values.map((value) => '"' + value.replace(/"/g, '""') + '"').join(',')).join('\r\n')
}
