/*
 * This script is bootstrapped by the bookmarklet gaget code. 
 */

javascript:(function() {
	
	var head = document.getElementsByTagName('head')[0];
	
	var pollRetries = 40;
	var pollWait = 500; 
	
	var versionToUse = "trunk"; 
	/*var versionToUse = "tags/0.6"; */
	
	var svnRoot = "http://ufd.googlecode.com/svn/" + versionToUse;
	var googRoot = "http://ajax.googleapis.com/ajax/libs";
	
	var cssLoaded = false;
	getCSS(svnRoot + "/css/ufd-base.css");
	getCSS(svnRoot + "/css/plain/plain.css");

	var itemCount = 3;
	getScript(googRoot + "/jquery/1.4.2/jquery.min.js");
	getScript(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
	getScript(svnRoot + "/src/jquery.ui.ufd.js");
	
	/* helpers */
	
	function getCSS(url) {
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.media = 'screen';
		css.href = url;
		head.appendChild(css);
	}	
	
	function getScript(url) {
		var script = document.createElement('script');
		script.src = url;
		script.type = 'text/javascript';
		script.onload = script.onreadystatechange = load;
		head.appendChild(script);
	}	
	
	function load() {
		if (!this.visited && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {
			this.visited = true;
			if(--itemCount) return; /* haven't loaded all yet. */
			
			setTimeout(poll, (this.readyState  == 'loaded') ? 1000 : 1); /*  delay if loaded but not complete */
		}
	}
	
	function poll() {
		if(--pollRetries) {
			alert("Sorry, UFD didn't manage to initalize properly.");
			return;
		} 
		
		if (cssLoaded == true && 
				typeof jQuery != 'undefined' && 
				typeof jQuery.ui != 'undefined' && 
				typeof jQuery.ui.ufd != 'undefined' ) {
			/* don't re-wrap existing ufds! */
			jQuery(":not(span.ufd) > select:not([multiple])").ufd({addEmphasis: true});
			jQuery.noConflict(true); 	/* the injected jquery, ui and ufd no longer are available via window.jQuery or window.$ */
			
			return;
		} 
		
		if(!cssLoaded) { /* check if both css has loaded */
			var base = false, plain = false;
			var ss = document.styleSheets;
			for (var i = 0; i < ss.length; i++) {
			    var url = ss[i].href || "";
			    base = base || (url.search("ufd-base.css") > 0);
			    plain = plain || (url.search("plain.css") > 0);
			}
			cssLoaded = (base && plain);
		} 
		
		setTimeout(poll, pollWait);
	}
})();


