module("trie");




test("trie-many-prefix", function() {

	var dataSource = {
			"cab": {},
			"car": {},
			"cat": {},
			"catch": {}
	};
	
	var trie = new $.ui.ufd.getNewTrie(false, true);
	
	for(key in dataSource){
		//console.log(key + " : " + dataSource[key]);
		trie.add(key, dataSource[key]);
	}
	
	//start testing
	var result = trie.find("");
	equals( result.matches.length, 4, "Empty string matches all" );
	equals( result.misses.length, 0, "Empty string misses all" );

	
	var result = trie.find("ca");
	equals( result.matches.length, 4, "Common to all prefix" );
	equals( result.misses.length, 0, "Common to all misses none" );

	var result = trie.find("cat");
	equals( result.matches.length, 2, "partial match with exact match" );
	equals( result.misses.length, 2, "partial match with exact match, misses" );

	var result = trie.find("cab");
	equals( result.matches.length, 1, "Exact match" );
	equals( result.misses.length, 3, "Exact match, no misses" );
	
	var result = trie.find("cata");
	equals( result.matches.length, 0, "Prefix with missing suffix" );
	equals( result.misses.length, 4, "Prefix with missing suffix, misses" );

	var result = trie.find("catamarang");
	equals( result.matches.length, 0, "Prefix with missing suffix - longer" );
	equals( result.misses.length, 4, "Prefix with missing suffix - longer, misses" );
	
	
	var result = trie.find("catch");
	ok( testResult(result, "catch", dataSource), "double check" );
	
	
});

test("trie-multiple-items", function() {

	var dataSource = {
			"car": {},
			"car": {},
			"car": {},
			"cat": {},
			"cat": {},
			"cat": {},
			"catamarang": {},
	};
	
	var trie = new $.ui.ufd.getNewTrie(false, true);
	
	for(key in dataSource){
		//console.log(key + " : " + dataSource[key]);
		trie.add(key, dataSource[key]);
	}
	
	//start testing
	var result = trie.find("c");
	equals( result.matches.length, 3, "Multiple items prefix" );
	equals( result.misses.length, 0, "Multiple items prefix" );

	
	var result = trie.find("car");
	equals( result.matches.length, 1, "Multiple items exact match" );
	equals( result.misses.length, 2, "Multiple items exact match, misses" );

	var result = trie.find("cat");
	equals( result.matches.length, 2, "Multiple items exact match with longer option" );
	equals( result.misses.length, 1, "Multiple items exact match with longer option, misses" );
	
	var result = trie.find("catamarang");
	equals( result.matches.length, 1, "Multiple items exact match." );
	equals( result.misses.length, 2, "Multiple items exact match, misses" );

	var result = trie.find("car-boat");
	equals( result.matches.length, 0, "Multiple items overshoot" );
	equals( result.misses.length, 3, "Multiple items overshoot, misses" );
	
});


/*
 * match or miss array, key, data
 */
function testResult(result, key, dataSource){
	var tritemArr, index, indexB, theSet;
	var checkMatch = false;
	
	do {
		theSet = checkMatch ? result.matches : result.misses;
		index = theSet.length;
		while(index--) {
			tritemArr = theSet[index];
			indexB = tritemArr.length;
			while(indexB--) { // duplicate match array
				check(tritemArr[indexB], key, dataSource, checkMatch);
			}
		}
		checkMatch = !checkMatch;
	} while(checkMatch)
	return true;
} 

function check(tritem, key, dataSource, checkMatch){
	console.log("checking for key : " + key + "; checkMatch? " + checkMatch);
	for(dsKey in dataSource){
		if (tritem === dataSource[dsKey]){
			if(checkMatch){
				if(dsKey.indexOf(key) != 0) throw (key + " not in " + dsKey + " but should be!");
			} else { 
				if(dsKey.indexOf(key) != -1) throw (key + " in " + dsKey + " but shouldn't be!");
			}
			return;
		}
	}
	throw(tritem + " not found.")
}