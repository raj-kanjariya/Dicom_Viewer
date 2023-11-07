import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
// Force the loading of HttpDataAccessHelper to support gzip decompression
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkRectangleWidget from '@kitware/vtk.js/Widgets/Widgets3D/RectangleWidget';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorObserver from '@kitware/vtk.js/Rendering/Core/InteractorObserver';
// import ImageConstants from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';
import {
    bindSVGRepresentation,
    multiLineTextCalculator,
    VerticalTextAlignment,
} from './SVGHelpers';

import {
    BehaviorCategory,
    ShapeBehavior,
    TextPosition,
} from '@kitware/vtk.js/Widgets/Widgets3D/ShapeWidget/Constants';

import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';


const container = document.querySelector('#container');
const fileInput = document.querySelector('#fileInput');

const { computeWorldToDisplay } = vtkInteractorObserver;
// const { SlicingMode } = ImageConstants;

const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

const camera = renderer.getActiveCamera();
camera.setParallelProjection(true);

const iStyle = vtkInteractorStyleImage.newInstance();
iStyle.setInteractionMode('IMAGE_SLICING');
renderWindow.getInteractor().setInteractorStyle(iStyle);

let mapper = vtkImageMapper.newInstance();
mapper.setSliceAtFocalPoint(true);

let actor = vtkImageSlice.newInstance();
actor.setMapper(mapper);

const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);

const rectangleWidget = vtkRectangleWidget.newInstance({
    // resetAfterPointPlacement: true,
});
const rectangleHandle = widgetManager.addWidget(
    rectangleWidget,
    ViewTypes.SLICE
);
rectangleHandle.setHandleVisibility(false);
rectangleWidget
    .getWidgetState()
    .setTextPosition([
        TextPosition.CENTER,
        TextPosition.CENTER,
        TextPosition.CENTER,
    ]);

// Used to focus on a specific widget, making it the active or selected widget.
// Particularly useful when you have multiple widgets in your scene and you want to interact with a specific one.
widgetManager.grabFocus(rectangleWidget);

// function setCamera(sliceMode, renderer, data) {
//     const ijk = [0, 0, 0];
//     const position = [0, 0, 0];
//     const focalPoint = [0, 0, 0];
//     const viewUp = sliceMode === 1 ? [0, 0, 1] : [0, 1, 0];
//     data.indexToWorld(ijk, focalPoint);
//     ijk[sliceMode] = 1;
//     data.indexToWorld(ijk, position);
//     renderer.getActiveCamera().set({ focalPoint, position, viewUp });
//     renderer.resetCamera();
// }

function setCamera(sliceMode, renderer, data) {
    const ijk = [0, 0, 0];
    const position = [0, 0, 0];
    const focalPoint = [0, 0, 0];
    const viewUp = sliceMode === 2 ? [0, 1, 0] : [0, 0, 1];
    data.indexToWorld(ijk, position);
    ijk[sliceMode] = 1;
    data.indexToWorld(ijk, focalPoint);
    renderer.getActiveCamera().set({ position, focalPoint, viewUp }); // Set parameter sequence
    renderer.resetCamera();
}

function ready(picking) {
    renderer.resetCamera();
    if (picking) {
        widgetManager.enablePicking();
    } else {
        widgetManager.disablePicking();
    }
}

function updateWidgetVisibility(widget, slicePos, i, widgetIndex) {
    /* testing if the widget is on the slice and has been placed to modify visibility */
    const widgetVisibility =
        !widgetManager.getWidgets()[widgetIndex].getPoint1() ||
        widget.getWidgetState().getPoint1Handle().getOrigin()[i] === slicePos[i];
    return widget.setVisibility(widgetVisibility);
}

function updateWidgetsVisibility(slicePos, slicingMode) {
    // updateWidgetVisibility(rectangleWidget, slicePos, slicingMode, 0);
    updateWidgetVisibility(rectangleWidget, slicePos, slicingMode, 0);
}

function loadDataset(isLocalFile = false) {
    if (isLocalFile) {
        vtkResourceLoader.loadScript(
            'https://cdn.jsdelivr.net/npm/itk-wasm@1.0.0-b.8/dist/umd/itk-wasm.min.js'
        ).then(() => {
            fileInput.addEventListener('change', async (event) => {
                const files = event.target.files;

                const { image, webWorker } = await window.itk.readImageDICOMFileSeries(files, false);
                // webWorker.terminate();

                const vtkImage = vtkITKHelper.convertItkToVtkImage(image);
                setup(vtkImage);
            });
        });
    }
    else {
        const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
        reader
            .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
            .then(() => reader.loadData())
            .then(() => {
                const image = reader.getOutputData();
                setup(image);
            });
    }
}
loadDataset(true);

