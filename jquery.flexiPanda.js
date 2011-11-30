/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
 onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
 browser: true */

/*global jQuery: true window: true document: true */

/**
 * A jQuery plugin template.
 * This extends @hantu's basic template.
 *
 * Author: Jesse Beach
 * Author URI: http://qemist.us
 * Author Twitter: @jessebeach
 * Author Github: https://github.com/jessebeach
 *
 * Reference
 *  @see http://docs.jquery.com/Plugins/Metadata/metadata
 */

/*jslint bitwise: true, eqeqeq: true, immed: true, newcap: true, nomen: false,
   onevar: false, plusplus: false, regexp: true, undef: true, white: true, indent: 2
   browser: true */

/*global jQuery: true debug: true window: true */

(function ($) {
    var methods = {
      init : function (options) {
        // build main options before element iteration
        var opts = $.extend({}, $.fn.flexiPanda.defaults, options);
        // Turn on development mode
        if (opts.dev) {
          debug();
        }
        // iterate over matched elements
        return this.each(function () {
          var $this = $(this);
          // Build element specific options. Uses the Metadata plugin if available
          // @see http://docs.jquery.com/Plugins/Metadata/metadata
          var o = $.meta ? $.extend({}, opts, $this.data()) : opts;
          // implementations
          var data = $this.data('flexiPanda');
          // If the plugin hasn't been initialized yet
          if (!data) {
            /* Set up the data. */
            $(this).data('flexiPanda', {
              target : $this
            }); 
          }
          // Set up the hover help.
          $li = $this.find('li')
          .bind('mouseenter', over)
          .bind('mouseout', out);
          
          // Create event bindings
          $(window).bind('resize.flexiPanda', methods.refresh);
        });
      },
      destroy : function () {
        return this.each(function () {
          $(window).unbind('.flexiPanda');
        });
      },
      show : function () {},
      hide : function () {},
      refresh : function () {},
      update : function () {}
    };

    // replace 'flexiPanda' with the name of your plugin
    $.fn.flexiPanda = function (method) {
      // Method calling logic
      if (methods[method]) {
        return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
      } else if (typeof method === 'object' || ! method) {
        return methods.init.apply(this, arguments);
      } else {
        $.error('Method ' +  method + ' does not exist on jQuery.flexiPanda');
      }
    };
      
    // plugin defaults
    $.fn.flexiPanda.defaults = {
      dev: false
    };
  
    // public functions definition
    $.fn.flexiPanda.functionName = function (foo) {
      return this;
    };
    
    // private functions definition
    function over(event) {
      $('.flexipanda.debug')
      .css({'background-color': 'red'});
    }
    function out(event) {
      $('.flexipanda.debug')
      .css({'background-color': 'yellow'});
    }
  
    // private function for debugging
    function debug() {
      var $this = $(this);
      if (window.console && window.console.log) {
        window.console.log('selection count: ' + $this.size());
      }
      // Create a debug console.      
      $('<div>', {
        html: 'hi'  
      })
      .addClass('flexipanda debug')
      .appendTo('body');
    }
  }
  // Pass jQuery as the param to the preceding anonymous function
  (jQuery)
);