#!/usr/bin/env node

import { parseArgs } from "util";
import fs from "fs/promises";
import sharp from "sharp";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import satori from "satori";

const TOI_DIR = path.join(os.homedir(), ".toi");
const HISTORY_FILE = path.join(TOI_DIR, "history.json");

async function getFont() {
  const fontPath = path.join(TOI_DIR, "Roboto-Bold.ttf");
  try {
    return await fs.readFile(fontPath);
  } catch (e) {
    console.log("Downloading font (Roboto-Bold)...");
    const res = await fetch(
      "https://github.com/vercel/satori/raw/main/test/assets/Roboto-Bold.ttf",
    );
    if (!res.ok) throw new Error("Failed to download font");
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(TOI_DIR, { recursive: true });
    await fs.writeFile(fontPath, buffer);
    return buffer;
  }
}

async function saveToHistory(entry: any) {
  try {
    await fs.mkdir(TOI_DIR, { recursive: true });
    let history = [];
    try {
      const data = await fs.readFile(HISTORY_FILE, "utf-8");
      history = JSON.parse(data);
    } catch (e) {}
    history.push({ ...entry, timestamp: new Date().toISOString() });
    if (history.length > 50) history = history.slice(-50);
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {}
}

async function showHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    const history = JSON.parse(data);
    if (history.length === 0) {
      console.log("No history found.");
      return;
    }
    console.log("\nRecent History:");
    history.reverse().forEach((h: any, i: number) => {
      console.log(`${i + 1}. [${h.timestamp}]`);
      console.log(`   File:   ${h.file}`);
      console.log(`   Text:   "${h.text}"`);
      console.log(`   Output: ${h.output}\n`);
    });
  } catch (e) {
    console.log("No history found.");
  }
}

interface PresetStyle {
  position?: string;
  fontSize?: string;
  textBackground?: string;
  stroke?: boolean;
}

