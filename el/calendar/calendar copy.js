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
    queueMicrotask(() => this.updateLayout());
  }

  connectedCallback() {
    if (!this.hasAttribute('date')) this._currentDate = new Date();
    if (!this.hasAttribute('locale')) this._setLocale();

    this.render();
    new MutationObserver(() => this.updateLayout()).observe(this, { childList: true });
  }

  _goto(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    this.setAttribute('date', d.toISOString().split('T')[0]);
  }

  next() {
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    this._goto(new Date(year, month + 1, 1));
  }

  prev() {
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    this._goto(new Date(year, month - 1, 1));
  }

  render() {
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
          padding:1px 1px 0 1px;
          grid-template-columns: repeat(7, 1fr);
          text-transform: uppercase;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .header-day {
          padding: .5em 0;
          text-align: center;
          font-weight: 500;
          background: #fff;
        }
        .grid {
          flex-grow: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          padding:1px;
        }
        .day {
          background: #fff;
          padding: .2em;
          display: flex;
          flex-direction: column;
          min-block-size: 5em;
          position: relative;
        }
        .other-month { color: #0002; }
        .today { background-color: var(--color-light, #e3f2fd); }
      </style>
      <div class="header">
        ${(() => {
          const localeTag = (this._locale && this._locale.baseName) || this.getAttribute('locale') || navigator.language;
          const dtf = new Intl.DateTimeFormat(localeTag, { weekday: 'short' });
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
    
    queueMicrotask(() => this.updateLayout());
  }

  renderMonth(year, month, today) {
    const grid = this.shadowRoot.querySelector('.grid');
    const firstDay = new Date(year, month, 1);
    // startOffset relative to configured first day of week
    const startOffset = (firstDay.getDay() - this._weekStart + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let cellIndex = 0;

    // Vorheriger Monat
    for (let i = startOffset - 1; i >= 0; i--) {
      grid.appendChild(this.createDayCell(prevMonthDays - i, cellIndex++, true));
    }

    // Aktueller Monat
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const cell = this.createDayCell(day, cellIndex++, false, isToday);
      cell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      grid.appendChild(cell);
    }

    // Nächster Monat (Grid auffüllen)
    const remainingCells = (Math.ceil(cellIndex / 7) * 7) - cellIndex;
    for (let day = 1; day <= remainingCells; day++) {
      grid.appendChild(this.createDayCell(day, cellIndex++, true));
    }
  }

  createDayCell(day, index, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    cell.className = `day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    cell.innerHTML = `<div class="day-number">${day}</div>`;
    cell.style.gridColumn = (index % 7) + 1;
    cell.style.gridRow = Math.floor(index / 7) + 1;
    return cell;
  }

  updateLayout() {
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

    // Track-Zuweisung für überlappende Events
    const tracks = new Map();
    itemWeeks.forEach(({ weeks }) => {
      weeks.forEach(week => {
        if (!tracks.has(week.row)) tracks.set(week.row, []);

        const rowTracks = tracks.get(week.row);
        let track = 0;

        // Finde ersten freien Track ohne Überlappung
        while (rowTracks.some(t => t.track === track && !(week.endCol < t.start || week.startCol > t.end))) {
          track++;
        }

        rowTracks.push({ start: week.startCol, end: week.endCol, track });
        week.track = track;
      });
    });

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
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.closest('u2-calendar')?.updateLayout?.();
  }

  get start() {
    return new Date(this.getAttribute('start'));
  }

  get end() {
    const endAttr = this.getAttribute('end');
    const startTime = this.start;
    let endTime;

    if (endAttr) {
      endTime = new Date(endAttr);
      if (endTime <= startTime) {
        console.warn('Calendar item end time must be after start time.', this);
        endAttr = false;
      }
    }
    if (!endAttr) endTime = new Date(startTime);
    
    return endTime;
  }

  connectedCallback() {
    this.closest('u2-calendar')?.updateLayout?.();
  }

  updateLayout(layoutInfo) {
    if (!layoutInfo) return;

    const calendar = this.closest('u2-calendar');
    const localeTag = calendar?._locale?.baseName || navigator.language;
    const timeFormatter = new Intl.DateTimeFormat(localeTag, { 
      hour: '2-digit',
      minute: '2-digit'
    });

    const text = this.textContent.trim();
    const startString = timeFormatter.format(this.start);
    const endString = timeFormatter.format(this.end);
    this.title = `${startString} - ${endString}\n${text}`;

    this.shadowRoot.innerHTML = `
      <style>
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
          cursor: pointer;
          z-index: 1;
          box-sizing: border-box;
        }
        .bar {
          all: inherit;
          line-height: 1.1;
          display:block;
        }
      </style>
      ${layoutInfo.weeks.map(week => `
        <div class="bar" style="
          grid-column: ${week.gridColumn};
          grid-row: ${week.gridRow}; 
          margin-block-start: ${(week.track || 0) * 2.0 + 2.3}em;
        ">${startString} ${text}</div>
      `).join('')}
    `;
  }
}

customElements.define('u2-calendaritem', U2CalendarItem);
customElements.define('u2-calendar', U2Calendar);
