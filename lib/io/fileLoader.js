var fs = require('fs');

var N3 = require('n3');
var parser = N3.Parser();

function loadFile(graph, fileName, callback) {
    loadStream(graph, fs.createReadStream(fileName), callback);
}

function loadStream (graph, stream, callback) {

    var fileSpecificNamespaceForBlank = "http://someguid/node#";

    parser.parse(stream, function(err, triple, prefixes) {
        if (err) {
            callback(err);
        } else if (triple) {

            var subjectSource = triple.subject;
            if (subjectSource.indexOf('_:') === 0) {
                subjectSource = fileSpecificNamespaceForBlank + subjectSource.substring(2);
            }

            var subject = graph.ensureResource(subjectSource);

            var predicate = graph.ensureResource(triple.predicate);
            var object = triple.object; // TODO - handle strings

            if (object.indexOf('_:') === 0 || object.indexOf('_:') === 0) {
                // It's an anonymous node.
                object = fileSpecificNamespaceForBlank + object.substring(2);
                object = graph.ensureResource(object);
                graph.add(subject, predicate, object);
            } else if (object.indexOf('\"') === 0) {
                var enIndex = object.indexOf('@en');
                var typeIndex = object.indexOf('\"^^');
                if (enIndex == object.length - 3) {
                    var rawText = object.substring(1, object.length - 4);
                    graph.add(subject, predicate, rawText);
                } else if (typeIndex != -1) {
                    var rawText = object.substring(1, typeIndex);
                    graph.add(subject, predicate, rawText);
                }
            } else {
                object = graph.ensureResource(object);
                graph.add(subject, predicate, object);
            }

        } else { // triple null - file complete.
            callback();
        }
    });
}

module.exports.loadFile = loadFile;
