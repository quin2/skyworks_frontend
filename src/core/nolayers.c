#include <stdlib.h>
#include <math.h>  
#include <stdint.h> 

int* screen;
int WIDTH;
int HEIGHT;

int R;

int* buffer;
int* brush;
int* brushGuide;

struct point oldP;

int* alphaMask;
int* overlay;
int* overlayLayer;

int* activeLayer;
int* trackLayer;

int RED;
int BLUE;
int GREEN;
int ALPHA;

struct point
{
	int u;
	int v;
};

struct point pA;
struct point pB;

struct point pathStart;
struct point pathEnd;

int eraseMode;

int* layer;
	
//source, dest
uint32_t AlphaBlendPixels(uint32_t p1, uint32_t p2)
{
	
	
	
    static const int AMASK = 0xFF000000;
    static const int RBMASK = 0x00FF00FF;
    static const int GMASK = 0x0000FF00;
    static const int AGMASK = AMASK | GMASK;
    static const int ONEALPHA = 0x01000000;
    unsigned int a = (p2 & AMASK) >> 24;
    unsigned int na = 256 - a;
    unsigned int rb = ((na * (p1 & RBMASK)) + (a * (p2 & RBMASK))) >> 8;
    unsigned int ag = (na * ((p1 & AGMASK) >> 8)) + (a * (ONEALPHA | ((p2 & GMASK) >> 8)));
    return ((rb & RBMASK) | (ag & AGMASK));
    
    

    //int bitMask = ((1<<8)-1);

    /*
    uint8_t oldA = (oldColor >> 24) & bitMask;

			uint8_t oldRed = oldColor & bitMask;
			uint8_t oldGreen = (oldColor >> 8) & bitMask;
			uint8_t oldBlue = (oldColor >> 16) & bitMask;
			*/

	
	/*
	int bitMask = ((1<<8)-1);

    uint8_t sourcered = p1 & bitMask;
	uint8_t sourcegreen = (p1 >> 8) & bitMask;
	uint8_t sourceblue = (p1 >> 16) & bitMask;
	uint8_t sourcealpha = (p1 >> 24) & bitMask;

	uint8_t destred = p2 & bitMask;
	uint8_t destgreen = (p2 >> 8) & bitMask;
	uint8_t destblue = (p2 >> 16) & bitMask;
	uint8_t destalpha = (p2 >> 24) & bitMask;

	uint8_t red = (uint8_t) sourcered + destred * (1.0 - sourcealpha);
	uint8_t green = sourcegreen + destgreen * (1.0 - sourcealpha);
	uint8_t blue = sourceblue + destblue * (1.0 - sourcealpha);

	uint8_t alpha = sourcealpha + destalpha * (1.0 - sourcealpha);

	return (alpha << 24) | (red << 16) | (green << 8) | blue;
	*/
	
}

//exposed webassembly method
int* allocate(int width, int height){
	WIDTH = width;
	HEIGHT = height;

	int n = width * height * 4;
	screen = (int*)malloc(n * sizeof(int));

	return screen;
}

/*
Exposed wasm method
used to pull in old canvas data. 
To use, call allocate, then call initsys
*/
void allocateSaved(int* data){
	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);

			layer[off] = data[off];
		}
	}
}

int* getLayerRef(){
	return layer;
}

int* getOverlayRef(){
	return overlayLayer;
}


void setBrushPixel(int *brush, int width, int x, int y, int value){
	if(value <= 0 || value > 255){
		return;
	}
	brush[x + (y * width)] = (uint8_t) value;
}

//added some small tweaks here to account for glitched pixels
void drawBrushLine(int *brush, int width, int x, int start_y, int end_y, int alpha){
	for(int i = start_y + 1; i < end_y; i++){
		setBrushPixel(brush, width, x, i, alpha);
	}
}

void drawBrushLineH(int *brush, int width, int start_x, int end_x, int y, int alpha){
	for(int i = start_x + 1; i <= end_x - 1; i++){
		setBrushPixel(brush, width, i, y, alpha);
	}
}

void setPixel4(int *brush, int *brushGuide, int width, int cx, int cy, int dx, int dy, int alpha, int flood, int direction){
	if(direction == 1){
		drawBrushLine(brush, width, (cx + dx), (cy - dy), (cy + dy), flood);
		drawBrushLine(brush, width, (cx - dx), (cy - dy), (cy + dy), flood);
	}
	else if(direction == 0){
		drawBrushLineH(brush, width, (cx - dx), (cx + dx), (cy + dy), flood);
		drawBrushLineH(brush, width, (cx - dx), (cx + dx), (cy - dy), flood);
	}
	
	//draw anti-aa outline	
	//problem is exactly here
	setBrushPixel(brush, width, cx + dx, cy + dy, alpha);
	setBrushPixel(brush, width, cx - dx, cy + dy, alpha); //"alpha" goes at the end
	setBrushPixel(brush, width, cx + dx, cy - dy, alpha);
	setBrushPixel(brush, width, cx - dx, cy - dy, alpha);


	//draw brush guide
	setBrushPixel(brushGuide, width, cx + dx, cy + dy, 255);
	setBrushPixel(brushGuide, width, cx - dx, cy + dy, 255);
	setBrushPixel(brushGuide, width, cx + dx, cy - dy, 255);
	setBrushPixel(brushGuide, width, cx - dx, cy - dy, 255);
}

