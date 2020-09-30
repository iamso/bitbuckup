#! /usr/bin/env node

const fs = require('fs');
const request = require('./lib/request');
const shell = require('shelljs');
const colors = require('colors');
const logUpdate = require('log-update');
const figlet = require('figlet');
const cwd = process.cwd();
require('dotenv').config();

console.log(figlet.textSync('BitbuckUp').blue);
console.log('');
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.USERNAMES) {
  console.log('.env file is missing or incomplete'.bold.red);
  console.log(`Make sure your .env file exists and contains the following variables:
CLIENT_ID=12345
CLIENT_SECRET=abcdef
USERNAMES=user`)
  process.exit(1);
}

if (!shell.which('git')) {
  console.log('You need to have git installed.'.bold.red);
  process.exit(1);
}

const users = process.env.USERNAMES.split(/,\s*/).map(value => value.trim());

const baseUrl = `https://api.bitbucket.org/2.0/`
const authUrl = 'https://bitbucket.org/site/oauth2/access_token';
// const authUrl = 'https://req.dev.so';
// const repoUrl = `${baseUrl}repositories/${process.env.USERNAMES}`;

const authData = 'grant_type=client_credentials';
const authHeader = {
  Authorization: 'Basic ' + Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'),
  'Content-Type': 'application/x-www-form-urlencoded',
  'Content-Length': Buffer.byteLength(authData),
};

shell.cd(cwd);
shell.mkdir('-p', 'repos');
shell.cd('repos');

let aborted = false;

process.on('SIGINT', function() {
  aborted = true;
  process.exit(0);
});

process.on('SIGTERM', function() {
  aborted = true;
  process.exit(0);
});

(async () => {
  console.log('Authenticating with Bitbucket'.bold.yellow);
  logUpdate('--> Retrieving access token');
  const auth = await request.post(authUrl, authData, authHeader);

  if (auth.access_token) {
    logUpdate.clear();
    console.log('==> Access token retrieved');
    console.log('');

    for (let user of users) {
      if (aborted) {
        return;
      }
      const repoUrl = `${baseUrl}repositories/${user}`;
      const repos = await getRepos();
      await processRepos(user);

      function getRepos() {
        return new Promise((resolve, reject) => {
          const repos = [];
          const get = async (url = repoUrl + `?access_token=${auth.access_token}`) => {
            const results = await request.get(url);
            const processLength = 20;
            const page = results.page;
            const pages = Math.ceil(results.size/results.pagelen);
            const processValue = Math.floor((page / pages) * processLength);

            if (pages) {
              logUpdate(`--> Processing page ${page}/${pages} [${'='.repeat(processValue)}${' '.repeat(processLength - processValue)}]
              `);

              for (let result of results.values) {
                if (result.scm === 'git') {
                  repos.push({
                    name: result.name,
                    uuid: result.uuid,
                    slug: result.slug,
                    project: result.project ? result.project.name : null,
                    url: `git@bitbucket.org:${result.full_name}.git`
                  })
                }
              }

              if (results.next) {
                get(results.next);
              }
              else {
                fs.writeFileSync(`${cwd}/repos/${user}.json`, JSON.stringify(repos, null, 2));
                logUpdate.clear();
                console.log(`==> Processed ${pages} pages`);
                console.log('');
                resolve(repos);
              }
            }
            else {
              console.log(`==> No repositories found`);
              console.log('');
              resolve(repos);
            }
          };

          // console.log('Accessing Bitbucket API'.bold.yellow);
          console.log(`Fetching repositories for ${user}`.bold.yellow);
          get();
        });
      }

      function processRepos(user) {
        if (aborted) {
          return Promise.reject();
        }
        return new Promise((resolve, reject) => {
          if (repos.length) {
            console.log(`Processing repositories for ${user}`.bold.yellow);

            shell.mkdir('-p', user);
            shell.cd(user);

            for (let repo of repos) {
              console.log(`==> ${repo.name}`.bold);
              shell.mkdir('-p', repo.slug);
              shell.cd(repo.slug);
              if (!shell.test('-e', '.git')) {
                logUpdate(`--> Cloning ${repo.slug}`);
                shell.exec(`git clone ${repo.url} .`, {silent: true});
                logUpdate.clear();
                console.log(`==> Cloned ${repo.slug}`);
              }
              logUpdate('--> Fetching all branches');
              shell.exec(`bash ${__dirname}/lib/getallbranches.sh`, {silent: true});
              logUpdate.clear();
              console.log(`==> Fetched all branches`);
              console.log('');
              shell.cd('..');
            }

            shell.cd('..');

            console.log('==> Processed all repositories'.bold.yellow);
            console.log('');
          }

          resolve();
        });
      }
    }
  }
  else {
    logUpdate.clear();
    console.log('==> Access denied'.bold.red);

  }

})();
