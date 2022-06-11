<script>
	import Fa from 'svelte-fa'

	export let icon;
	export let caption;
	export let clickAction = null;
	export let disabled = false;
</script>

<div class="modelButtonWrapper">
	<div class="modelButton {disabled ? 'block-disabled' : 'block-border'} block">
		<button on:click={clickAction} disabled={disabled}>
			<Fa icon={icon} size="lg"/>
			{caption}
		</button>
	</div>
</div>


<style>
	.modelButton {
		width:  80px;
		height: 40px;
	}

	.block {
	    display: flex;
	    align-items: center;
	    justify-content: center;
  	}

  	.block-disabled {
  		outline:  1px solid gray;
  	}

  	.block-border{
    	outline:  1px solid black;
  	}

	.block button {
	    border:  none;
	    background-color: transparent;
	    height:  100%;
	    width:  100%;
	    font-size: 15px;
  	}

	.block-border button:hover{
		background-color: #0abab5;
	}

	.modelButtonWrapper {
		padding-right: 10px;
	}
</style>