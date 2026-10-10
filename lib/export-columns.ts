/**
 * Spreadsheet exports build their rows with English column names - code reads and sorts
 * rows by them - and this renames the columns into the reader's language just before
 * the sheet is written. Each column is looked up as `exportColumn.<English name>`; one
 * without a translation keeps its English name.
 */
export function localizeColumns(rows: Record<string, unknown>[], t: (key: string) => string) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([column, value]) => {
        const key = `exportColumn.${column}`
        const label = t(key)
        return [label === key ? column : label, value]
      })
    )
  )
}
