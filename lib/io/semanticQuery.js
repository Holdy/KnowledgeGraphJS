// Will probably just process sparql end points but did not want to tie it down.
var sparql = require('sparql');
var request = require('superagent');

// options = endpoint + query.
function fetch(options, resultCallback, completeCallback) {

    var uri = options.endpoint ? options.endpoint : options.target;

    uri += '?format=json&query=' + encodeURIComponent(options.query);
    var r = request.get(uri);

    r.end(function(err, res) {
        if(err) {
            completeCallback(err);
        } else {
            res.body.results.bindings.forEach(function(result) {
                resultCallback(result);
            });
            completeCallback();
        }

        });
    /*var client = new sparql.Client(uri);

    client.query(options.query, function(err, results) {

        var x = 1;

    });
    */

}

function fetchByType(options, resultCallback, completeCallback) {
    var listContent = options.type ? options.type : options.types;
    var typeClauseText = buildReferenceList(listContent);

    var queryText = 'SELECT DISTINCT ?item ?itemLabel \
WHERE\
{\
    ?item wdt:P31 ?type . \
    FILTER (?type IN (' + typeClauseText + ')) \
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } \
}\
ORDER BY ?itemLabel';

    options.query = queryText;
    fetch(options, resultCallback, completeCallback);
}

function buildReferenceList(listContent) {
    var array = listContent;

    if (listContent.constructor != Array) {
        array = [listContent];
    }

    return array.map(function(item) {return '<' + item + '>'}).join(', ');

}

module.exports.fetch = fetch;
module.exports.fetchByType = fetchByType;
