# Raccoon documentation

## Table of contents
1. [Memory](#1-memory)
2. [Programming Interface](#2-programming-interface)

## 1. Memory

Read-only memory (abbreviated ROM) is 20KiB long (`0x0000-0x5000`) and is contained in the bin. It is loaded in the random access memory (abbreviated RAM), which is 32KiB long (`0x0000-0x8000`) at startup. A program accesses only RAM during its execution.

N.B. Ranges in memory are expressed with their end excluded. 

| Memory range | Usage | Lifetime | Breakdown
| --- | --- | --- | ---
| `0x0000-0x2000` | [Spritesheet](#11-spritesheet) | ROM | 128x128x4bits
| `0x2000-0x4000` | [Map](#12-map) | ROM | 256x8bits
| `0x4000-0x4018` | [Palette](#13-palette) | ROM | 8x24bits
| `0x4100-0x4200` | [Sprite flags](#14-sprite-flags) | ROM | 256x8bits
| `0x5010-0x5014` | [Gamepad state](#15-gamepad-state) | RAM | 4x(4+4)bits
| `0x6000-0x8000` | [Screen](#16-screen) | RAM | 128x128x4bits

#### 1.1. Spritesheet

Spritesheet data is 128x128 pixels, arranged in 256 8x8 sprites from left to right, top to bottom.

#### 1.2. Map

#### 1.3. Palette

#### 1.4. Sprite Flags

Sprite flags are 256 8bits bitfields.

#### 1.5. Gamepad State

Gamepad state data is 4 8bit controllers. The 4 least significant bits correspond to the left, right, up and down directions respectively, while the 4 most significant bits correspond to 4 action buttons. On the keyboard those action buttons are X, C, V and B respectively, while on a modern gamepad they are the down, right, left and top face buttons respectively.

#### 1.6. Screen

Screen data is 128x128 pixels.

## 2. Programming Interface

### 2.1. Rendering

Screen coordinates go from (0;0), which is the top-left pixel, to (127;127), which is the bottom-down pixel.

- `cls(c=0)`: Clears the whole screen to the `c` color
- `pset(x, y, c)`: Sets the pixel at coordinates (`x`;`y`) to the `c` color
- `pget(x, y)`: Returns the color of the pixel at coordinates (`x`;`y`)
- `spr(n, x, y, w=1.0, h=1.0)`: Draws the `n`th sprite at screen coordinates (`x`;`y`) `w` and `h` are the width and height of the drawing in sprite length (8 pixels per unit)

### 2.2. Math

- `flr(x)`: Returns closest lesser integer to `x`
- `ceil(x)`: Returns closest greater integer to `x`
- `abs(x)`: Returns the absolute value of `x`
- `sign(x)`: Returns -1 if `x<0`, 1 if `x>0` and 0 otherwise
- `max(a, b)`: Returns the greater number between `a` and `b`
- `min(a, b)`: Returns the lesser number between `a` and `b`
- `mid(a, b, c)`: Returns the middle number between `a`, `b` and `c`
- `sqrt(x)`: Returns the square root of `x`
- `rnd(x?)`: Returns a random integer between 0 and `x` excluded if `x` is specified, otherwise a random number between 0 and 1
- `sin(x)`: Returns the sine of `x`
- `cos(x)`: Returns the cosine of `x`
- `atan2(y, x)`: Returns the counterclockwise angle (in radians) between the positive x-axis and the ray that starts from the origin and passes through (`x`;`y`)

### 2.3. Input

- `btn(i, p=0)`: Returns true if button `i` is pressed for player `p`

### 2.4. Memory

- `memcpy(dst, src, len)`: Copies `len` bytes in RAM from `src` to `dst`
- `memset(dst, val, len)`: Sets `len` bytes in RAM to value `val` at `dst`
- `read(addr)`: Returns the value of the byte at address `addr` in RAM
- `write(addr, val)`: Writes value `val` to the byte at address `addr` in RAM

### 2.5. Shortcuts

Some common functions have one-letter shortcuts, useful for keeping code small.

- `c` = `cls`
- `p` = `pset`
- `r` = `rnd`
- `b` = `btn`
