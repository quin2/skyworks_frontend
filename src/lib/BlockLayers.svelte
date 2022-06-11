<script>
	import Fa from 'svelte-fa'
  import { faLayerGroup, faEye, faEyeSlash, faPlus } from '@fortawesome/free-solid-svg-icons'

	import BlockToggle from './BlockToggle.svelte'
	import BlockButton from './BlockButton.svelte'

  export let addLayerAction = null;
  export let selectLayerAction = null;
  export let hideLayerAction = null;

  export let layerList;

  export let selectedLayer;

  function addLayer(){
    addLayerAction();
  }

  function selectLayer(layer){
    selectedLayer = layer;
    selectLayerAction(layer);
  }
</script>

<div class="block-border block-row block-margin block-top">
      <div class="block-1 block">
        <Fa icon={faLayerGroup} size="lg"/>
      </div>
</div>

 <div class="lowerContain">
	 	{#each [...layerList].reverse() as layer}
      {#if layer != 0}
    		<div class="block-row {layer.pos == selectedLayer ? 'selected' : ''}">
    		  <BlockToggle 
            offIcon={faEyeSlash} 
            onIcon={faEye} 
            clickAction={() => hideLayerAction(layer.pos)} 
            toggled={layer.status == 2}
            />
    		  <div class="block-auto block block-text block-margin" on:click={() => selectLayer(layer.pos)}>
    		    layer {layer.pos}
    		  </div>
    		</div>
    {/if}
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
</style>

