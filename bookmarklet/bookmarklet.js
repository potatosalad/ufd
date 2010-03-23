/*
 * This script is bootstrapped by the bookmarklet gaget code. 
 */

(function() {
	
	var head = document.getElementsByTagName('head')[0];
	
	var versionToUse = "trunk"; 
	/*var versionToUse = "tags/0.6"; */
	
	var svnRoot = "http://ufd.googlecode.com/svn/" + versionToUse;
	var googRoot = "http://ajax.googleapis.com/ajax/libs";
	
	getCSS(svnRoot + "/css/ufd-base.css");
	getCSS(svnRoot + "/css/plain/plain.css");

	var newJQ = false;
	var itemCount = 1;

	/* inject jQuery / UI if not present */
	if(typeof jQuery === 'undefined') {
		newJQ = true;
		itemCount = 3;
		getScript(googRoot + "/jquery/1.4.2/jquery.min.js");
		getScript(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
		
	} else if( !(jQuery.ui) ) {
		itemCount = 2;
		getScript(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
		
	}
	
	getScript(svnRoot + "/src/jquery.ui.ufd.js");
	
	/* helpers */
	
	function getCSS(url) {
		var css = document.createElement('LINK');
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
		if ((!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') && !this.visited) {
			this.visited == true;
			if(--itemCount) return; /* haven't loaded all yet. */
				
			if (!(typeof jQuery=='undefined' || typeof jQuery.ui=='undefined'|| typeof jQuery.ui.ufd=='undefined')) {
				if(newJQ) jQuery.noConflict(); 	/* don't inhabit $ if we are injecting jQuery 	 */
				jQuery("select:not([multiple]):visible").ufd();
			} else {
				alert("Sorry, UFD didn't manage to initalize properly.");
			}
		}
	};
	
})();


