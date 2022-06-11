<script>
  import { onMount } from 'svelte';

  import Fa from 'svelte-fa'
  import { faHome, faEraser, faPen, 
    faCircle, faSquare, faLayerGroup, 
    faEye, faPlus, faArrowsUpDownLeftRight, 
    faFlag, faUndo, faRedo, faMagnifyingGlassPlus, faMagnifyingGlassMinus} from '@fortawesome/free-solid-svg-icons'

  import BlockSlider from './lib/BlockSlider.svelte';
  import BlockButton from './lib/BlockButton.svelte';
  import BlockRadio from './lib/BlockRadio.svelte';
  import BlockLayers from './lib/BlockLayers.svelte';

  import Model from './lib/model/Model.svelte'

  import { modelOpen, modelState, canvasList } from './stores/stores.js'

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

  let layerList = [];

  let selectedLayer = 1;
  
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
    let storedLayers = [];

    const allLayers = core.getLayers();

    for(let i = 0; i < allLayers.length; i++){
      const layer = allLayers[i];

      const layerData = core.exportLayer(layer.pos);

      storedLayers.push({
        'pos': layer.pos, 
        'data': new Uint8Array(layerData), 
        'status': layer.status, 
        'selected': layer.pos == selectedLayer
      });
    }

    const content = core.exportDataURL();

    const saveObject = {
      'name': canvasName,
      'content': content,
      'layers': storedLayers,
      'width': core.width,
      'height': core.height
    }
    
    if(!openCanvasHash){
      canvasList.new(saveObject)
    }
    else{
      //saveObject.id = openCanvasHash;
      canvasList.update(openCanvasHash, saveObject)
    }
    
  }

  function loadData(file){
    //issue might be with selecting the wrong layer. root of problem is showing here anyway
    for(let i = 0; i < file.layers.length; i++){
      const layer = file.layers[i]; 
      
      console.log(layer.data)
      core.importLayer(layer.pos, layer.status, layer.data);

      if(layer.selected){
        selectedLayer = layer.pos;
      }
    }

    layerList = file.layers;

    //this line is causing trouble
    core.selectLayer(selectedLayer);

    /*
      root problem might be that we are blending incorrectly 
    */

    core.updateCanvas(false);
  }

  let drawConfigObject = {
    color: [...color, alpha],
    size: size,
    mode: mode,
    shape: shape
  }

  onMount(async () => {
    core = new FastPaintCore(document.getElementById('left-pane'));
    await core.init(drawConfigObject);

    layerList = core.getLayers();

    console.log(layerList);
  })

  function changeToolSize(localSize){
    size = localSize;
    core.setToolSize(localSize);
  }

  function changeToolColor(localColor){

    const hexValue = localColor.target.value.substring(1);
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
    layerList = core.getLayers();
  }

  function selectLayer(layer){
    core.selectLayer(layer);
  }

  function hideLayer(layer){
    core.hideLayer(layer);
    layerList = core.getLayers();
  }

  function makeNewCanvas(width, height){
    let drawConfigObject = {
      color: [...color, alpha],
      size: size,
      mode: mode,
      shape: shape
    }

    core.freeState(width, height, drawConfigObject);

    canvasName = "untitled";

    selectedLayer = 1;
    layerList = core.getLayers();

    undoDisabled = true;
    redoDisabled = true;
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
  }

  function undoAction(){
    if(core.redoActionQueue.length > 0){
      redoDisabled = false;
    }
    else {
      redoDisabled = true;
    }

    core.undoAction();
  }

  function redoAction(){
    core.redoAction();
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
      if(core.redoActionQueue.length > 0){
      redoDisabled = false;
    }
    else {
      redoDisabled = true;
    }

    if(core.actionQueue.length > 0){
      undoDisabled = false;
    }
    else {
      undoDisabled = true;
    }
    }
  }
  
</script>

{#if open}
    <Model 
      makeNewCanvas={makeNewCanvasDriver}
      loadOldCanvas={loadOldCanvas}
      />
  {/if}

<main>
  <div id="left-pane" on:mouseup={calcUIState}>
      
  </div>
  

  <div id="right-pane">

    <div class="block-group">
      <BlockButton icon={faHome} clickAction={openFiles}/>

      <div class="block-3 block"><input type="text" class="block-text block-textentry" bind:value={canvasName}></div>
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
      
      <div class="block block-1">
        <input type="color" id="colorInput" class="block-color" on:change={changeToolColor}>
      </div>
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
        bind:selectedLayer={selectedLayer}
      />

  </div>
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

    outline: 10px solid black;
    overflow: hidden;
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
    }

    #right-pane {
      width:  100%;
      height:  100vh;

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
