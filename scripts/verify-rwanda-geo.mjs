import { resolveLocation, calcDistance } from "../lib/rwanda-geo"
import { rwandaData } from "../lib/rwanda-data"

console.log("Gasabo/Kimironko:", resolveLocation("Gasabo", "Kimironko"))
console.log("Nyagatare/Mimuli (alias):", resolveLocation("Nyagatare", "Mimuli"))
console.log("X/Cyanika (unique cross-district):", resolveLocation("X", "Cyanika"))
console.log("Bugesera/Unknown sector:", resolveLocation("Bugesera", "Nope"))
console.log("nothing:", resolveLocation())
const m = resolveLocation("Musanze", "Muhoza")
const g = resolveLocation("Rubavu", "Gisenyi")
console.log("Muhoza->Gisenyi km:", calcDistance(m.lat, m.lng, g.lat, g.lng).toFixed(1))

// Every district/sector pair the pickers can produce must hit exact sector coords.
let misses = 0, pairs = 0
for (const [district, sectors] of Object.entries(rwandaData)) {
  for (const sector of sectors) {
    pairs++
    const hit = resolveLocation(district, sector)
    const exact = hit && JSON.stringify(hit) !== JSON.stringify(resolveLocation(district, null))
    if (!hit || !exact) {
      console.log(`NOT sector-exact: ${district}/${sector} ->`, hit)
      misses++
    }
  }
}
console.log(`Picker pairs: ${pairs}, not sector-exact: ${misses}`)

// Legacy names stored in old DB rows must still resolve somewhere reasonable.
const legacy = [
  ["Burera", "Rugendabari"], ["Nyagatare", "Mimuli"], ["Nyagatare", "Musheli"],
  ["Nyarugenge", "Mageragere"], ["Rwamagana", "Gishari"], ["Nyanza", "Rwdhuha"],
  ["Kirehe", "Nyamugali"], ["Gisagara", "Kibayi"],
]
for (const [d, s] of legacy) console.log(`legacy ${d}/${s}:`, resolveLocation(d, s))
