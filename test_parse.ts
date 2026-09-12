import * as cheerio from "cheerio";
const html = `{"playerSources":[{"src":"https://fast-stream.jav.si/p/0ac89231...","type":"video/mp4","size":720}],"videoTitle":"MOIL"}`;
const playerMatch = html.match(/"playerSources":\s*(\[.*?\])/);
console.log(playerMatch ? playerMatch[1] : null);