const PRESETS: Record<string, PresetStyle> = {
  snapchat: {
    position: "center",
    fontSize: "2%",
    textBackground: "rgba(0, 0, 0, 0.5)",
    stroke: false,
  },
};

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      file: { type: "string", short: "f" },
      text: { type: "string", short: "t" },
      position: { type: "string", short: "p" },
      width: { type: "string" },
      height: { type: "string" },
      aspect: { type: "string" },
      "font-size": { type: "string", short: "s" },
      preset: { type: "string", short: "r" },
      "text-background": { type: "string", short: "b" },
      output: { type: "string", short: "o" },
      history: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.history) {
    await showHistory();
    process.exit(0);
  }

  if (values.help || !values.file || !values.text) {
    console.log(`
Text Over Image (toi) - Add text overlays to images with auto-scaling and wrapping.

USAGE:
  toi -f <image> -t "Your Text" [options]

REQUIRED:
  -f, --file <path|url>   Path to a local image file or a remote image URL.
  -t, --text <string>     The text message to overlay on the image.

OPTIONS:
  -p, --position <val>    Vertical alignment of the text. Default: center.
                          Keywords: 'top', 'center', 'bottom'
                          Offsets:  Positive (e.g. "50") for top-down offset.
                                    Negative (e.g. "-100") for bottom-up offset.
  --width <px>            Force target width. Upscales or downscales as needed.
  --height <px>           Force target height.
  --aspect <ratio>        Maintain aspect ratio (e.g., "16:9", "4:3", or "1.5").
                          Works with width/height to fill in missing dimensions.
  -s, --font-size <size>  Custom font size. Accepts pixels ("40") or percentage 
                          of image height ("5%"). Default is 4%.
  -r, --preset <name>     Apply a specific style preset (e.g., "snapchat").
  -b, --text-background <val> Custom background color/opacity for text bar.
                          Example: "rgba(0,0,0,0.8)" or "black".
  -o, --output <path>     Destination file path. Default: a temporary file.
  --history               Show recent history of generated images.
  -h, --help              Show this detailed help menu.

EXAMPLES:
  # Basic usage with local file (defaults to center)
  toi -f photo.jpg -t "Hello World"

  # Snapchat preset with custom background opacity
  toi -f photo.jpg -t "Snap" --preset snapchat -b "rgba(0,0,0,0.8)"
    `);
    process.exit(values.help ? 0 : 1);
  }

  try {
    const outputPath =
      values.output || path.join(os.tmpdir(), `toi-${randomUUID()}.png`);

    let inputBuffer: Buffer;
    if (values.file!.startsWith("http")) {
      console.log(`Fetching: ${values.file}`);
      const res = await fetch(values.file!);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      inputBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      inputBuffer = await fs.readFile(values.file!);
    }

    let image = sharp(inputBuffer).rotate();
    let metadata = await image.metadata();

    let targetWidth = values.width ? parseInt(values.width) : undefined;
    let targetHeight = values.height ? parseInt(values.height) : undefined;

    if (values.aspect) {
      let ratio: number;
      if (values.aspect.includes(":")) {
        const parts = values.aspect.split(":").map(Number);
        const [w, h] = parts;
        if (
          parts.length !== 2 ||
          w === undefined ||
          h === undefined ||
          isNaN(w) ||
          isNaN(h) ||
          h === 0
        ) {
          throw new Error("Invalid aspect ratio format (W:H).");
        }
        ratio = w / h;
      } else {
        ratio = parseFloat(values.aspect);
        if (isNaN(ratio) || ratio <= 0)
          throw new Error("Invalid aspect ratio.");
      }

      if (targetWidth && !targetHeight) {
        targetHeight = Math.round(targetWidth / ratio);
      } else if (targetHeight && !targetWidth) {
        targetWidth = Math.round(targetHeight * ratio);
      } else if (!targetWidth && !targetHeight) {
        targetWidth = metadata.width || 800;
        targetHeight = Math.round(targetWidth / ratio);
      }
    }

    if (targetWidth || targetHeight) {
      console.log(
        `Resizing to: ${targetWidth || "auto"}x${targetHeight || "auto"}`,
      );
      image = image.resize(targetWidth, targetHeight, {
        fit: "cover",
        withoutEnlargement: false,
      });
      const { data } = await image.toBuffer({ resolveWithObject: true });
      image = sharp(data);
      metadata = await image.metadata();
    }

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Apply Preset and User Overrides
    const preset = values.preset ? PRESETS[values.preset] : undefined;
    if (values.preset && !preset) {
      throw new Error(`Unknown preset: ${values.preset}`);
    }

    const positionValue = values.position || preset?.position || "center";
    const fontSizeValue = values["font-size"] || preset?.fontSize;
    const textBackground = values["text-background"] || preset?.textBackground;
    const useStroke = preset?.stroke !== undefined ? preset.stroke : true;

    const margin = Math.round(height * 0.1);
    let fontSize: number;
    const defaultFontSize = Math.round(height * 0.04);

    if (fontSizeValue) {
      if (fontSizeValue.endsWith("%")) {
        const percent = parseFloat(fontSizeValue.replace("%", ""));
        if (isNaN(percent)) throw new Error("Invalid font-size percentage.");
        fontSize = Math.round(height * (percent / 100));
      } else {
        fontSize = parseInt(fontSizeValue);
        if (isNaN(fontSize)) throw new Error("Invalid font-size.");
      }
    } else {
      fontSize = defaultFontSize;
    }
    fontSize = Math.max(1, fontSize);

    const fontData = await getFont();

    let justifyContent = "center";
    let paddingTop = "0px";
    let paddingBottom = "0px";

    if (positionValue === "top") {
      justifyContent = "flex-start";
      paddingTop = `${margin}px`;
    } else if (positionValue === "bottom") {
      justifyContent = "flex-end";
      paddingBottom = `${margin}px`;
    } else if (positionValue === "center") {
      justifyContent = "center";
    } else {
      const offset = parseInt(positionValue);
      if (!isNaN(offset)) {
        const yPos = offset >= 0 ? offset : height + offset;
        justifyContent = "flex-start";
        paddingTop = `${yPos}px`;
      }
    }

    const svgText = await satori(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            height: `${height}px`,
            width: `${width}px`,
            justifyContent,
            alignItems: "center",
            paddingTop,
            paddingBottom,
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  padding: `${fontSize * 0.2}px ${fontSize * 0.5}px`,
                  backgroundColor: textBackground || "transparent",
                  color: "white",
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  textAlign: "center",
                  width: textBackground ? "100%" : "auto",
                  justifyContent: "center",
                  ...(useStroke
                    ? {
                        WebkitTextStroke: `${Math.round(fontSize / 12)}px black`,
                      }
                    : {}),
                },
                children: values.text,
              },
            },
          ],
        },
      },
      {
        width,
        height,
        fonts: [
          {
            name: "Roboto",
            data: fontData,
            weight: 700,
            style: "normal",
          },
        ],
        loadAdditionalAsset: async (code, segment) => {
          if (code === "emoji") {
            const codePoint = [...segment]
              .map((s) => s.codePointAt(0)!.toString(16))
              .join("-");
            const emojiUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoint}.svg`;
            try {
              const res = await fetch(emojiUrl);
              if (!res.ok) return [];
              const buffer = Buffer.from(await res.arrayBuffer());
              return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
            } catch (e) {
              return [];
            }
          }
          return [];
        },
      },
    );

    await image
      .composite([{ input: Buffer.from(svgText) }])
      .flatten({ background: { r: 0, g: 0, b: 0 } })
      .toFile(outputPath);

    console.log(`Saved: ${outputPath}`);
    await saveToHistory({
      file: values.file,
      text: values.text,
      output: outputPath,
    });
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
