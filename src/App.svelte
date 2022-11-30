<script>
  import { onMount } from 'svelte';

  import Fa from 'svelte-fa'
  import { faHome, faEraser, faPen, 
    faCircle, faSquare, faLayerGroup, 
    faEye, faPlus, faArrowsUpDownLeftRight, 
    faFlag, faUndo, faRedo, faMagnifyingGlassPlus, faMagnifyingGlassMinus, faPaintbrush} from '@fortawesome/free-solid-svg-icons'

  import BlockSlider from './lib/BlockSlider.svelte';
  import BlockButton from './lib/BlockButton.svelte';
  import BlockRadio from './lib/BlockRadio.svelte';
  import BlockLayers from './lib/BlockLayers.svelte';
  import BlockColor from './lib/BlockColor.svelte';
  import BlockTextentry from './lib/BlockTextentry.svelte';

  import Model from './lib/model/Model.svelte'

  import { modelOpen, modelState, canvasList, selectedColor, simpleMode } from './stores/stores.js'

  import { FastPaintCore } from './core/core.js'

  let open;
  let canvasName = "untitled";
  let openCanvasHash = null;
  let core;

  let mode = FastPaintCore.brushModeDraw;
  let shape = FastPaintCore.brushToolCircle;
  let size = 20;
  let color = [0, 0, 0];
  let alpha = 255;

  let svColor = "#000000"

  let layerList = [];

  let selectedLayer = 0;
  
  modelOpen.subscribe(value => {
    open = value;
  })

  function openFiles(){
    /*
    //save canvas
    const content = core.exportDataURL();
    canvasList.set([...$canvasList, {'name': canvasName, 'content': content}])
    */
    if(core.edited){
      saveData();
    }
    
    modelOpen.set(true)
    modelState.set('files')
  }

  function saveData(){
    const saveObject = core.dehydrate(canvasName)

    if(!openCanvasHash){
      canvasList.new(saveObject)
    }
    else{
      //saveObject.id = openCanvasHash;
      canvasList.update(openCanvasHash, saveObject)
    }
    
  }

  function loadData(file){
    let drawConfigObject = {
      color: [...color, alpha],
      size: size,
      mode: mode,
      shape: shape
    }

    core.hydrate(file, drawConfigObject)

    calcUIState()
  }

  let drawConfigObject = {
    color: [...color, alpha],
    size: size,
    mode: mode,
    shape: shape
  }

  onMount(async () => {
    core = new FastPaintCore(document.getElementById('left-pane'), "guide1");
    await core.setupDraw(400, 400, drawConfigObject)

    calcUIState()
  })

  function changeToolSize(localSize){
    size = localSize;
    core.setToolSize(localSize);
  }

  function changeToolColor(localColor){

    const hexValue = localColor.substring(1);
    const aRgbHex = hexValue.match(/.{1,2}/g);  

    const r = parseInt(aRgbHex[0], 16);
    const g = parseInt(aRgbHex[1], 16); 
    const b = parseInt(aRgbHex[2], 16);

    core.setToolColor(r, g, b);

    const color2 = [r, g, b];
    color = color2;
  }

  function changeToolAlpha(localAlpha){
    alpha = localAlpha;
    core.setAlpha(localAlpha)
  }

  function changeToolShape(key){
    shape = key;
    core.setToolShape(key);
  }

  function changeToolType(key){
    mode = key;
    core.setToolMode(key);
  }

  function colorToHex(color){
    return `#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`;
  }

  function addLayer(){
    core.addLayer();
    calcUIState();
  }

  function selectLayer(layer){
    core.selectLayer(layer);
  }

  function hideLayer(layer){
    core.hideLayer(layer);
    calcUIState();
  }

  function makeNewCanvas(width, height){
    let drawConfigObject = {
      color: [...color, alpha],
      size: size,
      mode: mode,
      shape: shape
    }

    core.newCanvas(width, height, drawConfigObject);

    canvasName = "untitled";

    calcUIState()
  }

  function makeNewCanvasDriver(width, height){
     openCanvasHash = null;
     makeNewCanvas(width, height);
  }

  function loadOldCanvas(file){
    openCanvasHash = file.id;
    makeNewCanvas(file.width, file.height);
    loadData(file);
    canvasName = file.name;
    calcUIState()
  }

  function undoAction(){
    core.undoAction();

    calcUIState()
  }

  function redoAction(){
    core.redoAction();

    calcUIState()
  }

  function zoomInAction(){
    core.zoomIn(false);
  }

  function zoomOutAction(){
    core.zoomOut(false);
  }

  let undoDisabled = true;

  let redoDisabled = true;

  function calcUIState(){
    if(core){
      undoDisabled = core.undoDisabled();
      redoDisabled = core.redoDisabled();

      selectedLayer = core.getSelectedLayer()
      layerList = core.getLayers()
    }
  }

  function changeLayerName(layer, newName){
    core.changeLayerName(layer, newName)
  }

  function deleteLayer(){
    core.deleteSelectedLayer()
    calcUIState()
  }

  function swapLayer(oldLocation, newLocation){
    core.swapLayer(oldLocation, newLocation);
    calcUIState()
  }

  function pickColor(){
    modelOpen.set(true)
    modelState.set('cColor')
  }

  function setColor(){
    //get color from store and set, once we close the color picker model
    changeToolColor($selectedColor)

  }
  
</script>

