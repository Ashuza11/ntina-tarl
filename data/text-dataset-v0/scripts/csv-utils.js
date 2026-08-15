import fs from "node:fs"

// Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas,
// embedded quotes ("" escaping), and embedded newlines inside quotes.
// Strips a leading UTF-8 BOM. Good enough for the well-formed spreadsheet
// exports this project produces -- not a general-purpose CSV library.
export function parseCsv(text) {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (inQuotes) {
      if (c === '"') {
        if (body[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && body[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""))
}

function csvEscape(value) {
  const s = value == null ? "" : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// `leadingNotes` (optional): human-readable note rows written before the
// header, one full-width row per note (note text in the first column,
// blanks elsewhere) -- the same convention the data/ SAMPLE files used for
// "Illustrative only" banners. Purely for a human reader; a file written
// this way should not be re-parsed as CSV data by another script, since
// readCsvObjects would treat the first note row as the header.
export function writeCsv(path, header, rows, { leadingNotes = [] } = {}) {
  const lines = []
  for (const note of leadingNotes) {
    lines.push([note, ...Array(header.length - 1).fill("")].map(csvEscape).join(","))
  }
  lines.push(header.map(csvEscape).join(","))
  for (const row of rows) {
    lines.push(header.map((col) => csvEscape(row[col])).join(","))
  }
  fs.writeFileSync(path, "﻿" + lines.join("\r\n") + "\r\n", "utf8")
}

export function readCsvObjects(path) {
  const text = fs.readFileSync(path, "utf8")
  const rows = parseCsv(text)
  if (rows.length === 0) return { header: [], records: [] }
  const [header, ...rest] = rows
  const records = rest.map((r) => {
    const obj = {}
    header.forEach((col, i) => {
      obj[col] = r[i] ?? ""
    })
    return obj
  })
  return { header, records }
}
