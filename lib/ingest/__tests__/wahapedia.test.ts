import { describe, it, expect } from 'vitest'
import { parseEnhancements } from '../wahapedia'

/**
 * Minimal HTML mirroring Wahapedia's faction-page enhancement section. Two
 * detachments, two cards in the first and one in the second, verifies that
 * cards are grouped by the most-recent `h2.outline_header`.
 */
const HTML = `
<html><body>
  <h2 class="outline_header">Daemonic Incursion</h2>
  <h2>Detachment Rule</h2>
  <h2>Enhancements</h2>
  <div><table><tbody><tbody><tr><td class="td_w">
    <ul class="EnhancementsPts"><li><span>The Everstave</span> <span>25 pts</span></li></ul>
    <p class="ShowFluff legend2">Flavour text.</p>
    <p><b>TZEENTCH</b> model only. Add 1 to Strength.</p>
  </td></tr></tbody></tbody></table></div>
  <div><table><tbody><tbody><tr><td class="td_w">
    <ul class="EnhancementsPts"><li><span>A'rgath</span> <span>20 pts</span></li></ul>
    <p class="ShowFluff legend2">More flavour.</p>
    <p>KHORNE only. Re-roll wounds.</p>
  </td></tr></tbody></tbody></table></div>

  <h2 class="outline_header">Scintillating Legion</h2>
  <h2>Enhancements</h2>
  <div><table><tbody><tbody><tr><td class="td_w">
    <ul class="EnhancementsPts"><li><span>Inescapable Eye</span> <span>10 pts</span></li></ul>
    <p class="ShowFluff legend2">Flavour.</p>
    <p>Bearer gains one extra Flux token.</p>
  </td></tr></tbody></tbody></table></div>
</body></html>
`

describe('parseEnhancements', () => {
  it('groups enhancement cards under the preceding outline_header', () => {
    const groups = parseEnhancements(HTML, 'Chaos Daemons')
    expect(groups).toHaveLength(2)
    expect(groups[0].name).toBe('Daemonic Incursion')
    expect(groups[0].enhancements.map(e => e.name)).toEqual(['The Everstave', "A'rgath"])
    expect(groups[1].name).toBe('Scintillating Legion')
    expect(groups[1].enhancements.map(e => e.name)).toEqual(['Inescapable Eye'])
  })

  it('extracts rules text from the non-fluff <p>, ignoring ShowFluff', () => {
    const [{ enhancements }] = parseEnhancements(HTML, 'Chaos Daemons')
    expect(enhancements[0].effect).toBe('TZEENTCH model only. Add 1 to Strength.')
    expect(enhancements[0].effect).not.toMatch(/flavour/i)
  })

  it('stamps the source on every enhancement', () => {
    const groups = parseEnhancements(HTML, 'Chaos Daemons')
    for (const g of groups) {
      for (const e of g.enhancements) expect(e.source).toBe('Chaos Daemons')
    }
  })
})
