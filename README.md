# PRICELY

### Explainable product price intelligence for smarter buying decisions.

PRICELY reads the product you're viewing, extracts available price evidence, builds a price reference, evaluates the current price, and turns those signals into a clear, explainable buying decision.

The central design principle is simple:

> **PRICELY reads the price. The decision engine explains what it means.**

PRICELY is a decision-support system, not a statistically validated price forecasting engine or guaranteed price optimizer.

---

## Problem

Online shopping provides a current price, but current price alone provides very little context.

A product may appear discounted against its MRP while still being close to its normal selling range. A price may look attractive without being near a meaningful low. Retailer pages also expose product and pricing information through different page structures, making consistent extraction difficult.

PRICELY brings product-page evidence, price-reference modelling, deal scoring, and buying decisions into one explainable pipeline.

---

## Solution

```text
Product page
      ↓
Product / price evidence extraction
      ↓
Structured product data
      ↓
Observed historical data OR estimated reference model
      ↓
Price position analysis
      ↓
Deal Signal
      ↓
Buying Decision
      ↓
Explainable recommendation
```

PRICELY does not treat every reference value as verified historical data.

When verified historical observations are unavailable, the system creates an **Estimated Reference** from available price anchors and conservative modelling assumptions.

---

## Key Design Decisions

### Evidence before confidence

PRICELY attempts to establish product and price evidence before generating an analysis.

Available evidence may include:

- Product identity
- Current selling price
- Currency
- MRP / listed price
- Discount information
- Product image
- Retailer
- Structured product data
- Product age / launch information when available
- Historical observations when available
- Genuine structured retailer offers when available

### Estimated is not observed

PRICELY distinguishes between:

```text
OBSERVED HISTORY
        OR
ESTIMATED REFERENCE
```

Estimated reference values are explicitly labelled and are not presented as verified historical observations.

### No fabricated competitor prices

Cross-retailer comparison is shown only when genuine comparable offers are detected.

If comparable offers are unavailable, PRICELY does not invent competitor prices.

### Deal Signal is explainable

The Deal Signal is based on explicit components rather than an unexplained score.

```text
Current price position       35%
Reference range              30%
Low-price proximity          20%
Recent movement              15%
```

The score is a decision-support signal.

> **The Deal Signal does not predict future prices.**

---

## Architecture

```text
                  Product Page
                       │
                       ▼
              Chrome Content Script
                       │
                       ▼
             Universal Price Extractor
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Product       Price         MRP
       Identity     Evidence      Evidence
          │            │            │
          └────────────┼────────────┘
                       ▼
              Estimation Engine
                       │
                       ▼
                Deal Score Engine
                       │
                       ▼
              Decision Engine
                       │
                       ▼
                 PRICELY UI
```

The extraction layer combines retailer-aware selectors with universal fallbacks.

The analysis layer separates evidence extraction from reference estimation, Deal Signal calculation, and the final buying decision.

---

## Product Detection

PRICELY attempts to identify:

- Product name
- Brand
- Retailer
- Product image
- Current selling price
- Currency
- MRP
- Discount
- Product variant
- Structured product information

The detector uses multiple evidence paths rather than relying on a single retailer-specific CSS selector.

```text
Retailer-specific extraction
          ↓
Structured product data
          ↓
Generic semantic selectors
          ↓
Visible-price fallback
          ↓
Controlled failure / retry
```

This approach is intended to remain useful when retailer page structures change.

---

## Price Intelligence

PRICELY preserves the distinction between:

```text
CURRENT PRICE
TYPICAL REFERENCE
LOWEST REFERENCE
HIGHEST REFERENCE
```

Where sufficient evidence is available, the current price is evaluated against the reference range.

Example:

```text
Current price
₹1,299

Typical reference
₹1,325

Lowest reference
₹1,193

Highest reference
₹1,499
```

The chart and summary metrics are generated from the same underlying history dataset so that displayed values remain consistent.

---

## Deal Signal

The Deal Signal converts multiple price-position indicators into a single explainable 0–100 signal.

### Components

