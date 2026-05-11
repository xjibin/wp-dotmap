<?php
/**
 * Plugin Name:       WP DotMap
 * Plugin URI:        https://github.com/xjibin/wp-dotmap/
 * Description:       Embed a clean and elegant dotted world map with custom location markers on any page or post using shortcode with markers using coordinates, label, color.
 * Version:           1.3.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            Jibin Jose
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-dotmap
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'WPDM_VERSION',              '1.3.0' );
define( 'WPDM_PATH',                 plugin_dir_path( __FILE__ ) );
define( 'WPDM_URL',                  plugin_dir_url( __FILE__ ) );
define( 'WPDM_OPTION_KEY',           'wpdm_markers' );
define( 'WPDM_CUSTOMISE_OPTION_KEY', 'wpdm_customise' );
define( 'WPDM_SHORTCODE',            'WPDMAP-1' );

require_once WPDM_PATH . 'includes/admin.php';
require_once WPDM_PATH . 'includes/customise.php';
require_once WPDM_PATH . 'includes/shortcode.php';
