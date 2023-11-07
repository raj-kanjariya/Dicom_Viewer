import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import ImageConstants from '@kitware/vtk.js/Rendering/Core/ImageMapper/Constants';

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

    // --- Reset camera and render the scene ---
    renderer.resetCamera();
    renderWindow.render();
  });


// --- Expose globals so we can play with values in the dev console ---

global.renderWindow = renderWindow;
global.renderer = renderer;
global.actor = actor;
global.mapper = mapper;