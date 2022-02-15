import core from "@actions/core";
import { readFileSync, writeFileSync } from "fs";
import { hrtime } from "process";

import {
  getDependencyEntries,
  generateOSSFviaDocker,
  generateOSSFviaGolang,
  fetchPackage,
  parseGithubPath,
  getGithubPath,
  octokit,
} from "./utils.js";

(async function () {
  const url = "https://github.com/bfred-it/filter-altered-clicks";

  const checks = [
    "Binary-Artifacts",
    "Branch-Protection",
    "CI-Tests",
    "CII-Best-Practices",
    "Code-Review",
    "Contributors",
    "Dangerous-Workflow",
    "Dependency-Update-Tool",
    "Fuzzing",
    "License",
    "Maintained",
    "Packaging",
    "Pinned-Dependencies",
    "SAST",
    "Security-Policy",
    "Signed-Releases",
    "Token-Permissions",
    "Vulnerabilities",
  ];

  // for (const check of checks) {
  //   const start = hrtime.bigint();
  //   const ossf = await generateOSSFviaGolang(url, true, check)
  //     .then(async (res) => {
  //       console.log("generated OSSF");
  //       const end = hrtime.bigint();
  //       const time = Number(end - start) / 1000000000;
  //       console.log(`Time taken: ${time} seconds`);
  //       const rateLimitData = await octokit.request("GET /rate_limit");
  //       console.log(rateLimitData.data.rate);
  //       return res;
  //     })
  //     .catch((err) => {
  //       throw new Error(err);
  //     });
  //   console.log(ossf);
  // }

  // core.setOutput("result", ossf);
  // return;
  // const test = "https://github.com/ossf/scorecard";
  // const result = generateOSSFviaDocker(test, true);
  // console.log(result);
  // return;

  // const pkg = JSON.parse(readFileSync("../../../package.json", "utf8"));
  const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

  const deps = getDependencyEntries(pkg, true, 0);
  // console.log(deps[10]);
  // const [name, version] = deps[10];
  // console.log({ name, version });
  // const toost = await fetchPackage(name, version);
  // console.log(toost);
  // return;
  const allPackages = [];
  const packagePromises = [];
  for (const dep of deps) {
    const [name, version] = dep;
    const pkg = fetchPackage(name, version).then((res) => {
      allPackages.push({ package: res, name, version });
    });
    packagePromises.push(pkg);
  }

  await Promise.allSettled(packagePromises);

  const packageURLs = allPackages.map((pkg) => {
    const githubPath = getGithubPath(pkg.package);
    const githubURL = `https://github.com/${githubPath}`;
    return githubURL;
  });

  console.log(packageURLs);

  // const ossfPromises = [];
  const ossfScorecards = [];

  for (const url of packageURLs) {
    const start = hrtime.bigint();
    const ossf = await generateOSSFviaGolang(url, false, "Binary-Artifacts")
      .then(async (res) => {
        console.log("generated OSSF");
        const end = hrtime.bigint();
        const time = Number(end - start) / 1000000000;
        console.log(`This took ${time} seconds`);
        ossfScorecards.push(res);
        const rateLimitData = await octokit.request("GET /rate_limit");
        console.log(rateLimitData.data);
      })
      .catch(async (err) => {
        ossfScorecards.push({
          name: url,
          error: err,
        });
        const rateLimitData = await octokit.request("GET /rate_limit");
        console.log(rateLimitData.data);
      });
    ossfPromises.push(ossf);
  }
  await Promise.allSettled(ossfPromises);
  console.log(ossfScorecards);

  // writeFileSync(
  //   "./ossf/scorecards.json",
  //   JSON.stringify(ossfScorecards, null, 2)
  // );

  console.log("DONE");

  // core.setOutput("result", ossf);
})();
