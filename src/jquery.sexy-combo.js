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
		suffix: "__sexyCombo", // original select name + suffix == pseudo-dropdown text input name  
		logSelector: "#log", // selector string to write log into
		dropDownID: "sexyComboDDC", //if provided, value of text input when it has no value and focus

		switchNames: false, // if false, original select name preserved,  pseudo-dropdown text input gets name + suffix. 
		triggerSelected: true, //selected option of the selectbox will be the initial value of the combo
		caseSensitive: false, // case sensitive search ?
		autoFill: false, //enable autofilling 
		dropUp: false, //if true, the options list will be placed above text input
		AllowLR: false, //show horizontal scrollbar

		delayFilter: ($.support.style) ? 0 : 150, //msec to wait before re-filter; ie needs bigger for performance
		zIndexPopup: 101, // dropdown z-index
		
		key: "value", //key json name for key/value pair
		value: "text", //value json for key/value pair
		checkWidth: false, //DEPRECATED; auto width to match select
	
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
        this.config = $.extend({}, defaults, config || {}); 

        // in place content
        this.selectbox = $(selectbox);
        this.originalSelectboxWidth = this.selectbox.outerWidth(); //get size *before* its wrapped, in case of % width 
        var selectName = this.selectbox.attr("name");
        var suffixName = selectName + this.config.suffix;
        if(this.config.switchNames) this.selectbox.attr("name", suffixName);

	    this.wrapper = this.selectbox.wrap("<span>").parent().
		    addClass("combo").
		    addClass(this.config.skin); 

	    this.input = $("<input type='text' />").
		    appendTo(this.wrapper).
		    attr("autocomplete", "off").
		    attr("value", "").
		    attr("name", this.config.switchNames ? selectName : suffixName);
	    
        this.icon = $('<div class="icon"/>').
		    appendTo(this.wrapper); 
        
        // drop down content
        var ddc = this.getDropdownContainer();
        
	    this.listWrapper = $('<div class="list-wrapper"/>').
	    	addClass("invisible").
	    	appendTo(ddc);
	    
	    this.listWrapper.wrap("<div>").parent().
	    addClass(this.config.skin);

	    this.list = $("<ul />").appendTo(this.listWrapper); 

	    this.isDisabled = false;
	    this.internalFocus = false; 
	    this.lastKey = null;
	    this.logNode = $(this.config.logSelector);
	    this.overflowCSS = this.config.allowLR ? "overflow" : "overflowY";
	    
		this.populateFromMaster();
		this.updateDrop();

		
	    this.notify("init");
	    this.initEvents();
        this.initListEvents();
    };
    
    //shortcuts
    var $sc = $.sexyCombo;
    $sc.fn = $sc.prototype = {};
    $sc.fn.extend = $sc.extend = $.extend;
    
    // jquery functions
    $sc.fn.extend({
	    
		key: function(key, isKeyUp) {
		    this.lastKey = key;
		    var k = $sc.KEY;
		    
		    //only keyups excluding tab, and tab down only
		    if(!isKeyUp == (key != k.TAB)) return;
		    this.log("Key: " + key + " isKeyUp?: " + isKeyUp);
		    
		    switch (key) {
		        case k.RETURN:
		        	this.hideList();
		        	this.tryToSetMaster();
		        	break;
		        	
				case k.TAB: 
					this.realLooseFocus();
					break;
					
				case k.DOWN:
				    this.selectNext();
				    break;
				    
				case k.UP:
				    this.selectPrev();
				    break;
				    
				case k.ESC:
				    this.hideList();
				    this.revertSelected();
				    break;
				    
				default:
					var finish = this.filter(0);
				    if (finish && this.listVisible()) {
				    	this.setOverflow();
				    	this.setListHeight();
				    }
					break;
		    }
		},

        initEvents: function() { //initialize all event listeners
	        var self = this;
			this.log("initEvents");

	        this.selectbox.bind("change", function(e) {
	        	self.log("master changed; reverting");
	        	self.revertSelected();
	        });
			
			
	        this.input.bind("click", function(e) {
	        	self.log("input click");
	            if(!self.internalFocus) {
	            	self.realFocusEvent();
	            }
	        });

	        this.input.bind("focus", function(e) {
	        	self.log("input focus");
	            if(!self.internalFocus){
	            	self.realFocusEvent();
	            }
	        });

			this.input.bind("keydown", function(e) {
		        var k = self.getKeyCode(e);
				self.key(k, false);
			});
	
			this.input.bind("keyup", function(e) {
		        var k = self.getKeyCode(e, true);
				self.key(k, true);
			});	
			
	        this.icon.bind("mouseover", function(e) { self.icon.addClass("hover"); }); 
	        this.icon.bind("mouseout",  function(e) { self.icon.removeClass("hover"); }); 
	        this.icon.bind("mousedown", function(e) { self.icon.addClass("mouseDown"); }); 
	        this.icon.bind("mouseup",   function(e) { self.icon.removeClass("mouseDown"); }); 
			this.icon.bind("click", function(e) {
	        	self.log("icon click: " + e.target);
	            self.iconClick();
	        }); 
	    
	        // click anywhere else
	        $(document).bind("click", function(e) {
	            if ((self.icon.get(0) == e.target) || (self.input.get(0) == e.target)){
	            	return false;
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
	        	self.log("item click");
	            self.listItemClick($(e.target)); //TODO can be span or LI ?
	            self.stopEvent(e); //prevent bubbling to document onclick binding etc
	        });
	        
		},
	    
	    realFocusEvent: function() {
        	this.log("real input focus");
	    	this.internalFocus = true;
	    	this.filter(1); //show all even tho one is selected
	    	this.showList();
		    this.inputFocus();
	    	
	    },

	    realLooseFocus: function() {
        	this.log("real loose focus (blur)");
        	this.tryToSetMaster();
        	this.hideList();  
	    	this.internalFocus = false;
	    },

		inputFocus: function() {
        	this.log("inputFocus: restore input component focus");
        	this.input.focus();

            if (this.getCurrentTextValue().length) {
	            this.selectAll();    	
	        }			
        	
            /* 
 		    if (this.input.hasClass("empty")) {
		    	this.input.removeClass("empty").val("");
	        } */
		},
		
		inputBlur: function() {
        	this.log("inputBlur: loose input component focus");
        	this.input.blur();
		},	    
	    
	    iconClick: function() {
	    	this.log("clickIcon");
	    	if(this.isDisabled) return;

	        if (this.listVisible()) { 
	            this.hideList();
			    this.inputFocus();
			    
		    } else {	
		    	this.filter(1); //show all even tho one is selected
	            this.showList();
			    this.inputFocus();
		    }          
	    },
	
	    listVisible: function() {
	        var isVisible = this.listWrapper.hasClass("visible");
	        this.log("is list visible?: " + isVisible);
	        return isVisible;
	    },
	
	    showList: function() {
        	this.log("showlist");
        	if(this.listVisible()) return;
        	
        	var offset = this.input.offset(); 
        	this.listWrapper.css("left",offset.left);
        	
        	if(this.config.dropUp) {
	        	this.listWrapper.css("top", (offset.top - this.listWrapper.height()) );
        	} else {
	        	this.listWrapper.css("top", (offset.top + this.input.outerHeight()) );
	    	}
	    
	        this.listWrapper.removeClass("invisible").addClass("visible");
	        this.setListHeight();

	        /*
	        var listHeight = this.listWrapper.height();
		    var inputHeight = this.wrapper.height();
		    var bottomPos = parseInt(this.wrapper.data("sc:positionY")) + inputHeight + listHeight;
		    var maxShown = $(window).height() + $(document).scrollTop();
	        this.config.dropUp = (bottomPos > maxShown) ;
		    this.updateDrop(); 
		    */ 
			
		    this.notify("showList");
	    },
	
	    hideList: function() {
        	this.log("hide list");
        	if(!this.listVisible()) return;
	        
	        this.listWrapper.removeClass("visible").addClass("invisible");
	        this.listItems.removeClass("invisible"); //slow?  
	        

	        this.notify("hideList");
	    },

	    

	    // attempt update; clear input or set default if fail:
	    tryToSetMaster: function() {
	    	this.log("t.s.m");

	    	if(this.trie.matches.length == 0) return false; // no match
	    	
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

	        var curVal = this.selectbox.val();
	        this.selectbox.val([node.value]);
	        if(this.selectbox.val() != node.value){ //set failed
		        this.selectbox.val([curVal]); 
		        this.log("set new master selected failed.");
		        return false;
	        }
	        
	        this.log("master selectbox set to: " + node.value);
	        this.selectbox.trigger("change");

	        this.notify("textChange");
	        return true;
	    },

	    
	    selectAll: function() {
	        this.selection(this.input.get(0), 0, this.input.val().length);
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
	        	this.filter(1);
	        	this.hideList();
	        }
	        this.inputFocus();
	    },
	
        setAttr: function(array, attr, val ) { //fast attribute OVERWRITE
        	for(nodePtr in array) {
        		array[nodePtr].setAttribute(attr, val);
        	}
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
                var newItem = $('<li class="visible"><span>' + optionText + '</span></li>').appendTo(self.list);
                newItem.data("optionNode", this);
                self.trie.add(optionText, newItem.get(0));
    	    });
    		
			this.listItems = this.list.children();
			this.initListEvents();
			
    	    if(this.config.triggerSelected){
    	    	this.revertSelected();
    	    } else {
    	    	this.input.val(""); //better tecqnique?
    	    }
    	    
    	    //match original width
    	    var iconWidth = this.icon.outerWidth();
    	    // this.selectbox.show();
    	    var originalSelectboxWidth = this.originalSelectboxWidth; 
    	    // this.selectbox.hide();
    	    var inputBP = this.input.outerWidth() - this.input.width();
    	    var inputWidth = originalSelectboxWidth - iconWidth - inputBP;
    	    var listWrapBP = this.listWrapper.outerWidth() - this.listWrapper.width();

    	    this.input.width(inputWidth);
    	    this.wrapper.width(originalSelectboxWidth);
    	    this.listWrapper.width(originalSelectboxWidth - listWrapBP);
    	    
    	    this.log(originalSelectboxWidth + " : " + inputWidth + " : " + iconWidth + " : " + (originalSelectboxWidth - listWrapBP));
    	    
    	    // copy listed css properties from select to container
    	    var props = ["marginLeft","marginTop","marginRight","marginBottom"];
    	    for(propPtr in props){
    	    	var prop = props[propPtr];
    	    	this.wrapper.css(prop, this.selectbox.css(prop));
    	    }

    	    //update height;
    	    this.listWrapper.removeClass("invisible");
    	    this.singleItemHeight = this.listItems.outerHeight();
    	    this.listWrapper.addClass("invisible");
    	    
    	    
    	    this.undisable();
    	    
        },
	    
	    //adds / removes items to / from the dropdown list depending on combo's current value
	    filter: function(showAllLength) {
        	this.log("filter: " + showAllLength);
        	
	        var self = this;
	        var mm = self.trie.findPrefixMatchesAndMisses(self.getCurrentTextValue()); // search!

	        // mm has 2 x array of dom nodes
	        self.trie.matches = mm.matches;
	        self.trie.misses = mm.misses;
	        
	        this.log(self.getCurrentTextValue() + ": matchesLength: " + mm.matches.length + " missesLength: " + mm.misses.length );
	        
	        self.setAttr(mm.matches, $sc.classAttr,"visible" );
	        if(mm.matches.length <= showAllLength) { //
	        	self.setAttr(mm.misses, $sc.classAttr,"visible" );
	        } else {
	        	self.setAttr(mm.misses, $sc.classAttr,"invisible" );
	        }

	        self.setOverflow();
	        self.setListHeight();
	        return true; // finished !
	    },
		
		//just returns integer value of list wrapper's max-height property
		getListMaxHeight: function() {
        	this.log("get listmaxheight");
	    	
			var result = parseInt(this.listWrapper.css("maxHeight"), 10);
			if (isNaN(result)) {
			    result = this.singleItemHeight * 10;	
			}
			return result;
		},
		
		//corrects list wrapper's height depending on list items height
		setListHeight: function() {
        	this.log("set list height");
			return;
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
    	
    	resetItemVisibility: function() {
        	this.log("resetitemvisibility");
    		this.listItems.removeClass("invisible").addClass("visible");
    	},

    	resetActive: function() {
        	this.log("resetActive");
    		this.listItems.removeClass("active").filter(".visible:first").addClass("active");
    	},
		
    	
	    //returns sum of all visible items height
	    getListItemsHeight: function() {
        	this.log("get items height");
	    	
			var itemHeight = this.singleItemHeight;
			this.log("heights: " + itemHeight + " : " + this.singleItemHeight);
	        return itemHeight * this.listLength();
	    },
	
	    //changes list wrapper's overflow from hidden to scroll and vice versa (depending on list items height))
	    setOverflow: function() {
        	this.log("set overflow");

	    	var maxHeight = this.getListMaxHeight();
	        this.log(this.getListItemsHeight() + "  :  " + maxHeight);
		    
	        if (this.getListItemsHeight() > maxHeight) {
	        	this.log("scroll");
	            this.listWrapper.css(this.overflowCSS, "scroll");
	        } else {
	        	this.log("hidden");
	            this.listWrapper.css(this.overflowCSS, "hidden");
	        }
	    },
		
		//returns number of currently visible list items
		listLength: function() {
			var length = (this.trie.matches.length) ? this.trie.matches.length : this.trie.misses.length;
        	this.log("list len " + length);
			return length;
		},
		

		
		revertSelected: function() {
			var option = this.selectbox.children("option:selected");
			var val = option.text();
			this.log("reverting to: " + val);
			this.input.val(val);
			this.filter(1);
		},
		
		
		//returns index of currently active list item
		getActiveIndex: function() {
        	this.log("get activeindex");
			
		    return $.inArray(this.getActive().get(0), this.listItems.filter(".visible").get());
		},
		
	    //highlights the item given
	    highlight: function(activeItem) {
        	//this.log("highlight");
	        this.listItems.removeClass("active"); //slow?  
	        $(activeItem).addClass("active");
	    },
	    
		
		//highlights list item before currently active item
		selectPrev: function() {
        	this.log("hilightprev");
			
		    var $prev = this.getActive().prev();
		    
		    while ($prev.length && $prev.hasClass("invisible"))
		        $prev = $prev.prev();
			
	            if ($prev.length) {
			        this.getActive().removeClass("active");
					$prev.addClass("active");
					this.scrollUp();
					
	        		var node = $prev.data("optionNode");
			        if(node == null) {  
			        	this.log("shouldnt happen");
			        	return;
			        }
			        this.input.val(node.text);
			        return;
			    } // else hilight first	
			    this.resetActive();
			    
		},		
		
		//highlights item of the dropdown list next to the currently active item
		selectNext: function() {
        	this.log("hilightnext");
			
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
		        	this.log("shouldnt happen");
		        	return false;
		        }
		        this.input.val(node.text);
		        return;
		    } //else hilight first
		    this.resetActive();
		    
		},
		
		//scrolls list wrapper down when needed
		scrollDown: function() {
        	this.log("scrollldown");
			
		    if ("scroll" != this.listWrapper.css(this.overflowCSS))
		        return;
			
	            var beforeActive = this.getActiveIndex() + 1;
				/*if ($.browser.opera) ++beforeActive;*/
		    
		    var minScroll = this.listItems.outerHeight() * beforeActive - this.listWrapper.height();
	        
			if ($.browser.msie) minScroll += beforeActive;
		    
		    if (this.listWrapper.scrollTop() < minScroll)
		        this.listWrapper.scrollTop(minScroll);
		},

		//scrolls list wrapper up when needed
		scrollUp: function() {
        	this.log("scrollup");

		    if ("scroll" != this.listWrapper.css(this.overflowCSS))
		        return;
			
		    var maxScroll = this.getActiveIndex() * this.listItems.outerHeight();
		    
		    if (this.listWrapper.scrollTop() > maxScroll) {
		        this.listWrapper.scrollTop(maxScroll);
		    }     
		},


	    getCurrentTextValue: function() {
	        return $.trim(this.input.val());
	    },
		
		
	    stopEvent: function(e) {
            e.cancelBubble = true;
            e.returnValue = false;

            if (e.stopPropagation) {
                    e.stopPropagation();
                    e.preventDefault();
            }
	    },
	    
	    getKeyCode: function(event, isKeyUp) {
    		var key = (event.keyCode) ? event.keyCode : event.which ? event.which : event.charCode;
    		this.log("key: " + key);
    		return key;
	    },
		
	    getDropdownContainer: function() {
	    	var ddc = $(this.config.dropDownID);
	    	if(!ddc.length) { //create
	    		ddc = $("<div></div>").appendTo("body").
	    		css("height", 0).
	    		css("z-index", this.config.zIndexPopup).
	    		attr("id", this.config.dropDownID);
	    	}
	    	return ddc;
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
		
		updateDrop: function() {
		    if (this.config.dropUp) {
		        this.listWrapper.addClass("list-wrapper-up");
		    } else {
		        this.listWrapper.removeClass("list-wrapper-up");	
		    }
		},
		
		log: function(msg) {
    		if(window.console && console.log) {  // firebug logger
    			console.log(msg);
    		}
		    if(this.logNode && this.logNode.length) {
		    	this.logNode.append("<div>" + msg + "</div>");
		    }
		},
		
		notify: function(evt) {
		    if (!$.isFunction(this.config[evt + "Callback"])) return;
		    this.config[evt + "Callback"].call(this);	
		},

		autoFill: function() {
		    if (!this.config.autoFill || ($sc.KEY.BACKSPACE == this.lastKey) ) return;
		    this.log("autofill");
			    	
		    var curVal = this.getCurrentTextValue();
		    var newVal = this.getActive().text();
		    this.input.val(newVal);
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

		return { matches : matches, misses : misses };
	};
	
})(jQuery); 

