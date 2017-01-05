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
officialLanguageId = 'P37';
currencyId = 'P38';

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

    extractData(tripleProcessor, resourceWrapper, entity, sisterCityId);
    extractData(tripleProcessor, resourceWrapper, entity, currencyId);
    extractData(tripleProcessor, resourceWrapper, entity, officialLanguageId);


    callback(null);
}

function extractData(tripleProcessor, resourceWrapper, resultEntity, targetPropertyId) {

    var claimArray = resultEntity.claims[targetPropertyId];
    if (claimArray && claimArray.length > 0) {
        var wrappedProperty = tripleProcessor.ensureResource('http://www.wikidata.org/property/' + targetPropertyId);

        claimArray.forEach(function(entry) {
            var key = entry.mainsnak.datavalue.value.id
            var uri = 'http://www.wikidata.org/entity/' + key;

            var equivalentResourceWrapper = tripleProcessor.ensureResource(uri);
            tripleProcessor.process(resourceWrapper, wrappedProperty, equivalentResourceWrapper);

        });
    }
}

function canPopulate(resourceWrapper) {
    // TODO - something safer.
    return resourceWrapper.uri.indexOf('//www.wikidata.org') != -1;
}

module.exports.populate = populate;
module.exports.canPopulate = canPopulate;
