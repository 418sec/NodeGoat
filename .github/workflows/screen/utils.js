import { exec } from "child_process";
import dotenv from "dotenv";
import fetch from "node-fetch";
import util from "util";
import { Octokit } from "@octokit/core";

const execPromise = util.promisify(exec);

dotenv.config();
const token = process.env.GITHUB_AUTH_TOKEN;

function getDependencyEntries(pkg, includeDev, level = 0) {
  const dependencyTypes = [
    "dependencies",
    "peerDependencies",
    includeDev && level <= 0 ? "devDependencies" : null,
  ];

  pkg = pkg.package || pkg;

  const deps = [];
  for (const type of dependencyTypes) {
    if (!pkg[type]) continue;
    // Only do one level for non-"dependencies"
    if (level > 0 && type != "dependencies") continue;

    // Get entries, adding type to each entry
    const d = Object.entries(pkg[type]);
    d.forEach((o) => o.push(type));
    deps.push(...d);
  }

  return deps;
}

async function generateOSSFviaGolang(repoURL, showDetails) {
  // this requires having GITHUB_AUTH_TOKEN set in the environment
  // use --show-details to see the full output
  // depends on golang installation on machine
  const command = `scorecard --repo=${repoURL} --format=json ${
    showDetails ? "--show-details" : ""
  }`;
  console.log(`executing: ${command}`);

  return execPromise(command, {
    encoding: "utf8",
  })
    .then((res) => {
      console.log("Promise resolved");
      return JSON.parse(res.stdout);
    })
    .catch((err) => {
      throw new Error(err);
    });
}

async function generateOSSFviaDocker(repoURL, showDetails) {
  // depends on docker engine installation on machine
  const command = `docker run -e GITHUB_AUTH_TOKEN=${token} gcr.io/openssf/scorecard:stable ${
    showDetails ? "--show-details" : ""
  } --repo=${repoURL} --format=json`;
  console.log(`executing: ${command}`);

  return execPromise(command, {
    encoding: "utf8",
  })
    .then((res) => {
      console.log("Promise resolved");
      console.log(res.stdout);

      return JSON.parse(res.stdout);
    })
    .catch((err) => {
      throw new Error(err);
    });

  // const promise = new Promise((resolve, reject) => {
  //   resolve();
  //   reject(new Error('failed to generate OSSF'));
  // });

  // return promise;
}

async function fetchPackage(name, version) {
  if (!version && /(.+)@(.*)/.test(name)) {
    name = RegExp.$1;
    version = RegExp.$2;
  }

  version = version?.replace?.(/git.*#/, "");
  version = version?.replace?.("^", "");

  const isScoped = name.startsWith("@");
  const path = `${name.replace(/\//g, "%2F")}`;
  const pathAndVersion = `${path}/${version}`;
  const reqPath = isScoped ? `${path}` : `${pathAndVersion}`;
  console.log(`fetching from https://registry.npmjs.cf/${reqPath}`);
  const result = await (
    await fetch(`https://registry.npmjs.cf/${reqPath}`)
  ).json();
  return result;
}

function parseGithubPath(s) {
  s = /github.com\/([^/]+\/[^/?#]+)?/.test(s) && RegExp.$1;
  return s?.replace?.(/\.git$/, "");
}

function getGithubPath(pkg) {
  for (const path of ["repository", "bugs", "homepage"]) {
    const githubPath = parseGithubPath(pkg[path]?.url);
    if (githubPath) return githubPath;
  }
  return null;
}

const octokit = new Octokit({
  auth: token,
});

export {
  fetchPackage,
  getDependencyEntries,
  generateOSSFviaDocker,
  generateOSSFviaGolang,
  parseGithubPath,
  getGithubPath,
  octokit,
};
