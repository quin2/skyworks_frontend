<script>
	import { faFloppyDisk, faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
	import ModelButton from '../ModelButton.svelte'
	import ModelFile from '../ModelFile.svelte'

	import { modelState, modelOpen, canvasList } from '../../stores/stores.js'

	let fileSelected = false;
	let selectedFile = null;
	export let loadOldCanvas;

	function fileClicked(file){
		event.stopPropagation();
		fileSelected = true;
		selectedFile = file;
	}

	function fileSelectedAway(){
		fileSelected = false;
		selectedFile = -1;
	}

	function downloadSelectedFile(){
		const a = document.createElement('a');
  		a.href = selectedFile.content;
  		const name = selectedFile.name;
  		a.download = `${name}.png`
  		a.click();
	}

	function removeSelectedFile(){
		canvasList.delete(selectedFile.id)
	}

	function editCanvas(){
		loadOldCanvas(selectedFile);

		modelOpen.set(false);
	}
</script>

<div class="modelHolder modelBrand">
	<div class="modelBar">
		<ModelButton icon={faPenToSquare} caption="edit" disabled={!fileSelected} clickAction={editCanvas}/>
		<ModelButton icon={faFloppyDisk} caption="save" disabled={!fileSelected} clickAction={downloadSelectedFile}/>
		<ModelButton icon={faTrashCan} caption="delete" disabled={!fileSelected} clickAction={removeSelectedFile}/>
	</div>
	<div class="fileBody" on:click={fileSelectedAway}>
		<ModelFile title={"make new canvas"} fileClicked={() => modelState.set('cSettings')} selected={false} fileThumb={null} isAddNew={true}/>

		{#each $canvasList as canvas}
			{#if canvas}
				<ModelFile title={canvas.name} fileClicked={() => fileClicked(canvas)} selected={selectedFile && canvas.id == selectedFile.id} fileThumb={canvas.content}/>
			{/if}
		{/each}
	</div>
</div>

<style>
	.modelHolder {
		width:  400px;
		height:  400px;
		display: flex;
		flex-direction: column;
	}
	.fileImage {
		width:  80px;
		height:  80px;
		background-color: green;
	}

	.selectedFile {
		background-color: lightblue;
	}

	.fileBody {
		overflow: auto;
		padding:  10px;
	}

	.modelBrand {
		background-color: white;
		border-top: 10px solid black;
	}

	.modelBar {
		width:  100%;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		margin-top: 10px;
		margin-bottom: 10px;
	}
</style>