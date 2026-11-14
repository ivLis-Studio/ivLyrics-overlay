<img width="2208" height="512" alt="ivLyrics English banner" src="https://github.com/ivLis-Studio/ivLyrics/blob/main/preview_readme_en.png?raw=true" /><br>
PLATFORM : <a href="https://github.com/ivLis-Studio/ivLyrics">PC</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-Android">Android</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-IOS">iOS</a><br>
MODULE : <a href="https://github.com/ivLis-Studio/ivLyrics-overlay">Overlay</a> | <a href="https://github.com/ivLis-Studio/ivLyrics-helper">Helper</a>

[한국어](README.md) | [English](README_EN.md)

# ivLyrics Overlay

Keep lyrics visible outside Spotify with a separate window that stays above other windows. ivLyrics Overlay receives lyrics and playback information from [ivLyrics for PC](https://github.com/ivLis-Studio/ivLyrics) running on the same computer.

Install it when you want a separate lyrics window. It is optional for using ivLyrics inside Spotify, and you do not need [ivLyrics Helper](https://github.com/ivLis-Studio/ivLyrics-helper) to use it. Helper is a separate app for local video playback and sharing lyrics with other programs.

## What you can do

- Choose which original lyrics, phonetic lyrics, translations, track information, and album art to display.
- Show the current line with previous and next lines, and use karaoke effects when syllable timing is available.
- Adjust presets, fonts, colors, background opacity, and alignment.
- Lock the window to let clicks pass through, or unlock it to move it.

Lyrics, translations, and phonetic text must be available in ivLyrics for PC. Overlay does not fetch lyrics or generate translations itself.

## Download and requirements

[Download the latest version](https://github.com/ivLis-Studio/ivLyrics-overlay/releases/latest) · [Release history](https://github.com/ivLis-Studio/ivLyrics-overlay/releases)

Under **Assets** on the release page, download one installer for your computer.

| Computer | Installer | How to install |
| --- | --- | --- |
| Windows x64 | `lyrics-plus-overlay_…_x64-setup.exe` or `…_x64_en-US.msi` | Run the installer and follow its instructions. |
| macOS Apple Silicon | `lyrics-plus-overlay_…_aarch64.dmg` | Open the DMG, copy the app to Applications, and launch it. |

The latest public release does not include installers for Intel Macs, Linux, or mobile devices. The legacy names `lyrics-plus-overlay` and `Lyrics Plus Overlay` in files or app titles refer to this app. `latest.json`, `.sig`, and `.app.tar.gz` files are for updates; use an installer above for a normal installation.

Install Spotify desktop and ivLyrics for PC on the same computer first. See the [PC guide](https://github.com/ivLis-Studio/ivLyrics/blob/main/README_EN.md) for ivLyrics installation. You do not need Node.js or Rust to use the released Overlay installers.

## First launch and connection

1. Launch Overlay. On first launch, click **시작하기 (Get Started)**, choose your language, display elements, and style, then click **Start Using**. The instructions below use the English interface labels.
2. Open ivLyrics in Spotify and go to **Settings → General → Desktop Overlay**.
3. Turn on **Enable Desktop Overlay**. Keep **Connection Port** at its default, `15000`.
4. Play a song and check that ivLyrics has loaded its lyrics. The PC setting should show **✓ Connected**. If the song has synced lyrics, the current line appears in the separate window.

Both apps must run on the same computer. Connecting to Spotify on a phone or another computer is not supported by this setup.

### If you need to change the connection port

Usually, keep the default. If another program is using `15000`, update both ends:

1. In Overlay, go to **Settings → Advanced → Server Port** and enter an unused port between `1024` and `65535`.
2. Click **Apply** and confirm the restart prompt.
3. In ivLyrics for PC, set **Settings → General → Desktop Overlay → Connection Port** to the same number and press Enter.

Helper uses a separate default port, `15123`. Do not assign that port to Overlay while Helper is running.

## Everyday use

Open **Settings** from the app icon in the Windows notification area or macOS menu bar. This icon menu is called the tray below.

- **Move the window:** Select **Lock/Unlock** in the tray to unlock it, then drag an area outside its buttons. Lock it again to pass clicks through to the window underneath. By default, holding the pointer still over the overlay also unlocks it, and it locks again after you stop moving it. Adjust these timings and behaviors in **Behavior**.
- **Change the display:** Start with **Presets**, then use **Elements** to choose original lyrics, phonetic lyrics, translations, and the number of previous and next lines. Adjust the appearance in **Typography**, **Colors**, and **Layout**.
- **Choose when it appears:** Configure **Behavior → Hide When Paused**, **Appearance on Hover**, and **Show Next Track** as needed.
- **Startup and exit:** In **Advanced**, configure **Start on Boot** and **Start in Tray**. To fully exit the app, select **Quit** in the tray.

Changes are saved as you make them. **Advanced → Theme Management** also lets you export or import settings as a JSON file. If tray labels remain in the previous language after switching languages, restart the app.

## Updates

The app checks for updates when it starts. To check manually, select **Settings → Advanced → Check for Updates**. When an update is offered, choosing to install downloads it and restarts the app.

If updating fails, use **Open Download Page** in the update message or get an installer from the [latest release](https://github.com/ivLis-Studio/ivLyrics-overlay/releases/latest). Select **Quit** in the tray, install the new version, and launch it again.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The PC setting shows Disconnected, or the lyrics window is empty. | Check that Overlay and ivLyrics for PC are running on the same computer, **Enable Desktop Overlay** is on, and both ports match. Open ivLyrics in Spotify and play the song again. |
| Track information appears, but lyrics do not. | Plain lyrics without timing are not displayed in Overlay. Check that ivLyrics for PC has synced lyrics for the song. |
| Translations, phonetic lyrics, or karaoke effects are missing. | Check the options in **Elements** and the data available in ivLyrics for PC. Translations and phonetic lyrics need the corresponding data; karaoke effects need syllable timing. |
| The window cannot be moved or is off screen. | Use **Lock/Unlock** in the tray to unlock it, or select **Reset Position**. |
| The window disappears or fades when hovered. | Check the pause and hover settings in **Behavior**. The window also hides when playback data from ivLyrics for PC stops for a while (about 5 seconds while playing, about 20 seconds while paused), so check the connection. |

## Sending lyrics from another program

Programs other than ivLyrics for PC can send lyrics over the same local connection.

- `POST /lyrics`: track information and lyrics (`trackUri`, `track`, `lyrics`, `isSynced`)
- `POST /progress`: playback position (`trackUri`, `position`, `isPlaying`)
- `GET /status`: connection check. It does not change what is displayed.

When several programs send at once, Overlay shows the one that is playing. If more than one is playing, it shows the one that started playing last, and a paused program never clears another program's lyrics. Add `source` (your program's name) to a request to get a response saying whether it is shown, and add `heartbeatMs` (how often you resend unchanged progress) to keep the window visible for about twice that interval. Requests without a name are told apart by their origin.

## Data and limitations

Lyrics, track information, and playback position are passed over a local connection on the same computer (`127.0.0.1`, port `15000` by default). Display settings are saved on your computer. Update checks use GitHub, and loading album art and icons may also contact external servers.

The local connection has no separate authentication and does not restrict request origins. Do not expose its port outside your computer. Lyrics availability, translation and phonetic generation, and internet requirements depend on ivLyrics for PC and your selected providers.

## Support and related projects

Contact us on [Discord](https://discord.gg/2fu36fUzdE) or [GitHub Issues](https://github.com/ivLis-Studio/ivLyrics-overlay/issues). Include your operating system and CPU type, Overlay and ivLyrics for PC versions, the affected song, and steps to reproduce the issue.

[ivLyrics for PC](https://github.com/ivLis-Studio/ivLyrics) · [Android](https://github.com/ivLis-Studio/ivLyrics-Android) · [iOS](https://github.com/ivLis-Studio/ivLyrics-IOS) · [ivLyrics Helper](https://github.com/ivLis-Studio/ivLyrics-helper)

This app uses [Tauri](https://tauri.app/) and [React](https://react.dev/).

<details>
<summary>Build it yourself or contribute</summary>

Building from source requires Node.js and Rust. For normal use, choose a released installer above instead. See the [package scripts](package.json) for run/build commands and the [Tauri configuration](src-tauri/tauri.conf.json) for desktop settings.

</details>
