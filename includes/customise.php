<?php
/**
 * Customise submenu for WP DotMap.
 *
 * Controls map dots color, background, label color/outline/size, and marker radius.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------
 * Defaults
 * ---------------------------------------------------------------------- */
function wpdm_customise_defaults() {
	return array(
		'dot_color'       => '#d6d6d6',
		'bg_mode'         => 'transparent',  // 'transparent' or 'color'
		'bg_color'        => '#ffffff',
		'label_color'     => '#1f2937',
		'label_outline'   => '#ffffff',
		'label_size'      => 11,
		'label_size_unit' => 'px',           // 'px' or 'rem'
		'marker_radius'   => 5,
	);
}

/**
 * Returns saved customisation settings merged on top of defaults.
 */
function wpdm_get_customise_settings() {
	$defaults = wpdm_customise_defaults();
	$saved    = get_option( WPDM_CUSTOMISE_OPTION_KEY, array() );
	if ( ! is_array( $saved ) ) {
		$saved = array();
	}
	return array_merge( $defaults, $saved );
}

/* -------------------------------------------------------------------------
 * Register the submenu
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', 'wpdm_register_customise_menu', 20 );
function wpdm_register_customise_menu() {
	add_submenu_page(
		'wp-dotmap',
		__( 'Customise', 'wp-dotmap' ),
		__( 'Customise', 'wp-dotmap' ),
		'manage_options',
		'wp-dotmap-customise',
		'wpdm_render_customise_page'
	);
}

/* -------------------------------------------------------------------------
 * Enqueue assets only on the Customise screen
 * ---------------------------------------------------------------------- */
add_action( 'admin_enqueue_scripts', 'wpdm_enqueue_customise_assets' );
function wpdm_enqueue_customise_assets( $hook ) {
	if ( 'wp-dotmap_page_wp-dotmap-customise' !== $hook ) {
		return;
	}
	wp_enqueue_style(
		'wpdm-admin',
		WPDM_URL . 'assets/css/wp-dotmap-admin.css',
		array(),
		WPDM_VERSION
	);
	wp_enqueue_script(
		'wpdm-customise',
		WPDM_URL . 'assets/js/wp-dotmap-customise.js',
		array(),
		WPDM_VERSION,
		true
	);
}

/* -------------------------------------------------------------------------
 * Save handler
 * ---------------------------------------------------------------------- */
