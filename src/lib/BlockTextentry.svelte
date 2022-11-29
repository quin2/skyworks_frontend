<script>
	export let value
	export let onChange = () => {}
	export let prefix = ""
</script>

<div class="block-3 block block-border">
	{prefix}
	<input type="text" class="block-text block-textentry" bind:value={value} on:change={() =>onChange(value)}>
</div>

<style>
	.block {
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    margin:  2px;
  	}

  	.block-border {
    	outline:  1px solid black;
  	}

  	.block-3{
	    width:  150px;
	    height:  50px;
  	}

	.block-text{
    	font-size: 20px;
  	}

	.block-textentry {
	    background-color: transparent;
	    border:  1px solid black;
	    width: 80%;
  	}

	.block-text:focus {
	    border: 2px solid black;
	    outline: none;
  	}
</style>