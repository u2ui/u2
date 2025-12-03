const icoCssUrl = import.meta.resolve('../ico/ico.css');

class U2Calendar extends HTMLElement {
  static observedAttributes = ['view', 'date', 'lang'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentDate = new Date();
    this._locale = null;
    this._weekStart = 0; // 0 = Sunday .. 6 = Saturday
    import('../ico/ico.js');

    this.shadowRoot.innerHTML = `
      <style>
        @import url('${icoCssUrl}');
        :host {
          display: flex;
          flex-direction: column;
          background: #0001;
          position:relative;
          z-index: 0;
          --u2-ico-dir: var(--u2-ico-dir-material);
        }
        .header {
          display: grid;
          margin-bottom:1px;
          grid-template-columns: repeat(7, 1fr);
          text-transform: uppercase;
          position: sticky;
          top: 0;
          z-index: 3;
        }
        .header-day {
          text-align: center;
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
          &:focus { z-index:1; }
          &[aria-current="date"] { background-color: var(--color-light, #e3f2fd); }
        }
        .navigation {
          display: flex;
          justify-content: space-between;
          gap: .5em;
          padding: 1em;
          & h2 { margin: 0; flex:1; font-weight:normal; }
          & button { padding:0; margin:0; border:0; background:transparent; font:inherit; }
        }
        .other-month { color: #0002; }
      </style>
      <div class=navigation>
        <h2></h2>
        <button onclick="this.getRootNode().host.date = new Date()" style="padding-inline:.5rem">
          Today
        </button>
        <button onclick="this.getRootNode().host.prev()">
          <u2-ico icon="chevron-left">&lt;</u2-ico>
        </button>
        <button onclick="this.getRootNode().host.next()">
          <u2-ico icon="chevron-right">&gt;</u2-ico>
        </button>
      </div>
      <div class=header></div>
      <div class=grid role=grid><slot></slot></div>
    `;    
  }

  _setLocale(localeStr) {
    const loc = new Intl.Locale(localeStr || navigator.language);
    this._locale = loc;
    this._weekStart = loc.getWeekInfo?.().firstDay ?? 1;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;    
    if (name === 'date') this._currentDate = new Date(newValue);
    if (name === 'lang') this._setLocale(newValue);
    this.render();
    this.updateLayout();
  }

  connectedCallback() {
    if (!this.hasAttribute('lang')) this._setLocale();
    this.render();
    new MutationObserver(() => this.updateLayout()).observe(this, { childList: true });
  }

  set date(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    this.setAttribute('date', d.toISOString().split('T')[0]);
  }

  walkByMonth(offset) {
    const d = new Date(this._currentDate);
    //d.setMonth(d.getMonth() + offset, 1);
    d.setUTCMonth(d.getUTCMonth() + offset, 1); // besser?
    this.date = d;
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
    const dateString = Intl.DateTimeFormat(this._locale?.baseName || navigator.language, { year: 'numeric', month: 'long' }).format(this._currentDate);

    this.shadowRoot.querySelector('.navigation h2').innerHTML = dateString;
    this.shadowRoot.querySelector('.header').innerHTML = `
      ${(() => {
          const localeTag = (this._locale && this._locale.baseName) || this.getAttribute('lang') || navigator.language;
          const dtf = getTimeFormatter(localeTag, { weekday: 'short' });
          const out = [];
          for (let i = 0; i < 7; i++) {
            const idx = (this._weekStart + i) % 7;
            const ref = new Date(Date.UTC(1970, 0, 4 + idx));
            const label = dtf.format(ref);
            out.push(`<div class="header-day">${label}</div>`);
          }
          return out.join('');
        })()}
    `;
    this.shadowRoot.querySelector('.grid').innerHTML = `<slot></slot>`;

    this.renderMonth(year, month, today);
    this.updateLayout();
  }

  renderMonth(year, month, today) {
    const grid = this.shadowRoot.querySelector('.grid');
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const startOffset = (firstOfMonth.getUTCDay() - this._weekStart + 7) % 7;
    
    for (let i = 0; i < 42; i++) { // 6 Wochen x 7 Tage
      const date = new Date(Date.UTC(year, month, 1 - startOffset + i));
      const isOtherMonth = date.getUTCMonth() !== month;
      if (isOtherMonth && i === 35) break; // stop, if other month and last row
      const isToday = date.toDateString() === today.toDateString();      
      grid.appendChild(this.createDayCell(date, i, isOtherMonth, isToday));
    }
  }

