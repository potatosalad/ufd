module("trie");




test("trie", function() {

	var dataSource = {
			"cab": {},
			"cat": {},
			"car": {},
			"catch": {}
	};
	
	var trie = new $.ui.ufd.getNewTrie(false, true);
	
	console.log(trie);
	
	for(key in dataSource){
		//console.log(key + " : " + dataSource[key]);
		trie.add(key, dataSource[key]);
	}
	
	//start testing
	var result = trie.find("");
	equals( result.matches.length, 4, "Matches match" );
	equals( result.misses.length, 0, "Misses match" );

	
	var result = trie.find("ca");
	equals( result.matches.length, 4, "Matches match" );
	equals( result.misses.length, 0, "Misses match" );

	var result = trie.find("cat");
	equals( result.matches.length, 2, "Matches match" );
	equals( result.misses.length, 2, "Misses match" );

	var result = trie.find("cab");
	equals( result.matches.length, 1, "Matches match" );
	equals( result.misses.length, 3, "Misses match" );
	
	var result = trie.find("cata");
	equals( result.matches.length, 0, "Matches match" );
	equals( result.misses.length, 4, "Misses match" );

	var result = trie.find("catch");
	ok( testResult(result, "catch", dataSource), "double check" );
	
	
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