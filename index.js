#!/usr/bin/env node

const https = require("node:https");
const path = require("node:path");
const fs = require("fs");

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
 *
 */
((server) => {
  const endpoint = {
    cn: "https://open.ys4fun.com/game-website-server/pass/game/image/list?websiteId=1&type=gameWallpaper&current=1",
    global:
      "https://aethergazer.com/api/gallery/list?pageIndex=1&pageNum=1&type=",
  };
  if (!server.length || !Object.keys(endpoint).includes(server[0])) {
    console.error(`\nUsage: node agWallpaperHd.js <server:cn/global>`);
    return;
  }
  const fpath = `${process.cwd()}/AgWallpaper${
    server[0] === "cn" ? "Cn" : "Global"
  }`;
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
                for (const [i, e] of data.data.rows.entries()) {
                  const url =
                    e.contentImg !== "" ? e.contentImg : e.pcThumbnail;
                  const name = `${fpath}/${e.title
                    .replace(/\s+/g, "-")
                    .replace(/[^a-zA-Z0-9-]/g, "")
                    .replace(/-+/g, "-")}.${
                    url.split("/").slice(-1)[0].split(".")[1]
                  }`;
                  console.log(
                    ` [${i + 1}/${data.data.count}] Got \x1b[33m...${url.slice(
                      50
                    )}\x1b[0m`
                  );
                  await nativeDownload({
                    url,
                    name,
                  });
                }
              }
            });
        })
        .on("error", (err) => {
          console.error(err.message);
        })
        .end();
      break;
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
                for (const [i, e] of data.data.records.entries()) {
                  const url = e.pcUrl;
                  const name = `${fpath}/${url.split("/").slice(-1)[0]}`;
                  console.log(
                    ` [${i + 1}/${data.data.total}] Got \x1b[33m...${url.slice(
                      52
                    )}\x1b[0m`
                  );
                  await nativeDownload({
                    url,
                    name,
                  });
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
