---
title: "openbsl: reading physiology lab data without the lab's software"
date: "2026-09-29"
description: "Parsing Biopac Student Lab recordings, rebuilding the measurement workflow in a browser, and why automatic ECG delineation lost to a mouse"
slug: "openbsl"
time: 8
active: 1
---

My physiology lab records ECG, pulse and heart sounds with Biopac hardware and its Biopac Student Lab (BSL) software. At the end of the session you get your recording as a file with no extension, which only BSL can open, and BSL is licensed to the lab computers. The lab report, meanwhile, is a stack of tables you fill in by hand: heart rate across three cardiac cycles per condition, P-wave duration, QRS amplitude, R-wave to first heart sound. The analysis isn't hard. It just can only be done on campus.

So I built [openbsl](https://github.com/k8rthik/openbsl): a small Python package that reads the files, and a static browser page that reproduces the part of BSL a lab report needs. There's a [live demo](/openbsl) running on synthetic data.

# The file format

`file` says the recordings are just `data`, but the first few hundred bytes give it away: a binary header of big-endian doubles, then per-channel headers with names like `ECG` and `Heart Rate`. It's an AcqKnowledge file, the same container Biopac uses in its research software, and [bioread](https://github.com/uwmadison-chm/bioread) already parses it. That part of the problem was already solved:

```python
datafile = bioread.read_file("Keerthik-L05")
[(ch.name, ch.units, ch.samples_per_second) for ch in datafile.channels]
# [('ECG', 'mV', 1000.0), ('Heart Rate', 'BPM', 1000.0)]
```

The interesting structure is in the event markers, which are the only record of what the subject was doing:

- **`apnd` (append) markers** start each recording segment. BSL records a lesson as several short recordings (Supine, Seated, Deep breathing, After exercise) and splices them end to end into one file. The pauses between them aren't stored, so segment boundaries are discontinuities.
- **`defl` markers** are the keypresses the recorder makes during a segment, like "start of inhale" and "start of exhale".
- **`New Rate` markers**, one per beat on the calculated heart-rate channel. There are hundreds of them and they duplicate the channel, so they get dropped.

Two details matter downstream. First, the splice: the first R-R interval of every segment spans a pause that isn't in the file. Averaged naively, it produces a phantom 115 BPM beat at the start of a resting segment. The per-segment summaries drop the first interval of each segment for that reason. Second, BSL's heart-rate channel (CH40) is a step function that updates at the *end* of each R-R interval. The value you read at any point is the rate of the previous beat, which is why the lab manual tells you to "go past the first two cardiac cycles".

Segment labels also carry the hardware serial: `Supine, MP36E…`. My first cleaner split on the comma, which works for Lesson 5 and silently breaks Lesson 7, whose segments are called things like `Seated, left hand in water`. It now strips only a trailing `, MP…` suffix, and there's a test with a comma-containing label.

# Trying to automate it first

The lesson 5 report wants P, QRS and T durations and amplitudes, plus PR, QT, ST and TP intervals, for three cardiac cycles. The obvious move is automatic delineation, so I ran [NeuroKit2](https://github.com/neuropsychology/NeuroKit)'s wavelet delineators on three real recordings from our lab group and checked beat-to-beat consistency within the resting segment (median ± SD, ms):

| lead | method | P duration | QRS | T | QT |
| --- | --- | --- | --- | --- | --- |
| clean | DWT | 68 ± 31 | 103 ± 2 | 133 ± 8 | 302 ± 3 |
| clean | CWT | 107 ± 9 | 95 ± 5 | 163 ± 7 | 311 ± 5 |
| noisy | DWT | 72 ± 22 | 116 ± 20 | 42 ± 18 | 273 ± 47 |
| noisy | CWT | 81 ± 19 | 110 ± 9 | 108 ± 34 | 345 ± 43 |

On the clean lead the QRS is solid, but the two methods disagree by 40 ms on P duration, and DWT's P-wave jitter is half the P wave. On the noisy lead it falls apart: a 42 ms T wave isn't a T wave. After exercise, with baseline wander and motion artifact, DWT failed to bound the T wave on 51 of 68 beats. Overlaying the raw beats made the reason obvious: the noisy lead's P wave sits at about the amplitude of the noise, and each person's T-wave morphology is different.

The lab's questions are things like "did the QT interval shorten after exercise?" The effect is tens of milliseconds, the same size as the delineator's error bars. An automated number I'd have to check by eye anyway is worse than just measuring by eye, so the tool puts a human on the boundaries, as BSL does.

The one thing that is automated is R-peak detection in the CSV export, where it's reliable: a second-order 5–30 Hz Butterworth band-pass (zero-phase, via `filtfilt`) to isolate QRS energy, polarity chosen by whichever side has the larger 99th percentile (so inverted leads work), then `find_peaks` with a threshold at 35% of that percentile and a 300 ms refractory period. On the recordings I checked, its beat-to-beat rate lines up with BSL's own heart-rate channel beat for beat.

# The viewer

The viewer is a single static page: an HTML file, two scripts and a generated `data.js`. `openbsl view FILE...` writes that folder and opens it. There's no server and nothing leaves your machine, which matters for health data. It loads with classic `<script>` tags rather than ES modules because browsers block module imports over `file://`.

Interaction copies BSL, since the lab manual is written against BSL: drag to make an I-beam selection, and the measurement boxes show Delta T, BPM (60 / Delta T), and per-channel P-P (max − min over the selection) and Value. Value is read at the end you dragged *to*, which is how BSL does it and what the manual's heart-rate procedure depends on. You pick a condition, component and cycle number, and press Enter. The condition is guessed from the nearest marker and the cycle number auto-increments.

Rendering is one canvas per page with a pane per channel. When zoomed out there are many samples per pixel, so each pixel column draws a vertical line from its min to its max. That keeps two minutes at 1 kHz (120,000 points per channel) smooth to pan, and it never hides a QRS spike, as naive downsampling can. The heart-rate channel is stored as change points (index and value) instead of 120,000 samples: about 200 numbers per recording.

Each lesson is one config object in `lessons.js`:

```js
{
  conditions: ["At rest", "Inhalation", "Exhalation", "After exercise"],
  match: [[/exhal/i, "Exhalation"], [/inhal/i, "Inhalation"], ...],
  components: [{ name: "1st heart sound", ch: /steth/i, tip: "Select across the whole 1st sound" }, ...],
  report(api) { /* annotations -> report tables */ },
}
```

`match` maps marker text to conditions and is checked in order. In Lesson 7 "Seated, right hand above head" also contains "seated", so the specific patterns go first. `ch` says which channel's P-P a component uses (QRS amplitude from the ECG, pulse amplitude from the plethysmograph). `report` turns annotations into the lab's tables: means over the labelled cycles, pulse-wave speed from a distance you type in, and an increased/decreased/no-change column (±5%) for the heart-sounds lesson. Lessons 5, 7 and 17 are configured. Anything else falls back to one condition per segment.

# Testing without publishing anyone's ECG

I can't put real recordings in a public repo or demo, so `openbsl.synthetic` generates them. Each beat is a sum of five Gaussians (P, Q, R, S, T) in the style of McSharry et al.'s dynamical ECG model. The T wave's position and width scale with √RR, so QT shortens as heart rate rises. The rhythm has respiratory sinus arrhythmia during deep breathing (HR rises on inspiration, with inhale/exhale markers placed to match) and an exponential recovery after exercise. There's also noise and baseline wander. Lesson 7 gets a pulse wave with a dicrotic bump, and Lesson 17 gets windowed 45 and 60 Hz bursts for S1 and S2.

Because the true beat times are known, the detector is tested against ground truth instead of against itself: every beat found within 5 ms at 48, 75 and 140 BPM, on an inverted lead too, and the demo's 64 and 72 BPM segments recovered to within 0.5 BPM. The report tables are tested in Node against hand-computed values. For example, 40 + 60 cm over a 250 ms R-to-pulse delay has to come out as 400.0 cm/s, and a 5% rise exactly on the boundary has to read "no change".

# What's missing

- **Annotations live in localStorage.** They survive reloads but not a cleared browser, so export the CSV when you're done.
- **No undo** beyond deleting a row.
- **Only three lessons have report tables.** BSL has dozens of lessons (EMG, EEG, spirometry). Adding one is a config object and a test, and the reader already handles their files.

Code is [on GitHub](https://github.com/k8rthik/openbsl), MIT licensed.
