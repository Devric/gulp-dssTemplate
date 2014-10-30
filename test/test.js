var expect = require('chai').expect
var gutil = require('gulp-util')
var fs = require('fs')
var path = require('path')

var dssTemplate = require('../')

/** Flow
  1 DSS to create json
  2 Compile markup for each section regarding to template and push into sections
  3 on stream end, wrap all the sections to master template
  4 output
 */

describe('dssTemplate',function() {
    it('should parse dss string', function(done){
        var stream  = dssTemplate({
            templateDir : './'
          , js : true
        })
        var fakeBuffer = fs.readFileSync('./b.json')
        var fakeFile   = new gutil.File({
            contents : fakeBuffer
        })

        stream.on('data', function(newFile){
            fs.writeFileSync('./test.html', newFile.contents.toString())
            // expect(newFile).to.equal(fakeBuffer)
        })
        stream.on('end', function(){
            done()
        })

        stream.write(fakeFile)
        stream.end()
    })
})


