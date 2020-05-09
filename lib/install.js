'use strict';

const isWsl = require('is-wsl');
const shell = require('shelljs');
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const chromeFinder = require('./chrome-finder');
const npm = 'npm'; //require('./npm')

function getPlatform() {
  return isWsl ? 'wsl' : process.platform;
}

const supportedPlatforms = ['darwin', 'linux', 'win32', 'wsl'];
const refVersion = getPlatform() === 'win32' ? '60.0.0' : '59.0.0';

function getChromePath() {
  return new Promise((resolve, reject) => {
    const pf = getPlatform();
    const errorMsg = 'No Chrome Installations Found';
    if (supportedPlatforms.indexOf(pf) < 0) return reject(); // throw new Error(errorMsg)
    
    const installations = chromeFinder[pf]();
    if (installations.length === 0) return reject(); // throw new Error(errorMsg)

    const chromePath = installations[0];
    shell.exec(
      getPlatform() === 'win32' ?
        `wmic datafile where name="${chromePath.replace(/\\/g, '\\\\')}" get Version /value` :
        `${chromePath.replace(/(\s+)/g, '\\$1')} --version`,
      { silent: true },
      (code, stdout, stderr) => {
        let version = '';
        if (stdout) {
          const trans = stdout.match(/(\d+\.?){4}/);
          version = trans ? trans[0].replace(/\.\d+$/, '') : '';
        }
        semver.gt(version, refVersion) ? resolve(chromePath) : reject();
      }
    );
  });
}

exports.getPlatform = getPlatform;
exports.getChromePath = getChromePath;

// install puppeteer
function install(chromePath) {
  const installPuppeteer = npm + ' install puppeteer@2.0.0 --registry=https://registry.npm.taobao.org';
  let preCommand;
  let cmd;

  if (chromePath) {
    preCommand = 'PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true';
  } else {
    preCommand = 'PUPPETEER_DOWNLOAD_HOST=https://npm.taobao.org/mirrors';
  }

  if (getPlatform() === 'win32') {
    cmd = 'set ' + preCommand + '&&' + installPuppeteer;
  } else {
    cmd = preCommand + ' ' + installPuppeteer;
  }

  shell.exec(cmd, { silent: true });
}

if (!fs.existsSync(path.resolve(__dirname, '../node_modules/puppeteer'))) {
  getChromePath().then(install).catch(install);
}