//see https://stackoverflow.com/questions/54594822/xiaolin-wu-circle-algorithm-renders-circle-with-holes-inside
void computeAACircleMask(int width, double alpha, int *brush, int *brushGuide){
	int r = R - 1;
	float maxTransparency = 255.0 * (float)alpha;

	float radiusX = r;
	float radiusY = r;
	float radiusX2 = radiusX * radiusX;
	float radiusY2 = radiusY * radiusY;

	int drawLinesDirection = 1;

	float quarter = roundf(radiusX2 / sqrtf(radiusX2 + radiusY2));
	for(float _x = 0; _x <= quarter; _x++) {

	    float _y = radiusY * sqrtf(1 - _x * _x / radiusX2);
	    float error = _y - floorf(_y);

	    float transparency = roundf(error * maxTransparency);
	    int alpha = transparency;
	    int alpha2 = maxTransparency - transparency;

	    setPixel4(brush, brushGuide, width, r, r, _x, floorf(_y), alpha, maxTransparency, drawLinesDirection); //aloha
	}

	quarter = roundf(radiusY2 / sqrtf(radiusX2 + radiusY2));
	for(float _y = 0; _y <= quarter; _y++) {
	    float _x = radiusX * sqrtf(1 - _y * _y / radiusY2);
	    float error = _x - floorf(_x);

	    float transparency = roundf(error * maxTransparency);
	    int alpha = transparency;
	    int alpha2 = maxTransparency - transparency;

	    drawLinesDirection = 0;

	    setPixel4(brush, brushGuide, width, r, r, floorf(_x), _y, alpha, maxTransparency, drawLinesDirection); //alph
	}
}

void computeSquareMask(int width, double alpha, int *brush, int *brushGuide){
	int r = R - 1;

	for(int y = 0; y <= r*2; y++){
		for(int x = 0; x <= r*2; x++){
			brush[x + (y*width)] = (uint8_t) 255 * alpha;

			if(x == 0 || x == (r*2) || y == 0 || y == (r*2)){
				brushGuide[x + (y * width)] = 255;
			}
		}
	}
}

double dist(struct point p1, struct point p2){
	return sqrt(((p1.u - p2.u)*(p1.u - p2.u)) + ((p1.v - p2.v)*(p1.v - p2.v)));
}

uint8_t getMask(int item){
	int bitMask = ((1<<8)-1);
	return ((item >> 24) & bitMask);
}

void drawPixel(int xC, int yC, int a, int HEIGHT2, int *buffer){
	if(xC < WIDTH && yC < HEIGHT && xC > 0 && yC > 0){
		int off = (yC * WIDTH + xC);

		int current = buffer[off];

		if(current == 0 || current < a){
			buffer[off] = (uint8_t) a;
		}
	}
}

void drawMask(double su, double sv, int bH, int *buffer, int rW, int *brush){
	int xC = floor(su);
	int yC = floor(sv);

	int r = R * 2;
	for(int i = 0; i < r; i++){
		for(int j = 0; j < r; j++){
			drawPixel(xC + i, yC + j, brush[i + j*rW], bH, buffer);
		}
	}
}

//private methods
void computeAndInfill(struct point p1, struct point p2, double step, int bH, int *buffer, int rW, int *brush){
	double mag = dist(p1, p2);

	double v1 = (p2.u - p1.u) / mag;
	double v2 = (p2.v - p1.v) / mag;

	for(double t = 0; t < mag; t += step){
		double su = p1.u + (t * v1);
		double sv = p1.v + (t * v2);

		drawMask(su, sv, bH, buffer, rW, brush);
	}
}

