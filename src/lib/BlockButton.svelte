<script>
	import Fa from 'svelte-fa'

	export let icon;
	export let selected = false;

	export let clickAction = null;

	export let caption = null;
	export let disabled = false;
</script>

<div class="{caption ? 'block-2' : 'block-1'} 
			block block-border 
			{selected ? 'selected' : ''} 
			{disabled ? 'block-disabled' : 'block-border'} ">
	<button on:click={clickAction} disabled={disabled}>
		<Fa icon={icon} size="lg"/>
		{#if caption}
			{caption}
		{/if}
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

  	.block-2{
  		width:  100px;
  		height:  50px;
  	}

  	.block-border{
    	outline:  1px solid black;
  	}

  	.block-disabled {
  		outline:  1px solid gray;
  	}

	.selected{
		background-color: #0abab5;
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