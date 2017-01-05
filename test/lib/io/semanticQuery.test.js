var expect = require('chai').expect;

var query = require('../../../lib/io/semanticQuery');


var wikidataSparqlEndpoint = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql';

var queryText = 'SELECT DISTINCT ?country ?countryLabel\
WHERE\
{\
    ?country wdt:P31 ?type .\
    FILTER (?type IN (wd:Q3624078, wd:Q3336843)) \
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }\
}\
ORDER BY ?countryLabel';

describe('semanticQuery', function() {

    it('should fetch countries from wikidata with query', function(done) {

        var items = [];

        query.fetch(
            {
                endpoint: 'https://query.wikidata.org/bigdata/namespace/wdq/sparql',
                query   : queryText
            },
            function(result) {
                items.push(result);
            },
            function(err) {
                if (err) {
                    throw err;
                } else {
                    expect(items.length > 300).to.be.ok;
                    done();
                }
            }
        );
    });

    it ('should fetch countries from wikidata by type (array)', function(done) {

        var items = [];

        query.fetchByType(
            {
                endpoint: 'http://query.wikidata.org/bigdata/namespace/wdq/sparql',
                type: ['http://www.wikidata.org/entity/Q3624078', // Sovereign state.
                    'http://www.wikidata.org/entity/Q3336843' // Country of the U.K.
                ]
            },
            function(result) {
                items.push(result);
            },
            function(err) {
                if (err) {
                    throw err;
                } else {
                    expect(items.length > 300).to.be.ok;
                    done();
                }
            }
        );

    });

    it ('should fetch countries from wikidata by type (item)', function(done) {

        var items = [];

        query.fetchByType(
            {
                endpoint: 'http://query.wikidata.org/bigdata/namespace/wdq/sparql',
                type: 'http://www.wikidata.org/entity/Q3336843' // Country of the U.K.
            },
            function(result) {
                items.push(result);
            },
            function(err) {
                if (err) {
                    throw err;
                } else {
                    expect(items.length).to.equal(4);
                    done();
                }
            }
        );
    });

    it ('should fetch countries from wikidata by type (array of 1 item)', function(done) {

        var items = [];

        query.fetchByType(
            {
                endpoint: 'http://query.wikidata.org/bigdata/namespace/wdq/sparql',
                type: ['http://www.wikidata.org/entity/Q3336843'] // Country of the U.K.
            },
            function(result) {
                items.push(result);
            },
            function(err) {
                if (err) {
                    throw err;
                } else {
                    expect(items.length).to.equal(4);
                    done();
                }
            }
        );

    });

});
