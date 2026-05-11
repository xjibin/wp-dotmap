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

/*!
 * WP DotMap — Customise Export / Import / Sample JSON
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		var form       = document.getElementById('wpdm-customise-form');
		var exportBtn  = document.getElementById('wpdm-export-customise');
		var importBtn  = document.getElementById('wpdm-import-customise');
		var importFile = document.getElementById('wpdm-import-customise-file');
		var sampleBtn  = document.getElementById('wpdm-sample-customise');
		var noticeEl   = document.getElementById('wpdm-customise-inline-notice');
		if (!form || !exportBtn || !importBtn || !importFile || !sampleBtn) {
			return;
		}

		var FILE_TYPE    = 'wp-dotmap-customise';
		var FILE_VERSION = '1.3.0';

		var FIELDS = [
			'dot_color', 'bg_mode', 'bg_color',
			'label_color', 'label_outline',
			'label_size', 'label_size_unit',
			'marker_radius'
		];

		// --------- Helpers ---------
		function downloadJson(data, filename) {
			var json = JSON.stringify(data, null, 2);
			var blob = new Blob([json], { type: 'application/json' });
			var url  = URL.createObjectURL(blob);
			var a    = document.createElement('a');
			a.href     = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
		}

		function showNotice(msg, type) {
			if (!noticeEl) return;
			noticeEl.textContent = msg;
			noticeEl.className   = 'wpdm-inline-notice wpdm-notice-' + (type || 'success');
			noticeEl.removeAttribute('hidden');
			clearTimeout(noticeEl._timer);
			noticeEl._timer = setTimeout(function () {
				noticeEl.setAttribute('hidden', '');
			}, 7000);
		}

		function getField(name) {
			// Radios → return the checked one's value.
			var radios = form.querySelectorAll('input[type="radio"][name="wpdm_customise[' + name + ']"]');
			if (radios.length > 0) {
				for (var i = 0; i < radios.length; i++) {
					if (radios[i].checked) return radios[i].value;
				}
				return '';
			}
			var el = form.querySelector('[name="wpdm_customise[' + name + ']"]');
			return el ? el.value : '';
		}

		function setField(name, value) {
			if (value === undefined || value === null) return;
			var radios = form.querySelectorAll('input[type="radio"][name="wpdm_customise[' + name + ']"]');
			if (radios.length > 0) {
				for (var i = 0; i < radios.length; i++) {
					radios[i].checked = (String(radios[i].value) === String(value));
				}
				return;
			}
			var el = form.querySelector('[name="wpdm_customise[' + name + ']"]');
			if (el) el.value = value;

			// Keep paired color picker in sync when the hex input is set.
			if (el && el.classList.contains('wpdm-input-color')) {
				var group  = el.closest('[data-wpdm-cp]');
				var picker = group ? group.querySelector('[data-wpdm-picker]') : null;
				if (picker && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
					picker.value = (value.length === 4)
						? ('#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3])
						: value.toLowerCase();
				}
			}
		}

		function snapshot() {
			var out = {};
			FIELDS.forEach(function (k) {
				var v = getField(k);
				if (k === 'label_size' || k === 'marker_radius') {
					out[k] = parseFloat(v);
					if (isNaN(out[k])) out[k] = 0;
				} else {
					out[k] = v;
				}
			});
			return out;
		}

		// --------- Export ---------
		exportBtn.addEventListener('click', function () {
			var payload = {
				version:     FILE_VERSION,
				type:        FILE_TYPE,
				exported_at: new Date().toISOString(),
				customise:   snapshot()
			};
			downloadJson(payload, 'wp-dotmap-customise.json');
			showNotice('Customisation exported to wp-dotmap-customise.json.', 'success');
		});

		// --------- Sample ---------
		sampleBtn.addEventListener('click', function () {
			var sample = {
				version:     FILE_VERSION,
				type:        FILE_TYPE,
				exported_at: new Date().toISOString(),
				customise: {
					dot_color:       '#d6d6d6',
					bg_mode:         'transparent',
					bg_color:        '#ffffff',
					label_color:     '#1f2937',
					label_outline:   '#ffffff',
					label_size:      11,
					label_size_unit: 'px',
					marker_radius:   5
				}
			};
			downloadJson(sample, 'wp-dotmap-customise-sample.json');
			showNotice('Sample JSON downloaded. Open it in any text editor to see the format.', 'info');
		});

		// --------- Import ---------
		importBtn.addEventListener('click', function () {
			importFile.click();
		});

		importFile.addEventListener('change', function (e) {
			var file = e.target.files && e.target.files[0];
			if (!file) return;

			var reader = new FileReader();
			reader.onload = function (ev) {
				try {
					var data = JSON.parse(ev.target.result);

					if (data.type !== FILE_TYPE) {
						showNotice('This file is not a WP DotMap customise file (expected type "' + FILE_TYPE + '"). Found "' + (data.type || 'unknown') + '" instead.', 'error');
						return;
					}
					if (!data.customise || typeof data.customise !== 'object') {
						showNotice('Invalid file: missing "customise" object.', 'error');
						return;
					}
					if (!window.confirm('Import customisation? This replaces the values currently shown in the form. (You will still need to click "Save Changes" to apply.)')) {
						return;
					}

					FIELDS.forEach(function (k) {
						if (data.customise[k] !== undefined) {
							setField(k, data.customise[k]);
						}
					});

					// Refresh dependent UI: bg row visibility and color swatches.
					var bgEvt = new Event('change');
					var anyBg = form.querySelector('[data-wpdm-bgmode]:checked');
					if (anyBg) anyBg.dispatchEvent(bgEvt);

					var hexInputs = form.querySelectorAll('[data-wpdm-hex]');
					Array.prototype.forEach.call(hexInputs, function (h) {
						h.dispatchEvent(new Event('input'));
					});

					showNotice('Customisation imported. Review the form, then click "Save Changes" to apply.', 'success');
				} catch (err) {
					showNotice('Could not read JSON file: ' + err.message, 'error');
				}
			};
			reader.readAsText(file);
			e.target.value = '';
		});
	});
})();
