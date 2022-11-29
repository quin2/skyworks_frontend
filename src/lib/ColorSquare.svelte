<script>
	import { selectedColor } from '../stores/stores.js'

	export let color = "#000000"

	function selectColor() {
		selectedColor.set(color)
	}
</script>

<button class="cHist" style="background-color: {color};" on:click={selectColor}></button>

<style>
	.cHist {
		border: none;
		width: 20px;
		height: 20px;
	}
</style>