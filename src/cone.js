import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkCalculator      from '@kitware/vtk.js/Filters/General/Calculator';
import vtkConeSource      from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkOutlineFilter   from '@kitware/vtk.js/Filters/General/OutlineFilter';
import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';

const controlPanel = `
<table>
  <tr>
    <td>
      <select class="representations" style="width: 100%">
        <option value="0">Points</option>
        <option value="1">Wireframe</option>
        <option value="2" selected>Surface</option>
      </select>
    </td>
  </tr>
  <tr>
    <td>
      <input class="resolution" type="range" min="4" max="80" value="6" />
    </td>
  </tr>
</table>
`;

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

// ----------------------------------------------------------------------------
// Example code
// ----------------------------------------------------------------------------

const coneSource = vtkConeSource.newInstance({ height: 1.0 });
const filter = vtkCalculator.newInstance();
const outlineFilter = vtkOutlineFilter.newInstance();

filter.setInputConnection(coneSource.getOutputPort());
filter.setFormula({
  getArrays: inputDataSets => ({
    input: [],
    output: [
      { location: FieldDataTypes.CELL, name: 'Random', dataType: 'Float32Array', attribute: AttributeTypes.SCALARS },
    ],
  }),
  evaluate: (arraysIn, arraysOut) => {
    const [scalars] = arraysOut.map(d => d.getData());
    for (let i = 0; i < scalars.length; i++) {
      scalars[i] = Math.random();
    }
  },
});

outlineFilter.setInputConnection(coneSource.getOutputPort());

const outlineActor = vtkActor.newInstance();
const outlineMapper = vtkMapper.newInstance();
outlineActor.setMapper(outlineMapper);

outlineMapper.setInputConnection(outlineFilter.getOutputPort());



const mapper = vtkMapper.newInstance();
mapper.setInputConnection(filter.getOutputPort());

const actor = vtkActor.newInstance();
actor.setMapper(mapper);

renderer.addActor(actor);
renderer.addActor(outlineActor);

renderer.resetCamera();
renderWindow.render();

// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------

fullScreenRenderer.addController(controlPanel);
const representationSelector = document.querySelector('.representations');
const resolutionChange = document.querySelector('.resolution');

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  actor.getProperty().setRepresentation(newRepValue);
  renderWindow.render();
});

resolutionChange.addEventListener('input', (e) => {
  const resolution = Number(e.target.value);
  coneSource.setResolution(resolution);
  renderWindow.render();
});




/*import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';

import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkOutlineFilter from '@kitware/vtk.js/Filters/General/OutlineFilter';

// const container = document.querySelector('div.xyz');
const container = document.getElementById('container');
//const container = document.querySelector('#container');

// We use the wrapper here to abstract out manual RenderWindow/Renderer/OpenGLRenderWindow setup
const genericRenderWindow = vtkGenericRenderWindow.newInstance();
genericRenderWindow.setContainer(container);
genericRenderWindow.getOpenGLRenderWindow().setSize(container.clientWidth, container.clientHeight);
genericRenderWindow.resize();

const renderer = genericRenderWindow.getRenderer();
const renderWindow = genericRenderWindow.getRenderWindow();

console.log("Test.js");
// --- Set up the cone actor ---

const actor = vtkActor.newInstance();
const mapper = vtkMapper.newInstance();

// this generates a cone
const coneSource = vtkConeSource.newInstance({
  height: 10.0, radius: 5.0,
});
 const filter = vtkOutlineFilter.newInstance();


// the mapper reads in the cone polydata
// this sets up a pipeline: coneSource -> mapper
mapper.setInputConnection(coneSource.getOutputPort());

// tell the actor which mapper to use
actor.setMapper(mapper);



filter.setInputConnection(coneSource.getOutputPort());

const outlineActor = vtkActor.newInstance();
const outlineMapper = vtkMapper.newInstance();
outlineActor.setMapper(outlineMapper);

outlineMapper.setInputConnection(filter.getOutputPort());


// --- Add actor to scene ---

renderer.addActor(actor);
renderer.addActor(outlineActor);

// --- Reset camera and render the scene ---

renderer.resetCamera();
renderWindow.render();*/