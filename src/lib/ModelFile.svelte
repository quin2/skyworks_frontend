<script>
	import Fa from 'svelte-fa'
	import { faPlus } from '@fortawesome/free-solid-svg-icons'

	export let selected = false;
	export let title;
	export let fileClicked;
	export let fileThumb;
	export let isAddNew = false;
	export let changeFileName = () => {}

	let tempTitle = title
	let fileEditing = false

	function fileDoubleClicked(){
		fileEditing = true;
	}

	function finishFileEdit(){
		title = tempTitle;
		fileEditing = false;
		changeFileName(title)
	}
</script>

<div 
	class="singleFile {selected ? 'selectedFile' : ''}" 
	on:click={fileClicked}
	on:dblclick={fileDoubleClicked}>
		{#if isAddNew}
			<div class="fileImage">
				<Fa icon={faPlus} size="lg"/>
			</div>
		{:else}
			<div class="fileImage" style="background-image: url({fileThumb})"></div>
		{/if}

		{#if fileEditing && !isAddNew}
			<input type="text" class="block-text block-textentry layerNameEdit" bind:value={tempTitle} on:blur={() => finishFileEdit()} autofocus>
		{:else}
			<div class="fileTitle">{title}</div>
		{/if}
</div>

<style>
	.fileImage {
		width:  80px;
		height:  80px;
		background-size: 80px 80px;
		border:  1px solid black;

		display: flex;
		align-items: center;
		justify-content: center;
	}

	.selectedFile {
		background-color: lightblue;
	}

	.singleFile {
		display: flex;
		align-items: center;
		margin-bottom: 10px;
		outline: 1px solid black;
		padding:  2px;
	}

	.fileTitle {
		margin-left: 0.5em;
	}
</style>