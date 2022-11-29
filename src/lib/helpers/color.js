export function rgbToHex(rgb){
	return `#${rgb[0].toString(16).padStart(2,'0')}${rgb[1].toString(16).padStart(2,'0')}${rgb[2].toString(16).padStart(2,'0')}`;
}

export function hexToRgb(hex){
	const hexValue = hex.substring(1);
    const aRgbHex = hexValue.match(/.{1,2}/g);  

    const r = parseInt(aRgbHex[0], 16);
    const g = parseInt(aRgbHex[1], 16); 
    const b = parseInt(aRgbHex[2], 16);

    return [r, g, b];
}