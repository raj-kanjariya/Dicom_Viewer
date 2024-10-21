import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';   //it is for 
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
// import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
// import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageReslice from '@kitware/vtk.js/Imaging/Core/ImageReslice';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkResliceCursorWidget from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget';
import widgetBehavior from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/behavior';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';
import vtkITKHelper from '@kitware/vtk.js/Common/DataModel/ITKHelper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';


import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import { CaptureOn } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants';

import { vec3 } from 'gl-matrix';
import { SlabMode } from '@kitware/vtk.js/Imaging/Core/ImageReslice/Constants';

import { xyzToViewType } from '@kitware/vtk.js/Widgets/Widgets3D/ResliceCursorWidget/Constants';

// Force the loading of HttpDataAccessHelper to support gzip decompression
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';

// ----------------------------------------------------------------------------
// Define main attributes
// ----------------------------------------------------------------------------

const viewColors = [
  [1, 0, 0], // sagittal
  [0, 1, 0], // coronal
  [0, 0, 1], // axial
  [1, 0.6, 0.3], // 3D
];

const fileInput = document.querySelector('#fileInput');

const stlReader = vtkSTLReader.newInstance();

const viewAttributes = [];
const widget = vtkResliceCursorWidget.newInstance();
const widgetState = widget.getWidgetState();
// Set size in CSS pixel space because scaleInPixels defaults to true
widgetState.getStatesWithLabel('sphere').forEach((handle) => handle.setScale1(20));
// const showDebugActors = true;

// const appCursorStyles = {
//   translateCenter: 'move',
//   rotateLine: 'alias',
//   translateAxis: 'pointer',
//   default: 'default',
// };

// ----------------------------------------------------------------------------
// Define html structure
// ----------------------------------------------------------------------------

const container = document.querySelector('#container');
const checkboxTranslation = document.getElementById('checkboxTranslation');
const checkboxShowRotation = document.getElementById('checkboxShowRotation');
const checkboxRotation = document.getElementById('checkboxRotation');
const checkboxOrthogonality = document.getElementById('checkboxOrthogonality');

// ----------------------------------------------------------------------------
// Setup rendering code
// ----------------------------------------------------------------------------

/**
 * Function to create synthetic image data with correct dimensions
 * Can be use for debug
 * @param {Array[Int]} dims
 */
// eslint-disable-next-line no-unused-vars

function createRGBStringFromRGBValues(rgb) {
  if (rgb.length !== 3) {
    return 'rgb(0, 0, 0)';
  }
  return `rgb(${(rgb[0] * 255).toString()}, ${(rgb[1] * 255).toString()}, ${(
    rgb[2] * 255
  ).toString()})`;
}

const initialPlanesState = { ...widgetState.getPlanes() };

