<?php
/**
 * Admin menu + Markers page for WP DotMap.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * Register top-level menu + submenus (Markers, Customise)
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', 'wpdm_register_admin_menu' );
function wpdm_register_admin_menu() {
	add_menu_page(
		__( 'WP DotMap', 'wp-dotmap' ),
		__( 'WP DotMap', 'wp-dotmap' ),
		'manage_options',
		'wp-dotmap',
		'wpdm_render_admin_page',
		'dashicons-location-alt',
		80
	);

	// Rename the auto-generated first submenu entry from "WP DotMap" to "Markers".
	add_submenu_page(
		'wp-dotmap',
		__( 'Markers', 'wp-dotmap' ),
		__( 'Markers', 'wp-dotmap' ),
		'manage_options',
		'wp-dotmap',
		'wpdm_render_admin_page'
	);

	// The Customise submenu is registered in includes/customise.php so
	// concerns stay separated.
}

/* -------------------------------------------------------------------------
 * Enqueue admin assets only on the Markers screen
 * ---------------------------------------------------------------------- */
add_action( 'admin_enqueue_scripts', 'wpdm_enqueue_admin_assets' );
function wpdm_enqueue_admin_assets( $hook ) {
	if ( 'toplevel_page_wp-dotmap' !== $hook ) {
		return;
	}
	wp_enqueue_style(
		'wpdm-admin',
		WPDM_URL . 'assets/css/wp-dotmap-admin.css',
		array(),
		WPDM_VERSION
	);
	wp_enqueue_script(
		'wpdm-admin',
		WPDM_URL . 'assets/js/wp-dotmap-admin.js',
		array(),
		WPDM_VERSION,
		true
	);
}

/* -------------------------------------------------------------------------
 * Form submission handler (admin-post.php endpoint)
 * ---------------------------------------------------------------------- */
add_action( 'admin_post_wpdm_save', 'wpdm_handle_save' );
function wpdm_handle_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do this.', 'wp-dotmap' ) );
	}
	check_admin_referer( 'wpdm_save_markers' );

	$clean   = array();
	$raw     = isset( $_POST['markers'] ) && is_array( $_POST['markers'] ) ? $_POST['markers'] : array();

	$valid_positions = array(
		'default', 'top', 'top-right', 'right', 'bottom-right',
		'bottom', 'bottom-left', 'left', 'top-left',
	);

	foreach ( $raw as $row ) {
		$coords_raw    = isset( $row['coords'] ) ? sanitize_text_field( wp_unslash( $row['coords'] ) ) : '';
		$label         = isset( $row['label'] )  ? sanitize_text_field( wp_unslash( $row['label'] ) )  : '';
		$color_raw     = isset( $row['color'] )  ? sanitize_text_field( wp_unslash( $row['color'] ) )  : '';
		$position_raw  = isset( $row['label_position'] ) ? sanitize_text_field( wp_unslash( $row['label_position'] ) ) : 'default';

		if ( '' === $coords_raw ) {
			continue;
		}

		$parts = array_map( 'trim', explode( ',', $coords_raw ) );
		if ( 2 !== count( $parts ) || '' === $parts[0] || '' === $parts[1] ) {
			continue;
		}
		if ( ! is_numeric( $parts[0] ) || ! is_numeric( $parts[1] ) ) {
			continue;
		}

		$lat = floatval( $parts[0] );
		$lng = floatval( $parts[1] );

		if ( $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 ) {
			continue;
		}

		$color = '';
		if ( '' !== $color_raw ) {
			if ( preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $color_raw ) ) {
				$color = strtolower( $color_raw );
			}
		}

		$label_position = in_array( $position_raw, $valid_positions, true ) ? $position_raw : 'default';

		$clean[] = array(
			'lat'            => $lat,
			'lng'            => $lng,
			'label'          => $label,
			'color'          => $color,
			'label_position' => $label_position,
		);
	}

	update_option( WPDM_OPTION_KEY, $clean );

	wp_safe_redirect(
		add_query_arg(
			array(
				'page'  => 'wp-dotmap',
				'saved' => '1',
			),
			admin_url( 'admin.php' )
		)
	);
	exit;
}

/* -------------------------------------------------------------------------
 * Admin page renderer (Markers)
 * ---------------------------------------------------------------------- */
