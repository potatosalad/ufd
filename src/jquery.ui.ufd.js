/*
	ufd @VERSION : Unobtrusive Fast-filter Drop-down jQuery plugin.

	Authors:
		thetoolman@gmail.com 
		Kadalashvili.Vladimir@gmail.com

	Version:  @VERSION

	Website: http://code.google.com/p/ufd/
 */

(function($) {

$.widget("ui.ufd", {

		// options: provided by framework
		// element: provided by framework

	_init: function() {
		if (this.element[0].tagName.toLowerCase() != "select") {
			this.destroy();
			return false;
		}

		// console.time("init");

		this.selectbox = this.element;
		this.logNode = $(this.options.logSelector);
		this.overflowCSS = this.options.allowLR ? "overflow" : "overflowY";
		var selectName = this.selectbox.attr("name");
		var suffixName = selectName + this.options.suffix;
		var inputName = this.options.submitFreeText ? selectName : suffixName;

		if(this.options.submitFreeText) this.selectbox.attr("name", suffixName);

		this.wrapper = $(
			'<span class="ufd invisible ' + this.options.skin + '"  >' +
				'<input type="text" autocomplete="off" value="" name="' + inputName + '"/>'+
				'<button tabindex="-1" type="button"><div class="icon"/></button>'+
				//   <select .../> goes here
			'</span>'
		);
		this.dropdown = $(
			'<div class="' + this.options.skin + '">' +
				'<div class="list-wrapper invisible">' +
					'<div class="list-scroll">' +
					//  <ul/> goes here
					'</div>' +
				'</div>' +
			'</div>'
		);

		this.selectbox.after(this.wrapper);
		this.getDropdownContainer().append(this.dropdown);

		this.input = this.wrapper.find("input");
		this.button = this.wrapper.find("button");
		this.listWrapper = this.dropdown.find(".list-wrapper");
		this.listScroll = this.dropdown.find(".list-scroll");

		if($.fn.bgiframe) this.listWrapper.bgiframe(); //ie6 !
		this.listMaxHeight = this.getListMaxHeight(); 

		this._populateFromMaster();
		this._initEvents();

		// console.timeEnd("init");
	},


	_initEvents: function() { //initialize all event listeners
		var self = this;
		var keyCodes = $.ui.keyCode; 
		var key, isKeyDown, isKeyPress,isKeyUp;
		//this.log("initEvents");

		self.input.bind("keydown keypress keyup", function(event) {
			// Key handling is tricky; here is great key guide: http://unixpapa.com/js/key.html
			isKeyDown = (event.type == "keydown");
			isKeyPress = (event.type == "keypress");
			isKeyUp = (event.type == "keyup");
			key = null;

			if (undefined === event.which) {
				key = event.keyCode; 
			} else if (!isKeyPress && event.which != 0) {
				key = event.keyCode;
			} else { 
				return; //special key
			}

			// only process: keyups excluding tab/return; and only tab/return keydown 
			// Only some browsers fire keyUp on tab in, ignore if it happens 
			if(!isKeyUp == ((key != keyCodes.TAB) && (key != keyCodes.ENTER)) ) return;

			//self.log("Key: " + key + " event: " + event.type);

			self.lastKey = key;

			switch (key) {
			case keyCodes.SHIFT:
			case keyCodes.CONTROL:
				//don't refilter 
				break;

			case keyCodes.DOWN:
				self.selectNext(false);
				break;
			case keyCodes.PAGE_DOWN:
				self.selectNext(true);
				break;
			case keyCodes.END:
				self.selectLast();
				break;

			case keyCodes.UP:
				self.selectPrev(false);
				break;
			case keyCodes.PAGE_UP:
				self.selectPrev(true);
				break;
			case keyCodes.HOME:
				self.selectFirst();
				break;

			case keyCodes.ENTER:
				self.hideList();
				self.tryToSetMaster();
				self.inputFocus();
				self.stopEvent(event);
				break;
			case keyCodes.TAB: //tabout only
			self.realLooseFocusEvent();
			break;
			case keyCodes.ESCAPE:
				self.hideList();
				self.revertSelected();
				break;

			default:
				self.showList();
			self.filter(0, true); //do delay, as more keypresses may cancel
			break;
			}
		});

		this.input.bind("click focus", function(e) {
			if(self.isDisabled){
				self.stopEvent(e);
				return;
			}
			// self.log("input focus");
			if(!self.internalFocus){
				self.realFocusEvent();
			}
		});

		this.button.bind("mouseover", function(e) { self.button.addClass("hover"); }); 
		this.button.bind("mouseout",  function(e) { self.button.removeClass("hover"); }); 
		this.button.bind("mousedown", function(e) { self.button.addClass("mouseDown"); }); 
		this.button.bind("mouseup",   function(e) { self.button.removeClass("mouseDown"); }); 
		this.button.bind("click", function(e) {
			if(self.isDisabled){
				self.stopEvent(e);
				return;
			}
			// self.log("button click: " + e.target);
			if (self.listVisible()) { 
				self.hideList();
				self.inputFocus();

			} else {	
				self.filter(1); //show all even tho one is selected
				self.inputFocus();
				self.showList();
				self.scrollTo();	    	
			}          
		}); 

		this.listWrapper.bind("mouseover mouseout click", function(e) {
			// this.log(e.type + " : " + e.target);
			if ( "LI" == e.target.nodeName.toUpperCase() ) {
				if(self.setActiveTimeout) { //cancel pending selectLI -> active
					clearTimeout(self.setActiveTimeout);
					self.setActiveTimeout == null;
				}
				if ("mouseout" == e.type) {
					$(e.target).removeClass("active");
					self.setActiveTimeout = setTimeout(function() { 
						$(self.selectedLi).addClass("active"); 
					}, self.options.delayYield);

				} else if ("mouseover" == e.type) { 
					if (self.selectedLi != e.target) { 
						$(self.selectedLi).removeClass("active");
					}
					$(e.target).addClass("active");

				} else { //click
					self.stopEvent(e); //prevent bubbling to document onclick binding etc
					var value = $.trim($(e.target).text());
					self.input.val(value);
					self.setActive(e.target);
					if(self.tryToSetMaster() ) {
						self.hideList();
						self.filter(1);
					}
					self.inputFocus();
				}
			}

			return true;
		});

		this.selectbox.bind("change", function(e) {
			if(self.isUpdatingMaster){
				// self.log("master changed but we did the update");
				self.isUpdatingMaster = false;
				return true;
			}
			self.log("master changed; reverting");
			self.revertSelected();
		});

		// click anywhere else
		$(document).bind("click", function(e) {
			if ((self.button.get(0) == e.target) || (self.input.get(0) == e.target)) return;
			// self.log("unfocus document click : " + e.target);
			if (self.internalFocus) self.realLooseFocusEvent();
		});

	},

	// pseudo events

	realFocusEvent: function() {
		// this.log("real input focus");
		this.internalFocus = true;
		this._triggerEventOnMaster("focus");
		this.filter(1); //show all even tho one is selected
		this.inputFocus();
		this.showList();
		this.scrollTo();	    	
	},

	realLooseFocusEvent: function() {
		// this.log("real loose focus (blur)");
		this.internalFocus = false;
		this.hideList();  
		this.tryToSetMaster();
		this._triggerEventOnMaster("blur");
	},

	_triggerEventOnMaster: function(eventName) {
		if( document.createEvent ) { // good browsers
			var evObj = document.createEvent('HTMLEvents');
			evObj.initEvent( eventName, true, true );
			this.selectbox.get(0).dispatchEvent(evObj);

		} else if( document.createEventObject ) { // iE
			this.selectbox.get(0).fireEvent("on" + eventName);
		} 

	},

	// methods

	inputFocus: function() {
		// this.log("inputFocus: restore input component focus");
		this.input.focus();

		if (this.getCurrentTextValue().length) {
			this.selectAll();    	
		}			
	},

	inputBlur: function() {
		// this.log("inputBlur: loose input component focus");
		this.input.blur();
	},	 

	showList: function() {
		// this.log("showlist");
		if(this.listVisible()) return;
		this.listWrapper.removeClass("invisible");
		this.setListDisplay();
	},

	hideList: function() {
		// this.log("hide list");
		if(!this.listVisible()) return;
		this.listWrapper.addClass("invisible");
		this.listItems.removeClass("invisible");   
	},

	/*
	 * adds / removes items to / from the dropdown list depending on combo's current value
	 * 
	 * if doDelay, will delay execution to allow re-entry to cancel.
	 */
	filter: function(showAllLength, doDelay) {
		// this.log("filter: " + showAllLength);
		var self = this;

		//cancel any pending
		if(this.updateOnTimeout) clearTimeout(this.updateOnTimeout);
		if(this.filterOnTimeout) clearTimeout(this.filterOnTimeout);
		this.updateOnTimeout = null;
		this.filterOnTimeout = null;

		var search = function() {
			//this.log("filter search");
			var mm = self.trie.findPrefixMatchesAndMisses(self.getCurrentTextValue()); // search!
			self.trie.matches = mm.matches;
			self.trie.misses = mm.misses;

			//yield then screen update
			self.updateOnTimeout = setTimeout(function(){screenUpdate();}, self.options.delayYield); 

		};

		var screenUpdate = function() {
			//this.log("screen update");
			//self.log(self.getCurrentTextValue() + ": matchesLength: " + 
			//		self.trie.matches.length + " missesLength: " + self.trie.misses.length );

			var active = self.getActive();

			self.setAttr(self.trie.matches, $.ui.ufd.classAttr,"" );
			if(self.trie.matches.length <= showAllLength) {
				// self.log("showing all");
				self.setAttr(self.trie.misses, $.ui.ufd.classAttr,"" );
			} else {
				// self.log("hiding");
				self.setAttr(self.trie.misses, $.ui.ufd.classAttr,"invisible" );
			}

			var oldActiveVisible = (active.length && !active.hasClass("invisible"));
			if(oldActiveVisible) {
				self.setActive(active.get(0));

			} else if(self.trie.matches.length) {
				self.setActive(self.trie.matches[0].li);

			} else if(!self.options.submitFreeText){
				self.selectFirst();
			}

			self.setListDisplay();
		};

		if(doDelay) {
			//setup new delay
			this.filterOnTimeout = setTimeout( function(){ search(); }, this.options.delayFilter );
		} else {
			search();
		}
	},

	// attempt update; clear input or set default if fail:
	tryToSetMaster: function() {
		// this.log("t.s.m");
		if(this.selectedLi == null && !this.options.submitFreeText) {
			this.log("not allowed freetext, revert:");
			this.revertSelected();
			return false; // no match
		}

		var active = this.getActive();
		if (!active.length) {
			this.log("No selected item.");
			return false; 
		}

		var optionIndex = active.attr("name"); //sBox pointer index 
		if (optionIndex == null || optionIndex == "" || optionIndex < 0) {
			this.log("No selected item.");
			return false; 
		} 

		var sBox = this.selectbox.get(0);
		var curIndex = sBox.selectedIndex;
		var option = sBox.options[optionIndex];
		var optionValue = option.value || option.text; //iE6 doesn't default .value, but FF seems to;

		//this.log(optionIndex + " : " + optionValue);
		
		if(optionIndex == curIndex){
			//this.log("already set correctly." + active.text()  + " : " + option.text);
			return true;
		}
		//this.log(" update: " + this.selectbox.val() + " : "+ optionValue);

		this.isUpdatingMaster = true;
		sBox.selectedIndex = optionIndex;
		
		
		if(this.selectbox.val() != optionValue){ //set failed
			this.log("set failed!");
			sBox.selectedIndex = curIndex;
			this.selectbox.val(curIndex); 
			// this.log("set new master selected failed.");
			if(!this.options.submitFreeText) {
				// this.log("not allowed freetext, revert:");
				this.revertSelected();
			}
			return false;
		}
		this.input.val(option.text);
		// this.log("master selectbox set to: " + option.text);
		this._triggerEventOnMaster("change");
		return true;
	},

	_populateFromMaster: function() {
		// this.log("populate from master select");
		// console.time("prep");

		this.disable();
		this.setDimensions();

		this.trie = new Trie(this.options.caseSensitive);
		this.trie.matches = [];
		this.trie.misses = [];

		var self = this;
		var listBuilder = [];
		var trieObjects = [];

		// console.timeEnd("prep");
		// console.time("build");

		listBuilder.push('<ul>');
		var options = this.selectbox.get(0).options;
		var thisOpt,optionText,optionIndex,trieObj,addOK, loopCountdown,index;

		loopCountdown = options.length;
		index = 0;
		do {
			thisOpt = options[index++]; 
			optionText = $.trim(thisOpt.text);
			optionIndex = thisOpt.index;

			trieObj = {index: optionIndex, li: null};
			addOK = self.trie.add(optionText, trieObj);

			if(addOK){
				listBuilder.push('<li name="' + optionIndex + '">' + optionText + '</li>');
				trieObjects.push(trieObj);
			} else {
				//self.log(optionText + " already added, not rendering item twice.");
			}
		} while(--loopCountdown); 

		listBuilder.push('</ul>');

		this.listScroll.html(listBuilder.join(''));
		this.list = this.listScroll.find("ul:first");

		// console.timeEnd("build");

		this.listItems = $("li", this.list);
		// console.time("kids");
		var theLis = this.list.get(0).getElementsByTagName('LI'); // much faster array then .childElements !

		loopCountdown = trieObjects.length;
		index = 0;
		do {
			trieObjects[index].li = theLis[index++];
		} while(--loopCountdown); 

		// console.timeEnd("kids");
		// console.time("tidy");

		if(this.options.triggerSelected){
			this.setInputFromMaster();
		} else {
			this.input.val(""); 
		}

		this.enable();
		// console.timeEnd("tidy");

	},

	setDimensions: function() {
		// console.time("1");

		this.wrapper.addClass("invisible");
		if(this.selectIsWrapped) { //unwrap
			this.wrapper.before(this.selectbox);
		}

		// console.timeEnd("1");
		// console.time("2");

		//get dimensions un-wrapped, in case of % width etc.
		this.originalSelectboxWidth = this.selectbox.outerWidth(); 
		var props = ["marginLeft","marginTop","marginRight","marginBottom"];
		for(propPtr in props){
			var prop = props[propPtr];
			this.wrapper.css(prop, this.selectbox.css(prop)); // copy property from selectbox to wrapper
		}

		// console.timeEnd("2");
		// console.time("2.5");

		this.wrapper.get(0).appendChild(this.selectbox.get(0)); //wrap

		// console.timeEnd("2.5");
		// console.time("3");

		this.wrapper.removeClass("invisible");
		this.selectIsWrapped = true;

		//match original width
		var newSelectWidth = this.originalSelectboxWidth;
		if(this.options.manualWidth) {
			newSelectWidth = this.options.manualWidth; 
		} else if (newSelectWidth < this.options.minWidth) {
			newSelectWidth = this.options.minWidth;
		}

		var buttonWidth = this.button.outerWidth();
		var inputBP = this.input.outerWidth() - this.input.width();
		var inputWidth = newSelectWidth - buttonWidth - inputBP;
		var listWrapBP = this.listWrapper.outerWidth() - this.listWrapper.width();

		// console.timeEnd("3");
		// console.time("4");

		this.input.width(inputWidth);
		this.wrapper.width(newSelectWidth);
		this.listWrapper.width(newSelectWidth - listWrapBP);

		//this.log(newSelectWidth + " : " + inputWidth + " : " + 
		//		buttonWidth + " : " + (newSelectWidth - listWrapBP));
		// console.timeEnd("4");

	},

	setInputFromMaster: function() {
		var selectNode = this.selectbox.get(0);
		var val = selectNode.options[selectNode.selectedIndex].text;
		// this.log("setting input to: " + val);
		this.input.val(val);
	},

	revertSelected: function() {
		this.setInputFromMaster();
		this.filter(1);
	},

	//corrects list wrapper's height depending on list items height
	setListDisplay: function() {

		var listHeight = this.list.outerHeight();
		var maxHeight = this.listMaxHeight;

		// this.log("set list height - listItemsHeight: " + listHeight + " : maxHeight: " + maxHeight );

		var height = listHeight;
		if (height > maxHeight) {
			height = maxHeight;
			this.listScroll.css(this.overflowCSS, "scroll");
		} else {
			this.listScroll.css(this.overflowCSS, "hidden");
		}

		// this.log("height set to: " + height);
		this.listScroll.height(height); 
		this.listWrapper.height(height); 

		var doDropUp = false;
		var offset = this.input.offset();
		if(this.options.allowDropUp) {
			var listSpace = maxHeight; // drop up if maxHeight doesnt fit, to prevent flicking up/down on type
			var inputHeight = this.wrapper.height();
			var bottomPos = offset.top + inputHeight + listSpace;
			var maxShown = $(window).height() + $(document).scrollTop();
			doDropUp = (bottomPos > maxShown);
		}

		var top;
		if (doDropUp) {
			this.listWrapper.addClass("list-wrapper-up");
			top = (offset.top - this.listScroll.height()) ;
		} else {
			this.listWrapper.removeClass("list-wrapper-up");
			top = (offset.top + this.input.outerHeight() - 1);
		}
		this.listWrapper.css("left", offset.left);
		this.listWrapper.css("top", top );			

		return height;
	},

	//returns active (hovered) element of the dropdown list
	getActive: function() {
		// this.log("get active");
		if(this.selectedLi == null) return $([]);
		return $(this.selectedLi); 
	},

	//highlights the item given
	setActive: function(activeItem) {
		// this.log("setActive");
		$(this.selectedLi).removeClass("active");
		this.selectedLi = activeItem;
		$(this.selectedLi).addClass("active");
	},

	selectFirst: function() {
		// this.log("selectFirst");
		var toSelect = this.listItems.filter(":not(.invisible):first");
		this.afterSelect( toSelect );
	},

	selectLast: function() {
		// this.log("selectFirst");
		var toSelect = this.listItems.filter(":not(.invisible):last");
		this.afterSelect( toSelect );
	},


	//highlights list item before currently active item
	selectPrev: function(isPageLength) {
		// this.log("hilightprev");
		var count = isPageLength ? this.options.pageLength : 1;
		var toSelect = this.searchRelativeVisible(false, count);
		this.afterSelect( toSelect );
	},	
		
	
	//highlights item of the dropdown list next to the currently active item
	selectNext: function(isPageLength) {
		//this.log("hilightnext");
		var count = isPageLength? this.options.pageLength : 1;
		var toSelect = this.searchRelativeVisible(true, count);
		this.afterSelect( toSelect );
	},		

	afterSelect: function(active) {
		this.setActive(active);
		this.input.val(active.text());
		this.inputFocus();
		this.scrollTo();
		this.tryToSetMaster();
	},		

	searchRelativeVisible: function(isSearchDown, count) {
		//this.log("searchRelative: " + isSearchDown + " : " + count);
		
		var active = this.getActive();
		if (!active.length) return this.selectFirst();
		var searchResult;
		
		do { // count times
			do { //find next/prev item
				searchResult = isSearchDown ? active.next() : active.prev();
			} while (searchResult.length && searchResult.hasClass("invisible"));
			
			if (searchResult.length) active = searchResult;

		} while(--count);
		
		return active;
	},
	
	//scrolls list wrapper to active
	scrollTo: function() {
		// this.log("scrollTo");
		if ("scroll" != this.listScroll.css(this.overflowCSS)) return;
		var active = this.getActive();
		if(!active.length) return;
		
		var activePos = Math.floor(active.position().top);
		var activeHeight = active.outerHeight(true);
		var listHeight = this.listWrapper.height();
		var scrollTop = this.listScroll.scrollTop();
		
	    /*  this.log(" AP: " + activePos + " AH: " + activeHeight + 
	    		" LH: " + listHeight + " ST: " + scrollTop); */
		    
		var top;
		var viewAheadGap = (this.options.viewAhead * activeHeight); 
		
		if (activePos < viewAheadGap) { //  off top
			top = scrollTop + activePos - viewAheadGap;
		} else if( (activePos + activeHeight) >= (listHeight - viewAheadGap) ) { // off bottom
			top = scrollTop + activePos - listHeight + activeHeight + viewAheadGap;
		}
		else return; // no need to scroll
		// this.log("top: " + top);
		this.listScroll.scrollTop(top);
	},		

	//just returns integer value of list wrapper's max-height property
	getListMaxHeight: function() {

		var result = parseInt(this.listWrapper.css("max-height"), 10);
		if (isNaN(result)) {
			this.log("no CSS max height set.");
			result = this.listMaxHeight;	
		}
		// this.log("get listmaxheight: " + result);
		return result;
	},

	getCurrentTextValue: function() {
		var input = $.trim(this.input.val()); 
		//this.log("Using input value: " + input);
		return input;
	},


	stopEvent: function(e) {
		e.cancelBubble = true;
		e.returnValue = false;
		if (e.stopPropagation) {e.stopPropagation(); }
		if( e.preventDefault ) { e.preventDefault(); }
	},

	setAttr: function(array, attr, val ) { //fast attribute OVERWRITE
		for(nodePtr in array) {
			array[nodePtr].li.setAttribute(attr, val);
		}
	},

	listVisible: function() {
		var isVisible = !this.listWrapper.hasClass("invisible");
		// this.log("is list visible?: " + isVisible);
		return isVisible;
	},

	disable: function() {
		// this.log("disable");

		this.hideList();
		this.isDisabled = true;
		this.button.addClass("disabled");
		this.input.addClass("disabled");
		this.input.attr("disabled", "disabled");
	},

	enable: function() {
		// this.log("enable");

		this.isDisabled = false;
		this.button.removeClass("disabled");
		this.input.removeClass("disabled");
		this.input.removeAttr("disabled");
	},

	/*
		  Select input text: inspired by jCarousel src
	 */
	selection: function(field, start, end) {
		if( field.createTextRange ){
			var selRange = field.createTextRange();
			selRange.collapse(true);
			selRange.moveStart("character", start);
			selRange.moveEnd("character", end);
			selRange.select();
		} else if( field.setSelectionRange ){
			field.setSelectionRange(start, end);
		} else {
			if( field.selectionStart ){
				field.selectionStart = start;
				field.selectionEnd = end;
			}
		}
	},

	selectAll: function() {
		// this.log("Select All");
		this.input.get(0).select();
		//this.selection(this.input.get(0), 0, this.input.val().length);
	},

	getDropdownContainer: function() {
		var ddc = $("#" + this.options.dropDownID);
		if(!ddc.length) { //create
			ddc = $("<div></div>").appendTo("body").
				css("height", 0).
				css("z-index", this.options.zIndexPopup).
				attr("id", this.options.dropDownID);
		}
		return ddc;
	},

	log: function(msg) {
		if(!this.options.log) return;

		if(window.console && console.log) {  // firebug logger
			console.log(msg);
		}
		if(this.logNode && this.logNode.length) {
			this.logNode.prepend("<div>" + msg + "</div>");
		}
	},

	changeOptions: function() {
		this.log("changeOptions");
		this._populateFromMaster();
	},		

	destroy: function() {
		this.log("called destroy");
		if(this.selectIsWrapped) { //unwrap
			this.wrapper.before(this.selectbox);
		}
		
		this.wrapper.remove();
		this.listWrapper.remove();
		
		this.element.unbind(); //expected $.widget to do this!
		$.widget.prototype.destroy.apply(this, arguments); // default destroy
	},
	
	//internal state
	selectIsWrapped: false,
	internalFocus: false, 
	lastKey: null,
	selectedLi: null,
	isUpdatingMaster: false,
	isDisabled: false

});



/******************************************************
 * Trie implementation for fast prefix searching
 * 
 *		http://en.wikipedia.org/wiki/Trie
 *******************************************************/

/**
 * Constructor
 */
function Trie(isCaseSensitive) {
	this.isCaseSensitive = isCaseSensitive || false;
	this.root = [null, {}]; //masterNode
};

/**
 * Add (String, Object) to store 
 */
Trie.prototype.cleanString = function( inStr ) {
	if(!this.isCaseSensitive){
		inStr = inStr.toLowerCase();
	}
	//invalid char clean here
	return inStr;
}

/**
 * Add (String, Object) to store 
 */
Trie.prototype.add = function( key, object ) {
	key = this.cleanString(key);
	var curNode = this.root;
	var kLen = key.length; 

	for(var i = 0; i < kLen; i++) {
		var char = key.charAt(i);
		var node = curNode[1];
		if(char in node) {
			curNode = node[char];
		} else {
			curNode = node[char] = [null, {}];
		}
	}
	if(curNode[0]) return false;
	curNode[0] = object;
	return true;
};

/**
 * Find object exactly matching key (String)
 */
Trie.prototype.find = function( key ) {
	key = this.cleanString(key);
	var resultNode = this.findNode(key);
	return (resultNode) ? resultNode[0] : null;
};	

/**
 * Find trieNode exactly matching (key) 
 */
Trie.prototype.findNode = function( key ) {
	var results = this.findNodePartial(key);
	var node = results[0];
	var remainder = results[1];
	return (remainder.length > 0) ? null : node;
};

/**
 * Find prefix trieNode closest to (String) 
 * returns [trieNode, remainder]
 */
Trie.prototype.findNodePartial = function(key) {
	key = this.cleanString(key);
	var curNode = this.root;
	var remainder = key;
	var kLen = key.length;

	for (var i = 0; i < kLen; i++) {
		var char = key.charAt(i);
		if (char in curNode[1]) {
			curNode = curNode[1][char];
		} else {
			return [ curNode, remainder ]; 
		}
		remainder = remainder.slice(1, remainder.length);
	}
	return [ curNode, remainder ];
};

/**
 * Get array of all objects on (trieNode) 
 */
Trie.prototype.getValues = function(trieNode) { 
	return this.getMissValues(trieNode, null); // == Don't miss any
};

/**
 * Get array of all objects on (startNode), except objects on (missNode) 
 */
Trie.prototype.getMissValues = function(startNode, missNode) { // string 
	if (startNode == null) return [];
	var stack = [ startNode ];
	var results = [];
	while (stack.length > 0) {
		var thisNode = stack.pop();
		if (thisNode == missNode) continue;
		if (thisNode[0]) results.unshift(thisNode[0]);
		for ( var char in thisNode[1]) {
			if (thisNode[1].hasOwnProperty(char)) {
				stack.push(thisNode[1][char]);
			}
		}
	}
	return results;
};

/**
 * Get array of all objects exactly matching the key (String) 
 */
Trie.prototype.findPrefixMatches = function(key) { 
	var trieNode = findNode(key);
	return this.getValues(trieNode);
}

/**
 * Get array of all objects not matching entire key (String) 
 */
Trie.prototype.findPrefixMisses = function(key) { // string 
	var trieNode = findNode(key);
	return this.getMissValues(this.root, trieNode);
};

/**
 * Get object with two properties:
 * 	matches: array of all objects not matching entire key (String) 
 * 	misses:  array of all objects exactly matching the key (String)
 * 
 * This reuses "findNode()" to make it faster then 2x method calls
 */
Trie.prototype.findPrefixMatchesAndMisses = function(key) { // string 
	var trieNode = this.findNode(key);
	var matches = this.getValues(trieNode);
	var misses = this.getMissValues(this.root, trieNode);

	return { matches : matches, misses : misses };
};

/* end Trie */	


$.extend($.ui.ufd, {
	version: "@VERSION",
	getter: "", //for methods that are getters, not chainables
	classAttr: (($.support.style) ? "class" : "className"),  // IE6/7 class property
	
	defaults: {
		skin: "plain", // skin name
		suffix: "_ufd", // suffix for pseudo-dropdown text input name attr.  
		dropDownID: "ufd-container", // ID for a root-child node for storing dropdown lists. avoids ie6 zindex issues by being at top of tree.
		logSelector: "#log", // selector string to write log into, if present.

		log: false, // log to firebug console (if available) and logSelector (if it exists)
		submitFreeText: false, // re[name] original select, give text input the selects' original [name], and allow unmatched entries  
		triggerSelected: true, // selected option of the selectbox will be the initial value of the combo
		caseSensitive: false, // case sensitive search 
		allowDropUp: true, // if true, the options list will be placed above text input if flowing off bottom
		allowLR: false, // show horizontal scrollbar

		listMaxHeight: 200, // CSS value takes precedence
		minWidth: 50, // don't autosize smaller then this.
		manualWidth: null, //override selectbox width; set explicit width
		viewAhead: 1, // items ahead to keep in view when cursor scrolling
		pageLength: 10, // number of visible items jumped on pgup/pgdown.
		delayFilter: ($.support.style) ? 1 : 150, // msec to wait before starting filter (or get cancelled); long for IE 
		delayYield: 1, // msec to yield for 2nd 1/2 of filter re-entry cancel; 1 seems adequate to achieve yield
		zIndexPopup: 101, // dropdown z-index
	
		// class sets
		css: {
			input: "",
			disabled: "disabled",
			button: "",
			buttonIcon: "icon",
			buttonHover: "",
			buttonMouseDown: "",
			listWrapper: "",
			listScroll: "",
			li: "",
			liHover: ""
			
		},
		uiThemerollerCss: {
		}
	}
});	

})(jQuery);
/* END */