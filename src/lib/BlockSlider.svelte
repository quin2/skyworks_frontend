<script>
      export let min = 1;
      export let max = 100;

      export let value = 50;

      export let onChange = () => {};

      export let onInput = () => {};
</script>

<div class="block-3 block block-border">
      <input 
            type="range" 
            min={min} 
            max={max} 
            class="block-slider" id="myRange" 
            bind:value={value} 
            on:change={() => onChange(value)} 
            on:input={() => onInput(value) }
      >
      <span class="block-slider-val">{value}</span>
</div>

<style>
  .block-3{
    width:  150px;
    height:  50px;
  }

  .block {
    display: flex;
    align-items: center;
    justify-content: center;
    margin:  2px;
  }

  .block-border {
    outline:  1px solid black;
  }

  .block-slider {
    width:  100px;
    margin-right: 10px;
    -webkit-appearance: none;
    appearance: none;
    height:  2px;
    background-color: black;
  }

  .block-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 17px;
    width:  5px;
    background-color: black;
  }

  .block-slider-val {
    font-size: 1em;
    line-height: 17px;
    width:  30px;
  }
</style>