{#if open}
    <Model 
      makeNewCanvas={makeNewCanvasDriver}
      loadOldCanvas={loadOldCanvas}
      setColor={setColor}
      />
  {/if}

<main>
  <div id="left-pane" on:mouseup={calcUIState}>
      
  </div>
  
    {#if $simpleMode}
    <div id="compact-right-pane">
      <BlockButton icon={faHome} clickAction={openFiles}/>
      <BlockButton icon={faPaintbrush} />
      <BlockButton icon={faLayerGroup} />
      <BlockColor clickAction={pickColor}/>
      <BlockButton icon={faUndo} clickAction={undoAction} disabled={undoDisabled}/>
    </div>
    {:else}
    <div id="right-pane">
      <div class="block-group">
        <BlockButton icon={faHome} clickAction={openFiles}/>
        <BlockTextentry value={canvasName}/>
      </div>

      <div class="block-group">
      <BlockRadio 
        options={[
          {
            icon: faEraser,
            key: FastPaintCore.brushModeErase
          },
          {
            icon: faPen,
            key: FastPaintCore.brushModeDraw
          },
          {
            icon: faArrowsUpDownLeftRight,
            key: FastPaintCore.brushModeMove
          }
        ]} onChange={changeToolType} choice={mode}/>
      </div>

      <div class="block-group">
      <BlockRadio
        options={[
          {
            icon: faCircle,
            key: 0
          },
          {
            icon: faSquare,
            key: 1
          }
        ]} onChange={changeToolShape} choice={shape}/>
      </div>

      <div class="block-group">
        <BlockSlider min={0} max={100} value={size} onChange={changeToolSize}/>
        
        <BlockColor clickAction={pickColor}/>
      </div>

      <div class="block-group">
        <div class="block-1 block">
            <Fa icon={faFlag} size="lg"/>
        </div>

        <BlockSlider min={0} max={255} value={alpha} onChange={changeToolAlpha}/>
      </div>

      <div class="block-group">
        <BlockButton icon={faUndo} clickAction={undoAction} disabled={undoDisabled}/>
        <BlockButton icon={faRedo} clickAction={redoAction} disabled={redoDisabled}/> 

        <BlockButton icon={faMagnifyingGlassPlus} clickAction={zoomInAction}/>
        <BlockButton icon={faMagnifyingGlassMinus} clickAction={zoomOutAction}/>
      </div>

      <BlockLayers
        addLayerAction={addLayer}
        selectLayerAction={selectLayer}
        hideLayerAction={hideLayer}
        layerList={layerList}
        changeLayerNameAction={changeLayerName}
        deleteLayerAction={deleteLayer}
        swapLayerAction={swapLayer}
        bind:selectedLayer={selectedLayer}
      />

      <div class="block-group">
        <canvas id="guide1" class="block-guide"></canvas>
      </div>
      </div>
    {/if}
    
</main>

<style global>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    display: flex;
    height:  100vh;
  }

  #left-pane {
    height:  100vh;
    flex:  1;
  }

  #right-pane{
    width: 200px;
    height: 100%;
    background-color: white;

    display:  flex;
    flex-direction: column;

    align-content: flex-start;
    padding: 2px;

    overflow: hidden;

    border-left: 1px solid black;
  }

  #compact-right-pane {
    width: 54px;
    height: 100%;
    background-color: white;
    overflow: hidden;
    border-left: 1px solid black;

    display:  flex;
    flex-direction: column;
    align-content: flex-start;
    row-gap: 0.5px;
    margin-top: 1px;
  }

  #right-pane > * {
  }

  .block-1{
    width:  50px;
    height:  50px;
  }

  .block-2{
    width:  100px;
    height:  50px;
  }

  .block-3{
    width:  150px;
    height:  50px;
  }

  .block-4{
    width:  200px;
    height:  50px;
  }

  .block {
    display: flex;
    align-items: center;
    justify-content: center;
    padding:  2px;
  }

  .block-row {
    display:  flex;
    flex-direction: row;
    flex-flow:  row wrap;

    align-content: flex-start;
  }

  .block-border {
    
  }

  .block-color {
    border-radius: 0px;
    width:  30px;
    height:  30px;
    content:  '';
    padding:  0px;
    -webkit-appearance: none;
    border:  none;
    background-color: transparent;
  }

  .block-color::-webkit-color-swatch-wrapper {
  padding: 0;
  border:  none;
  }
  .block-color::-webkit-color-swatch {
    border: none;
  }

  .block-text{
    font-size: 20px;
  }

  .block-textentry {
    background-color: transparent;
    border:  1px solid black;
    width: 80%;
  }

  .block-guide {
    margin:  2px;
    outline:  1px solid black;

    width:  196px;
  }

  .block-text:focus {
    border: 2px solid black;
    outline: none;
  }

  .block button {
    border:  none;
    background-color: transparent;
    height:  100%;
    width:  100%;
  }

  .block button:hover{
    background-color: #0abab5;
  }

  .selected{
    background-color: #0abab5;
  }

  :global(body){
    padding:  0px;
    margin:  0px;
    overflow: hidden;
  }

  .block-group{
    display:  flex;
    flex-direction: row;
  }

  @media (max-width: 480px) {
    main {
      flex-direction: column;
      display: inline-block;
      width:  100%;
    }

    #right-pane {
      width:  100%;
      height:  100vh;
      overflow: scroll;
    }

    #left-pane {
      width:  100%;
      height: 80vh;
      flex:  none;
    }

    :global(body){
      overflow-y:  hidden;
      overflow-x: hidden;
    }

    :global(html){
      width:100%;
      overflow-x: hidden;
      overflow-y: hidden;
    }
  }
</style>
