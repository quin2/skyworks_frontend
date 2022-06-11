<script>
	import BlockButton from './BlockButton.svelte'
	export let offIcon;
	export let onIcon;
	export let toggled = false;

	export let clickAction = null;

	function toggleClicked(){
		toggled = !toggled
		clickAction();
	}
</script>

<BlockButton icon={toggled ? onIcon : offIcon} clickAction={toggleClicked}/>