void blendLayersBounded(int startX, int startY, int endX, int endY){
	//only blend over top layers

	for(int i = startX; i < endX; i++){
		for(int j = startY; j < endY; j++){
			int idx = (j * WIDTH + i);

			if(i < 0 || i > WIDTH || j < 0 || j > HEIGHT){
					continue;
				}

			screen[idx] = 0xffffffff;
				//screen[idx] = 0x00000000;
		}
	}
	

	for(int i = startX; i < endX; i++){
		for(int j = startY; j < endY; j++){
			int idx = (j * WIDTH + i);

			if(i < 0 || i > WIDTH || j < 0 || j > HEIGHT){
				continue;
			}

			screen[idx] = layer[idx];
		}	
	}
	
	
	//blend the overlay on top
	for(int i = startX; i < endX; i++){
		for(int j = startY; j < endY; j++){
			int idx = (j * WIDTH + i);

			overlayLayer[idx] = (0 << 24) | (0 << 16) | (0 << 8) | 0;

			if(overlay[idx] != 0){
				//below should be screen, not overlay
			//overlay[idx]
				overlayLayer[idx] = (overlay[idx] << 24) | (0 << 16) | (0 << 8) | 0;
			}
		}
	}
	
}

void blendLayers(){
	blendLayersBounded(0, 0, WIDTH, HEIGHT);
}

void drawBufferBounded(int startX, int startY, int endX, int endY){
	for(int i = startX; i < endX; i++){
		for(int j = startY; j < endY; j++){
			int off = (j * WIDTH + i);

			if(i < 0 || i > WIDTH || j < 0 || j > WIDTH){
				continue;
			}
			
			if(buffer[off] == 0){
				continue;
			}
	
			
			uint8_t newA = (uint8_t) buffer[off]; 

			/*
			looks fine, problem is that we are 'peeking' into layer below 
			*/

			//TODO: fix below
			uint8_t newRed = (uint8_t) RED; //* (newA / 255.0);
			uint8_t newGreen = (uint8_t) GREEN; //* (newA / 255.0);
			uint8_t newBlue = (uint8_t) BLUE; //* (newA / 255.0);

			uint32_t oldColor = alphaMask[off];
			int bitMask = ((1<<8)-1);
			uint8_t oldA = (oldColor >> 24) & bitMask;

			uint8_t oldRed = oldColor & bitMask;
			uint8_t oldGreen = (oldColor >> 8) & bitMask;
			uint8_t oldBlue = (oldColor >> 16) & bitMask;

			uint32_t newColor = (newA << 24) | (newBlue << 16) | (newGreen << 8) | newRed;

			//if(oldA != 0 && newRed < 255 && newGreen < 255 && newBlue < 255){
			if(oldA != 0){
				newColor = AlphaBlendPixels(alphaMask[off], newColor); //old, new
			}
			//}

			//issue with this is that we end up blending again. vs with above, we don't do that (blend once)
			//uint32_t colorToCache = AlphaBlendPixels(trackLayer[off], newColor); 

			//blend eraser
			if(eraseMode == 1){ 
				newColor = (0 << 24) | (0 << 16) | (0 << 8) | 0;
			} 

			layer[off] = newColor;
		}
	}
}



void drawBuffer(){
	drawBufferBounded(0, 0, WIDTH, HEIGHT);
}

void setLayerColor(int color){
	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);

			layer[off] = color;
			alphaMask[off] = color;
		}
	}
}

void fillLayer(int red, int green, int blue, int alpha){
	setLayerColor((alpha << 24) | (blue << 16) | (green << 8) | red);
}

void clearScreen(){
	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);

			screen[off] = 0x00000000;

			alphaMask[off] = layer[off];
			buffer[off] = 0;
			overlay[off] = 0;
		}
	}
}

void clearLayer(){
	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);

			layer[off] = (0 << 24) | (0 << 16) | (0 << 8) | 0;
			buffer[off] = (0 << 24) | (0 << 16) | (0 << 8) | 0;
			alphaMask[off] = (0 << 24) | (0 << 16) | (0 << 8) | 0;
			screen[off] = (0 << 24) | (0 << 16) | (0 << 8) | 0;
		}
	}
}

void clearBrushes(){
	for(int i = 0; i < R * 2; i++){
		for(int j = 0; j < R * 2; j++){
			brush[i + j*(2 * R)] = 0;
			brushGuide[i + j*(2 * R)] = 0;
		}
	}
}

void clearOverlay(){
	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);
			overlay[off] = 0;
		}
	}
}

void startPath(int pX, int pY){
	pA.u = pX - R;
	pA.v = pY - R;

	pathStart.u = pA.u;
	pathStart.v = pA.v;

	pathEnd.u = pA.u;
	pathEnd.v = pA.v;

	//compute and infill
	drawMask(pA.u, pA.v, HEIGHT, buffer, R*2, brush);

	//draws mask to buffer layer
	//drawBuffer();
	int startX = pA.u;
	if(pB.u < pA.u){
		startX = pB.u;
	}

	int startY = pA.v;
	if(pB.v < pA.v){
		startY = pB.v;
	}

	int endX = pA.u;
	if(pB.u > pA.u){
		endX = pB.u;
	}

	int endY = pA.v;
	if(pB.v > pA.v){
		endY = pB.v;
	}

	drawBufferBounded(startX, startY, endX + (R*2), endY + (R*2));

	return;
}

