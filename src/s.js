import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Volume';

// import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';

import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkRTAnalyticSource from '@kitware/vtk.js/Filters/Sources/RTAnalyticSource';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';


import vtkMouseRangeManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseRangeManipulator';
// import Manipulators from '@kitware/vtk.js/Interaction/Manipulators/MouseRangeManipulator';

const { SlicingMode } = vtkImageMapper;

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------
const container = document.querySelector('#container');

const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();
const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

// ----------------------------------------------------------------------------
// Example code
// ----------------------------------------------------------------------------

const rtSource = vtkRTAnalyticSource.newInstance();
// rtSource.setWholeExtent(0, 200, 0, 200, 0, 200);
// rtSource.setCenter(100, 100, 100);
// rtSource.setStandardDeviation(0.3);

// renderer.getActiveCamera().setParallelProjection(true);

const mapper = vtkImageMapper.newInstance();
// mapper.setSliceAtFocalPoint(true);
// mapper.setInputConnection(rtSource.getOutputPort());
mapper.setSlicingMode(SlicingMode.K);

const actor = vtkImageSlice.newInstance();
actor.getProperty().setColorWindow(100);
actor.getProperty().setColorLevel(50);
actor.setMapper(mapper);

const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

// wire up the reader to the mapper
mapper.setInputConnection(reader.getOutputPort());

reader
    .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
    .then(() => reader.loadData())
    .then(() => {
        // --- Add volume actor to scene ---
        renderer.addVolume(actor);

        // --- Reset camera and render the scene ---
        renderer.resetCamera();
        renderWindow.render();
    });

const data = rtSource.getOutputData();
const range = data.getPointData().getScalars().getRange();
const wMin = 1;
const wMax = range[1] - range[0];
const wGet = actor.getProperty().getColorWindow;
const wSet = (w) => {
    document.querySelector('.wWidth').textContent = w;
    actor.getProperty().setColorWindow(w);
};
const lMin = range[0];
const lMax = range[1];
const lGet = actor.getProperty().getColorLevel;
const lSet = (l) => {
    document.querySelector('.wLevel').textContent = l;
    actor.getProperty().setColorLevel(l);
};
const extent = data.getExtent();
const kMin = extent[4];
const kMax = extent[5];
const kGet = mapper.getSlice;
console.log("kget" + kGet[0]);
const kSet = (k) => {
    document.querySelector('.sliceNumber').textContent = k;
    mapper.setSlice(k);
};

const rangeManipulator = vtkMouseRangeManipulator.newInstance({
    button: 1,
    scrollEnabled: true,
});
rangeManipulator.setVerticalListener(wMin, wMax, 1, wGet, wSet, 1);
rangeManipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, 1);
rangeManipulator.setScrollListener(kMin, kMax, 1, kGet, kSet, -0.5);

const iStyle = vtkInteractorStyleManipulator.newInstance();
iStyle.addMouseManipulator(rangeManipulator);
renderWindow.getInteractor().setInteractorStyle(iStyle);



renderer.getActiveCamera().setParallelProjection(true);
renderer.addActor(actor);
// renderer.resetCamera();
// renderWindow.render();

// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------


document.querySelector('.wWidth').textContent = wGet();
document.querySelector('.wLevel').textContent = lGet();
document.querySelector('.sliceNumber').textContent = kGet();



document.querySelector('.slicingScale').addEventListener('input', (e) => {
    const scale = Number(e.target.value);
    rangeManipulator.setScrollListener(kMin, kMax, 1, kGet, kSet, scale);
});
document.querySelector('.wWidthScale').addEventListener('input', (e) => {
    const scale = Number(e.target.value);
    rangeManipulator.setVerticalListener(wMin, wMax, 1, wGet, wSet, scale);
});
document.querySelector('.wLevelScale').addEventListener('input', (e) => {
    const scale = Number(e.target.value);
    rangeManipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, scale);
});

// -----------------------------------------------------------
// Make some variables global so that you can inspect and
// modify objects in your browser's developer console:
// -----------------------------------------------------------

global.source = rtSource;
global.mapper = mapper;
global.actor = actor;
global.renderer = renderer;
global.renderWindow = renderWindow;