for (let i = 0; i < 4; i++) {
  const element = document.createElement('div');
  element.setAttribute('class', 'view' + i);
  element.style.width = '50%';
  element.style.height = '300px';
  element.style.display = 'inline-block';
  container.appendChild(element);

  const grw = vtkGenericRenderWindow.newInstance();
  grw.setContainer(element);
  grw.resize();
  const obj = {
    renderWindow: grw.getRenderWindow(),
    renderer: grw.getRenderer(),
    GLWindow: grw.getOpenGLRenderWindow(),
    interactor: grw.getInteractor(),
    widgetManager: vtkWidgetManager.newInstance(),
    orientationWidget: null,
  };

  obj.renderer.getActiveCamera().setParallelProjection(true);
  obj.renderer.setBackground(...viewColors[i]);
  obj.renderWindow.addRenderer(obj.renderer);
  obj.renderWindow.addView(obj.GLWindow);
  obj.renderWindow.setInteractor(obj.interactor);
  obj.interactor.setView(obj.GLWindow);
  obj.interactor.initialize();
  obj.interactor.bindEvents(element);
  obj.widgetManager.setRenderer(obj.renderer);
  if (i < 3) {
    obj.interactor.setInteractorStyle(vtkInteractorStyleImage.newInstance());
    obj.widgetInstance = obj.widgetManager.addWidget(widget, xyzToViewType[i]);
    obj.widgetInstance.setScaleInPixels(true);
    obj.widgetInstance.setKeepOrthogonality(checkboxOrthogonality.checked);
    // obj.widgetInstance.setCursorStyles(appCursorStyles);
    obj.widgetManager.enablePicking();
    // Use to update all renderers buffer when actors are moved
    obj.widgetManager.setCaptureOn(CaptureOn.MOUSE_MOVE);
  } else {
    obj.interactor.setInteractorStyle(
      vtkInteractorStyleTrackballCamera.newInstance()
    );
    stlLoader(obj.renderer, obj.renderWindow);
  }

  obj.reslice = vtkImageReslice.newInstance();
  obj.reslice.setSlabMode(SlabMode.MEAN);
  obj.reslice.setSlabNumberOfSlices(1);
  obj.reslice.setTransformInputSampling(false);
  obj.reslice.setAutoCropOutput(true);
  obj.reslice.setOutputDimensionality(2);
  obj.resliceMapper = vtkImageMapper.newInstance();
  obj.resliceMapper.setInputConnection(obj.reslice.getOutputPort());
  obj.resliceActor = vtkImageSlice.newInstance();
  obj.resliceActor.setMapper(obj.resliceMapper);
  obj.sphereActors = [];
  obj.sphereSources = [];

  // Create sphere for each 2D views which will be displayed in 3D
  // Define origin, point1 and point2 of the plane used to reslice the volume
  // for (let j = 0; j < 3; j++) {
  //   const sphere = vtkSphereSource.newInstance();
  //   sphere.setRadius(10);
  //   const mapper = vtkMapper.newInstance();
  //   mapper.setInputConnection(sphere.getOutputPort());
  //   const actor = vtkActor.newInstance();
  //   actor.setMapper(mapper);
  //   actor.getProperty().setColor(...viewColors[i]);
  //   actor.setVisibility(showDebugActors);
  //   obj.sphereActors.push(actor);
  //   obj.sphereSources.push(sphere);
  // }

  if (i < 3) {
    viewAttributes.push(obj);
  }

  // create axes
  const axes = vtkAnnotatedCubeActor.newInstance();
  axes.setDefaultStyle({
    text: '+X',
    fontStyle: 'bold',
    fontFamily: 'Arial',
    fontColor: 'black',
    fontSizeScale: (res) => res / 2,
    faceColor: createRGBStringFromRGBValues(viewColors[0]),
    faceRotation: 0,
    edgeThickness: 0.1,
    edgeColor: 'black',
    resolution: 400,
  });
  // axes.setXPlusFaceProperty({ text: '+X' });
  axes.setXMinusFaceProperty({
    text: '-X',
    faceColor: createRGBStringFromRGBValues(viewColors[0]),
    faceRotation: 90,
    fontStyle: 'italic',
  });
  axes.setYPlusFaceProperty({
    text: '+Y',
    faceColor: createRGBStringFromRGBValues(viewColors[1]),
    fontSizeScale: (res) => res / 4,
  });
  axes.setYMinusFaceProperty({
    text: '-Y',
    faceColor: createRGBStringFromRGBValues(viewColors[1]),
    fontColor: 'white',
  });
  axes.setZPlusFaceProperty({
    text: '+Z',
    faceColor: createRGBStringFromRGBValues(viewColors[2]),
  });
  axes.setZMinusFaceProperty({
    text: '-Z',
    faceColor: createRGBStringFromRGBValues(viewColors[2]),
    faceRotation: 45,
  });

  // create orientation widget
  obj.orientationWidget = vtkOrientationMarkerWidget.newInstance({
    actor: axes,
    interactor: obj.renderWindow.getInteractor(),
  });
  obj.orientationWidget.setEnabled(true);
  obj.orientationWidget.setViewportCorner(
    vtkOrientationMarkerWidget.Corners.TOP_RIGHT
  );
  obj.orientationWidget.setViewportSize(0.15);
  obj.orientationWidget.setMinPixelSize(100);
  obj.orientationWidget.setMaxPixelSize(200);
}


function stlLoader(renderer, rendererwindow) {
  const mapper = vtkMapper.newInstance({ scalarVisibility: false });
  const actor = vtkActor.newInstance();
  // console.log(actor);
  actor.setMapper(mapper);
  mapper.setInputConnection(stlReader.getOutputPort());

  function update() {
    renderer.addActor(actor);
    renderer.resetCamera();
    rendererwindow.render();
  }

  const fileInput = document.querySelector('#getStlFileDetails');

  function handleFile(event) {
    event.preventDefault();
    const dataTransfer = event.dataTransfer;
    const files = event.target.files || dataTransfer.files;
    if (files.length === 1) {
      const fileReader = new FileReader();
      fileReader.onload = function onLoad(e) {
        stlReader.parseAsArrayBuffer(fileReader.result);
        update();
      };
      fileReader.readAsArrayBuffer(files[0]);
    }
  }
  fileInput.addEventListener('change', handleFile);
}

