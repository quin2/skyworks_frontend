<script>
	import Fa from 'svelte-fa'
  import { faLayerGroup, faEye, faEyeSlash, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons'

	import BlockToggle from './BlockToggle.svelte'
	import BlockButton from './BlockButton.svelte'

  export let addLayerAction = null;
  export let selectLayerAction = null;
  export let hideLayerAction = null;
  export let changeLayerNameAction = null;
  export let deleteLayerAction = null;
  export let swapLayerAction = null;

  export let layerList;

  export let selectedLayer;

  let editingLayer = -1;
  let tempCanvasName = ""

  let hovering = -1;

  function addLayer(){
    addLayerAction();
  }

  function layerClicked(layer){
    selectedLayer = layer;
    selectLayerAction(layer);
  }

  function layerDoubleClicked(layer){
    editingLayer = layer
    tempCanvasName = layerList[layer].name
  }

  function finishLayerNameEdit(layer){
    editingLayer = -1
    changeLayerNameAction(layer, tempCanvasName)
  }

  function dragStart(e, layer){
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.dropEffect = "move"
    event.dataTransfer.setData('text/plain', layer)
  }

  function drop(e, layer){ //here, layer is target index
    e.dataTransfer.dropEffect = "move"
    const start = parseInt(e.dataTransfer.getData("text/plain")) //index of layer we were moving

    //run API to change underlying data structure
    swapLayerAction(start, layer) //old position, new position
    hovering = -1
  }

  function dragEnter(layer){
    hovering = layer
  }

</script>

<div class="block-border block-row block-margin">
      <div class="block-1 block">
        <Fa icon={faLayerGroup} size="lg"/>
      </div>

      <div class="trashRight">
        <BlockButton icon={faTrashCan} clickAction={() => deleteLayerAction()}/>
      </div>
</div>

 <div class="lowerContain block-border block-margin">
	 	{#each layerList as layer, i}
    		<div 
          class="block-row {i == selectedLayer ? 'selected' : ''} {i == hovering ? 'hovering' : ''}" 
          on:click={() => layerClicked(i)} 
          on:dblclick={() => layerDoubleClicked(i)}
          draggable={true}
          on:dragstart={(e) => dragStart(e, i)}
          on:drop|preventDefault={(e) => drop(e, i)}
          ondragover="return false"
          on:dragenter={() => dragEnter(i)}
          >
    		  <BlockToggle 
            offIcon={faEyeSlash} 
            onIcon={faEye} 
            clickAction={() => hideLayerAction(i)} 
            toggled={layer.shown}
            />
          {#if (editingLayer == i)}
    		    <input type="text" class="block-text block-textentry layerNameEdit" bind:value={tempCanvasName} on:blur={() => finishLayerNameEdit(i)} autofocus>
          {:else}
            <div class="block-auto block block-text block-margin">
              {layer.name}
            </div>
          {/if}
    		</div>
	 {/each}
    <div class="block-row">
  	 <BlockButton icon={faPlus} clickAction={addLayer}/>
    </div>
 </div>



<style>
	.block {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .block-1{
    width:  50px;
    height:  50px;
  }

  .block-3{
    width:  150px;
    height:  50px;
  }

  .block-auto{

  }

  .block-margin{
    margin:  2px;
  }

  .block-text{
    font-size: 20px;
  }

  .block-top{
    height:  100px;
  }

	.block-row {
    display:  flex;
    flex-direction: row;
    flex-flow:  row wrap;

    align-content: flex-start;

    outline: 1px solid black;
    margin: 2px;

    cursor:  pointer;
  }

  .block-border {
    outline:  1px solid black;
  }

  .lowerContain {
  	height:  200px;
  	overflow: auto;
  }

  .selected{
    background-color: #0abab5;
  } 

  .layerNameEdit {
    width: 100px;
  }

  .trashRight {
    margin-left: auto;
  }

  .hovering {
    background-color: lightblue;
  }
</style>

