<?php
/**
 * Removes plugin data when the plugin is deleted from WordPress.
 */
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'wpdm_markers' );
