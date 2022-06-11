<script>
	import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
	import ModelButton from '../ModelButton.svelte'
	import { modelOpen, modelState } from '../../stores/stores.js'

	export let makeNewCanvas;
	let width;
	let height;

	$: createOK = width > 0 && height > 0;

	function closeAndMakeNewCanvas(){
		makeNewCanvas(width, height);
		modelOpen.set(false);
	}
</script>

<div class="settingsBg">
	<div class="modelBody">
		{#if width > 1500 && height > 1500}
			<div>Canvas dimensions beyond 1500x1500 might make the editor very slow</div>
		{/if}
		<div>
			<label for="width">width</label>
			<input name="width" type="number" bind:value={width}/>
			<label for="width">px</label>
		</div>

		<div>
			<label for="height">height</label>
			<input name="height" type="number" bind:value={height}/>
			<label for="height">px</label>
		</div>
	</div>

	<div class="modelBottom">
		<ModelButton icon={faXmark} caption="cancel" clickAction={() => modelState.set('files')}/>
		<ModelButton icon={faCheck} caption="ok" clickAction={closeAndMakeNewCanvas} disabled={!createOK}/>
	</div>
</div>

<style>
	.settingsBg {
		width:  400px;
		height:  200px;
		background-color: white;
		border-top: 10px solid black;

		display:  flex;
		flex-direction: column;
	}

	.modelBody {
		padding:  10px;
		flex:  1;
	}

	.modelBottom {
		width:  100%;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		margin-bottom: 10px;
	}
</style>