| Component | Weight |
|---|---:|
| Current price position | 35% |
| Reference-range position | 30% |
| Low-price proximity | 20% |
| Recent movement | 15% |

The score is accompanied by human-readable reasons.

For example:

```text
53 / 100

Near typical price
Not at lowest reference level
Recent movement is moderate
```

The interactive information control explains the methodology and the role of each component.

The score is not presented as a probability, forecast, or guarantee of future price movement.

---

## Price History

PRICELY provides three analysis windows:

- **30D**
- **90D**
- **1Y**

Selecting a timeframe updates the displayed price history and corresponding summary values.

The visualization includes:

- Date-aware price points
- Current-price marker
- Typical reference
- Lowest reference
- Highest reference
- Timeframe controls

When historical observations are not available, the section is explicitly labelled:

> **ESTIMATED REFERENCE**

When verified historical observations are available:

> **OBSERVED HISTORY**

The system does not silently mix the two states.

---

## Estimated Reference Model

When verified historical data is unavailable, PRICELY estimates a reference range using available evidence such as:

- Current selling price
- MRP / price anchor
- Product age or launch information when available
- Market context
- Conservative price movement assumptions

The estimated model provides context rather than claiming to reconstruct the retailer's actual historical price series.

```text
Available evidence
       ↓
Price anchors
       ↓
Conservative reference model
       ↓
Typical / Low / High reference
       ↓
Deal Signal
```

Estimated values are clearly disclosed in the interface.

---

## Buying Decision

PRICELY converts the price analysis into one of three primary decisions:

```text
GOOD TIME TO BUY

FAIR PRICE

WAIT
```

Each decision is accompanied by a concise explanation.

For example:

```text
Fair price

Current price is close to the product's
normal reference range.
```

The purpose of the decision engine is to answer the practical question:

> **Should I buy this at the current price?**

The recommendation is based on the available price evidence and modelled reference signals. It is not a guarantee that the price will rise or fall.

---

## Cross-Retailer Intelligence

When genuine comparable offers are available, PRICELY can surface:

```text
BEST DETECTED PRICE
Retailer → Price
```

The comparison is based on detected page or structured offer evidence.

PRICELY does not manufacture competitor prices when comparable evidence is unavailable.

This keeps the comparison layer auditable and prevents false precision.

---

## Market Context

PRICELY translates price-position calculations into short contextual statements.

Examples:

```text
Current price is below the estimated typical reference.
```

```text
Current price is within the normal estimated range.
```

```text
Current price remains above the estimated low reference.
```

Where an MRP anchor is available, the interface may also communicate the relationship between the current price and listed MRP.

---

## Re-analysis

Prices on retailer pages can change dynamically.

PRICELY provides a **RE-ANALYZE** action that recalculates:

- Current price
- Deal Signal
- Reference range
- Price history
- Market context
- Buying decision

The analysis is based on the latest product-page evidence available at the time of re-analysis.

---

## Retry and Failure Handling

PRICELY does not treat extraction failure as a valid price signal.

If a reliable price cannot be identified, the extension provides a controlled failure state:

```text
Price not detected

PRICELY couldn't identify a reliable
selling price on this page.

RETRY ANALYSIS
```

The retry path attempts the available extraction strategies again before presenting the controlled error state.

---

## Dynamic Product / Page Handling

Modern retailer pages can change product content without a full browser navigation.

PRICELY therefore treats product identity and page state as part of the analysis context.

```text
Product A
   ↓
Product B
   ↓
Detect change
   ↓
Invalidate stale analysis
   ↓
Fresh extraction
```

This prevents an old result from being displayed for a newly selected product.

---

## Docked Extension Architecture

PRICELY uses a right-side in-page dock rather than an iframe-based floating popup.

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    Retailer page                       │
│                                                         │
│                                      ┌───────────────┐  │
│                                      │    PRICELY    │  │
│                                      │               │  │
│                                      │ Price Signal  │  │
│                                      │ Deal Signal   │  │
│                                      │ History       │  │
│                                      │ Decision      │  │
│                                      └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The dock is designed to:

