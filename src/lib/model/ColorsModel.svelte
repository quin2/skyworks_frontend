<script>
	import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
	import ModelButton from '../ModelButton.svelte'
	import { modelOpen, modelState, selectedColor, colorHistory, colorHistoryLimit, selectedColorTab } from '../../stores/stores.js'

	import BlockSlider from '../BlockSlider.svelte'
	import ColorSquare from '../ColorSquare.svelte'
	import BlockTextentry from '../BlockTextentry.svelte'

	import { hexToRgb, rgbToHex } from '../helpers/color.js'

	export let setColor = () => {}

	let addLastColorToHistory = true;

	let red = 0;
	let green = 0;
	let blue = 0;

	let paletteColors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1','#000075', '#808080', '#ffffff', '#000000']

	let colorHex = "000000" //todo: always set on initalization

	function closeAndPickColor(){
		modelOpen.set(false);
		setColor(); //trigger core to use new color
	}

	selectedColor.subscribe((value) => {
		if(value.length < 7){
			return;
		}
		//set r,g,b values
		let rgb = hexToRgb(value)
		red = rgb[0]
		green = rgb[1]
		blue = rgb[2]

		//set validated hex field
		colorHex = value.substring(1)
	
		//add color to history if conditions are met: 
		if (addLastColorToHistory && value != $selectedColor && $colorHistory.indexOf(value) == -1){
			$colorHistory.unshift($selectedColor) //should be push 
			if ($colorHistory.length >= colorHistoryLimit){
				$colorHistory.pop()
			}

			$colorHistory = $colorHistory
			addLastColorToHistory = false
		}
	})

	function tweakColor(){
		//set hex
		$selectedColor = rgbToHex([red, green, blue])
	}

	function tweakHex(value){
		let validatedValue = value 

		//strip leading #
		if(value.length >= 1 && value.at(0) == "#") {
			validatedValue = value.substring(1)
		}

		$selectedColor = `#${value}`
	}
</script>

<div class="settingsBg">
	<div class="tabContainer">
		<div 
			class="tab {$selectedColorTab === 'picker' ? 'tabSelected' : ''}" 
			on:click={() => selectedColorTab.set("picker")}>
			picker
		</div>
		<div 
			class="tab {$selectedColorTab === 'palette' ? 'tabSelected' : ''}"
			on:click={() => selectedColorTab.set("palette")}>
			palette
		</div>
	</div>

	<div class="modelBody">
		{#if $selectedColorTab === "picker"}
			<div class="colorPickContain">
				<div class="colorPickLeft">
					<div class="colorSetting">
						<div class="colorLabel">Red:</div>
						<BlockSlider min={0} max={255} bind:value={red} onInput={tweakColor}/>
					</div>

					<div class="colorSetting">
						<div class="colorLabel">Green:</div>
						<BlockSlider min={0} max={255} bind:value={green} onInput={tweakColor}/>
					</div>

					<div class="colorSetting">
						<div class="colorLabel">Blue:</div>
						<BlockSlider min={0} max={255} bind:value={blue} onInput={tweakColor}/>
					</div>
				</div>

				<div class="colorPickRight">
					<div>Hex value:</div>
					<BlockTextentry bind:value={colorHex} prefix="#" onChange={tweakHex}/>
				</div>
			</div>
		{:else}
			<div class="paletteContain">
				{#each paletteColors as color}
					<ColorSquare color={color.toLowerCase()}/>
				{/each}
			</div>
		{/if}
	</div>

	<div class="modelBottom">
		<div class="leftAlign">
			<div class="mainColor" style="background-color: {$selectedColor};"></div>

			{#each $colorHistory as color}
				<div class="marginLeftHist">
					<ColorSquare color={color}/>
				</div>
			{/each}
		</div>
		<ModelButton icon={faCheck} caption="ok" clickAction={closeAndPickColor}/>
	</div>
</div>

<style>
	.settingsBg {
		width:  400px;
		height:  350px;
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

	.tabContainer {
		width:  100%;
		height:  50px;
		border-bottom: 1px solid black;
		display: flex;
		flex-direction: row;
	}

	.tab {
		width: 100px;
		display: flex;
		align-items: center;
		justify-content: center;

		margin-top: 10px;
		margin-left: 10px;
		margin-right: 10px;

		cursor: pointer;
	}

	.tabSelected {
		border-left: 1px solid black;
		border-right: 1px solid black;
		border-top: 1px solid black;
	}

	.mainColor {
		width: 40px;
		height: 40px;
		margin-left: 10px;
	}

	.cHist {
		width:  20px;
		height: 20px;
		background-color: blue;
	}

	.leftAlign {
		display: flex;
		flex-direction: row;
		justify-self: flex-start;
		margin-right: auto;
		align-items: center;
	}

	.colorSetting {
		
	}

	.colorLabel {
		margin-right: 2px;
	}

	.paletteContain {
		display: grid;
		grid-template-columns: repeat(auto-fill, 20px);
		grid-template-rows: repeat(auto-fill, 20px);
		height: 100%;
		gap: 5px;
	}

	.marginLeftHist {
		margin-left: 10px;
	}

	.colorPickContain {
		display: flex;
		flex-direction: row;
	}

	.colorPickLeft {
		width: 50%;
	}

	.colorPickRight {
		width: 50%;
	}
</style>
