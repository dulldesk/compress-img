const { promises: fs } = require('fs');
const path = require('path');
const tinify = require('tinify');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, ".env") });

const MAX_FILE_COUNT = 500;

const args = require('yargs')
  .scriptName("compress-img")
  .usage('$0 <cmd> [args]')
  .command(["count", "cnt"], "Print the number of files compressed by the current API key", {}, getCount)
  .command(["compress [file] [--new new_file] [--replace]", "c"], "Compresses a file. By default sets the new file name to x.cmprs.ext (can rename with --new, or replace original with --replace).", { // make actual yarg thing
    file: {
      type: "string", // array
      describe: "the file to compress"
    }
  }, compress)
  .command(["rename [file] [--force]", "strip"], "Removes .cmprs from a file's name", { // make actual yarg thing
    file: {
      type: "string", // array
      describe: "the file to rename"
    }
  }, renameFile)
  .option("force", {
    alias: "f",
    default: false,
    describe: "Force overwrite existing files",
    type: "boolean"
  })
  .option("new", {
    alias: "n",
    default: false,
    describe: "Specify a new file name",
    type: "boolean"
  })
  .option("replace", {
    alias: "r",
    default: false,
    describe: "Replace the original file",
    type: "boolean"
  })
  .help()
  .argv

async function compress(args) {
  const OLD_FILE = path.resolve(args.file);
  let new_file = args.n || args.new;
  const TO_REPLACE = Boolean(args.r) || Boolean(args.replace);
  const FORCE_WRITE = Boolean(args.f) || Boolean(args.force);

  await verifyKey();
  await verifyArgs();
  await shrink();

  async function verifyArgs() {
    // file to be compressed exists
    try {
      await fs.access(OLD_FILE);
    } catch (e) {
      printError(e.message);
      return;
    }

    // new path file is not taken
    if (TO_REPLACE) {
      new_file = OLD_FILE;
    } 
    else if (Boolean(new_file)) {
      new_file = path.resolve(new_file);
      try {
        await fs.access(new_file);

        if (!FORCE_WRITE) {
          printError(`Another file already exists at the specified new path (${new_file})`);
          return;
        }
      } catch (e) {}
    } else {
      let parsed_path = path.parse(OLD_FILE);
      new_file = path.join(parsed_path.dir, `${parsed_path.name}.cmprs${parsed_path.ext}`);
    }
  }

  async function shrink() {
    const source = tinify.fromFile(OLD_FILE).preserve("creation");

    source.toFile(new_file, async (err) => {        
      if (err) {
        printError(err.message);
        return;
        /*
          if (err instanceof tinify.AccountError) {
            // Verify your API key and account limit.
          } else if (err instanceof tinify.ClientError) {
            // Check your source image and request options.
          } else if (err instanceof tinify.ServerError) {
            // Temporary issue with the Tinify API.
            } else if (err instanceof tinify.ConnectionError) {
            // A network connection error occurred.
          } else {
            // Something else went wrong, unrelated to the Tinify API.
          }
        */
      } 

      try {
        await fs.access(new_file);
      } catch (e) {
        printError("The compressed file could not be saved");
        return;
      }
      printSuccess("Successfully compressed");
    });
  }
}

async function getCount() {
  await verifyKey();
  console.log(`\x1b[34mi\x1b[0m ${tinify.compressionCount} (out of ${MAX_FILE_COUNT}) files have been compressed`);
}

async function renameFile(args) {
  if (!(Boolean(args.force) || Boolean(args.f))) {
    try {
      await fs.access(args.file);
      printError("File with the original name already exists. (Use --force to bypass)");
      return;
    } catch (e) {}
  }

  try {
    let new_name = args.file.replace(".cmprs","");
    fs.rename(args.file, new_name);
    printSuccess(`Renamed to ${new_name}.`);
  } catch (e) {
    printError(e.message);
  }
}

async function verifyKey() {
  tinify.key = process.env.API_KEY;
  
  try {
    await new Promise((resolve, reject) => {
      tinify.validate(async(e) => {
        if (e) {
          reject("API Key validation failed.");
        }
        if (tinify.compressionCount >= MAX_FILE_COUNT) {
          reject("This API Key has exceeded the maximum compressions allowed per month");
        }  
        resolve();
      });
    });
  } catch (e) {
    printError(e);
    process.exit(0);
  }
}

function printError(msg) {
  console.error(`\x1b[31m×\x1b[0m ${msg}`);
}

function printSuccess(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

/*
https://www.npmjs.com/package/yargs#methods
https://yargs.js.org/docs/#api-reference-optionkey-opt
*/
