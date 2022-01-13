/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import * as visual from '../src/visual_model/VisualModel';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { GizmoMaterialDatabase } from '../src/command/GizmoMaterials';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { CameraMemento, ConstructionPlaneMemento, EditorOriginator, ViewportMemento } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import ModifierManager, { ModifierStack } from '../src/editor/ModifierManager';
import { PlanarCurveDatabase } from '../src/editor/curves/PlanarCurveDatabase';
import { SnapManager } from '../src/editor/snaps/SnapManager';
import { Selection, SelectionDatabase } from '../src/selection/SelectionDatabase';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';
import { SymmetryFactory } from '../src/commands/mirror/MirrorFactory';
import ContourManager from '../src/editor/curves/ContourManager';
import { RegionManager } from '../src/editor/curves/RegionManager';
import { CrossPointDatabase } from '../src/editor/curves/CrossPointDatabase';
import { Viewport } from '../src/components/viewport/Viewport';
import { MakeViewport } from '../__mocks__/FakeViewport';
import { Editor } from '../src/editor/Editor';
import KeymapManager from 'atom-keymap-plasticity';
import CommandRegistry from '../src/components/atom/CommandRegistry';
import LayerManager from '../src/editor/LayerManager';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';

describe(EditorOriginator, () => {
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;
    let snaps: SnapManager;
    let selected: Selection;
    let gizmos: GizmoMaterialDatabase;
    let originator: EditorOriginator;
    let curves: PlanarCurveDatabase;
    let modifiers: ModifierManager;
    let contours: ContourManager;
    let selection: SelectionDatabase;
    let crosses: CrossPointDatabase;
    let viewports: Viewport[];

    beforeEach(() => {
        const editor = new Editor();
        materials = editor.materials;
        signals = editor.signals;
        db = editor._db;
        gizmos = editor.gizmos;
        crosses = editor.crosses;
        snaps = editor.snaps;
        selection = editor._selection;
        selected = selection.selected;
        curves = editor.curves;
        modifiers = editor.modifiers;
        contours = editor.contours;
        viewports = [MakeViewport(editor)];
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);
    });

    let box: visual.Solid;
    let stack: ModifierStack;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(modifiers, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;

        stack = modifiers.add(box, SymmetryFactory).stack;
        await modifiers.rebuild(stack);
    });

    test("saveToMemento & restoreFromMemento", () => {
        const memento = originator.saveToMemento();

        db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);

        originator.restoreFromMemento(memento);
        expect(1).toBe(1);
    });

    test("serialize & deserialize", async () => {
        const data = await originator.serialize();

        db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);

        await originator.deserialize(data);
        expect(1).toBe(1);
    })

    describe(CameraMemento, () => {
        test("toJSON & fromJSON", () => {
            const memento = viewports[0].camera.saveToMemento();
            const memento2 = CameraMemento.fromJSON(memento.toJSON());
            expect(memento.position).toApproximatelyEqual(memento2.position);
        })
    });

    describe(ConstructionPlaneMemento, () => {
        test("toJSON & fromJSON", () => {
            const memento = viewports[0].saveToMemento().constructionPlane;
            const memento2 = ConstructionPlaneMemento.fromJSON(memento.toJSON());
            expect(memento.n).toApproximatelyEqual(memento2.n);
        })
    });

    describe(ViewportMemento, () => {
        test("serialize & deserialize", () => {
            const memento = viewports[0].saveToMemento();
            const data = memento.serialize();
            const memento2 = ViewportMemento.deserialize(data);
            expect(memento.constructionPlane.n).toApproximatelyEqual(memento2.constructionPlane.n);
            expect(memento.camera.position).toApproximatelyEqual(memento2.camera.position);
        })
    });
})