import {Rte} from './src/core/core.js';

export {rangeRect} from './src/browser/range-rect.js';
export {Commands} from './src/command/commands.js';
export {BlockStyles} from './src/command/block-style.js';
export {deleteBackward, deleteForward} from './src/command/delete.js';
export {Edit} from './src/command/edit.js';
export {enter, lineBreak} from './src/command/enter.js';
export {insertFragment} from './src/command/fragment.js';
export {applyMark, removeMark, setMarks, toggleMark} from './src/command/mark.js';
export {PendingMarks} from './src/command/pending-marks.js';
export {unstyleCommand} from './src/command/unstyle.js';
export {config, elementPresets, enabled, hostDefaults} from './src/config/config.js';
export {Rte} from './src/core/core.js';
export {ExternalInput} from './src/input/external-input.js';
export {InputPipeline, inputRange, inputTrigger} from './src/input/input-pipeline.js';
export {
    bold, boldHtml,
    code, codeHtml,
    italic, italicHtml,
    link, linkHtml,
    strike, strikeHtml,
    underline, underlineHtml,
} from './src/mark/standard.js';
export {MarkAdapter} from './src/mark/dom-adapter.js';
export {Mark, MarkType, markSet} from './src/mark/mark.js';
export {ContentModel} from './src/model/content-model.js';
export {createHtmlModel, htmlModel} from './src/model/html/html-model.js';
export {RepairPlanner} from './src/normalize/repair/repair-planner.js';
export {RepairExecutor} from './src/normalize/execute/repair-executor.js';
export {Normalizer} from './src/normalize/normalizer/normalizer.js';
export {EditRange} from './src/selection/range/edit-range.js';
export {PointMap} from './src/selection/map/point-map.js';
export {SelectionSnapshot} from './src/selection/snapshot.js';
export {Point} from './src/selection/point/point.js';
export {NativeSanitizer} from './src/sanitize/native.js';
export {SanitizePolicy, sanitizeDefaults, sanitizePolicy} from './src/sanitize/policy.js';
export {Surface} from './src/surface/surface.js';
export {Transaction} from './src/transaction/transaction.js';
export {Toolbar} from './src/ui/toolbar.js';
export {Unstyle, defaultUnstyle, defaultUnstyleLevels} from './src/unstyle/unstyle.js';

export const rte = new Rte(document);
