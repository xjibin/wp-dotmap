/*!
 * WP DotMap — Customise admin UI
 * Handles:
 *   - Background mode radio toggle (shows/hides the bg color row)
 *   - Two-way sync between <input type="color"> and its paired hex text input
 *   - Live swatch preview
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {

		// ----- Background mode toggle -----
		var bgRadios   = document.querySelectorAll('[data-wpdm-bgmode]');
		var bgColorRow = document.querySelector('[data-wpdm-bg-color-row]');

		function syncBgRow() {
			if (!bgColorRow) return;
			var selected = document.querySelector('[data-wpdm-bgmode]:checked');
			var mode = selected ? selected.value : 'transparent';
			if (mode === 'color') {
				bgColorRow.removeAttribute('hidden');
			} else {
				bgColorRow.setAttribute('hidden', '');
			}
		}
		Array.prototype.forEach.call(bgRadios, function (r) {
			r.addEventListener('change', syncBgRow);
		});
		syncBgRow();

		// ----- Color picker ↔ hex sync + swatch -----
		function expandShortHex(v) {
			// #abc → #aabbcc
			return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
		}

		function isValidHex(v) {
			return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
		}

		function updateSwatch(group, value) {
			var swatch = group.querySelector('[data-wpdm-swatch]');
			if (!swatch) return;
			if (isValidHex(value)) {
				swatch.style.background = value;
				swatch.classList.remove('wpdm-color-invalid');
			} else if (value === '') {
				swatch.style.background = '#ffffff';
			} else {
				swatch.classList.add('wpdm-color-invalid');
			}
		}

		var groups = document.querySelectorAll('[data-wpdm-cp]');
		Array.prototype.forEach.call(groups, function (group) {
			var picker = group.querySelector('[data-wpdm-picker]');
			var hex    = group.querySelector('[data-wpdm-hex]');
			if (!picker || !hex) return;

			// Picker changes → update hex + swatch.
			picker.addEventListener('input', function () {
				hex.value = picker.value;
				updateSwatch(group, hex.value);
			});

			// Hex typing → update picker + swatch (only when valid).
			hex.addEventListener('input', function () {
				var v = hex.value.trim();
				if (isValidHex(v)) {
					picker.value = (v.length === 4) ? expandShortHex(v) : v.toLowerCase();
				}
				updateSwatch(group, v);
			});

			// Initial swatch.
			updateSwatch(group, hex.value);
		});
	});
})();