- Attach to the right edge of the viewport
- Reserve page space where possible
- Avoid obscuring important purchase controls
- Support internal scrolling
- Support collapse/minimize
- Support close and reopen
- Adapt to smaller viewport widths

A collapsed rail provides a compact entry point when the full panel would consume too much screen space.

---

## UI / Product Design

PRICELY uses a restrained dark editorial interface designed around price intelligence rather than generic AI chat.

### Visual system

| Element | Value |
|---|---|
| Background | `#160F16` |
| Primary accent | `#C58AAE` |
| Active accent | `#D989AE / #E5A1BF` |
| Main text | `#F4EEE9` |
| Secondary text | `#B8A4AC` |
| Borders | `#36222F / #3A2735` |
| Positive state | Muted green |

### Typography

- Editorial serif for branding and headlines
- Monospace for analytical labels and reference values
- Clean sans-serif for explanatory body text

The design intentionally separates:

```text
BRAND
   ↓
PRICE EVIDENCE
   ↓
DEAL SIGNAL
   ↓
PRICE HISTORY
   ↓
BUYING DECISION
```

The extension panel targets a compact portrait format while allowing internal vertical scrolling for analytical content.

---

## Analysis Flow

The user experience follows three primary states:

### 01 — Landing

```text
PRICELY ✦
PRICE INTELLIGENCE

BUY WITH CONTEXT

Know the real value
before you buy.

[ ANALYZE THIS PAGE ↗ ]

01              02              03
Price signal    Deal score      Decision
```

### 02 — Scanning

```text
READING PRODUCT
Checking price evidence
Building price reference
Calculating deal signal
```

### 03 — Results

```text
Current Price
      ↓
Deal Signal
      ↓
Price History
      ↓
Reference Metrics
      ↓
Market Context
      ↓
Buying Decision
```

---

## Technology Stack

### Chrome Extension

- Chrome Manifest V3
- JavaScript
- HTML
- CSS
- Chrome Content Scripts
- Chrome Scripting API
- Chrome Storage API
- Service Worker

### Intelligence Layer

- Product extraction engine
- Estimation engine
- Deal Score engine
- Decision engine

### Visualization

- HTML/CSS
- SVG-based price history visualization

### Packaging

- Chrome unpacked-extension workflow
- ZIP distribution package

---

## Testing

The final extension has been manually validated across multiple retailer environments.

### Retailer validation

- Croma
- boAt
- Amazon
- Khadim
- Neeman's

### Validated functionality

- Product detection
- Retailer detection
- Current price extraction
- Currency handling
- Product image extraction
- MRP / price-anchor handling
- Analyze flow
- Scanning state
- Deal Signal
- Deal Signal explanation
- Price History
- 30D / 90D / 1Y controls
- Reference metrics
- Estimated Reference disclosure
- Buying decision
- Re-analysis
- Dock behaviour
- Internal scrolling
- Failure/retry handling

The final UI was also checked for the mentor-defined section hierarchy, spacing, typography, and right-side docking behaviour.

---

## Limitations

PRICELY intentionally does not claim more than the available evidence supports.

1. **Historical data availability varies** — Verified historical observations may not be available for every retailer or product.
2. **Estimated references are modelled** — They are not reconstructed verified price histories.
3. **Deal Signal is heuristic** — It is an explainable decision-support score, not a statistically validated probability.
4. **Retailer structures change** — Page markup and selectors can change without notice.
5. **Dynamic pages can restrict extraction** — Some sites load price information asynchronously or expose incomplete structured data.
6. **Cross-retailer comparison requires evidence** — Comparable offers are shown only when genuinely detected.
7. **No future-price prediction** — PRICELY does not claim to know whether a price will rise or fall.
8. **Product variants matter** — Size, colour, storage, model and other variants can affect price comparability.
9. **MRP is an anchor, not historical truth** — A listed MRP does not prove that the product previously sold at that price.
10. **Currency and final checkout cost can differ** — Shipping, taxes, regional pricing and other checkout adjustments may affect the final amount paid.

---

## Portfolio Positioning

PRICELY should be presented as:

> **An explainable product-price decision-support system that combines browser-based product extraction, price-reference modelling, transparent deal scoring, and deterministic buying decisions.**

