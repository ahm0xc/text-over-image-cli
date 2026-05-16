# Text Over Image (toi) CLI

A powerful, lightweight CLI tool to overlay text on images with automatic scaling, wrapping, and smart resizing.

## Features

- **Universal Input**: Supports both local file paths and remote URLs.
- **Smart Resizing**: Upscale or downscale images while maintaining aspect ratios (e.g., 16:9, 4:3).
- **Auto-Wrapping**: Automatically wraps long text into multiple lines based on image width.
- **Relative Scaling**: Font sizes are relative to image height by default, ensuring consistency across different resolutions.
- **Precise Positioning**: Use keywords (top, center, bottom) or pixel offsets (positive/negative).
- **EXIF Awareness**: Automatically handles image rotation based on EXIF metadata.
- **High Readability**: Renders white text with a black outline for visibility on any background.

## Installation

Ensure you have [Bun](https://bun.sh/) installed on your system.

```bash
# Clone the repository
git clone https://github.com/your-username/text-over-image.git
cd text-over-image

# Install dependencies
bun install
```

## Usage

```bash
bun run index.ts -f <image> -t "Your Message" -p <position> [options]
```

### Required Arguments

| Flag | Name         | Description                                                                                       |
| :--- | :----------- | :------------------------------------------------------------------------------------------------ |
| `-f` | `--file`     | Path to a local image or a URL (http/https).                                                      |
| `-t` | `--text`     | The text message to overlay.                                                                      |
| `-p` | `--position` | Vertical alignment: top, center, bottom, or a number (e.g., 50 for top-down, -100 for bottom-up). |

### Optional Arguments

| Flag | Name          | Description                                                 |
| :--- | :------------ | :---------------------------------------------------------- |
|      | `--width`     | Force a specific width in pixels.                           |
|      | `--height`    | Force a specific height in pixels.                          |
|      | `--aspect`    | Target aspect ratio (e.g., 16:9, 1:1).                      |
| `-s` | `--font-size` | Custom size in pixels (40) or percentage (5%). Default: 4%. |
| `-o` | `--output`    | Destination path. Default: output.png.                      |
| `-h` | `--help`      | Show the detailed help menu.                                |

---

## Examples

### 1. Basic Local Image

Add a centered message to a local photo:

```bash
bun run index.ts -f photo.jpg -t "Hello World" -p center
```

### 2. Remote URL with Bottom Offset

Fetch an image from the web and place text 50px from the bottom:

```bash
bun run index.ts -f https://picsum.photos/800/600 -t "Adventure Awaits" -p -50 -o travel.jpg
```

### 3. Creating a 16:9 Banner

Resize any image to 1920px wide with a 16:9 aspect ratio and large text:

```bash
bun run index.ts -f input.png -t "Header" -p center --width 1920 --aspect 16:9 -s 8% -o banner.jpg
```

### 4. Custom Font Size (Pixels)

```bash
bun run index.ts -f bg.png -t "Small Print" -p top -s 20
```

## Development

### Type Checking

```bash
bun x tsc --noEmit
```

### Build

```bash
bun run build
```

## License

MIT © [ahm0xc](https://ahm0xc.me)
