'use strict';

var through   = require('through2');
var gutil     = require('gulp-util')
var jade      = require('jade')
var util      = require('util')
var fs        = require('fs')
var path      = require('path')

var PLUGIN_NAME = 'gulp-dssTemplate';

module.exports = function (opts) {
    if (!opts || !opts.templateDir ) {
        throw new Error(PLUGIN_NAME + ' - please make sure all mandatory options is included')
        return
    }
    var tmpDir         = opts.templateDir
      , sectionsMarkup = []

    //
    // cache all template in template directory
    //
    var templateCache = (function(){
        var files = {}

        fs.readdirSync(tmpDir)

        // filter out .jade tmplates
        .filter(function(file){
            if ( file.split('.')[1] === 'jade' ) {
                return file
            }
        })

        // cache into files
        .forEach(function(file){
            files[file.split('.')[0]] = fs.readFileSync(path.resolve(tmpDir, file))
        })


        return files
    })()

    //
    // Work on the stream
    //
    function plugin(file, enc, cb) {
        if (file.isNull()) return;
        if (file.isStream()) return this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Stream not supported'));

        // Get dssObj from buffer
        var dssObj = JSON.parse(file.contents)
          , orderedSection = {}

        // ordering sections
        dssObj.blocks.forEach(function(data){
            // if missing section, give default
            data.section = data.section ? data.section : 'default'

            // reorder sections
            if (orderedSection[data.section]) {
                orderedSection[data.section].push(data)
            } else {
                orderedSection[data.section] = []
                orderedSection[data.section].push(data)
            }

        })

        // render into section templateCache
        for (var key in orderedSection) {
            orderedSection[key].forEach(function(data){
                var tpl = data.template ? templateCache[data.template] : templateCache['section']
                var markup = jade.compile(tpl)(data) 
                sectionsMarkup.push(markup)
            })
        }

        // put it back with other options
        opts.contents = sectionsMarkup.join('\n')

        // wrap it in layout
        var markup = jade.compile(templateCache.layout)(opts)

        if (file.path){
            file.path = path.dirname(file.path) + '/index.html';
        }
        file.contents = new Buffer(markup)
        return cb(null,file)
    };

    return through.obj(plugin)
};

