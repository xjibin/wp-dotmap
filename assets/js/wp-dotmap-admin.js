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
