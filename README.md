# WP DotMap

A WordPress plugin that adds a clean, dotted world map with custom location markers to any page or post via shortcode.

---

## What it does

- Adds a new menu item **WP DotMap** to your WordPress admin sidebar, with two pages:
  - **Markers** — add, edit, and remove location markers.
  - **Customise** — control how the map looks (dot color, background, label styling, marker size).
- Embeds the map on any page, post, or column using the shortcode **`[WPDMAP-1]`**.

---

## Installing the plugin

### Option A — Upload through wp-admin (recommended)

1. In WordPress admin, go to **Plugins → Add New → Upload Plugin**.
2. Click **Choose File** and select `wp-dotmap.zip`.
3. Click **Install Now**, then **Activate Plugin**.

### Option B — Manual upload

1. Unzip `wp-dotmap.zip`.
2. Upload the `wp-dotmap` folder to `/wp-content/plugins/` on your server.
3. In WordPress admin, go to **Plugins** and click **Activate** next to *WP DotMap*.

---

## Adding markers

1. In the WordPress admin sidebar, click **WP DotMap → Markers**.
2. You'll see one empty marker card. Fill in the three fields:

   - **Coordinates** — Paste latitude and longitude separated by a comma, e.g.
     `10.030776873714645, 76.33638544114653`
     > **Tip:** Open [Google Maps](https://www.google.com/maps), right-click the location you want, and click the very first item in the menu (the two numbers). They get copied to your clipboard — paste them straight into this field.

   - **Label** — The name shown next to the dot on the map (e.g. *Kochi*). Leave blank for no label.

   - **Color (Hex code)** — The color of the marker dot. Must be a hex code starting with `#`, like `#ef4444` (red), `#2563eb` (blue), `#10b981` (green). Leave blank to use the default red. A live swatch next to the field shows the current color.

   - **Label Position** — Where the label appears relative to the marker dot. Click any of the 8 surrounding squares in the position picker (the red dot in the center represents the marker), or pick **Default** to keep the original position (right of the marker, with a slight downward offset). Available positions: *Default, Top, Top Right, Right, Bottom Right, Bottom, Bottom Left, Left, Top Left*.

3. To add more markers, click **+ Add Marker**.
4. To remove a marker, click **− Remove** in the top-right of its card.
5. Click **Save Markers**.

---

## Customising the map's appearance

Go to **WP DotMap → Customise** to control:

- **Map dots color** — the color of every dot that forms the land masses. Default `#d6d6d6` (light gray). Pick using the color box or type a hex code.
- **Map background** — either *Transparent* (default — the map blends into whatever section it sits inside) or a *Solid color* you pick with a hex code.
- **Label text color** — color of the marker label text. Default `#1f2937`.
- **Label outline color** — the thin halo around label text that keeps it readable on any background. Default `#ffffff` (white).
- **Label text size** — font size of marker labels. Enter the number and choose **px** or **rem** from the unit dropdown. Default `11 px`.
- **Marker dot radius** — how big each marker dot appears, in pixels. The pulse animation and label offset adjust automatically. Default `5 px`.

Click **Save Changes** to apply, or **Reset to defaults** to revert all customisation in one click.

Each color field has a native color picker, a hex text input, and a live swatch — they all stay in sync as you change any of them.

---

## Displaying the map on a page

1. Edit any page or post.
2. Add a **Shortcode** block (or paste directly into any text/column block).
3. Enter:

   ```
   [WPDMAP-1]
   ```

4. Publish or update the page.

The map will appear with all your saved markers and customisation. It works inside columns, full-width blocks, sidebars — anywhere shortcodes are accepted.

You can place the shortcode multiple times on the same page; each instance shows the same set of saved markers and customisation.

---

## How it works (for the curious)

- The map is rendered with [D3.js](https://d3js.org/) using an equirectangular projection.
- Land masses come from the [world-atlas](https://github.com/topojson/world-atlas) `land-110m.json` dataset, bundled inside the plugin (no external data calls needed).
- D3 and TopoJSON are loaded from cdnjs.cloudflare.com. If your site blocks external scripts, you can change those URLs in `includes/shortcode.php` to local copies.
- Markers are stored in the WordPress options table under `wpdm_markers`.
- Customisation settings are stored under `wpdm_customise`.

---

## Uninstalling

Deactivating the plugin keeps your markers and customisation saved (in case you reactivate later).
**Deleting** the plugin from the *Plugins* screen removes both `wpdm_markers` and `wpdm_customise` automatically.

---

## File structure

```
wp-dotmap/
├── wp-dotmap.php                     (main plugin file)
├── uninstall.php                     (cleanup on delete)
├── README.md                         (this file)
├── includes/
│   ├── admin.php                     (Markers admin page)
│   ├── customise.php                 (Customise admin page)
│   └── shortcode.php                 (shortcode + asset enqueue)
└── assets/
    ├── css/
    │   ├── wp-dotmap.css             (frontend styles)
    │   └── wp-dotmap-admin.css       (admin styles)
    ├── js/
    │   ├── wp-dotmap.js              (frontend renderer)
    │   ├── wp-dotmap-admin.js        (markers add/remove logic)
    │   └── wp-dotmap-customise.js    (customise page interactions)
    └── data/
        └── land-110m.json            (bundled world geometry, ~54 KB)
```

---

## Version

- **1.2.0** — Added per-marker **Label Position** picker: choose between Default and 8 directions (Top, Top Right, Right, Bottom Right, Bottom, Bottom Left, Left, Top Left). Existing markers keep their current rendering (Default).
- **1.1.0** — Added **Customise** submenu: map dots color, background (transparent / solid color), label text color & outline, label text size (px/rem), marker dot radius, and reset to defaults.
- **1.0.0** — Initial release.