It should **not** be presented as:

- A guaranteed price predictor
- A statistically validated price forecasting engine
- An autonomous shopping agent
- A replacement for retailer pricing systems
- Proof of future price movement
- A source of verified historical data when only estimates are available

The interesting part of PRICELY is not simply showing a price.

The interesting part is the boundary between:

```text
Product page
      ↓
Price evidence
      ↓
Reference modelling
      ↓
Explainable Deal Signal
      ↓
Buying Decision
```

---

## Repository Structure

```text
PricelyExt-Chrome/
│
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── src/
│   ├── background/
│   │   └── service-worker.js
│   │
│   ├── content/
│   │   └── content.js
│   │
│   ├── core/
│   │   ├── deal-score.js
│   │   ├── decision-engine.js
│   │   └── estimation-engine.js
│   │
│   └── popup/
│       ├── popup.css
│       ├── popup.html
│       └── popup.js
│
├── tests/
├── manifest.json
├── README.md
└── ...
```

---

## Local Development

### Chrome Extension

Open:

```text
chrome://extensions
```

Enable **Developer mode**.

Select:

```text
Load unpacked
```

Choose the PRICELY project directory containing:

```text
manifest.json
```

Then open a supported product page and launch PRICELY.

### Analysis workflow

```text
Open product page
      ↓
Launch PRICELY
      ↓
Analyze This Page
      ↓
Scanning
      ↓
Results
```

For local development, changes to extension files can be tested by reloading the unpacked extension from `chrome://extensions`.

---

## Environment and Privacy

PRICELY's core price extraction and decision logic are designed to operate within the extension.

The extension reads product information from the page being analyzed.

The basic Chrome-extension workflow does not require an account.

No sensitive user information is required for the price-analysis flow.

---

## Production Deployment

The deployment layer is intended to follow:

```text
GitHub
   │
   ▼
Render / Hosted Service
   │
   ▼
PRICELY Service Layer
   │
   ▼
Chrome Extension
```

The Chrome extension remains the primary user-facing product.

Where a hosted service is introduced, production configuration should keep service credentials server-side and expose only the endpoints required by the extension.

Deployment status should be updated here only after the corresponding GitHub and hosted services have been verified as live.

---

## Project Status

**Final Chrome extension build completed.**

| Component | Status |
|---|---|
| Chrome Extension | ✓ Implemented |
| Product Extraction | ✓ Implemented |
| Retailer Detection | ✓ Implemented |
| Current Price Detection | ✓ Implemented |
| Deal Signal | ✓ Implemented |
| Explainable Scoring | ✓ Implemented |
| Price History | ✓ Implemented |
| Estimated Reference | ✓ Implemented |
| Buying Decision | ✓ Implemented |
| Re-analysis | ✓ Implemented |
| Dynamic Page Handling | ✓ Implemented |
| Retry Handling | ✓ Implemented |
| Docked UI | ✓ Implemented |
| Collapsed Rail | ✓ Implemented |
| Retailer Validation | ✓ Verified |
| Final Chrome Package | ✓ `PricelyExt-Chrome.zip` |
| GitHub | Pending |
| Render | Pending |

---

## Why This Project Matters

PRICELY demonstrates a practical decision-support pattern for combining browser context with explainable financial reasoning.

> **A price becomes useful when it is given context.**

Instead of showing users another isolated price, PRICELY combines:

```text
CURRENT PRICE
      +
REFERENCE RANGE
      +
DEAL SIGNAL
      +
PRICE HISTORY
      +
EXPLANATION
      ↓
BUYING DECISION
```

The system is designed to make the reasoning visible rather than hiding it behind an unexplained score.

That makes PRICELY:

- Easier to understand
- Easier to demonstrate
- Easier to audit
- Easier to explain in an interview
- More transparent about uncertainty
- More useful than a simple price display

---

## Author

**Harshitha**

MBA Finance | Information Technology

**Interests:**

- Financial Modeling
- FinTech
- AI-assisted Decision Support
- Business Analytics
- Data-driven Finance
- Technology + Finance
