/*!
 * WP DotMap — frontend renderer
 * Renders each .wpdm-container element using the markers handed in via window.WPDMData[id].
 */
(function () {
	'use strict';

	if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
		console.error('WP DotMap: d3 or topojson did not load.');
		return;
	}

	// --- Map render constants ---
	var WIDTH       = 1400;
	var HEIGHT      = 700;
	var DOT_SPACING = 7;
	var DOT_RADIUS  = 1.55;
	var LAND_COLOR  = '#d6d6d6';

	// Marker visuals.
	var DEFAULT_MARKER_COLOR = '#ef4444';
	var MARKER_SIZE          = 5;

	// Share the parsed land geometry across multiple maps on the same page.
	var landCache    = null;
	var landRequests = {}; // keyed by dataUrl

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

	function renderContainer(container) {
		var id      = container.id;
		var payload = (window.WPDMData && window.WPDMData[id]) || {};
		var markers = Array.isArray(payload.markers) ? payload.markers : [];
		var dataUrl = payload.dataUrl;

		if (!dataUrl) {
			console.error('WP DotMap: no data URL provided for', id);
			return;
		}

		var svg        = d3.select(container).select('svg.wpdm-svg');
		var loadingEl  = container.querySelector('.wpdm-loading');
		var projection = makeProjection();

		// Layers: dots underneath, markers on top.
		var dotsLayer    = svg.append('g').attr('class', 'wpdm-dots-layer');
		var markerLayer  = svg.append('g').attr('class', 'wpdm-markers-layer');

		loadLand(dataUrl).then(function (land) {
			// Walk a regular pixel grid; keep points that fall on land.
			var points = [];
			for (var x = 0; x <= WIDTH;  x += DOT_SPACING) {
				for (var y = 0; y <= HEIGHT; y += DOT_SPACING) {
					var coords = projection.invert([x, y]);
					if (!coords) continue;
					// Skip extreme polar regions (visual noise on equirectangular).
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
				.attr('fill', LAND_COLOR);

			if (loadingEl && loadingEl.parentNode) {
				loadingEl.parentNode.removeChild(loadingEl);
			}

			// Add markers on top.
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
					.attr('r', MARKER_SIZE)
					.attr('fill', color);

				g.append('circle')
					.attr('class', 'wpdm-marker-dot')
					.attr('r', MARKER_SIZE)
					.attr('fill', color);

				if (label) {
					g.append('text')
						.attr('class', 'wpdm-marker-label')
						.attr('x', MARKER_SIZE + 5)
						.attr('y', 4)
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
