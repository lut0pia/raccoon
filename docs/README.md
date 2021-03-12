# Table of contents

1. [Introduction](#introduction)
    1. [Game Loop](#game-loop)
    1. [Input](#input)
1. [Editors](#editors)
    1. [Virtual Machine](#virtual-machine)
    1. [Code Editor](#code-editor)
    1. [Console](#console)
    1. [Sprite Editor](#sprite-editor)
    1. [Sprite Selector](#sprite-selector)
    1. [Animation Viewer](#animation-viewer)
    1. [Map Editor](#map-editor)
    1. [Sound Editor](#sound-editor)
    1. [Music Editor](#music-editor)
1. [Version Control](#version-control)
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
1. [Tips and Tricks](#tips-and-tricks)

# Introduction

Raccoon is a browser-based fantasy console. It's a tool to make, share and play small games. Its capabilities are purposefully limited to allow you, the creator, not to be overwhelmed by the possibilities. Although the console is limited, the tools are carefully crafted to give you a smooth creating experience. Raccoon games are contained in bins, they're a virtual equivalent to console cartridges. Programming is done in [JavaScript](https://developer.mozilla.org/docs/Web/JavaScript/A_re-introduction_to_JavaScript).

## Game Loop

There are three special functions that you can define in your code: `init`, `update` and `draw`.

`init` will be called at the very beginning of the game. It won't be called again if you live edit code from the editor. It will be called again if you reboot the virtual machine.

`update` will be called every frame (30 frames per second) while the virtual machine is not paused. This is generally where most of the game logic goes.

`draw` will be called every frame, even if the virtual machine is paused. That means that in editor you can pause your game on a specific animation frame, and still live edit your draw code and data, and see the result on the virtual machine's screen.

Both `update` and `draw` run at 30 frames per second.

## Input

Raccoon supports four players with gamepads having 8 buttons each: four directions (left, right, up and down, indexed 0 to 3) and four general buttons (indexed 4 to 7). All those buttons can be accessed via the [input functions](#input-functions) during gameplay.

Physically, gamepads can be actual gamepads or the keyboard. Here is a map of Raccoon buttons to physical buttons depending on device:

| Device | Directions | 4 | 5 | 6 | 7
| --- | --- | --- | --- | --- | ---
| Keyboard | Arrow keys | X | C | V | B
| Xbox 360 Gamepad | Left joystick | A | B | X | Y

# Editors

Raccoon tools exist in windows that can be moved and resized. They can be opened and closed via the `Toolbox` on the left-side panel. Their layout is saved in your local storage. You can create multiple layouts in your `Layoutbox` and load them up anytime you want. A few basic layouts are already included when you first open Raccoon.

## Virtual Machine

The virtual machine is where your game actually comes to life.

The `Reboot` button will wipe everything and load the current bin again, useful to check what happens with a fresh start of your game.

The `Step` button triggers a single frame update. It is useful when paused, to see what happens frame after frame.

The `Paused` checkbox controls whether the virtual machine is currently paused. You can toggle it by pressing `Space` while focusing the virtual machine.

The `Autoapply` checkbox indicates whether or not data changes made to the current bin should be replicated directly inside the virtual machine. You may want to disable it if your game code modifies sprite or map data in realtime.

## Code Editor

The code editor is a text editor with syntax highlighting. Clicking on underlined symbols while holding `Control` will take you to their definition.

Pressing the `Apply` button or `Control+Enter` (while focusing the text input) will send the current code to the virtual machine, so you can see changes happen right away.

- Use `Control+Left-Click` on function/global names to go to their definition (or documentation).

## Console

The console displays messages, errors and callstacks in chronological order.

You can use the text input to execute code in the [Virtual Machine](#virtual-machine) by pressing `Enter`.

## Sprite Editor

The sprite editor allows you to draw small images that you will then be able to render into your game.

The canvas displays the currently selected sprites (see [Sprite Selector](#sprite-selector) for more information).

To select a drawing color, either use `Left-Click` on the palette on the right or use `1-8` to select the first 8 colors and `Shift+1-8` to select the last 8 colors. You can double click on a color to change it.

Below the palette is a list of generic sprite flags (indexed 0 to 7) as checkboxes. The values of those flags can be accessed via the [fget and fset functions](#rendering-functions) during gameplay.

- Use `Left-Click` to set the texel color to the current color.
- Use `Right-Click` to change the current color to be the color of the clicked texel (color picking).
- Use `Control+Left-Click` to fill with the current color.
- Use `Shift+Left-Click` to select texels.
- Use `Control+C` to copy selected texels.
- Use `Control+V` to paste copied texels.

## Sprite Selector

The canvas displays the spritesheet. The index of the currently selected sprite is displayed above.

- Use `Left-Click` to select the sprites you want to edit in the [Sprite Editor](#sprite-editor) or draw in the [Map Editor](#map-editor).
- Use `Control+C` to copy selected sprites.
- Use `Control+V` to paste copied sprites.

## Animation Viewer

The animation viewer allows you to preview an animation from your current spritesheet selection. The spritesheet selection is traversed horizontally left to right and then vertically top to down.

The `Width` and `Height` inputs control the width and height of the animated sprite.

The `Interval` input controls the amount of frame between each animation frame.

The `Ping-pong` checkbox controls whether the animation starts back at the beginning for each loop or goes back and forth.

## Map Editor

The map editor allows you to edit a 128x64 tilemap for your game. We'll be using the word tile in this document, any 1x1 sprite is a tile, there is no separate memory for either tiles or sprites.

The canvas displays a view of the map. The coordinates of the currently hovered tile are displayed above.

- Use `Left-Click` to set the tile under your cursor to the current tile.
- Use `Right-Click` to change the current tile to be the tile under your cursor.
- Use `Middle-Click` to drag your view of the map to edit different parts of the map.
- Use `Mouse Wheel` to change the zoom level.
- Use `Control+Left-Click` to fill with the current tile.
- Use `Shift+Left-Click` to select tiles.
- Use `Control+C` to copy selected tiles.
- Use `Control+V` to paste copied tiles.

## Sound Editor

The sound editor allows you to create sound effects and music patterns for your game.

The tempo determines how fast the sound track will play, the instrument determines the basic sound it will make, and the envelope determines an ADSR volume envelope.

The table represents time on the x-axis and note pitches on the y-axis. You can only have one note at a time on a single sound track.

- Use `Left-Click` to either place notes or remove them.
- Use `Right-Click` to change a note's volume.
- Use `Middle-Click` to change a note's effect.
- Use `Up/Down-Arrow` to transpose one semitone.
- Use `Control+Up/Down-Arrow` to transpose one octave.
- Use `Space` to play/stop the current sound.

## Music Editor

The music editor allows you to orchestrate multiple sound tracks at once and in sequence.

Each row is a list of 4 optional sound effect indices which will be played simultaneously. If a sound effect's duration is shorter than the max of the row, it will be played multiple times to account for that.

When a row is done playing, the subsequent row is played, unless 🛑 is set, in which case playback stops, or ⤴️ is set, in which case we go back up to the closest ⤵️.

- Use ▶️/⏹️ to play/stop the music.
- Use `Control+Left-Click` on cells to select sounds in [Sound Editor](#sound-editor).
- Use `Tab` and `Shift+Tab` to navigate between cells.

# Version Control

Raccoon has integrated version control support. Any bin may be linked to a remote storage, you can check a bin's link by opening the bin details popup via the 🏷️ button at the top-right of the screen.

Version control has multiple uses in raccoon:
- Working together on the same bin, synchronizing your work every so often
- Sharing your bin via a link to the remote storage

## Creating a new remote storage

If your bin has no linked remote storage yet, then the easiest way to create one is to select your host in the 🏷️ popup, write the link in the link field, and then click on `Version Control > Force Push`. This will effectively create or replace the remote storage with the current bin, ignoring all potential history.

### GitHub

GitHub links start with the owner of the repository, then a slash followed by the name of the repository, then potentially another slash followed a specific commit hash:

`owner/repo[/commit_sha]`

When first trying to write to or import from a GitHub account, you will have to authenticate via a popup.

## Importing from an existing remote storage

There are two ways to import from an existing remote storage.

### Using the import menu

The easier and recommended way is to go into the `File > Import > ...` menu for the relevant host and choose from the list.

### Using the link field

If the first method does not work for you, then you can start by creating a new bin via `File > New`, then fill the link field in the 🏷️ popup, then click on `Version Control > Force Pull`.

## Synchronizing

Once you have a bin with a linked remote storage, you can synchronize your changes and the remote changes on a regular basis. There are two methods to do this.

### Pulling

You can pull by clicking on `Version Control > Pull`. It will look at the remote changes that happened since you last synchronized, compare them to your local changes, and try to merge everything into your local bin. If any conflict arises, then a popup will appear with three options:

- `Keep local X`: Keep your changes, ignore remote changes (slightly dangerous, you don't know what you lose)
- `Take latest X`: Overwrite your changes with remote changes (slightly safer, you know what you lose)
- `Cancel`: Abort the whole operation, your bin won't have changed at all

At the end of the process, your current bin will be replaced by the merged bin.

### Pushing

You can push by clicking on `Version Control > Push`. It will try to merge your changes with the remote changes, and if no conflict arises, it will replace the remote bin and your local bin with the merged bin.

# Memory

Read-only memory (abbreviated ROM) is 20KiB long (`0x0000-0x5000`) and is contained in the bin. It is loaded in the random access memory (abbreviated RAM), which is 32KiB long (`0x0000-0x8000`) at startup. A program accesses only RAM during its execution.

N.B. Ranges in memory are expressed with their end excluded.

| Memory range | Usage | Lifetime | Breakdown
| --- | --- | --- | ---
| `0x0000-0x1800` | [Spritesheet](#spritesheet-memory) | ROM | 128x96x4bits
| `0x1800-0x3800` | [Map](#map-memory) | ROM | 128x64x8bits
| `0x3800-0x3840` | [Palette](#palette-memory) | ROM | 16x(24+1+3+4)bits
| `0x3840-0x3900` | [Sprite flags](#sprite-flags-memory) | ROM | 192x8bits
| `0x3900-0x4980` | [Sound](#sound-memory) | ROM | 64x(8+2+6+(32x(2+6+2+3+3)))bits
| `0x4980-0x4a80` | [Music](#music-memory) | ROM | 64x(4x(1+1+6))bits
| `0x5f90-0x5fa0` | [Camera state](#camera-state-memory) | RAM | 2x16bits
| `0x5fa0-0x5fc0` | [Sound state](#sound-state-memory) | RAM | 4x(8+8+6+1+3+3)bits
| `0x5fc0-0x5fd0` | [Music state](#music-state-memory) | RAM | 4x(8+8+6+1+3+3)bits
| `0x5fd0-0x5fe0` | [Sound registers](#sound-registers-memory) | RAM | 4x(1+7+2+6+2+6+2+3+3)bits
| `0x5fe0-0x6000` | [Gamepad state](#gamepad-state-memory) | RAM | 2x8x(4+4)+8x8bits
| `0x6000-0x8000` | [Screen](#screen-memory) | RAM | 128x128x4bits

## Spritesheet Memory

Spritesheet data is 128x96 pixels, arranged in 192 8x8 sprites from left to right, top to bottom.

## Map Memory

Map data is 128x64 tiles, where each tile is a byte-sized sprite index.

## Palette Memory

Palette data is 16 colors represented in 4 bytes each: 3 bytes for the red, green and blue channels, and a fourth byte with extra data. The fourth byte's 4 lowest bits are used as an indirection index (to render another color instead of this one), and its highest bit is used for transparency.

- Color: `RRRRRRRR GGGGGGGG BBBBBBBBB T___IIII`

## Sprite Flags Memory

Sprite flags are 192 8bits bitfields.

## Sound Memory

Sound data is 64 tracks.

- Track: `PPPPPPPPP EEIIIIII 32xNote`
    - P: Period
    - E: Envelope
    - I: Instrument
- Note: `__TTTTTT __EEEVVV`
    - T: Tone
    - E: Effect
    - V: Volume

## Music Memory

Music data is 64 32bit nodes that connect tracks together via their indices.

- Music: `FUTTTTTT FUTTTTTT FUTTTTTTT _UTTTTTT`
    - F: Flags
    - U: Used
    - T: Track

## Camera State Memory

Camera state data is two 16bit integers used as offset during rendering.

## Sound State Memory

## Sound Registers Memory

Sound registers are 4 32bit registers that are used by the virtual machine to communicate to the sound chip.

- Register: `SPPPPPPP EEIIIIII OOTTTTTT __EEEVVV`
    - S: Switch
    - P: Period
    - E: Envelope
    - I: Instrument
    - O: Offset
    - T: Tone
    - E: Effect
    - V: Volume

## Gamepad State Memory

Gamepad state data is 8 8bit controllers three times, the first 8 bytes are for the current frame's state while the next 8 bytes are the previous frame's state, and the last 8 bytes are the gamepad's current layout (for display purposes). The 4 least significant bits of each byte correspond to the left, right, up and down directions respectively, while the 4 most significant bits correspond to 4 action buttons.

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
- 🎥 `print(x, y, text, c)`: Prints the `text` in color `c` starting at screen coordinates (`x`;`y`), returns the width of the text in pixels
- 🎥 `line(x0, y0, x1, y1, c)`: Draws straight line in color `c` between screen coordinates (`x0`;`y0`) and (`x1`;`y1`)
- 🎥 `rect(x, y, w, h, c)`: Draws a hollow rectangle at screen coordinates (`x`;`y`) of width `w`, height `h`, and color `c`
- 🎥 `rectfill(x, y, w, h, c)`: Draws a filled rectangle at screen coordinates (`x`;`y`) of width `w`, height `h`, and color `c`
- 🎥 `circ(x, y, r, c)`: Draws a hollow circle of radius `r` with its center at screen coordinates (`x`;`y`) in color `c`
- 🎥 `circfill(x, y, r, c)`: Draws a filled circle (disk) of radius `r` with its center at screen coordinates (`x`;`y`) in color `c`

## Sound Functions

- `sfx(n, chan=-1, off=0, len=32, loops=1)`: Plays sfx `n` in channel `chan` (first free if `-1`) from note `off` for `len` notes `loops` times
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
- `rnd(x?)`: Returns a random integer between 0 and `x` excluded if `x` is specified, otherwise a random float between 0.0 and 1.0
- `sin(x)`: Returns the sine of `x`
- `cos(x)`: Returns the cosine of `x`
- `atan2(y, x)`: Returns the counterclockwise angle (in radians) between the positive x-axis and the ray that starts from the origin and passes through (`x`;`y`)

## Input Functions

- `btn(i, p=0)`: Returns true if button `i` is pressed for player `p`
- `btnp(i, p=0)`: Returns true if button `i` is pressed but wasn't pressed in previous frame for player `p`
- `btns(i, p=0)`: Returns a string to represent the button `i` for player `p`

## Memory Functions

- `memcpy(dst, src, len)`: Copies `len` bytes in RAM from `src` to `dst`
- `memset(dst, val, len)`: Sets `len` bytes in RAM to value `val` at `dst`
- `read(addr)`: Returns the value of the 8-bit unsigned integer at address `addr` in RAM
- `read16(addr)`: Returns the value of the 16-bit signed integer at address `addr` in RAM
- `read32(addr)`: Returns the value of the 32-bit signed integer at address `addr` in RAM
- `write(addr, val)`: Writes value `val` to the 8-bit unsigned integer at address `addr` in RAM
- `write16(addr, val)`: Writes value `val` to the 16-bit signed integer at address `addr` in RAM
- `write32(addr, val)`: Writes value `val` to the 32-bit signed integer at address `addr` in RAM

## Debug Functions
- `debug(msg)`: Logs `msg` to the [Console](#console)

## Function Shortcuts

Some common functions have one-letter shortcuts, useful for keeping code small.

- `c` = `cls`
- `p` = `pset`
- `l` = `line`
- `r` = `rnd`
- `b` = `btn`

# Tips and Tricks

# Code

- Declare game constants using `const` somewhere in the code, grouped however may make sense for you. Notably, it's very useful to use constants for sprite numbers, sprite flags to check, button meanings, etc. When comes the moment something changes, you won't have to reread your code to change button mappings or sprites. Those constants will hot reload correctly.
- Declare small sound functions consisting of a single `sfx` call and use those throughout the code. It will be easier to manage if a sound effect needs to change index/offset/length.
- If you declare game state variables in the global scope, they will be overwritten when hot reloading code. Prefer barbaric assignments to global variables (without declarations) for variables for which you want the values to be kept when hot reloading.
- It's not mandatory to put your draw code in the draw function, you can work with `update` only if you want, but it's encouraged because it usually forces you to write better code, and allows you to tweak your draw functions while the virtual machine is paused.
