<script>
	import BlockButton from './BlockButton.svelte'
	export let options
	export let onChange = null;
	export let choice = options[0].key;

	function changeSelection(key){
		choice = key;
		onChange(choice);
	}
</script>

<div class="toggleGroup">
	{#each options as option}
		<BlockButton icon={option.icon} clickAction={() => changeSelection(option.key)} selected={choice == option.key}/>
	{/each}
</div>

<style>
	.toggleGroup {
		display:  flex;
		flex-direction: row;
	}
</style>