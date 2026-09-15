# PRICELY v1.1.0 final QA checklist

## Identity / UI
- [ ] PRICELY — Price Intelligence
- [ ] Version 1.1.0
- [ ] Final description matches manifest
- [ ] Option 5-inspired P + price tag + spark icon
- [ ] 400 x 600 portrait panel
- [ ] Internal vertical scrolling
- [ ] Premium dark plum / mauve editorial visual system
- [ ] Landing is always first normal state

## Flow
- [ ] Toolbar click opens right-side dock
- [ ] Landing → Scanning → Results
- [ ] Close removes dock and restores page spacing
- [ ] Minimize collapses to a small PRICELY tab
- [ ] Reopen restores full dock
- [ ] Back returns to landing
- [ ] Re-analyze recalculates result
- [ ] Page/product change invalidates old result

## Detection
- [ ] Amazon
- [ ] Flipkart
- [ ] Bata
- [ ] Myntra
- [ ] boAt
- [ ] AJIO
- [ ] Neeman's
- [ ] Croma
- [ ] Structured data fallback
- [ ] Visible price fallback
- [ ] Native currency
- [ ] Product image
- [ ] MRP when exposed
- [ ] Release/launch date when exposed
- [ ] No-price retry state

## Intelligence
- [ ] Current price is the actual detected selling price
- [ ] Deal Signal is calculated from named weighted factors
- [ ] Deal Signal info button opens explanation
- [ ] Score reasons match current context
- [ ] 30D / 90D / 1Y controls regenerate the chart
- [ ] Chart dates are dynamic
- [ ] Chart min/max/current match metric values
- [ ] Estimated history is explicitly labelled
- [ ] No fake verified history claims
- [ ] Buying decision is Good time to buy / Fair price / Wait
- [ ] Data source info is interactive
- [ ] Cross-retailer offers only appear when genuinely detected
- [ ] View on retailer opens the product URL

## Dock usability
- [ ] Panel does not cover gallery/buy area on normal layouts
- [ ] Page reserves right-side space while dock is open
- [ ] Scroll works independently inside PRICELY
- [ ] Critical controls remain reachable
