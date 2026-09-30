export const money = (value) => 'Rs ' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const moneyShort = (value) => 'Rs ' + Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

export function generateSpaceCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return 'WH-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}
