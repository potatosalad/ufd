/*
 * This script is bootstrapped by the bookmarklet gaget code. 
 */

javascript:(function() {
	
	var head = document.getElementsByTagName('head')[0];
	
	var versionToUse = "trunk"; 
	/*var versionToUse = "tags/0.6"; */
	
	var svnRoot = "http://ufd.googlecode.com/svn/" + versionToUse;
	var googRoot = "http://ajax.googleapis.com/ajax/libs";
	
	var newJQ = false;

	/* check if jQuery / UI are present */
	if(typeof jQuery === 'undefined') {
		newJQ = true;
		getScript(googRoot + "/jquery/1.4.2/jquery.min.js");
		getScript(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
	} else if( !(jQuery.ui) ) {
		getScript(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
	}
	
	/* get script: */
	getScript(svnRoot + "/src/jquery.ui.ufd.js", function() {
		if (!(typeof jQuery=='undefined' || typeof jQuery.ui=='undefined'|| typeof jQuery.ui.ufd=='undefined')) {
			if(newJQ) jQuery.noConflict(); 	/* don't inhabit $ if we are injecting jQuery 	 */
			jQuery("select:not([multiple]):visible").ufd();
		} else {
			alert("Sorry, UFD didn't manage to initalize properly.");
		}
	});
	
	/* get css: */
	var csses = [ svnRoot + "/css/ufd-base.css", svnRoot + "/css/plain/plain.css" ];
	for(cssPtr in csses){
		var css = document.createElement('LINK');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.media = 'screen';
		css.href = csses[cssPtr];
		
		head.appendChild(css);
	}	
	
	
	/* thanks http://www.learningjquery.com/2009/04/better-stronger-safer-jquerify-bookmarklet */
	function getScript(url, fn) {
		var script = document.createElement('script');
		script.src = url;
		script.type = 'text/javascript';
		if(fn) { /* Attach handlers for all browsers */
			script.onload = script.onreadystatechange = function() {
				if ((!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) fn();
			};
		}
		head.appendChild(script);
	}	
	
})();


