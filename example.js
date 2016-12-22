var kg = require('./KGjs');

// Setup a graph to hold data. Use all accessors (wikidata+dbpedia).
var r = kg.newGraph(kg.allAccessors).ensureResource;

var twinnedWithRel = r('http://www.wikidata.org/property/P190');

// Lets find out which cities Norwich, UK is twinned with.
r('http://dbpedia.org/resource/Norwich').list(twinnedWithRel, function(err, wrappedResults) {

    // We traversed a sameAs relation from dbpedia to wikidata.
    console.log('Norwich is twinned with:');
    wrappedResults.forEach(function(result) {
        console.log('   ' + result.value.name + ' (' + result.value.id + ')')
    });

});
