/** Jersey colours available when picking a team's identity. */
export const PALETTE: { name: string; hex: string }[] = [
  { name: 'Black',              hex: '#1B1B1D' },
  { name: 'Graphite',           hex: '#4B5058' },
  { name: 'Silver',             hex: '#C7CCD1' },
  { name: 'Grey Heather',       hex: '#9AA1A9' },
  { name: 'True Navy',          hex: '#1E2A55' },
  { name: 'True Royal',         hex: '#1E4FA3' },
  { name: 'True Royal Heather', hex: '#5B7FBF' },
  { name: 'Pond Blue',          hex: '#4E9AC0' },
  { name: 'Maroon',             hex: '#6E2130' },
  { name: 'Deep Red',           hex: '#8E1C29' },
  { name: 'True Red',           hex: '#C8202E' },
  { name: 'Neon Orange',        hex: '#FF5A1F' },
  { name: 'Neon Yellow',        hex: '#E4EC38' },
  { name: 'Neon Green',         hex: '#6BE548' },
]

export const paletteName = (hex?: string | null) =>
  PALETTE.find(p => p.hex.toLowerCase() === (hex ?? '').toLowerCase())?.name ?? null