// ----------------------------------------------------------------------------
// Load image
// ----------------------------------------------------------------------------

function updateReslice(
  interactionContext = {
    viewType: '',
    reslice: null,
    actor: null,
    renderer: null,
    resetFocalPoint: false, // Reset the focal point to the center of the display image
    keepFocalPointPosition: false, // Defines if the focal point position is kepts (same display distance from reslice cursor center)
    computeFocalPointOffset: false, // Defines if the display offset between reslice center and focal point has to be
    // computed. If so, then this offset will be used to keep the focal point position during rotation.
    spheres: null,
  }
) {
  const modified = widget.updateReslicePlane(
    interactionContext.reslice,
    interactionContext.viewType
  );
  if (modified) {
    const resliceAxes = interactionContext.reslice.getResliceAxes();
    // Get returned modified from setter to know if we have to render
    interactionContext.actor.setUserMatrix(resliceAxes);
    // console.log("interaction", interactionContext.reslice);
    console.log(interactionContext.actor.pick());
    // const planeSource = widget.getPlaneSource(interactionContext.viewType);
    // interactionContext.sphereSources[0].setCenter(planeSource.getOrigin());
    // interactionContext.sphereSources[1].setCenter(planeSource.getPoint1());
    // interactionContext.sphereSources[2].setCenter(planeSource.getPoint2());
  }
  widget.updateCameraPoints(
    interactionContext.renderer,
    interactionContext.viewType,
    interactionContext.resetFocalPoint,
    interactionContext.keepFocalPointPosition,
    interactionContext.computeFocalPointOffset
  );
  return modified;
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
        widget.setImage(vtkImage);
        set3dScen(vtkImage);

      });
    });
  }
  else {
    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    reader.setUrl(`https://kitware.github.io/vtk-js/data/volume/LIDC2.vti`).then(() => {
      reader.loadData().then(() => {
        const image = reader.getOutputData();
        widget.setImage(image);
        set3dScen(image);
      });
    });
  }
}
loadDataset(true);

function set3dScen(image) {
  viewAttributes.forEach((obj, i) => {
    obj.reslice.setInputData(image);
    obj.renderer.addActor(obj.resliceActor);
    obj.sphereActors.forEach((actor) => {
      obj.renderer.addActor(actor);
    });
    const reslice = obj.reslice;
    const viewType = xyzToViewType[i];

    viewAttributes
      // No need to update plane nor refresh when interaction
      // is on current view. Plane can't be changed with interaction on current
      // view. Refreshs happen automatically with `animation`.
      // Note: Need to refresh also the current view because of adding the mouse wheel
      // to change slicer
      .forEach((v) => {
        // Interactions in other views may change current plane
        v.widgetInstance.onInteractionEvent(
          // computeFocalPointOffset: Boolean which defines if the offset between focal point and
          // reslice cursor display center has to be recomputed (while translation is applied)
          // canUpdateFocalPoint: Boolean which defines if the focal point can be updated because
          // the current interaction is a rotation
          ({ computeFocalPointOffset, canUpdateFocalPoint }) => {
            const activeViewType = widget
              .getWidgetState()
              .getActiveViewType();
            const keepFocalPointPosition =
              activeViewType !== viewType && canUpdateFocalPoint;
            updateReslice({
              viewType,
              reslice,
              actor: obj.resliceActor,
              renderer: obj.renderer,
              resetFocalPoint: false,
              keepFocalPointPosition,
              computeFocalPointOffset,
              sphereSources: obj.sphereSources,
            });
          }
        );
      });

    updateReslice({
      viewType,
      reslice,
      actor: obj.resliceActor,
      renderer: obj.renderer,
      resetFocalPoint: true, // At first initilization, center the focal point to the image center
      keepFocalPointPosition: false, // Don't update the focal point as we already set it to the center of the image
      computeFocalPointOffset: true, // Allow to compute the current offset between display reslice center and display focal point
      sphereSources: obj.sphereSources,
    });
    obj.interactor.render();
  });
  // set max number of slices to slider.
  const maxNumberOfSlices = vec3.length(image.getDimensions());
  document.getElementById('slabNumber').max = maxNumberOfSlices;
}

