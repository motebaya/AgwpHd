#!/usr/bin/env node

const https = require("node:https");
const path = require("node:path");
const fs = require("node:fs");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

/**
 * aether gazer global wallpaper downloader.
 * @gist.github.com/motebaya at 26.11.2023 - 1.24PM
 * credit: davins/mochino
 *
 */

const headers = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
};
// sigint event
let savedChunk;
let lengthContent;
let notCompleteName;
process.on("SIGINT", () => {
  console.log("\n [*] Stopped!");
  if (savedChunk < lengthContent) {
    fs.unlinkSync(notCompleteName);
    console.log(
      ` [*] Deleted Uncomplete Download: ${notCompleteName.replace(
        process.cwd(),
        "."
      )}`
    );
  }
  process.exit(1);
});

/**
 *
 * @param {string} url - required url to download.
 * @param {string} name - required filename to save.
 * @returns {bool}
 */
const nativeDownload = async (opts) => {
  return new Promise((resolve) => {
    (function () {
      const { url, name } = opts;
      https
        .get(url, { headers: headers }, (res) => {
          lengthContent = parseInt(res.headers["content-length"], 10) || 1;
          if (!fs.existsSync(name)) {
            const stream = fs.createWriteStream(`${name}`);
            let dlContentLength = 0;
            res.on("data", (chunk) => {
              dlContentLength += chunk.length;
              savedChunk = dlContentLength;
              notCompleteName = name;
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
              process.stdout.write(
                ` [*] Downloading \x1b[32m${path.basename(name)}\x1b[0m... (${(
                  (dlContentLength / lengthContent) *
                  100
                ).toFixed(2)}%) - ${dlContentLength} of ${lengthContent}`
              );
            });
            res.on("end", () => {
              notCompleteName = undefined;
              console.log(
                `\n [*] Saved as -> ${name.replace(process.cwd(), ".")}`
              );
              resolve();
            });
            res.pipe(stream);
          } else {
            console.log(
              ` [!] Skipped::\x1b[33m${path.basename(
                name
              )}, \x1b[0mAlready downloaded.`
            );
            resolve();
          }
        })
        .on("error", (err) => {
          console.log(`Error: ${err.message}`);
          resolve();
        })
        .end();
      return true;
    })();
  });
};

/**
 * visit official site
 * global : https://aethergazer.com/gallery
 * cn: https://skzy.ys4fun.com/main/wallpapers/
 * tw: https://www.aethergazer.tw/main/
 *
 */
(async (server) => {
  const endpoint = {
    tw: "https://ys-tw-open.aethergazer.tw/game-website-server/pass/game/image/list?websiteId=1&type=gameWallpaper&current=1",
    cn: "https://open.ys4fun.com/game-website-server/pass/game/image/list?websiteId=1&type=gameWallpaper&current=1",
    global:
      "https://aethergazer.com/api/gallery/list?pageIndex=1&pageNum=1&type=",
  };
  if (!server.length || !Object.keys(endpoint).includes(server[0])) {
    console.error(
      `\n     author: @github.com/motebaya\n   Aether Gazer wallpaper downloader\n\nUsage: node agWallpaperHd.js <server:cn/tw/global>`
    );
    return;
  }
  const fpath = `${process.cwd()}/AgWallpaper${
    server[0] === "cn" ? "Cn" : server[0] === "tw" ? "Tw" : "Global"
  }`;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let parallel = (
    await rl.question(
      "\n Would you like using concurrency mode?\n It's fast, but you Can't stop the download process till finish all,\n Because downloaded images will be corrupted. [y/n] : "
    )
  )
    .trim()
    .toLowerCase();
  rl.close();
  if (["y", "n"].includes(parallel)) {
    parallel = parallel === "y";
  } else {
    process.exit(0);
  }
  if (!fs.existsSync(fpath)) {
    fs.mkdirSync(fpath);
    console.log(` [+] Output created to: ${fpath.replace(process.cwd(), ".")}`);
  }
  switch (server[0]) {
    case "global":
      https
        .get(endpoint[server], { headers: headers }, (res) => {
          let data = "";
          res
            .on("data", (chunk) => {
              data += chunk;
            })
            .on("end", async () => {
              data = JSON.parse(data);
              if (data.msg === "ok") {
                const _download = async (index, item) => {
                  let url =
                    item.contentImg !== "" ? item.contentImg : item.pcThumbnail;
                  console.log(
                    ` [${index + 1}/${
                      data.data.count
                    }] Got \x1b[33m...${url.slice(50)}\x1b[0m`
                  );
                  await nativeDownload({
                    url: url,
                    name: `${fpath}/${item.title
                      .replace(/\s+/g, "-")
                      .replace(/[^a-zA-Z0-9-]/g, "")
                      .replace(/-+/g, "-")}.${
                      url.split("/").slice(-1)[0].split(".")[1]
                    }`,
                  });
                };
                const urls = Array.from(data.data.rows.entries());
                if (parallel) {
                  await Promise.all(
                    urls.map(([index, item]) => {
                      _download(index, item);
                    })
                  );
                } else {
                  for (let [index, item] of urls) {
                    await _download(index, item);
                  }
                }
              }
            });
        })
        .on("error", (err) => {
          console.error(err.message);
        })
        .end();
      break;
    case "tw":
    case "cn":
      https
        .get(endpoint[server], { headers: headers }, (res) => {
          let data = "";
          res
            .on("data", (chunk) => {
              data += chunk;
            })
            .on("end", async () => {
              data = JSON.parse(data);
              if (data.errorCode === "0") {
                const _download = async (index, item) => {
                  const _fetch = async (url) => {
                    console.log(
                      ` [${index + 1}/${
                        data.data.total
                      }] Got \x1b[33m...${url.slice(62)}\x1b[0m`
                    );
                    await nativeDownload({
                      url: url,
                      name: `${fpath}/${url.split("/").slice(-1)[0]}`,
                    });
                  };
                  let urls = [item.pcUrl];
                  if (item.h5Url.length !== 0) {
                    urls.push(item.h5Url);
                  }

                  if (parallel) {
                    await Promise.all(
                      urls.map(async (url) => {
                        _fetch(url);
                      })
                    );
                  } else {
                    for (let url of urls) {
                      await _fetch(url);
                    }
                  }
                };
                const urls = Array.from(data.data.records.entries());
                if (parallel) {
                  await Promise.all(
                    urls.map(async ([index, item]) => {
                      _download(index, item);
                    })
                  );
                } else {
                  for (let [index, item] of urls) {
                    await _download(index, item);
                  }
                }
              }
            });
        })
        .on("error", (err) => {
          console.error(err.message);
        })
        .end();
      break;
  }
})(process.argv.slice(2));
