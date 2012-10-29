# svgsprites

Node js tool to generate sprites of both standard images and svg images. It is a modified version of [SpriteGen](https://npmjs.org/package/spritegen/) with code from [svg2png](https://npmjs.org/package/svg2png) which first convert all svg-images to PNG before creating a sprite.png and sprite.css of all images.

## Requirements

Please install [Phantomjs](http://phantomjs.org/) so that their shell command is available in your path. You can install Phantomjs with HomeBrew by:

```shell
brew update && brew install phantomjs
```

## Getting Started
Install the module with: `npm install -g svgsprites` and it should be available in your path. 

```shell
cd image-folder
svgsprites --dir .
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/gruntjs/grunt).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Gerhard Sletten  
Licensed under the MIT license.
