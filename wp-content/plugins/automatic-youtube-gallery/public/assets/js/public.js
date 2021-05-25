(function( $ ) {
	'use strict';

	/**
	 * Vars
	 */
	window.ayg_youtube_api_ready = false;	

	/**
	 * jQuery Plugin: automatic_youtube_gallery
	 *
	 * @since 1.0.0
	 */
	$.fn.automatic_youtube_gallery = function( options ) {
		var defaults = {
            autoadvance: false,
			loop: false,
			scrollTop: false
		};

		var settings = $.extend( {}, defaults, options );		
		
		// Private vars
		var root = this,			
			player_id = this.find( '.ayg-player-iframe' ).attr( 'id' ),
			player,
			videos = {
				count: 0,
				current_index: 0
			},
			player_nav = true,
			player_prev = this.find( '.ayg-player-prev-btn' ),
			player_next = this.find( '.ayg-player-next-btn' ),			
			pagination = this.find( '.ayg-pagination' );

			
		if ( 0 === player_next.length ) {
			player_nav = false;
		}

		if ( 0 === pagination.length ) {
			pagination = false;
		}

		// Private methods
		var on_video_ended = function() {
			if ( settings.autoadvance && videos.count > 1 ) {
				var next_item = parseInt( videos.current_index ) + 1;
				if ( next_item >= videos.count ) {
					next_item = settings.loop ? 0 : -1;
				}

				if ( -1 !== next_item ) {
					this.find( '.ayg-thumbnail' ).eq( next_item ).trigger( 'click' );
				}
			} else if ( settings.loop ) {
				player.playVideo();
			}
		};

		var toggle_description_more_less = function() {
			var $more_elem = root.find( '.ayg-player-description-more' ).toggle();

			if ( $more_elem.is( ':visible' ) ) {
				this.html( ayg_public.i18n.show_less ).css( 'display', 'block' );
			} else {
				this.html( ayg_public.i18n.show_more ).css( 'display', 'inline' );
			}
		};

		var on_gallery_item_clicked = function() {
			// Make item active
			root.find( '.ayg-thumbnail' ).removeClass( 'ayg-active' );
			this.addClass( 'ayg-active' );

			// Reset active item index
			videos.current_index = this.attr( 'data-index' );

			// Replace title
			var title = this.attr( 'data-title' );
			root.find( '.ayg-player-title' ).html( title );

			// Replace player
			var video_id = this.attr( 'data-id' );
			player.loadVideoById( video_id );

			// Replace description
			var description = this.find( '.ayg-thumbnail-description' ).html();
			root.find( '.ayg-player-description' ).html( description );

			// Resolve player nav
			if ( false !== player_nav ) {
				resolve_player_nav();
			}			

			// Scroll to top
			if ( settings.scrollTop ) {
				$( 'html, body' ).animate({
					scrollTop: root.offset().top - 10
				}, 500);
			}
		};		

		var video_prev = function() {
			var prev_item = Math.max( parseInt( videos.current_index ) - 1, 0 );
			root.find( '.ayg-thumbnail' ).eq( prev_item ).trigger( 'click' );
		};

		var video_next = function() {
			var next_item = Math.min( parseInt( videos.current_index ) + 1, videos.count - 1 );
			root.find( '.ayg-thumbnail' ).eq( next_item ).trigger( 'click' );
		};

		var resolve_player_nav = function() {
			var current_index = parseInt( videos.current_index );

			// Prev Button
			if ( 0 == current_index ) {
				player_prev.hide();
			} else {
				player_prev.show();
			}

			// Next Button
			if ( videos.count > ( current_index + 1 ) ) {
				player_next.show();
			} else {
				player_next.hide();
			}
		};

		var pagination_ajax = function( type ) {
			var $this = this;

			pagination.addClass( 'ayg-loading' );			

			var params = JSON.parse( pagination.attr( 'data-params' ) );
			params.action = 'ayg_load_more_videos';
			params.pageToken = ( 'prev' == type ) ? params.prev_page_token : params.next_page_token;
			params.nonce = pagination.data( 'nonce' );

			$.post( ayg_public.ajax_url, params, function( response ) {
				if ( response.success ) {
					if ( 'prev' == type ) {
						pagination_prev.apply( $this, [response] );
					} else if ( 'next' == type ) {
						pagination_next.apply( $this, [response] );
					} else if ( 'more' == type ) {
						pagination_more.apply( $this, [response] );
					}

					update( type );
				} else {
					pagination.removeClass( 'ayg-loading' );
				}
			});
		}

		var pagination_prev = function( response ) {
			var params = JSON.parse( pagination.attr( 'data-params' ) );					
			params.paged = Math.max( parseInt( params.paged ) - 1, 1 );

			if ( response.data.next_page_token ) {
				params.next_page_token = response.data.next_page_token;
			} else {
				params.next_page_token = '';
			}

			if ( response.data.prev_page_token ) {
				params.prev_page_token = response.data.prev_page_token;
			} else {
				params.prev_page_token = '';
			}

			if ( 1 == params.paged ) {
				params.prev_page_token = '';
				this.hide();
			}

			pagination.find( '.ayg-pagination-next-btn' ).show();

			pagination.find( '.ayg-pagination-current-page-number' )
				.html( params.paged );
			
			pagination.attr( 'data-params', JSON.stringify( params ) )
				.removeClass( 'ayg-loading' );

			root.find( '.ayg-gallery' ).html( response.data.html );
		};

		var pagination_next = function( response ) {
			var params = JSON.parse( pagination.attr( 'data-params' ) );

			var num_pages = parseInt( params.num_pages );
			params.paged = Math.min( parseInt( params.paged ) + 1, num_pages );					

			if ( response.data.next_page_token ) {
				params.next_page_token = response.data.next_page_token;
			} else {
				params.next_page_token = '';
			}

			if ( response.data.prev_page_token ) {
				params.prev_page_token = response.data.prev_page_token;
			} else {
				params.prev_page_token = '';
			}

			if ( params.paged == num_pages ) {
				params.next_page_token = '';
				this.hide();
			}

			pagination.find( '.ayg-pagination-prev-btn' ).show();

			pagination.find( '.ayg-pagination-current-page-number' )
				.html( params.paged );
			
			pagination.attr( 'data-params', JSON.stringify( params ) )
				.removeClass( 'ayg-loading' );

			root.find( '.ayg-gallery' ).html( response.data.html );
		};		

		var pagination_more = function( response ) {
			var params = JSON.parse( pagination.attr( 'data-params' ) );			
					
			var num_pages = parseInt( params.num_pages );
			params.paged = Math.min( parseInt( params.paged ) + 1, num_pages );					

			if ( response.data.next_page_token ) {
				params.next_page_token = response.data.next_page_token;
			} else {
				params.next_page_token = '';
			}

			if ( params.paged == num_pages ) {
				params.next_page_token = '';
				this.hide();
			}
			
			pagination.attr( 'data-params', JSON.stringify( params ) )
				.removeClass( 'ayg-loading' );

			root.find( '.ayg-gallery' ).append( response.data.html );
		};		

		var update = function( type ) {
			var index = -1;

			root.find( '.ayg-thumbnail' ).each(function() {
				$( this ).attr( 'data-index', ++index );
			});

			videos.count = index + 1;

			if ( 'prev' == type || 'next' == type ) {
				videos.current_index = -1;
			}

			// Resolve player nav
			if ( false !== player_nav ) {
				resolve_player_nav();
			}
		};

		// Public methods
        this.initialize = function() {			
			update( 'init' );

			// Initialize Player
			player = new YT.Player( player_id, {
				events: {
					'onStateChange': function( event ) {
						if ( 0 == event.data ) {
							on_video_ended.apply( root );
					  	}					 
				  	}
				}
			});

			// Toggle more/less content in the player description
			this.on( 'click', '.ayg-player-description-more-less-btn', function( event ) {
				event.preventDefault();
				toggle_description_more_less.apply( $( this ) );
			});

			// On gallery item clicked
			this.on( 'click', '.ayg-thumbnail', function( event ) {
				event.preventDefault();
				on_gallery_item_clicked.apply( $( this ) );
			});

			// Player nav
			if ( false !== player_nav ) {				
				// On "Prev" button clicked
				player_prev.on( 'click', function( event ) {
					event.preventDefault();
					video_prev();
				});

				// On "Next" button clicked
				player_next.on( 'click', function( event ) {
					event.preventDefault();
					video_next();
				});
			}

			// Pagination
			if ( false !== pagination ) {
				// On "Prev" button clicked
				this.find( '.ayg-pagination-prev-btn' ).on( 'click', function( event ) {
					event.preventDefault();
					pagination_ajax.apply( $( this ), ['prev'] );
				});

				// On "Next" button clicked
				this.find( '.ayg-pagination-next-btn' ).on( 'click', function( event ) {
					event.preventDefault();
					pagination_ajax.apply( $( this ), ['next'] );
				});				

				// On "More Videos" button clicked
				this.find( '.ayg-pagination-more-btn' ).on( 'click', function( event ) {
					event.preventDefault();
					pagination_ajax.apply( $( this ), ['more'] );
				});
			};
			
			this.stopVideo = function() {
				player.stopVideo();				
			}

			// ...
			return this;			
		};		
		
		// ...
		return this.initialize();		
	}
	
	/**
	 * Init Automatic YouTube Gallery. Called when YouTube API is ready.
	 *
	 * @since 1.0.0
	 */
	function ayg_init() {
		if ( true == window.ayg_youtube_api_ready ) {
			return;
		}

		window.ayg_youtube_api_ready = true;
		
		// Classic theme
		$( '.ayg-theme-classic' ).each(function() {
			var params = JSON.parse( $( this ).attr( 'data-params' ) );

			$( this ).automatic_youtube_gallery({
				autoadvance: ( 1 == parseInt( params.autoadvance ) ) ? true : false,
				loop: ( 1 == parseInt( params.loop ) ) ? true : false,
				scrollTop: true
			});
		});		
	}

	/**
	 * Called when the page has loaded.
	 *
	 * @since 1.0.0
	 */
	$(function() {
		// Init Automatic YouTube Gallery
		if ( 'undefined' === typeof window['YT'] ) {
			var tag = document.createElement( 'script' );
			tag.src = "https://www.youtube.com/iframe_api";
			var firstScriptTag = document.getElementsByTagName( 'script' )[0];
			firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
		
		}
		
		if ( 'undefined' == typeof window.onYouTubeIframeAPIReady ) {
			window.onYouTubeIframeAPIReady = function() {
				ayg_init();
			};
		} else if ( 'undefined' !== typeof window.YT ) {
			ayg_init();
		}
		
		var interval = setInterval(
			function() {
				if ( 'undefined' !== typeof window.YT && window.YT.loaded )	{
					clearInterval( interval );
					ayg_init();					
				}
			}, 
			10
		);
	});

})( jQuery );
