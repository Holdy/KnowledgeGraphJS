var expect = require('chai').expect;
var KGjs = require('../KGjs.js');
var wikidataPopulator = require('../lib/accessors/wikidataPopulator');
var dbpediaPopulator = require('../lib/accessors/dbpediaPopulator');

describe('KGjs', function() {

    var sameAs;

    var graph;
    var incrementerData = 0;

    function nextInt() {
        return ++incrementerData;
    }

    before(function(done) {
        graph = KGjs.newGraph();
        sameAs = graph.ensureResource('http://www.w3.org/2002/07/owl#sameAs');

        done();
    });

    describe('aliases', function() {

        it('should error if we use an Alias that is not defined', function(done) {

            var thrownError;
            try {
                graph.ensureResource('noSuchAlias:goodLuck');
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).to.be.ok;
            expect(thrownError.message).to.equal('KGjs - Uri failure - unknown alias: noSuchAlias');
            done();
        });

        it('should error if try and alias without a colon', function(done) {

            var thrownError;
            try {
                graph.ensureResource('justARawString');
            } catch (e) {
                thrownError = e;
            }

            expect(thrownError).to.be.ok;
            expect(thrownError.message).to.equal('KGjs - Uri failure - No colon found in aliased name: justARawString');
            done();
        });

    });

    it('should allow the definition of a new thing', function(done) {

        var randomUriResource = graph.ensureResource('https://www.fake.org/' + nextInt());
        expect(randomUriResource).to.be.ok;
        done();
    });

    it('should handle multiple ensures() of the same thing - url-url', function(done) {

        var rainbirdAI = graph.ensureResource('https://www.wikidata.org/wiki/Q28044845');

        var shouldGetTheSameOne = graph.ensureResource('https://www.wikidata.org/wiki/Q28044845');
        expect(rainbirdAI == shouldGetTheSameOne).to.equal(true);
        done();
    });

    it('should handle multiple ensures() of the same thing - url-alias', function(done) {

        graph.defineAlias('wikidata', 'https://www.wikidata.org/wiki/');
        var rainbirdAI = graph.ensureResource('https://www.wikidata.org/wiki/Q28044845');

        var shouldGetTheSameOne = graph.ensureResource('wikidata:Q28044845');
        expect(rainbirdAI == shouldGetTheSameOne).to.equal(true);
        done();
    });

    it('should handle multiple ensures() of the same thing - alias-url', function(done) {

        graph.defineAlias('wikidata', 'https://www.wikidata.org/wiki/');
        var rainbirdAI = graph.ensureResource('wikidata:Q28044845');

        var shouldGetTheSameOne = graph.ensureResource('https://www.wikidata.org/wiki/Q28044845');
        expect(rainbirdAI == shouldGetTheSameOne).to.equal(true);
        done();
    });

    describe('data loading', function() {

        it('should follow known links', function(done) {

            var dbpedia_Norwich = graph.ensureResource('http://dbpedia.org/resource/Norwich');

            var tripleProcessor = require('../lib/tripleProcessor').newTripleProcessor(graph);

            dbpediaPopulator.populate(dbpedia_Norwich, tripleProcessor, function(err) {

                // We should now know that the dbPedia url is the same as the wikidata uri
                dbpedia_Norwich.list(sameAs, function(err, wrappedResults) {

                    expect(wrappedResults.length).to.equal(1);
                    expect(wrappedResults[0].value.uri).to.equal('http://www.wikidata.org/entity/Q130191');

                    var wikidata_Norwich = wrappedResults[0].value;
                    wikidataPopulator.populate(wikidata_Norwich, tripleProcessor, function(err) {

                        var sisterCityResource =  graph.ensureResource('http://www.wikidata.org/property/P190');
                        wikidata_Norwich.list(sisterCityResource, function(err, wrappedResults) {

                            // Will break if Norwich is twinned again!
                            expect(wrappedResults.length).to.equal(3);

                            done();
                        });
                    });
                });
            });

        });
    });

    describe.only('accessorList', function() {

        it('should share properties across sameAs relations', function(done) {

            // A graph to hold the data. Use all accessors (wikidata+dbpedia).
            var freshGraph = KGjs.newGraph(KGjs.allAccessors);
            var r = freshGraph.ensureResource;

            // Get hold of the resources we'll be working with.
            var twinnedCityRel = r('http://www.wikidata.org/property/P190');

            var dbpedia_Norwich = r('http://dbpedia.org/resource/Norwich');

            // We should now find the sister cities of Norwich because:
            // dbpedia/Norwich gives us a sameAs reference to wikidata/Norwich
            // wikidata/Norwich has sisterCity values.
            dbpedia_Norwich.list(twinnedCityRel, function(err, wrappedResults) {
                expect(err).to.not.be.ok;
                expect(wrappedResults).to.be.ok;

                // TODO - will break if we are twinned with other cities.
                expect(wrappedResults.length).to.equal(3);

                done();
            });
        });

        it('should work as a nice clean example', function(done) {

            // Setup a graph to hold data. use all accessors (wikidata+dbpedia).
            var r = KGjs.newGraph(KGjs.allAccessors).ensureResource;

            var twinnedWithRel = r('http://www.wikidata.org/property/P190');

            // Lets find out which cities, Norwich-UK is twinned with.
            r('http://dbpedia.org/resource/Norwich')
                .list(twinnedWithRel, function(err, wrappedResults) {
                    //  We get resources for Novi Sad, Koblenz and Rouen.
                    expect(wrappedResults.length).to.equal(3);
                    done();
                });

        });

    });

});
