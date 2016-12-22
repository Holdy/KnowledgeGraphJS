var request = require('superagent');


function populate(resourceWrapper, tripleProcessor, callback) {

    request.get(resourceWrapper.uri)
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

sisterCityId = 'P190';

function setName(resourceWrapper, entity) {
    if (entity && entity.labels && entity.labels.en) {
        resourceWrapper.name = entity.labels.en.value;
    }
}

function processData(resourceWrapper, data, tripleProcessor, callback) {
    var lastSlash = resourceWrapper.uri.lastIndexOf('/');
    var key = resourceWrapper.uri.substring(lastSlash + 1);

    var entity = data.entities[key];

    setName(resourceWrapper, entity);

    var claimArray = entity.claims[sisterCityId];
    if (claimArray && claimArray.length > 0) {

        claimArray.forEach(function(entry) {
            var key = entry.mainsnak.datavalue.value.id
            var uri = 'http://www.wikidata.org/entity/' + key;

            var wrappedSisterCity = tripleProcessor.ensureResource('http://www.wikidata.org/property/' + sisterCityId);

            var equivalentResourceWrapper = tripleProcessor.ensureResource(uri);
            tripleProcessor.process(resourceWrapper, wrappedSisterCity, equivalentResourceWrapper);

        });
    }

    callback(null);
}

function canPopulate(resourceWrapper) {
    // TODO - something safer.
    return resourceWrapper.uri.indexOf('//www.wikidata.org') != -1;
}

module.exports.populate = populate;
module.exports.canPopulate = canPopulate;
