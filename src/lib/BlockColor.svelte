<script>
	import { selectedColor } from '../stores/stores.js'

	export let clickAction = null; //TODO: can remove this since we will always open colors model
</script>

<div class="block-1 block block-border">
	<button on:click={clickAction} style="background-color: {$selectedColor};">
	</button>
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
	    margin:  2px;
  	}

  	.block-border{
    	outline:  1px solid black;
  	}

  	.block-disabled {
  		outline:  1px solid gray;
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
</style>