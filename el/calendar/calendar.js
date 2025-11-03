
class U2Calendar extends HTMLElement {
  static observedAttributes = ['view', 'date', 'locale'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentDate = new Date();
    this._locale = null;
    this._weekStart = 0; // 0 = Sunday .. 6 = Saturday
  }

  _setLocale(localeStr) {
    const loc = new Intl.Locale(localeStr || navigator.language);
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : { firstDay: 1 }; // firefox:no
    this._locale = loc;
    this._weekStart = info.firstDay % 7;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;    
    if (name === 'date') this._currentDate = new Date(newValue);
    if (name === 'locale') this._setLocale(newValue);
    this.render();
    this.updateLayout();
  }

  connectedCallback() {
    if (!this.hasAttribute('date')) this._currentDate = new Date();
    if (!this.hasAttribute('locale')) this._setLocale();

    this.render();
    new MutationObserver(() => this.updateLayout()).observe(this, { childList: true });
  }

  set date(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    this.setAttribute('date', d.toISOString().split('T')[0]);
  }
  walkByMonth(offset) {
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    this.date = new Date(year, month + offset, 1);
  }
  next() { this.walkByMonth(1); }
  prev() { this.walkByMonth(-1); }

  render() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._render();
      this._renderQueued = false;
    });
  }

  _render() {
    const today = new Date();
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          background: #0001;
          position:relative;
          z-index: 0;
        }
        .header {
          display: grid;
          margin-bottom:1px;
          grid-template-columns: repeat(7, 1fr);
          text-transform: uppercase;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .header-day {
          text-align: center;
          font-weight: 500;
          background: #fff;
        }
        .grid {
          flex-grow: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          padding:0 1px 1px 1px;
        }
        .day {
          background: #fff;
          padding: .2em;
          display: flex;
          flex-direction: column;
          min-block-size: 5em;
          position: relative;
          
          &:focus {
            z-index:1;
          }
        }
        .other-month { color: #0002; }
        .today { background-color: var(--color-light, #e3f2fd); }
      </style>
      <div class="header">
        ${(() => {
          const localeTag = (this._locale && this._locale.baseName) || this.getAttribute('locale') || navigator.language;
          const dtf = getTimeFormatter(localeTag, { weekday: 'short' });
          const out = [];
          for (let i = 0; i < 7; i++) {
            const idx = (this._weekStart + i) % 7;
            // 1970-01-04 is a Sunday — create a reference date for each weekday
            const ref = new Date(Date.UTC(1970, 0, 4 + idx));
            const label = dtf.format(ref);
            out.push(`<div class="header-day">${label}</div>`);
          }
          return out.join('');
        })()}
      </div>
      <div class="grid"><slot></slot></div>
    `;

    this.renderMonth(year, month, today);
    
    this.updateLayout();
  }

  renderMonth(year, month, today) {
    const grid = this.shadowRoot.querySelector('.grid');
    // Clear any existing cells
    grid.innerHTML = '<slot></slot>';

    // Determine the first visible date (may be in previous month)
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() - this._weekStart + 7) % 7;
    const viewStart = new Date(year, month, 1 - startOffset);

    let cellIndex = 0;

    // Render a fixed 6x7 grid
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const date = new Date(viewStart);
        date.setDate(viewStart.getDate() + row * 7 + col);
        const isOtherMonth = date.getMonth() !== month;
        if (isOtherMonth && col === 0 && row === 5) break; // stop, if other month and last row, optional?
        const isToday = date.toDateString() === today.toDateString();
        const cell = this.createDayCell(date.getDate(), cellIndex++, isOtherMonth, isToday);
        grid.appendChild(cell);
      }
    }
  }

  createDayCell(day, index, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    cell.tabIndex = '0';
    cell.dataset.col = (index % 7) + 1;
    cell.dataset.row = Math.floor(index / 7) + 1;
    
    cell.className = `day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    cell.innerHTML = `<div class="day-number">${day}</div>`;
    cell.style.gridColumn = (index % 7) + 1;
    cell.style.gridRow = Math.floor(index / 7) + 1;
    return cell;
  }

  updateLayout() { // debounced
    if (this._layoutQueued) return;
    this._layoutQueued = true;
    requestAnimationFrame(() => {
      this._updateLayout();
      this._layoutQueued = false;
    });
  }
  _updateLayout() {
    const items = Array.from(this.querySelectorAll('u2-calendaritem'));
    
    // Berechne Wochen-Segmente für alle Items
    const itemWeeks = items.map(item => ({
      item,
      weeks: this.splitIntoWeeks(
        item.start,
        item.end,
        this._currentDate.getFullYear(),
        this._currentDate.getMonth()
      )
    }));

    // Track assignment for overlapping events (optimized):
    // Flatten segments, sort by row/start, then greedily assign tracks per row
    const segments = [];
    itemWeeks.forEach(({ weeks }) => weeks.forEach(w => segments.push(w)));

    segments.sort((a, b) => a.row - b.row || a.startCol - b.startCol);

    const tracks = new Map(); // row -> array of endCol per track index
    for (let i = 0; i < segments.length; i++) {
      const week = segments[i];
      let rowTracks = tracks.get(week.row);
      if (!rowTracks) {
        rowTracks = [];
        tracks.set(week.row, rowTracks);
      }

      let track = 0;
      // find first track index that is free (no overlap)
      while (rowTracks[track] !== undefined && rowTracks[track] >= week.startCol) {
        track++;
      }

      // assign and record the new end for that track
      rowTracks[track] = week.endCol;
      week.track = track;
    }

    // Layout auf Items anwenden (guard against missing/early items)
    itemWeeks.forEach(({ item, weeks }) => {
      try {
        item.updateLayout({ weeks });
      } catch (err) {
        console.warn('u2-calendar: updateLayout failed for item', item, err);
      } 
    });
  }

  splitIntoWeeks(start, end, year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() - this._weekStart + 7) % 7;
    
    // Berechne den ersten und letzten sichtbaren Tag im Kalender
    const viewStart = new Date(year, month, 1 - startOffset);
    // Berechne wie viele Tage vom nächsten Monat noch sichtbar sind
    const daysInView = Math.ceil((monthEnd.getDate() + startOffset) / 7) * 7;
    const daysFromNextMonth = daysInView - (monthEnd.getDate() + startOffset);
    const viewEnd = new Date(year, month + 1, daysFromNextMonth);
    
    // Return early if event is completely outside visible range
    if (end < viewStart || start > viewEnd) return weeks;
    
    let current = new Date(Math.max(start, viewStart));
    const eventEnd = new Date(Math.min(end, viewEnd));

    while (current <= eventEnd) {
      // Berechne die Position relativ zum ersten sichtbaren Tag
      const daysDiff = Math.floor((current - viewStart) / (1000 * 60 * 60 * 24));
      const row = Math.floor(daysDiff / 7);
      const col = daysDiff % 7;

      // Berechne Ende des Segments (entweder Wochenende oder Event-Ende)
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + (6 - col));
      const segmentEnd = new Date(Math.min(weekEnd, eventEnd));
      const span = Math.floor((segmentEnd - current) / (1000 * 60 * 60 * 24)) + 1;

      weeks.push({
        gridColumn: `${col + 1} / span ${span}`,
        gridRow: row + 1,
        startCol: col,
        endCol: col + span - 1,
        row
      });

      current.setDate(segmentEnd.getDate() + 1);
    }

    return weeks;
  }
}








