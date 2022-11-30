<script>
	import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
	import ModelButton from '../ModelButton.svelte'
	import { modelState, simpleMode } from '../../stores/stores.js'

	let tempSimpleMode = $simpleMode

	function cancelSettings(){
		modelState.set('files')
	}

	function acceptSettings(){
		//$simpleMode = tempSimpleMode
		modelState.set('files')
	}
</script>

<div class="settingsBg">
	<div class="modelBody">
		<h4>Feedback for skyworks:</h4>
		<div>
			<a href="https://forms.gle/udJnJz8dg1FgEmak9" target="_blank">Feedback form</a>
		</div>

		<h4>Experimental settings:</h4>
		<input type="checkbox" id="simple" name="simple" bind:checked={$simpleMode}>
  		<label for="simple">Simple controls</label><br>
	</div>

	<div class="modelBottom">
		<ModelButton icon={faXmark} caption="cancel" clickAction={cancelSettings}/>
		<ModelButton icon={faCheck} caption="ok" clickAction={acceptSettings}/>
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

	h4 {
		margin: 0px;
	}
</style>
