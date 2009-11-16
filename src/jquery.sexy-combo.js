/***************************************************************************
 *                                                                         *
 *	sexy-combo @VERSION	: A jQuery date time picker.
 *                                                                         *
 *	Authors:                                                               *
 *		Kadalashvili.Vladimir@gmail.com - Vladimir Kadalashvili            *
 *		thetoolman@gmail.com                                               * 
 *                                                                         *
 *	Version: 3.0.0-Alpha
 *                                                                         *
 *	Website: http://code.google.com/p/sexy-combo/                          *
 *                                                                         *
 *   This program is free software; you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation; either version 2 of the License, or     *
 *   (at your option) any later version.                                   *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program; if not, write to the                         *
 *   Free Software Foundation, Inc.,                                       *
 *   59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.             *
 *                                                                         *
 ***************************************************************************/

;(function($) {

	$.fn.sexyCombo = function(config) {
        this.each(function() {
			if ("SELECT" != this.tagName.toUpperCase())  return;	
		    var sc = new $sc(this, config);
		    
		    $(this).data("sexy-combo", sc);
	    });  
        
        return this;
    };
    
    $.fn.sexyCombo.defaults = {

		skin: "sexy", //skin name
		suffix: "__sexyCombo", // original select name + suffix == pseudo-dropdown text input name  
		dropDownID: "sexyComboDDC", //if provided, value of text input when it has no value and focus
		logSelector: "#log", // selector string to write log into, 
		log: false, // log to firebug console (if available) and logSelector (if it exists)?

		submitFreeText: false, // re[name=] original select, give text input the selects' original [name], and allow unmatched entries  
		triggerSelected: true, //selected option of the selectbox will be the initial value of the combo
		caseSensitive: false, // case sensitive search ?
		autoFill: false, //enable autofilling 
		allowDropUp: true, //if true, the options list will be placed above text input if flowing off bottom
		AllowLR: false, //show horizontal scrollbar

		minWidth: 50, // don't autosize smaller then this.
    	manualWidth: null, //override selectbox width; set explicit width
		delayFilter: ($.support.style) ? 1 : 150, //msec to wait before starting filter (or get cancelled); long for IE 
		delayYield: 1, // msec to yield for 2nd 1/2 of filter re-entry cancel; 1 seems adequate to achieve yield
		zIndexPopup: 101, // dropdown z-index
		
		key: "value", //key json name for key/value pair
		value: "text", //value json for key/value pair
	
		//all callback functions are called in the scope of the current sexyCombo instance
		showListCallback: null, //called after dropdown list appears
		hideListCallback: null, //called after dropdown list disappears
		initCallback: null, //called at the end of constructor
		initEventsCallback: null, //called at the end of initEvents function
		changeCallback: null, //called when both text and hidden inputs values are changed
		textChangeCallback: null //text input's value is changed
    };
    
    //constructor: create initial markup and initialize
    $.sexyCombo = function(selectbox, config) {
		
        if (selectbox.tagName.toUpperCase() != "SELECT") return;
        this.config = $.extend({}, $.fn.sexyCombo.defaults, config || {}); 

        // in place content
        this.selectbox = $(selectbox);
        this.originalSelectboxWidth = this.selectbox.outerWidth(); //get size *before* its wrapped, in case of % width 
        var selectName = this.selectbox.attr("name");
        var suffixName = selectName + this.config.suffix;
        if(this.config.submitFreeText) this.selectbox.attr("name", suffixName);

	    this.wrapper = this.selectbox.wrap("<span>").parent().
		    addClass("combo").
		    addClass(this.config.skin); 

	    this.input = $("<input type='text' />").
		    appendTo(this.wrapper).
		    attr("autocomplete", "off").
		    attr("value", "").
		    attr("name", this.config.submitFreeText ? selectName : suffixName);
	    
        this.icon = $('<div class="icon"/>').
		    appendTo(this.wrapper); 
        
        // drop down content
        var ddc = this.getDropdownContainer();
        
	    this.listWrapper = $('<div class="list-wrapper"/>').
	    	addClass("invisible").
	    	appendTo(ddc);
	    if($.fn.bgiframe) this.listWrapper.bgiframe(); //ie6 !

	    this.listWrapper.wrap("<div>").parent().
	    	addClass(this.config.skin);

	    this.listScroll = $('<div class="list-scroll"/>').appendTo(this.listWrapper);
	    
	    this.list = $("<ul />").appendTo(this.listScroll); 

	    this.isUpdatingMaster = false;
	    this.isDisabled = false;
	    this.internalFocus = false; 
	    this.lastKey = null;
	    this.logNode = $(this.config.logSelector);
	    this.overflowCSS = this.config.allowLR ? "overflow" : "overflowY";
	    
		this.populateFromMaster();
		
	    this.notify("init");
	    this.initEvents();
        this.initListEvents();
    };
    
    //shortcuts
    var $sc = $.sexyCombo;
    $sc.fn = $sc.prototype = {};
    $sc.fn.extend = $sc.extend = $.extend;
    
    $sc.fn.extend({
	    
    	// sexy combo object event handlers

    	key: function(event, isKeyUp, isKeyPress) {
    		/*
    		 * Key handling is tricky; here is great key guide: http://unixpapa.com/js/key.html
    		 */
    		if(isKeyPress) return; //not needed

    		var k = $sc.KEY; 
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
		    if(!isKeyUp == ((key != k.TAB) && (key != k.RETURN)) ) return;

		    //this.log("Key: " + key + " isKeyUp?: " + isKeyUp + " isKeyPress?: " + isKeyUp);
		    this.lastKey = key;
		    
		    switch (key) {
		    	case k.SHIFT:
		    	case k.CTRL:
		    	case k.ALT:
		    		//don't refilter 
		    		break;
		    		
		    	case k.END: //TODO
		    	case k.DOWN:
			    case k.PAGEDOWN:
			    	//this.log("down pressed");
					this.showList();
			    	this.selectNext();
			    	break;
			    	
			    case k.HOME: //TODO
			    case k.UP:
			    case k.PAGEUP:
			    	//this.log("up pressed");
					this.showList();
			    	this.selectPrev();
			    	break;
			    	
		        case k.RETURN:
		        	//this.log("enter pressed");
		        	this.hideList();
		        	this.tryToSetMaster();
		        	this.inputFocus();
		        	break;
		        	
				case k.TAB: //tabout only
					//this.log("tabout pressed");
					this.realLooseFocus();
					break;
					
				case k.ESC:
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
			this.log("initEvents");

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
	        	self.log("input click");
	            if(!self.internalFocus) {
	            	self.realFocusEvent();
	            }
	        });

	        this.input.bind("focus", function(e) {
		    	if(self.isDisabled){
		    		self.stopEvent(e);
		    		return;
		    	}
	        	self.log("input focus");
	            if(!self.internalFocus){
	            	self.realFocusEvent();
	            }
	        });

			this.input.bind("keydown", function(e) {
				self.key(e, false, false); //isKeyUp, isKeyPress
			});

			this.input.bind("keypress", function(e) {
				self.key(e, false, true); //isKeyUp, isKeyPress
			});	
			
			this.input.bind("keyup", function(e) {
				self.key(e, true, false); //isKeyUp, isKeyPress
			});	
			
	        this.icon.bind("mouseover", function(e) { self.icon.addClass("hover"); }); 
	        this.icon.bind("mouseout",  function(e) { self.icon.removeClass("hover"); }); 
	        this.icon.bind("mousedown", function(e) { self.icon.addClass("mouseDown"); }); 
	        this.icon.bind("mouseup",   function(e) { self.icon.removeClass("mouseDown"); }); 
			this.icon.bind("click", function(e) {
		    	if(self.isDisabled){
		    		self.stopEvent(e);
		    		return;
		    	}
				self.log("icon click: " + e.target);
	            self.iconClick();
	        }); 
	    
	        // click anywhere else
	        $(document).bind("click", function(e) {
	            if ((self.icon.get(0) == e.target) || (self.input.get(0) == e.target)){
	            	return;
	            }
	            if(self.internalFocus) {
					self.log("unfocus document click : " + e.target);
		            self.realLooseFocus();
	            }
	        });
	        
			this.notify("initEvents");
	    },
	    
        initListEvents: function() { 
			var self = this;
			this.log("initListEvents");

	        this.listItems.bind("mouseover", function(e) {
	        	var item = $(e.target);
				if ("LI" != e.target.nodeName.toUpperCase()) { //child span click
					item = item.parent();
				}
				self.highlight(item);	
	        });
	    
	        this.listItems.bind("click", function(e) {
	        	self.log("item click: " + e.target.nodeName);
	            self.listItemClick($(e.target)); //TODO can be span or LI ?
	            self.stopEvent(e); //prevent bubbling to document onclick binding etc
	        });
	        
		},
	    
    	// sexy combo object pseudo events
		
	    realFocusEvent: function() {
        	this.log("real input focus");
        	this.internalFocus = true;
        	this.selectbox.trigger("focus");
	    	this.filter(1); //show all even tho one is selected
	    	this.inputFocus();
	    	this.showList();
	    	this.scrollTo();	    	
	    },

	    realLooseFocus: function() {
        	this.log("real loose focus (blur)");
        	this.internalFocus = false;
        	this.hideList();  
        	this.tryToSetMaster();
        	this.selectbox.trigger("blur");
	    },

		inputFocus: function() {
        	this.log("inputFocus: restore input component focus");
        	this.input.focus();

            if (this.getCurrentTextValue().length) {
	            this.selectAll();    	
	        }			
		},
		
		inputBlur: function() {
        	this.log("inputBlur: loose input component focus");
        	this.input.blur();
		},	    
	    
	    iconClick: function() {
	    	this.log("clickIcon");

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
        	this.log("listitemclick");
        	var activeNode = this.getActiveOptionNode();
        	if(! activeNode) {
        		this.log("bad! couldn't find active item");
    	        this.inputFocus();
    	        return;
        	}
        	var value = $.trim($(activeNode).html());
        	this.input.val(value);
	        if(this.tryToSetMaster() ) {
	        	this.hideList();
	        	this.filter(1);
	        }
	        this.inputFocus();
	    },	    
	
	    //sexy combo methods
	    
	    showList: function() {
        	if(this.listVisible()) return;
        	this.log("showlist");
        	
        	this.listWrapper.removeClass("invisible").addClass("visible");
        	this.setListDisplay();
			
		    this.notify("showList");
	    },
	
	    hideList: function() {
        	if(!this.listVisible()) return;
        	this.log("hide list");
	        
	        this.listWrapper.removeClass("visible").addClass("invisible");
	        this.listItems.removeClass("invisible"); //slow?  
	        

	        this.notify("hideList");
	    },

	    // attempt update; clear input or set default if fail:
	    tryToSetMaster: function() {
	    	this.log("t.s.m");
	        if(this.trie.matches.length == 0 && !this.config.submitFreeText) {
	        	this.log("not allowed freetext, revert:");
	        	this.revertSelected();
	        	return false; // no match
	        }

	    	
	    	var active = this.getActive().get(0);  //get match
        	if (active == null) {
    	    	this.log("Bad! coudn't locate active item");
    	    	return false; 
        	}
    		var node = $(active).data("optionNode");
	        if(node == null) { 
	        	this.log("Bad! no associated master option node");
	        	return false;
	        }

	        var nodeVal = (node.value != null && node.value != "") ? node.value : node.text;
	        var option = this.selectbox.children("option:selected");
	        if(option.text() == node.text){
	        	this.log("already set correctly." + option.text()  + " : " + node.text);
	        	return true;
	        }
	        
	        var curVal = this.selectbox.val();
	        this.isUpdatingMaster = true;
	        this.selectbox.val([nodeVal]);
	        this.log(" update: " + this.selectbox.val() + " : "+ nodeVal);
	        if(this.selectbox.val() != nodeVal){ //set failed
		        this.selectbox.val([curVal]); 
		        this.log("set new master selected failed.");
		        if(!this.config.submitFreeText) {
		        	this.log("not allowed freetext, revert:");
		        	this.revertSelected();
		        }
		        return false;
	        }
	        this.input.val(node.text);
	        this.log("master selectbox set to: " + nodeVal);
	        this.selectbox.trigger("change");
	        this.notify("textChange");
	        return true;
	    },

        populateFromMaster: function() {
        	this.log("populate from master select");
        	
        	var self = this;
        	this.disable();
    		this.options = this.selectbox.children("option");
    		
    		this.trie = new Trie(this.config.caseSensitive);
    		this.trie.matches = [];
    		this.trie.misses = [];

    		this.list.html(""); //delete old ones - consider bound objects TODO
			
    		this.options.each(function() {	
    			var opt = $(this);
    	    	var optionText = $.trim(opt.text());
                var newItem = $('<li class="visible"><span>' + optionText + '</span></li>');
                newItem.data("optionNode", this);
                var addOK = self.trie.add(optionText, newItem.get(0));
                if(addOK){
                	self.list.append(newItem);
                } else {
                	self.log(optionText + " already added, not rendering item twice.");
                }
    	    });
    		
			this.listItems = this.list.children();
			this.initListEvents();
			
    	    if(this.config.triggerSelected){
    	    	this.revertSelected();
    	    } else {
    	    	this.input.val(""); //better tecqnique?
    	    }
    	    
    	    //match original width
    	    var newSelectWidth = this.originalSelectboxWidth;
    	    if(this.config.manualWidth) {
    	    	newSelectWidth = this.config.manualWidth; 
    	    } else if (newSelectWidth < this.config.minWidth) {
    	    	newSelectWidth = this.config.minWidth;
    	    }

    	    
    	    var iconWidth = this.icon.outerWidth();
    	    var inputBP = this.input.outerWidth() - this.input.width();
    	    var inputWidth = newSelectWidth - iconWidth - inputBP;
    	    var listWrapBP = this.listWrapper.outerWidth() - this.listWrapper.width();

    	    this.input.width(inputWidth);
    	    this.wrapper.width(newSelectWidth);
    	    this.listWrapper.width(newSelectWidth - listWrapBP);
    	    
    	    //this.log(newSelectWidth + " : " + inputWidth + " : " + 
    	    //		iconWidth + " : " + (newSelectWidth - listWrapBP));
    	    
    	    // copy listed css properties from select to container
    	    var props = ["marginLeft","marginTop","marginRight","marginBottom"];
    	    for(propPtr in props){
    	    	var prop = props[propPtr];
    	    	this.wrapper.css(prop, this.selectbox.css(prop));
    	    }

    	    
    	    this.undisable();
    	    
        },
        
		revertSelected: function() {
			var option = this.selectbox.children("option:selected");
			var val = option.text();
			this.log("reverting to: " + val);
			this.input.val(val);
			this.filter(1);
		},
		
	    /*
	     * adds / removes items to / from the dropdown list depending on combo's current value
	     * 
	     * if doDelay, will delay execution to allow re-entry to cancel.
	     */
	    filter: function(showAllLength, doDelay) {
        	this.log("filter: " + showAllLength);
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
			    self.updateOnTimeout = setTimeout(function(){screenUpdate();}, self.config.delayYield); 
		        
	        };

	        var screenUpdate = function() {
	        	//this.log("screen update");
	        	self.log(self.getCurrentTextValue() + ": matchesLength: " + 
	        			self.trie.matches.length + " missesLength: " + self.trie.misses.length );

	        	self.setAttr(self.trie.matches, $sc.classAttr,"visible" );
		        if(self.trie.matches.length <= showAllLength) {
		        	self.log("showing all");
		        	self.setAttr(self.trie.misses, $sc.classAttr,"visible" );
		        } else {
		        	self.log("hiding");
		        	self.setAttr(self.trie.misses, $sc.classAttr,"invisible" );
		        }
		        if(self.trie.matches.length == 1) {
		        	self.setActive(self.trie.matches[0]);
		        } else if(self.getActiveIndex() == -1 && !self.config.submitFreeText){
		        	self.resetActive();
		        }
		        self.setListDisplay();
	        };
	        
	        if(doDelay) {
	        	//setup new delay
				this.filterOnTimeout = setTimeout(function(){search();}, this.config.delayFilter);
	        } else {
	        	search();
	        }
	    },
		
		//returns index of currently active list item
		getActiveIndex: function() {
        	this.log("get activeindex");
			
		    return $.inArray(this.getActive().get(0), this.listItems.filter(".visible").get());
		},
		
	    //highlights the item given
	    highlight: function(activeItem) {
        	//this.log("highlight");
			this.getActive().removeClass("active");  
	        $(activeItem).addClass("active");
	    },
	    
		
		//highlights list item before currently active item
		selectPrev: function() {
        	this.log("hilightprev");
			
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
        	this.log("hilightnext");
			
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
		
		//corrects list wrapper's height depending on list items height
		setListDisplay: function() {
			
			var liHeight = this.list.outerHeight();
		    var maxHeight = this.getListMaxHeight();
	
		    this.log("set list height - listItemsHeight: " + liHeight + " : maxHeight: " + maxHeight );

		    var height = liHeight;
		    if (height > maxHeight) {
		    	height = maxHeight;
		    	this.listScroll.css(this.overflowCSS, "scroll");
		    } else {
		    	this.listScroll.css(this.overflowCSS, "hidden");
		    }

		    this.log("height set to: " + height);
		    this.listScroll.height(height); 
		    this.listWrapper.height(height); 
			
        	var dropUp = false;
        	var offset = this.input.offset();

        	if(this.config.allowDropUp) {
	        	var listHeight = maxHeight; // drop up if max doesnt fit, to prevent flicking up/down on type
	        	var inputHeight = this.wrapper.height();
	        	var bottomPos = offset.top + inputHeight + listHeight;
	        	var maxShown = $(window).height() + $(document).scrollTop();
	        	dropUp = (bottomPos > maxShown); 
        	}

        	var top;
        	if (dropUp) {
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

		//just returns integer value of list wrapper's max-height property
		getListMaxHeight: function() {
			
			var result = parseInt(this.listWrapper.css("max-height"), 10);
			if (isNaN(result)) {
				this.log("no max height set.");
				result = 200;	
			}
			this.log("get listmaxheight: " + result);
			return result;
		},

		
		//returns active (hovered) element of the dropdown list
		getActive: function() {
        	this.log("get active");
			return this.listItems.filter(".active:first"); //TODO used cached visible list
		},

		getActiveOptionNode: function() {
        	this.log("get activeOptionNode");

	    	var active = this.getActive();
	    	if (active.length) {
	    		return $(active).data("optionNode");
	        }
    	},
    	
    	setActive: function(node) {
        	this.log("setActive");
    		this.listItems.removeClass("active");
    		$(node).addClass("active");
    	},

    	
    	resetActive: function() {
        	this.log("resetActive");
        	var active = this.listItems.filter(".visible:first");
    		this.setActive( active );
    		return active;
    	},
    	
		
		//scrolls list wrapper to active
		scrollTo: function() {
        	this.log("scrollTo");

		    if ("scroll" != this.listScroll.css(this.overflowCSS)) return;
		    
			var active = this.getActive();
			if(!active.length) return;
			
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
		    this.log("top: " + top);
		    this.listScroll.scrollTop(top);
		    
		},		
		


	    getCurrentTextValue: function() {
			var input = $.trim(this.input.val()); 
			//this.log("Using input value: " + input);
	        return input;
	    },
		
		
	    stopEvent: function(e) {
            e.cancelBubble = true;
            e.returnValue = false;

            if (e.stopPropagation) {
                    e.stopPropagation();
                    e.preventDefault();
            }
	    },

	    setAttr: function(array, attr, val ) { //fast attribute OVERWRITE
        	for(nodePtr in array) {
        		array[nodePtr].setAttribute(attr, val);
        	}
        },
	    
	    listVisible: function() {
	        var isVisible = this.listWrapper.hasClass("visible");
	        this.log("is list visible?: " + isVisible);
	        return isVisible;
	    },
			
		disable: function() {
        	this.log("disable");
			
			this.hideList();
			this.isDisabled = true;
			this.icon.addClass("disabled");
			this.input.addClass("disabled");
			this.input.attr("disabled", "disabled");
		},
		
		undisable: function() {
        	this.log("undisable");
			
			this.isDisabled = false;
			this.icon.removeClass("disabled");
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
			this.log("Select All");
			this.input.get(0).select();
	        //this.selection(this.input.get(0), 0, this.input.val().length);
	    },
	    
	    getDropdownContainer: function() {
	    	var ddc = $("#" + this.config.dropDownID);
	    	if(!ddc.length) { //create
	    		ddc = $("<div></div>").appendTo("body").
	    		css("height", 0).
	    		css("z-index", this.config.zIndexPopup).
	    		attr("id", this.config.dropDownID);
	    	}
	    	return ddc;
	    },
	    		
		notify: function(evt) {
		    if (!$.isFunction(this.config[evt + "Callback"])) return;
		    this.config[evt + "Callback"].call(this);	
		},
		
		log: function(msg) {
			if(!this.config.log) return;
			
			if(window.console && console.log) {  // firebug logger
				console.log(msg);
			}
			if(this.logNode && this.logNode.length) {
				this.logNode.prepend("<div>" + msg + "</div>");
			}
		}
    });
    
    
    // static $.sexycombo functions
    $sc.extend({
    	KEY: { //key codes
    		LEFT: 37,
    		UP: 38,
    		RIGHT: 39,
		    DOWN: 40,
		    PAGEUP: 33,
		    PAGEDOWN: 34,
		    HOME: 36,
		    END: 35,
		    
		    TAB: 9,
		    RETURN: 13,
		    ESC: 27,

		    SHIFT: 16,
		    CTRL: 17,
		    ALT: 18,

		    COMMA: 188,
		    DEL: 46,
		    BACKSPACE: 8	
    	},
    	
    	classAttr: (($.support.style) ? "class" : "className"),  // IE6/7 class property

		/* TODO ?
	    createSelectbox: function(config) {
		    var $selectbox = $("<select />").
			    appendTo(config.container).
			    attr({name: config.name, id: config.id, size: "1"});
		    
		    if (config.multiple) $selectbox.attr("multiple", true);
		    
		    var data = config.data;
		    var selected = false;
		    
		    for (var i = 0, len = data.length; i < len; ++i) {
		        selected = data[i].selected || false;
		        $("<option />").appendTo($selectbox).
					attr("value", data[i][config.key]).
					text(data[i][config.value]).
					attr("selected", selected);
		    }
		    
		    return $selectbox.get(0);
		},
		
		create: function(config) { //TODO
			
            var defaults = {
		        name: "", //the name of the selectbox
				id: "", //the ID of the selectbox
				multiple: false, //if true, combo with multiple choice will be created
				key: "value", //key json name for key/value pair
				value: "text", //value json for key/value pair
				container: $(document), //an element that will contain the widget
				url: "",  // url giving JSON data object.  Overrides "data" config option 
				ajaxData: {}, //params for AJAX request
            	data: [] // data array of objects. Each object is:
					//{value: <option> value, text: <option> text, selected: true|false} 
		    };
            
		    config = $.extend({}, defaults, config || {});
		    
	            if (config.url) {
		        return $.getJSON(config.url, config.ajaxData, function(data) {
				    delete config.url;
				    delete config.ajaxData;
				    config.data = data;
				    return $sc.create(config);
				});
		    }
		    config.container = $(config.container);
	        var selectbox = $sc.createSelectbox(config);

	        return new $sc(selectbox, config);
		},
		*/
    	
		changeOptions: function($select) {
			$select = $($select);
	        $select.each(function() {
			    var sc = $(this).data("sexy-combo");
			    if(sc) {
				    sc.disable();
				    sc.populateFromMaster();
				    sc.undisable();
			    }

			});
		},
		
		undisable: function($select) {
		    $select = $($select);
			$select.each(function() {
			    var sc = $(this).data("sexy-combo");
			    if(sc) sc.undisable();
			});

		},
		
		disable: function($select) {
		    $select = $($select);
			$select.each(function() {
			    var sc = $(this).data("sexy-combo");
			    if(sc) sc.disable();
			});
		},
		
		revertSelected: function($select) {
		    $select = $($select);
			$select.each(function() {
			    var sc = $(this).data("sexy-combo");
			    if(sc) sc.revertSelected();
			});
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
	
})(jQuery);

/* END */