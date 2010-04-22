/*
 * This is the bootstrap JS that injects the loader script into the target page and its child iframes.
 * 
 * iE has a limit of about 500 bytes for bookmarklets, hence the bootstrapping.  Also, it allows 
 * upgrades to the injection code without changing the bookmarklet.
 * 
 * this code has been compresed with http://jscompress.com/ and added to bookmarkletGaget.js
 * 
 */

javascript: (function() {
    function ifr(w){
        try {
            var d = w.document,
                s = d.createElement('SCRIPT'),
                i = 0;
            s.type = 'text/javascript';
            s.src = 'http://ufd.googlecode.com/svn/tags/latest-stable-bookmarklet';
            d.getElementsByTagName('head')[0].appendChild(s);
            for(;i<w.frames.length;i++){
                ifr(w.frames[i]);
            }
        } catch(e) {}
    }
    ifr(window);
})();