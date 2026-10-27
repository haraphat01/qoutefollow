/**
 * Turns the frames and scenes.json from record.ts into the homepage video,
 * with background music: public/demo/quotefollow-demo.{mp4,webm} plus a
 * poster image.
 * Needs ffmpeg on the PATH.
 */
import { execFileSync } from "child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from "fs";
import path from "path";

const OUT = path.join(__dirname, "out");
const PUBLIC = path.join(__dirname, "..", "..", "public", "demo");
const NAME = "quotefollow-demo";
const WIDTH = 1440;
const HEIGHT = 900;
const FADE = 0.35;
const FPS = 30;

type Scene = { clip: string; start: number; end: number };

const ffmpeg = (...args: string[]) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

function duration(file: string) {
  return Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
      .toString()
      .trim(),
  );
}

const scenes: Scene[] = JSON.parse(readFileSync(path.join(OUT, "scenes.json"), "utf8"));
const segments: string[] = [];

for (const [index, scene] of scenes.entries()) {
  const dir = path.join(OUT, scene.clip);
  const frames = readdirSync(dir)
    .filter((name) => name.endsWith(".jpg"))
    .map((name) => ({ file: path.join(dir, name), at: Number(name.slice(0, -4)) }))
    .sort((a, b) => a.at - b.at);

  // Chrome only sends a frame when the page changes. Rebuild a steady 30 fps
  // sequence by showing, at each tick, the latest frame painted so far.
  const sequence = path.join(OUT, `scene-${index}`);
  rmSync(sequence, { recursive: true, force: true });
  mkdirSync(sequence);
  let current = Math.max(frames.findLastIndex((frame) => frame.at <= scene.start), 0);
  const ticks = Math.round((scene.end - scene.start) * FPS);
  for (let tick = 0; tick < ticks; tick++) {
    const at = scene.start + tick / FPS;
    while (current + 1 < frames.length && frames[current + 1].at <= at) current++;
    symlinkSync(frames[current].file, path.join(sequence, `${String(tick).padStart(5, "0")}.jpg`));
  }

  const segment = path.join(OUT, `scene-${index}.mp4`);
  ffmpeg(
    "-framerate", String(FPS), "-i", path.join(sequence, "%05d.jpg"),
    "-vf", `scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-crf", "12", "-preset", "fast", segment,
  );
  segments.push(segment);
}

// Crossfade the scenes together.
const durations = segments.map(duration);
const filters: string[] = [];
let label = "[0:v]";
let offset = 0;
for (let i = 1; i < segments.length; i++) {
  offset += durations[i - 1] - FADE;
  const next = i === segments.length - 1 ? "[v]" : `[x${i}]`;
  filters.push(`${label}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${next}`);
  label = next;
}
const joined = path.join(OUT, "joined.mp4");
ffmpeg(
  ...segments.flatMap((segment) => ["-i", segment]),
  "-filter_complex", filters.join(";"),
  "-map", "[v]", "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-pix_fmt", "yuv420p", joined,
);

// Background music: the synthesized track by default, or DEMO_MUSIC (any
// audio file you have the rights to), trimmed to the video and faded out.
const total = duration(joined);
const music = process.env.DEMO_MUSIC ?? path.join(OUT, "music.wav");
if (!process.env.DEMO_MUSIC) {
  execFileSync("npx", ["tsx", path.join(__dirname, "make-music.ts"), music, total.toFixed(2)], { stdio: "inherit" });
}
const audio = [
  "-i", music, "-map", "0:v", "-map", "1:a", "-t", total.toFixed(3),
  "-af", `loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:d=1,afade=t=out:st=${(total - 2.5).toFixed(3)}:d=2.5`,
];

mkdirSync(PUBLIC, { recursive: true });
ffmpeg(
  "-i", joined, ...audio, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-tune", "stillimage", "-profile:v", "high",
  "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(PUBLIC, `${NAME}.mp4`),
);
ffmpeg(
  "-i", joined, ...audio, "-c:v", "libvpx-vp9", "-crf", "42", "-b:v", "0", "-row-mt", "1",
  "-deadline", "good", "-cpu-used", "2", "-c:a", "libopus", "-b:a", "80k", path.join(PUBLIC, `${NAME}.webm`),
);
ffmpeg("-ss", "1.5", "-i", joined, "-frames:v", "1", "-q:v", "3", path.join(PUBLIC, `${NAME}-poster.jpg`));

console.log(`Rendered ${total.toFixed(1)}s from ${segments.length} scenes into ${PUBLIC}`);
