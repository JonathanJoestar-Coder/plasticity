import { Disposable } from 'event-kit';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../editor/Editor';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import { SelectionMemento } from '../editor/History';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../editor/VisualModel';
import { RefCounter } from '../util/Util';
import { HighlightManager } from './HighlightManager';
import { Hoverable } from './Hover';
import { ItemSelection, TopologyItemSelection } from './Selection';
import { SelectionMode } from './SelectionInteraction';

export interface HasSelection {
    readonly mode: ReadonlySet<SelectionMode>;
    readonly selectedSolids: ItemSelection<visual.Solid>;
    readonly selectedEdges: TopologyItemSelection<visual.CurveEdge>;
    readonly selectedFaces: TopologyItemSelection<visual.Face>;
    readonly selectedRegions: ItemSelection<visual.PlaneInstance<visual.Region>>;
    readonly selectedCurves: ItemSelection<visual.SpaceInstance<visual.Curve3D>>;
    hover?: Hoverable;
    hasSelectedChildren(solid: visual.Solid): boolean;
}

export interface ModifiesSelection extends HasSelection {
    deselectFace(object: visual.Face, parentItem: visual.Solid): void;
    selectFace(object: visual.Face, parentItem: visual.Solid): void;
    deselectRegion(object: visual.PlaneInstance<visual.Region>): void;
    selectRegion(object: visual.PlaneInstance<visual.Region>): void;
    deselectEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;
    selectEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;
    deselectSolid(solid: visual.Solid): void;
    selectSolid(solid: visual.Solid): void;
    deselectCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    selectCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    deselectAll(): void;
}

