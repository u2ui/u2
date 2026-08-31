import {elementOf} from '../selection/ownership/ownership.js';
import {fill} from './block-boundary.js';
import {Point} from '../selection/point/point.js';

// Table structure commands.
//
// Sections, rows, and cells are never named: they come from the model's default
// child, so a configured table-like structure works the same way. Every change
// is an ordinary mapped mutation, which is what makes it one undo step and lets
// the caret land where the edit happened.
export class Tables {
    #tag;
    #commands;

    constructor(tag = 'table') {
        if (typeof tag !== 'string' || !tag.trim()) throw new TypeError('A table command group requires a tag name');
        this.#tag = tag.trim().toLowerCase();
        this.#commands = Object.freeze({
            insertTable: {
                enabled: edit => !!this.#target(edit),
                run: edit => this.#insert(edit),
            },
            rowBefore: this.#rows('before'),
            rowAfter: this.#rows('after'),
            rowDelete: this.#rows(null),
            columnBefore: this.#columns('before'),
            columnAfter: this.#columns('after'),
            columnDelete: this.#columns(null),
            deleteTable: {
                enabled: edit => !!this.#at(edit),
                run: edit => this.#remove(edit, this.#at(edit)?.table),
            },
        });
    }

    get tag() { return this.#tag; }
    get commands() { return this.#commands; }

    // The tags one level apart, taken from the model rather than assumed.
    #shape(edit) {
        const section = edit.model.defaultChild(this.#tag);
        const row = section && edit.model.defaultChild(section);
        const cell = row && edit.model.defaultChild(row);
        return cell ? {table: this.#tag, section, row, cell} : null;
    }

    // The cell the caret sits in, with everything around it.
    #at(edit) {
        const shape = this.#shape(edit);
        if (!shape || !edit.range) return null;
        for (let element = elementOf(edit.range.start.node); element && element !== edit.element;
            element = element.parentElement) {
            if (element.parentElement?.localName !== shape.row) continue;
            const cell = element;
            const row = cell.parentElement;
            const table = row.closest(shape.table);
            if (!table || !edit.element.contains(table)) return null;
            return {shape, cell, row, table, column: [...row.children].indexOf(cell)};
        }
        return null;
    }

    // Where a new table may go: the nearest container that accepts one. A
    // selection is not deleted first; the table lands where it starts.
    #target(edit) {
        const shape = this.#shape(edit);
        const start = edit.range?.start;
        if (!shape || !start || this.#at(edit)) return null;
        const table = edit.document.createElement(shape.table);
        for (let element = elementOf(start.node); element; element = element.parentElement) {
            if (edit.model.atomic(element)) return null;
            if (edit.model.allows(element, table)) return element;
            if (element === edit.element) return null;
        }
        return null;
    }

    #rows(where) {
        return {
            enabled: edit => {
                const found = this.#at(edit);
                return !!found && !spans(found.table, 'rowSpan') && (!!where || rows(found.table).length > 0);
            },
            run: edit => where ? this.#addRow(edit, where) : this.#dropRow(edit),
        };
    }

    #columns(where) {
        return {
            enabled: edit => {
                const found = this.#at(edit);
                return !!found && !spans(found.table, 'rowSpan') && !spans(found.table, 'colSpan');
            },
            run: edit => where ? this.#addColumn(edit, where) : this.#dropColumn(edit),
        };
    }

    #insert(edit, {rows: height = 2, columns: width = 2} = edit.value || {}) {
        const parent = this.#target(edit);
        const shape = this.#shape(edit);
        if (!parent) return null;
        const table = build(edit, shape, Math.max(1, height), Math.max(1, width));
        const start = edit.range.start;
        const at = edit.map.split(parent, start.node, start.offset);
        edit.map.insert(parent, at, table);
        edit.transaction.touch(parent);
        edit.select(Point.start(table.querySelector(shape.cell)));
        return table;
    }

    #addRow(edit, where) {
        const found = this.#at(edit);
        if (!found) return null;
        const row = edit.document.createElement(found.shape.row);
        for (const cell of found.row.children) row.append(edit.document.createElement(cell.localName));
        const section = found.row.parentElement;
        edit.map.insert(section, [...section.childNodes].indexOf(found.row) + (where === 'after' ? 1 : 0), row);
        for (const cell of row.children) fill(edit, cell);
        edit.transaction.touch(section);
        edit.select(Point.start(row.firstElementChild));
        return row;
    }

    #dropRow(edit) {
        const found = this.#at(edit);
        if (!found) return null;
        const remaining = rows(found.table).filter(row => row !== found.row);
        if (!remaining.length) return this.#remove(edit, found.table);
        const next = neighbour(rows(found.table), found.row);
        const section = found.row.parentElement;
        edit.map.remove(found.row);
        if (!section.children.length && section !== found.table) edit.map.remove(section);
        edit.transaction.touch(found.table);
        edit.select(Point.start(next.children[Math.min(found.column, next.children.length - 1)]));
        return found.row;
    }

    #addColumn(edit, where) {
        const found = this.#at(edit);
        if (!found) return null;
        let landed = null;
        for (const row of rows(found.table)) {
            const at = Math.min(found.column + (where === 'after' ? 1 : 0), row.children.length);
            const reference = row.children[at] || null;
            const model = row.children[Math.min(found.column, row.children.length - 1)];
            const cell = edit.document.createElement(model?.localName || found.shape.cell);
            edit.map.insert(row, reference ? [...row.childNodes].indexOf(reference) : row.childNodes.length, cell);
            fill(edit, cell);
            if (row === found.row) landed = cell;
        }
        edit.transaction.touch(found.table);
        if (landed) edit.select(Point.start(landed));
        return landed;
    }

    #dropColumn(edit) {
        const found = this.#at(edit);
        if (!found) return null;
        if (found.row.children.length <= 1) return this.#remove(edit, found.table);
        for (const row of rows(found.table)) {
            const cell = row.children[found.column];
            if (cell) edit.map.remove(cell);
        }
        edit.transaction.touch(found.table);
        const cells = [...found.row.children];
        edit.select(Point.start(cells[Math.min(found.column, cells.length - 1)]));
        return found.table;
    }

    #remove(edit, table) {
        if (!table) return null;
        const parent = table.parentElement;
        const at = [...parent.childNodes].indexOf(table);
        edit.map.remove(table);
        edit.transaction.touch(parent);
        edit.select(new Point(parent, Math.min(at, parent.childNodes.length), 'forward'));
        return table;
    }
}

function build(edit, shape, height, width) {
    const table = edit.document.createElement(shape.table);
    const section = shape.section ? table.appendChild(edit.document.createElement(shape.section)) : table;
    for (let y = 0; y < height; y++) {
        const row = section.appendChild(edit.document.createElement(shape.row));
        for (let x = 0; x < width; x++) {
            const cell = row.appendChild(edit.document.createElement(shape.cell));
            cell.append(edit.document.createElement('br'));
        }
    }
    return table;
}

function rows(table) {
    return [...table.rows || []];
}

// Spanning cells make an index no longer name a column, so the commands that
// count on one stay unavailable rather than shifting the wrong cells.
function spans(table, property) {
    return rows(table).some(row => [...row.children].some(cell => (cell[property] || 1) > 1));
}

function neighbour(list, item) {
    const at = list.indexOf(item);
    return list[at + 1] || list[at - 1];
}
