# Our Archive — Live Record & Post System

## Current State
The upload experience is a modal (`UploadModal`) with three tabs (photo / video / voice). Each tab shows a file picker. The user selects a file from disk, fills in title, caption, date, and submits.

## Requested Changes (Diff)

### Add
- `CreateMenu`: When the + button is tapped, show a full-screen or large modal with four glassmorphism icon tiles instead of going straight to the upload form:
  - 📷 **Snap** — opens live camera for a single photo capture
  - 🎥 **Film** — opens live camera for video recording (max ~2 min)
  - 🎙️ **Speak** — opens microphone for voice note recording
  - 📁 **Upload** — opens file picker (auto-detects type: image/video/audio)
- `CameraViewfinder` component: full-screen live camera feed with 90s camcorder overlay:
  - Blinking red `● REC` indicator (for video mode)
  - White corner bracket `VIEW` frame around the feed
  - Shutter / Start-Record / Stop-Record button at the bottom
- `VoiceRecorder` component: full-screen view with a live animated waveform (bars animate to mic input level in real time) while the user speaks; stop button to finish recording
- `PreviewScreen` component: shown after capture/recording. Displays the captured media (photo preview, video thumbnail/player, waveform for audio). Has title field, paragraph/caption field, auto-filled date (today). Submit = "add to archive."

### Modify
- The floating `+` button now opens `CreateMenu` instead of `UploadModal`.
- `UploadModal` is replaced by the new multi-step flow (CreateMenu → Capture/Record/Upload → PreviewScreen).
- For **Upload** (📁) mode: auto-detect file type from MIME type (image/* → photo, video/* → video, audio/* → voice). Skip the capture step; go straight to PreviewScreen with a thumbnail/waveform preview.

### Remove
- The three-tab (photo/video/voice) `UploadModal` form.
- The `DropZone` and `MediaFilePicker` sub-components (replaced by the new flow).

## Implementation Plan
1. Build `CreateMenu` modal: 4 glassmorphism icon cards, full-screen or large overlay, matches parchment/gold aesthetic. Clicking each tile transitions to the next step.
2. Build `CameraViewfinder`: uses `getUserMedia` for live video. Photo mode shows shutter button. Video mode shows blinking REC badge + timer, record/stop button. On capture/stop, blob is passed to PreviewScreen.
3. Build `VoiceRecorder`: uses `getUserMedia` audio. Animate bars using `AnalyserNode` + `requestAnimationFrame`. Stop button ends recording. Blob passed to PreviewScreen.
4. Build `PreviewScreen`: photo shows `<img>`, video shows `<video>`, audio shows animated waveform SVG. Two fields: title (required), paragraph/caption. Date auto-filled to today (editable). "add to archive" button triggers existing upload + `createMoment` logic.
5. For `Upload` (📁) mode: single `<input type="file" accept="image/*,video/*,audio/*">`. Auto-detect type, show appropriate preview in PreviewScreen.
6. Wire everything together: `+` → CreateMenu → [Snap|Film|Speak|Upload] → PreviewScreen → save.
7. Preserve all existing gallery, search, memory-detail, and auth logic untouched.