void addPoint(int pX, int pY){
	pB = pA;

	pA.u = pX - R;
	pA.v = pY - R;

	if(pA.u < pathStart.u){
		pathStart.u = pA.u;
	}
	if(pA.v < pathStart.v){
		pathStart.v = pA.v;
	}

	if(pA.u > pathEnd.u){
		pathEnd.u = pA.u;
	}
	if(pA.v > pathEnd.v){
		pathEnd.v = pA.v;
	}

	computeAndInfill(pA, pB, 0.1, WIDTH, buffer, R*2, brush);

	int startX = pA.u;
	if(pB.u < pA.u){
		startX = pB.u;
	}

	int startY = pA.v;
	if(pB.v < pA.v){
		startY = pB.v;
	}

	int endX = pA.u;
	if(pB.u > pA.u){
		endX = pB.u;
	}

	int endY = pA.v;
	if(pB.v > pA.v){
		endY = pB.v;
	}
	
	drawBufferBounded(startX, startY, endX + (2*R), endY + (2*R));

	blendLayersBounded(startX, startY, endX + (2*R), endY + (2*R));
}

void endPath(){
	//will also need to normalize points here to figure out which way is "up"
	//todo: make path ending . use pathStart and pathEnd

	for(int i = 0; i < WIDTH; i++){
		for(int j = 0; j < HEIGHT; j++){
			int off = (j * WIDTH + i);
			
			//TODO: remove this
			/*
			if(buffer[off] == 0){
				continue;
			}
			*/
						
			alphaMask[off] = layer[off]; 
			buffer[off] = 0;
		}
	}
}


void setBrushProperties(int rin, int mode, int alpha, int setEraseMode){
	R = rin;

	//this is really ugly, need to fix to use floats later
	double a = alpha / 255.0;

	clearOverlay();

	int nbr = (2 * R) * (2 * R);
	brush = (int*)malloc(nbr * sizeof(int));
	brushGuide = (int*)malloc(nbr * sizeof(int));
	clearBrushes();

	if(mode == 0){
		computeAACircleMask(R*2, a, brush, brushGuide);
		//computeAACircleMask(R*2, 1.0, brush, brushGuide);
	}

	if(mode == 1){
		computeSquareMask(R*2, a, brush, brushGuide); //square mask
	}

	eraseMode = setEraseMode;

	//8/7: premultiply rgb

	//tool color then alpha
}

void setOverlay(int x, int y, int willBlendLayers){
	int r = R * 2;

	x = x - R;
	y = y - R;

	for(int i = 0; i < r; i++){
		for(int j = 0; j < r; j++){
			if(i+oldP.u > 0 && i+oldP.u < WIDTH && j+oldP.v > 0 && j+oldP.v < HEIGHT){
				int off = (oldP.u+i) + (oldP.v+j)*WIDTH;

				overlay[off] = 0;
			}
		}
	}

	for(int i = 0; i < r; i++){
		for(int j = 0; j < r; j++){
			drawPixel(x + i, y + j, brushGuide[i + j*r], WIDTH, overlay);
		}
	}

	//if we are not going to add a point to the path, just blend the layers right now
	if(willBlendLayers == 1){
		blendLayersBounded(oldP.u, oldP.v, oldP.u + (R*2), oldP.v + (R*2));
		blendLayersBounded(x, y, x + (R*2), y + (R*2));
	}

	oldP.u = x;
	oldP.v = y;
}

void setColor(int red, int green, int blue){
	RED = red;
	GREEN = green;
	BLUE = blue;

	//set alpha
}

void initSystem(){
	R = 5;

	int nbr = (2 * R) * (2 * R);
	brush = (int*)malloc(nbr * sizeof(int));
	brushGuide = (int*)malloc(nbr * sizeof(int));
	clearBrushes();

	int nb = WIDTH * HEIGHT;
	buffer = (int*)malloc(nb * sizeof(int));
	alphaMask = (int*)malloc(nb * sizeof(int));
	overlay = (int*)malloc(nb * sizeof(int));
	overlayLayer = (int*)malloc(nb * sizeof(int));
	trackLayer = (int*)malloc(nb * sizeof(int));
	layer = (int*)malloc(nb * sizeof(int));
	

	computeAACircleMask(R*2, 1.0, brush, brushGuide);

	clearScreen();
	clearLayer();

	//clear current layer
	setLayerColor(0x00000000);

	//set consts
	oldP.u = -1;
	oldP.v = -1;

	//issue with loading is that we don't/can't usually set alphaMask to 0. Usually it is set to 0xff or something
}

//free all shared memory
void dealloc(){
	free(brush);
	free(brushGuide);

	free(buffer);
	free(alphaMask);
	free(overlay);

	free(layer);
	
}