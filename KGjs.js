"strict on";

var uriOf = require('./lib/rdfUris');
var fileLoader = require('./lib/io/fileLoader');
var fetchStatus = require('./lib/fetchStatus');

function ensureDataLoaded (resourceWrapper, graphComponents, callback)  {
    if (!resourceWrapper.fetchStatus && graphComponents.accessorList) {
        var populator = graphComponents.accessorList.getPopulator(resourceWrapper);
        if (populator) {
               populator.populate(resourceWrapper, graphComponents.dataProcessor, function(populationError) {
                   if (populationError) {
                       resourceWrapper.fetchStatus = fetchStatus.fetchAttemptedButFailed
                       callback(populationError);
                   } else {
                       resourceWrapper.fetchStatus = fetchStatus.successfullyFetched;
                       callback(null);
                   }
               });
        } else {
            resourceWrapper.fetchStatus = fetchStatus.cannotBeFetched;
            callback(null);
        }
    } else {
        callback(null);
    }
}

function determineAbsoluteUri (uriOrAliasedName, aliases) {
    var result;
    if (uriOrAliasedName.indexOf('http:') === 0 || uriOrAliasedName.indexOf('https:') === 0) {
        result = uriOrAliasedName;
    } else {
        var colonIndex = uriOrAliasedName.indexOf(':');
        if (colonIndex == -1) {
            throw new Error('KGjs - Uri failure - No colon found in aliased name: ' + uriOrAliasedName);
        }
        var alias = uriOrAliasedName.substring(0, colonIndex);
        var aliasPrefix = aliases[alias];

        if (!aliasPrefix) {
            throw new Error('KGjs - Uri failure - unknown alias: ' + alias);
        }
        result = aliasPrefix + uriOrAliasedName.substring(colonIndex + 1);
    }
    return result;
}


function mergeInto(sourceRoot, destRoot) {
    if (sourceRoot && sourceRoot.list) {
        sourceRoot.list.forEach(function(item) {
            destRoot.list.push(item);
        });
    }
}

function metaProcessing(subject, predicate, object) {

    if (predicate.uri == uriOf.owl_sameAs && object.uri) {
        // Ensure subject and object have same sharedRoot
        if (subject._sharedRoot) {
            mergeInto(object._sharedRoot, subject._sharedRoot);
            object._sharedRoot = subject._sharedRoot;
        } else if (object._sharedRoot) {
            mergeInto(subject._sharedRoot, object._sharedRoot);
            subject._sharedRoot = object._sharedRoot;
        }  else {
            var sharedRoot = {list:[subject,object]};
            subject._sharedRoot = sharedRoot;
            object._sharedRoot = sharedRoot;
        }
    }

}

function processOutgoingResources(wrappedFacts, graphComponents, callback) {
    // simulate outgoing pipeline - which is currently to load items.
    forEachInArray(wrappedFacts,
        function(wrappedFact, itemCallback) {
            ensureDataLoaded(wrappedFact.value, graphComponents, itemCallback);
        },
        function(err) {
           callback(err, err ? null : wrappedFacts);
        });
}

function newGraph(accessorList) {
    var aliases = {};
    var resources = {};

    var graphComponents = {
        dataProcessor: null,
        accessorList: accessorList};

    var graph = {
        defineAlias: function(alias, uri) {
            aliases[alias] = uri;
        },
        ensureResource: function(uriOrAliasedName) {
            var absoluteUri = determineAbsoluteUri(uriOrAliasedName, aliases);

            var resourceWrapper = resources[absoluteUri];

            if (!resourceWrapper) {
                var data = null;
                var resourceWrapper = {
                    id: uriOrAliasedName,
                    uri: absoluteUri,
                    add: function(predicateResourceWrapper, object) {
                        if (data === null) {
                            data = {};
                        }

                        var rawResults = data[predicateResourceWrapper.uri];
                        if (rawResults == null) {
                            rawResults = [];
                            data[predicateResourceWrapper.uri] = rawResults;
                        }

                        rawResults.push(object);
                        // Meta processing.
                        metaProcessing(this, predicateResourceWrapper, object);
                    },
                    getOne: function(predicateResourceWrapper) {
                        var result = null;
                        if (data) {
                            var list = data[predicateResourceWrapper.id];
                            if (list && list.length > 0) {
                                result = list[0];
                            }
                        }

                        return result;
                    },
                    list: function(predicateResourceWrapper, callback, isRootLoad) {
                        var thisResource = this;
                        ensureDataLoaded(this, graphComponents, function(err) {
                            if (err) {
                                return callback(err);
                            }

                            if (thisResource._sharedRoot && !isRootLoad) {
                                // use a special algorithm to populate and
                                // collate results.
                                performSharedRootList(thisResource, predicateResourceWrapper, graphComponents, function(err, wrappedItems) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        processOutgoingResources(wrappedItems, graphComponents, callback);
                                    }
                                });
                            } else {
                                // Simple population.

                                if (data === null) {
                                    callback(null, []);
                                } else {
                                    var rawResults = data[predicateResourceWrapper.uri];

                                    if (rawResults == null) {
                                        callback(null, []);
                                    } else {
                                        var wrappedResults = rawResults.map(function(rawResult) {
                                            return {value: rawResult};
                                        });

                                        processOutgoingResources(wrappedResults, graphComponents, callback);
                                    }
                                }
                            }
                        });
                    }
                }
                resources[absoluteUri] = resourceWrapper;
            }
            return resourceWrapper;
        },
        loadFile: function(fileName, callback) {
            fileLoader.loadFile(this, fileName, callback);
        },
        forEachResource: function(resourceCallback, completeCallback) {
            var values = Object.keys(resources).map(function(key) { return resources[key]});
            forEachInArray(values, resourceCallback, completeCallback);
        }
    };

    graphComponents.dataProcessor = require('./lib/tripleProcessor').newTripleProcessor(graph);

    return graph;
}

function forEachInArrayImpl(index, array, itemCallback, completeCallback) {
    if (index < array.length) {
        itemCallback(array[index], function(err) {
            if (err) {
                completeCallback(err);
            } else {
                forEachInArrayImpl(++index, array, itemCallback, completeCallback);
            }
        });
    } else {
        completeCallback(null);
    }
}

function forEachInArray(array, itemCallback, completeCallback) {
    forEachInArrayImpl(0, array, itemCallback, completeCallback);
}


function performSharedRootList(targetResource, predicateResourceWrapper, graphComponents, callback) {
    // We move through the shared root list, populating and collating answers as we go.
    // Our list iterate will process items added to the array during processing.

    var sharedRoot = targetResource._sharedRoot;
    var collatedWrappedAnswers = [];

    forEachInArray(sharedRoot.list,
        function resourceCallback(resource, itemCallback) {
            // Loading will force population of this resource.
            // If we find a sameAs link, it will be added to the sharedRoot.list
            resource.list(predicateResourceWrapper, function(err, wrappedResults) {
                    if (err) {
                        itemCallback(null); // we don't let error stop process.
                    } else {
                        // collate
                        // TODO - remove duplicates
                        wrappedResults.forEach(function(wrappedResult) {
                            collatedWrappedAnswers.push(wrappedResult);
                        });
                        itemCallback(null);
                    }
                },
            true); // true == isRootList load
        },
        function completeCallback(err) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, collatedWrappedAnswers);
            }
        }
    );
}

module.exports.newGraph = newGraph;
module.exports.allAccessors = require('./lib/accessors/dataAccessorList').all;
module.exports.newAccessorList = require('./lib/accessors/dataAccessorList').newList;
module.exports.uriFor = require('./lib/rdfUris');