// ----------------------------------------------------------------------------
// Define panel interactions
// ----------------------------------------------------------------------------
function updateViews() {
  viewAttributes.forEach((obj, i) => {
    updateReslice({
      viewType: xyzToViewType[i],
      reslice: obj.reslice,
      actor: obj.resliceActor,
      renderer: obj.renderer,
      resetFocalPoint: true,
      keepFocalPointPosition: false,
      computeFocalPointOffset: true,
      sphereSources: obj.sphereSources,
      resetViewUp: true,
    });
    obj.renderWindow.render();
  });
}

checkboxTranslation.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj) =>
    obj.widgetInstance.setEnableTranslation(checkboxTranslation.checked)
  );
});

checkboxShowRotation.addEventListener('change', (ev) => {
  widgetState
    .getStatesWithLabel('rotation')
    .forEach((handle) => handle.setVisible(checkboxShowRotation.checked));
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
  checkboxRotation.checked = checkboxShowRotation.checked;
  checkboxRotation.disabled = !checkboxShowRotation.checked;
  checkboxRotation.dispatchEvent(new Event('change'));
});

checkboxRotation.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj) =>
    obj.widgetInstance.setEnableRotation(checkboxRotation.checked)
  );
  checkboxOrthogonality.disabled = !checkboxRotation.checked;
  checkboxOrthogonality.dispatchEvent(new Event('change'));
});

checkboxOrthogonality.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj) =>
    obj.widgetInstance.setKeepOrthogonality(checkboxOrthogonality.checked)
  );
});

const checkboxScaleInPixels = document.getElementById('checkboxScaleInPixels');
checkboxScaleInPixels.addEventListener('change', (ev) => {
  widget.setScaleInPixels(checkboxScaleInPixels.checked);
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
});

const opacity = document.getElementById('opacity');
opacity.addEventListener('input', (ev) => {
  const opacityValue = document.getElementById('opacityValue');
  opacityValue.innerHTML = ev.target.value;
  widget
    .getWidgetState()
    .getStatesWithLabel('handles')
    .forEach((handle) => handle.setOpacity(ev.target.value));
  viewAttributes.forEach((obj) => {
    obj.interactor.render();
  });
});

const optionSlabModeMin = document.getElementById('slabModeMin');
optionSlabModeMin.value = SlabMode.MIN;
const optionSlabModeMax = document.getElementById('slabModeMax');
optionSlabModeMax.value = SlabMode.MAX;
const optionSlabModeMean = document.getElementById('slabModeMean');
optionSlabModeMean.value = SlabMode.MEAN;
const optionSlabModeSum = document.getElementById('slabModeSum');
optionSlabModeSum.value = SlabMode.SUM;
const selectSlabMode = document.getElementById('slabMode');
selectSlabMode.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj) => {
    obj.reslice.setSlabMode(Number(ev.target.value));
  });
  updateViews();
});

const sliderSlabNumberofSlices = document.getElementById('slabNumber');
sliderSlabNumberofSlices.addEventListener('change', (ev) => {
  const trSlabNumberValue = document.getElementById('slabNumberValue');
  trSlabNumberValue.innerHTML = ev.target.value;
  viewAttributes.forEach((obj) => {
    obj.reslice.setSlabNumberOfSlices(ev.target.value);
  });
  updateViews();
});

const buttonReset = document.getElementById('buttonReset');
buttonReset.addEventListener('click', () => {
  widgetState.setPlanes({ ...initialPlanesState });
  widget.setCenter(widget.getWidgetState().getImage().getCenter());
  updateViews();
});

const selectInterpolationMode = document.getElementById('selectInterpolation');
selectInterpolationMode.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj) => {
    obj.reslice.setInterpolationMode(Number(ev.target.selectedIndex));
  });
  updateViews();
});

const checkboxWindowLevel = document.getElementById('checkboxWindowLevel');
checkboxWindowLevel.addEventListener('change', (ev) => {
  viewAttributes.forEach((obj, index) => {
    if (index < 3) {
      obj.interactor.setInteractorStyle(
        checkboxWindowLevel.checked
          ? vtkInteractorStyleImage.newInstance()
          : vtkInteractorStyleTrackballCamera.newInstance()
      );
    }
  });

});

document.querySelector(`.view0`).addEventListener(`click`, (e) => {
  const box = document.querySelector(`.view0`).getBoundingClientRect();
  console.log(box);
});