  createDayCell(date, index, isOtherMonth, isToday = false) {
    const day = date.getUTCDate();
    const cell = document.createElement('div');
    cell.setAttribute('part', 'cell');
    cell.tabIndex = '0';
    cell.dataset.date = date.toISOString().split('T')[0];
    cell.role = 'gridcell';
    cell.ariaColIndex = (index % 7) + 1;
    cell.ariaRowIndex = Math.floor(index / 7) + 1;
    
    cell.className = `day ${isOtherMonth ? 'other-month' : ''}`;
    isToday && cell.setAttribute('aria-current', 'date');
    cell.innerHTML = `<div class="day-number">${day}</div>`;
    cell.style.gridColumn = cell.ariaColIndex;
    cell.style.gridRow = cell.ariaRowIndex;
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
      const rowTracks = tracks.get(week.row) ?? tracks.set(week.row, []).get(week.row);

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
      item.updateLayout?.({ weeks });
    });
  }

  splitIntoWeeks(start, end, year, month) {
    const weeks = [];
    const firstDay = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    const startOffset = (firstDay.getUTCDay() - this._weekStart + 7) % 7;
    
    // Calculate the first and last day of the visible calendar view
    const viewStart = new Date(Date.UTC(year, month, 1 - startOffset));
    const daysInMonth = monthEnd.getUTCDate();
    const totalDays = Math.ceil((daysInMonth + startOffset) / 7) * 7;
    const viewEnd = new Date(Date.UTC(year, month, 1 - startOffset + totalDays - 1));
    
    // Parse input dates and normalize to start of day
    const eventStart = new Date(start);
    eventStart.setUTCHours(0, 0, 0, 0);
    
    const eventEnd = new Date(end);
    eventEnd.setUTCHours(0, 0, 0, 0);
    
    // Return early if event is outside visible range
    if (eventEnd < viewStart || eventStart > viewEnd) return weeks;
    
    // Calculate the actual start and end dates we need to process
    const current = new Date(Math.max(viewStart.getTime(), eventStart.getTime()));
    const finalEnd = new Date(Math.min(viewEnd.getTime(), eventEnd.getTime()));
        
    // Process each week
    while (current <= finalEnd) {      
      // Calculate days since view start
      const daysSinceStart = Math.floor((current - viewStart) / (1000 * 60 * 60 * 24));
      const row = Math.floor(daysSinceStart / 7);
      const col = daysSinceStart % 7;
      
      // Calculate how many days until the end of the week or event, whichever comes first
      const daysRemainingInWeek = 6 - col;
      const daysUntilEventEnd = Math.ceil((finalEnd - current) / (1000 * 60 * 60 * 24));
      const span = Math.min(daysRemainingInWeek, daysUntilEventEnd) + 1;
      
      // Add the week segment
      weeks.push({
        gridColumn: `${col + 1} / span ${span}`,
        gridRow: row + 1,
        startCol: col,
        endCol: col + span - 1,
        row
      });
      
      // Move to the next day after this segment
      current.setDate(current.getDate() + span);
      
      // If we've reached the end of the event, break
      if (current > finalEnd) break;
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

  _parseDate(dateString) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateString);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    try {
      if (name === 'start') this._start = this._parseDate(newValue);
      if (name === 'end') this._end = this._parseDate(newValue);
      this.closest('u2-calendar')?.updateLayout?.();
    } catch (e) {
      console.error(`Error parsing ${name} date:`, newValue, e);
    }
  }

  get start() { return this._start; }
  get end() { return this._end && this._end > this._start ? this._end : this._start; }

  updateLayout(layoutInfo) {
    if (!layoutInfo) return;

    const calendar = this.closest('u2-calendar');
    const localeTag = calendar?._locale?.baseName || navigator.language;
    const timeFormatter = getTimeFormatter(localeTag);

    const text = this.textContent.trim();
    let startString = timeFormatter.format(this.start);
    let endString = timeFormatter.format(this.end);
    if (startString === '00:00' || startString === '12:00 AM') startString = '';
    if (endString === '00:00' || endString === '12:00 AM') endString = '';

    this.shadowRoot.innerHTML = `${layoutInfo.weeks.map(week => `
        <div class=bar 
          title="${startString} - ${endString}\n${text}"
          tabindex="0"
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
