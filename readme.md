# BitbuckUp

Simple command line tool to backup/download Bitbucket Repositories.

## Prerequisits

You'll need `git` and `node` with `npm` installed.
And for this to work you'll also need a client id and a client secret from Bitbucket. Go to `https://bitbucket.org/account/user/{username}/api` and click on "Add consumer" to create the client id and client secret, make sure you at least select read rights on repositories.

## Install

```bash
npm i -g bitbuckup
```

## How to use it

Create a `.env` file in the folder you want the backups to be created, containing the following information:

```bash
CLIENT_ID=12345
CLIENT_SECRET=abcdef
USERNAMES=user1,user2,team1,team2
```

Then open a terminal with that folder and run:

```bash
bitbuckup
```
Or if you don't want to install it, you can also run:

```bash
npx bitbuckup
```

## What it does

BitbuckUp clones all repos and fetches all branches, for each username/team provided. 
It has access to all repos that the user that created the client id/secret has access too, which includes all public repos.

It creats the following folder structure:

```bash
.env
repos/
├── user1.json
├── user1/
│   ├── repo1/
│   └── repo2/
└── ...
```

## License

[MIT License](LICENSE)
