
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
document.querySelector('.wWidthScale').min = wMin;
document.querySelector('.wWidthScale').max = wMax;
const wGet = actor.getProperty().getColorWindow;
const wSet = (w) => {
    document.querySelector('.wWidth').textContent = w;
    document.querySelector('.wWidthScale').value = w;
    actor.getProperty().setColorWindow(w);
};
const lMin = range[0];
const lMax = range[1];
document.querySelector('.wLevelScale').min = lMin;
document.querySelector('.wLevelScale').max = lMax;
const lGet = actor.getProperty().getColorLevel;
const lSet = (l) => {
    document.querySelector('.wLevel').textContent = l;
    document.querySelector('.wLevelScale').value = l;
    actor.getProperty().setColorLevel(l);
};
const extent = data.getExtent();
const kMin = extent[4];
const kMax = extent[5];
document.querySelector('.slicingScale').min = kMin;
document.querySelector('.slicingScale').max = kMax;
const kGet = mapper.getSlice;
console.log("kget" + kGet[0]);
const kSet = (k) => {
    document.querySelector('.sliceNumber').textContent = k;
    document.querySelector('.slicingScale').value = k;  //// my chnage
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
    document.querySelector('.sliceNumber').textContent = kSet(scale); //// my chnage
    document.querySelector('.sliceNumber').textContent = kGet(); //// my chnage
    // rangeManipulator.setScrollListener(kMin, kMax, 1, kGet, kSet, scale);
});
document.querySelector('.wWidthScale').addEventListener('input', (e) => {
    const scale = Number(e.target.value);
    document.querySelector('.wWidth').textContent = wSet(scale);
    document.querySelector('.wWidth').textContent = wGet();

});
document.querySelector('.wLevelScale').addEventListener('input', (e) => {
    const scale = Number(e.target.value);
    document.querySelector('.wLevel').textContent = lSet(scale);
    document.querySelector('.wLevel').textContent = lGet();
    // rangeManipulator.setHorizontalListener(lMin, lMax, 1, lGet, lSet, scale);
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


/*
HTML code
   <div id="container">
        <!-- <input type="file" name="choose file" id="getFileDetails"> -->
        <div style="position: absolute;
         left: 25px;
         top: 25px;
         background-color: white;
         border-radius: 5px;
         list-style: none;
         padding: 5px 10px;

         margin: 0px;
         display: block;
         border: 1px solid black; max-width: calc(100% - 70px); max-height: calc(100% - 60px); overflow: auto;">
            <table>
                <tbody>
                    <tr>
                        <td>[Scrolling]</td>
                        <td>Slice Number: </td>
                        <td class="sliceNumber">1</td>
                        <td>- Scale: </td>
                        <td> <input class="slicingScale" type="range" min="-10" max="10" step="1" value="1"> </td>
                    </tr>
                    <tr>
                        <td>[Vertical drag]</td>
                        <td>Window Width: </td>
                        <td class="wWidth">125</td>
                        <td>- Scale: </td>
                        <td> <input class="wWidthScale" type="range" min="0.1" max="5" step="0.1" value="1"> </td>
                    </tr>
                    <tr>
                        <td>[Horizontal drag]</td>
                        <td>Window Level: </td>
                        <td class="wLevel">80</td>
                        <td>- Scale: </td>
                        <td> <input class="wLevelScale" type="range" min="0.1" max="5" step="0.1" value="1"> </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>

*/


/*
// index my code
import '@kitware/vtk.js/favicon';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator';
import vtkMouseCameraTrackballRotateManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkMouseCameraTrackballPanManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseCameraTrackballZoomToMouseManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomToMouseManipulator';
const container = document.querySelector('#container');

const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

const selectMap = {
  leftButton: 1,
  middleButton: 2,
  rightButton: 3,
  // scrollMiddleButton: { scrollEnabled: true, dragEnabled: false },
};



function setInteractor() {
  const interactorStyle = vtkInteractorStyleManipulator.newInstance();
  const rotateOnLeftButtonManipulator = vtkMouseCameraTrackballRotateManipulator.newInstance();
  rotateOnLeftButtonManipulator.setButton(selectMap.leftButton);
  interactorStyle.addMouseManipulator(rotateOnLeftButtonManipulator);

  const panOnRightButtonManipulator = vtkMouseCameraTrackballPanManipulator.newInstance();
  panOnRightButtonManipulator.setButton(selectMap.rightButton);
  interactorStyle.addMouseManipulator(panOnRightButtonManipulator);

  const panOnMiddleButtonManipulator = vtkMouseCameraTrackballPanManipulator.newInstance();
  panOnMiddleButtonManipulator.setButton(selectMap.middleButton);
  interactorStyle.addMouseManipulator(panOnMiddleButtonManipulator);

  const zoomOnMouseScrollManipulator = vtkMouseCameraTrackballZoomToMouseManipulator.newInstance();
  zoomOnMouseScrollManipulator.setScrollEnabled(true);
  interactorStyle.addMouseManipulator(zoomOnMouseScrollManipulator);

  const focalPoint = renderer.getActiveCamera().getFocalPoint();
  interactorStyle.setCenterOfRotation(focalPoint);
  renderWindow.getInteractor().setInteractorStyle(interactorStyle);
}


const fileInput = document.querySelector('#getFileDetails');
fileInput.addEventListener('change', handleFile);

function handleFile(event) {
  const dataTransfer = event.dataTransfer;
  const files = event.target.files || dataTransfer.files;
  if (files.length === 1) {
    const stlReader = vtkSTLReader.newInstance();
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(files[0]);
    fileReader.onloadend = (e) => {
      stlReader.parseAsArrayBuffer(fileReader.result);

      const mapper = vtkMapper.newInstance({ scalarVisibility: false });
      mapper.setInputConnection(stlReader.getOutputPort());

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      renderer.addActor(actor);
      update();
    };
  }
}

function update() {
  renderer.resetCamera();
  renderWindow.render();
  setInteractor();
}

// global.source = reader;
// global.mapper = mapper;
// global.actor = actor;
// global.renderer = renderer;
// global.renderWindow = renderWindow;
*/