function wpdm_render_admin_page() {
	$markers = get_option( WPDM_OPTION_KEY, array() );
	if ( ! is_array( $markers ) ) {
		$markers = array();
	}
	?>
	<div class="wrap wpdm-wrap">
		<h1><?php esc_html_e( 'WP DotMap — Markers', 'wp-dotmap' ); ?></h1>

		<div class="wpdm-intro">
			<p>
				<?php
				printf(
					/* translators: %s: shortcode */
					esc_html__( 'Add the locations you want to display on your dotted world map. To show the map on any page or post, paste this shortcode into the page editor (or any column block): %s', 'wp-dotmap' ),
					'<code>[' . esc_html( WPDM_SHORTCODE ) . ']</code>'
				);
				?>
			</p>
		</div>

		<?php if ( isset( $_GET['saved'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Markers saved.', 'wp-dotmap' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="wpdm-form">
			<input type="hidden" name="action" value="wpdm_save" />
			<?php wp_nonce_field( 'wpdm_save_markers' ); ?>

			<div id="wpdm-markers" class="wpdm-marker-list">
				<?php
				if ( empty( $markers ) ) {
					wpdm_render_marker_row( 0, array() );
				} else {
					foreach ( $markers as $i => $m ) {
						wpdm_render_marker_row( $i, $m );
					}
				}
				?>
			</div>

			<p class="wpdm-row-controls">
				<button type="button" class="button button-secondary wpdm-btn-add" id="wpdm-add">
					<span class="wpdm-plus" aria-hidden="true">＋</span>
					<?php esc_html_e( 'Add Marker', 'wp-dotmap' ); ?>
				</button>
			</p>

			<p class="submit wpdm-actions-bar">
				<button type="submit" class="button button-primary"><?php esc_html_e( 'Save Markers', 'wp-dotmap' ); ?></button>

				<span class="wpdm-actions-divider" aria-hidden="true"></span>

				<button type="button" class="button button-secondary" id="wpdm-export-markers">
					<span class="wpdm-action-icon" aria-hidden="true">↓</span>
					<?php esc_html_e( 'Export Markers', 'wp-dotmap' ); ?>
				</button>
				<button type="button" class="button button-secondary" id="wpdm-import-markers">
					<span class="wpdm-action-icon" aria-hidden="true">↑</span>
					<?php esc_html_e( 'Import Markers', 'wp-dotmap' ); ?>
				</button>
				<input type="file" id="wpdm-import-markers-file" accept=".json,application/json" hidden />

				<button type="button" class="button-link wpdm-sample-link" id="wpdm-sample-markers">
					<?php esc_html_e( 'Download sample JSON', 'wp-dotmap' ); ?>
				</button>
			</p>

			<div id="wpdm-inline-notice" class="wpdm-inline-notice" hidden></div>
		</form>

		<script type="text/template" id="wpdm-row-template"><?php wpdm_render_marker_row( '__INDEX__', array() ); ?></script>
	</div>
	<?php
}

function wpdm_render_marker_row( $index, $marker ) {
	$coords = '';
	if ( isset( $marker['lat'] ) && isset( $marker['lng'] ) && '' !== $marker['lat'] && '' !== $marker['lng'] ) {
		$coords = $marker['lat'] . ', ' . $marker['lng'];
	}
	$label          = isset( $marker['label'] )          ? $marker['label']          : '';
	$color          = isset( $marker['color'] )          ? $marker['color']          : '';
	$label_position = isset( $marker['label_position'] ) ? $marker['label_position'] : 'default';

	$idx = esc_attr( $index );
	?>
	<div class="wpdm-marker-row" data-wpdm-row>
		<div class="wpdm-marker-header">
			<span class="wpdm-marker-title"><?php esc_html_e( 'Marker', 'wp-dotmap' ); ?></span>
			<button type="button" class="button-link wpdm-btn-remove" aria-label="<?php esc_attr_e( 'Remove this marker', 'wp-dotmap' ); ?>">
				<span class="wpdm-minus" aria-hidden="true">−</span>
				<?php esc_html_e( 'Remove', 'wp-dotmap' ); ?>
			</button>
		</div>

		<div class="wpdm-field">
			<label for="wpdm-coords-<?php echo $idx; ?>">
				<?php esc_html_e( 'Coordinates (Latitude, Longitude)', 'wp-dotmap' ); ?>
			</label>
			<input
				type="text"
				id="wpdm-coords-<?php echo $idx; ?>"
				name="markers[<?php echo $idx; ?>][coords]"
				value="<?php echo esc_attr( $coords ); ?>"
				placeholder="10.030776873714645, 76.33638544114653"
				class="regular-text wpdm-input wpdm-input-coords"
				autocomplete="off"
			/>
			<p class="description">
				<?php esc_html_e( 'Paste the latitude and longitude separated by a comma, exactly as copied from Google Maps. Example:', 'wp-dotmap' ); ?>
				<code>10.030776873714645, 76.33638544114653</code><br>
				<strong><?php esc_html_e( 'How to get this:', 'wp-dotmap' ); ?></strong>
				<?php esc_html_e( 'Open Google Maps, right-click on the location you want, then click the very first item in the menu (the two numbers). They will be copied to your clipboard — paste them here directly.', 'wp-dotmap' ); ?>
			</p>
		</div>

		<div class="wpdm-field">
			<label for="wpdm-label-<?php echo $idx; ?>">
				<?php esc_html_e( 'Label', 'wp-dotmap' ); ?>
			</label>
			<input
				type="text"
				id="wpdm-label-<?php echo $idx; ?>"
				name="markers[<?php echo $idx; ?>][label]"
				value="<?php echo esc_attr( $label ); ?>"
				placeholder="<?php esc_attr_e( 'e.g. Kochi', 'wp-dotmap' ); ?>"
				class="regular-text wpdm-input"
				autocomplete="off"
			/>
			<p class="description">
				<?php esc_html_e( 'The name shown next to the dot on the map. Leave blank for no label.', 'wp-dotmap' ); ?>
			</p>
		</div>

		<div class="wpdm-field">
			<label for="wpdm-color-<?php echo $idx; ?>">
				<?php esc_html_e( 'Color (Hex code)', 'wp-dotmap' ); ?>
			</label>
			<div class="wpdm-color-wrap">
				<input
					type="text"
					id="wpdm-color-<?php echo $idx; ?>"
					name="markers[<?php echo $idx; ?>][color]"
					value="<?php echo esc_attr( $color ); ?>"
					placeholder="#ef4444"
					class="wpdm-input wpdm-input-color"
					autocomplete="off"
					maxlength="7"
				/>
				<span class="wpdm-color-swatch" data-wpdm-swatch style="background: <?php echo esc_attr( $color ? $color : '#ef4444' ); ?>;"></span>
			</div>
			<p class="description">
				<?php esc_html_e( 'Color of the marker dot in hex format. Must start with', 'wp-dotmap' ); ?>
				<code>#</code>
				<?php esc_html_e( 'followed by 6 characters.', 'wp-dotmap' ); ?>
				<?php esc_html_e( 'Examples:', 'wp-dotmap' ); ?>
				<code>#ef4444</code> <?php esc_html_e( 'red', 'wp-dotmap' ); ?>,
				<code>#2563eb</code> <?php esc_html_e( 'blue', 'wp-dotmap' ); ?>,
				<code>#10b981</code> <?php esc_html_e( 'green', 'wp-dotmap' ); ?>,
				<code>#f97316</code> <?php esc_html_e( 'orange', 'wp-dotmap' ); ?>.
				<?php esc_html_e( 'Leave blank for default red.', 'wp-dotmap' ); ?>
			</p>
		</div>

		<div class="wpdm-field">
			<label><?php esc_html_e( 'Label Position', 'wp-dotmap' ); ?></label>
			<div class="wpdm-label-position">
				<label class="wpdm-pos-default">
					<input
						type="radio"
						name="markers[<?php echo $idx; ?>][label_position]"
						value="default"
						<?php checked( $label_position, 'default' ); ?>
					/>
					<span><?php esc_html_e( 'Default (current position — right of marker)', 'wp-dotmap' ); ?></span>
				</label>

				<div class="wpdm-pos-grid" role="radiogroup" aria-label="<?php esc_attr_e( 'Label position around marker', 'wp-dotmap' ); ?>">
					<?php
					$positions_grid = array(
						'top-left'     => __( 'Top Left',     'wp-dotmap' ),
						'top'          => __( 'Top',          'wp-dotmap' ),
						'top-right'    => __( 'Top Right',    'wp-dotmap' ),
						'left'         => __( 'Left',         'wp-dotmap' ),
						'center'       => '', // non-clickable center showing the marker icon
						'right'        => __( 'Right',        'wp-dotmap' ),
						'bottom-left'  => __( 'Bottom Left',  'wp-dotmap' ),
						'bottom'       => __( 'Bottom',       'wp-dotmap' ),
						'bottom-right' => __( 'Bottom Right', 'wp-dotmap' ),
					);
					foreach ( $positions_grid as $pos_value => $pos_label ) :
						if ( 'center' === $pos_value ) : ?>
							<div class="wpdm-pos-center" aria-hidden="true"></div>
						<?php else : ?>
							<label class="wpdm-pos-cell-wrap" title="<?php echo esc_attr( $pos_label ); ?>" aria-label="<?php echo esc_attr( $pos_label ); ?>">
								<input
									type="radio"
									name="markers[<?php echo $idx; ?>][label_position]"
									value="<?php echo esc_attr( $pos_value ); ?>"
									<?php checked( $label_position, $pos_value ); ?>
								/>
								<span class="wpdm-pos-cell" data-pos="<?php echo esc_attr( $pos_value ); ?>"></span>
							</label>
						<?php endif;
					endforeach;
					?>
				</div>
			</div>
			<p class="description">
				<?php esc_html_e( 'Choose where the label appears relative to the marker dot. The red dot in the center represents the marker — click any surrounding square to place the label in that direction. Default uses the original position.', 'wp-dotmap' ); ?>
			</p>
		</div>
	</div>
	<?php
}
