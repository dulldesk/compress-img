# compress-img
CLI tool to compress images via the TinyPNG API.

## Installation
Requires node.js. 

1. Run `npm ci` in the root directory to install dependencies.
2. Create a [TinyPNG account](https://tinypng.com/developers) to get an API key
3. Paste the API key in a `.env` file in the root folder. The `.env` should have the following format:
```
API_KEY=key_goes_here
```


## Running
Run `node compress-img.js --help` for a full list of commands. 
