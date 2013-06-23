var Q = require('kew'),
    fs = require('fs'),
    glob = require("glob"),
    path = require('path');

exports.merge = function() {
    var final = {};

    for(var i = 0, len = arguments.length; i < len; i++){
        var current = arguments[i];
        if(current){
            for(var key in current){
                var value = current[key];
                try{
                    if (value.constructor == Object) {
                        final[key] = merge(final[key], value);
                    } else {
                        final[key] = value;
                    }
                }
                catch(e){
                    final[key] = value;
                }
            }
        }
    }

    return final;
};

exports.asyncForEach = function(items, asyncAction){
    var dfd = Q.defer(),
        i = -1,
        len = items.length,
        current;

    function next(){
        i++;

        if(i < len){
            current = items[i];
            asyncAction(current).then(next);
        }else{
            dfd.resolve();
        }
    }

    next();

    return dfd.promise;
};

exports.readFile = function(path, encoding){
    var dfd = Q.defer();
    fs.readFile(path, encoding, dfd.makeNodeResolver());
    return dfd.promise;
}

exports.writeFile = function(path, data){
    var dfd = Q.defer();
    fs.writeFile(path, data, dfd.makeNodeResolver());
    return dfd.promise;
}

exports.glob = function(pattern, options){
    var dfd = Q.defer();
    glob(pattern, options, dfd.makeNodeResolver());
    return dfd.promise;
}

exports.distinct = function(items) {
    var derivedArray = [];

    for (var i = 0, len = items.length; i < len; i++) {
        var current = items[i];

        if (derivedArray.indexOf(current) == -1) {
            derivedArray.push(current)
        }
    }

    return derivedArray;
};

exports.exists = function(path){
    var dfd = Q.defer();
    fs.exists(path, function(result){dfd.resolve(result);});
    return dfd.promise;
}

var copyFile = function(srcFile, destFile, cb) {
    var fdr = fs.createReadStream(srcFile),
        fdw = fs.createWriteStream(destFile),
        dfd = Q.defer();

    fdr.on('end', function() { dfd.resolve(); });

    fdr.pipe(fdw);

    return dfd.promise;
};

var mkdirSyncRecursive = function(dir, mode) {
    dir = path.normalize(dir)

    try {
        fs.mkdirSync(dir, mode);
    } catch(err) {
        if(err.code == "ENOENT") {
            var slashIdx = dir.lastIndexOf(path.sep);

            if(slashIdx > 0) {
                var parentPath = dir.substring(0, slashIdx);
                mkdirSyncRecursive(parentPath, mode);
                mkdirSyncRecursive(dir, mode);
            } else {
                throw err;
            }
        } else if(err.code == "EEXIST") {
            return;
        } else {
            throw err;
        }
    }
};

exports.safeCopy = function(src, dest){
    var dir = path.dirname(dest);

    return exports.exists(dir).then(function(result){
        if(result){
            return copyFile(src, dest);
        }else{
            mkdirSyncRecursive(dir);
            return copyFile(src, dest);
        }
    });
}