add_action( 'admin_post_wpdm_save_customise', 'wpdm_handle_save_customise' );
function wpdm_handle_save_customise() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do this.', 'wp-dotmap' ) );
	}
	check_admin_referer( 'wpdm_save_customise' );

	// Reset button pressed → wipe settings, fall back to defaults on next read.
	if ( ! empty( $_POST['wpdm_reset'] ) ) {
		delete_option( WPDM_CUSTOMISE_OPTION_KEY );
		wp_safe_redirect(
			add_query_arg(
				array(
					'page'  => 'wp-dotmap-customise',
					'reset' => '1',
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	$defaults = wpdm_customise_defaults();
	$in       = isset( $_POST['wpdm_customise'] ) && is_array( $_POST['wpdm_customise'] )
		? wp_unslash( $_POST['wpdm_customise'] )
		: array();

	$clean = array();

	// Hex colors.
	$clean['dot_color']     = wpdm_sanitize_hex( $in['dot_color']     ?? '', $defaults['dot_color'] );
	$clean['bg_color']      = wpdm_sanitize_hex( $in['bg_color']      ?? '', $defaults['bg_color'] );
	$clean['label_color']   = wpdm_sanitize_hex( $in['label_color']   ?? '', $defaults['label_color'] );
	$clean['label_outline'] = wpdm_sanitize_hex( $in['label_outline'] ?? '', $defaults['label_outline'] );

	// Background mode.
	$bg_mode_in        = isset( $in['bg_mode'] ) ? sanitize_text_field( $in['bg_mode'] ) : '';
	$clean['bg_mode']  = in_array( $bg_mode_in, array( 'transparent', 'color' ), true ) ? $bg_mode_in : $defaults['bg_mode'];

	// Label size + unit.
	$size_in            = isset( $in['label_size'] ) ? floatval( $in['label_size'] ) : 0;
	$clean['label_size'] = ( $size_in > 0 && $size_in <= 200 ) ? round( $size_in, 2 ) : $defaults['label_size'];

	$unit_in                  = isset( $in['label_size_unit'] ) ? sanitize_text_field( $in['label_size_unit'] ) : '';
	$clean['label_size_unit'] = in_array( $unit_in, array( 'px', 'rem' ), true ) ? $unit_in : $defaults['label_size_unit'];

	// Marker radius (px).
	$r_in                  = isset( $in['marker_radius'] ) ? floatval( $in['marker_radius'] ) : 0;
	$clean['marker_radius'] = ( $r_in > 0 && $r_in <= 50 ) ? round( $r_in, 2 ) : $defaults['marker_radius'];

	update_option( WPDM_CUSTOMISE_OPTION_KEY, $clean );

	wp_safe_redirect(
		add_query_arg(
			array(
				'page'  => 'wp-dotmap-customise',
				'saved' => '1',
			),
			admin_url( 'admin.php' )
		)
	);
	exit;
}

/**
 * Normalize a hex color string. Accepts #RGB or #RRGGBB. Returns $fallback if invalid.
 */
function wpdm_sanitize_hex( $value, $fallback ) {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return $fallback;
	}
	if ( ! preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value ) ) {
		return $fallback;
	}
	// Expand 3-digit shorthand to 6-digit (e.g. #fff → #ffffff).
	if ( 4 === strlen( $value ) ) {
		$value = '#' . $value[1] . $value[1] . $value[2] . $value[2] . $value[3] . $value[3];
	}
	return strtolower( $value );
}

/* -------------------------------------------------------------------------
 * Page renderer
 * ---------------------------------------------------------------------- */
function wpdm_render_customise_page() {
	$s = wpdm_get_customise_settings();
	?>
	<div class="wrap wpdm-wrap">
		<h1><?php esc_html_e( 'WP DotMap — Customise', 'wp-dotmap' ); ?></h1>

		<div class="wpdm-intro">
			<p>
				<?php esc_html_e( 'Adjust how the dotted world map looks: the color of the map dots, the background, and the appearance of marker labels. Changes apply everywhere the map is embedded.', 'wp-dotmap' ); ?>
			</p>
		</div>

		<?php if ( isset( $_GET['saved'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success is-dismissible">
				<p><?php esc_html_e( 'Customisation saved.', 'wp-dotmap' ); ?></p>
			</div>
		<?php endif; ?>
		<?php if ( isset( $_GET['reset'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-info is-dismissible">
				<p><?php esc_html_e( 'Customisation has been reset to defaults.', 'wp-dotmap' ); ?></p>
			</div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="wpdm-customise-form">
			<input type="hidden" name="action" value="wpdm_save_customise" />
			<?php wp_nonce_field( 'wpdm_save_customise' ); ?>

			<div class="wpdm-customise-section">

				<!-- Map dots color -->
				<div class="wpdm-field">
					<label for="wpdm-dot-color"><?php esc_html_e( 'Map dots color', 'wp-dotmap' ); ?></label>
					<?php wpdm_render_color_picker( 'wpdm-dot-color', 'wpdm_customise[dot_color]', $s['dot_color'] ); ?>
					<p class="description">
						<?php esc_html_e( 'Color of all the small dots that make up the land masses of the map.', 'wp-dotmap' ); ?>
						<?php
						printf(
							/* translators: %s: default hex value */
							esc_html__( 'Default: %s (light gray).', 'wp-dotmap' ),
							'<code>#d6d6d6</code>'
						);
						?>
					</p>
				</div>

				<!-- Map background -->
				<div class="wpdm-field">
					<label><?php esc_html_e( 'Map background', 'wp-dotmap' ); ?></label>
					<div class="wpdm-radio-group">
						<label class="wpdm-radio">
							<input type="radio" name="wpdm_customise[bg_mode]" value="transparent" <?php checked( $s['bg_mode'], 'transparent' ); ?> data-wpdm-bgmode />
							<?php esc_html_e( 'Transparent (default)', 'wp-dotmap' ); ?>
						</label>
						<label class="wpdm-radio">
							<input type="radio" name="wpdm_customise[bg_mode]" value="color" <?php checked( $s['bg_mode'], 'color' ); ?> data-wpdm-bgmode />
							<?php esc_html_e( 'Solid color', 'wp-dotmap' ); ?>
						</label>
					</div>
					<div class="wpdm-bg-color-row" data-wpdm-bg-color-row<?php echo 'color' === $s['bg_mode'] ? '' : ' hidden'; ?>>
						<?php wpdm_render_color_picker( 'wpdm-bg-color', 'wpdm_customise[bg_color]', $s['bg_color'] ); ?>
					</div>
					<p class="description">
						<?php esc_html_e( 'Transparent lets the map blend into whatever section or column it sits inside. Choose “Solid color” and pick a hex code to give the map its own background.', 'wp-dotmap' ); ?>
					</p>
				</div>

				<!-- Label text color -->
				<div class="wpdm-field">
					<label for="wpdm-label-color"><?php esc_html_e( 'Label text color', 'wp-dotmap' ); ?></label>
					<?php wpdm_render_color_picker( 'wpdm-label-color', 'wpdm_customise[label_color]', $s['label_color'] ); ?>
					<p class="description">
						<?php esc_html_e( 'Color of the marker label text (the city/place name shown next to the dot).', 'wp-dotmap' ); ?>
						<?php
						printf(
							/* translators: %s: default hex value */
							esc_html__( 'Default: %s.', 'wp-dotmap' ),
							'<code>#1f2937</code>'
						);
						?>
					</p>
				</div>

				<!-- Label outline color -->
				<div class="wpdm-field">
					<label for="wpdm-label-outline"><?php esc_html_e( 'Label outline color', 'wp-dotmap' ); ?></label>
					<?php wpdm_render_color_picker( 'wpdm-label-outline', 'wpdm_customise[label_outline]', $s['label_outline'] ); ?>
					<p class="description">
						<?php esc_html_e( 'The thin halo around the label text — keeps the text readable on any background.', 'wp-dotmap' ); ?>
						<?php
						printf(
							/* translators: %s: default hex value */
							esc_html__( 'Default: %s (white).', 'wp-dotmap' ),
							'<code>#ffffff</code>'
						);
						?>
					</p>
				</div>

				<!-- Label text size -->
				<div class="wpdm-field">
					<label for="wpdm-label-size"><?php esc_html_e( 'Label text size', 'wp-dotmap' ); ?></label>
					<div class="wpdm-input-row">
						<input
							type="number"
							id="wpdm-label-size"
							name="wpdm_customise[label_size]"
							value="<?php echo esc_attr( $s['label_size'] ); ?>"
							min="1"
							max="200"
							step="0.5"
							class="wpdm-input-number"
						/>
						<select name="wpdm_customise[label_size_unit]" class="wpdm-input-unit">
							<option value="px"  <?php selected( $s['label_size_unit'], 'px' );  ?>>px</option>
							<option value="rem" <?php selected( $s['label_size_unit'], 'rem' ); ?>>rem</option>
						</select>
					</div>
					<p class="description">
						<?php esc_html_e( 'Font size of the marker labels. Pick the number first and then the unit. Default: 11 px.', 'wp-dotmap' ); ?>
					</p>
				</div>

				<!-- Marker radius -->
				<div class="wpdm-field">
					<label for="wpdm-marker-radius"><?php esc_html_e( 'Marker dot radius', 'wp-dotmap' ); ?></label>
					<div class="wpdm-input-row">
						<input
							type="number"
							id="wpdm-marker-radius"
							name="wpdm_customise[marker_radius]"
							value="<?php echo esc_attr( $s['marker_radius'] ); ?>"
							min="1"
							max="50"
							step="0.5"
							class="wpdm-input-number"
						/>
						<span class="wpdm-unit-label">px</span>
					</div>
					<p class="description">
						<?php esc_html_e( 'How big each marker dot appears on the map (its radius in pixels). The pulse animation and label position adjust automatically. Default: 5 px.', 'wp-dotmap' ); ?>
					</p>
				</div>
			</div>

			<p class="submit wpdm-customise-actions">
				<button type="submit" class="button button-primary"><?php esc_html_e( 'Save Changes', 'wp-dotmap' ); ?></button>
				<button
					type="submit"
					name="wpdm_reset"
					value="1"
					class="button button-secondary wpdm-btn-reset"
					onclick="return confirm('<?php echo esc_js( __( 'Reset all customisation to default values?', 'wp-dotmap' ) ); ?>');"
				>
					<?php esc_html_e( 'Reset to defaults', 'wp-dotmap' ); ?>
				</button>
			</p>
		</form>
	</div>
	<?php
}

/**
 * Render a paired color picker: native <input type="color"> + hex text input + swatch preview.
 * Both inputs share the same `name` for submission — only the text one is submitted; the
 * color one carries a `data-wpdm-picker` attribute so JS keeps them in sync visually.
 */
function wpdm_render_color_picker( $id, $name, $value ) {
	$value = $value ? $value : '#000000';
	?>
	<div class="wpdm-color-picker" data-wpdm-cp>
		<input
			type="color"
			value="<?php echo esc_attr( $value ); ?>"
			data-wpdm-picker
			aria-label="<?php esc_attr_e( 'Pick a color', 'wp-dotmap' ); ?>"
		/>
		<input
			type="text"
			id="<?php echo esc_attr( $id ); ?>"
			name="<?php echo esc_attr( $name ); ?>"
			value="<?php echo esc_attr( $value ); ?>"
			class="wpdm-input wpdm-input-color"
			placeholder="#000000"
			maxlength="7"
			autocomplete="off"
			data-wpdm-hex
		/>
		<span class="wpdm-color-swatch" data-wpdm-swatch style="background: <?php echo esc_attr( $value ); ?>;"></span>
	</div>
	<?php
}
