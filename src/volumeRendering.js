import '@kitware/vtk.js/Rendering/Profiles/All';
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';  //'@kitware/vtk.js/Rendering/Misc/GenericRenderWindow'

import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper'; 

// --- Set up our renderer ---

const container = document.querySelector('#container');

// We use the wrapper here to abstract out manual RenderWindow/Renderer/OpenGLRenderWindow setup
const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();


// --- Set up the volume actor ---

const actor = vtkVolume.newInstance();
const mapper = vtkVolumeMapper.newInstance();

//opacity
const piecewiseFun = vtkPiecewiseFunction.newInstance();

//color transfer Function
const lookupTable = vtkColorTransferFunction.newInstance();

for (let i = 0; i<=8; i++){
 piecewiseFun.addPoint(i*32,i/8); 
}

// lookupTable.applyColorMap(vtkColorMaps.getPresetByName('Cool to Warm'));
lookupTable.applyColorMap(vtkColorMaps.getPresetByName('erdc_rainbow_bright'));
console.log(vtkColorMaps)
// lookupTable.applyColorMap
 lookupTable.setMappingRange(0,256);
lookupTable.updateRange();


actor.getProperty().setScalarOpacity(0,piecewiseFun);

actor.getProperty().setRGBTransferFunction(0,lookupTable);

// tell the actor which mapper to use
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