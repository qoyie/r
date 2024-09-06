type Road = typeof ROAD_NONE | typeof ROAD_IN | typeof ROAD_OUT | typeof ROAD_TEMP_OUT;
type Direction = typeof DIRECTION_NONE | typeof DIRECTION_TOP | typeof DIRECTION_BOTTOM | typeof DIRECTION_LEFT | typeof DIRECTION_RIGHT;

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

const directions: readonly Direction[] = [
    -1, 0, -1,
    2, -1, 3,
    -1, 1, -1,
];

const getDirection = (di: number, dj: number) => -1 <= di && di <= 1 && -1 <= dj && dj <= 1 ? directions[di * 3 + dj + 4] : -1;

const onMouseDown = (row: number, col: number) => (e: MouseEvent) => {
    e.preventDefault();
    paving = e.button === 0;
    deleting = e.button === 2;
    onMouseEnter(row, col)(e);
}

const onMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    paving = deleting = false;
    lastRow = lastCol = void 0;
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
            const flags = layer[row][col];
            layer[row][col] = applyTemps(flags);
        }
    }
}

const onMouseEnter = (row: number, col: number) => (e: MouseEvent) => {
    if (paving) {
        updateBothFlags(row, col, (lastFlags, currentFlags, direction) => {
            switch (direction) {
                case DIRECTION_TOP: {
                    return [
                        lastFlags /*   */ === 0 ? 0b10_01_00_00_0000 : setTop(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 0b11_01_00_00_0000 : setBottom(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_BOTTOM: {
                    return [
                        lastFlags /*   */ === 0 ? 0b01_10_00_00_0000 : setBottom(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 0b01_11_00_00_0000 : setTop(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_LEFT: {
                    return [
                        lastFlags /*   */ === 0 ? 0b00_00_10_01_0000 : setLeft(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 0b00_00_11_01_0000 : setRight(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_RIGHT: {
                    return [
                        lastFlags /*   */ === 0 ? 0b00_00_01_10_0000 : setRight(clearTemps(lastFlags), ROAD_OUT),
                        currentFlags /**/ === 0 ? 0b00_00_01_11_0000 : setLeft(currentFlags, ROAD_IN),
                    ];
                }
                case DIRECTION_NONE:
                    return [applyTemps(lastFlags), applyTemps(currentFlags)];
            }
        });
    } else if (deleting) {
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
}

const $: Record<string, HTMLElement> = {};

document.getElementById('main')!.append(
    <div id="drawLayer" class="layer grid">
        {...Array.from(Array(ROWS * COLUMNS), _ =>
            <div>
            </div>
        )}
    </div>,
    <div id="clickLayer" class="layer grid" mouseleave={onMouseUp} contextmenu={e => e.preventDefault()}>
        {...Array.from(Array(ROWS), (_, i) => Array.from(Array(COLUMNS), (_, j) =>
            <div mouseenter={onMouseEnter(i, j)} mousedown={onMouseDown(i, j)} mouseup={onMouseUp}>
            </div>
        )).flat()}
    </div>
);

const roads = [...document.getElementById('roads')!.children];

const drawLayer = $.drawLayer;

const layers = Array.from(Array(LAYERS), _ => Array.from(Array(ROWS), _ => Array(COLUMNS).fill(0)));

let currentLayer = 0;
let displayLayer = LAYERS - 1;
let layer = layers[currentLayer];
let lastRow: number | undefined, lastCol: number | undefined;
let paving = false;
let deleting = false;

function updateFlags(row: number, col: number, callback: (currentFlags: number) => number) {
    const currentFlags = layer[row][col];
    const newFlags = callback(currentFlags);
    if (newFlags !== currentFlags) {
        updateDOM(row, col, newFlags);
    }
    lastRow = row;
    lastCol = col;
}

function updateBothFlags(row: number, col: number, callback: (lastFlags: number, currentFlags: number, direction: Direction) => [number, number]) {
    const currentFlags = layer[row][col];
    const lastFlags = lastRow == null ? 0 : layer[lastRow][lastCol!];
    const direction = lastRow == null ? -1 : getDirection(row - lastRow, col - lastCol!);
    const [newLastFlags, newFlags] = callback(lastFlags, currentFlags, direction);
    updateDOM(row, col, newFlags);
    if (lastRow != null) {
        updateDOM(lastRow, lastCol!, newLastFlags);
    }
    lastRow = row;
    lastCol = col;
}

function updateDOM(row: number, col: number, flags: number) {
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

function getRoadSVG(flags: number) {
    const top = applyTemp(getTop(flags));
    const bottom = applyTemp(getBottom(flags));
    const left = applyTemp(getLeft(flags));
    const right = applyTemp(getRight(flags));
    console.log('svg', top, bottom, left, right);
    return roads[((top * 3 + bottom) * 3 + left) * 3 + right].cloneNode(true);
}

const applyTemp = (road: Road) => road === 3 ? ROAD_OUT : road;
const clearTemp = (road: Road) => road === 3 ? ROAD_NONE : road;

const applyTemps = (flags: number) =>
    makeFlags(
        applyTemp(getTop(flags)),
        applyTemp(getBottom(flags)),
        applyTemp(getLeft(flags)),
        applyTemp(getRight(flags)),
        getOther(flags),
    )

const clearTemps = (flags: number) =>
    makeFlags(
        clearTemp(getTop(flags)),
        clearTemp(getBottom(flags)),
        clearTemp(getLeft(flags)),
        clearTemp(getRight(flags)),
        getOther(flags),
    )

const getTop /*   */ = (flags: number) => (flags >> 3 * 2 + 4 & 0b11) as Road;
const getBottom /**/ = (flags: number) => (flags >> 2 * 2 + 4 & 0b11) as Road;
const getLeft /*  */ = (flags: number) => (flags >> 1 * 2 + 4 & 0b11) as Road;
const getRight /* */ = (flags: number) => (flags >> 0 * 2 + 4 & 0b11) as Road;
const getOther /* */ = (flags: number) => flags & 0b1111;
const get = (flags: number, direction: Direction) => direction === -1 ? 0 : (flags >> (3 - direction) * 2 + 4 & 0b11) as Road;
const items = (flags: number) => [
    getTop(flags),
    getBottom(flags),
    getLeft(flags),
    getRight(flags),
] as const;

const setTop /*   */ = (flags: number, top: /*   */ number) => flags & 0b001111111111 | top /*   */ << 3 * 2 + 4;
const setBottom /**/ = (flags: number, bottom: /**/ number) => flags & 0b110011111111 | bottom /**/ << 2 * 2 + 4;
const setLeft /*  */ = (flags: number, left: /*  */ number) => flags & 0b111100111111 | left /*  */ << 1 * 2 + 4;
const setRight /* */ = (flags: number, left: /*  */ number) => flags & 0b111111001111 | left /*  */ << 0 * 2 + 4;
const setOther /* */ = (flags: number, other: /* */ number) => flags & 0b111111110000 | other;
const set = (flags: number, road: Road, direction: Direction) => flags & 0xFFF ^ 0b11 << (3 - direction) * 2 + 4 | road << (3 - direction) * 2 + 4;

const makeFlags = (top: Road, bottom: Road, left: Road, right: Road, other: number) =>
    top /*   */ << 3 * 2 + 4 |
    bottom /**/ << 2 * 2 + 4 |
    left /*  */ << 1 * 2 + 4 |
    right /* */ << 0 * 2 + 4 |
    other;

function h(tag: string, attr?: Record<string, string | ((e: Event) => void)> & { id?: string } | null, ...children: (Node | string)[]) {
    const e = document.createElement(tag);
    if (attr) {
        if ('id' in attr) {
            $[attr.id!] = e;
        }
        for (const [key, value] of Object.entries(attr)) {
            if (typeof value == 'string') {
                e.setAttribute(key, value);
            } else {
                e.addEventListener(key, value);
            }
        }
    }
    e.append(...children);
    return e;
}

declare namespace JSX {
    type IntrinsicElements = {
        [p in keyof HTMLElementTagNameMap]: Record<string, string | ((e: never) => void)> & Partial<{
            [p in keyof HTMLElementEventMap]: (e: HTMLElementEventMap[p]) => void
        }>
    }
    type Element = HTMLElement;
}

function test() {
    let current = {
        passed: 0,
        error: 0,
    };
    const stack: (typeof current)[] = [];
    function print(text: string) {
        console.log('  '.repeat(stack.length) + text);
    }
    function g(name: string, cb: () => void) {
        print(`begin ${name}`);
        stack.push(current);
        current = {
            passed: 0,
            error: 0,
        };
        try {
            cb();
        } catch (e) {
            print('error ' + e);
        }
        const { passed, error } = current;
        current = stack.pop()!;
        if (error) {
            current.error++;
        } else {
            current.passed++;
        }
        print(`end   ${name} passed: ${passed}, error: ${error}`);
    }
    interface TestObject {
        [p: string]: TestObject | (() => void);
    }
    function obj(o: TestObject) {
        for (const [key, value] of Object.entries(o)) {
            g(key, () => {
                if (typeof value === 'function') {
                    value();
                } else {
                    obj(value);
                }
            })
        }
    }
    function eq<T>(a: T, b: T) {
        if (a === b) {
            current.passed++;
        } else {
            current.error++;
            print(`error ${a} should equal to ${b}`);
            error();
        }
    }
    function ne<T>(a: T, b: T) {
        if (a !== b) {
            current.passed++;
        } else {
            current.error++;
            print(`error ${a} should not equal to ${b}`);
            error();
        }
    }
    function error() {
        try {
            throw new Error();
        } catch (e) {
            print((e as Error).stack!);
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
            eq(getTop(0b00_00_00_00_0000), 0b00);
            eq(getTop(0b01_00_00_00_0000), 0b01);
            eq(getTop(0b10_00_00_00_0000), 0b10);
            eq(getTop(0b11_00_00_00_0000), 0b11);
            eq(getTop(0b00_11_11_11_1111), 0b00);
            eq(getTop(0b01_11_11_11_1111), 0b01);
            eq(getTop(0b10_11_11_11_1111), 0b10);
            eq(getTop(0b11_11_11_11_1111), 0b11);
        },
        getBottom() {
            eq(getBottom(0b00_00_00_00_0000), 0b00);
            eq(getBottom(0b00_01_00_00_0000), 0b01);
            eq(getBottom(0b00_10_00_00_0000), 0b10);
            eq(getBottom(0b00_11_00_00_0000), 0b11);
            eq(getBottom(0b11_00_11_11_1111), 0b00);
            eq(getBottom(0b11_01_11_11_1111), 0b01);
            eq(getBottom(0b11_10_11_11_1111), 0b10);
            eq(getBottom(0b11_11_11_11_1111), 0b11);
        },
        getLeft() {
            eq(getLeft(0b00_00_00_00_0000), 0b00);
            eq(getLeft(0b00_00_01_00_0000), 0b01);
            eq(getLeft(0b00_00_10_00_0000), 0b10);
            eq(getLeft(0b00_00_11_00_0000), 0b11);
            eq(getLeft(0b11_11_00_11_1111), 0b00);
            eq(getLeft(0b11_11_01_11_1111), 0b01);
            eq(getLeft(0b11_11_10_11_1111), 0b10);
            eq(getLeft(0b11_11_11_11_1111), 0b11);
        },
        getRight() {
            eq(getRight(0b00_00_00_00_0000), 0b00);
            eq(getRight(0b00_00_00_01_0000), 0b01);
            eq(getRight(0b00_00_00_10_0000), 0b10);
            eq(getRight(0b00_00_00_11_0000), 0b11);
            eq(getRight(0b11_11_11_00_1111), 0b00);
            eq(getRight(0b11_11_11_01_1111), 0b01);
            eq(getRight(0b11_11_11_10_1111), 0b10);
            eq(getRight(0b11_11_11_11_1111), 0b11);
        },
        getOther() {
            eq(getOther(0b00_00_00_00_0000), 0b0000);
            eq(getOther(0b00_00_00_00_0001), 0b0001);
            eq(getOther(0b00_00_00_00_0010), 0b0010);
            eq(getOther(0b00_00_00_00_0011), 0b0011);
            eq(getOther(0b00_00_00_00_0100), 0b0100);
            eq(getOther(0b00_00_00_00_0101), 0b0101);
            eq(getOther(0b00_00_00_00_0110), 0b0110);
            eq(getOther(0b00_00_00_00_0111), 0b0111);
            eq(getOther(0b00_00_00_00_1000), 0b1000);
            eq(getOther(0b00_00_00_00_1001), 0b1001);
            eq(getOther(0b00_00_00_00_1010), 0b1010);
            eq(getOther(0b00_00_00_00_1011), 0b1011);
            eq(getOther(0b00_00_00_00_1100), 0b1100);
            eq(getOther(0b00_00_00_00_1101), 0b1101);
            eq(getOther(0b00_00_00_00_1110), 0b1110);
            eq(getOther(0b00_00_00_00_1111), 0b1111);
            eq(getOther(0b11_11_11_11_0000), 0b0000);
            eq(getOther(0b11_11_11_11_0001), 0b0001);
            eq(getOther(0b11_11_11_11_0010), 0b0010);
            eq(getOther(0b11_11_11_11_0011), 0b0011);
            eq(getOther(0b11_11_11_11_0100), 0b0100);
            eq(getOther(0b11_11_11_11_0101), 0b0101);
            eq(getOther(0b11_11_11_11_0110), 0b0110);
            eq(getOther(0b11_11_11_11_0111), 0b0111);
            eq(getOther(0b11_11_11_11_1000), 0b1000);
            eq(getOther(0b11_11_11_11_1001), 0b1001);
            eq(getOther(0b11_11_11_11_1010), 0b1010);
            eq(getOther(0b11_11_11_11_1011), 0b1011);
            eq(getOther(0b11_11_11_11_1100), 0b1100);
            eq(getOther(0b11_11_11_11_1101), 0b1101);
            eq(getOther(0b11_11_11_11_1110), 0b1110);
            eq(getOther(0b11_11_11_11_1111), 0b1111);
        },
        setTop() {
            eq(setTop(0b00_00_00_00_0000, 0b00), 0b00_00_00_00_0000);
            eq(setTop(0b00_00_00_00_0000, 0b01), 0b01_00_00_00_0000);
            eq(setTop(0b00_00_00_00_0000, 0b10), 0b10_00_00_00_0000);
            eq(setTop(0b00_00_00_00_0000, 0b11), 0b11_00_00_00_0000);
            eq(setTop(0b11_11_11_11_1111, 0b00), 0b00_11_11_11_1111);
            eq(setTop(0b11_11_11_11_1111, 0b01), 0b01_11_11_11_1111);
            eq(setTop(0b11_11_11_11_1111, 0b10), 0b10_11_11_11_1111);
            eq(setTop(0b11_11_11_11_1111, 0b11), 0b11_11_11_11_1111);
        },
        setBottom() {
            eq(setBottom(0b00_00_00_00_0000, 0b00), 0b00_00_00_00_0000);
            eq(setBottom(0b00_00_00_00_0000, 0b01), 0b00_01_00_00_0000);
            eq(setBottom(0b00_00_00_00_0000, 0b10), 0b00_10_00_00_0000);
            eq(setBottom(0b00_00_00_00_0000, 0b11), 0b00_11_00_00_0000);
            eq(setBottom(0b11_11_11_11_1111, 0b00), 0b11_00_11_11_1111);
            eq(setBottom(0b11_11_11_11_1111, 0b01), 0b11_01_11_11_1111);
            eq(setBottom(0b11_11_11_11_1111, 0b10), 0b11_10_11_11_1111);
            eq(setBottom(0b11_11_11_11_1111, 0b11), 0b11_11_11_11_1111);
        },
        setLeft() {
            eq(setLeft(0b00_00_00_00_0000, 0b00), 0b00_00_00_00_0000);
            eq(setLeft(0b00_00_00_00_0000, 0b01), 0b00_00_01_00_0000);
            eq(setLeft(0b00_00_00_00_0000, 0b10), 0b00_00_10_00_0000);
            eq(setLeft(0b00_00_00_00_0000, 0b11), 0b00_00_11_00_0000);
            eq(setLeft(0b11_11_11_11_1111, 0b00), 0b11_11_00_11_1111);
            eq(setLeft(0b11_11_11_11_1111, 0b01), 0b11_11_01_11_1111);
            eq(setLeft(0b11_11_11_11_1111, 0b10), 0b11_11_10_11_1111);
            eq(setLeft(0b11_11_11_11_1111, 0b11), 0b11_11_11_11_1111);
        },
        setRight() {
            eq(setRight(0b00_00_00_00_0000, 0b00), 0b00_00_00_00_0000);
            eq(setRight(0b00_00_00_00_0000, 0b01), 0b00_00_00_01_0000);
            eq(setRight(0b00_00_00_00_0000, 0b10), 0b00_00_00_10_0000);
            eq(setRight(0b00_00_00_00_0000, 0b11), 0b00_00_00_11_0000);
            eq(setRight(0b11_11_11_11_1111, 0b00), 0b11_11_11_00_1111);
            eq(setRight(0b11_11_11_11_1111, 0b01), 0b11_11_11_01_1111);
            eq(setRight(0b11_11_11_11_1111, 0b10), 0b11_11_11_10_1111);
            eq(setRight(0b11_11_11_11_1111, 0b11), 0b11_11_11_11_1111);
        },
        setOther() {
            eq(setOther(0b00_00_00_00_0000, 0b0000), 0b00_00_00_00_0000);
            eq(setOther(0b00_00_00_00_0000, 0b0001), 0b00_00_00_00_0001);
            eq(setOther(0b00_00_00_00_0000, 0b0010), 0b00_00_00_00_0010);
            eq(setOther(0b00_00_00_00_0000, 0b0011), 0b00_00_00_00_0011);
            eq(setOther(0b00_00_00_00_0000, 0b0100), 0b00_00_00_00_0100);
            eq(setOther(0b00_00_00_00_0000, 0b0101), 0b00_00_00_00_0101);
            eq(setOther(0b00_00_00_00_0000, 0b0110), 0b00_00_00_00_0110);
            eq(setOther(0b00_00_00_00_0000, 0b0111), 0b00_00_00_00_0111);
            eq(setOther(0b00_00_00_00_0000, 0b1000), 0b00_00_00_00_1000);
            eq(setOther(0b00_00_00_00_0000, 0b1001), 0b00_00_00_00_1001);
            eq(setOther(0b00_00_00_00_0000, 0b1010), 0b00_00_00_00_1010);
            eq(setOther(0b00_00_00_00_0000, 0b1011), 0b00_00_00_00_1011);
            eq(setOther(0b00_00_00_00_0000, 0b1100), 0b00_00_00_00_1100);
            eq(setOther(0b00_00_00_00_0000, 0b1101), 0b00_00_00_00_1101);
            eq(setOther(0b00_00_00_00_0000, 0b1110), 0b00_00_00_00_1110);
            eq(setOther(0b00_00_00_00_0000, 0b1111), 0b00_00_00_00_1111);
            eq(setOther(0b11_11_11_11_1111, 0b0000), 0b11_11_11_11_0000);
            eq(setOther(0b11_11_11_11_1111, 0b0001), 0b11_11_11_11_0001);
            eq(setOther(0b11_11_11_11_1111, 0b0010), 0b11_11_11_11_0010);
            eq(setOther(0b11_11_11_11_1111, 0b0011), 0b11_11_11_11_0011);
            eq(setOther(0b11_11_11_11_1111, 0b0100), 0b11_11_11_11_0100);
            eq(setOther(0b11_11_11_11_1111, 0b0101), 0b11_11_11_11_0101);
            eq(setOther(0b11_11_11_11_1111, 0b0110), 0b11_11_11_11_0110);
            eq(setOther(0b11_11_11_11_1111, 0b0111), 0b11_11_11_11_0111);
            eq(setOther(0b11_11_11_11_1111, 0b1000), 0b11_11_11_11_1000);
            eq(setOther(0b11_11_11_11_1111, 0b1001), 0b11_11_11_11_1001);
            eq(setOther(0b11_11_11_11_1111, 0b1010), 0b11_11_11_11_1010);
            eq(setOther(0b11_11_11_11_1111, 0b1011), 0b11_11_11_11_1011);
            eq(setOther(0b11_11_11_11_1111, 0b1100), 0b11_11_11_11_1100);
            eq(setOther(0b11_11_11_11_1111, 0b1101), 0b11_11_11_11_1101);
            eq(setOther(0b11_11_11_11_1111, 0b1110), 0b11_11_11_11_1110);
            eq(setOther(0b11_11_11_11_1111, 0b1111), 0b11_11_11_11_1111);
        },
    });
    print(`total passed: ${current.passed}, error: ${current.error}`);
}