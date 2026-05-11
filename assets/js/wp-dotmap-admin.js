/*!
 * WP DotMap — admin UI
 * Handles add/remove marker rows and live color swatch updates.
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		var list     = document.getElementById('wpdm-markers');
		var addBtn   = document.getElementById('wpdm-add');
		var template = document.getElementById('wpdm-row-template');
		if (!list || !addBtn || !template) {
			return;
		}

		function nextIndex() {
			var rows = list.querySelectorAll('[data-wpdm-row]');
			var max  = -1;
			Array.prototype.forEach.call(rows, function (row) {
				var input = row.querySelector('input[name^="markers["]');
				if (!input) return;
				var m = input.name.match(/markers\[(\d+)\]/);
				if (m) {
					var n = parseInt(m[1], 10);
					if (!isNaN(n) && n > max) max = n;
				}
			});
			return max + 1;
		}

		function focusFirstInput(row) {
			var first = row.querySelector('input');
			if (first) first.focus();
		}

		addBtn.addEventListener('click', function () {
			var idx  = nextIndex();
			var html = template.innerHTML.replace(/__INDEX__/g, idx);
			// Parse into a real DOM node.
			var holder = document.createElement('div');
			holder.innerHTML = html.trim();
			var newRow = holder.firstElementChild;
			if (!newRow) return;
			list.appendChild(newRow);
			focusFirstInput(newRow);
		});

		// Remove buttons (delegated).
		list.addEventListener('click', function (e) {
			var btn = e.target.closest('.wpdm-btn-remove');
			if (!btn) return;
			e.preventDefault();
			var row = btn.closest('[data-wpdm-row]');
			if (!row) return;

			// Don't allow removing the last row to nothing — leave one empty row in place.
			var rows = list.querySelectorAll('[data-wpdm-row]');
			if (rows.length <= 1) {
				// Clear its values instead of removing.
				var inputs = row.querySelectorAll('input');
				Array.prototype.forEach.call(inputs, function (i) { i.value = ''; });
				updateSwatch(row);
				return;
			}
			row.parentNode.removeChild(row);
		});

		// Live color swatch.
		function updateSwatch(row) {
			var input  = row.querySelector('.wpdm-input-color');
			var swatch = row.querySelector('[data-wpdm-swatch]');
			if (!input || !swatch) return;
			var v = (input.value || '').trim();
			if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
				swatch.style.background = v;
				swatch.classList.remove('wpdm-color-invalid');
			} else if (v === '') {
				swatch.style.background = '#ef4444';
				swatch.classList.remove('wpdm-color-invalid');
			} else {
				swatch.classList.add('wpdm-color-invalid');
			}
		}

		list.addEventListener('input', function (e) {
			if (e.target.classList.contains('wpdm-input-color')) {
				var row = e.target.closest('[data-wpdm-row]');
				if (row) updateSwatch(row);
			}
		});

		// Initial pass to set swatches on page load.
		Array.prototype.forEach.call(list.querySelectorAll('[data-wpdm-row]'), updateSwatch);
	});
})();

/*!
 * WP DotMap — Markers Export / Import / Sample JSON
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		var list         = document.getElementById('wpdm-markers');
		var template     = document.getElementById('wpdm-row-template');
		var exportBtn    = document.getElementById('wpdm-export-markers');
		var importBtn    = document.getElementById('wpdm-import-markers');
		var importFile   = document.getElementById('wpdm-import-markers-file');
		var sampleBtn    = document.getElementById('wpdm-sample-markers');
		var noticeEl     = document.getElementById('wpdm-inline-notice');
		if (!list || !template || !exportBtn || !importBtn || !importFile || !sampleBtn) {
			return;
		}

		var FILE_TYPE     = 'wp-dotmap-markers';
		var FILE_VERSION  = '1.3.0';
		var VALID_POSITIONS = ['default', 'top', 'top-right', 'right', 'bottom-right',
		                      'bottom', 'bottom-left', 'left', 'top-left'];

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

		function readFormMarkers() {
			var rows = list.querySelectorAll('[data-wpdm-row]');
			var out  = [];
			Array.prototype.forEach.call(rows, function (row) {
				var coords = (row.querySelector('input[name$="[coords]"]') || {}).value || '';
				coords = coords.trim();
				if (!coords) return; // skip blank rows

				var label = (row.querySelector('input[name$="[label]"]') || {}).value || '';
				var color = ((row.querySelector('input[name$="[color]"]') || {}).value || '').trim();

				var checkedPos = row.querySelector('input[name$="[label_position]"]:checked');
				var label_position = checkedPos ? checkedPos.value : 'default';

				out.push({
					coords: coords,
					label:  label,
					color:  color,
					label_position: label_position
				});
			});
			return out;
		}

		// --------- Export ---------
		exportBtn.addEventListener('click', function () {
			var markers = readFormMarkers();
			var payload = {
				version:     FILE_VERSION,
				type:        FILE_TYPE,
				exported_at: new Date().toISOString(),
				markers:     markers
			};
			downloadJson(payload, 'wp-dotmap-markers.json');
			showNotice('Exported ' + markers.length + ' marker(s) to wp-dotmap-markers.json.', 'success');
		});

		// --------- Sample ---------
		sampleBtn.addEventListener('click', function () {
			var sample = {
				version:     FILE_VERSION,
				type:        FILE_TYPE,
				exported_at: new Date().toISOString(),
				markers: [
					{ coords: '10.030776873714645, 76.33638544114653', label: 'Kochi',     color: '#ef4444', label_position: 'default'      },
					{ coords: '40.7128, -74.0060',                     label: 'New York',  color: '#2563eb', label_position: 'top-right'    },
					{ coords: '51.5074, -0.1278',                      label: 'London',    color: '#10b981', label_position: 'left'         },
					{ coords: '35.6762, 139.6503',                     label: 'Tokyo',     color: '#f97316', label_position: 'top'          },
					{ coords: '-33.8688, 151.2093',                    label: 'Sydney',    color: '#a855f7', label_position: 'bottom-right' },
					{ coords: '-23.5505, -46.6333',                    label: 'São Paulo', color: '#eab308', label_position: 'bottom'       }
				]
			};
			downloadJson(sample, 'wp-dotmap-markers-sample.json');
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
						showNotice('This file is not a WP DotMap markers file (expected type "' + FILE_TYPE + '"). Found "' + (data.type || 'unknown') + '" instead.', 'error');
						return;
					}
					if (!Array.isArray(data.markers)) {
						showNotice('Invalid file: the "markers" field must be a list.', 'error');
						return;
					}

					var count = data.markers.length;
					var confirmMsg = count === 0
						? 'The file contains 0 markers. Continue and clear all current markers in the form?'
						: 'Import ' + count + ' marker(s)? This replaces what is currently in the form. (You will still need to click "Save Markers" to apply.)';
					if (!window.confirm(confirmMsg)) {
						return;
					}

					// Clear existing rows.
					list.innerHTML = '';

					if (count === 0) {
						// Leave one empty row in place so the form is usable.
						appendRowFromMarker({}, 0);
					} else {
						data.markers.forEach(function (m, i) {
							appendRowFromMarker(m, i);
						});
					}

					showNotice('Imported ' + count + ' marker(s). Review the form, then click "Save Markers" to apply.', 'success');
				} catch (err) {
					showNotice('Could not read JSON file: ' + err.message, 'error');
				}
			};
			reader.readAsText(file);
			// Reset so selecting the same file again still triggers change.
			e.target.value = '';
		});

		function appendRowFromMarker(marker, index) {
			var html   = template.innerHTML.replace(/__INDEX__/g, index);
			var holder = document.createElement('div');
			holder.innerHTML = html.trim();
			var row = holder.firstElementChild;
			if (!row) return;
			list.appendChild(row);

			// Populate text fields.
			setVal(row, '[coords]', marker.coords || '');
			setVal(row, '[label]',  marker.label  || '');
			setVal(row, '[color]',  marker.color  || '');

			// Set label position radio.
			var pos = marker.label_position || 'default';
			if (VALID_POSITIONS.indexOf(pos) === -1) pos = 'default';
			var posRadio = row.querySelector('input[name$="[label_position]"][value="' + pos + '"]');
			if (posRadio) posRadio.checked = true;

			// Update color swatch (existing helper lives in the earlier IIFE; replicate
			// minimally here for the imported row).
			updateColorSwatch(row);
		}

		function setVal(row, nameSuffix, value) {
			var input = row.querySelector('input[name$="' + nameSuffix + '"]');
			if (input) input.value = value;
		}

		function updateColorSwatch(row) {
			var input  = row.querySelector('.wpdm-input-color');
			var swatch = row.querySelector('[data-wpdm-swatch]');
			if (!input || !swatch) return;
			var v = (input.value || '').trim();
			if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
				swatch.style.background = v;
				swatch.classList.remove('wpdm-color-invalid');
			} else if (v === '') {
				swatch.style.background = '#ef4444';
				swatch.classList.remove('wpdm-color-invalid');
			} else {
				swatch.classList.add('wpdm-color-invalid');
			}
		}
	});
})();
