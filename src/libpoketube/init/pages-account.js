const {
  fetcher,
  core,
  wiki,
  musicInfo,
  modules,
  version,
  initlog,
  init,
} = require("../libpoketube-initsys.js");
const {
  IsJsonString,
  convert,
  getFirstLine,
  capitalizeFirstLetter,
  turntomins,
  getRandomInt,
  getRandomArbitrary,
} = require("../ptutils/libpt-coreutils.js");

var http = require("https");
var ping = require("ping");

const sha384 = modules.hash;

function getJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = function (app, config, renderTemplate) {
const db = require("quick.db");
  
app.get("/api/get-channel-subs", async function (req, res) {
    var userid = req.query.ID

    if(db.get(`user.${userid}`)) await res.json(db.get(`user.${userid}.subs`))
    if(!db.get(`user.${userid}`)) await res.json("no user found")

});
  
  app.get("/api/remove-channel-sub", async function (req, res) {
    const userid = req.query.ID;
    const channelToRemove = req.query.channelID;

    // Check if the user has a 'subs' object in the database
    if (db.get(`user.${userid}.subs.${channelToRemove}`)) {
        // If the subscription exists, remove it from the database
        db.delete(`user.${userid}.subs.${channelToRemove}`);
        res.json("Subscription removed");
    } else {
        // If the subscription doesn't exist, send a message indicating so
        res.json("Subscription not found");
    }
});
  
app.get("/api/set-channel-subs", async function (req, res) {
    var userid = req.query.ID;
    var channelToSub = req.query.channelID;
    var channelToSubName = req.query.channelName;
    var avatar = req.query.avatar; // Add avatar query parameter

    // Check if the user has a 'subs' object in the database
    if (!db.get(`user.${userid}.subs`)) {
        // If not, create it and add the subscription
        db.set(`user.${userid}.subs.${channelToSub}`, {
            channelName: channelToSubName,
            avatar: avatar, // Store the avatar URL along with the subscription
        });
        res.redirect("/account-create")
    } else if (!db.get(`user.${userid}.subs.${channelToSub}`)) {
        // If the user has 'subs' but not this particular subscription, add it
        db.set(`user.${userid}.subs.${channelToSub}`, {
            channelName: channelToSubName,
            avatar: avatar, // Store the avatar URL along with the subscription
        });
        res.redirect("/account-create")
    } else {
        // If the user is already subscribed to this channel, send a message indicating so
        res.json("ur already subscribed");
    }
});


 
app.get("/account-create", async function (req, res) {
       renderTemplate(res, req, "account-create.ejs", {db:db});

});
  
  app.get("/api/get-all-subs", async function (req, res) {
    var userid = req.query.ID;

    // Check if the user has a 'subs' object in the database
    const userSubs = db.get(`user.${userid}.subs`);

    if (userSubs) {
        res.json(userSubs); // Return all subscriptions as JSON
    } else {
        res.json({}); // Return an empty object if the user has no subscriptions
    }
});

app.get("/my-acc", async function (req, res) {
    var userid = req.query.ID;

    // Check if userid is more than 7 characters
    if (userid.length > 7) {
        return res.status(400).json({ error: "IDs can be 7 characters max silly :3" });
    }

    var userSubs =  db.get(`user.${userid}.subs`);

    renderTemplate(res, req, "account-me.ejs", { userid, userSubs });
});

};
