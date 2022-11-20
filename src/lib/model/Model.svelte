<script>
	import {modelState} from '../../stores/stores.js'
	import FilesModel from './FilesModel.svelte'
	import SettingsModel from './SettingsModel.svelte'

	export let makeNewCanvas;
	export let loadOldCanvas;

	let _modelState
	modelState.subscribe(value => {
		_modelState = value;
	})
</script>

<div class="modelBg">
	{#if _modelState == 'files'}
	<FilesModel loadOldCanvas={loadOldCanvas}/>
		{:else}
		{#if _modelState == 'cSettings'}
			<SettingsModel makeNewCanvas={makeNewCanvas}/>
		{/if}
	{/if}
</div>

<style>
	.modelBg {
		width:  100%;
		height:  100%;
		background-color: rgba(0, 0, 0, 0.5);

		display:  flex;
		align-items: center;
		justify-content: center;

		position: absolute;

		z-index: 150;
	}
</style>