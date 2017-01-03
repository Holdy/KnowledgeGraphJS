// Triple processor is a simple interface, it can be passed to
// connectors such as the wikidata connector.
// The connector can then 'push' triples to it without knowing which
// graph the triples are going into.

function newTripleProcessor(graph) {

    return {
        ensureResource: function(uriOrAlias) {
            return graph.ensureResource(uriOrAlias);
        },

        process: function(subject, predicate, object) {
            graph.add(subject, predicate, object);
        }

    };

}

module.exports.newTripleProcessor = newTripleProcessor;
