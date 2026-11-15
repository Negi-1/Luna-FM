# How to Add Songs & Curate Playlists in LUNA.FM

LUNA.FM features a **Zero-Duplication Central Song Pool & Playlist Reference Architecture**.

Every song exists in the single central pool (`public/songs/songs-list/`), and playlists hold **references** to those songs without copying or duplicating audio files.

---

## 1. Adding Songs to the Pool (No Playlist Required)

To add songs to the pool without creating a playlist:

1. Drop your audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`) directly into:
   ```
   public/songs/songs-list/
   ```
2. **File Naming Tips (Automatic Metadata Extraction)**:
   - `Artist - Song Title.mp3` → automatically extracts **Artist** and **Title**!
     - *Example:* `Mr.Kitty - After Dark.wav`
   - `01 - Song Title.mp3` → strips track numbers and extracts `Song Title`!
3. **Optional Individual Track Artwork**:
   - Save an image with the same base name next to the audio file:
     - `Mr.Kitty - After Dark.wav`
     - `Mr.Kitty - After Dark.jpg` (or `.png`, `.webp`, `.svg`)
   - If no image is provided, LUNA.FM automatically renders a celestial ☾ fallback with dynamic ambient glow.
4. Run `npm run catalog` (or `npm run build`).
5. **Done!** The song now exists in the **Frequency Archive (Collection)**, searchable, playable, shuffleable, and ready to be curated into playlists.

---

## 2. Unlocking Admin Playlist Curation via Search Passcode

Since LUNA.FM is a read-only site for regular visitors, curation rights can be unlocked by the curator:

1. Press `/` or click the **Search** icon in the top bar.
2. In the search input, type the secret passcode:
   ```
   luna:admin
   ```
   *(or simply `admin`)*.
3. You will see a glowing toast:
   `☾⋆⁺₊ admin rights unlocked: playlist curation enabled`
4. The site automatically directs you to the **Collection** view with **Admin Curation Mode** active!

---

## 3. Curating Playlists from the Collection Section

With Admin Rights active in the Collection view:

1. **Select Songs**:
   - Checkboxes appear on the left side of every track row in the Frequency Archive table.
   - Check the songs you want in your new playlist.
2. **Launch Playlist Studio**:
   - A floating pill appears at the bottom: `✦ X tracks selected · [Curate Playlist →]`.
   - Click **Curate Playlist →** to open the Curation Studio modal.
3. **Configure Playlist Metadata**:
   - **Title**: (e.g. `Night Frequencies`)
   - **Subtitle / Japanese**: (e.g. `夜の周波数`)
   - **Description**: (e.g. `Songs for empty highways and neon signs.`)
   - **Moods**: (e.g. `chill, driving, 3am`)
   - **Order #**: Sorting order (e.g. `10`)
4. **Arrange Track Order**:
   - Use the **▲** and **▼** buttons to reorder songs into your desired sequence.
   - Click **✕** to remove any track.
5. **Zero File Duplication Save**:
   - **Direct Save to `public/songs`**: If you are using Chrome or Edge, click **💾 Direct Save to public/songs** and choose your `public/songs` directory. The browser will create `public/songs/<playlist-slug>/info.json` directly!
   - **Download `info.json`**: Downloads the generated JSON file ready to drop into `public/songs/<playlist-slug>/info.json`.
   - **Copy `info.json`**: Copies the ready-to-paste JSON to your clipboard.
6. **Playlist Cover Artwork**:
   - Simply drop an image into your playlist folder (`public/songs/<playlist-slug>/`).
   - Supported names: `cover.jpg`, `cover.png`, `image.png`, `image.jpg`, `artwork.png`, `artwork.jpg`, or any image file in that directory.
   - You can also optionally specify `"cover": "image.png"` in your `info.json`.
7. Run `npm run catalog` and your new playlist is live with its cover!

---

## 4. Browsing Playlists: "04 PLAYLISTS" Menu Section

Visitors can browse all curated playlists anytime:
- Open the Menu Drawer via the top-right button.
- Click **04 PLAYLISTS** in the navigation menu.
- Displays an atmospheric responsive grid of all curated playlists with cover art, hover play buttons, track counts, total duration, and mood pills.

---

## Folder Structure Overview

```
public/songs/
├── songs-list/                         (CENTRAL SONG POOL: all audio files live here)
│   ├── 01-after-dark.wav
│   ├── 01-after-dark.jpg
│   ├── 02-resonance.wav
│   └── 03-midnight-city.wav
│
├── night-drive/                        (PLAYLIST: metadata & cover only, zero duplicate audio)
│   ├── info.json                       (references songs in songs-list/)
│   └── cover.jpg                       (album-level artwork)
│
├── soft-hours/
│   ├── info.json
│   └── cover.jpg
│
└── website-wala-playlist/
    ├── info.json
    └── cover.jpg
```
