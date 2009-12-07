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
			// console.time("start");
			
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
					'<button type="button"><div class="icon"/></button>'+
				//   <select .../> goes here
				'</span>'
			);
			this.dropdown = $(
				'<div class="' + this.options.skin + '">' +
					'<div class="list-wrapper invisible">' +
						'<div class="list-scroll">' +
							//'<ul/>' +
						'</div>' +
					'</div>' +
				'</div>'
			);

			this.selectbox.after(this.wrapper);
			this.getDropdownContainer().append(this.dropdown);

			// console.timeEnd("start");
			
			// console.time("middle");
			
			this.input = this.wrapper.find("input");
			this.button = this.wrapper.find("button");
			this.listWrapper = this.dropdown.find(".list-wrapper");
			this.listScroll = this.dropdown.find(".list-scroll");
			
			if($.fn.bgiframe) this.listWrapper.bgiframe(); //ie6 !
			this.listMaxHeight = this.getListMaxHeight(); 

			// console.timeEnd("middle");
			
			// console.time("end");

			// console.time("pfm");
			this.populateFromMaster();
			// console.timeEnd("pfm");
			// console.time("ie");
			this.initEvents();
			// console.timeEnd("ie");
			
			// console.timeEnd("end");
			
			// console.timeEnd("init");
			

		},

		
	    
    	// event handlers

    	key: function(event, isKeyUp, isKeyPress) {
    		// Key handling is tricky; here is great key guide: http://unixpapa.com/js/key.html

    		var k = $.ui.keyCode; 
    		var key = null;

    		if (undefined === event.which) {
    			key = event.keyCode; 
    		} else if (!isKeyPress && event.which != 0) {
    			key = event.keyCode;
    		} else { 
    			return; //special key
    		}
    		
		    // only process: keyups excluding tab/return; and only tab/return keydown 
    		// Only some browsers fire keyUp on tab in, ignore if it happens 
		    if(!isKeyUp == ((key != k.TAB) && (key != k.ENTER)) ) return;

		    //this.log("Key: " + key + " isKeyUp?: " + isKeyUp + " isKeyPress?: " + isKeyUp);
		    this.lastKey = key;
		    
		    
		    switch (key) {
		    	case k.SHIFT:
		    	case k.CONTROL:
		    		//don't refilter 
		    		break;
		    		
		    	case k.END: //TODO
		    	case k.DOWN:
			    case k.PAGE_DOWN:
			    	//this.log("down pressed");
					this.showList();
			    	this.selectNext();
			    	break;
			    	
			    case k.HOME: //TODO
			    case k.UP:
			    case k.PAGE_UP:
			    	//this.log("up pressed");
					this.showList();
			    	this.selectPrev();
			    	break;
			    	
		        case k.ENTER:
		        	//this.log("enter pressed");
		        	this.hideList();
		        	this.tryToSetMaster();
		        	this.inputFocus();
		        	this.stopEvent(event);
		        	break;
		        	
				case k.TAB: //tabout only
					//this.log("tabout pressed");
					this.realLooseFocus();
					break;
					
				case k.ESCAPE:
					//this.log("ESC pressed");
				    this.hideList();
				    this.revertSelected();
				    break;
				    
				default:
					this.showList();
					this.filter(0, true); //do delay, as more keypresses may cancel
					break;
		    }
		},

        initEvents: function() { //initialize all event listeners
	        var self = this;
			//this.log("initEvents");

	        this.selectbox.bind("change", function(e) {
	        	if(self.isUpdatingMaster){
	        		self.log("master changed but we did the update");
	    	        self.isUpdatingMaster = false;
	        		return true;
	        	}
	        	self.log("master changed; reverting");
	        	self.revertSelected();
	        });
			
			
	        this.input.bind("click", function(e) {
		    	if(self.isDisabled){
		    		self.stopEvent(e);
		    		return;
		    	}
	        	// self.log("input click");
	            if(!self.internalFocus) {
	            	self.realFocusEvent();
	            }
	        });

	        this.input.bind("focus", function(e) {
		    	if(self.isDisabled){
		    		self.stopEvent(e);
		    		return;
		    	}
	        	 // self.log("input focus");
	            if(!self.internalFocus){
	            	self.realFocusEvent();
	            }
	        });

			this.input.bind("keydown", function(e) {
				self.key(e, false, false); //isKeyUp, isKeyPress
			});

			/*this.input.bind("keypress", function(e) {
				self.key(e, false, true); //isKeyUp, isKeyPress
			});	*/
			
			this.input.bind("keyup", function(e) {
				self.key(e, true, false); //isKeyUp, isKeyPress
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
	            self.buttonClick();
	        }); 

			//list events
			this.listWrapper.bind("mouseover", function(e) {
				if ("LI" != e.target.nodeName.toUpperCase()) return true;
				$(e.target).addClass("hover");
				return true;
			});

			this.listWrapper.bind("mouseout", function(e) {
				if ("LI" != e.target.nodeName.toUpperCase()) return true;
				$(e.target).removeClass("hover");
				return true;
			});
			
			this.listWrapper.bind("click", function(e) {
				// self.log("item click: " + e.target.nodeName);
				if("LI" != e.target.nodeName.toUpperCase()) return true;
				
				self.stopEvent(e); //prevent bubbling to document onclick binding etc
				self.listItemClick(e.target);
				return true;
			});
			
	    
	        // click anywhere else
	        $(document).bind("click", function(e) {
	            if ((self.button.get(0) == e.target) || (self.input.get(0) == e.target)){
	            	//TODO should check list for click also? 
	            	return;
	            }
	            if(self.internalFocus) {
					// self.log("unfocus document click : " + e.target);
		            self.realLooseFocus();
	            }
	        });
	        
		},
	    
    	// pseudo events
		
	    realFocusEvent: function() {
        	// this.log("real input focus");
        	this.internalFocus = true;
        	this.triggerEventOnMaster("focus");
	    	this.filter(1); //show all even tho one is selected
	    	this.inputFocus();
	    	this.showList();
	    	this.scrollTo();	    	
	    },

	    realLooseFocus: function() {
        	// this.log("real loose focus (blur)");
        	this.internalFocus = false;
        	this.hideList();  
        	this.tryToSetMaster();
        	this.triggerEventOnMaster("blur");
	    },

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
		
		triggerEventOnMaster: function(eventName) {
			if( document.createEvent ) { // good browsers
				var evObj = document.createEvent('HTMLEvents');
				evObj.initEvent( eventName, true, true );
				this.selectbox.get(0).dispatchEvent(evObj);
				
			} else if( document.createEventObject ) { // iE
				this.selectbox.get(0).fireEvent("on" + eventName);
			} 
			
		},
	    
	    buttonClick: function() {
	    	// this.log("clickbutton");

	        if (this.listVisible()) { 
	            this.hideList();
			    this.inputFocus();
			    
		    } else {	
		    	this.filter(1); //show all even tho one is selected
		    	this.inputFocus();
	            this.showList();
		    	this.scrollTo();	    	
		    }          
	    },

	    listItemClick: function(item) {
        	// this.log("listitemclick");
        	var value = $.trim($(item).text());
        	this.input.val(value);
        	this.setActive(item);
	        if(this.tryToSetMaster() ) {
	        	this.hideList();
	        	this.filter(1);
	        }
	        this.inputFocus();
	    },	    
	
	    // methods
	    
	    showList: function() {
        	if(this.listVisible()) return;
        	// this.log("showlist");
        	
        	this.listWrapper.removeClass("invisible");
        	this.setListDisplay();
			
	    },
	
	    hideList: function() {
        	if(!this.listVisible()) return;
        	// this.log("hide list");
	        
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
		        	self.resetActive();
		        }
		        
		        self.setListDisplay();
	        };
	        
	        if(doDelay) {
	        	//setup new delay
				this.filterOnTimeout = setTimeout(function(){search();}, this.options.delayFilter);
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

    		if(optionIndex == curIndex){
	        	this.log("already set correctly." + active.text()  + " : " + option.text);
	        	return true;
	        }
    		this.log(" update: " + this.selectbox.val() + " : "+ option.value);
	        
	        this.isUpdatingMaster = true;
	        sBox.selectedIndex = optionIndex;
	        if(this.selectbox.val() != option.value){ //set failed
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
	        this.triggerEventOnMaster("change");
	        return true;
	    },

        populateFromMaster: function() {
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
                	//trieObjects.push({}); //as trieObjects is iterating from source options 
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
    	    
    	    this.undisable();
    		// console.timeEnd("tidy");
    	    
        },
        
        setDimensions: function() {
    		// console.time("1");
        	
        	this.wrapper.addClass("invisible");
        	if(this.options.selectIsWrapped) { //unwrap
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
    		this.options.selectIsWrapped = true;
    	    
			
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

		//scrolls list wrapper to active
		scrollTo: function() {
        	// this.log("scrollTo");

		    if ("scroll" != this.listScroll.css(this.overflowCSS)) return;
		    
			var active = this.getActive();
			if(!active.length) return;
			console.log(active.get(0));
		    var activePos = active.position().top;
		    var activeHeight = active.outerHeight(true);
		    var listHeight = this.listWrapper.height();
		    var scrollTop = this.listScroll.scrollTop();
		    /*
		    console.log("APT: " + activePos);
		    console.log("AH: " + activeHeight);
		    console.log("LH: " + listHeight);
		    console.log("ST: " + scrollTop);
		    */
		    var top = 0;
		    if (activePos <= activeHeight) { // nearly off top
		    	top = scrollTop + activePos - activeHeight;
		    } else if((activePos + activeHeight) >= listHeight ) { //nearly off bottom
		    	top = scrollTop + activePos + activeHeight - activePos  ;
		    }
		    else {
		    	return; // no need to scroll
		    }
		    // this.log("top: " + top);
		    this.listScroll.scrollTop(top);
		    
		},		

		//returns active (hovered) element of the dropdown list
		getActive: function() {
        	// this.log("get active");
			return $(this.selectedLi);
		},

	    //highlights the item given
	    setActive: function(activeItem) {
        	this.log("setActive");
			$(this.selectedLi).removeClass("active");
			this.selectedLi = activeItem;
	        $(this.selectedLi).addClass("active");
	    },
	    
    	resetActive: function() {
        	// this.log("resetActive");
        	var active = this.listItems.filter(":not(.invisible):first");
    		this.setActive( active );
    	},
    	
			    
		//highlights list item before currently active item
		selectPrev: function() {
        	// this.log("hilightprev");
			
        	var active = this.getActive();
		    if (!active.length) {
		    	active = this.resetActive();
		    	return;
		    }
        	
		    var $prev = active.prev();
		    
		    while ($prev.length && $prev.hasClass("invisible")) {
		        $prev = $prev.prev();
		    }
		    if(!$prev.length) {
		    	$prev = active; // top of list, no action
		    	return;
		    }
			
	        active.removeClass("active");
			$prev.addClass("active");
			this.tryToSetMaster();
			this.scrollTo();
			
    		var node = $prev.data("optionNode");
	        if(node == null) {  
	        	this.log("shouldnt happen");
	        	return;
	        }
	        this.input.val(node.text);
	        this.inputFocus();
	        this.selectAll();
	        return;
		},		
		
		//highlights item of the dropdown list next to the currently active item
		selectNext: function() {
        	//this.log("hilightnext");
			
        	var active = this.getActive();
		    if (!active.length) {
		    	active = this.resetActive();
		    	return;
		    }
        	var next = active.next();
		    
		    while (next.hasClass("invisible") && next.length) {
		        next = next.next();
		    }
		    if(!next.length) {
		    	next = active; // bottom of list, no action
		    	return;
		    }
		    	
	        active.removeClass("active");
			next.addClass("active");
			this.tryToSetMaster();
			this.scrollTo();
		
    		var node = next.data("optionNode");
	        if(node == null) { 
	        	this.log("shouldnt happen");
	        	return false;
	        }
	        this.input.val(node.text);
	        this.inputFocus();
	        this.selectAll();
	        return;
		    
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
		
		undisable: function() {
        	// this.log("undisable");
			
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
			this.populateFromMaster();
		},		

		destroy: function() {
			$.widget.prototype.apply(this, arguments); // default destroy
		}
	
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
			skin: "plain", //skin name
			suffix: "_ufd", // original select name + suffix == pseudo-dropdown text input name  
			dropDownID: "ufd-container", // ID of node for storing dropdown lists near root node, avoids ie6 zindex issues.
			logSelector: "#log", // selector string to write log into, 
			log: false, // log to firebug console (if available) and logSelector (if it exists)?
			
			dropDownIcon: ".ui-icon-circle-triangle-e", //ui-icon-triangle-1-s, ui-icon-arrowthick-1-s
			
			submitFreeText: false, // re[name] original select, give text input the selects' original [name], and allow unmatched entries  
			triggerSelected: true, //selected option of the selectbox will be the initial value of the combo
			caseSensitive: false, // case sensitive search ?
			autoFill: false, //enable autofilling 
			allowDropUp: true, //if true, the options list will be placed above text input if flowing off bottom
			allowLR: false, //show horizontal scrollbar
			
			listMaxHeight: 200, //CSS value takes precedence
			minWidth: 50, // don't autosize smaller then this.
			manualWidth: null, //override selectbox width; set explicit width
			delayFilter: ($.support.style) ? 1 : 150, //msec to wait before starting filter (or get cancelled); long for IE 
			delayYield: 1, // msec to yield for 2nd 1/2 of filter re-entry cancel; 1 seems adequate to achieve yield
			zIndexPopup: 101, // dropdown z-index
			
			//internal state
			isUpdatingMaster: false,
			isDisabled: false,
			internalFocus: false, 
			lastKey: null,
			selectIsWrapped: false,
			selectedLi: null,
			hidden: true
		}
	});	
	
})(jQuery);
/* END */