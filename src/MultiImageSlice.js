
import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Volume';

// Force DataAccessHelper to have access to various data source

// import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
// import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';


const genericRenderWindow = vtkGenericRenderWindow.newInstance();
const container = document.querySelector('#container');
genericRenderWindow.setContainer(container);
genericRenderWindow.resize();
const renderWindow = genericRenderWindow.getRenderWindow();
const renderer = genericRenderWindow.getRenderer();

const imageActorI = vtkImageSlice.newInstance();
const imageActorJ = vtkImageSlice.newInstance();
const imageActorK = vtkImageSlice.newInstance();

renderer.addActor(imageActorI);
renderer.addActor(imageActorJ);
renderer.addActor(imageActorK);

function updateColorLevel(e) {
    // console.log(e);
    const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorLevel')).value //ternary operator
        // (document.querySelector('.colorLevel')).value
        // e.target.value
    );
    imageActorI.getProperty().setColorLevel(colorLevel);  //I means sagital 
    imageActorJ.getProperty().setColorLevel(colorLevel);  //J means Coronal 
    imageActorK.getProperty().setColorLevel(colorLevel);  //K means axial
    renderWindow.render();
}

// if (e) {
//   value = e.target
// } else {
//   document.querySelector('.colorLevel')
// }

// value.value;

function updateColorWindow(e) {
    const colorLevel = Number(
        (e ? e.target : document.querySelector('.colorWindow')).value
    );
    imageActorI.getProperty().setColorWindow(colorLevel);
    imageActorJ.getProperty().setColorWindow(colorLevel);
    renderWindow.render();
}

const reader = vtkHttpDataSetReader.newInstance({
    fetchGzip: true,
});
reader
    .setUrl('https://kitware.github.io/vtk-js/data/volume/LIDC2.vti', { loadData: true })
    .then(() => {
        const data = reader.getOutputData();
        const dataRange = data.getPointData().getScalars().getRange();
        const extent = data.getExtent();

        const imageMapperK = vtkImageMapper.newInstance();
        imageMapperK.setInputData(data);
        imageMapperK.setKSlice(30);
        imageActorK.setMapper(imageMapperK);

        const imageMapperJ = vtkImageMapper.newInstance();
        imageMapperJ.setInputData(data);
        imageMapperJ.setJSlice(30);
        imageActorJ.setMapper(imageMapperJ);

        const imageMapperI = vtkImageMapper.newInstance();
        imageMapperI.setInputData(data);
        imageMapperI.setISlice(30);
        imageActorI.setMapper(imageMapperI);

        renderer.resetCamera();
        renderer.resetCameraClippingRange();
        renderWindow.render();

        ['.sliceI', '.sliceJ', '.sliceK'].forEach((selector, idx) => {
            // ['.sliceI'].forEach((selector, idx) => {
            // console.log(data.getExtent());
            console.log(idx);
            const el = document.querySelector(selector);
            el.setAttribute('min', extent[idx * 2 + 0]);
            el.setAttribute('max', extent[idx * 2 + 1]);
            el.setAttribute('value', 30);
        });

        ['.colorLevel', '.colorWindow'].forEach((selector) => {
            document.querySelector(selector).setAttribute('max', dataRange[1]);
            document.querySelector(selector).setAttribute('value', dataRange[1]);
        });
        document
            .querySelector('.colorLevel')
            .setAttribute('value', (dataRange[0] + dataRange[1]) / 2);
        updateColorLevel();
        updateColorWindow();
    });

document.querySelector('.sliceI').addEventListener('input', (e) => {
    imageActorI.getMapper().setISlice(Number(e.target.value));
    renderWindow.render();
});

document.querySelector('.sliceJ').addEventListener('input', (e) => {
    imageActorJ.getMapper().setJSlice(Number(e.target.value));
    renderWindow.render();
});

document.querySelector('.sliceK').addEventListener('input', (e) => {
    imageActorK.getMapper().setKSlice(Number(e.target.value));
    renderWindow.render();
});

document
    .querySelector('.colorLevel')
    .addEventListener('input', updateColorLevel);
document
    .querySelector('.colorWindow')
    .addEventListener('input', updateColorWindow);

global.fullScreen = genericRenderWindow;
global.imageActorI = imageActorI;
global.imageActorJ = imageActorJ;
global.imageActorK = imageActorK;


/*
HTML 
 <!-- <div style="position: absolute; 
            left: 25px;
             top: 25px;
             background-color: white;
             border-radius: 5px;
             list-style: none;
             padding: 5px 10px;
             margin: 0px; display: block; 
             border: 1px solid black; max-width: calc(100% - 70px); 
             max-height: calc(100% - 60px); overflow: auto;">
        <table>
            <tbody>
                <tr>
                    <td>Slice I</td>
                    <td> <input class="sliceI" type="range" min="0" max="63" step="1" value="30"> </td>
                </tr>
                <tr>
                    <td>Slice J</td>
                    <td> <input class="sliceJ" type="range" min="0" max="63" step="1" value="30"> </td>
                </tr>
                <tr>
                    <td>Slice K</td>
                    <td> <input class="sliceK" type="range" min="0" max="63" step="1" value="30"> </td>
                </tr>
                <tr>
                    <td>Color level</td>
                    <td> <input class="colorLevel" type="range" min="0" max="3926" step="1" value="1963"> </td>
                </tr>
                <tr>
                    <td>ColorWindow</td>
                    <td> <input class="colorWindow" type="range" min="0" max="3926" step="1" value="3926"> </td>
                </tr>
            </tbody>
        </table>
    </div> -->

*/