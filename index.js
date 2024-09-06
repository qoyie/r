"use strict";
const ROAD_NONE = 0;
const ROAD_IN = 1;
const ROAD_OUT = 2;
const ROAD_TEMP_OUT = 3;
const DIRECTION_NONE = -1;
const DIRECTION_TOP = 0;
const DIRECTION_BOTTOM = 1;
const DIRECTION_LEFT = 2;
const DIRECTION_RIGHT = 3;
const ROWS = 9;
const COLUMNS = 16;
const LAYERS = 10;
const directions = [
    -1, 0, -1,
    2, -1, 3,
    -1, 1, -1,
];
const getDirection = (di, dj) => -1 <= di && di <= 1 && -1 <= dj && dj <= 1 ? directions[di * 3 + dj + 4] : -1;
const onMouseDown = (row, col) => (e) => {
    e.preventDefault();
    paving = e.button === 0;
    deleting = e.button === 2;
    onMouseEnter(row, col)(e);
};
const onMouseUp = (e) => {
    e.preventDefault();
    paving = deleting = false;
    lastRow = lastCol = void 0;
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
            const flags = layer[row][col];
            layer[row][col] = applyTemps(flags);
        }
    }
};
const onMouseEnter = (row, col) => (e) => {
    if (paving) {
        updateBothFlags(row, col, (lastFlags, currentFlags, direction) => {
            switch (direction) {
                case DIRECTION_TOP: {
                    return [
                        lastFlags /*   */ === 0 ? 2304 : setTop(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 3328 : setBottom(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_BOTTOM: {
                    return [
                        lastFlags /*   */ === 0 ? 1536 : setBottom(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 1792 : setTop(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_LEFT: {
                    return [
                        lastFlags /*   */ === 0 ? 144 : setLeft(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 208 : setRight(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_RIGHT: {
                    return [
                        lastFlags /*   */ === 0 ? 96 : setRight(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 112 : setLeft(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_NONE:
                    return [applyTemps(lastFlags), applyTemps(currentFlags)];
            }
        });
    }
    else if (deleting) {
        updateFlags(row, col, _ => 0);
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                if (0 <= row + i && row + i < ROWS && 0 <= col + j && col + j < COLUMNS) {
                    updateFlags(row + i, col + j, flags => set(flags, ROAD_NONE, getDirection(i, j)));
                }
            }
        }
        lastRow = lastCol = void 0;
    }
};
const $ = {};
document.getElementById('main').append(h("div", { id: "drawLayer", class: "layer grid" }, ...Array.from(Array(ROWS * COLUMNS), _ => h("div", null))), h("div", { id: "clickLayer", class: "layer grid", mouseleave: onMouseUp, contextmenu: e => e.preventDefault() }, ...Array.from(Array(ROWS), (_, i) => Array.from(Array(COLUMNS), (_, j) => h("div", { mouseenter: onMouseEnter(i, j), mousedown: onMouseDown(i, j), mouseup: onMouseUp }))).flat()));
const roads = [...document.getElementById('roads').children];
const drawLayer = $.drawLayer;
const layers = Array.from(Array(LAYERS), _ => Array.from(Array(ROWS), _ => Array(COLUMNS).fill(0)));
let currentLayer = 0;
let displayLayer = LAYERS - 1;
let layer = layers[currentLayer];
let lastRow, lastCol;
let paving = false;
let deleting = false;
function updateFlags(row, col, callback) {
    const currentFlags = layer[row][col];
    const newFlags = callback(currentFlags);
    if (newFlags !== currentFlags) {
        updateDOM(row, col, newFlags);
    }
    lastRow = row;
    lastCol = col;
}
function updateBothFlags(row, col, callback) {
    const currentFlags = layer[row][col];
    const lastFlags = lastRow == null ? 0 : layer[lastRow][lastCol];
    const direction = lastRow == null ? -1 : getDirection(row - lastRow, col - lastCol);
    const [newLastFlags, newFlags] = callback(lastFlags, currentFlags, direction);
    updateDOM(row, col, newFlags);
    if (lastRow != null) {
        updateDOM(lastRow, lastCol, newLastFlags);
    }
    lastRow = row;
    lastCol = col;
}
function updateDOM(row, col, flags) {
    const newFlags = flags;
    if (layer[row][col] !== newFlags) {
        layer[row][col] = newFlags;
        const cellDOM = drawLayer.children[row * COLUMNS + col];
        for (let i = currentLayer + 1; i <= displayLayer; i++) {
            if (layers[i][row][col]) {
                return;
            }
        }
        drawLayer.replaceChild(getRoadSVG(newFlags), cellDOM);
    }
}
function getRoadSVG(flags) {
    const top = applyTemp(getTop(flags));
    const bottom = applyTemp(getBottom(flags));
    const left = applyTemp(getLeft(flags));
    const right = applyTemp(getRight(flags));
    console.log('svg', top, bottom, left, right);
    return roads[((top * 3 + bottom) * 3 + left) * 3 + right].cloneNode(true);
}
const applyTemp = (road) => road === 3 ? ROAD_OUT : road;
const clearTemp = (road) => road === 3 ? ROAD_NONE : road;
const applyTemps = (flags) => makeFlags(applyTemp(getTop(flags)), applyTemp(getBottom(flags)), applyTemp(getLeft(flags)), applyTemp(getRight(flags)), getOther(flags));
const clearTemps = (flags) => makeFlags(clearTemp(getTop(flags)), clearTemp(getBottom(flags)), clearTemp(getLeft(flags)), clearTemp(getRight(flags)), getOther(flags));
const getTop /*   */ = (flags) => (flags >> 3 * 2 + 4 & 0b11);
const getBottom /**/ = (flags) => (flags >> 2 * 2 + 4 & 0b11);
const getLeft /*  */ = (flags) => (flags >> 1 * 2 + 4 & 0b11);
const getRight /* */ = (flags) => (flags >> 0 * 2 + 4 & 0b11);
const getOther /* */ = (flags) => flags & 0b1111;
const get = (flags, direction) => direction === -1 ? 0 : (flags >> (3 - direction) * 2 + 4 & 0b11);
const items = (flags) => [
    getTop(flags),
    getBottom(flags),
    getLeft(flags),
    getRight(flags),
];
const setTop /*   */ = (flags, top) => flags & 0b001111111111 | top /*   */ << 3 * 2 + 4;
const setBottom /**/ = (flags, bottom) => flags & 0b110011111111 | bottom /**/ << 2 * 2 + 4;
const setLeft /*  */ = (flags, left) => flags & 0b111100111111 | left /*  */ << 1 * 2 + 4;
const setRight /* */ = (flags, left) => flags & 0b111111001111 | left /*  */ << 0 * 2 + 4;
const setOther /* */ = (flags, other) => flags & 0b111111110000 | other;
const set = (flags, road, direction) => flags & 0xFFF ^ 0b11 << (3 - direction) * 2 + 4 | road << (3 - direction) * 2 + 4;
const makeFlags = (top, bottom, left, right, other) => top /*   */ << 3 * 2 + 4 |
    bottom /**/ << 2 * 2 + 4 |
    left /*  */ << 1 * 2 + 4 |
    right /* */ << 0 * 2 + 4 |
    other;
function h(tag, attr, ...children) {
    const e = document.createElement(tag);
    if (attr) {
        if ('id' in attr) {
            $[attr.id] = e;
        }
        for (const [key, value] of Object.entries(attr)) {
            if (typeof value == 'string') {
                e.setAttribute(key, value);
            }
            else {
                e.addEventListener(key, value);
            }
        }
    }
    e.append(...children);
    return e;
}
function test() {
    let current = {
        passed: 0,
        error: 0,
    };
    const stack = [];
    function print(text) {
        console.log('  '.repeat(stack.length) + text);
    }
    function g(name, cb) {
        print(`begin ${name}`);
        stack.push(current);
        current = {
            passed: 0,
            error: 0,
        };
        try {
            cb();
        }
        catch (e) {
            print('error ' + e);
        }
        const { passed, error } = current;
        current = stack.pop();
        if (error) {
            current.error++;
        }
        else {
            current.passed++;
        }
        print(`end   ${name} passed: ${passed}, error: ${error}`);
    }
    function obj(o) {
        for (const [key, value] of Object.entries(o)) {
            g(key, () => {
                if (typeof value === 'function') {
                    value();
                }
                else {
                    obj(value);
                }
            });
        }
    }
    function eq(a, b) {
        if (a === b) {
            current.passed++;
        }
        else {
            current.error++;
            print(`error ${a} should equal to ${b}`);
            error();
        }
    }
    function ne(a, b) {
        if (a !== b) {
            current.passed++;
        }
        else {
            current.error++;
            print(`error ${a} should not equal to ${b}`);
            error();
        }
    }
    function error() {
        try {
            throw new Error();
        }
        catch (e) {
            print(e.stack);
        }
    }
    obj({
        getDirection() {
            eq(getDirection(-2, -2), -1);
            eq(getDirection(-2, -1), -1);
            eq(getDirection(-2, 0), -1);
            eq(getDirection(-2, 1), -1);
            eq(getDirection(-2, 1), -1);
            eq(getDirection(-1, -2), -1);
            eq(getDirection(-1, -1), -1);
            eq(getDirection(-1, 0), 0);
            eq(getDirection(-1, 1), -1);
            eq(getDirection(-1, 1), -1);
            eq(getDirection(0, -2), -1);
            eq(getDirection(0, -1), 2);
            eq(getDirection(0, 0), -1);
            eq(getDirection(0, 1), 3);
            eq(getDirection(0, 2), -1);
            eq(getDirection(1, -2), -1);
            eq(getDirection(1, -1), -1);
            eq(getDirection(1, 0), 1);
            eq(getDirection(1, 1), -1);
            eq(getDirection(1, 1), -1);
            eq(getDirection(2, -2), -1);
            eq(getDirection(2, -1), -1);
            eq(getDirection(2, 0), -1);
            eq(getDirection(2, 1), -1);
            eq(getDirection(2, 1), -1);
        },
        applyTemp() {
            eq(applyTemp(ROAD_NONE), ROAD_NONE);
            eq(applyTemp(ROAD_IN), ROAD_IN);
            eq(applyTemp(ROAD_OUT), ROAD_OUT);
            eq(applyTemp(ROAD_TEMP_OUT), ROAD_OUT);
        },
        clearTemp() {
            eq(clearTemp(ROAD_NONE), ROAD_NONE);
            eq(clearTemp(ROAD_IN), ROAD_IN);
            eq(clearTemp(ROAD_OUT), ROAD_OUT);
            eq(clearTemp(ROAD_TEMP_OUT), ROAD_NONE);
        },
        getTop() {
            eq(getTop(0), 0b00);
            eq(getTop(1024), 0b01);
            eq(getTop(2048), 0b10);
            eq(getTop(3072), 0b11);
            eq(getTop(1023), 0b00);
            eq(getTop(2047), 0b01);
            eq(getTop(3071), 0b10);
            eq(getTop(4095), 0b11);
        },
        getBottom() {
            eq(getBottom(0), 0b00);
            eq(getBottom(256), 0b01);
            eq(getBottom(512), 0b10);
            eq(getBottom(768), 0b11);
            eq(getBottom(3327), 0b00);
            eq(getBottom(3583), 0b01);
            eq(getBottom(3839), 0b10);
            eq(getBottom(4095), 0b11);
        },
        getLeft() {
            eq(getLeft(0), 0b00);
            eq(getLeft(64), 0b01);
            eq(getLeft(128), 0b10);
            eq(getLeft(192), 0b11);
            eq(getLeft(3903), 0b00);
            eq(getLeft(3967), 0b01);
            eq(getLeft(4031), 0b10);
            eq(getLeft(4095), 0b11);
        },
        getRight() {
            eq(getRight(0), 0b00);
            eq(getRight(16), 0b01);
            eq(getRight(32), 0b10);
            eq(getRight(48), 0b11);
            eq(getRight(4047), 0b00);
            eq(getRight(4063), 0b01);
            eq(getRight(4079), 0b10);
            eq(getRight(4095), 0b11);
        },
        getOther() {
            eq(getOther(0), 0b0000);
            eq(getOther(1), 0b0001);
            eq(getOther(2), 0b0010);
            eq(getOther(3), 0b0011);
            eq(getOther(4), 0b0100);
            eq(getOther(5), 0b0101);
            eq(getOther(6), 0b0110);
            eq(getOther(7), 0b0111);
            eq(getOther(8), 0b1000);
            eq(getOther(9), 0b1001);
            eq(getOther(10), 0b1010);
            eq(getOther(11), 0b1011);
            eq(getOther(12), 0b1100);
            eq(getOther(13), 0b1101);
            eq(getOther(14), 0b1110);
            eq(getOther(15), 0b1111);
            eq(getOther(4080), 0b0000);
            eq(getOther(4081), 0b0001);
            eq(getOther(4082), 0b0010);
            eq(getOther(4083), 0b0011);
            eq(getOther(4084), 0b0100);
            eq(getOther(4085), 0b0101);
            eq(getOther(4086), 0b0110);
            eq(getOther(4087), 0b0111);
            eq(getOther(4088), 0b1000);
            eq(getOther(4089), 0b1001);
            eq(getOther(4090), 0b1010);
            eq(getOther(4091), 0b1011);
            eq(getOther(4092), 0b1100);
            eq(getOther(4093), 0b1101);
            eq(getOther(4094), 0b1110);
            eq(getOther(4095), 0b1111);
        },
        setTop() {
            eq(setTop(0, 0b00), 0);
            eq(setTop(0, 0b01), 1024);
            eq(setTop(0, 0b10), 2048);
            eq(setTop(0, 0b11), 3072);
            eq(setTop(4095, 0b00), 1023);
            eq(setTop(4095, 0b01), 2047);
            eq(setTop(4095, 0b10), 3071);
            eq(setTop(4095, 0b11), 4095);
        },
        setBottom() {
            eq(setBottom(0, 0b00), 0);
            eq(setBottom(0, 0b01), 256);
            eq(setBottom(0, 0b10), 512);
            eq(setBottom(0, 0b11), 768);
            eq(setBottom(4095, 0b00), 3327);
            eq(setBottom(4095, 0b01), 3583);
            eq(setBottom(4095, 0b10), 3839);
            eq(setBottom(4095, 0b11), 4095);
        },
        setLeft() {
            eq(setLeft(0, 0b00), 0);
            eq(setLeft(0, 0b01), 64);
            eq(setLeft(0, 0b10), 128);
            eq(setLeft(0, 0b11), 192);
            eq(setLeft(4095, 0b00), 3903);
            eq(setLeft(4095, 0b01), 3967);
            eq(setLeft(4095, 0b10), 4031);
            eq(setLeft(4095, 0b11), 4095);
        },
        setRight() {
            eq(setRight(0, 0b00), 0);
            eq(setRight(0, 0b01), 16);
            eq(setRight(0, 0b10), 32);
            eq(setRight(0, 0b11), 48);
            eq(setRight(4095, 0b00), 4047);
            eq(setRight(4095, 0b01), 4063);
            eq(setRight(4095, 0b10), 4079);
            eq(setRight(4095, 0b11), 4095);
        },
        setOther() {
            eq(setOther(0, 0b0000), 0);
            eq(setOther(0, 0b0001), 1);
            eq(setOther(0, 0b0010), 2);
            eq(setOther(0, 0b0011), 3);
            eq(setOther(0, 0b0100), 4);
            eq(setOther(0, 0b0101), 5);
            eq(setOther(0, 0b0110), 6);
            eq(setOther(0, 0b0111), 7);
            eq(setOther(0, 0b1000), 8);
            eq(setOther(0, 0b1001), 9);
            eq(setOther(0, 0b1010), 10);
            eq(setOther(0, 0b1011), 11);
            eq(setOther(0, 0b1100), 12);
            eq(setOther(0, 0b1101), 13);
            eq(setOther(0, 0b1110), 14);
            eq(setOther(0, 0b1111), 15);
            eq(setOther(4095, 0b0000), 4080);
            eq(setOther(4095, 0b0001), 4081);
            eq(setOther(4095, 0b0010), 4082);
            eq(setOther(4095, 0b0011), 4083);
            eq(setOther(4095, 0b0100), 4084);
            eq(setOther(4095, 0b0101), 4085);
            eq(setOther(4095, 0b0110), 4086);
            eq(setOther(4095, 0b0111), 4087);
            eq(setOther(4095, 0b1000), 4088);
            eq(setOther(4095, 0b1001), 4089);
            eq(setOther(4095, 0b1010), 4090);
            eq(setOther(4095, 0b1011), 4091);
            eq(setOther(4095, 0b1100), 4092);
            eq(setOther(4095, 0b1101), 4093);
            eq(setOther(4095, 0b1110), 4094);
            eq(setOther(4095, 0b1111), 4095);
        },
    });
    print(`total passed: ${current.passed}, error: ${current.error}`);
}
