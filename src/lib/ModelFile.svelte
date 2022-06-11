<script>
	export let selected = false;
	export let title;
	export let fileClicked;
	export let fileThumb;
</script>

<div class="{selected ? 'selectedFile' : ''}" on:click={fileClicked}>
		<div class="fileImage" style="background-image: url({fileThumb})"></div>
		<div class="fileTitle">{title}</div>
</div>

<style>
	.fileImage {
		width:  80px;
		height:  80px;
		background-color: green;
		background-size: 80px 80px;
		border:  1px solid black;
	}

	.selectedFile {
		background-color: lightblue;
	}
</style>