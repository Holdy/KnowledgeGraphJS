// List of accessors - can be shared by multiple graphs.

var all = newList()
    .add(require('./dbpediaPopulator'))
    .add(require('./wikidataPopulator'));

function newList() {

    var accessors = [];

    var result = {
        add: function(accessor) {
            accessors.push(accessor);
            return this;
        },
        getPopulator: function(resourceWrapper) {
            // Check if any of the populators handle this.
            var result = null;
            accessors.forEach(function(accessor) {
                if (accessor.canPopulate(resourceWrapper)) {
                    result = accessor;
                }
            });

            return result;
        }
    };

    return result;

}

module.exports.newList = newList;
module.exports.all = all;
