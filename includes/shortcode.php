<?php
/**
 * Shortcode for rendering the dotted world map on a page or post.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_shortcode( WPDM_SHORTCODE, 'wpdm_render_shortcode' );
add_shortcode( strtolower( WPDM_SHORTCODE ), 'wpdm_render_shortcode' );

function wpdm_render_shortcode( $atts ) {
	wpdm_enqueue_frontend_assets();

	$markers = get_option( WPDM_OPTION_KEY, array() );
	if ( ! is_array( $markers ) ) {
		$markers = array();
	}

	$customise = wpdm_get_customise_settings();

	static $instance = 0;
	$instance++;
	$container_id = 'wpdm-map-' . $instance;

	$payload = array(
		'markers'   => $markers,
		'dataUrl'   => WPDM_URL . 'assets/data/land-110m.json',
		'customise' => $customise,
	);
	wp_add_inline_script(
		'wpdm-map',
		'window.WPDMData = window.WPDMData || {}; window.WPDMData[' . wp_json_encode( $container_id ) . '] = ' . wp_json_encode( $payload ) . ';',
		'before'
	);

	// Inline style on the container handles the background when "color" mode is on.
	$bg_style = '';
	if ( 'color' === $customise['bg_mode'] ) {
		$bg_style = 'background: ' . esc_attr( $customise['bg_color'] ) . ';';
	}

	ob_start();
	?>
	<div class="wpdm-container" id="<?php echo esc_attr( $container_id ); ?>" style="<?php echo $bg_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>">
		<div class="wpdm-loading"><?php esc_html_e( 'loading map…', 'wp-dotmap' ); ?></div>
		<svg class="wpdm-svg"
		     viewBox="0 0 1400 700"
		     preserveAspectRatio="xMidYMid meet"
		     xmlns="http://www.w3.org/2000/svg"
		     aria-label="<?php esc_attr_e( 'World map with location markers', 'wp-dotmap' ); ?>"
		     role="img"></svg>
	</div>
	<?php
	return ob_get_clean();
}

function wpdm_enqueue_frontend_assets() {
	wp_enqueue_style(
		'wpdm-map',
		WPDM_URL . 'assets/css/wp-dotmap.css',
		array(),
		WPDM_VERSION
	);

	wp_enqueue_script(
		'wpdm-d3',
		'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js',
		array(),
		'7.8.5',
		true
	);
	wp_enqueue_script(
		'wpdm-topojson',
		'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js',
		array(),
		'3.0.2',
		true
	);

	wp_enqueue_script(
		'wpdm-map',
		WPDM_URL . 'assets/js/wp-dotmap.js',
		array( 'wpdm-d3', 'wpdm-topojson' ),
		WPDM_VERSION,
		true
	);
}
