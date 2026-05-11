/*!
 * WP DotMap — frontend renderer
 * Renders each .wpdm-container element using the markers + customise settings
 * provided via window.WPDMData[id].
 */
(function () {
	'use strict';

	if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
		console.error('WP DotMap: d3 or topojson did not load.');
		return;
	}

	// --- Map render constants (structural; do not customise) ---
	var WIDTH       = 1400;
	var HEIGHT      = 700;
	var DOT_SPACING = 7;
	var DOT_RADIUS  = 1.55;

	// --- Defaults (mirror PHP defaults; used when payload values are missing) ---
	var DEFAULTS = {
		dot_color:       '#d6d6d6',
		bg_mode:         'transparent',
		bg_color:        '#ffffff',
		label_color:     '#1f2937',
		label_outline:   '#ffffff',
		label_size:      11,
		label_size_unit: 'px',
		marker_radius:   5
	};

	var DEFAULT_MARKER_COLOR = '#ef4444';

	// Share the parsed land geometry across multiple maps on the same page.
	var landCache    = null;
	var landRequests = {};

	function loadLand(dataUrl) {
		if (landCache) {
			return Promise.resolve(landCache);
		}
		if (landRequests[dataUrl]) {
			return landRequests[dataUrl];
		}
		landRequests[dataUrl] = d3.json(dataUrl).then(function (world) {
			landCache = topojson.feature(world, world.objects.land);
			return landCache;
		});
		return landRequests[dataUrl];
	}

	function makeProjection() {
		return d3.geoEquirectangular()
			.scale(WIDTH / (2 * Math.PI))
			.translate([WIDTH / 2, HEIGHT / 2]);
	}

	/** Merge defaults with whatever the payload provided. */
	function resolveCustomise(c) {
		c = c || {};
		var out = {};
		for (var k in DEFAULTS) {
			if (DEFAULTS.hasOwnProperty(k)) {
				out[k] = (c[k] !== undefined && c[k] !== null && c[k] !== '') ? c[k] : DEFAULTS[k];
			}
		}
		return out;
	}

	/**
	 * Compute label placement (x, y, text-anchor, dominant-baseline) for a marker
	 * label, given a desired position and the marker's radius.
	 *
	 * The "default" position preserves the v1.1.x rendering (right of the dot,
	 * slightly biased downward). The eight directional positions arrange the
	 * label around the dot's perimeter.
	 */
	function getLabelGeometry(position, r) {
		var pad  = 4;          // breathing room from the dot edge
		var diag = r * 0.7;    // x/y offset along diagonals (≈ r·cos45°)

		switch (position) {
			case 'top':
				return { x: 0,                 y: -(r + pad),     anchor: 'middle', baseline: 'text-after-edge' };
			case 'top-right':
				return { x: diag + pad,        y: -(diag + pad),  anchor: 'start',  baseline: 'text-after-edge' };
			case 'right':
				return { x: r + pad,           y: 0,              anchor: 'start',  baseline: 'central' };
			case 'bottom-right':
				return { x: diag + pad,        y: diag + pad,     anchor: 'start',  baseline: 'text-before-edge' };
			case 'bottom':
				return { x: 0,                 y: r + pad,        anchor: 'middle', baseline: 'text-before-edge' };
			case 'bottom-left':
				return { x: -(diag + pad),     y: diag + pad,     anchor: 'end',    baseline: 'text-before-edge' };
			case 'left':
				return { x: -(r + pad),        y: 0,              anchor: 'end',    baseline: 'central' };
			case 'top-left':
				return { x: -(diag + pad),     y: -(diag + pad),  anchor: 'end',    baseline: 'text-after-edge' };
			case 'default':
			default:
				return { x: r + 5,             y: Math.round(r * 0.8), anchor: 'start', baseline: 'alphabetic' };
		}
	}

	function renderContainer(container) {
		var id       = container.id;
		var payload  = (window.WPDMData && window.WPDMData[id]) || {};
		var markers  = Array.isArray(payload.markers) ? payload.markers : [];
		var dataUrl  = payload.dataUrl;
		var custom   = resolveCustomise(payload.customise);

		if (!dataUrl) {
			console.error('WP DotMap: no data URL provided for', id);
			return;
		}

		var svg        = d3.select(container).select('svg.wpdm-svg');
		var loadingEl  = container.querySelector('.wpdm-loading');
		var projection = makeProjection();

		// Apply background on the SVG too (so SVG exports/screenshots include it
		// even though the container <div> also has it set).
		if (custom.bg_mode === 'color') {
			svg.style('background', custom.bg_color);
		}

		var dotsLayer    = svg.append('g').attr('class', 'wpdm-dots-layer');
		var markerLayer  = svg.append('g').attr('class', 'wpdm-markers-layer');

		// Precompute label font-size string (with unit).
		var labelFontSize = parseFloat(custom.label_size) + custom.label_size_unit;
		var markerRadius  = parseFloat(custom.marker_radius);
		if (!(markerRadius > 0)) markerRadius = DEFAULTS.marker_radius;

		loadLand(dataUrl).then(function (land) {
			var points = [];
			for (var x = 0; x <= WIDTH;  x += DOT_SPACING) {
				for (var y = 0; y <= HEIGHT; y += DOT_SPACING) {
					var coords = projection.invert([x, y]);
					if (!coords) continue;
					if (coords[1] > 84 || coords[1] < -60) continue;
					if (d3.geoContains(land, coords)) {
						points.push([x, y]);
					}
				}
			}

			dotsLayer.selectAll('circle')
				.data(points)
				.enter()
				.append('circle')
				.attr('class', 'wpdm-land-dot')
				.attr('cx', function (d) { return d[0]; })
				.attr('cy', function (d) { return d[1]; })
				.attr('r',  DOT_RADIUS)
				.attr('fill', custom.dot_color);

			if (loadingEl && loadingEl.parentNode) {
				loadingEl.parentNode.removeChild(loadingEl);
			}

			markers.forEach(function (m) {
				var lat = parseFloat(m.lat);
				var lng = parseFloat(m.lng);
				if (isNaN(lat) || isNaN(lng)) return;

				var xy = projection([lng, lat]);
				if (!xy) return;
				var color = (m.color && /^#[0-9a-fA-F]{3,6}$/.test(m.color)) ? m.color : DEFAULT_MARKER_COLOR;
				var label = m.label || '';

				var g = markerLayer.append('g')
					.attr('class', 'wpdm-marker')
					.attr('transform', 'translate(' + xy[0] + ',' + xy[1] + ')');

				g.append('circle')
					.attr('class', 'wpdm-marker-pulse')
					.attr('r', markerRadius)
					.attr('fill', color);

				g.append('circle')
					.attr('class', 'wpdm-marker-dot')
					.attr('r', markerRadius)
					.attr('fill', color);

				if (label) {
					var geom = getLabelGeometry(m.label_position || 'default', markerRadius);
					g.append('text')
						.attr('class', 'wpdm-marker-label')
						.attr('x', geom.x)
						.attr('y', geom.y)
						.attr('text-anchor', geom.anchor)
						.attr('dominant-baseline', geom.baseline)
						.style('font-size', labelFontSize)
						.style('fill', custom.label_color)
						.style('stroke', custom.label_outline)
						.text(label);
				}
			});
		}).catch(function (err) {
			console.error('WP DotMap: failed to load map data', err);
			if (loadingEl) {
				loadingEl.textContent = 'Map data failed to load.';
			}
		});
	}

	function init() {
		var nodes = document.querySelectorAll('.wpdm-container');
		Array.prototype.forEach.call(nodes, renderContainer);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
