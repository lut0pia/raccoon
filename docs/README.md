# Raccoon documentation

## Table of contents
1. [Memory](#1.-Memory)
2. [Programming Interface](#2.-Programming-Interface)

## 1. Memory

N.B. Ranges in memory will be expressed with their end excluded.

### 1.1. Read-Only Memory

Read-only memory is the memory contained in the bin. It is 20KiB long.

#### 1.1.1. Spritesheet

Spritesheet data is in the `0x0000-0x2000` range. It is 128x128 pixels, arranged in 256 8x8 sprites from left to right, top to bottom.

#### 1.1.2. Map

Map data is in the `0x2000-0x4000` range.

#### 1.1.3. Palette

Palette data is in the `0x4000-0x4018` range. It is 8 24bit (3 bytes) RGB colors.

#### 1.1.4. Sprite Flags

Sprite flags are in the `0x4100-0x4200` range. It is 256 8bit bitfields.

### 1.2. Random Access Memory

Random Access Memory is the memory used by the machine during execution. At startup, it fetches bytes in `0x0000-0x5000` directly from the bin's ROM. It is 32KiB long.

#### 1.2.1. Gamepad State

Gamepad state data is in the `0x5010-0x5014` range. It is 4 8bit controllers. The 4 least significant bits correspond to the left, right, up and down directions respectively, while the 4 most significant bits correspond to 4 action buttons. On the keyboard those action buttons are X, C, V and B respectively, while on a modern gamepad they are the down, right, left and top face buttons respectively.

#### 1.2.2. Screen

Screen data is in the `0x6000-0x8000` range. It is 128x128 pixels.

## 2. Programming Interface

### 2.1. Rendering

- `cls(c=0)`: Clears the whole screen to the `c` color
- `pset(x, y, c)`: Set the pixel at coordinates (`x`;`y`) to the `c` color
- `pget(x, y)`: Returns the color of the pixel at coordinates (`x`;`y`)

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
- `atan2(x, y)`: Returns the angle (in radians) between the positive x-axis and the ray that starts from the origin and passes through (`x`;`y`)

### 2.3. Input

- `btn(i, p=0)`: Returns true if button `i` is pressed for player `p`

### 2.4. Memory

- `memcpy(dst, src, len)`: Copy `len` bytes in RAM from `src` to `dst`
- `memset(dst, val, len)`: Set `len` bytes in RAM to value `val` at `dst`
- `read(addr)`: Returns the value of the byte at address `addr` in RAM
- `write(addr, val)`: Writes value `val` to the byte at address `addr` in RAM
