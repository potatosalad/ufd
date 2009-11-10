/***************************************************************************
 *                                                                         *
 *	sexy-combo @VERSION	: A jQuery date time picker.
 *                                                                         *
 *	Authors:                                                               *
 *		Kadalashvili.Vladimir@gmail.com - Vladimir Kadalashvili            *
 *		thetoolman@gmail.com                                               * 
 *                                                                         *
 *	Version: @VERSION
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
		//console.time("init");
        this.each(function() {
			if ("SELECT" != this.tagName.toUpperCase())  return;	
		    var sc = new $sc(this, config);
		    
		    $(this).data("sexy-combo", sc);
	    });  
		//console.timeEnd("init");
        
        return this;
    };
    
    var defaults = {

		skin: "sexy", //skin name
		suffix: "__sexyCombo", // original select name + suffix == pseudo-dropdown text input name (unless switchNames = false)  
		switchNames: false, // if false, original select name preserved,  pseudo-dropdown text input gets name + suffix.  Good for (key,value)-> value submit
		triggerSelected: true, //selected option of the selectbox will be the initial value of the combo
		
		emptyText: "", //if provided, value of text input when it has no value and focus
		defaultValue: "", // selectbox value to select if no match found - can we unselect all?
		delayFilter: ($.support.style) ? 0 : 150, //msec to wait before re-filter; ie needs bigger for performance
		caseSensitive: false, // case sensitive search ?
		autoFill: false, //enable autofilling 
		dropUp: false, //if true, the options list will be placed above text input
		zIndexPopup: 100, // dropdown z-index
		
		key: "value", //key json name for key/value pair
		value: "text", //value json for key/value pair
	
		//DEPRECATED
		separator: ",", //separator for values of multiple combos
		checkWidth: false, //DEPRECATED; auto width to match select
		filterFn: null, //DEPRECATED; internal filter only ATM
		hiddenSuffix: "__DEPRECaTED", //DEPRECATED; will now manipulate original select box
		initialHiddenValue: "", //DEPRECATED initial / default hidden field value;  Also applied when no match typing
		
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
	    
        //console.time("setup");
	    
        this.config = $.extend({}, defaults, config || {}); 

        this.selectbox = $(selectbox);

        var selectName = this.selectbox.attr("name");
        var suffixName = selectName + this.config.suffix;
        if(this.config.switchNames) this.selectbox.attr("name", suffixName);

	    this.wrapper = this.selectbox.wrap("<span>").
		    parent().
		    addClass("combo").
		    addClass(this.config.skin); 

	    this.input = $("<input type='text' />").
		    appendTo(this.wrapper).
		    attr("autocomplete", "off").
		    attr("value", "").
		    attr("name", this.config.switchNames ? selectName : suffixName);
	    
        this.icon = $('<div class="icon"/>').
		    appendTo(this.wrapper); 
	
	    this.listWrapper = $('<div class="list-wrapper"/>').
		    appendTo(this.wrapper);

	    
	    this.updateDrop();
	    this.isDisabled = false;
	    this.internalFocus = false; 
	    this.list = $("<ul />").appendTo(this.listWrapper); 
	    var self = this;
		
		
		this.populateFromSelect();
	    
	    this.singleItemHeight = this.listItems.outerHeight();
	    this.listWrapper.addClass("invisible");

	    this.lastKey = null;
	    this.multiple = this.selectbox.attr("multiple");
	    var self = this;

	    this.wrapper.data("sc:lastEvent", "click");
	    this.overflowCSS = "overflowY";
	
	    if ((this.config.checkWidth) && (this.listWrapper.innerWidth() < maxOptionWidth)) {
		    this.overflowCSS = "overflow";	
		}
		
	    this.filter(); //prep in case icon clicked first
	    
	    this.notify("init");
	    this.initEvents();
	    //console.timeEnd("setup");
    };
    
    //shortcuts
    var $sc = $.sexyCombo;
    $sc.fn = $sc.prototype = {};
    $sc.fn.extend = $sc.extend = $.extend;
    
    // jquery functions
    $sc.fn.extend({
	    
        initEvents: function() { //initialize all event listeners
	        var self = this;
	        
	        // wrapper
	        this.wrapper.bind("click", function(e) {
	        	if (!self.wrapper.data("sc:positionY"))	{
	        		self.wrapper.data("sc:positionY", e.pageY);	 
	        	}									   
	        	self.wrapper.data("sc:lastEvent", "click");								
	        });					

	        this.wrapper.bind("keyup", function(e) {
		        var k = (e.keyCode) ? e.keyCode : e.which ;
		        for (key in $sc.KEY) {
		            if ($sc.KEY[key] == k) {
			            return;	
			        }
		        }
	            self.wrapper.data("sc:lastEvent", "key");	
	        });	
	
	        // input
	        this.input.bind("click", function(e) {
	            if (!self.wrapper.data("sc:positionY"))	{
		            self.wrapper.data("sc:positionY", e.pageY);	    	
		        }								 
	            self.wrapper.data("sc:lastEvent", "click");	
	            self.icon.trigger("click");
	        });

	        this.input.bind("focus", function(e) {
	        	console.log("input focus");
	            if(!self.internalFocus){
	            	self.justGotRealFocus();
	            }
	           	self.internalFocus = true;
	        });
	        
	        
			this.input.bind("keydown", function(e) {
	        	//console.log("down" + e.keyCode);
		        var k = (e.keyCode) ? e.keyCode : e.which ;
				//console.log("keydown: " + k);
				if ($sc.KEY.TAB == k) {
					//e.preventDefault();
					self.keyUp(e); //prepare for loosing focus
					
				}
			});

			this.input.bind("keypress", function(e) {
	        	//console.log("press" + e.keyCode);
		        var k = (e.keyCode) ? e.keyCode : e.which ;
				//console.log("keypress: " + k);
	            return; //never needed
				if ($sc.KEY.RETURN == k) {
	               // e.preventDefault();
			    }
		        if ($sc.KEY.TAB == k) {
			        //e.preventDefault();
		        }
	        });
	
			this.input.bind("keyup", function(e) {
	        	//console.log("up" + e.keyCode);
				
		        var k = (e.keyCode) ? e.keyCode : e.which ;
				//console.log("keyup: " + k);
				if ($sc.KEY.TAB != k) { //don't propagate incoming tab press, as iE6 doesn't send
					self.wrapper.data("sc:lastEvent", "key");							                
					self.keyUp(e);
				}
			});	
			
		
			
	        // icon
	        this.icon.bind("mouseover", function(e) {
	            self.icon.addClass("hover");
	        }); 

	        this.icon.bind("mouseout", function(e) {
	            self.icon.removeClass("hover");
	        }); 
	        
	        
			this.icon.bind("click", function(e) {
	        	console.log("icon click");
				
	        	if (!self.wrapper.data("sc:positionY"))	{
	        		self.wrapper.data("sc:positionY", e.pageY);	    	
	        	}
		        self.wrapper.data("sc:lastEvent", "click");
	            self.iconClick();
	        }); 
	    
	        // click anywhere else
	        $(document).bind("click", function(e) {
	            if ((self.icon.get(0) == e.target) || (self.input.get(0) == e.target)) return;
				
	            self.aboutToLooseFocus();
				
	        });
	        
	        //final setup
	        this.initListEvents();
	        this.applyEmptyText();
			this.notify("initEvents");
	    },
	    
	    justGotRealFocus: function() {
        	console.log("real input focus");
	    	
	    	this.showList();
	    },

	    aboutToLooseFocus: function() {
        	console.log("loosing focus");
	    	
			if (this.tryUpdateMaster()){
				//do nothing
			} else {
        		this.revertSelected(); //revert to old value
			}

	    	this.hideList();    
	    	this.internalFocus = false;
	    },
	    
        initListEvents: function() { //initialize all event listeners
			var self = this;
			//console.log("initListEvents");
	        // list items
	        this.listItems.bind("mouseover", function(e) {
				if ("LI" == e.target.nodeName.toUpperCase()) {
				    self.highlight(e.target);	
				}
				else { //span click
				    self.highlight($(e.target).parent());	
				}
	        });
	    
	        this.listItems.bind("click", function(e) {
	            self.listItemClick($(e.target));
	            e.stopPropagation(); //prevent bubbling to document binding below
	        });
		},
			
		keyUp: function(e) {
		    this.lastKey = (e.keyCode) ? e.keyCode : e.which ;
		    
		    //console.log(this.lastKey);
		    var k = $sc.KEY;
		    switch (this.lastKey) {
		        case k.RETURN:
		        	if( this.tryUpdateMaster() ) {
		        		// do nothing
		        	} else {
		        		this.revertSelected(); //revert to old value
		        	}
		        	
		        	this.resetItemVisibility();
					this.hideList();
		        	break;
				case k.TAB: //only outgoing, ie6 doesn't signal incoming TAB
					this.aboutToLooseFocus();
					break;
				case k.DOWN:
				    this.highlightNext();
				    break;
				case k.UP:
				    this.highlightPrev();
				    break;
				case k.ESC:
				    this.hideList();
				    break;
				default:
				    this.inputChanged();
					break;
		    }
		},

	    getCurrentTextValue: function() {
            return this.__getCurrentValue("input");
	    },

	    __getCurrentValue: function(prop) {
	        prop = this[prop];
	        if (!this.multiple)  return $.trim(prop.val());
	    },
	
	    iconClick: function() {
	    	//console.log("clickIcon");
	    	if(this.isDisabled) {
	    		return;
	    	}
	        if (this.listVisible()) { 
	            this.hideList();
			    this.input.blur();
		    }
	        else {	
	            this.showList();
			    this.input.focus();
	            if (this.input.val().length) {
		            this.selection(this.input.get(0), 0, this.input.val().length);    	
		        }			
		    }          
	    },
	
	    //returns true when dropdown list is visible
	    listVisible: function() {
        	console.log("is list visible?");
	    	
	        return this.listWrapper.hasClass("visible");
	    },
	
	    //shows dropdown list
	    showList: function() {
        	console.log("showlist");
	    	
	        if (this.trie.matches && !this.trie.matches.length);
	        
	        this.listWrapper.removeClass("invisible").addClass("visible");
	        this.wrapper.css("zIndex", this.config.zIndexPopup);
	        this.listWrapper.css("zIndex", this.config.zIndexPopup);
	        this.setListHeight();
	        
	        var listHeight = this.listWrapper.height();
		    var inputHeight = this.wrapper.height();
		    var bottomPos = parseInt(this.wrapper.data("sc:positionY")) + inputHeight + listHeight;
		    var maxShown = $(window).height() + $(document).scrollTop();
		    if (bottomPos > maxShown) {
		        this.setDropUp(true); 
		    }
		    else {
		        this.setDropUp(false);	
		    }

		    
		    if ("" == $.trim(this.input.val())) {
	            this.resetActive();
	            this.listWrapper.scrollTop(0);
			}
			else {
			    this.highlightSelected();	
			}
		    
		    this.notify("showList");
	    },
	
	    //hides dropdown list
	    hideList: function() {
        	console.log("hide list");
	    	
	        if (this.listWrapper.hasClass("invisible")) return;
	        
	        this.listWrapper.removeClass("visible").addClass("invisible");
	        this.wrapper.css("zIndex", "0");
	        this.listWrapper.css("zIndex", this.config.zIndexPopup);	
	        this.notify("hideList");
	    },
	
	    //returns sum of all visible items height
	    getListItemsHeight: function() {
        	console.log("get items height");
	    	
			var itemHeight = this.singleItemHeight;
	        return itemHeight * this.listLength();
	    },
	
	    //changes list wrapper's overflow from hidden to scroll and vice versa (depending on list items height))
	    setOverflow: function() {
        	console.log("set overflow");

	    	var maxHeight = this.getListMaxHeight();
		    
	        if (this.getListItemsHeight() > maxHeight) {
	            this.listWrapper.css(this.overflowCSS, "scroll");
	        } else {
	            this.listWrapper.css(this.overflowCSS, "hidden");
	        }
	    },
	
	    //highlights active item of the dropdown list
	    highlight: function(activeItem) {
        	console.log("hilight");
	    	
	        if (($sc.KEY.DOWN == this.lastKey) || ($sc.KEY.UP == this.lastKey)) return;
	        this.listItems.removeClass("active"); //slow?  
	        $(activeItem).addClass("active");
	    },

	    // attempt update; clear input or set default if fail:
	    tryUpdateMaster: function() {
	    	console.log("t.u.m");

	    	if(this.trie.matches.length == 0) {
	    		return false;
	    	} 
	    	
	    	var active = this.getActive().get(0);
	    	
        	if (active != null) {
        		var node = $(active).data("optionNode");
		        if(node == null) { //shouldnt happen 
		        	console.log("shouldnt happen");
		        	return false;
		        }
		        this.hideList();
		        this.input.removeClass("empty");

		        var curVal = this.selectbox.val();
		        console.log("updating selectbox from: " + curVal);
		        this.selectbox.val([node.value]);
		        if(this.selectbox.val() != node.value){ //set failed
			        this.selectbox.val([curVal]); 
			        console.log("fail");
			        return false;
		        }

		        
		        this.input.val(node.text);
		        this.selectAll();

		        this.selectbox.trigger("change");
		        this.notify("textChange");
		        
		        return true;
        	}
	        	
	    },
	    
	    //sets hidden select value, takes text input's value as a param
	    OLDsetHiddenSelect: function(val) {
        	console.log("setHidden");

	        var set = false;
	        val = $.trim(val);
	        var oldVal = this.selectbox.val();
	        
        	if(this.trie.matches.length == 1) {
        		var val = $(this.trie.matches[0]).data("optionNode").value;
        		console.log("hideenselect");
        		console.trace();
        		this.selectbox.val( val );
        		set = true;
        	}
	    
		    //if (!set) this.selectbox.val(this.config.defaultValue);

		    if (oldVal != this.selectbox.val()){ 
			    this.notify("change");
				this.selectbox.trigger("change");
		    }
			
		},

	    
	    selectAll: function() {
	        this.selection(this.input.get(0), 0, this.input.val().length);
	    },


	    listItemClick: function(item) {
        	console.log("listitemclick: more work");
	    	//TODO set item
	        this.tryUpdateMaster();
	        this.inputFocus();
	    },
	
        setAttr: function(array, attr, val ) { //fast attribute setting
        	for(nodePtr in array) {
        		array[nodePtr].setAttribute(attr, val);
        	}
        },
        
        populateFromSelect: function() {
        	console.log("p.o.s");
        	
    		this.options = this.selectbox.children("option");
    		this.trie = new Trie(this.config.caseSensitive);
    		this.trie.matches = [];
    		this.trie.misses = [];
    		var self = this;
    		
    	    // copy all rows
    		
			this.list.html(""); //delete old ones - ok considering nodes etc ?
			
    		this.options.each(function() {					   
    	    	var optionText = $.trim($(this).text());
                var newItem = $('<li class="visible"><span>' + optionText + '</span></li>').
    	            appendTo(self.list);

                newItem.data("optionNode", this);
                self.trie.add(optionText, newItem.get(0));

                if (self.config.checkWidth) {
    			   // optWidths.push(newItem.find("span").outerWidth());	
    			}
    	    });
    		
			this.listItems = this.list.children();
			this.initListEvents();
			
    	    if(this.config.triggerSelected)this.revertSelected();

    	    //match original width
    	    var iconWidth = this.icon.outerWidth();
    	    var selectboxWidth = this.selectbox.outerWidth(); //show first for FF ?
    	    var inputBP = this.input.outerWidth() - this.input.width();
    	    var inputWidth = selectboxWidth - iconWidth - inputBP;
    	    var listWrapBP = this.listWrapper.outerWidth() - this.listWrapper.width();

    	    this.input.width(inputWidth);
    	    this.wrapper.width(selectboxWidth);
    	    this.listWrapper.width(selectboxWidth - listWrapBP);
    	    
    	    // copy listed css properties from select to container
    	    var props = ["marginLeft","marginTop","marginRight","marginBottom"];
    	    for(propPtr in props){
    	    	var prop = props[propPtr];
    	    	this.wrapper.css(prop, this.selectbox.css(prop));
    	    }
    	    
        },
	    
	    //adds / removes items to / from the dropdown list depending on combo's current value
	    filter: function() {
        	console.log("filter");
        	
	        var self = this;
	        
	        var mm = self.trie.findPrefixMatchesAndMisses(self.getCurrentTextValue());
	        //2 x array of dom nodes
	        self.trie.matches = mm.matches;
	        self.trie.misses = mm.misses;
	        //console.log(self.getCurrentTextValue() + ": matchesLength: " + mm.matches.length + " missesLength: " + mm.misses.length );
	        self.setAttr(mm.matches, $sc.classAttr,"visible" );
	        if(mm.matches.length) {
		        self.setAttr(mm.misses, $sc.classAttr,"invisible" );
	        } else { //no matches, show all
		        self.setAttr(mm.misses, $sc.classAttr,"visible" );
	        }

	        self.setOverflow();
	        self.setListHeight();
	    },
		
		//just returns integer value of list wrapper's max-height property
		getListMaxHeight: function() {
        	console.log("get listmaxheight");
	    	
			var result = parseInt(this.listWrapper.css("maxHeight"), 10);
			if (isNaN(result)) {
			    result = this.singleItemHeight * 10;	
			}
			return result;
		},
		
		//corrects list wrapper's height depending on list items height
		setListHeight: function() {
        	console.log("set list height");
			
		    var liHeight = this.getListItemsHeight();
		    var maxHeight = this.getListMaxHeight();
		    var listHeight = this.listWrapper.height();
	
		    if (liHeight < listHeight) {
		        this.listWrapper.height(liHeight); 
				return liHeight;
	
		    } else if (liHeight > listHeight) {
		        this.listWrapper.height(Math.min(maxHeight, liHeight));
				return Math.min(maxHeight, liHeight);
		    }
		},
		
		//returns active (hovered) element of the dropdown list
		getActive: function() {
        	console.log("get active");
			
			return this.listItems.filter(".active:first"); //TODO used cached visible list
		},

		getActiveOptionNode: function() {
        	console.log("get activeOptionNode");

	    	var active = this.getActive().get(0);
	    	if (active != null) {
	    		return $(active).data("optionNode");
	        }
    	},
    	
    	resetItemVisibility: function() {
        	console.log("resetitemvisibility");
    		this.listItems.removeClass("invisible").addClass("visible");
    	},

    	resetActive: function() {
        	console.log("resetActive");
    		this.listItems.removeClass("active").filter(".visible:first").addClass("active");
    	},
		
		
		//returns number of currently visible list items
		listLength: function() {
			var length = (this.trie.matches.length) ? this.trie.matches.length : this.trie.misses.length;
        	console.log("list len " + length);
			return length;
		},
		
		//triggered when the user changes combo value by typing
		inputChanged: function() {
        	console.log("inputChanged");
			
			/*
			 * For performance reasons, this has 22 blocks that cascade on timeouts;
			 * Re-entry here will cancel after 1/2rd of method time, not whole method time. 
			 * 
			 * The "yield time" is enough for the program count to get back to sense and trigger 
			 * a new keypress if it has occurred, and re-call this method, cancelling the cascade.
			 */
			var self = this;
			var yieldTime = 3;

			//cancel any yielding timeouts
			if(this.updateOnTimeout) clearTimeout(self.updateOnTimeout);
			if(this.filterOnTimeout) clearTimeout(self.filterOnTimeout);
			
			// defer till no typing for "delayFilter" msec.
			this.filterOnTimeout = setTimeout(function(){filter();}, this.config.delayFilter);
			
			var filter = function () {
//				console.time("Filter");
				self.filter();
//				console.timeEnd("Filter");
				self.updateOnTimeout = setTimeout(function(){update();}, yieldTime); 
			};
			var update = function () {
//				console.time("Update");
			    if (self.listLength()) {
			    	self.setOverflow();
			    	self.setListHeight();
			    }
//				console.timeEnd("Update");
			};
		},
		
		highlightSelected: function() {
        	console.log("hilightselected");
			
	        //already clobbered :) this.listItems.removeClass("active");
			//var val = $.trim(this.input.val());
			
			try {
				/*
				this.listItems.each(function() {
				    var $this = $(this);
					if ($this.text() == val) {
					    $this.addClass("active");	
						self.listWrapper.scrollTop(0);
						self.scrollDown();
					}
				});
				*/
				
				/*is this even needed? maybe combos
				
				var matches = this.trie.findPrefixMatches(val);
				if(matches.length == 1) {
					$(matches[0]).addClass("active");	
					self.listWrapper.scrollTop(0);
					self.scrollDown();
					
				} else{
				*/
	
				//no match, must be partial input string; highlight first item
				this.resetActive();
	
			} catch (e) {}
		},
		
		//highlights list item before currently active item
		highlightPrev: function() {
        	console.log("hilightprev");
			
		    var $prev = this.getActive().prev();
		    
		    while ($prev.length && $prev.hasClass("invisible"))
		        $prev = $prev.prev();
			
	            if ($prev.length) {
			        this.getActive().removeClass("active");
					$prev.addClass("active");
					this.scrollUp();
					
	        		var node = $prev.data("optionNode");
			        if(node == null) {  
			        	console.log("shouldnt happen");
			        	return;
			        }
			        this.input.val(node.text);
			        return;
			    } // else hilight first	
			    this.resetActive();
			    
		},		
		
		//highlights item of the dropdown list next to the currently active item
		highlightNext: function() {
        	console.log("hilightnext");
			
		    var $next = this.getActive().next();
		    
		    while ($next.hasClass("invisible") && $next.length) {
		        $next = $next.next();
		    }
		    
		    if ($next.length) {
		        this.listItems.removeClass("active"); //slow!
				$next.addClass("active");
				this.scrollDown();
			
        		var node = $next.data("optionNode");
		        if(node == null) { 
		        	console.log("shouldnt happen");
		        	return false;
		        }
		        this.input.val(node.text);
		        return;
		    } //else hilight first
		    this.resetActive();
		    
		},
		
		//scrolls list wrapper down when needed
		scrollDown: function() {
        	console.log("scrollldown");
			
		    if ("scroll" != this.listWrapper.css(this.overflowCSS))
		        return;
			
	            var beforeActive = this.getActiveIndex() + 1;
				/*if ($.browser.opera)
				    ++beforeActive;*/
		    
		    var minScroll = this.listItems.outerHeight() * beforeActive - this.listWrapper.height();
	        
			if ($.browser.msie)
	            minScroll += beforeActive;
		    
		    if (this.listWrapper.scrollTop() < minScroll)
		        this.listWrapper.scrollTop(minScroll);
		},
		

		
		//returns index of currently active list item
		getActiveIndex: function() {
        	console.log("get activeindex");
			
		    return $.inArray(this.getActive().get(0), this.listItems.filter(".visible").get());
		},
		
		
		//scrolls list wrapper up when needed
		scrollUp: function() {
        	console.log("scrollup");

		    if ("scroll" != this.listWrapper.css(this.overflowCSS))
		        return;
			
		    var maxScroll = this.getActiveIndex() * this.listItems.outerHeight();
		    
		    if (this.listWrapper.scrollTop() > maxScroll) {
		        this.listWrapper.scrollTop(maxScroll);
		    }     
		},
		
		//emptyText stuff
		applyEmptyText: function() {
        	console.log("appplyempty");
			
		    if (!this.config.emptyText.length)
		        return;
			
		    var self = this;	
		    this.input.bind("focus", function() {
		    	self.inputFocus();
		    }).bind("blur", function() {
		    	self.inputBlur();
		    });	
		    
		    if ("" == this.input.val()) {
		        this.input.addClass("empty").val(this.config.emptyText);
		    }
		},
		
		inputFocus: function() {
        	console.log("inputFocus torename");
			
		    if (this.input.hasClass("empty")) {
		    	this.input.removeClass("empty").val("");
	        }
		},
		
		inputBlur: function() {
        	console.log("inputblur torename");
		    if ("" == this.input.val()) {
		    	this.input.addClass("empty").val(this.config.emptyText);
		    }
		},
		
		revertSelected: function() {
			var val = this.selectbox.children("option:selected").text();
			console.log("reverting to: " + val);
			//TODO need to call update 
			this.input.val(val);
		},

		disable: function() {
        	console.log("dissable");
			
			this.hideList();
			this.isDisabled = true;
			this.icon.addClass("disabled");
			this.input.addClass("disabled");
			this.input.attr("disabled", "disabled");
		},
		
		undisable: function() {
        	console.log("undisable");
			
			this.isDisabled = false;
			this.icon.removeClass("disabled");
			this.input.removeClass("disabled");
			this.input.removeAttr("disabled");
		},
		
		autoFill: function() {
			
		    if (!this.config.autoFill || ($sc.KEY.BACKSPACE == this.lastKey) || this.multiple) return;
		    console.log("autofill");
			    	
		    var curVal = this.input.val();
		    var newVal = this.getActive().text();
		    this.input.val(newVal);
		    this.selection(this.input.get(0), curVal.length, newVal.length);
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
		
		//for internal use
		updateDrop: function() {
		    if (this.config.dropUp) {
		        this.listWrapper.addClass("list-wrapper-up");
		    } else {
		        this.listWrapper.removeClass("list-wrapper-up");	
		    }
		},
		
		//updates dropUp config option
		setDropUp: function(drop) {
	        this.config.dropUp = drop;   
		    this.updateDrop(); 
		},
		
		notify: function(evt) {
		    if (!$.isFunction(this.config[evt + "Callback"])) return;
		    this.config[evt + "Callback"].call(this);	
		}
	
    });
    
    
    // static $.sexycombo functions
    $sc.extend({
    	KEY: { //key codes
		    UP: 38,
		    DOWN: 40,
		    DEL: 46,
		    TAB: 9,
		    RETURN: 13,
		    ESC: 27,
		    COMMA: 188,
		    PAGEUP: 33,
		    PAGEDOWN: 34,
		    BACKSPACE: 8	
    	},
    	
    	classAttr: (($.support.style) ? "class" : "className"),  // IE6/7 class property

		log: function(msg) {
		    var $log = $("#log");
		    $log.html($log.html() + msg + "<br />");
		},
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
				    sc.populateFromSelect();
				    sc.filter();
				    sc.undisable();
				    
					sc.wrapper.data("sc:optionsChanged", "yes");
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
		},

		
		__normalizeArray: function(arr) {
		    var result = [];
		    var len = arr.length;
		    for (var i = 0; i < len; ++i) {
		        if ("" == arr[i]) continue;
		        result.push(arr[i]);    
		    }
		    return result;
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
        curNode[0] = object;
    };

    /**
     * Find object exactly matching key (String)
     */
	Trie.prototype.find = function( key ) {
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

		return {
			matches : matches,
			misses : misses
		};
	};
	
})(jQuery); 
