# Employee Production Output – App Plan

## 1. Core features (Phase 1 – Must have)

### 1.1 Employee production tracking
- **Input:** Date, Employee name, Shift, Machine, Program No., Cycle time (sec), Hours worked (nominal, e.g. 12).
- **Derived:**
  - **Actual hours** = Hours worked × (11/12) → 12 hr → 11 actual.
  - **Pieces per hour** = 3600 ÷ Cycle time (sec).
  - **Actual PDN** (theoretical production) = (3600 ÷ Cycle time) × Actual hours.
- **Also store/capture:** PDN Req (target if different), **Producted Qty** (actual pieces produced), **Notes** (e.g. power cut).

### 1.2 Shortage vs actual
- **Short** = How short we are from target:
  - **Short** = PDN Req − Producted Qty (or Actual PDN − Producted Qty, depending on which “target” you use).
- Show per row and **totals by employee / date / shift / machine** so you can see where we are short.

### 1.3 Basic UX
- Add / edit / delete production entries.
- List view with filters: date range, employee, shift, machine.
- Excel import (upload your current sheet and map columns).
- Simple dashboard: today’s production, shortage summary, top short areas.

---

## 2. Suggested features to improve production (Phase 2)

| Feature | What it does | Why it helps |
|--------|----------------|--------------|
| **Daily / shift summary** | Per employee, per shift: total Actual PDN vs Producted Qty, total Short. | Quick view of who met target and where we fell short. |
| **Machine utilization** | Hours run per machine, output per machine, downtime/notes. | See which machines are underused or often down. |
| **Employee performance view** | Per employee: average shortage, consistency over days. | Identify training needs or process issues. |
| **Target vs actual trends** | Charts over time: required vs produced, shortage trend. | Spot improving or worsening lines/shifts. |
| **Alerts / highlights** | Flag when Short > X or when Actual hours drop (e.g. absenteeism). | Act on problems quickly. |
| **Program-wise view** | Per Program No.: total ordered vs produced, shortage. | Align production with what’s needed per program. |
| **Export** | Export filtered data to Excel/CSV (same format as your sheet). | Use in meetings and for records. |
| **Running total (Total PDN)** | Optional: maintain cumulative produced per employee/date/program like your Excel. | Match current Excel behaviour. |

---

## 3. Future modules (Phase 3+)

### 3.1 Raw material → pieces (production potential)
- **Input:** Raw material type, quantity (weight/length/pieces), and **conversion rule** (e.g. 1 kg → X pieces).
- **Output:**
  - **Theoretical pieces** = Raw material qty × conversion (how many pieces *can* be produced).
  - **Actual pieces** = What was actually produced (from current production entries or manual).
  - **Gap** = Theoretical − Actual (waste / process loss).
- Helps answer: “With this much raw material, how much *could* we make vs how much we *did* make?”

### 3.2 Orders vs dispatch vs pending (client orders)
- **Input:** Client, order ref, order date, **ordered quantity** (what client asked for).
- **Track:** **Dispatched quantity**, **Pending quantity** = Ordered − Dispatched.
- Optional: link orders to **Program No.** or product, and link production (Producted Qty) to “fulfilling” orders.
- Answers: “How much was ordered, how much sent, how much is still pending?”

---

## 4. Tech stack (same as discussed)

- **Backend:** Node.js + Express.
- **Database:** SQLite (runs on Windows and Mac, no separate server).
- **Frontend:** Angular (SPA).
- **Excel:** Import/export using a library (e.g. xlsx/SheetJS).

---

## 5. Summary

| Phase | Focus |
|-------|--------|
| **Phase 1** | Employee production (actual hours, Actual PDN, Producted Qty, Short), list/add/edit, filters, Excel import, basic dashboard. |
| **Phase 2** | Summaries, machine/employee views, trends, alerts, program-wise view, export. |
| **Phase 3** | Raw material → theoretical vs actual pieces; Orders → dispatched vs pending. |

If you confirm this plan, next step is to implement **Phase 1** (backend + Angular app) with the formulas you confirmed: 12 hr → 11 actual, Actual PDN = (3600 ÷ cycle time) × actual hours, Short = target − producted qty.
