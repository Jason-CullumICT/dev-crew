# ABAC SOC Demo v3 — Schedules as First-Class Entity

**Date:** 2026-04-09
**Approved option:** C — Timeline (24-hour Gantt)
**New port:** 4305 (runs alongside existing v2 at 4304)

---

## Approved Design

### Navigation

Horizontal top bar replacing the left sidebar. Tabs:
`Dashboard | Schedules | Groups | Policies | Permissions | People | Infrastructure`

Live clock pill (right side): `● Wed 14:32 AEST` with pulsing green dot.

### Schedules Page — Timeline View

**Layout:** Left sidebar (220px) + main timeline area

**Sidebar:** List of all named schedules. Each item has:
- Colour bar (10px wide, colour-coded per schedule)
- Schedule name + time range (monospace)
- Live dot: green pulse = active now, amber = expiring soon, gray = inactive
- Selected item: `border-left: 2px solid #60a5fa` + `background: #0f1a2e`
- "+ New Schedule" button at bottom

**Timeline:**
- Hour ruler: 00–23, sticky at top, current hour in blue (`#60a5fa`)
- Blue "now" vertical line at current hour position
- Rows grouped into two sections with divider labels:
  1. **Schedules (time windows)** — one row per named schedule, colour bands showing active window(s)
  2. **Groups (when members auto-enrol)** — derived rows showing groups linked to a schedule, labelled "via [Schedule Name]"
- Bands: semi-transparent fill + border in schedule colour, text label inside
- Night-spanning schedules (e.g. 20:00–06:00) split into two bands: right half + left half

**Footer (sticky):**
- Left: "Now: [datetime] — Currently active" with green/cyan chips for active schedules, gray chips for inactive with start time
- Right: "Jump to:" buttons → Today 00:00 / Tomorrow / Weekend

### Schedule Colour Palette

| Schedule | Colour |
|---|---|
| Business Hours | `#4ade80` green |
| Night Shift | `#f59e0b` amber |
| After Hours | `#818cf8` indigo |
| Always On (24/7) | `#22d3ee` cyan |
| Contractor / temporary | `#f87171` red |

### Groups Page

Groups page updated to show schedule reference instead of inline time builder:
- "When active?" section: dropdown/picker that selects a named schedule by ID
- Chips still show condition rules; time gate shown as a schedule chip (amber, with schedule name)
- No raw time window builder exposed

### Policies Page

Same pattern — policies reference a `scheduleId` instead of embedding time rules.

---

## Data Model Changes

```typescript
// NEW entity
interface NamedSchedule {
  id: string;
  name: string;
  description?: string;
  daysOfWeek: string[];      // ['Mon','Tue','Wed','Thu','Fri']
  startTime: string;         // '09:00'
  endTime: string;           // '17:00'
  validFrom?: string;        // ISO date or undefined = always
  validUntil?: string;       // ISO date or undefined = always
  timezone: string;          // 'Australia/Sydney'
  color: string;             // hex for timeline rendering
}

// UPDATED — Group adds optional scheduleId
interface Group {
  // ... existing fields ...
  scheduleId?: string;       // references NamedSchedule.id
}

// UPDATED — Policy adds optional scheduleId
interface Policy {
  // ... existing fields ...
  scheduleId?: string;
}

// Store gains allSchedules slice
interface StoreSnapshot {
  // ... existing ...
  allSchedules: NamedSchedule[];
}
```

### Seed Schedules

| Name | Days | Time | Color |
|---|---|---|---|
| Business Hours | Mon–Fri | 09:00–17:00 | `#4ade80` |
| Night Shift | Mon–Fri | 20:00–06:00 | `#f59e0b` |
| After Hours | Daily | 17:00–09:00 | `#818cf8` |
| Always On (24/7) | Daily | 00:00–23:59 | `#22d3ee` |
| Contractor Access — Apr 2026 | Mon–Fri | 08:00–17:00 | `#f87171` (validUntil: 2026-04-28) |

---

## Component Inventory

| Component | File | Tailwind requirements |
|---|---|---|
| `TopNav` | `src/components/TopNav.tsx` | `h-[46px] bg-[#060a10] border-b border-[#0f172a]` horizontal tab bar |
| `NowPill` | inside TopNav | `bg-[#071a0e] border border-[#14532d] rounded-full` with pulsing green dot |
| `ScheduleSidebar` | inside Schedules page | `w-[220px] bg-[#060a10] border-r border-[#0f172a]` |
| `TimelineRuler` | inside Schedules page | sticky, 24 equal columns, current hour `text-[#60a5fa] font-bold` |
| `TimelineBand` | inside Schedules page | `position:absolute`, semi-transparent fill, colour from schedule |
| `NowLine` | inside timeline | `w-[2px] bg-[#3b82f6]`, absolute positioned at current hour % |
| `SectionDivider` | inside timeline | `text-[9px] uppercase tracking-widest text-[#1e293b]` + `h-px bg-[#0f172a]` |
| `FooterStatus` | inside Schedules page | sticky bottom, active schedule chips + jump-to buttons |
| `SchedulePicker` | `src/components/SchedulePicker.tsx` | dropdown used in Group + Policy editors |

---

## Accessibility Requirements

- Colour bands must NOT rely solely on colour — include text label inside each band
- Now line: provide `aria-label="Current time"` 
- Sidebar items: keyboard navigable, `role="option"` with `aria-selected`
- Active/inactive state: communicated via text label + dot, not dot colour alone
- Footer chips: include text ("Active" / "Inactive — starts HH:MM"), not symbol-only

---

## Coder Notes

- The access engine (`accessEngine.ts`) resolves `scheduleId` by looking up the schedule in `store.allSchedules`, then calling the existing `isScheduleActive()` function with the resolved schedule object
- Groups with `scheduleId` should pass that schedule to `isScheduleActive()` during membership evaluation — if the schedule is inactive, dynamic rules still don't enrol the user
- The existing `TimeWindow` / inline `now.*` rule approach is preserved for backward compat with v2 data; new groups/policies use `scheduleId` exclusively
- Vite port: change `server.port` to `4305` in `vite.config.ts`
