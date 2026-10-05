# Nano Beauty app icon (final, approved 25 Sep 2026)

Master colours (white nano BEAUTY on plum #463E55) with the logo at 80% of the icon width on iOS,
so it sits clear of the rounded corners. Full lockup only, never "nano" alone.

The folder has:
- ios/AppIcon-1024.png: App Store and Xcode single-size icon (opaque, no rounded corners; iOS masks it).
- android/ic_launcher_foreground.png + ic_launcher_background.png: adaptive icon layers, 432 x 432 px (108 dp at xxxhdpi). The logo sits inside the 66 dp safe circle.
- android/ic_launcher_monochrome.png: themed-icon layer (Android 13+).
- android/play-store-512.png: Google Play listing icon.
- *.svg sources for the developer.

On Android the logo is scaled into the 66 dp safe circle so the launcher mask never cuts it.
At home-screen size the word BEAUTY is small; that is a known trade-off of keeping the full lockup.
