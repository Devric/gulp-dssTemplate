'use strict';

var through = require('through2');
var gutil   = require('gulp-util')
var jade    = require('jade')
var fs      = require('fs')
var path    = require('path')
var _       = require('lodash')


var PLUGIN_NAME = 'gulp-dssTemplate';

module.exports = function (opts) {
    if (!opts || !opts.templateDir ) {
        throw new Error(PLUGIN_NAME + ' - please make sure all mandatory options is included')
        return
    }
    var tmpDir         = opts.templateDir

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

        //
        // Get dssObj from buffer
        var dssObj = JSON.parse(file.contents)

        //
        // merging into sections
        var mergedSection = {}
        // @returns mergedSection = { 'key' : { content: arr, index: int } }
        dssObj.blocks.forEach(function(data){
            // if missing section, give default
            data.section = data.section ? data.section : 'default'

            // reorder sections
            if (mergedSection[data.section]) {
                // push to section
                mergedSection[data.section].content.push(data)
            } else {
                // add new section
                mergedSection[data.section] = {}
                mergedSection[data.section].content = []
                mergedSection[data.section].index = data.index ?  data.index : 0
                mergedSection[data.section].content.push(data)
            }
        })

        //
        // flaten into array
        var groupSections = []
        for (var key in mergedSection) {
            var obj = mergedSection[key]
            obj.section = key
            groupSections.push( obj )
        }

        groupSections = _.sortBy(groupSections, 'index')

        //
        // render into section templateCache
        var sectionsMarkup = []
        groupSections.forEach(function(sectionData){
            sectionData.content.forEach(function(data){
                var tpl = data.template ? templateCache[data.template] : templateCache['section']
                var markup = jade.compile(tpl)(data) 
                sectionsMarkup.push(markup)
            })
        })

        //
        // put it back with other options
        opts.contents = sectionsMarkup.join('\n')

        //
        // wrap it in layout and render full markup
        var markup = jade.compile(templateCache.layout)(opts)

        if (file.path){
            file.path = path.dirname(file.path) + '/index.html';
        }
        file.contents = new Buffer(markup)
        return cb(null,file)
    };

    return through.obj(plugin)
};

