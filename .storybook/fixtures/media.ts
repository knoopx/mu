import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MEDIA = ".storybook/fixtures/media";

export type Photo = {
  path: string;
  name: string;
  width: number;
  height: number;
  bytes: number;
  shows: string;
};

export const PHOTOS = {
  meadow: {
    path: "~/Pictures/2026/sunlit-meadow.jpg",
    name: "sunlit-meadow.jpg",
    width: 640,
    height: 360,
    bytes: 27_322,
    shows:
      "sun through dry grass at a low angle, a fence post hard right, a flare blob low centre",
  },
  swimmer: {
    path: "~/Pictures/2026/underwater-swimmer.jpg",
    name: "underwater-swimmer.jpg",
    width: 640,
    height: 360,
    bytes: 18_784,
    shows:
      "deep blue water, a swimmer's head and shoulders as a dark shape, a fan of bubbles above",
  },
  river: {
    path: "~/Pictures/2026/chicago-river.jpg",
    name: "chicago-river.jpg",
    width: 640,
    height: 360,
    bytes: 36_688,
    shows:
      "a river straight down between brick buildings, a boat bottom right, a footbridge across, haze at the vanishing point",
  },
  stars: {
    path: "~/Pictures/2026/star-trails.jpg",
    name: "star-trails.jpg",
    width: 640,
    height: 360,
    bytes: 18_335,
    shows:
      "star trails in full circles round a point just above centre, a black ridge across the bottom third",
  },
  bay: {
    path: "~/Pictures/2026/sf-bay-portrait.jpg",
    name: "sf-bay-portrait.jpg",
    width: 480,
    height: 640,
    bytes: 40_638,
    shows:
      "blue water in the lower half, a skyline and a bridge on the far shore, empty sky above",
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

export function photoOf(key: PhotoKey): Photo {
  return PHOTOS[key];
}

const fileOf = (key: PhotoKey): string =>
  resolve(process.cwd(), `${MEDIA}/${PHOTOS[key].name}`);

export function photoFile(key: PhotoKey): {
  src: string;
  mimeType: string;
  bytes: number;
} {
  const bytes = readFileSync(fileOf(key));
  return {
    src: `data:image/jpeg;base64,${bytes.toString("base64")}`,
    mimeType: "image/jpeg",
    bytes: bytes.length,
  };
}

export function photoBuffer(key: PhotoKey): Buffer {
  return readFileSync(fileOf(key));
}

export function photoLabel(key: PhotoKey): string {
  const photo = PHOTOS[key];
  return `${photo.name} · ${photo.width}×${photo.height} · ${kb(photo.bytes)}`;
}

export function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export function totalBytes(keys: PhotoKey[]): number {
  return keys.reduce((sum, key) => sum + PHOTOS[key].bytes, 0);
}
