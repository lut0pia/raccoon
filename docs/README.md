# Table of contents

1. [Introduction](#introduction)
    1. [Game Loop](#game-loop)
1. [Editors](#editors)
    1. [Bin Browser](#bin-browser)
    1. [Virtual Machine](#virtual-machine)
    1. [Code Editor](#code-editor)
    1. [Sprite Editor](#sprite-editor)
    1. [Sprite Selector](#sprite-selector)
    1. [Map Editor](#map-editor)
    1. [Sound Editor](#sound-editor)
1. [Memory](#memory)
    1. [Spritesheet Memory](#spritesheet-memory)
    1. [Map Memory](#map-memory)
    1. [Palette Memory](#palette-memory)
    1. [Sprite Flags Memory](#sprite-flags-memory)
    1. [Gamepad State Memory](#gamepad-state-memory)
    1. [Screen Memory](#screen-memory)
1. [Functions](#functions)
    1. [Rendering Functions](#rendering-functions)
    1. [Sound Functions](#sound-functions)
    1. [Math Functions](#math-functions)
    1. [Input Functions](#input-functions)
    1. [Memory Functions](#memory-functions)
    1. [Function Shortcuts](#function-shortcuts)

# Introduction

Raccoon is a browser-based fantasy console. It's a tool to make, share and play small games. Its capabilities are purposefully limited to allow you, the creator, not to be overwhelmed by the possibilities. Although the console is limited, the tools are carefully crafted to give you a smooth creating experience. Raccoon games are contained in bins, they're a virtual equivalent to console cartridges. Programming is done in JavaScript.

## Game Loop

There are three special functions that you can define in your code: `init`, `update` and `draw`.

`init` will be called at the very beginning of the game. It won't be called again if you live edit code from the editor. It will be called again if you reboot the virtual machine.

`update` will be called every frame while the virtual machine is not paused. This is generally where most of the game logic goes.

`draw` will be called every frame, even if the virtual machine is paused. That means that in editor you can pause your game on a specific animation frame, and still live edit your draw code and data, and see the result on the virtual machine's screen.

It's not mandatory to put your draw code in the draw function, you can work with `update` only if you want, but it's encouraged because it usually forces you to write better code.

# Editors

Raccoon tools exist in windows that can be moved and resized. Their layout is saved in your local storage.

## Bin Browser

The bin browser allows you to `Save` and `Load` bins, usually from the local storage (a persistent storage space in your browser). It can also be used to `Download` the current bin into a `.rcn.json` file that you can then upload through the file input. Share it with your friends!

## Virtual Machine

The virtual machine is where your game actually comes to life.

The `Reboot` button will wipe everything and load the current bin again, useful to check what happens with a fresh start of your game.

The `Step` button triggers a single frame update. It is useful when paused, to see what happens frame after frame.

The `Paused` checkbox controls whether the virtual machine is currently paused. You can toggle it by pressing `Space` while focusing the virtual machine.

The `Autoapply` checkbox indicates whether or not data changes made to the current bin should be replicated directly inside the virtual machine. You may want to disable it if your game code modifies sprite or map data in realtime.

## Code Editor

The code editor is a text editor with syntax highlighting.

Pressing the `Apply` button or `Control+Enter` (while focusing the text input) will send the current code to the virtual machine, so you can see changes happen right away.

## Sprite Editor

The sprite editor allows you to draw small images that you will then be able to render into your game.

The canvas displays the currently selected sprites (see [Sprite Selector](#sprite-selector) for more information).

To select a drawing color, either use `Left-Click` on the palette on the right or use `1-8` to select the first 8 colors and `Shift+1-8` to select the last 8 colors.

- Use `Left-Click` to set the texel color to the current color.
- Use `Right-Click` to change the current color to be the color of the clicked texel (color picking).
- Use `Control+Left-Click` to fill with the current color.
- Use `Shift+Left-Click` to select texels
- Use `Control+C` to copy selected texels
- Use `Control+V` to paste copied texels

## Sprite Selector

The canvas displays the spritesheet. The index of the currently selected sprite is displayed above.

- Use `Left-Click` to select the sprites you want to edit in the [Sprite Editor](#sprite-editor) or draw in the [Map Editor](#map-editor).

## Map Editor

The map editor allows you to edit a 128x64 tilemap for your game. We'll be using the word tile in this document, any 1x1 sprite is a tile, there is no separate memory for either tiles or sprites.

The canvas displays a view of the map. The coordinates of the current tile is displayed above.

- Use `Left-Click` to set the tile under your cursor to the current tile.
- Use `Right-Click` to change the current tile to be the tile under your cursor.
- Use `Middle-Click` to drag your view of the map to edit different parts of the map.

## Sound Editor

The sound editor allows you to create sound effects and music patterns for your game.

The tempo determines how fast the sound track will play, the instrument determines the basic sound it will make, and the envelope determines an ADSR volume envelope.

The table represents time on the x-axis and note pitches on the y-axis. You can only have one note at a time on a single sound track.

- Use `Left-Click` to either place notes or remove them.
- Use `Right-Click` to change a note's volume.
- Use `Middle-Click` to change a note's effect.
- Use `Up/Down-Arrow` to transpose one semitone.
- Use `Control+Up/Down-Arrow` to transpose one octave.

# Memory

Read-only memory (abbreviated ROM) is 20KiB long (`0x0000-0x5000`) and is contained in the bin. It is loaded in the random access memory (abbreviated RAM), which is 32KiB long (`0x0000-0x8000`) at startup. A program accesses only RAM during its execution.

N.B. Ranges in memory are expressed with their end excluded.

| Memory range | Usage | Lifetime | Breakdown
| --- | --- | --- | ---
| `0x0000-0x1800` | [Spritesheet](#spritesheet-memory) | ROM | 128x96x4bits
| `0x1800-0x3800` | [Map](#map-memory) | ROM | 128x64x8bits
| `0x3800-0x3830` | [Palette](#palette-memory) | ROM | 16x24bits
| `0x3830-0x38f0` | [Sprite flags](#sprite-flags-memory) | ROM | 192x8bits
| `0x5fe2-0x5ff8` | [Palette mod](#palette-mod-memory) | RAM | 16x(4+3+1)bits
| `0x5ff8-0x6000` | [Gamepad state](#gamepad-state-memory) | RAM | 2x4x(4+4)bits
| `0x6000-0x8000` | [Screen](#screen-memory) | RAM | 128x128x4bits

## Spritesheet Memory

Spritesheet data is 128x96 pixels, arranged in 192 8x8 sprites from left to right, top to bottom.

## Map Memory

Map data is 128x64 tiles, where each tile is a byte-sized sprite index.

## Palette Memory

Palette data is 16 RGB colors, each 3 bytes for the red, green and blue channels.

## Sprite Flags Memory

Sprite flags are 192 8bits bitfields.

## Palette Mod Memory

Palette mod are 16 bytes used for palette state for each 16 colors. The first 4 bits are used as a permutation, the last bit is used for transparency, the 3 bits inbetween are reserved for now.

## Gamepad State Memory

Gamepad state data is 4 8bit controllers twice, the first 4 bytes are for the current frame's state while the other 4 bytes are the previous frame's state. The 4 least significant bits of each byte correspond to the left, right, up and down directions respectively, while the 4 most significant bits correspond to 4 action buttons. On the keyboard those action buttons are X, C, V and B respectively, while on a modern gamepad they are the down, right, left and top face buttons respectively.

## Screen Memory

Screen data is 128x128 pixels.

# Functions

## Rendering Functions

Screen coordinates go from (0;0), which is the top-left pixel, to (127;127), which is the bottom-down pixel.

🎥: Affected by `cam` calls

- `cls(c=0)`: Clears the whole screen to the `c` color
- `cam(x, y)`: Offsets all further rendering by (`-x`;`-y`)
- `palset(c, r, g, b)`: Sets the `c` palette color to have the RGB values `r`, `g` and `b` (0-255)
- `pset(x, y, c)`: Sets the pixel at coordinates (`x`;`y`) to the `c` color
- `pget(x, y)`: Returns the color of the pixel at coordinates (`x`;`y`)
- `palm(c0, c1)`: Sets the palette permutation for color `c0` to `c1`
- `palt(c, t)`: Sets the color `c` as transparent if `t`
- `fget(n, f?)`: Returns whether the flag `f` is set to true for the sprite `n`; if `f` is undefined, returns the flags for the sprite `n` as a bitfield
- `fset(n, f?, v)`: Sets the flag `f` to `v` (boolean) for the sprite `n`; if `f` is undefined, uses `v` as a bitfield to set the flags for the sprite `n`
- `mget(celx, cely)`: Returns the sprite index at map coordinates (`celx`;`cely`)
- `mset(celx, cely, n)`: Set the sprite index at map coordinates (`celx`;`cely`) to `n`
- 🎥 `spr(n, x, y, w=1.0, h=1.0, fx=false, fy=false)`: Draws the `n`th sprite at screen coordinates (`x`;`y`) where `w` and `h` are the width and height of the drawing in sprite length (8 pixels per unit), and `fx` and `fy` indicate whether to flip the drawing horizontally and vertically
- 🎥 `map(celx, cely, sx, sy, celw, celh)`: Draws a rectangle of the map starting at (`celx`;`cely`) with an extent of (`celw`;`celh`) at the pixel (`sx`;`sy`)
- 🎥 `print(x, y, text, c)`: Prints the `text` in color `c` starting at screen coordinates (`x`;`y`)
- 🎥 `line(x0, y0, x1, y1, c)`: Draws straight line in color `c` between screen coordinates (`x0`;`y0`) and (`x1`;`y1`)
- 🎥 `rect(x, y, w, h, c)`: Draws a hollow rectangle at screen coordinates (`x`;`y`) of width `w`, height `h`, and color `c`
- 🎥 `rectfill(x, y, w, h, c)`: Draws a filled rectangle at screen coordinates (`x`;`y`) of width `w`, height `h`, and color `c`
- 🎥 `circ(x, y, r, c)`: Draws a hollow circle of radius `r` with its center at screen coordinates (`x`;`y`) in color `c`
- 🎥 `circfill(x, y, r, c)`: Draws a filled circle (disk) of radius `r` with its center at screen coordinates (`x`;`y`) in color `c`

## Sound Functions

- `sfx(n, chan=-1, off=0, len=32)`: Plays sfx `n` in channel `chan` (first free if `-1`) from note `off` for `len` notes
- `mus(n)`: Start playing music at index `n`

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
- `btnp(i, p=0)`: Returns true if button `i` is pressed but wasn't pressed in previous frame for player `p`

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
