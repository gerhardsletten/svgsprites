// Require statements.

var Canvas = require('canvas');
var Image = Canvas.Image;
var svg2png = require("./svg2pngdata");
var _ = require('underscore');
var fs = require('fs');
var path = require('path');

// Valid image file extensions.
var IMAGE_FILE_EXTENSIONS = ['.png', '.jpg', '.tiff', '.gif', '.bmp'];

var VECTOR_FILE_EXTENSIONS  = ['.svg'];

// Regex for fixing image file names.
var FILE_NAME_REGEXP = /\.|\s|_/ig;

// Weight of width over height in sorting.
var WIDTH_WEIGHT = 10000;

/**
 * Replaces all tokens in a string.
 * @param template Template with tokens.
 * @param replacements Token replacements.
 * @return {*} Final string.
 * @private
 */
var _replaceTokens = function (template, replacements) {
    for (var tag in replacements) {
        var reg = new RegExp('\{' + tag + '\}', 'g');
        template = template.replace(reg, replacements[tag]);
    }

    return template;
};

/**
 * Checks if the specified file is an image.
 * @param fileName Name of the file.
 * @private
 */
var _isImageFile = function(fileName) {

    // Check if file extension matches valid image extensions.
    var ext = path.extname(fileName).toLowerCase();
    return _.any(IMAGE_FILE_EXTENSIONS, function(imageExt) {
        return ext === imageExt;
    }) && fileName !== 'sprite.png';
};

var _isSVGFile = function(fileName) {

    // Check if file extension matches valid image extensions.
    var ext = path.extname(fileName).toLowerCase();
    return _.any(VECTOR_FILE_EXTENSIONS, function(imageExt) {
        return ext === imageExt;
    }) && fileName !== 'sprite.png';
};

/**
 * Sprite generator for recursing directories.
 * @param options Options for generation.
 * @constructor
 */
var SpriteGen = function(options) {
    // Default settings if not specified in options.
    var settings = _.extend({
        dir: null,      // Root directory to process.
        padding: 2,     // Padding between images.
        verbose: false  // True if logging output should be verbose; otherwise false.
    }, options);

    // Root directory to begin processing.
    this.rootDir = settings.dir;
    this.verbose = settings.verbose;
    this.imagePadding = settings.padding;
    this.spritePackages = [];
};

