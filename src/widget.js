/*import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import ImageConstants from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';
import vtkImageCroppingWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget'; //'@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget'
import vtkImageCropFilter from '@kitware/vtk.js/Filters/General/ImageCropFilter';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkInteractorStyleImage from '@kitware/vtk.js/Interaction/Style/InteractorStyleImage';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';

const { SlicingMode } = ImageConstants;
console.log("this is check" + vtkImageMapper);

// --- Set up our renderer ---

const container = document.querySelector('#container');

// We use the wrapper here to abstract out manual RenderWindow/Renderer/OpenGLRenderWindow setup
const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

// renderer camera to parallel projection
renderer.getActiveCamera().setParallelProjection(true);

//widget manager and widget
const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);

//this is a widget factory
const widget = vtkImageCroppingWidget.newInstance();
//this is an instance of a widget associated with a renderer
const viewWidget = widgetManager.addWidget(widget);

//set up crop filter
const cropFilter = vtkImageCropFilter.newInstance();
//we listen to cropping widget state to inform the crop filter
const cropState = widget.getWidgetState().getCroppingPlanes();
cropState.onModified(() =>
  cropFilter.setCroppingPlanes(cropState.getPlanes())
);

// --- Set up interactor style for image slicing

const istyle = vtkInteractorStyleImage.newInstance();
istyle.setInteractionMode('IMAGE_SLICING');
renderWindow.getInteractor().setInteractorStyle(istyle);


// --- Set up the slicing actor ---

const actor = vtkImageSlice.newInstance();
const mapper = vtkImageMapper.newInstance();

mapper.setSliceAtFocalPoint(true);
mapper.setSlicingMode(SlicingMode.Z);

// tell the actor which mapper to use


// --- set up default window/level ---

actor.getProperty().setColorWindow(255);
actor.getProperty().setColorLevel(127);
actor.setMapper(mapper);


// --- load remote dataset ---
const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });

// wire up the reader to the mapper
mapper.setInputConnection(reader.getOutputPort());

reader
  .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
  .then(() => reader.loadData())
  .then(() => {
    // --- Add volume actor to scene ---
    renderer.addVolume(actor);

    const image = reader.getOutputData();
    cropFilter.setCroppingPlanes(...image.getExtent());
    widget.copyImageDataDescription(image);

    // --- Reset camera and render the scene ---
    renderer.resetCamera();
    renderWindow.render();

    widgetManager.enablePicking();
    renderWindow.render();

  });


// --- Expose globals so we can play with values in the dev console ---

global.renderWindow = renderWindow;
global.renderer = renderer;
global.actor = actor;
global.mapper = mapper;

*/









// Crop Widget
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';

import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import httpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';

import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';

import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkImageCroppingWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImageCroppingWidget';
import vtkImageCropFilter from '@kitware/vtk.js/Filters/General/ImageCropFilter';


const container = document.querySelector('#container');

// We use the wrapper here to abstract out manual RenderWindow/Renderer/OpenGLRenderWindow setup
const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

const mapper = vtkVolumeMapper.newInstance();
const actor = vtkVolume.newInstance();
actor.setMapper(mapper);

// --- set up our color lookup table and opacity piecewise function
const lookupTable = vtkColorTransferFunction.newInstance();
const piecewiseFun = vtkPiecewiseFunction.newInstance();

// set up color transfer function
lookupTable.applyColorMap(vtkColorMaps.getPresetByName('Cool to Warm'));
// hardcode an initial mapping range here.
// Normally you would instead use the range from
// imageData.getPointData().getScalars().getRange()
lookupTable.setMappingRange(0, 256);
lookupTable.updateRange();

// set up simple linear opacity function
// This assumes a data range of 0 -> 256
for (let i = 0; i <= 8; i++) {
    piecewiseFun.addPoint(i * 32, i / 8);
}

// set the actor properties
actor.getProperty().setRGBTransferFunction(0, lookupTable);
actor.getProperty().setScalarOpacity(0, piecewiseFun);

// setup our widget manager and widget
const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);

// this is a widget factory
const widget = vtkImageCroppingWidget.newInstance();
// this is an instance of a widget associated with a renderer
const viewWidget = widgetManager.addWidget(widget);

// set up crop filter
const cropFilter = vtkImageCropFilter.newInstance();
// we listen to cropping widget state to inform the crop filter
const cropState = widget.getWidgetState().getCroppingPlanes();
cropState.onModified(() => {
    cropFilter.setCroppingPlanes(cropState.getPlanes());
});

// Load remote dataset
const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
// wire up the reader, crop filter and mapper
cropFilter.setInputConnection(reader.getOutputPort());
mapper.setInputConnection(cropFilter.getOutputPort());
reader
    .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti')
    .then(() => reader.loadData())
    .then(() => {
        // --- Add volume actor to scene ---
        renderer.addVolume(actor);

        // update lookup table mapping range based on input dataset
        const range = reader.getOutputData().getPointData().getScalars().getRange();
        lookupTable.setMappingRange(...range);
        lookupTable.updateRange();

        // update crop widget and filter with image info
        const image = reader.getOutputData();
        cropFilter.setCroppingPlanes(...image.getExtent());
        widget.copyImageDataDescription(image);

        // --- Reset camera and render the scene ---
        renderer.resetCamera();
        renderWindow.render();

        // --- Enable interactive picking of widgets ---
        widgetManager.enablePicking();
        // renderWindow.render();
    });