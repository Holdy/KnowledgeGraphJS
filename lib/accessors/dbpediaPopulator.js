var request = require('superagent');

var uriOf = require('../rdfUris');

function populate(resourceWrapper, tripleProcessor, callback) {
    var lastSlash = resourceWrapper.uri.lastIndexOf('/');
    var key = resourceWrapper.uri.substring(lastSlash + 1);

    var requestUri = 'https://dbpedia.org/data/' + key + '.json';
    request.get(requestUri)
        .set('User-Agent', 'C/O chris.holden@rainbird.ai')
        .end(function(err, res) {
            if (err) {
                return callback(err);
            }

            if (res.status !== 200) {
                return callback('Host ' + config.hostname +
                    ' returned status code: ' +
                    res.status +
                    ', and a payload of [' + res.text + ']');
            }

            processData(resourceWrapper, res.body, tripleProcessor, callback);
        });

}

function setName(resourceWrapper, entity) {
    var names = entity['http://dbpedia.org/property/name'];
    if (names) {
        names.forEach(function(nameNode) {
            if ('en' == nameNode.lang) {
                resourceWrapper.name = nameNode.value;
            }
        });
    }
}

function processData(resourceWrapper, data, tripleProcessor, callback) {
    var lastSlash = resourceWrapper.uri.lastIndexOf('/');
    var key = resourceWrapper.uri.substring(lastSlash + 1);

    var entity = data[resourceWrapper.uri];

    if (entity) {
        setName(resourceWrapper, entity);
        var claimArray = entity[uriOf.owl_sameAs];

        var sameAs = tripleProcessor.ensureResource(uriOf.owl_sameAs);
        claimArray.forEach(function(wrappedValue) {
            if (wrappedValue.type === 'uri' && wrappedValue.value.indexOf('//www.wikidata.org/') != -1) {
                tripleProcessor.process(resourceWrapper, sameAs, tripleProcessor.ensureResource(wrappedValue.value));
            }
        });

        callback(null);
    } else {
        return callback(new Error('Could not find entity in results'));
    }

}

function canPopulate(resourceWrapper) {
    // TODO - something safer.
    return resourceWrapper.uri.indexOf('//dbpedia.org') != -1;
}

module.exports.populate = populate;
module.exports.canPopulate = canPopulate;
