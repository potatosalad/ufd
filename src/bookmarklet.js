javascript: (function() {
	
	var head = document.getElementsByTagName('head')[0];
	var svnRoot = "http://ufd.googlecode.com/svn/trunk";
	var googRoot = "http://ajax.googleapis.com/ajax/libs";
	var tryCounter=20;
	var delay=250;
	
	var scripts = [svnRoot + "/src/jquery.ui.ufd.js"];
	var csses = [
		svnRoot + "/css/ufd-base.css",
		svnRoot + "/css/plain/plain.css"
	];

	/* check if jQuery / UI are present */
	var newJQ = false;
	if(typeof jQuery == 'undefined') {
		newJQ = true;

		scripts.unshift(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
		scripts.unshift(googRoot + "/jquery/1.4.2/jquery.min.js");

	} else if(!(jQuery.ui)){
		scripts.unshift(googRoot + "/jqueryui/1.7.2/jquery-ui.min.js");
	}
	
	/* get script: */
	for(scriptPtr in scripts){
		var script = document.createElement('SCRIPT');
		script.type = 'text/javascript';
		script.src = scripts[scriptPtr] + "?noCache=" + (Math.random());
		head.appendChild(script);
	}
	
	/* get css: */
	for(cssPtr in csses){
		var css = document.createElement('LINK');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.media = 'screen';
		css.href =  csses[cssPtr];
		
		head.appendChild(css);
	}	
	
	/* thanks for inspiration: http://www.learningjquery.com/2009/04/better-stronger-safer-jquerify-bookmarklet */
	var tryjQuery=function() {
		if (typeof jQuery=='undefined' || typeof jQuery.ui=='undefined'|| typeof jQuery.ui.ufd=='undefined') {
			if (tryCounter--) {
				setTimeout(function() { tryjQuery(); }, delay);
			} else {
				alert("failed to intialize UFD bookmarklet sorry.");
			}
		} else { /* loaded */
			if(newJQ) jQuery.noConflict(); 	/* don't inhabit $ if we are injecting jQuery 	 */
			jQuery("select:not([multiple])").ufd();
		}
		
	};

	tryjQuery();
	
	
})();