/* END */

/*

OLD stuff in case i need it

Apply to filter(0) :)

inputChanged: function() {
        	this.log("inputChanged");
			
			
			 * For performance reasons, this has 2 blocks that cascade on timeouts;
			 * Re-entry here can cancel after 1/2 method, not whole method time. 
			 * 
			 * The "yield time" is enough for the program count to get back to sense and trigger 
			 * a new keypress if it has occurred, and re-call this method, cancelling the cascade.
			 
			var self = this;
			var yieldTime = 3;

			//cancel any yielding timeouts
			if(this.updateOnTimeout) clearTimeout(self.updateOnTimeout);
			if(this.filterOnTimeout) clearTimeout(self.filterOnTimeout);
			
			// defer till no typing for "delayFilter" msec.
			this.filterOnTimeout = setTimeout(function(){filter();}, this.config.delayFilter);
			
			var filter = function () {
//				console.time("Filter");
				self.filter(0);
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
        	this.log("hilightselected");
			
	        //already clobbered :) this.listItems.removeClass("active");
			//var val = $.trim(this.input.val());
			
			try {
				
				this.listItems.each(function() {
				    var $this = $(this);
					if ($this.text() == val) {
					    $this.addClass("active");	
						self.listWrapper.scrollTop(0);
						self.scrollDown();
					}
				});
				
				
				is this even needed? maybe combos
				
				var matches = this.trie.findPrefixMatches(val);
				if(matches.length == 1) {
					$(matches[0]).addClass("active");	
					self.listWrapper.scrollTop(0);
					self.scrollDown();
					
				} else{
				
	
				//no match, must be partial input string; highlight first item
				this.resetActive();
	
			} catch (e) {}
		},
		



	    //sets hidden select value, takes text input's value as a param
	    OLDsetHiddenSelect: function(val) {
        	this.log("setHidden");

	        var set = false;
	        val = $.trim(val);
	        var oldVal = this.selectbox.val();
	        
        	if(this.trie.matches.length == 1) {
        		var val = $(this.trie.matches[0]).data("optionNode").value;
        		this.log("hideenselect");
        		this.selectbox.val( val );
        		set = true;
        	}
	    
		    //if (!set) this.selectbox.val(this.config.defaultValue);

		    if (oldVal != this.selectbox.val()){ 
			    this.notify("change");
				this.selectbox.trigger("change");
		    }
			
		},


		
		//emptyText stuff
		applyEmptyText: function() {
        	this.log("appplyempty");
			
		    if (!this.config.emptyText.length)
		        return;
			
		    var self = this;	
		    this.input.bind("focus", function() {
		    	self.inputFocus();
		    }).bind("blur", function() {
		    	self.inputBlur();
		    });	
		    
		    if ("" == this.getCurrentTextValue()) {
		        this.input.addClass("empty").val(this.config.emptyText);
		    }
		}

		//DEPRECATED
		defaultValue: "", // selectbox value to select if no match found - now reverts to current setting
		separator: ",", //separator for values of multiple combos
		filterFn: null, //DEPRECATED; internal filter only ATM
		hiddenSuffix: "__DEPRECaTED", //DEPRECATED; will now manipulate original select box
		initialHiddenValue: "", //DEPRECATED initial / default hidden field value;  Also applied when no match typing
		emptyText: "", //if provided, value of text input when it has no value and focus
		
		
		
		
	*/