function setup(data) {
    mapper.setInputData(data);

    const sliceMode = vtkImageMapper.SlicingMode.K; // I J K - 0 1 2; X Y Z - 3 4 5
    // mapper.setSlicingMode(sliceMode);
    mapper.setSlice(0);

    setCamera(sliceMode, renderer, data);

    rectangleHandle.getRepresentations()[1].setDrawBorder(true);
    rectangleHandle.getRepresentations()[1].setDrawFace(false);
    rectangleHandle.getRepresentations()[1].setOpacity(1);

    rectangleHandle.onInteractionEvent(() => {
        const worldBounds = rectangleHandle.getBounds();

        const dx = Math.abs(worldBounds[0] - worldBounds[1]);
        const dy = Math.abs(worldBounds[2] - worldBounds[3]);
        const dz = Math.abs(worldBounds[4] - worldBounds[5]);

        const perimeter = 2 * (dx + dy + dz);
        const area = dx * dy + dy * dz + dz * dx;

        const text = `perimeter: ${perimeter.toFixed(1)}mm\narea: ${area.toFixed(
            1
        )}mm²`;
        rectangleWidget.getWidgetState().getText().setText(text);
    });

    const update = () => {
        const slicingMode = mapper.getSlicingMode() % 3; // Always 0 1 2

        if (slicingMode > -1) {
            const ijk = [0, 0, 0];
            const slicePos = [0, 0, 0];

            // position
            let intSliceIdx = parseInt(mapper.getSlice())
            ijk[sliceMode] = mapper.getSlice();
            data.indexToWorld(ijk, slicePos);
            console.log(intSliceIdx, slicePos);

            // Setting a user-defined origin can be useful when manipulating 3D widgets or actors in VTK.js 
            // because it allows you to specify a point around which transformations (such as rotations or translations) will occur.
            rectangleWidget.getManipulator().setUserOrigin(slicePos);

            updateWidgetsVisibility(slicePos, slicingMode);

            renderWindow.render();
        }
    };
    mapper.onModified(update);

    // trigger initial update
    update();
    ready(true);

    renderer.addActor(actor);
    renderer.resetCamera();
    renderWindow.render();
}

// const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
// reader
//     .setUrl("https://kitware.github.io/vtk-js/data/volume/LIDC2.vti", { loadData: true })
//     .then(() => {
//         const data = reader.getOutputData();
//         mapper.setInputData(data);

//         const sliceMode = vtkImageMapper.SlicingMode.K; // I J K - 0 1 2; X Y Z - 3 4 5
//         mapper.setSlicingMode(sliceMode);
//         mapper.setSlice(0);

//         setCamera(sliceMode, renderer, data);

//         rectangleHandle.getRepresentations()[1].setDrawBorder(true);
//         rectangleHandle.getRepresentations()[1].setDrawFace(false);
//         rectangleHandle.getRepresentations()[1].setOpacity(1);

//         rectangleHandle.onInteractionEvent(() => {
//             const worldBounds = rectangleHandle.getBounds();

//             const dx = Math.abs(worldBounds[0] - worldBounds[1]);
//             const dy = Math.abs(worldBounds[2] - worldBounds[3]);
//             const dz = Math.abs(worldBounds[4] - worldBounds[5]);

//             const perimeter = 2 * (dx + dy + dz);
//             const area = dx * dy + dy * dz + dz * dx;

//             const text = `perimeter: ${perimeter.toFixed(1)}mm\narea: ${area.toFixed(
//                 1
//             )}mm²`;
//             rectangleWidget.getWidgetState().getText().setText(text);
//         });

//         const update = () => {
//             const slicingMode = mapper.getSlicingMode() % 3; // Always 0 1 2

//             if (slicingMode > -1) {
//                 const ijk = [0, 0, 0];
//                 const slicePos = [0, 0, 0];

//                 // position
//                 ijk[sliceMode] = mapper.getSlice();
//                 console.log(mapper.getSlice());
//                 data.indexToWorld(ijk, slicePos);

//                 rectangleWidget.getManipulator().setUserOrigin(slicePos);

//                 updateWidgetsVisibility(slicePos, slicingMode);

//                 renderWindow.render();
//             }
//         };
//         mapper.onModified(update);

//         // trigger initial update
//         update();
//         ready(true);


//         renderer.addActor(actor);
//         renderer.resetCamera();
//         renderWindow.render();
//     });

function setupSVG(widget, options) {
    bindSVGRepresentation(renderer, widget.getWidgetState(), {
        mapState(widgetState, { size }) {
            const textState = widgetState.getText();
            const text = textState.getText();
            const origin = textState.getOrigin();
            if (origin && textState.getVisible()) {
                const coords = computeWorldToDisplay(renderer, ...origin);
                const position = [coords[0], size[1] - coords[1]];
                return {
                    text,
                    position,
                };
            }
            return null;
        },
        render(data, h) {
            if (data) {
                const lines = data.text.split('\n');
                const fontSize = 32;
                const dys = multiLineTextCalculator(
                    lines.length,
                    fontSize,
                    VerticalTextAlignment.MIDDLE
                );
                return lines.map((line, index) =>
                    h(
                        'text',
                        {
                            key: index,
                            attrs: {
                                x: data.position[0],
                                y: data.position[1],
                                dx: 12,
                                dy: dys[index],
                                fill: 'white',
                                'font-size': fontSize,
                                ...options?.textProps,
                            },
                        },
                        line
                    )
                );
            }
            return [];
        },
    });
}

setupSVG(rectangleWidget, {
    textProps: {
        'text-anchor': 'middle',
    },
});