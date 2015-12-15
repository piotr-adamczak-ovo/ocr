/**
 * Created by Minhaj on 6/20/15.
 */

var tesseract = require('node-tesseract');
var textcleaner = require('textcleaner');
var multer  = require('multer');
var fs = require('fs');

module.exports = function(app) {
    app.use(multer(
        {
            dest: './.tmp/',
            inMemory: false
        }
    ));

    app.post("/api/ocr", process);
    app.post("/api/digits", process);

};

/**
 * Following steps done under this functions.
 *
 * 1. Uploads image under '.tmp' folder.
 * 2. Grab text from image using 'tesseract-ocr'.
 * 3. Delete image from hardisk.
 * 4. Return text in json format.
 *
 * @param req
 * @param res
 */

 var digits = function(req, res) {

    console.log('connection : %j', req.files.image.path);

    var image = req.files.image.path;

    // Recognize text of any language in any format
    tesseract.process(image,function(err, text) {
        if(err) {
            console.error(err);
        } else {
            // fs.unlink(image, function (err) {
            //     if (err){
            //         res.json(500, "Error while scanning image");
            //     }
            //     console.log('successfully deleted %s', image);
            // });

          
            console.log('recognized %s',text);

            res.json(200, text);
        }
    });
};

var process = function(req, res) {

    var path = req.files.file.path;

    preprocessImage(path,function(err, preprocessedImage) {
        if(!err) {
            
            console.log('\nImage preprocessed! '+preprocessedImage);
            
            performOCR(preprocessedImage, function(err, text) {

                if (!err) {
                    res.json(200, text);
                } else {
                    res.json(500, "Error while scanning image");
                }
            });
        } 
    });
};

function preprocessImage(path, callback) {
    textcleaner.process(path,function(err, preprocessedImage) {
        if(err) {
            console.error(err);
            callback(err,null);
        } else {
            callback(null,preprocessedImage);
        }
    });
}

function performOCR(path, callback) {

    // Recognize text of any language in any format
    tesseract.process(path,function(err, text) {
        if(err) {
            console.error(err);
        } else {
            // fs.unlink(path, function (err) {
            //     if (err){
            //         callback(err,null)
            //     }
            //     console.log('successfully deleted %s', path);
            // });

            text = text.replace(/\n/g, '');
            text = text.replace(/ /g,'')
            text = text.replace(/\./g,'')
            text = text.replace('"', '');
        
            callback(null, text);
        }
    });
}