_.extend(SpriteGen.prototype, {

    /**
     * Creates a sprite packages for the specified directory.
     * @param dir Directory to run on.
     * @private
     */
    _convertFile: function(filename, path, cb) {
        if (_isSVGFile(path )) {
            console.log("svg-file:" + path);
            svg2png(path, path + ".png", function(err){
                var image = new Image();
                image.src = path + ".png";

                var imageInfo = {
                    image: image,
                    fileName: filename + ".png",
                    position: {
                        top: 0,
                        left: 0
                    }
                };

                cb(imageInfo);
            });
            // Create image for file, and add to package.
            
        } else {
            // Create image for file, and add to package.
            var image = new Image();
            image.src = path;

            var imageInfo = {
                image: image,
                fileName: filename,
                position: {
                    top: 0,
                    left: 0
                }
            };

            cb(imageInfo);
        }
    },
    _createSpritePackages: function(dir, cb) {
        var self = this;
        fs.readdir(dir, function (err, files) {
            if (err) {
                cb(err);
            } else {             
                var spritePackage = {
                    path: null,
                    dir: dir,
                    width: 0,
                    height: 0,
                    images: [],
                    style: []
                };

                // Create path to namespace images, if it is not the root, add a separating -.
                spritePackage.path = path.relative(self.rootDir, dir)
                    .replace('/', '-')
                    .replace(' ', '-');
                if (spritePackage.path.length > 0) {
                    spritePackage.path += '-';
                }
                // cb_n creates a closure
                // which counts its invocations and calls callback on nth
                var n = files.length;
                var cb_n = function(callback)
                {
                    return function(img) {
                        if(img) {
                            spritePackage.images.push(img);
                        }
                        --n;
                        if(n === 1) {
                            if (spritePackage.images.length > 0) {
                                console.log(_replaceTokens('"{dir}" is done. Found {n} images.', { dir: dir, n: spritePackage.images.length }));
                                self.spritePackages.push(spritePackage);
                            }
                            else {
                               console.log(_replaceTokens('No images found for directory "{dir}".', { dir: dir }));
                            }
                            callback();
                        } 
                    }
                }

                // f = filename, p = path
                var each = function (f, p) {
                    return function (err, stats) {
                        if (err) {
                            cb(err);
                        } else {
                            if (stats.isDirectory()) {
                                self._createSpritePackages(p, cb_n(cb));
                            } else if (_isImageFile(p) || _isSVGFile(p)) {
                                self._convertFile(f, p, cb_n(cb));
                            } else {
                                cb_n(cb);
                            }
                        }
                    };
                };

                var i;
                for (i = 0; i < files.length; i++) {
                    var f = files[i];
                    var p = path.join(dir, f);
                    fs.stat(p, each(f, p));
                }
            }
        });
    },

    /**
     * Places all images in a package.
     * @spritePackage Package that contains all images for a sprite.
     * @private
     */
    _placeImages: function(spritePackage) {

        // Sort all images by height ascending.
        var images = _.sortBy(spritePackage.images, function(imageInfo) {
           return (imageInfo.image.width * WIDTH_WEIGHT) + imageInfo.image.height;  // Force sort by width and then height by weighting width.
        });

        // Set the sprite to the largest width.
        spritePackage.width = images[images.length - 1].image.width;

        // Place all images left to right, up to the width.
        var currentTop = 0;
        var currentLeft = 0;
        var maxRowHeight = 0;
        var self = this;
        _.each(images, function(imageInfo) {

            // If the image will not fit in the current row; start a new row.
            if (currentLeft + self.imagePadding +  imageInfo.image.width > spritePackage.width) {

                // Update current top to previous top plus the max hieght of the placed image in the row above.
                currentTop = currentTop + maxRowHeight + self.imagePadding;

                // Reset max row height and current left for new row.
                currentLeft = 0;
                maxRowHeight = 0;
            }

            // Place image.
            imageInfo.position.top = currentTop;
            imageInfo.position.left = currentLeft + self.imagePadding;

            // Update current left position to place next image.
            currentLeft += self.imagePadding + imageInfo.image.width;

            // Update max height to largest hieght placed image.
            maxRowHeight = imageInfo.image.height > maxRowHeight ? imageInfo.image.height : maxRowHeight;
        });

        // Set final height of spritePackage.
        spritePackage.height = currentTop + maxRowHeight;
    },

    /**
     * Renders all images in a sprite package.
     * @param spritePackage Sprite package.
     * @private
     */
    _renderImages: function(spritePackage) {
        var canvas  = new Canvas(spritePackage.width, spritePackage.height);
        var context = canvas.getContext('2d');

        if (this.verbose) {
            console.log(_replaceTokens('Rendering sprite for directory "{dir}".', { dir: spritePackage.dir }));
        }

        // Draw all images.
        var self = this;
        _.each(spritePackage.images,  function(imageInfo) {
            if (self.verbose) {
                console.log(_replaceTokens('\tRendering image "{image}" ({left}, {top}, {width}, {height}).', {
                    image: imageInfo.image.src,
                    left: imageInfo.position.left,
                    top: imageInfo.position.top,
                    width: imageInfo.image.width,
                    height: imageInfo.image.height
                }));
            }
            var image = imageInfo.image;
            try {
                context.drawImage(image, imageInfo.position.left, imageInfo.position.top, imageInfo.image.width, imageInfo.image.height);
            }
            catch(err) {
                console.log(_replaceTokens('\t\t{err} - "{image}".', { image: imageInfo.image.src, err: err }));
            }
        });

        // Create file stream for writing image.
        var self = this;
        (function(){
            var imagePath = path.join(spritePackage.dir, 'sprite.png');
            var imageFile = fs.createWriteStream(imagePath);

            // Create png image stream.
            var stream = canvas.createPNGStream();

            // Listen for data event.
            stream.on('data', function (chunk) {
                imageFile.write(chunk);
            });

            // Listen for end event.
            stream.on('end', function (chunk) {
                // Console output.
                console.log(_replaceTokens('Wrote sprite "{fileName}".', { fileName: imagePath }));
            });
        })();
    },

    /**
     * Renders all styles in a sprite package.
     * @param spritePackage Sprite package.
     * @private
     */
    _renderStyleSheet: function(spritePackage) {

        var fullPath = path.join(spritePackage.dir, 'sprite.css');

        // Style template for each image.
        var style =
            '.{path}{file} {\n' +
                '\tbackground-image: url("sprite.png");\n' +
                '\tbackground-repeat: no-repeat;\n' +
                '\tbackground-position: -{left}px -{top}px;\n' +
                '\twidth: {width}px;\n' +
                '\theight: {height}px;\n' +
                '}\n\n';

        (function(){
            var writer = fs.createWriteStream(fullPath);

            // Output style template for each image.
            _.each(spritePackage.images, function(imageInfo) {
               writer.write(_replaceTokens(style, {
                   path: spritePackage.path,
                   file: imageInfo.fileName.replace(FILE_NAME_REGEXP, '-'),
                   left: imageInfo.position.left,
                   top: imageInfo.position.top,
                   width: imageInfo.image.width,
                   height: imageInfo.image.height
               }));
            });
        })();

        if (this.verbose) {
            console.log(_replaceTokens('\tWrote style sheet "{fileName}".', { fileName: fullPath }));
        }
    },

    /**
     * Executes sprite generation on the specified directory.
     */
    execute: function () {

        // Verify root directory was specified.
        if (!this.rootDir) {
            throw new Error('options.dir is required.');
        }

        // Get full path.
        this.rootDir = path.resolve(this.rootDir);

        // Read all image information into packages for sprites.
        var self = this;
        this._createSpritePackages(this.rootDir,function(){
            _.each(self.spritePackages, function(spritePackage) {
                self._placeImages(spritePackage);
                self._renderImages(spritePackage);
                self._renderStyleSheet(spritePackage);
            });
        });

        // Place all images in the sprite packages, then render them.
        
        
    }
});

module.exports = SpriteGen;