class U2CalendarItem extends HTMLElement {
  static observedAttributes = ['start', 'end'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [itemStyle];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'start') this._start = new Date(newValue);
    if (name === 'end') this._end = new Date(newValue);
    this.closest('u2-calendar')?.updateLayout?.();
  }

  get start() {
    return this._start;
  }

  get end() {
    if (this._end && this._end > this.start) return this._end;
    else return this._start;
  }

  updateLayout(layoutInfo) {
    if (!layoutInfo) return;

    const calendar = this.closest('u2-calendar');
    const localeTag = calendar?._locale?.baseName || navigator.language;
    const timeFormatter = getTimeFormatter(localeTag);

    const text = this.textContent.trim();
    const startString = timeFormatter.format(this.start);
    const endString = timeFormatter.format(this.end);

    this.shadowRoot.innerHTML = `${layoutInfo.weeks.map(week => `
        <div class=bar 
          title="${startString} - ${endString}\n${text}"
          style="
            grid-column: ${week.gridColumn};
            grid-row: ${week.gridRow}; 
            margin-block-start: ${(week.track || 0) * 2.0 + 2.3}em;
        ">${startString} ${text}</div>
      `).join('')}`;
  }
}

const itemStyle = new CSSStyleSheet();
itemStyle.replaceSync(`
  :host {
    display: contents !important;
    background-color: var(--color, #1976d2);
    color: white;
    padding-block: .3em;
    padding-inline: .5em;
    white-space: nowrap;
    font-size: 0.8em;
    block-size: 1.8em;
    min-block-size: 1.5em;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 2;
    --line-height: 1.1;
    box-sizing: border-box;
  }
  .bar {
    all: inherit;
    display:block;
  }
`);

// Helpers
// Module-level cache for Intl.DateTimeFormat instances
const __u2_timeFormatterCache = new Map();
function getTimeFormatter(localeTag, options = { hour: '2-digit', minute: '2-digit' }) {
  const key = `${localeTag}::${JSON.stringify(options)}`;
  if (__u2_timeFormatterCache.has(key)) return __u2_timeFormatterCache.get(key);
  const f = new Intl.DateTimeFormat(localeTag, options);
  __u2_timeFormatterCache.set(key, f);
  return f;
}


customElements.define('u2-calendar', U2Calendar);
customElements.define('u2-calendaritem', U2CalendarItem);
