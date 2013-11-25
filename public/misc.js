/**
 * HSV to RGB color conversion
 *
 * H runs from 0 to 360 degrees
 * S and V run from 0 to 100
 * 
 * Ported from the excellent java algorithm by Eugene Vishnevsky at:
 * http://www.cs.rit.edu/~ncs/color/t_convert.html
 */
function hsvToRgb(h, s, v) {
	var r, g, b;
	var i;
	var f, p, q, t;
	
	// Make sure our arguments stay in-range
	h = Math.max(0, Math.min(360, h));
	s = Math.max(0, Math.min(100, s));
	v = Math.max(0, Math.min(100, v));
	
	// We accept saturation and value arguments from 0 to 100 because that's
	// how Photoshop represents those values. Internally, however, the
	// saturation and value are calculated from a range of 0 to 1. We make
	// That conversion here.
	s /= 100;
	v /= 100;
	
	if(s == 0) {
		// Achromatic (grey)
		r = g = b = v;
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
	
	h /= 60; // sector 0 to 5
	i = Math.floor(h);
	f = h - i; // factorial part of h
	p = v * (1 - s);
	q = v * (1 - s * f);
	t = v * (1 - s * (1 - f));

	switch(i) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
			
		case 1:
			r = q;
			g = v;
			b = p;
			break;
			
		case 2:
			r = p;
			g = v;
			b = t;
			break;
			
		case 3:
			r = p;
			g = q;
			b = v;
			break;
			
		case 4:
			r = t;
			g = p;
			b = v;
			break;
			
		default: // case 5:
			r = v;
			g = p;
			b = q;
	}
	
	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Check for iPad-ness

function is_iPad() {
    return navigator.userAgent.match(/iPad/i);
}

if(!String.prototype.trim) {
    String.prototype.trim=function(){return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');};
}


/*
 MIT License {@link http://creativecommons.org/licenses/MIT/}
*/
(function(m,n){var e,k;e=m.jQuery;k=e.ScrollTo=e.ScrollTo||{config:{duration:400,easing:"swing",callback:n,durationMode:"each",offsetTop:0,offsetLeft:0},configure:function(f){e.extend(k.config,f||{});return this},scroll:function(f,c){var a,b,d,g,i,h,l,j;a=f.pop();b=a.$container;d=b.get(0);g=a.$target;i=e("<span/>").css({position:"absolute",top:"0px",left:"0px"});h=b.css("position");b.css("position","relative");i.appendTo(b);a=i.offset().top;a=g.offset().top-a-parseInt(c.offsetTop,10);j=i.offset().left;
j=g.offset().left-j-parseInt(c.offsetLeft,10);g=d.scrollTop;d=d.scrollLeft;i.remove();b.css("position",h);i=function(a){0===f.length?"function"===typeof c.callback&&c.callback.apply(this,[a]):k.scroll(f,c);return!0};c.onlyIfOutside&&(h=g+b.height(),l=d+b.width(),g<a&&a<h&&(a=g),d<j&&j<l&&(j=d));h={};a!==g&&(h.scrollTop=a+"px");j!==d&&(h.scrollLeft=j+"px");h.scrollTop||h.scrollLeft?b.animate(h,c.duration,c.easing,i):i();return!0},fn:function(f){var c,a,b;c=[];var d=e(this);if(0===d.length)return this;
f=e.extend({},k.config,f);a=d.parent();for(b=a.get(0);1===a.length&&b!==document.body&&b!==document;){var g;g="visible"!==a.css("overflow-y")&&b.scrollHeight!==b.clientHeight;b="visible"!==a.css("overflow-x")&&b.scrollWidth!==b.clientWidth;if(g||b)c.push({$container:a,$target:d}),d=a;a=a.parent();b=a.get(0)}c.push({$container:e(e.browser.msie||e.browser.mozilla?"html":"body"),$target:d});"all"===f.durationMode&&(f.duration/=c.length);k.scroll(c,f);return this}};e.fn.ScrollTo=e.ScrollTo.fn})(window);