export class SelectionManager implements HasSelection, ModifiesSelection {
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face]);

    readonly selectedSolidIds = new Set<c3d.SimpleName>();
    readonly selectedEdgeIds = new Set<string>();
    readonly selectedFaceIds = new Set<string>();
    readonly selectedRegionIds = new Set<c3d.SimpleName>();
    readonly selectedCurveIds = new Set<c3d.SimpleName>();

    // selectedChildren is the set of solids that have actively selected topological items;
    // It's used in selection logic -- you can't select a solid if its face is already selected, for instance;
    // Further, when you delete a solid, if it has any selected faces, you need to unselect those faces as well.
    private readonly parentsWithSelectedChildren = new RefCounter<c3d.SimpleName>();

    hover?: Hoverable = undefined;
    private readonly highlighter = new HighlightManager(this.db);

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        signals.objectRemoved.add(item => this.delete(item));
    }

    get selectedSolids() {
        return new ItemSelection<visual.Solid>(this.db, this.selectedSolidIds);
    }

    get selectedEdges() {
        return new TopologyItemSelection<visual.CurveEdge>(this.db, this.selectedEdgeIds);
    }

    get selectedFaces() {
        return new TopologyItemSelection<visual.Face>(this.db, this.selectedFaceIds);
    }

    get selectedRegions() {
        return new ItemSelection<visual.PlaneInstance<visual.Region>>(this.db, this.selectedRegionIds);
    }

    get selectedCurves() {
        return new ItemSelection<visual.SpaceInstance<visual.Curve3D>>(this.db, this.selectedCurveIds);
    }

    hasSelectedChildren(solid: visual.Solid) {
        return this.parentsWithSelectedChildren.has(solid.userData.simpleName);
    }

    deselectFace(object: visual.Face, parentItem: visual.Solid) {
        this.selectedFaceIds.delete(object.userData.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.userData.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectFace(object: visual.Face, parentItem: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedFaceIds.add(object.userData.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.userData.simpleName,
            new Disposable(() => this.selectedFaceIds.delete(object.userData.simpleName)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectRegion(object: visual.PlaneInstance<visual.Region>) {
        this.selectedRegionIds.delete(object.userData.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectRegion(object: visual.PlaneInstance<visual.Region>) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedRegionIds.add(object.userData.simpleName);
        this.signals.objectSelected.dispatch(object);
    }

    deselectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.selectedEdgeIds.delete(object.userData.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.userData.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedEdgeIds.add(object.userData.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.userData.simpleName,
            new Disposable(() => this.selectedEdgeIds.delete(object.userData.simpleName)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectSolid(solid: visual.Solid) {
        this.selectedSolidIds.delete(solid.userData.simpleName);
        this.signals.objectDeselected.dispatch(solid);
    }

    selectSolid(solid: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedSolidIds.add(solid.userData.simpleName);
        this.signals.objectSelected.dispatch(solid);
    }

    deselectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.selectedCurveIds.delete(curve.userData.simpleName);
        this.signals.objectDeselected.dispatch(curve);
    }

    selectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedCurveIds.add(curve.userData.simpleName);
        this.signals.objectSelected.dispatch(curve);
    }

    deselectAll(): void {
        for (const collection of [this.selectedEdgeIds, this.selectedFaceIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { view } = this.db.lookupTopologyItemById(id);
                this.signals.objectDeselected.dispatch(view.entries().next().value);
            }
        }

        for (const collection of [this.selectedSolidIds, this.selectedCurveIds, this.selectedRegionIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { view } = this.db.lookupItemById(id);
                this.signals.objectDeselected.dispatch(view);
            }
        }
        this.parentsWithSelectedChildren.clear();
    }

    delete(item: visual.Item): void {
        if (item instanceof visual.Solid) {
            this.selectedSolidIds.delete(item.userData.simpleName);
            this.parentsWithSelectedChildren.delete(item.userData.simpleName);
        } else if (item instanceof visual.SpaceInstance) {
            this.selectedCurveIds.delete(item.userData.simpleName);
        } else if (item instanceof visual.PlaneInstance) {
            this.selectedRegionIds.delete(item.userData.simpleName);
        }
        this.hover?.dispose();
        this.hover = undefined;
        this.signals.objectDeselected.dispatch(item);
    }

    highlight() {
        const { selectedEdgeIds, selectedFaceIds, selectedCurveIds, selectedRegionIds } = this;
        for (const collection of [selectedEdgeIds, selectedFaceIds]) {
            this.highlighter.highlightTopologyItems(collection, m => this.materials.highlight(m));
        }
        for (const collection of [selectedCurveIds, selectedRegionIds]) {
            this.highlighter.highlightItems(collection, m => this.materials.highlight(m));
        }
        this.hover?.highlight(this.highlighter);
    }

    unhighlight() {
        this.hover?.unhighlight(this.highlighter);
        const { selectedEdgeIds, selectedFaceIds, selectedCurveIds, selectedRegionIds } = this;
        for (const collection of [selectedEdgeIds, selectedFaceIds]) {
            this.highlighter.unhighlightTopologyItems(collection);
        }
        for (const collection of [selectedCurveIds, selectedRegionIds]) {
            this.highlighter.unhighlightItems(collection);
        }
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            new Set(this.selectedSolidIds),
            new RefCounter(this.parentsWithSelectedChildren),
            new Set(this.selectedEdgeIds),
            new Set(this.selectedFaceIds),
            new Set(this.selectedCurveIds),
            new Set(this.selectedRegionIds),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.selectedSolidIds as SelectionManager['selectedSolidIds']) = m.selectedSolidIds;
        (this.parentsWithSelectedChildren as SelectionManager['parentsWithSelectedChildren']) = m.parentsWithSelectedChildren;
        (this.selectedEdgeIds as SelectionManager['selectedEdgeIds']) = m.selectedEdgeIds;
        (this.selectedFaceIds as SelectionManager['selectedFaceIds']) = m.selectedFaceIds;
        (this.selectedCurveIds as SelectionManager['selectedCurveIds']) = m.selectedCurveIds;
        (this.selectedRegionIds as SelectionManager['selectedRegionIds']) = m.selectedRegionIds;

        this.signals.selectionChanged.dispatch({ selection: this });
    }
}