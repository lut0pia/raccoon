# Table of contents

1. [Introduction](#introduction)
1. [Editors](#editors)
    1. [Bin Browser](#bin-browser)
    1. [Sprite Editor](#sprite-editor)
1. [Memory](#memory)
    1. [Spritesheet Memory](#spritesheet-memory)
    1. [Map Memory](#map-memory)
    1. [Palette Memory](#palette-memory)
    1. [Sprite Flags Memory](#sprite-flags-memory)
    1. [Gamepad State Memory](#gamepad-state-memory)
    1. [Screen Memory](#screen-memory)
1. [Functions](#functions)
    1. [Rendering Functions](#rendering-functions)
    1. [Math Functions](#math-functions)
    1. [Input Functions](#input-functions)
    1. [Memory Functions](#memory-functions)
    1. [Function Shortcuts](#function-shortcuts)

# Introduction

Raccoon is a browser-based fantasy console. It's an easy tool to make, share and play small games. Its capabilities are purposefully limited to allow you, the creator, not to be overwhelmed by the possibilities. Although the console is limited, the tools are carefully crafted to give you a smooth creating experience. Raccoon games are contained in bins.

# Editors

## Bin Browser

The bin browser allows you to `Save` and `Load` bins, usually from the local storage (a persistent storage space in your browser). It can also be used to `Download` the current bin into a `.rcn.json` file that you can then upload through the file input. Share it with your friends!

## Sprite Editor

The sprite editor allows you to draw small images that you will then be able to draw into your game.

# Memory

Read-only memory (abbreviated ROM) is 20KiB long (`0x0000-0x5000`) and is contained in the bin. It is loaded in the random access memory (abbreviated RAM), which is 32KiB long (`0x0000-0x8000`) at startup. A program accesses only RAM during its execution.

N.B. Ranges in memory are expressed with their end excluded.

| Memory range | Usage | Lifetime | Breakdown
| --- | --- | --- | ---
| `0x0000-0x2000` | [Spritesheet](#spritesheet-memory) | ROM | 128x128x4bits
| `0x2000-0x4000` | [Map](#map-memory) | ROM | 128x64x8bits
| `0x4000-0x4018` | [Palette](#palette-memory) | ROM | 8x24bits
| `0x4100-0x4200` | [Sprite flags](#sprite-flags-memory) | ROM | 256x8bits
| `0x5010-0x5014` | [Gamepad state](#gamepad-state-memory) | RAM | 4x(4+4)bits
| `0x6000-0x8000` | [Screen](#screen-memory) | RAM | 128x128x4bits

## Spritesheet Memory

Spritesheet data is 128x128 pixels, arranged in 256 8x8 sprites from left to right, top to bottom.

## Map Memory

Map data is 128x64 tiles, where each tile is a byte-sized sprite index.

## Palette Memory

Palette data is 8 RGB colors, each 3 bytes for the red, green and blue channels.

## Sprite Flags Memory

Sprite flags are 256 8bits bitfields.

## Gamepad State Memory

Gamepad state data is 4 8bit controllers. The 4 least significant bits correspond to the left, right, up and down directions respectively, while the 4 most significant bits correspond to 4 action buttons. On the keyboard those action buttons are X, C, V and B respectively, while on a modern gamepad they are the down, right, left and top face buttons respectively.

## Screen Memory

Screen data is 128x128 pixels.

# Functions

## Rendering Functions

Screen coordinates go from (0;0), which is the top-left pixel, to (127;127), which is the bottom-down pixel.

- `cls(c=0)`: Clears the whole screen to the `c` color
- `palset(c, r, g, b)`: Sets the `c` palette color to have the RGB values `r`, `g` and `b` (0-255)
- `pset(x, y, c)`: Sets the pixel at coordinates (`x`;`y`) to the `c` color
- `pget(x, y)`: Returns the color of the pixel at coordinates (`x`;`y`)
- `spr(n, x, y, w=1.0, h=1.0)`: Draws the `n`th sprite at screen coordinates (`x`;`y`) `w` and `h` are the width and height of the drawing in sprite length (8 pixels per unit)
- `mget(celx, cely)`: Returns the sprite index at map coordinates (`celx`;`cely`)
- `mset(celx, cely, n)`: Set the sprite index at map coordinates (`celx`;`cely`) to `n`
- `map(celx, cely, sx, sy, celw, celh)`: Draws a rectangle of the map starting at (`celx`;`cely`) with an extent of (`celw`;`celh`) at the pixel (`sx`;`sy`)

## Math Functions

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

## Input Functions

- `btn(i, p=0)`: Returns true if button `i` is pressed for player `p`

## Memory Functions

- `memcpy(dst, src, len)`: Copies `len` bytes in RAM from `src` to `dst`
- `memset(dst, val, len)`: Sets `len` bytes in RAM to value `val` at `dst`
- `read(addr)`: Returns the value of the byte at address `addr` in RAM
- `write(addr, val)`: Writes value `val` to the byte at address `addr` in RAM

## Function Shortcuts

Some common functions have one-letter shortcuts, useful for keeping code small.

- `c` = `cls`
- `p` = `pset`
- `r` = `rnd`
- `b` = `btn`
