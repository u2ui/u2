import {
    ContentModel,
    EditRange,
    InputPipeline,
    Mark,
    MarkAdapter,
    MarkType,
    Point,
    PointMap,
    Normalizer,
    RepairExecutor,
    RepairPlanner,
    Rte,
    SelectionSnapshot,
    Surface,
    Transaction,
    applyMark,
    htmlModel,
    inputTrigger,
    removeMark,
    rte,
    toggleMark,
} from '../rte.js';
import {same, test, truthy} from './harness.js';

test('public API: exports the foundation and one default document core', () => {
    truthy(Rte);
    truthy(Surface);
    truthy(Point);
    truthy(PointMap);
    truthy(EditRange);
    truthy(InputPipeline);
    truthy(Mark);
    truthy(MarkAdapter);
    truthy(MarkType);
    truthy(SelectionSnapshot);
    truthy(Transaction);
    truthy(applyMark);
    truthy(ContentModel);
    truthy(htmlModel);
    truthy(inputTrigger);
    truthy(removeMark);
    truthy(toggleMark);
    truthy(RepairPlanner);
    truthy(RepairExecutor);
    truthy(Normalizer);
    truthy(rte instanceof Rte);
    same(rte.root, document);
    rte.dispose();
});
