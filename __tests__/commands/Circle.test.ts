import * as THREE from "three";
import { CircleFactory, Mode, TwoPointCircleFactory } from "../../src/commands/circle/CircleFactory";
import { EditorSignals } from '../../src/editor/Editor';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { PlaneSnap } from "../../src/editor/SnapManager";
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(CircleFactory, () => {
    let makeCircle: CircleFactory;

    beforeEach(() => {
        makeCircle = new CircleFactory(db, materials, signals);
    })

    test('mode == Horizontal', async () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        makeCircle.mode = Mode.Horizontal;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    test('construction plane', async () => {
        makeCircle.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 1, 0));
        makeCircle.center = new THREE.Vector3();
        makeCircle.point = new THREE.Vector3(0, 0, 1);
        makeCircle.mode = Mode.Horizontal;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
    })

    test('askew', async () => {
        makeCircle.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 1, 0));
        makeCircle.center = new THREE.Vector3();
        makeCircle.point = new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
        makeCircle.mode = Mode.Vertical;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-Math.SQRT1_2, -1, -Math.SQRT1_2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(Math.SQRT1_2, 1, Math.SQRT1_2));
    })

    test('mode == Vertical', async () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        makeCircle.mode = Mode.Vertical;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
    })

})

describe(TwoPointCircleFactory, () => {
    let makeCircle: TwoPointCircleFactory;

    beforeEach(() => {
        makeCircle = new TwoPointCircleFactory(db, materials, signals);
    })

    test('mode == Horizontal', async () => {
        makeCircle.p1 = new THREE.Vector3(-1, 0, 0);
        makeCircle.p2 = new THREE.Vector3(1, 0, 0);
        makeCircle.mode = Mode.Horizontal;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });
})
