import {
    ContentModel,
    EditRange,
    InputPipeline,
    Point,
    PointMap,
    Normalizer,
    RepairExecutor,
    RepairPlanner,
    Rte,
    SelectionSnapshot,
    Surface,
    Transaction,
    htmlModel,
    inputTrigger,
    rte,
} from '../rte.js';
import {same, test, truthy} from './harness.js';

test('public API: exports the foundation and one default document core', () => {
    truthy(Rte);
    truthy(Surface);
    truthy(Point);
    truthy(PointMap);
    truthy(EditRange);
    truthy(InputPipeline);
    truthy(SelectionSnapshot);
    truthy(Transaction);
    truthy(ContentModel);
    truthy(htmlModel);
    truthy(inputTrigger);
    truthy(RepairPlanner);
    truthy(RepairExecutor);
    truthy(Normalizer);
    truthy(rte instanceof Rte);
    same(rte.root, document);
    rte.destroy();
});
